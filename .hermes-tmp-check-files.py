#!/usr/bin/env python3
"""Fetch deployment file lists for page-client SSR chunks."""
import json, urllib.request, sys, re

token = ''
with open('/home/ubuntu/nodea/.env.local') as f:
    for line in f:
        line = line.strip()
        m = re.match(r'VERCEL_TOKEN=(.+)', line)
        if m:
            token = m.group(1)
if not token:
    print('NO TOKEN'); sys.exit(1)

deployments = [
    'dpl_EgugS27crnBMm2QhzYfLetUWkvvu',
    'dpl_EqwVuKyXkgL8sZkZv6wNgNEBnB7S',
    'dpl_BHuPd7aayEpSmRkSW1eN3NAAHjoG',
    'dpl_4oyy1Adc2mgcqiFWmntYwVV2eqfD',
    'dpl_FfejvcaAznk85HecAaEXKXdD267p',
    'dpl_HrHusKyfqHLEea7H7iVnXZHRcQHZ',
    'dpl_AdvZfG1aCoD17AB1ua2xAZa8h98y',
    'dpl_24C7KzmmkPkp8v2hFdhgnxiRvd11',
    'dpl_E9rFiGd1FpxeAAiUGvFBVhBHBvqe',
    'dpl_6is8SDMBYkoM5ygRdTyNrffout8h',
]

for uid in deployments:
    try:
        req = urllib.request.Request(
            f'https://api.vercel.com/v13/deployments/{uid}/files',
            headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req, timeout=30) as r:
            files = json.loads(r.read())
        page_files = [f for f in files if 'page-client' in f.get('path', '') and f.get('path', '').endswith('.js')]
        print(f'=== {uid} | files: {len(files)}')
        for f in page_files[:4]:
            print(f'   {f["path"]} (uid={f.get("uid", "")[:12]}, size={f.get("size", 0)})')
    except Exception as e:
        print(f'=== {uid} | ERROR: {e}')