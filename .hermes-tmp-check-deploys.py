#!/usr/bin/env python3
"""Inspect Vercel deployments' file lists for page-client chunks."""
import json, os, re, urllib.request, sys

env = {}
with open('/home/ubuntu/nodea/.env.local') as f:
    for line in f:
        line = line.strip()
        if line.startswith('VERCEL_TOKEN='):
            env['VERCEL_TOKEN'] = line.split('=', 1)[1]

token = env.get('VERCEL_TOKEN', '')
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
            f'https://api.vercel.com/v13/deployments/{uid}',
            headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read())
        meta = d.get('meta', {})
        commit = meta.get('githubCommitSha', '')[:8]
        msg = meta.get('githubCommitMessage', '')[:70]
        files = d.get('files', [])
        ssr = [f for f in files if 'page-client' in f.get('path', '') and f.get('path', '').endswith('.js')]
        print(f'=== {uid} | {commit} | {msg}')
        print(f'  files: {len(files)} | ssr page-client: {[(f["path"].split("/")[-1], f.get("size", 0)) for f in ssr][:2]}')
    except Exception as e:
        print(f'=== {uid} | ERROR: {e}')