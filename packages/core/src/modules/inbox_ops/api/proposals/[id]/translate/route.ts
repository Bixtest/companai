import { NextResponse } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { InboxProposalAction } from '../../../../data/entities'
import type { ProposalTranslationEntry } from '../../../../data/entities'
import { beginInboxOpsMutationGuard } from '../../../mutation-guard'
import { translateProposalSchema } from '../../../../data/validators'
import { translateProposalContent } from '../../../../lib/translationProvider'
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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = translateProposalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
    }

    const { targetLocale } = parsed.data
    const proposalLanguage = proposal.workingLanguage || 'en'

    if (proposalLanguage === targetLocale) {
      return NextResponse.json({ error: 'Proposal is already in the requested language' }, { status: 400 })
    }

    // Return cached translation if available
    const cached = proposal.translations?.[targetLocale]
    if (cached) {
      return NextResponse.json({ translation: cached, cached: true })
    }

    // D2-gap (2026-10-07): the route reads as a "translate" verb but it WRITES —
    // it persists `proposal.translations[targetLocale]` and flushes. It called
    // no guard. Guarded against the proposal as an update, placed AFTER the
    // cache-hit return so a request that only reads a cached translation is not
    // policy-evaluated, and before the write.
    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal',
      resourceId: proposal.id,
      operation: 'update',
      mutationPayload: { targetLocale },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // Load actions for translation
    const actions = await findWithDecryption(
      ctx.em,
      InboxProposalAction,
      { proposalId: proposal.id, organizationId: ctx.organizationId, tenantId: ctx.tenantId, deletedAt: null },
      { orderBy: { sortOrder: 'ASC' } },
      ctx.scope,
    )

    const actionDescriptions: Record<string, string> = {}
    for (const action of actions) {
      actionDescriptions[action.id] = action.description
    }

    const result = await translateProposalContent({
      summary: proposal.summary,
      actionDescriptions,
      sourceLanguage: proposalLanguage,
      targetLocale,
    })

    const entry: ProposalTranslationEntry = {
      summary: result.summary,
      actions: result.actions,
      translatedAt: new Date().toISOString(),
    }

    // Cache the translation on the proposal entity
    const translations = proposal.translations || {}
    translations[targetLocale] = entry
    proposal.translations = translations
    await ctx.em.flush()

    await guard.runAfterSuccess()

    return NextResponse.json({ translation: entry, cached: false })
  } catch (err) {
    return handleRouteError(err, 'translate proposal')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Translate proposal',
  methods: {
    POST: {
      summary: 'Translate proposal content',
      description: 'Translates the proposal summary and action descriptions to the target locale. Results are cached.',
      responses: [
        { status: 200, description: 'Translation result' },
        { status: 400, description: 'Invalid target locale or same language' },
        { status: 404, description: 'Proposal not found' },
      ],
    },
  },
}
