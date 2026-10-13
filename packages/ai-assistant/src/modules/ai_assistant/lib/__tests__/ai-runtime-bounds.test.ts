/**
 * `P2-6` (§2.12) — the run's BOUNDS, measured.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * §2.12's exit gate requires *bounded memory/CPU* to be **measured**, and the
 * measurement found the envelope's `budget` was carried and dropped by BOTH
 * adapters while the run registry was pruned by NEITHER. The two rules that fix
 * that live in `ai-runtime-bounds.ts`; this suite measures the rules themselves,
 * at their own boundary, so the adapter suites only have to prove they are
 * *called*.
 *
 * The rules, and why each is a rule rather than a line of arithmetic:
 *   - a run's wall-clock bound is the SOONER of `deadline` (an instant) and
 *     `budget.milliseconds` (a DURATION, measured from admission);
 *   - an ABSENT bound is not a ZERO bound;
 *   - an unreadable bound bounds nothing (garbage must not kill a healthy run);
 *   - pruning evicts FINISHED runs oldest-first and NEVER a live one — a run in
 *     flight is still addressable, so evicting it would be the worse defect.
 */
import type { AiRuntimeEnvelope } from '../ai-runtime-port'
import {
  DEFAULT_MAX_RETAINED_RUNS,
  pruneRunRegistry,
  resolveRunDeadline,
  type RetainedRun,
} from '../ai-runtime-bounds'

function envelope(overrides: Partial<AiRuntimeEnvelope> = {}): AiRuntimeEnvelope {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    tenantId: 'tenant-1',
    principalId: 'principal-1',
    actorId: 'actor-1',
    agentId: 'agent-1',
    conversationId: 'conv-1',
    capabilityGrantId: 'grant-1',
    ...overrides,
  }
}

describe('P2-6 §2.12 — resolveRunDeadline: the SOONER of the two time bounds', () => {
  const ADMITTED_AT = 1_000_000

  it('bounds nothing when the envelope carries neither bound — an absent bound is not a zero bound', () => {
    expect(resolveRunDeadline(envelope(), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: null }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ deadline: null }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: {} }), ADMITTED_AT)).toBeNull()
  })

  it('reads `deadline` as an absolute instant (string or Date)', () => {
    const iso = new Date(ADMITTED_AT + 5_000).toISOString()
    expect(resolveRunDeadline(envelope({ deadline: iso }), ADMITTED_AT)).toBe(ADMITTED_AT + 5_000)
    expect(resolveRunDeadline(envelope({ deadline: new Date(ADMITTED_AT + 7_000) }), ADMITTED_AT)).toBe(
      ADMITTED_AT + 7_000,
    )
  })

  it('reads `budget.milliseconds` as a DURATION measured from admission — the P2-6 fix', () => {
    // Before P2-6 this field was carried and dropped: the envelope's budget was
    // never read by either adapter, so a budget was a decoration.
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: 3_000 } }), ADMITTED_AT)).toBe(
      ADMITTED_AT + 3_000,
    )
  })

  it('takes the SOONER bound when both are present — both orders', () => {
    const deadlineSooner = envelope({
      deadline: new Date(ADMITTED_AT + 1_000).toISOString(),
      budget: { milliseconds: 9_000 },
    })
    expect(resolveRunDeadline(deadlineSooner, ADMITTED_AT)).toBe(ADMITTED_AT + 1_000)

    const budgetSooner = envelope({
      deadline: new Date(ADMITTED_AT + 9_000).toISOString(),
      budget: { milliseconds: 1_000 },
    })
    expect(resolveRunDeadline(budgetSooner, ADMITTED_AT)).toBe(ADMITTED_AT + 1_000)
  })

  it('ignores an UNREADABLE deadline rather than firing immediately — garbage must not kill a healthy run', () => {
    // A `deadline` of "soon" is not a bound; it must bound nothing, not fire at
    // once. The budget beside it still applies.
    const garbled = envelope({ deadline: 'not-a-date', budget: { milliseconds: 2_000 } })
    expect(resolveRunDeadline(garbled, ADMITTED_AT)).toBe(ADMITTED_AT + 2_000)
    // ...and with no budget beside it, an unreadable deadline bounds nothing.
    expect(resolveRunDeadline(envelope({ deadline: 'not-a-date' }), ADMITTED_AT)).toBeNull()
  })

  it('ignores a non-positive or non-finite `budget.milliseconds` — zero is not a bound', () => {
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: 0 } }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: -5 } }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: Number.NaN } }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: { tokens: 100 } }), ADMITTED_AT)).toBeNull()
  })

  it('accepts a NUMERIC-STRING budget — a JSON caller that stringified the number must not lose its bound', () => {
    // The envelope's TYPE says `number`, but the value arrives from an untrusted
    // caller (a JSON body), which is exactly why `resolveRunDeadline` is the
    // boundary that must cope. The cast simulates that mistyped wire value.
    const stringified = '5000' as unknown as number
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: stringified } }), ADMITTED_AT)).toBe(
      ADMITTED_AT + 5_000,
    )
  })

  it('ignores a NON-NUMERIC budget string (logged, not applied) — garbage bounds nothing, silently or otherwise', () => {
    const asWire = (v: unknown): number => v as unknown as number
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: asWire('soon') } }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: asWire('') } }), ADMITTED_AT)).toBeNull()
    expect(resolveRunDeadline(envelope({ budget: { milliseconds: asWire({}) } }), ADMITTED_AT)).toBeNull()
  })
})

describe('P2-6 §2.12 — pruneRunRegistry: bounded memory, and a live run is NEVER evicted', () => {
  function run(runId: string, state: Partial<RetainedRun> = {}): RetainedRun {
    return { runId, cancelled: false, completed: false, ...state }
  }

  function registry(runs: RetainedRun[]): Map<string, RetainedRun> {
    return new Map(runs.map((r) => [r.runId, r]))
  }

  it('does nothing while the registry is within the cap', () => {
    const runs = registry([run('a'), run('b'), run('c')])
    expect(pruneRunRegistry(runs, 3)).toBe(0)
    expect(runs.size).toBe(3)
  })

  it('evicts FINISHED runs oldest-first until it is back within the cap', () => {
    const runs = registry([
      run('old-done', { completed: true }),
      run('older-done', { cancelled: true }),
      run('live'),
      run('new-done', { completed: true }),
    ])
    // Cap 2 → two must go. The two oldest FINISHED runs are evicted; the live
    // one and the newest finished one stay.
    expect(pruneRunRegistry(runs, 2)).toBe(2)
    expect(runs.size).toBe(2)
    expect([...runs.keys()]).toEqual(['live', 'new-done'])
  })

  it('NEVER evicts a live run, even when that leaves it over the cap', () => {
    // All live: nothing may be evicted, because every one is still addressable
    // by `streamRun`/`cancelRun`. The bound is therefore (live runs + cap).
    const runs = registry([run('a'), run('b'), run('c')])
    expect(pruneRunRegistry(runs, 1)).toBe(0)
    expect(runs.size).toBe(3)
  })

  it('evicts only as many finished runs as needed — no over-eviction', () => {
    const runs = registry([
      run('done-1', { completed: true }),
      run('done-2', { completed: true }),
      run('done-3', { completed: true }),
      run('live'),
    ])
    expect(pruneRunRegistry(runs, 3)).toBe(1)
    expect([...runs.keys()]).toEqual(['done-2', 'done-3', 'live'])
  })

  it('the default cap is a real, positive bound', () => {
    expect(DEFAULT_MAX_RETAINED_RUNS).toBeGreaterThan(0)
    const runs = registry([run('done', { completed: true })])
    expect(pruneRunRegistry(runs)).toBe(0)
    expect(runs.size).toBe(1)
  })
})
