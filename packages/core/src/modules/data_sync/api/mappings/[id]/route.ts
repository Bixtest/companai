import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { SyncMapping } from '@open-mercato/core/modules/data_sync/data/entities'
import { beginDataSyncMutationGuard } from '../../mutation-guard'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'

const idParamsSchema = z.object({ id: z.string().uuid() })

const updateMappingSchema = z.object({
  mapping: z.record(z.string(), z.unknown()),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
  PUT: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
  DELETE: { requireAuth: true, requireFeatures: ['data_sync.configure'] },
}

export const openApi = {
  tags: ['DataSync'],
  summary: 'Get, update, or delete a field mapping',
}

async function resolveParams(ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const rawParams = (ctx.params && typeof (ctx.params as Promise<unknown>).then === 'function')
    ? await (ctx.params as Promise<{ id?: string }>)
    : (ctx.params as { id?: string } | undefined)
  return idParamsSchema.safeParse(rawParams)
}

export async function GET(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsedParams = await resolveParams(ctx)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid mapping id' }, { status: 400 })
  }

  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }

  const mapping = await findOneWithDecryption(
    em,
    SyncMapping,
    {
      id: parsedParams.data.id,
      organizationId: auth.orgId as string,
      tenantId: auth.tenantId,
    },
    undefined,
    scope,
  )

  if (!mapping) {
    return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: mapping.id,
    integrationId: mapping.integrationId,
    entityType: mapping.entityType,
    mapping: mapping.mapping,
    createdAt: mapping.createdAt.toISOString(),
    updatedAt: mapping.updatedAt.toISOString(),
  })
}

export async function PUT(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsedParams = await resolveParams(ctx)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid mapping id' }, { status: 400 })
  }

  const payload = await req.json().catch(() => null)
  const parsedBody = updateMappingSchema.safeParse(payload)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsedBody.error.flatten() }, { status: 422 })
  }

  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }

  const mapping = await findOneWithDecryption(
    em,
    SyncMapping,
    {
      id: parsedParams.data.id,
      organizationId: auth.orgId as string,
      tenantId: auth.tenantId,
    },
    undefined,
    scope,
  )

  if (!mapping) {
    return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
  }

  const guard = await beginDataSyncMutationGuard({
    container,
    auth,
    req,
    resourceKind: 'data_sync.mapping',
    resourceId: mapping.id,
    operation: 'update',
    mutationPayload: parsedBody.data,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  mapping.mapping = parsedBody.data.mapping
  await em.transactional(async () => {
    await em.flush()
    await writeDirectWriteAuditLog({
      container,
      auth,
      organizationId: scope.organizationId,
      action: 'updated',
      resourceKind: 'data_sync.mapping',
      resourceId: String(mapping.id),
    })
  })

  await guard.runAfterSuccess()

  return NextResponse.json({
    id: mapping.id,
    integrationId: mapping.integrationId,
    entityType: mapping.entityType,
    mapping: mapping.mapping,
    updatedAt: mapping.updatedAt.toISOString(),
  })
}

export async function DELETE(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsedParams = await resolveParams(ctx)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid mapping id' }, { status: 400 })
  }

  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager
  const scope = { organizationId: auth.orgId as string, tenantId: auth.tenantId }

  const mapping = await findOneWithDecryption(
    em,
    SyncMapping,
    {
      id: parsedParams.data.id,
      organizationId: auth.orgId as string,
      tenantId: auth.tenantId,
    },
    undefined,
    scope,
  )

  if (!mapping) {
    return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
  }

  const guard = await beginDataSyncMutationGuard({
    container,
    auth,
    req,
    resourceKind: 'data_sync.mapping',
    resourceId: mapping.id,
    operation: 'delete',
    mutationPayload: null,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const mappingId = mapping.id
  // The before-image is the whole mapping: once removed there is nothing left to
  // show how external fields used to be routed.
  const removedMapping = mapping.mapping as unknown as Record<string, unknown>
  await em.transactional(async () => {
    em.remove(mapping)
    await em.flush()
    await writeDirectWriteAuditLog({
      container,
      auth,
      organizationId: scope.organizationId,
      action: 'deleted',
      resourceKind: 'data_sync.mapping',
      resourceId: String(mappingId),
      snapshotBefore: { mapping: removedMapping },
    })
  })

  await guard.runAfterSuccess()

  return NextResponse.json({ deleted: true })
}
