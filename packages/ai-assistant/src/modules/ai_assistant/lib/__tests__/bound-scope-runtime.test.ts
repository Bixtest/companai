import { z } from 'zod'
import type { AiAgentDefinition } from '../ai-agent-definition'
import type { AiToolDefinition } from '../types'
import { resolveAiAgentTools, AgentPolicyError } from '../agent-tools'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../agent-registry'
import { toolRegistry, registerMcpTool } from '../tool-registry'

jest.mock('@open-mercato/shared/lib/logger', () => {
  const mocked = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  }
  mocked.child.mockImplementation(() => mocked)
  return { createLogger: jest.fn(() => mocked) }
})

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

function makeTool(
  overrides: Partial<AiToolDefinition> & Pick<AiToolDefinition, 'name'>,
): AiToolDefinition {
  return {
    description: `${overrides.name} description`,
    inputSchema: z.object({ query: z.string().optional() }),
    handler: async () => ({ ok: true }),
    ...overrides,
  }
}

const baseAuth = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userId: 'user-1',
  features: ['*'],
  isSuperAdmin: true,
}

const AGENT_ID = 'customers.assistant'

/**
 * CC-55 — the bound scope resolved from an `ai_agent_bindings` row is applied
 * to the runtime (NARROWING-ONLY): tools INTERSECT, features UNION.
 */
describe('resolveAiAgentTools — CC-55 bound scope', () => {
  beforeEach(() => {
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  afterAll(() => {
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  function seedTwoToolAgent(): AiAgentDefinition {
    registerMcpTool(makeTool({ name: 'customers.list_people' }), { moduleId: 'customers' })
    registerMcpTool(makeTool({ name: 'customers.get_person' }), { moduleId: 'customers' })
    const agent = makeAgent({
      id: AGENT_ID,
      moduleId: 'customers',
      allowedTools: ['customers.list_people', 'customers.get_person'],
    })
    seedAgentRegistryForTests([agent])
    return agent
  }

  it("B3'a — a binding's tool allowlist INTERSECTS the agent's tools (excluded tools are dropped)", async () => {
    seedTwoToolAgent()

    const result = await resolveAiAgentTools({
      agentId: AGENT_ID,
      authContext: baseAuth,
      boundScope: { allowedTools: ['customers.list_people'], requiredFeatures: [] },
    })

    // Only the bound tool is built…
    expect(Object.keys(result.tools).sort()).toEqual(['customers__list_people'])
    // …and the returned agent advertises the narrowed set.
    expect(result.agent.allowedTools).toEqual(['customers.list_people'])
  })

  it("B3'a — a binding can NEVER add a tool the agent did not declare (decisive negative)", async () => {
    // `customers.delete_person` is registered AND named by the binding, but the
    // agent does NOT declare it. The intersection must refuse to add it.
    registerMcpTool(makeTool({ name: 'customers.list_people' }), { moduleId: 'customers' })
    registerMcpTool(makeTool({ name: 'customers.delete_person' }), { moduleId: 'customers' })
    seedAgentRegistryForTests([
      makeAgent({ id: AGENT_ID, moduleId: 'customers', allowedTools: ['customers.list_people'] }),
    ])

    const result = await resolveAiAgentTools({
      agentId: AGENT_ID,
      authContext: baseAuth,
      boundScope: {
        allowedTools: ['customers.list_people', 'customers.delete_person'],
        requiredFeatures: [],
      },
    })

    expect(Object.keys(result.tools).sort()).toEqual(['customers__list_people'])
    expect(result.agent.allowedTools).toEqual(['customers.list_people'])
  })

  it("B3'b — a binding's required features are enforced (denied when the actor lacks them)", async () => {
    seedTwoToolAgent()

    await expect(
      resolveAiAgentTools({
        agentId: AGENT_ID,
        authContext: { ...baseAuth, features: [], isSuperAdmin: false },
        boundScope: { allowedTools: ['customers.list_people'], requiredFeatures: ['customers.audit'] },
      }),
    ).rejects.toMatchObject({ name: 'AgentPolicyError', code: 'agent_features_denied' })
  })

  it("B3'b — a binding's required features pass when the actor holds them", async () => {
    seedTwoToolAgent()

    const result = await resolveAiAgentTools({
      agentId: AGENT_ID,
      authContext: { ...baseAuth, features: ['customers.audit'], isSuperAdmin: false },
      boundScope: { allowedTools: ['customers.list_people'], requiredFeatures: ['customers.audit'] },
    })

    expect(Object.keys(result.tools)).toEqual(['customers__list_people'])
  })

  it("B3'b — the binding's features are UNIONED with the agent's own (both are required)", async () => {
    registerMcpTool(makeTool({ name: 'customers.list_people' }), { moduleId: 'customers' })
    seedAgentRegistryForTests([
      makeAgent({
        id: AGENT_ID,
        moduleId: 'customers',
        allowedTools: ['customers.list_people'],
        requiredFeatures: ['customers.assistant.use'],
      }),
    ])

    const scope = {
      allowedTools: ['customers.list_people'],
      requiredFeatures: ['customers.audit'],
    }

    // Holds the AGENT's feature but NOT the BINDING's → denied. This assertion
    // is satisfied ONLY by the CC-55 union check (the agent gate alone would let
    // it through, since `customers.assistant.use` is held).
    await expect(
      resolveAiAgentTools({
        agentId: AGENT_ID,
        authContext: { ...baseAuth, features: ['customers.assistant.use'], isSuperAdmin: false },
        boundScope: scope,
      }),
    ).rejects.toMatchObject({ name: 'AgentPolicyError', code: 'agent_features_denied' })

    // Holds BOTH → allowed (the union is exactly the two features).
    const ok = await resolveAiAgentTools({
      agentId: AGENT_ID,
      authContext: {
        ...baseAuth,
        features: ['customers.assistant.use', 'customers.audit'],
        isSuperAdmin: false,
      },
      boundScope: scope,
    })
    expect(Object.keys(ok.tools)).toEqual(['customers__list_people'])
  })

  it("B4 — no bound scope returns the ORIGINAL agent object and the full tool set", async () => {
    const agent = seedTwoToolAgent()

    const result = await resolveAiAgentTools({ agentId: AGENT_ID, authContext: baseAuth })

    expect(result.agent).toBe(agent)
    expect(Object.keys(result.tools).sort()).toEqual([
      'customers__get_person',
      'customers__list_people',
    ])
  })

  it('B4 — a bound scope that narrows NOTHING also returns the original agent object', async () => {
    const agent = seedTwoToolAgent()

    const result = await resolveAiAgentTools({
      agentId: AGENT_ID,
      authContext: baseAuth,
      boundScope: {
        allowedTools: ['customers.list_people', 'customers.get_person'],
        requiredFeatures: [],
      },
    })

    expect(result.agent).toBe(agent)
    expect(Object.keys(result.tools).sort()).toEqual([
      'customers__get_person',
      'customers__list_people',
    ])
  })
})
