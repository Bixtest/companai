# EXTENDED DEEP MEMORY — the ARCHIVE of previous work (Companai / open-mercato)
#
# **This file is the EXTENDED memory of PREVIOUS work. It is a FROZEN ARCHIVE — do not add new work here.**
# **NEW work is stored in the ACTIVE memory file: `MEMORY.md` (same folder).**
# **The active file is kept short and curated. If you need MORE DETAIL than the active file carries,**
# **the long-form version of any topic below is found HERE, in this file.**
#
# Created 2026-10-11 21:43 by copying the then-current `MEMORY.md` verbatim (md5 5374e488dafc4784bba5388eda1e7db2).
# The active `MEMORY.md` was then rewritten (shorter) with a pointer back to this archive.

---

# Project memory — Companai / open-mercato (curated, durable)

## How we work — the owner's standing 6-step protocol
1. **Pick the next task** — the live task is ONLY in the `★ ACTIVE TASK` box at the top of `JOURNAL.md`;
   the order is `BUILD-ORDER.md`.
2. **Pick the relevant points** in `library/development/platform_points.md` (the SCOREBOARD + master list).
3. **Requirement = task definition + those platform_points, combined.** Write it before code.
4. **Fact-check the code FIRST** (rule 0b): what is there; which prerequisites must be done; what the change
   can impact. **Never build before measuring.**
5. **Then** plan, execute, run the protocols — hostile-critic (**SEPARATE** agent), RED-then-GREEN mutation
   proof (md5-verified restore), re-measure — and decide honestly.
6. **Only when fully, flawlessly, honestly done**: update ALL docs in the SAME change — `BACKLOG.md`,
   `platform_points.md`, `BUILD-ORDER.md`, `JOURNAL.md`, `COMPLETION-CALLBACKS.md`.

### Standing rules (binding)
- **Two sources of truth:** `BACKLOG.md` (status) + `BUILD-ORDER.md` (order). Authoritative FRONTIER =
  `platform_points.md`'s `▶ FRONTIER` box; BACKLOG's box points to it.
- **Every claim carries an observation.** Only the code is evidence (Rule 0).
- **SHARED-DOC CLOBBER HAZARD (learned twice, 2026-10-11).** The owner edits docs from a **stale editor copy**;
  his save silently overwrites agent edits (`discussion_points.md` was clobbered twice). **BEFORE touching any
  shared doc: `git diff <path>` worktree-vs-HEAD to see if the owner changed it; if the worktree lost agent
  content, `git checkout <good-commit> -- <path>` then re-apply — never hand-edit a possibly-clobbered
  worktree. Commit immediately after every edit.** Mitigation: `library/workspace-architecture/
  owner_answers.md` is **the owner's file (agent reads, never writes)**; the live list stays in
  `discussion_points.md`.
- **`grep $'\r'` LIES on a git pipe** in this Git-Bash worktree (reports every line as CRLF). To test LF-0 of a
  committed blob use **`git ls-files --eol <path>` → `i/lf`**, or `git cat-file blob <sha> | od -An -tx1 |
  tr ' ' '\n' | grep -c '^0d'` → **0**.
- **Never `git add -A`** — stage by explicit path; commit in BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`;
  code `…/workspace/starting-kit`).
- Handover docs carry **no "what is next"**; the live task lives only in the `★ ACTIVE TASK` box.
- **Rule 8** schedule every partial build in `COMPLETION-CALLBACKS.md` in the same change. **9a** own the code
  you touch. **9b** challenge the task before executing. **10d** never stack on an unfinished foundation.
  **11** the owner decides *what* to build. **13** re-measure premises; when falsified, correct it *everywhere
  it was copied*. **14b** migrations are provable. **15** solve the straightforward NOW — never schedule a
  plan-safe small fix (postponing it hides the next gap).

## Section map
- `platform_points.md` — SCOREBOARD (one number + one plain list, vision Phase 0→10 order) + byte-identical
  `§A`–`§L` appendix (developer evidence). **The number is DERIVED from the boxes, never typed** (`§L
  derive-counts`).
- `library/development/{BACKLOG,BUILD-ORDER,COMPLETION-CALLBACKS,WORKING-RULES,AGENT-HALF,HANDOVER,START-PROMPT}.md`.
- `JOURNAL.md` (docs root) — live task box + done blocks. Daily logs `.workbuddy-ai/memory/YYYY-MM-DD.md`.

## Working hazards
- **Line endings — judge from the COMMITTED BLOB, not the worktree** (`core.autocrlf=true` normalises on
  commit). Worktree CRLF: `HANDOVER.md`, `COMPLETION-CALLBACKS.md`, `SPECIFICATIONS-DICTIONARY.md`; the rest
  LF-0. **`git show HEAD:` is LF-0 for ALL of them** — the blob is the invariant. After any doc edit assert
  `raw diff == git diff -w` (a gap = formatter reflow damage → `git checkout --` + re-apply).
- **ENCODING TRAP:** Python `open(p,'w')` flips LF→CRLF and changes md5. **Write bytes** (`open(p,'wb').write(
  s.encode())`); **md5-compare every restore**. **DATA-LOSS:** `open(f,'wb')` BEFORE building content truncates
  to 0 if the build throws — build bytes FIRST.
- **NEVER edit at a line number from a DIFFERENT tool** (`grep -n` vs Python disagree on CRLF files). Locate by
  CONTENT in the same pass that writes; assert exactly one match + invariants (row count, CRLF count).
- **Register row = 5 CONTENT cells** (`| ID | Gap | Prerequisite | Trigger ↔ checked at | Callback |`);
  BAD-COLUMNS counts ` | ` ≥ 4 (not raw `awk -F'|'`). Reconciliation reads **cell 3 (Gap)** for `✅`.
- **Node 24 required:** `export PATH="…/workspace/.toolchain/node24:$PATH"`. tsc: `node
  ../../node_modules/typescript/bin/tsc --noEmit`; jest: `node ../../node_modules/jest/bin/jest.js --config
  jest.config.cjs <path>` (the `.bin` shims are broken on Windows). **Jest rootDir:** run from the package dir
  (repo root fails `TS5011`); never override `--rootDir`.
- **`perl` and `bc` are NOT available.** Prefer script files over `python -c` heredocs (backticks/`[]`/em-dash
  get mangled).
- **Sandbox `rmSync` shim** (`dynamicLoader.tsconfig.test.ts`) fails in the full `shared` suite but passes in
  isolation at byte-identical HEAD — **environmental, NOT a code defect** (`CC-19`). Prove pre-existing by
  excluding that suite.
- **Hostile-critic as a SEPARATE agent every time; demand a command+output per claim.**

## Reporting rules — BINDING (owner, 2026-10-11, stated twice — do not break again)
The owner's standard: **an issue is only "reported" if it is COMPLETE.** A flag without the following is **invalid**.
- **No flag without a full report.** Every issue I raise carries all five: (1) **named**; (2) **what it is, in our
  terms** (plain words, our vocabulary); (3) **why it exists**; (4) **the risk if left alone**; (5) **recommended
  lines of action** — ranked, with trade-offs, and a stated recommendation. A bare "honest boundary kept",
  "latent gap", "out of scope", or "note:" is NOT a report and must not be shipped.
- **Never end on "your call" / "your decision" / "you decide".** Rule 11 says the owner decides *what*, but I owe
  the **full shortlist, ranked, with trade-offs and my recommendation**, then **one specific question**. A pointer
  with no candidates ("a fresh pick from the vision order", "the next task is yours") is banned.
- **Never make the owner ask "what does that mean?".** If a sentence needs decoding to act on, it is not finished.

## Rule 15 — solve the straightforward NOW (BINDING, owner 2026-10-11 — `WORKING-RULES.md` §1 rule 15)
**Anything straightforward to solve that does not disrupt the overall plan is solved IMMEDIATELY — never scheduled.**
Postponing a small fix **covers up the gaps that fixing would expose**: a gap left open is a place nobody looks, so
the next defect in the same spot is never found. Defer **only** on a real prerequisite, and then **only** with the
trigger named where the next agent reads it (rule 8). *"It is out of scope for this slice"*, *"only a doc nit"* and
*"someone should do it later"* are **NOT** triggers. His words: *"anything that is solvable straghtforward and does
not disrupt the overall development plan, we solve immediately. The more we puch till later the morewe risk a codebase
accumulating many holes."* Worked example: `CC-43` left "flagged, not fixed" **hid `CC-46`** — fixing the first
immediately exposed the second; two DONE, tested capabilities were invisible in the register for two days.


## Live frontier (2026-10-11, executing the supplementary core queue; read `JOURNAL.md`'s `★ ACTIVE TASK` for the truth)
- **Rows 7–9, 13–18 and 22 are ✅** (row 16 ✅-own-leg / 🟡 overall pending its team-leg `CC-51`). **PHASE 3–5 complete.**
- **Owner's 2026-10-11 go-ahead: execute the supplementary core queue** (`PLAN-SUPPLEMENTARY-CORE-QUEUE.md`; docs
  commits `47177f1`, `caeface`). **The Business IR is re-classified CORE** (`CORE-BOUNDARY.md` §2 note + plan §S1.1);
  every postponed layer/wiring point is mapped in plan **§S1.2** (L1–L5 + W-A/W-B/W-C).
- **`CC-59` ✅ DONE 2026-10-11 (code `83f88bd3`)** — the Business-IR chain now has its **first production caller**:
  `lib/business-ir-run.ts` (`runBusinessQueryPrompt` — prompt → `authorBusinessQueryIr` → IR → `compileQuery` →
  `engine.query` → a **result** union; every refusal a **value**; `B5e` bounds) + the tool
  `ai-tools/business-ir-pack.ts` (`business_ir.run_query`, registered in `ai-tools.ts`). Measured (rule 0b) the
  compile+execute chain was **ALREADY BUILT** in `runFunction` (`user-function/run.ts:112`), so the gap was **ONE
  caller**; a *"load a saved Function by id"* caller is impossible (no persistence → `CC-32`/`G-09`).
  **Proof:** 111 suites / 1518 tests green; 8 RED-then-GREEN mutations (md5-verified); a separate-agent hostile
  critic found **2 real defects, both fixed** — (a) the doc's "an agent can call it" overclaim (no agent whitelists
  it → the consumer gap is **`CC-60`**), (b) a **blank subject skipped the binding** (fail-open) → guarded in the
  tool **and** in `agent-binding.ts` (a null principal now **fails closed**). Lessons **L125**/**L126**.
- **Remaining `CC-` items are trigger-blocked only:** `CC-51` (row 16 team-leg — the owner's go-ahead), `CC-54` (index
  rebuild), `CC-19` (CI). `CC-58` Stage C/B staged; `CC-32` gated on `G-09`.
- **Next candidates (ranked):** (1) `CC-51` (row 16's team-leg — smallest closable; needs the owner's go-ahead);
  (2) **vision Phase 6 = audit** (tamper-evident decision record) — the next skeleton frontier, no scaffold yet;
  (3) `B-WS/B9` (the design track's widget architecture); (4) `CC-60` (wire the tool to a chat consumer).
  `CC-54`/`CC-19` are trigger-blocked. **ONE NUMBER 72 / 321 = 22%** (weighted ≈23%, ±4), derived from §A–§K boxes;
  §L's **15th** re-run (2026-10-11), two routes agree.

## Durable code facts
- **Kernel admits objects via exactly TWO channels:** `customEntities` and
  `entityExtensions`/`customFieldSets` — no separate "platform entity" list. A module-root `ce.ts` fills both
  (`module-registry.ts` splits it). `model.entities` = `Record<string, KernelEntity>` keyed by canonical id
  (`model.entities['agent']`, not `.find`).
- **Core-object vocabulary = TWO sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS` (tier-assignable:
  `table/column/relation/function/role/agent`) vs `CORE_OBJECT_KINDS` (row-level delete/rename refusal:
  `role/agent`). Do not conflate. **`AH-1`** (the `Agent` kernel object) is BUILT (2026-10-09).
- **Write path = two protections:** the **feature gate** (`metadata.requireFeatures` → `checkAuthorization`,
  `apps/mercato/src/app/api/[...slug]/route.ts:150/207`) = *"may this actor do this?"*, and the **guard registry**
  (`runRouteMutationGuards`) = *"is this write structurally permitted?"*. The gate is **OPT-IN, not
  default-deny** → `CC-44` (owner's call). Instrument: `analysis/permission-gate/measure.js --check`.
- **Read layer (row 15, `P10`), measured 2026-10-10:** (1) tenant/org row **SCOPE** universal via
  `buildScopedWhere` (`shared/src/lib/api/crud.ts:5`) — answers *"which rows are in my tenant?"*, NOT *"may
  this actor read this row?"*; (2) per-entity permission gate **only on the AI search tools** —
  `packages/search/src/modules/search/ai-tools.ts` `authorizeEntityAccess` (`:80`) resolves declared
  **`aclFeatures`** and **fails closed**; (3) one module's per-record gate
  (`communication_channels/lib/access-control.ts`). **The human CRUD `GET`/list path has NO per-entity
  permission filter → `CC-47`** (open). **`CC-46` (BUILT 2026-10-10, code `c03eca5c`) made all **53**
  searchable entities declare `aclFeatures` + a coverage gate (closed the AI-tool half, `P10b` ☑).** **Count
  correction (rule 13): "67" searchable entities was WRONG — true count **53** (67 counted textual `entityId:`
  occurrences; 14 are helper code in `customers/search.ts`).**
- **Permission catalogue** (`shared/src/lib/permissions/catalogue.ts`) is process-global; **declared** surfaces
  global, **recorded** per-tenant → read from **declared + exactly this tenant's rows** (`readTenantSurfaces`);
  hook is the **request**: `getAuthFromRequest(req)` → `tenantId`; `createRequestContainer()` → `resolve('em')`.
- **MikroORM soft-delete:** `{ filters: { softDelete: false } }` is **inert**; write `deletedAt: null`.
- **Enabled-module set** = `apps/mercato/src/modules.ts`; parked modules excluded by `parkedModuleTestPatterns()`.
  **`sales` is parked.**
- **Data classification (row 14, measured 2026-10-10):** a field is marked sensitive by a `ModuleEncryptionMap`
  (`shared/src/modules/encryption.ts`); **15 modules** declare `defaultEncryptionMaps`, persisted to
  `encryption_maps`, seeded at setup + CLI. A MikroORM subscriber encrypts at rest / decrypts on read under a
  per-tenant DEK (`TenantDataEncryptionService`, on by default). **NO export path consults the map**
  (`shared/src/lib/crud/exporters.ts` is classification-agnostic) → **`CC-45`**. Logger redact list is a fixed
  name list, not classification-driven. **`G-05`:** the kernel `classification?` field is declared but unset.

## The deploy path (`companai.corprorate.com`) — measured 2026-10-09
- **VM** `platform-server` (Ubuntu 24.04.5), `172.28.50.2`, user `ramzi`, key `vms/id_ed25519`; reachable only
  from this laptop. App = Compose project `companai-platform` in `/opt/companai-platform`, container
  `companai-platform-app-1`, image `open-mercato/app:wan`. Source (plain copy, NOT a git checkout) =
  `/home/ramzi/build-src`.
- **Deploy:** stream source into `/home/ramzi/build-src`, then `cd /opt/companai-platform && ./update.sh
  /home/ramzi/build-src`. DB export first (`pg_dump` in `mercato-postgres-wan`, db `open-mercato`). Verify:
  `./verify.sh https://companai.corprorate.com`.
- **`update.sh` build context is the SOURCE tree** (`docker build … "$SRC"`); **"transferring context: 2B" is
  the tell** if it breaks. It destroys its own rollback → **`CC-41`** (tag outgoing `:wan-<date>`). A failed
  build does NOT break the site.
- **Login parses form-encoded/formData ONLY** (`auth/api/login.ts`). JSON body → 400 "Invalid email or
  password". Use `curl --data-urlencode email=… --data-urlencode password=…`.
- **`email_hash`** = `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))` (`shared/src/lib/encryption/aes.ts`);
  pepper = `LOOKUP_HASH_PEPPER` ?? `TENANT_DATA_ENCRYPTION_FALLBACK_KEY` ?? `TENANT_DATA_ENCRYPTION_KEY`.
  Accounts: superadmin `admin@companai.local` / `wM8ciC9i8OBIM30KLlh2`; admin `admin@acme.com` / `secret`;
  employee `employee@acme.com` / `secret`.

## Live frontier — see the section ABOVE (2026-10-11); read `JOURNAL.md`'s `★ ACTIVE TASK` for the truth
*(The older duplicate frontier block that used to sit here — the 2026-10-10 one reading "row 15 🟡 / 73 of 330
/ FRONTIER = `CC-47`" — was **stale and is removed** (rule 15/13): it was superseded by the 2026-10-11 section
above and had already misled one reader. The single live frontier is the section above; the ONE NUMBER is
**72 / 321 = 22%**.)*

## MOVED from MEMORY.md 2026-10-12 (to keep the live file under its size limit)

### Durable code facts
- **Kernel admits objects via exactly TWO channels:** `customEntities` + `entityExtensions`/`customFieldSets`; a
  module-root `ce.ts` fills both. `model.entities['agent']` = Record keyed by canonical id.
- **Core-object vocabulary = TWO sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS` (tier-assignable)
  vs `CORE_OBJECT_KINDS` (delete/rename refusal). `AH-1` (the `Agent` kernel object) BUILT 2026-10-09.
- **Write path = two protections:** feature gate (`metadata.requireFeatures` → `checkAuthorization`,
  `apps/mercato/src/app/api/[...slug]/route.ts:150/207`) + guard registry (`runRouteMutationGuards`). The gate is
  **OPT-IN, not default-deny** → `CC-44`. Instrument `analysis/permission-gate/measure.js --check`.
- **Read layer (row 15 / `P10`):** tenant row SCOPE via `buildScopedWhere` (`shared/src/lib/api/crud.ts:5`);
  per-entity gate ONLY on the AI search tools (`packages/search/.../ai-tools.ts:80`, fails closed). Human CRUD
  GET/list has **NO** per-entity filter → `CC-47`. `CC-46` (`c03eca5c`): all **53** searchable entities declare
  `aclFeatures` (rule-13: "67" was wrong). Permission catalogue is process-global; hook = the request.
- **MikroORM soft-delete:** `{ filters: { softDelete: false } }` is INERT; write `deletedAt: null`.
- **Enabled modules** = `apps/mercato/src/modules.ts` (**`sales` is parked**).
- **Data classification (row 14):** sensitive = a `ModuleEncryptionMap`; **15 modules** declare
  `defaultEncryptionMaps` → `encryption_maps`; a subscriber encrypts at rest under a per-tenant DEK. **NO export
  path consults the map** → `CC-45`.
- **Business IR (CORE):** `runFunction` (`user-function/run.ts:112`) compiles+executes; `lib/business-ir-run.ts` is
  the first production caller (`CC-59`); `ai-tools/business-ir-pack.ts` has **no agent consumer** → `CC-60`.

### Deploy path (`companai.corprorate.com`) — 2026-10-09
- VM `platform-server` (`172.28.50.2`, user `ramzi`, key `vms/id_ed25519`, reachable only from this laptop).
  Compose `companai-platform` in `/opt/companai-platform`; source = `/home/ramzi/build-src` (a plain copy, NOT a git
  checkout). **Deploy:** stream source in, `cd /opt/companai-platform && ./update.sh /home/ramzi/build-src`
  (`pg_dump` first; then `./verify.sh https://companai.corprorate.com`). **"transferring context: 2B" = broken.**
  `CC-41` (update.sh destroys its own rollback).
- **Login parses form-encoded ONLY** (`auth/api/login.ts`; JSON → 400) — use `curl --data-urlencode`.
  `email_hash` = `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))`. Accounts: superadmin `admin@companai.local`;
  admin `admin@acme.com`/`secret`; employee `employee@acme.com`/`secret`.


---

## 2026-10-17 20:37 — MEMORY.md as it stood before the 3,000-char compaction
Moved verbatim (nothing dropped) because the live file must stay under the injected size ceiling.
Read this when you need the 2026-10-17 detail that the compact MEMORY.md only points at.

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

**▶ IN PROGRESS — `SR-07` / `CC-107` (a bot is a participant), increment 1 of 8 landed.**
**★ THE DONOR RE-READ CORRECTED THE REGISTER (L182).** The row said to mirror Zulip's *"TWO PARTIAL
UNIQUE INDEXES … streams.py:410-418"*. Measured there: **ONE plain `unique_together
("user_profile","recipient")` over two non-nullable FKs, plus a partial NON-unique index.** Zulip needs no
two-index trick because **a bot IS a `UserProfile` row** (`is_bot`, `users.py:556`) joining through the
same FK — it refuses the split our REFUSED list also refuses. So the two partial unique indexes are the
right shape for OUR schema but they are **ours**, not borrowed. Corrected in the register by name.
**★ THE CHAIN READ THEN FOUND A LIVE DEFECT (increment 1, CLOSED):** `auth.sub` is a SUBJECT STRING
(`api_key:<id>` / `ai_worker:<id>`), `ai_chat_conversation_participants.user_id` is a **uuid** column, and
`api/ai/chat/route.ts` (3 sites) + `api/ai/conversations/route.ts` (1 site) passed the former into the
latter — so every key-backed caller got `22P02` from Postgres on the first persisted turn. A 500, not a
wrong answer. `effectiveUserId()`, written for exactly this, was called **zero** times in both files.
`git log -S` dates it to `1a0239dd` the upstream baseline — **it predates `CC-103`.** Fixed: resolve once
with `effectiveUserId`, refuse `422 ai_acting_user_required` when a machine acts for nobody.
**`checkAiChatRateLimit` and `loadAcl` deliberately KEEP `auth.sub` — they are subject-keyed.** Proof:
105 suites / 1542 tests, 2 mutations RED, `tsc` 0, and a real-Postgres probe committed at
`packages/ai-assistant/src/modules/ai_assistant/__probes__/acting-user-subject.probe.sql`.
**Plan: `library/development/PLAN-CC-107-bot-participant.md` §9.** Remaining: `agent_id`,
`agent_owner_user_id`, nullable `user_id`, four partial unique indexes, `num_nonnulls`, two-axis access
predicate, revoke route, idle-pruning exemption.
**★ INCREMENT 2 LANDED (`6b78a0ac`): `Migration20261017180000_ai_chat_participant_agent_axis`.**
`agent_id` (text) + `agent_owner_user_id` (uuid, the bot_owner analogue) and `user_id` now NULLABLE, with
**four partial unique indexes** (two per axis, two per org scope) and **two NOT-VALID CHECKs** —
`num_nonnulls(user_id, agent_id) = 1` and a one-sided owner rule — landing in the **SAME** migration,
closing the register's carried-forward risk rather than deferring it. NOT VALID is deliberate, so the
repository re-checks at the boundary with a discriminated-union identity.
**★ TIGHTENING FOUND WHILE WRITING IT:** the two user-axis uniques did NOT exclude retired rows, so a
revoked participant blocked its own slot at the database while `addParticipant` compensated in application
code — an invariant enforced nowhere a raw writer would see it.
**★ THE SAME `auth.sub`-into-a-uuid DEFECT EXISTED IN THE PARTICIPANT ROUTES TOO** (POST, DELETE, context
loader) — fixed here. The revoke route's path param keeps its **KEY** `userId` (Next.js hands the handler
that key from the `[userId]` segment) but its **VALUE** names either axis: a bare uuid is a human,
`agent:<id>` is a machine.
**★ THE PROBE CAUGHT ME MEASURING WRONG:** a plan taken before `ANALYZE` read as an index design flaw and
I "fixed" the column order; re-measured after `ANALYZE`, BOTH orderings are chosen. Real cause = stale
statistics. Ordering kept for symmetry; the false cause removed from the comment.
**★ AND THE CHECKER CAUGHT ME EDITING WRONG:** my register-row replacement dropped the `☐ open` state
marker, so the row failed the parse and CC-107 vanished from every count — 3 red checks in one run.
Proof: 105 suites / 1,553 tests, mutation 3 RED, `tsc` 0, probe green on real PG. Plan
`PLAN-CC-107-bot-participant.md` §10.
**▶ INCREMENT 2'S GAP WAS CLOSED AT `8c56428e` (20:03) — AND THAT IS WHERE THE SESSION WAS CUT OFF.** The
participants POST body now accepts EITHER axis (`userId` uuid or `agentId` text, exactly one via a zod
refine), the existence check is per-axis (`User` row for a human, `getAgent` for an agent), and the
response and audit event name the axis (`userId`/`agentId` both, exactly one non-null; `participantAgentId`
on the event). Proof: d2-gap-guard 34/34, mutation 3 RED, `tsc` 0. **NO DOCS PASS EXISTS FOR IT** — plan
§10.5, `MASTER-CHECKLIST.md` §2 and the `CC-107` register row, and this file all still said "the POST body
accepts only a uuid", which became FALSE at 20:03. That sentence is corrected here; the other three still
carry it and are the first docs edit the next session owes.
**▶ Remaining in `SR-07`: the idle-pruning rule (item 8), plus two test gaps — and item 8 is NOT code.**
**No participant pruning exists anywhere in the repo** (only run-registry pruning and OpenCode session-idle
detection), so item 8 is a RULE to record for whoever builds pruning, not a pending change. The two real
gaps: `GET /participants`' agent serialisation is untested (the four new tests are POST-only), and
`canAccessConversation` with an agent caller (`ctx.agentId`) is untested — an agent participant can be
written but nothing proves it can READ. Also noted, not a defect: `getAgent` is a global registry lookup
(`agentsById.get`), not tenant-scoped — existence is proven, "enabled for this tenant" is not.
**★ THE "ONLY ID" FLAW WAS FOUND AND FIXED IN `8c56428e` — traced to the previous agent's own thread.** It
had two layers: a test mock returned only `{ id }` (a 500, fixed in the mock), and the real one — the POST
response and audit event reported only `userId`, which is NULL for an agent, so a grant said nothing about
which machine got access. Now the response carries `userId` + `agentId` (both, exactly one non-null), the
event carries `participantAgentId`, and the GET list serialises both. The revoke route keeps
`participant: "<axis>:<id>"` deliberately.
**★ TWO RED TEST CLASSES FOUND BY THE INTERRUPTION AUDIT (2026-10-17, 20:1x) — neither caused by
`8c56428e`, both real.** The full `packages/ai-assistant` run is **135 suites / 4 failed / 25 failed tests**
— the "105 suites / 1,553" proof was a SUBSET and does not reproduce as a package-wide claim.
(a) `data/__tests__/schema-unique-indexes.test.ts` — `6b78a0ac` flipped the user-axis read index to
identity-first (`tenant, org, user, conversation`) for symmetry, and this test still asserts the old
`(tenant, org, conversation, user)`; the ENTITY is the intended shape (§10.3), so the TEST is what is stale.
(b) `chat-route-cancel-complete` / `chat-route-through-port` / `chat-route-ownership` — all fail
`requirePrincipal is not a function` at `api/chat/route.ts:291`; the import arrived with `e8ecde6d`
(CC-103) and the three suites' `jest.mock('@open-mercato/shared/lib/auth/server')` factories never
learned it (files last touched `be3f6258`). **A route that imports a new guard needs every mock of that
module updated; the "affected surface" list did not include them.**
**▶ NEXT after `SR-07` = `CC-104`/`CC-106` (same trigger)
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
