/**
 * Step 3.8 — `meta.*` tool pack unit tests.
 *
 * Covers `list_agents` empty-registry graceful case, RBAC filtering,
 * super-admin bypass, `describe_agent` not-found / forbidden / happy,
 * `update_task_plan` sanitization, and the `output.schema` JSON-Schema
 * fallback. `CC-126`: both tools read the caller's tenant catalogue, tagged.
 */
import { z } from 'zod'
import type { AiAgentDefinition } from '../../lib/ai-agent-definition'
import type { AiAgentType } from '../../data/entities'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../../lib/agent-registry'
import * as agentRegistry from '../../lib/agent-registry'
import { AiAgentTypeRepository } from '../../data/repositories/AiAgentTypeRepository'
import metaAiTools from '../meta-pack'

jest.mock('../../data/repositories/AiAgentTypeRepository')

const MockRepo = AiAgentTypeRepository as jest.MockedClass<typeof AiAgentTypeRepository>

/**
 * `metaAiTools` is a tuple of three tools with three different input types, so
 * `.find()` returns their union and calling `.handler()` on that union demands the
 * **intersection** of every tool's input. These tests exercise each tool with the
 * inputs that tool takes — including partial ones, to prove the runtime validation —
 * so the helper returns a loose view of the tool.
 *
 * TRADE-OFF (accepted, deliberate): the loose `handler` input means a wrong-TYPED input
 * would not be a compile error here. That is the point — these tests assert RUNTIME
 * behaviour on arbitrary input, which is what a validator test is for. The production
 * tools keep their own strict inputs; nothing in this file widens them.
 */
type MetaToolUnderTest = {
  name: string
  description: string
  inputSchema: { parse: (input: unknown) => unknown }
  requiredFeatures?: string[]
  isMutation?: boolean
  handler: (input: Record<string, unknown>, context: unknown) => Promise<unknown>
}

function findTool(name: string): MetaToolUnderTest {
  const tool = metaAiTools.find((entry) => entry.name === name)
  if (!tool) throw new Error(`tool ${name} missing`)
  return tool as unknown as MetaToolUnderTest
}

function makeAgent(overrides: Partial<AiAgentDefinition> & Pick<AiAgentDefinition, 'id' | 'moduleId'>): AiAgentDefinition {
  return {
    label: `${overrides.id} label`,
    description: `${overrides.id} description`,
    systemPrompt: 'You are a test agent.',
    allowedTools: [],
    ...overrides,
  }
}

function makeCtx(overrides: Partial<{
  tenantId: string | null
  organizationId: string | null
  userId: string | null
  userFeatures: string[]
  isSuperAdmin: boolean
  /** A DB handle the handler context can resolve — presence is what makes the
   *  tenant layer reachable (CC-126). Omit it and the caller sees code only. */
  em: unknown
}> = {}) {
  const em = overrides.em
  return {
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    userId: 'user-1',
    container: { resolve: (key: string) => (key === 'em' ? em : undefined) },
    userFeatures: ['ai_assistant.view'],
    isSuperAdmin: false,
    ...overrides,
  }
}

describe('meta.list_agents', () => {
  const tool = findTool('meta.list_agents')

  beforeEach(() => {
    resetAgentRegistryForTests()
  })

  afterAll(() => {
    resetAgentRegistryForTests()
  })

  it('returns an empty array when the registry is empty (never throws)', async () => {
    // Seed an EMPTY array rather than calling `resetAgentRegistryForTests()` and
    // hoping nothing is declared.
    //
    // `resetAgentRegistryForTests()` only clears the in-memory map and sets
    // `loaded = false`; the next `getAgent`/`listAgents` lazily runs
    // `loadAgentRegistry()`, which imports the REAL generated registry. So the
    // "empty" this test needs is a world in which the registry has genuinely been
    // loaded and found to hold nothing — which is what `seedAgentRegistryForTests([])`
    // expresses, and it is the only form of this premise that survives an agent
    // being declared for real.
    seedAgentRegistryForTests([])
    const ctx = makeCtx()
    const result = (await tool.handler({}, ctx as any)) as Record<string, unknown>
    expect(result.agents).toEqual([])
    expect(result.total).toBe(0)
  })

  it('filters by requiredFeatures based on the caller user features', async () => {
    seedAgentRegistryForTests([
      makeAgent({ id: 'catalog.read', moduleId: 'catalog', requiredFeatures: ['catalog.view'] }),
      makeAgent({ id: 'catalog.write', moduleId: 'catalog', requiredFeatures: ['catalog.manage'] }),
      makeAgent({ id: 'customers.read', moduleId: 'customers' }),
    ])
    const ctx = makeCtx({ userFeatures: ['catalog.view', 'ai_assistant.view'] })
    const result = (await tool.handler({}, ctx as any)) as Record<string, unknown>
    const agents = result.agents as Array<Record<string, unknown>>
    const ids = agents.map((agent) => agent.id).sort()
    expect(ids).toEqual(['catalog.read', 'customers.read'])
  })

  it('super-admin sees every agent regardless of requiredFeatures', async () => {
    seedAgentRegistryForTests([
      makeAgent({ id: 'catalog.admin', moduleId: 'catalog', requiredFeatures: ['catalog.admin_only'] }),
      makeAgent({ id: 'customers.mgr', moduleId: 'customers', requiredFeatures: ['customers.manage'] }),
    ])
    const ctx = makeCtx({ userFeatures: [], isSuperAdmin: true })
    const result = (await tool.handler({}, ctx as any)) as Record<string, unknown>
    const agents = result.agents as Array<Record<string, unknown>>
    expect(agents.map((agent) => agent.id).sort()).toEqual(['catalog.admin', 'customers.mgr'])
  })

  it('filters by moduleId when provided', async () => {
    seedAgentRegistryForTests([
      makeAgent({ id: 'catalog.a', moduleId: 'catalog' }),
      makeAgent({ id: 'customers.a', moduleId: 'customers' }),
    ])
    const ctx = makeCtx({ userFeatures: ['*'] })
    const result = (await tool.handler({ moduleId: 'customers' }, ctx as any)) as Record<string, unknown>
    const agents = result.agents as Array<Record<string, unknown>>
    expect(agents.map((agent) => agent.id)).toEqual(['customers.a'])
  })
})

describe('meta.describe_agent', () => {
  const tool = findTool('meta.describe_agent')

  beforeEach(() => {
    resetAgentRegistryForTests()
  })

  afterAll(() => {
    resetAgentRegistryForTests()
  })

  it('returns { agent: null, reason: "not_found" } when the id is unknown', async () => {
    const ctx = makeCtx()
    const result = (await tool.handler({ agentId: 'no.such.agent' }, ctx as any)) as Record<string, unknown>
    expect(result.agent).toBeNull()
    expect(result.reason).toBe('not_found')
  })

  it('returns { agent: null, reason: "forbidden" } when RBAC denies access', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: 'catalog.private',
        moduleId: 'catalog',
        requiredFeatures: ['catalog.private_feature'],
      }),
    ])
    const ctx = makeCtx({ userFeatures: ['ai_assistant.view'] })
    const result = (await tool.handler({ agentId: 'catalog.private' }, ctx as any)) as Record<string, unknown>
    expect(result.agent).toBeNull()
    expect(result.reason).toBe('forbidden')
  })

  it('returns a serialized description with JSON-Schema output when representable', async () => {
    const schema = z.object({
      title: z.string(),
      price: z.number(),
    })
    seedAgentRegistryForTests([
      makeAgent({
        id: 'catalog.merch',
        moduleId: 'catalog',
        description: 'Merchandising helper',
        allowedTools: ['search.hybrid_search', 'catalog.get_product_bundle'],
        executionMode: 'object',
        readOnly: true,
        mutationPolicy: 'read-only',
        acceptedMediaTypes: ['image', 'pdf'],
        taskPlan: { enabled: true },
        maxSteps: 6,
        output: { schemaName: 'MerchProposal', schema, mode: 'generate' },
        keywords: ['catalog', 'merch'],
        domain: 'catalog',
      }),
    ])
    const ctx = makeCtx({ userFeatures: ['ai_assistant.view'] })
    const result = (await tool.handler({ agentId: 'catalog.merch' }, ctx as any)) as Record<string, unknown>
    const agent = result.agent as Record<string, unknown>
    expect(agent.id).toBe('catalog.merch')
    expect(agent.executionMode).toBe('object')
    expect(agent.allowedTools).toEqual([
      'search.hybrid_search',
      'catalog.get_product_bundle',
      'meta.update_task_plan',
    ])
    expect(agent.readOnly).toBe(true)
    expect(agent.acceptedMediaTypes).toEqual(['image', 'pdf'])
    expect(agent.taskPlan).toEqual({ enabled: true })
    const output = agent.output as Record<string, unknown>
    expect(output.schemaName).toBe('MerchProposal')
    expect(output.jsonSchema).toBeDefined()
    const prompt = agent.prompt as Record<string, unknown>
    expect(prompt.systemPrompt).toBe('You are a test agent.')
    expect(prompt.hasDynamicPageContext).toBe(false)
  })

  it('still returns the agent when output.schema is non-serializable — falls back to a note', async () => {
    const brokenSchema = { _def: { typeName: 'ZodUnknown' } } as unknown as z.ZodType
    seedAgentRegistryForTests([
      makeAgent({
        id: 'catalog.broken',
        moduleId: 'catalog',
        output: { schemaName: 'Broken', schema: brokenSchema },
      }),
    ])
    const ctx = makeCtx({ userFeatures: ['ai_assistant.view'] })
    const result = (await tool.handler({ agentId: 'catalog.broken' }, ctx as any)) as Record<string, unknown>
    const agent = result.agent as Record<string, unknown>
    const output = agent.output as Record<string, unknown>
    expect(output.schemaName).toBe('Broken')
    const hasJsonSchema = Object.prototype.hasOwnProperty.call(output, 'jsonSchema')
    const hasNote = Object.prototype.hasOwnProperty.call(output, 'note')
    expect(hasJsonSchema || hasNote).toBe(true)
  })

  it('hasPageContextResolver reflects whether the agent declared a resolvePageContext callback', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: 'catalog.page',
        moduleId: 'catalog',
        resolvePageContext: async () => 'context',
      }),
    ])
    const ctx = makeCtx({ userFeatures: ['ai_assistant.view'] })
    const result = (await tool.handler({ agentId: 'catalog.page' }, ctx as any)) as Record<string, unknown>
    const agent = result.agent as Record<string, unknown>
    expect(agent.hasPageContextResolver).toBe(true)
    const prompt = agent.prompt as Record<string, unknown>
    expect(prompt.hasDynamicPageContext).toBe(true)
  })
})

describe('meta.update_task_plan', () => {
  const tool = findTool('meta.update_task_plan')

  it('returns sanitized user-visible task labels', async () => {
    const ctx = makeCtx()
    const result = (await tool.handler(
      {
        tasks: [
          {
            id: ' step one ',
            label: '  Search catalog products  ',
            detail: '  Use product search  ',
            toolName: 'catalog__search_products',
          },
        ],
      },
      ctx as any,
    )) as Record<string, unknown>

    expect(result.ok).toBe(true)
    expect(result.accepted).toBe(1)
    expect(result.tasks).toEqual([
      {
        id: 'step-one',
        label: 'Search catalog products',
        detail: 'Use product search',
        toolName: 'catalog.search_products',
      },
    ])
  })

  it('rejects hidden-reasoning-like labels at schema validation', () => {
    expect(() =>
      tool.inputSchema.parse({
        tasks: [
          {
            label: '<thinking>First I will inspect private chain of thought</thinking>',
          },
        ],
      }),
    ).toThrow(/private reasoning|Task-plan labels/i)
  })

  it('does not expose mutation capability', () => {
    expect(tool.isMutation).not.toBe(true)
    expect(tool.requiredFeatures).toEqual(['ai_assistant.view'])
  })
})

describe('meta-pack registry bootstrap', () => {
  let loadSpy: jest.SpyInstance

  beforeEach(() => {
    resetAgentRegistryForTests()
    loadSpy = jest
      .spyOn(agentRegistry, 'loadAgentRegistry')
      .mockResolvedValue(undefined)
  })

  afterEach(() => {
    loadSpy.mockRestore()
    resetAgentRegistryForTests()
  })

  it('lazy-loads the registry before listing agents (standalone MCP has no bootstrap)', async () => {
    const tool = findTool('meta.list_agents')
    await tool.handler({}, makeCtx() as any)
    expect(loadSpy).toHaveBeenCalledTimes(1)
  })

  it('lazy-loads the registry before describing an agent', async () => {
    const tool = findTool('meta.describe_agent')
    await tool.handler({ agentId: 'whatever' }, makeCtx() as any)
    expect(loadSpy).toHaveBeenCalledTimes(1)
  })
})

describe('meta-pack tool surface', () => {
  it('exports the read-only meta tools', () => {
    const names = metaAiTools.map((tool) => tool.name)
    expect(names).toEqual(['meta.list_agents', 'meta.describe_agent', 'meta.update_task_plan'])
    for (const tool of metaAiTools) {
      expect(tool.isMutation).not.toBe(true)
      expect(tool.requiredFeatures).toEqual(['ai_assistant.view'])
    }
  })
})

// ── CC-126 — the meta tools read the catalogue in the caller's tenant ────────
describe('CC-126 — meta tools over the tenant type catalogue', () => {
  const CODE_AGENT = makeAgent({
    id: 'platform.agent',
    moduleId: 'ai_assistant',
    label: 'Platform agent',
    allowedTools: ['meta.list_agents'],
  })

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
      version: 3,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as AiAgentType
  }

  beforeEach(() => {
    resetAgentRegistryForTests()
    MockRepo.mockReset()
  })

  afterAll(() => {
    resetAgentRegistryForTests()
  })

  it('list_agents merges the tenant layer, tagged, with the version carried', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () => ({ listActive: async () => [typeRow()] }) as never,
    )
    const tool = findTool('meta.list_agents')
    const result = (await tool.handler({}, makeCtx({ em: {} }) as any)) as Record<string, unknown>
    const agents = result.agents as Array<Record<string, unknown>>
    const platform = agents.find((a) => a.id === 'platform.agent')
    const tenant = agents.find((a) => a.id === 'billing.assistant')
    expect(platform?.layer).toBe('platform')
    expect(tenant?.layer).toBe('tenant')
    expect(tenant?.version).toBe(3)
    expect(tenant?.moduleId).toBe('ai_assistant')
    // a tenant type is structurally a chat agent — both markers hold
    expect(tenant?.hasOutputSchema).toBe(false)
    expect(tenant?.hasPageContextResolver).toBe(false)
  })

  it('list_agents honours a tenant type\'s requiredFeatures under the caller\'s RBAC', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () =>
        ({
          listActive: async () => [
            typeRow(),
            typeRow({
              key: 'secret.assistant',
              id: 'row-2',
              bundle: { ...typeRow().bundle, requiredFeatures: ['invoices.manage'] },
            }),
          ],
        }) as never,
    )
    const tool = findTool('meta.list_agents')
    const result = (await tool.handler({}, makeCtx({ em: {} }) as any)) as Record<string, unknown>
    const ids = (result.agents as Array<Record<string, unknown>>).map((a) => a.id)
    expect(ids).toContain('billing.assistant')
    expect(ids).not.toContain('secret.assistant')
  })

  it('list_agents does not offer a shadowed tenant row beside the platform entry', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () => ({ listActive: async () => [typeRow({ key: 'platform.agent', id: 'row-2' })] }) as never,
    )
    const tool = findTool('meta.list_agents')
    const result = (await tool.handler({}, makeCtx({ em: {} }) as any)) as Record<string, unknown>
    const ids = (result.agents as Array<Record<string, unknown>>).map((a) => a.id)
    expect(ids.filter((id) => id === 'platform.agent')).toHaveLength(1)
  })

  it('list_agents sees the platform layer alone with no DB handle', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(() => {
      throw new Error('the repository must not be constructed without an em')
    })
    const tool = findTool('meta.list_agents')
    const result = (await tool.handler({}, makeCtx() as any)) as Record<string, unknown>
    const agents = result.agents as Array<Record<string, unknown>>
    expect(agents).toHaveLength(1)
    expect(agents[0].layer).toBe('platform')
  })

  it('describe_agent describes a tenant type as layer "tenant"', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () => ({ findActiveByKey: async (key: string) => (key === 'billing.assistant' ? typeRow() : null) }) as never,
    )
    const tool = findTool('meta.describe_agent')
    const result = (await tool.handler({ agentId: 'billing.assistant' }, makeCtx({ em: {} }) as any)) as Record<string, unknown>
    const agent = result.agent as Record<string, unknown>
    expect(result.reason).toBeUndefined()
    expect(agent.id).toBe('billing.assistant')
    expect(agent.layer).toBe('tenant')
    // the prompt rides under `prompt`, not the summary — and a tenant type has
    // no dynamic page-context hook to report
    const prompt = agent.prompt as Record<string, unknown>
    expect(prompt.systemPrompt).toBe('You are a billing assistant.')
    expect(prompt.hasDynamicPageContext).toBe(false)
  })

  it('describe_agent reports a code agent as layer "platform" even when a tenant row collides', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () => ({ findActiveByKey: async () => typeRow({ key: 'platform.agent' }) }) as never,
    )
    const tool = findTool('meta.describe_agent')
    const result = (await tool.handler({ agentId: 'platform.agent' }, makeCtx({ em: {} }) as any)) as Record<string, unknown>
    const agent = result.agent as Record<string, unknown>
    expect(agent.layer).toBe('platform')
    expect(agent.label).toBe('Platform agent')
  })

  it('describe_agent still returns not_found for a key neither layer holds', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(() => ({ findActiveByKey: async () => null }) as never)
    const tool = findTool('meta.describe_agent')
    const result = (await tool.handler({ agentId: 'nope.nope' }, makeCtx({ em: {} }) as any)) as Record<string, unknown>
    expect(result.agent).toBeNull()
    expect(result.reason).toBe('not_found')
  })
})
