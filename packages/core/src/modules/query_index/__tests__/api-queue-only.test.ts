const mockGetAuthFromRequest = jest.fn()
jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
}))

const mockCreateRequestContainer = jest.fn()
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: (...args: unknown[]) => mockCreateRequestContainer(...args),
}))

const mockRecordIndexerLog = jest.fn(async () => undefined)
jest.mock('@open-mercato/shared/lib/indexers/status-log', () => ({
  recordIndexerLog: (...args: unknown[]) => mockRecordIndexerLog(...args),
}))

// Stub ONLY the registry call the module wrapper delegates to. We must NOT mock
// the module wrapper (`./mutation-guard`) — the wrapper is the code under test,
// and mocking it would make the two mutations in the proof invisible.
const runRouteMutationGuardsMock = jest.fn()
jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => runRouteMutationGuardsMock(...args),
}))

import { POST as reindexPost } from '../api/reindex'
import { POST as purgePost } from '../api/purge'

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/query_index', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** A passing registry result. `afterSuccess` records that it ran. */
function guardAllow() {
  const runAfterSuccess = jest.fn(async () => undefined)
  return {
    ok: true as const,
    runAfterSuccess,
    // The registry only queues `afterSuccess` when a guard asked for it; the
    // wrapper returns this runner regardless, and calling it is a no-op when
    // nothing queued. The route always calls it after a committed write.
    __runAfterSuccess: runAfterSuccess,
  }
}

/** A blocking registry result. */
function guardDeny() {
  return {
    ok: false as const,
    errorStatus: 409,
    errorBody: { error: 'blocked' },
    response: Response.json({ error: 'blocked' }, { status: 409 }),
  }
}

describe('query_index API persistent job dispatch', () => {
  const emitEvent = jest.fn(async () => undefined)

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthFromRequest.mockResolvedValue({
      tenantId: 'tenant-1',
      orgId: 'org-1',
      sub: 'user-1',
    })
    mockCreateRequestContainer.mockResolvedValue({
      resolve: jest.fn((name: string) => {
        if (name === 'em') return { em: true }
        if (name === 'eventBus') return { emitEvent }
        throw new Error(`Unexpected token: ${name}`)
      }),
    })
  })

  it('queues reindex without inline delivery', async () => {
    runRouteMutationGuardsMock.mockResolvedValue(guardAllow())

    const res = await reindexPost(makeRequest({ entityType: 'catalog:catalog_product' }))

    expect(res.status).toBe(200)
    expect(emitEvent).toHaveBeenCalledWith(
      'query_index.reindex',
      expect.objectContaining({
        entityType: 'catalog:catalog_product',
        tenantId: 'tenant-1',
        organizationId: 'org-1',
      }),
      { persistent: true, deliverInline: false },
    )
  })

  it('queues purge without inline delivery', async () => {
    runRouteMutationGuardsMock.mockResolvedValue(guardAllow())

    const res = await purgePost(makeRequest({ entityType: 'catalog:catalog_product' }))

    expect(res.status).toBe(200)
    expect(emitEvent).toHaveBeenCalledWith(
      'query_index.purge',
      {
        entityType: 'catalog:catalog_product',
        tenantId: 'tenant-1',
        organizationId: 'org-1',
      },
      { persistent: true, deliverInline: false },
    )
  })

  it('runs the mutation guard before and after a reindex write', async () => {
    const allow = guardAllow()
    runRouteMutationGuardsMock.mockResolvedValue(allow)

    const res = await reindexPost(makeRequest({ entityType: 'catalog:catalog_product' }))

    expect(res.status).toBe(200)
    expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          organizationId: 'org-1',
        }),
        input: expect.objectContaining({
          resourceKind: 'query_index',
          resourceId: 'catalog:catalog_product',
          operation: 'custom',
          mutationPayload: expect.objectContaining({ entityType: 'catalog:catalog_product' }),
        }),
        req: expect.any(Request),
      }),
    )
    expect(allow.__runAfterSuccess).toHaveBeenCalled()
    expect(runRouteMutationGuardsMock.mock.invocationCallOrder[0]).toBeLessThan(
      emitEvent.mock.invocationCallOrder[0],
    )
    expect(emitEvent.mock.invocationCallOrder[0]).toBeLessThan(
      allow.__runAfterSuccess.mock.invocationCallOrder[0],
    )
  })

  it('blocks a reindex write when the mutation guard rejects it', async () => {
    runRouteMutationGuardsMock.mockResolvedValueOnce(guardDeny())

    const res = await reindexPost(makeRequest({ entityType: 'catalog:catalog_product' }))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'blocked' })
    expect(emitEvent).not.toHaveBeenCalled()
  })

  it('runs the mutation guard before and after a purge write', async () => {
    const allow = guardAllow()
    runRouteMutationGuardsMock.mockResolvedValue(allow)

    const res = await purgePost(makeRequest({ entityType: 'catalog:catalog_product' }))

    expect(res.status).toBe(200)
    expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          organizationId: 'org-1',
        }),
        input: expect.objectContaining({
          resourceKind: 'query_index',
          resourceId: 'catalog:catalog_product',
          operation: 'custom',
          mutationPayload: expect.objectContaining({ entityType: 'catalog:catalog_product' }),
        }),
        req: expect.any(Request),
      }),
    )
    expect(allow.__runAfterSuccess).toHaveBeenCalled()
    expect(runRouteMutationGuardsMock.mock.invocationCallOrder[0]).toBeLessThan(
      emitEvent.mock.invocationCallOrder[0],
    )
    expect(emitEvent.mock.invocationCallOrder[0]).toBeLessThan(
      allow.__runAfterSuccess.mock.invocationCallOrder[0],
    )
  })

  it('blocks a purge write when the mutation guard rejects it', async () => {
    runRouteMutationGuardsMock.mockResolvedValueOnce(guardDeny())

    const res = await purgePost(makeRequest({ entityType: 'catalog:catalog_product' }))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'blocked' })
    expect(emitEvent).not.toHaveBeenCalled()
  })
})
