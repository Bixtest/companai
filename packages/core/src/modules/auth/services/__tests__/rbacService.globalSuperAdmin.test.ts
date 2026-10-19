/**
 * Who counts as an administrator *above every tenant* — `CC-134`.
 *
 * The defect: `isGlobalSuperAdmin` read `UserAcl` with **no tenant filter**, on a column whose own
 * comment says tenant scope is mandatory for ACL evaluation. A superadmin of one tenant was therefore
 * treated as a superadmin of every tenant, and `loadAcl` acted on that answer before the requested
 * scope was consulted at all.
 *
 * The measurement that shapes these tests: `loadAcl`'s **per-tenant** read already filters by
 * `tenantId`, so a superadmin of tenant B already gets `['*']` **inside B** without this function's
 * help. That makes `isGlobalSuperAdmin` purely the cross-tenant shortcut, and it makes the first two
 * tests below the regression that matters most — a fix that breaks the legitimate case would be
 * reverted by hand at 3 a.m.
 *
 * **The fake applies the filters it is handed.** A fake that returns every row cannot prove a filter
 * (`LESSONS.md` L23): if it ignored `tenantId`, removing the filter from the code would change
 * nothing and the mutation would survive.
 */
import { RbacService } from '../rbacService'
import { UserAcl, RoleAcl, User, UserRole } from '@open-mercato/core/modules/auth/data/entities'
import { Tenant } from '@open-mercato/core/modules/directory/data/entities'

const FOUNDATION = 'tenant-foundation'
const OTHER = 'tenant-other'
const THIRD = 'tenant-third'

type Row = Record<string, any>

interface Store {
  tenants: Row[]
  users: Row[]
  userAcls: Row[]
  userRoles: Row[]
  roleAcls: Row[]
}

function emptyStore(): Store {
  return { tenants: [], users: [], userAcls: [], userRoles: [], roleAcls: [] }
}

/** Every field of `where` must match the row. `role` is a relation, so it is matched by id or by tenant. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where ?? {}).every(([key, expected]) => {
    if (key === 'role' && expected && typeof expected === 'object') {
      if ('$in' in expected) {
        const ids = (expected.$in as unknown[]).map(String)
        return ids.includes(String(row.roleId ?? row.role?.id))
      }
      if ('tenantId' in expected) return String(row.role?.tenantId) === String(expected.tenantId)
    }
    return String(row[key]) === String(expected)
  })
}

function tableFor(entity: unknown): keyof Store {
  if (entity === Tenant) return 'tenants'
  if (entity === UserAcl) return 'userAcls'
  if (entity === User) return 'users'
  if (entity === RoleAcl) return 'roleAcls'
  if (entity === UserRole) return 'userRoles'
  throw new Error('unexpected entity in the fake EntityManager')
}

let store: Store = emptyStore()

const mockFindWithDecryption = jest.fn(
  async (_em: unknown, entity: unknown, where: Row, _options: unknown, scope: Row) => {
    let rows = store[tableFor(entity)].filter((row) => matches(row, where ?? {}))
    // The scope is a filter too. Applying it is what makes "leave the role path tenant-less" a
    // mutation that changes an answer rather than one that changes nothing.
    if (scope && scope.tenantId) {
      rows = rows.filter((row) => String(row.role?.tenantId) === String(scope.tenantId))
    }
    return rows
  },
)

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findWithDecryption: (...args: unknown[]) => mockFindWithDecryption(...(args as [unknown, unknown, Row, unknown, Row])),
  findOneWithDecryption: jest.fn(),
}))

function makeEm() {
  const em: Row = {
    fork: () => em,
    findOne: async (entity: unknown, where: Row) =>
      store[tableFor(entity)].find((row) => matches(row, where)) ?? null,
    find: async (entity: unknown, where: Row) =>
      store[tableFor(entity)].filter((row) => matches(row, where)),
  }
  return em as never
}

function makeService(seed: Partial<Store>) {
  store = { ...emptyStore(), ...seed }
  mockFindWithDecryption.mockClear()
  return new RbacService(makeEm())
}

const SCOPE = (tenantId: string) => ({ tenantId, organizationId: null })

describe('a superadmin is a superadmin of one tenant (CC-134)', () => {
  it('still gives a tenant superadmin unrestricted access INSIDE their own tenant', async () => {
    // The regression that matters most. This answer comes from the per-tenant read, not from the
    // cross-tenant shortcut — so the fix must not take it away.
    const service = makeService({
      tenants: [{ id: FOUNDATION, isFoundational: true }, { id: OTHER, isFoundational: false }],
      users: [{ id: 'sam', tenantId: OTHER, organizationId: null }],
      userAcls: [{ user: 'sam', tenantId: OTHER, isSuperAdmin: true, featuresJson: ['*'] }],
    })

    const acl = await service.loadAcl('sam', SCOPE(OTHER))

    expect(acl.isSuperAdmin).toBe(true)
    expect(acl.features).toEqual(['*'])
  })

  it('does NOT make that same person a superadmin of another tenant', async () => {
    const service = makeService({
      tenants: [{ id: FOUNDATION, isFoundational: true }, { id: OTHER, isFoundational: false }],
      users: [{ id: 'sam', tenantId: OTHER, organizationId: null }],
      userAcls: [{ user: 'sam', tenantId: OTHER, isSuperAdmin: true, featuresJson: ['*'] }],
    })

    const acl = await service.loadAcl('sam', SCOPE(THIRD))

    expect(acl.isSuperAdmin).toBe(false)
    expect(acl.features).toEqual([])
  })

  it('does not leak the answer across two scopes in one process', async () => {
    // The answer is a property of the USER, so the per-user cache is correct — but the two scopes must
    // still resolve differently, which is the property a scope-blind read destroyed.
    const service = makeService({
      tenants: [{ id: FOUNDATION, isFoundational: true }, { id: OTHER, isFoundational: false }],
      users: [{ id: 'sam', tenantId: OTHER, organizationId: null }],
      userAcls: [{ user: 'sam', tenantId: OTHER, isSuperAdmin: true, featuresJson: ['*'] }],
    })

    const inside = await service.loadAcl('sam', SCOPE(OTHER))
    const outside = await service.loadAcl('sam', SCOPE(THIRD))

    expect(inside.isSuperAdmin).toBe(true)
    expect(outside.isSuperAdmin).toBe(false)
  })

  it('lets the FOUNDATIONAL tenant\'s superadmin reach every tenant (CC-128 option A)', async () => {
    const service = makeService({
      tenants: [{ id: FOUNDATION, isFoundational: true }, { id: OTHER, isFoundational: false }],
      users: [{ id: 'ada', tenantId: FOUNDATION, organizationId: null }],
      userAcls: [{ user: 'ada', tenantId: FOUNDATION, isSuperAdmin: true, featuresJson: ['*'] }],
    })

    const acl = await service.loadAcl('ada', SCOPE(THIRD))

    expect(acl.isSuperAdmin).toBe(true)
    expect(acl.features).toEqual(['*'])
  })

  it('fails closed when no tenant is marked foundational', async () => {
    const service = makeService({
      tenants: [{ id: OTHER, isFoundational: false }],
      users: [{ id: 'sam', tenantId: OTHER, organizationId: null }],
      userAcls: [{ user: 'sam', tenantId: OTHER, isSuperAdmin: true, featuresJson: ['*'] }],
    })

    const internals = service as unknown as { isGlobalSuperAdmin: (id: string) => Promise<boolean> }
    expect(await internals.isGlobalSuperAdmin('sam')).toBe(false)
    expect((await service.loadAcl('sam', SCOPE(THIRD))).isSuperAdmin).toBe(false)
  })
})

describe('the role half asks the same question as the ACL half (CC-134 R2)', () => {
  it('counts a superadmin role that lives in the foundational tenant', async () => {
    const service = makeService({
      tenants: [{ id: FOUNDATION, isFoundational: true }, { id: OTHER, isFoundational: false }],
      users: [{ id: 'sam', tenantId: FOUNDATION, organizationId: null }],
      userRoles: [{ user: 'sam', role: { id: 'role-foundation', tenantId: FOUNDATION } }],
      roleAcls: [{ roleId: 'role-foundation', tenantId: FOUNDATION, isSuperAdmin: true }],
    })

    const internals = service as unknown as { isGlobalSuperAdmin: (id: string) => Promise<boolean> }
    expect(await internals.isGlobalSuperAdmin('sam')).toBe(true)
  })

  it('does NOT count a superadmin role that lives in another tenant', async () => {
    // Under the old tenant-less lookup this role was found, because the lookup asked for "no tenant"
    // and then read RoleAcl with no tenant filter at all.
    const service = makeService({
      tenants: [{ id: FOUNDATION, isFoundational: true }, { id: OTHER, isFoundational: false }],
      users: [{ id: 'sam', tenantId: OTHER, organizationId: null }],
      userRoles: [{ user: 'sam', role: { id: 'role-other', tenantId: OTHER } }],
      roleAcls: [{ roleId: 'role-other', tenantId: OTHER, isSuperAdmin: true }],
    })

    const internals = service as unknown as { isGlobalSuperAdmin: (id: string) => Promise<boolean> }
    expect(await internals.isGlobalSuperAdmin('sam')).toBe(false)
  })
})
