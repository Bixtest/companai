# Project memory — Companai / open-mercato (ACTIVE, curated)

> **ARCHIVE:** this file is the SHORT, live memory. It was split on 2026-10-11 to stay under the size limit.
> **If you need more detail than a line here carries, the long-form version is in `extended_deep_memory.md`
> (same folder) — the frozen archive of all previous work.** New work is recorded HERE, never there.

## How we work — the owner's 6-step protocol
1. **Next task** comes ONLY from the `★ ACTIVE TASK` box at the top of `JOURNAL.md`; the order is `BUILD-ORDER.md`.
2. Pick the relevant points from `library/development/platform_points.md` (SCOREBOARD + master list).
3. **Requirement = task definition + those points**, written BEFORE any code.
4. **Rule 0b — fact-check the code FIRST** (what exists; which prerequisites; what it can impact). Never build
   before measuring.
5. **Then** plan → execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5-verified restore) →
   re-measure → decide honestly.
6. **Only when flawless:** update ALL docs in the SAME change (`BACKLOG`, `platform_points`, `BUILD-ORDER`,
   `JOURNAL`, `COMPLETION-CALLBACKS`).

## Standing rules (binding)
- **Two sources of truth:** `BACKLOG.md` (status) + `BUILD-ORDER.md` (order). Authoritative FRONTIER =
  `platform_points.md`'s `▶ FRONTIER` box. **Only the code is evidence** (Rule 0).
- **SHARED-DOC CLOBBER HAZARD (learned twice).** The owner edits docs from a **stale editor copy**; his save
  silently overwrites agent edits. BEFORE touching any shared doc: `git diff <path>` worktree-vs-HEAD; if agent
  content was lost, `git checkout <good-commit> -- <path>` then re-apply. **Commit immediately after every edit.**
  `library/workspace-architecture/owner_answers.md` is **the owner's file** (read, never write).
- **`grep $'\r'` LIES on a git pipe here** (every line reads CRLF). Test LF-0 of a blob with `git ls-files --eol
  <path>` → `i/lf`.
- **Never `git add -A`** — stage by explicit path; commit in BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`;
  code `…/workspace/starting-kit`).
- **Rules:** 8 schedule every partial build in `COMPLETION-CALLBACKS.md` same change · 9a own the code you touch ·
  9b challenge the task · 10d never stack on an unfinished foundation · 11 the owner decides *what* · 12 judge
  committed blobs, not rendered diffs · 13 correct a falsified premise *everywhere* · 14b migrations provable ·
  15 solve the straightforward NOW · 16 the `B-WS` bridge.

## Reporting rules — BINDING (owner, stated twice)
- **No flag without a FULL report:** (1) named; (2) what it is in our terms; (3) why it exists; (4) risk if left
  alone; (5) ranked lines of action + trade-offs + a recommendation. Bare "latent gap"/"out of scope"/"note:" is
  **NOT** a report.
- **Never end on "your call" / "you decide"** — give the ranked shortlist, my recommendation, then **one specific
  question**. **Never make the owner ask "what does that mean?"** — if it needs decoding to act on, it is unfinished.

## Section map
- `platform_points.md` — SCOREBOARD (ONE number + plain list, vision Phase 0→10 order) + byte-identical `§A`–`§L`
  appendix. **The number is DERIVED from ticked boxes, never typed** (`§L derive-counts`). Markers `☑`/`✅`;
  `- ` whole point, `-   - ` sub-point, 5+ spaces = annotation (never a unit); a split parent (`▸ n/N`) never done.
  **§L EXCLUDED** (holds no points).
- `library/development/{BACKLOG,BUILD-ORDER,COMPLETION-CALLBACKS,WORKING-RULES,AGENT-HALF,HANDOVER,START-PROMPT}.md`.
- `JOURNAL.md` (docs root) = live task box + done blocks. Daily logs `.workbuddy-ai/memory/YYYY-MM-DD.md`.
- Design track: `library/workspace-architecture/` (bound by `04-BRIDGE.md` + rule 16; **design, never code**).

## Working hazards
- **Line endings — judge from the COMMITTED BLOB, not the worktree** (`core.autocrlf=true`). Worktree CRLF:
  `HANDOVER.md`, `COMPLETION-CALLBACKS.md`, `SPECIFICATIONS-DICTIONARY.md`; `git show HEAD:` is **LF-0 for all**.
  After a doc edit assert `raw diff == git diff -w` (a gap = reflow damage → `git checkout --` + re-apply).
- **ENCODING TRAP:** Python `open(p,'w')` flips LF→CRLF + changes md5 — **write bytes**; md5-compare every restore.
  **DATA-LOSS:** build the bytes BEFORE `open(f,'wb')` (a throwing build truncates to 0).
- **Never edit at a line number from a DIFFERENT tool** — locate by CONTENT in the same pass; assert one match.
- **Register row = 5 CONTENT cells** (`| ID | Gap | Prerequisite | Trigger ↔ checked at | Callback |`);
  BAD-COLUMNS counts ` | ` ≥ 4. Reconciliation reads **cell 3 (Gap)** for `✅`.
- **Node 24:** `…/workspace/.toolchain/node24/node.exe`. tsc `node ../../node_modules/typescript/bin/tsc
  --noEmit`; jest `node ../../node_modules/jest/bin/jest.js --config jest.config.cjs --testPathPatterns <re>`
  **from the PACKAGE dir** (`.bin` shims broken on Windows; repo root → TS5011).
- **`perl` / `bc` unavailable.** Prefer script files over `python -c` heredocs (backticks/`[]`/em-dash mangled).
- **Sandbox `rmSync` shim** (`dynamicLoader.tsconfig.test.ts`) fails in the full `shared` suite, passes in
  isolation — **environmental, not a defect** (`CC-19`).
- **Hostile-critic = a SEPARATE agent every time; demand a command+output per claim.** A structural scan must
  enumerate + assert the file classes it covers, and detect ALL edge forms (`from`/multi-line/side-effect/`require`/
  dynamic) — **L132** (`.ts`-only walk missed 36 `.tsx`; 4 of 6 import forms missed).

## Live frontier (2026-10-12 — read `JOURNAL.md`'s `★ ACTIVE TASK` for the truth)
- **ONE NUMBER 78 / 321 = 24%** (weighted ≈24%), derived from §A–§K boxes; §L's **24th** re-run, two routes agree.
  (Was 76 before §9 Phase 0's two §D boxes ticked.) *Banked traps:* a **split parent** (`- ` line carrying `▸ n/N`)
  is **never** a derivable tick — its `n` sub-points are; whole point = `- ` + a box glyph, sub-point = `-   - `,
  **5+ spaces = annotation, never a unit**; **§L excluded**.
- **▶ FRONTIER: NOW = Row 28 (Phase 8)** — *"the agent runtime sits behind ONE typed door; no other code talks to it
  directly."* Ids `B-05` / `Port`; related `N-8` (*"rewire first, delete second"*). Contract =
  `ARCHITECTURE-hermes-integration.md` §4 (eight §4.1 ops + §4.2 envelope). Plan = `PLAN-ROW28-agent-runtime-port.md`.
- **Row 28 (Phase 8) ✅ COMPLETE — banked (all six sub-rows + `CC-67` + `R28-5`).** The agent runtime sits behind
  ONE typed door: `lib/ai-runtime-port.ts` (8 ops + envelope, R28-1) → `lib/opencode-port-adapter.ts` (R28-2) +
  `lib/agent-runtime-port-adapter.ts` (the platform's own runtime) → the chat route walks through it (R28-3) →
  runs close at the door (R28-4). **`B-05` ✅.** **`R28-5` proved the door the only way in** (whole-package
  `.ts`+`.tsx` scan, 118 suites/1607 green, 12 mutations RED; 2 named exceptions `CC-69`/`CC-71`). Plan =
  `PLAN-ROW28-agent-runtime-port.md`.
- **`R28-6` ("delete OpenCode") TRIGGER-BLOCKED → `CC-72`.** OpenCode is the ONLY engine that answers a chat →
  deleting it stands the door over a hole. Trigger = *"Hermes wired behind the door (arch §9 Phase 2+)"*.
  **"OpenCode" is a NAME COLLISION** — the **engine** (delete, when Hermes lands) vs a **load-bearing vestige**
  (`opencode-provider.ts` + `OPENCODE_*` env + `api_keys.opencodeSessionId` = model-provider config — **never
  delete blind**). **L133.**
- **⚠ HERMES SOURCE (corrected 2026-10-12, rule 13 — "Hermes does not exist" was UNDER-SCOPED).** The **code**
  repo has no Hermes (`git ls-files | grep -i hermes` → empty). The **docs** repo holds the Hermes **source** as
  **THREE** gitignored extracts, none byte-identical: the **PINNED** root `hermes-agent-main/` (**18,248** files,
  revision **`3569e846…`**, digest **`ca760e97ff1ef1f0e2ed3deb0dfc2923`**, byte-identical to the root zip);
  `hermes-agent-main-older/` (17,367 files); `library/ai/hermes-agent-main/` (**17,201** files, revision
  `eb044063…` — the *previous* pin, now **3,290 commits behind**). Upstream = **Nous Research "hermes-agent", MIT,
  `version` 0.0.0, no `.git`**. **Re-PINNED 2026-10-12**: the pin **moved** from `library/ai/…` to the root copy
  (owner supplied it; measured 3,290 commits ahead). Harness = `library/.hermes_pin.py --check` → **PIN HOLDS**;
  doc = `library/development/HERMES-PIN.md`. `CC-72`'s trigger unaffected. **L135** (a snapshot carries its own
  provenance — the zip comment holds the revision) / **L136** (≥2 copies = a defect; re-measure the pin when a
  newer copy arrives). Licence position: runtime MIT; all bundled `LICENSE` MIT/Apache-2.0; **closes `V-09`**.
- **★ NEXT = Hermes track §9 `Phase 2`** (one worker, one tenant, one tool) — Phase 0 (pin) & Phase 1 (the port
  with OpenCode behind it) are done. Alternatives: Vision Phase 6 audit (no scaffold), Vision Phase 6.
- **`CC-51` MEASURED 2026-10-12 — its premise was FALSIFIED (rule 13). NOT the small fix the owner hoped for.**
  Row 16's team-leg. Register said B needs *"a real `team` concept the platform has never had"* — false: the
  `team` concept EXISTS (`StaffTeam`/`StaffTeamRole`/`StaffTeamMember` with `team_id` **and `user_id`**,
  `packages/core/src/modules/staff/data/entities.ts:5/36/73`, + API routes/commands/pages/seeds = 236 files; the
  ONLY team concept in the tree). So B is SMALLER than documented — its "large" half is built. What remains:
  `teamField`/`teamFeature` pair (`factory.ts:206` has only the owner pair), the "my teams → member ids"
  expansion (`factory.ts:1455-1483` resolves only the owner branch), the third role mode.
  **NEW blocker: the `staff` module is PARKED** (`apps/mercato/src/modules.ts` reference section, with `sales`) —
  so **enabling `staff` is a PRODUCT decision (rule 11)**, and nothing can use team scope until teams are live.
  Corrected in 4 docs + L137. **Answer handed to the owner as a question, not a build.**
- **`CC-68` ✅ / `CC-67` lesson L131 / `CC-59` ✅** (Business-IR chain's first production caller `lib/business-ir-run.ts`
  + tool `ai-tools/business-ir-pack.ts`; the consumer gap = `CC-60`).
- **Open `CC-` items:** `CC-69`/`CC-71` (**RULED 2026-10-12 — accepted as permanent named exceptions; revisit when
  Hermes lands**), **`CC-72` (delete-OpenCode — TRIGGER-BLOCKED on Hermes; do NOT build)**, `CC-70` (grant
  carried-not-consumed), `CC-60` (Business-IR tool → chat consumer), **`CC-51` (row 16 team-leg — owner gave
  conditional go-ahead 2026-10-12: *"if it is straightforward and small, fix it first"* → MEASURE it)**, `CC-54`
  (index rebuild), `CC-19` (CI) — last two trigger-blocked; `CC-58` staged; `CC-32` gated on `G-09`.
- **Owner's go-ahead in force:** execute the supplementary core queue (`PLAN-SUPPLEMENTARY-CORE-QUEUE.md`; docs
  `47177f1`, `caeface`); the Business IR is re-classified **CORE** (`CORE-BOUNDARY.md` §2 + plan §S1.1).

## Durable code facts + deploy path — MOVED to `extended_deep_memory.md` (2026-10-12, to stay under the size limit)
The full text of the former *Durable code facts* and *Deploy path* sections is now in `extended_deep_memory.md`.
The pointers that matter most, kept here: **kernel objects** via `customEntities` + `entityExtensions`/`customFieldSets`;
**core-object vocabulary** = `CORE_SETTING_KINDS` vs `CORE_OBJECT_KINDS` (`shared/src/lib/core-boundary/`); the
**write gate is OPT-IN, not default-deny** → `CC-44`; the **human CRUD read path has no per-entity filter** → `CC-47`;
**MikroORM** `{ filters:{softDelete:false} }` is INERT (write `deletedAt:null`); **enabled modules** =
`apps/mercato/src/modules.ts` (`sales` parked). **Deploy** `companai.corprorate.com`: VM `platform-server`
(`172.28.50.2`, key `vms/id_ed25519`), `./update.sh /home/ramzi/build-src` then `./verify.sh`; **login parses
form-encoded ONLY**; `CC-41` (update.sh destroys its own rollback).
