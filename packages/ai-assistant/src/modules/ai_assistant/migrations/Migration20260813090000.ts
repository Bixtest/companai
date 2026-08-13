import { Migration } from '@mikro-orm/migrations'

/**
 * Token usage must record **what kind of actor** burned the tokens.
 *
 * **The defect.** `ai_token_usage_events.user_id` is `uuid not null`, and the
 * chat route passes `auth.sub` straight into it. For a person that is a bare
 * uuid and works. For a credential it is `api_key:<uuid>` — and now
 * `ai_worker:<uuid>` — which is not a uuid at all:
 *
 * ```text
 * DriverException: invalid input syntax for type uuid: "ai_worker:<id>"
 * ```
 *
 * It had never fired because no machine had ever run an agent. Giving
 * `ai_worker` a producer made it reachable, so this is a latent 500 turned live
 * by the previous change rather than a pre-existing bug found by luck.
 *
 * **And the deeper problem behind it.** Even if the write had succeeded, the
 * table could not answer *"how much did the machines cost us?"* — a machine
 * burning tokens autonomously was recorded identically to a person using the
 * assistant. That is the U7 asymmetry again, in the one table that will matter
 * when spend becomes a ceiling.
 *
 * **The shape mirrors `action_logs`**, deliberately, so both answer the same
 * question the same way:
 *
 * - `user_id` — the person this is attributable to. Now **nullable**, because a
 *   machine acting on its own has nobody to attribute it to, and a forced
 *   sponsor would be a fiction.
 * - `actor_kind` — `human`, `ai_worker` or `service`. Null means an entry
 *   written before this column existed.
 * - `actor_id` — the principal id as `text`, because a key id is not always a
 *   bare uuid and forcing the column would recreate the bug this fixes.
 */
export class Migration20260813090000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "ai_token_usage_events" alter column "user_id" drop not null;`)
    this.addSql(`alter table "ai_token_usage_events" add column if not exists "actor_kind" text null;`)
    this.addSql(`alter table "ai_token_usage_events" add column if not exists "actor_id" text null;`)

    // The question this table exists to answer once budgets are real: what did
    // each actor consume, in this tenant, over a period. Leading with the tenant
    // matches every other index here.
    this.addSql(`create index if not exists "ai_token_usage_events_actor_idx"
      on "ai_token_usage_events" ("tenant_id", "actor_kind", "created_at");`)
  }

  /**
   * Reversing this can fail, and honestly so: rows written by a machine have a
   * null `user_id`, and restoring the not-null constraint would need a person
   * to attribute them to. There is no correct automatic answer, so the down
   * migration deletes nothing and lets the constraint fail loudly instead.
   */
  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "ai_token_usage_events_actor_idx";`)
    this.addSql(`alter table "ai_token_usage_events" drop column if exists "actor_id";`)
    this.addSql(`alter table "ai_token_usage_events" drop column if exists "actor_kind";`)
    this.addSql(`alter table "ai_token_usage_events" alter column "user_id" set not null;`)
  }
}
