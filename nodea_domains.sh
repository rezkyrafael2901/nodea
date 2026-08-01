#!/usr/bin/env bash
# Nodea domain management helper
set -euo pipefail
cd ~/vana-soul
TOKEN="$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2)"
PROJ="prj_QbXEc57jOofPxQbX3d9KdHVe7pOQ"
TEAM="team_qzlAD1SVoR5cerz9JkbcT6eR"
AUTH="Authorization: Bearer ${TOKEN}"
CT="Content-Type: application/json"

cmd="${1:-list}"

case "$cmd" in
  list)
    curl -s -H "$AUTH" "https://api.vercel.com/v9/projects/${PROJ}/domains?teamId=${TEAM}" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); [print(x['name'], 'verified='+str(x.get('verified')), x.get('gitBranch') or '') for x in d.get('domains',[])]"
    ;;
  add)
    name="$2"
    curl -s -X POST -H "$AUTH" -H "$CT" "https://api.vercel.com/v10/projects/${PROJ}/domains?teamId=${TEAM}" \
      -d "{\"name\":\"${name}.vercel.app\"}" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('code','SUCCESS') if 'error' in d else 'SUCCESS: '+d.get('name',''))"
    ;;
  rm)
    name="$2"
    curl -s -X DELETE -H "$AUTH" "https://api.vercel.com/v9/projects/${PROJ}/domains/${name}.vercel.app?teamId=${TEAM}" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('code','REMOVED') if 'error' in d else 'REMOVED')"
    ;;
  alias)
    url="$2"; name="$3"
    curl -s -X POST -H "$AUTH" -H "$CT" "https://api.vercel.com/v10/projects/${PROJ}/aliases?teamId=${TEAM}" \
      -d "{\"alias\":\"${name}.vercel.app\",\"deploymentId\":\"${url}\"}" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('code','ALIASED') if 'error' in d else 'ALIASED')"
    ;;
esac
