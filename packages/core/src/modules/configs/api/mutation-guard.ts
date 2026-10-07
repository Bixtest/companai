import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type ConfigsMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from `getAuthFromRequest` / the resolved scope). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /**
   * The resource kind the guard set is evaluated against, shaped
   * `<module>.<entity>`. This module's one genuine write creates an
   * `UpgradeActionRun` row (table `upgrade_action_runs`), so the kind is
   * `configs.upgradeActionRun`.
   */
  resourceKind: string
  /**
   * The id the guard set is evaluated against. `upgrade-actions` POST acts on a
   * named action, so it passes the `actionId` it is about to run — known before
   * the write.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type ConfigsMutationGuardHandle = {
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
 * Runs the structural mutation guards for the `configs` write routes that
 * actually write a business row.
 *
 * **D2-gap (2026-10-07). Closed.** The tool read the `configs` module as **4
 * unguarded verbs across 4 files**. **Measured first, by two routes** (the
 * tool's `--json` rows, and a hand read of every `.ts` under `api/`), the 4
 * split **three ways** — so a blanket fix would have been wrong for three of
 * them:
 *
 * | File | Verb | What it actually does | Class |
 * |---|---|---|---|
 * | `api/cache/route.ts` | POST | builds the registry guard set INLINE and runs it | already guarded (tool blind spot) |
 * | `api/system-status/route.ts` | POST | `cache.clear()` — a cache op, no DB row | set aside |
 * | `api/module-telemetry/route.ts` | DELETE | in-process telemetry clear, dev-only, no DB row | set aside |
 * | `api/upgrade-actions/route.ts` | POST | `executeUpgradeAction` writes an `UpgradeActionRun` row | **genuine gap — wired here** |
 *
 * **`api/cache/route.ts` is `GUARDED_REGISTRY`, not a gap.** It imports
 * `runMutationGuards` + `getAllMutationGuardInstances`, builds
 * `[...getAllMutationGuardInstances()]` plus the bridged legacy guard, runs
 * `runMutationGuards(...)` and fires the after-success callbacks itself — i.e.
 * exactly what `runRouteMutationGuards` does, written out longhand. The tool
 * read it as GAP because the file referenced `runMutationGuards`, not the
 * wrapper's name. **Fixed in the tool**, not the repo (the same class of miss
 * as the two `LOCAL_GUARD_HELPERS` corrections); the rule now treats an
 * inline `getAllMutationGuardInstances()` **and** `runMutationGuards()` as a
 * registry path.
 *
 * **The two set-asides were MEASURED, not assumed.** `system-status` POST
 * calls `runWithCacheTenant(tenantScope, () => cache.clear())` — the only
 * mutation is on the cache service, there is no business row a registry guard
 * could describe. `module-telemetry` DELETE calls `clearModuleResourceUsageData()`
 * and is gated off outside development: `canClearModuleTelemetry()` returns
 * `process.env.NODE_ENV === 'development'`, and the route returns **403 before
 * the clear** in production. Both are set aside by name in the tool's
 * `READ_ONLY_PATHS`, with the reason recorded.
 *
 * **What was NOT missing on the wired route — stated plainly, because the
 * label invites the opposite reading.** `upgrade-actions` POST already enforces
 * `configs.manage` through `metadata.requireFeatures`, requires an
 * authenticated actor, resolves a tenant + organization scope (400 if absent),
 * validates the body with Zod, and is gated off unless `UPGRADE_ACTIONS_ENABLED`
 * is set. The defect was the missing **structural chokepoint**, not missing
 * authorization.
 */
export async function beginConfigsMutationGuard(
  ctx: ConfigsMutationGuardContext,
): Promise<ConfigsMutationGuardHandle> {
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
