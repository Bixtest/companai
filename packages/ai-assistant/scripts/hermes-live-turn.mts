/**
 * `P2-7`'s live-turn gate — drive a **REAL** turn through the port (§2.13).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `P2-6` (§2.12) proved the five properties of the runtime *through the port*,
 * but against a `FakeClient` — **no live turn was ever driven**. Its *stated*
 * exit gate (plan §2.11) was "serving a live turn over Hermes", and `CC-74`'s
 * trigger is "a real chat run served by the pinned worker". This harness is that
 * proof: it connects the **pinned worker**, creates a session, submits a prompt,
 * and reads the adapter's **ordered typed events** to a real model answer.
 *
 * It is a HARNESS, not a unit test. It reaches a live service (Docker + the
 * pinned worker + a model), so it must never run in the unit suite (L150). The
 * adapter's *mapping* is already proven by the `__tests__` suites against fakes;
 * this proves the last mile — that a real worker, wired to a reachable model,
 * answers a real prompt and the adapter turns that into the port's typed events.
 *
 * The harness's **judgement** is deliberately NOT here: it lives in
 * `src/.../lib/hermes-live-turn-verdict.ts`, pure and unit-tested, so a mutation
 * that blinds this harness turns that suite red in milliseconds instead of
 * needing another ten-minute live run to notice.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW IT REACHES THE WORKER (two modes; the second is the production shape)
 * ─────────────────────────────────────────────────────────────────────────────
 * **stdio mode (default)** — the `P2-7` shape: `docker exec -i <container>
 * python -m tui_gateway.entry`, the same argv `resolveHermesWorkerLaunch`
 * documents. The container carries the platform's env (`OPENAI_API_KEY`,
 * `OPENAI_BASE_URL`, …); `P2_7_EXTRA_ENV` injects additional vars for a
 * **pre-deploy** proof (a JSON object). With `P2_7_EXTRA_ENV` **unset** the
 * worker reads the container's own env — the production-shaped run.
 *
 * **ws mode (`P2_7_URL` set)** — the `P2-8` production shape, and this row's
 * exit gate: **no hand-spawned process at all**. The harness connects the
 * worker's own WebSocket door (`tui_gateway/ws.py` — the identical wire) at
 * that URL, exactly the way the app does: mint a single-use ticket over the
 * shared secret (`P2_7_WS_TOKEN`), upgrade `/api/ws?ticket=…`. Everything
 * after `connect()` — the handshake, the run, the judgement — is the same
 * code, which is the seam's whole point.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MEASURED 2026-10-13/14 (why the env knobs below are what they are)
 * ─────────────────────────────────────────────────────────────────────────────
 * On this 4-CPU box (Docker Desktop exposes 4 of the host's 8) the local
 * `Qwen2.5-7B-Instruct-Q4_K_M` prefills at **5–12 tok/s**. Three real turns,
 * each driven through the pinned worker and each read from the model's own
 * `prompt eval time` line — never from the `progress =` fraction, which
 * mis-states the total by up to 2.5x (LESSONS L153):
 *   · prompt **6105 tokens** → **608s** prefill; a full turn of **626.5s**;
 *   · prompt **10,988 tokens** (nothing pinned — the DEFAULT toolsets) →
 *     **1583s** @ 6.94 tok/s;
 *   · prompt **10,646 tokens** (the DEFAULT toolsets, PRODUCTION-SHAPED, with
 *     the package suite running alongside) → **~1905s** @ ~5.6 tok/s; a full
 *     turn of **1955.4s**, ending on a typed `done` with the answer
 *     `HERMES LIVE TURN OK`.
 * The worker's local-provider stale ceiling defaults to **900s**
 * (`agent.local_stream_stale_timeout`), so ALL THREE prompts overrun it —
 * hence the compose forwards `HERMES_LOCAL_STREAM_STALE_TIMEOUT` (**2400s**,
 * the value that beats the slowest measured prefill). That ceiling, not this
 * harness, is what bounds a turn; `TURN_TIMEOUT_MS` below only prints a note.
 *
 * USAGE
 * -----
 *   npx tsx packages/ai-assistant/scripts/hermes-live-turn.mts
 *   # production-shaped: reads the CONTAINER's env (compose must be applied first)
 *   P2_7_EXTRA_ENV='{"HERMES_TUI_TOOLSETS":"search"}' \
 *     npx tsx packages/ai-assistant/scripts/hermes-live-turn.mts
 *   # P2-8: over the worker's ws door — NO spawned process
 *   P2_7_URL=http://127.0.0.1:8091 P2_7_WS_TOKEN=<the door's token> \
 *     npx tsx packages/ai-assistant/scripts/hermes-live-turn.mts
 *
 * Exit 0 = a real turn was served and ended on a typed `done`; 1 otherwise.
 */

import { HermesGatewayClient } from '../src/modules/ai_assistant/lib/hermes-gateway-client'
import {
  createWebSocketTransport,
  fetchHermesTicket,
} from '../src/modules/ai_assistant/lib/hermes-gateway-transport'
import {
  createHermesPortAdapter,
  textInputRef,
  type HermesGatewayPortClient,
} from '../src/modules/ai_assistant/lib/hermes-port-adapter'
import { judgeLiveTurn } from '../src/modules/ai_assistant/lib/hermes-live-turn-verdict'
import type { AiRuntimeStreamEvent } from '../src/modules/ai_assistant/lib/ai-runtime-port'

const CONTAINER = process.env.P2_7_CONTAINER ?? 'mercato-hermes-gateway'
const PROMPT = process.env.P2_7_PROMPT ?? 'Reply with exactly the four words: HERMES LIVE TURN OK'
/** Diagnostic only — it never aborts the stream (the worker's own stale ceiling
 *  is the real bound). The default-toolsets prompt measured 10,988 tokens →
 *  1583s on this box (2026-10-14), so the note fires at 45 min: after the
 *  prefill that has actually been observed, never during it. */
const TURN_TIMEOUT_MS = Number(process.env.P2_7_TIMEOUT_MS ?? 2_700_000)

function workerArgs(): string[] {
  const args = ['exec', '-i']
  const extra = process.env.P2_7_EXTRA_ENV
  if (extra) {
    const parsed: unknown = JSON.parse(extra)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('P2_7_EXTRA_ENV must be a JSON object of string values')
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      args.push('-e', `${key}=${String(value)}`)
    }
  }
  args.push(CONTAINER, 'python', '-m', 'tui_gateway.entry')
  return args
}

/**
 * The client, in the mode the environment names.
 *
 * `P2_7_URL` set ⇒ the ws door (P2-8's shape: connect, do not spawn) — the
 * ticket leg is the door's own, with the shared secret in a header. Unset ⇒
 * the P2-7 docker-exec spawn. The dial is bounded fast: the door is already
 * up by the time a turn runs, so 3 quick attempts, not the service boot's.
 */
function buildClient(): { client: HermesGatewayClient; description: string } {
  const url = (process.env.P2_7_URL ?? '').trim()
  if (url !== '') {
    const token = (process.env.P2_7_WS_TOKEN ?? '').trim()
    if (token === '') {
      throw new Error('P2_7_URL is set but P2_7_WS_TOKEN is not — the door refuses every mint with 401')
    }
    return {
      description: `ws door at ${url} (no spawned process)`,
      client: new HermesGatewayClient({
        requestTimeoutMs: 120_000,
        transportFactory: () =>
          createWebSocketTransport({
            url,
            fetchTicket: () => fetchHermesTicket({ baseUrl: url, token }),
            attempts: 3,
            baseDelayMs: 500,
            maxDelayMs: 4_000,
          }),
      }),
    }
  }
  const args = workerArgs()
  return {
    description: `docker ${args.join(' ')}`,
    client: new HermesGatewayClient({ command: 'docker', args, requestTimeoutMs: 120_000 }),
  }
}

async function main(): Promise<number> {
  const { client, description } = buildClient()
  console.log('P2-8 live-turn gate (the P2-7 harness over the worker ws door)')
  console.log(`  transport: ${description}`)

  // Log every event the worker emits, so the proof is visible even if the
  // adapter's own listeners change. This is diagnostic, not the assertion.
  const seen: string[] = []
  client.on('*', (event) => {
    seen.push(event.method)
    if (event.method !== 'message.delta') {
      console.log(`    evt ${event.method} :: ${JSON.stringify(event.params).slice(0, 180)}`)
    }
  })

  const handshake = await client.connect()
  console.log(
    `  handshake: perSessionExclusiveSubmit=${handshake.gatewayCapabilities.perSessionExclusiveSubmit} ` +
      `serverRequests=${handshake.serverRequestMethods.length}`,
  )

  const port = createHermesPortAdapter(client as unknown as HermesGatewayPortClient)
  const runId = `p2-7-live-${Date.now()}`
  const started = Date.now()
  const start = await port.startRun({
    schemaVersion: 1,
    runId,
    tenantId: 'tenant-p2-7',
    principalId: 'principal-p2-7',
    actorId: 'actor-p2-7',
    agentId: 'agent-p2-7',
    conversationId: `conv-${runId}`,
    capabilityGrantId: `chat-turn:principal-p2-7:${runId}`,
    allowedInputRefs: [textInputRef(PROMPT)],
  })
  console.log(`  startRun: runId=${start.runId} runtimeSessionId=${start.runtimeSessionId}`)

  const typed: AiRuntimeStreamEvent[] = []
  let settled = false
  const timer = setTimeout(() => {
    if (!settled) {
      console.log(`  note: still waiting after ${TURN_TIMEOUT_MS}ms (prefill on CPU is slow; not aborting)`)
    }
  }, TURN_TIMEOUT_MS)

  // No envelope deadline/budget is set, so the run is unbounded by the port
  // (§2.12: an ABSENT bound is not a zero bound) — the worker's own stale
  // ceiling is what bounds it.
  await port.streamRun(runId, async (event) => {
    typed.push(event)
  })
  settled = true
  clearTimeout(timer)

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  const verdict = judgeLiveTurn(typed)
  console.log(`  typed event types: ${JSON.stringify(verdict.eventTypes)}`)
  console.log(`  ANSWER: ${JSON.stringify(verdict.answer)}`)
  console.log(`  ${verdict.passed ? 'PASS' : 'FAIL'} — ${verdict.reason} in ${elapsed}s`)
  console.log(`  worker events seen: ${seen.length}`)

  try {
    await client.stop()
  } catch {
    /* the worker may already be gone */
  }
  return verdict.passed ? 0 : 1
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('P2-7 live-turn gate FAILED:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
