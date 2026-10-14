/**
 * The Hermes gateway client's TRANSPORT SEAM — PLAN-HERMES-PHASE2 sub-row P2-8.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SEAM
 * ─────────────────────────────────────────────────────────────────────────────
 * The pinned worker speaks ONE protocol — newline-delimited JSON-RPC — over
 * two transports (`tui_gateway/ws.py`'s own header: *"Wire protocol is
 * identical to stdio"*). For years this platform reached it the only way it
 * could: spawn the worker and own its pipes. `P2-7` proved a live turn over
 * that pipe; `P2-8` opens the door production needs — the app container has
 * neither a Python runtime nor the Docker socket, so it CONNECTS the running
 * worker over the Docker network by URL instead (measured, §2.14).
 *
 * The wire, the handshake, the id-correlation and the event dispatch are
 * IDENTICAL in both cases; only the framing changes (a trailing newline on a
 * pipe vs one WebSocket text frame). This module is that seam: the client
 * class speaks to a `HermesGatewayTransport`, and two implementations exist
 * — the extracted stdio transport (the proven one) and the WebSocket one.
 * No test needs a Python runtime or Docker for either.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE WEB SOCKET TRANSPORT AND ITS RECONNECT POLICY (documented, P2-8)
 * ─────────────────────────────────────────────────────────────────────────────
 * Each dial performs the door's two legs end to end (the worker's
 * `ws_host.py`, measured live 2026-10-14):
 *   1. **Mint** — `POST {url}/internal/ws-ticket` with the shared secret in
 *      the `Authorization` header (never on a URL). The answer is a
 *      **single-use 30-second ticket**.
 *   2. **Upgrade** — `ws://{host}/api/ws?ticket=…`. The door's pre-accept
 *      check consumes the ticket; a bad one refuses the upgrade at the HTTP
 *      layer (measured: **403**), so the client sees a failed dial.
 * The ticket is minted FRESH for every dial — a retry after a refused or
 * expired upgrade gets a new one.
 *
 * The dial itself is retried with bounded exponential backoff
 * (1s ×2 → 16s cap, ±25% jitter, 5 attempts, 10s per socket) because a
 * worker that is still booting must be survivable by a supervised service.
 * A mint leg answered **401/403 fails immediately** — the shared secret is
 * wrong, and retrying a wrong secret forever is a hang, not a retry.
 *
 * **The run-time half of the policy is connect-once, by named bound:** one
 * client = one connection = one run (the port is resolved per chat run). A
 * socket that dies MID-RUN ends that run — the port's own error event
 * carries the close code — and the NEXT run dials afresh. A mid-run
 * `session.resume` is deliberately NOT built here: sessions live in the
 * worker, and silently resuming a different session would continue a turn
 * that is not the one in flight. That is a correctness hole for a later row,
 * not a reconnect feature for this one.
 */

import { createLogger } from '@open-mercato/shared/lib/logger'
import type { HermesGatewayProcess } from './hermes-gateway-client'

const logger = createLogger('ai_assistant').child({ component: 'hermes-gateway-transport' })

/** Why a transport went away. Delivered to the client's exit subscribers. */
export interface HermesTransportCloseInfo {
  /** The process exit code (stdio) or the WebSocket close code; null when unknown. */
  code: number | null
  /** A human-readable reason, for logs and the run's error event. */
  reason: string
}

/**
 * What the client class needs from a transport.
 *
 * The framing lives HERE, not in the client: `send` receives one serialized
 * JSON-RPC frame and each implementation puts it on its own wire (a newline
 * on a pipe, one text frame on a socket). That is the whole difference
 * between the two transports — which is the point of the seam.
 */
export interface HermesGatewayTransport {
  /** Write one serialized frame. Throws synchronously when the peer is gone. */
  send(frame: string): void
  /** Subscribe to inbound lines (frames). Returns an unsubscribe function. */
  onLine(listener: (line: string) => void): () => void
  /** Subscribe to the transport's death (exit, EOF, socket close). Returns an unsubscribe. */
  onClose(listener: (info: HermesTransportCloseInfo) => void): () => void
  /** Tear the transport down. Safe to call twice. */
  close(): Promise<void>
  /**
   * True when this transport owns a worker PROCESS (a spawned child): `stop`
   * then asks the worker to retire (`process.stop`) before killing it. False
   * for the shared ws door — closing our socket must never retire the worker
   * other clients are still using.
   */
  readonly ownsWorkerProcess: boolean
}

/**
 * Split a chunk into complete lines.
 *
 * Identical to the stdio path, and defensive on the ws side by design: the
 * measured server sends ONE frame per `send_text` (`tui_gateway/ws.py`'s
 * `_safe_send_many`), but a batch that ever landed in one text frame must
 * still be read as several frames rather than lost.
 */
function lineSplitter(onLine: (line: string) => void): (chunk: Buffer | string) => void {
  let buffer = ''
  return (chunk: Buffer | string) => {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    let index = buffer.indexOf('\n')
    while (index !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, '').trim()
      buffer = buffer.slice(index + 1)
      if (line) onLine(line)
      index = buffer.indexOf('\n')
    }
  }
}

/**
 * The stdio transport — the client's original wire, extracted unchanged.
 *
 * The behaviour it carries (measured in `P2-2`) stays exactly where it was:
 * a line on stdout IS a frame; a bad line never kills the stream (the client
 * logs and continues); stdout `end` and process `exit`/`error` are deaths —
 * with the pre-seam ordering preserved: the process exit carries the exit
 * code, so an EOF death yields to it rather than reporting `code null`
 * (critic `P2-8`-D1; the pipe's `end` and the child's `exit` race).
 */
export function createStdioTransport(process: HermesGatewayProcess): HermesGatewayTransport {
  const lineListeners = new Set<(line: string) => void>()
  const closeListeners = new Set<(info: HermesTransportCloseInfo) => void>()
  let closed = false
  let endTimer: ReturnType<typeof setTimeout> | null = null

  const finish = (info: HermesTransportCloseInfo): void => {
    if (closed) return
    closed = true
    if (endTimer !== null) {
      clearTimeout(endTimer)
      endTimer = null
    }
    for (const listener of closeListeners) listener(info)
  }

  process.stdout.on('data', lineSplitter((line) => {
    if (!closed) for (const listener of lineListeners) listener(line)
  }))
  // A pipe's EOF and the child's `exit` are two libuv callbacks with NO
  // ordering guarantee. The process exit is the better report — it carries the
  // worker's exit CODE — and the pre-seam client was order-independent because
  // only its `on('exit')` fired the exit subscribers. So an EOF death waits one
  // macrotask for the exit to land, and stands on its own if none arrives (a
  // pipe can close on a process that has not been reaped yet).
  process.stdout.on('end', () => {
    if (closed) return
    endTimer = setTimeout(() => {
      endTimer = null
      finish({ code: null, reason: 'the worker closed its stdout' })
    }, 0)
  })
  process.stderr?.on('data', (chunk) => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    logger.debug('hermes gateway stderr', { stderr: text.trim() })
  })
  // A real stream surfaces a dead peer as an async 'error'; without a
  // listener that is an uncaught exception.
  process.stdin.on?.('error', (error: unknown) => {
    logger.debug('hermes gateway stdin error', {
      err: error instanceof Error ? error.message : String(error),
    })
    finish({ code: null, reason: `stdin error: ${error instanceof Error ? error.message : String(error)}` })
  })
  process.on('exit', (code: unknown) => {
    finish({ code: typeof code === 'number' ? code : null, reason: `the worker exited (code ${String(code)})` })
  })
  process.on('error', (error: unknown) => {
    finish({ code: null, reason: `worker error: ${error instanceof Error ? error.message : String(error)}` })
  })

  return {
    send(frame: string): void {
      // One write per frame, flushed by the transport per its own contract. A
      // write to a dead pipe throws SYNCHRONOUSLY (EPIPE), and this method
      // lets it: the client's request path is the only thing that can turn
      // that into a rejection instead of an uncaught throw.
      process.stdin.write(frame + '\n')
    },
    onLine(listener) {
      lineListeners.add(listener)
      return () => lineListeners.delete(listener)
    },
    onClose(listener) {
      closeListeners.add(listener)
      return () => closeListeners.delete(listener)
    },
    async close(): Promise<void> {
      finish({ code: null, reason: 'the client closed the transport' })
      process.kill()
    },
    ownsWorkerProcess: true,
  }
}

/**
 * The WebSocket surface the transport needs — a structural subset of the
 * WHATWG `WebSocket` the global runtime provides (measured: the app
 * container runs node v24.21.0, where `globalThis.WebSocket` exists). Tests
 * implement the same shape by hand, so no test touches a socket.
 */
export interface WebSocketLike {
  send(data: string): void
  close(code?: number, reason?: string): void
  readonly readyState: number
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((event: unknown) => void) | null
}

/** An error the ticket leg can carry, so the dial loop can fail fast on it. */
export class HermesTicketError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'HermesTicketError'
    this.status = status
  }
}

/** One ticket as the worker's mint leg answers it. */
export interface HermesTicket {
  ticket: string
  ttl_seconds: number
}

/**
 * The mint leg: `POST {baseUrl}/internal/ws-ticket` with the shared secret
 * in the Authorization header.
 *
 * The secret never travels on a URL (a URL is logged by proxies, stored in
 * browser history, and readable in a process table). A non-2xx answer
 * becomes a `HermesTicketError` carrying the status, so the dial loop can
 * refuse to retry a deterministic auth failure.
 */
export async function fetchHermesTicket(options: {
  baseUrl: string
  token: string
  fetchImpl?: typeof fetch
}): Promise<HermesTicket> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = `${options.baseUrl.replace(/\/+$/, '')}/internal/ws-ticket`
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${options.token}` },
  })
  if (!response.ok) {
    throw new HermesTicketError(`the hermes ws mint leg answered ${response.status}`, response.status)
  }
  const body = (await response.json()) as Partial<HermesTicket> | null
  if (!body || typeof body.ticket !== 'string' || body.ticket === '') {
    throw new HermesTicketError('the hermes ws mint leg answered without a ticket', null)
  }
  return { ticket: body.ticket, ttl_seconds: typeof body.ttl_seconds === 'number' ? body.ttl_seconds : 0 }
}

/** `http://host:port` → `ws://host:port`. */
function toWebSocketBaseUrl(url: string): string {
  return url.replace(/^http/, 'ws').replace(/\/+$/, '')
}

/** Per-attempt backoff: `base * 2^(attempt-1)` capped at `max`, ±25% jitter. */
function backoffDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number, random: () => number): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
  const jitter = exponential * 0.25 * (random() * 2 - 1)
  return Math.max(0, Math.round(exponential + jitter))
}

export interface WebSocketTransportOptions {
  /** The door's base URL, e.g. `http://hermes-gateway:8091`. */
  url: string
  /** Mint the single-use ticket for this dial — called once per attempt. */
  fetchTicket: () => Promise<HermesTicket>
  /** Dial attempts (mint + upgrade together). Default 5. */
  attempts?: number
  /** First backoff delay. Default 1_000. */
  baseDelayMs?: number
  /** Backoff cap. Default 16_000. */
  maxDelayMs?: number
  /** Max wait for one socket to open. Default 10_000. */
  socketTimeoutMs?: number
  /** Injectable socket factory, for tests. Defaults to the global WebSocket. */
  openSocket?: (url: string) => WebSocketLike
  /** Injectable sleep, for tests. */
  sleep?: (ms: number) => Promise<void>
  /** Injectable jitter source, for tests. */
  random?: () => number
}

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BASE_DELAY_MS = 1_000
const DEFAULT_MAX_DELAY_MS = 16_000
const DEFAULT_SOCKET_TIMEOUT_MS = 10_000

/**
 * Dial the worker's ws door and return a live transport.
 *
 * Resolves only with a socket that OPENED (upgrade accepted); every attempt
 * failure is retried unless the mint leg answered 401/403 (a wrong shared
 * secret is deterministic — see the module header). After the last attempt
 * the last error is thrown: the client's `connect()` rejects and the caller
 * still owns the decision to retry the whole run.
 */
export async function createWebSocketTransport(options: WebSocketTransportOptions): Promise<HermesGatewayTransport> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  const socketTimeoutMs = options.socketTimeoutMs ?? DEFAULT_SOCKET_TIMEOUT_MS
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const random = options.random ?? Math.random
  const openSocket =
    options.openSocket ??
    ((url: string) => new globalThis.WebSocket(url) as unknown as WebSocketLike)

  let lastError: Error = new Error('the hermes ws dial never ran')
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let socket: WebSocketLike | null = null
    try {
      // 1. Mint — fresh per attempt: a refused or expired upgrade gets a new
      //    ticket, which is exactly what the pin's single-use ticket wants.
      const { ticket } = await options.fetchTicket()
      // 2. Upgrade.
      const wsUrl = `${toWebSocketBaseUrl(options.url)}/api/ws?ticket=${encodeURIComponent(ticket)}`
      socket = openSocket(wsUrl)
      await waitForOpen(socket, socketTimeoutMs)
      return liveTransport(socket)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // A mint leg answered 401/403: the shared secret is wrong (or the door
      // refuses us). Retrying that forever is a hang, not a retry.
      if (error instanceof HermesTicketError && (error.status === 401 || error.status === 403)) {
        throw error
      }
      logger.debug('hermes ws dial attempt failed', { attempt, attempts, err: lastError.message })
      socket?.close()
      if (attempt < attempts) {
        await sleep(backoffDelayMs(attempt, baseDelayMs, maxDelayMs, random))
      }
    }
  }
  throw new Error(
    `the hermes ws door could not be reached after ${attempts} attempts (${lastError.message})`,
  )
}

/** Resolve when the socket opens; reject on error, close, or the per-socket timeout. */
function waitForOpen(socket: WebSocketLike, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error(`the hermes ws socket did not open within ${timeoutMs}ms`))
    }, timeoutMs)
    const settle = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      action()
    }
    socket.onopen = () => settle(() => resolve())
    socket.onerror = () => settle(() => reject(new Error('the hermes ws socket failed to open')))
    socket.onclose = (event) =>
      settle(() =>
        reject(
          new Error(
            `the hermes ws upgrade was refused (code ${event.code}${event.reason ? `, ${event.reason}` : ''})`,
          ),
        ),
      )
  })
}

/** Wrap an OPEN socket as the live transport: framing in, frames out. */
function liveTransport(socket: WebSocketLike): HermesGatewayTransport {
  const lineListeners = new Set<(line: string) => void>()
  const closeListeners = new Set<(info: HermesTransportCloseInfo) => void>()
  let closed = false

  const finish = (info: HermesTransportCloseInfo): void => {
    if (closed) return
    closed = true
    for (const listener of closeListeners) listener(info)
  }

  socket.onmessage = (event: { data: unknown }) => {
    const data = typeof event.data === 'string' ? event.data : String(event.data)
    for (const line of splitLines(data)) {
      if (line) for (const listener of lineListeners) listener(line)
    }
  }
  socket.onclose = (event: { code: number; reason: string }) => {
    finish({ code: typeof event.code === 'number' ? event.code : null, reason: event.reason || 'the ws socket closed' })
  }
  socket.onerror = () => {
    logger.debug('hermes ws socket error; the close that follows ends the transport')
  }

  return {
    send(frame: string): void {
      if (closed) throw new Error('the hermes ws transport is closed')
      socket.send(frame)
    },
    onLine(listener) {
      lineListeners.add(listener)
      return () => lineListeners.delete(listener)
    },
    onClose(listener) {
      closeListeners.add(listener)
      return () => closeListeners.delete(listener)
    },
    async close(): Promise<void> {
      // Mark before closing: our own close must NOT reach the exit
      // subscribers as a peer death.
      closed = true
      try {
        socket.close(1000, 'client stop')
      } catch (error) {
        logger.debug('hermes ws close threw; the socket was already gone', {
          err: error instanceof Error ? error.message : String(error),
        })
      }
    },
    ownsWorkerProcess: false,
  }
}

/** Split one ws message into frames — defensive; the server sends one frame per message. */
function splitLines(chunk: string): string[] {
  return chunk.split('\n').map((line) => line.replace(/\r$/, '').trim())
}
