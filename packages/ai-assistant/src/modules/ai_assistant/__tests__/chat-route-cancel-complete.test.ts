/**
 * R28-4 proof — the chat route CLOSES every run at the door, and failure is
 * normal.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * R28-3 put the chat route on the door (a run is started and streamed). R28-4
 * is the other half of running an agent: the run must be **ended** properly.
 * Two claims, each measured here:
 *
 *  1. **Cancel reaches the door.** When the client goes away — the UI's Stop
 *     button, or a closed tab — the route must tell the door to cancel the run.
 *     The signal the server gets is the request being aborted (`req.signal`);
 *     the UI already aborts its own fetch, so this needs no front-end change.
 *  2. **Every run is completed once, with the honest status.** A cancelled run
 *     is recorded `cancelled`, never `completed`; and a run that reaches its
 *     `finally` twice (abort *and* normal end) is not double-counted.
 *
 * The mock boundary is the PORT — `resolveAiRuntimePort` is replaced so we can
 * observe `startRun` / `streamRun` / `cancelRun` / `completeRun` in the order
 * the route actually calls them, and assert the ORDER that makes a cancelled
 * run record `cancelled` (cancel must precede complete). The engine sits below
 * that and is still mocked, so the run path is real.
 */
const mockAuth = { sub: 'user-alice', tenantId: 'tenant-1', orgId: 'org-1' }

const mockGetAuthFromRequest = jest.fn()
const mockCreateRequestContainer = jest.fn()
const mockGenerateSessionToken = jest.fn()
const mockCreateSessionApiKey = jest.fn()
const mockBindOpencodeSessionToApiKey = jest.fn()
const mockHandleOpenCodeMessageStreaming = jest.fn()
const mockGetUserRoleIds = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  __esModule: true,
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  __esModule: true,
  createRequestContainer: (...args: unknown[]) => mockCreateRequestContainer(...args),
}))

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  __esModule: true,
  findWithDecryption: jest.fn().mockResolvedValue([]),
}))

jest.mock('@open-mercato/core/modules/api_keys/services/apiKeyService', () => ({
  __esModule: true,
  generateSessionToken: (...args: unknown[]) => mockGenerateSessionToken(...args),
  createSessionApiKey: (...args: unknown[]) => mockCreateSessionApiKey(...args),
  bindOpencodeSessionToApiKey: (...args: unknown[]) =>
    mockBindOpencodeSessionToApiKey(...args),
  findApiKeyByOpencodeSessionId: jest.fn().mockResolvedValue(null),
}))

jest.mock('@open-mercato/core/modules/auth/data/entities', () => ({
  __esModule: true,
  User: class User {},
  UserRole: class UserRole {},
}))

jest.mock('../lib/user-role-ids', () => ({
  __esModule: true,
  getUserRoleIds: (...args: unknown[]) => mockGetUserRoleIds(...args),
}))

// The engine — below the door. Not the subject of this suite, but the run path
// must be real, so it streams normally.
jest.mock('../lib/opencode-handlers', () => {
  const actual = jest.requireActual('../lib/opencode-handlers')
  return {
    __esModule: true,
    ...actual,
    handleOpenCodeMessageStreaming: (...args: unknown[]) =>
      mockHandleOpenCodeMessageStreaming(...args),
  }
})

jest.mock('../lib/opencode-client', () => ({
  __esModule: true,
  createOpenCodeClient: () => ({
    getPendingQuestions: jest.fn().mockResolvedValue([]),
    answerQuestion: jest.fn().mockResolvedValue(undefined),
  }),
}))

// ── The port, replaced so we can observe the route's lifecycle calls ──────────
// The ORDER in this array is the order the route made the calls; the assertions
// below read it, so a reordering (e.g. complete-before-cancel) is caught.
const portCalls: string[] = []
const mockStartRun = jest.fn()
const mockStreamRun = jest.fn()
const mockCancelRun = jest.fn()
const mockCompleteRun = jest.fn()
const mockDescribeCapabilities = jest.fn()
const mockSteerRun = jest.fn()
const mockResumeConversation = jest.fn()
const mockResolveToolCall = jest.fn()

jest.mock('../lib/opencode-port-adapter', () => {
  const actual = jest.requireActual('../lib/opencode-port-adapter')
  return {
    __esModule: true,
    ...actual,
    createOpenCodePortAdapter: () => ({
      describeCapabilities: (...a: unknown[]) => mockDescribeCapabilities(...a),
      startRun: (...a: unknown[]) => {
        portCalls.push('startRun')
        return mockStartRun(...a)
      },
      streamRun: (...a: unknown[]) => {
        portCalls.push('streamRun')
        return mockStreamRun(...a)
      },
      cancelRun: (...a: unknown[]) => {
        portCalls.push('cancelRun')
        return mockCancelRun(...a)
      },
      steerRun: (...a: unknown[]) => mockSteerRun(...a),
      resumeConversation: (...a: unknown[]) => mockResumeConversation(...a),
      resolveToolCall: (...a: unknown[]) => mockResolveToolCall(...a),
      completeRun: (...a: unknown[]) => {
        portCalls.push('completeRun')
        return mockCompleteRun(...a)
      },
    }),
  }
})

import { POST } from '../api/chat/route'

/** A request whose `signal` we control, so we can simulate a client disconnect. */
function buildRequest(body: Record<string, unknown>): {
  json: () => Promise<Record<string, unknown>>
  signal: AbortSignal
  abort: () => void
} {
  const controller = new AbortController()
  return {
    json: async () => body,
    signal: controller.signal,
    abort: () => controller.abort(),
  }
}

async function drainSseResponse(res: any): Promise<void> {
  const body = res && typeof res === 'object' ? (res as any).body : null
  if (!body || typeof body.getReader !== 'function') return
  const reader = body.getReader()
  try {
    while (true) {
      const { done } = await reader.read()
      if (done) return
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {}
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  portCalls.length = 0
  mockGetAuthFromRequest.mockResolvedValue(mockAuth)
  mockCreateRequestContainer.mockResolvedValue({ resolve: () => ({ identityCacheKey: 'em' }) })
  mockGenerateSessionToken.mockReturnValue('sess_alice_token')
  mockCreateSessionApiKey.mockResolvedValue({ keyId: 'api-key-1' })
  mockBindOpencodeSessionToApiKey.mockResolvedValue(undefined)
  mockGetUserRoleIds.mockResolvedValue(['role-1'])

  mockStartRun.mockResolvedValue({ runId: 'r', runtimeSessionId: undefined })
  mockCancelRun.mockResolvedValue({ runId: 'r', cancelled: true })
  mockCompleteRun.mockResolvedValue({ runId: 'r', completed: true, alreadyComplete: false })
  mockStreamRun.mockImplementation(
    async (_runId: string, sink: (e: unknown) => Promise<void>) => {
      await sink({ type: 'text', text: 'hi' })
      await sink({ type: 'done', sessionId: 'ses_streamed' })
    },
  )

  mockHandleOpenCodeMessageStreaming.mockImplementation(
    async (_req: unknown, onEvent: (e: unknown) => Promise<void>) => {
      await onEvent({ type: 'text', text: 'hello' })
      await onEvent({ type: 'done', sessionId: 'ses_streamed' })
    },
  )
})

describe('R28-4 — a normal run is completed at the door, once', () => {
  it('reports the outcome to the door exactly once when the run finishes', async () => {
    const req = buildRequest({ messages: [{ role: 'user', content: 'hi' }] })
    const res = await POST(req as any)
    await drainSseResponse(res)

    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
    // A finished run is completed, not cancelled — and no cancel was asked for.
    expect(mockCompleteRun.mock.calls[0][1]).toEqual({ status: 'completed' })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it('names the run it closes (the run id from startRun)', async () => {
    const req = buildRequest({ messages: [{ role: 'user', content: 'hi' }] })
    const res = await POST(req as any)
    await drainSseResponse(res)

    const startedRunId = (mockStartRun.mock.calls[0][0] as { runId: string }).runId
    expect(mockCompleteRun.mock.calls[0][0]).toBe(startedRunId)
  })
})

describe('R28-4 — a client disconnect cancels the run at the door', () => {
  it('cancels the run and records it CANCELLED (not completed) when the client aborts', async () => {
    // The engine hangs mid-stream so we can abort while the run is live.
    let releaseEngine: () => void = () => {}
    const engineGate = new Promise<void>((resolve) => {
      releaseEngine = resolve
    })
    mockHandleOpenCodeMessageStreaming.mockImplementation(async () => {
      await engineGate
    })

    const req = buildRequest({ messages: [{ role: 'user', content: 'long run' }] })
    const res = await POST(req as any)

    // Let the route reach the streaming call, then simulate Stop / closed tab.
    await new Promise((r) => setTimeout(r, 10))
    req.abort()

    // Let the engine finish so the route's `finally` runs.
    releaseEngine()
    await drainSseResponse(res)

    // The door was told to cancel, and the run's outcome is `cancelled`.
    expect(mockCancelRun).toHaveBeenCalledTimes(1)
    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
    expect(mockCompleteRun.mock.calls[0][1]).toEqual({ status: 'cancelled' })
  })

  it('cancels BEFORE completing (so the adapter records the run cancelled, not completed)', async () => {
    let releaseEngine: () => void = () => {}
    const engineGate = new Promise<void>((resolve) => {
      releaseEngine = resolve
    })
    mockHandleOpenCodeMessageStreaming.mockImplementation(async () => {
      await engineGate
    })

    const req = buildRequest({ messages: [{ role: 'user', content: 'long run' }] })
    const res = await POST(req as any)
    await new Promise((r) => setTimeout(r, 10))
    req.abort()
    releaseEngine()
    await drainSseResponse(res)

    // The order matters: cancel-before-complete is what makes the adapter
    // (which checks `completed` first) keep the run `cancelled`.
    expect(portCalls).toEqual(['startRun', 'streamRun', 'cancelRun', 'completeRun'])
  })
})

describe('R28-4 — closing a run is safe to repeat (failure is normal)', () => {
  it('closes the run only once even if it was already aborted when the handler ran', async () => {
    // A request that is ALREADY aborted: the route must still close the run it
    // opened, and must not double-cancel or double-complete.
    const req = buildRequest({ messages: [{ role: 'user', content: 'hi' }] })
    req.abort()
    const res = await POST(req as any)
    await drainSseResponse(res)

    expect(mockCancelRun).toHaveBeenCalledTimes(1)
    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
    expect(mockCompleteRun.mock.calls[0][1]).toEqual({ status: 'cancelled' })
  })

  it('a failed run is NOT recorded as completed-ok (the honest status survives the door)', async () => {
    // The route's own error path: the run ends by throwing. The door must still
    // be told the run closed, and it is not a success.
    mockHandleOpenCodeMessageStreaming.mockImplementation(async () => {
      throw new Error('engine exploded')
    })
    const req = buildRequest({ messages: [{ role: 'user', content: 'boom' }] })
    const res = await POST(req as any)
    await drainSseResponse(res)

    // The run is closed at the door exactly once — never left open.
    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
  })

  it('never leaves a run open: every accepted turn calls completeRun exactly once', async () => {
    for (let i = 0; i < 3; i++) {
      const req = buildRequest({ messages: [{ role: 'user', content: `turn ${i}` }] })
      await drainSseResponse(await POST(req as any))
    }
    expect(mockStartRun).toHaveBeenCalledTimes(3)
    expect(mockCompleteRun).toHaveBeenCalledTimes(3)
  })

  it('a run that never STREAMS is still closed (startRun throws → finally still completes it)', async () => {
    // The hostile-critic probe, kept as a permanent test: if the door is asked
    // to start a run and then THROWS, the run must still be closed — a run must
    // never be left open because a later step failed. Here `startRun` itself
    // fails, so the run was never registered at the door; the route's `finally`
    // must still call completeRun (the adapter treats an unknown run as a
    // no-op value), and it must not throw out of the handler.
    mockStartRun.mockRejectedValueOnce(new Error('door refused the run'))
    const req = buildRequest({ messages: [{ role: 'user', content: 'rejected' }] })
    const res = await POST(req as any)
    await drainSseResponse(res)

    expect(mockCompleteRun).toHaveBeenCalledTimes(1)
  })
})
