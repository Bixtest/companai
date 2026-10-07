import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type SearchMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved auth context / route scope). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /**
   * The resource kind the guard set is evaluated against, shaped
   * `<module>.<entity>`. This module writes three kinds:
   *
   * - `search.index` — the search index itself. Every reindex / purge / cancel
   *   route changes which documents are findable for a tenant, so it is a
   *   content-level write even when it enqueues rather than writes a row:
   *   `api/embeddings/reindex`, `api/embeddings/reindex/cancel`,
   *   `api/embeddings` POST, `api/index` DELETE, `api/reindex`,
   *   `api/reindex/cancel`.
   * - `search.settings` — the tenant-level search configuration
   *   (`api/settings/global-search` POST).
   *
   * Both are tenant-scoped rows/objects; the guard id is the tenant scope id
   * the routes themselves already use (`tenantId`, or a `tenantId:orgId` pair
   * when the write is organization-scoped).
   */
  resourceKind: string
  /** The id the guard set is evaluated against. */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type SearchMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback. Call only after the
   * write commits.
   *
   * Pass `resourceIdOverride` when the final resource id is only known *after*
   * the write. This module's writes materialise ids the route does not hold at
   * check time (a queue job id, a freshly-acquired lock row), so the same rebind
   * idiom the `attachments`/`translations` wrappers use applies: the guard was
   * validated against the id available at check time, and `afterSuccess` is
   * re-bound so it sees the final id.
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for every `search` write route.
 *
 * **D2-gap (2026-10-07). Closed.** All **7** of this module's write verbs called
 * **no mutation guard at all** — not a module wrapper (none existed), not
 * `runRouteMutationGuards()`, and not the `@deprecated` pair D2-wide retired. A
 * string scan of the whole module found **no guard symbol of any kind**, so a
 * guard set shipped for `search.index` / `search.settings` would have been
 * **silently skipped**. Every one of the seven is a genuine write: the reindex
 * and cancel routes acquire and clear reindex locks, create and complete
 * progress jobs and write indexer status logs; `api/index` DELETE purges index
 * entries for the caller's authorized organizations; `api/settings/global-search`
 * POST writes the tenant-level strategy configuration.
 *
 * **The premise was MEASURED, not assumed** — the standing rule this sweep has
 * now paid for three times (`messages`, `communication_channels`,
 * `notifications`). Here the artefact AGREED with the label: a hand walk of
 * every `.ts` under `api/` finds exactly **7 write verbs across 7 files**, and
 * none of the seven references any guard symbol. This is a genuine gap, of the
 * same class as `auth` / `business_rules` / `inbox_ops` / `attachments`.
 *
 * **What was NOT missing — stated plainly, because the label invites the
 * opposite reading.** Every one of the seven verbs **already enforces its own
 * capability** through `metadata.requireFeatures`, and every row/index operation
 * carries **tenant + organization scope**:
 *
 * | File | Verb | Feature today |
 * |---|---|---|
 * | `api/embeddings/reindex/route.ts` | POST | `search.embeddings.manage` |
 * | `api/embeddings/reindex/cancel/route.ts` | POST | `search.embeddings.manage` |
 * | `api/embeddings/route.ts` | POST | `search.embeddings.manage` |
 * | `api/index/route.ts` | DELETE | `search.embeddings.manage` |
 * | `api/reindex/route.ts` | POST | `search.reindex` |
 * | `api/reindex/cancel/route.ts` | POST | `search.reindex` |
 * | `api/settings/global-search/route.ts` | POST | `search.manage` |
 *
 * The defect was the **missing structural chokepoint**, not missing
 * authorization. This wrapper is that joint; it does not replace the feature
 * checks above, and it does not re-implement any route's own validation
 * (the reindex-in-progress lock check, the `confirmAll` guard on a full purge,
 * the organization-scope resolution, Zod validation) or audit story.
 *
 * **`resourceKind` — the design decision.** `search` has no domain row per
 * operation: what these routes change is the **search index** for a tenant, and
 * one settings object. So the kinds are `search.index` (the six index-touching
 * verbs) and `search.settings` (the configuration POST). A guard registered
 * against one does not fire for the other.
 *
 * **What this wrapper does NOT do.** It does not decide *whether* the caller may
 * write — that is the feature set above plus each route's own scope rules. It
 * runs the registry guard set and reports a block if one refuses. Guards are
 * **additional** policy, not a replacement.
 *
 * Same wrapper shape as the sixteen migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`c6c3151`), `dictionaries` (`43e4e5d`), `dashboards` (`a05ea2c`),
 * `workflows` (`d3af1b1`), `inbox_ops` (`d89b8f6`), `perspectives`
 * (`e26642c`), `translations` (`a2f8d5f`), `planner` (`641d3af`),
 * `query_index` (`cc5a237`), `auth` (`aeeaad0`), `directory` (`d682c09`),
 * `feature_toggles` (`5af76bc`), `audit_logs` (`4ef5812`), `business_rules`
 * (`c9a6bb6`) and `attachments` (`88582bd`).
 */
export async function beginSearchMutationGuard(
  ctx: SearchMutationGuardContext,
): Promise<SearchMutationGuardHandle> {
  const { tenantId, userId } = ctx
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative and returns before reaching here when the
    // actor is missing; this mirrors the legacy service's behaviour on
    // incomplete context rather than inventing a second auth mechanism.
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
      // The write materialised an id that differs from the id validated (a
      // queue job id, a freshly-acquired lock). Re-collect the callbacks bound
      // to the final id, then run them. `validate` is a pure predicate (see the
      // guard contract), so re-running it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok) await rebound.runAfterSuccess()
    },
  }
}
