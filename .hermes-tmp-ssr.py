#!/usr/bin/env python3
"""Check SSR chunks (server chunks) of a deployment via the /_next/data or SSR bundle."""
import urllib.request, re, sys

def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

# Try the next flight data / RSC payload for the page
for url in [
    'https://nodea-j45d7tchi-rezkis-projects-b728484a.vercel.app/',
    'https://nodea-j45d7tchi-rezkis-projects-b728484a.vercel.app/?_rsc=abc',
]:
    try:
        html = fetch(url).decode('utf-8', 'ignore')
        print(f'URL: {url} len={len(html)}')
        for m in ['more interesting', 'Meet yourself', 'What does your data', 'What your data says', 'Source orbit']:
            if m.lower() in html.lower():
                # find context
                idx = html.lower().find(m.lower())
                print(f'  HIT: {m} ... {html[max(0,idx-60):idx+80]}')
    except Exception as e:
        print(f'ERR {url}: {e}')