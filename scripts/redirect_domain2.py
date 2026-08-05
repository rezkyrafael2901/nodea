#!/usr/bin/env python3
"""Update redirect on existing domains via PATCH."""
import json
import os
import re
import urllib.request
import urllib.error

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
    raise SystemExit(1)

def api(path, method="PATCH", body=None):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        method=method,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    )
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

PROJ = "prj_QbXEc57jOofPxQbX3d9KdHVe7pOQ"
TEAM = "team_qzlAD1SVoR5cerz9JkbcT6eR"

for dom in ["vana-soul.vercel.app", "getnodea.vercel.app"]:
    code, body = api(
        f"/v9/projects/{PROJ}/domains/{dom}?teamId={TEAM}",
        method="PATCH",
        body={"redirect": "nodea-app.vercel.app", "redirectStatusCode": 308},
    )
    print(f"[{code}] {dom} -> {json.dumps(body)[:300]}")
