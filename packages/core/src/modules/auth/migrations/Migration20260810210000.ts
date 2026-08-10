import { Migration } from '@mikro-orm/migrations';

// Gate A3 — hold and commit unless vetoed.
//
// The act does not run now. It runs *by itself* once its window passes, unless
// somebody objects first. That is the opposite of the approval deadline already
// on this table: `expires_at` means "this never happens now", `commit_at` means
// "this happens now".
//
// They are separate columns on purpose. One column plus a branch on status would
// put those two outcomes a single typo apart, on a table whose entire job is
// deciding whether something happens.
export class Migration20260810210000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "authority_pending_acts" add column if not exists "commit_at" timestamptz null;`);
    // The sweep asks one question: which acts are due to run? Answering it with
    // an index means a scheduled job every minute costs nothing at rest.
    this.addSql(`create index if not exists "authority_pending_acts_commit_idx" on "authority_pending_acts" ("status", "commit_at") where "commit_at" is not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "authority_pending_acts_commit_idx";`);
    this.addSql(`alter table "authority_pending_acts" drop column if exists "commit_at";`);
  }

}
