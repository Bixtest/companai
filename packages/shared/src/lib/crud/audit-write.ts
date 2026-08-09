/**
 * Audit for writes that do not go through the command bus.
 *
 * Two write paths exist. Routes declaring `actions.<op>.commandId` are recorded
 * by the command bus. Everything else — the CRUD factory's direct handlers, and
 * the custom routes in `integrations`, `attachments`, `data_sync` and
 * `workflows` — records through this.
 *
 * Extracted from `crud/factory.ts` so custom routes can use the identical
 * contract. Two copies would drift, and the drift would show up as an audit
 * trail that is complete in some modules and not others — the failure this whole
 * repair exists to remove.
 *
 * See workspace/knowledge/audited-writes.md.
 */

import { createLogger } from '../logger'
import { SKIPPED_ACTION_LOG_RESOURCE_KINDS } from '../commands/action-log-skip-list'

const logger = createLogger('shared').child({ component: 'crud-audit' })

/**
 * Minimal shape of the audit service, resolved by DI.
 *
 * Declared structurally rather than imported: `@open-mercato/shared` must not
 * depend on `@open-mercato/core`, where `ActionLogService` lives.
 */
export type ActionLogWriter = {
  log: (input: Record<string, unknown>) => Promise<unknown>
}

/**
 * The verb recorded for a direct write.
 *
 * The first three are the CRUD lifecycle. The rest are **decision verbs**: a
 * human accepting, rejecting or completing something a machine proposed
 * (`inbox_ops`). Recording those as `updated` would technically be true and
 * practically useless — "who approved the AI's order?" is the question this
 * platform exists to answer, and it cannot be answered from a log that says
 * a row was updated.
 *
 * **Adding a verb here means classifying it** in `deriveActionLogActionType`
 * (`packages/core/src/modules/audit_logs/lib/projections.ts`). An unclassified
 * verb falls through to `system`, which reads as "no human did this" — the
 * opposite of what a decision record means.
 */
export type DirectWriteAuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'failed'

/**
 * Records a direct (non-command) CRUD write in the action log.
 *
 * **Why this exists.** `makeCrudRoute` has two write paths. Routes that declare
 * `actions.<op>.commandId` go through the command bus, which writes the audit
 * entry. Routes that supply a plain `create` / `update` / `delete` handler never
 * touched the command bus and so were **not audited at all** — 16 of 25 enabled
 * modules, including `api_keys`, where issuing and revoking a credential went
 * unrecorded (R2a; `workspace/references/upstream-issues.md` → U1).
 *
 * **Deliberately not undoable.** No `undoToken` is written, so these entries are
 * excluded by the "Undoable only" filter and offer no undo control. A command
 * carries a reverse operation; a direct handler does not, and pretending
 * otherwise would put a button in the UI that cannot work. Audit is a record of
 * what happened; undo is a separate capability.
 *
 * **Fail-closed (R2b-factory).** Called from inside the transaction that performs
 * the business write, so a failed audit write rolls that write back rather than
 * leaving a change nobody can account for.
 *
 * Two failures, treated differently — the same distinction the command bus makes:
 *
 *   - the service being **absent** is legitimate. A downstream app may disable
 *     the `audit_logs` module, and writes must still work. Tolerated silently.
 *   - the **write failing** is not. It propagates, and the caller's transaction
 *     rolls back.
 *
 * This must stay inside a transaction. Called after a commit it would report a
 * failure for a change that already happened, which is worse than swallowing —
 * the caller would be actively misinformed.
 *
 * **And the transaction must be opened on the container's EntityManager.** The
 * audit service is `.scoped()` and holds `container.resolve('em')`, which is
 * created with `useContext: true` and therefore joins whatever transaction is
 * active in the async context. A plain `em.fork()` is created with
 * `useContext: false` (MikroORM's default), so a transaction opened on a fork
 * never reaches this write: the business change would roll back and the audit
 * row would survive it. Open the transaction on the container's EM.
 */
export async function writeDirectWriteAuditLog(options: {
  container: { resolve: (name: string) => unknown }
  auth: { sub?: string | null; tenantId?: string | null; orgId?: string | null } | null | undefined
  organizationId: string | null
  action: DirectWriteAuditAction
  resourceKind: string | null
  resourceId: string | null
  snapshotBefore?: Record<string, unknown> | undefined
  snapshotAfter?: Record<string, unknown> | undefined
  /**
   * Extra context merged over the default. Use it for facts about the write's
   * origin that the resource kind alone does not carry — above all
   * `proposedBy: 'ai'`, which is what separates a change a person decided on
   * from one a machine suggested and a person approved.
   */
  context?: Record<string, unknown> | undefined
}): Promise<void> {
  if (!options.resourceKind) return
  if (SKIPPED_ACTION_LOG_RESOURCE_KINDS.has(options.resourceKind)) return

  let service: ActionLogWriter | null = null
  try {
    service = options.container.resolve('actionLogService') as ActionLogWriter
  } catch {
    // The audit_logs module can legitimately be absent (a downstream app may
    // disable it). Coverage is best-effort against an optional peer, exactly as
    // the command bus treats it.
    service = null
  }
  if (!service || typeof service.log !== 'function') return

  // Deliberately not wrapped in try/catch: a failed write must reach the
  // enclosing transaction so the business change rolls back with it.
  await service.log({
    commandId: `${options.resourceKind}.${options.action}`,
    actionLabel: `${options.resourceKind}.${options.action}`,
    resourceKind: options.resourceKind,
    ...(options.resourceId ? { resourceId: options.resourceId } : {}),
    tenantId: options.auth?.tenantId ?? undefined,
    organizationId: options.organizationId ?? options.auth?.orgId ?? undefined,
    actorUserId: options.auth?.sub ?? undefined,
    ...(options.snapshotBefore ? { snapshotBefore: options.snapshotBefore } : {}),
    ...(options.snapshotAfter ? { snapshotAfter: options.snapshotAfter } : {}),
    context: { source: 'crud-route', undoable: false, ...(options.context ?? {}) },
  })
}
