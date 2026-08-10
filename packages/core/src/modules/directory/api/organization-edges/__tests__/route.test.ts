/**
 * The surface that makes R6's authority graph usable by a person.
 *
 * The tests that matter most are the refusals: a self-edge, an edge pointing
 * back up the tree, and an organization from another tenant. Each of those would
 * produce a stored row that either does nothing or contradicts the structure
 * every scoped query relies on.
 */

const TENANT = '88b6bc8a-a655-4edd-b1b5-d186606efdb2'
const OTHER_TENANT = '99999999-9999-4999-8999-999999999999'
const GROUP = '11111111-1111-4111-8111-111111111111'
const SUBSIDIARY = '22222222-2222-4222-8222-222222222222'
const TEAM = '33333333-3333-4333-8333-333333333333'
const EDGE = '44444444-4444-4444-8444-444444444444'

const mockAuth = jest.fn()
jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => mockAuth(...args),
}))

const persisted: Array<Record<string, unknown>> = []
let organizations: Array<{ id: string; tenant: string; ancestorIds: string[] }> = []
let edges: Array<Record<string, unknown>> = []

const mockEm = {
  find: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
    const name = (entity as { name?: string })?.name
    if (name === 'Organization') {
      const ids = (where.id as { $in: string[] })?.$in ?? []
      return organizations.filter((org) => ids.includes(org.id) && org.tenant === where.tenant)
    }
    return edges
  }),
  findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
    const name = (entity as { name?: string })?.name
    if (name === 'Organization') {
      return organizations.find((org) => org.id === where.id && org.tenant === where.tenant) ?? null
    }
    return edges.find((edge) => edge.id === where.id && edge.tenantId === where.tenantId) ?? null
  }),
  create: (_entity: unknown, data: Record<string, unknown>) => ({ id: EDGE, ...data }),
  persist: (entity: Record<string, unknown>) => {
    persisted.push(entity)
    return { flush: async () => undefined }
  },
  flush: async () => undefined,
  transactional: async (cb: (trx: unknown) => unknown) => cb(mockEm),
}

const mockInvalidateTenant = jest.fn(async () => {})

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => ({
    resolve: (token: string) => {
      if (token === 'em') return mockEm
      if (token === 'authorityGraphService') return { invalidateTenant: mockInvalidateTenant }
      return null
    },
  })),
}))

import { GET, POST, PATCH, DELETE } from '../route'

const request = (url: string, init?: RequestInit) => new Request(url, init)
const post = (body: unknown) =>
  request('http://localhost/api/directory/organization-edges', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  jest.clearAllMocks()
  persisted.length = 0
  edges = []
  organizations = [
    { id: GROUP, tenant: TENANT, ancestorIds: [] },
    { id: SUBSIDIARY, tenant: TENANT, ancestorIds: [GROUP] },
    { id: TEAM, tenant: TENANT, ancestorIds: [GROUP, SUBSIDIARY] },
  ]
  mockAuth.mockResolvedValue({ sub: 'user-1', tenantId: TENANT, orgId: GROUP })
})

describe('creating an edge', () => {
  it('stores a well-formed edge', async () => {
    const response = await POST(post({
      parentId: GROUP,
      childId: SUBSIDIARY,
      relationshipType: 'advises',
      inheritanceMode: 'reference_only',
      authorityCeiling: 'A2',
    }))

    expect(response.status).toBe(201)
    expect(persisted[0]).toMatchObject({
      tenantId: TENANT,
      parentId: GROUP,
      childId: SUBSIDIARY,
      relationshipType: 'advises',
      authorityCeiling: 'A2',
    })
  })

  it('applies the permissive defaults when only the pair is given', async () => {
    // Defaults must impose nothing: an edge somebody created without thinking
    // about ceilings should not silently restrict anyone.
    await POST(post({ parentId: GROUP, childId: SUBSIDIARY }))

    expect(persisted[0]).toMatchObject({
      relationshipType: 'owns',
      inheritanceMode: 'strict',
      authorityCeiling: 'A5',
      moduleGrants: null,
    })
  })

  it('refuses an edge from an organization to itself', async () => {
    const response = await POST(post({ parentId: GROUP, childId: GROUP }))

    expect(response.status).toBe(422)
    expect((await response.json()).error).toMatch(/cannot have an edge to itself/)
    expect(persisted).toHaveLength(0)
  })

  it('refuses an edge that points back up the tree', async () => {
    // GROUP is an ancestor of TEAM, so TEAM → GROUP inverts the structure that
    // scopes every query in the platform.
    const response = await POST(post({ parentId: TEAM, childId: GROUP }))

    expect(response.status).toBe(422)
    expect((await response.json()).error).toMatch(/back up the organization tree/)
    expect(persisted).toHaveLength(0)
  })

  it('refuses an organization from another tenant', async () => {
    organizations.push({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', tenant: OTHER_TENANT, ancestorIds: [] })

    const response = await POST(post({ parentId: GROUP, childId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }))

    expect(response.status).toBe(404)
    expect(persisted).toHaveLength(0)
  })

  it('rejects a ceiling outside the defined gates', async () => {
    const response = await POST(post({ parentId: GROUP, childId: SUBSIDIARY, authorityCeiling: 'A9' }))

    expect(response.status).toBe(422)
  })

  it('keeps an empty allowlist distinct from an absent one', async () => {
    // `[]` passes nothing and `null` restricts nothing. Collapsing them would
    // make the safest configuration unreachable through the API.
    await POST(post({ parentId: GROUP, childId: SUBSIDIARY, moduleGrants: [] }))

    expect(persisted[0].moduleGrants).toEqual([])
  })
})

describe('reading, changing and removing', () => {
  beforeEach(() => {
    edges = [{
      id: EDGE,
      tenantId: TENANT,
      parentId: GROUP,
      childId: SUBSIDIARY,
      relationshipType: 'owns',
      inheritanceMode: 'strict',
      authorityCeiling: 'A5',
      moduleGrants: null,
      note: null,
      deletedAt: null,
      updatedAt: new Date('2026-08-10T00:00:00Z'),
    }]
  })

  it('lists the edges of a tenant', async () => {
    const response = await GET(request('http://localhost/api/directory/organization-edges'))

    expect((await response.json()).items).toHaveLength(1)
  })

  it('lowers a ceiling', async () => {
    const response = await PATCH(request('http://localhost/api/directory/organization-edges', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: EDGE, authorityCeiling: 'A1' }),
    }))

    expect(response.status).toBe(200)
    expect(edges[0].authorityCeiling).toBe('A1')
  })

  it('soft-deletes rather than erasing, because an authority change is worth looking back at', async () => {
    const response = await DELETE(request(`http://localhost/api/directory/organization-edges?id=${EDGE}`, { method: 'DELETE' }))

    expect(response.status).toBe(200)
    expect(edges[0].deletedAt).toBeInstanceOf(Date)
  })

  it('returns 404 for an edge in another tenant', async () => {
    edges[0].tenantId = OTHER_TENANT

    const response = await PATCH(request('http://localhost/api/directory/organization-edges', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: EDGE, authorityCeiling: 'A0' }),
    }))

    expect(response.status).toBe(404)
  })
})

/**
 * Enforcement reads the graph ceiling through a cache, so an edge change that
 * does not drop that cache is an authority change the platform keeps ignoring
 * for as long as the TTL lasts. Lowering a ceiling is precisely the act someone
 * performs when they need it to take effect now.
 */
describe('an edge change drops the cached ceilings of its tenant', () => {
  beforeEach(() => {
    mockInvalidateTenant.mockClear()
    edges = [{
      id: EDGE,
      tenantId: TENANT,
      parentId: GROUP,
      childId: SUBSIDIARY,
      relationshipType: 'owns',
      inheritanceMode: 'strict',
      authorityCeiling: 'A5',
      moduleGrants: null,
      note: null,
      deletedAt: null,
      updatedAt: new Date('2026-08-10T00:00:00Z'),
    }]
  })

  it('after a ceiling is lowered', async () => {
    await PATCH(request('http://localhost/api/directory/organization-edges', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: EDGE, authorityCeiling: 'A1' }),
    }))

    expect(mockInvalidateTenant).toHaveBeenCalledWith(TENANT)
  })

  it('after an edge is removed', async () => {
    await DELETE(request(`http://localhost/api/directory/organization-edges?id=${EDGE}`, { method: 'DELETE' }))

    expect(mockInvalidateTenant).toHaveBeenCalledWith(TENANT)
  })

  it('not when the write was refused, because nothing changed', async () => {
    edges[0].tenantId = OTHER_TENANT

    await PATCH(request('http://localhost/api/directory/organization-edges', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: EDGE, authorityCeiling: 'A0' }),
    }))

    expect(mockInvalidateTenant).not.toHaveBeenCalled()
  })
})

describe('authentication', () => {
  it('refuses a caller with no tenant', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET(request('http://localhost/api/directory/organization-edges'))

    expect(response.status).toBe(401)
  })
})
