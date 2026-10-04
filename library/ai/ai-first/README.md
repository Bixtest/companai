# AI-Native Business Platform — Architecture Reading Guide

## What this repository is

This folder contains the evolving architectural foundation for a new **AI-native business platform**, initially envisioned around Hermes Agent and capable of becoming an ERP, LMS, CRM, operations platform, or other domain-oriented business system.

The project is not simply:

```text
ERP + chatbot
```

The intended architecture is much deeper:

```text
Canonical Business Model
        ↓
Business IR / Domain Contracts
        ↓
Deterministic Business Engine
        ↓
Data / Events / Analytics
```

with:

```text
Hermes Agent Runtime
        ↓
reasoning / sessions / skills / memory / MCP / agents
        ↓
Business Agent Gateway
        ↓
Canonical Business Model
```

and:

```text
Canonical Business Model
        ↓
compiler / dependency engine
        ↓
database + API + UI + AI semantics + MCP + skills + documentation
```

The long-term goal is a platform where:

- the business model is the source of truth;
- data remains coherent and strongly related rather than becoming a collection of database islands;
- AI is used for interpretation, planning, discovery and novel requirements;
- deterministic software is used for business truth, calculations, permissions and execution;
- local models can run the platform without mandatory cloud AI;
- cloud models can be added as optional escalation or specialization;
- users can build new deterministic functionality with AI assistance;
- schema changes automatically propagate through the systems that depend on them;
- repeated AI-generated work can become a saved **Function** that executes without an LLM.

---

# 1. How to read this folder

## Important rule

These documents were written at different stages of the design process.

They are **not six independent specifications**.

They form a progression:

```text
Research
   ↓
Conceptual architecture
   ↓
Hermes-specific architecture
   ↓
Local AI/runtime + Functions
   ↓
Core data architecture + schema evolution
   ↓
Implementation / evaluation decisions
```

When an earlier document contains an idea that a later document refines or replaces, **use the later architecture as the current recommendation**.

The early documents are valuable because they explain how the problem was discovered, but they should not override the later design-control documents.

---

# 2. Recommended reading order

Read the documents in this order.

---

## 0. THIS README

Start here.

Purpose:

- understand the project in five minutes;
- understand terminology;
- understand which documents are foundational;
- understand which documents are normative;
- understand the order of the architecture;
- avoid treating early brainstorming as the final design.

After this README, continue to Document 1.

---

# 3. Document 1 — `ai_first_erp_research_analysis`

### Role

**Foundational research and problem statement.**

### Read this to understand

- why the original AI-first ERP concept exists;
- why natural-language access can reduce traditional ERP navigation;
- why sending raw ERP rows to an LLM is inefficient;
- why SQL generation alone is insufficient;
- why query hallucination is more dangerous than simple answer hallucination;
- why a semantic layer is necessary;
- why entity/value resolution matters;
- why an intermediate representation is preferable to direct LLM-to-SQL;
- what existing market precedents were considered;
- what open-source components were investigated.

The central progression developed here is:

```text
User
  ↓
AI Workspace
  ↓
AI Planner / Intent Layer
  ↓
ERP Semantic Context
  ↓
Query / Command Representation
  ↓
Deterministic Query Compiler / Domain Service
  ↓
Database
  ↓
Structured Result
```

### What this document is NOT

It is not the final architecture.

It contains early framing, research, market comparisons, and architectural discoveries that were subsequently refined.

### Why read it

It explains **why the later architecture exists**.

A technically strong implementation team should understand the failure modes before implementing the solution.

---

# 4. Document 2 — `ai_first_erp_semantic_database_architecture`

### Role

**First concise statement of the semantic Business Model architecture.**

### Read this to understand

- why business meaning must be separated from physical database storage;
- why SQL should be an implementation detail rather than the AI's conceptual language;
- what Business IR means;
- why relationships must be explicit;
- why the ERP should avoid a universal EAV model;
- how the ERP can become self-extending;
- how one logical business definition can generate database/UI/API/AI artifacts;
- why the domain model should be the source of truth;
- why deterministic commands are preferable to direct database mutations.

The key idea is:

> **The AI understands business intent; deterministic systems determine what is valid and how to execute it.**

This document establishes the conceptual bridge between a normal database and the later Business Model Kernel.

### What this document is NOT

It is not the full implementation specification.

The later documents make the Hermes integration, local-model architecture, Functions, core-data boundaries, dependency graph, and schema evolution more precise.

---

# 5. Document 3 — `AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture`

### Role

**Hermes-specific design-control document.**

This is the document to read when asking:

> What exactly should Hermes do, and what should the platform do around Hermes?

### Read this to understand

- why Hermes is being used as the agent runtime;
- why Hermes is not the ERP database;
- why a Hermes profile is not a tenant;
- why Hermes `state.db` is runtime/session state rather than business truth;
- how Hermes Skills should be used;
- how Hermes Memory should be used;
- how external memory providers should be integrated;
- how Tool Search can prevent excessive tool-context loading;
- how MCP should expose domain capabilities;
- why plugins and hooks should be used;
- where Hermes security ends and platform security begins;
- how subagents/Bots should receive explicit business context;
- where cron fits;
- where workflow durability should live;
- how Hermes dashboard/programmatic integration should be used;
- how to integrate without unnecessarily forking Hermes.

The central division is:

```text
HERMES
    = intelligent agent runtime

BUSINESS PLATFORM
    = authoritative business operating system
```

The most important principle is:

> **Hermes can learn how to use the business system; the Business Platform must define what the business system means.**

### Current Hermes architectural baseline

This document records the Hermes version and repository state that were observed during the research snapshot. Hermes is a rapidly changing project, so the implementation must pin a known release and maintain a compatibility harness rather than assume the moving `main` branch is stable.

---

# 6. Document 4 — `03_Local_First_AI_Runtime_and_User_Function_Architecture`

### Role

**Local AI infrastructure + model management + User Function architecture.**

This is one of the most important documents for turning the conceptual architecture into an economically and operationally viable product.

### Read this to understand

- why the platform should be small-model-first;
- why the architecture reduces the intelligence burden on the model;
- how local models fit into the complete stack;
- the Model Runtime abstraction;
- model registry and model capability metadata;
- local llama.cpp as the primary embedded inference candidate;
- Ollama as a supported alternative local runtime;
- cloud providers as optional runtimes;
- multi-model local deployments;
- hybrid local/cloud escalation;
- model policy and resource management;
- RAM/VRAM/context/KV-cache considerations;
- model routing;
- structured output and tool calling;
- model specialization;
- auxiliary models;
- model benchmarking;
- local-first Docker deployment;
- privacy-aware cloud routing.

### The other major concept in this document: User Functions

This is the mechanism that transforms AI assistance into permanent application functionality.

The intended lifecycle is:

```text
Novel request
      ↓
AI
      ↓
Business IR
      ↓
Validation
      ↓
User verifies result
      ↓
Save as Function
      ↓
Deterministic Function
      ↓
Future execution without LLM
```

A deterministic Function should save:

```text
validated Business IR
+
parameters
+
dependencies
+
permissions
+
model/business-model versions
+
execution metadata
```

not merely:

```text
raw SQL
```

and not:

```text
the returned data
```

This is essential because the physical database can evolve while the logical business operation remains stable.

### The product-level idea

Traditional ERP:

```text
Vendor builds feature
→ Customer uses feature
```

AI assistant:

```text
Customer asks AI every time
```

This platform:

```text
Customer needs something
→ AI helps build it
→ Customer verifies it
→ Platform turns it into deterministic functionality
→ Future use becomes normal application behavior
```

This is a central product concept, not merely a UI convenience.

---

# 7. Document 5 — `04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution`

### Role

**Core structural-integrity architecture.**

This document should be treated as one of the most important technical foundations.

### Read this to understand

- the difference between core data and capability/module data;
- how to prevent database islands;
- how to prevent duplicate master-data universes;
- why relationships are first-class;
- the Relationship Registry;
- semantic versus physical versus analytical connectivity;
- Party / Person / Organization modeling;
- role-based semantics;
- shared addresses and contact points;
- core reference data;
- bounded contexts without isolated data silos;
- authoritative versus derived data;
- snapshots versus duplicates;
- logical schema versus physical schema;
- model-driven migrations;
- dependency graphs;
- model versioning;
- impact analysis;
- automatic propagation of schema changes;
- AI semantic synchronization;
- Function compatibility;
- documentation synchronization;
- database drift detection;
- semantic linting;
- database-island detection;
- data lineage;
- analytics projections;
- event/outbox architecture;
- tenant-aware relationships.

The central rule is:

> **Maximize semantic connectivity; minimize unnecessary physical coupling.**

This needs to be understood correctly.

It does **not** mean:

```text
every table has foreign keys to every other table
```

It means:

```text
every meaningful business concept has:
    an owner
    an identity
    a defined semantic place
    explicit relationships
    known dependencies
```

The document distinguishes:

```text
CORE DATA
```

from:

```text
CAPABILITY DATA
```

so that capabilities such as Finance, Sales, HR, Inventory, Projects or Service can expand the business model without creating independent copies of shared concepts.

---

# 8. Document 6 — `deep-research-report`

### Role

**Open-source / ecosystem research and implementation reference.**

This is reference material rather than the primary architectural authority.

It surveys potential open-source building blocks across:

```text
semantic layers
NL-to-SQL
agent orchestration
query parsing
analytics / OLAP
vector search
metadata/catalogs
entity resolution
workflow orchestration
```

Examples investigated include projects such as:

```text
Cube
Superset
LangChain
LlamaIndex
Haystack
SQLGlot
ClickHouse
DuckDB
Milvus
FAISS
Qdrant
DataHub
OpenMetadata
Dedupe
Airflow
Dagster
Temporal
```

Use this document when deciding:

> Should we build this subsystem ourselves, integrate an existing project, or use an external component?

Do not use it as the primary source for the core architecture.

The architecture should determine which external components are appropriate—not the other way around.

---

# 9. The dependency map between the documents

The simplest way to understand the whole folder is:

```text
                         DOCUMENT 1
                    Research / Problem
                           │
                           ▼
                         DOCUMENT 2
               Semantic Business Model
                           │
             ┌─────────────┴──────────────┐
             ▼                            ▼
        DOCUMENT 3                   DOCUMENT 5
        Hermes Runtime              Core Data /
        Architecture               Relationship /
             │                      Schema Evolution
             │                            │
             └──────────────┬─────────────┘
                            ▼
                       DOCUMENT 4
                  Local AI + Functions
                            │
                            ▼
                       DOCUMENT 6
                  OSS implementation
                     reference layer
```

Or in terms of architecture:

```text
BUSINESS MODEL
     │
     ├── CORE DATA ARCHITECTURE
     │
     ├── CAPABILITY DATA
     │
     ├── BUSINESS IR
     │
     ├── COMMANDS / WORKFLOWS
     │
     ├── FUNCTIONS
     │
     ├── AI SEMANTICS
     │
     ├── UI / API
     │
     └── DOCUMENTATION
           │
           ▼
      generated from
      canonical model
```

Hermes sits beside this as the agent runtime:

```text
HERMES
 ├── AIAgent
 ├── Sessions
 ├── Skills
 ├── Memory
 ├── MCP
 ├── Tool Search
 ├── Subagents
 ├── Bots
 ├── Cron
 └── Context
```

connected through the:

```text
BUSINESS AGENT GATEWAY
```

---

# 10. The five concepts a new person must understand first

Before reading implementation details, make sure these five ideas are clear.

## Concept A — Business Model Kernel

The canonical machine-readable definition of:

```text
entities
fields
relationships
metrics
rules
constraints
commands
workflows
policies
events
views
permissions
versions
```

This is the platform's semantic authority.

---

## Concept B — Core Data vs Capability Data

Core data is shared infrastructure.

Capability data is business-specific functionality.

The architecture prevents capability/module silos from duplicating core identities.

---

## Concept C — Business IR

The AI should produce:

```text
business intent
```

rather than directly manipulating the physical database.

This creates the boundary between:

```text
probabilistic interpretation
```

and:

```text
deterministic execution
```

---

## Concept D — Hermes as Agent Runtime

Hermes provides:

```text
agents
sessions
skills
memory
MCP
tool orchestration
subagents
automation
```

but the Business Platform provides:

```text
truth
tenancy
authorization
data
business rules
commands
transactions
schema
```

---

## Concept E — User Functions

Repeated successful AI work can be promoted into deterministic functionality:

```text
AI-created
   ↓
validated
   ↓
saved
   ↓
deterministic
```

This is how the platform becomes progressively more customized to each business without requiring an expensive AI call for every repeated operation.

---

# 11. What the architecture is trying to prevent

The whole document set is designed around preventing a predictable set of failures.

## Data failures

```text
duplicate entities
database islands
duplicate customer records
inconsistent master data
ambiguous ownership
broken relationships
schema drift
stale projections
```

## AI failures

```text
semantic hallucination
wrong entity
wrong field
wrong metric
wrong relationship
wrong time period
wrong currency
wrong aggregation
wrong command
```

## Security failures

```text
cross-tenant access
privilege escalation
document prompt injection
skill poisoning
memory poisoning
unauthorized commands
untrusted MCP capabilities
```

## Platform failures

```text
schema drift
documentation drift
AI semantic drift
Function breakage
workflow breakage
hidden migration dependencies
model/provider lock-in
```

---

# 12. How to approach the documents as an engineer

Do not simply read the files top-to-bottom and start coding.

Use this progression:

```text
UNDERSTAND
    ↓
DEFINE
    ↓
SEPARATE RESPONSIBILITIES
    ↓
DEFINE CONTRACTS
    ↓
DEFINE INVARIANTS
    ↓
DEFINE DEPENDENCIES
    ↓
IMPLEMENT
    ↓
TEST
```

For every architecture statement, ask:

```text
What is the source of truth?
Who owns this data?
Who is allowed to modify it?
What depends on it?
What does it depend on?
How is it versioned?
How does AI see it?
How does the database enforce it?
How does the UI represent it?
What happens if it changes?
```

---

# 13. The architecture hierarchy

When making future technical decisions, use this hierarchy.

```text
LEVEL 1
Business meaning

LEVEL 2
Canonical Business Model

LEVEL 3
Business IR / Commands / Workflows

LEVEL 4
Compilers / Domain Engines / Policy Engines

LEVEL 5
Physical databases / event stores / analytics engines

LEVEL 6
Hermes / local models / cloud models / infrastructure
```

A lower level must not redefine a higher level.

For example:

```text
database column name
```

must not secretly become the definition of:

```text
business concept
```

And:

```text
LLM interpretation
```

must not silently become:

```text
business rule
```

---

# 14. How to handle contradictions in future documents

Use this precedence rule:

```text
1. Explicit architectural invariants
2. Latest design-control architecture
3. Later refined subsystem architecture
4. Earlier architecture
5. Brainstorming / examples
6. Vendor-specific implementation details
```

An example:

Earlier idea:

```text
save generated SQL as a Function
```

Refined architecture:

```text
save validated Business IR + dependencies
and treat compiled SQL as a derivative artifact
```

Use the refined architecture.

Likewise:

Earlier concept:

```text
Hermes profile as tenant
```

Refined architecture:

```text
Hermes profile = agent runtime environment
Tenant = business/security boundary
```

Use the refined architecture.

---

# 15. What is deliberately NOT decided yet

This project intentionally leaves some implementation decisions open until the canonical architecture is sufficiently specified.

Examples include:

```text
exact physical schema layout
exact PostgreSQL schema partitioning
whether/where a graph projection is required
exact analytics engine
exact vector/retrieval engine
exact workflow engine
exact frontend framework
exact model family
exact local quantization
exact cloud provider mix
```

These should be evaluated against the architecture rather than allowed to define it.

---

# 16. What should be decided before substantial implementation

The next major architectural work should formalize:

```text
Business Model Kernel
```

in machine-readable terms.

At minimum:

```text
Tenant
Organization
LegalEntity
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

Function
Migration
Version
AuditRecord
Dependency
```

For each object, define:

```text
identity
ownership
version
lifecycle
dependencies
permissions
serialization
runtime representation
database representation
AI representation
UI representation
migration behavior
```

This should become the next major design-control artifact.

---

# 17. The core compiler idea

Everything should eventually converge on:

```text
              CANONICAL BUSINESS MODEL
                          │
                          ▼
                  MODEL VALIDATION
                          │
                          ▼
                 DEPENDENCY ANALYSIS
                          │
                          ▼
                  COMPILER / BUILD
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
     DATABASE            API               UI
        │                 │                 │
        ▼                 ▼                 ▼
     MIGRATIONS          MCP             COMPONENTS
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                    AI PROJECTIONS
                          │
                   ┌──────┴──────┐
                   ▼             ▼
                SKILLS        SEMANTICS
```

When the Business Model changes:

```text
model change
    ↓
dependency graph
    ↓
impact analysis
    ↓
generate/update affected artifacts
    ↓
tests
    ↓
review
    ↓
publish new model version
```

This is the mechanism that keeps the platform coherent as it grows.

---

# 18. The data architecture principle

The platform should not be built as:

```text
Finance DB
Sales DB
HR DB
Inventory DB
Projects DB
```

that happen to coexist.

It should be:

```text
ONE BUSINESS DATA MODEL

    Core
      │
      ├── Finance capability
      ├── Sales capability
      ├── HR capability
      ├── Inventory capability
      ├── Projects capability
      └── Other capabilities
```

The capabilities are bounded operational domains, but they participate in one coherent business universe.

The target is:

> **Maximum semantic connectivity with minimum unnecessary physical coupling.**

---

# 19. The local AI principle

The architecture deliberately assumes that the normal platform should be able to run on a relatively small local model.

The reason is architectural rather than magical:

```text
AI
    handles intent + reasoning

Business Model
    supplies semantics

Business IR
    constrains representation

Domain engine
    performs business operations

Database
    performs deterministic computation

Policy engine
    performs authorization

Workflow engine
    performs durable orchestration
```

Therefore the LLM does not need to memorize or infer the entire ERP.

The local-first design should support:

```text
llama.cpp
Ollama
other local runtimes
cloud APIs
multiple local models
hybrid routing
```

without changing the Business Model.

---

# 20. The User Function principle

The platform gets progressively less AI-dependent for repeated work.

```text
NEW
REQUEST
  ↓
AI

  ↓
VALIDATED
OPERATION

  ↓
FUNCTION

  ↓
DETERMINISTIC
APPLICATION
FEATURE
```

This means that AI is not simply a permanent operating expense.

It is also a **feature-construction mechanism**.

The more users teach the platform their recurring needs, the larger their deterministic application surface can become.

---

# 21. Suggested terminology

To reduce confusion, use these terms consistently.

### Business Model Kernel

Canonical logical representation of the business.

### Core Data

Cross-capability shared business infrastructure.

### Capability

A cohesive business area that adds entities, commands, workflows, metrics, policies and UI.

### Business IR

Typed logical representation of what the user wants.

### Command

A typed business mutation.

### Function

A reusable application operation, usually deterministic after validation.

### Skill

Procedural knowledge for an agent.

### Memory

Contextual knowledge/observations for an agent or user.

### Knowledge

Documents and reference information.

### Projection

A derived representation optimized for a particular use.

### Hermes Profile

Agent runtime environment.

### Tenant

Business/security/data boundary.

### Model Runtime

Interface between the platform and the actual inference engine/provider.

### Dependency Graph

Registry showing what artifacts depend on what other artifacts.

### Schema Compiler

System that converts the canonical model into physical/application artifacts.

---

# 22. What a complete request should eventually look like

A typical request should pass through:

```text
User
 ↓
ERP UI
 ↓
Identity / Tenant Context
 ↓
Hermes Agent Runtime
 ↓
Capability Discovery
 ↓
Semantic Retrieval
 ↓
Business IR
 ↓
Validation
 ↓
Authorization / Policy
 ↓
Query / Command / Workflow Engine
 ↓
Database / Events / Analytics
 ↓
Verification
 ↓
Structured Result
 ↓
ERP UI
```

If the operation is repeated:

```text
validated operation
 ↓
Save as Function
 ↓
Function Engine
```

and the LLM is removed from the execution path.

---

# 23. How schema changes should eventually work

A user should never need to think:

```text
ALTER TABLE
```

The desired experience is:

```text
User:
"Add vehicle maintenance tracking."

AI / Builder:
proposes business model change

Platform:
checks existing concepts
checks relationships
checks duplicates
checks permissions
checks dependencies
checks migration impact

Platform:
generates:
    database
    API
    UI
    AI semantics
    MCP
    skills
    Functions impact
    documentation
    tests

User:
reviews

Platform:
publishes new model version
```

That is the intended self-extending architecture.

---

# 24. What "database-first thinking" should mean here

The platform should be obsessed with data relationships, but not obsessed with raw tables.

The correct order is:

```text
Business concept
 ↓
Identity
 ↓
Ownership
 ↓
Relationships
 ↓
Rules
 ↓
Lifecycle
 ↓
Logical representation
 ↓
Physical representation
```

Not:

```text
Table
 ↓
Column
 ↓
Foreign key
 ↓
Try to figure out what it means later
```

---

# 25. Future contributors: the questions you should ask before adding anything

Before adding a new feature, ask:

```text
Does the business concept already exist?

If it exists:
    can we reuse or extend it?

What is the canonical identity?

What data does this feature own?

What existing data does it reference?

What relationships does it create?

What metrics depend on it?

What commands does it introduce?

What workflows does it introduce?

What permissions does it require?

What Functions and Skills may depend on it?

What UI does it require?

What external integrations does it affect?

How does the change migrate?

How is the new version represented?

Can the AI understand it without seeing physical SQL?

Does this create a database island?

Does this create a duplicate authoritative fact?
```

If these questions cannot be answered, the feature is not ready for implementation.

---

# 26. Recommended working process for the team

For every major architectural decision:

```text
1. Identify business requirement.

2. Check existing canonical concepts.

3. Identify affected core data.

4. Identify affected capability data.

5. Identify relationships.

6. Define Business IR.

7. Define commands/workflows if applicable.

8. Define authorization.

9. Define dependencies.

10. Define physical implementation.

11. Define AI projection.

12. Define UI/API projection.

13. Define migration.

14. Define tests.

15. Record the decision.
```

---

# 27. The architecture in one page

```text
                          BUSINESS
                             │
                             ▼
                   CANONICAL BUSINESS MODEL
                             │
           ┌─────────────────┼──────────────────┐
           ▼                 ▼                  ▼
        CORE DATA        CAPABILITIES       REFERENCE
           │                 │                  │
           └─────────────────┼──────────────────┘
                             ▼
                    RELATIONSHIP FABRIC
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
          Metrics          Commands       Workflows
             │               │               │
             └───────────────┼───────────────┘
                             ▼
                       BUSINESS IR
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                  QUERY             COMMAND
                    │                 │
                    ▼                 ▼
                 PLANNER          DOMAIN ENGINE
                    │                 │
                    └────────┬────────┘
                             ▼
                      DATA / EVENTS
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
         PostgreSQL        Analytics        Search
             │               │                │
             └───────────────┼────────────────┘
                             │
                             ▼
                         HERMES / AI
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
       Skills             Memory              MCP
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                      ERP AI Workspace

Parallel compiler path:

CANONICAL BUSINESS MODEL
        ↓
MODEL VALIDATOR
        ↓
DEPENDENCY GRAPH
        ↓
COMPILER
        ↓
DATABASE + API + UI + AI + MCP + SKILLS + DOCS + TESTS
```

---

# 28. The ultimate product loop

The entire project can be summarized by this cycle:

```text
                     PLATFORM
                         │
                         ▼
                  User encounters need
                         │
                         ▼
                        AI
                         │
                         ▼
                Business Model / IR
                         │
                         ▼
                    Validation
                         │
                         ▼
                       Result
                         │
                     User verifies
                         │
                         ▼
                   Save as Function
                         │
                         ▼
               Deterministic capability
                         │
                         ▼
                 More platform usage
                         │
                         ▼
             New needs / new capabilities
                         │
                         └──────────────→ AI
```

The platform therefore becomes progressively more capable **without needing to make every future request an AI request**.

---

# 29. What to read next

For someone new to the project, the recommended sequence is:

```text
START
  ↓
README.md
  ↓
1. ai_first_erp_research_analysis
  ↓
2. ai_first_erp_semantic_database_architecture
  ↓
3. AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture
  ↓
4. 03_Local_First_AI_Runtime_and_User_Function_Architecture
  ↓
5. 04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution
  ↓
6. deep-research-report
  ↓
NEXT:
Business Model Kernel / Meta-Model specification
```

After completing the six documents, a reader should be able to explain:

```text
what the platform is
why Hermes is being used
what Hermes owns
what the Business Platform owns
what the canonical Business Model is
why relationships matter
how AI interacts with the business
how local models fit
how Functions work
how database changes propagate
how new capabilities are created
how the platform avoids database islands
how the architecture stays coherent while evolving
```

If those answers are not clear, the implementation phase should not yet begin.

---

# 30. Final orientation

This project is best understood as the convergence of five systems:

```text
1. BUSINESS MODEL
   What the business means.

2. DATA PLATFORM
   What the business stores and how it remains coherent.

3. APPLICATION COMPILER
   How the model becomes UI/API/database/workflow artifacts.

4. HERMES AGENT RUNTIME
   How AI reasons, learns, uses tools and interacts with people.

5. USER-CREATED FUNCTIONS
   How successful AI-assisted solutions become deterministic application features.
```

The ultimate goal is:

> **A self-extending, local-first business operating platform whose canonical business model remains the single source of truth while Hermes provides adaptive intelligence and the platform continuously compiles business definitions into coherent data, application, AI and workflow capabilities.**

The architecture should therefore always move in the direction:

```text
LESS DUPLICATION
MORE RELATIONSHIP CLARITY
MORE STRUCTURAL DETERMINISM
SMALLER AI CONTEXT
LOWER AI COST
MORE REUSABLE FUNCTIONALITY
SAFER CUSTOMIZATION
STRONGER VERSIONING
BETTER PROVENANCE
```

That is the north star for the documents that follow.

---

# 7. Document 7 — `05_Widgetized_Collaborative_Workspace_Architecture`

### Role

**Workspace, Widget, interaction, sharing, and collaboration architecture.**

Read this after the core data, Hermes, local AI, and schema-evolution documents.

It defines the Workspace as a dynamic application surface built from independently reusable **Widgets** rather than a chat screen with attached UI controls. Widgets can contain input controls, data containers, analytics, visualizations, forms, conversations, workflows, documents, Functions, and collaboration surfaces.

The key distinction is:

> **Widgets are interaction islands, not data islands.**

Widgets share the same canonical Business Model, data, authorization, Functions, Commands, relationships, versions, provenance, and dependency graph.

It also defines:

- Widget contracts and Widget IR
- Widget Definition vs Widget Instance
- typed inputs/outputs/events/actions
- widget composition and typed ports
- live links, instances, and snapshots
- `@` references for people/agents and `#` references for reusable platform objects
- cross-conversation Widget references
- collaborative Widgets and shared Workspaces
- presence, comments, mentions and anchored collaboration
- the separation between collaborative UI state and transactional business state
- analytical, visual, functional, tree, graph, document and conversation Widgets
- Widget Libraries over the canonical Object Registry
- AI-generated Widget IR and Workspace patches
- Widget versioning and schema/dependency propagation
- reusable and forkable Widget architecture
- how Functions, Widgets and Workspaces form a hierarchy of user-created application functionality

Existing collaborative products such as Microsoft Loop, Figma and Notion provide useful evidence for portable components, synchronized content, anchored comments and reusable instances, but this architecture extends those ideas around the platform's canonical business model, deterministic execution, permissions and provenance.

The recommended progression is:

```text
Business Model
  ↓
Business Operation / Function
  ↓
Widget
  ↓
Workspace
  ↓
Collaborative Business Application
```

---

# 8. Document 8 — `06_Platform_Foundation_and_Security_Kernel_Specification`

### Role

**Foundational trust, authorization, policy, data-protection, and secure-execution architecture.**

This document should be treated as the governing security/kernel specification that later business capabilities must conform to.

It defines:

- identity and subject types
- authentication versus authorization
- multi-tenancy and organizational security boundaries
- roles, permissions, policies, scopes, conditions, obligations and decisions
- record-, field-, relationship- and value-level authorization
- tenant-aware query and command enforcement
- data classification and secret isolation
- AI input, execution and output security boundaries
- prompt injection and indirect prompt injection handling
- capability, Function, Widget, Workflow, MCP and plugin security
- Hermes security integration boundaries
- subagent task contracts
- policy decision / policy enforcement architecture
- authorization-aware search, analytics and caching
- approval and high-impact action controls
- audit, provenance and security-event architecture
- security-aware Business Model and schema evolution
- adversarial test architecture and security invariants
- foundation build order and acceptance criteria

The core rule is:

> **AI may propose; deterministic platform policy must authorize; deterministic business services must execute; authorized result layers must control disclosure.**

The most important security invariant is:

> **Unauthorized data should not enter an AI context in the first place.**

The recommended foundation dependency order becomes:

```text
Platform primitives
        ↓
Identity
        ↓
Tenant / organization
        ↓
Policy / authorization
        ↓
Data classification / secrets
        ↓
Business Model Kernel
        ↓
Query / Command Engine
        ↓
Audit / provenance
        ↓
Business Agent Gateway
        ↓
Hermes / Model Runtime
        ↓
Functions / Widgets / Workspace
        ↓
Business capability packages
```

This document should be read before attempting to design the detailed security behavior of Finance, CRM, HR, Inventory, Sales, or other business capabilities.

---
