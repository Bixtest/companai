import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import type { TrustService } from '@open-mercato/core/modules/auth/services/trustService'
import { beginAuthMutationGuard } from '../../mutation-guard'

/**
 * Earned autonomy: what a principal holds, and raising it.
 *
 * **The only surface in the platform that widens.** Everything else narrows, so
 * this one is deliberately narrow itself: one tier at a time, evidence checked
 * first, a mandatory reason, and the criteria nobody could verify recorded on the
 * grant so the gap outlives the decision.
 *
 * There is no demotion endpoint, and that is the design rather than an omission.
 * Demotion is automatic on evidence (invariant I9), not something a person asks
 * for.
 */

const FEATURE_PROMOTE = 'auth.trust.promote'
const RESOURCE_KIND = 'authority.trust_grant'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_PROMOTE] },
  POST: { requireAuth: true, requireFeatures: [FEATURE_PROMOTE] },
}

const promoteSchema = z.object({
  principalId: z.string().min(1).max(200),
  principalKind: z.enum(['human', 'ai_worker', 'service', 'system']),
  capabilityGroup: z.string().min(1).max(100),
  reason: z.string().trim().min(1).max(500),
})

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const container = await createRequestContainer()
  const trust = container.resolve('trustService') as TrustService

  const url = new URL(req.url)
  const principalId = url.searchParams.get('principalId')
  const capabilityGroup = url.searchParams.get('capabilityGroup')

  // Asking about one principal returns its evidence too, because "may this be
  // promoted, and on what grounds?" is one question rather than two.
  if (principalId && capabilityGroup) {
    const [tier, evidence] = await Promise.all([
      trust.tierFor(principalId, capabilityGroup, { tenantId: auth.tenantId }),
      trust.evidenceFor(principalId, capabilityGroup, { tenantId: auth.tenantId }),
    ])
    return NextResponse.json({ tier, evidence })
  }

  return NextResponse.json({ items: await trust.list({ tenantId: auth.tenantId }) })
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = promoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const container = await createRequestContainer()
  const trust = container.resolve('trustService') as TrustService

  // Structural mutation guard, before the promotion attempt. This is the only
  // surface in the platform that *widens* authority, so it is the one that most
  // needs a registered guard actually to run; the evidence check below is a
  // separate gate and neither replaces the other.
  const guard = await beginAuthMutationGuard({
    container,
    tenantId: auth.tenantId,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    req,
    resourceKind: RESOURCE_KIND,
    resourceId: `${parsed.data.principalId}:${parsed.data.capabilityGroup}`,
    operation: 'update',
    mutationPayload: parsed.data as unknown as Record<string, unknown>,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const outcome = await trust.promote(
    parsed.data.principalId,
    parsed.data.principalKind,
    parsed.data.capabilityGroup,
    { tenantId: auth.tenantId },
    auth.sub ?? null,
    parsed.data.reason,
  )

  if (!outcome.ok) {
    // 409 rather than 403: the caller holds the capability, and it is the
    // evidence that refused. A 403 would send them to look at their own
    // permissions, which are fine.
    return NextResponse.json({ error: outcome.reason, criteria: outcome.criteria }, { status: 409 })
  }

  await writeDirectWriteAuditLog({
    container,
    auth,
    organizationId: auth.orgId ?? null,
    action: 'updated',
    resourceKind: RESOURCE_KIND,
    resourceId: `${parsed.data.principalId}:${parsed.data.capabilityGroup}`,
    snapshotAfter: {
      tier: outcome.grant.tier,
      reason: parsed.data.reason,
      // In the audit trail as well as on the grant. Somebody reading the trail a
      // year from now should see what was not checked without having to go and
      // find the grant row.
      unverified: outcome.unverified.map((criterion) => criterion.description),
    },
  })

  await guard.runAfterSuccess()
  return NextResponse.json({ item: outcome.grant, unverified: outcome.unverified })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authority',
  summary: 'Earned autonomy, per principal and capability group',
  methods: {
    GET: {
      summary: 'Read trust tiers, or one principal with its evidence',
      description:
        'With `principalId` and `capabilityGroup`, returns that principal’s tier and the ' +
        'evidence behind it. Without them, lists every grant in the tenant.',
      responses: [{ status: 200, description: 'The tier and its evidence, or the list' }],
    },
    POST: {
      summary: 'Promote a principal one tier',
      description:
        'Refuses with 409 when the computable evidence does not support it. Three criteria ' +
        'the specification names cannot be checked here yet and come back as `unverified` ' +
        'rather than being silently skipped. One tier per promotion. There is no demotion ' +
        'endpoint: demotion is automatic on evidence.',
      responses: [
        { status: 200, description: 'The new grant, with what went unverified' },
        { status: 400, description: 'Invalid request' },
        { status: 409, description: 'The evidence does not support a promotion' },
      ],
    },
  },
}
