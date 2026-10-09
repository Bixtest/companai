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
import { coreObjectRefusal, coreObjectRenameRefusal } from '@open-mercato/shared/lib/core-boundary/core-objects'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { Role } from '@open-mercato/core/modules/auth/data/entities'

/**
 * The shape of a role row this guard reads.
 *
 * `isCore` is the durable marker (`roles.is_core`, `Migration20261009090000`).
 * `name` stays as the pre-migration fallback, so a row created before the column
 * existed — or loaded by a query that did not select it — is still recognised by
 * the name `superadmin`, exactly as before. The union is deliberate: the guard is
 * a pure function of whatever the caller loaded, and says so in its type.
 */
type CoreRoleRow = { name?: string | null; isCore?: boolean | null }

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
 * The status a refused core-role **rename** returns.
 *
 * **409, for the same reason as the delete**: well-formed request, conflicting
 * with a platform invariant. A caller can act on it (surface `because`), unlike a
 * `400` that would claim the payload was malformed.
 */
export const CORE_OBJECT_RENAME_STATUS = 409

/**
 * A **machine-readable** code for each refusal, so a caller (a UI, a test, a CLI)
 * can tell *"cannot be deleted"* from *"cannot be renamed"* without parsing the
 * human `error` sentence. Both refusals are `409`, so the status alone cannot
 * distinguish them; the code can. Kept next to the statuses so the two travel
 * together.
 */
export const CORE_OBJECT_DELETE_CODE = 'core_role_undeletable'
export const CORE_OBJECT_RENAME_CODE = 'core_role_unrenamable'

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
export function refuseCoreRoleDelete(role: CoreRoleRow | null | undefined): CrudHttpError | null {
  const refusal = coreObjectRefusal('role', role?.name ?? '', undefined, { isCore: role?.isCore === true })
  if (!refusal) return null
  return new CrudHttpError(CORE_OBJECT_DELETE_STATUS, {
    error: refusal.reason,
    because: refusal.because,
    code: CORE_OBJECT_DELETE_CODE,
  })
}

/**
 * The **row-level** core-role rename refusal — Option B (owner ruling 2026-10-09).
 *
 * The historical hole this closes: the core role was recognised by its name, and
 * a rename changed the name — so a rename silently disarmed the delete guard.
 * Refusing the rename at its source is the live half of the fix; the durable
 * `is_core` column is the other half (so the role is recognised even if it *was*
 * renamed before this rule existed).
 *
 * **Only an actual rename is refused.** `nextName` is the name the request asks
 * for; when it is absent or folds equal to the current name (case/whitespace), the
 * update touches nothing the rule protects and is allowed — so an idempotent write
 * or a future edit of another field is not blocked by a rule that is about the
 * *identity* of the role, not about editing it. When `nextName` differs, a core
 * role is refused.
 *
 * The owner's intended use is explicit: there is **one** un-renamable core role
 * (the main `superadmin`), and any *additional* superadmins are ordinary roles
 * that can be renamed and then deleted — the core flag, not the name, is what
 * distinguishes them.
 */
export function refuseCoreRoleRename(
  role: CoreRoleRow | null | undefined,
  nextName?: string | null,
): CrudHttpError | null {
  // Not a rename at all → nothing for this rule to say.
  //
  // **An ABSENT name is not a rename.** `nextName === undefined` (or `null`) means
  // the update does not touch the name field — e.g. it edits the tenant or a custom
  // field. That must be ALLOWED even on a core role, or the rule would block every
  // edit of the roles-and-permissions manager rather than just its identity. Only a
  // *supplied* name that folds different from the current one is a rename.
  if (typeof nextName !== 'string') return null
  const current = (role?.name ?? '').trim().toLowerCase()
  const next = nextName.trim().toLowerCase()
  if (!next || next === current) return null
  const refusal = coreObjectRenameRefusal('role', role?.name ?? '', undefined, { isCore: role?.isCore === true })
  if (!refusal) return null
  return new CrudHttpError(CORE_OBJECT_RENAME_STATUS, {
    error: refusal.reason,
    because: refusal.because,
    code: CORE_OBJECT_RENAME_CODE,
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
  const refusal = refuseCoreRoleDelete(role as CoreRoleRow)
  if (refusal) throw refusal
}

/**
 * Refuse to **rename** a core role, for any actor — Option B.
 *
 * Loads the role (tenant-scoped, `deletedAt: null`) and asks the same registry
 * the delete guard uses. Throws `CrudHttpError(409)` when the role is core.
 *
 * This is the half of CC-31(a) that removes the live exposure: without it, a
 * rename of `superadmin` would make the name-based rule stop matching, and the
 * subsequent delete would then be allowed. With the `is_core` column as well, the
 * role is recognised even if it was renamed before this rule existed.
 */
export async function assertCoreRoleNotRenamable(
  em: EntityManager,
  auth: { tenantId?: string | null },
  roleId: string,
  nextName?: string | null,
): Promise<void> {
  const role = await findOneWithDecryption(
    em,
    Role,
    { id: roleId, deletedAt: null } as FilterQuery<Role>,
    {},
    { tenantId: auth.tenantId ?? null, organizationId: null },
  )
  if (!role) return
  const refusal = refuseCoreRoleRename(role as CoreRoleRow, nextName)
  if (refusal) throw refusal
}
