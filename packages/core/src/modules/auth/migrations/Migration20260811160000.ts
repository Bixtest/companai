import { Migration } from '@mikro-orm/migrations'

/**
 * `authority_delegations` — authority lent for a while, and taken back.
 *
 * The platform had no way to do this. Role and user ACLs are both permanent until
 * somebody edits them, so covering a colleague for a fortnight meant granting a
 * role and remembering to remove it. Nobody remembers, and the grant becomes
 * permanent by neglect.
 *
 * **Both principal columns are `text`, not `uuid`.** A principal id is not always
 * a bare UUID — an API key acting is `api_key:<id>` — and forcing the column to
 * `uuid` would make machine actors unrepresentable, which is the one thing R1
 * existed to prevent.
 *
 * **`reason` and `expires_at` are `not null` on purpose.** A delegation without a
 * reason cannot be evaluated later, and one without an end is a role grant
 * wearing a costume.
 *
 * The index is partial — `where revoked_at is null` — because every lookup asks
 * for delegations that are still in force, and revoked rows are kept for the
 * record rather than for querying. Leading with the grantee and the capability
 * matches the only question the grant path asks: *may this actor do this thing?*
 */
export class Migration20260811160000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "authority_delegations" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "organization_id" uuid null,
      "grantor_principal_id" text not null,
      "grantor_kind" text not null,
      "grantee_principal_id" text not null,
      "grantee_kind" text not null,
      "capability_id" text not null,
      "authority_ceiling" text null,
      "starts_at" timestamptz not null,
      "expires_at" timestamptz not null,
      "revoked_at" timestamptz null,
      "revoked_by_user_id" uuid null,
      "reason" text not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "authority_delegations_pkey" primary key ("id")
    );`)
    this.addSql(`create index "authority_delegations_active_idx" on "authority_delegations" ("tenant_id", "grantee_principal_id", "capability_id", "expires_at") where "revoked_at" is null;`)
    // A window that ends before it starts is not a delegation. Enforced here as
    // well as in the service, because a bad row written by any future path is a
    // grant nobody intended.
    this.addSql(`alter table "authority_delegations" add constraint "authority_delegations_window_chk" check ("expires_at" > "starts_at");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "authority_delegations" cascade;`)
  }

}
