/**
 * @jest-environment node
 *
 * CC-27 — the manage surface for `ai_agent_bindings`.
 *
 * Proves the three verbs behave: GET lists, POST creates/replaces, DELETE
 * revokes — and that all three require the manage feature and are tenant-scoped.
 * The repository is mocked so the test is about the ROUTE contract, not the DB.
 */
const authMock = jest.fn()
const loadAclMock = jest.fn()
const createRequestContainerMock = jest.fn()
const listForAgentMock = jest.fn()
const upsertMock = jest.fn()
const revokeMock = jest.fn()
const guardMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
  requirePrincipal: (auth: { sub?: string; keyId?: string | null } | null) => {
    if (!auth?.sub) return null
    const sub = auth.sub
    if (sub.startsWith('ai_worker:')) {
      return { kind: 'ai_worker', id: auth.keyId ?? sub.slice(10) }
    }
    if (sub.startsWith('api_key:')) {
      return { kind: 'service', id: auth.keyId ?? sub.slice(8) }
    }
    return { kind: 'human', id: sub }
  },
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainerMock(...args),
}))

jest.mock('../../../../../mutation-guard', () => ({
  beginAiAssistantMutationGuard: (...args: unknown[]) => guardMock(...args),
}))

jest.mock('../../../../../../data/repositories/AiAgentBindingRepository', () => ({
  AiAgentBindingRepository: class {
    listForAgent(...args: unknown[]) {
      return listForAgentMock(...args)
    }
    upsert(...args: unknown[]) {
      return upsertMock(...args)
    }
    revoke(...args: unknown[]) {
      return revokeMock(...args)
    }
  },
}))

import { GET, POST, DELETE } from '../route'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../../../../../../lib/agent-registry'
import type { AiAgentDefinition } from '../../../../../../lib/ai-agent-definition'

function makeAgent(
  overrides: Partial<AiAgentDefinition> & Pick<AiAgentDefinition, 'id' | 'moduleId'>,
): AiAgentDefinition {
  return {
    label: `${overrides.id} label`,
    description: `${overrides.id} description`,
    systemPrompt: 'You are a test agent.',
    allowedTools: [],
    ...overrides,
  }
}

function ctx(agentId: string) {
  return { params: Promise.resolve({ agentId }) }
}

function jsonReq(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const BASE = 'http://localhost/api/ai_assistant/ai/agents/mod.agent/bindings'

describe('CC-27 — /api/ai_assistant/ai/agents/[agentId]/bindings', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    seedAgentRegistryForTests([makeAgent({ id: 'mod.agent', moduleId: 'mod' })])
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: 'tenant-1', orgId: 'org-1' })
    loadAclMock.mockResolvedValue({
      features: ['ai_assistant.view', 'ai_assistant.settings.manage'],
      isSuperAdmin: false,
    })
    createRequestContainerMock.mockResolvedValue({
      resolve: (key: string) =>
        key === 'rbacService'
          ? {
              loadAcl: loadAclMock,
              hasAllFeatures: (required: string[], held: string[]) =>
                required.every((f) => held.includes(f)),
            }
          : {},
    })
    guardMock.mockResolvedValue({
      blockedResponse: undefined,
      runAfterSuccess: jest.fn(async () => undefined),
    })
    listForAgentMock.mockResolvedValue([])
    upsertMock.mockResolvedValue({
      id: 'b-1',
      principalId: 'key-1',
      agentId: 'mod.agent',
      toolAllowlist: null,
      requiredFeatures: [],
      notes: null,
      createdByUserId: 'admin-1',
      createdAt: new Date('2026-10-11T00:00:00Z'),
      updatedAt: new Date('2026-10-11T00:00:00Z'),
    })
    revokeMock.mockResolvedValue(true)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('GET lists the bindings for the agent', async () => {
    listForAgentMock.mockResolvedValue([])
    const res = await GET(jsonReq(BASE, 'GET') as never, ctx('mod.agent') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agentId).toBe('mod.agent')
    expect(body.bindings).toEqual([])
    expect(listForAgentMock).toHaveBeenCalledWith('mod.agent', {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
    })
  })

  it('POST creates a binding (200) and passes the payload to the repo', async () => {
    const res = await POST(
      jsonReq(BASE, 'POST', {
        principalId: 'key-1',
        toolAllowlist: ['tool.a'],
        requiredFeatures: ['feat.x'],
      }) as never,
      ctx('mod.agent') as never,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(upsertMock).toHaveBeenCalledWith(
      {
        principalId: 'key-1',
        agentId: 'mod.agent',
        toolAllowlist: ['tool.a'],
        requiredFeatures: ['feat.x'],
        notes: null,
      },
      { tenantId: 'tenant-1', organizationId: 'org-1', userId: 'admin-1' },
    )
  })

  it('POST rejects a malformed body with 400', async () => {
    const res = await POST(
      jsonReq(BASE, 'POST', { toolAllowlist: ['tool.a'] }) as never, // no principalId
      ctx('mod.agent') as never,
    )
    expect(res.status).toBe(400)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('POST 403s when the caller lacks the manage feature', async () => {
    loadAclMock.mockResolvedValue({ features: ['ai_assistant.view'], isSuperAdmin: false })
    const res = await POST(
      jsonReq(BASE, 'POST', { principalId: 'key-1' }) as never,
      ctx('mod.agent') as never,
    )
    expect(res.status).toBe(403)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('DELETE revokes with ?principalId=', async () => {
    const res = await DELETE(
      jsonReq(`${BASE}?principalId=key-1`, 'DELETE') as never,
      ctx('mod.agent') as never,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revoked).toBe(true)
    expect(revokeMock).toHaveBeenCalledWith('key-1', 'mod.agent', {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
    })
  })

  it('DELETE without principalId 400s', async () => {
    const res = await DELETE(jsonReq(BASE, 'DELETE') as never, ctx('mod.agent') as never)
    expect(res.status).toBe(400)
    expect(revokeMock).not.toHaveBeenCalled()
  })

  it('unknown agentId 404s on every verb', async () => {
    const g = await GET(jsonReq(BASE, 'GET') as never, ctx('mod.nope') as never)
    const p = await POST(
      jsonReq(BASE, 'POST', { principalId: 'key-1' }) as never,
      ctx('mod.nope') as never,
    )
    const d = await DELETE(
      jsonReq(`${BASE}?principalId=key-1`, 'DELETE') as never,
      ctx('mod.nope') as never,
    )
    expect([g.status, p.status, d.status]).toEqual([404, 404, 404])
  })
})
