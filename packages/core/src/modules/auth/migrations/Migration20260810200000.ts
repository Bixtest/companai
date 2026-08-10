import { Migration } from '@mikro-orm/migrations';

// Acts that already happened and still need looking at.
//
// Gate A4 is "execute and review": the act takes effect immediately and enters a
// review queue. That is the opposite shape from A1/A2, which hold an act that has
// not happened — so this is its own table rather than a status on
// `authority_pending_acts`. One table whose rows mean "not yet" or "already did"
// depending on a kind column is how a schema starts lying to whoever reads it
// next.
//
// Deliberately no deadline. An approval nobody answers must expire, because work
// is blocked behind it. A review nobody does blocks nothing, and must not
// quietly disappear — an unreviewed act is exactly what somebody should still be
// able to find next quarter.
export class Migration20260810200000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table if not exists "authority_act_reviews" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "organization_id" uuid null,
      "command_id" text not null,
      "capability_id" text not null,
      "action_log_id" uuid null,
      "actor_id" text not null,
      "actor_kind" text not null,
      "gate" text not null,
      "binding_rule" text not null,
      "decision" jsonb not null,
      "status" text not null default 'awaiting',
      "reviewed_at" timestamptz null,
      "reviewed_by_user_id" uuid null,
      "review_note" text null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      constraint "authority_act_reviews_pkey" primary key ("id")
    );`);
    this.addSql(`create index if not exists "authority_act_reviews_queue_idx" on "authority_act_reviews" ("tenant_id", "status", "created_at");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "authority_act_reviews";`);
  }

}
