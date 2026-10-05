# The backlog — everything left, in one place

**This is the one roadmap.** If a task is not on this list, it is not tracked. Order is mine
to set; anything can be pulled forward on request. **The owner should never be the person who
remembers a task** (COOKBOOK rule zero-three).

**Why this file exists.** Before it, "what is left" was spread across `workspace/PROGRESS.md`
(three overlapping views that disagree), `where_we_left.md` (a snapshot from 2026-08-13, which
predates the whole analysis programme), and remarks buried in reports. **This file replaces
those as the plan.** The others are kept for their reasoning and point here.

**Last updated:** 2026-10-05 (G-03 — User Functions — is built and measured. **The four-item critical path is complete:** `spec ✅ → G-01 ✅ → G-02 ✅ → G-03 ✅`. What remains on it is the owner's reading of the spec, and the Hermes profile decision **B-05**, which stays parked until the agent gateway).

| Tag | Meaning |
|---|---|
| ⏳ | next up |
| 🔒 | needs the owner — I cannot do it |
| ⛔ | blocked on something that does not exist yet |
| 💤 | deferred by decision, not forgotten — the trigger is named |

---

## The list — read this section, and nothing else, for "what is left"

**Order is my working order, top to bottom.** The reasoning is below.

**Two tracks, one list.** `G-` and `S-` items are the **product half** — the plan in
[`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md). `AH-`
items are the **agent half** — how AI workers get roles, tasks, delegation, triggers and conversations.
**The agent half is not a phase of its own**: it is woven into the four phases at the point its
dependencies allow. All twelve items, and where every one of the study's 53 lessons lands, are in
[`AGENT-HALF.md`](AGENT-HALF.md).

### Now — the workbench and the gate

- [ ] **S0** ⏳ — **Stand up the local dockerised trio** (platform + Hermes + model server). **Built and proven 2026-10-04** — eight services healthy, all **21** platform tools discovered, five defects found and fixed (JOURNAL, part 6). What is left is a **re-run to confirm it still comes up**, and that needs the owner to start Docker Desktop first: the agent cannot (Docker Desktop's startup path runs `wsl.exe`, which this machine's security policy blocks — **B-04**). Plan: [`ARCHITECTURE.md`](ARCHITECTURE.md) §5. **Steps:** COOKBOOK, *Sprint 0*
- [x] **P0-spec** ✅ — **The Business Model Kernel specification** (the vision's gate, RQ-140) → plan §5.1. **DRAFT 2 written 2026-10-05:** [`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md). Draft 1 settled the three things the plan asked for — **one canonical object list** (37 candidates pruned to **31 objects + 4 contracts**, every candidate accounted for), the **21-item object contract** with the four near-collisions resolved, and the **classification taxonomy**. **Draft 2 closed the vision's own 40-item bar:** of the 18 items draft 1 left partly or wholly open, all are now settled except **3 deferred with a named trigger** and **1 that is the owner's** (the Hermes boundary, **B-05**) — tallied by **parsing** the 40 rows: **35 SETTLED · 1 DERIVED · 3 DEFERRED · 1 OPEN — owner = 40**. It also adds five normative sections (§12 ID grammar + Document + projection + identity mapping, §13 tool policy, §14 approval token, §15 outbox, §16 capability manifest), and surfaces one **code gap**: the ledger is hash-chained but carries **no `policy_version`/`decision_id`** (Doc 8 §118 requires both) — assigned to **G-16**. **Remaining work: ratification only** — Ramzi reads it or delegates the review. **Done when** — implemented by G-01.
- [ ] **G-12** — **Business backup and restore** *(depends on nothing — the safety net)*
- [ ] **G-18** — **The scheduler enforcement gate** *(small; resolves the C-3 fork)*

### Phase 1 — the spine

- [x] **G-01** ✅ — The Business Model Kernel (+ **G-08** relationship fabric) → plan §5.2. **BUILT 2026-10-05.** The canonical, versioned, typed business model **above** the physical database, as a **view** over the declarations the platform already keeps — it holds **no copy**, so there is no second source of truth. New code in `packages/shared/src/lib/kernel/`: **`canonical-id.ts`** (the spec §12.1 grammar — `segment('.'segment)*`, `[a-z][a-z0-9_]*`; the *kind* of an id is **declared, never guessed**), **`model.ts`** (`buildModelDescriptor` + the §4.1 21-item contract; relationships carry their declared attributes; a content-derived **version** per object so "versions" is real, not an empty field; relationship-id **collisions are reported, never silently merged**), **`round-trip.ts`** (the plan's test — `export`/`import`, a versioned envelope, byte-stable), **`rename.ts`** (`clean` vs `requires_recompilation`, with plain-language reasons), **`from-modules.ts`** (the **live wiring** — reads the registered modules' real declarations). Two edits: `modules/entities.ts` (+ optional `RelationshipAttributes`, additive) and `modules/dsl.ts` (`defineLink` accepts an optional `attributes` block — the original call shape unchanged). **Measured:** kernel **5 suites / 51 tests pass**; **shared package 170 suites / 1909 tests pass**; **`tsc --noEmit` clean in both `shared` and `cli`**; the **4 existing `defineLink` call sites** still type-check. **The plan's test — "the export/reimport round-trip is empty" — PASSES**, and the test first proves the export is **non-empty** (it carries the 4 real `communication_channels` relationships), so the empty diff is not vacuous. **The rename test passes both ways** (a label rename is clean; a key rename reports "requires recompilation"). **Gap found and measured in the code:** of 34 enabled modules, only **4** declare `entityExtensions` — **3 are empty stubs**, so **one module** carries the platform's whole relationship model today. **Boundary:** the *plain-language → model* path is **G-02's** compiler; G-01 is the canonical model itself and its guarantees. *(One unrelated suite, `bootstrap/dynamicLoader.tsconfig`, fails with `spawnSync … EBUSY` — **proven environmental**: it fails identically on a clean tree with G-01 stashed.)*
- [ ] **AH-1** — **The agent as a kernel object** — `kind` (*personal · role · context · independent · system*), `owner`, `actsAs`, `role`, runtime binding, autonomy gate ⛔ *needs G-01 ✅ done — startable*. **The only agent-half item on the critical path** → [`AGENT-HALF.md`](AGENT-HALF.md) §1.4
- [x] **G-02** ✅ — Business IR + the compiler → plan §2 phase 1. **BUILT 2026-10-05.** The typed **read** and **write** shapes the AI produces instead of SQL (spec §6, Doc 3 §49–§53), and the **compiler** that turns a read into the physical query the platform already runs. New code in `packages/shared/src/lib/business-ir/`: **`types.ts`** (`BusinessQueryIR` — §50's fields **verbatim**; `BusinessCommandIR` — §53's; the §51 **ten stages** as a declared union; diagnostics carrying **two severities**, because *"wrong"* and *"not yet possible"* are different things), **`model-index.ts`** (schema resolution against the G-01 model — a bare leaf resolves **relative to the subject**, a declared rule, never a guess), **`bindings.ts`** (the **declared** canonical→physical mapping, using **G-01's own** `canonicalEntityId` so the two cannot disagree; collisions **reported**, not merged), **`compile.ts`** (§51's stages one-for-one, each returning a value **or** a diagnostic; a `list` IR compiles to a real `QueryOptions`), **`recompile.ts`** (**the plan's test**). **The IR has no scope field** — `tenantId`/`organizationId` do not exist in the type, so an IR cannot widen its own reach; the compiler injects scope from the context only, fail-closed. **The plan's test — the rename test — PASSES, both directions and at two levels:** the *floor* is that the old IR compiled against the renamed model **fails** (`UNKNOWN_FIELD`, never a silent compile); the *ceiling* is `recompileQuery` saying **requires recompilation** and naming the destination, using **G-01's own `planFieldRename`** rather than a string comparison in the compiler. **Measured:** business-ir **4 suites / 47 tests pass**; kernel **5 suites / 51** (G-01 untouched); shared package **174 suites / 1952 tests**, **173 / 1944 passing**; `tsc --noEmit` **clean in `shared`, `cli` and `core`**; core **drift guard 4/4**. **Three platform gaps measured, each with an owner:** (1) **no metric or measure concept exists** (0 declarations at HEAD, two routes) so §51's *metric expansion* has nothing to expand from — a named measure is refused, not reinterpreted; (2) the **query layer is row-oriented** (`QueryOptions` has no `groupBy`/aggregate) so an `aggregate` IR compiles **logically** and reports the gap; (3) `KernelField.filterable` coerces absent→`false`, so a compiler cannot tell *"declared not filterable"* from *"not declared"* — **OPEN**, trigger = the first consumer that must tell them apart (G-05 or G-04). **Also found:** `packages/shared/tsconfig.json` **excludes `**/__tests__/**`**, so G-01's *"tsc clean"* never covered its tests; G-02 adds `tsconfig.business-ir-tests.json` **plus a falsification probe** proving that config really reports an unused `@ts-expect-error`. **Deferred with a trigger (rule zero-one):** `TaskContract` — one of the spec's four contracts, but neither a read nor a write — belongs to the delegation boundary; **trigger: AH-2**. *(The 8 `dynamicLoader.tsconfig` `EBUSY` failures are **environmental** — proven by two routes: the suite imports nothing of ours, and it fails at process spawn.)*
- [ ] **G-10** — Dependency tracking + change propagation ⛔ *needs G-01 ✅ done — startable*

### Phase 2 — the security floor

- [ ] **G-05** — Classification metadata on entities and fields ⛔ *needs G-01 ✅ done — startable*
- [ ] **G-04** — The data-axis authorization layer ⛔ *needs G-01 ✅ done — startable*
- [ ] **G-06** — AI Input/Output Guards + context firewall ⛔ *needs G-05* — **the largest security gap**
- [ ] **G-16** — A security-event taxonomy ⛔ *needs G-05*
- [ ] **G-13** — Aggregation / inference controls ⛔ *needs G-04*
- [ ] **G-14** — Break-glass and separation of duties ⛔ *needs G-04*
- [ ] **G-15** — PostgreSQL Row-Level Security *(parallel — depends on nothing)*
- [ ] **S-02** — Wire the resolver as the **enforcement point** *(5 missing inputs + `policy_version`/`decision_id`)*
- [ ] **AH-2** — **The responsibility rule** — autonomy per **action class** on the existing `A0`–`A5` gates, so one agent can be `A5` to *filter* and `A1` to *clean*. **The accountable party is always a person** ⛔ *needs G-04* → [`AGENT-HALF.md`](AGENT-HALF.md) §1.2
- [ ] **AH-8** — **MCP governance** — binding precedence (narrowest-first), changed-tool quarantine, argument-bound approvals ⛔ *needs G-04*
- [ ] **AH-11** — **ESTOP wired to our own pause** — one sentinel file, fails safe on corruption *(depends on nothing)*

### Phase 3 — the product surface

- [ ] **G-07** — The Widget contract / Widget IR / registry ⛔ *needs G-01 ✅ done — startable*. **G-03 has now handed it a second, concrete job:** a User Function is *"created by the user ... and executable without AI once published"*, and **being usable by a person** — placed in the interface, given a form from its `parameterSchema` — is a **placement** concern, not a core one. The plan's own critical-path diagram separates `G-02 → G-03` from `G-01 → G-07`, and G-03's done-when is *"runs with no LLM call"* — no interface. So the Function's core is built and **its placement is G-07's**. The artifact already carries `presentation` and `ui` as **opaque** values for exactly this reason, so G-07 defines them **without a migration**.
- [ ] **G-09** — The `@`/`#` reference and resolution layer ⛔ *needs G-01 ✅ done — startable*
- [x] **G-03** ✅ — **User Functions** → plan §2 phase 3. **BUILT 2026-10-05. The product's distinctive feature, and the last item of the four-item critical path.** The vision's definition (Doc 3 Part VIII §39): *"A validated, reusable business operation created by the user with AI assistance and executable without AI once published."* New code in `packages/shared/src/lib/user-function/`: **`types.ts`** (the §41 artifact, verbatim — `business_ir` the durable asset, `business_model_version` what it was compiled against; `presentation`/`resultSchema`/the policies carried as **opaque**, because their shape is **G-07's**), **`lifecycle.ts`** (§44's eight states as an **enforced** state machine — an illegal transition is refused **with a value**; only `published`/`active` run), **`verify.ts`** (§46's objective checks, executed by **calling G-02's compiler** rather than re-implementing them), **`fingerprint.ts`** (§43 — a content hash, plus `fresh` · `recompiled` · `requires_recompilation`), **`document.ts`** (the durable **document**, RQ-24: *"the IR is the durable asset"* — exportable, byte-stable, round-trip **empty**), **`run.ts`** (**zero-AI execution**), and `packages/shared/src/lib/business-ir/bind.ts` (parameter binding — §47). **The plan's test — "switch the model off and run a Function" — is met by two routes:** the runner **has no AI argument at all**, and an **import-graph test** proves the module transitively imports nothing from the AI side. **The structural route was falsified, not asserted** — an AI import was planted in `business-ir/compile.ts` (*outside* `user-function/`) and the check failed naming `compile.ts -> ai`, while a plain directory scan stayed green. **Four defects found by three critic passes, all fixed and permanently covered:** a placeholder nested inside a money value could reach the engine as a **literal**; `modelVersionOf` **could not see a field being retyped** (measured: two models hashed identically at `f462abf0`) so a stale Function reported itself *fresh*; an unresolvable **sort was silently dropped** into a successful compile with no sort; and a **forged document** could claim a post-verification status with no record. **One hole is OPEN with a named trigger** (a verified Function's definition can be edited without invalidating the verification — unreachable today because G-03 has **no editing operation**; trigger: the first one). **Deliberately NOT built:** a database row (**trigger: G-07** — DB code here is tested against a mocked EntityManager, so a migration would be *unprovable*, and the shape is G-07-driven), and placement in the interface (**that is G-07's**, per the plan's own critical-path diagram). **Measured:** user-function **7 suites / 133 tests**; business-ir **4 / 60**; kernel **5 / 51**; **shared package 182 suites / 2110 tests, all passing**; `tsc --noEmit` **clean in `shared`, `cli` and `core`**; core **drift guard green**. Full record: [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md), *Sprint G-03*, Steps 4–5
- [ ] **G-17** — Schema-constrained generation ⛔ *needs G-02 ✅ done — startable*
- [ ] **AH-5** — **The room** — a first-class shared space: its own id, participants, agenda, lifecycle, and a **speaker-labelled** log. **Neither Paperclip nor Hermes has this object** — it is our opening ⛔ *needs G-01 ✅ done — startable* → [`AGENT-HALF.md`](AGENT-HALF.md) §3.3
- [ ] **AH-6** — **Mentions / participants** — pull a specific agent into a thread **without** assigning it work, gated by the same permissions as assignment ⛔ *needs AH-5*
- [ ] **AH-12** — **The warm-session acceptance test** — prove the *next turn* sees a write made while the runtime holds the session. **The sibling never wrote this test**; it is the acceptance test for AH-5 ⛔ *needs AH-5*
- [ ] **AH-7** — **Hire / fire as a product operation**, not an ops script ⛔ *needs AH-1*
- [ ] **AH-9** — **Skills** — description-indexed, loaded on demand, with a **derived** trust level ⛔ *needs AH-1*

### Phase 4 — the hygiene

- [ ] **G-19** — A proprietary ERP benchmark ⛔ *needs G-02 ✅ done — startable*
- [ ] **G-20** — Freshness, lineage and continuous linting ⛔ *needs G-01 ✅ done — startable*
- [ ] **AH-3** — **The durable wake queue** — every trigger is a **database row**, not an in-memory timer, so a deploy does not lose queued work ⛔ *needs S-05*
- [ ] **AH-4** — **Routines produce work items** — schedule → **task** → wake, so every scheduled run has a visible task, a thread and an origin ⛔ *needs AH-3*
- [ ] **AH-10** — **System agents** — admin-created agents that replace or augment a system function (cron, backup, cleanup) ⛔ *needs G-12, G-18*

### The Starting Kit — what is left before that milestone closes

- [ ] **22** — Bulk approval with a diff; **the diff is the feature**
- [ ] **23** — Deputy cover and standing approvals
- [ ] **15b** — Budget as a ceiling, not just a meter
- [ ] **21c** — A lock control on each record's own screen *(the largest — per-entity work)*
- [ ] **24b** — A screen for the two per-tenant authority settings
- [ ] **C** 🔒 — A lawyer on the privacy/terms before commercial use

### Waiting on the owner — I cannot close these

> **Everything that needs the owner is gathered in one document: [`NEEDS-YOU.md`](NEEDS-YOU.md).**
> The list below is the *roadmap* view — what is parked and why. `NEEDS-YOU.md` is the *action* view:
> numbered, with literal steps and a way to answer all of it at once. If the two disagree,
> `NEEDS-YOU.md` is the one to read.

**Decided — the owner answered the questions file, which is now deleted:**

- ✅ **The object list** — start from the **union of 37 objects**, and let the Business Model Kernel specification prune it. *(This unblocks the specification. **Corrected 2026-10-04** — the union was mis-stated as 36 in this file and nine others; the vision's three lists are 30/33/34 and their union is 30 + 3 + 4 = **37**. The decision itself is unchanged.)*
- ✅ **A1 — the agent runtime** — **Hermes**, and **OpenCode is removed** from the stack.
- ✅ **A2 — the first model** — a small instruction model (~7–8B); Sprint 0 tests the plumbing.
- ✅ **A3 — the laptop budget** — assume 16 GB RAM; the model server takes about half.
- ✅ **C-7 secrets** — confirmed: tenant secrets never enter a Hermes home.
- ✅ **C-18 RLS** — confirmed: the app guard is authoritative; the database lock is a backstop **derived from the same policy**.
- ✅ **C-8 model default** — confirmed: none until chosen (default-deny), with a reviewed exception path.
- ✅ **B2 — the old roadmaps** — retired; this backlog is the plan.
- ✅ **A-1 — the agent model** *(answered 2026-10-05)* — **not identity *or* context: five kinds**, plus an
  **approval rule** that decides who is answerable. Personal assistant (one user) · role assistant (a
  role) · context agent (shared, acts as a user) · independent agent (a worker in its own right) ·
  system agent (admin-created; cron, backup, cleanup). **The rule:** for each action the agent either
  acts automatically or needs the relevant user's approval — *and that choice is what identifies
  responsibility*. The human verifies and approves; the agent is never the accountable party.
  **Written up in [`AGENT-HALF.md`](AGENT-HALF.md)**, with every piece mapped to the phase it lands in.
- ✅ **B — drop `apps/docs`** *(answered 2026-10-05)* — the kit's own documentation website (**471
  files**) moved out of the codebase in commit `2c8fda5` (*"Move apps/docs out of the codebase"*);
  `apps/` now holds only `apps/mercato`. Recoverable from the kit's upstream if ever wanted back.

Full reasoning: [`ARCHITECTURE.md`](ARCHITECTURE.md) §6.

**Still open — a decision is needed when the trigger fires:**

- [ ] 🔒 **V-04** — adopt Hermes's ops console beside our own UI? *(decide after the Widget contract, G-07)*
- [ ] 🔒 **The 7 `V`-HOLDs** — V-09 licensing · V-10 multi-agent boards · V-11 computer-use · V-12 locales · V-13 MCPs · S-04 skills *(each has a trigger in the deferred table below)*

**Done means:** the gate is green and uncached, it is verified against the running instance
where that is possible, and the documentation says what it does.

---

## Noted but not yet scheduled — the "do not lose this" list

**These are the remarks that used to live only in a report.** Each is a real outstanding item;
each is now here, where it will be seen.

| # | Item | Why it is here |
|---|---|---|
| N-1 | **The phase tests are named, not yet written.** The plan specifies a test for each phase; only the *rename test* (phase 1) and the *switch-the-model-off test* (phase 3) are decisive today. **Each phase's tests must be written when that phase starts.** | plan §2, §12 — a test named is not a test written |
| N-2 | **The vocabulary register — four word-collisions** (Capability, delegation, project, widget) are recorded but not yet written into a single glossary. | batch 10 §3; a reader cannot tell which "project" is meant |
| N-3 | **`where_we_left.md` is stale** — dated 2026-08-13, it predates the analysis programme. | it is labelled "the only status document you should trust" and is no longer current |
| N-4 | **`workspace/PROGRESS.md` has three overlapping views that disagree.** | flagged by `where_we_left.md` §9; this backlog supersedes it as the plan |
| N-5 | **The `S-02` five missing inputs** to the resolver are read but supplied by nothing. | batch 9 §2G — the resolver decides nothing today (it is in `shadow`) |
| N-6 | **`customer_accounts` duplicates `auth`** — an island to *remove*, not a feature to grow. | DB-11 — a "do not build" that is also a "do remove" |
| N-7 | **The `V`-register HOLDs** (V-09 licensing · V-10 boards · V-11 computer-use · V-12 locales · V-13 MCPs) each need a review before use. | batch 11 §6 |
| N-8 | **Remove OpenCode properly — it cannot simply be deleted.** The platform's chat route is wired to it (`api/chat/route.ts` → `OPENCODE_URL`), so deleting the service breaks the platform's AI chat. **Prerequisite:** rewire the chat to the app's own LLM registry (`model-factory.ts` + `llm-provider-registry`), *then* delete the service and the `OPENCODE_*` env vars. | **B-05**; A1's escape clause — it stays until this is done |
| N-9 | **RESOLVED 2026-10-05 — the seeding abort is understood and fixed.** It was never a seeding bug. `packages/core/src/modules/query_index/di.ts` asked a **global** table (`feature_toggles`) for `organization_id` / `tenant_id`, which it does not have; the failed statement put the *whole transaction* into the aborted state, so the next statement — `insert into "action_logs"` — failed too, and a JS `catch {}` cannot undo that. Five copies of the blind lookup (2 in `query_index/di.ts`, 3 in `packages/search/.../subscribers/`) now share one `resolveRecordScope` that asks `information_schema.columns` first and stops before the select when the columns are absent. The 2026-10-05 reset then ran every init step green. | **B-15 half 2**. Measured 2026-10-04; the *recorded* cause of B-15 was wrong and has been corrected |
| N-10 | **RESOLVED 2026-10-05 — the tests run in CI now.** A new `docker-scripts` job in `.github/workflows/ci.yml` runs them on every push and PR to `main` / `develop` / `feat/wms`. It installs nothing — they need no Docker, no database and no `node_modules` — and costs seconds. **Four invocations, not two:** `init-or-migrate.sh` exists in two copies and *both* are exercised. They were mutation-proven when written (run against the broken code first: 3 and 3 failures). Verified on Linux with CI's exact shell (`bash -eo pipefail`): 10/0, 10/0, 6/0, 6/0. | Added 2026-10-04 with the **B-15** fix. A test nobody runs is worthless |
| N-11 | **The host cannot run the codebase natively.** Measured 2026-10-04: the kit requires **Node 24.x** (`.nvmrc`, `engines.node`, and `packages/cli/src/bin.ts` hard-fails below 24), but **no Node 24 exists on this machine** — only 22.22.2 — and **`yarn` is not installed** (`corepack` is, at 0.34.6, and `packageManager` is `yarn@4.17.1`). **This is not a blocker:** the supported path is the container, which carries its own Node 24 and yarn, and that is how Sprint 0 runs. It matters only if native host development or host-run unit tests are wanted, and then it is a Node 24 install plus `corepack enable`. | Found while wiring N-10. Recorded so "the tests won't run here" is not mistaken for a broken test |
| N-12 | **P0-spec draft 2 — DONE 2026-10-05.** Draft 2 (`SPEC-business-model-kernel.md`) closed all 18 items draft 1 left partly or wholly open: **35 SETTLED · 1 DERIVED · 3 DEFERRED-with-trigger · 1 OPEN — owner**, tallied by parsing the 40 rows. The three deferrals (the evaluation benchmark, the Hermes version harness, the frontend model-builder lifecycle) each name the trigger that brings them back; the one open item is the **Hermes boundary (B-05)**, the owner's. Draft 2 adds five normative sections (§12–§16) and surfaces one code gap: **the ledger carries no `policy_version`/`decision_id`** (Doc 8 §118 requires both) — assigned to **G-16**. **The gate is passed; only ratification remains.** | Closed 2026-10-05; was the "18 items the specification does not settle" |
| N-13 | **`library/analysis/` has no git history — and neither does the correction work in it.** The `.gitignore` records an **open decision the owner deliberately left open** (2026-10-03: *"`library/` as a whole is still untracked… version the hand-written parts, ignore the copies"*). Measured 2026-10-04: `git ls-files library/analysis/` returns **0 files**, so the whole analysis programme — and the corrections made to it today — exist only on this disk. The `.gitignore` note itself says the risk is real: *"one bad edit from gone."* | **Owner decision, not taken here.** Raised because it is a live data-loss risk, not a tidiness point |
| N-14 | **RESOLVED 2026-10-05 — the two copies of `init-or-migrate.sh` are now kept identical by machine, not by hand.** They *were* byte-identical (`sha256 838969fe33407e53…`) but only because both had been edited by hand: `scripts/template-sync.ts` mirrored `docker/redis/redis.conf` into the template and **not** this file, and `template:sync` runs in no workflow. **Both halves are closed.** *Detection:* a byte-parity assertion in `packages/create-app/src/lib/template-docker-scripts.test.ts`, run by the already-unfiltered **"Check create-app template parity"** step in `ci.yml`'s `test` job — so drift fails the pull request, not develop. *Repair:* the file is now in `EXPLICIT_TEMPLATE_FILE_MAPPINGS`, so `yarn template:sync:fix` — which every release script runs — carries it across. **Mutation-proved both ways:** with a behaviour-neutral comment appended to the template copy, the parity test **fails** while the behaviour test still **passes 10/0** (the exact gap this closes), and `template:sync`'s drift count rises **24 → 25** with only that one file changed. The behaviour tests in the `docker-scripts` job cannot see parity drift, which is why both assertions exist. *(Note: `yarn template:sync` still reports **24 pre-existing drifts** in the `apps/mercato/src` mirror. That is by design — the release scripts reconcile the template at release time with `template:sync:fix` and deliberately skip the sync under CI — so it is **not** a candidate for a CI gate.)* | Found while wiring **N-10**; closed 2026-10-05 with the owner's go-ahead. Same shape as **L69** — fixing one copy is not fixing the pattern |

---

## Deferred by decision — with the trigger that brings it back

**A deferral is honest only when it names what brings it back** (COOKBOOK rule zero-one).

| Item | Why it waits | The trigger |
|---|---|---|
| **20** — Deploy on a real Plesk VPS | Owner said "not now"; nothing to deploy yet | Sprint 0's stack is proven locally and a server is wanted |
| **27** — Dashboard widgets of our own | The start page is empty by design | After the product's own surfaces exist |
| **25** — Ledger Tier 2, signed checkpoints | A customer's-auditor feature | A customer asks |
| **26** — `domain_mappings` extraction | Nothing needs it | A tenant needs a custom domain |
| **29** — The integration control plane | 220–380 person-weeks; its own estimate | Post-hosting, and only if a customer needs it |
| **11** — Native Arabic review | Dropped from the milestone by the owner | Before shipping `ar` as a *supported* locale |
| **V-09** — the 210-skill library | Licensing/content review not done | A licensing review passes |
| **V-10** — multi-agent boards | Delegation/authority must settle first | C-15's rename lands and the delegation boundary is enforced |
| **V-11** — computer-use + browser automation | Must sit behind our approval gate | The approval gate is the enforcement point (phase 2) |
| **V-12** — 17 localised languages | Translation quality unverified | A quality review passes |
| **V-13** — the 65-entry MCP catalogue | Each entry needs vetting | Each is vetted before enabling (never a trust root) |
| **Phase 3's Widget layer** | Needs the kernel and the IR | **Trigger has fired** — G-01 (kernel), G-02 (IR) and G-03 (Functions) are all done; G-07 is now startable, and it now owns two things: the Widget contract **and** a Function's **placement** in the interface |
| **A Function's database row** | G-03 builds the Function as a **document** (RQ-24 — *the IR is the durable asset*), which is durable without a database | **G-07 lands** — the remaining shape (`presentation_definition`, placement) is G-07's, so a schema written before it would be rewritten; and DB code here is tested against a **mocked** EntityManager, so a migration written now would be **unprovable** |
| **A verified Function's definition could be edited without invalidating its verification** | **OPEN — G-03 finding.** Unreachable today: G-03 has **no editing operation**, so only direct object surgery gets there | **The first editing operation** — the fix is small then: record the definition's fingerprint in the verification record and refuse to run on a mismatch |
| **Cross-tenant authority** | A conscious deferral in the design | A customer needs AI acting into a supplier's tenant |

---

## The record of what is done

- The **Starting Kit** build — [`../workspace/references/completed-work.md`](../../workspace/references/completed-work.md)
- The **analysis programme** (batches 0–12) — [`../analysis/LOG.md`](../analysis/LOG.md)
  and [`../analysis/findings/`](../analysis/findings/)

*If this file disagrees with the code, the code wins and this file is broken — fix it.*
