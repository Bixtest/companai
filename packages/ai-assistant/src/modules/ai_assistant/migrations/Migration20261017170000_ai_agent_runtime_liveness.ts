import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-102` — the two columns slice 1 withheld, and one it did not foresee.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY `last_seen_at` LANDS NOW AND NOT THEN
 * ─────────────────────────────────────────────────────────────────────────────
 * Slice 1 refused `status` and `last_seen_at` on purpose, and wrote the reason
 * into the entity's docblock: *"Liveness needs a heartbeat writer and this
 * codebase has no probe that beats one; a column claiming 'online' that nothing
 * sets is the same defect this object exists to remove — a declaration nothing
 * reads — pointed the other way. They land with the probe."*
 *
 * **This migration is the probe.** `AiAgentRuntimeRepository.touch()` writes this
 * column, and the `ai:runtime:touch` command calls it. The column arrives with its
 * writer, which is the condition slice 1 set.
 *
 * `status` is still refused, and the refusal is not a postponement: a timestamp
 * answers *"when did this machine last speak"*, which is a fact; `status` answers
 * *"is it online"*, which is a **verdict** and needs a sweeper to keep it true.
 * Taking the fact and refusing the verdict is the smaller, honest choice
 * (`multica-main/server/pkg/db/queries/runtime.sql:178-193` has both, and its own
 * comment explains that the `status = 'online'` predicate is load-bearing *because*
 * a sweeper races the heartbeat).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY `legacy_daemon_id`
 * ─────────────────────────────────────────────────────────────────────────────
 * `daemon_id` is the runtime's identity, and it is caller-supplied text. The donor
 * moved the same column from `os.Hostname()` to a persistent UUID and kept the old
 * value for audit (`multica-main/server/migrations/048_runtime_daemon_uuid.up.sql:1-6`):
 *
 *   *"Runtime identity is moving from `os.Hostname()` to a persistent daemon UUID.
 *    `legacy_daemon_id` records the most recent hostname-derived daemon_id that was
 *    merged into this row so the previous identity remains traceable for debugging
 *    and audit after the old row is deleted."*
 *
 * We take the same shape, one step smaller: `daemon_id` is **validated as a UUID**
 * at the repository boundary (so a hostname can no longer be passed at all), and a
 * rename records the previous value here instead of leaving two live rows and a
 * permanent `AiAgentRuntimeAmbiguousError`.
 *
 * The index is the read path for the question `SR-12` will ask — *"which of this
 * tenant's runtimes is alive"* — and it is partial for the same reason every other
 * index on this table is: a retired row is history, not a candidate.
 */
export class Migration20261017170000_ai_agent_runtime_liveness extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "ai_agent_runtimes"
        add column "last_seen_at" timestamptz null,
        add column "legacy_daemon_id" text null;
    `)
    this.addSql(`
      create index "ai_agent_runtimes_tenant_last_seen_idx"
        on "ai_agent_runtimes" ("tenant_id", "last_seen_at" desc)
        where "deleted_at" is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "ai_agent_runtimes_tenant_last_seen_idx";`)
    this.addSql(`
      alter table "ai_agent_runtimes"
        drop column if exists "last_seen_at",
        drop column if exists "legacy_daemon_id";
    `)
  }
}
