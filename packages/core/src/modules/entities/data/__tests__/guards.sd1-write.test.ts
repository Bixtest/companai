/** @jest-environment node */

/**
 * SD-1 — the write hook: the guard's `afterSuccess` applies the gate's decision.
 *
 * **What this suite has to prove.** The gate's decision is carried in `metadata`
 * from `validate` to `afterSuccess`; this proves the wire is real:
 *
 *   1. a `defaulted` decision is **carried** from `validate` to `afterSuccess` and
 *      handed to the shared mapping;
 *   2. a `decided` decision is carried too and **is** written (CC-17 — before this
 *      it was dropped, because the decision type carried no grant target);
 *   3. no readable decision → nothing is written;
 *   4. the guard's `validate` **asks** for `afterSuccess` (`shouldRunAfterSuccess`),
 *      because a write that is never scheduled is a write that never happens;
 *   5. a decision carried on the **request header** reaches the gate (CC-17) and
 *      produces a `decided` outcome the guard then writes.
 *
 * The container and the grant function are mocked — this suite is about the *wire*,
 * not the SQL (that is `permission-decision-grant.test.ts`).
 */

import type { MutationGuardAfterInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { STRUCTURE_DECISION_HEADER_NAME } from '@open-mercato/shared/lib/permissions/structure-change-decision-header'

const mockEm = { findOne: jest.fn(), create: jest.fn(), persist: jest.fn(), flush: jest.fn() }

// The mapping from a gate outcome to a grant lives in `applyStructureChangeGrant`
// (auth/lib/permission-decision-grant.ts), which the guard calls. This file proves the
// guard's WIRING — that it reads the decision out of `metadata` and hands it over — and
// that mapping's own contract (defaulted AND decided are written; refused is not) is
// proved against the real module in `auth/lib/__tests__/permission-decision-grant.test.ts`.
// The stand-in below mirrors that contract, so an outcome that should not be written
// produces no grant here either.
const mockApply = jest.fn(
  async (
    _em: unknown,
    input: { tenantId?: string; decision?: { outcome?: string; grantTo?: string } },
  ) =>
    input?.decision?.outcome === 'defaulted' || input?.decision?.outcome === 'decided'
      ? {
          applied: true as const,
          roleName: input.decision.grantTo ?? 'superadmin',
          roleId: 'r1',
          aclCreated: false,
          added: ['a'],
          alreadyPresent: [] as string[],
        }
      : null,
)

const mockCreateContainer = jest.fn(async () => ({
  resolve: (token: string) => (token === 'em' ? mockEm : null),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => mockCreateContainer(...(args as [])),
}))

// CC-25 added an authorisation step to the guard's gate (`assertActorMayStateDecision`).
// This suite is about the *wire* (a header decision reaches the gate and is carried to
// `afterSuccess`), not about the authorisation — so the actor check is mocked as
// **granted** here. The refusal paths are proved against the real function in
// `permission-decision-grant.test.ts` and in the CC-25 guard suite.
const mockAssertActorMayStateDecision = jest.fn(async () => undefined)

jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyStructureChangeGrant: (...args: unknown[]) => mockApply(...(args as [])),
  resolveGrantRole: jest.fn(),
  assertActorMayStateDecision: (...args: unknown[]) => mockAssertActorMayStateDecision(...(args as [])),
  STRUCTURE_DECISION_PERMISSION: 'entities.definitions.decide',
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

describe('applyGateDecisionToGrantRole — reading the decision out of the guard metadata', () => {
  it('reads a defaulted decision out of the metadata and hands it to the shared mapping', async () => {
    const result = await applyGateDecisionToGrantRole(mockEm as never, {
      tenantId: 't1',
      metadata: defaultedMetadata(),
    })
    expect(result).toMatchObject({ applied: true })
    expect(mockApply).toHaveBeenCalledTimes(1)
    const [em, input] = mockApply.mock.calls[0] as [
      unknown,
      { tenantId: string; decision: { outcome: string; grantTo: string; records: { feature: string }[] } },
    ]
    expect(em).toBe(mockEm)
    expect(input.tenantId).toBe('t1')
    expect(input.decision.outcome).toBe('defaulted')
    expect(input.decision.grantTo).toBe('superadmin')
    expect(input.decision.records.map((record) => record.feature)).toEqual([
      'entities.records.customers:customer_person.view',
      'entities.records.customers:customer_person.manage',
    ])
  })

  it('hands a decided outcome to the shared mapping, which now writes it (CC-17)', async () => {
    const result = await applyGateDecisionToGrantRole(mockEm as never, {
      tenantId: 't1',
      metadata: {
        permissionDecision: { outcome: 'decided', decidedBy: 'u9', grantTo: 'finance', records: [{ feature: 'a.b.view' }] },
      },
    })
    // The guard does not filter the outcome itself: the one place that decides which
    // outcomes are written is `applyStructureChangeGrant`, and since CC-17 that place
    // writes both `defaulted` and `decided`. Here we prove the decision is carried
    // across with its grant target intact — not dropped.
    expect(mockApply).toHaveBeenCalledTimes(1)
    const [, input] = mockApply.mock.calls[0] as [unknown, { decision: { grantTo?: string } }]
    expect(input.decision.grantTo).toBe('finance')
    expect(result).toMatchObject({ applied: true, roleName: 'finance' })
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

  it('afterSuccess asks the shared mapping for a defaulted decision', async () => {
    await guardById(FIELD_GUARD_ID).afterSuccess!(afterInput({ metadata: defaultedMetadata() }))
    expect(mockApply).toHaveBeenCalledTimes(1)
    const [, input] = mockApply.mock.calls[0] as [unknown, { decision: { grantTo: string } }]
    expect(input.decision.grantTo).toBe('superadmin')
  })

  it('afterSuccess writes a decided decision too (CC-17 — it is no longer dropped)', async () => {
    await guardById(FIELD_GUARD_ID).afterSuccess!(
      afterInput({
        metadata: {
          permissionDecision: {
            outcome: 'decided',
            decidedBy: 'u9',
            grantTo: 'finance',
            records: [{ feature: 'a.b.view', block: 'data', surfaceId: 'a.b' }],
          },
        },
      }),
    )
    expect(mockApply).toHaveBeenCalledTimes(1)
    const [, input] = mockApply.mock.calls[0] as [unknown, { decision: { outcome: string; grantTo: string } }]
    expect(input.decision.outcome).toBe('decided')
    expect(input.decision.grantTo).toBe('finance')
  })

  it('afterSuccess writes nothing for a refused decision — no surface landed to grant', async () => {
    await guardById(FIELD_GUARD_ID).afterSuccess!(
      afterInput({
        metadata: { permissionDecision: { outcome: 'refused', reason: 'no_surface', because: 'nothing to grant' } },
      }),
    )
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('afterSuccess writes nothing when the metadata carries no readable decision at all', async () => {
    await guardById(FIELD_GUARD_ID).afterSuccess!(afterInput({ metadata: null }))
    await guardById(FIELD_GUARD_ID).afterSuccess!(afterInput({ metadata: {} }))
    await guardById(FIELD_GUARD_ID).afterSuccess!(
      afterInput({ metadata: { permissionDecision: { outcome: 'not-a-real-outcome' } } }),
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

/**
 * CC-17 — the reachable entry point for the `decided` branch, proven end to end.
 *
 * Before CC-17 **no caller ever supplied a decision**, so the gate's `decided`
 * branch was unreachable dead code: S2 says the permissions are decided *"either by
 * a person or by a rule"*, but only the rule could ever fire. These tests drive a
 * decision in through the **header** — the carrier — and prove the guard's gate reads
 * it and produces a `decided` outcome (not the default), then writes it.
 */
describe('CC-17 — a decision on the request header reaches the gate', () => {
  function headersValue(): Headers {
    const h = new Headers()
    h.set(
      STRUCTURE_DECISION_HEADER_NAME,
      JSON.stringify({
        decidedBy: 'role:finance-admin',
        grantTo: 'finance',
        records: [
          { feature: 'customers:customer_person.loyalty_tier.view' },
          { feature: 'customers:customer_person.loyalty_tier.manage' },
        ],
      }),
    )
    return h
  }

  it('the guard’s validate produces a decided outcome (not the default) when the header carries a decision', async () => {
    const result = await guardById(FIELD_GUARD_ID).validate({
      tenantId: 't1',
      organizationId: 'o1',
      userId: 'u1',
      resourceKind: 'entities.field_definition',
      resourceId: null,
      operation: 'create',
      requestMethod: 'POST',
      requestHeaders: headersValue(),
      mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
    })
    expect(result.ok).toBe(true)
    const decision = (result.metadata as { permissionDecision?: { outcome?: string; grantTo?: string } } | undefined)
      ?.permissionDecision
    expect(decision?.outcome).toBe('decided')
    expect(decision?.grantTo).toBe('finance')
  })

  it('with no header, the same create defaults (the two paths are told apart)', async () => {
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
    const decision = (result.metadata as { permissionDecision?: { outcome?: string } } | undefined)?.permissionDecision
    expect(decision?.outcome).toBe('defaulted')
  })

  it('a malformed decision header is REFUSED with 400 — never silently treated as "no decision"', async () => {
    const h = new Headers()
    h.set(STRUCTURE_DECISION_HEADER_NAME, '{ this is not json')
    const result = await guardById(FIELD_GUARD_ID).validate({
      tenantId: 't1',
      organizationId: 'o1',
      userId: 'u1',
      resourceKind: 'entities.field_definition',
      resourceId: null,
      operation: 'create',
      requestMethod: 'POST',
      requestHeaders: h,
      mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
    })
    // Falling through to the default here would default-grant superadmin and discard
    // the person's (broken) intent — a fail-open reading of a broken authorisation.
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.status).toBe(400)
      expect(result.message).toContain(STRUCTURE_DECISION_HEADER_NAME)
    }
  })

  it('the entity guard honours the header the same way (both guards share one carrier)', async () => {
    const h = new Headers()
    h.set(
      STRUCTURE_DECISION_HEADER_NAME,
      JSON.stringify({ decidedBy: 'admin', grantTo: 'ops', records: [{ feature: 'entities.records.customers:customer_person.view' }] }),
    )
    const result = await guardById(ENTITY_GUARD_ID).validate({
      tenantId: 't1',
      organizationId: 'o1',
      userId: 'u1',
      resourceKind: 'entities.entity',
      resourceId: null,
      operation: 'create',
      requestMethod: 'POST',
      requestHeaders: h,
      mutationPayload: { entityId: 'customers:customer_person' },
    })
    expect(result.ok).toBe(true)
    const decision = (result.metadata as { permissionDecision?: { outcome?: string; grantTo?: string } } | undefined)
      ?.permissionDecision
    expect(decision?.outcome).toBe('decided')
    expect(decision?.grantTo).toBe('ops')
  })
})

/**
 * CC-25 — the guard refuses a decision from an unauthorised actor.
 *
 * The guard shares ONE chokepoint (`runStructureChangeGate`) for both the field and
 * the entity guard, and the actor check lives there. This proves the *translation*:
 * a refused actor check surfaces as the guard's own block (`ok:false`) carrying the
 * platform status (403), so the runner stops the write — not an unhandled throw.
 */
describe('CC-25 — the guard refuses an unauthorised decision', () => {
  afterEach(() => mockAssertActorMayStateDecision.mockReset().mockResolvedValue(undefined))

  function decisionHeaders(): Headers {
    const h = new Headers()
    h.set(
      STRUCTURE_DECISION_HEADER_NAME,
      JSON.stringify({ decidedBy: 'user-1', grantTo: 'finance', records: [{ feature: 'x.y.view' }] }),
    )
    return h
  }

  it('a refused actor check blocks the create with the platform status (403), queueing no write', async () => {
    mockAssertActorMayStateDecision.mockRejectedValueOnce(
      new (require('@open-mercato/shared/lib/crud/errors').CrudHttpError)(403, {
        error: 'Stating a permission decision needs the "entities.definitions.decide" permission.',
      }),
    )
    const result = await guardById(FIELD_GUARD_ID).validate({
      tenantId: 't1',
      organizationId: 'o1',
      userId: 'u1',
      resourceKind: 'entities.field_definition',
      resourceId: null,
      operation: 'create',
      requestMethod: 'POST',
      requestHeaders: decisionHeaders(),
      mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
    })
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.status).toBe(403)
      expect(result.message).toContain('decide')
    }
  })

  it('a decision with NO header actor context is still refused (no actor → fail closed)', async () => {
    mockAssertActorMayStateDecision.mockRejectedValueOnce(
      new (require('@open-mercato/shared/lib/crud/errors').CrudHttpError)(403, { error: 'no actor' }),
    )
    const result = await guardById(ENTITY_GUARD_ID).validate({
      tenantId: 't1',
      organizationId: 'o1',
      userId: 'u1',
      resourceKind: 'entities.entity',
      resourceId: null,
      operation: 'create',
      requestMethod: 'POST',
      requestHeaders: decisionHeaders(),
      mutationPayload: { entityId: 'customers:customer_person' },
    })
    expect(result.ok).toBe(false)
  })
})
