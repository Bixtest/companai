import { NextResponse } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { serializeOperationMetadata } from '@open-mercato/shared/lib/commands/operationMetadata'
import { runWithCacheTenant } from '@open-mercato/cache'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { InboxProposal, InboxProposalAction } from '../../../../../../data/entities'
import { beginInboxOpsMutationGuard } from '../../../../../mutation-guard'
import { executeAction } from '../../../../../../lib/executionEngine'
import { resolveCache, invalidateCountsCache } from '../../../../../../lib/cache'
import {
  resolveRequestContext,
  resolveActionAndProposal,
  resolveCrossModuleEntities,
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

    // D2-gap (2026-10-07): no guard was called. Accept executes the action and
    // writes into the target module, so it is guarded against the action —
    // placed after the 404 resolution and before `executeAction`.
    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal_action',
      resourceId: resolved.action.id,
      operation: 'custom',
    })
    if (guard.blockedResponse) return guard.blockedResponse

    const entities = resolveCrossModuleEntities(ctx.container)
    const result = await executeAction(resolved.action, toExecutionContext(ctx, entities))

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to execute action' },
        { status: result.statusCode || 400 },
      )
    }

    await guard.runAfterSuccess()

    const freshAction = await findOneWithDecryption(
      ctx.em,
      InboxProposalAction,
      { id: resolved.action.id, deletedAt: null },
      undefined,
      ctx.scope,
    )

    const freshProposal = await findOneWithDecryption(
      ctx.em,
      InboxProposal,
      { id: resolved.proposal.id, deletedAt: null },
      undefined,
      ctx.scope,
    )

    const cache = resolveCache(ctx.container)
    await runWithCacheTenant(ctx.tenantId, () => invalidateCountsCache(cache, ctx.tenantId))

    const response = NextResponse.json({
      ok: true,
      action: freshAction ? {
        id: freshAction.id,
        status: freshAction.status,
        createdEntityId: freshAction.createdEntityId,
        createdEntityType: freshAction.createdEntityType,
        executedAt: freshAction.executedAt,
        executedByUserId: freshAction.executedByUserId,
      } : null,
      proposal: freshProposal ? {
        id: freshProposal.id,
        status: freshProposal.status,
      } : null,
    })

    const operationLogEntry = result.operationLogEntry
    if (operationLogEntry?.undoToken && operationLogEntry.id && operationLogEntry.commandId) {
      const executedAt = operationLogEntry.createdAt instanceof Date
        ? operationLogEntry.createdAt.toISOString()
        : typeof operationLogEntry.createdAt === 'string' && operationLogEntry.createdAt.trim().length > 0
          ? operationLogEntry.createdAt
          : new Date().toISOString()

      response.headers.set(
        'x-om-operation',
        serializeOperationMetadata({
          id: operationLogEntry.id,
          undoToken: operationLogEntry.undoToken,
          commandId: operationLogEntry.commandId,
          actionLabel: operationLogEntry.actionLabel ?? null,
          resourceKind: operationLogEntry.resourceKind ?? null,
          resourceId: operationLogEntry.resourceId ?? null,
          executedAt,
        }),
      )
    }

    return response
  } catch (err) {
    return handleRouteError(err, 'execute action')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Accept action',
  methods: {
    POST: {
      summary: 'Accept and execute a proposal action',
      description: 'Executes the action and creates the entity in the target module. Returns 409 if already processed.',
      responses: [
        { status: 200, description: 'Action executed successfully' },
        { status: 403, description: 'Insufficient permissions in target module' },
        { status: 404, description: 'Action not found' },
        { status: 409, description: 'Action already processed' },
      ],
    },
  },
}
