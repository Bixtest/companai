# Source register

Evidence cut-off: 2026-10-05. Local files were opened read-only. Online claims below refer to official upstream llama.cpp documentation checked for this analysis; upstream `master` is mutable, so operational decisions must pin a commit/release and repeat qualification.

## Companai product and development documents

- `C:\Users\Ramzi\Downloads\companai\library\INDEX.md` — document map and caution that sibling Paperclip material is evidence, not product truth.
- `C:\Users\Ramzi\Downloads\companai\library\ai\ai-first\03_Local_First_AI_Runtime_and_User_Function_Architecture.md` — local-first direction; Hermes role; Model Runtime abstraction; Model Broker/Policy; capabilities, registry, profiles, Functions and llama.cpp topology.
- `C:\Users\Ramzi\Downloads\companai\library\development\ARCHITECTURE.md` — Starting Kit/Hermes/model ownership and arrows; current compose evidence and agent/platform boundaries.
- `C:\Users\Ramzi\Downloads\companai\library\development\RUNBOOK-sprint0.md` — dated stack state, model, endpoint checks, observed performance and runbook sharp edges.
- `C:\Users\Ramzi\Downloads\companai\library\development\BLOCKERS.md` — B-16 embeddings and B-17 audit-trail records plus resolved Hermes/model setup constraints.
- `C:\Users\Ramzi\Downloads\companai\library\development\HANDOVER.md` — product vision, 2026-10-05 project status, architecture overview and proven/unproven split.
- `C:\Users\Ramzi\Downloads\companai\library\development\REVIEW-coolify-laptop-architecture.md` — dated hybrid laptop/VM placement review, network and availability caveats.
- `C:\Users\Ramzi\Downloads\companai\library\development\PLAN-coolify-laptop-implementation.md` — proposed host/VM implementation phases; not itself proof of all phases being commissioned.

## Supporting integration research (not Companai authority)

- `C:\Users\Ramzi\Downloads\companai\library\ai\PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` — sibling Paperclip VPS deployment candidate, useful for topology/security/qualification patterns; its hardware, selected Qwen3.5 model, 65K context, resource caps and flags do not transfer automatically.
- `C:\Users\Ramzi\Downloads\companai\library\ai\qwen-hermes-tool-calling-report.md` — dated Qwen3.5/llama.cpp/Hermes parser and tool-call compatibility research; validate the exact current versions before relying on it.
- `C:\Users\Ramzi\Downloads\companai\library\paperclip-hermes-study\` and the sibling `C:\Users\Ramzi\Downloads\companai\analysis\` Hermes reports — background on Hermes and Paperclip integration patterns, not a decision to copy Paperclip architecture.

## Official upstream llama.cpp references

- [llama.cpp server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) — documented server routes, OpenAI-style API, health, auth, embedding/reranking requirements, tool calling, router mode, model loading and operational flags.
- [llama.cpp server developer README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README-dev.md) — server/router architecture and implementation details; use only when necessary, since internal details can change.
- [llama.cpp repository README](https://github.com/ggml-org/llama.cpp/blob/master/README.md) — project goals, supported backends and general inference capabilities.

## Official upstream Hermes references

- [Hermes local models guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/local-models.md) — managed local model/runtime feature for supported desktop/local modes, llama.cpp runtime and model management, and externally run llama-server configuration.
- [Hermes custom/self-hosted provider guide](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/integrations/providers.md) — connecting Hermes to OpenAI-compatible inference endpoints such as llama-server.
- [Hermes model provider source](https://github.com/NousResearch/hermes-agent/tree/main/plugins/model-providers) — implementation-level provider integration; mutable source, so pin the exact release before relying on details.

## Source-use caveats

- “OpenAI-compatible” describes practical API surface compatibility; the server README does not promise perfect behavioral/spec parity.
- Endpoints can be present while a selected model/config is incapable of using them. `embed`, vision and tool-call claims require model-specific qualification.
- Router mode, security flags and defaults may evolve. This report avoids specifying a production command line because the target hardware/deployment decision is not settled.
- Local performance/model values are dated measurements from cited reports, not independently repeated here.
- Hermes documents both a managed-local-model experience and external endpoints. Availability depends on distribution and launch mode; verify the version embedded in Companai rather than assuming desktop behavior applies to Compose.
