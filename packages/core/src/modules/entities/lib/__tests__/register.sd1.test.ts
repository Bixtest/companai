/** @jest-environment node */
/**
 * SD-1 (CC-21) — the custom-entity install path runs the permissions gate.
 *
 * A custom **entity** appearing is a permission surface appearing (S2). The HTTP
 * create path is already gated by the registry guard `entities.entity.requires-permission-decision`
 * (proved in `entities/data/__tests__/guards.sd1.test.ts`); the **module install**
 * path — `install-from-ce.ts` → `upsertCustomEntity` — was not. This suite proves
 * the primitive now gates the surface it brings into existence, before the row
 * lands, and writes the default's records after the flush — mirroring
 * `ensureCustomFieldDefinitions` for fields (`field-definitions.sd1.test.ts`).
 *
 * The cases that matter:
 *  - a **create** is gated and granted after the flush;
 *  - a **reactivation** (an inactive / tombstoned row saved active) is gated and granted;
 *  - an ordinary **update that stays active** is not gated;
 *  - a `createOnly` sync is not gated (it never reactivates, so no surface appears);
 *  - a `dryRun` lands nothing, so it is not gated;
 *  - a **refusal fails closed**: nothing is created and nothing is granted.
 */
import { upsertCustomEntity } from '../register'
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

type Row = Record<string, unknown>

/**
 * A minimal EntityManager fake with a `transactional` that runs the callback with
 * itself as the transaction-scoped manager (as MikroORM does), so the primitive's
 * own `tem.findOne` / `tem.create` / `tem.flush` are exercised.
 */
function makeEm(initialRow: Row | null) {
  let row = initialRow
  const em: Record<string, unknown> = {}
  em.findOne = jest.fn(async () => row)
  em.create = jest.fn((_entity: unknown, data: Row) => {
    row = { ...data, id: 'ce-1' }
    return row
  })
  em.persist = jest.fn(() => em)
  em.flush = jest.fn(async () => {})
  em.transactional = jest.fn(async (cb: (t: unknown) => unknown) => cb(em))
  return em
}

function activeRow(overrides: Row = {}): Row {
  return {
    id: 'ce-1',
    entityId: 'a:one',
    organizationId: null,
    tenantId: 'tenant-1',
    label: 'One',
    description: null,
    isActive: true,
    showInSidebar: false,
    accessRestricted: false,
    labelField: null,
    defaultEditor: null,
    deletedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function tombstoneRow(overrides: Row = {}): Row {
  return activeRow({ isActive: false, deletedAt: new Date('2026-01-01T00:00:00.000Z'), ...overrides })
}

/** The features the gate decided for the last grant call. */
function featuresOfLastGrant(): string[] {
  const call = grantMock.mock.calls[grantMock.mock.calls.length - 1]
  const decision = call?.[1]?.decision
  return (decision?.records ?? []).map((record: { feature: string }) => record.feature)
}

beforeEach(() => {
  grantMock.mockClear()
})

describe('upsertCustomEntity — the SD-1 gate (CC-21)', () => {
  it('gates a create and grants its records after the flush', async () => {
    const em = makeEm(null)

    const result = await upsertCustomEntity(em as never, 'a:one', {
      label: 'One',
      tenantId: 'tenant-1',
    })

    expect(result).toBe('created')
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.tenantId).toBe('tenant-1')
    expect(grantInput.decision.outcome).toBe('defaulted')
    // The surface's records use the platform's live per-entity prefix.
    expect(featuresOfLastGrant()).toContain('entities.records.a:one.view')
    expect(featuresOfLastGrant()).toContain('entities.records.a:one.manage')
    // The row commits before its permissions are granted.
    expect((em.flush as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      grantMock.mock.invocationCallOrder[0],
    )
  })

  it('gates a reactivation (an inactive tombstone saved active) and grants after the flush', async () => {
    const em = makeEm(tombstoneRow())

    const result = await upsertCustomEntity(em as never, 'a:one', {
      label: 'One',
      tenantId: 'tenant-1',
    })

    expect(result).toBe('updated')
    expect(grantMock).toHaveBeenCalledTimes(1)
    expect(grantMock.mock.calls[0][1].decision.outcome).toBe('defaulted')
    expect(featuresOfLastGrant()).toContain('entities.records.a:one.view')
  })

  it('does not gate an update that leaves the entity active', async () => {
    const em = makeEm(activeRow({ label: 'Old' }))

    const result = await upsertCustomEntity(em as never, 'a:one', {
      label: 'New',
      tenantId: 'tenant-1',
    })

    expect(result).toBe('updated')
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate a createOnly sync — it never reactivates, so no surface appears', async () => {
    const em = makeEm(tombstoneRow())

    const result = await upsertCustomEntity(em as never, 'a:one', {
      label: 'One',
      tenantId: 'tenant-1',
      createOnly: true,
    })

    expect(result).toBe('unchanged')
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not even evaluate the gate for a createOnly sync of a malformed surface', async () => {
    // The gap this closes: `createOnly` skips updates, so a tombstone row is left
    // untouched and no surface appears — meaning the gate must not run at all. If it
    // did, a malformed id would throw for a sync that lands nothing. Asserting on the
    // grant alone cannot see that (the `createOnly` early-return precedes any grant);
    // this asserts the stronger fact — the gate is never consulted.
    const em = makeEm(tombstoneRow({ entityId: 'Bad Entity Id' }))

    const result = await upsertCustomEntity(em as never, 'Bad Entity Id', {
      label: 'Bad',
      tenantId: 'tenant-1',
      createOnly: true,
    })

    expect(result).toBe('unchanged')
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate a dry run — nothing lands', async () => {
    const em = makeEm(null)

    const result = await upsertCustomEntity(em as never, 'a:one', {
      label: 'One',
      tenantId: 'tenant-1',
      dryRun: true,
    })

    expect(result).toBe('created')
    expect(em.create).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('refuses a malformed surface id and creates nothing (fail closed)', async () => {
    const em = makeEm(null)

    await expect(
      upsertCustomEntity(em as never, 'Bad Entity Id', { label: 'Bad', tenantId: 'tenant-1' }),
    ).rejects.toThrow(/cannot land/)

    expect(em.create).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })
})
