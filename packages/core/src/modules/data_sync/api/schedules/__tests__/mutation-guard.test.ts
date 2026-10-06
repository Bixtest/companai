/** @jest-environment node */

const SCHEDULE_ID = '123e4567-e89b-12d3-a456-426614174070'
const INTEGRATION_ID = 'demo-provider'

const mockGetAuthFromRequest = jest.fn()

const mockScheduleService = {
  saveSchedule: jest.fn(),
}

const mockCrudMutationGuardService = {
  validateMutation: jest.fn(),
  afterMutationSuccess: jest.fn(),
}

// D2 (2026-10-06): the schedule route now runs the REGISTRY-based guard wrapper
// (`runRouteMutationGuards`) instead of the deprecated single-service pair. The
// wrapper runs every registered guard plus the bridged legacy service, and it is
// what now covers `create` (the legacy service only ever handled update/delete).
const mockRunRouteMutationGuards = jest.fn()
const mockRunAfterSuccess = jest.fn(async () => undefined)

jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => mockRunRouteMutationGuards(...args),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn((req: Request) => mockGetAuthFromRequest(req)),
}))

jest.mock('@open-mercato/shared/lib/http/readJsonSafe', () => ({
  readJsonSafe: jest.fn((req: Request) => req.json()),
}))

const mockContainer = {
  resolve: jest.fn((token: string) => {
      // R2a-custom: routes now wrap their write and audit entry in one
      // transaction, so the container must supply an EntityManager that models
      // that boundary. Inline execution is faithful for these tests.
      if (token === 'em') return { transactional: async (work: () => Promise<unknown>) => work() }
    if (token === 'dataSyncScheduleService') return mockScheduleService
    if (token === 'crudMutationGuardService') return mockCrudMutationGuardService
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

import { POST } from '../route'

function request() {
  return new Request('http://localhost/api/data_sync/schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      integrationId: INTEGRATION_ID,
      entityType: 'products',
      direction: 'import',
      scheduleType: 'cron',
      scheduleValue: '0 * * * *',
      timezone: 'UTC',
      fullSync: false,
      isEnabled: true,
    }),
  })
}

describe('data_sync schedule create mutation guard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthFromRequest.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' })
    mockScheduleService.saveSchedule.mockResolvedValue({
      id: SCHEDULE_ID,
      integrationId: INTEGRATION_ID,
      entityType: 'products',
      direction: 'import',
      scheduleType: 'cron',
      scheduleValue: '0 * * * *',
      timezone: 'UTC',
      fullSync: false,
      isEnabled: true,
      scheduledJobId: SCHEDULE_ID,
      lastRunAt: null,
      organizationId: 'org-1',
      tenantId: 'tenant-1',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      deletedAt: null,
    })
    mockCrudMutationGuardService.validateMutation.mockResolvedValue({ ok: true, shouldRunAfterSuccess: true, metadata: null })
    mockCrudMutationGuardService.afterMutationSuccess.mockResolvedValue(undefined)
    mockRunRouteMutationGuards.mockResolvedValue({
      ok: true,
      modifiedPayload: undefined,
      runAfterSuccess: mockRunAfterSuccess,
    })
  })

  it('runs the guard before the write and the after-success hook after it', async () => {
    const res = await POST(request())
    expect(res.status).toBe(201)
    expect(mockRunRouteMutationGuards).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        resourceKind: 'data_sync.schedule',
        operation: 'create',
      }),
    }))
    expect(mockScheduleService.saveSchedule).toHaveBeenCalled()
    expect(mockRunAfterSuccess).toHaveBeenCalled()
  })

  it('short-circuits the write when the guard blocks the mutation', async () => {
    mockRunRouteMutationGuards.mockResolvedValueOnce({
      ok: false,
      errorStatus: 403,
      errorBody: { error: 'Blocked by guard' },
      response: Response.json({ error: 'Blocked by guard' }, { status: 403 }),
    })

    const res = await POST(request())
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: 'Blocked by guard' })
    expect(mockScheduleService.saveSchedule).not.toHaveBeenCalled()
    expect(mockRunAfterSuccess).not.toHaveBeenCalled()
  })
})
