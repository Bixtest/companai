import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-128` — the foundational tenant is a fact the database can state.
 *
 * **Why a column and not a convention.** Option A (taken by the owner 2026-10-19) says the platform's
 * admins live *inside* the foundational tenant, and other tenants inherit — or are limited to — what it
 * allows. That makes one tenant special, and before this migration nothing in the schema said which:
 * it would have been "the oldest row", "the one called `platform`", or a config value nobody validated.
 * `CC-133` records that this is Option A's weakness — the foundation is special **by convention** — and
 * a boolean with a uniqueness guarantee is the smallest thing that stops it being a guess.
 *
 * **Why `is_foundational` and not a parent link.** `CC-133` keeps Option B (a platform identity *above*
 * every tenant) reachable, and the whole argument for choosing A was that **A is a strict subset of B's
 * shape** so B is additive later. A parent link is B's shape half-built — the version that would make B
 * harder. A boolean is additive: B can keep it and add a layer above.
 *
 * **The uniqueness is the point.** `tenants_one_foundational_uq` is a partial unique index over
 * `("is_foundational") where "is_foundational"` — so at most one row can be true, and the database says
 * so rather than a service remembering to check. Two "platform" tenants would make every inheritance
 * rule ambiguous, which is the defect this row exists to remove.
 *
 * **`not null default false`, deliberately.** A nullable boolean would give three states where two are
 * meaningful, and every reader would have to decide what `null` meant. Existing tenants are not
 * foundational; that is a true statement about them, not a missing value.
 */
export class Migration20261019070000_directory extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "tenants"
        add column "is_foundational" boolean not null default false;
    `)
    // Partial: the index holds at most one entry, so the constraint costs nothing
    // and cannot be satisfied twice.
    this.addSql(`
      create unique index "tenants_one_foundational_uq"
        on "tenants" ("is_foundational")
        where "is_foundational";
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "tenants_one_foundational_uq";`)
    this.addSql(`alter table "tenants" drop column if exists "is_foundational";`)
  }
}
