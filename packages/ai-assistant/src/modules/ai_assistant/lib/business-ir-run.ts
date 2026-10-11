/**
 * **The switch on the panel.** (`CC-59` / the first item of the supplementary
 * core queue.)
 *
 * Every layer of the Business-IR pipeline already worked, and none of them was
 * reached from the running product:
 *
 *   - {@link authorBusinessQueryIr} turns a prompt into a typed IR — built, bound
 *     to the agent binding (`CC-57`), and with **no production caller**;
 *   - `compileQuery` validates that IR against the canonical model, deterministically;
 *   - the platform's own `QueryEngine.query` runs the compiled physical plan.
 *
 * This module is the **single wire** that connects them: one entry point that
 * takes a plain-language prompt and returns an executed, scoped, bounded result.
 * It is deliberately the *authoring* wire rather than a "load a saved Function"
 * wire, because a `UserFunction` has no persistence yet (`CC-32`, gated on
 * `G-09`) — the shape that can run today is **prompt → IR → compiled → executed**.
 *
 * **What it does NOT do.** It compiles no SQL, re-implements no compiler, and
 * adds no second way to run a query. It reuses {@link authorBusinessQueryIr}, the
 * existing `compileQuery`, and the same one execute hop `runFunction` already
 * uses (`engine.query(binding.platformEntityId, compiled.plan.physical)`). A
 * second chain would be the failure this module exists to avoid.
 *
 * **Where scope comes from — the whole point.** Tenant and organization enter the
 * compiled query from the **authenticated session**, through `CompileContext`,
 * and from nowhere else. The IR has no scope field by construction (`.strict()`
 * schema), so a prompt cannot widen the read and the model's output cannot either.
 * The compiler already fails closed when the session carries no tenant
 * (`TENANT_SCOPE_MISSING`); this module supplies that tenant from the session.
 *
 * **What it adds beyond "call the three".** The NL→query literature (Snowflake
 * Cortex Analyst, Cube, dbt MetricFlow; OWASP LLM01/LLM06) names two guardrails
 * as mandatory and one as best practice, all adopted here:
 *
 *   - a **default row limit** and a **maximum time range**, applied when the IR
 *     states neither — so a vague prompt cannot ask for an unbounded scan
 *     ({@link applyDefaultBounds});
 *   - the **resolved IR plus the compiled plan and provenance** ride out on the
 *     result, so a person and an auditor can see exactly what was asked and what
 *     ran, not just the rows ({@link BusinessQueryOutcome}).
 *
 * Source: Doc 3 §49–§53; `library/development/PLAN-CC-59-business-ir-caller.md`;
 * `library/development/COMPLETION-CALLBACKS.md` row `CC-59`.
 */

import type { EntityManager } from '@mikro-orm/postgresql'
import { businessQueryIrSchema } from '@open-mercato/shared/lib/business-ir/schema'
import type { BusinessQueryIR, CompileContext } from '@open-mercato/shared/lib/business-ir/types'
import type { PhysicalBindings } from '@open-mercato/shared/lib/business-ir/bindings'
import type { ModelDescriptor } from '@open-mercato/shared/lib/kernel/model'
import type { QueryOptions } from '@open-mercato/shared/lib/query/types'
import type { AuthContext } from '@open-mercato/shared/lib/auth/server'
import { compileQuery } from '@open-mercato/shared/lib/business-ir/compile'
import type { CompileOptions } from '@open-mercato/shared/lib/business-ir/compile'
import type {
  CompiledProvenance,
  CompiledQueryPlan,
  IrDiagnostic,
} from '@open-mercato/shared/lib/business-ir/types'
import {
  authorBusinessQueryIr,
  type AuthorBusinessQueryIrResult,
} from './business-ir-author'
import type { AiChatRequestContext } from './attachment-bridge-types'
import type { QueryRunner } from '@open-mercato/shared/lib/user-function/run'

/**
 * The default page size applied when the IR states no limit (`B5e`).
 *
 * The number is a guardrail, not a product decision: it bounds a read whose IR
 * did not. 100 is the same ceiling `search.hybrid_search` uses, so the two
 * "the model asked for a list" surfaces agree.
 */
export const DEFAULT_ROW_LIMIT = 100

/**
 * The maximum time window (in days) applied when the IR states a time field but
 * no bounded range (`B5e`). A year is wide enough to be useful and narrow enough
 * to refuse an accidental full-history scan.
 */
export const MAX_TIME_RANGE_DAYS = 365

/** Every way this entry point can refuse — all values, none thrown (`B5c`). */
export type BusinessQueryFailureCode =
  | 'agent_not_bound'
  | 'schema_rejected'
  | 'compile_failed'
  | 'no_binding'
  | 'engine_failed'

/**
 * The outcome.
 *
 * A union rather than a throw, mirroring `runFunction`'s `RunResult` and
 * `authorBusinessQueryIr`'s result union, so a caller has to handle each refusal
 * instead of a `try/catch` it may forget.
 *
 * On success the result carries the **rows**, the **resolved IR**, the compiled
 * **plan**, its **provenance**, and the compiler's surviving **diagnostics**
 * (gaps ride along; errors do not, they fail the call) — the lineage a person and
 * an auditor need (`B5f`), not a bare IR.
 */
export type BusinessQueryOutcome =
  | {
      ok: true
      rows: unknown[]
      total: number
      /** The IR the model authored, after schema validation — what was actually asked. */
      ir: BusinessQueryIR
      /** The compiled physical plan — what actually ran. */
      plan: CompiledQueryPlan
      provenance: CompiledProvenance
      /** The compiler's gaps: valid IR, capability the platform lacks. Never empty of meaning. */
      diagnostics: IrDiagnostic[]
      /** The platform entity the read actually went to. */
      entity: string
      /** Limits this module applied because the IR stated none (`B5e`), for auditability. */
      appliedBounds: AppliedBounds
    }
  | { ok: false; code: BusinessQueryFailureCode; reason: string; details?: unknown }

/** Which defensive bounds this call added, so the caller can see what it did not ask for. */
export type AppliedBounds = {
  /** True when a default page size was applied because the IR had no limit. */
  defaultLimit: boolean
  /** True when the max time range was applied because the IR had no bounded range. */
  timeRangeCapped: boolean
}

/**
 * Everything the entry point needs from the running request.
 *
 * This is the union of the two contexts the layers already use: the **resolved
 * run scope** (`authContext`, an {@link AiChatRequestContext}) and the
 * **authenticated server context** (`auth`, an `AuthContext`, the source of the
 * binding decision). They are distinct on purpose (`CC-57`); the AI-tool caller
 * assembles both from its `McpToolContext`.
 */
export interface RunBusinessQueryPromptInput {
  /** The request in plain language: "invoices over 10,000 EUR, by customer". */
  prompt: string
  /** The resolved scope the run executes under. Scope comes from here, never the IR. */
  authContext: AiChatRequestContext
  /** The authenticated server context — what the binding is looked up by. */
  auth: AuthContext
  /** The entity manager the binding lookup runs on. */
  em: EntityManager
  /** The canonical model to compile against. */
  model: ModelDescriptor
  /** The physical bindings that resolve canonical ids to platform entities. */
  bindings: PhysicalBindings
  /** The platform's read engine — the same one `runFunction` executes through. */
  engine: QueryRunner
  /** Optional per-call model override, passed straight to the authoring wire. */
  modelOverride?: string
  /** Optional container for agent/tool resolution in a live request. */
  container?: unknown
  /** Optional compiler options (declared metrics). */
  compileOptions?: CompileOptions
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/** The operating context, built **from the session only** (`B5b`). */
function scopeFromSession(authContext: AiChatRequestContext): CompileContext {
  return {
    tenantId: authContext.tenantId,
    organizationId: authContext.organizationId,
    userId: authContext.userId,
  }
}

/**
 * Apply the defensive bounds the literature names as mandatory (`B5e`).
 *
 * Two independent guardrails, each only when the IR stated nothing:
 *
 *   - **default row limit** — a `list` with no `limit` gets {@link DEFAULT_ROW_LIMIT}
 *     rows, so a vague prompt cannot stream an unbounded table;
 *   - **maximum time range** — a `list` anchored to a time field (`timeBasis` or a
 *     `timeRange.field`) with no `from` gets a `from` of {@link MAX_TIME_RANGE_DAYS}
 *     days back, so "all our invoices" cannot become "all history ever".
 *
 * A stated limit is never overridden — the bounds only fill a gap. Returning the
 * plan it produced (not mutating in place) keeps the pure/impure boundary obvious.
 */
export function applyDefaultBounds(
  plan: CompiledQueryPlan,
  now: Date = new Date(),
): { plan: CompiledQueryPlan; applied: AppliedBounds } {
  const physical: QueryOptions = { ...plan.physical }
  let defaultLimit = false
  let timeRangeCapped = false

  // (1) a default page size when the IR stated no limit.
  if (!physical.page || typeof physical.page.pageSize !== 'number') {
    physical.page = { ...(physical.page ?? {}), pageSize: DEFAULT_ROW_LIMIT }
    defaultLimit = true
  }

  // (2) a max time range when the IR is time-anchored but unbounded.
  const timeField = plan.logical.timeRange?.field ?? plan.logical.timeBasis
  const hasLowerBound = Boolean(plan.logical.timeRange?.from)
  if (timeField && !hasLowerBound) {
    const from = new Date(now.getTime() - MAX_TIME_RANGE_DAYS * 24 * 60 * 60 * 1000)
    const fromIso = from.toISOString()
    const existing = Array.isArray(physical.filters) ? physical.filters : []
    physical.filters = [
      ...existing,
      { field: timeField, op: 'gte', value: fromIso },
    ]
    timeRangeCapped = true
  }

  return { plan: { ...plan, physical }, applied: { defaultLimit, timeRangeCapped } }
}

/**
 * Turn a plain-language prompt into an executed, scoped, bounded result.
 *
 * The sequence, and why each step is where it is:
 *
 *   1. **Author the IR** — {@link authorBusinessQueryIr}. It consults the agent
 *      binding before the model is asked (`CC-57`), so an unbound `ai_worker` is
 *      refused here with no model call and no database read beyond the binding.
 *   2. **Refuse, as a value, on `!ok`** — the authoring refusal's reason becomes
 *      this call's `code`, so the two layers do not invent two names for one thing.
 *   3. **Compile** — against the model and bindings the caller supplies, scoped by
 *      the session. The compiler fails closed on a missing tenant.
 *   4. **Refuse, as a value, on compile errors** — `severity: 'error'` fails the
 *      call; `severity: 'gap'` rides along.
 *   5. **Apply the bounds** (`B5e`).
 *   6. **Resolve the physical binding** — a canonical entity with no physical
 *      target is a refusal, not an empty read.
 *   7. **Execute** — one `engine.query`, on the platform's existing read path.
 *
 * Nothing here writes, and no new query capability is introduced.
 */
export async function runBusinessQueryPrompt(
  input: RunBusinessQueryPromptInput,
): Promise<BusinessQueryOutcome> {
  /* ---- 1 & 2. author the IR, or refuse as a value ----------------- */

  let authored: AuthorBusinessQueryIrResult
  try {
    authored = await authorBusinessQueryIr({
      prompt: input.prompt,
      authContext: input.authContext,
      auth: input.auth,
      em: input.em,
      ...(input.modelOverride !== undefined ? { modelOverride: input.modelOverride } : {}),
      ...(input.container !== undefined ? { container: input.container } : {}),
    })
  } catch (error) {
    // `authorBusinessQueryIr` is itself a value-returning union, but a caller
    // must not assume that stays true — a throw is turned into a value here.
    return { ok: false, code: 'engine_failed', reason: `Authoring failed: ${messageOf(error)}`, details: error }
  }
  if (!authored.ok) {
    const code: BusinessQueryFailureCode =
      authored.reason === 'agent_not_bound'
        ? 'agent_not_bound'
        : authored.reason === 'schema_rejected'
          ? 'schema_rejected'
          : 'engine_failed'
    const reason =
      authored.reason === 'agent_not_bound'
        ? 'The acting principal is not bound to the business_ir.query_author agent, so it may not author a query.'
        : authored.reason === 'schema_rejected'
          ? 'The model produced an object that is not a valid BusinessQueryIR, so nothing was compiled or run.'
          : `The authoring agent failed: ${messageOf((authored as { error: unknown }).error)}`
    return {
      ok: false,
      code,
      reason,
      details: authored,
    }
  }

  const ir = authored.ir

  /* ---- 3. compile, scoped by the session -------------------------- */

  const ctx = scopeFromSession(input.authContext)
  const compiled = compileQuery(ir, input.model, ctx, input.bindings, input.compileOptions ?? {})

  /* ---- 4. refuse, as a value, on compile errors ------------------- */

  if (!compiled.ok) {
    return {
      ok: false,
      code: 'compile_failed',
      reason: compiled.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => d.message)
        .join(' '),
      details: compiled.diagnostics,
    }
  }

  /* ---- 5. apply the defensive bounds ----------------------------- */

  const { plan, applied } = applyDefaultBounds(compiled.plan)

  /* ---- 6. where does it live physically? ------------------------- */

  const binding = input.bindings.entities[plan.provenance.entityId]
  if (!binding?.platformEntityId) {
    return {
      ok: false,
      code: 'no_binding',
      reason: `Entity "${plan.provenance.entityId}" resolves in the model but has no physical binding, so there is nothing to read from.`,
    }
  }

  /* ---- 7. execute, on the platform's existing read path ---------- */

  let result: Awaited<ReturnType<QueryRunner['query']>>
  try {
    result = await input.engine.query(binding.platformEntityId, plan.physical)
  } catch (error) {
    return {
      ok: false,
      code: 'engine_failed',
      reason: `The query engine refused this read: ${messageOf(error)}`,
      details: error,
    }
  }

  const rows = (result?.items ?? []) as unknown[]

  return {
    ok: true,
    rows,
    total: typeof result?.total === 'number' ? result.total : rows.length,
    ir,
    plan,
    provenance: plan.provenance,
    diagnostics: compiled.diagnostics,
    entity: binding.platformEntityId,
    appliedBounds: applied,
  }
}

/**
 * A convenience predicate used by tests and callers: is this IR shaped like a
 * query the platform can run *today* (a `list`)? Re-exported from the shared
 * schema's validator so there is one definition of "valid IR".
 */
export { businessQueryIrSchema }
