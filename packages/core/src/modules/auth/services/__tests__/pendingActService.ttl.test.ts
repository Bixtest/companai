/**
 * A tenant's own approval window, and the ways it must not be able to break.
 *
 * Approval speed is a property of the organisation, not of the platform: a
 * four-person company answers in an hour, a regulated one may need a week. An
 * instance-wide TTL makes whoever configures it first decide for everybody.
 *
 * **Every test here is about a wrong value rather than a right one.** The happy
 * path is one line; the reason this setting needs care is that it is the rare
 * piece of tenant configuration that can *stop work*. A TTL of zero does not
 * present as a misconfiguration to the person affected — their acts expire
 * before anyone can answer, and the platform looks like it is refusing them for
 * no stated reason. So `resolveTtlMs` is written to fail towards the default and
 * clamp towards the permitted range, and these assert that it does.
 *
 * Clamping rather than refusing is deliberate: refusing an out-of-range value
 * leaves the tenant on a default they did not choose and do not know they are
 * on, while clamping moves them to the nearest thing they can have and logs it.
 */
import {
  resolveTtlMs,
  PENDING_ACT_TTL_MS,
  PENDING_ACT_TTL_MIN_HOURS,
  PENDING_ACT_TTL_MAX_HOURS,
} from '../pendingActService'

const TENANT = 'tenant-1'
const HOUR = 3_600_000

describe('resolveTtlMs', () => {
  it('uses the tenant value when it is sane', () => {
    expect(resolveTtlMs(4, TENANT)).toBe(4 * HOUR)
  })

  it('accepts a numeric string, because config stores are not always typed', () => {
    expect(resolveTtlMs('72', TENANT)).toBe(72 * HOUR)
  })

  it('falls back to the default when nothing is configured', () => {
    expect(resolveTtlMs(null, TENANT)).toBe(PENDING_ACT_TTL_MS)
    expect(resolveTtlMs(undefined, TENANT)).toBe(PENDING_ACT_TTL_MS)
  })

  describe('values that would stop work', () => {
    it('never returns zero for junk', () => {
      // The failure this guards: Number('soon') is NaN, and a naive `|| 0`
      // would expire every act the instant it was held.
      for (const junk of ['soon', {}, [], 'NaN', '']) {
        const ms = resolveTtlMs(junk, TENANT)
        expect(ms).toBeGreaterThan(0)
      }
    })

    it('clamps zero and negatives up to the floor', () => {
      expect(resolveTtlMs(0, TENANT)).toBe(PENDING_ACT_TTL_MIN_HOURS * HOUR)
      expect(resolveTtlMs(-5, TENANT)).toBe(PENDING_ACT_TTL_MIN_HOURS * HOUR)
    })

    it('clamps a value below the floor rather than honouring it', () => {
      // Half an hour is a plausible thing to type and still too short for a
      // person to be asked and reply.
      expect(resolveTtlMs(0.5, TENANT)).toBe(PENDING_ACT_TTL_MIN_HOURS * HOUR)
    })
  })

  describe('values that would defeat the point of expiry', () => {
    it('clamps an excessive window down to the ceiling', () => {
      // Ninety days technically "has an expiry" while restoring the failure
      // mandatory expiry exists to prevent: a request nobody answers becoming
      // a refusal nobody had to justify.
      expect(resolveTtlMs(24 * 90, TENANT)).toBe(PENDING_ACT_TTL_MAX_HOURS * HOUR)
    })

    it('clamps Infinity rather than producing an act that never expires', () => {
      // Infinity is finite-checked before clamping; if that check were dropped,
      // `new Date(Date.now() + Infinity)` is an Invalid Date and the act would
      // never be collected by expireOverdue.
      expect(resolveTtlMs(Infinity, TENANT)).toBe(PENDING_ACT_TTL_MS)
      expect(Number.isFinite(resolveTtlMs(Infinity, TENANT))).toBe(true)
    })
  })

  it('keeps the boundaries themselves', () => {
    // Clamping must not move a value that is already legal.
    expect(resolveTtlMs(PENDING_ACT_TTL_MIN_HOURS, TENANT)).toBe(PENDING_ACT_TTL_MIN_HOURS * HOUR)
    expect(resolveTtlMs(PENDING_ACT_TTL_MAX_HOURS, TENANT)).toBe(PENDING_ACT_TTL_MAX_HOURS * HOUR)
  })

  it('always yields a usable date', () => {
    // The property that actually matters downstream: whatever is stored, the
    // expiry written onto the act must be a real, future timestamp.
    for (const stored of [null, 0, -1, 'x', Infinity, 24 * 900, 6]) {
      const expiresAt = new Date(Date.now() + resolveTtlMs(stored, TENANT))
      expect(Number.isNaN(expiresAt.getTime())).toBe(false)
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    }
  })
})
