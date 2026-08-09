import { Migration } from '@mikro-orm/migrations';

/**
 * U7 — record what kind of principal acted.
 *
 * `actor_user_id` is a uuid column and the subject is narrowed to one on the way
 * in, so `api_key:<uuid>` has always been stored as the bare uuid. A key acting
 * and a person acting were indistinguishable in the journal.
 *
 * The column is nullable and **null means unknown, not human**. Rows written
 * before it existed cannot have their kind recovered from the row alone; the
 * `audit_logs backfill-actor-kind` command infers what it can by matching
 * against the api-key table and leaves the rest null, because a guess recorded
 * as a fact is worse than an absence.
 */
export class Migration20260809235000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "action_logs" add column "actor_kind" text null;`);
    this.addSql(`create index "action_logs_actor_kind_idx" on "action_logs" ("tenant_id", "actor_kind", "created_at");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "action_logs_actor_kind_idx";`);
    this.addSql(`alter table "action_logs" drop column "actor_kind";`);
  }

}
