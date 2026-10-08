import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { CustomFieldDef, CustomFieldEntityConfig } from '@open-mercato/core/modules/entities/data/entities'
import { customFieldEntityConfigSchema, upsertCustomFieldDefSchema } from '@open-mercato/core/modules/entities/data/validators'
import { z } from 'zod'
import { enforceCommandOptimisticLock } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import {
  evaluateStructureChange,
  type StructureChangeGateOutcome,
} from '@open-mercato/shared/lib/permissions/structure-change-gate'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import { invalidateDefinitionsCache } from './definitions.cache'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { mergeEntityFieldsetConfig, normalizeEntityFieldsetConfig } from '../lib/fieldsets'
import { resolveEntityDefinitionsVersion } from '../lib/definitions-version'
import { fieldDefinitionSurface } from '../data/guards'
import {
  beginEntitiesMutationGuard,
  FIELD_DEFINITION_RESOURCE_KIND,
} from './definitions.mutation-guard'
import {
  createExactDefinitionWhere,
  createScopedDefinitionTombstone,
  createVisibleDefinitionWhere,
  markDefinitionTombstoned,
  resolveDefinitionMutationScope,
  selectVisibleDefinitionWinner,
} from '../lib/definition-scope'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['entities.definitions.manage'] },
}

const MAX_DEFINITIONS_PER_BATCH = 1000

const logger = createLogger('entities').child({ component: 'definitions-batch' })

/**
 * SD-1 (CC-2) — the permissions gate on the batch create path.
 *
 * The dictionary's S2 standard: a new data structure — here, a new column — must not
 * land until its permissions are decided. The **single**-definition route
 * (`api/definitions.ts`) gets that from the registry, because it knows `create` vs
 * `update` *before* it calls the guard: it passes `operation: def ? 'update' : 'create'`
 * with the field in the payload, so the create-only gate guard matches and fires.
 *
 * **This route cannot do that.** It upserts a whole definition set under
 * `operation: 'custom'` — which the registry maps to `'update'` — so a create-only
 * guard never matches it; and the columns it actually *creates* are knowable only
 * *inside* its transaction, after the prefetch (a key with no existing definition row).
 * The guard payload carries no field list, so no registry guard can see them.
 *
 * So the gate runs **here**, at the one place the create is known, against the same
 * prefetch the writes use — no second query, and no window between the check and the
 * write. The policy is not duplicated: the surfaces come from `fieldDefinitionSurface`
 * and the write from `applyStructureChangeGrant`, the same two the guard uses.
 *
 * A refusal rolls the whole batch back before anything lands (fail closed — the gate is
 * all-or-nothing for the batch, exactly as a partially-permitted schema would be).
 * The default grant is written **after** the commit, because the surface must exist
 * before it is granted; the write is idempotent (a set-union), so a retry cannot
 * double-grant.
 */

/** The gate's `defaulted` variant — the only one with records to grant. */
type DefaultedStructureChange = Extract<StructureChangeGateOutcome, { outcome: 'defaulted' }>

/**
 * True when a definition row exists **and is an active column**.
 *
 * Used to decide whether this batch *brings a column into existence*: a key with no
 * row, or with a row that is an inactive tombstone, is a column that will be visible
 * after this save (a hostile-critic pass proved the "no row" test alone let a
 * **reactivated** field through ungated). Anything else — an already-active row — is
 * an update.
 */
function isActiveColumn(def: { isActive?: boolean } | undefined): boolean {
  return def?.isActive === true
}

/**
 * Write the gate's default grant for the columns a batch created, once the batch has
 * committed.
 *
 * A failure here cannot un-land the columns (they are committed), so it is **logged at
 * `error`, never turned into a 500** for a save that already succeeded — the same
 * choice the guard's `afterSuccess` makes. An ungated surface is the exact defect SD-1
 * exists to prevent, so it must be visible.
 */
async function applyBatchStructureChangeGrant(
  em: EntityManager,
  tenantId: string,
  decision: DefaultedStructureChange,
): Promise<void> {
  try {
    const result = await applyStructureChangeGrant(em, { tenantId, decision })
    if (result && !result.applied) {
      logger.error('SD-1: the batch created new columns but their permission records could not be written', {
        reason: result.reason,
        because: result.because,
        roleName: result.roleName,
        tenantId,
      })
      return
    }
    if (result) {
      logger.info('SD-1: permission records granted for the columns a batch created', {
        roleName: result.roleName,
        added: result.added.length,
        alreadyPresent: result.alreadyPresent.length,
        aclCreated: result.aclCreated,
        tenantId,
      })
    }
  } catch (error) {
    logger.error('SD-1: the batch created new columns but writing their permission records threw', {
      tenantId,
      err: error,
    })
  }
}

const batchSchema = z
  .object({
    entityId: z.string().regex(/^[a-z0-9_]+:[a-z0-9_]+$/),
    definitions: z
      .array(
        upsertCustomFieldDefSchema
          .omit({ entityId: true })
          .extend({
            configJson: z.any().optional(),
          })
      )
      .max(MAX_DEFINITIONS_PER_BATCH),
  })
  .extend(customFieldEntityConfigSchema.shape)

type IncomingFieldset = z.infer<typeof customFieldEntityConfigSchema>['fieldsets']

function cloneFieldsets(fieldsets?: IncomingFieldset): IncomingFieldset {
  if (!Array.isArray(fieldsets)) return undefined
  return fieldsets.map((fieldset) => ({
    code: fieldset.code,
    label: fieldset.label,
    icon: fieldset.icon,
    description: fieldset.description,
    groups: Array.isArray(fieldset.groups)
      ? fieldset.groups.map((group) => ({
          code: group.code,
          title: group.title,
          hint: group.hint,
        }))
      : undefined,
  }))
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  const { entityId, definitions, fieldsets, singleFieldsetPerRecord } = parsed.data

  const container = await createRequestContainer()
  const scope = await resolveDefinitionMutationScope({ auth, container, request: req })
  const { resolve } = container
  const em = resolve('em') as any
  let cache: CacheStrategy | undefined
  try {
    cache = resolve('cache') as CacheStrategy
  } catch {}

  const guard = await beginEntitiesMutationGuard({
    container,
    auth,
    req,
    resourceKind: FIELD_DEFINITION_RESOURCE_KIND,
    resourceId: entityId,
    operation: 'custom',
    mutationPayload: { entityId, definitionCount: definitions.length },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  // Optimistic locking (issue #3152): the batch upserts a whole definition set,
  // so guard the entity's aggregate schema version (the newest updated_at across
  // its field definitions and fieldset config). A stale save — another tab changed
  // the schema after this form loaded — fails with the same structured 409 the CRUD
  // path returns. Strictly additive: callers that do not send the expected version
  // header pass through unchanged.
  const currentVersion = await resolveEntityDefinitionsVersion(em, {
    entityId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  try {
    enforceCommandOptimisticLock({
      resourceKind: FIELD_DEFINITION_RESOURCE_KIND,
      resourceId: entityId,
      current: currentVersion,
      request: req,
    })
  } catch (err) {
    if (isCrudHttpError(err) && err.status === 409) {
      return NextResponse.json(err.body, { status: err.status })
    }
    throw err
  }

  await em.begin()
  // SD-1 (CC-2): the gate's outcome for the columns this batch creates, decided inside
  // the transaction (see the section comment above) and applied after the commit.
  let permissionDecision: StructureChangeGateOutcome | null = null
  try {
    // Prefetch every existing definition for this entity in a single query, then index
    // by key so the per-definition loop resolves create/update without round trips.
    const defByKey = new Map<string, any>()
    const keys = definitions.map((d) => d.key)
    if (keys.length > 0) {
      const existingDefs = await em.find(CustomFieldDef, {
        ...createExactDefinitionWhere(entityId, { $in: keys }, scope),
      })
      for (const existing of existingDefs) defByKey.set(existing.key, existing)
    }

    const inheritedByKey = new Map<string, any>()
    const inactiveKeys = definitions.filter((d) => d.isActive === false).map((d) => d.key)
    if (inactiveKeys.length > 0) {
      const visibleDefs = await em.find(CustomFieldDef, createVisibleDefinitionWhere(
        entityId,
        { $in: inactiveKeys },
        scope,
        { deletedAt: null, isActive: true },
      ))
      const grouped = new Map<string, any[]>()
      for (const visible of visibleDefs) {
        if (!grouped.has(visible.key)) grouped.set(visible.key, [])
        grouped.get(visible.key)!.push(visible)
      }
      for (const [key, group] of grouped) {
        inheritedByKey.set(key, selectVisibleDefinitionWinner(group))
      }
    }

    // SD-1 (CC-2): a key is a column this batch **brings into existence** when it has no
    // definition row at all, **or** when its row is an inactive tombstone this save
    // reactivates — re-appearing is appearing, and the gate's write is idempotent, so
    // gating a reactivation costs nothing. A key saved **inactive** is a tombstone, not a
    // column, and is deliberately not gated.
    const newKeys = definitions
      .filter((d) => d.isActive !== false && !isActiveColumn(defByKey.get(d.key)))
      .map((d) => d.key)
    if (newKeys.length > 0) {
      permissionDecision = evaluateStructureChange({
        surfaces: newKeys.map((key) => fieldDefinitionSurface(entityId, key)),
      })
      if (permissionDecision.outcome === 'refused') {
        await em.rollback()
        return NextResponse.json(
          {
            error:
              `The batch cannot land: ${permissionDecision.because} ` +
              'Every new data structure must answer the permissions question before it is applied (S2).',
          },
          { status: 422 },
        )
      }
    }

    for (const [idx, d] of definitions.entries()) {
      const where: any = createExactDefinitionWhere(entityId, d.key, scope)
      let def = defByKey.get(d.key)

      const inCfg = (d as any).configJson ?? {}
      const cfg: Record<string, any> = { ...inCfg }
      if (cfg.label == null || String(cfg.label).trim() === '') cfg.label = d.key
      if (cfg.formEditable === undefined) cfg.formEditable = true
      if (cfg.listVisible === undefined) cfg.listVisible = true
      if (d.kind === 'multiline' && (cfg.editor == null || String(cfg.editor).trim() === '')) cfg.editor = 'markdown'
      cfg.priority = idx

      if (d.isActive === false) {
        const now = new Date()
        const inherited = inheritedByKey.get(d.key)
        if (!def) {
          def = createScopedDefinitionTombstone(
            em,
            {
              entityId,
              key: d.key,
              kind: d.kind,
              configJson: inherited?.configJson ?? cfg,
            },
            scope,
            now,
          )
          defByKey.set(d.key, def)
        } else {
          markDefinitionTombstoned(def, now)
        }
        def.kind = d.kind
        def.configJson = cfg
        def.isActive = false
        def.deletedAt = def.deletedAt ?? now
        def.updatedAt = now
        em.persist(def)
        continue
      }

      if (!def) {
        def = em.create(CustomFieldDef, { ...where, createdAt: new Date() })
        defByKey.set(d.key, def)
      }
      def.kind = d.kind
      def.configJson = cfg
      def.isActive = true
      def.deletedAt = null
      def.updatedAt = new Date()
      em.persist(def)
    }
    if (fieldsets !== undefined || singleFieldsetPerRecord !== undefined) {
      const entityConfigScope: any = { entityId, organizationId: scope.organizationId, tenantId: scope.tenantId }
      let cfg = await em.findOne(CustomFieldEntityConfig, entityConfigScope)
      if (!cfg) cfg = em.create(CustomFieldEntityConfig, { ...entityConfigScope, createdAt: new Date() })
      const existing = normalizeEntityFieldsetConfig(cfg.configJson ?? {})
      const patch = mergeEntityFieldsetConfig(existing, {
        fieldsets: fieldsets !== undefined ? cloneFieldsets(fieldsets) ?? [] : undefined,
        singleFieldsetPerRecord,
      })
      cfg.configJson = {
        fieldsets: patch.fieldsets,
        singleFieldsetPerRecord: patch.singleFieldsetPerRecord,
      }
      cfg.updatedAt = new Date()
      cfg.isActive = true
      em.persist(cfg)
    }
    await em.flush()
    await em.commit()
  } catch (e) {
    try { await em.rollback() } catch {}
    return NextResponse.json({ error: 'Failed to save definitions batch' }, { status: 500 })
  }

  await guard.runAfterSuccess()

  // SD-1 (CC-2): the batch committed — now grant the default's records for the columns
  // it created. Post-commit because the surface must exist first; the write is
  // idempotent, and a failure is logged rather than failing a save that already landed.
  if (permissionDecision?.outcome === 'defaulted') {
    if (auth.tenantId) {
      await applyBatchStructureChangeGrant(em, auth.tenantId, permissionDecision)
    } else {
      // The columns are committed and the gate said "grant these", but the request
      // carried no tenant to grant them in. Skipping quietly would be the exact defect
      // SD-1 exists to prevent, so it is loud (a hostile-critic pass found this skip
      // was silent).
      logger.error('SD-1: the batch created new columns but the request carried no tenant to grant their permissions in', {
        resourceKind: FIELD_DEFINITION_RESOURCE_KIND,
        // Deduped: a surface yields several records, so mapping records here would name
        // the same column once per record.
        surfaces: [...new Set(permissionDecision.records.map((record) => record.surfaceId))],
      })
    }
  }

  await invalidateDefinitionsCache(cache, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    entityIds: [entityId],
  })

  // Return the post-save version so the form can round-trip the token for a
  // subsequent save (reorder, delete, second save) without a false conflict.
  const nextVersion = await resolveEntityDefinitionsVersion(em, {
    entityId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  return NextResponse.json({ ok: true, version: nextVersion })
}

const batchResponseSchema = z.object({
  ok: z.literal(true),
  version: z.string().nullable().optional(),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'Entities',
  summary: 'Batch upsert custom field definitions',
  methods: {
    POST: {
      summary: 'Save multiple custom field definitions',
      description: 'Creates or updates multiple definitions for a single entity in one transaction.',
      requestBody: {
        contentType: 'application/json',
        schema: batchSchema,
      },
      responses: [
        {
          status: 200,
          description: 'Definitions saved',
          schema: batchResponseSchema,
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
        {
          status: 500,
          description: 'Unexpected failure',
          schema: z.object({ error: z.string() }),
        },
      ],
    },
  },
}
