import { Migration } from '@mikro-orm/migrations'

/**
 * The bare id, finally — `CC-124`'s data half.
 *
 * **The defect.** The authority tables store a principal as a **bare id with the
 * kind in a sibling column**: `subject_principal_id` / `subject_kind`,
 * `grantor_principal_id` / `grantor_kind`, `grantee_principal_id` /
 * `grantee_kind`, `principal_id` / `principal_kind`. That is the platform's
 * convention — the one `audit_logs`.`actor_user_id` states on its own column.
 *
 * The write paths did not keep it. `POST api/authority/denials` accepted whatever
 * string arrived (`subjectPrincipalId: z.string()`), and the entity's docblock
 * told the reader that an API key acting *is* `api_key:<id>`. So an administrator
 * following the documentation wrote `ai_worker:<key-id>` with
 * `subjectKind: 'ai_worker'` — and `withheldFromThisPerson` looked up the **bare**
 * id (`rbacService.ts:529-532`), which is what it has always passed. The row was
 * written, audited, listed by `GET` and by `mercato auth denials`, and **nothing
 * was denied**. A machine was un-denyable: the exact thing
 * `AI_WORKER_SUBJECT_PREFIX` had been added to prevent.
 *
 * The code half is `normalizePrincipalSubject` in
 * `packages/shared/src/lib/auth/principal.ts` — the narrowing now happens on the
 * way in, at the boundary, and a prefix that disagrees with the declared kind is
 * refused rather than resolved by guessing. This migration does the same to the
 * rows that already exist, because a normalisation nobody applies to the data is
 * a comment.
 *
 * **Three rules, and the second is the one that matters:**
 *
 *  1. A prefix that **agrees** with the sibling kind column is stripped — the row
 *     becomes the bare id the enforcement path looks for.
 *  2. A prefix that **disagrees** is left alone and warned about. A row whose id
 *     and kind name different actors is data nobody can act on; rewriting either
 *     half would be a guess, and the warning is what makes it somebody's
 *     decision rather than a silent state.
 *  3. A bare id is left alone. There is nothing to strip, which is also what
 *     makes this idempotent: a second run moves zero rows.
 *
 * **Reversible, and the direction says so.** `down()` puts the prefix back,
 * which is a faithful undo — and it deliberately re-creates the encoding that
 * made `CC-124` possible. Rolling this back without the code change reopens the
 * denial path, which is the honest statement of what a reverse means here.
 *
 * **Pre-flight, measured.** There is **no unique index** on these columns
 * (`Migration20260812100000.ts:49` is a *plain* partial index,
 * `where lifted_at is null`; the entity carries no `@Unique` either), so a
 * rewrite cannot fail on a conflict, and a duplicate subject is harmless for a
 * subtraction anyway — two identical denials are one denial. Rows disagreeing on
 * prefix and kind were never writable through the boundary this ships with, so on
 * a database that never saw the old route this migration moves only rows written
 * in the documented-but-wrong form.
 */
export class Migration20261018120000 extends Migration {

  /** Strip the encoding prefix where the sibling kind column says it may. */
  private normalise(
    table: string,
    column: string,
    kindColumn: string,
  ): void {
    this.addSql(`
      update "${table}"
         set "${column}" = regexp_replace("${column}", '^(ai_worker:|api_key:)', ''),
             "updated_at" = now()
       where ("${kindColumn}" = 'ai_worker' and "${column}" like 'ai_worker:%')
          or ("${kindColumn}" = 'service'   and "${column}" like 'api_key:%');
    `)
  }

  /** `normalise`'s inverse, for a `down()` that is a real reverse. */
  private denormalise(
    table: string,
    column: string,
    kindColumn: string,
  ): void {
    this.addSql(`
      update "${table}"
         set "${column}" = case "${kindColumn}" when 'ai_worker' then 'ai_worker:' else 'api_key:' end || "${column}",
             "updated_at" = now()
       where "${kindColumn}" in ('ai_worker', 'service')
         and not ("${kindColumn}" = 'ai_worker' and "${column}" like 'ai_worker:%')
         and not ("${kindColumn}" = 'service'   and "${column}" like 'api_key:%');
    `)
  }

  /**
   * Rows whose two halves name different actors. Left untouched by design — the
   * warning is the deliverable — because choosing which half was meant is a data
   * decision, not a schema one.
   */
  private warnOnDisagreement(
    table: string,
    column: string,
    kindColumn: string,
  ): void {
    this.addSql(`
      do $$
      declare bad_count integer;
      begin
        select count(*) into bad_count
          from "${table}"
         where ("${kindColumn}" = 'ai_worker' and "${column}" like 'api_key:%')
            or ("${kindColumn}" = 'service'   and "${column}" like 'ai_worker:%');
        if bad_count > 0 then
          raise warning 'CC-124: % row(s) in ${table} carry a prefix that disagrees with ${kindColumn} — left untouched, see PLAN-CC-124', bad_count;
        end if;
      end $$;
    `)
  }

  override up(): void | Promise<void> {
    // Warnings first, so the counts are read before anything moves.
    this.warnOnDisagreement('authority_denials', 'subject_principal_id', 'subject_kind')
    this.warnOnDisagreement('authority_delegations', 'grantor_principal_id', 'grantor_kind')
    this.warnOnDisagreement('authority_delegations', 'grantee_principal_id', 'grantee_kind')
    this.warnOnDisagreement('authority_project_memberships', 'principal_id', 'principal_kind')

    this.normalise('authority_denials', 'subject_principal_id', 'subject_kind')
    this.normalise('authority_delegations', 'grantor_principal_id', 'grantor_kind')
    this.normalise('authority_delegations', 'grantee_principal_id', 'grantee_kind')
    this.normalise('authority_project_memberships', 'principal_id', 'principal_kind')
  }

  override down(): void | Promise<void> {
    // The inverse, by name: put the encoding back where the kind says it belongs.
    // This restores the state that made CC-124 possible, which is what a reverse
    // of a normalisation means — rolling this back without the code change
    // reopens the denial path.
    this.denormalise('authority_denials', 'subject_principal_id', 'subject_kind')
    this.denormalise('authority_delegations', 'grantor_principal_id', 'grantor_kind')
    this.denormalise('authority_delegations', 'grantee_principal_id', 'grantee_kind')
    this.denormalise('authority_project_memberships', 'principal_id', 'principal_kind')
  }
}
