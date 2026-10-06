/**
 * The Business IR's **runtime schema** — the same shape as `types.ts`, as a zod
 * schema, so the shape of an incoming IR can be *checked* before it is compiled.
 *
 * **Why this file exists.** `types.ts` describes the IR to the TypeScript
 * compiler. It does not describe it to anything at runtime — and G-17's job is to
 * have a *model* emit an IR, which means the first thing that touches the IR is
 * data from outside the program. The compiler (`compile.ts`) checks an IR against
 * the **business model**; nothing checked it against the **type**. This schema is
 * that check, and it is what the AI SDK's `generateObject` needs to constrain a
 * model to produce an IR and nothing else.
 *
 * **The rule this file must keep: it mirrors `types.ts`, and the mirror is
 * proven, not asserted.** Every exported schema carries a compile-time assertion
 * that its inferred type is *exactly* the type in `types.ts` (`AssertEqual`).
 * If the two ever drift, `tsc` fails — a silent divergence is the one failure
 * mode this file cannot be allowed to have. The runtime half of the proof is
 * `__tests__/schema.conformance.test.ts`.
 *
 * **Strictness is deliberate.** The objects are `.strict()`: an unknown key is
 * *rejected*, not ignored. The platform's posture everywhere else is "neither
 * guess nor widen" (the canonical-id rule; `scope-injection.ts` deletes rather
 * than trusts), and an IR that silently carries a key the compiler never reads
 * is exactly the kind of widening this schema must refuse. A model that wants to
 * send an unknown field is told so, at the boundary.
 *
 * Source: SPEC-business-model-kernel.md §6; Doc 3 §49–§53. Mirrors
 * `packages/shared/src/lib/business-ir/types.ts`.
 */

import { z } from 'zod'
import type {
  BusinessCommandIR,
  BusinessQueryIR,
  IrAggregateOp,
  IrFieldFilter,
  IrFilter,
  IrFilterOperator,
  IrInlineMeasure,
  IrMeasure,
  IrMetricFilter,
  IrMoney,
  IrNamedMeasure,
  IrOperation,
  IrParameterReference,
  IrSort,
  IrTimeRange,
} from './types'

/* ------------------------------------------------------------------ *
 * The mirror's own proof — a type-level equality assertion
 * ------------------------------------------------------------------ */

/**
 * `AssertEqual<A, B>` makes a compile error unless `A` and `B` are the same type.
 *
 * The `<T>() => T extends A ? 1 : 2` trick defeats TypeScript's structural
 * widening in a conditional, so `{ a: string }` and `{ a: string; b?: number }`
 * are correctly seen as **different**.
 *
 * **The assertion is only a guard where it is *forced*.** A bare
 * `type _Check = AssertEqual<A, B>` is **lazily evaluated and never checked** —
 * TypeScript does not resolve an unused type alias, so a drift passes silently.
 * (Measured 2026-10-06: removing a field from the schema and re-running `tsc`
 * **passed** with the alias form.) The assertion must therefore appear in a
 * position the compiler is obliged to check — which is why every check below is
 * an entry in {@link IR_SCHEMA_TYPE_CHECKS}, an **exported const** whose values
 * are typed by the assertions. `tsc` checks a value's type against its
 * annotation, so a divergence fails the build. The falsification probe in
 * `__tests__/schema.conformance.test.ts` proves this bites.
 */
type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : never

/* ------------------------------------------------------------------ *
 * The query IR (§50)
 * ------------------------------------------------------------------ */

/** `IrOperation` — `list` returns rows; `count` and `aggregate` summarise. */
export const irOperationSchema = z.enum(['list', 'count', 'aggregate'])

/**
 * The operator vocabulary, exactly as `types.ts` declares it: the engine's names
 * (`eq`, `gt`, `like` …) **and** the symbols a person or a model writes
 * (`=`, `>`, `contains`). `FilterOp` is spelled out here rather than imported, so
 * the schema is self-contained — and the assertion below fails if `types.ts`
 * ever widens `IrFilterOperator` beyond this list.
 */
export const irFilterOperatorSchema = z.enum([
  // the engine's names (FilterOp)
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'like',
  'ilike',
  'exists',
  // the symbols a person or model writes
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'contains',
])

/** An amount with its currency — the vision's example filter value (§50). */
export const irMoneySchema = z
  .object({
    amount: z.number(),
    currency: z.string(),
  })
  .strict()

/**
 * §47's placeholder — "a value is supplied here when the Function runs".
 *
 * `$param` names the parameter. It is **strict**, so a marker can carry nothing
 * but its name — a marker with a stray field would be a widening.
 */
export const irParameterReferenceSchema = z
  .object({
    $param: z.string().min(1),
  })
  .strict()

/**
 * A filter value: any JSON value, or a placeholder.
 *
 * `unknown` in the type is `z.unknown()` here — the type deliberately does not
 * constrain a filter's value (a field filter may compare against a string, a
 * number, a list, a money object, or `null`), so the schema does not either. The
 * *compiler* is where a value is checked against the field it is compared to;
 * duplicating that here would be a second, weaker source of truth.
 */
const irFilterValueSchema = z.unknown()

/** A filter on a declared field. */
export const irFieldFilterSchema = z
  .object({
    field: z.string(),
    operator: irFilterOperatorSchema,
    value: irFilterValueSchema.optional(),
  })
  .strict()

/** A filter on a metric — kept distinct so the compiler can report the metric gap. */
export const irMetricFilterSchema = z
  .object({
    metric: z.string(),
    operator: irFilterOperatorSchema,
    value: irFilterValueSchema.optional(),
  })
  .strict()

/**
 * A filter is **either** a field filter **or** a metric filter.
 *
 * A union, not a merged object: `{ field, metric, operator }` would satisfy a
 * permissive merge and mean nothing, so the schema must not accept it. Zod's
 * union of two strict objects rejects an object carrying both keys.
 */
export const irFilterSchema = z.union([irFieldFilterSchema, irMetricFilterSchema])

export const irAggregateOpSchema = z.enum(['sum', 'count', 'avg', 'min', 'max'])

/** A measure written inline, over a declared field. */
export const irInlineMeasureSchema = z
  .object({
    aggregate: irAggregateOpSchema,
    field: z.string(),
  })
  .strict()

/** A measure that names a declared metric. */
export const irNamedMeasureSchema = z
  .object({
    metric: z.string(),
  })
  .strict()

export const irMeasureSchema = z.union([irInlineMeasureSchema, irNamedMeasureSchema])

/**
 * A sort key.
 *
 * Every field is optional **in the type** (`field?`, `metric?`, `direction?`), so
 * the schema keeps them optional — it mirrors the type rather than tightening it.
 * A sort that names neither a field nor a metric is a *model* error the compiler
 * reports, not a *shape* error this schema should invent a rule for.
 */
export const irSortSchema = z
  .object({
    field: z.string().optional(),
    metric: z.string().optional(),
    direction: z.enum(['asc', 'desc']).optional(),
  })
  .strict()

/**
 * A time window, optionally over a named time field.
 *
 * A bound may be a placeholder — *"since {start}"* — so the union is
 * `string | IrParameterReference`, exactly as the type says.
 */
export const irTimeRangeSchema = z
  .object({
    from: z.union([z.string(), irParameterReferenceSchema]).optional(),
    to: z.union([z.string(), irParameterReferenceSchema]).optional(),
    field: z.string().optional(),
  })
  .strict()

/**
 * The query IR, §50 verbatim.
 *
 * **There is no scope field, and the schema must not add one.** `tenantId` /
 * `organizationId` do not exist in the type; `.strict()` is what makes the same
 * true at runtime — a model that tries to widen its own reach is rejected at the
 * boundary, not trusted and stripped later.
 */
export const businessQueryIrSchema = z
  .object({
    operation: irOperationSchema,
    entity: z.string(),
    grain: z.string().optional(),
    dimensions: z.array(z.string()).optional(),
    measures: z.array(irMeasureSchema).optional(),
    filters: z.array(irFilterSchema).optional(),
    relationships: z.array(z.string()).optional(),
    timeRange: irTimeRangeSchema.optional(),
    timeBasis: z.string().optional(),
    currencyBasis: z.string().optional(),
    sort: z.array(irSortSchema).optional(),
    limit: z.union([z.number(), irParameterReferenceSchema]).optional(),
    offset: z.number().optional(),
  })
  .strict()

/* ------------------------------------------------------------------ *
 * The command IR (§53)
 * ------------------------------------------------------------------ */

/**
 * A write, as an explicit business operation rather than a table edit.
 *
 * `inputs` is `Record<string, unknown>` in the type — the command's arguments are
 * validated by the command's own contract, not by the IR's shape, so the schema
 * keeps it an object of unknown values.
 */
export const businessCommandIrSchema = z
  .object({
    command: z.string(),
    inputs: z.record(z.string(), z.unknown()),
    requested_by: z.string(),
    idempotency_key: z.string(),
  })
  .strict()

/* ------------------------------------------------------------------ *
 * The mirror's own proof, forced
 * ------------------------------------------------------------------ */

/**
 * The type-level equality of every schema above and its `types.ts` counterpart —
 * **as a value, so `tsc` is obliged to check it.**
 *
 * Why a const and not a set of type aliases: TypeScript resolves an unused type
 * alias **lazily**, so `type _Check = AssertEqual<A, B>` is never evaluated and a
 * drift passes silently. Measured 2026-10-06: with the alias form, deleting
 * `grain` from `businessQueryIrSchema` and re-running `tsc --noEmit` returned
 * **exit 0** — the guard did not bite. (The isolated probe in `/tmp/tsguard/`
 * confirmed the rule: the alias form passes; `const d: AssertEqual<A, B> = true`
 * fails with `error TS2322: Type 'true' is not assignable to type 'never'`.)
 *
 * Each value below is annotated by its assertion, so the compiler *must* resolve
 * it. If any schema and its type in `types.ts` stop being the same type, the
 * annotation becomes `never`, `true` is no longer assignable, and the build
 * fails — which is the whole point. The assertions are *not* dead code: the
 * export is what makes them load-bearing.
 */
export const IR_SCHEMA_TYPE_CHECKS: {
  operation: AssertEqual<z.infer<typeof irOperationSchema>, IrOperation>
  filterOperator: AssertEqual<z.infer<typeof irFilterOperatorSchema>, IrFilterOperator>
  money: AssertEqual<z.infer<typeof irMoneySchema>, IrMoney>
  parameterReference: AssertEqual<z.infer<typeof irParameterReferenceSchema>, IrParameterReference>
  fieldFilter: AssertEqual<z.infer<typeof irFieldFilterSchema>, IrFieldFilter>
  metricFilter: AssertEqual<z.infer<typeof irMetricFilterSchema>, IrMetricFilter>
  filter: AssertEqual<z.infer<typeof irFilterSchema>, IrFilter>
  aggregateOp: AssertEqual<z.infer<typeof irAggregateOpSchema>, IrAggregateOp>
  inlineMeasure: AssertEqual<z.infer<typeof irInlineMeasureSchema>, IrInlineMeasure>
  namedMeasure: AssertEqual<z.infer<typeof irNamedMeasureSchema>, IrNamedMeasure>
  measure: AssertEqual<z.infer<typeof irMeasureSchema>, IrMeasure>
  sort: AssertEqual<z.infer<typeof irSortSchema>, IrSort>
  timeRange: AssertEqual<z.infer<typeof irTimeRangeSchema>, IrTimeRange>
  queryIr: AssertEqual<z.infer<typeof businessQueryIrSchema>, BusinessQueryIR>
  commandIr: AssertEqual<z.infer<typeof businessCommandIrSchema>, BusinessCommandIR>
} = {
  operation: true,
  filterOperator: true,
  money: true,
  parameterReference: true,
  fieldFilter: true,
  metricFilter: true,
  filter: true,
  aggregateOp: true,
  inlineMeasure: true,
  namedMeasure: true,
  measure: true,
  sort: true,
  timeRange: true,
  queryIr: true,
  commandIr: true,
}

/* ------------------------------------------------------------------ *
 * The pair, for a caller that does not yet know which one it has
 * ------------------------------------------------------------------ */

/**
 * Either IR.
 *
 * A caller that has only an incoming object can try this first, then dispatch on
 * `operation` (present ⇒ query) vs `command` (present ⇒ command). The two strict
 * objects cannot both match, so the union is unambiguous.
 */
export const businessIrSchema = z.union([businessQueryIrSchema, businessCommandIrSchema])

/**
 * The schema name the AI SDK / platform uses to label this output shape.
 *
 * One exported constant so the agent that emits an IR and any log that records
 * "what shape did the model produce" cannot disagree on the name.
 */
export const BUSINESS_QUERY_IR_SCHEMA_NAME = 'BusinessQueryIR' as const
export const BUSINESS_COMMAND_IR_SCHEMA_NAME = 'BusinessCommandIR' as const
