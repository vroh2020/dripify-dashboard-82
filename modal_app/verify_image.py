"""
Submit a try-on job, poll for result, decode/save the image, and verify it's a real photo.
"""

import base64
import io
import os
import sys
import time
import requests

SUBMIT_URL = "https://ramvelpuri90--trendza-tryon-submit-tryon.modal.run"
POLL_URL = "https://ramvelpuri90--trendza-tryon-get-tryon-result.modal.run"

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

print("=== Step 1: Submit try-on job ===")
resp = session.post(SUBMIT_URL, json={
    "person_image_url": PERSON_URL,
    "garment_image_url": GARMENT_URL,
    "garment_type": "upper",
}, timeout=30)
print(f"Status: {resp.status_code}, Body: {resp.text[:200]}")

if resp.status_code != 200:
    print("FAILED!")

data = resp.json()
call_id = data.get("call_id")
print(f"Call ID: {call_id}")

print("\n=== Step 2: Poll for result ===")
poll_start = time.time()
for attempt in range(1, 180):
    poll = session.get(POLL_URL, params={"call_id": call_id}, timeout=30)
    elapsed = time.time() - poll_start
    print(f"  #{attempt}: status={poll.status_code} elapsed={elapsed:.0f}s", end="")
    if poll.status_code == 200:
        print(" DONE")
        result = poll.json()
        break
    elif poll.status_code == 202:
        print(" processing")
        time.sleep(3)
        continue
    else:
        print(f"\n  Unexpected: {poll.text[:200]}")
        sys.exit(1)
else:
    print("Timed out")
    sys.exit(1)

print("\n=== Step 3: Decode and save image ===")
b64 = result.get("image_base64")
if not b64:
    print(f"No image_base64 in response: {result}")
    sys.exit(1)

print(f"Base64 length: {len(b64)} chars")

img_bytes = base64.b64decode(b64)
print(f"Decoded size: {len(img_bytes)} bytes ({len(img_bytes)/1024:.1f} KB)")

# Save to file
with open(OUTPUT_PATH, "wb") as f:
    f.write(img_bytes)
print(f"Saved to: {OUTPUT_PATH}")

# Verify it's a valid PNG
if img_bytes[:8] == b'\x89PNG\r\n\x1a\n':
    print(f"Format: PNG (valid header)")
elif img_bytes[:2] == b'\xff\xd8':
    print(f"Format: JPEG (valid header)")
else:
    print(f"Format: unknown (first bytes: {img_bytes[:8].hex()})")

# Check file size is reasonable (not empty, not garbage)
if len(img_bytes) < 1000:
    print("WARNING: Image is too small - likely garbage!")
elif len(img_bytes) > 100 * 1024:
    print(f"Size: Reasonable ({len(img_bytes)/1024:.0f} KB)")
else:
    print(f"Size: {len(img_bytes)/1024:.0f} KB - borderline small")

# Try to open with PIL to verify
try:
    from PIL import Image
    img = Image.open(io.BytesIO(img_bytes))
    print(f"Dimensions: {img.size[0]}x{img.size[1]} pixels")
    expected = (768, 1024)
    if img.size == expected:
        print(f"Resolution: matches expected {expected[0]}x{expected[1]}")
    else:
        print(f"WARNING: resolution {img.size} != expected {expected}")
    print(f"Mode: {img.mode}")
    
    # Check if image has meaningful content (not all one color)
    extrema = img.getextrema()
    has_variation = all(mn != mx for mn, mx in extrema)
    if has_variation:
        print("Content: Has color variation (not a solid color)")
    else:
        print("WARNING: Image appears to be a solid color!")
    
    # Check average brightness
    import numpy as np
    arr = np.array(img)
    avg_r, avg_g, avg_b = arr.mean(axis=(0, 1))
    print(f"Average color: RGB({avg_r:.0f}, {avg_g:.0f}, {avg_b:.0f})")
    
    # Very dark or very light could indicate garbage
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
