/**
 * The invoker reaches the resolver through the one method every permission check
 * uses (`CC-123`).
 *
 * `userHasAllFeatures` is the single door: all ~102 call sites reach a permission
 * decision through it. Passing the invoker here is what makes the rule apply to
 * every route-gated request without touching a single caller — and *not* passing
 * it is what left the HTTP path judging a credential on its own.
 *
 * The ACL layer and the resolver's internals are stubbed: this file is about the
 * wiring between them, and exercising either for real is covered elsewhere.
 */

import { RbacService } from '../rbacService'

const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }
const FEATURE = 'ai_assistant.view'
const MACHINE = 'api_key:key-1'
const OWNER = 'person-1'

type ResolverStub = {
  refusalFor: jest.Mock
  invokerRefusalFor: jest.Mock
}

function resolverStub(overrides: Partial<ResolverStub> = {}): ResolverStub {
  return {
    refusalFor: jest.fn(async () => null),
    invokerRefusalFor: jest.fn(async () => null),
    ...overrides,
  }
}

function makeService(resolver: ResolverStub | null) {
  const service = new RbacService({} as never, undefined, resolver as never, null, null)
  const internals = service as unknown as Record<string, unknown>
  // Everything except the authority half is stubbed, so a failure below can only
  // be the wiring this file is about.
  internals.decideAllFeatures = jest.fn(async () => true)
  internals.shadowResolver = jest.fn()
  internals.withheldFromThisPerson = jest.fn(async () => false)
  internals.grantedByDelegation = jest.fn(async () => false)
  return service
}

describe('the invoker is carried into the resolver', () => {
  it('passes it to the capability-aware half', async () => {
    const resolver = resolverStub()
    const service = makeService(resolver)

    await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })

    expect(resolver.refusalFor).toHaveBeenCalledWith(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })
  })

  it('passes it to the holding half as a bare id', async () => {
    const resolver = resolverStub()
    const service = makeService(resolver)

    await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })

    expect(resolver.invokerRefusalFor).toHaveBeenCalledWith(MACHINE, [FEATURE], SCOPE, OWNER)
  })

  it('passes null when the caller has no invoker, rather than inventing one', async () => {
    const resolver = resolverStub()
    const service = makeService(resolver)

    await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE)

    expect(resolver.refusalFor).toHaveBeenCalledWith(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: null })
    expect(resolver.invokerRefusalFor).toHaveBeenCalledWith(MACHINE, [FEATURE], SCOPE, null)
  })
})

describe('either half can refuse, and the answer is still only "no"', () => {
  it('refuses when the capability-aware half refuses', async () => {
    const resolver = resolverStub({
      refusalFor: jest.fn(async () => ({
        capabilityId: FEATURE,
        decision: { allowed: false, bindingRule: 'graph', reasons: [] },
      })),
    })
    const service = makeService(resolver)

    expect(await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })).toBe(false)
  })

  it('does not ask the holding half once the first half has refused', async () => {
    const resolver = resolverStub({
      refusalFor: jest.fn(async () => ({
        capabilityId: FEATURE,
        decision: { allowed: false, bindingRule: 'graph', reasons: [] },
      })),
    })
    const service = makeService(resolver)

    await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })

    expect(resolver.invokerRefusalFor).not.toHaveBeenCalled()
  })

  it('refuses when only the holding half refuses', async () => {
    // This is the case that was blind before `CC-123`: an undescribed feature, so
    // the capability-aware half returns null, and the person does not hold it.
    const resolver = resolverStub({
      invokerRefusalFor: jest.fn(async () => ({
        capabilityId: FEATURE,
        bindingRule: 'invoker-lacks-capability',
        because: 'The person this actor acts for does not hold this capability.',
      })),
    })
    const service = makeService(resolver)

    expect(await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })).toBe(false)
  })

  it('allows when neither half refuses', async () => {
    const service = makeService(resolverStub())

    expect(await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })).toBe(true)
  })
})

describe('an absent resolver is not evidence of a constraint', () => {
  it('allows when no resolver is wired at all', async () => {
    const service = makeService(null)

    expect(await service.userHasAllFeatures(MACHINE, [FEATURE], SCOPE, { onBehalfOfUserId: OWNER })).toBe(true)
  })
})
