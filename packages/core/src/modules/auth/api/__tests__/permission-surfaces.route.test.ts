/** @jest-environment node */

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(),
}))

const mockReadTenantSurfaces = jest.fn()

jest.mock('@open-mercato/core/modules/auth/services/permissionSurfacesService', () => ({
  readTenantSurfaces: mockReadTenantSurfaces,
}))

const mockResolve = jest.fn()

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => mockResolve(key),
  }),
}))

import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'

const mockedAuth = getAuthFromRequest as jest.Mock

type RouteModule = typeof import('@open-mercato/core/modules/auth/api/permission-surfaces/route')

async function loadRoute(): Promise<RouteModule> {
  return import('@open-mercato/core/modules/auth/api/permission-surfaces/route')
}

function getRequest(): Request {
  return new Request('http://localhost/api/auth/permission-surfaces', { method: 'GET' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedAuth.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' })
  mockResolve.mockReturnValue({ marker: 'em' })
  mockReadTenantSurfaces.mockResolvedValue({ surfaces: [], recorded: 0, error: null })
})

describe('permission-surfaces route (P3b / M3e — the read half)', () => {
  it('requires auth and auth.acl.manage', async () => {
    const mod = await loadRoute()
    const meta = mod.metadata as Record<string, { requireAuth?: boolean; requireFeatures?: string[] }>
    expect(meta.GET.requireAuth).toBe(true)
    expect(meta.GET.requireFeatures).toEqual(['auth.acl.manage'])
  })

  it('401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null)
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    expect(res.status).toBe(401)
    expect(mockReadTenantSurfaces).not.toHaveBeenCalled()
  })

  it('401 when the caller has no tenant — a surface list is per-tenant', async () => {
    mockedAuth.mockResolvedValueOnce({ sub: 'user-1', tenantId: null })
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    expect(res.status).toBe(401)
    expect(mockReadTenantSurfaces).not.toHaveBeenCalled()
  })

  it('reads the tenant’s surfaces back and returns them', async () => {
    mockReadTenantSurfaces.mockResolvedValueOnce({
      surfaces: [
        { id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' },
        { id: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' },
      ],
      recorded: 1,
      error: null,
    })
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.recorded).toBe(1)
    expect(body.error).toBeNull()
    expect(body.items.map((s: { id: string }) => s.id)).toEqual(['auth.users', 'customers:widget_panel'])
    // The tenant is passed through from auth, never defaulted.
    expect(mockReadTenantSurfaces).toHaveBeenCalledWith({ marker: 'em' }, 'tenant-1')
  })

  it('a read failure is reported, not thrown — the route still answers 200', async () => {
    mockReadTenantSurfaces.mockResolvedValueOnce({
      surfaces: [{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }],
      recorded: 0,
      error: 'connection reset',
    })
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.error).toBe('connection reset')
    expect(body.items).toHaveLength(1)
  })

  it('survives a missing EntityManager — declared surfaces only, with a reported reason', async () => {
    mockResolve.mockReturnValueOnce(null)
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toEqual([])
    expect(body.error).toBe('no_entity_manager')
    expect(mockReadTenantSurfaces).not.toHaveBeenCalled()
  })

  it('reports a container failure honestly (container_error: …), not as a missing resolver', async () => {
    mockResolve.mockImplementationOnce(() => {
      throw new Error('ECONNREFUSED 127.0.0.1:5432')
    })
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.error).toContain('container_error')
    expect(body.error).toContain('ECONNREFUSED')
    expect(mockReadTenantSurfaces).not.toHaveBeenCalled()
  })
})
