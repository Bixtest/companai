#!/usr/bin/env bash
# READ-ONLY probe: what is in the DEPLOYED generated registry (inside the running image).
# No repo edits. Outputs a machine-checkable inventory.
set -u
IMG="open-mercato/app:wan"
GEN_DIR="/app/apps/mercato/.mercato/generated"

echo "=== 0. image + timestamp of the deployed registry ==="
docker image inspect "$IMG" --format '{{.Id}} {{.Created}}' 2>/dev/null
docker run --rm --entrypoint sh "$IMG" -c "ls -la $GEN_DIR/*.generated.ts | head -40" 2>/dev/null

echo
echo "=== 1. enabled module ids (the gate) ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -oE \"'[a-z_]+'\" $GEN_DIR/enabled-module-ids.generated.ts | tr -d \\\"'\\\" | sort -u" 2>/dev/null

echo
echo "=== 2. every backend page path in the deployed registry ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -oE '/backend/[a-zA-Z0-9_./-]+' $GEN_DIR/backend-routes.generated.ts | sort -u" 2>/dev/null

echo
echo "=== 3. every API path in the deployed registry ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -oE '/(api|backend)/[a-zA-Z0-9_./:-]+' $GEN_DIR/api-routes.generated.ts | sort -u" 2>/dev/null

echo
echo "=== 4. inbox-actions registry (claimed ZERO) ==="
docker run --rm --entrypoint sh "$IMG" -c "cat $GEN_DIR/inbox-actions.generated.ts 2>/dev/null | head -40; echo '---file list---'; ls $GEN_DIR/" 2>/dev/null

echo
echo "=== 5. targeted greps: is each 'done' feature registered? ==="
for K in structural core-settings core_settings pending_acts pending-acts approvals agent agents workflow business_rule ai_assistant authority record-lock projects; do
  N=$(docker run --rm --entrypoint sh "$IMG" -c "grep -c '$K' $GEN_DIR/backend-routes.generated.ts 2>/dev/null" 2>/dev/null)
  A=$(docker run --rm --entrypoint sh "$IMG" -c "grep -c '$K' $GEN_DIR/api-routes.generated.ts 2>/dev/null" 2>/dev/null)
  echo "  $K : backend-routes=$N  api-routes=$A"
done
echo "PROBE1_DONE"
