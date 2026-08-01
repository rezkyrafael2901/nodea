#!/usr/bin/env bash
# Update VANA_APP_URL env in Vercel production
set -euo pipefail
cd ~/vana-soul
TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2)
VALUE="https://nodea-app.vercel.app"

# Remove old then add new
echo "$VALUE" | npx vercel env rm VANA_APP_URL production --token "$TOKEN" --yes >/dev/null 2>&1 || true
echo "$VALUE" | npx vercel env add VANA_APP_URL production --token "$TOKEN" >/dev/null 2>&1
echo "VANA_APP_URL updated to $VALUE"
