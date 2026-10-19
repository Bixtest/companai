-- CC-128 — proving the capability ceiling's two migrations on a real PostgreSQL 16.
--
-- HOW TO RE-RUN (a proof that cannot be re-run is a claim):
--
--   docker rm -f cc128-pg
--   docker run -d --name cc128-pg -e POSTGRES_PASSWORD=probe -e POSTGRES_DB=probe postgres:16-alpine
--   # extract each migration's OWN SQL (never hand-copy it):
--   for m in directory/migrations/Migration20261019070000_directory auth/migrations/Migration20261019071000; do
--     for k in up down; do
--       node --experimental-strip-types -e "
--         const p='C:/…/packages/core/src/modules/'+process.argv[1]+'.ts'
--         import('file://'+p).then(async mod=>{
--           const n=Object.keys(mod).find(k=>k.startsWith('Migration'))
--           const mig=new mod[n](); const out=[]; mig.addSql=s=>out.push(s.trim())
--           await mig[process.argv[2]](); console.log(out.join('\n--;\n'))
--         })" "$m" "$k" > /tmp/$(basename $m | cut -c1-30)_$k.sql
--     done
--   done
--   # then this file, with those four paths as /tmp/d_up.sql, /tmp/a_up.sql,
--   # /tmp/a_down.sql, /tmp/d_down.sql
--   docker exec -i cc128-pg psql -U postgres -d probe < this-file
--   echo $?   # must be 0
--   docker rm -f cc128-pg
--
-- WHAT IT PROVES, and each case asserts its own outcome so a regression in one is visible:
--   A  the pre-migration shape
--   B  both up()s: is_foundational boolean NOT NULL default false; the ceiling's six
--      columns and four indexes
--   C  at most ONE foundational tenant (partial unique), and any number of false rows
--   D  the two ceiling uniques — platform scope and tenant scope — and that a retired
--      row frees its slot
--   E  the subset rule is ONE `NOT EXISTS` query, which is why the ceiling is rows
--      rather than a JSON array
--   F  down() then up() again, cleanly
--
-- ★ E is the case that justifies the table's shape. If the subset rule ever needs a
--   parse, a set difference and a guess about an empty array, the design was wrong.

\set ON_ERROR_STOP on

-- ═══ A: the shape before the migrations ═════════════════════════════════════
drop table if exists tenant_capability_ceilings cascade;
drop table if exists tenants cascade;
create table tenants (
  id uuid not null default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz null,
  primary key (id)
);
insert into tenants (name, created_at, updated_at) values ('foundation', now(), now()), ('acme', now(), now());
select 'A1 seeded two tenants' as step, count(*) as rows from tenants;

-- ═══ B: both migrations' real up() ══════════════════════════════════════════
\i /tmp/d_up.sql
\i /tmp/a_up.sql
select 'B1 tenants gained is_foundational' as step, column_name, data_type, is_nullable, column_default
  from information_schema.columns where table_name='tenants' and column_name='is_foundational';
select 'B2 ceiling columns' as step, string_agg(column_name || ':' || data_type, ', ' order by ordinal_position) as cols
  from information_schema.columns where table_name='tenant_capability_ceilings';
select 'B3 ceiling indexes' as step, string_agg(indexname, ', ' order by indexname) as idx
  from pg_indexes where tablename='tenant_capability_ceilings';

-- ═══ C: at most ONE foundational tenant ═════════════════════════════════════
update tenants set is_foundational = true where name = 'foundation';
select 'C1 one foundational tenant' as step, count(*) as n from tenants where is_foundational;
do $$ declare s text; begin
  begin
    update tenants set is_foundational = true where name = 'acme';
    raise exception 'C2 FAILED: a SECOND foundational tenant was accepted';
  exception when unique_violation then
    get stacked diagnostics s = returned_sqlstate;
    raise notice 'C2 second foundational tenant -> REFUSED % (tenants_one_foundational_uq)', s;
  end;
end $$;
-- and the index is partial: any number of false rows is fine
select 'C3 many non-foundational rows are fine' as step, count(*) as n from tenants where not is_foundational;

-- ═══ D: the ceiling's two uniques ═══════════════════════════════════════════
insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
values (null, 'ai_assistant.view', now(), now());
insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
select id, 'ai_assistant.view', now(), now() from tenants where name = 'acme';

do $$ declare s text; m text; begin
  begin
    insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
    values (null, 'ai_assistant.view', now(), now());
    raise exception 'D1 FAILED: a duplicate PLATFORM capability was accepted';
  exception when unique_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'D1 duplicate platform capability -> REFUSED % %', s, m;
  end;
  begin
    insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
    select id, 'ai_assistant.view', now(), now() from tenants where name = 'acme';
    raise exception 'D2 FAILED: a duplicate TENANT capability was accepted';
  exception when unique_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'D2 duplicate tenant capability -> REFUSED % %', s, m;
  end;
end $$;

-- D3: the same capability in BOTH scopes is legal — they are different rows
select 'D3 platform + tenant rows coexist' as step, count(*) as n from tenant_capability_ceilings;

-- D4: a retired row frees its slot
update tenant_capability_ceilings set deleted_at = now(), updated_at = now()
 where tenant_id is null and capability = 'ai_assistant.view';
insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
values (null, 'ai_assistant.view', now(), now());
select 'D4 retired row frees its slot' as step, count(*) as live
  from tenant_capability_ceilings where tenant_id is null and capability='ai_assistant.view' and deleted_at is null;

-- ═══ E: the subset rule IS a query (why rows, not a JSON array) ═════════════
insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
values (null, 'ai_assistant.settings.manage', now(), now());
insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
select id, 'ai_assistant.settings.manage', now(), now() from tenants where name='acme';

-- acme names a capability the PLATFORM does not have -> the subset check must find it
insert into tenant_capability_ceilings (tenant_id, capability, created_at, updated_at)
select id, 'not.on.the.platform', now(), now() from tenants where name='acme';
do $$ declare n int; begin
  select count(*) into n
    from tenant_capability_ceilings t
   where t.tenant_id = (select id from tenants where name='acme')
     and t.deleted_at is null
     and not exists (
       select 1 from tenant_capability_ceilings p
        where p.tenant_id is null and p.deleted_at is null and p.capability = t.capability
     );
  if n <> 1 then raise exception 'E1 FAILED: expected exactly 1 capability outside the platform ceiling, got %', n; end if;
  raise notice 'E1 the subset rule is one NOT EXISTS query -> % offending capability', n;
end $$;

-- ═══ F: down() then up() again ══════════════════════════════════════════════
\i /tmp/a_down.sql
\i /tmp/d_down.sql
select 'F1 ceiling table gone' as step, count(*) as n
  from information_schema.tables where table_name='tenant_capability_ceilings';
select 'F2 is_foundational gone' as step, count(*) as n
  from information_schema.columns where table_name='tenants' and column_name='is_foundational';
select 'F3 tenants survived' as step, count(*) as n from tenants;
\i /tmp/d_up.sql
\i /tmp/a_up.sql
select 'F4 up() re-applied after down()' as step,
       (select count(*) from pg_indexes where indexname like 'tenant_capability_ceilings%') as ceiling_idx,
       (select count(*) from pg_indexes where indexname='tenants_one_foundational_uq') as foundational_idx;

select 'PROBE-COMPLETE' as final;
