/**
 * `CC-59` — the **caller coverage gate** (`B5g`).
 *
 * The defect this suite exists to prevent is the one `CC-59` was created to fix,
 * wearing the opposite mask: the Business-IR chain was fully built and **nothing
 * reached it**. `runBusinessQueryPrompt` is the wire; this suite proves the tool
 * that switches it on is (a) actually registered, (b) actually **calls** the
 * entry point rather than re-implementing any of it, and (c) passes the caller's
 * **scope and principal** through so the binding check and the tenant/org scoping
 * are not bypassed at the tool boundary.
 *
 * The entry point's own refusals (`agent_not_bound`, `schema_rejected`,
 * `compile_failed`, `no_binding`, `engine_failed`) are proven in
 * `lib/__tests__/business-ir-run.test.ts`; this suite proves the tool **surfaces
 * them as values** instead of swallowing or throwing them.
 *
 * The chain is mocked here on purpose: what is under test is the **wiring and its
 * boundary guards**, not the chain (which the sibling suites cover against real
 * code). A structural check keeps the pack from drifting into a second chain.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

jest.mock('../../lib/business-ir-run', () => ({
  runBusinessQueryPrompt: jest.fn(async () => ({ ok: true, rows: [], total: 0 })),
}))

jest.mock('@open-mercato/shared/lib/kernel/from-modules', () => ({
  collectDeclarations: jest.fn(() => ({ customEntities: [], customFieldSets: [], extensions: [] })),
  tryBuildModelFromModules: jest.fn(() => ({ __model: true })),
}))

jest.mock('@open-mercato/shared/lib/business-ir/bindings', () => ({
  createBindingsFromDeclarations: jest.fn(() => ({ entities: {} })),
}))

import businessIrAiTools from '../business-ir-pack'
import { aiTools } from '../../ai-tools'
import { runBusinessQueryPrompt } from '../../lib/business-ir-run'
import { tryBuildModelFromModules } from '@open-mercato/shared/lib/kernel/from-modules'

const runMock = runBusinessQueryPrompt as unknown as jest.Mock
const modelMock = tryBuildModelFromModules as unknown as jest.Mock

function findTool(name: string) {
  const tool = businessIrAiTools.find((entry) => entry.name === name)
  if (!tool) throw new Error(`tool ${name} missing`)
  return tool
}

const EM = { __em: true }
const ENGINE = { query: jest.fn() }

function makeCtx(overrides: Partial<Record<string, unknown>> = {}) {
  const container = {
    resolve: jest.fn((token: string) => (token === 'em' ? EM : ENGINE)),
  }
  return {
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    userId: 'user-1',
    container,
    userFeatures: ['ai_assistant.view'],
    isSuperAdmin: false,
    onBehalfOfUserId: null,
    ...overrides,
  }
}

describe('CC-59 — business_ir.run_query is registered and wired', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    runMock.mockResolvedValue({ ok: true, rows: [{ id: 'r1' }], total: 1 })
    modelMock.mockReturnValue({ __model: true })
  })

  it('the tool is registered in the module aggregator (the generator picks it up)', () => {
    const names = aiTools.map((tool) => tool.name)
    expect(names).toContain('business_ir.run_query')
  })

  it('is a read-only tool carrying the module feature', () => {
    const tool = findTool('business_ir.run_query')
    expect(tool.isMutation).not.toBe(true)
    expect(tool.requiredFeatures).toEqual(['ai_assistant.view'])
  })

  it('the handler reaches runBusinessQueryPrompt with scope and principal from ctx', async () => {
    const tool = findTool('business_ir.run_query')
    const ctx = makeCtx()

    await tool.handler({ prompt: 'unread conversations over 2' }, ctx as never)

    expect(runMock).toHaveBeenCalledTimes(1)
    const arg = runMock.mock.calls[0][0]
    expect(arg.prompt).toBe('unread conversations over 2')

    // Scope comes from the tool context only (B5b) — never the prompt, never the IR.
    expect(arg.authContext).toMatchObject({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      userId: 'user-1',
      features: ['ai_assistant.view'],
      isSuperAdmin: false,
    })

    // The binding is looked up by this `sub` — the tool must pass the acting
    // principal through, or an unbound AI worker would slip past CC-57 (B5d).
    expect(arg.auth.sub).toBe('user-1')

    // The platform's own pieces are resolved from the tool container.
    expect(arg.em).toBe(EM)
    expect(arg.engine).toBe(ENGINE)
    expect(arg.model).toBeTruthy()
    expect(arg.bindings).toBeTruthy()
  })

  it('surfaces a refusal as a value, never a throw (B5c)', async () => {
    const tool = findTool('business_ir.run_query')
    runMock.mockResolvedValueOnce({ ok: false, code: 'agent_not_bound', reason: 'not bound' })

    const outcome = (await tool.handler({ prompt: 'anything' }, makeCtx() as never)) as Record<string, unknown>

    expect(outcome.ok).toBe(false)
    expect(outcome.code).toBe('agent_not_bound')
  })

  it('refuses when there is no tenant context', async () => {
    const tool = findTool('business_ir.run_query')
    await expect(tool.handler({ prompt: 'x' }, makeCtx({ tenantId: null }) as never)).rejects.toThrow(
      /Tenant context is required/,
    )
    expect(runMock).not.toHaveBeenCalled()
  })

  it('refuses when there is no acting principal (fail closed, never a human passthrough)', async () => {
    const tool = findTool('business_ir.run_query')
    await expect(tool.handler({ prompt: 'x' }, makeCtx({ userId: null }) as never)).rejects.toThrow(
      /Principal context is required/,
    )
    expect(runMock).not.toHaveBeenCalled()
  })

  it('refuses a whitespace-only principal (a blank subject identifies nobody)', async () => {
    const tool = findTool('business_ir.run_query')
    await expect(tool.handler({ prompt: 'x' }, makeCtx({ userId: '   ' }) as never)).rejects.toThrow(
      /Principal context is required/,
    )
    expect(runMock).not.toHaveBeenCalled()
  })

  it('refuses when the business model is not available', async () => {
    const tool = findTool('business_ir.run_query')
    modelMock.mockReturnValueOnce(null)
    await expect(tool.handler({ prompt: 'x' }, makeCtx() as never)).rejects.toThrow(
      /business model is not available/,
    )
    expect(runMock).not.toHaveBeenCalled()
  })
})

describe('CC-59 — the pack does not build a second chain', () => {
  it('delegates to runBusinessQueryPrompt and never calls the compiler directly', () => {
    const source = readFileSync(join(__dirname, '..', 'business-ir-pack.ts'), 'utf8')
    // Check CODE, not prose: a doc comment may legitimately NAME the compiler
    // (this pack's does, to explain what it reuses). Strip comments first, so
    // the guard fires on a real import or call, never on a mention.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    // It reaches the single entry point…
    expect(code).toMatch(/runBusinessQueryPrompt/)
    // …and does not compile or execute on its own — no second chain (CC-59's
    // own stated failure mode).
    expect(code).not.toMatch(/\bcompileQuery\b/)
    expect(code).not.toMatch(/\bengine\.query\s*\(/)
  })
})
