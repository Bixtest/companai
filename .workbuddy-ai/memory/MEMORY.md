# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` (frozen) + daily logs. New work: HERE (short) + today's log (full). Rules: `library/development/WORKING-RULES.md`.

## Protocol (short)
Next task ONLY from `JOURNAL.md`'s `★ ACTIVE TASK` (order = `BUILD-ORDER.md`). Requirement = task +
relevant `platform_points.md` points, **written BEFORE any code**; **rule 0b — measure the code FIRST**.
Then plan → execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5-verified
restore) → re-measure. Only when flawless: ALL docs updated in the SAME change + commit. **Never
`git add -A`** — explicit paths, BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`; code
`../workspace/starting-kit`).

## Standing rules (binding)
Two sources of truth: `BACKLOG.md` (status) + `BUILD-ORDER.md` (order); FRONTIER = `platform_points.md`'s
`▶ FRONTIER`; **only code is evidence**. SHARED-DOC CLOBBER HAZARD (twice): the owner saves from a
stale copy — `git diff <path>` first, **commit immediately after every edit**, `owner_answers.md` = read,
never write. Rules 9a · 10d · 11 (the owner decides *what*) · 13 (correct a falsified premise *everywhere*) · 15. Reporting: no flag without a full report (named · what · why · risk ·
ranked lines + recommendation); **never end on "your call"** — shortlist, recommendation, then ONE
specific question.

## Hazards
Line endings: judge the COMMITTED BLOB (`git ls-files --eol`); `grep $'\r'` lies on a git pipe; Python
`open(p,'w')` flips LF→CRLF + md5 — write bytes, build before opening. Any `tsc` measurement
needs **`--incremental false`** (**L139**); jest does NOT type-check here; native TS7 needs an explicit
`types` list (**L138**). Hostile critic = a SEPARATE agent, command+output per claim; a structural scan
must enumerate the file classes it covers (**L132**).

## Live frontier (2026-10-12; truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived (`.derive_platform_points.py`), never typed; split parents (`▸ n/N`) never count, 5+ spaces are annotations, §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — the runtime sits behind ONE typed door (`lib/ai-runtime-port.ts`; `R28-5` proved it the only way in; exceptions `CC-69`/`CC-71`); `R28-6` (delete OpenCode) trigger-blocked → `CC-72` (**L133**: "OpenCode" is a name collision, engine vs vestige).
- **Hermes pin = root `hermes-agent-main/`** (18,248 files, rev `3569e846…`, digest `ca760e97…`); `.hermes_pin.py --check` → PIN HOLDS; doc `HERMES-PIN.md` (**L135/L136**).
- **Phase 2: `P2-1` ✅ + `P2-2` ✅ DONE 2026-10-12.** `P2-2` = `lib/hermes-gateway-client.ts` + 21/21 (every event an `event`-envelope, `server.py::_event_frame:701`). `P2-1` = `docker/hermes/` + the **opt-in** `docker-compose.hermes.yml` (gate `handshake_gate.py` **PASSED 39.5s**). **L140** a compose network is an ownership claim (external + overridable) · **L141** the stack already ran the upstream `hermes-local` HTTP gateway, a different door, neither wired into the app · **L142** worker stdout is the wire (logs to stderr; the gate asserts every stdout line is JSON).
- **★ NEXT = `P2-3`** (port adapter; settle `session.steer` by measurement) → `P2-4` (Business-IR narrow tool) → `P2-5` (selection at the door) → `P2-6` (exit-gate proof).
- **`CC-73` OPEN:** `ai-assistant` had no type gate (TS18003) — fixed + `typecheck`; exposed **92 pre-existing errors in 27 `__tests__` files** (fix file-by-file; the `exclude __tests__` escape hatch was named and rejected).
- **`CC-51` premise FALSIFIED:** the `team` concept EXISTS (`StaffTeam*`, `packages/core/src/modules/staff/data/entities.ts`); `staff` is PARKED → enabling it is a product decision (**L137**).
- **Owner's ruling in force:** core architecture first — **business modules are GENERATED from the core workspace** (prompt → business IR → saved Functions → categorised), not hand-coded unless needed for testing. Docker is ON (29.8.2).
