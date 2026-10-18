/**
 * The boundary rejects a subject that names two actors — `CC-124`.
 *
 * **The defect this closes at the route.** `POST api/authority/delegations`
 * decided *"is this a delegation to yourself?"* by comparing the raw request
 * field to `principal.id`. For a machine, `principal.id` is the **bare** key id
 * (`auth.keyId ?? parsed.id`), so submitting
 * `granteePrincipalId: "ai_worker:<the caller's own key>"` produced two
 * different strings and the check passed: a self-delegation with no authority
 * ceiling — the authority-laundering shape the check was written to stop.
 *
 * The same root cause, on the denial route, was worse in a different direction:
 * the prefixed form the entity docblock advertised was written verbatim, and the
 * enforcement lookup — which passes the bare id — never found it. A machine was
 * un-denyable, and the screen, the CLI and the audit row all said otherwise.
 *
 * **What is asserted here is behaviour, not wiring.** Real handlers, real
 * `normalizePrincipalSubject`; only the request context and the container are
 * doubles. The guard is mocked because it is the subject of
 * `d2-gap-wiring.route.test.ts`, not of this one.
 */

const TENANT = '11111111-1111-4111-8111-111111111111'
const CALLER_KEY = '22222222-2222-4222-8222-222222222222'
const OTHER_KEY = '33333333-3333-4333-8333-333333333333'
const SOMEONE_ELSE = '44444444-4444-4444-8444-444444444444'

const grants: Record<string, unknown>[] = []
const withhelds: Record<string, unknown>[] = []

const authContext = {
  sub: `ai_worker:${CALLER_KEY}`,
  isApiKey: true,
  keyId: CALLER_KEY,
  userId: SOMEONE_ELSE,
  tenantId: TENANT,
  orgId: null,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => authContext),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => ({
    resolve: (token: string) => {
      if (token === 'delegationService') {
        return {
          grant: jest.fn(async (input: Record<string, unknown>) => {
            grants.push(input)
            return { id: 'new-delegation', ...input }
          }),
        }
      }
      if (token === 'denialService') {
        return {
          withhold: jest.fn(async (input: Record<string, unknown>) => {
            withhelds.push(input)
            return { id: 'new-denial', ...input }
          }),
        }
      }
      if (token === 'rbacService') {
        return { userHasAllFeatures: jest.fn(async () => true) }
      }
      return {}
    },
  })),
}))

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

jest.mock('../mutation-guard', () => ({
  beginAuthMutationGuard: jest.fn(async () => ({
    blockedResponse: null,
    runAfterSuccess: jest.fn(async () => undefined),
  })),
}))

function json(body: unknown): Request {
  return new Request('http://localhost/api/authority/denials', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  grants.length = 0
  withhelds.length = 0
})

describe('a delegation to yourself', () => {
  it('is refused without a ceiling even when the grantee is spelled with a prefix', async () => {
    // The walk-through. Before the fix these two strings compared unequal, so a
    // self-delegation with `authorityCeiling: null` sailed past the only check
    // that exists for it.
    const route = await import('../authority/delegations/route')

    const res = await route.POST(json({
      action: 'grant',
      granteePrincipalId: `ai_worker:${CALLER_KEY}`,
      granteeKind: 'ai_worker',
      capabilityId: 'sales.refund',
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      reason: 'because',
    }))

    expect(res.status).toBe(403)
    expect(grants).toHaveLength(0)
  })

  it('still passes with an explicit ceiling', async () => {
    const route = await import('../authority/delegations/route')

    const res = await route.POST(json({
      action: 'grant',
      granteePrincipalId: `ai_worker:${CALLER_KEY}`,
      granteeKind: 'ai_worker',
      capabilityId: 'sales.refund',
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      reason: 'because',
      authorityCeiling: 'A2',
    }))

    expect(res.status).toBe(200)
    // Stored bare — the column's content, with the kind beside it.
    expect(grants[0]).toMatchObject({ granteePrincipalId: CALLER_KEY, granteeKind: 'ai_worker' })
  })

  it('is refused when the prefix and the declared kind name different actors', async () => {
    // Not resolved by guessing which half the caller meant.
    const route = await import('../authority/delegations/route')

    const res = await route.POST(json({
      action: 'grant',
      granteePrincipalId: `ai_worker:${OTHER_KEY}`,
      granteeKind: 'service',
      capabilityId: 'sales.refund',
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      reason: 'because',
    }))

    expect(res.status).toBe(400)
    expect(grants).toHaveLength(0)
  })
})

describe('a denial', () => {
  it('stores the bare id, whatever spelling arrived', async () => {
    const route = await import('../authority/denials/route')

    const res = await route.POST(json({
      action: 'withhold',
      subjectPrincipalId: `ai_worker:${OTHER_KEY}`,
      subjectKind: 'ai_worker',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
    }))

    expect(res.status).toBe(200)
    expect(withhelds[0]).toMatchObject({
      subjectPrincipalId: OTHER_KEY,
      subjectKind: 'ai_worker',
    })
  })

  it('is refused when the prefix and the declared kind disagree', async () => {
    const route = await import('../authority/denials/route')

    const res = await route.POST(json({
      action: 'withhold',
      subjectPrincipalId: `api_key:${OTHER_KEY}`,
      subjectKind: 'ai_worker',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
    }))

    expect(res.status).toBe(400)
    expect(withhelds).toHaveLength(0)
  })
})
