import { Migration } from '@mikro-orm/migrations'

/**
 * `action_logs.visibility_scope` — who a recorded act was written for.
 *
 * Decided by the code that performs the act, at the moment it is recorded, so a
 * report never has to infer sensitivity from a payload. Inference is where leaks
 * come from: a query that guesses will guess wrong once, and once is enough when
 * what it is guessing about is whether a private act belongs in a shared
 * timeline.
 *
 * **`not null default 'tenant'`, and both halves matter.** `tenant` is exactly
 * the audience every existing row already had, so backfilling to it changes
 * nothing that anybody can currently see — this migration introduces a
 * vocabulary, not a new restriction. And `not null` because a null would have to
 * be interpreted at read time by every query that touches the table, which is the
 * inference this column exists to remove.
 *
 * The index leads with `tenant_id` and ends with `created_at` to match the shape
 * the audit list already sorts and pages by, with the new predicate in between.
 */
export class Migration20260811100000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "action_logs" add column "visibility_scope" text not null default 'tenant';`)
    this.addSql(`create index "action_logs_visibility_scope_idx" on "action_logs" ("tenant_id", "visibility_scope", "created_at");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "action_logs_visibility_scope_idx";`)
    this.addSql(`alter table "action_logs" drop column "visibility_scope";`)
  }

}
