"""
Test the deployed Qwen-Image-Edit-2509 Modal endpoint (synchronous multipart upload).

Pattern:
  POST /tryon    → raw PNG bytes (image/png)  [multipart file upload]
  GET  /health   → {"status": "ok"}
  POST /tryon-url → raw PNG bytes             [JSON with image URLs]
"""

import io
import sys
import time
import requests
from PIL import Image

# Replace with your deployed Modal endpoint URL
TRYON_URL = "https://ramvelpuri90--trendza-tryon-fastapi-app.modal.run/tryon"
HEALTH_URL = "https://ramvelpuri90--trendza-tryon-fastapi-app.modal.run/health"

# Sample images
PERSON_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/person/men/Simon_1.png"
)
GARMENT_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/condition/upper/21514384_52353349_1000.jpg"
)

print("=" * 60)
print("Qwen-Image-Edit-2509 Modal Endpoint Test")
print("=" * 60)
print(f"Tryon endpoint: {TRYON_URL}")
print(f"Health endpoint: {HEALTH_URL}")
print(f"Person:   {PERSON_URL}")
print(f"Garment:  {GARMENT_URL}")
print()

session = requests.Session()

# ----- Step 1: Health check -----
print("Step 1: Health check...")
try:
    health_resp = session.get(HEALTH_URL, timeout=30)
    print(f"  Status: {health_resp.status_code}")
    print(f"  Body:   {health_resp.text[:200]}")
except requests.exceptions.RequestException as e:
    print(f"  FATAL: Health check failed: {e}")
    sys.exit(1)
print()

if health_resp.status_code != 200:
    print("  FAIL: Health check failed - aborting.")
    sys.exit(1)

# ----- Step 2: Download test images -----
print("Step 2: Downloading test images...")
try:
    person_resp = session.get(PERSON_URL, timeout=60)
    person_resp.raise_for_status()
    garment_resp = session.get(GARMENT_URL, timeout=60)
    garment_resp.raise_for_status()
    print(f"  Person: {len(person_resp.content)/1024:.0f} KB")
    print(f"  Garment: {len(garment_resp.content)/1024:.0f} KB")
except requests.exceptions.RequestException as e:
    print(f"  FATAL: Failed to download test images: {e}")
    sys.exit(1)
print()

# ----- Step 3: Submit try-on (multipart file upload) -----
print("Step 3: Submitting try-on via multipart file upload...")
start = time.time()

files = {
    "person_image": ("person.png", person_resp.content, "image/png"),
    "garment_image": ("garment.jpg", garment_resp.content, "image/jpeg"),
}
data = {
    "steps": "40",
    "true_cfg_scale": "5.0",
}

try:
    resp = session.post(
        TRYON_URL,
        files=files,
        data=data,
        timeout=300,  # 5 min timeout for cold start
    )
except requests.exceptions.RequestException as e:
    print(f"  FATAL: Request failed: {e}")
    sys.exit(1)

elapsed = time.time() - start
print(f"  Status: {resp.status_code}")
print(f"  Time:   {elapsed:.1f}s")

if resp.status_code != 200:
    print(f"  FAIL: Endpoint returned {resp.status_code}")
    print(f"  Body: {resp.text[:500]}")
    sys.exit(1)

# ----- Step 4: Verify response is a valid image -----
print()
print("Step 4: Verifying response...")

content_type = resp.headers.get("content-type", "")
print(f"  Content-Type: {content_type}")

img_bytes = resp.content
print(f"  Bytes received: {len(img_bytes)} ({len(img_bytes)/1024:.1f} KB)")

if len(img_bytes) < 1000:
    print("  FAIL: Response too small - likely an error")
    sys.exit(1)

# Check PNG header
if img_bytes[:8] == b'\x89PNG\r\n\x1a\n':
    print("  ✅ Valid PNG header")
else:
    print(f"  ⚠️  Unknown format (first bytes: {img_bytes[:8].hex()})")

# Try to open with PIL
try:
    img = Image.open(io.BytesIO(img_bytes))
    print(f"  Dimensions: {img.size[0]}x{img.size[1]} pixels")
    print(f"  Mode: {img.mode}")

    extrema = img.getextrema()
    has_variation = any(mn != mx for mn, mx in extrema)
    if has_variation:
        print("  ✅ Has color variation (not a solid color)")
    else:
        print("  ⚠️  Appears to be a solid color!")
except Exception as e:
    print(f"  ⚠️  Could not analyze image: {e}")

# Save to file
output_path = "modal_app/tryon_result.png"
with open(output_path, "wb") as f:
    f.write(img_bytes)
print(f"\n  ✅ Saved to: {output_path}")
print(f"\nTotal time: {elapsed:.1f}s")
print("Done! Check the image visually.")
