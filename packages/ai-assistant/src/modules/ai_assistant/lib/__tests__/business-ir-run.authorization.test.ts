/**
 * `CC-59` / T-02 — the proof that the Business-IR read is **permission-gated**.
 *
 * ★ THE HOLE. `business_ir.run_query` required `ai_assistant.view` — a view
 * feature with no capability descriptor — and passed the caller's features
 * down a chain that read them nowhere. Scope came from the session (tenant),
 * the entity from the IR and its physical binding, and the permission from
 * nothing at all: `engine.query` ran unguarded, so any caller holding the
 * tool's own feature could read any entity their tenant held. The only guard
 * on which rows came back was the prompt itself.
 *
 * The failing scenario is the hole itself, not a hypothetical: a caller whose
 * only grant is `ai_assistant.view` — exactly the tool's `requiredFeatures` —
 * is refused with `not_authorized`, and the engine is never reached. Every
 * refusal case here asserts the same thing, because that is the decisive
 * assertion of a read guard: **the read never happened**. A guard that
 * refused after the rows came back would pass a status-only check and still
 * leak.
 *
 * The gate's semantics are the search module's own — `authorizeEntityAccess`
 * in `packages/search/src/modules/search/ai-tools.ts:86` — copied, not
 * imported, because the two packages must not depend on each other. Fail-closed
 * throughout, with the donor's superadmin bypass preserved on purpose; this
 * suite pins that too, so a later reader sees the bypass was carried over
 * deliberately rather than missed.
 *
 * MUTATION MAP — remove this guard and this test goes red:
 *
 * | Remove this guard | This test goes red |
 * | --- | --- |
 * | the `authorizeEntityRead` call itself | THE HOLE (the failing scenario) |
 * | the container check | "refuses when no container can be resolved" |
 * | the no-search-config refusal | "refuses when the entity has no search config" |
 * | the superadmin bypass | "a superadmin bypasses, as the donor's check does" |
 * | the no-`aclFeatures` refusal | "refuses when the entity declares no aclFeatures" |
 * | the `hasAllFeatures` check | THE HOLE (the failing scenario) |
 * | `hasAllFeatures` → exact-string compare | "a module-wildcard grant satisfies" |
 */

import type { AiAgentDefinition } from '../ai-agent-definition'
import type { BusinessQueryIR } from '@open-mercato/shared/lib/business-ir/types'

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
    convertToModelMessages: (...args: unknown[]) =>
      convertToModelMessagesMock(...(args as Parameters<typeof convertToModelMessagesMock>)),
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

// The binding lookup is the one DB read on this path. Mocked to return no row,
// exactly as the run suite does: a human never reaches this repository
// (`resolveAgentBinding` short-circuits), so every test here drives a human
// principal and the stub is honest.
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
import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../agent-registry'
import { toolRegistry } from '../tool-registry'
import { BUSINESS_IR_AGENT_ID } from '../business-ir-author'
import {
  runBusinessQueryPrompt,
  type RunBusinessQueryPromptInput,
} from '../business-ir-run'

/** The same real module the run suite compiles against (miniature). */
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

/** The platform entity id: `<module>:<entity>` — the id space the gate reads. */
const ENTITY_ID = 'communication_channels:external_conversation'
/** The one feature the entity's search config declares. */
const ACL_FEATURE = 'communication_channels.external_conversation.view'

/**
 * The resolved run context of a caller whose only grant is the tool's own
 * `requiredFeatures` — `ai_assistant.view` — and no entity permission. This is
 * the hole, stated exactly: the tool's feature opens the tool, not the entity.
 */
const viewOnlyContext = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userId: 'user-1',
  features: ['ai_assistant.view'],
  isSuperAdmin: false,
}

/** The same caller, holding the entity's own view feature. */
const holderContext = { ...viewOnlyContext, features: [ACL_FEATURE] }

/** A human server context: `resolveAgentBinding` is a passthrough for a human. */
const humanAuth = { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' }

/** A spy engine: records the `(entity, opts)` it was asked to read. */
function makeEngine() {
  const query = jest.fn(async (_entity: string, _opts?: unknown) => ({
    items: [{ id: 'row-1' }, { id: 'row-2' }],
    total: 2,
    page: 1,
    pageSize: 2,
  }))
  return { query }
}

/**
 * The search indexer the gate consults — a `jest.fn` so the wiring proof can
 * assert the gate reads the **platform entity id**, the same id space
 * `getEntityConfig` and `engine.query` share, and not the canonical
 * `external_conversation` the IR carries.
 */
const getEntityConfig = jest.fn((id: string) =>
  id === ENTITY_ID ? { aclFeatures: [ACL_FEATURE] } : undefined,
)
const SEARCH_INDEXER = { getEntityConfig }

type ContainerDouble = { resolve: (token: string) => unknown }

/** The production shape: the tool resolves `searchIndexer` from its container. */
function makeContainer(): ContainerDouble {
  return { resolve: (token) => (token === 'searchIndexer' ? SEARCH_INDEXER : undefined) }
}

/** An indexer that returns no config for the entity — the fail-closed case. */
function makeNoConfigContainer(): ContainerDouble {
  return { resolve: () => ({ getEntityConfig: () => undefined }) }
}

/** An indexer whose config declares no `aclFeatures` at all. */
function makeNoAclContainer(): ContainerDouble {
  return { resolve: () => ({ getEntityConfig: () => ({ aclFeatures: [] }) }) }
}

function callInput(overrides: {
  prompt: string
  engine?: ReturnType<typeof makeEngine>
  authContext?: typeof viewOnlyContext
  /** `null` means "no container at all" — the failure the gate refuses on. */
  container?: ContainerDouble | null
}): RunBusinessQueryPromptInput {
  const { model, bindings } = getModel()
  return {
    prompt: overrides.prompt,
    authContext: overrides.authContext ?? viewOnlyContext,
    auth: humanAuth as RunBusinessQueryPromptInput['auth'],
    em: {} as unknown as RunBusinessQueryPromptInput['em'],
    model,
    bindings,
    // The default applies only when the key is absent; `null` is carried
    // through as "no container", the production failure the gate refuses on.
    container: overrides.container === null ? undefined : (overrides.container ?? makeContainer()),
    engine: (overrides.engine ?? makeEngine()) as unknown as RunBusinessQueryPromptInput['engine'],
  }
}

/** A model answer that is a valid `BusinessQueryIR` for the model above. */
const GOOD_IR: BusinessQueryIR = {
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

describe("T-02 — the Business-IR read is gated per entity", () => {
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

  it("THE HOLE: a caller holding only the tool's own feature is refused, and the engine is never reached", async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({ prompt: 'unread conversations', engine, authContext: viewOnlyContext }),
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('not_authorized')

    // The decisive assertion: the read never happened. Not a refusal after
    // the rows came back — `engine.query` was never called at all.
    expect(engine.query).not.toHaveBeenCalled()

    // The refusal names the entity and what it needed, so a person can see
    // which read was blocked and why.
    expect(outcome.reason).toContain(ENTITY_ID)
    expect(outcome.reason).toContain(ACL_FEATURE)
    expect(outcome.details).toEqual({ entity: ENTITY_ID })
  })

  it("a caller holding the entity's own view feature reads through", async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({ prompt: 'unread conversations', engine, authContext: holderContext }),
    )

    expect(outcome.ok).toBe(true)
    expect(engine.query).toHaveBeenCalledTimes(1)
    expect(engine.query).toHaveBeenCalledWith(ENTITY_ID, expect.anything())
  })

  it('a module-wildcard grant satisfies the entity’s feature', async () => {
    // The gate reads the platform's own matcher, not an exact-string compare:
    // `communication_channels.*` covers `communication_channels.external_conversation.view`.
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({
        prompt: 'unread conversations',
        engine,
        authContext: { ...viewOnlyContext, features: ['communication_channels.*'] },
      }),
    )

    expect(outcome.ok).toBe(true)
    expect(engine.query).toHaveBeenCalledTimes(1)
  })

  it("a superadmin bypasses, as the donor's check does", async () => {
    // Deliberate: the gate copies `authorizeEntityAccess`, superadmin bypass
    // and all. A caller with no features at all and `isSuperAdmin` reads.
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({
        prompt: 'unread conversations',
        engine,
        authContext: { ...viewOnlyContext, features: [], isSuperAdmin: true },
      }),
    )

    expect(outcome.ok).toBe(true)
    expect(engine.query).toHaveBeenCalledTimes(1)
  })

  it('refuses when the entity has no search config', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({
        prompt: 'unread conversations',
        engine,
        authContext: holderContext,
        container: makeNoConfigContainer(),
      }),
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('not_authorized')
    expect(engine.query).not.toHaveBeenCalled()
    // Pinned to the no-config guard, so the mutation map can name it.
    expect(outcome.reason).toContain('not configured for search')
  })

  it('refuses when the entity declares no aclFeatures', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({
        prompt: 'unread conversations',
        engine,
        authContext: holderContext,
        container: makeNoAclContainer(),
      }),
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('not_authorized')
    expect(engine.query).not.toHaveBeenCalled()
    // Pinned to the no-aclFeatures guard.
    expect(outcome.reason).toContain('aclFeatures')
  })

  it('refuses when no container can be resolved', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    const outcome = await runBusinessQueryPrompt(
      callInput({ prompt: 'unread conversations', engine, authContext: holderContext, container: null }),
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) throw new Error('unreachable')
    expect(outcome.code).toBe('not_authorized')
    expect(engine.query).not.toHaveBeenCalled()
    // Pinned to the container guard: a missing container is a wiring failure,
    // not a data one, and the refusal says so.
    expect(outcome.reason).toContain('No container')
  })

  it('the gate reads the platform entity id, not the canonical name (wiring proof)', async () => {
    seedAuthorAgent()
    const engine = makeEngine()

    await runBusinessQueryPrompt(
      callInput({ prompt: 'unread conversations', engine, authContext: holderContext }),
    )

    // `<module>:<entity>` is the id space `getEntityConfig` and `engine.query`
    // share — the id the physical binding resolves to.
    expect(getEntityConfig).toHaveBeenCalledWith(ENTITY_ID)
  })
})
