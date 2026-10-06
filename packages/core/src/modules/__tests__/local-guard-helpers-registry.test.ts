/**
 * The module-local `guards.ts` helpers must run the SAME guard set that
 * `makeCrudRoute` writes enforce.
 *
 * This lives under `modules/__tests__/` (not in one module) because it is a
 * CROSS-MODULE contract: one defect class, four helpers.
 *
 * FOUR modules once built their guard array from the legacy bridge ALONE —
 * `runMutationGuards([legacyGuard], …)` — so every guard in the global
 * mutation-guard store was silently skipped:
 *
 *   messages/api/guards.ts          runMessageMutationGuards
 *   integrations/api/guards.ts      runIntegrationMutationGuards
 *   payment_gateways/api/guards.ts  runPaymentGatewayMutationGuards  (module parked)
 *   staff/api/guards.ts             runStaffMutationGuards
 *
 * plus two inline copies in `sales/api/quotes/{convert,send}/route.ts` and one
 * in `configs/api/cache/route.ts`. All were the same one-line defect, and all
 * are now fixed to include `getAllMutationGuardInstances()`. (The
 * `*.mutation-guard.ts` wrappers were never affected — they call
 * `runRouteMutationGuards`, which already includes the registry.)
 *
 * THE POINT — it must not be able to pass vacuously:
 *   - It imports the REAL helpers, not mocks.
 *   - It registers the guard through the REAL store the app uses
 *     (`registerMutationGuards`), the same pair `bootstrap/factory.ts` calls.
 *   - It asserts the guard is ACTUALLY CALLED. Before the fix the guard was
 *     never invoked, so this fails on "called" — a real proof, not a print.
 *   - The container has NO legacy service, so the ONLY guard that can run is
 *     the registry one — the test isolates exactly the path being fixed.
 *   - It restores the store in `afterEach` so it cannot leak into siblings.
 */
import type { AwilixContainer } from 'awilix'
import {
  registerMutationGuards,
  getAllMutationGuardInstances,
} from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard, MutationGuardInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { runMessageMutationGuards } from '../messages/api/guards'
import { runIntegrationMutationGuards } from '../integrations/api/guards'
import { runPaymentGatewayMutationGuards } from '../payment_gateways/api/guards'
import { runStaffMutationGuards } from '../staff/api/guards'

type GuardRunner = (
  container: AwilixContainer,
  input: MutationGuardInput,
  userFeatures: string[],
) => Promise<{ ok: boolean; errorStatus?: number; errorBody?: Record<string, unknown>; afterSuccessCallbacks: unknown[] }>

/**
 * A container with NO legacy service registered — so `bridgeLegacyGuard()`
 * returns null and the ONLY guard that can run is the registry one. If a helper
 * still built `[legacyGuard]`, the array would be empty and the guard would
 * never run — which is exactly the failure this asserts against.
 */
const legacyFreeContainer = {
  hasRegistration: () => false,
  resolve: () => {
    throw new Error('no services in this container')
  },
} as unknown as AwilixContainer

function messageInput(overrides: Partial<MutationGuardInput> = {}): MutationGuardInput {
  return {
    tenantId: '11111111-1111-4111-8111-111111111111',
    organizationId: '22222222-2222-4222-8222-222222222222',
    userId: '33333333-3333-4333-8333-333333333333',
    resourceKind: 'messages.message',
    resourceId: null,
    operation: 'create',
    requestMethod: 'POST',
    requestHeaders: new Headers(),
    mutationPayload: { subject: 'hello' },
    ...overrides,
  }
}

const validateMock = jest.fn()

function registryGuard(targetEntity: string): MutationGuard {
  return {
    id: 'test.blocker',
    targetEntity,
    operations: ['create', 'update', 'delete'],
    async validate(input) {
      return validateMock(input)
    },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  registerMutationGuards([]) // clean store per test — no leakage
  validateMock.mockResolvedValue({ ok: true })
})

afterEach(() => {
  registerMutationGuards([])
})

/**
 * Every module-local helper, named so a failure says WHICH one regressed.
 */
const HELPERS: Array<[string, GuardRunner]> = [
  ['runMessageMutationGuards (messages)', runMessageMutationGuards],
  ['runIntegrationMutationGuards (integrations)', runIntegrationMutationGuards],
  ['runPaymentGatewayMutationGuards (payment_gateways)', runPaymentGatewayMutationGuards],
  ['runStaffMutationGuards (staff)', runStaffMutationGuards],
]

describe.each(HELPERS)('%s reaches the global registry', (_name, run) => {
  it('runs a registry guard registered for the module’s resource kind', async () => {
    expect(getAllMutationGuardInstances()).toHaveLength(0)
    registerMutationGuards([{ moduleId: 'test', guards: [registryGuard('messages.message')] }])
    expect(getAllMutationGuardInstances()).toHaveLength(1)

    const result = await run(legacyFreeContainer, messageInput(), [])

    // The registry guard MUST have been called. Before the fix the helper only
    // ran the (absent) legacy guard, so this assertion failed — that is what
    // makes this a real proof and not a print.
    expect(validateMock).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
  })

  it('lets a registry guard BLOCK the write', async () => {
    registerMutationGuards([{ moduleId: 'test', guards: [registryGuard('messages.message')] }])
    validateMock.mockResolvedValue({
      ok: false,
      status: 423,
      body: { error: 'Record locked', guardId: 'test.blocker' },
    })

    const result = await run(legacyFreeContainer, messageInput(), [])

    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(423)
    expect(result.errorBody).toEqual({ error: 'Record locked', guardId: 'test.blocker' })
  })

  it('does NOT run a registry guard for a different resource kind', async () => {
    registerMutationGuards([{ moduleId: 'test', guards: [registryGuard('entities.field_definition')] }])

    const result = await run(legacyFreeContainer, messageInput(), [])

    expect(validateMock).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  it('returns ok with no callbacks when nothing is registered anywhere', async () => {
    const result = await run(legacyFreeContainer, messageInput(), [])

    expect(validateMock).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, afterSuccessCallbacks: [] })
  })
})
