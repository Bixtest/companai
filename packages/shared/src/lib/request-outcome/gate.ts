/**
 * The Save gate — may this become a Function? (G-21)
 *
 * **What this is.** The single place that answers *"may the Save button be
 * offered?"* — and, when the answer is no, **which check failed**. The
 * architecture document's rule is that the button is *"disabled, visibly, with the
 * failing check named"* until §46 passes; this function is what makes that possible.
 *
 * **It does not re-implement a single check.** Every check name and outcome comes
 * from G-03's {@link verifyFunction} report, which in turn calls G-02's compiler and
 * reads its diagnostics. Writing a second implementation would give the project two
 * answers to one question, which is how the two drift apart — and the drift would be
 * invisible, because both would look authoritative. So this module **consumes** a
 * report; it never produces one.
 *
 * **The `not_checked` trap, which is the whole reason this file is careful.**
 * `VerificationReport.passed` is `true` when **no check failed** — and
 * `not_checked` **never** fails a report (`verify.ts:214`). That is correct: a check
 * that could not run is not a check that failed. But it means a report can be
 * **green while `authorization_valid` was never run** — and it never has been, because
 * the data-axis authorization layer is G-04 and does not exist yet.
 *
 * So a gate that asked only `report.passed` would cheerfully offer to save a
 * Function whose permissions were **never established**. This gate does not do that:
 * it returns the `notChecked` names alongside the verdict, so the save path records
 * them (§46's own demand — `UserFunction.verification.notChecked`) and a person can
 * see what a published Function never proved. **A green-but-unchecked report is
 * allowed to save; it is not allowed to look like a clean bill of health.**
 *
 * Source: Doc 3 Part VIII §46; `library/development/PLAN-G21-request-outcomes.md` §2c.
 */

import type { UserFunction, VerificationCheck, VerificationReport } from '../user-function/types'

/**
 * The verdict on offering "Save as Function".
 *
 * A union rather than a boolean, so a caller cannot obtain the decision while
 * dropping the reasons. `allowed: false` **always** carries at least one failure —
 * the type says so, and a test asserts it.
 */
export type SaveGateVerdict =
  | {
      allowed: true
      /**
       * The checks that could **not** be run. Empty means everything §46 asks for
       * was actually established; non-empty means the Function is structurally
       * valid but something was never proved about it.
       *
       * **Surfaced even on success, on purpose.** This is the field that stops a
       * green report from reading as a clean bill of health.
       */
      notChecked: readonly string[]
    }
  | {
      allowed: false
      /** The checks that failed, each with the failing detail. Never empty. */
      failures: readonly VerificationCheck[]
      /** The checks that could not be run. Non-empty does not, by itself, refuse. */
      notChecked: readonly string[]
      /** One plain sentence, naming the checks that failed. */
      reason: string
    }

/**
 * Decide whether "Save as Function" may be offered.
 *
 * `fn` is accepted but deliberately **unused for its content** today — it is in the
 * signature because the gate is a question about *this* Function, and a future rule
 * (a command's remaining preconditions, a placement requirement) belongs here rather
 * than in a second gate. Keeping the parameter now means that change is not a
 * signature break at every call site.
 *
 * **The verification record on the Function is not trusted as the verdict.** A
 * report is passed in fresh rather than read off `fn.verification`, because
 * `fn.verification` records *what a past verification could not check* — it is not
 * a statement that the checks passed. Reading the verdict off the artifact would let
 * a doctored or stale Function vouch for itself.
 */
export function canOfferSaveAsFunction(
  fn: UserFunction,
  report: VerificationReport,
): SaveGateVerdict {
  const failures = report.checks.filter((check) => check.outcome === 'failed')
  const notChecked = [...report.notChecked]

  if (failures.length > 0) {
    return {
      allowed: false,
      failures,
      notChecked,
      reason:
        `This operation cannot be saved as a Function yet — ${failures.length} check${failures.length === 1 ? '' : 's'} did not pass. ` +
        failures.map((check) => `${check.name}: ${check.detail}`).join(' '),
    }
  }

  // No failure. That is a pass for offering the button — and `notChecked` travels
  // with it, because "passed" and "could not be checked" are different claims and
  // collapsing them is the failure this function exists to prevent.
  return { allowed: true, notChecked }
}

/**
 * The verdict, in one line, for a person.
 *
 * Exists so a UI does not have to reassemble the sentence and get it subtly
 * different in two places. A pass **still mentions** what was not checked — that is
 * the point of it, not a caveat bolted on.
 *
 * **Why the shape is checked and not assumed.** The first version read
 * `if (!verdict.allowed) return verdict.reason`. Given a value whose `allowed` was
 * `undefined` — a `VerificationReport` passed where a `SaveGateVerdict` was
 * expected, which is easy to do since both carry a `notChecked` — `!undefined` is
 * `true`, so it returned `verdict.reason`, which was also `undefined`. **A function
 * typed `: string` returned `undefined`.** The mistake was the caller's, but the
 * silent non-string was the function's, so the function now guards its own contract:
 * it returns a sentence for every input, including a malformed one, and says so
 * rather than rendering nothing.
 */
export function describeSaveGateVerdict(verdict: SaveGateVerdict): string {
  // A value that is not a verdict at all. This is a programming error at the call
  // site, and the honest answer names it instead of pretending there is no verdict.
  if (!verdict || typeof verdict !== 'object' || typeof verdict.allowed !== 'boolean') {
    return 'No usable save verdict was supplied, so nothing can be said about saving this operation.'
  }

  if (!verdict.allowed) {
    return verdict.reason ?? 'This operation cannot be saved as a Function yet.'
  }

  const notChecked = Array.isArray(verdict.notChecked) ? verdict.notChecked : []

  if (notChecked.length === 0) {
    return 'Every check §46 asks for was run, and all of them passed.'
  }
  return (
    `Every check that could be run passed. These could not be checked: ${notChecked.join(', ')}. ` +
    'The Function is structurally valid; that is not the same as being fully established.'
  )
}
