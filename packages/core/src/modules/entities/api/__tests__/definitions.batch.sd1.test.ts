/** @jest-environment node */
import { POST } from '../definitions.batch'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import { fieldDefinitionSurface } from '../../data/guards'

/** The shared error spy from the mocked logger above. */
const logErrorMock = (createLogger('test') as unknown as { error: jest.Mock }).error

type Where = Record<string, unknown>

const mockEm = {
  begin: jest.fn(async () => {}),
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
  find: jest.fn(async (_entity: unknown, _where: Where) => [] as unknown[]),
  findOne: jest.fn(async () => null),
  create: jest.fn((_entity: unknown, data: Where) => ({ ...data })),
  persist: jest.fn(),
  flush: jest.fn(async () => {}),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'em') return mockEm
      if (key === 'cache') throw new Error('no cache')
      return null
    },
  }),
}))

const mockGetAuth = jest.fn(async () => ({
  sub: 'user-1',
  tenantId: 'tenant-1',
  orgId: 'org-1',
  roles: ['admin'],
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuth(...(args as [])),
}))

// A shared set of spies, exposed through the mocked module so the tests can assert on
// what the route logged (the "no tenant" path must be loud, not silent).
jest.mock('@open-mercato/shared/lib/logger', () => {
  const shared = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const withChild = (): Record<string, unknown> => ({ ...shared, child: () => withChild() })
  return { createLogger: () => withChild() }
})

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: async () => ({ tenantId: 'tenant-1', selectedId: 'org-1' }),
}))

jest.mock('@open-mercato/core/modules/entities/data/entities', () => ({
  CustomFieldDef: 'CustomFieldDef',
  CustomFieldEntityConfig: 'CustomFieldEntityConfig',
}))

jest.mock('../definitions.cache', () => ({ invalidateDefinitionsCache: jest.fn() }))

jest.mock('../../lib/definitions-version', () => ({
  resolveEntityDefinitionsVersion: jest.fn(async () => null),
}))

// The write half itself is proved in `auth/lib/__tests__/permission-decision-grant.test.ts`.
// Here we assert what the ROUTE decides and hands it: whether the gate ran, over which
// surfaces, and that the write is asked for after the commit.
jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyStructureChangeGrant: jest.fn(async () => ({
    applied: true,
    roleName: 'superadmin',
    roleId: 'role-1',
    aclCreated: true,
    added: [],
    alreadyPresent: [],
  })),
}))

// Keep the real surface builder for every test except the refusal case, which needs a
// surface the gate cannot read (the HTTP path cannot produce one — `entityId` and `key`
// are both validated — so the refusal is a defensive branch and must be reached by
// substitution, not by a request).
jest.mock('../../data/guards', () => {
  const actual = jest.requireActual('../../data/guards')
  return { ...actual, fieldDefinitionSurface: jest.fn(actual.fieldDefinitionSurface) }
})

const grantMock = applyStructureChangeGrant as unknown as jest.Mock
const surfaceMock = fieldDefinitionSurface as unknown as jest.Mock

const makeRequest = (body: unknown) =>
  new Request('http://x/api/entities/definitions/batch', {
    method: 'POST',
    body: JSON.stringify(body),
  })

/** The records a custom field yields — the two S2 blocks, in catalogue order. */
const fieldRecords = (entityId: string, key: string) => [
  `${entityId}.${key}.view`,
  `${entityId}.${key}.manage`,
  `${entityId}.${key}.structure`,
]

describe('entities/definitions.batch POST — SD-1 (CC-2) the create path is gated', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEm.find.mockResolvedValue([] as unknown[])
    surfaceMock.mockImplementation(jest.requireActual('../../data/guards').fieldDefinitionSurface)
  })

  it('runs the gate for a newly created column and grants its records to the tenant role', async () => {
    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }],
    }))

    expect(response.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [em, input] = grantMock.mock.calls[0]
    expect(em).toBe(mockEm)
    expect(input.tenantId).toBe('tenant-1')
    expect(input.decision.outcome).toBe('defaulted')
    expect(input.decision.grantTo).toBe('superadmin')
    expect(input.decision.records.map((r: { feature: string }) => r.feature)).toEqual(
      fieldRecords('test:entity', 'alpha'),
    )
  })

  it('gates every newly created column in one decision', async () => {
    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [
        { key: 'alpha', kind: 'text' },
        { key: 'beta', kind: 'integer' },
      ],
    }))

    expect(response.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const records = grantMock.mock.calls[0][1].decision.records.map((r: { feature: string }) => r.feature)
    expect(records).toEqual([
      ...fieldRecords('test:entity', 'alpha'),
      ...fieldRecords('test:entity', 'beta'),
    ])
  })

  it('does not gate a save that creates no column (an existing key is an update)', async () => {
    mockEm.find.mockResolvedValueOnce([
      { entityId: 'test:entity', key: 'alpha', kind: 'text', configJson: {}, isActive: true },
    ] as unknown[])

    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'integer' }],
    }))

    expect(response.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate a new key saved as inactive (a tombstone is not a column)', async () => {
    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text', isActive: false }],
    }))

    expect(response.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('gates a key whose INACTIVE row this save reactivates (re-appearing is appearing)', async () => {
    mockEm.find.mockResolvedValueOnce([
      { entityId: 'test:entity', key: 'alpha', kind: 'text', configJson: {}, isActive: false },
    ] as unknown[])

    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }],
    }))

    expect(response.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    expect(grantMock.mock.calls[0][1].decision.records.map((r: { feature: string }) => r.feature)).toEqual(
      fieldRecords('test:entity', 'alpha'),
    )
  })

  it('logs loudly when the columns committed but the request carried no tenant to grant in', async () => {
    mockGetAuth.mockResolvedValueOnce({ sub: 'user-1', tenantId: null, orgId: 'org-1' })

    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }],
    }))

    expect(response.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('no tenant'),
      expect.objectContaining({ surfaces: ['test:entity.alpha'] }),
    )
  })

  it('refuses the whole batch (rollback, 422, nothing persisted) when the gate cannot decide', async () => {
    surfaceMock.mockReturnValueOnce({ id: 'not a readable id', kind: 'field', owner: 'entities', source: 'recorded' })

    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }],
    }))

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('The batch cannot land'),
    })
    expect(mockEm.rollback).toHaveBeenCalledTimes(1)
    expect(mockEm.commit).not.toHaveBeenCalled()
    expect(mockEm.persist).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('writes the grant after the commit, never before it', async () => {
    const order: string[] = []
    mockEm.commit.mockImplementationOnce(async () => { order.push('commit') })
    grantMock.mockImplementationOnce(async () => {
      order.push('grant')
      return { applied: true, roleName: 'superadmin', roleId: 'role-1', aclCreated: true, added: [], alreadyPresent: [] }
    })

    await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }],
    }))

    expect(order).toEqual(['commit', 'grant'])
  })

  it('still returns 200 when the grant write fails — the columns are already committed', async () => {
    grantMock.mockRejectedValueOnce(new Error('acl store unavailable'))

    const response = await POST(makeRequest({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }],
    }))

    expect(response.status).toBe(200)
    expect(mockEm.commit).toHaveBeenCalledTimes(1)
  })
})
