import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-27` — the agent ↔ AI-user binding table.
 *
 * Additive: one new table, no change to any existing table. An AI-user
 * principal (an `api_keys` row with `principal_kind = 'ai_worker'`) may run a
 * code-declared agent only when a live row here binds it (`B2`, fail-closed).
 *
 * `principal_id` is the `api_keys` id (a bare uuid), not the string subject
 * `ai_worker:<id>` — this table keys by the credential id itself.
 */
export class Migration20261010180000_ai_agent_bindings extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "ai_agent_bindings" (
        "id" uuid not null default gen_random_uuid(),
        "tenant_id" uuid not null,
        "organization_id" uuid null,
        "principal_id" uuid not null,
        "agent_id" text not null,
        "tool_allowlist" jsonb null,
        "required_features" jsonb null,
        "notes" text null,
        "created_by_user_id" uuid null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        "deleted_at" timestamptz null,
        constraint "ai_agent_bindings_pkey" primary key ("id")
      );
    `)
    this.addSql(`
      create unique index "ai_agent_bindings_tenant_org_principal_agent_uq"
        on "ai_agent_bindings" ("tenant_id", "organization_id", "principal_id", "agent_id")
        where "organization_id" is not null and "deleted_at" is null;
    `)
    this.addSql(`
      create unique index "ai_agent_bindings_tenant_principal_agent_null_org_uq"
        on "ai_agent_bindings" ("tenant_id", "principal_id", "agent_id")
        where "organization_id" is null and "deleted_at" is null;
    `)
    this.addSql(`
      create index "ai_agent_bindings_tenant_org_principal_agent_idx"
        on "ai_agent_bindings" ("tenant_id", "organization_id", "principal_id", "agent_id");
    `)
    this.addSql(`
      create index "ai_agent_bindings_tenant_agent_idx"
        on "ai_agent_bindings" ("tenant_id", "agent_id");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_agent_bindings" cascade;`)
  }
}
