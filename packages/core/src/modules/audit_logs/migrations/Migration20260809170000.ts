import { Migration } from '@mikro-orm/migrations';

/**
 * R3 — the hash-chained ledger.
 *
 * Two things here are not ordinary schema and are the point of the batch:
 *
 * 1. **The append-only trigger.** `ledger_events` rejects UPDATE and DELETE at
 *    the database, so the guarantee survives application bugs, a rogue script,
 *    and anyone holding a psql prompt. A chain that only the application refuses
 *    to rewrite protects against nobody worth protecting against.
 *
 * 2. **The unique key on (tenant_id, seq).** Two concurrent appends to the same
 *    tenant must not both claim the same position. The writer takes an advisory
 *    lock per tenant, and this constraint is what makes a failure of that lock a
 *    loud error rather than a silently forked chain.
 */
export class Migration20260809170000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "ledger_events" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "seq" bigint not null,
      "prev_hash" text null,
      "hash" text not null,
      "hash_version" int not null default 1,
      "ts" timestamptz not null,
      "event_type" text not null,
      "actor_kind" text null,
      "actor_id" text null,
      "organization_id" uuid null,
      "resource_kind" text null,
      "resource_id" text null,
      "correlation_id" text null,
      "causation_id" text null,
      "visibility" text not null default 'tenant',
      "payload" jsonb not null default '{}'::jsonb,
      "created_at" timestamptz not null default now(),
      constraint "ledger_events_pkey" primary key ("id")
    );`);

    this.addSql(`alter table "ledger_events" add constraint "ledger_events_tenant_seq_uq" unique ("tenant_id", "seq");`);
    this.addSql(`alter table "ledger_events" add constraint "ledger_events_tenant_hash_uq" unique ("tenant_id", "hash");`);
    this.addSql(`alter table "ledger_events" add constraint "ledger_events_seq_positive_ck" check ("seq" > 0);`);

    this.addSql(`create index "ledger_events_tenant_created_idx" on "ledger_events" ("tenant_id", "created_at");`);
    this.addSql(`create index "ledger_events_correlation_idx" on "ledger_events" ("tenant_id", "correlation_id");`);
    this.addSql(`create index "ledger_events_resource_idx" on "ledger_events" ("tenant_id", "resource_kind", "resource_id");`);

    // Append-only, enforced by the storage engine rather than by convention.
    //
    // The exception message names the table and the operation because the person
    // who trips this is usually writing a well-intentioned data fix and needs to
    // understand immediately that the fix is the problem.
    this.addSql(`create or replace function "ledger_events_append_only"() returns trigger as $$
begin
  raise exception 'ledger_events is append-only: % is not permitted. The hash chain is the record; correct a mistake by appending a correcting event, never by rewriting history.', tg_op
    using errcode = 'restrict_violation';
end;
$$ language plpgsql;`);

    this.addSql(`create trigger "ledger_events_append_only_trg"
      before update or delete on "ledger_events"
      for each row execute function "ledger_events_append_only"();`);

    // TRUNCATE bypasses row-level triggers entirely, so it needs its own.
    this.addSql(`create trigger "ledger_events_no_truncate_trg"
      before truncate on "ledger_events"
      for each statement execute function "ledger_events_append_only"();`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop trigger if exists "ledger_events_no_truncate_trg" on "ledger_events";`);
    this.addSql(`drop trigger if exists "ledger_events_append_only_trg" on "ledger_events";`);
    this.addSql(`drop function if exists "ledger_events_append_only"();`);
    this.addSql(`drop table if exists "ledger_events" cascade;`);
  }

}
