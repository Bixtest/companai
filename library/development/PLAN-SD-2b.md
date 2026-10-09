# PLAN — `SD-2b`: the core object set is a superadmin SETTING, not a hardcoded list

**Written:** 2026-10-09. **Author:** the agent. **Status:** ✅ **BUILT** (this plan is the record).
**Parent:** `SD-2`/`S9` (dictionary §C.3), `SD-3`/`D1` + dictionary §C.2b (the precedent),
`CORE-BOUNDARY.md` §2/§5, [`DECISION-core-object-set-as-settings.md`](DECISION-core-object-set-as-settings.md)
(the design), [`DECISION-core-object-set.md`](DECISION-core-object-set.md) §4 (the seed).

---

## 1. The task, in the sources' own words

> **Owner (2026-10-09):** *"we follow your recommendations concerning that. However, analyze if we can do this
> as a manageable matter instead of hardcoded. Give the superadmin the right and functionality to identify
> which table/column/function belongs to which tier. This way if in the future the superadmin added a column
> that should not be deleted, he can set that from the superadmin UI without editing code. So, your
> recommendations become **default settings**, not hardcoded architecture."*

---

## 2. The relevant `platform_points` (step 2 — picked, not guessed)

- **S9 / §C.3** — core functions ship by default and cannot be deleted; the list is the owner's to grow.
- **§C.2b** — the tiers/defaults/fallbacks are **settings a superadmin can change**, seeded from the
  dictionary, **failing closed** — the precedent, verbatim.
- **S5** — one engine, never a rival: use `ModuleConfigService`, do not invent a settings table.
- **Rule 0** — every claim carries an observation; docs are not evidence, only the code is.
- **Rule 9b** — challenge the task before executing it.

---

## 3. The requirement (task definition + points, combined — step 3)

Make the **object→tier set a setting**, not a frozen list:

- **SETTING (Ring 2):** the object→tier map (`table`/`column`/`relation`/`function`/`role` → tier), the
  default tier, the system-column set, the reserved-entity-type set.
- **CODE (Ring 1, `CORE-BOUNDARY.md` §2):** the *rule* (a `core` object cannot be deleted or restructured),
  the four tier names, the fail-closed parser.
- **Storage:** `module_configs` (module `core_boundary`, name `coreObjectTiers`) via the existing
  `ModuleConfigService` — **no new table, no migration.**
- **Seed:** the owner-accepted recommendation (`DECISION-core-object-set.md` §4).
- **First payoff:** close the measured hole — a custom field can no longer attach to `auth:user`,
  `auth:role`, `directory:tenant`, `auth:session` (the 7-id list omitted them).

---

## 4. Fact-check (step 4) — and the challenge to the task (rule 9b)

**What was actually there (measured in code first):**

- `tier-source.ts` (SD-3) is a clean four-part template: seed (`DEFAULT_TIER_SETTINGS`) + strict parser
  (`parseTierSettings` → `null`) + pure decision (`resolveTier`, own-keys only) + fail-closed read
  (`loadTierSettings`, never throws).
- `ModuleConfigService.getValue` resolves **tenant row → instance row → supplied default**; `restoreDefaults`
  writes seed rows at `tenant_id: null`. Both already exist.
- `core-objects.ts` (SD-2) was code-only: `CORE_OBJECT_KINDS = ['role']` and a frozen `CORE_OBJECTS` holding
  one entry (`superadmin`).
- `isSystemEntitySelectable` (`system-entities.ts`) was code-only: a frozen 7-id `RESERVED_SYSTEM_ENTITY_TYPES`.

**The challenge (rule 9b) — TWO corrections the plan had to absorb before writing:**

1. **The setting is async; the gate is synchronous.** `isSystemEntitySelectable` is called **synchronously
   in 8 sites across 5 files** (`entities.ts` list filters, `definitions.ts:505` create gate, `query_index`
   CLIs, onboarding provisioning). Making it `async` would ripple through all of them. **Resolution:** the
   predicate stays **synchronous and pure over values**, defaulting to the **seed** (which is code, so it
   needs no read); a caller that has loaded the setting passes it in. This is the same pure/async split
   `tier-source.ts` uses, and it breaks **no** call site.

2. **Two namespaces, not one.** The reserved list is in **entity ids** (`auth:user`); the tier map is in
   **table names** (`users`). They are not textually derivable. **Resolution:** the *reserved-entity-type*
   seed is written in **entity-id form** (taken from `packages/core/generated/entities.ids.generated.ts`),
   and the bridge lives **in the seed** — a fixed, reviewable correspondence — not recomputed at the gate.

**A third correction, found by the test suite itself:** the first seed used **invented table names**
(`authority_decisions`, `sidebar_variants`, `workflow_definitions`-vs-`workflows`). A test asserting the
seed's names against **live PG 17** caught it. Fixed to the DB's real names (`authority_pending_acts`,
`authority_trust_grants`, `feature_toggle_overrides`, `scheduled_jobs`, …).

---

## 5. The design

### 5.1 `packages/shared/src/lib/core-boundary/core-settings.ts` (new)

A direct copy of `tier-source.ts`'s shape:

- `DEFAULT_CORE_SETTINGS` — the seed: `objectTier.table` = the ~24 `core` tables + 17 `platform_release`
  tables; `objectTier.role` = `{ superadmin: 'core' }`; `defaultTier` = `tenant_structural`;
  `systemColumns` = the 7; `reservedEntityTypes` = the substrate 7 ∪ the core/platform tables in entity-id form.
- `parseCoreSettings(raw): CoreSettings | null` — strict; one bad row (or a bad kind) invalidates all.
- `resolveCoreTier(kind, id, settings?)` — **pure**, own-keys only, seed default.
- `loadCoreSettings(reader, scope?)` — never throws; seed on any failure.

### 5.2 `core-objects.ts` (modified) — read the setting

The public API (`isCoreObject`, `coreObjectFor`, `coreObjectRefusal`, `coreObjects`, `isCoreObjectKind`) is
preserved and now takes an optional `settings` (defaulting to the seed), so the `SD-2` guard keeps working
unchanged. Added `loadCoreObjects(reader, scope)` and `coreObjectRefusalLive(...)` for a caller with a reader.

### 5.3 `system-entities.ts` (modified) — the gate reads the seed's reserved set

`isSystemEntitySelectable`, `filterSelectableSystemEntityIds`, `isReservedSystemEntityType` take an optional
`settings` (defaulting to the seed). Synchronous; the 8 call sites are unchanged and now fail closed to the
wider seed.

### 5.4 What is honestly NOT done here (scheduled, not skipped — rule 8)

- The **manage screen** (the superadmin UI) folds into **`SD-5`** — one grid, two settings.
- The **structural guard** (DROP / re-type / FK) rides **`SD-4`** (S5: one engine).
- The core marker as a **column** (`Role.isCore`) still waits on a migration — **CC-31(a)**.

---

## 6. Verification protocol (step 5)

Full `shared` + `core` suites; both `tsc`; a **six-mutation** RED-then-GREEN table restored byte-identical
after each; a **separate hostile-critic** pass demanding a command + output for every claim; live PG 17 used
to verify every seeded table name.

---

## 7. What was built

| File | Change |
|---|---|
| `packages/shared/src/lib/core-boundary/core-settings.ts` | **new** — seed + parser + pure decision + fail-closed read; `SUBSTRATE_ENTITY_TYPES` invariant |
| `packages/shared/src/lib/core-boundary/core-objects.ts` | **modified** — reads the setting; API preserved |
| `packages/shared/src/lib/entities/system-entities.ts` | **modified** — the gate reads the seed's reserved set; new `reservedEntityRefusal` |
| `packages/core/src/modules/entities/api/definitions.batch.ts` | **modified** — calls `reservedEntityRefusal` (closes the bypass) |
| `packages/core/src/modules/entities/api/definitions.restore.ts` | **modified** — calls `reservedEntityRefusal` (closes the resurrection path) |
| `packages/core/src/modules/entities/cli.ts` | **modified** — `add-field` refuses a reserved surface |
| `packages/core/src/modules/entities/lib/field-definitions.ts` | **modified** — `ensureCustomFieldDefinitions` refuses at the top |
| `packages/core/src/modules/entities/api/__tests__/definitions.mutation-guard.test.ts` | **modified** — mock gains the no-op refusal |
| `packages/shared/src/lib/core-boundary/__tests__/core-settings.test.ts` | **new** — 33 tests |
| `packages/shared/src/lib/core-boundary/__tests__/core-objects.test.ts` | **modified** — +4 tests (setting honoured) |
| `packages/shared/src/lib/entities/__tests__/system-entities.sd2b.test.ts` | **new** — 10 tests (the hole closed) |
| `packages/core/src/modules/entities/api/__tests__/definitions.batch.sd2b.test.ts` | **new** — 5 tests (batch + restore + primitive all refuse) |

---

## 8. Verification results (measured, not assumed)

- **`shared`:** 202 suites / 2430 tests; the 1 red suite (`dynamicLoader.tsconfig.test.ts`, 8 tests) is the
  **pre-existing, environmental** sandbox flake — passes **8/8 in isolation**, reproduces on a clean tree
  (CC-19). Not from this slice.
- **`core`:** 630 suites / 5479 tests, **0 failures** (before the critic fixes; re-run after them — the
  `entities` slice it touches: 44 suites / 343 tests green).
- **Both `tsc --noEmit` exit 0.**
- **Ten mutations, all RED** (each restored md5-identical), covering every guard:
  | # | Mutation | RED in |
  |---|---|---|
  | M1 | seed `defaultTier` → `tenant_data` (fails open) | 4 fail-closed tests |
  | M2 | parser lenient on a bad tier row | the "one bad row" test |
  | M3 | `resolveCoreTier` plain lookup (prototype leak) | the own-keys test |
  | M5 | parser accepts `defaultTier: 'core'` | the freeze-reject test |
  | M6 | parser accepts a reserved set missing the substrate (junk-only) | 4 substrate-invariant tests |
  | M7 | gate ignores settings | 8 gate tests |
  | M8 | `coreObjects` ignores the tier | the override test |
  | M9 | batch route skips the reserved refusal (the BYPASS) | the bypass test |
  | M10 | restore route skips the refusal (resurrection) | the restore test |
  | M11 | `ensureCustomFieldDefinitions` soft-skips (`throw`→`return`) | the primitive test |

### 8.1 The two hostile-critic rounds (this is where the value was)

**Round 1 found a CRITICAL hole and two lesser ones:**
- **CRITICAL — a bypass.** The gate `isSystemEntitySelectable` was only on the two *preset* routes. The
  **batch** route, the **`add-field` CLI**, and the **`ensureCustomFieldDefinitions`** primitive wrote
  `CustomFieldDef` rows **without the gate** — so the "hole closed" claim was **false**. Fixed with one shared
  `reservedEntityRefusal`, called at all three.
- **HIGH — a fail-open.** The parser accepted `reservedEntityTypes: []`, disabling the gate. Fixed.
- **MEDIUM — decorative.** `coreObjectRefusalLive` had no caller and no test. Removed.

**Round 2 (re-verification) found three more:**
- **HIGH — the empty-set guard was insufficient.** A *junk-only* set (`['nope']`) passed the empty-length
  check and still reopened `auth:user`. Fixed with the **substrate invariant**: the parser now requires the
  reserved set to contain all 7 substrate ids (a setting may add, never drop, the substrate). New export
  `SUBSTRATE_ENTITY_TYPES`.
- **HIGH — the round-1 fix broke a pre-existing suite.** `definitions.mutation-guard.test.ts` mocked
  `system-entities` without `reservedEntityRefusal`, so the batch route threw `TypeError`. Fixed by adding the
  no-op to that mock. *A fix that reddens an existing suite is not green.*
- **MEDIUM — a latent path.** `definitions.restore.ts` reactivated a `CustomFieldDef` with no reserved check
  (a resurrection path for pre-fix data). Fixed with the same refusal.

Both rounds demanded a command + output per claim; each round's fixes were themselves mutation-proven
(M9/M10/M11 exist because of round 2).

---

## 9. The honest limits

- The **UI** to change the setting has no screen yet (folds into `SD-5`); today the writer is
  `ModuleConfigService.setValue` / `restoreDefaults` and the `configs` CLI — the same state `SD-3` is in.
- The **structural** enforcement (DROP/re-type) is scheduled with `SD-4`; `SD-2b` ships the **values** it
  will read.
- The seed is **code**; the setting **overrides** it. A superadmin can move an object between tiers; they
  cannot delete a tier (Ring 1). The parser additionally **requires the substrate** — a setting may add to
  the reserved set, never drop the 7 the platform stores its own customization in.
- The **entity-id ↔ table** correspondence in the seed is a **fixed, reviewed** mapping (from the generated
  registry), not recomputed — a test asserts every seeded table name is real (live PG 17) and every seeded
  entity id exists in the generated map.

---

## 10. What I need from you

**Nothing — this is done and unblocked.** The one open decision that is not mine: whether the **manage
screen** should be its own screen or the `SD-5` grid (the design recommends the `SD-5` grid). That is asked
in `NEEDS-YOU.md` and does not block this slice.
