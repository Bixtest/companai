/**
 * Promotion refuses; demotion acts.
 *
 * `trust.test.ts` in shared holds the rules. This holds the service's use of
 * them — that a promotion actually consults the evidence before writing
 * anything, that it moves one tier and not four, and that demotion does not
 * wait for anybody.
 *
 * The bias in this file is deliberate: most of it is about *not* granting. This
 * is the only service in the platform whose success case makes a machine more
 * autonomous.
 */
import { TrustService } from '../trustService'
import type { TrustEvidence } from '@open-mercato/shared/modules/trust'

const SCOPE = { tenantId: 'tenant-1' }
const WORKER = 'worker-1'
const GROUP = 'directory'

function makeService(options: { evidence?: TrustEvidence; existingTier?: string | null } = {}) {
  const written: Record<string, unknown>[] = []
  const row = options.existingTier
    ? { id: 'grant-1', tier: options.existingTier, principalId: WORKER, capabilityGroup: GROUP, reason: null, unverifiedJson: [], updatedAt: new Date() }
    : null

  const em = {
    findOne: jest.fn(async () => row),
    find: jest.fn(async () => []),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => {
      written.push(data)
      return { ...data, id: 'grant-new', updatedAt: new Date() }
    }),
    persist: jest.fn(() => ({ flush: jest.fn(async () => {}) })),
    flush: jest.fn(async () => {}),
  }

  const service = new TrustService(em as never)
  // The evidence query is real SQL against `action_logs`, exercised separately
  // against Postgres. Stubbed here so these tests are about the decisions.
  jest.spyOn(service, 'evidenceFor').mockResolvedValue(
    options.evidence ?? { completedActs: 100, overriddenActs: 0 },
  )
  return { service, em, written, row }
}

describe('promotion consults the evidence first', () => {
  it('refuses without enough completed acts, and writes nothing', async () => {
    const { service, em } = makeService({ evidence: { completedActs: 3, overriddenActs: 0 } })

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'looks fine')

    expect(outcome.ok).toBe(false)
    expect(em.create).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('refuses when reviewers keep reversing the work', async () => {
    const { service } = makeService({ evidence: { completedActs: 100, overriddenActs: 20 } })

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'looks fine')

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('override rate')
  })

  it('says which criterion refused, not just that one did', async () => {
    // A refusal nobody can act on sends somebody to ask an engineer.
    const { service } = makeService({ evidence: { completedActs: 3, overriddenActs: 0 } })

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'looks fine')

    if (!outcome.ok) {
      expect(outcome.reason).toContain('completed acts')
      expect(outcome.criteria).toHaveLength(5)
    }
  })
})

describe('promotion moves one tier', () => {
  it('starts an unpromoted principal at T1, not higher', async () => {
    // Absence means T0, so the first promotion is to T1. A jump to T4 is not a
    // promotion, it is a decision to skip the evidence.
    const { service, written } = makeService()

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'earned it')

    expect(outcome.ok).toBe(true)
    expect(written[0]?.tier).toBe('T1')
  })

  it('steps an existing grant up by exactly one', async () => {
    const { service, row } = makeService({ existingTier: 'T2' })

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'earned it')

    expect(outcome.ok).toBe(true)
    expect(row?.tier).toBe('T3')
  })

  it('refuses to go beyond the top', async () => {
    const { service } = makeService({ existingTier: 'T4' })

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'more please')

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('highest tier')
  })

  it('records what nobody could verify, on the grant itself', async () => {
    // The gap has to outlive the decision. In a design document it is a note; on
    // the grant it is something whoever reads it later has to weigh.
    const { service, written } = makeService()

    const outcome = await service.promote(WORKER, 'ai_worker', GROUP, SCOPE, 'user-1', 'earned it')

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.unverified).toHaveLength(3)
    expect((written[0]?.unverifiedJson as unknown[])).toHaveLength(3)
  })
})

describe('demotion does not wait for anybody', () => {
  it('drops a tier when the record demands it', async () => {
    const { service, row } = makeService({
      existingTier: 'T3',
      evidence: { completedActs: 100, overriddenActs: 30 },
    })

    const result = await service.demoteIfEvidenceDemands(WORKER, GROUP, SCOPE)

    expect(result?.tier).toBe('T2')
    expect(row?.tier).toBe('T2')
  })

  it('leaves a good record alone', async () => {
    const { service, row } = makeService({
      existingTier: 'T3',
      evidence: { completedActs: 100, overriddenActs: 1 },
    })

    expect(await service.demoteIfEvidenceDemands(WORKER, GROUP, SCOPE)).toBeNull()
    expect(row?.tier).toBe('T3')
  })

  it('clears the evidence that justified the old tier', async () => {
    // Evidence for T3 is not evidence for T2, and leaving it attached would let
    // the next reader think the lower tier had been earned on it.
    const { service, row } = makeService({
      existingTier: 'T3',
      evidence: { completedActs: 100, overriddenActs: 30 },
    })

    await service.demoteIfEvidenceDemands(WORKER, GROUP, SCOPE)

    expect((row as Record<string, unknown>).evidenceJson).toBeNull()
    expect((row as Record<string, unknown>).grantedByUserId).toBeNull()
  })

  it('has nothing to do when there is no grant', async () => {
    // Absence already means T0; there is no lower place to put it.
    const { service } = makeService({ evidence: { completedActs: 100, overriddenActs: 30 } })

    expect(await service.demoteIfEvidenceDemands(WORKER, GROUP, SCOPE)).toBeNull()
  })
})

describe('reading a tier', () => {
  it('is T0 when nothing has been granted', async () => {
    const { service } = makeService()

    expect(await service.tierFor(WORKER, GROUP, SCOPE)).toBe('T0')
  })

  it('is T0 without a tenant, rather than whatever a global lookup found', async () => {
    const { service, em } = makeService({ existingTier: 'T4' })

    expect(await service.tierFor(WORKER, GROUP, { tenantId: null })).toBe('T0')
    expect(em.findOne).not.toHaveBeenCalled()
  })
})
