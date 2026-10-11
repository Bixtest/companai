/**
 * `CC-57` — the in-process dispatch helper consults the agent binding.
 *
 * The defect this suite exists to close: `authorBusinessQueryIr`
 * (`lib/business-ir-author.ts`) turned a plain-language request into a Business
 * IR by calling `runAiAgentObject('business_ir.query_author', …)` — but, unlike
 * the two *routed* dispatch paths (`CC-27`/`CC-55`), it did **not** consult the
 * `(principal, agent)` binding and did **not** thread the binding's narrowed
 * scope. So a principal that is not bound to `business_ir.query_author` could run
 * it, and a binding that named a tool subset or added a required feature had **no
 * effect** on this path.
 *
 * What this suite asserts (the "threading proof", mirroring the established
 * precedent `api/ai/run-object/__tests__/binding-enforcement.test.ts`):
 *   1. an **unbound `ai_worker`** is refused with the `agent_not_bound` value, and
 *      the runtime is **never** called (the refusal precedes the model);
 *   2. a **bound `ai_worker`** runs, and the runtime receives the **narrowed**
 *      `boundScope` (`computeBoundRunScope` of the binding);
 *   3. a **human** runs with the agent's **full** scope (nothing narrowed, `B4`)
 *      and **no** binding row is read.
 *
 * The runtime and the binding **repository** are mocked (they are the I/O edges);
 * the **resolver** (`resolveAgentBinding`) and `computeBoundRunScope` run for
 * **real**, so the test proves the actual narrowing logic the helper wires in —
 * not a stand-in for it.
 */

import type { AiAgentDefinition } from '../ai-agent-definition'

const runAiAgentObjectMock = jest.fn()
const findBindingMock = jest.fn()

jest.mock('../agent-runtime', () => ({
  runAiAgentObject: (...args: unknown[]) => runAiAgentObjectMock(...args),
}))

jest.mock('../../data/repositories/AiAgentBindingRepository', () => ({
  AiAgentBindingRepository: class {
    findBinding(...args: unknown[]) {
      return findBindingMock(...args)
    }
  },
}))

import {
  resetAgentRegistryForTests,
  seedAgentRegistryForTests,
} from '../agent-registry'
import { toolRegistry } from '../tool-registry'
import { BUSINESS_IR_AGENT_ID, authorBusinessQueryIr } from '../business-ir-author'
import type { AuthContext } from '@open-mercato/shared/lib/auth/server'

function makeAgent(
  overrides: Partial<AiAgentDefinition> & Pick<AiAgentDefinition, 'id' | 'moduleId'>,
): AiAgentDefinition {
  return {
    label: `${overrides.id} label`,
    description: `${overrides.id} description`,
    systemPrompt: 'You turn a business request into a BusinessQueryIR.',
    allowedTools: [],
    // Object-mode surface, so the run is dispatched (the helper pins `mode:
    // 'generate'`); the runtime is mocked, so this only needs to exist.
    output: { type: 'object', properties: { ok: { type: 'boolean' } } } as never,
    ...overrides,
  }
}

/** The resolved run scope the helper passes to the runtime carries this shape. */
type RuntimeArg = {
  agentId: string
  boundScope?: { allowedTools: string[]; requiredFeatures: string[] }
}

const baseAuthContext = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userId: 'user-1',
  features: ['*'],
  isSuperAdmin: true,
}
const emStub = {} as never

describe('CC-57 — authorBusinessQueryIr consults the binding before it dispatches', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAgentRegistryForTests()
    toolRegistry.clear()
    // A minimal valid agent answer in generate mode; the runtime is mocked, so
    // this only needs to satisfy the helper's own post-checks.
    runAiAgentObjectMock.mockResolvedValue({
      mode: 'generate',
      object: {
        operation: 'list',
        entity: 'external_conversation',
        dimensions: [],
        filters: [],
        limit: 10,
      },
    })
  })

  afterAll(() => {
    resetAgentRegistryForTests()
    toolRegistry.clear()
  })

  it('REFUSES an unbound ai_worker (agent_not_bound) and never asks the model', async () => {
    seedAgentRegistryForTests([
      makeAgent({ id: BUSINESS_IR_AGENT_ID, moduleId: 'ai_assistant' }),
    ])
    findBindingMock.mockResolvedValue(null) // no live binding row

    const auth: AuthContext = {
      sub: 'ai_worker:key-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    }
    const result = await authorBusinessQueryIr({
      prompt: 'invoices over 10k',
      authContext: baseAuthContext,
      auth,
      em: emStub,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('agent_not_bound')
    // The refusal must precede the model: a wire that calls the runtime and then
    // discards the answer would still pass the assertion above.
    expect(runAiAgentObjectMock).not.toHaveBeenCalled()
    // It DID consult the binding (with the acting principal's id).
    expect(findBindingMock).toHaveBeenCalledTimes(1)
    expect(findBindingMock.mock.calls[0][0]).toBe('key-1')
    expect(findBindingMock.mock.calls[0][1]).toBe(BUSINESS_IR_AGENT_ID)
  })

  it('REFUSES an ai_worker with no tenant (fail-closed, no DB read)', async () => {
    seedAgentRegistryForTests([
      makeAgent({ id: BUSINESS_IR_AGENT_ID, moduleId: 'ai_assistant' }),
    ])

    const auth: AuthContext = { sub: 'ai_worker:key-1', tenantId: null, orgId: null }
    const result = await authorBusinessQueryIr({
      prompt: 'invoices over 10k',
      authContext: baseAuthContext,
      auth,
      em: emStub,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('agent_not_bound')
    expect(runAiAgentObjectMock).not.toHaveBeenCalled()
    // No tenant ⇒ nothing to resolve against ⇒ the resolver must not read the DB.
    expect(findBindingMock).not.toHaveBeenCalled()
  })

  it('PASSES the binding-narrowed boundScope to the runtime (tools INTERSECT)', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        allowedTools: ['business_ir.query_builder', 'business_ir.field_lookup'],
      }),
    ])
    // The binding narrows the tool set to ONE of the agent's two tools.
    findBindingMock.mockResolvedValue({
      toolAllowlist: ['business_ir.query_builder'],
      requiredFeatures: [],
    })

    const auth: AuthContext = {
      sub: 'ai_worker:key-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    }
    const result = await authorBusinessQueryIr({
      prompt: 'invoices over 10k',
      authContext: baseAuthContext,
      auth,
      em: emStub,
    })

    expect(result.ok).toBe(true)
    expect(runAiAgentObjectMock).toHaveBeenCalledTimes(1)
    const arg = runAiAgentObjectMock.mock.calls[0][0] as RuntimeArg
    expect(arg.agentId).toBe(BUSINESS_IR_AGENT_ID)
    expect(arg.boundScope).toBeDefined()
    // The narrowed set: the agent's list INTERSECT the binding's allowlist.
    expect(arg.boundScope!.allowedTools).toEqual(['business_ir.query_builder'])
    expect(arg.boundScope!.requiredFeatures).toEqual([])
  })

  it('UNIONS the binding’s required features with the agent’s (never removes one)', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        allowedTools: [],
        requiredFeatures: ['ai_assistant.view'],
      }),
    ])
    findBindingMock.mockResolvedValue({
      toolAllowlist: null,
      requiredFeatures: ['ai_assistant.settings.manage'],
    })

    const auth: AuthContext = {
      sub: 'ai_worker:key-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    }
    await authorBusinessQueryIr({
      prompt: 'invoices over 10k',
      authContext: baseAuthContext,
      auth,
      em: emStub,
    })

    const arg = runAiAgentObjectMock.mock.calls[0][0] as RuntimeArg
    expect(arg.boundScope).toBeDefined()
    expect(arg.boundScope!.requiredFeatures.sort()).toEqual(
      ['ai_assistant.settings.manage', 'ai_assistant.view'].sort(),
    )
  })

  it('does NOT consult the binding for a human, and passes the FULL scope (B4)', async () => {
    seedAgentRegistryForTests([
      makeAgent({
        id: BUSINESS_IR_AGENT_ID,
        moduleId: 'ai_assistant',
        allowedTools: ['business_ir.query_builder', 'business_ir.field_lookup'],
      }),
    ])

    // A bare `sub` (no `ai_worker:`/`api_key:` prefix) derives to a human
    // principal under the REAL `derivePrincipal` this suite does not mock.
    const auth: AuthContext = { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' }
    const result = await authorBusinessQueryIr({
      prompt: 'invoices over 10k',
      authContext: baseAuthContext,
      auth,
      em: emStub,
    })

    expect(result.ok).toBe(true)
    // A human is a passthrough ⇒ no binding row is read.
    expect(findBindingMock).not.toHaveBeenCalled()
    const arg = runAiAgentObjectMock.mock.calls[0][0] as RuntimeArg
    // The full declared scope — nothing narrowed.
    expect(arg.boundScope).toEqual({
      allowedTools: ['business_ir.query_builder', 'business_ir.field_lookup'],
      requiredFeatures: [],
    })
  })
})
