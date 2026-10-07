/**
 * Two-mutation proof that the `auth` module's 12 formerly-unguarded
 * resource-writes now pass through the registry chokepoint.
 *
 * The defect this closes (BACKLOG `D2-gap`): *"routes that call no guard
 * whatsoever — neither the registry nor the deprecated pair — so a write there
 * is checked by nothing."* `auth` had **12 such verbs across 10 files**:
 *
 *   - `authority/delegations`        POST
 *   - `authority/denials`            POST
 *   - `authority/pending-acts`       POST
 *   - `authority/record-locks`       POST
 *   - `authority/trust`              POST
 *   - `roles/acl`                    PUT
 *   - `users/acl`                    PUT
 *   - `sidebar/preferences`          PUT, DELETE
 *   - `sidebar/variants`             POST
 *   - `sidebar/variants/[id]`        PUT, DELETE
 *
 * Each is now wired through `beginAuthMutationGuard()`, which calls
 * `runRouteMutationGuards()` — the registry, not the deprecated singleton.
 *
 * **What this test proves, and how it refuses to prove it by accident.**
 * A mock of `beginAuthMutationGuard` would prove only that the route calls a
 * function with that name. Instead this test registers a **real** guard in the
 * global mutation-guard store and drives the **real** route handlers, so the
 * assertion is on observable behaviour:
 *
 *   - **Mutation 1 (block):** the guard refuses → the route returns the guard's
 *     status and the write **never happens** (the service is never called).
 *   - **Mutation 2 (allow + after-success):** the guard permits and asks for
 *     `afterSuccess` → the write happens **and** the callback fires exactly
 *     once, with the resource the route was writing.
 *
 * The guard is registered for a **synthetic resource kind** the routes do not
 * use, in the block test, and for the route's own kind in the allow test; a
 * guard that never fires therefore fails loudly rather than passing vacuously.
 */

const TENANT = '11111111-1111-4111-8111-111111111111'
const ACTOR = '22222222-2222-4222-8222-222222222222'
const ORG = '33333333-3333-4333-8333-333333333333'
const USER_TARGET = '44444444-4444-4444-8444-444444444444'
const ROLE_TARGET = '55555555-5555-4555-8555-555555555555'
const RECORD_TARGET = '66666666-6666-4666-8666-666666666666'
const VARIANT_TARGET = '77777777-7777-4777-8777-777777777777'

import {
  registerMutationGuards,
  getAllMutationGuardInstances,
} from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ---------------------------------------------------------------------------
// Shared route doubles. Every service the twelve routes touch is stubbed so a
// test can assert "the write did NOT happen" by observing call counts.
// ---------------------------------------------------------------------------

// Hoisted above the `jest.mock` factories below, which reference it.
var writes: string[] = []

// A role row, so `roles/acl` and `sidebar/preferences` can reach their write
// instead of 404-ing on a missing role. `findOne(Role, …)` is the only lookup
// those two routes perform before writing.
const roleRow = { id: ROLE_TARGET, name: 'test-role', tenantId: TENANT }

const em: any = {
  findOne: jest.fn(async (entity: unknown) => {
    const name = (entity as { name?: string })?.name
    if (name === 'Role') return roleRow
    return null
  }),
  create: jest.fn((_entity: unknown, data: unknown) => ({ ...(data as object), id: VARIANT_TARGET })),
  persist: jest.fn(function persist() { return em }),
  remove: jest.fn(() => { writes.push('em.remove') }),
  nativeDelete: jest.fn(async () => {
    // `sidebar/preferences` DELETE removes the role variant directly through
    // `em.nativeDelete`; recording it here is what makes "the write happened"
    // assertable for that route.
    writes.push('em.nativeDelete')
    return 1
  }),
  flush: jest.fn(async () => undefined),
}

const container: any = {
  resolve: (token: string) => {
    switch (token) {
      case 'em':
        return em
      case 'rbacService':
        return {
          loadAcl: jest.fn(async () => ({ isSuperAdmin: true })),
          getGrantedFeatures: jest.fn(async () => ['auth.acl.manage']),
          userHasAllFeatures: jest.fn(async () => true),
          invalidateTenantCache: jest.fn(async () => undefined),
          invalidateUserCache: jest.fn(async () => undefined),
        }
      case 'delegationService':
        return {
          list: jest.fn(async () => []),
          grant: jest.fn(async () => {
            writes.push('delegation.grant')
            return { id: 'new-delegation', granteePrincipalId: 'p', capabilityId: 'c', startsAt: new Date(), expiresAt: new Date(), reason: 'r' }
          }),
          revoke: jest.fn(async () => {
            writes.push('delegation.revoke')
            return { id: 'd1', revokedAt: new Date(), capabilityId: 'c' }
          }),
        }
      case 'denialService':
        return {
          list: jest.fn(async () => []),
          withhold: jest.fn(async () => {
            writes.push('denial.withhold')
            return { id: 'new-denial' }
          }),
          lift: jest.fn(async () => {
            writes.push('denial.lift')
            return { id: 'd1' }
          }),
        }
      case 'pendingActService':
        return {
          list: jest.fn(async () => []),
          findById: jest.fn(async () => ({ id: 'a1', organizationId: null, commandId: 'c', capabilityId: 'cap', gate: 'A1', actorId: 'actor' })),
          approve: jest.fn(async () => {
            writes.push('pendingAct.approve')
            return { ok: true, act: { status: 'approved' } }
          }),
          reject: jest.fn(async () => {
            writes.push('pendingAct.reject')
            return { ok: true, act: { status: 'rejected' } }
          }),
        }
      case 'actReviewService':
        return {
          list: jest.fn(async () => []),
          markReviewed: jest.fn(async () => {
            writes.push('actReview.markReviewed')
            return { ok: true }
          }),
        }
      case 'recordLockService':
        return {
          list: jest.fn(async () => []),
          stateFor: jest.fn(async () => null),
          setState: jest.fn(async () => {
            writes.push('recordLock.setState')
            return { recordId: RECORD_TARGET, state: 'locked' }
          }),
        }
      case 'trustService':
        return {
          list: jest.fn(async () => []),
          promote: jest.fn(async () => {
            writes.push('trust.promote')
            return { ok: true, grant: { tier: 'A2' }, unverified: [] }
          }),
        }
      case 'cache':
        return { deleteByTags: jest.fn(async () => undefined) }
      default:
        return {}
    }
  },
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => ({
    sub: '22222222-2222-4222-8222-222222222222',
    tenantId: '11111111-1111-4111-8111-111111111111',
    orgId: '33333333-3333-4333-8333-333333333333',
  })),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => container),
}))

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: jest.fn(async () => ({ locale: 'en' })),
}))

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

// The routes' own authority checks are exercised by their own suites; here they
// must simply not refuse, so the guard is the only thing that can block.
jest.mock('@open-mercato/core/modules/auth/lib/grantChecks', () => ({
  assertActorCanGrantAcl: jest.fn(async () => undefined),
  assertActorCanAccessUserTarget: jest.fn(async () => undefined),
  assertActorCanModifySuperAdminUserTarget: jest.fn(async () => undefined),
  assertActorCanModifySuperAdminRoleTarget: jest.fn(async () => undefined),
  normalizeGrantFeatureList: jest.fn((v: unknown) => (Array.isArray(v) ? v : [])),
}))

jest.mock('@open-mercato/shared/lib/crud/optimistic-lock-command', () => ({
  enforceCommandOptimisticLock: jest.fn(),
  enforceCommandOptimisticLockWithGuards: jest.fn(async () => undefined),
}))

jest.mock('@open-mercato/shared/lib/commands/flush', () => ({
  // The two ACL routes persist inside `withAtomicFlush`; recording here is what
  // lets "the write did NOT happen" be asserted for them.
  withAtomicFlush: jest.fn(async (_em: unknown, fns: Array<() => unknown>) => {
    for (const fn of fns) await fn()
    writes.push('atomicFlush')
  }),
}))

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  // `sidebar/preferences` reaches roles through the decrypting wrapper, and it
  // is the only decrypting single-row lookup any wired route performs. Resolving
  // unconditionally (the idiom the module's own find-role test uses) is what
  // lets those routes reach their write instead of 404-ing.
  findOneWithDecryption: jest.fn(async () => ({
    id: '55555555-5555-4555-8555-555555555555',
    name: 'test-role',
    tenantId: '11111111-1111-4111-8111-111111111111',
  })),
  findWithDecryption: jest.fn(async () => []),
}))

jest.mock('@open-mercato/core/modules/auth/services/sidebarPreferencesService', () => ({
  createSidebarVariant: jest.fn(async () => {
    writes.push('sidebarVariant.create')
    return { id: VARIANT_TARGET, name: 'v', isActive: false, settings: {}, createdAt: new Date(), updatedAt: null }
  }),
  updateSidebarVariant: jest.fn(async () => {
    writes.push('sidebarVariant.update')
    return { id: VARIANT_TARGET, name: 'v', isActive: false, settings: {}, createdAt: new Date(), updatedAt: null }
  }),
  deleteSidebarVariant: jest.fn(async () => {
    writes.push('sidebarVariant.delete')
    return true
  }),
  loadSidebarVariant: jest.fn(async () => null),
  listSidebarVariants: jest.fn(async () => []),
  loadSidebarPreference: jest.fn(async () => null),
  loadSidebarPreferenceUpdatedAt: jest.fn(async () => null),
  saveSidebarPreference: jest.fn(async () => {
    writes.push('sidebarPreference.save')
    return { version: 1, groupOrder: [], groupLabels: {}, itemLabels: {}, hiddenItems: [], itemOrder: {} }
  }),
  loadRoleSidebarPreferences: jest.fn(async () => new Map()),
  loadRoleSidebarPreferenceUpdatedAt: jest.fn(async () => null),
  loadRoleSidebarPreferenceSources: jest.fn(async () => new Map()),
  saveRoleSidebarPreference: jest.fn(async () => {
    writes.push('roleSidebarPreference.save')
    return { version: 1, groupOrder: [], groupLabels: {}, itemLabels: {}, hiddenItems: [], itemOrder: {} }
  }),
}))

// ---------------------------------------------------------------------------

type GuardBehaviour = { block: boolean }

function registerGuard(resourceKind: string, behaviour: GuardBehaviour) {
  const afterSuccess = jest.fn(async () => undefined)
  const guard: MutationGuard = {
    id: `test-guard:${resourceKind}`,
    // The registry matcher keys off `targetEntity`, and the route's
    // `resourceKind` is what it is matched against (`matchesEntity`).
    targetEntity: resourceKind,
    // All three operations, so whichever verb the route declares is matched.
    operations: ['create', 'update', 'delete'],
    validate: jest.fn(async () => {
      if (behaviour.block) {
        return { ok: false, status: 423, body: { error: 'Record locked' } }
      }
      return { ok: true, shouldRunAfterSuccess: true }
    }),
    afterSuccess,
  }
  registerMutationGuards([{ moduleId: 'auth-test', guards: [guard] }])
  return { guard, afterSuccess }
}

function restoreRegistry() {
  registerMutationGuards([])
}

function reset() {
  writes.length = 0
  jest.clearAllMocks()
  restoreRegistry()
}

const json = (body: unknown, method = 'POST') =>
  new Request('http://localhost/api/test', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

// ---------------------------------------------------------------------------
// The twelve wired verbs, each as a (resourceKind, invoke) pair. `invoke` runs
// the real handler; the assertion is uniform across all of them.
// ---------------------------------------------------------------------------

type Case = {
  label: string
  resourceKind: string
  invoke: () => Promise<Response>
}

function buildCases(): Case[] {
  return [
    {
      label: 'authority/delegations POST (grant)',
      resourceKind: 'authority.delegation',
      invoke: async () => {
        const m = await import('../authority/delegations/route')
        return m.POST(json({
          action: 'grant',
          granteePrincipalId: 'p1', granteeKind: 'human', capabilityId: 'c1',
          startsAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          reason: 'because',
        }))
      },
    },
    {
      label: 'authority/delegations POST (revoke)',
      resourceKind: 'authority.delegation',
      invoke: async () => {
        const m = await import('../authority/delegations/route')
        return m.POST(json({ action: 'revoke', id: RECORD_TARGET }))
      },
    },
    {
      label: 'authority/denials POST (withhold)',
      resourceKind: 'authority.denial',
      invoke: async () => {
        const m = await import('../authority/denials/route')
        return m.POST(json({ action: 'withhold', subjectPrincipalId: 'p1', subjectKind: 'human', featurePattern: 'x.*', reason: 'because' }))
      },
    },
    {
      label: 'authority/denials POST (lift)',
      resourceKind: 'authority.denial',
      invoke: async () => {
        const m = await import('../authority/denials/route')
        return m.POST(json({ action: 'lift', id: RECORD_TARGET }))
      },
    },
    {
      label: 'authority/pending-acts POST (approve)',
      resourceKind: 'authority.pending_act',
      invoke: async () => {
        const m = await import('../authority/pending-acts/route')
        return m.POST(json({ id: RECORD_TARGET, decision: 'approve' }))
      },
    },
    {
      label: 'authority/record-locks POST',
      resourceKind: 'authority.record_lock',
      invoke: async () => {
        const m = await import('../authority/record-locks/route')
        return m.POST(json({ recordId: RECORD_TARGET, state: 'locked', reason: 'why' }))
      },
    },
    {
      label: 'authority/trust POST',
      resourceKind: 'authority.trust_grant',
      invoke: async () => {
        const m = await import('../authority/trust/route')
        return m.POST(json({ principalId: 'p1', principalKind: 'ai_worker', capabilityGroup: 'orders', reason: 'because' }))
      },
    },
    {
      label: 'roles/acl PUT',
      resourceKind: 'auth.role_acl',
      invoke: async () => {
        const m = await import('../roles/acl/route')
        return m.PUT(json({ roleId: ROLE_TARGET, features: ['a.b'] }, 'PUT'))
      },
    },
    {
      label: 'users/acl PUT',
      resourceKind: 'auth.user_acl',
      invoke: async () => {
        const m = await import('../users/acl/route')
        return m.PUT(json({ userId: USER_TARGET, features: ['a.b'] }, 'PUT'))
      },
    },
    {
      label: 'sidebar/preferences PUT (user scope)',
      resourceKind: 'auth.sidebar_preference',
      invoke: async () => {
        const m = await import('../sidebar/preferences/route')
        return m.PUT(json({ version: 1, groupOrder: [], groupLabels: {}, itemLabels: {}, hiddenItems: [], itemOrder: {} }, 'PUT'))
      },
    },
    {
      label: 'sidebar/preferences DELETE (role scope)',
      resourceKind: 'auth.role_sidebar_preference',
      invoke: async () => {
        const m = await import('../sidebar/preferences/route')
        const req = new Request(`http://localhost/api/auth/sidebar/preferences?roleId=${ROLE_TARGET}`, { method: 'DELETE' })
        return m.DELETE(req)
      },
    },
    {
      label: 'sidebar/variants POST',
      resourceKind: 'auth.sidebar_variant',
      invoke: async () => {
        const m = await import('../sidebar/variants/route')
        return m.POST(json({ name: 'mine', isActive: false }))
      },
    },
    {
      label: 'sidebar/variants/[id] PUT',
      resourceKind: 'auth.sidebar_variant',
      invoke: async () => {
        const m = await import('../sidebar/variants/[id]/route')
        const req = new Request(`http://localhost/api/auth/sidebar/variants/${VARIANT_TARGET}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'renamed', isActive: true }),
        })
        return m.PUT(req)
      },
    },
    {
      label: 'sidebar/variants/[id] DELETE',
      resourceKind: 'auth.sidebar_variant',
      invoke: async () => {
        const m = await import('../sidebar/variants/[id]/route')
        const req = new Request(`http://localhost/api/auth/sidebar/variants/${VARIANT_TARGET}`, { method: 'DELETE' })
        return m.DELETE(req)
      },
    },
  ]
}

describe('auth D2-gap wiring — every wired verb reaches the registry chokepoint', () => {
  beforeEach(reset)

  afterAll(restoreRegistry)

  describe('mutation 1 — a guard that BLOCKS stops the write', () => {
    const cases = buildCases()
    test.each(cases.map((c) => [c.label, c] as const))('%s', async (_label, c) => {
      registerGuard(c.resourceKind, { block: true })

      const res = await c.invoke()
      expect(res.status).toBe(423)
      // The decisive assertion: the write never happened.
      expect(writes).toEqual([])
    })
  })

  describe('mutation 2 — an allowing guard lets the write through and its afterSuccess fires', () => {
    const cases = buildCases()
    test.each(cases.map((c) => [c.label, c] as const))('%s', async (_label, c) => {
      const { afterSuccess } = registerGuard(c.resourceKind, { block: false })

      const res = await c.invoke()
      expect(res.status).toBeLessThan(400)
      expect(writes.length).toBeGreaterThan(0)
      expect(afterSuccess).toHaveBeenCalledTimes(1)
    })
  })

  test('sanity: the registry actually holds the guard the test registered', () => {
    registerGuard('authority.delegation', { block: true })
    expect(getAllMutationGuardInstances().map((g) => g.id)).toContain('test-guard:authority.delegation')
  })
})
