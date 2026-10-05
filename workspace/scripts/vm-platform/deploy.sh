#!/bin/sh
# Brings the platform up on this VM. Safe to re-run.
#
#   ./deploy.sh
#
# Only the four services the platform actually needs are started. The kit's
# compose file also defines opencode, mcp, model, hermes and localstack; those
# need images or model files this VM does not have. The app does not depend on
# any of them — its depends_on lists postgres, redis and meilisearch only.
set -eu
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml"

[ -f .env ] || { echo "no .env — run ./make-env.sh <host> first" >&2; exit 1; }

echo "== starting postgres, redis, meilisearch =="
# --no-build so a missing image fails loudly instead of triggering a rebuild of
# the 3 GB app image.
$COMPOSE up -d --no-build postgres redis meilisearch

echo "== waiting for the three to report healthy =="
for name in mercato-postgres-wan mercato-redis-wan mercato-meilisearch-wan; do
  status=missing
  for _ in $(seq 1 60); do
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$name" 2>/dev/null || echo missing)
    [ "$status" = healthy ] && break
    sleep 2
  done
  printf '   %-28s %s\n' "$name" "$status"
  [ "$status" = healthy ] || { echo "   -> $name never became healthy; check: $COMPOSE logs $name" >&2; exit 1; }
done

echo "== starting the app =="
$COMPOSE up -d --no-build app

cat <<'NEXT'

The app container now runs init/migrate before it serves anything. On the very
first boot that seeds the database and takes several minutes. Watch it with:

   docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml logs -f app

It is ready when that log shows the Next.js server listening. Then run:

   ./verify.sh
NEXT
