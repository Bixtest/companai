import { NextResponse } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { findOneWithDecryption, findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { EntityManager } from '@mikro-orm/postgresql'
import { InboxDiscrepancy, InboxEmail, InboxProposal, InboxProposalAction } from '../../../../data/entities'
import { emitInboxOpsEvent } from '../../../../events'
import { beginInboxOpsMutationGuard } from '../../../mutation-guard'
import {
  resolveRequestContext,
  extractPathSegment,
  UnauthorizedError,
} from '../../../routeHelpers'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('inbox_ops').child({ component: 'email-reprocess' })

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

class ReprocessConflictError extends Error {}

export async function POST(req: Request) {
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

    if (email.status === 'received' || email.status === 'processing') {
      return NextResponse.json({ error: 'Email is already queued for processing' }, { status: 409 })
    }

    // D2-gap (2026-10-07): no guard was called. Reprocess retires every prior
    // proposal and re-queues the email, so it is guarded against the email —
    // placed after the 404/409 checks and before the transaction writes.
    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_email',
      resourceId: email.id,
      operation: 'update',
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // R2c — reprocessing discards every proposal the model previously produced
    // for this email and asks it to try again. That is a decision about machine
    // output, so it is recorded with the retirement it performs.
    //
    // `em.transactional` rather than `withAtomicFlush`'s begin/commit: the audit
    // service holds the container's EntityManager, and only the transactional
    // form binds a transaction that its writes join. The phase boundaries
    // (SPEC-018 — flush before the next phase reads) are kept explicitly.
    const em = ctx.container.resolve('em') as EntityManager
    const retiredCounts = await em.transactional(async (trx) => {
      const counts = await retireActiveProposalsForEmail(trx, email.id, ctx.userId, ctx.scope)
      await trx.flush()

      const record = await findOneWithDecryption(
        trx,
        InboxEmail,
        { id: email.id, deletedAt: null },
        undefined,
        ctx.scope,
      )
      if (record) {
        record.status = 'received'
        record.processingError = null
        await trx.flush()
      }

      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'updated',
        resourceKind: 'inbox_ops.email',
        resourceId: email.id,
        snapshotAfter: { reprocessed: true, ...counts },
        context: { source: 'inbox_ops', proposedBy: 'ai', undoable: false },
      })

      return counts
    })

    try {
      await emitInboxOpsEvent('inbox_ops.email.reprocessed', {
        emailId: email.id,
        tenantId: email.tenantId,
        organizationId: email.organizationId,
      })
      await emitInboxOpsEvent('inbox_ops.email.received', {
        emailId: email.id,
        tenantId: email.tenantId,
        organizationId: email.organizationId,
        forwardedByAddress: email.forwardedByAddress,
        subject: email.subject,
      })
    } catch (eventError) {
      logger.error('Failed to emit events', { err: eventError })
    }

    await guard.runAfterSuccess()

    return NextResponse.json({ ok: true, ...retiredCounts })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof ReprocessConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }

    logger.error('Reprocess failed', { err })
    return NextResponse.json({ error: 'Failed to reprocess email' }, { status: 500 })
  }
}

async function retireActiveProposalsForEmail(
  em: EntityManager,
  emailId: string,
  userId: string,
  scope: { tenantId: string; organizationId: string },
): Promise<{ retiredProposalCount: number; retiredActionCount: number }> {
  const proposals = await findWithDecryption(
    em,
    InboxProposal,
    {
      inboxEmailId: emailId,
      isActive: true,
      deletedAt: null,
    },
    undefined,
    scope,
  )

  if (proposals.length === 0) {
    return { retiredProposalCount: 0, retiredActionCount: 0 }
  }

  const proposalIds = proposals.map((proposal) => proposal.id)
  const actions = await findWithDecryption(
    em,
    InboxProposalAction,
    {
      proposalId: { $in: proposalIds },
      deletedAt: null,
    },
    undefined,
    scope,
  )

  if (actions.some((action) => action.status === 'accepted' || action.status === 'executed' || action.status === 'processing')) {
    throw new ReprocessConflictError('Cannot reprocess after actions were already executed. Open the latest proposal instead.')
  }

  // Resolve every read before mutating: a query issued between a scalar
  // mutation and the flush can silently reset the Unit of Work (SPEC-018
  // Problem 1). The caller flushes once this function returns, so ordering is ours.
  const discrepancies = await findWithDecryption(
    em,
    InboxDiscrepancy,
    {
      proposalId: { $in: proposalIds },
      resolved: false,
      deletedAt: null,
    },
    undefined,
    scope,
  )

  const now = new Date()
  const supersededAt = now.toISOString()
  for (const proposal of proposals) {
    const previousMetadata = proposal.metadata && typeof proposal.metadata === 'object'
      ? proposal.metadata
      : {}
    proposal.isActive = false
    proposal.status = proposal.status === 'accepted' ? proposal.status : 'rejected'
    proposal.reviewedAt = now
    proposal.reviewedByUserId = userId
    proposal.metadata = {
      ...previousMetadata,
      supersededAt,
      supersededByUserId: userId,
      supersededReason: 'email_reprocessed',
    }
  }

  let retiredActionCount = 0
  for (const action of actions) {
    if (action.status !== 'pending' && action.status !== 'failed') {
      continue
    }
    action.status = 'rejected'
    action.executedAt = now
    action.executedByUserId = userId
    action.executionError = action.executionError || 'Superseded by email reprocess'
    retiredActionCount += 1
  }

  for (const discrepancy of discrepancies) {
    discrepancy.resolved = true
  }

  return {
    retiredProposalCount: proposals.length,
    retiredActionCount,
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Reprocess email',
  methods: {
    POST: {
      summary: 'Re-trigger LLM extraction on a failed or low-confidence email',
      responses: [
        { status: 200, description: 'Email queued for reprocessing' },
        { status: 404, description: 'Email not found' },
        { status: 409, description: 'Email is already processing or proposal cannot be superseded safely' },
      ],
    },
  },
}
