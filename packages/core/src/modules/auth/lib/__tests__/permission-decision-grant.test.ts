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
 *   4. the merge is **idempotent** — a second run adds nothing;
 *   5. it **never** touches `isSuperAdmin` (a grant must not confer superadmin);
 *   6. the **whole** write is one statement **regardless of create-or-update** —
 *      `INSERT … ON CONFLICT (role_id, tenant_id) DO UPDATE` — so the create-branch
 *      race CC-16 left open (CC-23) is closed by the unique index, not an app lock.
 *
 * The EntityManager is mocked (the project tests DB-backed code against a mocked EM);
 * the DB itself is provable on this host — `mercato-postgres-local` — so the CC-23
 * index is **applied and measured live** (see `Migration20261009220000`), not merely
 * asserted here.
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
  /** The one row the mocked atomic upsert (`insert … on conflict … returning`) returns. */
  execute: jest.Mock
}

/**
 * Mock the EntityManager the way the other DB-backed suites do (the ledger,
 * `reconcileOrganization`): the write is now ONE atomic upsert, so
 * `getConnection().execute` stands in for the database.
 *
 *   - `inserted` is what `(xmax = 0)` returns: `true` on a genuinely inserted row,
 *     `false` on a row the `do update` branch touched. It is what `aclCreated` is
 *     derived from.
 *   - `newlyAdded` / `alreadyPresent` are what the statement's `newly_added` /
 *     `already_present` columns return — the classified request. The unit mock
 *     cannot run the SQL, so a test states them; the SQL that derives them is
 *     proven separately against live Postgres (see `Migration20261009220000`
 *     and the CC-23 concurrency proof).
 *   - `acl` is no longer read by the **write** path (that is the point of CC-23 —
 *     no pre-read), but the CC-25 role-target check (`assertActorCanGrantRoles`)
 *     still reads the *target role's* ACL through `em.findOne(RoleAcl, …)`, so it
 *     stays wired for those cases.
 */
function makeEm(handlers: {
  role?: unknown
  acl?: unknown
  /** What `(xmax = 0)` returns — true when the row was inserted, false when updated. */
  inserted?: boolean
  /** What the statement's `newly_added` column returns. Defaults to `[]`. */
  newlyAdded?: string[]
  /** What the statement's `already_present` column returns. Defaults to `[]`. */
  alreadyPresent?: string[]
}): EmMock {
  const execute = jest.fn(async () => [
    {
      features_json: null,
      inserted: handlers.inserted ?? true,
      newly_added: handlers.newlyAdded ?? [],
      already_present: handlers.alreadyPresent ?? [],
    },
  ])
  const em: EmMock = {
    // findOneWithDecryption calls em.findOne(entityName, where, options); the callers
    // pass the Role class (resolveGrantRole, grant checks) then the RoleAcl class
    // (the CC-25 role-target check), so dispatch on the class.
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
  it('inserts the ACL with the records and never sets isSuperAdmin', async () => {
    // `inserted: true` is what the DB's `(xmax = 0)` reports for a genuinely new row.
    const em = makeEm({
      role,
      inserted: true,
      newlyAdded: ['entities.records.x.view', 'entities.records.x.manage'],
      alreadyPresent: [],
    })
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
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual([])

    // The whole write is ONE statement: an INSERT … ON CONFLICT (CC-23).
    expect(em.getConnection).toHaveBeenCalledTimes(1)
    expect(em.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = em.execute.mock.calls[0]
    expect(String(sql)).toMatch(/insert\s+into\s+role_acls/i)
    expect(String(sql)).toMatch(/on\s+conflict\s*\(\s*role_id\s*,\s*tenant_id\s*\)/i)
    expect(String(sql)).toMatch(/do\s+update/i)
    // A fresh row is created with the entity default for the flag — never `true`.
    expect(String(sql)).toMatch(/is_super_admin,\s*created_at/i)
    expect(String(sql)).toMatch(/values\s*\(\s*\?\s*,\s*\?\s*,\s*\?\s*::jsonb\s*,\s*false\s*,\s*now\(\)\s*\)/i)
    // `aclCreated` is read from the DB, not guessed: `(xmax = 0)` marks a genuinely
    // inserted row. Pin the construct — the unit mock cannot run the SQL, so a
    // mutation replacing it with `(true)` would otherwise pass unnoticed (it did,
    // in mutation M2, until this assertion existed).
    expect(String(sql)).toMatch(/xmax\s*=\s*0/i)
    // The classification of the request is computed in SQL from the PRE-merge value
    // (`pre.before`), and returned alongside the union. Pin the CLASSIFICATION, not
    // merely the column names: `newly_added` must be "requested records NOT in
    // `p.before`" and `already_present` must be "requested records IN `p.before`".
    // A mutation that read `newly_added` from the post-merge `u.features_json`
    // instead of `p.before` passed unnoticed until this pin existed (mutation M3).
    expect(String(sql)).toMatch(/newly_added/)
    expect(String(sql)).toMatch(/already_present/)
    expect(String(sql)).toMatch(/not\s*\(\s*coalesce\(p\.before[\s\S]*?\)\s*@>\s*to_jsonb\(r\.elem\)\)\)\s*as\s*newly_added/i)
    expect(String(sql)).toMatch(/where\s+coalesce\(p\.before[\s\S]*?\)\s*@>\s*to_jsonb\(r\.elem\)\)\s*as\s*already_present/i)
    expect(String(sql)).toMatch(/left\s+join\s+role_acls\s+a\s+on\s+a\.role_id\s*=\s*\?\s+and\s+a\.tenant_id\s*=\s*\?/i)
    // The request is parameterised twice: once for the INSERT and once for the
    // `requested` CTE that classifies it into newly_added / already_present.
    expect(params).toEqual([
      ROLE_ID,
      TENANT,
      ROLE_ID,
      TENANT,
      JSON.stringify(['entities.records.x.view', 'entities.records.x.manage']),
      JSON.stringify(['entities.records.x.view', 'entities.records.x.manage']),
    ])
    // It no longer persists a MikroORM entity in memory.
    expect(em.create).not.toHaveBeenCalled()
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('reports aclCreated=false when the ON CONFLICT branch updated (xmax ≠ 0)', async () => {
    // Same single statement, but the row already existed and `do update` ran — the
    // DB reports `inserted: false`. `aclCreated` must follow the DB, not the branch.
    const em = makeEm({ role, inserted: false, newlyAdded: ['new.three'], alreadyPresent: [] })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['new.three'],
    })
    expect(result).toMatchObject({ applied: true, aclCreated: false })
    expect((result as { added: string[] }).added).toEqual(['new.three'])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual([])
  })

  it('dedupes repeated records before writing', async () => {
    const em = makeEm({ role, inserted: true, newlyAdded: ['a.b.view', 'a.b.manage'] })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view', 'a.b.view', 'a.b.manage'],
    })
    expect((result as { added: string[] }).added).toEqual(['a.b.view', 'a.b.manage'])
    // The dedupe happens before the statement: both the INSERT value and the
    // classifying CTE's request carry the two uniques, not the three inputs.
    const params = em.execute.mock.calls[0][1] as unknown[]
    expect(params[4]).toEqual(JSON.stringify(['a.b.view', 'a.b.manage']))
    expect(params[5]).toEqual(JSON.stringify(['a.b.view', 'a.b.manage']))
  })
})

describe('a role with an ACL gets a set-union merge (nothing lost, nothing duplicated)', () => {
  it('adds only the new records via ONE atomic statement, preserving order', async () => {
    const em = makeEm({
      role,
      inserted: false, // the row exists → the `do update` branch ran
      // The statement classifies the request against the PRE-merge value.
      newlyAdded: ['new.three'],
      alreadyPresent: ['shared.two'],
    })

    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['shared.two', 'new.three'],
    })

    expect(result).toMatchObject({ applied: true, aclCreated: false })
    expect((result as { added: string[] }).added).toEqual(['new.three'])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual(['shared.two'])

    // The whole write is a single statement — the CC-16 + CC-23 concurrency fix. A
    // read-modify-write (persist + flush of an in-memory array) would reintroduce the
    // lost-update window.
    expect(em.getConnection).toHaveBeenCalledTimes(1)
    expect(em.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = em.execute.mock.calls[0]
    expect(String(sql)).toMatch(/on\s+conflict\s*\(\s*role_id\s*,\s*tenant_id\s*\)/i)
    expect(String(sql)).toMatch(/features_json/i)
    expect(String(sql)).toMatch(/\|\|/) // the JSONB union operator
    expect(String(sql)).toMatch(/returning\s+features_json/i)
    // The dedupe is what keeps the merge idempotent under a bare `||` (Postgres `||`
    // APPENDS, it does not union) — pin the construct, since the unit mock cannot run
    // the SQL. Empirically proven against Postgres 17 separately (PLAN-SD-1.md §8.8).
    expect(String(sql)).toMatch(/jsonb_array_elements_text/i)
    expect(String(sql)).toMatch(/group\s+by\s+elem/i)
    expect(params[4]).toEqual(JSON.stringify(['shared.two', 'new.three']))
    // It no longer mutates the entity in memory and flushes it.
    expect(em.create).not.toHaveBeenCalled()
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('is idempotent: a second identical grant adds nothing', async () => {
    // Every requested record was already on the role → `newly_added` is empty.
    const em = makeEm({ role, inserted: false, newlyAdded: [], alreadyPresent: ['a.b.view'] })

    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })

    expect((result as { added: string[] }).added).toEqual([])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual(['a.b.view'])
    // Still one statement (the upsert), but the classified request is empty on the
    // `newly_added` side — so nothing was added. A write that short-circuited on a
    // pre-read would reintroduce the very read-modify-write window CC-23 closed.
    expect(em.execute).toHaveBeenCalledTimes(1)
    expect(em.create).not.toHaveBeenCalled()
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('never touches isSuperAdmin on an existing ACL', async () => {
    const em = makeEm({ role, inserted: false, newlyAdded: ['a.b.view'] })
    await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })
    // The `do update` clause names only `features_json` and `updated_at` — never the
    // flag. (The INSERT's column list names `is_super_admin` only to set the default
    // `false` on a *fresh* row, which cannot confer superadmin.)
    const [sql] = em.execute.mock.calls[0]
    const doUpdate = String(sql).split(/do\s+update/i)[1] ?? ''
    expect(doUpdate).not.toMatch(/is_super_admin/i)
  })

  it('tolerates a null featuresJson on an existing ACL', async () => {
    const em = makeEm({ role, inserted: false, newlyAdded: ['a.b.view'] })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })
    expect((result as { added: string[] }).added).toEqual(['a.b.view'])
    // `coalesce(... features_json, '[]')` in the statement makes a null safe.
    const [sql] = em.execute.mock.calls[0]
    expect(String(sql)).toMatch(/coalesce\(role_acls\.features_json,\s*'\[\]'::jsonb\)/i)
  })

  it('reports `added` from what the DB RETURNED (not a stale in-memory guess)', async () => {
    // `added` is derived from the statement's own `newly_added` classification — the
    // DB is the source of truth. Here it OMITS one of our requested records (as if a
    // concurrent writer's transaction won the race for that one), so it must NOT be
    // reported as added: a fallback that echoed the request would wrongly claim it.
    const em = makeEm({
      role,
      inserted: false,
      newlyAdded: ['mine.only'], // note: 'raced.already.there' absent
      alreadyPresent: [],
    })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['raced.already.there', 'mine.only'],
    })
    // 'raced.already.there' was not reported as newly added, so this grant did not
    // land it — it must not be reported as added.
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
    const em = makeEm({
      role,
      inserted: true,
      newlyAdded: [
        'test:entity.alpha.view',
        'test:entity.alpha.manage',
        'test:entity.alpha.structure',
      ],
    })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'defaulted', records, grantTo: 'superadmin', because: 'no decision was recorded' },
    })

    expect(result).toMatchObject({ applied: true, roleName: 'superadmin', aclCreated: true })
    // The records land in the one atomic upsert's payload (params[4] / [5]).
    const params = em.execute.mock.calls[0][1] as unknown[]
    expect(params[4]).toEqual(
      JSON.stringify([
        'test:entity.alpha.view',
        'test:entity.alpha.manage',
        'test:entity.alpha.structure',
      ]),
    )
  })

  it('writes a decided outcome — the decision’s own target and records (CC-17)', async () => {
    // Before CC-17 this returned `null`: the `decided` outcome carried no grant
    // target, so the write had nowhere to put a person's records. Now the target
    // travels with the decision, so a person's decision is written exactly as the
    // default's — to the role the person named.
    const financeRole = { id: 'role-finance', name: 'finance', tenantId: TENANT }
    const em = makeEm({
      role: financeRole,
      inserted: true,
      newlyAdded: [
        'test:entity.alpha.view',
        'test:entity.alpha.manage',
        'test:entity.alpha.structure',
      ],
    })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'decided', records, decidedBy: 'user-1', grantTo: 'finance', because: 'user-1 decided' },
    })

    expect(result).toMatchObject({ applied: true, roleName: 'finance', aclCreated: true })
    // The role looked up is the DECISION's target, not the default superadmin role.
    expect(em.findOne).toHaveBeenCalledWith(Role, { name: 'finance', tenantId: TENANT }, {})
    // The insert targets the decision's own role id.
    const params = em.execute.mock.calls[0][1] as unknown[]
    expect(params[2]).toEqual('role-finance')
  })

  it('a decided outcome with the default target writes to superadmin (the fallback, not the only answer)', async () => {
    const em = makeEm({ role, inserted: true, newlyAdded: ['test:entity.alpha.view'] })
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
    expect(em.execute).not.toHaveBeenCalled()
  })

  it('writes nothing for a refused outcome — there is no surface to grant', async () => {
    const em = makeEm({ role })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'refused', reason: 'no_surface', because: 'the change creates nothing' },
    })

    expect(result).toBeNull()
    expect(em.findOne).not.toHaveBeenCalled()
    expect(em.execute).not.toHaveBeenCalled()
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
