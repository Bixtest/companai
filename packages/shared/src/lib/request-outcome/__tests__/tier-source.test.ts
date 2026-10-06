/**
 * D1 — the tier mapping as a SETTING (owner, 2026-10-06; dictionary §C.2b).
 *
 * **What this suite has to prove, and why each part is here.** The owner's rule has
 * two halves and both are load-bearing:
 *
 *   1. **It is a setting** — a change to the stored value changes what the platform
 *      decides, with no code change. Proven by reading a *different* mapping and
 *      seeing a *different* tier out of the same pure function.
 *   2. **It fails closed** — a missing or malformed setting must never *soften* the
 *      default. This is the half that is easy to get wrong, so it is proven against
 *      every shape of bad input, not one: non-object, wrong-tier string, missing
 *      default, missing level, one bad row inside an otherwise good map, and a
 *      reader that throws.
 *
 * A test that only showed "a setting is read" would pass against an implementation
 * that trusts the setting blindly — which is the exact defect §C.2b forbids. So the
 * failing-closed cases are the majority here on purpose.
 */

import {
  DEFAULT_TIER_SETTINGS,
  TIER_SETTINGS_MODULE,
  TIER_SETTINGS_NAME,
  TIER_TO_LEVEL,
  loadTierSettings,
  parseTierSettings,
  resolveTier,
  resolveTierWithReader,
} from '../tier-source'
import type { TierSettings, TierSettingsReader } from '../tier-source'
import { tierForChange, triageRequest } from '../triage'
import { UNRECOGNISED_CHANGE_TIER } from '../types'
import type { ChangeRiskTier } from '../types'

/* A well-formed setting, used as the "it is a setting" baseline. */
const configured: TierSettings = {
  changeKindTier: { add_optional_field: 'safe', drop_column: 'explicit_approval' },
  defaultTier: 'review_required',
  fallbackLevel: 'review',
}

/* A reader that returns a fixed stored value — the store, stubbed at its edge. */
const readerReturning = (value: unknown): TierSettingsReader => ({
  getValue: async () => value,
})

describe('the seed fails closed, not open', () => {
  it('defaults to the strictest tier for an unrecognised kind', () => {
    expect(DEFAULT_TIER_SETTINGS.defaultTier).toBe(UNRECOGNISED_CHANGE_TIER)
    expect(UNRECOGNISED_CHANGE_TIER).toBe('explicit_approval')
  })

  it('seeds an EMPTY map — so nothing is silently tiered safe', () => {
    expect(Object.keys(DEFAULT_TIER_SETTINGS.changeKindTier)).toHaveLength(0)
    for (const kind of ['add_entity', 'add_field', 'drop_column', 'anything']) {
      expect(resolveTier(kind)).toBe(UNRECOGNISED_CHANGE_TIER)
    }
  })

  it('maps the fallback LEVEL to the strictest tier, not to straight', () => {
    // The level must match the tier, or the S11 fallback would be softer than the
    // tier table it is supposed to be "the tier table with default values".
    expect(DEFAULT_TIER_SETTINGS.fallbackLevel).toBe(TIER_TO_LEVEL['explicit_approval'])
    expect(DEFAULT_TIER_SETTINGS.fallbackLevel).not.toBe('straight')
  })
})

describe('the values are a SETTING — changing them changes the answer', () => {
  it('resolves a kind through a supplied setting', () => {
    expect(resolveTier('add_optional_field', configured)).toBe('safe')
    expect(resolveTier('drop_column', configured)).toBe('explicit_approval')
  })

  it('uses the configured default for a kind the setting does not name', () => {
    expect(resolveTier('never_heard_of_it', configured)).toBe('review_required')
    // ...and the same kind WITHOUT the setting still fails closed. This is the
    // before/after that proves the setting is doing the work.
    expect(resolveTier('never_heard_of_it')).toBe(UNRECOGNISED_CHANGE_TIER)
  })

  it('the pure triage honours an injected setting — a real behaviour change', () => {
    const need = {
      reads: false,
      writes: true,
      requiresNewStructure: true,
      change: { kind: 'add_optional_field', summary: 'Add an optional field' },
    }
    // Seed: unrecognised → strictest.
    expect(triageRequest(need).tier).toBe(UNRECOGNISED_CHANGE_TIER)
    // Configured: the same kind is now `safe`. Same input, different decision —
    // and the decision came from data, not code.
    expect(triageRequest(need, configured).tier).toBe('safe')
  })

  it('tierForChange reads the setting when one is given', () => {
    expect(tierForChange({ kind: 'drop_column', summary: 'x' }, configured)).toBe('explicit_approval')
    expect(tierForChange({ kind: 'drop_column', summary: 'x' })).toBe(UNRECOGNISED_CHANGE_TIER)
  })
})

describe('a malformed setting is treated as NO setting (fail closed)', () => {
  const bad: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['a string', 'safe'],
    ['a number', 42],
    ['an array', ['safe']],
    ['empty object (no default)', {}],
    ['unknown default tier', { ...configured, defaultTier: 'kinda_safe' }],
    ['missing fallback level', { ...configured, fallbackLevel: undefined }],
    ['unknown fallback level', { ...configured, fallbackLevel: 'whenever' }],
    ['missing changeKindTier', { defaultTier: 'safe', fallbackLevel: 'straight' }],
    ['one bad row inside a good map', { ...configured, changeKindTier: { good: 'safe', bad: 'nope' } }],
    ['a non-object map', { ...configured, changeKindTier: 'safe' }],
  ]

  for (const [label, value] of bad) {
    it(`rejects ${label} and falls back to the seed`, () => {
      expect(parseTierSettings(value)).toBeNull()
    })
  }

  it('loadTierSettings returns the SEED (not the bad value) on every bad input', async () => {
    for (const [, value] of bad) {
      const settings = await loadTierSettings(readerReturning(value))
      expect(settings.defaultTier).toBe(UNRECOGNISED_CHANGE_TIER)
      expect(settings.changeKindTier).toEqual({})
    }
  })

  it('a reader that THROWS also yields the seed — never a softened default', async () => {
    const exploding: TierSettingsReader = {
      getValue: async () => {
        throw new Error('store unreachable')
      },
    }
    const settings = await loadTierSettings(exploding)
    expect(settings.defaultTier).toBe(UNRECOGNISED_CHANGE_TIER)
  })

  it('a missing reader yields the seed', async () => {
    expect((await loadTierSettings(null)).defaultTier).toBe(UNRECOGNISED_CHANGE_TIER)
    expect((await loadTierSettings(undefined)).defaultTier).toBe(UNRECOGNISED_CHANGE_TIER)
  })
})

describe('a hostile setting cannot soften the default by tricking the lookup', () => {
  it('__proto__ and constructor as change kinds still fail closed when unset', () => {
    // A change kind is a string from a database or a classifier, so it can be
    // anything — including a prototype key. Before the fix, `map['__proto__']` read
    // Object.prototype (truthy), so `?? default` kept a non-tier value instead of
    // falling back. Now only OWN keys are read, so an unset hostile key falls to the
    // default — the seed's strictest.
    for (const hostile of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(resolveTier(hostile)).toBe(UNRECOGNISED_CHANGE_TIER)
      expect(resolveTier(hostile, DEFAULT_TIER_SETTINGS)).toBe(UNRECOGNISED_CHANGE_TIER)
    }
  })

  it('a map with a literal __proto__ OWN key does not leak the prototype, and other keys are unaffected', () => {
    // JSON.parse gives a real own `__proto__` key (it does not set the prototype the
    // way `obj.__proto__ = x` does). parseTierSettings builds a null-prototype map,
    // so reading it can never reach Object.prototype. The point of this test is that
    // a hostile key in the SETTING cannot poison lookups for OTHER keys.
    const parsed = parseTierSettings(
      JSON.parse('{"changeKindTier":{"__proto__":"safe","real_kind":"review_required"},"defaultTier":"explicit_approval","fallbackLevel":"approval"}'),
    )
    expect(parsed).not.toBeNull()
    if (!parsed) return
    // An unrelated, unset kind still fails closed — the pollution did not spread.
    expect(resolveTier('some_other_kind', parsed)).toBe(UNRECOGNISED_CHANGE_TIER)
    // A real key in the same map is honoured.
    expect(resolveTier('real_kind', parsed)).toBe('review_required')
    // Object.prototype must be untouched.
    expect(({} as Record<string, unknown>).constructor).toBe(Object)
  })

  it('the seed is frozen, so no caller can mutate the platform default', () => {
    expect(Object.isFrozen(DEFAULT_TIER_SETTINGS)).toBe(true)
    expect(Object.isFrozen(DEFAULT_TIER_SETTINGS.changeKindTier)).toBe(true)
  })
})

describe('the reader is wired to the right key and returns a valid setting when the store is good', () => {
  it('reads module request_outcome / structureChangeTiers, and parses it back', async () => {
    const calls: Array<{ moduleId: string; name: string }> = []
    const reader: TierSettingsReader = {
      getValue: async (moduleId, name) => {
        calls.push({ moduleId, name })
        return configured
      },
    }
    const settings = await loadTierSettings(reader, { tenantId: 't1' })
    expect(calls).toEqual([{ moduleId: TIER_SETTINGS_MODULE, name: TIER_SETTINGS_NAME }])
    expect(settings).toEqual(configured)
  })

  it('resolveTierWithReader is the load-then-decide convenience', async () => {
    const tier: ChangeRiskTier = await resolveTierWithReader('add_optional_field', readerReturning(configured))
    expect(tier).toBe('safe')
  })

  it('round-trips every valid shape of the setting', () => {
    for (const tier of ['safe', 'review_required', 'explicit_approval'] as ChangeRiskTier[]) {
      for (const level of ['straight', 'review', 'approval', 'never'] as const) {
        const s = { changeKindTier: { k: tier }, defaultTier: tier, fallbackLevel: level }
        expect(parseTierSettings(s)).toEqual(s)
      }
    }
  })

  it('the SEED survives the real round-trip: written to the store, read back, still fails closed', async () => {
    // This is the dictionary -> `restore-defaults` -> store -> reader path, walked
    // end to end. The seed is written as-is (as the CLI does), serialised the way a
    // JSON column would store it, and read back through the same reader the app
    // uses. What must survive is the *fail-closed* property: an unrecognised kind
    // still lands on the strictest tier after the trip.
    const stored = JSON.parse(JSON.stringify(DEFAULT_TIER_SETTINGS))
    const settings = await loadTierSettings(readerReturning(stored))
    expect(settings).toEqual(DEFAULT_TIER_SETTINGS)
    expect(settings.defaultTier).toBe(UNRECOGNISED_CHANGE_TIER)
    expect(resolveTier('some_kind_not_in_the_map', settings)).toBe(UNRECOGNISED_CHANGE_TIER)
  })
})
