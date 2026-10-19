/**
 * `CC-135` — the capability ceiling over HTTP, and the second question the row did not name.
 *
 * `PLAN-CC-135-ceiling-route.md` §3.2 is the measurement this file proves: `directory.tenants.manage`
 * says *may you manage tenants*, and it does **not** say *whose ceiling may you move*. Every tenant's
 * superadmin holds the capability legitimately (the `*` belongs to their position, `CC-134`), and a
 * tenant with no ceiling rows inherits the platform's — so a route gated on the capability alone would
 * hand any tenant administrator the bound that applies to every other tenant.
 *
 * **How this file refuses to prove itself by accident.** The real `loadCapabilityCeiling` and
 * `replaceCapabilityCeiling` run against an in-memory store, so the assertions are about what was
 * *stored* and what was *recorded*, not about which functions were called. The decisive assertion in
 * every refusal case is that the store is **empty afterwards** and no audit record exists — a route
 * that refuses after writing would pass a status-only assertion.
 *
 * **The store applies the filters it is handed** (`LESSONS.md` L23). `find` matches every key of
 * `where`; if it returned every row instead, a removed tenant filter would change no answer and the
 * cross-tenant tests would be green for the wrong reason.
 */

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const FOUNDATION = '33333333-3333-4333-8333-333333333333'
const ADMIN = '44444444-4444-4444-8444-444444444444'
const TENANT_ADMIN = '55555555-5555-4555-8555-555555555555'
const ORG = '66666666-6666-4666-8666-666666666666'

import { TenantCapabilityCeiling } from '@open-mercato/core/modules/auth/data/entities'
// `Tenant` lives in `directory`, and the lib reads it from there. Importing it from `auth/data/entities`
// yields `undefined` — the class is not re-exported — and then `entity === Tenant` never matches, so
// every tenant lookup answers "not found" and the 404 path passes for the wrong reason.
import { Tenant } from '@open-mercato/core/modules/directory/data/entities'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import * as platformRoute from '../capability-ceiling/route'
import * as tenantRoute from '../capability-ceiling/tenant/[id]/route'
import { optionalCache } from '../../lib/capabilityCeilingRoute'

// ---------------------------------------------------------------------------
// The store. Two tables, both filtered by the `where` they are given.
// ---------------------------------------------------------------------------

type CeilingRow = {
  id: string
  tenantId: string | null
  capability: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

const tenants = [
  { id: FOUNDATION, name: 'Foundation', isFoundational: true },
  { id: TENANT_A, name: 'A', isFoundational: false },
  { id: TENANT_B, name: 'B', isFoundational: false },
]

let rows: CeilingRow[] = []
let seq = 0

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where ?? {}).every(([key, expected]) => row[key] === expected)
}

const mockEm: any = {
  fork() {
    return mockEm
  },
  find: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
    if (entity === TenantCapabilityCeiling) return rows.filter((row) => matches(row as any, where ?? {}))
    return []
  }),
  findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
    if (entity === Tenant) return tenants.find((row) => matches(row as any, where ?? {})) ?? null
    return null
  }),
  create: (_entity: unknown, data: Record<string, unknown>) => ({
    id: `ceiling-row-${++seq}`,
    deletedAt: null,
    ...data,
  }),
  persist: (row: CeilingRow) => {
    if (!rows.includes(row)) rows.push(row)
  },
  flush: async () => undefined,
  transactional: async (fn: (tx: unknown) => Promise<unknown>) => fn(mockEm),
}

const mockLog = jest.fn(async (_input: Record<string, unknown>) => undefined)
const mockIsPlatformAdmin = jest.fn(async (_userId: string) => false)

const mockContainer: any = {
  resolve: (token: string) => {
    switch (token) {
      case 'em':
        return mockEm
      case 'rbacService':
        return { isPlatformAdmin: mockIsPlatformAdmin }
      // No cache in this deployment: `optionalCache` must fall through to `null` rather than throw.
      case 'cache':
        throw new Error('no cache configured')
      case 'actionLogService':
        return { log: mockLog }
      default:
        return {}
    }
  },
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

// ---------------------------------------------------------------------------

const authOf = getAuthFromRequest as unknown as jest.Mock

function signIn(sub: string | null, tenantId: string | null) {
  authOf.mockResolvedValue(sub ? { sub, tenantId, orgId: ORG } : null)
}

function request(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

const PLATFORM_PATH = '/api/auth/capability-ceiling'
const tenantPath = (id: string) => `/api/auth/capability-ceiling/tenant/${id}`

async function json(response: Response) {
  return (await response.json()) as Record<string, any>
}

beforeEach(() => {
  rows = []
  seq = 0
  jest.clearAllMocks()
  mockIsPlatformAdmin.mockImplementation(async () => false)
  signIn(TENANT_ADMIN, TENANT_A)
})

// ---------------------------------------------------------------------------
// The reach rule (§3.2) — the cases that make the row's literal gate insufficient.
// ---------------------------------------------------------------------------

describe('the platform scope', () => {
  it('is writable by an administrator of the foundational tenant, and records them', async () => {
    signIn(ADMIN, FOUNDATION)
    mockIsPlatformAdmin.mockResolvedValue(true)

    const response = await platformRoute.PUT(
      request(PLATFORM_PATH, 'PUT', { capabilities: ['auth.users.view', 'directory.tenants.view'] }),
    )
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.scope).toBe('platform')
    expect(body.source).toBe('platform')
    expect(body.capabilities).toEqual(['auth.users.view', 'directory.tenants.view'])
    expect(body.added).toEqual(['auth.users.view', 'directory.tenants.view'])
    expect(body.removed).toEqual([])

    expect(mockLog).toHaveBeenCalledTimes(1)
    const record = mockLog.mock.calls[0][0] as any
    // The actor is the caller — this is the whole point of the row. `system` was what a CLI recorded.
    expect(record.actorUserId).toBe(ADMIN)
    expect(record.context.actorKind).toBe('human')
    expect(record.context.actedFromTenantId).toBe(FOUNDATION)
    expect(record.context.ceilingScope).toBe('platform')
    expect(record.resourceId).toBe('platform')
    // A platform act is not a crossing between two tenants, even though the actor stands in one.
    expect(record.context.crossTenant).toBe(false)
  })

  it('is refused for a tenant administrator, and nothing is written or recorded', async () => {
    signIn(TENANT_ADMIN, TENANT_A)
    mockIsPlatformAdmin.mockResolvedValue(false)

    const response = await platformRoute.PUT(
      request(PLATFORM_PATH, 'PUT', { capabilities: ['auth.users.view'] }),
    )

    expect(response.status).toBe(403)
    expect(String((await json(response)).error)).toContain('foundational tenant')
    // The write did not happen: an assertion about the status alone would pass a route that wrote first.
    expect(rows).toHaveLength(0)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('is readable by a platform administrator and refused for anybody else', async () => {
    signIn(ADMIN, FOUNDATION)
    mockIsPlatformAdmin.mockResolvedValue(true)
    rows.push({ id: 'r1', tenantId: null, capability: 'a.b', createdAt: new Date(), updatedAt: new Date(), deletedAt: null })

    const allowed = await platformRoute.GET(request(PLATFORM_PATH, 'GET'))
    expect(allowed.status).toBe(200)
    expect((await json(allowed)).capabilities).toEqual(['a.b'])

    signIn(TENANT_ADMIN, TENANT_A)
    mockIsPlatformAdmin.mockResolvedValue(false)
    const refused = await platformRoute.GET(request(PLATFORM_PATH, 'GET'))
    expect(refused.status).toBe(403)
  })
})

describe('a tenant scope', () => {
  it("lets a tenant narrow its own ceiling without asking anybody", async () => {
    signIn(TENANT_ADMIN, TENANT_A)
    rows.push({ id: 'r1', tenantId: null, capability: 'a.b', createdAt: new Date(), updatedAt: new Date(), deletedAt: null })

    const response = await tenantRoute.PUT(request(tenantPath(TENANT_A), 'PUT', { capabilities: ['a.b'] }))
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.scope).toBe('tenant')
    expect(body.tenantId).toBe(TENANT_A)
    expect(body.source).toBe('tenant')
    // The platform administrator question is not even asked: the target is the caller's own tenant.
    expect(mockIsPlatformAdmin).not.toHaveBeenCalled()

    const record = mockLog.mock.calls[0][0] as any
    expect(record.tenantId).toBe(TENANT_A)
    expect(record.context.crossTenant).toBe(false)
    expect(record.context.actedFromTenantId).toBe(TENANT_A)
  })

  it("refuses another tenant's ceiling to a tenant administrator", async () => {
    signIn(TENANT_ADMIN, TENANT_A)
    mockIsPlatformAdmin.mockResolvedValue(false)

    const response = await tenantRoute.PUT(request(tenantPath(TENANT_B), 'PUT', { capabilities: ['a.b'] }))

    expect(response.status).toBe(403)
    expect(rows).toHaveLength(0)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it("lets a platform administrator act on another tenant, and the record says it crossed", async () => {
    signIn(ADMIN, FOUNDATION)
    mockIsPlatformAdmin.mockResolvedValue(true)
    rows.push({ id: 'r1', tenantId: null, capability: 'a.b', createdAt: new Date(), updatedAt: new Date(), deletedAt: null })

    const response = await tenantRoute.PUT(request(tenantPath(TENANT_B), 'PUT', { capabilities: ['a.b'] }))
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.tenantId).toBe(TENANT_B)
    // The target tenant's own journal — an admin must not be able to change a tenant invisibly.
    const record = mockLog.mock.calls[0][0] as any
    expect(record.tenantId).toBe(TENANT_B)
    expect(record.context.crossTenant).toBe(true)
    expect(record.context.actedFromTenantId).toBe(FOUNDATION)
    expect(record.actorUserId).toBe(ADMIN)
  })

  it('reads an inherited ceiling and says where it came from', async () => {
    signIn(TENANT_ADMIN, TENANT_A)
    rows.push({ id: 'r1', tenantId: null, capability: 'a.b', createdAt: new Date(), updatedAt: new Date(), deletedAt: null })

    const response = await tenantRoute.GET(request(tenantPath(TENANT_A), 'GET'))
    const body = await json(response)

    expect(response.status).toBe(200)
    // No rows of its own, so the platform's set applies — and `source` says so rather than implying the
    // tenant chose it.
    expect(body.source).toBe('platform')
    expect(body.capabilities).toEqual(['a.b'])
  })
})

// ---------------------------------------------------------------------------
// The library's refusals, surfaced as 400 rather than 500 (§4 R6).
// ---------------------------------------------------------------------------

describe('the refusals the library already makes', () => {
  it('answers 400, pointing at the tenant flag, for an empty tenant ceiling', async () => {
    signIn(TENANT_ADMIN, TENANT_A)

    const response = await tenantRoute.PUT(request(tenantPath(TENANT_A), 'PUT', { capabilities: [] }))
    const body = await json(response)

    expect(response.status).toBe(400)
    // The message points at the thing that actually means "this tenant may do nothing" — an empty
    // ceiling cannot express it, because "no rows" already means "inherit".
    expect(String(body.error)).toContain('deactivate')
    expect(rows).toHaveLength(0)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('answers 400 for an empty platform ceiling, and says why the reason differs', async () => {
    signIn(ADMIN, FOUNDATION)
    mockIsPlatformAdmin.mockResolvedValue(true)

    const response = await platformRoute.PUT(request(PLATFORM_PATH, 'PUT', { capabilities: [] }))
    const body = await json(response)

    expect(response.status).toBe(400)
    // No "deactivate the tenant" here: emptying the platform ceiling would deny every capability
    // everywhere, which is a different mistake with a different remedy.
    expect(String(body.error)).toContain('every tenant')
    expect(rows).toHaveLength(0)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('answers 400, naming the offenders, for a tenant ceiling outside the platform ceiling', async () => {
    signIn(TENANT_ADMIN, TENANT_A)
    rows.push({ id: 'r1', tenantId: null, capability: 'a.b', createdAt: new Date(), updatedAt: new Date(), deletedAt: null })

    const response = await tenantRoute.PUT(
      request(tenantPath(TENANT_A), 'PUT', { capabilities: ['a.b', 'not.allowed'] }),
    )
    const body = await json(response)

    expect(response.status).toBe(400)
    expect(body.capabilities).toEqual(['not.allowed'])
    // A superset is refused, never silently narrowed: a ceiling that quietly grants less than it says
    // is a lie the operator cannot see.
    expect(rows.filter((row) => row.tenantId === TENANT_A)).toHaveLength(0)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('answers 404 for a tenant id that does not exist, before any reach question', async () => {
    signIn(ADMIN, FOUNDATION)
    mockIsPlatformAdmin.mockResolvedValue(true)

    const response = await tenantRoute.PUT(
      request(tenantPath('99999999-9999-4999-8999-999999999999'), 'PUT', { capabilities: ['a.b'] }),
    )

    expect(response.status).toBe(404)
    expect(mockIsPlatformAdmin).not.toHaveBeenCalled()
    expect(rows).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// The door itself.
// ---------------------------------------------------------------------------

describe('the door', () => {
  it('answers 401 when there is no principal to record', async () => {
    signIn(null, null)

    const response = await platformRoute.PUT(request(PLATFORM_PATH, 'PUT', { capabilities: ['a.b'] }))

    expect(response.status).toBe(401)
    expect(rows).toHaveLength(0)
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('declares the capability on every verb of both routes', () => {
    // A route with no `requireFeatures` is ungated, and that is invisible in every other test — it is
    // `CC-138`'s class. Asserting the declaration is the only unit-level way to see it.
    for (const route of [platformRoute, tenantRoute]) {
      for (const verb of ['GET', 'PUT'] as const) {
        const declared = (route.metadata as Record<string, { requireFeatures?: string[] }>)[verb]
        expect(declared?.requireFeatures).toEqual(['directory.tenants.manage'])
      }
    }
  })

  it('treats a deployment with no cache as a deployment with no cache', () => {
    // `optionalCache` is the reason every case above could run without one: a missing cache is a
    // normal answer, not a failure, and `loadCapabilityCeiling` falls through to the table.
    expect(optionalCache(mockContainer)).toBeNull()
  })
})
