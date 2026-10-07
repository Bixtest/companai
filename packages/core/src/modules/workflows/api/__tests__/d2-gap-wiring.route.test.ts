/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `workflows` module's wrapper `beginWorkflowsMutationGuard`
 * existed since the D2-wide migration, but only the THREE definition-write routes
 * used it. Ten further write routes called **no guard at all** — neither the
 * wrapper nor the deprecated pair. This suite proves the NINE genuinely-writing
 * verbs among them now run a guard, by registering a **real** guard in the global
 * store and driving the **real** route handlers.
 *
 * The tenth verb, `api/instances/validate-start` POST, is NOT wired — it is a
 * read-only endpoint that merely evaluates START pre-conditions (`dryRun: true`,
 * no entity-manager write anywhere in `lib/start-validator.ts`). A guard there
 * would run its after-success for a mutation that never happened, so it is set
 * aside by name in the measurement tool (`READ_ONLY_SET_ASIDE`), not wired.
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict (a real registered guard returns ok:false) stops the
 *      write — its own downstream library function is NEVER called and no
 *      after-success fires;
 *   2. an **allow** verdict lets the write run — its library function IS called
 *      once and the guard's after-success fires exactly once.
 *
 * A mock of `beginWorkflowsMutationGuard` would only prove a function of that
 * name is called; registering a real guard proves the registry chokepoint is
 * actually reached from the route.
 */

const TENANT_ID = '123e4567-e89b-12d3-a456-426614174001'
const ORG_ID = '123e4567-e89b-12d3-a456-426614174002'
const USER_ID = 'user-1'
const DEFINITION_ID = '123e4567-e89b-12d3-a456-426614174070'
const INSTANCE_ID = '123e4567-e89b-12d3-a456-426614174080'
const TASK_ID = '123e4567-e89b-12d3-a456-426614174090'

const runAfterSuccessMock = jest.fn(async () => undefined)

// ── Real registry (not stubbed) ────────────────────────────────────────────
// `runRouteMutationGuards` is left UNMOCKED so the real guard set registered via
// `registerMutationGuards()` is what decides the outcome.
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable write record ────────────────────────────────────────────────
const writes: string[] = []
function record(name: string) {
  writes.push(name)
}

// ── Entity manager stub ────────────────────────────────────────────────────
// `findOne` is shared by two different callers, so it cannot return one fixed
// value: the definition routes use it for the duplicate-name gate (which must
// return null, or the route answers 409 before the guard), while the instance
// routes load the target row through it (via `findOneWithDecryption`). It
// discriminates on the `where` shape: a `{ workflowId, … }` lookup is the
// duplicate gate and never matches; anything else returns the instance row.
const instanceRecord = {
  id: INSTANCE_ID,
  status: 'RUNNING',
  currentStepId: 'step-1',
  organizationId: ORG_ID,
  tenantId: TENANT_ID,
  context: {},
  errorMessage: null,
  errorDetails: null,
  retryCount: 0,
  updatedAt: new Date('2026-06-01T10:00:00.000Z'),
}

let findOneResult: unknown = null

const taskRecord = { id: TASK_ID, status: 'IN_PROGRESS', tenantId: TENANT_ID, organizationId: ORG_ID }

const mockEm = {
  findOne: jest.fn(async (_entity: unknown, where?: Record<string, unknown>) => {
    if (where && 'workflowId' in where) return null
    return findOneResult
  }),
  find: jest.fn(async () => []),
  findAndCount: jest.fn(async () => [[], 0]),
  create: jest.fn((_entity: unknown, data: Record<string, unknown>) => {
    record('em.create')
    return { ...data, id: DEFINITION_ID }
  }),
  persist: jest.fn(() => { record('em.persist'); return mockEm }),
  remove: jest.fn(() => { record('em.remove'); return mockEm }),
  count: jest.fn(async () => 0),
  flush: jest.fn(async () => { record('em.flush') }),
  refresh: jest.fn(async () => undefined),
  transactional: jest.fn(async (work: () => Promise<unknown>) => work()),
  fork: jest.fn(() => mockEm),
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

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

jest.mock('../../lib/event-trigger-service', () => ({ invalidateTriggerCache: jest.fn() }))
jest.mock('../../lib/code-registry', () => ({
  getCodeWorkflow: jest.fn(() => null),
  getAllCodeWorkflows: jest.fn(() => []),
}))
jest.mock('../definitions/serialize', () => ({
  serializeWorkflowDefinition: (def: { id: string }) => ({ id: def.id }),
  serializeCodeWorkflowDefinition: (def: { workflowId: string }, id: string) => ({ id, workflowId: def.workflowId }),
}))

// The nine write routes call into these libraries; each stub records the call so
// a blocked guard is observable as "the library was never reached".
jest.mock('../../lib/workflow-executor', () => ({
  startWorkflow: jest.fn(async () => { record('startWorkflow'); return { id: INSTANCE_ID, status: 'RUNNING', currentStepId: 'step-1' } }),
  executeWorkflow: jest.fn(async () => { record('executeWorkflow'); return { status: 'RUNNING' } }),
  completeWorkflow: jest.fn(async () => { record('completeWorkflow') }),
  updateWorkflowContext: jest.fn(async () => { record('updateWorkflowContext') }),
  WorkflowExecutionError: class WorkflowExecutionError extends Error {
    code: string
    details: unknown
    constructor(message: string) { super(message); this.code = 'ERR'; this.details = null }
  },
}))

jest.mock('../../lib/transition-handler', () => ({
  findValidTransitions: jest.fn(async () => ([{ isValid: true, transition: { fromStepId: 'step-1', toStepId: 'step-2', transitionId: 't1' } }])),
  executeTransition: jest.fn(async () => { record('executeTransition'); return { success: true } }),
}))

jest.mock('../../lib/step-handler', () => ({}))

jest.mock('../../lib/signal-handler', () => ({
  sendSignal: jest.fn(async () => { record('sendSignal') }),
  sendSignalByCorrelationKey: jest.fn(async () => { record('sendSignalByCorrelationKey'); return 1 }),
}))

jest.mock('../../lib/task-handler', () => ({
  claimUserTask: jest.fn(async () => { record('claimUserTask') }),
  completeUserTask: jest.fn(async () => { record('completeUserTask') }),
}))

import { POST as createDefinition } from '../definitions/route'
import { POST as startInstance } from '../instances/route'
import { POST as advanceInstance } from '../instances/[id]/advance/route'
import { POST as cancelInstance } from '../instances/[id]/cancel/route'
import { POST as retryInstance } from '../instances/[id]/retry/route'
import { POST as signalInstance } from '../instances/[id]/signal/route'
import { POST as sendSignalByKey } from '../signals/route'
import { POST as claimTask } from '../tasks/[id]/claim/route'
import { POST as completeTask } from '../tasks/[id]/complete/route'

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }) as never
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) } as never
}

// Route → (call, resourceKind, operation). Each returns a Response.
interface Case {
  name: string
  /** The downstream library call that IS the write for this route. */
  writeMarker: string
  resourceKind: string
  operation: string
  /**
   * Some routes gate the write on their OWN pre-condition — e.g. `retry` only
   * accepts a FAILED instance — and reject with 400 BEFORE the guard runs. The
   * stub row must satisfy that gate or the test would measure the route's
   * validation instead of the guard. Defaults to the RUNNING instance record.
   */
  instanceOverrides?: Record<string, unknown>
  call: () => Promise<Response>
}

function buildCases(): Case[] {
  return [
    {
      name: 'definitions POST (create)',
      writeMarker: 'em.persist',
      resourceKind: 'workflows.definition',
      operation: 'create',
      // `workflowDefinitionDataSchema.transitions` is `.min(1)` — a definition
      // with no transition is a 400 from the route's OWN schema validation, so a
      // valid definition needs at least one START→END transition.
      call: () => createDefinition(
        jsonRequest('http://localhost/api/workflows/definitions', 'POST', {
          workflowId: 'flow', workflowName: 'Flow', version: 1,
          definition: {
            steps: [{ stepId: 'a', stepName: 'a', stepType: 'START' }, { stepId: 'b', stepName: 'b', stepType: 'END' }],
            transitions: [{ transitionId: 'a-to-b', fromStepId: 'a', toStepId: 'b', trigger: 'auto' }],
          },
        }),
      ),
    },
    {
      name: 'instances POST (start)',
      writeMarker: 'startWorkflow',
      resourceKind: 'workflows.instance',
      operation: 'custom',
      call: () => startInstance(
        jsonRequest('http://localhost/api/workflows/instances', 'POST', { workflowId: 'flow', version: 1, initialContext: {} }),
      ),
    },
    {
      name: 'instances/[id]/advance POST',
      writeMarker: 'executeTransition',
      resourceKind: 'workflows.instance',
      operation: 'custom',
      call: () => advanceInstance(jsonRequest(`http://localhost/api/workflows/instances/${INSTANCE_ID}/advance`, 'POST', {}), ctx(INSTANCE_ID)),
    },
    {
      name: 'instances/[id]/cancel POST',
      writeMarker: 'completeWorkflow',
      resourceKind: 'workflows.instance',
      operation: 'update',
      call: () => cancelInstance(jsonRequest(`http://localhost/api/workflows/instances/${INSTANCE_ID}/cancel`, 'POST'), ctx(INSTANCE_ID)),
    },
    {
      name: 'instances/[id]/retry POST',
      writeMarker: 'executeWorkflow',
      resourceKind: 'workflows.instance',
      operation: 'update',
      // `retry` rejects any status other than FAILED with 400 before the guard.
      instanceOverrides: { status: 'FAILED', errorMessage: 'boom', errorDetails: null },
      call: () => retryInstance(jsonRequest(`http://localhost/api/workflows/instances/${INSTANCE_ID}/retry`, 'POST'), ctx(INSTANCE_ID)),
    },
    {
      name: 'instances/[id]/signal POST',
      writeMarker: 'sendSignal',
      resourceKind: 'workflows.instance',
      operation: 'custom',
      call: () => signalInstance(jsonRequest(`http://localhost/api/workflows/instances/${INSTANCE_ID}/signal`, 'POST', { signalName: 'go' }), ctx(INSTANCE_ID)),
    },
    {
      name: 'signals POST (by correlation key)',
      writeMarker: 'sendSignalByCorrelationKey',
      resourceKind: 'workflows.instance',
      operation: 'custom',
      call: () => sendSignalByKey(
        jsonRequest('http://localhost/api/workflows/signals', 'POST', { correlationKey: 'order-1', signalName: 'go' }),
      ),
    },
    {
      name: 'tasks/[id]/claim POST',
      writeMarker: 'claimUserTask',
      resourceKind: 'workflows.task',
      operation: 'custom',
      call: () => claimTask(
        jsonRequest(`http://localhost/api/workflows/tasks/${TASK_ID}/claim`, 'POST'),
        { params: { id: TASK_ID } } as never,
      ),
    },
    {
      name: 'tasks/[id]/complete POST',
      writeMarker: 'completeUserTask',
      resourceKind: 'workflows.task',
      operation: 'update',
      call: () => completeTask(
        jsonRequest(`http://localhost/api/workflows/tasks/${TASK_ID}/complete`, 'POST', { formData: { ok: true } }),
        { params: { id: TASK_ID } } as never,
      ),
    },
  ]
}

/**
 * A guard whose `validate` returns the verdict the current case wants, bound to
 * the route's resourceKind. The registry maps the route's `custom` operation to
 * `update` before filtering (`toRegistryMutationOperation`), so `operations` is
 * declared with the mapped value to be sure the guard matches.
 */
function registerGuard(resourceKind: string, routeOperation: string, verdict: 'block' | 'allow') {
  const operation = routeOperation === 'custom' ? 'update' : routeOperation
  const guard: MutationGuard = {
    id: `guard-${resourceKind}-${verdict}`,
    targetEntity: resourceKind,
    operations: [operation as MutationGuard['operations'][number]],
    validate: jest.fn(async () => (verdict === 'block'
      ? { ok: false, status: 423, body: { error: 'blocked by guard' } }
      : { ok: true, shouldRunAfterSuccess: true })),
    afterSuccess: runAfterSuccessMock,
  }
  registerMutationGuards([{ moduleId: 'workflows', guards: [guard] }])
  return guard
}

describe('workflows D2-gap wiring — a real guard blocks or allows each newly-wired write', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    writes.length = 0
    findOneResult = null
    mockEm.fork.mockReturnValue(mockEm)
  })

  afterEach(() => {
    registerMutationGuards([])
  })

  const cases = buildCases()

  describe('block — the guard refuses and the write never happens', () => {
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      findOneResult = {
        ...instanceRecord,
        ...(c.resourceKind === 'workflows.task' ? taskRecord : {}),
        ...(c.instanceOverrides ?? {}),
      }
      registerGuard(c.resourceKind, c.operation, 'block')

      const res = await c.call()

      expect(res.status).toBe(423)
      expect(await res.json()).toEqual({ error: 'blocked by guard' })
      expect(writes).not.toContain(c.writeMarker)
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('allow — the write runs and after-success fires exactly once', () => {
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      findOneResult = {
        ...instanceRecord,
        ...(c.resourceKind === 'workflows.task' ? taskRecord : {}),
        ...(c.instanceOverrides ?? {}),
      }
      registerGuard(c.resourceKind, c.operation, 'allow')

      const res = await c.call()

      expect(res.status).toBeLessThan(400)
      expect(writes).toContain(c.writeMarker)
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })
  })
})
