/**
 * The Function lifecycle — §44, enforced.
 *
 * The vision draws eight states in a chain:
 *
 *   DRAFT → GENERATED → VALIDATED → VERIFIED → PUBLISHED → ACTIVE → DEPRECATED → ARCHIVED
 *
 * **Why this is a state machine and not a `status` field.** A status field lets
 * any code write any value, so "an unverified Function cannot run" becomes a
 * convention that a caller must remember. Here it is a property of the type: the
 * only way into `published` is from `verified`, and the only states that execute
 * are `published` and `active`. `isRunnable` is the single place that answers
 * "may this run", so no caller gets to have its own opinion.
 *
 * **One addition, and it is ours, reported so it can be overruled cheaply
 * (COOKBOOK rule zero-zero, case 3).** §44's chain has no exit except forward, so
 * a Function abandoned while still a `draft` could never be discarded. `ARCHIVED`
 * is therefore reachable from **any** non-archived state. Everything else is
 * strictly the vision's chain.
 *
 * Source: Doc 3 Part VIII §44; plan §2 phase 3.
 */

import type { FunctionStatus, UserFunction, VerificationReport } from './types'

/** The vision's chain, one step at a time. `null` marks the end of the line. */
const NEXT_STATE: Record<FunctionStatus, FunctionStatus | null> = {
  draft: 'generated',
  generated: 'validated',
  validated: 'verified',
  verified: 'published',
  published: 'active',
  active: 'deprecated',
  deprecated: 'archived',
  archived: null,
}

/** Every state, in the vision's order. */
export const FUNCTION_STATUSES: readonly FunctionStatus[] = [
  'draft',
  'generated',
  'validated',
  'verified',
  'published',
  'active',
  'deprecated',
  'archived',
]

/**
 * The states a Function can only reach **through** `verified`.
 *
 * `archived` is deliberately absent: it is reachable from any state, so an
 * abandoned draft can be archived without ever having been verified.
 *
 * **Why this list exists.** `transition` refuses to *mark* a Function verified on
 * a failing report, which makes `verified` mean something for any Function that
 * walked the chain. But a **document** can be hand-written or doctored, and
 * `importFunction` reads one. Without this list, a forged document claiming
 * `active` with no verification record would import cleanly and then run. So the
 * document reader uses the same list to refuse that, and the guarantee holds
 * across the document boundary as well as the API.
 */
export const REQUIRES_VERIFICATION_RECORD: readonly FunctionStatus[] = [
  'verified',
  'published',
  'active',
  'deprecated',
]

/**
 * Whether one step of the chain is legal.
 *
 * **This answers a question about the *chain*, not about the *evidence*.** Forward
 * exactly one step, or to `archived` from anywhere else. It deliberately does not
 * know that reaching `verified` also requires a verification report — that is
 * {@link transition}'s gate, because a report is an argument and a predicate over
 * two statuses cannot see one. So `canTransition('validated', 'verified')` is
 * `true` while `transition` may still refuse: the step exists, and you may not
 * have brought what it takes.
 */
export function canTransition(from: FunctionStatus, to: FunctionStatus): boolean {
  if (from === to) return false
  if (to === 'archived') return from !== 'archived'
  return NEXT_STATE[from] === to
}

/**
 * **The single place that answers "may this Function run".**
 *
 * Only a published or active Function executes. A draft, a generated or even a
 * verified Function has not been published, so it must not.
 */
export function isRunnable(status: FunctionStatus): boolean {
  return status === 'published' || status === 'active'
}

export type TransitionResult =
  | { ok: true; fn: UserFunction }
  | { ok: false; reason: string }

export type TransitionOptions = {
  /** The clock, passed in rather than read, so a test can pin it. */
  now?: Date
  verifiedBy?: string
  /**
   * **Required to reach `verified`.** The report §46 produced.
   *
   * Why it is an argument and not a convention: without it, `verified` is a
   * *label somebody typed*. Any code could walk the chain
   * `draft → generated → validated → verified → published` and publish an
   * operation that was never checked, and the state would say "verified" the whole
   * time. Requiring the report here makes the state mean what it says — and a
   * report that **failed** is refused, so `verified` cannot be reached by ignoring
   * the result.
   */
  verification?: VerificationReport
}

/**
 * Move a Function to a new state, returning a **new** Function.
 *
 * Immutable on purpose: a caller cannot half-apply a transition, and a refused
 * transition leaves the original untouched. The clock is an argument rather than
 * a call to `new Date()`, so a test can pin it — the same convention
 * `prepare-mutation.ts` already uses.
 */
export function transition(
  fn: UserFunction,
  to: FunctionStatus,
  options: TransitionOptions = {},
): TransitionResult {
  if (!canTransition(fn.status, to)) {
    return {
      ok: false,
      reason: `Cannot move a Function from "${fn.status}" to "${to}". A Function advances one step at a time (${FUNCTION_STATUSES.join(' -> ')}), or is archived from any state.`,
    }
  }

  const next: UserFunction = { ...fn, status: to }

  if (to === 'verified') {
    if (!options.verification) {
      return {
        ok: false,
        reason:
          'Moving a Function to "verified" requires a verification report. Verification is what makes the state true, so the state cannot be reached without it.',
      }
    }
    if (!options.verification.passed) {
      const failed = options.verification.checks.filter((check) => check.outcome === 'failed')
      return {
        ok: false,
        reason: `Verification did not pass, so this Function cannot be marked verified. ${failed
          .map((check) => `${check.name}: ${check.detail}`)
          .join(' ')}`,
      }
    }
    next.verification = { notChecked: [...options.verification.notChecked] }
    if (options.verifiedBy) next.verifiedBy = options.verifiedBy
  }

  if (to === 'published') {
    next.publishedAt = (options.now ?? new Date()).toISOString()
  }

  return { ok: true, fn: next }
}
