import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type WorkflowsMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved workflows route context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (see `auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /**
   * The id the guard set is evaluated against. For a DB row write this is the
   * definition's own id; for a `code:<workflowId>` customize it is the synthetic
   * `code:<workflowId>` id (the id the client addressed).
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type WorkflowsMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback.
   *
   * Pass `resourceIdOverride` when the final resource id is only known *after*
   * the write. The guard was validated against the id available at check time,
   * but a guard's `afterSuccess` receives `resourceId`, so it is re-bound here
   * to the id the caller supplies. Re-running the guard set is safe **by
   * contract**: `MutationGuard.validate` is a pure predicate that reads the
   * payload and returns a decision — it performs no side effects. Only
   * `afterSuccess` acts, and stale callbacks are never double-run because a
   * fresh set is collected.
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for every `workflows` write.
 *
 * D2-wide (2026-10-06): the **three definition-write routes** used to call the
 * `@deprecated` `validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()`
 * pair at 9 call sites. That pair resolves ONLY the single DI-registered
 * `crudMutationGuardService` and silently bypasses every guard in the global
 * mutation-guard store, so a module that shipped `data/guards.ts` guards for
 * `workflows.*` would have them silently ignored.
 *
 * Those three routes now go through `runRouteMutationGuards()`, the
 * registry-based wrapper the deprecation notice names as the replacement. That
 * runs every registered guard plus the bridged legacy service
 * (`bridgeLegacyGuard()`), so the legacy behaviour is preserved exactly while
 * registry guards start being enforced.
 *
 * **Scope, stated honestly — this wrapper is NOT used by every `workflows` write
 * route.** 13 other write routes in this module (`instances/**`, `tasks/**`,
 * `signals`, `events`, `definitions/route` POST) have **no mutation guard at
 * all** — not this one, and not the deprecated pair either. That is a
 * **pre-existing gap** measured on 2026-10-06 (each of those routes shows
 * `deprecated_calls_at_parent = 0` at `d3af1b1~1`), and it is tracked separately
 * as an open item in `BACKLOG.md`; it is not introduced by, and not fixed by,
 * this migration. Do not read this file as evidence that `workflows` writes are
 * guarded.
 *
 * Same wrapper shape as the `entities` worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), the `data_sync`
 * migration (`data_sync/api/mutation-guard.ts`, `c6c3151`), the `dictionaries`
 * migration (`dictionaries/api/mutation-guard.ts`, `43e4e5d`) and the
 * `dashboards` migration (`dashboards/api/mutation-guard.ts`, `a05ea2c`).
 */
export async function beginWorkflowsMutationGuard(
  ctx: WorkflowsMutationGuardContext,
): Promise<WorkflowsMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative; this mirrors the legacy service's
    // behaviour when context was incomplete.
    return { blockedResponse: null, runAfterSuccess: async () => undefined }
  }

  const callGuards = (resourceId: string) =>
    runRouteMutationGuards({
      container: ctx.container,
      req: ctx.req,
      auth: {
        userId,
        tenantId,
        organizationId: ctx.organizationId ?? null,
      },
      input: {
        resourceKind: ctx.resourceKind,
        resourceId,
        operation: ctx.operation,
        mutationPayload: ctx.mutationPayload ?? null,
      },
    })

  const guardResult = await callGuards(ctx.resourceId)

  if (!guardResult.ok) {
    return {
      blockedResponse: NextResponse.json(guardResult.errorBody, { status: guardResult.errorStatus }),
      runAfterSuccess: async () => undefined,
    }
  }

  return {
    blockedResponse: null,
    runAfterSuccess: async (resourceIdOverride?: string | null) => {
      if (resourceIdOverride == null || resourceIdOverride === ctx.resourceId) {
        await guardResult.runAfterSuccess()
        return
      }
      // The write materialised a DB row whose id differs from the id validated
      // (the `code:<workflowId>` customize case). Re-collect the callbacks bound
      // to the final id, then run them. `validate` is a pure predicate (see the
      // guard contract), so re-running it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok) await rebound.runAfterSuccess()
    },
  }
}
