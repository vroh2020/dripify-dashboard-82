"""
Trendza Virtual Try-On — Qwen-Image-Edit-2509 on Modal
========================================================

Replaces both the prior CatVTON fallback AND the Cloudflare Flux 2 Klein 4B
primary with a single, fast, high-quality Qwen-Image-Edit-2509 deployment.

Design goals (in priority order):
1. Kill the 90s cold start — weights baked into the image at BUILD time,
   not downloaded at request time. Combined with memory snapshotting, cold
   start should land in the 15-30s range instead of 90s.
2. Incredibly high quality — Qwen-Image-Edit-2509 is a 20B-param image-editing
   model that outperforms 4B models (Flux Klein) and dedicated try-on models
   (CatVTON) on identity preservation and garment fidelity.
3. Keep cost sane — scales to zero when idle; no keep-warm cost eaten 24/7.

Deploy:
    modal deploy modal_app/tryon_pipeline.py

Test (local entrypoint):
    modal run modal_app/tryon_pipeline.py --person-path person.jpg --garment-path garment.jpg

Call from Trendza (Supabase edge function or client) via:
    POST /tryon      — multipart file upload (person_image + garment_image)
    POST /tryon-url  — JSON with image URLs (person_image_url + garment_image_url)
"""

import io
import time
from pathlib import Path
from typing import Optional, List

import modal

# ---------------------------------------------------------------------------
# 1. IMAGE DEFINITION — weights baked in at build time via run_function.
#    This is the single biggest lever against cold-start latency: the model
#    is already sitting on the container filesystem when it boots, instead
#    of being pulled from Hugging Face on every cold start.
# ---------------------------------------------------------------------------

MODEL_NAME = "Qwen/Qwen-Image-Edit-2509"
MODEL_DIR = "/model"

app = modal.App("trendza-tryon")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install(
        "diffusers>=0.36.0",
        "transformers>=4.48.0,<5",
        "accelerate>=1.0.0",
        "torch>=2.5.0",
        "torchvision>=0.20.0",
        "safetensors>=0.4.0",
        "sentencepiece>=0.2.0",
        "huggingface-hub[hf_transfer]>=0.34.0",
        "fastapi[standard]>=0.115.0",
        "Pillow>=11.0.0",
        "peft>=0.13.0",  # available if you add LoRA fine-tuning later
        "requests>=2.32.0",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})  # much faster HF downloads at build time
)


def download_model() -> None:
    """
    Runs ONCE at image build time (not at request time). This is what
    actually fixes cold starts — the weights are baked into the container
    image itself, so a cold-started container just reads from local disk
    instead of hitting the network for ~20B params.
    """
    from huggingface_hub import snapshot_download

    snapshot_download(
        MODEL_NAME,
        local_dir=MODEL_DIR,
        ignore_patterns=["*.bin", "*.msgpack", "*.h5"],  # keep only safetensors
    )


image = image.run_function(
    download_model,
    timeout=1800,  # first build can take a while pulling 20B params
)

# Deferred imports — these are only resolved inside the Modal runtime
with image.imports():
    import torch
    from diffusers import QwenImageEditPlusPipeline
    from PIL import Image as PILImage

# ---------------------------------------------------------------------------
# 2. INFERENCE CLASS — memory snapshotting moves model init + a warmup pass
#    into the SNAPSHOT phase, so subsequent cold starts restore an
#    already-initialized process instead of re-running from scratch.
# ---------------------------------------------------------------------------

GPU_TYPE = "A100-80GB"  # Qwen-Image-Edit-2509 (~20B params) needs real VRAM headroom.
                        # If cost is tight, test on "A10G" first (may OOM).


@app.cls(
    image=image,
    gpu=GPU_TYPE,
    timeout=300,
    scaledown_window=120,       # keep container alive 2 min after last request
                                # (absorbs bursty back-to-back generations cheaply)
    enable_memory_snapshot=True,
    experimental_options={"enable_gpu_snapshot": True},
)
class TryOnModel:

    @modal.enter(snap=True)
    def load_model(self) -> None:
        """
        Runs once; its resulting state (weights loaded, moved to GPU, one warmup
        pass done) is snapshotted. Future cold starts restore this snapshot
        instead of re-executing everything from zero.
        """
        print("Loading Qwen-Image-Edit-2509 from baked-in weights...")
        t0 = time.time()

        self.pipe = QwenImageEditPlusPipeline.from_pretrained(
            MODEL_DIR,
            torch_dtype=torch.bfloat16,
        )
        self.pipe.to("cuda")

        # Warmup pass — moves CUDA kernel compilation / graph warmup into
        # the snapshot phase rather than your user's first real request.
        dummy = PILImage.new("RGB", (512, 512), color="white")
        _ = self.pipe(
            image=[dummy, dummy],
            prompt="warmup",
            num_inference_steps=2,
        )

        print(f"Model loaded + warmed in {time.time() - t0:.1f}s")

    @modal.method()
    def keep_warm(self) -> bool:
        """
        Ultra-light GPU operation to keep the container alive.
        Called by an external cron job every ~60s to prevent cold starts.
        Does NOT run a full inference — just touches the GPU so Modal
        keeps the container warm (resets the scaledown_window timer).
        """
        _ = torch.zeros(1, device="cuda")
        return True

    @modal.method()
    def generate(
        self,
        person_image_bytes: bytes,
        garment_image_bytes: bytes,
        prompt: Optional[str] = None,
        steps: int = 40,
        true_cfg_scale: float = 4.0,
        seed: Optional[int] = None,
    ) -> bytes:
        """
        Core generation call. Takes raw image bytes, returns PNG bytes.

        Quality tuning knobs (via the web endpoint):
          - steps (int, default 40): Raise to 50-60 for more detail (diminishing
            returns past ~60). Lower to 25-30 for faster inference.
          - true_cfg_scale (float, default 4.0): Raise to 5-7 for tighter
            identity preservation. Lower for more creative reinterpretation.
          - seed (int, optional): Set for deterministic reproducibility.
        """
        person_img = PILImage.open(io.BytesIO(person_image_bytes)).convert("RGB")
        garment_img = PILImage.open(io.BytesIO(garment_image_bytes)).convert("RGB")

        if prompt is None:
            prompt = (
                "Put the garment from the second image onto the person in the "
                "first image. Keep the person's face, identity, pose, body "
                "shape, and background exactly identical. Only change the "
                "clothing to match the garment shown."
            )

        generator = None
        if seed is not None:
            generator = torch.Generator(device="cuda").manual_seed(seed)

        result = self.pipe(
            image=[person_img, garment_img],
            prompt=prompt,
            num_inference_steps=steps,
            true_cfg_scale=true_cfg_scale,
            generator=generator,
        )

        out_img = result.images[0]
        buf = io.BytesIO()
        out_img.save(buf, format="PNG")
        return buf.getvalue()


# ---------------------------------------------------------------------------
# 3. FASTAPI WEB ENDPOINTS — this is what the Trendza edge function calls.
#    Two modes:
#      POST /tryon      — multipart file upload  (person_image + garment_image)
#      POST /tryon-url  — JSON with image URLs    (person_image_url + garment_image_url)
# ---------------------------------------------------------------------------

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

web_app = FastAPI(title="Trendza Try-On (Qwen-Image-Edit-2509)", version="7.0.0")


class TryOnUrlRequest(BaseModel):
    """JSON body for URL-based try-on requests."""
    person_image_url: str
    garment_image_urls: List[str] = []
    garment_image_url: str = ""
    prompt: Optional[str] = None
    steps: int = 40
    true_cfg_scale: float = 4.0
    seed: Optional[int] = None


@web_app.post("/tryon")
async def tryon_endpoint(
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    prompt: Optional[str] = Form(None),
    steps: int = Form(40),
    true_cfg_scale: float = Form(4.0),
    seed: Optional[int] = Form(None),
) -> Response:
    """
    Multipart file upload endpoint.

    Usage (from edge function):
        form = FormData()
        form.append("person_image", personBlob, "person.jpg")
        form.append("garment_image", garmentBlob, "garment.jpg")
        form.append("steps", "40")
        response = await fetch(".../tryon", { method: "POST", body: form })
    """
    person_bytes = await person_image.read()
    garment_bytes = await garment_image.read()

    model = TryOnModel()
    result_bytes = model.generate.remote(
        person_image_bytes=person_bytes,
        garment_image_bytes=garment_bytes,
        prompt=prompt,
        steps=steps,
        true_cfg_scale=true_cfg_scale,
        seed=seed,
    )

    return Response(content=result_bytes, media_type="image/png")


@web_app.post("/tryon-url")
async def tryon_url_endpoint(req: TryOnUrlRequest) -> Response:
    """
    URL-based variant — downloads images from URLs server-side.
    Useful for backward compatibility with the old CatVTON calling pattern.
    """
    import requests as reqs

    # Download person image
    person_resp = reqs.get(req.person_image_url, timeout=60)
    if not person_resp.ok:
        raise HTTPException(502, f"Failed to download person image: {person_resp.status_code}")
    person_bytes = person_resp.content

    # Resolve garment image URL (support both single and list fields)
    garment_url = req.garment_image_url or (
        req.garment_image_urls[0] if req.garment_image_urls else ""
    )
    if not garment_url:
        raise HTTPException(400, "garment_image_url or garment_image_urls is required")

    garment_resp = reqs.get(garment_url, timeout=60)
    if not garment_resp.ok:
        raise HTTPException(502, f"Failed to download garment image: {garment_resp.status_code}")
    garment_bytes = garment_resp.content

    model = TryOnModel()
    result_bytes = model.generate.remote(
        person_image_bytes=person_bytes,
        garment_image_bytes=garment_bytes,
        prompt=req.prompt,
        steps=req.steps,
        true_cfg_scale=req.true_cfg_scale,
        seed=req.seed,
    )

    return Response(content=result_bytes, media_type="image/png")


@web_app.get("/health")
async def health() -> dict:
    """Health check — used by the edge function and deploy tests."""
    return {"status": "ok"}


@web_app.get("/keepwarm")
async def keep_warm_endpoint() -> dict:
    """
    Keep-warm endpoint for external cron job.
    
    Calls TryOnModel.keep_warm() which runs a tiny GPU operation to
    keep the GPU container alive. Hit this every ~60s from cron-job.org
    or similar to prevent cold starts.
    
    Cost per call: ~$0.000001 (milliseconds of A100 time).
    """
    model = TryOnModel()
    model.keep_warm.remote()
    return {"status": "kept_warm"}


@app.function(
    image=image,
    timeout=600,  # cold start + model load + warmup + first inference
)
@modal.asgi_app()
def fastapi_app() -> FastAPI:
    """Mount the FastAPI web app as a Modal ASGI app."""
    return web_app


# ---------------------------------------------------------------------------
# 4. KEEP-WARM SCHEDULE — prevents cold starts during active hours
#    Runs every 60 seconds from Modal's managed scheduler (no external
#    cron service needed). Each call does a tiny GPU operation that
#    resets the scaledown_window timer, keeping the GPU container warm.
# ---------------------------------------------------------------------------

@app.function(schedule=modal.Period(seconds=60))
def keep_warm_schedule() -> None:
    """
    Modal-managed keep-warm. Runs every 60s.
    Touches the GPU container via TryOnModel.keep_warm() so it never
    idles long enough to hit scaledown_window=120.
    Cost per run: ~$0.000001 (milliseconds of A100 time).
    """
    TryOnModel().keep_warm.remote()


# ---------------------------------------------------------------------------
# 5. LOCAL TEST ENTRYPOINT — `modal run ...` to sanity check before deploy
# ---------------------------------------------------------------------------

@app.local_entrypoint()
def main(person_path: str = "person.jpg", garment_path: str = "garment.jpg") -> None:
    """Quick local test: modal run modal_app/tryon_pipeline.py --person-path ... --garment-path ..."""
    person_bytes = Path(person_path).read_bytes()
    garment_bytes = Path(garment_path).read_bytes()

    model = TryOnModel()
    result = model.generate.remote(
        person_image_bytes=person_bytes,
        garment_image_bytes=garment_bytes,
    )

    out_path = Path("result.png")
    out_path.write_bytes(result)
    print(f"Saved result to {out_path}")
