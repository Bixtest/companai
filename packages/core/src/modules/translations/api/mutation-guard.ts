import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type TranslationsMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved translations route context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (see `auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /**
   * The id the guard set is evaluated against.
   *
   * For the translation row this is the **composite** `${entityType}:${entityId}`
   * — a translation has no single-column primary key available before the write,
   * and the resource is addressed that way in the URL. For the locales route it
   * is the fixed logical id `supported_locales`.
   *
   * The `resourceIdOverride` argument of `runAfterSuccess` exists because the
   * translation save creates a row whose generated `id` is only known **after**
   * the write; the after-success is re-bound to it (see below). It is unused by
   * the locales route, whose target is a config value with no row id.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type TranslationsMutationGuardHandle = {
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
   * Call this **only after the write has committed.**
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for the `translations` write routes.
 *
 * D2-wide (2026-10-06): the module's **two custom write routes** used to call
 * the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 6 call sites —
 * `[entityType]/[entityId]` (PUT ×2 sites, DELETE ×2 sites) and `put/locales`
 * (PUT ×2 sites). That pair resolves ONLY the single DI-registered
 * `crudMutationGuardService` and silently bypasses every guard in the global
 * mutation-guard store, so a module that shipped `data/guards.ts` guards for
 * `translations.*` would have them silently ignored.
 *
 * **A correction to the migration plan, measured — not inherited.** The
 * queued task said this module has **6 calls in 2 files → "4 guard objects"**.
 * That figure is wrong, and it is wrong for a reason worth recording: the plan
 * appears to have counted each *route file* as contributing a guard **per
 * exported verb**, which would give 3 routes / 4 objects. Measured from the
 * source, the routes collect **one guard object each**, and `put/locales` and
 * `[entityType]/[entityId]` are **two different routes**, not two halves of
 * one:
 *
 * | Route file | Write verbs | Guard objects |
 * |---|---|---|
 * | `[entityType]/[entityId]/route.ts` | PUT, DELETE | 1 (collected once per request) |
 * | `put/locales.ts` | PUT | 1 |
 * | **Total** | **3 write verbs** | **2** |
 *
 * So the retired figure is **6 calls → 2 guard objects**, and the repo-wide
 * count drops **6**, not 4 (126 → 120).
 *
 * **`put/locales` is not a `route.ts`.** It is a `PUT` exported as the module
 * **default** (`export default PUT`) with a `metadata.path` of
 * `/translations/locales` — so a scan that looks only for files named
 * `route.ts` will silently miss it, and a migration that trusts such a scan
 * will leave this route on the deprecated resolver. It was found here by
 * walking every `.ts` file under `api/`, not by name. Any later sweep of this
 * kind must do the same.
 *
 * **Scope, stated honestly.** Measured on 2026-10-06 by walking every `.ts`
 * file under `api/`:
 *
 * - **All 3 write verbs in this module are guarded.** There are exactly two
 *   files that export a write verb (`[entityType]/[entityId]` → PUT, DELETE;
 *   `put/locales` → PUT) and this wrapper covers both. **`translations` has no
 *   `D2-gap`** — like `perspectives`, and unlike `workflows` (13 of 19
 *   unguarded) and `inbox_ops` (10 of 14 unguarded).
 * - The module's only other API file is `get/locales.ts` (`GET`), which reads.
 *
 * **The wrapper is wired even though the module ships no guards of its own
 * today.** `translations/data/` holds `entities.ts` and `validators.ts` but no
 * `guards.ts`, so `getAllMutationGuardInstances()` contributes nothing from
 * `translations.*` right now. The migration is still correct and still
 * necessary: it removes the bypass, keeps the bridged legacy service running
 * exactly as before (`bridgeLegacyGuard()`), and means the first guard this
 * module ever ships is **enforced**, not silently skipped. The defect being
 * fixed is the bypass, not the absence of guards.
 *
 * Same wrapper shape as the `entities` worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), the `data_sync`
 * migration (`data_sync/api/mutation-guard.ts`, `c6c3151`), the `dictionaries`
 * migration (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), the `dashboards`
 * migration (`dashboards/api/mutation-guard.ts`, `a05ea2c`), the `workflows`
 * migration (`workflows/api/mutation-guard.ts`, `d3af1b1`), the `inbox_ops`
 * migration (`inbox_ops/api/mutation-guard.ts`, `d89b8f6`) and the
 * `perspectives` migration (`perspectives/api/mutation-guard.ts`, `e26642c`).
 */
export async function beginTranslationsMutationGuard(
  ctx: TranslationsMutationGuardContext,
): Promise<TranslationsMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative (`resolveTranslationsRouteContext()`
    // throws a 401 `CrudHttpError` when there is no session or tenant); this
    // mirrors the legacy service's behaviour when context was incomplete.
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
      // The write materialised a row whose id differs from the id validated
      // (the translation save returns a generated `rowId`). Re-collect the
      // callbacks bound to the final id, then run them. `validate` is a pure
      // predicate (see the guard contract), so re-running it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok && !rebound.escalated) await rebound.runAfterSuccess()
    },
  }
}
