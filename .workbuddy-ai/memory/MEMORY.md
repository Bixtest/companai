# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` + daily logs. New work: HERE + today's log.

## Protocol (short)
Next task ONLY from `JOURNAL.md`'s `★ ACTIVE TASK` (order = `BUILD-ORDER.md`). Requirement = task +
`platform_points.md` points, **written BEFORE any code**; **rule 0b — measure the code FIRST**. Then
plan → execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5 restore) → re-measure.
Only when flawless: ALL docs in the SAME change + commit. **Never `git add -A`** — explicit paths,
BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`; code `../workspace/starting-kit`).

## Standing rules (binding)
Two sources of truth: `BACKLOG.md` (status) + `BUILD-ORDER.md` (order); FRONTIER = `platform_points.md`'s
`▶ FRONTIER`; **only code is evidence**. SHARED-DOC CLOBBER HAZARD: the owner saves from a stale copy —
`git diff <path>` first, **commit immediately after every edit**; `owner_answers.md` read-only.
Rules 9a · 10d · 11 (owner decides *what*) · 13 (falsified premise → correct *everywhere*) · 15.
Reporting: no flag without a full report (named · plain meaning · why · risk · **ranked actions +
recommendation** · whether he must decide); **never end on "your call"**.

## Hazards
`tsc` needs **`--incremental false`** (L139); jest does NOT type-check (L138). Write bytes, not text
(Python `open(p,'w')` flips LF→CRLF + md5). Critic = SEPARATE agent, command+output per claim; a
structural scan must name the file classes it covers; **critic verdicts get measured too (L146)**.
**Node 24: `…/.toolchain/node24/node.exe`** (above `starting-kit`). `/tmp` differs between the Write
tool (`C:\tmp`) and bash (`%TEMP%`) — absolute paths in harnesses. **node→node spawn throws `EBUSY`
here** — drive children from BASH; prove a GREEN baseline before any RED (**L149**). A test reaching a
live service is not a unit test (**L150**).

## Live frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived (`.derive_platform_points.py`), never typed; split parents
  (`▸ n/N`) never count, 5+ spaces are annotations, §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — one typed door (`R28-5` proved it); `R28-6` (delete OpenCode)
  trigger-blocked → `CC-72`. Hermes pin = `HERMES-PIN.md`; `--check` → PIN HOLDS (L135/L136).
- **Hermes Phase 2: `P2-1`–`P2-6` ✅ (2026-10-13)** — but **PHASE 2's *stated* exit gate is NOT yet green**
  (**rule 13 correction**): §2.12 proved the five properties **through the port** (against a `FakeClient`),
  and **no live turn has ever been driven**. `P2-5` (§2.11) = engine SELECTABLE
  (`lib/resolve-ai-runtime-port.ts`, env `AI_RUNTIME_ENGINE`, default `opencode`;
  `provenance.implementation`; envelope NOT widened). **`P2-6` (§2.12)** = cancel · retry
  idempotency · usage (scope stated) · bounded mem/CPU · no cross-scope access, on ONE tenant then TWO
  adversarial. Built the two missing bounds in ONE shared file `lib/ai-runtime-bounds.ts`
  (`resolveRunDeadline` = sooner of `deadline` & `budget`-from-admission; `pruneRunRegistry` = evict
  finished, NEVER live), applied by BOTH chat adapters + the platform adapter; **`CC-76` FIXED** (OpenCode
  honours the time bound; its timer SETTLES the stream). Package **125/1752 green**; tsc **92 = `CC-73`,
  0 new**; **10 mutations RED**; critic **2 defects + 2 nits fixed** (D1 the bound must END the stream —
  **L151**; D2 a THIRD `AiRuntimePort` impl was unbounded — **L152**). **Default did NOT move.** Lessons
  **L144–L152**.
- **★ `P2-7` (§2.13) ✅ DONE 2026-10-14 — Hermes SERVED A LIVE TURN, twice, the second production-shaped**
  (the compose change alone). Compose now forwards `OPENAI_BASE_URL` + `HERMES_MODEL` (the worker's OWN
  mechanism — it ignores `OM_AI_*`) + `HERMES_LOCAL_STREAM_STALE_TIMEOUT: 2400` (measured prefill grace;
  the worker's 900 s default aborts every real turn on 4 CPUs). Landed: `scripts/hermes-live-turn.mts`
  (harness), `lib/hermes-live-turn-verdict.ts` (pure judgement) + 2 suites (19 tests), the wiring suite that
  PARSES the compose `environment:` mapping, `p2-7:live`. Package **127 suites / 1771 green** (under the
  PINNED Node 24 — **L154**); tsc **92 = `CC-73`, 0 new**; **7 mutations RED** md5-restored. Lessons
  **L153** (`progress =` is not the total: read `prompt eval time`) · **L154** (gates run on the pinned
  runtime — wrong node = different test SET) · **L155** (tee long-run evidence; task registries expire).
- **★ `P2-8` (§2.14.1) ✅ DONE 2026-10-14** — the production CONNECTION LIFECYCLE: the worker serves the
  pin's own **ws** door (`docker/hermes/ws_host.py` + `ws_entry.py` — **FastAPI/uvicorn**, NOT aiohttp: the
  image ships no aiohttp) and the client connects it through a transport **seam**
  (`lib/hermes-gateway-transport.ts`). A real turn was served over the door with **NO hand-spawned
  process**. Package **128 / 1838**; tsc 92; 18 mutations RED. **Default did NOT move.**
- **★ `P2-9a` (§2.15.1) ✅ DONE 2026-10-14 — THE MCP BRIDGE, exit gate met LIVE; `CC-79` DISCHARGED.**
  A Hermes turn **called a platform tool**: `tool_search` → `mcp__open_mercato__context_whoami` → the
  platform's own `context.whoami` result (real tenant/user, `isSuperAdmin: true`, 25 features);
  `PASS … on done (287 events) in 859.1s`. `DISCOVERED: 21`; toolset `open-mercato tools=21 mcp=21`.
  Code `e7915da4`: `docker/hermes/mcp_bootstrap.py` (writes through the pin's OWN `_save_mcp_server`;
  credential = **placeholder** `${MCP_SERVER_API_KEY}`), Dockerfile `--extra mcp`, entrypoint
  `resolve_mcp_key` + exports the key into the **worker's env** + bootstrap subprocess with **stdout
  suppressed**, compose MCP URL `http://mcp:3001/mcp` + `mcp_shared` ro/**external**. Wiring suite 53.
  **The two-read proof (L159):** `read_raw_config()` (as-written → placeholder AT REST) AND
  `load_config()` (env-expanded → runtime resolves it) — one read cannot tell a resolved placeholder
  from a leaked secret. **A separate-agent critic found 3 VACUOUS GUARDS + a boot regression, all fixed
  (L164)** — worst: *"never logs its value"* could not see an **f-string**, so a mutant that PRINTED the
  credential stayed 53/53 GREEN; and *"writes through the pin's writer"* asserted only the **import**.
  The author's own 18 mutants could not find them.
- **★ `CC-80` ✅ DISCHARGED 2026-10-14 (found by `P2-9a`'s gate).** The suite read the **shell**: exporting
  `OM_AI_PROVIDER=openai OM_AI_MODEL=…` turned **5 suites / 27 tests** RED (all five byte-identical to
  `2128cf96`, throwing from **unchanged** `model-factory.ts`). Fix: `test-env-hermetic.ts` +
  `setupFilesAfterEnv`, clearing the provider axis **by prefix** (`OM_AI_`, `OPENCODE_`) + credentials.
  **Two-sided acceptance BOTH measured: clean 129/1890 GREEN, poisoned 129/1890 GREEN** (was 5/27 RED);
  a prefix-rule mutant turns the poisoned run RED again. Code `8c793e30`. Lessons **L163** (discovery) ·
  **L165** (a clean run is the BASELINE, not the proof; and a PREFIX rule needs a fixture that CONTAINS
  its subject).
- **★ NEXT = `P2-9b` — ONE change**: default-flip to Hermes + OpenCode deletion (`R28-6`/`N-8`) +
  `CC-74` `hermes-local` retirement. **Recorded hazard:** the worker's **default** toolset set measures
  **~16,757 tokens**; cold prefill (~3000 s at ~5.5 tok/s) exceeds `HERMES_LOCAL_STREAM_STALE_TIMEOUT:
  2400` — the `P2-9a` proof pinned `HERMES_TUI_TOOLSETS: open-mercato` and does NOT claim a
  production-shaped default-toolset turn.
- **★ `CC-73` ✅ DISCHARGED 2026-10-14 — done BEFORE `P2-9b` (owner delegated the order).** The
  `ai-assistant` type gate had been *decorative* (it extended the ROOT `tsconfig.json`, whose `exclude`
  swallowed the package's own `src/**` → `tsc -p .` = **TS18003**). Turning it on exposed **92 type errors,
  all `__tests__`, production clean**; **jest does NOT type-check (L138) and the build is esbuild**, so
  neither command a developer runs would ever show them. Fixed: **27 test files, 0 production files**,
  `tsconfig.json` untouched (option (2), excluding `**/__tests__/**`, stays REJECTED — it would hide the
  class `P2-2`'s critic found). Gate **exit 0** (was 92); package **129/1890 GREEN** (= the CC-80
  baseline); **4 reverts restored 17 errors**, md5-restored. Critic (separate agent) **1 MEDIUM + 3
  LOW/NIT** — the MEDIUM: two BC tests asserted *"assignable to `AiToolDefinition`/`McpToolDefinition`"*
  and the claim was **FALSE, not stale** (function-typed **properties** → contravariant params → a narrow
  input is NOT assignable to `unknown`); my first fix silenced it while leaving the title claiming the old
  thing → **titles+comments rewritten, friction registered as `CC-81`** (L166/L167). Moves **no box**.
- **`CC-81` OPEN (new, from `CC-73`'s critic):** the base `AiToolDefinition`/`McpToolDefinition` are NOT
  assignable from a narrowly-typed tool, so the interfaces' own docblock (`lib/types.ts:115`) is a **false
  statement in the tree**. Both fixes are a **design decision (rule 11)** — (a) method syntax (bivariant) or
  (b) correct the docblock + a typed-helper pattern. Scheduled, not fixed. **`CC-76` ✅ FIXED.**
  **`CC-51` FALSIFIED:** the `team` concept EXISTS (`StaffTeam*`); `staff` is PARKED → product decision
  (L137). **Owner's ruling: core architecture first — business modules are GENERATED from the core
  workspace.** Docker ON.
- **Lessons added this session: L159–L167** (L159 wrong-VIEW proof · L160 Git Bash path rewriting ·
  L161 docstring-satisfied guards · L162 compose blast radius is the PROJECT · L163 non-hermetic suite ·
  L164 import-is-not-the-call + f-string blind spot · L165 the defective condition is the proof ·
  L166 a type fix must restore the CLAIM (the test title is part of it) · L167 a test-helper cast erases N
  types — document the trade-off; a fake missing required fields is invisible behind a cast).
