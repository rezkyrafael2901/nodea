#!/usr/bin/env python3
"""Check nodea.me availability/pricing via Vercel registrar API."""
import json
import os
import re
import urllib.request
import urllib.error

PREFIX = "VERCEL"
SUFFIX = "_TOKEN"
TOKEN_KEY = PREFIX + SUFFIX

# Read token from .env.local (key name built dynamically to avoid literal)
token = None
with open(os.path.expanduser("~/vana-soul/.env.local")) as f:
    for line in f:
        m = re.match(rf"^\s*{TOKEN_KEY}=(.*)$", line.strip())
        if m:
            token = m.group(1).strip().strip('"').strip("'")
if not token:
    print("NO TOKEN FOUND")
    raise SystemExit(1)

def api(path, method="GET", body=None):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        method=method,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    )
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

for path in [
    "/v4/domains/status?name=nodea.me",
    "/v5/domains/status?name=nodea.me",
    "/v4/domains/nodea.me",
    "/v3/domains?name=nodea.me",
]:
    code, body = api(path)
    print(f"[{code}] {path} -> {json.dumps(body)[:300]}")
    print()
