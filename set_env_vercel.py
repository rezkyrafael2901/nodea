#!/usr/bin/env python3
"""Set Vercel environment variables from .env.local"""
import subprocess
import os
import sys

# Read token and env vars from .env.local
env_vars = {}
token = None

with open('.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, val = line.split('=', 1)
            if key == 'VERCEL_TOKEN':
                token = val
            elif key in ['VANA_PRIVATE_KEY', 'VANA_NETWORK', 'VANA_APP_NAME',
                         'VANA_WALLET_ADDRESS', 'AI_PROVIDER', 'OPENROUTER_API_KEY',
                         'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']:
                env_vars[key] = val

if not token:
    print("ERROR: VERCEL_TOKEN not found")
    sys.exit(1)

# Map VANA_PRIVATE_KEY to VANA_APP_PRIVATE_KEY for Vana SDK
custom_vars = {
    'VANA_APP_PRIVATE_KEY': '0xa9d4880660e44f43ab875c9787c09d110d70bf3e0d41bf6134efbe5b0bf641cc',
    'VANA_APP_URL': 'https://vana-soul.vercel.app',
    'VANA_ENV': 'production',
    'VANA_NETWORK': 'mainnet',
    'AI_PROVIDER': 'openrouter',
}

def vercel_env_add(key, value, token):
    """Add env var to Vercel project"""
    cmd = f'npx vercel env add {key} production --token {token} --yes'
    proc = subprocess.run(
        cmd, shell=True, input=value + '\n',
        capture_output=True, text=True, timeout=30
    )
    return proc

for key, value in custom_vars.items():
    if not value or value == '':
        continue
    result = vercel_env_add(key, value, token)
    if result.returncode == 0:
        print(f'  ✅ {key} set')
    else:
        stderr = result.stderr.strip()
        if 'already exists' in stderr:
            print(f'  ⏭️  {key} already exists')
        else:
            print(f'  ❌ {key}: {stderr[-100:]}')

print('\nDone!')
