#!/usr/bin/env python3
"""Fetch client JS chunks from a Vercel deployment and search for tagline markers."""
import urllib.request, re, sys, hashlib

url = sys.argv[1] if len(sys.argv) > 1 else 'https://nodea-j45d7tchi-rezkis-projects-b728484a.vercel.app'

markers = ['more interesting', 'Meet yourself', 'What does your data', 'What your data says', 'Switch to light mode', 'Switch to dark mode']

def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

html = fetch(url).decode('utf-8', 'ignore')
scripts = []
# inline flight data might contain strings too
scripts += re.findall(r'src="(/_next/static/[^"]+\.js)"', html)
scripts += re.findall(r'href="(/_next/static/[^"]+\.css)"', html)
print(f'URL={url} | scripts={len(scripts)}')

seen = set()
found = {}
for s in scripts:
    if s in seen:
        continue
    seen.add(s)
    full = url.rstrip('/') + s
    try:
        body = fetch(full)
        text = body.decode('utf-8', 'ignore')
        for m in markers:
            if m.lower() in text.lower():
                found.setdefault(m, []).append(s)
    except Exception as e:
        print(f'  ERR {s}: {e}')

for m in markers:
    if m in found:
        print(f'HIT: {m} -> {len(found[m])} chunks')
        for c in found[m][:3]:
            print(f'    {c}')
    else:
        print(f'MISS: {m}')