/**
 * The structural-permission grammar as a SETTING, not a constant (SD-4 Slice C —
 * S11/S12).
 *
 * **What this is.** The home for the value that makes the structural block a
 * *grammar* rather than a *flag*: the **level** a structural change is permitted
 * at, **per (object kind, verb, actor type)** — the dictionary's own row, verbatim:
 *
 * > **S11:** *"for each verb (**read / add / edit / remove / reference**) and each
 * > actor (human / AI) a level: **straight**, **review**, **approval**, or
 * > **never**."*
 * >
 * > **S12:** *"A rule may say what **the AI** may do and what **a human** may do,
 * > separately."*
 *
 * This is a **direct copy of the `SD-3` / `SD-2b` pattern**
 * (`../request-outcome/tier-source.ts`, `../core-boundary/core-settings.ts`),
 * because it is the same shape of problem: a value the owner said must be *"a
 * setting a superadmin can change"* (`SD-3`'s instruction, verbatim), shipped as a
 * **seed + a strict parser + a pure decision + a fail-closed read** over the
 * platform's existing settings store (`module_configs`) — **no new table, no
 * migration**. `SPECIFICATIONS-DICTIONARY.md` §C.2b is the precedent; §C.3 is the
 * core-object rule this grammar sits beside.
 *
 * **What is a setting, and what is NOT (the Ring‑1/Ring‑2 asymmetry).** The
 * *level* is a setting (Ring 2, `CORE-BOUNDARY.md` §2). The **verb set** (imported
 * from the catalogue — {@link STRUCTURAL_VERBS}), the **object kinds**
 * ({@link STRUCTURAL_OBJECT_KINDS}), the **actor types**
 * ({@link STRUCTURAL_ACTOR_TYPES}), the **four level names**, and **this parser**
 * stay **code** (Ring 1). A setting may move an object **between levels**; it can
 * never **invent a verb, an actor type, or a level name** — the same rule §C.3
 * applies to the tiers (*"a setting can move an object between tiers; it can never
 * delete the tiers"*). `parseStructuralSettings` therefore rejects any verb, actor
 * or level it does not know, which is what keeps the grammar closed.
 *
 * **Why the seed is unset and the setting only supplies rows.** The seed
 * ({@link DEFAULT_STRUCTURAL_SETTINGS}) is **empty on purpose** — the honest state
 * the `SD-3` seed is in: the mapping from (object, verb, actor) to a level is not
 * decided (the owner has not yet ruled which verb the AI may do straight), so
 * **every** structural decision falls back to the tier table's level
 * (`SD-3`'s `fallbackLevel`), which is the strictest. A row is added both here (as
 * the seed) and to settings (as the live value) when the owner rules on it; the two
 * are meant to agree, and a test asserts the seed itself fails closed.
 *
 * **Inheritance (S11).** An **unset** entry falls back to the tier's level — a
 * *placement*, never an exemption. This is the architecture's own recommended layer
 * order (§3): the per-(object, verb, actor) rule is the *specific* rule; the tier
 * table is the *default* beneath it; both fail closed.
 *
 * **Fail closed, always.** Every path that cannot read a valid value returns
 * {@link DEFAULT_STRUCTURAL_SETTINGS}, whose `defaultLevel` is `approval` — the
 * same strictest level `SD-3`'s `fallbackLevel` resolves to. An unknown (object,
 * verb, actor) is therefore **never** silently `straight` ("the AI may do it, it
 * happens"); it routes to the strictest level. §C.2b's guardrail, applied here:
 * *"Missing/invalid setting → the strictest level, never `straight`."*
 *
 * **The reader now exists (CC-37, 2026-10-09).** This module was built with a home
 * and, for one slice, no reader — stated plainly at the time rather than implied
 * away, because a settings home claimed to be enforced when nothing reads it is
 * exactly the decoration the working rules forbid. `CC-37` closed that gap: the
 * structural guard (`entities.structural.core-object-guard`) reads the live setting
 * through `loadStructuralSettings` and acts on it — an **explicit** `review`/
 * `approval` rule escalates a protected write (held for a person, D3) instead of
 * hard-refusing it. The guard reads {@link explicitStructuralLevel} (not
 * {@link resolveStructuralLevel}, whose fail-closed default must not loosen an
 * absolute refusal). The manage screen (`SD-5`) is the other intended reader, and it
 * is the one that asks the *placement* question via {@link resolveStructuralLevel}.
 *
 * Source: `library/development/SPECIFICATIONS-DICTIONARY.md` S11 + S12 + §C.2b
 * (the precedent); `library/development/ARCHITECTURE-structure-permissions.md`
 * §2–§4 (the grammar); `library/development/PLAN-SD-4.md` §5 (Slice C);
 * `../request-outcome/tier-source.ts` and `../core-boundary/core-settings.ts`
 * (the pattern, copied).
 */

import { STRUCTURAL_VERBS, type StructuralVerb } from './catalogue'
import { DEFAULT_TIER_SETTINGS, TIER_TO_LEVEL, type StructurePermissionLevel } from '../request-outcome/tier-source'

/* ------------------------------------------------------------------ *
 * Where the setting lives
 * ------------------------------------------------------------------ */

/**
 * The settings key, copied from the shape the platform already uses for policies
 * (`entities` / `newEntitiesRestrictedByDefault` — `entities/api/entity-settings.ts`),
 * from the `SD-3` tier setting (`request_outcome` / `structureChangeTiers`) and from
 * the `SD-2b` core setting (`core_boundary` / `coreObjectTiers`). Module
 * `permissions` is this feature's own module; the name says what it is.
 */
export const STRUCTURAL_SETTINGS_MODULE = 'permissions'
export const STRUCTURAL_SETTINGS_NAME = 'structuralPermissionLevels'

/* ------------------------------------------------------------------ *
 * The three axes of the grammar — CODE (Ring 1)
 * ------------------------------------------------------------------ */

/**
 * The **object kinds** a structural level is set for — the architecture's
 * §2/§4.1 object axis, verbatim (`table | column | relation | function | widget |
 * agent`).
 *
 * **Deliberately the architecture's names, not the DB's.** `SD-2b`'s tier map keys
 * on `table`/`column`/`relation`/`function`/`role` because it assigns a *tier* to a
 * *named object*; this setting assigns a *level* to an *object kind*, so it uses the
 * grammar's kind axis. `role` is not here (a role is not a structural object the
 * grammar enumerates); `widget` and `agent` are, because the architecture lists them.
 */
export const STRUCTURAL_OBJECT_KINDS = ['table', 'column', 'relation', 'function', 'widget', 'agent'] as const
export type StructuralObjectKind = (typeof STRUCTURAL_OBJECT_KINDS)[number]

/**
 * The **actor types** of the grammar — the architecture's §4.1 actor axis, verbatim
 * (`'human' | 'ai' | 'any'`).
 *
 * **Why this is coarser than `PrincipalKind`, and why that is correct.** The
 * platform's resolved principal is four kinds (`'human' | 'ai_worker' | 'service' |
 * 'system'`, `../auth/principal.ts`). The *grammar* — the dictionary's S11/S12 and
 * the architecture — names three (`human` / `ai` / `any`). The bridge is
 * {@link actorTypeForPrincipal}: a `human` principal is `human`; **every machine
 * kind** (`ai_worker`, `service`, `system`) is `ai`, because S12's rule is *"the AI
 * is never assumed to inherit all of a human's structural reach"* — and a service
 * or system actor is, structurally, in the AI's position (a non-person that must
 * not restructure the platform freely). `any` is the wildcard the architecture
 * names for a rule that applies to both.
 */
export const STRUCTURAL_ACTOR_TYPES = ['human', 'ai', 'any'] as const
export type StructuralActorType = (typeof STRUCTURAL_ACTOR_TYPES)[number]

/** The four levels, re-exported from the `SD-3` source so there is exactly one union. */
export const STRUCTURAL_LEVELS = ['straight', 'review', 'approval', 'never'] as const

/**
 * What an unknown (object, verb, actor) gets. Never `straight`, never `review` —
 * the strictest, matching `SD-3`'s `fallbackLevel`.
 */
export const DEFAULT_STRUCTURAL_LEVEL: StructurePermissionLevel = 'approval'

/* ------------------------------------------------------------------ *
 * The shape of the setting
 * ------------------------------------------------------------------ */

/**
 * The full setting: the **rules** (one per explicit row) and the **default level**.
 *
 * **Both travel together** — the same rule §C.2b applies to the tier setting
 * (*"all three, together"*): a setting that names rules but no default is
 * *malformed*, and {@link parseStructuralSettings} rejects it rather than guessing
 * at the missing part.
 */
export type StructuralSettings = {
  /**
   * The explicit rows: `(objectKind → verb → actorType → level)`. A triple absent
   * from this map falls to {@link StructuralSettings.defaultLevel} (S11's
   * inheritance). Empty in the seed.
   */
  rules: Readonly<
    Record<StructuralObjectKind, Readonly<Record<StructuralVerb, Readonly<Record<StructuralActorType, StructurePermissionLevel>>>>>
  >
  /** What an (object, verb, actor) not present in `rules` gets. Never `straight`. */
  defaultLevel: StructurePermissionLevel
}

/** Build an `objectKind → verb → actor → level` bucket with every key present. */
const emptyRules = (): Record<
  StructuralObjectKind,
  Record<StructuralVerb, Record<StructuralActorType, StructurePermissionLevel>>
> => {
  const out = {} as Record<StructuralObjectKind, Record<StructuralVerb, Record<StructuralActorType, StructurePermissionLevel>>>
  for (const object of STRUCTURAL_OBJECT_KINDS) {
    const verbs = {} as Record<StructuralVerb, Record<StructuralActorType, StructurePermissionLevel>>
    for (const verb of STRUCTURAL_VERBS) {
      const actors = {} as Record<StructuralActorType, StructurePermissionLevel>
      out[object] = verbs
      verbs[verb] = actors
    }
    out[object] = verbs
  }
  return out
}

/**
 * **The seed — the mechanism, with the values unset.**
 *
 * `rules` is **empty on purpose** (built by {@link emptyRules}, which materialises
 * the three axes with no rows): the owner has not yet ruled which (object, verb,
 * actor) sits at which level, so every structural decision inherits the tier
 * table's level — the strictest. This is the same honest state the `SD-3` seed is
 * in (`changeKindTier: {}`), and for the same reason: a default the owner has not
 * chosen must not be invented by the agent.
 *
 * `defaultLevel` is `approval` — `DEFAULT_STRUCTURAL_LEVEL`, the S11 equivalent of
 * `SD-3`'s `explicit_approval` fallback. A test asserts the seed itself fails
 * closed (no (object, verb, actor) resolves to `straight`).
 */
export const DEFAULT_STRUCTURAL_SETTINGS: StructuralSettings = Object.freeze({
  rules: Object.freeze(emptyRules()) as StructuralSettings['rules'],
  defaultLevel: DEFAULT_STRUCTURAL_LEVEL,
})

/* ------------------------------------------------------------------ *
 * Reading it back — validation first, so a bad setting cannot soften us
 * ------------------------------------------------------------------ */

const isLevel = (value: unknown): value is StructurePermissionLevel =>
  typeof value === 'string' && (STRUCTURAL_LEVELS as readonly string[]).includes(value)

const isObjectKind = (value: unknown): value is StructuralObjectKind =>
  typeof value === 'string' && (STRUCTURAL_OBJECT_KINDS as readonly string[]).includes(value)

const isVerb = (value: unknown): value is StructuralVerb =>
  typeof value === 'string' && (STRUCTURAL_VERBS as readonly string[]).includes(value)

const isActorType = (value: unknown): value is StructuralActorType =>
  typeof value === 'string' && (STRUCTURAL_ACTOR_TYPES as readonly string[]).includes(value)

/**
 * Turn whatever was stored into a {@link StructuralSettings}, or `null` if it is
 * not exactly right.
 *
 * **Strict on purpose.** An unknown level, object kind, verb or actor type; a
 * non-object; a missing default — each returns `null`, and the caller then uses
 * {@link DEFAULT_STRUCTURAL_SETTINGS}. Being lenient here ("coerce the bad rows,
 * keep the good ones") would mean a typo'd setting quietly changed what the
 * platform permits; the whole point of the fail-closed rule is that a *broken*
 * setting is treated as *no* setting. It is also what keeps the grammar **closed**:
 * a setting cannot introduce a verb, an actor or a level the code does not know.
 *
 * **The maps are NULL-PROTOTYPE objects**, like `SD-3`'s — nothing here can collide
 * with `__proto__`/`constructor`, so a hostile key cannot land on
 * `Object.prototype` or be read back from it.
 */
export function parseStructuralSettings(raw: unknown): StructuralSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const defaultLevel = obj.defaultLevel
  if (!isLevel(defaultLevel)) return null
  // A `straight` default would let EVERY undeclared structural change happen
  // unreviewed — the exact inversion of what S11 exists for. A setting that says it
  // is treated as malformed (→ seed), not obeyed. (The same strictness `SD-2b`'s
  // parser applies to a `core` default; `SD-3` trusts a weak-but-valid default to
  // the seed, but here the *value itself* would open the platform.)
  if (defaultLevel === 'straight') return null

  const rawRules = obj.rules
  if (!rawRules || typeof rawRules !== 'object') return null

  const rules = emptyRules()
  for (const [objectKind, verbMap] of Object.entries(rawRules as Record<string, unknown>)) {
    // An unknown object kind invalidates the whole setting (fail closed), rather
    // than being silently dropped — a typo'd kind must not vanish without a trace.
    if (!isObjectKind(objectKind)) return null
    if (!verbMap || typeof verbMap !== 'object') return null
    for (const [verb, actorMap] of Object.entries(verbMap as Record<string, unknown>)) {
      if (!isVerb(verb)) return null
      if (!actorMap || typeof actorMap !== 'object') return null
      for (const [actorType, level] of Object.entries(actorMap as Record<string, unknown>)) {
        if (!isActorType(actorType)) return null
        if (!isLevel(level)) return null // one bad row invalidates the whole setting
        rules[objectKind][verb][actorType] = level
      }
    }
  }

  return Object.freeze({
    rules: Object.freeze(
      Object.fromEntries(
        STRUCTURAL_OBJECT_KINDS.map((objectKind) => [
          objectKind,
          Object.freeze(
            Object.fromEntries(
              STRUCTURAL_VERBS.map((verb) => [verb, Object.freeze({ ...rules[objectKind][verb] })]),
            ),
          ),
        ]),
      ),
    ) as StructuralSettings['rules'],
    defaultLevel,
  })
}

/* ------------------------------------------------------------------ *
 * The pure decision — what a guard or the manage screen calls
 * ------------------------------------------------------------------ */

/**
 * The bridge from a resolved principal to the grammar's actor axis (S12).
 *
 * `human` → `human`; **every machine kind** (`ai_worker` / `service` / `system`) →
 * `ai`; `undefined` (the kind was not resolved) → `any`, which is the wildcard that
 * consults a rule set for *any* actor and, finding none, falls to the default. This
 * is total: every `PrincipalKind` maps, and no kind is silently dropped — which is
 * what makes S12's *"the AI is never assumed to inherit a human's reach"* true by
 * construction rather than by a caller remembering to pass it.
 */
export function actorTypeForPrincipal(kind: 'human' | 'ai_worker' | 'service' | 'system' | undefined | null): StructuralActorType {
  if (kind === 'human') return 'human'
  if (kind === 'ai_worker' || kind === 'service' || kind === 'system') return 'ai'
  return 'any'
}

/**
 * The level a structural change is permitted at, given already-loaded settings.
 *
 * **Pure, and that is the contract.** No await, no container, no clock — so a
 * synchronous caller (the manage screen's preview, a pure guard) keeps working, and
 * a guard can call it with an async-loaded setting.
 *
 * **Not yet wired (stated plainly — a hostile critic measured this).** As of SD-4
 * Slice C **nothing in production calls this function**: it is the *home* of the
 * grammar's level, built so the enforcement slices have one place to read from and
 * the manage screen (`SD-5`) has one place to render. The *enforcement* — a guard
 * that reads this level and escalates (`review`/`approval`) or refuses (`never`) —
 * is scheduled (`COMPLETION-CALLBACKS.md` CC-37), because it needs the escalate
 * outcome wired on the structural guard, which is the next slice's job, not this
 * one's. A grammar with a home and no reader is honest; a grammar claimed to be
 * enforced when it is not would not be.
 *
 * **The lookup walks the three axes in order, and the order is the inheritance
 * rule (S11):** the **exact** (object, verb, actor) row wins; failing that, the
 * `any`-actor row for that (object, verb); failing that, the default level. An
 * unset entry is a *placement*, never an exemption — which is why the fallback is
 * the strictest and not "allow".
 *
 * **Own-keys only — the same defence `SD-3` and `SD-2b` needed.** A plain
 * `map[verb]` reads the *prototype chain*: `map['__proto__']` returns
 * `Object.prototype` and `map['constructor']` a function — both **truthy**, so a
 * naïve `?? default` would keep them. Every axis here is a string from a caller or
 * a setting, so it can be anything, including `__proto__`. Indexing only **own**
 * keys makes an unset (even hostile) triple fall to the default.
 */
export function resolveStructuralLevel(
  objectKind: StructuralObjectKind,
  verb: StructuralVerb,
  actorType: StructuralActorType,
  settings: StructuralSettings = DEFAULT_STRUCTURAL_SETTINGS,
): StructurePermissionLevel {
  const has = (bucket: unknown, key: string): boolean =>
    !!bucket && typeof bucket === 'object' && Object.prototype.hasOwnProperty.call(bucket, key)

  const byVerb = (settings.rules as Record<string, unknown>)?.[objectKind]
  if (has(byVerb, verb)) {
    const byActor = (byVerb as Record<string, unknown>)[verb]
    const findLevel = (actor: string): StructurePermissionLevel | null => {
      if (!has(byActor, actor)) return null
      const level = (byActor as Record<string, unknown>)[actor]
      return isLevel(level) ? level : null
    }
    const exact = findLevel(actorType)
    if (exact) return exact
    // The `any` row is the wildcard: a rule set for any actor, consulted when there
    // is no rule for this one. Only consulted if the actor was not itself `any`.
    if (actorType !== 'any') {
      const wildcard = findLevel('any')
      if (wildcard) return wildcard
    }
  }
  return settings.defaultLevel
}

/**
 * The level **explicitly set** for an (object, verb, actor) — or `null` when no
 * rule reaches it (so the caller sees only a deliberate placement, never a default).
 *
 * **Why this exists, and why it is separate from {@link resolveStructuralLevel}.**
 * The reserved-surface guard (S9 / `SD-2b`) is **absolute**: a `core` object cannot be
 * restructured by anyone. The grammar (S11) is meant to **refine** that — a
 * `review`/`approval` level says *"held for a person"* instead of *"forbidden"*. But
 * the grammar's **default** is `approval` (fail closed), so a guard that acted on
 * `resolveStructuralLevel()` alone would turn the absolute 422 into a 202 *for every
 * reserved write with no explicit rule* — i.e. it would **weaken** S9 by default. That
 * is the opposite of what CC-37 must do.
 *
 * So the guard asks this function instead: **only an explicit `review`/`approval`
 * rule** may escalate a reserved write; no rule → the absolute refusal stands. The
 * default level is still the fail-closed answer for a *placement* question ("what
 * level applies?"), but it is **not** evidence that a person chose a level — and
 * only a chosen level may loosen an absolute rule.
 *
 * **Own-keys only**, like every lookup here, so a hostile key falls through to `null`.
 */
export function explicitStructuralLevel(
  objectKind: StructuralObjectKind,
  verb: StructuralVerb,
  actorType: StructuralActorType,
  settings: StructuralSettings = DEFAULT_STRUCTURAL_SETTINGS,
): StructurePermissionLevel | null {
  const has = (bucket: unknown, key: string): boolean =>
    !!bucket && typeof bucket === 'object' && Object.prototype.hasOwnProperty.call(bucket, key)

  const byVerb = (settings.rules as Record<string, unknown>)?.[objectKind]
  if (!has(byVerb, verb)) return null
  const byActor = (byVerb as Record<string, unknown>)[verb]
  const findLevel = (actor: string): StructurePermissionLevel | null => {
    if (!has(byActor, actor)) return null
    const level = (byActor as Record<string, unknown>)[actor]
    return isLevel(level) ? level : null
  }
  const exact = findLevel(actorType)
  if (exact) return exact
  if (actorType !== 'any') return findLevel('any')
  return null
}

/**
 * Convenience: the level for a principal, mapping its kind to the actor axis first.
 *
 * A convenience for a caller that has a `PrincipalKind`, not the grammar's
 * `actorType`: it bridges (via {@link actorTypeForPrincipal}) and resolves in one
 * step. **The structural guard (CC-37) does *not* use this** — it asks
 * {@link explicitStructuralLevel} directly, because it must see only an explicitly
 * *chosen* level (an absolute reserved-surface refusal may not be loosened by the
 * fail-closed default). This function is for the placement question — and for the
 * manage screen (`SD-5`) showing *"what level applies here?"*.
 */
export function resolveStructuralLevelForPrincipal(
  objectKind: StructuralObjectKind,
  verb: StructuralVerb,
  principalKind: 'human' | 'ai_worker' | 'service' | 'system' | undefined | null,
  settings: StructuralSettings = DEFAULT_STRUCTURAL_SETTINGS,
): StructurePermissionLevel {
  return resolveStructuralLevel(objectKind, verb, actorTypeForPrincipal(principalKind), settings)
}

/* ------------------------------------------------------------------ *
 * The read — the one part that touches the database
 * ------------------------------------------------------------------ */

/**
 * The minimal slice of `ModuleConfigService` this module needs.
 *
 * Typed structurally (not imported) so `shared` does not depend on `core`'s config
 * module — the same shape `tier-source.ts`, `core-settings.ts` and
 * `entity-settings.ts` use, and the same law (`core → shared` must not become
 * `shared → core`).
 */
export type StructuralSettingsReader = {
  getValue: (
    moduleId: string,
    name: string,
    options?: { defaultValue?: unknown; scope?: { tenantId?: string | null } },
  ) => Promise<unknown>
}

/**
 * Load the structural-permission setting, falling back to the seed on any problem.
 *
 * **Two failure modes, one answer.** (1) The reader throws / the store is
 * unreachable → seed. (2) The reader returns something that is not a valid
 * {@link StructuralSettings} → seed. Both give {@link DEFAULT_STRUCTURAL_SETTINGS},
 * so the platform is never *less* strict because a setting could not be read. This
 * function never throws — a caller on a hot path (a guard, once wired per CC-37)
 * must not have to wrap it.
 */
export async function loadStructuralSettings(
  reader: StructuralSettingsReader | null | undefined,
  scope?: { tenantId?: string | null },
): Promise<StructuralSettings> {
  if (!reader) return DEFAULT_STRUCTURAL_SETTINGS
  try {
    const raw = await reader.getValue(STRUCTURAL_SETTINGS_MODULE, STRUCTURAL_SETTINGS_NAME, {
      defaultValue: null,
      scope,
    })
    const parsed = parseStructuralSettings(raw)
    return parsed ?? DEFAULT_STRUCTURAL_SETTINGS
  } catch {
    return DEFAULT_STRUCTURAL_SETTINGS
  }
}

/**
 * Turn an already-fetched value into a {@link StructuralSettings}, never `null` —
 * the seed when the value is not valid.
 *
 * The **synchronous twin of {@link loadStructuralSettings}**, for a caller that
 * has the raw value in hand rather than a reader: the manage screen (`SD-5`) gets
 * the setting as JSON from its route and must render a *valid* setting even if
 * that JSON is malformed (a hand-edited store, a version skew). It applies the
 * same one rule — {@link parseStructuralSettings}, else the seed — so the screen
 * and the guard fail closed identically. Exported so neither has to reimplement
 * the `parse ?? seed` idiom and risk a divergent fallback.
 */
export function normalizeStructuralSettings(raw: unknown): StructuralSettings {
  return parseStructuralSettings(raw) ?? DEFAULT_STRUCTURAL_SETTINGS
}

/**
 * The level an **undeclared** structural change inherits (S11) — `SD-3`'s
 * `fallbackLevel`, read from the tier source so the two settings cannot disagree.
 *
 * The grammar's row is *specific*; this is the *default beneath it*. Re-exported
 * as a function (not a constant) so a caller reads the current value the same way
 * it reads every other part of the grammar.
 */
export function inheritedStructuralLevel(): StructurePermissionLevel {
  return TIER_TO_LEVEL[DEFAULT_TIER_SETTINGS.defaultTier]
}

/* ------------------------------------------------------------------ *
 * The manage screen's data shape (SD-5) — pure, so the UI stays dumb
 * ------------------------------------------------------------------ *
 * The page and its route live in `core` (a page is core's business); the *shape*
 * they render and write stays here, with the rest of the grammar, for three
 * reasons: (1) `shared` must not depend on `core`, so the policy cannot live in
 * the page; (2) the shape is the same grammar the guard reads, so one module owns
 * both readers and they cannot drift; (3) a pure function is testable without a
 * DOM, a route, or a database.
 */

/** One cell of the grid: the level a single (object, verb, actor) sits at. */
export type StructuralLevelCell = {
  objectKind: StructuralObjectKind
  verb: StructuralVerb
  actorType: StructuralActorType
  /**
   * The level **explicitly set** for this cell, or `null` when no rule reaches it
   * (the cell then *renders* {@link StructuralSettings.defaultLevel} but is not a
   * stored row). The distinction matters: the screen must be able to show *"this is
   * only the default, nobody chose it"* apart from *"a person set this"* — the same
   * explicit-vs-default line the guard draws (CC-37).
   */
  explicit: StructurePermissionLevel | null
  /** What the cell shows: the explicit level, or the default when unset. */
  effective: StructurePermissionLevel
}

/**
 * The full grid the manage screen renders: one cell per
 * (objectKind × verb × actorType), each carrying both its **explicit** level
 * (`null` when unset) and its **effective** level (the default when unset).
 *
 * Order is the declaration order of the three axes, so the rendered grid is stable
 * and a screenshot is comparable between sessions.
 */
export function structuralSettingsGrid(
  settings: StructuralSettings = DEFAULT_STRUCTURAL_SETTINGS,
): StructuralLevelCell[] {
  const cells: StructuralLevelCell[] = []
  for (const objectKind of STRUCTURAL_OBJECT_KINDS) {
    for (const verb of STRUCTURAL_VERBS) {
      for (const actorType of STRUCTURAL_ACTOR_TYPES) {
        const explicit = explicitStructuralLevel(objectKind, verb, actorType, settings)
        cells.push({
          objectKind,
          verb,
          actorType,
          explicit,
          effective: explicit ?? settings.defaultLevel,
        })
      }
    }
  }
  return cells
}

/**
 * Apply one cell edit and return a **new** {@link StructuralSettings} — or `null`
 * when the edit is not a valid placement.
 *
 * **What "set" means, and why it is not the same as "store every cell".** A level of
 * `straight`/`review`/`approval`/`never` is written as an **explicit rule** for the
 * exact (object, verb, actor) triple. The screen therefore stores exactly the cells a
 * person chose and leaves the rest unset, so the fail-closed default keeps its meaning
 * (S11's inheritance). A caller may instead pass `null` to **clear** a cell back to
 * inheritance — that removes the row rather than storing the current default, because
 * storing the default would turn "nobody chose this" into "somebody chose the strictest",
 * which is a different fact and would freeze the cell against a future default change.
 *
 * **Validation.** The object/verb/actor are the grammar's closed sets and the level is
 * one of the four — anything else returns `null` (the caller renders it as a rejected
 * edit), never a coerced value. The returned settings still round-trip through
 * {@link parseStructuralSettings} (the screen writes what a reader will accept).
 *
 * **Pure and immutable.** The input is never mutated; every nested level is a fresh
 * null-prototype-safe object, matching `parseStructuralSettings`.
 */
export function withStructuralLevel(
  settings: StructuralSettings,
  edit: {
    objectKind: StructuralObjectKind
    verb: StructuralVerb
    actorType: StructuralActorType
    /** The level to set, or `null` to clear the cell back to inheritance. */
    level: StructurePermissionLevel | null
  },
): StructuralSettings | null {
  if (!isObjectKind(edit.objectKind)) return null
  if (!isVerb(edit.verb)) return null
  if (!isActorType(edit.actorType)) return null
  if (edit.level !== null && !isLevel(edit.level)) return null

  // Build the next `rules` by copying every existing row, then applying (or removing)
  // the one cell. A full copy — not a shallow patch — so the result is independent of
  // the input and safe to hand straight to `setValue`.
  const rules = emptyRules()
  for (const objectKind of STRUCTURAL_OBJECT_KINDS) {
    for (const verb of STRUCTURAL_VERBS) {
      for (const actorType of STRUCTURAL_ACTOR_TYPES) {
        const current = explicitStructuralLevel(objectKind, verb, actorType, settings)
        if (current) rules[objectKind][verb][actorType] = current
      }
    }
  }

  if (edit.level === null) {
    delete rules[edit.objectKind][edit.verb][edit.actorType]
  } else {
    rules[edit.objectKind][edit.verb][edit.actorType] = edit.level
  }

  return Object.freeze({
    rules: Object.freeze(
      Object.fromEntries(
        STRUCTURAL_OBJECT_KINDS.map((objectKind) => [
          objectKind,
          Object.freeze(
            Object.fromEntries(
              STRUCTURAL_VERBS.map((verb) => [verb, Object.freeze({ ...rules[objectKind][verb] })]),
            ),
          ),
        ]),
      ),
    ) as StructuralSettings['rules'],
    defaultLevel: settings.defaultLevel,
  })
}

/**
 * Whether two settings are the same — the screen uses it to enable/disable *Save*
 * and to detect an unchanged form.
 *
 * **Compared cell by cell over the grammar's closed sets**, not by deep-equality:
 * two settings are equal when every (object, verb, actor) has the same **explicit**
 * level and the same default. That is the fact that matters — the raw object shape
 * (present-but-undefined keys, key order) must not make two equivalent settings look
 * different.
 */
export function structuralSettingsEqual(a: StructuralSettings, b: StructuralSettings): boolean {
  if (a.defaultLevel !== b.defaultLevel) return false
  for (const objectKind of STRUCTURAL_OBJECT_KINDS) {
    for (const verb of STRUCTURAL_VERBS) {
      for (const actorType of STRUCTURAL_ACTOR_TYPES) {
        const left = explicitStructuralLevel(objectKind, verb, actorType, a)
        const right = explicitStructuralLevel(objectKind, verb, actorType, b)
        if (left !== right) return false
      }
    }
  }
  return true
}
