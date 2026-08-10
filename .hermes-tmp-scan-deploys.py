#!/usr/bin/env python3
"""Scan all live Vercel deployment URLs for tagline markers."""
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

markers = {
    'more interesting': 'more interesting than your bio',
    'meet yourself': 'Meet yourself',
    'what does': 'What does your data',
    'what your': 'What your data says',
}

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode('utf-8', 'ignore')
        hits = [k for k, v in markers.items() if v.lower() in html.lower()]
        # extract script srcs
        scripts = re.findall(r'src="(/_next/static/[^"]+\.js)"', html)[:20]
        print(f'{url.split("-")[1][:12]} | len={len(html)} | hits={hits} | scripts={len(scripts)}')
    except Exception as e:
        print(f'{url.split("-")[1][:12]} | ERROR: {e}')