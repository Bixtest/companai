#!/bin/sh
# Prints the evidence that the platform is actually serving — on the VM's
# loopback, through the proxy, and (if you pass a URL) from the public internet.
#
#   ./verify.sh                                  # local only
#   ./verify.sh https://xxxx.trycloudflare.com   # local + public
#
# Every line is raw output, not a summary, so the numbers can be checked.
set -eu
cd "$(dirname "$0")"

PUBLIC_URL="${1:-}"

command -v curl >/dev/null 2>&1 || { echo "this script needs curl" >&2; exit 1; }
[ -f .env ] || { echo "no .env" >&2; exit 1; }
HOST=$(grep '^PLATFORM_HOST=' .env | cut -d= -f2)

# curl writes the status and byte count to stdout, the body to a file, so the
# body can be inspected without also being dumped on screen.
get() { # get <url> [host-header]
  if [ -n "${2:-}" ]; then
    curl -sS --max-time 60 -o /tmp/v.body -w '%{http_code} %{size_download}' -H "Host: $2" "$1" || echo "CURL-FAILED"
  else
    curl -sS --max-time 60 -o /tmp/v.body -w '%{http_code} %{size_download}' "$1" || echo "CURL-FAILED"
  fi
}
title() { grep -o '<title>[^<]*</title>' /tmp/v.body 2>/dev/null | head -1; }

echo "== containers =="
# Use the compose project rather than a name filter: the app container is named
# after the directory (companai-platform-app-1) and does not start with
# mercato-, so a `--filter name=mercato-` would silently hide it.
docker compose -f docker-compose.fullapp.yml -f docker-compose.wan.yml \
  ps --all --format '{{.Name}}\t{{.State}}\t{{.Status}}' 2>/dev/null | sort

echo
echo "== 1. the app answers on the VM's own loopback =="
printf '   GET http://127.0.0.1:3000/login -> %s bytes\n' "$(get http://127.0.0.1:3000/login)"
printf '   title: %s\n' "$(title)"

echo
echo "== 2. the proxy routes the platform hostname to the app =="
printf '   GET http://127.0.0.1/  Host: %s -> %s bytes\n' "$HOST" "$(get http://127.0.0.1/ "$HOST")"
printf '   title: %s\n' "$(title)"

echo
echo "== 3. the database behind it =="
docker exec mercato-postgres-wan psql -U postgres -d open-mercato -tAc \
  "select 'tables=' || count(*) from information_schema.tables where table_schema='public';" 2>&1
docker exec mercato-postgres-wan psql -U postgres -d open-mercato -tAc \
  "select 'users=' || count(*) from users;" 2>&1
docker exec mercato-postgres-wan psql -U postgres -d open-mercato -tAc \
  "select 'database=' || current_database();" 2>&1

if [ -n "$PUBLIC_URL" ]; then
  echo
  echo "== 4. from the public internet =="
  printf '   GET %s/login -> %s bytes\n' "$PUBLIC_URL" "$(get "${PUBLIC_URL%/}/login")"
  printf '   title: %s\n' "$(title)"
fi
