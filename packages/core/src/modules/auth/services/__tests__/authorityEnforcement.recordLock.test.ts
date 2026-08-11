/**
 * A record's own state, reaching the resolver.
 *
 * `record-locks.test.ts` in shared decides what each state *permits*. This holds
 * the part that makes it a control rather than a table: that the enforcement path
 * looks the record up, and that the ceiling it finds cannot be lifted by anything
 * about the actor.
 *
 * That last clause is the whole reason this arrives as a ceiling. A locked
 * contract is locked for everybody — the most trusted worker in the company, an
 * actor holding a delegation, somebody with a standing approval. None of them
 * reach past it, because the resolver takes a minimum and nothing in it widens.
 */
import { AuthorityEnforcementService } from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const WRITE = 'directory.organizations.manage'
const READ = 'directory.organizations.view'
const RECORD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

function makeService(lock: { state: string; reason: string | null } | null) {
  const stateFor = jest.fn(async () => lock)
  const service = new AuthorityEnforcementService(null, null, null, { stateFor } as never)
  return { service, stateFor }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    {
      id: WRITE,
      title: 'Manage organizations',
      module: 'directory',
      capability: { effectClass: 'E4', reversibility: 'reversible' },
    },
    {
      id: READ,
      title: 'View organizations',
      module: 'directory',
      capability: { effectClass: 'E0', reversibility: 'reversible' },
    },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('a locked record', () => {
  it('refuses a write to it', async () => {
    const { service, stateFor } = makeService({ state: 'locked', reason: null })

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    expect(stateFor).toHaveBeenCalledWith(RECORD, SCOPE)
    expect(decision?.gate).toBe('A0')
    expect(decision?.allowed).toBe(false)
  })

  it('can still be read', async () => {
    // A record nobody may look at is one nobody can review before deciding
    // whether to unlock it.
    const { service } = makeService({ state: 'locked', reason: null })

    const decision = await service.decideFor('a-person', READ, SCOPE, { recordId: RECORD })

    expect(decision?.gate).not.toBe('A0')
  })

  it('says why, in the words of whoever locked it', async () => {
    // "You may not edit this" is a support ticket. Invariant I6.
    const { service } = makeService({ state: 'locked', reason: 'pending the Q3 audit' })

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    const explanation = decision?.reasons.map((reason) => reason.detail).join(' ') ?? ''
    expect(explanation).toContain('pending the Q3 audit')
  })
})

describe('a restricted record', () => {
  it('makes a write need approval rather than refusing it', async () => {
    const { service } = makeService({ state: 'restricted', reason: null })

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    expect(decision?.gate).toBe('A2')
  })
})

describe('what cannot lift it', () => {
  it('is not lifted by an open record either — an open record says nothing', async () => {
    // `open` must contribute no ceiling at all, not `A5`. An A5 in every
    // explanation for every unlocked record is noise that hides the real reason.
    const { service } = makeService({ state: 'open', reason: null })

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    expect(decision?.reasons.some((reason) => reason.rule === 'resource-state')).toBe(false)
  })

  it('holds against a person acting on their own authority', async () => {
    // The effect-class matrix exempts humans; this does not. A lock is about the
    // record, so it binds whoever is acting.
    const { service } = makeService({ state: 'locked', reason: null })

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    expect(decision?.gate).toBe('A0')
  })
})

describe('when there is nothing to look up', () => {
  it('does not query without a record id', async () => {
    // A create names no record. Looking one up would be a query per create for
    // an answer that cannot exist.
    const { service, stateFor } = makeService(null)

    await service.decideFor('a-person', WRITE, SCOPE, {})

    expect(stateFor).not.toHaveBeenCalled()
  })

  it('leaves the decision alone when the record has no lock', async () => {
    const { service } = makeService(null)

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    expect(decision?.gate).not.toBe('A0')
  })

  it('skips the check when no reader is registered', async () => {
    // A lean bootstrap is not evidence of a lock.
    const service = new AuthorityEnforcementService(null, null, null, null)

    const decision = await service.decideFor('a-person', WRITE, SCOPE, { recordId: RECORD })

    expect(decision?.gate).not.toBe('A0')
  })
})
