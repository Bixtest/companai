# 02 — Capability and operational design

## Map Hermes's inference needs to llama-server

Hermes requires a model provider, not a second account/tenant system inside the inference server. Existing local setup used Hermes custom provider settings and an OpenAI-compatible base URL. The server documents a chat-completions endpoint and function/tool-call support, but tool behavior depends on the selected model's chat template/parser and exact server version.

| Need | Server surface / design | Qualification required |
|---|---|---|
| Agent chat and streamed output | `/v1/chat/completions` | Prompt/template correctness, streaming/cancellation, timeouts, context accounting, errors |
| Hermes tool calls | Chat endpoint with tool definitions; Jinja/template/parser path | Repeated end-to-end tests of structured `tool_calls`, arguments, multiple calls and follow-up turns using the exact model + llama.cpp + Hermes versions |
| Structured JSON | Supported response-format/schema mechanisms vary by build | Schema adherence, failure response, schema-size cost; do not use as a substitute for authorization |
| Model identity/capability | `/v1/models` gives loaded model information | Treat as runtime discovery only, not the canonical Companai registry or tenant allowlist |
| Readiness | `/health` reports loading/ready | It is public per docs; keep on private network and do not use as an authenticated business API. Add startup/readiness and timeout policy at orchestration layer |
| Embeddings | `/v1/embeddings` only when compatible model pooling/capabilities are present; separate embedding-specific endpoint/flags also exist | Dedicated embedding model and end-to-end vector dimension/index compatibility; the recorded B-16 says present path was not working |
| Reranking | Optional endpoint/configuration | Measure relevance, latency and tenant-safe retrieval flow; not required to fix embedding absence |
| Vision/audio/video | Model/projector and build-dependent support | Treat as separate modality capabilities with data policy and payload-size limits; no vision deployment is proven by the current sprint report |

The official docs describe the API as OpenAI-style and explicitly avoid claiming complete spec compatibility. Keep llama-specific quirks in the adapter. Do not bind application behavior to internal Web UI `/tools` endpoints; upstream docs say downstream applications should not use them.

## Tool calls: model syntax is not authority

The correct flow is model output → server parser → structured candidate call → Hermes validation/orchestration → authenticated Starting Kit MCP → tenant policy and approval → domain action → audit. The model must not directly execute shell or database operations as a shortcut around this chain.

The Qwen/Hermes reports document historical cases where a model's textual tool syntax was not returned as structured tool calls. They also record upstream parser improvements, but those findings were dated and not revalidated here. Use the exact qualified build and test with reasoning both enabled and disabled where relevant. Do not add broad “scrape arbitrary assistant text and execute it” recovery in platform core. If compatibility normalization is necessary, scope it to a named provider/model, require exact allowlisted tool names and schema-valid arguments, fail closed, log the normalization and retain a kill switch.

## Embeddings and retrieval are their own lane

Current recorded blocker B-16 is architecturally important. Chat inference does not mean an embedding API is available. Before claiming an all-local AI stack:

1. Decide which component owns embedding generation and vector indexing for platform knowledge/tool search.
2. Add an embedding capability/profile to the model registry. It may map to a dedicated embedding GGUF/runtime, a separate `llama-server` process, or an allowed external provider; do not point the chat model at an embeddings call and assume success.
3. Define stable model revision, vector dimension, normalization, chunking and reindex/migration behavior. Changing embedding model/dimension is a data migration, not a harmless provider setting.
4. Ensure tenant filters are enforced by the platform's retrieval/query layer, including before prompt assembly. Embeddings themselves provide no authorization.
5. Document an explicit degraded mode if embeddings are unavailable; lexical search or curated tool discovery is safer than pretending semantic search is healthy.

## Performance and resource policy

The existing laptop observation is a warning against a “local equals fast” claim. A large Hermes system prompt plus 21 MCP tool schemas dominated prompt ingestion on CPU; generated tokens were also slow. Lowering response length does not eliminate prompt-prefill cost. Proposed optimizations, in order:

1. Reduce repeated prompt/tool schema payload, expose only tools relevant to the task, and use Hermes/platform prompt caching only where its semantics and isolation are understood.
2. Use deterministic platform Functions for repeated verified work, avoiding inference entirely for those operations as the vision intends.
3. Choose model/profile and context budget by task capability; avoid forcing every request to 64K. Hermes' context minimum and actual model trained context must both be respected when that specific Hermes workflow requires it.
4. Measure prompt tokens/sec, generation tokens/sec, time-to-first-token, full task time, cancellation/retry, RAM/VRAM, queue wait, concurrency and error rates on each target hardware profile.
5. Set bounded queue and concurrency per deployment. A single shared model avoids duplicated weights, but may serialize work; multiple slots can multiply KV-cache memory and degrade latency. Do not assume throughput scales linearly.
6. Consider router mode, sleep-on-idle or multiple profiles only after measuring memory/load churn and model-switch latency. Start with a single fixed model in constrained deployments unless evidence supports a router.

Published model file size is not runtime memory. Include weights, KV cache/context, runtime buffers, parallel slots, other containers and host headroom. Recompute capacity for each model, quantization, context, backend and hardware.

## Deployment topologies

### A. Same private Compose/network (best default for one host)

Keep app, Hermes and model endpoint on private container networks. Do not publish inference port publicly; optional loopback publishing is for local diagnosis only. Persist model artifacts separately from application image/build context and pin image/model revisions. Add health/readiness, restart policy, resource limits and controlled startup dependencies. This is closest to the currently reported Sprint 0 shape.

### B. Split host with private transport (only when capacity requires it)

The dated Coolify review explores laptop-hosted inference and a VM-hosted platform because VM RAM/GPU constraints prevented co-location. Keep the network private with VPN/tunnel/firewall allowlists and authenticate service-to-service calls. Validate routing after reboot and model unavailability handling. A public IP and API key alone are not a private network. Avoid depending on an interactive user's laptop for customer availability without explicit product/operations acceptance.

### C. Per-customer model service

Offer dedicated inference instances only when data isolation, performance or customer hardware requires it. This increases operational burden, model duplication, upgrades and cost. It is a deployment isolation option, not a tenant model to impose universally.

## Security and privacy controls

- Keep server port private; use TLS/authentication where transport crosses a trust boundary. The server API key authenticates service callers and does not express user, tenant, record or action permission.
- Do not send tenant secrets, credentials or unrestricted database access to the model container. The inference server should have only model files and runtime resources it needs.
- Protect model downloads, verify artifact hashes/licenses, pin server image/build and GGUF revision; do not auto-upgrade a production-compatible parser/model silently.
- Bound request bytes, context, output tokens, queue time, cancellation and rate per tenant. Prevent one tenant's long request from starving another (fair queues or per-tenant budgets at broker).
- Treat prompts, retrieved text and model output as untrusted. Tool allowlists and schema validation belong in Hermes/platform boundaries; output parsing is not authorization.
- Decide whether prompt/response logging is disabled, redacted, sampled or retained. Scrub secrets; protect logs with tenant-aware access and lifecycle.
- Keep `/health`, metrics, model-management and UI surfaces off public ingress. Router/model download and dynamic load APIs increase control-plane risk; disable or isolate when not needed.
- Define behavior for out-of-memory, load failure, model mismatch, timeouts, partial streams and upstream provider fallback. Fallback must remain within tenant's privacy/provider policy.

## Observability contract

Record metadata sufficient to explain decisions without making raw content the default audit log: request/correlation ID, tenant policy revision, purpose/capability, selected profile/provider/model/server revision, input/output token counts if available, queue/inference latency, retries/cancellations, error class, and downstream tool-call outcomes. Separate platform audit events (who/tenant/decision/action) from inference telemetry. Do not claim B-17 is resolved by llama-server logs.
