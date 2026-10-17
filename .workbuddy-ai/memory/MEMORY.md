# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; pre-2026-10-12: `extended_deep_memory.md`.

## ARCHITECTURE WORKSHOP — `library/architecture/`
Study platforms ONE AT A TIME against the three poles + escape hatch; map every pole across ALL platforms vs mercato → a clean SRS; then build one-tenant ↔ one-Hermes. **No development before a written requirement. Hermes is NOT forked or edited. Markdown is the source of truth.** **MAPPING FRAME (owner 2026-10-16): NOT limited by what mercato allows** — engineer the best version per pole.
**Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**

## ★ THE DONOR RE-READ — mandatory on every `SR-*` build (owner, 2026-10-17)
Full text: `library/architecture/mapping/00-PIN-AND-METHOD.md` §4.1. Three steps, in order, the third not optional:
1. **Plan it fully first** (written requirement, measured inventory, divergences named) — no code yet.
2. **Then open the donor's SOURCE at the line the `SR-*` row cites** — not the forensics digest, not `07-SYNTHESIS`. Digests answer *"does this mechanism exist?"*; a build needs *"what is the best version of it?"*, and the donor's author was solving the same problem one file away from the quoted line.
3. **Ask the enrichment question explicitly, in both directions, then proceed:** in that code's *structure, concepts, naming, invariants, constraints, error handling, migration discipline, tests* — what **improves, adds value, enriches, secures, or optimizes** the plan? **HARVEST** what is better (a constraint, a partial index, a state machine, a naming rule that makes a bug unrepresentable, a test). **REFUSE, by name, and say why** what is worse — a donor defect copied because it was there is the most expensive kind of fidelity. Record both in the discharge record.
**Worked example (`SR-02`):** the digest gave the requirement; reading Multica's migration/entity code added the nullable-`daemon_id` defect (refused → `NOT NULL`) and the unconstrained `name` (harvested → its own partial unique index). Neither was in the digest; both changed the schema.

## ★ THE CHAIN RULE — before concluding anything about a control (owner, 2026-10-17)
Full text: `library/architecture/mapping/00-PIN-AND-METHOD.md` §4.2; lesson `L180`.
Read **all four**, not the one the bug report named: **who CREATES** the thing the control examines ·
**who CHECKS** it · **who CONSUMES** the answer · **who DELETES** it and whether that invalidates every
cache of it. **A gate is only as good as what can EXIST in the state it checks.** `CC-103`'s gate was
read three times in one day (me, a hostile critic, the register) and the credential factory **zero**
times — so the product could not mint the kind of key the gate required, and its own MCP setup would
have been locked out. **And explain every change in plain words before closing it: that paragraph is a
review step, not a courtesy** — the owner's one-sentence question found two defects a purpose-built
hostile critic missed.

## ★ WHAT THE GLYPHS MEAN (owner ruling, 2026-10-17) — apply before re-grading anything
**✅ = the code for that row is fully done. 🟡 = some of the row's tasks are done, some are not.**
Nothing else. **"Not committed to a remote" and "no runner has called it yet" are NOT 🟡 reasons** —
the owner's ruling: we commit **locally** as we work, the remote is prepared later, **private** when
it exists, **history kept**. A commit is made the moment the work is done, so there is **no
"uncommitted" marker** and none is needed. The distinction that *does* survive: **code that nothing
calls is missing code**, not a deployment state (a checker with no CI step is an unfinished row —
`CC-117`). **No remote = deployment state. No caller = defect.** Written into
`MASTER-CHECKLIST.md` §5's preamble so the rule travels with the document.

## STANDING FORMAT — every turn MUST state (owner, 2026-10-16, revised 2026-10-17)
**(1) what was done, (2) its `CC-nn` address in `MASTER-CHECKLIST.md`, (3) what is next** — and update `MASTER-CHECKLIST.md` §2 (LAST DONE + NEXT, kept short on purpose; the full history goes to `JOURNAL.md`, never into §2). **Then run `node scripts/check-master-checklist.mjs`** and let it fail the turn if a typed count no longer matches the tables.

## ★ ONE DOCUMENT, NOT TWO (owner ruling 2026-10-17)
**`library/development/MASTER-CHECKLIST.md` is THE single source of truth. `MASTER-CHECKLIST.html` was RETIRED the same day** — it held the same content in a second, hand-synced copy and the copy drifted: its open-work view was measured **25 of 54 rows behind** (all eleven audit findings missing) while its headline counts stayed right, because the headline was *computed* and the list was *typed*. **Two mirrors cannot hold one truth — do not create a second copy of it.** Deep records (`AUDIT-*`, `PLAN-*`, `DECISION-*`) and the running history (`JOURNAL.md`) are separate by design and stay.

## Standing hazards
- **MASTER-CHECKLIST.md is measured, not trusted** — `scripts/check-master-checklist.mjs` re-derives §1/§4/§5's typed counts from their own tables (47 rows / 12 phases / 32·9·4·2; 54 open rows; 110 register rows / 56 closed) and fails on drift. `scripts/derive-counts.mjs` re-derives 78 of 321 from `platform_points.md`'s appendix boxes. Mutation-proven: `scripts/__tests__/check-master-checklist.mutations.mjs`, **5/5 RED**. **Neither script is wired into CI yet** — they are built but not enforced, and wiring them is `CC-101`'s work.
- Pure LF, never CRLF; never a BOM.
- **A bare-word grep is NOT a declaration census** — use `^\s*capability\s*:`. Git-Bash `grep -c` on CR LIES; byte truth is `tr -cd '\r' < f | wc -c`. **Never `git add -A`** — explicit paths.
- **★ A CHECKER IS NOT A CONTROL UNTIL SOMETHING CALLS IT (found 2026-10-17, `CC-101`).** Four of seven drift checkers existed, passed their own tests and were mutation-proven — and were **called by nothing**. Before writing ✅ on any tooling item, name the caller: a CI step, a pre-commit hook, a gate. If the answer is "you can run it by hand", the honest state is **built but NOT ENFORCED**. *(The two new scripts above are recorded in exactly this state.)*
- **★ A ✅ IS A CLAIM ABOUT THE BUILD, so it is the most dangerous glyph in the register.** When re-verifying, re-read the *caller*, not the artefact. `ci.yml:499` and `:509` are the only two checker invocations of seven — measured by reading the workflow, not by listing `package.json` scripts.
- **★ THE ONE NUMBER'S DERIVATION (measured 2026-10-17):** 78 done / 321 units / 24.3%. The rule is at `platform_points.md` §"How the numbers are derived": sections A–K, a line starting `- ` is a whole point, `- ` **with** `▸ n/N` is a split parent (a unit, never done), `-   - ` is a sub-point, and **a line with no box glyph (☑☐⬜🟡✅) is prose, not a unit** — that last clause is what stops the over-count (indented `*(was PART)*` notes all start with `- `).

## Live code frontier (`JOURNAL.md`)
**LAST DONE = the master checklist was consolidated into ONE markdown file — 2026-10-17, and the drift it fixed.** The owner's ruling: stop keeping `MASTER-CHECKLIST.html` and `.md` as two hand-synced copies. The `.md` is now the only one (485 lines, down from the HTML's 1,072-line twin), §2's expanding history was cut to two lines (it lives in `JOURNAL.md`), §4 now lists **all 54** open register rows where the HTML's view listed 29, and two scripts make the typed counts un-driftable: `scripts/check-master-checklist.mjs` (47 rows / 12 phases / 32·9·4·2; 110 register rows / 56 closed / 54 open — all PASS) mutation-proven **5/5 RED**, and `scripts/derive-counts.mjs` (78/321 re-derived from the appendix boxes, reproduces exactly). **The HTML was `git rm`'d; it is in history, do not recreate it.**
**LAST DONE (code) = the ten-analyst donor cross-check — 2026-10-17 (night), AUDITED and RECORDED, `CC-101`…`CC-111` opened.** No code written. Ten third-person hostile critics (one per delivered slice) re-read each donor's SOURCE; **every load-bearing claim re-verified by me against the real code before it entered a register.** Record: `library/development/AUDIT-2026-10-17-donor-crosscheck.md` (392 lines; claims stamped **[V]** / **[A]** / **[X]**). **VERDICT: 9 of 10 slices REVISIT, 1 KEEP-partial.** Register: **56 closed · 54 open · 110.**
- **★ THE THROUGH-LINE — three failure modes, every one a DECLARED control that does nothing:** **(1) a check that never runs** — `ci.yml` runs 2 of 7 drift checkers (`:499`, `:509`); digital-twins / escape-hatches / one-truth / two-reads `:fail` are **called by nothing** (not CI, not `.husky/pre-commit`), so *"drift breaks the build"* (`SR-38/39/41/46`) was a claim, not a fact → **all four revert ✅ → 🟡 built but NOT ENFORCED** (the artefacts are sound; the claim about them was the defect). **(2) a control that discards its answer** — `authorizeEntityRead` (`business-ir-run.ts:214-251`) returns a boolean and throws away the `SearchEntityConfig` it just read, which our own `packages/search/ai-tools.ts:86` returns and uses → the column-level projection is **structurally impossible**; obligations computed at `decision.ts:440-463`, only **rendered** at `pendingActService.ts:506`. **(3) a permit written as a default** — `interceptors.ts:246` *"Gate permits the act to run now"* for an unrecognised gate; `agent-binding.ts:52` `{bound: true}` for every non-`ai_worker`, **one `!==` wide**.
- **★ SECURITY (`CC-103`):** `principal.ts:127` — `isService = kind==='service' || auth.isApiKey === true` → an `ai_worker`-shaped key on a legacy envelope resolves `service` and **passes the gate with its binding never read**; the route above needs only `ai_assistant.view`.
- **★ `CC-102` INDICTS SLICE 1:** `CC-99` removed a dead control and shipped another — **`deleted_at` has NO writer** (every `WHERE deleted_at IS NULL` inert) and **`retire()` does not exist** while the repo's own error text says *"retire it before registering a replacement"* (`:253`, `:260`). **The omission was applied to the WRONG COLUMN** (`status`/`last_seen_at` correctly withheld as unwritable; `deleted_at` shipped unwritten). Plus `register()` **throws** where the donor **upserts** (`runtime.sql:63-93`, `RETURNING *, (xmax=0) AS inserted`); `daemon_id` is caller-supplied text (donor → persistent UUID `048:1`); no liveness writer (donor's is ONE UPDATE on a request that already happens, `runtime.sql:178-193`, `WHERE status='online'` is load-bearing); null-org caller slides to `resolveAiRuntimeEngine(env)` — the fallback the registry's docblock forbids (`:27`, `:46`).
- **★ MY OWN WRONG CITATIONS (§14), all corrected by name:** **`principal.ts` DOES exist** (I had it missing — it nearly cost the most serious security finding); `authorizeEntityAccess` is **OURS** (`packages/search`); twin count **3** not 4; census **4,832** not 4,823.
- **Earlier the same day, `SR-02` slice 1 — an agent is not its runtime — `CC-99` closed.** Commits: code `be3f6258`, docs `df95472`.
- **Why it existed:** the kernel `Agent` has carried a `runtime` binding since `AH-1` (`ce.ts:128-136`) and **nothing read it** — so the slice's job was to give it its **first reader** (`lib/agent-runtime-registry.ts`), not just add a table.
- **`ai_agent_runtimes`** = the MACHINE (daemon/host/provider/tenant), **not** `ai_agent_runtime_overrides` (per-tenant config). Four partial unique indexes (house nullable-`org_id` pattern). **`daemon_id NOT NULL`** — the donor's nullable column voids its own uniqueness. `name` unique because the kernel agent stores its binding as **text** (`custom_entities_storage` cannot carry an FK) → resolves **by name**.
- **Refused by name:** no `status`/`last_seen_at` (no writer exists → same dead-control defect), no `runtime_mode`/`device_info`, no CHECK on `provider` (vocabulary grows; validated at the repository boundary).
- **`resolveTenantRuntime`**: 3 answers, 2 refusals — nothing falls back, nothing picks "the first". Selector: `engine` → `tenantRuntime.provider` → `AI_RUNTIME_ENGINE` → `opencode`.
- **Proof:** 64 tests / 4 suites (9·19·11·25); **12/12 mutations**; **133 suites / 1,943 tests green under the pinned Node 24**; `tsc` 0.
- **★ ALWAYS run the package suite with `workspace/.toolchain/node24/node.exe`** — under node 22.22.2 it reads "1,834/1,834 pass, 2 suites failing to LOAD" while **109 tests never ran**. A suite that fails to load reports no failures.
- **★ `CC-100` OPEN:** the MikroORM snapshot is stale AND consumed — holds neither `ai_agent_bindings` nor `ai_agent_runtimes`; `commands.ts:100` decides from it and `migrator.create()` diffs against it. Fix = regenerate against a live DB, never hand-edit.
**LAST DONE (docs, 2026-10-17) = the glyph rule applied and the register re-graded, `51e94f7`.** `CC-113`
and `CC-116` → ✅ closed; **`CC-117` opened** (`check:client-boundaries` is called by nothing — and the
repo has **eight** `check:*` checkers, not the seven `CC-101`'s message claimed); `SR-38` → ✅ (enforcing
at `ci.yml:533`, proven); `SR-39`/`SR-41`/`SR-46` stay 🟡 for measured reasons that are **not** the old
"called by nothing" note. Register **60 closed · 56 open · 116 total**. `docs.yml` committed.
**★ My own error, twice the same shape:** I reported "14/14 mutations RED" from `tail`'s exit code, not
the suite's — two mutations (M3/M14) had gone stale pinning the pre-CC-116 counts. Fixed and re-proven
with the exit status captured directly. **Never read `$?` through a pipe.**
**LAST DONE (code+docs, 2026-10-17) = `CC-117` closed, `CC-118` opened, `7851fc39` + `308234c`.** The
eighth `check:*` checker is now called — `check:client-boundaries`, as a **REPORT** step, because
`--fail` exits **1** today: **174** backend page roots carry a top-level `"use client"`, **74** client
page roots exceed 300 LOC, and `.ai/client-boundary-allowlist.json` **does not exist**, so every
backend page root is unallowlisted *by construction* — the gate is unreachable, not strict. All **eight**
checkers now have a caller. `prove-ci-wiring.mjs` gained a `mode: 'report'` case that proves the checker
**detects** while saying plainly that CI does **not gate** — two different claims, stated separately.
`CC-118` = seed the allowlist with a **ratchet that may only shrink** (the `agents-md-budget.baseline.json`
precedent), never a blanket allowlist (that is the whole-directory exclusion the donor refuted in `CC-110`).
**★ M3/M14 went stale a THIRD time, so they were fixed at the cause:** both now regex the line and
**decrement whatever it says**, so they cannot rot; verified against today's 61/56/117 and a hypothetical
70/50/120.
**LAST DONE (code+docs, 2026-10-17) = `CC-103` CLOSED, `e8ecde6d` + `7bd5cb1`.** The binding gate
admitted every kind that was not `ai_worker` (`service`, `system`) with `toolAllowlist: null` — which
`computeBoundRunScope` reads as **no narrowing**, so a `service` key with `ai_assistant.view` ran any
agent with its full tool list. It now tests the one kind that passes (`human`) and refuses the rest with
`not_ai_worker` — the reason the type always declared and nothing produced. **★ A hostile critic found
TWO HIGH defects in the first attempt, both real:** (1) `api/chat/route.ts` — a *second* dispatch route —
ran `ai_assistant.chat`, which **cannot be bound** (not a code-declared agent; the manage surface 404s),
with only `ai_assistant.view`; it now refuses non-humans and gained its **first test**; (2) `lib/auth.ts`
hardcoded `apiKeySubject()`, so an `ai_worker` key resolved as `service` and the new gate refused every
MCP caller — fixed to carry the key's kind (`server.ts:357`), with permissions unchanged (`loadAcl`
parses both prefixes, `rbacService.ts:320`). **WHY BOTH SURVIVED: the coverage gate was blind to the
door** — after `CC-67`, dispatch goes through `resolveAiRuntimePort`, which was not a dispatch marker.
**★ A RULE-13 CORRECTION to CC-103's own claim:** "an ai_worker key on a legacy envelope resolves as
service" is **false** — measured by running `derivePrincipal`, the prefix wins (`:137`); the real
residual is `isApiKey:true` with a **bare** subject, which no production path produces.
**Breaking:** a `service` key can no longer run an agent — mark it `ai_worker` and bind it.
**PROOF:** 113/113 across 10 suites, 3 mutations RED, `tsc` 0. Plan + discharge record:
`library/development/PLAN-CC-103-binding-gate.md`.
**LAST DONE (code+docs, 2026-10-17 night) = `CC-102` CLOSED — all five gaps, `b36e4ffa` + `2f372248` + `cd1ec88e`.**
`SR-02` slice 2: `retire()` (idempotent, scoped like the reads) gives `deleted_at` its first writer; `register()`
is now the donor's upsert with the partial index's predicate spelled and `(xmax = 0) AS inserted`; `daemon_id`
is uuid-validated; `touch()` sets `last_seen_at` and nothing else; `organizationScope()` widens an org caller
to the tenant-level rows and refuses the ambiguity that creates. **The CLI writer (`runtime:register` /
`runtime:retire` / `runtime:touch`) makes all of it reachable** — the plan's headline item.
**★ THE THROWAWAY-DB PROOF FOUND A DEFECT IN MY OWN WRITER:** `register()` omitted `created_at`/`updated_at`
(both NOT NULL, no default; the entity's `onCreate` never fires on a raw-SQL path) so real Postgres refused
every first registration while all 24 tests passed — a fake EM has no database. Fixed; the fake now enforces
the same NOT NULL set, and reverting the INSERT turns 8 tests RED.
**PROOF:** 1330/1330 across 87 suites, 3 mutations RED, `tsc` 0; the liveness migration proven on a real
PostgreSQL 16 (phases A–E green, planner picks the index unaided). The probe is committed at
`packages/ai-assistant/src/modules/ai_assistant/migrations/__probes__/ai_agent_runtime_liveness.probe.sql`
with its run command. Plan: `library/development/PLAN-CC-102-runtime-registry.md` §7.
**★ LESSON BANKED — a probe's own instrument can be wrong silently:** two of its queries were broken
(`indispartial` does not exist in `pg_index`; `array_position` returns **NULL** for `int2vector`, so the
key-direction CASE fell through to ASC for both columns). Read the raw value (`indoption` = `0 3`) before
trusting a derived one.
Register: **63 closed · 54 open · 117 total.** `CC-107`/`CC-104`/`CC-106` triggers FIRED with `CC-102`.

**▶ NEXT = `SR-07` (`CC-107`, a bot is a participant — trigger fired) → `CC-104`/`CC-106` (same trigger)
→ `SR-12`** (per-tenant engine home, the fix for open `CC-84`, and where the daemon's persistent id lives)
**→ `P2-9b`.** Behind them the tooling ratchets: `CC-118`, `CC-114`, `CC-115`, `CC-110`.
**★ `CC-119` — THE DATABASE REBUILD MILESTONE, opened 2026-10-17.** It fires **the moment the identity
step closes** (`SR-02` done + `SR-07` + `SR-12`, which all move the same tables). The `CC-102`/`CC-103`
migrations are proven only against throwaway containers whose tables were recreated by hand, and `CC-100`
records the MikroORM snapshot as stale and consumed — so the *chain* has never run in order against a
database shaped like ours. Deliberately not earlier: a rebuild mid-step would only prove a state about to
change. Its five checks: full chain from zero with `down()` exercised; a clean `migrator.create()` diff
(which also settles `CC-100`); every constraint and index present and named; the register's tables
re-derived from that database; and the app boots and the affected paths run against it.
Owner decided: **core architecture first — business modules generated from the core workspace.**

**⟡ RESUME INFRASTRUCTURE (2026-10-17) — built so an interruption costs nothing.**
`where_we_left.md` is now a live six-step resume recipe (set-up → read → **verify before you believe**
→ plan → prove as you go → close the batch), and `library/development/RESUME-PROMPT.md` holds a
paste-ready prompt encoding the whole thing. It deliberately carries **no status of its own** — it
points at `MASTER-CHECKLIST.md` §2 and the memory, so it does not go stale the way the old 2026-08
snapshot did. Verified toolchain commands are written down in both, including three traps found this
month: **jest must run from inside the package** (from the repo root it fails with `TS5011` and reports
"1 failed, 0 total" — a load failure that reads as nothing); **`.bin/*` are shell scripts**, so call
`node_modules/jest/bin/jest.js` and `node_modules/corepack/dist/corepack.js` directly; and **`yarn`
resolves to the pinned 4.17.1 only from the project directory**.
