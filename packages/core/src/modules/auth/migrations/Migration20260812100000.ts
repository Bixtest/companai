import { Migration } from '@mikro-orm/migrations'

/**
 * `authority_denials` — a permission taken away from one person.
 *
 * The gap this closes: permissions arrive through roles, so stopping one person
 * doing one thing meant removing their whole role and with it nine things they
 * still needed, or inventing a bespoke role. Neither is a control; the first is
 * collateral damage and the second is how role lists become unreadable.
 *
 * **`subject_principal_id` is `text`, not `uuid`, and holds the BARE id.**
 * `subject_kind` holds the kind — the convention `audit_logs`.`actor_user_id`
 * states on its own column. A text column is what keeps a *credential's* id in a
 * column that also holds a *person's*, which is the opposite of making machine
 * actors undeniable (R1). A prefixed subject is accepted at the boundary and
 * narrowed to the bare id on the way in.
 *
 * *(Corrected 2026-10-18, `CC-124`: this comment used to read *"an API key acting
 * is `api_key:<id>`"*, as though the column carried the prefix. It does not and
 * must not — the enforcement path passes the bare id, so a denial written the way
 * this comment instructed was written, audited and never applied. The column was
 * right; the sentence was the defect.)*
 *
 * **`reason` is `not null`, `expires_at` is nullable.** The pair is deliberate
 * and is the mirror image of `authority_delegations`, where the reason is
 * likewise mandatory but the expiry is not optional. A grant with no end is a
 * role grant wearing a costume. A subtraction with no end is a standing
 * decision, and forcing it to lapse would quietly restore a permission somebody
 * removed on purpose.
 *
 * The index is partial — `where lifted_at is null` — because every lookup asks
 * for denials still in force, and lifted rows are kept for the record rather
 * than for querying. Leading with the subject matches the only question the
 * permission path asks: *is anything withheld from this actor?*
 */
export class Migration20260812100000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "authority_denials" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "organization_id" uuid null,
      "subject_principal_id" text not null,
      "subject_kind" text not null,
      "feature_pattern" text not null,
      "starts_at" timestamptz not null,
      "expires_at" timestamptz null,
      "lifted_at" timestamptz null,
      "lifted_by_user_id" uuid null,
      "created_by_user_id" uuid null,
      "reason" text not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "authority_denials_pkey" primary key ("id")
    );`)

    this.addSql(`create index "authority_denials_subject_idx"
      on "authority_denials" ("tenant_id", "subject_principal_id")
      where "lifted_at" is null;`)

    // A denial must expire after it starts, or it is a row that can never apply
    // and will be read as a control that is working.
    this.addSql(`alter table "authority_denials" add constraint "authority_denials_window_chk"
      check ("expires_at" is null or "expires_at" > "starts_at");`)

    // A reason that is only whitespace is no reason. The application checks this
    // too; the constraint is here because the application is not the only thing
    // that has ever written to this database.
    this.addSql(`alter table "authority_denials" add constraint "authority_denials_reason_chk"
      check (btrim("reason") <> '');`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "authority_denials" cascade;`)
  }
}
