/**
 * @jest-environment node
 *
 * `CC-103` — `/api/ai_assistant/chat` is gated by **principal kind**, not by a
 * binding row, and this file is why.
 *
 * The route runs `ai_assistant.chat`, which is not a code-declared agent:
 * `getAgent('ai_assistant.chat')` is undefined, so the manage surface 404s and no
 * `ai_agent_bindings` row can ever name it. That made it the one dispatch site a
 * `service` key could still reach with no grant at all — and it had **no test**,
 * which is why the binding-coverage gate never noticed it (the gate could not see
 * the door: this route dispatches through `resolveAiRuntimePort` + `startRun`,
 * neither of which was a dispatch marker).
 *
 * The guard is the first thing POST does, so these cases never touch the runtime.
 */
const authMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
  requirePrincipal: (auth: { sub?: string; keyId?: string | null } | null) => {
    // Mirrors the real helper: a blank/whitespace subject identifies nobody and
    // derives NO principal (`shared/src/lib/auth/principal.ts:121-122`).
    if (!auth?.sub || !auth.sub.trim()) return null
    const sub = auth.sub
    if (sub.startsWith('ai_worker:')) return { kind: 'ai_worker', id: auth.keyId ?? sub.slice(10) }
    if (sub.startsWith('api_key:')) return { kind: 'service', id: auth.keyId ?? sub.slice(8) }
    return { kind: 'human', id: sub }
  },
}))

import { POST } from '../route'

function chatRequest(): Request {
  return new Request('http://localhost/api/ai_assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
  })
}

describe('CC-103 — /api/ai_assistant/chat serves interactive sessions only', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('401s when unauthenticated', async () => {
    authMock.mockResolvedValue(null)
    const res = await POST(chatRequest() as never)
    expect(res.status).toBe(401)
  })

  it('403s for a service principal (api_key:)', async () => {
    authMock.mockResolvedValue({ sub: 'api_key:key-9', tenantId: 't-1', orgId: 'o-1' })
    const res = await POST(chatRequest() as never)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('human_principal_required')
  })

  it('403s for an ai_worker principal — it cannot be bound here, so it may not run', async () => {
    authMock.mockResolvedValue({ sub: 'ai_worker:key-9', tenantId: 't-1', orgId: 'o-1' })
    const res = await POST(chatRequest() as never)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('human_principal_required')
  })

  it('403s for a principal that cannot be derived at all', async () => {
    authMock.mockResolvedValue({ sub: '   ', tenantId: 't-1', orgId: 'o-1' })
    const res = await POST(chatRequest() as never)
    expect(res.status).toBe(403)
  })
})
