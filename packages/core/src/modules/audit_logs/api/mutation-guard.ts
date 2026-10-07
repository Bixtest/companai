import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type AuditLogsMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the route's resolved auth context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to (may be null: tenant-level rows carry none). */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /**
   * The resource kind the guard set is evaluated against. For undo/redo this is
   * the log entry's own `resourceKind` (e.g. `directory.organization`), because
   * the operation being guarded is the *reversal or replay of a write to that
   * resource* — not a write to the log table itself.
   */
  resourceKind: string
  resourceId: string
  operation: 'create' | 'update' | 'delete' | 'custom'
  mutationPayload?: Record<string, unknown> | null
}

type AuditLogsMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /** Runs every registry guard's `afterSuccess` callback. Call only after the write commits. */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `audit_logs` write routes.
 *
 * **D2-gap (2026-10-06).** Both of this module's write routes — `actions/undo`
 * and `actions/redo`, POST each — called **no mutation guard at all**: not this
 * module's wrapper (none existed), not `runRouteMutationGuards()`, not the
 * `@deprecated` pair D2-wide retired, and they are not built by
 * `makeCrudRoute`. So a guard set shipped for `audit_logs` would have been
 * **silently skipped**, and a Hermes-authorized undo would have reached the
 * command bus with nothing checking it.
 *
 * **Why `audit_logs` was picked first out of the 160 unguarded verbs.** Undo
 * and redo **replay a registered command** — they are the most
 * privilege-sensitive write on the platform, and the routes already carry a
 * dense hand-written authorization story (feature requirements,
 * actor-vs-tenant undo rights, fail-closed tenant scope, org-scope
 * resolution, "only the latest undoable row" re-lookup; issues #2398, #2685).
 * None of that is replaced here. What was missing is the **registry
 * chokepoint**: today a future guard for this module cannot run, and the
 * structural grammar (SD-4) never sees these writes. This wrapper is that
 * joint.
 *
 * | Route file | Write verbs | Guard objects | Unguarded verbs before | after |
 * |---|---|---|---|---|
 * | `audit-logs/actions/undo/route.ts` | POST | 1 | 1 | 0 |
 * | `audit-logs/actions/redo/route.ts` | POST | 1 | 1 | 0 |
 * | **Total** | **2 write verbs** | **2** | **2** | **0** |
 *
 * **`resourceKind` — the one design decision.** The wrapper takes the **log
 * entry's own `resourceKind`** where the row carries one, falling back to
 * `audit_logs.action_log` for a row that names no resource. The reason: what is
 * being guarded is the reversal/replay of a write to *that* resource, so a
 * guard registered against, say, `directory.organization` must see the undo of
 * an organization write — otherwise the one path that can **reverse** a
 * protected change would be the one path no guard describes. A row with no
 * `resourceKind` (the log table's own null) is guarded as the log itself.
 *
 * **Why the fallback is a real choice and not a nicety.** Guard sets are keyed
 * by `targetEntity`; evaluating an undo against the wrong one would either
 * fire guards that have no business seeing this write, or (worse) silently
 * match none and look guarded while doing nothing. The value used is therefore
 * derived from the row, never guessed, and the route passes it explicitly.
 *
 * **What this wrapper does NOT do.** It does not re-implement the routes' own
 * checks, and it does not decide *whether* the caller may undo — that is
 * `audit_logs.undo_self` / `undo_tenant` plus the scope logic already in the
 * route. It runs the registry guard set and reports a block if one refuses.
 * Guards are **additional** policy, not a replacement for the route's own.
 *
 * Same wrapper shape as the thirteen migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`c6c3151`), `dictionaries` (`43e4e5d`), `dashboards` (`a05ea2c`),
 * `workflows` (`d3af1b1`), `inbox_ops` (`d89b8f6`), `perspectives`
 * (`e26642c`), `translations` (`a2f8d5f`), `planner` (`641d3af`),
 * `query_index` (`cc5a237`), `auth` (`aeeaad0`), `directory` (`d682c09`) and
 * `feature_toggles` (`5af76bc`).
 */
export async function beginAuditLogsMutationGuard(
  ctx: AuditLogsMutationGuardContext,
): Promise<AuditLogsMutationGuardHandle> {
  const { tenantId, userId } = ctx
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative and returns before reaching here when the
    // actor is missing; this mirrors the legacy service's behaviour on
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
    runAfterSuccess: async () => {
      await guardResult.runAfterSuccess()
    },
  }
}
