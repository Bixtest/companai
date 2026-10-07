/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): `directory/api/organization-edges/route.ts` exported
 * **THREE** write verbs that called **no mutation guard of any kind** — not the
 * registry, not the module wrapper, and not the `@deprecated` pair (the route
 * did call `enforceCommandOptimisticLockWithGuards`, but that is the
 * *command-lock floor*, NOT the mutation-guard registry — a `grep -i guard`
 * trap the `directory` record already documents):
 *
 *   1. `POST`   -> creates an `OrganizationEdge` (trx.persist(edge).flush())
 *   2. `PATCH`  -> updates the edge (trx.flush())
 *   3. `DELETE` -> soft-deletes the edge (trx.flush())
 *
 * This suite proves each one now runs the registry guard, by registering a
 * **real** guard in the global store and driving the **real** handlers with
 * `runRouteMutationGuards` left **UNMOCKED**. It also proves the guard runs
 * BEFORE the write (a block leaves the transaction uncalled).
 */
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

const TENANT_ID = 'tenant-1'
const USER_ID = 'user-1'

// The route's own schema gates on RFC-4122 UUIDs (`z.string().uuid()`), and its
// tree-inversion check reads `ancestorIds`. Both are the route's own gates and
// must pass for the allow path to reach the write — so the fixtures are real
// UUIDs, not arbitrary strings.
const EDGE_ID = '11111111-1111-4111-8111-111111111111'
const PARENT_ID = '22222222-2222-4222-8222-222222222222'
const CHILD_ID = '33333333-3333-4333-8333-333333333333'

const writes: string[] = []
function record(name: string) {
  writes.push(name)
}
const runAfterSuccessMock = jest.fn(async () => undefined)

let currentAuth: Record<string, unknown> | null = { sub: USER_ID, tenantId: TENANT_ID }

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => currentAuth),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }) }),
}))

// The edge row that PATCH/DELETE load before writing.
const edgeRow = {
  id: EDGE_ID,
  childId: CHILD_ID,
  parentId: PARENT_ID,
  updatedAt: new Date(),
  deletedAt: null,
}

const emStub = {
  find: async () => [{ id: PARENT_ID }, { id: CHILD_ID }],
  findOne: async () => ({ ...edgeRow, ancestorIds: [] }),
  transactional: async (fn: (trx: unknown) => Promise<unknown>) => {
    record('transaction')
    const trx = {
      create: () => ({ ...edgeRow, id: 'edge-new' }),
      persist: () => ({ flush: async () => undefined }),
      flush: async () => undefined,
      findOne: async () => ({ ...edgeRow }),
    }
    return fn(trx)
  },
}

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

jest.mock('@open-mercato/shared/lib/crud/optimistic-lock-command', () => ({
  enforceCommandOptimisticLockWithGuards: jest.fn(async () => undefined),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'em') return emStub
      if (key === 'authorityGraphService') return { invalidateTenant: async () => undefined }
      throw new Error(`unexpected resolve: ${key}`)
    },
    hasRegistration: () => false,
    dispose: async () => undefined,
  }),
}))

import { POST, PATCH, DELETE } from '../organization-edges/route'

function installGuard(mode: 'block' | 'allow') {
  const guard: MutationGuard = {
    id: 'test.directory-edge.guard',
    targetEntity: 'directory.organization_edge',
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

function makeRequest(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  writes.length = 0
  currentAuth = { sub: USER_ID, tenantId: TENANT_ID }
  registerMutationGuards([])
})

describe('directory organization-edges D2-gap wiring', () => {
  describe('block stops the write', () => {
    it('POST', async () => {
      installGuard('block')
      const res = await POST(
        makeRequest('POST', 'http://localhost/api/directory/organization-edges', {
          parentId: PARENT_ID,
          childId: CHILD_ID,
          relationshipType: 'owns',
          inheritanceMode: 'strict',
          authorityCeiling: 'A5',
        }),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('transaction')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('PATCH', async () => {
      installGuard('block')
      const res = await PATCH(
        makeRequest('PATCH', 'http://localhost/api/directory/organization-edges', {
          id: EDGE_ID,
          authorityCeiling: 'A3',
        }),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('transaction')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('DELETE', async () => {
      installGuard('block')
      const res = await DELETE(
        makeRequest('DELETE', `http://localhost/api/directory/organization-edges?id=${EDGE_ID}`),
      )
      expect(res.status).toBe(422)
      expect(writes).not.toContain('transaction')
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('allow runs the write and fires after-success once', () => {
    it('POST', async () => {
      installGuard('allow')
      const res = await POST(
        makeRequest('POST', 'http://localhost/api/directory/organization-edges', {
          parentId: PARENT_ID,
          childId: CHILD_ID,
          relationshipType: 'owns',
          inheritanceMode: 'strict',
          authorityCeiling: 'A5',
        }),
      )
      expect(res.status).toBe(201)
      expect(writes).toContain('transaction')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('PATCH', async () => {
      installGuard('allow')
      const res = await PATCH(
        makeRequest('PATCH', 'http://localhost/api/directory/organization-edges', {
          id: EDGE_ID,
          authorityCeiling: 'A3',
        }),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('transaction')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })

    it('DELETE', async () => {
      installGuard('allow')
      const res = await DELETE(
        makeRequest('DELETE', `http://localhost/api/directory/organization-edges?id=${EDGE_ID}`),
      )
      expect(res.status).toBe(200)
      expect(writes).toContain('transaction')
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  it('a guard OUTSIDE the touched kind does not fire (control)', async () => {
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

    const res = await DELETE(
      makeRequest('DELETE', `http://localhost/api/directory/organization-edges?id=${EDGE_ID}`),
    )
    expect(res.status).toBe(200)
    expect(runAfterSuccessMock).not.toHaveBeenCalled()
  })
})
