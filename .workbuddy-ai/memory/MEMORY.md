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
Line endings from the COMMITTED BLOB (`git ls-files --eol`); Python `open(p,'w')` flips LF→CRLF + md5
— write bytes. `tsc` needs **`--incremental false`** (L139); jest does NOT type-check (L138). Critic =
SEPARATE agent, command+output per claim; a structural scan must enumerate the file classes it covers
(L132); **the critic's verdicts get measured too (L146)**. **Node 24: `…/workspace/.toolchain/node24/node.exe`**
(above `starting-kit`). `/tmp` differs between the Write tool (`C:\tmp`) and bash (`%TEMP%`) — use absolute
paths in harnesses.

## Live frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived (`.derive_platform_points.py`), never typed; split parents
  (`▸ n/N`) never count, 5+ spaces are annotations, §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — the runtime sits behind ONE typed door (`R28-5` proved it);
  `R28-6` (delete OpenCode) trigger-blocked → `CC-72` (L133). **Hermes pin = root
  `hermes-agent-main/`** (rev `3569e846…`, digest `ca760e97…`); `--check` → PIN HOLDS (L135/L136).
- **Hermes Phase 2: `P2-1`✅ `P2-2`✅ `P2-3`✅ `P2-4`✅.** `P2-4` = the tool door OPENS:
  `lib/ai-tool-call-gate.ts` (two pure gates) + the adapter's `resolveToolCall` (call→run from
  `tool.start`; gate 1 = grant is this run's own, gate 2 = tool in the run's recorded menu;
  deny-by-default, identity → authority) + the runner agent (fixed 1-tool menu). **Map flips to
  `resolveToolCall ✓`** (first engine, all 8 real). 94 tests; package 122 suites / 1701 green; tsc 92 =
  pre-existing `CC-73`, 0 new;   **10 mutations RED** md5-restored. Critic: 2 fixed (**L147**). **`CC-77`**·**`CC-78`**·**`CC-79`** open.
  Lessons **L144–L148**.
- **★ NEXT = `P2-5`** — engine selection at the door; **requirement §2.11 written 2026-10-13** (env
  `AI_RUNTIME_ENGINE` default `opencode`; selector extracted to `lib/resolve-ai-runtime-port.ts`; the
  `hermes` branch must build a REAL client — nothing in production constructs one today). **§2.11 OWNS
  the default-flip**: flips to Hermes when `P2-6` is green, **same change deletes OpenCode** (`R28-6`),
  with **`CC-76`** fixed first. = the **`CC-74`** trigger that retires `hermes-local`. Then **`P2-6`**.
- **`CC-73` OPEN:** 92 pre-existing type errors in 27 `__tests__` files (fix file-by-file).
  **`CC-76`**: OpenCode ignores the envelope `deadline`. **`CC-51` FALSIFIED:** the `team` concept
  EXISTS (`StaffTeam*`); `staff` is PARKED → enabling it is a product decision (L137). **Owner's
  ruling: core architecture first — business modules are GENERATED from the core workspace.** Docker ON.
