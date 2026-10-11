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
- **FIRST STARTABLE ITEM = `CC-59`** (IN PROGRESS): measured (rule 0b) the compile+execute chain is **ALREADY BUILT** in
  **`runFunction`** (`user-function/run.ts:112` — bind → compile → **execute via `engine.query`** `:216-241`), so the gap
  is **ONE caller**, not a chain; a *"load a saved Function by id"* caller is impossible (no persistence → `CC-32`/`G-09`).
  **`CC-59` = prompt → `authorBusinessQueryIr` → IR → `compileQuery` → `engine.query` → result** (no persistence); it
  merges with `CC-58` Stage C. **Rule-13 correction committed `caeface`.**
- **Remaining `CC-` items are trigger-blocked only:** `CC-51` (row 16 team-leg — the owner's go-ahead), `CC-54` (index
  rebuild), `CC-19` (CI). `CC-58` Stage C/B staged; `CC-32` gated on `G-09`.
- **Next candidates (vision order):** (1) `CC-59` caller — **started**; (2) `CC-51` team-leg — smallest closable;
  (3) **vision Phase 6 = audit** (tamper-evident decision record) — the next skeleton frontier, no scaffold yet;
  (3) `CC-54`/`CC-19` — not startable. **ONE NUMBER 72 / 321 = 22%** (weighted ≈23%, ±4), derived from §A–§K boxes.

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

## Live frontier (2026-10-10) — read `JOURNAL.md`'s `★ ACTIVE TASK` for the truth
- Rows 7, 8, 9, 13, 14 are ✅. **PHASE 3 COMPLETE.** Row 15 is an accurate 🟡 (only `CC-47` left); row 14's
  export leg is `CC-45`. **Progress 73 / 330 = 22%** (weighted ≈23%, ±4).
- **FRONTIER NOW = `CC-47` · `CC-45`** (both buildable; re-measure first, rule 0b; `CC-47`'s *semantics* is an
  owner decision — rule 11). **ALSO NOW = `G-22`** (2A built; 2B paused as `CC-42`). **NEXT = `CC-27`**
  (unblocked since `AH-1` closed). **THEN = `CC-44`** (owner's ruling).
