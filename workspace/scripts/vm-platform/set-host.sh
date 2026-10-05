#!/bin/sh
# Points the platform at a different hostname — the real domain once DNS is
# set, or a fresh Cloudflare quick-tunnel hostname.
#
#   ./set-host.sh app.example.com
#
# Rewrites the six host-derived values in .env, then recreates the app
# container so the new Traefik rule and environment take effect. The database
# and its volumes are untouched.
set -eu
cd "$(dirname "$0")"

[ $# -eq 1 ] || { echo "usage: $0 <hostname>    e.g. $0 app.example.com" >&2; exit 1; }
HOST="$1"
[ -f .env ] || { echo "no .env — run ./make-env.sh <host> first" >&2; exit 1; }

cp .env .env.bak
sed -i \
  -e "s|^PLATFORM_HOST=.*|PLATFORM_HOST=${HOST}|" \
  -e "s|^PLATFORM_HOST_ALT=.*|PLATFORM_HOST_ALT=${HOST}|" \
  -e "s|^PLATFORM_PRIMARY_HOST=.*|PLATFORM_PRIMARY_HOST=${HOST}|" \
  -e "s|^PLATFORM_DOMAINS=.*|PLATFORM_DOMAINS=localhost,127.0.0.1,${HOST}|" \
  -e "s|^APP_URL=.*|APP_URL=https://${HOST}|" \
  -e "s|^APP_ALLOWED_ORIGINS=.*|APP_ALLOWED_ORIGINS=*.trycloudflare.com,${HOST}|" \
  .env

# `up -d` alone is a no-op when the service definition has not changed on
# disk, so force the recreation — the label values changed via .env.
docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml \
  up -d --no-build --force-recreate app

echo "platform now answers on ${HOST}"
echo "previous .env kept as .env.bak"
