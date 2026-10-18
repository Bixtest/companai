/**
 * A machine's trust evidence can be read — `CC-129`.
 *
 * **The defect this closes.** `TrustService.evidenceFor` joins
 * `action_logs.actor_user_id = principalId`, and that column holds the **bare**
 * id the platform narrows to on the way in. The trust route, though, took
 * `principalId` as a free-form string — GET straight from the query string with
 * no kind at all, POST from a schema field with its kind in a *sibling* — and
 * passed it unmodified. So the only spelling that worked was the bare one, and a
 * caller who sent `ai_worker:<uuid>` — the spelling the principal's own `kind`
 * field invites — had its evidence look-up quietly return nothing.
 *
 * **Why nobody reported it:** it fails *closed*. A promotion that requires
 * evidence is refused, which looks exactly like "this actor has not earned it
 * yet" and not like "we asked the wrong question".
 *
 * **Why the POST half is the security half:** `promoteSchema` names the actor
 * twice — `principalId` and `principalKind` — and nothing checked them against
 * each other. `ai_worker:<id>` with `kind: human` names two different actors,
 * and the platform used to trust one of them silently: evidence was looked up
 * under the bare id, and the grant was written with `principalKind: 'human'`
 * attached to it.
 *
 * **What is deliberately NOT here:** a normalisation call inside
 * `TrustService`, and one at `authorityEnforcementService:426`. The register row
 * prescribed both halves of the latter; `decideFor` calls `parseSubject(subject)`
 * at `:268` and passes `principal.id` at `:279`, and `parseSubject` already
 * strips any agreeing prefix — so that reader is bare by construction and a
 * normaliser there would be a no-op implying a guarantee the code already has.
 * The fix is at the two boundaries only. See PLAN-CC-129 §3.
 */

const TENANT = '11111111-1111-4111-8111-111111111111'
const WORKER_KEY = '33333333-3333-4333-8333-333333333333'

const tierCalls: string[] = []
const evidenceCalls: string[] = []
const promoteCalls: Array<Record<string, unknown>> = []
const guardCalls: Array<Record<string, unknown>> = []

const authContext = {
  sub: `ai_worker:${WORKER_KEY}`,
  isApiKey: true,
  keyId: WORKER_KEY,
  userId: '44444444-4444-4444-8444-444444444444',
  tenantId: TENANT,
  orgId: null,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => authContext),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => ({
    resolve: (token: string) => {
      if (token === 'trustService') {
        return {
          // Records the id it was asked about, so the test can assert which
          // spelling the route actually forwarded.
          tierFor: jest.fn(async (principalId: string) => {
            tierCalls.push(principalId)
            return 'T1'
          }),
          evidenceFor: jest.fn(async (principalId: string) => {
            evidenceCalls.push(principalId)
            return { completedActs: 12, overriddenActs: 1 }
          }),
          promote: jest.fn(async (
            principalId: string,
            principalKind: string,
            capabilityGroup: string,
          ) => {
            promoteCalls.push({ principalId, principalKind, capabilityGroup })
            return {
              ok: true,
              grant: { id: 'grant-1', tier: 'T2', principalId, principalKind },
              unverified: [],
            }
          }),
          list: jest.fn(async () => []),
        }
      }
      return {}
    },
  })),
}))

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

jest.mock('../mutation-guard', () => ({
  beginAuthMutationGuard: jest.fn(async (input: Record<string, unknown>) => {
    guardCalls.push(input)
    return { blockedResponse: null, runAfterSuccess: jest.fn(async () => undefined) }
  }),
}))

function get(url: string): Request {
  return new Request(`http://localhost${url}`)
}

function post(body: unknown): Request {
  return new Request('http://localhost/api/authority/trust', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  tierCalls.length = 0
  evidenceCalls.length = 0
  promoteCalls.length = 0
  guardCalls.length = 0
})

describe('asking about a principal (GET)', () => {
  it('finds the evidence when the id is spelled with a prefix', async () => {
    // The whole defect, in one assertion: this used to return evidence
    // `{ completedActs: 0, overriddenActs: 0 }` and refuse an earned promotion.
    const route = await import('../authority/trust/route')

    const res = await route.GET(get(`/api/authority/trust?principalId=ai_worker:${WORKER_KEY}&capabilityGroup=sales`))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ tier: 'T1', evidence: { completedActs: 12, overriddenActs: 1 } })
    // Forwarded bare, which is the form the join is written for.
    expect(evidenceCalls).toEqual([WORKER_KEY])
    expect(tierCalls).toEqual([WORKER_KEY])
  })

  it('strips the api_key prefix too, so a legacy spelling is not a silent miss', async () => {
    const route = await import('../authority/trust/route')

    const res = await route.GET(get(`/api/authority/trust?principalId=api_key:${WORKER_KEY}&capabilityGroup=sales`))

    expect(res.status).toBe(200)
    expect(evidenceCalls).toEqual([WORKER_KEY])
  })

  it('still answers a bare id, so the working case is untouched', async () => {
    const route = await import('../authority/trust/route')

    const res = await route.GET(get(`/api/authority/trust?principalId=${WORKER_KEY}&capabilityGroup=sales`))

    expect(res.status).toBe(200)
    expect(evidenceCalls).toEqual([WORKER_KEY])
  })

  it('refuses an empty subject rather than querying for it', async () => {
    // A whitespace-only subject used to be truthy and reach the join, where it
    // matched nothing and looked like "no evidence".
    const route = await import('../authority/trust/route')

    const res = await route.GET(get(`/api/authority/trust?principalId=%20%20&capabilityGroup=sales`))

    expect(res.status).toBe(400)
    expect(evidenceCalls).toHaveLength(0)
  })
})

describe('raising a principal (POST)', () => {
  it('writes the grant under the bare id when the prefix agrees with the kind', async () => {
    const route = await import('../authority/trust/route')

    const res = await route.POST(post({
      principalId: `ai_worker:${WORKER_KEY}`,
      principalKind: 'ai_worker',
      capabilityGroup: 'sales',
      reason: 'consistent reversals across two months',
    }))

    expect(res.status).toBe(200)
    expect(promoteCalls).toEqual([
      { principalId: WORKER_KEY, principalKind: 'ai_worker', capabilityGroup: 'sales' },
    ])
  })

  it('leaves an already-bare request exactly as it was', async () => {
    const route = await import('../authority/trust/route')

    const res = await route.POST(post({
      principalId: WORKER_KEY,
      principalKind: 'ai_worker',
      capabilityGroup: 'sales',
      reason: 'consistent reversals across two months',
    }))

    expect(res.status).toBe(200)
    expect(promoteCalls[0]).toMatchObject({ principalId: WORKER_KEY })
  })

  it('is refused when the prefix and the declared kind name different actors', async () => {
    // The security half. Before the fix this was written: evidence looked up
    // under the bare id, grant written with `principalKind: 'human'` on a row
    // keyed by a machine's id — two actors in one decision.
    const route = await import('../authority/trust/route')

    const res = await route.POST(post({
      principalId: `ai_worker:${WORKER_KEY}`,
      principalKind: 'human',
      capabilityGroup: 'sales',
      reason: 'consistent reversals across two months',
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('must be the same actor')
    // Nothing was widened and nothing was written.
    expect(promoteCalls).toHaveLength(0)
    expect(tierCalls).toHaveLength(0)
    expect(evidenceCalls).toHaveLength(0)
  })

  it('refuses the disagreement before the mutation guard is even asked', async () => {
    // Ordering matters: the guard records a resource, and recording one for a
    // request that names two actors would leave a trail for an act that should
    // never have been attempted.
    const route = await import('../authority/trust/route')

    const res = await route.POST(post({
      principalId: `api_key:${WORKER_KEY}`,
      principalKind: 'ai_worker',
      capabilityGroup: 'sales',
      reason: 'consistent reversals across two months',
    }))

    expect(res.status).toBe(400)
    expect(guardCalls).toHaveLength(0)
  })

  it('records the guard and the audit against the normalised id', async () => {
    // A prefixed request and a bare one naming the same actor must land on one
    // resource, not two — that is what makes the guard's own dedup correct.
    const route = await import('../authority/trust/route')

    const res = await route.POST(post({
      principalId: `ai_worker:${WORKER_KEY}`,
      principalKind: 'ai_worker',
      capabilityGroup: 'sales',
      reason: 'consistent reversals across two months',
    }))

    expect(res.status).toBe(200)
    expect(guardCalls).toHaveLength(1)
    expect(guardCalls[0]).toMatchObject({ resourceId: `${WORKER_KEY}:sales` })
    expect(guardCalls[0]?.mutationPayload).toMatchObject({ principalId: WORKER_KEY })
  })
})
