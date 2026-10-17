import { readFileSync } from 'node:fs'

/**
 * `SR-02` — the schema half of the machine/teammate split.
 *
 * What this suite proves, and what it deliberately cannot:
 *
 * - It proves the migration **declares** the four partial unique indexes, with the
 *   right columns and the right predicates, and that the entity carries the same
 *   expressions — so the schema and the ORM cannot drift apart silently.
 * - It proves the two deliberate **omissions** stay omitted: no `status` /
 *   `last_seen_at` (a liveness column with no heartbeat writer is the very defect
 *   this object exists to remove) and no CHECK on `provider` (a closed constraint
 *   on a growing vocabulary).
 * - It does **not** prove Postgres rejects a duplicate. That needs a live database;
 *   the integration harness requires a coherent app+DB (`__integration__/helpers`).
 *   The refusal is proven at the repository boundary instead
 *   (`AiAgentRuntimeRepository.test.ts`), and the bound is stated in the plan.
 */

const MIGRATION = new URL('../../migrations/Migration20261017120000_ai_agent_runtimes.ts', import.meta.url)
const ENTITY_SOURCE = new URL('../entities.ts', import.meta.url)

const readMigration = () => readFileSync(MIGRATION, 'utf8')
const readEntities = () => readFileSync(ENTITY_SOURCE, 'utf8')

/** Collapse the SQL's whitespace so an assertion is about content, not indentation. */
const squish = (sql: string) => sql.replace(/\s+/g, ' ').trim()

const UNIQUE_INDEXES = [
  {
    name: 'ai_agent_runtimes_tenant_org_daemon_provider_uq',
    columns: '("tenant_id", "organization_id", "daemon_id", "provider")',
    predicate: 'where "organization_id" is not null and "deleted_at" is null',
  },
  {
    name: 'ai_agent_runtimes_tenant_daemon_provider_null_org_uq',
    columns: '("tenant_id", "daemon_id", "provider")',
    predicate: 'where "organization_id" is null and "deleted_at" is null',
  },
  {
    name: 'ai_agent_runtimes_tenant_org_name_uq',
    columns: '("tenant_id", "organization_id", "name")',
    predicate: 'where "organization_id" is not null and "deleted_at" is null',
  },
  {
    name: 'ai_agent_runtimes_tenant_name_null_org_uq',
    columns: '("tenant_id", "name")',
    predicate: 'where "organization_id" is null and "deleted_at" is null',
  },
]

describe('SR-02 — ai_agent_runtimes schema', () => {
  it('creates the table with a nullable organization and a NOT NULL daemon_id', () => {
    const sql = squish(readMigration())

    expect(sql).toContain('create table "ai_agent_runtimes"')
    expect(sql).toContain('"organization_id" uuid null')
    // The donor's `daemon_id TEXT` is nullable, which drops every null-daemon row
    // out of its own uniqueness key. Ours is NOT NULL on purpose.
    expect(sql).toContain('"daemon_id" text not null')
    expect(sql).toContain('constraint "ai_agent_runtimes_pkey" primary key ("id")')
  })

  it.each(UNIQUE_INDEXES)(
    'declares $name as a partial unique index over $columns',
    ({ name, columns, predicate }) => {
      const sql = squish(readMigration())

      expect(sql).toContain(`create unique index "${name}"`)
      expect(sql).toContain(`on "ai_agent_runtimes" ${columns}`)
      expect(sql).toContain(predicate)
    },
  )

  it('keeps the entity expressions identical to the migration (no entity/schema drift)', () => {
    const entities = readEntities()

    for (const { name, columns, predicate } of UNIQUE_INDEXES) {
      // The exact expression string the entity carries, rebuilt from the same parts
      // the migration is asserted against — so a change on ONE side fails here.
      const expression = `create unique index "${name}" on "ai_agent_runtimes" ${columns} ${predicate}`
      expect(entities).toContain(expression)
    }
  })

  it('drops the table on down()', () => {
    expect(squish(readMigration())).toContain('drop table if exists "ai_agent_runtimes" cascade')
  })

  it('does not declare a liveness column — no writer exists to set one', () => {
    const sql = squish(readMigration())

    // The donor carries `status` and `last_seen_at`. Both are omitted because no
    // probe in this codebase beats a heartbeat: a column that claims "online" while
    // nothing sets it is the defect this object exists to remove, pointed the other
    // way. Pinned so it cannot be re-added without this test being changed.
    expect(sql).not.toContain('"status"')
    expect(sql).not.toContain('"last_seen_at"')
  })

  it('does not constrain the provider vocabulary in SQL', () => {
    const sql = squish(readMigration())

    // `AiRuntimeEngine` grows with every engine; a CHECK here would couple the
    // migration to a TypeScript type (the `principal_kind` reasoning,
    // Migration20260812180000.ts:24-27). The application validates at the boundary.
    expect(sql).not.toContain('check (')
    expect(sql).toContain('"provider" text not null')
  })
})
