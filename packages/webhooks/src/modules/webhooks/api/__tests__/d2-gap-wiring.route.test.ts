/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `webhooks` module shipped **no mutation guard at
 * all** — a module-wide string scan found no wrapper, no
 * `runRouteMutationGuards` call and neither of the `@deprecated` pair. The
 * D2-gap label read **7** unguarded verbs; a hand walk split them three ways:
 *
 *   false positive (1)  `api/route.ts` POST — a two-line re-export shim of
 *                       `./webhooks/route.ts`, which is `makeCrudRoute`
 *                       (guarded). The TOOL's re-export regex was fixed, not
 *                       the repo. Not a subject of this suite.
 *   actor-less (1)      `api/inbound/[endpointId]/route.ts` POST — no session,
 *                       guarded by the provider signature + rate limit. Set
 *                       aside in the tool by name. Not a subject of this suite.
 *   genuine writes (5)  the four real files below — each wired in this change.
 *
 * This suite proves each of the FIVE genuine write verbs now runs a guard, by
 * registering a **real** guard in the global store (`registerMutationGuards`)
 * and driving the **real** route handlers with `runRouteMutationGuards` left
 * **UNMOCKED**. Mocking the wrapper would only prove a function of that name is
 * called; a real registered guard proves the registry chokepoint is actually
 * reached from the route.
 *
 * The five subjects:
 *
 *   1. `api/webhook-deliveries/[id]/retry/route.ts`  POST  (kind webhooks.delivery)
 *   2. `api/webhooks/[id]/rotate-secret/route.ts`    POST  (kind webhooks.endpoint)
 *   3. `api/webhooks/[id]/route.ts`                  PUT   (kind webhooks.endpoint)
 *   4. `api/webhooks/[id]/route.ts`                  DELETE(kind webhooks.endpoint)
 *   5. `api/webhooks/[id]/test/route.ts`             POST  (kind webhooks.delivery)
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict (the registered guard returns ok:false) stops the
 *      write — the observable side-effect (the flush, the enqueue, the test
 *      delivery) never happens, and no after-success fires;
 *   2. an **allow** verdict lets the write run — the side-effect DOES happen,
 *      and the guard's after-success fires exactly once.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const WEBHOOK_ID = '11111111-1111-4111-8111-111111111111'
const DELIVERY_ID = '22222222-2222-4222-8222-222222222222'
const NEW_DELIVERY_ID = '33333333-3333-4333-8333-333333333333'

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

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: jest.fn(async () => ({
    tenantId: TENANT_ID,
    selectedId: ORG_ID,
    allowedIds: [ORG_ID],
  })),
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
  fork: () => emStub,
  getKysely: () => ({}),
  // `findScopedDelivery` (helpers.ts) resolves the delivery via `em.findOne`
  // directly; `findScopedWebhook` goes through `findOneWithDecryption` (mocked
  // below). Both must yield the fixtures the routes act on.
  findOne: async (_entity: unknown, where: { id?: string }) => {
    if (where?.id === WEBHOOK_ID) return makeWebhook()
    if (where?.id === DELIVERY_ID) return makeDelivery()
    return null
  },
  flush: async () => {
    record('flush')
  },
  refresh: async () => {
    record('refresh')
  },
}

function resolveStub(key: string): unknown {
  switch (key) {
    case 'em':
      return emStub
    case 'eventBus':
      return { emitEvent: async () => undefined }
    default:
      throw new Error(`unexpected resolve: ${key}`)
  }
}

// ── Entity lookups: return the fixtures the routes act on ──────────────────
jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: jest.fn(async (_em: unknown, _entity: unknown, where: { id?: string }) => {
    if (where?.id === WEBHOOK_ID) return makeWebhook()
    if (where?.id === DELIVERY_ID) return makeDelivery()
    return null
  }),
  findWithDecryption: jest.fn(async () => []),
}))

// ── Stub the module-local side-effect helpers ──────────────────────────────
jest.mock('../../lib/delivery', () => ({
  createWebhookDelivery: jest.fn(async () => {
    record('createWebhookDelivery')
    return makeDelivery({ id: NEW_DELIVERY_ID })
  }),
  processWebhookDeliveryJob: jest.fn(async () => {
    record('processWebhookDeliveryJob')
  }),
}))

jest.mock('../../lib/queue', () => ({
  enqueueWebhookDelivery: jest.fn(async () => {
    record('enqueueWebhookDelivery')
    return 'job-1'
  }),
  getWebhookQueue: jest.fn(),
  WEBHOOK_DELIVERIES_QUEUE: 'webhook-deliveries',
}))

jest.mock('../../lib/integration-state', () => ({
  isWebhookIntegrationEnabled: jest.fn(async () => true),
  WEBHOOK_INTEGRATION_DISABLED_MESSAGE: 'Custom Webhooks integration is disabled',
}))

jest.mock('../../events', () => ({
  emitWebhooksEvent: jest.fn(async () => undefined),
  eventsConfig: { emit: jest.fn(async () => undefined) },
  default: { emit: jest.fn(async () => undefined) },
}))

jest.mock('@open-mercato/shared/lib/webhooks', () => ({
  generateWebhookSecret: () => 'whsec_test',
  buildWebhookHeaders: () => ({}),
  generateMessageId: () => 'msg-1',
}))

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeWebhook() {
  return {
    id: WEBHOOK_ID,
    name: 'Test webhook',
    description: null,
    url: 'https://example.com/hook',
    secret: 'whsec_old',
    previousSecret: null,
    previousSecretSetAt: null,
    subscribedEvents: ['webhooks.test.ping'],
    httpMethod: 'POST',
    customHeaders: null,
    isActive: true,
    deliveryStrategy: 'http',
    strategyConfig: null,
    maxRetries: 10,
    timeoutMs: 15000,
    rateLimitPerMinute: 0,
    consecutiveFailures: 0,
    autoDisableThreshold: 100,
    lastSuccessAt: null,
    lastFailureAt: null,
    integrationId: null,
    organizationId: ORG_ID,
    tenantId: TENANT_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  }
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: DELIVERY_ID,
    webhookId: WEBHOOK_ID,
    eventType: 'webhooks.test.ping',
    messageId: 'msg-1',
    payload: { ping: true },
    status: 'failed',
    responseStatus: null,
    responseBody: null,
    responseHeaders: null,
    errorMessage: 'boom',
    attemptNumber: 1,
    maxAttempts: 10,
    targetUrl: 'https://example.com/hook',
    durationMs: null,
    enqueuedAt: new Date('2026-01-01T00:00:00Z'),
    lastAttemptAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    nextRetryAt: new Date('2026-01-01T00:05:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    organizationId: ORG_ID,
    tenantId: TENANT_ID,
    ...overrides,
  }
}

// ── Route modules under test ───────────────────────────────────────────────
import { POST as retryPost } from '../webhook-deliveries/[id]/retry/route'
import { POST as rotateSecretPost } from '../webhooks/[id]/rotate-secret/route'
import { PUT as webhookPut, DELETE as webhookDelete } from '../webhooks/[id]/route'
import { POST as testPost } from '../webhooks/[id]/test/route'

function installGuard(kind: 'webhooks.endpoint' | 'webhooks.delivery', mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: `test.${kind}.guard`,
    targetEntity: kind,
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

function makeRequest(method: string, url = 'http://localhost/api/webhooks/x', body?: unknown) {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  registerMutationGuards([])
})

describe('webhooks D2-gap wiring — every genuine write verb reaches the registry', () => {
  describe('block verdict stops the write', () => {
    it('webhook-deliveries/[id]/retry POST', async () => {
      installGuard('webhooks.delivery', 'block')
      const res = await retryPost(makeRequest('POST'), ctx(DELIVERY_ID))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('flush')
      expect(writes).not.toContain('enqueueWebhookDelivery')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('webhooks/[id]/rotate-secret POST', async () => {
      installGuard('webhooks.endpoint', 'block')
      const res = await rotateSecretPost(makeRequest('POST'), ctx(WEBHOOK_ID))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('flush')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('webhooks/[id] PUT', async () => {
      installGuard('webhooks.endpoint', 'block')
      const res = await webhookPut(
        makeRequest('PUT', 'http://localhost/api/webhooks/x', { name: 'Renamed' }),
        ctx(WEBHOOK_ID),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('flush')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('webhooks/[id] DELETE', async () => {
      installGuard('webhooks.endpoint', 'block')
      const res = await webhookDelete(makeRequest('DELETE'), ctx(WEBHOOK_ID))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('flush')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('webhooks/[id]/test POST', async () => {
      installGuard('webhooks.delivery', 'block')
      const res = await testPost(
        makeRequest('POST', 'http://localhost/api/webhooks/x/test', { eventType: 'webhooks.test.ping' }),
        ctx(WEBHOOK_ID),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('createWebhookDelivery')
      expect(writes).not.toContain('processWebhookDeliveryJob')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('allow verdict runs the write and fires after-success once', () => {
    it('webhook-deliveries/[id]/retry POST', async () => {
      installGuard('webhooks.delivery', 'allow')
      const res = await retryPost(makeRequest('POST'), ctx(DELIVERY_ID))
      expect(res.status).toBe(200)
      expect(writes).toContain('flush')
      expect(writes).toContain('enqueueWebhookDelivery')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('webhooks/[id]/rotate-secret POST', async () => {
      installGuard('webhooks.endpoint', 'allow')
      const res = await rotateSecretPost(makeRequest('POST'), ctx(WEBHOOK_ID))
      expect(res.status).toBe(200)
      expect(writes).toContain('flush')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('webhooks/[id] PUT', async () => {
      installGuard('webhooks.endpoint', 'allow')
      const res = await webhookPut(
        makeRequest('PUT', 'http://localhost/api/webhooks/x', { name: 'Renamed' }),
        ctx(WEBHOOK_ID),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('flush')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('webhooks/[id] DELETE', async () => {
      installGuard('webhooks.endpoint', 'allow')
      const res = await webhookDelete(makeRequest('DELETE'), ctx(WEBHOOK_ID))
      expect(res.status).toBe(200)
      expect(writes).toContain('flush')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('webhooks/[id]/test POST', async () => {
      installGuard('webhooks.delivery', 'allow')
      const res = await testPost(
        makeRequest('POST', 'http://localhost/api/webhooks/x/test', { eventType: 'webhooks.test.ping' }),
        ctx(WEBHOOK_ID),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('createWebhookDelivery')
      expect(writes).toContain('processWebhookDeliveryJob')
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

    const res = await rotateSecretPost(makeRequest('POST'), ctx(WEBHOOK_ID))
    expect(res.status).toBe(200)
    expect(writes).toContain('flush')
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })
})
