/**
 * SD-1 — the write: applying a structure-change permission decision to the ACL store.
 *
 * **What this suite has to prove.** The gate decides; this writes the decision into
 * the *existing* roles-and-permissions store (`role_acls.features_json`), and it must
 * do so safely:
 *
 *   1. a grant that **cannot** be applied reports why, and writes nothing;
 *   2. a role with **no ACL** gets one holding exactly the records;
 *   3. a role **with** an ACL gets a **set-union** merge — nothing is lost, nothing
 *      is duplicated;
 *   4. the merge is **idempotent** — a second run adds nothing and does not flush;
 *   5. it **never** touches `isSuperAdmin` (a grant must not confer superadmin).
 *
 * The EntityManager is mocked (the project tests DB-backed code against a mocked EM;
 * a real migration is unprovable on this host — `document.ts:22-28`).
 */

import { Role, RoleAcl } from '@open-mercato/core/modules/auth/data/entities'
import {
  applyPermissionDecisionGrant,
  applyStructureChangeGrant,
  assertActorMayStateDecision,
  resolveGrantRole,
} from '../permission-decision-grant'

const TENANT = '123e4567-e89b-12d3-a456-426614174001'
const ROLE_ID = '123e4567-e89b-12d3-a456-426614174050'

type EmMock = {
  findOne: jest.Mock
  create: jest.Mock
  persist: jest.Mock
  flush: jest.Mock
  getConnection: jest.Mock
  /** The rows the mocked atomic `update … returning features_json` returns. */
  execute: jest.Mock
}

/**
 * Mock the EntityManager the way the other DB-backed suites do (the ledger,
 * `reconcileOrganization`): the merge is now ONE atomic `update … returning`, so
 * `getConnection().execute` stands in for the database. `mergedValue` lets a test
 * choose what the UPDATE returns for `features_json`; it defaults to the test's
 * expectation of the deduped union, so a test that does not care need not set it.
 */
function makeEm(handlers: {
  role?: unknown
  acl?: unknown
  /** What the atomic UPDATE returns for `features_json` (the post-merge array). */
  mergedValue?: unknown
}): EmMock {
  const execute = jest.fn(async () => [{ features_json: handlers.mergedValue ?? null }])
  const em: EmMock = {
    // findOneWithDecryption calls em.findOne(entityName, where, options); the two
    // callers pass the Role class then the RoleAcl class, so dispatch on the class.
    findOne: jest.fn(async (entity: unknown) => {
      if (entity === Role) return handlers.role ?? null
      if (entity === RoleAcl) return handlers.acl ?? null
      return null
    }),
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({ id: 'acl-new', ...data })),
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn(async () => undefined),
    getConnection: jest.fn(() => ({ execute })),
    execute,
  }
  return em
}

const role = { id: ROLE_ID, name: 'superadmin', tenantId: TENANT }

describe('resolveGrantRole', () => {
  it('looks the role up by name and tenant', async () => {
    const em = makeEm({ role })
    const found = await resolveGrantRole(em as never, TENANT, 'superadmin')
    expect(found).toBe(role)
    expect(em.findOne).toHaveBeenCalledWith(Role, { name: 'superadmin', tenantId: TENANT }, {})
  })

  it('returns null when the tenant has no such role', async () => {
    const em = makeEm({ role: null })
    expect(await resolveGrantRole(em as never, TENANT, 'superadmin')).toBeNull()
  })
})

describe('a grant that cannot be applied reports why and writes nothing', () => {
  it('refuses when the grant role does not exist', async () => {
    const em = makeEm({ role: null })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['entities.records.x.view'],
    })
    expect(result).toMatchObject({ applied: false, reason: 'role_not_found', roleName: 'superadmin' })
    expect(em.create).not.toHaveBeenCalled()
    expect(em.persist).not.toHaveBeenCalled()
  })

  it('refuses when there are no records to grant', async () => {
    const em = makeEm({ role })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: [],
    })
    expect(result).toMatchObject({ applied: false, reason: 'no_records' })
    expect(em.findOne).not.toHaveBeenCalled()
  })

  it('treats blank / whitespace-only records as nothing to grant', async () => {
    const em = makeEm({ role })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['', '   ', '\t'],
    })
    expect(result).toMatchObject({ applied: false, reason: 'no_records' })
  })
})

describe('a role with no ACL gets one holding exactly the records', () => {
  it('creates the ACL with the records and never sets isSuperAdmin', async () => {
    const em = makeEm({ role, acl: null })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['entities.records.x.view', 'entities.records.x.manage'],
    })

    expect(result).toMatchObject({ applied: true, aclCreated: true, roleId: ROLE_ID })
    expect((result as { added: string[] }).added).toEqual([
      'entities.records.x.view',
      'entities.records.x.manage',
    ])
    expect(em.create).toHaveBeenCalledTimes(1)
    const [entity, data] = em.create.mock.calls[0]
    expect(entity).toBe(RoleAcl)
    expect(data).toMatchObject({
      role,
      tenantId: TENANT,
      featuresJson: ['entities.records.x.view', 'entities.records.x.manage'],
      isSuperAdmin: false,
    })
    expect(em.persist).toHaveBeenCalledTimes(1)
    expect(em.flush).toHaveBeenCalledTimes(1)
  })

  it('dedupes repeated records before writing', async () => {
    const em = makeEm({ role, acl: null })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view', 'a.b.view', 'a.b.manage'],
    })
    expect((result as { added: string[] }).added).toEqual(['a.b.view', 'a.b.manage'])
  })
})

describe('a role with an ACL gets a set-union merge (nothing lost, nothing duplicated)', () => {
  it('adds only the new records via ONE atomic statement, preserving order', async () => {
    const acl = { id: 'acl-1', featuresJson: ['existing.one', 'shared.two'] }
    const em = makeEm({
      role,
      acl,
      // The DB returns the deduped union in first-occurrence order.
      mergedValue: ['existing.one', 'shared.two', 'new.three'],
    })

    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['shared.two', 'new.three'],
    })

    expect(result).toMatchObject({ applied: true, aclCreated: false })
    expect((result as { added: string[] }).added).toEqual(['new.three'])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual(['shared.two'])

    // The merge is a single UPDATE — the concurrency fix (CC-16). A read-modify-write
    // (persist + flush of an in-memory array) would reintroduce the lost-update window.
    expect(em.getConnection).toHaveBeenCalledTimes(1)
    expect(em.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = em.execute.mock.calls[0]
    expect(String(sql)).toMatch(/update\s+role_acls/i)
    expect(String(sql)).toMatch(/features_json/i)
    expect(String(sql)).toMatch(/\|\|/) // the JSONB union operator
    expect(String(sql)).toMatch(/returning\s+features_json/i)
    // The dedupe is what keeps the merge idempotent under a bare `||` (Postgres `||`
    // APPENDS, it does not union) — pin the construct, since the unit mock cannot run
    // the SQL. Empirically proven against Postgres 17 separately (PLAN-SD-1.md §8.8).
    expect(String(sql)).toMatch(/jsonb_array_elements_text/i)
    expect(String(sql)).toMatch(/group\s+by\s+elem/i)
    expect(params).toEqual([JSON.stringify(['shared.two', 'new.three']), 'acl-1'])
    // It no longer mutates the entity in memory and flushes it.
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('is idempotent: a second identical grant writes nothing and does not touch the DB', async () => {
    const acl = { id: 'acl-1', featuresJson: ['a.b.view'] }
    const em = makeEm({ role, acl })

    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })

    expect((result as { added: string[] }).added).toEqual([])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual(['a.b.view'])
    // Nothing new to add ⇒ no UPDATE at all (the previous code did not flush either).
    expect(em.execute).not.toHaveBeenCalled()
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('never touches isSuperAdmin on an existing ACL', async () => {
    const acl = { id: 'acl-1', featuresJson: [], isSuperAdmin: false }
    const em = makeEm({ role, acl, mergedValue: ['a.b.view'] })
    await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })
    // The atomic UPDATE names only `features_json` and `updated_at` — never the flag.
    const [sql] = em.execute.mock.calls[0]
    expect(String(sql)).not.toMatch(/is_super_admin/i)
    expect(acl.isSuperAdmin).toBe(false)
  })

  it('tolerates a null featuresJson on an existing ACL', async () => {
    const acl = { id: 'acl-1', featuresJson: null }
    const em = makeEm({ role, acl, mergedValue: ['a.b.view'] })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })
    expect((result as { added: string[] }).added).toEqual(['a.b.view'])
    // `coalesce(features_json, '[]')` in the statement is what makes a null safe.
    const [sql] = em.execute.mock.calls[0]
    expect(String(sql)).toMatch(/coalesce\(features_json/i)
  })

  it('reports `added` from what the DB RETURNED (not a stale in-memory guess)', async () => {
    // `added` is derived from the array the atomic UPDATE returned — the DB is the
    // source of truth. Here the returned value OMITS one of our requested records (as
    // if a concurrent writer's transaction won), so that record must NOT be reported
    // as added: a fallback that ignored the returned value would wrongly claim it.
    // (`alreadyPresent` is deliberately the *read-time* observation from `currentSet`
    // — "records already on the role when we looked" — and is log-only.)
    const acl = { id: 'acl-1', featuresJson: ['existing.one'] }
    const em = makeEm({
      role,
      acl,
      mergedValue: ['existing.one', 'mine.only'], // note: 'raced.already.there' absent
    })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['raced.already.there', 'mine.only'],
    })
    // 'raced.already.there' was not present before and is NOT in what the DB returned,
    // so this grant did not land it — it must not be reported as added.
    expect((result as { added: string[] }).added).toEqual(['mine.only'])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual([])
  })
})

/**
 * The one mapping from the gate's vocabulary to the write. Both callers — the guard's
 * `afterSuccess` and the batch route (CC-2) — go through it, so these cases fix the
 * contract they share.
 */
describe('applyStructureChangeGrant maps a gate outcome to the write', () => {
  const records = [
    { feature: 'test:entity.alpha.view', block: 'data' as const, surfaceId: 'test:entity.alpha' },
    { feature: 'test:entity.alpha.manage', block: 'data' as const, surfaceId: 'test:entity.alpha' },
    { feature: 'test:entity.alpha.structure', block: 'structural' as const, surfaceId: 'test:entity.alpha' },
  ]

  it('applies a defaulted outcome: the records go to the gate default role', async () => {
    const em = makeEm({ role })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'defaulted', records, grantTo: 'superadmin', because: 'no decision was recorded' },
    })

    expect(result).toMatchObject({ applied: true, roleName: 'superadmin', aclCreated: true })
    expect(em.create).toHaveBeenCalledWith(
      RoleAcl,
      expect.objectContaining({
        featuresJson: [
          'test:entity.alpha.view',
          'test:entity.alpha.manage',
          'test:entity.alpha.structure',
        ],
      }),
    )
  })

  it('writes a decided outcome — the decision’s own target and records (CC-17)', async () => {
    // Before CC-17 this returned `null`: the `decided` outcome carried no grant
    // target, so the write had nowhere to put a person's records. Now the target
    // travels with the decision, so a person's decision is written exactly as the
    // default's — to the role the person named.
    const financeRole = { id: 'role-finance', name: 'finance', tenantId: TENANT }
    const em = makeEm({ role: financeRole })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'decided', records, decidedBy: 'user-1', grantTo: 'finance', because: 'user-1 decided' },
    })

    expect(result).toMatchObject({ applied: true, roleName: 'finance', aclCreated: true })
    // The role looked up is the DECISION's target, not the default superadmin role.
    expect(em.findOne).toHaveBeenCalledWith(Role, { name: 'finance', tenantId: TENANT }, {})
    expect(em.create).toHaveBeenCalledWith(
      RoleAcl,
      expect.objectContaining({
        featuresJson: [
          'test:entity.alpha.view',
          'test:entity.alpha.manage',
          'test:entity.alpha.structure',
        ],
      }),
    )
  })

  it('a decided outcome with the default target writes to superadmin (the fallback, not the only answer)', async () => {
    const em = makeEm({ role })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'decided', records, decidedBy: 'user-1', grantTo: 'superadmin', because: 'user-1 decided' },
    })
    expect(result).toMatchObject({ applied: true, roleName: 'superadmin' })
  })

  it('a decided outcome whose role is missing fails loudly (role_not_found), like the default', async () => {
    const em = makeEm({ role: null })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'decided', records, decidedBy: 'user-1', grantTo: 'finance', because: 'user-1 decided' },
    })
    expect(result).toMatchObject({ applied: false, reason: 'role_not_found', roleName: 'finance' })
    expect(em.create).not.toHaveBeenCalled()
  })

  it('writes nothing for a refused outcome — there is no surface to grant', async () => {
    const em = makeEm({ role })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'refused', reason: 'no_surface', because: 'the change creates nothing' },
    })

    expect(result).toBeNull()
    expect(em.findOne).not.toHaveBeenCalled()
    expect(em.create).not.toHaveBeenCalled()
  })
})


/**
 * CC-25 — the *authorisation* half: who may state a structure-permission decision.
 *
 * **What this suite has to prove.** The carrier (the
 * `x-om-ext-permissions-decision` header) is trusted input: it names `decidedBy`
 * and `grantTo`, and before CC-25 nothing checked them against the actor. That let
 * any holder of `entities.definitions.manage` grant **arbitrary features to an
 * arbitrary role** through a header. These tests drive the **real**
 * `assertActorMayStateDecision` against a mocked `rbacService` — the platform's own
 * API (`userHasAllFeatures`, `loadAcl`) — and prove:
 *
 *   1. an actor without the decide permission is refused (`403`);
 *   2. an actor **with** it, granting records they hold to a role, is allowed;
 *   3. an actor with it, but granting a feature they do **not** hold, is refused —
 *      delegated verbatim to the platform's own `assertActorCanGrantAcl`;
 *   4. a superadmin is allowed (the existing check's own bypass — not a new hole);
 *   5. a missing actor or tenant is refused (fail closed).
 */
describe('CC-25 — assertActorMayStateDecision authorises the deciding actor', () => {
  const RECORDS = [
    { feature: 'entities.records.customers:customer_person.view' },
    { feature: 'entities.records.customers:customer_person.manage' },
  ]

  /**
   * A stand-in `rbacService` with the two methods the real check uses.
   *
   * `userHasAllFeatures` answers question (1) — does the actor hold the decide
   * permission; `loadAcl` answers the grant target question, mirrored by
   * `assertActorCanGrantAcl` (which loads the actor ACL and refuses a feature the
   * actor does not itself hold, unless the actor is a superadmin).
   */
  function makeRbac(opts: { decide: boolean; actorFeatures?: string[]; superAdmin?: boolean }) {
    const actorFeatures = opts.actorFeatures ?? []
    return {
      userHasAllFeatures: jest.fn(async (_userId: string, features: string[]) =>
        opts.decide && features.every((f) => f === 'entities.definitions.decide'),
      ),
      loadAcl: jest.fn(async () => ({
        isSuperAdmin: !!opts.superAdmin,
        features: opts.superAdmin ? ['*'] : actorFeatures,
        organizations: null,
      })),
    }
  }

  it('refuses an actor who does not hold the decide permission (403)', async () => {
    // The actor holds EVERY feature being granted (so the second check — the
    // grant target check — would pass) but NOT the decide permission. This makes
    // the refusal attributable to the decide check alone: if that check were
    // removed, the grant check would let this through and the test would fail.
    const rbac = makeRbac({
      decide: false,
      actorFeatures: [
        'entities.records.customers:customer_person.view',
        'entities.records.customers:customer_person.manage',
      ],
    })
    await expect(
      assertActorMayStateDecision({
        em: makeEm({ role }) as never,
        rbacService: rbac as never,
        actorUserId: 'user-1',
        tenantId: TENANT,
        organizationId: null,
        records: RECORDS,
        grantTo: 'superadmin',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('allows an actor who holds the permission and grants features they hold', async () => {
    const rbac = makeRbac({
      decide: true,
      actorFeatures: ['entities.records.customers:customer_person.view', 'entities.records.customers:customer_person.manage'],
    })
    await expect(
      assertActorMayStateDecision({
        em: makeEm({ role }) as never,
        rbacService: rbac as never,
        actorUserId: 'user-1',
        tenantId: TENANT,
        organizationId: null,
        records: RECORDS,
        grantTo: 'superadmin',
      }),
    ).resolves.toBeUndefined()
  })

  it('refuses an actor granting a feature they do NOT hold (delegated to the platform grant check)', async () => {
    const rbac = makeRbac({ decide: true, actorFeatures: ['entities.records.customers:customer_person.view'] })
    await expect(
      assertActorMayStateDecision({
        em: makeEm({ role }) as never,
        rbacService: rbac as never,
        actorUserId: 'user-1',
        tenantId: TENANT,
        organizationId: null,
        records: RECORDS,
        grantTo: 'superadmin',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('allows a superadmin (the existing grant check bypass — not a new hole)', async () => {
    const rbac = makeRbac({ decide: true, superAdmin: true })
    await expect(
      assertActorMayStateDecision({
        em: makeEm({ role }) as never,
        rbacService: rbac as never,
        actorUserId: 'root',
        tenantId: TENANT,
        organizationId: null,
        records: RECORDS,
        grantTo: 'superadmin',
      }),
    ).resolves.toBeUndefined()
  })

  it('refuses an actor naming a role whose ACL they could not administer (role-target check)', async () => {
    // The actor holds the decide permission AND every feature they grant, so the
    // feature check passes — but the TARGET ROLE's own ACL carries a feature the
    // actor does not hold, so  refuses. This makes the
    // refusal attributable to the role-target check alone.
    const rbac = makeRbac({
      decide: true,
      actorFeatures: [
        'entities.records.customers:customer_person.view',
        'entities.records.customers:customer_person.manage',
      ],
    })
    // The target role ('finance') has an ACL holding a feature the actor lacks.
    const emWithRoleAcl = makeEm({
      role: { id: 'role-finance', name: 'finance', tenantId: TENANT },
      acl: { id: 'acl-finance', featuresJson: ['billing.invoices.manage'], isSuperAdmin: false },
    })
    await expect(
      assertActorMayStateDecision({
        em: emWithRoleAcl as never,
        rbacService: rbac as never,
        actorUserId: 'user-1',
        tenantId: TENANT,
        organizationId: null,
        records: RECORDS,
        grantTo: 'finance',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('refuses when no actor is named (fail closed)', async () => {
    const rbac = makeRbac({ decide: true })
    await expect(
      assertActorMayStateDecision({
        em: makeEm({ role }) as never,
        rbacService: rbac as never,
        actorUserId: null,
        tenantId: TENANT,
        organizationId: null,
        records: RECORDS,
        grantTo: 'superadmin',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('refuses when no tenant is named (fail closed)', async () => {
    const rbac = makeRbac({ decide: true })
    await expect(
      assertActorMayStateDecision({
        em: makeEm({ role }) as never,
        rbacService: rbac as never,
        actorUserId: 'user-1',
        tenantId: null,
        organizationId: null,
        records: RECORDS,
        grantTo: 'superadmin',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })
})
