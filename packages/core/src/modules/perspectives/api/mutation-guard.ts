import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type PerspectivesMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved perspectives route context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (see `auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /**
   * The id the guard set is evaluated against — the perspective, the role, or
   * (for a role-scoped save) the comma-joined list of target roles.
   *
   * The three routes migrated here all know their id before the write, so
   * `resourceIdOverride` is normally not needed. It exists because the guard
   * contract is uniform across the platform, not because these routes use it.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type PerspectivesMutationGuardHandle = {
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
   *
   * Call this **only after the write has committed.** A route that decides not
   * to write (a delete that found nothing, a role clear that removed zero rows)
   * must simply not call it — that reproduces the old behaviour, where
   * `runCrudMutationGuardAfterSuccess()` sat below the no-op guard.
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for the `perspectives` write routes.
 *
 * D2-wide (2026-10-06): the **three write routes** of this module used to call
 * the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 8 call sites:
 * `[tableId]` (POST — and it collects a **second**, role-scoped guard), the
 * personal-perspective DELETE (`[tableId]/[perspectiveId]`) and the role-clear
 * DELETE (`[tableId]/roles/[roleId]`). That pair resolves ONLY the single
 * DI-registered `crudMutationGuardService` and silently bypasses every guard in
 * the global mutation-guard store, so a module that shipped `data/guards.ts`
 * guards for `perspectives.*` would have them silently ignored.
 *
 * Those three routes now go through `runRouteMutationGuards()`, the
 * registry-based wrapper the deprecation notice names as the replacement. That
 * runs every registered guard plus the bridged legacy service
 * (`bridgeLegacyGuard()`), so the legacy behaviour is preserved exactly while
 * registry guards start being enforced.
 *
 * **The shape that is different from the five modules before this one:** the
 * POST route guards **two resources** in one request — a personal perspective
 * and, when the payload carries role operations, a role perspective. Each is a
 * separate guard object from this factory, evaluated independently, and each
 * keeps its own after-success condition. Do not collapse them into one.
 *
 * **Scope, stated honestly.** Measured on 2026-10-06: this module has **3**
 * routes that export `POST|PUT|PATCH|DELETE`, and this wrapper covers **all 3**.
 * Unlike `workflows` (13 of 19 unguarded) and `inbox_ops` (10 of 14 unguarded),
 * **`perspectives` has no `D2-gap`**: every write route in the module runs a
 * guard. The only route with no guard is `GET` on `[tableId]`, which reads.
 *
 * Same wrapper shape as the `entities` worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), the `data_sync`
 * migration (`data_sync/api/mutation-guard.ts`, `c6c3151`), the `dictionaries`
 * migration (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), the `dashboards`
 * migration (`dashboards/api/mutation-guard.ts`, `a05ea2c`), the `workflows`
 * migration (`workflows/api/mutation-guard.ts`, `d3af1b1`) and the `inbox_ops`
 * migration (`inbox_ops/api/mutation-guard.ts`, `d89b8f6`).
 */
export async function beginPerspectivesMutationGuard(
  ctx: PerspectivesMutationGuardContext,
): Promise<PerspectivesMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative (every caller resolves the request context
    // first, which returns 401 on a missing session); this mirrors the legacy
    // service's behaviour when context was incomplete. Note the legacy calls
    // passed `tenantId: auth.tenantId ?? ''` — an empty string is falsy here, so
    // the same condition holds.
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
    runAfterSuccess: async (resourceIdOverride?: string | null) => {
      if (resourceIdOverride == null || resourceIdOverride === ctx.resourceId) {
        await guardResult.runAfterSuccess()
        return
      }
      // The write materialised a row whose id differs from the id validated.
      // Re-collect the callbacks bound to the final id, then run them.
      // `validate` is a pure predicate (see the guard contract), so re-running
      // it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok && !rebound.escalated) await rebound.runAfterSuccess()
    },
  }
}
