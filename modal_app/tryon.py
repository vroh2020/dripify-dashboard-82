"""
Modal app for CatVTON virtual try-on.
Deploys CatVTON (zhengchong/CatVTON) as a self-hosted inference endpoint
on Modal, replacing the ZeroGPU-limited HuggingFace Space.

Ported directly from the CatVTON repo's app.py & inference.py:
  - CatVTONPipeline  (model/pipeline.py)
  - AutoMasker        (model/cloth_masker.py)
  - resize_and_crop, resize_and_padding  (utils.py)
"""

import io
import os
import sys
import traceback

import modal

# ---------------------------------------------------------------------------
# Modal image definition – reproduce the CatVTON environment
# ---------------------------------------------------------------------------

_CATVTON_DIR = "/catvton"

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install(
        # === CatVTON requirements.txt (pinned versions, every package) ===
        "accelerate==0.31.0",
        "diffusers==0.29.2",
        "gradio==4.39.0",
        "huggingface_hub==0.23.4",
        "matplotlib==3.9.1",
        "numpy==1.26.4",
        "opencv-python==4.10.0.84",
        "pillow==10.3.0",
        "PyYAML==6.0.1",
        "scipy==1.13.1",
        "setuptools==51.0.0",
        "scikit-image==0.24.0",
        "torch==2.1.2",
        "torchvision==0.16.2",
        "tqdm==4.66.4",
        "transformers==4.27.3",
        "xformers==0.0.23.post1",
        "Ninja==1.11.1.1",
        # === API endpoint deps ===
        "fastapi",
        "pydantic",
        "requests",
        # === Detectron2 / DensePose deps (AutoMasker human parsing) ===
        "cloudpickle",
        "fvcore",
        "iopath",
        "omegaconf",
        "pycocotools",
        # === Additional known deps ===
        "av",  # PyAV
    )
    .run_commands(
        "git clone https://github.com/Zheng-Chong/CatVTON.git /catvton"
    )
)

app = modal.App("trendza-tryon", image=image)


# ---------------------------------------------------------------------------
# The class that loads CatVTON and runs inference (one GPU container)
# ---------------------------------------------------------------------------

@app.cls(
    gpu="A10G",
    image=image,
    scaledown_window=120,
    timeout=600,
)
class CatVTONModel:
    """Modal container class holding the CatVTON pipeline + AutoMasker."""

    @modal.enter()
    def load_model(self):
        """Cold-start: download weights and initialise pipeline + masker."""
        import torch

        # Make the cloned CatVTON repo available for imports
        sys.path.insert(0, _CATVTON_DIR)

        # --- Download the full CatVTON release (attention ckpt, DensePose, SCHP) ---
        from huggingface_hub import snapshot_download

        print("Downloading model weights from zhengchong/CatVTON ...")
        repo_path = snapshot_download(repo_id="zhengchong/CatVTON")
        print(f"Downloaded to {repo_path}")

        # --- Pipeline ---
        from model.pipeline import CatVTONPipeline
        from utils import init_weight_dtype

        self._pipeline = CatVTONPipeline(
            base_ckpt="runwayml/stable-diffusion-inpainting",
            attn_ckpt=repo_path,
            attn_ckpt_version="mix",  # mix-48k-1024 - best general model
            weight_dtype=init_weight_dtype("bf16"),
            device="cuda",
            skip_safety_check=True,  # no NSFW filter needed for API endpoint
        )
        print("CatVTONPipeline initialised.")

        # --- AutoMasker (generates the garment mask automatically) ---
        from model.cloth_masker import AutoMasker

        self._automasker = AutoMasker(
            densepose_ckpt=os.path.join(repo_path, "DensePose"),
            schp_ckpt=os.path.join(repo_path, "SCHP"),
            device="cuda",
        )
        print("AutoMasker initialised.")

        # --- Mask processor (blur refinement) ---
        from diffusers.image_processor import VaeImageProcessor

        self._mask_processor = VaeImageProcessor(
            vae_scale_factor=8,
            do_normalize=False,
            do_binarize=True,
            do_convert_grayscale=True,
        )

        # --- Resolution constants (from app.py defaults) ---
        self._width = 768
        self._height = 1024

        torch.cuda.empty_cache()
        print("Model load complete, ready for inference.")

    @modal.method()
    def generate_from_urls(
        self,
        person_image_url: str,
        garment_image_url: str,
        garment_type: str = "upper",
    ) -> str:
        """Download images from URLs and run CatVTON inference (single method, no internal calls).

        Returns:
            base64-encoded PNG of the resulting try-on image.
        """
        import base64
        import torch
        import requests as reqs
        from PIL import Image

        # --- Download ---
        person_bytes = reqs.get(person_image_url, timeout=60).content
        garment_bytes = reqs.get(garment_image_url, timeout=60).content

        # --- Decode ---
        person_img = Image.open(io.BytesIO(person_bytes)).convert("RGB")
        garment_img = Image.open(io.BytesIO(garment_bytes)).convert("RGB")

        # --- Preprocess ---
        from utils import resize_and_crop, resize_and_padding

        person_img = resize_and_crop(person_img, (self._width, self._height))
        garment_img = resize_and_padding(garment_img, (self._width, self._height))

        # --- Auto-mask ---
        mask = self._automasker(person_img, garment_type)["mask"]
        mask = self._mask_processor.blur(mask, blur_factor=9)

        # --- Inference ---
        generator = torch.Generator(device="cuda").manual_seed(42)

        result_list = self._pipeline(
            image=person_img,
            condition_image=garment_img,
            mask=mask,
            num_inference_steps=50,
            guidance_scale=2.5,
            height=self._height,
            width=self._width,
            generator=generator,
        )
        result_img = result_list[0]

        # --- Encode ---
        output = io.BytesIO()
        result_img.save(output, format="PNG")
        return base64.b64encode(output.getvalue()).decode("utf-8")


# ---------------------------------------------------------------------------
# Endpoints: spawn + poll pattern (recommended for long-running GPU jobs)
# ---------------------------------------------------------------------------

@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def submit_tryon(body: dict) -> dict:
    """Submit a try-on job. Returns a call_id for polling.

    POST body:
    {
        "person_image_url": "...",
        "garment_image_url": "...",
        "garment_type": "upper" | "lower" | "overall"
    }
    """
    try:
        person_url = body["person_image_url"]
        garment_url = body["garment_image_url"]
        garment_type = body.get("garment_type", "upper_body")

        # Map legacy garment_type values used by Leffa
        garment_type_map = {
            "upper_body": "upper",
            "lower_body": "lower",
            "overall": "overall",
        }
        garment_type = garment_type_map.get(garment_type, garment_type)

        # Spawn the GPU job — returns immediately with a call_id
        call = CatVTONModel().generate_from_urls.spawn(
            person_url, garment_url, garment_type
        )

        return {"call_id": call.object_id}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "traceback": traceback.format_exc()}


@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def get_tryon_result(call_id: str) -> dict:
    """Poll for the result of a previously submitted try-on job.

    Returns 202 + {"status": "processing"} while the job is still running.
    Returns 200 + {"status": "complete", "image_base64": "..."} when done.
    """
    from modal.functions import FunctionCall

    try:
        function_call = FunctionCall.from_id(call_id)
        result = function_call.get(timeout=0)  # non-blocking
        return {"status": "complete", "image_base64": result}
    except TimeoutError:
        from fastapi.responses import JSONResponse
        return JSONResponse(content={"status": "processing"}, status_code=202)
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "traceback": traceback.format_exc()}


# ---------------------------------------------------------------------------
# Health check endpoint (no GPU needed)
# ---------------------------------------------------------------------------

@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health() -> dict:
    return {"status": "ok", "app": "trendza-tryon"}
