import { resolveRecordScope } from '@open-mercato/shared/lib/query/engine'
import type { Queue } from '@open-mercato/queue'
import type { FulltextIndexJobPayload } from '../../../queue/fulltext-indexing'
import { resolveAutoIndexingEnabled } from '../lib/auto-indexing'
import { searchDebugWarn, searchError } from '../../../lib/debug'

export const metadata = { event: 'search.index_record', persistent: false }

type Payload = {
  entityId?: string
  recordId?: string
  organizationId?: string | null
  tenantId?: string | null
}

type HandlerContext = { resolve: <T = unknown>(name: string) => T }

export default async function handle(payload: Payload, ctx: HandlerContext) {
  const entityType = String(payload?.entityId ?? '')
  const recordId = String(payload?.recordId ?? '')

  if (!entityType || !recordId) {
    return
  }

  let organizationId = payload?.organizationId ?? null
  let tenantId = payload?.tenantId ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let em: any | null = null
  try {
    em = ctx.resolve('em')
  } catch {
    em = null
  }

  // Resolve missing scope from DB if needed — via the shared resolver, which checks
  // the table has the columns first. A blind select on a global table aborts the
  // surrounding transaction even though the error is caught (defect B-18).
  if ((organizationId == null || tenantId == null) && em) {
    const scope = await resolveRecordScope(em, entityType, recordId)
    if (organizationId == null) organizationId = scope.organizationId ?? organizationId
    if (tenantId == null) tenantId = scope.tenantId ?? tenantId
  }

  if (!tenantId) {
    return
  }

  const autoIndexingEnabled = await resolveAutoIndexingEnabled(ctx, { defaultValue: true })
  if (!autoIndexingEnabled) {
    return
  }

  let queue: Queue<FulltextIndexJobPayload>
  try {
    queue = ctx.resolve<Queue<FulltextIndexJobPayload>>('fulltextIndexQueue')
  } catch {
    searchDebugWarn('search.fulltext', 'fulltextIndexQueue not available, skipping fulltext indexing')
    return
  }

  try {
    await queue.enqueue({
      jobType: 'index',
      entityType,
      recordId,
      tenantId: String(tenantId),
      organizationId: organizationId ? String(organizationId) : null,
    })
  } catch (error) {
    searchError('search.fulltext', 'Failed to enqueue fulltext index job', {
      entityType,
      recordId,
      error: error instanceof Error ? error.message : error,
    })
    throw error
  }
}
