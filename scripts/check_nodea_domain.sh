#!/usr/bin/env bash
# Check domain availability/ownership for nodea.vercel.app
set -euo pipefail
cd ~/vana-soul
TOKEN=*** '^VERCEL_TOKEN=*** .env.local | cut -d= -f2)

echo "=== domain status nodea.vercel.app ==="
curl -s -H "Authorization: Bearer *** "https://api.vercel.com/v4/domains/status?name=nodea.vercel.app" | python3 -m json.tool 2>/dev/null | head -40

echo ""
echo "=== try add nodea.vercel.app to project ==="
curl -s -X POST -H "Authorization: Bearer *** -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/prj_QbXEc57jOofPxQbX3d9KdHVe7pOQ/domains?teamId=team_qzlAD1SVoR5cerz9JkbcT6eR" \
  -d '{"name":"nodea.vercel.app"}' | python3 -m json.tool 2>/dev/null | head -30
