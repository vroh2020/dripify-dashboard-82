"""
Capture Modal app logs to a file to work around Windows charmap encoding issue.
"""
import os
import subprocess
import sys

os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

env = os.environ.copy()
env['PYTHONIOENCODING'] = 'utf-8'
env['PYTHONUTF8'] = '1'

log_file = os.path.join(os.path.dirname(__file__), 'modal_logs.txt')

with open(log_file, 'w', encoding='utf-8') as f:
    result = subprocess.run(
        [sys.executable, '-m', 'modal', 'app', 'logs', 'trendza-tryon'],
        capture_output=True, text=True, encoding='utf-8', errors='replace',
        timeout=60, env=env,
        cwd=r'C:\Users\vroh2\OneDrive\Desktop\trendza\dripify-dashboard-82\modal_app'
    )
    f.write("=== STDOUT ===\n")
    f.write(result.stdout)
    f.write("\n=== STDERR ===\n")
    f.write(result.stderr)
    f.write(f"\n=== EXIT CODE: {result.returncode} ===\n")

print(f"Logs written to {log_file}")
print(f"File size: {os.path.getsize(log_file)} bytes")
