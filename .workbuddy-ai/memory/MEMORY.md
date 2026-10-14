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
- **★ NEXT = THE SWITCHOVER — ONE change (§2.11 item 5 owns it):** production **connection lifecycle** →
  **default-flip to Hermes** → **delete OpenCode** (`R28-6`/`N-8`) → **retire `hermes-local`** (`CC-74` —
  trigger now FULLY met: selection half `P2-5` + live-run half `P2-7`). Requirement (§2.14) BEFORE any code.
- **`CC-73` OPEN:** 92 pre-existing type errors in 27 `__tests__` files. **`CC-76` ✅ FIXED.** **`CC-51`
  FALSIFIED:** the `team` concept EXISTS (`StaffTeam*`); `staff` is PARKED → product decision (L137).
  **Owner's ruling: core architecture first — business modules are GENERATED from the core workspace.** Docker ON.
