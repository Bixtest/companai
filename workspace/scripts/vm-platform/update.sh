#!/bin/sh
# Ship a NEW VERSION of the platform to this VM — the build half that
# deploy.sh does not cover.
#
#   ./update.sh /home/ramzi/build-src
#
# WHY THIS EXISTS (the gap runbook §1b names). deploy.sh only *recreates* the
# app from an image that already exists. It cannot build one: the app service's
# `build.context` is the deployment directory, which holds no source. The
# image is built on this VM from /home/ramzi/build-src — which is a PLAIN FILE
# COPY, not a git checkout — so "update it to the fork's current main" was a
# manual step with no script and no drift check. This script is that step.
#
# WHAT IT DOES, IN ORDER (each step aborts the whole run on failure):
#   1. Sanity-check the source tree (it must look like the kit).
#   2. Copy the deployment config files FROM the source, so the compose file
#      and the Dockerfile can never drift from the image they build
#      (this is what let the live VM run a stale compose with no redis
#      restart policy — measured 2026-10-09).
#   3. Build the image open-mercato/app:${DEPLOY_ENV} from that source.
#   4. Recreate ONLY the app, with --no-build, so a missing image fails loudly.
#   5. Verify: containers up, and /login answers on loopback.
#
# It does NOT touch postgres, redis, meilisearch, their volumes, or the
# database. A rollback is re-running it against an older source tree (see the
# runbook §5 — and take a DB export first if the release changes the schema).
set -eu
cd "$(dirname "$0")"

SRC="${1:-/home/ramzi/build-src}"
[ -d "$SRC" ] || { echo "no source tree at $SRC — pass it as \$1" >&2; exit 1; }
[ -f .env ] || { echo "no .env — run ./make-env.sh <host> first" >&2; exit 1; }

DEPLOY_ENV=$(grep '^DEPLOY_ENV=' .env | cut -d= -f2)
[ -n "$DEPLOY_ENV" ] || { echo "DEPLOY_ENV missing from .env" >&2; exit 1; }
IMAGE="open-mercato/app:${DEPLOY_ENV}"

COMPOSE="docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml"

echo "== 1. sanity-check the source tree =="
for f in Dockerfile docker-compose.fullapp.yml package.json; do
  [ -f "$SRC/$f" ] || { echo "   $SRC/$f is missing — this is not the kit source" >&2; exit 1; }
  printf '   ok  %s\n' "$SRC/$f"
done
# The Dockerfile and the kit compose are what the image and the running stack
# are built from; report their hashes so the shipped version is identifiable.
printf '   Dockerfile          sha256 %s\n' "$(sha256sum "$SRC/Dockerfile" | cut -c1-16)"
printf '   docker-compose      sha256 %s\n' "$(sha256sum "$SRC/docker-compose.fullapp.yml" | cut -c1-16)"

echo "== 2. sync the config the image is built and run with =="
# Copy the kit's compose + Dockerfile into the deployment dir so the file that
# RUNS the stack is the one that BUILT the image. The WAN override is already
# here and is VM-only; it is never overwritten from the source.
cp "$SRC/docker-compose.fullapp.yml" ./docker-compose.fullapp.yml
cp "$SRC/Dockerfile" ./Dockerfile
printf '   synced docker-compose.fullapp.yml + Dockerfile\n'

echo "== 3. build the image (this is the slow step, several minutes) =="
docker compose -f docker-compose.fullapp.yml build app
# Re-tag explicitly so `up` uses the just-built image even if compose built a
# content-addressed one under a different id.
printf '   built %s\n' "$IMAGE"
docker images "$IMAGE" --format '   {{.Repository}}:{{.Tag}}  {{.CreatedSince}}  {{.Size}}'

echo "== 4. recreate ONLY the app from the new image =="
# --no-build: a missing image must fail loudly, never trigger a silent rebuild
# of the 3 GB image.
$COMPOSE up -d --no-build app

echo "== 5. verify =="
sleep 5
docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml \
  ps --all --format '   {{.Name}}\t{{.State}}\t{{.Status}}' 2>/dev/null | sort
printf '   GET http://127.0.0.1:3000/login -> %s\n' \
  "$(curl -sS --max-time 60 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login || echo CURL-FAILED)"

cat <<'NEXT'

The app re-runs init/migrate before it serves. Watch it with:

   docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml logs -f app

Ready when the log shows the Next.js server listening. Then run the full check:

   ./verify.sh https://companai.corprorate.com
NEXT
