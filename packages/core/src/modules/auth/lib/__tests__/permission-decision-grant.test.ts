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
  resolveGrantRole,
} from '../permission-decision-grant'

const TENANT = '123e4567-e89b-12d3-a456-426614174001'
const ROLE_ID = '123e4567-e89b-12d3-a456-426614174050'

type EmMock = {
  findOne: jest.Mock
  create: jest.Mock
  persist: jest.Mock
  flush: jest.Mock
}

function makeEm(handlers: { role?: unknown; acl?: unknown }): EmMock {
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
  it('adds only the new records and preserves the existing ones and their order', async () => {
    const acl = { id: 'acl-1', featuresJson: ['existing.one', 'shared.two'] }
    const em = makeEm({ role, acl })

    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['shared.two', 'new.three'],
    })

    expect(result).toMatchObject({ applied: true, aclCreated: false })
    expect((result as { added: string[] }).added).toEqual(['new.three'])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual(['shared.two'])
    expect(acl.featuresJson).toEqual(['existing.one', 'shared.two', 'new.three'])
    expect(em.persist).toHaveBeenCalledTimes(1)
  })

  it('is idempotent: a second identical grant adds nothing and does not flush', async () => {
    const acl = { id: 'acl-1', featuresJson: ['a.b.view'] }
    const em = makeEm({ role, acl })

    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })

    expect((result as { added: string[] }).added).toEqual([])
    expect((result as { alreadyPresent: string[] }).alreadyPresent).toEqual(['a.b.view'])
    expect(acl.featuresJson).toEqual(['a.b.view'])
    expect(em.persist).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('never touches isSuperAdmin on an existing ACL', async () => {
    const acl = { id: 'acl-1', featuresJson: [], isSuperAdmin: false }
    const em = makeEm({ role, acl })
    await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })
    expect(acl.isSuperAdmin).toBe(false)
  })

  it('tolerates a null featuresJson on an existing ACL', async () => {
    const acl = { id: 'acl-1', featuresJson: null }
    const em = makeEm({ role, acl })
    const result = await applyPermissionDecisionGrant(em as never, {
      tenantId: TENANT,
      grantTo: 'superadmin',
      records: ['a.b.view'],
    })
    expect((result as { added: string[] }).added).toEqual(['a.b.view'])
    expect(acl.featuresJson).toEqual(['a.b.view'])
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

  it('writes nothing for a decided outcome — the decision carries no grant target yet (CC-17)', async () => {
    const em = makeEm({ role })
    const result = await applyStructureChangeGrant(em as never, {
      tenantId: TENANT,
      decision: { outcome: 'decided', records, decidedBy: 'user-1', because: 'user-1 decided' },
    })

    expect(result).toBeNull()
    expect(em.findOne).not.toHaveBeenCalled()
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
