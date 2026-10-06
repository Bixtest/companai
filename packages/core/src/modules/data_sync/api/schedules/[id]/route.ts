import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { readJsonSafe } from '@open-mercato/shared/lib/http/readJsonSafe'
import { readOptimisticLockExpected } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { updateSyncScheduleSchema } from '../../../data/validators'
import type { SyncScheduleService } from '../../../lib/sync-schedule-service'
import { serializeSchedule } from '../serialize'
import { beginDataSyncMutationGuard } from '../../mutation-guard'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { EntityManager } from '@mikro-orm/postgresql'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
  PUT: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
  DELETE: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
}

export const openApi = {
  tags: ['DataSync'],
  summary: 'Manage a sync schedule',
}

export async function GET(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawParams = (ctx.params && typeof (ctx.params as Promise<unknown>).then === 'function')
    ? await (ctx.params as Promise<{ id?: string }>)
    : (ctx.params as { id?: string } | undefined)

  const parsedParams = paramsSchema.safeParse(rawParams)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid schedule id' }, { status: 400 })
  }

  const container = await createRequestContainer()
  const scheduleService = container.resolve('dataSyncScheduleService') as SyncScheduleService
  const schedule = await scheduleService.getById(parsedParams.data.id, {
    organizationId: auth.orgId as string,
    tenantId: auth.tenantId,
  })

  if (!schedule) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  }

  return NextResponse.json(serializeSchedule(schedule))
}

export async function PUT(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawParams = (ctx.params && typeof (ctx.params as Promise<unknown>).then === 'function')
    ? await (ctx.params as Promise<{ id?: string }>)
    : (ctx.params as { id?: string } | undefined)

  const parsedParams = paramsSchema.safeParse(rawParams)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid schedule id' }, { status: 400 })
  }

  const payload = await readJsonSafe(req)
  const parsed = updateSyncScheduleSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 422 })
  }

  const container = await createRequestContainer()
  const scheduleService = container.resolve('dataSyncScheduleService') as SyncScheduleService
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }
  const current = await scheduleService.getById(parsedParams.data.id, scope)

  if (!current) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  }

  const guard = await beginDataSyncMutationGuard({
    container,
    auth,
    req,
    resourceKind: 'data_sync.schedule',
    resourceId: current.id,
    operation: 'update',
    mutationPayload: parsed.data,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  try {
    const em = container.resolve('em') as EntityManager
    const schedule = await em.transactional(async () => {
    const saved = await scheduleService.saveSchedule({
      id: current.id,
      integrationId: parsed.data.integrationId ?? current.integrationId,
      entityType: parsed.data.entityType ?? current.entityType,
      direction: parsed.data.direction ?? current.direction,
      scheduleType: parsed.data.scheduleType ?? current.scheduleType,
      scheduleValue: parsed.data.scheduleValue ?? current.scheduleValue,
      timezone: parsed.data.timezone ?? current.timezone,
      fullSync: parsed.data.fullSync ?? current.fullSync,
      isEnabled: parsed.data.isEnabled ?? current.isEnabled,
      expectedUpdatedAt: readOptimisticLockExpected(req),
    }, scope, container)
      // R2a-custom — audited inside the transaction that saved it.
      await writeDirectWriteAuditLog({
        container,
        auth,
        organizationId: scope.organizationId,
        action: 'updated',
        resourceKind: 'data_sync.schedule',
        resourceId: String(saved.id),
        snapshotAfter: {
          scheduleType: saved.scheduleType,
          scheduleValue: saved.scheduleValue,
          direction: saved.direction,
        },
      })
      return saved
    })

    await guard.runAfterSuccess()
    return NextResponse.json(serializeSchedule(schedule))
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Failed to update sync schedule'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}

export async function DELETE(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawParams = (ctx.params && typeof (ctx.params as Promise<unknown>).then === 'function')
    ? await (ctx.params as Promise<{ id?: string }>)
    : (ctx.params as { id?: string } | undefined)

  const parsedParams = paramsSchema.safeParse(rawParams)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid schedule id' }, { status: 400 })
  }

  const container = await createRequestContainer()
  const scheduleService = container.resolve('dataSyncScheduleService') as SyncScheduleService
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }

  const guard = await beginDataSyncMutationGuard({
    container,
    auth,
    req,
    resourceKind: 'data_sync.schedule',
    resourceId: parsedParams.data.id,
    operation: 'delete',
    mutationPayload: null,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  try {
    const em = container.resolve('em') as EntityManager
    const deleted = await em.transactional(async () => {
      const removed = await scheduleService.deleteSchedule(
        parsedParams.data.id,
        scope,
        container,
        readOptimisticLockExpected(req),
      )
      if (removed) {
        await writeDirectWriteAuditLog({
          container,
          auth,
          organizationId: scope.organizationId,
          action: 'deleted',
          resourceKind: 'data_sync.schedule',
          resourceId: String(parsedParams.data.id),
        })
      }
      return removed
    })

    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    await guard.runAfterSuccess()

    return NextResponse.json({ deleted: true })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Failed to delete sync schedule'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
