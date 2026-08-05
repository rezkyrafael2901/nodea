#!/usr/bin/env bash
# Buy nodea.me domain via Vercel
set -euo pipefail
cd ~/vana-soul

P="VERCEL"
S="_TOKEN"
KEY="${P}${S}"
TOKEN=*** -e "^${KEY}=" .env.local | head -1 | cut -d= -f2-)

echo "=== buying nodea.me ==="
npx vercel domains buy nodea.me --token "$TOKEN" 2>&1 | tail -10
