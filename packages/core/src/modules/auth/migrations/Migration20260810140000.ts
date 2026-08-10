import { Migration } from '@mikro-orm/migrations';

// Acts the resolver held.
//
// Enforcement could refuse an act outright and nothing else: gates A1-A4 —
// approve-first, hold-and-commit, review-afterwards — were recorded as
// obligations and did not bind. "Approve first" was a sentence in a log rather
// than a control.
//
// A held act stores the command, its input, the actor whose authority it was
// resolved against, and the whole decision that held it. Approving it runs the
// command; rejecting or expiring it never does.
//
// `expires_at` is not null on purpose (planning 02 §7.2). A request that can sit
// forever becomes a queue nobody trusts, and silently blocking work is worse
// than saying no.
export class Migration20260810140000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table if not exists "authority_pending_acts" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "organization_id" uuid null,
      "command_id" text not null,
      "capability_id" text not null,
      "command_input" jsonb not null,
      "actor_id" text not null,
      "actor_kind" text not null,
      "gate" text not null,
      "binding_rule" text not null,
      "decision" jsonb not null,
      "status" text not null default 'pending',
      "expires_at" timestamptz not null,
      "resolved_at" timestamptz null,
      "resolved_by_user_id" uuid null,
      "resolution_note" text null,
      "failure_reason" text null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      constraint "authority_pending_acts_pkey" primary key ("id")
    );`);
    this.addSql(`create index if not exists "authority_pending_acts_queue_idx" on "authority_pending_acts" ("tenant_id", "status", "expires_at");`);
    this.addSql(`create index if not exists "authority_pending_acts_actor_idx" on "authority_pending_acts" ("tenant_id", "actor_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "authority_pending_acts";`);
  }

}
