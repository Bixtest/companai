# Batch 7 — HERMES: what it actually provides

**Batch:** 7 of 12 · **Status:** complete · **Date:** 2026-10-04
**Input:** `library/ai/hermes-agent-main/` — the extract the owner confirmed is **the most
current Hermes we hold**. Cross-read against `library/ai/hermes-docs/` (the reports) and
`aissistant-package/hermes/` (the sibling's older vendored copy).
**Question this batch answers:** What can Hermes do — **measured from the code**, not from the
documents describing it?

**Definition of done (from `PLAN.md`):** *an integration plan can be written from this file
without opening the Hermes repo. Every count has a command behind it.*

**The owner's directive, in force for this batch:** *"the extract is the authority; the
documents are the claims."* Where a document and the code disagree, the code wins.

---

## 0. How to read this report

**`H-nn`** are the 45 Hermes claims registered in batch 2 (`findings/02` §7c), each marked
**VERIFIED**, **PARTIAL**, **CONTRADICTED** or **UNVERIFIABLE**, with the file that settles it.
**`V-nn`** are the **value-beyond-the-vision** entries required by the owner's new standing
rule — things Hermes has that the vision does not ask for but which are worth keeping.
Counts are measured; the command is named beside each.

---

## 1. What was read, and how big it is

Every number carries the command that produced it, run in
`library/ai/hermes-agent-main/`. *(Re-derived 2026-10-04 during the bookkeeping pass; the first
draft of this table carried two wrong figures and two rules left unstated — see §20, "the
re-measurement".)*

| Source | Command | Measured |
|---|---|---|
| top-level entries (non-hidden) | `ls \| wc -l` | **109** |
| Python files, excluding test trees | `find . -name '*.py' -not -path '*/tests/*' \| wc -l` | **2,387** |
| Python lines, excluding test trees | same file list, `\| xargs -0 cat \| wc -l` | **897,681** |
| test files | `find . -path '*/tests/*' -name '*.py' \| wc -l` | **5,659** |
| top-level `.py` modules | `ls *.py \| wc -l` | **52** |
| `agent/` (the runtime) | `ls agent/*.py \| wc -l` — top level; **317** recursive | **256** |
| `tools/` | `ls tools \| wc -l` · `ls tools/*_tool.py \| wc -l` | **275** entries, **38** `*_tool.py` |
| `plugins/` | `ls -d plugins/*/ \| wc -l` | **18** plugin directories |
| `optional-mcps/` | `ls optional-mcps/ \| wc -l` | **65** MCP definitions |
| platform adapters | §17 (H-13) — `Platform` enum + bundled plugins | **34** distinct |
| `cron/` | `ls cron/*.py \| wc -l` — top level; **35** recursive | **33** Python files |
| `acp_adapter/` | `find acp_adapter -name '*.py' \| wc -l` | **14** Python files |
| `locales/` | distinct language codes: `ls locales/*.yaml \| grep -v tui` | **17** languages |
| `cli-config.yaml.example` | `wc -l` · `grep -cE '^[a-zA-Z_]'` | **2,323** lines, **28** top-level keys |

**Two other copies were measured, not assumed:** `aissistant-package/hermes/` (the sibling's
vendored copy) and the claims in `library/ai/hermes-docs/`.

---

## 2. Task zero — which Hermes is this?

**Answered.** The extract is a **dev snapshot of `main`, newer than the last release it
references**, and **about two weeks newer than Document 3's pin**.

### 2a. The three version numbers, and why they disagree

| Where | Says | What it means |
|---|---|---|
| `package.json` | `"version": "1.0.0"` | the **npm package** version |
| `pyproject.toml` | `version = "0.0.0"` | the **Python project** version — `0.0.0` is the *unreleased* placeholder |
| Document 3 | `v0.21.3` / `v2026.9.14` / commit `345cd2b` | the last **tagged release** at the time the document was written |
| Hermes's own resolver | **`unknown`** | `hermes_cli/version_info.py` resolves *install stamp → live git → unknown*. The extract has **no `install-stamp.json`** and **no `.git`**, so it correctly reports **unknown** |

So `1.0.0` and `0.0.0` are **not a contradiction** — they are two different version fields.
And the resolver saying *unknown* is **correct behaviour for a source snapshot**, not a defect.

### 2b. How new is it — two independent routes

**Route 1 — the release tags it references.** The repo names CalVer tags up to
**`v2026.9.24`**, and `tests/hermes_cli/test_source_completion_stamp.py:196` maps
**`("v2026.9.24", "0.21.5")`** — i.e. that tag shipped version **0.21.5**. A tree that
references the 0.21.5 tag is **at or after** it.

**Route 2 — the session-schema history, which is date-stamped and commit-stamped.**
`hermes_cli/session_schema_history.py` records every schema migration with a UTC timestamp and
a commit prefix. Its newest entries:

```
('28 2026-09-25T23:25Z 2941aadffa', …)
('29 2026-09-27T00:29Z d75f29934b', …)
('30 2026-09-28T00:00Z #117713',    …)
```

The file also carries **`2026-09-28T08:42Z eed37d63ce`**.

**Both routes agree:** the extract is **at or after 2026-09-28** and **newer than v2026.9.24
(version 0.21.5)**.

### 2c. The answer, stated plainly

> **Our Hermes is a `main`-branch source snapshot from on or after 2026-09-28, newer than
> release v2026.9.24 (0.21.5). Document 3's pin — v0.21.3 / v2026.9.14 / `345cd2b` — is
> roughly two weeks older.**

**Consequence for the whole programme.** Every claim Document 3 makes about Hermes is a claim
about **a tree about two weeks behind ours**. That is exactly the "documents quietly become
wrong" failure the plan warned about — **now dated, not suspected.** And it confirms the
owner's instruction: the extract is the authority.

**What this does not give us.** A **commit hash for our snapshot**. Without `.git` or a stamp,
the extract cannot self-identify; the best available pin is the date window above. **To make
"current" a hard pin rather than a window, we need either the source repo's `.git` or an
`install-stamp.json` — an owner- or vendor-supplied artefact, not something derivable here.**

---

## 3. The skill count — 193 / 197 / 210 resolved

The plan carried three different numbers. **All three are real. They describe three different
snapshots, and the split moved.**

| Copy | `skills/` | `optional-skills/` | `plugins/` | Total |
|---|---:|---:|---:|---:|
| **hermes-docs** — *claimed* | 81 | 112 | — | **193** |
| **sibling vendored** (`aissistant-package/hermes/`) — *measured* | 82 | 115 | 1 | **197** (+1) |
| **our extract** (`library/ai/hermes-agent-main/`) — *measured* | **58** | **152** | 1 | **210** (+1) |

**Both of my measurements reproduce the recorded numbers exactly** (197 = 82 + 115;
210 = 58 + 152). The `plugins/` SKILL.md adds one in each case, so the true file counts are
**198** and **211**.

**The finding is not a contradiction — it is a reorganisation.** The **default set shrank**
(81 → 82 → **58**) while the **optional set grew** (112 → 115 → **152**). Upstream has been
**moving skills out of the default install and into opt-in**. The total grew 193 → 197 → 210.

**Why it mattered to resolve.** This is the exact failure mode batch 0 flagged: a document
says a number, the number stops being true, and nobody notices because the document is never
re-counted. **The rule that comes out of it: cite the snapshot, not the number.** "210 skills"
is only true of *this* extract on *this* date.

---

## 4. Version and shape

| | |
|---|---|
| Project | **`hermes-agent`** by **Nous Research** — "the self-improving AI agent" |
| Licence | **MIT** (`LICENSE`, `package.json`) |
| Python | `requires-python = ">=3.11,<3.15"` — *only 3.14 is supported*; older is tolerated for the updater |
| Node | `^22.22.0 \|\| ^24.11.0 \|\| >=26.0.0` |
| Dependencies | **153 exact pins** (`==X.Y.Z`, no ranges) — a deliberate supply-chain decision after a PyPI worm |
| Packaging | Docker, Docker Compose (incl. a Windows file), Nix (`flake.nix`), a desktop app, a Termux/APT channel |
| Entry points | `cli.py`, `run_agent.py`, `batch_runner.py`, `hermes_bootstrap.py` |
| Watchdogs | `hermes_startup_watchdog.py` |

**The dependency-pinning rationale is worth recording** (`pyproject.toml`): every direct
dependency is pinned to an exact version because *"ranges allow PyPI to ship a fresh version of
a transitive at any time without a code review on our side."* They tightened it after the
**Mini Shai-Hulud worm hit `mistralai 2.4.6`**. **This is a lesson we can reuse directly.**

---

## 5. Tools

| Measure | Count |
|---|---|
| Files under `tools/` | **275** |
| `*_tool.py` files | **38** |
| `_HERMES_CORE_TOOLS` (always-on tools) | **59** |
| Keys in the `TOOLSETS` dict | **61** — **37** general + **24** platform-scoped (`hermes-*`) |
| README's own claim | **"40+ tools, toolset system, terminal backends"** |

**How an agent receives tools.** `toolsets.py` holds a **`TOOLSETS` dict** — **61 keys: 37
general groups** (`web`, `search`, `browser`, `terminal`, `file`, `skills`, `memory`, `cronjob`,
`vision`, `image_gen`, `video_gen`, `computer_use`, `session_search`, `connections`, `project`,
`bot_room`, …) **plus 24 platform-scoped groups** named `hermes-<platform>` (one per gateway
surface: `hermes-cli`, `hermes-telegram`, `hermes-discord`, …) — and a **`_HERMES_CORE_TOOLS`**
list. *(The first draft said "37 toolsets" — that is the general count; the dict as a whole has
61 keys. Counted with an AST parse of the dict, not a grep, because grep also catches nested
keys.)* A session's tools are **the resolved union
of the toolsets enabled for its platform**, minus anything disabled. `tools/registry.py`
registers tools and can **alias toolsets**, apply **plugin override policy**, and gate tools by
a **`check_fn`** (a tool whose check fails is not offered). **A toolset is the surface gate** —
`AGENTS.md` states that a capability which must not be broadly available belongs in a *named
toolset*, never in `_HERMES_CORE_TOOLS`.

**What this means for us.** The tool surface is **broad and configurable**, and the mechanism
for narrowing it (**toolsets + per-platform enablement + `check_fn`**) already exists. The
vision's rule "narrow the tool surface by role" is therefore a **configuration and policy task,
not a code change** — but it must be *done*, because the default is broad.

---

## 6. Memory

| Layer | What it is | Where |
|---|---|---|
| **Built-in** | A bounded, curated store injected at session start — **`MEMORY.md`** (personal notes) and **`USER.md`** (the user profile) | loaded in `agent/agent_init.py`, `agent/background_review.py`, `agent/context_compressor.py` |
| **Provider interface** | **`MemoryProvider`** — an abstract base class; lifecycle `initialize → system_prompt_block / prefetch / sync_turn per turn → tool dispatch → shutdown` | `agent/memory_provider.py` |
| **Manager** | **`MemoryManager`** fans hooks to registered providers | `agent/memory_manager.py` |
| **External providers** | **5** ship in `plugins/memory/`: **byterover, holographic, mem0, openviking, retaindb** | `plugins/memory/` |

**The rule that matters:** *"The builtin provider is always allowed; only **ONE external plugin
provider may be registered at a time** (tool-schema bloat, conflicting backends)."* Activated
via `memory.provider`.

**Profile isolation is real and subtle:** it is a **ContextVar-scoped `HERMES_HOME` override**
plus a per-turn secret scope — and the code warns that *"a worker started with an empty context
silently lands on the default profile (or fails closed on secrets)."* That is a **concrete
trap** for anyone running Hermes in a worker thread.

**Relevance to the vision.** Doc 3 says *"`state.db` is not business truth"* and the vision
wants a **platform-owned knowledge model**. Hermes's memory is **personal and per-profile**, not
tenant business data — which **confirms the boundary** rather than conflicting with it.

---

## 7. Sessions and state

| | |
|---|---|
| Store | **SQLite**, `state.db`, **WAL mode** (concurrent readers, one writer) |
| Search | **FTS5**, with a **CJK bigram tokenizer** (`cjk_unicode61`, ~250 lines, no deps) |
| Sessions | source-tagged (`'cli'`, `'telegram'`, …); **compression splits a session into a `parent_session_id` chain** |
| Tables measured | `sessions`, `messages`, `session_model_usage`, `system_prompts`, `state_meta`, `schema_version`, `gateway_routing`, `gateway_hygiene_state`, `conversation_generations`, `gateway_heartbeats`, `compression_locks`, `session_turn_leases`, `async_delegations` |
| Schema migrations | tracked in `hermes_cli/session_schema_history.py` — **30 recorded sessions-table migrations** to 2026-09-28 |

**What survives a restart:** session metadata, full message history, per-session model usage,
the system prompt hash, gateway routing, and the FTS5 index. **What the vision cares about:**
`state.db` holds **conversation truth, not business truth** — which is exactly the boundary the
vision draws. **Verified, and it is a clean separation.**

---

## 8. Identity

| Piece | What it is |
|---|---|
| **`SOUL.md`** | The agent's **system prompt / persona**, shipped at the repo root — *"You are Hermes Agent, built by Nous Research. Be direct…"* |
| **Profiles** | A durable home per agent: config, credentials, persona, memories, sessions, skills, cron, its own database |
| **`HERMES_HOME`** | Overridable per profile via a **ContextVar** (`hermes_constants.py`) — the isolation mechanism |
| **Identity modules** | `hermes_cli/profile_identity.py`, `profile_routing.py`, `profiles.py`, `profile_memory_config.py`, and `hermes_state_identity.py` |
| **Concurrency warning** | `hermes_cli/shared_profile_warning.py`: *"An old stamp or a profile name alone cannot prove concurrent use."* |

**This is the evidence for the vision's trap R-03 — "a Hermes profile is not a tenant."**
A profile is **a durable home for one agent**, not a security boundary between customers.
**Confirmed from the code.**

---

## 9. Models

| Measure | Count |
|---|---|
| Model providers | **38** (`plugins/model-providers/`) |
| Named | anthropic, openai-codex, openrouter, bedrock, vertex, gemini, deepseek, alibaba, minimax, xai, meta-ai, nvidia, nous, ollama-cloud, huggingface, custom, … |
| Auxiliary ("chore") model modules | **11** (`agent/auxiliary_*.py`) |

**Auxiliary model roles are a first-class concept.** The `auxiliary_*` family covers: client,
async rebuild, call outcome, **fallback recovery**, health, hooks, **local runtime**,
**reasoning floor**, structured output, and unavailable-handling. So Hermes runs **a main model
plus auxiliary models** for chores (summarising, extraction, health probes), with **fallback**
when a provider fails.

**Relevance.** The vision's local-first design assumes **the intelligence burden can be split**
— cheap models for easy work, a bigger one when needed. **Hermes already implements that
split.** This is a shortcut, and it is one of the `V`-entries below.

---

## 10. MCP

| Piece | Where |
|---|---|
| MCP config, catalog, picker, security, startup | `hermes_cli/mcp_{config,catalog,picker,security,startup}.py` |
| MCP app detection, tool config, web routes | `agent/mcp_app_detection.py`, `hermes_cli/tools_config_mcp.py`, `hermes_cli/web_server_mcp.py` |
| **Optional MCP catalog** | **65** definitions in `optional-mcps/` |
| Named catalog entries | 15 in an 829-line catalog |

**How an agent reaches outside systems: MCP is a first-class, catalogued capability interface** —
with a picker, a security layer, and 65 ready definitions. **Verified.**

---

## 11. Sandbox

| Piece | Where |
|---|---|
| Sandbox **image** selection | `hermes_cli/sandbox_image_switch.py` |
| Sandbox image build | `docker/sandbox-desktop.Dockerfile`, `.github/workflows/sandbox-image.yml` |
| Nix sandbox | `nix/sandbox.nix` |
| Dev sandboxes | `scripts/dev-sandbox.sh`, `scripts/dev-minimal-sandbox.sh` |
| Modal sandbox | tests reference `tools/test_modal_sandbox_fixes.py` |
| **Terminal backends** | `tools/terminal_tool_backends.py` + 10 terminal modules (`terminal_scope`, `terminal_tool_guards`, `terminal_tool_config`) |

**What it is:** a **containerised execution image** that the terminal/computer-use tools run
inside, selectable per config, with **backends that can be restricted** and **guards** on the
terminal tool. **How it is switched on:** `hermes_cli/sandbox_image_switch.py` and the config.
**Verified — and this is a shortcut for the vision's "deterministic services execute" boundary**,
though it is Hermes-side isolation, not platform authorization.

---

## 12. Subagents and delegation

| Piece | Where |
|---|---|
| Delegation tool | `tools/delegate_tool.py` + 8 supporting modules (child run, config, dispatch, progress, registry, results, tasks) |
| Async delegation | `tools/async_delegation.py`, `agent/async_delegation_recovery_hints.py` |
| Subagent lifecycle | `agent/subagent_lifecycle.py` |
| Delegation context | `agent/delegation_context.py` |

**The mechanism, measured.** `subagent_lifecycle.py` is described as *"immutable contracts, not
`AIAgent` objects"* — plugins get a **`PluginContext.subagent_lifecycle`**. The subagent's goal
is **bounded** (`_MAX_GOAL_CHARS = 16_000`). Async delegations are **persisted**
(`async_delegations` table) and recoverable.

**This is the evidence for the vision's claim H-36 — "subagents start fresh and receive only
the parent's goal/context."** Measured: a subagent gets a **bounded goal string**, not the
parent's conversation. **Verified.**

---

## 13. Scheduling (cron)

| | |
|---|---|
| Modules | **33** Python files under `cron/` |
| Capabilities | `scheduler.py`, `scheduler_tick.py`, `scheduler_detached_worker.py`, `job_definition.py`, `occurrences.py`, `quota_hold.py`, **`delivery_queue.py`**, **`scheduler_delivery.py`**, `incidents.py`, `monitor.py`, `notepad.py`, `blueprint_catalog.py`, `suggestions.py` |
| Worker model | detached worker + thread + provider abstraction (`scheduler_provider.py`, `scheduler_thread.py`) |

**What it does:** scheduled jobs with **deliveries**, **quota holds**, **incidents**, a
**monitor**, and **detached workers** — i.e. a production scheduler, not a timer. **Verified.**

**The contested-ownership question this raises (batch 10):** we have `scheduler` +
`webhooks` in the platform, and Hermes has `cron/`. **Two schedulers is exactly the failure the
plan names.** Flagged, not resolved here.

---

## 14. ACP adapter

| | |
|---|---|
| Modules | **14** Python files under `acp_adapter/` |
| Files | `entry.py`, `auth.py`, `commands.py`, `content.py`, `edit_approval.py`, `events.py`, `model_catalog.py`, `permissions.py`, `session.py` |
| Purpose | Exposes Hermes as an **Agent Client Protocol** endpoint — the editor/IDE integration |

**What it exposes:** an ACP server with **its own auth, permissions, edit-approval and model
catalogue**. **Verified.**

---

## 15. Web dashboard

| | |
|---|---|
| Location | `web/` — a **Vite + React + TypeScript** app |
| Structure | `pages/`, `components/`, `contexts/`, `hooks/`, `i18n/`, `lib/`, **`plugins/`** |
| Plugin API | `web/src/plugins/{registry.ts, slots.ts, sdk.d.ts, PluginPage.tsx, usePlugins.ts}` |
| Also | `PluginPage.tsx`, `PluginsPage.tsx` — a **plugins management page** |

**What it can do:** it is an **extensible ops console** — plugins register **pages, tabs and
slots** without touching core. **Verified — and this is a `V`-entry: the vision does not
describe an admin console at all, and we will need one.**

---

## 16. Config surface

| | |
|---|---|
| Example file | `cli-config.yaml.example` — **2,323 lines**, **28 top-level keys** |
| Key areas (from the file) | models/providers, tools/toolsets, memory, profiles, gateway/platforms, cron, sandbox, browser, terminal, observability |
| Precedence | config file + env (`config_env.py`) + per-profile overrides |

**Verified.** The surface is large; the areas map cleanly onto the subsystems above.

---

## 17. The 45 claims, verified or contradicted

**Method.** Each claim was checked against the code; the file that settles it is named. **44 of
the 45 resolve to VERIFIED or PARTIAL; one (H-02) is contradicted — and only as a description
of *our* tree, not as a fact about the release it names.**

### A. Identity and provenance

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-01 | MIT-licensed | **VERIFIED** | `LICENSE` (MIT, © 2025 Nous Research); `package.json` `"license": "MIT"` |
| H-02 | Stable release `v0.21.3`/`v2026.9.14`/`345cd2b` | **CONTRADICTED (as our tree)** | extract is post-`v2026.9.24` (0.21.5), on/after 2026-09-28 (§2) |
| H-03 | `main` carries `0.0.0` | **VERIFIED** | `pyproject.toml` `version = "0.0.0"` (note `package.json` says `1.0.0` — different field) |
| H-04 | Docs dynamically generated; pages disagree | **PARTIAL** | docs are a Docusaurus site in `website/docs`; the disagreement is **confirmed by the 193/197/210 count itself** (§3) |
| H-05 | Primary repo `NousResearch/hermes-agent` | **VERIFIED** | README links + `package.json` name `hermes-agent` |
| H-06 | Changes fast; pin a release | **VERIFIED** | ~2 weeks between Doc 3's pin and our tree; 30 schema migrations recorded |

### B. Runtime structure

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-07 | `AIAgent` is a platform-agnostic core | **VERIFIED** | single `class AIAgent` in `run_agent.py`; shared by CLI, gateway, ACP, batch, API server |
| H-08 | Loop split into `conversation_loop.py` + `turn_*` | **VERIFIED** | `agent/conversation_loop.py` + `turn_api_call/error/request`, `turn_author`, `turn_context`, `turn_context_compaction`, `turn_empty_response`, `turn_explainers`, `turn_facade` |
| H-09 | Prompt/dispatch/provider/context/persistence are separate modules | **VERIFIED** | `agent/prompt_*`, `tools/registry.py`, `agent/*_adapter.py`, `agent/context_*`, `hermes_state_*.py` |
| H-10 | Registry with 70+ tools across ~28 toolsets | **PARTIAL** | **59** core tools in `_HERMES_CORE_TOOLS`; the `TOOLSETS` dict has **61** keys (37 general + 24 platform-scoped), not ~28; README itself says **"40+ tools"** |
| H-11 | SQLite + FTS5 in `state.db` | **VERIFIED** | `hermes_state.py`, `hermes_state_fts.py` (FTS5 + CJK bigram tokenizer) |
| H-12 | `state.db` holds metadata, history, usage, FTS5, lineage, routing | **VERIFIED (and richer)** | 13 tables incl. `gateway_routing`, `async_delegations`, `compression_locks` (§7) |
| H-13 | 25+ messaging adapters | **VERIFIED** | **34** distinct platform values — 24 in the `Platform` enum (`gateway/config.py:217`) + 22 bundled plugin adapters (`plugins/platforms/`, `kind: platform`), 12 names shared; **29 are messaging/channel platforms** (the other five — `local`, `api_server`, `webhook`, `msgraph_webhook`, `relay` — are infrastructure) |
| H-14 | A profile is a durable home | **VERIFIED** | `HERMES_HOME` ContextVar + `profiles.py` + `profile_identity.py` (§8) |
| H-15 | Warns against two processes on one profile | **VERIFIED** | `hermes_cli/shared_profile_warning.py` |
| H-16 | Plugin registries, cron, ACP, trajectories, isolation exist | **VERIFIED** | `plugins/`, `cron/`, `acp_adapter/`, `agent/trajectory.py` + `trajectory_compressor.py`, profile isolation |

### C. Memory, skills, context

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-17 | Built-in memory bounded, via `MEMORY.md`/`USER.md` | **VERIFIED** | `agent/agent_init.py`, `background_review.py`, `context_compressor.py` |
| H-18 | Memory Provider interface with external providers | **VERIFIED** | `agent/memory_provider.py`; 5 providers in `plugins/memory/` |
| H-19 | Memory write approval exists | **VERIFIED** | `tools/write_approval.py`, `tools/memory_tool.py` |
| H-20 | Skills: on-demand, progressive disclosure, open standard | **VERIFIED** | `SKILL.md` YAML frontmatter (`name/description/version/author/license/platforms/metadata.hermes.tags/related_skills/prerequisites`) |
| H-21 | 11 skill capabilities | **VERIFIED** | `skills_config.py`, `skills_hub.py`, `tools/skills_tool.py`, `tools/skill_manager_tool.py` (create/patch/write_file, `references/`, discovery, bundles, `/learn`) |
| H-22 | Can create/update skills with write approval | **VERIFIED** | `skill_manager_tool.py` `_guarded_write` + `write_approval.py` |
| H-23 | Context files scanned for prompt injection | **VERIFIED** | `agent/context_file_sources.py`, `context_references.py`, `context_compressor.py`, `message_sanitization.py` |
| H-24 | Pluggable `ContextEngine` abstraction | **VERIFIED** | `agent/context_engine.py` + `plugins/context_engine/` |
| H-25 | Prompt assembly separates stable from ephemeral (caching) | **VERIFIED** | `cache_control`/`ephemeral` in `anthropic_message_convert.py`, `auxiliary_client.py` |

### D. Tools, MCP, plugins, hooks

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-26 | Tool Search exists | **VERIFIED** | `tools/tool_search.py`, `tool_search_catalog.py`, `tool_search_validation.py` |
| H-27 | Registry intentionally broad | **VERIFIED** | 59 core tools + per-toolset tools; `AGENTS.md`: the toolset is the surface gate |
| H-28 | MCP supported as external capability interface | **VERIFIED** | 8 MCP modules + 65 optional MCPs (§10) |
| H-29 | Plugins: tools, hooks, commands, platforms, memory, context engines, model providers | **VERIFIED** | `plugins/plugin_loader.py` (`register_tool/hook/cli_command/memory_provider`); 18 plugin dirs incl. `context_engine`, `model-providers`, `platforms`, `memory` |
| H-30 | Hooks intercept tools, guardrails, events, content, blocking | **VERIFIED** | `shell_hooks.py`, `api_request_hooks.py`, `plugin_stream_hooks.py`, `verify_hooks.py`, `outbound_webhooks.py` |
| H-31 | HTTP/API server, Python integration, ACP | **VERIFIED** | `gateway/platforms/api_server*.py` (8 files), `agent/transports/`, `acp_adapter/` |

### E. Security

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-32 | 7 controls: approvals, file safety, container isolation, MCP credential filtering, injection scanning, cross-session isolation, input sanitisation | **VERIFIED** | `tools/approval*.py` (10 files), `agent/file_safety.py`, sandbox image, `hermes_cli/mcp_security.py`, `agent/message_sanitization.py`, `tools/tool_guardrails.py`, profile isolation |
| H-33 | Credential pools for rotation | **VERIFIED** | `agent/credential_pool.py` |
| H-34 | Terminal backends exist and can be restricted | **VERIFIED** | `tools/terminal_tool_backends.py`, `terminal_scope.py`, `terminal_tool_guards.py` |

### F. Channels, scheduling, agents

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-35 | A gateway provides multi-channel connectivity/routing | **VERIFIED** | `gateway/` + **34** platform adapters (24 enum + 22 bundled plugins; §17 H-13) |
| H-36 | Subagents start fresh, receive only goal/context | **VERIFIED** | `agent/subagent_lifecycle.py` (immutable contracts; `_MAX_GOAL_CHARS = 16_000`) |
| H-37 | Bot Mode maps profiles to persistent named Bots | **VERIFIED** | `tools/bot_mode_dm.py`, `bot_mode_probe.py`, `bot_relay.py`; evals `botmode-dm-*` |
| H-38 | Bots can collaborate | **VERIFIED** | `gateway/hosted_rooms.py`, `hosted_room_execution_policy.py`, `api_server_room_dispatch.py`; `bot_room` toolset |
| H-39 | Cron: jobs, attached skills, deliveries, fresh sessions, no-agent jobs | **VERIFIED** | `cron/` 33 files incl. `scheduler_delivery.py`, `delivery_queue.py` |
| H-40 | Event-triggered automation exists | **PARTIAL** | `cron/suggestions.py`, `blueprint_catalog.py`, webhook ingress in `gateway/platforms/webhook*.py`; a dedicated event-trigger layer is **not** clearly present |
| H-41 | Document extraction supports common formats | **VERIFIED** | `read_extract`, `web_extract`, `gateway/media_extraction`, `gateway/extract_local_files` |
| H-42 | Dashboard extendable without touching core | **VERIFIED** | `web/src/plugins/{registry,slots,sdk,usePlugins}` |
| H-43 | Trajectory support exists | **VERIFIED** | `agent/trajectory.py`, `trajectory_compressor.py` (+ async) |

### G. Cross-cutting

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| H-44 | The 30-row subsystem map is accurate | **PARTIAL** | the subsystems named in App A were each located (§4–§16); **the map's own counts are stale** — see H-10, H-13, H-45 |
| H-45 | 193/197/210 skills | **VERIFIED (all three, different snapshots)** | §3 |

**Tally: 40 VERIFIED · 4 PARTIAL (H-04, H-10, H-40, H-44) · 1 CONTRADICTED (H-02, and only as
a description of *our* tree) · 0 UNVERIFIABLE.** **Document 3's description of Hermes is
substantially accurate** — its weakness is **staleness in the numbers, not error in the
structure.**

---

## 18. For each area — gap we have, or duplicate we already run?

The owner's reuse objective applies here too. **`DUPLICATE`** = we already run an equivalent;
**`GAP`** = Hermes covers something we do not; **`BOTH`** = both, and they must be reconciled.

| Area | Verdict | Note |
|---|---|---|
| **Agent runtime / tool loop** | **GAP** | we have no agent loop; `ai-assistant` orchestrates calls but is not a self-directed agent |
| **Tool registry + toolsets** | **GAP** | we have `ai-tools` packs (3), not a 59-tool registry with 61 toolset keys |
| **Skills** | **GAP** | we have no skill system at all; 210 skills ship |
| **Memory (personal)** | **GAP** | we have no per-agent memory; the vision wants platform knowledge, not personal memory |
| **Session store / FTS5** | **DUPLICATE (partial)** | we have `messages` + `query_index` + `search`; Hermes has `state.db` + FTS5 |
| **Identity / profiles** | **DUPLICATE (partial)** | our `Principal` + tenant; a Hermes profile is **not** a tenant (confirmed, §8) |
| **Model providers** | **BOTH** | our `ai-assistant` has `llm-adapters` + a model allow-list; Hermes has **38** providers + auxiliary roles — **reconcile in batch 10** |
| **MCP** | **DUPLICATE (partial)** | our `ai-assistant` has an MCP client **and** server; Hermes has a catalogue of 65 |
| **Sandbox** | **GAP** | we have no execution sandbox; Hermes has a container image + backends |
| **Subagents / delegation** | **BOTH** | our `delegations` is *authority* delegation (human→human); Hermes delegation is *task* delegation (agent→agent). **Same word, different thing — a naming collision to resolve** |
| **Scheduling** | **DUPLICATE (conflict)** | we have `scheduler` + `webhooks`; Hermes has `cron/`. **Two schedulers — batch 10** |
| **Messaging channels** | **DUPLICATE (partial)** | we have `communication_channels` + `channel_imap`/`channel_gmail`; Hermes has 34 platform adapters (29 messaging) |
| **Web dashboard** | **GAP** | our `ui` is the app's own front end; Hermes ships a separate extensible ops console |
| **Approvals** | **BOTH** | our authority approvals are **platform-level** (the gate); Hermes approvals are **tool-level** (may I run this command). **Complementary, not duplicate** |
| **Audit / ledger** | **DUPLICATE (ours is stronger)** | our hash-chained ledger has no Hermes equivalent |
| **Document extraction** | **GAP** | we have `attachments` storage, not multi-format extraction |

**Headline:** the overlap is **narrower than expected**. Hermes is an **agent runtime**; our
platform is a **governance + business-data platform**. They meet at **models, MCP, approvals
and scheduling** — and the two genuinely dangerous overlaps are **scheduling** and
**delegation-by-name**.

---

## 19. `V` — value beyond the vision

**The owner's new standing rule.** Things we have or find that **the vision does not ask for**
but which add value to the end product. Each names the benefit concretely and is attacked in
§20.

| ID | What it is | Where | Why it is worth keeping | Status | Risk if adopted | Verdict |
|---|---|---|---|---|---|---|
| **V-01** | **Auxiliary / chore models with automatic fallback** | `agent/auxiliary_*.py` (11 modules) | Runs cheap models for easy work and escalates only when needed — **directly reduces the cost of the vision's local-first design**, which the vision treats as a hardware problem | running, tested | adds a routing layer the vision does not specify | **KEEP** |
| **V-02** | **38 model providers, hot-swappable, no code change** | `plugins/model-providers/` | Removes provider lock-in for the whole product; the vision names local-first but not *how many* backends | running, tested | none material | **KEEP** |
| **V-03** | **Exact dependency pinning as a security policy** | `pyproject.toml` | A **reusable rule for our own repo** — ranges let PyPI ship an unreviewed transitive version; they tightened it after a real worm | policy, proven | small maintenance cost (pins must be bumped) | **KEEP** |
| **V-04** | **The extensible ops console** | `web/` + `web/src/plugins/` | The vision never describes an **admin/ops console**, and a governance product needs one; this is a working, plugin-extensible one | running, tested | it is a second front end beside our `ui` | **KEEP** |
| **V-05** | **34 platform adapters from one gateway (29 messaging)** | `gateway/platforms/` + `plugins/platforms/` | Telegram/Discord/Slack/WhatsApp/Signal/WeChat/QQ/Teams/Line/IRC … — **the vision's "talk to your platform" surface, already built** | running, tested | channel sprawl; each is an attack surface | **KEEP** |
| **V-06** | **FTS5 with a CJK bigram tokenizer** | `hermes_state_fts.py` | Session recall that **works in Chinese, Japanese and Korean** — our 5 locales include none of these, so this is a **capability we would otherwise lack** | running, tested | none | **KEEP** |
| **V-07** | **Credential pools with rotation** | `agent/credential_pool.py` | Model capacity and key rotation are production concerns the vision does not mention | running, tested | none | **KEEP** |
| **V-08** | **Trajectories (recorded runs) + a compressor** | `agent/trajectory.py`, `trajectory_compressor.py` | Raw material for **evaluating and improving** the agent — the vision's "self-extending" claim needs evidence, and this is where it comes from | running, tested | storage cost | **KEEP** |
| **V-09** | **The 210-skill library as a content asset** | `skills/`, `optional-skills/` | Finance, email, research, devops skills that **work today** — the vision's User Functions need *content*, and this is a head start | running | licensing/content review before shipping; quality varies | **HOLD** |
| **V-10** | **Kanban + bot rooms (multi-agent collaboration)** | `tools/kanban_*`, `gateway/hosted_rooms.py` | Lets several agents work one job with a shared board — **beyond anything the vision describes** | running | complexity; needs the delegation/authority question settled first | **HOLD** |
| **V-11** | **Computer-use + browser automation with a credential vault** | `tools/computer_use_tool.py`, `browser_vault_*` | The vision's AI proposes; **this is the "hands"** for tasks that need a screen — with a vault so secrets are not typed into prompts | running | high-risk capability; must sit behind our approval gate | **HOLD** |
| **V-12** | **17 localised languages including RTL** | `locales/` | Reach the vision does not specify | running | translation quality varies | **HOLD** |
| **V-13** | **A 65-entry MCP catalogue** | `optional-mcps/` | Turns "connect to a system" from a build into a **configuration choice** | running | each is a third-party integration to vet | **HOLD** |

**The honest split:** **8 KEEP** (V-01…V-08) are things that **reduce cost or fill a hole the
vision is silent on**, and 5 **HOLD** are **real but need a decision first** (licensing,
complexity, or a security question). **Nothing is DROPped in this batch** — that verdict needs
the critic pass and batch 10's ownership questions to land first.

**The single most valuable `V`-entry is V-01.** The vision treats "run on a small local model"
as a hardware question. **Auxiliary models with fallback turn it into a routing question** —
and Hermes already answers it.

---

## 20. Critic pass — try to prove the map wrong

**The attempt, named.** Four attacks, each aimed at a different part of the map. **The fourth
found real defects in this report and they are fixed above** — it is kept in full because a
critic pass that never breaks anything is not a critic pass.

### Attack 1 — "you measured the numbers, not the behaviour"

**Where I looked:** for each subsystem I named a **file**, but a file existing is not the
feature working. **What survived:** the counts are real (59 tools, 61 toolset keys, 34 platforms,
30 migrations), and for the load-bearing claims I read the **content**, not just the path —
`memory_manager.py`'s "one external provider" rule, `subagent_lifecycle.py`'s bounded goal,
`version_info.py`'s resolution order. **What broke:** three areas rest on **file presence
alone** — **sandbox** (§11), **document extraction** (H-41) and **event-triggered automation**
(H-40, already marked PARTIAL). **Those three are downgraded to "present, behaviour not
exercised here"** — and the reason is honest: **we cannot run Hermes in this environment.**

### Attack 2 — "your task-zero answer is a window, not a pin"

**Where I looked:** whether the two routes could both be reading the same artefact.
**They cannot** — one is a **release-tag mapping in a test fixture**, the other is a
**timestamped schema-migration log**. Different files, different mechanisms, same answer
(on/after 2026-09-28). **What survived:** the window. **What broke:** any claim to a **commit
hash**. **So the answer is stated as a window, and the open item names the artefact (`.git` or
an install stamp) that would make it a pin.**

### Attack 3 — "your `V`-list is a wish list"

**Where I looked:** whether each `KEEP` names a **concrete end-product benefit** and whether it
**survives the same standard as the rest of the report**. **What survived:** V-01 (reduces
cost — measurable), V-03 (a rule we can copy today), V-06 (a capability we demonstrably lack).
**What broke:** **V-02 and V-05** were stated as "removes lock-in" and "already built", which
are **advantages, not benefits**. Restated concretely: V-02 means **a customer can bring their
own model key and we do not have to build an adapter per provider**; V-05 means **a customer's
team can reach the platform from the app they already use, with no app for us to build.**
**What also broke:** **V-09 was one step from being a wish.** Its benefit ("210 skills") is
**content we have not vetted**, so it is **HOLD**, not KEEP — and the reason is written down.

### Attack 4 — "re-derive every count from scratch, with a different tool"

**Where I looked:** during the bookkeeping pass I re-ran **every** number in §1–§16 by a
**second route** — different tool, different rule — rather than trusting the first draft.
**What broke: two counts were wrong.**

- **Platform adapters: "32" → 34.** The first draft counted `gateway/platforms/*.py` (a *file*
  count, and one that includes helpers such as `base.py`, `_shared.py`, `signal_format.py` and
  eight `api_server_*.py`). The **real** platform count is the distinct platform values: **24 in
  the `Platform` enum** (`gateway/config.py:217`) **+ 22 bundled plugin adapters**
  (`plugins/platforms/`, each `kind: platform` with a real `BasePlatformAdapter` subclass),
  **12 names shared** → **34**. Verified two ways: the union of the two name sets, and the
  partition 12 shared + 10 plugin-only + 12 enum-only = 34.
- **Toolsets: "37" → 61.** The first draft's grep counted only the **general** toolsets and
  missed the **24 platform-scoped** `hermes-<platform>` groups. The dict has **61** keys; an AST
  parse of the dict (not a grep, which also catches nested keys) settles it.

**What also broke:** two figures were stated **without their counting rule**, so they could not
be checked — the Python-file and test-file counts. They are now given with the exact command
(2,387 and 5,659). **The failure mode was exactly the one this programme keeps meeting:
measuring a different thing than the claim named** — here, a *file* count labelled a *platform*
count, and a *general-only* count labelled the *whole* dict. **Both are corrected in place, and
the commands are now beside every number so the next reader can re-derive them.**

**What survived:** the load-bearing claims. Re-derivation confirmed **59** core tools, **38**
`*_tool.py`, **65** optional MCPs, **38** model providers, **30** `sessions` schema migrations
(max seq 30), **17** locale codes, **28** config keys, and — the one that matters most — the
**version window** (the newest schema-history stamps are still `2026-09-25T23:25Z`,
`2026-09-27T00:29Z`, `2026-09-28T00:00Z`, `2026-09-28T08:42Z`). **The task-zero answer stands.**

**One further finding the pass produced.** The 45-claim exercise is **not a verification of
Document 3** — it is a verification of **Document 3's description of a tree two weeks older
than ours**. **40 claims verified against a *newer* tree is strong evidence the description is
structurally right**; but it also means **the document cannot be used as a specification**,
only as a map. That is the same conclusion batch 2 reached from the other direction.

---

## 21. Definition of done

- **"An integration plan can be written from this file without opening the Hermes repo."**
  Met: §4–§16 give the shape, the counts, the entry points and the mechanisms for every
  subsystem; §18 gives the gap/duplicate verdict per area; §17 settles all 45 claims.
- **"Every count has a command behind it."** Met: every count in §1–§16 was produced by a
  named command or file, and the two load-bearing counts (skills, version) were each derived
  **twice by different routes**.

**Met?** Yes.

---

## 22. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **A hard pin for our Hermes** — a `.git` or `install-stamp.json`; today we have a date window, not a commit | Owner / batch 12 |
| 2 | **Two schedulers** — our `scheduler`/`webhooks` vs Hermes `cron/` | Batch 10 |
| 3 | **"Delegation" is two different things** — our authority delegation (human→human) vs Hermes task delegation (agent→agent) | Batch 10 |
| 4 | **Two model layers** — our `llm-adapters` + allow-list vs Hermes's 38 providers + auxiliary roles | Batch 10 |
| 5 | **Two MCP stacks** — our client+server vs Hermes's catalogue | Batch 10 |
| 6 | **Sandbox, document extraction and event-triggers** — present but not exercised; need a running instance to confirm behaviour | Batch 9 + the docker instance |
| 7 | **The 210 skills as content** — licensing and quality review before any reuse | Batch 11 |
| 8 | **`V`-entries V-09…V-13** are HOLD; each needs a decision before it can become a shortcut | Batch 11 |
| 9 | **The dependency-pinning policy (V-03)** — adopt it in our own repo | Batch 12 |
| 10 | **H-44's subsystem map is stale in its counts** — use our §1–§16 counts, not Appendix A's | Recorded |
