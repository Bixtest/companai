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
| 4 | **Multica 0.2.0** | ✅ **CLOSED 7/7 + reader** | **All three poles real. The closest neighbour studied.** No widget model; no engine of its own. |
| 5 | **Gas Town 1.2.1** | ✅ **CLOSED 7/7 + reader** | Go multi-agent orchestration. **The watchdog chain is made of agents**; agents ARE beads; 13-preset provider registry; `gt prime` infers the role from the directory; **the Hook is the durability primitive**; **ZFC** = transport, don't decide; 47 tested TOML formulas; a **three-layer sandbox** (mTLS CA + denylist / CLI allow-list → 403 / git smart-HTTP proxy); 13 shell-script plugins, "no AI interpretation". Frontend = CLI (5× the rest); **NO widget model**. **Top 4 ranked mechanisms are DECIDED LIMITS.** |
| 6 | **n8n 2.44.0** | ✅ **CLOSED 7/7 + 73 findings** | TS monorepo: 22,715 `.ts` (**65% of bytes**) / 57 `@n8n` packages; 563 built-in nodes. **A v2 engine that is a documented SCAFFOLD with 6 ACCURATE ADRs** (`MAX_IN_PROCESS_WAIT_MS = 65_000`). **P1:** `@n8n/agents` v0.29.0 — lazy fluent builder (25+ methods, `build()` protected), SKILL.md skills (72 KB cap, content-hashed), sub-agents w/ suspend/resume, **guardrails = `allow`\|`stop(code)`** at 2 moments, cost-as-guardrail + `SpendLedger`, untrusted tool output. **P2: a real tenancy model** — `Project` `personal\|team`, membership = composite-key join row w/ Role by slug, **10 roles (2-level) + 206 `resource:action` scopes** (4 of 5 `.ee`), `User` ≠ `AuthIdentity`. **P3: the study's best security surface** — expressions in an **isolate pool** (scales to zero) behind a **zod-validated RPC boundary** (*"TS types are erased at runtime and contribute zero security"*); observability = a **sampling policy**. **★ PX-W: THE FIRST PLATFORM WITH A REAL COMPOSITION SURFACE** — a **canvas of 7 element types**, a **129-component design system enforced by its own ESLint plugin**, **CRDT on y-websocket with awareness**. **PZ: two ratchets** (299 hashed arch violations + 110 boundary issues), a **pinned agent harness** (`harness-v0.6.0`), `agent-check.mjs` (excerpt to the agent, full output to disk). **FAIR-CODE** — `.ee` unlicensed, incl. `ai-workflow-builder.ee`. Extracted to `C:\n8n` (MAX_PATH). **Reader (port 3500) is the NEXT build.** |
| — | buzz, openrig, mattermost, zulip | ⬜ 4 remain | Order not fixed — **ASK before extracting more.** |

**Multica (75 findings, b01 `4cf7f35` … b07 `afed823`) — the 3 load-bearing facts.**
*(Full per-batch detail → `extended_deep_memory.md` + daily logs.)*
1. **Machine ≠ teammate.** `agent_runtime` (the machine) and `agent` (the teammate) are two rows,
   `UNIQUE (workspace_id, daemon_id, provider)` — **the one-tenant-one-engine primitive**; `runtime_id`
   NOT NULL RESTRICT. Skills are TWO kinds (structured workspace vs runtime/CLI disable-only); permissions
   = `permission_mode` + a stacking `agent_invocation_target` allow-list, **deny-by-default**. **CC-84
   narrowed, not solved** (a `mat_` task token scopes a task, but the engine is still shared).
2. **The one-statement claim** (`agent.sql:749-810`): `FOR UPDATE SKIP LOCKED` + a total order +
   per-(issue,agent) serialization + the runtime-health gate **inside** the claim; a prepare lease + 4
   named sweepers; a **27-value failure taxonomy** (13 platform + 14 `agent_error.*`; the prefix
   classifies). `sys_cron_executions` = the row is **both the distributed lease and the audit log**.
   **Retirement is the lesson:** the chat-pending marker AND the terminal-completed index were each
   built, dropped and rebuilt twice — *the migration chain, not the schema, is the truth.*
3. **The container: 144 tables, 82 carry `workspace_id`** (the tenant fence). Members
   `owner|admin|member` + invitations; **the last owner is protected in 3 code paths**. Git = a repo
   registry + a multi-workspace GitHub install + an issue↔PR join (`007` moved Git issue→workspace).
   PX-F: a 3-package layering whose constraints are **prohibitions** (core: no react-dom/localStorage/
   process.env → `StorageAdapter`; ui: no core imports; views: no stores/next/*/react-router-dom →
   `NavigationAdapter`); UI JSON goes through zod + `parseWithFallback`, **never `as T`** (deployed
   desktop clients talk to newer backends). **THE NEGATIVE: NO widget/composer model** (0 composers) —
   second platform with none. Migration `344` **deletes the ENTIRE Plugin V1** (14 DROP TABLEs) → 3
   tables; 225 .mdx = 45 pages × 5 languages; `pkg/redact` on the WRITE path.
**Reader built** (copy the engine, swap `BRAND`+`DOCS_CONFIG`+`diagrams.js`): 8 docs / 26,624 words /
**177,688 chars**, 8/8 `fidelityVerified`, port 3300. **Fidelity verified two ways** — the HOW-TO's
"byte count" check was WRONG (bytes 178,931 ≠ chars 177,688; the gap is UTF-8); corrected. **The engine
was NOT fully platform-agnostic**: 4 hardcoded "CrewAI" strings + `window.CrewAIReader` + a
`crewai_reader_` storage prefix — all fixed; 0 stale refs.

**★ STUDY CHAIN (all six CLOSED):** Hermes 13/13 · Paperclip · CrewAI · Multica (+reader) · Gas Town
(+reader) · **n8n `65f0889`…`8d06da8` (b00–b06) + `142e568` (b07 synthesis)**. **NEXT = the n8n
reader (port 3500)**, then buzz / openrig / mattermost / zulip — **ASK before extracting more
(~700 MB each; order not fixed)** — then the cross-platform mapping pass.

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
