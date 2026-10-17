const authMock = jest.fn()
const loadAclMock = jest.fn()
const hasAllFeaturesMock = jest.fn()
const createRequestContainerMock = jest.fn()
const listConversationsMock = jest.fn()

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => authMock(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => createRequestContainerMock(...args),
}))

jest.mock('../../../../lib/conversation-storage', () => ({
  createConversationStorage: jest.fn(() => ({
    list: (...args: unknown[]) => listConversationsMock(...args),
  })),
  serializeAiChatConversation: (row: unknown) => row,
}))

import { GET } from '../route'

function buildRequest(query = ''): Request {
  return new Request(`http://localhost/api/ai_assistant/ai/conversations${query}`, {
    method: 'GET',
  })
}

describe('GET /api/ai/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authMock.mockResolvedValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    })
    hasAllFeaturesMock.mockImplementation((required: string[], features: string[]) =>
      required.every((feature) => features.includes(feature)),
    )
    createRequestContainerMock.mockResolvedValue({
      resolve: (name: string) => {
        if (name === 'rbacService') {
          return {
            loadAcl: (...args: unknown[]) => loadAclMock(...args),
            hasAllFeatures: (...args: unknown[]) => hasAllFeaturesMock(...args),
          }
        }
        return null
      },
    })
    loadAclMock.mockResolvedValue({
      features: ['ai_assistant.view'],
      isSuperAdmin: false,
    })
    listConversationsMock.mockResolvedValue({ items: [], nextCursor: null })
  })

  it('passes owner-only scope to storage for view-only callers', async () => {
    const response = await GET(buildRequest('?agent=catalog.assistant') as any)
    expect(response.status).toBe(200)
    expect(listConversationsMock).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        userId: 'user-1',
        canManageConversations: false,
      },
      expect.objectContaining({
        agentId: 'catalog.assistant',
      }),
    )
  })

  it('passes tenant-scoped manage scope when the caller has conversation management', async () => {
    loadAclMock.mockResolvedValueOnce({
      features: ['ai_assistant.view', 'ai_assistant.conversations.manage'],
      isSuperAdmin: false,
    })

    const response = await GET(buildRequest() as any)
    expect(response.status).toBe(200)
    expect(listConversationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        userId: 'user-1',
        canManageConversations: true,
      }),
      expect.any(Object),
    )
  })

  // ── CC-107 §3.1 ────────────────────────────────────────────────────────────
  // `auth.sub` is a SUBJECT STRING, not a user id. Passing it into the storage
  // context put it in `user_id` — a uuid column — so every key-backed caller
  // got `22P02 invalid input syntax for type uuid` from Postgres on the first
  // write (proven on a real PostgreSQL 16; probe committed with the fix).
  // `effectiveUserId` resolves the person; `onBehalfOfUserId` is what a machine
  // key names when it acts for somebody.
  describe('a key-backed principal', () => {
    it('is refused with a named code when it acts for nobody', async () => {
      authMock.mockResolvedValue({
        sub: 'ai_worker:key-1',
        keyId: 'key-1',
        tenantId: 'tenant-1',
        orgId: 'org-1',
      })

      const response = await GET(buildRequest() as any)
      expect(response.status).toBe(422)
      await expect(response.json()).resolves.toMatchObject({ code: 'ai_acting_user_required' })
      expect(listConversationsMock).not.toHaveBeenCalled()
    })

    it('is refused the same way for a plain service key', async () => {
      authMock.mockResolvedValue({
        sub: 'api_key:key-2',
        keyId: 'key-2',
        tenantId: 'tenant-1',
        orgId: 'org-1',
      })

      const response = await GET(buildRequest() as any)
      expect(response.status).toBe(422)
      expect(listConversationsMock).not.toHaveBeenCalled()
    })

    it('writes rows for the person it acts for — never for the subject string', async () => {
      authMock.mockResolvedValue({
        sub: 'ai_worker:key-3',
        keyId: 'key-3',
        userId: 'person-on-behalf',
        tenantId: 'tenant-1',
        orgId: 'org-1',
      })

      const response = await GET(buildRequest() as any)
      expect(response.status).toBe(200)
      expect(listConversationsMock).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'person-on-behalf' }),
        expect.any(Object),
      )
    })
  })
})
