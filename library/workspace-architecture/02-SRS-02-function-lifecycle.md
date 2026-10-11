# 02-SRS-02 — The prompt→function lifecycle

**Batch B4** of the batched research plan (`00-RESEARCH-PLAN.md` §2, B4). **Answers the owner's Q3.**

> *"How do we convert what is shown to standard function (remember when we said a prompt that create a
> business ir we commonly need we cave it as a tennant function so next time the user need the exact same
> ting he doesnt need to prompt the AI but instead just run that same saved function)"* — the owner,
> Message 6.

**Gate this file must meet** (plan §2, B4): *"the SRS distinguishes **what is built** (`runFunction`,
`compileQuery`, the lifecycle states) from **what is not** (persistence — `CC-32`/`G-09`; a caller —
`CC-59`), and the 'save' step is specified against **the machinery that exists**, not imagined machinery."*

**Rule 0b was applied first.** Every claim below is a measurement, and §2 records the command and the
output for each. **Six corrections were made in this file's own hostile-critic pass and are listed in §9**
— the header previously said "two", which described only the corrections *carried forward* and was wrong
about §9's own contents (§9, correction 5).

**Status of the gate: MET.** §3 names the four built pieces; §4 names the three absences, each with the
command that established it; §5 specifies the save step against `canOfferSaveAsFunction` and
`transition`, which exist.

---

## 0. The one-paragraph answer

The owner describes a chain in five arrows. **Four of the five arrows are built and tested; the fifth —
the durable save — is designed, gated, and deliberately not yet persisted.** The chain is: **prompt →
`authorBusinessQueryIr` → Business IR → `compileQuery` → `runFunction` → result → *Save as Function*
(`canOfferSaveAsFunction` gates it) → the Function's 8-state lifecycle (`transition`) → placed as a Widget
(`placeFunction`)**. What a person can do **today** is every step except the last two: they cannot yet
**save** a Function durably (`CC-32`/`G-09`), and **nothing in the running product calls the chain at all**.

**The gap is not a missing chain. It is THREE missing callers — in the order they sit on the chain — plus
one deferred row.** The three callers are: (1) **`authorBusinessQueryIr` has no production caller**
(`CC-58`) — so a prompt cannot yet reach an IR; (2) **`triageRequest` / `canOfferSaveAsFunction` have no
production caller** (G-21's remaining work) — so nothing decides an ending or offers the Save button;
(3) **`runFunction` has no production caller** (`CC-59`) — so a built Function cannot yet be run from the
product. The row is `CC-32`/`G-09`. **§4's table names all four; §0 counts three callers deliberately**,
because they are three separate no-caller register rows (`CC-58`, G-21's remainder, `CC-59`), and collapsing
them into one number is how a plan loses an item. **Building them in chain order is the natural sequence**
(§8, OQ-B4-1).

---

## 1. What the owner's sentence decomposes into

The owner's sentence contains five claims. Each is a separate design question, and separating them is
what stops the SRS from answering a different question than the one he asked.

| # | The owner's claim, in his words | The design question it actually asks | Answer §|
|---|---|---|---|
| C1 | *"a prompt that creates a business ir"* | Prompt → IR. Who authors the IR, and out of what? | §3.1 |
| C2 | *"we commonly need"* | **Recurrence.** What makes something worth saving, and who decides? | §3.2, §5.1 |
| C3 | *"we save it as a tenant function"* | **The save.** What exactly is stored — the IR, the SQL, the result? Under whose tenant? | §3.3, §5 |
| C4 | *"next time the user needs the exact same thing"* | **Determinism.** What guarantees the second run is the same operation? | §3.4, §6 |
| C5 | *"he doesn't need to prompt the AI but instead just run that same saved function"* | **Zero-AI execution.** What proves no model is in the loop? | §3.5, §6 |

**Why C2 is the one the owner's own architecture already answered, and it is important that it did.**
C2 — *"commonly need"* — sounds like it needs a usage counter ("save it after the third run"). It does
not. The project already decided (`ARCHITECTURE-request-outcomes.md` §2 Q1, decision **(c)**) that the
**platform proposes** an ending and the **user confirms** the consequential ones. So recurrence is not
measured; it is **offered**. `triageRequest` already encodes exactly this (§3.2). This is the single most
important thing to understand about B4: the owner's sentence is *already implemented as a design*; only
the wiring is missing.

---

## 2. The measurements (rule 0b — command, then output)

Every number and every negative in this file is from these runs. Run from
`workspace/starting-kit/packages/shared` unless stated; Node 24 via
`export PATH="…/workspace/.toolchain/node24:$PATH"`.

### 2a. The five layers exist, and their tests pass

```
node ../../node_modules/jest/bin/jest.js --config jest.config.cjs src/lib/business-ir
  → Test Suites: 1 skipped, 5 passed, 5 of 6 total
  → Tests:       6 skipped, 78 passed, 84 total

node ../../node_modules/jest/bin/jest.js --config jest.config.cjs src/lib/user-function
  → Test Suites: 7 passed, 7 total
  → Tests:       133 passed, 133 total

node ../../node_modules/jest/bin/jest.js --config jest.config.cjs src/lib/business-widget
  → Test Suites: 6 passed, 6 total
  → Tests:       68 passed, 68 total

node ../../node_modules/jest/bin/jest.js --config jest.config.cjs src/lib/request-outcome
  → Test Suites: 4 passed, 4 total
  → Tests:       62 passed, 62 total
```

**Total: 341 passing + 6 skipped across 22 suites** (B1 measured the first three = 279; this batch adds
`request-outcome` = 62). **These were run in this batch, not inherited** — the B1 lesson (a header may not
claim "all measured" while quoting counts from a doc) is applied.

### 2b. The three absences (each a search that returned nothing relevant — see the two cautions)

**Caution first, because the critic caught this and it belongs before the searches.** Two of the three
searches below **do** return lines; what they return is **not a caller**. The search output is printed in
full rather than summarised, so a reader can see exactly what was and was not found.

```
# Persistence: any UserFunction entity/table/route in a module or app?
grep -rn "UserFunction" --include="*.ts" packages/*/src/modules apps/*/src | grep -iv test
  → (no output — genuinely empty)

# The three request-outcome ENTRY POINTS: who calls them in production?
grep -rn "triageRequest\|canOfferSaveAsFunction\|loadTierSettings" --include="*.ts" --include="*.tsx" \
  packages apps | grep -v "lib/request-outcome"
  → (no output — these three symbols appear only in the library and its tests)

# runFunction: any caller outside its own library?
grep -rn "runFunction" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v lib/user-function
  → ./packages/shared/src/lib/business-widget/placement.ts:24: * Widget is G-03's `runFunction`, called with the values the form collected —
  → ./packages/shared/src/lib/business-widget/__tests__/placement-run.test.ts:19: import { runFunction } from '../../user-function/run'
  → (and 4 further lines in that same TEST file)
```

**So the third search returns six lines, and every one is a comment or a test.** The substantive negative
therefore stands — **`runFunction` has no non-test caller** — but the honest form of it is *"six matches,
all comment-or-test"*, not *"no output"*. §3.5 states it the same way.

**The request-outcome library is NOT "imported by nothing" — it is imported by three production files, and
this is a correction of the doc I inherited it from.** `/c/.../BUILD-ORDER.md:943-947` says *"the only
production import of the whole `request-outcome` library is the seed line in `configs/cli.ts`"*. **That
library-wide claim is false** (measured):

```
grep -rn "from '.*request-outcome" --include="*.ts" --include="*.tsx" packages apps | grep -v __tests__
  → packages/core/src/modules/auth/components/StructuralPermissionsSettings.tsx:35  (imports StructurePermissionLevel)
  → packages/core/src/modules/configs/cli.ts:11                                     (the seed line both docs name)
  → packages/shared/src/lib/permissions/structural-settings.ts:77                    (imports DEFAULT_TIER_SETTINGS, TIER_TO_LEVEL, StructurePermissionLevel)
```

and `structural-settings.ts` is itself consumed by production code (`auth/api/structural-permissions/route.ts:12`,
`entities/data/guards.ts:36`). **So `tier-source.ts` IS live in production — it is the tier *setting* the
structural-permission grammar reads.** What is **not** live is the **triage and the save gate**: the three
symbols `triageRequest` / `canOfferSaveAsFunction` / `loadTierSettings` have no production caller, which is
what BUILD-ORDER's next sentence says and what my search confirms. **The correct statement is therefore
narrower than BUILD-ORDER's:** the library is partly live (its `tier-source` half), and its
taxonomy/gate half is not. **B1 missed the whole layer; BUILD-ORDER overstates its deadness; this batch
corrects both** (§9, corrections 1 and 3).

### 2c. Two facts about the existing code that shape the design

- **`placeFunction` is pure and saves nothing.** `business-widget/placement.ts:64` — *"Pure: same Function
  and options, same Widget — no clock, no database, no AI."* It **transforms** a Function into a Widget; it
  does **not** persist. (This is the B3 correction, carried into B4 — §9, correction 2.)
- **`compileQuery` emits no SQL.** It records `NO_SQL_EMITTED` as a **declared gap** — *"there is no SQL to
  validate"* (`business-ir/compile.ts`, per B1). So the stored asset cannot be SQL, because there is none.

---

## 3. The chain, arrow by arrow — what exists, where

This is the heart of the file. Each arrow names **the built code that performs it**, or says plainly that
it is not built.

### 3.1 C1 — prompt → Business IR  *(BUILT, minus the caller)*

| Step | The built code | Notes |
|---|---|---|
| A model turns a prompt into an IR | `packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-author.ts:136` — `authorBusinessQueryIr` | L2 of five layers. Binding-gated by `CC-57` (✅ DONE 2026-10-11) |
| The IR's own shape | `packages/shared/src/lib/business-ir/schema.ts` + `types.ts` | L1. `IrOperation = 'list' \| 'count' \| 'aggregate'` |
| **The caller** | **NONE** | `CC-58` — `authorBusinessQueryIr` has no production caller |

**Where the AI-writing-the-IR doctrine comes from** (verified verbatim this batch): vision Doc 03 §45
(line 1390) `Business IR generation`; and the chain Doc 05 line 3411, whose arrows are literally
`AI request → Business IR → result → Save as Function → Function → Widget → Workspace`.

### 3.2 C2 — is it worth saving?  *(BUILT, minus the caller)*

This is `request-outcome/triage.ts:82` `triageRequest(need, settings?)`. It is a **pure function** over a
`RequestNeed` (`{ reads, writes, requiresNewStructure, change? }`) returning a `RequestOutcomeProposal`.
The precedence is the rule: **structure first** (`model_proposal`, always `requiresConfirmation: true`),
then **writes** (`function_candidate`), then **reads** (`ephemeral_answer`, `requiresConfirmation: false`),
then an **unclassified** request, which fails closed into `model_proposal` at the strictest tier.

**The owner's C2 is answered here, and structurally.** `function_candidate` is exactly *"a candidate to be
saved"* — the type doc says so (`types.ts:51-54`). And the crucial part: **an `ephemeral_answer` carries no
`FunctionCandidate`** (`types.ts:240-245`), so *"a menu entry is a type error, not a convention."* The
owner's "commonly need" is therefore not a counter — it is a **proposal the user confirms**.

**The caller is missing.** §2b's second search: no production caller for `triageRequest`.

### 3.3 C3 — the save  *(DESIGNED + GATED, NOT PERSISTED)*

This is the arrow that does not complete, and the file says exactly where it stops.

**What is built — the two gates:**

1. **May the Save button be offered?** `request-outcome/gate.ts:80` — `canOfferSaveAsFunction(fn, report)`.
   Returns `allowed: true` with `notChecked` **surfaced**, or `allowed: false` with the failing checks
   named. It **consumes** `verifyFunction`'s report; it never re-derives a check.
2. **May the state advance?** `user-function/lifecycle.ts:128` — `transition(fn, to, options)`. Reaching
   `verified` **requires** a passing `VerificationReport`; a failing report is **refused**
   (`lifecycle.ts:150-158`). `isRunnable` (`:94`) is the single place that answers *"may this run"* — only
   `published` or `active`.

**What is built — the durable form that needs no database:** `user-function/document.ts` defines
`companai.user-function` v1 with a **byte-stable** round-trip (`exportFunction` → `serialiseFunctionDocument`
→ `importFunction`). Its own header states the boundary verbatim (`document.ts:22-31`): *"**Why a database
row is deliberately not built here.** Two reasons, both measured: (i) the Function's remaining shape
(`presentation_definition`, the UI metadata, placement) is **G-07's** … (ii) this module tests DB-backed
code against a mocked EntityManager … **Trigger for the row: G-07 lands.**"*

**What is NOT built — the row.** §2b's first search: no persisted `UserFunction` entity, table, or route.
This is **`CC-32`**, and its own register row says the artifact **has no persistence and no delete path**
(`document.ts:22-28`; `lifecycle.ts` has only `archived`, no `deleted`), gated on **`G-09`**.

**What is stored, stated precisely (the owner's *"what exactly"*).** The vision's own rule, quoted verbatim
from the code that quotes it (`user-function/types.ts:14-16`): *"**The durable asset is the IR, not the
SQL.** §42, and RQ-24. The compiled plan is a cache; a recompilation can always regenerate it."* Three
things are excluded, and the vision names all three **in Doc 03 §40 (line 1206 onward; the phrase *"the
natural-language prompt"* is at line 1215)** — **not the raw SQL, not the natural-language prompt, not the
returned data.** (The intermediate summary at `ARCHITECTURE-request-outcomes.md` §1a compresses the middle
one to *"not the prompt"*; Doc 03 §40 is the source.) So the artefact is the `UserFunction` — `businessIr`
(or `businessCommandIr`), `parameterSchema`, `references`, and the recorded versions (`businessModelVersion`,
`dependencyVersions`, `compilerVersion`).

**Where the save's *inputs* come from** — the vision's own list, verified verbatim this batch at Doc 03
§45 (lines 1400-1407): `Save as Function` → UI asks for `Function name` / `parameters` / `placement` /
`permissions` / `schedule optional`. `placement` and `permissions` are typed in code: `FunctionPlacement`
(`request-outcome/types.ts:203`) and `UserFunction.requiredPermissions`.

### 3.4 C4 — *"the exact same thing"*  *(BUILT)*

Determinism is not a hope; it is three mechanisms, all built:

- **The content fingerprint.** `user-function/fingerprint.ts:82` `functionFingerprint(fn)` — a hash over
  exactly `functionContent(fn)` (`:67`), which **excludes** `name`, `description`, `presentation` and
  `version` *by decision* (`:50-65`): *"renaming a Function does not invalidate its verification."* So the
  same operation under a new label hashes identically.
- **The freshness question.** `checkFreshness` (`:142`) answers *"is this still valid against the model it
  was built for?"* — three values: `fresh` / `recompiled` / `requires_recompilation`. This is Q3's *"what
  happens when the model changes"* leg (§6).
- **The execution fingerprint.** `executionFingerprint(fn, plan)` (`:109`) ties a result to **both** the
  definition and the compiled plan — *"a result is reproducible only if you know what produced it."*

### 3.5 C5 — zero AI  *(BUILT, and structural)*

`user-function/run.ts:112` `runFunction(fn, params, ctx, model, bindings, engine, options)`. Its signature
has **no AI argument, no model client, no prompt, nowhere to put one** (`run.ts:9-15`): *"So 'no LLM call'
is not a runtime branch that could go the other way — it is a property of what this module **is**."* The
test suite asserts it structurally (`no-llm.test.ts`).

The run order is the eight gates in `run.ts:17-43`, and the one place it touches the world is step 8,
`engine.query(binding.platformEntityId, compiled.plan.physical)` at **line 220** (inside the `try` at
217–228). The failure vocabulary is `RunFailureCode` (`:78`), eight codes, each a value rather than a log
line.

**The caller is missing.** §2b's third search: `runFunction` has **six** matches outside its own library —
**one comment** (`placement.ts:24`) and **five lines in a single test file**
(`business-widget/__tests__/placement-run.test.ts`, lines 19, 94, 111, 119, 120). So the negative is
precise: **no non-test caller.** The test file is worth naming because it proves the intended call shape —
it runs a placed Widget's values through `runFunction`.

---

## 4. What is BUILT vs what is NOT — the honest table

The plan's gate demands this distinction, so it is a table rather than prose.

| Element | Status | Evidence |
|---|---|---|
| Prompt → IR authoring | **BUILT** | `business-ir-author.ts:136` `authorBusinessQueryIr` |
| The IR schema | **BUILT** | `business-ir/schema.ts`, `types.ts` |
| IR → physical plan | **BUILT** | `business-ir/compile.ts` `compileQuery` |
| Plan → rows | **BUILT** | `run.ts:220` `engine.query(...)` |
| Zero-AI guarantee | **BUILT (structural)** | `run.ts:9-15`; `no-llm.test.ts` |
| Which ending a prompt gets | **BUILT** | `request-outcome/triage.ts:82` `triageRequest` |
| May "Save as Function" be offered | **BUILT** | `request-outcome/gate.ts:80` |
| Objective verification (§46) | **BUILT** | `user-function/verify.ts:71` `verifyFunction` |
| The 8-state lifecycle, enforced | **BUILT** | `user-function/lifecycle.ts:128` `transition` |
| Function → Widget | **BUILT (pure)** | `business-widget/placement.ts:66` `placeFunction` |
| Durable document, byte-stable | **BUILT** | `user-function/document.ts` |
| **The durable ROW** | **NOT BUILT** | §2b search 1; `CC-32`, gated on `G-09` |
| **A production caller for prompt → IR** | **NOT BUILT** | §2b; `authorBusinessQueryIr` has none; `CC-58` |
| **A production caller for the triage/gate** | **NOT BUILT** | §2b search 2; G-21's remaining work |
| **A production caller for the run** | **NOT BUILT** | §2b search 3; `CC-59` |
| **A delete path for a saved Function** | **NOT BUILT** | `lifecycle.ts` has `archived` only; `CC-32` |
| **The schema-mutation IR kind** (outcome 2) | **NOT BUILT** | `IrOperation`; `PLAN-G21…` §1e |
| **`authorization_valid` (§46)** | **NOT CHECKED** | G-04 does not exist; `verify.ts:206-210` |

---

## 5. The save step, specified against the machinery that exists

This is the section the plan's gate names. The save has **three phases**, and it is important that the SRS
says which are built.

### Phase 1 — offer (BUILT)

The Save button is offered when `canOfferSaveAsFunction(fn, report)` returns `allowed: true`. **The report
is passed in fresh, never read off `fn.verification`** (`gate.ts:74-78`): *"Reading the verdict off the
artifact would let a doctored or stale Function vouch for itself."* This is the correct security posture
and must not be "simplified" away.

**The `notChecked` rule, which is the subtlest thing in this SRS.** `VerificationReport.passed` is `true`
when **no check failed** — and `not_checked` never fails a report (`verify.ts:214`). Since
`authorization_valid` is **always** `not_checked` today (G-04 does not exist), **every saved Function is
today green-but-unchecked on permissions.** The gate therefore returns `notChecked` **even on success**
(`gate.ts:45-53`). *"A green-but-unchecked report is allowed to save; it is not allowed to look like a
clean bill of health."* **The SRS requirement is: the save path must record `notChecked` into
`UserFunction.verification.notChecked`, and the UI must show it.** `lifecycle.ts:159` already writes it.

### Phase 2 — name and place (BUILT as types; NOT built as a screen)

- **Name.** The vision's `Function name` (Doc 03 §45). In code it is `UserFunction.name`.
- **Placement.** `FunctionPlacement = { path, label }` (`types.ts:203`), built by `functionPlacement(path,
  label)` (`:217`), which **refuses a non-canonical path at construction**: *"Two people must not be able
  to spell one menu two ways."* `path` is identity and may not change; `label` is localised display and may
  change freely. **This is the owner's Q4 and it is answered in a different batch's terms (B5) — but the
  type is here, in `request-outcome`, and B5 must build on it.**
- **`FunctionCandidate`** (`types.ts:246`) is the pre-save shape: `{ businessIr, name, placement }`. Note
  it is deliberately **not** a `UserFunction` (`types.ts:237-244`): *"If this were a `UserFunction` in
  `draft`, the distinction would be one enum value away from collapsing."*

### Phase 3 — persist (NOT BUILT)

**What would happen, specified honestly.** The save writes one `UserFunction` row per (tenant, function).
The transaction would be: (a) run `verifyFunction`; (b) `canOfferSaveAsFunction` → refuse if not allowed;
(c) `transition(fn, 'draft' → … )` — **one step at a time** (`lifecycle.ts:27-36`); (d) store the document
via `exportFunction` → `serialiseFunctionDocument`; (e) record `notChecked`.

**Three things this phase must NOT do, each a rule from the code:**

1. **Must not store SQL.** There is none (`NO_SQL_EMITTED`), and the vision forbids it (§40).
2. **Must not let a document forge a state.** `importFunction` (`document.ts:115`) refuses a
   `verified`-or-later Function with **no verification record** — *"a status is not evidence; the record
   is."* A row-based save must keep this property; it is a `document.ts` guarantee today, and the row must
   reproduce it.
3. **Must not widen scope.** `UserFunction.tenantId` (`types.ts:112`) is **enforced** at `run.ts:140-148`
   with `WRONG_TENANT`. See §6.

**Why Phase 3 waits — and this is a *timing* call, not a proof boundary.** `document.ts:22-31` names the
trigger: **G-07 lands** (it has — B1 notes G-07 ✅), and the registry's own header (`registry.ts:22-29`)
names **G-09** for the widget registry specifically. `CC-32`'s register row says the same. **The honest
statement is: the row is *startable*, and it is deliberately deferred so the shape G-09 needs is not
written twice.** Rule 13 correction is on record: an earlier note called a row migration *"unprovable on
this host"* — **false and retracted**; `mercato-postgres-local` is a live Postgres 17 where row DDL is
written and read back.

---

## 6. The two questions the owner did not ask, and that the save raises

An SRS that silently skipped these would be the failure mode the batch is built to avoid.

### 6.1 Scope enters from TWO channels, not one (a B3 correction, carried)

A saved Function must not be able to widen its own reach. **Measured: scope enters twice.** (1)
`CompileContext = { tenantId, organizationId, userId }` from the authenticated request — the IR carries no
scope, so *"a saved Function cannot widen its own reach no matter who authored it"* (`run.ts:105-110`).
(2) **The stored artefact's own `tenantId`** — enforced at `run.ts:140-148` with `WRONG_TENANT`. And
`placeFunction` copies tenant/org onto the Widget (`placement.ts:104-105`). **The SRS requirement: the save
must write `tenantId` from the *authenticated* context, never from the caller's payload** — otherwise
channel (2) is forgeable while channel (1) still looks correct.

### 6.2 Model change — *"what happens next time the model moved?"*

Fully built (`checkFreshness`, §3.4). The three outcomes and the SRS requirement:

- **`fresh`** — nothing to do.
- **`recompiled`** — the model moved, the IR still resolves; the plan is refreshed and the Function keeps
  working. *"This is the common case: adding an unrelated field to the model must not disable every saved
  operation."* **The SRS requirement: a `recompiled` run succeeds and records the new
  `businessModelVersion`.** Note the code does **not** persist that update today (no row) — so this is a
  requirement for Phase 3.
- **`requires_recompilation`** — refused, with reasons, `code: 'STALE'` (`run.ts:184-191`). The SRS
  requirement: **the refusal must name the reference that no longer resolves**; and if the caller holds the
  previous model, upgrade it from *"this reference is gone"* to *"gone, and it looks like it moved to X"*
  (`fingerprint.ts:134-140`).

**A subtlety worth stating: a rename is handled, and by the model, not here.** `checkFreshness` delegates
renames to `recompileQuery` → the model's own `planFieldRename` (`fingerprint.ts:129-132`): *"Writing a
second rename detector here is how two answers to one question start disagreeing."* A `rename` in the model
therefore produces `recompiled`, not a stale refusal — which is what makes a saved Function survive a
field rename.

---

## 7. What B4 hands to the later batches

- **B5** owns naming, menus, grouping, and the organic wiring. B4 supplies it the two types it must build
  on: `FunctionPlacement` (`request-outcome/types.ts:203`) and `FunctionCandidate` (`:246`), plus the
  library structure the vision names (Doc 03 §62: `My/Team/Organization/System/AI Functions`).
- **B6** owns threads and collaboration. B4's contribution is the **state split**: a Function's *content*
  (the IR) is a business object; a thread's *conversation* is collaborative state. They must not share a
  storage model.
- **B7** owns extensibility. B4's contribution is the **patch/fence boundary**: `triageRequest` *classifies*
  a structure change and can **never perform** one (`triage.ts:15-18`), and `RequestOutcomeProposal` has
  **no field for "applied"** (`types.ts:151-159`).
- **B10** owns the mapping. B4's contributions to it are the **three** unbuilt callers (`CC-58`, G-21's
  remainder, `CC-59`) and the deferred row (`CC-32`/`G-09`), in §4.

---

## 8. Owner questions raised by this batch

Per the reporting standard: each is named · plain-terms · why · risk · ranked actions with a
recommendation · **one** specific question. These are candidates for `03-MAPPING.md`'s decisions list.

**OQ-B4-1 — Should the durable row land before or after the first caller?**

- **What it is, in our terms.** `CC-59` says the chain has no caller; `CC-32` says the Function has no
  durable row. Both are ready to start. The question is **order**.
- **Why it exists.** The row is gated on `G-09` by two code headers (`document.ts:31`, `registry.ts:27-28`)
  because G-09 will query the registry. But `G-09` itself is an open item, and the authoring shape of
  `CC-59` needs **no persistence at all** (its own row says so).
- **The risk of each order.** Row-first: the row's shape may be rewritten when G-09 lands — a migration
  paid twice. Caller-first: the first caller must work from an in-memory Function, which is *already* how
  `runFunction` is tested, so nothing is faked.
- **Ranked actions.** (1) **Caller first, row second** — *recommended*: it is the plan's own stated
  sequence (`CC-59` is "the first startable item of the supplementary queue"), it needs no migration, and it
  makes the chain demonstrable end-to-end sooner. (2) Row first. (3) Both in one change — not recommended;
  it couples a migration to new wiring, which rule 10d forbids stacking.
- **The one question.** *Do you want the first caller shipped as the authoring shape (prompt → IR → rows,
  nothing saved) so the chain is live before the row exists — or do you want the row first, accepting that
  G-09 may rewrite its shape?*

**OQ-B4-2 — Must the UI show `notChecked` on every saved Function until G-04 lands?**

- **What it is.** Every Function saves today with `authorization_valid: not_checked`, because the
  authorization layer (G-04) does not exist.
- **Why it matters.** `notChecked` is recorded on the artifact but nothing forces a screen to show it. A
  saved Function therefore *looks* fully verified when it is not.
- **The risk.** A user trusts a Function whose permissions were never established; in a multi-tenant
  product that is a security-relevant impression, even though the run path itself is correct.
- **Ranked actions.** (1) **Show it** — *recommended*: a one-line note on the Function's detail view, e.g.
  *"Structurally verified. Permissions were not checked (pending G-04)."* Cheap, honest, and it is what
  `describeSaveGateVerdict` (`gate.ts:121`) already produces. (2) Record-only (today's state). (3) Block
  saving until G-04 — not recommended: it would disable the whole feature for a layer that is not the
  feature.
- **The one question.** *Should a saved Function visibly state "permissions not checked" until G-04 lands,
  or is recording it on the artifact enough for now?*

**OQ-B4-3 — Is outcome 2 (a prompt that changes the schema) in scope for this workspace plan, or does it
stay a separate item?**

- **What it is.** The triage recognises `model_proposal`, but `IrOperation` has no schema-mutation kind
  (`PLAN-G21…` §1e), so outcome 2 can be **triaged but not emitted**.
- **Why it exists.** It was deliberately fenced: *"the fence comes before the thing it fences."*
- **The risk.** A user asks for a new entity ("add Vehicle"); the platform correctly says *"this is a model
  proposal, explicit-approval"* — and then has nothing that can actually do it. A correct refusal with no
  follow-through is a dead end the user will notice.
- **Ranked actions.** (1) **Keep it out of this workspace plan; record it as its own item** —
  *recommended*: it is a schema-migration product in its own right, and mixing it into the workspace SRS
  would make the workspace plan depend on the most dangerous capability in the product. (2) Include a
  *display* of outcome 2 (the triage already runs; show the proposal) while its emission stays separate.
  (3) Include emission — shortest demo, largest risk.
- **The one question.** *Should the workspace, when a prompt is a model proposal, at least **show** the
  proposal and its tier — with the ability to carry it out still out of scope — or should outcome 2 be
  invisible in the workspace entirely until its own item lands?*

---

## 9. Corrections made in this file (rule 13)

**Corrected 1 — a B1 omission, and it was large.** B1's recon dossier did not include the
`request-outcome` layer at all: 4 files, **805 lines**, **62 passing tests**, and the STATUS of **G-21 =
✅ DONE (verified)**. It is the built home of the owner's Q3 (`canOfferSaveAsFunction`) and part of Q4
(`FunctionPlacement`). **B1's Q3 verdict — which said the save leg was "not built" — was incomplete**: the
*gate* and the *taxonomy* are built; only the *row* and the *caller* are not. Corrected here and in
`01-RECON.md`'s Q3 row.

**Corrected 2 — the B3 correction, carried and verified.** `placeFunction` does **not** save.
`placement.ts:64` — *"Pure: same Function and options, same Widget — no clock, no database, no AI."* B4's
§3.3 and §5 rest on this, not on the earlier mistaken reading.

**Corrected 3 — the request-outcome library IS partly live, and BUILD-ORDER's claim that only the seed line
imports it is false.** Measured (§2b): **three** production files import from `request-outcome/tier-source`
(`configs/cli.ts:11`, `permissions/structural-settings.ts:77`, `auth/components/StructuralPermissionsSettings.tsx:35`),
and `structural-settings.ts` is itself consumed by `auth/api/structural-permissions/route.ts:12` and
`entities/data/guards.ts:36`. **So `tier-source` is live; only the taxonomy/gate half is not.** The correct
statement is narrower than BUILD-ORDER's, and B4 states the narrow one.

**Corrected 4 — `CC-32` is not "no persistence"; it is the core-flag / delete-guard row.** Its register row
(`COMPLETION-CALLBACKS.md:76`) is about *the `UserFunction` core flag the item's own sketch named does not
exist — because the artifact has no delete path to guard*. The absence of persistence is a **fact inside**
that row (`document.ts:22-28`), and the row is gated on `G-09`. B4 cites it correctly.

**Corrected 5 — `FUNCTION_STATUSES` lists EIGHT names, not eleven, and this correction was itself wrong
when first written.** `lifecycle.ts:39-48` is the array; it contains exactly eight entries
(`draft, generated, validated, verified, published, active, deprecated, archived`), and
`lifecycle.test.ts` asserts that eight-member array. **The first draft of this very correction said
"eleven" — a wrong sentence inside the corrections section, caught by the hostile-critic pass.** The
Function's chain is **eight states**; the six-state chain (DRAFT→…→ARCHIVED) belongs to the **Widget**
contract (`business-widget/types.ts`). B1's summary of the Function as six was wrong for the same reason,
in the other direction.

**Corrected 6 — the caller count is THREE, not two.** The first draft's §0 said *"two callers"* while its
own §3.1 named a third (`CC-58`, `authorBusinessQueryIr`). The three are separate register rows
(`CC-58`; G-21's remaining wiring; `CC-59`), and §4's table now carries a row for each. **A plan that
merges three missing callers into one number loses two items.**

**Corrected 7 — the reference to `run.ts:216-241` (as `CC-59`'s row states it) is the *region*, not the
call.** The `engine.query` call is at **line 220**, inside the `try` at **217–228**. Carried from B1's
correction of the same shape.

**Corrected 8 — G-21 is ✅ but not live, and this is not a contradiction to be resolved but a state to be
reported.** `BUILD-ORDER.md:942-955` states it in the project's own words: the setting *"is written on
install and read by nothing at request time yet … G-21 was built as a library … with no route wired to
it."* So `platform_points.md`'s ✅ (row 26, *"Every request ends in one of three known ways"*) records the
**taxonomy and fence as built and verified**. **B4's reading — that the ✅ is not a claim the request path
uses them — is a synthesis, and it is labelled as one here.** The ✅ row's own text is, taken at face value,
broader than the truth BUILD-ORDER records; B4 does not correct another document's row, and instead states
both facts: the code is built, and no request path calls it.

**Corrected 9 — the "not the natural-language prompt" attribution.** §3.3 attributes the three exclusions
to *"Doc 03 §40, cited at `ARCHITECTURE-request-outcomes.md` §1a"*. The phrase is verbatim **Doc 03 §40**
(Doc 03 line 1215; the exclusion list begins at line 1206); the intermediate `§1a` citation compresses it to
*"not the prompt"*. The substance is right and the attribution now names Doc 03 §40 as the source line.

---

## 10. What this batch read, and what it deliberately did not

**Read (with the reason):**

- `user-function/{types,lifecycle,verify,run,fingerprint,document}.ts` — the artifact and its five
  mechanisms (Q3's core).
- `business-widget/{placement,registry}.ts` — the Function→Widget arrow and §114's registry answers.
- `request-outcome/{types,triage,gate,tier-source}.ts` — the built home of the three outcomes (Q3's
  "commonly need" and Q4's placement).
- `library/development/PLAN-G21-request-outcomes.md` — the plan that defines what G-21 built.
- `library/development/ARCHITECTURE-request-outcomes.md` — the decision record (the three endings, the
  "platform proposes" decision **(c)**, the canonical grouping decision).
- `library/development/{BUILD-ORDER.md:935-960, COMPLETION-CALLBACKS.md:76,167, platform_points.md:43,324-328}`
  — the status/register rows for G-21, CC-32, CC-59.
- Vision Doc 03 §45 (lines 1390-1420), §61 (1805-1835) and Doc 05 §160 (3405-3425) — the verbatim quotes.
- The four test suites, **run**, §2a.

**Deliberately not read (with the reason):**

- **`business-widget/{types,ir,document}.ts` in full** — B1 measured them; B4 needs only `placement.ts`
  and `registry.ts`. Widget shape is **B9**'s.
- **The `business-ir` compile internals** — B4 needs *what* it does and *that* it emits no SQL, both
  established. The stage-by-stage detail is `G-02`'s own record.
- **`request-outcome`'s tests** — B4 ran the suite (62 passing) but read no test file; the *code* and its
  docs carry the claims.
- **`ai-assistant`'s frontend** — B3 measured it (34 files, `DockableChat`, `CommandPalette`). The caller
  *wiring* is `CC-59`'s build, not this SRS's.

**One thing left unverified deliberately.** Whether a **schema-mutation IR kind** is *startable* now
(outcome 2's emission). B4 states it does not exist (`IrOperation`) and leaves the decision to OQ-B4-3,
because *when* to build it is rule 11 (the owner decides).

---

## 11. The exit gate, checked

| Gate condition (plan §2, B4) | Met? | Where |
|---|---|---|
| Distinguishes what is built (`runFunction`, `compileQuery`, the lifecycle) | **Yes** | §3, §4's table |
| Distinguishes what is not (persistence `CC-32`/`G-09`; the **three** callers `CC-58`, G-21's remainder, `CC-59`) | **Yes** | §2b, §4 |
| The "save" step specified against machinery that exists | **Yes** | §5, phases 1–3; `canOfferSaveAsFunction`, `transition`, `document.ts` |
| The chain's five arrows each answered | **Yes** | §1's table, §3.1–§3.5 |
| The owner's Q3 answered in our terms | **Yes** | §0, §3, §5 |

---

*Created 2026-10-11. Owner: Ramzi. Batch B4 of `00-RESEARCH-PLAN.md`. Predecessors: B1 (`01-RECON.md`),
B2 (`02-REFERENCE-SYSTEMS.md`), B3 (`02-SRS-01-interaction-and-ir.md`). Next: B5 — naming, menus,
grouping (a hostile-critic pass on this file precedes it).*
