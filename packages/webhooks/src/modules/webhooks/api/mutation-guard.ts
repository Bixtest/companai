import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type WebhooksMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the resolved `WebhookRequestScope`). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to, if any. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /**
   * The resource kind the guard set is evaluated against, shaped
   * `<module>.<entity>`. This module writes two kinds:
   *
   * - `webhooks.endpoint` — a webhook endpoint row (`WebhookEntity`). Its
   *   create/update/delete go through `webhooks/route.ts` (`makeCrudRoute`,
   *   already guarded) and the manual PUT/DELETE in `webhooks/[id]/route.ts`,
   *   plus the secret rotation in `webhooks/[id]/rotate-secret/route.ts`.
   * - `webhooks.delivery` — a webhook delivery row (`WebhookDeliveryEntity`).
   *   Written by `webhook-deliveries/[id]/retry` (resets status and re-enqueues)
   *   and by `webhooks/[id]/test` (creates and synchronously processes a test
   *   delivery).
   *
   * A guard registered against one kind does not fire for the other.
   */
  resourceKind: string
  /** The id the guard set is evaluated against. */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type WebhooksMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /**
   * Runs every registry guard's `afterSuccess` callback. Call only after the
   * write commits.
   *
   * Pass `resourceIdOverride` when the final resource id is only known *after*
   * the write. `webhooks/[id]/test` materialises a delivery id the route does
   * not hold at check time, so the same rebind idiom the `search`/`attachments`
   * wrappers use applies: the guard was validated against the id available at
   * check time, and `afterSuccess` is re-bound so it sees the final id.
   */
  runAfterSuccess: (resourceIdOverride?: string | null) => Promise<void>
}

/**
 * Runs the structural mutation guards for every `webhooks` write route.
 *
 * **D2-gap (2026-10-07). Closed.** The `webhooks` module shipped **no mutation
 * guard mechanism of any kind** — a scan of the whole module found no wrapper,
 * no `runRouteMutationGuards` call and neither of the `@deprecated` pair. The
 * D2-gap label read **7** unguarded verbs. **The premise was MEASURED, not
 * assumed**, and the 7 split three ways:
 *
 * | # | File | Verb | Verdict |
 * |---|---|---|---|
 * | 1 | `api/route.ts` | POST | **false positive** — a two-line re-export shim of `./webhooks/route.ts`, which IS `makeCrudRoute` (guarded). The tool's re-export regex missed the `import { … }` + bare `export { … }` spelling; the TOOL was fixed, not the repo. |
 * | 2 | `api/inbound/[endpointId]/route.ts` | POST | **actor-less** — `requireAuth: false`, no session, writes a `WebhookInboundReceiptEntity` with a possibly-null tenant. Guarded by `adapter.verifyWebhook` (the provider signature IS the auth), a 60/min rate limit, integration gating and unique-violation dedup. Set aside in the tool by name, like `inbox_ops/api/webhook/inbound.ts`. |
 * | 3 | `api/webhook-deliveries/[id]/retry/route.ts` | POST | **genuine write** — resets `status`/`nextRetryAt`/`errorMessage` and `em.flush()` (line 66), then `enqueueWebhookDelivery`. |
 * | 4 | `api/webhooks/[id]/rotate-secret/route.ts` | POST | **genuine write** — rotates `secret`/`previousSecret`/`previousSecretSetAt` and `em.flush()` (line 38). |
 * | 5,6 | `api/webhooks/[id]/route.ts` | PUT, DELETE | **genuine writes** — `em.flush()` (PUT line 107), soft-delete `deletedAt` + `em.flush()` (DELETE lines 143-144). |
 * | 7 | `api/webhooks/[id]/test/route.ts` | POST | **genuine write** — `createWebhookDelivery` writes a delivery row, then `processWebhookDeliveryJob` runs it. |
 *
 * So **5 verbs across 4 files** are the real gap. Each is wired below.
 *
 * **What was NOT missing — stated plainly, because the label invites the
 * opposite reading.** Every one of the five verbs **already enforces its own
 * capability** through `metadata.requireFeatures` — `webhooks.manage` (retry,
 * PUT, DELETE), `webhooks.secrets` (rotate), `webhooks.test` (test) — and every
 * lookup carries **tenant + organization scope** via `findScopedWebhook` /
 * `findScopedDelivery`. The defect was the **missing structural chokepoint**,
 * not missing authorization. This wrapper adds that chokepoint; it does not
 * replace any route's own validation, scope rules or audit story.
 *
 * **Why the security gain is narrow, and stated so:** `webhooks` ships **no
 * `data/guards.ts`**, so **no `webhooks.*` guard exists in the registry today**
 * — the wiring means the **first** such guard ever written will be **enforced**
 * rather than silently skipped. It does **not** mean these routes were open.
 *
 * **The optimistic-lock floor is NOT this guard.** `webhooks/[id]/route.ts`
 * already calls `enforceCommandOptimisticLockWithGuards(...)` on PUT and DELETE.
 * That is the OSS optimistic-lock compare (plus the optional DI
 * `commandOptimisticLockGuardService`) and **never consults
 * `getAllMutationGuardInstances()`** — the `directory` trap. The registry call
 * added here is a separate chokepoint, not a duplicate of the floor.
 *
 * Same wrapper shape as the eighteen migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`c6c3151`), `dictionaries` (`43e4e5d`), `dashboards` (`a05ea2c`),
 * `workflows` (`d3af1b1`), `inbox_ops` (`d89b8f6`), `perspectives`
 * (`e26642c`), `translations` (`a2f8d5f`), `planner` (`641d3af`),
 * `query_index` (`cc5a237`), `auth` (`aeeaad0`), `directory` (`d682c09`),
 * `feature_toggles` (`5af76bc`), `audit_logs` (`4ef5812`), `business_rules`
 * (`c9a6bb6`), `attachments` (`88582bd`), `search` (`0ac8783`) and `progress`
 * (`e1fa605`).
 */
export async function beginWebhooksMutationGuard(
  ctx: WebhooksMutationGuardContext,
): Promise<WebhooksMutationGuardHandle> {
  const { tenantId, userId } = ctx
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own scope check (`resolveWebhookRequestScope`) is authoritative and
    // returns 401 before reaching here when the actor is missing; this mirrors
    // the legacy service's behaviour on incomplete context rather than
    // inventing a second auth mechanism.
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
      // The write materialised an id that differs from the id validated (the
      // test-delivery id). Re-collect the callbacks bound to the final id, then
      // run them. `validate` is a pure predicate (see the guard contract), so
      // re-running it has no effect.
      const rebound = await callGuards(resourceIdOverride)
      if (rebound.ok) await rebound.runAfterSuccess()
    },
  }
}
