import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { RECORD_LOCK_STATES } from '@open-mercato/shared/modules/record-locks'
import type { RecordLockService } from '@open-mercato/core/modules/auth/services/recordLockService'

/**
 * Freezing and unfreezing a record.
 *
 * Small on purpose. The point of G5 is the *ceiling* the resolver reads; this is
 * the smallest surface that lets somebody actually set one, because a lock nobody
 * can apply is a control that exists only in a table definition.
 *
 * There is no page for it yet. That is a stated gap rather than an oversight —
 * the natural home is a lock control on each record's own screen, which is a
 * per-entity piece of work, not one screen.
 */

const FEATURE_LOCK = 'auth.records.lock'
const RESOURCE_KIND = 'authority.record_lock'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_LOCK] },
  POST: { requireAuth: true, requireFeatures: [FEATURE_LOCK] },
}

const setStateSchema = z.object({
  recordId: z.string().uuid(),
  state: z.enum(RECORD_LOCK_STATES),
  reason: z.string().trim().min(1).max(500).optional(),
  commandHint: z.string().trim().min(1).max(200).optional(),
})

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const container = await createRequestContainer()
  const locks = container.resolve('recordLockService') as RecordLockService

  const items = await locks.list({ tenantId: auth.tenantId, organizationId: auth.orgId ?? null })
  return NextResponse.json({ items })
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = setStateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const container = await createRequestContainer()
  const locks = container.resolve('recordLockService') as RecordLockService
  const scope = { tenantId: auth.tenantId, organizationId: auth.orgId ?? null }

  const before = await locks.stateFor(parsed.data.recordId, scope)
  const after = await locks.setState(parsed.data.recordId, parsed.data.state, scope, {
    reason: parsed.data.reason ?? null,
    commandHint: parsed.data.commandHint ?? null,
    lockedByUserId: auth.sub ?? null,
  })

  // Recorded like any other write. Freezing somebody's work is exactly the kind
  // of act the audit trail exists for, and "who locked this, and when" is the
  // first question anybody asks about a record they cannot edit.
  await writeDirectWriteAuditLog({
    container,
    auth,
    organizationId: auth.orgId ?? null,
    action: 'updated',
    resourceKind: RESOURCE_KIND,
    resourceId: parsed.data.recordId,
    snapshotBefore: before ? { state: before.state, reason: before.reason } : { state: 'open' },
    snapshotAfter: after ? { state: after.state, reason: after.reason } : { state: 'open' },
  })

  return NextResponse.json({ item: after ?? { recordId: parsed.data.recordId, state: 'open' } })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authority',
  summary: 'Records frozen or restricted, whatever anybody holds',
  methods: {
    GET: {
      summary: 'List records that are locked or restricted',
      description:
        'Open records are absent rather than listed: the table records only what constrains.',
      responses: [{ status: 200, description: 'The constrained records in this tenant' }],
    },
    POST: {
      summary: 'Lock, restrict or reopen a record',
      description:
        'Setting `open` clears the lock. `restricted` makes writes need approval; `locked` ' +
        'refuses them, whatever authority the writer holds. Reads are unaffected by both, so a ' +
        'frozen record can still be reviewed by whoever has to decide about it.',
      responses: [
        { status: 200, description: 'The new state of the record' },
        { status: 400, description: 'Invalid request' },
      ],
    },
  },
}
