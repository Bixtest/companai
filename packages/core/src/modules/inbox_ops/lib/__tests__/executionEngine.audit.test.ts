/**
 * R2c — the decision record.
 *
 * `executionEngine.test.ts` proves the engine executes what a human approved.
 * This proves the platform can say *who* approved it, which is the promise the
 * rest of the product rests on: an LLM proposes, a person decides, and the
 * system can always explain the decision afterwards.
 *
 * The failure mode being guarded is silence — an accepted proposal that leaves
 * no trace looks exactly like a healthy one until somebody asks.
 */

import type { InboxProposalAction } from '@open-mercato/core/modules/inbox_ops/data/entities'

const mockFindOneWithDecryption = jest.fn()
const mockFindWithDecryption = jest.fn()

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => mockFindOneWithDecryption(...args),
  findWithDecryption: (...args: unknown[]) => mockFindWithDecryption(...args),
}))

import { executeAction, rejectAction } from '@open-mercato/core/modules/inbox_ops/lib/executionEngine'

const actionLogService = { log: jest.fn() }
const rbacService = { userHasAllFeatures: jest.fn() }
const commandBus = { execute: jest.fn() }

function createEm() {
  const em: Record<string, jest.Mock> = {
    fork: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    nativeUpdate: jest.fn(),
    flush: jest.fn(),
    transactional: jest.fn(),
  }
  em.fork.mockReturnValue(em)
  em.flush.mockResolvedValue(undefined)
  em.transactional.mockImplementation(async (cb: (trx: unknown) => unknown) => cb(em))
  return em
}

function createCtx(em: ReturnType<typeof createEm>) {
  return {
    em,
    userId: 'user-1',
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    eventBus: null,
    auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
    container: {
      resolve: jest.fn((token: string) => {
        if (token === 'em') return em
        if (token === 'actionLogService') return actionLogService
        if (token === 'rbacService') return rbacService
        if (token === 'commandBus') return commandBus
        return null
      }),
    },
  } as never
}

const proposedAction = {
  id: 'action-1',
  proposalId: 'proposal-1',
  actionType: 'create_order',
  status: 'pending',
  confidence: '0.82',
  requiredFeature: 'sales.orders.create',
  description: 'Create an order for 10 widgets — from the customer’s email',
  payload: { customerEmail: 'buyer@example.com', lineItems: [{ productName: 'Widget' }] },
} as unknown as InboxProposalAction

describe('inbox_ops records who decided what a machine proposed', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    rbacService.userHasAllFeatures.mockResolvedValue(true)
    commandBus.execute.mockResolvedValue({ result: {} })
    actionLogService.log.mockResolvedValue(undefined)
    mockFindOneWithDecryption.mockResolvedValue(null)
    mockFindWithDecryption.mockResolvedValue([])
  })

  it('records the acceptance in the same transaction that claims the action', async () => {
    const em = createEm()
    em.nativeUpdate.mockResolvedValue(1)
    mockFindOneWithDecryption.mockResolvedValueOnce({ ...proposedAction, actionType: 'link_contact' })

    await executeAction(proposedAction, createCtx(em))

    expect(em.transactional).toHaveBeenCalledTimes(1)
    const entry = actionLogService.log.mock.calls[0][0]
    expect(entry).toMatchObject({
      commandId: 'inbox_ops.proposal_action.accepted',
      resourceKind: 'inbox_ops.proposal_action',
      resourceId: 'action-1',
      actorUserId: 'user-1',
      tenantId: 'tenant-1',
      organizationId: 'org-1',
    })
    expect(entry.context).toMatchObject({ proposedBy: 'ai' })
  })

  it('records a rejection too — a declined proposal is also a governed decision', async () => {
    const em = createEm()
    em.nativeUpdate.mockResolvedValue(1)
    mockFindOneWithDecryption.mockResolvedValueOnce(proposedAction)

    await rejectAction(proposedAction, createCtx(em))

    expect(actionLogService.log.mock.calls[0][0]).toMatchObject({
      commandId: 'inbox_ops.proposal_action.rejected',
      resourceId: 'action-1',
      actorUserId: 'user-1',
    })
  })

  it('records nothing when the claim loses the race', async () => {
    // Two reviewers, one action: the loser changed nothing, so it decided
    // nothing. An entry here would show an approval that never took effect.
    const em = createEm()
    em.nativeUpdate.mockResolvedValue(0)

    const result = await executeAction(proposedAction, createCtx(em))

    expect(result.statusCode).toBe(409)
    expect(actionLogService.log).not.toHaveBeenCalled()
  })

  it('keeps the model’s confidence and never the extracted content', async () => {
    // The confidence is the governance-relevant part: how sure the model was
    // about what a person went on to approve. The description and payload are
    // encrypted tenant PII and must not be copied into a second table with
    // different retention and different readers.
    const em = createEm()
    em.nativeUpdate.mockResolvedValue(1)
    mockFindOneWithDecryption.mockResolvedValueOnce({ ...proposedAction, actionType: 'link_contact' })

    await executeAction(proposedAction, createCtx(em))

    const snapshot = actionLogService.log.mock.calls[0][0].snapshotAfter
    expect(snapshot).toEqual({
      proposalId: 'proposal-1',
      actionType: 'create_order',
      confidence: '0.82',
      requiredFeature: 'sales.orders.create',
    })

    const serialized = JSON.stringify(actionLogService.log.mock.calls[0][0])
    expect(serialized).not.toContain('buyer@example.com')
    expect(serialized).not.toContain('Widget')
  })

  it('fails the claim closed when the audit write fails', async () => {
    // The whole point of writing the record inside the transaction: if the
    // decision cannot be recorded, the decision does not take effect.
    const em = createEm()
    em.nativeUpdate.mockResolvedValue(1)
    em.transactional.mockImplementation(async (cb: (trx: unknown) => unknown) => {
      await cb(em)
      return undefined
    })
    actionLogService.log.mockRejectedValue(new Error('[internal] audit unavailable'))

    await expect(executeAction(proposedAction, createCtx(em))).rejects.toThrow('audit unavailable')
  })

  it('still works when the audit_logs module is absent', async () => {
    // A downstream app may disable audit_logs entirely. An absent service is
    // legitimate; a failing one is not. The two must not be conflated.
    const em = createEm()
    em.nativeUpdate.mockResolvedValue(1)
    mockFindOneWithDecryption.mockResolvedValueOnce({ ...proposedAction, actionType: 'link_contact' })

    const ctx = {
      em,
      userId: 'user-1',
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      eventBus: null,
      auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
      container: {
        resolve: jest.fn((token: string) => {
          if (token === 'em') return em
          if (token === 'rbacService') return rbacService
          if (token === 'commandBus') return commandBus
          if (token === 'actionLogService') throw new Error('[internal] not registered')
          return null
        }),
      },
    } as never

    const result = await executeAction(proposedAction, ctx)

    // The claim went through and the engine carried on past the audit step —
    // no exception, and not the 409 that a lost claim returns.
    expect(em.nativeUpdate).toHaveBeenCalledTimes(1)
    expect(result.statusCode).not.toBe(409)
  })
})
