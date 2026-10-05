# Forensic architecture assessment: Open Mercato starting kit + Hermes Agent

**Date:** 2026-10-05 (Europe/Stockholm)  
**Purpose:** Assess whether Hermes runtime capabilities can be absorbed into the Open Mercato starting kit as a tenant-aware native product capability, and identify an architecture that avoids duplicating platform identity/governance.  
**Scope boundary:** Source trees were inspected read-only. The only intended filesystem write from this task is this report in `companai/analysis/`. No install, build, test, migration, service start, or runtime benchmark was performed.

## Executive assessment

**Feasible as a product/codebase consolidation; not a low-risk in-process library merge.** Open Mercato already has a substantial AI assistant module: typed AI agents and tools, provider adapters, model selection, MCP, tenant-scoped configuration and usage, persisted conversations/participants, policy checks, mutation approval, and workers. Hermes contributes a much richer agent-runtime surface: a mature tool loop, many tools and terminal backends, session recall/compression, memory and skill workflows, provider breadth/fallback, cron, messaging gateway, subagents, and other runtime capabilities.

The strongest fit is **a native Hermes runtime capability owned by the Open Mercato AI module**, with Open Mercato remaining authoritative for tenant/user/org identity, authorization, business data, policy, approvals, audit and canonical workflows. Reuse Hermes runtime internals where their assumptions permit; adapt persistence and lifecycle at explicit ports. Keep Hermes-derived runtime execution in a separately supervised worker process initially, within the same product repository/deployment and queue contract. That is a deliberate language/runtime boundary, not a separately administered Hermes product or a second identity plane. A Node process importing Python internals in-process is not a realistic default: Hermes is Python 3.14+, while the kit is a Node 24 / TypeScript workspace; Python embedding in Node would add a native bridge and lifecycle complexity without evidence of a performance win.

A claim that a unified codebase will be faster is **not established by these source inspections**. Removing a network hop may reduce orchestration overhead in some paths, but LLM latency, tool latency, Python process contention, serialized job payloads and duplicated persistence can dominate. A monorepo does not itself improve runtime performance. Establish a baseline and compare representative flows before choosing process topology.

**Do not transplant Hermes profiles or its home-directory state as tenants.** The Hermes profile is an isolated runtime home/config identity, not a SaaS tenant model. Tenant adaptation is the central engineering and security work, not an optional wrapper.

## Evidence, provenance, and limitations

### Local source snapshots

- Open Mercato starting kit: `C:\Users\Ramzi\Downloads\companai\workspace\starting-kit`, HEAD `cafe7d6576d0adaa602ce06e0a511e8074e04040`, commit dated 2026-10-05. The initial `git status --porcelain` was empty. A later final check found untracked files under `packages/shared/src/lib/business-widget/` and `packages/shared/tsconfig.business-widget-tests.json`, with timestamps around 19:03–19:06 on 2026-10-05; I did not create or edit these, and tracked-file diffs were empty. Their origin is unknown, so treat them as concurrent/pre-existing workspace activity and preserve them. Stack and architecture statements are based on README, package manifests, `AGENTS.md`, module source and migrations, not on a running system.
- Hermes snapshot: `C:\Users\Ramzi\Downloads\companai\hermes-agent-main`, top-level commit-like manifest is not available because this directory has no `.git` and is not an independent Git checkout. `git -C` resolves to the parent `companai` repository and reports it as untracked there; do not interpret that as a Hermes revision or infer source provenance from it. The files identify an MIT-licensed Nous Research project. The folder timestamps are not a reliable upstream commit timestamp.
- Paperclip/Hermes study: `C:\Users\Ramzi\Downloads\companai\library\paperclip-hermes-study`, a completed 11-batch study written 2026-10-05. It focuses mainly on Paperclip, Hermes, and a sibling `aissistant-package`; it explicitly warns that sibling-product decisions are not decisions for this Open Mercato base. I used it as a research index and checked relevant claims against the requested local Hermes snapshot where practical. Its Paperclip target design must not be silently adopted as Open Mercato architecture.
- Upstream cross-check: the official Hermes GitHub README describes Hermes as a self-improving agent with terminal, messaging, skills/memory, schedules, subagents, and multiple execution backends, and identifies MIT licensing. It also documents a fast-changing upstream repository. The inspected local snapshot is the evidence for implementation details; online `main` is only a current project reference, not proof that every online feature exists in the local snapshot.

### Limits

This is a static forensic architecture review, not a code audit of every line. I did not exercise endpoints, run migrations, measure throughput/latency, verify every cited Hermes feature against a runtime, inspect all dependency licenses, or validate production tenancy configuration. Exact operational guarantees, concurrency limits and current upstream compatibility remain to be demonstrated. Product use cases and workload scale were not supplied, so recommendations distinguish platform groundwork from features to prioritize.

## 1. Starting kit: architecture and stack

### Platform shape

The starting kit is Open Mercato, a modular TypeScript monorepo using Yarn 4 workspaces and Turborepo. The primary app is Next.js App Router. Package-level modules carry backend routes, frontend pages, entities/migrations, CLI, setup, workers, subscribers and DI registration. The root README describes discovery/overrides and dependency injection with Awilix; PostgreSQL through MikroORM is the main application store. Redis, queues/events, cache, search/Meilisearch and storage adapters are first-class packages/services. Exact deployment composition varies by Compose configuration.

Observed root dependencies include Next.js 16, React 19, TypeScript 7, MikroORM 7/PostgreSQL, Awilix, Zod, AI SDK 7 and provider SDKs. Node engine is 24.x. Package metadata for `@open-mercato/ai-assistant` is version 0.6.7 and exposes typed module, tools, AI SDK and frontend entry points. A documented OpenCode integration also exists, so the AI surface is not one uniform runtime today: the README says OpenCode Code Mode remains for existing command/chat use while a typed agent framework adds focused agents.

### Tenancy and security posture

The README documents tenant and organization entities and says most business entities carry both IDs. The platform instructions (`AGENTS.md`) make tenant/organization filtering a hard invariant. In the AI assistant itself, inspected entity definitions and migrations show `tenant_id` on AI records and optional `organization_id` on scoped records. Examples include chat conversations, participants, messages, tenant model allowlists, prompt/runtime/mutation overrides, pending actions and token usage. Indexes/uniqueness constraints include tenant, organization and conversation or agent scope. This is concrete evidence of AI-module tenancy design, not proof that every query path is correct; routes and repositories still need a full isolation review before new runtime data is trusted.

The AI framework resolves caller auth context, feature permissions, tool allowlists, attachment types, execution modes and mutation policy. Its documented mutation policy ordering is restrictive-first, and pending mutation actions have durable persistence plus cleanup. This fits an agent engine if the runtime is made incapable of widening the caller's authority. **The model/tool descriptions are not a security boundary.** Each tool call must execute through an Open Mercato-scoped service/route and must re-check tenant/org/user authorization.

### Existing AI foundation

The AI assistant is more than a chat UI. Source tree includes:

- typed `AiAgentDefinition` / `defineAiTool`, generated registries and a dispatcher;
- a streaming AI SDK loop with stop/prepare hooks, policy and runtime overrides;
- provider registry/adapters, presets, model factory and tenant model allowlist;
- MCP server/client/tool adapters and API discovery/execution tools;
- attachment bridge, page context and tool packs;
- conversation/message/participant repositories and sharing features;
- per-tenant usage records and daily aggregates;
- pending actions and explicit confirmation/cancel flows;
- queue/workers, events/subscribers, schedules and OpenCode client/handlers.

This substantially reduces the need to import Hermes account management, provider configuration UI, external tool gateway, chat storage, policy surfaces or platform identity. It does **not** establish parity with Hermes on long-lived runtime sessions, self-improving skills, persistent recall, gateway operations, terminal execution, subagents or all providers.

## 2. Hermes: runtime composition and useful capabilities

The local snapshot is a broad Python application, not a small model-loop package. Top-level areas include `agent/`, `tools/`, `providers/`, `gateway/`, `cron/`, `hermes_cli/`, `hermes_platform/`, `acp_adapter/`, `skills/`, `plugins/`, `optional-skills/`, `optional-mcps/`, `web/`, `tui_gateway/`, tests and native components. Root files include a substantial CLI, agent runner, tool registry/toolsets, model tooling, configuration and session-state implementation. The dependency manifest targets Python 3.14 and includes an extensive cross-platform/system-integration dependency surface; `gateway` uses FastAPI/Uvicorn. This is a runtime product with CLI, local user homes, messaging channels and multiple environment backends, not merely a library.

The upstream project documentation and local tree expose candidate value areas:

| Capability family | Likely value to Open Mercato | Adaptation / ownership implication |
|---|---|---|
| Agent loop, tool invocation and streaming | Strong runtime engine candidate | Bridge into existing typed agent definitions, auth context, tool registry and streaming API. Inspect whether Hermes can be composed without its CLI/gateway global state. |
| Provider/model selection and fallback | Useful breadth and resilience | Keep tenant credentials, allowlists, quotas and secret storage governed by Open Mercato. Avoid two competing provider/model configuration sources. |
| Session history, compression, FTS recall and branching | Durable multi-turn work and cross-session recall | Existing AI conversations should remain canonical product conversations. Hermes state.db is SQLite and Hermes-shaped; decide whether to adapt state access to tenant-aware PostgreSQL or isolate it per tenant/agent with explicit lifecycle. Avoid split-brain transcripts. |
| Persistent memory / user model | Personalization, possibly useful business context | Scope at tenant + user/agent (and maybe organization), consent/export/retention policies, isolation tests and provenance. Hermes local user memory is not business-authoritative data. |
| Skills and skill learning | Reusable procedural knowledge and improvement | Treat installed/generated skills as untrusted code/content. Tenant catalog, source, trust, review, version and publication need Open Mercato governance. Do not allow one tenant's learned artifact to bleed into another. |
| MCP clients, tools and plugins | Extensibility | Register tools as Open Mercato capabilities; bind them to policy, schema/version review and approvals. Avoid exposing arbitrary runtime-level tools to all tenants. |
| Schedules, cron, event triggers | Unattended operations | Use Open Mercato durable queue/scheduler/event machinery as the trigger authority; schedules should create auditable work records and use idempotency, tenant scoping and cancellation. Hermes scheduling can be reused only behind an adapter or disabled. |
| Terminal backends, browser, code, filesystem, LSP | Powerful task execution | Highest isolation risk. Use sandboxed, least-privilege ephemeral execution; never execute with the app's host privileges or unrestricted tenant-shared workspace. Likely separate workers/containers. |
| Messaging gateway and hosted rooms | New channels and collaborative agents | Starting-kit product's user/chat/notification model should own identity and visibility. Import only if product needs channels/rooms; do not run Hermes's account/DM pairing as a parallel identity authority. |
| Subagents / parallel work | Parallel task decomposition | Model child runs as bounded jobs with budgets, cancellation, trace/provenance and tenant budgets. Treat concurrency limits as measured requirements. |
| Local models / execution adapters / OTLP etc. | On-prem, specialized deployments and observability | Optional phases. Confirm dependencies, deployment target and licenses; no performance or reliability assumptions from feature presence. |

The Paperclip study verifies many of these capabilities against its source tree (including REST session continuation, profile scoping, tool/MCP breadth, skill hub, memory caps, hosted rooms and ESTOP). Those study facts are useful leads, but the study's source references point to its own Hermes source path and, in places, a sibling vendored copy. For this report, the specific destination snapshot is the requested `companai\hermes-agent-main`; each capability slated for implementation needs a fresh symbol/API/license and behavior check in that snapshot.

## 3. Architectural mismatches that make a straight merge unsafe

1. **Language and execution model.** Kit code is Node/TypeScript with per-request DI and package boundaries. Hermes is Python with Python-version/platform dependencies, a long-lived agent loop, CLI and process-oriented integrations. A TypeScript wrapper around HTTP is easy but retains an integration service; a Python embedding/native bridge is high operational complexity. A repository-level merge does not erase this boundary.
2. **Identity and tenancy.** Open Mercato has tenant/org/user context and system auth. Hermes profiles are local runtime homes/config isolation units. Mapping tenant→profile alone does not secure shared services, files, MCP credentials, logs, caches, subprocesses, sessions or memory. Trusting tenant IDs supplied by a model/request payload would be unsafe; derive them from authenticated request context and bind them to every operation.
3. **Persistence and canonical records.** Open Mercato uses PostgreSQL/MikroORM for product entities. Hermes has a large SQLite `state.db` surface and file-backed config, memory, skills, workspace and profile artifacts. Maintaining two message histories and two user/agent configurations invites divergence; moving Hermes state wholesale into PostgreSQL is substantial and might conflict with upstream internals.
4. **Authorization.** Existing kit policies are tool- and mutation-aware, with tenant overrides and confirm-before-write. Hermes has its own command approvals, toolsets, gateway access and runtime config. The integration must avoid bypass paths such as direct terminal/filesystem access, MCP direct calls or plugin tools that skip platform checks.
5. **Work scheduling and idempotency.** Open Mercato already has queue/events/scheduler packages and durable DB state. Hermes owns cron and channel delivery concepts. Running both schedulers for the same work creates duplicate execution and poor auditability. Platform events/queue should be canonical; Hermes scheduling can be reused only behind an adapter or disabled.
6. **Operational and dependency footprint.** Python 3.14 plus native/system binaries and optional backends increase image size, patching, SBOM and supply-chain scope. It also changes startup, autoscaling, resource limits, tracing, secrets and Windows/Linux container behavior.
7. **Performance evidence.** A network request removed is not equivalent to an end-to-end speedup. LLM/tool wait dominates many flows; shared process integration could worsen memory isolation, event-loop contention or tail latency. No benchmark supports claims that full in-process merge is faster.
8. **Upstream maintenance.** The requested local Hermes copy is not a Git checkout, so commit/tag and fork delta are unknown. Upstream appears active and large. A vendored fork can impose recurring merges/security work; a dependency/service seam can ease upgrades but adds protocol overhead. Establish source pin, patch policy and update cadence before adoption.

## 4. Recommendation: absorb capability, not duplicate platform

### Ownership map

- **Open Mercato owns:** tenant/org/user identity; RBAC/feature checks; agent/product configuration and ownership; API/business data; canonical conversations, tasks and audit; mutation approvals; budgets/quotas; schedule and event records; secrets/credentials; tenant-visible skill catalog and lifecycle; retention/deletion/export.
- **Hermes-derived runtime owns:** model execution loop, context assembly mechanics, tool-call orchestration, provider adapter/fallback implementation where useful, compression/retrieval algorithms, and isolated execution adapters where they pass platform policy.
- **Boundary:** one typed `AiRuntimePort`-style contract invoked by the existing AI module/queue. Request carries an authenticated, immutable scope object plus agent/run/conversation IDs and an allowlisted capability set. Results/events include structured output, token/cost usage, tool trace, cancellation and error classification. Runtime must not invent identity or persist canonical business records outside the ports.

### Process/deployment choice

Start with a **same-repository, same-product, supervised Python worker package** consuming Open Mercato durable jobs (or a narrowly defined internal invocation contract). Use explicit versioned request/result/event schemas. The product remains one integrated codebase and installable system; process isolation gives a manageable Python runtime, crash/resource limits and independent scaling. It also prevents a Python exception or native library from taking down Next.js. Keep worker execution behind a port so selected algorithms/modules can later be ported to TypeScript or moved in-process if evidence justifies it.

This is still a process boundary and may have transport/serialization cost. If the requirement strictly forbids a process/service boundary, the safer alternative is **port individual Hermes capabilities into TypeScript**, not embed the entire Python application into Node. That sacrifices direct reuse and requires feature-by-feature reimplementation. There is no evidence-based case for an in-process Python bridge today.

### Data/persistence strategy

Do not replace Open Mercato conversation records with Hermes `state.db` in the first phase. Prefer Open Mercato as canonical transcript and job/audit store. Evaluate a minimal tenant-isolated Hermes working-state adapter only for state the runtime fundamentally requires, with deterministic keys scoped at least by tenant + agent + conversation and strict separation of file roots, temp dirs, caches, provider secrets and logs. If Hermes requires its own SQLite DB per profile, use one isolated DB/home per tenant or stronger security domain with retention/backup/delete behavior; do not share a writable DB between tenants. Validate concurrent access and warm-session consistency. A later PostgreSQL storage adapter is an independent engineering project, not assumed trivial.

### Request and tool flow

1. Authenticated app/API request resolves tenant, organization, user, agent and conversation server-side.
2. Existing Open Mercato policy calculates effective provider/model, tool set, feature scope, mutation behavior, data filters and resource budget.
3. Durable run/job is enqueued with idempotency and cancellation identity. Sensitive secrets are referenced through secret IDs, not included in model-visible data.
4. Hermes-derived worker runs with tenant-bound runtime state and an allowlisted tool bridge. Every business-data operation returns through Open Mercato service/repository/API authorization checks.
5. Stream progress and tool events; record usage, outcomes and audit in tenant-scoped platform records. Mutations produce platform pending actions where confirmation is required.
6. On completion/failure, store canonical assistant response and runtime metadata; retries are bounded and idempotent.

## 5. Suggested adoption order

**Phase 0 — pin and map.** Recover the exact Hermes source commit/tag, compare with upstream, inventory transitive/native dependencies and licenses, and make an API/symbol map from the local tree. Reconfirm kit AI behavior and identify explicit feature gaps from real target workflows.

**Phase 1 — minimal runtime spike.** Run one worker using one model provider and a tiny allowlisted tool set through the existing AI module's authenticated context. One tenant, then two-tenant adversarial tests. Prove cancellation, retry idempotency, trace/usage capture, bounded memory/CPU, no cross-scope data access, and cold/warm session continuity. No gateway, arbitrary shell, skill marketplace or autonomous cron yet.

**Phase 2 — durable sessions and governed tools.** Reuse session/compression/retrieval only where performance and UX justify it. Keep platform conversation ID canonical. Add provider fallback and selected tools via typed ports. Measure median and p95 time-to-first-token, total latency, tokens, CPU/RSS, DB I/O and queue delay versus existing AI assistant.

**Phase 3 — skill learning and memory.** Add tenant/user-scoped artifacts with versions, provenance, trust review, approval, rollback, export/deletion and contamination tests. Begin with read-only or user-approved skill updates. Keep authoritative company/business truth in Open Mercato entities, not free-form memory.

**Phase 4 — autonomous work.** Connect recurring/event work to Open Mercato scheduler/queue. Require durable run records, per-tenant budgets, global/tenant stop controls, deadlines, idempotency, approval and observability. Add subagents/parallel execution only after concurrency and cost controls are proven.

**Phase 5 — execution environments and channels.** Consider sandboxed terminal/browser backends, hosted rooms and messaging channels only for explicit product use cases. This is a separate threat-model/deployment effort, not a consequence of adding the core runtime.

## 6. Decision matrix

| Option | Reuse of Hermes | Tenant/security fit | Performance risk | Recommendation |
|---|---:|---:|---:|---|
| Keep Hermes as a separately deployed product and integrate over public gateway | High | Medium with a strong adapter; two control surfaces remain | Network/service overhead, independent ops | Valid short-term spike or if operationally isolated runtime is required; not the desired organic end state. |
| Copy all Hermes into kit and run in-process through Python embedding | High nominally | Low until extensively refactored | High/unknown; bridge/global-state/resource contention | Reject as initial design. Too much product-specific code and runtime mismatch. |
| Port only selected Hermes features to TypeScript | Low-to-medium | High if implemented on platform conventions | Potentially efficient, but reimplementation risk | Good for small algorithms/features with stable scope. Not the agent loop/tool ecosystem. |
| Absorb Hermes-derived runtime as a supervised worker in the Open Mercato product/repository, with platform-owned ports and records | High for chosen capabilities | High if scope is enforced at every port and filesystem boundary | Measurable process/queue overhead; good isolation/scaling | **Recommended target for an incremental evaluation.** |

## 7. Risks and controls to make explicit

- **Cross-tenant leakage:** derive scope from auth; tenant-scoped IDs in every DB query/key; separate runtime homes/files/secrets; automated negative isolation tests across chat, memory, skills, tools, cache and logs.
- **Privilege escalation through tools:** only platform-granted tools; authorize at execution time; no unrestricted direct database or API credentials in Hermes; confirmation on writes per existing mutation policy.
- **Untrusted skills/plugins/MCP:** provenance, static scan, schema/version pin, review, tenant install controls, sandboxing, kill/revoke path and immutable invocation trace.
- **Arbitrary code/terminal:** sandbox in a separate disposable worker/container with CPU/memory/time/network/filesystem controls and per-tenant workspaces; never expose host credentials.
- **Duplicate authority:** one model config source, one transcript authority, one scheduler, one identity layer, one approval/audit record. Declare any runtime cache/state as disposable derived state.
- **State drift and migration:** local SQLite/file persistence may be hard to externalize; define import/export/delete/retention and backup recovery before broad use.
- **Cost/concurrency abuse:** per-tenant budgets, queue concurrency caps, deadlines, token limits, provider rate limits and hard stop controls.
- **Upstream drift and supply chain:** pin exact commit, track patch delta, scan transitive deps, review security updates and maintain a repeatable upgrade/compatibility process.
- **False performance premise:** benchmark representative business workflows at realistic concurrency and include queue delay, cold start and DB costs; optimize only after bottleneck measurements.

## 8. Open questions to resolve before an implementation spec

1. Which user journeys must improve: interactive assistant, persistent agent identity, background work, skills that learn, shared rooms, or terminal/browser automation?
2. Does “unified codebase” mean one repository/product/deployment, or specifically one OS process? Those are materially different constraints.
3. Expected tenants, users/tenant, concurrent runs, retention and data residency/isolation requirements?
4. Can Hermes state remain tenant-isolated SQLite/files in the first release, or must all durable state be PostgreSQL/MikroORM from day one?
5. Which Hermes tools need filesystem, shell, browser, messaging or external MCP access, and what sandbox/network policy is available?
6. What is the target latency/cost/SLO and what is the current AI-assistant baseline?
7. How should skills/memory be authored, approved, shared within an organization, revoked and deleted when a user/tenant leaves?
8. Is upstream MIT license acceptable for the product distribution model, and do all optional plugins/assets/dependencies have compatible terms? The root Hermes license alone does not answer transitive/optional component obligations.

## Conclusion

The starting kit has enough AI, tenancy, policy and persistence scaffolding to make Hermes-derived behavior feel native and eliminate redundant account/control surfaces. It does **not** make the entire Hermes program a drop-in module. The practical opportunity is a carefully bounded runtime extraction: Open Mercato remains the multi-tenant product/control plane; selected Hermes engine capabilities execute behind platform-owned, tenant-aware contracts and durable jobs. Treat same-product unification as feasible, in-process unification as unproven and high-risk, and performance gains as a hypothesis requiring benchmarks.

## Source index

### Local starting-kit evidence

- `starting-kit/README.md` — platform description, stack, tenancy and architecture overview.
- `starting-kit/package.json`, `packages/ai-assistant/package.json` — runtime versions, workspaces and AI package dependencies/exports.
- `starting-kit/AGENTS.md` — module and tenant/organization isolation invariants.
- `packages/ai-assistant/README.md` — current AI assistant, dual OpenCode/typed-agent framework, providers and MCP setup.
- `packages/ai-assistant/src/modules/ai_assistant/lib/agent-runtime.ts` — AI SDK runtime and request context.
- `.../lib/agent-policy.ts`, `.../lib/auth.ts`, `.../lib/agent-tools.ts` — policy enforcement/tool resolution.
- `.../data/entities.ts`, `.../data/repositories/`, `.../migrations/` — tenant/org-scoped AI state and constraints.
- `.../lib/pending-action*.ts`, `.../workers/`, `.../subscribers/` — approval, cleanup, events and worker integration.

### Local Hermes evidence to inspect for a future implementation plan

- `hermes-agent-main/README.md`, `pyproject.toml`, `LICENSE`, `AGENTS.md`.
- `agent/`, `run_agent.py`, `model_tools.py`, `toolsets.py`, `tools/`, `providers/`.
- `hermes_state*.py`, `hermes_state.py`, `hermes_cli/profiles.py`, `hermes_constants.py`.
- `gateway/`, `cron/`, `skills/`, `plugins/`, `acp_adapter/`, `hermes_platform/`, `hermes_cli/`.
- `SECURITY.md`, Docker files and provider/tool-specific license notices.

### Research references

- [Official NousResearch Hermes Agent repository](https://github.com/NousResearch/hermes-agent)
- Local Paperclip/Hermes study: `companai/library/paperclip-hermes-study/README.md`, `findings/07-hermes-capabilities-verified.md`, `findings/08-new-agent-into-existing-thread.md`, `findings/10-lessons-and-target-design.md`. These are secondary references about a different platform integration; verify source claims against the exact Hermes revision before implementation.
