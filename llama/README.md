# Llama-server integration analysis

**Purpose:** assess how Companai should integrate model management and llama.cpp inference with the Starting Kit and Hermes, using a provider-neutral runtime and platform-owned policy.

**Evidence cut-off:** 2026-10-05. Local source and deployment documents were read only. This folder is the only place this analysis writes. No source tree, compose file, model, service, or database was changed; no benchmark or runtime test was run for this report.

## Findings at a glance

1. Hermes needs an inference engine to execute open-weight models, but “Hermes cannot have models straight in it” needs qualification: current Hermes documentation describes a managed local-model experience that installs/manages llama.cpp and models for supported desktop/local modes, as well as connecting to externally managed OpenAI-compatible endpoints. Model weights run in an inference engine process, not in Hermes’ Python agent loop.
2. The product architecture already calls for a provider-neutral `ModelRuntime` abstraction and a platform `Model Broker / Policy Layer`. Treat llama.cpp as one adapter behind that boundary. Keep the provider protocol out of business modules.
3. Existing deployment evidence is useful but is not an acceptance result for a production multi-tenant product. The 2026-10-04 CPU-only run measured a ~15.7k-token Hermes prompt, ~12 prompt tokens/sec (declining with context), ~0.8 generated tokens/sec, and a 20+ minute/possibly hour-scale agent turn. The exact model and laptop setup are not a capacity guarantee for other hardware or builds.
4. Model inference is only one capability. Local embeddings are not currently proven: the recorded local endpoint provides chat but the platform's vector integration expects embeddings. Embedding, reranking, vision, structured output, and tool-call semantics need independent capability declarations and qualification.
5. The decision is where model lifecycle/configuration belongs and whether inference is an independently deployed service. Recommendation: integrate model catalog, profile selection, policy, lifecycle controls and observability organically into the Companai product; keep llama.cpp as a separately managed process/service boundary. Hermes may manage a local engine in supported modes or connect to the platform-managed endpoint; production multi-tenant lifecycle should be controlled by Companai policy.
6. Multi-tenancy must be enforced before inference by platform policy and at the tool/data boundary. A shared model process can serve multiple tenants, but request content, logs, cache/session behavior, concurrency, model selection, and hardware isolation require explicit privacy and resource policy. An API key on llama-server is service authentication, not tenant authorization.

## Documents

- [00 — Evidence map and method](00-evidence-map.md): source hierarchy, local evidence, conflicting/stale claims, and confidence labels.
- [01 — Target architecture](01-target-architecture.md): components, request flows, ownership, tenant boundary and integration seams.
- [02 — Capability and operational design](02-capability-and-operations.md): chat/tools, embeddings, model registry, performance, deployment and security.
- [03 — Adoption plan and decision register](03-adoption-plan.md): phased recommendations, design gates, open decisions and review conditions.
- [04 — What “integrate llama” means](04-integration-choice.md): native product model management versus a separate inference service, with a recommended split.
- [Source register](sources.md): local references and official upstream links checked for this analysis.
- [Work log](LOG.md): scope, batches reviewed, and activity record.

## Recommendation

Integrate model management and policy natively into Companai, while keeping llama.cpp inference in a managed, separately isolated process/service. Companai should own the model catalog, tenant eligibility, capability declarations, lifecycle/version controls, resource limits and operational status. Hermes should use the approved provider endpoint and continue to own its agent loop, tools/skills and sessions. Hermes' documented managed Local Models mode remains relevant for standalone desktop/dev use; do not assume it provides the production multi-tenant control plane in the embedded Compose deployment.

Do not promise a performance gain merely from “one codebase” or “local.” The existing measurements point to CPU prompt-ingest and generation as a material bottleneck. Optimize by avoiding unnecessary model calls, prompt/tool-schema bloat, bounded context, model/profile fit, queue/concurrency discipline, and deterministic reusable Functions—not by assuming a faster server process. Hardware-specific measurements are required before making latency or capacity claims.

## Scope limits

This is architecture research, not an implementation, security certification, procurement recommendation, or production deployment. Local notes sometimes describe a sibling Paperclip product or a particular test/hosting environment; they are cited as evidence and not promoted to Companai product requirements unless independently supported by Companai's vision/development docs.
