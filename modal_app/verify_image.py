"""
Submit a try-on job to the Qwen GGUF endpoint, save the image, and verify it's a real photo.
"""

import io
import os
import sys
import time
import requests
from PIL import Image

TRYON_URL = "https://ramvelpuri90--trendza-tryon-web.modal.run/tryon"

PERSON_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/person/men/Simon_1.png"
)
GARMENT_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/condition/upper/21514384_52353349_1000.jpg"
)

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "tryon_result.png")

session = requests.Session()

print("=== Submitting try-on to Qwen GGUF endpoint ===")
start = time.time()
resp = session.post(TRYON_URL, json={
    "person_image_url": PERSON_URL,
    "garment_image_urls": [GARMENT_URL],
    "is_woman": False,
}, timeout=300)
elapsed = time.time() - start
print(f"Status: {resp.status_code}, Time: {elapsed:.1f}s")

if resp.status_code != 200:
    print(f"FAILED! Body: {resp.text[:500]}")
    sys.exit(1)

img_bytes = resp.content
print(f"Response size: {len(img_bytes)} bytes ({len(img_bytes)/1024:.1f} KB)")

# Save to file
with open(OUTPUT_PATH, "wb") as f:
    f.write(img_bytes)
print(f"Saved to: {OUTPUT_PATH}")

# Verify it's a valid PNG
if img_bytes[:8] == b'\x89PNG\r\n\x1a\n':
    print("Format: PNG (valid header)")
elif img_bytes[:2] == b'\xff\xd8':
    print("Format: JPEG (valid header)")
else:
    print(f"Format: unknown (first bytes: {img_bytes[:8].hex()})")

# Check file size
if len(img_bytes) < 1000:
    print("WARNING: Image is too small - likely garbage!")
elif len(img_bytes) > 100 * 1024:
    print(f"Size: Reasonable ({len(img_bytes)/1024:.0f} KB)")
else:
    print(f"Size: {len(img_bytes)/1024:.0f} KB - borderline small")

# Open with PIL to verify
try:
    img = Image.open(io.BytesIO(img_bytes))
    print(f"Dimensions: {img.size[0]}x{img.size[1]} pixels")
    print(f"Mode: {img.mode}")

    # Check if image has meaningful content
    extrema = img.getextrema()
    has_variation = any(mn != mx for mn, mx in extrema)
    if has_variation:
        print("Content: Has color variation (not a solid color)")
    else:
        print("WARNING: Image appears to be a solid color!")

    # Check average brightness
    import numpy as np
    arr = np.array(img)
    avg_r, avg_g, avg_b = arr.mean(axis=(0, 1))
    print(f"Average color: RGB({avg_r:.0f}, {avg_g:.0f}, {avg_b:.0f})")

    brightness = (avg_r + avg_g + avg_b) / 3
    if brightness < 20:
        print("WARNING: Image is very dark - likely a black square")
    elif brightness > 235:
        print("WARNING: Image is very bright - likely a white square")
    else:
        print(f"Brightness: {brightness:.0f}/255 - within normal range")

except ImportError:
    print("PIL not available, skipping detailed analysis")
except Exception as e:
    print(f"Could not analyze image: {e}")

print("\nDone! Check tryon_result.png visually to confirm it's a real try-on photo.")
