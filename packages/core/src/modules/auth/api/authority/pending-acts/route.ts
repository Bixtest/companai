import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer, type AppContainer } from '@open-mercato/shared/lib/di/container'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  PENDING_ACT_STATUSES,
  type ActReviewService,
  type PendingActService,
  type PendingActStatus,
} from '@open-mercato/core/modules/auth/services/pendingActService'

const FEATURE_APPROVE = 'auth.authority.approve'
const RESOURCE_KIND = 'authority.pending_act'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_APPROVE] },
  POST: { requireAuth: true, requireFeatures: [FEATURE_APPROVE] },
}

type Scope = {
  tenantId: string
  container: AppContainer
  auth: NonNullable<Awaited<ReturnType<typeof getAuthFromRequest>>>
  pendingActs: PendingActService
  reviews: ActReviewService
}

async function resolveScope(req: Request): Promise<Scope | NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const container = await createRequestContainer()
  return {
    tenantId: auth.tenantId,
    container,
    auth,
    pendingActs: container.resolve('pendingActService') as PendingActService,
    reviews: container.resolve('actReviewService') as ActReviewService,
  }
}

function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}

const statusQuerySchema = z.enum([...PENDING_ACT_STATUSES, 'all']).default('pending')

/**
 * The queue.
 *
 * Two kinds of row, deliberately in one response: acts that have **not** happened
 * and are waiting for somebody (`items`), and acts that **have** happened and
 * nobody has looked at yet (`reviews`). Planning 02 §9 asks for one inbox rather
 * than four screens, and this is where that starts — they stay distinguishable
 * because confusing "stop this" with "check this" in either direction is how a
 * queue loses its meaning.
 */
export async function GET(req: Request) {
  const scope = await resolveScope(req)
  if (isResponse(scope)) return scope

  const raw = new URL(req.url).searchParams.get('status') ?? undefined
  const parsed = statusQuerySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const [items, reviews] = await Promise.all([
    scope.pendingActs.list(scope.tenantId, parsed.data as PendingActStatus | 'all'),
    scope.reviews.list(scope.tenantId, parsed.data === 'all' ? 'all' : 'awaiting'),
  ])
  return NextResponse.json({ items, reviews })
}

const resolveSchema = z.object({
  id: z.string().uuid(),
  // `reviewed` acts on the other list: an act that already happened and has now
  // been looked at. It runs nothing and undoes nothing.
  decision: z.enum(['approve', 'reject', 'reviewed']),
  note: z.string().trim().max(500).optional(),
})

/**
 * Approving runs the act; rejecting means it never runs.
 *
 * Both are audited, because an approval is itself an act — planning 02 §5.2 asks
 * for *"an accountable human approves, and that approval is a signed act"*. A
 * queue that records what it let through but not who let it through has moved
 * the accountability gap rather than closed it.
 */
export async function POST(req: Request) {
  const scope = await resolveScope(req)
  if (isResponse(scope)) return scope

  const body = await req.json().catch(() => null)
  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const approverUserId = typeof scope.auth.sub === 'string' ? scope.auth.sub : null

  if (parsed.data.decision === 'reviewed') {
    const outcome = await scope.reviews.markReviewed({
      tenantId: scope.tenantId,
      id: parsed.data.id,
      reviewerUserId: approverUserId,
      note: parsed.data.note ?? null,
    })
    await writeDirectWriteAuditLog({
      container: scope.container,
      auth: scope.auth,
      organizationId: null,
      action: 'updated',
      resourceKind: 'authority.act_review',
      resourceId: parsed.data.id,
      snapshotAfter: { decision: 'reviewed', outcome: outcome.ok ? 'ok' : outcome.reason },
    })
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.reason }, { status: outcome.reason === 'not-found' ? 404 : 409 })
    }
    return NextResponse.json({ ok: true, status: 'reviewed' })
  }

  const before = await scope.pendingActs.findById(scope.tenantId, parsed.data.id)
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const outcome = parsed.data.decision === 'approve'
    ? await scope.pendingActs.approve({
        tenantId: scope.tenantId,
        id: parsed.data.id,
        approverUserId,
        container: scope.container,
        auth: scope.auth,
        note: parsed.data.note ?? null,
      })
    : await scope.pendingActs.reject({
        tenantId: scope.tenantId,
        id: parsed.data.id,
        approverUserId,
        note: parsed.data.note ?? null,
      })

  await writeDirectWriteAuditLog({
    container: scope.container,
    auth: scope.auth,
    organizationId: before.organizationId ?? null,
    action: 'updated',
    resourceKind: RESOURCE_KIND,
    resourceId: parsed.data.id,
    snapshotAfter: {
      decision: parsed.data.decision,
      commandId: before.commandId,
      capabilityId: before.capabilityId,
      gate: before.gate,
      proposedByActorId: before.actorId,
      outcome: outcome.ok ? 'ok' : outcome.reason,
    },
  })

  if (!outcome.ok) {
    const status = outcome.reason === 'not-found' ? 404 : outcome.reason === 'execution-failed' ? 500 : 409
    return NextResponse.json({ error: outcome.reason }, { status })
  }
  return NextResponse.json({ ok: true, status: outcome.act.status })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authority',
  summary: 'Acts the authority resolver held for approval',
  methods: {
    GET: {
      summary: 'List held acts',
      description:
        'Acts that did not run because the resolver gated them at A1 or A2. Each carries the ' +
        'gate, the rule that produced it, and the deadline after which it can no longer be ' +
        'approved.',
      responses: [{ status: 200, description: 'The queue' }],
    },
    POST: {
      summary: 'Approve or reject a held act',
      description:
        'Approving runs the command that was held, with the approver accountable for it. ' +
        'Rejecting means it never runs. Both are audited.',
      responses: [
        { status: 200, description: 'Resolved' },
        { status: 404, description: 'No such held act in this tenant' },
        { status: 409, description: 'Already resolved, or past its deadline' },
        { status: 500, description: 'Approved, but the act failed when it ran' },
      ],
    },
  },
}
