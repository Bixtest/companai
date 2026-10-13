/**
 * `P2-6` (§2.12) — THE EXIT GATE, measured.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * The phase is not done because code exists; it is done when the gate is
 * measured. §2.12's gate has five items, proven on **one tenant**, then proven
 * **adversarially with two**:
 *
 *   1. cancellation      — a cancelled run records `cancelled`; a second cancel
 *                          is `already-cancelled`, never an error;
 *   2. retry idempotency — a re-delivered `startRun`/`completeRun` changes
 *                          nothing, so usage cannot be double-counted;
 *   3. usage capture     — figures are run-scoped, the scope is STATED, and a
 *                          mid-turn tick is not mistaken for the final total;
 *   4. bounded memory/CPU — the run registry is capped/pruned, and the
 *                          envelope's `deadline` AND `budget.milliseconds` bound
 *                          the run;
 *   5. no cross-scope access — a run admitted for tenant A cannot be read, named
 *                          or affected by tenant B, and **no frame** of one
 *                          tenant's run carries the other's identifiers.
 *
 * The gateway CLIENT is faked at its structural boundary (the same seam the
 * `P2-3` suite uses), so the gate is proven with no Python runtime and no
 * Docker. The wire itself is proven by `hermes-gateway-client.test.ts` and the
 * live worker by `P2-1`'s handshake gate.
 */
import type { AiRuntimeEnvelope, AiRuntimeStreamEvent } from '../ai-runtime-port'
import { DEFAULT_MAX_RETAINED_RUNS } from '../ai-runtime-bounds'
import {
  HermesPortAdapter,
  textInputRef,
  type HermesGatewayPortClient,
} from '../hermes-port-adapter'

type GatewayFrame = { method: string; params: Record<string, unknown> }

/**
 * A minimal fake of the `P2-2` client. It records every RPC (so a test can read
 * the frames actually sent) and replays a scripted event stream.
 */
class FakeClient implements HermesGatewayPortClient {
  connected = true
  calls: Array<{ method: string; params: unknown }> = []
  script: GatewayFrame[] = []
  createResult: Record<string, unknown> = { session_id: 'sess-1' }
  interruptResult: Record<string, unknown> = { status: 'interrupted', interrupted: true }

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
    return {} as TResult
  }
  async submitPrompt(sessionId: string, text: string): Promise<{ status?: string }> {
    this.calls.push({ method: 'prompt.submit', params: { session_id: sessionId, text } })
    for (const frame of this.script) queueMicrotask(() => this.emit(frame.method, frame.params))
    return { status: 'streaming' }
  }
  async interruptSession(sessionId: string): Promise<Record<string, unknown>> {
    this.calls.push({ method: 'session.interrupt', params: { session_id: sessionId } })
    return this.interruptResult
  }
  async steerSession(sessionId: string, text: string): Promise<Record<string, unknown>> {
    this.calls.push({ method: 'session.steer', params: { session_id: sessionId, text } })
    return { status: 'queued' }
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
      const i = this.exitHandlers.indexOf(handler)
      if (i >= 0) this.exitHandlers.splice(i, 1)
    }
  }
  emit(method: string, params: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(method) ?? []) listener({ method, params })
  }
  callsOf(method: string): Array<{ method: string; params: unknown }> {
    return this.calls.filter((c) => c.method === method)
  }
  /** Every frame, serialised — the cross-scope leak check reads this. */
  framesAsJson(): string {
    return JSON.stringify(this.calls)
  }
}

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
    allowedInputRefs: [textInputRef('hello')],
    ...overrides,
  }
}

/** A one-turn script that ends the stream at `message.complete`. */
function completingScript(): GatewayFrame[] {
  return [
    { method: 'message.delta', params: { text: 'hi' } },
    { method: 'message.complete', params: { status: 'complete' } },
  ]
}

describe('P2-6 §2.12 — the exit gate on ONE tenant', () => {
  it('(1) cancellation is bounded and idempotent — a second cancel is a REASON, never an error', async () => {
    const client = new FakeClient()
    const adapter = new HermesPortAdapter({ client })
    await adapter.startRun(envelope({ runId: 'run-c' }))

    expect(await adapter.cancelRun('run-c')).toEqual({ runId: 'run-c', cancelled: true })
    // The second call finds it already cancelled — a success WITH A REASON (§4.3).
    expect(await adapter.cancelRun('run-c')).toEqual({
      runId: 'run-c',
      cancelled: false,
      reason: 'already-cancelled',
    })
    // A cancelled run streams nothing further: the cancel is honoured before the turn.
    const events: AiRuntimeStreamEvent[] = []
    await adapter.streamRun('run-c', async (e) => {
      events.push(e)
    })
    expect(events).toEqual([])
    expect(client.callsOf('prompt.submit')).toHaveLength(0)
    // The door records the honest terminal state, and a completed run cannot be cancelled.
    expect(await adapter.completeRun('run-c', { status: 'cancelled' })).toEqual({
      runId: 'run-c',
      completed: true,
      alreadyComplete: false,
    })
    expect(await adapter.cancelRun('run-c')).toEqual({
      runId: 'run-c',
      cancelled: false,
      reason: 'already-complete',
    })
    // An unknown run is a success with a reason, never a throw.
    expect(await adapter.cancelRun('nope')).toEqual({ runId: 'nope', cancelled: false, reason: 'not-found' })
  })

  it('(2) retry idempotency — a re-delivered startRun/completeRun changes nothing, so usage cannot double-count', async () => {
    const client = new FakeClient()
    const adapter = new HermesPortAdapter({ client })
    const env = envelope({ runId: 'run-r' })

    const first = await adapter.startRun(env)
    const retried = await adapter.startRun(env)
    expect(retried.runId).toBe(first.runId)
    expect(retried.runtimeSessionId).toBe(first.runtimeSessionId)
    // The retry did NOT re-admit: exactly one session was created.
    expect(client.callsOf('session.create')).toHaveLength(1)

    const recorded = await adapter.completeRun('run-r', {
      status: 'completed',
      usage: { scope: 'run', inputTokens: 10, outputTokens: 5 },
    })
    expect(recorded).toEqual({ runId: 'run-r', completed: true, alreadyComplete: false })
    // The replay is harmless: `alreadyComplete` is the signal a caller uses to
    // know the usage figure was ALREADY counted and must not be added again.
    const replay = await adapter.completeRun('run-r', {
      status: 'completed',
      usage: { scope: 'run', inputTokens: 10, outputTokens: 5 },
    })
    expect(replay).toEqual({ runId: 'run-r', completed: false, alreadyComplete: true })
    expect(adapter.getRun('run-r')?.completed).toBe(true)
  })

  it('(3) usage capture — the figures are run-scoped, the scope is STATED, and a mid-turn tick is not the total', async () => {
    const client = new FakeClient()
    client.script = [
      // A cumulative mid-turn tick (scope `session`) …
      { method: 'session.usage', params: { usage: { input: 3, output: 1 } } },
      // … then the authoritative final figure for THIS turn (scope `run`).
      { method: 'message.complete', params: { usage: { input: 12, output: 7 }, status: 'complete' } },
    ]
    const adapter = new HermesPortAdapter({ client })
    await adapter.startRun(envelope({ runId: 'run-u' }))

    const events: AiRuntimeStreamEvent[] = []
    await adapter.streamRun('run-u', async (e) => {
      events.push(e)
    })

    const usage = events.filter((e) => e.type === 'metadata')
    expect(usage).toEqual([
      { type: 'metadata', usageScope: 'session', tokens: { input: 3, output: 1 }, model: undefined },
      { type: 'metadata', usageScope: 'run', tokens: { input: 12, output: 7 }, model: undefined },
    ])
    // §4.3: every figure STATES whether it is per-run or cumulative — the final
    // one is `run`, the tick is `session`. The adapter never invents a provider.
    expect(usage.map((e) => (e as { usageScope?: string }).usageScope)).toEqual(['session', 'run'])
  })

  it('(4a) bounded memory — past the cap, finished runs are evicted and a LIVE run is kept', async () => {
    const client = new FakeClient()
    const adapter = new HermesPortAdapter({ client })

    // One run that never completes: it must survive every prune.
    await adapter.startRun(envelope({ runId: 'live' }))

    // Drive WELL past the cap, finishing each run so it is evictable.
    const total = DEFAULT_MAX_RETAINED_RUNS + 25
    for (let i = 0; i < total; i++) {
      const id = `run-${i}`
      await adapter.startRun(envelope({ runId: id }))
      await adapter.completeRun(id, { status: 'completed' })
    }

    // The registry is BOUNDED — far below the number of runs started.
    expect(adapter.retainedRunCount()).toBeLessThanOrEqual(DEFAULT_MAX_RETAINED_RUNS + 1)
    // The oldest finished run was evicted; the live one never was.
    expect(adapter.getRun('run-0')).toBeUndefined()
    expect(adapter.getRun('live')).toBeDefined()
    // A late completion for an evicted run is harmless, not a throw.
    expect(await adapter.completeRun('run-0', { status: 'completed' })).toEqual({
      runId: 'run-0',
      completed: false,
      alreadyComplete: false,
    })
  })

  it('(4b) bounded CPU — an already-expired DEADLINE spends no turn', async () => {
    const client = new FakeClient()
    const adapter = new HermesPortAdapter({ client })
    await adapter.startRun(
      envelope({ runId: 'expired', deadline: new Date(Date.now() - 1_000).toISOString() }),
    )
    const events: AiRuntimeStreamEvent[] = []
    await adapter.streamRun('expired', async (e) => {
      events.push(e)
    })
    expect(events).toEqual([
      { type: 'error', error: 'the run exceeded its admission time bound before it could stream' },
    ])
    // The whole point of a bound: no turn was spent on a run already out of time.
    expect(client.callsOf('prompt.submit')).toHaveLength(0)
  })

  it('(4b) bounded CPU — an expired BUDGET.milliseconds bounds the run too (the P2-6 fix)', async () => {
    const client = new FakeClient()
    const adapter = new HermesPortAdapter({ client })
    // Before P2-6 the envelope's `budget` was carried and dropped by both
    // adapters, so this run would have spent a turn. It must not.
    await adapter.startRun(envelope({ runId: 'budget', budget: { milliseconds: 10 } }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    const events: AiRuntimeStreamEvent[] = []
    await adapter.streamRun('budget', async (e) => {
      events.push(e)
    })
    expect(events).toEqual([
      { type: 'error', error: 'the run exceeded its admission time bound before it could stream' },
    ])
    expect(client.callsOf('prompt.submit')).toHaveLength(0)
  })

  it('(4b) a budget still IN FORCE does not block the run — the bound is a ceiling, not a tripwire', async () => {
    // This is the half that catches a bound read as an ABSOLUTE instant, or
    // measured from the epoch instead of from admission: either would make a
    // generous budget look long expired and silently stop every run.
    const client = new FakeClient()
    client.script = completingScript()
    const adapter = new HermesPortAdapter({ client })
    await adapter.startRun(envelope({ runId: 'in-force', budget: { milliseconds: 60_000 } }))
    const events: AiRuntimeStreamEvent[] = []
    await adapter.streamRun('in-force', async (e) => {
      events.push(e)
    })
    expect(events).toContainEqual({ type: 'done', sessionId: 'sess-1' })
    expect(client.callsOf('prompt.submit')).toHaveLength(1)
  })
})

describe('P2-6 §2.12 — the two ADVERSARIAL tenants: no cross-scope access', () => {
  /**
   * Two tenants, each with its own adapter and its own worker client — the shape
   * the route produces, because `resolveAiRuntimePort` builds a fresh adapter
   * per request and the selector holds no shared instance.
   */
  function twoTenants() {
    const clientA = new FakeClient()
    const clientB = new FakeClient()
    clientA.script = completingScript()
    clientB.script = completingScript()
    clientA.createResult = { session_id: 'sess-A' }
    clientB.createResult = { session_id: 'sess-B' }
    return {
      clientA,
      clientB,
      adapterA: new HermesPortAdapter({ client: clientA }),
      adapterB: new HermesPortAdapter({ client: clientB }),
    }
  }

  it('tenant A cannot read, name or affect tenant B — every door operation refuses a foreign run', async () => {
    const { adapterA, adapterB } = twoTenants()
    await adapterA.startRun(
      envelope({ runId: 'run-A', tenantId: 'tenant-A', conversationId: 'conv-A', principalId: 'principal-A' }),
    )
    await adapterB.startRun(
      envelope({ runId: 'run-B', tenantId: 'tenant-B', conversationId: 'conv-B', principalId: 'principal-B' }),
    )

    // (a) A cannot READ B's run: it is not in A's registry at all.
    expect(adapterA.getRun('run-B')).toBeUndefined()
    // (b) A cannot NAME B's run: cancelling a foreign id is `not-found`, not an act.
    expect(await adapterA.cancelRun('run-B')).toEqual({
      runId: 'run-B',
      cancelled: false,
      reason: 'not-found',
    })
    // (c) A cannot AFFECT B's run: a completion for a foreign id is inert.
    expect(await adapterA.completeRun('run-B', { status: 'completed' })).toEqual({
      runId: 'run-B',
      completed: false,
      alreadyComplete: false,
    })
    // (d) A cannot stream a foreign run: the door answers with an error, not events.
    const leaked: AiRuntimeStreamEvent[] = []
    await adapterA.streamRun('run-B', async (e) => {
      leaked.push(e)
    })
    expect(leaked).toEqual([{ type: 'error', error: 'unknown run run-B' }])

    // B's own run is untouched by any of it.
    expect(adapterB.getRun('run-B')?.cancelled).toBe(false)
    expect(adapterB.getRun('run-B')?.completed).toBe(false)
  })

  it('NO cross-scope frame exists: tenant A\'s worker never sees tenant B\'s identifiers (and vice versa)', async () => {
    const { clientA, clientB, adapterA, adapterB } = twoTenants()

    await adapterA.startRun(
      envelope({ runId: 'run-A', tenantId: 'tenant-A', conversationId: 'conv-A', principalId: 'principal-A' }),
    )
    await adapterB.startRun(
      envelope({ runId: 'run-B', tenantId: 'tenant-B', conversationId: 'conv-B', principalId: 'principal-B' }),
    )
    // Both tenants actually run a turn, so the clients receive real frames.
    await adapterA.streamRun('run-A', async () => {})
    await adapterB.streamRun('run-B', async () => {})

    // The frames of one tenant's worker must carry NOTHING of the other tenant.
    // Only two identifiers travel on the wire: the RUN id (`idempotency_key`)
    // and the SESSION id (`session_id`). The tenant/principal ids never appear in
    // ANY frame, so asserting their absence would be vacuous — these four are the
    // assertions that CAN fail (a cross-scope run/session id on the wrong worker).
    const framesA = clientA.framesAsJson()
    const framesB = clientB.framesAsJson()
    expect(framesA).not.toContain('run-B')
    expect(framesA).not.toContain('sess-B')
    expect(framesB).not.toContain('run-A')
    expect(framesB).not.toContain('sess-A')
    // …and each worker DID carry its OWN run and session, so the negatives above
    // are not vacuously true against an empty call log.
    expect(framesA).toContain('run-A')
    expect(framesA).toContain('sess-A')
    expect(framesB).toContain('run-B')
    expect(framesB).toContain('sess-B')
  })
})
