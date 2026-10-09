import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { CacheStrategy } from '@open-mercato/cache'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { CustomFieldDef } from '@open-mercato/core/modules/entities/data/entities'
import { invalidateDefinitionsCache } from './definitions.cache'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  beginEntitiesMutationGuard,
  FIELD_DEFINITION_RESOURCE_KIND,
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
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { fieldDefinitionSurface } from '../data/guards'
import { isActiveColumn, writeFieldPermissionGrant } from '../lib/field-definitions'
import { createExactDefinitionWhere, resolveDefinitionMutationScope } from '../lib/definition-scope'
import { reservedEntityRefusal } from '@open-mercato/shared/lib/entities/system-entities'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['entities.definitions.manage'] },
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { entityId, key } = body || {}
  if (!entityId || !key) return NextResponse.json({ error: 'entityId and key are required' }, { status: 400 })

  // SD-2b: a custom field may not attach to (or be restored on) a reserved system
  // surface. This route reactivates a `CustomFieldDef`, so like the batch route it
  // must ask the gate — a reserved entity could otherwise be resurrected from a
  // tombstone written before the gate existed. Same refusal, same status as the
  // other write paths (400 — the entity is not a valid target).
  const reservedRefusal = reservedEntityRefusal(entityId)
  if (reservedRefusal) {
    return NextResponse.json({ error: reservedRefusal.reason }, { status: 400 })
  }

  const container = await createRequestContainer()
  const scope = await resolveDefinitionMutationScope({ auth, container, request: req })
  const { resolve } = container
  const em = resolve('em') as any
  let cache: CacheStrategy | undefined
  try {
    cache = resolve('cache') as CacheStrategy
  } catch {}

  const where: any = createExactDefinitionWhere(entityId, key, scope)
  const def = await em.findOne(CustomFieldDef, where)
  if (!def) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const guard = await beginEntitiesMutationGuard({
    container,
    auth,
    req,
    resourceKind: FIELD_DEFINITION_RESOURCE_KIND,
    resourceId: def.id,
    operation: 'custom',
    mutationPayload: { entityId, key },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  // SD-1 (CC-22): this route exists to bring a tombstoned field back, so — when the row
  // really is a tombstone — it (re)appears a permission surface, exactly as a create
  // does. The registry's create-only gate guard cannot see it: this route passes
  // `operation: 'custom'`, which the registry maps to `'update'`. So, like the batch
  // route, the gate runs **here**, at the one place the before-state (`def`) is known,
  // against the same `fieldDefinitionSurface` and the same write every other create path
  // uses. Restoring an already-active row changes nothing structural and is not gated. A
  // refusal fails closed: 422, and the row is left as it was.
  const reactivatesField = !isActiveColumn(def)
  // SD-1 (CC-17): the same decision carrier the batch route and the guards use — a
  // malformed decision is refused with 400 before anything is touched, a well-formed
  // one reaches the gate. A reactivation is handled here (not by the registry) because
  // this route passes `operation: 'custom'`, which the registry maps to `'update'` and
  // the create-only gate guard cannot see (CC-22).
  const requestedDecision = readStructureDecisionFromHeaders(req.headers)
  if (requestedDecision.kind === 'malformed') {
    return NextResponse.json({ error: requestedDecision.because }, { status: 400 })
  }
  // SD-1 (CC-25): a decision must be stated by an authorised actor — the header's
  // `decidedBy` / `grantTo` are checked against the authenticated user, not trusted.
  if (requestedDecision.kind === 'decision') {
    try {
      await assertActorMayStateDecision({
        em,
        rbacService: resolve('rbacService') as RbacService,
        actorUserId: auth.sub,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
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
  // The surface this restore (re)appears, named once and reused for both the gate and
  // the catalogue write below — so the surface the gate judged and the surface the
  // catalogue records cannot drift (`M3e`/`P3b`).
  const appearingSurfaces = reactivatesField ? [fieldDefinitionSurface(entityId, key)] : []
  const permissionDecision: StructureChangeGateOutcome | null = reactivatesField
    ? evaluateStructureChange({
        surfaces: appearingSurfaces,
        decision:
          requestedDecision.kind === 'decision' ? toStructurePermissionDecision(requestedDecision.decision) : null,
      })
    : null
  if (permissionDecision?.outcome === 'refused') {
    return NextResponse.json(
      {
        error:
          `The field cannot be restored: ${permissionDecision.because} ` +
          'Every new data structure must answer the permissions question before it is applied (S2).',
      },
      { status: 422 },
    )
  }

  ;(def as any).deletedAt = null
  ;(def as any).isActive = true
  ;(def as any).updatedAt = new Date()
  em.persist(def)
  await em.flush()
  await guard.runAfterSuccess()
  // SD-1 (CC-22): the restored column has landed — now write the default's records.
  await writeFieldPermissionGrant(em, scope.tenantId, permissionDecision, 'the restored custom field', appearingSurfaces)
  await invalidateDefinitionsCache(cache, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    entityIds: [entityId],
  })
  return NextResponse.json({ ok: true })
}

const restoreDefinitionRequestSchema = z.object({
  entityId: z.string(),
  key: z.string(),
})

const restoreDefinitionResponseSchema = z.object({
  ok: z.literal(true),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'Entities',
  summary: 'Restore soft-deleted custom field definitions',
  methods: {
    POST: {
      summary: 'Restore definition',
      description: 'Reactivates a previously soft-deleted definition within the current tenant/org scope.',
      requestBody: {
        contentType: 'application/json',
        schema: restoreDefinitionRequestSchema,
      },
      responses: [
        {
          status: 200,
          description: 'Definition restored',
          schema: restoreDefinitionResponseSchema,
        },
        {
          status: 400,
          description: 'Missing entity id or key',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 401,
          description: 'Missing authentication',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 404,
          description: 'Definition not found',
          schema: z.object({ error: z.string() }),
        },
      ],
    },
  },
}
