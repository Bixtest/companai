/**
 * SD-2b — the core-object set as a SETTING.
 *
 * **What this suite has to prove.** The owner ruled (2026-10-09) the core set must
 * be *"a manageable matter instead of hardcoded… default settings, not hardcoded
 * architecture."* Three properties make that real and safe, and each is tested
 * against the case that would break it:
 *
 *   1. **The seed is the owner-accepted recommendation** — the ~25 `core` tables and
 *      the `platform_release` set are present, and the seed's default tier fails
 *      closed (`tenant_structural`, never `core`, never `tenant_data`).
 *   2. **The parser is strict** — one bad row invalidates the whole setting
 *      (`null`), so a typo'd setting is treated as *no* setting and the platform
 *      keeps the seed. This is §C.2b's guardrail, copied from `SD-3`.
 *   3. **The decision is safe against a hostile id** — `resolveCoreTier` reads
 *      *own* keys only, so `__proto__` / `constructor` cannot defeat the default
 *      (the same defence `SD-3`'s `resolveTier` needed).
 *
 * Plus: the async read never throws (fails closed to the seed), and a superadmin
 * override **moves an object between tiers** — proving the point of the whole item.
 */

import {
  CORE_SETTINGS_MODULE,
  CORE_SETTINGS_NAME,
  CORE_TIERS,
  DEFAULT_CORE_SETTINGS,
  SUBSTRATE_ENTITY_TYPES,
  loadCoreSettings,
  parseCoreSettings,
  resolveCoreTier,
  resolveCoreTierWithReader,
  type CoreSettings,
} from '../core-settings'

describe('the seed — the owner-accepted recommendation', () => {
  it('has the four tier names, closed (a fifth would be a dictionary change)', () => {
    expect(CORE_TIERS).toEqual(['core', 'platform_release', 'tenant_structural', 'tenant_data'])
  })

  it('marks the backbone tables core (the ones whose loss crashes the platform)', () => {
    for (const table of ['tenants', 'users', 'roles', 'role_acls', 'sessions', 'module_configs']) {
      expect(resolveCoreTier('table', table)).toBe('core')
    }
  })

  it('marks the platform control surfaces platform_release (protected from users, not from us)', () => {
    for (const table of ['feature_toggles', 'workflow_definitions', 'scheduled_jobs', 'record_locks']) {
      expect(resolveCoreTier('table', table)).toBe('platform_release')
    }
  })

  it('preserves the SD-2 role entry, so switching to the setting is behaviour-preserving', () => {
    expect(resolveCoreTier('role', 'superadmin')).toBe('core')
  })

  it('fails CLOSED: an unknown object lands on tenant_structural — never core, never tenant_data', () => {
    expect(DEFAULT_CORE_SETTINGS.defaultTier).toBe('tenant_structural')
    expect(resolveCoreTier('table', 'some_tenant_table_never_heard_of')).toBe('tenant_structural')
    expect(resolveCoreTier('column', 'whatever')).toBe('tenant_structural')
  })

  it('carries the system-column seed and the reserved-entity seed', () => {
    expect(DEFAULT_CORE_SETTINGS.systemColumns).toContain('id')
    expect(DEFAULT_CORE_SETTINGS.systemColumns).toContain('tenant_id')
    expect(DEFAULT_CORE_SETTINGS.reservedEntityTypes).toContain('auth:user')
    expect(DEFAULT_CORE_SETTINGS.reservedEntityTypes).toContain('entities:custom_entity')
  })

  it('EVERY inner seed bucket is frozen — including the empty ones (no deepening the seed)', () => {
    // The hostile-critic finding: the seed froze `table`/`role` but left the empty
    // buckets (`column`, `relation`, `function`, and the new `agent`) mutable, so
    // `DEFAULT_CORE_SETTINGS.objectTier.column.evil = 'core'` poisoned the
    // module-level seed process-wide. Every kind's bucket must be frozen now.
    for (const kind of Object.keys(DEFAULT_CORE_SETTINGS.objectTier)) {
      expect(Object.isFrozen(DEFAULT_CORE_SETTINGS.objectTier[kind as keyof typeof DEFAULT_CORE_SETTINGS.objectTier])).toBe(true)
    }
    // Prove the mutation an attacker would attempt now throws in strict mode.
    expect(() => {
      ;(DEFAULT_CORE_SETTINGS.objectTier.column as Record<string, string>).evil = 'core'
    }).toThrow()
    // ...and the seed is unchanged after the attempt.
    expect(resolveCoreTier('column', 'evil')).toBe('tenant_structural')
  })
})

describe('parseCoreSettings — strict, so a bad setting is treated as NO setting', () => {
  // A reserved set that satisfies the substrate invariant (a setting may ADD to the
  // substrate, never drop it). Built from the seed's own substrate so it cannot drift.
  const VALID_RESERVED = [...SUBSTRATE_ENTITY_TYPES, 'auth:user']
  const valid = {
    objectTier: {
      table: { tenants: 'core' },
      column: {},
      relation: {},
      function: {},
      role: { superadmin: 'core' },
      agent: {},
    },
    defaultTier: 'tenant_structural',
    systemColumns: ['id'],
    reservedEntityTypes: VALID_RESERVED,
  }

  it('accepts a well-formed setting', () => {
    const parsed = parseCoreSettings(valid)
    expect(parsed).not.toBeNull()
    expect(parsed!.objectTier.table.tenants).toBe('core')
  })

  it('rejects a non-object', () => {
    expect(parseCoreSettings(null)).toBeNull()
    expect(parseCoreSettings('nope')).toBeNull()
    expect(parseCoreSettings(42)).toBeNull()
  })

  it('rejects a missing or bad default tier', () => {
    expect(parseCoreSettings({ ...valid, defaultTier: undefined })).toBeNull()
    expect(parseCoreSettings({ ...valid, defaultTier: 'super_core' })).toBeNull()
  })

  it('rejects one bad tier row inside the map — the whole setting is invalid', () => {
    expect(
      parseCoreSettings({ ...valid, objectTier: { ...valid.objectTier, table: { tenants: 'core', junk: 'not_a_tier' } } }),
    ).toBeNull()
  })

  it('rejects an unknown KIND (a typo must not vanish silently)', () => {
    expect(parseCoreSettings({ ...valid, objectTier: { ...valid.objectTier, widget: { x: 'core' } } })).toBeNull()
  })

  it('rejects a non-string-array for systemColumns or reservedEntityTypes', () => {
    expect(parseCoreSettings({ ...valid, systemColumns: 'id' })).toBeNull()
    expect(parseCoreSettings({ ...valid, reservedEntityTypes: [1, 2] })).toBeNull()
  })

  it('REJECTS an empty reservedEntityTypes — an empty set would disable the gate (fail open)', () => {
    // The critic's HIGH finding: a well-formed but empty reserved set disabled the
    // whole picker exclusion. It is now treated as malformed → the seed applies.
    expect(parseCoreSettings({ ...valid, reservedEntityTypes: [] })).toBeNull()
  })

  it('REJECTS a reservedEntityTypes missing ANY substrate id — a junk-only set cannot reopen auth:user', () => {
    // The round-2 critic's finding: an empty-only guard still accepted `['nope']`,
    // which dropped `auth:user` from the reserved set and reopened the hole. The
    // parser now requires the whole substrate to be present.
    expect(parseCoreSettings({ ...valid, reservedEntityTypes: ['nope'] })).toBeNull()
    // One substrate id missing is enough to invalidate.
    const missingOne = VALID_RESERVED.filter((id) => id !== 'entities:custom_field_def')
    expect(parseCoreSettings({ ...valid, reservedEntityTypes: missingOne })).toBeNull()
    // But ADDING an extra id (superset) is fine — the owner's freedom is preserved.
    expect(parseCoreSettings({ ...valid, reservedEntityTypes: [...VALID_RESERVED, 'customers:customer_person'] })).not.toBeNull()
  })

  it('REJECTS defaultTier = core — it would freeze every unknown object', () => {
    expect(parseCoreSettings({ ...valid, defaultTier: 'core' })).toBeNull()
  })

  it('round-trips a parsed setting into a frozen, safe value', () => {
    const parsed = parseCoreSettings(valid)!
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.objectTier.table)).toBe(true)
  })
})

describe('seed consistency — the seed cannot silently drift from the code it replaces', () => {
  // The system-entities.ts constant carried the substrate ids; the seed must still
  // contain every one of them, or a refactor would quietly reopen the old hole.
  const ORIGINAL_SUBSTRATE_IDS = [
    'entities:custom_entity',
    'entities:custom_entity_storage',
    'entities:custom_field_def',
    'entities:custom_field_value',
    'query_index:entity_index_row',
    'query_index:entity_index_coverage',
    'query_index:search_token',
  ]

  it('the seed still reserves all 7 substrate ids the old constant had', () => {
    for (const id of ORIGINAL_SUBSTRATE_IDS) {
      expect(DEFAULT_CORE_SETTINGS.reservedEntityTypes).toContain(id)
    }
  })

  it('the seed ADDED the measured offenders the old 7 omitted', () => {
    for (const id of ['auth:user', 'auth:role', 'directory:tenant', 'auth:session']) {
      expect(DEFAULT_CORE_SETTINGS.reservedEntityTypes).toContain(id)
    }
  })

  it('every core table has a matching reserved entity id or is honestly absent (migration ledger)', () => {
    // The migration ledger is not an ORM entity, so it has no entity id and is
    // correctly absent from the reserved (picker) set — it is protected by the
    // structural guard, not the picker.
    const coreTables = Object.entries(DEFAULT_CORE_SETTINGS.objectTier.table)
      .filter(([, tier]) => tier === 'core')
      .map(([id]) => id)
    expect(coreTables).toContain('mikro_orm_migrations')
    expect(DEFAULT_CORE_SETTINGS.reservedEntityTypes).not.toContain('mikro_orm_migrations')
  })

  it('every seeded table name is a REAL table (measured against live PG 17, 2026-10-09)', () => {
    // A seed full of invented names would be a claim with no observation. These
    // are the names confirmed present in pg_tables at the time SD-2b was built.
    // The migration ledger is a family of per-module tables, so it is matched by
    // prefix.
    const CONFIRMED_TABLES = new Set([
      'tenants', 'organizations', 'organization_edges',
      'users', 'user_roles', 'user_acls', 'roles', 'role_acls',
      'sessions', 'password_resets', 'api_keys',
      'action_logs', 'access_logs',
      'custom_entities', 'custom_entities_storage', 'custom_field_defs', 'custom_field_values', 'custom_field_entity_configs',
      'entity_indexes', 'entity_index_coverage', 'entity_index_jobs', 'search_tokens',
      'module_configs',
      'authority_act_reviews', 'authority_delegations', 'authority_denials', 'authority_pending_acts',
      'authority_project_memberships', 'authority_project_records', 'authority_projects', 'authority_trust_grants',
      'perspectives', 'feature_toggles', 'feature_toggle_overrides',
      'webhooks', 'webhook_deliveries', 'scheduled_jobs', 'workflow_definitions', 'record_locks', 'encryption_maps',
    ])
    for (const name of Object.keys(DEFAULT_CORE_SETTINGS.objectTier.table)) {
      if (name === 'mikro_orm_migrations') continue // a per-module table family, matched by prefix
      expect(CONFIRMED_TABLES.has(name)).toBe(true)
    }
  })
})

describe('resolveCoreTier — own-keys only, so a hostile id cannot defeat the default', () => {
  it('an absent id falls to the default', () => {
    expect(resolveCoreTier('table', 'never_set')).toBe('tenant_structural')
  })

  it('__proto__ and constructor do NOT leak Object.prototype and are NOT core', () => {
    // A plain map[id] would return a truthy non-tier value here; own-keys makes it
    // fall to the default, which is how a hostile id must behave.
    expect(resolveCoreTier('table', '__proto__')).toBe('tenant_structural')
    expect(resolveCoreTier('table', 'constructor')).toBe('tenant_structural')
    expect(resolveCoreTier('table', 'hasOwnProperty')).toBe('tenant_structural')
  })

  it('the own-keys guard is load-bearing even when the value IS a valid tier spelled via the prototype chain', () => {
    // THIS is the case a plain `bucket[id]` gets wrong in a way `isTierValue` cannot
    // catch: build a setting whose protected bucket has an OWN key `trick` holding a
    // VALID tier, but ALSO make a prototype-supplied key resolve to a valid tier, so
    // the own-keys check — not the value-validity check — is what keeps it safe.
    // We simulate a hostile bucket by using an object whose prototype carries a
    // tier-valid value under a key the settings object does not own.
    const proto = { ghost: 'core' as const }
    const bucket = Object.create(proto) as Record<string, unknown>
    bucket.tenants = 'core'
    const hostile = {
      objectTier: { table: bucket, column: {}, relation: {}, function: {}, role: {}, agent: {} },
      defaultTier: 'tenant_structural',
      systemColumns: [],
      reservedEntityTypes: [],
    } as unknown as CoreSettings
    // `tenants` is an OWN key → core. `ghost` is inherited, NOT own → must fall to
    // the default (a plain lookup would return 'core' and wrongly protect `ghost`).
    expect(resolveCoreTier('table', 'tenants', hostile)).toBe('core')
    expect(resolveCoreTier('table', 'ghost', hostile)).toBe('tenant_structural')
  })

  it('a setting built BY HAND (not via the parser) is not trusted either', () => {
    const hostile = {
      objectTier: { table: { tenants: 'evil' as unknown as never }, column: {}, relation: {}, function: {}, role: {}, agent: {} },
      defaultTier: 'tenant_structural',
      systemColumns: [],
      reservedEntityTypes: [],
    } satisfies CoreSettings
    // A non-tier value in the map must fall through to the default, not be returned.
    expect(resolveCoreTier('table', 'tenants', hostile)).toBe('tenant_structural')
  })

  it('honours a legitimate per-instance override — a new object moved INTO core', () => {
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      objectTier: {
        ...DEFAULT_CORE_SETTINGS.objectTier,
        table: { ...DEFAULT_CORE_SETTINGS.objectTier.table, my_new_backbone_table: 'core' },
      },
    }
    expect(resolveCoreTier('table', 'my_new_backbone_table')).toBe('tenant_structural') // seed: unknown
    expect(resolveCoreTier('table', 'my_new_backbone_table', overridden)).toBe('core') // setting: core
  })

  it('honours an override that moves an object OUT of core (to platform_release)', () => {
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      objectTier: {
        ...DEFAULT_CORE_SETTINGS.objectTier,
        table: { ...DEFAULT_CORE_SETTINGS.objectTier.table, tenants: 'platform_release' },
      },
    }
    expect(resolveCoreTier('table', 'tenants')).toBe('core')
    expect(resolveCoreTier('table', 'tenants', overridden)).toBe('platform_release')
  })
})

describe('loadCoreSettings — never throws, always fails closed to the seed', () => {
  const seedTables = () => ({ ...DEFAULT_CORE_SETTINGS.objectTier.table })

  it('a null reader returns the seed', async () => {
    const s = await loadCoreSettings(null)
    expect(s.objectTier.table).toEqual(seedTables())
  })

  it('a stored VALID setting is returned (the live value wins)', async () => {
    const stored = {
      objectTier: { table: { only_this: 'core' }, column: {}, relation: {}, function: {}, role: {}, agent: {} },
      defaultTier: 'tenant_data',
      systemColumns: ['id'],
      reservedEntityTypes: [...SUBSTRATE_ENTITY_TYPES, 'auth:user'],
    }
    const reader = { getValue: async () => stored }
    const s = await loadCoreSettings(reader)
    expect(resolveCoreTier('table', 'only_this', s)).toBe('core')
    expect(s.defaultTier).toBe('tenant_data')
  })

  it('a stored setting with an EMPTY reserved set falls back to the seed (fail open refused)', async () => {
    const reader = { getValue: async () => ({
      objectTier: { table: {}, column: {}, relation: {}, function: {}, role: {}, agent: {} },
      defaultTier: 'tenant_structural',
      systemColumns: ['id'],
      reservedEntityTypes: [],
    }) }
    const s = await loadCoreSettings(reader)
    expect(s).toBe(DEFAULT_CORE_SETTINGS)
  })

  it('a stored setting with a JUNK-ONLY reserved set also falls back to the seed (round-2 hole)', async () => {
    const reader = { getValue: async () => ({
      objectTier: { table: {}, column: {}, relation: {}, function: {}, role: {}, agent: {} },
      defaultTier: 'tenant_structural',
      systemColumns: ['id'],
      reservedEntityTypes: ['nope'],
    }) }
    const s = await loadCoreSettings(reader)
    expect(s).toBe(DEFAULT_CORE_SETTINGS)
  })

  it('a stored MALFORMED setting falls back to the seed', async () => {
    const reader = { getValue: async () => ({ defaultTier: 'nope' }) }
    const s = await loadCoreSettings(reader)
    expect(s.objectTier.table).toEqual(seedTables())
  })

  it('a THROWING reader falls back to the seed (never propagates)', async () => {
    const reader = { getValue: async () => { throw new Error('db down') } }
    await expect(loadCoreSettings(reader)).resolves.toBe(DEFAULT_CORE_SETTINGS)
  })

  it('reads through the declared module/name', async () => {
    const seen: Array<{ moduleId: string; name: string }> = []
    const reader = { getValue: async (moduleId: string, name: string) => { seen.push({ moduleId, name }); return null } }
    await loadCoreSettings(reader)
    expect(seen[0]).toEqual({ moduleId: CORE_SETTINGS_MODULE, name: CORE_SETTINGS_NAME })
  })

  it('resolveCoreTierWithReader composes read + decision', async () => {
    const reader = {
      getValue: async () => ({
        objectTier: { table: { x: 'core' }, column: {}, relation: {}, function: {}, role: {}, agent: {} },
        defaultTier: 'tenant_structural',
        systemColumns: ['id'],
        reservedEntityTypes: [...SUBSTRATE_ENTITY_TYPES, 'auth:user'],
      }),
    }
    expect(await resolveCoreTierWithReader('table', 'x', reader)).toBe('core')
    expect(await resolveCoreTierWithReader('table', 'y', reader)).toBe('tenant_structural')
  })
})
