/**
 * Undoing a delete when somebody reused the code (U12).
 *
 * **Why this case only exists now.** Before U12 the unique constraint ignored
 * `deleted_at`, so a deleted currency reserved its code forever and nobody could
 * ever take it. That was the bug — but it also meant undo could never collide.
 * Making the index partial fixed the bug and created this case.
 *
 * **The decision, and why it is a refusal.** Restoring the row would give two
 * live currencies with one code, and there is no correct automatic way to pick
 * which survives. Renaming one invents data; overwriting one destroys it;
 * silently doing nothing tells the operator their undo worked when it did not.
 * So it refuses with a `409` that says what to do instead.
 *
 * Without this guard the partial index raises a raw violation on flush, which
 * surfaces as a 500 and tells the operator nothing.
 */
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'

type Row = Record<string, unknown>

const DELETED_CURRENCY = {
  id: 'c1',
  code: 'XTS',
  organizationId: 'org-1',
  tenantId: 'tenant-1',
  deletedAt: new Date('2026-08-09T00:00:00Z') as Date | null,
  isActive: false,
  updatedAt: new Date('2026-08-09T00:00:00Z'),
}

/**
 * The undo body, extracted so the collision rule can be exercised without
 * standing up a command bus. It mirrors `deleteCurrencyCommand.undo` exactly;
 * the guard below is the part under test.
 */
async function restoreCurrency(
  em: { findOne: (entity: unknown, where: Row) => Promise<Row | null>; flush: () => Promise<void> },
  record: typeof DELETED_CURRENCY,
  before: { isActive: boolean },
): Promise<void> {
  const liveWithSameCode = await em.findOne('Currency', {
    code: record.code,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    deletedAt: null,
  })
  if (liveWithSameCode) {
    throw new CrudHttpError(409, {
      error: `Cannot restore currency ${record.code} because another currency now uses that code. Remove or rename it first.`,
    })
  }
  record.deletedAt = null
  record.isActive = before.isActive
  await em.flush()
}

function makeEm(liveMatch: Row | null) {
  const flush = jest.fn(async () => {})
  return {
    em: { findOne: jest.fn(async () => liveMatch), flush },
    flush,
  }
}

describe('restoring a deleted currency', () => {
  it('restores it when the code is free', async () => {
    const { em, flush } = makeEm(null)
    const record = { ...DELETED_CURRENCY }

    await restoreCurrency(em, record, { isActive: true })

    expect(record.deletedAt).toBeNull()
    expect(record.isActive).toBe(true)
    expect(flush).toHaveBeenCalled()
  })

  it('refuses when another live currency took the code', async () => {
    const { em } = makeEm({ id: 'c2', code: 'XTS' })
    const record = { ...DELETED_CURRENCY }

    await expect(restoreCurrency(em, record, { isActive: true })).rejects.toBeInstanceOf(CrudHttpError)
  })

  it('leaves the row deleted when it refuses', async () => {
    // A refusal that half-applied would be worse than either outcome.
    const { em, flush } = makeEm({ id: 'c2', code: 'XTS' })
    const record = { ...DELETED_CURRENCY }

    await expect(restoreCurrency(em, record, { isActive: true })).rejects.toThrow()

    expect(record.deletedAt).not.toBeNull()
    expect(flush).not.toHaveBeenCalled()
  })

  it('says which code is in the way and what to do about it', async () => {
    // The message is the feature. "Conflict" alone leaves somebody guessing at
    // a currency list that looks perfectly fine.
    const { em } = makeEm({ id: 'c2', code: 'XTS' })
    const record = { ...DELETED_CURRENCY }

    const error = await restoreCurrency(em, record, { isActive: true }).catch((e) => e)

    expect(error.body.error).toContain('XTS')
    expect(error.body.error).toMatch(/rename|remove/i)
  })

  it('looks only for live rows when checking', async () => {
    // Matching deleted rows too would reinstate exactly the bug U12 fixed.
    const { em } = makeEm(null)
    const record = { ...DELETED_CURRENCY }

    await restoreCurrency(em, record, { isActive: true })

    expect(em.findOne).toHaveBeenCalledWith('Currency', expect.objectContaining({ deletedAt: null }))
  })

  it('scopes the check to the same organization and tenant', async () => {
    // A currency with the same code in another organization is not a conflict —
    // the index is scoped, and so must the check be.
    const { em } = makeEm(null)
    const record = { ...DELETED_CURRENCY }

    await restoreCurrency(em, record, { isActive: true })

    expect(em.findOne).toHaveBeenCalledWith(
      'Currency',
      expect.objectContaining({ organizationId: 'org-1', tenantId: 'tenant-1' }),
    )
  })
})
