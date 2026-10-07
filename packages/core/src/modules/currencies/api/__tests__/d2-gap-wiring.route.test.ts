/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `currencies` module read as **4 unguarded verbs
 * across 2 files**. Measured first (tool `--json` + a hand read of every `.ts`
 * under `api/`), the 4 did **not** split — every one writes a business row, so
 * all four are wired in this change:
 *
 *   1. `api/fetch-configs/route.ts`  POST    -> createFetchConfig  (em.create + persist + flush)
 *   2. `api/fetch-configs/route.ts`  PUT     -> updateFetchConfig  (em.assign + persist + flush)
 *   3. `api/fetch-configs/route.ts`  DELETE  -> deleteFetchConfig  (em.remove + flush)
 *   4. `api/fetch-rates/route.ts`    POST    -> fetchRatesForDate  + CurrencyFetchConfig.lastSync* flush
 *
 * Note: `fetch-configs` PUT/DELETE also call `enforceCommandOptimisticLock` —
 * the command-lock FLOOR, a different mechanism that never consults the
 * registry (the `directory` trap). That is not the guard this suite proves.
 *
 * This suite proves each verb now runs the registry, by registering a **real**
 * guard in the global store (`registerMutationGuards`) and driving the **real**
 * route handlers with `runRouteMutationGuards` left **UNMOCKED**. Mocking the
 * wrapper would only prove a function of that name is called; a real registered
 * guard proves the registry chokepoint is actually reached from the route.
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict stops the write — the command/service never runs and
 *      no after-success fires;
 *   2. an **allow** verdict lets the write run — the command/service DOES run
 *      and the guard's after-success fires exactly once.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const CONFIG_ID = '11111111-1111-4111-8111-111111111111'
const PROVIDER = 'NBP'

// ── Real registry (not stubbed) ────────────────────────────────────────────
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable side-effect record ──────────────────────────────────────────
const writes: string[] = []
function record(name: string) {
  writes.push(name)
}
const runAfterSuccessMock = jest.fn(async () => undefined)

// ── Shared auth ────────────────────────────────────────────────────────────
let currentAuth: Record<string, unknown> | null = {
  sub: USER_ID,
  tenantId: TENANT_ID,
  orgId: ORG_ID,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => currentAuth),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) }),
}))

// ── Container: a tiny resolver over the shared stubs ───────────────────────
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => resolveStub(key),
    // A real Awilix container exposes `hasRegistration`, and the registry's
    // legacy bridge consults it before resolving `crudMutationGuardService`.
    // Reporting `false` makes the bridge return null exactly as it does in
    // production when the service is absent, instead of leaning on the
    // bridge's own catch to swallow a thrown key.
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

const emStub = {
  fork: () => emStub,
  getKysely: () => ({}),
  create: (entity: unknown, data: unknown) => {
    record(`em.create:${(entity as { name?: string })?.name ?? 'unknown'}`)
    return { id: CONFIG_ID, ...(data as Record<string, unknown>) }
  },
  persist: () => {
    record('em.persist')
    return { flush: async () => record('em.flush') }
  },
  remove: () => {
    record('em.remove')
    return { flush: async () => record('em.flush') }
  },
  assign: () => {
    record('em.assign')
  },
  findOne: async (_entity: unknown, where: { id?: string }) => {
    if (where?.id === CONFIG_ID) {
      return {
        id: CONFIG_ID,
        provider: PROVIDER,
        tenantId: TENANT_ID,
        organizationId: ORG_ID,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }
    }
    return null
  },
  find: async () => [
    { id: CONFIG_ID, provider: PROVIDER, tenantId: TENANT_ID, organizationId: ORG_ID },
  ],
  flush: async () => {
    record('em.flush')
  },
}

const fetchRatesForDateMock = jest.fn(async () => {
  record('fetchRatesForDate')
  return {
    totalFetched: 2,
    byProvider: { [PROVIDER]: { count: 2, errors: [] } },
    errors: [],
  }
})

function resolveStub(key: string): unknown {
  switch (key) {
    case 'em':
      return emStub
    case 'rateFetchingService':
      return { fetchRatesForDate: (...args: unknown[]) => fetchRatesForDateMock(...args) }
    default:
      throw new Error(`unexpected resolve: ${key}`)
  }
}

// ── The command/service modules are real; only their WRITE target is observed
//    through `emStub`. Nothing here mocks the guard wrapper.
import { POST as fetchConfigsPost, PUT as fetchConfigsPut, DELETE as fetchConfigsDelete } from '../fetch-configs/route'
import { POST as fetchRatesPost } from '../fetch-rates/route'

function installGuard(kind: string, mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: `test.currencies.${kind}.guard`,
    targetEntity: kind,
    operations: ['create', 'update', 'delete', 'custom'],
    priority: 0,
    async validate() {
      if (mode === 'block') {
        return { ok: false, status: 422, message: 'blocked by test guard' }
      }
      return { ok: true, shouldRunAfterSuccess: true }
    },
    async afterSuccess() {
      await runAfterSuccessMock()
    },
  }
  registerMutationGuards([{ moduleId: 'test', guards: [guard] }])
}

function jsonRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/currencies/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  registerMutationGuards([])
})

describe('currencies D2-gap wiring — every genuine write reaches the registry', () => {
  const CONFIG_KIND = 'currencies.currency_fetch_config'

  describe('currencies.currency_fetch_config guard — block stops the write', () => {
    it('fetch-configs POST', async () => {
      installGuard(CONFIG_KIND, 'block')
      const res = await fetchConfigsPost(jsonRequest('POST', { provider: PROVIDER }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('em.create:CurrencyFetchConfig')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('fetch-configs PUT', async () => {
      installGuard(CONFIG_KIND, 'block')
      const res = await fetchConfigsPut(jsonRequest('PUT', { id: CONFIG_ID, provider: PROVIDER }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('em.assign')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('fetch-configs DELETE', async () => {
      installGuard(CONFIG_KIND, 'block')
      const res = await fetchConfigsDelete(
        new Request(`http://localhost/api/currencies/x?id=${CONFIG_ID}`, { method: 'DELETE' }),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('em.remove')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('currencies.currency_fetch_config guard — allow runs the write once', () => {
    it('fetch-configs POST', async () => {
      installGuard(CONFIG_KIND, 'allow')
      const res = await fetchConfigsPost(jsonRequest('POST', { provider: PROVIDER }))
      expect(res.status).toBe(201)
      expect(writes).toContain('em.create:CurrencyFetchConfig')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('fetch-configs PUT', async () => {
      installGuard(CONFIG_KIND, 'allow')
      const res = await fetchConfigsPut(jsonRequest('PUT', { id: CONFIG_ID, provider: PROVIDER }))
      expect(res.status).toBe(200)
      expect(writes).toContain('em.assign')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('fetch-configs DELETE', async () => {
      installGuard(CONFIG_KIND, 'allow')
      const res = await fetchConfigsDelete(
        new Request(`http://localhost/api/currencies/x?id=${CONFIG_ID}`, { method: 'DELETE' }),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('em.remove')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('currencies.exchange_rate guard — block stops the write', () => {
    it('fetch-rates POST', async () => {
      installGuard('currencies.exchange_rate', 'block')
      const res = await fetchRatesPost(jsonRequest('POST', { providers: [PROVIDER] }))
      expect(res.status).toBe(422)
      expect(fetchRatesForDateMock).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('currencies.exchange_rate guard — allow runs the write once', () => {
    it('fetch-rates POST', async () => {
      installGuard('currencies.exchange_rate', 'allow')
      const res = await fetchRatesPost(jsonRequest('POST', { providers: [PROVIDER] }))
      expect(res.status).toBe(200)
      expect(fetchRatesForDateMock).toHaveBeenCalledTimes(1)
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  it('a registered guard OUTSIDE the touched kind does not fire (control)', async () => {
    const unrelated: MutationGuard = {
      id: 'test.unrelated.guard',
      targetEntity: 'some.other.entity',
      operations: ['create', 'update', 'delete', 'custom'],
      priority: 0,
      async validate() {
        return { ok: true, shouldRunAfterSuccess: true }
      },
      async afterSuccess() {
        await runAfterSuccessMock()
      },
    }
    registerMutationGuards([{ moduleId: 'test', guards: [unrelated] }])

    const res = await fetchConfigsPost(jsonRequest('POST', { provider: PROVIDER }))
    expect(res.status).toBe(201)
    expect(writes).toContain('em.create:CurrencyFetchConfig')
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('an invalid JSON body is rejected before the guard runs (400)', async () => {
    installGuard(CONFIG_KIND, 'block')
    const res = await fetchConfigsPost(
      new Request('http://localhost/api/currencies/x', { method: 'POST', body: '{not json' }),
    )
    expect(res.status).toBe(400)
    expect(writes).not.toContain('em.create:CurrencyFetchConfig')
  })
})
