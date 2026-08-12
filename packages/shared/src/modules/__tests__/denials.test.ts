/**
 * A permission taken away from one person.
 *
 * The property every one of these defends: a denial subtracts and never adds.
 * If any test here ever needs `expect(...).toBe(true)` on something that grants,
 * the feature has been built wrong.
 */
import {
  denialCoversFeature,
  denialProblem,
  denialReason,
  findBlockingDenial,
  isDenialActive,
  type DenialRecord,
} from '../denials'

const NOW = new Date('2026-08-12T12:00:00Z')

function denial(overrides: Partial<DenialRecord> = {}): DenialRecord {
  return {
    id: 'denial-1',
    subjectPrincipalId: 'a-person',
    featurePattern: 'sales.refund',
    organizationId: null,
    startsAt: new Date('2026-08-01T00:00:00Z'),
    expiresAt: null,
    liftedAt: null,
    reason: 'under investigation',
    ...overrides,
  }
}

describe('when a denial is in force', () => {
  it('applies once it has started and while it has not expired', () => {
    expect(isDenialActive(denial(), { now: NOW })).toBe(true)
  })

  it('does not apply before it starts', () => {
    const future = denial({ startsAt: new Date('2026-09-01T00:00:00Z') })
    expect(isDenialActive(future, { now: NOW })).toBe(false)
  })

  it('stops applying at the instant it expires, not a moment after', () => {
    const record = denial({ expiresAt: NOW })
    expect(isDenialActive(record, { now: NOW })).toBe(false)
  })

  it('stops applying once somebody lifts it', () => {
    const record = denial({ liftedAt: new Date('2026-08-05T00:00:00Z') })
    expect(isDenialActive(record, { now: NOW })).toBe(false)
  })

  it('treats a lift as final even inside an unexpired window', () => {
    // Lifting is the deliberate act; the window is the lazy one. If a window
    // could resurrect a lifted denial, "lift" would mean "pause".
    const record = denial({ expiresAt: new Date('2026-12-01T00:00:00Z'), liftedAt: NOW })
    expect(isDenialActive(record, { now: NOW })).toBe(false)
  })

  it('lasts indefinitely when no expiry is set', () => {
    // Unlike a delegation, an unbounded denial is legitimate: "this person does
    // not approve payments" should not silently lapse after ninety days.
    const record = denial({ expiresAt: null })
    expect(isDenialActive(record, { now: new Date('2030-01-01T00:00:00Z') })).toBe(true)
  })
})

describe('how far a denial reaches', () => {
  it('covers every organization when it is tenant-wide', () => {
    expect(isDenialActive(denial({ organizationId: null }), { organizationId: 'org-9', now: NOW })).toBe(true)
  })

  it('covers only its own organization when it names one', () => {
    const scoped = denial({ organizationId: 'org-1' })
    expect(isDenialActive(scoped, { organizationId: 'org-1', now: NOW })).toBe(true)
    expect(isDenialActive(scoped, { organizationId: 'org-2', now: NOW })).toBe(false)
  })

  it('does not leak from a subsidiary up to the tenant', () => {
    // The dangerous direction. A denial written for one branch must not become
    // a denial everywhere the moment somebody checks without an organization.
    const scoped = denial({ organizationId: 'org-1' })
    expect(isDenialActive(scoped, { organizationId: null, now: NOW })).toBe(false)
  })
})

describe('which permissions a pattern takes away', () => {
  it('matches the exact permission', () => {
    expect(denialCoversFeature('sales.refund', 'sales.refund')).toBe(true)
    expect(denialCoversFeature('sales.refund', 'sales.view')).toBe(false)
  })

  it('matches everything under a module wildcard', () => {
    expect(denialCoversFeature('sales.*', 'sales.refund')).toBe(true)
    expect(denialCoversFeature('sales.*', 'sales.orders.edit')).toBe(true)
    expect(denialCoversFeature('sales.*', 'sales')).toBe(true)
  })

  it('does not let a wildcard bleed into a similarly named module', () => {
    // `sales.*` must not reach `salesforce.sync`. Prefix matching without the
    // separator is the classic way this goes wrong.
    expect(denialCoversFeature('sales.*', 'salesforce.sync')).toBe(false)
  })

  it('takes everything away under a bare star', () => {
    expect(denialCoversFeature('*', 'anything.at.all')).toBe(true)
  })
})

describe('what stops an act', () => {
  const records = [denial({ featurePattern: 'sales.refund', reason: 'under investigation' })]

  it('finds the denial that covers a required permission', () => {
    const blocking = findBlockingDenial(records, ['sales.refund'], { now: NOW })
    expect(blocking?.feature).toBe('sales.refund')
  })

  it('stops the whole act when any one required permission is denied', () => {
    // A route needing both `view` and `refund` is not half-permitted when only
    // `refund` is withheld. Requirements are an AND list.
    const blocking = findBlockingDenial(records, ['sales.view', 'sales.refund'], { now: NOW })
    expect(blocking?.feature).toBe('sales.refund')
  })

  it('allows the act when no denial covers any required permission', () => {
    expect(findBlockingDenial(records, ['sales.view'], { now: NOW })).toBeNull()
  })

  it('ignores a denial that is not in force', () => {
    const lifted = [denial({ liftedAt: new Date('2026-08-02T00:00:00Z') })]
    expect(findBlockingDenial(lifted, ['sales.refund'], { now: NOW })).toBeNull()
  })

  it('returns nothing when there are no denials at all', () => {
    // The overwhelmingly common case, and the one that must cost nothing.
    expect(findBlockingDenial([], ['sales.refund'], { now: NOW })).toBeNull()
  })

  it('returns nothing when the act requires no permissions', () => {
    expect(findBlockingDenial(records, [], { now: NOW })).toBeNull()
  })

  it('carries the reason out with it', () => {
    const blocking = findBlockingDenial(records, ['sales.refund'], { now: NOW })
    expect(denialReason(blocking!.denial, blocking!.feature)).toContain('under investigation')
  })
})

describe('what may not be written', () => {
  const valid = {
    featurePattern: 'sales.refund',
    reason: 'under investigation',
    startsAt: new Date('2026-08-01T00:00:00Z'),
    expiresAt: null as Date | null,
  }

  it('accepts a well-formed permanent denial', () => {
    expect(denialProblem(valid)).toBeNull()
  })

  it('accepts a well-formed temporary one', () => {
    expect(denialProblem({ ...valid, expiresAt: new Date('2026-09-01T00:00:00Z') })).toBeNull()
  })

  it('refuses a denial with no reason', () => {
    // The check that matters. A permission that vanished with no reason cannot
    // be safely lifted six months later by somebody who was not there.
    expect(denialProblem({ ...valid, reason: '   ' })).toBe('a denial must record why')
  })

  it('refuses a denial that names no permission', () => {
    expect(denialProblem({ ...valid, featurePattern: '' })).toBe('a denial must name a permission')
  })

  it('refuses a wildcard in the middle of a pattern', () => {
    // `sales.*.refund` would look like it works and quietly match nothing.
    expect(denialProblem({ ...valid, featurePattern: 'sales.*.refund' })).toBe('a wildcard may only appear at the end')
  })

  it('refuses a window that ends before it begins', () => {
    expect(denialProblem({ ...valid, expiresAt: new Date('2026-07-01T00:00:00Z') })).toBe(
      'a denial must expire after it starts',
    )
  })
})
