import { Migration } from '@mikro-orm/migrations'

/**
 * `permission_surfaces` — the durable half of the permission catalogue (SD-1 / S2 / M3e).
 *
 * **The gap this closes (`P3b` / `M3e`).** The permission catalogue
 * (`@open-mercato/shared/lib/permissions/catalogue`) answers *"what permission surfaces exist, and
 * which records does each yield?"* — but until this migration it kept its registry in a process-local
 * `Map` (`catalogue.ts`, `const registry = new Map(...)`). Two consequences, both wrong for a
 * platform whose whole promise is that a business *teaches it once*:
 *   1. a surface that appears at **runtime** (a custom entity, a custom field, a saved Function) is
 *      **recorded in memory only** — a restart forgets it, so the platform cannot say what surfaces
 *      exist; and
 *   2. there is **no record** of a surface's appearance across the fleet — a second process, a
 *      worker, or a later boot has no way to learn it.
 * This table is the durable answer: one row per surface, written when the surface is recorded and
 * read back at boot so the running catalogue and the database agree.
 *
 * **What this table is, and what it deliberately is not.**
 *   - It stores **surfaces** — the *things that can be permitted* (an object, a field, a relation, a
 *     Function, a widget, an agent) and where each came from. It does **not** store *who may do what*:
 *     the grants stay where they have always been, in `role_acls.features_json` / `user_acls`
 *     (S5 — one permission engine, never a second one). This table is a **registry**, the same shape
 *     as the catalogue it backs: declared data, no decisions.
 *   - It is **tenant-scoped**, because the same surface id can be recorded by two tenants and the
 *     catalogue is a live view per tenant. A row is keyed by `(tenant_id, surface_id)` so a surface
 *     has exactly one record per tenant — the write is an upsert on that key, never an append.
 *
 * **Why a table and not a settings entry.** The catalogue is per-tenant data that grows as tenants
 * add structures; `module_configs` holds *platform* settings (the tier map, the core-object map), not
 * an unbounded per-tenant list. A settings row keyed by surface id would be a table wearing a
 * setting's clothes — and the memory notes already record that the object→tier *map* is the setting,
 * while the *fact* that a row exists is a property of the row (see `Migration20261009090000`'s
 * reasoning, CC-31(a)).
 *
 * **The premise this migration corrects (rule 13 / 14b).** The `M3e` note on `platform_points.md`
 * said *"a durable row waits on `G-04`, since a migration is unprovable on this host."* **Both halves
 * were false:** `G-04` is the data-axis *authorization* layer (may this actor read this row?), which
 * has nothing to do with storing surfaces; and a migration **is** provable — `Migration20261009090000`
 * was written, applied to `mercato-postgres-local`, and read back on 2026-10-09. This migration is
 * applied and measured back the same way (see the plan), and both false statements are corrected in
 * the same change.
 *
 * **Index.** The only question asked of this table at boot is *"which surfaces does this tenant have"*,
 * so the index is on `(tenant_id)`; the unique key `(tenant_id, surface_id)` is the upsert target and
 * also serves the per-tenant scan, so no separate index is needed beyond that unique constraint.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` S2 + §C.1; `library/development/platform_points.md` row 9
 * (`P3b` / `M3e`); `PLAN-P3b-permission-catalogue-persistence.md`.
 */

export class Migration20261009205000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`
      create table "permission_surfaces" (
        "id" uuid not null default gen_random_uuid(),
        "tenant_id" uuid not null,
        "surface_id" text not null,
        "kind" text not null,
        "owner" text not null,
        "source" text not null default 'recorded',
        "feature_prefix" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz null,
        "deleted_at" timestamptz null,
        constraint "permission_surfaces_pkey" primary key ("id")
      );
    `)

    // The upsert target, and the boot-time scan key. One record per (tenant, surface).
    this.addSql(`
      create unique index "permission_surfaces_tenant_surface_uidx"
        on "permission_surfaces" ("tenant_id", "surface_id")
        where "deleted_at" is null;
    `)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "permission_surfaces_tenant_surface_uidx";`)
    this.addSql(`drop table if exists "permission_surfaces";`)
  }
}
