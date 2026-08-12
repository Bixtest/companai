import { Migration } from '@mikro-orm/migrations'

/**
 * `api_keys.principal_kind` — the column that gives `ai_worker` a producer.
 *
 * **The gap this closes.** `ai_worker` was one of four principal kinds and the
 * only one nothing could create. No authentication path could issue a subject
 * that parsed to it, so no ceiling, delegation, trust grant or denial could
 * target a machine, and the effect-class matrix — which exists to bound
 * machines and delegated authority — never engaged. The kind was a type with no
 * inhabitants.
 *
 * **Why an API key rather than a new table.** An AI worker needs a credential,
 * and a key already is one: hashed, revocable, org-scoped, rate-limited and
 * role-bearing. A parallel identity system would have duplicated every one of
 * those controls and given us two places for them to drift apart. Marking a key
 * changes only the subject it issues — `ai_worker:<id>` instead of
 * `api_key:<id>` — which is enough for the resolver, the journal and the ledger
 * to see a machine.
 *
 * **Nullable, and null means `service`.** Every key issued before this column
 * existed is exactly what it always was. There is no backfill because there is
 * nothing to infer: a key is an AI worker only because somebody said so.
 *
 * No check constraint on the value. The application validates it against the
 * principal vocabulary, and a constraint here would have to be altered every
 * time that vocabulary grows — coupling a migration to a type.
 */
export class Migration20260812180000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "api_keys" add column if not exists "principal_kind" text null;`)

    // Partial: the overwhelming majority of keys are ordinary services and carry
    // null. Only the marked ones are worth an index entry, and the question this
    // answers — "which credentials act as machines in this tenant" — only ever
    // asks about those.
    this.addSql(`create index if not exists "api_keys_principal_kind_idx"
      on "api_keys" ("tenant_id", "principal_kind")
      where "principal_kind" is not null;`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "api_keys_principal_kind_idx";`)
    this.addSql(`alter table "api_keys" drop column if exists "principal_kind";`)
  }
}
