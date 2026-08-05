#!/usr/bin/env python3
"""List Vercel project domains + check what the URLs serve."""
import json
import os
import re
import subprocess
import urllib.request

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

def api(path):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}",
        headers={"Authorization": "Bearer " + token},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

PROJ = "prj_QbXEc57jOofPxQbX3d9KdHVe7pOQ"

print("=== project domains ===")
code, body = api(f"/v10/projects/{PROJ}/domains")
if code == 200:
    for d in body.get("domains", []):
        print(json.dumps(d, indent=1))
else:
    print(code, json.dumps(body)[:500])

print("\n=== URL checks (HTTP status + title) ===")
for url in [
    "https://vana-soul.vercel.app",
    "https://nodea-app.vercel.app",
    "https://getnodea.vercel.app",
]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "curl/8"})
        with urllib.request.urlopen(req, timeout=30) as r:
            html = r.read(5000).decode("utf-8", "ignore")
            title = re.search(r"<title[^>]*>(.*?)</title>", html, re.I)
            print(f"{url} -> {r.status} | title: {title.group(1) if title else 'n/a'}")
    except Exception as e:
        print(f"{url} -> ERR {e}")
