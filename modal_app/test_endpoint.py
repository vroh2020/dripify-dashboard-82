"""
Test the deployed CatVTON Modal endpoint (spawn + poll pattern).

Pattern:
  1. POST /submit_tryon    → {"call_id": "..."}
  2. GET  /get_tryon_result?call_id=<id>  → 202 {"status": "processing"} or 200 {"status": "complete", "image_base64": "..."}
"""

import time
import sys

import requests

SUBMIT_URL = "https://ramvelpuri90--trendza-tryon-submit-tryon.modal.run"
POLL_URL = "https://ramvelpuri90--trendza-tryon-get-tryon-result.modal.run"

# Sample images from the CatVTON repo
PERSON_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/person/men/Simon_1.png"
)
GARMENT_URL = (
    "https://raw.githubusercontent.com/Zheng-Chong/CatVTON/main/"
    "resource/demo/example/condition/upper/21514384_52353349_1000.jpg"
)

print("=" * 60)
print("CatVTON Modal Endpoint Test (Spawn + Poll)")
print("=" * 60)
print(f"Submit URL: {SUBMIT_URL}")
print(f"Poll URL:   {POLL_URL}")
print(f"Person:     {PERSON_URL}")
print(f"Garment:    {GARMENT_URL}")
print()

session = requests.Session()

# ----- Step 1: Submit the job -----
print("Step 1: Submitting try-on job...")
start = time.time()

try:
    submit_resp = session.post(
        SUBMIT_URL,
        json={
            "person_image_url": PERSON_URL,
            "garment_image_url": GARMENT_URL,
            "garment_type": "upper",
        },
        timeout=30,
    )
except requests.exceptions.RequestException as e:
    print(f"  FATAL: Submit request failed: {e}")
    sys.exit(1)

elapsed = time.time() - start
print(f"  Status: {submit_resp.status_code}")
print(f"  Time:   {elapsed:.1f}s")
print(f"  Body:   {submit_resp.text[:300]}")
print()

if submit_resp.status_code != 200:
    print("  FAIL: Submit failed - aborting.")
    sys.exit(1)

try:
    submit_data = submit_resp.json()
except Exception as e:
    print(f"  FAIL: Could not parse submit response JSON: {e}")
    sys.exit(1)

call_id = submit_data.get("call_id")
if not call_id:
    print(f"  FAIL: No call_id in response: {submit_data}")
    sys.exit(1)

print(f"  OK! Got call_id: {call_id}")
print()

# ----- Step 2: Poll for results -----
print("Step 2: Polling for results...")
print()

max_attempts = 180  # 180 × 3s = 9 minutes max
poll_start = time.time()

for attempt in range(1, max_attempts + 1):
    try:
        poll_resp = session.get(
            POLL_URL,
            params={"call_id": call_id},
            timeout=30,
        )
    except requests.exceptions.RequestException as e:
        print(f"  Poll #{attempt}: connection error - {e}")
        time.sleep(3)
        continue

    poll_elapsed = time.time() - poll_start
    print(f"  Poll #{attempt}: status={poll_resp.status_code}, elapsed={poll_elapsed:.0f}s", end="")

    if poll_resp.status_code == 200:
        print("  <<< DONE")
        print()
        try:
            data = poll_resp.json()
        except Exception as e:
            print(f"  ❌ Could not parse poll response JSON: {e}")
            sys.exit(1)

        if data.get("status") == "complete" and "image_base64" in data:
            b64_len = len(data["image_base64"])
            print(f"  SUCCESS! image_base64 received ({b64_len} chars)")
            print(f"  First 80 chars: {data['image_base64'][:80]}...")
        elif "error" in data:
            print(f"  ERROR: {data['error']}")
            tb = data.get("traceback", "")
            if tb:
                lines = tb.strip().split("\n")
                print(f"  Traceback (last 5 lines):")
                for line in lines[-5:]:
                    print(f"    {line}")
        else:
            print(f"  Unknown response: {data}")
        break

    elif poll_resp.status_code == 202:
        print("  ...processing")
        time.sleep(3)
        continue

    else:
        print(f"  ...unexpected")
        print(f"  Body: {poll_resp.text[:300]}")
        break
else:
    print(f"\n  Polling timed out after {max_attempts} attempts")

total_time = time.time() - start
print(f"\nTotal test time: {total_time:.0f}s")
