/**
 * The wire from a model to the Business IR (G-17).
 *
 * This suite is the end-to-end proof of the item's *only* claim: a model can be
 * pointed at the IR's own schema, through the platform's existing structured-
 * output path, and what comes back is a **real** IR that the **existing**
 * compiler accepts. Not a paraphrase of one, not a shape that resembles one — an
 * object that `compileQuery` takes.
 *
 * The model is stubbed, deliberately. What is under test is the *wire*, not the
 * intelligence of a particular model: we need to know that if a model produces
 * this JSON, the platform turns it into a compiled plan and refuses it if it
 * widened. Whether a *given locally-hosted model* is clever enough to produce the
 * right JSON is a separate question, answered by a live smoke test, not here.
 *
 * The negative cases matter more than the positive one. A wire that accepts
 * anything is worse than no wire, because the compiler's refusals are the thing
 * that keeps a model from reaching outside its tenant. So the suite drives an IR
 * carrying `tenantId`, and an IR with a guessed field, and requires the schema to
 * reject both **before** the compiler ever sees them.
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

/**
 * The model *factory*, mocked so this suite tests the wire and not the provider
 * configuration.
 *
 * The wire's job is to hand a schema to the structured-output runtime; whether a
 * particular provider is configured is a different concern, tested elsewhere. The
 * factory's real path fans out over env vars, tenant allowlists and a model
 * registry, and needs a live provider — mocking it here keeps this suite failing
 * for the reason it is *about*.
 *
 * `resolveAgentModel` is not re-implemented: it still runs, it just gets a
 * factory whose `resolveModel` returns a stand-in.
 */
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

import { buildModelDescriptor } from '@open-mercato/shared/lib/kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '@open-mercato/shared/lib/kernel/model'
import { createBindingsFromDeclarations } from '@open-mercato/shared/lib/business-ir/bindings'
import { compileQuery } from '@open-mercato/shared/lib/business-ir/compile'
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../agent-registry'
import { toolRegistry } from '../tool-registry'
import { BUSINESS_IR_AGENT_ID, authorBusinessQueryIr } from '../business-ir-author'

/**
 * The declaration set the compiler is driven against.
 *
 * This is **not** an invented shape: it is the same real module the compiler's own
 * suite uses (`communication_channels` — the one module of 34 that declares
 * extensions), carried here in miniature so the end-to-end test compiles an IR
 * against a model that genuinely exists rather than against a story about one.
 */
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

/**
 * Build the model + bindings pair the compiler needs, once.
 *
 * The kernel's declaration and binding shapes are G-01 / G-02's concern; this
 * suite only needs a model the compiler does not refuse.
 */
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

const baseAuth = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userId: 'user-1',
  features: ['*'],
  isSuperAdmin: true,
}

/**
 * `CC-57` — the two inputs the binding lookup needs.
 *
 * `auth` is the **authenticated server context** (distinct from `authContext`,
 * the *resolved* run scope): a bare `sub` with no `ai_worker:`/`api_key:` prefix
 * resolves — through the **real** `requirePrincipal` → `derivePrincipal` this
 * suite does not mock — to a **human** principal. A human is a passthrough in
 * `resolveAgentBinding` (`B4`), so it consults **no** database row; that is why
 * `em` can be a stand-in here and the six cases below stay byte-identical to the
 * pre-`CC-57` wire (the assertion the suite is *for*). The worker and
 * bound-scope cases — where the binding genuinely affects the run — live in the
 * dedicated `business-ir-author-binding.test.ts`.
 */
const humanAuth = { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' }
const emStub = {} as unknown as Parameters<
  typeof authorBusinessQueryIr
>[0]['em']

/** The three inputs every call in this suite supplies. */
function callInput(overrides: {
  prompt: string
  authContext?: typeof baseAuth
}): Parameters<typeof authorBusinessQueryIr>[0] {
  return {
    prompt: overrides.prompt,
    authContext: overrides.authContext ?? baseAuth,
    auth: humanAuth,
    em: emStub,
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

describe('authorBusinessQueryIr — the model→IR wire (G-17)', () => {
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

  it('constrains the model to the IR schema, under the IR schema name', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        executionMode: 'object',
        mutationPolicy: 'read-only',
      }),
    ])

    await authorBusinessQueryIr(callInput({ prompt: 'invoices over 10k by customer' }))

    expect(generateObjectMock).toHaveBeenCalledTimes(1)
    const callArg = generateObjectMock.mock.calls[0][0] as { schemaName: string; schema: unknown }
    // The name is the shared constant, and the schema is the shared mirror — not
    // a private copy declared in this module. If those ever diverge, this fails.
    expect(callArg.schemaName).toBe('BusinessQueryIR')
    expect(callArg.schema).toBe(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@open-mercato/shared/lib/business-ir/schema').businessQueryIrSchema,
    )
  })

  it('returns ok:true and a real IR when the model answers in shape', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        executionMode: 'object',
        mutationPolicy: 'read-only',
      }),
    ])

    const result = await authorBusinessQueryIr(
      callInput({ prompt: 'invoices over 10k by customer' }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.ir.operation).toBe('list')
    expect(result.ir.entity).toBe('external_conversation')
  })

  it('the IR it returns is accepted by the existing compiler', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        executionMode: 'object',
        mutationPolicy: 'read-only',
      }),
    ])

    const authored = await authorBusinessQueryIr(
      callInput({ prompt: 'invoices over 10k by customer' }),
    )
    expect(authored.ok).toBe(true)
    if (!authored.ok) throw new Error('unreachable')

    const { model, bindings } = getModel()
    const compiled = compileQuery(authored.ir, model, { tenantId: 'tenant-1' }, bindings)

    // The claim of the whole item: a model's answer becomes a compiled plan that
    // the platform's own compiler produced — not something that merely parses.
    expect(compiled.ok).toBe(true)
  })

  it('refuses an IR the model widened with a scope key, before the compiler sees it', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        executionMode: 'object',
        mutationPolicy: 'read-only',
      }),
    ])
    // The SDK's own parse is bypassed here on purpose: we simulate a model (or a
    // future SDK) handing us a widened object, and require *our* re-parse to
    // refuse it. The compiler must never be the first line of defence.
    generateObjectMock.mockImplementation(async () => ({
      object: { ...GOOD_IR, tenantId: 'tenant-other' },
      finishReason: 'stop',
    }))

    const result = await authorBusinessQueryIr(
      callInput({ prompt: 'invoices, but my own way' }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('schema_rejected')
  })

  it('refuses an IR with a guessed field', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        executionMode: 'object',
        mutationPolicy: 'read-only',
      }),
    ])
    generateObjectMock.mockImplementation(async () => ({
      object: { ...GOOD_IR, sort: [{ field: 'unread_count', direction: 'desc', nullsFirst: true }] },
      finishReason: 'stop',
    }))

    const result = await authorBusinessQueryIr(callInput({ prompt: 'newest first' }))

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('schema_rejected')
  })

  it('reports an agent error rather than throwing when the runtime refuses the agent', async () => {
    // Force a REAL refusal for a STATED reason, rather than relying on the agent
    // being absent from the registry.
    //
    // This test used to seed nothing and let `checkAgentPolicy` answer
    // `agent_unknown`. That worked only while `business_ir.query_author` was
    // undeclared — and it no longer is: the agent is now shipped in
    // `ai-agents.ts`, so the registry (which this suite does not mock, by design)
    // genuinely contains it and `loadAgentRegistry()` finds it. The assertion was
    // measuring the world's state, not the wire's behaviour, so it passed for a
    // reason that had just stopped being true.
    //
    // What the test is actually *about* is: "when the runtime refuses, the caller
    // gets a value, not a crash." So declare the id as a chat-mode agent with no
    // output schema, and ask for object mode —
    // `checkAgentPolicy` answers `execution_mode_not_supported`, a deliberate
    // refusal that holds whoever else declares the id later.
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        executionMode: 'chat',
        mutationPolicy: 'read-only',
        // No `output` — object mode cannot be served by this declaration.
      }),
    ])

    const result = await authorBusinessQueryIr(callInput({ prompt: 'anything' }))

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('agent_error')
    // The refusal must happen BEFORE the model is asked anything: a wire that
    // calls the model and then discards the answer would pass the assertion above.
    expect(generateObjectMock).not.toHaveBeenCalled()
  })
})
