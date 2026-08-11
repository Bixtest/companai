/**
 * The task grade, and the one direction it may move.
 *
 * Planning 02 §5 says raising a grade needs no approval from anybody, and
 * lowering one does. The resolver takes the maximum of every grade input for
 * exactly that reason — but until 2026-08-11 it took the maximum of only *two*
 * of them, and a caller passing `G0` landed below the `G1` baseline every act
 * otherwise starts at.
 *
 * That is a widening, in the one place the system cannot afford one: a lower
 * grade buys **more** autonomy, not less.
 */
import { resolveDecision } from '../decision'
import type { CapabilityDescriptor } from '@open-mercato/shared/modules/capabilities'

function capability(overrides: Partial<CapabilityDescriptor> = {}): CapabilityDescriptor {
  return {
    id: 'example.thing.manage',
    module: 'example',
    effectClass: 'E4',
    reversibility: 'reversible',
    ...overrides,
  } as CapabilityDescriptor
}

/**
 * An `ai_worker`, not a person, and that is load-bearing.
 *
 * The effect-class matrix bounds **machines and delegated authority only** — a
 * person exercising a permission they hold is bounded by the org graph, the
 * record's state and tenant policy instead. So the grade only reaches a ceiling
 * for a machine, which is also the only actor that could have exploited the
 * defect below.
 */
function gateFor(grade: 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | undefined, descriptor = capability()) {
  return resolveDecision({
    actor: { kind: 'ai_worker', id: 'worker-1', holdsCapability: true, trustCeiling: 'A5' },
    capability: descriptor,
    context: grade ? { grade } : {},
  }).gate
}

describe('a caller cannot buy autonomy by claiming the work is trivial', () => {
  it('ignores a grade below the baseline', () => {
    // The defect: `G0` on an E4 act was capped at A3 where the default G1 caps
    // it at A2 -- so the one input a caller controls made the answer wider.
    expect(gateFor('G0')).toBe(gateFor(undefined))
  })

  it('holds for every effect class where G0 and G1 differ', () => {
    // E1, E2, E4 and E6 all permit more at G0 than at G1. Each one was a way to
    // ask for more autonomy by describing the work as negligible.
    for (const effectClass of ['E1', 'E2', 'E4', 'E6'] as const) {
      const descriptor = capability({ effectClass })
      expect(gateFor('G0', descriptor)).toBe(gateFor(undefined, descriptor))
    }
  })
})

describe('what still works exactly as before', () => {
  it('lets a caller raise the grade', () => {
    // Raising needs no approval from anybody, and it narrows.
    const raised = gateFor('G3')
    const baseline = gateFor(undefined)
    const order = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
    expect(order.indexOf(raised)).toBeLessThanOrEqual(order.indexOf(baseline))
  })

  it('still lets the data classification raise it above the baseline', () => {
    const secret = capability({ dataClasses: ['secret'] })
    const ordinary = capability()

    const order = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
    expect(order.indexOf(gateFor(undefined, secret)))
      .toBeLessThan(order.indexOf(gateFor(undefined, ordinary)))
  })

  it('takes the data floor even when the caller asked for less', () => {
    const personal = capability({ dataClasses: ['personal'] })

    expect(gateFor('G0', personal)).toBe(gateFor(undefined, personal))
  })

  it('says in the explanation that the classification set the grade', () => {
    const personal = capability({ dataClasses: ['personal'] })

    const decision = resolveDecision({
      actor: { kind: 'ai_worker', id: 'worker-1', holdsCapability: true, trustCeiling: 'A5' },
      capability: personal,
      context: { grade: 'G0' },
    })

    expect(decision.reasons.some((reason) => reason.detail.includes('whatever the caller asked for'))).toBe(true)
  })
})
