import { ensureCustomFieldDefinitions } from '../field-definitions'
import { CustomFieldDef } from '../../data/entities'

// SD-1 (CC-3): the primitive now runs the permissions gate and writes the default's
// records. The sync behaviour under test here is independent of that write, so the
// grant is stubbed — its own contract is proved in `field-definitions.sd1.test.ts`.
jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyStructureChangeGrant: jest.fn(async () => ({
    applied: true,
    roleName: 'superadmin',
    roleId: 'role-1',
    aclCreated: false,
    added: [],
    alreadyPresent: [],
  })),
}))

type Where = Record<string, unknown>

function createMockEm(existing: Array<Record<string, unknown>> = []) {
  const persisted: Array<Record<string, unknown>> = []
  const em: any = {
    find: jest.fn(async (_entity: unknown, _where: Where) => existing),
    findOne: jest.fn(async () => null),
    create: jest.fn((_entity: unknown, data: Where) => ({ ...data })),
    // Faithful to the real `EntityManager.persist(): this` — see the note in
    // `field-definitions.sd1.test.ts`. Callers chain `em.persist(x).flush()`.
    persist: jest.fn((entity: Record<string, unknown>) => {
      persisted.push(entity)
      return em
    }),
    flush: jest.fn(async () => {}),
    persisted,
  }
  return em
}

/**
 * The arguments of every call to a mock made **for a given entity class**.
 *
 * `M3e`/`P3b` added a second, independent write path (`permission_surfaces` rows) alongside
 * the `CustomFieldDef` writes these tests are about. Counting *all* calls now conflates the
 * two, so the assertions narrow to the entity under test — which is what they always meant.
 */
function callsFor(mock: jest.Mock, entity: unknown): unknown[][] {
  return mock.mock.calls.filter((call) => call[0] === entity)
}

const scope = { organizationId: 'org-1', tenantId: 'tenant-1' }

describe('ensureCustomFieldDefinitions (issue #1399)', () => {
  it('prefetches existing definitions once and flushes a single time for the whole batch', async () => {
    const em = createMockEm()
    const sets = [
      { entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }, { key: 'bar', kind: 'integer' as const }] },
      { entity: 'b:two', fields: [{ key: 'baz', kind: 'boolean' as const }] },
    ]

    const result = await ensureCustomFieldDefinitions(em as any, sets, scope)

    expect(result).toEqual({ created: 3, updated: 0, unchanged: 0 })
    // One prefetch query covering every entity/key in the batch.
    expect(em.find).toHaveBeenCalledTimes(1)
    expect(em.find.mock.calls[0][1]).toMatchObject({
      entityId: { $in: ['a:one', 'b:two'] },
      organizationId: 'org-1',
      tenantId: 'tenant-1',
      key: { $in: ['foo', 'bar', 'baz'] },
    })
    // No per-field point lookups for a definition row.
    expect(callsFor(em.findOne, CustomFieldDef)).toHaveLength(0)
    // The whole definition batch still flushes **once** (plus one flush per catalogue row the
    // `M3e` write persists — 3 surfaces here). The invariant under test is the *batch* flush,
    // so it is stated as that: 1 batch + one per recorded surface, not a bare total.
    expect(callsFor(em.create, CustomFieldDef)).toHaveLength(3)
    expect(em.flush).toHaveBeenCalledTimes(1 + 3)
  })

  it('updates prefetched matches in memory without per-field lookups', async () => {
    const existing = [
      { entityId: 'a:one', key: 'foo', kind: 'text', configJson: { label: 'Old' }, isActive: true, deletedAt: null },
    ]
    const em = createMockEm(existing)
    const sets = [
      { entity: 'a:one', fields: [
        { key: 'foo', kind: 'integer' as const, label: 'New' },
        { key: 'bar', kind: 'text' as const },
      ] },
    ]

    const result = await ensureCustomFieldDefinitions(em as any, sets, scope)

    expect(result).toEqual({ created: 1, updated: 1, unchanged: 0 })
    expect(existing[0].kind).toBe('integer')
    expect(callsFor(em.findOne, CustomFieldDef)).toHaveLength(0)
    // One batch flush + one per recorded surface (2 here): the O(n) per-field cost is gone.
    expect(em.flush).toHaveBeenCalledTimes(1 + 2)
  })

  it('passes a declared priority through to configJson (#4378)', async () => {
    const em = createMockEm()
    const sets = [
      {
        entity: 'a:one',
        fields: [
          { key: 'tax_id', kind: 'text' as const, priority: 5 },
          { key: 'notes', kind: 'text' as const },
        ],
      },
    ]

    await ensureCustomFieldDefinitions(em as any, sets, scope)

    const [taxId, notes] = em.persisted as Array<{ key: string; configJson: Record<string, unknown> }>
    expect(taxId.key).toBe('tax_id')
    expect(taxId.configJson.priority).toBe(5)
    expect(notes.configJson.priority).toBeUndefined()
  })

  it('does not query or flush on a dry run', async () => {
    const em = createMockEm()
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }] }]

    const result = await ensureCustomFieldDefinitions(em as any, sets, { ...scope, dryRun: true })

    expect(result).toEqual({ created: 1, updated: 0, unchanged: 0 })
    // Prefetch still runs (read-only) but nothing is persisted or flushed.
    expect(em.findOne).not.toHaveBeenCalled()
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })
})
