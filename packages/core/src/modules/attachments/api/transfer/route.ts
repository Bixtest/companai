import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { mergeAttachmentMetadata, readAttachmentMetadata } from '../../lib/metadata'
import {
  attachmentsTag,
  transferAttachmentsRequestSchema,
  transferAttachmentsResponseSchema,
  attachmentErrorSchema,
} from '../openapi'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { beginAttachmentsMutationGuard } from '../mutation-guard'

const transferSchema = z.object({
  entityId: z.string().min(1),
  attachmentIds: z.array(z.string().uuid()).min(1),
  fromRecordId: z.string().min(1).optional(),
  toRecordId: z.string().min(1),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['attachments.manage'] },
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const json = await req.json().catch(() => null)
  const parsed = transferSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const { attachmentIds, entityId, fromRecordId, toRecordId } = parsed.data
  const container = await createRequestContainer()
  const { resolve } = container
  const em = resolve('em') as any
  let AttachmentEntity: any
  try {
    const mod = await import('@open-mercato/core/modules/attachments/data/entities')
    AttachmentEntity = mod.Attachment
  } catch {
    return NextResponse.json({ error: 'Attachment model missing' }, { status: 500 })
  }
  const filters: Record<string, unknown> = {
    id: { $in: attachmentIds },
    entityId,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
  }
  if (fromRecordId) {
    filters.recordId = fromRecordId
  }
  const records = await em.find(AttachmentEntity, filters)
  if (!records.length) {
    return NextResponse.json({ error: 'Attachments not found' }, { status: 404 })
  }
  // Structural mutation-guard chokepoint. Runs every registered guard for the
  // `attachments.attachment` kind before any row is touched; a block returns
  // here and nothing below runs. The transfer moves N rows in one commit, so
  // the guard is evaluated once per request against the shared kind — the
  // per-row ids travel in the payload.
  const guard = await beginAttachmentsMutationGuard({
    container,
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    userId: auth.sub,
    req,
    resourceKind: 'attachments.attachment',
    resourceId: fromRecordId ?? toRecordId,
    operation: 'update',
    mutationPayload: { entityId, attachmentIds, fromRecordId: fromRecordId ?? null, toRecordId },
  })
  if (guard.blockedResponse) {
    return guard.blockedResponse
  }
  for (const record of records) {
    const previousRecordId = record.recordId
    record.recordId = toRecordId
    const metadata = readAttachmentMetadata(record.storageMetadata)
    const nextAssignments =
      metadata.assignments?.map((assignment) => {
        const matchesType = assignment.type === entityId
        const matchesRecord = fromRecordId
          ? assignment.id === fromRecordId
          : assignment.id === previousRecordId
        if (matchesType && matchesRecord) {
          return { ...assignment, id: toRecordId }
        }
        return assignment
      }) ?? []
    record.storageMetadata = mergeAttachmentMetadata(record.storageMetadata, { assignments: nextAssignments })
  }
  // R2a-custom — one entry per attachment moved. A transfer changes where a file
  // physically lives, so each moved record is a distinct fact worth recording
  // rather than a single "N files moved" line.
  await em.transactional(async () => {
    await em.persist(records).flush()
    for (const record of records) {
      await writeDirectWriteAuditLog({
        container,
        auth,
        organizationId: record.organizationId ?? null,
        action: 'updated',
        resourceKind: 'attachments.attachment',
        resourceId: String(record.id),
        snapshotAfter: { partitionCode: record.partitionCode, storagePath: record.storagePath },
      })
    }
  })
  await guard.runAfterSuccess()
  return NextResponse.json({ ok: true, updated: records.length })
}

export const openApi: OpenApiRouteDoc = {
  tag: attachmentsTag,
  summary: 'Transfer attachments between records',
  methods: {
    POST: {
      summary: 'Transfer attachments to different record',
      description: 'Transfers one or more attachments from one record to another within the same entity type. Updates attachment assignments and metadata to reflect the new record.',
      requestBody: {
        contentType: 'application/json',
        schema: transferAttachmentsRequestSchema,
      },
      responses: [
        { status: 200, description: 'Attachments transferred successfully', schema: transferAttachmentsResponseSchema },
      ],
      errors: [
        { status: 400, description: 'Invalid payload', schema: attachmentErrorSchema },
        { status: 401, description: 'Unauthorized', schema: attachmentErrorSchema },
        { status: 404, description: 'Attachments not found', schema: attachmentErrorSchema },
        { status: 500, description: 'Attachment model missing', schema: attachmentErrorSchema },
      ],
    },
  },
}
