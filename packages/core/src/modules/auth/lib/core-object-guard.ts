/**
 * SD-2 / S9 — the core-object delete guard for roles.
 *
 * **What this is.** The roles-and-permissions manager ships by default and **no
 * actor may delete it** (`SPECIFICATIONS-DICTIONARY.md` §C.3 / S9). The shared
 * registry (`@open-mercato/shared/lib/core-boundary/core-objects`) says *which*
 * role that is; this is where the rule is **enforced** on the delete path that
 * actually exists (`auth/api/roles/route.ts`).
 *
 * **Why this is a route precondition, not a `MutationGuard`.** A mutation guard is
 * **actor-scoped** by design — the route mutation guard carries a bare `userId`
 * (`shared/lib/crud/route-mutation-guard.ts:28-39`) and each guard decides *whether
 * this actor may do this write*. S9 is the opposite shape: it is **object-level and
 * actor-independent** — *nobody* may delete a core role, a superadmin included. A
 * rule that applies to every actor sits **above** the actor layer, so folding it
 * into a guard would weaken it (a guard could be disabled, re-prioritised or
 * bypassed per actor). Stated here so a later reader does not "fix" it into a
 * guard.
 *
 * **What it does NOT do.** It does not decide *who* may delete a non-core role —
 * that stays with the existing actor checks (`assertCanModifySuperAdminRole`,
 * `enforceRoleTenantAccess`) and RBAC (`auth.roles.manage`). It refuses one thing:
 * deleting a **core** role, by anyone.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` §C.3 / S9; `CORE-BOUNDARY.md` §2, §5;
 * `library/development/PLAN-SD-2.md`.
 */

import type { EntityManager, FilterQuery } from '@mikro-orm/postgresql'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { coreObjectRefusal } from '@open-mercato/shared/lib/core-boundary/core-objects'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { Role } from '@open-mercato/core/modules/auth/data/entities'

/**
 * The status a refused core-delete returns.
 *
 * **409, not 400.** The request is well-formed — there is nothing wrong with the
 * payload — it *conflicts with a platform invariant*. `409 Conflict` says
 * "understood, refused, nothing changed"; `400` would claim the caller sent
 * something malformed, which is false and would send a UI down the wrong branch.
 */
export const CORE_OBJECT_DELETE_STATUS = 409

/**
 * The **row-level** core-role refusal — a pure function of an already-loaded
 * role row. Returns the `CrudHttpError` to throw, or `null` to allow.
 *
 * This is the single definition of the rule; both enforcement sites delegate to
 * it, so the shared registry is the only thing that ever decides *which* role is
 * core. Kept separate from `assertCoreRoleNotDeletable` so it can be passed as the
 * `refuse` predicate to `deleteOrmEntity` — see that option's note on why an
 * object-level rule cannot live only in a route.
 */
export function refuseCoreRoleDelete(role: { name?: string | null } | null | undefined): CrudHttpError | null {
  const refusal = coreObjectRefusal('role', role?.name ?? '')
  if (!refusal) return null
  return new CrudHttpError(CORE_OBJECT_DELETE_STATUS, {
    error: refusal.reason,
    because: refusal.because,
  })
}

/**
 * Refuse to delete a core role, for **any** actor.
 *
 * Loads the role (tenant-scoped, `deletedAt: null`) and asks the shared registry.
 * Throws a `CrudHttpError(409)` when the role is core — so a route that lets this
 * propagate returns the refusal with the reason attached, and nothing is written.
 *
 * **A missing role is not this function's refusal.** If the row is not found the
 * caller's own 404 path owns that (the guard returns `null` — "not a core-delete
 * refusal"), so the two are never conflated.
 *
 * @param em        the request-scoped EntityManager
 * @param auth      the actor's auth context (its tenant is where the role is matched)
 * @param roleId    the role id the delete targets
 */
export async function assertCoreRoleNotDeletable(
  em: EntityManager,
  auth: { tenantId?: string | null },
  roleId: string,
): Promise<void> {
  const role = await findOneWithDecryption(
    em,
    Role,
    { id: roleId, deletedAt: null } as FilterQuery<Role>,
    {},
    { tenantId: auth.tenantId ?? null, organizationId: null },
  )
  if (!role) return
  const refusal = refuseCoreRoleDelete(role as { name?: string | null })
  if (refusal) throw refusal
}
