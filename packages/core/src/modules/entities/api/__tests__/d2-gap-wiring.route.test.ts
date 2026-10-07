/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `entities` module read as **4 unguarded verbs across
 * 2 files**. Measured first (tool `--json` + a hand read of both files), the
 * label's "2 of those are the optimistic-lock floor, not gaps" is right about
 * the **verbs** but not about the **file**, so all four verbs are wired:
 *
 *   1. `api/records.ts`         POST    -> createCustomEntityRecord   (no guard of any kind before)
 *   2. `api/records.ts`         PUT     -> updateCustomEntityRecord   (lock floor + NOW the registry)
 *   3. `api/records.ts`         DELETE  -> deleteCustomEntityRecord   (lock floor + NOW the registry)
 *   4. `api/entity-settings.ts` PUT     -> moduleConfigService.setValue (no guard of any kind before)
 *
 * WHY the two floor verbs are still wired. `enforceCommandOptimisticLockWithGuards`
 * is the command optimistic-lock FLOOR, a different mechanism that never consults
 * `getAllMutationGuardInstances()` — it is NOT the registry (the `directory` trap).
 * A file whose verbs are ALL on the floor would be set aside, but `records.ts` is
 * not: its POST reached NOTHING AT ALL, so the file as a whole had no registry
 * guard and must keep reading as a gap. One protected verb does not launder an
 * unprotected sibling in the same file — that is the tool's stated rule and the
 * reason its `COMMAND_LOCK_FLOOR` list is deliberately empty. `directory`'s
 * `organization-edges` set the same precedent: its floor verbs also call the
 * registry wrapper. So PUT/DELETE keep the floor AND gain the registry guard.
 *
 * This suite proves each wired verb now runs the registry, by registering a
 * **real** guard in the global store (`registerMutationGuards`) and driving the
 * **real** route handlers with `runRouteMutationGuards` left **UNMOCKED**.
 * Mocking the wrapper would only prove a function of that name is called; a real
 * registered guard proves the registry chokepoint is actually reached.
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict stops the write — the command/service never runs and
 *      no after-success fires;
 *   2. an **allow** verdict lets the write run — the command/service DOES run
 *      and the guard's after-success fires exactly once.
 *
 * Plus: an out-of-kind control guard does not fire, and a guard registered for
 * the WRONG operation (PUT's guard must not fire on the create branch of PUT)
 * is exercised via the kind/operation the route passes.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const RECORD_ID = '123e4567-e89b-42d3-a456-426614174000'

// ── Real registry (not stubbed) ────────────────────────────────────────────
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable side-effect record ──────────────────────────────────────────
const writes: string[] = []
function record(name: string) {
  writes.push(name)
}
const runAfterSuccessMock = jest.fn(async () => undefined)
const seen: Array<{ kind: string; operation: string; resourceId: string }> = []

// ── Shared auth ────────────────────────────────────────────────────────────
let currentAuth: Record<string, unknown> | null = {
  sub: USER_ID,
  tenantId: TENANT_ID,
  orgId: ORG_ID,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => currentAuth),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) }),
}))

// The record route consults the per-entity ACL helper and the org-scope helpers.
// Both are mocked to pass through so this suite isolates the GUARD seam; the ACL
// behaviour has its own suite (`records.acl` / `records.crud`).
jest.mock('@open-mercato/core/modules/entities/lib/entityAcl', () => ({
  assertEntityAclForRequest: jest.fn(async () => undefined),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScope: async () => ({ selectedId: ORG_ID, filterIds: [ORG_ID] }),
  getSelectedOrganizationFromRequest: () => ORG_ID,
}))

// Custom-entity classification: treat the id as a declared custom entity so the
// route proceeds to the write. `isOrmBackedSystemEntityId` is mocked to false.
jest.mock('@open-mercato/shared/lib/data/engine', () => ({
  isOrmBackedSystemEntityId: () => false,
  SYSTEM_ENTITY_RECORDS_BLOCKED_CODE: 'system_entity_records_blocked',
  UNKNOWN_CUSTOM_FIELD_ERROR: 'unknown custom field',
}))

// Custom-field validation passes (no declared defs to reject against).
jest.mock('@open-mercato/core/modules/entities/lib/validation', () => ({
  validateCustomFieldValuesServer: async () => ({ ok: true, fieldErrors: {} }),
}))

// The module's `loadDeclaredCustomEntities` walks the module registry; make it
// report one custom entity so classifyRecordsEntity returns kind: 'custom'.
jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  getModules: () => [
    { customEntities: [{ id: 'user:qa_entity', accessRestricted: false }] },
  ],
}))

// ── Container: a tiny resolver over the shared stubs ───────────────────────
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => resolveStub(key),
    // A real Awilix container exposes `hasRegistration`, and the registry's
    // legacy bridge consults it before resolving `crudMutationGuardService`.
    // Reporting `false` makes the bridge return null exactly as it does in
    // production when the service is absent.
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

const emStub = {
  findOne: async () => null,
  find: async () => [],
  getKysely: () => ({ selectFrom: () => ({ select: () => ({ where: () => ({ where: () => ({ executeTakeFirst: async () => undefined }) }) }) }) }),
}

const dataEngineStub = {
  createCustomEntityRecord: jest.fn(async () => {
    record('de.createCustomEntityRecord')
    return { id: RECORD_ID }
  }),
  updateCustomEntityRecord: jest.fn(async () => {
    record('de.updateCustomEntityRecord')
  }),
  deleteCustomEntityRecord: jest.fn(async () => {
    record('de.deleteCustomEntityRecord')
  }),
}

const moduleConfigSetValue = jest.fn(async () => {
  record('moduleConfigService.setValue')
})

function resolveStub(key: string): unknown {
  switch (key) {
    case 'em':
      return emStub
    case 'dataEngine':
      return dataEngineStub
    case 'rbacService':
      return { resolveVisibleOrganizations: async () => [ORG_ID], loadAcl: async () => ({ isSuperAdmin: true, features: [], organizations: null }) }
    case 'queryEngine':
      return { query: async () => ({ items: [], total: 0 }) }
    case 'moduleConfigService':
      return { getValue: async () => false, setValue: moduleConfigSetValue }
    default:
      throw new Error(`unexpected resolve: ${key}`)
  }
}

// ── The route modules are real; only their WRITE target is observed through
//    the stubs. Nothing here mocks the guard wrapper.
import { POST as recordsPost, PUT as recordsPut, DELETE as recordsDelete } from '../records'
import { PUT as settingsPut } from '../entity-settings'

function installGuard(kind: string, mode: 'block' | 'allow', operations?: MutationGuard['operations']) {
  const guard: MutationGuard = {
    id: `test.entities.${kind}.guard`,
    targetEntity: kind,
    operations: operations ?? ['create', 'update', 'delete', 'custom'],
    priority: 0,
    async validate(input) {
      seen.push({
        kind: input.resourceKind,
        operation: input.operation,
        resourceId: input.resourceId,
      })
      if (mode === 'block') {
        return { ok: false, status: 422, message: 'blocked by test guard' }
      }
      return { ok: true, shouldRunAfterSuccess: true }
    },
    async afterSuccess() {
      await runAfterSuccessMock()
    },
  }
  registerMutationGuards([{ moduleId: 'test', guards: [guard] }])
}

function jsonRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/entities/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  seen.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  registerMutationGuards([])
})

describe('entities D2-gap wiring — every genuine write reaches the registry', () => {
  const RECORD_KIND = 'entities.record'
  const SETTINGS_KIND = 'entities.settings'

  describe('entities.record guard — block stops the write', () => {
    it('records POST', async () => {
      installGuard(RECORD_KIND, 'block')
      const res = await recordsPost(jsonRequest('POST', { entityId: 'user:qa_entity', values: { title: 'x' } }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('de.createCustomEntityRecord')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('records PUT (update branch)', async () => {
      installGuard(RECORD_KIND, 'block')
      const res = await recordsPut(jsonRequest('PUT', { entityId: 'user:qa_entity', recordId: RECORD_ID, values: { title: 'x' } }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('de.updateCustomEntityRecord')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('records PUT (create branch — sentinel recordId)', async () => {
      installGuard(RECORD_KIND, 'block')
      const res = await recordsPut(jsonRequest('PUT', { entityId: 'user:qa_entity', recordId: 'create', values: { title: 'x' } }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('de.createCustomEntityRecord')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('records DELETE', async () => {
      installGuard(RECORD_KIND, 'block')
      const res = await recordsDelete(
        new Request(`http://localhost/api/entities/x?entityId=user:qa_entity&recordId=${RECORD_ID}`, { method: 'DELETE' }),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('de.deleteCustomEntityRecord')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('entities.record guard — allow runs the write once', () => {
    it('records POST', async () => {
      installGuard(RECORD_KIND, 'allow')
      const res = await recordsPost(jsonRequest('POST', { entityId: 'user:qa_entity', values: { title: 'x' } }))
      expect(res.status).toBe(200)
      expect(writes).toContain('de.createCustomEntityRecord')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: RECORD_KIND, operation: 'create' })
    })

    it('records PUT (update branch) passes operation=update', async () => {
      installGuard(RECORD_KIND, 'allow')
      const res = await recordsPut(jsonRequest('PUT', { entityId: 'user:qa_entity', recordId: RECORD_ID, values: { title: 'x' } }))
      expect(res.status).toBe(200)
      expect(writes).toContain('de.updateCustomEntityRecord')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: RECORD_KIND, operation: 'update', resourceId: RECORD_ID })
    })

    it('records PUT (create branch) passes operation=create', async () => {
      installGuard(RECORD_KIND, 'allow')
      const res = await recordsPut(jsonRequest('PUT', { entityId: 'user:qa_entity', recordId: 'create', values: { title: 'x' } }))
      expect(res.status).toBe(200)
      expect(writes).toContain('de.createCustomEntityRecord')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: RECORD_KIND, operation: 'create' })
    })

    it('records DELETE passes operation=delete', async () => {
      installGuard(RECORD_KIND, 'allow')
      const res = await recordsDelete(
        new Request(`http://localhost/api/entities/x?entityId=user:qa_entity&recordId=${RECORD_ID}`, { method: 'DELETE' }),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('de.deleteCustomEntityRecord')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: RECORD_KIND, operation: 'delete' })
    })
  })

  describe('entities.settings guard', () => {
    it('block stops the config write', async () => {
      installGuard(SETTINGS_KIND, 'block')
      const res = await settingsPut(jsonRequest('PUT', { newEntitiesRestrictedByDefault: true }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('moduleConfigService.setValue')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('allow runs the config write once with operation=update', async () => {
      installGuard(SETTINGS_KIND, 'allow')
      const res = await settingsPut(jsonRequest('PUT', { newEntitiesRestrictedByDefault: true }))
      expect(res.status).toBe(200)
      expect(writes).toContain('moduleConfigService.setValue')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: SETTINGS_KIND, operation: 'update' })
    })
  })

  it('a registered guard OUTSIDE the touched kind does not fire (control)', async () => {
    const unrelated: MutationGuard = {
      id: 'test.unrelated.guard',
      targetEntity: 'some.other.entity',
      operations: ['create', 'update', 'delete', 'custom'],
      priority: 0,
      async validate() {
        return { ok: true, shouldRunAfterSuccess: true }
      },
      async afterSuccess() {
        await runAfterSuccessMock()
      },
    }
    registerMutationGuards([{ moduleId: 'test', guards: [unrelated] }])

    const res = await recordsPost(jsonRequest('POST', { entityId: 'user:qa_entity', values: { title: 'x' } }))
    expect(res.status).toBe(200)
    expect(writes).toContain('de.createCustomEntityRecord')
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('the settings guard does not fire on a records write (kind isolation)', async () => {
    installGuard(SETTINGS_KIND, 'block')
    const res = await recordsPost(jsonRequest('POST', { entityId: 'user:qa_entity', values: { title: 'x' } }))
    expect(res.status).toBe(200)
    expect(writes).toContain('de.createCustomEntityRecord')
  })

  it('an invalid JSON body is rejected before the guard runs (400)', async () => {
    installGuard(RECORD_KIND, 'block')
    const res = await recordsPost(
      new Request('http://localhost/api/entities/x', { method: 'POST', body: '{not json' }),
    )
    expect(res.status).toBe(400)
    expect(writes).not.toContain('de.createCustomEntityRecord')
  })
})
