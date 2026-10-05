/**
 * **The decisive test of G-07** — the vision's most important reusable chain
 * (§160), executed.
 *
 * > AI request → Business IR → result → **Save as Function** → Function →
 * > **Widget** → Workspace
 *
 * G-03 proved a Function runs with no AI. This proves the **next arrow**: that a
 * Widget placed from that Function is *usable* — its own inputs are the Function's
 * parameters, so the values a form collects can be handed straight to the runner,
 * and the exact `QueryOptions` that reach the engine are the ones G-03's own suite
 * expects. The Widget adds an interface, and changes nothing about what runs.
 *
 * It is asserted at the **bytes the engine receives**, not at a row count: the
 * interesting failure is not "it did not run" but "it ran, and the wrong thing
 * reached the database".
 */

import { runFunction } from '../../user-function/run'
import type { QueryRunner } from '../../user-function/run'
import type { QueryOptions } from '../../query/types'
import type { CustomFieldKind } from '../../../modules/entities/kinds'
import {
  BINDINGS,
  CTX,
  EXPECTED_QUERY_OPTIONS,
  MODEL,
  MODEL_RENAMED,
  PLATFORM_ENTITY_ID,
  place,
  placedFunction,
} from './fixtures'

const DEFAULT_ROWS = [{ id: 'c-1', subject: 'Order 42' }]

function fakeEngine(rows: unknown[] = DEFAULT_ROWS): {
  calls: Array<{ entity: string; opts: QueryOptions }>
  engine: QueryRunner
} {
  const calls: Array<{ entity: string; opts: QueryOptions }> = []
  const engine: QueryRunner = {
    query: (async (entity: string, opts?: QueryOptions) => {
      calls.push({ entity, opts: opts ?? {} })
      return { items: rows, page: 1, pageSize: rows.length, total: rows.length }
    }) as QueryRunner['query'],
  }
  return { calls, engine }
}

/**
 * What a form control of a given kind collects.
 *
 * This is the *renderer's* job in production; here it stands in for a person
 * filling the form, so the test can drive the Widget the way a user would.
 */
function formValueFor(kind: CustomFieldKind): unknown {
  switch (kind) {
    case 'integer':
    case 'float':
      return 3
    case 'boolean':
      return true
    case 'currency':
      return { amount: 3, currency: 'GBP' }
    case 'date':
      return '2026-01-01'
    case 'datetime':
      return '2026-01-01T00:00:00.000Z'
    default:
      return 'a value'
  }
}

describe('a placed Widget runs its Function, with no AI', () => {
  it('the Widget’s own inputs ARE the Function’s parameters', () => {
    const { widget, ir } = place()
    const fn = placedFunction()
    // The property that makes the chain work: a form built from the Widget can
    // feed the runner, with no translation layer and nothing to keep in step.
    expect(ir.inputs.map((input) => input.id)).toEqual(fn.parameterSchema.map((parameter) => parameter.name))
    expect(widget.inputs.map((input) => input.id)).toEqual(fn.parameterSchema.map((parameter) => parameter.name))
  })

  it('collects the form values and hands the engine the exact plan', async () => {
    const { widget, ir } = place()
    const { calls, engine } = fakeEngine()

    // A person fills the form the Widget describes.
    const values: Record<string, unknown> = {}
    for (const input of ir.inputs) {
      values[input.id] = formValueFor(input.type)
    }

    const result = await runFunction(placedFunction(), values, CTX, MODEL, BINDINGS, engine)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual(DEFAULT_ROWS)

    // Exactly the plan G-03's own suite expects — the Widget changed nothing.
    expect(calls).toHaveLength(1)
    expect(calls[0].entity).toBe(PLATFORM_ENTITY_ID)
    expect(calls[0].opts).toEqual(EXPECTED_QUERY_OPTIONS)

    // The Widget contributes an interface and no data of its own.
    expect(widget.dependencies.functions).toEqual(['unread_conversations'])
  })

  it('a Widget whose Function is stale cannot run, and never reaches the engine', async () => {
    const { calls, engine } = fakeEngine()
    const result = await runFunction(placedFunction(), { min_unread: 3 }, CTX, MODEL_RENAMED, BINDINGS, engine)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('STALE')
    expect(calls).toHaveLength(0)
  })

  it('running the Widget twice with the same values is deterministic', async () => {
    const first = await runFunction(placedFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, fakeEngine().engine)
    const second = await runFunction(placedFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, fakeEngine().engine)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.executionFingerprint).toBe(first.executionFingerprint)
  })
})
