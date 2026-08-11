/**
 * A record's own state, as a ceiling on what may be done to it.
 *
 * Everything else in the authority system is about *who is acting*. This is
 * about *what is being acted on*: a contract under dispute, a payroll run that
 * has closed, a case file somebody has frozen pending review. None of those are
 * properties of the actor, and no amount of trust or delegation should reach
 * past them — which is exactly why this arrives as a ceiling like every other,
 * into a resolver where nothing widens.
 *
 * **This replaces something we removed.** Excluding `packages/enterprise` in S2
 * took record locking out of the platform entirely, so this is not an
 * enhancement; it is restoring a control the fork dropped.
 */
import type { AutonomyGate, EffectClass } from './capabilities'

export const RECORD_LOCK_STATES = ['open', 'restricted', 'locked'] as const

export type RecordLockState = (typeof RECORD_LOCK_STATES)[number]

/** What a record is when nobody has said otherwise. */
export const DEFAULT_RECORD_LOCK_STATE: RecordLockState = 'open'

export function isRecordLockState(value: unknown): value is RecordLockState {
  return typeof value === 'string' && (RECORD_LOCK_STATES as readonly string[]).includes(value)
}

/**
 * An unreadable value is treated as `locked`.
 *
 * The opposite of how an unknown *visibility* scope is handled, and for the same
 * reason: fail towards the restrictive answer. A lock state written by a later
 * version and read by an earlier one must not quietly become `open`.
 */
export function parseRecordLockState(value: unknown): RecordLockState {
  if (isRecordLockState(value)) return value
  if (value === null || value === undefined) return DEFAULT_RECORD_LOCK_STATE
  return 'locked'
}

/**
 * The ceiling a record's state imposes on an act of this effect class.
 *
 * `null` means "this state has nothing to say", which is not the same as `A5` —
 * the resolver takes the minimum of the ceilings it is given, and handing it an
 * `A5` for every open record would be noise in every explanation.
 *
 * **Reads (`E0`) are exempt from both states**, and that is a decision rather
 * than an oversight. A record nobody may read is a record nobody can review
 * before deciding whether to unlock it, and freezing a contract should not also
 * hide it from the people arguing about it. Who may *read* a record is already
 * governed by RBAC and by the data classification on the capability; this
 * controls what may be *done* to it.
 *
 * So the two states differ precisely on writes: `restricted` means a person has
 * to agree first, `locked` means not at all.
 */
export function recordLockCeiling(
  state: RecordLockState,
  effectClass: EffectClass,
): AutonomyGate | null {
  if (effectClass === 'E0') return null
  switch (state) {
    case 'open':
      return null
    case 'restricted':
      // Approve first. Not a refusal — the act is legitimate, it just does not
      // happen on one person's say-so while the record is in this state.
      return 'A2'
    case 'locked':
      return 'A0'
    default: {
      // A state added to the union without a rule fails the build rather than
      // silently permitting everything.
      const unreachable: never = state
      return unreachable
    }
  }
}

/**
 * Why the ceiling is what it is, for the explanation the resolver returns.
 *
 * Invariant **I6**: a refusal nobody can explain is a support ticket. "You may
 * not edit this" is useless; "this record is locked, so no write to it is
 * permitted whatever your authority" tells somebody what to do next.
 */
export function recordLockReason(state: RecordLockState, reason?: string | null): string {
  const base = state === 'locked'
    ? 'this record is locked, so no write to it is permitted whatever the actor\'s authority'
    : 'this record is restricted, so writes to it need approval whatever the actor\'s authority'
  return reason?.trim() ? `${base} (${reason.trim()})` : base
}
