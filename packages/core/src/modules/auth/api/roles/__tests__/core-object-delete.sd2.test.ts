/** @jest-environment node */

/**
 * SD-2 / S9 — the core-object delete guard, at the route and at the helper.
 *
 * **What this suite has to prove.**
 *   1. **A core role cannot be deleted — by anyone.** The exported `DELETE`
 *      returns **409** (not 400, not 200) for `superadmin`, and the CRUD action is
 *      never reached (nothing is written).
 *   2. **A non-core role still deletes** — the guard does not over-block. The
 *      `crud.DELETE` path is reached.
 *   3. **The rule is actor-independent.** A refusal happens even when the actor
 *      *is* a superadmin — the check that runs before it
 *      (`assertCanModifySuperAdminRole`) passes for a superadmin, so the only
 *      thing that can produce the 409 is the core rule. This is the whole point:
 *      S9 is object-level, not actor-level.
 *   4. **A missing role is not a core refusal** — it falls through to the CRUD
 *      path (the caller's own 404 owns that), so the two are never conflated.
 */

const mockFindOneWithDecryption = jest.fn()
jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => mockFindOneWithDecryption(...args),
  findWithDecryption: jest.fn(async () => []),
}))

// The route's CRUD delete is mocked so we can tell whether the write path was reached.
const mockCrudDelete = jest.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
jest.mock('@open-mercato/shared/lib/crud/factory', () => {
  const actual = jest.requireActual('@open-mercato/shared/lib/crud/factory')
  return {
    ...actual,
    makeCrudRoute: () => ({ POST: jest.fn(), PUT: jest.fn(), DELETE: mockCrudDelete }),
    logCrudAccess: jest.fn(),
  }
})

// The actor is a SUPERADMIN, so `assertCanModifySuperAdminRole` passes and the
// only thing that can refuse is the core rule — which is exactly what we test.
const authResult: { sub: string; tenantId: string | null; orgId: string | null } = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  orgId: 'org-1',
}
jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => authResult),
}))

const mockEm = { findOne: jest.fn() }
const mockRbacService = { loadAcl: jest.fn(async () => ({ isSuperAdmin: true, features: ['*'], organizations: null })) }
const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'rbacService') return mockRbacService
    return null
  }),
}
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DELETE } = require('@open-mercato/core/modules/auth/api/roles/route')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertCoreRoleNotDeletable } = require('@open-mercato/core/modules/auth/lib/core-object-guard')

const SUPERADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const ORDINARY_ROLE_ID = '22222222-2222-2222-2222-222222222222'

function makeRequest(id: string) {
  return new Request(`http://localhost/api/auth/roles?id=${id}`, { method: 'DELETE' })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('the helper — assertCoreRoleNotDeletable', () => {
  it('throws 409 for a role named superadmin', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: SUPERADMIN_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    await expect(
      assertCoreRoleNotDeletable(mockEm as never, { tenantId: 'tenant-1' }, SUPERADMIN_ROLE_ID),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('does not throw for an ordinary role', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: ORDINARY_ROLE_ID, name: 'admin', tenantId: 'tenant-1' })
    await expect(
      assertCoreRoleNotDeletable(mockEm as never, { tenantId: 'tenant-1' }, ORDINARY_ROLE_ID),
    ).resolves.toBeUndefined()
  })

  it('does not throw when the role is not found (the caller owns the 404)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce(null)
    await expect(
      assertCoreRoleNotDeletable(mockEm as never, { tenantId: 'tenant-1' }, SUPERADMIN_ROLE_ID),
    ).resolves.toBeUndefined()
  })

  it('the refusal body names the reason and the because (dictionary S3)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: SUPERADMIN_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    try {
      await assertCoreRoleNotDeletable(mockEm as never, { tenantId: 'tenant-1' }, SUPERADMIN_ROLE_ID)
      throw new Error('expected a refusal')
    } catch (err) {
      const body = (err as { body: { error: string; because: string } }).body
      expect(body.error).toBe('"superadmin" is a core role and cannot be deleted.')
      expect(body.because).toContain('roles-and-permissions manager')
    }
  })
})

describe('the route — DELETE refuses a core role and NEVER reaches the CRUD write', () => {
  it('returns 409 for superadmin, and the CRUD delete is not called', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: SUPERADMIN_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    const res = await DELETE(makeRequest(SUPERADMIN_ROLE_ID))
    expect(res.status).toBe(409)
    expect(mockCrudDelete).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.error).toContain('core role')
  })

  it('the actor is a superadmin, so the 409 can ONLY be the core rule (actor-independence)', async () => {
    // The actor check (assertCanModifySuperAdminRole) is satisfied — the actor IS a
    // superadmin. The 409 therefore proves the rule is object-level, not actor-level.
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: SUPERADMIN_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    const res = await DELETE(makeRequest(SUPERADMIN_ROLE_ID))
    expect(res.status).toBe(409)
    expect(mockCrudDelete).not.toHaveBeenCalled()
  })

  it('an ordinary role falls through to the CRUD delete (no over-blocking)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: ORDINARY_ROLE_ID, name: 'admin', tenantId: 'tenant-1' })
    const res = await DELETE(makeRequest(ORDINARY_ROLE_ID))
    expect(res.status).toBe(200)
    expect(mockCrudDelete).toHaveBeenCalledTimes(1)
  })

  it('a missing role falls through to the CRUD delete (404 is the caller\'s, not ours)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce(null)
    const res = await DELETE(makeRequest(ORDINARY_ROLE_ID))
    expect(res.status).toBe(200)
    expect(mockCrudDelete).toHaveBeenCalledTimes(1)
  })
})
