/**
 * A tenant's own rules, reaching the resolver.
 *
 * `authority-policy.test.ts` in shared decides what a policy *means*. This holds
 * that the enforcement path reads one, and — the part worth guarding — that a
 * policy nobody can parse leaves the platform alone rather than refusing real
 * work on the strength of a typo.
 */
import { AuthorityEnforcementService } from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const CAPABILITY = 'sales.payments.send'
const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

function makeService(storedPolicy: unknown) {
  const getValue = jest.fn(async (_module: string, key: string, options: { defaultValue?: unknown }) => {
    // The enforcement mode lives in the same config store; only the policy key
    // should reach the policy reader.
    if (key === 'authority_policy') return storedPolicy
    return options?.defaultValue ?? null
  })
  const service = new AuthorityEnforcementService(null, { getValue } as never)
  return { service, getValue }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    {
      id: CAPABILITY,
      title: 'Send a payment',
      module: 'sales',
      capability: { effectClass: 'E4', reversibility: 'reversible' },
    },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('a tenant policy narrows the decision', () => {
  it('applies a rule that matches the act', async () => {
    const { service } = makeService({
      rules: [{ effectClass: 'E4', ceiling: 'A2', reason: 'four-eyes on payments' }],
    })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    expect(decision?.gate).toBe('A2')
  })

  it('quotes the tenant back rather than reciting a gate', async () => {
    // "Tenant policy permits at most A2" tells somebody they are blocked and
    // nothing about who decided it. Their own words tell them where to go.
    const { service } = makeService({
      rules: [{ effectClass: 'E4', ceiling: 'A2', reason: 'four-eyes on payments' }],
    })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    const explanation = decision?.reasons.map((reason) => reason.detail).join(' ') ?? ''
    expect(explanation).toContain('four-eyes on payments')
  })

  it('ignores a rule that does not match', async () => {
    const { service } = makeService({ rules: [{ effectClass: 'E1', ceiling: 'A0' }] })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    expect(decision?.reasons.some((reason) => reason.rule === 'policy')).toBe(false)
  })
})

describe('what it refuses to do', () => {
  it('applies nothing when no policy is stored', async () => {
    const { service } = makeService(null)

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    expect(decision?.reasons.some((reason) => reason.rule === 'policy')).toBe(false)
  })

  it('applies nothing when the stored policy is unreadable', async () => {
    // The uncomfortable direction, and the right one: inventing a restriction
    // nobody wrote would refuse real work because of a typo. A configuration
    // failure is not a permission answer.
    const { service } = makeService({ rules: 'not an array' })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    expect(decision?.reasons.some((reason) => reason.rule === 'policy')).toBe(false)
  })

  it('applies nothing without a tenant', async () => {
    const { service, getValue } = makeService({ rules: [{ ceiling: 'A0' }] })

    await service.decideFor('a-person', CAPABILITY, { tenantId: null, organizationId: null })

    expect(getValue).not.toHaveBeenCalledWith('auth', 'authority_policy', expect.anything())
  })

  it('applies nothing when no config store is registered', async () => {
    const service = new AuthorityEnforcementService(null, null)

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    expect(decision?.reasons.some((reason) => reason.rule === 'policy')).toBe(false)
  })
})

describe('several rules', () => {
  it('takes the strictest that matches', async () => {
    const { service } = makeService({
      rules: [
        { effectClass: 'E4', ceiling: 'A3' },
        { capabilityId: CAPABILITY, ceiling: 'A1' },
      ],
    })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE)

    expect(decision?.gate).toBe('A1')
  })
})
