/**
 * What a record's own state permits.
 *
 * The control this restores was removed with `packages/enterprise` in S2, so
 * there is no prior behaviour to preserve — only the graft's specification:
 * `locked` forces `A0` on writes, `restricted` caps at `A2`, and neither can be
 * lifted by trust, delegation or a standing approval.
 *
 * The last clause is the one worth holding, and it is held by the resolver
 * taking a minimum rather than by anything here.
 */
import {
  DEFAULT_RECORD_LOCK_STATE,
  RECORD_LOCK_STATES,
  isRecordLockState,
  parseRecordLockState,
  recordLockCeiling,
  recordLockReason,
} from '../record-locks'
import type { EffectClass } from '../capabilities'

const WRITE_CLASSES: EffectClass[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']

describe('what each state permits', () => {
  it('says nothing at all about an open record', () => {
    // `null` rather than `A5`: the resolver takes a minimum, and an A5 for every
    // open record would appear in every explanation saying nothing.
    for (const effectClass of WRITE_CLASSES) {
      expect(recordLockCeiling('open', effectClass)).toBeNull()
    }
  })

  it('refuses every write to a locked record', () => {
    for (const effectClass of WRITE_CLASSES) {
      expect(recordLockCeiling('locked', effectClass)).toBe('A0')
    }
  })

  it('makes writes to a restricted record need approval', () => {
    for (const effectClass of WRITE_CLASSES) {
      expect(recordLockCeiling('restricted', effectClass)).toBe('A2')
    }
  })
})

describe('reads are exempt, deliberately', () => {
  it('lets a locked record still be read', () => {
    // A record nobody may read is a record nobody can review before deciding
    // whether to unlock it. Freezing a contract should not hide it from the
    // people arguing about it.
    expect(recordLockCeiling('locked', 'E0')).toBeNull()
    expect(recordLockCeiling('restricted', 'E0')).toBeNull()
  })

  it('leaves who may read to the controls that already govern it', () => {
    // RBAC decides whether the actor holds the capability at all, and the data
    // classification on that capability raises the grade. This is about what may
    // be *done* to a record, not who may look at it.
    expect(recordLockCeiling('locked', 'E0')).toBeNull()
  })
})

describe('reading a stored value back', () => {
  it('accepts every state it writes', () => {
    for (const state of RECORD_LOCK_STATES) {
      expect(isRecordLockState(state)).toBe(true)
      expect(parseRecordLockState(state)).toBe(state)
    }
  })

  it('treats an unreadable state as locked, not as open', () => {
    // The opposite direction from an unknown visibility scope, and the same
    // principle: fail towards the restrictive answer. A state written by a later
    // version must not quietly become `open` when an older reader sees it.
    expect(parseRecordLockState('frozen-pending-audit')).toBe('locked')
    expect(parseRecordLockState(3)).toBe('locked')
  })

  it('treats an absent state as open, because most records have none', () => {
    expect(DEFAULT_RECORD_LOCK_STATE).toBe('open')
    expect(parseRecordLockState(null)).toBe('open')
    expect(parseRecordLockState(undefined)).toBe('open')
  })
})

describe('the explanation', () => {
  it('says what the state means rather than only naming it', () => {
    expect(recordLockReason('locked')).toContain('whatever the actor')
    expect(recordLockReason('restricted')).toContain('need approval')
  })

  it('carries the reason somebody gave when locking it', () => {
    // "You may not edit this" is a support ticket. "Locked pending the audit" is
    // an answer.
    expect(recordLockReason('locked', 'pending the Q3 audit')).toContain('pending the Q3 audit')
  })

  it('does not leave an empty bracket when no reason was given', () => {
    expect(recordLockReason('locked', '   ')).not.toContain('(')
  })
})
