import { Migration } from '@mikro-orm/migrations'

/**
 * `record_locks` — a record frozen or restricted, whatever anybody's authority.
 *
 * Restores a control the fork dropped: excluding `packages/enterprise` in S2 took
 * record locking out of the platform entirely.
 *
 * **The unique constraint is on `(tenant_id, record_id)`** and carries the whole
 * design decision. Keying on entity type as well would need a per-command
 * declaration the bus does not have; record ids are v4 UUIDs, so the id alone is
 * unique in any practical sense. `command_hint` is display only and deliberately
 * outside the key — two capabilities touching one record must produce one lock.
 *
 * **One index, not two.** The unique constraint creates it, and every read in
 * `RecordLockService` is a lookup by `(tenant_id, record_id)` or a scan by tenant
 * — both served by that same index, since `tenant_id` leads it. A second index
 * would cost a write on every lock change to answer nothing new.
 */
export class Migration20260811140000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "record_locks" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "organization_id" uuid null,
      "record_id" uuid not null,
      "lock_state" text not null,
      "reason" text null,
      "command_hint" text null,
      "locked_by_user_id" uuid null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "record_locks_pkey" primary key ("id")
    );`)
    this.addSql(`alter table "record_locks" add constraint "record_locks_tenant_record_uniq" unique ("tenant_id", "record_id");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "record_locks" cascade;`)
  }

}
