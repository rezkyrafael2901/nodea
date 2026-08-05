#!/usr/bin/env python3
"""Check nodea.me / nodea.id availability + pricing via Vercel registrar API."""
import json
import os
import re
import urllib.request
import urllib.error

# Read token from .env.local
token = None
with open(os.path.expanduser("~/vana-soul/.env.local")) as f:
    for line in f:
        m = re.match(r"^\s*VERCEL_TOKEN=(.+)$", line.strip())
        if m:
            token = m.group(1).strip().strip('"').strip("'")
if not token:
    print("NO TOKEN FOUND")
    raise SystemExit(1)

def api(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

for name in ["nodea.me", "nodea.id"]:
    print(f"=== {name} ===")
    code, body = api(f"/v5/domains/status?name={name}")
    print("status:", code)
    print(json.dumps(body, indent=2)[:1200])
    print()
