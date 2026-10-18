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

  it('is bound for an ai_worker principal WITH a binding, and reports the machine axis', async () => {
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
      // `CC-120` — the binding IS the proof that this credential acts as this
      // agent, so the axis is reported from here rather than looked up again.
      agentAxis: 'mod.agent',
    })
  })

  it('does NOT bind a human principal (passthrough) and never reads the DB', async () => {
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' } as never,
      agentId: 'mod.agent',
    })
    // `CC-120` R3 — a human carries NO machine axis, even though this call names
    // an agent. Giving them one would turn "which agent the turn is for" into an
    // authorisation, which is the design the ruling rejected.
    expect(result).toEqual({
      bound: true,
      toolAllowlist: null,
      requiredFeatures: [],
      agentAxis: null,
    })
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

  it('REFUSES a service principal (api_key:) — it cannot hold a binding', async () => {
    // ★ CC-103 INVERTED THIS TEST. It used to assert `bound: true` on the
    // reasoning "a service key is not an ai_worker, so it is NOT subject to the
    // binding check". That reasoning admitted `service` and `system` to the
    // passthrough, so a service key with `ai_assistant.view` ran any agent
    // unbound with the full declared tool list. Only `human` passes unbound now.
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: { sub: 'api_key:key-9', tenantId: 'tenant-1', orgId: 'org-1' } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: false, reason: 'not_ai_worker' })
    expect(findBindingMock).not.toHaveBeenCalled()
  })

  it('REFUSES a system principal — the platform acting alone holds no grant', async () => {
    // `system` is a machine with no credential behind it (principal.ts:194-210).
    // It reaches the same branch as `service` and must be refused for the same
    // reason: it cannot be bound, so it holds no grant.
    findBindingMock.mockResolvedValue(null)
    const result = await resolveAgentBinding({
      em: fakeEm,
      auth: {
        sub: 'system-1',
        tenantId: 'tenant-1',
        orgId: 'org-1',
        principal: {
          id: 'system-1',
          kind: 'system',
          onBehalfOfUserId: null,
          displayName: null,
          tenantId: 'tenant-1',
          organizationId: 'org-1',
        },
      } as never,
      agentId: 'mod.agent',
    })
    expect(result).toEqual({ bound: false, reason: 'not_ai_worker' })
    expect(findBindingMock).not.toHaveBeenCalled()
  })
})

describe('computeBoundRunScope — narrowing only (CC-27 / B3)', () => {
  beforeEach(() => {
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  it('intersects tools with the binding allowlist (never widens)', () => {
    const agent = makeAgent({ id: 'mod.agent', moduleId: 'mod', allowedTools: ['tool.a', 'tool.b'] })
    // CC-126 — the subject is handed in; a tenant type is a row, not a registry
    // entry, so the gate never resolves one from the global map.
    const scope = computeBoundRunScope({
      agent,
      binding: { bound: true, toolAllowlist: ['tool.a', 'tool.zzz-nope'], requiredFeatures: [], agentAxis: 'mod.agent' },
    })
    expect(scope.allowedTools).toEqual(['tool.a'])
  })

  it('union of features: binding can only ADD a requirement', () => {
    const agent = makeAgent({ id: 'mod.agent', moduleId: 'mod', requiredFeatures: ['feat.base'] })
    const scope = computeBoundRunScope({
      agent,
      binding: { bound: true, toolAllowlist: null, requiredFeatures: ['feat.extra'], agentAxis: 'mod.agent' },
    })
    expect(scope.requiredFeatures.sort()).toEqual(['feat.base', 'feat.extra'])
  })

  it('a null allowlist means "all of the agent tools"', () => {
    const agent = makeAgent({ id: 'mod.agent', moduleId: 'mod', allowedTools: ['tool.a', 'tool.b'] })
    const scope = computeBoundRunScope({
      agent,
      binding: { bound: true, toolAllowlist: null, requiredFeatures: [], agentAxis: null },
    })
    expect(scope.allowedTools).toEqual(['tool.a', 'tool.b'])
  })

  it('an absent agent yields the empty tool set (fail-closed)', () => {
    const scope = computeBoundRunScope({
      agent: null,
      binding: { bound: true, toolAllowlist: null, requiredFeatures: ['feat.x'], agentAxis: null },
    })
    expect(scope.allowedTools).toEqual([])
    expect(scope.requiredFeatures).toEqual(['feat.x'])
  })
})
