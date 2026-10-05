#!/usr/bin/env bash
# Create a new "site in a directory" on this VM.
#
#   ./new-site.sh <site-name> <hostname>
#   ./new-site.sh myshop shop.example.com
#
# It makes /opt/sites/<site-name>/public, drops a proof page in it, writes a
# compose file that puts a PHP container on the `coolify` network with the right
# Traefik label, and starts it.  Then you upload your codebase into that public/
# directory.  Nothing needs rebuilding when you change the files.
#
# Remove a site with:   cd /opt/sites/<site-name> && docker compose down
# and then delete the directory.

set -euo pipefail

name="${1:-}"
host="${2:-}"
if [ -z "$name" ] || [ -z "$host" ]; then
  echo "usage: $0 <site-name> <hostname>" >&2
  exit 2
fi
if ! printf '%s' "$name" | grep -qE '^[a-z0-9][a-z0-9-]*$'; then
  echo "site-name must be lowercase letters, digits and dashes: $name" >&2
  exit 2
fi
if ! printf '%s' "$host" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9.-]*$'; then
  echo "hostname looks wrong: $host" >&2
  exit 2
fi

root="/opt/sites/$name"
if [ -e "$root" ]; then
  echo "already exists: $root" >&2
  exit 1
fi

mkdir -p "$root/public"

cat > "$root/public/index.php" <<'PHP'
<?php
// Proof page — replace this with your own codebase.
header('Content-Type: text/plain; charset=utf-8');
echo "PHP is running.\n";
echo "host header : " . ($_SERVER['HTTP_HOST'] ?? '(none)') . "\n";
echo "directory   : " . __DIR__ . "\n";
echo "php version : " . PHP_VERSION . "\n";
PHP

cat > "$root/docker-compose.yml" <<YAML
services:
  web:
    image: php:8.3-apache
    restart: unless-stopped
    volumes:
      - ./public:/var/www/html
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=coolify"
      - "traefik.http.routers.site-$name.entrypoints=http"
      - "traefik.http.routers.site-$name.rule=Host(\`$host\`)"
      - "traefik.http.services.site-$name.loadbalancer.server.port=80"

networks:
  coolify:
    external: true
YAML

cd "$root"
docker compose up -d

echo
echo "created : $root"
echo "web root: $root/public   <-- put your codebase here"
echo "serves  : http://$host/"
