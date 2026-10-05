/**
 * The G-07 fixture.
 *
 * It **reuses G-03's fixture on purpose.** The Widget under test is derived from a
 * real published Function, against the real model the platform carries — so the
 * placement test exercises the chain the vision calls the most important one
 * (§160: Function → Widget), rather than a convenient invention. Importing the
 * fixture also proves the two modules compose without either being changed.
 */

import { placeFunction } from '../placement'
import type { WidgetIR } from '../ir'
import type { BusinessWidget } from '../types'
import type { UserFunction } from '../../user-function/types'
import { makeFunction } from '../../user-function/__tests__/fixtures'

export {
  BINDINGS,
  CTX,
  EXPECTED_QUERY_OPTIONS,
  MODEL,
  MODEL_PLUS,
  MODEL_RENAMED,
  MODEL_VERSION,
  PLATFORM_ENTITY_ID,
  makeFunction,
} from '../../user-function/__tests__/fixtures'

/** A Function in the state that can be placed — G-03's fixture, which is `active`. */
export function placedFunction(overrides: Partial<UserFunction> = {}): UserFunction {
  return makeFunction(overrides)
}

/**
 * A placed Widget and its IR.
 *
 * Throws rather than returning undefined, so a test that expected a placement can
 * never quietly assert against nothing.
 */
export function place(
  overrides: Partial<UserFunction> = {},
  options: Parameters<typeof placeFunction>[1] = {},
): { widget: BusinessWidget; ir: WidgetIR } {
  const result = placeFunction(placedFunction(overrides), options)
  if (!result.ok) throw new Error(`fixture: placement was refused — ${result.reason}`)
  return { widget: result.widget, ir: result.ir }
}
