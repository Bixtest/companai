/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `configs` module read as **4 unguarded verbs across
 * 4 files**. Measured first (tool `--json` + a hand read of every `.ts` under
 * `api/`), the 4 split three ways:
 *
 *   1. `api/cache/route.ts`         POST    -> already GUARDED_REGISTRY (inline
 *                                              `getAllMutationGuardInstances()` +
 *                                              `runMutationGuards`); tool blind spot
 *   2. `api/system-status/route.ts` POST    -> `cache.clear()`, no DB row  (set aside)
 *   3. `api/module-telemetry/route.ts` DELETE -> dev-only in-process clear (set aside)
 *   4. `api/upgrade-actions/route.ts` POST  -> executeUpgradeAction WRITES an
 *                                              UpgradeActionRun row  <-- the wired one
 *
 * This suite proves verb 4 now runs a guard, by registering a **real** guard in
 * the global store (`registerMutationGuards`) and driving the **real** route
 * handler with `runRouteMutationGuards` left **UNMOCKED**. Mocking the wrapper
 * would only prove a function of that name is called; a real registered guard
 * proves the registry chokepoint is reached from the route.
 *
 * Two directions are asserted:
 *   1. a **block** verdict stops the write — the service call is never made and
 *      no after-success fires;
 *   2. an **allow** verdict lets the write run — the service IS called and the
 *      guard's after-success fires exactly once.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const ACTION_ID = 'seed-example-catalog'

import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

const writes: string[] = []
function record(name: string) {
  writes.push(name)
}
const runAfterSuccessMock = jest.fn(async () => undefined)

let currentAuth: Record<string, unknown> | null = {
  sub: USER_ID,
  tenantId: TENANT_ID,
  orgId: ORG_ID,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => currentAuth),
}))

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: async () => ({
    translate: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveFeatureCheckContext: async () => ({
    scope: { tenantId: TENANT_ID, selectedId: ORG_ID },
    organizationId: ORG_ID,
  }),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: () => {
      throw new Error('unexpected resolve')
    },
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

const executeUpgradeActionMock = jest.fn(async () => {
  record('executeUpgradeAction')
  return { action: { successKey: 'upgrades.seeded' }, status: 'completed' as const }
})

jest.mock('../../services/upgradeActionsService', () => ({
  isUpgradeActionsEnabled: () => true,
  getCurrentVersion: () => '9.9.9',
  listPendingUpgradeActions: async () => [],
  executeUpgradeAction: (...args: unknown[]) => executeUpgradeActionMock(...args),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) }),
}))

import { POST as upgradeActionsPost } from '../upgrade-actions/route'

function installGuard(mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: 'test.configs-upgradeActionRun.guard',
    targetEntity: 'configs.upgradeActionRun',
    operations: ['create', 'update', 'delete', 'custom'],
    priority: 0,
    async validate() {
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

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/configs/upgrade-actions', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  registerMutationGuards([])
})

describe('configs D2-gap wiring — the genuine write reaches the registry', () => {
  describe('configs.upgradeActionRun guard — block stops the write', () => {
    it('upgrade-actions POST', async () => {
      installGuard('block')
      const res = await upgradeActionsPost(makeRequest({ actionId: ACTION_ID }))
      expect(res.status).toBe(422)
      expect(writes).not.toContain('executeUpgradeAction')
      expect(executeUpgradeActionMock).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('configs.upgradeActionRun guard — allow runs the write and fires after-success once', () => {
    it('upgrade-actions POST', async () => {
      installGuard('allow')
      const res = await upgradeActionsPost(makeRequest({ actionId: ACTION_ID }))
      expect(res.status).toBe(200)
      expect(writes).toContain('executeUpgradeAction')
      expect(executeUpgradeActionMock).toHaveBeenCalledTimes(1)
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
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

    const res = await upgradeActionsPost(makeRequest({ actionId: ACTION_ID }))
    expect(res.status).toBe(200)
    expect(writes).toContain('executeUpgradeAction')
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('an invalid body is rejected before the guard runs (400)', async () => {
    installGuard('block')
    const res = await upgradeActionsPost(makeRequest({ actionId: '' }))
    expect(res.status).toBe(400)
    expect(executeUpgradeActionMock).not.toHaveBeenCalled()
  })
})
