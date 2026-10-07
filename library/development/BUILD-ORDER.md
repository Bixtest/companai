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
| The guard engine ("this") | **PARTLY BUILT — D0 FIXED 2026-10-06, the route path now COMPLETE** | `MutationGuard` + `runMutationGuards()` exist and run. **D0 fixed:** the generated registry now delivers guards from an enabled module (`entities`), mutation-proven end to end (§2c). **Route path: every enabled module migrated** — the remaining **106 call sites** are all in **parked** modules (recorded, not migrated): **D2-wide**, §2c/§2e; was 198 real call sites, and `entities`, `data_sync`, `dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`, `translations`, `planner`, `query_index`, `auth`, `directory` and `feature_toggles` are now retired. Still open: the guard result is binary, with no `escalate` outcome (**D3**) |
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
**wider sweep of enabled modules is complete** (§2c) — `data_sync` (19), `entities/encryption.ts` (2), `dictionaries` (16), `dashboards` (10), `workflows` (9), `inbox_ops` (8), `perspectives` (8), `translations` (6), `planner` (4), `query_index` (4), `auth` (2), `directory` (2) and `feature_toggles` (2) are all retired. **What remains: 106 call sites, all in parked modules** (recorded, not migrated) — with the plan in §2e.

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

> **Sibling section: [§2f](#2f-d2-gap--the-write-routes-that-call-no-guard-measured-2026-10-06-one-module-fixed) — `D2-gap`.**
> `D2-wide` (this section) retires the **deprecated resolver**; `D2-gap` covers the write routes that call
> **no guard at all**. A module can be finished here and still be wide open there — read §2f before reading
> any "0 remaining" figure as coverage.

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
| `feature_toggles` | ENABLED | 2 / 1 → 0 | flags (P14) | **✅ DONE `5af76bc`** | live: override writes; **the LAST ENABLED MODULE — no `D2-gap`; carries the id-rebind (`runAfterSuccess(idOverride)`)** — **retired and proven (§2e)** |
| `workflows` | ENABLED | 9 / 3 → 0 | workflow engine (P8) | **✅ DONE `d3af1b1`** | live: definition customize/reset writes — **retired and proven (§2e)** |
| `customers` | parked | 74 / 25 | CRM (B1) — reference module | **B — park till later** | not needed now; upstream's CRUD reference; graft-phase |
| `customer_accounts` | parked | 10 / 4 | CRM portals (B14) | **B — park till later** | owns `domain_mappings` (wanted) — extract to `directory` in the graft phase |
| `wms` | parked | 6 / 3 | inventory (B4) | **B — park till later** | ERP pack, off by decision |
| `resources` | parked | 4 / 2 | resource envelope (C1 neighbour) | **B — park till later** | parked; its core need is served by GAP A, not by this module |
| `sales` | parked | 4 / 2 | sales (B2) | **B — park till later** | ERP pack, off by decision |
| `shipping_carriers` | parked | 4 / 2 | logistics (B10) | **B — park till later** | ERP pack, off by decision |
| `catalog` | parked | 2 / 1 | catalog (B3) | **B — park till later** | ERP pack, off by decision |
| `payment_gateways` | parked | 2 / 1 | payments (B11) | **B — park till later** | ERP pack, off by decision |

**Totals (re-measured after `feature_toggles`, 2026-10-06, by a per-module grep walk).** ENABLED at baseline
**93 calls / 38 files** (13 modules). **All thirteen modules are now DONE:** `entities` (was 3/2), `data_sync`
(19/7), `dictionaries` (16/6), `dashboards` (10/4), `workflows` (9/3), `inbox_ops` (8/4), `perspectives` (8/3),
`translations` (6/2), `planner` (4/2), `query_index` (4/2), `auth` (2/1), `directory` (2/1) and `feature_toggles` (2/1)
→ **93 enabled calls retired** (93 baseline − 93 = 0 still to do). Enabled integrate-now work still to do: **0 calls
— every enabled module is migrated.** **Parked 106 calls / 40 files** (8 modules)
— disconnect/park, recorded as graft-phase. **Whole tree now: 106 real deprecated call sites**
(198 baseline − 19 − 2 − 16 − 10 − 9 − 8 − 8 − 6 − 4 − 4 − 2 − 2 − 2 = 106; measured, and the per-module recount shows `entities`, `data_sync`,
`dictionaries`, `dashboards`, `workflows`, `inbox_ops`, `perspectives`, `translations`, `planner`, `query_index`, `auth`, `directory` and `feature_toggles` all at **0**). **Files: 40.**

> **⚠️ The file count was wrong for three modules — corrected here, 2026-10-06.** `auth` was recorded as
> **45 → 44** and `query_index`/`planner` as ending at **43**/**45**. Re-measured at each commit, the true
> chain is **78 → 77 → 69 → 63 → 59 → 56 → 52 → 49 → 47 → 45 → 43 → 42 → 41 → 40** — every per-module **delta** was
> right, but the `auth` row re-used `query_index`'s *before* value (45) as its *after* value, and the error
> propagated into this file, `JOURNAL.md` and `HANDOVER.md`. **Sites were always right** (200 → 106,
> verified at every commit). The two extra files in the near-miss `44` figure were never real: `44` was not
> produced by any filter. **The method that catches this:** derive the chain from the commits themselves
> (`git grep <commit>`) rather than carrying a number forward — the same rule the site counts already follow.
> A wrapper JSDoc that *mentions* the deprecated names still over-counts a naïve `grep -rln` (59 files
> against the true 40), because the line filter does not drop leading-space continuation lines.
> **Count calls, not lines** — see the corrected count command in
> [`BACKLOG.md`](BACKLOG.md) item **D2-wide**.

**The order inside D2-wide:** enabled modules first (they are the live hole), largest cluster first
(`data_sync` ✅ → `dictionaries` ✅ → `dashboards` ✅ → `workflows` ✅ → `inbox_ops` ✅ → `perspectives` ✅ → `translations` ✅ → `planner` ✅ → `query_index` ✅ → `auth` ✅ → `directory` ✅ → `feature_toggles` ✅ — **all enabled modules done**), each with its own mutation proof exactly as
the entities fix was proven (§2c). Then the parked set is recorded — **not migrated** — as graft-phase work
in [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) and the backlog.

## 2f. `D2-gap` — the write routes that call NO guard (measured 2026-10-06; EIGHTEEN fixes recorded: twelve D2-gap modules, one registry-bypass class, four modules where the TOOL or the label was the defect, one leftover-verbs re-measure across two wired + two set-aside modules, the last two single-verb modules — `scheduler` wired, `onboarding` actor-less set aside — and the LAST module `communication_channels` (4 → 0: 1 wired, 2 actor-less set aside, 1 read-only set aside), where a hostile critic then found a NEW class the method-based scan could not see — a GET that WRITES: 1 fixed (the oauth callback), 2 set aside by name as read side-effects)

**Why it exists.** `D2-wide` (above) retires the **deprecated** resolver at call sites that still *call*
a guard. `D2-gap` is the **other half**: write routes that call **no guard of any kind** — not the module
wrapper, not `runRouteMutationGuards()`, not the deprecated pair, and not built by `makeCrudRoute` (which
runs the registry itself). A write there is checked by **nothing**, so it is exactly the surface a Hermes
tool call reaches with no authorization describing it (**Hermes map §4.4 (b)**; `S-02`). **A module can
measure `0` remaining on `D2-wide` and still be wide open** — "0 remaining" means "no deprecated resolver
left", never "the module is guarded".

**Measured across every enabled module — `analysis/d2-gap/measure.js` + `FINDINGS.md`.** Re-runnable;
`--json` for machines. Reads the enabled set from `apps/mercato/src/modules.ts` (not a hand-typed list),
strips comments before looking for guards (so a guard *named in prose* is not counted — the L91 lesson),
counts **verbs** not files, and sets the eight auth-flow endpoints aside by name so the figure stays
comparable with the backlog record.

| | count |
|---|---|
| enabled modules with a source tree | **35** |
| write verbs across those modules | **256** |
| **unguarded write verbs (the `D2-gap`)** | **0 now — the write-verb sweep is COMPLETE** — **4 before the `communication_channels` fix** (the LAST module: 1 wired `test-seed`, 2 actor-less set aside (the two webhooks), 1 read-only set aside (oauth initiate); a hostile critic then found a NEW class — a GET that WRITES: 3 found, 0 unguarded — 1 fixed (the oauth callback), 2 set aside by name as read side-effects, reported on their own headline line), **6 before the `scheduler` fix + `onboarding` set-aside** (1 wired through a NEW `beginSchedulerMutationGuard` — an authenticated manual trigger that enqueues a job, a genuine gap; 1 actor-less — the self-service signup CREATES the tenant and reads no session, set aside in the tool), **10 before the `entities` fix** (all 4 wired; 2 were genuine gaps and 2 sat only on the optimistic-lock floor, but the file kept reading as a gap because its POST reached nothing, so all 4 were wired — matching the `directory` precedent), **14 before the `currencies` fix** (all 4 wired; the label did NOT split — every one is a genuine business-row write), **18 before the `configs` fix** (1 verb wired; 2 cache endpoints set aside as read-only; 1 already registry-guarded — tool only, HEAD `e1fa605`), **25 before the `webhooks` fix + tool fix** (5 verbs wired; one false-positive re-export and one actor-less verb re-classified — tool only, HEAD `e1fa605`), **34 before the four-leftover-modules fix** (`directory`/`progress` wired, `dashboards`/`data_sync` set aside; HEAD `0ac8783` + this change), **41 before the `search` fix** (`0ac8783`), **50 before the `attachments` fix** (`88582bd`), **58 before the `workflows` fix** (`a9ecd21`), **68 before the `notifications` tool fix** (HEAD `0350563`, no repo change), **78 before the `inbox_ops` fix** (`0350563`), **88 before the `business_rules` fix** (`c9a6bb6`), **99 before the `auth` fix**, **111 before the `communication_channels` tool fix**, **122 before the `messages` registry-bypass fix**, **143 before the `ai_assistant` fix**, **160 before the `audit_logs` fix** |
| auth-flow verbs set aside by design | 8 |
| **actor-less verbs set aside by design** | **5** (`inbox_ops/api/webhook/inbound.ts`, plus `webhooks/api/inbound/[endpointId]/route.ts` added 2026-10-07, plus `onboarding/api/post/onboarding.ts` added 2026-10-07, plus `communication_channels/api/post/webhook/[provider]/route.ts` + `.../post/webhooks/gmail/route.ts` added 2026-10-07 — public endpoints with no session, guarded by their own signature/rate-limit mechanisms; see the `inbox_ops`, `webhooks`, `scheduler`/`onboarding` and `communication_channels` records below) |
| **read-only "write verbs" set aside by design** | **7** (`workflows/api/instances/validate-start/route.ts`; `dashboards/api/widgets/data/route.ts` + `.../data/batch/route.ts`; `data_sync/api/validate.ts`; `configs/api/system-status/route.ts` + `configs/api/module-telemetry/route.ts`; `communication_channels/api/post/oauth/[provider]/initiate/route.ts` added 2026-10-07 — POSTs/DELETEs that perform no business-row write; see the `workflows`, leftover-verbs, `configs` and `communication_channels` records below) |
| **guard-system verbs set aside by design** | **9** (`ai_assistant` session/flow + pending-action gate — governed by their own mechanisms; added to the tool 2026-10-07 so the figure stopped over-claiming by 9) |
| **write-performing GETs (a GET that writes — NOT a write verb by method; new class 2026-10-07)** | **3 found, 0 unguarded** — `communication_channels/api/get/oauth/[provider]/callback/route.ts` (**fixed** `7494fbe`), `dashboards/api/layout/route.ts` and `messages/api/[id]/route.ts` (**set aside by name as read side-effects**, owner-settled 2026-10-07; class `READ_SIDE_EFFECT_GET_PATHS`). Reported on their own headline line; they do **not** touch the 256. |
| guarded verbs | **227** (142 wrapper · 1 registry · 35 `makeCrudRoute`/`crud.` · 43 module-local helper · 6 re-exported guarded factory · 0 deprecated) |
| *guarded + the four set-aside buckets (not a write to guard)* | *256 = 227 + 8 + 5 + 7 + 9* |

**The split is computed by the tool, not assumed, and every verb is accounted for:** 142 + 1 (registry) + 35 + 43 (local helper) + 6 + 0 +
8 (auth-flow) + 5 (actor-less) + 7 (read-only) + 9 (guard-system) + 0 (lock-floor) + 0 (unguarded) = **256**. **A sixteenth closure check (2026-10-07, after `communication_channels`) confirms it: `unguarded` reads 0, the local term reads 43, and the write-performing-GET class is reported separately (3 found, 0 unguarded — 1 fixed, 2 set aside by name) so it can never be folded into the 256.** *(A first draft carried 33/26/29 forward from memory; the tool
reads 50/35/5, and the closure check is what caught it. **A second closure check caught a label drift in
the "guarded" row:** the columns once read 88 · 90 · 113 · 134, where 113/134 were `guarded + auth-flow`
and the 8 was double-counted against the 256. Corrected to the guarded-only series **88 · 90 · 105 · 126 ·
137 · 149 · 160 · 169 · 179 · 188 · 196**; both numbers are now stated with their meaning. **A third closure check, after the `auth`
fix, read 251 — five short.** The five were `webhooks`' **`GUARDED_REEXPORT`** verbs, omitted by the
summing script: the tool's per-module `fields` carries `reexport`, and any closure arithmetic must
include it. With it the figures balance; the pre-change value reconstructs to the recorded 137. **A
fourth closure check, after the `inbox_ops` fix, is why the actor-less column exists** — the module's
10th verb is wired by nothing *on purpose*, so leaving it inside the unguarded count would have been a
false admission; the tool now names it `ACTORLESS_SET_ASIDE`. **A fifth, after the `notifications` tool
fix, moved 10 verbs into the local-helper column** — the module was fully guarded; only the tool's list
of known helper names was incomplete. **A sixth, after the `workflows` fix, is why the read-only column
exists** — the module's 10th verb is a POST that writes nothing, so wiring it would have been a false
admission of a different kind; the tool now names it `READ_ONLY_SET_ASIDE`. **A seventh, after the
`attachments` fix, adds 8 to BOTH the wrapper and the guarded-only columns and subtracts 8 from the
unguarded count with no new set-aside** — the cleanest transition in the sweep. **An eighth, after the
`search` fix, moves 7 verbs from unguarded to wrapper** (41 → 34), no new set-aside. **A ninth, after the
four-leftover-modules fix, moves 3 verbs to the wrapper (`directory`), 3 more to the wrapper (`progress`,
a NEW wrapper — `progress` had none), and 3 to the read-only column (`dashboards` 2 + `data_sync` 1)** —
34 → 25, read-only 1 → 4, wrapper 121 → 127. **A tenth closure check, 2026-10-07, caught the guarded row
reading 204 for the `search` column and again for the four-leftover-modules column** — the correct values
are **203** and **209**, because the row must include the **5 `GUARDED_REEXPORT`** verbs (127 + 0 + 35 + 42
+ 5 = 209); the 204 omitted them. **This is the same re-export omission the third closure check caught
once already**, which is why the closure arithmetic is spelled out term by term in this section. **An
eleventh closure check, after the `webhooks` fix + tool fix, moves 5 verbs to the wrapper, 1 verb from
unguarded to the re-export column (the `api/route.ts` false-positive shim) and 1 verb from unguarded to
the actor-less column (`inbound/[endpointId]`)** — 25 → 18, re-export 5 → 6, actor-less 1 → 2, wrapper
127 → 132, guarded **215** (`132 + 0 + 35 + 42 + 6 = 215`), closure
`132 + 0 + 35 + 42 + 6 + 0 + 8 + 2 + 4 + 9 + 0 + 18 = 256`. **⚠ THIS CHECK ALSO CAUGHT MY OWN ARITHMETIC
SLIP:** the first draft of this very note wrote `guarded 210` by forgetting to add the 5 new webhooks
wrappers to the wrapper column (`127 + 5 = 132`, not 127) — the term-by-term closure is what caught it,
which is the point of spelling it out. **The re-export column is now load-bearing three times over** —
the third and tenth checks were the same omission, and this check adds to exactly that column.)* **A twelfth
closure check, after the `configs` fix + tool fix, is the FIRST time the registry column is non-zero — and
is why it is a column at all.** The module's 4 verbs split three ways: **1 registry** (`api/cache/route.ts`
builds the full `[...getAllMutationGuardInstances()]` array and calls `runMutationGuards` inline — a
`GUARDED_REGISTRY` blind spot the tool did not see until now), **2 read-only** set asides
(`api/system-status/route.ts` clears an in-process cache; `api/module-telemetry/route.ts` is a dev-only
in-process op — neither writes a business row), and **1 wrapper** (`api/upgrade-actions/route.ts` writes an
`UpgradeActionRun` row via `executeUpgradeAction`). So 18 → 14, wrapper 132 → 133, registry 0 → 1,
read-only 4 → 6, guarded **217** (`133 + 1 + 35 + 42 + 6 = 217`), guarded+set-asides **242**
(`217 + 8 + 2 + 6 + 9`), closure `133 + 1 + 35 + 42 + 6 + 0 + 8 + 2 + 6 + 9 + 0 + 14 = 256`. **The
registry column is now load-bearing:** before this check a `GUARDED_REGISTRY` verb was invisible to the
tool's classifier altogether, so a module could have been "0 unguarded" only by actually calling
`runRouteMutationGuards` — the inline `runMutationGuards(...)` form read as unguarded. The tool now matches
`getAllMutationGuardInstances(...)` **and** `runMutationGuards(...)` in the same file as registry-guarded.** **A
thirteenth closure check, after the `currencies` fix, is the cleanest transition in the sweep** — the four
newly-wired verbs move **only** the wrapper column (133 → **137**), the unguarded count drops 14 → **10**, and
**no** set-aside class changes, so guarded is **221** (`137 + 1 + 35 + 42 + 6 = 221`), guarded+set-asides is
**246** (`221 + 8 + 2 + 6 + 9`), and closure is `137 + 1 + 35 + 42 + 6 + 0 + 8 + 2 + 6 + 9 + 0 + 10 = 256`.** **A
fourteenth closure check, after the `entities` fix, is the same clean shape as the thirteenth** — the four
newly-wired verbs move **only** the wrapper column (137 → **141**), the unguarded count drops 10 → **6**, and
**no** set-aside class changes, so guarded is **225** (`141 + 1 + 35 + 42 + 6 = 225`), guarded+set-asides is
**250** (`225 + 8 + 2 + 6 + 9`), and closure is `141 + 1 + 35 + 42 + 6 + 0 + 8 + 2 + 6 + 9 + 0 + 6 = 256`.** **A fifteenth closure check, after the `scheduler` fix + `onboarding` set-aside, is the first time the actor-less column moves** — `scheduler`'s 1 verb moves **only** the wrapper column (141 → **142**), and `onboarding`'s 1 verb moves from unguarded to the **actor-less** column (2 → **3**), so the unguarded count drops 6 → **4**, guarded is **226** (`142 + 1 + 35 + 42 + 6 = 226`), guarded+set-asides is **252** (`226 + 8 + 3 + 6 + 9`), and closure is `142 + 1 + 35 + 42 + 6 + 0 + 8 + 3 + 6 + 9 + 0 + 4 = 256`. The actor-less column is load-bearing here: `onboarding` is a genuine write that **cannot** be wired (no actor to evaluate the guard set against), so counting it as a gap would be a false admission, and wiring it would be a silent no-op.**

**Both figures are recorded because the number must name the HEAD it was measured at** — the rule that
would have prevented the `auth`-onward file-count slip. `audit_logs` (§ below) accounts for the −2.

**Per module (unguarded verbs):** `ai_assistant` **9 (FIXED, below)** · `messages` **0 (FIXED — registry-bypass, below)** · `communication_channels` **0 (FIXED 2026-10-07 `7494fbe` — the LAST module; the 4 split three ways: 1 wired `test-seed` (both actions) + 2 actor-less set aside (the two webhooks) + 1 read-only set aside (oauth initiate); a hostile critic then found a NEW class — a GET that WRITES: the oauth callback fixed, 2 set aside by name as read side-effects (`dashboards`, `messages`) — below)** ·
`auth` **0 (FIXED — a real D2-gap, 12 verbs wired through the module's own `beginAuthMutationGuard`; the routes were already capability-guarded, only the registry chokepoint was missing — below)** · `business_rules` **0 (FIXED — a real D2-gap, 11 verbs wired through a new `beginBusinessRulesMutationGuard`; the routes were already capability-guarded — below)** · `inbox_ops` **0 (FIXED — a real D2-gap, 9 verbs wired through the module's own `beginInboxOpsMutationGuard`; the 10th is actor-less and set aside by name — below)** · `notifications` **0 (TOOL FIX — all 10 already guarded through a registry-backed local helper; not a D2-gap — below)** · `workflows` **0 (FIXED — a real D2-gap, 9 verbs wired through the module's own `beginWorkflowsMutationGuard`; the 10th is a read-only POST and set aside by name — below)** · `attachments` **0 (FIXED — a real D2-gap, all 8 verbs wired through a new `beginAttachmentsMutationGuard`; a module with NO guard mechanism at all — below)** ·
`search` **0 (FIXED — a real D2-gap, all 7 verbs wired through a new `beginSearchMutationGuard`; a module with NO guard mechanism at all; the routes were already capability-guarded, only the registry chokepoint was missing)** ·
`webhooks` **0 (FIXED 2026-10-07 — 5 genuine verbs wired through a new `beginWebhooksMutationGuard`; the label's 7 split three ways: 1 tool false positive (a re-export shim) + 1 actor-less set-aside + 5 wired)** ·
`configs` **0 (FIXED 2026-10-07 — 1 genuine verb (`api/upgrade-actions`) wired through a new `beginConfigsMutationGuard`; `api/cache` was already registry-guarded inline (a tool blind spot, now seen); `api/system-status` + `api/module-telemetry` set aside as read-only)** ·
`ai_assistant` **9** · `currencies` **0 (FIXED 2026-10-07 — all 4 genuine writes wired through a NEW `beginCurrenciesMutationGuard`; the label did NOT split — 3 in `fetch-configs`, 1 in `fetch-rates`; no set-aside)** · `entities` **0 (FIXED 2026-10-07 — all 4 wired through the module's EXISTING `beginEntitiesMutationGuard`; 2 genuine gaps (`records.ts` POST, `entity-settings.ts` PUT) + 2 on the optimistic-lock floor (`records.ts` PUT/DELETE), but the file kept reading as a gap because its POST reached nothing, so all 4 were wired — the `directory` precedent)** ·
`integrations` **0 (FIXED — registry-bypass, below)** · `progress` **0 (FIXED 2026-10-07 — 3 leftover verbs wired through a NEW `beginProgressMutationGuard`; the module had no wrapper at all)** · `directory` **0 (FIXED 2026-10-07 — 3 leftover verbs in `organization-edges` wired into the module's existing `beginDirectoryMutationGuard`)** · `dashboards` **0 (SET ASIDE 2026-10-07 — 2 `widgets/data` POSTs memo a read via `cache.set`, no business-row write)** · `audit_logs` **0 (FIXED, below)** ·
`scheduler` **0 (FIXED 2026-10-07 — the 1 manual-trigger verb wired through a NEW `beginSchedulerMutationGuard`; an authenticated action route that enqueues a job, so it is a genuine gap; kind `scheduler.job`, op `custom`)** · `onboarding` **0 (SET ASIDE 2026-10-07 — the 1 self-service signup verb is actor-less: it CREATES the tenant and reads no session, so a registry guard cannot be evaluated; set aside in the tool's `ACTORLESS_PATHS`)** · `data_sync` **0 (SET ASIDE 2026-10-07 — `validate` only reads `credentialsService.resolve`)** · and **0** for `dictionaries`, `feature_toggles`,
`perspectives`, `planner`, `query_index`, `translations`, `api_keys`.

**Reconciliation — 9 of 11 recorded modules agree exactly; the other two are explained.** `inbox_ops` 10/14,
`auth` 12 (now 0 — see the record below), `business_rules` 11 (now 0 — see the record below), `directory` 3-in-1-file and the five zeros all matched. **`notifications` was recorded as 10 unguarded and the label over-claimed** — all ten routes already ran a registry-backed local helper; the tool, not the code, was the defect (see the `notifications` record below). **`workflows` was recorded as "13 of 19"
and measures 10** — the record listed `api/tasks/route.ts` and `api/events` subscribe/unsubscribe as
unguarded write routes, but **neither exports a write verb** (checked twice: today's file, and
`git show d3af1b1:…`). They were never write routes; the record counted *files* as if they were.
**Corrected to 10, then fixed to 0 (`a9ecd21`) — see the `workflows` record below.**

**Two unit errors in the first pass of the measurement — both fixed in the tool, both caught by
comparison, neither visible by re-reading my own output:** (1) it counted **files** where the backlog
counts **verbs** (`directory/organization-edges/route.ts` = 1 file, 3 unguarded verbs → the record's 3
was right); (2) the export-detection regex required the verb to follow `const X =`, so
`export const POST = crud.POST` (`auth/users/route.ts`, `auth/roles/route.ts`) read as unguarded —
`auth` read 20, corrected to 12, matching the record.

**Known limits, stated rather than hidden:** `ratelimit_probe` is enabled but has no source directory
under the searched roots (excluded; the exclusion list prints every run); the tool classifies by **what a
file references**, not by tracing the call graph, so a file that references a guard but returns before
calling it would read as guarded (not observed); and the `GUARDED_LOCAL` class depends on
`LOCAL_GUARD_HELPERS` being complete — **a module whose own guard helper is not listed reads as GAP while
being guarded**, which is exactly what happened to `communication_channels` (11 verbs mis-labelled until
`validateRouteMutationGuard` was added). **Check for a module-local guard helper before trusting any GAP.**

**Progress — `audit_logs` DONE and PROVEN (2026-10-06, code commit `4ef5812`). The FIRST `D2-gap` module.**

| What | Detail |
|---|---|
| **The gap** | Both write routes — `audit-logs/actions/undo` (POST) and `actions/redo` (POST) — called **no guard at all**, and are not built by `makeCrudRoute`. **2 unguarded verbs → 0.** |
| **How it was solved** | A new module wrapper `audit_logs/api/mutation-guard.ts` (`beginAuditLogsMutationGuard()`); both routes now call `runRouteMutationGuards()` through it — the same shape as the thirteen `D2-wide` wrappers. |
| **The one design decision** | The guard is evaluated against the **log entry's own `resourceKind`** (fallback `audit_logs.action_log`), because the operation guarded is the *reversal or replay of a write to that resource*: a guard registered against e.g. `directory.organization` must see the **undo of an organization write**, or the one path that can **reverse** a protected change is the one path no guard describes. Evaluating against the wrong key would either fire guards with no business seeing the write, or (worse) match none and look guarded while doing nothing. The value is read from the row, never guessed. |
| **Why this module first** | Undo/redo **replay a registered command** — the most privilege-sensitive write on the platform — and the routes already carry a dense hand-written authorization story. **None of that is replaced**; the missing piece was the **registry chokepoint**. |
| **Guard placement in redo** | The guard runs **after** `resolveRedoInput`, so a request that will 400 ("Redo data unavailable") does not have policy evaluated for it. |
| **Tests** | New suite `api/__tests__/d2-gap-guard.test.ts`, **7 tests**, each asserting the guard is really wired in (registry called once with the row's own resource; guard before the command; a block prevents the command; fallback to the log-table kind for a null-resource row; two negatives that the guard is NOT reached on 401/400; redo guard + afterSuccess). |
| **Proof** | **Three disjoint mutations, restored byte-identical after each** (undo md5 `256401137b7e0f54fd2b7482232ea477`, redo md5 `fd6e65e603256293549d5e98818c5735`): (1) disable the undo block path → exactly the **block** test RED; (2) remove the undo guard call → the **4 undo-guard** tests RED, the other 3 green; (3) remove the redo guard call → exactly the **redo** test RED. `audit_logs` **16 suites / 108 tests green**; core `tsc --noEmit` exit 0. |
| **Next module (was)** | `ai_assistant` — now fixed below. |


**Progress — `ai_assistant` DONE and PROVEN (2026-10-06, code commit `0af50c8`). The SECOND `D2-gap` module, and the largest measured.**

| What | Detail |
|---|---|
| **The gap** | **24 unguarded write verbs across 19 files** — the largest `D2-gap` in the sweep, and the **Hermes-facing** module, so it is where this defect and the Hermes tool door meet most directly. **24 unguarded verbs → 9.** |
| **The three-way split (why not all 24)** | **(a) resource writes — 15 verbs / 10 files → guarded.** **(b) session/flow — 7 verbs → set aside by name:** `ai/chat`, `ai/run-object`, `route` (chat completion / structured output / intent routing; `ai/chat` is rate-limited, the other two do no DB write), `chat`, `session-key`, `mcp-key` (the OpenCode/MCP transport — session-key and MCP-key **minting**, credential machinery, the `auth` login/logout category), `tools/execute` (authorization is the **tool's own** feature checks inside `executeTool`; tools that write go through their own module's guards). **(c) pending-action gate — 2 verbs → set aside by name:** `ai/actions/[id]/confirm`, `ai/actions/[id]/cancel` — the AI mutation-approval gate; confirm calls `runPendingActionRechecks()`, which re-verifies status, expiry, agent registration, required features, **mutation policy**, tool whitelist, attachment tenant scope, record version and schema drift before the wrapped tool runs. **15 + 7 + 2 = 24.** |
| **How it was solved** | A new wrapper `packages/ai-assistant/src/modules/ai_assistant/api/mutation-guard.ts` (`beginAiAssistantMutationGuard()`); the 10 class-(a) files now call `runRouteMutationGuards()` through it. `resourceKind` is shaped `<module>.<entity>`: `ai_assistant.settings`, `ai_assistant.allowlist`, `ai_assistant.agent_override`, `ai_assistant.conversation`. |
| **The design decision carried over** | The `loop-override` DELETE guard runs **only on the path that actually writes** — a no-op clear that finds no row returns `{ cleared: false }` before the guard, the `inbox_ops` 404 precedent: a write that does not happen has nothing for a guard to govern. |
| **What is NOT replaced** | `metadata.requireFeatures`, the inline `rbacService.loadAcl()` check, Zod validation, tenant scoping and ownership rules all stay exactly as they are. The wrapper is **additional** policy. |
| **Tests** | New suite `api/__tests__/d2-gap-guard.test.ts`, **30 tests**, each asserting the guard is really wired in (registry called once per route with the right `resourceKind`/`resourceId`/`operation`; guard before the write; a blocking guard stops the write; `afterSuccess` after commit; the class-(b)/(c) set-aside routes never reach the guard). |
| **Proof** | **Three disjoint mutations, restored byte-identical after each** (wrapper md5 `8f65c25513d5fc8aa8f1d04d6767711b`, conversation-item route md5 `55b1cc1f2aad9e89128a793ba56d8c85`): (1) sever the wrapper's **`afterSuccess`** joint → exactly the **4 `afterSuccess`** tests RED; (2) neuter the wrapper's **block** path → exactly the **9 block** tests RED, nothing else; (3) remove the guard call from **one route file** (`conversations/[conversationId]` PATCH) → exactly that route's **2 PATCH** tests RED, the DELETE test on the same file staying green. `ai_assistant` **99 suites / 1306 tests green** (2 suites fail only on a pre-existing `isolated-vm` native-binding absence on this Windows box — `codemode-tools.test.ts` and its sibling — unrelated to this change); app-level `typecheck` **exit 0**. |
| **Next module** | **`communication_channels` (15 unguarded verbs) — measured next; see the record below (it was mis-labelled).** |


**Progress — `messages` — a REGISTRY-BYPASS, not a D2-gap (2026-10-06, code commit `1f1b60e`).**

| What | Detail |
|---|---|
| **What the label said** | `messages` was measured as **17 unguarded verbs / 11 files** — the largest D2-gap module left. The literal fix (the one `audit_logs` and `ai_assistant` took) would wrap all 11 files in a second guard layer. |
| **What the premise actually was** | **False.** Every one of the 17 verbs **already calls a guard** — `runMessageMutationGuards()` — so the D2-gap definition (*"call no guard whatsoever … checked by nothing"*) did not describe them. The tool read them as GAP only because the file references **none of the four symbols** it scans for. **Measured before fixing, so 11 files were not spent on a fix for a defect that was not there.** |
| **The real defect** | `messages/api/guards.ts` built `runMutationGuards([legacyGuard], …)` — a **one-element array** — so `getAllMutationGuardInstances()` (the global store) was **never consulted**. **Same one-way failure as the deprecated `validateCrudMutationGuard()` pair** (D2-wide), reached through a module-local helper. |
| **The same defect in six more places** | Found by grepping **every `bridgeLegacyGuard` call site**, not the four symbols: `integrations` · `payment_gateways` (parked) · `staff` · `sales/quotes/convert` (inline) · `sales/quotes/send` (inline) · `configs/api/cache` (inline). The `*.mutation-guard.ts` wrappers were **never affected** — they call `runRouteMutationGuards`, which includes the registry. |
| **The fix** | All seven now build the array the way `collectAndRunGuards()` in `crud/factory.ts` does: registry instances first, then the bridged legacy service. |
| **Latent, not live** | Only `customer_accounts`, `customers`, `entities` ship a `data/guards.ts`, and none registers a guard for these modules' resource kinds — so **no write was reachable by a guard a bypass could skip**. Closed before one exists, not after. |
| **Test evidence** | `modules/__tests__/local-guard-helpers-registry.test.ts` — cross-module; drives all four helpers through the **real** store with a **real** guard, asserts it is **called** and can **block**; the container has **no legacy service**, so the registry is the only guard that can run. **16 tests.** |
| **Mutation proof** | Mutating **one** helper (`staff`) back to legacy-only → **exactly that helper's 2 registry-path tests RED, the other 12 green** — localises **per-helper**. Restored byte-identical (md5 `88a91c25b1c3f8c6cd9042ef457764fa`). |
| **Tool corrected** | New fifth class **`GUARDED_LOCAL`** (listed by name), so the figure stops over-claiming. **Its header records the limit:** it proves a guard **call**, not a *registry* guard — a helper that regresses to legacy-only is invisible to it and must be re-read by hand. |
| **Result** | `messages` **17 → 0**, `integrations` **4 → 0**; total **143 → 122**; guarded **113 → 134**. |
| **Green** | core **605 suites / 5159 tests**, core `tsc --noEmit` **exit 0**. |
| **Next module** | **`communication_channels` (15 unguarded verbs)** — measured next; see the record below. |


**Progress — `communication_channels` — NOT a D2-gap; the TOOL was the defect, not the code (2026-10-06; tool fixed in `analysis/d2-gap/measure.js`; repo `workspace/starting-kit` UNCHANGED at `1f1b60e`).**

| What | Detail |
|---|---|
| **What the label said** | **15 unguarded verbs across 15 files** (12 POST, 2 DELETE, 1 PUT — one verb per file) — the largest remaining D2-gap module. The literal fix would wrap all 15 files. |
| **What the premise actually was** | **False for 11 of the 15.** Every one of those 11 verbs **already calls `validateRouteMutationGuard`** — the module's own helper in `lib/route-mutation-guard.ts`, which calls `runRouteMutationGuards` → `getAllMutationGuardInstances()` (the **registry**) **plus** the bridged legacy guard. So they were guarded all along; the tool read them as GAP only because it did not know the helper's **name**. |
| **Two routes agree on the 11/4 split** | **(1) The artefact, route by route:** 11 files reference the helper, each exporting exactly one write verb and holding exactly one guard call (11 verbs / 11 calls, 1:1); the other 4 files hold 4 verbs and no call. **11 + 4 = 15 files, 11 + 4 = 15 verbs.** **(2) The tool's own `--json` rows**, matched against each file's text — same 11/4. *(A first hand-count said "12 guarded, 3 unguarded" — a slip the two machine routes corrected; do not carry the 12 forward.)* |
| **The helper is registry-backed — proven, not read** | `lib/__tests__/route-mutation-guard.test.ts` registers a **real** guard via `registerMutationGuards`, then asserts the helper **blocks** on it (422) **and fires its `afterSuccess`**. A legacy-only helper could not pass — no legacy service is registered in that test. |
| **The 4 left — each named and set aside on evidence, none a D2-gap** | `post/oauth/[provider]/initiate` — **0 DB writes** (issues an OAuth authorize URL + sets a state cookie; an outgoing redirect, not a mutation). `post/webhook/[provider]` — `requireAuth: false`, the **signature verification IS the auth**; **0 DB writes**; verifies a per-tenant signature then **enqueues**; no `(userId, tenantId)` scope for a guard to read. `post/webhooks/gmail` — same shape (a **Google-signed JWT** is the auth, no session); **0 DB writes**; enqueues; 204. `post/test-seed` — **does write, but is gated off in production**: `isTestChannelSeedingEnabled()` (env `OM_ENABLE_TEST_CHANNEL_SEEDING`, unset by default) returns **404 at line 97, BEFORE any write**; every write is after the gate, verified by line order. |
| **The fix** | The **tool**, not the code: `validateRouteMutationGuard` added to `LOCAL_GUARD_HELPERS` in `analysis/d2-gap/measure.js` — after proving the helper reaches the registry. |
| **Result** | `communication_channels` **15 → 4**; total **122 → 111**; local class **21 → 32**; guarded **134 → 145**; closure **65 + 0 + 35 + 32 + 5 + 0 + 8 + 111 = 256**. |
| **Green** | `communication_channels` **58 suites / 558 tests** (incl. the guard test above). |
| **The standing lesson** | The D2-gap label is a **four-symbol string scan** — it can read a guarded route as GAP (this module, `messages`). **Measure the premise the label names before spending files on the fix it implies** (`check-the-premise-before-the-blanket-fix`); and when a module ships its own guard helper, teach the tool the helper's name **only after proving the helper reaches the registry** — the `messages` fix proved the name alone is not enough. |
| **Next module (was)** | `auth` — now fixed below. |

**Progress — `auth` DONE and PROVEN — a REAL `D2-gap`, but NOT an authorization hole (2026-10-07, code commit `8e1632c`).**

| What | Detail |
|---|---|
| **What the label said** | **12 unguarded verbs across 10 files** — the largest remaining module. The label was **right on its face**: these routes really did call **no guard of any kind**. |
| **What the implication would have been, and why it was wrong** | "A write there is checked by nothing" — **false.** Every one of the twelve **already enforced its own capability** (`metadata.requireFeatures`: `auth.delegations.manage`, `auth.denials.manage`, `auth.authority.approve`, `auth.records.lock`, `auth.trust.promote`, `auth.acl.manage`, `auth.sidebar.manage`) **and wrote its own audit entry.** The missing thing was the **structural guard chokepoint**, not authorization. |
| **The 12, by file** | `authority/delegations` POST · `authority/denials` POST · `authority/pending-acts` POST · `authority/record-locks` POST · `authority/trust` POST · `roles/acl` PUT · `users/acl` PUT · `sidebar/preferences` PUT, DELETE · `sidebar/variants` POST · `sidebar/variants/[id]` PUT, DELETE. |
| **Two routes agree on the count** | **(1)** the tool's `--json` rows read **12 GAP / 10 files**; **(2)** the module's own `api/mutation-guard.ts` header — written **2026-10-06, before this work** — records *"12 unguarded resource-writes across 10 files"* with the same six file names. Neither derived from the other. |
| **The fix** | No new wrapper — `auth` already shipped `beginAuthMutationGuard()`. All twelve verbs now call it **after** the route's own auth/validation gates and **before** the write, with `guard.runAfterSuccess()` after commit. Ten files touched. |
| **The narrow security gain — stated so it is not over-read** | `auth` ships **no `data/guards.ts`**, so **no `auth.*` guard exists in the registry today.** The wiring means the **first** `auth.*` guard ever written will be **enforced** rather than silently skipped. It does **not** mean these routes were open. |
| **A latent defect found while wiring** | `sidebar/variants` POST ran its guard **inside** the `try/catch` that turns a unique-constraint violation into a `409 duplicate_name` — so a **blocked** mutation would have been **re-reported as a duplicate name**. Guard moved outside that `catch`. (The `variants/[id]` handlers and the five `authority/*` routes have no such trap — checked, not assumed.) |
| **Proof** | `api/__tests__/d2-gap-wiring.route.test.ts`, **29 tests**, covering all twelve verbs **both ways**: mutation 1 (block) — a **real** registered guard refuses and the **write never happens** (asserted by the service stub's call count, not by the response alone); mutation 2 (allow) — the write happens **and** `afterSuccess` fires **exactly once**. A mock of `beginAuthMutationGuard` would have proven only that a function of that name is called. |
| **Result** | `auth` **12 → 0** (wrapper class for the module **1 → 13**); total **111 → 99**; repo wrapper class **65 → 77**; guarded-only **137 → 149**; closure **77 + 0 + 35 + 32 + 5 + 0 + 8 + 99 = 256**. |
| **Green** | `auth` **79 suites / 682 tests**; core `tsc --noEmit` **exit 0**. |
| **Next module** | ~~`business_rules` (11 unguarded verbs).~~ → **fixed below.** |


**Progress — `business_rules` DONE and PROVEN — a REAL `D2-gap`, but NOT an authorization hole (2026-10-07, code commit `c9a6bb6`).**

| What | Detail |
|---|---|
| **What the label said** | **11 unguarded verbs across 5 files** — the largest remaining module after `auth`. The label was **right on its face**: these routes really did call **no guard of any kind**. |
| **What the implication would have been, and why it was wrong** | "A write there is checked by nothing" — **false.** Every one of the eleven **already enforced its own capability** (`metadata.requireFeatures`: `business_rules.manage`, `business_rules.manage_sets`, `business_rules.execute`) **and scoped every row lookup by tenant + organization.** The missing thing was the **structural guard chokepoint**, not authorization. |
| **The 11, by file** | `rules/route.ts` POST, PUT, DELETE · `sets/route.ts` POST, PUT, DELETE · `sets/[id]/members/route.ts` POST, PUT, DELETE · `execute/route.ts` POST · `execute/[ruleId]/route.ts` POST. |
| **The design decision came from MEASURING a premise** | The two `execute/*` POSTs *look* like "run something" calls, not writes, and the tempting move was to set them aside by name (the `ai_assistant` class-(b) treatment). **The premise was tested and it was false:** both insert a `RuleExecutionLog` row via `logRuleExecution` whenever `dryRun` is false — reached on the success, error **and** timeout paths (verified in `lib/rule-engine.ts`). They are genuine write routes and are guarded against **`business_rules.executionLog`** (the log being written, not the rule being read); the four CRUD routes use `business_rules.rule` / `.ruleSet` / `.ruleSetMember`. |
| **Two routes agree on the count** | **(1)** the tool's `--json` rows read **11 GAP / 5 files** with the five file names; **(2)** the module's five `route.ts` files, read by hand, export exactly eleven write verbs. Neither derived from the other. |
| **The fix** | A **new** wrapper `beginBusinessRulesMutationGuard` (`packages/core/src/modules/business_rules/api/mutation-guard.ts`) runs `runRouteMutationGuards()`. All eleven verbs call it **after** their own auth/validation/optimistic-lock gates and **before** the write, with `guard.runAfterSuccess()` after commit. Five files touched. |
| **The narrow security gain — stated so it is not over-read** | `business_rules` ships **no `data/guards.ts`**, so **no `business_rules.*` guard exists in the registry today.** The wiring means the **first** such guard ever written will be **enforced** rather than silently skipped. It does **not** mean these routes were open. |
| **Proof** | `api/__tests__/d2-gap-wiring.route.test.ts`, **53 tests**, covering all eleven verbs **both ways**: mutation 1 (block) — a **real** registered guard refuses and the **write never happens** (asserted by the entity manager's write record staying empty, not by the response alone); mutation 2 (allow) — the write happens **and** `afterSuccess` fires **exactly once**. A mock of the wrapper would have proven only that a function of that name is called. |
| **Three disjoint mutations proved the suite bites** | (1) neuter the wrapper's **block** path → exactly the **11 mutation-1** tests RED; (2) remove the guard call from **one route file** (`rules/route.ts` POST) → exactly that route's **2 tests** RED, the other 9 verbs staying green; (3) sever the wrapper's **whole `afterSuccess` path** → exactly the **11 mutation-2** tests RED. Every file restored **byte-identical** (wrapper md5 `6638a9593b5f4c4de210cc25a6b38eb3`, `rules/route.ts` md5 `5ef33481f290eae653c73e99546bff0a`). **A first cut of (3) severed only the direct branch and missed the `resourceIdOverride` rebind branch — the two `execute` tests then stayed green and the count came to 9.** That was a gap in the *mutation's* coverage, not a passing test; the full sever gave 11. Recorded, because re-running one's own check would have hidden exactly this. |
| **Result** | `business_rules` **11 → 0** (wrapper class for the module **0 → 11**); total **99 → 88**; repo wrapper class **77 → 88**; guarded-only **149 → 160**; closure **88 + 0 + 35 + 32 + 5 + 0 + 8 + 88 = 256**. |
| **Green** | `business_rules` **19 suites / 393 tests**; core `tsc --noEmit` **exit 0**. |
| **Next module** | **`inbox_ops` / `notifications` / `workflows` (10 unguarded verbs each).** |


**Progress — `inbox_ops` DONE and PROVEN — a REAL `D2-gap`, but NOT an authorization hole, and the FIRST module with a verb that CANNOT be wired (2026-10-07, code commit `0350563`).**

| What | Detail |
|---|---|
| **What the label said** | **10 unguarded verbs across 10 files** — the largest remaining module after `business_rules`. The label was **right on its face**: these routes really did call **no guard of any kind**. |
| **What the implication would have been, and why it was wrong** | "A write there is checked by nothing" — **false.** Every one of the ten **already enforced its own capability** (`metadata.requireFeatures`) **and scoped every row lookup by tenant + organization.** The missing thing was the **structural guard chokepoint**, not authorization. |
| **The 10, by file** | `api/extract` POST · `api/emails/[id]/reprocess` POST · `api/proposals/[id]/translate` POST · `api/proposals/[id]/reject` POST · `api/proposals/[id]/actions/[actionId]/accept` POST · `.../complete` POST · `.../reject` POST · `api/proposals/[id]/replies/[replyId]/send` POST · `api/settings` (PATCH/PUT) · `api/webhook/inbound` POST. |
| **The fix — 9 of the 10** | No new wrapper — `inbox_ops` already ships `beginInboxOpsMutationGuard()`. All nine actor-present verbs call it **after** their own auth/validation/optimistic-lock gates and **before** the write, with `guard.runAfterSuccess()` after commit; where the written id differs from the validated id, the `runAfterSuccess(resourceIdOverride)` rebind idiom is used (`extract` → `email.id`). Guard against `inbox_ops:inbox_email` / `inbox_ops:inbox_proposal` / `inbox_ops:inbox_proposal_action` / `inbox_ops:inbox_settings` (the module's **colon** `resourceKind` convention, unlike `auth`'s dot form — a per-module convention, checked not assumed). |
| **The 10th CANNOT be wired — and setting it aside is the correct answer, not a shortcut** | `api/webhook/inbound.ts` is a **public, actor-less** endpoint: the mail provider calls it, and there is **no `userId`** on the request. The registry guard **requires** a session (`auth.userId` is typed non-nullable) and, more importantly, a feature-gated guard with no user **silently skips** its feature check rather than failing loudly. Manufacturing a session to make the guard "run" would turn a visible gap into a silent one. It is therefore **set aside by name**. |
| **The tool learned a new class so the set-aside is visible** | `ACTORLESS_PATHS = ['inbox_ops/api/webhook/inbound.ts']` → class **`ACTORLESS_SET_ASIDE`**, counted separately (`actorlessVerbs`, `fields.actorless`), and echoed on the console as *"plus N actor-less verbs set aside by design — public endpoints with no session, guarded by their own signature/rate-limit mechanisms."* A set-aside absorbed silently into the unguarded count would be a **false admission**; a set-aside absorbed silently into the *guarded* count would be a **false claim**. It is neither. |
| **Two routes agree on the count** | **(1)** the tool's `--json` rows read **10 GAP / 10 files** with the ten file names; **(2)** the module's own `api/mutation-guard.ts` header — written **before** this work — names **the same ten** unguarded routes. Neither derived from the other. |
| **The narrow security gain — stated so it is not over-read** | `inbox_ops` ships **no `data/guards.ts`**, so **no `inbox_ops.*` guard exists in the registry today.** The wiring means the **first** such guard ever written will be **enforced** rather than silently skipped. It does **not** mean these routes were open. |
| **Proof** | `api/__tests__/d2-gap-wiring.route.test.ts`, **73 tests**, covering the **nine wired** verbs **both ways**: mutation 1 (block) — a **real** registered guard refuses and the response is **423**, with the write record staying **empty** (asserted by the entity manager's write record, not by the response alone); mutation 2 (allow) — the write happens **and** `afterSuccess` fires **exactly once**. A mock of the wrapper would have proven only that a function of that name is called. |
| **Three disjoint mutations proved the suite bites** | (1) neuter the wrapper's **block** path → exactly the **10 mutation-1** tests RED; (2) remove the guard call from **one route file** → exactly that route's **1 test** RED, the other eight verbs staying green; (3) sever the wrapper's **whole `afterSuccess` path** (both the direct and the `resourceIdOverride` rebind branch, from the start) → exactly the **9 mutation-2** tests RED. Every file restored **byte-identical** (md5 **and** a `git diff --numstat` reading **pure insertions, zero deletions**). **A whitespace defect I introduced — an early "no-op" edit collapsed a newline in `translate/route.ts` — typechecked and passed every test; only the md5-vs-pre-mutation check caught it.** Recorded: the tests are not what proves a doc-preserving edit; the hash is. |
| **Result** | `inbox_ops` **10 → 0** (9 wired + 1 actor-less set aside; wrapper class for the module **4 → 13**); total **88 → 78**; repo wrapper class **88 → 97**; guarded-only **160 → 169**; closure **97 + 0 + 35 + 32 + 5 + 0 + 8 + 78 + 1 = 256**. |
| **Green** | `inbox_ops` **608 suites / 5232 tests** (whole core); `core` `tsc --noEmit` **exit 0**. |
| **Next module** | → **`notifications` (10) — done below; then `workflows` (10) — done below.** |


**Progress — `notifications` NOT a D2-gap — the TOOL was the defect, not the code (2026-10-07; tool only, repo unchanged at `0350563`).**

| What | Detail |
|---|---|
| **What the label said** | **10 unguarded verbs across 10 files** — the joint-largest remaining module with `workflows`. The label **over-claimed**, for the **second time** in the sweep (after `communication_channels`). |
| **What the artefact says** | **Every one of the ten routes already runs the registry guard.** `notifications` has **no `api/mutation-guard.ts`** wrapper — which is what the four-symbol scan noticed — but guards through **`lib/routeHelpers.ts`**, one file exporting three **registry-backed** entry points. |
| **The helper, and its three entry points** | `runGuardedNotificationWrite(container, scope, req, options, write)` calls `runRouteMutationGuards(...)` (line 106), returns the guard's block response **before** the write, and runs `await guarded.runAfterSuccess()` **after** it. Two factories call it: `createBulkNotificationRoute` (line 150, used by `batch`, `feature`, `role`) and `createSingleNotificationActionRoute` (line 228, used by `[id]/read`, `[id]/dismiss`). The other five routes (`route` POST, `settings` POST, `mark-all-read` PUT, `[id]/action` POST, `[id]/restore` PUT) call `runGuardedNotificationWrite` directly. |
| **Two routes agree on the count and the wiring** | **(1)** the tool's `--json` rows read **10 GAP / 10 files**, and a hand `find … route.ts` lists **exactly ten** files exporting a write verb — the eleventh API file, `unread-count/route.ts`, is **`GET`-only** (which is why the count is 10, not 11). **(2)** Every one of the ten imports one of the three helper names, and both factories call `runGuardedNotificationWrite` → `runRouteMutationGuards` → `getAllMutationGuardInstances()`. |
| **A third, independent route — the module's OWN pre-existing test** | `__tests__/mutation-guard.test.ts` was written **before** this work and drives **seven of the ten real handlers**, asserting each calls `runRouteMutationGuards` with the expected `resourceKind`/`operation` and that a block skips the write. `lib/__tests__/routeHelpers.guard.test.ts` registers a **real** guard and asserts the helper **blocks** and fires `afterSuccess`. Run: **2 suites / 11 tests green.** |
| **The fix = teach the tool the helper's name (not the code)** | `LOCAL_GUARD_HELPERS.notifications`, matching **any** of the three exported names — a regex on `runGuardedNotificationWrite` alone would have missed the five routes that consume a factory, so the marker covers all three. |
| **Result** | `notifications` **10 → 0** unguarded, all 10 now `GUARDED_LOCAL`; **total D2-gap 78 → 68**; local-helper class **32 → 42**; guarded-only **169 → 179**; **187 = guarded + auth-flow**; closure **97 + 0 + 35 + 42 + 5 + 0 + 8 + 68 + 1 = 256**. **No repo change** — HEAD stays `0350563`. |
| **The standing lesson, now paid for twice** | A four-symbol string scan is a proof that four particular names are **absent**, not a proof that a route is unguarded. `communication_channels` (11 of 15 already guarded) and `notifications` (10 of 10 already guarded) were both **labels over-claiming**. **Measure the premise before applying the fix it implies** — here the alternative was to wrap ten already-covered routes, adding twenty call sites and a false security narrative. |
| **Next module** | **`workflows` (10 unguarded verbs — the sole remaining double-digit module).** |


**Progress — `workflows` DONE and PROVEN — a REAL `D2-gap`, the LAST double-digit module, and the first with a verb that must NOT be wired because it writes nothing (2026-10-07, code commit `a9ecd21`).**

| What | Detail |
|---|---|
| **What the label said** | **10 unguarded verbs across 10 files** — the joint-largest remaining module with `notifications`. **Unlike `notifications`, the artefact AGREED: a genuine gap, not a label error.** |
| **How the gap is proven pre-existing** | The wrapper `workflows/api/mutation-guard.ts` (`beginWorkflowsMutationGuard()`) has existed since the D2-wide migration, but only the **three definition-write routes** called it. Its own header records the gap verbatim — *"this wrapper is NOT used by every `workflows` write route … That is a pre-existing gap measured on 2026-10-06."* So the premise was measured before the fix, and the fix was real. |
| **The fix — 9 of the 10** | No new wrapper — `workflows` already ships `beginWorkflowsMutationGuard()`. All nine genuine writes call it **after** their own auth/permission/validation gates and **before** the write, with `guard.runAfterSuccess()` after commit: `definitions/route.ts` POST (create, `resourceId 'new'` rebound to the row id), `instances/route.ts` POST (custom, start), `instances/[id]/advance` POST (custom), `instances/[id]/cancel` POST (update), `instances/[id]/retry` POST (update), `instances/[id]/signal` POST (custom), `signals/route.ts` POST (custom, keyed on the correlation key), `tasks/[id]/claim` POST (custom), `tasks/[id]/complete` POST (update). |
| **The 10th CANNOT be wired — and setting it aside is the correct answer, not a shortcut** | `instances/validate-start` POST exports a write verb but **performs no write**: `lib/start-validator.ts` touches no entity manager, and `validateWorkflowStart` calls `ruleEngine.executeRuleByRuleId(..., { dryRun: true })`, under which the only writer in that path (`logRuleExecution`) is skipped — so no `RuleExecutionLog` row is created. The `D2-gap` definition is *"a WRITE there is checked by nothing"*; a route that writes nothing is neither a gap nor a place to wire a guard. A guard there would **gate a read** and fire its after-success for a mutation that never happened. |
| **The tool learned a new class so the set-aside is visible** | `READ_ONLY_PATHS = ['workflows/api/instances/validate-start/route.ts']` → class **`READ_ONLY_SET_ASIDE`**, counted separately (`readOnlyVerbs`, `fields.readOnly`), echoed on the console as *"plus N read-only 'write verb' set aside by design — a POST that performs no write, so there is nothing to guard."* A set-aside absorbed silently into the unguarded count would be a **false admission**; absorbed into the *guarded* count, a **false claim**. It is neither. |
| **Two routes agree on the count and the wiring** | **(1)** the tool's `--json` rows now read **0 GAP / 13 wrapper verbs** for `workflows`; **(2)** a hand scan of all **22 `.ts` files** under `api/` (excluding tests) finds **13 files exporting a write verb — 12 call `beginWorkflowsMutationGuard`, and the only one that does not is `instances/validate-start/route.ts`**, the read-only POST. Two methods sharing no failure mode agree exactly: `workflows` has **zero unguarded writes**. |
| **Proof** | `api/__tests__/d2-gap-wiring.route.test.ts`, **18 tests**, covering the **nine wired** verbs **both ways**: mutation 1 (block) — a **real** guard registered in the global store **refuses** (423) and the write never happens (asserted by the downstream library call record staying empty, not by the response alone); mutation 2 (allow) — the write happens **and** `afterSuccess` fires **exactly once**. `runRouteMutationGuards` is left **unmocked**, so the real registry decides; a mock of the wrapper would have proven only that a function of that name is called. |
| **Three disjoint mutations proved the suite bites** | (1) neuter the guard's **block** path → exactly the **9 block cases RED**, the 9 allow green; (2) remove the guard call from **one route** (`signals/route.ts`) → **only that route RED, both directions**; (3) sever the handle's **whole `afterSuccess` path** → exactly the **9 allow cases RED**, the 9 block green. Every mutated file restored **byte-identical** (all ten md5 hashes unchanged against the pre-mutation record). |
| **Two fixture defects found by the tests, and fixed — recorded so the distinction is kept** | A first run was **14/18**, with `definitions POST` and `instances/[id]/retry POST` failing at **400** — the routes' **own** gates, *before* the guard. Both were **test-fixture** errors, not wiring errors: `definitions`' body needed ≥1 transition (`workflowDefinitionDataSchema.transitions` is `.min(1)`, and `em.findOne` must return null for the duplicate gate or the route answers 409); `retry` requires the stub instance to be `status: 'FAILED'`. The `findOne` stub now discriminates on the `where` shape. **The lesson: a 400 from a route's own validation is not a guard failure — measure which gate answered before touching the wiring.** |
| **Result** | `workflows` **10 → 0** (9 wired + 1 read-only set aside; wrapper class for the module **4 → 13**); total **68 → 58**; repo wrapper class **97 → 106**; guarded-only **179 → 188**; closure **106 + 0 + 35 + 42 + 5 + 0 + 8 + 1 + 1 + 58 = 256**. |
| **Green** | whole `workflows` module **46 suites / 668 tests**; core `tsc --noEmit` **exit 0**. |
| **Next module** | **`attachments` (8 unguarded verbs — the largest single-digit module left; no double-digit module remains).** |


**Progress — `attachments` DONE and PROVEN (2026-10-07, code commit `88582bd`).**

| What | Detail |
|---|---|
| **What the label said** | **8 unguarded verbs across 4 files** — the largest single-digit module left after `workflows`. **The artefact AGREED: a genuine gap, and the cleanest kind — a module with NO guard mechanism at all.** |
| **How the gap is proven pre-existing** | A string scan of the whole module found **no wrapper, no `runRouteMutationGuards` call, no `makeCrudRoute`, and neither of the `@deprecated` pair** — so a guard set shipped for `attachments.attachment` / `attachments.partition` would have been **silently skipped**. Upload and delete are the highest-consequence writes in the product: one publishes a file to a storage partition, the other removes both the row and the backing file. The four GET-only routes under `file/` and `image/` are correctly not counted. |
| **The fix — a NEW wrapper, all 8 verbs** | `attachments` shipped no wrapper, so `api/mutation-guard.ts` was written (`beginAttachmentsMutationGuard()`), mirroring the `business_rules`/`workflows` shape incl. the `runAfterSuccess(resourceIdOverride)` rebind idiom. All eight genuine writes call it **after** their own gates and **before** the write, with `guard.runAfterSuccess()` after commit: `api/route.ts` POST (multipart upload — **before the storage write**, so a block means no file is written and no row created) + DELETE; `api/partitions/route.ts` POST + PUT + DELETE (kind `attachments.partition`, guard id = the partition **code**); `api/library/[id]/route.ts` PATCH + DELETE; `api/transfer/route.ts` POST (one guard per request; N rows in one commit). |
| **The `resourceKind` decision** | Only two kinds are written by this module — `attachments.attachment` (a file record) and `attachments.partition` (a storage-topology object) — so each route passes the kind that names the row it writes, and a guard registered against one does not fire for the other. For a partition the guard id is the partition **code**, the same id the route's own audit entries already carry as `resourceId`. |
| **What was NOT missing** | Every one of the eight verbs **already enforces its own capability** (`attachments.manage`) through `metadata.requireFeatures`, and every row lookup carries **tenant + organization scope**. The defect was the **missing structural chokepoint**, not missing authorization; the wrapper does not replace any route's own validation (multipart shape, size, quota, dangerous-extension and active-content filters, partition lock, default-partition protection, in-use check), optimistic-lock handling or audit story. |
| **Two routes agree on the count and the wiring** | **(1)** the tool's `--json` rows now read **0 GAP / 8 wrapper verbs** for `attachments`; **(2)** a hand scan of `api/` finds **8 write-verb exports and 8 calls to `beginAttachmentsMutationGuard`** — every write verb wired, none left. Two methods sharing no failure mode agree exactly. |
| **Proof** | `api/__tests__/d2-gap-wiring.route.test.ts`, **17 tests** (8 block + 8 allow + 1 unregistered-set control), covering the **eight wired** verbs **both ways**: block — a **real** guard registered in the global store **refuses** (423) and the write never happens (asserted by the entity manager's write record, not by the response alone); allow — the write is recorded **and** `afterSuccess` fires **exactly once**. `runRouteMutationGuards` is left **unmocked**, so the real registry decides; a mock of the wrapper would have proven only that a function of that name is called. |
| **Three disjoint mutations proved the suite bites** | (1) neuter the wrapper's **block** path → exactly the **8 block cases RED**, the 8 allow + control green; (2) remove the guard call from **one route** (`transfer` POST) → **only that route RED**; (3) sever the wrapper's **whole `afterSuccess` path** → exactly the **8 allow cases RED**, the 8 block + control green. Every mutated file restored **byte-identical** (wrapper md5 `77cee6f20b6b6f72298f73fa3fdd344e`, `transfer/route.ts` md5 `2a483cb0f6e76ed62661fe1f6d0c4bb7`). |
| **Result** | `attachments` **8 → 0** (all 8 wired; wrapper class for the module **0 → 8**; no set-aside needed); total **58 → 50**; repo wrapper class **106 → 114**; guarded-only **188 → 196**; closure **114 + 0 + 35 + 42 + 5 + 0 + 8 + 1 + 1 + 50 = 256**. |
| **Green** | whole `attachments` module **26 suites / 206 tests**; core `tsc --noEmit` **exit 0**. |
| **Next module** | **`ai_assistant` (9 unguarded verbs — now the largest), then `search` (7) and `webhooks` (7).** |


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

**Progress — `feature_toggles` DONE and PROVEN (2026-10-06, code commit `5af76bc`). — THE LAST ENABLED MODULE; the D2-wide sweep of enabled modules is COMPLETE.**

| What | Detail |
|---|---|
| **How it was solved** | A new module wrapper `feature_toggles/api/mutation-guard.ts` (`beginFeatureTogglesMutationGuard()`) mirrors the twelve modules before it: the one route that **already had** a deprecated guard now goes through `runRouteMutationGuards()`. Both deprecated calls in 1 file were rewritten — `api/overrides/route.ts` (PUT ×2 sites). **2 calls → 1 guard object.** |
| **The plan's figure held — verified, not inherited** | The queued task said **2 calls / 1 file → 1 guard object**, and walking every `.ts` file under `api/` confirms exactly **2 real call sites in 1 file**, one guard object. |
| **`feature_toggles` has NO `D2-gap` — measured, not assumed** | Walking **every** write verb and naming its guard: `overrides/route.ts` PUT → **this wrapper** (was the deprecated pair); `global/route.ts` POST/PUT/DELETE → **`makeCrudRoute` → `collectAndRunGuards()`** (the registry, `factory.ts:615-618`); the four `check/*` routes (`boolean`, `json`, `number`, `string`) are **read only** — checked, not assumed. So **every write verb in the module is guarded.** |
| **The shape that is new — the id-rebind, brought into the wrapper** | This route's *validated* id can differ from its *written* id on the same path: it validates against `existingOverride?.id ?? parsed.data.toggleId`, then the command may **create** a row and return a generated `overrideToggleId`. The old code passed that produced id to `runCrudMutationGuardAfterSuccess`. The wrapper reproduces it with `runAfterSuccess(idOverride)`: absent/equal → run the collected callbacks; different → **re-collect** the guard set for the produced id and run that. Safe **only because `validate` is a pure predicate** — a fresh set is collected, so no callback runs twice. The test proves it by asserting the registry is called **twice** on the create path. |
| **The guard context this route carries, and why it still matches** | The legacy call passed `requestMethod` / `requestHeaders` explicitly. `runRouteMutationGuards()` derives both from the `req` it is handed (`route-mutation-guard.ts:143-144`), so the observable guard input is **equivalent**. The legacy call keyed the guard on `resourceKind: 'feature_toggles.feature_toggle_override'`, `operation: 'update'` — preserved exactly. |
| **A naming trap already on record applies here too** | The route also calls `enforceCommandOptimisticLockWithGuards` on the existing-override path. That helper does **not** run mutation guards — its `...WithGuards` suffix refers to the *command optimistic-lock* guard service. A `grep -i guard` shows the file as "guarded"; the mutation guard is this wrapper. |
| **A caution about this call site, stated because it is load-bearing** | The mutation guard is **not** the main protection. Before it, the route resolves a verified tenant (`resolveFeatureCheckContext`, 400 if absent), loads the override row tenant-scoped, and refuses a stale overwrite via `enforceCommandOptimisticLockWithGuards()`. **`feature_toggles` ships no `guards.ts`**, so before this migration the deprecated pair's only content was the bridged legacy service. The migration is still correct and necessary: it removes the **bypass**. |
| **Tests** | One existing suite repaired, not deleted — `api/overrides/__tests__/mutation-guard.test.ts` stubbed the **DI `crudMutationGuardService`**, the wrong target now. Re-pointed to stub **only** the registry call `runRouteMutationGuards`, with the module wrapper running for real. Old assertions on the flat `{ ok, status, body, metadata }` shape re-pointed to the `{ container, req, auth, input }` shape. **5 tests green**, including: the registry call with the route scope; deny → 403 with no command and no after-success; "does NOT run after-success when blocked"; **the rebind** (registry called twice, second carrying the produced `overrideToggleId`); and the existing-row id used as the validate id. The sibling `__tests__/optimistic-lock.test.ts` (4 tests) still green. |
| **Proof** | Two mutations of the wrapper, each in a fresh process: disabling the **block path** (`if (false && !guardResult.ok)`) → **2 RED** (both deny-path tests); neutering **`runAfterSuccess`** (`if (true) return`) → **2 RED** (both allow-path tests) — a **disjoint** set. Wrapper restored **md5-identical** (`7b5514c22a8d4a78962e663725c6df24`). **A critic pass then mutated the ROUTE file — not the wrapper — one at a time:** block return disabled → **2 RED**; after-success call removed → **2 RED**. All files restored **byte-identical**. `feature_toggles` module = **14 suites / 84 tests green**; **whole core suite 603 suites / 5136 tests green**; `core` `tsc --noEmit` **exit 0**. |
| **L91 applied pre-emptively** | The header names both helpers **without parentheses** (`enforceCommandOptimisticLockWithGuards`, "the sync helper"), and the file was checked against the raw-text scanner regex `enforceCommandOptimisticLock\s*\(` — **0 matches**. The whole package suite was run anyway. |
| **Scope — measured, not assumed** | **1 guarded write verb path (`overrides` PUT, the one migrated), 3 guarded through the CRUD factory (`global`), 0 unguarded.** No `D2-gap`. |
| **Count re-measured (two independent routes)** | Repo-wide deprecated non-comment call sites **108 → 106** (−2, exactly this module). Both `grep … \| grep -vE` and `git grep` classified by a script agree on **106**, with **identical file sets**. Files **41 → 40** (−1, exactly the one route). The "before" was re-derived on the stashed tree with the same classifier (**108 / 41**). Per-module recount shows `feature_toggles` at **0**. |

**The remaining count, re-measured after `feature_toggles` (2026-10-06).** Deprecated **call sites** left,
excluding the definitions in `mutation-guard.ts` and all comment lines: **106** (baseline **198**;
`data_sync` retired 19, `entities/encryption` retired 2, `dictionaries` retired 16, `dashboards` retired 10,
`workflows` retired 9, `inbox_ops` retired 8, `perspectives` retired 8, `translations` retired 6, `planner`
retired 4, `query_index` retired 4, `auth` retired 2, `directory` retired 2, `feature_toggles` retired 2 —
all thirteen enabled modules). **0 of these are in enabled modules: every enabled module is now migrated.**
**All 106 live in the parked set (8 modules, 40 files) — recorded, not migrated.** **Files: 40.** The parked
work stays deferred as graft-phase work; a parked module's deprecated call is **dormant, not live**, so
retiring it there needs **no code change**, only the record. `D2-gap` remains an
open backlog item per module, and is the recommended next task.

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

**The remaining count, re-measured after `directory` (2026-10-06) — SUPERSEDED (the live figure is the block above, after `feature_toggles`); kept as the record.** Deprecated **call sites** left,
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

**The remaining count, re-measured after `query_index` (2026-10-06) — SUPERSEDED (the live figure is the block above, after `feature_toggles`); kept as the record.** Deprecated **call sites** left at that point,
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

**The remaining count, re-measured after `planner` (2026-10-06) — SUPERSEDED (the live figure is the block above, after `feature_toggles`); kept as the record.** Deprecated **call sites** left at that point,
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

**Progress — the four leftover-verb modules DONE (two wired) and MEASURED (two set aside) (2026-10-07, repo `workspace/starting-kit`).**

| What | Detail |
|---|---|
| **The finding** | A live re-measure after the `search` fix found **four modules whose "0" records were partial** — `directory` 3, `progress` 3, `dashboards` 2, `data_sync` 1. **Each premise was measured before files were spent** (the standing rule; the `D2-gap` label is a four-symbol string scan and has over-claimed four times). |
| **They did NOT split the same way** | `directory` and `progress`: **genuine writes** (`trx.persist`/`trx.flush`; `progressServiceImpl.ts:119` `em.persist(job).flush()`, `:228`/`:287` `em.flush()`) → wired. `dashboards` and `data_sync`: **READ-ONLY** (`widgetDataService.ts:178-179` only `cache.set`, DB use is `getConnection().execute(<select>)`; `credentials-service.ts:222` `resolve` only reads `getRaw`) → set aside. A blanket fix would have been wrong for two of the four. |
| **How `directory` was solved** | The 3 verbs in `api/organization-edges/route.ts` (POST/PATCH/DELETE) wired into the module's **existing** `beginDirectoryMutationGuard`. Guard placed **after** the route's own gates (schema/tenant-boundary/tree-inversion POST; schema/existence/optimistic-lock PATCH; auth/id DELETE), **before** the first write; `runAfterSuccess()` after commit. This is the known `D2-gap` the `d2-wide` `directory` record already named, not a regression. |
| **How `progress` was solved** | A **new** wrapper `progress/api/mutation-guard.ts` (`beginProgressMutationGuard()`, single kind `progress.job`, no-arg `runAfterSuccess` matching the `directory` shape) — the module had **no wrapper at all** (`wrapper=0`), so this was a full module fix, not a leftover. `api/jobs/route.ts` POST (guard after the schema gate, before `createJob`); `api/jobs/[id]/route.ts` PUT (after the existence check) and DELETE (after auth). |
| **What was NOT done, and why** | `dashboards` and `data_sync` are **not** wired — the premise says they must not be. Wiring a guard onto a read-only verb would gate a read and fire `afterSuccess` for a mutation that never happened (the `workflows` `validate-start` precedent). Both paths added to the tool's `READ_ONLY_PATHS`. |
| **Tests** | Two new proof suites, each driving the **real** handlers with `runRouteMutationGuards` **UNMOCKED**: `directory/api/__tests__/d2-gap-wiring.route.test.ts` (**7 tests**) and `progress/api/__tests__/d2-gap-wiring.route.test.ts` (**7 tests**). Each block test asserts the transaction/`createJob` did **not** run (not merely a status code), and a control guard outside the touched kind proves the suite localises. |
| **Proof (mutation)** | Per module, two mutations in a fresh process with the route/wrapper restored **byte-identical** after each: neuter the block check → exactly the **3 block** tests RED; sever `runAfterSuccess` → exactly the **3 allow** tests RED. Restored md5: `directory` route `3bdf126e35060c61c3108457dc4471e4`; `progress` wrapper `68cc42545d0a43bcd0e808b55d1b2297`. |
| **Count re-measured** | 34 → **25** (read-only 1 → 4, wrapper 121 → 127). `directory` 3 → 0; `progress` 3 → 0; `dashboards` 2 → 0; `data_sync` 1 → 0. `directory` + `progress` suites **32 suites / 256 tests green**; core `tsc --noEmit` exit 0. |
| **Critic pass** | A separate hostile pass attacked all five claims from the raw files and found **NOTHING**: it confirmed both suites drive the real registry (not a mock), confirmed the guard sits before the first write in every verb, re-ran the tool itself (25 / read-only 4 / wrapper 127 — matching), and spot-checked every enabled module's write-verb files against the tool rows (**0 diffs**). Its strongest counter-example: **NONE**. |

**Progress — `webhooks` DONE (5 verbs wired) + a TOOL fix (2026-10-07, repo `workspace/starting-kit`).**

| What | Detail |
|---|---|
| **The finding** | The `D2-gap` label read **7 unguarded verbs across 6 files** for `webhooks`. **The premise was measured first, and it over-claimed by TWO** — the label is a four-symbol string scan and this is the **fifth** time it has done so (after `messages`, `communication_channels`, `notifications` and the four leftover-verb modules). |
| **How they split — three ways, not one** | **(1) false positive** `api/route.ts` POST — a two-line re-export shim (`import { GET, POST } from './webhooks/route'` then bare `export { GET, POST }`); the real handler IS `makeCrudRoute` (`GUARDED_CRUD`). **TOOL fix, not repo.** **(2) actor-less** `api/inbound/[endpointId]/route.ts` POST — `requireAuth: false`, no session, writes a `WebhookInboundReceiptEntity` with a possibly-null tenant, guarded by `adapter.verifyWebhook` + a 60/min rate limit + integration gating + dedup → set aside by name. **(3) genuine writes — 5 across 4 files** → wired. |
| **The TOOL fix (load-bearing)** | `RE_REEXPORT` required the **inline** `export { … } from` spelling and **missed** the `import { … }` + bare `export { … }` form. Fix: a bare `export { V }` counts as a re-export **only when the file does not define `V` locally** — so a file owning an unguarded handler still reads GAP. Proved on two synthetic snippets: the shim → re-export; `export async function POST {}` + `export { POST }` → still GAP. Also added `webhooks/api/inbound/[endpointId]/route.ts` to `ACTORLESS_PATHS`. |
| **How `webhooks` was solved** | A **new** wrapper `webhooks/api/mutation-guard.ts` (`beginWebhooksMutationGuard()`, two kinds `webhooks.endpoint` / `webhooks.delivery`, `resourceIdOverride` support mirroring `search`) — the module had **no wrapper and no `data/guards.ts`**, so a `webhooks.*` guard would have been silently skipped. Wired: `webhook-deliveries/[id]/retry` POST (flush :66 → enqueue), `webhooks/[id]/rotate-secret` POST (rotation + flush :38), `webhooks/[id]/route.ts` PUT (flush :107) + DELETE (soft-delete + flush :143-144), `webhooks/[id]/test` POST (`createWebhookDelivery` → `processWebhookDeliveryJob`; `afterSuccess` **re-bound** to the materialised delivery id). Each guard after the route's own gates, before the write; `runAfterSuccess` after commit. **`WebhookRequestScope` gained `userId`** (`auth.sub`) so the wrapper gets a real actor. |
| **What was NOT missing, and the lock-floor trap** | All five **already enforced their own capability** (`webhooks.manage`/`secrets`/`test`) and scoped lookups by tenant+org. The defect was the missing chokepoint, not authorization. `webhooks/[id]/route.ts` also calls `enforceCommandOptimisticLockWithGuards(...)` on PUT/DELETE — the **command-lock floor**, which never consults the registry (the `directory` trap); the added registry call is a separate chokepoint. |
| **Tests** | A new proof suite `webhooks/api/__tests__/d2-gap-wiring.route.test.ts` (**11 tests**) drives the **real** handlers with `runRouteMutationGuards` **UNMOCKED** (real guard registered in the global store): 5 block + 5 allow + 1 control. Block tests assert the flush/enqueue/test-delivery did **not** run, not merely a status code. |
| **Proof (mutation)** | Two mutations in a fresh process, wrapper restored byte-identical after each: neuter the block check → exactly the **5 block** tests RED (allow + control stay green); sever `runAfterSuccess` → exactly the **5 allow** tests RED. No mutation residue (`grep` for the injected guards returns nothing). |
| **Count re-measured** | 25 → **18**. `webhooks` **7 → 0** (5 wrapper, 3 `makeCrudRoute`, 6 re-export, 1 actor-less set-aside). Total classes: wrapper **127 → 132**, re-export **5 → 6**, actor-less **1 → 2**, guarded **209 → 215**, unguarded **25 → 18**. Closure `132 + 0 + 35 + 42 + 6 + 0 + 8 + 2 + 4 + 9 + 0 + 18 = 256`. Whole `webhooks` package **15 suites / 127 tests green**; `tsc --noEmit` exit 0. |
| **Critic pass** | A separate hostile pass attacked every claim from the raw files: re-ran the tool, hand-walked every `.ts` under `api/`, confirmed both shim forms and the actor-less route, spot-checked the totals. Strongest counter-example: **NONE**. |

**Progress — `configs` DONE (1 verb wired, 2 set aside, 1 already guarded) + a TOOL fix (2026-10-07, repo `workspace/starting-kit`).**

| What | Detail |
|---|---|
| **The finding** | The `D2-gap` label read **4 unguarded verbs** for `configs`. **The premise was measured first, and it over-claimed by THREE** — the label is a symbol string scan and this is the **sixth** time it has done so (after `messages`, `communication_channels`, `notifications`, the four leftover-verb modules and `webhooks`). |
| **How they split — three ways, not one** | **(1) already registry-guarded (TOOL blind spot)** `api/cache/route.ts` POST builds the full `[...getAllMutationGuardInstances()]` array and calls `runMutationGuards(...)` **inline** — the registry chokepoint, but not through `runRouteMutationGuards`, so the classifier read it as unguarded. **TOOL fix, not repo. (2) read-only set asides** `api/system-status/route.ts` POST clears an in-process cache (`cache.clear()`, no DB row) and `api/module-telemetry/route.ts` DELETE is a dev-only in-process op — neither writes a business row → set aside by name. **(3) the ONE genuine write** `api/upgrade-actions/route.ts` POST (`executeUpgradeAction` writes an `UpgradeActionRun` row: `tem.create` + `tem.persist` + `tem.flush`) → wired. |
| **Owner decision** | The two cache-clearing endpoints were put to the owner as a question, not closed by me: **"Set them aside, document the reason (Recommended)"** — i.e. wire only `upgrade-actions`, and record the reason for the other two. Done as instructed. |
| **The TOOL fix (load-bearing)** | The classifier's `registry` test required the `runRouteMutationGuards(` spelling and **missed** the inline `runMutationGuards(` form. Fix: a file counts as `GUARDED_REGISTRY` iff it calls `runRouteMutationGuards(` **OR** it both calls `getAllMutationGuardInstances(` **and** calls `runMutationGuards(`. The `configs/api/cache` row moved unguarded → registry, and `configs/api/system-status` + `configs/api/module-telemetry` were added to `READ_ONLY_PATHS`. |
| **How `configs` was solved** | A **new** wrapper `configs/api/mutation-guard.ts` (`beginConfigsMutationGuard(ctx)`) — mirrors the `search`/`progress` shape; kind `configs.upgradeActionRun`, op `custom`. The guard sits **after** the route's own gates (enabled-check 403, scope 401/400, Zod body 400) and **before** `executeUpgradeAction`; `runAfterSuccess` runs after the service call returns; the `blockedResponse` is returned **outside** the try/catch so a guard block cannot be swallowed. `resolveScope` gained `authSub` (`auth.sub`) so the wrapper gets a real actor. |
| **Tests** | A new proof suite `configs/api/__tests__/d2-gap-wiring.route.test.ts` (**4 tests**) drives the **real** handler with `runRouteMutationGuards` **UNMOCKED** (real guard registered in the global store): block stops the service call + no after-success; allow runs the write + after-success once; a control guard outside the kind does not fire; an invalid body is 400 before the guard. Whole `configs` package **8 suites / 56 tests green**; core `tsc --noEmit` exit 0. |
| **Proof (mutation)** | Two mutations in a fresh process, files restored **byte-identical** after each: neuter the block path → the **block** test RED; sever `runAfterSuccess` → the **allow** test RED. Restored md5: wrapper `4d85dd2a3d979c2f212c4dcac83cb055`; route `d52d9fd30f36f9464948135894deb2a6`. |
| **Count re-measured** | 18 → **14**. `configs` **4 → 0** (1 wrapper, 1 registry, 2 read-only). Total classes: wrapper **132 → 133**, registry **0 → 1 (first non-zero)**, read-only **4 → 6**, guarded **215 → 217**, unguarded **18 → 14**. Closure `133 + 1 + 35 + 42 + 6 + 0 + 8 + 2 + 6 + 9 + 0 + 14 = 256`. |
| **Critic pass** | A separate hostile pass attacked every claim from the raw files: re-ran the tool, hand-walked every `.ts` under `configs/api/`, confirmed the inline-registry call in `cache`, confirmed the two set-asides write no business row, spot-checked the totals. It corrected one **statement** of mine (I described the pre-wiring split as "1 UNGUARDED"; the correct post-fix split is 1 registry + 2 read-only + 1 wrapper + 0 unguarded). No code claim broke. |

**Progress — `currencies` DONE (all 4 verbs wired; the label did NOT split) — 2026-10-07, repo `workspace/starting-kit`.**

| What | Detail |
|---|---|
| **The finding** | The `D2-gap` label read **4 unguarded verbs across 2 files** for `currencies`. **The premise was measured first, by two routes** (the tool's `--json` rows, and a hand read of every `.ts` under `api/`), and — unlike the last several modules — the label **did NOT over-claim**: all four are genuine business-row writes, so a blanket fix was the RIGHT fix here. |
| **The four verbs** | **(1) `api/fetch-configs/route.ts`** POST → `createFetchConfig` (`em.create` + `em.persist(...).flush()`); PUT → `updateFetchConfig` (`em.assign` + `em.persist(...).flush()`); DELETE → `deleteFetchConfig` (`em.remove(...).flush()`). **(2) `api/fetch-rates/route.ts`** POST → `fetchService.fetchRatesForDate` writes `ExchangeRate` rows (verified in `services/rateFetchingService.ts`: `em.create` + `em.persist` + `em.flush`), then the route updates each `CurrencyFetchConfig.lastSync*` and `em.flush()`es. |
| **How `currencies` was solved** | A **new** wrapper `currencies/api/mutation-guard.ts` (`beginCurrenciesMutationGuard(ctx)`) — the module had **no wrapper and no `data/guards.ts`**, so a `currencies.*` guard set would have been silently skipped (the `search`/`webhooks` lesson). Kinds `currencies.currency_fetch_config` (3 verbs) and `currencies.exchange_rate` (1). Each guard sits after the route's own gates (auth 401, body 400, id 400; and for PUT/DELETE after the optimistic-lock call) and before the write; `runAfterSuccess()` after commit. |
| **The lock-floor trap, stated** | `fetch-configs` PUT/DELETE also call `enforceCommandOptimisticLock(...)` — the **command-lock floor**, a different mechanism that never consults the registry (the `directory` trap). The registry call added here is a **separate** chokepoint; finding the word "lock" in the file is not the guard. |
| **Tests** | A new proof suite `currencies/api/__tests__/d2-gap-wiring.route.test.ts` (**10 tests**): 4 block + 4 allow + 1 out-of-kind control + 1 invalid-body-400, driving the **real** handlers with `runRouteMutationGuards` **UNMOCKED** (real guard via `registerMutationGuards`). Each block test asserts the **command/service did not run** (`em.create`/`em.assign`/`em.remove`/`fetchRatesForDate` never recorded), not merely a status code. |
| **A validation note found while writing the test** | `currencyFetchConfigCreateSchema.provider` is a closed enum `['NBP', 'Raiffeisen Bank Polska', 'Custom']`, so a lower-case provider fails Zod and the route returns 400 **before** the command runs — the guard is reached only for a schema-valid body, which the suite asserts. The first draft used `'nbp'` and the POST allow-test was 400; corrected to `'NBP'`. |
| **Proof (mutation)** | Two mutations in a fresh process, wrapper restored **byte-identical** after each: neuter the block path → exactly the **4 block** tests RED; sever `runAfterSuccess` → exactly the **4 allow** tests RED. Restored md5: wrapper `56e4ea6ae6e605ca9fcedf94a4b71ea5`. |
| **Count re-measured** | 14 → **10**. `currencies` **4 → 0** (wrapper 0 → 4). Total classes: wrapper **133 → 137**, guarded **217 → 221**, guarded+set-asides **242 → 246**, unguarded **14 → 10**. Closure `137 + 1 + 35 + 42 + 6 + 0 + 8 + 2 + 6 + 9 + 0 + 10 = 256`. Whole `currencies` module **23 suites / 167 tests green**; core `tsc --noEmit` exit 0. |
| **Critic pass** | A separate hostile pass attacked every claim from the raw files: re-ran the tool, hand-walked every `.ts` under `currencies/api/`, confirmed each of the four verbs writes a business row, re-read the wrapper signature against `route-mutation-guard.ts`, confirmed the guard ordering and the try/catch boundary, recomputed the wrapper md5, and re-ran the suite (baseline + both mutations). Strongest counter-example: **NONE**. |

**Progress — `entities` DONE (all 4 verbs wired into the module's EXISTING wrapper; the label's "2 are the lock floor" is true of the verbs, false of the file) — 2026-10-07, repo `workspace/starting-kit`.**

| What | Detail |
|---|---|
| **The finding** | The `D2-gap` label read **4 unguarded verbs across 2 files** for `entities` — and the carried note said *"2 of those are the optimistic-lock floor, not gaps."* **The premise was measured first, by two routes** (the tool's `--json` rows, and a hand read of both files). The note is right at the **verb** level and false at the **file** level: `records.ts` POST reached **no guard at all**, so the file as a whole had no registry guard. |
| **The four verbs** | **(1) `api/records.ts` POST** → `de.createCustomEntityRecord(...)` — no guard of any kind: a genuine gap. **(2) `api/entity-settings.ts` PUT** → `moduleConfigService.setValue(...)` — no guard of any kind: a genuine gap (it writes the tenant's `entities` config row `newEntitiesRestrictedByDefault`, a security control). **(3) `api/records.ts` PUT** and **(4) DELETE** → each calls `enforceCommandOptimisticLockWithGuards(...)`, the command optimistic-lock **FLOOR** — which never consults `getAllMutationGuardInstances()` (the `directory` trap). |
| **Why all 4 were wired, not just the 2** | The tool sets a file aside as `COMMAND_LOCK_FLOOR` **only when EVERY write verb it exports is covered by the floor**. `records.ts` is the counter-example the tool's own header names: its POST reached nothing, so the file stayed in the GAP column. **One protected verb must not launder an unprotected sibling in the same file** — that is the tool's stated rule and why its `COMMAND_LOCK_FLOOR` list is deliberately empty. `directory`'s `organization-edges` set the precedent: its floor verbs **also** call the registry wrapper. So PUT/DELETE keep the floor **and** gain the registry guard. |
| **How `entities` was solved** | It reuses the module's **EXISTING** wrapper `beginEntitiesMutationGuard` (`api/definitions.mutation-guard.ts`) — the module already ships `data/guards.ts` and already wires 5 route files through it, so **no new wrapper was needed**. Kinds: `entities.record` (pre-existing, previously used only by the floor) for the three record verbs, and a **new** `entities.settings` for the config PUT. Each guard sits after the route's own gates and before the write; `runAfterSuccess()` after commit. |
| **The one placement that needed care** | PUT has **two** write branches — a sentinel/non-UUID `recordId` falls through to a **create**, otherwise it is an **update**. The guard is called **once** with the operation computed from the branch (`create` vs `update`) and the matching `resourceId` (`entityId` vs `rid`), and **each** branch fires its own `runAfterSuccess`. |
| **What was NOT missing, stated** | Every one of the four already enforced its own capability (`entities.records.manage` on the three record verbs; `entities.definitions.manage` on the settings PUT) and every record lookup is tenant+org scoped with a per-entity ACL gate (`assertEntityAclForRequest`). The defect was the missing **structural chokepoint**, not authorization. |
| **Tests** | A new proof suite `entities/api/__tests__/d2-gap-wiring.route.test.ts` (**13 tests**): 4 block + 4 allow for `entities.record` (including **both** PUT branches), 2 for `entities.settings`, 1 out-of-kind control, 1 kind-isolation control, 1 invalid-body-400 — driving the **real** handlers with `runRouteMutationGuards` **UNMOCKED** (real guard via `registerMutationGuards`). Block tests assert the **dataEngine / moduleConfigService call did NOT happen**; allow tests assert the guard saw the right `resourceKind` + `operation`. |
| **Proof (mutation)** | Two mutations, files restored **byte-identical**: neuter the records POST block check → exactly the **records-POST block** test RED; sever `entity-settings`' `runAfterSuccess` → exactly the **settings allow** test RED. Restored md5: records `af7d298ef2e617ff88724c855d59a7f5`, entity-settings `d97e1269d1f70103195f002a1c29401b`. The module's pre-existing `records.crud.test.ts` (**22 tests**) still passes against the wired routes (an empty registry is a no-op). |
| **Count re-measured** | 10 → **6**. `entities` **4 → 0** (wrapper 7 → 11). Total classes: wrapper **137 → 141**, guarded **221 → 225**, guarded+set-asides **246 → 250**, unguarded **10 → 6**. Closure `141 + 1 + 35 + 42 + 6 + 0 + 8 + 2 + 6 + 9 + 0 + 6 = 256`. Whole `entities` module **33 suites / 235 tests green**; core `tsc --noEmit` exit 0. |
| **Critic pass** | A separate hostile pass re-read both files, re-ran the tool (independent sum = **6** unguarded, `entities` **0**), re-ran the suite (13/13), re-ran both mutations, and checked there is no fifth write verb in `api/`. Strongest counter-example: **NONE**. One honest tool limit recorded: the classifier is **per-file**, so a future unguarded verb added to `records.ts` would be laundered by the file reading guarded. |
| **Next module (is)** | `onboarding` (1), then `scheduler` (1) — the last two single-verb modules. |

**Progress — `scheduler` DONE (1 verb wired through a NEW wrapper) + `onboarding` SET ASIDE (actor-less) — the last two single-verb modules, their premises split opposite ways — 2026-10-07, repo `workspace/starting-kit`.**

| What | Detail |
|---|---|
| **The finding** | The remaining `D2-gap` was **6 verbs**; these two modules were **1 each**. **Each premise was measured first, by two routes** (the tool's `--json` rows, and a hand read of every `.ts` under each module's `api/`), and they did NOT share a verdict. |
| **`onboarding` — NOT a gap, actor-less** | `api/post/onboarding.ts` POST is `requireAuth: false` by design (self-service signup, gated on `SELF_SERVICE_ONBOARDING_ENABLED`), reads **no session** (no `getAuthFromRequest` on the path), and **CREATES the tenant**: the `OnboardingRequest` row it writes carries `tenantId: null` and is attributed to no actor. The registry types `auth.userId` as a **non-nullable string** and feeds it to `rbacService.getGrantedFeatures(userId, ...)`, so a guard set **cannot be evaluated**; fabricating an actor would make every feature-gated guard **SKIP SILENTLY** (the exact D2-wide failure). It is guarded by its OWN mechanisms (the feature flag, a 10-per-60s rate limit, a one-shot 24h verification token, a pending-request de-dup window). **Set aside in the TOOL** (`ACTORLESS_PATHS`, third entry), NOT wired. |
| **`scheduler` — a REAL gap, authenticated** | `api/trigger/route.ts` POST is `requireAuth: true` with `requireFeatures: ['scheduler.jobs.trigger']` and a real actor (`auth.sub` / `auth.tenantId` / `auth.orgId`), so the guard set CAN be evaluated. It reads a `ScheduledJob` and **enqueues a `scheduler-execution` BullMQ job**. The precedent is `communication_channels`' `poll-now`: an authenticated action route that enqueues a job and is wired with `operation: 'custom'`. The module had **no wrapper and no `data/guards.ts`**. |
| **How `scheduler` was solved** | A NEW wrapper `beginSchedulerMutationGuard(ctx)` (`api/mutation-guard.ts`), called after the route's own gates (401 unauth, 404 not-found, 403 system-scope, 400 queue-strategy) and **before** the enqueue; `runAfterSuccess()` after the enqueue. Kind `scheduler.job` — reached by **two routes**: the CRUD route derives it from its `commandId` (`scheduler.jobs.create` → singularise → `scheduler.job`), and the command layer writes `resourceKind: 'scheduler.job'` on all three audit logs. |
| **One measured subtlety** | The route passes `operation: 'custom'`, and the registry maps that to `'update'` (`toRegistryMutationOperation`), which is what a guard sees. The first test draft asserted `'custom'` and went RED, which is how the mapping was confirmed. |
| **What was NOT missing, stated** | The route already enforced its own capability (`scheduler.jobs.trigger`), scoped the lookup by tenant + organisation, and required the super-admin flag for system-scoped schedules. The defect was the missing **structural chokepoint**, not authorization. |
| **Tests** | A new proof suite `scheduler/api/__tests__/d2-gap-wiring.route.test.ts` (**10 tests**): block (no enqueue, no after-success) + allow (enqueue once, after-success once) + the queue payload + 6 controls (out-of-kind, wrong-operation, 401, 404, 403, 400-before-guard) — driving the **real** handler with `runRouteMutationGuards` **UNMOCKED** (real guard via `registerMutationGuards`). |
| **Proof (mutation)** | Two mutations, file restored **byte-identical** (route md5 `3c8536c8cb8b975f6ba82f72ce5676eb`): remove the block check → exactly the **block** test RED; remove `runAfterSuccess` → exactly the **allow** test RED. Whole `scheduler` module **18 suites / 353 tests green**; `tsc --noEmit` exit 0. |
| **Count re-measured** | 6 → **4**. `scheduler` **1 → 0** (wrapper 1); `onboarding` **1 → 0** (actor-less 2 → 3). Total classes: wrapper **141 → 142**, guarded **225 → 226**, guarded+set-asides **250 → 252**, unguarded **6 → 4**. Closure `142 + 1 + 35 + 42 + 6 + 0 + 8 + 3 + 6 + 9 + 0 + 4 = 256`. **What remains: `communication_channels` (4), the last module.** |
| **Critic pass** | A separate hostile pass attacked all five claims from the raw files and found **NO counter-example**: confirmed the real enqueue (`trigger/route.ts:113`) and the real actor (`auth.sub`, `:32`/`:89`); confirmed the guard sits after the route gates (`:33`/`:60`/`:67`/`:74`) and before the **sole** enqueue (`:86-97` before `:113`), with `runAfterSuccess` after `close()` (`:114-115`) — every other `api/**/route.ts` write path is GET-only, so no bypass; confirmed the kind `scheduler.job` by two routes (the CRUD `deriveResourceFromCommandId` singularisation, and the literal in `commands/jobs.ts:244/363/449`); confirmed the test does **not** mock `route-mutation-guard` (mock list is auth/logger/i18n/redis/queue/DI only) and asserts `enqueueMock` not called on a block; confirmed `'custom' → 'update'` in `route-mutation-guard.ts:87-92`; and re-ran the tool (`scheduler 2 4 1 0 3 0 0 0` → W 1, GAP 0). Strongest counter-example: **NONE**. |
| **Next module (was)** | **`communication_channels` (4) — the LAST module** — now fixed below. |

**Progress — `communication_channels` DONE (4 → 0: 1 wired, 2 actor-less set aside, 1 read-only set aside) — the LAST module; and a hostile critic found a NEW class (a GET that WRITES) — 2026-10-07 (`7494fbe`), repo `workspace/starting-kit`.**

| What | Detail |
|---|---|
| **The finding** | The tool read **4 unguarded verbs across 4 files** — the last module. **Measured first, by two routes** (the tool's `--json` rows, and a hand read of every `.ts` under `api/`), the 4 split **three ways** — so a blanket fix would have been wrong for three of them. |
| **2 actor-less, set aside** | `post/webhook/[provider]` + `post/webhooks/gmail` — both `requireAuth: false` (the provider signature / a Google-signed JWT IS the auth; no session read; both enqueue) → joined `ACTORLESS_PATHS` (actor-less class **3 → 5**). |
| **1 read-only, set aside** | `post/oauth/[provider]/initiate` — authenticated, but builds an authorize URL + sets an httpOnly state cookie; writes **no** business row (`lib/oauth-state.ts` has no `persist`/`flush`, verified by grep) → joined `READ_ONLY_PATHS` (read-only class **6 → 7**). |
| **1 genuine write, wired** | `post/test-seed` — env-gated off in production, but **when enabled it writes real rows and HAS a real actor**. Both actions now run the module's `validateRouteMutationGuard` before the write: `connect-channel` → kind `communication_channels.channel`; `emit-inbound` → kind `communication_channels.message`; both `operation: 'create'`; `afterSuccess` after. |
| **Tests** | `api/post/test-seed/__tests__/route.test.ts`, **8 tests** — real registry + real handler with `runRouteMutationGuards` **UNMOCKED**; block stops the write, allow fires after-success; out-of-kind control; 404-before-guard; 401; 422. |
| **Proof (mutation)** | Two mutations, restored **byte-identical** (route md5 `e3690c2cb309c0ea1c8a54f9221ee973`): block-return removed → `connect-channel` block RED; `afterSuccess` severed → `emit-inbound` allow RED. |
| **The critic found a class the scan cannot count: a GET that WRITES** | `api/get/oauth/[provider]/callback/route.ts` — a **GET** — performs real writes (`credentialsService.save`, `createConnectedChannelRow`), reached **no guard**, and was **invisible to the tool** because `ANY_WRITE_EXPORT` matches by HTTP **method**. **A real gap:** it is a **user-intent** write with a **guarded sibling** (`post/channels/connect/credentials` creates the same kind and IS guarded). The callback now runs the same guard before any write; a block is surfaced as `flash=error&code=forbidden` (the route always redirects). |
| **Proof (callback)** | `api/get/oauth/[provider]/callback/__tests__/route.test.ts`, **5 tests**, same discipline; two mutations, restored byte-identical (route md5 `f9009bee749e8819b76cb43984e951b0`). |
| **The tool now sees the class (mutation-proven)** | A separate `classifyWriteGet` + `handlerBody` checks the **GET body only** (so a guarded PUT cannot launder a GET) for `RE_WRITE_SIGNAL`. Renaming the callback's guard call flips it to `WRITE_GET_UNGUARDED` = 1. **The first cut was too narrow** (gated behind `!exportsWrite`), so a mixed-method file hid its GET write — fixed, found by the same critic. |
| **Two MORE write-GETs found — set aside by name as read side-effects (owner-settled 2026-10-07)** | `dashboards/api/layout` (`em.persist`/`em.flush` — lazy default layout) and `messages/api/[id]` (`commandBus.execute('messages.recipients.mark_read')` when `autoMarkRead`). Both are **read side-effects**, not user-intent mutations; wiring an async guard mid-GET would let a guard **veto loading the dashboard / reading a message**. The owner delegated the call ("go with your recommendation") and the recommendation stands: **not wired**, a named set-aside class (`READ_SIDE_EFFECT_GET_PATHS`). The tool now reads **0 unguarded** in the write-GET bucket (headline `(plus 3 … 0 unguarded, 2 set aside as read side-effects)`). To revisit, delete a path from that list and re-run. |
| **Count re-measured** | 4 → **0** (write verbs COMPLETE). Local class **42 → 43**; actor-less **3 → 5**; read-only **6 → 7**; guarded **226 → 227**; guarded+set-asides **252 → 256**. Closure `142 + 1 + 35 + 43 + 6 + 0 + 8 + 5 + 7 + 9 + 0 + 0 = 256`. Whole module **60 suites / 571 tests green**; `tsc --noEmit` exit 0. |
| **Next module** | **None — the write-verb sweep is COMPLETE.** The write-performing GETs are settled (set aside by name as read side-effects, owner-settled 2026-10-07); the only remaining work is the `D2-wide` 106 parked-module call sites. |

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
   **D2-wide: every enabled module is migrated** — the remaining **106 deprecated call sites** (198 at baseline) are all in **parked** modules (recorded, not migrated). `D2-gap` (un-guarded writes) and **D3** remain — see §2e.
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
