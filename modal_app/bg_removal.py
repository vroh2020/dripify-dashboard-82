import modal

app = modal.App("trendza-bg-removal")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "rembg[cpu]",
        "pillow",
        "requests",
        "fastapi[standard]",
        "pydantic",
    )
    # Pre-cache the model during build (CPU ONNX runtime works fine in build env)
    .run_commands(
        'python -c "from rembg import new_session; new_session(\'isnet-general-use\')"'
    )
)


@app.cls(
    # No GPU needed — isnet-general-use runs sub-100ms on CPU (179MB ONNX model)
    scaledown_window=120,
    image=image,
    timeout=120,
)
@modal.concurrent(max_inputs=4)
class BGRemover:
    @modal.enter()
    def load(self):
        from rembg import new_session

        print("🔄 Loading isnet-general-use model...")
        self.session = new_session("isnet-general-use")
        print("✅ Model loaded")

    @modal.method()
    def remove_bg(
        self,
        image_url: str,
        fg_threshold: int = 240,
        bg_threshold: int = 10,
        erode_size: int = 4,
    ) -> bytes:
        import io

        import requests
        from PIL import Image
        from rembg import remove

        print(f"📥 Downloading image from {image_url[:80]}...")
        img_bytes = requests.get(image_url, timeout=30).content
        input_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        print(f"📐 Image size: {input_img.size}")

        print("🎨 Running rembg...")
        output_img = remove(
            input_img,
            session=self.session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=fg_threshold,
            alpha_matting_background_threshold=bg_threshold,
            alpha_matting_erode_size=erode_size,
        )
        print("✅ Background removed")

        buf = io.BytesIO()
        output_img.save(buf, format="PNG")
        return buf.getvalue()

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI, HTTPException, Response
        from pydantic import BaseModel

        class Req(BaseModel):
            image_url: str
            fg_threshold: int = 240
            bg_threshold: int = 10
            erode_size: int = 4

        web_app = FastAPI()

        @web_app.post("/remove-bg")
        async def remove_bg_endpoint(req: Req):
            try:
                png = self.remove_bg.local(
                    req.image_url,
                    req.fg_threshold,
                    req.bg_threshold,
                    req.erode_size,
                )
                return Response(content=png, media_type="image/png")
            except Exception as e:
                raise HTTPException(500, str(e))

        @web_app.get("/health")
        async def health():
            return {"status": "ok"}

        return web_app
