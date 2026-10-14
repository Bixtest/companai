/**
 * Shared fakes for the Hermes client suites — `P2-8`.
 *
 * NOT a test suite (it does not match `*.test.ts`): this is the fake of the
 * worker's ws door (`docker/hermes/ws_host.py`, measured live 2026-10-14)
 * that both the transport suite and the client suite dial, so the two suites
 * cannot drift apart on what the door does.
 *
 * The door's two legs, as measured:
 *   · the mint leg answers one FRESH single-use ticket per call (`?ticket=`
 *     on the upgrade, 30s TTL in the pin);
 *   · the upgrade can accept, refuse (the pin refuses at the HTTP layer, so
 *     the client sees a failed dial), or never open (the per-socket timeout).
 *
 * It also carries the auto-answering core the client suite needs: a
 * per-method reply table, exactly like the stdio fake, so the same wire
 * assertions run through either transport.
 */

import { createWebSocketTransport, type HermesGatewayTransport, type WebSocketLike } from '../hermes-gateway-transport'

/** What the door answers for a method: a value, or a function of the params. */
export type Responder = unknown | ((params: Record<string, unknown>) => unknown)

export class FakeHermesDoor implements WebSocketLike {
  /** Every URL the transport dialed, ticket included. */
  readonly dialedUrls: string[] = []
  /** Every ticket the mint leg issued, in order. */
  readonly mintedTickets: string[] = []
  /** Frames the transport sent, one per ws message (no newline on this wire). */
  readonly framesSent: string[] = []
  closes = 0

  /** method → what to reply with. Omit a method to make it time out. */
  auto: Record<string, Responder> = {}
  /** Set to send a raw string instead of a JSON response (for error frames). */
  autoRaw: ((method: string, id: number | string) => string | null) | null = null

  private refusalsLeft = 0
  private neverOpens = false

  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  readonly readyState = 1

  refuseNextUpgrades(count: number): void {
    this.refusalsLeft = count
  }

  neverOpen(): void {
    this.neverOpens = true
  }

  /** The mint leg: one fresh single-use ticket per call. */
  async mint(): Promise<{ ticket: string; ttl_seconds: number }> {
    const ticket = `ticket-${this.mintedTickets.length + 1}`
    this.mintedTickets.push(ticket)
    return { ticket, ttl_seconds: 30 }
  }

  /**
   * The upgrade: `openSocket`'s return value.
   *
   * The real transport assigns its handlers synchronously after this call,
   * so the door's answer is scheduled on the microtask queue, never sent
   * synchronously — otherwise `waitForOpen` would miss it.
   */
  open(url: string): WebSocketLike {
    this.dialedUrls.push(url)
    if (this.neverOpens) return this
    const refuse = this.refusalsLeft > 0
    if (refuse) this.refusalsLeft -= 1
    queueMicrotask(() => {
      if (refuse) {
        // Measured on the real door (node 24): an upgrade the server refuses
        // with an HTTP status surfaces as `onerror` FIRST, then `onclose`
        // with code 1006 — e.g. `event order on a 403 upgrade refusal:
        // onerror -> onclose:1006`. Firing only `onclose` made the transport
        // report "the upgrade was refused", a message production never sees.
        this.onerror?.(new Event('error'))
        this.onclose?.({ code: 1006, reason: 'refused' })
      } else {
        this.onopen?.({})
      }
    })
    return this
  }

  /** One frame out on the ws wire. */
  send(data: string): void {
    this.framesSent.push(data)
    this.maybeAnswer(data)
  }

  /** The JSON-RPC objects this client sent, parsed back out of its frames. */
  sent(): Array<Record<string, unknown>> {
    return this.framesSent
      .flatMap((frame) => frame.split('\n'))
      .filter(Boolean)
      .map((frame) => JSON.parse(frame) as Record<string, unknown>)
  }

  /** Push one frame the way the door writes it: a ws text frame. */
  deliver(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }

  /** Push a RAW string as one ws message (what the client suites' emit maps to). */
  deliverRaw(text: string): void {
    this.onmessage?.({ data: text })
  }

  /** Several frames in ONE text frame — the defensive split path. */
  deliverBatch(...frames: unknown[]): void {
    this.onmessage?.({ data: frames.map((f) => JSON.stringify(f)).join('\n') })
  }

  /** The peer dies: the socket closes with a code. */
  die(code: number, reason = ''): void {
    this.onclose?.({ code, reason })
  }

  close(): void {
    this.closes += 1
  }

  private maybeAnswer(frame: string): void {
    const request = JSON.parse(frame) as Record<string, unknown>
    if (typeof request.method !== 'string') return
    const id = request.id as number | string
    if (this.autoRaw) {
      const raw = this.autoRaw(request.method, id)
      if (raw !== null) {
        this.deliver(raw)
        return
      }
    }
    const responder = this.auto[request.method]
    if (responder === undefined) return
    const params = (request.params as Record<string, unknown>) ?? {}
    const result = typeof responder === 'function' ? (responder as (p: Record<string, unknown>) => unknown)(params) : responder
    this.deliver({ jsonrpc: '2.0', id, result })
  }
}

/**
 * A dial harness both suites use: the REAL transport factory over the fake
 * door — no real waiting (the injected sleep records), no real socket.
 */
export function makeDoorDial(
  door: FakeHermesDoor,
  overrides: {
    url?: string
    attempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    socketTimeoutMs?: number
    /** Override the mint leg (the 401/403 fail-fast case). */
    fetchTicket?: () => Promise<{ ticket: string; ttl_seconds: number }>
  } = {},
): { door: FakeHermesDoor; slept: number[]; dial: () => Promise<HermesGatewayTransport> } {
  const slept: number[] = []
  return {
    door,
    slept,
    dial: () =>
      createWebSocketTransport({
        url: overrides.url ?? 'http://hermes-gateway:8091',
        fetchTicket: overrides.fetchTicket ?? (() => door.mint()),
        openSocket: (url) => door.open(url),
        sleep: async (ms: number) => {
          slept.push(ms)
        },
        random: () => 0.5,
        attempts: overrides.attempts,
        baseDelayMs: overrides.baseDelayMs,
        maxDelayMs: overrides.maxDelayMs,
        socketTimeoutMs: overrides.socketTimeoutMs,
      }),
  }
}

