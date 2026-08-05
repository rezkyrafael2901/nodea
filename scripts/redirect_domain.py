#!/usr/bin/env python3
"""Set redirect: vana-soul.vercel.app and getnodea -> nodea-app.vercel.app"""
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

def api(path, method="POST", body=None):
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

# Redirect old internal domain to nodea-app
code, body = api(
    f"/v10/projects/{PROJ}/domains?teamId={TEAM}",
    method="POST",
    body={
        "name": "vana-soul.vercel.app",
        "redirect": "nodea-app.vercel.app",
        "redirectStatusCode": 308,
    },
)
print(f"[{code}] vana-soul.vercel.app -> {json.dumps(body)[:400]}")