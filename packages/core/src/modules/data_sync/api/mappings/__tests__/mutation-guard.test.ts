/** @jest-environment node */

const MAPPING_ID = '123e4567-e89b-12d3-a456-426614174099'
const INTEGRATION_ID = 'demo-provider'

const mockGetAuthFromRequest = jest.fn()
const mockFindOneWithDecryption = jest.fn()

const mockEm = {
  create: jest.fn(),
  persist: jest.fn(() => ({ flush: jest.fn(async () => undefined) })),
  flush: jest.fn(async () => undefined),
  // R2a-custom: the route wraps its write and audit entry in one transaction.
  transactional: jest.fn(async (work: () => Promise<unknown>) => work()),
}

const mockCrudMutationGuardService = {
  validateMutation: jest.fn(),
  afterMutationSuccess: jest.fn(),
}

// D2 (2026-10-06): the mapping route now runs the REGISTRY-based guard wrapper
// (`runRouteMutationGuards`) instead of the deprecated single-service pair. The
// wrapper runs every registered guard plus the bridged legacy service, and it is
// what now covers `create` (the legacy service only ever handled update/delete).
// The test's intent is unchanged — a blocked guard stops the write; a passing
// guard runs its after-success after persistence.
const mockRunRouteMutationGuards = jest.fn()
const mockRunAfterSuccess = jest.fn(async () => undefined)

jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => mockRunRouteMutationGuards(...args),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn((req: Request) => mockGetAuthFromRequest(req)),
}))

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: jest.fn((...args: unknown[]) => mockFindOneWithDecryption(...args)),
  findAndCountWithDecryption: jest.fn(async () => [[], 0]),
}))

const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'crudMutationGuardService') return mockCrudMutationGuardService
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

import { POST } from '../route'

function request() {
  return new Request('http://localhost/api/data_sync/mappings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      integrationId: INTEGRATION_ID,
      entityType: 'products',
      mapping: { foo: 'bar' },
    }),
  })
}

describe('data_sync mapping create mutation guard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthFromRequest.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' })
    mockFindOneWithDecryption.mockResolvedValue(null)
    mockEm.create.mockReturnValue({
      id: MAPPING_ID,
      integrationId: INTEGRATION_ID,
      entityType: 'products',
      mapping: { foo: 'bar' },
    })
    mockCrudMutationGuardService.validateMutation.mockResolvedValue({ ok: true, shouldRunAfterSuccess: true, metadata: null })
    mockCrudMutationGuardService.afterMutationSuccess.mockResolvedValue(undefined)
    mockRunRouteMutationGuards.mockResolvedValue({
      ok: true,
      modifiedPayload: undefined,
      runAfterSuccess: mockRunAfterSuccess,
    })
  })

  it('runs the guard before the create write and the after-success hook after persistence', async () => {
    const res = await POST(request())
    expect(res.status).toBe(201)
    expect(mockRunRouteMutationGuards).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        resourceKind: 'data_sync.mapping',
        operation: 'create',
      }),
    }))
    expect(mockEm.persist).toHaveBeenCalled()
    expect(mockRunAfterSuccess).toHaveBeenCalled()
  })

  it('short-circuits the create when the guard blocks the mutation', async () => {
    mockRunRouteMutationGuards.mockResolvedValueOnce({
      ok: false,
      errorStatus: 403,
      errorBody: { error: 'Blocked by guard' },
      response: Response.json({ error: 'Blocked by guard' }, { status: 403 }),
    })

    const res = await POST(request())
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: 'Blocked by guard' })
    expect(mockEm.create).not.toHaveBeenCalled()
    expect(mockEm.persist).not.toHaveBeenCalled()
    expect(mockRunAfterSuccess).not.toHaveBeenCalled()
  })

  it('uses the update operation when a mapping already exists', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({
      id: MAPPING_ID,
      integrationId: INTEGRATION_ID,
      entityType: 'products',
      mapping: { old: 'value' },
    })

    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(mockRunRouteMutationGuards).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        resourceKind: 'data_sync.mapping',
        resourceId: MAPPING_ID,
        operation: 'update',
      }),
    }))
    expect(mockEm.flush).toHaveBeenCalled()
    expect(mockRunAfterSuccess).toHaveBeenCalled()
  })
})
