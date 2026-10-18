import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { AUTONOMY_GATES } from '@open-mercato/shared/modules/capabilities'
import { MAX_DELEGATION_DAYS, delegationWindowProblem } from '@open-mercato/shared/modules/delegations'
import { getCapabilityDescriptor } from '@open-mercato/shared/lib/capabilities/registry'
import { derivePrincipal, normalizePrincipalSubject } from '@open-mercato/shared/lib/auth/principal'
import type { DelegationService } from '@open-mercato/core/modules/auth/services/delegationService'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { beginAuthMutationGuard } from '../../mutation-guard'

/**
 * Lending authority, and taking it back.
 *
 * The grantor is **always the caller**, never a field in the request. Accepting a
 * grantor id would let anybody lend authority they do not hold by naming somebody
 * who does, which turns the whole feature into a privilege-escalation route.
 *
 * The same principle covers the caller's own holdings — lending what you do not
 * hold is the same escalation wearing the other hat, and until 2026-10-17 the
 * route guarded only `auth.delegations.manage` and never the capability being
 * lent. A grant now passes three checks before it writes: the grantor holds the
 * capability (the RbacService, the same call the dispatcher's `requireFeatures`
 * makes for the route's own feature), the capability is not declared
 * `delegable: false`, and a delegation to yourself carries an explicit ceiling.
 * The comments at each check say why each exists.
 */

const FEATURE_MANAGE = 'auth.delegations.manage'
const RESOURCE_KIND = 'authority.delegation'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
  POST: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
}

const grantSchema = z.object({
  action: z.literal('grant'),
  granteePrincipalId: z.string().min(1).max(200),
  granteeKind: z.enum(['human', 'ai_worker', 'service', 'system']),
  capabilityId: z.string().min(1).max(200),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  // Required, and not merely by convention: a delegation nobody explained cannot
  // be evaluated by whoever finds it later.
  reason: z.string().trim().min(1).max(500),
  authorityCeiling: z.enum(AUTONOMY_GATES).optional(),
  organizationId: z.string().uuid().optional(),
})

const revokeSchema = z.object({
  action: z.literal('revoke'),
  id: z.string().uuid(),
})

const bodySchema = z.discriminatedUnion('action', [grantSchema, revokeSchema])

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const container = await createRequestContainer()
  const delegations = container.resolve('delegationService') as DelegationService

  // Revoked delegations are included: this is a record of what authority was
  // lent, not only of what is in force.
  const items = await delegations.list({ tenantId: auth.tenantId, organizationId: auth.orgId ?? null })
  return NextResponse.json({ items })
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const container = await createRequestContainer()
  const delegations = container.resolve('delegationService') as DelegationService
  const scope = { tenantId: auth.tenantId, organizationId: auth.orgId ?? null }

  // Structural mutation guard, before either branch writes. The service is what
  // decides whether the caller may lend this capability; the guard is the
  // registry chokepoint every other custom write route in the module now passes
  // through, so a guard registered for `authority.delegation` is enforced rather
  // than silently skipped (auth ships no `guards.ts` today — see
  // `api/mutation-guard.ts`).
  const guard = await beginAuthMutationGuard({
    container,
    tenantId: auth.tenantId,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    req,
    resourceKind: RESOURCE_KIND,
    resourceId: parsed.data.action === 'revoke' ? parsed.data.id : 'new',
    operation: parsed.data.action === 'revoke' ? 'delete' : 'create',
    mutationPayload: parsed.data as unknown as Record<string, unknown>,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  if (parsed.data.action === 'revoke') {
    const revoked = await delegations.revoke(parsed.data.id, scope, auth.sub ?? null)
    if (!revoked) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await writeDirectWriteAuditLog({
      container,
      auth,
      organizationId: auth.orgId ?? null,
      action: 'updated',
      resourceKind: RESOURCE_KIND,
      resourceId: parsed.data.id,
      snapshotAfter: { revokedAt: revoked.revokedAt, capabilityId: revoked.capabilityId },
    })
    await guard.runAfterSuccess()
    return NextResponse.json({ item: revoked })
  }

  const problem = delegationWindowProblem(parsed.data.startsAt, parsed.data.expiresAt)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const principal = derivePrincipal(auth)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // The grantee as the authority tables store it: a **bare id**, with the kind
  // beside it. `CC-124` is the write side of that rule missing — the route
  // accepted a prefixed subject, the enforcement path passed the bare id, and a
  // delegation granted to `ai_worker:<id>` was never found. A prefix that
  // disagrees with the declared kind is refused here rather than resolved by
  // guessing which half the caller meant.
  let granteePrincipalId: string
  try {
    granteePrincipalId = normalizePrincipalSubject(
      parsed.data.granteePrincipalId,
      parsed.data.granteeKind,
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'the grantee subject is not a principal' },
      { status: 400 },
    )
  }

  // ★ What the route used to miss (T-01, critical/urgent): the guard config
  // above requires `auth.delegations.manage` — the permission to *manage*
  // delegations — and never the capability being *lent*. A caller holding
  // nothing else could mint `api_keys.manage` (an identity factory) or
  // `directory.tenants.manage` for anybody, including themselves. Three
  // checks, in the order of how badly getting one wrong would end:

  // 1. The grantor must actually hold what they are lending. This is the
  //    check the dispatcher's `requireFeatures` performs for the route's own
  //    feature, performed here for the *lent* one — same service, same call
  //    shape (`checkAuthorization` in `apps/mercato/src/app/api/[...slug]/
  //    route.ts:215`). The header principle at the top of this file — nobody
  //    may lend authority they do not hold — applied only to the grantor *id*
  //    before; without this it never applied to the caller's own holdings.
  //    Scoped to the delegation's target organization: lending in org B what
  //    you hold only in org A widens the grant.
  const rbac = container.resolve('rbacService') as RbacService
  const grantorHolds = await rbac.userHasAllFeatures(auth.sub, [parsed.data.capabilityId], {
    tenantId: auth.tenantId,
    organizationId: parsed.data.organizationId ?? null,
  })
  if (!grantorHolds) {
    return NextResponse.json(
      { error: 'Forbidden', requiredFeatures: [parsed.data.capabilityId] },
      { status: 403 },
    )
  }

  // 2. A capability declared `delegable: false` may never appear in a
  //    delegation, whoever holds it. The descriptor registry is the one place
  //    the risk semantics live — a check that lived only in this route would
  //    be a second, parallel permission system (the registry's own docblock
  //    makes exactly this point). Measured 2026-10-17: 23 declarations,
  //    every one of them `false`, zero `true` — a capability that declares
  //    delegability at all declares it non-delegable, and
  //    `auth.delegations.manage` itself is one of them. Absent descriptor =
  //    not refused, deliberately: `registerCapabilityDescriptors` skips
  //    features without one, and the platform's standing position is to
  //    enforce on presence rather than absence (the same reasoning
  //    `tool-authority.ts:136-139` records for the R5 decision path).
  const descriptor = getCapabilityDescriptor(parsed.data.capabilityId)
  if (descriptor && descriptor.delegable === false) {
    return NextResponse.json(
      { error: `capability "${parsed.data.capabilityId}" is declared delegable: false and may not be lent` },
      { status: 403 },
    )
  }

  // 3. A self-delegation with no ceiling is authority laundering. The
  //    grantor's holdings are consulted here, at grant time — but a
  //    delegation is an independent authority source at *use* time: the
  //    resolver reads the record, not the grantor's current ACL
  //    (`DelegationService.activeFor` → `selectActiveDelegation`). Lending
  //    yourself an unbounded capability therefore outlives the very holdings
  //    that justified it. A self-delegation *with* an explicit ceiling is
  //    still allowed: the ceiling bounds it and the reasoning is on record.
  //
  //    **Compared as the pair (id, kind), not as a string.** `principal.id` is
  //    the bare id for a machine (`auth.keyId ?? parsed.id`), so comparing the
  //    raw request field let `ai_worker:<the caller's own key>` through as a
  //    stranger — a self-delegation wearing a prefix. That was the open half of
  //    `CC-124`: a string comparison walked a caller past a check that was
  //    written to stop exactly this.
  const isSelfDelegation =
    parsed.data.granteeKind === principal.kind && granteePrincipalId === principal.id
  if (isSelfDelegation && parsed.data.authorityCeiling == null) {
    return NextResponse.json(
      { error: 'a delegation to yourself needs an explicit authority ceiling' },
      { status: 403 },
    )
  }

  const granted = await delegations.grant({
    granteePrincipalId,
    granteeKind: parsed.data.granteeKind,
    // The caller, always. See the note at the top of this file.
    grantorPrincipalId: principal.id,
    grantorKind: principal.kind,
    capabilityId: parsed.data.capabilityId,
    startsAt: parsed.data.startsAt,
    expiresAt: parsed.data.expiresAt,
    reason: parsed.data.reason,
    authorityCeiling: parsed.data.authorityCeiling ?? null,
    organizationId: parsed.data.organizationId ?? null,
  }, scope)

  await writeDirectWriteAuditLog({
    container,
    auth,
    organizationId: parsed.data.organizationId ?? auth.orgId ?? null,
    action: 'created',
    resourceKind: RESOURCE_KIND,
    resourceId: granted.id,
    snapshotAfter: {
      granteePrincipalId: granted.granteePrincipalId,
      capabilityId: granted.capabilityId,
      startsAt: granted.startsAt,
      expiresAt: granted.expiresAt,
      reason: granted.reason,
    },
  })

  await guard.runAfterSuccess()
  return NextResponse.json({ item: granted })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authority',
  summary: 'Authority lent for a while, and taken back',
  methods: {
    GET: {
      summary: 'List delegations in this tenant',
      description: 'Revoked delegations are included: this is a record of what was lent, not only of what is in force.',
      responses: [{ status: 200, description: 'The delegations' }],
    },
    POST: {
      summary: 'Grant or revoke a delegation',
      description:
        `\`action: "grant"\` lends a capability to a principal for a window, at most ` +
        `${MAX_DELEGATION_DAYS} days, with a mandatory reason. The grantor is always the caller. ` +
        '`action: "revoke"` takes it back immediately — delegations are never cached, so a ' +
        'revoke takes effect on the next request rather than when a cache expires.',
      responses: [
        { status: 200, description: 'The delegation' },
        { status: 400, description: 'Invalid request, or a window longer than the maximum' },
        { status: 403, description: 'The grantor does not hold the capability, the capability is declared delegable: false, or a self-delegation carries no ceiling' },
        { status: 404, description: 'No such delegation in this tenant' },
      ],
    },
  },
}
