import { Migration } from '@mikro-orm/migrations'

/**
 * `role_acls` — a unique index on `(role_id, tenant_id)` (CC-23, SD-1 / S2e).
 *
 * **The gap this closes.** CC-16 made the merge into `role_acls.features_json`
 * atomic for a row that **already exists** (one SQL `UPDATE`, `jsonb ||`,
 * deduped, `returning` — no lost update under a race). It deliberately did not
 * cover the **create** branch: a first grant onto a role that has **no** ACL row
 * still reads-then-inserts (`permission-decision-grant.ts` — `findOneWithDecryption`
 * → `em.create` → `persist`/`flush`). Two grants racing on a missing row can
 * therefore create **two** rows — a duplicate, not a lost addition.
 *
 * That is unreachable in normal operation: the ACL row is created at setup
 * (`setup-app.ts` → `ensureRoleAclFor`), long before any structure-change grant.
 * It is nevertheless **real** for a role whose ACL was deleted (role deletion
 * hard-deletes the ACL — `commands/roles.ts` `nativeDelete(RoleAcl, …)`), so the
 * row can legitimately be absent when a structure change arrives.
 *
 * **Why a unique index and not application-level locking.** The write half's own
 * precedent (CC-16) is that the database is the arbiter: the merge is one
 * statement, not a lock in the application. A first insert is the same shape —
 * the honest fix is to give the *database* the key that makes "one ACL row per
 * role per tenant" a fact it can enforce, and then let the create branch be an
 * `INSERT … ON CONFLICT` (a single statement, like the update branch).
 *
 * **The index shape — plain, not partial, and why.** `role_acls.deleted_at`
 * exists, but **nothing soft-deletes a `role_acls` row**: the entity carries a
 * plain `deleted_at` property with **no** soft-delete filter (measured — no
 * `@Filter` and no global filters config on this entity; the primary key is the
 * only index in the MikroORM snapshot), and every delete path is a **hard**
 * `nativeDelete`. So a partial index (`… where deleted_at is null`) would protect
 * nothing a plain index does not, while a plain index is the stricter statement
 * of the invariant: a role has **exactly one** ACL row per tenant, always. It
 * also matches the intent recorded in the CC-23 callback (*"a unique index on
 * `(role_id, tenant_id)`"*) with no weakening.
 *
 * **Why this is provable (correcting a false premise).** Earlier notes on CC-23
 * claimed the migration was *"unprovable on this host"*. **False and retracted**
 * (rule 13). A live Postgres 17 runs in `mercato-postgres-local`; this project
 * writes, applies (`mercato db migrate`) and reads row DDL back on it — the
 * sibling migrations `Migration20261009090000` (`roles.is_core`) and
 * `Migration20261009205000` (`permission_surfaces`) were both applied and
 * measured that way on 2026-10-09. This migration is proven the same way; the
 * only prerequisite CC-23 ever needed was the migration itself.
 *
 * **Pre-flight: existing duplicates would fail `create unique index`.** Measured
 * against the live database before writing this file — `select role_id, tenant_id,
 * count(*) … having count(*) > 1` returns **0 rows** on this host, so the index
 * applies cleanly. A deployment carrying a pre-existing duplicate (only reachable
 * through the very race this closes) would need that duplicate resolved first;
 * the migration does **not** silently delete a row, because choosing which ACL to
 * keep is a data decision, not a schema one. `create unique index` failing loudly
 * is the correct outcome there.
 *
 * **Reversible.** `down()` drops exactly what `up()` added; no data moves in
 * either direction, so the round-trip is free.
 *
 * Source: `COMPLETION-CALLBACKS.md` CC-23; `platform_points.md` `S2e` (row 8,
 * `SD-1`); `PLAN-SD-1.md` §7.7 / §10 item 7.
 */

export class Migration20261009220000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`
      create unique index "role_acls_role_id_tenant_id_unique"
        on "role_acls" ("role_id", "tenant_id");
    `)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "role_acls_role_id_tenant_id_unique";`)
  }
}
