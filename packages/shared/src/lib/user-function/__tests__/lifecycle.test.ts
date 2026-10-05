/**
 * The lifecycle — §44, enforced.
 *
 * The positive path is asserted first: a Function can walk the whole chain, one
 * step at a time, and ends up runnable. Only then the refusals. A suite of only
 * refusals would pass against a lifecycle that refused everything.
 */

import { canTransition, isRunnable, transition, FUNCTION_STATUSES } from '../lifecycle'
import type { VerificationCheckName, VerificationReport } from '../types'
import { makeFunction } from './fixtures'

const passing = (notChecked: VerificationCheckName[] = []): VerificationReport => ({
  passed: true,
  checks: [{ name: 'ir_valid', outcome: 'passed', detail: 'The IR declares a valid operation (list).' }],
  notChecked,
})

const failing = (): VerificationReport => ({
  passed: false,
  checks: [
    { name: 'fields_valid', outcome: 'failed', detail: 'Dimension "nope" is not a declared field.' },
  ],
  notChecked: [],
})

describe('the vision\'s chain, one step at a time', () => {
  it('declares §44\'s eight states in the vision\'s order', () => {
    expect(FUNCTION_STATUSES).toEqual([
      'draft',
      'generated',
      'validated',
      'verified',
      'published',
      'active',
      'deprecated',
      'archived',
    ])
  })

  it('allows each forward step', () => {
    const forward: Array<[string, string]> = [
      ['draft', 'generated'],
      ['generated', 'validated'],
      ['validated', 'verified'],
      ['verified', 'published'],
      ['published', 'active'],
      ['active', 'deprecated'],
      ['deprecated', 'archived'],
    ]
    for (const [from, to] of forward) {
      expect(canTransition(from as never, to as never)).toBe(true)
    }
  })

  it('allows archiving from any state that is not already archived', () => {
    for (const status of FUNCTION_STATUSES) {
      expect(canTransition(status, 'archived')).toBe(status !== 'archived')
    }
  })

  it('refuses a skipped step, a step backwards, and a no-op', () => {
    expect(canTransition('draft', 'published')).toBe(false)
    expect(canTransition('active', 'verified')).toBe(false)
    expect(canTransition('draft', 'draft')).toBe(false)
  })
})

describe('isRunnable — the single place that answers "may this run"', () => {
  it('runs only a published or active Function', () => {
    for (const status of FUNCTION_STATUSES) {
      expect(isRunnable(status)).toBe(status === 'published' || status === 'active')
    }
  })

  it('does not run a verified-but-unpublished Function', () => {
    expect(isRunnable('verified')).toBe(false)
  })
})

describe('transition — a full walk, then the refusals', () => {
  it('walks draft to active, and the result is runnable', () => {
    let fn = makeFunction({ status: 'draft' })
    for (const to of ['generated', 'validated'] as const) {
      const moved = transition(fn, to)
      expect(moved.ok).toBe(true)
      if (!moved.ok) return
      fn = moved.fn
    }

    const verified = transition(fn, 'verified', { verification: passing(['authorization_valid']), verifiedBy: 'user-9' })
    expect(verified.ok).toBe(true)
    if (!verified.ok) return
    fn = verified.fn
    expect(fn.verification).toEqual({ notChecked: ['authorization_valid'] })
    expect(fn.verifiedBy).toBe('user-9')

    const published = transition(fn, 'published', { now: new Date('2026-10-05T12:00:00Z') })
    expect(published.ok).toBe(true)
    if (!published.ok) return
    expect(published.fn.publishedAt).toBe('2026-10-05T12:00:00.000Z')
    expect(isRunnable(published.fn.status)).toBe(true)

    const active = transition(published.fn, 'active')
    expect(active.ok).toBe(true)
    if (!active.ok) return
    expect(active.fn.publishedAt).toBe('2026-10-05T12:00:00.000Z')
  })

  it('refuses an illegal transition, and says what the chain is', () => {
    const result = transition(makeFunction({ status: 'draft' }), 'published')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('draft')
    expect(result.reason).toContain('published')
    expect(result.reason).toContain('draft -> generated -> validated')
  })

  it('refuses to mark a Function verified with no verification report', () => {
    const result = transition(makeFunction({ status: 'validated' }), 'verified')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('requires a verification report')
  })

  it('refuses to mark a Function verified on a report that failed, and names the failed check', () => {
    const result = transition(makeFunction({ status: 'validated' }), 'verified', { verification: failing() })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('Verification did not pass')
    expect(result.reason).toContain('fields_valid')
    expect(result.reason).toContain('not a declared field')
  })

  it('leaves the original untouched — a refused transition changes nothing', () => {
    const original = makeFunction({ status: 'draft' })
    const snapshot = JSON.stringify(original)
    transition(original, 'published')
    expect(JSON.stringify(original)).toBe(snapshot)
    expect(original.status).toBe('draft')
  })

  it('records the report it was verified with, and carries it forward', () => {
    const verified = transition(
      makeFunction({ status: 'validated', verification: undefined }),
      'verified',
      { verification: passing(['authorization_valid']) },
    )
    expect(verified.ok).toBe(true)
    if (!verified.ok) return
    // The record comes from the report, not from whatever was on the Function.
    expect(verified.fn.verification).toEqual({ notChecked: ['authorization_valid'] })

    const published = transition(verified.fn, 'published')
    expect(published.ok).toBe(true)
    if (!published.ok) return
    const active = transition(published.fn, 'active')
    expect(active.ok).toBe(true)
    if (!active.ok) return
    // It stays: what was verified is a fact about this Function.
    expect(active.fn.verification).toEqual({ notChecked: ['authorization_valid'] })
  })
})
