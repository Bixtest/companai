/**
 * The PLATFORM-RUNTIME adapter — the SECOND engine behind the door (row 28, `CC-67`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `ai-runtime-port.ts` declares the door (`AiRuntimePort`). `opencode-port-adapter.ts`
 * puts the **OpenCode** engine behind it (R28-2). This file puts the platform's
 * **own in-process AI SDK runtime** (`agent-runtime.ts` — `runAiAgentText` /
 * `runAiAgentObject`) behind the SAME door, so that the last two callers that
 * reach `agent-runtime` by name (`api/ai/chat/route.ts`, `api/ai/run-object/route.ts`
 * and `lib/business-ir-author.ts`) can reach an engine **through the door** instead.
 *
 * This is the change row 28's sentence needs: *"the agent runtime sits behind one
 * typed door — no other code talks to it directly."*
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SECOND ADAPTER, AND NOT THE OPencode ONE
 * ─────────────────────────────────────────────────────────────────────────────
 * These two callers are **not the same engine as the chat route's**. The chat
 * route (`api/chat/route.ts`, R28-3) speaks to OpenCode over HTTP/SSE; these two
 * call the platform's own AI SDK loop **in-process**. A port exists precisely so
 * that two implementations can share one interface — that is the whole point.
 *
 * The port's envelope (§4.2) carries **identity + references only**. These two
 * callers additionally need three things the envelope *must not* hold: the live DI
 * `container`, the full per-request authorization context
 * (`features`/`isSuperAdmin`/`onBehalfOfUserId`/`boundScope`), and a
 * `UIMessage[]`. Inlining any of those would be exactly the *"live objects and
 * secrets inlined"* §4.2/§8 forbid. So they travel on the **adapter's
 * construction** — the caller builds the adapter with its deps, exactly as
 * `createOpenCodePortAdapter({ auth, em })` does — never inside the envelope.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HONEST SPLIT — a value path and a stream path
 * ─────────────────────────────────────────────────────────────────────────────
 * The two engine functions differ in what they RETURN, and the adapter states
 * that difference rather than pretending it away:
 *
 *   `runAiAgentObject` → a **structured value** (`RunAiAgentObjectResult`).
 *       Maps onto `startRun` + `completeRun` with an `AiRuntimeRunResult`; the
 *       value is stashed on the run and read back through `getObjectResult`.
 *       No stream to tee.
 *
 *   `runAiAgentText` → a **streaming `Response`** (the AI SDK's UI-message SSE).
 *       Maps onto `startRun` + `streamRun` + `completeRun`. **The response is
 *       NOT re-framed:** the client consumes these exact bytes with the AI SDK's
 *       `DefaultChatTransport` (`agent-transport.ts`), and the route's own
 *       `persistAssistantOnStreamCompletion` reads the same bytes. Re-encoding
 *       them into port events and writing *those* back would change what a user
 *       sees. So `streamRun` **TEES** the body: the caller keeps the original
 *       `Response` (bytes and headers unchanged) and the adapter reads a *copy*
 *       to raise port events for the door only (so `completeRun` has an honest
 *       outcome and `cancelRun` has a live thing to stop). The tee never mutates
 *       what the client receives.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES **NOT** DO
 * ─────────────────────────────────────────────────────────────────────────────
 *  - It does not modify `agent-runtime.ts`. The engine is unchanged (rewire
 *    first, delete second — §7/§9).
 *  - It does not extend the envelope, and it inlines no live object into one.
 *  - It does not change any behaviour a user or a program sees: the same policy
 *    gate, the same binding re-check (`CC-27`), the same narrowing (`CC-55`),
 *    the same persistence and the same SSE/JSON shapes.
 *  - It does not delete anything (that is `N-8`, R28-6).
 */

import { createLogger } from '@open-mercato/shared/lib/logger'
import type { AwilixContainer } from 'awilix'
import type { UIMessage } from 'ai'
import {
  runAiAgentObject,
  runAiAgentText,
  type RunAiAgentObjectResult,
  type RunAiAgentTextInput,
} from './agent-runtime'

/**
 * Re-exported through the door so a caller routing its engine calls through the
 * adapter needs NO import from `agent-runtime` at all (row 28 / `CC-67`).
 *
 * This is a **pure** helper (a preset → loop-config switch — no engine, no AI
 * SDK), so it carries no engine behind the door; it lives in `agent-runtime.ts`
 * for historical reasons and is surfaced here to keep the route's imports clean.
 */
export {
  resolveLoopBudgetPreset,
  type AiAgentLoopBudgetPreset,
} from './agent-runtime'
import type { AiChatRequestContext } from './attachment-bridge-types'
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
import { pruneRunRegistry } from './ai-runtime-bounds'

const logger = createLogger('ai_assistant').child({ component: 'agent-runtime-port' })

/** The implementation name the port reports for this adapter. */
export const PLATFORM_RUNTIME_IMPLEMENTATION = 'platform' as const

/**
 * The per-request deps the adapter is constructed with.
 *
 * These are exactly the things the two callers hold and the envelope cannot: the
 * DI container, the resolved authorization context, and the narrowing-only bound
 * scope. Passing them here (per request) keeps the §4.2 envelope generic — the
 * same discipline the OpenCode adapter follows with `{ auth, em }`.
 */
export interface AgentRuntimePortAdapterDeps {
  /**
   * The auth context the engine call executes under — `features`/`isSuperAdmin`/
   * `onBehalfOfUserId`, resolved by the route before the run. Every scope
   * decision comes from here, never from the envelope's identity fields alone.
   */
  authContext: AiChatRequestContext
  /** The DI container the engine uses (page-context hydration, tool resolution). */
  container?: AwilixContainer
  /**
   * `CC-55` — the narrowing-only bound scope from an `ai_agent_bindings` row.
   * Omitted ⇒ byte-identical to the pre-`CC-55` behaviour (the engine's default).
   */
  boundScope?: { allowedTools: string[]; requiredFeatures: string[] }
  /** Optional per-call loop config (chat path). */
  loop?: RunAiAgentTextInput['loop']
  /** Chat path: whether the engine appends the `loop-finish` SSE event. */
  emitLoopTrace?: boolean
  /** Optional per-request provider/model/baseURL override. */
  requestOverride?: RunAiAgentTextInput['requestOverride']
  /** Optional model pin (object path). */
  modelOverride?: string
}

/**
 * One live run in the adapter's registry.
 *
 * A "run" is the platform's unit; the engine has no separate session id in the
 * in-process path, so `sessionId` is the platform conversation/session id the
 * caller supplied (kept distinct from `runId` — §4.2). The registry is the one
 * place that maps between them.
 */
interface LiveRun {
  runId: string
  sessionId: string | null
  envelope: AiRuntimeEnvelope
  /**
   * The turn's input, attached by the caller through
   * {@link attachRunInput} — not read from the envelope, which carries
   * references only (§4.2). This is the adapter's own carrier for the rich
   * input (`UIMessage[]`, attachment ids, page context) that the envelope must
   * not hold.
   */
  input?: RunInput
  /** The ORIGINAL engine `Response` for a text run (the tee's source). */
  textResponse?: Response
  /** Set when `cancelRun` aborts this run; surfaced as a `cancelled` outcome. */
  cancelled: boolean
  /** Set when `completeRun` has recorded the run; makes completion replay-safe. */
  completed: boolean
  /**
   * Every in-flight `streamRun` of this run. A set, not a single slot, so two
   * concurrent streams are BOTH abortable (the OpenCode adapter's hostile-critic
   * defect 3b).
   */
  aborts: Set<AbortController>
}

/** The rich input a caller attaches to a run (the envelope cannot hold it). */
export interface RunInput {
  messages: unknown
  attachmentIds?: string[]
  pageContext?: Record<string, unknown>
  debug?: boolean
  /**
   * The platform session/conversation ids for the engine call. Kept as the
   * caller supplied them (the two names are the engine's own deprecated alias
   * pair) so moving the caller onto the door does not change either value.
   */
  sessionId?: string | null
  conversationId?: string | null
}

/**
 * The platform-runtime implementation of the port.
 *
 * Construct one **per request** with the caller's deps; a run registry is held
 * for the lifetime of the instance. Callers talk only to the port they get back.
 */
export class AgentRuntimePortAdapter implements AiRuntimePort {
  private readonly runs = new Map<string, LiveRun>()
  private readonly deps: AgentRuntimePortAdapterDeps
  /** Monotonic counter so every resume gets a distinct run id (§4.2). */
  private resumeCounter = 0

  constructor(deps: AgentRuntimePortAdapterDeps) {
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

  /**
   * `describeCapabilities(runtimeVersion)` — this engine is in-process, so its
   * health is "ok" when it is constructible at all (there is no remote to probe).
   * `steerRun` and `resolveToolCall` are reported UNSUPPORTED for the same
   * reason the OpenCode adapter reports them: the platform's loop resolves its
   * own tools internally and the port's tool-approval channel is not wired yet.
   * Reporting the truth stops a caller believing a tool call is platform-gated.
   */
  async describeCapabilities(runtimeVersion?: string): Promise<AiRuntimeCapabilities> {
    return {
      implementation: PLATFORM_RUNTIME_IMPLEMENTATION,
      runtimeVersion,
      toolDelivery: 'in-process',
      health: 'ok',
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
   * Registers the run and adopts `runtimeSessionId` when set (an explicit
   * resume). Idempotent: a second `startRun` for the same id does not restart.
   */
  async startRun(envelope: AiRuntimeEnvelope): Promise<AiRuntimeStartResult> {
    const existing = this.runs.get(envelope.runId)
    if (existing) {
      return { runId: envelope.runId, runtimeSessionId: existing.sessionId ?? undefined }
    }
    const run: LiveRun = {
      runId: envelope.runId,
      sessionId: envelope.runtimeSessionId ?? null,
      envelope,
      cancelled: false,
      completed: false,
      aborts: new Set(),
    }
    this.runs.set(envelope.runId, run)
    // §2.12 — the SAME shared bound every adapter applies: once the cap is
    // reached, FINISHED runs are evicted oldest-first and a live run is never
    // evicted. This engine does not own its byte stream (it stashes a `Response`
    // for the caller to drain), so it applies the MEMORY bound only; the
    // wall-clock `deadline`/`budget` bound belongs to the two stream-owning chat
    // adapters (Hermes, OpenCode).
    pruneRunRegistry(this.runs)
    return { runId: envelope.runId, runtimeSessionId: run.sessionId ?? undefined }
  }

  /**
   * `streamRun(runId, onEvent)` — open a TEXT run behind the door.
   *
   * **This does NOT re-frame the engine's stream.** The engine
   * (`runAiAgentText`) returns a `Response` whose body is the AI SDK's
   * UI-message SSE; the client consumes those exact bytes with the AI SDK's
   * `DefaultChatTransport`, and the caller's own persistence wrapper reads the
   * same bytes. A `Response.body` is a SINGLE-USE stream — so if this method
   * drained it to raise events, the caller could never hand it to the client.
   * Re-encoding those bytes into port events and writing *those* out would
   * change what a user sees.
   *
   * **So the honest split is:** this method performs the engine call, **records
   * the run** (so `completeRun` has an honest outcome and `cancelRun` has a live
   * thing to stop), and raises the two door-level events the port needs
   * (`status`, then `done`). The **byte-level tee stays where it already is** —
   * in the caller's existing stream wrapper (`persistAssistantOnStreamCompletion`
   * for `api/ai/chat`), which forwards every chunk to the client unchanged. The
   * caller retrieves the engine's `Response` with {@link responseForRun} and
   * hands it to the client itself.
   *
   * **The honest limit (stated, not hidden).** Because the caller owns the body,
   * the port's `text` events are not the per-token stream — they are a
   * door-level open/close signal. That is enough for what the door guarantees
   * today (a recorded, cancellable run); a future engine whose events the door
   * must fully own would re-plumb the tee, which is `R28-5`'s territory, not a
   * pretence to add here.
   */
  async streamRun(runId: string, onEvent: AiRuntimeEventSink): Promise<void> {
    const run = this.runs.get(runId)
    if (!run) {
      await onEvent({ type: 'error', error: `unknown run ${runId}` })
      return
    }
    if (run.cancelled) return

    const input = run.input
    if (!input || input.messages === undefined) {
      await onEvent({ type: 'error', error: 'run has no input attached' })
      return
    }

    const abort = new AbortController()
    run.aborts.add(abort)

    try {
      const response = await runAiAgentText({
        agentId: run.envelope.agentId,
        messages: input.messages as UIMessage[],
        ...(input.attachmentIds ? { attachmentIds: input.attachmentIds } : {}),
        ...(input.pageContext ? { pageContext: input.pageContext } : {}),
        ...(input.debug !== undefined ? { debug: input.debug } : {}),
        sessionId: input.sessionId !== undefined ? input.sessionId : run.sessionId,
        conversationId: input.conversationId !== undefined ? input.conversationId : run.sessionId,
        boundScope: this.deps.boundScope,
        authContext: this.deps.authContext,
        container: this.deps.container,
        ...(this.deps.requestOverride ? { requestOverride: this.deps.requestOverride } : {}),
        ...(this.deps.loop ? { loop: this.deps.loop } : {}),
        ...(this.deps.emitLoopTrace !== undefined ? { emitLoopTrace: this.deps.emitLoopTrace } : {}),
      })

      // Stash the ORIGINAL response so the caller can hand the client the exact
      // bytes the engine produced (never a drained or re-encoded copy). This is
      // also the run's record that an engine call happened.
      run.textResponse = response

      // A run cancelled while the engine was starting emits nothing further.
      if (!run.cancelled) {
        await onEvent({ type: 'status', status: 'streaming' })
        await onEvent({ type: 'done' })
      }
    } finally {
      run.aborts.delete(abort)
    }
  }

  /** The original engine `Response` for a text run, for the caller to hand out. */
  responseForRun(runId: string): Response | undefined {
    return this.runs.get(runId)?.textResponse
  }

  /**
   * Run a structured-OUTPUT (object) run. Not one of the port's eight operations
   * — the port has no "return me an object" op, and inventing a ninth would be a
   * design decision, not a wiring move. This is the adapter's own op, used by the
   * two object callers (`api/ai/run-object/route.ts`, `lib/business-ir-author.ts`),
   * who reach the door by building the adapter and calling this.
   *
   * **What this deliberately does NOT do (the honest boundary).** It does not
   * open or close a *registered* run (`startRun`/`completeRun`): an object call
   * is a single structured-output turn with no stream to cancel, and the object
   * callers never asked the door to track one (the pre-`CC-67` engine call did
   * not either — this is not a regression, it is the same behaviour behind the
   * door). The engine call itself is unchanged; only the *path to it* now goes
   * through this adapter rather than a named import. A future engine whose
   * accounting must see object runs would add that registration deliberately.
   */
  async runObjectForRun<T = unknown>(input: {
    agentId: string
    prompt: string | UIMessage[]
    sessionId?: string | null
    attachmentIds?: string[]
    pageContext?: Record<string, unknown>
    modelOverride?: string
    output?: { schemaName: string; schema: unknown; mode?: 'generate' | 'stream' }
  }): Promise<RunAiAgentObjectResult<T>> {
    return runAiAgentObject<T>({
      agentId: input.agentId,
      input: input.prompt,
      ...(input.attachmentIds ? { attachmentIds: input.attachmentIds } : {}),
      ...(input.pageContext ? { pageContext: input.pageContext } : {}),
      authContext: this.deps.authContext,
      ...(this.deps.container !== undefined ? { container: this.deps.container } : {}),
      boundScope: this.deps.boundScope,
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
      modelOverride: input.modelOverride ?? this.deps.modelOverride,
      ...(input.output
        ? { output: { schemaName: input.output.schemaName, schema: input.output.schema, mode: input.output.mode } }
        : {}),
    } as never) as Promise<RunAiAgentObjectResult<T>>
  }

  /**
   * `cancelRun(runId)` — bounded and idempotent (§4.3). Mirrors the OpenCode
   * adapter: a completed run cannot be cancelled (`already-complete` is checked
   * BEFORE `cancelled`, so the result does not depend on call order); a second
   * cancel reports `already-cancelled`.
   */
  async cancelRun(runId: string): Promise<AiRuntimeCancelResult> {
    const run = this.runs.get(runId)
    if (!run) return { runId, cancelled: false, reason: 'not-found' }
    if (run.completed) return { runId, cancelled: false, reason: 'already-complete' }
    if (run.cancelled) return { runId, cancelled: false, reason: 'already-cancelled' }
    run.cancelled = true
    for (const controller of run.aborts) controller.abort()
    return { runId, cancelled: true }
  }

  /** `steerRun` — unsupported (see `describeCapabilities`). */
  async steerRun(runId: string, _instruction: AiRuntimeInput): Promise<void> {
    throw new Error(`steerRun is not supported by the ${PLATFORM_RUNTIME_IMPLEMENTATION} runtime (run ${runId})`)
  }

  /**
   * `resumeConversation(binding, input)` — explicit continuity; each resume is a
   * fresh run with its own id, so a conversation id never stands for every run in
   * it (§4.2).
   */
  async resumeConversation(
    binding: AiRuntimeResumeBinding,
    input: AiRuntimeInput,
  ): Promise<AiRuntimeStartResult> {
    const seq = ++this.resumeCounter
    const runId = `${binding.tenantId}:${binding.agentId}:run-${seq}`
    const sessionId = readSessionId(input)
    const envelope: AiRuntimeEnvelope = {
      schemaVersion: 1,
      runId,
      tenantId: binding.tenantId,
      principalId: binding.principalId,
      actorId: binding.actorId,
      agentId: binding.agentId,
      conversationId: binding.conversationId,
      runtimeSessionId: sessionId,
      capabilityGrantId: binding.capabilityGrantId,
      allowedInputRefs: [],
    }
    this.runs.set(runId, {
      runId,
      sessionId,
      envelope,
      cancelled: false,
      completed: false,
      aborts: new Set(),
    })
    // §2.12 — the same shared memory bound as `startRun` (see there).
    pruneRunRegistry(this.runs)
    return { runId, runtimeSessionId: sessionId ?? undefined }
  }

  /** `resolveToolCall` — unsupported (see `describeCapabilities`). */
  async resolveToolCall(call: AiRuntimeToolCall, _capabilityGrant: string): Promise<void> {
    throw new Error(
      `resolveToolCall is not supported by the ${PLATFORM_RUNTIME_IMPLEMENTATION} runtime (call ${call.id})`,
    )
  }

  /**
   * `completeRun(runId, result)` — record the outcome; replay-safe (§4.3). A
   * second call reports `alreadyComplete` and changes nothing.
   */
  async completeRun(runId: string, result: AiRuntimeRunResult): Promise<AiRuntimeCompleteResult> {
    const run = this.runs.get(runId)
    if (!run) return { runId, completed: false, alreadyComplete: false }
    if (run.completed) return { runId, completed: false, alreadyComplete: true }
    run.completed = true
    logger.debug('Platform run completed', { runId, status: result.status })
    return { runId, completed: true, alreadyComplete: false }
  }
}

/**
 * Attaches the turn's rich input to a run.
 *
 * The envelope carries **references, not bodies** (§4.2), so the full
 * `UIMessage[]` (and attachment ids / page context) a text run needs cannot ride
 * inside it. The caller attaches them to the run it just started, and the adapter
 * reads them back in `streamRun`. This is the adapter's own carrier — the
 * envelope is never widened, and nothing the caller passes here enters it.
 */
export function attachRunInput(
  port: AgentRuntimePortAdapter,
  runId: string,
  input: RunInput,
): void {
  const run = port.getRun(runId)
  if (run) run.input = input
}

/** Reads a session id out of the opaque port input, validating it (§4.2). */
function readSessionId(input: AiRuntimeInput): string | null {
  const raw = (input as { sessionId?: unknown }).sessionId
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

/** The default adapter factory — the second engine's entry point. */
export function createAgentRuntimePortAdapter(deps: AgentRuntimePortAdapterDeps): AgentRuntimePortAdapter {
  return new AgentRuntimePortAdapter(deps)
}
