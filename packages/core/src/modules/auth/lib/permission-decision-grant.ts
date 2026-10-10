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
 * **Concurrency — the whole write is atomic (CC-16 2026-10-08, CC-23 2026-10-09).** The
 * merge into `role_acls.features_json` is a **single SQL statement** — an
 * `INSERT … ON CONFLICT (role_id, tenant_id) DO UPDATE` — so two grants that
 * interleave can no longer lose one of the additions *or* create a second ACL
 * row: there is no read-modify-write window between a `findOne` and a `flush` to
 * interleave in. The conflict target is the unique index added by
 * `Migration20261009220000`, which makes *"one ACL row per role per tenant"* a
 * fact the database enforces. This file used to merge in memory
 * (`[...current, ...added]`) and then, after CC-16, to upsert only the
 * already-existing case; **CC-23 closed the remaining create-branch race** — two
 * grants racing on a *missing* row — by routing both branches through the one
 * statement.
 *
 * **Transaction context differs by caller, and the fix holds in all of them.** The
 * atomic upsert takes the necessary row (or unique-index) lock in whatever context
 * it runs, so it is correct whether or not an ambient transaction exists:
 *   - the field/entity **guards** (`entities/data/guards.ts`) and the **batch**
 *     route run the grant **after commit** — no ambient transaction, and a single
 *     statement needs none;
 *   - the **custom-entity install** primitive (`entities/lib/register.ts`) calls
 *     this **inside** its `em.transactional(...)` — so the upsert runs in that
 *     transaction. That is still atomic (the lock is held to commit) and is
 *     strictly *stronger* for concurrency; it just means "after commit" is not
 *     universally true and is not claimed as such here.
 *
 * **`aclCreated` is read from the database, not guessed.** The `returning` clause
 * carries `(xmax = 0) as inserted` — Postgres/xmax is `0` only on a genuinely
 * inserted row and non-zero on a row the conflict path updated — so the outcome
 * reports whether *this* call created the row without a second query.
 *
 * **A pre-existing duplicate is a loud failure, not silent data loss.** The unique
 * index is created by `Migration20261009220000`; on a database that already
 * carries two `role_acls` rows for one `(role_id, tenant_id)` — reachable only
 * through the very race this closes — `create unique index` fails and the
 * migration stops. That is deliberate: choosing which of two ACLs to keep is a
 * data decision, and this migration does not make it silently. (Measured: the
 * live host has **0** such duplicates, so it applies cleanly.)
 *
 * **What `added` does and does not claim under a race (honest limit).** `added` is
 * "the requested records that were **not** in the role's ACL as this statement
 * read it" — computed in the same statement, from the pre-merge value. Another
 * transaction that commits *between* this statement's snapshot and its lock can
 * land a record that this call also requested; the union keeps both (no lost
 * update), but *this* call's `added` will not list the other writer's record.
 * So `added` is a per-call report of what *this* call contributed against the
 * value it saw — **not** a diff against the final row. The union (`features_json`,
 * returned too) is the authoritative post-state; an audit line that needs the
 * final set must read the row, not sum `added`. This is the same honesty the
 * logging callers already have (they log `added.length`, not "the role now has").
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
import { forbidden } from '@open-mercato/shared/lib/crud/errors'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import type { StructureChangeGateOutcome } from '@open-mercato/shared/lib/permissions/structure-change-gate'
import { Role } from '@open-mercato/core/modules/auth/data/entities'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { assertActorCanGrantAcl, assertActorCanGrantRoles } from './grantChecks'

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

  // **The whole write is ONE statement (CC-16 + CC-23).** A first grant onto a
  // role with no ACL row and a later grant onto an existing row are the *same*
  // question — "merge these records into the role's ACL, idempotently" — so they
  // go through the *same* atomic upsert:
  //
  //   - `on conflict (role_id, tenant_id)` targets the unique index added by
  //     `Migration20261009220000` (CC-23). Two grants racing on a **missing** row
  //     can no longer both insert: the database admits exactly one, and the loser
  //     takes the `do update` path. That is the create-branch race CC-16 left
  //     open, closed by the index rather than by an application lock.
  //   - `do update` is the same `jsonb ||`-into-`group by elem` union CC-16 uses
  //     for the existing-row case, so the merge is atomic whichever branch the
  //     database takes — there is no read-modify-write window at all now.
  //   - `xmax = 0` distinguishes the two branches for the caller: Postgres sets
  //     `xmax = 0` on a genuinely-inserted row and a non-zero `xmax` on a row the
  //     conflict path updated. That is what preserves the `aclCreated` contract
  //     (and it is read from the database, not guessed).
  //   - The `do update` never touches `is_super_admin`, so the create-vs-update
  //     distinction the file header pledges (a grant never confers superadmin,
  //     never clears an existing flag) holds on both branches: a fresh row keeps
  //     the column default (`false`), an existing row keeps whatever it had.
  //
  // **`added` / `alreadyPresent` are computed in SQL, from the PRE-merge value.**
  // A `RETURNING` clause cannot see the pre-update value of the row it just wrote
  // (Postgres gives the *new* value; `OLD` is not available in `ON CONFLICT …
  // RETURNING`), so the pre-value is read once in a CTE and used both to build the
  // union and to classify the request:
  //   - `pre.before` is the row's `features_json` as it stood before this statement
  //     (`[]` when there is no row yet). Because it is read inside the **same
  //     statement** whose upsert takes the row/unique-index lock, it cannot race
  //     with the write it annotates — this is a *reporting* read, not the
  //     read-modify-write window CC-16/CC-23 closed;
  //   - `added` is the requested records **not** in `pre.before`; `alreadyPresent`
  //     is the requested records **in** it. So the caller's contract is exact:
  //     `added` = what this call landed, `alreadyPresent` = what was already there.
  // The union itself keeps CC-16's first-occurrence-order dedupe, so the result is
  // byte-identical to `[...current, ...added]` and the merge stays idempotent.
  const rows = (await em.getConnection().execute(
    `with pre as (
        select coalesce(a.features_json, '[]'::jsonb) as before
          from (select 1) as anchor
          left join role_acls a on a.role_id = ? and a.tenant_id = ?
         limit 1
      ),
      upsert as (
        insert into role_acls (role_id, tenant_id, features_json, is_super_admin, created_at)
        values (?, ?, ?::jsonb, false, now())
        on conflict (role_id, tenant_id) do update
          set features_json = (
                select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
                  from (
                    select elem, min(ord) as ord
                      from jsonb_array_elements_text(
                             coalesce(role_acls.features_json, '[]'::jsonb) || excluded.features_json
                           ) with ordinality as t(elem, ord)
                     group by elem
                  ) deduped
              ),
              updated_at = now()
        returning features_json, (xmax = 0) as inserted
      ),
      requested as (
        select elem, min(ord) as ord
          from jsonb_array_elements_text(?::jsonb) with ordinality as t(elem, ord)
         group by elem
      )
      select
        u.features_json,
        coalesce(u.inserted, false) as inserted,
        (select coalesce(jsonb_agg(r.elem order by r.ord), '[]'::jsonb)
           from requested r
          where not (coalesce(p.before, '[]'::jsonb) @> to_jsonb(r.elem))) as newly_added,
        (select coalesce(jsonb_agg(r.elem order by r.ord), '[]'::jsonb)
           from requested r
          where coalesce(p.before, '[]'::jsonb) @> to_jsonb(r.elem)) as already_present
        from upsert u
        left join pre p on true`,
    [roleId, tenantId, roleId, tenantId, JSON.stringify(unique), JSON.stringify(unique)],
  )) as Array<{
    features_json?: unknown
    inserted?: boolean
    newly_added?: unknown
    already_present?: unknown
  }>

  const first = rows?.[0]
  const inserted = first?.inserted === true
  const requestedSet = new Set(unique)
  const asStrings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

  // The SQL is authoritative. The fallbacks cover only a connection that returns no
  // annotation (a mocked driver in a unit test); they are derived from `unique` so
  // the contract still holds — `added` ⊆ requested, `added` and `alreadyPresent`
  // disjoint.
  const added = first?.newly_added === undefined ? (inserted ? unique : []) : asStrings(first.newly_added)
  const alreadyPresent =
    first?.already_present === undefined ? [] : asStrings(first.already_present)

  return {
    applied: true,
    roleName: grantTo,
    roleId,
    aclCreated: inserted,
    added: added.filter((record) => requestedSet.has(record)),
    alreadyPresent: alreadyPresent.filter((record) => requestedSet.has(record)),
  }
}

/**
 * Apply a structure-change gate **outcome** to the grant role.
 *
 * This is the one mapping from the gate's vocabulary to the write, shared by every
 * caller so the two can never drift:
 *
 *   - the field/entity guards in `entities/data/guards.ts`, whose `afterSuccess`
 *     reads the outcome out of the guard's `metadata` (the validate-time decision
 *     carried forward); and
 *   - the batch definitions route (`entities/api/definitions.batch.ts`), which runs
 *     the gate itself because the new columns it creates are knowable only inside its
 *     transaction — the registry sees that route as an `'update'` and its payload
 *     carries no field list (`COMPLETION-CALLBACKS.md` CC-2).
 *
 * **Both a `defaulted` and a `decided` outcome are written (CC-17).** The two are
 * the same *kind* of thing — records that must land on a role — and differ only in
 * **who chose the role**: a rule chose the default (`DEFAULT_GRANT_ROLE`), a person
 * chose theirs (the decision's `grantTo`). Both therefore go through the one write
 * below, so the two can never drift into "the rule is enforced, a person's decision
 * is not". A `refused` outcome never lands a surface to grant, so it is the only
 * one that returns `null` — "nothing to write" is a fact to report, not a silent
 * success.
 *
 * (Before CC-17 the `decided` branch returned `null` deliberately: the decision
 * type carried no grant target, so there was genuinely nowhere to put the records.
 * Adding the target to the type is what makes this branch writable.)
 */
export async function applyStructureChangeGrant(
  em: EntityManager,
  input: { tenantId: string; decision: StructureChangeGateOutcome },
): Promise<PermissionGrantOutcome | null> {
  const { decision } = input
  if (decision.outcome === 'refused') return null
  return applyPermissionDecisionGrant(em, {
    tenantId: input.tenantId,
    grantTo: decision.grantTo,
    records: decision.records.map((record) => record.feature),
  })
}

/* ------------------------------------------------------------------ *
 * CC-25 — who may state a decision (the authorisation half)
 * ------------------------------------------------------------------ *
 * The carrier (`shared/lib/permissions/structure-change-decision-header.ts`)
 * reads `decidedBy` and `grantTo` **from the request header** and, until this
 * function arrived, never checked them against the authenticated actor: any
 * caller holding the routes' `entities.definitions.manage` could send a header
 * granting **arbitrary feature strings to an arbitrary existing role**. S2 says
 * *who* the permission records go to must be decided — it never said *who may
 * decide*. This is that missing half.
 *
 * **It is a role permission, not a new mechanism.** The platform's own model is
 * a list of feature strings on a role (`role_acls.features_json`, S5 — one
 * engine); the owner's model (2026-10-08) is the same. So authorising the actor
 * needs no new scheme: it needs one more feature string, checked against the
 * actor's effective ACL, exactly as every other authorisation in the platform is.
 *
 * **Two refusals, and they are different questions:**
 *   1. *May this actor state a decision at all?* → the actor must hold
 *      {@link STRUCTURE_DECISION_PERMISSION}. Without it, a decision is refused
 *      even if the records are harmless — stating the decision is the capability.
 *   2. *May this actor name that role?* → the actor must be allowed to grant
 *      every feature the decision grants TO the role it names. This is **not**
 *      re-implemented here: it is the platform's existing grant check
 *      (`assertActorCanGrantAcl`), reused verbatim so the two can never drift
 *      into "the roles screen refuses this grant, the decision header allows it".
 *      A superadmin passes it (the existing check's own bypass); a plain manager
 *      does not, and cannot use the header to grant themselves a feature they
 *      do not hold, nor to reach a role they could not reach from the UI.
 *
 * **Why a superadmin passing is correct, not a hole.** `assertActorCanGrantAcl`
 * lets a superadmin grant anything — by definition. The gate is not a second
 * privilege model; it is the *same* one applied to a new entry point. Anything a
 * superadmin can do here they can already do on the roles screen.
 *
 * **The machine case is bounded elsewhere, deliberately.** An `ai_worker` that
 * holds this permission is still bounded by the authority resolver's autonomy
 * matrix (an untrusted machine is capped at "acts with prior approval"); a human
 * is not. The same permission therefore behaves correctly for both principal
 * kinds without a special case here — the bound is a property of the actor, not
 * of this check.
 *
 * **Fail closed.** The functions throw (`CrudHttpError` / `forbidden`), which is
 * the platform's convention for an authorisation failure at a route or guard, and
 * the call sites translate them to a refusal (403/422). They never return a
 * boolean the caller could ignore by accident.
 */

/** The feature an actor must hold to state a structure-permission decision. */
export const STRUCTURE_DECISION_PERMISSION = 'entities.definitions.decide'

export type DecisionActorCheckInput = {
  em: EntityManager
  rbacService: RbacService
  /** The authenticated actor's user id (`auth.sub`). Absent → refused. */
  actorUserId: string | null | undefined
  tenantId: string | null | undefined
  organizationId?: string | null | undefined
  /** The decision's records (feature ids), as the gate resolved them. */
  records: readonly { feature: string }[]
  /** The role the records go to (the decision's `grantTo`). */
  grantTo: string
}

/**
 * Assert the actor may state this structure-permission decision.
 *
 * Throws `forbidden` (403) when the actor lacks
 * {@link STRUCTURE_DECISION_PERMISSION}, and delegates to the platform's own
 * grant check (`assertActorCanGrantAcl`) for the "may they name this role with
 * these records" question. Returns normally only when both hold.
 */
export async function assertActorMayStateDecision(input: DecisionActorCheckInput): Promise<void> {
  const actorUserId = typeof input.actorUserId === 'string' && input.actorUserId.trim().length > 0
    ? input.actorUserId.trim()
    : null
  if (!actorUserId) {
    throw forbidden('A permission decision must be stated by an authenticated actor.')
  }

  const tenantId = typeof input.tenantId === 'string' && input.tenantId.trim().length > 0
    ? input.tenantId.trim()
    : null
  if (!tenantId) {
    throw forbidden('Tenant context is required to state a permission decision.')
  }

  const scope = {
    tenantId,
    organizationId: input.organizationId ?? null,
  }

  // (1) The capability itself: stating a decision is a permission, not an
  // implication of being able to manage the structure.
  const mayDecide = await input.rbacService.userHasAllFeatures(
    actorUserId,
    [STRUCTURE_DECISION_PERMISSION],
    scope,
  )
  if (!mayDecide) {
    throw forbidden(
      `Stating a permission decision needs the "${STRUCTURE_DECISION_PERMISSION}" permission. ` +
        'Without it, a new structure still lands — with the platform default grant — but the actor may not choose the role.',
    )
  }

  // (2) The target: the actor may only name a role they could grant to from the
  // roles screen. Reused verbatim from the platform's own grant checks so the two
  // cannot drift. `assertActorCanGrantAcl` refuses a *feature* the actor does not
  // hold; `assertActorCanGrantRoles` refuses a **role** whose own ACL the actor
  // could not administer (e.g. a fellow role that is itself more privileged). A
  // superadmin passes both by their own bypass.
  //
  // The role check runs only when the role exists: a `grantTo` naming a role that
  // does not exist is a *fact* the write half already reports (`role_not_found`),
  // not an authorisation question — there is nothing to administer. Checking it
  // here would turn a reportable "no such role" into a misleading "forbidden".
  const targetRole = await resolveGrantRole(input.em, tenantId, input.grantTo)
  if (targetRole) {
    await assertActorCanGrantRoles({
      em: input.em,
      rbacService: input.rbacService,
      actorUserId,
      tenantId,
      organizationId: input.organizationId ?? null,
      roles: [targetRole],
    })
  }

  await assertActorCanGrantAcl({
    em: input.em,
    rbacService: input.rbacService,
    actorUserId,
    tenantId,
    organizationId: input.organizationId ?? null,
    features: input.records.map((record) => record.feature),
    // A decision never confers superadmin (see this file's header): a grant that
    // set `isSuperAdmin` would be the privilege-escalation smell the write half
    // already refuses to commit, so it is refused here too.
    isSuperAdmin: false,
  })
}
