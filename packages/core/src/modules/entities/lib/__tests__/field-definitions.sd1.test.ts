/**
 * SD-1 (CC-3) — the permissions gate on the non-request field-creation paths.
 *
 * `ensureCustomFieldDefinitions` is the single primitive the module install/sync,
 * the module seeds and the customers CLI all go through. These tests prove the gate
 * runs there: a field the call brings into existence is decided **before** it lands,
 * and the default's records are written **after** the flush — on both create and
 * reactivation, never on a dry run, and never silently skipped.
 */
import { ensureCustomFieldDefinitions } from '../field-definitions'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'

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

function createMockEm(existing: Array<Record<string, unknown>> = []) {
  const persisted: Array<Record<string, unknown>> = []
  return {
    find: jest.fn(async (_entity: unknown, _where: Where) => existing),
    findOne: jest.fn(async () => null),
    create: jest.fn((_entity: unknown, data: Where) => ({ ...data })),
    persist: jest.fn((entity: Record<string, unknown>) => {
      persisted.push(entity)
    }),
    flush: jest.fn(async () => {}),
    persisted,
  }
}

const scope = { organizationId: 'org-1', tenantId: 'tenant-1' }

/** The records the gate decided for the last grant call. */
function recordsOfLastGrant(): string[] {
  const call = grantMock.mock.calls[grantMock.mock.calls.length - 1]
  const decision = call?.[1]?.decision
  return (decision?.records ?? []).map((record: { feature: string }) => record.feature)
}

beforeEach(() => {
  grantMock.mockClear()
})

describe('ensureCustomFieldDefinitions — the SD-1 permissions gate (CC-3)', () => {
  it('gates a new field and grants its records after the flush', async () => {
    const em = createMockEm()
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }] }]

    const result = await ensureCustomFieldDefinitions(em as any, sets, scope)

    expect(result).toEqual({ created: 1, updated: 0, unchanged: 0 })
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.tenantId).toBe('tenant-1')
    expect(grantInput.decision.outcome).toBe('defaulted')
    // The write happens after the row has committed.
    expect(em.flush.mock.invocationCallOrder[0]).toBeLessThan(grantMock.mock.invocationCallOrder[0])
  })

  it('decides every new field of the call in one decision', async () => {
    const em = createMockEm()
    const sets = [
      { entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }, { key: 'bar', kind: 'integer' as const }] },
      { entity: 'b:two', fields: [{ key: 'baz', kind: 'boolean' as const }] },
    ]

    await ensureCustomFieldDefinitions(em as any, sets, scope)

    expect(grantMock).toHaveBeenCalledTimes(1)
    const features = recordsOfLastGrant()
    // The gate yields the data block (`view`/`manage`) and the structural block.
    expect(features).toContain('a:one.foo.view')
    expect(features).toContain('a:one.foo.manage')
    expect(features).toContain('a:one.foo.structure')
    expect(features).toContain('b:two.baz.view')
  })

  it('does not gate a call that only updates an existing active field', async () => {
    const existing = [
      { entityId: 'a:one', key: 'foo', kind: 'text', configJson: { label: 'Old' }, isActive: true, deletedAt: null },
    ]
    const em = createMockEm(existing)
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const, label: 'New' }] }]

    const result = await ensureCustomFieldDefinitions(em as any, sets, scope)

    expect(result).toEqual({ created: 0, updated: 1, unchanged: 0 })
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('gates a reactivation — an inactive row that this sync brings back is a new surface', async () => {
    const existing = [
      { entityId: 'a:one', key: 'foo', kind: 'text', configJson: { label: 'Old' }, isActive: false, deletedAt: null },
    ]
    const em = createMockEm(existing)
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const, label: 'Old' }] }]

    await ensureCustomFieldDefinitions(em as any, sets, scope)

    expect(grantMock).toHaveBeenCalledTimes(1)
    expect(recordsOfLastGrant()).toContain('a:one.foo.view')
  })

  it('does not gate a tombstone under createOnly — the loop never reactivates it', async () => {
    const existing = [
      { entityId: 'a:one', key: 'foo', kind: 'text', configJson: { label: 'Old' }, isActive: false, deletedAt: null },
    ]
    const em = createMockEm(existing)
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const, label: 'Old' }] }]

    const result = await ensureCustomFieldDefinitions(em as any, sets, { ...scope, createOnly: true })

    // Nothing lands, so nothing is granted — a grant for a column that never appears
    // would be a false "gated".
    expect(result).toEqual({ created: 0, updated: 0, unchanged: 1 })
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate a dry run (nothing lands)', async () => {
    const em = createMockEm()
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }] }]

    await ensureCustomFieldDefinitions(em as any, sets, { ...scope, dryRun: true })

    expect(grantMock).not.toHaveBeenCalled()
  })

  it('refuses to land a field whose surface id the permission matcher cannot read', async () => {
    const em = createMockEm()
    const sets = [{ entity: 'a:one', fields: [{ key: 'Bad-Key', kind: 'text' as const }] }]

    await expect(ensureCustomFieldDefinitions(em as any, sets, scope)).rejects.toThrow(
      /cannot land: .*not a readable permission-surface id/s,
    )
    // Fail closed: nothing was created, and nothing was granted.
    expect(em.persist).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not grant a global surface — it has no single tenant to grant in', async () => {
    const em = createMockEm()
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }] }]

    const result = await ensureCustomFieldDefinitions(em as any, sets, { organizationId: null, tenantId: null })

    expect(result).toEqual({ created: 1, updated: 0, unchanged: 0 })
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('still returns the counts when the grant cannot be applied', async () => {
    grantMock.mockResolvedValueOnce({
      applied: false,
      roleName: 'superadmin',
      reason: 'role_not_found',
      because: 'no such role',
    })
    const em = createMockEm()
    const sets = [{ entity: 'a:one', fields: [{ key: 'foo', kind: 'text' as const }] }]

    const result = await ensureCustomFieldDefinitions(em as any, sets, scope)

    // A failed grant must never fail the sync — the rows have already committed.
    expect(result).toEqual({ created: 1, updated: 0, unchanged: 0 })
    expect(grantMock).toHaveBeenCalledTimes(1)
  })
})
