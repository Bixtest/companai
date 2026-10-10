import type { AiAgentDefinition } from '../../../../lib/ai-agent-definition'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../../../../lib/agent-registry'
import { toolRegistry } from '../../../../lib/tool-registry'

const authMock = jest.fn()
const loadAclMock = jest.fn()
const createRequestContainerMock = jest.fn()
const runAiAgentObjectMock = jest.fn()
const findBindingMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
  // The real module derives a principal; mirror it minimally here so the test
  // exercises the same branch the route does. A machine's id comes from `keyId`
  // when present, as the real `derivePrincipal` resolves it.
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

jest.mock('../../../../lib/agent-runtime', () => ({
  runAiAgentObject: (...args: unknown[]) => runAiAgentObjectMock(...args),
}))

jest.mock('../../../../data/repositories/AiAgentBindingRepository', () => ({
  AiAgentBindingRepository: class {
    findBinding(...args: unknown[]) {
      return findBindingMock(...args)
    }
  },
}))

import { POST } from '../route'

function makeAgent(
  overrides: Partial<AiAgentDefinition> & Pick<AiAgentDefinition, 'id' | 'moduleId'>,
): AiAgentDefinition {
  return {
    label: `${overrides.id} label`,
    description: `${overrides.id} description`,
    systemPrompt: 'You are a test agent.',
    allowedTools: [],
    // The run-object route asserts `requestedExecutionMode: 'object'`, and the
    // policy gate rejects an agent with no object-mode surface (422). Declare an
    // output schema so the policy gate passes and the binding check is reached.
    output: { type: 'object', properties: { ok: { type: 'boolean' } } } as never,
    ...overrides,
  }
}

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/ai_assistant/ai/run-object', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { agent: 'mod.agent', messages: [{ role: 'user', content: 'hi' }] }

describe('POST /api/ai_assistant/ai/run-object — CC-27 binding enforcement', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    toolRegistry.clear()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    seedAgentRegistryForTests([makeAgent({ id: 'mod.agent', moduleId: 'mod' })])

    createRequestContainerMock.mockResolvedValue({
      resolve: (key: string) => (key === 'rbacService' ? { loadAcl: loadAclMock } : {}),
    })
    loadAclMock.mockResolvedValue({ features: ['ai_assistant.view'], isSuperAdmin: false })
    runAiAgentObjectMock.mockResolvedValue({ mode: 'generate', object: { ok: true } })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('REFUSES an ai_worker principal with no binding (403 agent_not_bound)', async () => {
    authMock.mockResolvedValue({
      sub: 'ai_worker:key-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    })
    findBindingMock.mockResolvedValue(null)

    const res = await POST(buildRequest(VALID_BODY) as never)
    expect(res.status).toBe(403)
    const payload = await res.json()
    expect(payload.code).toBe('agent_not_bound')
    expect(runAiAgentObjectMock).not.toHaveBeenCalled()
  })

  it('ALLOWS an ai_worker principal WITH a binding', async () => {
    authMock.mockResolvedValue({
      sub: 'ai_worker:key-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    })
    findBindingMock.mockResolvedValue({ toolAllowlist: null, requiredFeatures: [] })

    const res = await POST(buildRequest(VALID_BODY) as never)
    expect(res.status).toBe(200)
    expect(runAiAgentObjectMock).toHaveBeenCalled()
  })

  it('does NOT apply the binding to a human session (passthrough)', async () => {
    authMock.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' })

    const res = await POST(buildRequest(VALID_BODY) as never)
    expect(res.status).toBe(200)
    expect(findBindingMock).not.toHaveBeenCalled()
    expect(runAiAgentObjectMock).toHaveBeenCalled()
  })
})
