import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-126` — the tenant-created agent type table: the data layer of the type
 * catalogue.
 *
 * Additive: one new table, no change to any existing table. The platform
 * ships types as **code** (`AiAgentDefinition`, the generated registry); a
 * tenant authors one here, which is the owner's *"bulk packaged
 * capabilities, so a standardised agent is cheap to create"* arriving for a
 * tenant rather than only for the platform. Before this, a tenant could
 * narrow a platform type and nothing more.
 *
 * **The key CHECK ships WITH the table, not as a later `alter`.** A table
 * that exists unconstrained for even one migration is a window in which the
 * second spelling is representable. The dialect is the one
 * `ai_agent_bindings.agent_id` already carries
 * (`Migration20261017160000_ai_agent_bindings_agent_id_format`) because a
 * type key must flow through the binding/override machinery, which is
 * text-keyed: a CHECK makes `Billing.Assistant` beside `billing.assistant`
 * unrepresentable rather than remembered.
 *
 * **The unique index covers every row regardless of `status`.** A retired
 * key is never reusable — re-creating it would silently re-point every
 * binding written for the old definition at the new one. There is no partial
 * pair here: the paired indexes the override tables carry exist for a
 * nullable `organization_id`, and this table has no org column (the owner's
 * two layers are platform and tenant).
 *
 * **`tenant_id` is NOT NULL and there is no sentinel.** `tenant_id IS NULL`
 * meaning *platform level* is a value every query must remember to exclude —
 * the `CC-103` class (a permit written as a default). The platform layer
 * needs no row: the code registry already is that layer.
 *
 * `bundle` is the JSON-safe subset of `AiAgentDefinition`. The three fields
 * that cannot be JSON — `resolvePageContext`, `output.schema`,
 * `loop.prepareStep` — are dropped by the write-time schema, so a tenant
 * type is structurally a chat agent with a concrete tool list.
 *
 * **If this migration fails, it is reporting a real defect**: the error names
 * a constraint the schema could not hold, and each one here is deliberate.
 */
export class Migration20261018120000_ai_agent_types extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "ai_agent_types" (
        "id" uuid not null default gen_random_uuid(),
        "tenant_id" uuid not null,
        "key" text not null,
        "bundle" jsonb not null default '{}',
        "version" int not null default 1,
        "status" text not null default 'active',
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "ai_agent_types_pkey" primary key ("id"),
        constraint "ai_agent_types_key_format_ck" check ("key" ~ '^[a-z0-9_]+\\.[a-z0-9_]+$'),
        constraint "ai_agent_types_status_ck" check ("status" in ('active', 'retired'))
      );
    `)
    this.addSql(`
      create unique index "ai_agent_types_tenant_key_uq"
        on "ai_agent_types" ("tenant_id", "key");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_agent_types" cascade;`)
  }
}
