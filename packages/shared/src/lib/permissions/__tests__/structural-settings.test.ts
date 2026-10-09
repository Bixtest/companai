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
  STRUCTURAL_ACTOR_TYPES,
  STRUCTURAL_LEVELS,
  STRUCTURAL_OBJECT_KINDS,
  STRUCTURAL_SETTINGS_MODULE,
  STRUCTURAL_SETTINGS_NAME,
  type StructuralSettings,
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
