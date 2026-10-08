import { Migration } from '@mikro-orm/migrations';

/**
 * Give `custom_entities_storage` uniqueness that the record upsert can actually use,
 * and cover the null-scope shapes at the same time.
 *
 * The upsert (`@open-mercato/shared/lib/data/engine.ts`, `createCustomEntityRecord`)
 * issues `ON CONFLICT ("entity_type", "entity_id", "organization_id", "tenant_id")`.
 * Before this migration the table's only index (`custom_entities_storage_unique_idx`,
 * from `Migration20251030150038`) had two faults: it omitted `tenant_id`, and it was
 * created WITHOUT `unique`, so it enforced nothing. The conflict target therefore
 * matched no constraint at all.
 *
 * MEASURED against Postgres 17, not assumed: a bare `ON CONFLICT (cols)` resolves only
 * against a NON-partial unique index. Postgres never infers a partial index for a
 * conflict target that carries no predicate — it raises "there is no unique or
 * exclusion constraint matching the ON CONFLICT specification", even when the inserted
 * row would satisfy that predicate. So the primary index below must be plain.
 *
 * A plain unique index cannot also cover the null-scope shapes, because Postgres treats
 * NULLs as DISTINCT: two `(entity_type, entity_id, NULL, NULL)` rows do not collide.
 * The three partial indexes below close that gap for rows written by plain INSERTs.
 * Together the four cover every scope shape exactly once.
 *
 * The legacy index is dropped unconditionally: the original migration is immutable, so
 * it exists on every database that has ever run it.
 */
export class Migration20261009090000 extends Migration {

  override async up(): Promise<void> {
    // Legacy: non-unique, and does not include tenant_id. Enforced nothing; superseded below.
    this.addSql(`drop index if exists "custom_entities_storage_unique_idx";`);

    // Primary scope (tenant + organization). PLAIN, because the upsert's bare
    // ON CONFLICT target can only resolve against a non-partial unique index.
    this.addSql(`create unique index "custom_entities_storage_scope_uq" on "custom_entities_storage" ("entity_type", "entity_id", "organization_id", "tenant_id");`);

    // Null-scope shapes. Partial, because a plain index cannot enforce these (NULLs are
    // distinct). These reject duplicate INSERTs; the upsert never reaches them.
    this.addSql(`create unique index "custom_entities_storage_tenant_uq" on "custom_entities_storage" ("entity_type", "entity_id", "tenant_id") where "tenant_id" is not null and "organization_id" is null;`);
    this.addSql(`create unique index "custom_entities_storage_org_uq" on "custom_entities_storage" ("entity_type", "entity_id", "organization_id") where "tenant_id" is null and "organization_id" is not null;`);
    this.addSql(`create unique index "custom_entities_storage_global_uq" on "custom_entities_storage" ("entity_type", "entity_id") where "tenant_id" is null and "organization_id" is null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "custom_entities_storage_global_uq";`);
    this.addSql(`drop index if exists "custom_entities_storage_org_uq";`);
    this.addSql(`drop index if exists "custom_entities_storage_tenant_uq";`);
    this.addSql(`drop index if exists "custom_entities_storage_scope_uq";`);
  }

}
