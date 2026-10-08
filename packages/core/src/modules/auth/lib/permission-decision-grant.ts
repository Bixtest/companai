/**
 * Applying a structure-change permission decision (SD-1 / S2) — the write half.
 *
 * **Why this file exists.** The structure-change gate
 * (`@open-mercato/shared/lib/permissions/structure-change-gate`) is a *pure*
 * decision: it says `defaulted` and hands back the records to grant, but it
 * deliberately writes nothing. Without a write the gate is a decision, not an
 * enforcement — a new table could land with its permissions "decided" and
 * nothing in the ACL to show for it. This is the write: it takes the gate's
 * `defaulted` outcome and applies it to the tenant's grant role through the
 * **existing** roles-and-permissions store (`role_acls.features_json`), which is
 * the one engine the platform already uses (S5 — never a second scheme).
 *
 * **What it writes, and what it deliberately does not.**
 *   - It writes **records** — feature ids — into the role's `featuresJson`.
 *   - It **never sets `isSuperAdmin` to `true`**, and **never changes an existing
 *     ACL's `isSuperAdmin`**. Conferring superadmin is a *provisioning* decision
 *     (setup's, `ensureDefaultRoleAcls`), not a permission-record grant; a grant
 *     that silently made a role a superadmin would be a privilege-escalation
 *     smell. The default grant means *"give the superadmin role these records"*,
 *     not *"make this role a superadmin"*. (When this call creates a **fresh** row
 *     it leaves the flag at the entity default, `false` — it does not read the
 *     flag from anywhere, so it cannot confer it.)
 *   - It **never** touches `organizationsJson`.
 *
 * **Idempotent by construction.** The merge is a set-union, so running the grant
 * twice adds nothing the second time. That is what makes it safe to run on every
 * create, and what makes a retry harmless.
 *
 * **Concurrency, stated honestly.** The merge is a read-modify-write with no lock,
 * so two grants that interleave *exactly* (both read the same list, then both
 * write) can lose one of the two additions. The window is the moment between the
 * `findOne` and the `flush`, and it needs two structure changes in flight at once
 * for the same tenant. It is **named, not hidden**: the ACL edit route guards the
 * same shape with an optimistic lock (`enforceCommandOptimisticLockWithGuards`,
 * `roles/acl/route.ts`), which needs a client-supplied version this post-commit
 * hook does not have. The fix (an atomic `||`-merge at the database, or an
 * optimistic retry) is scheduled in `PLAN-SD-1.md` §10 and
 * `COMPLETION-CALLBACKS.md` (CC-1).
 *
 * **Fail closed, and say why.** A grant that cannot be applied returns
 * `applied: false` with a machine-readable `reason` and a plain-language
 * `because` — it never throws for "the role is not there", because that is a
 * *fact to report*, not a crash. (A genuine database error is left to throw; the
 * caller owns the retry.)
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` S2 + §C.1; `PLAN-SD-1.md` §5.4, §10.1.
 */

import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { Role, RoleAcl } from '@open-mercato/core/modules/auth/data/entities'

/** Why a grant could not be applied. A closed set, so a caller can switch on it. */
export const PERMISSION_GRANT_FAILURES = ['role_not_found', 'no_records'] as const
export type PermissionGrantFailureReason = (typeof PERMISSION_GRANT_FAILURES)[number]

export type PermissionGrantOutcome =
  | {
      applied: true
      /** The role the records were granted to (its name). */
      roleName: string
      /** The role's id, for the audit line. */
      roleId: string
      /** True when the ACL row was created by this call, false when it existed. */
      aclCreated: boolean
      /** The records this call added (empty when they were all already present). */
      added: string[]
      /** The records that were already on the role (the idempotent half). */
      alreadyPresent: string[]
    }
  | {
      applied: false
      roleName: string
      reason: PermissionGrantFailureReason
      /** Plain language, for the person who has to fix it. Never empty. */
      because: string
    }

/**
 * Resolve the role a default grant targets, by **name** within a tenant.
 *
 * The gate's `DEFAULT_GRANT_ROLE` is the role *named* `superadmin` (the same role
 * `setup-app.ts` seeds and `roles/route.ts` filters on), not a role id — so the
 * lookup is by name and tenant, exactly as `findRoleByName` does it.
 */
export async function resolveGrantRole(
  em: EntityManager,
  tenantId: string,
  roleName: string,
): Promise<Role | null> {
  return findOneWithDecryption(
    em,
    Role,
    { name: roleName, tenantId } as never,
    {},
    { tenantId, organizationId: null },
  )
}

/**
 * Apply a permission decision to the tenant's grant role.
 *
 * The records are merged into the role's `featuresJson` (idempotent set-union).
 * When the role has no ACL row yet, one is created holding exactly the records —
 * and nothing else.
 */
export async function applyPermissionDecisionGrant(
  em: EntityManager,
  input: { tenantId: string; grantTo: string; records: readonly string[] },
): Promise<PermissionGrantOutcome> {
  const { tenantId, grantTo } = input

  // Normalise: drop blanks, dedupe. A grant of nothing is a defect, not a no-op.
  const unique = Array.from(
    new Set(
      (input.records ?? [])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  )

  if (unique.length === 0) {
    return {
      applied: false,
      roleName: grantTo,
      reason: 'no_records',
      because:
        'The decision carried no permission records, so there is nothing to grant. ' +
        'A grant that grants nothing is refused rather than recorded as a success.',
    }
  }

  const role = await resolveGrantRole(em, tenantId, grantTo)
  if (!role) {
    return {
      applied: false,
      roleName: grantTo,
      reason: 'role_not_found',
      because:
        `The tenant has no role named "${grantTo}" to grant the new surface's permissions to. ` +
        'The default grant cannot be applied, so the new structure would land without permissions.',
    }
  }

  const roleId = String(role.id)
  const existing = await findOneWithDecryption(
    em,
    RoleAcl,
    { role, tenantId } as never,
    {},
    { tenantId, organizationId: null },
  )

  if (!existing) {
    const acl = em.create(RoleAcl, {
      role,
      tenantId,
      featuresJson: unique,
      // A fresh row keeps the entity default (`false`). This write adds records; it
      // never confers superadmin. See the file header.
      isSuperAdmin: false,
      createdAt: new Date(),
    })
    await em.persist(acl).flush()
    return { applied: true, roleName: grantTo, roleId, aclCreated: true, added: unique, alreadyPresent: [] }
  }

  const current = Array.isArray(existing.featuresJson) ? existing.featuresJson : []
  const currentSet = new Set(current)
  const added = unique.filter((record) => !currentSet.has(record))
  const alreadyPresent = unique.filter((record) => currentSet.has(record))

  if (added.length > 0) {
    existing.featuresJson = [...current, ...added]
    await em.persist(existing).flush()
  }

  return { applied: true, roleName: grantTo, roleId, aclCreated: false, added, alreadyPresent }
}
