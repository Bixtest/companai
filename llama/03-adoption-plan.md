# 03 — Adoption plan and decision register

## Recommended phased plan

The central architecture decision is to make **model management native to Companai while keeping inference execution process-isolated**. “Integrated” means one product-owned registry/policy/control plane, configuration generation, lifecycle/status and tenant-aware limits; it does not require linking llama.cpp into the Hermes Python process or Starting Kit web server.

### Phase 0 — Reconcile current state (read-only architecture task)

- Treat the 2026-10-05 Sprint 0 runbook as evidence that local chat inference and separate MCP tool discovery worked in that configuration; do not infer production multi-tenant readiness from it.
- Inventory the actual Starting Kit model/provider factory, Hermes provider configuration, MCP invocation identity, and current `docker-compose.fullapp.yml` service/network settings in a later implementation task. Determine which platform-native AI paths bypass Hermes and whether they call an OpenAI-compatible provider directly.
- Recheck B-16 embeddings and B-17 tool-call audit status against current code/runtime before changing priorities. This analysis did not re-run either.
- Freeze a source/version evidence set (llama.cpp build, Hermes version, GGUF, chat template, flags, platform commit) before qualifying behavior.

### Phase 1 — Define the product contract

- Ratify `ModelRuntime` and Broker responsibilities, capability names, tenant/privacy inputs, error semantics, streaming/cancellation, usage metadata and audit identifiers.
- Define one platform model registry/policy representation, consumed by both Hermes configuration and Starting Kit model paths. Secret material should be injected by deployment/runtime secret handling and must not enter user-visible model registry data.
- Specify model profile records: capability, provider/runtime, immutable model revision/quantization, trained/served context, tool/structured-output support, embedding dimensions, modality, privacy locality, resource estimate, lifecycle and qualification status.
- Decide which requests are allowed to fall back to cloud, which must fail closed, and how users see a degraded model service.

### Phase 2 — Define native management; qualify the runtime

- Design the Companai model-management surface around catalog, profile, install/download/verification, enable/disable, resource eligibility, status, upgrade/rollback and capability qualification. Keep artifacts on persistent managed storage and runtime binaries/images pinned.
- Decide whether Companai invokes Hermes' supported managed-local runtime for single-user desktop/dev, or supervises a dedicated `llama-server` service for multi-tenant deployments. Modes can share a registry/contract while having different lifecycle owners.
- For product-managed headless deployment, have the Starting Kit/orchestrator provision/configure and monitor the llama.cpp process/container. Hermes points to that endpoint. Do not give each Hermes profile independent authority to download arbitrary models or consume unbounded host resources.
- Keep process isolation. Do not embed llama.cpp directly in the app server unless profiling and operational requirements show the benefit outweighs crash/resource/upgrade coupling.

- Implement or specify only a thin `LlamaCppRuntime` mapping the common contract to documented APIs. Keep version-specific flags/protocol details at this edge.
- Qualify one fixed chat model for Hermes tool loops and platform structured output. Capture exact revisions and representative prompts/tool schemas; test malformed/partial tool calls and long-context limits.
- Separately qualify an embedding model/runtime and index compatibility. Do not mark `embed` available because a server binary has an endpoint.
- Confirm private networking, auth, health readiness, resource ceilings, model artifact persistence and restart/unavailable behavior on the intended deployment.

### Phase 3 — Route without duplicated policy

- Migrate one platform-native AI path and one Hermes-backed path to the same platform policy/registry, retaining their appropriate execution responsibilities.
- Hermes remains responsible for agent loop and session; the Starting Kit remains responsible for tenant identity, business context, approval and MCP execution. The inference adapter should not become a new frontend/agent/chat platform.
- Add per-tenant request limits and model policy checks before calls. Enforce tool authorization independently after each generated tool call.
- Add metadata audit/telemetry and failure-safe user-visible status.

### Phase 4 — Optimize from evidence

- Baseline TTFT, prompt/generation throughput, end-to-end time, queue wait, memory and quality on the target machine and real (redacted/synthetic where possible) workload.
- Reduce prompt/tool payload; use deterministic Functions for repeated validated work; right-size context; adjust concurrency/model size only with repeatable evidence.
- Compare one shared server versus any multi-profile/router or dedicated per-customer design only for identified workloads. Preserve rollback and avoid silent profile/model changes.

## Release gates (recommendation, not test results)

Do not call a deployment ready until all apply:

- [ ] Both platform-native and Hermes inference requests are subject to one documented tenant/provider policy.
- [ ] A business tool call cannot reach a mutation path except through the Starting Kit's authenticated MCP and policy resolver.
- [ ] Each advertised capability has exact model/build qualification; chat, tool calling, embeddings and multimodal support are distinct.
- [ ] No public inference/control-plane exposure; service auth, network boundaries and secret lifecycle are defined.
- [ ] Cross-tenant tests cover retrieval filters, request/session/cancellation/log behavior and queue/resource fairness.
- [ ] Load tests on target hardware capture latency, throughput, headroom, concurrency and failure behavior (not extrapolated from GGUF file size).
- [ ] Policy-constrained outage/fallback behavior is explicit; no unauthorized cloud fallback.
- [ ] Model/server upgrades are pinned, staged and can be rolled back; saved Function behavior does not silently drift.
- [ ] Tool-call audit and platform-side action provenance meet the product ledger requirement.

These are proposed gates. This documentation task did not run them.

## Decision register

| ID | Decision / question | Recommendation | Status |
|---|---|---|---|
| D1 | Is `llama-server` itself the platform architecture? | No. It is one replaceable `ModelRuntime` adapter and inference service. | Recommended |
| D2 | Does llama-server replace Hermes? | No. Hermes is the agent runtime; llama-server emits model results. | Settled by current product docs |
| D3 | Does llama-server perform tenant authz? | No. Starting Kit owns identity, scope, approvals and business-action authorization. | Required boundary |
| D4 | Where is model policy? | Starting Kit-owned broker/policy, with transitional config generated for Hermes and platform AI paths. | Recommended target |
| D5 | One server or many? | One shared process per deployment to start where hardware supports it; isolate per deployment/customer only for defined reasons. | Default recommendation; hardware dependent |
| D6 | Router mode now? | Not by default. Begin with fixed model; evaluate dynamic loading when workload/capacity data justifies it. | Deferred |
| D7 | How to solve embeddings? | Qualify a dedicated embedding capability/profile and index migration, or explicitly choose a policy-approved provider. | Open; B-16 recorded |
| D8 | Does local mean faster? | No such claim. Existing CPU observation is slow; benchmark target hardware and optimize prompt/tool call work. | Evidence required |
| D9 | Should llama-server built-in tools/MCP be used for product actions? | No. Use Hermes orchestration and Starting Kit MCP authorization boundary. | Recommendation |
| D10 | Does OpenAI-compatible mean drop-in equivalent? | No. Normalize and test at adapter; pin version and model/template. | Required |
| D11 | Can Hermes select models independently? | It may operate within a platform-approved set; tenant privacy and capability ceilings remain platform-owned. | Target policy |
| D12 | Can Functions use whichever model is current? | Only if explicitly versioned/qualified; pure deterministic Functions should bypass inference. | Product vision requirement |

## Open research before implementation

1. Inspect current Starting Kit AI module/provider factory and identify its config/data model and available policy seams; do not assume the ideal Broker already exists in code.
2. Inspect the current MCP auth context propagation and decide how Hermes invocations carry immutable tenant/user/agent provenance end-to-end.
3. Determine whether the platform's embedding client can point to a llama-compatible endpoint, what request body/header it sends, and whether its vector store can separate embedding model/index revisions.
4. Verify Hermes custom-provider support and version-specific function-call, context, streaming and auxiliary-model behavior against the exact locked source. The large sibling deployment SSOT is not authoritative for Starting Kit.
5. Decide privacy/log retention policy, on-prem versus hosted service boundaries, tenant fairness, local/cloud fallback and customer-specific isolation tiers.
6. Decide what “single codebase” means here: one deployable product/repo with distinct service process is compatible with a shared architecture. Embedding the C++ inference engine in the web/API process is not recommended absent compelling evidence; it risks resource isolation, upgrade coupling and availability.

## Short answer to the question

Yes: make model management and inference a native Companai capability, but keep model execution in a managed llama.cpp process/service. Share one platform-owned model registry/policy across Hermes and platform-native AI; Hermes consumes the selected endpoint as its inference provider and remains the agent runtime. This creates product-level unity without tying model crashes, memory pressure and upgrade cadence directly to the app/Hermes process. The current working local endpoint is a strong starting point; performance and embedding capability remain factual gaps, not benefits to assume.
