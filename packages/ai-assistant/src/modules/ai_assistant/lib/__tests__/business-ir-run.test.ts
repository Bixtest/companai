/**
 * `CC-59` — the proof that the Business-IR chain **runs**.
 *
 * The chain (author → compile → execute) had every layer built and tested, and no
 * caller. This suite is the caller's proof: a prompt goes in, and **rows plus the
 * compiled plan plus its provenance** come out — not a bare IR, not a plan that
 * never executed.
 *
 * The model is stubbed, exactly as the authoring suite stubs it, for the same
 * reason: what is under test is the **wire and its refusals**, not the cleverness
 * of a given model. The query engine is a spy: the point is that the caller
 * reaches `engine.query` with a **scoped, bounded** plan, and that when any layer
 * refuses, the caller returns a value instead of throwing.
 *
 * The refusals carry the suite's weight. A caller that runs anything is worse
 * than no caller, because a read that escapes its tenant is invisible — so the
 * suite drives an unbound principal, a model that widens, an IR that will not
 * compile, a missing physical binding, and an engine that throws, and requires
 * each to come back as a named, closed failure.
 */

import type { AiAgentDefinition } from '../ai-agent-definition'

const generateObjectMock = jest.fn()
const streamObjectMock = jest.fn()
const stepCountIsMock = jest.fn((count: number) => ({ __stopWhen: 'stepCount', count }))
const convertToModelMessagesMock = jest.fn((messages: unknown) => messages)
const streamTextMock = jest.fn()

jest.mock('ai', () => {
  const actual = jest.requireActual('ai')
  return {
    ...actual,
    generateObject: (...args: unknown[]) => generateObjectMock(...args),
    streamObject: (...args: unknown[]) => streamObjectMock(...args),
    streamText: (...args: unknown[]) => streamTextMock(...args),
    stepCountIs: (...args: unknown[]) => stepCountIsMock(...(args as [number])),
    convertToModelMessages: (...args: unknown[]) => convertToModelMessagesMock(...args),
  }
})

const createModelMock = jest.fn(
  (options: { modelId: string; apiKey: string }) => ({ id: options.modelId, apiKey: options.apiKey }),
)
const resolveApiKeyMock = jest.fn(() => 'test-api-key')

jest.mock('@open-mercato/shared/lib/ai/llm-provider-registry', () => ({
  llmProviderRegistry: {
    resolveFirstConfigured: () => ({
      id: 'test-provider',
      defaultModel: 'provider-default-model',
      resolveApiKey: resolveApiKeyMock,
      createModel: createModelMock,
    }),
  },
}))

jest.mock('../model-factory', () => {
  const actual = jest.requireActual('../model-factory')
  return {
    ...actual,
    createModelFactory: () => ({
      resolveModel: () => ({
        model: { id: 'stub-model', provider: 'stub' },
        provider: { id: 'stub', createModel: createModelMock },
        source: 'test',
        modelId: 'stub-model',
      }),
    }),
  }
})

// The binding lookup is the one DB read on this path (`CC-57`). Its real
// repository runs `em.findOne` through `findOneWithDecryption`, so the
// `em: {}` stub every other test uses cannot reach it. Mock the repository the
// same way the routed binding test does (`api/ai/run-object/__tests__/
// binding-enforcement.test.ts`), returning **no row** — which is exactly the
// unbound case the refusal test asserts. A human never reaches this repository
// (`resolveAgentBinding` short-circuits), so the human tests are unaffected.
jest.mock('../../data/repositories/AiAgentBindingRepository', () => ({
  AiAgentBindingRepository: class {
    async findBinding(): Promise<null> {
      return null
    }
  },
}))

import { buildModelDescriptor } from '@open-mercato/shared/lib/kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '@open-mercato/shared/lib/kernel/model'
import { createBindingsFromDeclarations } from '@open-mercato/shared/lib/business-ir/bindings'
import type { QueryOptions } from '@open-mercato/shared/lib/query/types'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../agent-registry'
import { toolRegistry } from '../tool-registry'
import { BUSINESS_IR_AGENT_ID } from '../business-ir-author'
import {
  DEFAULT_ROW_LIMIT,
  MAX_TIME_RANGE_DAYS,
  applyDefaultBounds,
  runBusinessQueryPrompt,
  type RunBusinessQueryPromptInput,
} from '../business-ir-run'

/** The same real module the authoring suite compiles against (miniature). */
const DECLARATIONS: KernelDeclarationInput = {
  customEntities: [
    { id: 'communication_channels:external_conversation', label: 'External conversation' },
  ],
  customFieldSets: [
    {
      entity: 'communication_channels:external_conversation',
      source: 'communication_channels',
      fields: [
        { key: 'subject', kind: 'text', label: 'Subject' },
        { key: 'unread_count', kind: 'integer', label: 'Unread', filterable: true },
        { key: 'last_message_at', kind: 'datetime', label: 'Last message' },
      ],
    },
  ],
  extensions: [],
} as unknown as KernelDeclarationInput

let cached:
  | { model: ModelDescriptor; bindings: ReturnType<typeof createBindingsFromDeclarations> }
  | null = null
function getModel() {
  if (!cached) {
    const model = buildModelDescriptor(DECLARATIONS)
    cached = { model, bindings: createBindingsFromDeclarations(DECLARATIONS, model) }
  }
  return cached
}

function makeAgent(
  overrides: Partial<AiAgentDefinition> & Pick<AiAgentDefinition, 'id' | 'moduleId'>,
): AiAgentDefinition {
  return {
    label: `${overrides.id} label`,
    description: `${overrides.id} description`,
    systemPrompt: 'You turn a business request into a BusinessQueryIR.',
    allowedTools: [],
    ...overrides,
  }
}

const baseAuthContext = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userId: 'user-1',
  features: ['*'],
  isSuperAdmin: true,
}

/**
 * A **human** server context: a bare `sub` with no machine prefix resolves to a
 * human principal through the real `requirePrincipal`, so `resolveAgentBinding`
 * is a passthrough and consults no database row — the stub `em` is honest.
 */
const humanAuth = { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' }

/** A spy engine: records the `(entity, opts)` it was asked to read. */
function makeEngine(overrides?: {
  items?: unknown[]
  total?: number
  reject?: Error
}) {
  const query = jest.fn(async (_entity: string, _opts?: QueryOptions) => {
    if (overrides?.reject) throw overrides.reject
    const items = overrides?.items ?? [{ id: 'row-1' }, { id: 'row-2' }]
    return { items, total: overrides?.total ?? items.length }
  })
  return { query }
}

function callInput(overrides: {
  prompt: string
  engine?: ReturnType<typeof makeEngine>
  authContext?: typeof baseAuthContext
  auth?: typeof humanAuth
  bindings?: ReturnType<typeof createBindingsFromDeclarations>
}): RunBusinessQueryPromptInput {
  const { model, bindings } = getModel()
  return {
    prompt: overrides.prompt,
    authContext: overrides.authContext ?? baseAuthContext,
    auth: (overrides.auth ?? humanAuth) as RunBusinessQueryPromptInput['auth'],
    em: {} as unknown as RunBusinessQueryPromptInput['em'],
    model,
    bindings: overrides.bindings ?? bindings,
    engine: overrides.engine ?? makeEngine(),
  }
}

/** A model answer that is a valid `BusinessQueryIR` for the model above. */
const GOOD_IR = {
  operation: 'list',
  entity: 'external_conversation',
  dimensions: ['subject', 'unread_count'],
  filters: [{ field: 'unread_count', operator: '>', value: 2 }],
  sort: [{ field: 'unread_count', direction: 'desc' }],
  limit: 50,
}

function seedAuthorAgent() {
  seedAgentRegistryForTests([
    makeAgent({
      id: BUSINESS_IR_AGENT_ID,
      moduleId: 'ai_assistant',
      executionMode: 'object',
      mutationPolicy: 'read-only',
    }),
  ])
}

describe('CC-59 — runBusinessQueryPrompt runs the whole chain', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    toolRegistry.clear()
    generateObjectMock.mockImplementation(async () => ({
      object: GOOD_IR,
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 5 },
    }))
  })

  afterAll(() => {
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  it('prompt → IR → compiled → executed, returning rows AND plan AND provenance', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({ prompt: 'unread conversations over 2', engine }),
    )

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error('unreachable')

    // Not a bare IR: the result carries the executed rows, the compiled plan,
    // and its provenance. The whole point of the item.
    expect(outcome.rows).toHaveLength(2)
    expect(outcome.total).toBe(2)
    expect(outcome.ir.entity).toBe('external_conversation')
    expect(outcome.plan.provenance.entityId).toBe('external_conversation')
    expect(outcome.provenance.modelVersion).toBeTruthy()
    expect(outcome.entity).toBe('communication_channels:external_conversation')

    // The engine was reached exactly once, with the physical plan.
    expect(engine.query).toHaveBeenCalledTimes(1)
    const [entity, opts] = engine.query.mock.calls[0]
    expect(entity).toBe('communication_channels:external_conversation')
    expect((opts as QueryOptions).filters).toBeDefined()
  })

  it('scopes the read to the SESSION tenant/org, never the IR (B5b)', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    await runBusinessQueryPrompt(callInput({ prompt: 'unread conversations', engine }))

    const opts = engine.query.mock.calls[0][1] as QueryOptions
    expect(opts.tenantId).toBe('tenant-1')
    expect(opts.organizationId).toBe('org-1')
  })

  it('a prompt cannot widen scope: a session with a different tenant scopes to THAT tenant', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    await runBusinessQueryPrompt(
      callInput({
        prompt: 'anything',
        engine,
        authContext: { ...baseAuthContext, tenantId: 'tenant-9', organizationId: 'org-9' },
        auth: { sub: 'user-1', tenantId: 'tenant-9', orgId: 'org-9' },
      }),
    )

    const opts = engine.query.mock.calls[0][1] as QueryOptions
    expect(opts.tenantId).toBe('tenant-9')
    expect(opts.organizationId).toBe('org-9')
  })

  it('applies a default row limit when the IR states none (B5e)', async () => {
    seedAuthorAgent()
    const engine = makeEngine()
    // No `limit` in the IR at all.
    generateObjectMock.mockImplementation(async () => ({
      object: { ...GOOD_IR, limit: undefined },
      finishReason: 'stop',
    }))

    const outcome = await runBusinessQueryPrompt(callInput({ prompt: 'everything', engine }))

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error('unreachable')
    expect(outcome.appliedBounds.defaultLimit).toBe(true)
    const opts = engine.query.mock.calls[0][1] as QueryOptions
    expect(opts.page?.pageSize).toBe(DEFAULT_ROW_LIMIT)
  })

  it('does NOT override a limit the IR stated', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(callInput({ prompt: 'top 50', engine }))

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error('unreachable')
    expect(outcome.appliedBounds.defaultLimit).toBe(false)
    const opts = engine.query.mock.calls[0][1] as QueryOptions
    expect(opts.page?.pageSize).toBe(50)
  })

  it('caps an unbounded time-anchored query to a max range (B5e)', async () => {
    seedAuthorAgent()
    const engine = makeEngine()
    generateObjectMock.mockImplementation(async () => ({
      object: { ...GOOD_IR, timeRange: { field: 'last_message_at' }, limit: 10 },
      finishReason: 'stop',
    }))

    const outcome = await runBusinessQueryPrompt(callInput({ prompt: 'recent', engine }))

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) throw new Error('unreachable')
    expect(outcome.appliedBounds.timeRangeCapped).toBe(true)
    const opts = engine.query.mock.calls[0][1] as QueryOptions
    const filters = (opts.filters ?? []) as Array<{ field: string; op: string; value: unknown }>
    const cap = filters.find((f) => f.field === 'last_message_at' && f.op === 'gte')
    expect(cap).toBeDefined()
  })

  /* ---- the refusals, each a value (`B5c`) ------------------------- */

  it('refuses as agent_not_bound when the principal is an unbound AI worker, before the model', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({
        prompt: 'anything',
        engine,
        // An `ai_worker:` subject is a machine principal → the binding is enforced.
        auth: { sub: 'ai_worker:w-1', tenantId: 'tenant-1', orgId: 'org-1' },
      }),
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('agent_not_bound')
    expect(generateObjectMock).not.toHaveBeenCalled()
    expect(engine.query).not.toHaveBeenCalled()
  })

  it('refuses as schema_rejected when the model widens the IR with a scope key', async () => {
    seedAuthorAgent()
    const engine = makeEngine()
    generateObjectMock.mockImplementation(async () => ({
      object: { ...GOOD_IR, tenantId: 'tenant-other' },
      finishReason: 'stop',
    }))

    const outcome = await runBusinessQueryPrompt(callInput({ prompt: 'mine only', engine }))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('schema_rejected')
    expect(engine.query).not.toHaveBeenCalled()
  })

  it('refuses as compile_failed when the IR names a field the model lacks', async () => {
    seedAuthorAgent()
    const engine = makeEngine()
    generateObjectMock.mockImplementation(async () => ({
      object: { ...GOOD_IR, dimensions: ['does_not_exist'] },
      finishReason: 'stop',
    }))

    const outcome = await runBusinessQueryPrompt(callInput({ prompt: 'ghost field', engine }))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('compile_failed')
    expect(engine.query).not.toHaveBeenCalled()
  })

  it('refuses as no_binding when the compiled entity has no physical target', async () => {
    seedAuthorAgent()
    const engine = makeEngine()
    const { model } = getModel()
    // An empty binding set: the entity compiles but has nowhere to read from.
    const emptyBindings = createBindingsFromDeclarations({} as KernelDeclarationInput, model)

    const outcome = await runBusinessQueryPrompt(
      callInput({ prompt: 'anything', engine, bindings: emptyBindings }),
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('no_binding')
    expect(engine.query).not.toHaveBeenCalled()
  })

  it('refuses as engine_failed when the query engine throws', async () => {
    seedAuthorAgent()
    const engine = makeEngine({ reject: new Error('db down') })

    const outcome = await runBusinessQueryPrompt(callInput({ prompt: 'anything', engine }))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('engine_failed')
    expect(outcome.reason).toContain('db down')
  })
})

describe('CC-59 — applyDefaultBounds is pure and gap-filling', () => {
  const basePlan = {
    ir: GOOD_IR,
    logical: { entity: 'external_conversation', dimensions: [], measures: [], relationships: [] },
    physical: {} as QueryOptions,
    provenance: { modelVersion: 'v1', entityId: 'external_conversation', stages: [], gaps: [] },
  }

  it('adds a default page size only when none is present', () => {
    const a = applyDefaultBounds(basePlan)
    expect(a.applied.defaultLimit).toBe(true)
    expect(a.plan.physical.page?.pageSize).toBe(DEFAULT_ROW_LIMIT)

    const b = applyDefaultBounds({ ...basePlan, physical: { page: { pageSize: 7 } } })
    expect(b.applied.defaultLimit).toBe(false)
    expect(b.plan.physical.page?.pageSize).toBe(7)
  })

  it('caps a time-anchored query only when it has no lower bound', () => {
    const unbounded = applyDefaultBounds({
      ...basePlan,
      logical: { ...basePlan.logical, timeBasis: 'last_message_at' },
    })
    expect(unbounded.applied.timeRangeCapped).toBe(true)

    const bounded = applyDefaultBounds({
      ...basePlan,
      logical: {
        ...basePlan.logical,
        timeRange: { field: 'last_message_at', from: '2024-01-01T00:00:00.000Z' },
      },
    })
    expect(bounded.applied.timeRangeCapped).toBe(false)
  })

  it('does not mutate the input plan', () => {
    const physicalBefore = JSON.stringify(basePlan.physical)
    applyDefaultBounds(basePlan)
    expect(JSON.stringify(basePlan.physical)).toBe(physicalBefore)
  })

  it('uses the declared max range constant', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const { plan } = applyDefaultBounds(
      { ...basePlan, logical: { ...basePlan.logical, timeBasis: 'last_message_at' } },
      now,
    )
    const filters = (plan.physical.filters ?? []) as Array<{ field: string; value: unknown }>
    const cap = filters.find((f) => f.field === 'last_message_at')
    const capDate = new Date(String(cap?.value))
    const days = (now.getTime() - capDate.getTime()) / (24 * 60 * 60 * 1000)
    expect(Math.round(days)).toBe(MAX_TIME_RANGE_DAYS)
  })
})
