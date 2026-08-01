#!/usr/bin/env python3
"""Deploy to Vercel using token from .env.local"""
import subprocess
import os

with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('VERCEL_TOKEN='):
            token = line.strip().split('=', 1)[1]
            break
    else:
        print("ERROR: Token not found in .env.local")
        exit(1)

# Save to env and run
env = os.environ.copy()
env['VERCEL_TOKEN'] = token
cmd = ['npx', 'vercel', 'deploy', '--prod', '--token', token]
result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
print(result.stdout[-3000:])
if result.stderr:
    print("STDERR:", result.stderr[-1000:])
