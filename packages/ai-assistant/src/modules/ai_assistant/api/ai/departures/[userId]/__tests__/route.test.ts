/**
 * @jest-environment node
 *
 * CC-127 — the departure flow's two HTTP verbs.
 *
 * The cascade module is mocked here on purpose: `lib/__tests__/departure.test.ts`
 * proves what it reads and writes. This suite proves the contract around it —
 * which feature is required, what happens when the decision is missing or wrong,
 * that a blocked act never reaches the delete, and that a failure **after** the
 * delete is reported as `departure_partial` rather than as "nothing happened".
 */
const authMock = jest.fn()
const loadAclMock = jest.fn()
const createRequestContainerMock = jest.fn()
const previewMock = jest.fn()
const applyMock = jest.fn()
const guardMock = jest.fn()
const commandExecuteMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainerMock(...args),
}))

jest.mock('../../../../mutation-guard', () => ({
  beginAiAssistantMutationGuard: (...args: unknown[]) => guardMock(...args),
}))

jest.mock('../../../../../lib/departure', () => ({
  previewDeparture: (...args: unknown[]) => previewMock(...args),
  applyDeparture: (...args: unknown[]) => applyMock(...args),
  DEPARTURE_DECISIONS: ['deactivate', 'leave'],
  DEFAULT_DEPARTURE_DECISION: 'deactivate',
  DEPARTURE_INERT_REASON: 'the credential dies with its owner',
}))

import { CommandInterceptorError } from '@open-mercato/shared/lib/commands'
import { GET, POST } from '../route'

const USER_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const BASE = `http://localhost/api/ai_assistant/ai/departures/${USER_ID}`

function ctx(userId = USER_ID) {
  return { params: Promise.resolve({ userId }) }
}

function jsonReq(method: string, body?: unknown, url = BASE): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function preview(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: USER_ID, email: 'lea@example.com', name: 'Lea' },
    agents: [
      {
        agentId: 'sales.assistant',
        principalId: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
        keyName: 'Lea session key',
        organizationId: 'org-1',
        keyLink: 'session',
      },
    ],
    delegations: [
      {
        id: 'd-1',
        direction: 'granted',
        capabilityId: 'auth.users.delete',
        expiresAt: '2026-11-01T00:00:00.000Z',
        alreadyRevoked: false,
      },
    ],
    default: 'deactivate',
    ...overrides,
  }
}

function receipt(decision = 'deactivate') {
  return {
    userId: USER_ID,
    decision,
    user: { id: USER_ID, email: 'lea@example.com', name: 'Lea' },
    agents: [],
    delegations: [],
    counts: { agents: 0, agentsRevoked: 0, delegations: 0, delegationsRevoked: 0 },
  }
}

describe('CC-127 — /api/ai_assistant/ai/departures/[userId]', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: 'tenant-1', orgId: 'org-1' })
    loadAclMock.mockResolvedValue({
      features: ['auth.users.delete', 'ai_assistant.settings.manage'],
      isSuperAdmin: false,
    })
    createRequestContainerMock.mockResolvedValue({
      resolve: (key: string) => {
        if (key === 'rbacService') {
          return {
            loadAcl: loadAclMock,
            hasAllFeatures: (required: string[], held: string[]) =>
              required.every((feature) => held.includes(feature)),
          }
        }
        if (key === 'em') return {}
        if (key === 'commandBus') return { execute: commandExecuteMock }
        if (key === 'delegationService') return { revoke: jest.fn() }
        return {}
      },
    })
    previewMock.mockResolvedValue(preview())
    applyMock.mockResolvedValue(receipt())
    commandExecuteMock.mockResolvedValue({ result: {}, logEntry: null })
    guardMock.mockResolvedValue({
      blockedResponse: undefined,
      runAfterSuccess: jest.fn(async () => undefined),
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // ── the question ────────────────────────────────────────────────────────────

  it('GET returns the preview', async () => {
    const res = await GET(jsonReq('GET') as never, ctx() as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.default).toBe('deactivate')
    expect(body.agents).toHaveLength(1)
    expect(previewMock).toHaveBeenCalledWith({
      userId: USER_ID,
      tenantId: 'tenant-1',
      em: expect.anything(),
    })
  })

  it('GET 404s for a user that is not in the tenant', async () => {
    previewMock.mockResolvedValue(null)
    const res = await GET(jsonReq('GET') as never, ctx() as never)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('departure_target_not_found')
  })

  it('GET 404s — not 403 — when the caller has no tenant', async () => {
    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: null, orgId: null })
    const res = await GET(jsonReq('GET') as never, ctx() as never)
    expect(res.status).toBe(404)
    expect(previewMock).not.toHaveBeenCalled()
  })

  it('GET 400s on a non-uuid user id', async () => {
    const res = await GET(jsonReq('GET', undefined, 'http://localhost/x/departures/lea') as never, ctx('lea') as never)
    expect(res.status).toBe(400)
    expect(previewMock).not.toHaveBeenCalled()
  })

  it('GET 403s when the caller holds only ONE of the two features', async () => {
    loadAclMock.mockResolvedValue({
      features: ['auth.users.delete'],
      isSuperAdmin: false,
    })
    const res = await GET(jsonReq('GET') as never, ctx() as never)
    expect(res.status).toBe(403)
    expect(previewMock).not.toHaveBeenCalled()
  })

  // ── the answer ──────────────────────────────────────────────────────────────

  it('POST with no body takes the safe default and names it', async () => {
    const res = await POST(jsonReq('POST') as never, ctx() as never)
    expect(res.status).toBe(200)
    expect(commandExecuteMock).toHaveBeenCalledWith('auth.users.delete', expect.anything())
    expect(applyMock).toHaveBeenCalledWith(expect.objectContaining({ decision: 'deactivate' }))
    expect((await res.json()).decision).toBe('deactivate')
  })

  it('POST carries the decision into the audit context of the delete', async () => {
    await POST(jsonReq('POST', { decision: 'leave' }) as never, ctx() as never)
    const [, options] = commandExecuteMock.mock.calls[0]
    expect(options.input).toEqual({ id: USER_ID })
    expect(options.metadata).toEqual({
      context: { departure: { decision: 'leave', agents: 1, delegations: 1 } },
    })
  })

  it('POST 400s on an unknown decision and does not delete', async () => {
    const res = await POST(jsonReq('POST', { decision: 'block' }) as never, ctx() as never)
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('invalid_decision')
    expect(commandExecuteMock).not.toHaveBeenCalled()
  })

  it('POST 400s on malformed JSON and does not delete', async () => {
    const res = await POST(
      new Request(BASE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      }) as never,
      ctx() as never,
    )
    expect(res.status).toBe(400)
    expect(commandExecuteMock).not.toHaveBeenCalled()
  })

  it('POST 404s when the preview finds nobody, and never reaches the delete', async () => {
    previewMock.mockResolvedValue(null)
    const res = await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(res.status).toBe(404)
    expect(commandExecuteMock).not.toHaveBeenCalled()
  })

  it('POST 403s when the caller lacks `auth.users.delete`', async () => {
    loadAclMock.mockResolvedValue({
      features: ['ai_assistant.settings.manage'],
      isSuperAdmin: false,
    })
    const res = await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(res.status).toBe(403)
    expect(commandExecuteMock).not.toHaveBeenCalled()
  })

  // ── the guard, and what it may not skip ─────────────────────────────────────

  it('deactivate runs the binding guard before the delete', async () => {
    await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(guardMock).toHaveBeenCalledTimes(1)
    expect(guardMock.mock.calls[0][0]).toMatchObject({
      resourceKind: 'ai_assistant.agent_binding',
      operation: 'delete',
      resourceId: `departure:${USER_ID}`,
    })
  })

  it('a blocked guard stops the departure before anything is deleted', async () => {
    const blocked = new Response(JSON.stringify({ code: 'pending_approval' }), { status: 202 })
    guardMock.mockResolvedValue({ blockedResponse: blocked, runAfterSuccess: jest.fn() })
    const res = await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(res.status).toBe(202)
    expect(commandExecuteMock).not.toHaveBeenCalled()
    expect(applyMock).not.toHaveBeenCalled()
  })

  it('leave touches no binding, so it runs no binding guard', async () => {
    await POST(jsonReq('POST', { decision: 'leave' }) as never, ctx() as never)
    expect(guardMock).not.toHaveBeenCalled()
  })

  it('a departure with nothing bound runs no binding guard', async () => {
    previewMock.mockResolvedValue(preview({ agents: [] }))
    await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(guardMock).not.toHaveBeenCalled()
  })

  // ── the two failure directions, told apart ──────────────────────────────────

  it('a failure BEFORE the delete is departure_failed — nothing happened', async () => {
    commandExecuteMock.mockRejectedValue(new Error('db down'))
    const res = await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe('departure_failed')
    expect(applyMock).not.toHaveBeenCalled()
  })

  it('a failure AFTER the delete is departure_partial — the person is gone', async () => {
    applyMock.mockRejectedValue(new Error('cascade exploded'))
    const res = await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe('departure_partial')
    expect(body.userId).toBe(USER_ID)
    expect(body.error).toContain('may be untouched')
  })

  it('an interceptor refusal is a 403, not a 500', async () => {
    commandExecuteMock.mockRejectedValue(new CommandInterceptorError('held for review'))
    const res = await POST(jsonReq('POST', { decision: 'deactivate' }) as never, ctx() as never)
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('blocked_by_interceptor')
  })
})
