import { Migration } from '@mikro-orm/migrations'

/**
 * `SR-02` — the machine is not the teammate: `ai_agent_runtimes`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GAP THIS CLOSES
 * ─────────────────────────────────────────────────────────────────────────────
 * *"How do I know which engine instance is running for which tenant"* had no
 * answer in the schema. The engine was chosen by ONE deployment-wide environment
 * variable (`AI_RUNTIME_ENGINE`, `lib/resolve-ai-runtime-port.ts:87`), so every
 * tenant shared whatever the operator set — and the kernel `Agent` object's
 * `runtime` field, described as *"a binding name"* (`ce.ts:128-136`), had **no
 * reader at all**. A declaration nothing reads is not a control; it is a comment
 * with a type.
 *
 * This table is the row that field names. The unique indexes below are what make
 * the answer a database fact rather than a convention.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A NEW OBJECT AND NOT A COLUMN ON AN EXISTING ONE
 * ─────────────────────────────────────────────────────────────────────────────
 * Two rows, because they answer two different questions (Multica's split, the
 * strongest finding of that study — `multica-forensics/findings/01:130-155`):
 *
 *   - `agent`         — **the teammate**: what it is, what it may do, whose role
 *                       it carries. A kernel object (`ai_assistant:agent`).
 *   - `agent_runtime` — **the machine**: a daemon on a host, for one provider,
 *                       that can actually run a turn. THIS TABLE.
 *
 * One runtime hosts many agents; an agent does not own a process. Collapsing them
 * is why "which tenant is this engine serving" could not be asked.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOT `ai_agent_runtime_overrides`
 * ─────────────────────────────────────────────────────────────────────────────
 * That table already exists and is a **different object**: per-tenant
 * provider/model/baseURL *configuration* (`entities.ts:229`). This one is an
 * **instance**. A setting says which model a tenant prefers; a runtime says which
 * process can serve it. Merging them would repeat the conflation this migration
 * exists to undo, so the two names stay distinct and neither is an alias.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UNIQUENESS KEY, AND WHERE WE DIVERGE FROM THE DONOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Multica writes `UNIQUE (workspace_id, daemon_id, provider)` over a **nullable**
 * `daemon_id`. In Postgres `NULL`s are distinct, so every null-daemon row falls
 * OUTSIDE that uniqueness: the constraint holds for daemons and silently
 * evaporates for exactly the rows it cannot describe. A key with a hole is worse
 * than no key — the schema claims an invariant it does not enforce. So
 * `daemon_id` is `NOT NULL` here, and a future runtime without a daemon must be a
 * named migration, not a silent escape.
 *
 * A second pair of indexes makes `name` unique per tenant. That is **not** in
 * Multica, and it is required here: the kernel agent stores its binding as TEXT
 * (custom-entity records live in the generic `custom_entities_storage` store,
 * which cannot carry a foreign key), so the binding is resolved **by name**. Two
 * rows with one name would make that resolution a coin flip.
 *
 * Both pairs are PARTIAL, split on `organization_id IS NULL` — the house pattern
 * for a nullable organization (`Migration20260512090000.ts:7-8`,
 * `Migration20261010180000_ai_agent_bindings.ts:32-41`), because a plain
 * `UNIQUE (tenant_id, organization_id, …)` would not constrain the null-org rows.
 * Both exclude `deleted_at IS NOT NULL`: a retired runtime must not block its own
 * name or daemon slot from being registered again.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS DELIBERATELY NOT HERE — and the standard that removes it
 * ─────────────────────────────────────────────────────────────────────────────
 * The donor's table also carries `status ('online'|'offline')`, `last_seen_at`,
 * `runtime_mode ('local'|'cloud')` and `device_info`. None is in this slice, for
 * two reasons, and the second is the one that decides:
 *
 * 1. `runtime_mode` has one inhabitant (`local`): our runtime is a supervised
 *    private process behind the port (`AGENT-HALF.md` §1.5). `device_info` is free
 *    text with no reader.
 * 2. **`status` and `last_seen_at` would have no writer.** Liveness is a
 *    heartbeat, and no probe in this codebase beats one. A column that claims
 *    "online" while nothing ever sets it is the SAME defect this migration exists
 *    to remove — a declaration nothing reads — only pointed the other way. They
 *    land with the probe that writes them (a later slice, with `SR-12`'s engine
 *    home), not before it.
 *
 * `metadata` stays because it is not a claim about behaviour: it is an empty
 * container, the same forward-compat slot `ai_chat_messages` already carries.
 *
 * **No CHECK on `provider`.** The vocabulary is `AiRuntimeEngine`
 * (`'opencode' | 'hermes'`) and it grows with every engine. Constraining it here
 * would couple a migration to a TypeScript type and force an ALTER for each new
 * engine — the reasoning `Migration20260812180000.ts:24-27` records for
 * `api_keys.principal_kind`. The application validates it at the repository
 * boundary (`isAiRuntimeEngine`), where the vocabulary already lives.
 *
 * **No `HERMES_HOME`, no credential.** One tenant ↔ one engine *home*, and the
 * per-run credential, are `SR-12` (the fix for open `CC-84`). This table gives
 * that work a row to hang the home on; it does not pre-empt it.
 */
export class Migration20261017120000_ai_agent_runtimes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
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
    `)

    // One daemon, one provider, one runtime — the one-tenant-one-engine primitive.
    this.addSql(`
      create unique index "ai_agent_runtimes_tenant_org_daemon_provider_uq"
        on "ai_agent_runtimes" ("tenant_id", "organization_id", "daemon_id", "provider")
        where "organization_id" is not null and "deleted_at" is null;
    `)
    this.addSql(`
      create unique index "ai_agent_runtimes_tenant_daemon_provider_null_org_uq"
        on "ai_agent_runtimes" ("tenant_id", "daemon_id", "provider")
        where "organization_id" is null and "deleted_at" is null;
    `)

    // The binding key must resolve to exactly one row — see the header.
    this.addSql(`
      create unique index "ai_agent_runtimes_tenant_org_name_uq"
        on "ai_agent_runtimes" ("tenant_id", "organization_id", "name")
        where "organization_id" is not null and "deleted_at" is null;
    `)
    this.addSql(`
      create unique index "ai_agent_runtimes_tenant_name_null_org_uq"
        on "ai_agent_runtimes" ("tenant_id", "name")
        where "organization_id" is null and "deleted_at" is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_agent_runtimes" cascade;`)
  }
}
