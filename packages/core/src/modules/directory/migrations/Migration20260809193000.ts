import { Migration } from '@mikro-orm/migrations';

/**
 * R6 — typed organization edges carrying authority.
 *
 * The existing tree (`parent_id` plus the `ancestor_ids` / `descendant_ids`
 * closure columns) stays exactly as it is and remains the index every scoped
 * query uses. This adds what that tree cannot carry: what kind of relationship
 * each link is, how much inherits across it, and the ceiling on authority
 * flowing down it.
 *
 * **Seeded so that nothing changes on the day it lands.** Every existing
 * parent-child link gets one `owns` / `strict` / `A5` edge — the most permissive
 * combination, which imposes nothing. The mechanism exists from now on, and
 * lowering a ceiling is a deliberate act somebody performs rather than a
 * behaviour change that arrives with a deploy.
 */
export class Migration20260809193000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "organization_edges" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "parent_id" uuid not null,
      "child_id" uuid not null,
      "relationship_type" text not null default 'owns',
      "inheritance_mode" text not null default 'strict',
      "authority_ceiling" text not null default 'A5',
      "module_grants" jsonb null,
      "note" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "organization_edges_pkey" primary key ("id")
    );`);

    this.addSql(`alter table "organization_edges" add constraint "organization_edges_pair_uniq"
      unique ("tenant_id", "parent_id", "child_id", "relationship_type");`);

    // An edge from a node to itself would make a cycle of length one and give
    // the walk nothing to terminate on.
    this.addSql(`alter table "organization_edges" add constraint "organization_edges_no_self_ck"
      check ("parent_id" <> "child_id");`);

    this.addSql(`alter table "organization_edges" add constraint "organization_edges_ceiling_ck"
      check ("authority_ceiling" in ('A0','A1','A2','A3','A4','A5'));`);

    this.addSql(`alter table "organization_edges" add constraint "organization_edges_mode_ck"
      check ("inheritance_mode" in ('strict','flexible','reference_only','none'));`);

    this.addSql(`alter table "organization_edges" add constraint "organization_edges_type_ck"
      check ("relationship_type" in ('owns','manages','advises','serves','licenses','templates','supervises'));`);

    this.addSql(`create index "organization_edges_child_idx" on "organization_edges" ("tenant_id", "child_id");`);
    this.addSql(`create index "organization_edges_parent_idx" on "organization_edges" ("tenant_id", "parent_id");`);

    // Seed the existing tree. `on conflict do nothing` keeps the migration
    // repeatable and keeps a re-run from disturbing an edge somebody has since
    // narrowed by hand.
    this.addSql(`insert into "organization_edges" ("tenant_id", "parent_id", "child_id", "relationship_type", "inheritance_mode", "authority_ceiling", "note")
      select o."tenant_id", o."parent_id", o."id", 'owns', 'strict', 'A5',
             'Seeded from the existing organization tree by R6; imposes no constraint'
        from "organizations" o
       where o."parent_id" is not null
         and o."deleted_at" is null
      on conflict do nothing;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "organization_edges" cascade;`);
  }

}
