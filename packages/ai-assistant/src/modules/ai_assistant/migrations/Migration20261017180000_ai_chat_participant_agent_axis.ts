import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-107` / `SR-07` — a bot is a participant: the second identity axis.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SECOND AXIS, AND WHOSE DESIGN IT IS
 * ─────────────────────────────────────────────────────────────────────────────
 * The participant table identified a member by ONE column, `user_id`, typed
 * `uuid` — which is why an agent could never be a participant at all: an agent
 * id is TEXT (`ai_chat_conversations.agent_id` is `text`; the vocabulary is
 * `business_ir.query_author` style names), so it does not fit the column and
 * Postgres refuses it (`22P02`, proven in
 * `__probes__/acting-user-subject.probe.sql`, P4). The agent was a *property of
 * the conversation* instead of a *member of it*.
 *
 * **This design is OURS, not the donor's.** The register row said to mirror
 * Zulip's "two partial unique indexes … `streams.py:410-418`". Read at those
 * lines, the donor has `unique_together = ("user_profile", "recipient")` — ONE
 * plain unique over TWO NON-NULLABLE FKs — plus a partial **non-unique** index.
 * Zulip needs no second axis because a Zulip bot **is** a `UserProfile` row
 * (`is_bot`, `users.py:556`) joining through the *same* FK under the *same*
 * key. It refuses the split; so do we (`CC-107`'s REFUSED list). What follows is
 * justified on our own schema, and the reason it is needed here is measured:
 * Postgres treats NULLs as distinct, so with `user_id` AND `agent_id` both
 * nullable in one table, a single plain unique over
 * `(tenant, org, conv, user_id, agent_id)` would let two rows
 * `(t, o, c, NULL, 'agent-a')` coexist — the key it claims would not hold. Four
 * partial unique indexes, two per identity axis and two per org scope, are what
 * actually enforces it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE COLUMNS
 * ─────────────────────────────────────────────────────────────────────────────
 * - `agent_id text null` — the agent's own id, exactly as the container stores
 *   it. No vocabulary CHECK for the same reason `ai_agent_runtimes.provider`
 *   has none (see `Migration20261017120000`'s header): the vocabulary is a
 *   TypeScript type that grows, and the boundary validates it.
 * - `agent_owner_user_id uuid null` — the human principal answerable for this
 *   participant, the `bot_owner` analogue (`users.py:558`). Authorization and
 *   audit need a person to name; a machine that acts for nobody is refused at
 *   the repository boundary rather than stored.
 * - `user_id` becomes **nullable**. This is the change that alters the meaning
 *   of every existing `{ userId }` filter, which is why the `num_nonnulls` CHECK
 *   lands in the same migration and not a later one: a row with neither
 *   identity is unreachable by every predicate in the repository, and a row with
 *   both would answer to two owners.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE INDEXES — AND WHY THEY NOW ALSO EXCLUDE RETIRED ROWS
 * ─────────────────────────────────────────────────────────────────────────────
 * All four add `and "deleted_at" is null`. The two user-axis indexes previously
 * did not, so a revoked participant blocked its own slot at the database level;
 * `addParticipant` already compensates in application code (it looks for the
 * soft-deleted row and clears `deleted_at`), which means the invariant was
 * enforced nowhere a raw writer would notice. This is the same rule
 * `ai_agent_runtimes` and `ai_agent_bindings` follow, and it is a tightening:
 * every row legal before is legal now.
 */
export class Migration20261017180000_ai_chat_participant_agent_axis extends Migration {
  override async up(): Promise<void> {
    // ── the columns ──────────────────────────────────────────────────────────
    this.addSql(`
      alter table "ai_chat_conversation_participants"
        add column "agent_id" text null,
        add column "agent_owner_user_id" uuid null;
    `)
    this.addSql(`
      alter table "ai_chat_conversation_participants"
        alter column "user_id" drop not null;
    `)

    // Exactly one identity, and a human behind every agent participant. Both
    // are NOT VALID: this table can be large, and a lock-and-scan on deploy
    // would take the app down for a constraint the application already
    // maintains. NOT VALID applies it to new writes and leaves existing rows
    // alone — the house pattern (`Migration20261010180000_ai_agent_bindings`,
    // and `251_agent_runtime_unbind.up.sql` in the donor for the same reason).
    //
    // The `agent_owner_user_id` predicate is expressed as `agent_id IS NOT NULL
    // AND agent_owner_user_id IS NULL` so a HUMAN participant is untouched: a
    // human needs no owner, and a constraint that refused null owners for
    // everyone would make the existing MVP rows illegal.
    this.addSql(`
      alter table "ai_chat_conversation_participants"
        add constraint "ai_chat_conv_participants_one_identity_ck"
        check (num_nonnulls("user_id", "agent_id") = 1) not valid;
    `)
    this.addSql(`
      alter table "ai_chat_conversation_participants"
        add constraint "ai_chat_conv_participants_agent_owner_ck"
        check ("agent_id" is null or "agent_owner_user_id" is not null) not valid;
    `)

    // ── the user axis, re-spelled with its predicate and the retired exclusion ─
    this.addSql(`
      drop index if exists "ai_chat_conv_participants_tenant_org_conv_user_uq";
    `)
    this.addSql(`
      create unique index "ai_chat_conv_participants_tenant_org_conv_user_uq"
        on "ai_chat_conversation_participants"
        ("tenant_id", "organization_id", "conversation_id", "user_id")
        where "organization_id" is not null
          and "user_id" is not null
          and "deleted_at" is null;
    `)
    this.addSql(`
      drop index if exists "ai_chat_conv_participants_tenant_conv_user_null_org_uq";
    `)
    this.addSql(`
      create unique index "ai_chat_conv_participants_tenant_conv_user_null_org_uq"
        on "ai_chat_conversation_participants"
        ("tenant_id", "conversation_id", "user_id")
        where "organization_id" is null
          and "user_id" is not null
          and "deleted_at" is null;
    `)

    // ── the agent axis ───────────────────────────────────────────────────────
    this.addSql(`
      create unique index "ai_chat_conv_participants_tenant_org_conv_agent_uq"
        on "ai_chat_conversation_participants"
        ("tenant_id", "organization_id", "conversation_id", "agent_id")
        where "organization_id" is not null
          and "agent_id" is not null
          and "deleted_at" is null;
    `)
    this.addSql(`
      create unique index "ai_chat_conv_participants_tenant_conv_agent_null_org_uq"
        on "ai_chat_conversation_participants"
        ("tenant_id", "conversation_id", "agent_id")
        where "organization_id" is null
          and "agent_id" is not null
          and "deleted_at" is null;
    `)

    // The read paths the second axis needs. Both are partial for the same reason
    // every other index on this table is — a retired member is history, not a
    // candidate.
    //
    // ★ `agent_id` LEADS, mirroring `user_id` on the user axis. The reason is
    // symmetry and reviewability, NOT a measured necessity — and the measurement
    // that looked like a necessity was wrong. The first draft put `agent_id`
    // last; a real-PostgreSQL plan at 2,000 rows then showed the planner using
    // the USER index, which reads like "an index that is not used is not
    // coverage". **Re-measured after `ANALYZE`, BOTH orderings are chosen.** The
    // real cause of the first reading was stale statistics on a freshly
    // bulk-inserted table, not the index shape. So: the ordering is kept for
    // mirroring, and the lesson is banked — **a query plan taken before ANALYZE
    // is a claim about the statistics, not about the index** (L181).
    this.addSql(`
      create index "ai_chat_conv_participants_active_conv_agent_idx"
        on "ai_chat_conversation_participants"
        ("tenant_id", "organization_id", "agent_id", "conversation_id")
        where "deleted_at" is null;
    `)
    this.addSql(`
      drop index if exists "ai_chat_conv_participants_tenant_org_user_conv_idx";
    `)
    this.addSql(`
      create index "ai_chat_conv_participants_tenant_org_user_conv_idx"
        on "ai_chat_conversation_participants"
        ("tenant_id", "organization_id", "user_id", "conversation_id")
        where "deleted_at" is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "ai_chat_conv_participants_tenant_org_user_conv_idx";`)
    this.addSql(`drop index if exists "ai_chat_conv_participants_active_conv_agent_idx";`)
    this.addSql(`drop index if exists "ai_chat_conv_participants_tenant_conv_agent_null_org_uq";`)
    this.addSql(`drop index if exists "ai_chat_conv_participants_tenant_org_conv_agent_uq";`)

    // Restore the two user-axis indexes exactly as `Migration20260518092853`
    // created them, so a down/up round trip returns the previous state.
    this.addSql(`drop index if exists "ai_chat_conv_participants_tenant_conv_user_null_org_uq";`)
    this.addSql(`
      create unique index "ai_chat_conv_participants_tenant_conv_user_null_org_uq"
        on "ai_chat_conversation_participants"
        ("tenant_id", "conversation_id", "user_id")
        where "organization_id" is null;
    `)
    this.addSql(`drop index if exists "ai_chat_conv_participants_tenant_org_conv_user_uq";`)
    this.addSql(`
      create unique index "ai_chat_conv_participants_tenant_org_conv_user_uq"
        on "ai_chat_conversation_participants"
        ("tenant_id", "organization_id", "conversation_id", "user_id")
        where "organization_id" is not null;
    `)
    this.addSql(`
      create index "ai_chat_conv_participants_tenant_org_user_conv_idx"
        on "ai_chat_conversation_participants"
        ("tenant_id", "organization_id", "user_id", "conversation_id");
    `)

    this.addSql(`
      alter table "ai_chat_conversation_participants"
        drop constraint if exists "ai_chat_conv_participants_agent_owner_ck";
    `)
    this.addSql(`
      alter table "ai_chat_conversation_participants"
        drop constraint if exists "ai_chat_conv_participants_one_identity_ck";
    `)
    this.addSql(`alter table "ai_chat_conversation_participants" drop column if exists "agent_owner_user_id";`)
    this.addSql(`alter table "ai_chat_conversation_participants" drop column if exists "agent_id";`)
    // `user_id` goes back to NOT NULL. Rows written by the agent axis would make
    // this fail, which is the correct answer: down() on a table that has taken
    // agent participants should refuse rather than silently orphan them.
    this.addSql(`
      alter table "ai_chat_conversation_participants"
        alter column "user_id" set not null;
    `)
  }
}
