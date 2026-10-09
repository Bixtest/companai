import { Migration } from '@mikro-orm/migrations'

/**
 * `roles.is_core` — a core role is identified by a **column**, not by its name.
 *
 * **The gap this closes (CC-31(a)).** The platform ships one role that must
 * exist for the platform to be controllable: the roles-and-permissions manager
 * (`SPECIFICATIONS-DICTIONARY.md` §C.3 / `S9`). Until this migration the rule
 * "nobody may delete it" was keyed on the role's **name** (`superadmin`), which
 * is a *mutable* string — so renaming the role made the rule stop recognising
 * it, and the delete protection fell away silently. Recognising a protected
 * object by a field the user can change is a convention, not a guarantee.
 *
 * **Why a column and not a settings entry.** The object→tier *map* is a
 * superadmin setting (`SD-2b`, `module_configs` `core_boundary`/`coreObjectTiers`)
 * — that is where membership is decided. But the setting keys a role by its
 * **name**, so it inherits the same fragility. The column is the durable
 * identity: it travels with the row through a rename, so the setting can key on
 * it instead. Membership stays a setting (Ring 2); the *fact* that a given row
 * is core becomes a property of the row (Ring 1's rule can then be enforced
 * against something that cannot be renamed away).
 *
 * **Backfill, not default.** The column is added `not null default false`, then
 * the existing `superadmin` rows are set `true` in the same migration — so a
 * role created before this migration is recognised exactly as it was (by the
 * name `superadmin`), and nothing that was core ceases to be. The application
 * keeps the name check as a fallback for rows that predate this point and for
 * the boot order (see `core-objects.ts`), so there is no window in which the
 * platform is *less* protected than before.
 *
 * **Indexed.** The only question asked of this column is "which roles are core
 * in this tenant", so the index is partial — `where is_core` — matching the way
 * `authority_denials` indexes only the rows still in force.
 *
 * Source: `COMPLETION-CALLBACKS.md` CC-31(a); `CORE-BOUNDARY.md` §2, §5;
 * `DECISION-core-object-set-as-settings.md`; owner ruling 2026-10-09
 * ("nothing prevents us during development from changing a schema that is well
 * thought and well executed").
 */
export class Migration20261009090000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "roles" add column "is_core" boolean not null default false;`)

    // Backfill: the role the platform has always treated as core keeps that
    // status under the new, rename-proof marker. Case-folded to match the way
    // `core-objects.ts` has always compared the name.
    this.addSql(`update "roles" set "is_core" = true where lower(btrim("name")) = 'superadmin';`)

    this.addSql(`create index "roles_is_core_idx" on "roles" ("tenant_id") where "is_core";`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "roles_is_core_idx";`)
    this.addSql(`alter table "roles" drop column if exists "is_core";`)
  }
}
