import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type FeatureTogglesMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the module's request scope resolution). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.userId` / `auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /** The id the guard set is evaluated against (here: the override row, or the toggle id when no row exists yet). */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type FeatureTogglesMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback.
   *
   * Call this **only after the write has committed.**
   *
   * The `shouldRunAfterSuccess` gate the route used to apply by hand is
   * **already honoured by the registry**, so it is not re-implemented here: the
   * registry only adds a guard's `afterSuccess` to the callback list when that
   * guard's `validate()` returned `shouldRunAfterSuccess` (see
   * `runMutationGuards()` in `mutation-guard-registry.ts:117`). Calling this
   * when no guard asked for it is therefore a no-op, not a behaviour change.
   *
   * Pass `idOverride` when the id the write **produced** differs from the id
   * the guard set was validated against — see the note on this route below.
   */
  runAfterSuccess: (idOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for the `feature_toggles` write routes.
 *
 * D2-wide (2026-10-06): the module's **one custom write route** used to call
 * the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 2 call sites —
 * `api/overrides/route.ts` (PUT ×2 sites). That pair resolves ONLY the single
 * DI-registered `crudMutationGuardService` and silently bypasses every guard
 * in the global mutation-guard store, so a module that shipped
 * `data/guards.ts` guards for `feature_toggles.*` would have them silently
 * ignored.
 *
 * **The plan's figure held — verified, not inherited.** The queued task said
 * **2 calls / 1 file → 1 guard object**; walking every `.ts` file under
 * `api/` confirms exactly **2 real call sites in 1 file**, and the route
 * collects **one guard object per request**.
 *
 * | Route file | Write verbs | Guard objects | Unguarded write verbs |
 * |---|---|---|---|
 * | `overrides/route.ts` | PUT | 1 | 0 |
 * | `global/route.ts` | POST, PUT, DELETE | 0 (see below) | 0 |
 * | **Total** | **4 write verbs** | **1** | **0** |
 *
 * So the retired figure is **2 calls → 1 guard object**, and the repo-wide
 * count drops **2** (108 → 106). This is the **last enabled module** in the
 * D2-wide sweep.
 *
 * **The module has no `D2-gap`.** Every write verb is covered:
 * `overrides` PUT is guarded by **this wrapper** (was the deprecated pair);
 * `global` POST/PUT/DELETE are guarded through `makeCrudRoute` →
 * `collectAndRunGuards()` (the CRUD factory's registry guard set —
 * `factory.ts:615-618`). The only other route, `check/*` (boolean, json,
 * number, string), is **read only** — checked, not assumed.
 *
 * **A naming trap, recorded so a `grep` is not trusted.** This route also
 * calls the helper named `enforceCommandOptimisticLockWithGuards`
 * (`optimistic-lock-command.ts`) on the existing-override path. That helper
 * does **not** run mutation guards — its `...WithGuards` suffix refers to the
 * *command optimistic-lock* guard service, and its first step is the OSS
 * optimistic-lock floor `enforceCommandOptimisticLock`. A plain `grep -i guard`
 * shows the file as "guarded"; the mutation guard is this wrapper.
 *
 * **The id-rebind — and why this wrapper takes an `idOverride`.** The PUT
 * validates the guard set against `existingOverride?.id ?? parsed.data.toggleId`
 * (the row if one exists, else the toggle id), then the command runs and may
 * **create** a row whose generated id (`result.overrideToggleId`) differs from
 * the toggle id it validated against. The old code passed that produced id to
 * `runCrudMutationGuardAfterSuccess`, so the after-success hook ran against the
 * row the write actually made. `runAfterSuccess(idOverride)` reproduces that:
 * when `idOverride` is absent or equal to the validated id, it simply runs the
 * collected callbacks; when it differs, it **re-collects** the guard set for
 * the produced id and runs that. Re-running the set is safe **only because
 * `validate` is a pure predicate** — a fresh set is collected, so no callback
 * runs twice.
 *
 * **A caution about this call site.** The mutation guard is **not** the main
 * protection on this route: the route resolves a verified tenant
 * (`resolveFeatureCheckContext`, 400 if absent), loads the override row
 * tenant-scoped, and refuses a stale overwrite via
 * `enforceCommandOptimisticLockWithGuards()`. **`feature_toggles` ships no
 * `guards.ts`**, so before this migration the deprecated pair's only content
 * was the bridged legacy service. The migration is still correct and still
 * necessary — it removes the **bypass** and means the first guard this module
 * ever ships is **enforced** rather than silently skipped — but the security
 * argument rests on that, **not** on this route being unprotected today.
 *
 * **The guard context this route carries.** The old guard input carried
 * `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()`
 * derives both from the `req` it is handed (`route-mutation-guard.ts:143-144`)
 * and forwards `req.method` / `req.headers` to every guard, so the wrapper
 * passes `req` and the observable guard input is **equivalent**.
 *
 * Same wrapper shape as the twelve migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`data_sync/api/mutation-guard.ts`, `c6c3151`), `dictionaries`
 * (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), `dashboards`
 * (`dashboards/api/mutation-guard.ts`, `a05ea2c`), `workflows`
 * (`workflows/api/mutation-guard.ts`, `d3af1b1`), `inbox_ops`
 * (`inbox_ops/api/mutation-guard.ts`, `d89b8f6`), `perspectives`
 * (`perspectives/api/mutation-guard.ts`, `e26642c`), `translations`
 * (`translations/api/mutation-guard.ts`, `a2f8d5f`), `planner`
 * (`planner/api/mutation-guard.ts`, `641d3af`), `query_index`
 * (`query_index/api/mutation-guard.ts`, `cc5a237`), `auth`
 * (`auth/api/mutation-guard.ts`, `aeeaad0`) and `directory`
 * (`directory/api/mutation-guard.ts`, `d682c09`) — extended here with the
 * `idOverride` rebind that this route needs and the simpler wrappers did not.
 */
export async function beginFeatureTogglesMutationGuard(
  ctx: FeatureTogglesMutationGuardContext,
): Promise<FeatureTogglesMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative (it returns a 401 before reaching here
    // when the actor id is missing); this mirrors the legacy service's
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
    runAfterSuccess: async (idOverride?: string | null) => {
      if (idOverride == null || idOverride === ctx.resourceId) {
        await guardResult.runAfterSuccess()
        return
      }
      // The write produced a different id than the one validated (e.g. a newly
      // created override row). Re-collect the guard set for the produced id —
      // safe because `validate` is a pure predicate — and run its callbacks.
      const rebound = await callGuards(idOverride)
      if (rebound.ok && !rebound.escalated) await rebound.runAfterSuccess()
    },
  }
}
