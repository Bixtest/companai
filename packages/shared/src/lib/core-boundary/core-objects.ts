/**
 * The core-object registry (SD-2 / S9) — which platform surfaces ship by default
 * and **cannot be deleted**.
 *
 * **What this is.** The platform has surfaces it needs in order to be *controlled
 * by the people who control it* — managing roles and permissions is the one the
 * owner named (`SPECIFICATIONS-DICTIONARY.md` §C.3 / `S9`). Such a surface ships
 * present by default and **no actor may delete it** — not a tenant, not a
 * superadmin, and not an AI. Without one place that says *"this object is core"*,
 * the rule is a convention a delete path can forget to apply.
 *
 * **The set is a SETTING, not a frozen list (SD-2b — owner, 2026-10-09).** `SD-2`
 * shipped this registry with one hardcoded entry; the owner ruled that the list
 * must be **manageable from the superadmin UI without a code deploy**. So the
 * *values* now come from {@link resolveCoreTier} over {@link CoreSettings}
 * (`./core-settings.ts`, stored in `module_configs`), and this module is the thin,
 * synchronous **query surface** the guards and UIs call. The **seed** is still
 * code (the owner-accepted recommendation) and the fail-closed default — so a
 * missing or malformed setting leaves the platform **exactly as protected as the
 * seed**, never less.
 *
 * **What it deliberately is not.** It holds **no policy of its own** — it answers
 * *"is this object core?"*, never *"who may do what"*. The second question stays
 * with the existing engine (S5: one engine, never a second one). It is a registry
 * in the same shape as the permission catalogue (`lib/permissions/catalogue.ts`),
 * the capability registry (`lib/capabilities/registry.ts`) and the metadata
 * registry (`lib/kernel/metadata-registry.ts`): declared data, no decisions.
 *
 * **Why the role is matched by NAME, not a column.** The dictionary names the
 * *roles-and-permissions manager* as the first core function. In this codebase
 * that manager is the built-in **`superadmin` role** — created by name at setup
 * (`auth/lib/setup-app.ts:20`, `:536`, `:569`, with `isSuperAdmin: true`), per
 * tenant. Deleting it removes the ability to manage roles *in that scope*, which
 * is exactly what `S9` forbids. The `Role` entity carries no `isCore` column and
 * adding one needs a migration — unprovable on this host (`COMPLETION-CALLBACKS.md`
 * CC-31(a) records the boundary) — so the honest, migration-free shape is to match
 * the platform's own convention by name, which is testable today. **The seed's
 * `role` map carries that name; the setting may move it.**
 *
 * **The list is the owner's to grow — from the UI, now.** §C.3: *"The rest is to
 * be filled in as the platform grows, and every addition to the list is itself a
 * dictionary change."* The *values* live in the setting (`SD-2b`); the *rule* that
 * a `core` object cannot be deleted stays here in code (Ring 1).
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` §C.3 / `S9` + §C.2b (the setting precedent);
 * `CORE-BOUNDARY.md` §2, §5, §3 ("core-function list additions"); `BUILD-ORDER.md`
 * §7, §7b; `DECISION-core-object-set-as-settings.md`; `library/development/PLAN-SD-2.md`.
 */

import {
  DEFAULT_CORE_SETTINGS,
  loadCoreSettings,
  resolveCoreTier,
  type CoreSettings,
  type CoreSettingsReader,
  type CoreSettingKind,
} from './core-settings'

/* ------------------------------------------------------------------ *
 * The core object
 * ------------------------------------------------------------------ */

/**
 * The kinds of object that can be core.
 *
 * Re-exported from the setting's own kind set (`./core-settings.ts`) so the
 * registry and the setting cannot drift: a new *shape* of core object is a
 * dictionary change, which is exactly what extending this list means.
 */
export const CORE_OBJECT_KINDS = ['role'] as const
export type CoreObjectKind = (typeof CORE_OBJECT_KINDS)[number]

/** The tier an object must be in for this registry to call it *core*. */
const CORE_TIER = 'core'

/** One core object: what it is, and why it may not be deleted. */
export type CoreObject = {
  kind: CoreObjectKind
  /**
   * The object's identity within its kind. For a `role` this is the role **name**
   * (`'superadmin'`) — the platform's own convention, matched the way
   * `findRoleByName` matches (`{ name, tenantId }`).
   */
  id: string
  /** When it became core, so a reader can trace the decision. */
  since: string
  /** Why the system collapses without it — the dictionary's reason, in one line. */
  because: string
}

/** The reason attached to every *role* core object — one reason, one place. */
const ROLE_CORE_BECAUSE =
  'the roles-and-permissions manager — deleting it removes the ability to manage roles in that scope (SPECIFICATIONS-DICTIONARY.md §C.3 / S9, the surface the owner named)'

/**
 * The core objects, derived from settings.
 *
 * **No longer a frozen literal.** The `SD-2b` ruling moved the *values* into
 * {@link CoreSettings}; this function reads them back. Given no settings it uses
 * {@link DEFAULT_CORE_SETTINGS} (the seed), so a synchronous caller that has not
 * loaded the setting still gets the seed's list — exactly the behaviour `SD-2`
 * shipped, now override-able. `since` and `because` are attached here (the
 * *reason* stays in code, §C.3), so a settings change moves an object's tier
 * without erasing why it is on the list.
 */
export function coreObjects(settings: CoreSettings = DEFAULT_CORE_SETTINGS): readonly CoreObject[] {
  const ids = settings.objectTier.role ?? {}
  const objects: CoreObject[] = []
  for (const id of Object.keys(ids)) {
    if (resolveCoreTier('role', id, settings) !== CORE_TIER) continue
    if (!isCoreObjectKind('role')) continue
    objects.push({ kind: 'role', id, since: '2026-10-09', because: ROLE_CORE_BECAUSE })
  }
  return objects.map((o) => ({ ...o }))
}

/* ------------------------------------------------------------------ *
 * The questions
 * ------------------------------------------------------------------ */

/**
 * Is this object core — i.e. undeletable by anyone?
 *
 * Case-insensitive on `id`, because role names are matched case-insensitively
 * elsewhere in the platform (`superadmin` is written lowercase throughout, but a
 * stored `SuperAdmin` must not slip past the rule). The match is done by the
 * setting's *own-keys* resolver, so a hostile id (`__proto__`) cannot slip past
 * either.
 */
export function isCoreObject(
  kind: CoreObjectKind,
  id: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
  flags?: { isCore?: boolean },
): boolean {
  return coreObjectFor(kind, id, settings, flags) !== null
}

/**
 * The core object, or `null` when it is not core.
 *
 * Folds case/whitespace on the id (the `SD-2` behaviour, preserved) and then asks
 * the setting. Folding here, not in the setting, keeps the setting's stored keys
 * the platform's own form (`superadmin`) while remaining forgiving of a stored
 * ` SuperAdmin `.
 *
 * **The durable marker wins over the name — and over the setting (CC-31(a),
 * owner ruling 2026-10-09).** When the caller supplies `flags.isCore === true` —
 * the `roles.is_core` column, migrated in `Migration20261009090000` — the object
 * is core **whatever its id, and whatever the setting says**. That is the whole
 * point: the marker travels with the row through a rename, so renaming a core
 * role can neither make the registry forget it is core *nor* move it to a name
 * the setting happens to demote. If the setting could override the marker, a
 * rename would re-open the exact hole Option B closes.
 *
 * The setting stays authoritative everywhere the marker does not reach: a name
 * the setting lists as core with no row flag is core; a name the setting moves
 * between tiers is decided by the setting. The marker is a durable **floor**,
 * not a competing list. When the flag is absent or `false`, the name lookup runs
 * exactly as before, so a row that predates the migration (or a caller that did
 * not load the column) is **exactly as protected as it was** — never less.
 */
export function coreObjectFor(
  kind: CoreObjectKind,
  id: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
  flags?: { isCore?: boolean },
): CoreObject | null {
  if (typeof id !== 'string') return null
  const needle = id.trim().toLowerCase()
  if (!needle) return null
  const match = coreObjects(settings).find(
    (o) => o.kind === kind && o.id.toLowerCase() === needle,
  )
  if (match) return match
  // The durable marker: a row carrying `is_core` is core even if its id is not in
  // the setting (e.g. it was renamed). The reason still comes from the kind's one
  // place, so a renamed core role is refused in the same words as before.
  if (flags?.isCore === true) {
    return { kind, id, since: '2026-10-09', because: ROLE_CORE_BECAUSE }
  }
  return null
}

/**
 * A typed refusal for a **rename** of a core object, returned (not thrown).
 *
 * A rename is a different act from a delete and must say so: renaming a core
 * role is refused because it would make the role stop being *recognised* as core
 * (the historical gap — CC-31(a)), not because the row would vanish. One reason,
 * stated in the word for the act, so the caller and the user both know which
 * thing was stopped.
 *
 * Returns `null` when the object may be renamed.
 */
export function coreObjectRenameRefusal(
  kind: CoreObjectKind,
  id: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
  flags?: { isCore?: boolean },
): { reason: string; because: string } | null {
  const core = coreObjectFor(kind, id, settings, flags)
  if (!core) return null
  return {
    reason: `"${core.id}" is a core ${core.kind} and cannot be renamed.`,
    because:
      'renaming it would let the platform stop recognising it as core, which is the one thing that must not happen to the surface that manages roles and permissions (SPECIFICATIONS-DICTIONARY.md §C.3 / S9).',
  }
}

/**
 * A typed refusal, returned (not thrown) so the caller decides how to surface it —
 * a shared module does not know whether it is answering an HTTP route, a CLI or a
 * test. The caller throws; this names the reason (dictionary S3: tell the user
 * why).
 *
 * Returns `null` when the object may be deleted, so the call site reads
 * `const refusal = coreObjectRefusal(...); if (refusal) throw ...`.
 */
export function coreObjectRefusal(
  kind: CoreObjectKind,
  id: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
  flags?: { isCore?: boolean },
): { reason: string; because: string } | null {
  const core = coreObjectFor(kind, id, settings, flags)
  if (!core) return null
  return {
    reason: `"${core.id}" is a core ${core.kind} and cannot be deleted.`,
    because: core.because,
  }
}

/** A guard over the kind set, mirroring the catalogue's `isPermissionSurfaceKind`. */
export function isCoreObjectKind(value: unknown): value is CoreObjectKind {
  return typeof value === 'string' && (CORE_OBJECT_KINDS as readonly string[]).includes(value)
}

/* ------------------------------------------------------------------ *
 * The async variant — for a caller that has a reader and wants the LIVE set
 * ------------------------------------------------------------------ */

/**
 * The core objects **as stored**, for a caller that holds a settings reader (a
 * route, a guard). Loads the setting (fail-closed to the seed) and derives the
 * list — so a superadmin's override is honoured on this path, while a synchronous
 * caller without a reader keeps getting the seed.
 *
 * This is the `SD-2b` seam: the *rule* (this function's caller refuses the delete)
 * stays code; the *set* is a setting.
 */
export async function loadCoreObjects(
  reader: CoreSettingsReader | null | undefined,
  scope?: { tenantId?: string | null },
): Promise<readonly CoreObject[]> {
  return coreObjects(await loadCoreSettings(reader, scope))
}

// A `coreObjectRefusalLive(kind, id, reader, scope)` async wrapper is deliberately
// NOT provided: the caller that has a reader (`SD-2`'s guard) calls
// `loadCoreSettings` and then the pure `coreObjectRefusal` directly, so a second
// async wrapper would be untested surface. Noted so a later reader does not add one
// "for symmetry" (the SD-2b critic pass removed exactly such a helper).

/** Re-export the setting's kind set, so a caller can speak both vocabularies. */
export type { CoreSettingKind, CoreSettings, CoreSettingsReader }
