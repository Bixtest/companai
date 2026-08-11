import { Migration } from '@mikro-orm/migrations'

/**
 * Projects, their members, and the records that belong to them (G4).
 *
 * The platform scoped by tenant and organisation only, which describes structure.
 * A legal case or a client engagement pulls people from several departments and
 * needs its own rules inside it (SRS FR-550, FR-560).
 *
 * **Three tables, and the third is the one that makes it work.**
 * `authority_project_records` maps a record into a project, which is how the
 * resolver learns that an act is happening inside one: the command gate already
 * reads `payload.id` for record locks, so this reuses an identifier it has rather
 * than adding a declaration to every command.
 *
 * **One project per record** is enforced by a unique constraint. A record in two
 * matters would yield two overlays and no rule for choosing between them.
 */
export class Migration20260811200000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "authority_projects" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "organization_id" uuid null,
      "name" text not null,
      "grade" text null,
      "closed_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "authority_projects_pkey" primary key ("id")
    );`)

    this.addSql(`create table "authority_project_memberships" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "project_id" uuid not null,
      "principal_id" text not null,
      "principal_kind" text not null,
      "permission_overlay" jsonb null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "authority_project_memberships_pkey" primary key ("id")
    );`)
    this.addSql(`alter table "authority_project_memberships" add constraint "authority_project_memberships_uniq" unique ("project_id", "principal_id");`)

    this.addSql(`create table "authority_project_records" (
      "id" uuid not null default gen_random_uuid(),
      "tenant_id" uuid not null,
      "project_id" uuid not null,
      "record_id" uuid not null,
      "created_at" timestamptz not null default now(),
      constraint "authority_project_records_pkey" primary key ("id")
    );`)
    this.addSql(`alter table "authority_project_records" add constraint "authority_project_records_uniq" unique ("tenant_id", "record_id");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "authority_project_records" cascade;`)
    this.addSql(`drop table if exists "authority_project_memberships" cascade;`)
    this.addSql(`drop table if exists "authority_projects" cascade;`)
  }

}
