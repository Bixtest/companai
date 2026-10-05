# Batch 03 — Where Hermes and Paperclip-derived functions fit in Open Mercato

## Baseline: strong application foundation, not yet the full target

Open Mercato is a modular TypeScript monorepo (Yarn 4/Turborepo; Node 24; Next.js App Router; PostgreSQL/MikroORM; Awilix) with core, AI assistant, events, queue, scheduler, search, content, storage, onboarding, webhooks and UI packages. Modular discovery/DI is a natural home for the product's AI and agent functionality.

AI assistant already has a typed AI SDK runtime, agent/tool definitions and registry, streaming, provider adapters/model factory, MCP server and client/tool adapters, attachments/page context, conversations/participants/messages, tenant-scoped runtime/prompt/model/mutation overrides and usage, pending mutation actions, background cleanup, subscribers and OpenCode integration. This gives the integration a natural home at packages/ai-assistant; it does not mean Hermes already exists there. Inspection found no Hermes adapter/runtime package in the Starting Kit AI module.

The Business Model Kernel, Business IR/compiler, Widget and Function layers, and full security kernel are a mix of implementation and roadmap work. The prior 12-batch code analysis found useful foundations but material gaps: authority resolver was shadowed rather than enforcement in the measured source, missing context inputs, partial data-axis authorization and missing AI input/output/context guards. Tenant IDs and MCP endpoints do not themselves complete the vision security kernel.

## Ownership and package fit

| Responsibility | Starting Kit joint | Hermes contribution | Paperclip lesson |
|---|---|---|---|
| Canonical entities, fields, relationships, metrics, rules, commands | shared kernel/Business IR + core persistence | Interpret intent and emit schema-constrained IR; no business schema authority | Agent/Task models inform shapes, not a parallel database |
| Agent kinds/ownership/visibility/reporting | Kernel Agent + principal/security context and core/admin | Home/config is runtime binding only | Owner's five agent kinds supersede copying Paperclip row unchanged |
| Runs, tasks, wakes, budgets, approvals, audit | Core records + queue/events/scheduler + platform ledger | Execute admitted run and emit lifecycle/usage/tool events | Durable wake/run and idempotency belong to platform |
| Interactive agent loop/provider execution | ai-assistant owns context, policy and client/stream integration | Hermes loop/tool orchestration, provider breadth/fallback where useful | Do not duplicate model credentials/config |
| Business tools/capabilities | Domain modules through typed registry/MCP and deterministic command/query APIs | Consume allowlisted tools/skills | Authorization-aware discovery; verify each execution |
| Human approval/autonomy | AI pending actions + future A0–A5 command bus/security | Raw terminal/computer approvals are an extra runtime guard | Approval binds to exact action/version |
| Conversations/sessions/rooms | AI conversation tables now; future Workspace/Room/Widget model | Session history/compression/search/memory as runtime projection | One canonical transcript authority; no shared tenant visibility from runtime session |
| Tenant knowledge/docs/records | Core model + content/storage/search and source bindings | Retrieve authorized references; runtime memory advisory | Separate business truth, tenant knowledge, skills, memory, session |
| Skills/procedures | Tenant/company publication registry and lifecycle | Skill loading/learning | Provenance, scan, version, approval, pin, rollback; no authority expansion |
| Cron/events/recurring tasks | scheduler/events/queue/webhooks | Profile-local maintenance only; execution backend for admitted work | One scheduler for business jobs; schedule creates durable audited work |
| Terminal/browser/code/shell | Isolated execution backend/workspace | Hermes backends/tools provide feature value | Highest risk; sandbox, quotas, network controls |
| Rooms/channels/collaboration | Product-native workspace and business inbox | Optional messaging adapters | Paperclip lacks true room; sibling used issue-backed rooms |
| Operations/backup/observability | Platform audit/metrics/backup | Hermes runtime diagnostics and home backup | Capture policy/tool/model/profile lineage; business backup is separate |

## Architecture in the product's joints

### Domain/model kernel

Model Agent kind, owner, actsAs, role, autonomy, runtime binding, Task, Run and capability reference as canonical product records. Use schema evolution/versioning. Hermes profiles, SOUL/config, skills and memory are projections/materializations of product-owned configuration and runtime state. Hermes cannot create business identity or tenant membership.

### Business Agent Gateway / authorization

Put a typed AiRuntimePort/execution adapter at the seam in ai-assistant. Route business tools back through platform authorization/command/query code. Server code constructs scope from verified principal/session, tenant/org, agent, actor and task—not model/request IDs. Bind grants, policy/model version, deadline, budget and allowed input references. Revalidate every tool call, audit allow/deny/effects, and fail closed. Hermes can suggest calls but cannot mint or widen grants.

### Business IR and deterministic execution

Use Hermes to interpret language and author query/command IR or Function/Widget definitions. Open Mercato schema resolvers/compiler/validators reject ambiguity, inject tenant scope from context and compile to deterministic queries/domain commands. Business mutation uses A0–A5 and typed pending action, never direct runtime DB access. Published User Functions execute without Hermes/LLM; Hermes assists with authoring, not deterministic Function runtime.

### Agent/task lifecycle

Represent assignment, wake, retry, run state, cancellation, deadline and budget in platform records/queue. Wake creation is durable/idempotent. Runtime results correlate by opaque IDs and verified scope. Use queue workers for background work; interactive streaming needs an explicit stream bridge. Do not create a competing Hermes cron authority for company work.

### Conversation, rooms and memory

Keep product AI conversation as canonical visibility, membership and audit. Introduce Workspace/Room as canonical product entities; rooms can contain tasks and people/agents. Bind Hermes session per agent-context as runtime projection, with stable IDs independent of model/tool config. Define warm-session updates, revocation, archive/delete/retention. Runtime history is not evidence of current business truth; retrieval resolves canonical data under authorization.

### Knowledge and skills

Tenant knowledge and procedural skill differ from agent memory/session. Hermes loads approved/pinned skills and retrieves authorized references. Agent-generated skills start as proposals; quarantine, scan, license/provenance/version/evaluate/approve before publication. Marketplace installs cannot become policy or executable authority silently.

### Models and local-first inference

Hermes provider/model/fallback can supply execution options. Open Mercato retains tenant provider allowlists, secret references, classification-based local/cloud constraints, budgets and model policy. Existing ai-assistant already has provider registry/model-factory/allowlist; decide whether Hermes selection replaces, delegates to or coexists with it. There must be one source for effective model and truthful provider attribution. Local llama.cpp is inference, not a second agent runtime or authority layer.

## Central security qualification

The vision's security kernel is stronger than tenant IDs and ordinary role checks. The prior source audit found resolver shadow state, missing context inputs, absent/partial field/record/value/relationship authorization, and incomplete AI context/input/output firewalling. “Use existing auth” is not a sufficient integration design. Phase 2 security work gates Hermes business tools.

## Product surface

Do not expose Hermes admin dashboard as a second product. UXAIOS defines Workspace/typed business interaction as primary; current AI assistant has its own UI/chat/settings. Surface only needed employee/admin operations: agent lifecycle, runtime health, skill publication, run history/usage, model policy, capabilities, and approvals. Keep operator diagnostics operator-only. Hermes can provide tool progress visualization; platform records determine access and visibility.
