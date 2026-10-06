import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { runWithCacheTenant } from '@open-mercato/cache'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { InboxProposal } from '../../../../data/entities'
import { beginInboxOpsMutationGuard } from '../../../mutation-guard'
import { categorizeProposalSchema } from '../../../../data/validators'
import { resolveCache, invalidateCountsCache } from '../../../../lib/cache'
import {
  resolveRequestContext,
  resolveProposal,
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

    const body = await req.json()
    const parsed = categorizeProposalSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return NextResponse.json({ error: `Invalid category: ${issues}` }, { status: 400 })
    }

    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal',
      resourceId: proposal.id,
      operation: 'update',
      mutationPayload: parsed.data,
    })
    if (guard.blockedResponse) return guard.blockedResponse

    const previousCategory = proposal.category || null

    // R2c — recategorising a proposal changes how the extracted work is routed
    // and reported, so the change and its record commit together. Loaded inside
    // the transaction because an entity belongs to the manager that loaded it.
    const em = ctx.container.resolve('em') as EntityManager
    await em.transactional(async (trx) => {
      const record = await findOneWithDecryption(
        trx,
        InboxProposal,
        { id: proposal.id, deletedAt: null },
        undefined,
        ctx.scope,
      )
      if (!record) return

      record.category = parsed.data.category
      await trx.flush()
      proposal.category = parsed.data.category

      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'updated',
        resourceKind: 'inbox_ops.proposal',
        resourceId: record.id,
        snapshotBefore: { category: previousCategory },
        snapshotAfter: { category: parsed.data.category },
      })
    })

    await guard.runAfterSuccess()

    const cache = resolveCache(ctx.container)
    await runWithCacheTenant(ctx.tenantId, () => invalidateCountsCache(cache, ctx.tenantId))

    return NextResponse.json({
      ok: true,
      category: parsed.data.category,
      previousCategory,
    })
  } catch (err) {
    return handleRouteError(err, 'categorize proposal')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Categorize proposal',
  methods: {
    POST: {
      summary: 'Set or change the category of a proposal',
      description: 'Assigns a category to a proposal. Returns the new and previous category for undo support.',
      responses: [
        { status: 200, description: 'Category updated' },
        { status: 400, description: 'Invalid category value' },
        { status: 404, description: 'Proposal not found' },
      ],
    },
  },
}
