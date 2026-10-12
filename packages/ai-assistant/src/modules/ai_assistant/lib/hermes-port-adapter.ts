/**
 * The Hermes runtime adapter — the SECOND engine behind the door (row 28, P2-3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `ai-runtime-port.ts` declares the door; `opencode-port-adapter.ts` puts the
 * existing OpenCode engine behind it (R28-2 — *"rewire first, delete second"*).
 * This file puts the **pinned Hermes worker** behind the same door, standing on
 * the two discharged Hermes rows: the worker boots (`P2-1`) and its stdio client
 * speaks the measured wire (`P2-2`, `hermes-gateway-client.ts`).
 *
 * It moves no caller and changes no engine. It is the adapter the door will
 * select in `P2-5`; today nothing selects it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE MEASURED WIRE ACTUALLY OFFERS (PLAN §2.8 — measured, not assumed)
 * ─────────────────────────────────────────────────────────────────────────────
 * Session lifecycle (`tui_gateway/contracts/sessions.py`): `session.create` (an
 * `idempotency_key` makes a retried create return the SAME session — #65410),
 * `session.resume`, `session.usage`, `session.status`, `session.interrupt`,
 * `session.steer`. A turn is `prompt.submit` plus events (`contracts/events.py`,
 * every key snake_case): `message.start` (no payload), `message.delta`
 * `{text}`, `reasoning.delta`, `tool.start` `{tool_id, name, args}`,
 * `tool.complete` `{tool_id, name, result}`, `status.update` `{kind, text}`,
 * `session.usage` `{usage}`, and `message.complete` `{text, usage?, status?,
 * error?}` with `TurnStatus ∈ complete|error|interrupted`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HONEST BOUNDARY — what Hermes supports, stated not pretended
 * ─────────────────────────────────────────────────────────────────────────────
 *   describeCapabilities ✓  health from the TRANSPORT (connected → ok, else
 *                            down). Not a model probe: the worker reaches
 *                            `gateway.ready` with no key and no model (P2-1),
 *                            and this door has no model-health endpoint.
 *   startRun             ✓  `session.create` keyed by the run id (idempotent),
 *                            or an explicit session id from the envelope.
 *   streamRun            ✓  `prompt.submit` + the measured event map, ending at
 *                            `message.complete`; a worker exit mid-run ends the
 *                            stream with an error rather than hanging it.
 *   cancelRun            ✓  `session.interrupt` — a real interrupt; the turn
 *                            then reports `interrupted` on `message.complete`.
 *   steerRun             ✓  **the §2.4 claim, settled by measurement**: Hermes
 *                            is the first engine that can make the port's eight
 *                            real rather than seven. `session.steer` injects
 *                            text into the next tool result without
 *                            interrupting and without a new user turn, on a
 *                            session the caller already owns — so it adds
 *                            instruction to an ALREADY-ADMITTED run and
 *                            carries no capability: it cannot widen authority
 *                            (§4.1's precondition, met as well as this door
 *                            can). THREE NAMED LIMITS, not hidden:
 *                              (1) an idle session answers `rejected` — the
 *                                  adapter THROWS, because the gateway's own
 *                                  client would queue it as a normal next
 *                                  prompt and the platform must make that
 *                                  choice itself.
 *                              (2) the text is spliced into the NEXT tool
 *                                  result, so it lands after the running tool
 *                                  finishes. That timing is the engine's.
 *                              (3) a steered turn reaches the WORKER's own
 *                                  tools; the platform's tool door stays ✗
 *                                  until `P2-4`.
 *   resumeConversation   ✓  `session.resume` on the session the caller names;
 *                            every resume is a FRESH run id (§4.2).
 *   resolveToolCall      ✗  Hermes runs its own tools inside the worker; the
 *                            platform resolves none of them through this door
 *                            yet. Reported unsupported so no caller believes a
 *                            tool call is platform-gated. (`P2-4`.)
 *   completeRun          ✓  this adapter's registry; replay-safe.
 *
 * The ✗ is a fact about today's wiring, not a defect in Hermes — and
 * `describeCapabilities` says so, the same way the OpenCode adapter reports its
 * own two ✗ operations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE IDENTIFIERS (§4.2 — a run is not a conversation is not a session)
 * ─────────────────────────────────────────────────────────────────────────────
 * The registry is the one place the platform's `runId` meets the engine's
 * `session_id`. `resumeConversation` mints a NEW run id per resume; deriving it
 * from the conversation would let one entry stand for every run in it.
 */

import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  type AiRuntimeCancelResult,
  type AiRuntimeCapabilities,
  type AiRuntimeCompleteResult,
  type AiRuntimeEnvelope,
  type AiRuntimeEventSink,
  type AiRuntimeInput,
  type AiRuntimePort,
  type AiRuntimeResumeBinding,
  type AiRuntimeRunResult,
  type AiRuntimeStartResult,
  type AiRuntimeStreamEvent,
  type AiRuntimeToolCall,
} from './ai-runtime-port'

const logger = createLogger('ai_assistant').child({ component: 'hermes-port' })

/** The name this implementation reports for itself (`describeCapabilities`). */
export const HERMES_RUNTIME_IMPLEMENTATION = 'hermes' as const

/**
 * The slice of the P2-2 client this adapter uses.
 *
 * Declared structurally — not importing `HermesGatewayClient` — so the adapter
 * can be tested against a fake that implements the measured contract, with no
 * Python runtime and no Docker: what is under test is the door's mapping, not
 * the transport (which has its own 21-test suite).
 */
export interface HermesGatewayPortClient {
  readonly isConnected: boolean
  connect(): Promise<unknown>
  request<TResult = unknown, TParams = Record<string, never>>(method: string, params: TParams): Promise<TResult>
  submitPrompt(sessionId: string, text: string, extra?: Record<string, unknown>): Promise<{ status?: string; user_row_id?: number }>
  interruptSession(sessionId: string): Promise<Record<string, unknown>>
  steerSession(sessionId: string, text: string): Promise<Record<string, unknown>>
  on(method: string, listener: (event: { method: string; params: Record<string, unknown> }) => void): () => void
  onExit(handler: (code: number | null) => void): () => void
}

/** The measured `session.create` result. */
interface HermesSessionCreateResult {
  session_id: string
  stored_session_id?: string
  message_count?: number
}

/** One live run in the adapter's registry. */
interface HermesLiveRun {
  runId: string
  sessionId: string
  envelope: AiRuntimeEnvelope
  /** Set by `cancelRun`; a cancelled run streams nothing further. */
  cancelled: boolean
  /** Set by `completeRun`; makes completion replay-safe (§4.3). */
  completed: boolean
}

/** Constructor deps. One adapter holds one client and one run registry. */
export interface HermesPortAdapterDeps {
  client: HermesGatewayPortClient
}

/** A `session.steer` result, as measured (`sessions.py::SessionCorrectionResult`). */
type HermesSteerStatus = 'queued' | 'redirected' | 'rejected'

/**
 * The Hermes implementation of the runtime port.
 *
 * Construct one per client; callers that need a different worker use a
 * different adapter. Every method is safe to call twice unless its own docblock
 * says otherwise.
 */
export class HermesPortAdapter implements AiRuntimePort {
  private readonly client: HermesGatewayPortClient
  private readonly runs = new Map<string, HermesLiveRun>()
  /** Monotonic counter so every resume gets a distinct run id (§4.2). */
  private resumeCounter = 0

  constructor(deps: HermesPortAdapterDeps) {
    this.client = deps.client
  }

  /** The run registry, for tests and for `completeRun`'s replay safety. */
  getRun(runId: string): HermesLiveRun | undefined {
    return this.runs.get(runId)
  }

  async describeCapabilities(runtimeVersion?: string): Promise<AiRuntimeCapabilities> {
    return {
      implementation: HERMES_RUNTIME_IMPLEMENTATION,
      runtimeVersion,
      // Tools live INSIDE the worker (its own agent plus its MCP connections);
      // the platform delivers none of them through this door in this row.
      toolDelivery: 'in-worker',
      // The transport's liveness, honestly bounded: a client that finished the
      // handshake is `ok`, anything else is `down`. No model is probed (P2-1:
      // boot needs neither key nor model), so a healthy transport never claims
      // a healthy model.
      health: this.client.isConnected ? 'ok' : 'down',
      operations: {
        describeCapabilities: true,
        startRun: true,
        streamRun: true,
        cancelRun: true,
        // §2.4 settled by measurement — the first ✓ on the whole port.
        steerRun: true,
        resumeConversation: true,
        // P2-4 wires the platform's tool door; until then, no pretending.
        resolveToolCall: false,
        completeRun: true,
      },
    }
  }

  /**
   * `startRun(envelope)` — accept a run the platform already admitted.
   *
   * A second call for the same run id does not restart it: `session.create` is
   * idempotent on the engine's side too (`idempotency_key` — #65410), so a
   * retried create returns the same session rather than a duplicate child.
   *
   * When the envelope already carries a `runtimeSessionId`, that session is
   * ADOPTED (explicit continuity, never implicit — §4.2) and no session is
   * created.
   */
  async startRun(envelope: AiRuntimeEnvelope): Promise<AiRuntimeStartResult> {
    const existing = this.runs.get(envelope.runId)
    if (existing) {
      return { runId: envelope.runId, runtimeSessionId: existing.sessionId }
    }

    let sessionId = envelope.runtimeSessionId ?? null
    if (!sessionId) {
      if (!this.client.isConnected) {
        throw new Error('hermes port adapter is not connected — connect the client before starting a run')
      }
      const created = await this.client.request<HermesSessionCreateResult, { idempotency_key: string }>(
        'session.create',
        { idempotency_key: envelope.runId },
      )
      sessionId = created.session_id
    }

    const run: HermesLiveRun = {
      runId: envelope.runId,
      sessionId,
      envelope,
      cancelled: false,
      completed: false,
    }
    this.runs.set(envelope.runId, run)
    logger.debug('Hermes run started', { runId: envelope.runId, sessionId })
    return { runId: envelope.runId, runtimeSessionId: sessionId }
  }

  /**
   * `streamRun(runId)` — stream the run's ordered, typed events.
   *
   * Submits the turn (`prompt.submit`) and maps the measured event names to the
   * port's generic events, resolving at `message.complete` — the one event that
   * carries the authoritative final usage (§4.3: the scope is STATED, `run` for
   * the turn, `session` for a mid-turn tick). A turn that reports `error` or
   * `interrupted` is reported as an error, not as `done`: a stopped run must not
   * read as a completed one (the `R28-4` lesson).
   *
   * The envelope's OWN deadline is honoured (§4.2: *"a deadline, so a run
   * cannot outlive its admission"*): a run whose deadline has already passed
   * streams an error instead of spending a turn, and a turn that outlives it
   * ends with an error event rather than streaming forever. That is the
   * caller's bound, not an adapter policy — an absent, `null` or unparseable
   * deadline bounds nothing and is logged, because a bound that cannot be read
   * must fail safe, not fire immediately.
   *
   * Every subscription — the event listeners and the exit handler — is
   * unsubscribed before resolving, so a long-lived client does not grow per
   * streamed run.
   */
  async streamRun(runId: string, onEvent: AiRuntimeEventSink): Promise<void> {
    const run = this.runs.get(runId)
    if (!run) {
      await onEvent({ type: 'error', error: `unknown run ${runId}` })
      return
    }
    if (run.cancelled) return

    const text = readTurnText(run.envelope)
    if (text === undefined) {
      await onEvent({ type: 'error', error: 'run has no input text' })
      return
    }
    if (!this.client.isConnected) {
      await onEvent({ type: 'error', error: 'hermes gateway client is not connected' })
      return
    }

    // A cancel that lands between the check above and the submit below is
    // honoured here: the turn is never sent on behalf of a cancelled run.
    if (run.cancelled) return

    // §4.2's envelope carries `deadline` — "a deadline, so a run cannot outlive
    // its admission". It is the CALLER's bound (not an adapter policy), so a run
    // that is already out of time streams the error instead of spending a turn.
    const deadlineAt = readDeadline(run.envelope)
    if (deadlineAt !== null && deadlineAt <= Date.now()) {
      await onEvent({ type: 'error', error: 'the run exceeded its admission deadline before it could stream' })
      return
    }

    const unsubscribes: Array<() => void> = []
    let deadlineTimer: ReturnType<typeof setTimeout> | null = null
    let settled = false
    let finish = () => {}
    const streamEnded = new Promise<void>((resolve) => {
      finish = resolve
    })

    const settle = () => {
      if (settled) return
      settled = true
      finish()
    }

    unsubscribes.push(
      this.client.on('message.delta', async (event) => {
        if (settled) return
        await onEvent({ type: 'text', content: String(event.params.text ?? '') })
      }),
    )
    unsubscribes.push(
      this.client.on('reasoning.delta', async () => {
        if (settled) return
        // The port's `thinking` event carries no payload, so a reasoning chunk
        // is a signal, not content — the text itself never reaches the port.
        await onEvent({ type: 'thinking' })
      }),
    )
    unsubscribes.push(
      this.client.on('tool.start', async (event) => {
        if (settled) return
        await onEvent({
          type: 'tool-call',
          id: String(event.params.tool_id ?? ''),
          toolName: String(event.params.name ?? ''),
          args: event.params.args ?? {},
        })
      }),
    )
    unsubscribes.push(
      this.client.on('tool.complete', async (event) => {
        if (settled) return
        await onEvent({ type: 'tool-result', id: String(event.params.tool_id ?? ''), result: event.params.result ?? null })
      }),
    )
    unsubscribes.push(
      this.client.on('status.update', async (event) => {
        if (settled) return
        await onEvent({ type: 'status', status: String(event.params.text ?? event.params.kind ?? '') })
      }),
    )
    unsubscribes.push(
      this.client.on('session.usage', async (event) => {
        if (settled) return
        // A mid-turn tick is CUMULATIVE for the session — scope stated, never
        // guessed (§4.3).
        await onEvent(usageEvent(event.params.usage, 'session'))
      }),
    )
    unsubscribes.push(
      this.client.on('message.complete', async (event) => {
        if (settled) return
        // The authoritative final usage belongs to THIS turn — scope `run`.
        await onEvent(usageEvent(event.params.usage, 'run'))
        const status = typeof event.params.status === 'string' ? event.params.status : 'complete'
        const failure = event.params.error ?? event.params.failure_reason
        if (status === 'error' || status === 'interrupted' || failure) {
          const why = typeof failure === 'string' && failure ? failure : `the turn ended with status ${status}`
          await onEvent({ type: 'error', error: why })
        } else {
          await onEvent({ type: 'done', sessionId: run.sessionId })
        }
        settle()
      }),
    )
    unsubscribes.push(
      this.client.on('error', async (event) => {
        if (settled) return
        // A session-level failure outside a turn (`events.py::error`).
        await onEvent({ type: 'error', error: String(event.params.message ?? 'hermes gateway error') })
        settle()
      }),
    )
    // A worker that dies mid-run must not leave the stream awaiting forever.
    // The exit subscription is released with the rest: one streamed run must
    // not leave a closure behind on a long-lived client.
    unsubscribes.push(
      this.client.onExit((code) => {
        if (settled) return
        void onEvent({ type: 'error', error: `the hermes worker exited mid-run (code ${String(code)})` }).then(settle, settle)
      }),
    )

    // The run's own admission deadline: a turn that outlives it ends with an
    // error event rather than streaming forever. The timer is cleared on every
    // exit path below, so a healthy run keeps no wake-up behind it.
    if (deadlineAt !== null) {
      deadlineTimer = setTimeout(() => {
        if (settled) return
        void onEvent({ type: 'error', error: 'the run exceeded its admission deadline while streaming' }).then(settle, settle)
      }, deadlineAt - Date.now())
    }

    try {
      // The gateway answers `queued` when another turn holds the session
      // (`per_session_exclusive_submit`); the events follow when it drains.
      await this.client.submitPrompt(run.sessionId, text)
    } catch (error) {
      await onEvent({ type: 'error', error: error instanceof Error ? error.message : String(error) })
      settle()
    }

    try {
      await streamEnded
    } finally {
      for (const off of unsubscribes) off()
      if (deadlineTimer !== null) clearTimeout(deadlineTimer)
    }
  }

  /**
   * `cancelRun(runId)` — bounded and idempotent (§4.3).
   *
   * Unlike the OpenCode adapter (whose engine cannot be torn down from the
   * door), `session.interrupt` really stops the turn, and the turn then reports
   * `interrupted` on `message.complete`. A cancel that finds nothing to stop is
   * a success with a reason, never an error.
   *
   * The platform passes no `expected_hosted_task_id` (the envelope carries no
   * hosted task), so the gateway interrupts whatever turn the session is
   * running. A `not_interrupted` answer is logged; the local cancellation
   * stands, so no further event of this run is forwarded.
   */
  async cancelRun(runId: string): Promise<AiRuntimeCancelResult> {
    const run = this.runs.get(runId)
    if (!run) {
      return { runId, cancelled: false, reason: 'not-found' }
    }
    if (run.completed) {
      return { runId, cancelled: false, reason: 'already-complete' }
    }
    if (run.cancelled) {
      return { runId, cancelled: false, reason: 'already-cancelled' }
    }
    run.cancelled = true
    try {
      const result = await this.client.interruptSession(run.sessionId)
      if (result.status === 'not_interrupted') {
        logger.debug('Hermes interrupt found no turn in flight', { runId, sessionId: run.sessionId })
      }
    } catch (error) {
      // The run is cancelled locally either way; a failed interrupt is logged,
      // never swallowed into a silent success.
      logger.debug('Hermes session.interrupt was not answered', {
        runId,
        sessionId: run.sessionId,
        err: error instanceof Error ? error.message : String(error),
      })
    }
    return { runId, cancelled: true }
  }

  /**
   * `steerRun(runId, instruction)` — SUPPORTED (see the header's §2.4 verdict).
   *
   * `session.steer` injects the text into the next tool result of a turn already
   * in flight, on a session the platform already owns. It carries no capability
   * and starts no new user turn, so it cannot widen the run's authority — which
   * is the only way this door can satisfy §4.1's *"only if the approval
   * semantics exist"*.
   *
   * An idle session answers `rejected`, and the adapter THROWS rather than
   * queueing: the gateway's own client would queue a rejected steer as a normal
   * next prompt, and the platform's caller must make that choice deliberately.
   */
  async steerRun(runId: string, instruction: AiRuntimeInput): Promise<void> {
    const run = this.runs.get(runId)
    if (!run) {
      throw new Error(`steerRun: unknown run ${runId}`)
    }
    if (run.cancelled) {
      throw new Error(`steerRun: run ${runId} is cancelled`)
    }
    const text = typeof instruction.text === 'string' ? instruction.text.trim() : ''
    if (!text) {
      // The gateway's own rule (`methods_session_interrupt.py`: 4002).
      throw new Error(`steerRun: instruction text is required (run ${runId})`)
    }

    const result = (await this.client.steerSession(run.sessionId, text)) as { status?: HermesSteerStatus }
    if (result.status === 'rejected') {
      throw new Error(
        `steerRun: the run ${runId} had no turn in flight, so the gateway rejected the instruction; ` +
          'the platform must decide whether to send it as the next prompt',
      )
    }
    if (result.status !== 'queued' && result.status !== 'redirected') {
      // An unknown status is not a delivery. Fail loudly rather than assume.
      throw new Error(`steerRun: the gateway reported an unknown status ${String(result.status)} for run ${runId}`)
    }
  }

  /**
   * `resumeConversation(binding, input)` — explicit session continuity.
   *
   * Every resume is a FRESH run id (a run is not a conversation — §4.2); the
   * session to continue is named by the caller (`input.sessionId`: the STORED
   * id, or an exact title) and re-hydrated through `session.resume`, so a dead
   * session fails here rather than at the first prompt.
   *
   * The run then adopts the RUNTIME id the reply carries, because that is the
   * id every later turn addresses: `contracts/sessions.py` states the resume
   * params take the stored id or a title while *the reply's* `session_id` is
   * the runtime id, and the gateway resolves a session-scoped RPC against its
   * live sessions by the runtime id alone — a stored id or title that differs
   * is answered `4001 session not found`. The caller's value is kept only as a
   * fallback if the reply carried none.
   */
  async resumeConversation(binding: AiRuntimeResumeBinding, input: AiRuntimeInput): Promise<AiRuntimeStartResult> {
    if (!this.client.isConnected) {
      throw new Error('hermes port adapter is not connected — connect the client before resuming a conversation')
    }
    const sessionId = readSessionId(input)
    if (!sessionId) {
      throw new Error('resumeConversation: input must carry the session id to continue (input.sessionId)')
    }

    const runId = this.mintResumeRunId(binding)
    const resumed = await this.client.request<Record<string, unknown>, { session_id: string }>('session.resume', {
      session_id: sessionId,
    })
    const runtimeSessionId =
      resumed && typeof resumed.session_id === 'string' && resumed.session_id ? resumed.session_id : sessionId

    const run: HermesLiveRun = {
      runId,
      sessionId: runtimeSessionId,
      envelope: {
        schemaVersion: 1,
        runId,
        tenantId: binding.tenantId,
        principalId: binding.principalId,
        actorId: binding.actorId,
        agentId: binding.agentId,
        conversationId: binding.conversationId,
        capabilityGrantId: binding.capabilityGrantId,
        allowedInputRefs: input.text !== undefined ? [textInputRef(input.text)] : [],
      },
      cancelled: false,
      completed: false,
    }
    this.runs.set(runId, run)
    return { runId, runtimeSessionId }
  }

  /** Mints a run id DISTINCT from the conversation it resumes (§4.2). */
  private mintResumeRunId(binding: AiRuntimeResumeBinding): string {
    const seq = ++this.resumeCounter
    return `${binding.tenantId}:${binding.agentId}:resume-${seq}`
  }

  /**
   * `resolveToolCall(call, capabilityGrant)` — UNSUPPORTED in this row.
   *
   * Hermes runs its own tools inside the worker. The platform resolves none of
   * them through this door yet, and saying otherwise would let a caller believe
   * a business operation was platform-gated when it was not. (`P2-4` delivers
   * the one narrow tool through this door, re-authorized at execution time.)
   */
  async resolveToolCall(call: AiRuntimeToolCall, _capabilityGrant: string): Promise<void> {
    throw new Error(
      `resolveToolCall is not supported by the ${HERMES_RUNTIME_IMPLEMENTATION} runtime (call ${call.id})`,
    )
  }

  /**
   * `completeRun(runId, result)` — record the outcome; replay-safe (§4.3).
   *
   * The second call for the same run reports `alreadyComplete: true` and changes
   * nothing, so a retried "finished" message cannot double-count usage.
   */
  async completeRun(runId: string, result: AiRuntimeRunResult): Promise<AiRuntimeCompleteResult> {
    const run = this.runs.get(runId)
    if (!run) {
      // A completion for a run the adapter never saw is recorded as such — not
      // thrown, so a late or duplicate delivery is harmless.
      return { runId, completed: false, alreadyComplete: false }
    }
    if (run.completed) {
      return { runId, completed: false, alreadyComplete: true }
    }
    run.completed = true
    logger.debug('Hermes run completed', {
      runId,
      status: result.status,
      usageScope: result.usage?.scope,
    })
    return { runId, completed: true, alreadyComplete: false }
  }
}

/**
 * Reads the envelope's own deadline (§4.2) as an epoch in milliseconds.
 *
 * A bound is honoured exactly when it can be read: absent, `null` or
 * unparseable values bound nothing and the unparseable ones are logged — a
 * deadline that fires because its value was garbage would kill healthy runs,
 * so the failure mode is chosen deliberately, not inherited from `new Date`.
 */
function readDeadline(envelope: AiRuntimeEnvelope): number | null {
  const { deadline } = envelope
  if (deadline === undefined || deadline === null) return null
  const parsed = deadline instanceof Date ? deadline.getTime() : new Date(deadline).getTime()
  if (!Number.isFinite(parsed)) {
    logger.warn('Hermes run envelope carried an unparseable deadline; no bound applied', {
      deadline: String(deadline),
    })
    return null
  }
  return parsed
}

/**
 * How a caller attaches one turn's text to a run — the port's envelope carries
 * **references, not bodies** (§4.2), and `streamRun(runId)` takes no input.
 *
 * This is the SAME two-part convention the OpenCode adapter reads (its
 * `textInputRef`), duplicated here on purpose: the door does not own an input
 * convention, and an adapter importing another adapter would tie the two
 * engines together. When `P2-5` selects an engine per run, one shared input
 * helper is the right home — named here so the duplication is a decision, not
 * an accident.
 */
const TEXT_INPUT_REF_PREFIX = 'text:'

/** Builds the allowed-input reference that carries one turn's text. */
export function textInputRef(text: string): string {
  return `${TEXT_INPUT_REF_PREFIX}${text}`
}

/** Extracts one turn's text from the run's envelope, when present. */
function readTurnText(envelope: AiRuntimeEnvelope): string | undefined {
  const refs = envelope.allowedInputRefs ?? []
  const textRef = refs.find((r) => r.startsWith(TEXT_INPUT_REF_PREFIX))
  if (textRef) return textRef.slice(TEXT_INPUT_REF_PREFIX.length)
  // Tolerate an explicit `inputText` attachment (used by `resumeConversation`,
  // which receives its input directly rather than through a run).
  const inline = (envelope as AiRuntimeEnvelope & { inputText?: string }).inputText
  if (typeof inline === 'string' && inline.length > 0) return inline
  return undefined
}

/**
 * Reads a session id out of the opaque port input, validating it.
 *
 * Only a non-empty string is accepted; a wrong-typed value is rejected rather
 * than coerced, because a session id is the identifier §4.2 warns must not
 * become authority.
 */
function readSessionId(input: AiRuntimeInput): string | null {
  const raw = (input as { sessionId?: unknown }).sessionId
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

/** Builds a metadata event from a measured `Usage`, with its scope stated. */
function usageEvent(usage: unknown, scope: 'run' | 'session'): AiRuntimeStreamEvent {
  const u = (usage && typeof usage === 'object' ? usage : {}) as {
    input?: unknown
    output?: unknown
    model?: unknown
  }
  return {
    type: 'metadata',
    usageScope: scope,
    tokens: {
      input: typeof u.input === 'number' ? u.input : 0,
      output: typeof u.output === 'number' ? u.output : 0,
    },
    model: typeof u.model === 'string' ? u.model : undefined,
  }
}

/** The default factory: one adapter per client. */
export function createHermesPortAdapter(client: HermesGatewayPortClient): HermesPortAdapter {
  return new HermesPortAdapter({ client })
}
