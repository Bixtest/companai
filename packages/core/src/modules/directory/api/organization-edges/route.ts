import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer, type AppContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { enforceCommandOptimisticLockWithGuards } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { Organization, OrganizationEdge } from '@open-mercato/core/modules/directory/data/entities'
import {
  organizationEdgeCreateSchema,
  organizationEdgeUpdateSchema,
} from '@open-mercato/core/modules/directory/data/validators'
import { beginDirectoryMutationGuard } from '../mutation-guard'

/**
 * Managing the authority edges between organizations (R6).
 *
 * R6 shipped the mechanism and seeded it permissively, which left the feature
 * real but unreachable: no ceiling could be lowered without a psql prompt. This
 * is the surface that makes it a thing a person can do.
 *
 * **Guarded by `directory.organizations.manage`** rather than a feature of its
 * own. Editing an edge changes what everyone below it may do, which is the same
 * risk class the descriptor already assigns to organization management (E5, not
 * delegable) — and a second permission over the same act would be a second place
 * to get it wrong.
 */

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['directory.organizations.view'] },
  POST: { requireAuth: true, requireFeatures: ['directory.organizations.manage'] },
  PATCH: { requireAuth: true, requireFeatures: ['directory.organizations.manage'] },
  DELETE: { requireAuth: true, requireFeatures: ['directory.organizations.manage'] },
}

const logger = createLogger('directory').child({ component: 'organization-edges' })

const RESOURCE_KIND = 'directory.organization_edge'

type Scope = { tenantId: string; em: EntityManager; container: Awaited<ReturnType<typeof createRequestContainer>>; auth: NonNullable<Awaited<ReturnType<typeof getAuthFromRequest>>> }

async function resolveScope(req: Request): Promise<Scope | NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const container = await createRequestContainer()
  return { tenantId: auth.tenantId, em: container.resolve('em') as EntityManager, container, auth }
}

function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}

function serialize(edge: OrganizationEdge) {
  return {
    id: edge.id,
    parentId: edge.parentId,
    childId: edge.childId,
    relationshipType: edge.relationshipType,
    inheritanceMode: edge.inheritanceMode,
    authorityCeiling: edge.authorityCeiling,
    moduleGrants: edge.moduleGrants,
    note: edge.note,
    updatedAt: edge.updatedAt instanceof Date ? edge.updatedAt.toISOString() : null,
  }
}

/**
 * Both organizations must exist in the caller's own tenant.
 *
 * The check is the tenant boundary for this table: an edge is only ever read
 * through a tenant-scoped query, so a cross-tenant edge would be invisible
 * rather than dangerous — but it would also be silently useless, and a write
 * that silently does nothing is worse than one that fails.
 */
async function assertOrganizationsInTenant(
  em: EntityManager,
  tenantId: string,
  ids: string[],
): Promise<NextResponse | null> {
  const found = await em.find(Organization, { id: { $in: ids }, tenant: tenantId, deletedAt: null }, { fields: ['id'] })
  const missing = ids.filter((id) => !found.some((org) => org.id === id))
  if (missing.length === 0) return null
  return NextResponse.json(
    { error: `Organization not found in this tenant: ${missing.join(', ')}` },
    { status: 404 },
  )
}

export async function GET(req: Request) {
  const scope = await resolveScope(req)
  if (isResponse(scope)) return scope

  const url = new URL(req.url)
  const organizationId = url.searchParams.get('organizationId')

  const where: Record<string, unknown> = { tenantId: scope.tenantId, deletedAt: null }
  const edges = organizationId
    ? await scope.em.find(OrganizationEdge, {
        ...where,
        $or: [{ parentId: organizationId }, { childId: organizationId }],
      })
    : await scope.em.find(OrganizationEdge, where)

  return NextResponse.json({ items: edges.map(serialize) })
}

export async function POST(req: Request) {
  const scope = await resolveScope(req)
  if (isResponse(scope)) return scope

  const body = await req.json().catch(() => null)
  const parsed = organizationEdgeCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid edge', details: parsed.error.flatten() }, { status: 422 })
  }
  if (parsed.data.parentId === parsed.data.childId) {
    return NextResponse.json({ error: 'An organization cannot have an edge to itself' }, { status: 422 })
  }

  const missing = await assertOrganizationsInTenant(scope.em, scope.tenantId, [parsed.data.parentId, parsed.data.childId])
  if (missing) return missing

  // An edge pointing back up the tree would invert it. The tree is what scopes
  // every query in the platform, and an edge that contradicts it would make
  // "what is above this organization" have two answers.
  const parent = await scope.em.findOne(Organization, { id: parsed.data.parentId, tenant: scope.tenantId })
  const ancestorIds = (parent?.ancestorIds ?? []) as string[]
  if (ancestorIds.includes(parsed.data.childId)) {
    return NextResponse.json(
      { error: 'That edge would point back up the organization tree' },
      { status: 422 },
    )
  }

  // Registry mutation-guard chokepoint (D2-gap). Placed AFTER the route's own
  // auth gate, schema validation, tenant-boundary check and tree-inversion
  // check (all of which return without writing), and BEFORE the first write
  // (`trx.persist`). A block stops the whole operation.
  const guard = await beginDirectoryMutationGuard({
    container: scope.container,
    req,
    tenantId: scope.tenantId,
    organizationId: parsed.data.childId,
    userId: scope.auth.sub ?? null,
    resourceKind: RESOURCE_KIND,
    resourceId: 'new',
    operation: 'create',
    mutationPayload: {
      parentId: parsed.data.parentId,
      childId: parsed.data.childId,
      authorityCeiling: parsed.data.authorityCeiling,
    },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const created = await scope.em.transactional(async (trx) => {
    const edge = trx.create(OrganizationEdge, {
      tenantId: scope.tenantId,
      parentId: parsed.data.parentId,
      childId: parsed.data.childId,
      relationshipType: parsed.data.relationshipType,
      inheritanceMode: parsed.data.inheritanceMode,
      authorityCeiling: parsed.data.authorityCeiling,
      moduleGrants: parsed.data.moduleGrants ?? null,
      note: parsed.data.note ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await trx.persist(edge).flush()

    await writeDirectWriteAuditLog({
      container: scope.container,
      auth: scope.auth,
      organizationId: parsed.data.childId,
      action: 'created',
      resourceKind: RESOURCE_KIND,
      resourceId: edge.id,
      snapshotAfter: serialize(edge) as unknown as Record<string, unknown>,
    })

    return edge
  })

  await guard.runAfterSuccess()
  await invalidateAuthorityGraph(scope)
  return NextResponse.json({ edge: serialize(created) }, { status: 201 })
}

export async function PATCH(req: Request) {
  const scope = await resolveScope(req)
  if (isResponse(scope)) return scope

  const body = await req.json().catch(() => null)
  const parsed = organizationEdgeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid edge', details: parsed.error.flatten() }, { status: 422 })
  }

  // Refuse a stale overwrite. This is authority configuration: two people
  // editing the same ceiling from two tabs must not silently produce whichever
  // save landed last, because the loser's intent disappears without a trace.
  const existing = await scope.em.findOne(OrganizationEdge, {
    id: parsed.data.id,
    tenantId: scope.tenantId,
    deletedAt: null,
  })
  if (!existing) return NextResponse.json({ error: 'Edge not found' }, { status: 404 })
  try {
    await enforceCommandOptimisticLockWithGuards(scope.container, {
      resourceKind: RESOURCE_KIND,
      resourceId: existing.id,
      current: existing.updatedAt ?? null,
      request: req,
    })
  } catch (err) {
    if (isCrudHttpError(err)) return NextResponse.json(err.body, { status: err.status })
    throw err
  }

  // Registry mutation-guard chokepoint (D2-gap). Placed AFTER the route's own
  // gates (schema, existence, optimistic lock) and BEFORE the write
  // (`trx.flush`). `existing.id` is the id being written, so it is the subject.
  const guard = await beginDirectoryMutationGuard({
    container: scope.container,
    req,
    tenantId: scope.tenantId,
    organizationId: existing.childId,
    userId: scope.auth.sub ?? null,
    resourceKind: RESOURCE_KIND,
    resourceId: existing.id,
    operation: 'update',
    mutationPayload: {
      authorityCeiling: parsed.data.authorityCeiling ?? null,
      inheritanceMode: parsed.data.inheritanceMode ?? null,
      relationshipType: parsed.data.relationshipType ?? null,
    },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const updated = await scope.em.transactional(async (trx) => {
    const edge = await trx.findOne(OrganizationEdge, { id: parsed.data.id, tenantId: scope.tenantId, deletedAt: null })
    if (!edge) return null

    const before = serialize(edge)
    if (parsed.data.relationshipType !== undefined) edge.relationshipType = parsed.data.relationshipType
    if (parsed.data.inheritanceMode !== undefined) edge.inheritanceMode = parsed.data.inheritanceMode
    if (parsed.data.authorityCeiling !== undefined) edge.authorityCeiling = parsed.data.authorityCeiling
    if (parsed.data.moduleGrants !== undefined) edge.moduleGrants = parsed.data.moduleGrants
    if (parsed.data.note !== undefined) edge.note = parsed.data.note
    await trx.flush()

    await writeDirectWriteAuditLog({
      container: scope.container,
      auth: scope.auth,
      organizationId: edge.childId,
      action: 'updated',
      resourceKind: RESOURCE_KIND,
      resourceId: edge.id,
      snapshotBefore: before as unknown as Record<string, unknown>,
      snapshotAfter: serialize(edge) as unknown as Record<string, unknown>,
    })

    return edge
  })

  if (!updated) return NextResponse.json({ error: 'Edge not found' }, { status: 404 })
  await guard.runAfterSuccess()
  await invalidateAuthorityGraph(scope)
  return NextResponse.json({ edge: serialize(updated) })
}

export async function DELETE(req: Request) {
  const scope = await resolveScope(req)
  if (isResponse(scope)) return scope

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Registry mutation-guard chokepoint (D2-gap). Placed AFTER the route's own
  // gates (auth, id presence) and BEFORE the write (the soft-delete in the
  // transaction). Note the guard runs even when the edge turns out not to
  // exist: deciding "does this row exist?" inside the route is a read, and the
  // guard is a pre-write chokepoint. A guard registered against
  // `directory.organization_edge` sees the delete intent either way.
  const guard = await beginDirectoryMutationGuard({
    container: scope.container,
    req,
    tenantId: scope.tenantId,
    organizationId: null,
    userId: scope.auth.sub ?? null,
    resourceKind: RESOURCE_KIND,
    resourceId: id,
    operation: 'delete',
    mutationPayload: { id },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const removed = await scope.em.transactional(async (trx) => {
    const edge = await trx.findOne(OrganizationEdge, { id, tenantId: scope.tenantId, deletedAt: null })
    if (!edge) return null

    const before = serialize(edge)
    // Soft delete: an authority change is worth being able to look back at, and
    // the resolver already filters on `deleted_at`.
    edge.deletedAt = new Date()
    await trx.flush()

    await writeDirectWriteAuditLog({
      container: scope.container,
      auth: scope.auth,
      organizationId: edge.childId,
      action: 'deleted',
      resourceKind: RESOURCE_KIND,
      resourceId: edge.id,
      snapshotBefore: before as unknown as Record<string, unknown>,
    })

    return edge
  })

  if (!removed) return NextResponse.json({ error: 'Edge not found' }, { status: 404 })
  await guard.runAfterSuccess()
  await invalidateAuthorityGraph(scope)
  return NextResponse.json({ ok: true })
}

/**
 * Drops the tenant's cached authority ceilings after an edge changes.
 *
 * **After the transaction commits, never inside it.** A cache cleared inside a
 * transaction that then rolls back leaves the next reader to repopulate it from
 * the old rows — the invalidation succeeds and achieves nothing.
 *
 * Failure here is logged and swallowed. A stale ceiling is bounded by the TTL;
 * a 500 on a write that already committed is not recoverable by anyone.
 */
async function invalidateAuthorityGraph(scope: { container: AppContainer; tenantId: string }): Promise<void> {
  try {
    const graph = scope.container.resolve('authorityGraphService') as {
      invalidateTenant: (tenantId: string) => Promise<void>
    }
    await graph.invalidateTenant(scope.tenantId)
  } catch (error) {
    logger.warn('Could not drop cached authority ceilings after an edge change', {
      tenantId: scope.tenantId,
      err: error,
    })
  }
}

const edgeSchema = z.object({
  id: z.string(),
  parentId: z.string(),
  childId: z.string(),
  relationshipType: z.string(),
  inheritanceMode: z.string(),
  authorityCeiling: z.string(),
  moduleGrants: z.array(z.string()).nullable(),
  note: z.string().nullable(),
  updatedAt: z.string().nullable(),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'Directory',
  summary: 'Organization authority edges',
  methods: {
    GET: {
      summary: 'List authority edges',
      description:
        'Typed edges between organizations, carrying how much authority may flow down them. ' +
        'Only edges that lie on the organization tree path currently affect a decision; other ' +
        'typed edges are recorded for future use.',
      responses: [{ status: 200, description: 'Edges', schema: z.object({ items: z.array(edgeSchema) }) }],
    },
    POST: {
      summary: 'Create an authority edge',
      responses: [
        { status: 201, description: 'Created' },
        { status: 404, description: 'An organization is not in this tenant' },
        { status: 422, description: 'Self-edge, inverted edge, or invalid values' },
      ],
    },
    PATCH: {
      summary: 'Update an authority edge',
      responses: [
        { status: 200, description: 'Updated' },
        { status: 404, description: 'Edge not found' },
      ],
    },
    DELETE: {
      summary: 'Remove an authority edge',
      responses: [
        { status: 200, description: 'Removed' },
        { status: 404, description: 'Edge not found' },
      ],
    },
  },
}
