"""
Diagnostic script: Check Modal deployment status and logs, test health endpoint.
Uses proper UTF-8 encoding to work around Windows charmap issue.
"""
import io
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "https://ramcharanvelpuri--trendza-tryon-tryonengine-web.modal.run"

def run_modal_cmd(args):
    """Run a modal CLI command and capture output."""
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    env['PYTHONUTF8'] = '1'
    result = subprocess.run(
        [sys.executable, '-m', 'modal'] + args,
        capture_output=True, text=True, encoding='utf-8', errors='replace',
        timeout=60, env=env,
        cwd=r'C:\Users\vroh2\OneDrive\Desktop\trendza\dripify-dashboard-82\modal_app'
    )
    return result

def check_logs():
    """Check Modal app logs."""
    print("=" * 60)
    print("Checking Modal app logs...")
    print("=" * 60)
    result = run_modal_cmd(['app', 'logs', 'trendza-tryon'])
    if result.returncode == 0:
        print("STDOUT:", result.stdout[:2000] if result.stdout else "(empty)")
        print("STDERR:", result.stderr[:2000] if result.stderr else "(empty)")
    else:
        print("Error running modal logs:", result.stderr[:500])
    print()

def test_health(timeout_seconds=360):
    """Test the /health endpoint with a long timeout."""
    print("=" * 60)
    print(f"Testing /health (timeout={timeout_seconds}s)...")
    print("=" * 60)
    
    url = f"{BASE_URL}/health"
    start = time.time()
    
    # Don't follow redirects - we want to see them
    req = urllib.request.Request(url)
    
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            elapsed = time.time() - start
            body = resp.read().decode('utf-8', errors='replace')
            print(f"Status: {resp.status}")
            print(f"Elapsed: {elapsed:.0f}s")
            print(f"Body: {body[:500]}")
            return resp.status == 200
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start
        print(f"HTTP Error: {e.code} {e.reason}")
        print(f"Elapsed: {elapsed:.0f}s")
        try:
            body = e.read().decode('utf-8', errors='replace')
            print(f"Body: {body[:500]}")
        except:
            pass
        return False
    except urllib.error.URLError as e:
        elapsed = time.time() - start
        print(f"URL Error: {e.reason}")
        print(f"Elapsed: {elapsed:.0f}s")
        return False
    except Exception as e:
        elapsed = time.time() - start
        print(f"Error: {type(e).__name__}: {e}")
        print(f"Elapsed: {elapsed:.0f}s")
        return False

# Step 1: Check logs first
check_logs()

# Step 2: Test health with long timeout
healthy = test_health(600)

if healthy:
    print("\n✅ Health check passed!")
else:
    print("\n❌ Health check failed")
    print("\nLet me also try checking the raw endpoint with curl-like approach...")
    
    # Try again with a simpler check first
    print("\nAttempting a quick non-blocking check first...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        req.add_header('Accept', 'application/json')
        # Quick check - will timeout fast if no container is running
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"Quick check response: {resp.status}")
    except Exception as e:
        print(f"Quick check: {type(e).__name__} (expected if cold starting)")
    
    print("\nLook at the Modal web dashboard at:")
    print("https://modal.com/apps/ramcharanvelpuri/main/deployed/trendza-tryon")
