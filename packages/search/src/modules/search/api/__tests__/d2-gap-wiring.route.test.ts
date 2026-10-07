/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `search` module shipped **no mutation guard at all**
 * — a module-wide string scan found no wrapper, no `runRouteMutationGuards`
 * call, and neither of the `@deprecated` pair. All **SEVEN** of its write verbs
 * were therefore checked by nothing:
 *
 *   1. `api/embeddings/reindex/route.ts`         POST
 *   2. `api/embeddings/reindex/cancel/route.ts`  POST
 *   3. `api/embeddings/route.ts`                 POST
 *   4. `api/index/route.ts`                      DELETE
 *   5. `api/reindex/route.ts`                    POST
 *   6. `api/reindex/cancel/route.ts`             POST
 *   7. `api/settings/global-search/route.ts`     POST
 *
 * This suite proves each one now runs a guard, by registering a **real** guard in
 * the global store (`registerMutationGuards`) and driving the **real** route
 * handlers with `runRouteMutationGuards` left **UNMOCKED**. Mocking the wrapper
 * would only prove a function of that name is called; a real registered guard
 * proves the registry chokepoint is actually reached from the route.
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict (the registered guard returns ok:false) stops the
 *      write — the observable side-effect (the lock acquisition, the settings
 *      write, the purge) never happens, and no after-success fires;
 *   2. an **allow** verdict lets the write run — the side-effect DOES happen,
 *      and the guard's after-success fires exactly once.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'

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

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: async () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}))

// ── Container: a tiny resolver over the shared stubs ───────────────────────
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => resolveStub(key),
    // A real Awilix container exposes `hasRegistration`, and the registry's
    // legacy bridge consults it before resolving `crudMutationGuardService`
    // (`resolveCrudMutationGuardService`). Reporting `false` makes the bridge
    // return null exactly as it does in production when the service is absent,
    // instead of leaning on the bridge's own catch to swallow a thrown key.
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

const emStub = {
  getKysely: () => ({}),
}
const progressServiceStub = {}

let searchIndexerStub: Record<string, unknown>
let strategyStub: Record<string, unknown>
let moduleConfigServiceStub: Record<string, unknown>

function resolveStub(key: string): unknown {
  switch (key) {
    case 'em':
      return emStub
    case 'progressService':
      return progressServiceStub
    case 'searchIndexer':
      return searchIndexerStub
    case 'searchStrategies':
      return [strategyStub]
    case 'moduleConfigService':
      return moduleConfigServiceStub
    case 'eventBus':
      return { emitEvent: async () => undefined }
    case 'vectorDrivers':
      return []
    case 'embeddingProviderProbe':
      return { id: 'stub-probe', checkAvailability: async () => ({ available: true }) }
    default:
      throw new Error(`unexpected resolve: ${key}`)
  }
}

// ── Stub the module-local helpers the routes call ──────────────────────────
jest.mock('../../lib/reindex-lock', () => ({
  getReindexLockStatus: jest.fn(async () => null),
  acquireReindexLock: jest.fn(async () => {
    record('acquireReindexLock')
    return { acquired: true }
  }),
  clearReindexLock: jest.fn(async () => undefined),
}))

jest.mock('../../lib/reindex-progress', () => ({
  ensureReindexProgressJob: jest.fn(async () => {
    record('ensureReindexProgressJob')
    return 'progress-1'
  }),
  completeReindexProgress: jest.fn(async () => undefined),
  failReindexProgress: jest.fn(async () => undefined),
  cancelReindexProgress: jest.fn(async () => {
    record('cancelReindexProgress')
  }),
}))

jest.mock('@open-mercato/shared/lib/indexers/status-log', () => ({
  recordIndexerLog: jest.fn(async () => undefined),
}))
jest.mock('@open-mercato/shared/lib/indexers/error-log', () => ({
  recordIndexerError: jest.fn(async () => undefined),
}))

jest.mock('../../../../lib/debug', () => ({
  searchDebug: jest.fn(),
  searchDebugWarn: jest.fn(),
  searchError: jest.fn(),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: jest.fn(async () => ({
    selectedId: ORG_ID,
    filterIds: [ORG_ID],
  })),
}))

jest.mock('../../lib/embedding-config', () => ({
  resolveEmbeddingConfig: jest.fn(async () => null),
  resolveEmbeddingConfigResult: jest.fn(async () => ({ config: null, source: 'default' })),
  // `embeddings/route.ts` calls these on its allow path (after the guard).
  saveEmbeddingConfig: jest.fn(async () => undefined),
  getConfiguredProviders: jest.fn(() => []),
  detectConfigChange: jest.fn(() => ({ requiresReindex: false, newConfig: {} })),
  getEffectiveDimension: jest.fn(() => 1536),
}))

// `embeddings/route.ts` walks these helpers after the guard passes; the ones
// that resolve through the container are covered by `resolveStub` below, and
// `checkAllProviders` is stubbed so the allow path can reach its success return.
jest.mock('../../lib/provider-probe', () => ({
  checkAllProviders: jest.fn(async () => []),
}))

// `index/route.ts` DELETE writes coverage counts and emits an event.
jest.mock('@open-mercato/core/modules/query_index/lib/coverage', () => ({
  writeCoverageCounts: jest.fn(async () => {
    record('writeCoverageCounts')
  }),
}))

jest.mock('../../lib/global-search-config', () => ({
  DEFAULT_GLOBAL_SEARCH_STRATEGIES: ['fulltext'],
  resolveGlobalSearchStrategiesResult: jest.fn(async () => ({
    strategies: ['fulltext'],
    source: 'default',
  })),
  saveGlobalSearchStrategies: jest.fn(async () => {
    record('saveGlobalSearchStrategies')
  }),
}))

// ── Route modules under test ───────────────────────────────────────────────
import { POST as embeddingsReindexPost } from '../embeddings/reindex/route'
import { POST as embeddingsReindexCancelPost } from '../embeddings/reindex/cancel/route'
import { POST as embeddingsPost } from '../embeddings/route'
import { DELETE as indexDelete } from '../index/route'
import { POST as reindexPost } from '../reindex/route'
import { POST as reindexCancelPost } from '../reindex/cancel/route'
import { POST as globalSearchSettingsPost } from '../settings/global-search/route'

function installGuard(mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: 'test.search-index.guard',
    targetEntity: 'search.index',
    operations: ['custom', 'update', 'delete', 'create'],
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

function installSettingsGuard(mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: 'test.search-settings.guard',
    targetEntity: 'search.settings',
    operations: ['custom', 'update', 'create', 'delete'],
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

function makeRequest(method: string, url = 'http://localhost/api/search/x', body?: unknown) {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  registerMutationGuards([])

  searchIndexerStub = {
    listEnabledEntities: () => ['customers'],
    reindexAllToFulltext: async () => {
      record('reindexAllToFulltext')
      return { success: true, entitiesProcessed: 1, recordsIndexed: 5, jobsEnqueued: 0, errors: [] }
    },
    reindexEntityToFulltext: async () => {
      record('reindexEntityToFulltext')
      return { success: true, entitiesProcessed: 1, recordsIndexed: 5, jobsEnqueued: 0, errors: [] }
    },
    // `embeddings/reindex/route.ts` uses the *vector* variants, not the
    // fulltext ones above. Both must return a result shape or the route reads
    // `result.recordsIndexed` off `undefined` and 500s.
    reindexAllToVector: async () => {
      record('reindexAllToVector')
      return { success: true, entitiesProcessed: 1, recordsIndexed: 5, jobsEnqueued: 0, errors: [] }
    },
    reindexEntityToVector: async () => {
      record('reindexEntityToVector')
      return { success: true, entitiesProcessed: 1, recordsIndexed: 5, jobsEnqueued: 0, errors: [] }
    },
    purgeEntity: async () => {
      record('purgeEntity')
    },
  }
  strategyStub = {
    id: 'fulltext',
    isAvailable: async () => true,
    clearIndex: async () => {
      record('clearIndex')
    },
    recreateIndex: async () => {
      record('recreateIndex')
    },
    purge: async () => {
      record('purge')
    },
    getIndexStats: async () => ({}),
  }
  moduleConfigServiceStub = {
    setValue: async () => {
      record('setValue')
    },
  }
})

describe('search D2-gap wiring — every write verb reaches the registry', () => {
  describe('search.index guard — block stops the write', () => {
    it('embeddings/reindex POST', async () => {
      installGuard('block')
      const res = await embeddingsReindexPost(makeRequest('POST', 'http://localhost/api/search/embeddings/reindex', {}))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('acquireReindexLock')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('embeddings/reindex/cancel POST', async () => {
      installGuard('block')
      const res = await embeddingsReindexCancelPost(makeRequest('POST'))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('cancelReindexProgress')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('embeddings POST', async () => {
      installSettingsGuard('block')
      const res = await embeddingsPost(makeRequest('POST', 'http://localhost/api/search/embeddings', { autoIndexingEnabled: true }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('setValue')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('index DELETE', async () => {
      installGuard('block')
      const res = await indexDelete(makeRequest('DELETE', 'http://localhost/api/search/index?confirmAll=true'))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('purge')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('reindex POST', async () => {
      installGuard('block')
      const res = await reindexPost(makeRequest('POST', 'http://localhost/api/search/reindex', { action: 'clear' }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('acquireReindexLock')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('reindex/cancel POST', async () => {
      installGuard('block')
      const res = await reindexCancelPost(makeRequest('POST'))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('cancelReindexProgress')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('settings/global-search POST', async () => {
      installSettingsGuard('block')
      const res = await globalSearchSettingsPost(
        makeRequest('POST', 'http://localhost/api/search/settings/global-search', { enabledStrategies: ['fulltext'] }),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('saveGlobalSearchStrategies')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('search.index guard — allow runs the write and fires after-success once', () => {
    it('embeddings/reindex POST', async () => {
      installGuard('allow')
      const res = await embeddingsReindexPost(makeRequest('POST', 'http://localhost/api/search/embeddings/reindex', {}))
      expect(res.status).toBe(200)
      expect(writes).toContain('acquireReindexLock')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('embeddings/reindex/cancel POST', async () => {
      installGuard('allow')
      const res = await embeddingsReindexCancelPost(makeRequest('POST'))
      expect(res.status).toBe(200)
      expect(writes).toContain('cancelReindexProgress')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('embeddings POST', async () => {
      installSettingsGuard('allow')
      const res = await embeddingsPost(makeRequest('POST', 'http://localhost/api/search/embeddings', { autoIndexingEnabled: true }))
      expect(res.status).toBe(200)
      expect(writes).toContain('setValue')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('index DELETE', async () => {
      installGuard('allow')
      const res = await indexDelete(makeRequest('DELETE', 'http://localhost/api/search/index?confirmAll=true'))
      expect(res.status).toBe(200)
      expect(writes).toContain('purgeEntity')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('reindex POST', async () => {
      installGuard('allow')
      const res = await reindexPost(makeRequest('POST', 'http://localhost/api/search/reindex', { action: 'clear', useQueue: false }))
      expect(res.status).toBe(200)
      expect(writes).toContain('acquireReindexLock')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('reindex/cancel POST', async () => {
      installGuard('allow')
      const res = await reindexCancelPost(makeRequest('POST'))
      expect(res.status).toBe(200)
      expect(writes).toContain('cancelReindexProgress')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('settings/global-search POST', async () => {
      installSettingsGuard('allow')
      const res = await globalSearchSettingsPost(
        makeRequest('POST', 'http://localhost/api/search/settings/global-search', { enabledStrategies: ['fulltext'] }),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('saveGlobalSearchStrategies')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  it('a registered guard OUTSIDE the touched kinds does not fire (control)', async () => {
    const unrelated: MutationGuard = {
      id: 'test.unrelated.guard',
      targetEntity: 'some.other.entity',
      operations: ['custom', 'update', 'create', 'delete'],
      priority: 0,
      async validate() {
        return { ok: true, shouldRunAfterSuccess: true }
      },
      async afterSuccess() {
        await runAfterSuccessMock()
      },
    }
    registerMutationGuards([{ moduleId: 'test', guards: [unrelated] }])

    const res = await globalSearchSettingsPost(
      makeRequest('POST', 'http://localhost/api/search/settings/global-search', { enabledStrategies: ['fulltext'] }),
    )
    expect(res.status).toBe(200)
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })
})
