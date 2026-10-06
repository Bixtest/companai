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

**The owner's standing rules bind this order too:** [`WORKING-RULES.md`](WORKING-RULES.md) gathers
them in one page — the six that outrank everything (including *"if it is ready to be switched on in
the front end, switch it on"*, and *"the Hermes service map is the starting thread"*), how to report,
and the rule that **the task in hand lives only in the `★ ACTIVE TASK` box at the top of
[`../../JOURNAL.md`](../../JOURNAL.md)** — never in this file.

**★ The Hermes rule, stated here because this file sets the order and the order must carry it.**
Before developing **anything**, read
[`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md) for that item — it says
whether the work is an **agent run** (a human's request has to be understood) or **wiring** (an admin
turns a knob). **Both directions of the link must hold:** every AI-touching item in
[`BACKLOG.md`](BACKLOG.md) carries a `★ Hermes:` line naming the map section, and **every item the map
names is reachable from the backlog** — this file's **Phase 0 `In depth →` line above already does
this** for the foundation items (§4.1: *"every Phase 0 item is 'n/a' for Hermes on purpose"*).
**Measured broken on 2026-10-06** (the map named 43 items; the backlog named the map 0 times) — fixed
the same day. **Re-measure with the commands in [`BACKLOG.md`](BACKLOG.md) §A.** **The same rule covers
[`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) (the M/P items) and
[`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) (gaps A–D)** — every item they define is either
a backlog item or cross-referenced from one (backlog **§"The core-module gaps"**).

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
| The guard engine ("this") | **PARTLY BUILT — D0 FIXED 2026-10-06, the rest open** | `MutationGuard` + `runMutationGuards()` exist and run. **D0 fixed:** the generated registry now delivers guards from an enabled module (`entities`), mutation-proven end to end (§2c). **Still open:** the **route path** — **108 call sites** still call the `@deprecated` resolver and bypass the registry (**D2-wide**, §2c/§2e; was 198 real call sites, `entities`, `data_sync`, `dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`, `translations`, `planner`, `query_index`, `auth` and `directory` now migrated); and the guard result is binary, with no `escalate` outcome (**D3**) |
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
**wider sweep of 108 call sites is open** (§2c) — `data_sync` (19), `entities/encryption.ts` (2), `dictionaries` (16), `dashboards` (10), `workflows` (9), `inbox_ops` (8), `perspectives` (8), `translations` (6), `planner` (4), `query_index` (4), `auth` (2) and `directory` (2) are now retired — with the plan in §2e.

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

Of the 198, **93 calls in 38 files are in ENABLED modules** (`auth`, `dashboards`, `data_sync`,
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
| `dashboards` | ENABLED | 10 / 4 | views over data (P15) | **A — integrate now (next)** | live: user layout/widget writes; a bypass here is a real hole |
| `data_sync` | ENABLED | 19 / 7 | integrations & sync (P11) | **✅ DONE `c6c3151`** | live: sync schedule/mapping writes; the largest enabled cluster — **retired and proven (§2e)** |
| `dictionaries` | ENABLED | 16 / 6 → 0 | tenant vocabularies (Ring 2) | **✅ DONE `43e4e5d`** | live: status/category writes feed other modules — **retired and proven (§2e)** |
| `inbox_ops` | ENABLED | 8 / 4 → 0 | messaging/inbox (B13) | **✅ DONE `d89b8f6`** | live: AI-proposed actions accepted into the record — **retired and proven (§2e)** |
| `perspectives` | ENABLED | 8 / 3 → 0 | views over data (P15) | **✅ DONE `e26642c`** | live: same shape as dashboards; **the first module with NO `D2-gap`** — all 3 write routes guarded — **retired and proven (§2e)** |
| `translations` | ENABLED | 6 / 2 → 0 | localization resolution (C10) | **✅ DONE `a2f8d5f`** | live: translation writes; **6 calls → 2 guard objects, not 4** — and `put/locales` is a non-`route.ts` handler a file-name scan misses — **retired and proven (§2e)** |
| `planner` | ENABLED | 4 / 2 → 0 | projects/PSA (B8) | **✅ DONE `641d3af`** | live: availability writes; the plan's figure held on re-measurement; **both handlers are non-`route.ts`** and **no `D2-gap`** — **retired and proven (§2e)** |
| `query_index` | ENABLED | 4 / 2 → 0 | search/index (P10) | **✅ DONE `cc5a237`** | live: reindex/purge writes — **retired and proven (§2e)** |
| `entities` | ENABLED | 3 / 2 | custom fields (P16) / structural grammar | **✅ DONE `d225602` + `c6c3151`** | the worked example (§2c) — **plus `api/encryption.ts`, missed by the plan and fixed in `c6c3151`** |
| `auth` | ENABLED | 2 / 1 → 0 | identity (P1) | **✅ DONE `aeeaad0`** | live: invite resend; **and the module carries the worst `D2-gap` measured — 12 unguarded resource-write verbs** — **retired and proven (§2e)** |
| `directory` | ENABLED | 2 / 1 → 0 | tenancy/org (P2) | **✅ DONE `d682c09`** | live: org branding write; **near-zero `D2-gap` (3 unguarded verbs, `organization-edges` only, protected by other controls)** — **retired and proven (§2e)** |
| `feature_toggles` | ENABLED | 2 / 1 | flags (P14) | **A — integrate now** | live: override writes |
| `workflows` | ENABLED | 9 / 3 → 0 | workflow engine (P8) | **✅ DONE `d3af1b1`** | live: definition customize/reset writes — **retired and proven (§2e)** |
| `customers` | parked | 74 / 25 | CRM (B1) — reference module | **B — park till later** | not needed now; upstream's CRUD reference; graft-phase |
| `customer_accounts` | parked | 10 / 4 | CRM portals (B14) | **B — park till later** | owns `domain_mappings` (wanted) — extract to `directory` in the graft phase |
| `wms` | parked | 6 / 3 | inventory (B4) | **B — park till later** | ERP pack, off by decision |
| `resources` | parked | 4 / 2 | resource envelope (C1 neighbour) | **B — park till later** | parked; its core need is served by GAP A, not by this module |
| `sales` | parked | 4 / 2 | sales (B2) | **B — park till later** | ERP pack, off by decision |
| `shipping_carriers` | parked | 4 / 2 | logistics (B10) | **B — park till later** | ERP pack, off by decision |
| `catalog` | parked | 2 / 1 | catalog (B3) | **B — park till later** | ERP pack, off by decision |
| `payment_gateways` | parked | 2 / 1 | payments (B11) | **B — park till later** | ERP pack, off by decision |

**Totals (re-measured after `directory`, 2026-10-06, by a per-module grep walk).** ENABLED at baseline
**93 calls / 38 files** (13 modules). **Twelve modules are now DONE:** `entities` (was 3/2), `data_sync`
(19/7), `dictionaries` (16/6), `dashboards` (10/4), `workflows` (9/3), `inbox_ops` (8/4), `perspectives` (8/3),
`translations` (6/2), `planner` (4/2), `query_index` (4/2), `auth` (2/1) and `directory` (2/1) → **91 enabled calls retired** (93 baseline − 91 = the 2 still to do). Enabled integrate-now work still to do: **2 calls**
(`feature_toggles` 2). **Parked 106 calls / 40 files** (8 modules)
— disconnect/park, recorded as graft-phase. **Whole tree now: 108 real deprecated call sites**
(198 baseline − 19 − 2 − 16 − 10 − 9 − 8 − 8 − 6 − 4 − 4 − 2 − 2 = 108; measured, and the per-module recount shows `entities`, `data_sync`,
`dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`, `translations`, `planner`, `query_index`, `auth` and `directory` all at **0**). **Files: 41.**

> **⚠️ The file count was wrong for three modules — corrected here, 2026-10-06.** `auth` was recorded as
> **45 → 44** and `query_index`/`planner` as ending at **43**/**45**. Re-measured at each commit, the true
> chain is **78 → 77 → 69 → 63 → 59 → 56 → 52 → 49 → 47 → 45 → 43 → 42** — every per-module **delta** was
> right, but the `auth` row re-used `query_index`'s *before* value (45) as its *after* value, and the error
> propagated into this file, `JOURNAL.md` and `HANDOVER.md`. **Sites were always right** (200 → 108,
> verified at every commit). The two extra files in the near-miss `44` figure were never real: `44` was not
> produced by any filter. **The method that catches this:** derive the chain from the commits themselves
> (`git grep <commit>`) rather than carrying a number forward — the same rule the site counts already follow.
> A wrapper JSDoc that *mentions* the deprecated names still over-counts a naïve `grep -rln` (59 files
> against the true 41), because the line filter does not drop leading-space continuation lines.
> **Count calls, not lines** — see the corrected count command in
> [`BACKLOG.md`](BACKLOG.md) item **D2-wide**.

**The order inside D2-wide:** enabled modules first (they are the live hole), largest cluster first
(`data_sync` ✅ → `dictionaries` ✅ → `dashboards` ✅ → `workflows` ✅ → `inbox_ops` ✅ → `perspectives` ✅ → `translations` ✅ → `planner` ✅ → `query_index` ✅ → `auth` ✅ → `directory` ✅ → `feature_toggles` ⬜), each with its own mutation proof exactly as
the entities fix was proven (§2c). Then the parked set is recorded — **not migrated** — as graft-phase work
in [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) and the backlog.

**Progress — `data_sync` DONE and PROVEN (2026-10-06, code commit `c6c3151`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `data_sync/api/mutation-guard.ts` (`beginDataSyncMutationGuard()`) mirrors the `entities` worked example exactly: every write goes through `runRouteMutationGuards()`, which runs the registry **plus** the bridged legacy service. All 19 deprecated calls in 7 route files were rewritten to the wrapper (`mappings/route`, `mappings/[id]/route`, `run`, `runs/[id]/cancel`, `runs/[id]/retry`, `schedules/route`, `schedules/[id]/route`). |
| **Tests** | 4 existing test files were **repaired, not deleted** — their mocks pointed at the deprecated DI pair and were falsified by the change; they were re-pointed at the registry wrapper with the same intent (blocked guard stops the write; passing guard runs after-success). |
| **Proof** | Two mutations of the wrapper, run in a fresh process: disabling the **block path** → **4 tests RED**; neutering **runAfterSuccess** → **5 tests RED**. Wrapper restored **md5-identical** (`c07c63332c2bd7b0fc31efb1fc36088c`). `entities` + `data_sync` = **50 suites / 303 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **Found while doing it — the plan had MISSED a call site** | `entities/api/encryption.ts` still called the deprecated pair (2 calls). `entities` was tagged decision **(C) — already done**, but only its `definitions`/`entities` files were; this one was not. **Fixed in the same commit** to `beginEntitiesMutationGuard()`, its test repaired the same way. **The lesson, recorded rather than buried:** "a module is done" must be re-measured, never assumed from its tag. |
| **Behaviour note worth keeping** | `bridgeLegacyGuard()` covers only **`update`/`delete`**, so `create`/`custom` no longer reach the legacy DI service. That is the **intended** correction the deprecation names — and it is exactly why a registry guard on a create path now actually runs. |

**Progress — `dictionaries` DONE and PROVEN (2026-10-06, code commit `43e4e5d`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `dictionaries/api/mutation-guard.ts` (`beginDictionariesMutationGuard()`) mirrors `entities`/`data_sync`: every write goes through `runRouteMutationGuards()`. All 16 deprecated calls in 6 route files were rewritten (`route`, `[dictionaryId]/route` ×2, `entries/route`, `entries/reorder`, `entries/set-default`, `entries/[entryId]/route` ×2). **16 calls → 9 guard objects.** |
| **Tests** | 3 test files repaired, not deleted — they mocked the deprecated DI pair and were falsified by the change; re-pointed at the registry wrapper with the same intent. |
| **Proof** | Two mutations of the wrapper: disabling the **block path** → **6 tests RED**; neutering **runAfterSuccess** → **8 tests RED**. Wrapper restored **md5-identical** (`ca0700dada4d5ba7d6128e41ba4bbbd4`). `dictionaries` = **15 suites / 74 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **A behaviour point handled, not silently changed** | The entry create/update routes validated against the **pre-write** id but ran after-success against the id the command bus **returned**. The wrapper's `runAfterSuccess(resourceId?)` now takes an optional id override so the after-success stays bound to the final id. Re-collecting the callbacks for that id is safe **by contract**: `MutationGuard.validate` is a pure predicate (see `entities/data/guards.ts`), so re-running it has no side effect. |
| **Count re-measured** | Repo-wide deprecated non-comment call sites **177 → 161** (−16, exactly this module). Per-module recount shows `dictionaries` at **0**. |

**Progress — `dashboards` DONE and PROVEN (2026-10-06, code commit `a05ea2c`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `dashboards/api/mutation-guard.ts` (`beginDashboardsMutationGuard()`) mirrors `entities`/`data_sync`/`dictionaries`: every write goes through `runRouteMutationGuards()`. All 10 deprecated calls in 4 route files were rewritten (`layout/route` (PUT update), `layout/[itemId]/route` (PATCH update), `roles/widgets/route` (PUT), `users/widgets/route` (PUT)). **10 calls → 5 guard objects.** |
| **Tests** | 4 test files repaired, not deleted — they mocked the deprecated DI pair and were falsified by the change; re-pointed at the registry wrapper with the same intent. Assertions now check `runRouteMutationGuards` was called with the right `{ resourceKind, resourceId, operation }` and that `runAfterSuccess` ran; the block path mocks `{ ok:false, errorStatus:409, errorBody:{error:'conflict'} }`; the two tenant-isolation tests assert the registry was **not** called on a rejected cross-tenant write. |
| **Proof** | Two mutations of the wrapper: disabling the **block path** → **4 tests RED**; neutering **runAfterSuccess** → **4 tests RED**. Wrapper restored **md5-identical** (`76fb8b374e2528f3420879eac8e0e1d4`). `dashboards` api = **5 suites / 19 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **A behaviour point handled, not silently changed** | The `roles/widgets` and `users/widgets` routes each have **two mutually-exclusive branches** — empty id list → remove-and-return, otherwise upsert. Both branches call `guard.runAfterSuccess()`, so the after-success is bound to whichever branch actually ran; the guard itself is created once, before the branch, so a blocked guard stops either branch. |
| **Count re-measured** | Repo-wide deprecated non-comment call sites **161 → 151** (−10, exactly this module). Per-module recount shows `dashboards` at **0**. |

**Progress — `workflows` DONE and PROVEN (2026-10-06, code commit `d3af1b1`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `workflows/api/mutation-guard.ts` (`beginWorkflowsMutationGuard()`) mirrors `entities`/`data_sync`/`dictionaries`/`dashboards`: the routes that **already had** a deprecated guard now go through `runRouteMutationGuards()`. All 9 deprecated calls in 3 route files were rewritten — `definitions/[id]/route.ts` (PUT ×2 sites + DELETE ×1), `definitions/[id]/customize/route.ts` (×1), `definitions/[id]/reset-to-code/route.ts` (×1). **9 calls → 4 guard objects.** |
| **Scope — what this does NOT cover (found by the hostile re-measurement, 2026-10-06)** | **This is not "every `workflows` write is guarded."** 13 of the module's 19 write routes call **no guard at all** — neither this wrapper nor the deprecated pair: `definitions/route` (POST), `instances/route`, `instances/validate-start`, `instances/[id]/{advance,cancel,retry,signal}`, `tasks/route`, `tasks/[id]/{claim,complete}`, `signals/route`, `events` subscribe/unsubscribe. Each shows `deprecated_calls_at_parent = 0` at `d3af1b1~1`, so the gap is **pre-existing**, not introduced here — and it is why this migration measured only 9 calls in 3 files. It is tracked as its own backlog item, **`D2-gap`**. **The lesson: "0 remaining on `D2-wide`" means "no deprecated resolver left", NOT "the module is guarded".** The same question must be asked of `data_sync`, `dictionaries` and `dashboards` before any of their rows is read as coverage. |
| **Tests** | 4 test files repaired, not deleted — they mocked the deprecated DI pair and were falsified by the change; re-pointed at the registry wrapper with the same intent. A new suite `api/__tests__/mutation-guard.route.test.ts` is the guard proof: it asserts the block path short-circuits all five write sites, the after-success runs only after a committed write, the after-success is re-bound to the row id the write produced, and the registry receives the verified tenant/org/actor. |
| **A proof defect found and fixed while proving it** | The first attempt mocked the **module wrapper** in each test, so both mutations left the suite green — the mutation was invisible because the mutated code never ran. The working pattern (now recorded): stub **only** the registry call `runRouteMutationGuards`, let the module wrapper run for real. This is why the new dedicated suite exists. |
| **Proof** | Two mutations of the wrapper: disabling the **block path** → **5 tests RED**; neutering **runAfterSuccess** → **3 tests RED**. Wrapper restored **md5-identical** (`b969e361b9c727e61f3365f0f9cae1b0`). **That is the hash the proof restored, not the hash in the tree now:** the hostile re-measurement (row above) required a comment-only edit to the wrapper header, which moved the file to `bc030d318c0baeb23d875727d65ee9dc` — header prose only, no executable line changed; suites re-run green after it (7 suites / 118 tests). `workflows` api = **7 suites / 118 tests green**; whole `workflows` module = **45 suites / 650 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **A behaviour point handled, not silently changed** | `definitions/[id]/route.ts` PUT has **two mutually-exclusive branches** — a `code:<workflowId>` id (materialise/revive an override row) or a plain DB row update. The guard is collected **once, before the branch**; whichever branch runs calls `guard.runAfterSuccess()`. The `code:` branch validates against the synthetic id but re-binds the after-success to the row id the write produced. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **151 → 142** (−9, exactly this module). Both `grep … | grep -vE` and `git grep` agree. Per-module recount shows `workflows` at **0**. |

**Progress — `inbox_ops` DONE and PROVEN (2026-10-06, code commit `d89b8f6`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `inbox_ops/api/mutation-guard.ts` (`beginInboxOpsMutationGuard()`) mirrors `entities`/`data_sync`/`dictionaries`/`dashboards`/`workflows`: the routes that **already had** a deprecated guard now go through `runRouteMutationGuards()`. All 8 deprecated calls in 4 route files were rewritten — `proposals/[id]/categorize` (POST, `operation update`), `proposals/[id]/actions/[actionId]` (PATCH, `update`), `proposals/[id]/accept-all` (POST, `custom`), `emails/[id]` (DELETE, `delete`). **8 calls → 4 guard objects.** |
| **Tests** | One existing suite (`api/__tests__/mutation-guards.test.ts`, 9 tests) repaired, not deleted — it mocked the **deprecated** module, which is the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. Its ordering assertions now read the registry's single `{ container, req, auth, input }` call. |
| **Proof** | Two mutations of the wrapper: disabling the **block path** → **4 tests RED** (every deny-path test); neutering **`runAfterSuccess`** → **4 tests RED** (every allow-path test). Wrapper restored **md5-identical** (`9490fbfc2b3515ef67a7131b941342d2`). `inbox_ops` api = **15 suites / 107 tests green**; whole `inbox_ops` module = **35 suites / 395 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **A behaviour point kept, not silently dropped** | The email DELETE returned **404 before** the after-success when the row was already gone (the old `runCrudMutationGuardAfterSuccess()` sat below the 404 return). The new code keeps that by **not** calling `guard.runAfterSuccess()` on the 404 path — the hook runs only after a committed write. That path has its own test and stayed green under both mutations, which is correct: it asserts the hook did **not** run. |
| **Scope — what this does NOT cover (measured, not assumed)** | **This is not "every `inbox_ops` write is guarded."** The module has **14** routes exporting a write verb; this wrapper covers **4**. The other **10** call **no guard at all**: `extract`, `emails/[id]/reprocess`, `proposals/[id]/translate`, `proposals/[id]/reject`, `proposals/[id]/actions/[actionId]/{accept,complete,reject}`, `proposals/[id]/replies/[replyId]/send`, `settings`, `webhook/inbound`. Tracked as backlog item **`D2-gap`**; the figure is also in the wrapper's own header. **Same lesson as `workflows`: "0 remaining on `D2-wide`" means "no deprecated resolver left", NOT "the module is guarded".** |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **142 → 134** (−8, exactly this module); file count **56 → 52**. Both `grep … \| grep -vE` and `git grep` classified by a script agree. Per-module recount shows `inbox_ops` at **0**. |

**Progress — `perspectives` DONE and PROVEN (2026-10-06, code commit `e26642c`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `perspectives/api/mutation-guard.ts` (`beginPerspectivesMutationGuard()`) mirrors `entities`/`data_sync`/`dictionaries`/`dashboards`/`workflows`/`inbox_ops`: the routes that **already had** a deprecated guard now go through `runRouteMutationGuards()`. All 8 deprecated calls in 3 route files were rewritten — `[tableId]` (POST, `custom`), `[tableId]/[perspectiveId]` (DELETE, `delete`), `[tableId]/roles/[roleId]` (DELETE, `delete`). **8 calls → 4 guard objects.** |
| **The shape that is new to this module** | The POST route guards **two resources in one request**: a personal perspective (`perspectives.perspective`, `resourceId = parsed.data.perspectiveId ?? tableId`) and — when the payload carries role ops — a role perspective (`perspectives.role_perspective`, `resourceId = targetRoleIds.join(',')`). Each is a separate guard object from the factory, evaluated independently, each keeping its own after-success condition: the personal guard runs unconditionally (matching the old always-true `shouldRunAfterSuccess`), the role guard runs only when `didWriteRolePerspectives` (`applyToRoles.length > 0 \|\| clearedRolePerspectiveCount > 0`). The definitions of `hasRoleOps`/`targetRoleIds`/`applyToRoles`/`clearRoleIds` are **byte-identical to HEAD**. |
| **Tests** | One existing suite (`api/[tableId]/__tests__/mutation-guard.test.ts`, 8 tests) repaired, not deleted — it mocked the **deprecated** module, which is the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. Its ordering assertions now read the registry's single `{ container, req, auth, input }` call. |
| **Proof** | Two mutations of the wrapper: disabling the **block path** → **2 tests RED** (both deny-path tests — the personal deny and the role deny); neutering **`runAfterSuccess`** → **5 tests RED** (every allow-path test, plus the clear-only no-op that counts exactly one after-success call). Wrapper restored **md5-identical** (`acbd7125327bfdb0a79c12f2028b3888`). `perspectives` module = **7 suites / 44 tests green**; `core` `tsc --noEmit` **exit 0**; `shared` `tsc --noEmit` **exit 0**. |
| **Scope — and it is the good news for once** | **This module has NO `D2-gap`.** Measured: it has **3** routes exporting a write verb (`POST` on `[tableId]`, `DELETE` on `[tableId]/[perspectiveId]`, `DELETE` on `[tableId]/roles/[roleId]`), and this wrapper covers **all 3**. The only route with no guard is `GET` on `[tableId]`, which reads. **`perspectives` is the first module in the sweep where "0 remaining on `D2-wide`" and "the module is guarded" are the same statement** — unlike `workflows` (13/19 unguarded) and `inbox_ops` (10/14 unguarded). |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **134 → 126** (−8, exactly this module); file count **52 → 49** (−3, exactly the three routes repointed). Both `grep … \| grep -vE` and `git grep` classified by a script agree — and the HEAD baseline was re-derived the same way via `git stash`, not carried forward. Per-module recount shows `perspectives` at **0**. |

**Progress — `translations` DONE and PROVEN (2026-10-06, code commit `a2f8d5f`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `translations/api/mutation-guard.ts` (`beginTranslationsMutationGuard()`) mirrors `entities`/`data_sync`/`dictionaries`/`dashboards`/`workflows`/`inbox_ops`/`perspectives`: the routes that **already had** a deprecated guard now go through `runRouteMutationGuards()`. All 6 deprecated calls in 2 route files were rewritten — `[entityType]/[entityId]/route.ts` (PUT update, DELETE delete) and `put/locales.ts` (PUT custom). **6 calls → 2 guard objects.** |
| **The plan's figure was WRONG, and the reason is worth keeping** | The queued task said **"6 calls / 2 files"** but **"4 guard objects"**, and the module's row was written as though three routes each contributed a guard. Measured from the source: the routes collect **one guard object each**, and `put/locales` and `[entityType]/[entityId]` are **two different routes**, not two halves of one — so it is **2 guard objects**, and the repo-wide count drops **6**, not 4. **The plan had counted each route *file* as contributing a guard per exported verb; the code does not work that way.** |
| **A route the file-name scan misses** | **`put/locales.ts` is not a `route.ts`.** It exports its handler as the module **default** (`export default PUT`) with a `metadata.path` of `/translations/locales`. A sweep that globs only for files named `route.ts` — as the module-by-module walk had been described — **silently skips it**, and a migration that trusts such a sweep leaves this route on the deprecated resolver while reporting the module clean. It was found here by walking **every `.ts` file under `api/`**, not by name. **Any later module in this sweep must do the same**, or the count will be wrong in the safe-looking direction. |
| **Tests** | Two existing suites repaired, not deleted — both mocked the **deprecated** module, which is the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. Their ordering assertions now read the registry's single `{ container, req, auth, input }` call. The PUT suite gained a test for the **id re-binding** (below) and the locales suite gained one asserting the **dedupe/normalise behaviour is preserved** across the rewrite. |
| **A behaviour point handled, not silently changed** | The PUT route is the **first** in the sweep where the id must change *between* the guard and the after-success, so it is the first real use of `runAfterSuccess(resourceIdOverride)`. The old code validated against the **composite** id (`${entityType}:${entityId}` — a translation has no single-column key before the write) but the after-success carried the same string, **not** the row id the command bus returned (`result.rowId`). The wrapper now re-binds the after-success to `result.rowId`: it re-collects the guard set bound to the final id and runs those callbacks. Safe **by contract** — `MutationGuard.validate` is a pure predicate — and both branches are tested (id changed → 2 registry calls; id unchanged → 1, which is the common update path). **This is an improvement, and it is stated rather than buried:** the old after-success reported a synthetic id for a row that was just created. |
| **Proof** | Two mutations of the wrapper, each in a fresh process: disabling the **block path** → **3 tests RED** (all three deny-path tests: PUT, DELETE, locales); neutering **`runAfterSuccess`** → **3 tests RED** (the locales allow-path test, the PUT id-re-binding test, and the DELETE allow-path test). Wrapper restored **md5-identical** (`cab5084e343f9f7a076e0ae8427ccc52`). `translations` module = **16 suites / 215 tests green**; **whole core suite 603 suites / 5133 tests green**; `core` `tsc --noEmit` **exit 0**. **One allow-path test stays green under mutation 2, and it is named here** so a later reader re-checking the proof is not surprised: `runs the registry guard and after-success hook when saving translations (PUT)`. **Why:** that test lets the write return a **new** `rowId`, so the wrapper takes the **re-binding** branch (which calls `rebound.runAfterSuccess()`) and never reaches the `guardResult.runAfterSuccess()` line the mutation deleted. It is covered by the neighbouring test instead. Both branches of the wrapper are therefore proven — but by **different tests**, which is worth knowing before anyone counts them. |
| **Scope — measured by walking every `.ts` file, not by name** | **All 3 write verbs in this module are guarded, so `translations` has NO `D2-gap`** — like `perspectives`, and unlike `workflows` (13/19 unguarded) and `inbox_ops` (10/14 unguarded). The inventory is exactly two write-verb files (`[entityType]/[entityId]` → PUT + DELETE; `put/locales` → PUT) and the wrapper covers both; the module's only other API file is `get/locales.ts`, which reads. |
| **Why the migration matters even though the module ships no guards of its own** | `translations/data/` holds `entities.ts` and `validators.ts` but **no `guards.ts`**, so `getAllMutationGuardInstances()` contributes nothing from `translations.*` today. The migration is still correct and still necessary: it removes the **bypass**, keeps the bridged legacy service running exactly as before (`bridgeLegacyGuard()`), and means the **first** guard this module ever ships is **enforced**, not silently skipped. **The defect being fixed is the bypass, not the absence of guards** — worth stating so a later reader does not conclude the work was cosmetic. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **126 → 120** (−6, exactly this module). Both `grep … \| grep -vE` and `git grep` classified by a script agree on **120**. Per-module recount shows `translations` at **0**. **One correction to the file count:** the documented `grep -rln` form reads **49** here, but that is **too loose** — it counts the JSDoc in the migrated modules' own `api/mutation-guard.ts` wrappers, which the line filter does not drop because the mentions sit on leading-space continuation lines. The **definitive** file count is **47**, counted with the wrapper files excluded by path; on GitHub the one file this affects is `entities/api/encryption.ts`, whose only remaining mention is a comment. **Use 47.** |

**Progress — `auth` DONE and PROVEN (2026-10-06, code commit `aeeaad0`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `auth/api/mutation-guard.ts` (`beginAuthMutationGuard()`) mirrors the ten modules before it: the one route that **already had** a deprecated guard now goes through `runRouteMutationGuards()`. All 2 deprecated calls in 1 file were rewritten — `api/users/resend-invite/route.ts` (POST). **2 calls → 1 guard object.** |
| **The plan's figure held — verified, not inherited** | The queued task said **2 calls / 1 file → 1 guard object**, and walking every `.ts` file under `api/` confirms exactly **2 real call sites in 1 file**, one guard object. Third module in a row where the plan's number survived re-measurement. |
| **The file count is right by luck, and that is recorded** | The plan said **1 file** and there is exactly **1** — but the module has **18 files exporting a write verb**, so "1 file" invites the wrong conclusion ("nearly clean"). What needs saying is the other half, below. |
| **The real finding — `auth` carries the worst `D2-gap` measured** | Reading each write verb's guards: of **18 files exporting a write verb, only 3 are guarded** (`users/resend-invite` → this wrapper; `users/route.ts` and `roles/route.ts` → `makeCrudRoute` → `collectAndRunGuards()`). **12 resource-write verbs across 10 files call no guard whatsoever** — neither the registry nor the deprecated pair: `users/acl` (PUT), `roles/acl` (PUT), `sidebar/preferences` (PUT, DELETE), `sidebar/variants` (POST), `sidebar/variants/[id]` (PUT, DELETE), and five `authority/*` routes (POST each: `delegations`, `denials`, `pending-acts`, `record-locks`, `trust`). **This is `D2-gap`, not `D2-wide`** — recorded as a backlog item, **not fixed here** (this commit's scope is `D2-wide`). |
| **A wrong claim caught and corrected before it shipped** | The wrapper header's **first draft** named a different, wrong `D2-gap` set — written from memory (`users/route.ts` listed as unguarded, `authority/projects` and `sidebar/variants` miscounted). It was corrected against the walk: `users/route.ts` **is** guarded via `makeCrudRoute`, and **`authority/projects/route.ts` exports GET only** (verified, not assumed — so it is 5 authority write routes, not 6). The claim lives in the code, so a wrong claim there is a wrong claim in production. |
| **Auth-flow endpoints separated from real `D2-gap`** | `login`, `logout`, `reset`, `reset/confirm`, `session/refresh`, `profile` (self-service), `locale`, `feature-check` also export write verbs and call no mutation guard — but they change session/credential state and are guarded by their own mechanisms (rate limits, token checks). Counting them as `D2-gap` would inflate the figure; they are named and set aside. |
| **The guard context this route carries, and why it still matches** | The guard input carried `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()` derives both from the `req` it is handed (`route-mutation-guard.ts:143-144`), so the wrapper passes `req` and the observable guard input is **equivalent**. |
| **A caution about this call site, stated because it is load-bearing** | On this route the mutation guard is **not** what stops an actor touching a foreign user's record — that is `assertActorCanAccessUserTarget()` (`lib/grantChecks.ts:130`), called **before** the guard, enforcing the tenant match and the actor's organization list. The migration is still correct and still necessary (it removes the **bypass**), but the security argument rests on that, **not** on this route being unprotected today. |
| **A `shouldRunAfterSuccess` gate that did NOT need re-implementing** | The route gated the after-success by hand (`if (guardResult?.shouldRunAfterSuccess)`). The registry **already** applies that gate internally — `runMutationGuards()` adds a guard's `afterSuccess` only when that guard's `validate()` returned `shouldRunAfterSuccess` (`mutation-guard-registry.ts:117`) — so the wrapper calls `runAfterSuccess()` unconditionally, a **no-op** when no guard asked for it. |
| **Tests** | One existing suite repaired, not deleted — `api/__tests__/resend-invite.route.test.ts` mocked the **deprecated pair**, the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. **15 tests green**, including two new ones: the registry call's `{ container, req, auth, input }` shape (with `organizationId` asserted as the **target user's** org, which is what the route actually passes) and "does NOT run after-success when the guard blocks". |
| **Proof** | Two mutations of the wrapper, each in a fresh process: disabling the **block path** → **2 RED** (both deny-path tests); neutering **`runAfterSuccess`** → **1 RED** (the allow-path test). Wrapper restored **md5-identical** (`bfdd5a9b340bdfbc805e62c3db806315`). **A critic pass then mutated the ROUTE file — not the wrapper — one at a time:** removing `if (guard.blockedResponse) return …` → **2 RED**; removing `await guard.runAfterSuccess()` → **1 RED**. All files restored **byte-identical** (`route.ts` `ede0a6c767fb4931c6c74e3f1aa98be7`, test `660f92e19898f3dbe32e1cd1c5b588fa`). A wrapper-only proof shows the *wrapper* is wired, not that the *route calls it* — both links proved. `auth` module = **78 suites / 653 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **Scope — measured, not assumed** | **1 guarded write verb (the one migrated) and 12 unguarded resource-writes** — so `auth` **has a `D2-gap`**, the largest measured. Unlike `perspectives`, `translations`, `planner`, `query_index` (all 0). |
| **Why the migration matters even though the module ships no guards of its own** | `auth/data/` holds `entities.ts` and `validators.ts` but **no `guards.ts`**, so `getAllMutationGuardInstances()` contributes nothing from `auth.*` today. The migration still removes the **bypass**, keeps the bridged legacy service running exactly as before (`bridgeLegacyGuard()`), and means the first guard this module ever ships is **enforced**. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **112 → 110** (−2, exactly this module). Both `grep … \| grep -vE` and `git grep` classified by a script agree on **110**. Files **43 → 42** (−1, exactly the one route — see the correction note above: the row originally read `45 → 44`, re-using `query_index`'s before-value). Per-module recount shows `auth` at **0**. |

**Progress — `directory` DONE and PROVEN (2026-10-06, code commit `d682c09`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `directory/api/mutation-guard.ts` (`beginDirectoryMutationGuard()`) mirrors the eleven modules before it: the one route that **already had** a deprecated guard now goes through `runRouteMutationGuards()`. All 2 deprecated calls in 1 file were rewritten — `api/organization-branding/route.ts` (PUT ×2 sites). **2 calls → 1 guard object.** |
| **The plan's figure held — verified, not inherited** | The queued task said **2 calls / 1 file → 1 guard object**, and walking every `.ts` file under `api/` confirms exactly **2 real call sites in 1 file**, one guard object. Fourth module in a row where the plan's number survived re-measurement. |
| **`directory` has almost NO `D2-gap` — and that was measured, not assumed** | The `auth` lesson is that a small `D2-wide` number can sit on a large `D2-gap`. Walking **every** write verb in the module and naming its guard: `organization-branding` PUT → **this wrapper**; `organizations/route.ts` and `tenants/route.ts` POST/PUT/DELETE → **`makeCrudRoute` → `collectAndRunGuards()`** (the registry, `factory.ts:615-618`); `organization-edges/route.ts` POST/PATCH/DELETE → **no mutation guard**. `organization-switcher/route.ts` exports **GET only** (checked, not assumed) and the two files under `get/` are GET only. **This module's entire `D2-gap` is 3 unguarded write verbs in 1 file** — an order of magnitude smaller than `auth`'s 12. |
| **Why `organization-edges` is `D2-gap` yet the best-protected route in the module** | It calls no mutation guard, but it is not unprotected: `metadata` gates every verb on the `directory.organizations.manage` feature; `resolveScope()` refuses any request without a verified tenant (401); `assertOrganizationsInTenant()` (POST) is **"the tenant boundary for this table"** — it verifies both endpoint organizations live in the caller's tenant; POST also rejects a self-edge and an edge that would invert the tree; every verb writes a `writeDirectWriteAuditLog()` row; and PATCH calls `enforceCommandOptimisticLockWithGuards()`, whose **first step** is the unconditional OSS optimistic-lock floor (`optimistic-lock-command.ts:351-352`), so a stale overwrite is refused. Recorded, **not fixed here** — scope is `D2-wide`. |
| **A naming trap recorded so a later reader does not repeat it** | `enforceCommandOptimisticLockWithGuards` does **not** run mutation guards. Its `...WithGuards` suffix refers to the *command optimistic-lock* guard service (`resolveCommandOptimisticLockGuardService`) — a different mechanism. A `grep -i guard` shows `organization-edges` as "guarded"; it is not mutation-guarded. |
| **The guard context this route carries, and why it still matches** | The legacy call passed `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()` derives both from the `req` it is handed (`route-mutation-guard.ts:143-144`) and forwards `req.method` / `req.headers` to every guard, so the observable guard input is **equivalent**. The legacy call also keyed the guard on the *organization* (`resourceKind: 'directory.organization'`, `resourceId` = the organization id); preserved **exactly**, so any guard added later sees the same subject. |
| **A caution about this call site, stated because it is load-bearing** | On this route the mutation guard is **not** the main protection. Before it, the route already resolves the caller's single selected organization and tenant (400 if ambiguous), loads the organization row **scoped to that tenant and organization** (`findOneWithDecryption(..., {tenant, id}, ..., {tenantId, organizationId})`, 404 if absent), and refuses a stale overwrite via `enforceCommandOptimisticLock()`. The guard is a narrow extra check, and **`directory` ships no `guards.ts`** — so before this migration the deprecated pair's only real content was the bridged legacy service. The migration is still correct and still necessary: it removes the **bypass**, and means the first guard this module ever ships is **enforced** rather than silently skipped. |
| **A `shouldRunAfterSuccess` gate that did NOT need re-implementing** | The route gated the after-success by hand (`if (guardResult?.ok && guardResult.shouldRunAfterSuccess)`). The registry **already** applies that gate internally (`mutation-guard-registry.ts:117`), so the wrapper calls `runAfterSuccess()` unconditionally — a **no-op** when no guard asked for it. |
| **Tests** | One existing suite repaired, not deleted — `api/organization-branding/__tests__/route.test.ts` stubbed the **DI `crudMutationGuardService`**, the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. **13 tests green**, including three guard-shaped ones: the registry call's `{ container, req, auth, input }` shape (asserting `resourceKind: 'directory.organization'`, `operation: 'update'`, and the real `mutationPayload`), a deny test (423, no flush, no email), and "does NOT run after-success when the guard blocks". |
| **Proof** | Two mutations of the wrapper, each in a fresh process: disabling the **block path** → **2 RED** (both deny-path tests); neutering **`runAfterSuccess`** → **1 RED** (the allow-path test). Wrapper restored **md5-identical** (`9427d68151ecff5823587b65dd937f8e`). **A critic pass then mutated the ROUTE file — not the wrapper — one at a time:** removing the block return → **2 RED**; removing the after-success call → **1 RED**. All files restored **byte-identical** (`route.ts` `54f4a7981135549688c8eba4462651df`). A wrapper-only proof shows the *wrapper* is wired, not that the *route calls it* — both links proved. `directory` module = **27 suites / 194 tests green**; **whole core suite 603 suites / 5136 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **Two traps caught — both by running the tests, not by reading** | **(1) A `*/` inside a block comment.** The wrapper header contained the literal `` `get/*/lookup.ts` `` — the `*/` inside the glob **closed the JSDoc early** and the rest of the header became code; the file would not parse. **Never put a path glob containing `*/` inside a block comment.** **(2) A comment failed a code guard, and the fix nearly repeated it** (recorded as **L91**). `src/__tests__/optimistic-lock-command-coverage.test.ts` regexes **raw file text** for `enforceCommandOptimisticLock(` and does not strip comments; the wrapper's header *named* that helper in prose and was reported as a bypassing direct call site, turning the full suite **1 test RED** — from a comment, in a file that calls neither helper. The first rewrite quoted the regex and **contained the call syntax again**, reproducing the failure. Fixed by naming both helpers **without parentheses**. **A targeted run of the changed module would have missed this** — the guard lives in `src/__tests__/`. |
| **Scope — measured, not assumed** | **1 guarded write verb (the one migrated) and 3 unguarded verbs in 1 file** (`organization-edges`), all three protected by other controls whose names are recorded above. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **110 → 108** (−2, exactly this module). Both `grep … \| grep -vE` and `git grep` classified by a script agree on **108**, with **identical file sets**. Files **42 → 41** (−1, exactly the one route). Per-module recount shows `directory` at **0**. |

**The remaining count, re-measured after `directory` (2026-10-06).** Deprecated **call sites** left,
excluding the definitions in `mutation-guard.ts` and all comment lines: **108** (baseline **198**;
`data_sync` retired 19, `entities/encryption` retired 2, `dictionaries` retired 16, `dashboards` retired 10,
`workflows` retired 9, `inbox_ops` retired 8, `perspectives` retired 8, `translations` retired 6, `planner` retired 4,
`query_index` retired 4, `auth` retired 2, `directory` retired 2 — a per-module grep walk confirms each figure). **Files: 41.** Enabled
modules still to do: **`feature_toggles` (2) = 2 calls**. Then the parked
set (106 calls) is recorded, not migrated.


**Progress — `query_index` DONE and PROVEN (2026-10-06, code commit `cc5a237`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `query_index/api/mutation-guard.ts` (`beginQueryIndexMutationGuard()`) mirrors the nine modules before it: the two routes that **already had** a deprecated guard now go through `runRouteMutationGuards()`. All 4 deprecated calls in 2 files were rewritten — `reindex.ts` (POST) and `purge.ts` (POST). **4 calls → 2 guard objects.** |
| **The plan's figure held again — verified, not inherited** | The queued task said **4 calls / 2 files → 2 guard objects**, and walking every `.ts` file under `api/` confirms exactly **4 real call sites in 2 files**, one guard object per route. Second module in a row where the plan's number survived re-measurement. |
| **Neither route is a `route.ts`** | Both `reindex.ts` and `purge.ts` export a **named** `POST` handler with `metadata = { POST: { requireAuth: true, requireFeatures: […] } }` — not a `route.ts`. A sweep that globs only for files named `route.ts` finds **neither**, and would report the module clean while leaving both live write routes on the deprecated resolver. The same trap `translations` (`put/locales.ts`) and `planner` (`availability-*.ts`) hit. |
| **The guard context these routes carry, and why it still matches** | These routes' guard input carried `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()` derives both from the `req` it is handed and forwards `req.method` / `req.headers` to every guard, so the wrapper passes `req` and the observable guard input is **equivalent**. |
| **A `shouldRunAfterSuccess` gate that did NOT need re-implementing** | The routes gated the after-success by hand: `if (guardResult?.ok && guardResult.shouldRunAfterSuccess)`. The registry **already** applies that gate internally — `runMutationGuards()` adds a guard's `afterSuccess` to the callback list **only** when that guard's `validate()` returned `shouldRunAfterSuccess` (`mutation-guard-registry.ts:117`). The wrapper therefore calls `runAfterSuccess()` unconditionally, a **no-op** when no guard asked for it. |
| **Tests** | One existing suite repaired, not deleted — `__tests__/api-queue-only.test.ts` mocked the **deprecated DI service** (`crudMutationGuardService.validateMutation` / `afterMutationSuccess`), the wrong target now and the exact trap that makes a mutation invisible. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. Its 6 tests assert the registry call's `{ container, req, auth, input }` shape, the two deny paths, the two allow paths, and the call ORDER (guard < emit < after-success) the original suite asserted. Run with `--runTestsByPath` (L88). |
| **Proof** | Two mutations of the wrapper, each in a fresh process: disabling the **block path** → **2 tests RED** (both deny-path tests); neutering **`runAfterSuccess`** → **2 tests RED** (both allow-path tests). Disjoint sets, 2+2 of 6; the two "queues without inline delivery" tests do not assert the guard and correctly stay green under both. Wrapper restored **md5-identical** (`b9f437fe0d7bac77bdc5125414582c9e`). **A critic pass then mutated the ROUTE files — not the wrapper — one at a time:** removing `if (guard.blockedResponse) return …` from `reindex.ts` → the reindex deny-path test **RED** (purge stayed green); removing `await guard.runAfterSuccess()` from `purge.ts` → the purge allow-path test **RED** (reindex stayed green). All three files restored **byte-identical** (`reindex.ts` `689650a85d328a1c8e7800b63d5b04a2`, `purge.ts` `39fc8800f1e5cc4cf2211f4c7ab353fb`). A wrapper-only proof shows the *wrapper* is wired, not that the *routes call it* — both links proved. `query_index` module = **21 suites / 125 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **Scope — measured, not assumed** | **Exactly 2 write verbs in this module and both are guarded, so `query_index` has NO `D2-gap`** (like `perspectives`, `translations` and `planner`, unlike `workflows` 13/19 and `inbox_ops` 10/14). The module's only other API file, `status.ts`, reads (`GET`). |
| **Why the migration matters even though the module ships no guards of its own** | `query_index/data/` holds `entities.ts` but **no `guards.ts`**, so `getAllMutationGuardInstances()` contributes nothing from `query_index.*` today. The migration still removes the **bypass**, keeps the bridged legacy service running exactly as before (`bridgeLegacyGuard()`), and means the first guard this module ever ships is **enforced**. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **116 → 112** (−4, exactly this module). Both `grep … \| grep -vE` and `git grep` classified by a script agree on **112**. Files **45 → 43** (−2, exactly the two routes). Per-module recount shows `query_index` at **0**. |

**The remaining count, re-measured after `query_index` (2026-10-06) — SUPERSEDED (the live figure is the block above, after `auth`); kept as the record.** Deprecated **call sites** left at that point,
excluding the definitions in `mutation-guard.ts` and all comment lines: **112** (baseline **198**;
`data_sync` retired 19, `entities/encryption` retired 2, `dictionaries` retired 16, `dashboards` retired 10,
`workflows` retired 9, `inbox_ops` retired 8, `perspectives` retired 8, `translations` retired 6, `planner` retired 4,
`query_index` retired 4 — a per-module grep walk confirms each figure). **Files: 43.** Enabled
modules then still to do: **`auth` (2) → `directory` (2) → `feature_toggles` (2) = 6 calls**. Then the parked
set (106 calls) is recorded, not migrated.


**Progress — `planner` DONE and PROVEN (2026-10-06, code commit `641d3af`).**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `planner/api/mutation-guard.ts` (`beginPlannerMutationGuard()`) mirrors the eight modules before it: the two routes that **already had** a deprecated guard now go through `runRouteMutationGuards()`. All 4 deprecated calls in 2 files were rewritten — `availability-weekly.ts` (POST) and `availability-date-specific.ts` (POST). **4 calls → 2 guard objects.** |
| **The plan's figure was RIGHT here — and it was verified, not inherited** | The queued task said **4 calls / 2 files → 2 guard objects**, and walking every `.ts` file under `api/` confirms exactly **4 real call sites in 2 files**, one guard object per route. This is the first module in the sweep where the plan's number survived re-measurement unchanged. It is recorded because the lesson from `translations` (L87) is that the figure must be **re-derived**, not because it must be **wrong**. |
| **Neither route is a `route.ts`** | Both `availability-weekly.ts` and `availability-date-specific.ts` export a **named** `POST` handler with `metadata = { POST: { requireAuth: true } }` — not a `route.ts`. A sweep that globs only for files named `route.ts` finds **neither**, and would report the module clean while leaving both live write routes on the deprecated resolver. This is the same trap `translations` hit with `put/locales.ts` (L87). Found by walking every `.ts` file under `api/`. |
| **The guard context these routes carry, and why it still matches** | These routes' guard input carried `requestMethod` / `requestHeaders` explicitly — a shape the earlier modules did not have. `runRouteMutationGuards()` derives both from the `req` it is handed and forwards `req.method` / `req.headers` to every guard, so the wrapper passes `req` and the observable guard input is **equivalent**. Verified by reading `route-mutation-guard.ts:143-144` and `:174-175`, not assumed. |
| **A `shouldRunAfterSuccess` gate that did NOT need re-implementing** | The routes gated the after-success by hand: `if (guardResult?.ok && guardResult.shouldRunAfterSuccess)`. The registry **already** applies that gate internally — `runMutationGuards()` adds a guard's `afterSuccess` to the callback list **only** when that guard's `validate()` returned `shouldRunAfterSuccess` (`mutation-guard-registry.ts:117`). The wrapper therefore calls `runAfterSuccess()` unconditionally, which is a **no-op** when no guard asked for it, not a behaviour change. Stated because a reader comparing old and new will notice the conditional disappearing. |
| **Tests** | One existing suite repaired, not deleted — `api/__tests__/availability-mutation-guard.test.ts` mocked the **deprecated** module, which is the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. Its 4 tests assert the registry call's `{ container, req, auth, input }` shape, the block path, and the after-success. |
| **Proof** | Two mutations of the wrapper, each in a fresh process: disabling the **block path** → **2 tests RED** (both deny-path tests); neutering **`runAfterSuccess`** → **2 tests RED** (both allow-path tests). Every test in the suite is mutation-covered, 2+2 of 4. Wrapper restored **md5-identical** (`2bc9646e2ae83399011a8f5dd94f96f6`). **A critic pass then went further and mutated the ROUTE files — not the wrapper — one at a time:** removing the `if (guard.blockedResponse) return …` line from `availability-weekly.ts` → the weekly deny-path test **RED**; removing the `await guard.runAfterSuccess()` line from `availability-date-specific.ts` → the date-specific allow-path test **RED**. Both routes restored **byte-identical to the commit** (`3bd2c08a3f75a707bc4e5fb8d74e7350`, `ade331c7276e08dc7d526f047cd804bb`), `git status` empty. This matters because a wrapper-only proof shows the *wrapper* is wired, not that the *routes call it* — the two are separate links and both were proved. `planner` module = **13 suites / 53 tests green**; **whole core suite 603 suites / 5133 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **Scope — measured, not assumed** | **All 5 write verbs in this module are guarded, so `planner` has NO `D2-gap`** (like `perspectives` and `translations`, unlike `workflows` 13/19 and `inbox_ops` 10/14). The two **custom** write verbs (`availability-weekly` POST, `availability-date-specific` POST) are covered by this wrapper. The module's other write verbs — `availability-rule-sets.ts` re-exports `crud.POST`/`PUT`/`DELETE` from the `makeCrudRoute` factory in `availability.ts` — **already go through the registry** via `collectAndRunGuards()` (`factory.ts:615-618`), and never called the deprecated pair. Confirmed by reading the factory, not by assuming a `makeCrudRoute` route is safe. |
| **Why the migration matters even though the module ships no guards of its own** | `planner/data/` holds `entities.ts` and `validators.ts` but **no `guards.ts`**, so `getAllMutationGuardInstances()` contributes nothing from `planner.*` today. The migration still removes the **bypass**, keeps the bridged legacy service running exactly as before (`bridgeLegacyGuard()`), and means the first guard this module ever ships is **enforced**. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **120 → 116** (−4, exactly this module). Both `grep … \| grep -vE` and `git grep` classified by a script agree on **116**. Files **47 → 45** (−2, exactly the two routes). Per-module recount shows `planner` at **0**. |

**The remaining count, re-measured after `planner` (2026-10-06) — SUPERSEDED (the live figure is the block above, after `auth`); kept as the record.** Deprecated **call sites** left at that point,
excluding the definitions in `mutation-guard.ts` and all comment lines: **116** (baseline **198**;
`data_sync` retired 19, `entities/encryption` retired 2, `dictionaries` retired 16, `dashboards` retired 10,
`workflows` retired 9, `inbox_ops` retired 8, `perspectives` retired 8, `translations` retired 6, `planner` retired 4 — a per-module grep walk confirms each figure). **Files: 45.** Enabled
modules then still to do: **`query_index` (4) → `auth` (2) → `directory` (2) →
`feature_toggles` (2) = 10 calls**. Then the parked set (106 calls) is recorded, not migrated.


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
> **Why Phase 0 is not about Hermes, and why that matters:**
> [`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md) §4.1 — every Phase 0 item
> is "n/a" for Hermes **on purpose**: Phase 0 builds the authorization *floor* that makes it safe to
> run an agent later. The first item that actually crosses the Hermes port is **G-17**, in §4.2.
0. ~~**D0** — make the generated guard registry real.~~ ✅ **FIXED 2026-10-06, proven (§2c).** The
   registry now delivers guards from an enabled module, and the delivery chain is mutation-proven.
   **D2-wide (108 deprecated call sites remaining; 198 at baseline) is the remaining delivery work — see §2e.**
1. **D1 — ✅ FIXED 2026-10-06, proven.** The tier mapping / defaults / structural fallback are now a
   **setting** a superadmin can change (`module_configs`: module `request_outcome`, name
   `structureChangeTiers`), seeded from the dictionary and read through a function — not a hardcoded
   table. New `packages/shared/src/lib/request-outcome/tier-source.ts`; `triage.ts` takes the settings as
   an optional injected argument so it stays pure; a malformed setting **fails closed** to the seed. See
   §2d. *(Still open under SD-4: the full `(object · verb · actorType · role · level)` grammar beyond the
   tier fallback, and the manage screen SD-5.)*
2. **D2 (entities scope) — ✅ DONE 2026-10-06** (§2c). **D2-wide — OPEN, and now PLANNED (§2e):** retire
   the deprecated `validateCrudMutationGuard()` pair at the **110 remaining call sites** (198 at baseline; §2c). *Not* a
   blind sweep: each module is mapped to the core need it serves and given one decision — **(A)**
   customise & integrate directly (4 live calls in 2 enabled modules still to do; 93 enabled calls / 105 parked at baseline), **(B)** disconnect & park till
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
an existing system. **D0 and D1 are now fixed and proven (§2c, §2d);** what remains is **D2-wide** (110
deprecated call sites remaining, planned per-module in §2e) and D3.

---

## 6. What is now recorded so it cannot be forgotten

- This order is **Phase 0 → 3**. Phase 0's gaps are **D1, D2-wide, D3, and the Metadata Registry**;
  **D0 and D1 are fixed** (the registry delivers, §2c; the tiers are a setting, §2d) **and D2 now has eleven
  modules retired** (`entities`, `data_sync`, `dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`, `translations`, `planner`, `query_index`, `auth`) — with all of them proven, not asserted.
- **D2-wide is the live remaining defect:** **110 non-test call sites** still bypass the
  registry via the deprecated resolver (baseline **198**, measured 2026-10-06 by a per-module grep walk; §2c) — **4 calls in 2
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
