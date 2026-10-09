/**
 * SD-4 Slice C — the structural-permission grammar as a setting (S11/S12).
 *
 * **What this suite has to prove.** The grammar is a *closed* set (a setting may
 * move an object between levels; it may never invent a verb, an actor or a level),
 * it *fails closed* (a broken setting is treated as no setting, and an unknown
 * triple is never `straight`), and it *inherits* (an unset row falls to the
 * strictest default, never to an exemption). Each is proven against the case that
 * would break it — the same shape the `SD-3` (`tier-source`) and `SD-2b`
 * (`core-settings`) suites use.
 */

import {
  actorTypeForPrincipal,
  DEFAULT_STRUCTURAL_LEVEL,
  DEFAULT_STRUCTURAL_SETTINGS,
  explicitStructuralLevel,
  inheritedStructuralLevel,
  loadStructuralSettings,
  parseStructuralSettings,
  resolveStructuralLevel,
  resolveStructuralLevelForPrincipal,
  structuralSettingsEqual,
  structuralSettingsGrid,
  STRUCTURAL_ACTOR_TYPES,
  STRUCTURAL_LEVELS,
  STRUCTURAL_OBJECT_KINDS,
  STRUCTURAL_SETTINGS_MODULE,
  STRUCTURAL_SETTINGS_NAME,
  type StructuralSettings,
  withStructuralLevel,
} from '../structural-settings'
import { STRUCTURAL_VERBS } from '../catalogue'

describe('the seed — the mechanism, with the values unset (fails closed)', () => {
  it('ships no explicit rules', () => {
    // The owner has not yet ruled which (object, verb, actor) sits at which level,
    // so the seed must invent nothing.
    for (const objectKind of STRUCTURAL_OBJECT_KINDS) {
      for (const verb of STRUCTURAL_VERBS) {
        for (const actor of STRUCTURAL_ACTOR_TYPES) {
          // Each unresolved triple falls to the default, which is never `straight`.
          const level = resolveStructuralLevel(objectKind, verb, actor)
          expect(level).toBe(DEFAULT_STRUCTURAL_LEVEL)
        }
      }
    }
  })

  it('never resolves any triple to `straight` out of the box', () => {
    for (const objectKind of STRUCTURAL_OBJECT_KINDS) {
      for (const verb of STRUCTURAL_VERBS) {
        for (const actor of STRUCTURAL_ACTOR_TYPES) {
          expect(resolveStructuralLevel(objectKind, verb, actor)).not.toBe('straight')
        }
      }
    }
  })

  it('the default level is the strictest (approval), matching SD-3’s fallback', () => {
    expect(DEFAULT_STRUCTURAL_LEVEL).toBe('approval')
    expect(DEFAULT_STRUCTURAL_SETTINGS.defaultLevel).toBe('approval')
    expect(inheritedStructuralLevel()).toBe('approval')
  })
})

describe('parseStructuralSettings — strict, so a bad setting cannot soften us', () => {
  const valid = {
    rules: { column: { add: { ai: 'review' } } },
    defaultLevel: 'approval',
  }

  it('parses a well-formed setting', () => {
    const parsed = parseStructuralSettings(valid)
    expect(parsed).not.toBeNull()
    expect(resolveStructuralLevel('column', 'add', 'ai', parsed as StructuralSettings)).toBe('review')
  })

  it('rejects anything that is not an object', () => {
    for (const bad of [null, undefined, 42, 'x', [], true]) {
      expect(parseStructuralSettings(bad)).toBeNull()
    }
  })

  it('rejects a missing or unknown defaultLevel', () => {
    expect(parseStructuralSettings({ rules: {} })).toBeNull()
    expect(parseStructuralSettings({ rules: {}, defaultLevel: 'sometimes' })).toBeNull()
  })

  it('rejects a `straight` default — it would open every undeclared change', () => {
    expect(parseStructuralSettings({ rules: {}, defaultLevel: 'straight' })).toBeNull()
  })

  it('rejects an unknown object kind (the grammar stays closed)', () => {
    expect(parseStructuralSettings({ rules: { spaceship: { add: { ai: 'review' } } }, defaultLevel: 'approval' })).toBeNull()
  })

  it('rejects an unknown verb (the grammar stays closed)', () => {
    expect(parseStructuralSettings({ rules: { column: { destroy: { ai: 'review' } } }, defaultLevel: 'approval' })).toBeNull()
  })

  it('rejects an unknown actor type (the grammar stays closed)', () => {
    expect(parseStructuralSettings({ rules: { column: { add: { robot: 'review' } } }, defaultLevel: 'approval' })).toBeNull()
  })

  it('rejects an unknown level on any row (one bad row invalidates the whole setting)', () => {
    expect(parseStructuralSettings({ rules: { column: { add: { ai: 'maybe' } } }, defaultLevel: 'approval' })).toBeNull()
  })

  it('rejects a non-object at any axis', () => {
    expect(parseStructuralSettings({ rules: { column: 'nope' }, defaultLevel: 'approval' })).toBeNull()
    expect(parseStructuralSettings({ rules: { column: { add: 'nope' } }, defaultLevel: 'approval' })).toBeNull()
    expect(parseStructuralSettings({ rules: { column: { add: { ai: {} } } }, defaultLevel: 'approval' })).toBeNull()
  })

  it('a parsed setting is frozen', () => {
    const parsed = parseStructuralSettings(valid) as StructuralSettings
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.rules)).toBe(true)
  })
})

describe('resolveStructuralLevel — the three-axis lookup, and its inheritance', () => {
  const settings: StructuralSettings = parseStructuralSettings({
    rules: {
      column: { add: { ai: 'review', human: 'straight', any: 'approval' }, remove: { any: 'never' } },
      table: { read: { any: 'straight' } },
    },
    defaultLevel: 'approval',
  }) as StructuralSettings

  it('returns the exact (object, verb, actor) level when set', () => {
    expect(resolveStructuralLevel('column', 'add', 'ai', settings)).toBe('review')
    expect(resolveStructuralLevel('column', 'add', 'human', settings)).toBe('straight')
  })

  it('falls to the `any`-actor row for the verb when the exact actor is unset', () => {
    // `column.remove` has only an `any` row → both human and ai inherit `never`.
    expect(resolveStructuralLevel('column', 'remove', 'ai', settings)).toBe('never')
    expect(resolveStructuralLevel('column', 'remove', 'human', settings)).toBe('never')
  })

  it('falls to the default level when the (object, verb) is unset', () => {
    // `column.edit` was never set → the default (strictest), never `straight`.
    expect(resolveStructuralLevel('column', 'edit', 'ai', settings)).toBe('approval')
    // `widget` was never set at all.
    expect(resolveStructuralLevel('widget', 'add', 'ai', settings)).toBe('approval')
  })

  it('the exact actor row wins over the `any` row (specificity order)', () => {
    // `column.add.any` is `approval`, but the exact `ai` row is `review` and wins.
    expect(resolveStructuralLevel('column', 'add', 'ai', settings)).toBe('review')
    // An actor with no exact row (there are only three, all set here) still works.
    expect(resolveStructuralLevel('column', 'add', 'any', settings)).toBe('approval')
  })

  it('an unset triple is a placement, never an exemption (never `straight` by default)', () => {
    const empty = DEFAULT_STRUCTURAL_SETTINGS
    expect(resolveStructuralLevel('agent', 'reference', 'ai', empty)).toBe('approval')
  })

  it('is own-keys only — a hostile key (`__proto__`) falls to the default', () => {
    // A plain `map[k]` would read Object.prototype; own-keys makes it fall through.
    const hostile = parseStructuralSettings({ rules: {}, defaultLevel: 'never' }) as StructuralSettings
    expect(resolveStructuralLevel('__proto__' as never, '__proto__' as never, '__proto__' as never, hostile)).toBe('never')
    expect(resolveStructuralLevel('constructor' as never, 'constructor' as never, 'constructor' as never, hostile)).toBe('never')
  })
})

describe('actorTypeForPrincipal — the S12 bridge from a PrincipalKind', () => {
  it('maps a human to `human`', () => {
    expect(actorTypeForPrincipal('human')).toBe('human')
  })

  it('maps every machine kind to `ai` (S12: the AI never inherits a human’s reach)', () => {
    expect(actorTypeForPrincipal('ai_worker')).toBe('ai')
    expect(actorTypeForPrincipal('service')).toBe('ai')
    expect(actorTypeForPrincipal('system')).toBe('ai')
  })

  it('maps an unknown kind to the `any` wildcard', () => {
    expect(actorTypeForPrincipal(undefined)).toBe('any')
    expect(actorTypeForPrincipal(null)).toBe('any')
  })

  it('is total — every input yields one of the declared actor types', () => {
    for (const kind of ['human', 'ai_worker', 'service', 'system', undefined, null] as const) {
      expect(STRUCTURAL_ACTOR_TYPES).toContain(actorTypeForPrincipal(kind))
    }
  })
})

describe('resolveStructuralLevelForPrincipal — the guard’s own call shape', () => {
  const settings: StructuralSettings = parseStructuralSettings({
    rules: { column: { add: { ai: 'never', human: 'straight' } } },
    defaultLevel: 'approval',
  }) as StructuralSettings

  it('a machine principal is judged as `ai`, a human as `human`', () => {
    expect(resolveStructuralLevelForPrincipal('column', 'add', 'ai_worker', settings)).toBe('never')
    expect(resolveStructuralLevelForPrincipal('column', 'add', 'service', settings)).toBe('never')
    expect(resolveStructuralLevelForPrincipal('column', 'add', 'human', settings)).toBe('straight')
  })

  it('an unresolved principal kind falls to the `any` axis, then the default', () => {
    expect(resolveStructuralLevelForPrincipal('column', 'add', undefined, settings)).toBe('approval')
  })
})

/**
 * CC-37 — the function the reserved-surface guard asks *"did a person choose a
 * level here?"* It must return `null` when only the fail-closed **default** would
 * apply, because the absolute S9 refusal may be loosened **only** by a level a
 * person chose (never by the seed's `approval` default — that would weaken S9).
 *
 * This block was added **after** a mutation (M16: make `explicitStructuralLevel`
 * return `settings.defaultLevel` instead of `null`) went undetected by every other
 * test in the repo except the core guard's end-to-end — proving this contract was
 * unpinned in its **own** module. Regression guard for that gap.
 */
describe('explicitStructuralLevel — an explicit rule only, never the default (CC-37)', () => {
  it('returns `null` for the empty seed, even though the default is `approval`', () => {
    // The load-bearing case: the seed's default must NOT read as an explicit rule.
    expect(explicitStructuralLevel('column', 'remove', 'human', DEFAULT_STRUCTURAL_SETTINGS)).toBeNull()
    expect(DEFAULT_STRUCTURAL_SETTINGS.defaultLevel).toBe('approval') // the temptation it must resist
  })

  it('returns the explicit level when a rule reaches the triple', () => {
    const settings = parseStructuralSettings({
      rules: { column: { remove: { human: 'review' } } },
      defaultLevel: 'approval',
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'remove', 'human', settings)).toBe('review')
  })

  it('falls to the `any` row when there is no row for the exact actor', () => {
    const settings = parseStructuralSettings({
      rules: { column: { remove: { any: 'approval' } } },
      defaultLevel: 'approval',
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'remove', 'human', settings)).toBe('approval')
  })

  it('returns `null` for a triples the rules do not reach (wrong verb / actor / object)', () => {
    const settings = parseStructuralSettings({
      rules: { column: { remove: { human: 'review' } } },
      defaultLevel: 'approval',
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'edit', 'human', settings)).toBeNull() // wrong verb
    expect(explicitStructuralLevel('column', 'remove', 'ai', settings)).toBeNull() // wrong actor
    expect(explicitStructuralLevel('table', 'remove', 'human', settings)).toBeNull() // wrong object
  })

  it('returns `null` for the `any` actor on an unreached triple — never the default', () => {
    // **The case that reaches the function's final `return null`.** For any actor
    // *other* than `any`, the `findLevel('any')` branch returns first, so only
    // `actorType === 'any'` exercises the last line. A mutation that swapped that
    // `null` for `settings.defaultLevel` (the S9-weakening regression) was invisible
    // until this case existed — the seed's `approval` default would have read as a
    // chosen level. Both the seed and a partial rule set must answer `null` here.
    expect(explicitStructuralLevel('column', 'remove', 'any', DEFAULT_STRUCTURAL_SETTINGS)).toBeNull()
    const settings = parseStructuralSettings({
      rules: { column: { remove: { human: 'review' } } }, // no `any` row for this verb
      defaultLevel: 'approval',
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'remove', 'any', settings)).toBeNull()
  })

  it('is own-keys only: a hostile key yields `null`, not a prototype value', () => {
    const hostile = parseStructuralSettings({
      rules: { column: { add: { ai: 'never' } } },
      defaultLevel: 'approval',
    }) as StructuralSettings
    expect(explicitStructuralLevel('__proto__' as never, '__proto__' as never, '__proto__' as never, hostile)).toBeNull()
    expect(explicitStructuralLevel('constructor' as never, 'constructor' as never, 'constructor' as never, hostile)).toBeNull()
  })
})

describe('loadStructuralSettings — the read, and its fail-closed fallback', () => {
  it('returns the seed when there is no reader', async () => {
    expect(await loadStructuralSettings(null)).toEqual(DEFAULT_STRUCTURAL_SETTINGS)
    expect(await loadStructuralSettings(undefined)).toEqual(DEFAULT_STRUCTURAL_SETTINGS)
  })

  it('reads a valid setting through the reader', async () => {
    const reader = {
      getValue: async () => ({ rules: { column: { add: { ai: 'review' } } }, defaultLevel: 'approval' }),
    }
    const loaded = await loadStructuralSettings(reader)
    expect(resolveStructuralLevel('column', 'add', 'ai', loaded)).toBe('review')
  })

  it('falls back to the seed when the reader returns a malformed value', async () => {
    const reader = { getValue: async () => ({ defaultLevel: 'straight' }) }
    expect(await loadStructuralSettings(reader)).toEqual(DEFAULT_STRUCTURAL_SETTINGS)
  })

  it('never throws — a reader that throws yields the seed', async () => {
    const reader = {
      getValue: async () => {
        throw new Error('store unreachable')
      },
    }
    await expect(loadStructuralSettings(reader)).resolves.toEqual(DEFAULT_STRUCTURAL_SETTINGS)
  })

  it('asks the store for this feature’s own key', async () => {
    let asked: [string, string] | null = null
    const reader = {
      getValue: async (moduleId: string, name: string) => {
        asked = [moduleId, name]
        return null
      },
    }
    await loadStructuralSettings(reader)
    expect(asked).toEqual([STRUCTURAL_SETTINGS_MODULE, STRUCTURAL_SETTINGS_NAME])
  })
})

describe('the level set — one union, shared with SD-3', () => {
  it('the four levels are spelled the way the dictionary spells them', () => {
    expect([...STRUCTURAL_LEVELS]).toEqual(['straight', 'review', 'approval', 'never'])
  })
})

/**
 * SD-5 — the manage screen's data shape. These are the three pure functions the
 * page renders and writes with; keeping them here (not in the page) means the UI
 * cannot drift from the grammar the guard reads.
 */
describe('structuralSettingsGrid — the grid the manage screen renders (SD-5)', () => {
  it('yields one cell per (object × verb × actor), in declaration order', () => {
    const grid = structuralSettingsGrid()
    expect(grid).toHaveLength(
      STRUCTURAL_OBJECT_KINDS.length * STRUCTURAL_VERBS.length * STRUCTURAL_ACTOR_TYPES.length,
    )
    expect(grid[0]).toMatchObject({ objectKind: 'table', verb: 'read', actorType: 'human' })
  })

  it('a cell with no rule shows the default as its effective level, and null as explicit', () => {
    const cell = structuralSettingsGrid(DEFAULT_STRUCTURAL_SETTINGS).find(
      (c) => c.objectKind === 'column' && c.verb === 'remove' && c.actorType === 'human',
    )
    expect(cell?.explicit).toBeNull()
    expect(cell?.effective).toBe(DEFAULT_STRUCTURAL_LEVEL)
  })

  it('a cell with an explicit rule shows it as both explicit and effective', () => {
    const settings = parseStructuralSettings({
      rules: { column: { remove: { human: 'review' } } },
      defaultLevel: 'approval',
    }) as StructuralSettings
    const cell = structuralSettingsGrid(settings).find(
      (c) => c.objectKind === 'column' && c.verb === 'remove' && c.actorType === 'human',
    )
    expect(cell?.explicit).toBe('review')
    expect(cell?.effective).toBe('review')
  })
})

describe('withStructuralLevel — one cell edit, immutably (SD-5)', () => {
  it('sets an explicit rule for the exact triple', () => {
    const next = withStructuralLevel(DEFAULT_STRUCTURAL_SETTINGS, {
      objectKind: 'column',
      verb: 'remove',
      actorType: 'ai',
      level: 'never',
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'remove', 'ai', next)).toBe('never')
    // The input is untouched.
    expect(explicitStructuralLevel('column', 'remove', 'ai', DEFAULT_STRUCTURAL_SETTINGS)).toBeNull()
  })

  it('stores only the cell a person chose — every other cell stays unset', () => {
    const next = withStructuralLevel(DEFAULT_STRUCTURAL_SETTINGS, {
      objectKind: 'column',
      verb: 'remove',
      actorType: 'ai',
      level: 'never',
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'remove', 'human', next)).toBeNull()
    expect(explicitStructuralLevel('column', 'add', 'ai', next)).toBeNull()
    expect(explicitStructuralLevel('table', 'remove', 'ai', next)).toBeNull()
  })

  it('clears a cell back to inheritance when `level` is null (removes the row, does not store the default)', () => {
    const withRuleSet = withStructuralLevel(DEFAULT_STRUCTURAL_SETTINGS, {
      objectKind: 'column',
      verb: 'remove',
      actorType: 'ai',
      level: 'never',
    }) as StructuralSettings
    const cleared = withStructuralLevel(withRuleSet, {
      objectKind: 'column',
      verb: 'remove',
      actorType: 'ai',
      level: null,
    }) as StructuralSettings
    expect(explicitStructuralLevel('column', 'remove', 'ai', cleared)).toBeNull()
    expect(structuralSettingsEqual(cleared, DEFAULT_STRUCTURAL_SETTINGS)).toBe(true)
  })

  it('the result round-trips through parseStructuralSettings (the screen writes what a reader accepts)', () => {
    const next = withStructuralLevel(DEFAULT_STRUCTURAL_SETTINGS, {
      objectKind: 'function',
      verb: 'edit',
      actorType: 'any',
      level: 'approval',
    }) as StructuralSettings
    const reparsed = parseStructuralSettings(JSON.parse(JSON.stringify(next)))
    expect(reparsed).not.toBeNull()
    expect(explicitStructuralLevel('function', 'edit', 'any', reparsed as StructuralSettings)).toBe('approval')
  })

  it('rejects an invalid triple or level (returns null, never a coercion)', () => {
    const base = DEFAULT_STRUCTURAL_SETTINGS
    expect(withStructuralLevel(base, { objectKind: 'nope' as never, verb: 'remove', actorType: 'ai', level: 'never' })).toBeNull()
    expect(withStructuralLevel(base, { objectKind: 'column', verb: 'nope' as never, actorType: 'ai', level: 'never' })).toBeNull()
    expect(withStructuralLevel(base, { objectKind: 'column', verb: 'remove', actorType: 'nope' as never, level: 'never' })).toBeNull()
    expect(withStructuralLevel(base, { objectKind: 'column', verb: 'remove', actorType: 'ai', level: 'nope' as never })).toBeNull()
  })

  it('preserves the default level (an edit never lowers the fail-closed floor)', () => {
    const next = withStructuralLevel(DEFAULT_STRUCTURAL_SETTINGS, {
      objectKind: 'column',
      verb: 'remove',
      actorType: 'ai',
      level: 'straight',
    }) as StructuralSettings
    expect(next.defaultLevel).toBe(DEFAULT_STRUCTURAL_SETTINGS.defaultLevel)
  })
})

describe('structuralSettingsEqual — the screen’s dirty check (SD-5)', () => {
  it('is true for a value equal to the seed, and for a round-tripped copy', () => {
    expect(structuralSettingsEqual(DEFAULT_STRUCTURAL_SETTINGS, DEFAULT_STRUCTURAL_SETTINGS)).toBe(true)
    const copy = parseStructuralSettings(JSON.parse(JSON.stringify(DEFAULT_STRUCTURAL_SETTINGS))) as StructuralSettings
    expect(structuralSettingsEqual(DEFAULT_STRUCTURAL_SETTINGS, copy)).toBe(true)
  })

  it('is false when an explicit rule differs, or the default differs', () => {
    const withRule = withStructuralLevel(DEFAULT_STRUCTURAL_SETTINGS, {
      objectKind: 'column',
      verb: 'remove',
      actorType: 'ai',
      level: 'never',
    }) as StructuralSettings
    expect(structuralSettingsEqual(DEFAULT_STRUCTURAL_SETTINGS, withRule)).toBe(false)
    const otherDefault = parseStructuralSettings({
      rules: {},
      defaultLevel: 'review',
    }) as StructuralSettings
    expect(structuralSettingsEqual(DEFAULT_STRUCTURAL_SETTINGS, otherDefault)).toBe(false)
  })

  it('ignores raw-shape differences (key presence/order) between equivalent settings', () => {
    // The parsed value is fully normalised (every object kind / verb present). The
    // other value is HAND-BUILT with the same explicit rows but a raw shape a
    // `JSON.stringify` equality would call DIFFERENT: only the one object kind, a
    // different key order, and extra empty verb buckets. `structuralSettingsEqual`
    // must call them equal — that is the whole reason it compares cell by cell over
    // the closed sets instead of deep-equalling the raw object.
    const parsed = parseStructuralSettings({
      rules: { column: { remove: { ai: 'never' } } },
      defaultLevel: 'approval',
    }) as StructuralSettings

    const handBuilt = {
      rules: {
        column: { add: {}, remove: { ai: 'never' }, reference: {} },
        table: {},
      },
      defaultLevel: 'approval',
    } as unknown as StructuralSettings

    // Sanity: this pair really does differ raw-shape-wise, so the assertion below
    // is not vacuous.
    expect(JSON.stringify(parsed)).not.toEqual(JSON.stringify(handBuilt))

    expect(structuralSettingsEqual(parsed, handBuilt)).toBe(true)
    expect(structuralSettingsEqual(handBuilt, parsed)).toBe(true)
  })
})
