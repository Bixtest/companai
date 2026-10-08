/**
 * The permission catalogue (SD-1 / S2 / M3) — what permission surfaces exist, and
 * what records each one yields.
 *
 * **What this is.** The platform stores permissions as a list of feature strings
 * (`features_json` on `role_acls` / `user_acls`), and modules *declare* their
 * features in `acl.ts`. Nothing, until now, could answer *"what permission
 * surfaces exist, and which records does a newly-appearing one create?"* — so a
 * new table, column or Function could land and no permission record was ever
 * produced for it. This is the missing catalogue: the one place that enumerates
 * surfaces and says what they grant.
 *
 * **What it deliberately is not.** It is not a second permission engine. It holds
 * **no policy** — it answers *what records does this surface yield*, never *may
 * this actor do it*. The second question stays with the existing engine (S5: one
 * engine, never a second one). It is a registry, in the same shape as the
 * capability registry (`lib/capabilities/registry.ts`) and the metadata registry
 * (`lib/kernel/metadata-registry.ts`): declared data, no decisions.
 *
 * **Why the record ids are what they are.** A surface yields the **two blocks**
 * the amended S2 requires (dictionary §C.1):
 *
 *   - the **data block** — who may read/edit the *values* (`<prefix>.view`,
 *     `<prefix>.manage`); and
 *   - the **structural block** — who may add/edit/remove/reference the *object
 *     itself* (`<prefix>.structure`), whose per-verb levels are `SD-4`'s.
 *
 * `prefix` is the surface's own id unless the caller supplies `featurePrefix`. A
 * caller that has a platform-native convention **must** supply it, so the
 * catalogue and enforcement cannot drift: for a custom entity the prefix is
 * `entities.records.<entityId>`, which is exactly what `recordFeatures.ts`
 * already derives (`deriveCustomEntityRecordFeature`). That is why the entity
 * hook passes it — reusing the platform's own id rather than inventing a scheme
 * beside it.
 *
 * **Two id vocabularies, on purpose.** Feature ids are dotted (`auth.users.list`);
 * entity ids are colon-prefixed (`customers:customer_person`). The catalogue
 * accepts both — a surface id is a non-empty, whitespace-free string of
 * `[a-z0-9_]` segments joined by `.` or `:`. It does not try to unify the two,
 * because the platform's own enforcement does not.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` S2 + §C.1; `ARCHITECTURE-structure-permissions.md`;
 * `library/development/PLAN-SD-1.md`.
 */

/* ------------------------------------------------------------------ *
 * The surface
 * ------------------------------------------------------------------ */

/**
 * The governable things a structure change creates. The first five are the
 * objects `ARCHITECTURE-structure-permissions.md` §2 enumerates; the last two
 * are the platform's own dynamic structures that are *not* declared in code and
 * so can only appear at runtime.
 */
export const PERMISSION_SURFACE_KINDS = [
  'object',
  'field',
  'relation',
  'function',
  'widget',
  'agent',
] as const
export type PermissionSurfaceKind = (typeof PERMISSION_SURFACE_KINDS)[number]

/** Where a surface came from: declared in code, or recorded when it appeared. */
export type PermissionSurfaceSource = 'declared' | 'recorded'

export type PermissionSurface = {
  /**
   * The surface's identity. An object is `module:entity` (the platform's entity
   * convention) or `module.object` (the feature convention); a field is
   * `<entityId>.<key>`.
   */
  id: string
  kind: PermissionSurfaceKind
  /** The module or owner that declared or recorded it. */
  owner: string
  source: PermissionSurfaceSource
  /**
   * The prefix the surface's records are built from. Defaults to `id`.
   *
   * Supplied only when the platform already has a native convention for the
   * surface's records (a custom entity's `entities.records.<entityId>`), so the
   * catalogue and enforcement agree on one id.
   */
  featurePrefix?: string
}

/* ------------------------------------------------------------------ *
 * The records
 * ------------------------------------------------------------------ */

/** The two blocks the amended S2 requires for every new surface. */
export const PERMISSION_BLOCKS = ['data', 'structural'] as const
export type PermissionBlock = (typeof PERMISSION_BLOCKS)[number]

/** The verbs each block yields. Data is read/edit; structural is the object's own verbs. */
export const PERMISSION_BLOCK_VERBS: Readonly<Record<PermissionBlock, readonly string[]>> = Object.freeze({
  data: Object.freeze(['view', 'manage']),
  structural: Object.freeze(['structure']),
})

/** One permission record: a feature id, and which block it belongs to. */
export type PermissionRecord = {
  /** The feature id, e.g. `entities.records.customers:customer_person.view`. */
  feature: string
  block: PermissionBlock
  /** The surface that produced it. */
  surfaceId: string
}

/**
 * The surface-id rule, permissive across both vocabularies but not open-ended.
 *
 * Segments of `[a-z0-9_]`, joined by `.` or `:`, no leading/trailing separator, no
 * whitespace. This accepts `auth.users`, `customers:customer_person` and
 * `customers:customer_person.loyalty_tier`; it rejects `''`, `'a b'`, `'.a'`,
 * `'a:'` and `'a..b'` — each of which would produce a feature id the platform's
 * matcher could not read.
 */
const SURFACE_ID_PATTERN = /^[a-z0-9_]+(?:[.:][a-z0-9_]+)*$/i

export function isPermissionSurfaceId(id: unknown): id is string {
  return typeof id === 'string' && SURFACE_ID_PATTERN.test(id)
}

export function isPermissionSurfaceKind(kind: unknown): kind is PermissionSurfaceKind {
  return typeof kind === 'string' && (PERMISSION_SURFACE_KINDS as readonly string[]).includes(kind)
}

/**
 * The records a surface yields — the two blocks, in a stable order (data before
 * structural, verbs in declaration order).
 *
 * **Returns `[]` for an unrecognised kind**, and that is the point: the gate reads
 * an empty record set as *"this surface cannot be permitted"* and refuses. A
 * throw here would be caught-and-ignored somewhere up the stack, which is the
 * fail-open the whole item exists to close.
 */
export function permissionRecordsFor(surface: PermissionSurface): PermissionRecord[] {
  if (!isPermissionSurfaceKind(surface.kind)) return []
  if (!isPermissionSurfaceId(surface.id)) return []

  const prefix = surface.featurePrefix ?? surface.id
  // The prefix is validated too, not just the id. A hostile critic found that an
  // unreadable `featurePrefix` produced unreadable record ids and the gate still
  // said `defaulted` — the exact fail-open this module exists to close. A record
  // built from a prefix no matcher can read is not a record.
  if (!isPermissionSurfaceId(prefix)) return []
  const records: PermissionRecord[] = []
  for (const block of PERMISSION_BLOCKS) {
    for (const verb of PERMISSION_BLOCK_VERBS[block]) {
      records.push({ feature: `${prefix}.${verb}`, block, surfaceId: surface.id })
    }
  }
  return records
}

/* ------------------------------------------------------------------ *
 * The registry
 * ------------------------------------------------------------------ */

const registry = new Map<string, PermissionSurface>()

function normalise(surface: PermissionSurface, source: PermissionSurfaceSource): PermissionSurface {
  return {
    id: surface.id,
    kind: surface.kind,
    owner: surface.owner,
    source,
    ...(surface.featurePrefix ? { featurePrefix: surface.featurePrefix } : {}),
  }
}

/**
 * Declare surfaces the platform ships in code. Idempotent; a later declaration of
 * the same id **replaces** the earlier one, matching how module overrides work
 * everywhere else (a downstream app may reclassify a surface for its own posture
 * without forking the module).
 */
export function declareSurfaces(surfaces: readonly PermissionSurface[]): void {
  for (const surface of surfaces) {
    if (!isPermissionSurfaceId(surface.id)) continue
    registry.set(surface.id, normalise(surface, 'declared'))
  }
}

/**
 * Record a surface that appeared at runtime — a custom field, a custom entity, a
 * saved Function.
 *
 * **A declared surface is never downgraded to recorded**: if the platform already
 * declares this id, the declaration is authoritative and wins (the same precedence
 * the records route uses — `declared wins over the DB row`). Recording an id that
 * is not declared adds it, marked `recorded`.
 */
export function recordSurface(surface: PermissionSurface): void {
  if (!isPermissionSurfaceId(surface.id)) return
  const existing = registry.get(surface.id)
  if (existing?.source === 'declared') return
  registry.set(surface.id, normalise(surface, 'recorded'))
}

export function getPermissionSurface(id: string): PermissionSurface | null {
  return registry.get(id) ?? null
}

export function hasPermissionSurface(id: string): boolean {
  return registry.has(id)
}

export function listPermissionSurfaces(): PermissionSurface[] {
  return [...registry.values()]
}

export function clearPermissionCatalogue(): void {
  registry.clear()
}

/**
 * The surface id an ACL feature declaration belongs to — the object half of
 * `<module>.<object>.<verb>`.
 *
 * **Best-effort, and deliberately narrow.** It reads the first two dotted
 * segments of a feature id with at least three segments (`auth.users.create` →
 * `auth.users`) and returns `null` for anything shorter, because a two-segment id
 * (`currencies.view`) cannot be told apart from a module-level feature without
 * guessing. The catalogue's population from declarations is a convenience; a
 * surface that this cannot derive is declared explicitly instead.
 */
export function objectSurfaceIdFromFeatureId(featureId: string): string | null {
  const parts = featureId.split('.')
  if (parts.length < 3) return null
  return `${parts[0]}.${parts[1]}`
}

/**
 * Populate the catalogue from the platform's ACL feature declarations.
 *
 * Each feature `<module>.<object>.<verb>` contributes its object surface once.
 * The surface is marked `declared`, so a later runtime `recordSurface()` for the
 * same id cannot downgrade it.
 */
export function hydrateCatalogueFromFeatures(
  features: readonly { id: string; module?: string }[],
): void {
  for (const feature of features) {
    if (!feature || typeof feature.id !== 'string') continue
    const id = objectSurfaceIdFromFeatureId(feature.id)
    if (!id) continue
    declareSurfaces([
      {
        id,
        kind: 'object',
        owner: feature.module ?? id.split('.')[0],
        source: 'declared',
      },
    ])
  }
}

/**
 * The catalogue as the gate needs it — a read-only handle.
 *
 * Typed structurally so a caller (and a test) can pass a fake without importing
 * the module's internals, and so the gate depends on *a catalogue*, not *this*
 * catalogue.
 */
export type PermissionCatalogueLike = {
  has: (id: string) => boolean
  get: (id: string) => PermissionSurface | null
}

/** The live catalogue, as a `PermissionCatalogueLike`. */
export const permissionCatalogue: PermissionCatalogueLike = {
  has: hasPermissionSurface,
  get: getPermissionSurface,
}
