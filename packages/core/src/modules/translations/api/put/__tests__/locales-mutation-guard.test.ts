const tenantId = '11111111-1111-4111-8111-111111111111'
const organizationId = '22222222-2222-4222-8222-222222222222'
const userId = '33333333-3333-4333-8333-333333333333'

const runRouteMutationGuardsMock = jest.fn()
const runAfterSuccessMock = jest.fn(async () => undefined)
const setValueMock = jest.fn()

const container = {
  resolve: jest.fn((name: string) => {
    if (name === 'moduleConfigService') return { setValue: (...args: unknown[]) => setValueMock(...args) }
    throw new Error(`Unexpected container resolve: ${name}`)
  }),
}

const context = {
  container,
  auth: { tenantId, sub: userId },
  organizationId,
  tenantId,
}

jest.mock('@open-mercato/core/modules/translations/api/context', () => ({
  resolveTranslationsRouteContext: jest.fn(async () => context),
  requireTranslationFeatures: jest.fn(async () => undefined),
  resolveTranslationsActorId: jest.fn(() => userId),
}))

/**
 * Only the *registry call* is stubbed. The module wrapper
 * (`beginTranslationsMutationGuard`) runs for real, so a mutation that breaks the
 * wrapper's block path or its after-success runner is visible to these tests.
 *
 * D2-wide (2026-10-06): this suite used to mock the **deprecated**
 * `@open-mercato/shared/lib/crud/mutation-guard` pair. That is the wrong target
 * now — the route no longer imports it — and, more importantly, mocking the
 * wrapper or the deprecated pair would make the migration's own mutations
 * invisible. Stub the registry call only.
 */
jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => runRouteMutationGuardsMock(...args),
}))

import PUT from '../locales'

const makeRequest = () =>
  new Request('http://localhost/api/translations/locales', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locales: ['en', 'fr'] }),
  })

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

describe('translations locales route mutation guard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    runRouteMutationGuardsMock.mockResolvedValue(guardAllow())
    runAfterSuccessMock.mockResolvedValue(undefined)
    setValueMock.mockResolvedValue(undefined)
  })

  it('runs the registry guard and after-success hook when updating supported locales', async () => {
    const response = await PUT(makeRequest())

    expect(response.status).toBe(200)
    expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        container,
        auth: expect.objectContaining({ userId, tenantId, organizationId }),
        input: expect.objectContaining({
          resourceKind: 'translations.locales',
          resourceId: 'supported_locales',
          operation: 'custom',
        }),
      }),
    )
    expect(setValueMock).toHaveBeenCalledWith(
      'translations',
      'supported_locales',
      ['en', 'fr'],
      { tenantId },
    )
    expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates and normalises locales before the write (behaviour preserved)', async () => {
    const request = new Request('http://localhost/api/translations/locales', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locales: ['EN', 'fr', 'en '] }),
    })

    const response = await PUT(request)

    expect(response.status).toBe(200)
    expect(setValueMock).toHaveBeenCalledWith(
      'translations',
      'supported_locales',
      ['en', 'fr'],
      { tenantId },
    )
  })

  it('aborts the locale update before persisting when the guard blocks the write', async () => {
    runRouteMutationGuardsMock.mockResolvedValue(guardDeny({ error: 'Conflict' }))

    const response = await PUT(makeRequest())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'Conflict' })
    expect(setValueMock).not.toHaveBeenCalled()
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })
})
