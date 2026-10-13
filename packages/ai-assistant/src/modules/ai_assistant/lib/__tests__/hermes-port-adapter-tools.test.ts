/**
 * Tests for the Hermes adapter's tool door — `P2-4`, the port's `resolveToolCall`
 * made real for the first engine (plan §2.10).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * The claim under test is narrow and decisive: **a business operation runs
 * through the door only when BOTH gates pass** — the call's tool is in the
 * run's menu recorded at admission, AND the presented grant is that run's own.
 * The gate's pure logic is proven in `ai-tool-call-gate.test.ts`; what is proven
 * HERE is the door's plumbing around it:
 *
 *   - correlation: a call raised by a live turn is resolved against THAT run's
 *     admission (the port's signature carries no run id, so the call id is the
 *     index — populated from the measured `tool.start {tool_id}` event);
 *   - the admission rail: `attachRunToolMenu` records the effective menu and its
 *     context, and throws rather than silently recording nothing;
 *   - execution reaches the platform's existing tool door (`executeTool`) under
 *     the admission-time context, and the result comes back on the run's own
 *     event channel as the port's `tool-result`;
 *   - the honest map now reports `resolveToolCall ✓`.
 *
 * The executor is injected (the same structural-seam pattern as the client), so
 * no DI container, registry or database is involved: what is under test is the
 * door's gating, not the platform's tools (which have their own suites).
 */

import type { AiRuntimeEnvelope, AiRuntimeStreamEvent, AiRuntimeToolCall } from '../ai-runtime-port'
import {
  HermesPortAdapter,
  attachRunToolMenu,
  textInputRef,
  type HermesAdmittedToolContext,
  type HermesGatewayPortClient,
  type HermesToolExecutor,
} from '../hermes-port-adapter'

/**
 * The default executor's platform entry points, mocked so the DEFAULT seam
 * (no executor injected) can be exercised without a DI bootstrap or a database.
 * Only the adapter's no-executor path touches these — every other test in this
 * file injects its own recorder, so the mocks are inert for them.
 */
const mockExecuteTool = jest.fn(async (..._args: unknown[]) => ({
  success: true,
  result: { ok: true },
}))
const mockCreateRequestContainer = jest.fn(async () => ({ marker: 'fresh-container' }))

jest.mock('../tool-executor', () => ({
  executeTool: (...args: unknown[]) => mockExecuteTool(...args),
}))
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: () => mockCreateRequestContainer(),
}))

type GatewayFrame = { method: string; params: Record<string, unknown> }

/** The P2-3 fake, reused verbatim: the measured wire as scripted frames. */
class FakeHermesClient implements HermesGatewayPortClient {
  connected = true
  calls: Array<{ method: string; params: unknown }> = []
  script: GatewayFrame[] = []
  createResult: Record<string, unknown> = { session_id: 'sess-1', stored_session_id: 'stored-1' }
  steerResult: Record<string, unknown> = { status: 'queued', text: '' }
  interruptResult: Record<string, unknown> = { status: 'interrupted', interrupted: true }
  resumeResult: Record<string, unknown> | null = null
  submitError: Error | null = null

  private readonly listeners = new Map<string, Set<(frame: GatewayFrame) => void>>()
  private readonly exitHandlers: Array<(code: number | null) => void> = []

  get isConnected(): boolean {
    return this.connected
  }

  async connect(): Promise<unknown> {
    return {}
  }

  async request<TResult = unknown, TParams = Record<string, never>>(
    method: string,
    params: TParams,
  ): Promise<TResult> {
    this.calls.push({ method, params })
    if (method === 'session.create') return this.createResult as TResult
    if (method === 'session.resume') {
      return (this.resumeResult ?? {
        session_id: (params as { session_id: string }).session_id,
        running: true,
      }) as TResult
    }
    return {} as TResult
  }

  async submitPrompt(sessionId: string, text: string): Promise<{ status?: string; user_row_id?: number }> {
    this.calls.push({ method: 'prompt.submit', params: { session_id: sessionId, text } })
    if (this.submitError) throw this.submitError
    for (const frame of this.script) {
      queueMicrotask(() => this.emit(frame.method, frame.params))
    }
    return { status: 'streaming' }
  }

  async interruptSession(sessionId: string): Promise<Record<string, unknown>> {
    this.calls.push({ method: 'session.interrupt', params: { session_id: sessionId } })
    return this.interruptResult
  }

  async steerSession(sessionId: string, text: string): Promise<Record<string, unknown>> {
    this.calls.push({ method: 'session.steer', params: { session_id: sessionId, text } })
    return this.steerResult
  }

  on(method: string, listener: (frame: GatewayFrame) => void): () => void {
    const set = this.listeners.get(method) ?? new Set()
    set.add(listener)
    this.listeners.set(method, set)
    return () => set.delete(listener)
  }

  onExit(handler: (code: number | null) => void): () => void {
    this.exitHandlers.push(handler)
    return () => {
      const index = this.exitHandlers.indexOf(handler)
      if (index >= 0) this.exitHandlers.splice(index, 1)
    }
  }

  emit(method: string, params: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(method) ?? []) listener({ method, params })
  }

  emitExit(code: number | null): void {
    for (const handler of [...this.exitHandlers]) handler(code)
  }

  listenerCount(method: string): number {
    return this.listeners.get(method)?.size ?? 0
  }

  exitHandlerCount(): number {
    return this.exitHandlers.length
  }

  callsOf(method: string): Array<{ method: string; params: unknown }> {
    return this.calls.filter((c) => c.method === method)
  }
}

/** A minimal admitted envelope for a run. */
function envelope(overrides: Partial<AiRuntimeEnvelope> = {}): AiRuntimeEnvelope {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    tenantId: 'tenant-1',
    principalId: 'principal-1',
    actorId: 'actor-1',
    agentId: 'agent-1',
    conversationId: 'conv-1',
    capabilityGrantId: 'grant-1',
    allowedInputRefs: [textInputRef('hello hermes')],
    ...overrides,
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/** One recorded execution the fake tool door saw. */
interface RecordedExecution {
  call: AiRuntimeToolCall
  admitted: HermesAdmittedToolContext
}

/**
 * Starts a run and opens a LIVE turn that has raised one tool call — the exact
 * state a caller resolving a tool call sees. Returns the finisher: the stream
 * stays open (its correlation and result channel alive) until the test ends it
 * with `message.complete`, exactly as a real turn would.
 */
async function startLiveRunWithToolCall(
  adapter: HermesPortAdapter,
  client: FakeHermesClient,
  seen: AiRuntimeStreamEvent[],
): Promise<() => Promise<void>> {
  await adapter.startRun(envelope())
  const streaming = adapter.streamRun('run-1', async (event) => {
    seen.push(event)
  })
  await flush()
  // The measured turn shape: a tool call arrives on a live turn.
  client.emit('tool.start', {
    tool_id: 'call-1',
    name: 'business_ir.run_query',
    args: { prompt: 'how many customers' },
  })
  await flush()
  return async () => {
    client.emit('message.complete', { text: 'done', status: 'complete' })
    await streaming
  }
}

describe('HermesPortAdapter — the tool door (P2-4 — two gates, deny by default)', () => {
  let client: FakeHermesClient
  let executions: RecordedExecution[]
  let executeToolCall: HermesToolExecutor
  let adapter: HermesPortAdapter

  beforeEach(() => {
    client = new FakeHermesClient()
    executions = []
    executeToolCall = async (call, admitted) => {
      executions.push({ call, admitted })
      return { success: true, result: { rows: [1, 2] } }
    }
    adapter = new HermesPortAdapter({ client, executeToolCall })
  })

  const call = (overrides: Partial<AiRuntimeToolCall> = {}): AiRuntimeToolCall => ({
    id: 'call-1',
    toolName: 'business_ir.run_query',
    args: { prompt: 'how many customers' },
    ...overrides,
  })

  const admission = (tools: string[] = ['business_ir.run_query']) => ({
    tools,
    context: {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userFeatures: ['ai_assistant.view'],
      isSuperAdmin: false,
      onBehalfOfUserId: 'human-1',
    },
  })

  describe('the admission rail', () => {
    it('records the effective menu and its context on the run', async () => {
      await adapter.startRun(envelope())
      attachRunToolMenu(adapter, 'run-1', admission())

      expect(adapter.getRun('run-1')?.toolMenu).toEqual(['business_ir.run_query'])
      expect(adapter.getRun('run-1')?.admittedToolContext?.userId).toBe('user-1')
    })

    it('throws for an unknown run — a silently ignored admission would refuse every call invisibly', () => {
      expect(() => attachRunToolMenu(adapter, 'no-such-run', admission())).toThrow(/no run "no-such-run"/)
    })

    it('records a COPY of the menu, so a later caller-side mutation cannot widen a recorded admission', async () => {
      await adapter.startRun(envelope())
      const tools = ['business_ir.run_query']
      attachRunToolMenu(adapter, 'run-1', { tools, context: admission().context })
      tools.push('search.hybrid_search')

      expect(adapter.getRun('run-1')?.toolMenu).toEqual(['business_ir.run_query'])
    })

    it('records a SNAPSHOT of the context — a later caller-side mutation cannot widen execution authority (F4)', async () => {
      // The menu copy above is not enough: the CONTEXT carries the authority
      // (features, super-admin, on-behalf-of). A caller that keeps its own
      // reference and mutates it after recording must not be able to escalate
      // the run it just admitted (§8 — narrow, never widen).
      await adapter.startRun(envelope())
      const context = admission().context
      attachRunToolMenu(adapter, 'run-1', { tools: ['business_ir.run_query'], context })

      ;(context as { isSuperAdmin: boolean }).isSuperAdmin = true
      context.userFeatures.push('secret.export')
      ;(context as { userId: string }).userId = 'attacker'

      const recorded = adapter.getRun('run-1')?.admittedToolContext
      expect(recorded?.isSuperAdmin).toBe(false)
      expect(recorded?.userFeatures).toEqual(['ai_assistant.view'])
      expect(recorded?.userId).toBe('user-1')
    })
  })

  describe('the honest capability map', () => {
    it('reports resolveToolCall true — the first engine whose eight are all real', async () => {
      const caps = await adapter.describeCapabilities()
      expect(caps.operations.resolveToolCall).toBe(true)
    })
  })

  describe('gate 1 — the grant must be THIS run\'s own', () => {
    it('refuses a call with no grant', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())

      await expect(
        adapter.resolveToolCall(call(), undefined as unknown as string),
      ).rejects.toThrow(/no capability grant/)
      expect(executions).toHaveLength(0)
      await finish()
    })

    it('refuses a call carrying a different run\'s grant', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())

      await expect(adapter.resolveToolCall(call(), 'chat-turn:someone-else:run-9')).rejects.toThrow(
        /different run/,
      )
      expect(executions).toHaveLength(0)
      await finish()
    })
  })

  describe('gate 2 — the tool must be in the run\'s recorded menu', () => {
    it('refuses a tool outside the menu EVEN WITH the run\'s own valid grant', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission(['business_ir.run_query']))

      await expect(adapter.resolveToolCall(call({ toolName: 'search.hybrid_search' }), 'grant-1')).rejects.toThrow(
        /not in the run's admitted tool menu/,
      )
      expect(executions).toHaveLength(0)
      await finish()
    })

    it('refuses every call on a run with NO recorded menu (fail-closed)', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)

      await expect(adapter.resolveToolCall(call(), 'grant-1')).rejects.toThrow(
        /no recorded tool menu/,
      )
      expect(executions).toHaveLength(0)
      await finish()
    })
  })

  describe('correlation', () => {
    it('resolves a call the live turn raised against THAT run\'s admission', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())

      await adapter.resolveToolCall(call(), 'grant-1')

      expect(executions).toHaveLength(1)
      expect(executions[0].call.toolName).toBe('business_ir.run_query')
      // The result comes back on the run's own channel, as the port's
      // `tool-result` event.
      const results = seen.filter((event) => event.type === 'tool-result')
      expect(results).toEqual([{ type: 'tool-result', id: 'call-1', result: { rows: [1, 2] } }])
      await finish()
    })

    it('refuses a call no live turn raised (unknown call)', async () => {
      await adapter.startRun(envelope())
      attachRunToolMenu(adapter, 'run-1', admission())

      await expect(adapter.resolveToolCall(call({ id: 'never-seen' }), 'grant-1')).rejects.toThrow(
        /no live run raised the call/,
      )
      expect(executions).toHaveLength(0)
    })

    it('releases the call\'s correlation when the turn ends — a late resolve is refused', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())
      await finish()
      // The stream has settled, so the correlation is released with it.
      await expect(adapter.resolveToolCall(call(), 'grant-1')).rejects.toThrow(/no live run raised/)
    })
  })

  describe('execution', () => {
    it('executes under the admission-time context, S-02 preserved', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())

      await adapter.resolveToolCall(call(), 'grant-1')

      expect(executions[0].admitted).toMatchObject({
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        userId: 'user-1',
        userFeatures: ['ai_assistant.view'],
        isSuperAdmin: false,
        onBehalfOfUserId: 'human-1',
      })
      await finish()
    })

    it('passes the call\'s args through untouched — the door never rewrites arguments', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())

      await adapter.resolveToolCall(call({ args: { prompt: 'revenue by month' } }), 'grant-1')

      expect(executions[0].call.args).toEqual({ prompt: 'revenue by month' })
      await finish()
    })

    it('refuses to execute on a cancelled run', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())
      await adapter.cancelRun('run-1')

      await expect(adapter.resolveToolCall(call(), 'grant-1')).rejects.toThrow(/was cancelled/)
      expect(executions).toHaveLength(0)
      await finish()
    })

    it('reports the platform door\'s own refusal as a throw, naming the tool', async () => {
      executeToolCall = async () => ({ success: false, error: 'unauthorized for tool', errorCode: 'UNAUTHORIZED' })
      adapter = new HermesPortAdapter({ client, executeToolCall })
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())

      await expect(adapter.resolveToolCall(call(), 'grant-1')).rejects.toThrow(
        /business_ir\.run_query.*unauthorized for tool/,
      )
      await finish()
    })

    it('a sink that rejects the result does not turn a completed execution into a failure', async () => {
      await adapter.startRun(envelope())
      attachRunToolMenu(adapter, 'run-1', admission())
      const seen: AiRuntimeStreamEvent[] = []
      const streaming = adapter.streamRun('run-1', async (event) => {
        seen.push(event)
        // Only the RESULT delivery is broken; the rest of the stream is fine.
        if (event.type === 'tool-result') throw new Error('sink is gone')
      })
      await flush()
      client.emit('tool.start', { tool_id: 'call-1', name: 'business_ir.run_query', args: { prompt: 'x' } })
      await flush()

      await expect(adapter.resolveToolCall(call(), 'grant-1')).resolves.toBeUndefined()
      expect(executions).toHaveLength(1)

      client.emit('message.complete', { text: 'done', status: 'complete' })
      await streaming
    })
  })

  describe('the result channel lifecycle (L145 — the open must cover every exit path, like the teardown)', () => {
    it('opens no sink when the stream never starts, so a failed stream leaves nothing behind', async () => {
      // A run with no input text fails to stream before the turn is spent. The
      // result channel must not have been opened: a dead sink on the run would
      // be the same class of leak as an un-released subscription.
      await adapter.startRun(envelope({ allowedInputRefs: [] }))
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })

      expect(seen).toEqual([{ type: 'error', error: 'run has no input text' }])
      expect(adapter.getRun('run-1')?.streamSink).toBeUndefined()
    })

    it('opens the sink while a live turn streams, and releases it when the turn ends', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(adapter, client, seen)
      attachRunToolMenu(adapter, 'run-1', admission())
      expect(adapter.getRun('run-1')?.streamSink).toBeDefined()

      await finish()
      expect(adapter.getRun('run-1')?.streamSink).toBeUndefined()
    })
  })

  describe('the default executor seam (F5 — production must reach the real tool door)', () => {
    it('with no executor injected, a resolved call reaches the platform tool door under a fresh container', async () => {
      // Every other test injects a recorder, so the DEFAULT path (`executeTool`
      // via a fresh request container) would otherwise be unproven — the exact
      // gap the critic named. Here the adapter is built with no executor, so the
      // call walks the default seam: dynamic import → fresh container → the
      // platform's own `executeTool`, under the admission-time context.
      mockExecuteTool.mockClear()
      mockCreateRequestContainer.mockClear()
      const defaultAdapter = new HermesPortAdapter({ client })
      const seen: AiRuntimeStreamEvent[] = []
      const finish = await startLiveRunWithToolCall(defaultAdapter, client, seen)
      attachRunToolMenu(defaultAdapter, 'run-1', admission())

      await defaultAdapter.resolveToolCall(call(), 'grant-1')

      // A FRESH container per call (the platform's own discipline).
      expect(mockCreateRequestContainer).toHaveBeenCalledTimes(1)
      expect(mockExecuteTool).toHaveBeenCalledWith(
        'business_ir.run_query',
        { prompt: 'how many customers' },
        expect.objectContaining({
          tenantId: 'tenant-1',
          organizationId: 'org-1',
          userId: 'user-1',
          userFeatures: ['ai_assistant.view'],
          isSuperAdmin: false,
          onBehalfOfUserId: 'human-1',
          container: { marker: 'fresh-container' },
        }),
      )
      await finish()
    })
  })
})
