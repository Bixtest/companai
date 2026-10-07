import { NextResponse } from 'next/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import type { Queue } from '@open-mercato/queue'

import type { EntityManager } from '@mikro-orm/postgresql'
import type { Kysely } from 'kysely'
import type { ProgressService } from '@open-mercato/core/modules/progress/lib/progressService'
import { clearReindexLock } from '../../../../lib/reindex-lock'
import { cancelReindexProgress } from '../../../../lib/reindex-progress'
import { resolveTranslations } from '@open-mercato/shared/lib/i18n/server'
import { recordIndexerLog } from '@open-mercato/shared/lib/indexers/status-log'
import { embeddingsReindexCancelOpenApi } from '../../../openapi'
import { beginSearchMutationGuard } from '../../../mutation-guard'

async function disposeContainer(container: unknown): Promise<void> {
  try {
    const disposable = container as { dispose?: () => Promise<void> }
    if (typeof disposable.dispose === 'function') {
      await disposable.dispose()
    }
  } catch {
    // Ignore disposal errors
  }
}

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['search.embeddings.manage'] },
}

export async function POST(req: Request) {
  const { t } = await resolveTranslations()
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) {
    return NextResponse.json({ error: t('api.errors.unauthorized', 'Unauthorized') }, { status: 401 })
  }

  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager
  const progressService = container.resolve('progressService') as ProgressService
  const db = (em as unknown as { getKysely: () => Kysely<any> }).getKysely()

  // Registry mutation-guard chokepoint (D2-gap). Runs after the route's own auth
  // and scope gates and before any write; a block stops the cancel outright.
  const guard = await beginSearchMutationGuard({
    container,
    req,
    tenantId: auth.tenantId,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    resourceKind: 'search.index',
    resourceId: auth.orgId ? `${auth.tenantId}:${auth.orgId}` : auth.tenantId,
    operation: 'custom',
    mutationPayload: { action: 'reindex.cancel', scope: 'vector' },
  })
  if (guard.blockedResponse) {
    await disposeContainer(container)
    return guard.blockedResponse
  }

  let queue: Queue | undefined
  try {
    queue = container.resolve<Queue>('vectorIndexQueue')
  } catch {
    // Queue not available - just clear the lock
  }

  let jobsRemoved = 0
  if (queue) {
    if (typeof queue.removeQueuedJobsByScope !== 'function') {
      await disposeContainer(container)
      return NextResponse.json({
        error: t('search.api.errors.scopedQueueCancelUnavailable', 'Scoped queue cancellation is not available.'),
      }, { status: 503 })
    }

    try {
      const scope = typeof auth.orgId === 'string'
        ? { tenantId: auth.tenantId, organizationId: auth.orgId, jobTypes: ['batch-index'] }
        : { tenantId: auth.tenantId, jobTypes: ['batch-index'] }
      const result = await queue.removeQueuedJobsByScope(scope)
      jobsRemoved = result.removed
    } catch {
      await disposeContainer(container)
      return NextResponse.json({
        error: t('search.api.errors.scopedQueueCancelFailed', 'Failed to cancel queued reindex jobs.'),
      }, { status: 503 })
    }
  }

  await clearReindexLock(db, auth.tenantId, 'vector', auth.orgId ?? null)
  await cancelReindexProgress({
    em,
    progressService,
    type: 'vector',
    tenantId: auth.tenantId,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
  })

  // Log the cancellation
  try {
    const em = container.resolve('em')
    await recordIndexerLog(
      { em },
      {
        source: 'vector',
        handler: 'api:search.embeddings.reindex.cancel',
        message: `Cancelled vector reindex operation (${jobsRemoved} jobs removed)`,
        tenantId: auth.tenantId,
        organizationId: auth.orgId ?? null,
        details: { jobsRemoved },
      },
    )
  } catch {
    // Logging failure should not fail the cancel operation
  }

  await disposeContainer(container)

  await guard.runAfterSuccess()

  return NextResponse.json({
    ok: true,
    jobsRemoved,
  })
}

export const openApi = embeddingsReindexCancelOpenApi
