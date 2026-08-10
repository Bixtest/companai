/** @jest-environment node */

/**
 * U2 — a routine save could delete every role's sidebar configuration.
 *
 * The screen sends `clearRoleIds` for roles it believes should no longer carry
 * this layout. Believing the client was the defect: the editor reset its
 * switches on every load, so the second save asked to clear everything, and the
 * only thing between that and the delete was a small red badge.
 *
 * A preset is now only clearable **by the layout that produced it**, and this
 * file tests that on the server, where it holds regardless of what the client
 * sends. A client that computes the wrong list is a bug anyone can ship; a
 * client that computes the wrong list and is obeyed is how data goes missing.
 */

import { PUT } from '../route'

const TENANT_ID = '123e4567-e89b-12d3-a456-426614174001'
const ORG_ID = '123e4567-e89b-12d3-a456-426614174002'
const USER_ID = '123e4567-e89b-12d3-a456-426614174003'
const VARIANT_ID = '123e4567-e89b-12d3-a456-426614174010'
const OTHER_VARIANT_ID = '123e4567-e89b-12d3-a456-426614174011'
const ROLE_OURS = '123e4567-e89b-12d3-a456-426614174050'
const ROLE_THEIRS = '123e4567-e89b-12d3-a456-426614174051'
const ROLE_UNKNOWN_SOURCE = '123e4567-e89b-12d3-a456-426614174052'

const mockGetAuthFromRequest = jest.fn()
const mockFindWithDecryption = jest.fn()
const mockFindOneWithDecryption = jest.fn()
const mockLoadRoleSidebarPreferenceSources = jest.fn()
const mockSaveRoleSidebarPreference = jest.fn()
const mockNativeDelete = jest.fn()

const mockEm = {
  find: jest.fn(),
  findOne: jest.fn(),
  nativeDelete: (...args: unknown[]) => mockNativeDelete(...args),
}

const mockRbacService = { userHasAllFeatures: jest.fn() }

const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'rbacService') return mockRbacService
    if (token === 'cache') return { deleteByTags: jest.fn(async () => 0) }
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn((req: Request) => mockGetAuthFromRequest(req)),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: jest.fn(async () => ({ locale: 'en' })),
}))

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => mockFindOneWithDecryption(...args),
  findWithDecryption: (...args: unknown[]) => mockFindWithDecryption(...args),
}))

jest.mock('@open-mercato/shared/lib/commands/flush', () => ({
  withAtomicFlush: jest.fn(async (_em: unknown, phases: Array<() => Promise<void>>) => {
    for (const phase of phases) await phase()
  }),
}))

jest.mock('@open-mercato/shared/lib/crud/optimistic-lock-command', () => ({
  enforceCommandOptimisticLock: jest.fn(async () => {}),
}))

jest.mock('../../../../services/sidebarPreferencesService', () => ({
  loadRoleSidebarPreferences: jest.fn(async () => new Map()),
  loadRoleSidebarPreferenceUpdatedAt: jest.fn(async () => null),
  loadRoleSidebarPreferenceUpdatedAtBatch: jest.fn(),
  loadRoleSidebarPreferenceSources: (...args: unknown[]) => mockLoadRoleSidebarPreferenceSources(...args),
  loadSidebarPreference: jest.fn(async () => null),
  loadSidebarPreferenceUpdatedAt: jest.fn(async () => null),
  saveRoleSidebarPreference: (...args: unknown[]) => mockSaveRoleSidebarPreference(...args),
  saveSidebarPreference: jest.fn(async (_em: unknown, _scope: unknown, input: unknown) => input),
}))

function save(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/auth/sidebar/preferences', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ groupOrder: [], hiddenItems: [], ...body }),
  })
}

/** Every role the caller could target, so scope checks pass. */
const roleRows = [
  { id: ROLE_OURS, name: 'Admin', tenantId: TENANT_ID },
  { id: ROLE_THEIRS, name: 'Employee', tenantId: TENANT_ID },
  { id: ROLE_UNKNOWN_SOURCE, name: 'Superadmin', tenantId: TENANT_ID },
]

function clearedRoleIds(): string[] {
  const call = mockNativeDelete.mock.calls[0]
  if (!call) return []
  const filter = call[1] as { role?: { $in?: string[] } }
  return filter.role?.$in ?? []
}

describe('clearing a role preset', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthFromRequest.mockResolvedValue({
      sub: USER_ID,
      tenantId: TENANT_ID,
      orgId: ORG_ID,
    })
    mockRbacService.userHasAllFeatures.mockResolvedValue(true)
    mockFindWithDecryption.mockResolvedValue(roleRows)
    mockFindOneWithDecryption.mockResolvedValue(null)
    mockSaveRoleSidebarPreference.mockResolvedValue({})
    mockNativeDelete.mockResolvedValue(1)
    // Who each role's preset belongs to: one is ours, one another layout's, one
    // from before anybody recorded a source.
    mockLoadRoleSidebarPreferenceSources.mockResolvedValue(new Map<string, string | null>([
      [ROLE_OURS, VARIANT_ID],
      [ROLE_THEIRS, OTHER_VARIANT_ID],
      [ROLE_UNKNOWN_SOURCE, null],
    ]))
  })

  it('removes a preset this layout produced', async () => {
    const response = await PUT(save({ variantId: VARIANT_ID, applyToRoles: [], clearRoleIds: [ROLE_OURS] }))

    expect(response.status).toBe(200)
    expect(clearedRoleIds()).toEqual([ROLE_OURS])
  })

  it('refuses to touch a preset produced by another layout', async () => {
    // This is the destructive path. The client asked; the server declines,
    // because that preset is somebody else's configuration.
    const response = await PUT(save({ variantId: VARIANT_ID, applyToRoles: [], clearRoleIds: [ROLE_THEIRS] }))

    expect(response.status).toBe(200)
    expect(mockNativeDelete).not.toHaveBeenCalled()
  })

  it('refuses to touch a preset whose source nobody recorded', async () => {
    // Rows written before the source column existed. Unknown is not "none", and
    // deleting on a guess is exactly the failure being fixed.
    const response = await PUT(save({ variantId: VARIANT_ID, applyToRoles: [], clearRoleIds: [ROLE_UNKNOWN_SOURCE] }))

    expect(response.status).toBe(200)
    expect(mockNativeDelete).not.toHaveBeenCalled()
  })

  it('clears nothing at all when the push comes from an unsaved layout', async () => {
    // With no variant there is nothing that can own a preset, so there is
    // nothing this save is entitled to remove.
    const response = await PUT(save({ applyToRoles: [], clearRoleIds: [ROLE_OURS, ROLE_THEIRS] }))

    expect(response.status).toBe(200)
    expect(mockNativeDelete).not.toHaveBeenCalled()
  })

  it('sorts a mixed list rather than refusing the request', async () => {
    // The caller is not doing anything wrong by offering roles it cannot see the
    // source of; failing the whole save would break an ordinary edit.
    const response = await PUT(save({
      variantId: VARIANT_ID,
      applyToRoles: [],
      clearRoleIds: [ROLE_OURS, ROLE_THEIRS, ROLE_UNKNOWN_SOURCE],
    }))

    expect(response.status).toBe(200)
    expect(clearedRoleIds()).toEqual([ROLE_OURS])
  })

  it('records which layout a preset came from when applying one', async () => {
    await PUT(save({ variantId: VARIANT_ID, applyToRoles: [ROLE_THEIRS], clearRoleIds: [] }))

    expect(mockSaveRoleSidebarPreference).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ roleId: ROLE_THEIRS, variantId: VARIANT_ID }),
      expect.anything(),
    )
  })

  it('never clears a role it is applying to in the same save', async () => {
    await PUT(save({ variantId: VARIANT_ID, applyToRoles: [ROLE_OURS], clearRoleIds: [ROLE_OURS] }))

    expect(mockNativeDelete).not.toHaveBeenCalled()
  })
})
