/**
 * Parameter binding — §47's *"platform resolves parameters"*.
 *
 * A Function is not a fixed query. It is *"customers in {country} whose balance
 * is above {threshold}"* — one saved capability that a person can run with
 * different values. So the IR may carry **placeholders**, and something has to
 * turn those into values before the compiler sees them.
 *
 * **Why binding happens before compilation, and not inside it.** G-02's compiler
 * is a *validator*: it fails closed on anything it cannot resolve against the
 * model. A placeholder is not a value, so the IR is made **concrete first** and
 * the compiler is left untouched — one pipeline stage, one job. The compiler
 * carries a guard that refuses a stray placeholder, so this ordering is enforced
 * rather than merely intended.
 *
 * **An unbound placeholder is always an error.** Never passed through, never
 * defaulted to `undefined`. Passing it through would let a marker reach the
 * database as a value; that is precisely the class of defect this module exists
 * to make impossible.
 *
 * **A value is checked against how it is used, not only against its declared
 * kind.** This is subtle and it is load-bearing. `{field: 'subject', operator:
 * 'in', value: {$param: 'subjects'}}` with a `text` parameter is *correct* — an
 * `in` filter needs a **list** of texts, and checking only the kind would reject
 * it. `{operator: 'exists'}` needs a boolean, whatever the parameter's kind says.
 * So the operator travels with the value into the check. Without this, the binder
 * would refuse valid Functions and accept invalid ones.
 *
 * Source: Doc 3 Part VIII §45, §47; COOKBOOK Sprint G-03 step 3.6.
 */

import type {
  BusinessQueryIR,
  IrFilter,
  IrFilterOperator,
  ParameterReference,
} from './types'
import { collectParameterReferences, isParameterReference, PARAM_MARKER } from './types'
import type { FunctionParameter, ParameterSchema } from '../user-function/types'
import type { CustomFieldKind } from '../../modules/entities/kinds'

// The placeholder vocabulary belongs to the IR, so it is declared there and
// re-exported here for callers that think of it as part of binding.
export { collectParameterReferences, isParameterReference, PARAM_MARKER }
export type { ParameterReference }

export type BindError = {
  code: 'UNKNOWN_PARAMETER' | 'MISSING_PARAMETER' | 'PARAMETER_TYPE_MISMATCH'
  message: string
  parameter?: string
  path?: string
}

export type BindResult =
  | { ok: true; ir: BusinessQueryIR }
  | { ok: false; errors: BindError[] }

/**
 * Whether a value fits a declared kind.
 *
 * The vocabulary is the platform's own **13 field kinds** (`kinds.ts`), not a
 * second one, so a parameter's type check and a field's type check cannot drift.
 * `attachment` accepts one id or many; `relation` and `dictionary` take the
 * referenced id.
 *
 * **This answers "is this the right sort of thing", not "is this the right shape
 * for the operator".** A list is checked by {@link valueFits}, which knows what
 * consumes it.
 */
export function isValueOfKind(value: unknown, kind: CustomFieldKind): boolean {
  switch (kind) {
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'float':
    case 'currency':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'date':
    case 'datetime':
      return typeof value === 'string' || value instanceof Date
    case 'attachment':
      return typeof value === 'string' || Array.isArray(value)
    case 'text':
    case 'multiline':
    case 'phone':
    case 'select':
    case 'dictionary':
    case 'relation':
      return typeof value === 'string'
    default:
      // An unknown kind is not silently accepted — but the kind union is closed,
      // so this is unreachable in practice and refuses if it ever is not.
      return false
  }
}

/** The operators that change what shape a value must have. */
const LIST_OPERATORS = new Set(['in', 'nin'])

/**
 * Whether a value fits, given what consumes it.
 *
 * Exported because verification needs the same rule as the binder — one rule, one
 * implementation, so a Function cannot be verified against a check it will not be
 * held to at run time.
 */
export function valueFits(
  value: unknown,
  parameter: FunctionParameter,
  operator?: IrFilterOperator,
): { ok: true } | { ok: false; message: string } {
  const op = operator === undefined ? undefined : String(operator)

  if (op !== undefined && LIST_OPERATORS.has(op)) {
    if (!Array.isArray(value)) {
      return {
        ok: false,
        message: `Parameter "${parameter.name}" feeds an "${op}" filter, which needs a list, but received ${describe(value)}.`,
      }
    }
    for (const item of value) {
      if (!isValueOfKind(item, parameter.kind)) {
        return {
          ok: false,
          message: `Parameter "${parameter.name}" is declared as ${parameter.kind}, but the list it feeds contains ${describe(item)}.`,
        }
      }
    }
    return { ok: true }
  }

  if (op === 'exists') {
    if (typeof value !== 'boolean') {
      return {
        ok: false,
        message: `Parameter "${parameter.name}" feeds an "exists" filter, which needs true or false, but received ${describe(value)}.`,
      }
    }
    return { ok: true }
  }

  if (!isValueOfKind(value, parameter.kind)) {
    return {
      ok: false,
      message: `Parameter "${parameter.name}" is declared as ${parameter.kind} but received ${describe(value)}.`,
    }
  }
  return { ok: true }
}

/**
 * Bind values into an IR, producing a **concrete** IR.
 *
 * The result is a new object; the input is never mutated, so a caller cannot
 * accidentally keep a half-bound IR.
 */
export function bindParameters(
  ir: BusinessQueryIR,
  values: Record<string, unknown>,
  schema: ParameterSchema,
): BindResult {
  const errors: BindError[] = []
  const byName = new Map<string, FunctionParameter>()
  for (const parameter of schema) byName.set(parameter.name, parameter)

  // A supplied value with no declaration is a mistake, and accepting it silently
  // would hide a typo. Refuse it.
  for (const name of Object.keys(values ?? {})) {
    if (!byName.has(name)) {
      errors.push({
        code: 'UNKNOWN_PARAMETER',
        message: `Parameter "${name}" was supplied but is not declared by this Function.`,
        parameter: name,
      })
    }
  }

  const resolveValue = (
    name: string,
    path: string,
    operator?: IrFilterOperator,
  ): { found: boolean; value: unknown } => {
    const parameter = byName.get(name)
    if (!parameter) {
      errors.push({
        code: 'UNKNOWN_PARAMETER',
        message: `The IR asks for "${name}" at ${path}, but the Function does not declare that parameter.`,
        parameter: name,
        path,
      })
      return { found: false, value: undefined }
    }

    const supplied = Object.prototype.hasOwnProperty.call(values ?? {}, name)
    const value = supplied ? values[name] : parameter.default

    if (value === undefined || value === null) {
      errors.push({
        code: 'MISSING_PARAMETER',
        message: `Parameter "${name}" is needed by ${path} but no value was supplied and it has no default.`,
        parameter: name,
        path,
      })
      return { found: false, value: undefined }
    }

    const fits = valueFits(value, parameter, operator)
    if (!fits.ok) {
      errors.push({
        code: 'PARAMETER_TYPE_MISMATCH',
        message: fits.message,
        parameter: name,
        path,
      })
      return { found: false, value: undefined }
    }

    return { found: true, value }
  }

  // A required parameter must be given even if the IR does not happen to
  // reference it — "required" is a property of the Function, not of one query.
  for (const parameter of schema) {
    if (!parameter.required) continue
    const supplied = Object.prototype.hasOwnProperty.call(values ?? {}, parameter.name)
    if (supplied) continue
    if (parameter.default !== undefined) continue
    errors.push({
      code: 'MISSING_PARAMETER',
      message: `Parameter "${parameter.name}" is required but no value was supplied.`,
      parameter: parameter.name,
    })
  }

  /**
   * Replace every placeholder inside a value, at any depth.
   *
   * **Depth matters.** A money value carries its marker inside `amount`
   * (`{ amount: {$param: 'threshold'}, currency: 'GBP' }` — the vision's §50
   * example), and the compiler unwraps a money value to that `amount` before
   * comparing it. A binder that only looked at the top of a filter value would
   * leave the marker in place, and it would reach the engine as a literal. So the
   * substitution walks the value.
   *
   * The filter's operator travels with the walk, because a nested marker's
   * resolved value is the thing the operator actually compares.
   */
  const bindValue = (
    value: unknown,
    path: string,
    operator: IrFilterOperator | undefined,
  ): unknown => {
    if (isParameterReference(value)) {
      const resolved = resolveValue(value[PARAM_MARKER], path, operator)
      return resolved.found ? resolved.value : value
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => bindValue(item, `${path}[${index}]`, operator))
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      const out: Record<string, unknown> = {}
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        out[key] = bindValue(nested, `${path}.${key}`, operator)
      }
      return out
    }
    return value
  }

  const boundFilters: IrFilter[] = (ir.filters ?? []).map(
    (filter, index) =>
      ({
        ...filter,
        value: bindValue(
          (filter as IrFilter).value,
          `filters[${index}].value`,
          (filter as IrFilter).operator,
        ),
      }) as IrFilter,
  )

  let timeRange = ir.timeRange
  if (ir.timeRange) {
    const from = bindValue(ir.timeRange.from, 'timeRange.from', undefined)
    const to = bindValue(ir.timeRange.to, 'timeRange.to', undefined)
    timeRange = {
      ...ir.timeRange,
      ...(from !== undefined ? { from: String(from) } : {}),
      ...(to !== undefined ? { to: String(to) } : {}),
    }
  }

  const limit = bindValue(ir.limit, 'limit', undefined)

  if (errors.length > 0) return { ok: false, errors }

  const bound: BusinessQueryIR = {
    ...ir,
    ...(ir.filters ? { filters: boundFilters } : {}),
    ...(timeRange ? { timeRange } : {}),
  }
  if (typeof limit === 'number') bound.limit = limit
  else delete (bound as { limit?: unknown }).limit

  return { ok: true, ir: bound }
}

/**
 * A representative value for every declared parameter, chosen so that the IR can
 * actually be compiled.
 *
 * **Why this exists.** Verification and the freshness check both need to compile a
 * Function's IR — to prove it resolves, and to prove it still resolves after the
 * model moved. Neither has a user's values to hand, and the compiler refuses a
 * placeholder. So each parameter is bound to a sample of its declared kind.
 *
 * **The sample is always a real value of the declared kind.** The operator decides
 * only whether that value is wrapped in a list (an `in` filter needs a list of the
 * declared kind). Where the kind and the operator genuinely disagree — an integer
 * parameter feeding an `exists` filter, which needs a boolean — the sample is still
 * the integer, so the compile **fails** and verification reports the truth. Choosing
 * a boolean to keep the compile happy would have hidden a Function that cannot run.
 *
 * **What this does not claim.** A sample proves the IR compiles *for a value of
 * the declared kind* — not for every value. That is the honest limit, and it is
 * the same limit the binder enforces at run time, so the two cannot disagree.
 */
export function sampleValuesFor(ir: BusinessQueryIR, schema: ParameterSchema): Record<string, unknown> {
  /** Whether a parameter feeds an operator that needs a list. */
  const needsList = new Map<string, boolean>()
  const note = (name: string, list: boolean): void => {
    const current = needsList.get(name)
    if (current === undefined || list) needsList.set(name, list)
  }

  // Ask each filter on its own, so the operator that consumes a parameter is known
  // for that parameter — and use the IR's own walk, so a marker nested inside a
  // money value is found here exactly as the binder and the compiler's guard find it.
  for (const filter of ir.filters ?? []) {
    const list = LIST_OPERATORS.has(String((filter as IrFilter).operator))
    for (const reference of collectParameterReferences({ ...ir, filters: [filter] })) {
      note(reference.name, list)
    }
  }
  for (const reference of collectParameterReferences({ ...ir, filters: [] })) {
    note(reference.name, false)
  }

  const samples: Record<string, unknown> = {}
  for (const parameter of schema) {
    const list = needsList.get(parameter.name) ?? false
    const scalar = scalarSampleFor(parameter.kind)

    // Prefer a declared default when it already has the right shape: a default is
    // the most realistic value there is.
    if (
      parameter.default !== undefined &&
      (list ? Array.isArray(parameter.default) : !Array.isArray(parameter.default))
    ) {
      samples[parameter.name] = parameter.default
    } else {
      samples[parameter.name] = list ? [scalar] : scalar
    }
  }

  return samples
}

function scalarSampleFor(kind: CustomFieldKind): unknown {
  switch (kind) {
    case 'integer':
      return 1
    case 'float':
    case 'currency':
      return 1.5
    case 'boolean':
      return true
    case 'date':
      return '2026-01-01'
    case 'datetime':
      return '2026-01-01T00:00:00.000Z'
    case 'attachment':
      return 'sample_attachment'
    case 'text':
    case 'multiline':
    case 'phone':
    case 'select':
    case 'dictionary':
    case 'relation':
      return 'sample'
    default:
      return 'sample'
  }
}

function describe(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'a list'
  return `${typeof value}`
}
