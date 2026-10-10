# Project memory — Companai / open-mercato (curated, durable)

## How we work — the owner's standing 6-step protocol
1. **Pick the next task** from `BUILD-ORDER.md` order. The live task is stated ONLY in the
   `★ ACTIVE TASK` box at the top of `JOURNAL.md` (docs repo root).
2. **Pick all relevant points** in `library/development/platform_points.md` (master point list).
3. **Requirement = the task definition + those platform_points, combined.** Write it down before code.
4. **Fact-check the code FIRST** (rule 0b): (a) what is actually there; (b) which prerequisites must be
   fully done first; (c) what the planned change can impact. **Never build before measuring.**
5. **Then** plan, execute, and run the standard protocols — hostile-critic pass (**SEPARATE** agent),
   RED-then-GREEN mutation proof (md5-verified restore), re-measure — and decide honestly.
6. **Only when done fully, flawlessly, honestly**: update ALL relevant docs in the SAME change —
   `BACKLOG.md`, `platform_points.md`, `BUILD-ORDER.md`, `JOURNAL.md`, `COMPLETION-CALLBACKS.md`.

### Standing rules (binding)
- **Two sources of truth:** `BACKLOG.md` (live status) + `BUILD-ORDER.md` (order).
- **Every claim carries an observation.** Docs are not evidence; only the code is (Rule 0).
- **Never `git add -A`.** Commit in both repos (docs `C:/Users/Ramzi/Downloads/companai`; code
  `C:/Users/Ramzi/Downloads/companai/workspace/starting-kit`).
- Handover docs carry **no "what is next"**; the live task lives only in the `★ ACTIVE TASK` box.
- **Rule 8:** every partial build is scheduled in `COMPLETION-CALLBACKS.md` (gap + prerequisite +
  callback) in the SAME change — not merely noted in a plan's §10.
- **Rule 9a** OWN the code you touch — fix it or schedule it; never "pre-existing, not mine".
  **Rule 9b** challenge the task before executing — work with vision, not blindly.
- **Rule 10d** never stack on an unfinished foundation. **Rule 11** the owner decides *what* to build.
  **Rule 13** re-measure premises before acting on them. **Rule 14b** migrations are provable.

## Section map — where each kind of knowledge lives
- `library/development/platform_points.md` — master point list (ONE NUMBER + §A–§L appendix, ID-keyed).
- `library/development/{BACKLOG,BUILD-ORDER,COMPLETION-CALLBACKS,WORKING-RULES,AGENT-HALF}.md`.
- The **▶ FRONTIER** box (platform_points top + BACKLOG top) states NOW/NEXT; platform_points is authoritative.
- `JOURNAL.md` (docs root) — the live task box + done blocks ("how did we get here").
- Daily logs in `.workbuddy-ai/memory/YYYY-MM-DD.md` — per-session detail.

## Working hazards (learn from every one)
- **Line endings are NOT uniform:** `JOURNAL.md`, `BUILD-ORDER.md`, `BACKLOG.md`, `platform_points.md`,
  `AGENT-HALF.md` are **LF-0**; **`COMPLETION-CALLBACKS.md` and `SPECIFICATIONS-DICTIONARY.md` are CRLF.**
  `grep` the CRLF count *before* editing. Repo has `core.autocrlf=true` → the **committed blob is LF-0**;
  judge line endings from `git show HEAD:file`, not the worktree.
- **ENCODING TRAP:** Python `open(p,'w')` flips LF→CRLF and changes md5. **Write bytes**
  (`open(p,'wb').write(s.encode())`); **md5-compare every mutation restore**; check with
  `python -c "print(open(p,'rb').read().count(b'\r\n'))"`.
- **NEVER edit a file at a line number from a DIFFERENT tool** (`grep -n` vs Python disagree on CRLF files).
  Locate by CONTENT in the same pass that writes; assert exactly one match + invariants (row count, CRLF
  count) in that pass; a one-row change MUST show `1 insertion(+), 1 deletion(-)`.
- **Markdown formatter damage recurs:** before committing a doc compare `git diff --shortstat` vs
  `git diff -w --shortstat`; a gap = reflow → `git checkout -- <file>` and re-apply only intended edits.
- **Register row shape = 5 CONTENT cells** = 7 parts split on `|`:
  `| ID | Gap | Prerequisite | Trigger ↔ checked at | Callback |`. BAD-COLUMNS counts only ` | ` ≥ 4 (not
  raw `awk -F'|'` — escaped `\|` inflates it). Reconciliation reads **cell 3 (Gap)** for `✅`.
- **Node 24 required:** `export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"`.
  **Jest rootDir quirk:** run from the package dir (`cd packages/<pkg> && npx jest --config jest.config.cjs
  <pattern>`); from the repo root it fails `error TS5011`. Do NOT override `--rootDir`.
- **`perl` is NOT available.** Use Python or Node for scripted edits.
- **Sandbox `rmSync` shim** (`dynamicLoader.tsconfig.test.ts`) fails 8/8 under the full `shared` suite but
  passes 8/8 in isolation at byte-identical HEAD — **environmental, NOT a code defect** (`CC-19`; trigger =
  a CI run). Prove pre-existing by excluding that suite.
- **Hostile-critic earns its keep every time.** Run it as a SEPARATE agent; demand a command+output per claim.

## Durable code facts
- **Kernel admits objects through exactly TWO channels:** `customEntities` and
  `entityExtensions`/`customFieldSets` — no separate "platform entity" list. A module-root `ce.ts` fills
  both (`module-registry.ts` splits it). `model.entities` = `Record<string, KernelEntity>` keyed by
  canonical id (`model.entities['agent']`, not `.find`).
- **Core-object vocabulary = TWO sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS` = tiers a
  kind can be assigned to (`table/column/relation/function/role/agent`); `CORE_OBJECT_KINDS` = row-level
  kinds whose rows carry delete/rename refusal (`role/agent`). Do not conflate.
- **`G-01`** built the kernel descriptor **engine** (`buildModelDescriptor`), NOT any domain object.
  **`AH-1`** (the `Agent` kernel object) is BUILT (4 slices; `CC-40` closed); `agent` is both a
  CORE_SETTING_KIND and a CORE_OBJECT_KIND.
- **Two independent write-path protections:** the **feature gate** (`metadata.requireFeatures` →
  `checkAuthorization`, `apps/mercato/src/app/api/[...slug]/route.ts:150`, enforced only `if
  (requiredFeatures.length)` at `:207`) answers *"may this actor do this?"*; the **guard registry**
  (`runRouteMutationGuards` / `makeCrudRoute`) answers *"is this write structurally permitted?"*. The gate
  is **OPT-IN, not default-deny** → `CC-44` (owner's policy call). `analysis/permission-gate/measure.js`
  (`--check` gate) is the going-forward instrument.
- **The permission catalogue** (`shared/src/lib/permissions/catalogue.ts`) is a process-global `Map`;
  **declared** surfaces global, **recorded** per-tenant → a naive read leaks A into B; the reader must
  answer from **declared + exactly this tenant's rows** (`readTenantSurfaces`). Tenant-aware hook is the
  **request** (boot has no tenant): `getAuthFromRequest(req)` → `tenantId`; `createRequestContainer()` →
  `resolve('em')`. Model: `auth/api/structural-permissions/route.ts`.
- **MikroORM soft-delete:** `{ filters: { softDelete: false } }` is **inert**; write `deletedAt: null`.
- **Enabled-module set** = `apps/mercato/src/modules.ts` (`enabledModules`); parked modules are
  commented-out and their tests excluded by `parkedModuleTestPatterns()`. **`sales` is parked.**
- **Data classification (row 14, measured 2026-10-10):** a field is marked sensitive by a
  `ModuleEncryptionMap` (`shared/src/modules/encryption.ts`, `{entityId, fields:[{field, hashField?}]}`);
  **15 modules** declare `defaultEncryptionMaps`, persisted to the `encryption_maps` table, seeded at setup
  + CLI. A MikroORM subscriber encrypts at rest / decrypts on read under a per-tenant DEK
  (`TenantDataEncryptionService`, **on by default**), read back at ~1777 non-test sites. Manage screen =
  `entities/components/EncryptionManager.tsx` + `entities/api/encryption.ts` (guarded, optimistic-locked).
  **NO export path consults the map** (`shared/src/lib/crud/exporters.ts` is classification-agnostic) →
  `CC-45` (the `never exported by accident` leg). The logger redact list
  (`shared/src/lib/logger/transport.server.ts:5`) is a **fixed name list**, not classification-driven.
  **`G-05`:** the kernel `classification?` field (`kernel/model.ts:61`, spec §12.2) is **declared but
  unset by any module** — the "declared, no consumer" pattern; buildable when a consumer reads it.

## The deploy path (`companai.corprorate.com`) — measured 2026-10-09
- **VM** `platform-server` (Ubuntu 24.04.5), static `172.28.50.2`, user `ramzi`, key `vms/id_ed25519`;
  reachable only from this laptop. App = Docker Compose project `companai-platform` in
  `/opt/companai-platform`, container `companai-platform-app-1`, image `open-mercato/app:wan`. Source (a
  plain file copy, NOT a git checkout) = `/home/ramzi/build-src`.
- **To deploy:** stream source into `/home/ramzi/build-src`, then `cd /opt/companai-platform &&
  ./update.sh /home/ramzi/build-src`. Take a DB export first (`pg_dump` in `mercato-postgres-wan`, db
  `open-mercato`). Verify with `./verify.sh https://companai.corprorate.com`.
- **`update.sh` build context is the SOURCE tree** (`docker build … "$SRC"`); **"transferring context: 2B"
  is the tell** if it breaks. `update.sh` destroys its own rollback → **`CC-41`** (tag outgoing
  `:wan-<date>`; fix shipped, awaiting next-run proof). A failed build does NOT break the site.
- **Login route parses form-encoded/formData ONLY** (`auth/api/login.ts`, `parseLoginForm`). A **JSON**
  body → 400 "Invalid email or password". Use `curl --data-urlencode email=… --data-urlencode password=…`.
- **`users.email` encrypted at rest; `email_hash` is the lookup** =
  `"v2:"+HMAC_SHA256(pepper, lower(trim(email)))` (`shared/src/lib/encryption/aes.ts`); pepper =
  `LOOKUP_HASH_PEPPER` ?? `TENANT_DATA_ENCRYPTION_FALLBACK_KEY` ?? `TENANT_DATA_ENCRYPTION_KEY`. Live
  accounts: superadmin `admin@companai.local` / `wM8ciC9i8OBIM30KLlh2`; admin `admin@acme.com` /
  `secret`; employee `employee@acme.com` / `secret` (`.env` `OM_INIT_SUPERADMIN_PASSWORD` is **stale**).

## Live frontier (2026-10-10) — read `JOURNAL.md`'s `★ ACTIVE TASK` for the truth
- **Rows 7, 8, 9, 13, 14** are ✅ and committed (docs `6ccfe86`/`19e05b5`/`b191d59`/`ea5c893`/`cbbcbe9`;
  code `168f9e09`/`53ed2e7b`). **PHASE 3 COMPLETE.**
- **Progress (derived from the boxes, `derive-counts` §L): 71 / 330 = 22%** (weighted ≈23%).
- **NEXT:** row 15 (`P10`, read-layer filtering) **and/or** `CC-45` (the row-14 export leg) — re-measure
  before building (rule 0b). Behind these: `CC-42` (`G-22` Slice 2B, business) and `CC-27` (AI-user ↔
  agent binding).
