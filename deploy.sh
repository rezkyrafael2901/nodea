#!/usr/bin/env bash
# Deploy Nodea to Vercel production
set -euo pipefail
cd ~/vana-soul
TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2)
npx vercel deploy --prod --yes --token "$TOKEN" 2>&1 | grep -E "Production|Aliased|Ready|Error" | head -5
