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
| 5 | **Gas Town 1.2.1** | 🔵 **b00+b01 done** | Go multi-agent orchestration: Town/Rig + **7 TOML roles** + Claude Code in tmux + a Beads ledger. **The watchdog chain is made of agents.** 48% of `internal/` lines are tests. |
| — | n8n, buzz, openrig, mattermost, zulip | ⬜ 5 remain | Order not fixed — **ASK before extracting more.** |

**Multica b01 (`4cf7f35`, 19 findings, 584 lines, 0 CR):** a Go+TS *product*, not a library
(2,036 Go files / 801,066 lines; 598 up-migrations; 144 tables). `agent_runtime` (the machine)
and `agent` (the teammate) are two rows, `UNIQUE (workspace_id, daemon_id, provider)` — the
one-tenant-one-engine primitive. `ClaimAgentTask` = real `FOR UPDATE SKIP LOCKED` + prepare
lease + 4 named sweepers; a 14+14 failure taxonomy with an `agent_error.` prefix; a DB-backed
distributed cron whose `sys_cron_executions` is lease *and* audit log; autopilot as data.
**Hermes driven via a hard-coded `hermes acp`** with the profile handshake mirrored from
Hermes's own CLI (upstream GH #8878 cited); `hermes_test.go` = 4,860 lines, 2nd-largest in
`pkg/agent/`. **CC-84 narrowed, not solved:** a `mat_` task token makes the task the
credential's scope, but the engine is still shared.

**Multica b02 (`f2dba7e`, the aissistant, P1; 368 lines / 0 CR):** the agent
surface, read from source. Machine/teammate split (`agent_runtime` + `agent`,
`runtime_id` NOT NULL RESTRICT); one `Backend` interface, 24 structs / 25 keys;
`SupportedTypes` whitelist kept in lockstep with the DB CHECK by hand; the
`agent` table = 29 columns over 598 up-migrations (229 mention it); later
migrations promoted fields OUT of the legacy `runtime_config` jsonb into typed
columns, stored **runtime-native** (not neutralised). Skills are TWO kinds
(workspace structured vs runtime/CLI disable-only). Permissions =
`permission_mode` + a stacking `agent_invocation_target` allow-list,
deny-by-default (MUL-3963 closed an admin-bypass hole); A2A judged by the
top-of-chain human originator. **Retirement ledger: 4 retirements** (008/032/
109/126) + 129→130 reversing the Composio originator==owner gate.

**Multica b03 (`6dfd0ab`, the workspace, P2; 306 lines / 0 CR):** the container.
**144 unique tables; 82 carry `workspace_id`** (the tenant fence). Members
`owner|admin|member` + invitations (7-day expiry, role capped at admin, partial
unique on pending); the **last owner is protected** in three code paths. Issues
= 32 columns; a per-workspace human number; triage split OFF `status`;
duplicate = a cancelled issue with a pointer; stages = barrier groups; **two
custom-field layers** (free jsonb bag for machines vs typed catalog keyed by
UUID). Projects have a lead that may be a **member or an agent**; resources are
polymorphic. Git = a repo registry (url+ref) + a multi-workspace GitHub install
+ an issue↔PR join; `007` dropped `issue.repository` (Git moved issue→workspace).
`attribution_fail_closed` = a per-workspace switch to refuse unattributable runs.

**Multica b04 (`109b66c`, automations, P3; 330 lines / 0 CR):** the delivery
layer. One-statement claim (`agent.sql:749-810`): `FOR UPDATE SKIP LOCKED` + a
total order + per-(issue,agent) serialization + the runtime-health gate INSIDE
the claim. A prepare lease + attempt/heartbeat columns + **4 named sweepers**.
`sys_cron_executions` = the row is both the distributed lease and the audit log
(unique `(job, scope, plan_time)`, no materialised stale state, lease_token).
Autopilot as data (definition+triggers+runs, `concurrency_policy`, versioned
rules, a per-trigger responsible publisher). **27-value failure taxonomy** (13
platform + 14 `agent_error.*`; the prefix classifies). Wakeups = a revision fence
+ a receipt dedup table. **Retirement: the chat-pending marker and the
terminal-completed index were EACH built, dropped and rebuilt twice** — the
migration chain, not the schema, is the truth.

**Multica b05 (`daef743`, widgets+frontend, PX-W/PX-F; 286 lines / 0 CR):**
`packages/views` 1,192 files/304k lines; `core` 511/87k; `ui` 79/10.7k (46
primitives); mobile 303/35k; web 165/29k; desktop 153/25k; ui-lab 33/5.9k — the
**shared layer ≈ 5× the app layer**. PX-F: a 3-package layering whose constraints
are **prohibitions** (core: no react-dom/localStorage/process.env → `StorageAdapter`;
ui: no core imports; views: no stores/next/*/react-router-dom → `NavigationAdapter`
/`useNavigation`/`AppLink`). Query owns server data, Zustand client state; UI JSON
goes through zod + `parseWithFallback`, never `as T` (deployed desktop clients talk
to newer backends). PX-W: role-named tokens whose comments carry the history (51
ad-hoc font sizes / 370 arbitrary values → 10 role-named steps; colors pinned by
WCAG); component contracts in `packages/ui/docs/` powering **UI Lab**. **THE
NEGATIVE: NO widget/composer model** (0 composers; `widget` in 13 incidental files)
— second platform with none (Paperclip had none).

**Multica b06 (`c5042c1`, out-of-pole, PZ; 312 lines / 0 CR):** security perimeter
(credential caches; a middleware stack with CSP + a SEPARATE plugin rate limit);
`pkg/redact` on the WRITE path (each rule's comment names the leak it closes);
**the sharpest retirement in the study — migration `344` deletes the ENTIRE Plugin
V1 (verified: 14 DROP TABLEs), replaced by 3 tables**; the V2 contract =
Action/Hook/Resource + a capability gate that fails installation loudly; MCP
consumed + served (reusing the non-inheriting skill pattern); `124` generalizes
lark_* → 10 channel_* with a documented zero-downtime cutover (2 invariants);
first-party `DO_NOT_TRACK` telemetry; enforcement separated from commercial policy;
225 .mdx = 45 pages × 5 languages.

**Multica b07 + READER (`afed823`, synthesis; 361 lines / 0 CR):** 75 findings
(19+14+12+11+9+10). Ranked mechanisms (top 3): machine/teammate split ·
one-statement claim · row-as-lease scheduler. **Reader built** (copy the engine,
swap `BRAND`+`DOCS_CONFIG`+`diagrams.js`): 8 docs / 26,624 words / **177,688 chars**,
8/8 `fidelityVerified`, port 3300. **Fidelity verified two ways** — and the HOW-TO's
"byte count" stability check was WRONG (bytes 178,931 ≠ chars 177,688; the gap is
UTF-8); corrected. **The engine was NOT fully platform-agnostic**: 4 hardcoded
"CrewAI" strings in `generate-reader.js` + `window.CrewAIReader` (a broken gallery
modal) + a hardcoded `crewai_reader_` storage prefix in `assets/reader.js` — all
fixed; 0 stale refs.
**★ NEXT: the GASTOWN study — b00 `c47f47f` + b01 `d32ba72` done; batch 02 (the
aissistant, P1) next.** Then 03–07 + the gastown reader. Then n8n, buzz, openrig,
mattermost, zulip — **ASK before extracting more** — then the cross-platform mapping pass.

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
