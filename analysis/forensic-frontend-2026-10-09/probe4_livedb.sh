#!/usr/bin/env bash
# READ-ONLY probe 4: live DB via the postgres container.
set -u
PG="mercato-postgres-wan"
U="postgres"
DB="open-mercato"

q() { docker exec "$PG" psql -U "$U" -d "$DB" -t -A -F'|' -c "$1" 2>&1; }

echo "=== 1. module_configs (what the new settings screens have persisted) ==="
q "SELECT module_id, name, organization_id, tenant_id FROM module_configs ORDER BY module_id, name;"
echo "--- count ---"
q "SELECT count(*) FROM module_configs;"

echo
echo "=== 2. role_acls ==="
q "SELECT id, name, is_super_admin, jsonb_array_length(features_json::jsonb) AS feat_n FROM role_acls ORDER BY is_super_admin DESC, name;"

echo
echo "=== 3. users (identities only, no email plaintext) ==="
q "SELECT id, left(email_hash,12) AS email_hash_prefix, tenant_id, organization_id FROM users ORDER BY id;"

echo
echo "=== 4. tables matching the 'done' feature families ==="
q "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%authority%' OR tablename ILIKE '%pending%' OR tablename ILIKE '%delegation%' OR tablename ILIKE '%record_lock%' OR tablename ILIKE '%workflow%' OR tablename ILIKE '%business_rule%' OR tablename ILIKE '%agent%' OR tablename ILIKE '%module_config%' OR tablename ILIKE '%structural%') ORDER BY tablename;"

echo
echo "=== 5. row counts for the authority/agent/workflow tables found ==="
for T in $(q "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%authority%' OR tablename ILIKE '%pending%' OR tablename ILIKE '%delegation%' OR tablename ILIKE '%record_lock%' OR tablename ILIKE '%workflow%' OR tablename ILIKE '%business_rule%' OR tablename ILIKE '%agent%') ORDER BY tablename;" | tr -d '\r'); do
  C=$(q "SELECT count(*) FROM \"$T\";")
  echo "  $T = $C"
done
echo "PROBE4_DONE"
