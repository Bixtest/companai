# Batch 3 — The vision: the runtime, Functions, and the data fabric

**Batch:** 3 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** vision **Document 4** (`03_Local_First_AI_Runtime_and_User_Function_Architecture.md`,
3,646 lines) and vision **Document 5**
(`04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution.md`, 4,408 lines).
**Question this batch answers:** How is the platform supposed to run on a small local
model, how does AI work become permanent application functionality, and how does the
business model stay coherent as it grows?

**Definition of done (from `PLAN.md`):** *local-first and User Functions are understood
well enough to say what would have to exist in our platform for either to work.*

**Owner instruction for this batch, recorded:** `library/ai/hermes-agent-main/` is the
**most current** Hermes we hold. Documents describing Hermes are therefore to be read with
suspicion and mined for what still fits — see §2b.

---

## 0. How to read this report

Same conventions as batch 2: **`N4-nn`** / **`N5-nn`** are numbered normative statements,
sourced to Document 4 or Document 5. Counts are measured, not estimated. Where two lists
cover the same ground, they are compared by set difference, never averaged.

---

## 1. What was read, and how big it is

| Doc | File | Lines |
|---|---|---|
| 4 | `03_Local_First_AI_Runtime_and_User_Function_Architecture.md` | 3,646 |
| 5 | `04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution.md` | 4,408 |
| | **total this batch** | **8,054** |

Document 5 is the longer, but Document 4 is the one that introduces a genuinely new
concept. They are the two halves of one idea, and §2a explains why.

---

## 2. The two documents, and how they connect

### 2a. The connection, in one line

Document 4 says *"make the model small enough to run locally"*. Document 5 says *"make the
data coherent enough that the model doesn't have to be big"*. They are the same argument
from two ends:

> Doc 5 §150: **"Good data architecture reduces AI resource needs."** The more coherent the
> relationship model, the smaller the semantic context needed — therefore less KV cache,
> lower latency, and a smaller local model suffices.

So Document 5 is not a separate topic. It is the *precondition* for Document 4's
local-first claim. If the relationship fabric is absent, the local model has to reason over
a tangled schema and local-first collapses back into "buy a bigger model".

### 2b. The owner's instruction, applied

The owner has confirmed that `library/ai/hermes-agent-main/` is the current Hermes, and
that documents describing it may be out of date. Applied to this batch, that means:

- **Document 4 describes Hermes capabilities as claims.** It asserts (§4) that Hermes has
  main + auxiliary model slots, custom/self-hosted endpoints, local model support, Ollama
  and llama.cpp support, provider switching; and (§80) that Hermes has independent auxiliary
  slots for compression, vision, web summarization, approval scoring, MCP routing, skill
  search and session titles. **These are H-type claims, not facts** — they go to batch 7.
- **Document 4 also asserts a specific constraint** (§20): *"Hermes currently requires at
  least a 64K-token context window for supported operation."* If true, this is a hard
  design constraint on local hardware. If the current Hermes has changed it, the hardware
  tiers in §109–111 are wrong. **This is the highest-value single claim to check in
  batch 7 from this batch** — it decides whether the minimal VPS tier is viable.
- **The architecture does not depend on those claims being exactly right.** Both documents
  put the abstraction in front (`ModelRuntime`), so if Hermes's model management differs
  from the description, the platform is insulated. That is the point of the abstraction,
  and it is why this batch can be completed without waiting for batch 7.

---

## 3. Document 4 — the local-first runtime

### 3a. The thesis

The goal is not "build an ERP that needs the smartest model". It is (§1):

> **"Build a business platform whose structure makes intelligence inexpensive."**

And the operating rule (§2):

> **AI for uncertainty; software for certainty.**

The document then names both sides concretely. **Deterministic** (§2): VAT, balance,
currency conversion, inventory availability, permission checks, workflow-state transitions,
credit-limit validation, duplicate-invoice detection, date/fiscal-period resolution,
aggregation, database writes. **AI-appropriate** (§2): which capability does the user want,
which report solves this, why might revenue have fallen, which documents are relevant, how
to decompose an unfamiliar request, how to explain a result.

This is the same split as batch 2's N1-23 and N3-29 — stated a third time, independently.
Three documents, three different framings, same rule.

### 3b. The ModelRuntime abstraction (§9)

A platform interface with: `chat()`, `structured_output()`, `tool_call()`, `embed()`,
`vision()`, `rerank()`, `summarize()`, `classify()` (8 capabilities). Implementations:
`LlamaCppRuntime`, `OllamaRuntime`, `OpenAICompatibleRuntime`, `AnthropicRuntime`,
`OpenRouterRuntime`, `CustomRuntime`, `HybridRuntime` (7).

The rule (§38): **the application must depend on `ModelRuntime`, never on llama.cpp's or
Ollama's API directly.** That is what makes local-first a *mode* rather than a *rewrite*.

Capability is separated from identity (§10): never hard-code `"Qwen-XYZ"` as a semantic
role; declare the requirement (`structured_output`, `tool_calling`, `context >= 64K`,
`quality >= threshold`) and map candidate models to it.

### 3c. Model Policy and the three modes

Hermes manages models; the platform adds a **Model Policy** layer that answers *which model
should do this task* (§5), based on task type, risk, latency, privacy, tenant policy, data
classification, tool complexity, context size, vision need, cost ceiling, availability,
hardware capacity, model capability and user preference (14 factors).

Three modes: **A — Hermes-managed** (simplest); **B — Policy-managed** (the platform picks
the model class, then Hermes runs it); **C — Hybrid/adaptive** (start local, escalate on
structural validation failure). Mode C is named as the long-term enterprise mode.

### 3d. The task taxonomy — 13 classes (§27)

`T0` UI intent · `T1` retrieval · `T2` entity/value resolution · `T3` Business Query IR ·
`T4` Business Command IR · `T5` explanation · `T6` routine workflow · `T7` document
extraction · `T8` multimodal · `T9` complex analysis · `T10` schema/capability design ·
`T11` developer/code task · `T12` agent planning. Each declares minimum quality, max
latency, privacy, context, tool support, risk.

Two rules here matter more than the taxonomy itself:

- **Routing must not be an LLM decision** (§26). Use a deterministic task classifier + the
  capability registry + policy engine + resource manager. The classifier *may* use a small
  model, but the final selection obeys policy.
- **Confidence is not an escalation trigger** (§29). Do not escalate because the model says
  it is 95% sure. Escalate on **structural validation failure**: IR validates? entity
  exists? fields exist? relationships valid? permission valid? metric valid? policy valid?

### 3e. Local inference, resources, and the hidden cost

llama.cpp / `llama-server` is the recommended primary engine (§14, §38) — OpenAI-compatible,
Docker images per backend (CUDA, ROCm, Vulkan, Intel), router mode with dynamic
load/unload, presets, sleep-on-idle, structured output, tool calling, speculative decoding.
Ollama stays supported as an alternate (§37). Neither is exposed as the business-facing
abstraction (§38).

Resource discipline: do not keep every model warm (§16, §19); control `models_max`, idle
timeout and admission (§17); use sleep-on-idle on small VPS (§18); the **Model Admission
Controller** decides load/queue/evict/sleep/fallback (§84); priority tiers P0–P3 (§85).

**The hidden cost is context, not parameters** (§20). Context/KV-cache memory can dominate.
Hence §21: never send the entire schema, all documents, all skills, all history or raw
dumps — send a stable agent contract + relevant semantic objects + relevant skill + relevant
tool definitions + a small result + task history.

### 3f. Privacy, classification and cloud escalation

Provider policy is deterministic and cannot be bypassed by the model (§88, §33):
Public → cloud allowed; Internal → approved cloud or local; Confidential → local preferred;
**Highly Confidential → local only.** Tenant policy may additionally say local-only,
approved-providers-only, EU-region-only, or no-data-leaves-VPS (§32). Every time data leaves
the local runtime, a `cloud_inference_requested` event is recorded with provider, model,
policy, classification, tenant, purpose and timestamp (§89).

### 3g. What would have to exist for local-first to work

1. A **`ModelRuntime` interface** — the app must not call an engine's API directly.
2. A **Model Registry** — per-model capabilities, context, quantisation, hardware profile,
   privacy class, quality/latency/cost profile (§11).
3. A **Model Policy layer** and a **deterministic task classifier** over the 13 task types.
4. A **resource manager / admission controller** — RAM/VRAM/KV budget, warm/cold, eviction.
5. A **local engine with schema-constrained output** — because Business IR must be emitted
   under an enforced schema, not prose (§22).
6. **Data classification on every request**, feeding provider policy.
7. A **benchmark suite** — so "can this model do Business IR?" is a measured answer, not a
   hope (§116–118).
8. Hermes pointed at local endpoints — *claimed* available; verify in batch 7.

**Nothing in that list is a data-model problem. All eight are runtime concerns.** Which is
why local-first is separable from the rest — and why it can be built last if needed.

---

## 4. Document 4 — User Functions

### 4a. The definition (§39)

> **"A validated, reusable business operation created by the user with AI assistance and
> executable without AI once published."**

The loop (§39, §45, §73): the user asks; the AI produces Business IR; the platform
validates and executes; the user inspects and verifies; the user clicks **Save as
Function**; the platform stores **the validated business operation — not the returned
data**; future clicks bypass the LLM.

### 4b. What a Function actually stores (§41) — 28 declared fields

Measured: the artifact block declares **28 fields**. The load-bearing ones:

- **Identity/UI**: `function_id`, `tenant_id`, `name`, `description`, icon/UI metadata.
- **The operation**: `operation_type`, **`business_ir`**, `parameter_schema`.
- **Its dependencies**: referenced entities, fields, metrics, commands, workflows;
  required permissions.
- **Its versions**: `business_model_version`, `dependency_versions`, `compiler_version`.
- **Its policy**: `execution_policy`, `confirmation_policy`.
- **Its output**: `result_schema`, `presentation_definition`.
- **Its governance**: `audit_policy`, `created_by`, `verified_by`, `created_at`,
  `published_at`, `version`, `status`.
- Optional: compiled plan hash, execution fingerprint, migration compatibility metadata.

The batch-3 tickbox asked specifically what a Function stores. The answer, from the
document's own words: **validated Business IR + parameter schema + dependency metadata +
versions + permissions + policy + presentation** — and **not SQL, and not the returned
data**. §40 is explicit about the three things *not* to save: raw SQL, the natural-language
prompt, and the returned data.

### 4c. Why not SQL — and why this is the decisive property

§42 gives the reason: schema evolution. If `Invoice` is reorganised, a function that stored
SQL breaks; a function that stored *"show overdue German customers above €10,000"* as
Business IR stays valid, and the compiler regenerates the physical query. Document 5 §106
says the same thing from the data side:

> *"Function remains logically valid → recompile → new physical query. **This is one of the
> strongest arguments for Business IR.**"*

So: **SQL is a cache/derivative; Business IR is the durable asset** (§42, §43). §43 keeps
the compiled artifact too, for audit and performance — but as a derivative, not the source.

### 4d. Lifecycle, types, parameters, risk

- **Lifecycle** (§44): `DRAFT → GENERATED → VALIDATED → VERIFIED → PUBLISHED → ACTIVE →
  DEPRECATED → ARCHIVED` — **8 states**. Note that verification is separated from
  validation, and publication from activation.
- **Verification is objective, not "it looked right"** (§46): IR valid, entities valid,
  fields valid, metrics valid, relationships valid, authorization valid, tenant scope valid,
  query plan valid, sample result valid; for mutations, preconditions + policy + dry run +
  impact + postconditions.
- **Six types** (§50–55): 1 Deterministic Query · 2 Deterministic Command ·
  3 Parameterized Report · 4 Workflow · 5 Composite deterministic · 6 **Agent (AI) Function**.
  Types 1–5 are AI-free at runtime; type 6 deliberately contains AI and must be **labelled
  differently** (§55, §97–98).
- **Parameterisation** (§56–58): do not freeze dynamic values as constants — infer
  parameters, and type them strongly (`Country`, `Money{amount,currency}`). Functions may
  reference deterministic context variables: `current_user`, `current_tenant`,
  `current_organization`, `today`, `current_date`, `current_period`, `selected_customer`,
  `selected_record`, `current_currency` (9).
- **Risk classes** (§70): `R0` read-only · `R1` derived report · `R2` reversible business
  command · `R3` approval-impacting · `R4` financial/irreversible — **5 classes**.

### 4e. The three rules that make it safe rather than merely convenient

1. **Authorization happens every time** (§59). Never assume *function created by user =
   permission forever*. Permissions change.
2. **Tenant scope happens every time** (§60). A function belonging to tenant A does not
   become portable to tenant B without revalidation.
3. **A Function's capability is narrower than raw AI** (§69). No hidden SQL, no arbitrary
   tool call, no arbitrary MCP server, unless the function type explicitly declares it.

### 4f. The economic loop (§74, §331)

> *"The more the customer uses the AI to customize the platform, the more of their recurring
> workload can become deterministic."*

Day 1 mostly AI → Day 30 AI + many Functions → Day 365 core workflows + many user-built
Functions + AI for exceptions. The document notes this is unusual for an AI product: **the
AI workload can decline as the customer's application becomes richer.**

And §63 adds a product-evolution loop: many tenants create the same function → the vendor
recognises the pattern → ships it as a canonical module.

### 4g. What would have to exist for User Functions to work

1. **Business IR persisted as an artifact** (not SQL, not a prompt).
2. A **Function Engine** (§92): register, validate, publish, execute, version, deprecate,
   recompile, inspect, audit.
3. A **dependency graph and dependency engine** — because invalidation is impossible without
   it. A Function must declare what it uses, and the platform must answer *compatible /
   requires recompilation / requires review / invalid* (§66, §67).
4. A **compiler** that regenerates a physical query from IR when the model changes.
5. A **strongly-typed parameter schema** and the 9 context variables.
6. **Re-authorisation and tenant-scope checks at every execution.**
7. A **Function library** with scope hierarchy (Personal/Team/Organization/Tenant/Platform)
   and placement (sidebar, module page, dashboard, command bar, record page, favourites,
   quick actions, scheduled jobs — 8).
8. **Presentation metadata** (table, chart, metric card, form, record list, timeline,
   dashboard widget).
9. **Risk classes and a publication policy**; **audit of every invocation** (§71).

### 4h. Document 4's own invariants — 32, quoted

Measured: Part XXXIV declares **32** non-negotiable invariants. Quoted verbatim, because
they are the runtime/Function rule-set and later batches will be held to them:

> 1. Local inference must be a first-class production mode.
> 2. No single cloud provider is required.
> 3. llama.cpp should be supported as a primary local inference engine.
> 4. Ollama should remain a supported local runtime.
> 5. The application must depend on ModelRuntime, not llama.cpp/Ollama APIs directly.
> 6. Hermes remains the agent runtime.
> 7. Model selection may be handled by Hermes, platform policy, or a hybrid policy.
> 8. Model routing must respect tenant privacy and resource policy.
> 9. The Business Model Kernel remains the semantic source of truth.
> 10. The LLM must generate Business IR / commands, not arbitrary business SQL.
> 11. A deterministic Function must not call an LLM at runtime.
> 12. A deterministic Function stores the validated logical business operation.
> 13. Compiled SQL/query plans are derivatives, not the semantic source of truth.
> 14. Every Function is versioned.
> 15. Every Function has dependency metadata.
> 16. Every Function rechecks authorization at execution.
> 17. Every Function respects tenant boundaries.
> 18. High-risk Functions have stronger publication and execution policies.
> 19. AI Functions must be explicitly distinguished from deterministic Functions.
> 20. Skills and Functions are different architectural objects.
> 21. Skills describe procedures; Functions execute application behavior.
> 22. Hermes memory is not business truth.
> 23. Hermes state.db is not ERP transaction state.
> 24. Hermes profiles are not tenants.
> 25. Durable workflow state remains outside the agent runtime.
> 26. Cloud escalation is policy-controlled.
> 27. Model activation must account for RAM, VRAM and context/KV-cache cost.
> 28. The platform should prefer a small local model for normal work.
> 29. Large models should be used by exception or explicit policy.
> 30. Every model used in production should be benchmarked against the platform's own business task suite.
> 31. The platform should progressively convert repeated AI work into deterministic functionality.
> 32. The ultimate abstraction is not "AI assistant"; it is "AI-assisted application construction."

**Note items 22–24.** These are the *same three rules* as batch 2's R-03, R-04 and R-05,
reached in a document written about a different subject. That is the fourth independent
restatement of the Hermes/platform boundary.

### 4i. Two definitional separations the document makes

- **Function vs Skill** (§126–129): a Skill is *how an agent performs a task* (lives in
  Hermes); a Function is *what deterministic operation the application executes* (lives in
  the platform). One user request can produce both, governed separately. §128: *"The skill
  requires intelligence. The function does not."*
- **Function vs Workflow** (§130–131): a Function is a reusable operation; a Workflow is a
  stateful process (submit → review → approve → execute → close). A Function may **invoke** a
  workflow but must not replace the workflow engine.

---

## 5. Document 5 — core data vs capability data

### 5a. The central requirement

> §Executive Summary: **"The platform must have one coherent business data architecture,
> not a collection of independent module databases."**

The failure being designed against is named and enumerated: **database islands** —
duplicated entities, duplicate customer/organization/address/product records, inconsistent
terminology, inconsistent status values, manual synchronization, ambiguous ownership, broken
analytics joins, AI confusion.

A capability may not create a parallel version of `Customer`, `Company`, `Employee`,
`Product`, `Address`, `Currency`, `Country`, `User` or `Organization` — *unless there is a
genuine semantic distinction*.

### 5b. Core vs capability, defined precisely

**Core data** = "the relatively stable, cross-platform foundation": `Tenant`, `Organization`,
`LegalEntity`, `BusinessUnit`, `Location`, `User`, `Person`, `Party`, `Role`, `Permission`,
`Currency`, `Country`, `Language`, `Address`, `Document`, `File`, `ContactPoint`,
`Product/Item`, `Unit`, `Calendar`, `Tax concepts`, `Audit identity`.

**Capability data** = "business-specific structures added by capabilities": `Invoice`,
`SalesOrder`, `PurchaseOrder`, `WarehouseTransfer`, `Project`, `EmployeeContract`, `Course`,
`Vehicle`, `MaintenanceRecord`.

The elevation test (§5) — an entity becomes core only when it has **all four**:
cross-capability significance, stable identity, clear semantic ownership, multiple
consumers. *"Do not put everything in core merely because it is important to one module."*

§6 gives a starting candidate set of core entities — measured: **26**.

### 5c. The entity classification (§4) — 6 classes

Measured: `CORE`, `CAPABILITY`, `PROJECTION`, `REFERENCE`, `EXTERNAL`, `TEMPORARY`.

The document says this classification should live **in the Business Model Kernel** — so it
is metadata, not a convention.

### 5d. Three structural decisions worth naming

- **Party model** (§7–8): one identity, many roles. `Party → {Person, Organization}`, with
  `CustomerRole`, `SupplierRole`, `EmployeeRole`, `PartnerRole`. A company is not three
  unrelated records (`customer_company`, `supplier_company`, `partner_company`). The rule:
  **Party = identity; Role = business relationship.**
- **Address** (§9): `Party → Address[]`, not `customer.address` / `supplier.address` /
  `employee.address` / `warehouse.address` copied four times — **but** when a document must
  preserve history, take a snapshot (`Invoice.BillingAddressSnapshot`). The rule:
  **"Reference current master data; snapshot immutable historical facts when the business
  event requires them."**
- **Product/Item** (§11): distinguish `Product`, `Item`, `SKU`, `Variant`, `InventoryItem`,
  `Service`, `Bundle` once, centrally, rather than letting each capability invent its own.

---

## 6. Document 5 — the relationship fabric

### 6a. Relationships are first-class (§12–13)

A relationship is not a foreign key; it is a semantic statement
(`Invoice belongs_to Customer`, `Payment settles Invoice`). Every relationship declares —
measured, **14 fields**: `relationship_id`, `source_entity`, `target_entity`, `cardinality`,
`ownership`, `semantic meaning`, `optional/required`, `delete behaviour`, `visibility`,
`authorization inheritance`, `allowed traversal`, `aggregation semantics`, `temporal
semantics`, `version`.

### 6b. The three connectivity types (§20) — the conceptual core of this document

- **Semantic connectivity** — the business model knows the concepts are related.
- **Physical connectivity** — database constraints/indexes enforce or optimise it.
- **Analytical connectivity** — the analytics layer exposes it efficiently.

*"One relationship may have all three, but they are not identical."* This distinction is
what lets the document say "connect everything" **without** meaning "add foreign keys
everywhere" (§19).

### 6c. Why relationships are first-class, in one measurable example

§77 — **fan-out**. `Invoice` has 3 lines and 4 payments; a naive join produces 12 rows and
inflates totals. The registry carries cardinality, so the metric engine can choose a safe
aggregation strategy. §78 requires every metric to declare **base grain, aggregation grain
and relationship path**. This is the same defence as batch 2's N3-27/N3-28 (explicit grain,
approved paths) — stated a third time, and here with the arithmetic that makes it concrete.

---

## 7. Document 5 — redundancy, defined rather than banned

§21: *"Redundancy is not automatically bad."* §22 gives **three categories**:

1. **Forbidden duplication** — two authoritative records for the same fact
   (`customer.credit_limit` and `finance_customer.credit_limit`, both editable).
2. **Controlled duplication** — a derived copy with one authoritative source
   (`Customer.name` → search index).
3. **Required historical duplication** — a snapshot preserving what was true at a point in
   time (`Invoice.billing_address_snapshot`).

§23 requires every authoritative fact to carry `owner_entity`, `owner_field`, `authority`,
`version`. §24–25 require derived data to **declare its source** and to be marked
`authority = derived`, so the AI never mistakes a cached value for an independent fact.

The core anti-redundancy rule (§171): **one business fact, one authority.**

---

## 8. Document 5 — schema evolution: dependency graph, impact, propagation

### 8a. Schema changes are model changes (§33–34)

`ALTER TABLE` is never the first operation. The change pipeline is a 13-stage sequence:
request → model proposal → semantic validation → dependency analysis → impact analysis →
migration planning → artifact generation → automated tests → preview → approval → migration
→ post-migration verification → publish model version.

§35 adds **model diff** as a first-class artifact — a structural description (ADDED ENTITY,
ADDED FIELD, ADDED RELATION, ADDED COMMAND, ADDED VIEW), which the document says is *"much
more useful than an SQL migration alone"*.

### 8b. The dependency graph (§36–38)

Every artifact records `depends_on` and `used_by`. §37 names **9 dependency classes**:
structural, semantic, execution, security, UI, analytics, AI, documentation, migration.
§38 lists **12 things a model change must trigger**: database migration analysis, API
regeneration, MCP schema update, AI semantic update, skill regeneration/revalidation,
Function compatibility analysis, UI regeneration, metric validation, workflow validation,
permission analysis, documentation regeneration, tests.

§39 constrains it: **do not regenerate everything blindly.** Only affected artifacts. The
worked example: changing `Product.description` affects product search, product UI and
product AI description — *not* payroll, accounts payable or the tax engine.

### 8c. Impact classification (§82) — 6 classes

Measured: `INFO`, `SAFE`, `REQUIRES_RECOMPILE`, `REQUIRES_REVIEW`, `BREAKING`, `BLOCKED`.

§83 works one through: renaming `Customer.name` → `Customer.display_name` gives database
migration `SAFE`, API/UI/AI registry `REGENERATE`, search `REBUILD`, Functions `RECOMPILE`,
Skills `REVIEW`, external integrations `REVIEW`, historical data `MIGRATION`.

### 8d. Migrations and health (§84–89)

- **Expand → backfill → switch readers → switch writers → validate → contract.** Never a
  destructive one-step migration.
- **Structural health checks** (9): orphaned records, broken references, duplicate
  identities, invalid enum values, cross-tenant references, unexpected nulls, constraint
  violations, schema drift, stale projections.
- **Semantic health checks** (7): multiple authoritative owners, duplicate metrics,
  duplicate fields, conflicting relationship definitions, unreachable entities, isolated
  entities, unused entities.
- **The database island detector** (§89) — this is the one batch 9 needs:

> identify **entity with no meaningful relationships** · **capability with duplicated master
> data** · **parallel identity systems** · **isolated reporting tables** · **manual
> synchronization dependencies** → report *"Potential data island detected."*

---

## 9. The rule the batch was asked to capture

> **§Executive Summary: "Maximize semantic connectivity; minimize unnecessary physical
> coupling."**

And §113 defines each half precisely, which is the part that matters:

**Maximise**: semantic reuse, canonical identity reuse, relationship clarity, shared
vocabulary, cross-capability discoverability, lineage.
**Minimise**: duplicate facts, duplicate identities, duplicate vocabulary, manual
synchronization, isolated reporting models, implicit relationships.
**Do NOT maximise**: number of foreign keys, number of cross-module dependencies, physical
joins.

§19 makes the negative case: adding foreign keys everywhere produces coupling, circular
dependencies, hard migrations, unclear ownership and performance problems. §146 answers the
obvious objection — **connected does not mean slow**: the compiler generates indexes,
materialised views, projections, caches and analytic read models while preserving canonical
semantics.

---

## 10. Document 5's rule-sets, and how they relate

Document 5 states its rules twice, plus four checklists:

| Artefact | Where | Count (measured) |
|---|---|---|
| "Database constitution" | §138 | **25** |
| Final non-negotiable rules | Part LX | **45** |
| Entity scorecard | §114 | **17** questions |
| Field checklist | §115 | **14** items |
| Relationship checklist | §116 | **10** items |
| Schema-change checklist | §117 | **16** items |

**How the 25 and the 45 relate — measured by inspection, not assumed:** every one of the 25
constitution rules has a counterpart in the 45; the 45 is a **superset**. The families the
45 add are: capability boundaries (rules 3, 4, 5); connectivity versus foreign-key density
(7, 8); creation guards (18, 19, 20, 21); regeneration scope (26); expanded impact for core
entities (28); safe rollout (29); the AI-facing projection rule (31); continuous linting and
island detection (36, 37); bounded contexts and reuse-before-creation (39, 40);
denormalisation-with-lineage (41, 42); one governed change process (43); reconstructability
(44).

**The 25-item constitution, quoted** — it is the shortest complete statement of the data
rule-set:

> 1. One canonical owner for each authoritative fact.
> 2. No duplicate master identity without explicit semantic justification.
> 3. Every meaningful cross-capability relationship is represented.
> 4. Every entity has an explicit semantic owner.
> 5. Every entity has a defined grain.
> 6. Every field has a type.
> 7. Money and quantity include their units/currency.
> 8. Every metric has a definition and grain.
> 9. Every command has explicit preconditions and authorization.
> 10. Every capability declares its public contracts.
> 11. Physical schema is derived from the logical model.
> 12. Direct production DDL outside the model compiler is considered schema drift.
> 13. Model changes are versioned.
> 14. Dependencies are tracked.
> 15. Breaking changes require review.
> 16. Derived data declares its source.
> 17. Historical snapshots are explicitly classified.
> 18. Search/analytics/vector stores are projections, not independent truth.
> 19. Tenant ownership is explicit.
> 20. Cross-tenant references are prevented below the AI layer.
> 21. AI artifacts reference canonical IDs, not loose strings.
> 22. User Functions reference Business IR and dependencies, not only compiled SQL.
> 23. Skills are procedural projections, not authoritative policy.
> 24. Documentation is generated or synchronized from the canonical model.
> 25. Every schema change triggers dependency analysis.

**Rule 12 is the sharpest one in either document.** *"Direct production DDL outside the
model compiler is considered schema drift."* That is a testable, binary assertion about how
the team must work — and it is the rule most likely to be quietly broken.

---

## 11. The normative register

### Document 4 (N4) — 38 statements

| ID | Statement | § |
|---|---|---|
| N4-01 | Build a platform whose structure makes intelligence inexpensive. | 1 |
| N4-02 | AI for uncertainty; software for certainty. | 2 |
| N4-03 | Model intelligence is an interchangeable resource; bind to no model, vendor, engine or API. | 3 |
| N4-04 | Use Hermes for agent-level model orchestration where its abstractions fit; do not rebuild the agent loop to add a model selector. | 4 |
| N4-05 | Add a platform-level Model Policy layer above Hermes' model management. | 5 |
| N4-06 | The application depends on `ModelRuntime`, never on an engine's API directly. | 9, 38 |
| N4-07 | Separate model capability from model identity; never hard-code a model as a semantic role. | 10 |
| N4-08 | Create a platform-owned Model Registry describing what each model can actually do. | 11 |
| N4-09 | Never silently change the model behind a deterministic Function; if a Function has an AI step, record the model policy/version. | 13 |
| N4-10 | Do not keep every model container permanently loaded. | 16 |
| N4-11 | Control `models_max`, idle timeout and resource admission; many model choices ≠ many models loaded. | 17 |
| N4-12 | Prefer warm primary + cold secondary models. | 19 |
| N4-13 | Optimise retrieval, tool retrieval, skill disclosure, IR compactness and context compaction rather than buying a bigger model. | 20 |
| N4-14 | Never send the whole schema, all documents, all skills, all history or raw dumps. | 21 |
| N4-15 | Use schema-constrained generation for IR, extraction, classification, routing, function definitions and schema proposals. | 22 |
| N4-16 | Tool calls are business-domain calls, never `execute_sql`. | 23 |
| N4-17 | Treat speculative decoding / draft models as infrastructure, not business logic. | 25 |
| N4-18 | Model routing is mostly deterministic; the classifier may use a small model but selection obeys policy. | 26 |
| N4-19 | Use a 13-class platform task taxonomy; each class declares its requirements. | 27 |
| N4-20 | Do not use model self-reported confidence as the escalation mechanism; use structural validation. | 29 |
| N4-21 | Escalate on named triggers; do not escalate merely because the response is long. | 30 |
| N4-22 | The router emits a structured, auditable decision. | 31 |
| N4-23 | Tenant model policy is enforced before any request reaches a provider. | 32 |
| N4-24 | Model routing must respect data classification; the classification comes from the platform, not the LLM. | 33 |
| N4-25 | Use a model family, not one "magic" model; ship a conservative baseline bundle. | 34–35 |
| N4-26 | Do not hard-code a model forever; maintain a validated, swappable model catalog. | 36 |
| N4-27 | llama.cpp is the primary embedded engine; Ollama is supported; neither is the business-facing abstraction. | 38 |
| N4-28 | A User Function is a validated, reusable business operation created with AI assistance and executable without AI. | 39 |
| N4-29 | Do not save raw SQL, the prompt, or the returned data — save the validated logical operation. | 40 |
| N4-30 | The Function artifact carries identity, IR, parameters, dependencies, permissions, versions, policy, result/presentation schema and governance. | 41 |
| N4-31 | Business IR is the durable asset; compiled SQL is a cache/derivative — because schema evolution exists. | 42 |
| N4-32 | Preserve the compiled artifact too, for audit and performance, but not as the source of truth. | 43 |
| N4-33 | Function verification is objective (IR/entities/fields/metrics/relationships/authorization/tenant/plan/result), not "it looked right". | 46 |
| N4-34 | A deterministic Function performs no LLM call at runtime. | 47 |
| N4-35 | Authorization and tenant scope are re-checked on every execution. | 59–60 |
| N4-36 | A Function executes only operations declared in its artifact; no hidden SQL, arbitrary tool or arbitrary MCP. | 69 |
| N4-37 | Every Function has a risk class R0–R4, and execution policy may differ by class. | 70 |
| N4-38 | Skills and Functions are different objects; AI Functions are visibly distinguished from deterministic Functions. | 97, 126–129 |

### Document 5 (N5) — 36 statements

| ID | Statement | § |
|---|---|---|
| N5-01 | One coherent business data architecture, not a collection of independent module databases. | Exec |
| N5-02 | The database architecture is part of the platform's reasoning architecture. | 1 |
| N5-03 | A capability is a boundary, not a data boundary. | 3 |
| N5-04 | Classify every entity as CORE / CAPABILITY / PROJECTION / REFERENCE / EXTERNAL / TEMPORARY, in the Kernel. | 4 |
| N5-05 | An entity becomes core only with cross-capability significance, stable identity, clear ownership and multiple consumers. | 5 |
| N5-06 | Party = identity; Role = business relationship. Do not duplicate identities per role. | 7–8 |
| N5-07 | Reference current master data; snapshot immutable historical facts when the business event requires it. | 9 |
| N5-08 | Relationships are first-class metadata, not foreign keys. | 12 |
| N5-09 | Every relationship declares 14 attributes, including cardinality, ownership, meaning, delete behaviour, authorization inheritance, allowed traversal and aggregation semantics. | 13 |
| N5-10 | Cardinality is explicit; the AI must not infer it. | 14 |
| N5-11 | Distinguish semantic, physical and analytical connectivity; they are not identical. | 20 |
| N5-12 | Redundancy is not automatically bad; distinguish forbidden, controlled and required-historical duplication. | 21–22 |
| N5-13 | Every authoritative fact has one owner, field, authority and version. | 23 |
| N5-14 | Derived data declares its source and is marked derived, not authoritative. | 24–25 |
| N5-15 | Capabilities expose public contracts (entities, relations, metrics, commands, events, permissions) and keep internals private. | 28 |
| N5-16 | Three layers: canonical logical schema → compiled physical schema → runtime database; the logical model is authoritative. | 29 |
| N5-17 | One model, many representations (PostgreSQL, REST/OpenAPI, MCP, UI, AI semantic, analytics, documentation). | 32 |
| N5-18 | A schema change starts as a draft Business Model change, never as `ALTER TABLE`. | 33 |
| N5-19 | A model diff is a first-class artifact, more useful than an SQL migration alone. | 35 |
| N5-20 | Every artifact records `depends_on` and `used_by`. | 36 |
| N5-21 | Track 9 dependency classes. | 37 |
| N5-22 | A model change triggers 12 propagation targets, but only affected artifacts are regenerated. | 38–39 |
| N5-23 | Classify every impact as INFO / SAFE / REQUIRES_RECOMPILE / REQUIRES_REVIEW / BREAKING / BLOCKED. | 82 |
| N5-24 | Migrate with expand → backfill → switch readers → switch writers → validate → contract. | 84 |
| N5-25 | Record migration checkpoints (id, versions before/after, operator, result, verification, rollback). | 86 |
| N5-26 | Continuously lint structural, semantic and data health, including island detection. | 87–89 |
| N5-27 | Every derived artifact has lineage; an AI answer explains from deterministic lineage. | 90–91 |
| N5-28 | Freshness is explicit, and the AI must not present stale data as current. | 92–93 |
| N5-29 | External data is not automatically core truth; map external identities into the canonical model. | 94–96 |
| N5-30 | Documents reference canonical entities; extracted text is evidence, not business state. | 97–98 |
| N5-31 | The AI sees the business graph, not the physical graph, and cannot invent relationship edges. | 99–101 |
| N5-32 | Use a relationship entity when a relationship carries dates, role, percentage or territory. | 104 |
| N5-33 | Relational storage is the default transaction substrate; graph, event store, documents and vectors are projections. | 107–110 |
| N5-34 | Reuse before creation; check for duplication before adding an entity, field or relationship. | 170 |
| N5-35 | Business model first: semantic decision → logical model → physical implementation. | 168 |
| N5-36 | Model evolution and AI evolution are one governed change-propagation process. | 143 |

### Agreement with earlier batches

These documents restate, independently, rules already registered: AI-for-uncertainty
(N4-02 ≈ N1-23 ≈ N3-29); IR-not-SQL (N4-31 ≈ N1-03 ≈ N3-12); explicit grain and approved
paths (N5-10 ≈ N3-27/N3-28); authorization below the AI (N5-20 ≈ R-08); profiles/state.db/
memory are not business truth (N4-22…N4-24 ≈ R-03…R-05); schema change is a model change
(N5-18 ≈ N3-21 ≈ R-14). **The convergence count across the programme is now substantial**,
and it is the strongest available evidence that these documents and our own design are
aiming at the same thing.

---

## 12. Critic pass — is "User Function" just a stored query with a better name?

The batch-3 tickbox asks for this attempt by name. I made it properly, and it **partly
succeeds**. Recording both the success and the refutation, because a critic pass that
finds nothing did not run.

### Where the criticism lands

- **Type 1 (Deterministic Query Function) is literally a stored query.** §50: *"Business
  Query IR → deterministic query."*
- **Type 3 (Parameterized Report Function) is literally a saved report with inputs.** §52.
  Every ERP since the 1990s has these.
- The document half-admits it. §48: *"It becomes indistinguishable from traditional ERP
  functionality… is just a normal ERP button."*
- The "Save as Function" button is a UI affordance. On its own it proves nothing.

So for Types 1 and 3, the criticism is **correct**. If that were the whole concept, the
document would be describing saved queries.

### Where the criticism fails

Four things distinguish the concept, and each is testable:

1. **What is stored.** A stored query stores SQL text. A Function stores **Business IR +
   dependencies + versions** (§40, §41, invariant 12). Different artefacts, different
   failure behaviour.
2. **Dependency metadata and automatic invalidation.** A stored query has no dependency
   graph and no compatibility verdict. A Function must answer *compatible / requires
   recompilation / requires review / invalid* when a dependency changes (§66–67). Stored
   queries cannot do this.
3. **Four of the six types are not query-shaped at all.** Type 2 is a **governed mutation**
   with preconditions, policy, transaction and postconditions. Type 4 launches a
   **workflow**. Type 5 is **composite**. Type 6 contains **AI** and must be labelled
   differently. A stored query cannot express a governed business command.
4. **Governance.** Scope hierarchy, versioning, risk class R0–R4, publication review,
   mandatory re-authorisation, tenant revalidation, and an audit record of every invocation.
   Stored queries are normally per-user and ungoverned.

### The decisive test — which the document never states

The document supplies the refutation but never turns it into a gate. The gate is derivable,
and it should be written down:

> **Rename a field. `Invoice.status` → `Invoice.state`.**
> A stored query breaks, or silently returns nothing.
> A User Function, if it truly stores Business IR, either recompiles itself or reports
> *"requires recompilation"* — with no human rewriting it.
>
> **If the artefact does not survive a schema change without human rewriting, it is a stored
> query, whatever it is called.**

Document 5 §106 states this test in the data document's own words (*"Function remains
logically valid → recompile → new physical query. This is one of the strongest arguments for
Business IR"*), and Document 4 §42 states it as the reason not to save SQL. **Neither states
it as the acceptance criterion.** Recording that as a gap in the vision, and the test above
as the criterion we should adopt.

### What the pass could not break

The counts (32, 25, 45, 17, 14, 10, 16, 9, 6, 6, 13, 26, 28, 8, 5) were each measured by
script and re-read against the source. The claim that the 25-item constitution is a subset
of the 45 final rules was checked by reading both lists item by item. The claim that
Document 4's invariants 22–24 restate batch 2's R-03–R-05 was checked against both texts.

### One defect in the source, recorded not fixed

Document 4 numbers its "request decision tree" as `## 133.` under `# Part XXXII — What
should happen on every request`, and then Document 4's section numbering continues at 134+
elsewhere. Section 133 is the only `##`-level numbered section in a document whose every
other section is `#`-level. Cosmetic, but it means "§133" is ambiguous when citing. Recorded.

---

## 13. What both ideas need from us — the shared dependency

The batch-3 question was *what would have to exist in our platform for either to work.*
The two lists in §3g and §4g look different — runtime concerns versus data concerns — but
they **converge on one thing**:

| Local-first needs | User Functions need | Both require |
|---|---|---|
| schema-constrained IR output | IR as the durable artifact | **Business IR** |
| small semantic context | dependency metadata | **a Business Model Kernel** |
| validation before execution | recompile after change | **a compiler from IR** |
| benchmarked models | compatibility verdicts | **a dependency graph** |

**Every one of the two lists bottoms out in the same four things.** Local-first without
Business IR means the model must be big enough to be trusted with prose — which defeats
local-first. User Functions without a compiler means the stored artifact is SQL — which
makes it a stored query. So:

> **The Business Model Kernel + Business IR + a compiler + a dependency graph is the single
> prerequisite for both of this batch's headline ideas.** Neither can be built first; both
> can be deferred behind the same work.

This is the most useful output of batch 3, and it is the thing to carry into the
development plan (batch 12).

---

## 14. Definition of done

| Requirement | Status |
|---|---|
| Local-first understood well enough to say what must exist | **Met** — §3g, 8 concrete prerequisites, all runtime concerns |
| User Functions understood well enough to say what must exist | **Met** — §4g, 9 concrete prerequisites, all platform concerns |
| The Model Runtime abstraction and the model registry | **Met** — §3b |
| Local-first: llama.cpp, Ollama, cloud as escalation; hardware assumed | **Met** — §3e (three tiers: minimal VPS, 8–16 GB GPU, 24–80+ GB) |
| What a Function actually stores | **Met** — §4b, 28 declared fields; IR + deps + versions, not SQL, not data |
| Core vs capability data, defined precisely | **Met** — §5b |
| The relationship fabric; why relationships are first-class | **Met** — §6 |
| Schema evolution: dependency graph, impact, propagation, drift | **Met** — §8 |
| The rule *maximise semantic connectivity; minimise unnecessary physical coupling* | **Met** — §9, with both halves defined |
| Extract and number the normative statements | **Met** — 38 (N4) + 36 (N5) = **74** |
| Critic pass: try to show "User Functions" is stored queries | **Met** — §12: partly succeeds; refuted on four grounds; **decisive test supplied** |

**Batch 3 is complete.** Per the plan: report written, boxes ticked, one line in `LOG.md`,
then stop.

---

## 15. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **Is the 64K-token minimum context requirement real?** Doc 4 §20 states it as a Hermes constraint; it decides whether the minimal VPS tier works | Batch 7 — **highest-value claim from this batch** |
| 2 | Doc 4's Hermes capability claims (§4, §80): main+auxiliary slots, local/Ollama/llama.cpp support, provider switching, the auxiliary roles list | Batch 7 |
| 3 | Doc 4's hardware guidance (§110): "8 GB+ GPU runs small catalog models; 16 GB+ supports 27–35B at high quality" | Batch 7 |
| 4 | **The database-island question** — the vision defines the test (§89, §135); we run **136 tables across 39 modules**. Do we actually have islands? | Batch 9 |
| 5 | **The decisive Function test** (rename a field; does it survive?) — adopt as an acceptance criterion | Batch 12 |
| 6 | The gap: the vision never states the minimum bar separating a Function from a stored query | Batch 12 |
| 7 | Function vs Workflow vs Skill vs Capability — four overlapping words across three documents | Batch 10 |
| 8 | Doc 4's `## 133` numbering defect | Recorded; not ours to fix |
| 9 | Doc 5's rule 12 — *"direct production DDL outside the model compiler is schema drift"* — is a working-practice rule, not just a technical one | Batch 12 |
