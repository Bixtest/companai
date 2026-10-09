/**
 * SD-2 / S9 — the core-object registry.
 *
 * **What this suite has to prove.** The registry is the one place that answers
 * *"is this object core — undeletable by anyone?"*. Three things make it real, and
 * each is tested against the case that would break it:
 *
 *   1. **The owner's named surface IS core** — the roles-and-permissions manager
 *      (`superadmin`) reads `isCoreObject('role', 'superadmin') === true`. Without
 *      this the whole item is a mechanism with no first entry.
 *   2. **The match is exact and safe** — a near-miss (`'superadmin2'`, `'super'`,
 *      an empty string, a non-string) is **not** core, so the rule does not
 *      over-block ordinary roles. Case is folded so a stored `SuperAdmin` cannot
 *      slip past.
 *   3. **A refusal names a reason and never throws** — `coreObjectRefusal` returns
 *      the reason (dictionary S3: tell the user why) and `null` for a deletable
 *      object, so the caller — not this module — decides how to surface it.
 */

import {
  CORE_OBJECT_KINDS,
  coreObjectFor,
  coreObjectRefusal,
  coreObjectRenameRefusal,
  coreObjects,
  isCoreObject,
  isCoreObjectKind,
  loadCoreObjects,
} from '../core-objects'
import { DEFAULT_CORE_SETTINGS, SUBSTRATE_ENTITY_TYPES, resolveCoreTier, type CoreSettings } from '../core-settings'

describe('isCoreObject — the owner\'s named surface is core', () => {
  it('the roles-and-permissions manager (superadmin) is core', () => {
    expect(isCoreObject('role', 'superadmin')).toBe(true)
  })

  it('case is folded, so a stored SuperAdmin cannot slip past the rule', () => {
    expect(isCoreObject('role', 'SuperAdmin')).toBe(true)
    expect(isCoreObject('role', 'SUPERADMIN')).toBe(true)
  })

  it('surrounding whitespace does not defeat the match', () => {
    expect(isCoreObject('role', '  superadmin  ')).toBe(true)
  })
})

describe('isCoreObject — a near-miss is NOT core (no over-blocking)', () => {
  it('a different name is not core', () => {
    expect(isCoreObject('role', 'superadmin2')).toBe(false)
    expect(isCoreObject('role', 'super')).toBe(false)
    expect(isCoreObject('role', 'admin')).toBe(false)
    expect(isCoreObject('role', 'employee')).toBe(false)
  })

  it('an empty or whitespace-only id is not core', () => {
    expect(isCoreObject('role', '')).toBe(false)
    expect(isCoreObject('role', '   ')).toBe(false)
  })

  it('a non-string id is not core (never a crash)', () => {
    // The public signature is `string`, but a caller in JS (or a JSON payload) can
    // hand anything, and a throw here would be the fail-open this must avoid.
    expect(isCoreObject('role', undefined as unknown as string)).toBe(false)
    expect(isCoreObject('role', null as unknown as string)).toBe(false)
    expect(isCoreObject('role', 42 as unknown as string)).toBe(false)
  })
})

describe('coreObjectFor — the object and its reason', () => {
  it('returns the core object with its since and because', () => {
    const core = coreObjectFor('role', 'superadmin')
    expect(core).not.toBeNull()
    expect(core!.kind).toBe('role')
    expect(core!.id).toBe('superadmin')
    expect(core!.because).toContain('roles-and-permissions manager')
    expect(core!.since).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns null for a non-core object', () => {
    expect(coreObjectFor('role', 'admin')).toBeNull()
  })
})

describe('coreObjectRefusal — a reason, never a throw', () => {
  it('names the reason and the because for a core object', () => {
    const refusal = coreObjectRefusal('role', 'superadmin')
    expect(refusal).not.toBeNull()
    expect(refusal!.reason).toBe('"superadmin" is a core role and cannot be deleted.')
    expect(refusal!.because).toContain('roles-and-permissions manager')
  })

  it('returns null for a deletable object (the caller proceeds)', () => {
    expect(coreObjectRefusal('role', 'admin')).toBeNull()
  })
})

describe('the registry is exposed read-only and the kind set is closed', () => {
  it('coreObjects() lists the first entry and cannot be mutated through the return', () => {
    const list = coreObjects() as CoreObject[]
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('superadmin')
    // The array is a copy: a caller pushing into it does not change the registry.
    list.push({ kind: 'role', id: 'injected', since: '1999-01-01', because: 'x' })
    expect(coreObjects()).toHaveLength(1)
  })

  it('the kind set is exactly the declared kinds', () => {
    // `agent` joined the row-level registry kinds in AH-1 (2026-10-09): an agent
    // row may be marked core, so it carries a delete/rename refusal here. `role`
    // remains the first; both are declared, and the set is closed to anything else.
    expect(CORE_OBJECT_KINDS).toEqual(['role', 'agent'])
    expect(isCoreObjectKind('role')).toBe(true)
    expect(isCoreObjectKind('agent')).toBe(true)
    expect(isCoreObjectKind('function')).toBe(false)
    expect(isCoreObjectKind(undefined)).toBe(false)
  })
})

describe('the durable is_core marker (CC-31(a), owner ruling 2026-10-09)', () => {
  it('a row flagged is_core is core EVEN when its id is not in the setting', () => {
    // The whole point of the column: the marker travels with the row through a
    // rename, so the registry cannot forget it. 'restructured_ops' is unknown to
    // the seed.
    expect(isCoreObject('role', 'restructured_ops')).toBe(false)
    expect(isCoreObject('role', 'restructured_ops', undefined, { isCore: true })).toBe(true)
  })

  it('coreObjectFor returns the object with the kind\'s one reason for a flagged row', () => {
    const core = coreObjectFor('role', 'restructured_ops', undefined, { isCore: true })
    expect(core).not.toBeNull()
    expect(core!.id).toBe('restructured_ops')
    expect(core!.because).toContain('roles-and-permissions manager')
  })

  it('is_core = false does NOT weaken the name lookup (additive, never subtractive)', () => {
    // An un-migrated row (or a caller that did not select the column) is exactly as
    // protected as before.
    expect(isCoreObject('role', 'superadmin', undefined, { isCore: false })).toBe(true)
    expect(isCoreObject('role', 'superadmin', undefined, {})).toBe(true)
  })

  it('a false marker on a non-core name is still not core (no fail-open)', () => {
    expect(isCoreObject('role', 'admin', undefined, { isCore: false })).toBe(false)
  })

  it('the durable MARKER wins over the setting when the two disagree (Option B precedence)', () => {
    // Precedence, stated honestly: when the setting moves a name OUT of core but the
    // row carries `is_core = true`, the MARKER wins — the row stays core.
    //
    // Why the marker, and not the setting: Option B exists so that a rename cannot
    // disarm the guard. If the setting could override the marker by name, a rename
    // to a name the setting marks `platform_release` would re-open the hole — the
    // precise attack the owner ruled against ("one main superadmin that is
    // undeletable … additional superadmins the main one can delete by renaming them
    // FIRST"). The setting remains authoritative for objects the marker does not
    // cover: a name the setting lists as core with no row flag, and any name the
    // setting moves between tiers, are both decided by the setting (see the SD-2b
    // tests above). The marker is a durable floor, not a competing list.
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      objectTier: { ...DEFAULT_CORE_SETTINGS.objectTier, role: { superadmin: 'platform_release' } },
    }
    // The setting alone would call it non-core...
    expect(isCoreObject('role', 'superadmin', overridden)).toBe(false)
    // ...but the row's durable marker keeps it core.
    expect(isCoreObject('role', 'superadmin', overridden, { isCore: true })).toBe(true)
    // And with no marker, the setting's demotion IS honoured (the setting is not
    // ignored — it is only ever overridden by an explicit per-row core flag).
    expect(isCoreObject('role', 'superadmin', overridden, { isCore: false })).toBe(false)
  })
})

describe('coreObjectRenameRefusal — a different act, said in the word for the act', () => {
  it('names the rename, not the delete, for a core object', () => {
    const refusal = coreObjectRenameRefusal('role', 'superadmin')
    expect(refusal).not.toBeNull()
    expect(refusal!.reason).toBe('"superadmin" is a core role and cannot be renamed.')
    expect(refusal!.because).toContain('recognis')
    // The rename reason names WHAT must not lose recognition — and does not paste
    // the delete clause into a rename sentence (the AH-1 regression this pins).
    expect(refusal!.because).toContain('the surface that manages roles and permissions')
    expect(refusal!.because).not.toContain('deleting it removes')
  })

  it('returns null for a renameable object (the caller proceeds)', () => {
    expect(coreObjectRenameRefusal('role', 'admin')).toBeNull()
  })

  it('honours the durable marker (a renamed core row is still refused)', () => {
    const refusal = coreObjectRenameRefusal('role', 'renamed_long_ago', undefined, { isCore: true })
    expect(refusal).not.toBeNull()
    expect(refusal!.reason).toContain('renamed_long_ago')
  })
})

describe('the registry reads the SETTING — a tier change moves an object (SD-2b)', () => {
  it('a role moved OUT of core is no longer core (the setting is honoured, not ignored)', () => {
    // The seed makes superadmin core. An override that moves it to another tier
    // must make isCoreObject false — this is the whole point of SD-2b, and it is
    // what a registry that ignored the tier would get wrong.
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      objectTier: { ...DEFAULT_CORE_SETTINGS.objectTier, role: { superadmin: 'platform_release' } },
    }
    expect(isCoreObject('role', 'superadmin')).toBe(true) // seed
    expect(isCoreObject('role', 'superadmin', overridden)).toBe(false) // setting wins
    expect(coreObjectFor('role', 'superadmin', overridden)).toBeNull()
  })

  it('a NEW role added to core IS core, and is listed by coreObjects() (no deploy)', () => {
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      objectTier: {
        ...DEFAULT_CORE_SETTINGS.objectTier,
        role: { ...DEFAULT_CORE_SETTINGS.objectTier.role, billing_admin: 'core' },
      },
    }
    expect(isCoreObject('role', 'billing_admin')).toBe(false) // seed: unknown
    expect(isCoreObject('role', 'billing_admin', overridden)).toBe(true) // setting
    const ids = coreObjects(overridden).map((o) => o.id).sort()
    expect(ids).toEqual(['billing_admin', 'superadmin'])
  })

  it('loadCoreObjects reads the live setting through a reader', async () => {
    const stored = {
      objectTier: { table: {}, column: {}, relation: {}, function: {}, role: { ops_admin: 'core' }, agent: {} },
      defaultTier: 'tenant_structural',
      systemColumns: ['id'],
      reservedEntityTypes: [...SUBSTRATE_ENTITY_TYPES, 'auth:user'],
    }
    const reader = { getValue: async () => stored }
    const ids = (await loadCoreObjects(reader)).map((o) => o.id)
    expect(ids).toEqual(['ops_admin'])
  })
})

// A local type only so the mutation-in-the-test above typechecks.
type CoreObject = ReturnType<typeof coreObjects>[number]

/**
 * AH-1 (2026-10-09) — an **agent** is a core-object kind.
 *
 * **What this proves.** The owner ruled the agent's protection is a per-object
 * SETTING, like a table's (`DECISION-agent-protection-tier.md`): a superadmin marks
 * ONE agent core, and that agent — and only that agent — cannot be deleted or
 * renamed by a tenant. This suite drives the registry the way the guard does
 * (`core-object-guard.ts`), so the refusal is proven at the surface a delete route
 * actually calls, not by inspecting the settings object directly.
 *
 * **What it must NOT do.** The seed stays fail-closed: an agent that no one has
 * marked core is `tenant_structural` (ordinary, deletable), never silently `core`.
 * That is the difference between "agents can be protected" and "all agents are
 * protected" — and over-blocking every agent would be as wrong as protecting none.
 */
describe('an agent is a core-object kind (AH-1, 2026-10-09)', () => {
  /** A setting that marks exactly one agent core — the superadmin's act. */
  const withCoreAgent = (id: string): CoreSettings => ({
    ...DEFAULT_CORE_SETTINGS,
    objectTier: {
      ...DEFAULT_CORE_SETTINGS.objectTier,
      agent: { ...DEFAULT_CORE_SETTINGS.objectTier.agent, [id]: 'core' },
    },
  })

  it('the seed does NOT make any agent core (fail-closed: agents are business data by default)', () => {
    // An agent the seed never heard of — which is every agent, since the seed's
    // agent map is empty — is ordinary. Never `core`, never protected.
    expect(resolveCoreTier('agent', 'support_bot')).toBe('tenant_structural')
    expect(isCoreObject('agent', 'support_bot')).toBe(false)
    expect(coreObjectRefusal('agent', 'support_bot')).toBeNull()
  })

  it('a superadmin marks ONE agent core via the SETTING — and it is then core', () => {
    const settings = withCoreAgent('support_bot')
    // The seed disagrees...
    expect(isCoreObject('agent', 'support_bot')).toBe(false)
    // ...the setting wins, with no code change and no deploy.
    expect(resolveCoreTier('agent', 'support_bot', settings)).toBe('core')
    expect(isCoreObject('agent', 'support_bot', settings)).toBe(true)
  })

  it('a core agent is REFUSED on delete, with the agent reason (not the role reason)', () => {
    const refusal = coreObjectRefusal('agent', 'support_bot', withCoreAgent('support_bot'))
    expect(refusal).not.toBeNull()
    expect(refusal!.reason).toBe('"support_bot" is a core agent and cannot be deleted.')
    // The reason is the AGENT one — proving the per-kind `because` map is keyed
    // correctly and an agent does not inherit the role's words.
    expect(refusal!.because).toContain('agent machinery')
    expect(refusal!.because).not.toContain('roles-and-permissions manager')
  })

  it('a core agent is REFUSED on rename (the CC-31(a) hole, closed for agents too)', () => {
    const refusal = coreObjectRenameRefusal('agent', 'support_bot', withCoreAgent('support_bot'))
    expect(refusal).not.toBeNull()
    expect(refusal!.reason).toBe('"support_bot" is a core agent and cannot be renamed.')
    expect(refusal!.because).toContain('recognis')
    // The agent rename reason names the marker (its own sentence, not the role's).
    expect(refusal!.because).toContain('marker travels with the row')
    expect(refusal!.because).not.toContain('roles and permissions')
  })

  it('marking ONE agent core does NOT protect the others (per-object, not per-kind)', () => {
    const settings = withCoreAgent('support_bot')
    expect(isCoreObject('agent', 'support_bot', settings)).toBe(true)
    // A sibling agent, not marked, stays deletable — the whole point of a
    // per-object setting rather than a blanket "all agents are core".
    expect(isCoreObject('agent', 'sales_bot', settings)).toBe(false)
    expect(coreObjectRefusal('agent', 'sales_bot', settings)).toBeNull()
  })

  it('coreObjects() lists a core agent alongside the core role', () => {
    const objs = coreObjects(withCoreAgent('support_bot'))
    const agents = objs.filter((o) => o.kind === 'agent')
    expect(agents.map((o) => o.id)).toEqual(['support_bot'])
    expect(agents[0].because).toContain('agent machinery')
    // The role entry is unaffected by the agent addition.
    expect(objs.some((o) => o.kind === 'role' && o.id === 'superadmin')).toBe(true)
  })

  it('an agent can also be protected by the durable marker (the is_core column, forward-compatible)', () => {
    // No agent column exists yet (it needs a migration — CC-31(a)); the registry
    // already honours a marker for any kind, so the day an agent row carries one it
    // is core with no further registry change.
    expect(isCoreObject('agent', 'renamed_agent', undefined, { isCore: true })).toBe(true)
    const refusal = coreObjectRefusal('agent', 'renamed_agent', undefined, { isCore: true })
    expect(refusal!.because).toContain('agent machinery')
  })
})
