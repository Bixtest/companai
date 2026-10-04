# Local-First AI Runtime, Model Management, and User Function Architecture
## Hermes + llama.cpp + Hybrid Cloud + Deterministic User Functions

**Design baseline:** 2026-10-03  
**Primary agent runtime:** Hermes Agent  
**Primary local inference candidate:** llama.cpp / `llama-server`  
**Secondary local-runtime compatibility:** Ollama and other OpenAI-compatible local servers  
**Core architectural objective:** make the platform fully capable of running locally on a VPS while allowing optional multi-model, multi-provider and hybrid operation, and progressively converting repeated AI work into deterministic user-created functionality.

---

# Executive summary

The platform should be deliberately designed around a **local-first, provider-neutral AI runtime**.

A customer installation should be capable of operating with:

```text
ERP / Business Platform
+
Hermes Agent
+
local model runtime
+
local model(s)
+
database
+
search / knowledge
+
MCP / domain tools
```

with no mandatory dependency on a cloud AI provider.

At the same time, the architecture should allow:

```text
local model
+
multiple local models
+
cloud APIs
+
multiple cloud suppliers
+
hybrid local/cloud routing
+
task-specific model selection
+
automatic fallback / escalation
```

without changing the business platform.

The central design decision is to introduce a **Model Runtime Abstraction** above llama.cpp/Ollama/cloud providers and a **Model Broker / Policy Layer** above that.

The second major decision is to make the user's concept of a reusable "function" a first-class platform primitive.

A user should be able to:

```text
1. Ask the AI to accomplish something.
2. Inspect the result.
3. Verify the result is correct.
4. Click "Save as Function".
5. The platform stores the validated business operation—not the returned data.
6. The function becomes a deterministic executable capability.
7. Future clicks bypass the LLM completely unless the function explicitly contains an AI step.
```

This transforms the platform from:

```text
AI answering repeated prompts
```

into:

```text
AI helps users build their own application.
```

Traditional ERP functionality is therefore no longer limited to what the vendor decided to ship as static modules. Repeated user-specific requirements can graduate from:

```text
natural-language request
        ↓
AI-generated operation
```

into:

```text
saved function
        ↓
direct deterministic execution
```

The AI remains available for novel requirements.

This creates a continuous progression:

```text
Novel request
      ↓
AI
      ↓
Validated business operation
      ↓
Saved Function
      ↓
Traditional deterministic application behavior
```

This document defines the recommended architecture for that system.

---

# Part I — Core architectural thesis

# 1. Make the platform small-model-first

The goal is not:

> "Build an ERP that requires the smartest available model."

The goal is:

> "Build a business platform whose structure makes intelligence inexpensive."

A conventional AI application may require the model to understand:

```text
database schema
business definitions
relationships
calculations
permissions
workflow state
documents
historical context
SQL
```

The proposed platform moves these responsibilities into deterministic systems.

The model mostly performs:

```text
intent interpretation
capability selection
entity resolution
Business IR generation
tool selection
reasoning around exceptions
natural-language communication
```

Therefore, a local small/medium model can handle a much larger portion of normal ERP work than would be possible if the model had to reason over the raw database directly.

---

# 2. Keep the model out of the certainty layer

Use:

> **AI for uncertainty; software for certainty.**

Examples of things that should normally be deterministic:

```text
VAT calculation
balance calculation
currency conversion
inventory availability
permission checks
workflow-state transitions
credit-limit validation
duplicate-invoice detection
date/fiscal-period resolution
aggregation
database writes
```

Examples of things that genuinely benefit from AI:

```text
"Which capability does the user want?"
"Which report should solve this question?"
"Why might revenue have fallen?"
"Which documents are relevant?"
"How should this unfamiliar request be decomposed?"
"How should the result be explained?"
```

This separation is the foundation of the local-first strategy.

---

# 3. Model intelligence should be treated as an interchangeable resource

Do not bind the application to:

```text
one model
one vendor
one inference engine
one API
```

Instead define:

```text
                 Model Runtime
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Local Models    Cloud APIs     Hybrid
        │              │              │
   llama.cpp        provider A    local → cloud
   Ollama           provider B    cloud → local
   other            provider C    fallback
```

The Business Platform knows only:

```text
reason
structured_output
tool_call
vision
embedding
summarize
classify
```

The Model Runtime decides how those capabilities are supplied.

---

# Part II — Hermes role in the model architecture

# 4. Hermes remains the agent runtime

Hermes already has:

```text
main model
auxiliary model slots
custom/self-hosted endpoints
local model support
Ollama support
llama.cpp support
tool calling
skills
memory
MCP
subagents
automation
provider switching
```

Current Hermes documentation explicitly supports local models through managed llama.cpp and custom endpoints, including Ollama, vLLM, SGLang, llama.cpp and other OpenAI-compatible servers. Hermes also supports independently configured main and auxiliary model slots; auxiliary work includes compression, vision, web summarization, approval scoring, MCP routing, session-title generation and skill search.

Therefore:

> **Use Hermes for agent-level model orchestration wherever its abstractions are already appropriate.**

Do not recreate its agent loop simply to add a model selector.

---

# 5. But add a platform-level Model Policy Layer

Hermes' model management is valuable, but the business platform needs one additional concept:

```text
Model Policy
```

The policy answers:

```text
Which model should perform this task?
```

based on factors such as:

```text
task type
risk
latency requirement
privacy
tenant policy
data classification
tool complexity
context size
vision requirement
cost ceiling
availability
hardware capacity
model capability
user preference
```

This allows three operating modes.

---

# 6. Mode A — Hermes-managed

Simplest deployment:

```text
Business Platform
        ↓
Hermes
        ↓
Hermes chooses configured model
```

Use when:

- operator wants simplicity
- agent workload is relatively homogeneous
- local deployment uses one main model plus auxiliary models
- Hermes' own model lifecycle is sufficient

---

# 7. Mode B — Policy-managed

The platform selects the model class:

```text
Business task
    ↓
Model Policy
    ↓
selected model
    ↓
Hermes
```

Example:

```text
simple lookup      → small local model
Business IR        → small/medium local model
complex analysis   → larger local model
schema design      → stronger model
vision             → vision-capable model
```

---

# 8. Mode C — Hybrid / adaptive

The platform can start locally and escalate only when required:

```text
local small model
       ↓
confidence / complexity check
       ↓
   ┌───┴────┐
   │        │
 sufficient  insufficient
   │        │
   ▼        ▼
 execute   stronger local
              │
              ▼
          cloud model
              │
              ▼
           fallback
```

This should be the long-term enterprise mode.

---

# Part III — The Model Runtime abstraction

# 9. ModelRuntime interface

Define a platform interface:

```text
ModelRuntime
```

with capabilities such as:

```text
chat()
structured_output()
tool_call()
embed()
vision()
rerank()
summarize()
classify()
```

Every implementation must conform to the same contract.

Possible implementations:

```text
LlamaCppRuntime
OllamaRuntime
OpenAICompatibleRuntime
AnthropicRuntime
OpenRouterRuntime
CustomRuntime
HybridRuntime
```

Hermes remains the agent orchestration layer above these.

---

# 10. Separate model capability from model identity

Never make the platform depend on:

```text
"Qwen-XYZ"
```

as a hard-coded semantic role.

Instead define:

```text
Capability:
    business_ir_generation

Required:
    structured_output
    tool_calling
    context >= 64K
    quality >= threshold
```

Then map candidate models to that capability.

---

# 11. Model Registry

Create a platform-owned registry containing:

```text
model_id
provider
runtime
model_family
version
quantization
context_length
vision
tool_calling
structured_output
embedding
reasoning
coding
languages
hardware_profile
memory_estimate
latency_profile
quality_profile
cost_profile
privacy_class
availability
status
```

A model can therefore be described by what it can actually do.

---

# 12. Model Profiles

Create deployment presets such as:

```text
Local Small
Local Standard
Local Large
Cloud Fast
Cloud Strong
Cloud Reasoning
Vision
Embedding
Reranker
```

The user sees:

```text
"Standard Local"
```

while the system knows which model/version/quantization currently implements it.

---

# 13. Never silently change the model behind a deterministic Function

This is critical.

An ordinary AI conversation may change models.

A saved deterministic Function should not depend on model inference.

If a function contains an optional AI sub-step, then:

```text
function version
+
AI model policy/version
```

must be recorded.

Otherwise:

```text
same function
+
different model
=
different behavior
```

which defeats the purpose of deterministic functionality.

---

# Part IV — Local inference with llama.cpp

# 14. llama.cpp is an excellent core local engine

Current llama.cpp `llama-server` provides an OpenAI-compatible API and Docker images, including server images for normal Linux deployment and GPU-specific images.

Current server capabilities include:

```text
OpenAI-compatible endpoints
multiple concurrent slots
metrics
model router mode
dynamic model loading/unloading
model presets
sleep-on-idle
structured outputs / grammar mechanisms
tool calling
speculative decoding
```

Its Docker documentation includes server images for CPU and GPU variants including CUDA, ROCm, Vulkan, Intel and others.

This makes it suitable for embedding into the platform's Docker stack.

---

# 15. Recommended Docker topology

A typical single-VPS installation should look like:

```text
docker compose
│
├── frontend
├── platform-api
├── business-engine
├── hermes
├── llama-server
├── postgres
├── search
├── object-storage
├── worker
└── reverse-proxy
```

The AI-specific portion:

```text
                 HERMES
                    │
                    ▼
              Model Runtime
                    │
                    ▼
              llama-server
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Model A   Model B    Model C
```

Model files should live on a persistent host-mounted volume or dedicated model volume.

---

# 16. Don't make every model container permanent

This creates unnecessary RAM/VRAM pressure.

Use dynamic loading/unloading where appropriate.

Current llama-server router mode can expose multiple models behind one API endpoint and dynamically load/unload model instances.

The router also supports:

```text
models directory
model cache
model presets
maximum simultaneously loaded models
automatic loading
```

This is extremely useful for our architecture.

---

# 17. Use model router mode carefully

Router mode is attractive:

```text
platform
   ↓
one llama-server endpoint
   ↓
requested model
   ↓
model loaded if needed
```

But physical resources still matter.

Each loaded model consumes:

```text
weights
KV cache
runtime buffers
other model-specific memory
```

Therefore:

```text
models_max
+
idle timeout
+
resource admission
```

must be controlled.

Do not assume "many model choices" means "many models simultaneously loaded."

---

# 18. Sleep-on-idle is valuable on small VPS deployments

llama-server supports sleep mode that unloads the model and associated memory, including KV cache, after inactivity and reloads when another task arrives.

This is ideal for a low-utilization business installation:

```text
no AI workload
    ↓
model sleeping
    ↓
minimal RAM/VRAM
    ↓
request
    ↓
model wakes
```

The tradeoff is cold-start latency.

---

# 19. Local model startup policy

Use:

```text
warm primary model
+
cold secondary models
```

rather than keeping everything warm.

Example:

```text
primary small model → always warm
complex model        → load on demand
vision model         → load on demand
coding model         → load on demand
```

---

# 20. Context is the hidden local-model cost

Hermes currently requires at least a 64K-token context window for supported operation.

This is important even if the model itself is small because context/KV-cache memory can become substantial.

Therefore the platform should optimize:

```text
semantic retrieval
tool retrieval
skill progressive disclosure
compact Business IR
result aggregation
context compaction
```

rather than simply buying a larger model.

---

# 21. Context strategy

Never send:

```text
entire ERP schema
all business documents
all skills
all historical messages
raw database dumps
```

Instead:

```text
stable agent contract
+
relevant semantic objects
+
relevant skill
+
relevant tool definitions
+
small query result
+
task history
```

This directly improves local feasibility.

---

# 22. llama.cpp structured output is strategically important

Use schema-constrained generation for:

```text
Business Query IR
Business Command IR
entity extraction
classification
routing decisions
function definitions
schema proposals
```

The model should generate:

```json
{
  "command": "approve_purchase_order",
  "purchase_order_id": "po_1042"
}
```

under an enforced schema rather than unconstrained prose.

llama.cpp provides JSON-schema/grammar mechanisms for constrained outputs and its server supports the relevant API mechanisms.

---

# 23. Tool calling

Tool calls should be business-domain calls.

Example:

```text
get_customer()
search_invoice()
get_metric()
approve_purchase_order()
```

not:

```text
execute_sql()
```

The local model therefore operates against a compact business tool vocabulary.

---

# 24. Speculative decoding

Use speculative decoding where it materially improves latency.

llama.cpp supports multiple speculative strategies including:

```text
draft model
EAGLE-3
MTP
n-gram methods
```

This can allow:

```text
small draft model
+
larger target model
```

to achieve better local generation speed when the draft predicts tokens the target commonly accepts.

This is particularly relevant for local deployments where latency matters.

---

# 25. Draft model should be treated as infrastructure, not business logic

The user should not need to know about it.

Example:

```text
User:
asks normal request

Platform:
Qwen-like 32B target
+
small draft model

```

The user experiences one model.

The runtime optimizes execution.

---

# Part V — Model selection architecture

# 26. We should not try to decide everything with an LLM

Model routing itself should mostly be deterministic.

Use:

```text
Task Classifier
+
Model Capability Registry
+
Policy Engine
+
Resource Manager
```

The classifier may use a small model.

The final selection should obey policy.

---

# 27. Task taxonomy

Create a platform task taxonomy:

```text
T0 — UI intent
T1 — retrieval
T2 — entity/value resolution
T3 — Business Query IR
T4 — Business Command IR
T5 — explanation
T6 — routine workflow
T7 — document extraction
T8 — multimodal
T9 — complex analysis
T10 — schema/capability design
T11 — developer/code task
T12 — agent planning
```

Each task can declare:

```text
minimum quality
maximum latency
privacy
context
tool support
risk
```

---

# 28. Example policy

```yaml
task: business_query_ir

required:
  structured_output: true
  tool_calling: true
  context: 64k

preferred:
  locality: local
  latency: low
  model_size: small_medium

fallback:
  - local_large
  - approved_cloud_reasoning
```

---

# 29. Confidence is not enough

Do not use:

```text
model says it is 95% confident
```

as the sole escalation mechanism.

Instead use structural validation:

```text
IR validates?
entity exists?
fields exist?
relationships valid?
permission valid?
metric valid?
policy valid?
```

If validation fails:

```text
repair / retry / escalate
```

rather than trusting the model's confidence score.

---

# 30. Escalation triggers

Escalate to a stronger model when:

```text
semantic ambiguity persists
complex planning is required
schema extension is requested
document interpretation is difficult
multiple modules conflict
tool-call recovery loops exceed threshold
validator failure repeats
vision reasoning is required
user explicitly requests deep analysis
```

Do not escalate simply because the response is long.

---

# 31. Model router output

The router should emit a structured decision:

```json
{
  "task": "business_query_ir",
  "selected_runtime": "llamacpp",
  "selected_model": "local-standard",
  "reason": "task policy",
  "fallback_chain": [
    "local-large",
    "approved-cloud-reasoning"
  ],
  "privacy": "tenant-local-only"
}
```

This is auditable.

---

# 32. Tenant-specific model policy

Enterprise tenants should be able to set:

```text
local only
local preferred
cloud allowed
approved providers only
specific models only
EU-region only
no data leaving VPS
```

The Model Broker enforces this before any request reaches a provider.

---

# 33. Model routing must respect data classification

Example:

```text
Public
    cloud allowed

Internal
    approved cloud / local

Confidential
    local preferred

Highly Confidential
    local only
```

The classification comes from the platform.

The LLM does not decide.

---

# Part VI — Multiple local models

# 34. Use a model family rather than one "magic" model

A local stack can contain:

```text
general model
reasoning model
coding/model-development model
vision model
embedding model
reranker
small classifier/router
```

Not all need to be active simultaneously.

---

# 35. The standard local bundle

The distribution should ship with a conservative baseline:

```text
Agent Model
+
Auxiliary Model
+
Embedding Model
```

The specific model names should be swappable.

A model catalog can later list validated choices for:

```text
8 GB
16 GB
32 GB
64 GB
128 GB+
```

hardware classes.

---

# 36. Do not hard-code a model forever

The platform should have:

```text
validated model catalog
```

with:

```text
model
quant
runtime compatibility
recommended hardware
quality benchmark
tool benchmark
Business IR benchmark
latency benchmark
memory profile
```

The catalog can evolve independently of the Business Model Kernel.

---

# Part VII — Ollama's place

# 37. Ollama should remain a supported runtime

Ollama is excellent for:

```text
easy installation
developer machines
quick experiments
small deployments
local user-managed models
```

Hermes already supports Ollama through its custom OpenAI-compatible endpoint approach.

Ollama supports structured outputs and tool calling.

---

# 38. Product recommendation

For the production appliance image:

> **Use llama.cpp as the primary embedded inference engine.**

For compatibility:

> **Support Ollama as an alternate local runtime.**

For the application architecture:

> **Do not expose either as the business-facing abstraction.**

The application talks to:

```text
ModelRuntime
```

---

# Part VIII — The critical new concept: User Functions

# 39. What a User Function should mean

A User Function is:

> **A validated, reusable business operation created by the user with AI assistance and executable without AI once published.**

It is not a code function in the first conceptual model.

It is closer to:

```text
saved business capability
```

presented as a first-class button/action/report/operation in the ERP interface.

---

# 40. Your idea is architecturally excellent—but save the right thing

Do NOT save only:

```text
raw SQL
```

Do NOT save only:

```text
the natural-language prompt
```

Do NOT save:

```text
the returned data
```

Save the **validated logical operation**.

Recommended hierarchy:

```text
User request
     ↓
AI-generated Business IR
     ↓
validated Business IR
     ↓
compiled execution plan
     ↓
validated Function
```

The Function should preserve the logical business operation and the validated execution dependency graph.

---

# 41. Function artifact

A deterministic User Function should contain:

```text
function_id
tenant_id
name
description
icon / UI metadata

operation_type
business_ir
parameter_schema

referenced entities
referenced fields
referenced metrics
referenced commands
referenced workflows
required permissions

business_model_version
dependency_versions
compiler_version

execution_policy
confirmation_policy

result_schema
presentation_definition

audit_policy
created_by
verified_by
created_at
published_at

version
status
```

Optional:

```text
compiled plan hash
query/execution plan fingerprint
migration compatibility metadata
```

---

# 42. Why not save only the compiled SQL/query?

Because schema evolution exists.

Suppose:

```text
Invoice table
```

gets reorganized.

The logical Function:

```text
"show overdue German customers above €10,000"
```

should remain valid if the Business Model still supports the same semantics.

The compiler can regenerate the physical query.

Therefore:

```text
Business IR
```

is the durable asset.

Compiled SQL is a cache/derivative artifact.

---

# 43. But preserve the compiled execution artifact too

For audit and performance:

```text
Function
  ├── canonical Business IR
  ├── compiler output
  ├── dependency versions
  └── execution fingerprint
```

The platform can recompile when required.

This gives us:

```text
semantic durability
+
physical efficiency
+
auditability
```

---

# 44. The Function lifecycle

```text
DRAFT
  ↓
GENERATED
  ↓
VALIDATED
  ↓
VERIFIED
  ↓
PUBLISHED
  ↓
ACTIVE
  ↓
DEPRECATED
  ↓
ARCHIVED
```

---

# 45. Creation flow

User asks:

> "Every morning show me customers in Germany whose invoices are over 30 days overdue and whose outstanding balance is above €10,000."

AI performs:

```text
intent interpretation
entity resolution
metric resolution
Business IR generation
```

Platform executes and returns results.

User verifies.

Then:

```text
Save as Function
```

UI asks for:

```text
Function name
parameters
placement
permissions
schedule optional
```

The platform stores the validated operation.

---

# 46. Function verification

Verification should not be:

> "The user saw something that looked right."

Use objective checks where possible:

```text
IR valid
entities valid
fields valid
metrics valid
relationships valid
authorization valid
tenant scope valid
query plan valid
sample result valid
```

For mutation functions:

```text
preconditions
policy
dry run
impact
postconditions
```

---

# 47. The most important property: zero-AI execution

For a pure deterministic Function:

```text
User clicks button
        ↓
Platform resolves parameters
        ↓
Authorization
        ↓
Function execution
        ↓
Database / business engine
        ↓
Result
```

There is no LLM call.

That means:

```text
no model latency
no token cost
no hallucination at runtime
no prompt interpretation
no model version drift
```

This is the exact advantage you described.

---

# 48. It becomes indistinguishable from traditional ERP functionality

Once published:

```text
[Overdue Customers]
```

is just a normal ERP button.

Internally it might have originally been created by an AI interaction.

The user does not need to know.

The architecture has effectively generated a new application feature.

That is the bridge between:

```text
AI-native
```

and:

```text
traditional deterministic software
```

---

# 49. The platform becomes self-programming without asking the user to program

Traditional:

```text
developer
→ writes feature
→ deploy
```

Your platform:

```text
advanced user
→ describes desired outcome
→ AI constructs operation
→ user validates
→ publish Function
```

That is not merely "AI assistance."

It is:

> **user-driven application composition.**

---

# Part IX — Function types

# 50. Type 1: Deterministic Query Function

Examples:

```text
My overdue customers
Today's open orders
Unpaid supplier invoices
Monthly sales by country
```

Execution:

```text
Business Query IR
→ deterministic query
```

No AI at runtime.

---

# 51. Type 2: Deterministic Command Function

Examples:

```text
Create standard purchase order
Approve a predefined class of request
Generate invoice from order
Close a recurring monthly task
```

Execution:

```text
Business Command
→ policy
→ transaction
```

No AI at runtime.

---

# 52. Type 3: Parameterized Report Function

Example:

```text
Sales performance

Inputs:
  date range
  organization
  country
```

Click:

```text
form
→ query
→ result
```

No AI.

---

# 53. Type 4: Workflow Function

Example:

```text
Start month-end close
```

The function launches a deterministic workflow.

No AI required unless a workflow step explicitly calls an agent.

---

# 54. Type 5: Composite deterministic Function

A function can contain multiple deterministic steps:

```text
Get unpaid invoices
→ group by supplier
→ calculate exposure
→ create review table
→ save result
```

Still no AI.

---

# 55. Type 6: Agent Function

Some user-created functions may deliberately contain AI.

Example:

```text
"Review these 50 contracts and summarize unusual clauses."
```

That is not deterministic in the same sense.

The platform should clearly label it:

```text
AI Function
```

and preserve:

```text model policy
prompt/Business IR
skill version
knowledge sources
```

Such a function should not be presented as equivalent to deterministic ERP functionality.

---

# Part X — Function parameterization

# 56. Avoid saving dynamic values as constants

Suppose the original prompt says:

> Show customers in Germany with balance above €10,000.

Do not necessarily save:

```text
country = DE
balance > 10000
```

as fixed values.

The platform should infer parameter opportunities:

```text
country
minimum_balance
```

Then the saved function UI becomes:

```text
Country: [Germany ▼]
Minimum balance: [€10,000]
```

The user can save defaults.

---

# 57. Parameters should be strongly typed

Example:

```yaml
parameters:
  country:
    type: Country
    default: DE

  minimum_balance:
    type: Money
    default:
      amount: 10000
      currency: EUR
```

This removes another area where AI would otherwise have to interpret values.

---

# 58. Context variables

Functions may reference deterministic runtime variables:

```text
current_user
current_tenant
current_organization
today
current_date
current_period
selected_customer
selected_record
current_currency
```

This makes functions feel like native ERP features.

---

# 59. Authorization happens every time

Even though the Function bypasses the LLM:

```text
click
→ authorization
→ execution
```

must still occur.

Never assume:

```text function created by user
=
permission forever
```

Permissions can change.

---

# 60. Tenant scope happens every time

Likewise:

```text function belongs to tenant A
```

does not mean a user can copy it to tenant B without revalidation.

Tenant binding is explicit.

---

# Part XI — Function UX

# 61. Function creation should feel like "teach the ERP"

The interface might display:

```text
AI WORKSPACE

You:
Show overdue German customers above €10k.

AI:
[results]

✓ Verify

[ Save as Function ]

Function name:
Overdue German Customers

Parameters:
Country: Germany
Minimum balance: €10,000

Destination:
Finance → Accounts Receivable

Permissions:
Finance Viewer

[Publish]
```

This creates a psychological shift:

> The user is teaching the ERP a new capability.

---

# 62. Function library

The ERP can show:

```text
My Functions
Team Functions
Organization Functions
System Functions
AI Functions
```

Each has:

```text
owner
version
status
last used
permissions
dependencies
AI-free / AI-assisted badge
```

---

# 63. Promote common Functions into modules

This is an important long-term feature.

Suppose many tenants create:

```text
"Supplier risk overview"
```

The vendor may recognize the common pattern.

The platform can later ship:

```text
Supplier Risk module
```

The evolution becomes:

```text
user function
→ repeated pattern
→ validated canonical capability
→ vendor module
```

This creates a feedback loop between user customization and product evolution.

---

# Part XII — Function governance

# 64. Function scope hierarchy

Functions can belong to:

```text
Personal
Team
Organization
Tenant
Platform
```

with inheritance and permissions.

---

# 65. Function versioning

Every published Function gets:

```text
v1
v2
v3
```

A change does not silently mutate the behavior of historical versions.

---

# 66. Dependency tracking

A Function must know:

```text
entities
fields
metrics
commands
workflows
policies
Business Model version
```

When one changes, the platform can say:

```text
Function "Overdue Customers"
is affected by
metric_overdue v2
```

and trigger:

```text
compatibility check
```

before automatically updating.

---

# 67. Function compiler compatibility

When the Business Model changes:

```text
old Function
     ↓
dependency analysis
     ↓
compatible?
  ┌──┴──┐
 yes    no
  │      │
 recompile  migration proposal
```

---

# 68. Never silently rewrite high-impact Functions

For:

```text
payments
payroll
accounting
tax
inventory transfers
banking
```

changes should require explicit review.

---

# Part XIII — Function security

# 69. Function capabilities are narrower than raw AI

A function should execute only operations declared in its artifact.

No:

```text
"hidden SQL"
```

No:

```text
"execute arbitrary tool"
```

No:

```text
"call arbitrary MCP server"
```

unless the function type explicitly and securely declares it.

---

# 70. Function execution should have a risk class

Example:

```text
R0 — read-only
R1 — derived report
R2 — reversible business command
R3 — approval-impacting command
R4 — financial / irreversible
```

Execution policy can differ.

---

# 71. Function auditing

Every invocation records:

```text
function_id
version
user
tenant
parameters
authorization decision
execution id
result summary
affected records
business model version
timestamp
```

---

# Part XIV — How AI and Functions complement each other

# 72. Normal operation

The system should always support:

```text
known requirement
    ↓
Function
```

and:

```text
new requirement
    ↓
AI
```

---

# 73. The usage ladder

This is the central product loop:

```text
                 USER REQUEST
                      │
             ┌────────┴────────┐
             │                 │
       existing Function     new request
             │                 │
             ▼                 ▼
       deterministic          AI
          execution            │
                               ▼
                         Business IR
                               │
                         validation
                               │
                               ▼
                         result / action
                               │
                         user verifies
                               │
                        Save as Function
                               │
                               ▼
                       deterministic use
```

This means the platform gets progressively more efficient as the user teaches it their business.

---

# 74. This creates a self-optimizing application surface

Over time:

```text
Day 1
Mostly AI

Day 30
AI + many Functions

Day 365
Core workflows + many user-built Functions + AI for exceptions/new requirements
```

The AI workload can actually decline as the customer's own application becomes richer.

That is a very unusual property for an AI product.

---

# 75. AI should be the exploration layer

The AI is where the user asks:

```text
"Can you show me..."
"Can you analyze..."
"Can we create..."
"Why is..."
"How do I..."
```

Functions become the **operational layer**:

```text
"Run this."
"Open this."
"Approve this."
"Show me my standard report."
```

---

# Part XV — Recommended model hierarchy for this product

# 76. Local router model

Tiny/small model.

Purpose:

```text
intent routing
task classification
function lookup
simple entity resolution
```

It should be extremely cheap.

---

# 77. Local worker model

Small/medium model.

Purpose:

```text
Business IR
tool selection
routine agent workflows
normal ERP reasoning
```

This should perform most requests.

---

# 78. Local specialist model

Larger model.

Purpose:

```text
complex analysis
schema design
long-form document reasoning
difficult multi-step investigation
```

Loaded on demand.

---

# 79. Cloud escalation model

Only when:

```text
policy permits
local quality insufficient
task complexity warrants it
user requests it
```

The platform should redact/minimize data according to tenant policy where possible.

---

# 80. Auxiliary model

Hermes already supports separate auxiliary model slots.

Use them for:

```text
context compression
vision
web summarization
approval scoring
MCP routing
skill search
session titles
```

rather than wasting the main model on every auxiliary operation.

Current Hermes documentation explicitly describes these independent auxiliary slots.

---

# 81. Embedding model

Treat embeddings as their own runtime.

No need for a large general-purpose reasoning model.

---

# 82. Reranker

Where semantic search quality benefits, use a small specialized reranker.

Again:

```text
specialized cheap model
```

rather than a general frontier model.

---

# Part XVI — Resource management on the VPS

# 83. Think in resources, not model names

The scheduler should track:

```text
RAM
VRAM
CPU
GPU
KV cache budget
context requirement
model weight size
concurrency
latency
```

---

# 84. Model Admission Controller

Before loading a model:

```text
available resources?
context requirement?
other models loaded?
tenant priority?
concurrency?
```

Then:

```text
load
queue
evict
sleep
fallback
```

---

# 85. Model priority tiers

```text
P0 — primary
P1 — interactive secondary
P2 — batch
P3 — background
```

If VRAM is constrained:

```text
P0 stays warm
P1 may evict
P2/P3 sleep
```

---

# 86. Per-tenant resource policy

A large enterprise tenant may be allowed:

```text
dedicated model
```

A small tenant may use:

```text
shared local model
```

The logical platform remains the same.

---

# 87. Concurrency

Do not maximize concurrent model count blindly.

A few high-quality requests with sufficient context can be better than many competing requests starving each other.

Use a queue:

```text
interactive
high priority
normal
background
batch
```

---

# Part XVII — Data privacy and provider routing

# 88. Provider policy must be deterministic

Example:

```yaml
financial_data:
  allowed:
    - local

employee_data:
  allowed:
    - local
    - approved_eu_provider

public_information:
  allowed:
    - any_approved_provider
```

The model cannot bypass this.

---

# 89. Cloud calls should be explicit events

Whenever data leaves the local runtime:

```text
cloud_inference_requested
```

should be recorded.

Capture:

```text
provider
model
policy
data classification
tenant
purpose
timestamp
```

---

# 90. Data minimization

Do not send the entire database or entire document to a cloud model.

Use:

```text
retrieval
redaction
aggregation
structured facts
```

first.

---

# 91. Hybrid mode should still feel local

A user's default experience should be:

```text
local model
local database
local knowledge
```

Cloud escalation happens behind the scenes only when permitted.

---

# Part XVIII — Deterministic Function engine

# 92. Function Engine

Create a dedicated service:

```text
Function Engine
```

with:

```text
register
validate
publish
execute
version
deprecate
recompile
inspect
audit
```

---

# 93. Function execution pipeline

```text
Button
 ↓
Function lookup
 ↓
Version resolution
 ↓
Parameter validation
 ↓
Identity
 ↓
Authorization
 ↓
Policy
 ↓
Business IR
 ↓
Compiler / Domain Engine
 ↓
Transaction / Query
 ↓
Verification
 ↓
Presentation
 ↓
Audit
```

No Hermes required.

No AI required.

---

# 94. Function result rendering

The function definition should contain presentation metadata:

```text
table
chart
metric card
form
record list
timeline
dashboard widget
```

Therefore:

```text
function
```

is both:

```text
behavior
+
UI affordance
```

---

# 95. Function placement

A Function can appear in:

```text
sidebar
module page
dashboard
command bar
record page
favorites
quick actions
scheduled jobs
```

This turns dynamically created functions into native product UX.

---

# 96. Scheduled Functions

A deterministic Function can be scheduled:

```text
daily
weekly
monthly
event-triggered
```

No AI required.

Hermes can be invoked only if the function itself requires an agent step.

---

# Part XIX — "AI Function" vs "Deterministic Function"

# 97. Make this distinction visible

Every saved function has:

```text
execution:
    deterministic
```

or:

```text
execution:
    AI-assisted
```

The UI should display the difference.

Example:

```text
[Overdue Customers]
✓ Deterministic

[Contract Risk Summary]
✦ AI-assisted
```

---

# 98. Why this matters

A user should know:

```text
Will this run exactly according to a validated business operation?
```

versus:

```text
Will this ask an AI to interpret/analyze again?
```

Trust improves when the distinction is explicit.

---

# Part XX — Function discovery and reuse

# 99. Function search

The platform itself should make saved functions discoverable.

The AI can answer:

> "You already have a function called Overdue Customers."

But clicking the function should bypass AI.

Thus:

```text
AI
 ↓
suggests existing function
```

then:

```text
user clicks
 ↓
Function Engine
```

---

# 100. Function recommendations

The platform can observe repeated requests:

```text
same/similar intent
many times
```

and offer:

> Save this as a Function?

This suggestion can be generated by the agent or deterministic usage analytics.

---

# 101. Automatic function candidates

Do not automatically publish.

Instead:

```text
repeated pattern detected
       ↓
candidate function
       ↓
user review
       ↓
publish
```

---

# Part XXI — Model management UI

# 102. Admin model screen

The ERP should have:

```text
Settings
 → AI
   → Models
```

showing:

```text
Model
Provider
Runtime
Context
Quantization
VRAM estimate
Capabilities
Status
Warm/Sleeping
Latency
Usage
```

---

# 103. Local model screen

```text
Local Models

Installed:
  Local Small
  Local Standard

Available:
  Model A
  Model B
  Model C

Hardware:
  GPU: ...
  VRAM: ...
  RAM: ...

Current:
  Primary → Local Standard
  Auxiliary → Local Small
```

---

# 104. Provider screen

```text
Providers

✓ Local llama.cpp
✓ Ollama
✓ OpenRouter
✓ Provider X
✓ Provider Y
```

Each provider can have:

```text
credentials
allowed models
priority
privacy class
rate limits
```

---

# 105. Routing screen

A graphical policy editor:

```text
Task                         Primary       Fallback
Business IR                  Local Small   Local Large
Complex Analysis             Local Large   Cloud Strong
Vision                       Local Vision  Cloud Vision
Embeddings                   Local Embed   -
Public Research              Cloud Fast    Local
Highly Confidential          Local Large   Local Small
```

This should be declarative.

---

# Part XXII — Recommended runtime policy

# 106. Default policy

For the default appliance:

```text
1. Local inference first.
2. Local small/medium model for normal work.
3. Local auxiliary model for side tasks where practical.
4. Larger local model on demand.
5. Cloud disabled unless explicitly configured.
```

This satisfies the self-sustainable requirement.

---

# 107. Hybrid enterprise policy

```text
1. Attempt local.
2. Validate output.
3. Escalate only if policy allows.
4. Use cloud for difficult tasks.
5. Return result through the same Business Gateway.
```

---

# 108. Cloud-only policy

Some deployments may intentionally use:

```text
Hermes
+
cloud model only
```

The platform remains unchanged.

---

# Part XXIII — Hardware tiers

# 109. Minimal VPS

Target:

```text
CPU inference
small quantized model
low concurrency
64K context if feasible
```

Good for:

```text
basic ERP interaction
function execution
simple Business IR
```

---

# 110. Small GPU VPS

Target:

```text
8–16 GB GPU
small/medium quantized model
```

Good for:

```text
normal interactive agent work
```

Hermes' current local-model guidance says 8 GB+ GPU can comfortably run its small catalog models and 16 GB+ supports 27–35B-class models at high quality, though actual fit is hardware/model/context dependent.

---

# 111. Dedicated enterprise GPU

Target:

```text
24–80+ GB VRAM
large local model
multiple model instances
```

Use:

```text
router
resource manager
warm primary
specialists on demand
```

---

# Part XXIV — Docker deployment strategy

# 112. Default compose stack

```yaml
services:

  frontend:
    ...

  api:
    ...

  business-engine:
    ...

  hermes:
    ...

  inference:
    image: llama.cpp

  postgres:
    ...

  search:
    ...

  object-store:
    ...

  worker:
    ...
```

The exact image variants should be hardware-specific.

llama.cpp currently provides server Docker images for standard Linux as well as CUDA, CUDA 13, ROCm, Vulkan, Intel and other backends.

---

# 113. Model storage

Use persistent storage:

```text
/opt/platform/models/
```

or a dedicated volume.

Never put large models inside the immutable application image.

---

# 114. Model downloads

Model installation should be:

```text
catalog
 ↓
compatibility check
 ↓
download
 ↓
checksum / integrity
 ↓
register
 ↓
test
 ↓
activate
```

Do not blindly download arbitrary model files into production.

---

# 115. Model validation

Before activation:

```text
loads
context works
structured output works
tool calling works
latency measured
memory measured
business IR benchmark passes
```

---

# Part XXV — Model benchmark suite

# 116. Build a proprietary business benchmark

The benchmark must measure:

```text
intent classification
entity resolution
Business IR validity
tool selection
command construction
schema navigation
permission-aware planning
multistep reasoning
function generation
function repair
```

---

# 117. Separate model quality from platform quality

A model failing to produce the correct operation does not automatically mean the platform failed.

Record:

```text
model
prompt
semantic context
IR
validator result
repair attempts
final result
```

This lets you identify whether the issue came from:

```text
model
semantic retrieval
IR schema
tool descriptions
business model
compiler
policy
```

---

# 118. Model leaderboard for the platform

Do not rank models by generic benchmark scores alone.

Build internal capability scores:

```text
Business IR
ERP tool use
function generation
schema customization
document reasoning
local latency
memory
```

The platform can publish:

```text
Validated for Local Small
Validated for Local Standard
Validated for Local Complex
```

without coupling the UI to a specific permanent model winner.

---

# Part XXVI — Function evaluation suite

# 119. Every Function should be testable

A Function artifact should have:

```text
input fixtures
expected schema
expected invariants
permission cases
edge cases
```

---

# 120. Read Function test

```text
Given tenant fixture X
Given user Y
Given parameters Z

Expected:
  records / aggregate
  grain
  authorization
```

---

# 121. Write Function test

```text
Given state X
Execute command
Expected state Y
Expected events
Expected audit
```

---

# 122. Migration regression

When a business model changes:

```text
function regression suite
```

runs automatically.

---

# Part XXVII — Function lifecycle and application evolution

# 123. Traditional ERP evolution

Historically:

```text
vendor identifies requirement
 ↓
developer builds feature
 ↓
release
```

---

# 124. New evolution loop

```text
user encounters need
 ↓
AI solves it
 ↓
user validates
 ↓
save as Function
 ↓
team uses it
 ↓
organization standardizes it
 ↓
platform may eventually promote it to a canonical capability
```

This produces a continuously evolving application surface.

---

# 125. Platform core remains controlled

This does not mean:

```text
everything becomes arbitrary user customization
```

The core Business Model Kernel remains governed.

Functions extend its use without redefining its invariants.

---

# Part XXVIII — Important distinction: Function vs Skill

# 126. Skill

```text
How an agent performs a task.
```

Lives in Hermes procedural memory/runtime projection.

---

# 127. Function

```text
What deterministic operation the application executes.
```

Lives in the Business Platform.

---

# 128. Example

Skill:

```text
"How to investigate overdue customers."
```

Function:

```text
"Overdue German Customers > €10,000."
```

The skill requires intelligence.

The function does not.

---

# 129. AI can create both

One user request may produce:

```text
AI
 ├── Skill proposal
 └── Function proposal
```

But they are governed separately.

---

# Part XXIX — Important distinction: Function vs Workflow

# 130. Function

A reusable business operation.

```text
Get report
Create PO
List customers
```

---

# 131. Workflow

A stateful business process.

```text
Submit
→ Review
→ Approve
→ Execute
→ Close
```

A Function can:

```text
invoke a workflow
```

but it should not replace the workflow engine.

---

# Part XXX — The final combined architecture

# 132. Full stack

```text
                           USER
                             │
                             ▼
                    ┌──────────────────┐
                    │    ERP FRONT     │
                    │                  │
                    │ AI Workspace     │
                    │ Functions        │
                    │ Dashboards       │
                    │ Model Admin      │
                    │ Model Builder    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   PLATFORM API   │
                    └────────┬─────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
       Function Engine   Agent Gateway    Direct ERP UI
             │               │
             │               ▼
             │            HERMES
             │               │
             │       ┌───────┼────────┐
             │       ▼       ▼        ▼
             │     Skills  Memory    MCP
             │               │
             │               ▼
             │        Model Runtime
             │               │
             │      ┌────────┼─────────┐
             │      ▼        ▼         ▼
             │   llama.cpp  Ollama   Cloud
             │      │
             │   Model Router
             │      │
             │  ┌───┼───────────┐
             │  ▼   ▼           ▼
             │ small standard  large
             │ model  model   specialist
             │
             ▼
       Business Model Kernel
             │
   ┌─────────┼─────────┐
   ▼         ▼         ▼
 QUERY     COMMAND   WORKFLOW
   │         │         │
   └─────────┼─────────┘
             ▼
       DATA / EVENT PLANE
             │
      ┌──────┼───────┐
      ▼      ▼       ▼
   Postgres Events  Analytics
```

---

# Part XXXI — The fundamental economic loop

The architecture has an important emergent property:

```text
New requirement
    ↓
AI cost
    ↓
validated solution
    ↓
saved Function
    ↓
future requests become near-zero AI cost
```

Therefore:

> **The more the customer uses the AI to customize the platform, the more of their recurring workload can become deterministic.**

This is the opposite of an architecture that permanently sends every interaction to an expensive model.

---

# Part XXXII — What should happen on every request

## 133. Request decision tree

```text
User request
    │
    ▼
Is there an existing Function?
    │
   ┌┴──────────────┐
  YES              NO
   │                │
   ▼                ▼
Function Engine    Hermes
   │                │
   │          Is this a simple/
   │          known capability?
   │                │
   │                ▼
   │           local model
   │                │
   │          validation succeeds?
   │          ┌─────┴─────┐
   │         YES          NO
   │          │            │
   │          ▼            ▼
   │       execute      retry/repair
   │                       │
   │                    still fails?
   │                    ┌────┴────┐
   │                   NO         YES
   │                    │          │
   │                 execute     escalate
   │                               │
   │                         policy permits?
   │                          ┌────┴────┐
   │                         YES        NO
   │                          │          │
   │                      stronger     explain
   │                       model       limitation
   │
   ▼
verified result
```

---

# Part XXXIII — The architecture's defining feedback loop

The platform should learn from repeated usage without turning learning into uncontrolled business mutation.

```text
User behavior
      ↓
Repeated pattern
      ↓
Function candidate
      ↓
Validation
      ↓
User approval
      ↓
Published Function
      ↓
Usage telemetry
      ↓
Improvement candidate
```

This is controlled application evolution.

---

# Part XXXIV — Non-negotiable invariants

```text
1. Local inference must be a first-class production mode.

2. No single cloud provider is required.

3. llama.cpp should be supported as a primary local inference engine.

4. Ollama should remain a supported local runtime.

5. The application must depend on ModelRuntime, not llama.cpp/Ollama APIs directly.

6. Hermes remains the agent runtime.

7. Model selection may be handled by Hermes, platform policy, or a hybrid policy.

8. Model routing must respect tenant privacy and resource policy.

9. The Business Model Kernel remains the semantic source of truth.

10. The LLM must generate Business IR / commands, not arbitrary business SQL.

11. A deterministic Function must not call an LLM at runtime.

12. A deterministic Function stores the validated logical business operation.

13. Compiled SQL/query plans are derivatives, not the semantic source of truth.

14. Every Function is versioned.

15. Every Function has dependency metadata.

16. Every Function rechecks authorization at execution.

17. Every Function respects tenant boundaries.

18. High-risk Functions have stronger publication and execution policies.

19. AI Functions must be explicitly distinguished from deterministic Functions.

20. Skills and Functions are different architectural objects.

21. Skills describe procedures; Functions execute application behavior.

22. Hermes memory is not business truth.

23. Hermes state.db is not ERP transaction state.

24. Hermes profiles are not tenants.

25. Durable workflow state remains outside the agent runtime.

26. Cloud escalation is policy-controlled.

27. Model activation must account for RAM, VRAM and context/KV-cache cost.

28. The platform should prefer a small local model for normal work.

29. Large models should be used by exception or explicit policy.

30. Every model used in production should be benchmarked against the platform's own business task suite.

31. The platform should progressively convert repeated AI work into deterministic functionality.

32. The ultimate abstraction is not "AI assistant"; it is "AI-assisted application construction."
```

---

# Part XXXV — Final strategic conclusion

The most important change introduced by the User Function architecture is conceptual.

Traditional software says:

```text
Vendor builds functionality.
Customer uses functionality.
```

AI-first software often says:

```text
Customer asks AI every time.
```

This architecture creates a third model:

```text
Vendor provides the business operating platform.
        ↓
AI helps the customer create missing functionality.
        ↓
Customer validates it.
        ↓
The platform turns it into deterministic functionality.
        ↓
AI remains available for everything not yet formalized.
```

The customer therefore builds a tailored application on top of the platform without having to become a programmer.

The progression becomes:

```text
                        PLATFORM
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
     STANDARD CAPABILITIES         USER-CREATED FUNCTIONS
            │                             │
            │                    AI-assisted creation
            │                             │
            └──────────────┬──────────────┘
                           ▼
                  DETERMINISTIC ERP
                           │
                     + AI EXCEPTION
                        LAYER
                           │
                           ▼
                  CONTINUOUS EVOLUTION
```

And the model/runtime layer becomes:

```text
                     HERMES
                       │
                 Model Runtime
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
       llama.cpp     Ollama        Cloud APIs
          │            │             │
       local         local         optional
       models        models        escalation
          └────────────┼─────────────┘
                       ▼
                Model Policy /
                  Resource
                  Manager
                       ▼
               Business Gateway
                       ▼
              Business Model Kernel
```

The strategic result is a platform that can be:

- local-first
- offline-capable
- cloud-optional
- multi-model
- multi-provider
- hardware-aware
- cost-aware
- privacy-aware
- AI-driven
- deterministic where possible
- self-extending
- user-customizable
- progressively less dependent on AI for repeated work

The deepest product idea is therefore:

> **AI should not be the application's permanent worker for every request. AI should be the mechanism by which the application learns which deterministic capabilities its users need.**

That is a much more powerful architecture than simply embedding a local chatbot into an ERP.

---

# Part XXXVI — Implementation priorities

The implementation order should be:

```text
1. ModelRuntime abstraction
2. llama.cpp runtime
3. local model registry
4. hardware/resource manager
5. Hermes integration adapter
6. Business Agent Gateway
7. Business IR
8. deterministic Function Engine
9. Function version/dependency system
10. Function UI / builder
11. Model Policy Engine
12. cloud provider adapters
13. hybrid escalation
14. model benchmark suite
15. function evaluation suite
16. capability-package integration
```

The most important early proof is not a sophisticated chatbot.

It is this complete round trip:

```text
User asks novel request
        ↓
small local model
        ↓
Business IR
        ↓
deterministic validation
        ↓
database execution
        ↓
correct result
        ↓
user verifies
        ↓
Save as Function
        ↓
click Function tomorrow
        ↓
ZERO LLM CALLS
        ↓
same governed operation
```

If that loop works reliably, the architecture has achieved something strategically important: **AI has helped construct a new deterministic feature of the customer's own application.**