-- CC-126 — proving Migration20261018120000_ai_agent_types on a real PostgreSQL 16,
-- and proving what the two CHECKs and the unique index actually enforce.
--
-- HOW TO RE-RUN (a proof that cannot be re-run is a claim) — from
-- `workspace/starting-kit`, with NODE=the repo's node24 toolchain
-- (`workspace/.toolchain/node24/node.exe`):
--
--   docker rm -f cc126-pg
--   docker run -d --name cc126-pg -e POSTGRES_PASSWORD=probe -e POSTGRES_DB=probe postgres:16-alpine
--   sleep 2
--   M=packages/ai-assistant/src/modules/ai_assistant/migrations/Migration20261018120000_ai_agent_types.ts
--   NODE=../.toolchain/node24/node.exe
--   $NODE --experimental-strip-types -e "
--     import('$PWD/$M').then(async m => {
--       const mig = new m.Migration20261018120000_ai_agent_types()
--       const out = []
--       mig.addSql = (sql) => out.push(sql.trim())
--       await mig[process.argv[1]]()
--       console.log(out.join('\n--;\n'))
--     })" up   > /tmp/mig_up.sql
--   $NODE --experimental-strip-types -e "
--     import('$PWD/$M').then(async m => {
--       const mig = new m.Migration20261018120000_ai_agent_types()
--       const out = []
--       mig.addSql = (sql) => out.push(sql.trim())
--       await mig[process.argv[1]]()
--       console.log(out.join('\n--;\n'))
--     })" down > /tmp/mig_down.sql
--   docker exec -i cc126-pg psql -U postgres -d probe < packages/ai-assistant/src/modules/ai_assistant/migrations/__probes__/ai_agent_types.probe.sql
--   echo $?   # must be 0
--   docker rm -f cc126-pg
--
-- Self-contained: no pre-shape (this migration creates the table), the REAL up()
-- SQL is extracted from the migration file (never hand-copied), the behaviour is
-- exercised, then down() and up() again.
--
-- Each case asserts its OWN outcome, so a regression in one is visible instead
-- of being averaged away.

\set ON_ERROR_STOP on

drop table if exists ai_agent_types cascade;

-- ═══ PHASE B: the migration's real up() ═════════════════════════════════════
\i /tmp/mig_up.sql
select 'B1 columns after up()' as step, column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_name='ai_agent_types'
 order by ordinal_position;
select 'B2 indexes after up()' as step, indexname from pg_indexes
 where tablename='ai_agent_types' order by indexname;
select 'B3 constraints after up()' as step, conname, contype, convalidated from pg_constraint
 where conrelid='ai_agent_types'::regclass order by conname;

-- ═══ PHASE C: what it enforces ══════════════════════════════════════════════

-- C1 a valid row lands, and the defaults are what the runtime will read
insert into ai_agent_types (tenant_id, key, bundle, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', 'billing.assistant',
        '{"label":"Billing assistant","systemPrompt":"You are a billing assistant."}', now(), now());
select 'C1 defaults' as step, key, version, status, bundle->>'label' as label from ai_agent_types;

-- C2 the second spelling — the CC-103 dialect — must be unrepresentable
do $$ declare s text; m text; begin
  begin
    insert into ai_agent_types (tenant_id, key, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', 'Billing.Assistant', now(), now());
    raise exception 'C2 FAILED: the second spelling was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'C2 second spelling -> REFUSED % %', s, m;
  end;
end $$;

-- C3 a key with no dot is not in the dialect either
do $$ declare s text; m text; begin
  begin
    insert into ai_agent_types (tenant_id, key, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', 'billing', now(), now());
    raise exception 'C3 FAILED: a dotless key was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'C3 dotless key -> REFUSED % %', s, m;
  end;
end $$;

-- C4 an empty key
do $$ declare s text; begin
  begin
    insert into ai_agent_types (tenant_id, key, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', '', now(), now());
    raise exception 'C4 FAILED: an empty key was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate;
    raise notice 'C4 empty key -> REFUSED %', s;
  end;
end $$;

-- C5 ★ the retired key is never reusable — the unique index covers ALL rows
-- regardless of status, so a later definition cannot silently re-point every
-- binding written for the old one.
do $$ declare s text; m text; begin
  begin
    insert into ai_agent_types (tenant_id, key, status, version, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', 'billing.assistant', 'retired', 2, now(), now());
    raise exception 'C5 FAILED: a retired key was REUSED';
  exception when unique_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'C5 retired key reuse -> REFUSED % %', s, m;
  end;
end $$;

-- C6 a DIFFERENT key may be retired, and its version may advance — the
-- lifecycle is usable, it is the reuse that is closed
insert into ai_agent_types (tenant_id, key, status, version, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', 'billing.archivist', 'retired', 3, now(), now());
select 'C6 retired neighbour' as step, key, version, status from ai_agent_types where key='billing.archivist';

-- C7 a third spelling of the state — two spellings of one state is the SR-39 class
do $$ declare s text; m text; begin
  begin
    insert into ai_agent_types (tenant_id, key, status, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', 'billing.other', 'ACTIVE', now(), now());
    raise exception 'C7 FAILED: a third status spelling was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'C7 third status spelling -> REFUSED % %', s, m;
  end;
end $$;

-- C8 the same key in a DIFFERENT tenant is a different type — the index is
-- per-tenant, never global
insert into ai_agent_types (tenant_id, key, created_at, updated_at)
values ('22222222-2222-2222-2222-222222222222', 'billing.assistant', now(), now());
select 'C8 per-tenant' as step, key, count(*) as rows from ai_agent_types group by key order by key;

-- ═══ PHASE D: down() then up() again ════════════════════════════════════════
\i /tmp/mig_down.sql
select 'D1 after down()' as step, count(*) as remaining from pg_indexes where tablename='ai_agent_types';
\i /tmp/mig_up.sql
select 'D2 after up() again' as step, count(*) as rows from ai_agent_types;
select 'D3 constraints survive the round trip' as step, conname, contype from pg_constraint
 where conrelid='ai_agent_types'::regclass order by conname;
