import type { EntityManager } from '@mikro-orm/postgresql'
import { Tenant } from '@open-mercato/core/modules/directory/data/entities'

/**
 * `CC-135` — **designating the foundational tenant**, which is how a platform administrator comes to
 * exist at all.
 *
 * Read `PLAN-CC-135-ceiling-route.md` §3.1 first. `CC-134` rewrote the cross-tenant read to ask *"is
 * this person a superadmin in the foundational tenant?"* and to answer **false** when no tenant carries
 * `is_foundational`. Measured 2026-10-19: nothing wrote that flag — the column defaults to `false`, the
 * migration adds the one-row partial unique index, and `rbacService` was the only reader. So the
 * fail-closed branch was the only branch that could ever run, and the platform-administrator role was
 * declared, documented, depended on by the ceiling route, and unfillable.
 *
 * **Why this is a lib and not the CLI's body.** Three things have to happen together — clear, set,
 * record — and a fourth after they commit (invalidate the ACL cache). `CC-134` §6 named that fourth
 * thing as a debt with no caller. Keeping all four in one function is what makes "the flag moved" and
 * "the cached answers are stale" impossible to separate by accident, and it makes the rule testable
 * without driving a CLI.
 *
 * **The one-row index is the backstop, not the mechanism.** Clearing first and setting second means a
 * swap does not depend on the flush order to satisfy the constraint; if this function is ever wrong,
 * the database refuses rather than storing two foundations.
 */

/** The audit writer, as this module needs it. A port, for the same reason `CeilingAuditWriter` is. */
export interface FoundationAuditWriter {
  log(input: {
    tenantId: string | null
    actorUserId: string | null
    commandId: string
    actionLabel?: string
    resourceKind?: string
    resourceId?: string
    context?: Record<string, unknown>
  }): Promise<unknown>
}

/** The `commandId` every foundation change is recorded under. One string, so the journal is greppable. */
export const FOUNDATION_CHANGE_COMMAND_ID = 'directory.tenants.set_foundation'

/** A foundation change the caller should report rather than swallow. */
export class FoundationError extends Error {
  override readonly name = 'FoundationError'
}

export interface FoundationChange {
  /** The foundation before this call, or `null` when there was none. At most one, by index. */
  previousTenantId: string | null
  /** The tenants that stopped being foundational. Never includes the new one. */
  clearedTenantIds: string[]
  /** The foundation after this call, or `null` when the designation was cleared. */
  foundationalTenantId: string | null
}

/**
 * Designate `tenantId` as the foundational tenant, or clear the designation with `null`.
 *
 * **An unknown tenant id is refused rather than written.** `tenants.is_foundational` is a real column
 * on a real row, so a mistyped id would simply match nothing and the operator would be told the
 * foundation moved when it did not — the same class of lie as a ceiling row pointing at a tenant that
 * does not exist (`PLAN-CC-135` §4 R4).
 *
 * **The record goes in before the flush that closes the transaction**, so an act that cannot be
 * recorded does not happen. `ActionLogService.log` writes on the caller's `EntityManager`.
 *
 * **The cache invalidation is a required argument, not an option.** A caller that forgets it would
 * leave every cached ACL answer computed against the old foundation — which is precisely the debt
 * `CC-134` §6 recorded. Making it required means the compiler asks the question.
 */
export async function designateFoundationalTenant(
  em: EntityManager,
  options: {
    /** The tenant to designate, or `null` to clear the designation entirely. */
    tenantId: string | null
    audit: FoundationAuditWriter
    /** `rbacService.invalidateAllCache` — `CC-134` §6's lever, and this is its only caller. */
    invalidateAclCache: () => Promise<void>
    now?: Date
  },
): Promise<FoundationChange> {
  const now = options.now ?? new Date()
  const target = options.tenantId

  if (target) {
    const exists = await em.findOne(Tenant, { id: target } as never)
    if (!exists) throw new FoundationError(`No tenant with id ${target}.`)
  }

  const change = await em.transactional(async (tx) => {
    const previous = await tx.find(Tenant, { isFoundational: true } as never)
    const previousIds = previous.map((row) => String((row as never as { id: unknown }).id))
    // At most one, by the partial unique index — so the first is the answer, and `?? null` is not a
    // guess between several.
    const previousTenantId = previousIds[0] ?? null
    const clearedTenantIds = previousIds.filter((id) => id !== target)

    // Clear first, then set. A swap therefore never depends on the flush order to satisfy the index.
    for (const row of previous) {
      if (target && String((row as never as { id: unknown }).id) === target) continue
      ;(row as never as { isFoundational: boolean }).isFoundational = false
      ;(row as never as { updatedAt: Date }).updatedAt = now
      tx.persist(row)
    }
    if (target) {
      const row = await tx.findOne(Tenant, { id: target } as never)
      if (!row) throw new FoundationError(`Tenant ${target} disappeared during the change.`)
      ;(row as never as { isFoundational: boolean }).isFoundational = true
      ;(row as never as { updatedAt: Date }).updatedAt = now
      tx.persist(row)
    }

    // A change to *who acts above every tenant* is recorded, for the same reason a ceiling change is:
    // an act nobody can find later is an act nobody can review. A CLI has no principal, so the record
    // says so rather than inventing one — the same decision `authorityCeiling` makes.
    await options.audit.log({
      // The target tenant's journal when there is one; the platform scope (`null`) when clearing.
      tenantId: target,
      actorUserId: null,
      commandId: FOUNDATION_CHANGE_COMMAND_ID,
      actionLabel: target ? 'Foundational tenant designated' : 'Foundational tenant cleared',
      resourceKind: 'directory.tenant',
      resourceId: target ?? 'platform',
      context: { previousFoundationalTenantId: previousTenantId, clearedTenantIds },
    })

    await tx.flush()
    return { previousTenantId, clearedTenantIds, foundationalTenantId: target }
  })

  // After the rows commit, and unconditionally: the answer is a property of the user, so every cached
  // answer was computed against the old foundation. Clearing an already-clean cache is free.
  await options.invalidateAclCache()

  return change
}
