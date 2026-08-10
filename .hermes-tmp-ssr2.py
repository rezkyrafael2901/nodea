#!/usr/bin/env python3
"""Download all JS chunks from a deployment URL and grep for markers."""
import urllib.request, re, sys, os

def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def scan(url, depth=0):
    """Scan page HTML + all referenced chunks for markers."""
    markers = ['more interesting', 'Meet yourself', 'What does your data', 'What your data says', 'Source orbit', 'Switch to light']
    try:
        html = fetch(url).decode('utf-8', 'ignore')
    except Exception as e:
        print(f'ERR html {url}: {e}')
        return
    print(f'html len={len(html)}')
    for m in markers:
        if m.lower() in html.lower():
            print(f'  HTML HIT: {m}')
    scripts = re.findall(r'src="(/_next/static/[^"]+\.js)"', html)
    flight = re.findall(r'"buildId":"([^"]+)"', html)
    print(f'buildId={flight[:1]} | scripts={len(scripts)}')
    found = {}
    for s in scripts:
        try:
            text = fetch(url.rstrip('/') + s).decode('utf-8', 'ignore')
        except Exception:
            continue
        for m in markers:
            if m.lower() in text.lower():
                found.setdefault(m, []).append(s)
    for m in markers:
        if m in found:
            print(f'  CHUNK HIT: {m} -> {len(found[m])} chunks')

scan('https://nodea-j45d7tchi-rezkis-projects-b728484a.vercel.app/')