# Project memory — Companai / open-mercato (curated, durable)

## How we work — the owner's standing 6-step protocol
1. **Pick the next task** from `BUILD-ORDER.md` order. The live task is stated ONLY in the
   `★ ACTIVE TASK` box at the top of `JOURNAL.md` (docs repo root).
2. **Pick all relevant points** in `library/development/platform_points.md` (master point list).
3. **Requirement = the task definition + those platform_points, combined.** Write it down before code.
4. **Fact-check the code**: (a) what is actually there; (b) which prerequisites must be fully done &
   functional first; (c) which code the planned change can impact.
5. **Then** plan, execute, run the standard protocols — hostile-critic pass (SEPARATE agent),
   RED-then-GREEN mutation proof (md5-verified restore), re-measure — and decide honestly.
6. **Only when done fully, flawlessly, honestly**: update ALL relevant docs — `BACKLOG.md`,
   `platform_points.md`, `BUILD-ORDER.md`, `JOURNAL.md` `▶ NOW`, `COMPLETION-CALLBACKS.md`.

### Standing rules
- **Two sources of truth:** `BACKLOG.md` (live status) + `BUILD-ORDER.md` (order).
- **"A module is done" must be re-measured, never assumed from its tag.**
- **Every claim carries an observation.** Docs are not evidence; only the code is (platform_points Rule 0).
- **Never `git add -A`.** Commit in both repos (docs `C:/Users/Ramzi/Downloads/companai`; code
  `C:/Users/Ramzi/Downloads/companai/workspace/starting-kit`).
- Handover docs carry **no "what is next"**; the live task lives only in the `★ ACTIVE TASK` box.
- **Rule 8:** every partial build is scheduled in `COMPLETION-CALLBACKS.md` (gap + prerequisite +
  callback) in the SAME change — not merely noted in a plan's §10.
- **Rule 9a (owner 2026-10-08):** OWN THE CODE YOU TOUCH — once you touch a piece you own the
  **entirety**: fix it directly or schedule it. Never say "pre-existing, not mine". **Rule 9b:** challenge
  the task before executing — *"work with knowledge, vision and awareness, not in a blind robotic way."*
- **Rule 10d:** never stack work on an unfinished foundation. **Rule 11:** the owner decides *what* to
  build; the agent recommends. **Rule 13:** re-measure premises before acting on them. **Rule 14b:**
  migrations are provable — apply them and measure back.

### Working hazards
- **Markdown formatter damage recurs:** Prettier-style reflow adds trailing 2-space hard-breaks and can
  revert committed content. Before committing a doc: compare `git diff --shortstat` vs `git diff -w
  --shortstat`; a big gap = reflow → `git checkout -- <file>` to HEAD and re-apply only intended edits.
- **Node 24 required:** `export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"`.
- **Jest rootDir quirk:** run from the package dir (`cd packages/<pkg> && npx jest --config
  jest.config.cjs <pattern>`); from the repo root it fails `error TS5011`. Do NOT override `--rootDir`.
- **ENCODING TRAP:** Python `open(p,'w')` text-write on Windows flips LF→CRLF and changes md5. **Write
  bytes** (`open(p,'wb').write(s.encode())`) or `newline="\n"`, and **md5-compare every restore**.
  Check with `python -c "print(open(p,'rb').read().count(b'\r\n'))"`.
  **Line endings NOT uniform:** `JOURNAL.md`, `BUILD-ORDER.md`, `BACKLOG.md`, `platform_points.md`,
  `AGENT-HALF.md` are **LF-0**; **`COMPLETION-CALLBACKS.md` and `SPECIFICATIONS-DICTIONARY.md` are CRLF**.
  `grep` the CRLF count *before* editing.
- **NEVER edit a file at a line number taken from a DIFFERENT tool.** `grep -n` and Python disagree on
  line numbers in a CRLF file. Rules: (1) locate the target **by content in the same pass that writes**
  (`if ln.startswith('| **CC-25** |')`, assert exactly one match); (2) work in the file's own line-ending
  domain (`split('\r\n')`/`join('\r\n')`); (3) assert invariants in the same pass (row count + CRLF
  count); (4) a one-row change MUST show `1 insertion(+), 1 deletion(-)`.
- **Register row shape = 5 CONTENT cells** = 7 parts split on `|`: `| ID | Gap | Prerequisite | Trigger
  ↔ checked at | Callback |`. BAD-COLUMNS counts only ` | ` (space-pipe-space) ≥ 4 — do NOT use raw
  `awk -F'|'`. Reconciliation reads **cell 3 (Gap)** for `✅`.
- **`perl` is NOT available.** Use Python or Node for scripted edits.
- **Sandbox `rmSync` shim / host interception** — `dynamicLoader.tsconfig.test.ts` fails **8/8 under the
  full `shared` suite** but passes 8/8 in isolation at byte-identical HEAD. WorkBuddy's safe-delete shim
  (`resources/app.asar.unpacked/cli/vendor/shim/`) intercepts `fs.rmSync` →
  `SAFE_DELETE_BULK_CONFIRM_REQUIRED`. **Environmental, NOT a code defect** (`CC-19`; trigger = a CI run).
  Prove pre-existing by excluding that suite (`--testPathIgnorePatterns "dynamicLoader.tsconfig.test.ts"`).
- **Hostile-critic pass earns its keep every time.** On `G-22` Slice 2A it found two real defects: a gate
  returning `null`/`0`/`NaN` read as ALLOW, and an empty-string gate reason. Both fixed (fail-closed: only
  explicit `true` allows; `reason || fallback`). Run as a SEPARATE agent; demand a command+output per claim.

## Row status / live frontier (2026-10-09)
- **Row 9** (`P3b`/`M3e` — the permission catalogue is **stored** and read back) — **CLOSED** (docs
  `b191d59`, code `168f9e09`). Read half = `readTenantSurfaces(em, tenantId)` +
  `GET /api/auth/permission-surfaces` (fail-soft, `requireFeatures: ['auth.acl.manage']`); tenant-scoped
  (declared wins; never leaks another tenant's recorded surfaces). `CC-43` closed.
- **Row 7** (`P3` — roles & permissions **enforced** on every write) — **CLOSED** (docs `6ccfe86`, code
  repo unchanged). Measured by `analysis/permission-gate/measure.js`: **169 write route files / 158
  feature-gated / 5 guard-only / 6 NEITHER (all six by design) / 0 unexplained**. `--check` gate proved by
  mutation. `P3a`'s false "two-table ACL" premise corrected → `roles` + `role_acls` + `user_acls` +
  `user_roles` join.
- **Row 8** (`SD-1`/`S2` — the platform **forces the permission question** on new table/column) — the
  current row. Re-measured 2026-10-09: `CC-25` **DONE** (code `d61d4f6`) → `S2f` is stale; `CC-23` **open
  & buildable** (no unique index on `role_acls (role_id, tenant_id)`; its "unprovable on this host" premise
  retracted); `CC-20` genuinely blocked on `G-04`.
- **`G-22`** = the generic state-machine engine. **Slice 2A (the engine) BUILT 2026-10-09** (`17806b7d`);
  **Slice 2B (first caller) + 2C remain → `CC-42`**. Plan:
  `library/development/SUB-IMPLEMENTATION-PLAN-CC40-and-G-22.md`.
- **Progress view** (derived, `platform_points.md` PROGRESS AT A GLANCE): coverage 64/319, build-weighted
  ≈ 22%, ± 4. Method in §L `derive-counts`. Re-derived from the boxes each session.

## The `state-machine` primitive (`G-22` Slice 2A — BUILT 2026-10-09)
- **`packages/shared/src/lib/state-machine/`** = `types.ts` · `machine.ts` · `index.ts` ·
  `__tests__/machine.test.ts`. **26 tests GREEN, `tsc` 0, 8 md5-verified mutations.**
- **API:** `compile(decl)` → `CompiledStateMachine` (`states: Set`, `byFrom: Map`); `attempt(m, from, to,
  actor, context)` → allow `{ok:true,from,to,events}` | refusal `{ok:false,kind,from,to,reason}` with
  `kind ∈ 'not-a-declared-transition'|'permission'|'precondition'`; also `canTransition`, `findTransition`,
  `initialState`, `declaredEvents`. Enforcement order: **existence → permission → precondition → allow**.
- **The permission/precondition gates are DELEGATED caller functions** — the engine imports NO authority
  layer (keeps S5 "one permission engine"; a caller supplies the check). Gate reading is **fail-closed**:
  only explicit `true` allows; `undefined`/`null`/`0`/`''`/`NaN`/`false` refuses; an **absent** gate
  (field omitted) allows. `emit` is **advisory, never enforced**.
- **`G-22` stays `🟡`** — Slice 2B (the first caller) + 2C are unbuilt → **`CC-42`**. **The first caller's
  real shape:** the `customers` deal pipeline has **no allowed-transition table** — stages are DATA
  (`CustomerPipelineStage` rows, `data/entities.ts:958`) and moves are *journalled*
  (`CustomerDealStageTransition`, `:393` = an audit table). Baseline = **"any stage → any stage allowed"**;
  2B must decide **preserve vs narrow** (rule 9b — a narrowing is a behaviour change). Paths:
  `commands/deals.ts` create (`~:420-480`) + update (`~:630-745`) via `upsertDealStageTransition` (`:164`);
  guard = `useDealPipeline.ts`. Existing tests: `deals.stage-transitions.test.ts` (**3 `it(`**) + closure guard.

## Kernel facts (learned building `G-01`, `AH-1`)
- **The kernel admits objects through exactly TWO channels:** `customEntities` and
  `entityExtensions`/`customFieldSets` — there is **no separate "platform entity" list**. A module-root
  `ce.ts` fills **both** (the generator splits it, `module-registry.ts:3166`/`:3139`). `model.entities` is
  a **`Record<string, KernelEntity>` keyed by canonical id** (`model.entities['agent']`, not `.find`).
- **Core-object vocabulary is TWO distinct sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS`
  = kinds a tier can be assigned to (`table/column/relation/function/role/agent`); `CORE_OBJECT_KINDS` =
  the **row-level** kinds whose rows carry a delete/rename refusal (`role/agent`). Do not conflate.
- **`G-01`** built the kernel descriptor **engine** (`buildModelDescriptor`/`collectDeclarations`), NOT
  any domain object — `shared/src/lib/kernel/model.ts` exports no `Agent`.
- **`AH-1`** — the `Agent` kernel object. **BUILT 2026-10-09 (4 slices, `1a518f8`/`acfd020`/`48cc04ad`/
  `b5a33c76`)** via a module-root `ce.ts` (`ai_assistant/ce.ts`); `agent` admitted as both a
  `CORE_SETTING_KINDS` and a `CORE_OBJECT_KINDS` kind (per-object `core` mark, refused on delete/rename).
  All slices done, **`CC-40` closed**. Core-object status leg RESOLVED (`DECISION-agent-protection-tier.md`).

## Permission catalogue (row 9 facts — durable)
- **The catalogue is a process-global `Map`** (`shared/src/lib/permissions/catalogue.ts`). **Declared**
  surfaces are global; **recorded** surfaces are **per-tenant** — so a naive `listPermissionSurfaces()`
  read leaks tenant A's recorded surfaces into tenant B's answer. The reader must answer from **declared +
  exactly this tenant's rows** (`readTenantSurfaces` does this; declared wins on id collision).
- **The tenant-aware hook is the request, not boot.** `apps/mercato/src/bootstrap.ts` is synchronous with
  no tenant; `instrumentation.ts:register()` is a no-op. A route is the first point where `auth.tenantId`
  **and** an `EntityManager` both exist. Pattern: `getAuthFromRequest(req)` → `auth.tenantId`;
  `createRequestContainer()` → `container.resolve('em') as EntityManager`. Model:
  `auth/api/structural-permissions/route.ts`.
- **Two independent write-path protection mechanisms:** the **feature gate** (`metadata.requireFeatures` →
  `checkAuthorization` at `apps/mercato/src/app/api/[...slug]/route.ts:150`, enforced only `if
  (requiredFeatures.length)` at `:207`) answers *"may this actor do this?"*; the **guard registry**
  (`runRouteMutationGuards` / `makeCrudRoute`) answers *"is this write structurally permitted?"* — D2-gap's
  0-unguarded number says **nothing** about the feature gate.
- **The feature gate is OPT-IN, not default-deny** — tested (`api-authorization.test.ts`: *"should allow
  any authenticated user when only deprecated requireRoles is set (no feature gate)"*). A default-deny is
  a new policy needing an allowlist → **`CC-44`** (owner's call).
- **MikroORM soft-delete:** `{ filters: { softDelete: false } }` is **inert**; write the live-row
  predicate out (`deletedAt: null`).
- **The enabled-module set** is read from `apps/mercato/src/modules.ts` (`enabledModules` array literal);
  parked modules appear as commented-out `// { id: '...' }` and their tests are excluded by
  `parkedModuleTestPatterns()` (`packages/core/jest.config.cjs`). `sales` is **parked**.

## The deploy path (`companai.corprorate.com`) — measured 2026-10-09
- **VM** `platform-server` (Ubuntu 24.04.5), static `172.28.50.2`, user `ramzi`, key `vms/id_ed25519`;
  reachable only from this laptop. App = Docker Compose project `companai-platform` in
  `/opt/companai-platform` (`docker-compose.fullapp.yml` + `docker-compose.wan.yml`), container
  `companai-platform-app-1`, image `open-mercato/app:wan`. Source (plain file copy, NOT a git checkout) =
  `/home/ramzi/build-src`.
- **To deploy:** stream source into `/home/ramzi/build-src`, then `cd /opt/companai-platform &&
  ./update.sh /home/ramzi/build-src`. Take a DB export first (`pg_dump` inside `mercato-postgres-wan`, db
  `open-mercato`). Verify with `./verify.sh https://companai.corprorate.com`.
- **`update.sh`'s build context is the SOURCE tree, not the deploy dir.** Fixed to
  `docker build -t "$IMAGE" -f "$SRC/Dockerfile" "$SRC"`. **"transferring context: 2B" is the tell.**
  `update.sh` destroys its own rollback → **`CC-41`** (tag outgoing image `:wan-<date>`); 🟡 fixed, awaiting
  next-run proof. A failed build does NOT break the site (old image stays up until step 4).
- **Login route parses form-encoded/formData ONLY** (`core/src/modules/auth/api/login.ts`, `parseLoginForm`).
  A **JSON** body → empty email → 400 "Invalid email or password" (looks like bad creds; it's format).
  Use `curl --data-urlencode email=… --data-urlencode password=…`.
- **`users.email` is encrypted at rest; `email_hash` is the lookup** =
  `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))` (`shared/src/lib/encryption/aes.ts`), pepper =
  `LOOKUP_HASH_PEPPER` ?? `TENANT_DATA_ENCRYPTION_FALLBACK_KEY` ?? `TENANT_DATA_ENCRYPTION_KEY`. Three
  live accounts: superadmin `admin@companai.local` / `wM8ciC9i8OBIM30KLlh2`; admin `admin@acme.com` /
  `secret`; employee `employee@acme.com` / `secret`. (`.env` `OM_INIT_SUPERADMIN_PASSWORD` is **stale**.)
- **Repo has `core.autocrlf=true`** — worktree shows CRLF, the **committed blob is LF-0**. Judge line
  endings from the blob (`git show HEAD:file`), not the worktree.
