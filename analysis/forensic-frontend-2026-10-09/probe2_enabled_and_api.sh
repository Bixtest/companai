#!/usr/bin/env bash
# READ-ONLY probe 2: enabled modules (clean), the /api/structural-permissions vs /api/auth/... question,
# and the deployed page.meta for the key screens.
set -u
IMG="open-mercato/app:wan"
GEN="/app/apps/mercato/.mercato/generated"

echo "=== 1. enabled module ids (raw file) ==="
docker run --rm --entrypoint sh "$IMG" -c "cat $GEN/enabled-module-ids.generated.ts"

echo
echo "=== 2. what the registry says about the structural-permissions API path ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -n 'structural' $GEN/api-routes.generated.ts"
echo "--- and in backend-routes ---"
docker run --rm --entrypoint sh "$IMG" -c "grep -n 'structural' $GEN/backend-routes.generated.ts"

echo
echo "=== 3. the registered route for auth pages (is there an /api/auth/* prefix map?) ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -nE \"'/api/auth|\\\"/api/auth|api/auth\" $GEN/api-routes.generated.ts | head -20"

echo
echo "=== 4. pending-acts API registration (the D3 surface) ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -n 'pending' $GEN/api-routes.generated.ts | head -20"

echo
echo "=== 5. does a 'core-settings' / CORE_TIERS anything exist in the deployed app? ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -rl 'CORE_TIERS\|core-settings\|coreSettings' /app/packages /app/apps 2>/dev/null | head -20"

echo
echo "=== 6. agent as core-setting kind / core-object kind (AH-1 slices 1+2) landed? ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -rn \"'agent'\" /app/packages/shared/src 2>/dev/null | grep -i 'core\|kind' | head -20"
echo "PROBE2_DONE"
