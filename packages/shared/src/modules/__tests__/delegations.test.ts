/**
 * When lent authority is in force, and when it has stopped.
 *
 * These rules decide whether somebody may act. They are consulted from two
 * places — the grant path and the resolver — so the tests are written against
 * the pure functions rather than either caller, and both callers get the same
 * answer by construction rather than by review.
 *
 * The cases that matter most are the negative ones. A delegation that grants
 * slightly too long, or one revocation that does not take, is the whole failure
 * this feature is supposed to prevent.
 */
import {
  MAX_DELEGATION_DAYS,
  delegationReason,
  delegationWindowProblem,
  isDelegationActive,
  selectActiveDelegation,
  type DelegationRecord,
} from '../delegations'

const CAPABILITY = 'auth.authority.approve'
const NOW = new Date('2026-08-11T12:00:00.000Z')

function delegation(overrides: Partial<DelegationRecord> = {}): DelegationRecord {
  return {
    id: 'delegation-1',
    granteePrincipalId: 'sam',
    grantorPrincipalId: 'priya',
    capabilityId: CAPABILITY,
    organizationId: null,
    startsAt: new Date('2026-08-03T00:00:00.000Z'),
    expiresAt: new Date('2026-08-17T00:00:00.000Z'),
    revokedAt: null,
    authorityCeiling: null,
    reason: 'covering while Priya is away',
    ...overrides,
  }
}

const query = { capabilityId: CAPABILITY, now: NOW }

describe('when a delegation is in force', () => {
  it('grants inside its window', () => {
    expect(isDelegationActive(delegation(), query)).toBe(true)
  })

  it('does not grant before it starts', () => {
    // A delegation dated for next month is not authority today.
    expect(isDelegationActive(delegation({ startsAt: new Date('2026-09-01T00:00:00.000Z') }), query)).toBe(false)
  })

  it('stops at the instant it expires, not a moment after', () => {
    // Exclusive on purpose: "until the 17th" has stopped granting when the 17th
    // arrives. An inclusive comparison would grant for one more tick, which is
    // the kind of detail that only ever surfaces in an incident review.
    expect(isDelegationActive(delegation({ expiresAt: NOW }), query)).toBe(false)
    expect(isDelegationActive(delegation({ expiresAt: new Date(NOW.getTime() + 1) }), query)).toBe(true)
  })

  it('grants nothing once revoked, even inside the window', () => {
    // An explicit stop beats a window that has not closed. This is the assertion
    // the whole revocation path rests on.
    expect(isDelegationActive(delegation({ revokedAt: new Date('2026-08-05T00:00:00.000Z') }), query)).toBe(false)
  })

  it('grants only the capability it names', () => {
    expect(isDelegationActive(delegation({ capabilityId: 'directory.organizations.manage' }), query)).toBe(false)
  })
})

describe('scope', () => {
  it('covers every organization when it names none', () => {
    const tenantWide = delegation({ organizationId: null })
    expect(isDelegationActive(tenantWide, { ...query, organizationId: 'org-a' })).toBe(true)
    expect(isDelegationActive(tenantWide, { ...query, organizationId: 'org-b' })).toBe(true)
  })

  it('covers only its own organization when it names one', () => {
    // Never the other way round, or a delegation for a subsidiary would quietly
    // become authority at the parent.
    const scoped = delegation({ organizationId: 'org-a' })
    expect(isDelegationActive(scoped, { ...query, organizationId: 'org-a' })).toBe(true)
    expect(isDelegationActive(scoped, { ...query, organizationId: 'org-b' })).toBe(false)
    expect(isDelegationActive(scoped, { ...query, organizationId: null })).toBe(false)
  })
})

describe('choosing between several', () => {
  it('takes the one that runs longest', () => {
    // Not the newest: a hastily-added short delegation must not silently shorten
    // a carefully-agreed long one.
    const short = delegation({ id: 'short', expiresAt: new Date('2026-08-12T00:00:00.000Z') })
    const long = delegation({ id: 'long', expiresAt: new Date('2026-08-30T00:00:00.000Z') })

    expect(selectActiveDelegation([short, long], query)?.id).toBe('long')
    expect(selectActiveDelegation([long, short], query)?.id).toBe('long')
  })

  it('ignores the ones that are not in force', () => {
    const revoked = delegation({ id: 'revoked', expiresAt: new Date('2026-12-01T00:00:00.000Z'), revokedAt: NOW })
    const live = delegation({ id: 'live' })

    expect(selectActiveDelegation([revoked, live], query)?.id).toBe('live')
  })

  it('returns nothing when none apply', () => {
    expect(selectActiveDelegation([delegation({ revokedAt: NOW })], query)).toBeNull()
    expect(selectActiveDelegation([], query)).toBeNull()
  })

  it('still prefers the longest even when it carries the tighter cap', () => {
    // Choosing the delegation is a separate question from what it permits. The
    // tighter cap then applies, because every ceiling here narrows.
    const longTight = delegation({ id: 'long', expiresAt: new Date('2026-08-30T00:00:00.000Z'), authorityCeiling: 'A1' })
    const shortLoose = delegation({ id: 'short', expiresAt: new Date('2026-08-12T00:00:00.000Z'), authorityCeiling: 'A5' })

    expect(selectActiveDelegation([longTight, shortLoose], query)?.id).toBe('long')
  })
})

describe('how long authority may be lent', () => {
  it('rejects a window that ends before it starts', () => {
    expect(delegationWindowProblem(new Date('2026-08-17'), new Date('2026-08-03'))).toContain('expire after it starts')
  })

  it('rejects a zero-length window', () => {
    const moment = new Date('2026-08-03')
    expect(delegationWindowProblem(moment, moment)).toContain('expire after it starts')
  })

  it('rejects one that runs longer than the maximum', () => {
    // A delegation with no practical end is a role grant wearing a costume, and
    // the grant nobody revisits is the exact failure this feature prevents.
    const start = new Date('2026-01-01T00:00:00.000Z')
    const tooLong = new Date(start.getTime() + (MAX_DELEGATION_DAYS + 1) * 86_400_000)
    expect(delegationWindowProblem(start, tooLong)).toContain('90 days')
  })

  it('accepts one exactly at the maximum', () => {
    const start = new Date('2026-01-01T00:00:00.000Z')
    const atLimit = new Date(start.getTime() + MAX_DELEGATION_DAYS * 86_400_000)
    expect(delegationWindowProblem(start, atLimit)).toBeNull()
  })

  it('rejects dates it cannot read rather than treating them as now', () => {
    expect(delegationWindowProblem(new Date('nonsense'), new Date('2026-08-17'))).toContain('not a date')
    expect(delegationWindowProblem(new Date('2026-08-03'), new Date('nonsense'))).toContain('not a date')
  })
})

describe('the explanation', () => {
  it('names the grantor, the end date and the reason', () => {
    // "Who allowed this?" has to be answerable three months later.
    const explanation = delegationReason(delegation())
    expect(explanation).toContain('priya')
    expect(explanation).toContain('2026-08-17')
    expect(explanation).toContain('covering while Priya is away')
  })
})
