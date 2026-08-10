/**
 * R5 — the resolver.
 *
 * This is the kernel the whole product rests on, so the tests are written
 * against the properties rather than the implementation: *nothing raises a
 * gate*, *the answer is always explainable*, *a machine with no trust record
 * never acts unattended*. Those must hold however the rules are later
 * rearranged.
 */

import {
  GATE_MEANING,
  explainDecision,
  resolveDecision,
  type ResolveInput,
} from '../decision'
import { AUTONOMY_GATES, type AutonomyGate, type CapabilityDescriptor } from '../../../modules/capabilities'

const reversibleWrite: CapabilityDescriptor = {
  id: 'customers.person.edit',
  module: 'customers',
  effectClass: 'E1',
  reversibility: 'reversible',
}

const sendEmail: CapabilityDescriptor = {
  id: 'messages.email',
  module: 'messages',
  effectClass: 'E3',
  reversibility: 'irreversible',
  externalEffect: true,
}

const issueInvoice: CapabilityDescriptor = {
  id: 'finance.invoice.issue',
  module: 'finance',
  effectClass: 'E4',
  reversibility: 'compensatable',
  compensation: 'finance.invoice.credit_note',
}

const deleteEverything: CapabilityDescriptor = {
  id: 'attachments.manage',
  module: 'attachments',
  effectClass: 'E6',
  reversibility: 'irreversible',
}

const readOnly: CapabilityDescriptor = {
  id: 'directory.organizations.view',
  module: 'directory',
  effectClass: 'E0',
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

describe('the grant comes first', () => {
  it('blocks an actor who does not hold the capability', () => {
    const decision = resolveDecision(input({ actor: { kind: 'human', id: 'u', holdsCapability: false } }))

    expect(decision.gate).toBe('A0')
    expect(decision.allowed).toBe(false)
    expect(decision.bindingRule).toBe('grant')
  })

  it('says what would fix it rather than only that it is blocked', () => {
    const decision = resolveDecision(input({ actor: { kind: 'human', id: 'u', holdsCapability: false } }))

    expect(decision.alternatives).not.toHaveLength(0)
    expect(decision.alternatives[0].change).toMatch(/were granted to this actor, or someone who holds it acted/)
  })

  it('does not evaluate autonomy at all for an actor without the grant', () => {
    // A blocked actor's explanation should be about the missing permission, not
    // a list of ceilings that never applied.
    const decision = resolveDecision(input({ actor: { kind: 'human', id: 'u', holdsCapability: false } }))
    expect(decision.reasons.map((reason) => reason.rule)).toEqual(['grant'])
  })
})

describe('every answer is explainable', () => {
  it('records every rule that was consulted, not only the strictest', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'human', id: 'u', holdsCapability: true, delegationCeiling: 'A2' },
        context: { grade: 'G2', policyCeiling: 'A4' },
      }),
    )

    expect(decision.reasons.map((reason) => reason.rule)).toEqual(
      expect.arrayContaining(['grant', 'effect-class-floor', 'delegation-ceiling', 'policy']),
    )
  })

  it('names a binding rule that actually produced the final gate', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'human', id: 'u', holdsCapability: true, delegationCeiling: 'A1' } }),
    )

    const binding = decision.reasons.find((reason) => reason.rule === decision.bindingRule)
    expect(binding?.ceiling).toBe(decision.gate)
  })

  it('prefers the earliest rule when several reach the same value', () => {
    // "You do not hold this" explains more than "policy also capped it", so the
    // first constraint to reach the value is the one reported.
    const decision = resolveDecision(
      input({
        actor: { kind: 'human', id: 'u', holdsCapability: true, delegationCeiling: 'A2', invokerCeiling: 'A2' },
      }),
    )

    expect(decision.bindingRule).toBe('invoker-ceiling')
  })

  it('produces a sentence a person could act on', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true }, capability: issueInvoice }),
    )

    const sentence = explainDecision(decision, issueInvoice)
    expect(sentence).toContain(GATE_MEANING[decision.gate].split(' —')[0])
    expect(sentence).toMatch(/Binding rule:/)
    expect(sentence.length).toBeGreaterThan(40)
  })
})

describe('nothing ever raises a gate', () => {
  it('takes the minimum of every ceiling', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'human', id: 'u', holdsCapability: true, trustCeiling: 'A5', delegationCeiling: 'A1' },
        context: { grade: 'G0', policyCeiling: 'A5', resourceCeiling: 'A5' },
      }),
    )

    expect(decision.gate).toBe('A1')
  })

  it('cannot exceed the strictest contributing rule, whatever the combination', () => {
    // Property, not example: over a spread of inputs, the gate is never above
    // the lowest ceiling any rule reported. A rule that could raise the answer
    // would make every other rule advisory.
    const gates = AUTONOMY_GATES
    for (const trust of gates) {
      for (const delegation of gates) {
        for (const policy of gates) {
          const decision = resolveDecision(
            input({
              actor: { kind: 'human', id: 'u', holdsCapability: true, trustCeiling: trust, delegationCeiling: delegation },
              context: { policyCeiling: policy },
            }),
          )
          const strictest = decision.reasons.reduce(
            (lowest, reason) => (rank(reason.ceiling) < rank(lowest) ? reason.ceiling : lowest),
            'A5' as AutonomyGate,
          )
          expect(rank(decision.gate)).toBeLessThanOrEqual(rank(strictest))
        }
      }
    }
  })

  it('never returns a gate outside the defined set', () => {
    const decision = resolveDecision(input({ context: { grade: 'G4' }, capability: deleteEverything }))
    expect(AUTONOMY_GATES).toContain(decision.gate)
  })
})

describe('a machine with no trust record does not get the benefit of the doubt', () => {
  it('caps an AI worker at approve-first', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true } }),
    )

    expect(decision.gate).toBe('A2')
    expect(decision.bindingRule).toBe('untrusted-machine')
  })

  it('caps a service principal the same way', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'service', id: 'key-1', holdsCapability: true } }),
    )

    expect(decision.gate).toBe('A2')
  })

  it('does not cap a human the same way', () => {
    // Invariant I2: the asymmetry is real and lives in the data the resolver
    // reads. A person exercising their own authority is not an untrusted worker.
    const decision = resolveDecision(input({ actor: { kind: 'human', id: 'u', holdsCapability: true } }))

    expect(decision.reasons.map((reason) => reason.rule)).not.toContain('untrusted-machine')
    expect(rank(decision.gate)).toBeGreaterThan(rank('A2'))
  })

  it('does not make an untrusted machine ask permission to read', () => {
    // Shadow mode caught this on real traffic: an API key listing organizations
    // acquired an approval obligation. A read has no effect to approve, and a
    // control that expensive is one somebody switches off — which is the
    // approval fatigue planning 02 exists to resolve, not to cause.
    const decision = resolveDecision(
      input({ actor: { kind: 'service', id: 'key-1', holdsCapability: true }, capability: readOnly }),
    )

    expect(decision.gate).toBe('A5')
    expect(decision.obligations).toEqual([])
  })

  it('still records the rule for a read, with a reason that says why it did not bind', () => {
    // The rule firing at A5 is not the same as the rule being absent. An
    // explanation that silently omits the trust question cannot be read back as
    // "trust was considered and did not constrain this".
    const decision = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true }, capability: readOnly }),
    )

    const trustReason = decision.reasons.find((reason) => reason.rule === 'untrusted-machine')
    expect(trustReason).toBeDefined()
    expect(trustReason!.ceiling).toBe('A5')
    expect(trustReason!.detail).toContain('Reading is not an act')
  })

  it('keeps approve-first for every class of act that has an effect', () => {
    // Only E0 is exempt. The exemption is about acts with no effect, not about
    // machines being trusted — so widening it by accident should fail here.
    for (const capability of [reversibleWrite, sendEmail, issueInvoice, deleteEverything]) {
      const decision = resolveDecision(
        input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true }, capability }),
      )
      expect(rank(decision.gate)).toBeLessThanOrEqual(rank('A2'))
    }
  })

  it('uses a real trust ceiling once one exists, in either direction', () => {
    const trusted = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A4' } }),
    )
    expect(trusted.gate).toBe('A4')

    const distrusted = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A0' } }),
    )
    expect(distrusted.gate).toBe('A0')
  })

  it('tells a blocked worker that a person could do it instead', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true } }),
    )

    expect(decision.alternatives.map((alternative) => alternative.change)).toEqual(
      expect.arrayContaining([expect.stringMatching(/person with this permission/)]),
    )
  })
})

describe('irreversible acts are never decided after they happen (I8)', () => {
  it('caps an irreversible act at approve-first even for a highly trusted worker', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A5' },
        capability: sendEmail,
        context: { grade: 'G0' },
      }),
    )

    expect(rank(decision.gate)).toBeLessThanOrEqual(rank('A2'))
    expect(decision.reasons.map((reason) => reason.rule)).toContain('irreversible-cap')
  })

  it('requires a recorded reason whenever an irreversible act proceeds', () => {
    const decision = resolveDecision(input({ capability: sendEmail, context: { grade: 'G0' } }))

    expect(decision.obligations.map((obligation) => obligation.kind)).toContain('justification')
  })

  it('does not cap a compensatable act the same way', () => {
    const decision = resolveDecision(
      input({ capability: issueInvoice, context: { grade: 'G0' } }),
    )

    expect(decision.reasons.map((reason) => reason.rule)).not.toContain('irreversible-cap')
    expect(decision.reasons.map((reason) => reason.rule)).toContain('compensation-available')
  })

  it('points at the compensatable alternative when irreversibility is what binds', () => {
    const withCompensation: CapabilityDescriptor = { ...sendEmail, compensation: 'messages.retract' }
    const decision = resolveDecision(input({ capability: withCompensation, context: { grade: 'G0' } }))

    if (decision.bindingRule === 'irreversible-cap') {
      expect(decision.alternatives[0].change).toContain('messages.retract')
    }
  })
})

describe('the autonomy matrix bounds workers, not people acting on their own grant', () => {
  // Found by shadow mode on its first real traffic: applying the matrix to
  // direct human action put 45 of 45 observed actions into a review queue or an
  // approval, including changing one's own sidebar layout. The gates describe
  // worker autonomy - A1 is literally "the worker proposes; a human performs the
  // act", which is meaningless when the actor is that human.

  it('does not put an ordinary human write into a review queue', () => {
    const decision = resolveDecision(input({ context: { grade: 'G1' } }))

    expect(decision.gate).toBe('A5')
    expect(decision.obligations.map((obligation) => obligation.kind)).not.toContain('review')
  })

  it('does not require a second person for an irreversible act a human may perform', () => {
    const decision = resolveDecision(input({ capability: sendEmail, context: { grade: 'G2' } }))

    expect(decision.gate).toBe('A5')
    expect(decision.obligations.map((obligation) => obligation.kind)).not.toContain('approval')
  })

  it('still records what kind of act it is, so the explanation is not flattened', () => {
    // Dropping the effect class entirely would make a decision about a
    // destructive act read exactly like one about a read.
    const decision = resolveDecision(input({ capability: deleteEverything }))

    expect(decision.reasons.map((reason) => reason.rule)).toContain('effect-class')
    expect(decision.reasons.find((reason) => reason.rule === 'effect-class')?.detail).toContain('E6')
  })

  it('still records why an irreversible act needs a reason', () => {
    const decision = resolveDecision(input({ capability: sendEmail }))

    expect(decision.obligations.map((obligation) => obligation.kind)).toContain('justification')
  })

  it('binds a machine by the matrix', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A5' },
        capability: deleteEverything,
        context: { grade: 'G1' },
      }),
    )

    expect(decision.bindingRule).toBe('effect-class-floor')
    expect(decision.gate).toBe('A1')
  })

  it('binds a human acting under a delegation by the matrix', () => {
    // Delegated authority is closer to a worker's than to one's own: the person
    // is exercising somebody else's permission, within limits that person set.
    const decision = resolveDecision(
      input({
        actor: { kind: 'human', id: 'u', holdsCapability: true, delegationCeiling: 'A5' },
        context: { grade: 'G1' },
      }),
    )

    expect(decision.reasons.map((reason) => reason.rule)).toContain('effect-class-floor')
    expect(decision.gate).toBe('A4')
  })
})

describe('authority is carried, never amplified (I4)', () => {
  it('caps a worker at its invoker', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A5', invokerCeiling: 'A1' } }),
    )

    expect(decision.gate).toBe('A1')
    expect(decision.bindingRule).toBe('invoker-ceiling')
  })

  it('does not let a highly trusted worker exceed a weak invoker', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A5', invokerCeiling: 'A2' },
        context: { grade: 'G0' },
      }),
    )

    expect(rank(decision.gate)).toBeLessThanOrEqual(rank('A2'))
  })
})

describe('obligations describe how to proceed, not why not to', () => {
  it('asks for approval at A2', () => {
    const decision = resolveDecision(
      input({ actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true } }),
    )
    expect(decision.obligations.map((obligation) => obligation.kind)).toContain('approval')
  })

  it('queues a review at A4', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, trustCeiling: 'A5' },
        context: { grade: 'G1' },
      }),
    )
    expect(decision.gate).toBe('A4')
    expect(decision.obligations.map((obligation) => obligation.kind)).toContain('review')
  })

  it('carries the capability\'s evidence requirement into the obligations', () => {
    const withEvidence: CapabilityDescriptor = { ...reversibleWrite, evidenceRequired: true }
    const decision = resolveDecision(input({ capability: withEvidence }))

    expect(decision.obligations.map((obligation) => obligation.kind)).toContain('evidence')
  })

  it('attaches no obligations to a blocked act — there is nothing to do', () => {
    const decision = resolveDecision(input({ actor: { kind: 'human', id: 'u', holdsCapability: false } }))
    expect(decision.obligations).toEqual([])
  })
})

describe('alternatives never promise more than removing the obstacle would give', () => {
  it('offers only outcomes better than the current gate', () => {
    const decision = resolveDecision(
      input({
        actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true, invokerCeiling: 'A1' },
        context: { policyCeiling: 'A1' },
      }),
    )

    for (const alternative of decision.alternatives) {
      expect(rank(alternative.wouldYield)).toBeGreaterThan(rank(decision.gate))
    }
  })

  it('accounts for the next constraint, not just the binding one', () => {
    // Lifting the delegation cap here does not unlock A5, because the effect
    // class still caps it. An alternative that ignored that would be a lie.
    const decision = resolveDecision(
      input({
        actor: { kind: 'human', id: 'u', holdsCapability: true, delegationCeiling: 'A1' },
        capability: issueInvoice,
        context: { grade: 'G3' },
      }),
    )

    for (const alternative of decision.alternatives) {
      expect(rank(alternative.wouldYield)).toBeLessThanOrEqual(rank('A1'))
    }
  })
})
