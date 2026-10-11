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
- **Hostile-critic = a SEPARATE agent every time; demand a command+output per claim.**

## Live frontier (2026-10-11 — read `JOURNAL.md`'s `★ ACTIVE TASK` for the truth)
- **ONE NUMBER 75 / 321 = 23%** (weighted ≈23%), derived from §A–§K boxes; §L's **21st** re-run, two routes agree.
  *Banked trap:* a **split parent** (`- ` line carrying `▸ n/N`) is **never** a derivable tick — its `n` sub-points
  are. Counting the parent too inflates done (83 instead of 75).
- **Row 27 ✅ DONE** (code `3ff25376`): `shared/src/lib/request-outcome/repeat.ts` (the S8 repeat signal; pure).
  **NO box moved** (`S3`'s seal blocked on `G-04`). `CC-66` registered.
- **▶ FRONTIER: NOW = Row 28 (Phase 8)** — *"the agent runtime sits behind ONE typed door; no other code talks to it
  directly."* Ids `B-05` / `Port`; related `N-8` (*"rewire first, delete second"*). Contract =
  `ARCHITECTURE-hermes-integration.md` §4 (eight §4.1 ops + §4.2 envelope). Plan = `PLAN-ROW28-agent-runtime-port.md`.
- **Row 28 🔵 IN PROGRESS** — six sub-rows, built one at a time. **ALL DONE except R28-5/R28-6.**
  **R28-1 ✅** `lib/ai-runtime-port.ts` (the port's shape; 8 ops, envelope, secret refs). **R28-2 ✅**
  `lib/opencode-port-adapter.ts` (all 8 implemented, delegating to the UNCHANGED OpenCode engine; honest
  capability map — `steerRun`/`resolveToolCall` openly ✗). **R28-3 ✅** (code `61776eae`): the exit gate — the chat
  route walks through the door (`api/chat/route.ts` imports the port, NOT the engine; self-tested static guard).
  **R28-4 ✅** (code `5ec1c83f`): the run is CLOSED at the door — `req.signal` (Stop / closed tab) → `port.cancelRun`
  then `port.completeRun` (cancel-BEFORE-complete → a stopped run records `cancelled`), one helper `closeChatRun`;
  `cancelRun`/`completeRun` got their **first production caller**. **`CC-67` ✅ DONE 2026-10-11** (code `6c3db27c`):
  **the LAST THREE direct callers moved onto the door** — a **second adapter** `lib/agent-runtime-port-adapter.ts`
  fronts the platform's **own in-process runtime** (`runAiAgentText`/`runAiAgentObject`), carrying the live DI
  `container`/auth/input on its **construction** (no envelope field invented); the three callers are the chat
  route's text path, `api/ai/run-object/route.ts`, `lib/business-ir-author.ts` — they now **import no engine module**
  (statically pinned). `streamRun` **never drains** the single-use `Response` body (`responseForRun`). Hostile
  critic's ONE real defect: **the run was never CLOSED** → fixed (close in the `finally` before `writer.close()`;
  `failed` on engine error; a bodyless `Response` still closes). 8 tests, 8 mutations, **117 suites / 1596 tests**.
  **★ NEXT = R28-5** — the "nothing bypasses the door" check (the **exit gate** for `B-05`/`N-8`): prove
  mechanically no production file outside the two adapters reaches an engine, `CC-69` = the ONE registered bypass,
  `src/index.ts` = the package barrel (a re-export). Then **R28-6** (delete OpenCode, `N-8`). **Row 28's box stays
  `☐`** — the sentence is a whole-codebase claim; it completes only when **proven** (R28-5). **ONE NUMBER 75/321.**
- **`CC-68` ✅ CLOSED** (code `537e30b5`): a non-deterministic TEST in `mcp-dev-key-resolution.test.ts` (raced the
  swap vs the reader's `Promise.all`; product correct). Lesson **L130**. **`CC-67` lesson = L131** (moving a dispatch
  behind a door keeps the gate at the *callers* + re-site the coverage pin; every `startRun` needs a `completeRun`;
  a whole-codebase claim needs a *proof*, not just moved callers).
- **Open `CC-` items:** `CC-69` (the chat route's `answerQuestion` short-circuit — needs an owner ruling on the port's
  shape), `CC-70` (the run's grant carried-not-consumed), `CC-60` (Business-IR tool → chat consumer), `CC-51`
  (row 16 team-leg — owner's go-ahead), `CC-54` (index rebuild), `CC-19` (CI) — the last three trigger-blocked;
  `CC-58` staged; `CC-32` gated on `G-09`.
- **Owner's go-ahead in force:** execute the supplementary core queue (`PLAN-SUPPLEMENTARY-CORE-QUEUE.md`; docs
  `47177f1`, `caeface`); the Business IR is re-classified **CORE** (`CORE-BOUNDARY.md` §2 note + plan §S1.1).

## Durable code facts (long-form in `extended_deep_memory.md`)
- **Kernel admits objects via exactly TWO channels:** `customEntities` + `entityExtensions`/`customFieldSets`; a
  module-root `ce.ts` fills both. `model.entities['agent']` = Record keyed by canonical id.
- **Core-object vocabulary = TWO sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS` (tier-assignable)
  vs `CORE_OBJECT_KINDS` (delete/rename refusal). `AH-1` (the `Agent` kernel object) BUILT 2026-10-09.
- **Write path = two protections:** feature gate (`metadata.requireFeatures` → `checkAuthorization`,
  `apps/mercato/src/app/api/[...slug]/route.ts:150/207`) + guard registry (`runRouteMutationGuards`). The gate is
  **OPT-IN, not default-deny** → `CC-44`. Instrument `analysis/permission-gate/measure.js --check`.
- **Read layer (row 15 / `P10`):** tenant row SCOPE via `buildScopedWhere` (`shared/src/lib/api/crud.ts:5`);
  per-entity gate ONLY on the AI search tools (`packages/search/.../ai-tools.ts:80`, fails closed). Human CRUD
  GET/list has **NO** per-entity filter → `CC-47`. `CC-46` (code `c03eca5c`): all **53** searchable entities declare
  `aclFeatures` (rule-13: "67" was wrong). Permission catalogue is process-global (declared global, recorded
  per-tenant); hook = the request.
- **MikroORM soft-delete:** `{ filters: { softDelete: false } }` is INERT; write `deletedAt: null`.
- **Enabled modules** = `apps/mercato/src/modules.ts` (**`sales` is parked**).
- **Data classification (row 14):** sensitive = a `ModuleEncryptionMap`; **15 modules** declare
  `defaultEncryptionMaps` → `encryption_maps`; a MikroORM subscriber encrypts at rest under a per-tenant DEK.
  **NO export path consults the map** → `CC-45`.
- **Business IR (CORE):** `runFunction` (`user-function/run.ts:112`) compiles+executes; `lib/business-ir-run.ts` is
  the first production caller (`CC-59` done); `ai-tools/business-ir-pack.ts` has **no agent consumer** → `CC-60`.

## Deploy path (`companai.corprorate.com`) — measured 2026-10-09 (full detail in `extended_deep_memory.md`)
- VM `platform-server` (`172.28.50.2`, user `ramzi`, key `vms/id_ed25519`, reachable only from this laptop).
  Compose `companai-platform` in `/opt/companai-platform`; source = `/home/ramzi/build-src` (a plain copy, NOT a git
  checkout). **Deploy:** stream source in, `cd /opt/companai-platform && ./update.sh /home/ramzi/build-src`
  (`pg_dump` first; then `./verify.sh https://companai.corprorate.com`). **"transferring context: 2B" = broken.**
  `CC-41` (update.sh destroys its own rollback).
- **Login parses form-encoded ONLY** (`auth/api/login.ts`; JSON → 400) — use `curl --data-urlencode`.
  `email_hash` = `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))`. Accounts: superadmin `admin@companai.local`;
  admin `admin@acme.com`/`secret`; employee `employee@acme.com`/`secret`.
