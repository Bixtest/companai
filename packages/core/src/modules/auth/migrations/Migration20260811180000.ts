import { Migration } from '@mikro-orm/migrations'

/**
 * `authority_trust_grants` — how much autonomy a principal has earned.
 *
 * **Per capability group, not global** (planning 02 §5.1). A worker can be
 * trusted with research reads and supervised on external communication, and one
 * number would be either uselessly conservative or dangerously optimistic.
 *
 * **A missing row means `T0`.** That is why there is no default on `tier` and no
 * backfill: absence is the bottom of the scale, and this is the one table whose
 * absence must not grant anything.
 *
 * The unique constraint is the whole key — one tier per principal per group.
 * Two rows would mean two answers to "what may this worker do here", and the
 * resolver would take whichever the query happened to return first.
 */
export class Migration20260811180000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "authority_trust_grants" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "principal_id" text not null,
      "principal_kind" text not null,
      "capability_group" text not null,
      "tier" text not null,
      "evidence_json" jsonb null,
      "unverified_json" jsonb null,
      "granted_by_user_id" uuid null,
      "reason" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "authority_trust_grants_pkey" primary key ("id")
    );`)
    this.addSql(`alter table "authority_trust_grants" add constraint "authority_trust_grants_uniq" unique ("tenant_id", "principal_id", "capability_group");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "authority_trust_grants" cascade;`)
  }

}
