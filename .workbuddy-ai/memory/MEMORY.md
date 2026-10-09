# Project memory — Companai / open-mercato (curated, durable)

## How we work — the owner's standing 6-step protocol (2026-10-07)

**This is the role. Follow it for every task, in order.**
1. **Pick the next task** from `BUILD-ORDER.md` order. The live task is stated ONLY in the
   `★ ACTIVE TASK` box at the top of `JOURNAL.md` (docs repo root).
2. **Pick all relevant points** in `library/development/platform_points.md` (master point list).
3. **Requirement = the task definition + those platform_points, combined.** Write it down before code.
4. **Fact-check the code**: (a) what is actually there; (b) which prerequisites must be fully done &
   functional first; (c) which code the planned change can impact.
5. **Then** plan, execute, and run the standard protocols — hostile-critic pass (SEPARATE agent),
   RED-then-GREEN mutation proof (md5-verified restore), re-measure — to decide honestly whether it is
   flawless or needs more fixing.
6. **Only when done fully, flawlessly, honestly**: update ALL relevant docs — `BACKLOG.md`,
   `platform_points.md`, `BUILD-ORDER.md`, `JOURNAL.md` `▶ NOW`, `COMPLETION-CALLBACKS.md`.

### Standing rules that bind
- **Two sources of truth:** `BACKLOG.md` (live status) + `BUILD-ORDER.md` (order).
- **"A module is done" must be re-measured, never assumed from its tag.**
- **Every claim carries an observation.** Docs are not evidence; only the code is (platform_points Rule 0).
- **Never `git add -A`.** Commit in both repos (docs `C:/Users/Ramzi/Downloads/companai`; code
  `C:/Users/Ramzi/Downloads/companai/workspace/starting-kit`).
- Handover docs carry **no "what is next"**; the live task lives only in the `★ ACTIVE TASK` box.
- **Rule 8:** every partial build is scheduled in `COMPLETION-CALLBACKS.md` (gap + prerequisite +
  callback) in the SAME change — not merely noted in a plan's §10.
- **Rule 9a (owner 2026-10-08, `WORKING-RULES.md` §1):** OWN THE CODE YOU TOUCH. Once you touch a piece
  you own the **entirety** — fix it directly or schedule it. Never leave a defect standing as
  "pre-existing, not mine". **Rule 9b:** challenge the task before executing it — *"work with knowledge,
  vision and awareness, not in a blind robotic way."*
- **Rule 10d:** never stack work on an unfinished foundation. **Rule 11:** the owner decides *what* to
  build; the agent recommends. **Rule 13:** re-measure premises before acting on them.

### Working hazards
- **Markdown formatter damage recurs:** Prettier-style reflow adds trailing 2-space hard-breaks and can
  revert committed content. Before committing a doc: compare `git diff --shortstat` vs `git diff -w
  --shortstat`; a big gap = reflow, and a stale-copy class actually **reverts committed content** →
  `git checkout -- <file>` to HEAD and re-apply only the intended edits.
- **Node 24 required:** `export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"`
  (v24.19.0). The `analysis/d2-gap/measure.js` tool lives in the **docs repo root**.
- **Jest rootDir quirk:** run from the package dir (`cd packages/<pkg> && npx jest --config
  jest.config.cjs <pattern>`); from the repo root it fails `error TS5011`. Do NOT override `--rootDir`.
- **ENCODING TRAP:** a Python `open(p,'w')` text-write on Windows flips LF→CRLF and changes the md5, so a
  "byte-identical" restore silently isn't. **Write bytes** (`open(p,'wb').write(s.encode())`) or
  `newline="\n"`, and **md5-compare every restore**. Check with
  `python -c "print(open(p,'rb').read().count(b'\r\n'))"` (expect 0 for the LF docs). The `Edit` tool
  also flipped BACKLOG.md LF→CRLF once — always re-verify.
  **Line endings are NOT uniform:** `JOURNAL.md`, `BUILD-ORDER.md`, `BACKLOG.md`, `platform_points.md`,
  `AGENT-HALF.md` are **LF-0**; **`COMPLETION-CALLBACKS.md` and `SPECIFICATIONS-DICTIONARY.md` are CRLF**.
  `grep` the CRLF count *before* editing.
- **NEVER edit a file at a line number taken from a DIFFERENT tool.** `grep -n` and Python disagree on
  line numbers in a CRLF file (cost me 32 lines of the register once). Rules: (1) locate the target **by
  content in the same pass that writes** (`if ln.startswith('| **CC-25** |')`, assert exactly one match);
  (2) work in the file's own line-ending domain (`split('\r\n')`/`join('\r\n')`); (3) assert invariants
  in the same pass (row count + CRLF count); (4) a one-row change MUST show `1 insertion(+), 1
  deletion(-)` — more is collateral damage.
- **Register row shape = 5 CONTENT cells** = 7 parts split on `|`: `| ID | Gap | Prerequisite | Trigger
  ↔ checked at | Callback |`. The BAD-COLUMNS check counts only ` | ` (space-pipe-space) ≥ 4 — do NOT
  use raw `awk -F'|'` (escaped `\|` inflates it). Reconciliation reads **cell 3 (Gap)** for `✅`.
- **`perl` is NOT available.** Use Python or Node for scripted edits.
- **Sandbox `rmSync` shim / host interception** — `dynamicLoader.tsconfig.test.ts` fails **8/8 under the
  full `shared` suite** but **passes 8/8 in isolation**, at byte-identical HEAD. Two observations of the
  same *class* of host-level failure: (2026-10-08, documented) `spawnSync … EBUSY`; (2026-10-09, mine) the
  WorkBuddy sandbox's **safe-delete shim** (in `…/WorkBuddyAI/resources/app.asar.unpacked/cli/vendor/shim/`)
  intercepting `fs.rmSync` → `SAFE_DELETE_BULK_CONFIRM_REQUIRED`. **Either way it is environmental, NOT a
  code defect** (CC-19; trigger = a CI run). Prove pre-existing by excluding that one suite and re-running
  (`--testPathIgnorePatterns "dynamicLoader.tsconfig.test.ts"` → 204/204 suites, 2515/2515 tests pass).
- **Hostile-critic pass earns its keep every time** — on `G-22` Slice 2A (round 1) it found **two real
  defects**: a gate returning `null`/`0`/`NaN` was read as ALLOW (silent allow), and an empty-string gate
  reason produced `reason:''`. Both fixed (fail-closed: only explicit `true` allows; `reason || fallback`)
  and re-verified by round 2. Run it as a SEPARATE agent before declaring anything done; demand a
  command+output for every claim.

## The `state-machine` primitive (`G-22` Slice 2A — BUILT 2026-10-09)
- **`packages/shared/src/lib/state-machine/`** = `types.ts` (declaration) · `machine.ts` (enforcement) ·
  `index.ts` (barrel) · `__tests__/machine.test.ts`. **26 tests GREEN, `tsc` 0, 8 md5-verified mutations.**
- **API:** `compile(decl)` → `CompiledStateMachine` (`states: Set`, `byFrom: Map`); `attempt(m, from, to,
  actor, context)` → allow `{ok:true,from,to,events}` | refusal `{ok:false,kind,from,to,reason}` with
  `kind ∈ 'not-a-declared-transition'|'permission'|'precondition'`; also `canTransition`, `findTransition`,
  `initialState`, `declaredEvents`. Enforcement order: **existence → permission → precondition → allow**.
- **The permission/precondition gates are DELEGATED caller functions** — the engine imports NO authority
  layer (keeps S5 "one permission engine"; a caller supplies the check). Gate reading is **fail-closed**:
  only an explicit `true` allows; a gate returning `undefined`/`null`/`0`/`''`/`NaN`/`false` refuses; an
  **absent** gate (field omitted) allows. `emit` is **advisory, never enforced** (documented honestly).
- **`G-22` stays `🟡`** — Slice 2B (the first caller) + 2C are unbuilt → **`CC-42`**. **The first caller's
  real shape:** the `customers` deal pipeline has **no allowed-transition table** — stages are DATA
  (`CustomerPipelineStage` rows, `data/entities.ts:958`) and moves are *journalled* (`CustomerDealStageTransition`,
  `:393` = an audit table). So the baseline is **"any stage → any stage allowed"**; 2B must decide
  **preserve vs narrow** (rule 9b — a narrowing is a behaviour change). Paths: `commands/deals.ts` create
  (`~:420-480`) + update (`~:630-745`) via `upsertDealStageTransition` (`:164`); guard = `useDealPipeline.ts`.
  Existing baseline tests: `deals.stage-transitions.test.ts` (**3 `it(`**) + the closure-guard suite.

## Kernel facts (learned building `G-01`, `AH-1`)
- **The kernel admits objects through exactly TWO channels:** `customEntities` and
  `entityExtensions`/`customFieldSets` — there is **no separate "platform entity" list**. A module-root
  `ce.ts` fills **both** (the generator splits it, `module-registry.ts:3166`/`:3139`). `model.entities` is
  a **`Record<string, KernelEntity>` keyed by canonical id** (`model.entities['agent']`, not `.find`).
- **Core-object vocabulary is TWO distinct sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS`
  = kinds a tier can be assigned to (`table/column/relation/function/role/agent`); `CORE_OBJECT_KINDS` =
  the **row-level** kinds whose rows carry a delete/rename refusal (`role/agent`). Do not conflate them.
- **`G-01`** built the kernel descriptor **engine** (`buildModelDescriptor`/`collectDeclarations`), NOT
  any domain object — `shared/src/lib/kernel/model.ts` exports no `Agent`.
- **`AH-1`** — the `Agent` kernel object. **BUILT 2026-10-09 (slices 1+2, `1a518f8`/`acfd020`)** via a
  module-root `ce.ts` (`ai_assistant/ce.ts`); `agent` admitted as both a `CORE_SETTING_KINDS` and a
  `CORE_OBJECT_KINDS` kind (per-object `core` mark, refused on delete/rename). The `reportsTo` edge +
  relation-typed `owner`/`role`/`actsAs` were deferred → **`CC-40`**; `runtime`/`autonomy` enforcement is
  `L-01`/`AH-5` + `AH-2`. Core-object status leg RESOLVED & BUILT
  (`DECISION-agent-protection-tier.md`). All 4 slices done, **`CC-40` closed**.

## The deploy path (`companai.corprorate.com`) — measured 2026-10-09
- **VM** `platform-server` (Ubuntu 24.04.5), static `172.28.50.2`, user `ramzi`, key `vms/id_ed25519`;
  reachable only from this laptop. App = Docker Compose project `companai-platform` in
  `/opt/companai-platform` (`docker-compose.fullapp.yml` + `docker-compose.wan.yml`), container
  `companai-platform-app-1`, image `open-mercato/app:wan`. Source (plain file copy, NOT a git checkout) =
  `/home/ramzi/build-src`.
- **To deploy:** stream source into `/home/ramzi/build-src`, then `cd /opt/companai-platform &&
  ./update.sh /home/ramzi/build-src`. Take a DB export first (`pg_dump` inside `mercato-postgres-wan`, db
  `open-mercato`; no backup button). Verify with `./verify.sh https://companai.corprorate.com`.
- **`update.sh`'s build context is the SOURCE tree, not the deploy dir.** Original built from the deploy
  dir (`context: .`) which holds no source → context was **2 bytes** → died on
  `COPY docker/scripts/mcp-entrypoint.sh: not found`. Fixed to
  `docker build -t "$IMAGE" -f "$SRC/Dockerfile" "$SRC"`. **"transferring context: 2B" is the tell.**
  `update.sh` destroys its own rollback → **`CC-41`** (tag outgoing image `:wan-<date>`); 🟡 fixed,
  awaiting next-run proof. A failed build does NOT break the site (old image stays up until step 4).
- **Login route parses form-encoded/formData ONLY** (`core/src/modules/auth/api/login.ts`,
  `parseLoginForm`). A **JSON** body → empty email → 400 "Invalid email or password" (looks like bad
  creds; it's a format failure). Use `curl --data-urlencode email=… --data-urlencode password=…`.
- **`users.email` is encrypted at rest; `email_hash` is the lookup** =
  `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))` (`shared/src/lib/encryption/aes.ts`), pepper =
  `LOOKUP_HASH_PEPPER` ?? `TENANT_DATA_ENCRYPTION_FALLBACK_KEY` ?? `TENANT_DATA_ENCRYPTION_KEY`. Hash
  candidates & bcrypt-compare passwords **inside the container**. Three live accounts: superadmin
  `admin@companai.local` / `wM8ciC9i8OBIM30KLlh2`; admin `admin@acme.com` / `secret`; employee
  `employee@acme.com` / `secret`. (`.env` `OM_INIT_SUPERADMIN_PASSWORD` is **stale**.)
- **Repo has `core.autocrlf=true`** — worktree shows CRLF, the **committed blob is LF-0**. Judge line
  endings from the blob (`git show HEAD:file`), not the worktree.

## Live frontier (2026-10-09)
- **`G-22`** = the generic state-machine engine (BUILD-ORDER §3 item 9) — the current ▶ FRONTIER.
  Plan: `library/development/SUB-IMPLEMENTATION-PLAN-CC40-and-G-22.md`. **Slice 2A (the engine) BUILT
  2026-10-09** (see the section above). **Slice 2B (the first caller) + 2C remain → `CC-42`.**
- **NEXT after `G-22`:** `CC-27` (AI-user ↔ agent binding row), then `CC-41` (deploy rollback tag).
- **Progress view** (derived, `platform_points.md` PROGRESS AT A GLANCE): coverage 61/258/319 = 19%,
  build-weighted ≈ 22%, ± 4. Method documented in §L `derive-counts`. **Unchanged by 2A** (a `🟡` partial
  scores its fraction; the section is re-derived from the boxes each session).
