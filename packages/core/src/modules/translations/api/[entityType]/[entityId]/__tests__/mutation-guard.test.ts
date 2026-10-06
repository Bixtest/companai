const tenantId = '11111111-1111-4111-8111-111111111111'
const organizationId = '22222222-2222-4222-8222-222222222222'
const userId = '33333333-3333-4333-8333-333333333333'
const entityType = 'catalog:product'
const entityId = '44444444-4444-4444-8444-444444444444'
const rowId = '55555555-5555-4555-8555-555555555555'

const runRouteMutationGuardsMock = jest.fn()
const runAfterSuccessMock = jest.fn(async () => undefined)
const commandBusExecuteMock = jest.fn()

const db = {
  selectFrom: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  executeTakeFirst: jest.fn(),
}

const container = {
  resolve: jest.fn((name: string) => {
    if (name === 'commandBus') return { execute: (...args: unknown[]) => commandBusExecuteMock(...args) }
    throw new Error(`Unexpected container resolve: ${name}`)
  }),
}

const context = {
  container,
  auth: { tenantId, sub: userId },
  db,
  organizationId,
  tenantId,
  commandCtx: {
    container,
    auth: { tenantId, sub: userId },
    organizationScope: null,
    selectedOrganizationId: organizationId,
    organizationIds: [organizationId],
    request: null,
  },
}

jest.mock('@open-mercato/core/modules/translations/api/context', () => ({
  resolveTranslationsRouteContext: jest.fn(async () => context),
  requireTranslationFeatures: jest.fn(async () => undefined),
  resolveTranslationsActorId: jest.fn(() => userId),
}))

/**
 * Only the *registry call* is stubbed. The module wrapper
 * (`beginTranslationsMutationGuard`) runs for real, so a mutation that breaks the
 * wrapper's block path or its after-success runner — including the id re-binding
 * on the PUT route — is visible to these tests.
 *
 * D2-wide (2026-10-06): this suite used to mock the **deprecated**
 * `@open-mercato/shared/lib/crud/mutation-guard` pair. That is the wrong target
 * now — the routes no longer import it — and, more importantly, mocking the
 * wrapper or the deprecated pair would make the migration's own mutations
 * invisible. Stub the registry call only.
 */
jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => runRouteMutationGuardsMock(...args),
}))

import { PUT, DELETE } from '../route'

const makePutRequest = () =>
  new Request(`http://localhost/api/translations/${entityType}/${entityId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ en: { title: 'Hello' } }),
  })

const makeDeleteRequest = () =>
  new Request(`http://localhost/api/translations/${entityType}/${entityId}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  })

const routeParams = { params: { entityType, entityId } }

const guardAllow = (metadata: Record<string, unknown> = { token: 'guard' }) => ({
  ok: true as const,
  metadata,
  runAfterSuccess: runAfterSuccessMock,
})
const guardDeny = (errorBody: Record<string, unknown>, errorStatus = 409) => ({
  ok: false as const,
  errorStatus,
  errorBody,
  response: new Response(),
})

describe('translations entity write routes mutation guard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    db.selectFrom.mockReturnThis()
    db.select.mockReturnThis()
    db.selectAll.mockReturnThis()
    db.where.mockReturnThis()
    db.executeTakeFirst.mockResolvedValue({
      id: rowId,
      entity_type: entityType,
      entity_id: entityId,
      translations: { en: { title: 'Hello' } },
      created_at: new Date('2026-04-11T08:00:00.000Z'),
      updated_at: new Date('2026-04-11T08:00:00.000Z'),
    })
    runRouteMutationGuardsMock.mockResolvedValue(guardAllow())
    runAfterSuccessMock.mockResolvedValue(undefined)
    commandBusExecuteMock.mockResolvedValue({ result: { rowId }, logEntry: null })
  })

  it('runs the registry guard and after-success hook when saving translations (PUT)', async () => {
    const response = await PUT(makePutRequest(), routeParams)

    expect(response.status).toBe(200)
    expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        container,
        auth: expect.objectContaining({ userId, tenantId, organizationId }),
        input: expect.objectContaining({
          resourceKind: 'translations.translation',
          resourceId: `${entityType}:${entityId}`,
          operation: 'update',
        }),
      }),
    )
    expect(commandBusExecuteMock).toHaveBeenCalledTimes(1)
    // The guard is validated against the composite id, but the after-success is
    // re-bound to the generated row id the write produced.
    expect(runRouteMutationGuardsMock).toHaveBeenCalledTimes(2)
    expect(runRouteMutationGuardsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          resourceKind: 'translations.translation',
          resourceId: rowId,
          operation: 'update',
        }),
      }),
    )
    expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
  })

  it('does not re-collect the guard when the write produces the id that was validated (PUT)', async () => {
    // The write returns the composite id it was validated against — the common
    // path for an update, where no new row is materialised.
    commandBusExecuteMock.mockResolvedValue({ result: { rowId: `${entityType}:${entityId}` }, logEntry: null })

    const response = await PUT(makePutRequest(), routeParams)

    expect(response.status).toBe(200)
    expect(runRouteMutationGuardsMock).toHaveBeenCalledTimes(1)
    expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
  })

  it('aborts the save before mutating when the guard blocks the write (PUT)', async () => {
    runRouteMutationGuardsMock.mockResolvedValue(guardDeny({ error: 'Conflict' }))

    const response = await PUT(makePutRequest(), routeParams)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'Conflict' })
    expect(commandBusExecuteMock).not.toHaveBeenCalled()
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('runs the registry guard and after-success hook when deleting translations (DELETE)', async () => {
    const response = await DELETE(makeDeleteRequest(), routeParams)

    expect(response.status).toBe(204)
    expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        container,
        auth: expect.objectContaining({ userId, tenantId, organizationId }),
        input: expect.objectContaining({
          resourceKind: 'translations.translation',
          resourceId: `${entityType}:${entityId}`,
          operation: 'delete',
        }),
      }),
    )
    expect(commandBusExecuteMock).toHaveBeenCalledTimes(1)
    expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
  })

  it('aborts the delete before mutating when the guard blocks the write (DELETE)', async () => {
    runRouteMutationGuardsMock.mockResolvedValue(guardDeny({ error: 'Conflict' }))

    const response = await DELETE(makeDeleteRequest(), routeParams)

    expect(response.status).toBe(409)
    expect(commandBusExecuteMock).not.toHaveBeenCalled()
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })
})
