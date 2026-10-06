/**
 * The tier mapping as a SETTING, not a constant (D1 / SD-3 — owner, 2026-10-06).
 *
 * **What this is.** The home for the three values that were previously frozen in
 * code: (1) which *change kind* sits in which risk tier, (2) the *default* tier for
 * an unnamed kind, and (3) the structural-permission fallback level. All three are
 * read from the platform's existing settings store (`module_configs`) through
 * {@link ModuleConfigService}, so a **superadmin can change them without a deploy**
 * — which is the owner's instruction, verbatim:
 *
 * > *"concerning tiers, default ones and concerning fallbacks. let's not make it
 * > hardcoded but a setting a superadmin can change."*
 *
 * **Why a module this small exists.** The owner's rule has two halves that must not
 * drift apart: the *values* live in settings, but the *reason* for each value stays
 * in the specifications dictionary (`SPECIFICATIONS-DICTIONARY.md` §C.2b), which is
 * the seed. So this module holds the seed, the reader, and the fail-closed rule in
 * one place — the single source both `triage.ts` and the structural guard read from
 * (dictionary §C.2b: *"read through a function, not a constant, so the two call
 * sites share one source"*).
 *
 * **Why it lives in `shared`, and why it is pure-ish.** The law in this repo is
 * `ai-assistant -> shared`, never the reverse (`shared/src/modules/overrides.ts`).
 * The triage that consumes this is in `shared`, so the source must be too. And the
 * triage is a **pure function by contract** (see `triage.ts`'s header: *"no model
 * call, no database, no clock"*). We keep that promise by **separating the read
 * from the decision**: {@link loadTierSettings} is the only part that touches the
 * database (through an injected resolver), and {@link resolveTier} is a pure
 * function over an already-loaded {@link TierSettings}. The triage calls the pure
 * one; a route or a guard calls the async one and passes the result in.
 *
 * **Fail closed, always.** A missing, malformed or partially-written setting must
 * never soften the default. Every path that cannot read a valid value returns
 * {@link DEFAULT_TIER_SETTINGS}, whose default tier is the strictest
 * (`explicit_approval`) — never `safe`. The dictionary's §C.2b guardrail is
 * explicit: *"Missing/invalid setting -> explicit_approval, never safe."*
 *
 * Source: `library/development/SPECIFICATIONS-DICTIONARY.md` §C.2b (the owner's
 * decision + the storage shape); `library/development/BUILD-ORDER.md` §2 D1;
 * `library/development/ARCHITECTURE-structure-permissions.md` §4.
 */

import type { ChangeRiskTier } from './types'
import { CHANGE_RISK_TIERS, UNRECOGNISED_CHANGE_TIER } from './types'

/* ------------------------------------------------------------------ *
 * Where the setting lives
 * ------------------------------------------------------------------ */

/**
 * The settings key, copied from the shape the platform already uses for policies
 * (`entities` / `newEntitiesRestrictedByDefault` — `entities/api/entity-settings.ts`).
 * Module `request_outcome` is this feature's own module; the name says what it is.
 */
export const TIER_SETTINGS_MODULE = 'request_outcome'
export const TIER_SETTINGS_NAME = 'structureChangeTiers'

/* ------------------------------------------------------------------ *
 * The shape of the setting
 * ------------------------------------------------------------------ */

/**
 * The structural-permission *level* (S11), kept as its own small union here so the
 * setting can carry the fallback the grammar needs without importing the whole
 * structural-permission type into `shared`.
 *
 * The wording is the owner's (architecture doc §2 "the levels a verb can be
 * permitted at"). It maps onto the existing risk tiers, which is what makes the
 * fallback "the tier table with the standards' default values" rather than a
 * second scheme.
 */
export type StructurePermissionLevel = 'straight' | 'review' | 'approval' | 'never'

/** The level each tier maps to — the bridge between the tier table and S11. */
export const TIER_TO_LEVEL: Readonly<Record<ChangeRiskTier, StructurePermissionLevel>> = Object.freeze({
  safe: 'straight',
  review_required: 'review',
  explicit_approval: 'approval',
})

/**
 * The full setting: the kind→tier map, the default tier, and the fallback level.
 *
 * **All three travel together** because the dictionary (§C.2b) says they become a
 * setting "all three, together" — a partial setting (say, a map with no default)
 * is a malformed setting, and {@link parseTierSettings} rejects it rather than
 * guessing at the missing part.
 */
export type TierSettings = {
  /**
   * Which change *kind* sits in which tier. Empty means every change is
   * unrecognised and lands on {@link TierSettings.defaultTier}.
   */
  changeKindTier: Readonly<Record<string, ChangeRiskTier>>
  /** What a kind not present in the map gets. Never `safe` in the seed. */
  defaultTier: ChangeRiskTier
  /** Where an unconfigured structure object lands (S11/Q2). */
  fallbackLevel: StructurePermissionLevel
}

/**
 * **The seed — the dictionary's values, not the mechanism.**
 *
 * These are the *first* values; the setting may be edited, but the reason for each
 * stays in the dictionary so a change can be reviewed against the standard. The
 * seed's `changeKindTier` is **empty on purpose** — the same honest state the old
 * frozen object had: the mapping from change kind to tier is not decided, so every
 * change currently lands on the strictest default. When the dictionary's table
 * gains rows, they are copied here as the seed AND written to settings as the live
 * value; the two are meant to agree, and a test asserts the seed itself fails closed.
 *
 * `defaultTier` is `explicit_approval` — {@link UNRECOGNISED_CHANGE_TIER}, the
 * strictest — and `fallbackLevel` is `approval`, its S11 equivalent.
 */
export const DEFAULT_TIER_SETTINGS: TierSettings = Object.freeze({
  changeKindTier: Object.freeze({}),
  defaultTier: UNRECOGNISED_CHANGE_TIER,
  fallbackLevel: TIER_TO_LEVEL[UNRECOGNISED_CHANGE_TIER],
})

/* ------------------------------------------------------------------ *
 * Reading it back — validation first, so a bad setting cannot soften us
 * ------------------------------------------------------------------ */

const isTier = (value: unknown): value is ChangeRiskTier =>
  typeof value === 'string' && (CHANGE_RISK_TIERS as readonly string[]).includes(value)

const isLevel = (value: unknown): value is StructurePermissionLevel =>
  value === 'straight' || value === 'review' || value === 'approval' || value === 'never'

/**
 * Turn whatever was stored into a {@link TierSettings}, or `null` if it is not
 * exactly right.
 *
 * **Strict on purpose.** An unknown tier string, a non-object, a missing default —
 * each returns `null`, and the caller then uses {@link DEFAULT_TIER_SETTINGS}.
 * Being lenient here ("coerce the bad rows, keep the good ones") would mean a
 * typo'd setting quietly changed what the platform permits; the whole point of the
 * fail-closed rule is that a *broken* setting is treated as *no* setting.
 */
export function parseTierSettings(raw: unknown): TierSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const defaultTier = obj.defaultTier
  if (!isTier(defaultTier)) return null

  const fallbackLevel = obj.fallbackLevel
  if (!isLevel(fallbackLevel)) return null

  const rawMap = obj.changeKindTier
  if (!rawMap || typeof rawMap !== 'object') return null
  // A NULL-PROTOTYPE map: nothing here can collide with `__proto__`/`constructor`,
  // so a hostile key cannot land on Object.prototype or be read back from it.
  const changeKindTier: Record<string, ChangeRiskTier> = Object.create(null)
  for (const [kind, tier] of Object.entries(rawMap as Record<string, unknown>)) {
    if (!isTier(tier)) return null // one bad row invalidates the whole setting — fail closed
    changeKindTier[kind] = tier
  }

  return Object.freeze({ changeKindTier: Object.freeze(changeKindTier), defaultTier, fallbackLevel })
}

/* ------------------------------------------------------------------ *
 * The pure decision — what `triage.ts` calls
 * ------------------------------------------------------------------ */

/**
 * The tier for a change kind, given already-loaded settings.
 *
 * **Pure, and that is the contract.** No await, no container, no clock — so
 * `triage.ts` stays the pure function its header promises, and its existing
 * exhaustive tests keep working unchanged. Given no settings (or ones that failed
 * validation), it uses {@link DEFAULT_TIER_SETTINGS}, which fails closed.
 *
 * **Own-keys only — a critic pass found this mattered.** A plain `map[kind]` reads
 * the *prototype chain*: `map['__proto__']` returns `Object.prototype`, and
 * `map['constructor']` returns a function — both **truthy**, so `?? default` would
 * keep them and hand back a non-tier value for a kind that was never set. A change
 * kind is a string from a database or a classifier, so it can be anything, including
 * `__proto__`. Indexing only **own** keys makes an unset kind (even a hostile one)
 * fall to the default, which is how it must behave.
 */
export function resolveTier(kind: string, settings: TierSettings = DEFAULT_TIER_SETTINGS): ChangeRiskTier {
  const map = settings.changeKindTier
  if (Object.prototype.hasOwnProperty.call(map, kind)) {
    const tier = map[kind]
    // Belt and braces: parseTierSettings already rejects non-tier values, but a
    // setting built by hand (not through the parser) must not be trusted either.
    if (tier === 'safe' || tier === 'review_required' || tier === 'explicit_approval') return tier
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
 * module — the same shape `entity-settings.ts` uses, and the same law
 * (`ai-assistant -> shared`, and here `core -> shared` must not become `shared ->
 * core`).
 */
export type TierSettingsReader = {
  getValue: (
    moduleId: string,
    name: string,
    options?: { defaultValue?: unknown; scope?: { tenantId?: string | null } },
  ) => Promise<unknown>
}

/**
 * Load the tier setting, falling back to the seed on any problem.
 *
 * **Two failure modes, one answer.** (1) The reader throws / the store is
 * unreachable → seed. (2) The reader returns something that is not a valid
 * {@link TierSettings} → seed. Both give {@link DEFAULT_TIER_SETTINGS}, so the
 * platform is never *less* strict because a setting could not be read. This
 * function never throws — a caller on a hot path (a guard) must not have to wrap it.
 */
export async function loadTierSettings(
  reader: TierSettingsReader | null | undefined,
  scope?: { tenantId?: string | null },
): Promise<TierSettings> {
  if (!reader) return DEFAULT_TIER_SETTINGS
  try {
    const raw = await reader.getValue(TIER_SETTINGS_MODULE, TIER_SETTINGS_NAME, {
      defaultValue: null,
      scope,
    })
    const parsed = parseTierSettings(raw)
    return parsed ?? DEFAULT_TIER_SETTINGS
  } catch {
    return DEFAULT_TIER_SETTINGS
  }
}

/**
 * Convenience: load the setting, then resolve a kind against it.
 *
 * A convenience for callers that have a reader and one kind (a guard). The triage
 * does **not** use this — it stays pure and receives settings by injection — but a
 * route or guard that has no other reason to hold the settings object can call it.
 */
export async function resolveTierWithReader(
  kind: string,
  reader: TierSettingsReader | null | undefined,
  scope?: { tenantId?: string | null },
): Promise<ChangeRiskTier> {
  return resolveTier(kind, await loadTierSettings(reader, scope))
}
