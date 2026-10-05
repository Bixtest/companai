# 07 — Hermes: capabilities we must capitalise on — verified against the source

**Batch 07 of the Paperclip + Hermes study. Written 2026-10-05.**

This batch audits two existing documents against the vendored Hermes runtime:

1. `library/ai/hermes-docs/reboot/13-HERMES-CAPABILITY-MATRIX.md` (the "capability matrix").
2. `library/ai/ai-first/AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md` (the "forensic doc").

The job is not to restate them. It is to check whether they are true. The source is `library/ai/hermes-agent-main/`. Where a document and the code disagree, the code wins and the disagreement is named. Every claim below cites the file it came from.

A note on path drift: both documents cite Hermes files with a `hermes/` prefix (for example `hermes/toolsets.py`, `hermes/tools/mcp_tool.py`). The vendored tree is flat — the same files sit at the repository root (`toolsets.py`, `tools/mcp_tool.py`). The prefix is a packaging assumption, not a path that exists in this tree. The file *names* the documents cite are correct; the prefix is not.

---

## 1. Verification table

| Capability | What the documents claim | What the source shows | Verdict | File cited |
| --- | --- | --- | --- | --- |
| MCP client (stdio / HTTP / SSE) | Matrix rows "MCP stdio", "MCP HTTP/SSE"; forensic §18 treats MCP as the external capability interface | A client connects to `mcp_servers` in `config.yaml` over stdio, Streamable HTTP or SSE, discovers tools and registers them into the tool registry | **Verified** | `tools/mcp_tool.py:1-4`; `tools/mcp_tool_transport.py:1` |
| MCP tool filters | Matrix row "MCP tool filters/sampling" | A per-server filter function decides which discovered tools register | **Verified** | `tools/mcp_tool_registration.py:211` (`_make_tool_filter`) |
| MCP sampling | Matrix row "MCP tool filters/sampling" | Client-side handlers implement `sampling/createMessage` (text and tool-use) and elicitation | **Verified** | `tools/mcp_tool_sampling.py:1-3` |
| MCP OAuth | Matrix row "MCP OAuth" | Dedicated OAuth manager, device-flow, dashboard and provider modules | **Verified** | `tools/mcp_oauth.py`, `tools/mcp_oauth_manager.py`, `tools/mcp_oauth_device.py`, `tools/mcp_dashboard_oauth.py` |
| MCP server (Hermes *is* an MCP server) | Neither document mentions it | `hermes mcp serve` is a stdio MCP server exposing conversations, history, send, live events and approvals as 9+ tools | **Not mentioned** | `mcp_serve.py:1-6` |
| Provider / model selection | Matrix "Model/provider selection"; forensic §3 | A provider registry plus ~40 provider plugins (OpenRouter, Anthropic, Gemini, Bedrock, Ollama Cloud, LM Studio, …) | **Verified** | `agent/provider_registry.py:1-9`; `plugins/model-providers/` |
| Provider routing | Matrix "Provider routing" | Model metadata resolves context length and prefix routing from the live registry | **Verified** | `agent/model_metadata.py:1-6`; `agent/models_dev.py:1-6` |
| Fallback providers | Matrix "Fallback providers" | A rate-limit cooldown and fallback walk with per-session rejection markers | **Verified** | `agent/fallback_cooldown.py:1-2` |
| Auxiliary models | Matrix "Auxiliary models" | A shared auxiliary client routes side tasks (compression, search, vision, title) down a documented auto chain | **Verified** | `agent/auxiliary_client.py:1-8`; `cli-config.yaml.example:860` |
| Mixture of Agents | Matrix "Mixture of Agents" | `/moa` turns gather reference-model context before each model iteration | **Verified** | `agent/moa_loop.py:1-5` |
| Credential pools | Matrix "Credential pools"; forensic §35 | A persistent multi-credential pool for same-provider failover, with admin mixin and model cooldowns | **Verified** | `agent/credential_pool.py:1` |
| Prompt caching | Matrix "Prompt caching"; forensic §15 | An Anthropic prompt-caching strategy with four cache-control breakpoints and one TTL | **Verified** | `agent/prompt_caching.py:1-5` |
| Session model lock | Matrix row "Session model lock" | A dedicated `POST /api/sessions/{id}/model` route plus a model-guard module | **Verified** | `gateway/platforms/api_server.py:98`; `tui_gateway/methods_session_model_guard.py` |
| Local model runtime | Neither document mentions it | A managed llama-server "router mode" runtime with a curated GGUF catalog and hardware estimator | **Not mentioned** | `hermes_cli/local_runtime/supervisor.py:1-3`; `hermes_cli/local_runtime/catalog.py:1-3` |
| Agent profiles (durable isolated homes) | Matrix "Profiles"; forensic §4, §91 | A profile is a durable home that bootstraps `memories`, `sessions`, `skills`, `skins`, `logs`, `plans`, `workspace`, `cron`, `home` | **Verified** | `hermes_cli/profiles.py:1,33` |
| One profile, one writer | Forensic §4: "Hermes explicitly warns against running two independent processes against the same profile" | The source enforces exclusivity mechanically — `gateway.pid` is verified against the runtime lock and "fails closed" — but the prose warning was not located | **Not checked** (mechanism verified, warning text not found) | `hermes_cli/profiles.py:814` |
| Multi-profile serving | Matrix "Do not expose multi-profile machine switching" | One gateway can serve a chosen set of profiles via `profiles_to_serve(multiplex=…)`; registries are per-profile scoped | **Verified** (source has the capability) | `hermes_cli/profiles.py:1173`; `agent/provider_registry.py:1-9` |
| Skills list endpoint | Matrix row "List installed skills": "Hermes `/v1/skills`" | `GET /v1/skills` returns the same deterministic set `/skills list` shows | **Verified** | `gateway/platforms/api_server.py:1761,2953-2954` |
| Multiple skill hubs | Matrix "Search multiple hubs" | Adapters exist for well-known endpoints, direct URLs, LobeHub, browse.sh, ClawHub, GitHub, official and skills.sh | **Verified** | `tools/skills_hub_sources.py:1`; `tools/skills_hub_clawhub.py:1`; `tools/skills_hub_github.py`; `tools/skills_hub_official.py`; `tools/skills_hub_skillssh.py` |
| Skill install from sources | Matrix "Install from ClawHub/URL/GitHub/official sources" | A dedicated install module performs the import | **Verified** | `tools/skills_hub_install.py` |
| Skill security scan / quarantine | Matrix "Security scan/quarantine" | A skills guard does a regex static scan of externally-sourced skills plus a trust-aware install policy; AST audit and evaluator scan also exist | **Verified** | `tools/skills_guard.py:1-2`; `tools/skills_ast_audit.py`; `tools/skillevaluator_scan.py` |
| `/learn` from a source | Matrix "`/learn` from source/conversation"; forensic §10 | `/learn` builds one prompt that turns a described source into a reusable skill via `skill_manage` | **Verified** | `agent/learn_prompt.py:1-5` |
| Skill bundles / stacking | Matrix "Skill bundles/stacking"; forensic §10 | YAML bundles in `skill-bundles/` load several skills under one slash command | **Verified** | `agent/skill_bundles.py:1-5` |
| External skill directories | Matrix "External skill directories"; forensic §10 | `skills.external_dirs` are recognised and explicitly guarded against agent writes | **Verified** | `tools/skill_manager_guards.py:91,167-180` |
| Skill write approval | Matrix "Skill creation/edit"; forensic §10, §12 | Memory and skill mutations route through a shared write-approval gate | **Verified** | `tools/write_approval.py`; `tools/memory_tool.py:88` |
| Progressive disclosure | Matrix "Progressive disclosure"; forensic §10 | `SKILL.md` is preprocessed on load (template tokens, inline shell) rather than inlined into every prompt | **Verified** | `agent/skill_preprocessing.py:1-4` |
| Built-in bounded memory | Matrix "Persistent memory": "hard cap 2,200 chars total, rejects on overflow"; forensic §7 | Defaults are `memory_char_limit: 2200` and `user_char_limit: 1375`; an add that would exceed the limit is rejected with a consolidate instruction | **Verified** | `agent/agent_init.py:1355-1356`; `tools/memory_tool_store.py:99,277-290`; `tools/memory_tool.py:345` |
| Memory write approval | Forensic §9: "Hermes already supports memory write approval" | The memory tool stages a batch for approval before touching the store | **Verified** | `tools/memory_tool.py:88,197`; `tools/memory_tool_store.py:320` |
| External memory provider interface | Matrix "External memory providers"; forensic §8 | A `MemoryProvider` interface exists and the manager fans hooks out to registered providers | **Verified** | `agent/memory_provider.py`; `agent/memory_manager.py:1-5` |
| External provider is singular | Neither document states this | The manager allows **only ONE external plugin provider at a time** (tool-schema bloat, conflicting backends) | **Not mentioned** | `agent/memory_manager.py:3-5` |
| Memory provider plugins | Matrix "External memory providers: Runtime plugins available" | Five providers ship: byterover, holographic, mem0, openviking, retaindb | **Verified** | `plugins/memory/` |
| Curator / learning graph | Matrix "Curator/learning graph" | Dedicated curator and learning-graph modules exist | **Verified** | `agent/curator.py`; `agent/learning_graph.py` |
| `state.db` (SQLite) | Forensic §5: session metadata, message history, usage, FTS5, lineage | A large SQLite layer split across `hermes_state_*` modules covering schema, sessions, messages, usage, FTS and search | **Verified** | `hermes_state_schema.py`, `hermes_state_sessions.py`, `hermes_state_messages.py`, `hermes_state_usage.py`, `hermes_state_fts.py` |
| FTS5 session search | Forensic §6: "Hermes' FTS5 session search" | An FTS5 virtual table (`messages_fts_cjk`) with a CJK bigram tokenizer backs search | **Verified** | `hermes_state_fts.py:46` |
| `session_search` is already an agent tool | Matrix §"What changed", row "Session search/recall" | `session_search` is in the default toolset, alongside `memory` | **Verified** | `toolsets.py:25-26,134` |
| Session resume / transcript continuation | Matrix row "Resume transcript": "Measured broken 2026-08-15 — 3 runs, 3 sessions, 1 message each" | The session chat route loads the session's stored history and passes it to the agent, so the runtime *does* continue a transcript | **Verified that the capability exists**; the "broken" reading is a Companai-side measurement, not a Hermes limitation | `gateway/platforms/api_server.py:3613-3614` |
| Session fork | Matrix row "Fork transcript" | A `POST /api/sessions/{id}/fork` route and a `parent_session_id` lineage column exist; `/branch` clones a session | **Verified** | `gateway/platforms/api_server.py:95`; `hermes_state_sessions.py:325-327`; `gateway/slash_commands_branch_thread.py:1-7` |
| Rename / pin / archive / delete | Matrix row "Rename/pin/archive/delete" | `set_session_pinned` (exempt from auto-archive), `archive_sessions`, `delete_session` and a `display_name` column all exist | **Verified** | `hermes_state_sessions.py:992-994,1606,1771,238-239` |
| Session list / rich listing | Matrix row "List/search transcripts" | `list_sessions_rich` and `get_session` back listing; `/sessions` lists titled sessions with IDOR scoping | **Verified** | `hermes_state_sessions.py:814,1296`; `gateway/slash_commands_session.py:821` |
| Saved session threads | Neither document names this capability | `/save` exports the current session as a document (with `redact`); `/branch` opens a *new sibling thread* on Discord/Telegram/Slack/Matrix; `thread_id` is a first-class session column | **Verified** (source has it; documents only gesture at it as "Fork transcript" / "Import/export/prune sessions") | `gateway/slash_commands_session.py:1-2,715-716`; `gateway/slash_commands_branch_thread.py:1-7,18`; `hermes_state_sessions.py:238` |
| Hosted rooms / Group Chat rooms | Neither document mentions it | Durable multi-agent rooms with an append-only event log, up to 128 members, cross-gateway autonomous members with scoped grants, and replica takeover | **Not mentioned** | `gateway/hosted_rooms.py:1-3,88-137`; `gateway/hosted_room_peer.py:1-4`; `gateway/hosted_room_replicas.py:1-4` |
| Global emergency stop | Neither document mentions it | `hermes pause` / `hermes resume` write an `ESTOP` sentinel; cron, kanban and new gateway turns skip work while it exists; in-flight work is never killed | **Not mentioned** | `agent/estop.py:1-5` |
| LSP code intelligence | Neither document mentions it | A service-level LSP manager spawns one client per `(server, workspace_root)` and feeds diagnostics to the file layer | **Not mentioned** | `agent/lsp/manager.py:1-8` |
| OTLP observability exporter | Forensic §116 only *recommends* OpenTelemetry for the platform; neither doc says Hermes ships it | Hermes maps monitoring events to OTel spans over OTLP/HTTP via an optional extra | **Not mentioned as a Hermes feature** | `agent/monitoring/otlp_exporter.py:1-4` |
| Gamification (pets / achievements) | Neither document mentions it | A `pet` subsystem and a `hermes-achievements` plugin exist | **Not mentioned** | `agent/pet/`; `plugins/hermes-achievements/` |
| Google Meet plugin | Neither document mentions it | A `google_meet` plugin exists | **Not mentioned** | `plugins/google_meet/` |
| Goals | Neither document mentions it | `/goals` slash command and a `run_goals` module exist | **Not mentioned** | `gateway/slash_commands_goals.py`; `gateway/run_goals.py` |

---

## 2. MCP

The documents are right, and in one respect they understate the source.

The capability matrix lists MCP stdio, MCP HTTP/SSE, MCP tool filters/sampling, MCP OAuth, and MCP catalog/test/health. All five exist. The client lives in `tools/mcp_tool.py`, whose module docstring states it "connects to the `mcp_servers` configured in `~/.hermes/config.yaml` (stdio, Streamable HTTP or SSE), discovers their tools and registers them into the hermes tool registry" (`tools/mcp_tool.py:2-4`). Transport bring-up, including stdio spawn, Streamable HTTP/SSE connect, protocol negotiation and initial tool discovery, is split into `tools/mcp_tool_transport.py:1`. Per-server tool filtering is real: `_make_tool_filter(name, config)` decides what registers (`tools/mcp_tool_registration.py:211`). Server-initiated requests are handled for both sampling (`sampling/createMessage`, text and tool-use) and elicitation (`tools/mcp_tool_sampling.py:1-3`). OAuth is covered by four dedicated modules (`tools/mcp_oauth.py`, `tools/mcp_oauth_manager.py`, `tools/mcp_oauth_device.py`, `tools/mcp_dashboard_oauth.py`).

What neither document mentions is that Hermes is itself an MCP **server**. `hermes mcp serve` is a stdio MCP server that lets any MCP client (the docstring names Claude Code, Cursor, Codex) list conversations, read history, send messages, poll live events and manage approvals, matching "OpenClaw's 9-tool channel bridge surface plus the Hermes-specific `channels_list`" (`mcp_serve.py:1-6`). This is a second integration direction the documents do not describe.

---

## 3. Model management

Every model-management row in the capability matrix is borne out by the source: provider/model selection, provider routing, fallback providers, auxiliary models, Mixture of Agents, credential pools, provider OAuth/custom endpoints, and prompt caching.

- Selection and routing: a shared `ProviderRegistry` backs every pluggable-backend registry, with global and per-profile *scoped* maps (`agent/provider_registry.py:1-9`). Roughly forty provider plugins ship under `plugins/model-providers/`. Model metadata and context lengths come from `agent/model_metadata.py:1-6`, fed by the models.dev registry (`agent/models_dev.py:1-6`).
- Fallback: `agent/fallback_cooldown.py:1-2` implements "primary rate-limit cooldown arming and per-session model rejection markers, shared by the fallback walk".
- Auxiliary models: `agent/auxiliary_client.py:1-8` documents a shared router for side tasks with a text auto chain (main → OpenRouter → Nous Portal → custom endpoint → Anthropic → direct API-key providers) and a separate vision chain. The config surface is documented at `cli-config.yaml.example:860` ("Auxiliary Models (Advanced — Experimental)").
- Mixture of Agents: `agent/moa_loop.py:1-5` describes `/moa` turns where the normal loop still owns tool calling while reference-model context is gathered before each iteration.
- Credential pools: `agent/credential_pool.py:1` is "Persistent multi-credential pool for same-provider failover", with an admin mixin and model cooldowns.
- Prompt caching: `agent/prompt_caching.py:1-5` implements an Anthropic prompt-caching strategy with four cache-control breakpoints sharing one TTL.

The one thing the matrix calls out that the source confirms *and* extends is the session model lock: there is a first-class route `POST /api/sessions/{session_id}/model` (`gateway/platforms/api_server.py:98`) plus a guard module (`tui_gateway/methods_session_model_guard.py`).

Not mentioned anywhere in either document is the **managed local model runtime**. `hermes_cli/local_runtime/supervisor.py:1-3` supervises "one llama-server in router mode", and `hermes_cli/local_runtime/catalog.py:1-3` is "a curated starter catalog for the managed local runtime" whose entries carry measured GGUF estimator inputs. There is a whole subsystem — binaries, devices, hardware detection, GGUF parsing, Hugging Face browse, presets — under `hermes_cli/local_runtime/`. If we want on-prem or air-gapped inference, the runtime already ships the plumbing.

---

## 4. Agent profiles

The forensic doc's §4 and §91 and the matrix's "Profiles" row are correct. `hermes_cli/profiles.py:1` is "Profile management for multiple isolated Hermes instances", and line 33 defines the directories bootstrapped inside every new profile: `memories`, `sessions`, `skills`, `skins`, `logs`, `plans`, `workspace`, `cron`, `home`. That is a durable runtime home, exactly as the documents describe, and it is not a SaaS tenant boundary — the documents' central correction stands.

Two nuances the documents miss:

1. **The exclusivity is enforced mechanically, not by prose.** The forensic doc claims Hermes "explicitly warns against running two independent processes against the same profile because automatic memory writes can mix state" (§4). I could not find that warning text in the vendored source. What the source *does* have is a hard mechanism: profile liveness is judged by `gateway.pid` "verified against the runtime lock (fails closed when the lock isn't held by *this* reader)" (`hermes_cli/profiles.py:814`). So the conclusion is right; the stated evidence is not locatable in code.
2. **Multi-profile serving exists.** The matrix says not to expose multi-profile machine switching, but the source has `profiles_to_serve(multiplex=…)` (`hermes_cli/profiles.py:1173`) and per-profile scoped provider registries. One gateway can serve several profiles at once. That is a capability, not only a risk.

---

## 5. Skills

The matrix's skills section is accurate across the board: list, multi-hub search, preview, security scan, install from sources, update/audit/uninstall, per-profile enable, creation/editing, `/learn`, progressive disclosure, bundles and external directories.

- Listing: `GET /v1/skills` returns "a deterministic JSON listing of installed skills (name, description, category), the same set `/skills list` shows" (`gateway/platforms/api_server.py:2953-2954`).
- Multi-hub: adapters exist for well-known endpoints, direct URLs, LobeHub and browse.sh (`tools/skills_hub_sources.py:1`), plus ClawHub (`tools/skills_hub_clawhub.py:1`), GitHub, official and skills.sh. The hub facade is `tools/skills_hub.py:1-6`.
- Security: `tools/skills_guard.py:1-2` is "regex static scan of externally-sourced skills plus a trust-aware install policy"; AST audit and evaluator scan modules also ship.
- `/learn`: `agent/learn_prompt.py:1-5` builds the single prompt that turns a described source into a skill, gathering sources with existing tools and authoring via `skill_manage`.
- Bundles: `agent/skill_bundles.py:1-5` defines YAML bundles in `skill-bundles/` that load multiple skills under one slash command.
- External directories: `tools/skill_manager_guards.py:91,167-180` recognises `skills.external_dirs` and explicitly refuses agent writes to them.

The forensic doc's framing — "skills should be procedures generated from business truth, not the source of business truth" (§10) — is a design opinion, not a source claim, and nothing in the source contradicts it. The mechanism it relies on (skill write approval) is real: mutations route through the shared write-approval gate (`tools/write_approval.py`; `tools/memory_tool.py:88`).

---

## 6. Memory

This is the best-verified area, because the numbers are checkable.

- Caps: `agent/agent_init.py:1355-1356` sets `memory_char_limit=2200` and `user_char_limit=1375` as defaults. `tools/memory_tool_store.py:99` repeats them as constructor defaults. The matrix's "hard cap 2,200 chars total" and forensic §"Persistent memory has hard numbers" are correct.
- Overflow is rejected, not trimmed. `tools/memory_tool_store.py:277` is "Append a new entry. Returns error if it would exceed the char limit", and lines 288-290 return a consolidate-now message. `tools/memory_tool.py:345` states plainly: "IF FULL: an add is rejected with the current entries shown." The matrix's claim "A write that overflows is rejected, not trimmed" is correct.
- One subtlety: external writers can exceed the cap. `tools/memory_tool_store.py:157-161` warns that "External writers (MCP bridges, hand edits) can exceed the cap; the limit only fires on" the tool's own writes, and that over-limit entries "stay loaded". So the cap is a *tool* invariant, not a store invariant — worth knowing before we build on it.
- Write approval: `tools/memory_tool.py:88` imports the write-approval gate; line 197 returns a "was staged for your approval" message. Forensic §9 is correct.
- Provider interface: `agent/memory_provider.py` defines the interface and `agent/memory_manager.py:1-5` fans hooks out to registered providers.
- **The constraint neither document states**: "The builtin provider is always allowed; only ONE external plugin provider may be registered at a time (tool-schema bloat, conflicting backends)" (`agent/memory_manager.py:3-5`). Any design that assigns, say, a mem0 provider *and* a bespoke `PlatformMemoryProvider` to the same profile at once is foreclosed by the manager.
- Provider plugins: five ship under `plugins/memory/` — byterover, holographic, mem0, openviking, retaindb.
- Curator / learning graph: `agent/curator.py` and `agent/learning_graph.py` exist, matching the matrix's "Curator/learning graph" row.

---

## 7. Sessions

The forensic doc's §5 and §6 and the matrix's session rows are substantially correct, but the API surface is much larger than either document describes, and this changes one conclusion.

- `state.db`: the SQLite layer is real and large, split across `hermes_state_schema.py`, `hermes_state_sessions.py`, `hermes_state_messages.py`, `hermes_state_usage.py` and `hermes_state_fts.py`. Forensic §5 is correct.
- FTS5 search: `hermes_state_fts.py:46` creates an FTS5 virtual table (`messages_fts_cjk`) with a CJK bigram tokenizer. `tools/session_search_tool.py:1-2` is "Session Search Tool - long-term conversation recall over the SQLite session DB". Forensic §6 is correct, and the matrix's "session_search is already in our agents' hands" is confirmed by `toolsets.py:25-26,134`, where `session_search` sits in the default toolset next to `memory`.
- **The API server exposes a full session REST surface.** `gateway/platforms/api_server.py:83-98` registers `POST /v1/runs`, `GET /v1/runs/{run_id}`, `GET /v1/runs/{run_id}/events`, `POST /v1/runs/{run_id}/approval`, `POST /v1/runs/{run_id}/steer`, `POST /v1/runs/{run_id}/stop`, and then a session family: `GET|PATCH|DELETE /api/sessions/{session_id}`, `GET /api/sessions/{session_id}/messages`, `POST /api/sessions/{session_id}/fork`, `POST /api/sessions/{session_id}/chat`, `POST /api/sessions/{session_id}/chat/stream`, `POST /api/sessions/{session_id}/model`. Session identity travels in `X-Hermes-Session-Id` and `X-Hermes-Session-Key` headers (`gateway/platforms/api_server.py:76-77`).
- **Resume works at the runtime level.** The chat route loads the session's stored history and hands it to the agent: `history = await self._conversation_history_for_session(session_id)` then `_run_agent(conversation_history=history, …)` (`gateway/platforms/api_server.py:3613-3614`); the run route does the same at line 3699. So the matrix's row "Resume transcript — Measured broken 2026-08-15" describes a defect in *our* adapter's use of `/v1/runs`, not a missing Hermes capability. This is the clearest case in the batch where a document's conclusion must be read carefully: the code supports continuation; our integration did not reach it. The matrix itself half-concedes this ("our side only asks to resume when the previous run saved clean session details"), but its headline verdict reads as a Hermes limitation and should not be repeated that way.
- Fork / lineage: `POST /api/sessions/{session_id}/fork` and the `parent_session_id` column (`hermes_state_sessions.py:325-327`) implement the "Fork transcript" row.
- Rename / pin / archive / delete: `set_session_pinned` (line 992, "pins are exempt from the auto_archive sweep"), `archive_sessions` (line 1771), `delete_session` (line 1606) and the `display_name` column (line 238-239) implement the matrix row.
- Listing: `list_sessions_rich` (line 1296) and `get_session` (line 814); `/sessions` lists titled sessions with explicit IDOR scoping so "a co-member could [not] resume another member's live session" (`gateway/slash_commands_session.py:270,821`).

---

## 8. Saved session threads

Neither document names this capability, but the source has a coherent set of features behind it.

- **`/save` exports the current session as a document.** `gateway/slash_commands_session.py:715-716`: "Handle /save — export the current session and send it as a document." It supports formats via `normalize_save_format`, a `redact` flag (`hermes_cli/session_export_md.redact_session_data`), a size cap (`SessionExportTooLargeError`), and is shared with the CLI and TUI. The command set is named in the module docstring: `/new, /resume, /sessions, /branch, /title, /save, /undo, /retry, /topic, /compress` (`gateway/slash_commands_session.py:1-2`).
- **`/branch` opens a sibling thread on thread-capable platforms.** `gateway/slash_commands_branch_thread.py:1-7`: "On Discord, Telegram, Slack and Matrix a plain `/branch` opens a NEW sibling thread for the clone and leaves the current chat bound to the original session, so the user can keep both paths alive. `/branch --here` keeps the legacy in-place switch." The platform set is `BRANCH_THREAD_PLATFORMS` (line 18).
- **`thread_id` is a first-class session column**, alongside `session_key`, `chat_id`, `chat_type`, `parent_session_id` and `display_name` (`hermes_state_sessions.py:238-239,325-327`), and it scopes gateway routing (`gateway/session_transcript.py` handles per-session transcript I/O).

So "saved session threads" is real and richer than either document's nearest rows ("Fork transcript", "Import/export/prune sessions"). The matrix treats export and fork as separate admin-ish capabilities; in the source they are user-facing slash commands that any channel participant can invoke.

---

## 9. What the source has that neither document mentions

These are real, implemented capabilities absent from both documents. Each is a candidate to capitalise on.

1. **Hosted rooms / Group Chat rooms.** `gateway/hosted_rooms.py:1-3` owns "durable state for gateway-hosted Bot Mode rooms" with an append-only event log. The schema includes `hosted_rooms`, `hosted_room_events`, `hosted_room_links`, `hosted_room_remote_runs`, `hosted_room_revoked_grants` and `hosted_room_peer_reservations` (`gateway/hosted_rooms.py:88-137`), with `MAX_MEMBERS = 128`. Cross-gateway members are autonomous and admitted only against a scoped grant: "the target gateway verifies a scoped grant and the full task coordinates before admitting any model or tool work" (`gateway/hosted_room_peer.py:1-4`). Replicas can take over when the authority host dies, via `promote_replica()` at `epoch + 1` with a lineage-proving `authority.claimed` event (`gateway/hosted_room_replicas.py:1-4`). This is the closest thing in Hermes to "human and AI employees in a room", and neither document describes it.
2. **Global emergency stop.** `agent/estop.py:1-5`: "Global emergency stop (ESTOP) — a resumable pause for NEW work only. `hermes pause` writes a sentinel at `$HERMES_HOME/ESTOP`; `hermes resume` removes it. While it exists the cron scheduler, kanban dispatcher and new gateway turns skip work; in-flight work is never killed." A corrupt or empty file still counts as engaged (fail safe). This is a cheap, proven kill switch we should map onto our own.
3. **Managed local model runtime.** `hermes_cli/local_runtime/supervisor.py:1-3` supervises a llama-server in router mode with readiness probing; `hermes_cli/local_runtime/catalog.py:1-3` is a curated GGUF starter catalog. Supports on-prem/air-gapped inference.
4. **LSP code intelligence.** `agent/lsp/manager.py:1-8` spawns one LSP client per `(server_id, workspace_root)` and returns only new diagnostics relative to a per-file delta baseline. Directly relevant to any "developer employee".
5. **OTLP observability exporter.** `agent/monitoring/otlp_exporter.py:1-4` maps gateway monitoring events to OTel spans over OTLP/HTTP. The forensic doc recommends OpenTelemetry for the platform (§116) without noting Hermes already ships an exporter.
6. **Hermes as an MCP server.** `mcp_serve.py:1-6` (see §2 above).
7. **Gamification.** `agent/pet/` and `plugins/hermes-achievements/`.
8. **Google Meet.** `plugins/google_meet/`.
9. **Goals.** `gateway/slash_commands_goals.py` and `gateway/run_goals.py`.

---

## 10. What the documents already settle

Do not re-derive these; both documents cover them well and the source agrees.

- **MCP is an interface, not an authority layer** (forensic §18-19; matrix §4). The backend must fail closed independently of what the model can see. This matches the source's client/server design.
- **Skills are procedural projections, not business truth** (forensic §10-12; matrix §3). The write-approval and scan mechanisms exist to enforce this.
- **Built-in memory is bounded and non-authoritative** (forensic §7-9; matrix "Persistent memory"). The 2200/1375 caps and rejection-on-overflow are confirmed.
- **`state.db` stays Hermes-owned; the platform keeps its own mapping** (forensic §5). Confirmed by the size and scope of `hermes_state_*`.
- **A Hermes profile is a runtime identity, not a tenant** (forensic §4, §91; matrix "Profiles"). Confirmed.
- **Cron is an execution projection, not canonical workflow state** (forensic §30; matrix §5). The `cron/` tree is large and real, but the authority argument stands.
- **Tool Search, plugins and hooks are extension points** (forensic §16, §20-22; matrix §4-5). Confirmed by `tools/tool_search*.py`, `plugins/`, `gateway/hooks.py`.
- **The three-kernel model and Business IR** (forensic Part II-III) are design proposals, not source claims; they are unaffected by this audit.

---

## 11. Lessons for our platform

1. **Stop describing session resume as broken in Hermes.** It is broken in our adapter. The runtime continues a transcript via `POST /api/sessions/{id}/chat` and loads history for `/v1/runs` (`gateway/platforms/api_server.py:3613-3614,3699`). Wire the session routes we already have rather than building a workaround for a defect that is ours.
2. **The session REST API is the integration surface we want.** CRUD, messages, fork, chat, chat/stream and model-lock all exist (`gateway/platforms/api_server.py:83-98`). The matrix's "not exposed to the human user" is a statement about our UI, not about Hermes.
3. **Adopt ESTOP as our global kill switch.** It is one sentinel file, fails safe on corruption, and already gates cron, kanban and new turns (`agent/estop.py:1-5`). Mapping our own pause to it is nearly free.
4. **Respect the one-external-memory-provider rule.** If we ship `PlatformMemoryProvider`, we cannot also assign a marketplace memory plugin to the same profile (`agent/memory_manager.py:3-5`).
5. **Treat the 2200/1375 caps as hard.** They reject on overflow; they are not a soft budget. And note the cap does not constrain external writers (`tools/memory_tool_store.py:157-161`).
6. **Look hard at hosted rooms before designing our own multi-agent room model.** The event log, 128-member limit, scoped cross-gateway grants and replica takeover are already built (`gateway/hosted_rooms.py`, `hosted_room_replicas.py`). If we build a parallel room model we will duplicate this and then diverge.
7. **Take OTLP and LSP for free.** Both ship; neither needs to be built.
8. **Do not run two processes against one profile.** Exclusivity is lock-enforced and fails closed (`hermes_cli/profiles.py:814`); plan profile packing accordingly (forensic §91 already says this).

---

## 12. What I could not verify

- **The profile concurrency warning text.** The forensic doc §4 states Hermes "explicitly warns against running two independent processes against the same profile because automatic memory writes can mix state." I did not find that warning in the vendored source (searches of `hermes_cli/profiles.py`, `README.md` and `AGENTS.md`). The *mechanism* is present — liveness verified against a runtime lock that fails closed (`hermes_cli/profiles.py:814`) — but the quoted warning is not locatable in this tree. The conclusion survives; the evidence does not.
- **The matrix's "measured broken 2026-08-15" numbers** (three runs, three sessions, one message each) are a Companai-side runtime measurement. I cannot reproduce or verify them from the Hermes source, and the source shows the continuation capability exists. I have reported the capability as verified and the measurement as outside this batch's scope.
- **Companai-side integration claims.** The matrix's statements about what Companai does — the derived company+agent+issue session key, the `X-Hermes-Session-Key` header, the run-scoped callback JWT in model-visible instructions, the 30-tool provisioned toolset, and the dirty recovery patch — describe our own codebase, which I was not given in this batch. I could not verify them here. (Note that the source's own continuity header is `X-Hermes-Session-Id`, not `X-Hermes-Session-Key`, at `gateway/platforms/api_server.py:76`.)
- **Runtime behaviour.** This audit is static: I read the source but did not execute the runtime. A capability that is present in code may still be gated by config, a feature flag or a broken dependency at run time. The matrix's own "Feature admission checklist" (a runtime capability probe on the exact deployed version) remains the right gate before we rely on any of these.
- **Preview, install and update flows for skills.** The matrix claims the dashboard supports preview, install, update, audit, uninstall and reset. I confirmed the underlying modules (`tools/skills_hub.py`, `skills_hub_install.py`, `skills_guard.py`) and the `/v1/skills` listing, but I did not trace every dashboard route, so the per-flow dashboard claims are only partially checked.
