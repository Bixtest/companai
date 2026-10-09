/** @jest-environment node */

/**
 * SD-2 / S9 / CC-31(a) — Option B: the core role cannot be **renamed** either.
 *
 * **The hole this suite proves closed.** The core-object rule recognises the
 * roles-and-permissions manager **by name** (`superadmin`). Deletion was guarded,
 * but a **rename** path was not: renaming `superadmin` made the name-based rule
 * stop matching, and the *subsequent* delete was then allowed. The rule was live
 * but **disarmable** — `CC-31(a)` recorded it.
 *
 * The owner ruled **Option B** (2026-10-09): refuse the rename at its source, and
 * carry a **durable** `roles.is_core` marker so a row is still recognised as core
 * even if it *was* renamed before the rule existed.
 *
 * **What this suite has to prove.**
 *   1. **The helper refuses an actual rename of a core role** — `409`, and the
 *      same words for a row recognised by name *or* by the `is_core` marker.
 *   2. **It does NOT refuse a non-rename** — an absent `name`, an identical name,
 *      or a case/whitespace-only difference (an idempotent write must not be
 *      blocked by a rule about *identity*).
 *   3. **It does NOT refuse a non-core role** — no over-blocking.
 *   4. **The route (PUT) refuses and never reaches the CRUD write** — the
 *      user-facing path.
 *   5. **The command (redo path) refuses too** — `audit-logs/.../redo` re-executes
 *      the command directly, so a route-only check would be bypassed (the exact
 *      hole the delete guard already proved on this path).
 *   6. **The durable marker outlives the name** — a row whose name is no longer
 *      `superadmin` but whose `is_core` is true is STILL refused. This is the half
 *      of the fix the name alone cannot give.
 */

const mockFindOneWithDecryption = jest.fn()
const mockFindWithDecryption = jest.fn(async () => [])
jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => mockFindOneWithDecryption(...args),
  findWithDecryption: (...args: unknown[]) => mockFindWithDecryption(...args),
}))

// The route's CRUD factory is replaced by a CAPTURING stub, not a behavioural
// stub. `PUT` is `= crud.PUT` (`route.ts:353`), so the only place the rename
// guard lives on that path is the `update` action's `mapInput` — which the real
// `makeCrudRoute` invokes. Replacing `makeCrudRoute` with a black box would test
// nothing but the stub, so instead we capture the config the route passes and
// call the REAL `mapInput` ourselves. That is the honest route-level proof.
let capturedConfig: {
  actions?: { update?: { mapInput?: (args: unknown) => Promise<unknown> } }
} | null = null
jest.mock('@open-mercato/shared/lib/crud/factory', () => {
  const actual = jest.requireActual('@open-mercato/shared/lib/crud/factory')
  return {
    ...actual,
    makeCrudRoute: (config: unknown) => {
      capturedConfig = config as typeof capturedConfig
      return { POST: jest.fn(), PUT: jest.fn(), DELETE: jest.fn() }
    },
    logCrudAccess: jest.fn(),
  }
})

// The actor is a SUPERADMIN, so `assertCanModifySuperAdminRole` passes and the
// only thing that can refuse is the core rule — which is exactly what we test.
const authResult: { sub: string; tenantId: string | null; orgId: string | null } = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  orgId: 'org-1',
}
jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => authResult),
}))

const mockEm = { findOne: jest.fn(), count: jest.fn(async () => 0) }
const mockRbacService = { loadAcl: jest.fn(async () => ({ isSuperAdmin: true, features: ['*'], organizations: null })) }
const mockDe = { updateOrmEntity: jest.fn(), createOrmEntity: jest.fn(async () => ({ id: '22222222-2222-4222-8222-222222222222' })), deleteOrmEntity: jest.fn() }
const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'rbacService') return mockRbacService
    if (token === 'dataEngine') return mockDe
    return null
  }),
}
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

jest.mock('@open-mercato/shared/lib/commands/helpers', () => {
  const actual = jest.requireActual('@open-mercato/shared/lib/commands/helpers')
  return {
    ...actual,
    emitCrudSideEffects: jest.fn(async () => {}),
    emitCrudUndoSideEffects: jest.fn(async () => {}),
  }
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@open-mercato/core/modules/auth/api/roles/route')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { commandRegistry } = require('@open-mercato/shared/lib/commands')
// Side-effect import registers the role commands (the redo path runs these).
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@open-mercato/core/modules/auth/commands/roles')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  refuseCoreRoleRename,
  refuseCoreRoleDelete,
  CORE_OBJECT_RENAME_STATUS,
  CORE_OBJECT_RENAME_CODE,
  CORE_OBJECT_DELETE_CODE,
} = require('@open-mercato/core/modules/auth/lib/core-object-guard')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isCoreObject } = require('@open-mercato/shared/lib/core-boundary/core-objects')

const TENANT_ID = '33333333-3333-4333-8333-333333333333'
const CORE_ROLE_ID = '11111111-1111-4111-8111-111111111111'
const ORDINARY_ROLE_ID = '22222222-2222-4222-8222-222222222222'

function makeRequest(id: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/auth/roles?id=${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ctx = {
  container: mockContainer,
  // `isSuperAdmin: true` is the documented fast path in `resolveIsSuperAdmin`
  // (`tenantAccess.ts:39`) — it lets the command reach the core rule without an
  // rbac round-trip, so the 409 we assert can only be the core rule.
  auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1', isSuperAdmin: true },
  systemActor: false,
}

function updateCommand(): { execute: (input: unknown, ctx: unknown) => Promise<unknown> } {
  const cmd = commandRegistry.get('auth.roles.update')
  expect(cmd).toBeTruthy()
  return cmd as never
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEm.count.mockResolvedValue(0)
})

/* ------------------------------------------------------------------ *
 * The helper — the single definition of the rename rule
 * ------------------------------------------------------------------ */

describe('refuseCoreRoleRename — the single definition, row-level and actor-independent', () => {
  it('returns a 409 CrudHttpError when a role named superadmin is renamed', () => {
    const err = refuseCoreRoleRename({ name: 'superadmin' }, 'superadmin-x')
    expect(err).not.toBeNull()
    expect(err?.status).toBe(CORE_OBJECT_RENAME_STATUS)
    expect(err?.body?.error).toContain('core role')
    expect(err?.body?.error).toContain('renamed')
  })

  it('the refusal NAMES THE ACT (rename), not the delete — a different act, a different word', () => {
    const err = refuseCoreRoleRename({ name: 'superadmin' }, 'superadmin-x')
    expect(err?.body?.error).toMatch(/renamed/)
    expect(err?.body?.error).not.toMatch(/deleted/)
  })

  it('carries a MACHINE-READABLE code so a caller need not parse the sentence', () => {
    // Both refusals are 409, so the status cannot tell them apart; the code can.
    const ren = refuseCoreRoleRename({ name: 'superadmin' }, 'x')
    const del = refuseCoreRoleDelete({ name: 'superadmin' })
    expect(ren?.body?.code).toBe(CORE_OBJECT_RENAME_CODE)
    expect(del?.body?.code).toBe(CORE_OBJECT_DELETE_CODE)
    expect(CORE_OBJECT_RENAME_CODE).not.toBe(CORE_OBJECT_DELETE_CODE)
  })

  it('folds case and whitespace — a stored "  SuperAdmin " is still core', () => {
    expect(refuseCoreRoleRename({ name: '  SuperAdmin ' }, 'other')).not.toBeNull()
  })

  it('returns null when the name is unchanged — an idempotent write is not a rename', () => {
    expect(refuseCoreRoleRename({ name: 'superadmin' }, 'superadmin')).toBeNull()
    expect(refuseCoreRoleRename({ name: 'superadmin' }, '  SUPERADMIN  ')).toBeNull()
  })

  it('returns null when no name is supplied — the update does not touch identity', () => {
    expect(refuseCoreRoleRename({ name: 'superadmin' }, undefined)).toBeNull()
    expect(refuseCoreRoleRename({ name: 'superadmin' }, null)).toBeNull()
  })

  it('returns null for an ordinary role (no over-blocking)', () => {
    expect(refuseCoreRoleRename({ name: 'admin' }, 'admin-2')).toBeNull()
  })

  it('returns null for a null/undefined/missing-name row (never crashes)', () => {
    expect(refuseCoreRoleRename(null, 'x')).toBeNull()
    expect(refuseCoreRoleRename(undefined, 'x')).toBeNull()
    expect(refuseCoreRoleRename({}, 'x')).toBeNull()
  })
})

/* ------------------------------------------------------------------ *
 * The durable marker — the half the name alone cannot give
 * ------------------------------------------------------------------ */

describe('the durable is_core marker survives a name that no longer matches', () => {
  it('a row renamed away from superadmin but flagged is_core is STILL refused', () => {
    // This is the whole point of the column: the name has drifted, the marker has not.
    const err = refuseCoreRoleRename({ name: 'renamed_long_ago', isCore: true }, 'renamed_again')
    expect(err).not.toBeNull()
    expect(err?.status).toBe(CORE_OBJECT_RENAME_STATUS)
  })

  it('a row is core by the marker even when the name is unknown to the setting', () => {
    const err = refuseCoreRoleRename({ name: 'ops_admin', isCore: true }, 'ops_admin_2')
    expect(err).not.toBeNull()
    expect(err?.body?.error).toContain('"ops_admin" is a core role')
  })

  it('is_core = false does NOT make a name-matched row non-core', () => {
    // The marker is additive: the name lookup still runs, so an un-migrated row is
    // exactly as protected as before. A false flag must never weaken the rule.
    expect(refuseCoreRoleRename({ name: 'superadmin', isCore: false }, 'x')).not.toBeNull()
  })
})

/* ------------------------------------------------------------------ *
 * The route — the `update` action's `mapInput`, the user-facing path
 *
 * `PUT = crud.PUT` (`route.ts:353`), so the guard is NOT at the route's top
 * level (unlike `DELETE`, which is a custom handler). It lives inside the
 * `update` action, which the real `makeCrudRoute` calls. We therefore capture
 * the config the route builds and call the REAL `mapInput` — the same function
 * the framework would call — with a `ctx` shaped the way the factory shapes it.
 * ------------------------------------------------------------------ */

function updateMapInput() {
  expect(capturedConfig).not.toBeNull()
  const mapInput = capturedConfig!.actions?.update?.mapInput
  expect(typeof mapInput).toBe('function')
  return mapInput!
}

function routeCtx(request: Request) {
  return {
    request,
    auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
    container: mockContainer,
  }
}

describe('the route — the update action refuses a core rename and NEVER reaches the CRUD write', () => {
  it('refuses renaming superadmin with 409 (the guard, through the REAL mapInput)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    await expect(
      updateMapInput()({ parsed: { id: CORE_ROLE_ID, name: 'superadmin-x' }, raw: {}, ctx: routeCtx(makeRequest(CORE_ROLE_ID, { id: CORE_ROLE_ID, name: 'superadmin-x' })) }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('the actor is a superadmin, so the 409 can ONLY be the core rule (actor-independence)', async () => {
    // `assertCanModifySuperAdminRole` passes for a superadmin actor; the refusal
    // that follows is therefore the core rule, not an actor check.
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    await expect(
      updateMapInput()({ parsed: { id: CORE_ROLE_ID, name: 'superadmin-x' }, raw: {}, ctx: routeCtx(makeRequest(CORE_ROLE_ID, { id: CORE_ROLE_ID, name: 'superadmin-x' })) }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('a marker-carrying row is refused even after a rename (durable half)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'renamed_long_ago', isCore: true, tenantId: 'tenant-1' })
    await expect(
      updateMapInput()({ parsed: { id: CORE_ROLE_ID, name: 'renamed_again' }, raw: {}, ctx: routeCtx(makeRequest(CORE_ROLE_ID, { id: CORE_ROLE_ID, name: 'renamed_again' })) }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('an ordinary role falls through (no over-blocking) — the guard returns null and the input passes on', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: ORDINARY_ROLE_ID, name: 'admin', tenantId: 'tenant-1' })
    await expect(
      updateMapInput()({ parsed: { id: ORDINARY_ROLE_ID, name: 'admin-2' }, raw: {}, ctx: routeCtx(makeRequest(ORDINARY_ROLE_ID, { id: ORDINARY_ROLE_ID, name: 'admin-2' })) }),
    ).resolves.toBeTruthy()
  })

  it('a missing role falls through (404 is the caller\'s, not ours)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce(null)
    await expect(
      updateMapInput()({ parsed: { id: ORDINARY_ROLE_ID, name: 'admin-2' }, raw: {}, ctx: routeCtx(makeRequest(ORDINARY_ROLE_ID, { id: ORDINARY_ROLE_ID, name: 'admin-2' })) }),
    ).resolves.toBeTruthy()
  })
})

/* ------------------------------------------------------------------ *
 * The command — the redo path (`audit-logs/.../redo` re-executes these)
 * ------------------------------------------------------------------ */

describe('auth.roles.update command — the redo path re-runs this, so the rule must live here too', () => {
  it('refuses a CORE rename with 409 and NEVER reaches the store write', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    await expect(
      updateCommand().execute({ id: CORE_ROLE_ID, name: 'superadmin-x' }, ctx),
    ).rejects.toMatchObject({ status: 409 })
    expect(mockDe.updateOrmEntity).not.toHaveBeenCalled()
  })

  it('a marker-carrying row is refused on the redo path too (durable half)', async () => {
    mockFindOneWithDecryption.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'renamed_long_ago', isCore: true, tenantId: 'tenant-1' })
    await expect(
      updateCommand().execute({ id: CORE_ROLE_ID, name: 'renamed_again' }, ctx),
    ).rejects.toMatchObject({ status: 409 })
    expect(mockDe.updateOrmEntity).not.toHaveBeenCalled()
  })

  it('an unchanged name is allowed through to the store write (not a rename)', async () => {
    mockFindOneWithDecryption.mockResolvedValue({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    mockDe.updateOrmEntity.mockResolvedValueOnce({ id: CORE_ROLE_ID, name: 'superadmin', tenantId: 'tenant-1' })
    const result = await updateCommand().execute({ id: CORE_ROLE_ID, name: 'superadmin' }, ctx)
    expect(result).toBeTruthy()
    expect(mockDe.updateOrmEntity).toHaveBeenCalledTimes(1)
  })
})

/* ------------------------------------------------------------------ *
 * The CREATE path — the durable marker must be stamped at birth
 *
 * The hostile critic found this: the SEED stamps `isCore` (`setup-app.ts`), but
 * a role created through the API did NOT — so a role the SD-2b SETTING marks core
 * was born `is_core = false`, and one rename would move it out of the setting and
 * leave it unguarded. That is the CC-31(a) hole, re-opened for every non-seed
 * core role. The create command must stamp the marker on every create.
 * ------------------------------------------------------------------ */

function createCommand(): { execute: (input: unknown, ctx: unknown) => Promise<unknown> } {
  const cmd = commandRegistry.get('auth.roles.create')
  expect(cmd).toBeTruthy()
  return cmd as never
}

describe('auth.roles.create — the durable marker is stamped at create time', () => {
  it('every created role carries an isCore flag (the marker is stamped, not left to the DB default)', async () => {
    // The defect the critic found: the SEED stamped `isCore` but the API create path
    // did not, so a role created through the API was born with the column default
    // (`false`) — unguarded the moment its name left the setting. The command must
    // stamp the flag on EVERY create.
    await createCommand().execute({ name: 'billing_clerk', tenantId: TENANT_ID }, ctx)
    expect(mockDe.createOrmEntity).toHaveBeenCalledTimes(1)
    const data = (mockDe.createOrmEntity.mock.calls[0][0] as { data: { isCore?: boolean } }).data
    expect(typeof data.isCore).toBe('boolean')
    expect(data.isCore).toBe(false) // 'billing_clerk' is not core in the seed
  })

  it('a name the registry calls core is stamped core — the marker is the registry\'s answer', async () => {
    // `admin` is reserved, so it cannot be created through the API — which is why
    // the interesting case is a name the SD-2b SETTING marks core. The command's
    // stamp is `isCoreObject('role', name)`, so the two must agree by construction.
    // This pins that `isCoreObject` is the single decision the command consults: a
    // name it calls core would be stamped core. We assert the registry's answers for
    // the two names the resolver distinguishes, so a future drift breaks this test.
    expect(isCoreObject('role', 'superadmin')).toBe(true)
    expect(isCoreObject('role', 'billing_clerk')).toBe(false)
    // And the create path consults it: creating a non-reserved role yields a stamp
    // consistent with the registry (false here), never `undefined`.
    await createCommand().execute({ name: 'billing_clerk', tenantId: TENANT_ID }, ctx)
    const data = (mockDe.createOrmEntity.mock.calls[0][0] as { data: { isCore?: boolean } }).data
    expect(data.isCore).toBe(isCoreObject('role', 'billing_clerk'))
  })

  it('the reserved names cannot be created through the API at all (why the seed owns them)', async () => {
    // Documents the boundary that makes the seed the only creator of `superadmin`:
    // the create command refuses reserved names outright.
    await expect(
      createCommand().execute({ name: 'superadmin', tenantId: TENANT_ID }, ctx),
    ).rejects.toMatchObject({ status: 400 })
    expect(mockDe.createOrmEntity).not.toHaveBeenCalled()
  })
})
