/** @jest-environment node */

const mockGetAuthFromRequest = jest.fn()
const mockCreateRequestContainer = jest.fn()

const mockSyncRunService = {
  getRun: jest.fn(),
  markStatus: jest.fn(),
}

const mockProgressService = {
  markCancelled: jest.fn(),
  getJob: jest.fn(),
  isCancellationRequested: jest.fn(),
}

const mockIntegrationStateService = {
  upsert: jest.fn(),
}

const mockIntegrationLogService = {
  write: jest.fn(),
}

const mockCrudMutationGuardService = {
  validateMutation: jest.fn(),
  afterMutationSuccess: jest.fn(),
}

// D2 (2026-10-06): the cancel route now runs the REGISTRY-based guard wrapper
// (`runRouteMutationGuards`) instead of the deprecated single-service pair. The
// wrapper is what runs `custom`-operation guards, which the legacy DI service
// never covered. The test's intent is unchanged — a blocked guard stops the
// cancellation; a passing guard runs its after-success after the write commits.
const mockRunRouteMutationGuards = jest.fn()
const mockRunAfterSuccess = jest.fn(async () => undefined)

jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => mockRunRouteMutationGuards(...args),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn((request: Request) => mockGetAuthFromRequest(request)),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(() => mockCreateRequestContainer()),
}))

type RouteModule = typeof import('../cancel')
let postHandler: RouteModule['POST']

beforeAll(async () => {
  const routeModule = await import('../cancel')
  postHandler = routeModule.POST
})

describe('data_sync cancel run route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthFromRequest.mockResolvedValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    })
    mockCreateRequestContainer.mockResolvedValue({
      resolve: (token: string) => {
      // R2a-custom: routes now wrap their write and audit entry in one
      // transaction, so the container must supply an EntityManager that models
      // that boundary. Inline execution is faithful for these tests.
      if (token === 'em') return { transactional: async (work: () => Promise<unknown>) => work() }
        if (token === 'dataSyncRunService') return mockSyncRunService
        if (token === 'progressService') return mockProgressService
        if (token === 'integrationStateService') return mockIntegrationStateService
        if (token === 'integrationLogService') return mockIntegrationLogService
        if (token === 'crudMutationGuardService') return mockCrudMutationGuardService
        throw new Error(`Unexpected token: ${token}`)
      },
    })
    mockCrudMutationGuardService.validateMutation.mockResolvedValue({ ok: true, shouldRunAfterSuccess: true, metadata: null })
    mockCrudMutationGuardService.afterMutationSuccess.mockResolvedValue(undefined)
    mockRunRouteMutationGuards.mockResolvedValue({
      ok: true,
      modifiedPayload: undefined,
      runAfterSuccess: mockRunAfterSuccess,
    })
    mockSyncRunService.getRun.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      integrationId: 'sync_excel',
      status: 'running',
      progressJobId: '22222222-2222-4222-8222-222222222222',
    })
    mockSyncRunService.markStatus.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', status: 'cancelled' })
    mockProgressService.markCancelled.mockResolvedValue(undefined)
    mockIntegrationStateService.upsert.mockResolvedValue(undefined)
    mockIntegrationLogService.write.mockResolvedValue(undefined)
  })

  it('returns 401 when auth is missing', async () => {
    mockGetAuthFromRequest.mockResolvedValueOnce(null)

    const response = await postHandler(new Request('http://localhost/api/data_sync/runs/1/cancel', { method: 'POST' }), {
      params: { id: '11111111-1111-4111-8111-111111111111' },
    })

    expect(response.status).toBe(401)
  })

  it('marks the run as cancelled and records operational state and logs', async () => {
    const response = await postHandler(
      new Request('http://localhost/api/data_sync/runs/11111111-1111-4111-8111-111111111111/cancel', { method: 'POST' }),
      { params: { id: '11111111-1111-4111-8111-111111111111' } },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mockProgressService.markCancelled).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      userId: 'user-1',
    })
    expect(mockSyncRunService.markStatus).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'cancelled',
      { organizationId: 'org-1', tenantId: 'tenant-1' },
    )
    expect(mockIntegrationStateService.upsert).toHaveBeenCalledWith('sync_excel', expect.objectContaining({
      lastHealthStatus: 'degraded',
      lastHealthCheckedAt: expect.any(Date),
    }), {
      organizationId: 'org-1',
      tenantId: 'tenant-1',
    })
    expect(mockIntegrationLogService.write).toHaveBeenCalledWith(expect.objectContaining({
      integrationId: 'sync_excel',
      runId: '11111111-1111-4111-8111-111111111111',
      level: 'warn',
      message: 'Sync run cancelled',
      payload: expect.objectContaining({
        operationalStatus: 'cancelled',
      }),
    }), {
      organizationId: 'org-1',
      tenantId: 'tenant-1',
    })
    expect(mockRunRouteMutationGuards).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        resourceKind: 'data_sync.run',
        resourceId: '11111111-1111-4111-8111-111111111111',
        operation: 'custom',
      }),
    }))
    expect(mockRunAfterSuccess).toHaveBeenCalled()
  })

  it('short-circuits the cancellation when the mutation guard blocks it', async () => {
    mockRunRouteMutationGuards.mockResolvedValueOnce({
      ok: false,
      errorStatus: 403,
      errorBody: { error: 'Blocked by guard' },
      response: Response.json({ error: 'Blocked by guard' }, { status: 403 }),
    })

    const response = await postHandler(
      new Request('http://localhost/api/data_sync/runs/11111111-1111-4111-8111-111111111111/cancel', { method: 'POST' }),
      { params: { id: '11111111-1111-4111-8111-111111111111' } },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Blocked by guard' })
    expect(mockSyncRunService.markStatus).not.toHaveBeenCalled()
    expect(mockProgressService.markCancelled).not.toHaveBeenCalled()
    expect(mockRunAfterSuccess).not.toHaveBeenCalled()
  })
})
