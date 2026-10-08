/** @jest-environment node */

/**
 * SD-1 — the write hook: the guard's `afterSuccess` applies the gate's default.
 *
 * **What this suite has to prove.** The gate's decision is carried in `metadata`
 * from `validate` to `afterSuccess`; this proves the wire is real:
 *
 *   1. a `defaulted` decision is **applied** to the grant role through the ACL store;
 *   2. a `decided` decision is **not** auto-applied (its records belong to a person's
 *      own grant target, which the decision type does not yet carry);
 *   3. no decision → nothing is written;
 *   4. the guard's `validate` **asks** for `afterSuccess` (`shouldRunAfterSuccess`),
 *      because a write that is never scheduled is a write that never happens.
 *
 * The container and the grant function are mocked — this suite is about the *wire*,
 * not the SQL (that is `permission-decision-grant.test.ts`).
 */

import type { MutationGuardAfterInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

const mockEm = { findOne: jest.fn(), create: jest.fn(), persist: jest.fn(), flush: jest.fn() }

const mockApply = jest.fn(async () => ({
  applied: true as const,
  roleName: 'superadmin',
  roleId: 'r1',
  aclCreated: false,
  added: ['a'],
  alreadyPresent: [] as string[],
}))

const mockCreateContainer = jest.fn(async () => ({
  resolve: (token: string) => (token === 'em' ? mockEm : null),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => mockCreateContainer(...(args as [])),
}))

jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyPermissionDecisionGrant: (...args: unknown[]) => mockApply(...(args as [])),
  resolveGrantRole: jest.fn(),
}))

import { runMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { guards, applyGateDecisionToGrantRole } from '../guards'

const FIELD_GUARD_ID = 'entities.field_definition.requires-permission-decision'
const ENTITY_GUARD_ID = 'entities.entity.requires-permission-decision'

function guardById(id: string) {
  const guard = guards.find((g) => g.id === id)
  if (!guard) throw new Error(`guard ${id} not registered`)
  return guard
}

function defaultedMetadata() {
  return {
    permissionDecision: {
      outcome: 'defaulted',
      grantTo: 'superadmin',
      records: [
        { feature: 'entities.records.customers:customer_person.view', block: 'data', surfaceId: 'customers:customer_person' },
        { feature: 'entities.records.customers:customer_person.manage', block: 'data', surfaceId: 'customers:customer_person' },
      ],
    },
  }
}

function afterInput(partial: Partial<MutationGuardAfterInput>): MutationGuardAfterInput {
  return {
    tenantId: 't1',
    organizationId: 'o1',
    userId: 'u1',
    resourceKind: 'entities.field_definition',
    resourceId: 'r1',
    operation: 'create',
    requestMethod: 'POST',
    requestHeaders: new Headers(),
    metadata: null,
    ...partial,
  }
}

beforeEach(() => {
  mockApply.mockClear()
  mockCreateContainer.mockClear()
})

describe('applyGateDecisionToGrantRole — the decision → ACL mapping', () => {
  it('applies a defaulted decision, mapping records to their feature ids', async () => {
    const result = await applyGateDecisionToGrantRole(mockEm as never, {
      tenantId: 't1',
      metadata: defaultedMetadata(),
    })
    expect(result).toMatchObject({ applied: true })
    expect(mockApply).toHaveBeenCalledTimes(1)
    const [em, input] = mockApply.mock.calls[0] as [unknown, { tenantId: string; grantTo: string; records: string[] }]
    expect(em).toBe(mockEm)
    expect(input.tenantId).toBe('t1')
    expect(input.grantTo).toBe('superadmin')
    expect(input.records).toEqual([
      'entities.records.customers:customer_person.view',
      'entities.records.customers:customer_person.manage',
    ])
  })

  it('does NOT auto-apply a decided outcome (its grant target is not carried yet)', async () => {
    const result = await applyGateDecisionToGrantRole(mockEm as never, {
      tenantId: 't1',
      metadata: { permissionDecision: { outcome: 'decided', decidedBy: 'u9', records: [{ feature: 'a.b.view' }] } },
    })
    expect(result).toBeNull()
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('does nothing when there is no decision in the metadata', async () => {
    expect(await applyGateDecisionToGrantRole(mockEm as never, { tenantId: 't1', metadata: null })).toBeNull()
    expect(await applyGateDecisionToGrantRole(mockEm as never, { tenantId: 't1', metadata: {} })).toBeNull()
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('ignores a malformed decision object', async () => {
    const result = await applyGateDecisionToGrantRole(mockEm as never, {
      tenantId: 't1',
      metadata: { permissionDecision: { outcome: 'not-a-real-outcome' } },
    })
    expect(result).toBeNull()
    expect(mockApply).not.toHaveBeenCalled()
  })
})

describe('the guard schedules and performs the write', () => {
  it('validate asks for afterSuccess on a defaulted create', async () => {
    const result = await guardById(FIELD_GUARD_ID).validate({
      tenantId: 't1',
      organizationId: 'o1',
      userId: 'u1',
      resourceKind: 'entities.field_definition',
      resourceId: null,
      operation: 'create',
      requestMethod: 'POST',
      requestHeaders: new Headers(),
      mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
    })
    expect(result.ok).toBe(true)
    expect(result.shouldRunAfterSuccess).toBe(true)
  })

  it('both guards expose an afterSuccess hook', () => {
    expect(typeof guardById(FIELD_GUARD_ID).afterSuccess).toBe('function')
    expect(typeof guardById(ENTITY_GUARD_ID).afterSuccess).toBe('function')
  })

  it('afterSuccess writes the records for a defaulted decision', async () => {
    await guardById(FIELD_GUARD_ID).afterSuccess!(afterInput({ metadata: defaultedMetadata() }))
    expect(mockApply).toHaveBeenCalledTimes(1)
    const [, input] = mockApply.mock.calls[0] as [unknown, { grantTo: string }]
    expect(input.grantTo).toBe('superadmin')
  })

  it('afterSuccess does nothing when the metadata carries no defaulted decision', async () => {
    await guardById(FIELD_GUARD_ID).afterSuccess!(afterInput({ metadata: null }))
    await guardById(FIELD_GUARD_ID).afterSuccess!(
      afterInput({ metadata: { permissionDecision: { outcome: 'decided', decidedBy: 'u9', records: [] } } }),
    )
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('logs and does not crash when no request EntityManager is available', async () => {
    mockCreateContainer.mockRejectedValueOnce(new Error('no orm'))
    await expect(
      guardById(FIELD_GUARD_ID).afterSuccess!(afterInput({ metadata: defaultedMetadata() })),
    ).resolves.toBeUndefined()
    expect(mockApply).not.toHaveBeenCalled()
  })
})

/**
 * The hop a hostile critic proved was untested: `runMutationGuards` must carry the
 * decision from `validate` into `afterSuccessCallbacks` as `metadata`. If the runner
 * dropped the metadata, every other test here would still pass and the write would
 * never fire in production — so this test goes through the **real runner**, not a
 * hand-built `afterInput`.
 */
describe('end-to-end through the real runner (the metadata wire)', () => {
  it('carries the defaulted decision from validate to afterSuccess, and the write fires', async () => {
    const result = await runMutationGuards(
      guards,
      {
        tenantId: 't1',
        organizationId: 'o1',
        userId: 'u1',
        resourceKind: 'entities.field_definition',
        resourceId: null,
        operation: 'create',
        requestMethod: 'POST',
        requestHeaders: new Headers(),
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier', kind: 'text' },
      },
      { userFeatures: [] },
    )

    expect(result.ok).toBe(true)
    const entry = result.afterSuccessCallbacks.find((cb) => cb.guard.id === FIELD_GUARD_ID)
    expect(entry).toBeDefined()
    const decision = (entry!.metadata as { permissionDecision?: { outcome?: string } } | null)?.permissionDecision
    expect(decision?.outcome).toBe('defaulted')

    // Run it exactly as `runRouteMutationGuards` does — the runner's own contract.
    await entry!.guard.afterSuccess!(
      afterInput({ metadata: entry!.metadata as Record<string, unknown> }),
    )
    expect(mockApply).toHaveBeenCalledTimes(1)
  })

  it('queues no afterSuccess when a create is refused', async () => {
    const result = await runMutationGuards(
      guards,
      {
        tenantId: 't1',
        organizationId: 'o1',
        userId: 'u1',
        resourceKind: 'entities.field_definition',
        resourceId: null,
        operation: 'create',
        requestMethod: 'POST',
        requestHeaders: new Headers(),
        mutationPayload: { entityId: 'customers:customer_person' },
      },
      { userFeatures: [] },
    )
    expect(result.ok).toBe(false)
    expect(result.afterSuccessCallbacks).toEqual([])
  })
})
