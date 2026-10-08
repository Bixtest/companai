/** @jest-environment node */
/**
 * SD-1 (CC-22) — the HTTP reactivation paths run the permissions gate.
 *
 * A field brought back from a tombstone is a permission surface (re)appearing, so it
 * must not land until the gate has decided — exactly as a create must not. Two routes
 * do this: the single-definition POST (`definitions.ts`, an existing inactive row saved
 * active) and the restore POST (`definitions.restore.ts`). Both arrive at the registry
 * as `'update'` (`operation: def ? 'update' : 'create'` and `operation: 'custom'`), so
 * the create-only gate guard cannot see them; the gate therefore runs at the route, on
 * the before-state the route has already loaded.
 *
 * These tests prove the route-level gate: it fires on a reactivation, stays out of the
 * way of a create (the registry guard owns that), an ordinary active update, and a
 * deactivation — and it fails closed (422, nothing written) when the gate refuses.
 */
import { POST as upsertDefinition } from '../definitions'
import { POST as restoreDefinition } from '../definitions.restore'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'

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

const grantMock = applyStructureChangeGrant as unknown as jest.Mock

type Where = Record<string, unknown>

const mockEm = {
  find: jest.fn(async (_entity: unknown, _where: Where) => [] as unknown[]),
  findOne: jest.fn(async (_entity: unknown, _where: Where) => null as unknown),
  create: jest.fn((_entity: unknown, data: Where) => ({ ...data })),
  persist: jest.fn(),
  flush: jest.fn(async () => {}),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'em') return mockEm
      if (key === 'cache') throw new Error('no cache')
      return null
    },
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: async () => ({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1', roles: ['admin'] }),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: async () => ({ tenantId: 'tenant-1', selectedId: 'org-1' }),
}))

jest.mock('@open-mercato/core/modules/entities/data/entities', () => ({
  CustomEntity: 'CustomEntity',
  CustomFieldDef: 'CustomFieldDef',
}))

jest.mock('@open-mercato/core/modules/dictionaries/data/entities', () => ({ DictionaryEntry: 'DictionaryEntry' }))
jest.mock('@open-mercato/core/modules/currencies/data/entities', () => ({ Currency: 'Currency' }))

/** The definition row the route finds. */
function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'def-1',
    entityId: 'a:one',
    key: 'foo',
    kind: 'text',
    isActive: false,
    deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    configJson: {},
    ...overrides,
  }
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/entities/definitions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** The features the gate decided for the last grant call. */
function featuresOfLastGrant(): string[] {
  const call = grantMock.mock.calls[grantMock.mock.calls.length - 1]
  const decision = call?.[1]?.decision
  return (decision?.records ?? []).map((record: { feature: string }) => record.feature)
}

beforeEach(() => {
  grantMock.mockClear()
  mockEm.find.mockClear()
  mockEm.findOne.mockReset()
  mockEm.findOne.mockResolvedValue(null)
  mockEm.create.mockClear()
  mockEm.persist.mockClear()
  mockEm.flush.mockClear()
})

describe('definitions POST — the SD-1 reactivation gate (CC-22)', () => {
  it('gates a reactivation and grants its records after the flush', async () => {
    mockEm.findOne.mockResolvedValue(existingRow())

    const res = await upsertDefinition(request({ entityId: 'a:one', key: 'foo', kind: 'text' }))

    expect(res.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.tenantId).toBe('tenant-1')
    expect(grantInput.decision.outcome).toBe('defaulted')
    expect(featuresOfLastGrant()).toContain('a:one.foo.view')
    // The row commits before its permissions are granted.
    expect(mockEm.flush.mock.invocationCallOrder[0]).toBeLessThan(grantMock.mock.invocationCallOrder[0])
  })

  it('does not gate a create — the route stays silent so the create-only registry guard is the single writer', async () => {
    mockEm.findOne.mockResolvedValue(null)

    // On a create the route must NOT run its own gate: `permissionDecision` stays null, so
    // its `writeFieldPermissionGrant` early-returns and the create-only registry guard (the
    // production `entities.field_definition.requires-permission-decision`) is the one writer.
    // Registering a real create guard here also proves the route does not *compete* with it:
    // the route contributes zero grants, so the grant total is owned entirely by the guard.
    registerMutationGuards([
      {
        moduleId: 'test',
        guards: [
          {
            id: 'test.entities.field_definition.create',
            targetEntity: 'entities.field_definition',
            operations: ['create'],
            priority: 5,
            async validate() {
              return { ok: true, shouldRunAfterSuccess: true, metadata: {} }
            },
          },
        ],
      },
    ])

    const res = await upsertDefinition(request({ entityId: 'a:one', key: 'foo', kind: 'text' }))

    expect(res.status).toBe(200)
    expect(mockEm.create).toHaveBeenCalledTimes(1)
    // The route contributes ZERO grants on a create — it never competes with the guard.
    // (The guard's own `afterSuccess` grant is proved in `entities/data/__tests__/guards.sd1-write.test.ts`.)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate an update that keeps the field active', async () => {
    mockEm.findOne.mockResolvedValue(existingRow({ isActive: true, deletedAt: null }))

    const res = await upsertDefinition(request({ entityId: 'a:one', key: 'foo', kind: 'text', configJson: { label: 'New' } }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate a deactivation — saving a field inactive is a tombstone, not a surface', async () => {
    mockEm.findOne.mockResolvedValue(existingRow({ isActive: true, deletedAt: null }))

    const res = await upsertDefinition(request({ entityId: 'a:one', key: 'foo', kind: 'text', isActive: false }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate re-saving a tombstone as still inactive — no surface appears', async () => {
    // The row is already a tombstone, and the save leaves it one: nothing appears, so
    // there is nothing to decide. (This is the case that isolates the "the save leaves
    // it active" clause of the reactivation test — an active row would pass either way.)
    mockEm.findOne.mockResolvedValue(existingRow())

    const res = await upsertDefinition(request({ entityId: 'a:one', key: 'foo', kind: 'text', isActive: false }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })
})

describe('definitions.restore POST — the SD-1 reactivation gate (CC-22)', () => {
  it('gates a restore of a tombstoned field and grants after the flush', async () => {
    mockEm.findOne.mockResolvedValue(existingRow())

    const res = await restoreDefinition(request({ entityId: 'a:one', key: 'foo' }))

    expect(res.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.tenantId).toBe('tenant-1')
    expect(grantInput.decision.outcome).toBe('defaulted')
    expect(featuresOfLastGrant()).toContain('a:one.foo.manage')
    expect(mockEm.flush.mock.invocationCallOrder[0]).toBeLessThan(grantMock.mock.invocationCallOrder[0])
  })

  it('does not gate restoring a row that is already active (nothing structural changes)', async () => {
    mockEm.findOne.mockResolvedValue(existingRow({ isActive: true, deletedAt: null }))

    const res = await restoreDefinition(request({ entityId: 'a:one', key: 'foo' }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('refuses a malformed surface id and restores nothing (fail closed)', async () => {
    mockEm.findOne.mockResolvedValue(existingRow({ key: 'Bad-Key' }))

    const res = await restoreDefinition(request({ entityId: 'a:one', key: 'Bad-Key' }))

    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/cannot be restored/)
    // Nothing was written, and no permissions were granted for a surface that did not land.
    expect(mockEm.persist).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('404s when there is no definition to restore', async () => {
    mockEm.findOne.mockResolvedValue(null)

    const res = await restoreDefinition(request({ entityId: 'a:one', key: 'foo' }))

    expect(res.status).toBe(404)
    expect(grantMock).not.toHaveBeenCalled()
  })
})
