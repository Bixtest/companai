/**
 * @jest-environment node
 *
 * CC-126 — manage surface for one tenant agent type.
 *
 * Proves the per-key route's contract: GET reads the row whatever its status
 * and reports `shadowedByCode` when the platform has since claimed the key;
 * PUT edits the live row (bumping version) and refuses both one-way doors —
 * a retired type and a shadowed one — BEFORE the guard opens; DELETE retires
 * one-way and idempotently. The repository is mocked so the test is about the
 * ROUTE contract, not the DB; the code registry is the real one.
 */
const authMock = jest.fn()
const loadAclMock = jest.fn()
const createRequestContainerMock = jest.fn()
const guardMock = jest.fn()
const findByKeyMock = jest.fn()
const updateMock = jest.fn()
const retireMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainerMock(...args),
}))

jest.mock('../../../../mutation-guard', () => ({
  beginAiAssistantMutationGuard: (...args: unknown[]) => guardMock(...args),
}))

jest.mock('../../../../../data/repositories/AiAgentTypeRepository', () => ({
  AiAgentTypeKeyCollisionError: class AiAgentTypeKeyCollisionError extends Error {},
  AiAgentTypeRepository: class {
    findByKey(...args: unknown[]) {
      return findByKeyMock(...args)
    }
    update(...args: unknown[]) {
      return updateMock(...args)
    }
    retire(...args: unknown[]) {
      return retireMock(...args)
    }
  },
}))

import { NextResponse } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../../../../../lib/agent-registry'
import type { AiAgentType } from '../../../../../data/entities'

const VALID_BUNDLE = {
  label: 'Billing helper',
  description: 'Answers billing questions.',
  systemPrompt: 'You answer billing questions.',
  allowedTools: ['ai.data_query'],
}

const KEY = 'billing.assistant'
const BASE = `http://localhost/api/ai_assistant/ai/agent-types/${KEY}`

function makeRow(overrides: Partial<AiAgentType> = {}): AiAgentType {
  return {
    id: 't-1',
    tenantId: 'tenant-1',
    key: KEY,
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

function ctx(key: string) {
  return { params: Promise.resolve({ key }) }
}

function jsonReq(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('CC-126 — /api/ai_assistant/ai/agent-types/[key]', () => {
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
    findByKeyMock.mockResolvedValue(makeRow())
    updateMock.mockImplementation(async (_key: string, input: { bundle: unknown }) =>
      makeRow({ bundle: input.bundle as Record<string, unknown>, version: 2 }),
    )
    retireMock.mockResolvedValue(true)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // ── GET ────────────────────────────────────────────────────────────────────

  it('GET reads the row tenant-scoped, unshadowed', async () => {
    const res = await GET(jsonReq(BASE, 'GET') as never, ctx(KEY) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agentType.key).toBe(KEY)
    expect(body.agentType.shadowedByCode).toBe(false)
    expect(findByKeyMock).toHaveBeenCalledWith(KEY, { tenantId: 'tenant-1' })
  })

  it('GET reports shadowedByCode when the platform has claimed the key', async () => {
    seedAgentRegistryForTests([makeCodeAgent(KEY)])
    const res = await GET(jsonReq(BASE, 'GET') as never, ctx(KEY) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agentType.shadowedByCode).toBe(true)
  })

  it('GET reads a retired tombstone too (the key history is visible)', async () => {
    findByKeyMock.mockResolvedValue(makeRow({ status: 'retired' }))
    const res = await GET(jsonReq(BASE, 'GET') as never, ctx(KEY) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agentType.status).toBe('retired')
  })

  it('GET 404s an unknown key', async () => {
    findByKeyMock.mockResolvedValue(null)
    const res = await GET(jsonReq(BASE, 'GET') as never, ctx(KEY) as never)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('agent_type_unknown')
  })

  it('GET 400s a key outside the agent-id dialect', async () => {
    const res = await GET(jsonReq(BASE, 'GET') as never, ctx('Billing Assistant') as never)
    expect(res.status).toBe(400)
    expect(findByKeyMock).not.toHaveBeenCalled()
  })

  // ── PUT ────────────────────────────────────────────────────────────────────

  it('PUT edits the live row and bumps version', async () => {
    const nextBundle = { ...VALID_BUNDLE, label: 'Billing helper (v2)' }
    const res = await PUT(jsonReq(BASE, 'PUT', { bundle: nextBundle }) as never, ctx(KEY) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.agentType.version).toBe(2)
    expect(updateMock).toHaveBeenCalledWith(KEY, { bundle: nextBundle }, { tenantId: 'tenant-1' })
    expect(guardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceKind: 'ai_assistant.agent_type',
        resourceId: KEY,
        operation: 'update',
      }),
    )
  })

  it('PUT 409s a retired type — retirement is one-way', async () => {
    findByKeyMock.mockResolvedValue(makeRow({ status: 'retired' }))
    const res = await PUT(jsonReq(BASE, 'PUT', { bundle: VALID_BUNDLE }) as never, ctx(KEY) as never)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('agent_type_retired')
    // The precondition runs BEFORE the guard opens.
    expect(guardMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('PUT 409s a shadowed type — the row is inert under code-first precedence', async () => {
    seedAgentRegistryForTests([makeCodeAgent(KEY)])
    const res = await PUT(jsonReq(BASE, 'PUT', { bundle: VALID_BUNDLE }) as never, ctx(KEY) as never)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('agent_type_shadowed')
    expect(guardMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('PUT 404s a key this tenant does not hold', async () => {
    findByKeyMock.mockResolvedValue(null)
    const res = await PUT(jsonReq(BASE, 'PUT', { bundle: VALID_BUNDLE }) as never, ctx(KEY) as never)
    expect(res.status).toBe(404)
    expect(guardMock).not.toHaveBeenCalled()
  })

  it('PUT 400s a bundle the runtime cannot honour', async () => {
    const res = await PUT(
      jsonReq(BASE, 'PUT', { bundle: { ...VALID_BUNDLE, output: { schema: {} } } }) as never,
      ctx(KEY) as never,
    )
    expect(res.status).toBe(400)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('PUT 409s when a retire won the race between the read and the write', async () => {
    updateMock.mockResolvedValue(null)
    const res = await PUT(jsonReq(BASE, 'PUT', { bundle: VALID_BUNDLE }) as never, ctx(KEY) as never)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('agent_type_retired')
    // The guard already opened; it is closed honestly.
    const handle = await guardMock.mock.results[0].value
    expect(handle.runAfterSuccess).toHaveBeenCalled()
  })

  // ── DELETE — the one-way door ───────────────────────────────────────────────

  it('DELETE retires a live type and reports it', async () => {
    retireMock.mockResolvedValue(true)
    const res = await DELETE(jsonReq(BASE, 'DELETE') as never, ctx(KEY) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.retired).toBe(true)
    expect(body.agentType.status).toBe('retired')
    expect(retireMock).toHaveBeenCalledWith(KEY, { tenantId: 'tenant-1' })
    expect(guardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceKind: 'ai_assistant.agent_type',
        resourceId: KEY,
        operation: 'delete',
        mutationPayload: { key: KEY, retire: true },
      }),
    )
  })

  it('DELETE is idempotent — retiring an already-retired type succeeds quietly', async () => {
    retireMock.mockResolvedValue(false)
    const res = await DELETE(jsonReq(BASE, 'DELETE') as never, ctx(KEY) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.retired).toBe(false)
    expect(body.agentType.status).toBe('retired')
  })

  it('DELETE 404s a key this tenant does not hold', async () => {
    findByKeyMock.mockResolvedValue(null)
    const res = await DELETE(jsonReq(BASE, 'DELETE') as never, ctx(KEY) as never)
    expect(res.status).toBe(404)
    expect(retireMock).not.toHaveBeenCalled()
    expect(guardMock).not.toHaveBeenCalled()
  })

  it('every verb 403s without the manage feature', async () => {
    loadAclMock.mockResolvedValue({ features: ['ai_assistant.view'], isSuperAdmin: false })
    const p = await PUT(jsonReq(BASE, 'PUT', { bundle: VALID_BUNDLE }) as never, ctx(KEY) as never)
    const d = await DELETE(jsonReq(BASE, 'DELETE') as never, ctx(KEY) as never)
    expect([p.status, d.status]).toEqual([403, 403])
    expect(updateMock).not.toHaveBeenCalled()
    expect(retireMock).not.toHaveBeenCalled()
  })

  it('DELETE returns the guard block without retiring', async () => {
    guardMock.mockResolvedValue({
      blockedResponse: NextResponse.json({ error: 'blocked', code: 'x' }, { status: 202 }),
      runAfterSuccess: jest.fn(),
    })
    const res = await DELETE(jsonReq(BASE, 'DELETE') as never, ctx(KEY) as never)
    expect(res.status).toBe(202)
    expect(retireMock).not.toHaveBeenCalled()
  })
})
