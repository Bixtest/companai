#!/usr/bin/env bash
# READ-ONLY probe 6: log in as superadmin over HTTPS and fetch the ACTUAL nav payload.
# This is exactly what the sidebar renders on login.
set -u
BASE="https://companai.corprorate.com"
JAR=$(mktemp)
EMAIL="${1:?usage: probe6_nav.sh <email> <password>}"
PASS="${2:?usage: probe6_nav.sh <email> <password>}"

echo "=== login (form-encoded) ==="
CODE=$(curl -s -o /tmp/login.out -w '%{http_code}' -c "$JAR" \
  -X POST "$BASE/api/auth/login" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASS")
echo "login http=$CODE"
head -c 300 /tmp/login.out; echo

echo
echo "=== /api/admin/nav (the sidebar payload) ==="
curl -s -b "$JAR" "$BASE/api/admin/nav" -o /tmp/nav.json -w 'http=%{http_code}\n'
echo "bytes=$(wc -c </tmp/nav.json)"
echo "--- top-level group names ---"
python - <<'PY'
import json,sys
try:
    d=json.load(open('/tmp/nav.json'))
except Exception as e:
    print("not json:", e); print(open('/tmp/nav.json','rb').read()[:400]); sys.exit()
for k in ('groups','settingsSections','profileSections','settingsPathPrefixes','profilePathPrefixes'):
    v=d.get(k)
    if isinstance(v,list):
        print(f"{k}: {len(v)}")
        if k in ('groups','settingsSections','profileSections'):
            for g in v:
                items=g.get('items') if isinstance(g,dict) else None
                n=len(items) if isinstance(items,list) else '?'
                print(f"   - {g.get('name') or g.get('label')}  (items={n})")
print("grantedFeatures:", len(d.get('grantedFeatures') or []))
print("roles:", d.get('roles'))
PY
echo "PROBE6_DONE"
