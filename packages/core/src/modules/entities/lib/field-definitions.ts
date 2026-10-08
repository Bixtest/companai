import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomFieldDef } from '../data/entities'
import type { CustomFieldDefinition } from '@open-mercato/shared/modules/entities'
import type { PermissionSurface } from '@open-mercato/shared/lib/permissions/catalogue'
import {
  evaluateStructureChange,
  type StructureChangeGateOutcome,
} from '@open-mercato/shared/lib/permissions/structure-change-gate'
import { applyStructureChangeGrant } from '@open-mercato/core/modules/auth/lib/permission-decision-grant'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { fieldDefinitionSurface } from '../data/guards'

const logger = createLogger('entities').child({ component: 'field-definitions' })

export type FieldSetInput = {
  entity: string
  fields: CustomFieldDefinition[]
  source?: string
}

export type EnsureFieldDefinitionsOptions = {
  organizationId: string | null
  tenantId: string | null
  dryRun?: boolean
  createOnly?: boolean
}

export type EnsureFieldDefinitionsResult = {
  created: number
  updated: number
  unchanged: number
}

const CONFIG_PASSTHROUGH_KEYS: Array<keyof CustomFieldDefinition> = [
  'label',
  'description',
  'fieldset',
  'fieldsets',
  'group',
  'options',
  'optionsUrl',
  'defaultValue',
  'required',
  'multi',
  'filterable',
  'formEditable',
  'listVisible',
  'indexed',
  'priority',
  'editor',
  'input',
  'relatedEntityId',
  'dictionaryId',
  'dictionaryInlineCreate',
  'validation',
  'maxAttachmentSizeMb',
  'acceptExtensions',
  'sourceMetadata',
]

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item))
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeValue((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

function configEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeValue(a ?? null)) === JSON.stringify(normalizeValue(b ?? null))
}

/**
 * True when a row exists **and is an active column** (not a tombstone).
 *
 * A key with no row, or with an inactive/soft-deleted row, is a column that will be
 * visible after this sync — a reactivation is an appearance, exactly as a create is
 * (the same rule the batch definitions route applies, `PLAN-SD-1.md` §8.3). Exported
 * so the `entities add-field` CLI decides "is this a new surface?" the same way.
 */
export function isActiveColumn(def: { isActive?: boolean; deletedAt?: Date | null } | null | undefined): boolean {
  return !!def && def.isActive === true && def.deletedAt == null
}

/* ------------------------------------------------------------------ *
 * SD-1 (CC-3) — the permissions gate on the non-request create paths
 * ------------------------------------------------------------------ *
 * `ensureCustomFieldDefinitions` is the single primitive every non-request
 * field-creation path goes through: the module install/sync (`install-from-ce.ts`,
 * which is itself reachable from the definitions **GET** route — so this is not a
 * purely non-request concern), the module seeds and importers (`resources`, `staff`,
 * `catalog`, `checkout`, `sync_akeneo`) and the `customers` CLI. Gating the primitive
 * is what makes the S2 invariant uniform: **no path lands a column without the gate**,
 * and there is no second site to forget — the lesson of CC-2, where a gate at the
 * wrong layer left the batch path open. (The HTTP routes' own reactivation holes are
 * a different, separately scheduled gap — `COMPLETION-CALLBACKS.md` CC-22.)
 *
 * Two phases, deliberately split: the gate is **decided before** anything is
 * created (a refusal must stop the landing, not follow it), and the default's
 * records are **written after** the flush (the surface must exist first). Both are
 * exported so a caller with its own create — the entities `add-field` CLI — reuses
 * the same policy rather than re-implementing it.
 */

/**
 * Decide the permissions for the fields a call is about to bring into existence.
 *
 * Returns the gate's outcome, or `null` when there is nothing new to decide. A
 * `refused` outcome **throws**: the gate could not establish the permissions, so
 * the columns must not land. (The only reachable refusal is a malformed surface id
 * — a declared field key or entity id the permission matcher cannot read — which is
 * a defect in the declaration, not a runtime condition; every key in the tree today
 * is snake_case.)
 */
export function decideNewFieldPermissions(
  surfaces: readonly PermissionSurface[],
): StructureChangeGateOutcome | null {
  if (surfaces.length === 0) return null
  const decision = evaluateStructureChange({ surfaces: [...surfaces] })
  if (decision.outcome === 'refused') {
    throw new Error(
      `Custom field definitions cannot land: ${decision.because} ` +
        'Every new data structure must answer the permissions question before it is applied (S2).',
    )
  }
  return decision
}

/**
 * Write the default's records for fields that have now landed.
 *
 * A failure here cannot un-land the columns (they are committed), so it is **logged
 * at `error`, never thrown** — the same choice the guards' `afterSuccess` and the
 * batch route make. An ungated surface is the exact defect SD-1 exists to prevent,
 * so it must be visible. A **global** surface (`tenantId` null) has no single tenant
 * to grant in; that is a named limit (`PLAN-SD-1.md` §10), not a silent skip, and is
 * reported at `debug`.
 *
 * `what` is the plain-language subject of the event, so the log line names what
 * actually happened — a create and a reactivation both land a field, but they are
 * not the same event. The default keeps the original (create) wording; the HTTP
 * reactivation routes (CC-22) pass their own.
 */
export async function writeFieldPermissionGrant(
  em: EntityManager,
  tenantId: string | null,
  decision: StructureChangeGateOutcome | null,
  what = 'the new custom fields',
): Promise<void> {
  if (!decision || decision.outcome !== 'defaulted') return

  if (!tenantId) {
    logger.debug(
      `SD-1: ${what} landed; a global surface has no tenant to grant its records in (skipped by design)`,
      { surfaces: [...new Set(decision.records.map((record) => record.surfaceId))] },
    )
    return
  }

  try {
    const result = await applyStructureChangeGrant(em, { tenantId, decision })
    if (result && !result.applied) {
      logger.error(`SD-1: ${what} landed but the permission records could not be written`, {
        reason: result.reason,
        because: result.because,
        roleName: result.roleName,
        tenantId,
      })
      return
    }
    if (result) {
      logger.info(`SD-1: permission records granted for ${what}`, {
        roleName: result.roleName,
        added: result.added.length,
        alreadyPresent: result.alreadyPresent.length,
        aclCreated: result.aclCreated,
        tenantId,
      })
    }
  } catch (error) {
    logger.error(`SD-1: ${what} landed but writing the permission records threw`, {
      tenantId,
      err: error,
    })
  }
}

export async function ensureCustomFieldDefinitions(
  em: EntityManager,
  sets: FieldSetInput[],
  scope: EnsureFieldDefinitionsOptions
): Promise<EnsureFieldDefinitionsResult> {
  let created = 0
  let updated = 0
  let unchanged = 0

  // Prefetch every existing definition the batch could touch in a single query,
  // then index by composite key so the nested loop never issues per-field lookups.
  const entityIds = Array.from(new Set(sets.map((set) => set.entity)))
  const fieldKeys = Array.from(new Set(sets.flatMap((set) => set.fields.map((field) => field.key))))
  const existingByKey = new Map<string, CustomFieldDef>()
  if (entityIds.length > 0 && fieldKeys.length > 0) {
    const existingDefs = await em.find(CustomFieldDef, {
      entityId: { $in: entityIds },
      organizationId: scope.organizationId,
      tenantId: scope.tenantId,
      key: { $in: fieldKeys },
    })
    for (const def of existingDefs) {
      existingByKey.set(`${def.entityId}|${def.key}`, def)
    }
  }

  let dirty = false

  // SD-1 (CC-3): the surfaces this call brings into existence — a key with no row,
  // a tombstone this sync reactivates, or (CC-4) an **active** row whose **kind
  // changes** (a field-type change is a new surface in effect, named in S2). It must
  // match **exactly what the loop below lands**: under `createOnly` the loop never
  // reactivates or retypes (it skips updates), so neither is a new surface there.
  // Computed from the prefetch, before any write, so a refusal can stop the landing
  // instead of following it. A dry run lands nothing, so it is not gated.
  const newSurfaces: PermissionSurface[] = []
  if (!scope.dryRun) {
    const seen = new Set<string>()
    for (const set of sets) {
      for (const field of set.fields) {
        const existing = existingByKey.get(`${set.entity}|${field.key}`)
        const reactivates = !!existing && !scope.createOnly && !isActiveColumn(existing)
        const retypes = !!existing && !scope.createOnly && isActiveColumn(existing) && existing.kind !== field.kind
        const lands = !existing || reactivates || retypes
        if (!lands) continue
        const surface = fieldDefinitionSurface(set.entity, field.key)
        if (seen.has(surface.id)) continue
        seen.add(surface.id)
        newSurfaces.push(surface)
      }
    }
  }
  const permissionDecision = decideNewFieldPermissions(newSurfaces)

  for (const set of sets) {
    for (const field of set.fields) {
      const existing = existingByKey.get(`${set.entity}|${field.key}`) ?? null
      const configJson: Record<string, unknown> = {}

      for (const key of CONFIG_PASSTHROUGH_KEYS) {
        const value = field[key]
        if (value !== undefined) configJson[key] = value as unknown
      }

      if (!existing) {
        if (!scope.dryRun) {
          const createdDef = em.create(CustomFieldDef, {
            entityId: set.entity,
            organizationId: scope.organizationId,
            tenantId: scope.tenantId,
            key: field.key,
            kind: field.kind,
            configJson,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          em.persist(createdDef)
          // Track so duplicate (entity, key) pairs within the batch update in memory instead of double-inserting.
          existingByKey.set(`${set.entity}|${field.key}`, createdDef)
          dirty = true
        }
        created++
        continue
      }

      const kindChanged = existing.kind !== field.kind
      const configChanged = !configEquals(existing.configJson ?? null, configJson)
      const needsActivation = existing.isActive !== true || existing.deletedAt != null
      if (scope.createOnly) {
        unchanged++
        continue
      }
      if (!kindChanged && !configChanged && !needsActivation) {
        unchanged++
        continue
      }

      if (!scope.dryRun) {
        existing.kind = field.kind
        ;(existing as any).configJson = configJson
        existing.isActive = true
        existing.updatedAt = new Date()
        if (existing.deletedAt) existing.deletedAt = null
        em.persist(existing)
        dirty = true
      }
      updated++
    }
  }

  if (dirty) {
    // Single flush for the whole batch instead of one round trip per field.
    await em.flush()
  }

  // SD-1 (CC-3): the columns have landed — now write the default's records. The
  // write is post-commit (the surface must exist first) and never throws (a landed
  // save must not fail on a grant); see `writeFieldPermissionGrant`.
  await writeFieldPermissionGrant(em, scope.tenantId, permissionDecision)

  return { created, updated, unchanged }
}
