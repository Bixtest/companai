/**
 * R5 — preflight.
 *
 * The property under test is not "the numbers add up". It is that a person is
 * asked **once, up front, for everything** — because the failure this exists to
 * prevent is a worker stalling at step four while nobody is watching, and a
 * preflight that stopped at the first obstacle would reproduce it exactly.
 */

import { resolvePlan, renderPlan, type PlanStep } from '../preflight'
import type { CapabilityDescriptor } from '../../../modules/capabilities'

const capability = (id: string, overrides: Partial<CapabilityDescriptor> = {}): CapabilityDescriptor => ({
  id,
  module: id.split('.')[0],
  effectClass: 'E1',
  reversibility: 'reversible',
  ...overrides,
})

const step = (label: string, cap: CapabilityDescriptor, holdsCapability = true): PlanStep => ({
  label,
  input: {
    actor: { kind: 'ai_worker', id: 'nora', holdsCapability, trustCeiling: 'A5' },
    capability: cap,
    context: { grade: 'G1' },
  },
})

describe('preflight resolves the whole plan', () => {
  it('resolves every step even after one is blocked', () => {
    const plan = resolvePlan([
      step('research the customer', capability('research.web', { effectClass: 'E0' })),
      step('generate the contract', capability('contract.generate', { effectClass: 'E5' })),
      step('publish the report', capability('report.publish', { effectClass: 'E1' })),
    ])

    expect(plan.steps).toHaveLength(3)
    expect(plan.steps[2].decision.gate).toBeDefined()
  })

  it('counts one approval per capability, not per occurrence', () => {
    // Approving the same act five times in one plan is one decision a person
    // makes. Counting occurrences would manufacture approval fatigue out of
    // nothing.
    const invoice = capability('finance.invoice.issue', { effectClass: 'E4', reversibility: 'irreversible' })
    const plan = resolvePlan([
      step('invoice January', invoice),
      step('invoice February', invoice),
      step('invoice March', invoice),
    ])

    expect(plan.blockedSteps).toHaveLength(3)
    expect(plan.approvalsNeeded).toBe(1)
  })

  it('reports the plan gate as the strictest step', () => {
    const plan = resolvePlan([
      step('read something', capability('research.web', { effectClass: 'E0' })),
      step('delete something', capability('files.delete', { effectClass: 'E6', reversibility: 'irreversible' })),
    ])

    expect(plan.planGate).toBe('A1')
  })

  it('knows when nothing needs a person', () => {
    const plan = resolvePlan([
      step('read one thing', capability('a.read', { effectClass: 'E0' })),
      step('read another', capability('b.read', { effectClass: 'E0' })),
    ])

    expect(plan.runsUnattended).toBe(true)
    expect(plan.approvalsNeeded).toBe(0)
  })

  it('treats a hold window as proceeding, because nobody has to act', () => {
    // A3 commits on its own unless somebody objects. Counting it as blocked
    // would ask for approvals the design deliberately avoids asking for.
    const plan = resolvePlan([
      step('send externally', capability('comms.send', { effectClass: 'E3', reversibility: 'compensatable', compensation: 'comms.retract', externalEffect: true })),
    ])

    expect(plan.steps[0].decision.gate).toBe('A3')
    expect(plan.steps[0].proceeds).toBe(true)
    expect(plan.runsUnattended).toBe(true)
  })

  it('separates a missing permission from a needed approval', () => {
    const plan = resolvePlan([
      step('do something ungranted', capability('secret.thing'), false),
    ])

    expect(plan.steps[0].decision.gate).toBe('A0')
    expect(plan.steps[0].proceeds).toBe(false)
    expect(renderPlan(plan)).toContain('needs permission')
  })
})

describe('the rendered preview', () => {
  it('shows one line per step with its gate and what happens', () => {
    const plan = resolvePlan([
      step('research the customer', capability('research.web', { effectClass: 'E0' })),
      step('issue the invoice', capability('finance.invoice.issue', { effectClass: 'E4', reversibility: 'irreversible' })),
    ])

    const rendered = renderPlan(plan)

    expect(rendered).toContain('✓ research the customer')
    expect(rendered).toContain('⏸ issue the invoice')
    expect(rendered).toContain('1 approval needed.')
  })

  it('says so plainly when nothing is needed', () => {
    const plan = resolvePlan([step('read', capability('a.read', { effectClass: 'E0' }))])
    expect(renderPlan(plan)).toContain('No approvals needed.')
  })

  it('pluralises honestly', () => {
    const plan = resolvePlan([
      step('one', capability('a.delete', { effectClass: 'E6', reversibility: 'irreversible' })),
      step('two', capability('b.delete', { effectClass: 'E6', reversibility: 'irreversible' })),
    ])

    expect(renderPlan(plan)).toContain('2 approvals needed.')
  })
})
