/**
 * `RECORD_LOCK_CEILING_TWIN` against the function it is a twin of.
 *
 * The `satisfies` clause in `testing/digital-twin/authority.ts` checks the twin's SHAPE — that every
 * record-lock state has an entry, and that each entry is a legal autonomy gate. It cannot check the
 * VALUES: `{ open: null, restricted: 'A2', locked: 'A0' }` and `{ open: 'A5', restricted: 'A5',
 * locked: 'A5' }` both compile, and the second is a lie about the control.
 *
 * This closes that gap. Every value the twin declares must equal what `recordLockCeiling` actually
 * returns for a write, so a change to the function that the twin does not follow is a red test — the
 * twin cannot quietly keep describing a control the code no longer implements.
 *
 * `record-locks.test.ts` in `@open-mercato/shared` tests the function directly. This tests the TWIN,
 * because the twin is what other suites read in place of the real thing; a twin that is wrong is
 * worse than no twin.
 */
import {
  RECORD_LOCK_STATES,
  recordLockCeiling,
  type RecordLockState,
} from '@open-mercato/shared/modules/record-locks'
import type { EffectClass } from '@open-mercato/shared/modules/capabilities'
import { RECORD_LOCK_CEILING_TWIN } from '../../../../testing/digital-twin/authority'

const WRITE_CLASSES: EffectClass[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']

describe('RECORD_LOCK_CEILING_TWIN', () => {
  it('names exactly the states the union has — no more, no fewer', () => {
    expect(Object.keys(RECORD_LOCK_CEILING_TWIN).sort()).toEqual([...RECORD_LOCK_STATES].sort())
  })

  it('declares, for every state, exactly the ceiling a write actually gets', () => {
    for (const state of RECORD_LOCK_STATES) {
      const declared = RECORD_LOCK_CEILING_TWIN[state]
      for (const effectClass of WRITE_CLASSES) {
        expect(recordLockCeiling(state, effectClass)).toBe(declared)
      }
    }
  })

  it('describes the write ceiling, not the read case — reads are exempt in both', () => {
    // The twin stands for what a state imposes on a WRITE. The read exemption is the function's
    // decision, and the twin must not be read as contradicting it.
    for (const state of RECORD_LOCK_STATES) {
      expect(recordLockCeiling(state, 'E0')).toBeNull()
    }
  })

  it('keeps the two states distinct on writes — a person agrees first, or not at all', () => {
    const writeCeiling = (state: RecordLockState) => recordLockCeiling(state, 'E2')
    expect(writeCeiling('restricted')).toBe('A2')
    expect(writeCeiling('locked')).toBe('A0')
    expect(writeCeiling('restricted')).not.toBe(writeCeiling('locked'))
  })
})
