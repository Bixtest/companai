#!/usr/bin/env bash
# READ-ONLY probe 5: nav assembly + the agents page (kernel object vs runtime client) + page.meta placement of key screens.
set -u
IMG="open-mercato/app:wan"
CORE="/app/packages/core/src/modules"

echo "=== 1. how the backend nav is assembled (which meta fields drive placement) ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -rln 'pageContext' /app/packages/shared/src /app/apps/mercato/src 2>/dev/null | head -20"

echo
echo "=== 2. page.meta of every settings screen (context + group + features) — one line each ==="
docker run --rm --entrypoint sh "$IMG" -c "for f in \$(find $CORE -path '*backend*' -name 'page.meta.ts' 2>/dev/null); do echo \"--- \$f\"; grep -E \"pageGroup:|pageContext:|requireFeatures:|pageTitle:\" \$f | head -5; done" 2>/dev/null | head -120

echo
echo "=== 3. the agents page: what does it import/render? ==="
docker run --rm --entrypoint sh "$IMG" -c "find /app/packages -path '*ai-assistant*agents*' -name 'page.tsx' 2>/dev/null; echo '--- imports ---'; for f in \$(find /app/packages -path '*ai-assistant*agents*' -name 'page.tsx' 2>/dev/null | head -3); do echo \"== \$f\"; grep -nE '^import|client|Agent' \$f | head -15; done" 2>/dev/null

echo
echo "=== 4. does anything render the CORE_OBJECT 'agent' (kernel) in a UI? ==="
docker run --rm --entrypoint sh "$IMG" -c "grep -rln 'CORE_OBJECT_KINDS\|core-objects' /app/packages/*/src/modules 2>/dev/null | head -20"

echo
echo "=== 5. sidebar-customization page + nav source ==="
docker run --rm --entrypoint sh "$IMG" -c "find /app -path '*sidebar*' -name '*.ts*' 2>/dev/null | grep -v node_modules | grep -v dist | head -15"
echo "PROBE5_DONE"
