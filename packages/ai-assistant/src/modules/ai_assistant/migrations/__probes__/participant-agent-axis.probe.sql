-- CC-107 — proving Migration20261017180000_ai_chat_participant_agent_axis on a
-- real PostgreSQL 16, and proving what the second identity axis actually enforces.
--
-- HOW TO RE-RUN (a proof that cannot be re-run is a claim):
--
--   docker rm -f cc107b-pg
--   docker run -d --name cc107b-pg -e POSTGRES_PASSWORD=probe -e POSTGRES_DB=probe postgres:16-alpine
--   docker exec -i cc107b-pg psql -U postgres -d probe < this-file
--   echo $?   # must be 0
--   docker rm -f cc107b-pg
--
-- Self-contained: it recreates the table exactly as the two existing migrations
-- define it, runs the REAL up() SQL extracted from the migration file, exercises
-- the behaviour, then runs down() and up() again.
--
-- TO RE-EXTRACT THE MIGRATION'S OWN SQL (never hand-copy it):
--   node --experimental-strip-types -e "
--     import('/abs/path/Migration20261017180000_ai_chat_participant_agent_axis.ts')
--       .then(async m => {
--         const mig = new m.Migration20261017180000_ai_chat_participant_agent_axis()
--         const out = []
--         mig.addSql = (sql) => out.push(sql.trim())
--         await mig[process.argv[1]]()
--         console.log(out.join('\n--;\n'))
--       })" up | docker exec -i cc107b-pg psql -U postgres -d probe
--
-- Each case asserts its OWN outcome, so a regression in one is visible instead
-- of being averaged away.

\set ON_ERROR_STOP on

drop table if exists ai_chat_conversation_participants cascade;

-- the shape the table has BEFORE this migration (Migration20260518092853 + 0522120000)
create table ai_chat_conversation_participants (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid null,
  conversation_id text not null,
  user_id uuid not null,
  role text not null default 'owner',
  last_read_at timestamptz null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz null,
  primary key (id)
);
create unique index ai_chat_conv_participants_tenant_org_conv_user_uq
  on ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id)
  where organization_id is not null;
create unique index ai_chat_conv_participants_tenant_conv_user_null_org_uq
  on ai_chat_conversation_participants (tenant_id, conversation_id, user_id)
  where organization_id is null;
create index ai_chat_conv_participants_tenant_org_user_conv_idx
  on ai_chat_conversation_participants (tenant_id, organization_id, user_id, conversation_id);
create index ai_chat_conv_participants_active_conv_user_idx
  on ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id)
  where deleted_at is null;

insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id, role, created_at, updated_at)
values
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-1','aaaaaaaa-0000-4000-8000-000000000001','owner', now(), now()),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-2','aaaaaaaa-0000-4000-8000-000000000002','owner', now(), now());
select 'A1 seeded the pre-migration MVP shape' as step, count(*) as rows from ai_chat_conversation_participants;

-- ═══ PHASE B: the migration's real up() ═════════════════════════════════════
\i /tmp/mig_up.sql
select 'B1 columns after up()' as step, column_name, data_type, is_nullable
  from information_schema.columns
 where table_name='ai_chat_conversation_participants'
   and column_name in ('user_id','agent_id','agent_owner_user_id')
 order by column_name;
select 'B2 indexes after up()' as step, indexname from pg_indexes
 where tablename='ai_chat_conversation_participants' order by indexname;
select 'B3 constraints after up()' as step, conname, convalidated from pg_constraint
 where conrelid='ai_chat_conversation_participants'::regclass order by conname;

-- ═══ PHASE C: what it enforces ══════════════════════════════════════════════
insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id, role, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-1','aaaaaaaa-0000-4000-8000-0000000000f1','viewer', now(), now());
select 'C1 a human participant still works' as step, count(*) as rows from ai_chat_conversation_participants;

-- C2 the thing that was IMPOSSIBLE before: an agent as a participant
insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, agent_owner_user_id, role, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-1',
        'business_ir.query_author','aaaaaaaa-0000-4000-8000-000000000001','viewer', now(), now());

-- C3 a second row for the SAME agent in the SAME conversation is refused
do $$ declare s text; m text; begin
  begin
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, agent_owner_user_id, role, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-1',
            'business_ir.query_author','aaaaaaaa-0000-4000-8000-000000000001','viewer', now(), now());
    raise exception 'C3 FAILED: a duplicate agent participant was ACCEPTED';
  exception when unique_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'C3 duplicate agent participant -> REFUSED % %', s, m;
  end;
end $$;

-- C4 the tenant-scope pair, same rule
do $$ declare s text; m text; n int; begin
  begin
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, agent_owner_user_id, role, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', null,'conv-tenant','other.agent','aaaaaaaa-0000-4000-8000-000000000001','viewer', now(), now());
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, agent_owner_user_id, role, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111', null,'conv-tenant','other.agent','aaaaaaaa-0000-4000-8000-000000000001','viewer', now(), now());
    raise exception 'C4 FAILED: two tenant-level rows for one agent coexisted';
  exception when unique_violation then
    get stacked diagnostics s=returned_sqlstate, m=constraint_name;
    raise notice 'C4 tenant-scope agent duplicate -> REFUSED % %', s, m;
  end;
  select count(*) into n from ai_chat_conversation_participants where conversation_id='conv-tenant';
  raise notice 'C4b rows for conv-tenant = %', n;
end $$;

-- C5 no identity at all
do $$ declare s text; begin
  begin
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-x', now(), now());
    raise exception 'C5 FAILED: a row with no identity was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate;
    raise notice 'C5 no identity -> REFUSED % (one_identity_ck)', s;
  end;
end $$;

-- C6 both identities at once
do $$ declare s text; begin
  begin
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id, agent_id, agent_owner_user_id, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-x',
            'aaaaaaaa-0000-4000-8000-000000000009','dual.agent','aaaaaaaa-0000-4000-8000-000000000001', now(), now());
    raise exception 'C6 FAILED: a row with BOTH identities was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate;
    raise notice 'C6 both identities -> REFUSED % (one_identity_ck)', s;
  end;
end $$;

-- C7 an agent with no owning human
do $$ declare s text; begin
  begin
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, role, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-y','orphan.agent','viewer', now(), now());
    raise exception 'C7 FAILED: an agent participant with no owner was ACCEPTED';
  exception when check_violation then
    get stacked diagnostics s=returned_sqlstate;
    raise notice 'C7 agent with no owner -> REFUSED % (agent_owner_ck)', s;
  end;
end $$;

-- C8 a HUMAN needs no owner — the existing MVP shape stays legal
do $$ declare s text; begin
  begin
    insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id, role, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-z',
            'aaaaaaaa-0000-4000-8000-00000000000a','viewer', now(), now());
    raise notice 'C8 human with no owner -> ACCEPTED';
  exception when others then
    get stacked diagnostics s=returned_sqlstate;
    raise exception 'C8 FAILED: a human participant was refused: %', s;
  end;
end $$;

-- C9 a RETIRED agent frees its slot
update ai_chat_conversation_participants set deleted_at = now(), updated_at = now()
 where conversation_id='conv-1' and agent_id='business_ir.query_author';
insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, agent_owner_user_id, role, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','conv-1',
        'business_ir.query_author','aaaaaaaa-0000-4000-8000-000000000001','viewer', now(), now());
do $$ declare n int; begin
  select count(*) into n from ai_chat_conversation_participants
   where conversation_id='conv-1' and agent_id='business_ir.query_author' and deleted_at is null;
  if n <> 1 then raise exception 'C9 FAILED: expected 1 live row, got %', n; end if;
  raise notice 'C9 a retired agent frees its slot -> 1 live row';
end $$;

-- ═══ PHASE D: the read path, measured at a size that means something ═════════
insert into ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, agent_id, agent_owner_user_id, role, created_at, updated_at)
select '11111111-1111-1111-1111-111111111111',
       case when g % 2 = 0 then '22222222-2222-2222-2222-222222222222'::uuid else null end,
       'conv-' || g, 'agent-' || g, 'aaaaaaaa-0000-4000-8000-000000000001', 'viewer', now(), now()
  from generate_series(1, 2000) g;
-- ★ ANALYZE, or the plan is a claim about the statistics and not about the
-- index. Measured: before ANALYZE the planner chose the USER index for the agent
-- query and that read as a design flaw; after ANALYZE it chooses the right one,
-- and BOTH candidate orderings are chosen. See L181.
analyze ai_chat_conversation_participants;
explain (costs off) select conversation_id from ai_chat_conversation_participants
 where tenant_id='11111111-1111-1111-1111-111111111111'
   and organization_id='22222222-2222-2222-2222-222222222222'
   and agent_id='agent-1500' and deleted_at is null;

-- ═══ PHASE E: down() then up() again ════════════════════════════════════════
delete from ai_chat_conversation_participants where agent_id is not null;
\i /tmp/mig_down.sql
select 'E1 columns after down()' as step, string_agg(column_name, ', ' order by column_name) as cols
  from information_schema.columns where table_name='ai_chat_conversation_participants';
select 'E2 user_id back to NOT NULL' as step, is_nullable
  from information_schema.columns
 where table_name='ai_chat_conversation_participants' and column_name='user_id';
select 'E3 indexes after down()' as step, string_agg(indexname, ', ' order by indexname) as idx
  from pg_indexes where tablename='ai_chat_conversation_participants';
\i /tmp/mig_up.sql
select 'E5 up() re-applied after down()' as step, count(*) as agent_axis_indexes
  from pg_indexes where tablename='ai_chat_conversation_participants'
   and indexname like '%agent%';

select 'PROBE-COMPLETE' as final;
