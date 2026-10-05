/**
 * The rename test, implemented — the plan's own proof that the IR is real.
 *
 * Plan §2 phase 1 states the test exactly:
 *
 *   *"rename a field; the IR either recompiles cleanly or says 'requires
 *   recompilation'. **If it silently produces wrong SQL, the IR is not real.**"*
 *
 * There are two ways to fail that test, and this module closes both:
 *
 *   1. **The silent compile.** Compiling the old IR against the new model and
 *      getting a plan back would be the failure. That cannot happen, because
 *      `compileQuery` resolves every reference against the model and fails
 *      closed on any it cannot resolve — a moved field is simply not there.
 *      That is the *floor*.
 *   2. **The unhelpful refusal.** "Field not found" is correct and useless. So
 *      this entry point consults G-01's `planFieldRename` and says what actually
 *      happened: **requires recompilation**, naming the field that moved and
 *      where it went. That is the *ceiling*.
 *
 * The rename decision is therefore **produced by the model's own rename engine**,
 * never by a string comparison done here. One rule, one implementation.
 *
 * Source: plan §2 phase 1; batch 9 §6 #1; SPEC-business-model-kernel.md §12.1.
 */

import { planFieldRename } from '../kernel/rename'
import type { ModelDescriptor } from '../kernel/model'
import { compileQuery } from './compile'
import type { CompileOptions } from './compile'
import { createModelIndex } from './model-index'
import type { PhysicalBindings } from './bindings'
import type { BusinessQueryIR, CompileContext, CompiledQueryPlan, IrDiagnostic } from './types'

/** A field the IR references, and where in the IR it appears. */
export type IrFieldReference = { path: string; id: string }

export type RecompileResult =
  | {
      status: 'clean'
      plan: CompiledQueryPlan
      diagnostics: IrDiagnostic[]
      fieldReferences: IrFieldReference[]
    }
  | {
      status: 'requires_recompilation'
      /** Plain-language reasons, taken from the model's rename plan. */
      reasons: string[]
      /** The IR's own references that no longer resolve. */
      staleReferences: Array<{ id: string; renamedTo?: string }>
      fieldReferences: IrFieldReference[]
    }
  | { status: 'invalid'; diagnostics: IrDiagnostic[] }

/**
 * Compile an IR that was written against `before` against `after` instead.
 *
 * Three outcomes, and each is a value:
 *   - `requires_recompilation` — a field the IR references moved. The IR must be
 *     rewritten; the old id is gone.
 *   - `clean` — nothing the IR references moved, and it compiles.
 *   - `invalid` — the IR does not compile against `after` for some other reason.
 */
export function recompileQuery(
  ir: BusinessQueryIR,
  before: ModelDescriptor,
  after: ModelDescriptor,
  ctx: CompileContext,
  bindings: PhysicalBindings,
  options: CompileOptions = {},
): RecompileResult {
  const renamePlan = planFieldRename(before, after)
  const fieldReferences = collectFieldReferences(ir, before, options)

  const removed = new Set(renamePlan.removedFieldIds)
  const stale = fieldReferences.filter((reference) => removed.has(reference.id))

  if (stale.length > 0) {
    const renamedTo = new Map(renamePlan.likelyRenames.map((pair) => [pair.from, pair.to]))
    return {
      status: 'requires_recompilation',
      reasons: renamePlan.reasons,
      staleReferences: stale.map((reference) => ({
        id: reference.id,
        ...(renamedTo.has(reference.id) ? { renamedTo: renamedTo.get(reference.id)! } : {}),
      })),
      fieldReferences,
    }
  }

  const result = compileQuery(ir, after, ctx, bindings, options)
  if (result.ok) {
    return {
      status: 'clean',
      plan: result.plan,
      diagnostics: result.diagnostics,
      fieldReferences,
    }
  }
  return { status: 'invalid', diagnostics: result.diagnostics }
}

/**
 * Every field the IR references, resolved against the model it was written for.
 *
 * Resolution uses the same index the compiler uses, so "what the IR references"
 * cannot be computed one way here and another way there.
 */
export function collectFieldReferences(
  ir: BusinessQueryIR,
  model: ModelDescriptor,
  options: CompileOptions = {},
): IrFieldReference[] {
  const index = createModelIndex(model, options.metrics ?? [])
  const entityId = index.resolveEntityId(ir.entity ?? '')
  if (!entityId) return []

  const out: IrFieldReference[] = []
  const add = (path: string, ref: string): void => {
    const id = index.resolveFieldId(ref, entityId)
    if (id) out.push({ path, id })
  }

  for (const dimension of ir.dimensions ?? []) add('dimensions', dimension)
  for (const filter of ir.filters ?? []) {
    if ('field' in filter) add('filters', filter.field)
  }
  for (const sort of ir.sort ?? []) {
    if (sort.field) add('sort', sort.field)
  }
  for (const measure of ir.measures ?? []) {
    if ('field' in measure) add('measures', measure.field)
  }
  const timeRef = ir.timeRange?.field ?? ir.timeBasis
  if (timeRef) add('timeRange', timeRef)

  return out
}
