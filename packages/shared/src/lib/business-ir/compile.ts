/**
 * The compiler — §51's pipeline, with every stage a named step.
 *
 * The vision fixes the order and this module follows it, one function per stage:
 *
 *   BusinessQueryIR → schema resolution → type checking → entity/value
 *   resolution → relationship/path validation → metric expansion →
 *   time/currency normalisation → authorization injection → tenant filter
 *   injection → physical planner → SQL compilation → SQL safety validation
 *   → execution → structured result + provenance
 *
 * **What this compiler does and does not do.**
 *
 *   - It **resolves and validates** the IR against the canonical model, and
 *     compiles a `list` read into the **same `QueryOptions` the query engine
 *     already runs**. It emits no SQL: §52 demotes SQL to a compile target, and
 *     the platform already has an engine that produces it, correctly, with
 *     tenant scoping and joins. Writing SQL here would duplicate that engine and
 *     make the compiler untestable without a database.
 *   - Stages the platform cannot yet serve report a **`gap`**, not a silent
 *     pass: the IR is valid, the compile succeeds, and the gap names what is
 *     missing. That is what makes the compiler a measurement of the platform
 *     rather than a rubber stamp.
 *
 * **The one property that makes the IR real** (plan §2 phase 1): a reference the
 * model does not contain **fails the compile**. A renamed field therefore cannot
 * silently compile to the old — or a wrong — column. `recompile.ts` builds the
 * rename test on top of exactly this.
 *
 * Source: SPEC-business-model-kernel.md §6; Doc 3 §49–§53.
 */

import { SortDir } from '../query/types'
import type { Filter, FilterOp, QueryJoinEdge, QueryOptions, Sort } from '../query/types'
import { contentVersion } from '../kernel/model'
import type { KernelField, ModelDescriptor } from '../kernel/model'
import { createModelIndex } from './model-index'
import type { ModelMetric } from './model-index'
import type { PhysicalBindings } from './bindings'
import { IR_STAGES, collectParameterReferences } from './types'
import type {
  BusinessQueryIR,
  CompileContext,
  CompileResult,
  CompiledQueryPlan,
  CompiledProvenance,
  IrAggregateOp,
  IrDiagnostic,
  IrFilter,
  IrFilterOperator,
  IrMeasure,
  IrStage,
} from './types'

export type CompileOptions = {
  /** Declared metrics. None exist today — see `ModelMetric`. */
  metrics?: readonly ModelMetric[]
}

/** The IR's operator vocabulary, mapped onto the engine's single vocabulary. */
const OPERATOR_MAP: Record<string, FilterOp> = {
  eq: 'eq',
  '=': 'eq',
  ne: 'ne',
  '!=': 'ne',
  gt: 'gt',
  '>': 'gt',
  gte: 'gte',
  '>=': 'gte',
  lt: 'lt',
  '<': 'lt',
  lte: 'lte',
  '<=': 'lte',
  in: 'in',
  nin: 'nin',
  like: 'like',
  ilike: 'ilike',
  contains: 'ilike',
  exists: 'exists',
}

/** Kinds that can be compared with `>`, `>=`, `<`, `<=`. */
const ORDERED_KINDS = new Set(['integer', 'float', 'currency', 'date', 'datetime'])
/** Kinds that can be aggregated with `sum` / `avg`. */
const NUMERIC_KINDS = new Set(['integer', 'float', 'currency'])
/** Kinds that can be matched with `like` / `ilike`. */
const TEXT_KINDS = new Set(['text', 'multiline', 'phone'])
/** Kinds whose values are a declared enumeration — which the model does not yet carry. */
const ENUM_KINDS = new Set(['select', 'dictionary'])

export function compileQuery(
  ir: BusinessQueryIR,
  model: ModelDescriptor,
  ctx: CompileContext,
  bindings: PhysicalBindings,
  options: CompileOptions = {},
): CompileResult {
  const diagnostics: IrDiagnostic[] = []
  const ran = new Set<IrStage>()
  const index = createModelIndex(model, options.metrics ?? [])

  const push = (d: IrDiagnostic): void => {
    diagnostics.push(d)
    ran.add(d.stage)
  }
  const err = (stage: IrStage, code: string, message: string, path?: string): void =>
    push({ stage, severity: 'error', code, message, ...(path ? { path } : {}) })
  const gap = (stage: IrStage, code: string, message: string, path?: string): void =>
    push({ stage, severity: 'gap', code, message, ...(path ? { path } : {}) })

  /* ---- the IR's own shape ---------------------------------------- */

  if (!ir || typeof ir !== 'object') {
    err('resolve_schema', 'IR_REQUIRED', 'A query IR object is required.')
    return { ok: false, diagnostics }
  }
  if (ir.operation !== 'list' && ir.operation !== 'count' && ir.operation !== 'aggregate') {
    err(
      'resolve_schema',
      'IR_BAD_OPERATION',
      `Unknown operation ${JSON.stringify(ir.operation)} — expected list, count or aggregate.`,
      'operation',
    )
  }

  /* ---- a placeholder is not a value ------------------------------ */

  // §47's parameters are resolved *before* the compiler, by `bind.ts`. If one is
  // still here, binding was skipped — and compiling it would put a marker into a
  // filter and let the engine compare it as a literal. Refuse, so "an unbound
  // placeholder never reaches the database as a value" is true even when the
  // compiler is called directly, bypassing the runner.
  const stray = collectParameterReferences(ir)[0]
  if (stray) {
    err(
      'resolve_values',
      'PARAMETER_NOT_BOUND',
      `The IR still carries the placeholder "${stray.name}" at ${stray.path}. Parameters must be bound before compiling — a placeholder is not a value.`,
      stray.path,
    )
    return { ok: false, diagnostics }
  }

  /* ---- stage 1: schema resolution -------------------------------- */

  ran.add('resolve_schema')
  const entityId = index.resolveEntityId(ir.entity ?? '')
  if (!entityId) {
    err(
      'resolve_schema',
      'UNKNOWN_ENTITY',
      `Entity ${JSON.stringify(ir.entity)} is not declared in the model.`,
      'entity',
    )
    return { ok: false, diagnostics }
  }
  const entity = index.entity(entityId)
  if (!entity) {
    err('resolve_schema', 'UNKNOWN_ENTITY', `Entity ${entityId} could not be read from the model.`, 'entity')
    return { ok: false, diagnostics }
  }

  /* ---- stage 2: entity/value resolution (fields, dimensions) ----- */

  ran.add('resolve_values')
  const dimensionIds: string[] = []
  for (const dimension of ir.dimensions ?? []) {
    const id = index.resolveFieldId(dimension, entityId)
    if (!id) {
      err(
        'resolve_values',
        'UNKNOWN_FIELD',
        `Dimension ${JSON.stringify(dimension)} is not a declared field of ${entityId}.`,
        'dimensions',
      )
      continue
    }
    dimensionIds.push(id)
    const field = index.field(id, entityId)
    if (field && ENUM_KINDS.has(field.fieldKind)) {
      gap(
        'resolve_values',
        'NO_ENUM_VALUES',
        `Field ${id} is an enumeration, but the model carries no declared values for it — the value is passed through unvalidated.`,
        id,
      )
    }
  }

  /* ---- stage 3: type checking (filters) -------------------------- */

  ran.add('check_types')
  const filters: Filter[] = []
  for (const filter of ir.filters ?? []) {
    compileFilter(filter, entityId, index, err, gap, filters)
  }

  /* ---- stage 4: relationship / path validation ------------------- */

  ran.add('validate_paths')
  const relationshipIds: string[] = []
  const reached = new Set<string>([entityId])
  const joinEdges: QueryJoinEdge[] = []
  for (const ref of ir.relationships ?? []) {
    const relId = index.resolveRelationshipId(ref, entityId)
    if (!relId) {
      err(
        'validate_paths',
        'UNKNOWN_RELATIONSHIP',
        `Relationship ${JSON.stringify(ref)} is not declared in the model.`,
        'relationships',
      )
      continue
    }
    const relationship = index.relationship(relId, entityId)
    if (!relationship) continue

    // The path must be connected: this edge has to touch something already
    // reached, or it is a dangling hop the query cannot get to.
    const traversingForward = reached.has(relationship.fromEntityId)
    const traversingBackward = reached.has(relationship.toEntityId)
    if (!traversingForward && !traversingBackward) {
      err(
        'validate_paths',
        'RELATIONSHIP_NOT_CONNECTED',
        `Relationship ${relId} does not touch anything reached so far (${[...reached].join(', ')}).`,
        relId,
      )
      continue
    }

    const binding = bindings.relationships[relId]
    if (!binding) {
      gap(
        'validate_paths',
        'RELATIONSHIP_UNBOUND',
        `Relationship ${relId} has no physical binding, so no join can be built for it.`,
        relId,
      )
      continue
    }

    if (traversingBackward && !traversingForward && relationship.allowedTraversal?.toFrom !== true) {
      gap(
        'validate_paths',
        'REVERSE_TRAVERSAL_UNDECLARED',
        `Relationship ${relId} is declared ${relationship.fromEntityId} -> ${relationship.toEntityId}; reading it backwards is not declared as permitted, so the join is built in the declared direction only.`,
        relId,
      )
    }

    // Forward from the base: from-column on the base, to-column on the extension.
    // Backward: the two swap, and the alias becomes the base entity.
    const targetEntityId = traversingForward ? relationship.toEntityId : relationship.fromEntityId
    const targetBinding = bindings.entities[targetEntityId]
    joinEdges.push({
      alias: targetEntityId,
      ...(targetBinding ? { entityId: targetBinding.platformEntityId } : {}),
      from: { alias: entityId, field: traversingForward ? binding.fromField : binding.toField },
      to: { field: traversingForward ? binding.toField : binding.fromField },
      type: binding.type,
    })
    relationshipIds.push(relId)
    reached.add(relationship.fromEntityId)
    reached.add(relationship.toEntityId)
  }

  /* ---- stage 5: metric expansion --------------------------------- */

  ran.add('expand_measures')
  const measures: IrMeasure[] = []
  for (const measure of ir.measures ?? []) {
    if ('metric' in measure) {
      const metricId = index.resolveMetricId(measure.metric, entityId)
      if (!metricId) {
        err(
          'expand_measures',
          'METRIC_NOT_DECLARED',
          `Metric ${JSON.stringify(measure.metric)} is not declared in the model. The model declares no metrics at all yet, so a named measure cannot be expanded.`,
          'measures',
        )
        continue
      }
      measures.push({ metric: metricId })
      continue
    }
    const fieldId = index.resolveFieldId(measure.field, entityId)
    if (!fieldId) {
      err(
        'expand_measures',
        'UNKNOWN_FIELD',
        `Measure references ${JSON.stringify(measure.field)}, which is not a declared field of ${entityId}.`,
        'measures',
      )
      continue
    }
    const field = index.field(fieldId, entityId)
    if (field && !aggregateAllowed(measure.aggregate, field)) {
      err(
        'expand_measures',
        'AGGREGATE_NOT_ALLOWED',
        `${measure.aggregate} is not valid for field ${fieldId} (kind ${field.fieldKind}).`,
        'measures',
      )
      continue
    }
    measures.push({ aggregate: measure.aggregate, field: fieldId })
  }

  /* ---- stage 6: time / currency normalisation -------------------- */

  ran.add('normalise_time_currency')
  const timeFieldRef = ir.timeRange?.field ?? ir.timeBasis
  if (ir.timeRange) {
    if (!timeFieldRef) {
      err(
        'normalise_time_currency',
        'TIME_RANGE_NEEDS_FIELD',
        'A time range needs a field, or a time basis to anchor to.',
        'timeRange',
      )
    } else {
      const fieldId = index.resolveFieldId(timeFieldRef, entityId)
      if (!fieldId) {
        err(
          'normalise_time_currency',
          'UNKNOWN_FIELD',
          `Time range references ${JSON.stringify(timeFieldRef)}, which is not a declared field of ${entityId}.`,
          'timeRange.field',
        )
      } else {
        const field = index.field(fieldId, entityId)
        if (field && !ORDERED_KINDS.has(field.fieldKind)) {
          err(
            'normalise_time_currency',
            'TIME_FIELD_NOT_ORDERED',
            `Field ${fieldId} has kind ${field.fieldKind}; a time range needs an ordered field.`,
            'timeRange.field',
          )
        } else {
          if (ir.timeRange.from !== undefined) {
            filters.push({ field: fieldId, op: 'gte', value: ir.timeRange.from })
          }
          if (ir.timeRange.to !== undefined) {
            filters.push({ field: fieldId, op: 'lte', value: ir.timeRange.to })
          }
          if (ir.timeBasis && ir.timeBasis !== timeFieldRef) {
            gap(
              'normalise_time_currency',
              'TIME_BASIS_IGNORED',
              `The time basis ${JSON.stringify(ir.timeBasis)} was not used; the range field ${JSON.stringify(timeFieldRef)} took precedence.`,
              'timeBasis',
            )
          }
        }
      }
    }
  } else if (ir.timeBasis) {
    gap(
      'normalise_time_currency',
      'TIME_BASIS_NO_RANGE',
      `A time basis was given without a time range, so there is nothing to normalise.`,
      'timeBasis',
    )
  }
  if (ir.currencyBasis) {
    gap(
      'normalise_time_currency',
      'NO_CURRENCY_BASIS',
      `Currency basis ${JSON.stringify(ir.currencyBasis)} is recorded, but the model declares no currency basis, so amounts are compared as stated and never converted.`,
      'currencyBasis',
    )
  }

  /* ---- stage 7: authorization injection (G-04) ------------------- */

  ran.add('inject_authorization')
  gap(
    'inject_authorization',
    'AUTHORIZATION_NOT_IMPLEMENTED',
    'The data-axis authorization layer (G-04) does not exist yet; no authorized projection is injected. This compile is a plan, not a permission.',
  )

  /* ---- stage 8: tenant filter injection -------------------------- */

  ran.add('inject_scope')
  if (!ctx?.tenantId) {
    err(
      'inject_scope',
      'TENANT_SCOPE_MISSING',
      'The operating context has no tenant, so no tenant filter can be injected. Failing closed rather than compiling an unscoped read.',
    )
  }

  /* ---- stage 9: physical planner --------------------------------- */

  ran.add('plan_physical')
  if (ir.offset !== undefined) {
    gap(
      'plan_physical',
      'OFFSET_NOT_SUPPORTED',
      'The query engine paginates by page number, not by raw offset, so the offset is not applied.',
      'offset',
    )
  }
  if (ir.operation !== 'list') {
    // `T-04` — this used to be a **gap**, and a gap is excluded by construction from verify's error filter
    // (`verify.ts: errors = diagnostics.filter(d => d.severity === 'error')`), so the check recorded
    // **passed** with "The compiler resolved this against the model without error" — a sentence that is
    // literally true and materially false, because the very stage emitting it had said the plan had no
    // physical execution. The Function then saved, published, became runnable, and returned **rows** to
    // someone who asked for **a number**.
    //
    // The distinction that decides the severity: `OFFSET_NOT_SUPPORTED` above is a gap because the result
    // is *the applied-less-than-asked truth* — a list without an offset is still a real list. An aggregate
    // is not: "how many" answered with a page of rows is a **different question's answer**, and nothing
    // downstream tells the reader the number they inferred is a fabrication. So this one is an error.
    err(
      'plan_physical',
      'ROW_ORIENTED_TARGET',
      `Operation ${ir.operation} needs aggregation, and the query layer is row-oriented (QueryOptions has no groupBy and no aggregate), so the run would return rows rather than the requested ${ir.operation}.`,
      'operation',
    )
  }

  const physical: QueryOptions = {
    fields: dimensionIds.length > 0 ? [...dimensionIds] : undefined,
    filters: filters.length > 0 ? filters : undefined,
    sort: compileSort(ir, entityId, index, err, gap),
    page: typeof ir.limit === 'number' ? { pageSize: ir.limit } : undefined,
    joins: joinEdges.length > 0 ? joinEdges : undefined,
    ...(ctx?.tenantId ? { tenantId: ctx.tenantId } : {}),
    ...(ctx?.organizationId ? { organizationId: ctx.organizationId } : {}),
  }

  /* ---- stage 10: SQL safety validation --------------------------- */

  ran.add('validate_sql_safety')
  gap(
    'validate_sql_safety',
    'NO_SQL_EMITTED',
    'This compiler emits no SQL, so there is no SQL to validate; the query engine owns SQL construction and its safety (engine.ts).',
  )

  /* ---- the verdict ---------------------------------------------- */

  const hasError = diagnostics.some((d) => d.severity === 'error')
  if (hasError) {
    return { ok: false, diagnostics }
  }

  const provenance: CompiledProvenance = {
    modelVersion: modelVersionOf(model),
    entityId,
    stages: IR_STAGES.filter((stage) => ran.has(stage)),
    gaps: IR_STAGES.filter((stage) =>
      diagnostics.some((d) => d.stage === stage && d.severity === 'gap'),
    ),
  }

  const plan: CompiledQueryPlan = {
    ir,
    logical: {
      entity: entityId,
      ...(ir.grain ? { grain: ir.grain } : {}),
      dimensions: dimensionIds,
      measures,
      relationships: relationshipIds,
      ...(ir.timeRange ? { timeRange: ir.timeRange } : {}),
      ...(ir.timeBasis ? { timeBasis: ir.timeBasis } : {}),
      ...(ir.currencyBasis ? { currencyBasis: ir.currencyBasis } : {}),
    },
    physical,
    provenance,
  }

  return { ok: true, plan, diagnostics }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function compileFilter(
  filter: IrFilter,
  entityId: string,
  index: ReturnType<typeof createModelIndex>,
  err: (stage: IrStage, code: string, message: string, path?: string) => void,
  gap: (stage: IrStage, code: string, message: string, path?: string) => void,
  out: Filter[],
): void {
  if ('metric' in filter) {
    const metricId = index.resolveMetricId(filter.metric, entityId)
    if (!metricId) {
      err(
        'expand_measures',
        'METRIC_NOT_DECLARED',
        `Filter references metric ${JSON.stringify(filter.metric)}, which is not declared in the model. No metrics are declared at all yet.`,
        'filters',
      )
    }
    // A declared metric would expand into a field + aggregate here. None exist,
    // so there is nothing to compile and the error above is the honest outcome.
    return
  }

  const fieldId = index.resolveFieldId(filter.field, entityId)
  if (!fieldId) {
    err(
      'resolve_values',
      'UNKNOWN_FIELD',
      `Filter references ${JSON.stringify(filter.field)}, which is not a declared field of ${entityId}.`,
      'filters',
    )
    return
  }

  const op = OPERATOR_MAP[String(filter.operator)]
  if (!op) {
    err(
      'check_types',
      'UNKNOWN_OPERATOR',
      `Unknown filter operator ${JSON.stringify(filter.operator)}.`,
      'filters',
    )
    return
  }

  const field = index.field(fieldId, entityId)
  const value = normaliseFilterValue(filter.value, gap)

  if (field) {
    if ((op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') && !ORDERED_KINDS.has(field.fieldKind)) {
      err(
        'check_types',
        'OPERATOR_NOT_ALLOWED',
        `Operator ${String(filter.operator)} needs an ordered field; ${fieldId} has kind ${field.fieldKind}.`,
        fieldId,
      )
      return
    }
    if ((op === 'like' || op === 'ilike') && !TEXT_KINDS.has(field.fieldKind)) {
      err(
        'check_types',
        'OPERATOR_NOT_ALLOWED',
        `Operator ${String(filter.operator)} needs a text field; ${fieldId} has kind ${field.fieldKind}.`,
        fieldId,
      )
      return
    }
    if (op === 'in' || op === 'nin') {
      if (!Array.isArray(filter.value)) {
        err(
          'check_types',
          'VALUE_NOT_A_LIST',
          `Operator ${String(filter.operator)} needs a list value.`,
          fieldId,
        )
        return
      }
    }
    if (op === 'exists' && typeof filter.value !== 'boolean') {
      err(
        'check_types',
        'VALUE_NOT_A_BOOLEAN',
        'Operator exists needs a boolean value.',
        fieldId,
      )
      return
    }
    if (ENUM_KINDS.has(field.fieldKind)) {
      gap(
        'resolve_values',
        'NO_ENUM_VALUES',
        `Field ${fieldId} is an enumeration, but the model carries no declared values for it — the filter value is passed through unvalidated.`,
        fieldId,
      )
    }
  }

  out.push({ field: fieldId, op, value })
}

/**
 * A filter value may be money (`{ amount, currency }`, the vision's §50 shape).
 * The amount is what the physical filter compares; the currency cannot be
 * honoured without a currency basis, and saying so is the honest outcome.
 */
function normaliseFilterValue(
  value: unknown,
  gap: (stage: IrStage, code: string, message: string, path?: string) => void,
): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'amount' in (value as Record<string, unknown>) &&
    'currency' in (value as Record<string, unknown>)
  ) {
    const money = value as { amount: unknown; currency: unknown }
    gap(
      'normalise_time_currency',
      'MONEY_COMPARED_AS_STATED',
      `A money value (${String(money.amount)} ${String(money.currency)}) is compared by amount only; no conversion is applied because the model declares no currency basis.`,
    )
    return money.amount
  }
  return value
}

function aggregateAllowed(aggregate: IrAggregateOp, field: KernelField): boolean {
  switch (aggregate) {
    case 'sum':
    case 'avg':
      return NUMERIC_KINDS.has(field.fieldKind)
    case 'min':
    case 'max':
      return ORDERED_KINDS.has(field.fieldKind)
    case 'count':
      return true
    default:
      return false
  }
}

/**
 * The sort, compiled.
 *
 * **An unresolvable sort is an error, not something to skip.** It used to be
 * skipped — `if (!fieldId) continue` — and that quietly broke the compiler's
 * central property: *a reference the model does not contain fails the compile.* A
 * sort naming a field that does not exist (or a placeholder, or a typo) produced a
 * **successful compile with no sort at all**, so a caller would get rows in an
 * arbitrary order and no indication why. Silent degradation is the failure mode
 * this compiler exists to make impossible, so it fails closed here too.
 */
function compileSort(
  ir: BusinessQueryIR,
  entityId: string,
  index: ReturnType<typeof createModelIndex>,
  err: (stage: IrStage, code: string, message: string, path?: string) => void,
  gap: (stage: IrStage, code: string, message: string, path?: string) => void,
): Sort[] | undefined {
  if (!ir.sort || ir.sort.length === 0) return undefined
  const out: Sort[] = []

  for (const [position, entry] of ir.sort.entries()) {
    if (!entry.field && entry.metric) {
      // A metric sort. No metrics are declared, so this cannot be honoured — and
      // saying so is honest rather than dropping it.
      gap(
        'expand_measures',
        'METRIC_NOT_DECLARED',
        `Sort by metric ${JSON.stringify(entry.metric)} cannot be honoured: the model declares no metrics.`,
        `sort[${position}]`,
      )
      continue
    }
    if (!entry.field) {
      err(
        'resolve_values',
        'SORT_NEEDS_FIELD',
        `Sort entry ${position} names neither a field nor a metric.`,
        `sort[${position}]`,
      )
      continue
    }
    const fieldId = index.resolveFieldId(entry.field, entityId)
    if (!fieldId) {
      err(
        'resolve_values',
        'UNKNOWN_FIELD',
        `Sort references ${JSON.stringify(entry.field)}, which is not a declared field of ${entityId}.`,
        `sort[${position}]`,
      )
      continue
    }
    out.push({
      field: fieldId,
      dir: entry.direction === 'asc' ? SortDir.Asc : SortDir.Desc,
    })
  }

  return out.length > 0 ? out : undefined
}

/**
 * The model's content version — what a compiled plan was built against.
 *
 * **This must cover everything the compiler reads, or it answers the wrong
 * question.** An earlier version of this function hashed only ids and semantic
 * versions. That looked sufficient and was not: a field's **kind** is not part of
 * its id, so retyping `unread_count` from `integer` to `text` left the version
 * byte-identical. A stored Function would then report itself **fresh** against a
 * model on which its `>` filter is no longer legal. Measured, not theorised: both
 * models hashed to `f462abf0` while their `fieldKind`s differed.
 *
 * Reuses G-01's `contentVersion`, so "did the model change?" is answered by the
 * same function that answers it for a single object. Deterministic — no clock, no
 * randomness — so a plan is reproducible.
 *
 * So the hash covers every attribute the compiler consults — the field's kind and
 * its `required` / `multi` / `filterable` flags, the entity's grain, and a
 * relationship's endpoints, cardinality and optionality.
 *
 * **Presentation is excluded on purpose.** Labels and descriptions are not read by
 * the compiler, so a typo fixed in a label must not invalidate every saved
 * operation. Excluding them is what keeps a version bump *meaningful*.
 *
 * **Sorted, because a content version must not depend on declaration order.** Two
 * models that are the same model, declared in a different order, are the same
 * model — and G-01's `exportModel` sorts for exactly this reason.
 */
export function modelVersionOf(model: ModelDescriptor): string {
  return contentVersion({
    entities: Object.values(model.entities ?? {})
      .map((entity) => ({
        id: entity.id,
        version: entity.version,
        grain: entity.grain,
        fields: (entity.fields ?? [])
          .map((field) => ({
            id: field.id,
            version: field.version,
            fieldKind: field.fieldKind,
            required: field.required,
            multi: field.multi,
            filterable: field.filterable,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    relationships: Object.values(model.relationships ?? {})
      .map((relationship) => ({
        id: relationship.id,
        version: relationship.version,
        fromEntityId: relationship.fromEntityId,
        toEntityId: relationship.toEntityId,
        cardinality: relationship.cardinality,
        optionality: relationship.optionality,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  })
}

/** The operator vocabulary, exported so a caller can validate an IR's operators up front. */
export function isKnownOperator(operator: IrFilterOperator): boolean {
  return OPERATOR_MAP[String(operator)] !== undefined
}
