import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type CurrenciesMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from `getAuthFromRequest`). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /**
   * The resource kind the guard set is evaluated against, shaped
   * `<module>.<entity>`. This module's writes touch one of:
   * `currencies.currency_fetch_config` (the `fetch-configs` CRUD) or
   * `currencies.exchange_rate` (the `fetch-rates` insert).
   */
  resourceKind: string
  /**
   * The id the guard set is evaluated against. For updates/deletes this is the
   * row id, known before the write. For a create whose final id is only known
   * after commit, pass the id you can name today and use
   * `runAfterSuccess(resourceIdOverride)` to rebind.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type CurrenciesMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback. Call this **only
   * after the write has committed.**
   *
   * The `shouldRunAfterSuccess` gate is already honoured by the registry: it
   * only adds a guard's `afterSuccess` to the callback list when that guard's
   * `validate()` returned `shouldRunAfterSuccess`. Calling this when no guard
   * asked for it is a no-op, not a behaviour change.
   */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `currencies` write routes.
 *
 * **D2-gap (2026-10-07). Closed.** The tool read the `currencies` module as
 * **4 unguarded verbs across 2 files**. **Measured first, by two routes** (the
 * tool's `--json` rows, and a hand read of every `.ts` under `api/`), the 4
 * did **not** split — every one is a genuine business-row write, so all four
 * are wired:
 *
 * | File | Verb | What it writes |
 * |---|---|---|
 * | `api/fetch-configs/route.ts` | POST | `createFetchConfig` → `em.create` + `em.persist(...).flush()` |
 * | `api/fetch-configs/route.ts` | PUT | `updateFetchConfig` → `em.assign` + `em.persist(...).flush()` |
 * | `api/fetch-configs/route.ts` | DELETE | `deleteFetchConfig` → `em.remove(...).flush()` |
 * | `api/fetch-rates/route.ts` | POST | `fetchRatesForDate` writes `ExchangeRate` rows + updates `CurrencyFetchConfig.lastSync*` |
 *
 * **The module had NO wrapper and no `data/guards.ts`**, so a `currencies.*`
 * guard would have been silently skipped (the `search`/`webhooks` lesson);
 * the wrapper is therefore the chokepoint, not a module-owned guard set.
 *
 * **What was NOT missing — stated plainly, because `D2-gap` invites the
 * opposite reading.** Every one of these routes already enforces its own
 * capability (`currencies.fetch.manage`) through `metadata.requireFeatures` and
 * resolves a tenant + organization scope by the authenticated actor. The
 * defect was the missing **structural chokepoint**, not missing authorization.
 *
 * **The optimistic-lock floor is a DIFFERENT mechanism.** `fetch-configs`
 * PUT/DELETE also call `enforceCommandOptimisticLock(...)` — the command-lock
 * floor, which never consults the registry (the `directory` trap). The registry
 * call added here is a separate chokepoint; finding the word "lock" in the file
 * is not the guard.
 */
export async function beginCurrenciesMutationGuard(
  ctx: CurrenciesMutationGuardContext,
): Promise<CurrenciesMutationGuardHandle> {
  const guardResult = await runRouteMutationGuards({
    container: ctx.container,
    req: ctx.req,
    auth: {
      userId: ctx.userId ?? '',
      tenantId: ctx.tenantId ?? '',
      organizationId: ctx.organizationId ?? null,
    },
    input: {
      resourceKind: ctx.resourceKind,
      resourceId: ctx.resourceId ?? null,
      operation: ctx.operation,
      mutationPayload: ctx.mutationPayload ?? null,
    },
  })

  if (!guardResult.ok || guardResult.escalated) {
    return {
      blockedResponse: NextResponse.json(
        ("errorBody" in guardResult) ? guardResult.errorBody : { status: 'pending_review', escalation: guardResult.escalation },
        { status: guardResult.errorStatus ?? 422 },
      ),
      runAfterSuccess: async () => {},
    }
  }

  return {
    blockedResponse: null,
    runAfterSuccess: async () => {
      await guardResult.runAfterSuccess()
    },
  }
}
