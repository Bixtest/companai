/**
 * The Business IR — the typed shape of a read and a write.
 *
 * The vision's rule is short and it is the whole reason this module exists:
 * **the AI never writes raw SQL** (Doc 3 §49, §52). It produces a *typed
 * intermediate representation*, and the compiler turns that into the physical
 * query the engine already knows how to run. SQL is not rejected — it is
 * **demoted** to a compile target (§52).
 *
 * Two IRs, because a read and a write are not the same thing:
 *
 *   - {@link BusinessQueryIR} — §50, verbatim: operation, subject entity, grain,
 *     dimensions, measures, filters, relationships, time range, time basis,
 *     currency basis, sort, limit.
 *   - {@link BusinessCommandIR} — §53, verbatim: command, inputs, requested-by,
 *     idempotency key.
 *
 * **Every reference is a canonical id** (spec §12.1). That is what makes the
 * plan's own test meaningful: a rename changes an id, and an IR that names the
 * old id must be *seen* to be stale rather than silently compiled.
 *
 * **There is no scope field, and that is deliberate.** `tenantId` /
 * `organizationId` do not exist anywhere in these types. Scope is derived from
 * the operating context by the compiler, exactly as `scope-injection.ts` already
 * strips it from AI-authored payloads — so an IR *cannot* widen its own reach,
 * because the type has nowhere to put the attempt.
 *
 * Source: SPEC-business-model-kernel.md §6; Doc 3 §49–§53.
 */

import type { FilterOp, QueryOptions } from '../query/types'

/* ------------------------------------------------------------------ *
 * The query IR (§50)
 * ------------------------------------------------------------------ */

/** What the read is for. `list` returns rows; `count` and `aggregate` summarise. */
export type IrOperation = 'list' | 'count' | 'aggregate'

/**
 * The operator vocabulary, as written in the IR.
 *
 * It accepts **both** the engine's names (`eq`, `gt`, `like` …) and the symbols
 * a person or a model naturally writes (`=`, `>`, `contains`). The compiler maps
 * one to the other; there is no second operator vocabulary at the physical end.
 */
export type IrFilterOperator =
  | FilterOp
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'contains'

/** An amount with its currency — the vision's example filter value (§50). */
export type IrMoney = { amount: number; currency: string }

/**
 * **§47's placeholder** — "a value is supplied here when the Function runs".
 *
 * It is part of the IR's own vocabulary, not an afterthought: a saved Function is
 * not one fixed query but *"customers in {country} whose balance is above
 * {threshold}"*, so the IR has to be able to say "a value goes here". It appears
 * in a filter value, a time-range bound, or the limit.
 *
 * It is **resolved before compilation** (`bind.ts`), and the compiler refuses one
 * that is still present — see the guard in `compile.ts`. A placeholder is never a
 * value.
 */
export type IrParameterReference = { $param: string }

/** The marker key, as a value so both the IR and the binder read the same one. */
export const PARAM_MARKER = '$param' as const

/** Whether a value is a placeholder marker. */
export function isParameterReference(value: unknown): value is IrParameterReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)[PARAM_MARKER] === 'string'
  )
}

/** Where in the IR a placeholder was found. */
export type ParameterReference = { name: string; path: string }

/**
 * Every placeholder the IR carries, and where it sits.
 *
 * **The walk is deep, and that is deliberate.** A placeholder can sit inside a
 * money value — `{ amount: {$param: 'threshold'}, currency: 'GBP' }` is exactly
 * the vision's §50 example — and the compiler unwraps a money value to its
 * `amount` before comparing it. A shallow scan would miss that marker, so the
 * guard would not fire and the marker would reach the engine as a literal value.
 * Scanning at any depth means a new nested shape cannot reintroduce that.
 *
 * One implementation, used by three callers: the binder, the compiler's guard, and
 * anything that wants to show a person which parameters a Function will ask for.
 */
export function collectParameterReferences(ir: BusinessQueryIR): ParameterReference[] {
  const found: ParameterReference[] = []

  const scan = (value: unknown, path: string): void => {
    if (isParameterReference(value)) {
      found.push({ name: value[PARAM_MARKER], path })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => scan(item, `${path}[${index}]`))
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        scan(nested, `${path}.${key}`)
      }
    }
  }

  for (const [index, filter] of (ir.filters ?? []).entries()) {
    scan((filter as IrFilter).value, `filters[${index}].value`)
  }
  scan(ir.timeRange?.from, 'timeRange.from')
  scan(ir.timeRange?.to, 'timeRange.to')
  scan(ir.limit, 'limit')

  return found
}

/** A filter on a declared field. */
export type IrFieldFilter = {
  field: string
  operator: IrFilterOperator
  value?: unknown
}

/** A filter on a metric — kept distinct so the compiler can report the metric gap. */
export type IrMetricFilter = {
  metric: string
  operator: IrFilterOperator
  value?: unknown
}

export type IrFilter = IrFieldFilter | IrMetricFilter

export type IrAggregateOp = 'sum' | 'count' | 'avg' | 'min' | 'max'

/** A measure written inline, over a declared field. */
export type IrInlineMeasure = { aggregate: IrAggregateOp; field: string }

/** A measure that names a declared metric. */
export type IrNamedMeasure = { metric: string }

export type IrMeasure = IrInlineMeasure | IrNamedMeasure

export type IrSort = {
  field?: string
  metric?: string
  direction?: 'asc' | 'desc'
}

/**
 * A time window, optionally over a named time field.
 *
 * A bound may be a placeholder: *"since {start}"* is one of the most natural
 * parameters a saved report has, so the type says so rather than leaving the
 * binder's support for it unexpressible.
 */
export type IrTimeRange = {
  from?: string | IrParameterReference
  to?: string | IrParameterReference
  field?: string
}

export type BusinessQueryIR = {
  operation: IrOperation
  /** The subject entity — a canonical entity id. */
  entity: string
  /** What one row of the result means. */
  grain?: string
  /** Grouping fields — canonical field ids. */
  dimensions?: string[]
  measures?: IrMeasure[]
  filters?: IrFilter[]
  /** The declared relationships the query traverses — canonical relationship ids. */
  relationships?: string[]
  timeRange?: IrTimeRange
  /** Which time the query is anchored to (e.g. `occurred_at`). */
  timeBasis?: string
  /** Which currency the amounts are stated in. */
  currencyBasis?: string
  sort?: IrSort[]
  /** How many rows. A placeholder is allowed, so *"the top {n}"* is expressible. */
  limit?: number | IrParameterReference
  offset?: number
}

/* ------------------------------------------------------------------ *
 * The command IR (§53)
 * ------------------------------------------------------------------ */

/**
 * A write, as an explicit business operation rather than a table edit.
 *
 * The shape is the vision's, verbatim. `command` is a canonical id — a business
 * verb, not a tool name. `idempotency_key` is required: a retried command must
 * collapse to one effect, and today the platform already computes exactly such a
 * key in `prepare-mutation.ts` (`computeMutationIdempotencyKey`), so this is a
 * contract the platform can already honour.
 */
export type BusinessCommandIR = {
  command: string
  inputs: Record<string, unknown>
  requested_by: string
  idempotency_key: string
}

/* ------------------------------------------------------------------ *
 * Diagnostics — the compiler's output when it will not compile
 * ------------------------------------------------------------------ */

/**
 * The §51 stages, in the vision's order. Declared as a union so a diagnostic can
 * always name the stage that produced it, and so "which stages ran" is a value.
 */
export type IrStage =
  | 'resolve_schema'
  | 'check_types'
  | 'resolve_values'
  | 'validate_paths'
  | 'expand_measures'
  | 'normalise_time_currency'
  | 'inject_authorization'
  | 'inject_scope'
  | 'plan_physical'
  | 'validate_sql_safety'

/** Every §51 stage, in order — the pipeline's own declaration. */
export const IR_STAGES: readonly IrStage[] = [
  'resolve_schema',
  'check_types',
  'resolve_values',
  'validate_paths',
  'expand_measures',
  'normalise_time_currency',
  'inject_authorization',
  'inject_scope',
  'plan_physical',
  'validate_sql_safety',
]

/**
 * **Two severities, because "wrong" and "not yet possible" are different.**
 *
 * `error` — the IR is invalid. The compile **fails**.
 * `gap`   — the IR is valid, but the platform cannot execute it yet. The compile
 *           **succeeds** and the gap is reported, so the compiler doubles as a
 *           measurement of what the platform can actually do.
 *
 * Collapsing the two would either hide real invalidity (if everything were a
 * gap) or refuse valid requests the platform simply cannot serve yet (if
 * everything were an error). Neither is honest.
 */
export type IrSeverity = 'error' | 'gap'

export type IrDiagnostic = {
  stage: IrStage
  severity: IrSeverity
  /** A stable, greppable code — not a prose message. */
  code: string
  message: string
  /** The offending reference, when there is one. */
  path?: string
}

/* ------------------------------------------------------------------ *
 * The compiled plan
 * ------------------------------------------------------------------ */

/**
 * What the compiler proved while compiling.
 *
 * `modelVersion` is a content version over the model the IR compiled against —
 * so a caller can tell whether a stored IR is still fresh without re-deriving
 * anything. `stages` and `gaps` are the §51 pipeline's own record.
 */
export type CompiledProvenance = {
  modelVersion: string
  entityId: string
  /** Stages that ran and passed. */
  stages: IrStage[]
  /** Stages that reported a gap (valid IR, unimplemented or unsupported). */
  gaps: IrStage[]
}

/** The IR, fully resolved against the model — every reference is a canonical id. */
export type LogicalPlan = {
  entity: string
  grain?: string
  dimensions: string[]
  measures: IrMeasure[]
  relationships: string[]
  timeRange?: IrTimeRange
  timeBasis?: string
  currencyBasis?: string
}

export type CompiledQueryPlan = {
  ir: BusinessQueryIR
  logical: LogicalPlan
  /** The physical target — the same shape the query engine already runs. */
  physical: QueryOptions
  provenance: CompiledProvenance
}

/**
 * The compile result.
 *
 * `ok: false` **iff** at least one diagnostic has severity `error`. Gaps never
 * fail a compile; they ride along on a successful one.
 */
export type CompileResult =
  | { ok: true; plan: CompiledQueryPlan; diagnostics: IrDiagnostic[] }
  | { ok: false; diagnostics: IrDiagnostic[] }

/**
 * The operating context — **not** part of the IR.
 *
 * This is the only place scope enters a compiled query. It is passed by the
 * caller from the authenticated request, never from the IR.
 */
export type CompileContext = {
  tenantId?: string | null
  organizationId?: string | null
  userId?: string | null
}
