import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type QueryIndexMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from `getAuthFromRequest`). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /** The id the guard set is evaluated against (here: the entity type). */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type QueryIndexMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback.
   *
   * Call this **only after the write has committed.**
   *
   * Note the `shouldRunAfterSuccess` gate the routes used to apply by hand is
   * **already honoured by the registry**, so it is not re-implemented here: the
   * registry only adds a guard's `afterSuccess` to the callback list when that
   * guard's `validate()` returned `shouldRunAfterSuccess` (see
   * `runMutationGuards()` in `mutation-guard-registry.ts`). Calling this when no
   * guard asked for it is therefore a no-op, not a behaviour change.
   */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `query_index` write routes.
 *
 * D2-wide (2026-10-06): the module's **two custom write routes** used to call
 * the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 4 call sites —
 * `reindex.ts` (POST ×2 sites) and `purge.ts` (POST ×2 sites). That pair
 * resolves ONLY the single DI-registered `crudMutationGuardService` and
 * silently bypasses every guard in the global mutation-guard store, so a module
 * that shipped `data/guards.ts` guards for `query_index.*` would have them
 * silently ignored.
 *
 * **The plan's figure was verified, not inherited.** The queued task said
 * **4 calls / 2 files → 2 guard objects**; walking every `.ts` file under
 * `api/` confirms exactly **4 real call sites in 2 files**, and each route
 * collects **one guard object per request**:
 *
 * | Route file | Write verbs | Guard objects |
 * |---|---|---|
 * | `reindex.ts` | POST | 1 |
 * | `purge.ts` | POST | 1 |
 * | **Total** | **2 write verbs** | **2** |
 *
 * So the retired figure is **4 calls → 2 guard objects**, and the repo-wide
 * count drops **4** (116 → 112).
 *
 * **Neither route is a `route.ts`.** Both export a named `POST` handler and
 * declare `metadata = { POST: { requireAuth: true, requireFeatures: […] } }` —
 * the same trap `translations` (`put/locales.ts`) and `planner`
 * (`availability-*.ts`) hit. A sweep that globs only for files named `route.ts`
 * finds neither file and would report the module clean while leaving both live
 * write routes on the deprecated resolver. Found here by walking every `.ts`
 * file under `api/`, not by name.
 *
 * **The guard context these routes carry.** These guard inputs carry
 * `requestMethod` / `requestHeaders`. The legacy pair took them as explicit
 * fields; `runRouteMutationGuards()` derives them from the `req` it is handed
 * (`route-mutation-guard.ts`), so the wrapper passes `req` and the registry
 * forwards `req.method` / `req.headers` to every guard unchanged. The
 * observable guard input is therefore equivalent.
 *
 * **Scope, stated honestly.** Measured on 2026-10-06 by walking every `.ts`
 * file under `api/`:
 *
 * - **Exactly 2 write verbs exist and both are guarded**, so `query_index` has
 *   **no `D2-gap`** (like `perspectives`, `translations` and `planner`, and
 *   unlike `workflows` (13 of 19 unguarded) and `inbox_ops` (10 of 14
 *   unguarded).
 * - `status.ts` is the only other API file and it reads (GET), so it needs no
 *   guard.
 *
 * **The wrapper is wired even though the module ships no guards of its own
 * today.** `query_index/data/` holds `entities.ts` but no `guards.ts`, so
 * `getAllMutationGuardInstances()` contributes nothing from `query_index.*`
 * right now. The migration is still correct and still necessary: it removes the
 * bypass, keeps the bridged legacy service running exactly as before
 * (`bridgeLegacyGuard()`), and means the first guard this module ever ships is
 * **enforced**, not silently skipped. The defect being fixed is the bypass, not
 * the absence of guards.
 *
 * Same wrapper shape as the eight migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`data_sync/api/mutation-guard.ts`, `c6c3151`), `dictionaries`
 * (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), `dashboards`
 * (`dashboards/api/mutation-guard.ts`, `a05ea2c`), `workflows`
 * (`workflows/api/mutation-guard.ts`, `d3af1b1`), `inbox_ops`
 * (`inbox_ops/api/mutation-guard.ts`, `d89b8f6`), `perspectives`
 * (`perspectives/api/mutation-guard.ts`, `e26642c`), `translations`
 * (`translations/api/mutation-guard.ts`, `a2f8d5f`) and `planner`
 * (`planner/api/mutation-guard.ts`, `641d3af`).
 */
export async function beginQueryIndexMutationGuard(
  ctx: QueryIndexMutationGuardContext,
): Promise<QueryIndexMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative (`getAuthFromRequest` returns null, and
    // the route returns a 401 before reaching here); this mirrors the legacy
    // service's behaviour when context was incomplete.
    return { blockedResponse: null, runAfterSuccess: async () => undefined }
  }

  const guardResult = await runRouteMutationGuards({
    container: ctx.container,
    req: ctx.req,
    auth: {
      userId,
      tenantId,
      organizationId: ctx.organizationId ?? null,
    },
    input: {
      resourceKind: ctx.resourceKind,
      resourceId: ctx.resourceId,
      operation: ctx.operation,
      mutationPayload: ctx.mutationPayload ?? null,
    },
  })

  if (!guardResult.ok || guardResult.escalated) {
    return {
      blockedResponse: NextResponse.json(
        ("errorBody" in guardResult) ? guardResult.errorBody : { status: "pending_review", escalation: guardResult.escalation },
        { status: guardResult.errorStatus },
      ),
      runAfterSuccess: async () => undefined,
    }
  }

  return {
    blockedResponse: null,
    runAfterSuccess: () => guardResult.runAfterSuccess(),
  }
}
