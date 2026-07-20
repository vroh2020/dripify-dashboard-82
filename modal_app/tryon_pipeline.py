"""
CatVTON virtual try-on — deployed on Modal
============================================

Ported from the CatVTON repo's app.py & inference.py:
  - CatVTONPipeline  (model/pipeline.py)
  - AutoMasker        (model/cloth_masker.py)
  - resize_and_crop, resize_and_padding  (utils.py)

Takes a person image + garment image and generates a try-on.
"""

import io
import os
import sys
import traceback
from typing import Optional, List

import modal

# ── Persistent volume for model weights ────────────────────────────────────
VOLUME_NAME = "qwen-edit-weights"
weights_volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)
CACHE_DIR = "/root/cache"

# ── HF token secret (read-only) ───────────────────────────────────────────
huggingface_secret = modal.Secret.from_name("huggingface-secret")

# ── CatVTON repo path ──────────────────────────────────────────────────────
_CATVTON_DIR = "/catvton"

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .env({"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True"})
    .pip_install(
        # === CatVTON requirements.txt (pinned) ===
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
        # === API deps ===
        "fastapi",
        "pydantic",
        "requests",
        # === Detectron2 / DensePose ===
        "cloudpickle",
        "fvcore",
        "iopath",
        "omegaconf",
        "pycocotools",
        # === Additional ===
        "av",
    )
    .run_commands(
        "git clone https://github.com/Zheng-Chong/CatVTON.git /catvton"
    )
)

app = modal.App("trendza-tryon", image=image)


@app.cls(
    gpu="A10G",
    image=image,
    secrets=[huggingface_secret],
    volumes={CACHE_DIR: weights_volume},
    scaledown_window=60,
    timeout=900,
)
@modal.concurrent(max_inputs=1)
class TryOnEngine:
    """CatVTON virtual try-on — lightweight, fast, no CPU offload needed."""

    @modal.enter()
    def load(self):
        import torch

        sys.path.insert(0, _CATVTON_DIR)

        from huggingface_hub import snapshot_download

        print("Downloading CatVTON weights...")
        repo_path = snapshot_download(repo_id="zhengchong/CatVTON")
        print(f"Downloaded to {repo_path}")

        from model.pipeline import CatVTONPipeline
        from utils import init_weight_dtype

        self._pipeline = CatVTONPipeline(
            base_ckpt="runwayml/stable-diffusion-inpainting",
            attn_ckpt=repo_path,
            attn_ckpt_version="mix",
            weight_dtype=init_weight_dtype("bf16"),
            device="cuda",
            skip_safety_check=True,
        )
        print("CatVTONPipeline initialised.")

        from model.cloth_masker import AutoMasker

        self._automasker = AutoMasker(
            densepose_ckpt=os.path.join(repo_path, "DensePose"),
            schp_ckpt=os.path.join(repo_path, "SCHP"),
            device="cuda",
        )
        print("AutoMasker initialised.")

        from diffusers.image_processor import VaeImageProcessor

        self._mask_processor = VaeImageProcessor(
            vae_scale_factor=8,
            do_normalize=False,
            do_binarize=True,
            do_convert_grayscale=True,
        )

        self._width = 768
        self._height = 1024

        torch.cuda.empty_cache()
        print("CatVTON ready for inference.")

    @modal.method()
    def generate(
        self,
        person_url: str,
        garment_url: str,
        garment_type: str = "upper",
    ) -> bytes:
        import torch
        import requests as reqs
        from PIL import Image
        from utils import resize_and_crop, resize_and_padding

        person_img = Image.open(
            io.BytesIO(reqs.get(person_url, timeout=60).content)
        ).convert("RGB")
        garment_img = Image.open(
            io.BytesIO(reqs.get(garment_url, timeout=60).content)
        ).convert("RGB")

        person_img = resize_and_crop(person_img, (self._width, self._height))
        garment_img = resize_and_padding(garment_img, (self._width, self._height))

        # garment_type passed from caller: "upper", "lower", or "overall"

        mask = self._automasker(person_img, garment_type)["mask"]
        mask = self._mask_processor.blur(mask, blur_factor=9)

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

        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        return buf.getvalue()

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI, Response, HTTPException
        from pydantic import BaseModel

        class Req(BaseModel):
            person_image_url: str
            garment_image_url: str = ""
            garment_image_urls: List[str] = []
            garment_type: str = "upper"

        web_app = FastAPI(title="Trendza Try-On (CatVTON)", version="6.2.0")

        @web_app.post("/tryon")
        async def tryon(req: Req) -> Response:
            if not req.person_image_url:
                raise HTTPException(400, "person_image_url is required")
            # Support both single URL and list for backward compatibility
            garment_url = req.garment_image_url or (req.garment_image_urls[0] if req.garment_image_urls else "")
            if not garment_url:
                raise HTTPException(400, "garment_image_url or garment_image_urls required")
            try:
                png_bytes = self.generate.local(
                    req.person_image_url, garment_url, req.garment_type
                )
                return Response(content=png_bytes, media_type="image/png")
            except Exception as exc:
                traceback.print_exc()
                raise HTTPException(500, str(exc))

        @web_app.get("/health")
        async def health() -> dict:
            return {"status": "ok"}

        return web_app


@app.local_entrypoint()
def main():
    print("✅ CatVTON file parses correctly. Deploy with: modal deploy modal_app/tryon_pipeline.py")
