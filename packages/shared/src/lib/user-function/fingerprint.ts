/**
 * The fingerprint, and the freshness question — §43.
 *
 * The vision requires a Function to carry a **fingerprint**, and the reason is
 * that a Function is *long-lived*. It is written once and run for months, while
 * the model underneath it keeps moving: fields get added, renamed, retyped. A
 * long-lived artifact whose dependencies move is either **detected** as stale or
 * it **silently drifts** — and a silent drift means a saved business operation
 * quietly starts meaning something else.
 *
 * So there are two questions here, and they are not the same question:
 *
 *   1. **"Did the Function itself change?"** — {@link functionFingerprint}. A
 *      content hash over the definition. Used to tell two revisions apart, and to
 *      prove that a change to a *presentation* field is not a change to the
 *      operation.
 *   2. **"Is the Function still valid against the model it was built for?"** —
 *      {@link checkFreshness}. Answered by comparing the recorded model version,
 *      and, when it has moved, by asking **G-02's compiler** whether the IR still
 *      resolves. Never by a string comparison written here.
 *
 * **No timestamps in a hash.** `createdAt` and `publishedAt` are excluded on
 * purpose: a hash that moved every time a Function was saved would answer
 * nothing. The hash covers what the Function *does*, not when it was touched.
 *
 * Source: Doc 3 Part VIII §43, §44; RQ-24; COOKBOOK Sprint G-03 step 3.5.
 */

import { contentVersion } from '../kernel/model'
import type { ModelDescriptor } from '../kernel/model'
import { modelVersionOf } from '../business-ir/compile'
import type { CompileOptions } from '../business-ir/compile'
import { bindParameters, sampleValuesFor } from '../business-ir/bind'
import { recompileQuery } from '../business-ir/recompile'
import type { PhysicalBindings } from '../business-ir/bindings'
import type {
  CompiledQueryPlan,
  CompileContext,
  IrDiagnostic,
} from '../business-ir/types'
import type { FreshnessResult, UserFunction } from './types'

/**
 * The definition of a Function, reduced to the fields that determine **what it
 * does**.
 *
 * Exported so a caller can see exactly what is and is not covered by the hash —
 * the honest form of "this is a content fingerprint".
 *
 * **Presentation is excluded, and that is a decision, not an oversight.** `name`,
 * `description`, the UI metadata and the presentation definition are left out, so
 * **renaming a Function does not invalidate its verification**. Verification is a
 * claim about behaviour; a rename does not change behaviour, and a fingerprint
 * that said otherwise would force a re-verification every time somebody fixed a
 * typo in a label.
 *
 * `requiredPermissions` is sorted before hashing because it is a *set*: two
 * Functions that require the same permissions in a different order are the same
 * Function. `parameterSchema` keeps its declared order, because a form presents
 * parameters in the order declared, so the order is part of the content.
 *
 * **`version` is excluded too**, and for a different reason: it is a fact about
 * the artifact's *history* (this is revision 7) rather than about what it does.
 * Two Functions with identical content and different revision numbers are the
 * same operation, and the fingerprint says so.
 */
export function functionContent(fn: UserFunction): Record<string, unknown> {
  return {
    operationType: fn.operationType,
    businessIr: fn.businessIr ?? null,
    businessCommandIr: fn.businessCommandIr ?? null,
    parameterSchema: fn.parameterSchema ?? [],
    references: fn.references ?? emptyReferences(),
    requiredPermissions: [...(fn.requiredPermissions ?? [])].sort(),
    businessModelVersion: fn.businessModelVersion,
    dependencyVersions: fn.dependencyVersions ?? {},
    compilerVersion: fn.compilerVersion,
  }
}

/** The Function's content hash. Same content, same string — across runs and machines. */
export function functionFingerprint(fn: UserFunction): string {
  return contentVersion(functionContent(fn))
}

/**
 * The compiled plan's hash.
 *
 * Separate from the Function's, because the plan is **derived**: it changes when
 * the model moves even though the Function did not. Keeping the two apart is what
 * lets a reader tell "the user edited this" from "the model underneath it moved".
 */
export function planFingerprint(plan: CompiledQueryPlan): string {
  return contentVersion({
    entityId: plan.provenance.entityId,
    modelVersion: plan.provenance.modelVersion,
    logical: plan.logical,
    physical: plan.physical,
  })
}

/**
 * §43's **execution fingerprint** — the pair, so a recorded result can be tied to
 * both the definition and the plan that produced it.
 *
 * A result is reproducible only if you know what produced it. This is that
 * "what", in one string.
 */
export function executionFingerprint(fn: UserFunction, plan: CompiledQueryPlan): string {
  return contentVersion({
    function: functionFingerprint(fn),
    plan: planFingerprint(plan),
  })
}

/**
 * Whether a Function is still valid against the model it will run on.
 *
 * Three outcomes, and each is a value rather than a log line:
 *
 *   - **`fresh`** — the recorded model version is the current one. Nothing to do.
 *   - **`recompiled`** — the model moved, but the IR still resolves against it.
 *     The compiled plan is refreshed and the Function keeps working. This is the
 *     common case: adding an unrelated field to the model must not disable every
 *     saved operation.
 *   - **`requires_recompilation`** — the model moved and the IR **no longer
 *     resolves**. Refused, with reasons.
 *
 * **The answer comes from G-02, not from here.** The decision is produced by
 * `recompileQuery`, which itself asks the model's own `planFieldRename` what
 * moved. Writing a second rename detector here is how two answers to one question
 * start disagreeing.
 *
 * **`previousModel` is optional, and here is exactly what its absence costs.** A
 * Function records the model's **version hash**, not the old model, so in the
 * general case the previous model is simply not available and the refusal can
 * only name the reference that no longer resolves. When a caller *does* hold the
 * previous model (a migration run, a test), passing it upgrades the refusal from
 * "this reference is gone" to "this reference is gone, and it looks like it moved
 * to X". Both are honest; the second is more useful.
 */
export function checkFreshness(
  fn: UserFunction,
  model: ModelDescriptor,
  bindings: PhysicalBindings,
  ctx: CompileContext,
  options: CompileOptions & { previousModel?: ModelDescriptor } = {},
): FreshnessResult {
  const currentVersion = modelVersionOf(model)

  if (fn.businessModelVersion === currentVersion) {
    return { status: 'fresh', reasons: [] }
  }

  // A command Function has no query compiler behind it, so a moved model cannot
  // be re-proved here. Fail closed: say the model moved and that this cannot be
  // re-validated, rather than assuming a write is still safe.
  if (fn.operationType === 'command' || !fn.businessIr) {
    return {
      status: 'requires_recompilation',
      reasons: [
        `The Function was built against model version ${fn.businessModelVersion}, but the model is now ${currentVersion}. A command Function is not validated by the query compiler, so this cannot be re-proved here — it must be re-verified.`,
      ],
    }
  }

  const before = options.previousModel ?? model

  // The stored IR carries placeholders, and the compiler refuses a placeholder
  // because a placeholder is not a value. Freshness is a question about
  // *references*, not values, so each parameter is bound to a sample of its
  // declared kind — the same rule the runner and the verifier use. A Function
  // whose parameters cannot even be sampled could not be run either, so refusing
  // it here is the honest outcome rather than a false "still fresh".
  const schema = fn.parameterSchema ?? []
  const bound = bindParameters(fn.businessIr, sampleValuesFor(fn.businessIr, schema), schema)
  if (!bound.ok) {
    return {
      status: 'requires_recompilation',
      reasons: [
        `The Function's parameters cannot be bound to values its IR can use, so its freshness cannot be proved: ${bound.errors.map((error) => error.message).join(' ')}`,
      ],
    }
  }

  const result = recompileQuery(bound.ir, before, model, ctx, bindings, options)

  if (result.status === 'clean') {
    return {
      status: 'recompiled',
      reasons: [
        `The model moved from ${fn.businessModelVersion} to ${currentVersion}, and the Function's IR still resolves — the compiled plan is refreshed.`,
      ],
    }
  }

  if (result.status === 'requires_recompilation') {
    return { status: 'requires_recompilation', reasons: result.reasons }
  }

  return {
    status: 'requires_recompilation',
    reasons: describeDiagnostics(result.diagnostics),
  }
}

/**
 * The compiler's own error messages, as plain sentences.
 *
 * Falls back to a sentence rather than an empty list: a refusal with no reason
 * would be a refusal a person cannot act on.
 */
export function describeDiagnostics(diagnostics: readonly IrDiagnostic[]): string[] {
  const errors = diagnostics.filter((d) => d.severity === 'error')
  if (errors.length === 0) {
    return ['The Function no longer compiles against the current model, and the compiler gave no reason.']
  }
  return errors.map((d) => d.message)
}

function emptyReferences(): UserFunction['references'] {
  return { entities: [], fields: [], metrics: [], commands: [], workflows: [] }
}
