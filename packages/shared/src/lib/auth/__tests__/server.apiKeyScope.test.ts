/**
 * What bounds an API key, and what merely made one.
 *
 * An `api_keys` row carries two references to a person and they mean different
 * things. `sessionUserId` is **identity** — the key acts as that user, so it must
 * not outrange them. `createdBy` is **provenance** — who minted a service
 * credential that then carries its own roles and its own organization.
 *
 * Treating provenance as identity made a key's working life depend on a person's
 * current record: move that person to another organization and every key they
 * ever created returned 401, silently, forever. These tests pin the narrower
 * rule that replaced it — *a key may not be broader than its creator* — and the
 * session-key behaviour that was correct all along and had to stay.
 */

const verifyJwt = jest.fn(() => {
  throw new Error('no jwt')
})
const createRequestContainer = jest.fn()
const findApiKeyBySecret = jest.fn()
const emFind = jest.fn()
const emFindOne = jest.fn()
const emFlush = jest.fn()

jest.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}))

jest.mock('@open-mercato/shared/lib/auth/jwt', () => ({
  verifyJwt: (...args: unknown[]) => verifyJwt(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainer(...args),
}))

jest.mock('@open-mercato/core/modules/auth/lib/sessionIntegrity', () => ({
  resolveCanonicalStaffAuthContext: jest.fn(async (_em: unknown, auth: unknown) => auth),
}))

jest.mock('@open-mercato/core/modules/api_keys/services/apiKeyService', () => ({
  findApiKeyBySecret: (...args: unknown[]) => findApiKeyBySecret(...args),
}))

class UserEntity {}
class TenantEntity {}
class OrganizationEntity {}

jest.mock('@open-mercato/core/modules/auth/data/entities', () => ({
  Role: class {},
  RoleAcl: class {},
  User: UserEntity,
}))

jest.mock('@open-mercato/core/modules/directory/data/entities', () => ({
  Organization: OrganizationEntity,
  Tenant: TenantEntity,
}))

const em = {
  find: (...args: unknown[]) => emFind(...args),
  findOne: (...args: unknown[]) => emFindOne(...args),
  persist: () => ({ flush: (...args: unknown[]) => emFlush(...args) }),
  flush: (...args: unknown[]) => emFlush(...args),
}

const TENANT = 'tenant-1'
const ORG_A = 'org-a'
const ORG_B = 'org-b'
const CREATOR = 'user-1'

type KeyShape = {
  organizationId: string | null
  createdBy?: string | null
  sessionUserId?: string | null
}

function givenKey(key: KeyShape) {
  findApiKeyBySecret.mockResolvedValue({
    id: 'key-1',
    name: 'Integration key',
    tenantId: TENANT,
    organizationId: key.organizationId,
    createdBy: key.createdBy ?? null,
    sessionUserId: key.sessionUserId ?? null,
    rolesJson: [],
    expiresAt: null,
    lastUsedAt: null,
  })
}

function givenCreatorIn(organizationId: string | null) {
  emFindOne.mockImplementation(async (entity: unknown) => {
    if (entity === UserEntity) return { id: CREATOR, tenantId: TENANT, organizationId }
    return { id: 'x', tenant: { id: TENANT } }
  })
}

async function authenticate(secret: string) {
  const { getAuthFromRequest } = await import('@open-mercato/shared/lib/auth/server')
  return getAuthFromRequest(new Request('https://example.test/api/test', {
    headers: { 'x-api-key': secret },
  }))
}

describe('a regular key, resolved through createdBy', () => {
  let counter = 0

  beforeEach(async () => {
    jest.clearAllMocks()
    createRequestContainer.mockResolvedValue({ resolve: (name: string) => (name === 'em' ? em : null) })
    emFind.mockResolvedValue([])
    emFlush.mockResolvedValue(undefined)
    const { resetSharedApiKeyAuthCacheForTests } = await import('@open-mercato/shared/lib/auth/apiKeyAuthCache')
    resetSharedApiKeyAuthCacheForTests()
    counter += 1
  })

  const secret = () => `secret-${counter}`

  it('keeps working after its creator moves to another organization', async () => {
    // The bug, stated as a test. The key is scoped to org A and doing exactly
    // what it was created to do; the person who made it now sits in org B.
    givenKey({ organizationId: ORG_A, createdBy: CREATOR })
    givenCreatorIn(ORG_B)

    const auth = await authenticate(secret())

    expect(auth).not.toBeNull()
    expect(auth?.orgId).toBe(ORG_A)
  })

  it('refuses a key that reaches further than its creator', async () => {
    // A null organization is *unrestricted across the tenant* to RbacService.
    // Held by a key whose creator is confined to one organization, that is an
    // amplification — invariant I4 — and predates the creation-time rule that
    // now prevents minting one.
    givenKey({ organizationId: null, createdBy: CREATOR })
    givenCreatorIn(ORG_A)

    await expect(authenticate(secret())).resolves.toBeNull()
  })

  it('allows an unscoped key when its creator is unscoped too', async () => {
    givenKey({ organizationId: null, createdBy: CREATOR })
    givenCreatorIn(null)

    await expect(authenticate(secret())).resolves.not.toBeNull()
  })

  it('refuses a key whose creator no longer exists', async () => {
    // Fail-closed backstop. `api_keys` also revokes on `auth.user.deleted`; this
    // catches whatever that cascade missed, because an event bus is not a place
    // to put the last line of a security control.
    givenKey({ organizationId: ORG_A, createdBy: CREATOR })
    emFindOne.mockResolvedValue(null)

    await expect(authenticate(secret())).resolves.toBeNull()
  })

  it('refuses a key whose creator belongs to another tenant', async () => {
    givenKey({ organizationId: ORG_A, createdBy: CREATOR })
    emFindOne.mockImplementation(async (entity: unknown) => {
      if (entity === UserEntity) return { id: CREATOR, tenantId: 'tenant-2', organizationId: ORG_A }
      return { id: 'x', tenant: { id: TENANT } }
    })

    await expect(authenticate(secret())).resolves.toBeNull()
  })
})

describe('a session key, which acts as a person', () => {
  let counter = 100

  beforeEach(async () => {
    jest.clearAllMocks()
    createRequestContainer.mockResolvedValue({ resolve: (name: string) => (name === 'em' ? em : null) })
    emFind.mockResolvedValue([])
    emFlush.mockResolvedValue(undefined)
    const { resetSharedApiKeyAuthCacheForTests } = await import('@open-mercato/shared/lib/auth/apiKeyAuthCache')
    resetSharedApiKeyAuthCacheForTests()
    counter += 1
  })

  const secret = () => `secret-${counter}`

  it('still requires the key and the person to agree exactly', async () => {
    // Unchanged, and it must stay that way: a session key borrows an identity,
    // so anywhere it can reach that the person cannot is impersonation with
    // extra privileges.
    givenKey({ organizationId: ORG_A, sessionUserId: CREATOR, createdBy: CREATOR })
    givenCreatorIn(ORG_B)

    await expect(authenticate(secret())).resolves.toBeNull()
  })

  it('is refused when it is unscoped and the person is not', async () => {
    givenKey({ organizationId: null, sessionUserId: CREATOR })
    givenCreatorIn(ORG_A)

    await expect(authenticate(secret())).resolves.toBeNull()
  })

  it('is allowed when they match', async () => {
    givenKey({ organizationId: ORG_A, sessionUserId: CREATOR })
    givenCreatorIn(ORG_A)

    await expect(authenticate(secret())).resolves.not.toBeNull()
  })
})
