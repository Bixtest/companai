/**
 * `CC-135` — designating the foundational tenant, which is how a platform administrator comes to
 * exist at all.
 *
 * The measured fact this file exists for: `tenants.is_foundational` had **no writer**. `CC-134` made
 * the cross-tenant read ask *"is this person a superadmin in the foundational tenant?"* and answer
 * false when there is none — so the fail-closed branch was the only branch that could run, and the
 * ceiling route's platform scope would have been unreachable for everybody.
 *
 * The four things that must happen together are asserted as a unit, because separating them is how
 * `CC-134` §6's debt ("moving the foundation does not invalidate the cache") came to exist: clear,
 * set, record, and — after the rows commit — invalidate every cached ACL answer.
 */

import { Tenant } from '@open-mercato/core/modules/directory/data/entities'
import {
  FOUNDATION_CHANGE_COMMAND_ID,
  FoundationError,
  designateFoundationalTenant,
} from '../foundation'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const UNKNOWN = '99999999-9999-4999-8999-999999999999'

type TenantRow = { id: string; name: string; isFoundational: boolean; updatedAt?: Date }

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where ?? {}).every(([key, expected]) => row[key] === expected)
}

function makeEm(initial: TenantRow[]) {
  const rows = initial.map((row) => ({ ...row }))
  const em: any = {
    rows,
    findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) =>
      entity === Tenant ? rows.find((row) => matches(row as any, where ?? {})) ?? null : null),
    find: jest.fn(async (entity: unknown, where: Record<string, unknown>) =>
      entity === Tenant ? rows.filter((row) => matches(row as any, where ?? {})) : []),
    persist: jest.fn((row: TenantRow) => {
      if (!rows.includes(row)) rows.push(row)
    }),
    flush: jest.fn(async () => undefined),
    transactional: async (fn: (tx: unknown) => Promise<unknown>) => fn(em),
  }
  return em
}

function foundationOf(em: ReturnType<typeof makeEm>): string[] {
  return em.rows.filter((row) => row.isFoundational).map((row) => row.id)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('designating a foundation', () => {
  it('sets the flag, records the act, and invalidates the cached ACL answers', async () => {
    const em = makeEm([{ id: A, name: 'A', isFoundational: false }, { id: B, name: 'B', isFoundational: false }])
    const audit = { log: jest.fn(async (_input: Record<string, unknown>) => undefined) }
    const invalidateAclCache = jest.fn(async () => undefined)

    const change = await designateFoundationalTenant(em, {
      tenantId: A,
      audit,
      invalidateAclCache,
    })

    expect(foundationOf(em)).toEqual([A])
    expect(change).toEqual({ previousTenantId: null, clearedTenantIds: [], foundationalTenantId: A })

    const record = audit.log.mock.calls[0][0] as any
    expect(record.commandId).toBe(FOUNDATION_CHANGE_COMMAND_ID)
    expect(record.tenantId).toBe(A)
    expect(record.resourceId).toBe(A)
    // A CLI has no principal, and the record says so rather than inventing one.
    expect(record.actorUserId).toBeNull()
    expect(record.context.previousFoundationalTenantId).toBeNull()

    // The half `CC-134` §6 named: without this, every cached answer still says the old foundation.
    expect(invalidateAclCache).toHaveBeenCalledTimes(1)
  })

  it('swaps cleanly from one tenant to another, and says which one stopped being foundational', async () => {
    const em = makeEm([{ id: A, name: 'A', isFoundational: true }, { id: B, name: 'B', isFoundational: false }])
    const audit = { log: jest.fn(async (_input: Record<string, unknown>) => undefined) }
    const invalidateAclCache = jest.fn(async () => undefined)

    const change = await designateFoundationalTenant(em, { tenantId: B, audit, invalidateAclCache })

    // The one-row partial unique index would refuse two, so the swap must clear before it sets.
    expect(foundationOf(em)).toEqual([B])
    expect(change.previousTenantId).toBe(A)
    expect(change.clearedTenantIds).toEqual([A])

    const record = audit.log.mock.calls[0][0] as any
    expect(record.tenantId).toBe(B)
    expect(record.context.previousFoundationalTenantId).toBe(A)
    expect(record.context.clearedTenantIds).toEqual([A])
  })

  it('clears the designation, which is the only way back to "no platform administrator"', async () => {
    const em = makeEm([{ id: A, name: 'A', isFoundational: true }])
    const audit = { log: jest.fn(async (_input: Record<string, unknown>) => undefined) }
    const invalidateAclCache = jest.fn(async () => undefined)

    const change = await designateFoundationalTenant(em, { tenantId: null, audit, invalidateAclCache })

    expect(foundationOf(em)).toEqual([])
    expect(change.foundationalTenantId).toBeNull()
    expect(change.clearedTenantIds).toEqual([A])

    const record = audit.log.mock.calls[0][0] as any
    expect(record.actionLabel).toBe('Foundational tenant cleared')
    expect(record.tenantId).toBeNull()
    expect(record.resourceId).toBe('platform')
    // Still invalidated: the answers that said "this person is a platform admin" are now wrong.
    expect(invalidateAclCache).toHaveBeenCalledTimes(1)
  })

  it('refuses an unknown tenant id, writes nothing, records nothing, and invalidates nothing', async () => {
    const em = makeEm([{ id: A, name: 'A', isFoundational: true }])
    const audit = { log: jest.fn(async (_input: Record<string, unknown>) => undefined) }
    const invalidateAclCache = jest.fn(async () => undefined)

    await expect(
      designateFoundationalTenant(em, { tenantId: UNKNOWN, audit, invalidateAclCache }),
    ).rejects.toBeInstanceOf(FoundationError)

    // A mistyped id must not be reported as a move that happened.
    expect(foundationOf(em)).toEqual([A])
    expect(audit.log).not.toHaveBeenCalled()
    expect(invalidateAclCache).not.toHaveBeenCalled()
  })

  it('does not clear the current foundation when it is designated again', async () => {
    const em = makeEm([{ id: A, name: 'A', isFoundational: true }])
    const audit = { log: jest.fn(async (_input: Record<string, unknown>) => undefined) }
    const invalidateAclCache = jest.fn(async () => undefined)

    const change = await designateFoundationalTenant(em, { tenantId: A, audit, invalidateAclCache })

    expect(foundationOf(em)).toEqual([A])
    expect(change.clearedTenantIds).toEqual([])
    expect(change.previousTenantId).toBe(A)
  })
})
