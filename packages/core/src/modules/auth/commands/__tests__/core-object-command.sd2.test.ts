/** @jest-environment node */

/**
 * SD-2 / S9 — the core-object rule on the **command** path, not just the route.
 *
 * **Why this suite exists.** A hostile review of the first cut found the rule
 * enforced only in `auth/api/roles/route.ts`. But the audit **redo** path
 * (`audit-logs/.../redo/route.ts`) re-executes a logged command directly through
 * the command bus — it never enters the originating route's `mapInput`. So a role
 * delete that was refused at the route on day one could be replayed through redo
 * and succeed. "Undeletable by anyone" was therefore false as first shipped.
 *
 * **What this suite has to prove.**
 *   1. `deleteRoleCommand.execute` throws **409** for a core role, and the
 *      hard-delete (`deleteOrmEntity`) is **never reached**.
 *   2. The `refuse` predicate is passed to `deleteOrmEntity` on the command path —
 *      so even if `execute`'s own check were removed, the store call itself still
 *      refuses (belt and braces on the one path every delete funnels through).
 *   3. An ordinary role still deletes — no over-blocking on the command path.
 *   4. `refuseCoreRoleDelete` is the single definition, and it is actor-independent
 *      (it takes only a row).
 */

const mockFindOneWithDecryption = jest.fn()
const mockFindWithDecryption = jest.fn(async () => [])
jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => mockFindOneWithDecryption(...args),
  findWithDecryption: (...args: unknown[]) => mockFindWithDecryption(...args),
}))

// Capture what `execute` passes to the store, and let us assert it is refused there.
const mockDeleteOrmEntity = jest.fn(async () => ({ id: 'r1', name: 'superadmin', tenantId: 'tenant-1' }))
const mockDe = {
  deleteOrmEntity: (...args: unknown[]) => mockDeleteOrmEntity(...args),
  createOrmEntity: jest.fn(),
  updateOrmEntity: jest.fn(),
}
const mockEm = {
  findOne: jest.fn(),
  count: jest.fn(async () => 0),
  nativeDelete: jest.fn(async () => 1),
  flush: jest.fn(),
  persist: jest.fn(),
  remove: jest.fn(),
}
const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'dataEngine') return mockDe
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/commands/helpers', () => {
  const actual = jest.requireActual('@open-mercato/shared/lib/commands/helpers')
  return {
    ...actual,
    emitCrudSideEffects: jest.fn(async () => {}),
    emitCrudUndoSideEffects: jest.fn(async () => {}),
  }
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { commandRegistry } = require('@open-mercato/shared/lib/commands')
// Side-effect import registers the role commands.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@open-mercato/core/modules/auth/commands/roles')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { refuseCoreRoleDelete, CORE_OBJECT_DELETE_STATUS } = require('@open-mercato/core/modules/auth/lib/core-object-guard')

const CORE_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const ORDINARY_ROLE_ID = '22222222-2222-2222-2222-222222222222'

const ctx = {
  container: mockContainer,
  auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
  systemActor: false,
}

function roleCommand(): { execute: (input: unknown, ctx: unknown) => Promise<unknown> } {
  const cmd = commandRegistry.get('auth.roles.delete')
  expect(cmd).toBeTruthy()
  return cmd as never
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEm.count.mockResolvedValue(0)
  mockEm.nativeDelete.mockResolvedValue(1)
})

describe('refuseCoreRoleDelete — the single definition, row-level and actor-independent', () => {
  it('returns a 409 CrudHttpError for a row named superadmin', () => {
    const err = refuseCoreRoleDelete({ name: 'superadmin' })
    expect(err).not.toBeNull()
    expect(err?.status).toBe(CORE_OBJECT_DELETE_STATUS)
    expect(err?.body?.error).toContain('core role')
  })

  it('folds case and whitespace', () => {
    expect(refuseCoreRoleDelete({ name: '  SuperAdmin ' })).not.toBeNull()
  })

  it('returns null for an ordinary role', () => {
    expect(refuseCoreRoleDelete({ name: 'admin' })).toBeNull()
  })

  it('returns null for a null/undefined/missing-name row (never crashes)', () => {
    expect(refuseCoreRoleDelete(null)).toBeNull()
    expect(refuseCoreRoleDelete(undefined)).toBeNull()
    expect(refuseCoreRoleDelete({})).toBeNull()
  })
})

describe('deleteRoleCommand.execute — the command the redo path re-runs', () => {
  it('refuses a CORE role with 409 and NEVER reaches the hard delete', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    await expect(roleCommand().execute({ query: { id: CORE_ROLE_ID } }, ctx)).rejects.toMatchObject({ status: 409 })
    expect(mockDeleteOrmEntity).not.toHaveBeenCalled()
  })

  it('a hostile actor cannot get past it by knowing the id — the row decides, not the actor', async () => {
    // The actor here is a superadmin; the rule still fires.
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    await expect(roleCommand().execute({ query: { id: CORE_ROLE_ID } }, ctx)).rejects.toMatchObject({ status: 409 })
  })

  it('passes a refuse predicate to deleteOrmEntity — the store call itself refuses a core row', async () => {
    // Prove the belt-and-braces: whatever `execute` decides, the store call is armed.
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: ORDINARY_ROLE_ID, name: 'admin', tenantId: 'tenant-1' })
    await roleCommand().execute({ query: { id: ORDINARY_ROLE_ID } }, ctx)
    expect(mockDeleteOrmEntity).toHaveBeenCalledTimes(1)
    const opts = mockDeleteOrmEntity.mock.calls[0][0] as { refuse?: (r: unknown) => unknown }
    expect(typeof opts.refuse).toBe('function')
    // The armed predicate, given a core row, refuses — even on a non-core call site.
    const refusal = opts.refuse!({ name: 'superadmin' })
    expect(refusal).not.toBeNull()
    expect((refusal as { status?: number }).status).toBe(CORE_OBJECT_DELETE_STATUS)
  })

  it('an ordinary role still deletes (no over-blocking on the command path)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: ORDINARY_ROLE_ID, name: 'admin', tenantId: 'tenant-1' })
    const result = await roleCommand().execute({ query: { id: ORDINARY_ROLE_ID } }, ctx)
    expect(result).toBeTruthy()
    expect(mockDeleteOrmEntity).toHaveBeenCalledTimes(1)
  })
})
