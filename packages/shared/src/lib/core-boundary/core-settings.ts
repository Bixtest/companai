/**
 * The core-object set as a SETTING, not a constant (SD-2b — owner, 2026-10-09).
 *
 * **What this is.** The home for the values that decide *which platform object is
 * in which protection tier*: (1) the object→tier **map** (tables, columns,
 * relations, functions, roles → `core` / `platform_release` / `tenant_structural`
 * / `tenant_data`), (2) the **default tier** for an object not in the map, (3) the
 * **system-column set** (column names never allowed as custom-field keys and
 * un-removable on a `core` table), and (4) the **reserved entity types** (the
 * entity-type picker's exclusion list). All four are read from the platform's
 * existing settings store (`module_configs`) through `ModuleConfigService`, so a
 * **superadmin can mark a table or column they just created as protected from the
 * UI, with no deploy** — which is the owner's instruction, verbatim:
 *
 * > *"analyze if we can do this as a manageable matter instead of hardcoded. Give
 * > the superadmin the right and functionality to identify which table/column/
 * > function belongs to which tier… your recommendations become **default
 * > settings**, not hardcoded architecture."*
 *
 * **This is a DIRECT COPY of the `SD-3` pattern** (`../request-outcome/
 * tier-source.ts`), because it is the same shape of problem: the owner said the
 * tier mapping should be *"a setting a superadmin can change"* and it shipped as a
 * **seed + a strict reader + a fail-closed parser** over `module_configs` — no new
 * table, no migration. `SPECIFICATIONS-DICTIONARY.md` §C.2b is the precedent,
 * verbatim; §C.3 is this feature's rule.
 *
 * **What is a setting, and what is NOT (the Ring‑1/Ring‑2 asymmetry).** The
 * *values* are a setting (Ring 2, `CORE-BOUNDARY.md` §2). The **rule** — *a `core`
 * object cannot be deleted or restructured, by anyone* — the **four tier names**,
 * and **this parser** stay **code** (Ring 1, platform-release-only). Stated the
 * owner's way: *"a setting can move an object **between** tiers; it can never
 * **delete the tiers**."* Adding a fifth tier is a dictionary change, not a
 * setting — the same rule as §C.3's *"every addition to the core list is itself a
 * dictionary change."*
 *
 * **Why the seed is code and the setting only overrides it.** The fail-closed
 * default must be a *known*, reviewable value — so the seed ({@link
 * DEFAULT_CORE_SETTINGS}, the owner-accepted recommendation) is code, and the
 * setting is the *override*. A missing, malformed or unreachable setting therefore
 * leaves the platform **exactly as protected as the seed** — never less. This is
 * also why the pure predicate ({@link resolveCoreTier}) can stay **synchronous**:
 * it needs *values*, and when no loaded setting is supplied it uses the seed, which
 * is available without touching the database.
 *
 * **Fail closed, always.** Every path that cannot read a valid value returns
 * {@link DEFAULT_CORE_SETTINGS}, whose default tier is `tenant_structural` — an
 * unknown object is **not** silently `core` (that would freeze the platform) and
 * **not** silently `tenant_data` (that would free it); it routes to the S2
 * structure gate (`SD-1`), which fails closed on its own. §C.2b's guardrail is
 * explicit: *"Missing/invalid setting → the seed, never a weaker tier."*
 *
 * Source: `library/development/SPECIFICATIONS-DICTIONARY.md` §C.2b (the precedent)
 * + §C.3 (the rule); `library/development/DECISION-core-object-set-as-settings.md`
 * (the design) and `DECISION-core-object-set.md` §4 (the seed values);
 * `CORE-BOUNDARY.md` §2 (`Ring 1 vs Ring 2`), §5; `library/development/PLAN-SD-2b.md`.
 */

/* ------------------------------------------------------------------ *
 * Where the setting lives
 * ------------------------------------------------------------------ */

/**
 * The settings key, copied from the shape the platform already uses for policies
 * (`entities` / `newEntitiesRestrictedByDefault` — `entities/api/entity-settings.ts`)
 * and from the `SD-3` tier setting (`request_outcome` / `structureChangeTiers`).
 * Module `core_boundary` is this feature's own module; the name says what it is.
 */
export const CORE_SETTINGS_MODULE = 'core_boundary'
export const CORE_SETTINGS_NAME = 'coreObjectTiers'

/* ------------------------------------------------------------------ *
 * The four tiers — CODE (Ring 1). Adding a fifth is a dictionary change.
 * ------------------------------------------------------------------ */

/**
 * The four protection tiers, in `CORE-BOUNDARY.md`'s own ring language so the
 * setting and the boundary document cannot drift.
 *
 * **These names are Ring 1.** A setting assigns an object to one of them; it can
 * never invent a new one. `parseCoreSettings` therefore accepts **only** these
 * four strings for a tier value and rejects (→ `null` → seed) anything else.
 */
export const CORE_TIERS = ['core', 'platform_release', 'tenant_structural', 'tenant_data'] as const
export type CoreTier = (typeof CORE_TIERS)[number]

/** What an unnamed / unknown object gets. Never `core`, never `tenant_data`. */
export const DEFAULT_CORE_TIER: CoreTier = 'tenant_structural'

/** The kinds of object a tier can be assigned to (dictionary §C.3 + the DB axis). */
export const CORE_SETTING_KINDS = ['table', 'column', 'relation', 'function', 'role', 'agent'] as const
export type CoreSettingKind = (typeof CORE_SETTING_KINDS)[number]

/* ------------------------------------------------------------------ *
 * The shape of the setting
 * ------------------------------------------------------------------ */

/**
 * The full setting: the object→tier map, the default tier, the system-column set,
 * and the reserved-entity-type set.
 *
 * **All four travel together** — the same rule §C.2b applies to the tier setting
 * (*"all three, together"*): a partial setting is a *malformed* setting, and
 * {@link parseCoreSettings} rejects it rather than guessing at the missing part.
 */
export type CoreSettings = {
  /**
   * Which object sits in which tier, keyed `kind → (id → tier)`. An object absent
   * from its kind's map lands on {@link CoreSettings.defaultTier}.
   */
  objectTier: Readonly<Record<CoreSettingKind, Readonly<Record<string, CoreTier>>>>
  /** What an object not present in the map gets. `tenant_structural` in the seed. */
  defaultTier: CoreTier
  /**
   * Column names that may **not** be claimed by a custom field and are
   * **un-removable** on a `core` table. The seed is the platform's own system
   * columns (snake_case, the storage form).
   */
  systemColumns: readonly string[]
  /**
   * Entity-type ids the entity-type **picker** must exclude — the customization
   * substrate the platform describes itself with. The seed is the 7 measured in
   * `../entities/system-entities.ts`.
   */
  reservedEntityTypes: readonly string[]
}

/* ------------------------------------------------------------------ *
 * The seed — the owner-accepted recommendation (DECISION-core-object-set.md §4)
 * ------------------------------------------------------------------ */

/**
 * The `core` (Ring 1) tables — **un-droppable, un-re-typable, columns
 * un-removable, relations fixed; nobody but a platform release may touch the
 * shape.** The owner's `DECISION-core-object-set.md` §4 Tier 1, transcribed. Each
 * is a table the platform **cannot describe itself without** (`CORE-BOUNDARY.md`
 * §0 test: *"could the platform stop being able to describe itself?"*).
 */
const SEED_CORE_TABLES = [
  // C3 — tenancy
  'tenants',
  'organizations',
  'organization_edges',
  // C2/C4 — actor and authz engine
  'users',
  'user_roles',
  'user_acls',
  'roles',
  'role_acls',
  // C2 — actor, authentication, the AI principal
  'sessions',
  'password_resets',
  'api_keys',
  // C8 — audit contract (a legal duty; a broken audit is no audit)
  'action_logs',
  'access_logs',
  // C5 — the customization substrate itself (what SD-1 writes to)
  'custom_entities',
  'custom_entities_storage',
  'custom_field_defs',
  'custom_field_values',
  'custom_field_entity_configs',
  // C5 — search / index routing
  'entity_indexes',
  'entity_index_coverage',
  'entity_index_jobs',
  'search_tokens',
  // C5 + SD-3 — the settings store itself
  'module_configs',
  // C9 — the migration ledger
  'mikro_orm_migrations',
] as const

/**
 * The `platform_release` tables — **protected from users, changeable by a platform
 * release.** The owner's `DECISION-core-object-set.md` §4 Tier 2: the platform's
 * own control surfaces and process machinery — losing one degrades a feature, not
 * the system. **Every name here is a real table**, verified against live PG 17
 * (`open-mercato`, 143 tables, 2026-10-09) — the authority_* family is spelled as
 * the DB spells it (not the `DECISION` doc's shorthand).
 */
const SEED_PLATFORM_RELEASE_TABLES = [
  // the decision / authority layer
  'authority_act_reviews',
  'authority_delegations',
  'authority_denials',
  'authority_pending_acts',
  'authority_project_memberships',
  'authority_project_records',
  'authority_projects',
  'authority_trust_grants',
  // control surfaces
  'perspectives',
  'feature_toggles',
  'feature_toggle_overrides',
  // process machinery
  'webhooks',
  'webhook_deliveries',
  'scheduled_jobs',
  'workflow_definitions',
  'record_locks',
  'encryption_maps',
] as const

/**
 * The system columns (storage form) — `RESERVED_RECORD_KEYS`' set, the 7 the
 * platform already protects from custom-field collision
 * (`core/.../entities/data/guards.ts:69`). Kept here so a `core` table's system
 * columns are un-removable as one known set, not a per-column list.
 */
const SEED_SYSTEM_COLUMNS = [
  'id',
  'tenant_id',
  'organization_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'is_active',
] as const

/**
 * **The substrate — ALWAYS reserved, whatever the setting says.** The 7 ids
 * `system-entities.ts` already reserved (the tables the platform stores its
 * *customization* in: an entity, a field, a value, and the index rows).
 *
 * This is a **Ring-1 invariant**, not a value: `parseCoreSettings` rejects any
 * `reservedEntityTypes` that does not contain all of these, because a setting that
 * dropped one would let a custom field claim the very column the platform stores
 * custom fields in — a corruption no superadmin means. A setting may **add** to the
 * reserved set; it may not **remove** the substrate. (The `SD-2b` round-2 critic
 * found this: an empty-set guard alone still accepted a *junk-only* set that
 * reopened `auth:user`.)
 */
export const SUBSTRATE_ENTITY_TYPES = Object.freeze([
  'entities:custom_entity',
  'entities:custom_entity_storage',
  'entities:custom_field_def',
  'entities:custom_field_value',
  'query_index:entity_index_row',
  'query_index:entity_index_coverage',
  'query_index:search_token',
] as const)

/**
 * The reserved entity types — the entity-type **picker's** exclusion list. This is
 * the set `isSystemEntitySelectable` consumes (`../entities/system-entities.ts`),
 * and its members are **entity ids** in the platform's `module:name` form
 * (`auth:user`, `entities:custom_field_def`) — the namespace the generated registry
 * uses (`packages/core/generated/entities.ids.generated.ts`), **not** table names.
 *
 * **The seed is the union of two things, and both are needed:**
 *
 *   1. **The substrate** — {@link SUBSTRATE_ENTITY_TYPES} (the 7). Mandatory.
 *   2. **The `core` + `platform_release` tables, in entity-id form** — the owner's
 *      database-side point (`DECISION-core-object-set.md` §3): a custom field can
 *      attach to `auth:user` / `auth:role` / `directory:tenant` / `auth:session`
 *      today because the 7-id list omits them. Their **entity ids** are added here
 *      so the picker excludes them too — closing the measured hole.
 *
 * **Why entity ids, not table names.** The gate answers *"may a custom field
 * attach to this entity id?"*, so its vocabulary must be entity ids. The tier map
 * above uses table names because the *structural* guard (SD-4, DROP/re-type) works
 * at the table layer. The two namespaces are bridged **here, in the seed** — a
 * fixed, reviewable correspondence taken from the generated registry — rather than
 * recomputed at the gate, where a wrong guess would silently reopen the hole.
 *
 * A test asserts the 7 substrate ids here equal `system-entities.ts`'s set, so the
 * two cannot drift.
 */
const SEED_RESERVED_ENTITY_TYPES = [
  // 1. The substrate — mandatory, and the parser enforces it as a subset.
  ...SUBSTRATE_ENTITY_TYPES,
  // 2. The `core` tables (owner's Tier 1), in `module:name` entity-id form,
  //    taken from packages/core/generated/entities.ids.generated.ts:
  'directory:tenant', // tenants
  'directory:organization', // organizations
  'directory:organization_edge', // organization_edges
  'auth:user', // users
  'auth:user_role', // user_roles
  'auth:user_acl', // user_acls
  'auth:role', // roles
  'auth:role_acl', // role_acls
  'auth:session', // sessions
  'auth:password_reset', // password_resets
  'api_keys:api_key', // api_keys
  'audit_logs:action_log', // action_logs
  'audit_logs:access_log', // access_logs
  'entities:custom_field_entity_config', // custom_field_entity_configs
  'query_index:entity_index_job', // entity_index_jobs
  'configs:module_config', // module_configs
  // 3. The `platform_release` tables (owner's Tier 2) that have a customizable
  //    surface, in entity-id form:
  'perspectives:perspective',
  'perspectives:role_perspective',
  'feature_toggles:feature_toggle',
  'feature_toggles:feature_toggle_override',
  'workflows:workflow_definition',
  'auth:record_lock',
  'entities:encryption_map',
] as const

/**
 * Build a `kind → (id → tier)` bucket with every kind present (an empty map),
 * **each inner map frozen**.
 *
 * **Derived from {@link CORE_SETTING_KINDS}, never re-listed.** The kinds used to
 * be spelled out here, in the parser and in the frozen return — three places that
 * had to be kept in step by hand. Adding a kind (the 2026-10-09 `agent` addition)
 * would have had to touch all three and could silently miss one. Deriving from the
 * const makes the vocabulary one source (the same discipline as S5: one list).
 *
 * **Why the inner maps are frozen.** This bucket is spread into
 * {@link DEFAULT_CORE_SETTINGS}. Before AH-1 the seed froze `objectTier` itself and
 * the two *populated* inner buckets (`table`, `role`), but the **empty** ones
 * (`column`, `relation`, `function`) were left mutable — so
 * `DEFAULT_CORE_SETTINGS.objectTier.column.evil = 'core'` succeeded and poisoned
 * the module-level seed for the whole process (the hostile-critic pass proved the
 * mutation; the HEAD construction had the identical gap, so it was pre-existing,
 * not a regression — fixed here under rule 9a, own the code you touch). Freezing
 * every inner map here closes it at the source: the parser's maps are frozen
 * separately (see {@link emptyObjectTierNullProto}), and the seed can no longer be
 * deepened into.
 */
const emptyObjectTier = (): Record<CoreSettingKind, Record<string, CoreTier>> =>
  Object.fromEntries(
    CORE_SETTING_KINDS.map((kind) => [kind, Object.freeze({}) as Record<string, CoreTier>]),
  ) as Record<CoreSettingKind, Record<string, CoreTier>>

/**
 * The same bucket with **own-key, null-prototype** inner maps — what the parser
 * returns. Kept separate from {@link emptyObjectTier} because the parser's maps
 * must not inherit from `Object.prototype` (the `__proto__` defence
 * {@link resolveCoreTier} documents).
 */
const emptyObjectTierNullProto = (): Record<CoreSettingKind, Record<string, CoreTier>> =>
  Object.fromEntries(
    CORE_SETTING_KINDS.map((kind) => [kind, Object.create(null) as Record<string, CoreTier>]),
  ) as Record<CoreSettingKind, Record<string, CoreTier>>

/**
 * **The seed — the recommendation's values, not the mechanism.**
 *
 * These are the *first* values; the setting may be edited per instance (and per
 * tenant where it makes sense), but the *reason* for each value stays in the
 * dictionary so a change can be reviewed against the standard. Transcribed from
 * the owner-accepted `DECISION-core-object-set.md` §4.
 *
 * The role entry the `SD-2` registry shipped (`superadmin`) is preserved here as
 * the seed's single `role` row, so switching the registry to read this setting is
 * **behaviour-preserving** for the one core object already in production.
 */
export const DEFAULT_CORE_SETTINGS: CoreSettings = Object.freeze({
  objectTier: Object.freeze({
    ...emptyObjectTier(),
    table: Object.freeze(
      Object.fromEntries([
        ...SEED_CORE_TABLES.map((id) => [id, 'core'] as const),
        ...SEED_PLATFORM_RELEASE_TABLES.map((id) => [id, 'platform_release'] as const),
      ]) as Record<string, CoreTier>,
    ),
    role: Object.freeze({ superadmin: 'core' } as Record<string, CoreTier>),
  }),
  defaultTier: DEFAULT_CORE_TIER,
  systemColumns: Object.freeze([...SEED_SYSTEM_COLUMNS]),
  reservedEntityTypes: Object.freeze([...SEED_RESERVED_ENTITY_TYPES]),
})

/* ------------------------------------------------------------------ *
 * Reading it back — validation first, so a bad setting cannot soften us
 * ------------------------------------------------------------------ */

const isTierValue = (value: unknown): value is CoreTier =>
  typeof value === 'string' && (CORE_TIERS as readonly string[]).includes(value)

const isSettingKind = (value: unknown): value is CoreSettingKind =>
  typeof value === 'string' && (CORE_SETTING_KINDS as readonly string[]).includes(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

/**
 * Turn whatever was stored into a {@link CoreSettings}, or `null` if it is not
 * exactly right.
 *
 * **Strict on purpose.** An unknown tier string, a non-object, a missing default,
 * a bad row inside the map — each returns `null`, and the caller then uses
 * {@link DEFAULT_CORE_SETTINGS}. Being lenient here ("coerce the bad rows, keep
 * the good ones") would mean a typo'd setting quietly changed what the platform
 * protects; the whole point of the fail-closed rule is that a *broken* setting is
 * treated as *no* setting.
 *
 * **The map is a NULL-PROTOTYPE object**, like `SD-3`'s — nothing here can collide
 * with `__proto__`/`constructor`, so a hostile key cannot land on
 * `Object.prototype` or be read back from it.
 */
export function parseCoreSettings(raw: unknown): CoreSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const defaultTier = obj.defaultTier
  if (!isTierValue(defaultTier)) return null
  // A `core` default would freeze EVERY unknown object — the platform could never
  // see a new table as ordinary. That is a degradation no superadmin means, so a
  // setting that says it is treated as malformed (→ seed), not obeyed. (A stricter
  // stance than `SD-3`, which trusts a weak-but-valid `defaultTier` to the seed;
  // here the *value* itself would break the platform, so it is rejected.)
  if (defaultTier === 'core') return null

  const systemColumns = obj.systemColumns
  if (!isStringArray(systemColumns)) return null

  const reservedEntityTypes = obj.reservedEntityTypes
  if (!isStringArray(reservedEntityTypes)) return null
  // The reserved set must contain the whole SUBSTRATE. This subsumes the old
  // empty-set check and closes the round-2 hole: a *junk-only* set (which passed an
  // empty-length test) would reopen `auth:user`. A superadmin may **add** to the
  // reserved set; they may never drop the tables the platform stores its own
  // customization in. A setting that fails is treated as malformed → the seed.
  const reservedSeen = new Set(reservedEntityTypes)
  for (const substrate of SUBSTRATE_ENTITY_TYPES) {
    if (!reservedSeen.has(substrate)) return null
  }

  const rawMap = obj.objectTier
  if (!rawMap || typeof rawMap !== 'object') return null
  const rawMapObj = rawMap as Record<string, unknown>

  const objectTier: Record<CoreSettingKind, Record<string, CoreTier>> = emptyObjectTierNullProto()
  for (const [kind, inner] of Object.entries(rawMapObj)) {
    // An unknown kind invalidates the whole setting (fail closed), rather than
    // being silently dropped — a typo'd kind must not vanish without a trace.
    if (!isSettingKind(kind)) return null
    if (!inner || typeof inner !== 'object') return null
    for (const [id, tier] of Object.entries(inner as Record<string, unknown>)) {
      if (!isTierValue(tier)) return null // one bad row invalidates the whole setting
      objectTier[kind][id] = tier
    }
  }

  return Object.freeze({
    objectTier: Object.freeze(
      Object.fromEntries(
        CORE_SETTING_KINDS.map((kind) => [kind, Object.freeze(objectTier[kind])]),
      ) as Record<CoreSettingKind, Readonly<Record<string, CoreTier>>>,
    ),
    defaultTier,
    systemColumns: Object.freeze([...systemColumns]),
    reservedEntityTypes: Object.freeze([...reservedEntityTypes]),
  })
}

/* ------------------------------------------------------------------ *
 * The pure decision — what every predicate calls
 * ------------------------------------------------------------------ */

/**
 * The tier for an object, given already-loaded settings.
 *
 * **Pure, and that is the contract.** No await, no container, no clock — so the
 * synchronous callers (`isSystemEntitySelectable` and its eight call sites) keep
 * working unchanged, and the guard can call it with an async-loaded setting.
 * Given no settings (or ones that failed validation) it uses {@link
 * DEFAULT_CORE_SETTINGS}, which fails closed.
 *
 * **Own-keys only — the same defence `SD-3` needed.** A plain `map[id]` reads the
 * *prototype chain*: `map['__proto__']` returns `Object.prototype` and
 * `map['constructor']` a function — both **truthy**, so `?? default` would keep
 * them and hand back a non-tier value for an id that was never set. An id is a
 * table/column name from a database or a user, so it can be anything, including
 * `__proto__`. Indexing only **own** keys makes an unset id (even a hostile one)
 * fall to the default.
 */
export function resolveCoreTier(
  kind: CoreSettingKind,
  id: string,
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
): CoreTier {
  if (typeof id !== 'string') return settings.defaultTier
  const bucket = settings.objectTier?.[kind]
  if (bucket && Object.prototype.hasOwnProperty.call(bucket, id)) {
    const tier = bucket[id]
    // Belt and braces: parseCoreSettings already rejects non-tier values, but a
    // setting built by hand (not through the parser) must not be trusted either.
    if (isTierValue(tier)) return tier
  }
  return settings.defaultTier
}

/* ------------------------------------------------------------------ *
 * The read — the one part that touches the database
 * ------------------------------------------------------------------ */

/**
 * The minimal slice of `ModuleConfigService` this module needs.
 *
 * Typed structurally (not imported) so `shared` does not depend on `core`'s config
 * module — the same shape `tier-source.ts` and `entity-settings.ts` use, and the
 * same law (`core → shared` must not become `shared → core`).
 */
export type CoreSettingsReader = {
  getValue: (
    moduleId: string,
    name: string,
    options?: { defaultValue?: unknown; scope?: { tenantId?: string | null } },
  ) => Promise<unknown>
}

/**
 * Load the core-set setting, falling back to the seed on any problem.
 *
 * **Two failure modes, one answer.** (1) The reader throws / the store is
 * unreachable → seed. (2) The reader returns something that is not a valid
 * {@link CoreSettings} → seed. Both give {@link DEFAULT_CORE_SETTINGS}, so the
 * platform is never *less* protected because a setting could not be read. This
 * function never throws — a caller on a hot path (a guard, a route) must not have
 * to wrap it.
 */
export async function loadCoreSettings(
  reader: CoreSettingsReader | null | undefined,
  scope?: { tenantId?: string | null },
): Promise<CoreSettings> {
  if (!reader) return DEFAULT_CORE_SETTINGS
  try {
    const raw = await reader.getValue(CORE_SETTINGS_MODULE, CORE_SETTINGS_NAME, {
      defaultValue: null,
      scope,
    })
    const parsed = parseCoreSettings(raw)
    return parsed ?? DEFAULT_CORE_SETTINGS
  } catch {
    return DEFAULT_CORE_SETTINGS
  }
}

/**
 * Convenience: load the setting, then resolve one object against it.
 *
 * For a route or guard that has a reader and one object but no other reason to
 * hold the settings object. Pure callers use {@link resolveCoreTier} directly.
 */
export async function resolveCoreTierWithReader(
  kind: CoreSettingKind,
  id: string,
  reader: CoreSettingsReader | null | undefined,
  scope?: { tenantId?: string | null },
): Promise<CoreTier> {
  return resolveCoreTier(kind, id, await loadCoreSettings(reader, scope))
}
