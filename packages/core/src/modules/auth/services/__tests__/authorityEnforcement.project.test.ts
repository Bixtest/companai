/**
 * A matter, reaching the resolver.
 *
 * G4 supplies **two** inputs, and the second is the interesting one. The project
 * ceiling is another narrowing like all the others; the **task grade** is the
 * input that had no source at all until a matter existed to read one from, so
 * these tests are also the proof that sprint item 1 is unblocked rather than
 * merely reclassified.
 */
import { AuthorityEnforcementService } from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const CAPABILITY = 'customers.people.manage'
const RECORD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

function makeService(context: unknown) {
  const contextFor = jest.fn(async () => context)
  const service = new AuthorityEnforcementService(null, null, null, null, null, null, { contextFor } as never)
  return { service, contextFor }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    {
      id: CAPABILITY,
      title: 'Manage people',
      module: 'customers',
      capability: { effectClass: 'E4', reversibility: 'reversible' },
    },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('a project overlay narrows the act', () => {
  it('applies a member overlay that forbids the act', async () => {
    const { service } = makeService({
      grade: null,
      overlay: { rules: [{ capabilityId: CAPABILITY, effect: 'deny', reason: 'sealed pending settlement' }] },
    })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE, { recordId: RECORD })

    expect(decision?.gate).toBe('A0')
  })

  it('quotes the project back rather than reciting a gate', async () => {
    const { service } = makeService({
      grade: null,
      overlay: { rules: [{ effect: 'deny', reason: 'sealed pending settlement' }] },
    })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE, { recordId: RECORD })

    const explanation = decision?.reasons.map((reason) => reason.detail).join(' ') ?? ''
    expect(explanation).toContain('sealed pending settlement')
  })

  it('applies a cap short of a refusal', async () => {
    const { service } = makeService({
      grade: null,
      overlay: { rules: [{ effectClass: 'E4', effect: 'A2' }] },
    })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE, { recordId: RECORD })

    expect(decision?.gate).toBe('A2')
  })
})

describe('the grade a matter carries', () => {
  it('raises the act above the baseline', async () => {
    // The point of G4 for sprint item 1: an act on a G3 matter is G3 work, and
    // until a matter existed every act resolved at the G1 default.
    const graded = makeService({ grade: 'G3', overlay: null })
    const ungraded = makeService({ grade: null, overlay: null })

    const withGrade = await graded.service.decideFor('a-worker', CAPABILITY, SCOPE, { recordId: RECORD })
    const without = await ungraded.service.decideFor('a-worker', CAPABILITY, SCOPE, { recordId: RECORD })

    const order = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
    expect(order.indexOf(withGrade!.gate)).toBeLessThanOrEqual(order.indexOf(without!.gate))
  })

  it('says nothing when nobody graded the matter', async () => {
    // Null means "say nothing", not G0. A project nobody graded must not declare
    // its work negligible -- a lower grade buys *more* autonomy.
    const { service } = makeService({ grade: null, overlay: null })

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE, { recordId: RECORD })

    expect(decision?.reasons.some((reason) => reason.rule === 'data-classification')).toBe(false)
  })
})

describe('what it deliberately does not do', () => {
  it('applies no overlay to somebody who is not a member', async () => {
    // A non-member is still governed by everything else -- the graph, policy, the
    // record's own lock -- but not by rules written for people inside the matter.
    const { service } = makeService({ grade: null, overlay: null })

    const decision = await service.decideFor('an-outsider', CAPABILITY, SCOPE, { recordId: RECORD })

    expect(decision?.gate).not.toBe('A0')
  })

  it('does not look for a project when the act names no record', async () => {
    // A create names nothing. Looking one up would be a query per create for an
    // answer that cannot exist.
    const { service, contextFor } = makeService(null)

    await service.decideFor('a-person', CAPABILITY, SCOPE, {})

    expect(contextFor).not.toHaveBeenCalled()
  })

  it('leaves the decision alone when the record is in no project', async () => {
    const { service } = makeService(null)

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE, { recordId: RECORD })

    expect(decision?.gate).not.toBe('A0')
  })

  it('skips the check when no project service is registered', async () => {
    const service = new AuthorityEnforcementService(null, null, null, null, null, null, null)

    const decision = await service.decideFor('a-person', CAPABILITY, SCOPE, { recordId: RECORD })

    expect(decision?.gate).not.toBe('A0')
  })
})
