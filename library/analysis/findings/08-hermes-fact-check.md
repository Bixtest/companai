# Batch 8 — HERMES as the other documentation reports it — fact-checked

**Batch:** 8 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** `library/ai/hermes-docs/` (351 files, 32 MB) · `library/ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` ·
`library/ai/qwen-hermes-tool-calling-report.md` · `library/ai/tiny_models/` · `aissistant-package/` (the
integration, not the product) · **checked against** `library/ai/hermes-agent-main/` (our extract) and
`aissistant-package/hermes/` (the sibling's vendored copy).
**Question this batch answers:** What does the rest of the library tell us about **Hermes** — and which of it
survives being checked against the Hermes code?

**Definition of done (from `PLAN.md`):** *nothing in this programme rests on an unchecked claim, and every
surviving item names the file it was checked against.*

**The boundary this batch obeys** (`library/ai/README.md`): *a document about the sibling project can tell us
**what Hermes does** and **what went wrong**. It cannot tell us **what our platform should be**.* So the
sibling's product decisions are tagged `NOT ABOUT HERMES` and dropped; its Hermes facts and its failures are
kept.

---

## 0. How to read this report

| Tag | Meaning |
|---|---|
| `VERIFIED` | A claim about Hermes that the Hermes code confirms — with the file |
| `CONTRADICTED` | A claim the code disproves — the truth is stated beside it |
| `UNVERIFIABLE` | Cannot be checked from the code we hold — what would settle it is named |
| `NOT ABOUT HERMES` | A verdict about the sibling's product or architecture — **dropped** |
| `INTEGRATION WARNING` | Something that broke when a product was connected to Hermes — a failure mode, kept |

**Two copies of Hermes are in scope, and they are different versions.** The sibling's vendored copy is
**0.20.1** (`aissistant-package/hermes/pyproject.toml`; ADR-004 calls it *"our own vendored Hermes 0.20.1"* —
two routes agree). Our extract is **post-0.21.5, on/after 2026-09-28** (batch 7 §2). **A claim is checked
against the copy it was written about** — and where the two differ, that difference is itself a finding.

---

## 1. What was checked, and how big it is

| Source | What it is | Checked against |
|---|---|---|
| `hermes-docs/reboot/` (28 files) | the sibling's reboot set, 2026-08-13…15 | code |
| `hermes-docs/documentation/` (the 6-part set + work records) | the sibling's product docs | code |
| `hermes-docs/docs-more/` (25 files) | settings map, forensics, audits | code |
| `hermes-docs/docs/` | **upstream Hermes docs** (ADR, RFCS, security, the SSL RCA) | code |
| `PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` (43 KB) | the locked local-model SSOT, 2026-08-14 | code + later docs |
| `qwen-hermes-tool-calling-report.md` (1,605 lines) | the tool-call reliability research | code |
| `tiny_models/` | a third-party SLM survey (PDF + md) | code where possible |
| `aissistant-package/LESSONS.md` (22 lessons) + the work records | the integration failure register | code |

**Measured corpus: 238 markdown files under `hermes-docs/`, 32 MB.** Not all read line-by-line; the ones the
plan names, plus every file carrying an integration failure, were read in full.

---

## 2. The capability matrix — `13-HERMES-CAPABILITY-MATRIX.md`

**What it is.** A **target specification** for the sibling's product (status line: *"unless explicitly labelled
current, every target below is **planned**"*), written 2026-08-13 and corrected 2026-08-15. It has six columns:
capability · *Current state* · target disposition · access · gate · "Do not".

**How it is tagged.** The **disposition, access, gate and "do not" columns are `NOT ABOUT HERMES`** — they are
the sibling's product design. The **"Current state" column makes claims about Hermes**, and every one of those
was checked. All of them survive.

| Hermes claim in the matrix | Tag | Checked against |
|---|---|---|
| Runs are served over `/v1/runs`; SSE + polling; stop | `VERIFIED` | `gateway/platforms/api_server.py:83-88` (`/v1/runs`, `/{id}`, `/{id}/events`, `/{id}/approval`, `/{id}/stop`) |
| Skills are listed over `/v1/skills` | `VERIFIED` | `api_server.py:88`, `_handle_skills` at `:2953` |
| "session_search … already in our agents' hands" (correction #1) | `VERIFIED` | `session_search` is in `_HERMES_CORE_TOOLS` (59 core tools) and has its own toolset |
| Persistent memory "hard cap 2,200 chars total, **rejects on overflow**" (correction #3) | `VERIFIED` | `agent/agent_init.py:1355-1356`, `hermes_cli/config_defaults.py:1321-1322` (2200 / 1375); `tools/memory_tool.py:345` — *"IF FULL: an add is rejected with the current entries shown"* |
| "A stored message has a `role` and **no author field**" (correction #4) | `VERIFIED` | `hermes_state_common.py:449` — `messages(id, session_id, role, content, tool_call_id, tool_calls, tool_name, …, display_identity, …)`; **no `author` column** |
| Mixture of Agents is a vendored feature | `VERIFIED` | `agent/moa_loop.py`, `agent/moa_alternation.py`; `auxiliary.moa_reference` / `moa_aggregator` |
| Curator / learning graph exposed | `VERIFIED` | `agent/learning_graph.py`, `agent/learning_graph_render.py`; `hermes curator pin/adopt` (`agent/background_review.py:510-517`) |
| Steering an active run (`/steer`) | `VERIFIED` | `agent/agent_runtime_helpers.py:3696` — *"Persist any pending /steer text as a standalone user message"* |
| Checkpoints and rollback | `VERIFIED` | checkpoint handling in `agent/` and `tools/` |
| Home Assistant toolset; Spotify toolset; Discord/Lark/Yuanbao tools | `VERIFIED` | `toolsets.py:162` (`homeassistant`), `:178` (`spotify`), `:163` (`kanban`), platform-scoped toolsets |
| Computer use, vision, video, image gen, TTS tools exist | `VERIFIED` | `toolsets.py` — `computer_use`, `vision`, `video` (`video_analyze`), `image_gen`, `tts` |
| ACP editor integration exists | `VERIFIED` | `acp_adapter/` (14 files, batch 7 §14) |
| Git/worktree/review routes exist in the dashboard | `VERIFIED` | worktree / `pull_request` references across `hermes_cli/` |
| Kanban / teams pipeline plugins exist | `VERIFIED` | `tools/kanban_tools.py`, `kanban` toolset |
| "Every Aissistant receives 30 tools" | `NOT ABOUT HERMES` | that is the sibling's provisioner config; the *toolset mechanism* is Hermes's (verified), the *number* is theirs |
| "The current product integration is narrow …" | `NOT ABOUT HERMES` | a statement about their adapter, not Hermes |

**Verdict on this document: its Hermes facts are accurate.** It is a specification, and the specification is
faithful. Its weakness is the same one batch 7 found in Document 3 — **it describes a tree (0.20.1) that is now
two releases behind the one we hold.**

---

## 3. The four-piles sorting — `02-hermes-in-four-piles.md` / `HERMES-SORTED-INTO-FOUR.md`

**What it is.** The founder asked for every Hermes feature sorted into 🔧 WIRE NOW / 📋 LATER / ⚔️ CONTESTED /
🚫 NOT FOR US. It claims **51 items** (12 / 19 / 13 / 7). It is the fullest feature inventory in the library —
**and it carries the most errors of any document in this batch.** All four are the same kind: a **stale count**.

| Claim | Tag | Truth (measured) |
|---|---|---|
| `hermes/skills/` = **81**, `optional-skills/` = **112**, total **193** | **`CONTRADICTED`** | the copy it names measures **82 / 115 / 197** (`find . -name SKILL.md`). The **category** counts are right — 15 and 21 — but the skill counts drifted by **+1 / +3 / +4**. *(For reference: our extract is 58 / 152 = 210, batch 7 §3.)* |
| "Hermes has **25** sets of abilities — web, browser, terminal, files, writing code" | **`CONTRADICTED`** | the `TOOLSETS` dict has **59** keys (35 general) in the sibling's copy, **61** (37 general) in ours. Neither is 25. *(AST parse of the dict, not a grep.)* |
| "Hermes uses separate small models for **22** internal chores" | `VERIFIED` | the `auxiliary` block has **22** keys — but only **18 are model-role chores**; 4 are settings (`transient_retries`, `free_only`, `openrouter_model`, `stream_only_base_urls`) |
| `auxiliary.session_search` listed as a live chore | **`CONTRADICTED`** | **removed.** `config_defaults.py:779-781`: *"session_search no longer uses an auxiliary LLM (PR #27590 …). The old `auxiliary.session_search.*` block was removed here."* |
| "`prefer_fast_model` — only `title_generation` opts in today" | **`CONTRADICTED`** | `title_generation` is the only chore that *has* the key, and it is set **`False`** (`config_defaults.py:784`). **No chore opts in.** |
| "Hermes manages **39** providers" | **`CONTRADICTED`** | **34** in the sibling's copy, **38** in ours (`ls -d plugins/model-providers/*/`). |
| "Hermes has … **seven** proper long-term memory systems" | **`CONTRADICTED`** | **8** in the sibling's copy (byterover, hindsight, holographic, honcho, mem0, openviking, retaindb, supermemory), **5** in ours (byterover, holographic, mem0, openviking, retaindb). |
| "a full skills shop with **88,000** skills" | `UNVERIFIABLE` | an **online hub** figure; not in the code we hold. The document itself flags the 88k as "the online hub, not the box" |
| `delegate_task` is a tool the agent calls itself | `VERIFIED` | `tools/delegate_tool.py` + `agent/subagent_lifecycle.py` |
| `skills_list` / `skill_view` / `skill_manage` are in the agent's set | `VERIFIED` | the `skills` toolset in `toolsets.py` |
| The sandbox is a runtime service (`sandbox.exec`, `sandbox.fs`, `sandbox.process`, `sandbox.download_file`) | `VERIFIED` | `tools/environments/daytona.py:121`, `vercel_sandbox.py:340` — `sandbox.fs.download_file(...)` / `sandbox.download_file(...)` |
| `hermes/web` is a full React dashboard shipped in source | `VERIFIED` | batch 7 §15 |
| OpenClaw converter ships: `optional-skills/migration/openclaw-migration` | `VERIFIED` | `scripts/openclaw_to_hermes.py` present |
| Pets; personalities; emergency stop; supply-chain security audit; credential firewall/vault; language server; skill publishing; multiple isolated instances | `VERIFIED` | `agent/pet/`; `hermes_cli/personality.py`; `hermes pause` + `agent/estop.py`; `hermes_cli/security_audit.py` + `subcommands/security.py`; `tools/browser_vault_tool.py` + `credential_files.py`; `agent/lsp/`; `skills_hub.py`; profiles (`HERMES_HOME` ContextVar) |
| "Emergency stop … halts **all** scheduled and automated agent work" | `VERIFIED (with a nuance)` | `agent/estop.py` — *"a resumable pause for **NEW** work only"*; cron work in flight is not killed |
| The ⚔️ CONTESTED pile (approvals, skills library, scheduling, task board, memory-vs-knowledge, …) | `NOT ABOUT HERMES` | each is "who owns this for our product" — a decision, not a Hermes fact |

**The one line worth keeping, and it is the document's own:** *"We currently use a small corner of what we
already ship."* The four-piles inventory is the best **map of the surface** in the library. **Use it as a map;
do not quote its numbers.** The counts are the part that rotted.

---

## 4. The settings map — `docs-more/hermes-settings-map.md`

**What it is.** How the Hermes desktop **Model** settings map onto the sibling's hire form. Mostly
`NOT ABOUT HERMES` (their form fields). Its Hermes claims all survive — and one of them caught **my own**
near-miss.

| Claim | Tag | Checked against |
|---|---|---|
| Main model is `model.provider` + `model.default` (**dict form**) | `VERIFIED` | `cli-config.yaml.example:72` — `model:` is a dict with `default:` and `provider:` keys. **Note: `config_defaults.py` stores `model` as a *string* internally — measuring that file instead would have "disproved" a true claim. The YAML shape is the right object.** |
| Auxiliary tasks: Vision, Web extract, Compression, Skills hub, Approval, MCP, Title gen, Curator | `VERIFIED` | the sibling's `auxiliary` block contains all of them (`web_extract` is present **in 0.20.1**; in our extract it has been replaced by `review`) |
| `memory.write_approval`, `skills.write_approval`, `skills.guard_agent_created` | `VERIFIED` | `config_defaults.py:1320`, `:1476`, `:1485` — keys exist; **defaults are `False`** |
| Session transcripts + FTS in `state.db` (`sessions`, `messages`, `messages_fts` / trigram) | `VERIFIED` | `hermes_state_common.py` — `messages_fts` and `messages_fts_trigram` both exist; a CJK variant too |
| Sticky memory at `memories/MEMORY.md` | `VERIFIED` | `MEMORY.md` / `USER.md` loaded at session start (batch 7 §6) |
| `X-Hermes-Session-Id` (opt-in same-session continuity) | `VERIFIED` | `api_server.py:76` — `"session_continuity_header": "X-Hermes-Session-Id"`; treated as untrusted (`session_persistence.py:64` sanitises it) |
| `X-Hermes-Session-Key` (long-term memory scoping) | `VERIFIED` | used in `evals/api_delegation_http_probe.py:85` |
| `POST /v1/chat/completions` | `VERIFIED` | `api_server.py:82` |
| `session_search` backed by FTS on the home's `state.db` | `VERIFIED` | `hermes_state_search.py`; `session_search` tool |

**This is the most accurate document in the batch.** It is short, it names real keys, and it holds up.

---

## 5. The local-model work — what actually ran, on what hardware

**What it is.** The sibling's local-model lane: `ADR-004`, `C6b-1/2/2b/3/6`, `R6`, and the SSOT. The
`tiny_models/` pair is a **third-party SLM survey**, not a record of what ran.

### 5a. What actually ran (from the work records)

| Record | What it measured | Tag |
|---|---|---|
| `C6b-3` — the acceptance | **Qwen3.5-9B** on **7 CPU cores**, tool calls **10/10** with reasoning **ON**, median **34 s** per simple call, prompt processing **~95 ms/token**, ~130 reasoning tokens before a 2-token answer, model healthy in ~4 min, RAM ~7.5 GB | `UNVERIFIABLE` — measured on the VPS; we cannot re-run it. **But internally evidenced** (a re-runnable suite and a token counter that moved) |
| `C6b-6` — the small model | **Qwen3.5-0.8B-Q8_0** as `llama-server-small`: tool calls **10/10**, median **6 s**, RAM **1.2 GB**, healthy in **50 s** | `UNVERIFIABLE` (same reason) |
| `C6b-2b` — the free lane | `provider: companai-local` works end to end; the config shape is a first-class **`providers:`** block + `model.provider` / `model.default`, `context_length: 65536` | `VERIFIED` — the `providers:` block and the `model` dict shape both exist in the code |
| `SSOT` §5 | model **Qwen3.5-9B Q4_K_M**, **65,536** context (not 262K), `--parallel 1` | `UNVERIFIABLE` as a deployment; the *reasoning* for 65,536 is stated |
| `SSOT` §3.9 / §6 | **"Disable Qwen reasoning with `--reasoning off`"** | **`CONTRADICTED` — by a later document.** `ADR-004` (2026-08-14) **supersedes** it: reasoning stays **ON**, on a pinned llama.cpp build containing PR #26252 |

### 5b. The ADR's Hermes claims — checked exactly

`ADR-004` is the strongest engineering document in the batch: it **supersedes an earlier decision**, and it
cites its seam by **file and line**.

| Claim | Tag | Checked against |
|---|---|---|
| Vendored Hermes is **0.20.1** | `VERIFIED` | `aissistant-package/hermes/pyproject.toml` → `version = "0.20.1"` |
| `hermes_cli/middleware.py:23  LLM_EXECUTION_MIDDLEWARE = "llm_execution"` | `VERIFIED` | exact — `middleware.py:23` in the sibling (our extract: `:22`) |
| `run_llm_execution_middleware(...)` at `middleware.py:187` | `VERIFIED` | exact |
| Called from `agent/conversation_loop.py:2790` | `VERIFIED` | exact — the call site is there in the sibling and survives in ours |
| The seam is a plugin boundary, not core | `VERIFIED` | `_run_execution_chain` dispatches registered callbacks; no core edit needed |

### 5c. The third-party survey — `tiny_models/`

**Almost entirely `UNVERIFIABLE`.** It is a web-research report about model sizes, licences and CPU
throughput for a Contabo VPS. **We do not hold those models**, so nothing in it can be checked from the code.
Its arithmetic is internally consistent (0.8B×4 ≈ 3.2 GB FP32, 3.8B×4 ≈ 15.2 GB, etc.), and **one internal
inconsistency is worth noting**: it states Qwen-0.8B's context as **256K** in the prose and **262K** in the
next section and the table.

**`NOT ABOUT HERMES`:** every model recommendation in it. **`UNVERIFIABLE`:** the benchmark and tok/s figures.

---

## 6. The tool-calling report — checked against Hermes's real tool interface

`qwen-hermes-tool-calling-report.md` is a 1,605-line research report on Qwen3.5 → llama.cpp → Hermes
tool-call reliability. **Its Hermes claims are the checkable part, and they are accurate.**

| Claim | Tag | Checked against |
|---|---|---|
| Hermes' middleware API has four stages: `llm_request`, `llm_execution`, `tool_request`, `tool_execution` | `VERIFIED` | `hermes_cli/middleware.py:20-23` — all four constants exist, exactly those names |
| `llm_execution` wraps the provider call and receives `request`, `original_request`, `next_call` | `VERIFIED` | `middleware.py:135-140` — signature is `run_llm_execution_middleware(request, next_call, **context)` and it pops `original_request`; the report's description is exact |
| A provider-scoped compatibility shim belongs at `llm_execution`, not in core | `NOT ABOUT HERMES` | an architecture recommendation (and a sound one) |
| `toolcall-rescue`, llama.cpp #20837 / PR #26252, vLLM #45413, Hermes PR #35129 | `UNVERIFIABLE` | external repositories and PRs; not in the code we hold |
| "Qwen officially recommends Hermes-style function calling" | `UNVERIFIABLE` | a claim about Qwen's docs |

**So the report's Hermes integration seam is correct, and the batch-7 finding stands:** the four middleware
stages are real and `llm_execution` is the right altitude. Whether a rescue layer is *needed* is a different
question — and `ADR-004` answers it: **not until qualification says so.**

---

## 7. Every integration failure, with its cause

The sibling ran a real Hermes integration in production and **wrote down what broke**. This is the most valuable
thing in the library, and it is exactly what `library/ai/README.md` calls *"the only record anywhere of a real
Hermes integration."* Every item is tagged `INTEGRATION WARNING`.

### 7a. The consolidated register — `aissistant-package/LESSONS.md` (L-001…L-022)

**Format:** belief → catch → cost → rule. **Note: `L-006` is absent** from the file (it runs L-005 → L-007).
The Hermes-touching lessons, and whether the code corroborates them:

| ID | Belief → catch | Tag | Corroborated by |
|---|---|---|---|
| **L-001** | One Hermes home can serve many agents → **it cannot**; shared home corrupts memory | `INTEGRATION WARNING` | the per-profile `HERMES_HOME` ContextVar (batch 7 §8) |
| **L-007** | `API_SERVER_ENABLED=true` alone exposes the port → **default host is loopback** | `INTEGRATION WARNING` | `hermes_cli/security_audit_startup.py:133` — `os.environ.get("API_SERVER_HOST", "127.0.0.1")` |
| **L-008** | Any OpenAI chat model works once keyed → **non-reasoning models reject `reasoning.effort`** | `INTEGRATION WARNING` | the `reasoning_effort` mechanism exists (`agent_runtime_helpers.py:2531`) |
| **L-009** | Agents can curl internal Docker HTTP → **Tirith raised `plain_http_to_sink` and hung** | `INTEGRATION WARNING` | `config_defaults.py:1792` — `security.tirith_enabled: True`, `tirith_fail_open: True` |
| **L-010 / L-011** | Assigning issues only queues → **it auto-wakes and burns tokens**; dashboard spend ≠ real cost | `INTEGRATION WARNING` | the wake path is the *host's* (`services/heartbeat.ts`), not Hermes's — **the cause is in the connecting product** |
| **L-014** | Claude dry ⇒ "OpenAI broken" → **the laptop used Codex OAuth, the VPS used Anthropic** | `INTEGRATION WARNING` | the `openai-codex` provider exists (batch 7 §9) |
| **L-022** | A gateway may set its home to `0700` → **a host watcher running as another uid cannot traverse it** | `INTEGRATION WARNING` | `hermes_constants.py:602` chmods `0o700` on the home's parent, and `:465/:606` name **UID 10000** — *the same lesson, in the code's own words* |
| **L-020** | Redeploying with an override keeps the port up → **empty `DOCKER_GID` left the container `Created`** | `INTEGRATION WARNING` | host-side compose; not Hermes |
| **L-002, L-003, L-004, L-005, L-012, L-013, L-015, L-016…L-021** | Product/host lessons (secrets binding, second UIs, governance, doc-vs-runtime, metadata, role slugs, curl containers, …) | `NOT ABOUT HERMES` | their product — kept only as process lessons |

### 7b. The named incidents

| Incident | Cause (as recorded, and checked) | Tag |
|---|---|---|
| **A container was silently adopted** (`04-contested-ground.md:21-22`, `05-forensic-audit.md:128`) | Compose named containers **exactly as provisioning would**, so `startHermesGateway` found one running and **adopted a container it did not create**. *"Nothing errored."* The forensic audit shows the smoking gun: `container_name: aisisstant-hermes-manager` | `INTEGRATION WARNING` — **the highest-value one.** Two systems owning one name, with **no error** |
| **A final message got `403`** (`REC-02`) | **Not a Hermes defect.** The emergency test **inserted run records directly**, bypassing the normal wake path, so they lacked the source-task identifier; child-task creation does not check it, comments do. *"Neither is a Hermes bridge authentication defect."* The Manager's "pause" was a **separate** daily usage limit (**832,993 tokens** vs a **500,000** default) | `INTEGRATION WARNING` — a *false* Hermes suspicion, disproved by investigation |
| **Runaway wakes / spend spike** (`docs-more/runaway-wake-forensics.md`) | **Not a Hermes loop.** The host's **task execution + recovery** re-wakes assigned agents after assign, cancel, fail and watchdog paths. Hermes **amplified** the cost (hung runs + retries, L-009) | `INTEGRATION WARNING` |
| **The callback URL pointed at the wrong container** (`B4-CONTROL-PLANE-CALLBACK.md`) | `buildPaperclipEnv` resolved `http://localhost:3100`, correct on the host but **inside a container that is the container's own front door**. Also: `docker exec` does not carry the client's env in | `INTEGRATION WARNING` |
| **SSL CA bundle corruption after `hermes update`** (`docs/rca-ssl-cacert-post-git-pull.md`) | A partial update leaves a CA-bundle env var pointing at a missing file; the first HTTPS call fails with an opaque error. **Fixed** by `agent/ssl_guard.py` (validates CA config before the provider client is built; surfaces a repair hint; `hermes doctor` exposes it) | `VERIFIED` — the fix and its tests **are in the sibling's copy** (`agent/ssl_guard.py`, `tests/agent/test_ssl_ca_guard.py`, `tests/hermes_cli/test_certifi_repair.py`). **See the note below** |
| **Memory bleed between roles** (`MEMORY_BLEED_PROOF`) | the same as L-001 — shared home | `INTEGRATION WARNING` |

**A finding about our own extract.** `agent/ssl_guard.py` is **absent from our extract** — I searched by
filename *and* by symbol (`SSLConfigurationError`, `ssl_guard`) across every `.py` and found nothing. Our
extract instead ships **`agent/ssl_verify.py`**, a *different and broader* approach (`install_truststore()`
points every default SSLContext at the OS trust store). **So the RCA's mechanism was reworked upstream, not
reverted** — but anyone reusing the RCA as a spec would look for a file that is not there. *(This is the batch-7
failure mode again: a document naming an artefact that a newer tree no longer has.)*

---

## 8. Every claim found to be wrong — with what is true instead

| # | Wrong claim | Where | Truth |
|---|---|---|---|
| 1 | Skills **81 / 112 / 193** | four-piles | **82 / 115 / 197** on the copy it names (categories 15/21 are right) |
| 2 | **25** tool sets | four-piles | **59** (35 general) in the sibling; **61** (37) in ours |
| 3 | **39** providers | four-piles | **34** (sibling) / **38** (ours) |
| 4 | **seven** long-term memory systems | four-piles | **8** (sibling) / **5** (ours) |
| 5 | `auxiliary.session_search` exists | four-piles | **removed** (PR #27590) |
| 6 | `prefer_fast_model` — only `title_generation` opts in | four-piles | `title_generation` sets it **`False`**; **no chore opts in** |
| 7 | Qwen-0.8B context **256K** (and 262K elsewhere) | tiny_models survey | internally inconsistent; cannot be settled from the code |
| 8 | "Disable reasoning with `--reasoning off`" as the policy | SSOT §3.9/§6 | **superseded by ADR-004**: reasoning **ON** on a pinned llama.cpp |

**Plus one artefact defect, in the Hermes repo itself, not in a document about it:**

> **`cli-config.yaml.example` still documents `auxiliary.session_search` and `auxiliary.web_extract` as live
> blocks** (lines 925, 946), while the code that owns them (`config_defaults.py:779-781`) says
> `session_search` *"was removed here"*. **The shipped example config is stale relative to its own code.** A
> reader — or a document — that trusts the example would carry a removed feature. *(This is why the four-piles
> doc's error #5 is understandable: it is the error the artefact invites.)*

**The pattern across all of them:** not one is a *structural* error. Every single one is a **count that stopped
being true** — the exact failure batch 0 warned about and batch 7 caught in its own report.

---

## 9. Tag totals

| Tag | Count (approximate — claims, not files) |
|---|---|
| `VERIFIED` | ~45 |
| `CONTRADICTED` | **8** (§8, rows 1–6, 8, plus the example-config artefact defect) |
| `UNVERIFIABLE` | ~15 (external PRs, benchmarks, the 88k hub figure) |
| `NOT ABOUT HERMES` | ~30 (the sibling's dispositions, gates, product decisions) |
| `INTEGRATION WARNING` | **~14** (L-001/007/008/009/010/011/014/020/022 + the five incidents) |

**The one-line verdict:** *the library is a **reliable map of Hermes and a reliable record of how it breaks** —
and an **unreliable source of numbers**. Every Hermes capability it names is real; every count it quotes should
be re-measured before use.*

---

## 10. Critic pass — try to show that a `VERIFIED` was confirmed by a document, not the code

**The attack, named.** The specific failure this batch could commit is: **tag something `VERIFIED` because a
second document agrees with the first, not because the code says so.** A document confirming a document is not
verification — it is two copies of one claim. So I re-checked every `VERIFIED` for whether its evidence is a
**file path** or a **prose agreement**.

**Where I looked:** for each `VERIFIED`, is the evidence a `file:line` I opened, or another document?

**What survived — because the evidence is code, opened by me:** the memory limits (`config_defaults.py:1321`),
the `messages` schema (`hermes_state_common.py:449`), the four middleware stages (`middleware.py:20-23`), the
`llm_execution` signature (`middleware.py:135-140`), the loopback default
(`security_audit_startup.py:133`), `tirith_enabled` (`config_defaults.py:1792`), the 0700/UID-10000 note
(`hermes_constants.py:465`), the SSL fix's presence in the sibling (`agent/ssl_guard.py` + two test files), the
`model` dict shape (`cli-config.yaml.example:72`), and the version `0.20.1`
(`aissistant-package/hermes/pyproject.toml`).

**What broke — three things, all now recorded honestly:**

1. **I nearly "disproved" a true claim by measuring the wrong object.** I first checked
   `model.provider`/`model.default` against `config_defaults.py` (where `model` is a *string*) and was about to
   mark it `CONTRADICTED`. The **YAML schema** (`cli-config.yaml.example`) is the right object, and there the
   claim is `VERIFIED`. **The document was right; my first instrument was wrong.**
2. **Two `VERIFIED`s rest on a document-plus-code pair, not code alone, and are labelled as such:** the local
   model's *performance* (`C6b-3`/`C6b-6`) — the code proves the *mechanism*, not the *measurement*, so those
   are tagged `UNVERIFIABLE`, not `VERIFIED`.
3. **The 88,000-skills figure is `UNVERIFIABLE`, and I refused to launder it.** It is an online-hub number; no
   command in the code can produce it. It is left tagged, not quietly dropped.

**A second-order finding.** The four-piles document's errors **cluster in exactly the counts a reader would
quote** (skills, toolsets, providers, memory systems) — and its *qualitative* statements (what each feature
does, which pile it belongs in) are sound. **A reader skimming for numbers gets the worst of it; a reader
reading for meaning gets the best.**

**And the batch's own limit, stated plainly:** **we cannot run Hermes here**, so every claim about *behaviour
under load* — the 10/10 tool-call gates, the 34 s median, the token counter moving — is `UNVERIFIABLE` by us.
**The dockerised instance (the owner's standing note) is what would turn those into measurements.**

---

## 11. Definition of done

- **"Nothing in this programme rests on an unchecked claim."** Met for the claims the plan named: the capability
  matrix, the four-piles sorting, the settings map, the local-model records, the tool-calling report and the
  failure register were each checked against the code, and every `VERIFIED` names a file.
- **"Every surviving item names the file it was checked against."** Met — the §2–§7 tables carry the path, and
  where the evidence is a document rather than code, that is said.

**Met?** Yes, within the stated limit: **behaviour under load is not measurable here**, and is tagged
`UNVERIFIABLE` rather than guessed.

---

## 12. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **Every count in the library is stale to some degree** — re-measure before quoting | Batch 11 |
| 2 | **`cli-config.yaml.example` documents a removed auxiliary block** — a defect in the Hermes artefact | Recorded; worth an upstream note |
| 3 | **The sibling's vendored copy is Hermes 0.20.1; ours is post-0.21.5** — any reuse must pin the version | Batch 12 |
| 4 | **The container-adoption incident** — two systems owning one name, silently | Batch 10 (ownership) |
| 5 | **Tirith hangs headless workers** (L-009) — the approval mode is a real design constraint on our execution model | Batch 10 / batch 12 |
| 6 | **The local-model performance numbers are unverified by us** — the docker instance would settle them | The docker note |
| 7 | **`L-006` is missing** from the lessons register — a gap, not a finding | Recorded |
| 8 | **The SSL fix moved from `ssl_guard.py` to `ssl_verify.py`** — reusing the RCA needs the new file | Batch 11 |
