#!/usr/bin/env python3
"""Scan ALL deployments for tagline markers in JS chunks."""
import urllib.request, re, sys

urls = [
    'https://nodea-d2nwazhpy-rezkis-projects-b728484a.vercel.app',
    'https://nodea-j45d7tchi-rezkis-projects-b728484a.vercel.app',
    'https://nodea-p8cez0p3k-rezkis-projects-b728484a.vercel.app',
    'https://nodea-hrxbsu32p-rezkis-projects-b728484a.vercel.app',
    'https://nodea-gdehqg9ls-rezkis-projects-b728484a.vercel.app',
    'https://nodea-58ukks7dq-rezkis-projects-b728484a.vercel.app',
    'https://nodea-2mtzchy1h-rezkis-projects-b728484a.vercel.app',
    'https://nodea-2hoct82xi-rezkis-projects-b728484a.vercel.app',
    'https://nodea-a5vmx7sjy-rezkis-projects-b728484a.vercel.app',
    'https://nodea-pdsgctpgp-rezkis-projects-b728484a.vercel.app',
    'https://nodea-q8cwqnku8-rezkis-projects-b728484a.vercel.app',
    'https://nodea-5ak8b0qes-rezkis-projects-b728484a.vercel.app',
    'https://nodea-upel41pud-rezkis-projects-b728484a.vercel.app',
    'https://nodea-d40hr68jg-rezkis-projects-b728484a.vercel.app',
    'https://nodea-b995973lj-rezkis-projects-b728484a.vercel.app',
    'https://nodea-79arbbh93-rezkis-projects-b728484a.vercel.app',
]

markers = ['more interesting', 'Meet yourself', 'What does your data', 'What your data says']

def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

for url in urls:
    try:
        html = fetch(url).decode('utf-8', 'ignore')
    except Exception as e:
        print(f'{url} | ERR html: {e}')
        continue
    scripts = re.findall(r'src="(/_next/static/[^"]+\.js)"', html)
    found = {}
    for s in scripts:
        full = url.rstrip('/') + s
        try:
            text = fetch(full).decode('utf-8', 'ignore')
        except Exception:
            continue
        for m in markers:
            if m.lower() in text.lower():
                found.setdefault(m, []).append(s)
    short = url.split('-')[1][:12]
    status = ', '.join(f'{m}({len(found.get(m, []))})' for m in markers if m in found) or 'NO MARKERS'
    print(f'{short} | {status}')