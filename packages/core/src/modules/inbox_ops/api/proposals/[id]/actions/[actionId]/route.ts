import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { runWithCacheTenant } from '@open-mercato/cache'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { InboxProposalAction } from '../../../../../data/entities'
import { beginInboxOpsMutationGuard } from '../../../../mutation-guard'
import { actionEditSchema, validateActionPayloadForType } from '../../../../../data/validators'
import { emitInboxOpsEvent } from '../../../../../events'
import { resolveCache, invalidateCountsCache } from '../../../../../lib/cache'
import {
  resolveRequestContext,
  resolveActionAndProposal,
  handleRouteError,
  isErrorResponse,
} from '../../../../routeHelpers'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('inbox_ops').child({ component: 'action-edit' })

export const metadata = {
  PATCH: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const parsed = actionEditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
    }

    const ctx = await resolveRequestContext(req)
    const resolved = await resolveActionAndProposal(new URL(req.url), ctx)
    if (isErrorResponse(resolved)) return resolved

    const { action } = resolved

    if (action.status !== 'pending' && action.status !== 'failed') {
      return NextResponse.json({ error: 'Action already processed' }, { status: 409 })
    }

    const mergedPayload = { ...action.payload as Record<string, unknown>, ...parsed.data.payload }
    const payloadValidation = validateActionPayloadForType(action.actionType, mergedPayload)
    if (!payloadValidation.success) {
      return NextResponse.json({ error: payloadValidation.error }, { status: 400 })
    }

    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal_action',
      resourceId: action.id,
      operation: 'update',
      mutationPayload: parsed.data,
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // R2c — editing what the model proposed, before approving it, is a governed
    // act: the change a person ends up approving is no longer the one the model
    // suggested. The edit and its record commit together.
    //
    // The payload itself is not snapshotted — it is encrypted tenant PII
    // (extracted order lines, contact details) and belongs in the proposal, not
    // duplicated into the audit log under different retention.
    const em = ctx.container.resolve('em') as EntityManager
    await em.transactional(async (trx) => {
      const record = await findOneWithDecryption(
        trx,
        InboxProposalAction,
        { id: action.id, deletedAt: null },
        undefined,
        { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      )
      if (!record) return

      record.payload = mergedPayload
      await trx.flush()
      action.payload = mergedPayload

      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'updated',
        resourceKind: 'inbox_ops.proposal_action',
        resourceId: record.id,
        snapshotAfter: {
          proposalId: record.proposalId,
          actionType: record.actionType,
          editedFields: Object.keys(parsed.data.payload ?? {}).sort((left, right) => left.localeCompare(right)),
        },
        context: { source: 'inbox_ops', proposedBy: 'ai', undoable: false },
      })
    })

    await guard.runAfterSuccess()

    const cache = resolveCache(ctx.container)
    await runWithCacheTenant(ctx.tenantId, () => invalidateCountsCache(cache, ctx.tenantId))

    try {
      await emitInboxOpsEvent('inbox_ops.action.edited', {
        actionId: action.id,
        proposalId: action.proposalId,
        actionType: action.actionType,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
      })
    } catch (eventError) {
      logger.error('Failed to emit event', { err: eventError })
    }

    return NextResponse.json({ ok: true, action })
  } catch (err) {
    return handleRouteError(err, 'edit action')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Edit action',
  methods: {
    PATCH: {
      summary: 'Edit action payload before accepting',
      responses: [
        { status: 200, description: 'Action updated' },
        { status: 404, description: 'Action not found' },
        { status: 409, description: 'Action already processed' },
      ],
    },
  },
}
