"""
Gemini Virtual Try-On Test (REST API version)
==============================================
Uses the generateContent REST endpoint directly with gemini-3.1-flash-lite-image
and response_modalities=["TEXT", "IMAGE"].

No SDK install needed — uses requests + PIL which are already installed.

Usage:
  python modal_app/test_gemini_tryon.py <GEMINI_API_KEY>
"""

import base64
import io
import json
import sys
import time
import requests
from PIL import Image

# ---------------------------------------------------------------------------
PERSON_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/person/men/Simon_1.png"
)
GARMENT_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/condition/upper/21514384_52353349_1000.jpg"
)

PROMPT = (
    "You are an expert fashion photo editor. Your task is a high-fidelity "
    "image-to-image blend. Modify the first image so the person is wearing "
    "the exact garment from the second image, replacing their original shirt.\n\n"
    "RULES:\n"
    "1. IDENTITY LOCK: Face, hair, skin must remain pixel-for-pixel identical.\n"
    "2. BACKGROUND LOCK: Environment must remain 100% intact.\n"
    "3. ENVIRONMENT BLENDING: Match lighting and shadows onto the new garment."
)


def img_to_b64_data(url: str) -> dict:
    """Download image from URL and return inline_data dict for Gemini API."""
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content))
    b64 = base64.b64encode(resp.content).decode("utf-8")
    mime = "image/png" if resp.content[:4] == b"\x89PNG" else "image/jpeg"
    print(f"    {img.size[0]}x{img.size[1]} ({len(resp.content)/1024:.0f} KB, {mime})")
    return {"mime_type": mime, "data": b64}


def main():
    if len(sys.argv) < 2:
        print("Usage: python modal_app/test_gemini_tryon.py <GEMINI_API_KEY>")
        sys.exit(1)

    api_key = sys.argv[1]

    print("=" * 60)
    print("Gemini Virtual Try-On Test (REST API)")
    print("=" * 60)

    # Step 1: Download and encode images
    print("\n[1/3] Downloading & encoding images...")
    person_data = img_to_b64_data(PERSON_URL)
    garment_data = img_to_b64_data(GARMENT_URL)

    # Step 2: Build and send request
    print("\n[2/3] Sending to Gemini 3.1 Flash Lite Image...")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": PROMPT},
                    {"inline_data": person_data},
                    {"inline_data": garment_data},
                ]
            }
        ],
        "generation_config": {
            "temperature": 0.4,
        },
    }

    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        "models/gemini-3.1-flash-lite-image:generateContent"
    )
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }

    print(f"  Payload: ~{len(json.dumps(payload))/1024:.0f} KB")
    start = time.time()

    resp = requests.post(url, headers=headers, json=payload, timeout=180)
    elapsed = time.time() - start
    print(f"  HTTP {resp.status_code} ({elapsed:.1f}s)")

    if resp.status_code != 200:
        err = resp.json().get("error", {})
        msg = err.get("message", resp.text[:500])
        print(f"\n  ❌ ERROR: {msg}")
        if "quota" in str(msg).lower() or "429" in str(msg):
            print("  → Quota/rate limit issue with this API key.")
        return

    result = resp.json()

    # Step 3: Extract image from response
    print("\n[3/3] Extracting result...")

    # Navigate: candidates[0].content.parts[].inline_data
    img_bytes = None
    try:
        for part in result["candidates"][0]["content"]["parts"]:
            if "inline_data" in part:
                img_bytes = base64.b64decode(part["inline_data"]["data"])
                break
    except (KeyError, IndexError) as e:
        print(f"  Could not parse response: {e}")
        print(f"  Response keys: {list(result.keys())}")
        return

    if img_bytes:
        img = Image.open(io.BytesIO(img_bytes))
        output_path = "modal_app/gemini_tryon_result.png"
        img.save(output_path)

        print(f"  {'=' * 50}")
        print(f"  ✅ SUCCESS!")
        print(f"  {'=' * 50}")
        print(f"  Saved: {output_path}")
        print(f"  Size: {img.size[0]}x{img.size[1]}")
        print(f"  File: {len(img_bytes)/1024:.0f} KB")
        print(f"  Time: {elapsed:.1f}s")
    else:
        text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        print(f"  ❌ No image in response. Text: {text[:300]}")


if __name__ == "__main__":
    main()
