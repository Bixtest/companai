import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { denialProblem } from '@open-mercato/shared/modules/denials'
import type { DenialService } from '@open-mercato/core/modules/auth/services/denialService'

/**
 * Taking one permission away from one person, and giving it back.
 *
 * Unlike delegations, the subject **is** a field in the request — that is the
 * whole feature, and it is safe here for the reason the reverse was unsafe
 * there. Naming somebody else in a grant lends authority you do not hold; naming
 * somebody else in a denial only ever removes authority. The dangerous direction
 * does not exist on this route.
 *
 * What guards it instead is the capability: `auth.denials.manage` is what stops
 * an employee withholding their manager's approvals.
 */

const FEATURE_MANAGE = 'auth.denials.manage'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
  POST: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
}

const withholdSchema = z.object({
  action: z.literal('withhold'),
  subjectPrincipalId: z.string().min(1).max(200),
  subjectKind: z.enum(['human', 'ai_worker', 'service', 'system']),
  featurePattern: z.string().trim().min(1).max(200),
  // Required, and not merely by convention: a permission that vanished with no
  // reason cannot be safely restored by somebody who was not there.
  reason: z.string().trim().min(1).max(500),
  startsAt: z.coerce.date().optional(),
  // Absent means permanent — a standing decision, which is a legitimate thing
  // for a denial to be even though it is never legitimate for a grant.
  expiresAt: z.coerce.date().nullable().optional(),
  organizationId: z.string().uuid().optional(),
})

const liftSchema = z.object({
  action: z.literal('lift'),
  id: z.string().uuid(),
})

const bodySchema = z.discriminatedUnion('action', [withholdSchema, liftSchema])

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const container = await createRequestContainer()
  const denials = container.resolve('denialService') as DenialService

  // Lifted denials are included: this is a record of what was withheld and when
  // it came back, not only of what is in force.
  const items = await denials.list({ tenantId: auth.tenantId, organizationId: auth.orgId ?? null })
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
  const denials = container.resolve('denialService') as DenialService
  const scope = { tenantId: auth.tenantId, organizationId: auth.orgId ?? null }

  if (parsed.data.action === 'lift') {
    const lifted = await denials.lift(parsed.data.id, scope, auth.sub ?? null)
    if (!lifted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // The audit entry is written by `DenialService.lift` itself, so the CLI
    // recovery path is recorded too (O1). Writing one here as well would file
    // the same act twice.
    return NextResponse.json({ item: lifted })
  }

  const startsAt = parsed.data.startsAt ?? new Date()
  const expiresAt = parsed.data.expiresAt ?? null
  const problem = denialProblem({
    featurePattern: parsed.data.featurePattern,
    reason: parsed.data.reason,
    startsAt,
    expiresAt,
  })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const withheld = await denials.withhold({
    subjectPrincipalId: parsed.data.subjectPrincipalId,
    subjectKind: parsed.data.subjectKind,
    featurePattern: parsed.data.featurePattern,
    reason: parsed.data.reason,
    startsAt,
    expiresAt,
    organizationId: parsed.data.organizationId ?? null,
    createdByUserId: auth.sub ?? null,
  }, scope)

  // Audited by the service — see the note on the lift branch above.
  return NextResponse.json({ item: withheld })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authority',
  summary: 'A permission taken away from one person',
  methods: {
    GET: {
      summary: 'List denials in this tenant',
      description:
        'Lifted denials are included: this is a record of what was withheld and when it came back, ' +
        'not only of what is in force.',
      responses: [{ status: 200, description: 'The denials' }],
    },
    POST: {
      summary: 'Withhold a permission, or give it back',
      description:
        '`action: "withhold"` removes one permission from one principal, with a mandatory reason. ' +
        'Omitting `expiresAt` makes it permanent, which is legitimate for a subtraction in a way it ' +
        'never is for a grant. Wildcards are allowed at the end of `featurePattern` only. ' +
        '`action: "lift"` gives the permission back immediately — denials are never cached, so a ' +
        'lift takes effect on the next request rather than when a cache expires.',
      responses: [
        { status: 200, description: 'The denial' },
        { status: 400, description: 'Invalid request, a missing reason, or a badly placed wildcard' },
        { status: 404, description: 'No such denial in this tenant' },
      ],
    },
  },
}
