/**
 * `CC-67` proof — the platform's own runtime sits behind the door, and the two
 * remaining callers reach it THROUGH the door.
 *
 * Row 28's sentence is *"the agent runtime sits behind one typed door — no other
 * code talks to it directly."* `opencode-port-adapter.test.ts` proves the FIRST
 * engine (OpenCode) behind the door. This file proves the SECOND one: the
 * platform's own in-process AI SDK runtime, wrapped by
 * `agent-runtime-port-adapter.ts`.
 *
 * Two kinds of claim are checked here, and they are deliberately different:
 *
 *  1. **Structure** — the three callers no longer import `agent-runtime` by
 *     name; they name only the door/adapter. Proven by a STATIC scan of the
 *     committed sources (a regex over the file text), because the claim is about
 *     the source, not about a run.
 *  2. **Behaviour** — the adapter's operations obey the port's contract:
 *     `startRun` is idempotent, `cancelRun` is bounded/idempotent and never
 *     throws, `completeRun` is replay-safe, and the TEXT path hands back the
 *     engine's ORIGINAL `Response` without draining it (the single-use-body
 *     trap).
 *
 * The mock boundary is the ENGINE (`agent-runtime`), BELOW the adapter — so a
 * test fails if the adapter stops calling the engine, or if it starts to mutate
 * the response the client will receive.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

const mockRunAiAgentText = jest.fn()
const mockRunAiAgentObject = jest.fn()

jest.mock('../agent-runtime', () => {
  const actual = jest.requireActual('../agent-runtime')
  return {
    __esModule: true,
    ...actual,
    runAiAgentText: (...args: unknown[]) => mockRunAiAgentText(...args),
    runAiAgentObject: (...args: unknown[]) => mockRunAiAgentObject(...args),
  }
})

import {
  AgentRuntimePortAdapter,
  PLATFORM_RUNTIME_IMPLEMENTATION,
  createAgentRuntimePortAdapter,
  attachRunInput,
} from '../agent-runtime-port-adapter'
import type { AiRuntimeEnvelope } from '../ai-runtime-port'
import { DEFAULT_MAX_RETAINED_RUNS } from '../ai-runtime-bounds'

const AUTH_CONTEXT = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userId: 'user-alice',
  features: ['ai_assistant.view'],
  isSuperAdmin: false,
  onBehalfOfUserId: null,
}

function makePort(overrides: Record<string, unknown> = {}): AgentRuntimePortAdapter {
  return createAgentRuntimePortAdapter({
    authContext: AUTH_CONTEXT,
    container: {} as never,
    ...overrides,
  })
}

function makeEnvelope(runId: string): AiRuntimeEnvelope {
  return {
    schemaVersion: 1,
    runId,
    tenantId: 'tenant-1',
    principalId: 'user-alice',
    actorId: 'user-alice',
    agentId: 'ai_assistant.chat',
    conversationId: 'conv-1',
    capabilityGrantId: `grant:${runId}`,
  }
}

/** A response whose body streams the given chunks, recording whether it was read. */
function streamingResponse(chunks: string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder()
  let reads = 0
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  const originalRead = body.getReader.bind(body)
  const response = new Response(body, { headers: { 'content-type': 'text/event-stream', ...headers } })
  // Spy on getReader so a test can assert the adapter did NOT drain the body.
  ;(response.body as unknown as { getReader: () => unknown }).getReader = () => {
    reads++
    return originalRead()
  }
  return { response, readCount: () => reads }
}

beforeEach(() => {
  mockRunAiAgentText.mockReset()
  mockRunAiAgentObject.mockReset()
})

describe('CC-67 — the platform runtime behind the door (structure)', () => {
  it('reports itself as the platform implementation with the honest operations set', async () => {
    const caps = await makePort().describeCapabilities('v1')
    expect(caps.implementation).toBe(PLATFORM_RUNTIME_IMPLEMENTATION)
    expect(caps.implementation).toBe('platform')
    expect(caps.toolDelivery).toBe('in-process')
    expect(caps.operations.startRun).toBe(true)
    expect(caps.operations.completeRun).toBe(true)
    // steerRun and resolveToolCall are honestly unsupported (same as OpenCode):
    // a caller must not believe a tool call is platform-gated when it is not.
    expect(caps.operations.steerRun).toBe(false)
    expect(caps.operations.resolveToolCall).toBe(false)
  })

  it('steerRun and resolveToolCall THROW a named error rather than silently succeeding', async () => {
    const port = makePort()
    await expect(port.steerRun('run-1', {})).rejects.toThrow(/not supported/)
    await expect(port.resolveToolCall({ id: 'c1', toolName: 't', args: {} }, 'g')).rejects.toThrow(
      /not supported/,
    )
  })

  it('the three former direct callers import only the door/adapter — never agent-runtime by name', () => {
    // `__dirname` is `.../lib/__tests__`; the module root is two levels up.
    const moduleRoot = path.resolve(__dirname, '..', '..')
    const callers = [
      path.resolve(moduleRoot, 'api/ai/chat/route.ts'),
      path.resolve(moduleRoot, 'api/ai/run-object/route.ts'),
      path.resolve(moduleRoot, 'lib/business-ir-author.ts'),
    ]
    for (const file of callers) {
      const text = fs.readFileSync(file, 'utf8')
      // No `import ... from '...agent-runtime'` at all — the pure preset resolver
      // is re-exported through the adapter so the route names no engine module.
      const engineImport = /from\s+['"][^'"]*\bagent-runtime['"]/.exec(text)
      expect(engineImport).toBeNull()
      // And it does reach the door.
      expect(text).toMatch(/agent-runtime-port-adapter|ai-runtime-port/)
    }
  })
})

describe('CC-67 — the platform runtime behind the door (behaviour, port contract)', () => {
  it('startRun is idempotent: a second start for the same id does not restart the run', async () => {
    const port = makePort()
    const a = await port.startRun(makeEnvelope('run-1'))
    const b = await port.startRun({ ...makeEnvelope('run-1'), runtimeSessionId: 'ignored' })
    expect(a.runId).toBe('run-1')
    expect(b.runId).toBe('run-1')
    // The first registration wins; the run is not re-created.
    expect(b.runtimeSessionId).toBeUndefined()
  })

  it('streamRun performs the engine call and hands back the ORIGINAL response WITHOUT draining it', async () => {
    const { response, readCount } = streamingResponse(['data: {"type":"text-delta","delta":"hi"}\n\n'])
    mockRunAiAgentText.mockResolvedValue(response)

    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    attachRunInput(port, 'run-1', { messages: [{ role: 'user', content: 'hi' }] })

    const events: string[] = []
    await port.streamRun('run-1', async (e) => {
      events.push(e.type)
    })

    // The door reported open then done...
    expect(events).toEqual(['status', 'done'])
    // ...and the client's response is the SAME object, unread (single-use body).
    expect(port.responseForRun('run-1')).toBe(response)
    expect(readCount()).toBe(0)
  })

  it('streamRun refuses a run with no input attached, as a value (an error event), not a throw', async () => {
    const port = makePort()
    await port.startRun(makeEnvelope('run-noinput'))
    const events: string[] = []
    await port.streamRun('run-noinput', async (e) => {
      events.push(e.type)
    })
    expect(events).toEqual(['error'])
    expect(mockRunAiAgentText).not.toHaveBeenCalled()
  })

  it('streamRun on an unknown run reports an error event rather than throwing', async () => {
    const port = makePort()
    const events: Array<{ type: string }> = []
    await port.streamRun('never-started', async (e) => {
      events.push(e as { type: string })
    })
    expect(events).toEqual([{ type: 'error', error: 'unknown run never-started' }])
  })

  it('cancelRun is bounded and idempotent: a second cancel is a VALUE', async () => {
    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    const first = await port.cancelRun('run-1')
    const second = await port.cancelRun('run-1')
    expect(first).toEqual({ runId: 'run-1', cancelled: true })
    expect(second.cancelled).toBe(false)
    expect(second.reason).toBe('already-cancelled')
    // A cancel for a run the door never saw is `not-found`, never an error.
    await expect(port.cancelRun('ghost')).resolves.toEqual({
      runId: 'ghost',
      cancelled: false,
      reason: 'not-found',
    })
  })

  it('cancelRun checks completed BEFORE cancelled, so call order does not change the answer', async () => {
    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    await port.completeRun('run-1', { status: 'completed' })
    const result = await port.cancelRun('run-1')
    expect(result.reason).toBe('already-complete')
  })

  it('completeRun is replay-safe: the second completion reports alreadyComplete', async () => {
    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    const first = await port.completeRun('run-1', { status: 'completed' })
    const second = await port.completeRun('run-1', { status: 'failed' })
    expect(first).toEqual({ runId: 'run-1', completed: true, alreadyComplete: false })
    expect(second).toEqual({ runId: 'run-1', completed: false, alreadyComplete: true })
  })

  it('a cancelled run does not call the engine when streamRun runs afterwards', async () => {
    mockRunAiAgentText.mockResolvedValue(new Response('data: x\n\n'))
    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    attachRunInput(port, 'run-1', { messages: [] })
    await port.cancelRun('run-1')
    await port.streamRun('run-1', async () => undefined)
    expect(mockRunAiAgentText).not.toHaveBeenCalled()
  })

  it('runObjectForRun puts the object call behind the door and returns the engine value', async () => {
    mockRunAiAgentObject.mockResolvedValue({ mode: 'generate', object: { ok: true } })
    const port = makePort({ modelOverride: 'model-x' })
    const result = await port.runObjectForRun({
      agentId: 'business_ir.query_author',
      prompt: 'invoices over 10k',
      output: { schemaName: 's', schema: {}, mode: 'generate' },
    })
    expect(result).toEqual({ mode: 'generate', object: { ok: true } })
    // The engine was called with the deps carried on the adapter's construction.
    const arg = mockRunAiAgentObject.mock.calls[0][0]
    expect(arg.authContext).toBe(AUTH_CONTEXT)
    expect(arg.modelOverride).toBe('model-x')
  })

  it('resumeConversation mints a run id DISTINCT from the conversation (§4.2)', async () => {
    const port = makePort()
    const started = await port.resumeConversation(
      {
        tenantId: 'tenant-1',
        principalId: 'user-alice',
        actorId: 'user-alice',
        agentId: 'ai_assistant.chat',
        conversationId: 'conv-1',
        capabilityGrantId: 'g1',
      },
      { text: 'continue', sessionId: 'ses-9' },
    )
    expect(started.runId).not.toBe('conv-1')
    expect(started.runId).not.toBe('ses-9')
    expect(started.runId).toBe('tenant-1:ai_assistant.chat:run-1')
  })

  it('the run-close contract: a run closed as failed is NOT misreported as cancellable', async () => {
    // The `CC-67` hostile critic found the chat route once left its run OPEN.
    // The door's guarantee is the inverse: once a run is CLOSED (`completeRun`),
    // a later cancel must NOT report it as cancellable — otherwise a finished run
    // looks like a live one. This pins the close semantics the route relies on.
    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    await port.completeRun('run-1', { status: 'failed' })
    const cancelled = await port.cancelRun('run-1')
    expect(cancelled.cancelled).toBe(false)
    expect(cancelled.reason).toBe('already-complete')
  })

  it('an UNCLOSED run IS cancellable — the state the route must not leave behind', async () => {
    // The dual of the test above: while a run is open (never completed), a cancel
    // succeeds. This is exactly why the route MUST close its run — an open run
    // stays cancellable forever, and a later cancel would report a finished run
    // as stopped. The route closes in its stream wrapper's finally.
    const port = makePort()
    await port.startRun(makeEnvelope('run-1'))
    const cancelled = await port.cancelRun('run-1')
    expect(cancelled.cancelled).toBe(true)
  })
})

describe('P2-6 §2.12 — the platform registry is BOUNDED (the same shared cap)', () => {
  // §2.12 states the memory bound for "the run registry", not for two named
  // adapters, so the THIRD port implementation must honour it too — otherwise
  // "a long-lived adapter cannot grow without bound" is false for one of the
  // three. The cap lives in the shared `ai-runtime-bounds` module; this test
  // proves the platform adapter actually CALLS it.
  it('past the cap, finished runs are evicted oldest-first and a LIVE run is kept', async () => {
    const port = makePort()
    // One run that never completes: it must survive every prune.
    await port.startRun(makeEnvelope('live'))

    const total = DEFAULT_MAX_RETAINED_RUNS + 25
    for (let i = 0; i < total; i++) {
      const id = `run-${i}`
      await port.startRun(makeEnvelope(id))
      await port.completeRun(id, { status: 'completed' })
    }

    expect(port.retainedRunCount()).toBeLessThanOrEqual(DEFAULT_MAX_RETAINED_RUNS + 1)
    expect(port.getRun('run-0')).toBeUndefined()
    expect(port.getRun('live')).toBeDefined()
  })
})
