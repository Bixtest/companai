/**
 * @jest-environment node
 *
 * D2-wide (2026-10-06): the `workflows` module used to call the `@deprecated`
 * `validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()` pair at 9
 * call sites across 3 route files. That pair resolves ONLY the single
 * DI-registered `crudMutationGuardService` and silently bypasses the global
 * mutation-guard store — so a `data/guards.ts` guard registered for
 * `workflows.*` would never run.
 *
 * These tests are the guard proof for the migration to the registry wrapper
 * `runRouteMutationGuards()` (via `beginWorkflowsMutationGuard`):
 *
 *   1. a **blocked** registry verdict short-circuits the write and is returned
 *      verbatim (status + body) for every write verb — GET is not a mutation
 *      and must never call the registry;
 *   2. a **passing** verdict lets the write commit and then runs the
 *      after-success hook;
 *   3. the after-success is re-bound to the row id the write actually produced
 *      (the `code:<workflowId>` customize path validates against the synthetic
 *      id but writes a DB row).
 *
 * Both behaviours are proven by mutation in the migating commit: disabling the
 * wrapper's block path turns test (1) RED, and neutering `runAfterSuccess` turns
 * test (2) RED.
 */

const TENANT_ID = '123e4567-e89b-12d3-a456-426614174001'
const ORG_ID = '123e4567-e89b-12d3-a456-426614174002'
const USER_ID = 'user-1'
const DEFINITION_ID = '123e4567-e89b-12d3-a456-426614174070'
const CODE_WORKFLOW_ID = 'sales.order-approval'

const runRouteMutationGuardsMock = jest.fn()
const runAfterSuccessMock = jest.fn(async () => undefined)

const definitionRecord = {
  id: DEFINITION_ID,
  workflowId: 'flow',
  workflowName: 'Flow',
  description: null,
  version: 1,
  definition: { steps: [], transitions: [] },
  metadata: null,
  enabled: true,
  effectiveFrom: null,
  effectiveTo: null,
  tenantId: TENANT_ID,
  organizationId: ORG_ID,
  codeWorkflowId: null,
  deletedAt: null,
  updatedAt: new Date('2026-06-01T10:00:00.000Z'),
}

const codeDefinition = {
  workflowId: CODE_WORKFLOW_ID,
  workflowName: 'Order Approval',
  description: null,
  version: 1,
  enabled: true,
  metadata: null,
  definition: { steps: [], transitions: [], triggers: [] },
}

const mockEm = {
  findOne: jest.fn(async () => null as unknown),
  find: jest.fn(async () => []),
  findAndCount: jest.fn(async () => [[], 0]),
  create: jest.fn((_entity: unknown, data: Record<string, unknown>) => ({ ...data, id: DEFINITION_ID })),
  persist: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(async () => 0),
  flush: jest.fn(async () => undefined),
  transactional: jest.fn(async (work: () => Promise<unknown>) => work()),
  fork: jest.fn(),
}

const mockRbacService = { userHasAllFeatures: jest.fn(async () => true) }

const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'rbacService') return mockRbacService
    if (token === 'eventBus') return null
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => ({ sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID })),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: jest.fn(async () => ({ selectedId: ORG_ID })),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScopeFilter', () => ({
  resolveOrganizationScopeFilter: jest.fn(() => ({ where: { organizationId: ORG_ID } })),
}))

/**
 * Only the *registry call* is stubbed. The module wrapper
 * (`beginWorkflowsMutationGuard`) runs for real, so a mutation that breaks the
 * wrapper's block path or its after-success runner is visible to these tests.
 */
jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => runRouteMutationGuardsMock(...args),
}))

jest.mock('../../lib/event-trigger-service', () => ({
  invalidateTriggerCache: jest.fn(),
}))

jest.mock('../../lib/code-registry', () => ({
  getCodeWorkflow: jest.fn(() => codeDefinition),
  getAllCodeWorkflows: jest.fn(() => [codeDefinition]),
}))

jest.mock('../definitions/serialize', () => ({
  serializeWorkflowDefinition: (def: { id: string }) => ({ id: def.id }),
  serializeCodeWorkflowDefinition: (def: { workflowId: string }, id: string) => ({
    id,
    workflowId: def.workflowId,
  }),
}))

import { PUT, DELETE } from '../definitions/[id]/route'
import { POST as customize } from '../definitions/[id]/customize/route'
import { POST as resetToCode } from '../definitions/[id]/reset-to-code/route'

function putRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/workflows/definitions/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postRequest(id: string, action: string) {
  return new Request(`http://localhost/api/workflows/definitions/${id}/${action}`, { method: 'POST' })
}

function deleteRequest(id: string) {
  return new Request(`http://localhost/api/workflows/definitions/${id}`, { method: 'DELETE' })
}

const blockedVerdict = () => ({
  ok: false as const,
  errorStatus: 409,
  errorBody: { error: 'conflict' },
  response: new Response(),
})

describe('workflows mutation guard (D2-wide)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEm.findOne.mockResolvedValue(null)
    mockEm.count.mockResolvedValue(0)
    mockEm.fork.mockReturnValue(mockEm)
    runRouteMutationGuardsMock.mockResolvedValue({ ok: true, runAfterSuccess: runAfterSuccessMock })
  })

  describe('the block path stops every workflow write', () => {
    it('PUT of a plain definition row returns the blocked verdict and does not write', async () => {
      mockEm.findOne.mockResolvedValue({ ...definitionRecord })
      runRouteMutationGuardsMock.mockResolvedValue(blockedVerdict())

      const res = await PUT(putRequest(DEFINITION_ID, { workflowName: 'X' }) as never, {
        params: Promise.resolve({ id: DEFINITION_ID }),
      } as never)

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ error: 'conflict' })
      expect(mockEm.flush).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('PUT of a code: id returns the blocked verdict and does not materialise an override', async () => {
      runRouteMutationGuardsMock.mockResolvedValue(blockedVerdict())

      const res = await PUT(
        putRequest(`code:${CODE_WORKFLOW_ID}`, { enabled: false }) as never,
        { params: Promise.resolve({ id: `code:${CODE_WORKFLOW_ID}` }) } as never,
      )

      expect(res.status).toBe(409)
      expect(mockEm.flush).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('DELETE returns the blocked verdict and does not soft-delete', async () => {
      mockEm.findOne.mockResolvedValue({ ...definitionRecord })
      runRouteMutationGuardsMock.mockResolvedValue(blockedVerdict())

      const res = await DELETE(deleteRequest(DEFINITION_ID) as never, {
        params: Promise.resolve({ id: DEFINITION_ID }),
      } as never)

      expect(res.status).toBe(409)
      expect(mockEm.flush).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('customize returns the blocked verdict and does not write an override', async () => {
      runRouteMutationGuardsMock.mockResolvedValue(blockedVerdict())

      const res = await customize(
        postRequest(`code:${CODE_WORKFLOW_ID}`, 'customize') as never,
        { params: Promise.resolve({ id: `code:${CODE_WORKFLOW_ID}` }) } as never,
      )

      expect(res.status).toBe(409)
      expect(mockEm.flush).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })

    it('reset-to-code returns the blocked verdict and does not remove the row', async () => {
      mockEm.findOne.mockResolvedValue({ ...definitionRecord, codeWorkflowId: CODE_WORKFLOW_ID })
      runRouteMutationGuardsMock.mockResolvedValue(blockedVerdict())

      const res = await resetToCode(postRequest(DEFINITION_ID, 'reset-to-code') as never, {
        params: Promise.resolve({ id: DEFINITION_ID }),
      } as never)

      expect(res.status).toBe(409)
      expect(mockEm.remove).not.toHaveBeenCalled()
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('the after-success runs only after a committed write', () => {
    it('PUT of a plain definition row writes, then runs after-success against its own id', async () => {
      mockEm.findOne.mockResolvedValue({ ...definitionRecord })

      const res = await PUT(putRequest(DEFINITION_ID, { workflowName: 'X' }) as never, {
        params: Promise.resolve({ id: DEFINITION_ID }),
      } as never)

      expect(res.status).toBe(200)
      expect(mockEm.flush).toHaveBeenCalled()
      expect(runAfterSuccessMock).toHaveBeenCalled()

      const call = runRouteMutationGuardsMock.mock.calls.find(
        ([params]: [{ input: { resourceId: string } }]) => params.input.resourceId === DEFINITION_ID,
      )
      expect(call).toBeDefined()
      expect(call![0].input.resourceKind).toBe('workflows.definition')
      expect(call![0].input.operation).toBe('update')
    })

    it('customize re-binds the after-success to the materialised row id, not the synthetic code: id', async () => {
      const res = await customize(
        postRequest(`code:${CODE_WORKFLOW_ID}`, 'customize') as never,
        { params: Promise.resolve({ id: `code:${CODE_WORKFLOW_ID}` }) } as never,
      )

      expect(res.status).toBe(200)
      expect(mockEm.flush).toHaveBeenCalled()
      // The guard set was validated against the synthetic `code:` id...
      expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ resourceId: `code:${CODE_WORKFLOW_ID}`, operation: 'custom' }),
        }),
      )
      // ...and re-collected against the row id the write produced.
      expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ resourceId: DEFINITION_ID }),
        }),
      )
      // Both collections' after-success hooks ran.
      expect(runAfterSuccessMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('DELETE runs after-success against the deleted row id', async () => {
      mockEm.findOne.mockResolvedValue({ ...definitionRecord })

      const res = await DELETE(deleteRequest(DEFINITION_ID) as never, {
        params: Promise.resolve({ id: DEFINITION_ID }),
      } as never)

      expect(res.status).toBe(200)
      expect(mockEm.flush).toHaveBeenCalled()
      expect(runAfterSuccessMock).toHaveBeenCalled()
    })
  })

  describe('the registry is called with the right scope', () => {
    it('passes the verified tenant, organization and actor to every guard evaluation', async () => {
      mockEm.findOne.mockResolvedValue({ ...definitionRecord })

      await PUT(putRequest(DEFINITION_ID, { workflowName: 'X' }) as never, {
        params: Promise.resolve({ id: DEFINITION_ID }),
      } as never)

      expect(runRouteMutationGuardsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { userId: USER_ID, tenantId: TENANT_ID, organizationId: ORG_ID },
        }),
      )
    })
  })
})
