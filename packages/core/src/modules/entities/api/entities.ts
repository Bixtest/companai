import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { CustomEntity, CustomFieldDef } from '@open-mercato/core/modules/entities/data/entities'
import { getEntityIds } from '@open-mercato/shared/lib/encryption/entityIds'
import { upsertCustomEntitySchema } from '@open-mercato/core/modules/entities/data/validators'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { isSystemEntitySelectable } from '@open-mercato/shared/lib/entities/system-entities'
import { SYSTEM_ENTITY_RECORDS_BLOCKED_CODE, isOrmBackedSystemEntityId } from '@open-mercato/shared/lib/data/engine'
import { enforceCommandOptimisticLockWithGuards } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import {
  beginEntitiesMutationGuard,
  ENTITY_DEFINITION_RESOURCE_KIND,
} from './definitions.mutation-guard'
import {
  evaluateStructureChange,
  DEFAULT_GRANT_ROLE,
  type StructureChangeGateOutcome,
} from '@open-mercato/shared/lib/permissions/structure-change-gate'
import {
  readStructureDecisionFromHeaders,
  toStructurePermissionDecision,
} from '@open-mercato/shared/lib/permissions/structure-change-decision-header'
import { assertActorMayStateDecision } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { entityDefinitionSurface } from '../data/guards'
import { isActiveEntity } from '../lib/register'
import { writeFieldPermissionGrant } from '../lib/field-definitions'

const CUSTOM_ENTITY_DEFINITION_RESOURCE_KIND = ENTITY_DEFINITION_RESOURCE_KIND

export const metadata = {
  GET: { requireAuth: true },
  POST: { requireAuth: true, requireFeatures: ['entities.definitions.manage'] },
  DELETE: { requireAuth: true, requireFeatures: ['entities.definitions.manage'] },
}

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId || (!auth.orgId && !auth.isSuperAdmin)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resolve } = await createRequestContainer()
  const em = resolve('em') as any

  // Generated entities from code
  const AllEntities = getEntityIds()
  const generated: { entityId: string; source: 'code'; label: string }[] = []
  for (const modId of Object.keys(AllEntities)) {
    const entities = (AllEntities as any)[modId] as Record<string, string>
    for (const k of Object.keys(entities)) {
      const id = entities[k]
      if (!isSystemEntitySelectable(id)) continue
      generated.push({ entityId: id, source: 'code', label: id })
    }
  }

  // Custom user-defined entities (global/org/tenant scoped)
  const where: any = { isActive: true }
  where.$and = [
    { $or: [ { organizationId: auth.orgId ?? undefined as any }, { organizationId: null } ] },
    { $or: [ { tenantId: auth.tenantId ?? undefined as any }, { tenantId: null } ] },
  ]
  const customs = await em.find(CustomEntity as any, where as any, { orderBy: { entityId: 'asc' } as any })
  // Resolve overlay precedence: prefer organization/tenant-specific over global
  const customByEntityId = new Map<string, any>()
  for (const c of customs as any[]) {
    const specificity = (c.organizationId ? 2 : 0) + (c.tenantId ? 1 : 0)
    const prev = customByEntityId.get(c.entityId)
    const prevSpec = prev ? ((prev.organizationId ? 2 : 0) + (prev.tenantId ? 1 : 0)) : -1
    if (!prev || specificity > prevSpec) customByEntityId.set(c.entityId, c)
  }

  const custom = Array.from(customByEntityId.values())
    .filter((c) => isSystemEntitySelectable(c.entityId))
    .map((c) => ({
      entityId: c.entityId,
      source: 'custom' as const,
      label: c.label,
      description: c.description ?? undefined,
      labelField: (c as any).labelField ?? undefined,
      defaultEditor: (c as any).defaultEditor ?? undefined,
      showInSidebar: (c as any).showInSidebar ?? false,
      accessRestricted: (c as any).accessRestricted ?? false,
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : (c.updatedAt ?? undefined),
    }))

  const byId = new Map<string, any>()
  for (const g of generated) byId.set(g.entityId, g)
  for (const cu of custom) {
    const existing = byId.get(cu.entityId)
    byId.set(cu.entityId, { ...existing, ...cu, source: existing?.source ?? cu.source })
  }

  // Count field definitions scoped to current tenant/org (same scoping as custom entities)
  const defsWhere: any = { isActive: true }
  defsWhere.$and = [
    //{ $or: [ { organizationId: auth.orgId ?? undefined as any }, { organizationId: null } ] }, // the entities and custom fields are defined per tenant
    { tenantId: auth.tenantId ?? undefined as any },
  ]
  const defs = await em.find(CustomFieldDef as any, defsWhere as any)
  // Count distinct field names (keys) per entityId
  const keySets = new Map<string, Set<string>>()
  for (const d of defs as any[]) {
    const eid = String(d.entityId)
    const k = String(d.key)
    if (!isSystemEntitySelectable(eid)) continue
    const set = keySets.get(eid) || new Set<string>()
    set.add(k)
    keySets.set(eid, set)
  }
  const counts: Record<string, number> = {}
  for (const [eid, set] of keySets.entries()) counts[eid] = set.size

  const items = Array.from(byId.values()).map((it: any) => ({ ...it, count: counts[it.entityId] || 0 }))
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = upsertCustomEntitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data
  // Distinguish "caller did not send the field" (apply tenant default-restricted
  // policy on create) from "caller explicitly chose false".
  const accessRestrictedExplicit = body != null && typeof body === 'object'
    && Object.prototype.hasOwnProperty.call(body, 'accessRestricted')

  const container = await createRequestContainer()
  const { resolve } = container
  const em = resolve('em') as any

  // A registration for a module-declared, table-backed system entity would flip
  // query-engine classification to doc storage for the whole entity type (#2939's
  // failure mode via another door) — refuse to create one.
  if (isOrmBackedSystemEntityId(em, input.entityId)) {
    return NextResponse.json(
      { error: 'System entities cannot be registered as custom entities', code: SYSTEM_ENTITY_RECORDS_BLOCKED_CODE, entityId: input.entityId },
      { status: 400 },
    )
  }

  const where: any = { entityId: input.entityId, organizationId: auth.orgId ?? null, tenantId: auth.tenantId ?? null }
  let ent = await em.findOne(CustomEntity, where)
  if (ent) {
    try {
      await enforceCommandOptimisticLockWithGuards(container, {
        resourceKind: CUSTOM_ENTITY_DEFINITION_RESOURCE_KIND,
        resourceId: ent.id,
        current: ent.updatedAt ?? null,
        request: req,
      })
    } catch (lockError) {
      if (isCrudHttpError(lockError)) {
        return NextResponse.json(lockError.body, { status: lockError.status })
      }
      throw lockError
    }
  }

  // SD-1 (CC-24): a reactivation is a surface reappearing, exactly as a create is.
  // This route reaches the registry as `operation: ent ? 'update' : 'create'` (below),
  // and the only entity gate is `operations: ['create']` — so an entity that comes back
  // from an inactive tombstone was **never** gated. The field twin was closed in CC-22
  // (`definitions.ts` / `definitions.restore.ts`); this is the entity twin.
  //
  // The shape is CC-22's, deliberately: gate **at the route**, from the before-state
  // (`ent`, already loaded above), because the route is where the reactivation is known.
  // The before-state is in hand, so no new query and no change to the shared guard
  // contract is needed.
  const reactivatesEntity = !!ent && !isActiveEntity(ent) && (input.isActive ?? true)
  // SD-1 (CC-17): the same decision carrier every other request path uses. A malformed
  // decision is refused with 400 **before anything is touched**; a well-formed one
  // reaches the gate so the `decided` branch is reachable here too.
  const requestedDecision = readStructureDecisionFromHeaders(req.headers)
  if (requestedDecision.kind === 'malformed') {
    return NextResponse.json({ error: requestedDecision.because }, { status: 400 })
  }
  // SD-1 (CC-25): a decision is stated by an *authorised* actor. The header's
  // `decidedBy` / `grantTo` are checked against the authenticated user, not trusted.
  if (requestedDecision.kind === 'decision') {
    try {
      await assertActorMayStateDecision({
        em,
        rbacService: resolve('rbacService') as RbacService,
        actorUserId: auth.sub,
        tenantId: auth.tenantId,
        organizationId: auth.orgId,
        records: requestedDecision.decision.records,
        grantTo: requestedDecision.decision.grantTo ?? DEFAULT_GRANT_ROLE,
      })
    } catch (err) {
      if (isCrudHttpError(err)) {
        return NextResponse.json(err.body, { status: err.status })
      }
      throw err
    }
  }
  // The surface this call re-appears, named once and reused for both the gate and the
  // catalogue write below — so the surface the gate judged and the surface the catalogue
  // records cannot drift (`M3e`/`P3b`).
  const appearingSurfaces = reactivatesEntity ? [entityDefinitionSurface(input.entityId)] : []
  const entityPermissionDecision: StructureChangeGateOutcome | null = reactivatesEntity
    ? evaluateStructureChange({
        surfaces: appearingSurfaces,
        decision:
          requestedDecision.kind === 'decision' ? toStructurePermissionDecision(requestedDecision.decision) : null,
      })
    : null
  if (entityPermissionDecision?.outcome === 'refused') {
    return NextResponse.json(
      {
        error:
          `The entity cannot be re-activated: ${entityPermissionDecision.because} ` +
          'Every new data structure must answer the permissions question before it is applied (S2).',
      },
      { status: 422 },
    )
  }

  const guard = await beginEntitiesMutationGuard({
    container,
    auth,
    req,
    resourceKind: ENTITY_DEFINITION_RESOURCE_KIND,
    resourceId: ent ? ent.id : input.entityId,
    operation: ent ? 'update' : 'create',
    mutationPayload: input as unknown as Record<string, unknown>,
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const isCreate = !ent
  if (!ent) ent = em.create(CustomEntity, { ...where, createdAt: new Date() })
  ent.label = input.label
  ent.description = input.description ?? null
  ent.isActive = input.isActive ?? true
  ent.labelField = input.labelField ?? ent.labelField ?? null
  ent.defaultEditor = input.defaultEditor ?? ent.defaultEditor ?? null
  ent.showInSidebar = input.showInSidebar ?? ent.showInSidebar ?? false
  // Never silently flip a security control on a partial upsert. `access_restricted`
  // changes ONLY when the caller explicitly sends the field. On create without it,
  // fall back to the tenant default-restricted policy; on update without it, keep
  // the entity's current value (a metadata-only update must not un-restrict).
  if (accessRestrictedExplicit) {
    ent.accessRestricted = input.accessRestricted === true
  } else if (isCreate) {
    let policyDefault = false
    try {
      const moduleConfigService = resolve('moduleConfigService') as {
        getValue: (m: string, n: string, o?: { defaultValue?: unknown; scope?: { tenantId?: string | null } }) => Promise<unknown>
      }
      policyDefault = (await moduleConfigService.getValue('entities', 'newEntitiesRestrictedByDefault', {
        defaultValue: false,
        scope: { tenantId: auth.tenantId ?? null },
      })) === true
    } catch {}
    ent.accessRestricted = policyDefault
  } else {
    ent.accessRestricted = ent.accessRestricted ?? false
  }
  ent.updatedAt = new Date()
  em.persist(ent)
  await em.flush()
  await guard.runAfterSuccess()
  // SD-1 (CC-24): the re-activated entity has landed — now write the decision's records.
  // A no-op unless this was a reactivation (the decision is null otherwise): the **create**
  // case is already granted by the guard's own `afterSuccess`, so granting here as well
  // would double the write (it is an idempotent set-union, so that would be harmless, but
  // the null guard keeps one path — one write — per surface).
  await writeFieldPermissionGrant(
    em,
    auth.tenantId ?? null,
    entityPermissionDecision,
    'the re-activated custom entity',
    appearingSurfaces,
  )
  // Invalidate sidebar/nav cache for tenant scope (also when tenantId is null)
  try {
    const cache = (await createRequestContainer()).resolve('cache') as any
    if (cache) {
      await cache.deleteByTags([`nav:entities:${auth.tenantId || 'null'}`])
    }
  } catch {}
  return NextResponse.json({ ok: true, item: { id: ent.id, entityId: ent.entityId, label: ent.label, description: ent.description ?? undefined } })
}

export async function DELETE(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const entityId = body?.entityId
  if (!entityId) return NextResponse.json({ error: 'entityId is required' }, { status: 400 })

  const container = await createRequestContainer()
  const { resolve } = container
  const em = resolve('em') as any

  const where: any = { entityId, organizationId: auth.orgId ?? null, tenantId: auth.tenantId ?? null }
  const ent = await em.findOne(CustomEntity, where)
  if (!ent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const guard = await beginEntitiesMutationGuard({
    container,
    auth,
    req,
    resourceKind: ENTITY_DEFINITION_RESOURCE_KIND,
    resourceId: ent.id,
    operation: 'delete',
    mutationPayload: { entityId },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  ent.isActive = false
  ent.updatedAt = new Date()
  ent.deletedAt = ent.deletedAt ?? new Date()
  em.persist(ent)
  await em.flush()
  await guard.runAfterSuccess()
  // Invalidate sidebar/nav cache for tenant scope (also when tenantId is null)
  try {
    const cache = (await createRequestContainer()).resolve('cache') as any
    if (cache) {
      await cache.deleteByTags([`nav:entities:${auth.tenantId || 'null'}`])
    }
  } catch {}
  return NextResponse.json({ ok: true })
}

const entitySummarySchema = z.object({
  entityId: z.string(),
  source: z.enum(['code', 'custom']),
  label: z.string(),
  description: z.string().optional(),
  labelField: z.string().optional(),
  defaultEditor: z.string().optional(),
  showInSidebar: z.boolean().optional(),
  accessRestricted: z.boolean().optional(),
  updatedAt: z.string().optional(),
  count: z.number(),
})

const entityListResponseSchema = z.object({
  items: z.array(entitySummarySchema),
})

const deleteEntityRequestSchema = z.object({
  entityId: z.string(),
})

const upsertCustomEntityResponseSchema = z.object({
  ok: z.literal(true),
  item: z.object({
    id: z.string().uuid(),
    entityId: z.string(),
    label: z.string(),
    description: z.string().optional(),
  }),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'Entities',
  summary: 'Manage custom entities',
  methods: {
    GET: {
      summary: 'List available entities',
      description: 'Returns generated and custom entities scoped to the caller with field counts per entity.',
      responses: [
        {
          status: 200,
          description: 'List of entities',
          schema: entityListResponseSchema,
        },
        {
          status: 401,
          description: 'Missing authentication',
          schema: z.object({ error: z.string() }),
        },
      ],
    },
    POST: {
      summary: 'Upsert custom entity',
      description: 'Creates or updates a tenant/org scoped custom entity definition.',
      requestBody: {
        contentType: 'application/json',
        schema: upsertCustomEntitySchema,
      },
      responses: [
        {
          status: 200,
          description: 'Entity saved',
          schema: upsertCustomEntityResponseSchema,
        },
        {
          status: 400,
          description: 'Validation error',
          schema: z.object({
            error: z.string(),
            details: z.any().optional(),
          }),
        },
        {
          status: 401,
          description: 'Missing authentication',
          schema: z.object({ error: z.string() }),
        },
      ],
    },
    DELETE: {
      summary: 'Soft delete custom entity',
      description: 'Marks the specified custom entity inactive within the current scope.',
      requestBody: {
        contentType: 'application/json',
        schema: deleteEntityRequestSchema,
      },
      responses: [
        {
          status: 200,
          description: 'Entity deleted',
          schema: z.object({ ok: z.boolean() }),
        },
        {
          status: 400,
          description: 'Missing entity id',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 401,
          description: 'Missing authentication',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 404,
          description: 'Entity not found in scope',
          schema: z.object({ error: z.string() }),
        },
      ],
    },
  },
}
