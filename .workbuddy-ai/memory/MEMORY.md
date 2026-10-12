# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` + daily logs. New work: HERE + today's log. Rules: `WORKING-RULES.md`.

## Protocol (short)
Next task ONLY from `JOURNAL.md`'s `★ ACTIVE TASK` (order = `BUILD-ORDER.md`). Requirement = task +
relevant `platform_points.md` points, **written BEFORE any code**; **rule 0b — measure the code FIRST**.
Then plan → execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5 restore) →
re-measure. Only when flawless: ALL docs updated in the SAME change + commit. **Never `git add -A`** —
explicit paths, BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`; code `../workspace/starting-kit`).

## Standing rules (binding)
Two sources of truth: `BACKLOG.md` (status) + `BUILD-ORDER.md` (order); FRONTIER = `platform_points.md`'s
`▶ FRONTIER`; **only code is evidence**. SHARED-DOC CLOBBER HAZARD: the owner saves from a stale copy —
`git diff <path>` first, **commit immediately after every edit**; `owner_answers.md` read-only.
Rules 9a · 10d · 11 (owner decides *what*) · 13 (falsified premise → correct *everywhere*) · 15.
Reporting: no flag without a full report (named · plain meaning · why · risk · **ranked actions +
recommendation** · whether he must decide); **never end on "your call"**.

## Hazards
Line endings: judge the COMMITTED BLOB (`git ls-files --eol`); `grep $'\r'` lies on a git pipe; Python
`open(p,'w')` flips LF→CRLF + md5 — write bytes. Any `tsc` measurement needs **`--incremental false`**
(**L139**); jest does NOT type-check here; native TS7 needs an explicit `types` list (**L138**).
Hostile critic = a SEPARATE agent, command+output per claim; a structural scan must enumerate the file
classes it covers (**L132**). **Critic verdicts get MEASURED too — an absence claim needs absence
evidence; a bound the door already defines as a field is an unfinished requirement (L146).**
**Node 24: `C:/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24/node.exe`** (above
`starting-kit`, not in the repo; jest from the PACKAGE dir).

## Live frontier (2026-10-12; truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived (`.derive_platform_points.py`), never typed; split parents
  (`▸ n/N`) never count, 5+ spaces are annotations, §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — the runtime sits behind ONE typed door (`R28-5` proved it);
  `R28-6` (delete OpenCode) trigger-blocked → `CC-72` (**L133**).
- **Hermes pin = root `hermes-agent-main/`** (18,248 files, rev `3569e846…`, digest `ca760e97…`);
  `.hermes_pin.py --check` → PIN HOLDS (**L135/L136**).
- **Phase 2: `P2-1` ✅ + `P2-2` ✅ + `P2-3` ✅ DONE 2026-10-12.** `P2-3` = `lib/hermes-port-adapter.ts`
  (8 ops on the measured wire; honest map: 7 ✓, `resolveToolCall` ✗, `steerRun` ✓) + **37/37**; package
  120/1665 green; `tsc` 0-new vs 92 pre-existing; **11 mutations all RED**, md5-restored (`706ad202…`). Critic-found, all fixed: resume kept the caller's id instead of the reply's **runtime**
  id (a hidden `4001` — **L144**); a vacuous unsubscribe proof (**L145**); an `onExit` leak. Its "no
  deadline policy" claim was **falsified (L146)**: the envelope carries `deadline`, Hermes honours it,
  OpenCode does not → **`CC-76`**. `hermes-local` stays until `P2-5` proves the pinned worker behind the
  port, then retired in one change (**`CC-74`**).
- **★ NEXT = `P2-4`** (the Business-IR narrow tool through `resolveToolCall`, re-authorized at
  execution) → `P2-5` (engine selection) → `P2-6` (exit-gate proof).
- **`CC-73` OPEN:** the `ai-assistant` type gate was fixed (TS18003); **92 pre-existing errors** in 27
  `__tests__` files remain (fix file-by-file; `exclude __tests__` rejected).
- **`CC-51` premise FALSIFIED:** the `team` concept EXISTS (`StaffTeam*`); `staff` is PARKED → enabling
  it is a product decision (**L137**). **Owner's ruling:** core architecture first — business modules
  are **GENERATED from the core workspace**, not hand-coded. Docker ON.
