import type { AiAgentDefinition } from '../ai-agent-definition'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../agent-registry'
import { toolRegistry } from '../tool-registry'
import { resolveAgentBinding, computeBoundRunScope } from '../agent-binding'

const findBindingMock = jest.fn()

jest.mock('../../data/repositories/AiAgentBindingRepository', () => ({
  AiAgentBindingRepository: class {
    findBinding(...args: unknown[]) {
      return findBindingMock(...args)
    }
  },
}))

// The resolver imports the repository by a relative path that resolves to the
// SAME module id as the mock above; Jest dedupes by resolved path, so the class
// mock intercepts it. The route under test also builds the repo directly.

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

const fakeEm = {} as never

describe('resolveAgentBinding — CC-27', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  it('is fail-closed for an ai_worker principal with NO binding', async () => {
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'ai_worker:key-1', tenantId: 'tenant-1', orgId: 'org-1' } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: false, reason: 'no_binding' })
    // the lookup must use the bare credential id, not the prefixed subject
    expect(findBindingMock).toHaveBeenCalledWith('key-1', 'mod.agent', {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
    })
  })

  it('is bound for an ai_worker principal WITH a binding', async () => {
    findBindingMock.mockResolvedValue({
      toolAllowlist: ['tool.a'],
      requiredFeatures: ['feat.x'],
    })
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'ai_worker:key-1', tenantId: 'tenant-1', orgId: null } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({
      bound: true,
      toolAllowlist: ['tool.a'],
      requiredFeatures: ['feat.x'],
    })
  })

  it('does NOT bind a human principal (passthrough) and never reads the DB', async () => {
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: true, toolAllowlist: null, requiredFeatures: [] })
    expect(findBindingMock).not.toHaveBeenCalled()
  })

  it('fails closed for an ai_worker with no tenant scope', async () => {
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'ai_worker:key-1', tenantId: null, orgId: null } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: false, reason: 'no_binding' })
    expect(findBindingMock).not.toHaveBeenCalled()
  })

  it('fails closed for an unidentifiable principal (blank subject) — never a human passthrough', async () => {
    // A blank/whitespace subject identifies nobody. Before this guard, it derived
    // NO principal and fell into the human branch, skipping the binding entirely —
    // a fail-open. It must now refuse.
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: '   ', tenantId: 'tenant-1', orgId: 'org-1' } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: false, reason: 'no_binding' })
    expect(findBindingMock).not.toHaveBeenCalled()
  })

  it('treats a service principal (api_key:) as unbound', async () => {
    // A service key is not an ai_worker, so it is NOT subject to the binding
    // check — it keeps today's behaviour (returns bound, no DB read).
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'api_key:key-9', tenantId: 'tenant-1', orgId: 'org-1' } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: true, toolAllowlist: null, requiredFeatures: [] })
    expect(findBindingMock).not.toHaveBeenCalled()
  })
})

describe('computeBoundRunScope — narrowing only (CC-27 / B3)', () => {
  beforeEach(() => {
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  it('intersects tools with the binding allowlist (never widens)', () => {
    seedAgentRegistryForTests([
      makeAgent({ id: 'mod.agent', moduleId: 'mod', allowedTools: ['tool.a', 'tool.b'] }),
    ])
    const scope = computeBoundRunScope({
      agentId: 'mod.agent',
      binding: { bound: true, toolAllowlist: ['tool.a', 'tool.zzz-nope'], requiredFeatures: [] },
    })
    expect(scope.allowedTools).toEqual(['tool.a'])
  })

  it('union of features: binding can only ADD a requirement', () => {
    seedAgentRegistryForTests([
      makeAgent({ id: 'mod.agent', moduleId: 'mod', requiredFeatures: ['feat.base'] }),
    ])
    const scope = computeBoundRunScope({
      agentId: 'mod.agent',
      binding: { bound: true, toolAllowlist: null, requiredFeatures: ['feat.extra'] },
    })
    expect(scope.requiredFeatures.sort()).toEqual(['feat.base', 'feat.extra'])
  })

  it('a null allowlist means "all of the agent tools"', () => {
    seedAgentRegistryForTests([
      makeAgent({ id: 'mod.agent', moduleId: 'mod', allowedTools: ['tool.a', 'tool.b'] }),
    ])
    const scope = computeBoundRunScope({
      agentId: 'mod.agent',
      binding: { bound: true, toolAllowlist: null, requiredFeatures: [] },
    })
    expect(scope.allowedTools).toEqual(['tool.a', 'tool.b'])
  })
})
