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

## Rule 15 — solve the straightforward NOW (BINDING)
Anything straightforward that does not disrupt the plan is solved **immediately**, never scheduled — postponing
hides the gaps that fixing would expose. Defer only on a real prerequisite, with the trigger named (rule 8).
Worked example: `CC-43` "flagged, not fixed" **hid `CC-46`**.

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
- **ONE NUMBER 76 / 321 = 24%** (weighted ≈24%), derived from §A–§K boxes; §L's **22nd** re-run, two routes agree.
  *Banked traps:* a **split parent** (`- ` line carrying `▸ n/N`) is **never** a derivable tick — its `n` sub-points
  are; whole point = `- ` + a box glyph, sub-point = `-   - `, **5+ spaces = annotation, never a unit**; **§L excluded**.
- **▶ FRONTIER: NOW = Row 28 (Phase 8)** — *"the agent runtime sits behind ONE typed door; no other code talks to it
  directly."* Ids `B-05` / `Port`; related `N-8` (*"rewire first, delete second"*). Contract =
  `ARCHITECTURE-hermes-integration.md` §4 (eight §4.1 ops + §4.2 envelope). Plan = `PLAN-ROW28-agent-runtime-port.md`.
- **Row 28 🔵 IN PROGRESS** — six sub-rows. **R28-1 ✅** `lib/ai-runtime-port.ts` (the port's shape; 8 ops, envelope,
  secret refs). **R28-2 ✅** `lib/opencode-port-adapter.ts` (all 8, delegating to the UNCHANGED OpenCode engine;
  honest map — `steerRun`/`resolveToolCall` openly ✗). **R28-3 ✅** (`61776eae`) — the chat route walks through the
  door (`api/chat/route.ts` imports the port; self-tested static guard). **R28-4 ✅** (`5ec1c83f`) — the run is CLOSED
  at the door: `req.signal` (Stop/closed tab) → `cancelRun` then `completeRun` (cancel-BEFORE-complete → a stopped run
  records `cancelled`); `cancelRun`/`completeRun` got their **first production caller**. **`CC-67` ✅** (`6c3db27c`) —
  the **last three direct callers** moved onto the door via a **second adapter** `lib/agent-runtime-port-adapter.ts`
  (the platform's **own in-process runtime**, `runAiAgentText`/`runAiAgentObject`, carrying the live container/auth on
  its construction — no envelope field invented); `streamRun` never drains the single-use `Response` (`responseForRun`);
  hostile critic's ONE real defect = the run was never CLOSED → fixed.
- **`R28-5` ✅ DONE 2026-10-12 — the EXIT GATE: the door is PROVEN the only way in. `B-05` ✅ TICKED.** NEW test
  `packages/ai-assistant/.../__tests__/door-only-way-in.test.ts` (md5 `776404ff318404dbb4860f5438ebf583`): whole-package
  `.ts`+`.tsx` scan (comment-stripped; ALL edge forms — `from`/multi-line/side-effect/`require`/dynamic `import`),
  asserting the ONLY engine-reaching files = 2 engines + 2 adapters + barrel + **2 named exceptions**. 11 assertions
  incl. a **derivation test** (scan `lib/` for engine-defining files) + a **`.tsx` self-check**. **Two premise
  corrections (rule 13):** `CC-69`'s reach is in **`api/chat/route.ts`** (NOT `api/ai/chat/route.ts` — that route
  imports no engine); **`api/health/route.ts`** is a THIRD exception → new **`CC-71`**. **Proof:** 11/11 isolated;
  **118 suites / 1607 tests green** (baseline 117/1596 → +1/+11); type-check 100 errors with the file, 100 without
  (control; +0); **12 mutations ALL RED, md5-restored** (8 test-side + 4 production-side). **Critic found 3 REAL
  defects:** `walk` filtered `.ts` only → **36 `.tsx` files invisible** (most serious); detector missed 4 of 6 import
  forms; a false "derived, not typed" header claim (now really derived). **L132.** **Honest reading:** `B-05` ticks
  (its sole blocker WAS the proof); `N-8` keeps `☐` (delete half = `R28-6`); 3×`Port` keep `☐` on their OWN blockers
  (`steerRun`/`resolveToolCall` unsupported; `secretRefs` unpopulated + `CC-70`). The 2 non-run reaches (`CC-69`,
  `CC-71`) are named, pinned, registered.
- **★ NEXT = an owner ruling on `CC-69`/`CC-71`** (rule 11: widen the port contract — richer health, a question/steer
  op — or accept the two non-run reaches as permanent named exceptions), **or `R28-6`** (delete OpenCode = `N-8`'s
  second half).
- **`CC-68` ✅ / `CC-67` lesson L131 / `CC-59` ✅** (Business-IR chain's first production caller `lib/business-ir-run.ts`
  + tool `ai-tools/business-ir-pack.ts`; the consumer gap = `CC-60`).
- **Open `CC-` items:** `CC-69`/`CC-71` (need the owner ruling), `CC-70` (grant carried-not-consumed), `CC-60`
  (Business-IR tool → chat consumer), `CC-51` (row 16 team-leg — owner's go-ahead), `CC-54` (index rebuild),
  `CC-19` (CI) — last three trigger-blocked; `CC-58` staged; `CC-32` gated on `G-09`.
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
