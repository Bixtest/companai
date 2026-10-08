/** @jest-environment node */
/**
 * CC-28 — the custom-record `updated_at` read-backs must be scoped by tenant.
 *
 * The bug: `custom_entities_storage` is a shared table whose rows carry `tenant_id`
 * and `organization_id`. The batch read-back in `GET` filtered on `entity_type` +
 * `entity_id IN (…)` only — neither `tenant_id` nor `organization_id` — so a record id
 * that also exists in ANOTHER tenant (a record id is a caller-suppliable UUID) could
 * match that tenant's row and merge its `updated_at` into this tenant's response.
 *
 * These tests use a FILTER-AWARE Kysely stub: unlike the older `makeKyselyStub`, it
 * actually applies the `where` clauses against a fixture, so a query that omits the
 * tenant filter returns the cross-tenant row and the test goes RED. (The old stub
 * ignored `where` entirely, which is exactly why this defect slipped through.)
 */
import { GET } from '@open-mercato/core/modules/entities/api/records'

type Row = Record<string, unknown>

/**
 * A tiny stand-in for Kysely's query builder that remembers the `where` clauses and
 * filters the fixture by them — enough to tell a scoped query from an unscoped one.
 */
function makeFilterAwareKysely(fixture: Row[]) {
  const ops: { column: string; op: string; value: unknown }[] = []
  let selected: string[] = []
  const builder: any = {
    select: (cols: string[]) => {
      selected = cols
      return builder
    },
    selectFrom: () => builder,
    where: (column: string, op: string, value: unknown) => {
      ops.push({ column, op, value })
      return builder
    },
    execute: async () => {
      const rows = fixture.filter((row) =>
        ops.every(({ column, op, value }) => {
          const cell = row[column]
          if (op === 'in') return Array.isArray(value) && (value as unknown[]).includes(cell)
          if (op === 'is') return cell == null // `.where(col, 'is', null)`
          return cell === value
        }),
      )
      // Kysely's `.select([...])` narrows the returned columns; mirror that so the
      // mapper only ever sees the columns the query asked for.
      return rows.map((row) => {
        if (!selected.length) return { ...row }
        const picked: Row = {}
        for (const col of selected) picked[col] = row[col]
        return picked
      })
    },
  }
  return { builder, ops }
}

let mockFixture: Row[] = []
let lastOps: { column: string; op: string; value: unknown }[] = []
let mockListItems: Row[] = []

const mockEm = {
  find: jest.fn(async () => [] as Array<Record<string, unknown>>),
  findOne: jest.fn(async () => null),
  getKysely: jest.fn(() => {
    const { builder, ops } = makeFilterAwareKysely(mockFixture)
    lastOps = ops
    return { selectFrom: () => builder }
  }),
}

const mockQueryEngine = {
  query: jest.fn(async () => ({ items: mockListItems, total: mockListItems.length, page: 1, pageSize: 50 })),
}

const mockRbac = {
  resolveVisibleOrganizations: jest.fn(async () => ['org-a']),
  loadAcl: jest.fn(async () => ({ isSuperAdmin: true, features: [], organizations: null })),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (k: string) => {
      if (k === 'em') return mockEm
      if (k === 'rbacService') return mockRbac
      if (k === 'queryEngine') return mockQueryEngine
      return undefined
    },
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: () => ({ orgId: 'org-a', tenantId: 'tenant-a', roles: ['admin'] }),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScope: async () => ({ selectedId: 'org-a', filterIds: ['org-a'] }),
  getSelectedOrganizationFromRequest: () => 'org-a',
}))

// `classifyRecordsEntity` walks the module registry (via `getModules`) for declared
// custom entities; report one so it returns kind: 'custom' and `isCustomEntity` is true,
// which is what makes the batch read-back run.
jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  getModules: () => [{ customEntities: [{ id: 'user:qa_entity', accessRestricted: false }] }],
}))

describe('CC-28 — custom-record updated_at read-back is tenant-scoped', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFixture = []
    lastOps = []
    mockListItems = []
  })

  it('batch read-back filters custom_entities_storage by tenant_id', async () => {
    // Two rows share (entity_type, entity_id) across tenants — the collision the bug allowed.
    mockFixture = [
      { entity_type: 'user:qa_entity', entity_id: 'rec-1', tenant_id: 'tenant-a', organization_id: 'org-a', updated_at: '2026-01-01T00:00:00.000Z' },
      { entity_type: 'user:qa_entity', entity_id: 'rec-1', tenant_id: 'tenant-b', organization_id: 'org-b', updated_at: '2030-09-09T09:09:09.000Z' },
    ]
    mockListItems = [{ id: 'rec-1', created_at: '2026-01-01T00:00:00.000Z' }]

    const res = await GET(new Request('http://x/api/entities/records?entityId=user:qa_entity&page=1&pageSize=50'))
    expect(res.status).toBe(200)
    const json = await res.json()

    // The tenant filter must be present...
    expect(lastOps).toEqual(
      expect.arrayContaining([{ column: 'tenant_id', op: '=', value: 'tenant-a' }]),
    )
    // ...and the returned version must be THIS tenant's, never the other tenant's.
    expect(json.items[0].updated_at).toBe('2026-01-01T00:00:00.000Z')
    expect(json.items[0].updated_at).not.toBe('2030-09-09T09:09:09.000Z')
  })

  it('batch read-back also scopes by organization_id when the caller is org-scoped', async () => {
    mockFixture = [
      { entity_type: 'user:qa_entity', entity_id: 'rec-1', tenant_id: 'tenant-a', organization_id: 'org-a', updated_at: '2026-01-01T00:00:00.000Z' },
      { entity_type: 'user:qa_entity', entity_id: 'rec-1', tenant_id: 'tenant-a', organization_id: 'org-z', updated_at: '2030-09-09T09:09:09.000Z' },
    ]
    mockListItems = [{ id: 'rec-1', created_at: '2026-01-01T00:00:00.000Z' }]

    const res = await GET(new Request('http://x/api/entities/records?entityId=user:qa_entity&page=1&pageSize=50'))
    const json = await res.json()

    expect(lastOps).toEqual(
      expect.arrayContaining([{ column: 'organization_id', op: 'in', value: ['org-a'] }]),
    )
    expect(json.items[0].updated_at).toBe('2026-01-01T00:00:00.000Z')
  })

  it('a row with a null tenant is not returned for a tenant-scoped caller', async () => {
    // A global-scope row (tenant_id null) must not satisfy a tenant-owned request.
    mockFixture = [
      { entity_type: 'user:qa_entity', entity_id: 'rec-1', tenant_id: null, organization_id: 'org-a', updated_at: '2030-09-09T09:09:09.000Z' },
    ]
    mockListItems = [{ id: 'rec-1', created_at: '2026-01-01T00:00:00.000Z' }]

    const res = await GET(new Request('http://x/api/entities/records?entityId=user:qa_entity&page=1&pageSize=50'))
    const json = await res.json()

    // The merge is best-effort, so an absent version simply leaves `updated_at` unset —
    // what must NOT happen is the null-tenant row's value leaking in.
    expect(json.items[0].updated_at).toBeUndefined()
  })
})
