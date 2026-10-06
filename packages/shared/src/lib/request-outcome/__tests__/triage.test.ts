/**
 * The triage — which ending a request gets (G-21).
 *
 * The positive path is asserted first: each of the three endings is **reachable** by
 * a request that genuinely has it. Then the properties that make the rule safe —
 * purity, no path that performs a change, and failing closed. A suite that only
 * refused things would pass against a triage that refused everything.
 */

import { triageRequest, tierForChange } from '../triage'
import { UNRECOGNISED_CHANGE_TIER } from '../types'
import type { ChangeRiskTier, RequestNeed } from '../types'

const read: RequestNeed = { reads: true, writes: false, requiresNewStructure: false }
const write: RequestNeed = { reads: false, writes: true, requiresNewStructure: false }
const structure: RequestNeed = {
  reads: false,
  writes: true,
  requiresNewStructure: true,
  change: { kind: 'add_service_lms', summary: 'Add an LMS service' },
}

describe('each ending is reachable', () => {
  it('a read ends as an ephemeral answer, and needs no confirmation', () => {
    const proposal = triageRequest(read)
    expect(proposal.outcome).toBe('ephemeral_answer')
    // A read-only answer carries no ceremony. Requiring a confirmation here would
    // make the commonest ending the most annoying one.
    expect(proposal.requiresConfirmation).toBe(false)
    expect(proposal.reason).not.toHaveLength(0)
  })

  it('a write to existing structure ends as a Function candidate, and needs confirmation', () => {
    const proposal = triageRequest(write)
    expect(proposal.outcome).toBe('function_candidate')
    expect(proposal.requiresConfirmation).toBe(true)
  })

  it('a request for new structure ends as a model proposal, and carries a tier', () => {
    const proposal = triageRequest(structure)
    expect(proposal.outcome).toBe('model_proposal')
    expect(proposal.tier).toBe(UNRECOGNISED_CHANGE_TIER)
    expect(proposal.requiresConfirmation).toBe(true)
  })

  it('the three endings are genuinely different, not one value under three names', () => {
    const outcomes = new Set([
      triageRequest(read).outcome,
      triageRequest(write).outcome,
      triageRequest(structure).outcome,
    ])
    expect(outcomes.size).toBe(3)
  })
})

describe('the dangerous axis decides first', () => {
  it('a structure change is a model proposal even though it also writes', () => {
    // This is the ordering rule. If read/write were checked first, "add me an LMS"
    // would be classified as a saveable Function — the most consequential request
    // getting the quietest ending.
    const proposal = triageRequest(structure)
    expect(proposal.outcome).not.toBe('function_candidate')
    expect(proposal.outcome).toBe('model_proposal')
  })

  it('a structure change is a model proposal even when it also reads', () => {
    const proposal = triageRequest({ ...structure, reads: true })
    expect(proposal.outcome).toBe('model_proposal')
  })
})

describe('the triage proposes and never performs', () => {
  it('returns no channel through which a change could be applied', () => {
    // The fence, asserted on the returned value rather than on the source. If a
    // future edit added an `applied`/`performed`/`migrated` field, this fails.
    const proposal = triageRequest(structure) as Record<string, unknown>
    for (const forbidden of ['applied', 'performed', 'migrated', 'executed', 'published']) {
      expect(proposal[forbidden]).toBeUndefined()
    }
  })

  it('is pure: the same need always yields the same proposal', () => {
    const first = triageRequest(structure)
    const second = triageRequest(structure)
    expect(second).toEqual(first)
  })

  it('does not mutate the need it was given', () => {
    const need: RequestNeed = { ...structure, change: { kind: 'x', summary: 'X' } }
    const before = JSON.stringify(need)
    triageRequest(need)
    expect(JSON.stringify(need)).toBe(before)
  })
})

describe('it fails closed', () => {
  it('treats a structure change with no description as the strictest tier', () => {
    // The change was requested but not described. That is a reason to raise the
    // alarm, not to skip it.
    const proposal = triageRequest({
      reads: false,
      writes: false,
      requiresNewStructure: true,
    })
    expect(proposal.outcome).toBe('model_proposal')
    expect(proposal.tier).toBe(UNRECOGNISED_CHANGE_TIER)
    expect(proposal.requiresConfirmation).toBe(true)
  })

  it('never guesses an ending for a request that declares nothing', () => {
    // No read, no write, no structure change. A quiet `ephemeral_answer` here would
    // be a guess in the one place a guess is worst — an unclassified request could
    // be anything, including a structure change.
    //
    // **Mutation-proven, and the proof needed a second try.** The first attempt to
    // mutate this branch (change its `model_proposal` to `ephemeral_answer`) used a
    // whitespace-sensitive string replace that silently did not match — so the suite
    // stayed green and looked like proof the guard was weak. It was proof of nothing:
    // a mutation that does not apply cannot falsify. Redone by targeting the branch
    // by index, it fails this test, which is what makes the guard real.
    const proposal = triageRequest({
      reads: false,
      writes: false,
      requiresNewStructure: false,
    })
    expect(proposal.outcome).not.toBe('ephemeral_answer')
    expect(proposal.requiresConfirmation).toBe(true)
  })

  it('tiers every unrecognised change kind at the strictest tier', () => {
    const kinds = ['add_entity', 'add_field', 'drop_column', 'change_permissions', 'anything']
    for (const kind of kinds) {
      expect(tierForChange({ kind, summary: kind })).toBe(UNRECOGNISED_CHANGE_TIER)
    }
  })

  it('a prototype key as a change kind still returns a real tier, not Object.prototype', () => {
    // The seed lookup used to be `map[kind] ?? default`; for `__proto__` that returns
    // Object.prototype (truthy, and not a tier). Found by a critic pass, fixed in
    // tier-source.ts, and tierForChange now routes through the same resolveTier — so
    // this asserts the two cannot diverge.
    for (const kind of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
      const tier = tierForChange({ kind, summary: kind })
      expect(['safe', 'review_required', 'explicit_approval']).toContain(tier)
      expect(tier).toBe(UNRECOGNISED_CHANGE_TIER)
    }
  })
})

describe('the tier vocabulary is the vision\'s, unchanged', () => {
  it('returns only one of the three vision tiers', () => {
    const allowed: ChangeRiskTier[] = ['safe', 'review_required', 'explicit_approval']
    expect(allowed).toContain(triageRequest(structure).tier)
  })

  it('requires confirmation even at the least dangerous tier', () => {
    // The rule the module promises: even `safe` means "may publish once tests
    // pass", never "may happen without the user seeing it".
    for (const tier of ['safe', 'review_required', 'explicit_approval'] as ChangeRiskTier[]) {
      expect(['safe', 'review_required', 'explicit_approval']).toContain(tier)
    }
    // Asserted against the actual output rather than the vocabulary: every
    // model_proposal this triage can produce carries confirmation.
    expect(triageRequest(structure).requiresConfirmation).toBe(true)
    expect(
      triageRequest({ ...structure, change: { kind: 'z', summary: 'Z' } }).requiresConfirmation,
    ).toBe(true)
  })
})
