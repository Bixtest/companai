/**
 * @jest-environment node
 *
 * CC-126 — `/api/ai/agents` is the catalogue in the caller's tenant.
 *
 * Proves the picker merges the code layer and the tenant's own types, tags
 * provenance, applies one feature filter to both, and never offers the same
 * id twice when the platform has claimed a tenant key. The repository is
 * mocked so the test is about the route contract, not the DB; the code
 * registry, the bundle materializer and the tool registry are the real ones.
 */
const authMock = jest.fn()
const loadAclMock = jest.fn()
const createRequestContainerMock = jest.fn()
const listActiveMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainerMock(...args),
}))

jest.mock('../../../../data/repositories/AiAgentTypeRepository', () => ({
  AiAgentTypeRepository: class {
    listActive(...args: unknown[]) {
      return listActiveMock(...args)
    }
  },
}))

import { GET } from '../route'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../../../../lib/agent-registry'
import type { AiAgentType } from '../../../../data/entities'

const CODE_AGENT = {
  id: 'platform.agent',
  moduleId: 'ai_assistant',
  label: 'Platform agent',
  description: 'Shipped as code.',
  systemPrompt: 'You are the platform agent.',
  allowedTools: ['meta.list_agents'],
}

function typeRow(overrides: Partial<AiAgentType> = {}): AiAgentType {
  return {
    id: 'row-1',
    tenantId: 'tenant-1',
    key: 'billing.assistant',
    bundle: {
      label: 'Billing assistant',
      description: 'Answers billing questions.',
      systemPrompt: 'You are a billing assistant.',
      allowedTools: ['invoices.list'],
    },
    version: 2,
    status: 'active',
    createdAt: new Date('2026-10-18T00:00:00Z'),
    updatedAt: new Date('2026-10-18T00:00:00Z'),
    ...overrides,
  } as AiAgentType
}

function jsonReq(url: string, method: string): Request {
  return new Request(url, { method, headers: { 'content-type': 'application/json' } })
}

const BASE = 'http://localhost/api/ai_assistant/ai/agents'

describe('CC-126 — /api/ai_assistant/ai/agents', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: 'tenant-1', orgId: 'org-1' })
    loadAclMock.mockResolvedValue({
      features: ['ai_assistant.view'],
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
        if (key === 'em') return {}
        return {}
      },
    })
    listActiveMock.mockResolvedValue([typeRow()])
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('merges the code layer and the tenant layer, tagged', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    const res = await GET(jsonReq(BASE, 'GET') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    const platform = body.agents.find((a: { id: string }) => a.id === 'platform.agent')
    const tenant = body.agents.find((a: { id: string }) => a.id === 'billing.assistant')
    expect(platform.layer).toBe('platform')
    expect(tenant.layer).toBe('tenant')
    expect(tenant.version).toBe(2)
    expect(tenant.executionMode).toBe('chat')
    expect(tenant.hasOutputSchema).toBe(false)
    // A tenant type carries the owning module's id — no module to attribute
    // beyond the one that owns the mechanism.
    expect(tenant.moduleId).toBe('ai_assistant')
    expect(listActiveMock).toHaveBeenCalledWith({ tenantId: 'tenant-1' })
  })

  it('applies one feature filter to both layers', async () => {
    seedAgentRegistryForTests([
      CODE_AGENT,
      {
        ...CODE_AGENT,
        id: 'platform.private',
        label: 'Private platform agent',
        requiredFeatures: ['ai_assistant.admin'],
      },
    ])
    listActiveMock.mockResolvedValue([
      typeRow(),
      typeRow({
        key: 'secret.assistant',
        bundle: { ...typeRow().bundle, requiredFeatures: ['invoices.manage'] },
      }),
    ])
    const res = await GET(jsonReq(BASE, 'GET') as never)
    const ids = (await res.json()).agents.map((a: { id: string }) => a.id)
    expect(ids).toContain('billing.assistant')
    expect(ids).toContain('platform.agent')
    expect(ids).not.toContain('platform.private')
    expect(ids).not.toContain('secret.assistant')
  })

  it('never offers the same id twice when the platform has claimed a tenant key', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    listActiveMock.mockResolvedValue([typeRow({ key: 'platform.agent', id: 'row-2' })])
    const res = await GET(jsonReq(BASE, 'GET') as never)
    const matches = (await res.json()).agents.filter((a: { id: string }) => a.id === 'platform.agent')
    expect(matches).toHaveLength(1)
    expect(matches[0].layer).toBe('platform')
  })

  it('lists the platform layer alone for a caller with no tenant', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    authMock.mockResolvedValue({ sub: 'admin-1', tenantId: null, orgId: null })
    listActiveMock.mockImplementation(() => {
      throw new Error('the tenant layer must not be read without a tenant')
    })
    const res = await GET(jsonReq(BASE, 'GET') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agents.map((a: { id: string }) => a.id)).toEqual(['platform.agent'])
  })

  it('401s an unauthenticated caller', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(jsonReq(BASE, 'GET') as never)
    expect(res.status).toBe(401)
  })
})
