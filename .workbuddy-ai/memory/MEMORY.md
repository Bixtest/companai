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
| 6 | **n8n 2.44.0** | ✅ **CLOSED 7/7 + 73 findings + reader (3500)** | TS monorepo: 22,715 `.ts` (**65% of bytes**) / 57 `@n8n` packages; 563 built-in nodes. **A v2 engine that is a documented SCAFFOLD with 6 ACCURATE ADRs** (`MAX_IN_PROCESS_WAIT_MS = 65_000`). **P1:** `@n8n/agents` v0.29.0 — lazy fluent builder, SKILL.md skills (72 KB cap), sub-agents w/ suspend/resume, **guardrails = `allow`\|`stop(code)`**, cost-as-guardrail + `SpendLedger`. **P2: a real tenancy model** — `Project` `personal\|team`, membership = composite-key join row w/ Role by slug, **10 roles + 206 `resource:action` scopes**, `User` ≠ `AuthIdentity`. **P3: the study's best security surface** — expressions in an **isolate pool** behind a **zod-validated RPC boundary** (*"TS types are erased at runtime and contribute zero security"*); observability = a **sampling policy**. **★ PX-W: the FIRST platform with a real composition surface** — a **canvas of 7 element types**, a **129-component design system enforced by its own ESLint plugin**, **CRDT on y-websocket**. **PZ: two ratchets** (299 hashed arch violations + 110 boundary issues), **pinned agent harness**, `agent-check.mjs` (excerpt to agent, full output to disk). **FAIR-CODE** — `.ee` unlicensed. Reader: 8 docs / 23,092 words / **153,204 chars**, 8/8 fidelity, port 3500. |
| 7 | **buzz 0.5.28** | 🟠 **b00–b05 done** | **Self-hosted team-communication platform on Nostr (NIP-01) — every action is a signed event with a `kind`; the relay is the single source of truth; community = tenant (URL-is-authoritative) with TLA+/Tamarin proofs.** Apache-2.0, **no licence gate**. Polyglot: **34 Rust crates / 501,445 prod LOC** + Tauri desktop + Flutter mobile + web. **Test share 60.9% by lines** — highest in the study. 11 `VISION_*.md`; 20 custom NIPs; 62 migrations. Reader will be port **3600**. |
| — | openrig, mattermost, zulip | ⬜ 3 remain | Order not fixed — **ASK before extracting more (~700 MB each).** |

**buzz (b00 `4304e7f` … b05 `aad1f45`) — the load-bearing facts so far.**
*(Full per-batch detail → today's + recent daily logs.)*
1. **★ ARCHITECTURE WORKSHOP rules applied:** rule 1 (docs are claims), rule 0b (count FIRST), rule 10 (retirement).
   Commits: b01 `78c19c5` · b02 `b5d04f7` (P1 aissistant) · b03 `5778017` (P2 workspace) · b04 `c9bbfc1`
   (P3 automations) · **b05 `aad1f45` (PX-W/F widgets+frontend)**.
2. **b04 (P3)**: workflow crate = 5 files / 5,263 lines, 77-line `ActionSink` seam; **5 triggers in code vs
   the doc's 4**; delay caps at **270 s not the doc's 300 s**; **`WaitingApproval` is never written +
   `create_approval` has ZERO production callers → ~330 lines of grant/deny/resume are unreachable dead code**
   (F4-5) — and the conformance suite *refuses to fake a green*, naming `pending_lane WF-08` as its blocker;
   cross-pod at-most-once is **deterministic, not locked** (`INSERT … ON CONFLICT DO NOTHING`).
3. **★ b05 (PX-W/F) = the batch to cite.** **buzz has NO widget model and NO composer — FIFTH platform with
   none** (proven: 27 `widget` hits tree-wide, all accounted for; the only `CREATE TABLE widgets` is a
   *negative fixture inside a `#[test]`*). **The composition unit is the Nostr event kind** (157 `pub const`
   in a 1,177-line `kind.rs`; policy = *"prefer a new kind over a new HTTP endpoint"*). **★ Answers the
   inherited question: an event log is NOT a widget model** — it extends *data + behaviour*, never *layout*.
   **★★ THE RECOMMENDATION: the guard-as-document pattern** — shared core + thin per-app wrapper
   (`rules` + reason-annotated allowlist) → `package.json check` → `justfile check`. Two rules:
   **`check-px-text`** (root cause = PR #891 zoom regression; rejects arbitrary `rem`/`em` TOO → *"the rule
   is one scale, not no pixels"*) and **`check-pubkey-truncation`** (**a SECURITY invariant**: a truncated
   identifier a human trusts is **forgeable by vanity-grinding**; ad-hoc truncation had fragmented into 5
   formats) + a **differential file-size ratchet** (*ratchet-not-freeze*; limits 1,200 FE / 1,500 Rust /
   1,200 mobile / 1,000 web). **★ THREE allowlist mechanisms, keyed by whatever is STABLE per-guard**
   (literal for px-text, line number for pubkey; `allowedFiles` for the canonical module; `.test.` excluded).
   **Design tokens = TWO dials through ONE virtual rem** (`--buzz-type-rem`), incl. a **rem-relative
   `lineHeight` scale**. **Desktop `src-tauri/src` = 478 `.rs` / 194,385 lines / 385 `#[tauri::command]`**
   → the bridge is a SECOND APPLICATION. **Mobile = 456 Dart files, ZERO Rust** (a full independent
   re-implementation; its theme engine is 3,533 Dart lines ported from desktop's 3,249 TS lines, NO shared
   source). Feature flags **fail-OPEN on unknown gates, fail-CLOSED on the build split**; the
   `protectedFeatures/` internal/OSS split is **verified by building BOTH variants and scanning emitted
   chunks** (a commercial split, NOT tenancy). **D5-1/2/3: buzz enforces DESIGN + SECURITY rules executably
   and leaves ARCHITECTURE (feature-module imports) and the cross-language kind mirror to PROSE.**

**Multica (75 findings, b01 `4cf7f35` … b07 `afed823`) — the 3 load-bearing facts.**
*(Full per-batch detail → `extended_deep_memory.md` + daily logs.)*
1. **Machine ≠ teammate.** `agent_runtime` (the machine) vs `agent` (the teammate), two rows,
   `UNIQUE (workspace_id, daemon_id, provider)` — **the one-tenant-one-engine primitive**; `runtime_id`
   NOT NULL RESTRICT. Skills are TWO kinds (structured workspace vs runtime/CLI disable-only); permissions
   = `permission_mode` + a stacking `agent_invocation_target` allow-list, **deny-by-default**. **CC-84
   narrowed, not solved** (a `mat_` task token scopes a task, but the engine is still shared).
2. **The one-statement claim** (`agent.sql:749-810`): `FOR UPDATE SKIP LOCKED` + a total order +
   per-(issue,agent) serialization + the runtime-health gate **inside** the claim; a prepare lease + 4
   named sweepers; a **27-value failure taxonomy** (13 platform + 14 `agent_error.*`). `sys_cron_executions`
   = the row is **both the distributed lease and the audit log**. **Retirement is the lesson:** the
   chat-pending marker AND the terminal-completed index were each built, dropped and rebuilt twice —
   *the migration chain, not the schema, is the truth.*
3. **The container: 144 tables, 82 carry `workspace_id`** (the tenant fence). Members
   `owner|admin|member`; **the last owner is protected in 3 code paths**. Git = a repo registry +
   a multi-workspace GitHub install + an issue↔PR join. PX-F: a 3-package layering whose constraints
   are **prohibitions** (core: no react-dom/localStorage/process.env → `StorageAdapter`); UI JSON goes
   through zod + `parseWithFallback`, **never `as T`**. **THE NEGATIVE: NO widget/composer model** —
   second platform with none. Migration `344` **deletes the ENTIRE Plugin V1** (14 DROP TABLEs) → 3
   tables. Reader: 8 docs / 26,624 words / 177,688 chars, port 3300 — **verified two ways** (the
   HOW-TO's "byte count" check was WRONG; bytes ≠ chars, the gap is UTF-8). **The engine was NOT fully
   platform-agnostic**: 4 hardcoded "CrewAI" strings + `window.CrewAIReader` + a `crewai_reader_`
   prefix — all fixed.

**★ STUDY CHAIN (six CLOSED + the 7th open):** Hermes 13/13 · Paperclip · CrewAI · Multica (+reader)
· Gas Town (+reader) · **n8n (+reader, port 3500)** · **buzz (b00–b05, port 3600)** — then
openrig / mattermost / zulip — **ASK before extracting more** — then the cross-platform mapping pass.

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
