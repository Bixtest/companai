# Project memory — Companai / open-mercato (ACTIVE, curated)

> **ARCHIVE:** this file is the SHORT, live memory. It was split on 2026-10-11 to stay under the size limit.
> **If you need more detail than a line here carries, the long-form version is in `extended_deep_memory.md`
> (same folder) — the frozen archive of all previous work.** New work is recorded HERE, never there.

## How we work — the owner's 6-step protocol
1. **Next task** comes ONLY from the `★ ACTIVE TASK` box at the top of `JOURNAL.md`; the order is `BUILD-ORDER.md`.
2. **Pick the relevant points** from `library/development/platform_points.md` (SCOREBOARD + master list).
3. **Requirement = task definition + those points, combined** — written BEFORE any code.
4. **Rule 0b — fact-check the code FIRST:** what exists; which prerequisites must be done; what the change can
   impact. **Never build before measuring.**
5. **Then** plan → execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5-verified restore) →
   re-measure → decide honestly.
6. **Only when flawless:** update ALL docs in the SAME change (`BACKLOG`, `platform_points`, `BUILD-ORDER`,
   `JOURNAL`, `COMPLETION-CALLBACKS`).

## Standing rules (binding)
- **Two sources of truth:** `BACKLOG.md` (status) + `BUILD-ORDER.md` (order). Authoritative FRONTIER =
  `platform_points.md`'s `▶ FRONTIER` box.
- **Every claim carries an observation.** Only the code is evidence (Rule 0).
- **SHARED-DOC CLOBBER HAZARD (learned twice).** The owner edits docs from a **stale editor copy**; his save
  silently overwrites agent edits. BEFORE touching any shared doc: `git diff <path>` worktree-vs-HEAD; if agent
  content was lost, `git checkout <good-commit> -- <path>` then re-apply. **Commit immediately after every edit.**
  `library/workspace-architecture/owner_answers.md` is **the owner's file** (agent reads, never writes).
- **`grep $'\r'` LIES on a git pipe here** (reports every line CRLF). Test LF-0 of a blob with
  `git ls-files --eol <path>` → `i/lf`.
- **Never `git add -A`** — stage by explicit path; commit in BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`;
  code `…/workspace/starting-kit`).
- **Rules:** 8 schedule every partial build in `COMPLETION-CALLBACKS.md` same change · 9a own the code you touch ·
  9b challenge the task · 10d never stack on an unfinished foundation · 11 the owner decides *what* ·
  12 judge committed blobs, not rendered diffs · 13 correct a falsified premise *everywhere* · 14b migrations
  provable · 15 solve the straightforward NOW · 16 the `B-WS` bridge.

## Reporting rules — BINDING (owner, stated twice)
- **No flag without a FULL report:** (1) named; (2) what it is in our terms; (3) why it exists; (4) risk if left
  alone; (5) ranked lines of action + trade-offs + a recommendation. Bare "latent gap" / "out of scope" /
  "note:" is **NOT** a report.
- **Never end on "your call" / "you decide"** — give the ranked shortlist, my recommendation, then **one specific
  question**.
- **Never make the owner ask "what does that mean?"** — if it needs decoding to act on, it is not finished.

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
- **ONE NUMBER 75 / 321 = 23%** (weighted ≈23%, ±4), derived from §A–§K boxes; §L's **17th** re-run, two routes agree.
- **Row 27 ✅ DONE 2026-10-11** (code `3ff25376`, docs `b15a792`): `packages/shared/src/lib/request-outcome/repeat.ts`
  (`normaliseRequestText`/`requestTokens`/`requestSimilarity` Jaccard/`detectRepeatedRequest`→`RepeatSignal`; pure,
  zero imports; threshold 0.8). Measured: `S3` "told" half exists, "seal" blocked on `G-04`; `S8` gate inert,
  "notices" half built as the signal. **NO box moved** (neither half completes a point). Proof 5 suites / 78 tests.
  `CC-66` registered. **Frontier rolled to row 28.**
- **▶ FRONTIER: NOW = Row 28 (Phase 8)** — *"the agent runtime sits behind ONE typed door; no other code talks to it
  directly."* Ids `B-05` / `Port`; related `N-8` (*"rewire first, delete second"*). **Measured (rule 0b):** NO port
  exists — `api/chat/route.ts` calls `createOpenCodeClient`/`handleOpenCodeMessageStreaming` DIRECTLY; a 2nd runtime
  path `runAiAgentText` (`api/ai/chat/route.ts:688`); `runAiAgentObject` (`run-object:186` + `business-ir-author:160`);
  `AiRuntimePort` is a **comment-only** declaration (`ce.ts`, owned by `L-01`/`AH-5`). Authoritative contract =
  `ARCHITECTURE-hermes-integration.md` §4/§7/§9 → **Phase 1 = "the port, with OpenCode behind it"**.
- **ALSO NOW:** Row 16 team-leg (`CC-51`) + `G-22`. **DESIGN TRACK: `B-WS/B9`** (widget architecture). **DONE: Row 22.**
- **Row 28 🔵 IN PROGRESS** — six sub-rows (`PLAN-ROW28-agent-runtime-port.md`). **R28-1 ✅ DONE 2026-10-11**
  (code `513bad41`): the port's **shape + test** — `lib/ai-runtime-port.ts` (definitions only, zero imports; the eight
  §4.1 signatures, the §4.2 envelope with required `capabilityGrantId`, secret *references*) + 9 tests incl. the
  `IsExactKeys` type guard. **NEXT = R28-2** (fit OpenCode behind the door, unchanged behaviour). R28-3 = the chat
  route moved onto the port (the exit gate). `CC-67` (two other direct callers) is R28-3-blocked.
- **`CC-68` ✅ CLOSED 2026-10-11** (code `537e30b5`): a **non-deterministic TEST** in `mcp-dev-key-resolution.test.ts`
  (the TOCTOU case, both variants) — it raced the swap against the reader's `Promise.all`; **product was correct**.
  Fixed by stating the inode mismatch directly; mutation-proved; 5× full-suite green (1530/1530). Also guarded
  `llm-bootstrap` (partial-registry stub). Lesson **L130**.
- **Open `CC-` items:** `CC-67` (R28-3), `CC-60` (Business-IR tool → chat consumer), `CC-51` (row 16 team-leg — owner's
  go-ahead), `CC-54` (index rebuild), `CC-19` (CI) are trigger-blocked; `CC-58` staged; `CC-32` gated on `G-09`.
- **Owner's go-ahead in force:** execute the supplementary core queue (`PLAN-SUPPLEMENTARY-CORE-QUEUE.md`; docs
  `47177f1`, `caeface`); the Business IR is re-classified **CORE** (`CORE-BOUNDARY.md` §2 note + plan §S1.1).

## Durable code facts (long-form in `extended_deep_memory.md`)
- **Kernel admits objects via exactly TWO channels:** `customEntities` + `entityExtensions`/`customFieldSets`; a
  module-root `ce.ts` fills both. `model.entities` = Record keyed by canonical id (`model.entities['agent']`).
- **Core-object vocabulary = TWO sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS` (tier-assignable:
  table/column/relation/function/role/agent) vs `CORE_OBJECT_KINDS` (delete/rename refusal: role/agent). `AH-1`
  (the `Agent` kernel object) BUILT 2026-10-09.
- **Write path = two protections:** feature gate (`metadata.requireFeatures` → `checkAuthorization`,
  `apps/mercato/src/app/api/[...slug]/route.ts:150/207`) + guard registry (`runRouteMutationGuards`). The gate is
  **OPT-IN, not default-deny** → `CC-44`. Instrument `analysis/permission-gate/measure.js --check`.
- **Read layer (row 15 / `P10`):** tenant row SCOPE via `buildScopedWhere` (`shared/src/lib/api/crud.ts:5`);
  per-entity gate ONLY on the AI search tools (`packages/search/.../ai-tools.ts:80 authorizeEntityAccess`, fails
  closed). Human CRUD GET/list has **NO** per-entity filter → `CC-47`. `CC-46` (code `c03eca5c`) made all **53**
  searchable entities declare `aclFeatures` (rule-13 correction: "67" was wrong).
- **Permission catalogue** (`shared/src/lib/permissions/catalogue.ts`) is process-global: declared global, recorded
  per-tenant → read declared + this tenant's rows (`readTenantSurfaces`); hook = the request
  (`getAuthFromRequest(req)` → `tenantId`).
- **MikroORM soft-delete:** `{ filters: { softDelete: false } }` is INERT; write `deletedAt: null`.
- **Enabled modules** = `apps/mercato/src/modules.ts`; parked excluded by `parkedModuleTestPatterns()`. **`sales`
  is parked.**
- **Data classification (row 14):** sensitive = a `ModuleEncryptionMap` (`shared/src/modules/encryption.ts`);
  **15 modules** declare `defaultEncryptionMaps` → `encryption_maps` (seeded at setup + CLI); a MikroORM subscriber
  encrypts at rest under a per-tenant DEK (`TenantDataEncryptionService`). **NO export path consults the map**
  (`shared/src/lib/crud/exporters.ts`) → `CC-45`. `G-05`: kernel `classification?` declared but unset.
- **Business IR (CORE):** `runFunction` (`user-function/run.ts:112`) already compiles+executes; `lib/business-ir-run.ts`
  (`runBusinessQueryPrompt`) is the first production caller; `CC-59` done (code `83f88bd3`).
  `ai-tools/business-ir-pack.ts` (`business_ir.run_query`) has **no agent consumer yet** → `CC-60`.

## Deploy path (`companai.corprorate.com`) — measured 2026-10-09
- VM `platform-server` (Ubuntu 24.04.5), `172.28.50.2`, user `ramzi`, key `vms/id_ed25519` (reachable only from
  this laptop). Compose project `companai-platform` in `/opt/companai-platform`, container
  `companai-platform-app-1`, image `open-mercato/app:wan`. Source (plain copy, NOT a git checkout) =
  `/home/ramzi/build-src`.
- **Deploy:** stream source into `/home/ramzi/build-src`, then `cd /opt/companai-platform && ./update.sh
  /home/ramzi/build-src`; `pg_dump` first (`mercato-postgres-wan`, db `open-mercato`); verify `./verify.sh
  https://companai.corprorate.com`.
- `update.sh` build context = the SOURCE tree; **"transferring context: 2B" is the tell** if it breaks. It destroys
  its own rollback → `CC-41` (tag outgoing `:wan-<date>`).
- **Login parses form-encoded/formData ONLY** (`auth/api/login.ts`); JSON body → 400. Use
  `curl --data-urlencode email=… --data-urlencode password=…`.
- `email_hash` = `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))`; pepper = `LOOKUP_HASH_PEPPER` ??
  `TENANT_DATA_ENCRYPTION_FALLBACK_KEY` ?? `TENANT_DATA_ENCRYPTION_KEY`. Accounts: superadmin
  `admin@companai.local`/`wM8ciC9i8OBIM30KLlh2`; admin `admin@acme.com`/`secret`; employee `employee@acme.com`/`secret`.
