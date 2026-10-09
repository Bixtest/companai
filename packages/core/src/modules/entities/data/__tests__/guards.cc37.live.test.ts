/** @jest-environment node */

/**
 * CC-37 — the guard's **live-setting** escalation path, end to end.
 *
 * `guards.cc37.test.ts` proves the *pure* decision and the seed/ordinary-object
 * behaviour through the registry — but under the seed no explicit rule exists, so
 * the guard never reaches its `if (escalation) return { ok: true, escalation }`
 * line. A mutation that deleted that line was **silent** against that suite: the
 * escalation path was unreachable there.
 *
 * This suite makes it reachable: `createRequestContainer` is mocked so the guard's
 * `loadStructuralSettingsForGuard` reads a **placed** setting from a fake
 * `moduleConfigService`. It proves the wiring a superadmin actually triggers —
 * place an `approval` rule → the next protected write is *held for a person*
 * (ok:true + escalation, D3) — and that a **store failure still fails closed**
 * (seed → 422), so a broken setting can never loosen a protected surface.
 */

const mockGetValue = jest.fn()

const container = {
  resolve: (key: string) => {
    if (key === 'moduleConfigService') {
      return { getValue: mockGetValue }
    }
    return null
  },
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => container,
}))

import { runMutationGuards, type MutationGuardInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { guards } from '../guards'
import { STRUCTURAL_SETTINGS_MODULE, STRUCTURAL_SETTINGS_NAME } from '@open-mercato/shared/lib/permissions/structural-settings'

function input(partial: Partial<MutationGuardInput>): MutationGuardInput {
  return {
    tenantId: 't1',
    organizationId: 'o1',
    userId: 'u1',
    resourceId: null,
    requestMethod: 'DELETE',
    requestHeaders: new Headers(),
    mutationPayload: null,
    ...partial,
  } as MutationGuardInput
}

const ctx = { userFeatures: [] as string[] }

/** The setting a superadmin places: a person removing a column is held for review. */
const PLACED = {
  rules: { column: { remove: { human: 'approval' } } },
  defaultLevel: 'approval',
}

beforeEach(() => {
  mockGetValue.mockReset()
})

describe('CC-37 — the guard reads the LIVE setting (the wiring a superadmin triggers)', () => {
  it('escalates a protected delete when a person has placed an `approval` rule', async () => {
    mockGetValue.mockResolvedValue(PLACED)

    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
        actorKind: 'human',
      }),
      ctx,
    )

    // The escalate outcome (D3): not a pass, not a block — held for a person.
    expect(result.ok).toBe(true)
    expect(result.escalation).toBeDefined()
    expect(result.escalation?.status).toBe(202)
    expect(result.escalation?.gate).toBe('A3')
    expect(result.escalation?.rule).toBe('structural_permission.column.remove.approval')
    expect(result.escalation?.because).toContain('a person')
    // Nothing runs: an escalation short-circuits the chain.
    expect(result.afterSuccessCallbacks).toHaveLength(0)
  })

  it('asks the store for this feature’s own key, in the caller’s tenant scope', async () => {
    mockGetValue.mockResolvedValue(PLACED)

    await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
        actorKind: 'human',
      }),
      ctx,
    )

    expect(mockGetValue).toHaveBeenCalledWith(
      STRUCTURAL_SETTINGS_MODULE,
      STRUCTURAL_SETTINGS_NAME,
      expect.objectContaining({ scope: { tenantId: 't1' } }),
    )
  })

  it('the placed rule is per-actor (S12): a machine with only a `human` rule is still refused', async () => {
    mockGetValue.mockResolvedValue(PLACED) // only a `human` row exists

    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
        actorKind: 'ai_worker',
      }),
      ctx,
    )

    // No `ai`/`any` row reaches the machine → no explicit level → the absolute 422 stands.
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
    expect(result.escalation).toBeUndefined()
  })

  it('fails closed: a store that throws yields the seed, so the 422 stands (not a 202)', async () => {
    mockGetValue.mockRejectedValue(new Error('store unreachable'))

    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
        actorKind: 'human',
      }),
      ctx,
    )

    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
    expect(result.escalation).toBeUndefined()
  })

  it('fails closed: a MALFORMED stored setting yields the seed (the 422 stands)', async () => {
    mockGetValue.mockResolvedValue({ rules: { column: { remove: { human: 'garbage' } } }, defaultLevel: 'approval' })

    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
        actorKind: 'human',
      }),
      ctx,
    )

    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
    expect(result.escalation).toBeUndefined()
  })

  it('a non-reserved object is unaffected — the live setting is not even consulted', async () => {
    mockGetValue.mockResolvedValue(PLACED)

    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
        actorKind: 'human',
      }),
      ctx,
    )

    expect(result.ok).toBe(true)
    expect(result.escalation).toBeUndefined()
    expect(mockGetValue).not.toHaveBeenCalled()
  })
})
