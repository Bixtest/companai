/** @jest-environment node */

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(),
}))

const mockSetValue = jest.fn()
const mockGetValue = jest.fn()

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'moduleConfigService') return { getValue: mockGetValue, setValue: mockSetValue }
      return null
    },
  }),
}))

jest.mock('@open-mercato/core/modules/auth/api/mutation-guard', () => ({
  beginAuthMutationGuard: jest.fn(),
}))

import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { beginAuthMutationGuard } from '@open-mercato/core/modules/auth/api/mutation-guard'
import { DEFAULT_STRUCTURAL_SETTINGS } from '@open-mercato/shared/lib/permissions/structural-settings'

const mockedAuth = getAuthFromRequest as jest.Mock
const mockedGuard = beginAuthMutationGuard as jest.Mock

type RouteModule = typeof import('@open-mercato/core/modules/auth/api/structural-permissions/route')

async function loadRoute(): Promise<RouteModule> {
  return import('@open-mercato/core/modules/auth/api/structural-permissions/route')
}

function putRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/structural-permissions', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getRequest(): Request {
  return new Request('http://localhost/api/auth/structural-permissions', { method: 'GET' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedAuth.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' })
  mockedGuard.mockResolvedValue({ blockedResponse: null, runAfterSuccess: jest.fn(async () => undefined) })
  mockGetValue.mockResolvedValue(null)
  mockSetValue.mockResolvedValue(undefined)
})

describe('structural-permissions route gating (SD-5)', () => {
  it('GET and PUT both require auth and auth.acl.manage', async () => {
    const mod = await loadRoute()
    const meta = mod.metadata as Record<string, { requireAuth?: boolean; requireFeatures?: string[] }>
    expect(meta.GET.requireAuth).toBe(true)
    expect(meta.GET.requireFeatures).toEqual(['auth.acl.manage'])
    expect(meta.PUT.requireAuth).toBe(true)
    expect(meta.PUT.requireFeatures).toEqual(['auth.acl.manage'])
  })

  it('the settings page declares the same feature', async () => {
    const pageMeta = await import(
      '@open-mercato/core/modules/auth/backend/settings/structural-permissions/page.meta'
    )
    const meta = pageMeta.metadata as {
      requireAuth?: boolean
      requireFeatures?: string[]
      pageContext?: string
    }
    expect(meta.requireAuth).toBe(true)
    expect(meta.requireFeatures).toEqual(['auth.acl.manage'])
    expect(meta.pageContext).toBe('settings')
  })
})

describe('GET — fail-closed read', () => {
  it('401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null)
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    expect(res.status).toBe(401)
  })

  it('returns the seed when the stored value is absent', async () => {
    mockGetValue.mockResolvedValueOnce(null)
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.defaultLevel).toBe(DEFAULT_STRUCTURAL_SETTINGS.defaultLevel)
    expect(body.rules).toEqual(DEFAULT_STRUCTURAL_SETTINGS.rules)
  })

  it('returns the seed when the stored value is malformed (fail closed, never looser)', async () => {
    mockGetValue.mockResolvedValueOnce({ defaultLevel: 'straight', rules: {} })
    const mod = await loadRoute()
    const res = await mod.GET(getRequest())
    const body = await res.json()
    expect(body.defaultLevel).toBe('approval')
  })
})

describe('PUT — strict validation', () => {
  it('401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null)
    const mod = await loadRoute()
    const res = await mod.PUT(putRequest({ rules: {}, defaultLevel: 'approval' }))
    expect(res.status).toBe(401)
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('400 on an unknown verb (the grammar stays closed)', async () => {
    const mod = await loadRoute()
    const res = await mod.PUT(
      putRequest({ rules: { table: { detonate: { human: 'never' } } }, defaultLevel: 'approval' }),
    )
    expect(res.status).toBe(400)
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it("400 on a 'straight' default the parser refuses", async () => {
    const mod = await loadRoute()
    const res = await mod.PUT(putRequest({ rules: {}, defaultLevel: 'straight' }))
    expect(res.status).toBe(400)
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('400 on invalid JSON', async () => {
    const mod = await loadRoute()
    const req = new Request('http://localhost/api/auth/structural-permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    })
    const res = await mod.PUT(req)
    expect(res.status).toBe(400)
  })
})

describe('PUT — the guard seam and the write', () => {
  it('runs the auth mutation-guard before writing and honours a block', async () => {
    const blocked = new Response(JSON.stringify({ error: 'blocked' }), { status: 409 })
    mockedGuard.mockResolvedValueOnce({ blockedResponse: blocked, runAfterSuccess: jest.fn() })
    const mod = await loadRoute()
    const res = await mod.PUT(putRequest({ rules: {}, defaultLevel: 'approval' }))
    expect(res.status).toBe(409)
    expect(mockedGuard).toHaveBeenCalledTimes(1)
    expect(mockSetValue).not.toHaveBeenCalled()
  })

  it('writes the settings and returns them on success', async () => {
    const runAfterSuccess = jest.fn(async () => undefined)
    mockedGuard.mockResolvedValueOnce({ blockedResponse: null, runAfterSuccess })
    const mod = await loadRoute()
    const res = await mod.PUT(
      putRequest({ rules: { table: { edit: { ai: 'review' } } }, defaultLevel: 'approval' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.rules.table.edit.ai).toBe('review')
    expect(mockSetValue).toHaveBeenCalledTimes(1)
    const [moduleId, name, value] = mockSetValue.mock.calls[0]
    expect(moduleId).toBe('permissions')
    expect(name).toBe('structuralPermissionLevels')
    expect(value.rules.table.edit.ai).toBe('review')
    expect(runAfterSuccess).toHaveBeenCalledTimes(1)
  })
})
