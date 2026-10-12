# Project memory — Companai / open-mercato (ACTIVE, curated — SHORT form)

> Detail beyond a line here lives in `extended_deep_memory.md` (frozen archive) and the daily logs
> `YYYY-MM-DD.md`. **New work is recorded HERE (short) + in today's log (full) — never in the archive.**

## How we work — the owner's 6-step protocol
1. Next task ONLY from the `★ ACTIVE TASK` box in `JOURNAL.md`; the order is `BUILD-ORDER.md`.
2. Pick the relevant points from `library/development/platform_points.md` (SCOREBOARD + master list).
3. Requirement = task definition + those points, written BEFORE any code.
4. **Rule 0b — measure the code FIRST.** Never build before measuring.
5. plan → execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5-verified restore) → re-measure → decide honestly.
6. Only when flawless: update ALL docs in the SAME change (`BACKLOG`, `platform_points`, `BUILD-ORDER`, `JOURNAL`, `COMPLETION-CALLBACKS`).

## Standing rules (binding)
- **Two sources of truth:** `BACKLOG.md` (status) + `BUILD-ORDER.md` (order); FRONTIER = `platform_points.md`'s `▶ FRONTIER`. **Only the code is evidence.**
- **SHARED-DOC CLOBBER HAZARD (twice):** the owner edits from a stale copy and his save overwrites agent edits. Before touching a shared doc `git diff <path>`; **commit immediately after every edit**. `library/workspace-architecture/owner_answers.md` = **read, never write**.
- **Never `git add -A`** — stage by explicit path; commit in BOTH repos (docs `C:/Users/Ramzi/Downloads/companai`; code `…/workspace/starting-kit`).
- Rules: 8 schedule partials in `COMPLETION-CALLBACKS.md` same change · 9a own the code · 9b challenge the task · 10d never stack on an unfinished foundation · 11 the owner decides *what* · 13 correct a falsified premise *everywhere* · 15 solve the straightforward NOW · 16 the `B-WS` bridge (design, never code).

## Reporting rules — BINDING (owner, stated twice)
- **No flag without a FULL report:** named · what it is in our terms · why it exists · risk if left alone · ranked actions + trade-offs + a recommendation. A bare "latent gap"/"out of scope" is NOT a report.
- **Never end on "your call"** — ranked shortlist, my recommendation, then **one specific question**. Never make the owner ask "what does that mean?".

## Working hazards
- **Line endings — judge the COMMITTED BLOB** (`core.autocrlf=true`); `grep $'\r'` lies on a git pipe → use `git ls-files --eol`. After a doc edit assert `raw diff == git diff -w`.
- **ENCODING:** Python `open(p,'w')` flips LF→CRLF and changes md5 — write bytes, and build the bytes BEFORE `open(...,'wb')`.
- Node: run jest/tsc from the PACKAGE dir (`NODE_PATH=../../node_modules node ../../node_modules/<bin>`); `.bin` shims broken on Windows.
- **Any `tsc` measurement needs `--incremental false`** — a stale `*.tsbuildinfo` reported 6,551 → 36 → 95 for one unchanged config (**L139**).
- **Hostile critic = a SEPARATE agent every time; command+output per claim**; a structural scan must enumerate the file classes it covers (**L132**).
- Sandbox `rmSync` shim fails in the full `shared` suite, passes alone — environmental (`CC-19`).

## Live frontier (2026-10-12; the truth is `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived from §A–§K ticked boxes, never typed. Traps: a split parent (`▸ n/N`) is never a tick; 5+ spaces = annotation, never a unit; §L excluded.
- **Row 28 (Phase 8) ✅ COMPLETE** — the runtime sits behind ONE typed door (`lib/ai-runtime-port.ts`, 8 ops + envelope; `R28-5` proved it the only way in; exceptions `CC-69`/`CC-71`). `R28-6` (delete OpenCode) is trigger-blocked → **`CC-72`**; "OpenCode" is a name collision (engine vs vestige — **L133**).
- **HERMES pin = root `hermes-agent-main/`** (18,248 files, rev `3569e846…`, digest `ca760e97…`, byte-identical to the root zip) — re-pinned 2026-10-12 (old root copy `hermes-agent-main-older/`; the previous pin `library/ai/hermes-agent-main/` is 3,290 commits behind). Harness `library/.hermes_pin.py --check` → PIN HOLDS; doc `library/development/HERMES-PIN.md` (**L135/L136**).
- **Phase 2 (one worker, one tenant, one tool) — `P2-2` ✅ DONE** (commit `f5f85064`): `packages/ai-assistant/src/modules/ai_assistant/lib/hermes-gateway-client.ts` + suite, **21/21**, every event an `event`-envelope unwrapped (`server.py::_event_frame:701`), 8-of-21 RED under mutation, md5-verified restore. **★ NEXT = `P2-1`** — the Docker worker, **now buildable here (the daemon is up: `docker info` → 29.8.2)**, then `P2-3` (port adapter; settle `session.steer`), `P2-4` (the Business-IR narrow tool), `P2-5` (selection at the door), `P2-6` (exit-gate proof).
- **`CC-73` OPEN (new):** `ai-assistant` had **no type gate** (`tsc -p .` = TS18003 — the only one of 21 configs not extending `tsconfig.base.json`). Fixed, plus a `typecheck` script; turning it on exposed **92 pre-existing errors in 27 other `__tests__` files** (jest here does not type-check). Fix file-by-file; the native TS7 compiler needs an explicit `types` list (**L138**).
- **`CC-51` premise FALSIFIED:** the `team` concept EXISTS (`StaffTeam`/`StaffTeamRole`/`StaffTeamMember`, `packages/core/src/modules/staff/data/entities.ts:5/36/73`) but the `staff` module is PARKED → enabling it is a product decision (**L137**).
- Open `CC-`: `CC-69`/`CC-71` (ruled permanent exceptions), `CC-72` (trigger-blocked), `CC-70`, `CC-60`, **`CC-73`**, `CC-54`/`CC-19` (trigger-blocked), `CC-58` staged.
- **Owner's ruling in force:** core architecture first — **business modules are GENERATED from the core workspace** (prompt → business IR → saved Functions → categorised as modules); no hand-coded module functionality unless needed for testing.
- Durable code facts + deploy path → `extended_deep_memory.md` (write gate is OPT-IN → `CC-44`; enabled modules = `apps/mercato/src/modules.ts`).
