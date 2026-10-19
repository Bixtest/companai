/** @jest-environment node */

import { DELETE, GET, POST, PUT } from '@open-mercato/core/modules/auth/api/users/route'
import { Role, RoleAcl, User, UserAcl } from '@open-mercato/core/modules/auth/data/entities'
import { Organization } from '@open-mercato/core/modules/directory/data/entities'
// `CC-137` — the machine test asks the real floor rather than a fixture that was told to say no.
import { floorRefusalFor } from '@open-mercato/core/modules/auth/lib/machineFloor'

const mockGetAuthFromRequest = jest.fn()
const mockLoadAcl = jest.fn()
/**
 * `CC-137`. Defaults to **true** so the pre-existing tests keep asserting what they were written to
 * assert (the subset check); the tests that are *about* this gate set it explicitly, and the capability
 * id is asserted on the call rather than inferred from a status code — a gate asking for a misspelt
 * capability refuses everybody and looks correct.
 */
const mockUserHasAllFeatures = jest.fn(async () => true)
const mockFindWithDecryption = jest.fn()
const mockFindOneWithDecryption = jest.fn()
const mockLoadCustomFieldValues = jest.fn()
const mockLogCrudAccess = jest.fn()
const mockResolveOrganizationScopeForRequest = jest.fn()

const mockSearchTokenExecute = jest.fn()
const mockSearchTokenWhere = jest.fn().mockImplementation(() => searchTokenQueryBuilder)
const mockSearchTokenHaving = jest.fn().mockImplementation(() => searchTokenQueryBuilder)
const mockSearchTokenGroupBy = jest.fn().mockImplementation(() => searchTokenQueryBuilder)
const mockSearchTokenSelect = jest.fn().mockImplementation(() => searchTokenQueryBuilder)
const searchTokenQueryBuilder: any = {
  select: mockSearchTokenSelect,
  where: mockSearchTokenWhere,
  groupBy: mockSearchTokenGroupBy,
  having: mockSearchTokenHaving,
  execute: mockSearchTokenExecute,
}
const mockSelectFrom = jest.fn((table: string) => {
  if (table === 'search_tokens') return searchTokenQueryBuilder
  throw new Error(`Unexpected selectFrom ${table}`)
})
const mockKysely = { selectFrom: mockSelectFrom }

const mockEm = {
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  getKysely: jest.fn(() => mockKysely),
}

const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    // `CC-137` — the route asks whether the actor holds `auth.roles.manage` before it touches a `roles`
    // array. The mock has to answer that question, or the "allowed" tests would be proving a refusal.
    if (token === 'rbacService') return { loadAcl: mockLoadAcl, userHasAllFeatures: mockUserHasAllFeatures }
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn((request: Request) => mockGetAuthFromRequest(request)),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

type MockCrudAction = {
  schema?: { parse: (input: unknown) => Record<string, unknown> }
  mapInput?: (args: {
    parsed: Record<string, unknown>
    raw: Record<string, unknown>
    ctx: { request: Request }
  }) => Promise<unknown> | unknown
  status?: number
}

async function mockRunCrudAction(action: MockCrudAction | undefined, request: Request): Promise<Response> {
  try {
    const raw = await request.json().catch(() => ({})) as Record<string, unknown>
    const parsed = action?.schema ? action.schema.parse(raw) : raw
    if (action?.mapInput) await action.mapInput({ parsed, raw, ctx: { request } })
    return new Response(JSON.stringify({ id: 'created-id' }), {
      status: action?.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    const httpError = err as { status?: unknown; body?: unknown; message?: string }
    if (typeof httpError.status === 'number') {
      return new Response(JSON.stringify(httpError.body ?? { error: httpError.message ?? 'Request failed' }), {
        status: httpError.status,
        headers: { 'content-type': 'application/json' },
      })
    }
    throw err
  }
}

jest.mock('@open-mercato/shared/lib/crud/factory', () => ({
  makeCrudRoute: jest.fn((opts: { metadata: unknown; actions?: { create?: MockCrudAction; update?: MockCrudAction } }) => ({
    metadata: opts.metadata,
    POST: jest.fn((request: Request) => mockRunCrudAction(opts.actions?.create, request)),
    PUT: jest.fn((request: Request) => mockRunCrudAction(opts.actions?.update, request)),
    DELETE: jest.fn(),
  })),
  logCrudAccess: jest.fn((args: unknown) => mockLogCrudAccess(args)),
}))

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findWithDecryption: jest.fn((...args: unknown[]) => mockFindWithDecryption(...args)),
  findOneWithDecryption: jest.fn((...args: unknown[]) => mockFindOneWithDecryption(...args)),
}))

jest.mock('@open-mercato/shared/lib/crud/custom-fields', () => ({
  loadCustomFieldValues: jest.fn((args: unknown) => mockLoadCustomFieldValues(args)),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  getSelectedTenantFromRequest: jest.fn((request: Request) => {
    const header = request.headers.get('cookie') || ''
    const match = header.match(/(?:^|;\s*)om_selected_tenant=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }),
  resolveOrganizationScopeForRequest: jest.fn((args: unknown) => mockResolveOrganizationScopeForRequest(args)),
}))

const tenantId = '123e4567-e89b-12d3-a456-426614174001'
const organizationId = '223e4567-e89b-12d3-a456-426614174001'
const secondaryOrganizationId = '223e4567-e89b-12d3-a456-426614174002'
const descendantOrganizationId = '223e4567-e89b-12d3-a456-426614174003'
const roleId = '323e4567-e89b-12d3-a456-426614174001'

function makeRequest(path = '/api/auth/users', headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, { method: 'GET', headers })
}

describe('GET /api/auth/users', () => {
  beforeEach(() => {
    mockGetAuthFromRequest.mockReset()
    mockLoadAcl.mockReset()
    mockUserHasAllFeatures.mockReset()
    mockUserHasAllFeatures.mockResolvedValue(true)
    mockEm.find.mockReset()
    mockEm.findOne.mockReset()
    mockEm.findAndCount.mockReset()
    mockEm.getKysely.mockClear()
    mockFindWithDecryption.mockReset()
    mockFindOneWithDecryption.mockReset()
    mockLoadCustomFieldValues.mockReset()
    mockLogCrudAccess.mockReset()
    mockResolveOrganizationScopeForRequest.mockReset()
    mockContainer.resolve.mockClear()
    mockSelectFrom.mockClear()
    mockSearchTokenSelect.mockClear()
    mockSearchTokenWhere.mockClear()
    mockSearchTokenGroupBy.mockClear()
    mockSearchTokenHaving.mockClear()
    mockSearchTokenExecute.mockReset()
    mockSearchTokenExecute.mockResolvedValue([])
    mockGetAuthFromRequest.mockResolvedValue({
      sub: 'user-1',
      tenantId,
      orgId: organizationId,
      isSuperAdmin: false,
      roles: ['admin'],
    })
    mockLoadAcl.mockResolvedValue({ isSuperAdmin: false })
    mockEm.find.mockResolvedValue([])
    mockEm.findOne.mockResolvedValue(null)
    mockEm.findAndCount.mockResolvedValue([[], 0])
    mockFindWithDecryption.mockResolvedValue([])
    mockFindOneWithDecryption.mockResolvedValue(null)
    mockLoadCustomFieldValues.mockResolvedValue({})
    mockLogCrudAccess.mockResolvedValue(undefined)
    mockResolveOrganizationScopeForRequest.mockResolvedValue({
      selectedId: null,
      filterIds: null,
      allowedIds: null,
      tenantId,
    })
  })

  test('returns an empty collection when unauthenticated', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce(null)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], total: 0, totalPages: 1 })
    expect(mockContainer.resolve).not.toHaveBeenCalled()
  })

  test('omits hasPassword from the bulk list response to avoid invite-state enumeration', async () => {
    const listedUserId = '423e4567-e89b-12d3-a456-426614174900'
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        {
          id: listedUserId,
          email: 'listed@example.com',
          name: 'Listed User',
          tenantId,
          organizationId,
          passwordHash: '$2a$10$hashedsecretvalue',
        },
      ],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).not.toHaveProperty('hasPassword')
  })

  test('exposes hasPassword only on the id-scoped per-user GET used by the edit view', async () => {
    const targetUserId = '423e4567-e89b-12d3-a456-426614174901'
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        {
          id: targetUserId,
          email: 'edit-target@example.com',
          name: 'Edit Target',
          tenantId,
          organizationId,
          passwordHash: '$2a$10$hashedsecretvalue',
        },
      ],
      1,
    ])

    const response = await GET(makeRequest(`/api/auth/users?id=${targetUserId}&page=1&pageSize=1`))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({ id: targetUserId, hasPassword: true })
  })

  test('returns an empty collection for non-superadmin users without tenant context', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: null,
      orgId: organizationId,
      roles: ['admin'],
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: false })

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], total: 0, totalPages: 1, isSuperAdmin: false })
    expect(mockEm.findAndCount).not.toHaveBeenCalled()
  })

  test('resolves search terms via search_tokens (email column is encrypted) and scopes tokens by tenant', async () => {
    const matchedUserId = '423e4567-e89b-12d3-a456-426614174001'
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: matchedUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        {
          id: matchedUserId,
          email: 'admin@acme.com',
          name: 'Admin User',
          tenantId,
          organizationId,
        },
      ],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?search=admin%40acme.com&page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSelectFrom).toHaveBeenCalledWith('search_tokens')
    const entityTypeCall = mockSearchTokenWhere.mock.calls.find(
      (call: unknown[]) => call[0] === 'entity_type' && call[1] === '=' && call[2] === 'auth:user',
    )
    expect(entityTypeCall).toBeDefined()
    const tenantScopeCall = mockSearchTokenWhere.mock.calls.find((call: unknown[]) => {
      const clause = call[0] as { toOperationNode?: () => { sqlFragments?: string[]; parameters?: Array<{ value?: unknown }> } } | undefined
      const node = clause && typeof clause === 'object' && typeof clause.toOperationNode === 'function'
        ? clause.toOperationNode()
        : null
      if (!node || !Array.isArray(node.sqlFragments)) return false
      const joined = node.sqlFragments.join('?')
      if (!joined.includes('tenant_id is not distinct from')) return false
      const params = Array.isArray(node.parameters) ? node.parameters : []
      return params.some((p) => p && typeof p === 'object' && 'value' in p && p.value === tenantId)
    })
    expect(tenantScopeCall).toBeDefined()
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { deletedAt: null },
      { tenantId },
      { id: { $in: [matchedUserId] } },
    ]))
    expect(body.total).toBe(1)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      email: 'admin@acme.com',
      name: 'Admin User',
      tenantId,
      organizationId,
    })
    expect(body.isSuperAdmin).toBe(false)
  })

  test('includes matching organization names in the unified search clause', async () => {
    mockEm.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: organizationId }])
      .mockResolvedValueOnce([])
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    const response = await GET(makeRequest('/api/auth/users?search=Acme&page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { deletedAt: null },
      { tenantId },
      { organizationId: { $in: [organizationId] } },
    ]))
    expect(body).toEqual({ items: [], total: 0, totalPages: 1, isSuperAdmin: false })
  })

  test('filters users by display name', async () => {
    const matchedUserId = '623e4567-e89b-12d3-a456-426614174001'
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: matchedUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        {
          id: matchedUserId,
          email: 'named@acme.com',
          name: 'Named User',
          tenantId,
          organizationId,
        },
      ],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?name=Named&page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSelectFrom).toHaveBeenCalledWith('search_tokens')
    const displayNameFieldCall = mockSearchTokenWhere.mock.calls.find((call: unknown[]) => {
      return call[0] === 'field' && call[1] === '=' && call[2] === 'name'
    })
    expect(displayNameFieldCall).toBeDefined()
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { deletedAt: null },
      { tenantId },
      {
        $or: [
          { name: { $ilike: '%Named%' } },
          { id: { $in: [matchedUserId] } },
        ],
      },
    ]))
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      id: matchedUserId,
      name: 'Named User',
    })
  })

  test('scopes display-name token lookups to the current tenant for non-superadmins', async () => {
    const matchedUserId = '623e4567-e89b-12d3-a456-426614174002'
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: matchedUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        {
          id: matchedUserId,
          email: 'named@acme.com',
          name: 'Named User',
          tenantId,
          organizationId,
        },
      ],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?name=Named&page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    const tenantScopeCall = mockSearchTokenWhere.mock.calls.find((call: unknown[]) => {
      const clause = call[0] as { toOperationNode?: () => { sqlFragments?: string[]; parameters?: Array<{ value?: unknown }> } } | undefined
      const node = clause && typeof clause === 'object' && typeof clause.toOperationNode === 'function'
        ? clause.toOperationNode()
        : null
      if (!node || !Array.isArray(node.sqlFragments)) return false
      const joined = node.sqlFragments.join('?')
      if (!joined.includes('tenant_id is not distinct from')) return false
      const params = Array.isArray(node.parameters) ? node.parameters : []
      return params.some((p) => p && typeof p === 'object' && 'value' in p && p.value === tenantId)
    })
    expect(tenantScopeCall).toBeDefined()
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      id: matchedUserId,
      name: 'Named User',
    })
  })

  test('superadmin display-name token lookups do not apply tenant scope', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: null,
      orgId: organizationId,
      roles: ['admin'],
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    const matchedUserId = '623e4567-e89b-12d3-a456-426614174003'
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: matchedUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        {
          id: matchedUserId,
          email: 'named@cross-tenant.com',
          name: 'Named User',
          tenantId: null,
          organizationId: null,
        },
      ],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?name=Named&page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    const tenantScopeCalled = mockSearchTokenWhere.mock.calls.some((call: unknown[]) => {
      const clause = call[0] as { toOperationNode?: () => { sqlFragments?: string[] } } | undefined
      const node = clause && typeof clause === 'object' && typeof clause.toOperationNode === 'function'
        ? clause.toOperationNode()
        : null
      if (!node || !Array.isArray(node.sqlFragments)) return false
      return node.sqlFragments.join('?').includes('tenant_id is not distinct from')
    })
    expect(tenantScopeCalled).toBe(false)
    expect(body.isSuperAdmin).toBe(true)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      id: matchedUserId,
      name: 'Named User',
    })
  })

  test('includes users whose role names match the unified search term', async () => {
    const matchedUserId = '523e4567-e89b-12d3-a456-426614174055'
    mockEm.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: roleId, name: 'admin', tenantId }])
      .mockResolvedValueOnce([{ user: { id: matchedUserId }, role: { id: roleId } }])
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    const response = await GET(makeRequest('/api/auth/users?search=admin&page=1&pageSize=50'))
    const body = await response.json()

    expect(response.status).toBe(200)
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { deletedAt: null },
      { tenantId },
      { id: { $in: [matchedUserId] } },
    ]))
    expect(body).toEqual({ items: [], total: 0, totalPages: 1, isSuperAdmin: false })
  })

  test('returns empty result when search_tokens yield no matches', async () => {
    mockSearchTokenExecute.mockResolvedValueOnce([])

    const response = await GET(makeRequest('/api/auth/users?search=nobody%40example.com'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], total: 0, totalPages: 1, isSuperAdmin: false })
    expect(mockEm.findAndCount).not.toHaveBeenCalled()
  })

  test('superadmin search does not apply tenant scope on search_tokens', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: null,
      orgId: organizationId,
      roles: ['admin'],
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    const matchedUserId = '423e4567-e89b-12d3-a456-426614174002'
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: matchedUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [{ id: matchedUserId, email: 'cross-tenant@example.com', name: 'Cross Tenant', tenantId: null, organizationId: null }],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?search=cross'))
    const body = await response.json()

    expect(response.status).toBe(200)
    const tenantScopeCalled = mockSearchTokenWhere.mock.calls.some((call: unknown[]) => {
      const clause = call[0] as { toOperationNode?: () => { sqlFragments?: string[] } } | undefined
      const node = clause && typeof clause === 'object' && typeof clause.toOperationNode === 'function'
        ? clause.toOperationNode()
        : null
      if (!node || !Array.isArray(node.sqlFragments)) return false
      return node.sqlFragments.join('?').includes('tenant_id is not distinct from')
    })
    expect(tenantScopeCalled).toBe(false)
    expect(body.isSuperAdmin).toBe(true)
    expect(body.items).toHaveLength(1)
  })

  test('superadmin selected tenant scopes the users list by tenant', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: null,
      orgId: null,
      roles: ['superadmin'],
      isSuperAdmin: true,
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    mockResolveOrganizationScopeForRequest.mockResolvedValueOnce({
      selectedId: null,
      filterIds: null,
      allowedIds: null,
      tenantId,
    })
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    const response = await GET(makeRequest('/api/auth/users?page=1&pageSize=10', {
      cookie: `om_selected_tenant=${encodeURIComponent(tenantId)}`,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockResolveOrganizationScopeForRequest).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
    }))
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { deletedAt: null },
      { tenantId },
    ]))
    expect(where.$and).not.toEqual(expect.arrayContaining([
      { organizationId: expect.anything() },
    ]))
    expect(body.isSuperAdmin).toBe(true)
  })

  test('superadmin selected organization scopes the users list by organization descendants', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: tenantId,
      orgId: secondaryOrganizationId,
      roles: ['superadmin'],
      isSuperAdmin: true,
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    mockResolveOrganizationScopeForRequest.mockResolvedValueOnce({
      selectedId: secondaryOrganizationId,
      filterIds: [secondaryOrganizationId, descendantOrganizationId],
      allowedIds: null,
      tenantId,
    })
    const selectedOrgUserId = '423e4567-e89b-12d3-a456-426614174004'
    mockEm.findAndCount.mockResolvedValueOnce([
      [{ id: selectedOrgUserId, email: 'selected-org@example.com', tenantId, organizationId: secondaryOrganizationId }],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?page=1&pageSize=10', {
      cookie: [
        `om_selected_tenant=${encodeURIComponent(tenantId)}`,
        `om_selected_org=${encodeURIComponent(secondaryOrganizationId)}`,
      ].join('; '),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { tenantId },
      { organizationId: { $in: [secondaryOrganizationId, descendantOrganizationId] } },
    ]))
    expect(mockLogCrudAccess).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
      organizationId: secondaryOrganizationId,
    }))
    expect(mockFindWithDecryption).toHaveBeenCalledWith(
      mockEm,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        tenantId,
        organizationId: secondaryOrganizationId,
      }),
    )
    expect(body.isSuperAdmin).toBe(true)
  })

  test('superadmin all-organizations selection scopes to the selected tenant only', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: tenantId,
      orgId: organizationId,
      roles: ['superadmin'],
      isSuperAdmin: true,
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    mockResolveOrganizationScopeForRequest.mockResolvedValueOnce({
      selectedId: null,
      filterIds: null,
      allowedIds: null,
      tenantId,
    })
    const allOrgUserId = '423e4567-e89b-12d3-a456-426614174005'
    mockEm.findAndCount.mockResolvedValueOnce([
      [{ id: allOrgUserId, email: 'all-orgs@example.com', tenantId, organizationId: secondaryOrganizationId }],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?page=1&pageSize=10', {
      cookie: `om_selected_tenant=${encodeURIComponent(tenantId)}; om_selected_org=__all__`,
    }))

    expect(response.status).toBe(200)
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { tenantId },
    ]))
    expect(where.$and).not.toEqual(expect.arrayContaining([
      { organizationId: { $in: expect.any(Array) } },
    ]))
    expect(mockFindWithDecryption).toHaveBeenCalledWith(
      mockEm,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        tenantId,
        organizationId: null,
      }),
    )
    expect(mockLogCrudAccess).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
      organizationId: null,
    }))
  })

  test('explicit organization filter narrows inside selected superadmin tenant scope', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: tenantId,
      orgId: null,
      roles: ['superadmin'],
      isSuperAdmin: true,
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    mockResolveOrganizationScopeForRequest.mockResolvedValueOnce({
      selectedId: null,
      filterIds: null,
      allowedIds: null,
      tenantId,
    })
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    const response = await GET(makeRequest(
      `/api/auth/users?organizationId=${secondaryOrganizationId}&page=1&pageSize=10`,
      { cookie: `om_selected_tenant=${encodeURIComponent(tenantId)}` },
    ))

    expect(response.status).toBe(200)
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { tenantId },
      { organizationId: secondaryOrganizationId },
    ]))
  })

  test('superadmin selected tenant scopes search tokens by tenant', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: tenantId,
      orgId: null,
      roles: ['superadmin'],
      isSuperAdmin: true,
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    mockResolveOrganizationScopeForRequest.mockResolvedValueOnce({
      selectedId: null,
      filterIds: null,
      allowedIds: null,
      tenantId,
    })
    const matchedUserId = '423e4567-e89b-12d3-a456-426614174003'
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: matchedUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [{ id: matchedUserId, email: 'selected-tenant@example.com', name: 'Selected Tenant', tenantId, organizationId }],
      1,
    ])

    const response = await GET(makeRequest('/api/auth/users?search=selected', {
      cookie: `om_selected_tenant=${encodeURIComponent(tenantId)}`,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    const tenantScopeCall = mockSearchTokenWhere.mock.calls.find((call: unknown[]) => {
      const clause = call[0] as { toOperationNode?: () => { sqlFragments?: string[]; parameters?: Array<{ value?: unknown }> } } | undefined
      const node = clause && typeof clause === 'object' && typeof clause.toOperationNode === 'function'
        ? clause.toOperationNode()
        : null
      if (!node || !Array.isArray(node.sqlFragments)) return false
      const joined = node.sqlFragments.join('?')
      if (!joined.includes('tenant_id is not distinct from')) return false
      const params = Array.isArray(node.parameters) ? node.parameters : []
      return params.some((p) => p && typeof p === 'object' && 'value' in p && p.value === tenantId)
    })
    expect(tenantScopeCall).toBeDefined()
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { tenantId },
      { id: { $in: [matchedUserId] } },
    ]))
    expect(body.items).toHaveLength(1)
  })

  test('intersects search matches with an existing role-based id filter', async () => {
    const firstUserId = '523e4567-e89b-12d3-a456-426614174101'
    const secondUserId = '523e4567-e89b-12d3-a456-426614174102'
    mockEm.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { user: { id: firstUserId }, role: { id: roleId } },
        { user: { id: secondUserId }, role: { id: roleId } },
      ])
    mockSearchTokenExecute.mockResolvedValueOnce([{ entity_id: secondUserId }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [{ id: secondUserId, email: 'match@example.com', tenantId, organizationId }],
      1,
    ])

    const response = await GET(makeRequest(`/api/auth/users?roleId=${roleId}&search=match`))
    const body = await response.json()

    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { id: { $in: [firstUserId, secondUserId] } },
      { id: { $in: [secondUserId] } },
    ]))
    expect(body.total).toBe(1)
    expect(body.items[0].id).toBe(secondUserId)
  })

  test('short-circuits with empty result when role filter has no matching users', async () => {
    mockEm.find.mockResolvedValueOnce([])

    const response = await GET(makeRequest(`/api/auth/users?roleId=${roleId}`))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], total: 0, totalPages: 1 })
    expect(mockEm.findAndCount).not.toHaveBeenCalled()
  })

  test('applies roleId filter for a single role when users are found', async () => {
    const matchedUserId = '523e4567-e89b-12d3-a456-426614174001'
    mockEm.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ user: { id: matchedUserId }, role: { id: roleId } }])
    mockEm.findAndCount.mockResolvedValueOnce([
      [{ id: matchedUserId, email: 'role-filtered@example.com', tenantId, organizationId }],
      1,
    ])

    const response = await GET(makeRequest(`/api/auth/users?roleId=${roleId}`))
    const body = await response.json()

    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { id: { $in: [matchedUserId] } },
    ]))
    expect(body.total).toBe(1)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].email).toBe('role-filtered@example.com')
  })

  test('supports multiple roleId params and narrows query to union of matched user ids', async () => {
    const secondRoleId = '323e4567-e89b-12d3-a456-426614174002'
    const firstUserId = '523e4567-e89b-12d3-a456-426614174011'
    const secondUserId = '523e4567-e89b-12d3-a456-426614174012'
    mockEm.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { user: { id: firstUserId }, role: { id: roleId } },
        { user: secondUserId, role: { id: secondRoleId } },
        { user: { id: firstUserId }, role: { id: secondRoleId } },
      ])
    mockEm.findAndCount.mockResolvedValueOnce([
      [
        { id: firstUserId, email: 'first@example.com', tenantId, organizationId },
        { id: secondUserId, email: 'second@example.com', tenantId, organizationId },
      ],
      2,
    ])

    const response = await GET(
      makeRequest(`/api/auth/users?roleId=${roleId}&roleId=${secondRoleId}&roleId=${secondRoleId}`),
    )
    const body = await response.json()

    const roleFilter = mockEm.find.mock.calls[2][1] as { role?: { $in?: string[] } }
    expect(roleFilter.role?.$in).toEqual(expect.arrayContaining([roleId, secondRoleId]))
    expect(roleFilter.role?.$in).toHaveLength(2)

    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    const idClause = where.$and.find((clause) => {
      const value = (clause as { id?: { $in?: string[] } }).id
      return Array.isArray(value?.$in)
    }) as { id: { $in: string[] } }
    expect(idClause.id.$in).toEqual(expect.arrayContaining([firstUserId, secondUserId]))
    expect(idClause.id.$in).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(body.items).toHaveLength(2)
  })

  test('allows superadmin to query by organization without forcing tenant filter', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId: null,
      orgId: organizationId,
      roles: ['admin'],
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: true })
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    const response = await GET(
      makeRequest(`/api/auth/users?organizationId=${secondaryOrganizationId}&page=1&pageSize=10`),
    )
    const body = await response.json()

    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { organizationId: secondaryOrganizationId },
    ]))
    expect(where.$and).not.toEqual(expect.arrayContaining([
      { tenantId },
    ]))
    expect(body.isSuperAdmin).toBe(true)
  })

  test('scopeToActiveOrganization=1 narrows non-superadmin results to the caller active organization', async () => {
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    const response = await GET(makeRequest(
      '/api/auth/users?page=1&pageSize=100&scopeToActiveOrganization=1',
    ))
    const body = await response.json()

    expect(response.status).toBe(200)
    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { tenantId },
      { organizationId },
    ]))
    expect(body.isSuperAdmin).toBe(false)
  })

  test('omits the active-organization filter when scopeToActiveOrganization is not requested', async () => {
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    await GET(makeRequest('/api/auth/users?page=1&pageSize=100'))

    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { tenantId },
    ]))
    expect(where.$and).not.toEqual(expect.arrayContaining([
      { organizationId: expect.anything() },
    ]))
  })

  test('scopeToActiveOrganization=1 filters to organization-less users when the caller has no active organization', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce({
      sub: 'user-1',
      tenantId,
      orgId: null,
      isSuperAdmin: false,
      roles: ['admin'],
    })
    mockLoadAcl.mockResolvedValueOnce({ isSuperAdmin: false })
    mockEm.findAndCount.mockResolvedValueOnce([[], 0])

    await GET(makeRequest('/api/auth/users?page=1&pageSize=100&scopeToActiveOrganization=1'))

    const where = mockEm.findAndCount.mock.calls[0][1] as { $and: Array<Record<string, unknown>> }
    expect(where.$and).toEqual(expect.arrayContaining([
      { organizationId: null },
    ]))
  })

  test('allows assigning a role whose wildcard ACL is covered by actor wildcard ACL', async () => {
    const employeeRoleId = '323e4567-e89b-12d3-a456-426614174776'
    mockLoadAcl.mockResolvedValueOnce({
      isSuperAdmin: false,
      features: ['auth.users.create', 'example.*'],
      organizations: null,
    })
    mockFindOneWithDecryption.mockImplementation(async (_em: unknown, entity: unknown) => {
      if (entity === Organization) return { id: organizationId, tenant: { id: tenantId } }
      if (entity === Role) return { id: employeeRoleId, name: 'employee', tenantId }
      if (entity === RoleAcl) {
        return {
          isSuperAdmin: false,
          featuresJson: ['example.widgets.*'],
          organizationsJson: null,
          tenantId,
        }
      }
      return null
    })

    const response = await POST(new Request('http://localhost/api/auth/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'employee-create@example.com',
        password: 'StrongSecret123!',
        organizationId,
        roles: [employeeRoleId],
      }),
    }))

    expect(response.status).toBe(201)
  })

  test('rejects limited users assigning a role whose ACL grants features outside the actor ACL', async () => {
    const privilegedRoleId = '323e4567-e89b-12d3-a456-426614174777'
    mockLoadAcl.mockResolvedValueOnce({
      isSuperAdmin: false,
      features: ['auth.users.create'],
      organizations: null,
    })
    mockFindOneWithDecryption.mockImplementation(async (_em: unknown, entity: unknown) => {
      if (entity === Organization) return { id: organizationId, tenant: { id: tenantId } }
      if (entity === Role) return { id: privilegedRoleId, name: 'Tenant Admin', tenantId }
      if (entity === RoleAcl) {
        return {
          isSuperAdmin: false,
          featuresJson: ['auth.*'],
          organizationsJson: null,
          tenantId,
        }
      }
      return null
    })

    const response = await POST(new Request('http://localhost/api/auth/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'limited-create@example.com',
        password: 'StrongSecret123!',
        organizationId,
        roles: [privilegedRoleId],
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain('Cannot grant feature')
  })

  test('rejects limited users reassigning an existing user to a privileged role on update', async () => {
    const userId = '523e4567-e89b-12d3-a456-426614174501'
    const privilegedRoleId = '323e4567-e89b-12d3-a456-426614174778'
    mockLoadAcl.mockResolvedValueOnce({
      isSuperAdmin: false,
      features: ['auth.users.edit'],
      organizations: null,
    })
    mockFindOneWithDecryption.mockImplementation(async (_em: unknown, entity: unknown) => {
      if (entity === User) return { id: userId, tenantId, organizationId }
      if (entity === Role) return { id: privilegedRoleId, name: 'Tenant Admin', tenantId }
      if (entity === RoleAcl) {
        return {
          isSuperAdmin: false,
          featuresJson: ['api_keys.create'],
          organizationsJson: null,
          tenantId,
        }
      }
      return null
    })

    const response = await PUT(new Request('http://localhost/api/auth/users', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        roles: [privilegedRoleId],
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain('Cannot grant feature api_keys.create')
  })

  test('rejects non-super admin actors editing a super admin target user', async () => {
    const superAdminUserId = '523e4567-e89b-12d3-a456-426614174777'
    mockLoadAcl.mockResolvedValueOnce({
      isSuperAdmin: false,
      features: ['auth.users.edit'],
      organizations: null,
    })
    mockEm.findOne.mockImplementation(async (entity: unknown) => {
      if (entity === UserAcl) return { isSuperAdmin: true }
      return null
    })

    const response = await PUT(new Request('http://localhost/api/auth/users', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: superAdminUserId,
        name: 'Renamed Super Admin',
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain('super administrator')
  })

  test('rejects non-super admin actors deleting a super admin target user', async () => {
    const superAdminUserId = '523e4567-e89b-12d3-a456-426614174888'
    mockLoadAcl.mockResolvedValueOnce({
      isSuperAdmin: false,
      features: ['auth.users.delete'],
      organizations: null,
    })
    mockEm.findOne.mockImplementation(async (entity: unknown) => {
      if (entity === UserAcl) return { isSuperAdmin: true }
      return null
    })

    const response = await DELETE(new Request(`http://localhost/api/auth/users?id=${superAdminUserId}`, {
      method: 'DELETE',
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain('super administrator')
  })

  test('allows super admin actors to edit a super admin target user', async () => {
    const superAdminUserId = '523e4567-e89b-12d3-a456-426614174999'
    mockLoadAcl.mockResolvedValue({
      isSuperAdmin: true,
      features: ['*'],
      organizations: null,
    })

    const response = await PUT(new Request('http://localhost/api/auth/users', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: superAdminUserId,
        name: 'Renamed by super admin',
      }),
    }))

    expect(response.status).toBe(200)
  })

  /**
   * `CC-137` — one capability means one door.
   *
   * The users route is a third way onto the authority system: its `roles` array was checked **only** as a
   * subset of the actor's own ACL, with an early return for a superadmin (`grantChecks.ts:63`). So a machine
   * holding `auth.users.edit` could pass on any role it already held, and one holding it *and* a wildcard
   * role could grant any role to anybody.
   *
   * **The floor already named `auth.roles.manage`** (live since `CC-125`) and this route never asked a
   * question the floor answers — `CC-101`'s class, one layer down. These tests are about the asking, and
   * the last one is about the belt-and-braces half: the two user capabilities are now on the floor, so the
   * machine is refused at the route's own gate before the handler runs.
   */
  describe('CC-137 — assigning roles requires auth.roles.manage', () => {
    const machineKeyId = '623e4567-e89b-12d3-a456-426614174001'
    const roleToGrant = '323e4567-e89b-12d3-a456-426614174779'

    function createWithRoles(roles: string[]) {
      return POST(new Request('http://localhost/api/auth/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'grant-attempt@example.com',
          password: 'StrongSecret123!',
          organizationId,
          roles,
        }),
      }))
    }

    test('★ refuses without the capability — and refuses BEFORE the role is looked up', async () => {
      mockUserHasAllFeatures.mockResolvedValueOnce(false)

      const response = await createWithRoles([roleToGrant])
      const body = await response.json()

      expect(response.status).toBe(403)
      // The capability is named, so an operator reads *what to grant* rather than guessing.
      expect(body.error).toContain('auth.roles.manage')
      expect(body.requiredFeatures).toEqual(['auth.roles.manage'])

      // And the refusal happened before the grant check: a refusal that has already resolved the role is a
      // refusal in the wrong place, and it would still be doing work on behalf of an actor who may not ask.
      const roleLookups = mockFindOneWithDecryption.mock.calls.filter((call) => call[1] === Role)
      expect(roleLookups).toHaveLength(0)
    })

    test('asks for the capability the floor names, not a near-miss', async () => {
      await createWithRoles([roleToGrant])

      // Asserted on the arguments rather than inferred from a status: a gate asking for a misspelt
      // capability refuses everybody and looks exactly like a gate that works.
      expect(mockUserHasAllFeatures).toHaveBeenCalledWith(
        'user-1',
        ['auth.roles.manage'],
        { tenantId, organizationId },
      )
    })

    test('★ a machine holding auth.users.edit cannot assign a role', async () => {
      // The answer comes from the REAL floor, not from a fixture that was told to say no: `auth.roles.manage`
      // is on it, and `floorRefusalFor` is what `userHasAllFeatures` ends up consulting.
      mockGetAuthFromRequest.mockResolvedValueOnce({
        sub: `api_key:${machineKeyId}`,
        tenantId,
        orgId: organizationId,
        isSuperAdmin: false,
        roles: ['admin'],
      })
      mockUserHasAllFeatures.mockImplementationOnce(async (_actor, required: string[]) =>
        required.every((capability) => floorRefusalFor('service', capability) === null))

      const response = await createWithRoles([roleToGrant])
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.requiredFeatures).toEqual(['auth.roles.manage'])
      // The belt-and-braces half, asserted in the same test because the two halves are one defect:
      // the route's own gate is floored too, so this request never reaches the handler at all.
      expect(floorRefusalFor('service', 'auth.users.create')).toMatch(/machine floor/)
    })

    test('fails CLOSED when the capability cannot be answered', async () => {
      // A service object with no `userHasAllFeatures` — an older wiring, a partial container, a mock. The
      // one outcome that must be impossible is a missing check reading as permission.
      mockContainer.resolve
        .mockImplementationOnce(() => mockEm)
        .mockImplementationOnce(() => ({ loadAcl: mockLoadAcl }))

      const response = await createWithRoles([roleToGrant])

      expect(response.status).toBe(403)
    })

    test('an empty roles array is not an assignment — no capability needed', async () => {
    // Not `mockResolvedValueOnce`: if the route DID ask, this answer must be the one it gets, so the 201
    // below cannot be produced by a stale queue entry.
    mockUserHasAllFeatures.mockResolvedValue(false)

    const response = await createWithRoles([])

      // Nothing is handed to anybody, and the grant check already returns early for it. Requiring the
      // capability here would refuse a request that grants nothing — narrowing is not widening.
      expect(response.status).toBe(201)
      expect(mockUserHasAllFeatures).not.toHaveBeenCalled()
    })
  })
})
