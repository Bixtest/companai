# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` + daily logs + `JOURNAL.md`. New work: HERE + today's log.

## ★ ARCHITECTURE WORKSHOP — `library/architecture/` (the active stage)
**Method (binding):** study platforms ONE AT A TIME; find what fits the **three poles**
(**P1 aissistant · P2 workspace · P3 automations**) + widgets/frontend (PX-W/PX-F) +
escape hatch (PZ); then **map** each pole across ALL platforms vs mercato → a clean **SRS**;
then build **one-tenant ↔ one-Hermes**. **No development before a written requirement.
Hermes must NOT be forked or edited. Markdown is the source of truth — never edit it to fit
a reader.** Owner's frame: *"Do NOT be casual… everything we learn now will help us later."*

**Layout:** `<platform>-forensics/` (`00-PIN-AND-METHOD.md` + `findings/01..NN`) ·
`platforms/` (zips + `references.md`; extracts under `platforms/_extracted/`, gitignored) ·
`reader/` (the shared, platform-agnostic engine: `generate-reader.js` + `DOCS_CONFIG` +
`diagrams.js`; copy + rebrand, never rewrite; built at the END of a study).

**Rule 1 (the load-bearing one): docs are claims, code is the authority.** Count FIRST — a doc
tree can be 93% of a repo (CrewAI) and hide the code; a generated file can be 97% of a "core"
package; the same claim repeated 180× is one claim, not evidence. Read the migration history:
it is the most honest document in a repo.

## Platform studies
| # | Platform | Status | One-line verdict |
|---|---|---|---|
| 1 | Hermes forensics | ✅ CLOSED 13/13 | Main AI engine; never fork it. "OpenCode" = a provider, not a coding agent. |
| 2 | Paperclip 0.3.1 | ✅ CLOSED 7/7 | **P2/P3 = strength**, P1 = seam-provider. No multi-tenancy, no widget composer. |
| 3 | CrewAI 1.15.28 | ✅ CLOSED 7/7 | **Mechanism donor, NOT an architecture template.** Executor yes, **delivery no**, **tenancy nowhere**. |
| 4 | **Multica 0.2.0** | 🔵 **b01 done** | **All three poles are real and implemented.** Strongest finding: the machine/teammate split. |
| — | gastown, n8n, buzz, openrig, mattermost, zulip | ⬜ 6 remain | Order not fixed — **ASK before extracting more.** |

**Multica b01 (`4cf7f35`, 19 findings, 584 lines, 0 CR):** a Go+TS *product*, not a library
(2,036 Go files / 801,066 lines; 598 up-migrations; 144 tables). `agent_runtime` (the machine)
and `agent` (the teammate) are two rows, `UNIQUE (workspace_id, daemon_id, provider)` — the
one-tenant-one-engine primitive. `ClaimAgentTask` = real `FOR UPDATE SKIP LOCKED` + prepare
lease + 4 named sweepers; a 14+14 failure taxonomy with an `agent_error.` prefix; a DB-backed
distributed cron whose `sys_cron_executions` is lease *and* audit log; autopilot as data.
**Hermes driven via a hard-coded `hermes acp`** with the profile handshake mirrored from
Hermes's own CLI (upstream GH #8878 cited); `hermes_test.go` = 4,860 lines, 2nd-largest in
`pkg/agent/`. **CC-84 narrowed, not solved:** a `mat_` task token makes the task the
credential's scope, but the engine is still shared. **Next: `findings/02-the-assistant-p1.md`.**

## Standing hazards (still bite)
- **Git-Bash `grep -c $'\r'` LIES** — byte truth is `tr -cd '\r' < f | wc -c`; verify the
  **STAGED blob** via `git show :path` (autocrlf commit warnings are noise).
- **Write BYTES, not text** — Python `open(p,'w')` flips LF→CRLF; always pass `newline=''`.
- **Never `git add -A`** — explicit paths. Docs repo = `C:/Users/Ramzi/Downloads/companai`.
- `tsc` needs `--incremental false`; jest does NOT type-check. Hermes gates run on the PINNED
  Node (`…/.toolchain/node24/node.exe`). node→node spawn throws `EBUSY` — drive children from
  Bash. A test reaching a live service is not a unit test.
- Shared-doc clobber: `git diff <path>` before editing, commit immediately after.
- **How to report to Ramzi:** plain words · named thing → what it means → why it matters →
  risk → **ranked options + one recommendation** → the single decision he must make.
  **Never end on "your call."**

## Live code frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
**★ NEXT = `P2-9b`** — default-flip to Hermes + OpenCode deletion + `CC-74` retirement.
**`CC-84` (tenancy, drives the whole study):** worker MCP calls authenticate as ONE
superadmin identity → a Hermes turn runs platform tools OUTSIDE the chat's tenant; one shared
`HERMES_HOME`. Ranked: per-run minted credential (recommended) → interim single-tenant
fail-closed guard → doc-only rejected. Also open: `CC-81`, `CC-83`, `CC-51` (falsified).
Owner decided: **core architecture first — business modules generated from the core workspace.**
