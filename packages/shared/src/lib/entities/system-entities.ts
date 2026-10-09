/**
 * The entity-type **picker's** exclusion list, now a SETTING (SD-2b — owner,
 * 2026-10-09), not a frozen constant.
 *
 * **What this answers.** `isSystemEntitySelectable(entityId)` answers *"may this
 * entity be chosen as the target of a custom field / shown in the entity-type
 * picker?"* — i.e. *"is it one of the platform's OWN surfaces, which a tenant must
 * not customize?"*
 *
 * **Why it changed.** Before `SD-2b` the reserved set was a hardcoded **7** ids
 * (the customization substrate). That answered the narrow question *"may a custom
 * field claim a *substrate* column?"* but **not** the owner's database-side point:
 * a custom field could still attach to `auth:user`, `auth:role`,
 * `directory:tenant`, `auth:session` — the platform's backbone — because none of
 * those were in the 7. The owner ruled the reserved set must be **manageable from
 * the superadmin UI** (`DECISION-core-object-set-as-settings.md`), so it now reads
 * from {@link CoreSettings.reservedEntityTypes}, whose seed is the 7 **plus** the
 * `core`/`platform_release` tables in entity-id form.
 *
 * **Synchronous, deliberately.** This predicate is called synchronously on hot
 * paths — the entity list (`entities.ts`), the definitions route
 * (`definitions.ts:505`), the query-index CLIs, onboarding provisioning — so it
 * cannot become `async` without rippling through all of them. It is therefore a
 * **pure predicate over values**: given no settings it uses
 * {@link DEFAULT_CORE_SETTINGS} (the seed, which is code), so a caller that has
 * not loaded the setting still gets the seed's protection — never less. A caller
 * that *has* loaded the setting (`loadCoreSettings`) passes it in, and the
 * superadmin's override is honoured. This is the same pure/asynchronous split the
 * `SD-3` tier source uses, and it keeps every existing sync call site working
 * unchanged.
 *
 * **Fail closed.** A missing or malformed setting resolves to the seed, so the
 * platform is never *less* protected because a setting could not be read.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` §C.2b (the setting precedent) + §C.3 (the
 * rule); `DECISION-core-object-set.md` §3 (the measured hole); `core-settings.ts`
 * (the values); `library/development/PLAN-SD-2b.md`.
 */

import { DEFAULT_CORE_SETTINGS, type CoreSettings } from '../core-boundary/core-settings'

/**
 * The reserved entity types as a lookup set, built from the current settings.
 *
 * The seed's members are entity ids (`auth:user`), so this is a straight set
 * membership test — the same shape the old constant used, now sourced from the
 * setting. Built per call (the set is tiny and settings are cached upstream); kept
 * here so the two predicates below share one definition.
 */
function reservedSet(settings: CoreSettings): ReadonlySet<string> {
  return new Set(settings.reservedEntityTypes)
}

export function isSystemEntitySelectable(
  entityId: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
): boolean {
  if (!entityId) return false
  return !reservedSet(settings).has(entityId)
}

export function flattenSystemEntityIds(
  allEntities: Record<string, Record<string, string>>,
  options?: { predicate?: (entityType: string) => boolean },
): string[] {
  if (!allEntities) return []
  const predicate = options?.predicate || isSystemEntitySelectable
  const seen = new Set<string>()
  for (const bucket of Object.values(allEntities)) {
    for (const id of Object.values(bucket ?? {})) {
      if (typeof id !== 'string' || id.length === 0) continue
      if (!predicate(id)) continue
      seen.add(id)
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b))
}

export function filterSelectableSystemEntityIds(
  entityIds: Iterable<string>,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
): string[] {
  const selected: string[] = []
  for (const id of entityIds) {
    if (isSystemEntitySelectable(id, settings)) selected.push(id)
  }
  return selected
}

export function isReservedSystemEntityType(
  entityId: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
): boolean {
  return reservedSet(settings).has(entityId)
}

/**
 * A typed refusal for a **custom-field write target that is a reserved system
 * surface**, returned (not thrown) so the caller decides how to surface it.
 *
 * **Why this exists (the critic's CRITICAL finding).** `isSystemEntitySelectable`
 * is the *picker's* predicate — it was only consulted on the two **preset** routes
 * (`api/definitions.ts`, `api/entities.ts`). The **batch** route
 * (`api/definitions.batch.ts`), the **`add-field` CLI**, and the non-request
 * primitive `ensureCustomFieldDefinitions` wrote `CustomFieldDef` rows **without
 * ever asking** — so a custom field could still attach to `auth:user` on those
 * paths. This helper is the one rule those three call, so the hole closes on
 * **every** write path, not just the one the UI uses (S5: one rule, no rival).
 *
 * Returns `null` when the target is selectable (writable), so a call site reads
 * `const refusal = reservedEntityRefusal(entityId); if (refusal) throw/return ...`.
 * The reason names the id (dictionary S3: tell the user why).
 */
export function reservedEntityRefusal(
  entityId: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
): { reason: string } | null {
  if (isSystemEntitySelectable(entityId, settings)) return null
  return {
    reason: `Custom fields are not supported for this entity: "${entityId}" is a reserved system surface.`,
  }
}
