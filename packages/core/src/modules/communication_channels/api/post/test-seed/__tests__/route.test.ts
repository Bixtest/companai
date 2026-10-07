/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): `communication_channels` read as **4 unguarded verbs
 * across 4 files**. Measured first (tool `--json` + a hand read of every `.ts`
 * under `api/`), the 4 split three ways:
 *
 *   - 2 ACTOR-LESS  -> `webhook/[provider]` and `webhooks/gmail`: both
 *     `requireAuth: false`; the provider signature / Google-signed JWT IS the
 *     auth, and no session is read. Set aside by name in the tool, not wired.
 *   - 1 READ-ONLY   -> `oauth/[provider]/initiate`: authenticated, but it builds
 *     an authorize URL and sets a state cookie, and writes NO business row
 *     (`lib/oauth-state.ts` has no persist/flush). Set aside in the tool.
 *   - 1 GENUINE WRITE -> `test-seed` (this file). It is env-gated
 *     (`OM_ENABLE_TEST_CHANNEL_SEEDING`, production default off -> 404), but
 *     when enabled it writes real business rows and it HAS a real actor, so the
 *     registry guard set CAN be evaluated. That is why it is wired rather than
 *     set aside.
 *
 * This suite proves the wired verbs run the registry, by registering a **real**
 * guard in the global store (`registerMutationGuards`) and driving the **real**
 * route handler with `runRouteMutationGuards` left **UNMOCKED**. Mocking the
 * wrapper would only prove a function of that name is called.
 *
 * Both actions are covered: `connect-channel` (kind
 * `communication_channels.channel`) and `emit-inbound` (kind
 * `communication_channels.message`).
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222'

// ── Real registry (not stubbed) ────────────────────────────────────────────
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable side-effect record ──────────────────────────────────────────
const commandExecuteMock = jest.fn()
const emCreateMock = jest.fn()
const emPersistMock = jest.fn()
const emFlushMock = jest.fn()
const emExecuteMock = jest.fn()
const emitMock = jest.fn(async () => undefined)
const runAfterSuccessMock = jest.fn(async () => undefined)
const seen: Array<{ kind: string; operation: string; resourceId: string }> = []

// ── Shared auth ────────────────────────────────────────────────────────────
let currentAuth: Record<string, unknown> | null = {
  sub: USER_ID,
  tenantId: TENANT_ID,
  orgId: ORG_ID,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => currentAuth),
}))

// The env gate is forced ON so the route is reachable; the 404 path is tested
// separately by flipping this flag.
let seedingEnabled = true
jest.mock('../../../../lib/test-seed', () => ({
  TEST_SEED_PROVIDER_KEY: '__test_seed__',
  ensureTestSeedAdapterRegistered: jest.fn(),
  isTestChannelSeedingEnabled: () => seedingEnabled,
}))

jest.mock('../../../../commands/connect-credential-channel', () => ({
  COMMUNICATION_CHANNELS_CONNECT_CREDENTIAL_CHANNEL_COMMAND_ID: 'test.connect-credential-channel',
}))

jest.mock('../../../../events', () => ({
  emitCommunicationChannelsEvent: (...args: unknown[]) => emitMock(...args),
}))

const emStub = {
  create: (entity: unknown, data: unknown) => {
    emCreateMock(entity, data)
    return { id: `created-${emCreateMock.mock.calls.length}`, ...(data as object) }
  },
  persist: emPersistMock,
  flush: emFlushMock,
  getConnection: () => ({ execute: emExecuteMock }),
  // The route forks the request EntityManager before writing (real MikroORM
  // behaviour: a forked em shares the persistence context). The stub has no
  // persistence context, so fork returns the same observable stub.
  fork: () => emStub,
}

function resolveStub(key: string): unknown {
  switch (key) {
    case 'em':
      return emStub
    case 'commandBus':
      return { execute: commandExecuteMock }
    case 'rbacService':
      return {
        getGrantedFeatures: async () => [],
        loadAcl: async () => ({ isSuperAdmin: false, features: [], organizations: null }),
      }
    default:
      throw new Error(`unexpected resolve: ${key}`)
  }
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => resolveStub(key),
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

// ── The route module is real; only its WRITE targets are observed. ─────────
import { POST as testSeedPost } from '../route'

function installGuard(kind: string, mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: `test.cc.${kind}.guard`,
    targetEntity: kind,
    operations: ['create', 'update', 'delete', 'custom'],
    priority: 0,
    async validate(input) {
      seen.push({
        kind: input.resourceKind,
        operation: input.operation,
        resourceId: input.resourceId,
      })
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

function post(body: unknown) {
  return new Request('http://localhost/api/communication_channels/test-seed', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  seen.length = 0
  seedingEnabled = true
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  commandExecuteMock.mockResolvedValue({
    result: { status: 'connected', channelId: 'ch-1', externalIdentifier: 'seed@test-seed.local' },
  })
  emExecuteMock.mockResolvedValue([{ id: 'msg-1' }])
  registerMutationGuards([])
})

describe('communication_channels test-seed D2-gap wiring — reaches the registry', () => {
  describe('connect-channel (kind communication_channels.channel)', () => {
    const KIND = 'communication_channels.channel'

    it('block stops the command and does not fire after-success', async () => {
      installGuard(KIND, 'block')
      const res = await testSeedPost(post({ action: 'connect-channel' }))
      expect(res.status).toBe(422)
      expect(commandExecuteMock).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('allow runs the command once and fires after-success once', async () => {
      installGuard(KIND, 'allow')
      const res = await testSeedPost(post({ action: 'connect-channel' }))
      expect(res.status).toBe(201)
      expect(commandExecuteMock).toHaveBeenCalledTimes(1)
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: KIND, operation: 'create' })
    })
  })

  describe('emit-inbound (kind communication_channels.message)', () => {
    const KIND = 'communication_channels.message'

    it('block stops the write and does not fire after-success', async () => {
      installGuard(KIND, 'block')
      const res = await testSeedPost(post({ action: 'emit-inbound', channelId: CHANNEL_ID }))
      expect(res.status).toBe(422)
      expect(emCreateMock).not.toHaveBeenCalled()
      expect(emPersistMock).not.toHaveBeenCalled()
      expect(emitMock).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('allow performs the write and fires after-success once', async () => {
      installGuard(KIND, 'allow')
      const res = await testSeedPost(post({ action: 'emit-inbound', channelId: CHANNEL_ID }))
      expect(res.status).toBe(201)
      // Two entities are created: ExternalConversation (:206) then
      // MessageChannelLink (:247). Each is persisted + flushed. No
      // ChannelThreadMapping (createThreadMapping is not set).
      expect(emCreateMock).toHaveBeenCalledTimes(2)
      expect(emPersistMock).toHaveBeenCalledTimes(2)
      expect(emFlushMock).toHaveBeenCalledTimes(2)
      expect(emExecuteMock).toHaveBeenCalledTimes(1) // the raw messages INSERT
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: KIND, operation: 'create' })
    })
  })

  it('a guard OUTSIDE both kinds does not fire (control)', async () => {
    installGuard('some.other.entity', 'block')
    const res = await testSeedPost(post({ action: 'connect-channel' }))
    expect(res.status).toBe(201)
    expect(commandExecuteMock).toHaveBeenCalledTimes(1)
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('the env gate returns 404 before the guard runs when seeding is disabled', async () => {
    seedingEnabled = false
    installGuard('communication_channels.channel', 'block')
    const res = await testSeedPost(post({ action: 'connect-channel' }))
    expect(res.status).toBe(404)
    expect(commandExecuteMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })

  it('an unauthenticated request is rejected before the guard runs (401)', async () => {
    currentAuth = null
    installGuard('communication_channels.channel', 'block')
    const res = await testSeedPost(post({ action: 'connect-channel' }))
    expect(res.status).toBe(401)
    expect(commandExecuteMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })

  it('an invalid body is 422 before the guard runs', async () => {
    installGuard('communication_channels.channel', 'block')
    const res = await testSeedPost(post({ action: 'nonsense' }))
    expect(res.status).toBe(422)
    expect(seen).toHaveLength(0)
  })
})
