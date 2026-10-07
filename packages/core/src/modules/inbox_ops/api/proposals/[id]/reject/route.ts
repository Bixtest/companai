import { NextResponse } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { runWithCacheTenant } from '@open-mercato/cache'
import { beginInboxOpsMutationGuard } from '../../../mutation-guard'
import { rejectProposal } from '../../../../lib/executionEngine'
import { resolveCache, invalidateCountsCache } from '../../../../lib/cache'
import {
  resolveRequestContext,
  resolveProposal,
  toExecutionContext,
  handleRouteError,
  isErrorResponse,
} from '../../../routeHelpers'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveRequestContext(req)
    const proposal = await resolveProposal(new URL(req.url), ctx)
    if (isErrorResponse(proposal)) return proposal

    // D2-gap (2026-10-07): this route called no guard at all. It rejects every
    // pending action on the proposal, so it is guarded against the proposal —
    // `operation: 'custom'`, the same shape `proposals/[id]/accept-all` uses for
    // the mirror-image bulk change. Placed after the 404 resolution and before
    // the write.
    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal',
      resourceId: proposal.id,
      operation: 'custom',
    })
    if (guard.blockedResponse) return guard.blockedResponse

    await rejectProposal(proposal.id, toExecutionContext(ctx))

    await guard.runAfterSuccess()

    const cache = resolveCache(ctx.container)
    await runWithCacheTenant(ctx.tenantId, () => invalidateCountsCache(cache, ctx.tenantId))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err, 'reject proposal')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Reject proposal',
  methods: {
    POST: {
      summary: 'Reject entire proposal (all pending actions)',
      responses: [
        { status: 200, description: 'Proposal rejected' },
        { status: 404, description: 'Proposal not found' },
      ],
    },
  },
}
