/**
 * @jest-environment node
 *
 * CC-126 — the write surface of the tenant type catalogue.
 *
 * Proves the collection route's contract: POST authors a type (201), and every
 * refusal is the LOUD one — a key the platform shipped as code, a key this
 * tenant already holds (active OR retired), a bundle the runtime cannot
 * honour, no tenant context. GET lists the tenant's rows, tombstones included,
 * and nothing at all without a tenant. The repository is mocked so the test is
 * about the ROUTE contract, not the DB; the bundle schema and the code
 * registry are the real ones.
 */
const authMock = jest.fn()
const loadAclMock = jest.fn()
const createRequestContainerMock = jest.fn()
const guardMock = jest.fn()
const listMock = jest.fn()
const createMock = jest.fn()

/** A typed refusal the route maps to 409 — thrown by the mocked repo. */
class AiAgentTypeKeyCollisionError extends Error {
  constructor(readonly key: string) {
    super(`Agent type key "${key}" is already taken in this tenant`)
    this.name = 'AiAgentTypeKeyCollisionError'
  }
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainerMock(...args),
}))

jest.mock('../../../mutation-guard', () => ({
  beginAiAssistantMutationGuard: (...args: unknown[]) => guardMock(...args),
}))

jest.mock('../../../../data/repositories/AiAgentTypeRepository', () => ({
  AiAgentTypeKeyCollisionError,
  AiAgentTypeRepository: class {
    list(...args: unknown[]) {
      return listMock(...args)
    }
    create(...args: unknown[]) {
      return createMock(...args)
    }
  },
}))

import { NextResponse } from 'next/server'
import { GET, POST } from '../route'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../../../../lib/agent-registry'
import type { AiAgentType } from '../../../../data/entities'

const VALID_BUNDLE = {
  label: 'Billing helper',
  description: 'Answers billing questions.',
  systemPrompt: 'You answer billing questions.',
  allowedTools: ['ai.data_query'],
}

function makeRow(overrides: Partial<AiAgentType> = {}): AiAgentType {
  return {
    id: 't-1',
    tenantId: 'tenant-1',
    key: 'billing.assistant',
    bundle: VALID_BUNDLE,
    version: 1,
    status: 'active',
    createdAt: new Date('2026-10-18T00:00:00Z'),
    updatedAt: new Date('2026-10-18T00:00:00Z'),
    ...overrides,
  } as AiAgentType
}

/** A code-shipped agent as the registry validates it — all six fields required. */
function makeCodeAgent(id: string) {
  return {
    id,
    moduleId: 'mod',
    label: `${id} (platform)`,
    description: 'A platform-shipped agent.',
    systemPrompt: 'You are a platform agent.',
    allowedTools: [],
  }
}

function jsonReq(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const BASE = 'http://localhost/api/ai_assistant/ai/agent-types'

describe('CC-126 — /api/ai_assistant/ai/agent-types', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: 'tenant-1', orgId: 'org-1' })
    loadAclMock.mockResolvedValue({
      features: ['ai_assistant.view', 'ai_assistant.settings.manage'],
      isSuperAdmin: false,
    })
    createRequestContainerMock.mockResolvedValue({
      resolve: (key: string) => {
        if (key === 'rbacService') {
          return {
            loadAcl: loadAclMock,
            hasAllFeatures: (required: string[], held: string[]) =>
              required.every((f) => held.includes(f)),
          }
        }
        return {}
      },
    })
    guardMock.mockResolvedValue({
      blockedResponse: null,
      runAfterSuccess: jest.fn(async () => undefined),
    })
    listMock.mockResolvedValue([])
    createMock.mockResolvedValue(makeRow())
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // ── POST — the authoring path ──────────────────────────────────────────────

  it('POST creates a tenant type (201) and hands the guard a closed decision', async () => {
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'billing.assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.agentType.key).toBe('billing.assistant')
    expect(body.agentType.version).toBe(1)
    expect(createMock).toHaveBeenCalledWith(
      { key: 'billing.assistant', bundle: VALID_BUNDLE },
      { tenantId: 'tenant-1' },
    )
    // The guard opened with the exact payload the write carries.
    expect(guardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceKind: 'ai_assistant.agent_type',
        resourceId: 'billing.assistant',
        operation: 'create',
        mutationPayload: { key: 'billing.assistant', bundle: VALID_BUNDLE },
        userId: 'admin-1',
        tenantId: 'tenant-1',
      }),
    )
  })

  it('POST 409s when a code-shipped agent already claims the key', async () => {
    // The loud half of the collision check, decided against the REAL registry.
    seedAgentRegistryForTests([makeCodeAgent('billing.assistant')])
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'billing.assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('agent_key_claimed_by_code')
    expect(createMock).not.toHaveBeenCalled()
    // A refused write never opens the approval pipeline.
    expect(guardMock).not.toHaveBeenCalled()
  })

  it('POST 409s when this tenant already holds the key (active or retired)', async () => {
    createMock.mockRejectedValue(new AiAgentTypeKeyCollisionError('billing.assistant'))
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'billing.assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('agent_type_key_taken')
    expect(body.key).toBe('billing.assistant')
    // The guard wraps the write, so it opens before the collision is found —
    // but a refused mutation never reports success.
    const handle = await guardMock.mock.results[0].value
    expect(handle.runAfterSuccess).not.toHaveBeenCalled()
  })

  it('POST 400s with issues when the bundle carries a field the runtime cannot honour', async () => {
    const res = await POST(
      jsonReq(BASE, 'POST', {
        key: 'billing.assistant',
        bundle: { ...VALID_BUNDLE, executionMode: 'object' },
      }) as never,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('validation_error')
    expect(Array.isArray(body.issues)).toBe(true)
    expect(body.issues.join(' ')).toContain('executionMode')
    expect(createMock).not.toHaveBeenCalled()
    expect(guardMock).not.toHaveBeenCalled()
  })

  it('POST 400s when the key is not in the agent-id dialect', async () => {
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'Billing Assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(400)
    expect(createMock).not.toHaveBeenCalled()
    expect(guardMock).not.toHaveBeenCalled()
  })

  it('POST 400s when the body is not JSON', async () => {
    const res = await POST(
      new Request(BASE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json' }) as never,
    )
    expect(res.status).toBe(400)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('POST 403s when the caller lacks the manage feature', async () => {
    loadAclMock.mockResolvedValue({ features: ['ai_assistant.view'], isSuperAdmin: false })
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'billing.assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(403)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('POST 400s tenant_required when the caller has no tenant', async () => {
    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: null, orgId: null })
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'billing.assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('tenant_required')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('POST returns the guard block without writing', async () => {
    const blocked = NextResponse.json(
      { error: 'Escalated to an approver.', code: 'mutation_guard_blocked' },
      { status: 202 },
    )
    guardMock.mockResolvedValue({ blockedResponse: blocked, runAfterSuccess: jest.fn() })
    const res = await POST(
      jsonReq(BASE, 'POST', { key: 'billing.assistant', bundle: VALID_BUNDLE }) as never,
    )
    expect(res.status).toBe(202)
    expect(createMock).not.toHaveBeenCalled()
  })

  // ── GET — the list ─────────────────────────────────────────────────────────

  it('GET lists the tenant\'s rows, tombstones included, tenant-scoped', async () => {
    listMock.mockResolvedValue([
      makeRow(),
      makeRow({ key: 'old.helper', status: 'retired', version: 2 }),
    ])
    const res = await GET(jsonReq(BASE, 'GET') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(2)
    expect(body.agentTypes.map((t: { key: string }) => t.key)).toEqual(['billing.assistant', 'old.helper'])
    expect(body.agentTypes[1].status).toBe('retired')
    expect(listMock).toHaveBeenCalledWith({ tenantId: 'tenant-1' })
  })

  it('GET returns an empty list — not an error — without a tenant', async () => {
    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: null, orgId: null })
    const res = await GET(jsonReq(BASE, 'GET') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ agentTypes: [], total: 0 })
    expect(listMock).not.toHaveBeenCalled()
  })

  it('GET 401s an unauthenticated caller', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(jsonReq(BASE, 'GET') as never)
    expect(res.status).toBe(401)
  })
})
