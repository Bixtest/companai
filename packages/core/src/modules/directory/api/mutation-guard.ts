import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type DirectoryMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from `getAuthFromRequest`). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to. */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  resourceKind: string
  /**
   * The id the guard set is evaluated against. For a whole-resource write with
   * no row identity (this module's branding PUT) the subject *is* the
   * organization id, so the two are the same value here — see the note below.
   */
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type DirectoryMutationGuardHandle = {
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
 * Runs the structural mutation guards for the `directory` write routes.
 *
 * D2-wide (2026-10-06): the module's **one custom write route** used to call
 * the `@deprecated` `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair at 2 call sites —
 * `api/organization-branding/route.ts` (PUT ×2 sites). That pair resolves ONLY
 * the single DI-registered `crudMutationGuardService` and silently bypasses
 * every guard in the global mutation-guard store, so a module that shipped
 * `data/guards.ts` guards for `directory.*` would have them silently ignored.
 *
 * **The plan's figure held — verified, not inherited.** The queued task said
 * **2 calls / 1 file → 1 guard object**; walking every `.ts` file under `api/`
 * confirms exactly **2 real call sites in 1 file**, and the route collects
 * **one guard object per request**. Fourth module in a row where the plan's
 * number survived re-measurement.
 *
 * | Route file | Write verbs | Guard objects | Unguarded write verbs |
 * |---|---|---|---|
 * | `organization-branding/route.ts` | PUT | 1 | 0 |
 * | **Total** | **1 write verb** | **1** | **0** |
 *
 * So the retired figure is **2 calls → 1 guard object**, and the repo-wide
 * count drops **2** (110 → 108).
 *
 * **`directory` has almost no `D2-gap` — and that was measured, not assumed.**
 * The `auth` lesson is that a small `D2-wide` number can sit on a large
 * `D2-gap`, so every write verb in the module was walked and its guard named:
 *
 * | Route file | Write verbs | How it is guarded |
 * |---|---|---|
 * | `organization-branding/route.ts` | PUT | **this wrapper** (was the deprecated pair) |
 * | `organizations/route.ts` | POST, PUT, DELETE | `makeCrudRoute` → `collectAndRunGuards()` (registry) |
 * | `tenants/route.ts` | POST, PUT, DELETE | `makeCrudRoute` → `collectAndRunGuards()` (registry) |
 * | `organization-edges/route.ts` | POST, PATCH, DELETE | **no mutation guard** — see below |
 *
 * `organization-switcher/route.ts` exports **GET only** (checked, not assumed),
 * so it is not a write route at all. The two files under `get/` (`organizations`
 * and `tenants` lookup) are GET only. **No file in this module exports a write
 * verb that nothing checks except `organization-edges/route.ts`** — that is this
 * module's entire `D2-gap`: **3 unguarded write verbs in 1 file.**
 *
 * **Why `organization-edges` is nevertheless the best-protected route in the
 * module, and why calling it `D2-gap` needs the caveat.** It does not call the
 * mutation guard, but it is not unprotected — it is protected by *other*
 * controls, and a reader who saw only "unguarded" would draw the wrong
 * conclusion:
 *
 * - `metadata` gates every verb on the `directory.organizations.manage`
 *   feature, so only an actor holding that feature reaches the handler at all;
 * - `resolveScope()` refuses any request without a verified tenant (401);
 * - `assertOrganizationsInTenant()` (POST) is "the tenant boundary for this
 *   table" — it verifies both endpoint organizations live in the caller's
 *   tenant, and the comment there explains that a cross-tenant edge would be
 *   silently useless rather than dangerous;
 * - POST additionally rejects a self-edge and an edge that would invert the
 *   tree, and every verb writes a `writeDirectWriteAuditLog()` row;
 * - PATCH calls `enforceCommandOptimisticLockWithGuards` — the async
 *   record-locks seam — whose **first step** is the unconditional OSS
 *   optimistic-lock floor (`optimistic-lock-command.ts:351-352`), so a stale
 *   overwrite is refused. (Named here **without** call parentheses on purpose:
 *   `optimistic-lock-command-coverage.test.ts` regexes raw file text for the
 *   synchronous helper's name followed by an open paren, and does not strip
 *   comments — so writing the call syntax in prose makes this wrapper look like
 *   a direct call site that bypasses the record_locks seam. This wrapper never
 *   calls it.)
 *
 * **One naming trap recorded so a later reader does not repeat it:**
 * `enforceCommandOptimisticLockWithGuards` does **not** run mutation guards.
 * Its `...WithGuards` suffix refers to the *command optimistic-lock* guard
 * service (`resolveCommandOptimisticLockGuardService`), a different mechanism
 * from this one. A `grep -i guard` would show `organization-edges` as
 * "guarded"; it is not mutation-guarded. **The gap is real and is recorded as a
 * backlog item, not fixed here** — this commit's scope is `D2-wide` only, and
 * enlarging it silently is exactly the blind sweep the plan forbids.
 *
 * **A caution about this particular call site, stated because it is
 * load-bearing.** On this route the mutation guard is **not** the main thing
 * stopping a housekeeping write. Before it, the route already: resolves the
 * caller's single selected organization and tenant (400 if ambiguous), loads
 * the organization row **scoped to that tenant and organization**
 * (`findOneWithDecryption(..., {tenant, id}, ..., {tenantId, organizationId})`,
 * 404 if absent), and refuses a stale overwrite via the synchronous OSS
 * `enforceCommandOptimisticLock` helper. The guard here is a narrow extra check
 * (`resourceKind: 'directory.organization'`, `operation: 'update'`), and
 * **`directory` ships no `guards.ts`**, so before this migration the deprecated
 * pair's only real content was the bridged legacy service. The migration is
 * still correct and still necessary — it removes the **bypass** and means the
 * first guard this module ever ships is **enforced** rather than silently
 * skipped — but the security argument rests on that, **not** on the route being
 * unprotected today. Saying so prevents a later reader from over-reading the
 * change.
 *
 * **The guard context this route carries.** The legacy call passed
 * `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()`
 * derives both from the `req` it is handed (`route-mutation-guard.ts:143-144`)
 * and forwards `req.method` / `req.headers` to every guard, so the wrapper
 * passes `req` and the observable guard input is **equivalent**. The legacy
 * call also keyed the guard on the *organization* (resourceKind
 * 'directory.organization', resourceId = the organization id); that is preserved
 * exactly, so any guard added later sees the same subject it would have seen.
 *
 * Same wrapper shape as the eleven migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`data_sync/api/mutation-guard.ts`, `c6c3151`), `dictionaries`
 * (`dictionaries/api/mutation-guard.ts`, `43e4e5d`), `dashboards`
 * (`dashboards/api/mutation-guard.ts`, `a05ea2c`), `workflows`
 * (`workflows/api/mutation-guard.ts`, `d3af1b1`), `inbox_ops`
 * (`inbox_ops/api/mutation-guard.ts`, `d89b8f6`), `perspectives`
 * (`perspectives/api/mutation-guard.ts`, `e26642c`), `translations`
 * (`translations/api/mutation-guard.ts`, `a2f8d5f`), `planner`
 * (`planner/api/mutation-guard.ts`, `641d3af`), `query_index`
 * (`query_index/api/mutation-guard.ts`, `cc5a237`) and `auth`
 * (`auth/api/mutation-guard.ts`, `aeeaad0`).
 */
export async function beginDirectoryMutationGuard(
  ctx: DirectoryMutationGuardContext,
): Promise<DirectoryMutationGuardHandle> {
  const tenantId = ctx.tenantId
  const userId = ctx.userId
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative: resolveCurrentOrganization() returns a
    // 401 before reaching here when auth.sub is absent. This mirrors the legacy
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
