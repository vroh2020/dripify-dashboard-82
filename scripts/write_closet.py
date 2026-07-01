import base64, sys

CHUNKS_B64 = [
    sys.argv[1],  # base64 of chunk 1
    sys.argv[2],  # base64 of chunk 2
    sys.argv[3],  # base64 of chunk 3
    sys.argv[4],  # base64 of chunk 4
]

content = ''.join(base64.b64decode(c).decode('utf-8') for c in CHUNKS_B64)
with open(r'dripify-dashboard-82/src/components/closet/ClosetView.tsx', 'w') as f:
    f.write(content)
print('wrote', len(content), 'chars,', content.count(chr(10)) + 1, 'lines')
