import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type InboxOpsMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved inbox_ops route context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (see `auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /**
   * The id the guard set is evaluated against — the proposal, proposal-action
   * or email the request addressed. For all four routes migrated here the id is
   * already known before the write, so callers normally do not need the
   * `resourceIdOverride` argument of `runAfterSuccess`.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type InboxOpsMutationGuardHandle = {
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
   * Call this **only after the write has committed**. A route that decides not
   * to write (e.g. the email DELETE returns 404 because the row was already
   * gone) must simply not call it — that reproduces the old behaviour, where
   * `runCrudMutationGuardAfterSuccess()` sat below the 404 return.
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for the `inbox_ops` write routes that
 * already had a guard.
 *
 * D2-wide (2026-10-06): the **four custom write routes** of this module used to
 * call the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 8 call sites:
 * `proposals/[id]/categorize` (POST), `proposals/[id]/actions/[actionId]`
 * (PATCH), `proposals/[id]/accept-all` (POST) and `emails/[id]` (DELETE). That
 * pair resolves ONLY the single DI-registered `crudMutationGuardService` and
 * silently bypasses every guard in the global mutation-guard store, so a module
 * that shipped `data/guards.ts` guards for `inbox_ops.*` would have them
 * silently ignored.
 *
 * Those four routes now go through `runRouteMutationGuards()`, the
 * registry-based wrapper the deprecation notice names as the replacement. That
 * runs every registered guard plus the bridged legacy service
 * (`bridgeLegacyGuard()`), so the legacy behaviour is preserved exactly while
 * registry guards start being enforced.
 *
 * **Scope, stated honestly — this wrapper is NOT used by every `inbox_ops`
 * write route.** Measured on 2026-10-06: the module has **14** routes that
 * export `POST|PUT|PATCH|DELETE`; this wrapper covers **4** of them (the four
 * that already called the deprecated pair — `proposals/[id]/categorize`,
 * `proposals/[id]/actions/[actionId]`, `proposals/[id]/accept-all`,
 * `emails/[id]`). The other **10** call **no guard at all** — neither this
 * wrapper nor the deprecated pair: `extract`, `emails/[id]/reprocess`,
 * `proposals/[id]/translate`, `proposals/[id]/reject`,
 * `proposals/[id]/actions/[actionId]/{accept,complete,reject}`,
 * `proposals/[id]/replies/[replyId]/send`, `settings` and `webhook/inbound`.
 * Do not read this file as evidence that `inbox_ops` writes are guarded.
 *
 * That gap is the sibling concern tracked as backlog item **`D2-gap`**: a route
 * that calls **no** guard is invisible to `D2-wide`'s count, which only measures
 * the deprecated resolver. Measure it per module; this file records the figure
 * for `inbox_ops` so the next reader does not have to guess.
 *
 * Same wrapper shape as the `entities` worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), the `data_sync`
 * migration (`data_sync/api/mutation-guard.ts`, `c6c3151`), the `dictionaries`
 * migration (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), the `dashboards`
 * migration (`dashboards/api/mutation-guard.ts`, `a05ea2c`) and the `workflows`
 * migration (`workflows/api/mutation-guard.ts`, `d3af1b1`).
 */
export async function beginInboxOpsMutationGuard(
  ctx: InboxOpsMutationGuardContext,
): Promise<InboxOpsMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative (every caller resolves the request context
    // first, which throws `UnauthorizedError` on a missing session); this mirrors
    // the legacy service's behaviour when context was incomplete.
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
      // The write materialised a row whose id differs from the id validated.
      // Re-collect the callbacks bound to the final id, then run them.
      // `validate` is a pure predicate (see the guard contract), so re-running
      // it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok) await rebound.runAfterSuccess()
    },
  }
}
