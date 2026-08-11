/**
 * A tenant's own rules, and what happens to the ones it wrote badly.
 *
 * This is the only resolver input that is a *company's* decision rather than a
 * property of the platform, so the tests are mostly about two things: that the
 * strictest rule wins when several apply, and that a rule nobody can parse
 * loosens rather than invents a restriction.
 */
import {
  EMPTY_POLICY,
  authorityPolicyProblems,
  parseAuthorityPolicy,
  policyCeilingFor,
  ruleMatches,
} from '../authority-policy'
import type { CapabilityDescriptor } from '../capabilities'

function capability(overrides: Partial<CapabilityDescriptor> = {}): CapabilityDescriptor {
  return {
    id: 'sales.payments.send',
    module: 'sales',
    effectClass: 'E4',
    reversibility: 'reversible',
    ...overrides,
  } as CapabilityDescriptor
}

describe('what a rule matches', () => {
  it('matches one capability by id', () => {
    expect(ruleMatches({ capabilityId: 'sales.payments.send', ceiling: 'A2' }, capability())).toBe(true)
    expect(ruleMatches({ capabilityId: 'sales.other', ceiling: 'A2' }, capability())).toBe(false)
  })

  it('matches every act of an effect class', () => {
    expect(ruleMatches({ effectClass: 'E4', ceiling: 'A2' }, capability())).toBe(true)
    expect(ruleMatches({ effectClass: 'E1', ceiling: 'A2' }, capability())).toBe(false)
  })

  it('matches acts touching a class of data', () => {
    const personal = capability({ dataClasses: ['personal', 'internal'] })
    expect(ruleMatches({ dataClass: 'personal', ceiling: 'A2' }, personal)).toBe(true)
    expect(ruleMatches({ dataClass: 'secret', ceiling: 'A2' }, personal)).toBe(false)
  })

  it('matches everything when it names nothing', () => {
    // Blunt, and legitimately what somebody means by "nothing here runs
    // unattended". Better than making them enumerate every effect class.
    expect(ruleMatches({ ceiling: 'A2' }, capability())).toBe(true)
  })

  it('requires every named condition, not any of them', () => {
    const rule = { effectClass: 'E4' as const, dataClass: 'secret' as const, ceiling: 'A1' as const }
    expect(ruleMatches(rule, capability({ dataClasses: ['internal'] }))).toBe(false)
  })
})

describe('the ceiling a policy produces', () => {
  it('says nothing when no rule matches', () => {
    // `null`, not `A5`. An A5 for every unpoliced act would appear in every
    // explanation saying nothing.
    expect(policyCeilingFor({ rules: [{ effectClass: 'E1', ceiling: 'A2' }] }, capability())).toBeNull()
    expect(policyCeilingFor(EMPTY_POLICY, capability())).toBeNull()
  })

  it('takes the strictest of several matching rules', () => {
    const policy = {
      rules: [
        { effectClass: 'E4' as const, ceiling: 'A3' as const },
        { capabilityId: 'sales.payments.send', ceiling: 'A1' as const },
      ],
    }
    expect(policyCeilingFor(policy, capability())?.ceiling).toBe('A1')
  })

  it('names the rule that decided, not merely the number', () => {
    // The tenant wrote this rule; the refusal should quote them back.
    const policy = {
      rules: [{ effectClass: 'E4' as const, ceiling: 'A2' as const, reason: 'four-eyes on payments' }],
    }
    const result = policyCeilingFor(policy, capability())
    expect(result?.detail).toContain('E4 acts')
    expect(result?.detail).toContain('four-eyes on payments')
  })

  it('describes a catch-all rule as such', () => {
    const result = policyCeilingFor({ rules: [{ ceiling: 'A2' }] }, capability())
    expect(result?.detail).toContain('every act')
  })
})

describe('reading a stored policy back', () => {
  it('survives anything that is not a policy', () => {
    for (const value of [null, undefined, 'nonsense', 42, {}, { rules: 'no' }]) {
      expect(parseAuthorityPolicy(value)).toEqual(EMPTY_POLICY)
    }
  })

  it('drops a rule whose ceiling it cannot read', () => {
    // Dropping *loosens*, which is the uncomfortable direction -- but the
    // alternative is inventing a restriction nobody wrote, and a dropped rule is
    // visible when the tenant reads their policy back.
    const policy = parseAuthorityPolicy({
      rules: [{ effectClass: 'E4', ceiling: 'A9' }, { effectClass: 'E1', ceiling: 'A2' }],
    })
    expect(policy.rules).toHaveLength(1)
    expect(policy.rules[0].effectClass).toBe('E1')
  })

  it('drops an effect class it does not recognise but keeps the rule', () => {
    // The ceiling is readable, so the rule still means something -- it just
    // matches more broadly than intended, which the tenant can see.
    const policy = parseAuthorityPolicy({ rules: [{ effectClass: 'E9', ceiling: 'A2' }] })
    expect(policy.rules).toHaveLength(1)
    expect(policy.rules[0].effectClass).toBeUndefined()
  })

  it('keeps the reason, trimmed', () => {
    const policy = parseAuthorityPolicy({ rules: [{ ceiling: 'A2', reason: '  four-eyes  ' }] })
    expect(policy.rules[0].reason).toBe('four-eyes')
  })
})

describe('warning a tenant about what they just wrote', () => {
  it('points out a rule that caps the entire tenant', () => {
    const problems = authorityPolicyProblems({ rules: [{ ceiling: 'A2' }] })
    expect(problems[0]).toContain('whole tenant')
  })

  it('points out a rule that blocks everything', () => {
    // Legal, and almost certainly a mistake. Saying so is cheaper than the
    // support ticket.
    const problems = authorityPolicyProblems({ rules: [{ ceiling: 'A0' }] })
    expect(problems.some((problem) => problem.includes('block every act'))).toBe(true)
  })

  it('says nothing about an ordinary targeted rule', () => {
    expect(authorityPolicyProblems({ rules: [{ effectClass: 'E4', ceiling: 'A2' }] })).toEqual([])
  })
})
