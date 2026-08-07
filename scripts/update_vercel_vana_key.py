#!/usr/bin/env python3
"""Update Vercel production env VANA_APP_PRIVATE_KEY to the new wallet key."""
import re
import subprocess
import sys

ENV = ".env.local"
NEW_PK = "0x279ef9f283de910d30d3648d695e72f18a2ae0dec938e27cdd336ba77fd4e6c0"

k = open(ENV).read()
m = re.search(r"^VERCEL_TOKEN=(\S+)", k, re.M)
if not m:
    print("VERCEL_TOKEN not found in .env.local")
    sys.exit(1)
tok = m.group(1)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    out = (r.stdout + r.stderr).strip()
    print(out.splitlines()[-1] if out else f"exit {r.returncode}")
    return r.returncode

print("== rm old ==")
run(["npx", "vercel", "env", "rm", "VANA_APP_PRIVATE_KEY", "production",
     "--token", tok, "--yes"])
print("== add new ==")
p = subprocess.Popen(["npx", "vercel", "env", "add", "VANA_APP_PRIVATE_KEY",
                      "production", "--token", tok],
                     stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                     stderr=subprocess.STDOUT, text=True)
out, _ = p.communicate(input=NEW_PK + "\n", timeout=120)
print(out.strip().splitlines()[-1] if out.strip() else f"exit {p.returncode}")
print("DONE")
