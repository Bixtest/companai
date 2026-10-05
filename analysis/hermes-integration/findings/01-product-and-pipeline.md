# Batch 01 — Product direction and development pipeline

## Product in one paragraph

The product is a local-first, AI-native business operating platform whose canonical, typed business model is authoritative. The model describes entities, fields, relationships, metrics, rules, commands, workflows, policies, events and projections. Hermes provides reasoning, tool use, sessions, skills, memory and runtime model orchestration. A deterministic platform gateway resolves business meaning, authorizes every operation, executes typed IR/commands and records provenance. PostgreSQL remains the initial transactional store; deterministic User Functions and Widgets become durable product behavior. This is not ERP plus chatbot, nor a product where an LLM or Hermes profile is the business system of record.

The product vision's hierarchy and ai-first/README.md establish precedence: later design-control docs refine early research; Hermes and its docs supply runtime facts but not platform authority; business truth and authorization stay in the platform. The security kernel specifically states tenant context is explicit below the model, tenant isolation is a hard boundary, authorization is deny-by-default and scoped, and agent authority cannot exceed the actor's.

## How Paperclip lessons fit the plan

The development hub separates the product half (kernel, security, Widgets/Functions, hygiene) from the agent half (agent identity, work, collaboration and runtime). AGENT-HALF.md records the owner's five agent kinds:

| Agent kind | Scope / visibility | Acts as |
|---|---|---|
| Personal assistant | One user / private | That person's assistant |
| Role assistant | A role / users holding that role | The function |
| Context agent | Company-owned, shared under policy | A named user for that user's work |
| Independent agent | Company-owned worker | Itself, with its own role/permissions/queue |
| System agent | Admin-scoped | A system function |

Responsibility remains with a person. Autonomy is per action class, mapped to existing A0–A5 gates in the development docs; an agent may read automatically while a consequential mutation requires a proposal or approval. The plan attaches Paperclip lessons to phases rather than transplanting its schema wholesale:

- **Kernel / Phase 1:** Agent and Task become typed business objects; ownership, structure, dependency and execution are distinct; runtime binding remains behind a port. Paperclip org/work concepts inform, not dictate, the model.
- **Security / Phase 2:** enforce ai_worker identity, tenant/org/actor scope, permissions, scoped capability grants, argument-bound approval and audit. Hermes raw-tool approval complements but cannot authorize business mutations.
- **Product surface / Phase 3:** first-class rooms/shared workspaces, participant identity, conversations and visible agent surfaces; do not model a room as a fake issue or duplicate transcript authority.
- **Hygiene / Phase 4:** durable schedule/wake/run controls, budgets, restart recovery, backups and operational gates. The Starting Kit scheduler/events/queue governs business jobs.

At review time, BACKLOG.md reports G-01/G-02/G-03 and G-07 built/measured; AH-1 startable after G-01; numerous agent/security items remain. These are roadmap assertions, not all independently reverified here. Newly present untracked business-widget files were not edited. Do not assume backlog status is represented only by committed code.

## Runtime and security boundaries

The design-control vision divides the system into three kernels:

1. Hermes Agent Kernel: reasoning/loop, sessions, skills, memory, MCP/tool use, delegation, bot/cron/channel/runtime context.
2. Business Model Kernel: tenant/identity, typed business semantics, entities/relationships, policy, commands/workflows and events.
3. Data/Workflow Kernel: transactional state, durable workflows/events/outbox, analytics, documents and audit.

The Business Agent Gateway is the boundary. Hermes should propose structured read/query/command/tool operations; platform code resolves identifiers and semantics, injects tenant scope, applies data-axis authorization, gates external/cloud use and high-impact writes, executes deterministically and audits outcomes. A user approves a business command with visible meaning and impact, not an opaque database mutation.

Hermes profile ≠ tenant. Hermes state.db is runtime/session state, not canonical business truth. A user/agent/profile/session mapping belongs to platform identity and authorization. Hermes tool-approval guards remain useful for raw shell/computer-use, but the product security kernel is the authority for business data and commands.

## Integration language needing precision

The project docs contain two meanings of “in-process”:

- AGENT-HALF.md describes Hermes as in-process (the structural advantage over Paperclip's remote runtime), and the vision permits controlled Python integration.
- development/ARCHITECTURE.md describes Starting Kit + Hermes + model server as three Docker Compose pieces, with Hermes taking the runtime slot. The earlier static comparison proposed a supervised worker to bridge Node and Python.

The Starting Kit is Node 24 / TypeScript; Hermes is Python 3.14. Python is not an ordinary TypeScript package. Therefore same product/repository/deployment, internal runtime contract, and literal same OS process are separate choices. A Python worker can be a native internal implementation, not a separately administered Hermes product; it remains a process boundary. A literal one-process bridge needs native embedding or TypeScript reimplementation and separate justification. Do not imply it from a Compose diagram.

The kernel spec leaves B-05/Hermes boundary/profile open. This report recommends a shape and route, but does not claim owner ratification of process topology.

## Source tensions to reconcile

- development/ARCHITECTURE.md §3 labels statements static/read-only, while current BACKLOG.md says Sprint 0 was built and proven with eight healthy services and 21 MCP tools. Check/update the living architecture narrative in a future authorized docs task; this analysis does not edit it.
- AGENT-HALF.md says Hermes is in-process, while runtime architecture shows separate Hermes/model services. Product docs should say “internal runtime boundary” and name any process/service boundary.
- The Starting Kit AI assistant has a typed AI SDK loop and OpenCode path, MCP and policy. It does not yet represent the entire agent-half or completed vision security kernel. Avoid describing current loop/resolver as fully satisfying the target.
