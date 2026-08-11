/**
 * Earned autonomy, and the asymmetry that keeps it safe.
 *
 * This is the only input to the resolver that **widens**. Everything else can
 * only take autonomy away, so everything else is safe by construction; this one
 * is safe only because promotion is hard and demotion is easy (invariant **I9**).
 *
 * So the tests that matter are the ones about refusing to promote, and about
 * what happens to a value nobody can read.
 */
import {
  DEFAULT_TRUST_TIER,
  PROMOTION_MAX_OVERRIDE_RATE,
  PROMOTION_MIN_ACTS,
  TRUST_TIERS,
  demotedTier,
  demotionTriggered,
  evaluatePromotion,
  isTrustTier,
  parseTrustTier,
  promotionVerdict,
  trustCeilingFor,
} from '../trust'

describe('what each tier permits', () => {
  it('starts everybody at the bottom', () => {
    expect(DEFAULT_TRUST_TIER).toBe('T0')
  })

  it('lets a shadow worker propose but never act', () => {
    // `A1` *is* propose: the worker produces a proposal and a person performs
    // the act, so a direct effect is already impossible. `A0` would additionally
    // forbid proposing, which is the entire activity T0 exists to allow.
    expect(trustCeilingFor('T0', 'E4')).toBe('A1')
  })

  it('climbs one gate per tier', () => {
    expect(TRUST_TIERS.map((tier) => trustCeilingFor(tier, 'E4')))
      .toEqual(['A1', 'A2', 'A3', 'A4', 'A5'])
  })

  it('never restricts a read, at any tier', () => {
    // A worker that may not read cannot do anything, and reading is not the act
    // anybody needs protecting from.
    for (const tier of TRUST_TIERS) {
      expect(trustCeilingFor(tier, 'E0')).toBe('A5')
    }
  })
})

describe('reading a stored tier back', () => {
  it('accepts every tier it writes', () => {
    for (const tier of TRUST_TIERS) {
      expect(isTrustTier(tier)).toBe(true)
      expect(parseTrustTier(tier)).toBe(tier)
    }
  })

  it('reads anything it does not understand as the bottom tier', () => {
    // Trust is the one field where a parsing failure could *grant* something, so
    // it fails to the bottom of the scale rather than to a middling default.
    for (const value of ['T9', 'trusted', '', null, undefined, 4, {}]) {
      expect(parseTrustTier(value)).toBe('T0')
    }
  })
})

describe('promotion refuses on the evidence it has', () => {
  it('refuses without enough completed acts', () => {
    const criteria = evaluatePromotion({ completedActs: PROMOTION_MIN_ACTS - 1, overriddenActs: 0 })
    const verdict = promotionVerdict(criteria)

    expect(verdict.allowed).toBe(false)
    expect(verdict.refusedBecause).toContain('completed acts')
  })

  it('refuses when reviewers keep reversing the work', () => {
    // The whole signal: a worker whose output gets undone has not earned more
    // room to work unsupervised.
    const criteria = evaluatePromotion({ completedActs: 100, overriddenActs: 6 })
    const verdict = promotionVerdict(criteria)

    expect(verdict.allowed).toBe(false)
    expect(verdict.refusedBecause).toContain('override rate')
  })

  it('allows when the computable evidence passes', () => {
    const verdict = promotionVerdict(evaluatePromotion({ completedActs: 100, overriddenActs: 2 }))

    expect(verdict.allowed).toBe(true)
    expect(verdict.refusedBecause).toBeNull()
  })

  it('treats the threshold as exclusive', () => {
    // Exactly 5% is not "below 5%". A boundary that drifts one way is a rule
    // somebody argues about later.
    const atThreshold = evaluatePromotion({ completedActs: 100, overriddenActs: 5 })
    expect(promotionVerdict(atThreshold).allowed).toBe(false)
  })
})

describe('the three criteria nobody can check', () => {
  it('reports them rather than dropping them', () => {
    // A criterion that quietly disappears is one somebody later believes was
    // checked.
    const verdict = promotionVerdict(evaluatePromotion({ completedActs: 100, overriddenActs: 0 }))

    expect(verdict.unverified.map((criterion) => criterion.id).sort())
      .toEqual(['evaluation-suite', 'no-charter-change', 'no-open-incidents'])
  })

  it('says why each one could not be checked', () => {
    const verdict = promotionVerdict(evaluatePromotion({ completedActs: 100, overriddenActs: 0 }))

    for (const criterion of verdict.unverified) {
      expect(criterion.detail).toContain('not verified')
    }
  })

  it('does not let them block promotion', () => {
    // Blocking on them would make promotion impossible until three unrelated
    // features exist. The honest alternative to "we checked" is "a person decided
    // knowing we could not check" -- not "nobody may ever decide".
    expect(promotionVerdict(evaluatePromotion({ completedActs: 100, overriddenActs: 0 })).allowed).toBe(true)
  })
})

describe('demotion is the easy direction', () => {
  it('triggers on the override rate alone', () => {
    // One trigger, no approval, immediate. Invariant I9.
    expect(demotionTriggered({ completedActs: 100, overriddenActs: 5 })).toBe(true)
  })

  it('does not trigger on a clean record', () => {
    expect(demotionTriggered({ completedActs: 100, overriddenActs: 1 })).toBe(false)
  })

  it('needs enough history to mean anything', () => {
    // One reversal in a worker's first three acts is a 33% override rate and no
    // evidence at all. Too little to demote on is not the same as evidence that
    // everything is fine.
    expect(demotionTriggered({ completedActs: 3, overriddenActs: 1 })).toBe(false)
  })

  it('is stricter than promotion at the same rate', () => {
    // Promotion needs below the threshold; demotion fires at it. The gap is the
    // asymmetry, deliberately.
    const evidence = { completedActs: 100, overriddenActs: PROMOTION_MAX_OVERRIDE_RATE * 100 }
    expect(promotionVerdict(evaluatePromotion(evidence)).allowed).toBe(false)
    expect(demotionTriggered(evidence)).toBe(true)
  })

  it('steps down one tier, never further', () => {
    expect(demotedTier('T4')).toBe('T3')
    expect(demotedTier('T1')).toBe('T0')
  })

  it('cannot fall below the bottom', () => {
    expect(demotedTier('T0')).toBe('T0')
  })
})
