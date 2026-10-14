/**
 * `P2-8` (§2.14) — the transport seam, proven against fakes of BOTH wires.
 *
 * What is under test is the framing and the lifecycle the pin measures on each
 * transport, never a runtime that is not here (L150 — no socket is opened, no
 * worker is booted):
 *
 *   · the **stdio** transport: the client's original wire, extracted — a line
 *     on stdout IS a frame, a partial line is buffered, a death is a death;
 *   · the **ws** transport: the worker's own door (`docker/hermes/ws_host.py`,
 *     measured live 2026-10-14) — a single-use ticket minted per dial in a
 *     header, the upgrade carrying `?ticket=`, a refused upgrade answered at
 *     the HTTP layer (403), and the dial-retry policy that makes a still-booting
 *     worker survivable.
 *
 * The reconnect policy's run-time half (connect-once; a mid-run death ends the
 * run and the NEXT run dials afresh) is proved by the client suite over this
 * seam; the dial-time half is proved here.
 */

import {
  createStdioTransport,
  createWebSocketTransport,
  fetchHermesTicket,
  HermesTicketError,
  type HermesGatewayTransport,
  type HermesTransportCloseInfo,
} from '../hermes-gateway-transport'
import { FakeHermesDoor, makeDoorDial } from './hermes-test-fakes'

/** A fake spawned worker: just enough process for the stdio transport. */
class FakeHermesProcess {
  readonly written: string[] = []
  killed = 0
  private readonly data: Array<(chunk: Buffer | string) => void> = []
  private readonly enders: Array<() => void> = []
  private readonly exiters: Array<(code: number | null) => void> = []
  private readonly errorers: Array<(error: unknown) => void> = []
  private readonly stdinErrorers: Array<(error: unknown) => void> = []

  // Event-emitter-shaped members are written as the METHODS the
  // `HermesGatewayProcess` contract declares (`stdout.on(event, listener)`),
  // not as objects wrapping one — the wrapper shape is not assignable.
  readonly stdout = {
    on: (
      event: 'data' | 'end',
      listener: ((chunk: Buffer | string) => void) | (() => void),
    ): unknown => {
      if (event === 'data') this.data.push(listener as (chunk: Buffer | string) => void)
      else this.enders.push(listener as () => void)
      return undefined
    },
  }
  readonly stderr = { on: () => undefined }
  readonly stdin = {
    write: (chunk: string) => {
      this.written.push(chunk)
      return true
    },
    end: () => undefined,
    on: (event: 'error', listener: (error: unknown) => void): unknown => {
      if (event === 'error') this.stdinErrorers.push(listener)
      return undefined
    },
  }
  kill(): void {
    this.killed += 1
  }
  readonly pid = 4242
  on(event: 'exit' | 'error', listener: (arg: unknown) => void): unknown {
    if (event === 'exit') this.exiters.push(listener as (code: number | null) => void)
    else this.errorers.push(listener)
    return undefined
  }

  emit(line: string): void {
    const frame = line.endsWith('\n') ? line : `${line}\n`
    for (const listener of this.data) listener(frame)
  }
  emitRaw(chunk: string): void {
    for (const listener of this.data) listener(chunk)
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
  emitStdinError(error: unknown): void {
    for (const listener of this.stdinErrorers) listener(error)
  }
}

describe('P2-8 — the stdio transport (the wire P2-2 proved, now at the seam)', () => {
  it('frames one JSON-RPC line per send, newline-terminated', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    transport.send('{"a":1}')
    transport.send('{"b":2}')
    expect(fake.written).toEqual(['{"a":1}\n', '{"b":2}\n'])
  })

  it('reassembles a frame split across chunks and tolerates CRLF', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const lines: string[] = []
    transport.onLine((line) => lines.push(line))

    fake.emitRaw('{"jsonrpc":"2.0","id"')
    fake.emitRaw(':1}\r\n')
    fake.emitRaw('{"id":2}\n')

    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}', '{"id":2}'])
  })

  it('delivers an empty line as nothing (the reader skips it)', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const lines: string[] = []
    transport.onLine((line) => lines.push(line))
    fake.emit('\n')
    expect(lines).toEqual([])
  })

  it('reports a stdout end as a death with no code', async () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    fake.emitEnd()
    // The EOF death yields ONE macrotask to the process `exit` event (the pipe
    // and the child race); with no exit coming, the EOF death stands.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(closes).toEqual([{ code: null, reason: 'the worker closed its stdout' }])
  })

  it('an exit landing in the same tick as the EOF WINS — the exit code is not lost', () => {
    // Critic `P2-8`-D1: the pre-seam client's `on('exit')` was its only exit
    // path, so it was order-independent. A first-wins `finish` reported
    // `code null` whenever the pipe's EOF was dispatched first, losing the
    // worker's exit code from the run's error event.
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    fake.emitEnd()
    fake.emitExit(7)
    expect(closes).toEqual([{ code: 7, reason: 'the worker exited (code 7)' }])
  })

  it('reports a process exit as a death WITH the code', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    fake.emitExit(3)
    expect(closes).toEqual([{ code: 3, reason: 'the worker exited (code 3)' }])
  })

  it('reports a process error and a stdin error as deaths', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    fake.emitStdinError(new Error('EPIPE'))
    // The transport is already dead, so the process error that follows is
    // swallowed: a death is reported once, whatever arrives after it.
    fake.emitError(new Error('spawn failed'))
    expect(closes).toHaveLength(1)
    expect(closes[0].reason).toContain('EPIPE')
  })

  it('reports a process error as a death when no other death came first', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    fake.emitError(new Error('spawn failed'))
    expect(closes).toEqual([{ code: null, reason: 'worker error: spawn failed' }])
  })

  it('fires the close exactly once, however many deaths arrive', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    let count = 0
    transport.onClose(() => {
      count += 1
    })
    fake.emitEnd()
    fake.emitExit(0)
    fake.emitError(new Error('late'))
    expect(count).toBe(1)
  })

  it('unsubscribes: a released listener hears nothing more', () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const lines: string[] = []
    const unsubscribe = transport.onLine((line) => lines.push(line))
    fake.emit('{"id":1}')
    unsubscribe()
    fake.emit('{"id":2}')
    expect(lines).toEqual(['{"id":1}'])
  })

  it('close() kills the child — this transport owns the worker process', async () => {
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    expect(transport.ownsWorkerProcess).toBe(true)
    await transport.close()
    expect(fake.killed).toBe(1)
  })

  it('close() is safe to call twice — no throw, one close notification (the interface contract)', async () => {
    // The interface's own docblock promises "Safe to call twice"; until this
    // test existed that was an unproven claim (a mutant making the second
    // call throw stayed GREEN).
    const fake = new FakeHermesProcess()
    const transport = createStdioTransport(fake)
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    await transport.close()
    await transport.close()
    expect(closes).toHaveLength(1)
  })
})

/**
 * A fake of the worker's ws door lives in `./hermes-test-fakes` — shared with
 * the client suite so the two cannot drift apart on what the door does. The
 * dial harness below wires the REAL transport factory to it.
 */

describe('P2-8 — the mint leg (a single-use ticket per dial, secret in a header)', () => {
  it('posts the secret in the Authorization header, never on the URL', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return { ok: true, json: async () => ({ ticket: 't-1', ttl_seconds: 30 }) } as unknown as Response
    }) as typeof fetch

    const ticket = await fetchHermesTicket({ baseUrl: 'http://hermes-gateway:8091/', token: 'sk-live', fetchImpl })

    expect(ticket).toEqual({ ticket: 't-1', ttl_seconds: 30 })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://hermes-gateway:8091/internal/ws-ticket')
    expect(calls[0].init?.method).toBe('POST')
    // The secret is a header; the URL carries no credential.
    const headers = calls[0].init?.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer sk-live')
    expect(calls[0].url).not.toContain('sk-live')
  })

  it('turns a non-2xx into a HermesTicketError carrying the status', async () => {
    const fetchImpl = (async () =>
      ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response) as typeof fetch
    await expect(fetchHermesTicket({ baseUrl: 'http://x', token: 'wrong', fetchImpl })).rejects.toThrow(
      /answered 401/,
    )
    const error = await fetchHermesTicket({ baseUrl: 'http://x', token: 'wrong', fetchImpl }).catch((e) => e)
    expect(error).toBeInstanceOf(HermesTicketError)
    expect((error as HermesTicketError).status).toBe(401)
  })

  it('refuses a mint answer with no ticket', async () => {
    const fetchImpl = (async () =>
      ({ ok: true, status: 200, json: async () => ({ ttl_seconds: 30 }) }) as unknown as Response) as typeof fetch
    await expect(fetchHermesTicket({ baseUrl: 'http://x', token: 't', fetchImpl })).rejects.toThrow(
      /without a ticket/,
    )
  })
})

describe('P2-8 — the ws transport dial (bounded retry, fresh ticket per attempt)', () => {
  it('dials once when the door accepts: the ticket rides the upgrade URL', async () => {
    const door = new FakeHermesDoor()
    const { dial } = makeDoorDial(door)
    const transport = await dial()

    expect(door.mintedTickets).toEqual(['ticket-1'])
    expect(door.dialedUrls).toEqual(['ws://hermes-gateway:8091/api/ws?ticket=ticket-1'])
    expect(transport.ownsWorkerProcess).toBe(false)
  })

  it('retries a refused upgrade with a FRESH ticket (the pin tickets are single-use)', async () => {
    const door = new FakeHermesDoor()
    door.refuseNextUpgrades(2)
    const { dial, slept } = makeDoorDial(door, { attempts: 3 })
    const transport = await dial()

    expect(door.mintedTickets).toEqual(['ticket-1', 'ticket-2', 'ticket-3'])
    expect(door.dialedUrls[1]).toContain('ticket-2')
    // The backoff ran between attempts, and is bounded: 1s then 2s at the defaults.
    expect(slept).toEqual([1000, 2000])
    expect(transport).toBeDefined()
  })

  it('fails fast when the mint leg answers 401/403 — a wrong secret is not a retry', async () => {
    const door = new FakeHermesDoor()
    const { dial, slept } = makeDoorDial(door, {
      attempts: 5,
      fetchTicket: async () => {
        throw new HermesTicketError('the hermes ws mint leg answered 401', 401)
      },
    })
    await expect(dial()).rejects.toThrow(/answered 401/)
    expect(door.dialedUrls).toEqual([]) // never even dialed
    expect(slept).toEqual([]) // never slept
  })

  it('gives up after the attempts, naming the last failure', async () => {
    const door = new FakeHermesDoor()
    door.refuseNextUpgrades(99)
    const { dial, slept } = makeDoorDial(door, { attempts: 3, baseDelayMs: 10, maxDelayMs: 20 })
    // The wording is production's: the fake fires `onerror` then `onclose`
    // exactly as node 24 does for an upgrade the door refuses with a 403
    // (measured), so the per-attempt error is the socket error, not a
    // close-code message production never sees.
    await expect(dial()).rejects.toThrow(/could not be reached after 3 attempts .*socket failed to open/)
    expect(slept).toHaveLength(2) // no sleep after the final attempt
  })

  it('treats a socket that never opens as a failed attempt (the per-socket timeout)', async () => {
    const door = new FakeHermesDoor()
    door.neverOpen()
    const { dial } = makeDoorDial(door, { attempts: 2, baseDelayMs: 1, maxDelayMs: 1, socketTimeoutMs: 30 })
    await expect(dial()).rejects.toThrow(/could not be reached after 2 attempts .*did not open within 30ms/)
  })
})

describe('P2-8 — the ws transport live (framing and death over the socket)', () => {
  async function connected(): Promise<{ transport: HermesGatewayTransport; door: FakeHermesDoor }> {
    const door = new FakeHermesDoor()
    const { dial } = makeDoorDial(door)
    const transport = await dial()
    return { transport, door }
  }

  it('delivers each ws message as one frame, and splits a multi-frame message', async () => {
    const { transport, door } = await connected()
    const lines: string[] = []
    transport.onLine((line) => lines.push(line))

    door.deliver({ jsonrpc: '2.0', id: 1, result: {} })
    door.deliverBatch({ jsonrpc: '2.0', id: 2, result: {} }, { jsonrpc: '2.0', id: 3, result: {} })

    expect(lines).toEqual([
      '{"jsonrpc":"2.0","id":1,"result":{}}',
      '{"jsonrpc":"2.0","id":2,"result":{}}',
      '{"jsonrpc":"2.0","id":3,"result":{}}',
    ])
  })

  it('sends one frame per call — no newline framing on this wire', async () => {
    const { transport, door } = await connected()
    transport.send('{"a":1}')
    expect(door.framesSent).toEqual(['{"a":1}'])
  })

  it('reports the socket close code as the death code', async () => {
    const { transport, door } = await connected()
    const closes: HermesTransportCloseInfo[] = []
    transport.onClose((info) => closes.push(info))
    door.die(1006, 'abnormal')
    expect(closes).toEqual([{ code: 1006, reason: 'abnormal' }])
  })

  it('close() does NOT report a death — our own close is not a peer death', async () => {
    const { transport, door } = await connected()
    let deaths = 0
    transport.onClose(() => {
      deaths += 1
    })
    await transport.close()
    expect(deaths).toBe(0)
    expect(door.closes).toBe(1)
  })

  it('send after close throws, so the client can turn it into a rejection', async () => {
    const { transport } = await connected()
    await transport.close()
    expect(() => transport.send('{"a":1}')).toThrow(/closed/)
  })
})

