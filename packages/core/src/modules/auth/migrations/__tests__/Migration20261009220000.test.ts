import { describe, expect, jest, test } from '@jest/globals'
import { Migration20261009220000 } from '../Migration20261009220000'

/**
 * The CC-23 migration emits exactly one statement each way, and the pair must be
 * symmetric: `up()` creates the unique index that closes the create-branch
 * double-insert race, `down()` drops it and nothing else.
 *
 * The index is *also* proven on live Postgres 17 (`mercato-postgres-local`):
 * `create unique index` was applied, two concurrent plain inserts were rejected
 * with `duplicate key value violates unique constraint
 * "role_acls_role_id_tenant_id_unique"`, and the drop was read back. This test
 * pins the emitted SQL so a later edit cannot quietly change its shape.
 */

async function collectSql(direction: 'up' | 'down'): Promise<string[]> {
  const migration = Object.create(Migration20261009220000.prototype) as Migration20261009220000
  const statements: string[] = []
  Object.defineProperty(migration, 'addSql', {
    value: jest.fn((sql: string) => statements.push(sql)),
  })

  await migration[direction]()

  return statements
}

describe('Migration20261009220000 (CC-23 — the role_acls unique index)', () => {
  test('up() creates a UNIQUE index on (role_id, tenant_id) — the conflict target', async () => {
    const statements = await collectSql('up')
    expect(statements).toHaveLength(1)
    const sql = statements[0].replace(/\s+/g, ' ').trim()

    expect(sql).toMatch(/create\s+unique\s+index\s+"role_acls_role_id_tenant_id_unique"/i)
    expect(sql).toMatch(/on\s+"role_acls"\s*\(\s*"role_id"\s*,\s*"tenant_id"\s*\)/i)
    // It is a PLAIN unique index (no `where … deleted_at is null`): nothing
    // soft-deletes a `role_acls` row, so the invariant is "exactly one row per
    // role per tenant" — the stricter statement.
    expect(sql).not.toMatch(/where\s+"deleted_at"/i)
  })

  test('down() drops that index and nothing else — the pair is symmetric', async () => {
    const statements = await collectSql('down')
    expect(statements).toHaveLength(1)
    const sql = statements[0].replace(/\s+/g, ' ').trim()

    expect(sql).toMatch(/drop\s+index\s+if\s+exists\s+"role_acls_role_id_tenant_id_unique"/i)
    // It must not drop the table or a constraint.
    expect(sql).not.toMatch(/drop\s+table/i)
    expect(sql).not.toMatch(/drop\s+constraint/i)
  })
})
