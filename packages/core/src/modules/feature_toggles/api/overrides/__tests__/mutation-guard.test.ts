/** @jest-environment node */

import { PUT } from '../route'

const TENANT_ID = '123e4567-e89b-12d3-a456-426614174001'
const ORG_ID = '123e4567-e89b-12d3-a456-426614174002'
const TOGGLE_ID = '123e4567-e89b-12d3-a456-426614174090'
const OVERRIDE_ID = '123e4567-e89b-12d3-a456-426614174099'
const USER_ID = 'user-1'

const mockExecute = jest.fn(async () => ({ result: { overrideToggleId: OVERRIDE_ID }, logEntry: null }))
const mockFindOne = jest.fn()

const mockRunRouteMutationGuards = jest.fn()
const guardRunAfterSuccess = jest.fn(async () => {})

function guardAllow(overrides: Record<string, unknown> = {}) {
  return { ok: true, runAfterSuccess: guardRunAfterSuccess, ...overrides }
}
function guardDeny() {
  return { ok: false, errorStatus: 403, errorBody: { error: 'blocked-by-guard' } }
}

const mockEm = { findOne: jest.fn((...args: unknown[]) => mockFindOne(...args)) }

const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'commandBus') return { execute: mockExecute }
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => mockRunRouteMutationGuards(...args),
}))

jest.mock('../../../lib/utils', () => ({
  buildContext: jest.fn(async () => ({
    ctx: { container: mockContainer, auth: { sub: USER_ID, tenantId: TENANT_ID } },
    auth: { sub: USER_ID, tenantId: TENANT_ID },
  })),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveFeatureCheckContext: jest.fn(async () => ({ scope: { tenantId: TENANT_ID }, organizationId: ORG_ID })),
}))

jest.mock('../../../lib/queries', () => ({ getOverrides: jest.fn() }))

function putRequest() {
  return new Request('http://localhost/api/feature_toggles/overrides', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toggleId: TOGGLE_ID, isOverride: true, overrideValue: true }),
  })
}

describe('feature_toggles override mutation guard lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.OM_OPTIMISTIC_LOCK
    mockFindOne.mockResolvedValue(null)
    mockRunRouteMutationGuards.mockResolvedValue(guardAllow())
  })

  it('calls the registry with the route scope and runs after-success when allowed', async () => {
    // Existing row -> validated against its id, and the command returns the same
    // id, so there is no rebind: one registry call, one after-success run.
    mockFindOne.mockResolvedValue({ id: OVERRIDE_ID, updatedAt: new Date('2026-06-01T10:00:00.000Z') })
    mockExecute.mockResolvedValueOnce({ result: { overrideToggleId: OVERRIDE_ID }, logEntry: null })

    const res = await PUT(putRequest())

    expect(res.status).toBe(200)
    expect(mockRunRouteMutationGuards).toHaveBeenCalledTimes(1)
    expect(mockRunRouteMutationGuards).toHaveBeenCalledWith(
      expect.objectContaining({
        container: mockContainer,
        req: expect.any(Request),
        auth: { userId: USER_ID, tenantId: TENANT_ID, organizationId: ORG_ID },
        input: expect.objectContaining({
          resourceKind: 'feature_toggles.feature_toggle_override',
          resourceId: OVERRIDE_ID,
          operation: 'update',
          mutationPayload: { toggleId: TOGGLE_ID, isOverride: true, overrideValue: true },
        }),
      }),
    )
    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(guardRunAfterSuccess).toHaveBeenCalledTimes(1)
  })

  it('blocks the command when the mutation guard denies the write', async () => {
    mockRunRouteMutationGuards.mockResolvedValue(guardDeny())

    const res = await PUT(putRequest())

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('blocked-by-guard')
    expect(mockRunRouteMutationGuards).toHaveBeenCalledTimes(1)
    expect(mockExecute).not.toHaveBeenCalled()
    expect(guardRunAfterSuccess).not.toHaveBeenCalled()
  })

  it('does NOT run after-success when the guard blocks', async () => {
    mockRunRouteMutationGuards.mockResolvedValue(guardDeny())

    const res = await PUT(putRequest())

    expect(res.status).toBe(403)
    expect(mockExecute).not.toHaveBeenCalled()
    expect(guardRunAfterSuccess).not.toHaveBeenCalled()
  })

  it('rebinds the after-success hook to the produced override id', async () => {
    // No existing row -> validated against the toggle id; the command creates a
    // row and returns a different id (OVERRIDE_ID). The refetch for the produced
    // id re-collects the guard set, so the registry is called twice.
    const res = await PUT(putRequest())

    expect(res.status).toBe(200)
    expect(mockExecute).toHaveBeenCalledTimes(1)
    // first call: the validated id (toggle); second: the produced id (override row)
    expect(mockRunRouteMutationGuards).toHaveBeenCalledTimes(2)
    const second = mockRunRouteMutationGuards.mock.calls[1][0]
    expect(second.input.resourceId).toBe(OVERRIDE_ID)
    expect(guardRunAfterSuccess).toHaveBeenCalledTimes(1)
  })

  it('uses the existing override id as the guard resource id when a row exists', async () => {
    mockFindOne.mockResolvedValue({ id: OVERRIDE_ID, updatedAt: new Date('2026-06-01T10:00:00.000Z') })

    const res = await PUT(putRequest())

    expect(res.status).toBe(200)
    const input = mockRunRouteMutationGuards.mock.calls[0][0].input
    expect(input.resourceId).toBe(OVERRIDE_ID)
  })
})
