import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

export type SchedulerMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from `getAuthFromRequest`). */
  tenantId: string | null | undefined
  /** Organization the action is scoped to, if any. */
  organizationId?: string | null
  /** Actor id, the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /**
   * The resource kind the guard set is evaluated against, shaped
   * `<module>.<entity>`. The scheduler writes touch one entity:
   * `scheduler.job` (`ScheduledJob`).
   */
  resourceKind: string
  /**
   * The id the guard set is evaluated against. For the manual trigger this is
   * the `ScheduledJob` id, known before the action runs.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

export type SchedulerMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback. Call this **only
   * after the action has committed** (the enqueue has returned).
   *
   * The `shouldRunAfterSuccess` gate is already honoured by the registry: it
   * only adds a guard's `afterSuccess` to the callback list when that guard's
   * `validate()` returned `shouldRunAfterSuccess`. Calling this when no guard
   * asked for it is a no-op, not a behaviour change.
   */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `scheduler` write routes.
 *
 * **D2-gap (2026-10-07). Closed.** The tool read the `scheduler` module as
 * **1 unguarded verb** in **1 file**: `api/trigger/route.ts` POST. Measured
 * first, by two routes (the tool's `--json` rows, and a hand read of every
 * `.ts` under `api/`), the one verb is a genuine chokepoint miss:
 *
 * | File | Verb | What it does |
 * |---|---|---|
 * | `api/trigger/route.ts` | POST | Manual trigger: enqueues a `scheduler-execution` BullMQ job for a `ScheduledJob` |
 *
 * **The module had NO wrapper and no `data/guards.ts`**, so a `scheduler.job`
 * guard would have been silently skipped (the `search`/`webhooks` lesson); the
 * wrapper is therefore the chokepoint, not a module-owned guard set.
 *
 * **`scheduler.job` is the module's own resource name, reached by two routes.**
 * The CRUD route (`api/jobs/route.ts`) derives it from its `commandId`
 * (`scheduler.jobs.create` -> singularise -> `scheduler.job`), and the command
 * layer (`commands/jobs.ts`) writes `resourceKind: 'scheduler.job'` on all
 * three audit logs. The manual trigger is a state-changing action on that same
 * `ScheduledJob`, so it is guarded under the same kind, operation `'custom'`.
 *
 * **The precedent is `communication_channels/api/post/channels/[id]/poll-now`**:
 * an authenticated action route that enqueues a job and is wired through the
 * registry with `operation: 'custom'`. This route has the same shape (it reads
 * the row, then enqueues work) and is wired the same way.
 *
 * **What was NOT missing, stated plainly, because `D2-gap` invites the
 * opposite reading.** The route already enforces its own capability
 * (`scheduler.jobs.trigger`) through `metadata.requireFeatures`, resolves a
 * tenant + organization scope from the authenticated actor, and requires the
 * super-admin flag for system-scoped schedules. The defect was the missing
 * **structural chokepoint**, not missing authorization.
 */
export async function beginSchedulerMutationGuard(
  ctx: SchedulerMutationGuardContext,
): Promise<SchedulerMutationGuardHandle> {
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

  if (!guardResult.ok) {
    return {
      blockedResponse: NextResponse.json(
        guardResult.errorBody,
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
