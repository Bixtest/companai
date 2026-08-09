import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { InboxEmail } from '../../data/entities'
import { emitInboxOpsEvent } from '../../events'
import { resolveRequestContext, handleRouteError } from '../routeHelpers'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('inbox_ops').child({ component: 'extract' })

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['inbox_ops.proposals.manage'] },
}

const extractRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(100_000, 'Text exceeds maximum length'),
  title: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: Request) {
  try {
    const ctx = await resolveRequestContext(req)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = extractRequestSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { text, title, metadata: inputMetadata } = parsed.data

    const maxTextSize = parseInt(process.env.INBOX_OPS_MAX_TEXT_SIZE || '204800', 10)
    const truncatedText = text.slice(0, maxTextSize)

    // R2c — this is one of the two doors machine-proposed work enters through
    // (the other is the inbound webhook). Recording who submitted text for
    // extraction is what lets a later proposal be traced back to its origin.
    const submitterEmail = ctx.auth?.email || ctx.userId
    const containerEm = ctx.container.resolve('em') as EntityManager
    const email = await containerEm.transactional(async (trx) => {
      const created = trx.create(InboxEmail, {
        forwardedByAddress: submitterEmail,
        forwardedByName: null,
        toAddress: 'text-extract',
        subject: title || 'Text extraction',
        cleanedText: truncatedText,
        rawText: truncatedText,
        receivedAt: new Date(),
        status: 'received' as const,
        isActive: true,
        organizationId: ctx.organizationId,
        tenantId: ctx.tenantId,
        metadata: {
          ...inputMetadata,
          source: 'text_extract',
          submittedByUserId: ctx.userId,
        },
      })

      trx.persist(created)
      await trx.flush()

      // The submitted text is not snapshotted: it is the message body, encrypted
      // at rest on the email record, and copying it here would duplicate tenant
      // content under different retention. The entry records the submission and
      // points at the email.
      await writeDirectWriteAuditLog({
        container: ctx.container,
        auth: ctx.auth,
        organizationId: ctx.organizationId,
        action: 'created',
        resourceKind: 'inbox_ops.email',
        resourceId: created.id,
        snapshotAfter: { source: 'text_extract', characters: truncatedText.length },
      })

      return created
    })

    try {
      await emitInboxOpsEvent('inbox_ops.email.received', {
        emailId: email.id,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        forwardedByAddress: submitterEmail,
        subject: title || 'Text extraction',
      })
    } catch (eventError) {
      logger.error('Failed to emit email.received event', { err: eventError })
    }

    return NextResponse.json({ ok: true, emailId: email.id })
  } catch (err) {
    return handleRouteError(err, 'extract text')
  }
}

export const openApi: OpenApiRouteDoc = {
  tag: 'InboxOps',
  summary: 'Extract actions from raw text',
  methods: {
    POST: {
      summary: 'Submit raw text for LLM extraction',
      description: 'Creates an InboxEmail record from raw text and triggers the extraction pipeline. The extraction runs asynchronously.',
      responses: [
        { status: 200, description: 'Extraction queued successfully' },
        { status: 400, description: 'Invalid request body' },
        { status: 401, description: 'Unauthorized' },
      ],
    },
  },
}
