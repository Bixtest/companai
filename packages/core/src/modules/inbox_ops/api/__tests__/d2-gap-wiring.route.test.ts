/**
 * D2-gap wiring proof for `inbox_ops` (2026-10-07).
 *
 * WHAT THIS PROVES, AND WHY IT IS NOT THE SAME AS `mutation-guards.test.ts`:
 * the older suite STUBS the registry call (`runRouteMutationGuardsMock`), so it
 * proves only that the module wrapper is *reached*. This suite registers a
 * **real** guard in the global mutation-guard store via `registerMutationGuards`
 * and lets the **real** `runRouteMutationGuards` run, driving the **real**
 * handlers. That is what makes a mutation of the wrapper's block path or its
 * after-success runner visible: a mock of the wrapper would prove only that a
 * function of that name is called.
 *
 * Two mutations, per the sweep's protocol:
 *   1. BLOCK — the guard refuses (423) and the write NEVER HAPPENS. Asserted by
 *      the entity manager's write record staying empty, not by the status alone.
 *   2. ALLOW — the write HAPPENS and the guard's `afterSuccess` fires exactly
 *      once.
 *
 * The nine verbs covered are the nine `inbox_ops` write routes this change
 * wired: `extract`, `emails/[id]/reprocess`, `proposals/[id]/translate`,
 * `proposals/[id]/reject`, `proposals/[id]/actions/[actionId]/{accept,complete,
 * reject}`, `proposals/[id]/replies/[replyId]/send` and `settings` (PATCH).
 *
 * The tenth formerly-unguarded route, `webhook/inbound.ts`, is deliberately NOT
 * covered here and is NOT wired: it is a public, actor-less endpoint (see
 * `analysis/d2-gap/measure.js` → `ACTORLESS_PATHS`). There is no `userId` to
 * evaluate a guard set against, so it is guarded by its own signature /
 * rate-limit mechanisms and set aside by name rather than wired with a
 * fabricated actor.
 *
 * THREE DISJOINT MUTATIONS proved the suite bites; every file was restored
 * byte-identical (verified two ways — md5, and a `git diff --numstat` reading
 * pure insertions with zero deletions):
 *   A. neuter the wrapper's BLOCK path → 10 RED (all 9 block tests + the
 *      "settings carries its own resourceKind" block test); the 9 allow tests
 *      and the two negatives stayed green.
 *   B. remove the guard call from ONE route (`translate`) → exactly 1 RED (that
 *      route's block test); the other 8 verbs stayed green.
 *   C. sever the wrapper's WHOLE after-success path (BOTH the direct branch and
 *      the `resourceIdOverride` rebind branch) → 9 RED (all 9 allow tests).
 *      Severing only the direct branch was the trap recorded during the
 *      `business_rules` fix; it was avoided by severing both from the start.
 *
 * TWO THINGS THIS SUITE ITSELF GOT WRONG, recorded because a re-run of one's own
 * check would hide both:
 *   1. A guard registered with the ROUTE's `'custom'` operation never matches.
 *      `runRouteMutationGuards` maps `'custom'` → `'update'` BEFORE filtering
 *      guards by `g.operations`, so a guard must declare the registry operation.
 *      The first cut declared `['custom']` and three verbs silently returned 200
 *      with the guard unfired — the registration helper now maps it.
 *   2. An earlier edit collapsed a newline in `translate/route.ts`
 *      (`findWithDecryption(      ctx.em,`). It typechecked and tests passed, so
 *      ONLY the md5 / zero-deletion check caught it. Fixed; the file is
 *      byte-identical to its pre-mutation hash.
 */

const tenantId = '11111111-1111-4111-8111-111111111111'
const organizationId = '22222222-2222-4222-8222-222222222222'
const userId = '33333333-3333-4333-8333-333333333333'
const proposalId = '44444444-4444-4444-8444-444444444444'
const actionId = '55555555-5555-4555-8555-555555555555'
const emailId = '66666666-6666-4666-8666-666666666666'
const settingsId = '77777777-7777-4777-8777-777777777777'
const createdEmailId = '88888888-8888-4888-8888-888888888888'

// ---------------------------------------------------------------------------
// The entity-manager write record: the ground truth for "did the write happen".
// A block assertion that read only the response would pass even if the write had
// run and the response merely looked blocked.
// ---------------------------------------------------------------------------
var writes: string[] = []
var afterSuccessCalls: number = 0

function resetRecord() {
  writes = []
  afterSuccessCalls = 0
}

const flushMock = jest.fn(async () => {
  writes.push('em.flush')
})
const nativeUpdateMock = jest.fn(async () => {
  writes.push('em.nativeUpdate')
  return 1
})
const transactionalMock = jest.fn(async (cb: (trx: unknown) => unknown) => {
  writes.push('em.transactional')
  return cb(trx)
})

const persistMock = jest.fn(() => {
  writes.push('trx.persist')
})
const createMock = jest.fn((_entity: unknown, data: Record<string, unknown>) => {
  writes.push('trx.create')
  // For the extract route the created row is the email; give it an id.
  return { id: createdEmailId, ...data }
})
const assignMock = jest.fn()
const removeMock = jest.fn()

// A single `trx` object; the transactional mock runs the callback on it.
const trx = {
  persist: persistMock,
  flush: flushMock,
  create: createMock,
  assign: assignMock,
  remove: removeMock,
}

// `findOneWithDecryption` is used for the audited re-read inside the
// transaction. It returns a mutable row so the routes' scalar updates land.
let findOneResult: unknown = null
const findOneMock = jest.fn(async () => findOneResult)

const em = {
  flush: flushMock,
  nativeUpdate: nativeUpdateMock,
  transactional: transactionalMock,
  persist: persistMock,
  create: createMock,
  assign: assignMock,
}

const container = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return em
    if (token === 'cache') return null
    throw new Error(`unexpected token ${token}`)
  }),
}

const ctx = {
  auth: { sub: userId, tenantId, orgId: organizationId },
  userId,
  tenantId,
  organizationId,
  scope: { tenantId, organizationId },
  em,
  container,
  eventBus: null,
}

// ---------------------------------------------------------------------------
// Service mocks — everything the routes call besides the guard.
// ---------------------------------------------------------------------------
const rejectProposalMock = jest.fn(async () => {
  writes.push('executionEngine.rejectProposal')
})
const rejectActionMock = jest.fn(async () => {
  writes.push('executionEngine.rejectAction')
})
const executeActionMock = jest.fn(async () => {
  writes.push('executionEngine.executeAction')
  return { success: true, statusCode: 200 }
})
const recalculateProposalStatusMock = jest.fn(async () => {
  writes.push('executionEngine.recalculateProposalStatus')
})
const translateProposalContentMock = jest.fn(async () => {
  writes.push('translationProvider.translate')
  return { summary: 'translated', actions: {} }
})
const createMessageRecordForReplyMock = jest.fn(async () => {
  writes.push('messagesIntegration.createMessageRecordForReply')
  return { messageId: 'msg-1' }
})
const emitInboxOpsEventMock = jest.fn(async () => undefined)
const writeDirectWriteAuditLogMock = jest.fn(async () => undefined)
const resendSendMock = jest.fn(async () => {
  writes.push('resend.send')
  return { data: { id: 'provider-msg-1' }, error: null }
})
const retireActiveProposalsForEmailMock = jest.fn(async () => {
  writes.push('reprocess.retireActiveProposals')
  return { retiredProposalCount: 1, retiredActionCount: 1 }
})
const enforceOptimisticLockMock = jest.fn(async () => undefined)
const invalidateCountsCacheMock = jest.fn(async () => undefined)
const invalidateSettingsCacheMock = jest.fn(async () => undefined)

class UnauthorizedError extends Error {}

// `findWithDecryption` is used by reprocess to retire proposals/actions.
const findWithDecryptionMock = jest.fn(async () => [])

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: (...args: unknown[]) => findOneMock(...args),
  findWithDecryption: (...args: unknown[]) => findWithDecryptionMock(...args),
}))

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: (...args: unknown[]) => writeDirectWriteAuditLogMock(...args),
}))

jest.mock('@open-mercato/cache', () => ({
  runWithCacheTenant: async (_tenant: string, fn: () => unknown) => fn(),
}))

jest.mock('@open-mercato/shared/lib/crud/optimistic-lock-command', () => ({
  enforceCommandOptimisticLockWithGuards: (...args: unknown[]) => enforceOptimisticLockMock(...args),
}))

jest.mock('@open-mercato/shared/lib/crud/errors', () => ({
  isCrudHttpError: jest.fn(() => false),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({ child: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) }),
}))

jest.mock('../../data/entities', () => {
  class InboxEmail {}
  class InboxProposal {}
  class InboxProposalAction {}
  class InboxDiscrepancy {}
  class InboxSettings {}
  return { InboxEmail, InboxProposal, InboxProposalAction, InboxDiscrepancy, InboxSettings }
})

jest.mock('../../events', () => ({
  emitInboxOpsEvent: (...args: unknown[]) => emitInboxOpsEventMock(...args),
}))

jest.mock('../../lib/cache', () => ({
  resolveCache: jest.fn(() => ({})),
  invalidateCountsCache: (...args: unknown[]) => invalidateCountsCacheMock(...args),
  invalidateSettingsCache: (...args: unknown[]) => invalidateSettingsCacheMock(...args),
  createSettingsCacheKey: jest.fn(() => 'k'),
  createSettingsCacheTag: jest.fn(() => 't'),
  SETTINGS_CACHE_TTL_MS: 1000,
}))

jest.mock('../../lib/translationProvider', () => ({
  translateProposalContent: (...args: unknown[]) => translateProposalContentMock(...args),
}))

jest.mock('../../lib/messagesIntegration', () => ({
  createMessageRecordForReply: (...args: unknown[]) => createMessageRecordForReplyMock(...args),
}))

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send: (...args: unknown[]) => resendSendMock(...args) } })),
}))

jest.mock('../../lib/executionEngine', () => ({
  rejectProposal: (...args: unknown[]) => rejectProposalMock(...args),
  rejectAction: (...args: unknown[]) => rejectActionMock(...args),
  executeAction: (...args: unknown[]) => executeActionMock(...args),
  recalculateProposalStatus: (...args: unknown[]) => recalculateProposalStatusMock(...args),
}))

jest.mock('../routeHelpers', () => ({
  resolveRequestContext: jest.fn(async () => ctx),
  resolveProposal: jest.fn(async () => ({ id: proposalId, workingLanguage: 'en', translations: null })),
  resolveActionAndProposal: jest.fn(async () => ({
    action: { id: actionId, proposalId, status: 'pending', actionType: 'draft_reply', payload: {} },
    proposal: { id: proposalId },
  })),
  resolveCrossModuleEntities: jest.fn(() => ({})),
  toExecutionContext: jest.fn(() => ({})),
  extractPathSegment: jest.fn((_url: URL, after: string) => (after === 'emails' ? emailId : 'rep-1')),
  handleRouteError: jest.fn((err: unknown, label: string) => {
    const { NextResponse } = require('next/server')
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: `Failed to ${label}` }, { status: 500 })
  }),
  isErrorResponse: jest.fn((value: unknown) => {
    const { NextResponse } = require('next/server')
    return value instanceof NextResponse
  }),
  UnauthorizedError,
}))

import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

import { POST as extractPost } from '../extract/route'
import { POST as reprocessPost } from '../emails/[id]/reprocess/route'
import { POST as translatePost } from '../proposals/[id]/translate/route'
import { POST as rejectProposalPost } from '../proposals/[id]/reject/route'
import { POST as acceptPost } from '../proposals/[id]/actions/[actionId]/accept/route'
import { PATCH as completePatch } from '../proposals/[id]/actions/[actionId]/complete/route'
import { POST as rejectActionPost } from '../proposals/[id]/actions/[actionId]/reject/route'
import { POST as sendReplyPost } from '../proposals/[id]/replies/[replyId]/send/route'
import { PATCH as settingsPatch } from '../settings/route'

/**
 * Register a REAL guard for one resourceKind. `behaviour` decides block vs
 * allow; on allow the guard requests `afterSuccess`.
 *
 * The registry only understands `create | update | delete`, and
 * `runRouteMutationGuards` maps a route's `'custom'` operation to `'update'`
 * BEFORE filtering guards by `g.operations`. So a guard must declare the
 * registry operation, not the route's spelling: this helper maps `'custom'`
 * to `'update'` exactly as the wrapper does, or a guard for a `custom` route
 * would never match.
 */
function registerGuard(
  resourceKind: string,
  behaviour: 'block' | 'allow',
  routeOperations: Array<'create' | 'update' | 'delete' | 'custom'> = ['create', 'update', 'delete', 'custom'],
) {
  const registryOperations = new Set<'create' | 'update' | 'delete'>()
  for (const op of routeOperations) registryOperations.add(op === 'custom' ? 'update' : op)
  const guard: MutationGuard = {
    id: `test-guard:${resourceKind}`,
    targetEntity: resourceKind,
    operations: [...registryOperations] as Array<'create' | 'update' | 'delete'>,
    priority: 10,
    validate: jest.fn(async () => {
      if (behaviour === 'block') {
        return { ok: false, status: 423, body: { error: 'blocked by test guard', resourceKind } }
      }
      return { ok: true, shouldRunAfterSuccess: true, metadata: { seen: resourceKind } }
    }),
    afterSuccess: jest.fn(async () => {
      afterSuccessCalls += 1
    }),
  }
  registerMutationGuards([{ moduleId: 'inbox_ops', guards: [guard] }])
  return guard
}

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

// `send` needs the provider configured, or it 503s before the guard is useful.
const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  resetRecord()
  jest.clearAllMocks()
  registerMutationGuards([{ moduleId: 'inbox_ops', guards: [] }])
  findOneResult = {
    id: actionId,
    proposalId,
    category: 'inquiry',
    actionType: 'draft_reply',
    payload: { to: 'a@b.co', subject: 's', body: 'b' },
    status: 'executed',
    metadata: {},
    translations: null,
    workingLanguage: 'en',
  }
  findOneMock.mockImplementation(async () => findOneResult)
  process.env.RESEND_API_KEY = 'test-key'
  process.env.NOTIFICATIONS_EMAIL_FROM = 'from@example.com'
  process.env.OM_DISABLE_EMAIL_DELIVERY = ''
  process.env.OM_TEST_MODE = ''
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

afterAll(() => {
  registerMutationGuards([{ moduleId: 'inbox_ops', guards: [] }])
})

type Case = {
  name: string
  resourceKind: string
  id: string
  verbs: Array<'create' | 'update' | 'delete' | 'custom'>
  run: () => Promise<Response>
  /** Every write verb this route issues, as recorded by the em write record. */
  expectWrote: () => void
}

function buildCases(): Case[] {
  const base = `http://localhost/api/inbox_ops`

  return [
    {
      name: 'extract POST (creates an email)',
      resourceKind: 'inbox_ops:inbox_email',
      id: 'new',
      verbs: ['create'],
      run: () => extractPost(jsonRequest(`${base}/extract`, 'POST', { text: 'hello world' })),
      expectWrote: () => expect(writes).toContain('em.transactional'),
    },
    {
      name: 'emails/[id]/reprocess POST',
      resourceKind: 'inbox_ops:inbox_email',
      id: emailId,
      verbs: ['update'],
      run: () => reprocessPost(jsonRequest(`${base}/emails/${emailId}/reprocess`, 'POST')),
      expectWrote: () => expect(writes).toContain('em.transactional'),
    },
    {
      name: 'proposals/[id]/translate POST',
      resourceKind: 'inbox_ops:inbox_proposal',
      id: proposalId,
      verbs: ['update'],
      run: () =>
        translatePost(jsonRequest(`${base}/proposals/${proposalId}/translate`, 'POST', { targetLocale: 'de' })),
      expectWrote: () => expect(writes).toContain('em.flush'),
    },
    {
      name: 'proposals/[id]/reject POST',
      resourceKind: 'inbox_ops:inbox_proposal',
      id: proposalId,
      verbs: ['custom'],
      run: () => rejectProposalPost(jsonRequest(`${base}/proposals/${proposalId}/reject`, 'POST')),
      expectWrote: () => expect(writes).toContain('executionEngine.rejectProposal'),
    },
    {
      name: 'proposals/[id]/actions/[actionId]/accept POST',
      resourceKind: 'inbox_ops:inbox_proposal_action',
      id: actionId,
      verbs: ['custom'],
      run: () =>
        acceptPost(jsonRequest(`${base}/proposals/${proposalId}/actions/${actionId}/accept`, 'POST')),
      expectWrote: () => expect(writes).toContain('executionEngine.executeAction'),
    },
    {
      name: 'proposals/[id]/actions/[actionId]/complete PATCH',
      resourceKind: 'inbox_ops:inbox_proposal_action',
      id: actionId,
      verbs: ['update'],
      run: () =>
        completePatch(
          jsonRequest(`${base}/proposals/${proposalId}/actions/${actionId}/complete`, 'PATCH', {
            createdEntityId: createdEmailId,
            createdEntityType: 'sales.order',
          }),
        ),
      expectWrote: () => expect(writes).toContain('em.transactional'),
    },
    {
      name: 'proposals/[id]/actions/[actionId]/reject POST',
      resourceKind: 'inbox_ops:inbox_proposal_action',
      id: actionId,
      verbs: ['update'],
      run: () =>
        rejectActionPost(jsonRequest(`${base}/proposals/${proposalId}/actions/${actionId}/reject`, 'POST')),
      expectWrote: () => expect(writes).toContain('executionEngine.rejectAction'),
    },
    {
      name: 'proposals/[id]/replies/[replyId]/send POST',
      resourceKind: 'inbox_ops:inbox_proposal_action',
      id: actionId,
      verbs: ['custom'],
      run: () =>
        sendReplyPost(jsonRequest(`${base}/proposals/${proposalId}/replies/rep-1/send`, 'POST')),
      // The irreversible step: the provider call must not have happened on block.
      expectWrote: () => expect(writes).toContain('resend.send'),
    },
    {
      name: 'settings PATCH',
      resourceKind: 'inbox_ops:inbox_settings',
      id: settingsId,
      verbs: ['update'],
      run: () => settingsPatch(jsonRequest(`${base}/settings`, 'PATCH', { workingLanguage: 'de' })),
      expectWrote: () => expect(writes).toContain('em.transactional'),
    },
  ]
}

describe('inbox_ops D2-gap wiring — real guard, real handlers', () => {
  const cases = buildCases()

  describe('mutation 1 — the guard BLOCKS: the write never happens', () => {
    for (const c of cases) {
      it(`${c.name} → 423 and no write`, async () => {
        registerGuard(c.resourceKind, 'block', c.verbs)

        const response = await c.run()

        expect(response.status).toBe(423)
        expect(afterSuccessCalls).toBe(0)
        // The decisive assertion: the entity manager recorded no write.
        expect(writes).toEqual([])
      })
    }
  })

  describe('mutation 2 — the guard ALLOWS: the write happens and afterSuccess fires once', () => {
    for (const c of cases) {
      it(`${c.name} → success, write recorded, afterSuccess once`, async () => {
        registerGuard(c.resourceKind, 'allow', c.verbs)

        const response = await c.run()

        expect(response.status).toBeLessThan(400)
        c.expectWrote()
        expect(afterSuccessCalls).toBe(1)
      })
    }
  })

  describe('the guard is evaluated against THIS module’s entity convention (colon form)', () => {
    it('a guard registered for a different entity does NOT fire', async () => {
      // A guard watching a proposal must not match the email routes.
      registerGuard('inbox_ops:inbox_proposal', 'block', ['create', 'update', 'delete', 'custom'])

      const response = await extractPost(jsonRequest(`http://localhost/api/inbox_ops/extract`, 'POST', { text: 'x' }))

      // Not blocked, because the extract route is guarded as `inbox_ops:inbox_email`.
      expect(response.status).toBeLessThan(400)
      expect(afterSuccessCalls).toBe(0)
    })

    it('the settings route carries its own resourceKind', async () => {
      const guard = registerGuard('inbox_ops:inbox_settings', 'block', ['update'])

      const response = await settingsPatch(
        jsonRequest(`http://localhost/api/inbox_ops/settings`, 'PATCH', { workingLanguage: 'en' }),
      )

      expect(response.status).toBe(423)
      expect(guard.validate).toHaveBeenCalled()
    })
  })
})
