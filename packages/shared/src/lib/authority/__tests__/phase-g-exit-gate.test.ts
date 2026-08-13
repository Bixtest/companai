/**
 * Phase G's exit criteria, stated once and checked mechanically.
 *
 * **Why this exists when the inputs are already tested elsewhere.** They are —
 * delegation ceilings in `decision.test.ts`, project overlays and lock states in
 * the enforcement service's own suites. What did not exist was a single place
 * saying *these three were the phase's promise*. Criteria that live only in a
 * planning document are satisfied by tests scattered across two packages, and
 * nothing connects them: delete the record-lock suite and no failure says "that
 * was an exit criterion".
 *
 * So this is not extra coverage. It is the **named artifact** — findable by
 * anyone asking what Phase G committed to, and failing loudly if a graft is
 * quietly unwired.
 *
 * **The criteria** (from `planning/CHANGELOG.md`, Batch A onward): the resolver
 * must honour a **delegation ceiling**, a **project overlay** and a **record
 * lock state**.
 *
 * **Two of those three are one input by the time the resolver sees them**, and
 * writing this test is how I learned it. A project overlay and a record's lock
 * state are both statements about *this record*, so
 * `AuthorityEnforcementService` merges them with `lowerOf` into a single
 * `context.resourceCeiling` before resolving. There is no `projectCeiling`
 * field, and asserting one silently passed nothing — an unknown property on an
 * optional object is simply ignored.
 *
 * So the criteria are checked where each actually lives: the two ceilings here,
 * against the resolver, and the overlay's *distinctness* in
 * `authorityEnforcement.project.test.ts`, which is the layer that knows the
 * difference. Testing the merged value twice and calling it two criteria would
 * have been theatre.
 *
 * Each is asserted the same way: establish a baseline, apply only that input,
 * require the answer to narrow. A test that merely shows a low gate proves
 * nothing — the input must be shown to be *the cause*.
 */
import { resolveDecision, type ResolveInput } from '../decision'
import { AUTONOMY_GATES, type AutonomyGate, type CapabilityDescriptor } from '../../../modules/capabilities'

const reversibleWrite: CapabilityDescriptor = {
  id: 'customers.person.edit',
  module: 'customers',
  effectClass: 'E1',
  reversibility: 'reversible',
}

function input(overrides: Partial<ResolveInput> = {}): ResolveInput {
  return {
    actor: { kind: 'human', id: 'user-1', holdsCapability: true, ...(overrides.actor ?? {}) },
    capability: overrides.capability ?? reversibleWrite,
    context: overrides.context ?? {},
  }
}

const rank = (gate: AutonomyGate) => AUTONOMY_GATES.indexOf(gate)

/** The answer with nothing applied — everything below must come in under it. */
const baseline = resolveDecision(input())

describe('Phase G exit criterion 1 — the resolver honours a delegation ceiling', () => {
  it('narrows the answer to the delegated cap', () => {
    const decision = resolveDecision(input({
      actor: { kind: 'human', id: 'user-1', holdsCapability: true, delegationCeiling: 'A2' },
    }))

    expect(rank(decision.gate)).toBeLessThanOrEqual(rank('A2'))
    expect(rank(decision.gate)).toBeLessThan(rank(baseline.gate))
  })

  it('names the delegation as the reason', () => {
    // Invariant I6: a decision nobody can explain is not a decision. If the cap
    // binds, the explanation has to say so.
    const decision = resolveDecision(input({
      actor: { kind: 'human', id: 'user-1', holdsCapability: true, delegationCeiling: 'A1' },
    }))

    expect(decision.reasons.map((reason) => reason.rule)).toContain('delegation-ceiling')
  })
})

describe('Phase G exit criteria 2 and 3 — the resolver honours the record ceiling', () => {
  // Carries both the record's lock state and any project overlay, merged by
  // the enforcement service. Whichever is lower is what arrives here.
  it('narrows the answer when a record is restricted', () => {
    const decision = resolveDecision(input({ context: { resourceCeiling: 'A2' } }))

    expect(rank(decision.gate)).toBeLessThanOrEqual(rank('A2'))
    expect(rank(decision.gate)).toBeLessThan(rank(baseline.gate))
  })

  it('refuses every write when the record is locked or the overlay denies', () => {
    // Terminal deny needs no special path: A0 cannot be lifted by anything
    // later, because every rule takes a minimum.
    const decision = resolveDecision(input({ context: { resourceCeiling: 'A0' } }))

    expect(decision.gate).toBe('A0')
    expect(decision.allowed).toBe(false)
  })

  it('says which rule bound the answer', () => {
    const decision = resolveDecision(input({ context: { resourceCeiling: 'A1' } }))

    expect(decision.reasons.map((reason) => reason.rule)).toContain('resource-state')
  })
})

describe('the property all three share', () => {
  it('takes the lowest when several apply at once', () => {
    // The design's core claim: everything is a ceiling and the answer is the
    // minimum. Three inputs at different heights must yield the lowest, not the
    // last evaluated — otherwise the answer depends on rule order, which is the
    // one thing this design refuses to let matter.
    const decision = resolveDecision(input({
      actor: { kind: 'human', id: 'user-1', holdsCapability: true, delegationCeiling: 'A4' },
      context: { resourceCeiling: 'A2', policyCeiling: 'A3' },
    }))

    expect(decision.gate).toBe('A2')
  })

  it('never lets one input raise what another lowered', () => {
    // Stated as its own test because it is the invariant, not a side effect.
    // A permissive input arriving after a restrictive one must change nothing.
    const restrictive = resolveDecision(input({ context: { resourceCeiling: 'A1' } }))
    const withPermissiveToo = resolveDecision(input({
      actor: { kind: 'human', id: 'user-1', holdsCapability: true, delegationCeiling: 'A5' },
      context: { resourceCeiling: 'A1', policyCeiling: 'A5' },
    }))

    expect(rank(withPermissiveToo.gate)).toBeLessThanOrEqual(rank(restrictive.gate))
  })
})
