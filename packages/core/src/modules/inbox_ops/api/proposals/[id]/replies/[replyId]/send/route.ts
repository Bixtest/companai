import { NextResponse } from 'next/server'
import { raw } from '@mikro-orm/core'
import { Resend } from 'resend'
import { parseBooleanWithDefault } from '@open-mercato/shared/lib/boolean'
import { resolveDefaultEmailFromAddress } from '@open-mercato/shared/lib/email/config'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { InboxProposalAction, InboxEmail } from '../../../../../../data/entities'
import { draftReplyPayloadSchema } from '../../../../../../data/validators'
import { emitInboxOpsEvent } from '../../../../../../events'
import { beginInboxOpsMutationGuard } from '../../../../../mutation-guard'
import { createMessageRecordForReply } from '../../../../../../lib/messagesIntegration'
import {
  resolveRequestContext,
  resolveProposal,
  extractPathSegment,
  handleRouteError,
  isErrorResponse,
} from '../../../../../routeHelpers'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('inbox_ops').child({ component: 'reply-send' })

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['inbox_ops.replies.send'] },
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveRequestContext(req)
    const url = new URL(req.url)
    const proposal = await resolveProposal(url, ctx)
    if (isErrorResponse(proposal)) return proposal

    const replyId = extractPathSegment(url, 'replies')
    if (!replyId) {
      return NextResponse.json({ error: 'Missing reply ID' }, { status: 400 })
    }

    const action = await findOneWithDecryption(
      ctx.em,
      InboxProposalAction,
      {
        id: replyId,
        proposalId: proposal.id,
        actionType: 'draft_reply',
        organizationId: ctx.organizationId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      undefined,
      ctx.scope,
    )

    if (!action) {
      return NextResponse.json({ error: 'Reply action not found' }, { status: 404 })
    }

    if (action.status !== 'executed') {
      return NextResponse.json(
        { error: `Cannot send reply — action must be accepted first (current status: "${action.status}")` },
        { status: 409 },
      )
    }

    const existingMetadata =
      action.metadata && typeof action.metadata === 'object' ? action.metadata : {}
    if ((existingMetadata as Record<string, unknown>).replySentAt) {
      return NextResponse.json(
        { error: 'Reply has already been sent for this action' },
        { status: 409 },
      )
    }

    const email = await findOneWithDecryption(
      ctx.em,
      InboxEmail,
      { id: proposal.inboxEmailId, deletedAt: null },
      undefined,
      ctx.scope,
    )

    const payloadResult = draftReplyPayloadSchema.safeParse(action.payload)
    if (!payloadResult.success) {
      return NextResponse.json({ error: 'Reply payload missing required fields (to, subject, body)' }, { status: 400 })
    }
    const { to: toAddress, toName, subject, body } = payloadResult.data

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const emailDisabled =
      parseBooleanWithDefault(process.env.OM_DISABLE_EMAIL_DELIVERY, false) ||
      parseBooleanWithDefault(process.env.OM_TEST_MODE, false)
    if (emailDisabled) {
      return NextResponse.json({ error: 'Email delivery is disabled' }, { status: 503 })
    }

    const { inReplyToMessageId, references: payloadReferences } = payloadResult.data
    const fromAddress = resolveDefaultEmailFromAddress()
    if (!fromAddress) {
      return NextResponse.json({
        error: 'Email sender is not configured. Set NOTIFICATIONS_EMAIL_FROM, EMAIL_FROM, or ADMIN_EMAIL.',
      }, { status: 503 })
    }

    const headers: Record<string, string> = {}
    const inReplyTo = inReplyToMessageId || email?.messageId
    if (inReplyTo) {
      headers['In-Reply-To'] = inReplyTo
    }
    const references = payloadReferences || (email?.emailReferences as string[])
    if (references && references.length > 0) {
      headers['References'] = references.join(' ')
    }

    // D2-gap (2026-10-07): no guard was called. This route makes an IRREVERSIBLE
    // external call — it sends a real email through the provider — and writes
    // the action's metadata, so it is guarded against the reply action. The
    // guard runs BEFORE the send claim and before `resend.emails.send`, so a
    // block prevents both the message leaving and a claim row being left behind.
    const guard = await beginInboxOpsMutationGuard({
      container: ctx.container,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      req,
      resourceKind: 'inbox_ops:inbox_proposal_action',
      resourceId: action.id,
      operation: 'custom',
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // Atomically claim the send right before calling the external email provider so
    // two concurrent requests cannot both deliver the same reply. The claim only
    // succeeds when neither replySentAt nor replySendClaimedAt is already set in the
    // metadata; a losing request gets 0 rows back and is rejected with 409.
    const sendClaimedAt = new Date().toISOString()
    const claimed = await ctx.em.nativeUpdate(
      InboxProposalAction,
      {
        id: action.id,
        proposalId: proposal.id,
        actionType: 'draft_reply',
        organizationId: ctx.organizationId,
        tenantId: ctx.tenantId,
        deletedAt: null,
        status: 'executed',
        [raw(`coalesce("metadata"->>'replySentAt', '')`)]: '',
        [raw(`coalesce("metadata"->>'replySendClaimedAt', '')`)]: '',
      },
      {
        metadata: raw(
          `coalesce("metadata", '{}'::jsonb) || jsonb_build_object('replySendClaimedAt', ?::text)`,
          [sendClaimedAt],
        ),
      },
    )

    if (claimed === 0) {
      return NextResponse.json(
        { error: 'Reply send is already in progress or has been sent for this action' },
        { status: 409 },
      )
    }

    const releaseSendClaim = async () => {
      try {
        await ctx.em.nativeUpdate(
          InboxProposalAction,
          {
            id: action.id,
            organizationId: ctx.organizationId,
            tenantId: ctx.tenantId,
            [raw(`coalesce("metadata"->>'replySentAt', '')`)]: '',
            [raw(`("metadata"->>'replySendClaimedAt')`)]: sendClaimedAt,
          },
          { metadata: raw(`"metadata" - 'replySendClaimedAt'`) },
        )
      } catch (releaseError) {
        logger.error('Failed to release send claim', { err: releaseError })
      }
    }

    const resend = new Resend(apiKey)
    const { data: sendData, error: sendError } = await resend.emails.send({
      to: toAddress,
      from: fromAddress,
      subject,
      text: body,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    })

    if (sendError) {
      await releaseSendClaim()
      const errorMessage = sendError.message || 'Unknown error'
      return NextResponse.json({ error: `Failed to send email: ${errorMessage}` }, { status: 502 })
    }

    const sentMessageId = sendData?.id || null
    const messagesResult = await createMessageRecordForReply(
      { to: toAddress, toName, subject, body },
      proposal.inboxEmailId,
      {
        container: ctx.container,
        scope: {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
        },
      },
    )

    action.metadata = {
      ...existingMetadata,
      replySentAt: new Date().toISOString(),
      sentMessageId,
      ...(messagesResult ? { messageRecordId: messagesResult.messageId } : {}),
    }
    await ctx.em.flush()

    await guard.runAfterSuccess()

    // R2c — an outbound message sent to a customer on the tenant's behalf, from
    // text a model drafted. Who was contacted is exactly the kind of fact an
    // investigation asks about; the body is not recorded, only the recipient and
    // the provider's message id, so the message itself stays where its own
    // permissions apply.
    //
    // Recorded after the fact and outside a transaction, because the email has
    // already left. It logs rather than throws for the same reason the workflows
    // advance route does: the send succeeded, and reporting failure would be a
    // lie the caller cannot act on.
    try {
      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'completed',
        resourceKind: 'inbox_ops.reply',
        resourceId: action.id,
        snapshotAfter: {
          proposalId: proposal.id,
          toAddress,
          sentMessageId,
          messageRecordId: messagesResult?.messageId ?? null,
        },
        context: { source: 'inbox_ops', proposedBy: 'ai', undoable: false },
      })
    } catch (auditError) {
      logger.error('Failed to record sent reply in the audit log', {
        actionId: action.id,
        proposalId: proposal.id,
        err: auditError,
      })
    }

    try {
      await emitInboxOpsEvent('inbox_ops.reply.sent', {
        proposalId: proposal.id,
        actionId: replyId,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        toAddress,
        sentMessageId,
        messageRecordId: messagesResult?.messageId ?? null,
      })
    } catch (eventError) {
      logger.error('Failed to emit event', { err: eventError })
    }

    return NextResponse.json({
      ok: true,
      sentMessageId,
      ...(messagesResult ? { messageRecordId: messagesResult.messageId } : {}),
    })
  } catch (err) {
    return handleRouteError(err, 'send reply')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Send draft reply',
  methods: {
    POST: {
      summary: 'Send a draft reply email and register it in messages when available',
      description: 'Sends the draft_reply action payload via the configured email provider. When the messages module is available, also records the sent reply as an internal message record. Sets In-Reply-To and References headers for threading.',
      responses: [
        { status: 200, description: 'Reply sent successfully' },
        { status: 400, description: 'Missing required payload fields' },
        { status: 404, description: 'Reply action not found' },
        { status: 409, description: 'Action in invalid state for sending, or a send is already in progress / completed for this reply' },
        { status: 502, description: 'Email delivery failed' },
        { status: 503, description: 'Email service not configured or disabled' },
      ],
    },
  },
}
