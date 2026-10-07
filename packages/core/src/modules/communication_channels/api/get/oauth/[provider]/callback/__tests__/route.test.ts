/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the OAuth callback is a **GET that writes**. The
 * method-based write-verb scan counts POST/PUT/PATCH/DELETE, so this route was
 * invisible to it — it reached no guard AND was never counted. Found by a
 * hostile-critic pass over the `communication_channels` close-out. A write is a
 * write regardless of HTTP method, so it now runs the same registry guard the
 * credential-connect path uses (`resourceKind` `communication_channels.channel`,
 * `operation` `create`) before any write.
 *
 * This suite proves that wiring by registering a **real** guard in the global
 * store (`registerMutationGuards`) and driving the **real** GET handler with
 * `runRouteMutationGuards` left **UNMOCKED**. Mocking the wrapper would only
 * prove a function of that name is called.
 *
 * The route's contract is to ALWAYS redirect, so a block is asserted as a 302
 * with `flash=error&code=forbidden` (not a JSON body), and — critically — the
 * channel-creating write must NOT have run.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const PROVIDER = 'test'

// ── Real registry (not stubbed) ────────────────────────────────────────────
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable side-effect record ──────────────────────────────────────────
const createConnectedChannelRowMock = jest.fn()
const runAfterSuccessMock = jest.fn(async () => undefined)
const verifyOAuthStateMock = jest.fn()
const resolveOAuthClientCredentialsMock = jest.fn()
const getChannelAdapterMock = jest.fn()
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

const emStub = {
  fork: () => emStub,
  getConnection: () => ({ execute: jest.fn(async () => []) }),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      switch (key) {
        case 'em':
          return emStub
        case 'integrationCredentialsService':
          // No `save` method -> `credentialsPersisted` stays false, so the route
          // skips its dynamic IntegrationCredentials import and still reaches the
          // channel-creating write we assert on.
          return { resolve: async () => ({ clientId: 'c', clientSecret: 's' }) }
        case 'rbacService':
          return {
            getGrantedFeatures: async () => [],
            loadAcl: async () => ({ isSuperAdmin: false, features: [], organizations: null }),
          }
        default:
          return undefined
      }
    },
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

jest.mock('../../../../../../lib/connect-channel', () => ({
  createConnectedChannelRow: (...args: unknown[]) => createConnectedChannelRowMock(...args),
  MailboxAlreadyConnectedError: class MailboxAlreadyConnectedError extends Error {},
}))

jest.mock('../../../../../../lib/adapter-registry-singleton', () => ({
  getChannelAdapter: (...args: unknown[]) => getChannelAdapterMock(...args),
}))

jest.mock('../../../../../../lib/oauth-client-config', () => ({
  resolveOAuthClientCredentials: (...args: unknown[]) => resolveOAuthClientCredentialsMock(...args),
}))

jest.mock('../../../../../../lib/oauth-state', () => ({
  COMMUNICATION_CHANNELS_OAUTH_STATE_COOKIE_NAME: 'cc_oauth_state',
  DEFAULT_OAUTH_RETURN_URL: '/backend/communication-channels',
  normalizeOAuthReturnUrl: (u: string | undefined, d: string) => u || d,
  OAuthStateError: class OAuthStateError extends Error {
    code: string
    constructor(code: string) {
      super(code)
      this.code = code
    }
  },
  verifyOAuthState: (...args: unknown[]) => verifyOAuthStateMock(...args),
}))

// ── The route module is real; only its WRITE targets are observed. ─────────
import { GET as callbackGet } from '../route'

function installGuard(kind: string, mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: `test.cc.callback.${kind}.guard`,
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

function callbackReq() {
  return new Request(
    `http://localhost/api/communication_channels/oauth/${PROVIDER}/callback?code=abc&state=xyz`,
    { method: 'GET', headers: { cookie: 'cc_oauth_state=signed-state' } },
  )
}

const context = { params: Promise.resolve({ provider: PROVIDER }) }

beforeEach(() => {
  jest.clearAllMocks()
  seen.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  verifyOAuthStateMock.mockReturnValue({
    tenantId: TENANT_ID,
    organizationId: ORG_ID,
    returnUrl: '/backend/communication-channels',
    userId: USER_ID,
    extra: null,
  })
  resolveOAuthClientCredentialsMock.mockResolvedValue({ clientId: 'c', clientSecret: 's' })
  getChannelAdapterMock.mockReturnValue({
    exchangeOAuthCode: jest.fn(async () => ({
      credentials: { accessToken: 't' },
      externalIdentifier: 'seed@test.local',
      displayName: 'Test Channel',
      expiresAt: null,
    })),
  })
  createConnectedChannelRowMock.mockResolvedValue({ id: 'channel-1' })
  registerMutationGuards([])
})

describe('communication_channels OAuth callback (GET that writes) — reaches the registry', () => {
  const KIND = 'communication_channels.channel'

  it('block prevents the channel-creating write and redirects with an error flash', async () => {
    installGuard(KIND, 'block')
    const res = await callbackGet(callbackReq(), context)
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('flash=error')
    expect(loc).toContain('code=forbidden')
    expect(createConnectedChannelRowMock).not.toHaveBeenCalled()
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('allow performs the write and fires after-success once', async () => {
    installGuard(KIND, 'allow')
    const res = await callbackGet(callbackReq(), context)
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('flash=connected')
    expect(createConnectedChannelRowMock).toHaveBeenCalledTimes(1)
    expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    expect(seen[0]).toMatchObject({ kind: KIND, operation: 'create' })
  })

  it('a guard OUTSIDE the kind does not fire (control)', async () => {
    installGuard('some.other.entity', 'block')
    const res = await callbackGet(callbackReq(), context)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('flash=connected')
    expect(createConnectedChannelRowMock).toHaveBeenCalledTimes(1)
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('an unauthenticated request is rejected before the guard runs', async () => {
    currentAuth = null
    installGuard(KIND, 'block')
    const res = await callbackGet(callbackReq(), context)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('code=unauthorized')
    expect(createConnectedChannelRowMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })

  it('a tenant mismatch is rejected before the guard runs', async () => {
    verifyOAuthStateMock.mockReturnValue({
      tenantId: 'other-tenant',
      organizationId: ORG_ID,
      returnUrl: '/backend/communication-channels',
      userId: USER_ID,
      extra: null,
    })
    installGuard(KIND, 'block')
    const res = await callbackGet(callbackReq(), context)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('code=tenant_mismatch')
    expect(seen).toHaveLength(0)
  })
})
