#!/usr/bin/env python3
"""Scan deployment chunks for markers — parallel version."""
import urllib.request, re, sys, concurrent.futures

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
]

markers = ['more interesting', 'Meet yourself', 'What does your data', 'What your data says']

def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def scan_url(url):
    try:
        html = fetch(url)
        scripts = re.findall(r'src="(/_next/static/[^"]+\.js)"', html.decode('utf-8', 'ignore'))
        found = {}
        for s in scripts:
            try:
                text = fetch(url.rstrip('/') + s).decode('utf-8', 'ignore')
            except Exception:
                continue
            for m in markers:
                if m.lower() in text.lower():
                    found.setdefault(m, []).append(s)
        short = url.split('-')[1][:12]
        status = ', '.join(f'{m}({len(found.get(m, []))})' for m in markers if m in found) or 'NO MARKERS'
        return f'{short} | {status}'
    except Exception as e:
        return f'{url} | ERR: {e}'

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
    for res in ex.map(scan_url, urls):
        print(res)