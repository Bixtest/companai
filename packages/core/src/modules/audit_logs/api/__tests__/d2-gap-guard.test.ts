/** @jest-environment node */
/**
 * D2-gap guards for the `audit_logs` undo/redo write routes.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT A DECORATION
 * ----------------------------------------------------
 * Undo and redo are the only two routes that can **reverse or replay** a
 * registered command. Before 2026-10-06 neither called any mutation guard, so a
 * guard set shipped for this module would have been silently skipped — the
 * D2-gap. `beginAuditLogsMutationGuard` closes that.
 *
 * The danger this file guards against is the one the project has hit before:
 * **a test that passes whether or not the guard is wired in.** The pre-existing
 * `undo.route.test.ts` / `redo.route.test.ts` did not mock the registry at all,
 * so they were green before this change and green after it — they say nothing
 * about the guard. Every assertion below is therefore written to go RED if the
 * wrapper is removed, and each was seen RED under a mutation (recorded in the
 * commit message).
 */
import { POST as undoPost } from '@open-mercato/core/modules/audit_logs/api/audit-logs/actions/undo/route'
import { POST as redoPost } from '@open-mercato/core/modules/audit_logs/api/audit-logs/actions/redo/route'

const runRouteMutationGuards = jest.fn()
jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => runRouteMutationGuards(...args),
}))

const mockRbac = { userHasAllFeatures: jest.fn() }
const mockLogs = {
  findByUndoToken: jest.fn(),
  latestUndoableForResource: jest.fn(),
  latestUndoableForActor: jest.fn(),
  findById: jest.fn(),
  latestUndoneForActor: jest.fn(),
  markRedone: jest.fn(),
}
const mockCommandBus = { undo: jest.fn(), execute: jest.fn() }

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => ({
    resolve: (token: string) => {
      if (token === 'rbacService') return mockRbac
      if (token === 'actionLogService') return mockLogs
      if (token === 'commandBus') return mockCommandBus
      return null
    },
  })),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveFeatureCheckContext: jest.fn(),
  resolveOrganizationScopeForRequest: jest.fn(),
}))

jest.mock('@open-mercato/shared/lib/commands/operationMetadata', () => ({
  serializeOperationMetadata: jest.fn(() => 'op-meta'),
}))

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ALLOW = { ok: true as const, runAfterSuccess: jest.fn(async () => undefined) }

async function setAuth(overrides: Record<string, unknown> = {}) {
  const { getAuthFromRequest } = await import('@open-mercato/shared/lib/auth/server')
  ;(getAuthFromRequest as jest.Mock).mockResolvedValue({
    sub: 'user-1',
    tenantId: 'tenant-1',
    orgId: 'org-1',
    ...overrides,
  })
}

async function primeScope() {
  const { resolveFeatureCheckContext, resolveOrganizationScopeForRequest } = await import(
    '@open-mercato/core/modules/directory/utils/organizationScope'
  )
  ;(resolveFeatureCheckContext as jest.Mock).mockResolvedValue({
    organizationId: 'org-1',
    scope: { allowedIds: null },
  })
  ;(resolveOrganizationScopeForRequest as jest.Mock).mockResolvedValue({
    selectedId: 'org-1',
    filterIds: ['org-1'],
    allowedIds: null,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  runRouteMutationGuards.mockReset()
  runRouteMutationGuards.mockResolvedValue(ALLOW)
  ALLOW.runAfterSuccess.mockClear()
  mockRbac.userHasAllFeatures.mockResolvedValue(false)
  mockLogs.findByUndoToken.mockResolvedValue(null)
  mockLogs.latestUndoableForResource.mockResolvedValue(null)
  mockLogs.latestUndoableForActor.mockResolvedValue(null)
  mockLogs.findById.mockResolvedValue(null)
  mockLogs.latestUndoneForActor.mockResolvedValue(null)
  mockLogs.markRedone.mockResolvedValue(undefined)
  mockCommandBus.undo.mockResolvedValue(undefined)
})

describe('undo route — the D2-gap guard is really wired in', () => {
  const target = {
    id: 'log-1',
    actorUserId: 'user-1',
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    resourceKind: 'auth.user',
    resourceId: 'user-42',
    executionState: 'done',
  }

  async function arrangeHappyPath() {
    await setAuth()
    await primeScope()
    mockLogs.findByUndoToken.mockResolvedValue(target)
    mockLogs.latestUndoableForResource.mockResolvedValue(target)
  }

  it('calls the registry guard set exactly once, evaluated against the LOG ROW\'s own resource', async () => {
    await arrangeHappyPath()

    const res = await undoPost(jsonRequest('http://localhost/x', { undoToken: 'tk-1' }))
    expect(res.status).toBe(200)

    // The guard must run — removing the wrapper call makes this assertion fail.
    expect(runRouteMutationGuards).toHaveBeenCalledTimes(1)
    const arg = runRouteMutationGuards.mock.calls[0][0]
    // The design decision under test: the guard sees the REVERSED resource
    // (`auth.user`), not the log table. A guard registered for `auth.user` must
    // be the one that governs undoing an `auth.user` write.
    expect(arg.input.resourceKind).toBe('auth.user')
    expect(arg.input.resourceId).toBe('user-42')
    expect(arg.input.operation).toBe('custom')
    // Scope and actor are carried from the resolved auth context.
    expect(arg.auth).toEqual(
      expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' }),
    )
    // `req` is handed over so the registry can derive method/headers itself.
    expect(arg.req).toBeInstanceOf(Request)
  })

  it('runs the guard BEFORE the command executes (a blocked undo must not have happened)', async () => {
    await arrangeHappyPath()
    const order: string[] = []
    runRouteMutationGuards.mockImplementation(async () => {
      order.push('guard')
      return ALLOW
    })
    mockCommandBus.undo.mockImplementation(async () => {
      order.push('undo')
    })

    await undoPost(jsonRequest('http://localhost/x', { undoToken: 'tk-1' }))
    expect(order).toEqual(['guard', 'undo'])
  })

  it('BLOCKS the undo when the guard set refuses, and does not run the command', async () => {
    await arrangeHappyPath()
    runRouteMutationGuards.mockResolvedValue({
      ok: false,
      errorBody: { error: 'Blocked by guard' },
      errorStatus: 403,
    })

    const res = await undoPost(jsonRequest('http://localhost/x', { undoToken: 'tk-1' }))
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: 'Blocked by guard' })
    // The decisive assertion: a blocked guard must stop the write entirely.
    expect(mockCommandBus.undo).not.toHaveBeenCalled()
  })

  it('falls back to the log-table kind only when the row names no resource', async () => {
    await setAuth()
    await primeScope()
    const bare = { ...target, resourceKind: null, resourceId: null }
    mockLogs.findByUndoToken.mockResolvedValue(bare)
    // A row with no resourceKind skips the resource lookup entirely and falls to
    // the actor lookup — so that is the one that must return the match.
    mockLogs.latestUndoableForActor.mockResolvedValue(bare)

    await undoPost(jsonRequest('http://localhost/x', { undoToken: 'tk-1' }))
    const arg = runRouteMutationGuards.mock.calls[0][0]
    expect(arg.input.resourceKind).toBe('audit_logs.action_log')
    expect(arg.input.resourceId).toBe('log-1')
  })

  it('does NOT reach the guard when the caller is unauthenticated (401 first)', async () => {
    const { getAuthFromRequest } = await import('@open-mercato/shared/lib/auth/server')
    ;(getAuthFromRequest as jest.Mock).mockResolvedValue(null)

    const res = await undoPost(jsonRequest('http://localhost/x', { undoToken: 'tk-1' }))
    expect(res.status).toBe(401)
    expect(runRouteMutationGuards).not.toHaveBeenCalled()
  })

  it('does NOT reach the guard when the undo token is rejected (400 first)', async () => {
    await setAuth()
    await primeScope()
    mockLogs.findByUndoToken.mockResolvedValue(null)

    const res = await undoPost(jsonRequest('http://localhost/x', { undoToken: 'tk-1' }))
    expect(res.status).toBe(400)
    expect(runRouteMutationGuards).not.toHaveBeenCalled()
  })
})

describe('redo route — the D2-gap guard is really wired in', () => {
  it('calls the registry guard set against the replayed resource and runs afterSuccess on success', async () => {
    await setAuth()
    await primeScope()
    const log = {
      id: 'log-9',
      commandId: 'cmd-9',
      actorUserId: 'user-1',
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      resourceKind: 'directory.organization',
      resourceId: 'org-9',
      // `resolveRedoInput` accepts the explicit `__redoInput` envelope; without
      // this the route 400s on "Redo data unavailable" before the guard runs,
      // which is its own behaviour and not what this test is about.
      commandPayload: { __redoInput: { id: 'org-9' } },
      actionLabel: 'Create organization',
      contextJson: null,
      executionState: 'undone',
    }
    mockLogs.findById.mockResolvedValue(log)
    mockLogs.latestUndoneForActor.mockResolvedValue(log)
    mockCommandBus.execute.mockResolvedValue({ logEntry: { id: 'new-log-1', undoToken: 'ut-1', createdAt: new Date() } })

    const res = await redoPost(jsonRequest('http://localhost/x', { logId: 'log-9' }))
    expect(res.status).toBe(200)
    expect(runRouteMutationGuards).toHaveBeenCalledTimes(1)
    expect(runRouteMutationGuards.mock.calls[0][0].input.resourceKind).toBe('directory.organization')
    expect(runRouteMutationGuards.mock.calls[0][0].input.resourceId).toBe('org-9')
    // afterSuccess runs only after the write committed.
    expect(ALLOW.runAfterSuccess).toHaveBeenCalledTimes(1)
  })
})
