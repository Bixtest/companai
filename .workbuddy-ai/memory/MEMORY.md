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
here** — a node harness shelling out to jest silently fails without running it; drive children from
BASH, and prove a GREEN baseline before any RED (**L149**). A test reaching a live service is not a
unit test (mock the seam; **L150**).

## Live frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived (`.derive_platform_points.py`), never typed; split parents
  (`▸ n/N`) never count, 5+ spaces are annotations, §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — one typed door (`R28-5` proved it); `R28-6` (delete OpenCode)
  trigger-blocked → `CC-72`. **Hermes pin = root `hermes-agent-main/`** (rev `3569e846…`, digest
  `ca760e97…`); `--check` → PIN HOLDS (L135/L136).
- **Hermes Phase 2: `P2-1`✅ `P2-2`✅ `P2-3`✅ `P2-4`✅ `P2-5`✅.** `P2-4` = the tool door OPENS
  (`ai-tool-call-gate.ts`; map → `resolveToolCall ✓`; 10 mutations RED; critic 2 fixed —
  L147; `CC-77/78/79` open). **`P2-5` ✅ 2026-10-13 (§2.11)** = the engine is now SELECTABLE:
  `lib/resolve-ai-runtime-port.ts` is the ONE config-selected site (env `AI_RUNTIME_ENGINE`, default
  `opencode`; unknown throws, blank refused); the `hermes` branch builds a REAL client+adapter; the
  engine is recorded on the run (`provenance.implementation`, envelope NOT widened); `mintChatRunId`'s
  engine arg now required. **Default did NOT move.** 124 tests/6 suites; package
  123/1723 green; tsc 92 = `CC-73`, 0 new; **13 mutations RED** (harness false-positive fixed —
  **L149**; live-probe mock — **L150**); critic 2 fixed. Lessons **L144–L150**.
- **★ NEXT = `P2-6`** — exit-gate proof (**requirement §2.12 written 2026-10-13**; cancel · retry
  idempotency · usage · bounded mem/CPU · no cross-scope access). = the **`CC-74`** trigger and the gate
  for **§2.11's owned default-flip + OpenCode deletion** (`R28-6`/`N-8`, `CC-76` first).
- **`CC-73` OPEN:** 92 pre-existing type errors in 27 `__tests__` files (fix file-by-file).
  **`CC-76`**: OpenCode ignores the envelope `deadline`. **`CC-51` FALSIFIED:** the `team` concept
  EXISTS (`StaffTeam*`); `staff` is PARKED → enabling it is a product decision (L137). **Owner's
  ruling: core architecture first — business modules are GENERATED from the core workspace.** Docker ON.
