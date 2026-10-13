/**
 * Tests for the Hermes runtime adapter — the SECOND engine behind the door
 * (row 28, sub-row P2-3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * P2-3's claim is narrow and testable: the pinned Hermes worker (P2-1) behind
 * the port through the measured client (P2-2), obeying the door's own rules —
 * an honest capability map (no pretending), idempotent cancel, replay-safe
 * complete, usage with its scope stated, the envelope's own deadline honoured,
 * and a run/session/run-id separation.
 *
 * The gateway CLIENT is faked at its structural boundary, so the suite tests
 * the ADAPTER — the mapping — and needs no Python runtime and no Docker. The
 * wire itself is proven by `hermes-gateway-client.test.ts` (21 tests) and the
 * live worker by P2-1's handshake gate. What is measured in the pinned source
 * (`PLAN-HERMES-PHASE2…` §2.8) is encoded here as the fake's contract: the
 * event names, the snake_case payload keys, and `session.steer`'s
 * `queued|redirected|rejected` answer.
 *
 * A separate-agent hostile critic will try to falsify each claim; every test
 * here is itself mutation-checked before the row is discharged.
 */
import type { AiRuntimeEnvelope, AiRuntimeStreamEvent } from '../ai-runtime-port'
import {
  HERMES_RUNTIME_IMPLEMENTATION,
  HermesPortAdapter,
  textInputRef,
  type HermesGatewayPortClient,
} from '../hermes-port-adapter'

type GatewayFrame = { method: string; params: Record<string, unknown> }

/**
 * A fake of the P2-2 client at its structural boundary.
 *
 * It records every call and replays a scripted event stream, so a test states
 * exactly what the measured gateway would send — including the snake_case keys
 * the real one uses (`tool_id`, `session_id`, `usage`).
 */
class FakeHermesClient implements HermesGatewayPortClient {
  connected = true
  /** Every RPC the adapter made, in order. */
  calls: Array<{ method: string; params: unknown }> = []
  /** Events emitted when a prompt is submitted, in order. */
  script: GatewayFrame[] = []
  createResult: Record<string, unknown> = { session_id: 'sess-1', stored_session_id: 'stored-1' }
  steerResult: Record<string, unknown> = { status: 'queued', text: '' }
  interruptResult: Record<string, unknown> = { status: 'interrupted', interrupted: true }
  /** The `session.resume` reply. Measured: its `session_id` is the RUNTIME id. */
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
      // Default: echo the asked id (same runtime id). A test may make the
      // runtime id DIFFER from the stored id the caller named.
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
    // Emit the scripted frames on later microtasks: `streamRun` subscribes
    // before it submits, exactly as a real client would have listeners first.
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

  /** Deliver one frame as the gateway would. */
  emit(method: string, params: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(method) ?? []) listener({ method, params })
  }

  /** Deliver a worker exit as the client would. */
  emitExit(code: number | null): void {
    for (const handler of [...this.exitHandlers]) handler(code)
  }

  /** The live listener count for one event — what the unsubscribe proof reads. */
  listenerCount(method: string): number {
    return this.listeners.get(method)?.size ?? 0
  }

  /** The live exit-handler count — the same proof for the exit subscription. */
  exitHandlerCount(): number {
    return this.exitHandlers.length
  }

  /** The RPC calls of one method, for assertion. */
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

/** The binding a conversation is resumed under. */
const binding = {
  tenantId: 'tenant-1',
  principalId: 'principal-1',
  actorId: 'actor-1',
  agentId: 'agent-1',
  conversationId: 'conv-1',
  capabilityGrantId: 'grant-1',
}

/** Drains the microtask queue so scripted frames are delivered. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('HermesPortAdapter (P2-3 — the second engine behind the door)', () => {
  let client: FakeHermesClient
  let adapter: HermesPortAdapter

  beforeEach(() => {
    client = new FakeHermesClient()
    adapter = new HermesPortAdapter({ client })
  })

  describe('describeCapabilities — the honest boundary', () => {
    it('reports the implementation name and the operations it truly honours', async () => {
      const caps = await adapter.describeCapabilities('asked-version')

      expect(caps.implementation).toBe(HERMES_RUNTIME_IMPLEMENTATION)
      expect(caps.runtimeVersion).toBe('asked-version')
      // §2.4's verdict: steerRun is the first ✓ on the whole port; P2-4 then
      // made the tool door real for the first engine (two gates, deny by
      // default — see `hermes-port-adapter-tools.test.ts`).
      expect(caps.operations).toEqual({
        describeCapabilities: true,
        startRun: true,
        streamRun: true,
        cancelRun: true,
        steerRun: true,
        resumeConversation: true,
        resolveToolCall: true,
        completeRun: true,
      })
    })

    it('reports health from the transport, never a fabricated model health', async () => {
      client.connected = true
      expect((await adapter.describeCapabilities()).health).toBe('ok')

      client.connected = false
      // A disconnected transport is `down`, not `unknown` and not a guess.
      expect((await adapter.describeCapabilities()).health).toBe('down')
    })
  })

  describe('startRun', () => {
    it('creates a session keyed by the run id, so a retried create is the SAME session (#65410)', async () => {
      const first = await adapter.startRun(envelope())

      expect(first.runtimeSessionId).toBe('sess-1')
      expect(client.callsOf('session.create')).toEqual([
        { method: 'session.create', params: { idempotency_key: 'run-1' } },
      ])
    })

    it('is idempotent: a second start for the same run creates nothing new', async () => {
      await adapter.startRun(envelope())
      const second = await adapter.startRun(envelope())

      expect(second.runtimeSessionId).toBe('sess-1')
      expect(client.callsOf('session.create')).toHaveLength(1)
    })

    it('adopts the session the envelope names, without creating one (explicit continuity)', async () => {
      const result = await adapter.startRun(envelope({ runtimeSessionId: 'sess-existing' }))

      expect(result.runtimeSessionId).toBe('sess-existing')
      expect(client.callsOf('session.create')).toHaveLength(0)
      // The adopted session is what the turn is submitted to.
      const streaming = adapter.streamRun('run-1', async () => {})
      await flush()
      client.emit('message.complete', { text: 'ok', status: 'complete' })
      await streaming
      expect(client.callsOf('prompt.submit')[0].params).toEqual({ session_id: 'sess-existing', text: 'hello hermes' })
    })

    it('refuses to start a run when the transport is not connected', async () => {
      client.connected = false
      await expect(adapter.startRun(envelope())).rejects.toThrow(/not connected/)
      expect(client.callsOf('session.create')).toHaveLength(0)
    })
  })

  describe('streamRun — the measured event map', () => {
    it('maps the measured wire to the port events and ends at message.complete', async () => {
      await adapter.startRun(envelope())
      client.script = [
        { method: 'message.delta', params: { text: 'Hel' } },
        { method: 'message.delta', params: { text: 'lo' } },
        { method: 'tool.start', params: { tool_id: 't-1', name: 'business.ir', args: { a: 1 } } },
        { method: 'tool.complete', params: { tool_id: 't-1', name: 'business.ir', result: { ok: true } } },
        { method: 'status.update', params: { kind: 'status', text: 'thinking' } },
        { method: 'message.complete', params: { text: 'Hello', status: 'complete', usage: { input: 7, output: 3, model: 'qwen' } } },
      ]

      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()

      expect(seen).toEqual([
        { type: 'text', content: 'Hel' },
        { type: 'text', content: 'lo' },
        { type: 'tool-call', id: 't-1', toolName: 'business.ir', args: { a: 1 } },
        { type: 'tool-result', id: 't-1', result: { ok: true } },
        { type: 'status', status: 'thinking' },
        // The authoritative final usage, its scope STATED (§4.3).
        { type: 'metadata', usageScope: 'run', tokens: { input: 7, output: 3 }, model: 'qwen' },
        { type: 'done', sessionId: 'sess-1' },
      ])
    })

    it('reports a mid-turn usage tick as session-scoped and the final as run-scoped', async () => {
      await adapter.startRun(envelope())
      client.script = [
        { method: 'session.usage', params: { usage: { input: 10, output: 2, total: 12 } } },
        { method: 'message.complete', params: { text: 'done', status: 'complete', usage: { input: 12, output: 4 } } },
      ]

      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()

      const metadata = seen.filter((e) => e.type === 'metadata')
      expect(metadata).toEqual([
        { type: 'metadata', usageScope: 'session', tokens: { input: 10, output: 2 }, model: undefined },
        { type: 'metadata', usageScope: 'run', tokens: { input: 12, output: 4 }, model: undefined },
      ])
    })

    it('reports an errored turn as an error, never as done', async () => {
      await adapter.startRun(envelope())
      client.script = [
        { method: 'message.complete', params: { text: '', status: 'error', failure_reason: 'provider exploded' } },
      ]

      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()

      expect(seen.map((e) => e.type)).toEqual(['metadata', 'error'])
      expect(seen[1]).toEqual({ type: 'error', error: 'provider exploded' })
    })

    it('reports an interrupted turn as an error — a stopped run must not read as completed (R28-4)', async () => {
      await adapter.startRun(envelope())
      client.script = [{ method: 'message.complete', params: { text: 'partial', status: 'interrupted' } }]

      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()

      expect(seen.map((e) => e.type)).toEqual(['metadata', 'error'])
      expect(seen[1]).toEqual({ type: 'error', error: 'the turn ended with status interrupted' })
    })

    it('ends the stream with an error when the worker dies mid-run, instead of hanging', async () => {
      await adapter.startRun(envelope())
      client.script = [{ method: 'message.delta', params: { text: 'half a ' } }]

      const seen: AiRuntimeStreamEvent[] = []
      const streaming = adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()
      client.emitExit(1)
      await streaming

      expect(seen).toEqual([
        { type: 'text', content: 'half a ' },
        { type: 'error', error: 'the hermes worker exited mid-run (code 1)' },
      ])
    })

    it('surfaces a failed submit as an error event, not a hang or a throw', async () => {
      await adapter.startRun(envelope())
      client.submitError = new Error('the gateway refused the prompt')

      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })

      expect(seen).toEqual([{ type: 'error', error: 'the gateway refused the prompt' }])
    })

    it('reports an unknown run as an error and streams nothing', async () => {
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('nope', async (event) => {
        seen.push(event)
      })
      expect(seen).toEqual([{ type: 'error', error: 'unknown run nope' }])
      expect(client.callsOf('prompt.submit')).toHaveLength(0)
    })

    it('reports a run with no input text as an error', async () => {
      await adapter.startRun(envelope({ allowedInputRefs: [] }))
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      expect(seen).toEqual([{ type: 'error', error: 'run has no input text' }])
    })

    it('unsubscribes every event listener once the stream ends', async () => {
      await adapter.startRun(envelope())
      client.script = [{ method: 'message.complete', params: { text: 'x', status: 'complete' } }]
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()
      expect(seen.some((event) => event.type === 'done')).toBe(true)

      // The proof that matters: after the stream settles, the fake holds NO
      // listener for any event the stream subscribed to and NO exit handler —
      // so a late frame reaches nobody and a long-lived client does not grow
      // by one closure per streamed run. (The earlier version of this test
      // asserted submit call-counts, which passes even with every `off()`
      // deleted; this version fails if the cleanup in the `finally` goes.)
      for (const method of [
        'message.delta',
        'reasoning.delta',
        'tool.start',
        'tool.complete',
        'status.update',
        'session.usage',
        'message.complete',
        'error',
      ]) {
        expect(client.listenerCount(method)).toBe(0)
      }
      expect(client.exitHandlerCount()).toBe(0)

      // And a frame arriving after the settle is not delivered to anyone.
      const before = seen.length
      client.emit('message.delta', { text: 'late' })
      expect(seen).toHaveLength(before)
    })

    it("honours the envelope's OWN deadline: an expired run errors instead of spending a turn", async () => {
      await adapter.startRun(envelope({ deadline: new Date(Date.now() - 60_000) }))
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })

      expect(seen).toEqual([
        { type: 'error', error: 'the run exceeded its admission deadline before it could stream' },
      ])
      // The turn is never sent on behalf of a run that is already out of time.
      expect(client.callsOf('prompt.submit')).toHaveLength(0)
    })

    it("ends a turn that outlives the envelope's deadline with an error, instead of streaming forever", async () => {
      await adapter.startRun(envelope({ deadline: new Date(Date.now() + 40) }))
      // No `message.complete` is scripted: without the deadline this stream
      // would await forever; with it, the caller's own bound ends the run.
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })

      expect(seen).toEqual([
        { type: 'error', error: 'the run exceeded its admission deadline while streaming' },
      ])
    })

    it('bounds nothing when the deadline is absent, null or unreadable (fail safe)', async () => {
      // A bound that cannot be read is no bound: a garbage value must not kill
      // a healthy turn, and the unreadable one is logged, not applied.
      await adapter.startRun(envelope({ deadline: 'not a date' }))
      client.script = [{ method: 'message.complete', params: { text: 'ok', status: 'complete' } }]
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      await flush()

      expect(seen.some((event) => event.type === 'done')).toBe(true)

      await adapter.startRun(envelope({ runId: 'run-2', deadline: null }))
      client.script = [{ method: 'message.complete', params: { text: 'ok', status: 'complete' } }]
      const seen2: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-2', async (event) => {
        seen2.push(event)
      })
      await flush()
      expect(seen2.some((event) => event.type === 'done')).toBe(true)
    })
  })

  describe('cancelRun — bounded and idempotent (§4.3)', () => {
    it('interrupts the session and reports what it did', async () => {
      await adapter.startRun(envelope())
      const result = await adapter.cancelRun('run-1')

      expect(result).toEqual({ runId: 'run-1', cancelled: true })
      expect(client.callsOf('session.interrupt')).toEqual([
        { method: 'session.interrupt', params: { session_id: 'sess-1' } },
      ])
    })

    it('is idempotent: the second cancel changes nothing and says so', async () => {
      await adapter.startRun(envelope())
      await adapter.cancelRun('run-1')
      const second = await adapter.cancelRun('run-1')

      expect(second).toEqual({ runId: 'run-1', cancelled: false, reason: 'already-cancelled' })
      expect(client.callsOf('session.interrupt')).toHaveLength(1)
    })

    it('answers a cancel for a completed run with a reason, not an error', async () => {
      await adapter.startRun(envelope())
      await adapter.completeRun('run-1', { status: 'completed' })
      const result = await adapter.cancelRun('run-1')

      expect(result).toEqual({ runId: 'run-1', cancelled: false, reason: 'already-complete' })
      expect(client.callsOf('session.interrupt')).toHaveLength(0)
    })

    it('answers a cancel for an unknown run with not-found', async () => {
      expect(await adapter.cancelRun('ghost')).toEqual({ runId: 'ghost', cancelled: false, reason: 'not-found' })
    })

    it('keeps the local cancellation when the gateway reports nothing in flight', async () => {
      await adapter.startRun(envelope())
      client.interruptResult = { status: 'not_interrupted', interrupted: false }

      const result = await adapter.cancelRun('run-1')

      expect(result.cancelled).toBe(true)
      // The run streams nothing further.
      const seen: AiRuntimeStreamEvent[] = []
      await adapter.streamRun('run-1', async (event) => {
        seen.push(event)
      })
      expect(seen).toEqual([])
    })
  })

  describe('steerRun — §2.4 settled, with its named limits', () => {
    it('delivers the instruction into the live turn (status queued)', async () => {
      await adapter.startRun(envelope())
      await adapter.steerRun('run-1', { text: 'also explain the plan' })

      expect(client.callsOf('session.steer')).toEqual([
        { method: 'session.steer', params: { session_id: 'sess-1', text: 'also explain the plan' } },
      ])
    })

    it('accepts a redirect status as a delivery too', async () => {
      await adapter.startRun(envelope())
      client.steerResult = { status: 'redirected', text: 'somewhere else' }
      await expect(adapter.steerRun('run-1', { text: 'no, do that' })).resolves.toBeUndefined()
    })

    it('THROWS on a rejected steer — never silently queued as a next prompt (named limit 1)', async () => {
      await adapter.startRun(envelope())
      client.steerResult = { status: 'rejected', text: 'too late' }

      await expect(adapter.steerRun('run-1', { text: 'hello?' })).rejects.toThrow(/no turn in flight/)
    })

    it('THROWS on an unknown status rather than assuming a delivery', async () => {
      await adapter.startRun(envelope())
      client.steerResult = { status: 'teleported' }

      await expect(adapter.steerRun('run-1', { text: 'hello?' })).rejects.toThrow(/unknown status/)
    })

    it('refuses an empty instruction (the gateway\'s own 4002 rule)', async () => {
      await adapter.startRun(envelope())
      await expect(adapter.steerRun('run-1', { text: '   ' })).rejects.toThrow(/text is required/)
      expect(client.callsOf('session.steer')).toHaveLength(0)
    })

    it('refuses a steer on an unknown or cancelled run', async () => {
      await expect(adapter.steerRun('ghost', { text: 'hi' })).rejects.toThrow(/unknown run/)

      await adapter.startRun(envelope())
      await adapter.cancelRun('run-1')
      await expect(adapter.steerRun('run-1', { text: 'hi' })).rejects.toThrow(/cancelled/)
    })
  })

  describe('resumeConversation — explicit session continuity, never implicit', () => {
    it('resumes the session the caller names and mints a FRESH run id per resume (§4.2)', async () => {
      const first = await adapter.resumeConversation(binding, { sessionId: 'sess-9', text: 'continue' })
      const second = await adapter.resumeConversation(binding, { sessionId: 'sess-9', text: 'continue again' })

      expect(first.runId).not.toBe('conv-1')
      expect(second.runId).not.toBe(first.runId)
      expect(first.runtimeSessionId).toBe('sess-9')
      // The session is re-hydrated through `session.resume`, not assumed alive.
      expect(client.callsOf('session.resume')).toEqual([
        { method: 'session.resume', params: { session_id: 'sess-9' } },
        { method: 'session.resume', params: { session_id: 'sess-9' } },
      ])
    })

    it('carries the binding identity and the turn text into the resumed run', async () => {
      const started = await adapter.resumeConversation(binding, { sessionId: 'sess-9', text: 'go on' })
      const run = adapter.getRun(started.runId)

      expect(run?.envelope.tenantId).toBe('tenant-1')
      expect(run?.envelope.conversationId).toBe('conv-1')
      expect(run?.envelope.capabilityGrantId).toBe('grant-1')
      expect(run?.envelope.allowedInputRefs).toEqual([textInputRef('go on')])
    })

    it('adopts the RUNTIME session id the resume answers with — not the stored id the caller named', async () => {
      // Measured (`contracts/sessions.py`): the resume PARAMS take the stored id
      // or an exact title; the REPLY's `session_id` is the RUNTIME id, and the
      // gateway resolves `prompt.submit` against its live sessions by the
      // runtime id alone (a differing stored id is answered 4001). A run that
      // kept the caller's id would fail every later turn.
      client.resumeResult = { session_id: 'runtime-77', running: true }
      const resumed = await adapter.resumeConversation(binding, { sessionId: 'stored-9', text: 'continue' })

      expect(resumed.runtimeSessionId).toBe('runtime-77')
      expect(adapter.getRun(resumed.runId)?.sessionId).toBe('runtime-77')

      client.script = [{ method: 'message.complete', params: { text: 'ok', status: 'complete' } }]
      await adapter.streamRun(resumed.runId, async () => {})
      await flush()

      // The turn addressed the runtime id, not the stored id that was named.
      expect(client.callsOf('prompt.submit')).toEqual([
        { method: 'prompt.submit', params: { session_id: 'runtime-77', text: 'continue' } },
      ])
    })

    it('refuses to resume without a session id to continue', async () => {
      await expect(adapter.resumeConversation(binding, { text: 'go on' })).rejects.toThrow(/session id/)
      expect(client.callsOf('session.resume')).toHaveLength(0)
    })
  })

  describe('resolveToolCall — a real door since P2-4', () => {
    it('no longer reports itself unsupported: a call no live run raised is refused as unknown', async () => {
      // P2-4 made this the first engine on the port that resolves a tool call.
      // The two gates (deny-by-default) and the full plumbing live in
      // `hermes-port-adapter-tools.test.ts`; what this suite still owns is that
      // the door no longer answers "unsupported" for a call it cannot correlate
      // — it refuses it as an unknown call, which is a different, honest answer.
      await expect(
        adapter.resolveToolCall({ id: 'c-1', toolName: 'business.ir', args: {} }, 'grant-1'),
      ).rejects.toThrow(/no live run raised the call/)
    })
  })

  describe('completeRun — replay-safe (§4.3)', () => {
    it('records the first completion and reports the second as already complete', async () => {
      await adapter.startRun(envelope())

      const first = await adapter.completeRun('run-1', { status: 'completed', usage: { scope: 'run' } })
      const second = await adapter.completeRun('run-1', { status: 'completed', usage: { scope: 'run' } })

      expect(first).toEqual({ runId: 'run-1', completed: true, alreadyComplete: false })
      expect(second).toEqual({ runId: 'run-1', completed: false, alreadyComplete: true })
    })

    it('records a completion for an unknown run as such, without throwing', async () => {
      expect(await adapter.completeRun('ghost', { status: 'completed' })).toEqual({
        runId: 'ghost',
        completed: false,
        alreadyComplete: false,
      })
    })

    it('records the SERVING ENGINE on the run when the completion carries it (`P2-5`, §2.11)', async () => {
      // The run's ledger entry must say WHICH engine served it. Recording it on
      // the run — not merely accepting it — is what makes that true; without
      // this, `provenance.implementation` is a write-only field.
      await adapter.startRun(envelope())
      await adapter.completeRun('run-1', {
        status: 'completed',
        provenance: { implementation: 'hermes' },
      })
      expect(adapter.getRun('run-1')?.implementation).toBe('hermes')
    })

    it('leaves the engine UNRECORDED when the completion carries none — never guessed', async () => {
      await adapter.startRun(envelope())
      await adapter.completeRun('run-1', { status: 'completed' })
      expect(adapter.getRun('run-1')?.implementation).toBeUndefined()
    })
  })

  describe('the identifiers stay distinct (§4.2)', () => {
    it('keeps the run id and the session id apart, and the resume run id apart from the conversation', async () => {
      const started = await adapter.startRun(envelope())
      expect(started.runId).toBe('run-1')
      expect(started.runtimeSessionId).toBe('sess-1')

      const resumed = await adapter.resumeConversation(binding, { sessionId: 'sess-9' })
      expect(resumed.runId).not.toBe('sess-9')
      expect(resumed.runId).not.toBe('conv-1')
      expect(adapter.getRun(resumed.runId)?.sessionId).toBe('sess-9')
    })
  })
})
