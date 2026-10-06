import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { InboxEmail } from '../../../data/entities'
import { beginInboxOpsMutationGuard } from '../../mutation-guard'
import {
  resolveRequestContext,
  extractPathSegment,
  UnauthorizedError,
} from '../../routeHelpers'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { canViewEmailContent, serializeInboxEmail } from '../response'

const logger = createLogger('inbox_ops').child({ component: 'emails' })

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['inbox_ops.log.view'] },
  DELETE: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const id = extractPathSegment(url, 'emails')

    if (!id) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 })
    }

    const ctx = await resolveRequestContext(req)

    const email = await findOneWithDecryption(
      ctx.em,
      InboxEmail,
      {
        id,
        organizationId: ctx.organizationId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      undefined,
      ctx.scope,
    )

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const includeContent = await canViewEmailContent(ctx)
    return NextResponse.json({ email: serializeInboxEmail(email, includeContent) })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to load email detail', { err })
    return NextResponse.json({ error: 'Failed to load email' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = extractPathSegment(url, 'emails')

    if (!id) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 })
    }

    const ctx = await resolveRequestContext(req)

    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_email',
      resourceId: id,
      operation: 'delete',
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // R2c — the soft delete and its audit entry commit together. The transaction
    // is opened on the container's EntityManager, not `ctx.em`: the audit service
    // holds the container's manager, and a transaction on a fork would not
    // include it.
    const em = ctx.container.resolve('em') as EntityManager
    const updated = await em.transactional(async (trx) => {
      const rows = await trx.nativeUpdate(
        InboxEmail,
        {
          id,
          organizationId: ctx.organizationId,
          tenantId: ctx.tenantId,
          deletedAt: null,
        },
        { deletedAt: new Date() },
      )

      if (rows === 0) return 0

      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'deleted',
        resourceKind: 'inbox_ops.email',
        resourceId: id,
      })

      return rows
    })

    if (updated === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    await guard.runAfterSuccess()

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to delete email', { err })
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 })
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Email detail',
  methods: {
    GET: {
      summary: 'Get email detail with parsed thread',
      responses: [
        { status: 200, description: 'Email detail' },
        { status: 404, description: 'Email not found' },
      ],
    },
    DELETE: {
      summary: 'Soft-delete an inbox email',
      responses: [
        { status: 200, description: 'Email deleted' },
        { status: 404, description: 'Email not found' },
      ],
    },
  },
}
