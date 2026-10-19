/**
 * @jest-environment node
 *
 * CC-127 — the departure flow's data half.
 *
 * The route test covers the HTTP contract with this module mocked. This one
 * covers the module with the database mocked, so the two claims that matter are
 * provable in isolation:
 *
 * - the preview sees **both** key links (`session_user_id` and `created_by`),
 *   which is already wider than the `api_keys` cascade it explains;
 * - the receipt is built from what the **write** reported, not from the
 *   preview's list — the one direction a departure must never fail in.
 */
const findOneMock = jest.fn()
const findMock = jest.fn()
const listForPrincipalsMock = jest.fn()
const revokeForPrincipalsMock = jest.fn()
const delegationRevokeMock = jest.fn()

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => findOneMock(...args),
  findWithDecryption: (...args: unknown[]) => findMock(...args),
}))

jest.mock('../../data/repositories/AiAgentBindingRepository', () => ({
  AiAgentBindingRepository: class {
    listForPrincipals(...args: unknown[]) {
      return listForPrincipalsMock(...args)
    }
    revokeForPrincipals(...args: unknown[]) {
      return revokeForPrincipalsMock(...args)
    }
  },
}))

import { ApiKey } from '@open-mercato/core/modules/api_keys/data/entities'
import { AuthorityDelegation } from '@open-mercato/core/modules/auth/data/entities'
import {
  applyDeparture,
  previewDeparture,
  DEPARTURE_INERT_REASON,
  type DeparturePreview,
} from '../departure'

const USER_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const KEY_SESSION = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'
const KEY_CREATED = 'cccccccc-1111-4111-8111-cccccccccccc'
const TENANT = 'tenant-1'

const user = { id: USER_ID, email: 'lea@example.com', name: 'Lea' }

function matches(row: Record<string, unknown>, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([field, value]) => row[field] === value)
}

/**
 * A minimal but **honest** entity manager: it applies the filters the module
 * actually sends (`tenantId`, `$or`). A mock that returned every row regardless
 * would make the query itself unprovable — which is exactly how the mutation
 * "read only the `created` link" first survived its own test.
 */
function makeEm(keys: Record<string, unknown>[] = [], delegations: Record<string, unknown>[] = []) {
  return {
    findOne: findOneMock,
    find: (entity: unknown, where: Record<string, unknown> = {}) => {
      const source = entity === ApiKey ? keys : entity === AuthorityDelegation ? delegations : []
      const $or = where.$or as Record<string, unknown>[] | undefined
      return Promise.resolve(
        source.filter((row) => {
          if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false
          if (where.deletedAt === null && row.deletedAt != null) return false
          if ($or && !$or.some((condition) => matches(row, condition))) return false
          return true
        }),
      )
    },
  } as never
}

function makePreview(overrides: Partial<DeparturePreview> = {}): DeparturePreview {
  return {
    user: { id: USER_ID, email: 'lea@example.com', name: 'Lea' },
    agents: [],
    delegations: [],
    default: 'deactivate',
    ...overrides,
  }
}

describe('CC-127 — previewDeparture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    findOneMock.mockResolvedValue(user)
    listForPrincipalsMock.mockResolvedValue([])
  })

  it('returns null for a user that is not in the tenant, and reads nothing else', async () => {
    findOneMock.mockResolvedValue(null)
    const preview = await previewDeparture({ userId: USER_ID, tenantId: TENANT, em: makeEm() })
    expect(preview).toBeNull()
    expect(listForPrincipalsMock).not.toHaveBeenCalled()
  })

  it('scopes the user lookup to the tenant — a cross-tenant id is a miss, not a read', async () => {
    await previewDeparture({ userId: USER_ID, tenantId: TENANT, em: makeEm() })
    const [, , where] = findOneMock.mock.calls[0]
    expect(where).toMatchObject({ id: USER_ID, tenantId: TENANT, deletedAt: null })
  })

  it('lists a binding through BOTH key links, tagging each', async () => {
    findOneMock.mockResolvedValue(user)
    const em = makeEm([
      {
        id: KEY_SESSION,
        name: 'Lea session key',
        tenantId: TENANT,
        // Acts as Lea, minted by somebody else — the link the `api_keys`
        // cascade cannot see.
        sessionUserId: USER_ID,
        createdBy: 'another-admin',
      },
      {
        id: KEY_CREATED,
        name: 'Minted by Lea',
        tenantId: TENANT,
        sessionUserId: null,
        createdBy: USER_ID,
      },
    ])
    listForPrincipalsMock.mockImplementation(async (ids: string[]) =>
      [
        { principalId: KEY_SESSION, agentId: 'sales.assistant', organizationId: 'org-1' },
        { principalId: KEY_CREATED, agentId: 'ops.assistant', organizationId: 'org-2' },
      ].filter((row) => ids.includes(row.principalId)),
    )

    const preview = await previewDeparture({ userId: USER_ID, tenantId: TENANT, em })

    expect(preview?.agents).toEqual([
      {
        agentId: 'sales.assistant',
        principalId: KEY_SESSION,
        keyName: 'Lea session key',
        organizationId: 'org-1',
        keyLink: 'session',
      },
      {
        agentId: 'ops.assistant',
        principalId: KEY_CREATED,
        keyName: 'Minted by Lea',
        organizationId: 'org-2',
        keyLink: 'created',
      },
    ])
  })

  it('reads a key that both acts as and was minted by the person as `session`', async () => {
    findOneMock.mockResolvedValue(user)
    const em = makeEm([
      {
        id: KEY_SESSION,
        name: 'Both',
        tenantId: TENANT,
        sessionUserId: USER_ID,
        createdBy: USER_ID,
      },
    ])
    listForPrincipalsMock.mockResolvedValue([
      { principalId: KEY_SESSION, agentId: 'sales.assistant', organizationId: null },
    ])

    const preview = await previewDeparture({ userId: USER_ID, tenantId: TENANT, em })

    expect(preview?.agents[0].keyLink).toBe('session')
  })

  it('queries the keys by both columns, tenant-scoped and live-only', async () => {
    const emFind = jest.fn(async (entity: unknown) => {
      if (entity === ApiKey) return []
      return []
    })
    await previewDeparture({
      userId: USER_ID,
      tenantId: TENANT,
      em: { findOne: findOneMock, find: emFind } as never,
    })
    const [, where] = emFind.mock.calls[0] as unknown as [unknown, Record<string, unknown>]
    expect(where).toMatchObject({ tenantId: TENANT, deletedAt: null })
    expect(where.$or).toEqual([{ sessionUserId: USER_ID }, { createdBy: USER_ID }])
  })

  it('lists delegations in both directions, with the direction named', async () => {
    findOneMock.mockResolvedValue(user)
    const em = makeEm(
      [],
      [
        {
          id: 'd-1',
          tenantId: TENANT,
          grantorPrincipalId: USER_ID,
          grantorKind: 'human',
          granteePrincipalId: 'someone-else',
          granteeKind: 'human',
          capabilityId: 'auth.users.delete',
          expiresAt: new Date('2026-11-01T00:00:00Z'),
          revokedAt: null,
        },
        {
          id: 'd-2',
          tenantId: TENANT,
          grantorPrincipalId: 'someone-else',
          grantorKind: 'human',
          granteePrincipalId: USER_ID,
          granteeKind: 'human',
          capabilityId: 'sales.orders.approve',
          expiresAt: new Date('2026-12-01T00:00:00Z'),
          revokedAt: null,
        },
      ],
    )

    const preview = await previewDeparture({ userId: USER_ID, tenantId: TENANT, em })

    expect(preview?.delegations).toEqual([
      {
        id: 'd-1',
        direction: 'granted',
        capabilityId: 'auth.users.delete',
        expiresAt: '2026-11-01T00:00:00.000Z',
        alreadyRevoked: false,
      },
      {
        id: 'd-2',
        direction: 'received',
        capabilityId: 'sales.orders.approve',
        expiresAt: '2026-12-01T00:00:00.000Z',
        alreadyRevoked: false,
      },
    ])
  })

  it('reports an already-revoked delegation truthfully', async () => {
    findOneMock.mockResolvedValue(user)
    const em = makeEm(
      [],
      [
        {
          id: 'd-1',
          tenantId: TENANT,
          grantorPrincipalId: USER_ID,
          grantorKind: 'human',
          granteePrincipalId: 'someone-else',
          granteeKind: 'human',
          capabilityId: 'auth.users.delete',
          expiresAt: new Date('2026-11-01T00:00:00Z'),
          revokedAt: new Date('2026-10-01T00:00:00Z'),
        },
      ],
    )
    const preview = await previewDeparture({ userId: USER_ID, tenantId: TENANT, em })
    expect(preview?.delegations[0].alreadyRevoked).toBe(true)
  })

  it('names the safe default', async () => {
    const preview = await previewDeparture({ userId: USER_ID, tenantId: TENANT, em: makeEm() })
    expect(preview?.default).toBe('deactivate')
  })
})

describe('CC-127 — applyDeparture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    revokeForPrincipalsMock.mockResolvedValue([])
    delegationRevokeMock.mockResolvedValue({ id: 'revoked' })
  })

  const twoAgents = makePreview({
    agents: [
      {
        agentId: 'sales.assistant',
        principalId: KEY_SESSION,
        keyName: 'Lea session key',
        organizationId: 'org-1',
        keyLink: 'session',
      },
      {
        agentId: 'ops.assistant',
        principalId: KEY_CREATED,
        keyName: 'Minted by Lea',
        organizationId: 'org-2',
        keyLink: 'created',
      },
    ],
    delegations: [
      {
        id: 'd-1',
        direction: 'granted',
        capabilityId: 'auth.users.delete',
        expiresAt: '2026-11-01T00:00:00.000Z',
        alreadyRevoked: false,
      },
      {
        id: 'd-2',
        direction: 'received',
        capabilityId: 'sales.orders.approve',
        expiresAt: '2026-12-01T00:00:00.000Z',
        alreadyRevoked: false,
      },
    ],
  })

  it('deactivate revokes bindings TENANT-WIDE — no organization in the scope', async () => {
    await applyDeparture({
      preview: twoAgents,
      decision: 'deactivate',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })

    expect(revokeForPrincipalsMock).toHaveBeenCalledWith([KEY_SESSION, KEY_CREATED], {
      tenantId: TENANT,
    })
    const [, scope] = revokeForPrincipalsMock.mock.calls[0]
    expect(scope).not.toHaveProperty('organizationId')
  })

  it('builds the receipt from the WRITE, not from the preview list', async () => {
    // The preview listed two; the write only reported one — the other was
    // already revoked by something else between the read and the write.
    revokeForPrincipalsMock.mockResolvedValue([
      { principalId: KEY_SESSION, agentId: 'sales.assistant', organizationId: 'org-1' },
    ])

    const receipt = await applyDeparture({
      preview: twoAgents,
      decision: 'deactivate',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })

    expect(receipt.agents[0]).toMatchObject({ agentId: 'sales.assistant', revoked: true, alreadyRevoked: false })
    expect(receipt.agents[1]).toMatchObject({ agentId: 'ops.assistant', revoked: false, alreadyRevoked: true })
    expect(receipt.counts).toMatchObject({ agents: 2, agentsRevoked: 1 })
  })

  it('revokes delegations in BOTH directions and names the admin who decided', async () => {
    const receipt = await applyDeparture({
      preview: twoAgents,
      decision: 'deactivate',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })

    expect(delegationRevokeMock).toHaveBeenCalledTimes(2)
    expect(delegationRevokeMock).toHaveBeenCalledWith('d-1', { tenantId: TENANT }, 'admin-1')
    expect(delegationRevokeMock).toHaveBeenCalledWith('d-2', { tenantId: TENANT }, 'admin-1')
    expect(receipt.delegations.map((d) => d.revoked)).toEqual([true, true])
  })

  it('does not re-revoke a delegation that is already revoked', async () => {
    const receipt = await applyDeparture({
      preview: makePreview({
        delegations: [
          {
            id: 'd-1',
            direction: 'granted',
            capabilityId: 'auth.users.delete',
            expiresAt: '2026-11-01T00:00:00.000Z',
            alreadyRevoked: true,
          },
        ],
      }),
      decision: 'deactivate',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })

    expect(delegationRevokeMock).not.toHaveBeenCalled()
    expect(receipt.delegations[0]).toMatchObject({ revoked: false, alreadyRevoked: true })
  })

  it('leave writes NOTHING and says so per agent', async () => {
    const receipt = await applyDeparture({
      preview: twoAgents,
      decision: 'leave',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })

    expect(revokeForPrincipalsMock).not.toHaveBeenCalled()
    expect(delegationRevokeMock).not.toHaveBeenCalled()
    expect(receipt.counts).toMatchObject({ agentsRevoked: 0, delegationsRevoked: 0 })
    expect(receipt.agents[0]).toMatchObject({
      revoked: false,
      alreadyRevoked: false,
      stillInert: true,
      reason: DEPARTURE_INERT_REASON,
    })
    // The receipt must not imply a living agent.
    expect(receipt.note).toContain('cannot act')
  })

  it('leaves the user in the receipt either way', async () => {
    const receipt = await applyDeparture({
      preview: makePreview(),
      decision: 'deactivate',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })
    expect(receipt.user).toEqual({ id: USER_ID, email: 'lea@example.com', name: 'Lea' })
    expect(receipt.decision).toBe('deactivate')
  })

  it('skips the binding write entirely when nothing is bound', async () => {
    const receipt = await applyDeparture({
      preview: makePreview(),
      decision: 'deactivate',
      tenantId: TENANT,
      em: makeEm(),
      delegations: { revoke: delegationRevokeMock },
      adminUserId: 'admin-1',
    })
    expect(revokeForPrincipalsMock).not.toHaveBeenCalled()
    expect(receipt.counts).toMatchObject({ agents: 0, agentsRevoked: 0 })
  })
})
