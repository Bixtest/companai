/**
 * The agent runtime port — the ONE typed door (LIST row 28, Phase 8).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * LIST row 28: *"the agent runtime sits behind one typed door — no other code
 * talks to it directly."* Today that sentence is false: the chat route imports
 * an engine by name (`api/chat/route.ts` → `opencode-client`), and two further
 * callers reach the platform's own engine directly. This file is the door.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS — AND WHAT IT IS NOT
 * ─────────────────────────────────────────────────────────────────────────────
 * This file is DEFINITIONS ONLY. It declares the shape of the door: the
 * operations every caller uses, and the envelope every implementation must
 * obey. It contains no engine, no OpenCode import, no AI SDK call — and it
 * deliberately has NO runtime dependency at all (it imports nothing), so any
 * caller can import the types without dragging an engine in behind them.
 *
 * The first implementation of this interface is `opencode-port-adapter.ts`,
 * which puts the EXISTING OpenCode engine behind the door unchanged (row 28
 * sub-row R28-2 — *"rewire first, delete second"*, per
 * `ARCHITECTURE-hermes-integration.md` §7/§9). Moving the chat route onto the
 * door is sub-row R28-3. Hermes itself is NOT here — it arrives later, behind
 * this same door, once the security gates in that document's §8 are met.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EIGHT OPERATIONS — copied faithfully from `ARCHITECTURE-hermes-integration.md` §4.1
 * ─────────────────────────────────────────────────────────────────────────────
 * The architecture document gives the exact shape, and this file follows it —
 * including the arguments that are easy to drop and must NOT be:
 * `resolveToolCall(call, capabilityGrant)` and the `capabilityGrantId` in the
 * envelope, because §4.1 calls that *"the ONLY path to a business operation"*.
 *
 *   describeCapabilities(runtimeVersion)   -> runtime version, tools, limits, health
 *   startRun(admittedEnvelope)             -> accepts a run the platform already authorized
 *   streamRun(runId)                       -> ordered, typed events (text, tool, status, usage)
 *   cancelRun(runId)                       -> bounded, idempotent
 *   steerRun(runId, instruction)           -> only if the approval semantics exist
 *   resumeConversation(binding, input)     -> explicit session continuity, never implicit
 *   resolveToolCall(call, capabilityGrant) -> the ONLY path to a business operation
 *   completeRun(runId, result)             -> structured outcome, usage, provenance; idempotent
 */

// ─────────────────────────────────────────────────────────────────────────────
// The envelope (§4.2) — server-generated, immutable, versioned
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The admitted envelope: what the platform hands the runtime for one run.
 *
 * §4.2 says it "carries: schema version, run id, tenant id, principal/actor id,
 * agent id and kind, task or work id, platform conversation or room id, the
 * runtime session id, capability grant id, policy and model versions, allowed
 * input references, a deadline, a budget, and a correlation id."
 *
 * It is **admitted** by the platform before the runtime ever sees it — a run
 * reaches the runtime only after authorization. Three rules (§4.2) shape these
 * fields:
 *  - **identity is minted server-side** and read-only to the runtime;
 *  - **secrets are referenced, never inlined** (`secretRefs`, not values);
 *  - **the identifiers stay distinct** — a run is not a conversation is not a
 *    session is not a task is not a room.
 */
export interface AiRuntimeEnvelope {
  /** Schema version of this envelope, so a runtime can reject one it cannot read. */
  schemaVersion: number
  /** Identifies THIS run (one attempt). A retry is a new run id. */
  runId: string
  /** The tenant the run belongs to. Server-minted; the runtime cannot name its own. */
  tenantId: string
  /** The acting principal (a person, or the AI worker subject). Server-minted. */
  principalId: string
  /** The acting user/actor id, kept distinct from the principal for audit. */
  actorId: string
  /** Which agent definition runs. */
  agentId: string
  /** The agent's kind (`personal · role · context · independent · system`). */
  agentKind?: string
  /** The task or work item this run serves, when there is one. */
  taskId?: string | null
  /** The platform conversation/room the run belongs to. Distinct from the run id. */
  conversationId: string
  /**
   * The runtime's own session id, once known. Distinct from every other id —
   * this is the field §4.2 warns about: a "session" must not become authority.
   */
  runtimeSessionId?: string | null
  /**
   * The capability grant this run acts under. **Required by §4.1's
   * `resolveToolCall`** as the only path to a business operation; the runtime
   * may narrow it, never widen it (a model-widened grant is forbidden, §8).
   */
  capabilityGrantId: string
  /** The policy version in force when the run was admitted (for the ledger). */
  policyVersion?: string
  /** The model version/pin in force (for provenance). */
  modelVersion?: string
  /**
   * The secret *references* the runtime may redeem — never values. §4.2:
   * nothing secret is ever model-visible or written to a prompt, log or
   * instruction.
   */
  secretRefs?: AiRuntimeSecretRef[]
  /** References to the inputs the run is allowed to read. */
  allowedInputRefs?: string[]
  /** A deadline, so a run cannot outlive its admission. */
  deadline?: string | Date | null
  /** A budget for the run, so cost cannot run away. */
  budget?: AiRuntimeBudget | null
  /** A correlation id tying every log and ledger entry of the run together. */
  correlationId?: string
}

/** A cost/effort ceiling for a run (§4.2 "a budget"). Kept as an open shape. */
export interface AiRuntimeBudget {
  /** A token ceiling for the run, when bounded by tokens. */
  tokens?: number
  /** A wall-clock ceiling in milliseconds, when bounded by time. */
  milliseconds?: number
  /** A spend ceiling, when bounded by money. */
  amount?: number
  currency?: string
}

/**
 * A handle to a secret, NOT the secret (§4.2).
 *
 * The runtime receives a *reference* it can redeem for one narrow purpose. A
 * `string` could be either a name or a value, and the compiler cannot tell you
 * which; this type cannot be confused with a credential because there is no
 * field that could hold one.
 */
export interface AiRuntimeSecretRef {
  /** Which secret store holds it. */
  scope: string
  /** The key's name within that store. Not the value. */
  name: string
  /** The one narrow purpose this reference may be redeemed for. */
  purpose?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// describeCapabilities — what this runtime can do
// ─────────────────────────────────────────────────────────────────────────────

/** A plain description of what an implementation supports (§4.1). */
export interface AiRuntimeCapabilities {
  /** A stable name for the implementation, e.g. `'opencode'` or `'hermes'`. */
  implementation: string
  /** The runtime version, echoing back the `runtimeVersion` the caller asked about. */
  runtimeVersion?: string
  /** How tools are delivered to the runtime, e.g. `'in-process'` or `'http'`. */
  toolDelivery?: string
  /** Any limits the runtime imposes (message size, tool count, etc.). */
  limits?: Record<string, number | string>
  /** A coarse health report. */
  health?: 'ok' | 'degraded' | 'down' | 'unknown'
  /**
   * Which of the port's operations this implementation actually honours. An
   * operation omitted here must be treated by callers as unsupported — the port
   * does not pretend.
   */
  operations: {
    describeCapabilities: boolean
    startRun: boolean
    streamRun: boolean
    cancelRun: boolean
    steerRun: boolean
    resumeConversation: boolean
    resolveToolCall: boolean
    completeRun: boolean
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Events — what a streaming run emits (§4.1 "ordered, typed events")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One event from a streaming run. §4.1 says *"ordered, typed events (text,
 * tool, status, usage)"*; the shapes mirror what the platform already emits
 * (`opencode-handlers.ts`'s `OpenCodeStreamEvent`) so that moving the chat
 * route onto the door is a re-plumbing, not a re-translation — while the names
 * stay generic (`text`, `tool-call`) rather than engine-specific.
 */
export type AiRuntimeStreamEvent =
  | { type: 'thinking' }
  | { type: 'status'; status: string }
  | { type: 'text'; content: string }
  | { type: 'tool-call'; id: string; toolName: string; args: unknown }
  | { type: 'tool-result'; id: string; result: unknown }
  | { type: 'question'; question: unknown }
  | {
      type: 'metadata'
      model?: string
      provider?: string
      /** §4.3: a usage figure must say whether it is per-run or cumulative. */
      usageScope?: 'run' | 'session'
      tokens?: { input: number; output: number }
      durationMs?: number
    }
  | { type: 'debug'; partType: string; data: unknown }
  | { type: 'done'; sessionId?: string }
  | { type: 'error'; error: string }

/** Called for every event of a streaming run. Awaitable so back-pressure works. */
export type AiRuntimeEventSink = (event: AiRuntimeStreamEvent) => Promise<void>

// ─────────────────────────────────────────────────────────────────────────────
// cancelRun / completeRun — results that are VALUES, not exceptions (§4.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The result of asking to cancel (§4.3 *"bounded and idempotent"*).
 *
 * A cancel that finds nothing to cancel is a *success with a reason*, not an
 * error: `cancelled: false` plus a `reason`. An implementation must be safe to
 * call twice — the second call finds the run already gone and returns
 * `cancelled: false`, and must not throw.
 */
export interface AiRuntimeCancelResult {
  runId: string
  /** True when this call is what stopped the run. */
  cancelled: boolean
  /** Why it was not cancelled, when `cancelled` is false. */
  reason?: 'not-found' | 'already-complete' | 'already-cancelled' | 'unsupported'
}

/**
 * The structured outcome of a completed run (§4.1 *"structured outcome, usage,
 * provenance"*; §4.3 *"must be safe to deliver twice, usage events must say
 * whether a figure is per-run or cumulative, and an unknown provider must stay
 * unknown rather than be guessed into a paid figure"*).
 */
export interface AiRuntimeRunResult {
  /** Whether the run finished successfully. */
  status: 'completed' | 'failed' | 'cancelled'
  /** Usage for the run, with its scope stated explicitly (never guessed). */
  usage?: {
    scope: 'run' | 'session'
    inputTokens?: number
    outputTokens?: number
    /** Left undefined when the provider is unknown — never fabricated. */
    provider?: string
    model?: string
  }
  /** Provenance for the ledger: which policy and model were in force. */
  provenance?: {
    policyVersion?: string
    modelVersion?: string
    correlationId?: string
  }
  /** A failure message, when `status` is not `completed`. */
  error?: string
}

/**
 * The result of reporting a run finished (§4.3: **replay-safe**).
 *
 * Calling it twice for the same `runId` must be harmless — the second call
 * reports `alreadyComplete: true` and changes nothing. This is what stops a
 * retried or duplicated "finished" message double-counting usage, re-firing a
 * follow-up, or overwriting a later run's terminal state.
 */
export interface AiRuntimeCompleteResult {
  runId: string
  /** True when THIS call recorded the completion. */
  completed: boolean
  /** True when the run was already recorded complete before this call. */
  alreadyComplete: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveToolCall — the ONLY path to a business operation (§4.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A tool call the runtime is asking the platform to resolve.
 *
 * §4.1 marks `resolveToolCall(call, capabilityGrant)` as *"the ONLY path to a
 * business operation"*. Both arguments are therefore part of the contract, and
 * the `capabilityGrant` is not optional: a tool call without a grant is exactly
 * the "business mutation outside the typed command path and its approval" that
 * §8 forbids.
 */
export interface AiRuntimeToolCall {
  /** The runtime's id for this call, echoed back in the result. */
  id: string
  /** The tool being called. */
  toolName: string
  /** The call's arguments, validated by the platform before execution. */
  args: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// The port itself — the eight operations, one door
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The one typed door. Every caller that wants an agent run depends on THIS —
 * never on `opencode-client`, `agent-runtime` or any engine by name.
 *
 * The eight operations below are transcribed one-for-one from the architecture
 * document §4.1; each signature keeps every argument the document names.
 */
export interface AiRuntimePort {
  /**
   * `describeCapabilities(runtimeVersion)` — report version, tool delivery,
   * limits and health for a given runtime version.
   */
  describeCapabilities(runtimeVersion?: string): Promise<AiRuntimeCapabilities>

  /**
   * `startRun(admittedEnvelope)` — accept a run the platform already
   * authorized. The envelope is the whole input; a run the platform did not
   * admit must never be started.
   */
  startRun(envelope: AiRuntimeEnvelope): Promise<AiRuntimeStartResult>

  /**
   * `streamRun(runId)` — begin streaming an already-started run's ordered,
   * typed events to `onEvent`, resolving when the run reaches a terminal state.
   * This is the operation the chat route moves onto (sub-row R28-3).
   */
  streamRun(runId: string, onEvent: AiRuntimeEventSink): Promise<void>

  /** `cancelRun(runId)` — bounded and idempotent; safe to call twice. */
  cancelRun(runId: string): Promise<AiRuntimeCancelResult>

  /**
   * `steerRun(runId, instruction)` — send more instruction into a run in
   * flight. The document notes this is *"only if the approval semantics
   * exist"* — so an implementation may report it unsupported rather than
   * pretend.
   */
  steerRun(runId: string, instruction: AiRuntimeInput): Promise<void>

  /**
   * `resumeConversation(binding, input)` — explicit session continuity, never
   * implicit. `binding` is the admitted envelope context to resume under.
   */
  resumeConversation(
    binding: AiRuntimeResumeBinding,
    input: AiRuntimeInput,
  ): Promise<AiRuntimeStartResult>

  /**
   * `resolveToolCall(call, capabilityGrant)` — act on a tool call the runtime
   * raised, under the capability grant it was admitted with. **The only path
   * to a business operation** (§4.1).
   */
  resolveToolCall(call: AiRuntimeToolCall, capabilityGrant: string): Promise<void>

  /**
   * `completeRun(runId, result)` — record a run's structured outcome. Idempotent
   * and replay-safe (§4.3); safe to deliver twice.
   */
  completeRun(runId: string, result: AiRuntimeRunResult): Promise<AiRuntimeCompleteResult>
}

/** The identity of a run the runtime has begun. */
export interface AiRuntimeStartResult {
  /** The run id, which the caller already knows from the envelope. Echoed for clarity. */
  runId: string
  /** The runtime's own session id, when it has one. */
  runtimeSessionId?: string
}

/**
 * The binding a conversation is resumed under. Named separately from the full
 * envelope because a resume carries the same identity fields but not a fresh
 * run — the identifiers must stay distinct (§4.2).
 */
export interface AiRuntimeResumeBinding {
  tenantId: string
  principalId: string
  actorId: string
  agentId: string
  conversationId: string
  capabilityGrantId: string
}

/** Opaque to the port: whatever the caller considers one turn's input. */
export interface AiRuntimeInput {
  /** Free-form text, when the turn is a text turn. */
  text?: string
  /**
   * Structured messages, when the caller is carrying a full conversation.
   * Typed as `unknown[]` on purpose — the port does not adopt either engine's
   * message type, so it can sit in front of both.
   */
  messages?: unknown[]
  /** Attachment identifiers, resolved by the caller before the run. */
  attachmentIds?: string[]
  /** Page context (which record the user is looking at), when there is one. */
  pageContext?: Record<string, unknown>
  /** Any further caller-specific fields. */
  [key: string]: unknown
}

/** The implementation name the port reports for the OpenCode adapter (R28-2). */
export const OPENCODE_RUNTIME_IMPLEMENTATION = 'opencode' as const
