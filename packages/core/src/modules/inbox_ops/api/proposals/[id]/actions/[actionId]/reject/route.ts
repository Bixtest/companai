import { NextResponse } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { runWithCacheTenant } from '@open-mercato/cache'
import { beginInboxOpsMutationGuard } from '../../../../../mutation-guard'
import { rejectAction } from '../../../../../../lib/executionEngine'
import { resolveCache, invalidateCountsCache } from '../../../../../../lib/cache'
import {
  resolveRequestContext,
  resolveActionAndProposal,
  toExecutionContext,
  handleRouteError,
  isErrorResponse,
} from '../../../../../routeHelpers'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveRequestContext(req)
    const resolved = await resolveActionAndProposal(new URL(req.url), ctx)
    if (isErrorResponse(resolved)) return resolved

    if (resolved.action.status !== 'pending' && resolved.action.status !== 'failed') {
      return NextResponse.json({ error: 'Action already processed' }, { status: 409 })
    }

    // D2-gap (2026-10-07): no guard was called. Guarded against the action, and
    // placed after the 409 so an action that is already processed is not
    // policy-evaluated for a request that will not write anyway.
    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal_action',
      resourceId: resolved.action.id,
      operation: 'update',
    })
    if (guard.blockedResponse) return guard.blockedResponse

    await rejectAction(resolved.action, toExecutionContext(ctx))

    await guard.runAfterSuccess()

    const cache = resolveCache(ctx.container)
    await runWithCacheTenant(ctx.tenantId, () => invalidateCountsCache(cache, ctx.tenantId))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err, 'reject action')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Reject action',
  methods: {
    POST: {
      summary: 'Reject a proposal action',
      responses: [
        { status: 200, description: 'Action rejected' },
        { status: 404, description: 'Action not found' },
        { status: 409, description: 'Action already processed' },
      ],
    },
  },
}
