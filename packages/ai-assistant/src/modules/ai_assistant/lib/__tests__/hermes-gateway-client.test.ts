/**
 * P2-2's exit gate — the Hermes gateway client, proven against a protocol stub.
 *
 * The stub is not a guess: it implements the handshake and frames **measured from
 * the pinned Hermes source** (`tui_gateway/contracts/`: `ping` → `pong`,
 * `gateway.capabilities`, `client.capabilities`, `gateway.ready`; and
 * `tui_gateway/transport.py`'s newline-JSON framing). What is under test is the
 * **wire and its refusals** — correlation, ordering, cancellation, and above all
 * that a malformed frame cannot kill a stream — not the cleverness of a runtime
 * that is not here (the worker's boot is P2-1's own gate).
 *
 * Every event this suite emits goes through the envelope the pinned gateway
 * really writes (`server.py::_event_frame`, `:701`):
 *
 *     {"jsonrpc": "2.0", "method": "event",
 *      "params": {"type": <event>, "session_id": <sid>, "payload": {…}}}
 *
 * which is not this suite's assertion alone: **upstream asserts it too** —
 * `tests/e2e/core/parity/test_boot_contract.py:115` reads the gateway's first
 * stdout line and requires `frame["method"] == "event"` with
 * `params["type"] == "gateway.ready"`, then validates `params["payload"]` against
 * the payload contract. A stub that emitted bare `{method: 'message.delta'}`
 * frames would be testing a wire Hermes never produces — which is exactly the
 * defect this file's first draft had, caught by a hostile critic.
 *
 * The refusals carry the suite's weight. A client that hangs on a frame it does
 * not understand is worse than no client, because a turn that never ends is
 * invisible — so this suite drives a malformed line, an unhandled server→client
 * request, a response for a request already abandoned, an empty line, a frame
 * split mid-line, and a request that times out, and requires each to come back
 * as a named behaviour instead of a wedge.
 */

import { HermesGatewayClient, type HermesGatewayProcess } from '../hermes-gateway-client'

/** What the stub answers for a method: a value, or a function of the params. */
type Responder = unknown | ((params: Record<string, unknown>) => unknown)

/**
 * One event frame, built exactly as `server.py::_event_frame` builds it.
 *
 * `payload: null` omits the key entirely — the contract's own shape for events
 * that carry none (`message.start`: *"A turn began streaming; no payload"*), and
 * `session_id: null` does the same for connection-scoped events (`gateway.ready`,
 * written by `entry.py:313` and `ws.py:367` with only `type` + `payload`).
 */
function eventFrame(
  type: string,
  payload: Record<string, unknown> | null,
  sessionId: string | null = 'sess-1',
): Record<string, unknown> {
  const params: Record<string, unknown> = { type }
  if (sessionId !== null) params.session_id = sessionId
  if (payload !== null) params.payload = payload
  return { jsonrpc: '2.0', method: 'event', params }
}

/**
 * A fake worker.
 *
 * It behaves the way the measured transport does: every line written to its
 * stdin is a newline-terminated JSON frame, and every answered request is
 * written back as a newline-terminated frame. `auto` makes it answer requests
 * exactly when they arrive (which is what the client's sequential handshake
 * needs); tests that drive frames by hand simply leave `auto` off.
 */
class FakeGatewayProcess implements HermesGatewayProcess {
  readonly written: string[] = []
  killed = 0
  readonly pid = 4242

  /** method → what to reply with. Omit a method to make it time out. */
  auto: Record<string, Responder> = {}
  /** Set to send a raw string instead of a JSON response (for error frames). */
  autoRaw: ((method: string, id: number | string) => string | null) | null = null

  private readonly data: Array<(chunk: string) => void> = []
  private readonly enders: Array<() => void> = []
  private readonly exiters: Array<(code: number | null) => void> = []
  private readonly errorers: Array<(error: unknown) => void> = []

  /**
   * The stdout surface, typed exactly as the client's interface declares it.
   *
   * An object literal cannot carry two `on` overloads, so the dispatcher is
   * declared once here and assigned to the overloaded member type — the
   * interface stays the honest two-signature declaration, and the fake still
   * satisfies it (TS2416 was the first draft's defect, named by its critic).
   */
  readonly stdout: HermesGatewayProcess['stdout'] = {
    on: ((event: string, listener: (chunk?: unknown) => void) => {
      if (event === 'data') this.data.push(listener as (chunk: string) => void)
      else this.enders.push(listener as () => void)
      return undefined
    }) as HermesGatewayProcess['stdout']['on'],
  }

  stdin = {
    write: (chunk: string) => {
      this.written.push(chunk)
      this.maybeAnswer(chunk)
      return true
    },
    end: () => undefined,
  }
  stderr = {
    on: (_event: 'data', _listener: (chunk: string) => void) => undefined,
  }

  kill(): void {
    this.killed += 1
  }

  on(event: 'exit' | 'error', listener: (arg: unknown) => void): unknown {
    if (event === 'exit') this.exiters.push(listener as (code: number | null) => void)
    else this.errorers.push(listener)
    return undefined
  }

  /** Push one line the way `StdioTransport.write` does: frame + trailing "\n". */
  emit(line: string): void {
    const frame = line.endsWith('\n') ? line : `${line}\n`
    for (const listener of this.data) listener(frame)
  }

  /** Push bytes EXACTLY as given — for the split-frame and CRLF-terminated cases. */
  emitRaw(chunk: string): void {
    for (const listener of this.data) listener(chunk)
  }

  emitFrames(...frames: unknown[]): void {
    for (const frame of frames) this.emit(JSON.stringify(frame))
  }

  emitEnd(): void {
    for (const listener of this.enders) listener()
  }

  emitExit(code: number | null): void {
    for (const listener of this.exiters) listener(code)
  }

  emitError(error: unknown): void {
    for (const listener of this.errorers) listener(error)
  }

  /** The JSON-RPC objects this client sent, parsed back out of its writes. */
  sent(): Array<Record<string, unknown>> {
    return this.written
      .flatMap((line) => line.split('\n'))
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
  }

  private maybeAnswer(chunk: string): void {
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue
      const request = JSON.parse(line) as Record<string, unknown>
      if (typeof request.method !== 'string') continue
      const id = request.id as number | string
      if (this.autoRaw) {
        const raw = this.autoRaw(request.method, id)
        if (raw !== null) {
          this.emit(raw)
          continue
        }
      }
      const responder = this.auto[request.method]
      if (responder === undefined) continue
      const params = (request.params as Record<string, unknown>) ?? {}
      const result = typeof responder === 'function' ? (responder as (p: Record<string, unknown>) => unknown)(params) : responder
      this.emit(JSON.stringify({ jsonrpc: '2.0', id, result }))
    }
  }
}

/** The handshake the measured contract describes, as the stub's replies. */
const HANDSHAKE_AUTO: Record<string, Responder> = {
  // NOTE the snake_case: these are the literal wire keys (Python/pydantic
  // contracts), which is exactly the trap the handshake test exists to catch.
  'client.capabilities': { server_requests: ['clarify', 'approval.request'], declines_not_shown: false },
  'gateway.capabilities': { per_session_exclusive_submit: true },
  ping: { pong: true },
}

/** `gateway.ready`'s own payload, per `GatewayReadyPayload`. */
const READY_PAYLOAD = { skin: { name: 't' }, change_events: true, replay_epoch: 'epoch-1' }

function makeClient(options: { requestTimeoutMs?: number; env?: Record<string, string>; auto?: Record<string, Responder> } = {}) {
  const fake = new FakeGatewayProcess()
  fake.auto = options.auto ?? HANDSHAKE_AUTO
  const spawnCalls: Array<{ command: string; args: string[]; env: NodeJS.ProcessEnv }> = []
  const client = new HermesGatewayClient({
    command: 'hermes',
    args: ['gateway'],
    requestTimeoutMs: options.requestTimeoutMs ?? 500,
    spawn: (command, args, spawnOptions) => {
      spawnCalls.push({ command, args, env: spawnOptions.env })
      return fake
    },
    env: options.env,
  })
  return { client, fake, spawnCalls }
}

/**
 * Connect a client whose stub answers the handshake.
 *
 * The stub answers each request **synchronously as it is written** (which is what
 * the client's sequential handshake needs), so one macrotask boundary is enough
 * for all three handshake calls to settle. `gateway.ready` is the frame
 * `connect()` is still waiting for, so it is emitted before the await returns —
 * in its real envelope, with no `session_id`, exactly as `entry.py:313` writes it.
 */
async function connectedClient(options: Parameters<typeof makeClient>[0] = {}) {
  const made = makeClient(options)
  const connected = made.client.connect()
  await new Promise((resolve) => setImmediate(resolve))
  made.fake.emit(JSON.stringify(eventFrame('gateway.ready', READY_PAYLOAD, null)))
  await connected
  return made
}

describe('HermesGatewayClient — the stdio JSON-RPC wire (P2-2)', () => {
  it('spawns the worker with the secret on the ENVIRONMENT, never on argv', async () => {
    const { client, spawnCalls } = await connectedClient({ env: { HERMES_API_KEY: 'sk-should-not-be-argv' } })
    expect(client.isConnected).toBe(true)

    expect(spawnCalls).toHaveLength(1)
    expect(spawnCalls[0].command).toBe('hermes')
    expect(spawnCalls[0].args).toEqual(['gateway'])
    // The rule inherited from mcp-client.ts: argv is world-readable via `ps`.
    expect(JSON.stringify(spawnCalls[0].args)).not.toContain('sk-should-not-be-argv')
    expect(spawnCalls[0].env.HERMES_API_KEY).toBe('sk-should-not-be-argv')
  })

  it('performs the measured handshake and reports what the build enforces', async () => {
    const { client, fake } = await connectedClient()
    const handshake = client.handshake!

    // The client announces itself, then asks what the build enforces, then pings.
    const sent = fake.sent()
    expect(sent[0].method).toBe('client.capabilities')
    expect(sent[0].params).toEqual({ server_requests: true })
    expect(sent[1].method).toBe('gateway.capabilities')
    expect(sent[2].method).toBe('ping')

    expect(handshake.gatewayCapabilities).toEqual({ perSessionExclusiveSubmit: true })
    expect(handshake.serverRequestMethods).toEqual(['clarify', 'approval.request'])
    // Unwrapped payload, not the envelope's params: `gateway.ready`'s own shape.
    expect(handshake.gatewayReady).toEqual(READY_PAYLOAD)
  })

  it('refuses to connect twice', async () => {
    const { client } = await connectedClient()
    await expect(client.connect()).rejects.toThrow('already connected')
  })

  it('kills nothing and throws when the handshake cannot complete', async () => {
    // `ping` is deliberately absent from the stub: the handshake must fail.
    const { client, fake } = makeClient({ auto: { 'client.capabilities': HANDSHAKE_AUTO['client.capabilities'] } })
    await expect(client.connect()).rejects.toThrow('timed out')
    // A timeout is not a kill: the caller still owns the child it asked for.
    expect(fake.killed).toBe(0)
  })

  it('refuses to connect when ping answers without pong', async () => {
    const { client } = makeClient({
      auto: { ...HANDSHAKE_AUTO, ping: { pong: false } },
    })
    await expect(client.connect()).rejects.toThrow('without pong')
  })

  it('correlates responses by id, whatever order the worker answers in', async () => {
    const { client, fake } = await connectedClient()
    // Manual control from here: the stub will not answer these two.
    fake.auto = {}

    const first = client.request<{ a: number }, Record<string, never>>('session.list', {})
    const second = client.request<{ b: number }, Record<string, never>>('session.status', {})

    // Answer the SECOND request first. Correlation is by id, so both must land.
    fake.emit(JSON.stringify({ jsonrpc: '2.0', id: 5, result: { b: 2 } }))
    fake.emit(JSON.stringify({ jsonrpc: '2.0', id: 4, result: { a: 1 } }))

    await expect(first).resolves.toEqual({ a: 1 })
    await expect(second).resolves.toEqual({ b: 2 })
  })

  it('delivers a streamed turn as ordered, typed events', async () => {
    const { client, fake } = await connectedClient()
    const seen: string[] = []
    const payloads: Array<Record<string, unknown>> = []
    client.on('*', (event) => {
      seen.push(event.method)
      payloads.push(event.params)
    })

    fake.auto = { 'prompt.submit': { status: 'streaming' } }
    await expect(client.submitPrompt('sess-1', 'hello')).resolves.toEqual({ status: 'streaming' })
    // `session_id` is the contract's own field name (SessionParams).
    expect(fake.sent()[3]).toEqual({
      jsonrpc: '2.0',
      id: 4,
      method: 'prompt.submit',
      params: { session_id: 'sess-1', text: 'hello' },
    })

    // The frames a turn really emits, in the order the contract lists them, each
    // in the envelope `_event_frame` produces. (`gateway.ready` already arrived
    // during the handshake — a listener cannot retroactively see it, which is
    // the client's honest behaviour.)
    fake.emitFrames(
      eventFrame('message.start', null),
      eventFrame('message.delta', { text: 'Hel' }),
      eventFrame('message.delta', { text: 'lo' }),
      eventFrame('message.complete', { text: 'Hello', usage: { total_tokens: 2 } }),
    )

    expect(seen).toEqual(['message.start', 'message.delta', 'message.delta', 'message.complete'])
    // `message.start` carries no payload, so its params are `{}` — not the envelope's own
    // `{type, session_id}`, which is metadata, not payload.
    expect(payloads[0]).toEqual({})
    expect(payloads[1]).toEqual({ text: 'Hel' })
    expect(payloads[3]).toEqual({ text: 'Hello', usage: { total_tokens: 2 } })
  })

  it('unwraps the event envelope: a `message.delta` listener fires on an `event` frame', async () => {
    // The regression test for the defect a hostile critic found: every Hermes
    // notification arrives as `method: "event"` with the real name in
    // `params.type`. Dispatching on the frame's own method would deliver these
    // to a listener for the literal string "event" and to nobody else.
    const { client, fake } = await connectedClient()
    const deltas: string[] = []
    client.on('message.delta', (event) => deltas.push(String(event.params.text)))

    fake.emit(JSON.stringify(eventFrame('message.delta', { text: 'wrapped' })))
    fake.emit(JSON.stringify(eventFrame('message.complete', { text: 'done' })))

    expect(deltas).toEqual(['wrapped'])
  })

  it('still dispatches a BARE notification, so a changed wire shape is not silently dropped', async () => {
    const { client, fake } = await connectedClient()
    const seen: string[] = []
    client.on('*', (event) => seen.push(event.method))

    // Not an envelope: the tolerant path. A gateway build that stopped wrapping
    // would still be heard rather than going quiet.
    fake.emit(JSON.stringify({ jsonrpc: '2.0', method: 'message.delta', params: { text: 'bare' } }))

    expect(seen).toEqual(['message.delta'])
  })

  it('a listener registered before gateway.ready sees it, and its payload is intact', async () => {
    const made = makeClient()
    const connected = made.client.connect()
    const seen: Array<Record<string, unknown>> = []
    made.client.on('gateway.ready', (event) => seen.push(event.params))
    await new Promise((resolve) => setImmediate(resolve))
    made.fake.emit(JSON.stringify(eventFrame('gateway.ready', READY_PAYLOAD, null)))
    await connected

    expect(seen).toEqual([READY_PAYLOAD])
    expect(made.client.handshake!.gatewayReady).toEqual(READY_PAYLOAD)
  })

  it('reassembles a frame split across chunks', async () => {
    const { client, fake } = await connectedClient()
    const deltas: string[] = []
    client.on('message.delta', (event) => deltas.push(String(event.params.text)))

    // The transport is newline-delimited, so a partial line is buffered. A
    // reader that treated each chunk as a whole frame would lose this turn.
    const whole = JSON.stringify(eventFrame('message.delta', { text: 'split' }))
    fake.emitRaw(whole.slice(0, 24))
    fake.emitRaw(whole.slice(24))
    fake.emitRaw('\n')

    expect(deltas).toEqual(['split'])
  })

  it('accepts a CRLF-terminated frame', async () => {
    const { client, fake } = await connectedClient()
    const deltas: string[] = []
    client.on('message.delta', (event) => deltas.push(String(event.params.text)))

    fake.emitRaw(`${JSON.stringify(eventFrame('message.delta', { text: 'crlf' }))}\r\n`)

    expect(deltas).toEqual(['crlf'])
  })

  it('a malformed frame is logged and the reader keeps going (the gate)', async () => {
    const { client, fake } = await connectedClient()
    const deltas: string[] = []
    client.on('message.delta', (event) => deltas.push(String(event.params.text)))

    fake.emit(JSON.stringify(eventFrame('message.delta', { text: 'before' })))
    // Three bad frames: not JSON, JSON but not an object, and an empty line.
    fake.emit('not json at all\n')
    fake.emit('[1,2,3]\n')
    fake.emit('\n')
    fake.emit(JSON.stringify(eventFrame('message.delta', { text: 'after' })))

    expect(deltas).toEqual(['before', 'after'])
  })

  it('answers an unhandled server→client request with -32601 instead of hanging it', async () => {
    const { client, fake } = await connectedClient()
    fake.auto = {}

    // Hermes asks US something (an approval). Nothing is registered for it, so
    // the client must decline it — a turn left waiting here never ends.
    fake.emit(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'approval.request', params: { what: 'delete' } }))

    const replies = fake.sent()
    expect(replies[replies.length - 1]).toEqual({
      jsonrpc: '2.0',
      id: 99,
      error: { code: -32601, message: 'unhandled server request: approval.request' },
    })
  })

  it('routes a registered server→client request to its handler', async () => {
    const { client, fake } = await connectedClient()
    fake.auto = {}

    const answered: unknown[] = []
    client.onServerRequest('clarify', (params) => {
      answered.push(params)
      return { answer: 'yes' }
    })

    fake.emit(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'clarify', params: { q: 'proceed?' } }))

    const replies = fake.sent()
    expect(answered).toEqual([{ q: 'proceed?' }])
    expect(replies[replies.length - 1]).toEqual({ jsonrpc: '2.0', id: 7, result: { answer: 'yes' } })
  })

  it('cancels a turn through session.interrupt and kills the child on stop', async () => {
    const { client, fake } = await connectedClient()
    fake.auto = { 'session.interrupt': { ok: true }, 'process.stop': {} }

    await expect(client.interruptSession('sess-1')).resolves.toEqual({ ok: true })
    expect(fake.sent()[3]).toEqual({
      jsonrpc: '2.0',
      id: 4,
      method: 'session.interrupt',
      params: { session_id: 'sess-1' },
    })

    await client.stop()
    expect(fake.killed).toBe(1)
  })

  it('steers a turn in flight', async () => {
    const { client, fake } = await connectedClient()
    fake.auto = { 'session.steer': { status: 'steered' } }

    await expect(client.steerSession('sess-1', 'actually, only the totals')).resolves.toEqual({
      status: 'steered',
    })
    expect(fake.sent()[3]).toEqual({
      jsonrpc: '2.0',
      id: 4,
      method: 'session.steer',
      params: { session_id: 'sess-1', text: 'actually, only the totals' },
    })
  })

  it('stop() kills the child even when process.stop is not answered', async () => {
    const { client, fake } = await connectedClient()
    fake.auto = {}
    await client.stop()
    expect(fake.killed).toBe(1)
  })

  it('rejects in-flight requests when the worker exits, and reports the exit', async () => {
    const { client, fake } = await connectedClient({ requestTimeoutMs: 5_000 })
    fake.auto = {}

    const exits: Array<number | null> = []
    client.onExit((code) => exits.push(code))

    const inflight = client.request('session.list', {})
    fake.emitExit(3)

    await expect(inflight).rejects.toThrow('exited (code 3)')
    expect(exits).toEqual([3])
  })

  it('a response for an abandoned request is dropped, not thrown', async () => {
    const { client, fake } = await connectedClient({ requestTimeoutMs: 30 })
    fake.auto = {}

    await expect(client.request('session.list', {})).rejects.toThrow('timed out')

    // The worker answers late. Nothing should explode.
    expect(() => fake.emit(JSON.stringify({ jsonrpc: '2.0', id: 4, result: { late: true } }))).not.toThrow()
  })

  it('refuses to send before connecting', async () => {
    const { client } = makeClient()
    await expect(client.request('ping', {})).rejects.toThrow('not connected')
  })
})
