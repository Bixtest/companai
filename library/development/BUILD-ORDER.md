# BUILD ORDER — what must exist before anything is stacked on it

**Written:** 2026-10-06
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
| The guard engine ("this") | **PARTLY BUILT — D0 FIXED 2026-10-06, the rest open** | `MutationGuard` + `runMutationGuards()` exist and run. **D0 fixed:** the generated registry now delivers guards from an enabled module (`entities`), mutation-proven end to end (§2c). **Still open:** the **route path** — 199 call sites in 78 files still call the `@deprecated` resolver and bypass the registry (**D2-wide**, §2c); and the guard result is binary, with no `escalate` outcome (**D3**) |
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
entities write path now uses the registry, but 199 other call sites do not.)* `definitions.mutation-guard.ts`
called `validateCrudMutationGuard()`, which the code itself marks `@deprecated` with a warning:

> *"Resolves ONLY the single DI-registered `crudMutationGuardService`, so it silently bypasses every
> guard in the global mutation-guard store … Use the full registry instead: `runRouteMutationGuards()`
> … or `runMutationGuards()`."*

Effect today: **the authoritative write path for tables and columns — the exact path the structural
grammar must govern — was the one path not running the full guard set.** The entities path is fixed; the
**wider sweep of 199 call sites across 78 files is open** (§2c).

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
(An earlier draft of this document said "~201 / ~76" — that was **understated and is now corrected**;
the count was re-measured twice, by grep and by walking each file's text.)

Of the 199, **93 calls in 38 files are in ENABLED modules** (`auth`, `dashboards`, `data_sync`,
`dictionaries`, `directory`, `entities`, `feature_toggles`, `inbox_ops`, `perspectives`, `planner`,
`query_index`, `translations`, `workflows`); **106 calls in 40 files are in parked modules** (they do
not run, but they are upstream code we must not diverge from carelessly). **So the registry is now
populated and delivering — and most routes still do not consume it.** That is the same class of defect
D0 was, one layer up, and it is the honest scope of D2: not "point the entities path at the registry"
(done) but **"retire the deprecated resolver across the platform, module by module, each with its own
proof."** Counted so it cannot slip.

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
| `request-outcome` suites | **58/58** (new `tier-source.test.ts` = 27 tests) |
| **Mutation proof** — soften `DEFAULT_TIER_SETTINGS.defaultTier` `explicit_approval` → `safe` | **7 tests RED**, the right ones; restored **md5-identical** (`791b1d1746fcdc3d35b70199c0d7101f`) |

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
0. ~~**D0** — make the generated guard registry real.~~ ✅ **FIXED 2026-10-06, proven (§2c).** The
   registry now delivers guards from an enabled module, and the delivery chain is mutation-proven.
   **D2-wide (the 199 deprecated call sites in 78 files) is the remaining delivery work — see below.**
1. **D1 — ✅ FIXED 2026-10-06, proven.** The tier mapping / defaults / structural fallback are now a
   **setting** a superadmin can change (`module_configs`: module `request_outcome`, name
   `structureChangeTiers`), seeded from the dictionary and read through a function — not a hardcoded
   table. New `packages/shared/src/lib/request-outcome/tier-source.ts`; `triage.ts` takes the settings as
   an optional injected argument so it stays pure; a malformed setting **fails closed** to the seed. See
   §2d. *(Still open under SD-4: the full `(object · verb · actorType · role · level)` grammar beyond the
   tier fallback, and the manage screen SD-5.)*
2. **D2 (entities scope) — ✅ DONE 2026-10-06** (§2c). **D2-wide — OPEN:** retire the deprecated
   `validateCrudMutationGuard()` pair at the **199 remaining call sites in 78 files** (§2c), so every
   route runs the same guard set as the generic CRUD path. Module by module, each with its own proof.
3. **D3** — add the `escalate` outcome to `MutationGuardResult` and route it into the existing
   pending-approval machinery (`authority_pending_acts`).
4. **NEW — Metadata Registry service (GAP A / C5).** Answers "what exists / who owns it / what depends on
   it". Read-only to start; it is what lets the permissions gate enumerate objects and lets the AI be
   bounded. *(Blueprint §54, §86.)*
   *Exit test: an AI asked to add a column lands on `review_required` from the tier fallback, a review
   task appears, and nothing was silently allowed.*

**PHASE 1 — The standards become enforcement, not text**
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
10. **GAP C — localization / RTL / accessibility hardened to contract**: logical CSS properties, root
    direction, WCAG 2.2 AA baseline, the 11-dimension component matrix (§88), IANA-tz scheduling rule.
11. **Dashboard / perspective screens** (register: tables+APIs exist, **zero UI pages**).
12. **Notification templates** — decide whether templates stay code-defined or become user-editable.
13. **S7 / G-21** — rebuild request outcomes without the rejected up-front classification.
14. **S3** — tell the user when blocked (the message the owner accepted: *"Tell them"*).
15. **S8** — notice and suggest.
16. **S6** — declared model routing (one picture; every job declares a model).

**PHASE 3 — Data-access depth (the owner's Message A idea, on the built engine)**
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
an existing system. **D0 and D1 are now fixed and proven (§2c, §2d);** what remains is **D2-wide** (the
199 deprecated call sites in 78 files, §2c) and D3.

---

## 6. What is now recorded so it cannot be forgotten

- This order is **Phase 0 → 3**. Phase 0's gaps are **D1, D2-wide, D3, and the Metadata Registry**;
  **D0 and D1 are fixed** (the registry delivers, §2c; the tiers are a setting, §2d) **and D2's entities
  scope is done** — with all of them proven, not asserted.
- **D2-wide is the live remaining defect:** **199 non-test call sites in 78 files** still bypass the
  registry via the deprecated resolver (§2c) — **93 calls in 38 files in enabled modules**, the rest in
  parked modules. Counted, so it cannot slip out of view.
- It is linked from [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) (Part E and Part F),
  [`BACKLOG.md`](BACKLOG.md) (the Phase 2 banner), [`HANDOVER.md`](HANDOVER.md) (Tier B #B1c),
  [`INDEX.md`](../../INDEX.md) (reading order #1b and the folder map), and
  [`JOURNAL.md`](../../JOURNAL.md) (the 2026-10-06 entry).
- **Rule zero-zero-one** in the COOKBOOK already makes the dictionary binding, so the order inherits
  the same force: it may not be skipped, and doc/code disagreement is the defect.

*If this order is wrong, it changes here first — deliberately, in writing — before the code moves.*
