# BUILD ORDER — what must exist before anything is stacked on it

**Written:** 2026-10-06

## ★ This is source of truth #2 of two (with `BACKLOG.md`)

**The project has exactly two sources of truth. This file is one half of the second.**

| # | The document | It answers |
|---|---|---|
| **1** | [`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) | **What are we building, and why** (the vision and architecture) |
| **2** | **this file** (the order) **+ [`BACKLOG.md`](BACKLOG.md)** (the live status) | **Where are we, what is next, what is incomplete, what needs fixing** |

**This file is the *shape* of the work** — which phase must be finished before the next is stacked
on it, and why. It changes rarely. **[`BACKLOG.md`](BACKLOG.md) is the *live state*** — the tick-box
per item, the counts, the next thing to do. It changes every working session. **When the two disagree
about order, this file wins; when they disagree about status, `BACKLOG.md` wins.**

**The rule the owner set (2026-10-06):** *every other document must be referenced from inside the
section of a source of truth where it is relevant — never from a list at the top or a footer.* The
`In depth →` lines below, one per section, are therefore binding: they name the documents that
govern the section they sit in. **If you add a document and it is not referenced from a section here
or in the vision page, it is a loose document — and a loose document is a liability.**

**Asked by:** the owner — *"shouldnt we already build that so we apply the standards as we go … I feel
core requirements like accounts management, permissions, this, languages, etc… should be the first to
build … fix the order perfectly right so this is not forgotten and push 'till later'."*
**Status of the answer:** measured from the code, not from opinion.

---

## 1. The short answer

**Yes — he is right, and the measurement splits in two.** He is not asking us to stop and build
foundations from nothing: **most of the foundation is already standing** (table below). But going to
answer him, a critic pass found a genuine hole in that foundation — **the generated guard registry is
empty in the running app** (§2b) — which is the owner's own feared defect made concrete. So the answer
is: *the foundation is mostly built, and one part of it is silently not working; finish that before
stacking.* That is exactly what he asked for.

| Foundation he named | Built? | Evidence (measured, not claimed) |
|---|---|---|
| Accounts management | **BUILT** | `packages/core/src/modules/auth/` — api, backend, commands, components, data, di.ts, emails, encryption.ts, events.ts, frontend, `i18n`, lib, **migrations (20+)**, services, setup.ts, workers |
| Roles & permissions | **BUILT** (two-table ACL) | `RoleAcl` (`role_acls`) + `UserAcl` (`user_acls`), `featuresJson: string[]`, wildcard matching, `isSuperAdmin` |
| Languages / i18n | **BUILT** | `shared/src/lib/i18n`; per-module `i18n` folders; `translations` module; `dictionaries` module |
| The guard engine ("this") | **PARTLY BUILT — D0 FIXED 2026-10-06, the rest open** | `MutationGuard` + `runMutationGuards()` exist and run. **D0 fixed:** the generated registry now delivers guards from an enabled module (`entities`), mutation-proven end to end (§2c). **Still open:** the **route path** — **177 call sites in 69 files** still call the `@deprecated` resolver and bypass the registry (**D2-wide**, §2c/§2e; was 198 real call sites, `data_sync` and `entities/encryption.ts` now migrated); and the guard result is binary, with no `escalate` outcome (**D3**) |
| Structural write hook | **BUILT — and now registry-based** | `beginEntitiesMutationGuard` is called at **every** entity/field-definition write path, carrying `resourceKind` (`entities.entity`, `entities.field_definition`) + `operation`. As of 2026-10-06 (`d225602`) it runs the **registry** (`runRouteMutationGuards`), not the deprecated single-service resolver |

So the honest statement is: **the foundation is built; of the foundation's gaps, D0 and D1 are now closed**
— both found or unblocked by measurement, both proven. **D0** was a live defect the critic pass found (the
registry was empty); **D1** made the tier mapping a setting. Build the remaining gaps (**D2-wide**, **D3**,
the Metadata Registry) first, then everything stacked on top inherits them for free. That is precisely the
owner's instinct, and the code agrees with him.

---

## 2. The four gaps — named, small, and the reason the order matters

These are the only blockers to "apply the standards as we go." Each is a change to something that
**already exists**, not new infrastructure.

**D1 — the structural rules were code, not data — ✅ FIXED 2026-10-06 (§2d).** The tier mapping, the
default tier and the structural fallback are now a **setting** (`module_configs`, module
`request_outcome`, name `structureChangeTiers`), seeded from the dictionary and read through a function.
The full `(object · verb · actorType · level)` grammar beyond the tier fallback remains **SD-4** (it needs
D3's `escalate` to be useful), and the manage screen is **SD-5** — but the **setting the grammar reads
from now exists**, which is what gap #1 was: everything in the grammar (S11) and the tier fallback (S12)
could not be *configured* while it was hard-coded.

**D2 — the entities path runs on the deprecated resolver.** *(PARTLY FIXED 2026-10-06 — see §2c; the
entities write path now uses the registry, but 198 other call sites do not.)* `definitions.mutation-guard.ts`
called `validateCrudMutationGuard()`, which the code itself marks `@deprecated` with a warning:

> *"Resolves ONLY the single DI-registered `crudMutationGuardService`, so it silently bypasses every
> guard in the global mutation-guard store … Use the full registry instead: `runRouteMutationGuards()`
> … or `runMutationGuards()`."*

Effect today: **the authoritative write path for tables and columns — the exact path the structural
grammar must govern — was the one path not running the full guard set.** The entities path is fixed; the
**wider sweep of 177 call sites across 69 files is open** (§2c) — `data_sync` (19) and `entities/encryption.ts` (2) are now retired — with the plan in §2e.

**D3 — the guard result is binary; there is no "escalate".** `MutationGuardResult.ok` is a boolean. A
guard can **allow** or **block** — it cannot say *"allowed, but a person must review"*. The owner's
whole grammar needs a third outcome. Without it, every `review_required` decision has nowhere to go but
"block", which turns the dictionary's quiet tier back into a hard stop.

**Order within the foundation:** **D0 → D1 → D2 → D3.** D0 is not optional and comes first, because the
other three are meaningless without it.

---

## 2c. D0 — FIXED and PROVEN, 2026-10-06 (code commit `d225602`)

**Root cause, measured by two routes that share no failure mode:**

1. **Read the artefact:** `apps/mercato/.mercato/generated/guards.generated.ts` exported
   `guardEntries: GuardEntry[] = []` — zero entries — and it **is** imported at `bootstrap.ts:44`.
2. **The producer's own test:** `packages/cli/src/lib/generators/__tests__/structural-contracts.test.ts`
   builds a module that ships `data/guards.ts` and asserts it **must** appear in the generated file.
   That test passes. **So the generator is correct — it was never the bug.**

**The actual cause:** the only modules that ship a `data/guards.ts` are `customers` and
`customer_accounts`, and **both are parked** in `apps/mercato/src/modules.ts` (the deliberate "ERP is
off" decision, 14 modules commented out). The `example` module ships one too, but it is off unless
`OM_ENABLE_EXAMPLES=true`. So **no enabled module contributed a guard**, and the registry was correctly
empty. It was never a wiring failure; it was an **empty-supply** failure — which is worse, because it
looks identical to a healthy system.

**The fix, and the proof:**

| What changed | Why |
|---|---|
| `packages/core/src/modules/entities/data/guards.ts` **(new)** | Gives the registry a real, enabled source. Two genuine structural policies: a custom field may not claim a system column (`id`/`created_at`/`updated_at`/`deleted_at` — `records.ts` silently strips those, so such a field could never hold a value), and field keys must be snake_case. |
| `apps/mercato/src/__tests__/guard-registry-delivery.test.ts` **(new)** | Proves the **delivery chain** against the **real generated file** and the **real store** — no mocks on the artefact under test. |
| `entities/api/definitions.mutation-guard.ts` | **D2, entities scope:** now calls `runRouteMutationGuards()` (the registry wrapper the `@deprecated` docstring names) instead of `validateCrudMutationGuard()`. Legacy behaviour preserved via `bridgeLegacyGuard()`. |
| `entities/api/__tests__/definitions.mutation-guard.test.ts` | **Repaired** — its mocks pointed at the deprecated pair and were falsified by the change. Re-pointed to the registry wrapper; same intent; mutation-proven red. |

**Proof, all measured this turn:**

- The generated file now contains the `entities` entry (route 1).
- The delivery test is **mutation-proven, not merely green**: emptying `guardEntries` → **4 red**;
  making `registerMutationGuards` a no-op → **3 red**; neutering the one guard policy → **1 red, the
  right one**. A test that cannot fail proves nothing.
- `structural-contracts` (the generator's own suite) **104/104**; `entities` **222/222**;
  guard-delivery **5/5**; `core` and `app` `tsc --noEmit` **exit 0**; every mutated file restored
  **md5-identical**.

**What remains, and it is now a named, counted item — `D2-wide`:**

A sweep found **199 non-test call sites across 78 files** still calling the deprecated
`validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()` pair — i.e. still **bypassing the
registry**. The raw grep is **203 / 80 files**; subtract the 2 declarations in `mutation-guard.ts` and
the 2 docstring mentions in `route-mutation-guard.ts` and the true migration target is **199 / 78**.
*(Re-measured 2026-10-06 with the comment filter now in the command: **198 real call sites** at `d225602`,
the extra 1 being a comment line that named the pair — a 1-off, and precisely the kind of slip the
"count calls, not lines" rule exists to stop. A name-only grep gives ~356 because it also counts **import
and docstring lines** that merely name the functions — 356 = names mentioned, 198 = calls made. Two
different questions; recorded here so the wrong one is not re-derived.)*

Of the 199, **93 calls in 38 files are in ENABLED modules** (`auth`, `dashboards`, `data_sync`,
`dictionaries`, `directory`, `entities`, `feature_toggles`, `inbox_ops`, `perspectives`, `planner`,
`query_index`, `translations`, `workflows`) — these run today and bypass the registry today; **106 calls
in 40 files are in parked modules** (`customers`, `customer_accounts`, `catalog`, `sales`, `wms`,
`resources`, `shipping_carriers`, `payment_gateways`) — they do not run, but they are upstream code we
must not diverge from carelessly. **One of the 199 is already retired for real** — the `entities` write
path (`d225602`, §2c) — and it stands as the worked example for the rest.**So the registry is now populated and delivering — and most routes still do not consume it.** That is the
same class of defect D0 was, one layer up.

---

## 2e. D2-wide — the PLAN, and the owner's per-module decision (2026-10-06)

**The owner's instruction that governs how D2-wide is done:**

> *"If a required function is documented and needed now, we need to check if it already exists in the shape
> of an existing module so we customize that instead of rewrite. Unless deprecated guard resolver has to be
> retired and maybe replaced anyways and in this case mapping existing modules to core needs may provide a
> shortcut to retire the resolver and with every module you decide if you customize and integrate directly
> or just disconnect and park till later."*

So D2-wide is **not** a blind 199-site sweep. It is a **module-to-core-need mapping**, and every affected
module gets **one explicit decision**:

| Decision | What it means | What happens to the resolver in that module |
|---|---|---|
| **(A) Customise & integrate directly** | the module's guards are real, needed *now*, and belong on the registry. Rewrite its deprecated calls to `runRouteMutationGuards()` (the entities worked example, §2c) and prove each one. | the deprecated call is **retired** in that module |
| **(B) Disconnect & park till later** | the module is not needed now (or is already parked). Leave the source untouched, keep it **off** in `modules.ts`, and mark it a **graft-phase** item. | the deprecated call stays, but it **runs nowhere** — parking means it is never executed |
| **(C) Already connected** | the module already runs the registry (entities). | done, kept as the reference implementation |

**The shortcut the owner spotted — and it is real.** Retiring the resolver is *easier* on the **parked**
modules than on the enabled ones, because parking already means "not executed": a parked module's
deprecated call is **dormant**, not live. So the fast route to "the deprecated resolver is fully retired"
is:

1. **Fix the enabled modules first** (38 files) — these are the ones where the bypass is **actually a live
   defect**, because they run.
2. **Disconnect-and-park the parked ones** (40 files) — no code change needed to make the resolver
   *unused* there; they are recorded as graft-phase work with a per-module decision deferred to when the
   module is un-parked for real use.

**Where the mapping lives.** Each affected module is mapped to the **core need** it serves, so the choice
between (A) and (B) is made against a stated need rather than against "the file exists":

| Module | State | Calls / files | Core need it serves | Decision | Why |
|---|---|---|---|---|---|
| `dashboards` | ENABLED | 10 / 4 | views over data (P15) | **A — integrate now** | live: user layout/widget writes; a bypass here is a real hole |
| `data_sync` | ENABLED | 19 / 7 | integrations & sync (P11) | **✅ DONE `c6c3151`** | live: sync schedule/mapping writes; the largest enabled cluster — **retired and proven (§2e)** |
| `dictionaries` | ENABLED | 16 / 6 | tenant vocabularies (Ring 2) | **A — integrate now** | live: status/category writes feed other modules |
| `inbox_ops` | ENABLED | 8 / 4 | messaging/inbox (B13) | **A — integrate now** | live: AI-proposed actions accepted into the record |
| `perspectives` | ENABLED | 8 / 3 | views over data (P15) | **A — integrate now** | live: same shape as dashboards |
| `translations` | ENABLED | 6 / 2 | localization resolution (C10) | **A — integrate now** | live: translation writes |
| `planner` | ENABLED | 4 / 2 | projects/PSA (B8) | **A — integrate now** | live: availability writes |
| `query_index` | ENABLED | 4 / 2 | search/index (P10) | **A — integrate now** | live: reindex/purge writes |
| `entities` | ENABLED | 3 / 2 | custom fields (P16) / structural grammar | **✅ DONE `d225602` + `c6c3151`** | the worked example (§2c) — **plus `api/encryption.ts`, missed by the plan and fixed in `c6c3151`** |
| `auth` | ENABLED | 2 / 1 | identity (P1) | **A — integrate now** | live: invite resend |
| `directory` | ENABLED | 2 / 1 | tenancy/org (P2) | **A — integrate now** | live: org branding write |
| `feature_toggles` | ENABLED | 2 / 1 | flags (P14) | **A — integrate now** | live: override writes |
| `workflows` | ENABLED | 9 / 3 | workflow engine (P8) | **A — integrate now** | live: definition customize/reset writes |
| `customers` | parked | 74 / 25 | CRM (B1) — reference module | **B — park till later** | not needed now; upstream's CRUD reference; graft-phase |
| `customer_accounts` | parked | 10 / 4 | CRM portals (B14) | **B — park till later** | owns `domain_mappings` (wanted) — extract to `directory` in the graft phase |
| `wms` | parked | 6 / 3 | inventory (B4) | **B — park till later** | ERP pack, off by decision |
| `resources` | parked | 4 / 2 | resource envelope (C1 neighbour) | **B — park till later** | parked; its core need is served by GAP A, not by this module |
| `sales` | parked | 4 / 2 | sales (B2) | **B — park till later** | ERP pack, off by decision |
| `shipping_carriers` | parked | 4 / 2 | logistics (B10) | **B — park till later** | ERP pack, off by decision |
| `catalog` | parked | 2 / 1 | catalog (B3) | **B — park till later** | ERP pack, off by decision |
| `payment_gateways` | parked | 2 / 1 | payments (B11) | **B — park till later** | ERP pack, off by decision |

**Totals (re-measured 2026-10-06 by a per-file git walk, two tools agreeing to the count):** ENABLED
**93 calls / 38 files** (13 modules) — of which the `entities` files (3 calls / 2 files) are done, and as of
`c6c3151` the `data_sync` cluster (19 / 7) is done too, so **71 calls** are the live integrate-now work that
remains. **Parked 106 calls / 40 files** (8 modules) — disconnect/park, recorded as graft-phase.
**93 + 106 = 199 raw lines; 38 + 40 = 78 files.** After `data_sync` + `entities/encryption.ts`, the tree
holds **177 real deprecated call sites in 69 files** (198 baseline call sites − 19 − 2 = 177; the baseline's
raw-line 199 included **1 comment line**, the current raw-line 180 includes **3** — the wrapper's and
`encryption.ts`'s own doc-comments name the deprecated pair). **Count calls, not lines:** the two agree
only when comment lines are dropped — see the corrected count command in [`BACKLOG.md`](BACKLOG.md) item
**D2-wide**.

**The order inside D2-wide:** enabled modules first (they are the live hole), largest cluster first
(`data_sync` → `dictionaries` → `dashboards`), each with its own mutation proof exactly as the entities
fix was proven (§2c). Then the parked set is recorded — **not migrated** — as graft-phase work in
[`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) and the backlog.

**Progress — `data_sync` DONE and PROVEN (2026-10-06, code commit `c6c3151`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `data_sync/api/mutation-guard.ts` (`beginDataSyncMutationGuard()`) mirrors the `entities` worked example exactly: every write goes through `runRouteMutationGuards()`, which runs the registry **plus** the bridged legacy service. All 19 deprecated calls in 7 route files were rewritten to the wrapper (`mappings/route`, `mappings/[id]/route`, `run`, `runs/[id]/cancel`, `runs/[id]/retry`, `schedules/route`, `schedules/[id]/route`). |
| **Tests** | 4 existing test files were **repaired, not deleted** — their mocks pointed at the deprecated DI pair and were falsified by the change; they were re-pointed at the registry wrapper with the same intent (blocked guard stops the write; passing guard runs after-success). |
| **Proof** | Two mutations of the wrapper, run in a fresh process: disabling the **block path** → **4 tests RED**; neutering **runAfterSuccess** → **5 tests RED**. Wrapper restored **md5-identical** (`c07c63332c2bd7b0fc31efb1fc36088c`). `entities` + `data_sync` = **50 suites / 303 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **Found while doing it — the plan had MISSED a call site** | `entities/api/encryption.ts` still called the deprecated pair (2 calls). `entities` was tagged decision **(C) — already done**, but only its `definitions`/`entities` files were; this one was not. **Fixed in the same commit** to `beginEntitiesMutationGuard()`, its test repaired the same way. **The lesson, recorded rather than buried:** "a module is done" must be re-measured, never assumed from its tag. |
| **Behaviour note worth keeping** | `bridgeLegacyGuard()` covers only **`update`/`delete`**, so `create`/`custom` no longer reach the legacy DI service. That is the **intended** correction the deprecation names — and it is exactly why a registry guard on a create path now actually runs. |

**The remaining count, re-measured after `data_sync` (2026-10-06).** Deprecated **call sites** left,
excluding the 2 definitions in `mutation-guard.ts` and all comment lines: **177** (baseline **198**;
`data_sync` retired 19, `entities/encryption` retired 2 — a per-file git walk confirms each figure). Enabled
modules still to do: **`dictionaries` (16) → `dashboards` (10) → `workflows` (9) → `inbox_ops` (8) →
`perspectives` (8) → `translations` (6) → `planner` (4) → `query_index` (4) → `auth` (2) → `directory` (2) →
`feature_toggles` (2) = 71 calls**. Then the parked set (106 calls) is recorded, not migrated.

**"How it is solved, when, and where it is documented" — stated plainly, per the owner's reporting
standard:**
- **How:** module-to-core-need mapping; each module tagged (A) customise-and-integrate, (B) disconnect-
  and-park, or (C) already-connected. Enabled modules are rewritten to `runRouteMutationGuards()` and
  mutation-proven; parked modules are left dormant and recorded.
- **When:** enabled modules now (Phase 0, item 2); parked modules at **graft phase**, when and if each is
  un-parked for real use.
- **Where documented:** this section (the plan + the mapping table); [`BACKLOG.md`](BACKLOG.md) item
  **D2-wide** (the counted item + the decision framework); [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md)
  (the parked modules' graft-phase rows).

**Enabled-module count, corrected.** The count of enabled modules quoted elsewhere as "37" was wrong —
it matched commented-out parked lines. Measured two ways (scan of the `enabledModules` array literal,
and a non-comment `id:` sweep), the config declares **35 static enabled modules**; `example` +
`example_customers_sync` join only under `OM_ENABLE_EXAMPLES=true`, `storage_s3` only under
`OM_ENABLE_STORAGE_S3=true`.

---

## 2d. D1 — the tier mapping is a SETTING — FIXED and PROVEN, 2026-10-06 (code commit `558cfab`)

**The owner's instruction, which this answers directly:** *"concerning tiers, default ones and concerning
fallbacks. let's not make it hardcoded but a setting a superadmin can change."* (dictionary §C.2b.)

**What was true before.** The three values — which change *kind* sits in which risk tier, the *default*
tier for an unnamed kind, and the structural-permission *fallback* level — were a frozen `.ts` object
(`CHANGE_KIND_TIER` in `triage.ts`, empty). Changing what the platform permits meant a code deploy.

**The fix.** `packages/shared/src/lib/request-outcome/tier-source.ts` (new): the three values are one
`TierSettings`, read from the platform's **existing** settings engine (`module_configs`, module
`request_outcome`, name `structureChangeTiers`) through `ModuleConfigService.getValue` — so it needs **no
new table** (S5, one engine). The dictionary's table is the **seed** (`DEFAULT_TIER_SETTINGS`:
`changeKindTier` empty on purpose, `defaultTier` = `explicit_approval`, `fallbackLevel` = `approval`).

**How the purity promise was kept.** `triage.ts`'s header promises "no model call, no database, no clock".
The fix **separates the read from the decision**: `loadTierSettings(reader, scope)` is the only async,
store-touching part, taking an injected `TierSettingsReader` typed **structurally** so `shared` never
depends on `core`; `resolveTier(kind, settings)` is pure. `triageRequest(need, settings?)` and
`tierForChange(change, settings?)` take settings as an **optional injected argument**, so every existing
caller keeps its exact behaviour (unrecognised → strictest) and **no existing test changed**.

**Fails closed, strictly.** `parseTierSettings` rejects any malformed setting — a bad tier string, one bad
row inside an otherwise-good map, a missing default, a missing/unknown fallback level — returning `null`,
on which the caller uses the seed. `loadTierSettings` never throws: a throwing reader, a missing reader,
and a bad value all yield the seed. **A broken setting is treated as no setting.**

**Fresh-install wiring.** `packages/core/src/modules/configs/cli.ts` `restore-defaults` now also writes the
tier seed (`core` importing `shared` is the sanctioned direction). `restoreDefaults` fills a missing row
and does not overwrite an edited one without `force`.

| Proof | Result |
|---|---|
| `shared` `tsc --noEmit` | **exit 0** |
| `core` `tsc --noEmit` | **exit 0** |
| `request-outcome` suites | **62/62** (new `tier-source.test.ts` = 30 tests) |
| **Mutation proof** — soften `DEFAULT_TIER_SETTINGS.defaultTier` `explicit_approval` → `safe` | **7 tests RED**, the right ones; restored **md5-identical** (`791b1d1746fcdc3d35b70199c0d7101f`) |
| **Mutation proof** — revert `resolveTier` to a naive `map[kind] ?? default` | **1 test RED** (the hostile-key case); restored **md5-identical** (`e0c5b6a7ccf46d42b142eae092fef1c7`) |

**A critic pass found a real defect in the fix, and it was the same defect twice.** `resolveTier` was
first written as `map[kind] ?? settings.defaultTier`. That reads the **prototype chain**: for a change kind
named `__proto__` it returns `Object.prototype` — which is **truthy**, so `??` keeps it and hands back a
value that is **not a tier at all**. A change kind is a string from a database or a classifier, so it can
be anything. **The fix:** `resolveTier` reads **own keys only** (`Object.prototype.hasOwnProperty.call`)
and re-validates the tier value; `parseTierSettings` builds a **null-prototype** map so a hostile key can
never reach `Object.prototype`. **Then a second pass found the identical lookup still in `tier.ts`**
(`CHANGE_KIND_TIER[kind] ?? …`) — masked only because the seed map is empty — and it was routed through the
same `resolveTier`, so the two lookups cannot diverge. Both are guarded by tests and mutation-proven
(§ table above, second mutation row). This is the pattern the whole method exists for: **a green suite on
the first draft hid a fail-open path**, and only a pass whose job was to break it found it.

**Two routes for the "it is a setting" claim** (they share no failure mode): (1) the injected-reader tests
— a *different* stored value produces a *different* tier out of the same pure function; (2) the
seed→JSON→read round-trip test — the value the CLI writes survives serialisation and reading, and still
fails closed.

**The honest boundary — what D1 does NOT yet do (found by a critic pass on this very work).** The setting
is **written** on install and **read by nothing at request time yet**. A grep for `loadTierSettings` /
`resolveTierWithReader` finds no production caller; the only production import of the whole
`request-outcome` library is the seed line in `configs/cli.ts`. The reason is one layer down: **`triageRequest`
itself has no production caller** — G-21 was built as a *library* (taxonomy, gate, triage, all tested)
with no route wired to it. So D1's setting sits at **exactly the maturity of the thing that consumes it**.

This matters because it is the same shape as the D0 defect (*L83: a file that exists is not a mechanism
that runs*), one layer up again. So the claim is stated precisely: **D1 built the setting the grammar will
read, and proved it fails closed; it is not yet live because G-21 is not yet live.** "The tier mapping is
a setting" is **true** (it is a real setting, changeable, seeded, fail-closed). "The platform reads tiers
at runtime" is **not yet true** — nothing calls the triage at runtime. Wiring the triage to a request path
is G-21's remaining work, and the call sites that will call `loadTierSettings` land with it. Recorded in
BACKLOG under G-21 and SD-4 so it cannot be mistaken for done.

**What D1 did not finish, and it is named.** The full `(object · verb · actorType · role · level)` grammar
beyond the tier fallback is **SD-4** (it needs D3's `escalate` outcome to be useful), and the manage screen
is **SD-5**. D1 delivered the **setting** the grammar reads from — the piece that had to exist first.

---

## 2b. D0 — the generated guard registry was EMPTY (found by a critic pass, 2026-10-06; **fixed, §2c**)

**This was the most important finding of that turn, and it was the owner's exact fear made concrete.**

I claimed last turn and earlier in this document that the guard engine was "live and auto-wired for
every module." **A critic pass measured it and the claim is false.** The truth:

- The generator **does** scan `data/guards.ts` in every module and emit `guards.generated.ts`.
- But the app's generated file — `apps/mercato/.mercato/generated/guards.generated.ts` — is a **shell:
  `export const guardEntries: GuardEntry[] = []`**. **Zero entries.**
- Only **3 modules** even have a `data/guards.ts` source: `customers`, `customer_accounts`, and the
  `create-app` template. **None of them are in the generated registry.**
- That file **is** consumed — `apps/mercato/src/bootstrap.ts:44` imports `guardEntries` — so the wiring
  exists and **the list it carries is empty.** The guards are simply not delivered through it.

**What actually runs, then?** A **second, separate path**: per-route guards. Files like
`api/guards.ts` exist in only **4** modules (`integrations`, `messages`, `payment_gateways`, `staff`),
and the real guard execution is **explicit, hand-written calls** to `runMutationGuards(...)` /
`runRouteMutationGuards(...)` inside individual route files (`configs/api/cache/route.ts`,
`communication_channels/lib/route-mutation-guard.ts`, etc.).

**So the honest one-line state is:** *the guard mechanism is real and is used, but there is no working
data-driven registry — the generated registry is empty, and every guard is wired route-by-route by
hand.* **This is a foundation that looks built and is not wired**, which is precisely why the owner's
instruction — fix the order, do not defer the foundation — is correct.

**D0 — make the generated guard registry real.** *(DONE — §2c.)* The generator was never at fault; the
supply was empty because every module shipping a `data/guards.ts` was parked. An enabled module
(`entities`) now ships real structural guards, and the delivery chain is proven by mutation.

**Also note the deprecated-resolver defect (D2) is now explained:** the entities path calls the
`@deprecated` `validateCrudMutationGuard()`, which resolves only the single DI service and **bypasses the
global registry** — the same registry that is, separately, empty. Both facts point the same way: the
central guard delivery is not healthy.

---

## 3. The full build order — foundation first, then the stack

This is the sequence. Each phase is *unlocked* by the one above it; nothing in a lower phase should be
started while a higher one is open, because it would have to be edited afterwards — the exact thing the
owner wants to avoid.

> **In depth →** every phase below is a section of this file; its detailed reasoning lives in
> [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) §5 (phases −1 to 7), the owner's live status
> is in [`BACKLOG.md`](BACKLOG.md), and the module-level view is
> [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) §5 (build tiers). The per-phase plans and
> records — the graft, strip, repair and salvage batches, the deployment and environment notes, and
> the parked-modules list — are the set at
> [`../../workspace/references/`](../../workspace/references/).

**PHASE −1 — Architecture contracts (NEW — before all code; blueprint §121)**

The blueprint's §121 puts *"define before coding heavily"* first, and it is the direct antidote to this
project's failure mode ("critical requirements slipping out of our view"). Twelve short contracts, each
one page, each with a named home. Details: [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) §2.
- **[CORE-BOUNDARY](CORE-BOUNDARY.md)** — the uncustomisable core / configurable ring / packs (GAP B).
- **Resource envelope** (C1) — the shape every object shares (GAP A, blueprint §3).
- **Actor & context model** (C2) — who acts, in what context.
- **Command / action contract** (C6) · **event envelope** (C7, CloudEvents-shaped) · **error model** (C11).
- **Audit contract** (C8) · **migration & versioning contract** (C9).
- **Localization contract** (C10 + GAP C) — fallback chain, RTL/LTR, accessibility baseline, TZ rule.
- **API conventions** · **tenant model** · **IDs / naming**.

**PHASE 0 — Foundation completion (do first, small, unblocks everything)**

> **In depth →** the guard engine and its four gaps: this file §2/§2b/§2c/§2d/§2e. The owning
> specification: [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) §C.2b (tiers as a
> setting) and S2/S4. The live counts: [`BACKLOG.md`](BACKLOG.md) Phase 2 banner + the `D2-wide` item.
0. ~~**D0** — make the generated guard registry real.~~ ✅ **FIXED 2026-10-06, proven (§2c).** The
   registry now delivers guards from an enabled module, and the delivery chain is mutation-proven.
   **D2-wide (177 deprecated call sites in 69 files remaining; 198 at baseline) is the remaining delivery work — see §2e.**
1. **D1 — ✅ FIXED 2026-10-06, proven.** The tier mapping / defaults / structural fallback are now a
   **setting** a superadmin can change (`module_configs`: module `request_outcome`, name
   `structureChangeTiers`), seeded from the dictionary and read through a function — not a hardcoded
   table. New `packages/shared/src/lib/request-outcome/tier-source.ts`; `triage.ts` takes the settings as
   an optional injected argument so it stays pure; a malformed setting **fails closed** to the seed. See
   §2d. *(Still open under SD-4: the full `(object · verb · actorType · role · level)` grammar beyond the
   tier fallback, and the manage screen SD-5.)*
2. **D2 (entities scope) — ✅ DONE 2026-10-06** (§2c). **D2-wide — OPEN, and now PLANNED (§2e):** retire
   the deprecated `validateCrudMutationGuard()` pair at the **177 remaining call sites in 69 files** (198 at baseline; §2c). *Not* a
   blind sweep: each module is mapped to the core need it serves and given one decision — **(A)**
   customise & integrate directly (71 live calls in 11 enabled modules still to do; 93 enabled calls / 106 parked at baseline), **(B)** disconnect & park till
   later (the 40 parked files, 106 calls), or **(C)** already connected (`entities`). Enabled modules
   first, each with its own proof; parked modules recorded as graft-phase. Mapping table: §2e.
3. **D3** — add the `escalate` outcome to `MutationGuardResult` and route it into the existing
   pending-approval machinery (`authority_pending_acts`).
4. **NEW — Metadata Registry service (GAP A / C5).** Answers "what exists / who owns it / what depends on
   it". Read-only to start; it is what lets the permissions gate enumerate objects and lets the AI be
   bounded. *(Blueprint §54, §86.)*
   *Exit test: an AI asked to add a column lands on `review_required` from the tier fallback, a review
   task appears, and nothing was silently allowed.*

**PHASE 1 — The standards become enforcement, not text**

> **In depth →** the standard being enforced: [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md)
> (S2, S4, §C.1, §C.3, §C.2b). The structural grammar design:
> [`ARCHITECTURE-structure-permissions.md`](ARCHITECTURE-structure-permissions.md). What "core functions
> cannot be deleted" protects: [`CORE-BOUNDARY.md`](CORE-BOUNDARY.md) §2, §5. The owner's request-outcome
> pack: [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md).

5. **SD-1 / S2** — the permissions gate on new data structures: when a table/column/field-type change
   lands, force the permissions question; default = full grant to superadmin + create the records.
6. **SD-3** — make the tier mapping/defaults/fallbacks a **superadmin setting** (`module_configs`, module
   `request_outcome`), seeded from the dictionary, failing closed (§C.2b). **Not** a hardcoded table.
7. **S9 / SD-2** — mark core functions (roles & permissions manager first) and guard their deletion.
8. **SD-4 / SD-5** — the structural grammar screen (manage what can do what, to what level).
9. **NEW — generic state-machine engine** (blueprint §10) promoted to a core primitive: allowed
   transitions, transition permissions, preconditions, events. Today pipelines exist only inside
   `customers`; the blueprint makes lifecycle generic.

**PHASE 2 — Experience contracts completed + standing rebuilds**

> **In depth →** the localization/RTL/a11y contract: [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md)
> GAP C. What the module audit says about the missing dashboard screens and the thin i18n surface:
> [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) §2 (P13, P15). How the AI behaves on being
> blocked / noticing / model routing: [`AGENT-HALF.md`](AGENT-HALF.md) and
> [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md).

10. **GAP C — localization / RTL / accessibility hardened to contract**: logical CSS properties, root
    direction, WCAG 2.2 AA baseline, the 11-dimension component matrix (§88), IANA-tz scheduling rule.
11. **Dashboard / perspective screens** (register: tables+APIs exist, **zero UI pages**).
12. **Notification templates** — decide whether templates stay code-defined or become user-editable.
13. **S7 / G-21** — rebuild request outcomes without the rejected up-front classification.
14. **S3** — tell the user when blocked (the message the owner accepted: *"Tell them"*).
15. **S8** — notice and suggest.
16. **S6** — declared model routing (one picture; every job declares a model).

**PHASE 3 — Data-access depth (the owner's Message A idea, on the built engine)**

> **In depth →** the data-axis authorization design and the coverage gap (6 of 67 tables):
> [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) §2 (P10) and
> [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) (S4). The IR the AI path is wired
> through: [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md).

17. Coverage: extend `aclFeatures` from 6 of 67 tables to all tables, with an aggregate rule so a new
    table cannot be added un-gated. *(Enforced by SD-1, which is why SD-1 is Phase 1.)*
18. Per-user / own / team row scope (today scope is tenant + organization only).
19. Wire the AI IR path to the new column- and row-level gates.

**PHASE 4+ — the blueprint's later phases** (horizontal services · AI foundation · enterprise scale ·
domain packs) — see [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) §5. Notably **entitlements
must be separated from permissions** (blueprint §50) — a distinct concept we currently lack.

---

## 4. Why this order and not another — the reasoning, in one line each

- **D1 before D2/D3:** the grammar needs a home before anything points at it. ✅ **D1 is now done (§2d)** —
  the home exists; D2-wide and D3 point at it next.
- **D2 before any AI structural autonomy:** governing a path that bypasses the guard set is governing
  nothing.
- **D3 before SD-3:** a tier table that can ask for review is useless if "review" is not an outcome.
- **Phase 1 before Phase 2:** S7/S3/S8/S6 are about *how the AI behaves*; behaviour built before the
  hard gates would have to be re-tested against them afterwards.
- **Phase 2 before Phase 3:** data-access depth multiplies the gates; build the gate system once,
  correctly, then widen it.
- **Phase 3 last, deliberately:** widest, most patient work, and it *depends on* SD-1 being enforced —
  otherwise the same "forgot the new table" defect returns at a larger scale.

---

## 5. The correction to my own earlier framing (honesty note)

In the previous turn I described the structural idea as "a socket waiting to be used" and implied the
foundation was solid. **That was wrong twice, and the second time matters more.**

**First, the understatement.** I said the guard engine only needed to be pointed at the structural hook.
Measured now — see §2b — **the generated guard registry in the running app is empty** (`guardEntries:
[]`), only **3** modules ship a `data/guards.ts`, and the guards that actually execute do so through
**hand-written per-route calls** in ~4–6 routes. So the engine is **not** "live and auto-wired"; it is a
**working mechanism with a broken central delivery**. I have corrected the table in §1 and added **D0**.

**Second, and this is the honest headline:** the thing the owner is worried about — *"we do not end up
having permissions for some tables, then forgetting to add to other tables created later and similar
gaps and bugs generating flaws"* — **already happened, in the guard layer, and was not noticed.**
A registry that is empty and a partial per-route wiring is exactly that class of defect. That is the
strongest possible support for his instruction: **fix the order, finish the foundation, do not stack on
top of it.**

**What this does *not* change:** accounts management, roles/permissions and languages are genuinely
built (measured, §1), and the structural grammar is still the right design. The work is still edits to
an existing system. **D0 and D1 are now fixed and proven (§2c, §2d);** what remains is **D2-wide** (177
deprecated call sites in 69 files remaining, planned per-module in §2e) and D3.

---

## 6. What is now recorded so it cannot be forgotten

- This order is **Phase 0 → 3**. Phase 0's gaps are **D1, D2-wide, D3, and the Metadata Registry**;
  **D0 and D1 are fixed** (the registry delivers, §2c; the tiers are a setting, §2d) **and D2's entities
  scope is done** — with all of them proven, not asserted.
- **D2-wide is the live remaining defect:** **177 non-test call sites in 69 files** still bypass the
  registry via the deprecated resolver (baseline **198**, measured 2026-10-06 by a per-file git walk; §2c) — **71 calls in 11
  enabled modules** (integrate now, §2e), **106 calls parked** (disconnect & park). The
  `entities` file is already done, as the worked example. **The plan is per-module (§2e), not a blind
  sweep.** Counted, so it cannot slip out of view.
- It is linked from [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) (Part E and Part F),
  [`BACKLOG.md`](BACKLOG.md) (the Phase 2 banner), [`HANDOVER.md`](HANDOVER.md) (Tier B #B1c),
  [`INDEX.md`](../../INDEX.md) (reading order #1b and the folder map), and
  [`JOURNAL.md`](../../JOURNAL.md) (the 2026-10-06 entry).
- **Rule zero-zero-one** in the COOKBOOK already makes the dictionary binding, so the order inherits
  the same force: it may not be skipped, and doc/code disagreement is the defect.

*If this order is wrong, it changes here first — deliberately, in writing — before the code moves.*
