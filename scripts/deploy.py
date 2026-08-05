#!/usr/bin/env python3
"""Deploy to Vercel production."""
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

cmd = ["npx", "vercel", "deploy", "--token", token, "--prod", "--yes"]
print("Running:", " ".join(cmd[:-1] + ["<token-redacted>"]))
r = subprocess.run(cmd, cwd=os.path.expanduser("~/vana-soul"), capture_output=True, text=True, timeout=300)
print("exit:", r.returncode)
print(r.stdout[-3000:])
if r.stderr:
    print("stderr:", r.stderr[-1000:])