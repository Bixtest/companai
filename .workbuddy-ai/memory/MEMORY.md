# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` + daily logs + `JOURNAL.md`. New work: HERE + today's log.

## ★ ARCHITECTURE WORKSHOP — `library/architecture/` (the active stage)
**Method (binding):** study platforms ONE AT A TIME; find what fits the **three poles**
(**P1 aissistant · P2 workspace · P3 automations**) + widgets/frontend (PX-W/PX-F) + escape
hatch (PZ); then **map** each pole across ALL platforms vs mercato → a clean **SRS**; then build
**one-tenant ↔ one-Hermes**. **No development before a written requirement. Hermes must NOT be
forked or edited. Markdown is the source of truth — never edit it to fit a reader.** Owner's
frame: *"Do NOT be casual… everything we learn now will help us later."*

**Layout:** `<platform>-forensics/` (`00-PIN-AND-METHOD.md` + `findings/01..07`) ·
`library/architecture/platforms/` (zips + `references.md`; extracts at `platforms/_extracted/<name>/`,
gitignored) · `reader/` (shared engine: `generate-reader.js` + `DOCS_CONFIG` + `diagrams.js`;
copy + rebrand, never rewrite; built at the END of a study).

**Rule 1 (load-bearing): docs are claims, code is the authority.** Count FIRST — a doc tree can be
93% of a repo; the same claim repeated 180× is one claim. **The migration history is the most
honest document in a repo.**

## Platform studies
| # | Platform | Status | One-line verdict |
|---|---|---|---|
| 1 | Hermes forensics | ✅ 13/13 | Main AI engine; never fork it. "OpenCode" = a provider, not a coding agent. |
| 2 | Paperclip 0.3.1 | ✅ 7/7 | **P2/P3 = strength**, P1 = seam-provider. No multi-tenancy, no composer. |
| 3 | CrewAI 1.15.28 | ✅ 7/7 | **Mechanism donor, NOT an architecture template.** Executor yes, delivery no, tenancy nowhere. |
| 4 | Multica 0.2.0 | ✅ 7/7 **+ r3300** | **All three poles real — closest neighbour.** No widget model; no engine of its own. |
| 5 | Gas Town 1.2.1 | ✅ 7/7 **+ r3400** | Go multi-agent orchestration. **The watchdog chain is made of agents**; Hook = durability primitive; ZFC = transport, don't decide; 3-layer sandbox. **NO widget model.** Top mechanisms = DECIDED LIMITS. |
| 6 | n8n 2.44.0 | ✅ 7/7, 73 findings, **r3500** | **P1:** `@n8n/agents` (SKILL.md, sub-agents, guardrails). **P2:** `Project personal\|team`, **10 roles + 206 scopes**. **★ PX-W: FIRST real composition surface** — canvas of 7 element types, 129-component design system + own ESLint plugin, CRDT on y-websocket. Reader 8 docs / 153,204 chars. |
| 7 | buzz 0.5.28 | ✅ 7/7 **+ r3600** | **Team workspace on Nostr (NIP-01)**; relay = source of truth; **community = tenant** (host-resolved, TLA+/Tamarin + prose contract). 34 Rust crates, 62 migrations, **90 findings**. Reader 8 docs / **347,516 chars**. |
| 8 | **openrig 0.6.10** | ✅ **7/7** (reader 3700 next) | TS monorepo; daemon+CLI+TUI+MCP orchestrating **unmodified Claude Code / Codex** in tmux. **★ P2: NO tenancy at all — first in the study** (0 `tenant_id`; static bearer token = fully privileged; boundary = loopback/Tailscale). **P1: the two-surface rule** (launch flags may be deterministic code; config-file policy may NOT) → 5 permission policies (`locked`/`standard`⭐/`open` + `yolo`/`auto`). **★ PZ = the study's most transferable: the gate culture** — 4-rail exclusion ledger (green-with-exclusions + **mechanical expiry**; ships EMPTY by design), *"a green is only as good as what could have been red"*, *"two reads of the same flag can diverge; one cannot"*. **★ PX: NO widget model (6th in study)** — the one composition system (Context Packs) composes **prompts**. **★ The digital-twin harness** (real UI + fixtures typechecked vs real interfaces → drift breaks the build). 3,685 files, 105 migrations, daemon :7433, 79 findings / 34 divergences. **RIGGED rename hazard** (284 occ / 85 files). |
| — | mattermost, zulip | ⬜ 2 remain | Order not fixed — **ASK before extracting more (~700 MB / ~63 MB).** |

**★ STUDY CHAIN (8 CLOSED, readers pending for openrig):** Hermes 13/13 · Paperclip · CrewAI ·
Multica (+r3300) · Gas Town (+r3400) · n8n (+r3500) · buzz (+r3600) · **openrig (study DONE
`1d56d22`; reader 3700 next)** — then **ASK** for the 9th (mattermost / zulip) — then the
cross-platform mapping pass.

**OpenRig chain:** `d7114a8` (b00) · `2989111` (b01) · `5f5fa77` (b02) · `206530e` (b03) ·
`0b1d6dc` (b04) · `bae9a99` (b05) · `031022d` (b06) · **`1d56d22` (b07 synthesis)** — **COMPLETE**.
Remaining: **reader 3700**.

**buzz (b00 `4304e7f` → b07 `87d9135`; reader `bfc3833`) — load-bearing facts.** *(Detail → logs 2026-10-16 + findings files.)*
1. **★ An event log is NOT a widget model.** buzz composes signed events w/ integer kinds (136 in
   `ALL_KINDS`) — **5th platform with NO widget model**; the one composition-shaped surface
   (Channel Canvas `kind:40100`) is a document, not a widget tree. Policy = *"prefer a new kind over
   a new HTTP endpoint."*
2. **★ PZ = the strongest in the study — five artefacts across THREE languages:** a 1,110-line
   prose contract (10 axioms, one §Conformance gate each) · `MultiTenantRelay.tla` (12 invariants,
   13 mutations, 4 deliberately-FALSE vacuity probes) · `MultiTenantAuth.spthy` (21 lemmas, security
   proven UNDER key compromise) · a runtime conformance harness whose **`LIMITS.md` names 7 blind
   spots + the un-armed read-seam** · a `CommunityId` fence that calls itself *"a lint fence, not a
   compiler fence."* **Batch-07 recs (take all 5):** `LIMITS.md` per gate · prove the tripwire fires
   · guard-as-document · prose contract beside any formalism · rename hazard on the retirement list.
3. **Retirement surface = richest (rule 10).** 23 of 62 migrations have a drop/retire flavour;
   `0044` drops a whole 14-table ledger. `sprout → buzz` rename left residue (repo URL, `AGENTS.md`,
   a crate still named `sprig`). **The versioned audit hash chain is rule 10 done RIGHT.**
4. **Honest ledger:** no Postgres RLS; the approval gate is **DEAD CODE**; 2 of 7 automation actions
   are stubs; **`bypass-permissions` is buzz's DEFAULT** (opposite of our default-deny).
5. **★ F7-1 (rule 13): "the kinds count" is THREE counts** in one `kind.rs` — 157 `pub const` ·
   135 `KIND_*: u32` · 136 in `ALL_KINDS`. Batch 01's 135/136 was right; b05's "157" was imprecise.

**Multica (75 findings, b01 `4cf7f35` … b07 `afed823`) — 3 load-bearing facts.**
1. **Machine ≠ teammate** (`agent_runtime` vs `agent`; `UNIQUE (workspace_id, daemon_id, provider)`
   = the one-tenant-one-engine primitive). **CC-84 narrowed, not solved.**
2. **The one-statement claim** (`FOR UPDATE SKIP LOCKED` + total order + health gate INSIDE the
   claim); 27-value failure taxonomy. *The migration chain, not the schema, is the truth.*
3. **The container: 144 tables, 82 carry `workspace_id`.** 3-package PX-F layering whose constraints
   are **prohibitions**. **NO widget model.** Migration `344` deletes the ENTIRE Plugin V1 (14 DROP
   TABLEs) → 3 tables.

## Standing hazards (still bite)
- **Line endings:** this repo's convention is **CRLF committed as-is** (`core.autocrlf=true`; no
  `.gitattributes`). Every study file — old and new — has CRLF in the committed object. A file whose
  CR count == its line count is NORMAL here; do not "fix" it. No BOM, ever.
- **Git-Bash `grep -c $'\r'` LIES** (reports lines); byte truth = `od -c f | grep -o '\r' | wc -l`.
- **Never `git add -A`** — explicit paths. Docs repo = `C:/Users/Ramzi/Downloads/companai`.
- **A committed number can be wrong** — re-measure before citing (rule 13); the fix is a new commit
  that *names* the correction, never a silent edit.
- `tsc` needs `--incremental false`; jest does NOT type-check. node→node spawn throws `EBUSY`.
- **How to report to Ramzi:** plain words · named thing → what it means → why it matters → risk →
  **ranked options + one recommendation** → the single decision he must make. **Never end on "your call."**

## Live code frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
**★ NEXT = `P2-9b`** — default-flip to Hermes + OpenCode deletion + `CC-74` retirement.
**`CC-84` (tenancy, drives the whole study):** worker MCP calls authenticate as ONE superadmin
identity → a Hermes turn runs platform tools OUTSIDE the chat's tenant; one shared `HERMES_HOME`.
Ranked: per-run minted credential (recommended) → interim single-tenant fail-closed guard →
doc-only rejected. Also open: `CC-81`, `CC-83`, `CC-51` (falsified).
Owner decided: **core architecture first — business modules generated from the core workspace.**
