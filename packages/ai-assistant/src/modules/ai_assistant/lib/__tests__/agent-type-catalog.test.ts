import type { AiAgentType } from '../../data/entities'
import {
  AGENT_TYPE_MODULE_ID,
  AgentTypeBundleError,
  agentTypeBundleSchema,
  listAgentCatalog,
  materializeAgentTypeDefinition,
  resolveAgentCatalogEntry,
  resolveAgentDefinition,
  validateAgentTypeBundle,
} from '../agent-type-catalog'
import { resetAgentRegistryForTests, seedAgentRegistryForTests } from '../agent-registry'
import { AiAgentTypeRepository } from '../../data/repositories/AiAgentTypeRepository'

jest.mock('../../data/repositories/AiAgentTypeRepository')

const MockRepo = AiAgentTypeRepository as jest.MockedClass<typeof AiAgentTypeRepository>

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
    tenantId: '11111111-1111-1111-1111-111111111111',
    key: 'billing.assistant',
    bundle: {
      label: 'Billing assistant',
      description: 'Answers billing questions.',
      systemPrompt: 'You are a billing assistant.',
      allowedTools: ['invoices.list', 'invoices.get'],
    },
    version: 1,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AiAgentType
}

afterEach(() => {
  MockRepo.mockReset()
  resetAgentRegistryForTests()
})

describe('validateAgentTypeBundle — the write-time gate', () => {
  it('accepts the full JSON-safe bundle', () => {
    const bundle = validateAgentTypeBundle({
      label: 'Billing assistant',
      description: 'Answers billing questions.',
      systemPrompt: 'You are a billing assistant.',
      allowedTools: ['invoices.list'],
      suggestions: [{ label: 'List invoices', prompt: 'list my invoices' }],
      defaultProvider: 'openai',
      defaultModel: 'gpt-5-mini',
      defaultBaseUrl: 'https://api.openai.com/v1',
      allowRuntimeOverride: false,
      acceptedMediaTypes: ['pdf'],
      requiredFeatures: ['invoices.view'],
      taskPlan: { enabled: true },
      uiParts: ['text'],
      readOnly: true,
      mutationPolicy: 'confirm-required',
      maxSteps: 12,
      loop: { maxSteps: 12, stopWhen: [{ kind: 'stepCount', count: 12 }] },
      keywords: ['billing'],
      domain: 'billing',
      dataCapabilities: { entities: ['invoice'], operations: ['read'], searchableFields: ['number'] },
    })
    expect(bundle.label).toBe('Billing assistant')
    expect(bundle.mutationPolicy).toBe('confirm-required')
  })

  it('refuses object execution mode — a tenant type is structurally a chat agent', () => {
    expect(() =>
      validateAgentTypeBundle({
        label: 'x',
        description: '',
        systemPrompt: 'p',
        allowedTools: ['t'],
        executionMode: 'object',
      }),
    ).toThrow(AgentTypeBundleError)
    expect(agentTypeBundleSchema.safeParse({ label: 'x', description: '', systemPrompt: 'p', allowedTools: ['t'], executionMode: 'object' }).success).toBe(false)
  })

  it('refuses a structured output schema — it cannot be JSON', () => {
    expect(() =>
      validateAgentTypeBundle({
        label: 'x',
        description: '',
        systemPrompt: 'p',
        allowedTools: ['t'],
        output: { schemaName: 's', schema: { _def: {} } },
      }),
    ).toThrow(AgentTypeBundleError)
  })

  it('refuses a moduleId — a tenant cannot name a module env-override namespace', () => {
    expect(() =>
      validateAgentTypeBundle({
        label: 'x',
        description: '',
        systemPrompt: 'p',
        allowedTools: ['t'],
        moduleId: 'crm',
      }),
    ).toThrow(AgentTypeBundleError)
  })

  it('refuses a custom loop stop condition — it carries a function', () => {
    expect(() =>
      validateAgentTypeBundle({
        label: 'x',
        description: '',
        systemPrompt: 'p',
        allowedTools: ['t'],
        loop: { stopWhen: [{ kind: 'custom', stop: () => true }] },
      }),
    ).toThrow(AgentTypeBundleError)
  })

  it('refuses an empty tool list and a missing prompt', () => {
    const bad = { label: 'x', description: '', systemPrompt: 'p', allowedTools: [] }
    expect(agentTypeBundleSchema.safeParse(bad).success).toBe(false)
    const noPrompt = { label: 'x', description: '', allowedTools: ['t'] }
    expect(agentTypeBundleSchema.safeParse(noPrompt).success).toBe(false)
  })

  it('carries the issue paths on the typed error', () => {
    try {
      validateAgentTypeBundle({ label: '', description: '', systemPrompt: 'p', allowedTools: ['t'] })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AgentTypeBundleError)
      expect((error as AgentTypeBundleError).issues.join(' ')).toContain('label')
    }
  })
})

describe('materializeAgentTypeDefinition — the fail-closed read', () => {
  it('materializes the validated shape, chat-only, moduleId owned by the resolver', () => {
    const def = materializeAgentTypeDefinition(
      typeRow({
        bundle: {
          label: 'Billing assistant',
          description: 'Answers billing questions.',
          systemPrompt: 'You are a billing assistant.',
          allowedTools: ['invoices.list'],
          mutationPolicy: 'read-only',
          readOnly: true,
          loop: { maxSteps: 7, stopWhen: [{ kind: 'hasToolCall', toolName: 'invoices.list' }] },
        },
      }),
    )
    expect(def.id).toBe('billing.assistant')
    expect(def.moduleId).toBe(AGENT_TYPE_MODULE_ID)
    expect(def.executionMode).toBeUndefined()
    expect(def.executionEngine).toBeUndefined()
    expect(def.readOnly).toBe(true)
    expect(def.mutationPolicy).toBe('read-only')
    expect(def.loop).toEqual({ maxSteps: 7, stopWhen: [{ kind: 'hasToolCall', toolName: 'invoices.list' }] })
  })

  it('narrows a hostile bundle to the safe side — every field, no crash', () => {
    const def = materializeAgentTypeDefinition(
      typeRow({
        bundle: {
          label: 42,
          description: {},
          systemPrompt: null,
          allowedTools: 'invoices.list',
          suggestions: [{ label: 1, prompt: 2 }],
          mutationPolicy: 'ACTIVE',
          maxSteps: 'many',
          loop: { maxSteps: -3, stopWhen: 'none' },
          dataCapabilities: { operations: ['write'] },
          acceptedMediaTypes: ['video'],
        } as unknown as Record<string, unknown>,
      }),
    )
    expect(def.label).toBe('')
    expect(def.description).toBe('')
    expect(def.systemPrompt).toBe('')
    expect(def.allowedTools).toEqual([])
    expect(def.suggestions).toBeUndefined()
    expect(def.mutationPolicy).toBeUndefined()
    expect(def.maxSteps).toBeUndefined()
    expect(def.loop).toBeUndefined()
    expect(def.dataCapabilities).toBeUndefined()
    expect(def.acceptedMediaTypes).toBeUndefined()
  })

  it('ignores the fields a row can never honour, even hand-edited', () => {
    const def = materializeAgentTypeDefinition(
      typeRow({
        bundle: {
          label: 'x',
          description: '',
          systemPrompt: 'p',
          allowedTools: ['t'],
          executionMode: 'object',
          executionEngine: 'tool-loop-agent',
          output: { schemaName: 's', schema: {} },
          moduleId: 'crm',
        } as unknown as Record<string, unknown>,
      }),
    )
    expect(def).not.toHaveProperty('executionMode')
    expect(def).not.toHaveProperty('output')
    expect(def).not.toHaveProperty('moduleId', 'crm')
    expect(def.moduleId).toBe(AGENT_TYPE_MODULE_ID)
  })
})

describe('resolveAgentDefinition — code-first precedence', () => {
  const scope = { tenantId: '11111111-1111-1111-1111-111111111111' }
  const em = {} as never

  it('returns the CODE definition when a tenant row claims the same key', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () =>
        ({
          findActiveByKey: async () => typeRow({ key: 'platform.agent' }),
        }) as never,
    )
    const def = await resolveAgentDefinition({ agentId: 'platform.agent', scope, em })
    expect(def?.label).toBe('Platform agent')
    expect(def?.moduleId).toBe('ai_assistant')
  })

  it('returns the materialized tenant definition for an unclaimed key', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () =>
        ({
          findActiveByKey: async (key: string) => (key === 'billing.assistant' ? typeRow() : null),
        }) as never,
    )
    const def = await resolveAgentDefinition({ agentId: 'billing.assistant', scope, em })
    expect(def?.id).toBe('billing.assistant')
    expect(def?.label).toBe('Billing assistant')
  })

  it('resolves nothing for an unknown key', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(() => ({ findActiveByKey: async () => null }) as never)
    expect(await resolveAgentDefinition({ agentId: 'nope.nope', scope, em })).toBeNull()
  })

  it('resolves nothing without a tenant scope', async () => {
    seedAgentRegistryForTests([])
    MockRepo.mockImplementation(() => ({ findActiveByKey: async () => typeRow() }) as never)
    expect(await resolveAgentDefinition({ agentId: 'billing.assistant', scope: { tenantId: '' }, em })).toBeNull()
  })
})

describe('listAgentCatalog — both layers, tagged', () => {
  const scope = { tenantId: '11111111-1111-1111-1111-111111111111' }
  const em = {} as never

  it('tags platform and tenant entries, and marks a shadowed tenant row', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () =>
        ({
          listActive: async () => [typeRow(), typeRow({ key: 'platform.agent', id: 'row-2' })],
        }) as never,
    )
    const entries = await listAgentCatalog(scope, em)
    const platform = entries.find((entry) => entry.id === 'platform.agent')
    const live = entries.find((entry) => entry.id === 'billing.assistant')
    const shadowed = entries.filter((entry) => entry.id === 'platform.agent')
    expect(platform?.layer).toBe('platform')
    expect(live?.layer).toBe('tenant')
    expect(live?.shadowedByCode).toBe(false)
    expect(live?.version).toBe(1)
    // the code layer is the one entry for a claimed key with layer 'platform';
    // the tenant row for it is present and flagged, never silently dropped
    expect(shadowed.find((entry) => entry.layer === 'tenant')?.shadowedByCode).toBe(true)
  })

  it('returns the platform layer alone when there is no tenant scope', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    const entries = await listAgentCatalog({ tenantId: '' }, em)
    expect(entries).toHaveLength(1)
    expect(entries[0].layer).toBe('platform')
  })

  it('returns the platform layer alone when no DB handle is reachable', async () => {
    // The tool-path shape: a caller with a tenant but no container (`meta.*`
    // handlers in standalone MCP servers). The tenant layer is unreachable,
    // not absent-by-policy — and the repository is never constructed.
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(() => {
      throw new Error('the repository must not be constructed without an em')
    })
    const entries = await listAgentCatalog(scope)
    expect(entries).toHaveLength(1)
    expect(entries[0].layer).toBe('platform')
  })
})

describe('resolveAgentCatalogEntry — the same precedence, layer reported', () => {
  const scope = { tenantId: '11111111-1111-1111-1111-111111111111' }
  const em = {} as never

  it('reports layer "platform" for a code-declared id', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(() => ({ findActiveByKey: async () => typeRow() }) as never)
    const resolved = await resolveAgentCatalogEntry({ agentId: 'platform.agent', scope, em })
    expect(resolved?.layer).toBe('platform')
    expect(resolved?.definition.label).toBe('Platform agent')
  })

  it('reports layer "tenant" for an unclaimed key held as a row', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(
      () => ({ findActiveByKey: async (key: string) => (key === 'billing.assistant' ? typeRow() : null) }) as never,
    )
    const resolved = await resolveAgentCatalogEntry({ agentId: 'billing.assistant', scope, em })
    expect(resolved?.layer).toBe('tenant')
    expect(resolved?.definition.id).toBe('billing.assistant')
  })

  it('resolves nothing for an unknown key, scope-less call, or no em', async () => {
    seedAgentRegistryForTests([CODE_AGENT])
    MockRepo.mockImplementation(() => ({ findActiveByKey: async () => null }) as never)
    expect(await resolveAgentCatalogEntry({ agentId: 'nope.nope', scope, em })).toBeNull()
    expect(await resolveAgentCatalogEntry({ agentId: 'platform.agent', scope: { tenantId: '' }, em })).toBeNull()
    expect(await resolveAgentCatalogEntry({ agentId: 'billing.assistant', scope })).toBeNull()
  })

  it('refuses the tenant layer with no DB handle even when a row exists', async () => {
    // The `em` is the only thing that makes the tenant layer reachable; without
    // it the resolver must not ask the DB at all — a container-less caller
    // fails closed rather than inventing a handle.
    seedAgentRegistryForTests([])
    MockRepo.mockImplementation(() => ({ findActiveByKey: async () => typeRow() }) as never)
    expect(await resolveAgentCatalogEntry({ agentId: 'billing.assistant', scope })).toBeNull()
  })
})
