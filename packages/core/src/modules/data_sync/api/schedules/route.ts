import { NextResponse } from 'next/server'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { readJsonSafe } from '@open-mercato/shared/lib/http/readJsonSafe'
import { createSyncScheduleSchema, listSyncSchedulesQuerySchema } from '../../data/validators'
import type { SyncScheduleService } from '../../lib/sync-schedule-service'
import { serializeSchedule } from './serialize'
import { readOptimisticLockExpected } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { beginDataSyncMutationGuard } from '../mutation-guard'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { EntityManager } from '@mikro-orm/postgresql'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
  POST: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
}

export const openApi = {
  tags: ['DataSync'],
  summary: 'List or create sync schedules',
}

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = listSyncSchedulesQuerySchema.safeParse({
    integrationId: url.searchParams.get('integrationId') ?? undefined,
    entityType: url.searchParams.get('entityType') ?? undefined,
    direction: url.searchParams.get('direction') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    pageSize: url.searchParams.get('pageSize') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const container = await createRequestContainer()
  const scheduleService = container.resolve('dataSyncScheduleService') as SyncScheduleService
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }
  const { items, total } = await scheduleService.listSchedules(parsed.data, scope)

  return NextResponse.json({
    items: items.map(serializeSchedule),
    total,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    totalPages: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
  })
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await readJsonSafe(req)
  const parsed = createSyncScheduleSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 422 })
  }

  const container = await createRequestContainer()
  const scheduleService = container.resolve('dataSyncScheduleService') as SyncScheduleService
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }

  const guard = await beginDataSyncMutationGuard({
    container,
    auth,
    req,
    resourceKind: 'data_sync.schedule',
    resourceId: scope.organizationId,
    operation: 'create',
    mutationPayload: parsed.data,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  try {
    // R2a-custom — a schedule decides when data is pulled from or pushed to an
    // external system unattended. Audited in the same transaction as the save.
    const em = container.resolve('em') as EntityManager
    const schedule = await em.transactional(async () => {
      const saved = await scheduleService.saveSchedule({
        ...parsed.data,
        expectedUpdatedAt: readOptimisticLockExpected(req),
      }, scope, container)
      await writeDirectWriteAuditLog({
        container,
        auth,
        organizationId: scope.organizationId,
        action: 'created',
        resourceKind: 'data_sync.schedule',
        resourceId: String(saved.id),
        snapshotAfter: {
          integrationId: saved.integrationId,
          entityType: saved.entityType,
          direction: saved.direction,
          scheduleType: saved.scheduleType,
          scheduleValue: saved.scheduleValue,
        },
      })
      return saved
    })

    await guard.runAfterSuccess()

    return NextResponse.json(serializeSchedule(schedule), { status: 201 })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Failed to save sync schedule'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
