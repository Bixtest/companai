/**
 * Invariant **I4** — authority is carried, never amplified.
 *
 * The platform has claimed this since the resolver landed: a worker invoked by
 * somebody who could not perform an act cannot perform it either. The rule was
 * implemented in `resolveDecision` and, until 2026-08-11, **nothing supplied its
 * input** outside a CLI what-if flag. The claim was in a documentation table; the
 * control was not in the request path.
 *
 * What these tests hold is the wiring: that the person an API key belongs to is
 * actually consulted, that their refusal becomes the key's refusal, and — the
 * other half, easy to forget — that this never *raises* anything.
 */
import { AuthorityEnforcementService } from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const CAPABILITY = 'directory.organizations.manage'
const OWNER = 'owner-user-id'
const KEY = 'api-key-id'
const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

function makeService(options: {
  ownerHoldsCapability?: boolean
  graphCeiling?: string | null
  withReader?: boolean
} = {}) {
  const holdsCapability = jest.fn(async () => options.ownerHoldsCapability !== false)
  const graph = options.graphCeiling
    ? {
        cachedCeilingFor: jest.fn(async () => ({
          ceiling: options.graphCeiling,
          basis: 'edges',
          contributingEdges: [{ because: 'an edge caps it' }],
        })),
      }
    : null
  const service = new AuthorityEnforcementService(
    graph as never,
    null,
    options.withReader === false ? null : { holdsCapability },
  )
  return { service, holdsCapability }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    {
      id: CAPABILITY,
      title: 'Manage organizations',
      module: 'directory',
      // E4 rather than E0: a read is exempt from the machine ceiling, and a
      // capability nothing can gate would make every assertion below vacuous.
      capability: { effectClass: 'E4', reversibility: 'reversible' },
    },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('an API key cannot exceed the person it belongs to', () => {
  it('refuses the act when its owner may not perform it', async () => {
    // The failure this closes: the key passes its own RBAC check, the resolver
    // sees a service principal with no invoker, and the person behind it is
    // never consulted.
    const { service, holdsCapability } = makeService({ ownerHoldsCapability: false })

    const decision = await service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE, {
      onBehalfOfUserId: OWNER,
    })

    expect(holdsCapability).toHaveBeenCalledWith(OWNER, CAPABILITY, SCOPE)
    expect(decision?.gate).toBe('A0')
    expect(decision?.allowed).toBe(false)
  })

  it('names carried authority as the binding rule, not something vaguer', async () => {
    // A refusal nobody can explain is a support ticket. Invariant I6: the reason
    // is a return value.
    const { service } = makeService({ ownerHoldsCapability: false })

    const decision = await service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE, {
      onBehalfOfUserId: OWNER,
    })

    expect(decision?.reasons.some((reason) => reason.rule === 'invoker-ceiling')).toBe(true)
  })

  it('lets the act through when the owner holds it', async () => {
    const { service } = makeService({ ownerHoldsCapability: true })

    const decision = await service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE, {
      onBehalfOfUserId: OWNER,
    })

    expect(decision?.gate).not.toBe('A0')
  })
})

describe('what it deliberately does not do', () => {
  it('does not consult anybody when the actor answers only to itself', async () => {
    // A person acting as themselves carries nobody's authority.
    const { service, holdsCapability } = makeService()

    await service.decideFor('a-person', CAPABILITY, SCOPE, { onBehalfOfUserId: null })

    expect(holdsCapability).not.toHaveBeenCalled()
  })

  it('does not cap a person by their own decision', async () => {
    // `onBehalfOfUserId === actorId` would apply every rule twice. Harmless for a
    // minimum, but it would put a confusing second `invoker-ceiling` reason in
    // every explanation.
    const { service, holdsCapability } = makeService()

    const decision = await service.decideFor(OWNER, CAPABILITY, SCOPE, { onBehalfOfUserId: OWNER })

    expect(holdsCapability).not.toHaveBeenCalled()
    expect(decision?.reasons.some((reason) => reason.rule === 'invoker-ceiling')).toBe(false)
  })

  it('never raises a gate — the invoker can only take autonomy away', async () => {
    // The whole system rests on nothing widening. An invoker who could do more
    // than the actor must change nothing.
    const withInvoker = makeService({ ownerHoldsCapability: true, graphCeiling: 'A2' })
    const withoutInvoker = makeService({ ownerHoldsCapability: true, graphCeiling: 'A2' })

    const capped = await withInvoker.service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE, {
      onBehalfOfUserId: OWNER,
    })
    const plain = await withoutInvoker.service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE)

    const order = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
    expect(order.indexOf(capped!.gate)).toBeLessThanOrEqual(order.indexOf(plain!.gate))
  })

  it('skips the check rather than inventing a refusal when no reader is registered', async () => {
    // A lean bootstrap is not evidence of a constraint. Refusing here would deny
    // acts nobody decided to deny -- the same position this service takes when
    // the graph cannot be read.
    const { service } = makeService({ withReader: false })

    const decision = await service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE, {
      onBehalfOfUserId: OWNER,
    })

    expect(decision?.gate).not.toBe('A0')
  })
})

describe('the invoker is judged where the act is happening', () => {
  it('applies the same graph ceiling to the invoker as to the actor', async () => {
    // Judging the owner in some other scope would let a key act in an
    // organization its owner is capped out of.
    const { service } = makeService({ ownerHoldsCapability: true, graphCeiling: 'A1' })

    const decision = await service.decideFor(`api_key:${KEY}`, CAPABILITY, SCOPE, {
      onBehalfOfUserId: OWNER,
    })

    const order = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
    expect(order.indexOf(decision!.gate)).toBeLessThanOrEqual(order.indexOf('A1'))
  })
})
