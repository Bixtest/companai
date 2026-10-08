import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomEntity } from '../data/entities'
import { evaluateStructureChange } from '@open-mercato/shared/lib/permissions/structure-change-gate'
import { entityDefinitionSurface } from '../data/guards'
import { writeFieldPermissionGrant } from './field-definitions'

export type UpsertEntityOptions = {
  label: string
  description?: string | null
  organizationId?: string | null
  tenantId?: string | null
  showInSidebar?: boolean
  accessRestricted?: boolean
  labelField?: string | null
  defaultEditor?: string | null
  isActive?: boolean
  dryRun?: boolean
  createOnly?: boolean
}

export type UpsertCustomEntityResult = 'created' | 'updated' | 'unchanged'

/**
 * Whether a custom-entity row is a live surface (active and not tombstoned).
 *
 * Exported since CC-24 (the entity twin of `isActiveColumn`): the HTTP route
 * (`api/entities.ts`) must decide "is this a reactivation?" from the before-state,
 * and that rule has to be the *same* rule the install primitive uses here — one
 * definition, so the primitive and the route cannot drift into disagreeing about
 * what "an entity appearing" means.
 */
export function isActiveEntity(ent: { isActive?: boolean; deletedAt?: Date | null } | null | undefined): boolean {
  return !!ent && ent.isActive === true && ent.deletedAt == null
}

/**
 * Ensure a logical (virtual) entity exists in the DB. If present, updates label/description.
 * Use from module code (e.g., during CLI install/seed or module bootstrap).
 *
 * SD-1 (CC-21): a custom **entity** appearing is a permission surface appearing
 * (S2), so this primitive — the single choke point behind the module install and
 * any module seed — runs the same fail-closed gate the HTTP create path runs via
 * the registry guard, and writes the default's records after the flush. It is
 * decided **before** the row lands (a refusal throws, nothing is created) and
 * granted **after** (the surface must exist first), exactly as
 * `ensureCustomFieldDefinitions` does for fields. A create and a reactivation
 * (an inactive / tombstoned row saved active) both land a surface; an update that
 * leaves it active, and a `createOnly` sync, do not.
 *
 * This function handles race conditions by retrying if a unique constraint violation occurs.
 */
export async function upsertCustomEntity(em: EntityManager, entityId: string, opts: UpsertEntityOptions): Promise<UpsertCustomEntityResult> {
  const where: any = { entityId, organizationId: opts.organizationId ?? null, tenantId: opts.tenantId ?? null }
  const desired = {
    label: opts.label,
    description: opts.description ?? null,
    isActive: opts.isActive ?? true,
    showInSidebar: !!opts.showInSidebar,
    accessRestricted: !!opts.accessRestricted,
    labelField: opts.labelField ?? null,
    defaultEditor: opts.defaultEditor ?? null,
  }
  const dryRun = opts.dryRun === true
  const createOnly = opts.createOnly === true

  const apply = (ent: any) => {
    ent.label = desired.label
    ent.description = desired.description
    ent.isActive = desired.isActive
    ent.showInSidebar = desired.showInSidebar
    ent.accessRestricted = desired.accessRestricted
    ent.labelField = desired.labelField
    ent.defaultEditor = desired.defaultEditor
    ent.updatedAt = new Date()
    if (ent.deletedAt) ent.deletedAt = null
  }

  const isDifferent = (ent: any) => {
    if (ent.label !== desired.label) return true
    if ((ent.description ?? null) !== desired.description) return true
    if ((ent.isActive ?? true) !== desired.isActive) return true
    if ((ent.showInSidebar ?? false) !== desired.showInSidebar) return true
    if ((ent.accessRestricted ?? false) !== desired.accessRestricted) return true
    if ((ent.labelField ?? null) !== desired.labelField) return true
    if ((ent.defaultEditor ?? null) !== desired.defaultEditor) return true
    if (ent.deletedAt != null) return true
    return false
  }

  return em.transactional(async (tem) => {
    const now = new Date()
    try {
      let ent = await tem.findOne(CustomEntity as any, where)

      // SD-1 (CC-21): decide the permissions for the surface this call brings into
      // existence — a brand-new entity, or a tombstone/inactive row this upsert
      // reactivates. Under `createOnly` the caller never reactivates (it skips
      // updates), and a dry run lands nothing, so neither is gated. Decided from
      // the before-state, before any write, so a refusal stops the landing instead
      // of following it.
      const lands = !dryRun && (!ent || (!createOnly && !isActiveEntity(ent as any)))
      let permissionDecision = null as ReturnType<typeof evaluateStructureChange> | null
      if (lands) {
        permissionDecision = evaluateStructureChange({ surfaces: [entityDefinitionSurface(entityId)] })
        if (permissionDecision.outcome === 'refused') {
          throw new Error(
            `A new custom entity cannot land: ${permissionDecision.because} ` +
              'Every new data structure must answer the permissions question before it is applied (S2).',
          )
        }
      }

      if (!ent) {
        if (dryRun) return 'created'
        ent = tem.create(CustomEntity as any, { ...where, ...desired, createdAt: now, updatedAt: now, deletedAt: null })
        await tem.persist(ent).flush()
        await writeFieldPermissionGrant(tem as unknown as EntityManager, opts.tenantId ?? null, permissionDecision, 'the new custom entity')
        return 'created' as UpsertCustomEntityResult
      }
      if (createOnly) return 'unchanged'
      if (!isDifferent(ent)) return 'unchanged'
      if (dryRun) return 'updated'
      apply(ent)
      await tem.flush()
      await writeFieldPermissionGrant(tem as unknown as EntityManager, opts.tenantId ?? null, permissionDecision, 'the re-activated custom entity')
      return 'updated' as UpsertCustomEntityResult
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        const ent = await tem.findOne(CustomEntity as any, where)
        if (!ent) throw error
        if (createOnly) return 'unchanged'
        if (!isDifferent(ent)) return 'unchanged'
        if (dryRun) return 'updated'
        apply(ent)
        await tem.flush()
        return 'updated'
      }
      throw error
    }
  })
}
