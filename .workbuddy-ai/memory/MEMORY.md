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
Judge line endings from the COMMITTED BLOB (`git ls-files --eol`); `grep $'\r'` lies on a git pipe;
Python `open(p,'w')` flips LF→CRLF + md5 — write bytes. Any `tsc` measurement needs
**`--incremental false`** (L139); jest does NOT type-check here (L138). Critic = SEPARATE agent,
command+output per claim; a structural scan must enumerate the file classes it covers (L132).
**Critic verdicts get MEASURED too — an absence claim needs absence evidence; a bound the door
already defines as a field is an unfinished requirement (L146).** **Node 24:
`C:/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24/node.exe`** (above `starting-kit`).
## Live frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived (`.derive_platform_points.py`), never typed; split parents
  (`▸ n/N`) never count, 5+ spaces are annotations, §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — the runtime sits behind ONE typed door (`R28-5` proved it);
  `R28-6` (delete OpenCode) trigger-blocked → `CC-72` (L133). **Hermes pin = root
  `hermes-agent-main/`** (rev `3569e846…`, digest `ca760e97…`); `--check` → PIN HOLDS (L135/L136).
- **Phase 2: `P2-1` ✅ + `P2-2` ✅ + `P2-3` ✅ (2026-10-12).** `P2-3` = `lib/hermes-port-adapter.ts`
  (8 ops on the measured wire; honest map 7 ✓ / `resolveToolCall` ✗ / `steerRun` ✓), 37/37, package
  green, 11 mutations all RED. Lessons **L144** (an echo-fake hides a reply-shape bug) · **L145**
  (observe the teardown) · **L146**. The envelope carries `deadline` — Hermes honours it, OpenCode
  doesn't → **`CC-76`**. `hermes-local` retired after `P2-5` proves the worker (**`CC-74`**).
- **★ NEXT = `P2-4`** (Business-IR first; owner confirmed). **Tools are already agent-selected on the
  platform's own runtime** — `AiAgentDefinition.allowedTools` + `resolveAiAgentTools` + per-tool
  `checkAgentPolicy`, narrowed by bindings (CC-55). **The door is agent-blind** (`resolveToolCall(call,
  grant)` — no agentId) and **the grant is a LABEL** (`chat-turn:sub:runId`; resolves to nothing) ⇒
  grant-only wiring lets the engine pick its own tools (§8 forbids). Owner asked 2026-10-13 (log =
  finding + ranked options); recommended two gates: the agent's declared list AND the grant
  (admission decides with features, the door enforces). **Re-write the requirement BEFORE code**
  once he picks. → `P2-5` → `P2-6`.
- **`CC-73` OPEN:** type gate fixed (TS18003); **92 pre-existing errors** in 27 `__tests__` files
  (fix file-by-file). **`CC-51` FALSIFIED:** the `team` concept EXISTS (`StaffTeam*`); `staff` is
  PARKED → enabling it is a product decision (L137). **Owner's ruling: core architecture first —
  business modules are GENERATED from the core workspace.** Docker ON.
