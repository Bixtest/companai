# AI-Native Business Platform Built Around Hermes
## Forensic Analysis, Capitalization Strategy, and Recommended Target Architecture

**Research snapshot:** 2026-10-03  
**Primary Hermes repository:** https://github.com/NousResearch/hermes-agent  
**Primary Hermes documentation:** https://hermes-agent.nousresearch.com/docs  
**Current stable Hermes baseline observed during this analysis:** v0.21.3 (`v2026.9.14`, commit `345cd2b`)  
**Architectural status:** foundational design document; intended to be treated as a design-control document for the project

---

# 0. Executive summary

The platform should use Hermes as the **agent runtime / agent control plane**, while building a separate **Business Platform Kernel** that is authoritative for tenancy, identity, data semantics, permissions, workflows, commands, schema, migrations, events, audit and business truth.

The most important architectural conclusion is:

> **Hermes should learn how to use the business system; the Business Platform must define what the business system means.**

This distinction resolves the tension between two properties we want simultaneously:

1. **Adaptive intelligence:** agents, skills, memory, multi-agent collaboration, tool use, learning and autonomous execution.
2. **Deterministic business correctness:** typed data, explicit relationships, authorization, accounting invariants, transaction integrity, reproducibility, auditability and safe schema evolution.

Hermes is unusually strong on the first group. The platform we build must own the second group.

The resulting architecture is therefore not:

```text
ERP inside Hermes
```

and not:

```text
LLM -> SQL -> ERP database
```

It is:

```text
                         USER
                           |
                           v
                +----------------------+
                | ERP FRONT + AI UI    |
                +----------+-----------+
                           |
                           v
                 +---------------------+
                 | Identity / Tenant   |
                 | Application API     |
                 +----------+----------+
                            |
                            v
                 +---------------------+
                 |     HERMES RUNTIME  |
                 |                     |
                 | AIAgent             |
                 | Sessions            |
                 | Skills              |
                 | Memory              |
                 | MCP                 |
                 | Tool Search         |
                 | Subagents / Bots    |
                 | Cron / Routines     |
                 | Context Engine      |
                 +----------+----------+
                            |
                            v
                 +---------------------+
                 | Business Agent      |
                 | Gateway             |
                 +----------+----------+
                            |
                            v
                 +---------------------+
                 | Business Model      |
                 | Kernel              |
                 +----------+----------+
                            |
             +--------------+---------------+
             |              |               |
             v              v               v
           Query          Command        Workflow
             |              |               |
             +--------------+---------------+
                            |
                            v
                 +---------------------+
                 | Data / Event Plane  |
                 +--+------+-----------+
                    |      |
                    v      v
                 State    Events
                    |
                    v
                 Analytics
```

A second, parallel subsystem turns the same canonical business model into the platform itself:

```text
               Canonical Business Model
                         |
                         v
                 Model Validator
                         |
                         v
                 Schema Compiler
                         |
       +-----------------+-----------------+
       |                 |                 |
       v                 v                 v
    Database            API               UI
       |                 |                 |
       +-----------------+-----------------+
                         |
                         v
                  AI / Skills / MCP
```

This is the **business-model compiler** concept.

The ERP front-end is therefore not merely a CRUD interface. It becomes a controlled editor for the logical business system itself.

---

# 1. Why Hermes changes the architecture question

A conventional approach starts with an ERP schema and then adds an AI assistant.

That leads to:

```text
Database
   |
ORM / backend
   |
API
   |
AI
```

The AI has to reconstruct business meaning from implementation details.

The proposed approach reverses the priority:

```text
Business meaning
      |
      v
Canonical business model
      |
      +--------> database
      +--------> API
      +--------> UI
      +--------> workflow
      +--------> permissions
      +--------> analytics
      +--------> MCP tools
      +--------> skills
```

Hermes then becomes the runtime that reasons over this model and uses the generated capabilities.

The fundamental question therefore stops being:

> "How can we make an LLM produce better SQL?"

and becomes:

> **"How can we represent business reality so an AI has as little opportunity as possible to misunderstand it?"**

That is the central design problem this document addresses.

---

# 2. Research basis and current Hermes observations

This analysis is based on the current official Hermes documentation and repository material available on 2026-10-03.

The current Hermes architecture documentation describes a platform-agnostic `AIAgent` shared by CLI, gateway, ACP, batch, API server and Python integration. Around that core are prompt construction, provider resolution, tool dispatch, SQLite/FTS5 session persistence, compression/caching, gateway routing, plugins, MCP, skills, memory, cron and multiple execution backends.

The current architecture page describes a central tool registry, 70+ registered tools across roughly 28 toolsets, SQLite + FTS5 session persistence, 25+ messaging adapters, plugin registries, cron, ACP, trajectories and profile isolation. Exact counts should not be treated as contracts because the project is changing rapidly.

The repository currently identifies Hermes as MIT licensed. The release page observed during this analysis lists v0.21.3 (`v2026.9.14`) as the latest stable release at the snapshot point.

The repository's current `main` branch has a placeholder package version of `0.0.0`, which is another reason that production integration should be pinned to a release commit rather than an unpinned moving branch.

The primary sources used are:

- https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
- https://hermes-agent.nousresearch.com/docs/developer-guide/agent-loop
- https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly
- https://hermes-agent.nousresearch.com/docs/developer-guide/tools-runtime
- https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage
- https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals
- https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
- https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-search
- https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
- https://hermes-agent.nousresearch.com/docs/user-guide/security
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode
- https://hermes-agent.nousresearch.com/docs/user-guide/features/document-extraction
- https://hermes-agent.nousresearch.com/docs/user-guide/features/extending-the-dashboard
- https://github.com/NousResearch/hermes-agent
- https://github.com/NousResearch/hermes-agent/releases

---

# Part I — Forensic Hermes analysis

# 3. AIAgent: keep as the agent execution kernel

Hermes' `AIAgent` is the center of the runtime. The current implementation separates the loop into focused modules around `conversation_loop.py` and `turn_*` phases, with prompt construction, tool execution, provider resolution, context management and persistence separated into supporting modules.

This is exactly the type of difficult infrastructure we should avoid recreating.

## Keep

Use Hermes for:

- model calls
- provider selection
- agent-loop orchestration
- tool-call iteration
- retries/fallbacks
- cancellation/interruption
- prompt construction mechanics
- session continuation
- agent runtime callbacks

## Do not transfer to Hermes

Do not make the `AIAgent` authoritative for:

- tenant isolation
- ERP schema
- business rules
- accounting definitions
- authorization
- domain commands
- transactional state
- workflow truth
- canonical business knowledge

Those belong in the platform.

---

# 4. Hermes profiles: runtime identity, not SaaS tenancy

A Hermes profile is a durable Hermes home with its own configuration, API credentials, persona, memories, sessions, skills, cron state and database.

Hermes explicitly warns against running two independent processes against the same profile because automatic memory writes can mix state.

This is useful runtime isolation, but the abstraction is not equivalent to a SaaS tenant.

The platform should therefore distinguish:

```text
Tenant
  = security / data / organization boundary

Agent
  = business-level AI identity

Hermes Profile
  = runtime-scoped agent environment

Hermes Session
  = conversational runtime state
```

Never make:

```text
tenant_id == hermes_profile
```

an architectural assumption.

The platform should own the identity mapping.

---

# 5. Hermes `state.db`: keep it Hermes-owned

Hermes currently uses a SQLite state database for session metadata, complete message history, model-usage data, FTS5 search indexes, session lineage, gateway routing and other runtime bookkeeping.

This is appropriate for Hermes and should remain so.

It should not become the authoritative ERP transaction database.

The platform should instead maintain a mapping such as:

```text
PlatformConversation
    platform_session_id
    tenant_id
    user_id
    agent_id
    channel
    semantic_model_version
    policy_context
    hermes_session_id
```

Hermes keeps its runtime session state.

The platform keeps:

- business facts
- business transactions
- audit events
- authorization decisions
- durable workflow state
- schema versions
- model versions
- business provenance

Do not use `hermes_session_id` as a business identifier.

---

# 6. Session search: useful historical recall, not business truth

Hermes' FTS5 session search is useful for questions like:

> "What did we discuss about this customer last month?"

It is not the proper source for:

> "What is the definition of overdue?"

The first is conversational recall.

The second is Business Model Kernel semantics.

The third category is tenant knowledge:

> "What does our internal AP procedure say about overdue supplier invoices?"

That belongs in a governed knowledge store.

---

# 7. Hermes built-in memory: preserve, but demote its authority

Hermes' built-in memory is bounded, curated and injected into the prompt as a session-start snapshot through `MEMORY.md` and `USER.md`.

This is ideal for things such as:

```text
user preferences
agent working conventions
local environment facts
non-authoritative learned notes
communication preferences
```

It is not appropriate as the authoritative platform registry for:

```text
accounting rules
permissions
schema definitions
financial formulas
business relationships
ledger invariants
workflow authorization
```

Those must live outside prompt-oriented memory.

---

# 8. External memory provider: the recommended Hermes integration

Hermes exposes a proper Memory Provider interface and supports external providers.

This is the correct extension point for a platform-specific memory service.

Build a first-party plugin conceptually called:

```text
PlatformMemoryProvider
```

It should use the platform's own memory service and enforce:

```text
tenant
organization
user
agent
session
security scope
```

at the server side.

The memory provider can expose the normal Hermes memory semantics to the agent while ensuring that memory is isolated correctly.

## Important distinction

The provider can store:

```text
agent observations
user preferences
operational lessons
conversation conclusions
```

but not become the authoritative store for:

```text
Business Model Kernel
```

---

# 9. Memory write governance

Hermes already supports memory write approval.

The platform should add a stronger classification/promotion system:

```text
Agent learns
   |
   v
Memory proposal
   |
   v
Classify
   |
   +--> low-risk user preference -> store
   |
   +--> tenant procedure -> review/publish policy
   |
   +--> business rule -> never infer as authoritative
   |
   +--> security rule -> never infer as authoritative
```

Memory should be versioned where it can affect future operations.

---

# 10. Skills: keep, but define them as procedural projections

Hermes' Skills architecture is one of the strongest reasons to use Hermes.

Skills are on-demand knowledge documents with progressive disclosure and support an open standard. Hermes supports:

- skill discovery
- skill loading
- reference files
- scripts/assets/templates
- conditional activation
- `/learn`
- agent-created skills
- skill improvement
- skill write approval
- external skill directories
- skill bundles

This maps almost perfectly to the procedural side of a business platform.

The crucial correction is:

> **Skills should be procedures generated from business truth, not the source of business truth.**

---

# 11. Skill generation from business definitions

A canonical command:

```text
ApprovePurchaseOrder
```

can generate a skill that teaches Hermes:

```text
When to use
Required context
Required information
Validation procedure
Approval procedure
User-facing explanation
Postcondition verification
Known failure modes
```

The command definition remains authoritative.

The skill is a convenient, model-facing procedural projection.

This lets Hermes' self-improvement capability improve *how* the agent performs the procedure without allowing it to redefine the procedure's security and transactional invariants.

---

# 12. Agent-created skills: learning without silent production mutation

Hermes can create/update skills and has a skill write-approval gate.

In this platform the production skill lifecycle should be:

```text
Experience
   |
   v
Candidate skill change
   |
   v
Security scan
   |
   v
Business-model compatibility check
   |
   v
Automated evaluation
   |
   v
Diff review / approval policy
   |
   v
Published version
```

Production agents should not be able to silently redefine canonical business procedures.

A useful split is:

```text
learning namespace
    writable / experimental

production namespace
    versioned / reviewed / immutable
```

---

# 13. Context files: adopt the pattern, not the authority model

Hermes supports layered context files such as `AGENTS.md`, `.hermes.md` and other compatible files and scans them for prompt-injection patterns.

This is useful for developer/workspace instructions.

The ERP should use the same conceptual idea—layered context—but store authoritative business semantics in a governed registry instead of arbitrary filesystem instructions.

The model should receive:

```text
small stable operating contract
+
retrieved business semantics
+
retrieved tenant knowledge
+
relevant skills
```

not a giant mutable schema document on every turn.

---

# 14. Context engine: a strategic extension point

Hermes has a pluggable `ContextEngine` abstraction.

That makes it possible to replace or augment context compression with a business-aware context mechanism later.

A future platform context engine could preserve:

```text
task context
entity references
business model version
policy references
important facts
skill references
retrieval references
```

while allowing the rest of the conversation to be compressed.

The critical rule is that business state must not depend on lossy LLM summaries.

The business system remains externally queryable and authoritative.

---

# 15. Prompt assembly and prompt caching: architect around the Hermes design

Hermes deliberately separates stable system prompt state from ephemeral API-time additions and protects prompt-cache effectiveness.

Therefore the platform should avoid putting tenant-specific, frequently changing business schema into the stable system prompt.

Recommended layers:

```text
STABLE
  agent identity
  small platform safety contract
  stable operating instructions

CONTEXT
  small tenant/organization context
  workspace information where required

VOLATILE / ON-DEMAND
  semantic definitions
  current business facts
  retrieved documents
  skills
  business tool results
```

This preserves caching while still providing rich context.

---

# 16. Tool Search: critical for ERP-scale capability growth

Hermes Tool Search exists because large tool catalogs consume excessive context.

That becomes increasingly important in a modular ERP/business platform.

A tenant could eventually have:

```text
finance
sales
procurement
inventory
manufacturing
HR
projects
LMS
CRM
service
documents
analytics
integrations
```

The model should not see every tool on every turn.

The desired flow is:

```text
user intent
  -> capability retrieval
  -> relevant module
  -> relevant semantic concepts
  -> relevant skills
  -> relevant tools
```

This is the same principle as semantic query retrieval.

---

# 17. Tool system: narrow the available surface by business role

Hermes' generic tool registry is intentionally broad.

Business agents should receive narrow toolsets.

Recommended logical toolsets:

```text
erp.read
erp.search
erp.analyze
erp.command
erp.workflow
erp.document
erp.integration
erp.admin
```

A production finance agent should normally not have:

```text
terminal
arbitrary filesystem write
arbitrary SQL
unrestricted computer use
unrestricted MCP
credential-file access
```

The development/customization agent may have substantially more authority in a sandbox.

---

# 18. MCP: the ideal external capability interface

MCP is strategically important because it lets Hermes consume external capabilities without growing its core.

The ERP should expose itself through domain-oriented MCP servers or an equivalent domain-tool interface.

Prefer:

```text
customer_search
invoice_get
invoice_search
payment_register
purchase_order_approve
inventory_transfer
metric_get
workflow_start
```

over:

```text
execute_sql
```

MCP is a transport/interface.

It is not the authority layer.

---

# 19. MCP authorization rule

Even if Hermes is configured to see a tool, the platform must independently enforce:

```text
tenant
actor
role
permission
object scope
policy
workflow state
business constraints
```

The backend must fail closed.

A model-visible tool description is never sufficient authorization.

---

# 20. Plugins: use Hermes extension points aggressively

Hermes' plugin system supports tools, hooks, commands, platforms, memory providers, context engines, model providers and other extensions.

This means we should initially avoid a deep fork.

The preferred architecture is:

```text
upstream Hermes
      +
platform plugins
      +
platform MCP servers
      +
platform memory provider
      +
platform agent adapter
      +
platform UI integration
```

Fork only after a missing extension point is demonstrated and tested.

---

# 21. Plugin trust hierarchy

The platform should establish:

```text
Tier 0
Hermes core

Tier 1
Platform-owned Hermes integration

Tier 2
Reviewed first-party capability packages

Tier 3
Third-party service/MCP extensions

Tier 4
Untrusted external skills/MCP
```

Arbitrary tenant-authored host Python should not be treated as a normal customization mechanism.

Declarative capability definitions should be the default extensibility mechanism.

---

# 22. Hooks: use as interception and observability mechanisms

Hermes hooks can intercept tools, run guardrails, emit events, transform content and block execution.

The platform should use hooks for integration points such as:

```text
before business tool
before command
after command
authorization decision
skill load
skill proposal
memory proposal
transaction commit
workflow transition
agent failure
```

The platform's own transaction/audit layer remains authoritative.

Hermes hooks are integration/observability points, not the accounting ledger.

---

# 23. Security: Hermes is one layer, not the whole enterprise security model

Hermes already provides important protections including command approvals, file safety, container isolation, MCP credential filtering, context-file injection scanning, cross-session isolation and input sanitization.

The platform must add:

```text
Identity
Tenant isolation
Object authorization
Field sensitivity
Business policy
Command authorization
Data-layer enforcement
Audit
```

This yields:

```text
Hermes security
   +
Platform security
   +
Database security
```

---

# 24. Tenant isolation: below the LLM

Tenant isolation cannot depend on the model remembering a tenant ID.

Recommended initial strategy:

```text
tenant_id on tenant-owned rows
+
application authorization
+
PostgreSQL RLS as defense in depth
+
transaction-scoped tenant context
```

For larger/regulated tenants, the logical model should permit:

```text
shared database
shared schema
separate schema
separate database
```

without changing the Business Model Kernel.

---

# 25. Gateway: reuse Hermes, wrap it with platform identity

Hermes gateway is valuable for multi-channel connectivity and routing.

The platform should put its own identity layer in front of it:

```text
Telegram / Slack / Web / ERP UI
             |
             v
      Platform Identity
             |
             v
       Hermes Gateway
             |
             v
   Business Agent Gateway
```

A message channel never gets to bypass business tenant authorization.

---

# 26. Programmatic integration

Hermes currently exposes several routes into the same `AIAgent` core.

Recommended uses:

### HTTP/API server

ERP frontend and external web applications.

### Python integration

Internal platform services and controlled workers.

### ACP

Developer tooling and IDE-native customization agents.

The ERP frontend should not need to know Hermes internals.

---

# 27. Subagents: introduce explicit Task Contracts

Hermes subagents start with a fresh conversation and only receive the goal/context provided by the parent.

That is good isolation but dangerous if the task contract is vague.

Every platform subagent request should carry:

```json
{
  "task_id": "...",
  "tenant_id": "...",
  "actor_id": "...",
  "agent_id": "...",
  "business_model_version": "...",
  "permission_scope": [],
  "capability_scope": [],
  "entity_references": [],
  "input_references": [],
  "expected_output": {}
}
```

This prevents:

> "Check the thing we discussed earlier."

from becoming a cross-agent source of ambiguity.

---

# 28. Bot Mode: use as specialist-agent projection

Hermes Bot Mode maps profiles into persistent named Bots with their own role/model/memory/skills and recurring routines.

This is useful for:

```text
CFO
AP specialist
Sales specialist
Inventory specialist
HR specialist
Operations specialist
Support specialist
```

But the authoritative business Agent is still a platform object.

The Bot is the runtime projection.

---

# 29. Cross-agent collaboration

Bots can collaborate, but collaboration messages should be structured as task contracts rather than loose chat whenever business-critical work is involved.

Example:

```text
CFO Agent
   |
   | TaskContract
   v
AP Agent
   |
   | ResultContract
   v
CFO Agent
```

Agent-to-agent messaging is not permission transfer.

A child agent can only operate within the authority explicitly granted by the platform.

---

# 30. Cron: keep for agent routines, not canonical workflow state

Hermes provides powerful scheduling, skills attached to jobs, deliveries, fresh agent sessions and no-agent jobs.

Use it for:

```text
daily summaries
scheduled reports
proactive reminders
watchdogs
periodic agent analysis
```

The ERP should own the authoritative concept of an Automation.

Hermes can be the execution projection.

For complex durable business processes involving multi-day state, retries, timers, approvals and compensations, use a dedicated workflow engine abstraction.

---

# 31. Event-triggered automation

A better pattern for business activity is:

```text
Domain Event
      |
      v
Automation Policy
      |
      v
Hermes invocation
      |
      v
AI analysis / proposed action
      |
      v
Business Command
      |
      v
Transaction + Event
```

The ERP event system is authoritative.

Hermes reacts to business events instead of becoming the business event store.

---

# 32. Documents: use Hermes extraction, own the document system

Hermes supports extraction of common document formats.

Use that capability to help agents understand documents.

The platform should own:

```text
document_id
tenant_id
version
checksum
source
classification
permissions
retention
effective dates
original object
extracted text
provenance
```

The original document should live in the platform's object/document store.

---

# 33. Documents are untrusted data

A PDF or external document may contain instructions that attempt to influence the agent.

Therefore:

```text
document content
    !=
policy
```

Hermes' context-file prompt-injection scanning is useful, but tenant document ingestion needs an additional platform policy that treats external content as untrusted data.

---

# 34. Dashboard: use Hermes extensions for agent operations

Hermes' dashboard can be extended with themes, UI plugins, backend plugins, tabs and slots without modifying the core dashboard.

This is valuable for:

```text
agent operations
session inspection
skill management
memory diagnostics
runtime health
approvals
trace views
developer tools
```

The main ERP UI should still be independently built around the Business Model Kernel because ERP UI semantics are much broader than agent management.

---

# 35. Credentials

Hermes credential pools are useful for model/provider capacity and rotation.

They should not become the universal secret store for tenant integrations.

Use platform secret management for:

```text
banking
payments
CRM integrations
ERP integrations
vendor credentials
```

Give agents scoped capability tokens rather than broad permanent secrets whenever possible.

---

# 36. Trajectories / learning data

Hermes trajectory support is potentially very valuable for future agent evaluation and model improvement.

Keep it separate from production ERP truth.

Long-term learning data may include:

```text
synthetic tasks
approved traces
de-identified corrections
failed attempts
benchmark results
skill improvements
```

Never make training traces the authority for business definitions.

---

# Part II — The canonical architecture

# 37. The three-kernel model

The platform should be conceptualized as three cooperating systems.

## Kernel A — Hermes Agent Kernel

```text
Reasoning
Agent loop
Sessions
Skills
Memory
MCP
Tool use
Delegation
Bots
Cron
Context management
Channels
```

## Kernel B — Business Model Kernel

```text
Tenant
Identity
Entities
Fields
Relationships
Metrics
Rules
Commands
Workflows
Policies
Events
Versions
```

## Kernel C — Data / Workflow Kernel

```text
Transactions
Current state
Events
Outbox
Durable workflow state
Analytics
Documents
Audit
```

The Business Agent Gateway is the contract between A and B/C.

---

# 38. Business Model Kernel: canonical source of truth

The canonical model should define at minimum:

```text
Tenant
Organization
User
Agent
Role
Permission
Module
Capability

Entity
Field
ValueObject
Enum
Relationship

Metric
Rule
Constraint

Command
Workflow
Policy

Event
Projection
View

Document
Knowledge
Skill
Tool
Integration

Version
Migration
AuditRecord
```

Everything else is generated or projected from those objects.

---

# 39. Stable IDs and labels

All canonical objects need stable opaque IDs.

For example:

```text
entity_id: invoice
field_id: invoice.outstanding_amount
metric_id: finance.overdue_balance
command_id: invoice.cancel
```

Display names are localized metadata.

This enables:

```text
renaming
localization
aliases
schema evolution
AI disambiguation
```

without breaking internal references.

---

# 40. Entity model

Each Entity should contain:

```text
identity
business definition
grain
fields
relationships
lifecycle
commands
views
permissions
sensitivity
search configuration
AI aliases
version
```

An Invoice is therefore a business concept, not merely a SQL table.

---

# 41. Field model

Each field should declare:

```text
ID
name
business description
type
required
nullable
default
validation
unit
currency/timezone semantics
sensitivity
source
computed/derived status
aggregation behavior
searchability
writeability
aliases
version
```

Strong semantic types should include:

```text
Money
Quantity
Percentage
Rate
Currency
Country
TaxCode
Date
DateTime
Duration
Address
PhoneNumber
```

---

# 42. Relationship model

Relationship metadata should capture:

```text
source entity
target entity
cardinality
optionality
ownership
allowed traversal
delete behavior
security inheritance
semantic description
multiplicity risk
```

This becomes the basis for valid query paths.

---

# 43. Metric model

A Metric should be a governed semantic definition, not an LLM-created formula.

Example:

```yaml
id: metric_customer_overdue_balance
subject: Customer
grain: customer
measure:
  sum: Invoice.outstanding_amount
filters:
  Invoice.status: overdue
currency: reporting_currency
version: 2
```

The AI retrieves the metric and requests it.

The computation is deterministic.

---

# 44. Rules and constraints

Separate:

```text
Constraint
  structural/data invariant

Rule
  business/domain invariant
```

Examples:

```text
payment.amount <= invoice.outstanding_amount
invoice_number unique within tenant
quantity > 0
end_date >= start_date
```

Never rely on a prompt to enforce such invariants.

---

# 45. Command model

Commands are the only normal mutation interface from AI.

Example:

```yaml
id: command_purchase_order_approve
inputs:
  purchase_order_id: PurchaseOrderId
preconditions:
  - purchase_order.status == pending_approval
  - actor.can_approve_purchase_order(purchase_order)
authorization:
  policy: procurement_approval_policy
effects:
  - set purchase_order.status = approved
  - emit PurchaseOrderApproved
audit:
  required: true
postconditions:
  - purchase_order.status == approved
idempotency:
  required: true
```

---

# 46. Workflow model

Workflows define authoritative business processes.

They contain:

```text
states
transitions
actors
policies
conditions
approvals
timers
notifications
compensation
retries
events
```

Hermes may reason inside a workflow.

Hermes is not the durable workflow state machine.

---

# 47. Event model

Business events are immutable facts such as:

```text
InvoiceIssued
PaymentRegistered
PurchaseOrderApproved
InventoryTransferred
EmployeeHired
```

Each event should carry:

```text
event_id
event_type
tenant_id
aggregate_id
actor_id
occurred_at
recorded_at
correlation_id
causation_id
schema_version
payload
```

---

# 48. Projection model

Projection objects define derived read models:

```text
CustomerOutstandingBalance
InventoryAvailability
MonthlyRevenue
SalesPipelineSnapshot
```

This is a major anti-hallucination feature because the agent does not need to reconstruct the same complex joins and formulas repeatedly.

---

# Part III — Business IR and deterministic execution

# 49. Business IR replaces direct AI-to-SQL

The model should produce a typed intermediate representation.

Initial implementation recommendation:

```text
JSON Schema
+
typed runtime models
+
canonical IDs
+
structured model/tool calling
```

A custom textual DSL can be added later for debugging and power users.

---

# 50. Business Query IR

A query should specify:

```text
operation
subject entity
grain
dimensions
measures
filters
relationships
time range
time basis
currency basis
sort
limit
```

Example:

```json
{
  "operation": "list",
  "entity": "Customer",
  "grain": "customer",
  "dimensions": ["country"],
  "measures": ["overdue_balance"],
  "filters": [
    {
      "field": "country",
      "operator": "eq",
      "value": "DE"
    },
    {
      "metric": "overdue_balance",
      "operator": ">",
      "value": {
        "amount": 10000,
        "currency": "EUR"
      }
    }
  ],
  "sort": [
    {
      "metric": "overdue_balance",
      "direction": "desc"
    }
  ]
}
```

---

# 51. Query compiler

The query path should be:

```text
User request
   |
   v
Hermes reasoning
   |
   v
Business Query IR
   |
   v
Schema resolution
   |
   v
Type checking
   |
   v
Entity/value resolution
   |
   v
Relationship/path validation
   |
   v
Metric expansion
   |
   v
Time/currency normalization
   |
   v
Authorization injection
   |
   v
Tenant filter injection
   |
   v
Physical planner
   |
   v
SQL / engine compilation
   |
   v
SQL safety validation
   |
   v
Execution
   |
   v
Structured result + provenance
```

The AI never needs to write raw SQL.

---

# 52. SQL remains an implementation target

SQL is not rejected.

It is demoted.

```text
Business Model
      |
Business IR
      |
Compiler
      |
SQL
      |
PostgreSQL
```

This means the platform can later compile some business queries to:

```text
PostgreSQL
ClickHouse
DuckDB
search engine
graph projection
API
precomputed projection
```

without changing the AI's conceptual interface.

---

# 53. Business Command IR

Commands should be structured as explicit business operations.

Example:

```json
{
  "command": "approve_purchase_order",
  "inputs": {
    "purchase_order_id": "po_1042"
  },
  "requested_by": "user_17",
  "idempotency_key": "..."
}
```

The command engine determines:

```text
actor
permission
preconditions
policy
approval
transaction
side effects
postconditions
audit
```

---

# 54. Human approval boundary

For high-impact actions:

```text
Intent
  |
  v
Command proposal
  |
  v
Impact analysis
  |
  v
Authorization/policy check
  |
  v
User confirmation
  |
  v
Transaction
  |
  v
Verification
```

The user approves the business command, not an opaque SQL mutation.

---

# Part IV — Physical data architecture

# 55. Recommended initial transaction database

Use PostgreSQL as the primary transactional data store.

This is intentionally conservative.

The architecture's innovation belongs above the database, not in replacing mature transactional storage before there is a demonstrated need.

PostgreSQL provides:

```text
ACID transactions
foreign keys
constraints
indexes
RLS
JSONB
materialized views
mature operations
```

---

# 56. Tenant row structure

Tenant-owned data should normally contain:

```text
tenant_id
id
created_at
created_by
updated_at
updated_by
version
```

Additional ownership/organization keys may be required by domain.

Unique constraints should normally include tenant scope unless the identifier is intentionally global.

---

# 57. Money and quantity

Money:

```text
Decimal amount
+
Currency
```

Quantity:

```text
Decimal value
+
Unit of measure
```

Do not use floating point as the authoritative representation of monetary amounts.

---

# 58. Time

Use explicit time semantics.

Different concepts must remain distinct:

```text
created_at
issued_at
posted_at
due_at
paid_at
effective_from
effective_to
fiscal_period
business_date
UTC timestamp
```

"Last quarter" must be resolved through an explicit fiscal-calendar definition where appropriate.

---

# 59. Status and state machines

Do not store status as unconstrained free text.

A status should be a governed value/state with legal transitions.

Example:

```text
Draft
  |
  v
Issued
  |
  +--> Cancelled
  |
  v
PartiallyPaid
  |
  v
Paid
```

The AI does not decide whether a transition is legal.

---

# 60. Avoid universal EAV

Do not make the entire ERP an Entity-Attribute-Value system.

The flexibility is attractive, but it compromises:

```text
type safety
constraints
indexing
analytics
query predictability
AI semantics
```

Prefer:

```text
typed generated schema
+
controlled extension structures
+
limited JSONB for genuinely dynamic auxiliary data
```

---

# 61. Schema extension strategy

When a user adds:

```text
Vehicle.purchase_price : Money
```

it should become a real logical schema field and, when operationally appropriate, a typed physical representation.

The platform can compile this into:

```text
database
API
UI
validation
permissions
search
AI semantics
analytics
```

---

# 62. Schema changes are model changes first

The lifecycle is:

```text
Draft model
   |
   v
Validate
   |
   v
Model diff
   |
   v
Impact analysis
   |
   v
Migration plan
   |
   v
Tests / fixtures
   |
   v
Approval
   |
   v
Apply migration
   |
   v
Verify
   |
   v
Publish model version
```

No direct arbitrary DDL through chat.

---

# 63. Schema evolution classes

## Additive

Usually lower risk:

```text
new entity
new field
new relationship
new metric
new view
new enum value
```

## Transformative

Requires migration analysis:

```text
field rename
type change
relationship cardinality change
formula change
state transition change
```

## Destructive

Requires explicit approval/retention considerations:

```text
entity deletion
field removal
relationship removal
enum removal
```

---

# 64. Version all important semantics

At minimum:

```text
business_model_version
entity_version
field_version
metric_version
command_version
workflow_version
policy_version
skill_version
knowledge_version
migration_version
```

Every material AI operation should record the relevant versions.

---

# 65. Historical reproducibility

Business definitions can change.

For example:

```text
Overdue v1 = >30 days
Overdue v2 = >45 days
```

The system must be able to answer historical questions using the appropriate definition for the relevant period.

This is why effective dating and versioning are first-class architecture, not optional metadata.

---

# Part V — Anti-hallucination threat model

# 66. Failure modes

The platform should explicitly design against at least:

1. Semantic hallucination — confusing one business concept for another.
2. Structural hallucination — inventing entities or fields.
3. Join/path hallucination — traversing the wrong relationship.
4. Aggregation hallucination — double counting due to incorrect grain.
5. Value hallucination — confusing labels/codes/entities.
6. Temporal hallucination — using the wrong date or period.
7. Currency/unit hallucination — mixing monetary or quantity units.
8. Authorization hallucination — acting as if the user has authority.
9. State hallucination — performing an invalid lifecycle transition.
10. Action hallucination — mutating the wrong record or executing an unintended command.
11. Cross-tenant leakage — accessing another tenant's data.
12. Document injection — treating external content as instructions.
13. Skill poisoning — learned procedures changing dangerous behavior.
14. Memory poisoning — incorrect learned facts becoming persistent.
15. Schema drift — old skills/commands referring to superseded structures.
16. Session confusion — wrong user/tenant/agent context.
17. Multi-agent context loss — child agent lacking required task context.
18. Provider/model variability — changes in tool calling or reasoning behavior.
19. Staleness — using outdated knowledge or definitions.
20. Tool overreach — exposing too broad a capability surface.

---

# 67. Structural defenses

The architecture should turn as many failure modes as possible into deterministic validation failures instead of language-level mistakes.

Examples:

```text
unknown entity
    -> reject

unknown field
    -> reject

invalid relationship path
    -> reject

invalid enum value
    -> reject

wrong grain
    -> reject or require explicit plan

unauthorized command
    -> reject

invalid state transition
    -> reject

cross-tenant reference
    -> reject

missing currency
    -> reject

stale policy version
    -> resolve explicit current/effective version
```

---

# 68. Closed-world semantic resolution

When the user says:

```text
Germany
Deutschland
DE
```

the entity resolver should map them through the canonical value registry.

The same approach applies to:

```text
customers
products
warehouses
employees
accounts
departments
projects
```

The AI should propose; the resolver confirms.

---

# 69. Explicit grain

Every analytical request should have a grain:

```text
customer
invoice
invoice_line
payment
day
month
organization
```

The compiler can then detect an aggregation that could otherwise multiply rows.

This is one of the most important concrete controls for financial/ERP analytics.

---

# 70. Approved relationship paths

Do not let the model decide a join merely because columns appear compatible.

Relationship paths should be explicit.

For example:

```text
Customer -> Invoice -> InvoiceLine -> Product
```

and:

```text
Customer -> Order -> Payment
```

may be valid for different questions.

The metric definition determines which path is semantically correct.

---

# 71. Deterministic calculations

The model should not calculate:

```text
revenue
outstanding balance
VAT
gross margin
inventory value
```

from thousands of rows in natural language.

The platform should compute them.

The model receives the result plus provenance.

---

# 72. Result provenance

A result should be able to report:

```text
execution_id
metric definitions used
business model version
data freshness
filters
grain
currency basis
source entities
authorization context
```

This is essential for user trust and debugging.

---

# Part VI — Self-extending platform architecture

# 73. Module becomes a capability package

Do not define a module as simply:

```text
tables + pages
```

Define it as a complete business capability:

```text
Capability Package
 ├── business model
 ├── entities
 ├── fields
 ├── relationships
 ├── metrics
 ├── rules
 ├── commands
 ├── workflows
 ├── policies
 ├── UI
 ├── reports
 ├── AI semantics
 ├── skills
 ├── MCP tools
 ├── documents
 ├── migrations
 └── tests
```

---

# 74. Capability package example

A package could have:

```text
finance/
├── manifest.yaml
├── model/
├── entities/
├── relationships/
├── metrics/
├── rules/
├── commands/
├── workflows/
├── policies/
├── views/
├── ui/
├── ai/
├── skills/
├── analytics/
├── migrations/
├── fixtures/
└── tests/
```

---

# 75. Module dependencies

A package explicitly declares dependencies:

```text
finance.accounts_payable
    requires
core.identity
core.organization
core.currency
core.documents
```

The package manager validates compatibility before installation.

---

# 76. Generated UI

From:

```text
Entity
Field
Relationship
View
Workflow
Permission
Command
```

the platform can generate:

```text
forms
lists
filters
detail pages
action menus
relationship panels
approval interfaces
status controls
```

The UI is another projection of the Business Model Kernel.

---

# 77. Generated API

The same model generates business-oriented APIs:

```text
search entity
get entity
get relationships
query metric
execute command
start workflow
```

The API is not a reflection of physical SQL tables.

---

# 78. Generated AI capabilities

This is the key unification:

```text
Entity
  -> retrieval capability

Metric
  -> analytical capability

Command
  -> mutation capability

Workflow
  -> procedural capability / skill

Relationship
  -> navigation capability

Policy
  -> authorization capability
```

The AI interface emerges from the same canonical model as the rest of the application.

---

# 79. Example: self-extension from the ERP frontend

User asks:

> Add equipment management.

The platform can propose:

```text
Entities:
  Equipment
  EquipmentType
  EquipmentAssignment
  EquipmentMaintenance
  EquipmentCost

Relationships:
  Equipment -> EquipmentType
  Equipment -> Employee
  Equipment -> Maintenance
```

The model builder then produces a structured impact preview:

```text
5 entities
27 fields
6 relationships
14 permissions
3 workflows
11 views
8 AI capabilities
2 reports
1 migration
24 tests
```

The user approves.

The compiler applies the capability package.

---

# 80. AI-assisted schema design

The AI can be the *designer* of a change without being the *authority* that publishes it.

Pattern:

```text
Natural language requirement
        |
        v
Hermes reasoning
        |
        v
Draft capability package
        |
        v
Model validator
        |
        v
Impact analysis
        |
        v
Test generation
        |
        v
Human / policy approval
        |
        v
Publish
```

---

# 81. Capability package versioning

Every package should carry:

```text
package_id
version
platform_version
model_version
dependencies
migration version
AI artifact versions
```

This makes extension installation reproducible.

---

# Part VII — Memory and knowledge architecture

# 82. Do not call everything memory

The system should make the following categories explicit:

```text
Platform Definition
Business Truth
Tenant Knowledge
Agent Memory
Session History
Procedural Skills
```

The word "memory" should not hide different authority levels.

---

# 83. Platform Definition

Examples:

```text
identity model
tenant model
permission framework
core capabilities
localization
system configuration
```

---

# 84. Business Truth

Examples:

```text
entities
relationships
metrics
rules
commands
workflows
policies
events
```

---

# 85. Tenant Knowledge

Examples:

```text
internal procedures
SOPs
contracts
manuals
company policies
product documentation
organizational terminology
```

---

# 86. Agent memory

Examples:

```text
user preferences
working conventions
non-authoritative observations
learning notes
```

---

# 87. Session history

Examples:

```text
conversation
tool calls
results
decisions
delegations
```

---

# 88. Skills

Examples:

```text
recurring procedures
troubleshooting
workflows
best practices
```

---

# 89. Knowledge retrieval

Retrieval must be filtered by:

```text
tenant
organization
user
agent
module
classification
effective date
permission
```

The vector similarity score is not an authorization mechanism.

---

# Part VIII — Multi-tenant agent architecture

# 90. Tenant, user and agent model

Recommended model:

```text
Platform
  |
  +-- Tenant
       |
       +-- Organization(s)
       +-- User(s)
       +-- Agent(s)
       +-- Capability Packages
       +-- Business Data
       +-- Knowledge
       +-- Policies
       +-- Workflows
```

And separately:

```text
Hermes Runtime
  |
  +-- Runtime / Worker
       +-- Profile
       +-- Session(s)
       +-- Skills projection
       +-- Memory projection
```

The platform owns the mapping.

---

# 91. Production Hermes profile strategy

Avoid designing the SaaS system around one permanently shared profile for all tenants.

The runtime should use controlled isolation such as:

```text
profile per security domain
or
profile per tenant-agent environment
or
ephemeral worker with scoped persistent state
```

The exact packing can change as scale requirements become known.

The invariant is:

> **No cross-tenant business state may become visible merely because two conversations happen to use the same Hermes runtime profile.**

---

# 92. Platform session model

The platform should own a durable session reference:

```text
AIConversation
    id
    tenant_id
    user_id
    agent_id
    channel
    state
    hermes_session_id
    business_model_version
    created_at
    updated_at
```

This is the stable application object.

---

# Part IX — Business Agent Gateway

# 93. The bridge between Hermes and the platform

The Business Agent Gateway is the most important integration component.

It provides:

```text
tenant resolution
identity resolution
capability discovery
semantic retrieval
Business Query IR
Business Command IR
policy enforcement
authorization
validation
provenance
audit references
```

Hermes should not need to understand the physical database.

---

# 94. Business Agent Gateway request contract

Conceptually:

```text
AgentRequest
  principal
  tenant
  agent
  session
  intent
  capability
  model_version
  references
```

The gateway returns structured contracts, not ambiguous prose.

---

# 95. Tool result contract

Business tools should return typed outcomes:

```text
success
not_found
ambiguous
validation_failed
authorization_denied
conflict
requires_confirmation
requires_human
system_error
```

This prevents the AI from having to infer semantics from arbitrary exception strings.

---

# 96. Domain MCP architecture

A platform MCP layer can expose:

```text
core.mcp
finance.mcp
sales.mcp
inventory.mcp
hr.mcp
documents.mcp
analytics.mcp
workflow.mcp
```

Whether these are separate processes or logical namespaces can evolve.

The important property is domain boundary and least privilege.

---

# Part X — Business workflow and agent workflow

# 97. Three workflow categories

## Deterministic workflow

No LLM required.

Example:

```text
invoice becomes overdue
-> create reminder
```

## Agent-assisted workflow

LLM reasons, platform commands execute.

Example:

```text
investigate unusual supplier cost growth
```

## Autonomous research/task workflow

Agent explores tools and information.

Example:

```text
investigate why gross margin declined
```

All three need a common business authorization foundation.

---

# 98. Durable business workflow

For important processes, state should be recoverable independently of Hermes process lifetime.

Pattern:

```text
Workflow Engine
   |
   +-- durable state
   +-- timers
   +-- retries
   +-- human tasks
   +-- compensations
   |
   +-- Hermes decision step
```

This makes the agent replaceable/restartable.

---

# Part XI — Observability, audit and provenance

# 99. AI execution ledger

Every material AI action should record:

```text
tenant_id
user_id
agent_id
session_id
hermes_session_id
model/provider
prompt/request reference
business_model_version
skill_version
knowledge references
Business IR
command/query
authorization result
execution_id
result
business event IDs
timestamps
```

---

# 100. Why provenance matters

The user should be able to ask:

> Why is this number €148,220?

The platform should be able to trace:

```text
Metric definition
 -> source entities
 -> filters
 -> time period
 -> currency basis
 -> model version
 -> execution
```

The same principle applies to actions:

```text
Who
 -> requested what
 -> interpreted as which command
 -> under which policy
 -> approved by whom
 -> changed which records
 -> emitted which events
```

---

# 101. Use Hermes hooks plus platform audit

Hermes hooks are useful for telemetry and integration.

Platform audit is authoritative.

Use standard telemetry with correlated:

```text
trace_id
execution_id
command_id
workflow_id
session_id
tenant_id
```

---

# Part XII — Evaluation framework

# 102. Business correctness benchmark

Build a proprietary ERP benchmark immediately.

Each case contains:

```text
user request
expected business meaning
expected entity/metric/command
expected grain
expected relationship path
expected filters
expected authorization
expected result or invariant
```

---

# 103. Read evaluation

Measure:

```text
entity resolution
metric resolution
filter resolution
path correctness
grain correctness
time correctness
currency correctness
authorization correctness
result correctness
provenance completeness
```

---

# 104. Write evaluation

Measure:

```text
command selection
input correctness
permission enforcement
preconditions
policy enforcement
confirmation behavior
transaction success
idempotency
postcondition
```

---

# 105. Schema evolution evaluation

After every model change test:

```text
old sessions
old skills
old reports
old saved queries
old workflows
historical definitions
```

---

# 106. Multi-agent evaluation

Verify that a subagent gets exactly:

```text
tenant
actor
scope
model version
task
references
```

and cannot infer/access a broader context.

---

# 107. Security evaluation

Continuously test:

```text
cross-tenant reads
cross-tenant writes
prompt injection
skill poisoning
memory poisoning
tool escalation
unauthorized commands
MCP overreach
document injection
profile contamination
```

Zero cross-tenant leakage should be a hard invariant, not a probabilistic metric.

---

# Part XIII — Recommended technology positions

# 108. Database

Recommended default:

```text
PostgreSQL
```

Do not replace it with an exotic data store merely because the project is AI-first.

---

# 109. Analytics

Start with PostgreSQL projections/materialized views where practical.

Then consider:

```text
DuckDB
```

for embedded/local analytical tasks, and:

```text
ClickHouse
```

for high-volume centralized analytics.

The Business Model Kernel remains the authority.

---

# 110. SQL/IR tooling

Use SQLGlot or an equivalent AST/parser library as a safety/compilation utility.

Apache Calcite can be evaluated later if a cross-engine optimizer becomes important.

These are implementation details.

---

# 111. Semantic/analytics tooling

Projects such as Cube, dbt and Malloy can be useful components or sources of design inspiration.

They should not become a second canonical business-semantic system if the Business Model Kernel already owns those definitions.

---

# 112. Metadata/catalog

OpenMetadata/DataHub/OpenLineage-style systems are potentially useful for data catalogs and lineage.

Again:

```text
catalog metadata
    !=
business semantic authority
```

---

# 113. Workflow

A Temporal-class workflow engine is a strong candidate for durable business processes.

Keep the abstraction behind the platform so the runtime can change later.

---

# 114. Authorization

The platform should have its own authorization interface supporting:

```text
RBAC
ABAC
relationship-aware access
object-level access
field sensitivity
approval policies
```

PostgreSQL RLS provides a second enforcement layer.

---

# 115. Retrieval

Use:

```text
object storage
metadata registry
full-text search
semantic/vector retrieval
```

Candidate technologies include:

```text
PostgreSQL + pgvector
Qdrant
OpenSearch
```

depending on scale.

---

# 116. Observability

Use OpenTelemetry-style tracing and metrics.

The key is correlation, not the specific vendor.

---

# 117. Evaluation

External tools such as promptfoo, Ragas and DeepEval can support infrastructure.

Public benchmarks such as Spider/BIRD-style datasets are useful for generic query evaluation, but the proprietary ERP benchmark is the strategic asset.

---

# 118. Open-source strategic stack

A permissive-license-oriented reference composition from the earlier architecture research is:

```text
PostgreSQL
SQLGlot
DuckDB / ClickHouse
OpenTelemetry
OpenLineage
Temporal
OpenFGA / policy-engine abstraction
pgvector / Qdrant / OpenSearch
React + schema-driven UI stack
Hermes Agent
```

Use MIT / Apache-2.0 / BSD / PostgreSQL-licensed components where practical.

Avoid making copyleft/source-available projects mandatory parts of a permissive commercial core unless their licensing implications are deliberately accepted.

---

# Part XIV — What should actually be proprietary IP

# 119. The moat

Hermes itself is not the moat.

The strongest proprietary assets are:

```text
Canonical Business Model Kernel
Validated business ontology
Relationship graph
Approved query paths
Metric definitions
Business IR
Command engine
Schema compiler
Capability package format
Authorization model
Workflow integration
Provenance/audit model
Tenant-aware memory layer
Skill promotion pipeline
ERP evaluation corpus
Generated MCP/domain tools
Dynamic workspace
```

These pieces reinforce each other.

---

# 120. The Business Model Kernel as the real platform

The long-term platform should be thought of as:

> **A compiler/runtime for machine-readable business systems.**

An ERP becomes one family of packages built on top of it.

Other capabilities can include:

```text
CRM
LMS
Service Management
HR
Project Management
Manufacturing
Internal Operations
```

without changing the underlying platform philosophy.

---

# Part XV — Exact ownership boundaries

# 121. Ownership matrix

| Capability | Hermes owns | Platform owns | Integration boundary |
|---|---:|---:|---:|
| LLM provider execution | Yes | Policy/config | Adapter |
| Agent loop | Yes | | |
| Session runtime | Yes | Business session reference | Bridge |
| Tenant | | Yes | |
| User identity | | Yes | |
| Roles/permissions | | Yes | |
| ERP schema | | Yes | |
| Business metrics | | Yes | |
| Business rules | | Yes | |
| Commands | Runtime invocation | Yes | Gateway |
| Workflow truth | | Yes | Hermes decision steps |
| Transaction state | | Yes | |
| Domain events | | Yes | Hermes subscriptions |
| Audit | Runtime observability | Yes | Correlated events |
| Skills | Runtime copy/projection | Canonical package registry | Bridge |
| Memory | Agent runtime behavior | Scoped storage | MemoryProvider |
| Documents | Extraction | Canonical storage/ACL | Document adapter |
| MCP | Client/runtime | Domain MCP server | MCP |
| Cron | Agent scheduling | Business Automation definition | Bridge |
| UI | Hermes dashboard | ERP frontend | API/SDK |
| Subagents | Yes | Scope/task contract | Gateway |
| Schema migration | | Yes | |

---

# Part XVI — Self-extending ERP lifecycle

# 122. Full lifecycle of a new capability

```text
User requirement
       |
       v
AI-assisted design
       |
       v
Capability draft
       |
       v
Business Model draft
       |
       v
Validation
       |
       v
Impact analysis
       |
       v
Generated UI/API/AI/migration preview
       |
       v
Tests + fixtures
       |
       v
Approval
       |
       v
Publish version
       |
       v
Migrate
       |
       v
Activate capability
```

---

# 123. Data changes vs schema changes

The platform should distinguish:

```text
Data change
  = business transaction on existing model

Schema/model change
  = change to the capability definition
```

Both can originate from natural language, but they go through different command paths.

---

# 124. Example of data change

User:

> Increase Product X price by 5%.

AI creates:

```text
UpdateProductPrice
```

The command engine validates and executes.

---

# 125. Example of schema change

User:

> Add a field for contract renewal probability to opportunities.

AI creates:

```text
ModelChange
  entity = Opportunity
  add field = renewal_probability
  type = Percentage
```

The schema lifecycle creates a migration and generated UI/API/AI artifacts.

The model change is not treated as an ordinary record mutation.

---

# Part XVII — Production agent architecture

# 126. Business agent profile definition

A platform Agent should define:

```text
agent_id
name
purpose
role
allowed modules
allowed capabilities
allowed commands
knowledge scope
memory policy
skill bundle
model policy
approval policy
Hermes runtime reference
version
```

The Hermes profile/Bot is generated/configured from this.

---

# 127. Narrow agent capability examples

### Finance Agent

```text
finance.read
finance.analyze
invoice.search
invoice.read
payment.propose
payment.execute (policy-gated)
```

### Operations Agent

```text
inventory.read
inventory.transfer
warehouse.search
workflow.start
```

### Customization Agent

```text
model.draft
migration.preview
ui.generate
skill.propose
schema.test
```

The last agent operates in a governed staging environment.

---

# 128. High-risk capabilities

Commands such as:

```text
pay money
change bank details
run payroll
change employee compensation
change permissions
delete financial records
post accounting entries
```

should require stronger authorization and, where policy dictates, explicit human approval.

---

# Part XVIII — Failure recovery architecture

# 129. Agent failure

The system can:

```text
retry
fallback model
resume session
recreate agent
```

without losing business state.

---

# 130. Command failure

A failed command should produce:

```text
transaction rollback/no partial unauthorized mutation
structured error
failure audit
possible remediation
```

---

# 131. Workflow failure

Workflow state survives Hermes restart.

A new Hermes agent can continue the same workflow step with a fresh runtime.

---

# 132. Hermes upgrade failure

The `AgentRuntime` abstraction isolates the platform from direct Hermes implementation details.

That enables:

```text
upgrade Hermes
run compatibility harness
verify
roll forward or revert runtime
```

---

# Part XIX — Hermes compatibility layer

# 133. Build a platform `AgentRuntime` interface

Do not let the platform codebase call Hermes internals everywhere.

Define:

```text
AgentRuntime
  create_agent()
  start_session()
  resume_session()
  send_message()
  stream_events()
  invoke_tool()
  request_approval()
  delegate()
  schedule()
  load_skill()
  retrieve_memory()
  publish_result()
```

Then:

```text
AgentRuntime
     |
     +-- HermesAdapter
```

This is an important portability boundary.

---

# 134. Upgrade harness

Before any Hermes version upgrade, automatically test:

```text
AIAgent construction
profile isolation
session resume
session fork
skills
memory provider
context engine
MCP
plugins
hooks
API server
subagents
cron
Bot Mode
approval
dashboard integration
```

Only then update the production baseline.

---

# Part XX — Recommended implementation phases

# 135. Phase 0 — Freeze and observe Hermes

Pin the Hermes version.

Build a compatibility harness.

Map the actual code paths used by:

```text
AIAgent
sessions
memory
skills
plugins
MCP
hooks
subagents
cron
API server
```

Do not build ERP logic yet.

---

# 136. Phase 1 — Platform kernel

Build:

```text
Tenant
Organization
User
Agent
Role
Permission
Module
Capability
Version
Audit
```

---

# 137. Phase 2 — Business Model Kernel

Implement:

```text
Entity
Field
ValueObject
Enum
Relationship
Metric
Rule
Constraint
Command
Workflow
Policy
Event
Projection
View
```

---

# 138. Phase 3 — Model compiler

Generate at minimum:

```text
database schema
migration plan
API
basic UI
permission declarations
AI semantic definitions
```

---

# 139. Phase 4 — Business Agent Gateway

Implement:

```text
semantic retrieval
Business Query IR
Business Command IR
authorization
policy enforcement
provenance
```

---

# 140. Phase 5 — Hermes adapter

Implement:

```text
Hermes runtime adapter
session bridge
platform memory provider
skill projection
MCP domain tools
tool policy
Task Contracts
approval bridge
```

---

# 141. Phase 6 — AI workspace

Build:

```text
conversation
structured results
tables
charts
forms
command proposals
approval UI
provenance UI
```

---

# 142. Phase 7 — First capability packages

Do not begin by copying an entire conventional ERP.

Prove one coherent slice end-to-end:

```text
model definition
-> generated DB
-> generated UI
-> generated API
-> generated AI tools
-> AI query
-> deterministic result
-> command
-> audit
-> schema change
```

---

# 143. Phase 8 — Learning system

Add:

```text
skill proposals
memory proposals
agent learning records
evaluation
approval
versioning
```

---

# 144. Phase 9 — Event/workflow/analytics plane

Add:

```text
domain events
outbox
analytics projections
durable workflow
scheduled routines
event-triggered agent work
```

---

# Part XXI — Non-negotiable architecture rules

# 145. Rules

Treat the following as project invariants:

```text
1. The Business Model Kernel is the canonical source of business meaning.

2. Hermes is the agent runtime, not the ERP database.

3. A Hermes profile is not a tenant.

4. Hermes state.db is not the authoritative ERP transaction store.

5. Hermes built-in memory is contextual; it is not the business ontology.

6. Skills describe procedures; policies and business rules remain governed platform objects.

7. The LLM produces Business Intent / Business IR rather than arbitrary write-SQL.

8. The data layer enforces tenant boundaries independently of the LLM.

9. Every read is subject to semantic validation, relationship validation and authorization.

10. Every write is a typed business command.

11. High-impact writes use an explicit approval boundary where policy requires it.

12. Important commands execute transactionally and are followed by postcondition verification.

13. Important business transactions produce immutable audit/event records.

14. Schema changes are model changes first and physical migrations second.

15. Business modules are versioned capability packages.

16. The ERP frontend edits logical business models rather than arbitrary SQL.

17. The entire ERP schema is never injected into every AI prompt.

18. Semantic retrieval and tool discovery are progressive/on-demand.

19. Documents are untrusted content, not policy.

20. Agent learning creates proposals before changing production knowledge/procedures.

21. Subagents receive explicit task contracts.

22. Durable business workflow state exists outside Hermes.

23. Hermes should be integrated through public/intentional extension points before considering a fork.

24. Every material AI result and action has provenance.

25. Every semantic definition is versioned.

26. The physical storage engine is hidden behind the logical Business Model.

27. The system must be able to compile the same business concept to different execution engines.

28. SQL is an implementation target, not the business language of the AI.

29. Business calculations are performed deterministically by the platform.

30. Authorization is never delegated to prompt wording, skill text, memory, or persona.
```

---

# Part XXII — Final target architecture

# 146. Full architecture

```text
                                  USER
                                    |
                                    v
                         +----------------------+
                         |     ERP FRONTEND     |
                         |                      |
                         | Data UI              |
                         | AI Workspace         |
                         | Model Builder        |
                         | Admin / Approvals    |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | PLATFORM APPLICATION  |
                         | API / Identity        |
                         +----------+-----------+
                                    |
             +----------------------+----------------------+
             |                      |                      |
             v                      v                      v
       Business Data          AI Conversation        Model Builder
             |                      |                      |
             |                      v                      v
             |               +--------------+       +-------------+
             |               |    HERMES    |       | Model Draft |
             |               |    RUNTIME   |       | / Compiler  |
             |               +------+-------+       +------+------+ 
             |                      |                      |
             |                      +----------+-----------+
             |                                 |
             |                                 v
             |                    +------------------------+
             |                    | BUSINESS AGENT         |
             |                    | GATEWAY                |
             |                    |                        |
             |                    | tenant / identity      |
             |                    | semantic retrieval     |
             |                    | Query IR / Command IR  |
             |                    | authorization          |
             |                    | policy                 |
             |                    | provenance             |
             |                    +-----------+------------+
             |                                |
             |                                v
             |                    +------------------------+
             |                    | BUSINESS MODEL KERNEL  |
             |                    |                        |
             |                    | Entities               |
             |                    | Fields                 |
             |                    | Relationships          |
             |                    | Metrics                |
             |                    | Rules                  |
             |                    | Commands               |
             |                    | Workflows              |
             |                    | Policies               |
             |                    | Events                 |
             |                    | Versions               |
             |                    +-----------+------------+
             |                                |
             |              +-----------------+----------------+
             |              |                 |                |
             |              v                 v                v
             |           QUERY IR         COMMAND IR       WORKFLOW IR
             |              |                 |                |
             |              v                 v                v
             |           Planner         Domain Engine    Workflow Engine
             |              |                 |                |
             +--------------+-----------------+----------------+
                            |
                            v
                 +--------------------------+
                 | DATA / EVENT / ANALYTICS |
                 |          PLANE            |
                 |                          |
                 | PostgreSQL                |
                 | Outbox / Domain Events    |
                 | Analytics Projections     |
                 | Object / Document Store   |
                 +-------------+------------+
                               |
                               v
                        AUDIT / PROVENANCE
```

---

# Part XXIII — The deepest architectural conclusion

# 147. The question is no longer SQL vs non-SQL

The platform should not make the AI choose a storage language.

Instead:

```text
              BUSINESS REALITY
                     |
                     v
              BUSINESS MODEL
                     |
                     v
                BUSINESS IR
                     |
          +----------+----------+
          |                     |
          v                     v
       QUERY                  COMMAND
          |                     |
          v                     v
       PLANNER              DOMAIN ENGINE
          |                     |
          +----------+----------+
                     |
                     v
             PHYSICAL STORAGE
```

The physical layer may use:

```text
SQL
columnar storage
graph projection
search
object storage
vector retrieval
```

without changing the semantic language of the platform.

---

# 148. The platform's real abstraction

The final abstraction is:

> **A business-model compiler and runtime that turns machine-readable business capabilities into databases, APIs, UI, workflows, permissions, analytics, MCP interfaces and AI procedures.**

Hermes is the intelligence engine that makes the platform adaptive.

The Business Model Kernel makes it trustworthy.

---

# 149. The most important sentence

> **Hermes can learn how to use the business system without being allowed to redefine what the business system means.**

That should remain the architectural north star.

---

# 150. What the next design document should define

The next design stage should move from architecture into an exact canonical meta-model specification.

That document should define the schemas and contracts for:

```text
Tenant
Organization
User
Agent
Role
Permission
Module
Capability
Entity
Field
ValueObject
Enum
Relationship
Metric
Rule
Constraint
Command
Workflow
Policy
Event
Projection
View
Document
Knowledge
Skill
Tool
Integration
Version
Migration
AuditRecord
BusinessQueryIR
BusinessCommandIR
TaskContract
ResultContract
```

For each object we should specify:

```text
identity
fields
types
relationships
versioning
validation
authorization
serialization
AI exposure
UI generation
database generation
migration behavior
provenance
```

That meta-model is the next true foundation of the platform.

---

# Appendix A — Hermes source map relevant to this platform

| Hermes subsystem | Current role | Recommended role in platform |
|---|---|---|
| `AIAgent` | Main agent orchestration | Agent runtime |
| `prompt_builder.py` / system prompt | Context assembly | Use, but keep business semantics mostly on-demand |
| Tool registry | Tool discovery/dispatch | Keep for runtime; expose narrow platform domain tools |
| Toolsets | Capability grouping | Align with platform capability scopes |
| `state.db` | Session/runtime persistence | Keep Hermes-owned |
| FTS5 session search | Historical conversation recall | Keep; not business truth |
| Profiles | Durable agent runtime environments | Runtime isolation primitive, not tenant |
| Memory | Small persistent agent memory | Non-authoritative agent memory |
| MemoryProvider | External memory abstraction | First-party tenant-aware memory adapter |
| Skills | Procedural knowledge | Generated/projected business procedures |
| `/learn` | Converts sources/procedures into skills | Controlled learning pipeline |
| Skill write approval | Protects skill mutation | Backstop for production learning |
| ContextEngine | Context compression abstraction | Potential business-aware context engine |
| Tool Search | Progressive tool-schema discovery | Essential at ERP scale |
| MCP | External tool protocol | Domain capability interface |
| Plugins | Extension mechanism | First-party Hermes integration layer |
| Hooks | Runtime interception/observability | Guardrails/telemetry bridge |
| Gateway | Messaging channels/routing | Reuse behind platform identity |
| Programmatic API | External agent access | ERP frontend transport / internal adapter |
| ACP | IDE agent protocol | Developer/customization workflows |
| Delegation | Child agents | Structured Task Contracts |
| Bot Mode | Persistent specialist agents | Agent-team runtime projection |
| Cron | Scheduled agent work | Projection of platform Automations |
| Event-triggered cron | Triggered agent work | Consume platform domain events |
| Document Extraction | Read common files into text | Ingestion helper |
| Dashboard plugins | Agent-runtime UI extension | Ops/admin/dev console |
| Credential pools | Provider credential rotation | Model infrastructure only |
| Terminal backends | Agent execution environments | Restricted to specialized agents |
| Trajectories | Agent traces/training | Future learning/evaluation pipeline |

---

# Appendix B — Current-source interpretation notes

## B.1 Rapid project evolution

Hermes is changing quickly. Official documentation is dynamically generated, and different pages can temporarily describe slightly different counts or command names around recently changed features.

Therefore:

```text
architecture = stable design contract
Hermes APIs = versioned integration contract
current docs = operational reference
moving main = development source, not production baseline
```

Pin a release and maintain a compatibility harness.

## B.2 Current stable release observed

The release page observed during the research session listed:

```text
Hermes Agent v0.21.3
Tag: v2026.9.14
Commit: 345cd2b
Release date: 2026-09-14
```

Use the exact release commit as the initial reproducible baseline, and upgrade only after the harness passes.

## B.3 Current repository license

The repository currently identifies Hermes as MIT licensed.

Always re-check the actual LICENSE file and dependency licenses for the exact version included in a commercial build.

---

# Appendix C — Reference architectural patterns from the earlier design work

The architecture consolidates these earlier principles:

```text
Let the AI understand the business;
let the deterministic platform do the computation.
```

```text
Business intent -> Business IR -> deterministic execution
```

```text
Read path:
User -> AI -> semantic intent -> Query IR -> compiler -> database -> structured result
```

```text
Write path:
User -> AI -> proposed command -> policy -> authorization -> validation -> transaction -> verification
```

```text
Schema evolution:
Business Model Version -> migration + API + UI + AI + permission updates
```

```text
Data model:
Current State + Immutable Business Events + Audit History
```

```text
Extension:
Capability definition -> database + API + UI + AI + workflow + permission
```

```text
AI safety:
probabilistic reasoning above
+
typed contract
+
deterministic validation below
```

---

# Appendix D — Project-level review checklist before implementation decisions are considered final

Before coding the core platform, confirm that the following are specified in executable form:

```text
[ ] Tenant isolation model
[ ] Identity model
[ ] Organization hierarchy
[ ] Agent model
[ ] Permission model
[ ] Business Model Kernel schema
[ ] Stable-ID policy
[ ] Entity grain semantics
[ ] Relationship metadata
[ ] Metric definition contract
[ ] Rule/constraint model
[ ] Command model
[ ] Workflow model
[ ] Policy model
[ ] Event model
[ ] Audit model
[ ] Version model
[ ] Migration model
[ ] Business Query IR
[ ] Business Command IR
[ ] Task Contract
[ ] Result Contract
[ ] Knowledge model
[ ] Memory scopes
[ ] Skill lifecycle
[ ] Hermes adapter boundary
[ ] Hermes profile strategy
[ ] Hermes session bridge
[ ] MCP domain API
[ ] Tool policy
[ ] Human approval model
[ ] Document ingestion/security
[ ] Analytics projection strategy
[ ] Event/outbox strategy
[ ] Durable workflow strategy
[ ] Observability model
[ ] Evaluation benchmark
[ ] Hermes version compatibility harness
[ ] Capability package format
[ ] Frontend model-builder lifecycle
```

The project should not rely on undocumented conventions for any item above.

---

# End state

The intended end state is a platform in which:

```text
A human describes a business capability.

Hermes helps design it.

The Business Model Kernel defines it.

The compiler materializes it.

The ERP frontend exposes it.

The AI learns how to use it.

The policy engine controls it.

The database executes it.

The event system records it.

The audit system explains it.

The version system preserves its history.
```

And the physical database can evolve beneath the same logical business model without forcing the AI to relearn what the business means.

**That is the architecture this project should now optimize toward.**
