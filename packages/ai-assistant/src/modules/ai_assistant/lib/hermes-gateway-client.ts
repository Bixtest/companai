/**
 * The Hermes TUI-gateway client — PLAN-HERMES-PHASE2 sub-row P2-2.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * Hermes §9 Phase 2 is *"a single Hermes worker, one provider, one narrow tool"*.
 * The pinned source (`HERMES-PIN.md`, revision `3569e846…`) exposes **258 typed
 * JSON-RPC methods** over a **stdio** transport; this file is the client for that
 * surface, and it is the foundation the Hermes port adapter (P2-3) stacks on.
 *
 * Nothing here knows about the port (`AiRuntimePort`). This is deliberately a
 * transport-and-protocol layer: it can be tested against a stub that implements
 * the measured contract, without a Python runtime, without Docker.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT the wire actually is — measured, not assumed
 * ─────────────────────────────────────────────────────────────────────────────
 * **Framing** (`tui_gateway/transport.py::StdioTransport.write`):
 * `serialize_frame(obj, "stdio") + "\n"` then `flush()` — one JSON object per
 * line, newline-delimited, on both directions. stdout is reserved for these
 * frames (`server.py` sends stray prints to stderr), so a line on stdout IS a
 * frame.
 *
 * **The event envelope** (`server.py::_event_frame`, used by every emitter, and
 * by `entry.py` for `gateway.ready`): a notification is NOT a bare
 * `{method: 'message.delta'}`. It is
 *
 *     {"jsonrpc": "2.0", "method": "event",
 *      "params": {"type": "message.delta", "session_id": "…", "payload": {…}}}
 *
 * so the event's *name* is `params.type` and its payload is `params.payload`.
 * Dispatching on `frame.method` would deliver everything to a listener for the
 * literal string `"event"` and leave `gateway.ready` unmatchable — which is
 * exactly the defect this client's first draft had, caught by its own tests plus
 * a hostile critic. The unwrapping below is therefore not defensive style: it is
 * the protocol.
 *
 * **Field names are snake_case.** The contracts are Python pydantic models
 * (`tui_gateway/contracts/*.py`), so `server_requests`,
 * `per_session_exclusive_submit` and `session_id` are the literal wire keys — a
 * camelCase read compiles fine and returns `undefined` at runtime.
 *
 * Three frame kinds come back, and they must be told apart (`rpc_dispatch.py`):
 *   1. a **response** — has `id` and either `result` or `error`;
 *   2. a **notification** — has `method` and `params`, **no `id``: an event;
 *   3. a **server→client request** — has `method` AND `id`: Hermes is asking US
 *      something (clarify, approval, sudo …). `client.capabilities` returns the
 *      list it may send. Leaving one unanswered would hang a turn, so an
 *      unhandled one is answered `-32601` (the contract's own instruction).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS NOT
 * ─────────────────────────────────────────────────────────────────────────────
 * It is not the port adapter, not the worker, and not the narrow tool. It does
 * not choose a model, hold a credential, or perform authorization — a secret is
 * handed to the worker through the **environment**, never argv (argv is readable
 * by any local user via `ps`), following `mcp-client.ts`'s own rule.
 */

import { createLogger } from '@open-mercato/shared/lib/logger'
import { spawn as defaultSpawn } from 'child_process'

const logger = createLogger('ai_assistant').child({ component: 'hermes-gateway-client' })

/** JSON-RPC 2.0 codes this client uses and needs to recognise. */
const RPC_METHOD_NOT_FOUND = -32601
const RPC_PARSE_ERROR = -32700
const RPC_INTERNAL_ERROR = -32603

/**
 * The subset of a spawned process this client needs.
 *
 * Declared (rather than taking `ChildProcess`) so tests can inject a fake and
 * no test needs a Python runtime: what is under test is the wire, not `spawn`.
 */
export interface HermesGatewayProcess {
  stdin: {
    write(chunk: string): unknown
    end(): unknown
    /** Optional: a real stream can error after the peer dies (EPIPE). */
    on?(event: 'error', listener: (error: unknown) => void): unknown
  }
  stdout: {
    on(event: 'data', listener: (chunk: Buffer | string) => void): unknown
    on(event: 'end', listener: () => void): unknown
  }
  stderr?: { on(event: 'data', listener: (chunk: Buffer | string) => void): unknown }
  kill(signal?: NodeJS.Signals): void
  readonly pid?: number
  on(event: 'exit' | 'error', listener: (...args: unknown[]) => void): unknown
}

/** How the client starts the worker. Injectable for tests. */
export type HermesGatewaySpawn = (
  command: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; stdio: ['pipe', 'pipe', 'pipe'] },
) => HermesGatewayProcess

export interface HermesGatewayClientOptions {
  /** The worker command (e.g. `hermes` or `python -m tui_gateway`). */
  command: string
  /** argv for the command. **Never put a secret here** — use `env`. */
  args?: string[]
  /**
   * Extra environment for the worker. Secrets live HERE, not on argv, because
   * argv is world-readable. Merged over `process.env`.
   */
  env?: Record<string, string>
  /** Milliseconds before an unanswered request rejects. Default 30_000. */
  requestTimeoutMs?: number
  /** Injectable spawn, for tests. Defaults to `child_process.spawn`. */
  spawn?: HermesGatewaySpawn
}

/** The handshake facts a caller needs before it sends a turn. */
export interface HermesGatewayHandshake {
  /** `gateway.capabilities` → what THIS build enforces. */
  gatewayCapabilities: { perSessionExclusiveSubmit: boolean }
  /** `client.capabilities` → the server→client methods this backend may send. */
  serverRequestMethods: string[]
  /** `gateway.ready` → the first frame the transport emits, or null if it never came. */
  gatewayReady: Record<string, unknown> | null
}

/** One event frame from the gateway, already unwrapped for the caller. */
export interface HermesGatewayEvent {
  /** The event's own name (`params.type`), e.g. `message.delta`. */
  method: string
  /** The event's payload — `params.payload` from the envelope, its own `params` from a bare
   * notification, or `{}` when the event carries none (`message.start`). */
  params: Record<string, unknown>
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: NodeJS.Timeout
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

/**
 * A stdio JSON-RPC client for one Hermes TUI gateway.
 *
 * The lifecycle is deliberate and matches the pinned transport: `connect()`
 * spawns the worker, performs the handshake, and resolves; `stop()` sends
 * `process.stop` and then kills the child. One client talks to **one** worker.
 */
export class HermesGatewayClient {
  private readonly options: HermesGatewayClientOptions
  private readonly spawn: HermesGatewaySpawn
  private readonly requestTimeoutMs: number
  private readonly listeners = new Map<string, Set<(event: HermesGatewayEvent) => void>>()
  /** Kept apart from `listeners` so a method literally named `*` cannot collide. */
  private readonly wildcardListeners = new Set<(event: HermesGatewayEvent) => void>()
  private readonly pending = new Map<number | string, Pending>()
  private readonly serverRequestHandlers = new Map<string, (params: Record<string, unknown>) => unknown>()

  private process: HermesGatewayProcess | null = null
  private nextId = 1
  private stdoutBuffer = ''
  private closed = false
  private exitHandlers: Array<(code: number | null) => void> = []
  private handshakeResult: HermesGatewayHandshake | null = null

  constructor(options: HermesGatewayClientOptions) {
    this.options = options
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    this.spawn = options.spawn ?? (defaultSpawn as unknown as HermesGatewaySpawn)
  }

  /** True once `connect()` has completed the handshake. */
  get isConnected(): boolean {
    return this.handshakeResult !== null
  }

  /** The handshake facts, once connected. Null before. */
  get handshake(): HermesGatewayHandshake | null {
    return this.handshakeResult
  }

  /**
   * Spawn the worker and complete the handshake.
   *
   * Measured order (`contracts/liveness.py`, `contracts/events.py`): announce
   * what we handle (`client.capabilities`) → ask what the build enforces
   * (`gateway.capabilities`) → cheapest liveness probe (`ping`) → wait for the
   * `gateway.ready` event. A failure at any step leaves **no half-connected
   * client hanging**: the promise rejects and the caller still owns the child
   * (killing it is the caller's decision, so a retry can inspect the exit).
   */
  async connect(): Promise<HermesGatewayHandshake> {
    if (this.process) throw new Error('hermes gateway client is already connected')

    const args = this.options.args ?? []
    this.process = this.spawn(this.options.command, args, {
      env: { ...process.env, ...(this.options.env ?? {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.attachStream(this.process)

    // Announce what we handle. `server_requests: true` is a promise: Hermes may
    // send us clarify/approval requests, and anything we do not handle gets a
    // -32601 immediately (see `handleFrame`) rather than hanging the turn.
    const clientCapabilities = await this.request<
      { server_requests: string[]; declines_not_shown: boolean },
      { server_requests: boolean }
    >('client.capabilities', { server_requests: true })

    const gatewayCapabilities = await this.request<{ per_session_exclusive_submit: boolean }, Record<string, never>>(
      'gateway.capabilities',
      {},
    )

    const pong = await this.request<{ pong: boolean }, Record<string, never>>('ping', {})
    if (!pong.pong) {
      throw new Error('hermes gateway answered ping without pong')
    }

    const ready = await this.waitForEvent('gateway.ready', this.requestTimeoutMs).catch(() => null)

    this.handshakeResult = {
      gatewayCapabilities: { perSessionExclusiveSubmit: gatewayCapabilities.per_session_exclusive_submit },
      serverRequestMethods: clientCapabilities.server_requests,
      gatewayReady: ready,
    }
    return this.handshakeResult
  }

  /** Register a handler for one server→client request method. */
  onServerRequest(method: string, handler: (params: Record<string, unknown>) => unknown): void {
    this.serverRequestHandlers.set(method, handler)
  }

  /**
   * Subscribe to one gateway event (its own name — `message.delta`,
   * `message.complete`, `gateway.ready`, …). Returns an unsubscribe function.
   */
  on(method: string, listener: (event: HermesGatewayEvent) => void): () => void {
    if (method === '*') {
      this.wildcardListeners.add(listener)
      return () => this.wildcardListeners.delete(listener)
    }
    const set = this.listeners.get(method) ?? new Set()
    set.add(listener)
    this.listeners.set(method, set)
    return () => {
      set.delete(listener)
    }
  }

  /**
   * Fires when the worker process exits. Returns an unsubscribe function, so a
   * caller that streams a bounded number of runs on one long-lived client does
   * not accumulate one closure per run.
   */
  onExit(handler: (code: number | null) => void): () => void {
    this.exitHandlers.push(handler)
    return () => {
      const index = this.exitHandlers.indexOf(handler)
      if (index >= 0) this.exitHandlers.splice(index, 1)
    }
  }

  /** One JSON-RPC call, correlated by id, bounded by `requestTimeoutMs`. */
  async request<TResult = unknown, TParams = Record<string, never>>(method: string, params: TParams): Promise<TResult> {
    const process = this.requireProcess()
    const id = this.nextId++
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params })

    return new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`hermes gateway request timed out after ${this.requestTimeoutMs}ms: ${method}`))
      }, this.requestTimeoutMs)
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })
      // One write per frame, flushed by the transport per its own contract. A
      // write to a dead pipe throws SYNCHRONOUSLY (EPIPE), not as a rejection,
      // so this client is the only thing that can stop it taking the caller down.
      try {
        process.stdin.write(payload + '\n')
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /** `prompt.submit` — send one user turn to a live session. */
  async submitPrompt(sessionId: string, text: string, extra: Record<string, unknown> = {}) {
    return this.request<
      { status?: 'streaming' | 'queued' | 'steered' | 'redirected'; user_row_id?: number },
      Record<string, unknown>
    >('prompt.submit', { session_id: sessionId, text, ...extra })
  }

  /** `session.interrupt` — stop the turn running in this session. */
  async interruptSession(sessionId: string) {
    return this.request<Record<string, unknown>, { session_id: string }>('session.interrupt', {
      session_id: sessionId,
    })
  }

  /** `session.steer` — add instruction to a turn in flight. */
  async steerSession(sessionId: string, text: string) {
    return this.request<Record<string, unknown>, { session_id: string; text: string }>('session.steer', {
      session_id: sessionId,
      text,
    })
  }

  /** `process.stop` — ask the worker to retire, then kill the child. */
  async stop(): Promise<void> {
    const process = this.process
    if (!process) return
    this.closed = true
    try {
      await this.request<Record<string, unknown>, Record<string, never>>('process.stop', {})
    } catch (error) {
      // A stop that fails is not a reason to leak the child: log and kill.
      logger.debug('hermes gateway process.stop was not answered; killing the child', {
        err: error instanceof Error ? error.message : String(error),
      })
    } finally {
      // Whatever is in flight has nowhere to go now.
      this.failPending(new Error('hermes gateway client was stopped'))
      process.kill()
      this.teardown()
    }
  }

  // ── internals ────────────────────────────────────────────────────────────

  private requireProcess(): HermesGatewayProcess {
    const process = this.process
    if (!process) throw new Error('hermes gateway client is not connected')
    return process
  }

  private attachStream(process: HermesGatewayProcess): void {
    process.stdout.on('data', (chunk) => {
      this.stdoutBuffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      // Newline-delimited frames: split on \n and keep the trailing partial, so
      // a frame split across two chunks is reassembled rather than lost.
      let index = this.stdoutBuffer.indexOf('\n')
      while (index !== -1) {
        const line = this.stdoutBuffer.slice(0, index).replace(/\r$/, '').trim()
        this.stdoutBuffer = this.stdoutBuffer.slice(index + 1)
        if (line) this.handleFrame(line)
        index = this.stdoutBuffer.indexOf('\n')
      }
    })
    process.stdout.on('end', () => {
      this.closed = true
      this.failPending(new Error('hermes gateway closed its stdout'))
    })
    process.stderr?.on('data', (chunk) => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      logger.debug('hermes gateway stderr', { stderr: text.trim() })
    })
    // A real stream surfaces a dead peer as an async 'error'. Without a listener
    // that is an uncaught exception, so it is attached even though the fake in
    // the suite has no such stream.
    process.stdin.on?.('error', (error: unknown) => {
      logger.debug('hermes gateway stdin error', {
        err: error instanceof Error ? error.message : String(error),
      })
      this.failPending(error instanceof Error ? error : new Error(String(error)))
    })
    process.on('exit', (code: unknown) => {
      this.closed = true
      this.failPending(new Error(`hermes gateway exited (code ${String(code)})`))
      for (const handler of this.exitHandlers) handler(typeof code === 'number' ? code : null)
      this.teardown()
    })
    process.on('error', (error: unknown) => {
      this.closed = true
      this.failPending(error instanceof Error ? error : new Error(String(error)))
    })
  }

  /**
   * One line from the worker. A malformed frame must NOT kill the stream — the
   * gateway writes diagnostics to stderr and keeps going, and so do we.
   */
  private handleFrame(line: string): void {
    let frame: Record<string, unknown>
    try {
      frame = JSON.parse(line) as Record<string, unknown>
      if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
        throw new Error('frame is not an object')
      }
    } catch {
      // P2-2's exit gate names this: a bad line is logged, the reader continues.
      logger.warn('hermes gateway sent a malformed frame; ignoring it', { line: line.slice(0, 512) })
      return
    }

    const hasId = frame.id !== null && frame.id !== undefined
    const rawMethod = typeof frame.method === 'string' ? frame.method : null

    if (hasId && rawMethod) {
      // A server→client REQUEST. Answer it, or decline it — never leave it open.
      void this.answerServerRequest(frame, rawMethod)
      return
    }

    if (hasId) {
      this.settle(frame)
      return
    }

    if (rawMethod) {
      this.dispatchEvent(rawMethod, frame.params)
    }
  }

  /**
   * Deliver a notification to its listeners.
   *
   * The pinned gateway wraps EVERY event in one envelope (`server.py::
   * _event_frame`): `method: "event"`, the event's own name in `params.type`,
   * its payload in `params.payload`. So `message.delta` arrives as a frame whose
   * `method` is the literal string `"event"` — dispatching on `frame.method`
   * would deliver it to nobody. The unwrapping is therefore the primary path.
   *
   * A frame that is NOT enveloped is still dispatched, on its own `method`, so a
   * build that changes the shape does not silently go quiet.
   */
  private dispatchEvent(method: string, params: unknown): void {
    const paramsObject = (params && typeof params === 'object' ? params : {}) as Record<string, unknown>
    let name = method
    let payload = paramsObject
    if (method === 'event') {
      const type = typeof paramsObject.type === 'string' ? paramsObject.type : null
      const inner = paramsObject.payload
      if (type) {
        name = type
        payload = inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : {}
      }
    }
    const event: HermesGatewayEvent = { method: name, params: payload }
    for (const listener of this.listeners.get(name) ?? []) listener(event)
    for (const listener of this.wildcardListeners) listener(event)
  }

  private async answerServerRequest(frame: Record<string, unknown>, method: string): Promise<void> {
    const process = this.requireProcess()
    const id = frame.id as number | string
    const handler = this.serverRequestHandlers.get(method)
    if (!handler) {
      this.writeFrame({
        jsonrpc: '2.0',
        id,
        error: { code: RPC_METHOD_NOT_FOUND, message: `unhandled server request: ${method}` },
      })
      return
    }
    try {
      const result = handler((frame.params as Record<string, unknown>) ?? {})
      this.writeFrame({ jsonrpc: '2.0', id, result: result ?? {} })
    } catch (error) {
      this.writeFrame({
        jsonrpc: '2.0',
        id,
        error: { code: RPC_INTERNAL_ERROR, message: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  /** Write one frame, tolerating a pipe that has already gone away. */
  private writeFrame(frame: Record<string, unknown>): void {
    try {
      this.requireProcess().stdin.write(JSON.stringify(frame) + '\n')
    } catch (error) {
      logger.debug('hermes gateway could not write a frame; the peer is gone', {
        err: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private settle(frame: Record<string, unknown>): void {
    const id = frame.id as number | string
    const pending = this.pending.get(id)
    if (!pending) {
      // A response to something we already gave up on. Not an error worth
      // raising: the request already rejected on its own timeout.
      logger.debug('hermes gateway answered a request this client no longer tracks', { id })
      return
    }
    clearTimeout(pending.timer)
    this.pending.delete(id)
    if (frame.error && typeof frame.error === 'object') {
      const err = frame.error as { code?: number; message?: string }
      pending.reject(
        new Error(`hermes gateway error ${err.code ?? RPC_PARSE_ERROR}: ${err.message ?? 'unknown'}`),
      )
      return
    }
    pending.resolve(frame.result)
  }

  private failPending(error: Error): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }

  private waitForEvent(method: string, timeoutMs: number): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe()
        reject(new Error(`timed out waiting for ${method}`))
      }, timeoutMs)
      const unsubscribe = this.on(method, (event) => {
        clearTimeout(timer)
        unsubscribe()
        resolve(event.params)
      })
    })
  }

  private teardown(): void {
    if (!this.closed) return
    this.process = null
    this.listeners.clear()
    this.wildcardListeners.clear()
    this.serverRequestHandlers.clear()
    this.exitHandlers = []
  }
}
