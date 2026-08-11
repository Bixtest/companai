import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { AUTONOMY_GATES } from '@open-mercato/shared/modules/capabilities'
import { MAX_DELEGATION_DAYS, delegationWindowProblem } from '@open-mercato/shared/modules/delegations'
import { derivePrincipal } from '@open-mercato/shared/lib/auth/principal'
import type { DelegationService } from '@open-mercato/core/modules/auth/services/delegationService'

/**
 * Lending authority, and taking it back.
 *
 * The grantor is **always the caller**, never a field in the request. Accepting a
 * grantor id would let anybody lend authority they do not hold by naming somebody
 * who does, which turns the whole feature into a privilege-escalation route.
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
    return NextResponse.json({ item: revoked })
  }

  const problem = delegationWindowProblem(parsed.data.startsAt, parsed.data.expiresAt)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const principal = derivePrincipal(auth)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const granted = await delegations.grant({
    granteePrincipalId: parsed.data.granteePrincipalId,
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
        { status: 404, description: 'No such delegation in this tenant' },
      ],
    },
  },
}
