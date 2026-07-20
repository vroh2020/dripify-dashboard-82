"""
Test the deployed Qwen-Image-Edit GGUF Modal endpoint (synchronous).

Pattern:
  POST /tryon → raw PNG bytes (image/png)
  GET  /health → {"status": "ok"}
"""

import io
import sys
import time
import requests
from PIL import Image

# Replace with your deployed Modal endpoint URL
TRYON_URL = "https://ramvelpuri90--trendza-tryon-web.modal.run/tryon"
HEALTH_URL = "https://ramvelpuri90--trendza-tryon-web.modal.run/health"

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
print("Qwen GGUF Modal Endpoint Test (Synchronous)")
print("=" * 60)
print(f"Endpoint: {TRYON_URL}")
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

# ----- Step 2: Submit try-on -----
print("Step 2: Submitting try-on (synchronous)...")
start = time.time()

try:
    resp = session.post(
        TRYON_URL,
        json={
            "person_image_url": PERSON_URL,
            "garment_image_urls": [GARMENT_URL],
            "is_woman": False,
        },
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

# ----- Step 3: Verify response is a valid PNG -----
print()
print("Step 3: Verifying response...")

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

    # Check for color variation (not all one color)
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
