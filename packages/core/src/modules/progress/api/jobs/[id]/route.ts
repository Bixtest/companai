import { NextResponse } from 'next/server'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import { ProgressJob } from '../../../data/entities'
import { updateProgressSchema } from '../../../data/validators'
import type { ProgressService } from '../../../lib/progressService'
import { beginProgressMutationGuard } from '../../mutation-guard'

const routeMetadata = {
  GET: { requireAuth: true, requireFeatures: ['progress.view'] },
  PUT: { requireAuth: true, requireFeatures: ['progress.update'] },
  DELETE: { requireAuth: true, requireFeatures: ['progress.cancel'] },
}

export const metadata = routeMetadata

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager

  const job = await em.findOne(ProgressJob, {
    id: params.id,
    tenantId: auth.tenantId,
    ...(auth.orgId ? { organizationId: auth.orgId } : {}),
  })

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: job.id,
    jobType: job.jobType,
    name: job.name,
    description: job.description,
    status: job.status,
    progressPercent: job.progressPercent,
    processedCount: job.processedCount,
    totalCount: job.totalCount,
    etaSeconds: job.etaSeconds,
    cancellable: job.cancellable,
    meta: job.meta,
    resultSummary: job.resultSummary,
    errorMessage: job.errorMessage,
    startedByUserId: job.startedByUserId,
    startedAt: job.startedAt?.toISOString() ?? null,
    heartbeatAt: job.heartbeatAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    parentJobId: job.parentJobId,
    partitionIndex: job.partitionIndex,
    partitionCount: job.partitionCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    tenantId: job.tenantId,
    organizationId: job.organizationId,
  })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = updateProgressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager
  const existing = await em.findOne(ProgressJob, {
    id: params.id,
    tenantId: auth.tenantId,
    ...(auth.orgId ? { organizationId: auth.orgId } : {}),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const progressService = container.resolve('progressService') as ProgressService

  // Registry mutation-guard chokepoint (D2-gap). Placed AFTER the route's own
  // auth, schema and existence gates and BEFORE the write (`updateProgress`).
  const guard = await beginProgressMutationGuard({
    container,
    req,
    tenantId: auth.tenantId,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    resourceKind: 'progress.job',
    resourceId: params.id,
    operation: 'update',
    mutationPayload: {
      progressPercent: parsed.data.progressPercent ?? null,
      processedCount: parsed.data.processedCount ?? null,
    },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const job = await progressService.updateProgress(params.id, parsed.data, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
    userId: auth.sub,
  })

  await guard.runAfterSuccess()
  return NextResponse.json({ ok: true, progressPercent: job.progressPercent })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const container = await createRequestContainer()
  const progressService = container.resolve('progressService') as ProgressService

  // Registry mutation-guard chokepoint (D2-gap). Placed AFTER the route's own
  // auth gate and BEFORE the write (`cancelJob`). Note this verb has no
  // pre-existence check — the service itself decides whether the job may be
  // cancelled — so the guard runs before that decision, as a pre-write
  // chokepoint keyed on the id from the path.
  const guard = await beginProgressMutationGuard({
    container,
    req,
    tenantId: auth.tenantId,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    resourceKind: 'progress.job',
    resourceId: params.id,
    operation: 'delete',
    mutationPayload: { action: 'cancel' },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  try {
    await progressService.cancelJob(params.id, {
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      userId: auth.sub,
    })
    await guard.runAfterSuccess()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Cannot cancel this job' }, { status: 400 })
  }
}

export const openApi = {
  GET: {
    summary: 'Get progress job details',
    description: 'Returns full details of a specific progress job by ID.',
    tags: ['Progress'],
    responses: {
      200: { description: 'Progress job details' },
      404: { description: 'Job not found' },
    },
  },
  PUT: {
    summary: 'Update progress job',
    description: 'Updates progress metrics and heartbeat for a running job.',
    tags: ['Progress'],
    responses: {
      200: { description: 'Progress updated' },
      400: { description: 'Invalid input' },
      404: { description: 'Job not found' },
    },
  },
  DELETE: {
    summary: 'Cancel progress job',
    description: 'Requests cancellation of a running or pending job.',
    tags: ['Progress'],
    responses: {
      200: { description: 'Cancellation requested' },
      400: { description: 'Cannot cancel this job' },
    },
  },
}
