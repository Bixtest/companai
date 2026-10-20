/**
 * `T-04` — a Function that asks for a count does not return rows.
 *
 * Until this row nothing covered the scenario at all. A Function whose IR said `operation: 'count'`
 * compiled with a **gap**, verified `query_plan_valid: passed` with `passed: true`, was offered for
 * saving, saved, published, became runnable — and returned **a list of rows** to somebody who asked
 * for **a number**. A green suite behind a materially wrong answer, which is the one failure this
 * project's whole method is aimed at.
 *
 * So the subject here is the scenario, not the units: the compiler refuses, the report does not say
 * passed, and the runner never touches the engine. The boundary is asserted from the other side too —
 * an ordinary list IR must still run, and hand the engine exactly the plan it handed it before.
 */

import { bindParameters } from '../../business-ir/bind'
import { compileQuery } from '../../business-ir/compile'
import type { BusinessQueryIR } from '../../business-ir/types'
import type { QueryOptions } from '../../query/types'
import { runFunction } from '../run'
import type { QueryRunner, RunResult } from '../run'
import { verifyFunction } from '../verify'
import { BINDINGS, CTX, EXPECTED_QUERY_OPTIONS, MODEL, UNREAD_IR, makeFunction } from './fixtures'

/** The fixture IR, asking for a count instead of a list. */
const COUNT_IR: BusinessQueryIR = { ...UNREAD_IR, operation: 'count' }

/**
 * The IR the compiler actually sees. A `$param` placeholder is refused at stage 2 — before the
 * operation is ever looked at — so the compiler is asked the question through the same binding step
 * the runner uses, rather than a hand-written IR that would prove a string instead of the path.
 */
const BOUND_COUNT_IR = (() => {
  const bound = bindParameters(COUNT_IR, { min_unread: 3 }, makeFunction().parameterSchema ?? [])
  if (!bound.ok) throw new Error('the count fixture failed to bind: ' + JSON.stringify(bound.errors))
  return bound.ir
})()

/** A runner that records what reached it, so a refusal can be proven to have stopped short. */
function engine(): { calls: Array<{ entity: string; opts: QueryOptions }>; runner: QueryRunner } {
  const calls: Array<{ entity: string; opts: QueryOptions }> = []
  const runner: QueryRunner = {
    query: (async (entity: string, opts?: QueryOptions) => {
      calls.push({ entity, opts: opts ?? {} })
      return { items: [{ id: 'c-1' }], page: 1, pageSize: 1, total: 1 }
    }) as QueryRunner['query'],
  }
  return { calls, runner }
}

function expectFailure(result: RunResult): Extract<RunResult, { ok: false }> {
  if (result.ok) throw new Error('expected a refusal, got rows')
  return result
}

describe('T-04 — a Function that asks for a count does not return rows', () => {
  it('★ the compiler refuses the IR, rather than emitting a gap that survives as a pass', () => {
    const compiled = compileQuery(BOUND_COUNT_IR, MODEL, CTX, BINDINGS)

    expect(compiled.ok).toBe(false)
    const diagnostic = compiled.diagnostics.find((d) => d.code === 'ROW_ORIENTED_TARGET')
    // The severity is the whole point: a gap is excluded from verify's error filter by construction.
    expect(diagnostic?.severity).toBe('error')
  })

  it('★ the verification report says failed, with the compiler’s own reason', () => {
    const fn = makeFunction({ businessIr: COUNT_IR })
    const report = verifyFunction(fn, MODEL, BINDINGS, CTX)

    const check = report.checks.find((c) => c.name === 'query_plan_valid')
    expect(check?.outcome).toBe('failed')
    expect(String(check?.detail)).toContain('row-oriented')
    expect(report.passed).toBe(false)
  })

  it('★ the runner refuses it and never calls the engine', async () => {
    const fn = makeFunction({ businessIr: COUNT_IR })
    const { calls, runner } = engine()

    const result = expectFailure(await runFunction(fn, { min_unread: 3 }, CTX, MODEL, BINDINGS, runner))

    expect(result.code).toBe('OPERATION_NOT_LIST')
    expect(result.reason).toContain('count')
    // The refusal is real: the engine was never reached, so no rows were manufactured.
    expect(calls).toHaveLength(0)
  })

  it('★ a list IR still runs, and the engine sees the same QueryOptions as before', async () => {
    // The boundary, asserted from the other side: the fix must not refuse the query it exists to run.
    const fn = makeFunction()
    const { calls, runner } = engine()

    const result = await runFunction(fn, { min_unread: 3 }, CTX, MODEL, BINDINGS, runner)

    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].opts).toEqual(EXPECTED_QUERY_OPTIONS)
  })

  it('★ the honest message: a passing check with a gap says what is still missing', () => {
    // Regression guard for the sentence the defect hid behind. `AUTHORIZATION_NOT_IMPLEMENTED` is the
    // real gap on this IR — the answer is a real list, projected without the authorization the platform
    // has not built yet — so the check passes. What it must no longer do is claim, in the same breath,
    // that the plan is fully executable.
    const fn = makeFunction()
    const report = verifyFunction(fn, MODEL, BINDINGS, CTX)
    const check = report.checks.find((c) => c.name === 'query_plan_valid')

    expect(check?.outcome).toBe('passed')
    expect(String(check?.detail)).not.toBe('The compiler resolved this against the model without error.')
    expect(String(check?.detail)).toContain('without error')
    // And it names what is still missing rather than leaving the reader to discover it.
    expect(String(check?.detail)).toContain('The plan is executable, but')
  })
})
