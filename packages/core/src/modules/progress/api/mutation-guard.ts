import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type ProgressMutationGuardContext = {
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
   * `<module>.<entity>`. This module writes one kind: `progress.job` — the
   * `ProgressJob` row. Every write here creates, updates or cancels such a row.
   */
  resourceKind: string
  /**
   * The id the guard set is evaluated against. `api/jobs` POST creates a row
   * whose id is materialised by the service, so the route passes `'new'`;
   * `api/jobs/[id]` PUT/DELETE know the target id at check time.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type ProgressMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback. Call this **only
   * after the write has committed.**
   *
   * The `shouldRunAfterSuccess` gate is already honoured by the registry: it
   * only adds a guard's `afterSuccess` to the callback list when that guard's
   * `validate()` returned `shouldRunAfterSuccess` (see `runMutationGuards()` in
   * `mutation-guard-registry.ts:117`). Calling this when no guard asked for it
   * is a no-op, not a behaviour change.
   */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `progress` write routes.
 *
 * **D2-gap (2026-10-07). Closed.** The `progress` module shipped **no mutation
 * guard mechanism of any kind** — a string scan of the whole module found no
 * wrapper, no `runRouteMutationGuards` call, no `makeCrudRoute` and neither of
 * the `@deprecated` pair. Its **3 write verbs across 2 files** were therefore
 * checked by nothing:
 *
 * | File | Verb | Write |
 * |---|---|---|
 * | `api/jobs/route.ts` | POST | `progressService.createJob` → `em.persist(job).flush()` |
 * | `api/jobs/[id]/route.ts` | PUT | `progressService.updateProgress` → `em.flush()` |
 * | `api/jobs/[id]/route.ts` | DELETE | `progressService.cancelJob` → `em.flush()` |
 *
 * **The premise was MEASURED, not assumed.** Each verb's service method was
 * read in `lib/progressServiceImpl.ts`: `createJob` persists a `ProgressJob`
 * row (`em.persist(job).flush()`, line 119), `updateProgress` flushes
 * (line 228) and `cancelJob` flushes (line 287). All three are genuine writes.
 *
 * **What was NOT missing — stated plainly, because the label invites the
 * opposite reading.** Every one of the three verbs **already enforces its own
 * capability** through `metadata.requireFeatures` — `progress.create` for the
 * POST, `progress.update` for the PUT, `progress.cancel` for the DELETE — and
 * every row lookup carries **tenant + organization scope** (`tenantId`, plus
 * `organizationId` when the caller has an org). The defect was the **missing
 * structural chokepoint**, not missing authorization. This wrapper adds that
 * chokepoint; it does not replace any route's own validation.
 *
 * **Why the security gain is narrow, and stated so:** `progress` ships **no
 * `data/guards.ts`**, so **no `progress.*` guard exists in the registry today**
 * — the wiring means the **first** such guard ever written will be **enforced**
 * rather than silently skipped. It does **not** mean these routes were open.
 *
 * **The `resourceKind` decision.** `progress` has one row per operation: a
 * `ProgressJob`. So there is one kind — `progress.job` — and the id is the job
 * id (`'new'` on create, where the service materialises it).
 *
 * Same wrapper shape as the seventeen migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`c6c3151`), `dictionaries` (`43e4e5d`), `dashboards` (`a05ea2c`),
 * `workflows` (`d3af1b1`), `inbox_ops` (`d89b8f6`), `perspectives`
 * (`e26642c`), `translations` (`a2f8d5f`), `planner` (`641d3af`),
 * `query_index` (`cc5a237`), `auth` (`aeeaad0`), `directory` (`d682c09`),
 * `feature_toggles` (`5af76bc`), `audit_logs` (`4ef5812`), `business_rules`
 * (`c9a6bb6`), `attachments` (`88582bd`) and `search` (`0ac8783`).
 */
export async function beginProgressMutationGuard(
  ctx: ProgressMutationGuardContext,
): Promise<ProgressMutationGuardHandle> {
  const { tenantId, userId } = ctx
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative and returns 401 before reaching here when
    // the actor is missing; this mirrors the legacy service's behaviour on
    // incomplete context rather than inventing a second auth mechanism.
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
