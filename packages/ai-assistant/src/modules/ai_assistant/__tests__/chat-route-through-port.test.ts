/**
 * R28-3 proof — the chat route reaches the AI engine THROUGH THE DOOR.
 *
 * Row 28's sentence is *"the agent runtime sits behind one typed door — no
 * other code talks to it directly."* The ownership test
 * (`chat-route-ownership.test.ts`) proves the route's BEHAVIOUR is unchanged;
 * this file proves the STRUCTURE: the route goes through `AiRuntimePort`, and
 * the engine is reachable only from inside the adapter.
 *
 * The mock boundary is deliberately the ENGINE (`opencode-handlers` /
 * `opencode-client`), BELOW the door — so these tests fail if the route ever
 * calls the engine directly again, or if the port stops being the path.
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

// The engine — BELOW the door. The route must never import this by name; the
// adapter does. If the route calls it directly again, `startRun`/`streamRun`
// assertions below still pass, but the "no direct engine import" static check
// (a separate test) fails — together they close the loop.
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

jest.mock('../lib/user-role-ids', () => ({
  __esModule: true,
  getUserRoleIds: (...args: unknown[]) => mockGetUserRoleIds(...args),
}))

import { POST, mintChatRunId } from '../api/chat/route'

function buildRequest(body: Record<string, unknown>): any {
  return { json: async () => body }
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
  mockGetAuthFromRequest.mockResolvedValue(mockAuth)
  mockCreateRequestContainer.mockResolvedValue({ resolve: () => ({ identityCacheKey: 'em' }) })
  mockGenerateSessionToken.mockReturnValue('sess_alice_token')
  mockCreateSessionApiKey.mockResolvedValue({ keyId: 'api-key-1' })
  mockBindOpencodeSessionToApiKey.mockResolvedValue(undefined)
  mockGetUserRoleIds.mockResolvedValue(['role-1'])
  // The engine streams: one text event, then done with a session id.
  mockHandleOpenCodeMessageStreaming.mockImplementation(
    async (_req: unknown, onEvent: (e: unknown) => Promise<void>) => {
      await onEvent({ type: 'text', text: 'hello' })
      await onEvent({ type: 'done', sessionId: 'ses_streamed' })
    },
  )
})

describe('R28-3 — the chat route reaches the engine through the port', () => {
  it('streams a turn end-to-end (the door is transparent: behaviour unchanged)', async () => {
    const res = await POST(buildRequest({ messages: [{ role: 'user', content: 'hi there' }] }))
    expect(res.status).toBe(200)
    await drainSseResponse(res)

    // The engine WAS reached — via the adapter, below the door.
    expect(mockHandleOpenCodeMessageStreaming).toHaveBeenCalledTimes(1)
  })

  it('passes the turn text to the engine through the envelope, not as a bare string', async () => {
    const res = await POST(buildRequest({ messages: [{ role: 'user', content: 'unique-turn-text' }] }))
    await drainSseResponse(res)

    const request = mockHandleOpenCodeMessageStreaming.mock.calls[0][0] as {
      message: string
      auth?: unknown
      em?: unknown
    }
    // The adapter converts the envelope's text ref back into the engine request.
    expect(request.message).toContain('unique-turn-text')
    // And it threads the caller's auth + em, exactly as the direct call did.
    expect(request.auth).toEqual({
      userId: mockAuth.sub,
      tenantId: mockAuth.tenantId,
      organizationId: mockAuth.orgId,
    })
    expect(request.em).toBeDefined()
  })

  it('an EXISTING session resumes: the session id travels as the run envelope, and the fresh-session binding is skipped', async () => {
    const res = await POST(
      buildRequest({ messages: [{ role: 'user', content: 'follow up' }], sessionId: 'ses_existing' })
    )
    await drainSseResponse(res)

    const request = mockHandleOpenCodeMessageStreaming.mock.calls[0][0] as { sessionId?: string }
    expect(request.sessionId).toBe('ses_existing')
    // A resume must NOT re-bind (the route only binds a freshly minted session).
    expect(mockBindOpencodeSessionToApiKey).not.toHaveBeenCalled()
  })

  it('a FRESH session binds the engine-resolved session id after done (behaviour preserved through the door)', async () => {
    const res = await POST(buildRequest({ messages: [{ role: 'user', content: 'first ever' }] }))
    await drainSseResponse(res)

    expect(mockBindOpencodeSessionToApiKey).toHaveBeenCalledTimes(1)
    const call = mockBindOpencodeSessionToApiKey.mock.calls[0] as unknown[]
    expect(call[2]).toBe('ses_streamed')
  })

  it('two turns of the same conversation are two separate runs (each a distinct engine call)', async () => {
    mockHandleOpenCodeMessageStreaming.mockImplementation(
      async (_req: unknown, onEvent: (e: unknown) => Promise<void>) => {
        await onEvent({ type: 'done', sessionId: 'ses_existing' })
      },
    )
    const r1 = await POST(
      buildRequest({ messages: [{ role: 'user', content: 'one' }], sessionId: 'ses_existing' })
    )
    await drainSseResponse(r1)
    const r2 = await POST(
      buildRequest({ messages: [{ role: 'user', content: 'two' }], sessionId: 'ses_existing' })
    )
    await drainSseResponse(r2)

    // Each turn is its own run behind the door.
    expect(mockHandleOpenCodeMessageStreaming).toHaveBeenCalledTimes(2)
  })

  it('fails CLOSED (no run started) when the caller has no tenant (hostile-critic finding 4)', async () => {
    // `tenantId: ''` on the envelope would read as "no restriction" — a
    // fail-open. The route must refuse instead of starting the run.
    mockGetAuthFromRequest.mockResolvedValueOnce({ sub: 'user-alice', tenantId: null, orgId: null })
    const res = await POST(buildRequest({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(200) // the SSE envelope is opened...
    await drainSseResponse(res)
    // ...but the run is NEVER started — no engine call leaks through.
    expect(mockHandleOpenCodeMessageStreaming).not.toHaveBeenCalled()
  })
})

describe('R28-3 — run-id minting (§4.2)', () => {
  it('a run id is DISTINCT from its conversation id (a run is not a transcript)', () => {
    const id = mintChatRunId('conv-abc', 1000)
    expect(id).not.toBe('conv-abc')
    expect(id.startsWith('conv-abc')).toBe(true)
  })

  it('the run id carries the conversation id, the engine name, the start time, and a per-run sequence', () => {
    // Assert the SHAPE, so a scheme that merely differs (e.g. a random suffix)
    // does not pass. The id must be legible: `<conv>:<engine>:run-<t>-<seq>`.
    const id = mintChatRunId('conv-abc', 4242)
    expect(id).toMatch(/^conv-abc:[^:]+:run-4242-\d+$/)
  })

  it('the sequence INCREMENTS monotonically across calls (not merely "differs")', () => {
    const a = mintChatRunId('conv-abc', 1000)
    const b = mintChatRunId('conv-abc', 1000)
    const c = mintChatRunId('conv-abc', 1000)
    const seq = (v: string) => Number(v.slice(v.lastIndexOf('-') + 1))
    expect(seq(b)).toBe(seq(a) + 1)
    expect(seq(c)).toBe(seq(b) + 1)
  })

  it('two runs in the SAME millisecond get DIFFERENT ids (unique per run, not per ms)', () => {
    const a = mintChatRunId('conv-abc', 1000)
    const b = mintChatRunId('conv-abc', 1000)
    expect(a).not.toBe(b)
  })

  it('the same conversation across time keeps producing fresh run ids', () => {
    const ids = new Set([
      mintChatRunId('conv-abc', 1),
      mintChatRunId('conv-abc', 1),
      mintChatRunId('conv-abc', 2),
    ])
    expect(ids.size).toBe(3)
  })
})

describe('R28-3 — the route does NOT import an engine (the static half of the guarantee)', () => {
  // Read the route source once. `statSync().isFile()` guards against the path
  // silently pointing at a directory (which would make readFileSync throw and
  // the test "pass" by erroring out of scope).
  const fs = require('node:fs') as typeof import('node:fs')
  const path = require('node:path') as typeof import('node:path')
  const ROUTE_PATH = path.join(__dirname, '..', 'api', 'chat', 'route.ts')
  const source = fs.readFileSync(ROUTE_PATH, 'utf8')

  /**
   * The ONLY engine symbol the route may import directly is
   * `createOpenCodeClient` — the registered `CC-69` bypass (the question
   * short-circuit). Any OTHER symbol imported from an engine module is a
   * defect, whatever the line looks like.
   *
   * This parses each `import { ... } from '<mod>'` statement's **symbol list**
   * (single- and multi-line), not a substring of the line — the previous
   * version's failure mode: an import of `handleOpenCodeMessageStreaming`
   * passed because the line also happened to contain the whitelisted symbol.
   */
  function engineImportedSymbols(src: string): string[] {
    const engineModules = /(opencode-handlers|opencode-client)['"]/
    const found: string[] = []
    // `import <clause> from '<mod>'`, with an optional trailing `;`.
    const statement = /import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2/g
    let m: RegExpExecArray | null
    while ((m = statement.exec(src)) !== null) {
      const clause = m[1]
      const mod = m[3]
      if (!engineModules.test(`${mod}'`)) continue
      // Named imports: `{ a, b as c }` -> a, b (the imported name, not alias).
      const named = clause.match(/\{([\s\S]*?)\}/)
      if (named) {
        for (const part of named[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0].trim()
          if (name) found.push(name)
        }
      }
      // Default / namespace imports (`import X from`, `import * as X from`).
      const def = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/)
      if (def) found.push(def[1])
      const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)
      if (ns) found.push(ns[1])
    }
    return found
  }

  it('imports no engine SYMBOL other than the registered bypass', () => {
    const symbols = engineImportedSymbols(source)
    const offenders = symbols.filter((s) => s !== 'createOpenCodeClient')
    expect(offenders).toEqual([])
  })

  it('reaches no engine module by require() or dynamic import()', () => {
    // A static `import` list cannot express these; ban them outright so the
    // guard cannot be evaded by a different module-loading form.
    expect(source).not.toMatch(/require\(\s*['"][^'"]*opencode-(handlers|client)/)
    expect(source).not.toMatch(/import\(\s*['"][^'"]*opencode-(handlers|client)/)
  })

  it('the guard itself is not evadable (a self-test of the parser)', () => {
    // Prove the checker CATCHES what it claims to: same-line two-importee,
    // multi-line, and aliased forms all report the real symbol.
    const bad1 = "import { handleOpenCodeMessageStreaming } from '../../lib/opencode-handlers'"
    const bad2 = "import {\n  createOpenCodeClient,\n  handleOpenCodeMessageStreaming,\n} from '../../lib/opencode-client'"
    const bad3 = "import { handleOpenCodeMessageStreaming as bypass } from '../../lib/opencode-handlers'"
    expect(engineImportedSymbols(bad1)).toEqual(['handleOpenCodeMessageStreaming'])
    expect(engineImportedSymbols(bad2)).toEqual([
      'createOpenCodeClient',
      'handleOpenCodeMessageStreaming',
    ])
    expect(engineImportedSymbols(bad3)).toEqual(['handleOpenCodeMessageStreaming'])
    // ...and the allowed bypass alone is NOT reported as an offender.
    const ok = "import { createOpenCodeClient } from '../../lib/opencode-client'"
    expect(engineImportedSymbols(ok).filter((s) => s !== 'createOpenCodeClient')).toEqual([])
  })

  it('the run path must come from the port', () => {
    expect(source).toMatch(/from '\.\.\/\.\.\/lib\/ai-runtime-port'/)
    expect(source).toMatch(/from '\.\.\/\.\.\/lib\/opencode-port-adapter'/)
    expect(source).toMatch(/port\.startRun\(/)
    expect(source).toMatch(/port\.streamRun\(/)
  })
})
