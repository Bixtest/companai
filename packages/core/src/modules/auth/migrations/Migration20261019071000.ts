import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-128` — the capability ceiling, and the defect it bounds.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS ACTUALLY BROKEN (measured, not recalled)
 * ─────────────────────────────────────────────────────────────────────────────
 * `UserAcl.tenant_id` is `uuid NOT NULL`, commented *"Tenant scope is mandatory for ACL evaluation"*
 * (`auth/data/entities.ts:373-395`). Then `isGlobalSuperAdmin` (`rbacService.ts:247-275`) queries
 * `UserAcl` with `{ user, isSuperAdmin: true }` — **no tenant filter** — and `loadAcl` returns
 * `{ isSuperAdmin: true, features: ['*'] }` before scope is consulted at all (`:317-323`).
 *
 * **The data model is tenant-scoped and the read is not.** So one tenant's superadmin is every tenant's,
 * and `['*']` matches every capability (`featureMatch.ts:45-46`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS TABLE, AND WHY ONE ROW PER CAPABILITY
 * ─────────────────────────────────────────────────────────────────────────────
 * A tenant's maximum capability set has to be **data** — the platform admin sets it and tenants narrow
 * it — and `Tenant` holds only a name, an active flag and timestamps.
 *
 * **`module_configs` already has the platform/tenant split** (`tenant_id` nullable, two partial unique
 * indexes), so the *store* pattern is not new. What does not exist is a **ceiling model**: a bounded set
 * of capabilities that another set must be a **subset** of. That is not a config value, and this is why
 * the ceiling is rows rather than a JSON array:
 *
 * 1. **The subset rule is a query.** "Is this tenant ceiling inside the platform ceiling" is a
 *    `NOT EXISTS`; against a JSON array it is a parse, a set difference, and a guess about what an
 *    empty array means.
 * 2. **It is diffable and auditable.** A capability removed from a ceiling is a visible deleted row,
 *    which is the record `PLAN-2026-10-18-one-agent.md` §4.6 asks for — *"a cross-tenant admin act that
 *    is recorded as such rather than inferred from a badge"*.
 * 3. **`module_configs` stores JSON values, and that is why it cannot hold a bounded set.** A set with
 *    a subset invariant is not a value.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PLATFORM ROW IS `tenant_id IS NULL` — NO SENTINEL TENANT
 * ─────────────────────────────────────────────────────────────────────────────
 * `CC-126` refused a sentinel tenant id for the platform layer and `CC-128` refuses it again, for the
 * same reason: **a value every query must remember to exclude is a latent cross-tenant read.** A null
 * `tenant_id` cannot be forgotten into a tenant scope, because it is not in one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TWO PARTIAL UNIQUES
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors `module_configs`' split — one index per scope — and both exclude retired rows, because a
 * retired capability must not block its own slot (the `CC-102`/`CC-107` rule).
 *
 * **Note the contrast with `ai_agent_types`**, which uses ONE plain unique covering every status so a
 * retired *key* is never reusable. That is right for a **name** — reusing a retired name would silently
 * attach history to a different thing — and wrong for a **capability**, which is a fact about the world
 * and must be re-addable after somebody removes it by mistake.
 *
 * **No foreign key to `tenants`**, following `UserAcl`, `ai_agent_bindings`, `ai_agent_runtimes` and
 * `ai_agent_types`: every tenant-scoped table in this codebase carries a plain `tenant_id` uuid. The
 * platform row is a null, which a `NOT NULL` FK could not express anyway.
 */
export class Migration20261019071000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "tenant_capability_ceilings" (
        "id" uuid not null default gen_random_uuid(),
        "tenant_id" uuid null,
        "capability" text not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        "deleted_at" timestamptz null,
        primary key ("id")
      );
    `)

    // The platform ceiling: one live row per capability, `tenant_id` null.
    this.addSql(`
      create unique index "tenant_capability_ceilings_platform_uq"
        on "tenant_capability_ceilings" ("capability")
        where "tenant_id" is null and "deleted_at" is null;
    `)
    // A tenant's narrowing of it: one live row per capability per tenant.
    this.addSql(`
      create unique index "tenant_capability_ceilings_tenant_uq"
        on "tenant_capability_ceilings" ("tenant_id", "capability")
        where "tenant_id" is not null and "deleted_at" is null;
    `)
    // The read path: "this tenant's ceiling", which is the query the resolver makes.
    this.addSql(`
      create index "tenant_capability_ceilings_tenant_live_idx"
        on "tenant_capability_ceilings" ("tenant_id")
        where "deleted_at" is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tenant_capability_ceilings" cascade;`)
  }
}
