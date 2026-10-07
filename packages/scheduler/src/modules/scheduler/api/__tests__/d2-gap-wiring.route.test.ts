/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `scheduler` module read as **1 unguarded verb across
 * 1 file**. Measured first (tool `--json` + a hand read of every `.ts` under
 * `api/`), the one verb is a genuine chokepoint miss, so it is wired:
 *
 *   1. `api/trigger/route.ts`  POST  -> manual trigger: enqueues a
 *      `scheduler-execution` BullMQ job for a `ScheduledJob`.
 *
 * WHY it is a gap and not a set-aside. The route is AUTHENTICATED
 * (`requireAuth: true`, `requireFeatures: ['scheduler.jobs.trigger']`) and has a
 * real actor (`auth.sub` / `auth.tenantId` / `auth.orgId`), so the registry
 * guard set CAN be evaluated against it. That is the opposite of the actor-less
 * set-aside class. The precedent is
 * `communication_channels/api/post/channels/[id]/poll-now`: an authenticated
 * action route that enqueues a job and is wired through the registry with
 * `operation: 'custom'`.
 *
 * The resource kind is `scheduler.job`, reached by TWO routes: the CRUD route
 * (`api/jobs/route.ts`) derives it from its `commandId` (`scheduler.jobs.create`
 * -> singularise -> `scheduler.job`), and the command layer
 * (`commands/jobs.ts`) writes `resourceKind: 'scheduler.job'` on all three
 * audit logs.
 *
 * This suite proves the wired verb now runs the registry, by registering a
 * **real** guard in the global store (`registerMutationGuards`) and driving the
 * **real** route handler with `runRouteMutationGuards` left **UNMOCKED**.
 * Mocking the wrapper would only prove a function of that name is called; a real
 * registered guard proves the registry chokepoint is actually reached.
 *
 * Two directions are asserted:
 *
 *   1. a **block** verdict stops the action — the queue is never touched and no
 *      after-success fires;
 *   2. an **allow** verdict lets the action run — the queue DOES receive the job
 *      and the guard's after-success fires exactly once.
 *
 * Plus: an out-of-kind control guard does not fire, the queue-strategy gate and
 * the not-found / system-scope checks still short-circuit before the guard, and
 * an unauthenticated request is rejected before any of it.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'
const SCHEDULE_ID = '11111111-1111-4111-8111-111111111111'

// ── Real registry (not stubbed) ────────────────────────────────────────────
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable side-effect record ──────────────────────────────────────────
const enqueueMock = jest.fn(async () => 'job-1')
const closeMock = jest.fn(async () => undefined)
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

// The route resolves user-facing strings; return the fallback so assertions on
// status codes are not coupled to translations.
jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: async () => ({ translate: (_key: string, fallback?: string) => fallback ?? _key }),
}))

jest.mock('@open-mercato/shared/lib/redis/connection', () => ({
  getRedisUrlOrThrow: () => 'redis://localhost:6379',
}))

// The queue is the write target; observe its calls, do not talk to Redis.
jest.mock('@open-mercato/queue', () => ({
  createQueue: jest.fn(() => ({ enqueue: enqueueMock, close: closeMock })),
}), { virtual: true })

// ── Container: a tiny resolver over the shared stubs ───────────────────────
jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => resolveStub(key),
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

const organizationSchedule = {
  id: SCHEDULE_ID,
  tenantId: TENANT_ID,
  organizationId: ORG_ID,
  scopeType: 'organization' as const,
  name: 'Nightly',
}

// What `em.findOne` returns for the next call; tests override it.
let findOneResult: unknown = organizationSchedule

function resolveStub(key: string): unknown {
  switch (key) {
    case 'em':
      return { findOne: async () => findOneResult }
    case 'rbacService':
      return {
        getGrantedFeatures: async () => [],
        loadAcl: async () => ({ isSuperAdmin: false, features: [], organizations: null }),
      }
    default:
      throw new Error(`unexpected resolve: ${key}`)
  }
}

// ── The route module is real; only its WRITE target (the queue) is observed.
//    Nothing here mocks the guard wrapper.
import { POST as triggerPost } from '../trigger/route'

function installGuard(kind: string, mode: 'block' | 'allow', operations?: MutationGuard['operations']) {
  const guard: MutationGuard = {
    id: `test.scheduler.${kind}.guard`,
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

function triggerRequest(body: unknown = { id: SCHEDULE_ID }) {
  return new Request('http://localhost/api/scheduler/trigger', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  seen.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  findOneResult = organizationSchedule
  process.env.QUEUE_STRATEGY = 'async'
  registerMutationGuards([])
})

describe('scheduler D2-gap wiring — the manual trigger reaches the registry', () => {
  const KIND = 'scheduler.job'

  describe('block verdict stops the action', () => {
    it('does not enqueue and does not fire after-success', async () => {
      installGuard(KIND, 'block')
      const res = await triggerPost(triggerRequest())
      expect(res.status).toBe(422)
      expect(enqueueMock).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('still reports the kind/operation/resourceId it was asked to guard', async () => {
      installGuard(KIND, 'block')
      await triggerPost(triggerRequest())
      // The route passes `operation: 'custom'`; the registry maps that to
      // `'update'` (`toRegistryMutationOperation`), which is what a guard sees.
      expect(seen[0]).toMatchObject({ kind: KIND, operation: 'update', resourceId: SCHEDULE_ID })
    })
  })

  describe('allow verdict runs the action once', () => {
    it('enqueues the job and fires after-success exactly once', async () => {
      installGuard(KIND, 'allow')
      const res = await triggerPost(triggerRequest())
      expect(res.status).toBe(200)
      expect(enqueueMock).toHaveBeenCalledTimes(1)
      expect(closeMock).toHaveBeenCalledTimes(1)
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
      expect(seen[0]).toMatchObject({ kind: KIND, operation: 'update', resourceId: SCHEDULE_ID })
    })

    it('passes the schedule id and manual trigger type to the queue payload', async () => {
      installGuard(KIND, 'allow')
      await triggerPost(triggerRequest())
      expect(enqueueMock).toHaveBeenCalledWith(
        expect.objectContaining({ scheduleId: SCHEDULE_ID, triggerType: 'manual', triggeredByUserId: USER_ID }),
      )
    })
  })

  it('a registered guard OUTSIDE the scheduler.job kind does not fire (control)', async () => {
    installGuard('some.other.entity', 'block')
    const res = await triggerPost(triggerRequest())
    expect(res.status).toBe(200)
    expect(enqueueMock).toHaveBeenCalledTimes(1)
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })

  it('a guard scoped to a different operation does not fire on a custom action (control)', async () => {
    installGuard(KIND, 'block', ['delete'])
    const res = await triggerPost(triggerRequest())
    expect(res.status).toBe(200)
    expect(enqueueMock).toHaveBeenCalledTimes(1)
  })

  it('an unauthenticated request is rejected before the guard runs (401)', async () => {
    currentAuth = null
    installGuard(KIND, 'block')
    const res = await triggerPost(triggerRequest())
    expect(res.status).toBe(401)
    expect(enqueueMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })

  it('a missing schedule short-circuits before the guard runs (404)', async () => {
    findOneResult = null
    installGuard(KIND, 'block')
    const res = await triggerPost(triggerRequest())
    expect(res.status).toBe(404)
    expect(enqueueMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })

  it('a system-scoped schedule without the super-admin flag is refused before the guard (403)', async () => {
    findOneResult = { id: SCHEDULE_ID, tenantId: null, organizationId: null, scopeType: 'system', name: 'Sys' }
    installGuard(KIND, 'allow')
    const res = await triggerPost(triggerRequest())
    expect(res.status).toBe(403)
    expect(enqueueMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })

  it('the non-async queue strategy gate returns 400 before the guard runs', async () => {
    process.env.QUEUE_STRATEGY = 'local'
    installGuard(KIND, 'block')
    const res = await triggerPost(triggerRequest())
    expect(res.status).toBe(400)
    expect(enqueueMock).not.toHaveBeenCalled()
    expect(seen).toHaveLength(0)
  })
})
