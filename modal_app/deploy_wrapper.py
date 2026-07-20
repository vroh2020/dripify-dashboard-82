"""
Wrapper to run 'modal deploy tryon_pipeline.py' with proper UTF-8 encoding.
Workaround for Windows charmap codec issue.
"""
import os
import subprocess
import sys

# Force UTF-8 encoding for all I/O and subprocess
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Also try setting console code page to UTF-8
os.system('chcp 65001 > nul 2>&1')

env = os.environ.copy()
env['PYTHONIOENCODING'] = 'utf-8'
env['PYTHONUTF8'] = '1'

result = subprocess.run(
    [sys.executable, '-m', 'modal', 'deploy', 'tryon_pipeline.py'],
    cwd=r'C:\Users\vroh2\OneDrive\Desktop\trendza\dripify-dashboard-82\modal_app',
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='replace',
    timeout=600,
    env=env,
)

print("=== STDOUT ===")
print(result.stdout)
print("=== STDERR ===")
print(result.stderr)

if result.returncode == 0:
    print(f"\n Deployment succeeded (exit code {result.returncode})")
else:
    print(f"\n Deployment FAILED (exit code {result.returncode})")
    sys.exit(1)
