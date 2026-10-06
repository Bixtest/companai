import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type DashboardsMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved dashboards route context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (see `auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /**
   * The id the guard set is evaluated against. For a layout write this is the
   * owning user id; for a role/user widget write it is the role or user id.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type DashboardsMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback.
   *
   * Pass `resourceIdOverride` when the final resource id is only known *after*
   * the write. The guard was validated against the id available at check time,
   * but a guard's `afterSuccess` receives `resourceId`, so it is re-bound here
   * to the id the caller supplies. Re-running the guard set is safe **by
   * contract**: `MutationGuard.validate` is a pure predicate that reads the
   * payload and returns a decision — it performs no side effects (see
   * `entities/data/guards.ts`, the reference guards). Only `afterSuccess` acts,
   * and stale callbacks are never double-run because a fresh set is collected.
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for every `dashboards` write.
 *
 * D2-wide (2026-10-06): this module used to call the `@deprecated`
 * `validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()` pair at 10
 * call sites across 4 route files. That pair resolves ONLY the single
 * DI-registered `crudMutationGuardService` and silently bypasses every guard in
 * the global mutation-guard store, so a module that shipped `data/guards.ts`
 * guards for `dashboards.*` would have them silently ignored.
 *
 * Every `dashboards` write now goes through `runRouteMutationGuards()`, the
 * registry-based wrapper the deprecation notice names as the replacement. That
 * runs every registered guard plus the bridged legacy service
 * (`bridgeLegacyGuard()`), so the legacy behaviour is preserved exactly while
 * registry guards start being enforced.
 *
 * Two of the migrated routes (`roles/widgets`, `users/widgets`) write in one of
 * two mutually-exclusive branches — "clear the override" (remove, then return)
 * or "upsert the override" — and each branch runs the after-success callbacks.
 * Because `validate()` is a pure predicate, collecting the guard set once and
 * invoking `runAfterSuccess()` in whichever branch is taken is equivalent to the
 * legacy pair, and it avoids evaluating the guard set twice.
 *
 * Same wrapper shape as the `entities` worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), the `data_sync`
 * migration (`data_sync/api/mutation-guard.ts`, `c6c3151`) and the `dictionaries`
 * migration (`dictionaries/api/mutation-guard.ts`, `43e4e5d`).
 */
export async function beginDashboardsMutationGuard(
  ctx: DashboardsMutationGuardContext,
): Promise<DashboardsMutationGuardHandle> {
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
      // The write assigned a different id than the one validated. Re-collect the
      // callbacks bound to that id, then run them. `validate` is a pure
      // predicate (see the guard contract), so re-running it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok) await rebound.runAfterSuccess()
    },
  }
}
