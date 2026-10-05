/** @jest-environment node */
import { resolveRecordScope } from '../engine'

type TableSelect = { table: string; columns: string[] }

/**
 * A stand-in for Kysely that records every select it is asked to run, and answers
 * `information_schema.columns` from a per-table map.
 */
function makeFakeDb(columnsFor: Record<string, string[]>, row: Record<string, unknown> | undefined) {
  const tableSelects: TableSelect[] = []
  const db = {
    selectFrom(table: string) {
      const columns: string[] = []
      const wheres: Array<[string, string, unknown]> = []
      const builder: any = {
        select(cols: string[]) { columns.push(...cols); return builder },
        where(field: string, _op: string, value: unknown) { wheres.push([field, _op, value]); return builder },
        limit() { return builder },
        distinct() { return builder },
        async execute() {
          const tableName = String(wheres.find(([f]) => f === 'table_name')?.[2] ?? '')
          const wanted = wheres.find(([f]) => f === 'column_name')?.[2] as string[] | undefined
          const known = columnsFor[tableName] ?? []
          return known.filter((c) => !wanted || wanted.includes(c)).map((c) => ({ column_name: c }))
        },
        async executeTakeFirst() {
          tableSelects.push({ table, columns: [...columns] })
          return row
        },
      }
      return builder
    },
  }
  return { db, tableSelects }
}

function emWith(db: unknown) {
  return { getKysely: () => db } as any
}

describe('resolveRecordScope', () => {
  it('reads the scope of a row in a tenant-scoped table', async () => {
    const { db, tableSelects } = makeFakeDb({ persons: ['organization_id', 'tenant_id'] }, {
      organization_id: 'org-1',
      tenant_id: 'tenant-1',
    })

    const scope = await resolveRecordScope(emWith(db), 'customers:person', 'person-1')

    expect(scope).toEqual({ organizationId: 'org-1', tenantId: 'tenant-1' })
    expect(tableSelects).toEqual([{ table: 'persons', columns: ['organization_id', 'tenant_id'] }])
  })

  it('asks only for the scope columns the table actually has', async () => {
    const { db, tableSelects } = makeFakeDb({ products: ['organization_id'] }, { organization_id: 'org-1' })

    const scope = await resolveRecordScope(emWith(db), 'catalog:product', 'product-1')

    expect(scope).toEqual({ organizationId: 'org-1', tenantId: null })
    expect(tableSelects[0].columns).toEqual(['organization_id'])
  })

  it("issues NO select against a global table — that query would abort the caller's transaction", async () => {
    // `feature_toggles` is global by design: it has neither organization_id nor
    // tenant_id. Selecting those columns anyway does not merely fail — Postgres puts the
    // whole transaction into the aborted state, so the *next* statement in it fails too,
    // whatever it is. That is how `mercato init` came to die halfway through seeding
    // feature toggle defaults, and why the failure looked like an audit-log bug (B-18).
    const { db, tableSelects } = makeFakeDb({ feature_toggles: [] }, undefined)

    const scope = await resolveRecordScope(emWith(db), 'feature_toggles:feature_toggle', 'toggle-1')

    expect(scope).toEqual({ organizationId: null, tenantId: null })
    expect(tableSelects).toEqual([])
  })

  it('returns nulls rather than throwing when the lookup itself fails', async () => {
    const db = { selectFrom: () => { throw new Error('boom') } }

    await expect(resolveRecordScope(emWith(db), 'customers:person', 'person-1')).resolves.toEqual({
      organizationId: null,
      tenantId: null,
    })
  })

  it('returns nulls when there is no entity manager to ask', async () => {
    await expect(resolveRecordScope(undefined, 'customers:person', 'person-1')).resolves.toEqual({
      organizationId: null,
      tenantId: null,
    })
  })
})
