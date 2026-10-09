/** @jest-environment node */
/**
 * SD-1 (CC-24) — the HTTP **entity reactivation** path runs the permissions gate.
 *
 * A custom **entity** brought back from an inactive tombstone is a permission surface
 * (re)appearing, so it must not land until the gate has decided — exactly as a create
 * must not, and exactly as the **field** twin already does (CC-22).
 *
 * This route reaches the registry as `operation: ent ? 'update' : 'create'`
 * (`entities.ts`), and the only entity gate is `operations: ['create']`
 * (`entities/data/guards.ts`, `entityPermissionDecisionGuard`) — so a reactivation was
 * **never gated**. The gate therefore runs **at the route**, where the before-state
 * (`ent`, already loaded) is known: no new query, no change to the shared guard contract.
 *
 * These tests prove: the gate fires on a reactivation and grants after the flush; it
 * stays out of the way of a **create** (the create-only registry guard owns that), an
 * ordinary active update, and a deactivation; it **fails closed** (422, nothing written)
 * when the gate refuses; and it reads the CC-17 decision carrier (a malformed decision is
 * refused 400 before anything is touched).
 */
import { POST } from '../entities'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import {
  registerMutationGuards,
  getAllMutationGuards,
} from '@open-mercato/shared/lib/crud/mutation-guard-store'

jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyStructureChangeGrant: jest.fn(async () => ({
    applied: true,
    roleName: 'superadmin',
    roleId: 'role-1',
    aclCreated: false,
    added: [],
    alreadyPresent: [],
  })),
  // CC-25: the actor check the route runs before the gate (mocked as granted here —
  // this suite proves the reactivation wiring; the refusals are proved in the CC-25 suite).
  assertActorMayStateDecision: jest.fn(async () => undefined),
  STRUCTURE_DECISION_PERMISSION: 'entities.definitions.decide',
}))

// The shared logger is stubbed, because `writeFieldPermissionGrant` swallows every error
// (`field-definitions.ts:197-202`) and reports it only through `logger.error`. Without the
// stub an unhandled reject inside the grant is invisible: the route still answers 200 and
// the suite stays green while nothing was written — i.e. a **green test proving nothing**.
// With it, the suite can assert on what production would log (the same shape
// `definitions.batch.sd1.test.ts` uses).
//
// The spies live inside the factory, because the mock is hoisted above every `const`
// in this file — reading an outer binding here throws before a single test runs.
jest.mock('@open-mercato/shared/lib/logger', () => {
  const shared = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const withChild = (): Record<string, unknown> => ({ ...shared, child: () => withChild() })
  return { createLogger: () => withChild() }
})
/** The shared error spy from the mocked logger above. */
const loggerSpies = createLogger('test') as unknown as {
  debug: jest.Mock
  info: jest.Mock
  warn: jest.Mock
  error: jest.Mock
}

const grantMock = applyStructureChangeGrant as unknown as jest.Mock

/**
 * Guards this file registered into the **global** store, kept so `afterEach` can put the
 * store back the way it found it (see the note on that hook: the store is
 * `globalThis`-backed and outlives this file's module registry).
 */
let registeredByThisTest: Array<ReturnType<typeof getAllMutationGuards>[number]> | null = null

type Where = Record<string, unknown>

const mockEm = {
  find: jest.fn(async (_entity: unknown, _where: Where) => [] as unknown[]),
  findOne: jest.fn(async (_entity: unknown, _where: Where) => null as unknown),
  create: jest.fn((_entity: unknown, data: Where) => ({ ...data })),
  persist: jest.fn(),
  flush: jest.fn(async () => {}),
}

// Swappable enterprise command-guard service so the optimistic-lock seam resolves
// (null is the OSS-only floor path, which is what these tests exercise).
const mockCommandGuardService: { enforce: jest.Mock } | null = null

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'em') return mockEm
      if (key === 'commandOptimisticLockGuardService') return mockCommandGuardService
      if (key === 'cache') throw new Error('no cache')
      return null
    },
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: async () => ({ sub: 'user-1', userId: 'user-1', tenantId: 'tenant-1', orgId: 'org-1', roles: ['admin'] }),
}))

jest.mock('@open-mercato/shared/lib/data/engine', () => ({
  SYSTEM_ENTITY_RECORDS_BLOCKED_CODE: 'system_entity_records_blocked',
  isOrmBackedSystemEntityId: () => false,
}))

/** The entity row the route finds by `(entityId, organizationId, tenantId)`. */
function existingEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ent-1',
    entityId: 'example:widgets',
    label: 'Widgets',
    description: null,
    isActive: false,
    deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    accessRestricted: false,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/entities/entities', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

/** The feature strings the gate decided for the last grant call. */
function featuresOfLastGrant(): string[] {
  const call = grantMock.mock.calls[grantMock.mock.calls.length - 1]
  const decision = call?.[1]?.decision
  return (decision?.records ?? []).map((record: { feature: string }) => record.feature)
}

beforeEach(() => {
  grantMock.mockClear()
  grantMock.mockResolvedValue({
    applied: true,
    roleName: 'superadmin',
    roleId: 'role-1',
    aclCreated: false,
    added: [],
    alreadyPresent: [],
  })
  loggerSpies.debug.mockClear()
  loggerSpies.info.mockClear()
  loggerSpies.warn.mockClear()
  loggerSpies.error.mockClear()
  mockEm.find.mockClear()
  mockEm.findOne.mockReset()
  mockEm.findOne.mockResolvedValue(null)
  mockEm.create.mockClear()
  mockEm.persist.mockClear()
  mockEm.flush.mockClear()
})

/**
 * Give back the guard store exactly as it was found.
 *
 * `registerMutationGuards` **replaces** the whole store (`mutation-guard-store.ts:41-52`).
 * Without this restore the create guard registered below is still in the store when a
 * **later test in this same file** runs.
 *
 * **Corrected (CC-29, by measurement).** This comment used to say the guard "leaks into
 * every later suite in the same worker" via `globalThis`. That is **false in this jest
 * config**: a guard written to the `globalThis` slot in one test file is not visible in the
 * next file (measured — the second file reads the key as `undefined` even with CC-29's
 * reset switched off; jest gives each file its own realm). So the real risk here is leakage
 * **within the file**, and CC-29's `beforeEach` reset now covers it globally. This
 * `afterEach` stays because it is correct and harmless, and because a test that relies on
 * the store being *exactly* empty after it should not depend on the harness to say so.
 */
afterEach(() => {
  registerMutationGuards([])
  if (registeredByThisTest) {
    registerMutationGuards(registeredByThisTest.map((entry) => ({ moduleId: entry.moduleId, guards: [entry.guard] })))
    registeredByThisTest = null
  }
})

describe('entities POST — the SD-1 entity reactivation gate (CC-24)', () => {
  it('gates a reactivation and grants its records after the flush', async () => {
    mockEm.findOne.mockResolvedValue(existingEntity())

    const res = await POST(request({ entityId: 'example:widgets', label: 'Widgets' }))

    expect(res.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.tenantId).toBe('tenant-1')
    expect(grantInput.decision.outcome).toBe('defaulted')
    // The records are the entity's LIVE ones (`entities.records.<id>`), not a new scheme.
    expect(featuresOfLastGrant()).toContain('entities.records.example:widgets.view')
    // The row commits **before** its permissions are granted: the ACL write is not part of
    // the row transaction, so a grant failure cannot roll the structure back.
    expect(mockEm.flush.mock.invocationCallOrder[0]).toBeLessThan(grantMock.mock.invocationCallOrder[0])
    // ...and the surface that landed is the one the record names.
    expect(grantInput.decision.records[0].surfaceId).toBe('example:widgets')
  })

  it('does not gate a create — the route stays silent so the create-only registry guard is the single writer', async () => {
    mockEm.findOne.mockResolvedValue(null)

    // On a create the route must NOT run its own gate: `entityPermissionDecision` stays
    // null, so its write early-returns and the create-only registry guard (the production
    // `entities.entity.requires-permission-decision`) is the one writer. Registering a real
    // create guard here also proves the route does not *compete* with it.
    //
    // **The registration is restored in `afterEach`** (and CC-29's `beforeEach` reset in
    // `jest.setup.ts` now clears the store before every test regardless). The store is
    // `globalThis`-backed (`mutation-guard-store.ts:15-35`) and `registerMutationGuards`
    // replaces it wholesale, so a registration made here would otherwise still be present
    // for the tests that follow **in this file**. (That it would also reach the *next file*
    // was the earlier claim; CC-29 measured it false in this jest config — each file gets
    // its own realm, so a second file reads the `globalThis` key as `undefined`.)
    const previousGuards = getAllMutationGuards()
    registeredByThisTest = previousGuards
    registerMutationGuards([
      {
        moduleId: 'test',
        guards: [
          {
            id: 'test.entities.entity.create',
            targetEntity: 'entities.entity',
            operations: ['create'],
            priority: 5,
            async validate() {
              return { ok: true, shouldRunAfterSuccess: true, metadata: {} }
            },
          },
        ],
      },
    ])

    const res = await POST(request({ entityId: 'example:widgets', label: 'Widgets' }))

    expect(res.status).toBe(200)
    expect(mockEm.create).toHaveBeenCalledTimes(1)
    // The route contributes ZERO grants on a create — it never competes with the guard.
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate an update that keeps the entity active', async () => {
    mockEm.findOne.mockResolvedValue(existingEntity({ isActive: true, deletedAt: null }))

    const res = await POST(request({ entityId: 'example:widgets', label: 'Renamed' }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
    // The weak half of this test: `not.toHaveBeenCalled()` is also satisfied by a route that
    // never boots. Pin the parts of the round-trip that a dead route would fail — the write
    // happened, and the row that was loaded is the row that was written.
    expect(mockEm.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entityId: 'example:widgets', tenantId: 'tenant-1' }),
    )
    expect(mockEm.persist).toHaveBeenCalledTimes(1)
    expect(mockEm.flush).toHaveBeenCalledTimes(1)
  })

  it('does not gate a deactivation — saving an entity inactive is a tombstone, not a surface', async () => {
    mockEm.findOne.mockResolvedValue(existingEntity({ isActive: true, deletedAt: null }))

    const res = await POST(request({ entityId: 'example:widgets', label: 'Widgets', isActive: false }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('does not gate re-saving a tombstone as still inactive — no surface appears', async () => {
    // The row is already a tombstone and the save leaves it one: nothing appears, so there
    // is nothing to decide. This isolates the "the save leaves it active" clause of the
    // reactivation test (an active row would pass either way).
    mockEm.findOne.mockResolvedValue(existingEntity())

    const res = await POST(request({ entityId: 'example:widgets', label: 'Widgets', isActive: false }))

    expect(res.status).toBe(200)
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('gates a row whose isActive is already true but which is still a tombstone (deletedAt set)', async () => {
    // The half of `isActiveEntity` a mutation proved unpinned: the function is
    // `isActive === true && deletedAt == null`, and **both** clauses must bite. A row that
    // carries `deletedAt` is a tombstone even if `isActive` was left true — and it can
    // arise in production without a caller doing anything odd: the CC-21 install primitive
    // (`register.ts:76`) sets `isActive` **and** clears `deletedAt` together, so a crash
    // between the two, or a direct DB edit, leaves exactly this row. Dropping the
    // `deletedAt` clause (measured: 0 RED across both consumers before this test existed)
    // would let such a row be written straight back as live with the gate never consulted.
    mockEm.findOne.mockResolvedValue(existingEntity({ isActive: true, deletedAt: new Date('2026-01-01T00:00:00.000Z') }))

    const res = await POST(request({ entityId: 'example:widgets', label: 'Widgets' }))

    expect(res.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.decision.outcome).toBe('defaulted')
  })

  it('SD-1 (CC-17 carrier): a well-formed decision on the header reaches the gate on a reactivation', async () => {
    mockEm.findOne.mockResolvedValue(existingEntity())

    const decision = {
      decidedBy: 'user-1',
      grantTo: 'operations',
      records: [{ feature: 'entities.records.example:widgets.view' }, { feature: 'entities.records.example:widgets.manage' }],
    }
    const res = await POST(
      request({ entityId: 'example:widgets', label: 'Widgets' }, { 'x-om-ext-permissions-decision': JSON.stringify(decision) }),
    )

    expect(res.status).toBe(200)
    expect(grantMock).toHaveBeenCalledTimes(1)
    const [, grantInput] = grantMock.mock.calls[0]
    expect(grantInput.decision.outcome).toBe('decided')
    expect(grantInput.decision.grantTo).toBe('operations')
  })

  it('refuses a malformed decision header with 400 before anything is touched (fail closed)', async () => {
    mockEm.findOne.mockResolvedValue(existingEntity())

    const res = await POST(
      request({ entityId: 'example:widgets', label: 'Widgets' }, { 'x-om-ext-permissions-decision': '{not json' }),
    )

    expect(res.status).toBe(400)
    // Nothing was written, and no permissions were granted for a surface that did not land.
    expect(mockEm.persist).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })
})

describe('entities POST — the SD-1 entity reactivation gate refuses fail-closed (CC-24)', () => {
  it('refuses a reactivation when the stated decision grants nothing, and writes nothing', async () => {
    // The gate's rule 4: "a decision that grants nothing is not a decision". A stated
    // decision with an **empty** record list must therefore REFUSE the change — the
    // reactivation must not land — rather than be read as "I decided nothing".
    //
    // (A malformed *surface id* cannot be reached on this route: zod's `entityIdRegex`
    // is `^[a-z0-9_]+:[a-z0-9_]+$`, which is a strict subset of the gate's surface-id
    // pattern — so any id zod accepts, the gate accepts too. The reachable fail-closed
    // path here is the decision, not the id. Named honestly rather than tested with a
    // value that would 400 at zod before the gate ever saw it.)
    mockEm.findOne.mockResolvedValue(existingEntity())

    const decision = { decidedBy: 'user-1', records: [] }
    const res = await POST(
      request({ entityId: 'example:widgets', label: 'Widgets' }, { 'x-om-ext-permissions-decision': JSON.stringify(decision) }),
    )

    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/cannot be re-activated/)
    expect(mockEm.persist).not.toHaveBeenCalled()
    expect(mockEm.flush).not.toHaveBeenCalled()
    expect(grantMock).not.toHaveBeenCalled()
  })

  it('surfaces a rejected grant as an error instead of failing silently (the write swallows by design)', async () => {
    // `writeFieldPermissionGrant` catches every throw and reports it through `logger.error`,
    // so the route still answers 200. That is deliberate — the structure already landed and
    // must not be un-landed by a permissions-write failure — but it means a **silent**
    // failure is only visible if something asserts on the log. This is that something:
    // without it, a grant that never actually applied would look identical to one that did.
    mockEm.findOne.mockResolvedValue(existingEntity())
    grantMock.mockRejectedValueOnce(new Error('acl store unreachable'))

    const res = await POST(request({ entityId: 'example:widgets', label: 'Widgets' }))

    expect(res.status).toBe(200)
    expect(loggerSpies.error).toHaveBeenCalledWith(
      expect.stringContaining('writing the permission records threw'),
      expect.objectContaining({ tenantId: 'tenant-1' }),
    )
    // And it is reported, not counted as a success.
    expect(loggerSpies.info).not.toHaveBeenCalledWith(
      expect.stringContaining('permission records granted'),
      expect.anything(),
    )
  })
})
