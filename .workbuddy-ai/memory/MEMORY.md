# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` + daily logs + `JOURNAL.md`. New work: HERE + today's log.

## ★ ARCHITECTURE WORKSHOP — `library/architecture/` (the active stage)
**Method (binding):** study platforms ONE AT A TIME; find what fits the **three poles**
(**P1 aissistant · P2 workspace · P3 automations**) + widgets/frontend (PX-W/PX-F) +
escape hatch (PZ); then **map** each pole across ALL platforms vs mercato → a clean **SRS**;
then build **one-tenant ↔ one-Hermes**. **No development before a written requirement.
Hermes must NOT be forked or edited. Markdown is the source of truth — never edit it to fit
a reader.** Owner's frame: *"Do NOT be casual… everything we learn now will help us later."*

**Layout:** `<platform>-forensics/` (`00-PIN-AND-METHOD.md` + `findings/01..07`) ·
`platforms/` (zips + `references.md`; extracts at **`platforms/_extracted/<name>/`**, gitignored
— NOTE the real path is `library/architecture/platforms/`, not the forensics dir) ·
`reader/` (the shared engine: `generate-reader.js` + `DOCS_CONFIG` + `diagrams.js`; copy +
rebrand, never rewrite; built at the END of a study).

**Rule 1 (load-bearing): docs are claims, code is the authority.** Count FIRST — a doc tree can
be 93% of a repo (CrewAI) and hide the code; a generated file can be 97% of a "core" package;
the same claim repeated 180× is one claim. **Read the migration history: the most honest doc.**

## Platform studies
| # | Platform | Status | One-line verdict |
|---|---|---|---|
| 1 | Hermes forensics | ✅ 13/13 | Main AI engine; never fork it. "OpenCode" = a provider, not a coding agent. |
| 2 | Paperclip 0.3.1 | ✅ 7/7 | **P2/P3 = strength**, P1 = seam-provider. No multi-tenancy, no composer. |
| 3 | CrewAI 1.15.28 | ✅ 7/7 | **Mechanism donor, NOT an architecture template.** Executor yes, delivery no, tenancy nowhere. |
| 4 | **Multica 0.2.0** | ✅ 7/7 **+ reader 3300** | **All three poles real — the closest neighbour.** No widget model; no engine of its own. |
| 5 | **Gas Town 1.2.1** | ✅ 7/7 **+ reader** | Go multi-agent orchestration. **The watchdog chain is made of agents**; agents ARE beads; Hook = the durability primitive; ZFC = transport, don't decide; 3-layer sandbox. **NO widget model.** Top mechanisms are DECIDED LIMITS. |
| 6 | **n8n 2.44.0** | ✅ 7/7, 73 findings, **reader 3500** | TS monorepo, 22,715 `.ts` (65% of bytes), 57 pkgs, 563 nodes. **P1:** `@n8n/agents` v0.29.0 (fluent builder, SKILL.md, sub-agents, guardrails=`allow`\|`stop(code)`, cost-as-guardrail). **P2:** `Project personal\|team`, **10 roles + 206 `resource:action` scopes**, `User` ≠ `AuthIdentity`. **P3:** best security surface pre-buzz (isolate pool + zod RPC boundary; observability = sampling policy). **★ PX-W: FIRST real composition surface** — canvas of **7 element types**, **129-component design system** w/ its own ESLint plugin, **CRDT on y-websocket**. **PZ:** 299 hashed arch violations + 110 boundary issues; `agent-check.mjs` (excerpt→agent, full→disk). FAIR-CODE (`.ee` unlicensed). Reader: 8 docs / 23,092 words / 153,204 chars, 8/8 fidelity. |
| 7 | **buzz 0.5.28** | ✅ **7/7 + reader 3600** | **Self-hosted team workspace on Nostr (NIP-01)** — every action is a signed event with a `kind`; the relay is the single source of truth; **community = tenant** (host-resolved) with **TLA+/Tamarin + a prose contract**. Apache-2.0, no licence gate. 34 Rust crates, 62 migrations, 11 `VISION_*.md`. **90 findings**. Reader: 8 docs / 52,730 words / **347,516 chars** / 8/8 fidelity (char total = source JS code-units exactly). |
| — | openrig, mattermost, zulip | ⬜ 3 remain | Order not fixed — **ASK before extracting more (~700 MB each).** |

**buzz (b00 `4304e7f` → b07 `87d9135`) — the load-bearing facts.**
*(Full detail → daily logs 2026-10-16 + the findings files.)*
1. **★ THE STUDY'S ANSWER: an event log is NOT a widget model.** buzz composes **signed events
   with integer kinds** (136 registered in `ALL_KINDS`), never UI elements — **5th platform with
   NO widget/composer model** (proven: 27 `widget` hits tree-wide; the only `CREATE TABLE widgets`
   is a *negative fixture inside `#[test]`*). The one composition-shaped surface (Channel Canvas,
   `kind:40100`) is a **document w/ optimistic concurrency**, not a widget tree. Policy =
   *"prefer a new kind over a new HTTP endpoint."* → **F7-2.**
2. **★ PZ is the STRONGEST in the study — five artefacts across THREE languages.** (a) The
   **prose contract `docs/multi-tenant-relay.md` (1,110 lines, `draft`)** — 5 non-goals, **10
   axioms each admitted per deployment by a §Conformance gate**, Implementation Correspondence
   naming the obligations that **fail SILENTLY**. Its own line: *"'Provably isolated' without
   naming the trust boundary does not survive scrutiny."* (b) `MultiTenantRelay.tla` (1,142 lines,
   12 invariants, **13 mutations / 6 Confirmed red**, **4 deliberately-FALSE `Probe_*_Unreachable`
   vacuity probes**). (c) `MultiTenantAuth.spthy` (748 lines, **21 lemmas; security lemmas proven
   UNDER key compromise**). (d) The **runtime conformance harness** (`buzz-conformance`, 1,775
   lines, 16 tests, `EmitGuard` = a `Drop` guard turning a silent omission into a failure) whose
   **`LIMITS.md` names 7 blind spots + the read-seam half that is NOT armed** ← the batch's #1
   recommendation. (e) **`CommunityId(Uuid)`** fence whose own docblock calls itself *"a
   lint-and-review fence, not a compiler fence."* → **F6-26/F6-27, D6-1.**
3. **★ THE RECOMMENDATION SET (batch 07 §9 — take ALL FIVE):** (1) **`LIMITS.md` for every gate**
   (blind spots + owners + unarmed halves); (2) **"prove the tripwire fires"** — one mutation test
   per check; (3) **the guard-as-document pattern** (shared `-core` script + per-app wrapper +
   **reason-annotated allowlist keyed per-rule** + a place in the default gate); (4) **the prose
   contract** beside any formalism (non-goals · one axiom per assumption · a gate per axiom);
   (5) **the rename hazard on the retirement checklist** — grep the *metadata*, not just code.
   All five are documents/tests, not systems, and each has a **stated wrong answer** in buzz.
4. **The retirement surface is the study's richest (rule 10).** **23 of 62 migrations** have a
   drop/retire flavour; the sharpest is migration `0044` dropping the **whole Phase-A NIP-FI
   ledger (14 tables, CASCADE)** with the reason in the file. **A product rename executed as
   scoped PRs** (`sprout → buzz`; #958/#1012/#1043/#1333) with **residue never renamed** →
   `sprout` repo URL in `Cargo.toml`, `squareup/sprout-oss` in `AGENTS.md`, a crate still named
   `sprig` (a `argv[0]` multiplexer). **The versioned audit hash chain is rule 10 done RIGHT**
   (v1 retained + its ambiguity *proven by a test*; v2 shipped without invalidating history).
5. **Honest ledger (all stated by buzz in-tree, or measured):** **no Postgres RLS** (0 `CREATE
   POLICY` in 62 migrations); **the approval gate is DEAD CODE** (~330 lines grant/deny/resume
   unreachable; `create_approval` has zero production callers); **2 of 7 automation actions are
   stubs** (`send_dm`, `set_channel_topic`); **`bypass-permissions` is the default mode** (the
   exact opposite of our default-deny); cross-pod leaks out of the conformance gate's scope.
6. **★ D6-1 (corrected before commit): the prose contract EXISTS** (1,110 lines) — an earlier
   "file is absent" claim was **FALSE and removed**. The real divergence runs the *other* way:
   the spec's P3/HA status **aged BEHIND the code** — a shared community-scoped **Redis
   `SET NX EX` replay guard** (`buzz_pubsub::RedisNip98ReplayGuard`, `DEFAULT_REPLAY_TTL_SECS=120`
   w/ a **compile-time `assert!` floor**, cross-pod case **tested by name**) + the chart
   **template-failing** without Redis. **= the second-order rename hazard: a SAFETY STATUS left
   behind.**
7. **★ F7-1 (rule 13, corrected): "the kinds count" is THREE counts** in one 1,177-line
   `kind.rs` — **157** total `pub const` · **135** `KIND_*: u32` · **136** entries in
   `ALL_KINDS` (= 135 − 3 unregistered [`KIND_AUTH` 22242, `KIND_NOSTR_IDENTITY_BINDING` 24243,
   `KIND_PUSH_LEASE` 30350] + 4 `RELAY_ADMIN_*` aliases). **Batch 01's 135/136 was right; batch
   05's "157 kinds" was the imprecise one** (corrected in place). Earlier batches: b01 `78c19c5` ·
   b02 `b5d04f7` · b03 `5778017` · b04 `c9bbfc1` · b05 `aad1f45` · **b06 `ab78e4a`** · **b07 `87d9135`**.
8. **b04 (P3)**: workflow crate = 5 files / 5,263 lines, 77-line `ActionSink` seam; **5 triggers
   in code vs the doc's 4**; delay caps at **270 s not 300 s**; cross-pod at-most-once is
   **deterministic, not locked** (`INSERT … ON CONFLICT DO NOTHING`); conformance suite *refuses
   to fake a green*, naming `pending_lane WF-08`.** b05**: `check-px-text` + `check-pubkey-truncation`
   (**a truncated id a human trusts is FORGEABLE by vanity-grinding**; ad-hoc truncation had
   fragmented into 5 formats) + a differential size ratchet; **two dials through one virtual rem**
   (`--buzz-type-rem`); desktop `src-tauri/src` = **194,385 lines / 385 `#[tauri::command]`** (the
   bridge is a 2nd application); **mobile = 456 Dart files / ZERO Rust**. **b02**: agent = keypair +
   membership; NIP-OA owner attestation (does NOT rewrite authorship); memory = NIP-AE engrams.

**Multica (75 findings, b01 `4cf7f35` … b07 `afed823`) — 3 load-bearing facts.**
1. **Machine ≠ teammate.** `agent_runtime` vs `agent`, two rows, `UNIQUE (workspace_id, daemon_id,
   provider)` = **the one-tenant-one-engine primitive**; skills are TWO kinds; permissions =
   `permission_mode` + a stacking allow-list, deny-by-default. **CC-84 narrowed, not solved.**
2. **The one-statement claim** (`agent.sql:749-810`): `FOR UPDATE SKIP LOCKED` + total order +
   per-(issue,agent) serialization + the health gate **inside** the claim; a **27-value failure
   taxonomy**. `sys_cron_executions` = the row is **both the distributed lease and the audit log**.
   *The migration chain, not the schema, is the truth* (two indexes built/dropped/rebuilt twice).
3. **The container: 144 tables, 82 carry `workspace_id`.** Members `owner|admin|member`; last owner
   protected in 3 code paths. PX-F: 3-package layering whose constraints are **prohibitions**; UI
   JSON via zod + `parseWithFallback`, **never `as T`**. **NO widget/composer model.** Migration
   `344` deletes the ENTIRE Plugin V1 (14 DROP TABLEs) → 3 tables. Reader: 8 docs / 26,624 words,
   port 3300 — the engine was NOT platform-agnostic (4 hardcoded "CrewAI" strings; fixed).

**★ STUDY CHAIN (7 CLOSED, all with readers):** Hermes 13/13 · Paperclip · CrewAI · Multica
(+r3300) · Gas Town (+r3400) · n8n (+r3500) · **buzz (study DONE + reader `bfc3833`, port 3600)** —
then **ASK** which of openrig / mattermost / zulip is 8th — then the cross-platform mapping pass.

## Standing hazards (still bite)
- **Git-Bash `grep -c $'\r'` LIES** (reports lines); byte truth = `od -c f | grep -o '\r' | wc -l`.
- **Write BYTES, not text** — Python `open(p,'w')` flips LF→CRLF; always pass `newline=''`.
- **Never `git add -A`** — explicit paths. Docs repo = `C:/Users/Ramzi/Downloads/companai`.
- **A committed number can be wrong** — re-measure before citing (rule 13); the fix is a new
  commit that *names* the correction, never a silent edit.
- `tsc` needs `--incremental false`; jest does NOT type-check. node→node spawn throws `EBUSY`.
- **How to report to Ramzi:** plain words · named thing → what it means → why it matters →
  risk → **ranked options + one recommendation** → the single decision he must make.
  **Never end on "your call."**

## Live code frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
**★ NEXT = `P2-9b`** — default-flip to Hermes + OpenCode deletion + `CC-74` retirement.
**`CC-84` (tenancy, drives the whole study):** worker MCP calls authenticate as ONE superadmin
identity → a Hermes turn runs platform tools OUTSIDE the chat's tenant; one shared `HERMES_HOME`.
Ranked: per-run minted credential (recommended) → interim single-tenant fail-closed guard →
doc-only rejected. Also open: `CC-81`, `CC-83`, `CC-51` (falsified).
Owner decided: **core architecture first — business modules generated from the core workspace.**
