/**
 * Zero-AI execution — §47, and the vision's decisive property.
 *
 * This is the sentence the whole feature rests on (plan §2 phase 3):
 *
 * > **Switch the model off and run a Function. If it still runs, it is
 * > deterministic software.**
 *
 * **Why "switch the model off" is not a condition checked here.** Look at the
 * signature: there is **no AI argument, no model client, no prompt, nowhere to
 * put one**. A Function executes through G-02's compiler and the platform's
 * existing query engine. So "no LLM call" is not a runtime branch that could go
 * the other way — it is a property of what this module *is*. That is the
 * strongest available form of the guarantee, and it is why `no-llm.test.ts`
 * checks it structurally as well as behaviourally.
 *
 * **The order is load-bearing.** Cheapest and most decisive refusal first:
 *
 *   1. **The lifecycle gate** — only `published` or `active` runs. A draft, a
 *      generated, even a *verified* Function does not: verification is a claim
 *      that was made, publication is the decision to act on it. This is where
 *      "an unverified Function cannot run" becomes true **by construction**,
 *      because the only route into `published` is out of `verified`, and
 *      `transition` refuses to mark a Function verified on a failing report.
 *   2. **The tenant gate** — a Function belongs to a tenant, and a request for a
 *      different tenant is refused. The context is what scopes the read, so this
 *      is the guard that keeps `tenantId` on the artifact from being decorative.
 *   3. **It must be a read** — this runner executes queries. A command Function
 *      has a different execution path, and pretending otherwise would be a
 *      silently wrong answer.
 *   4. **Bind the parameters** — turning placeholders into values. This happens
 *      *before* the freshness check and *before* the compile, so that both of
 *      those see a **concrete** IR. An unbound placeholder is an error here and
 *      never travels further.
 *   5. **The freshness check** — has the model moved since this was built? A
 *      Function that needs recompilation is refused, with G-02's reasons.
 *   6. **Compile** — G-02's ten §51 stages, which fail closed on any reference
 *      the model does not contain.
 *   7. **Find where it lives** — the canonical entity resolves to a platform
 *      entity through the bindings, and a missing binding is refused.
 *   8. **Execute** — one call, `engine.query(...)`, on the platform's existing
 *      read path. Nothing is written, and no new query capability is introduced.
 *
 * **The one place this module touches the world** is that eighth step. Everything
 * before it is pure. That is deliberate: it means the whole of a Function's
 * meaning can be inspected, tested and diffed without a database, and only the
 * final hop needs the platform.
 *
 * Source: Doc 3 Part VIII §47; plan §2 phase 3, §5.2; RQ-22, RQ-25.
 */

import { isRunnable } from './lifecycle'
import { bindParameters } from '../business-ir/bind'
import type { BindError } from '../business-ir/bind'
import { checkFreshness, describeDiagnostics, executionFingerprint } from './fingerprint'
import { compileQuery } from '../business-ir/compile'
import type { CompileOptions } from '../business-ir/compile'
import type { PhysicalBindings } from '../business-ir/bindings'
import type {
  CompiledProvenance,
  CompiledQueryPlan,
  CompileContext,
  IrDiagnostic,
} from '../business-ir/types'
import type { ModelDescriptor } from '../kernel/model'
import type { QueryEngine } from '../query/types'
import type { UserFunction } from './types'

/**
 * The narrowest possible view of the platform's query engine.
 *
 * A Function needs exactly one method. Asking for the whole `QueryEngine` would
 * let a caller pass an object with more powers than this module should have, and
 * would make a test double carry methods it never uses.
 */
export type QueryRunner = Pick<QueryEngine, 'query'>

export type RunFailureCode =
  | 'NOT_RUNNABLE'
  | 'WRONG_TENANT'
  | 'NOT_A_QUERY'
  | 'PARAMETERS_INVALID'
  | 'STALE'
  | 'COMPILE_FAILED'
  | 'NO_PHYSICAL_BINDING'
  | 'ENGINE_FAILED'

export type RunResult =
  | {
      ok: true
      rows: unknown[]
      total: number
      /** The compiled plan, so a caller can show or store exactly what ran. */
      plan: CompiledQueryPlan
      provenance: CompiledProvenance
      /** Gaps the compiler reported — valid IR, capability the platform lacks. */
      diagnostics: IrDiagnostic[]
      /** §43's fingerprint, over the definition and the plan that produced these rows. */
      executionFingerprint: string
      /** The platform entity the read actually went to. */
      entity: string
    }
  | { ok: false; code: RunFailureCode; reason: string; details?: unknown }

/**
 * Run a published Function. **No AI is involved, and none can be.**
 *
 * `ctx` carries the tenant and organization; it is the only source of scope, and
 * it never comes from the Function. The IR has nowhere to put a scope, so a
 * saved Function cannot widen its own reach no matter who authored it.
 */
export async function runFunction(
  fn: UserFunction,
  params: Record<string, unknown>,
  ctx: CompileContext,
  model: ModelDescriptor,
  bindings: PhysicalBindings,
  engine: QueryRunner,
  options: CompileOptions = {},
): Promise<RunResult> {
  /* ---- 1. the lifecycle gate ------------------------------------- */

  if (!isRunnable(fn.status)) {
    return {
      ok: false,
      code: 'NOT_RUNNABLE',
      reason: `This Function is "${fn.status}". Only a published or active Function runs: a Function that has not been published has not been decided on, and one that has been deprecated or archived has been withdrawn.`,
    }
  }

  /* ---- 2. it must belong to the tenant asking -------------------- */

  // The Function belongs to a tenant, and `tenantId` on the artifact must be
  // load-bearing rather than decorative — a field nothing reads is a claim, not a
  // control. A context for a *different* tenant must not be able to run it.
  //
  // When the context carries no tenant at all this falls through deliberately: the
  // compile then reports the missing scope, which is the more useful message.
  if (
    ctx.tenantId !== undefined &&
    ctx.tenantId !== null &&
    fn.tenantId !== ctx.tenantId
  ) {
    return {
      ok: false,
      code: 'WRONG_TENANT',
      reason: `This Function belongs to tenant "${fn.tenantId}", and the request is for tenant "${ctx.tenantId}".`,
    }
  }

  /* ---- 3. it must be a read -------------------------------------- */

  if (fn.operationType !== 'query' || !fn.businessIr) {
    return {
      ok: false,
      code: 'NOT_A_QUERY',
      reason: `This runner executes reads. The Function is a "${fn.operationType}" operation, so there is nothing here to compile into a query.`,
    }
  }

  /* ---- 4. bind the parameters ------------------------------------ */

  const bound = bindParameters(fn.businessIr, params, fn.parameterSchema ?? [])
  if (!bound.ok) {
    return {
      ok: false,
      code: 'PARAMETERS_INVALID',
      reason: summariseBindErrors(bound.errors),
      details: bound.errors,
    }
  }

  // A concrete IR: the IR now carries values, not placeholders. The compiler sees
  // this, so it never meets a marker.
  const concreteIr = bound.ir

  /* ---- 5. is this still valid against the model? ------------------ */

  // The stored Function is passed, not the bound one: freshness is a question
  // about the *definition* and the model, so it samples its own values rather than
  // borrowing this run's. The two answers cannot disagree, because the compile in
  // the next step is the real proof and it uses the actual values.
  const freshness = checkFreshness(fn, model, bindings, ctx, options)
  if (freshness.status === 'requires_recompilation') {
    return {
      ok: false,
      code: 'STALE',
      reason: freshness.reasons.join(' '),
      details: freshness.reasons,
    }
  }

  /* ---- 6. compile ------------------------------------------------- */

  const compiled = compileQuery(concreteIr, model, ctx, bindings, options)
  if (!compiled.ok) {
    return {
      ok: false,
      code: 'COMPILE_FAILED',
      reason: describeDiagnostics(compiled.diagnostics).join(' '),
      details: compiled.diagnostics,
    }
  }

  /* ---- 7. where does it live physically? -------------------------- */

  const binding = bindings.entities[compiled.plan.provenance.entityId]
  if (!binding?.platformEntityId) {
    return {
      ok: false,
      code: 'NO_PHYSICAL_BINDING',
      reason: `Entity "${compiled.plan.provenance.entityId}" resolves in the model but has no physical binding, so there is nothing to read from.`,
    }
  }

  /* ---- 8. execute, on the platform's existing read path ----------- */

  let result: Awaited<ReturnType<QueryRunner['query']>>
  try {
    result = await engine.query(binding.platformEntityId, compiled.plan.physical)
  } catch (error) {
    return {
      ok: false,
      code: 'ENGINE_FAILED',
      reason: `The query engine refused this read: ${messageOf(error)}`,
      details: error,
    }
  }

  const rows = (result?.items ?? []) as unknown[]

  return {
    ok: true,
    rows,
    total: typeof result?.total === 'number' ? result.total : rows.length,
    plan: compiled.plan,
    provenance: compiled.plan.provenance,
    diagnostics: compiled.diagnostics,
    executionFingerprint: executionFingerprint(fn, compiled.plan),
    entity: binding.platformEntityId,
  }
}

/** Every bind failure, as one sentence a person can act on. */
function summariseBindErrors(errors: readonly BindError[]): string {
  return errors.map((error) => error.message).join(' ')
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
