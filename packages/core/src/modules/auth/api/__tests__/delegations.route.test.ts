/**
 * T-01 (critical/urgent): a delegation lent authority the lender did not have.
 *
 * The defect, in one line: the route guarded `auth.delegations.manage` — the
 * permission to *manage* delegations — and never the capability being *lent*.
 * A caller holding nothing else could mint `api_keys.manage` (a credential that
 * acts as a principal in its own right) or `directory.tenants.manage` for
 * anybody, including themselves. `.delegable` was written in twenty places and
 * read in none, so `api_keys.manage`'s own declaration — `delegable: false`,
 * "handing out the ability to mint identities is how a bounded grant becomes an
 * unbounded one" — was inert.
 *
 * The fix adds three checks to the grant path (see the comments at each check
 * in the route). This file proves all three are wired, by driving the **real**
 * route handler with service doubles and asserting observable behaviour:
 *
 * **How it refuses to prove itself by accident — the mutation map.** A test
 * that still passes when the guard is deleted is worth nothing, so each check
 * owns a named case that only it can keep green:
 *
 * | Remove this check | This test goes red |
 * |---|---|
 * | 1. grantor must hold the capability | "the failing scenario" — a caller without the capability gets 403 and the write never happens |
 * | 2. `delegable: false` refuses | "a capability declared delegable: false refuses even a holder" |
 * | 3. self-delegation needs a ceiling | "a delegation to yourself without a ceiling refuses" |
 *
 * The decisive assertion in every refusal case is that
 * `delegationService.grant` is **never called** — the write did not happen —
 * not merely that the response says 403. A route that refuses *after* writing
 * would pass a status-only assertion.
 *
 * The capability registry is the real module (no mock): descriptors are
 * registered and cleared around the cases that need them, because the check
 * must read the same registry the rest of the platform reads.
 */

const TENANT = '11111111-1111-4111-8111-111111111111'
const ACTOR = '22222222-2222-4222-8222-222222222222'
const ORG = '33333333-3333-4333-8333-333333333333'
const GRANTEE = '44444444-4444-4444-8444-444444444444'
const DELEGATION_ID = '55555555-5555-4555-8555-555555555555'

import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import {
  registerCapabilityDescriptors,
  clearCapabilityRegistry,
} from '@open-mercato/shared/lib/capabilities/registry'

// ---------------------------------------------------------------------------
// Doubles. Every service the route touches is stubbed, so "the write did NOT
// happen" is assertable by observing call counts — the same shape the module's
// d2-gap wiring test uses for the same route.
// ---------------------------------------------------------------------------

const grant = jest.fn(async () => ({
  id: 'new-delegation',
  granteePrincipalId: GRANTEE,
  capabilityId: 'c',
  startsAt: new Date(),
  expiresAt: new Date(Date.now() + 3600_000),
  reason: 'r',
}))
const revoke = jest.fn(async () => ({
  id: '55555555-5555-4555-8555-555555555555',
  revokedAt: new Date(),
  capabilityId: 'c',
}))
const userHasAllFeatures = jest.fn(async () => true)

const container: any = {
  resolve: (token: string) => {
    switch (token) {
      case 'rbacService':
        return {
          userHasAllFeatures,
          loadAcl: jest.fn(async () => ({ isSuperAdmin: false, features: [], organizations: null })),
          getGrantedFeatures: jest.fn(async () => []),
        }
      case 'delegationService':
        return {
          grant,
          revoke,
          list: jest.fn(async () => []),
        }
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

jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

// ---------------------------------------------------------------------------

function grantBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'grant',
    granteePrincipalId: GRANTEE,
    granteeKind: 'human',
    capabilityId: 'api_keys.manage',
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    reason: 'covering a leave',
    ...overrides,
  }
}

const post = (body: unknown) => {
  const m = require('../authority/delegations/route')
  return m.POST(
    new Request('http://localhost/api/auth/authority/delegations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  registerMutationGuards([])
  clearCapabilityRegistry()
  userHasAllFeatures.mockResolvedValue(true)
})

afterAll(() => {
  registerMutationGuards([])
  clearCapabilityRegistry()
})

// ---------------------------------------------------------------------------

describe('check 1 — the grantor must hold the capability being lent', () => {
  it('the failing scenario: a caller holding only auth.delegations.manage cannot lend api_keys.manage', async () => {
    // The triage's exact scenario: the caller holds the route's own feature
    // (the dispatcher's `requireFeatures` already passed before we get here)
    // and nothing else. The RBAC service — the same one the dispatcher uses —
    // says no for the lent capability.
    userHasAllFeatures.mockResolvedValue(false)

    const res = await post(grantBody())

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ requiredFeatures: ['api_keys.manage'] })
    // The decisive assertion: the write never happened.
    expect(grant).not.toHaveBeenCalled()
  })

  it('lets a legitimate grant through when the grantor holds the capability', async () => {
    userHasAllFeatures.mockResolvedValue(true)

    const res = await post(grantBody())

    expect(res.status).toBe(200)
    expect(grant).toHaveBeenCalledTimes(1)
  })

  it('asks the RBAC service for the capability from the request, in the delegation’s target scope', async () => {
    // Wiring proof: the check is not hard-coded to one capability or one
    // scope. The subject is `auth.sub` — the same string the dispatcher
    // passes — and the organization is the delegation's own target, so
    // lending in org B what you hold only in org A widens the grant.
    await post(grantBody({ capabilityId: 'sales.orders.manage', organizationId: ORG }))

    expect(userHasAllFeatures).toHaveBeenCalledWith(ACTOR, ['sales.orders.manage'], {
      tenantId: TENANT,
      organizationId: ORG,
    })
  })
})

describe('check 2 — a capability declared delegable: false may never be lent', () => {
  it('refuses even a holder', async () => {
    // The declaration from `api_keys/acl.ts` itself: "Issues a credential that
    // acts as a principal in its own right. Not delegable…"
    registerCapabilityDescriptors([
      {
        id: 'api_keys.manage',
        title: 'Manage API keys',
        module: 'api_keys',
        capability: {
          effectClass: 'E5',
          reversibility: 'irreversible',
          dataClasses: ['secret'],
          delegable: false,
        },
      },
    ])
    userHasAllFeatures.mockResolvedValue(true)

    const res = await post(grantBody())

    expect(res.status).toBe(403)
    expect(grant).not.toHaveBeenCalled()
  })

  it('does not refuse a capability whose descriptor says nothing about delegability', async () => {
    // The platform's standing position, enforced on presence rather than
    // absence: `registerCapabilityDescriptors` skips features without a
    // descriptor, and refusing those would make every described-later feature
    // an emergency. A descriptor that does not say `delegable: false` is not
    // a refusal.
    registerCapabilityDescriptors([
      {
        id: 'api_keys.manage',
        title: 'Manage API keys',
        module: 'api_keys',
        capability: { effectClass: 'E5', reversibility: 'irreversible' },
      },
    ])
    userHasAllFeatures.mockResolvedValue(true)

    const res = await post(grantBody())

    expect(res.status).toBe(200)
    expect(grant).toHaveBeenCalledTimes(1)
  })
})

describe('check 3 — a delegation to yourself needs an explicit ceiling', () => {
  it('refuses a self-delegation with no ceiling', async () => {
    // The laundering vector: the grantor's holdings are consulted at grant
    // time, but a delegation is an independent authority source at use time —
    // the resolver reads the record, not the grantor's current ACL. Lending
    // yourself an unbounded capability outlives the holdings that justified
    // it. `derivePrincipal` of a plain uuid subject is the uuid itself, so
    // naming the caller as the grantee is the self-delegation.
    const res = await post(grantBody({ granteePrincipalId: ACTOR }))

    expect(res.status).toBe(403)
    expect(grant).not.toHaveBeenCalled()
  })

  it('allows a self-delegation with an explicit ceiling', async () => {
    // The ceiling bounds it and the reasoning is on the record — which is why
    // the check is on the *unbounded* case, not on self-delegation as such.
    const res = await post(grantBody({ granteePrincipalId: ACTOR, authorityCeiling: 'A1' }))

    expect(res.status).toBe(200)
    expect(grant).toHaveBeenCalledTimes(1)
  })
})

describe('what the fix must not disturb', () => {
  it('leaves the revoke path untouched by the grant checks', async () => {
    // Revoke lends nothing, so none of the three checks may consult the RBAC
    // service for it. A check that fired here would break every revocation.
    const res = await post({ action: 'revoke', id: DELEGATION_ID })

    expect(res.status).toBe(200)
    expect(userHasAllFeatures).not.toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledTimes(1)
  })

  it('still refuses a delegation that outlives the maximum window', async () => {
    // The pre-existing check, proven still live after the three new ones:
    // a window problem is a 400, and the window check runs first.
    const res = await post(
      grantBody({ expiresAt: new Date(Date.now() + 200 * 86_400_000).toISOString() }),
    )

    expect(res.status).toBe(400)
    expect(grant).not.toHaveBeenCalled()
  })
})
