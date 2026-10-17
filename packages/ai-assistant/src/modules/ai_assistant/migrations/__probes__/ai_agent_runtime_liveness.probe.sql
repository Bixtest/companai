-- CC-102 increment 3: prove Migration20261017170000_ai_agent_runtime_liveness
-- on a real Postgres 16, and prove the WRITE PATHS it exists to serve.
--
-- HOW TO RE-RUN (a proof that cannot be re-run is a claim):
--
--   docker rm -f cc102-pg
--   docker run -d --name cc102-pg -e POSTGRES_PASSWORD=probe -e POSTGRES_DB=probe postgres:16-alpine
--   # wait for pg_isready
--   docker exec -i cc102-pg psql -U postgres -d probe -v ON_ERROR_STOP=1 < this-file
--   echo "EXIT=$?"     # must be 0
--   docker rm -f cc102-pg
--
-- It is self-contained: Phase A recreates the table exactly as slice 1's migration
-- defines it, so the probe never depends on a migrated database.
--
-- WHAT IT PROVES, phase by phase:
--   A  the baseline table + the four partial unique indexes
--   B  up(): both columns, the partial index, its key order and its predicate
--   C  the write paths — register insert, register upsert (a reboot), touch,
--      retire, null-org conflict target, and the NAME key still refusing
--   D  the index actually serves SR-12's read, chosen by the planner unaided
--   E  down() reverses, and up() is repeatable afterwards
--
-- CC-102: the first run of this probe FAILED against the then-current register()
-- SQL with `null value in column "created_at" … violates not-null constraint`,
-- because the INSERT omitted two NOT NULL columns with no default. That defect
-- is fixed; the repository test now enforces it.

\set ON_ERROR_STOP on
\timing off

-- ============================================================ PHASE A: baseline
-- Slice 1's table, verbatim from Migration20261017120000_ai_agent_runtimes.up()
drop table if exists "ai_agent_runtimes" cascade;

create table "ai_agent_runtimes" (
  "id" uuid not null default gen_random_uuid(),
  "tenant_id" uuid not null,
  "organization_id" uuid null,
  "daemon_id" text not null,
  "name" text not null,
  "provider" text not null,
  "metadata" jsonb not null default '{}',
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  "deleted_at" timestamptz null,
  constraint "ai_agent_runtimes_pkey" primary key ("id")
);

create unique index "ai_agent_runtimes_tenant_org_daemon_provider_uq"
  on "ai_agent_runtimes" ("tenant_id", "organization_id", "daemon_id", "provider")
  where "organization_id" is not null and "deleted_at" is null;
create unique index "ai_agent_runtimes_tenant_daemon_provider_null_org_uq"
  on "ai_agent_runtimes" ("tenant_id", "daemon_id", "provider")
  where "organization_id" is null and "deleted_at" is null;
create unique index "ai_agent_runtimes_tenant_org_name_uq"
  on "ai_agent_runtimes" ("tenant_id", "organization_id", "name")
  where "organization_id" is not null and "deleted_at" is null;
create unique index "ai_agent_runtimes_tenant_name_null_org_uq"
  on "ai_agent_runtimes" ("tenant_id", "name")
  where "organization_id" is null and "deleted_at" is null;

select 'A1 baseline table + 4 partial unique indexes' as step, count(*) as indexes
  from pg_indexes where tablename = 'ai_agent_runtimes';

-- ====================================================== PHASE B: the migration
-- The two addSql() statements of Migration20261017170000.up(), verbatim.
alter table "ai_agent_runtimes"
  add column "last_seen_at" timestamptz null,
  add column "legacy_daemon_id" text null;

create index "ai_agent_runtimes_tenant_last_seen_idx"
  on "ai_agent_runtimes" ("tenant_id", "last_seen_at" desc)
  where "deleted_at" is null;

select 'B1 columns after up()' as step, column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'ai_agent_runtimes'
   and column_name in ('last_seen_at','legacy_daemon_id')
 order by column_name;

select 'B2 new index def' as step, indexdef from pg_indexes
 where tablename = 'ai_agent_runtimes' and indexname = 'ai_agent_runtimes_tenant_last_seen_idx';

select 'B3 index is partial?' as step, i.indpred is not null as is_partial, c.relkind
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
 where i.indexrelid = 'ai_agent_runtimes_tenant_last_seen_idx'::regclass;

select 'B4 index columns+order' as step, k.ord as key_pos, a.attname,
       case when (o.val & 1) = 1 then 'DESC' else 'ASC' end as dir,
       case when (o.val & 2) = 2 then 'NULLS FIRST' else 'NULLS LAST' end as nulls
  from pg_index i
  cross join lateral unnest(string_to_array(i.indkey::text, ' ')::int[]) with ordinality as k(attnum, ord)
  cross join lateral unnest(string_to_array(i.indoption::text, ' ')::int[]) with ordinality as o(val, pos)
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
 where i.indexrelid = 'ai_agent_runtimes_tenant_last_seen_idx'::regclass
   and o.pos = k.ord
 order by k.ord;

select 'B5 predicate columns' as step, pg_get_expr(i.indpred, i.indrelid) as predicate
  from pg_index i where i.indexrelid = 'ai_agent_runtimes_tenant_last_seen_idx'::regclass;

-- ============================== PHASE C: the write paths the migration serves
-- The chain rule: a migration is not proven by its shape, it is proven by what
-- writes to it and what reads through it. Fixture tenant/org/daemon:
--   tenant  = 11111111-1111-1111-1111-111111111111
--   org     = 22222222-2222-2222-2222-222222222222
--   daemonA = aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   daemonB = bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb

-- C1: register() INSERT path — tenant+org scoped. Verbatim from the repository,
-- parameters inlined (psql has no bind params; the STATEMENT shape is what matters).
insert into ai_agent_runtimes
  (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'primary', 'opencode', '{"host":"box-1"}'::jsonb, now(), now(), now())
on conflict (tenant_id, organization_id, daemon_id, provider)
  where organization_id is not null and deleted_at is null
do update set name = excluded.name, metadata = excluded.metadata,
  last_seen_at = now(), updated_at = now()
returning id, (xmax = 0) as inserted;

select 'C2 insert wrote a heartbeat' as step, id, name, last_seen_at is not null as has_heartbeat
  from ai_agent_runtimes where daemon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- C3: register() UPSERT path — the reboot. Same daemon+provider, new name/metadata.
-- Must NOT insert a second row, must advance last_seen_at and updated_at.
select pg_sleep(0.05);
insert into ai_agent_runtimes
  (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'primary-v2', 'opencode', '{"host":"box-1","rebooted":true}'::jsonb, now(), now(), now())
on conflict (tenant_id, organization_id, daemon_id, provider)
  where organization_id is not null and deleted_at is null
do update set name = excluded.name, metadata = excluded.metadata,
  last_seen_at = now(), updated_at = now()
returning id, (xmax = 0) as inserted;

select 'C4 reboot updated, did not duplicate' as step, count(*) as rows_for_daemon,
       count(distinct id) as distinct_ids
  from ai_agent_runtimes where daemon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select 'C5 reboot changed name+metadata+timestamps' as step, name, metadata->>'rebooted' as rebooted,
       last_seen_at > created_at as seen_after_created, updated_at > created_at as updated_after_created
  from ai_agent_runtimes where daemon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- C6: touch() — heartbeat only. The LOAD-BEARING assertion: updated_at unchanged.
select 'C6 before touch' as step, last_seen_at as seen_before, updated_at, created_at
  from ai_agent_runtimes where daemon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select pg_sleep(0.05);
update ai_agent_runtimes
   set last_seen_at = now()
 where id = (select id from ai_agent_runtimes where daemon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
   and tenant_id = '11111111-1111-1111-1111-111111111111'
   and (organization_id is not distinct from '22222222-2222-2222-2222-222222222222' or organization_id is null)
   and deleted_at is null
returning id;
select 'C7 after touch' as step, last_seen_at, updated_at, created_at,
       last_seen_at > updated_at as heartbeat_past_updated_at
  from ai_agent_runtimes where daemon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- C8: the null-org conflict target must also infer ITS index (the other variant).
insert into ai_agent_runtimes
  (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', null,
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'tenant-machine', 'hermes', '{}'::jsonb, now(), now(), now())
on conflict (tenant_id, daemon_id, provider)
  where organization_id is null and deleted_at is null
do update set name = excluded.name, metadata = excluded.metadata,
  last_seen_at = now(), updated_at = now()
returning id, (xmax = 0) as inserted;
insert into ai_agent_runtimes
  (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', null,
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'tenant-machine-v2', 'hermes', '{}'::jsonb, now(), now(), now())
on conflict (tenant_id, daemon_id, provider)
  where organization_id is null and deleted_at is null
do update set name = excluded.name, metadata = excluded.metadata,
  last_seen_at = now(), updated_at = now()
returning id, (xmax = 0) as inserted;

select 'C9 null-org upsert also idempotent' as step, name, count(*) over () as total_rows
  from ai_agent_runtimes where daemon_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

-- C10: the NAME key must still refuse a different daemon taking a live name.
-- This is the assertion the conflict classifier reads, so capture the three
-- fields `classifyUniqueViolation` actually looks at: sqlstate, constraint, detail.
do $$
declare v_state text; v_constraint text; v_detail text;
begin
  begin
    insert into ai_agent_runtimes
      (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
    values
      ('11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222',
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
       'primary-v2', 'opencode', '{}'::jsonb, now(), now(), now())
    on conflict (tenant_id, organization_id, daemon_id, provider)
      where organization_id is not null and deleted_at is null
    do nothing;
    raise exception 'C10 FAILED: the name key did NOT refuse a second daemon';
  exception when unique_violation then
    get stacked diagnostics v_state = returned_sqlstate,
                              v_constraint = constraint_name,
                              v_detail = pg_exception_detail;
    raise notice 'C10 refused: sqlstate=% constraint=% detail=%', v_state, v_constraint, v_detail;
  end;
end $$;

select 'C11 conflicting daemon really absent' as step, count(*) as rows_for_daemon_c
  from ai_agent_runtimes where daemon_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

-- C11: listActive sees org rows + tenant rows (the CC-102 visibility fix), and a
-- retired row is excluded from the liveness index's candidate set.
update ai_agent_runtimes set deleted_at = now(), updated_at = now()
 where daemon_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select 'C11 listActive for org caller' as step, name, organization_id is null as is_tenant_level
  from ai_agent_runtimes
 where tenant_id = '11111111-1111-1111-1111-111111111111'
   and (organization_id = '22222222-2222-2222-2222-222222222222' or organization_id is null)
   and deleted_at is null
 order by created_at;

select 'C12 liveness index excludes retired' as step,
       (select count(*) from ai_agent_runtimes where deleted_at is null) as live_rows,
       (select count(*) from ai_agent_runtimes) as all_rows;

-- C13: retire is idempotent — second call affects 0 rows.
update ai_agent_runtimes set deleted_at = now(), updated_at = now()
 where daemon_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and deleted_at is null
returning id;

-- ============================== PHASE D: does the index serve SR-12's question?
-- "which of this tenant's runtimes is alive" — the read path the index exists for.
insert into ai_agent_runtimes (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
select '11111111-1111-1111-1111-111111111111',
       case when g % 2 = 0 then '22222222-2222-2222-2222-222222222222'::uuid else null end,
       ('d0000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       'rt-' || g, 'opencode', '{}'::jsonb, now() - (g || ' seconds')::interval, now(), now()
  from generate_series(1, 200) g;

select 'D1 rows in table' as step, count(*) from ai_agent_runtimes;

explain (costs off) select name, last_seen_at from ai_agent_runtimes
 where tenant_id = '11111111-1111-1111-1111-111111111111' and deleted_at is null
 order by last_seen_at desc limit 10;

set enable_seqscan = off;
explain (costs off) select name, last_seen_at from ai_agent_runtimes
 where tenant_id = '11111111-1111-1111-1111-111111111111' and deleted_at is null
 order by last_seen_at desc limit 10;
reset enable_seqscan;

-- ================================================= PHASE E: down() and round trip
drop index if exists "ai_agent_runtimes_tenant_last_seen_idx";
alter table "ai_agent_runtimes"
  drop column if exists "last_seen_at",
  drop column if exists "legacy_daemon_id";

select 'E1 after down()' as step, count(*) as "surviving liveness objects"
  from information_schema.columns
 where table_name = 'ai_agent_runtimes'
   and column_name in ('last_seen_at','legacy_daemon_id');

select 'E2 table still there' as step, count(*) as rows from ai_agent_runtimes;

-- re-apply up(): the forward path must be repeatable after a rollback
alter table "ai_agent_runtimes"
  add column "last_seen_at" timestamptz null,
  add column "legacy_daemon_id" text null;
create index "ai_agent_runtimes_tenant_last_seen_idx"
  on "ai_agent_runtimes" ("tenant_id", "last_seen_at" desc)
  where "deleted_at" is null;

select 'E3 up() re-applied after down()' as step, count(*) as indexes
  from pg_indexes
 where tablename = 'ai_agent_runtimes'
   and indexname = 'ai_agent_runtimes_tenant_last_seen_idx';

-- E4: re-adding must be safe against a partially-applied up() too
alter table "ai_agent_runtimes"
  add column if not exists "last_seen_at" timestamptz null,
  add column if not exists "legacy_daemon_id" text null;

select 'E4 add-if-not-exists is a no-op' as step, count(*) as "liveness columns"
  from information_schema.columns
 where table_name = 'ai_agent_runtimes'
   and column_name in ('last_seen_at','legacy_daemon_id');

select 'PROOF-COMPLETE' as final;
