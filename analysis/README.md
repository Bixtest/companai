# Analysis — Hermes and the Starting Kit

This folder contains the requested read-only forensic analysis and the follow-up product-integration study.

## Start here

1. [Recommended integration architecture](hermes-integration/findings/04-recommended-integration-architecture.md) — target boundary, ownership, admission flow, roadmap sequence, unresolved decisions and risks.
2. [Starting Kit fit map](hermes-integration/findings/03-starting-kit-fit-map.md) — maps Hermes/Paperclip capabilities to Open Mercato packages and product layers.
3. [Product and development pipeline](hermes-integration/findings/01-product-and-pipeline.md) — vision, agent-half phases and architecture tensions.
4. [Sibling integration case study](hermes-integration/findings/02-sibling-integration-case-study.md) — transferable patterns and failures from the Paperclip–Hermes integration.
5. [Scope and source map](hermes-integration/findings/00-scope-and-source-map.md), then the [plan](hermes-integration/PLAN.md) and [work log](hermes-integration/LOG.md).

The earlier [Starting Kit + Hermes forensic comparison](hermes-starting-kit-forensic-analysis.md) is the baseline. The new integration study reads it together with the product vision and development hub and refines its initial worker-topology recommendation. The current recommendation distinguishes a native internal runtime port from literal single-process embedding; B-05 remains an owner decision.

> **Update, 2026-10-05 (added after this study was written; the study above is kept as the record of what it found at the time).** **B-05 has been decided.** The owner approved the runtime boundary: one product, one repository, one deployment, one interface (ours), with Hermes as a **supervised private runtime process behind the internal port**, and Hermes **headless**. This study's own recommendation (an internal runtime port, not literal single-process embedding) is the shape that was approved, and the reason it gave — that a Node process cannot import Python — is the reason the shape holds. The full reasoning, the owner's three challenges and the two hostile passes that corrected it are in [`library/development/ARCHITECTURE-hermes-integration.md`](../library/development/ARCHITECTURE-hermes-integration.md) §11. **What is still open** is *when* OpenCode is removed (**N-8**) and the Hermes **profile** topology (deferred, trigger: the agent gateway).

All new findings are static analysis only. No code, tests, deployments or benchmarks were changed or run. The source repositories were read-only; all authored files are under this analysis directory.
