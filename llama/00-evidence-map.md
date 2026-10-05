# 00 — Evidence map and method

**Read-only analysis, evidence cut-off 2026-10-05.** This report examined local documents and official llama.cpp upstream server documentation. No code or deployment was changed and no runtime was tested as part of this analysis.

## Evidence hierarchy

1. Companai's product/architecture direction: `library/ai/ai-first/03_Local_First_AI_Runtime_and_User_Function_Architecture.md`, the development architecture/runbook/blockers/handover, and the `library/INDEX.md` index.
2. Observed deployment records: `library/development/RUNBOOK-sprint0.md`, `BLOCKERS.md`, and dated architecture review material. These establish what was reported measured at that time, not what a different host or future build will do.
3. Supporting component evidence: `library/ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md`, `qwen-hermes-tool-calling-report.md`, `library/paperclip-hermes-study/`, and sibling Paperclip integration analysis. These are useful implementation studies, but a Paperclip VPS configuration is not Companai's architecture decision.
4. Upstream behavior: official `ggml-org/llama.cpp` server documentation and source. API support and flags are version-sensitive. Pin and re-check the exact build before deployment.

## Batch notes

### Batch A — Product and platform intent

- AI-first architecture names Hermes the primary agent runtime and llama.cpp/`llama-server` the primary local inference candidate, while requiring compatibility with other local/cloud providers.
- It explicitly calls for `ModelRuntime` operations such as `chat`, `structured_output`, `tool_call`, `embed`, `vision`, and `rerank`, plus a platform-level Model Broker/Policy layer.
- Business policy, tenant scope, identity, approvals, deterministic business execution, and durable truth belong to the platform. A model is an interchangeable capability, not an authority.
- The architecture warns against coupling a saved deterministic Function to a silently changing model. If an AI substep exists, record policy/model version and preserve the deterministic compiler/execution rules.

### Batch B — What is already running/reported

- `RUNBOOK-sprint0.md` reports the local stack had eight containers on 2026-10-05: app, MCP, Hermes, model, OpenCode, Postgres, Redis and Meilisearch. It reports a Qwen2.5-7B-Instruct Q4_K_M GGUF (4.68 GB), and Hermes discovering 21 platform MCP tools.
- The runbook records separate arrows: Hermes-to-MCP for platform actions, and Hermes-to-`model:8080/v1` for inference. It reports loopback publishing by default and model startup taking about 60–90 seconds on that machine.
- The same runbook reports CPU-only behavior on 2026-10-04: approximately 15,700 prompt tokens, prompt ingestion around 12 tokens/sec and declining as context grew, around 0.8 generation tokens/sec, and a real turn potentially taking 20+ minutes / an hour-scale budget. These are machine/model/prompt-specific observations, not general llama.cpp benchmarks.
- `BLOCKERS.md` records B-16: platform vector tool-search could not build because the local model endpoint was chat-only for this configuration and the configured embeddings request failed. It proposes a dedicated embedding model/server or another embedding provider. The exact present code/config was not re-run here; treat this as an open recorded issue, not a newly verified live defect.
- `BLOCKERS.md` records B-17: a database audit trail for agent tool calls was missing in the cited milestone. That is a platform observability/governance concern, not an inference-server feature.
- Context sizing required explicit treatment. A separate prior test found llama.cpp capped a requested 65,536 context to training context 32,768 until YaRN scaling was configured; Hermes also required its own declared context. Context length is not guaranteed by a model name or server flag alone.

### Batch C — Deployment alternatives and constraints

- The dated Coolify/laptop review says its VM was too constrained for the chosen model and evaluates moving inference to the Windows host over a private Hyper-V network. It flags that network binding and availability assumptions needed commissioning proof. This is a topology option, not a universal deployment choice.
- The platform runbook documents the current same-Compose `model` service path. It should not be overwritten conceptually by the separate Paperclip VPS SSOT, which selects another Qwen version, CPU/RAM envelope, server flags, single-slot policy and private Docker network.
- A sibling SSOT is valuable for patterns such as one shared inference process, private service networking, API-key authentication, persistent model files, explicit concurrency, version pinning and acceptance criteria. Its numbers and “locked” choices apply to that sibling host only.

### Batch D — Current upstream server contract

Checked official llama.cpp server docs on 2026-10-05. Current documentation describes OpenAI-style `/v1/chat/completions`, `/v1/completions`, `/v1/models`, and `/v1/embeddings` (subject to model/pooling requirements), a public `/health` endpoint, optional API keys, optional router mode for multiple models, tool calling dependent on templates/Jinja, and various server-specific endpoints. Compatibility is practical rather than a promise of perfect OpenAI specification parity. The server docs explicitly caution downstream applications against depending on its internal `/tools` Web UI endpoint.

These facts establish potential integration surfaces, not that every deployed model/build/config supports every feature. In particular, chat-model support does not imply embedding capability; a distinct embedding model may be needed. Router mode and API details can change.

## Confidence and caveats

| Claim | Confidence | Caveat |
|---|---|---|
| Companai intends provider-neutral local-first AI with Hermes as agent runtime | High | Product vision; implementation may lag it |
| llama-server is suitable as an inference adapter | High | Current upstream capability; specific model/build must qualify |
| Sprint 0 proved local chat inference plus separate MCP tool access | High for dated report | This analysis did not repeat the test; it proves only the recorded configuration |
| Current platform-native and Hermes requests share one central policy path | Low / not established | Existing documents show distinct configuration paths; proposed target, not current fact |
| Local embeddings work for the current deployment | Low / contradicted by dated blocker | B-16 states otherwise; status must be rechecked |
| Local inference improves performance | Not established | Recorded laptop measurement is slow; no comparative benchmark here |
| Multi-tenant safety follows from llama-server authentication | False | Server key authenticates a service client, not a tenant/business operation |

## Non-goals

No review of secrets, credentials, `.env` content, live service access, code diffs, or benchmark execution was performed. No claim in these documents should be read as certification that a live tenant deployment is isolated or production-ready.
