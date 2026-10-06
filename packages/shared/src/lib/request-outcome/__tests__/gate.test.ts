/**
 * The Save gate — may this become a Function? (G-21).
 *
 * The positive path is asserted first: a genuinely passing report is accepted. Then
 * the refusals. And then the thing this suite exists for — the `not_checked` trap:
 * **a green report that never ran `authorization_valid` must not read as a clean
 * bill of health.**
 *
 * The report shapes are built here rather than imported from G-03's fixtures on
 * purpose: this gate consumes a *report*, and the tests should be able to say
 * exactly which report they handed it. The Function is the real one, from the real
 * fixture.
 */

import { canOfferSaveAsFunction, describeSaveGateVerdict } from '../gate'
import type { VerificationCheck, VerificationCheckName, VerificationReport } from '../../user-function/types'
import { makeFunction } from '../../user-function/__tests__/fixtures'

/** A report where every check listed passed. */
const allPassed = (notChecked: VerificationCheckName[] = []): VerificationReport => ({
  passed: true,
  checks: [
    { name: 'ir_valid', outcome: 'passed', detail: 'The IR declares a valid operation (list).' },
    { name: 'fields_valid', outcome: 'passed', detail: 'Every field resolves.' },
    {
      name: 'authorization_valid',
      outcome: notChecked.includes('authorization_valid') ? 'not_checked' : 'passed',
      detail: notChecked.includes('authorization_valid')
        ? 'The data-axis authorization layer (G-04) does not exist.'
        : 'Authorization established.',
    },
  ],
  notChecked,
})

const failedOn = (name: VerificationCheckName, detail: string): VerificationReport => ({
  passed: false,
  checks: [{ name, outcome: 'failed', detail }],
  notChecked: [],
})

describe('the positive path', () => {
  it('permits the save when every check passed', () => {
    const verdict = canOfferSaveAsFunction(makeFunction(), allPassed())
    expect(verdict.allowed).toBe(true)
    if (!verdict.allowed) throw new Error('unreachable')
    expect(verdict.notChecked).toEqual([])
  })

  it('permits the save when a check passed and another was only not_checked', () => {
    // Today's real shape: everything the compiler owns passes, authorization is
    // not_checked because G-04 does not exist. The save must still be offered.
    const verdict = canOfferSaveAsFunction(makeFunction(), allPassed(['authorization_valid']))
    expect(verdict.allowed).toBe(true)
  })
})

describe('the refusals', () => {
  it('refuses when a check failed, and names it', () => {
    const verdict = canOfferSaveAsFunction(
      makeFunction(),
      failedOn('fields_valid', 'Dimension "nope" is not a declared field.'),
    )
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) throw new Error('unreachable')
    expect(verdict.failures).toHaveLength(1)
    expect(verdict.failures[0].name).toBe('fields_valid')
    // The refusal must carry the failing check's OWN detail — not a re-worded
    // summary. If this gate ever re-implemented the checks, the detail would differ.
    expect(verdict.reason).toContain('Dimension "nope" is not a declared field.')
  })

  it('refuses when several checks failed, and names every one', () => {
    const report: VerificationReport = {
      passed: false,
      checks: [
        { name: 'ir_valid', outcome: 'failed', detail: 'Unknown operation "frobnicate".' },
        { name: 'entities_valid', outcome: 'failed', detail: 'Entity "ghost" is not declared.' },
      ],
      notChecked: [],
    }
    const verdict = canOfferSaveAsFunction(makeFunction(), report)
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) throw new Error('unreachable')
    expect(verdict.failures).toHaveLength(2)
    expect(verdict.reason).toContain('Unknown operation "frobnicate".')
    expect(verdict.reason).toContain('Entity "ghost" is not declared.')
    // The union promises a refusal always carries at least one failure.
    expect(verdict.failures.length).toBeGreaterThan(0)
  })

  it('does not permit a save on a report whose own `passed` flag disagrees', () => {
    // A report claiming `passed: true` while carrying a failed check is internally
    // inconsistent. The gate decides from the CHECKS, not from the flag — so a
    // doctored flag cannot open the gate.
    const report: VerificationReport = {
      passed: true,
      checks: [{ name: 'tenant_scope_valid', outcome: 'failed', detail: 'Scope was not injected.' }],
      notChecked: [],
    }
    const verdict = canOfferSaveAsFunction(makeFunction(), report)
    expect(verdict.allowed).toBe(false)
  })
})

describe('the not_checked trap', () => {
  it('surfaces what was never checked even when the save is permitted', () => {
    // This is the reason the gate returns `notChecked` at all. `report.passed` is
    // true when nothing FAILED — so a green report can hide a check that never ran.
    const verdict = canOfferSaveAsFunction(makeFunction(), allPassed(['authorization_valid']))
    expect(verdict.allowed).toBe(true)
    if (!verdict.allowed) throw new Error('unreachable')
    expect(verdict.notChecked).toContain('authorization_valid')
  })

  it('does not treat a green-but-unchecked report as a clean bill of health', () => {
    const verdict = canOfferSaveAsFunction(makeFunction(), allPassed(['authorization_valid']))
    const text = describeSaveGateVerdict(verdict)
    // The sentence must say what was not checked, and must not claim completeness.
    expect(text).toContain('authorization_valid')
    expect(text).not.toMatch(/every check §46 asks for was run/i)
  })

  it('says a clean report is complete only when nothing was skipped', () => {
    const verdict = canOfferSaveAsFunction(makeFunction(), allPassed())
    const text = describeSaveGateVerdict(verdict)
    expect(text).toMatch(/every check §46 asks for was run/i)
    expect(text).not.toContain('could not be checked')
  })

  it('keeps notChecked on a refusal too, so nothing is silently dropped', () => {
    const report: VerificationReport = {
      passed: false,
      checks: [{ name: 'fields_valid', outcome: 'failed', detail: 'Bad field.' } as VerificationCheck],
      notChecked: ['authorization_valid'],
    }
    const verdict = canOfferSaveAsFunction(makeFunction(), report)
    if (verdict.allowed) throw new Error('unreachable')
    expect(verdict.notChecked).toContain('authorization_valid')
  })
})

describe('it consumes a report and never produces one', () => {
  it('returns only verdict shapes, with no check of its own invented', () => {
    // If the gate started deriving checks, its verdict would carry a check name that
    // was not in the report it was handed. This asserts the returned failure set is
    // a subset of the report's failed checks.
    const report = failedOn('query_plan_valid', 'The compiler refused this IR.')
    const verdict = canOfferSaveAsFunction(makeFunction(), report)
    if (verdict.allowed) throw new Error('unreachable')
    const reportFailures = report.checks.filter((c) => c.outcome === 'failed').map((c) => c.name)
    for (const failure of verdict.failures) {
      expect(reportFailures).toContain(failure.name)
    }
  })
})

describe('describeSaveGateVerdict always answers with a sentence', () => {
  // **Found while writing this suite, and kept as a regression test.** The first
  // version of `describeSaveGateVerdict` read `if (!verdict.allowed) return
  // verdict.reason`. Given a value whose `allowed` is `undefined` — e.g. a
  // VerificationReport passed where a SaveGateVerdict was expected, a mistake a
  // caller can easily make since both carry a `notChecked` — `!undefined` is `true`,
  // so it returned `verdict.reason`, which was also undefined. A function typed
  // `: string` returned `undefined`.
  //
  // The test that caught it was passing the wrong type, so the *test* was wrong
  // too — but the hole it fell through was real. Both are now fixed: the caller
  // passes the right type, and the function cannot return a non-string.
  it('never returns undefined, even for a value that is not a verdict', () => {
    const notAVerdict = { passed: true, checks: [], notChecked: [] } as unknown as Parameters<
      typeof describeSaveGateVerdict
    >[0]
    const text = describeSaveGateVerdict(notAVerdict)
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('never returns undefined for an outright malformed value', () => {
    for (const junk of [undefined, null, {}, { allowed: true }, { allowed: false }] as unknown[]) {
      const text = describeSaveGateVerdict(junk as never)
      expect(typeof text).toBe('string')
      expect(text.length).toBeGreaterThan(0)
    }
  })
})
