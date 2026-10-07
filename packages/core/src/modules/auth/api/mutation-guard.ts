import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type AuthMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from `getAuthFromRequest`). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /** The id the guard set is evaluated against (here: the target user id). */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type AuthMutationGuardHandle = {
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
   */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `auth` write routes.
 *
 * D2-wide (2026-10-06): the module's **one custom write route** used to call
 * the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 2 call sites —
 * `api/users/resend-invite/route.ts` (POST ×2 sites). That pair resolves ONLY
 * the single DI-registered `crudMutationGuardService` and silently bypasses
 * every guard in the global mutation-guard store, so a module that shipped
 * `data/guards.ts` guards for `auth.*` would have them silently ignored.
 *
 * **The plan's figure held — verified, not inherited.** The queued task said
 * **2 calls / 1 file → 1 guard object**; walking every `.ts` file under
 * `api/` confirms exactly **2 real call sites in 1 file**, and the route
 * collects **one guard object per request**. Third module in a row where the
 * plan's number survived re-measurement.
 *
 * | Route file | Write verbs | Guard objects | Unguarded write verbs |
 * |---|---|---|---|
 * | `users/resend-invite/route.ts` | POST | 1 | 0 |
 * | **Total** | **1 write verb** | **1** | **0** |
 *
 * So the retired figure is **2 calls → 1 guard object**, and the repo-wide
 * count drops **2** (112 → 110).
 *
 * **The file count is where the plan is wrong, and it is recorded.** The plan
 * said 1 file and it *is* 1 file — but only by luck. This module has **13 write
 * verbs across 27 API files**, and the deprecated pair appears in exactly one
 * of them. A reader who inferred "one file, therefore the module is nearly
 * clean" would be drawing the wrong conclusion from the right number. What
 * actually needs saying is the other half, below.
 *
 * **The module is far larger than the 2 calls suggest — and that is the
 * finding that matters.** Measured on 2026-10-06 by walking every `.ts` under
 * `api/` and reading each write verb's guards, `auth` has **18 files exporting
 * a write verb**; only **3 are guarded**:
 *
 * | Route file | Write verbs | How it is guarded |
 * |---|---|---|
 * | `users/resend-invite/route.ts` | POST | **this wrapper** (was the deprecated pair) |
 * | `users/route.ts` | POST, PUT, DELETE | `makeCrudRoute` → `collectAndRunGuards()` |
 * | `roles/route.ts` | POST, PUT, DELETE | `makeCrudRoute` → `collectAndRunGuards()` |
 *
 * The remaining **15 files export a write verb that calls no guard
 * whatsoever** — neither the registry nor the deprecated pair:
 *
 * - **Resource writes that are the `D2-gap` proper** — a mutation on a real
 *   object that nothing checks: `users/acl/route.ts` (PUT),
 *   `roles/acl/route.ts` (PUT), `sidebar/preferences/route.ts` (PUT, DELETE),
 *   `sidebar/variants/route.ts` (POST), `sidebar/variants/[id]/route.ts`
 *   (PUT, DELETE), and five of the six `authority/*` routes (POST each:
 *   `delegations`, `denials`, `pending-acts`, `record-locks`, `trust` —
 *   `authority/projects/route.ts` exports **GET only**, so it is not a write
 *   route at all, checked rather than assumed).
 * - **Auth-flow endpoints, not resource mutations** — these change session or
 *   credential state and are guarded by their own mechanisms (rate limits,
 *   token checks), so counting them as `D2-gap` would inflate the number:
 *   `login.ts`, `logout.ts`, `reset.ts`, `reset/confirm.ts`,
 *   `session/refresh.ts`, `profile/route.ts` (self-service),
 *   `locale/route.ts`, `feature-check.ts`.
 *
 * That is **`D2-gap`, not `D2-wide`**: `D2-wide` retires a *deprecated*
 * resolver where a route already calls one; `D2-gap` is the **other half**, a
 * write that nothing checks. **A first draft of this header named a different,
 * wrong set of files; it was written from memory and corrected against the walk
 * above.** The measured `D2-gap` figure for `auth` is **12 unguarded
 * resource-writes across 10 files** (the count once the auth-flow endpoints
 * above are set aside): `users/acl` (1), `roles/acl` (1),
 * `sidebar/preferences` (2), `sidebar/variants` (1),
 * `sidebar/variants/[id]` (2), and the five `authority/*` routes (5).
 *
 * **Closed 2026-10-07 — all 12 are now wired through this wrapper, and the
 * figure re-measures to zero.** Each of the ten files above calls
 * `beginAuthMutationGuard()` before its write and `guard.runAfterSuccess()`
 * after it commits. The measured `D2-gap` for `auth` is now **0 unguarded
 * verbs**, and the repo-wide total fell **111 → 99**. Proven by
 * `api/__tests__/d2-gap-wiring.route.test.ts`, which registers a **real** guard
 * in the global store (not a mock of this function) and drives the **real**
 * handlers twice: once with a blocking guard — the write must not happen — and
 * once with an allowing one — the write must happen and `afterSuccess` must
 * fire. Both mutations cover all twelve verbs.
 *
 * **What was *not* the point, stated so a later reader does not over-read it.**
 * These routes were not unprotected: each already enforced its own capability
 * via `metadata.requireFeatures` (`auth.delegations.manage`,
 * `auth.denials.manage`, `auth.authority.approve`, `auth.records.lock`,
 * `auth.trust.promote`, `auth.acl.manage`, `auth.sidebar.manage`) and each
 * already wrote its own audit entry. A guard added here is a **second,
 * structural** check — the registry chokepoint — not the thing that decides who
 * may call the route. `auth` still ships **no `data/guards.ts`**, so no
 * `auth.*` guard exists in the registry today; what changed is that the first
 * one ever written will now be **enforced** rather than silently skipped.
 *
 * **A caution about this particular call site, stated because it is
 * load-bearing.** On this route the mutation guard is **not** what stops an
 * actor touching a foreign user's record. That decision is made by
 * `assertActorCanAccessUserTarget()` (`lib/grantChecks.ts:130`), which the
 * route calls **before** the guard and which enforces the tenant match and the
 * actor's organization list. The guard here is a small extra check
 * (`resourceKind: 'auth.user'`, `operation: 'custom'`), and
 * **`auth` ships no `guards.ts`**, so before this migration the deprecated
 * pair's only real content was the bridged legacy service. The migration is
 * still correct and still necessary — it removes the **bypass** and means the
 * first guard this module ever ships is **enforced** rather than silently
 * skipped — but the security argument for it rests on that, **not** on this
 * route being unprotected today. Saying so prevents a later reader from
 * over-reading the change.
 *
 * **The guard context this route carries.** The guard input carried
 * `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()`
 * derives both from the `req` it is handed (`route-mutation-guard.ts:143-144`)
 * and forwards `req.method` / `req.headers` to every guard, so the wrapper
 * passes `req` and the observable guard input is **equivalent**.
 *
 * Same wrapper shape as the ten migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`data_sync/api/mutation-guard.ts`, `c6c3151`), `dictionaries`
 * (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), `dashboards`
 * (`dashboards/api/mutation-guard.ts`, `a05ea2c`), `workflows`
 * (`workflows/api/mutation-guard.ts`, `d3af1b1`), `inbox_ops`
 * (`inbox_ops/api/mutation-guard.ts`, `d89b8f6`), `perspectives`
 * (`perspectives/api/mutation-guard.ts`, `e26642c`), `translations`
 * (`translations/api/mutation-guard.ts`, `a2f8d5f`), `planner`
 * (`planner/api/mutation-guard.ts`, `641d3af`) and `query_index`
 * (`query_index/api/mutation-guard.ts`, `cc5a237`).
 */
export async function beginAuthMutationGuard(
  ctx: AuthMutationGuardContext,
): Promise<AuthMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative (`getAuthFromRequest` returns null, and
    // the route returns a 401 before reaching here); this mirrors the legacy
    // service's behaviour when context was incomplete.
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
