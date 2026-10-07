/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `progress` module shipped **no mutation guard
 * mechanism of any kind** — no wrapper, no `runRouteMutationGuards` call, no
 * `makeCrudRoute`, and neither of the `@deprecated` pair. All **THREE** of its
 * write verbs were therefore checked by nothing:
 *
 *   1. `api/jobs/route.ts`           POST    -> progressService.createJob  (persist)
 *   2. `api/jobs/[id]/route.ts`      PUT     -> progressService.updateProgress (flush)
 *   3. `api/jobs/[id]/route.ts`      DELETE  -> progressService.cancelJob  (flush)
 *
 * This suite proves each one now runs a guard, by registering a **real** guard
 * in the global store (`registerMutationGuards`) and driving the **real** route
 * handlers with `runRouteMutationGuards` left **UNMOCKED**. Mocking the wrapper
 * would only prove a function of that name is called; a real registered guard
 * proves the registry chokepoint is actually reached from the route.
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict (the registered guard returns ok:false) stops the
 *      write — the service method is never called and no after-success fires;
 *   2. an **allow** verdict lets the write run — the service method IS called
 *      and the guard's after-success fires exactly once.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'

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

const serviceStub = {
  createJob: jest.fn(async () => {
    record('createJob')
    return { id: 'job-1' }
  }),
  updateProgress: jest.fn(async () => {
    record('updateProgress')
    return { progressPercent: 42 }
  }),
  cancelJob: jest.fn(async () => {
    record('cancelJob')
  }),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'progressService') return serviceStub
      if (key === 'em') return { findOne: async () => ({ id: 'job-1' }) }
      throw new Error(`unexpected resolve: ${key}`)
    },
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) }),
}))

import { POST as jobsPost } from '../jobs/route'
import { PUT as jobPut, DELETE as jobDelete } from '../jobs/[id]/route'

function installGuard(mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: 'test.progress-job.guard',
    targetEntity: 'progress.job',
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

function makeRequest(method: string, url = 'http://localhost/api/progress/jobs', body?: unknown) {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  registerMutationGuards([])
})

describe('progress D2-gap wiring — every write verb reaches the registry', () => {
  describe('progress.job guard — block stops the write', () => {
    it('jobs POST', async () => {
      installGuard('block')
      const res = await jobsPost(
        makeRequest('POST', 'http://localhost/api/progress/jobs', { jobType: 'import', name: 'Import' }),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('createJob')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('jobs/[id] PUT', async () => {
      installGuard('block')
      const res = await jobPut(
        makeRequest('PUT', 'http://localhost/api/progress/jobs/job-1', { progressPercent: 50 }),
        { params: { id: 'job-1' } },
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('updateProgress')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('jobs/[id] DELETE', async () => {
      installGuard('block')
      const res = await jobDelete(makeRequest('DELETE', 'http://localhost/api/progress/jobs/job-1'), {
        params: { id: 'job-1' },
      })
      expect(res.status).toBe(422)
      expect(writes).not.toContain('cancelJob')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('progress.job guard — allow runs the write and fires after-success once', () => {
    it('jobs POST', async () => {
      installGuard('allow')
      const res = await jobsPost(
        makeRequest('POST', 'http://localhost/api/progress/jobs', { jobType: 'import', name: 'Import' }),
      )
      expect(res.status).toBe(201)
      expect(writes).toContain('createJob')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('jobs/[id] PUT', async () => {
      installGuard('allow')
      const res = await jobPut(
        makeRequest('PUT', 'http://localhost/api/progress/jobs/job-1', { progressPercent: 50 }),
        { params: { id: 'job-1' } },
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('updateProgress')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('jobs/[id] DELETE', async () => {
      installGuard('allow')
      const res = await jobDelete(makeRequest('DELETE', 'http://localhost/api/progress/jobs/job-1'), {
        params: { id: 'job-1' },
      })
      expect(res.status).toBe(200)
      expect(writes).toContain('cancelJob')
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

    const res = await jobsPost(
      makeRequest('POST', 'http://localhost/api/progress/jobs', { jobType: 'import', name: 'Import' }),
    )
    expect(res.status).toBe(201)
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })
})
