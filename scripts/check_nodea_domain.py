#!/usr/bin/env python3
"""Check nodea.vercel.app ownership + attempt to add to project."""
import json
import os
import re
import urllib.request

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

PROJ = "prj_QbXEc57jOofPxQbX3d9KdHVe7pOQ"
TEAM = "team_qzlAD1SVoR5cerz9JkbcT6eR"

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

print("=== domain status nodea.vercel.app ===")
code, body = api(f"/v4/domains/status?name=nodea.vercel.app")
print("status:", code)
print(json.dumps(body, indent=2)[:1500])

print("\n=== try add nodea.vercel.app to project ===")
code, body = api(
    f"/v10/projects/{PROJ}/domains?teamId={TEAM}",
    method="POST",
    body={"name": "nodea.vercel.app"},
)
print("status:", code)
print(json.dumps(body, indent=2)[:1500])
