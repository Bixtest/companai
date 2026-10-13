/**
 * The OpenCode runtime adapter — the FIRST engine behind the door (row 28, R28-2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `ai-runtime-port.ts` declares the door (`AiRuntimePort`). This file puts the
 * **existing, unchanged** OpenCode engine behind it, so that from now on the
 * chat route (R28-3) can reach an engine through the door instead of importing
 * `opencode-client` by name. This is the architecture document's
 * *"rewire first, delete second"* (§7/§9): OpenCode is **not** changed and
 * **not** removed — it becomes one implementation the door can hide.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES **NOT** DO
 * ─────────────────────────────────────────────────────────────────────────────
 *  - It does not add a new engine. No Hermes, no Python, no new model path.
 *  - It does not modify OpenCode: it calls `createOpenCodeClient()` and
 *    `handleOpenCodeMessage*` exactly as the chat route does today.
 *  - It does not move any caller (that is R28-3) and it does not delete
 *    anything (that is `N-8`, R28-6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HONEST BOUNDARY — what OpenCode actually supports
 * ─────────────────────────────────────────────────────────────────────────────
 * The port declares eight operations; an implementation must **say which it
 * honours** rather than pretend (`describeCapabilities().operations`). For the
 * OpenCode engine today, measured against `opencode-client.ts` /
 * `opencode-handlers.ts`:
 *
 *   describeCapabilities ✅  health + version come from `/global/health`.
 *   startRun             ✅  create (or resume) a session, register the run.
 *   streamRun            ✅  SSE streaming, mapped to typed events.
 *   cancelRun            ✅  a run is only live while `streamRun` is awaiting;
 *                            cancelling aborts the active stream, and is a
 *                            no-op (a *value*, not an error) otherwise.
 *   steerRun             ✗  OpenCode has no mid-run instruction channel that
 *                            respects our approval semantics — reported
 *                            **unsupported** (the doc: *"only if the approval
 *                            semantics exist"*).
 *   resumeConversation   ✅  `handleOpenCodeMessageStreaming` with a session id.
 *   resolveToolCall      ✗  OpenCode resolves tools **inside itself**; the
 *                            platform does not resolve each call through this
 *                            door yet. Reported unsupported so no caller
 *                            believes a tool call is platform-gated. (Wiring
 *                            platform-side resolution is later work, gated on
 *                            the §8 approval semantics.)
 *   completeRun          ✅  recorded in the adapter's run registry,
 *                            replay-safe (a second call reports
 *                            `alreadyComplete`).
 *
 * The two ✗ operations are **not** gaps to paper over: they are the honest
 * shape of the engine behind the door, and `describeCapabilities` states them.
 */

import { createLogger } from '@open-mercato/shared/lib/logger'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  OPENCODE_RUNTIME_IMPLEMENTATION,
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
import {
  handleOpenCodeHealth,
  handleOpenCodeMessageStreaming,
  type OpenCodeStreamEvent,
  type OpenCodeTestRequest,
} from './opencode-handlers'
import { pruneRunRegistry, resolveRunDeadline } from './ai-runtime-bounds'

const logger = createLogger('ai_assistant').child({ component: 'opencode-port' })

/**
 * One live run in the adapter's registry.
 *
 * A "run" is the platform's unit; the OpenCode "session" is the engine's. §4.2
 * insists the identifiers stay distinct, so the registry is the one place that
 * maps between them — nothing else may assume `runId === sessionId`.
 */
interface LiveRun {
  runId: string
  sessionId: string | null
  envelope: AiRuntimeEnvelope
  /**
   * `P2-6` (§2.12) — when this run was admitted, so `budget.milliseconds` (a
   * DURATION) is measured from the run rather than from the clock at the moment
   * a caller happens to ask. The bound itself is shared (`resolveRunDeadline`).
   */
  admittedAt: number
  /** The auth/EM context needed to resume or answer a session, when supplied. */
  auth?: OpenCodeTestRequest['auth']
  em?: EntityManager
  /** Set when `cancelRun` aborts this run; surfaced as a `cancelled` outcome. */
  cancelled: boolean
  /** Set when `completeRun` has recorded the run; makes completion replay-safe. */
  completed: boolean
  /**
   * `P2-5` (§2.11) — the engine that served this run, taken from the completion's
   * `provenance.implementation` and recorded ON THE RUN (readable via `getRun`).
   * Without this the caller's engine name is accepted by `completeRun` and
   * dropped — a write-only field that would make *"recorded on the run"* an
   * overclaim. Kept symmetric with the Hermes adapter.
   */
  implementation?: string
  /**
   * Every in-flight `streamRun` of this run. A set, not a single slot, because
   * two concurrent streams must BOTH be abortable — a single slot would let a
   * cancel reach only the last one (hostile-critic defect 3b).
   */
  aborts: Set<AbortController>
}

/** How the adapter is told which principal/session an engine call runs under. */
export interface OpenCodePortAdapterDeps {
  /**
   * The auth context for the run, when the caller has one. Required at runtime
   * to resume an EXISTING OpenCode session (the ownership guard fails closed),
   * exactly as `handleOpenCodeMessageStreaming` requires.
   */
  auth?: OpenCodeTestRequest['auth']
  /** The EntityManager used for the session-ownership check. */
  em?: EntityManager
  /** A model pin for the engine, when the caller has one. */
  model?: { providerID: string; modelID: string }
}

/**
 * Maps an OpenCode stream event to the port's generic event.
 *
 * The names are kept generic (`tool-call`, not OpenCode's spelling) but the
 * payloads pass through unchanged, so moving the chat route onto the door
 * (R28-3) is a re-plumbing, not a re-translation. The one addition is
 * `usageScope`: §4.3 requires a usage figure to state whether it is per-run or
 * cumulative, and this engine reports per-run totals for the turn.
 */
function toPortEvent(event: OpenCodeStreamEvent): AiRuntimeStreamEvent {
  switch (event.type) {
    case 'metadata':
      return {
        type: 'metadata',
        model: event.model,
        provider: event.provider,
        tokens: event.tokens,
        durationMs: event.durationMs,
        usageScope: 'run',
      }
    case 'done':
      return { type: 'done', sessionId: event.sessionId }
    case 'question':
      return { type: 'question', question: event.question }
    default:
      // thinking · text · tool-call · tool-result · debug · error — same shape,
      // carried through unchanged.
      return event
  }
}

/**
 * The OpenCode implementation of the runtime port.
 *
 * Construct one per process (it holds a run registry); callers that need a
 * different principal pass a different adapter, or use the per-run deps.
 */
export class OpenCodePortAdapter implements AiRuntimePort {
  private readonly runs = new Map<string, LiveRun>()
  private readonly deps: OpenCodePortAdapterDeps
  /** Monotonic counter so every resume gets a distinct run id (§4.2). */
  private resumeCounter = 0

  constructor(deps: OpenCodePortAdapterDeps = {}) {
    this.deps = deps
  }

  /** The run registry, for tests and for `completeRun`'s replay safety. */
  getRun(runId: string): LiveRun | undefined {
    return this.runs.get(runId)
  }

  /**
   * `P2-6` (§2.12) — how many runs the adapter still retains. The memory bound
   * is **asserted, not assumed**: a test drives more runs than the cap and reads
   * this, so "the registry is bounded" is a measurement rather than a claim.
   */
  retainedRunCount(): number {
    return this.runs.size
  }

  async describeCapabilities(runtimeVersion?: string): Promise<AiRuntimeCapabilities> {
    let health: AiRuntimeCapabilities['health'] = 'unknown'
    try {
      const report = await handleOpenCodeHealth()
      health = report.opencode?.healthy ? 'ok' : 'degraded'
    } catch {
      // A runtime that cannot be reached reports `down`, never a fabricated `ok`.
      health = 'down'
    }
    return {
      implementation: OPENCODE_RUNTIME_IMPLEMENTATION,
      runtimeVersion,
      toolDelivery: 'in-process',
      health,
      operations: {
        describeCapabilities: true,
        startRun: true,
        streamRun: true,
        cancelRun: true,
        steerRun: false,
        resumeConversation: true,
        resolveToolCall: false,
        completeRun: true,
      },
    }
  }

  /**
   * `startRun(envelope)` — accept a run the platform already admitted.
   *
   * The envelope carries the identity; this method registers the run and, when
   * `runtimeSessionId` is set, adopts that existing session (an explicit
   * resume, never implicit — §4.2). It does NOT begin streaming; `streamRun`
   * does. This mirrors the port's split between "the run exists" and "the run
   * is streaming".
   */
  async startRun(envelope: AiRuntimeEnvelope): Promise<AiRuntimeStartResult> {
    const existing = this.runs.get(envelope.runId)
    if (existing) {
      // Idempotent: a second `startRun` for the same run id does not restart it.
      return { runId: envelope.runId, runtimeSessionId: existing.sessionId ?? undefined }
    }

    const run: LiveRun = {
      runId: envelope.runId,
      sessionId: envelope.runtimeSessionId ?? null,
      envelope,
      admittedAt: Date.now(),
      auth: this.deps.auth,
      em: this.deps.em,
      cancelled: false,
      completed: false,
      aborts: new Set(),
    }
    this.runs.set(envelope.runId, run)
    // §2.12 — keep the registry bounded: once the cap is reached, FINISHED runs
    // are evicted oldest-first; a live run is never evicted.
    pruneRunRegistry(this.runs)
    return { runId: envelope.runId, runtimeSessionId: run.sessionId ?? undefined }
  }

  /**
   * `streamRun(runId)` — stream the run's ordered, typed events.
   *
   * Delegates to the unchanged `handleOpenCodeMessageStreaming`. The run must
   * have been started first (the door refuses an unadmitted run). A run
   * cancelled before streaming begins emits nothing and resolves.
   *
   * **The envelope's time bound is honoured (`P2-6` §2.12 — the `CC-76` fix).**
   * §4.2 puts two bounds in the envelope — `deadline` (an instant) and
   * `budget.milliseconds` (a duration) — and `resolveRunDeadline` takes the
   * sooner of them. A run already out of time streams the error instead of
   * spending a turn; a turn that outlives the bound reports it and stops
   * forwarding. As with cancellation, the engine's in-flight HTTP call is NOT
   * force-torn-down from here (this adapter holds no handle to do that), so the
   * bound is honoured **co-operatively, at the next event** — the honest
   * guarantee, stated rather than implied.
   */
  async streamRun(runId: string, onEvent: AiRuntimeEventSink): Promise<void> {
    const run = this.runs.get(runId)
    if (!run) {
      await onEvent({ type: 'error', error: `unknown run ${runId}` })
      return
    }
    if (run.cancelled) {
      return
    }

    const message = inputToMessage(run.envelope)
    if (!message) {
      await onEvent({ type: 'error', error: 'run has no input text' })
      return
    }

    const deadlineAt = resolveRunDeadline(run.envelope, run.admittedAt)
    if (deadlineAt !== null && deadlineAt <= Date.now()) {
      await onEvent({ type: 'error', error: 'the run exceeded its admission time bound before it could stream' })
      return
    }

    const abort = new AbortController()
    run.aborts.add(abort)

    let deadlineTimer: ReturnType<typeof setTimeout> | null = null
    let deadlinePassed = false
    // When the bound fires, the stream must END — not merely stop forwarding. A
    // caller awaiting `streamRun` is unblocked the moment the run is out of
    // time, even if the engine has stalled and will never yield. Hermes does the
    // same through its `settle()`; without this promise the two engines drift
    // (a stalled OpenCode turn would await forever while Hermes returned).
    let settleDeadline!: () => void
    const deadlineEnded = new Promise<void>((resolve) => {
      settleDeadline = resolve
    })
    if (deadlineAt !== null) {
      deadlineTimer = setTimeout(() => {
        if (deadlinePassed) return
        deadlinePassed = true
        void onEvent({ type: 'error', error: 'the run exceeded its admission time bound while streaming' }).then(
          settleDeadline,
          settleDeadline,
        )
      }, deadlineAt - Date.now())
    }

    const request: OpenCodeTestRequest = {
      message,
      sessionId: run.sessionId ?? undefined,
      model: this.deps.model,
      auth: run.auth,
      em: run.em,
    }

    try {
      const engineCall = handleOpenCodeMessageStreaming(request, async (event) => {
        // Cooperative cancellation AND the cooperative time bound. The engine
        // exposes no abort parameter (the HTTP/SSE call cannot be interrupted
        // mid-flight from here), so both are honoured at the NEXT event: once
        // `run.cancelled` is set or the deadline has passed, no further event is
        // forwarded and the consumer simply stops seeing output. That is the
        // honest guarantee — it is NOT a claim the engine is torn down instantly.
        if (run.cancelled || abort.signal.aborted || deadlinePassed) {
          return
        }
        // Adopt the session id the engine reports on `done` — the one place the
        // two identifiers are allowed to meet.
        if (event.type === 'done' && typeof event.sessionId === 'string') {
          run.sessionId = event.sessionId
        }
        await onEvent(toPortEvent(event))
      })
      // End at the bound even if the engine never yields: the race lets the
      // deadline resolve `streamRun`, while `deadlinePassed` keeps the stalled
      // engine's later events from being forwarded.
      await Promise.race([engineCall, deadlineEnded])
    } finally {
      if (deadlineTimer !== null) clearTimeout(deadlineTimer)
      run.aborts.delete(abort)
    }
  }

  /**
   * `cancelRun(runId)` — bounded and idempotent (§4.3).
   *
   * A cancel that finds nothing to stop is a *success with a reason*, never an
   * error. The second call finds the run already cancelled and reports
   * `cancelled: false` with `already-cancelled`.
   *
   * **What "cancelled" means for this engine:** the run is marked cancelled and
   * its consumer stops receiving events (cooperative cancellation — see
   * `streamRun`). The engine's in-flight HTTP call is not force-torn-down from
   * here, because this adapter has no handle to do that; that limit is named
   * rather than hidden.
   */
  async cancelRun(runId: string): Promise<AiRuntimeCancelResult> {
    const run = this.runs.get(runId)
    if (!run) {
      return { runId, cancelled: false, reason: 'not-found' }
    }
    // A completed run has nothing to cancel — regardless of whether a stream is
    // still winding down. Checked BEFORE `cancelled` so the result does not
    // depend on the order of cancel/complete calls (hostile-critic defect 3a).
    if (run.completed) {
      return { runId, cancelled: false, reason: 'already-complete' }
    }
    if (run.cancelled) {
      return { runId, cancelled: false, reason: 'already-cancelled' }
    }
    run.cancelled = true
    // Abort EVERY in-flight stream of this run, not just the last one started
    // (hostile-critic defect 3b). Aborting an already-idle run is a no-op.
    for (const controller of run.aborts) {
      controller.abort()
    }
    return { runId, cancelled: true }
  }

  /**
   * `steerRun(runId, instruction)` — UNSUPPORTED by this engine.
   *
   * OpenCode has no mid-run instruction channel that respects the platform's
   * approval semantics, so the adapter reports the truth rather than pretending
   * (the doc: *"only if the approval semantics exist"*). It throws a named
   * error so a caller cannot mistake a silent success for a delivered
   * instruction.
   */
  async steerRun(runId: string, _instruction: AiRuntimeInput): Promise<void> {
    throw new Error(`steerRun is not supported by the ${OPENCODE_RUNTIME_IMPLEMENTATION} runtime (run ${runId})`)
  }

  /**
   * `resumeConversation(binding, input)` — explicit session continuity.
   *
   * The binding names the conversation to continue; **each resume is a fresh
   * run** with its own run id, because §4.2 insists the identifiers stay
   * distinct (*"a run is not a conversation is not a session"*). Deriving the
   * run id from the conversation would make one entry stand for every run in
   * that conversation — the hostile critic showed that collapses completion
   * and cancellation across distinct runs (defects 4 and 7a).
   */
  async resumeConversation(
    binding: AiRuntimeResumeBinding,
    input: AiRuntimeInput,
  ): Promise<AiRuntimeStartResult> {
    const runId = this.mintResumeRunId(binding)
    const sessionId = readSessionId(input)

    const run: LiveRun = {
      runId,
      sessionId,
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
      // A resume envelope carries no `deadline`/`budget` (built here, not
      // admitted by the platform), so its bound is `null` — honest, not implied.
      admittedAt: Date.now(),
      auth: this.deps.auth,
      em: this.deps.em,
      cancelled: false,
      completed: false,
      aborts: new Set(),
    }
    this.runs.set(runId, run)
    pruneRunRegistry(this.runs)
    return { runId, runtimeSessionId: run.sessionId ?? undefined }
  }

  /** Mints a run id that is DISTINCT from the conversation it resumes (§4.2). */
  private mintResumeRunId(binding: AiRuntimeResumeBinding): string {
    const seq = ++this.resumeCounter
    return `${binding.tenantId}:${binding.agentId}:run-${seq}`
  }

  /**
   * `resolveToolCall(call, capabilityGrant)` — UNSUPPORTED by this engine.
   *
   * OpenCode runs its own tools internally; the platform does not yet resolve
   * each call through this door. Reporting it unsupported is the honest answer:
   * a caller must not believe a tool call is platform-gated when it is not.
   * (Platform-side resolution is later work behind the §8 approval semantics.)
   */
  async resolveToolCall(call: AiRuntimeToolCall, _capabilityGrant: string): Promise<void> {
    throw new Error(
      `resolveToolCall is not supported by the ${OPENCODE_RUNTIME_IMPLEMENTATION} runtime (call ${call.id})`,
    )
  }

  /**
   * `completeRun(runId, result)` — record the outcome; replay-safe (§4.3).
   *
   * The second call for the same run reports `alreadyComplete: true` and
   * changes nothing, so a retried "finished" message cannot double-count.
   */
  async completeRun(runId: string, result: AiRuntimeRunResult): Promise<AiRuntimeCompleteResult> {
    const run = this.runs.get(runId)
    if (!run) {
      // A completion for a run the adapter never saw is recorded as such — not
      // thrown, so a late/duplicate delivery is harmless.
      return { runId, completed: false, alreadyComplete: false }
    }
    if (run.completed) {
      return { runId, completed: false, alreadyComplete: true }
    }
    run.completed = true
    // `P2-5` — record WHICH engine served the run, so the ledger entry can say
    // so. Set here (not on replay) so a second completion cannot rewrite it.
    run.implementation = result.provenance?.implementation
    logger.debug('Run completed', {
      runId,
      status: result.status,
      usageScope: result.usage?.scope,
      implementation: result.provenance?.implementation,
    })
    return { runId, completed: true, alreadyComplete: false }
  }
}

/**
 * How a caller attaches this turn's text to an envelope.
 *
 * The port's envelope carries **references, not bodies** (§4.2), and
 * `streamRun(runId)` takes no input — so the turn's text travels as an
 * allowed-input reference. This engine understands one reference scheme, named
 * here so the convention lives in ONE place rather than being string-matched
 * across the codebase:
 *
 *   `text:<the user's message>`   → the engine sends this text to the session.
 *
 * A future engine with real input storage would resolve a different scheme
 * (`blob:…`, `record:…`); the door does not care which, and this prefix is the
 * OpenCode adapter's own convention, not part of the port.
 */
const TEXT_INPUT_REF_PREFIX = 'text:'

/** Builds the allowed-input reference that carries one turn's text. */
export function textInputRef(text: string): string {
  return `${TEXT_INPUT_REF_PREFIX}${text}`
}

/**
 * Reads a session id out of the opaque port input, validating it.
 *
 * `AiRuntimeInput` has an index signature, so `input.sessionId` is `unknown`.
 * Casting it would let a non-string (the hostile critic fed a `number`) flow to
 * the engine as a session id — the exact identifier §4.2 warns must not become
 * authority (defect 7b). Only a non-empty string is accepted; anything else is
 * treated as "no session", and a wrong-typed value is rejected rather than
 * coerced.
 */
function readSessionId(input: AiRuntimeInput): string | null {
  const raw = (input as { sessionId?: unknown }).sessionId
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

/** Extracts one turn's text from the run's envelope, when present. */
function inputToMessage(envelope: AiRuntimeEnvelope): string | undefined {
  const refs = envelope.allowedInputRefs ?? []
  const textRef = refs.find((r) => r.startsWith(TEXT_INPUT_REF_PREFIX))
  if (textRef) return textRef.slice(TEXT_INPUT_REF_PREFIX.length)
  // Tolerate an explicit `inputText` attachment (used by resumeConversation,
  // which receives its input directly rather than through a run).
  const inline = (envelope as AiRuntimeEnvelope & { inputText?: string }).inputText
  if (typeof inline === 'string' && inline.length > 0) return inline
  return undefined
}

/** The default, env-configured adapter. */
export function createOpenCodePortAdapter(deps: OpenCodePortAdapterDeps = {}): OpenCodePortAdapter {
  return new OpenCodePortAdapter(deps)
}
