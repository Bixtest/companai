-- CC-107 §3.1 — why `auth.sub` must not be used as a conversation's user id.
--
-- HOW TO RE-RUN (a proof that cannot be re-run is a claim):
--
--   docker rm -f cc107-pg
--   docker run -d --name cc107-pg -e POSTGRES_PASSWORD=probe -e POSTGRES_DB=probe postgres:16-alpine
--   docker exec -i cc107-pg psql -U postgres -d probe < this-file
--   docker rm -f cc107-pg
--
-- WHAT IT PROVES: `ai_chat_conversation_participants.user_id` is a uuid column, and
-- `auth.sub` is a SUBJECT STRING whose shape depends on the principal's kind
-- (`packages/shared/src/lib/auth/principal.ts:73-79`). Three sites in
-- `api/ai/chat/route.ts` and one in `api/ai/conversations/route.ts` passed it
-- straight through, so every key-backed caller got `22P02` from Postgres on the
-- first persisted turn — not a wrong answer, a 500.

\set ON_ERROR_STOP on

drop table if exists ai_chat_conversation_participants cascade;

-- The owner column exactly as `data/entities.ts:847` declares it:
--   @Property({ name: 'user_id', type: 'uuid' }) userId!: string   (required, non-nullable)
create table ai_chat_conversation_participants (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid null,
  conversation_id text not null,
  user_id uuid not null,
  role text not null default 'owner',
  last_read_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint ai_chat_conv_participants_pkey primary key (id)
);
create unique index ai_chat_conv_participants_tenant_org_conv_user_uq
  on ai_chat_conversation_participants (tenant_id, organization_id, conversation_id, user_id)
  where organization_id is not null;

-- P1..P4: one block per subject shape, each asserting its own outcome so a
-- regression in any single one is visible rather than averaged away.
do $$
declare v_state text; v_msg text;
begin
  -- P1 — an `ai_worker` API key (the kind CC-103 added).
  begin
    insert into ai_chat_conversation_participants (tenant_id, conversation_id, user_id, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','conv-1',
            'ai_worker:22222222-2222-4333-8444-555555555555', now(), now());
    raise exception 'P1 FAILED: an ai_worker subject was ACCEPTED into a uuid column';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state <> '22P02' then
      raise exception 'P1 refused for the WRONG reason: % %', v_state, v_msg;
    end if;
    raise notice 'P1 ai_worker subject -> REFUSED 22P02 (invalid input syntax for type uuid)';
  end;

  -- P2 — a plain `service` API key. This path predates CC-103.
  begin
    insert into ai_chat_conversation_participants (tenant_id, conversation_id, user_id, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','conv-1',
            'api_key:22222222-2222-4333-8444-555555555555', now(), now());
    raise exception 'P2 FAILED: an api_key subject was ACCEPTED into a uuid column';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state <> '22P02' then
      raise exception 'P2 refused for the WRONG reason: % %', v_state, v_msg;
    end if;
    raise notice 'P2 api_key subject -> REFUSED 22P02';
  end;

  -- P3 — a human. The only shape that fits.
  begin
    insert into ai_chat_conversation_participants (tenant_id, conversation_id, user_id, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','conv-1',
            '22222222-2222-4333-8444-555555555555', now(), now());
    raise notice 'P3 human uuid subject -> ACCEPTED';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    raise exception 'P3 FAILED: a human uuid was refused: % %', v_state, v_msg;
  end;

  -- P4 — an agent id. TEXT, so it cannot live in this column at all; this is the
  -- constraint `SR-07` has to design around rather than wish away.
  begin
    insert into ai_chat_conversation_participants (tenant_id, conversation_id, user_id, created_at, updated_at)
    values ('11111111-1111-1111-1111-111111111111','conv-2',
            'business_ir.query_author', now(), now());
    raise exception 'P4 FAILED: a text agent id was ACCEPTED into a uuid column';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state <> '22P02' then
      raise exception 'P4 refused for the WRONG reason: % %', v_state, v_msg;
    end if;
    raise notice 'P4 agent id (text) -> REFUSED 22P02';
  end;
end $$;

-- P5 — the fact the register's design rests on, MEASURED rather than asserted:
-- Postgres treats NULLs as distinct, so a single plain unique over
-- (tenant, conv, user_id) would not dedupe a second, nullable identity axis.
create table probe_null (a int, b int);
create unique index probe_null_ab on probe_null (a, b);
insert into probe_null values (1, null);
insert into probe_null values (1, null);
do $$
declare n int;
begin
  select count(*) into n from probe_null;
  if n <> 2 then
    raise exception 'P5 FAILED: expected 2 rows (NULLs distinct), got %', n;
  end if;
  raise notice 'P5 NULLs are distinct under a unique index -> 2 rows kept';
end $$;

select 'PROBE-COMPLETE' as final;
