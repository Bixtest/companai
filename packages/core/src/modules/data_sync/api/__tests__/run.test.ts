/** @jest-environment node */

const mockGetAuthFromRequest = jest.fn()
const mockCreateRequestContainer = jest.fn()
const mockGetIntegration = jest.fn()
const mockGetDataSyncAdapter = jest.fn()
const mockStartDataSyncRun = jest.fn()

const mockSyncRunService = {
  findRunningOverlap: jest.fn(),
  resolveCursor: jest.fn(),
}

const mockProgressService = {}

const mockIntegrationStateService = {
  isEnabled: jest.fn(),
}

const mockCrudMutationGuardService = {
  validateMutation: jest.fn(),
  afterMutationSuccess: jest.fn(),
}

// D2 (2026-10-06): the data_sync run route now runs the REGISTRY-based guard
// wrapper (`runRouteMutationGuards`) instead of the deprecated single-service
// pair. The registry wrapper is what runs `custom`-operation guards, which the
// legacy DI service never covered. The test's intent is unchanged — a blocked
// guard must stop the run, and a passing guard must run its after-success.
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

jest.mock('@open-mercato/shared/lib/http/readJsonSafe', () => ({
  readJsonSafe: jest.fn((request: Request) => request.json()),
}))

jest.mock('@open-mercato/shared/modules/integrations/types', () => ({
  getIntegration: jest.fn((id: string) => mockGetIntegration(id)),
}))

jest.mock('../../lib/adapter-registry', () => ({
  getDataSyncAdapter: jest.fn((providerKey: string) => mockGetDataSyncAdapter(providerKey)),
}))

jest.mock('../../lib/start-run', () => ({
  startDataSyncRun: jest.fn((input) => mockStartDataSyncRun(input)),
}))

type RouteModule = typeof import('../run')
let postHandler: RouteModule['POST']

beforeAll(async () => {
  const routeModule = await import('../run')
  postHandler = routeModule.POST
})

describe('data_sync run route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthFromRequest.mockResolvedValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
      orgId: 'org-1',
    })
    mockCreateRequestContainer.mockResolvedValue({
      resolve: (token: string) => {
        if (token === 'dataSyncRunService') return mockSyncRunService
        if (token === 'progressService') return mockProgressService
        if (token === 'integrationStateService') return mockIntegrationStateService
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
    mockGetIntegration.mockReturnValue({
      id: 'sync_excel',
      providerKey: 'excel',
    })
    mockGetDataSyncAdapter.mockReturnValue({
      providerKey: 'excel',
      runMode: 'generic',
      direction: 'import',
      supportedEntities: ['customers.person'],
    })
    mockIntegrationStateService.isEnabled.mockResolvedValue(true)
    mockSyncRunService.findRunningOverlap.mockResolvedValue(null)
    mockSyncRunService.resolveCursor.mockResolvedValue(null)
    mockStartDataSyncRun.mockResolvedValue({
      run: { id: '11111111-1111-4111-8111-111111111111' },
      progressJob: { id: '22222222-2222-4222-8222-222222222222' },
    })
  })

  it('returns a controlled 422 for provider-managed adapters', async () => {
    mockGetDataSyncAdapter.mockReturnValueOnce({
      providerKey: 'excel',
      runMode: 'provider',
      direction: 'import',
      supportedEntities: ['customers.person'],
    })

    const response = await postHandler(new Request('http://localhost/api/data_sync/run', {
      method: 'POST',
      body: JSON.stringify({
        integrationId: 'sync_excel',
        entityType: 'customers.person',
        direction: 'import',
      }),
    }))

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'This integration must be started from its provider-specific import flow.',
      settingsPath: '/backend/integrations/sync_excel',
    })
    expect(mockStartDataSyncRun).not.toHaveBeenCalled()
  })

  it('starts generic adapters normally', async () => {
    const response = await postHandler(new Request('http://localhost/api/data_sync/run', {
      method: 'POST',
      body: JSON.stringify({
        integrationId: 'generic_sync',
        entityType: 'customers.person',
        direction: 'import',
        batchSize: 10,
      }),
    }))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      progressJobId: '22222222-2222-4222-8222-222222222222',
    })
    expect(mockStartDataSyncRun).toHaveBeenCalled()
    expect(mockRunRouteMutationGuards).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        resourceKind: 'data_sync.run',
        operation: 'custom',
      }),
    }))
    expect(mockRunAfterSuccess).toHaveBeenCalled()
  })

  it('short-circuits the run when the mutation guard blocks it', async () => {
    mockRunRouteMutationGuards.mockResolvedValueOnce({
      ok: false,
      errorStatus: 403,
      errorBody: { error: 'Blocked by guard' },
      response: Response.json({ error: 'Blocked by guard' }, { status: 403 }),
    })

    const response = await postHandler(new Request('http://localhost/api/data_sync/run', {
      method: 'POST',
      body: JSON.stringify({
        integrationId: 'generic_sync',
        entityType: 'customers.person',
        direction: 'import',
      }),
    }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Blocked by guard' })
    expect(mockStartDataSyncRun).not.toHaveBeenCalled()
    expect(mockRunAfterSuccess).not.toHaveBeenCalled()
  })

  it('does not run the after-success hook when the guard opts out', async () => {
    mockRunRouteMutationGuards.mockResolvedValueOnce({
      ok: true,
      modifiedPayload: undefined,
      runAfterSuccess: jest.fn(async () => undefined),
    })

    const response = await postHandler(new Request('http://localhost/api/data_sync/run', {
      method: 'POST',
      body: JSON.stringify({
        integrationId: 'generic_sync',
        entityType: 'customers.person',
        direction: 'import',
      }),
    }))

    expect(response.status).toBe(201)
    expect(mockStartDataSyncRun).toHaveBeenCalled()
    expect(mockCrudMutationGuardService.afterMutationSuccess).not.toHaveBeenCalled()
  })

  it('does not leak the error message or stack in the 500 response (CWE-209)', async () => {
    const internalDetail = '/srv/app/internal at customers_pkey; connection tenant_secret'
    mockStartDataSyncRun.mockRejectedValueOnce(new Error(internalDetail))

    const response = await postHandler(new Request('http://localhost/api/data_sync/run', {
      method: 'POST',
      body: JSON.stringify({
        integrationId: 'generic_sync',
        entityType: 'customers.person',
        direction: 'import',
      }),
    }))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'Failed to start data sync run.' })
    expect(JSON.stringify(body)).not.toContain(internalDetail)
  })
})
