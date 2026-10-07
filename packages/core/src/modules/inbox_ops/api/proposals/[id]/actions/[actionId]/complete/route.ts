import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { runWithCacheTenant } from '@open-mercato/cache'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { InboxProposal, InboxProposalAction } from '../../../../../../data/entities'
import { beginInboxOpsMutationGuard } from '../../../../../mutation-guard'
import { recalculateProposalStatus } from '../../../../../../lib/executionEngine'
import { formatZodErrors } from '../../../../../../lib/validation'
import { resolveCache, invalidateCountsCache } from '../../../../../../lib/cache'
import {
  resolveRequestContext,
  resolveActionAndProposal,
  handleRouteError,
  isErrorResponse,
} from '../../../../../routeHelpers'

export const metadata = {
  PATCH: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

const completeBodySchema = z.object({
  createdEntityId: z.string().uuid(),
  createdEntityType: z.string().trim().min(1).max(100),
})

export async function PATCH(req: Request) {
  try {
    const ctx = await resolveRequestContext(req)
    const resolved = await resolveActionAndProposal(new URL(req.url), ctx)
    if (isErrorResponse(resolved)) return resolved

    const { action, proposal } = resolved

    if (action.status !== 'pending' && action.status !== 'failed') {
      return NextResponse.json(
        { error: 'Action already processed' },
        { status: 409 },
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = completeBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: `Invalid body: ${formatZodErrors(parsed.error)}` }, { status: 400 })
    }

    // D2-gap (2026-10-07): no guard was called. Guarded against the action;
    // placed after the 409 and the body parse, before the transaction writes.
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

    // R2c — this route closes a proposed action that a person fulfilled by hand
    // elsewhere, outside the execution engine. It is the one path where an AI
    // proposal is resolved without the command bus recording anything, so
    // without this the decision leaves no trace at all.
    const em = ctx.container.resolve('em') as EntityManager
    const freshAction = await em.transactional(async (trx) => {
      const record = await findOneWithDecryption(
        trx,
        InboxProposalAction,
        { id: action.id, deletedAt: null },
        undefined,
        ctx.scope,
      )
      if (!record) return null

      record.status = 'executed'
      record.executedAt = new Date()
      record.executedByUserId = ctx.userId
      record.createdEntityId = parsed.data.createdEntityId
      record.createdEntityType = parsed.data.createdEntityType
      record.executionError = null
      await trx.flush()

      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'completed',
        resourceKind: 'inbox_ops.proposal_action',
        resourceId: record.id,
        snapshotAfter: {
          proposalId: record.proposalId,
          actionType: record.actionType,
          confidence: record.confidence,
          createdEntityId: parsed.data.createdEntityId,
          createdEntityType: parsed.data.createdEntityType,
        },
        context: { source: 'inbox_ops', proposedBy: 'ai', undoable: false },
      })

      return record
    })

    if (!freshAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    await recalculateProposalStatus(em, proposal.id, ctx.scope)

    await guard.runAfterSuccess()

    const freshProposal = await findOneWithDecryption(
      em,
      InboxProposal,
      { id: proposal.id, deletedAt: null },
      undefined,
      ctx.scope,
    )

    const cache = resolveCache(ctx.container)
    await runWithCacheTenant(ctx.tenantId, () => invalidateCountsCache(cache, ctx.tenantId))

    return NextResponse.json({
      ok: true,
      action: {
        id: freshAction.id,
        status: freshAction.status,
        createdEntityId: freshAction.createdEntityId,
        createdEntityType: freshAction.createdEntityType,
        executedAt: freshAction.executedAt,
      },
      proposal: freshProposal ? {
        id: freshProposal.id,
        status: freshProposal.status,
      } : null,
    })
  } catch (err) {
    return handleRouteError(err, 'complete action')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Complete action externally',
  methods: {
    PATCH: {
      summary: 'Mark an action as completed with an externally-created entity',
      description: 'Used when an action is fulfilled through the normal sales form instead of the execution engine. Updates the action status without running the execution engine.',
      responses: [
        { status: 200, description: 'Action marked as completed' },
        { status: 400, description: 'Invalid body' },
        { status: 404, description: 'Action not found' },
        { status: 409, description: 'Action already processed' },
      ],
    },
  },
}
