#!/usr/bin/env bash
# READ-ONLY probe 3: the "no visible difference" question.
# (a) is there a previous image to diff registries against?
# (b) live DB: what has actually been persisted by the new features?
set -u

echo "=== 1. images present (any prior tag to diff against?) ==="
docker images 'open-mercato/app' --format '{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}' 2>/dev/null
echo "--- dangling/other ---"
docker images --format '{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}' | grep -i 'mercato\|wan' | head -20

echo
echo "=== 2. running container env (DB target + key presence, no secrets printed) ==="
docker exec companai-platform-app-1 sh -c 'env | grep -E "^(DATABASE_URL|NODE_ENV|TENANT|LOOKUP_HASH_PEPPER)=" | sed -E "s/(:\/\/[^:]+:)[^@]+@/\1***@/; s/(PEPPER=).+/\1[set]/; s/(KEY=).+/\1[set]/"' 2>/dev/null

echo
echo "=== 3. DB: the tables that the 'done' features write to — row counts ==="
docker exec companai-platform-app-1 sh -c 'echo "SELECT '"'"'module_configs'"'"' t, count(*) FROM module_configs UNION ALL SELECT '"'"'role_acls'"'"', count(*) FROM role_acls UNION ALL SELECT '"'"'users'"'"', count(*) FROM users;" | psql "$DATABASE_URL" -t -A -F"|" 2>/dev/null || echo "psql-direct-failed"'

echo
echo "=== 4. DB: tables present matching authority / workflow / business_rule / agents ==="
docker exec companai-platform-app-1 sh -c 'echo "SELECT tablename FROM pg_tables WHERE schemaname='"'"'public'"'"' AND (tablename LIKE '"'"'%authority%'"'"' OR tablename LIKE '"'"'%pending%'"'"' OR tablename LIKE '"'"'%delegation%'"'"' OR tablename LIKE '"'"'%record_lock%'"'"' OR tablename LIKE '"'"'%workflow%'"'"' OR tablename LIKE '"'"'%business_rule%'"'"' OR tablename LIKE '"'"'%agent%'"'"' OR tablename LIKE '"'"'%module_config%'"'"') ORDER BY tablename;" | psql "$DATABASE_URL" -t -A 2>/dev/null || echo "psql-direct-failed"'
echo "PROBE3_DONE"
