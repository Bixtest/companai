/**
 * Two-mutation proof that the `business_rules` module's 11 formerly-unguarded
 * write verbs now pass through the registry chokepoint.
 *
 * The defect this closes (BACKLOG `D2-gap`): *"routes that call no guard
 * whatsoever — neither the registry nor the deprecated pair — so a write there
 * is checked by nothing."* `business_rules` had **11 such verbs across 5 files**:
 *
 *   - `rules/route.ts`                  POST, PUT, DELETE
 *   - `sets/route.ts`                   POST, PUT, DELETE
 *   - `sets/[id]/members/route.ts`      POST, PUT, DELETE
 *   - `execute/route.ts`                POST
 *   - `execute/[ruleId]/route.ts`       POST
 *
 * Each is now wired through `beginBusinessRulesMutationGuard()`, which calls
 * `runRouteMutationGuards()` — the registry, not the deprecated singleton.
 *
 * **What was NOT missing, and what this test therefore does NOT claim.** All
 * eleven verbs already enforced `metadata.requireFeatures`
 * (`business_rules.manage` / `.manage_sets` / `.execute`) and scoped every
 * lookup by tenant + organization. The defect was the missing structural
 * chokepoint. This test asserts the chokepoint is now wired — not that the
 * routes were previously unprotected.
 *
 * **How it refuses to prove it by accident.** A mock of
 * `beginBusinessRulesMutationGuard` would prove only that the route calls a
 * function with that name. Instead this test registers a **real** guard in the
 * global mutation-guard store and drives the **real** route handlers, so the
 * assertion is on observable behaviour:
 *
 *   - **Mutation 1 (block):** the guard refuses → the route returns the guard's
 *     status and the write **never happens** (the entity manager records no
 *     persist/flush/remove for that route).
 *   - **Mutation 2 (allow + after-success):** the guard permits and asks for
 *     `afterSuccess` → the write happens **and** the callback fires exactly
 *     once, with the resource the route was writing.
 *
 * The guard is registered against the route's own `resourceKind`, so a guard
 * that never fires fails loudly rather than passing vacuously.
 */

const TENANT = '11111111-1111-4111-8111-111111111111'
const ACTOR = '22222222-2222-4222-8222-222222222222'
const ORG = '33333333-3333-4333-8333-333333333333'
const RULE_TARGET = '44444444-4444-4444-8444-444444444444'
const SET_TARGET = '55555555-5555-4555-8555-555555555555'
const MEMBER_TARGET = '66666666-6666-4666-8666-666666666666'

import {
  registerMutationGuards,
} from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ---------------------------------------------------------------------------
// Shared route doubles. The entity manager records every write so a test can
// assert "the write did NOT happen" by observing the record.
// ---------------------------------------------------------------------------

// Hoisted above the `jest.mock` factories below, which reference it.
var writes: string[] = []
var afterSuccessCalls: string[] = []

type Behaviour = 'allow' | 'block'

/**
 * Build a REAL registry guard bound to `resourceKind`. `block` makes `validate`
 * refuse with 423; `allow` lets it through and records `afterSuccess`.
 */
function registerGuard(resourceKind: string, behaviour: Behaviour) {
  const guard: MutationGuard = {
    id: `test.${resourceKind}`,
    targetEntity: resourceKind,
    operations: ['create', 'update', 'delete'],
    validate: async (input) => {
      if (behaviour === 'block') {
        return { ok: false, status: 423, body: { error: 'blocked by test guard' } }
      }
      return { ok: true, shouldRunAfterSuccess: true }
    },
    afterSuccess: async (input) => {
      afterSuccessCalls.push(`${resourceKind}:${input.resourceId ?? ''}`)
    },
  }
  registerMutationGuards([{ moduleId: 'business_rules', guards: [guard] }])
}

// A rule / rule-set / member row so the update + delete paths reach their write
// instead of 404-ing on a missing row.
const ruleRow: any = {
  id: RULE_TARGET,
  ruleId: 'RULE-001',
  ruleName: 'Existing Rule',
  ruleType: 'GUARD',
  entityType: 'WorkOrder',
  conditionExpression: { field: 'status', operator: '=', value: 'ACTIVE' },
  tenantId: TENANT,
  organizationId: ORG,
  updatedAt: new Date(),
  deletedAt: null,
}
const setRow: any = {
  id: SET_TARGET,
  setId: 'SET-001',
  setName: 'Existing Set',
  tenantId: TENANT,
  organizationId: ORG,
  updatedAt: new Date(),
  deletedAt: null,
}
const memberRow: any = {
  id: MEMBER_TARGET,
  ruleSet: SET_TARGET,
  rule: RULE_TARGET,
  tenantId: TENANT,
  organizationId: ORG,
  sequence: 0,
  enabled: true,
}

const em: any = {
  findOne: jest.fn(async (entity: unknown, where: any) => {
    const name = (entity as { name?: string })?.name
    if (name === 'BusinessRule') return ruleRow
    if (name === 'RuleSet') return setRow
    // `sets/[id]/members` POST looks up an existing membership to 409 on a
    // duplicate. Return `null` so the route proceeds to the write; the PUT and
    // DELETE paths look up the member by id and need the row.
    if (name === 'RuleSetMember') {
      if (where?.id === MEMBER_TARGET) return memberRow
      return null
    }
    return null
  }),
  find: jest.fn(async (entity: unknown) => {
    const name = (entity as { name?: string })?.name
    // `executeRules` discovers applicable rules via `find`; returning the
    // existing rule makes the engine execute it and write its log row.
    if (name === 'BusinessRule') return [ruleRow]
    return []
  }),
  findAndCount: jest.fn(async () => [[], 0]),
  create: jest.fn((entity: unknown, data: any) => {
    const name = (entity as { name?: string })?.name
    if (name === 'BusinessRule') return { ...data, id: RULE_TARGET }
    if (name === 'RuleSet') return { ...data, id: SET_TARGET }
    if (name === 'RuleSetMember') return { ...data, id: MEMBER_TARGET }
    if (name === 'RuleExecutionLog') return { ...data, id: MEMBER_TARGET }
    return { ...data, id: MEMBER_TARGET }
  }),
  persist: jest.fn(function persist() {
    writes.push('em.persist')
    return em
  }),
  remove: jest.fn(() => {
    writes.push('em.remove')
    return em
  }),
  assign: jest.fn((target: any, data: any) => Object.assign(target, data)),
  flush: jest.fn(async () => {
    writes.push('em.flush')
  }),
  nativeDelete: jest.fn(async () => {
    writes.push('em.nativeDelete')
    return 1
  }),
}

const container: any = {
  resolve: (token: string) => {
    switch (token) {
      case 'em':
        return em
      case 'cache':
        return {
          get: jest.fn(async () => null),
          set: jest.fn(async () => undefined),
          deleteByTags: jest.fn(async () => 0),
          clearAll: jest.fn(),
        }
      case 'eventBus':
        return { emitEvent: jest.fn(async () => undefined) }
      default:
        return undefined
    }
  },
}

const mockGetAuthFromRequest = jest.fn(async () => ({
  sub: ACTOR,
  email: 'actor@example.com',
  tenantId: TENANT,
  orgId: ORG,
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => container),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn((request: Request) => mockGetAuthFromRequest(request)),
}))

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: jest.fn(async () => ({
    locale: 'en',
    dict: {},
    t: (key: string, fallback?: string) => fallback ?? key,
    translate: (key: string, fallback?: string) => fallback ?? key,
  })),
}))

jest.mock('@open-mercato/shared/lib/logger', () => {
  const mocked = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn() }
  mocked.child.mockImplementation(() => mocked)
  return { createLogger: jest.fn(() => mocked) }
})

// The optimistic-lock helper is used by the rules + sets PUT/DELETE paths; the
// real one reaches the registry too, so stub it to a no-op to keep this test
// focused on the module wrapper's own call.
jest.mock('@open-mercato/shared/lib/crud/optimistic-lock-command', () => ({
  enforceCommandOptimisticLock: jest.fn(async () => undefined),
  enforceCommandOptimisticLockWithGuards: jest.fn(async () => undefined),
}))

// ---------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------

import type { POST as ExecutePOST, metadata as ExecuteMeta } from '../execute/route'
import type { POST as ExecuteByIdPOST } from '../execute/[ruleId]/route'
import type {
  POST as RulesPOST,
  PUT as RulesPUT,
  DELETE as RulesDELETE,
} from '../rules/route'
import type {
  POST as SetsPOST,
  PUT as SetsPUT,
  DELETE as SetsDELETE,
} from '../sets/route'
import type {
  POST as MembersPOST,
  PUT as MembersPUT,
  DELETE as MembersDELETE,
} from '../sets/[id]/members/route'

type Case = {
  name: string
  resourceKind: string
  invoke: () => Promise<Response>
}

let rulesModule: any
let setsModule: any
let membersModule: any
let executeModule: any
let executeByIdModule: any

beforeAll(async () => {
  rulesModule = await import('../rules/route')
  setsModule = await import('../sets/route')
  membersModule = await import('../sets/[id]/members/route')
  executeModule = await import('../execute/route')
  executeByIdModule = await import('../execute/[ruleId]/route')
})

function buildCases(): Case[] {
  return [
    {
      name: 'rules POST',
      resourceKind: 'business_rules.rule',
      invoke: () =>
        rulesModule.POST(
          new Request('http://localhost/api/business_rules/rules', {
            method: 'POST',
            body: JSON.stringify({
              ruleId: 'RULE-NEW',
              ruleName: 'New Rule',
              ruleType: 'GUARD',
              entityType: 'WorkOrder',
              conditionExpression: { field: 'status', operator: '=', value: 'ACTIVE' },
            }),
          }),
        ),
    },
    {
      name: 'rules PUT',
      resourceKind: 'business_rules.rule',
      invoke: () =>
        rulesModule.PUT(
          new Request('http://localhost/api/business_rules/rules', {
            method: 'PUT',
            body: JSON.stringify({ id: RULE_TARGET, ruleName: 'Updated' }),
          }),
        ),
    },
    {
      name: 'rules DELETE',
      resourceKind: 'business_rules.rule',
      invoke: () =>
        rulesModule.DELETE(
          new Request(`http://localhost/api/business_rules/rules?id=${RULE_TARGET}`, { method: 'DELETE' }),
        ),
    },
    {
      name: 'sets POST',
      resourceKind: 'business_rules.ruleSet',
      invoke: () =>
        setsModule.POST(
          new Request('http://localhost/api/business_rules/sets', {
            method: 'POST',
            body: JSON.stringify({ setId: 'SET-NEW', setName: 'New Set' }),
          }),
        ),
    },
    {
      name: 'sets PUT',
      resourceKind: 'business_rules.ruleSet',
      invoke: () =>
        setsModule.PUT(
          new Request('http://localhost/api/business_rules/sets', {
            method: 'PUT',
            body: JSON.stringify({ id: SET_TARGET, setName: 'Updated' }),
          }),
        ),
    },
    {
      name: 'sets DELETE',
      resourceKind: 'business_rules.ruleSet',
      invoke: () =>
        setsModule.DELETE(
          new Request(`http://localhost/api/business_rules/sets?id=${SET_TARGET}`, { method: 'DELETE' }),
        ),
    },
    {
      name: 'members POST',
      resourceKind: 'business_rules.ruleSetMember',
      invoke: () =>
        membersModule.POST(
          new Request(`http://localhost/api/business_rules/sets/${SET_TARGET}/members`, {
            method: 'POST',
            body: JSON.stringify({ ruleId: RULE_TARGET }),
          }),
          { params: { id: SET_TARGET } },
        ),
    },
    {
      name: 'members PUT',
      resourceKind: 'business_rules.ruleSetMember',
      invoke: () =>
        membersModule.PUT(
          new Request(`http://localhost/api/business_rules/sets/${SET_TARGET}/members`, {
            method: 'PUT',
            body: JSON.stringify({ memberId: MEMBER_TARGET, sequence: 2 }),
          }),
          { params: { id: SET_TARGET } },
        ),
    },
    {
      name: 'members DELETE',
      resourceKind: 'business_rules.ruleSetMember',
      invoke: () =>
        membersModule.DELETE(
          new Request(
            `http://localhost/api/business_rules/sets/${SET_TARGET}/members?memberId=${MEMBER_TARGET}`,
            { method: 'DELETE' },
          ),
          { params: { id: SET_TARGET } },
        ),
    },
    {
      name: 'execute POST',
      resourceKind: 'business_rules.executionLog',
      invoke: () =>
        executeModule.POST(
          new Request('http://localhost/api/business_rules/execute', {
            method: 'POST',
            body: JSON.stringify({ entityType: 'WorkOrder', data: { status: 'ACTIVE' } }),
          }),
        ),
    },
    {
      name: 'execute/[ruleId] POST',
      resourceKind: 'business_rules.executionLog',
      invoke: () =>
        executeByIdModule.POST(
          new Request(`http://localhost/api/business_rules/execute/${RULE_TARGET}`, {
            method: 'POST',
            body: JSON.stringify({ data: { status: 'ACTIVE' } }),
          }),
          { params: Promise.resolve({ ruleId: RULE_TARGET }) },
        ),
    },
  ]
}

beforeEach(() => {
  writes = []
  afterSuccessCalls = []
  jest.clearAllMocks()
  mockGetAuthFromRequest.mockResolvedValue({
    sub: ACTOR,
    email: 'actor@example.com',
    tenantId: TENANT,
    orgId: ORG,
  })
})

describe('business_rules D2-gap wiring — mutation 1: a blocking guard stops the write', () => {
  const cases = buildCases()
  for (const c of cases) {
    test(`${c.name} reports the guard's status and does not write`, async () => {
      registerGuard(c.resourceKind, 'block')
      writes = []

      const res = await c.invoke()

      expect(res.status).toBe(423)
      expect(writes).toEqual([])
      expect(afterSuccessCalls).toEqual([])
    })
  }
})

describe('business_rules D2-gap wiring — mutation 2: an allowing guard lets the write through and fires afterSuccess', () => {
  const cases = buildCases()
  for (const c of cases) {
    test(`${c.name} writes and fires afterSuccess once`, async () => {
      registerGuard(c.resourceKind, 'allow')
      writes = []
      afterSuccessCalls = []

      const res = await c.invoke()

      expect(res.status).toBeLessThan(400)
      expect(writes.length).toBeGreaterThan(0)
      expect(afterSuccessCalls).toHaveLength(1)
    })
  }
})

describe('business_rules D2-gap wiring — the routes still enforce their own capability', () => {
  test('every write verb declares its feature requirement', () => {
    expect(executeModule.metadata.POST).toEqual({
      requireAuth: true,
      requireFeatures: ['business_rules.execute'],
    })
    expect(executeByIdModule.metadata.POST).toEqual({
      requireAuth: true,
      requireFeatures: ['business_rules.execute'],
    })
    expect(rulesModule.metadata.POST.requireFeatures).toEqual(['business_rules.manage'])
    expect(rulesModule.metadata.PUT.requireFeatures).toEqual(['business_rules.manage'])
    expect(rulesModule.metadata.DELETE.requireFeatures).toEqual(['business_rules.manage'])
    expect(setsModule.metadata.POST.requireFeatures).toEqual(['business_rules.manage_sets'])
    expect(setsModule.metadata.PUT.requireFeatures).toEqual(['business_rules.manage_sets'])
    expect(setsModule.metadata.DELETE.requireFeatures).toEqual(['business_rules.manage_sets'])
    expect(membersModule.metadata.POST.requireFeatures).toEqual(['business_rules.manage_sets'])
    expect(membersModule.metadata.PUT.requireFeatures).toEqual(['business_rules.manage_sets'])
    expect(membersModule.metadata.DELETE.requireFeatures).toEqual(['business_rules.manage_sets'])
  })

  test('an unauthenticated write is refused before any guard runs', async () => {
    registerGuard('business_rules.rule', 'allow')
    mockGetAuthFromRequest.mockResolvedValue(null as any)
    writes = []

    const res = await rulesModule.POST(
      new Request('http://localhost/api/business_rules/rules', {
        method: 'POST',
        body: JSON.stringify({ ruleId: 'R', ruleName: 'N', ruleType: 'GUARD', entityType: 'X' }),
      }),
    )

    expect(res.status).toBe(401)
    expect(writes).toEqual([])
  })
})
