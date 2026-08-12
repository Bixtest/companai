import { Migration } from '@mikro-orm/migrations'

/**
 * U12 — a deleted row must stop reserving its unique code.
 *
 * **The bug.** `currencies_code_scope_unique` was a plain unique constraint on
 * `(organization_id, tenant_id, code)` with no regard for `deleted_at`. Both
 * tables soft-delete, so once a currency was deleted its code was reserved
 * forever: the application's own duplicate check correctly excluded deleted rows
 * and said "go ahead", the insert then violated the constraint, and the error
 * was mapped back to *"Currency code already exists for this organization"* —
 * naming a row the user cannot see anywhere.
 *
 * Reproduced 2026-08-12: a soft-deleted `XTS` from three days earlier blocked
 * creating `XTS`, while every list showed no such currency.
 *
 * **The fix is to make the constraint say what the application already
 * believes** — no two *live* rows may share a code. A partial unique index is
 * the only shape that expresses that, and `@Unique` cannot generate one, so the
 * entities drop the decorator and this migration becomes the source of truth.
 * That is the pattern `users_tenant_email_hash_uniq` already uses here, so it is
 * precedent rather than invention.
 *
 * **Two soft-deleted rows may now share a code.** That is correct and is the
 * point: history is allowed to repeat, live data is not.
 *
 * **Undoing a delete can now collide**, where before it could not. The commands
 * check for a live row first and refuse with a clear conflict rather than
 * letting the database raise a raw violation — restoring a currency whose code
 * somebody has since reused is a genuine conflict and must be refused, not
 * resolved by guessing.
 */
export class Migration20260812120000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "currencies" drop constraint if exists "currencies_code_scope_unique";`)
    this.addSql(`create unique index "currencies_code_scope_unique"
      on "currencies" ("organization_id", "tenant_id", "code")
      where "deleted_at" is null;`)

    this.addSql(`alter table "exchange_rates" drop constraint if exists "exchange_rates_pair_datetime_source_unique";`)
    this.addSql(`create unique index "exchange_rates_pair_datetime_source_unique"
      on "exchange_rates" ("organization_id", "tenant_id", "from_currency_code", "to_currency_code", "date", "source")
      where "deleted_at" is null;`)
  }

  /**
   * Reversing this can fail, and that is honest rather than a defect.
   *
   * If any two soft-deleted rows share a code — which this migration makes
   * legal — the old blanket constraint cannot be recreated. There is no correct
   * automatic answer to that, because choosing which historical row to destroy
   * is not a decision a migration should take.
   */
  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "currencies_code_scope_unique";`)
    this.addSql(`alter table "currencies" add constraint "currencies_code_scope_unique"
      unique ("organization_id", "tenant_id", "code");`)

    this.addSql(`drop index if exists "exchange_rates_pair_datetime_source_unique";`)
    this.addSql(`alter table "exchange_rates" add constraint "exchange_rates_pair_datetime_source_unique"
      unique ("organization_id", "tenant_id", "from_currency_code", "to_currency_code", "date", "source");`)
  }
}
