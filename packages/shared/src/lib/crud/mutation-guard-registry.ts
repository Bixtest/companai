import type { AwilixContainer } from 'awilix'
import { hasAllFeatures } from '../../security/features'
import { resolveCrudMutationGuardService } from './mutation-guard-service'
import type { PrincipalKind } from '../auth/principal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MutationGuard {
  /** Unique guard ID (e.g., 'record_locks.lock-check', 'example.todo-limit') */
  id: string

  /** Target entity or '*' for all entities */
  targetEntity: string | '*'

  /** Which operations this guard applies to */
  operations: ('create' | 'update' | 'delete')[]

  /** Execution priority (lower = earlier). Default: 50 */
  priority?: number

  /** ACL feature gating — guard only runs if user has these features */
  features?: string[]

  /** Validate before mutation. Return ok:false to block, modifiedPayload to transform. */
  validate(input: MutationGuardInput): Promise<MutationGuardResult>

  /** Optional post-mutation callback (for cleanup, cache invalidation, etc.) */
  afterSuccess?(input: MutationGuardAfterInput): Promise<void>
}

export interface MutationGuardInput {
  tenantId: string
  organizationId: string | null
  userId: string
  /**
   * S12 / SD-4 slice B — **who** is acting, in the platform's own principal
   * vocabulary (`PrincipalKind`: `human` | `ai_worker` | `service` | `system`).
   *
   * **Optional, deliberately.** Every guard written before this field existed
   * omits it and behaves identically; a guard that consults it (a structural
   * decision that may differ for a person and an AI) opts in by reading it and
   * failing closed when it is `undefined`. Making it required would have forced a
   * value at every construction site — including the ones that genuinely have no
   * principal (CLI, scheduled jobs) — which is a lie dressed as a type.
   *
   * The actor axis is the whole point of S12 (*"the actor type is part of every
   * structural decision"*), so a guard that re-introduces the AI/human split must
   * read this, never parse a prefix off `userId`.
   */
  actorKind?: PrincipalKind
  resourceKind: string
  resourceId: string | null
  operation: 'create' | 'update' | 'delete'
  requestMethod: string
  requestHeaders: Headers
  mutationPayload?: Record<string, unknown> | null
}

/**
 * The third outcome (D3): the guard says *"do not run this yet — a person must
 * decide"*, which is neither a pass nor a refusal.
 *
 * **Why it cannot be a boolean.** `ok:false` already means "this must not
 * happen" — a hard stop with an HTTP status. A guard that wants a *review* had
 * nowhere to say so and had to abuse `ok:false`, collapsing two different facts
 * ("refused" and "held for a person") into one, and turning the dictionary's
 * quiet tier back into a wall. This block restores the distinction without
 * changing `ok`.
 *
 * **Escalate is never "allowed".** An escalating guard returns `ok:true` **and**
 * this block; the runner treats it as **not performed** — no mutation runs, no
 * `afterSuccess` fires. The reviewer's word is the only thing that lets it run,
 * through the existing approval path. Fail-closed both ways: an escalate that is
 * ignored means nothing happened, and nothing happened is the safe reading.
 *
 * **What it deliberately does not carry.** A `commandId` or `capabilityId`: a
 * mutation guard has neither, and the pending-act row (`authority_pending_acts`)
 * needs both to be replayed on approval. So the guard *defers*; it does not file
 * the act itself. Creating the pending act stays where the command identity
 * already lives — the command path (`auth.authority-command-gate`).
 */
export interface MutationGuardEscalation {
  /**
   * The gate the guard settled on. Uses the platform's autonomy gates (`A1`–`A4`)
   * so an escalate reads in the same vocabulary as a commanded act.
   */
  gate: string
  /** Stable identifier of the rule that asked for the review — safe to switch on. */
  rule: string
  /** Human-readable, specific: why this particular act needs a person. */
  because: string
  /**
   * Suggested status for the caller's "needs review" response. Defaults to `202`
   * (accepted, not performed) — never a `2xx` that implies the write landed.
   */
  status?: number
}

export interface MutationGuardResult {
  ok: boolean
  /** HTTP status for rejection (default: 422) */
  status?: number
  /** Error message for rejection */
  message?: string
  /** Full error body for rejection (overrides message) */
  body?: Record<string, unknown>
  /** Modified payload — merged into mutation data if ok:true */
  modifiedPayload?: Record<string, unknown>
  /** Should afterSuccess run? (default: false) */
  shouldRunAfterSuccess?: boolean
  /** Arbitrary metadata passed to afterSuccess */
  metadata?: Record<string, unknown>
  /**
   * D3 — the third outcome. Present only when the guard wants a review: the
   * mutation does **not** run, and this carries the reason. See
   * {@link MutationGuardEscalation}. Additive: a guard that never sets it behaves
   * exactly as before.
   */
  escalation?: MutationGuardEscalation
}

export interface MutationGuardAfterInput {
  tenantId: string
  organizationId: string | null
  userId: string
  /** S12 / SD-4 slice B — the acting principal kind; optional, as on the input. */
  actorKind?: PrincipalKind
  resourceKind: string
  resourceId: string
  operation: 'create' | 'update' | 'delete'
  requestMethod: string
  requestHeaders: Headers
  metadata?: Record<string, unknown> | null
}

/**
 * What {@link runMutationGuards} returns.
 *
 * Declared as a **named** type (not an inline return type) on purpose. The D3
 * audit found six raw-registry helpers that copied this shape by hand and
 * **dropped `escalation`**, so their callers checked only `ok` and would have
 * committed a mutation a guard had held for review. TypeScript could not flag
 * them because the omission was in the *declared* type, not the call. Routing
 * every helper through this one type makes that omission a compile error.
 */
export interface MutationGuardRunResult {
  ok: boolean
  errorBody?: Record<string, unknown>
  errorStatus?: number
  modifiedPayload?: Record<string, unknown>
  afterSuccessCallbacks: Array<{ guard: MutationGuard; metadata: Record<string, unknown> | null }>
  /** D3 — set when a guard asked for a review instead of allowing or blocking. */
  escalation?: MutationGuardEscalation
}

// ---------------------------------------------------------------------------
// Entity matching
// ---------------------------------------------------------------------------

export function matchesEntity(pattern: string, entity: string): boolean {
  if (pattern === '*') return true
  if (pattern === entity) return true
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2)
    return entity.startsWith(prefix + '.')
  }
  return false
}

// ---------------------------------------------------------------------------
// Guard runner
// ---------------------------------------------------------------------------

export async function runMutationGuards(
  guards: MutationGuard[],
  input: MutationGuardInput,
  context: { userFeatures: string[] },
): Promise<MutationGuardRunResult> {
  const matching = guards
    .filter((g) => matchesEntity(g.targetEntity, input.resourceKind))
    .filter((g) => g.operations.includes(input.operation))
    .filter((g) => hasAllFeatures(context.userFeatures, g.features))
    .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50))

  let payload = input.mutationPayload
  const afterSuccessCallbacks: Array<{ guard: MutationGuard; metadata: Record<string, unknown> | null }> = []

  for (const guard of matching) {
    const result = await guard.validate({ ...input, mutationPayload: payload })
    if (!result.ok) {
      const body = result.body ?? { error: result.message ?? 'Operation blocked by guard', guardId: guard.id }
      return { ok: false, errorBody: body, errorStatus: result.status ?? 422, afterSuccessCallbacks: [] }
    }
    // D3: an escalation is not a pass. The guard returned ok:true (it is not
    // refusing) but asked for a person — so the run stops here, nothing is
    // modified, no afterSuccess is queued, and the caller decides. First
    // escalation wins: like a block, it short-circuits the rest of the chain,
    // because running further guards against a mutation that will not happen
    // would only produce explanations for a decision already made.
    if (result.escalation) {
      return {
        ok: true,
        modifiedPayload: payload !== input.mutationPayload ? (payload ?? undefined) : undefined,
        afterSuccessCallbacks: [],
        escalation: result.escalation,
      }
    }
    if (result.modifiedPayload) payload = { ...payload, ...result.modifiedPayload }
    if (result.shouldRunAfterSuccess && guard.afterSuccess) {
      afterSuccessCallbacks.push({ guard, metadata: result.metadata ?? null })
    }
  }

  return { ok: true, modifiedPayload: payload !== input.mutationPayload ? (payload ?? undefined) : undefined, afterSuccessCallbacks }
}

// ---------------------------------------------------------------------------
// Legacy guard bridge
// ---------------------------------------------------------------------------

export function bridgeLegacyGuard(container: AwilixContainer): MutationGuard | null {
  const legacyService = resolveCrudMutationGuardService(container)
  if (!legacyService) return null

  return {
    id: '_legacy.crud-mutation-guard-service',
    targetEntity: '*',
    operations: ['update', 'delete'],
    priority: 0,

    async validate(input) {
      const result = await legacyService.validateMutation({
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        userId: input.userId,
        resourceKind: input.resourceKind,
        resourceId: input.resourceId ?? '',
        operation: input.operation,
        requestMethod: input.requestMethod,
        requestHeaders: input.requestHeaders,
        mutationPayload: input.mutationPayload,
      })
      if (!result) return { ok: true }
      if (!result.ok) return { ok: false, status: result.status, body: result.body }
      return { ok: true, shouldRunAfterSuccess: result.shouldRunAfterSuccess, metadata: result.metadata ?? undefined }
    },

    async afterSuccess(input) {
      await legacyService.afterMutationSuccess({
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        userId: input.userId,
        resourceKind: input.resourceKind,
        resourceId: input.resourceId,
        operation: input.operation,
        requestMethod: input.requestMethod,
        requestHeaders: input.requestHeaders,
        metadata: input.metadata,
      })
    },
  }
}
