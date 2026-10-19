/**
 * The invoker rule — authority is carried, never amplified (`CC-123`).
 *
 * A credential acts *for* somebody. The rule is that it can never do more than
 * that person could, and it has two halves:
 *
 * - the **capability-aware** half, which needs a risk descriptor (`refusalFor`);
 * - the **holding** half, which is a feature-id question and needs none
 *   (`invokerRefusalFor`) — that is what makes the rule cover features no module
 *   has described yet, which measured at 36 of the 157 enabled (`CC-132`).
 *
 * The tests below exist to fail if either half stops being consulted, and if the
 * guard that stops the two from recursing is removed.
 */

import {
  AuthorityEnforcementService,
  type InvokerRefusal,
} from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const TENANT = 'tenant-1'
const ORGANIZATION = 'org-team'
const MACHINE = 'api_key:key-1'
const OWNER = 'person-1'

const READ = 'directory.organizations.view'
const WRITE = 'directory.organizations.manage'
/** Deliberately never registered — this is the coverage gap `CC-132` measures. */
const UNDESCRIBED = 'ai_assistant.view'

const SCOPE = { tenantId: TENANT, organizationId: ORGANIZATION }

function configReturning(mode: unknown) {
  return {
    getValue: jest.fn(async <T>(_module: string, _name: string, options?: { defaultValue?: T | null }) =>
      (mode === undefined ? (options?.defaultValue ?? null) : mode) as T | null),
  }
}

function graphReturning(ceiling: string) {
  return {
    cachedCeilingFor: jest.fn(async () => ({
      ceiling: ceiling as never,
      basis: 'edges',
      contributingEdges: [{ because: 'an edge caps authority here' }],
    })),
  }
}

/** The reader the resolver asks whether the invoker holds a capability. */
function readerHolding(features: string[]) {
  return {
    holdsCapability: jest.fn(async (_userId: string, featureId: string) => features.includes(featureId)),
  }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    { id: READ, title: 'View organizations', module: 'directory', capability: { effectClass: 'E0', reversibility: 'reversible' } },
    { id: WRITE, title: 'Manage organizations', module: 'directory', capability: { effectClass: 'E5', reversibility: 'reversible' } },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('R3 — refusalFor carries the invoker into the decision', () => {
  it('refuses when the person the credential acts for does not hold the capability', async () => {
    const service = new AuthorityEnforcementService(
      graphReturning('A5'),
      configReturning('enforce'),
      readerHolding([]),
    )

    const refusal = await service.refusalFor(MACHINE, [WRITE], SCOPE, { onBehalfOfUserId: OWNER })

    expect(refusal).not.toBeNull()
    expect(refusal!.capabilityId).toBe(WRITE)
    expect(refusal!.decision.allowed).toBe(false)
  })

  it('allows the same act for the same credential when no invoker is supplied', async () => {
    // The control for the test above: the refusal is caused by the invoker, not by
    // the graph or the capability. Without this pair, a broken fixture would look
    // like a passing rule.
    const service = new AuthorityEnforcementService(
      graphReturning('A5'),
      configReturning('enforce'),
      readerHolding([]),
    )

    expect(await service.refusalFor(MACHINE, [WRITE], SCOPE)).toBeNull()
  })

  it('allows when the person does hold it', async () => {
    const service = new AuthorityEnforcementService(
      graphReturning('A5'),
      configReturning('enforce'),
      readerHolding([WRITE]),
    )

    expect(await service.refusalFor(MACHINE, [WRITE], SCOPE, { onBehalfOfUserId: OWNER })).toBeNull()
  })
})

describe('R4 — the holding half needs no capability descriptor', () => {
  it('refuses an undescribed feature the person does not hold', async () => {
    // `refusalFor` cannot answer here: no module describes the capability, so
    // `decideFor` returns null. That is the gap this method closes.
    const service = new AuthorityEnforcementService(
      graphReturning('A5'),
      configReturning('enforce'),
      readerHolding([]),
    )

    expect(await service.refusalFor(MACHINE, [UNDESCRIBED], SCOPE, { onBehalfOfUserId: OWNER })).toBeNull()

    const refusal: InvokerRefusal | null = await service.invokerRefusalFor(MACHINE, [UNDESCRIBED], SCOPE, OWNER)

    expect(refusal).not.toBeNull()
    expect(refusal!.capabilityId).toBe(UNDESCRIBED)
    expect(refusal!.bindingRule).toBe('invoker-lacks-capability')
    expect(refusal!.because).toContain('does not hold this capability')
  })

  it('allows an undescribed feature the person does hold', async () => {
    const service = new AuthorityEnforcementService(
      graphReturning('A5'),
      configReturning('enforce'),
      readerHolding([UNDESCRIBED]),
    )

    expect(await service.invokerRefusalFor(MACHINE, [UNDESCRIBED], SCOPE, OWNER)).toBeNull()
  })

  it('does not re-decide a feature some module describes', async () => {
    // `refusalFor` has already settled those, with the invoker supplied. Asking
    // again here would put two answers to one question in the codebase.
    const reader = readerHolding([])
    const service = new AuthorityEnforcementService(graphReturning('A5'), configReturning('enforce'), reader)

    expect(await service.invokerRefusalFor(MACHINE, [WRITE], SCOPE, OWNER)).toBeNull()
    expect(reader.holdsCapability).not.toHaveBeenCalled()
  })
})

describe('R5 — the rule runs only when there is an invoker, so it cannot recurse', () => {
  it('asks nothing when no invoker is supplied', async () => {
    // This is the guard, not an optimisation. The reader is implemented as
    // `rbacService.userHasAllFeatures`, which re-enters `refusalFor`; a human has
    // no invoker, so the inner call returns here with null and terminates.
    const reader = readerHolding([])
    const service = new AuthorityEnforcementService(graphReturning('A5'), configReturning('enforce'), reader)

    expect(await service.invokerRefusalFor(MACHINE, [UNDESCRIBED], SCOPE, null)).toBeNull()
    expect(reader.holdsCapability).not.toHaveBeenCalled()
  })

  it('treats a person as answering to themselves even if handed an invoker', async () => {
    // `principal.ts` fills the field only for a credential. A human carrying one
    // is not evidence that the human is acting for somebody else, and capping
    // them by it would apply a decision that is not about them.
    const reader = readerHolding([])
    const service = new AuthorityEnforcementService(graphReturning('A5'), configReturning('enforce'), reader)

    expect(await service.invokerRefusalFor('person-9', [UNDESCRIBED], SCOPE, OWNER)).toBeNull()
    expect(reader.holdsCapability).not.toHaveBeenCalled()
  })
})

describe('R6 — an unreadable invoker fails closed, in enforce only', () => {
  it('refuses when the reader is missing and the tenant is enforcing', async () => {
    const service = new AuthorityEnforcementService(null, configReturning('enforce'), null)

    const refusal = await service.invokerRefusalFor(MACHINE, [UNDESCRIBED], SCOPE, OWNER)

    expect(refusal).not.toBeNull()
    expect(refusal!.bindingRule).toBe('invoker-unreadable')
  })

  it('changes nothing while the tenant is only observing', async () => {
    const service = new AuthorityEnforcementService(null, configReturning('shadow'), null)

    expect(await service.invokerRefusalFor(MACHINE, [UNDESCRIBED], SCOPE, OWNER)).toBeNull()
  })
})

describe('R7 — no tenant is switched on by this rule', () => {
  it('still defaults to observing', async () => {
    const service = new AuthorityEnforcementService(null, configReturning(undefined), null)

    expect(await service.modeFor(TENANT)).toBe('shadow')
    expect(await service.invokerRefusalFor(MACHINE, [UNDESCRIBED], SCOPE, OWNER)).toBeNull()
  })
})
