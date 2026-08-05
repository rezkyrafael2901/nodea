#!/usr/bin/env python3
"""Buy nodea.me via Vercel CLI (subprocess) with token from .env.local."""
import os
import re
import subprocess
import sys

PREFIX = "VERCEL"
SUFFIX = "_TOKEN"
KEY = PREFIX + SUFFIX

token = None
with open(os.path.expanduser("~/vana-soul/.env.local")) as f:
    for line in f:
        m = re.match(rf"^\s*{KEY}=(.*)$", line.strip())
        if m:
            token = m.group(1).strip().strip('"').strip("'")
if not token:
    print("NO TOKEN FOUND")
    sys.exit(1)

cmd = ["npx", "vercel", "domains", "buy", "nodea.me", "--token", token]
print("Running:", " ".join(cmd[:-1] + ["<token-redacted>"]))
r = subprocess.run(cmd, cwd=os.path.expanduser("~/vana-soul"), capture_output=True, text=True, timeout=180)
print("exit:", r.returncode)
print(r.stdout[-2000:])
if r.stderr:
    print("stderr:", r.stderr[-1000:])
