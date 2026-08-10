import { Migration } from '@mikro-orm/migrations';

// U2: the *Apply to roles* switches on Sidebar customization could not tell the
// truth, because a role preset stored a copy of the settings and no reference to
// the layout it came from. "This role has a preset" was all the screen knew, so
// every save started from a false baseline and one routine save could delete
// every role's sidebar configuration.
//
// `variant_id` records where a preset came from. Deliberately no foreign key: a
// variant is one person's saved layout and may be deleted, while the preset it
// produced must survive that. A dangling id stops matching and reads as "from a
// layout that is no longer here", which is true; a cascade would delete a role's
// sidebar because somebody tidied up their own saved views.
//
// Existing rows keep `null`, meaning the source is unknown. That is the honest
// value — nothing recorded it — and the screen treats unknown as "do not touch"
// rather than guessing.
export class Migration20260810090000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "role_sidebar_preferences" add column if not exists "variant_id" uuid null;`);
    this.addSql(`create index if not exists "role_sidebar_preferences_variant_id_idx" on "role_sidebar_preferences" ("variant_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "role_sidebar_preferences_variant_id_idx";`);
    this.addSql(`alter table "role_sidebar_preferences" drop column if exists "variant_id";`);
  }

}
