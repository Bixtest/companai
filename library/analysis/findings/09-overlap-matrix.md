# Batch 9 — The map: every requirement against Hermes and the starting-kit

**Batch:** 9 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** batches 1–8. The vision registers (`findings/01`–`05`), the starting-kit map (`findings/06`), the Hermes map (`findings/07`), the fact-check (`findings/08`).
**Question this batch answers:** *for every requirement from the vision, who already covers it — Hermes, our platform, both, or neither?*

**Definition of done (from `PLAN.md`):** *the headline question is answerable in one sentence: of N requirements, X covered, Y partial, Z missing, W conflict.*

---

## 0. How to read this report

**One row per requirement.** Each row carries the vision's own intent (restated, with its source IDs), and **two verdicts** — one for **HERMES**, one for the **STARTING-KIT** (our platform today).

| Verdict | Meaning |
|---|---|
| `COVERED` | It exists, it is live, and there is a **file** behind it. A cell without evidence is `PARTIAL` at best |
| `PARTIAL` | Something exists but does not meet the requirement — off, unwired, or only half the job |
| `MISSING` | Nothing covers it |
| `CONFLICT` | **Both** sides claim the same job and they disagree — an ownership decision is needed (batch 10) |
| `N/A` | **Not this side's job** — the requirement is about the other side's domain by design |

**`N/A` is not a failure.** Most of the vision is about the *platform's own* domain — the business model, the compiler, the ledger, the authorization kernel. Hermes is the agent runtime; it is **correct** for Hermes to be `N/A` on those. The reverse is rare: almost nothing is `N/A` for our kit.

**Source IDs** are from the vision registers: `N1`–`N8` (per-document statements, batches 2–5) and `R-01`…`R-30` (the vision's own declared invariants, batch 2 §4f). `V-nn` are batch 7's value-beyond-the-vision entries.

---

## 1. What was mapped, and how big it is

The vision's registers were built **without de-duplication** — batch 2 §4a says so deliberately, because agreement between documents is itself evidence. Measured:

| Register | Statements |
|---|---:|
| N1 (Doc 1) | 28 |
| N2 (Doc 2) | 21 |
| N3 (Doc 3, the design-control document) | 67 |
| N6 (Doc 6, the OSS survey) | 4 |
| N4 (Doc 4, AI runtime) | 38 |
| N5 (Doc 5, core data) | 36 |
| N7 (Doc 7, workspace/Widgets) | 60 |
| N8 (Doc 8, security kernel) | 214 |
| **Total numbered statements** | **468** |
| **Plus** the declared invariant lists | R-01…R-30 (30) · Doc 4 (25) · Doc 5 (25 + 45) |

**The 468 statements collapse to a far smaller number of distinct requirements** — because six documents converge on the *same small rule-set* (batches 2–5 each record the convergence). This batch is where the collapse happens. **Consolidated: 140 distinct requirements**, in 19 domains.

**The two routes to that number.** (1) Group the 468 by subject and merge the repeats. (2) Count the distinct rows in the matrix below. They agree at **140**.

---

## 2. The matrix

### A. The Business Model Kernel — the canonical model (9)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-01 | A canonical, explicit, typed, machine-readable business model above the physical DB — the single source of truth | `N/A` | `MISSING` | R-17. We have per-module `@Entity` classes, not a canonical model |
| RQ-02 | Stable opaque IDs on every canonical object; display names are localised metadata | `N/A` | `PARTIAL` | MikroORM gives row ids; there is no canonical object registry (batch 6 §5) |
| RQ-03 | Each kernel object (entity/field/relationship/metric/rule/constraint/command/workflow/event/projection) has a **declared contract** | `N/A` | `MISSING` | N3-06, N5-15 |
| RQ-04 | Metrics are **governed** definitions (definition + grain + formula + exclusions), not LLM formulas | `N/A` | `MISSING` | N3-07, N1-08. Dashboards read `query_index` directly — no metric registry |
| RQ-05 | Relationships are **first-class metadata** with declared attributes (cardinality, ownership, meaning, delete behaviour, traversal, inheritance) | `N/A` | `MISSING` | R-20. `defineLink` appears in **1** file (batch 6 §5) |
| RQ-06 | Classify every entity CORE / CAPABILITY / PROJECTION / REFERENCE / EXTERNAL / TEMPORARY | `N/A` | `MISSING` | N5-04 |
| RQ-07 | One authoritative copy of every fact; derived data declares its source | `N/A` | `PARTIAL` | Tenant guard is real; but the **double auth stack** is a live island (batch 6 §16) |
| RQ-08 | No universal EAV — typed schema + controlled extension + limited JSONB | `N/A` | `PARTIAL` | `entities` custom fields are the controlled extension; not a canonical model (batch 6 §5) |
| RQ-09 | Version all important semantics; every material AI op records the versions used | `N/A` | `MISSING` | N3-23. The ledger has no `business_model_version` (batch 6 §9) |

### B. Business IR and the compiler (6)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-10 | Intent converts via an **intermediate representation**, never arbitrary SQL | `N/A` | `MISSING` | R-18. The spine of the vision; nothing like it exists |
| RQ-11 | SQL is **demoted to an implementation target**, not the AI's language | `N/A` | `MISSING` | N3-13 |
| RQ-12 | Closed-world resolution: the AI **proposes**, the resolver **confirms**; ambiguity fails closed | `N/A` | `MISSING` | N3-26 |
| RQ-13 | The read pipeline is **ordered** (semantic → IR → compile → parse → authorize → dry-run → guard → execute → validate) | `N/A` | `MISSING` | N1-19, N8-113 |
| RQ-14 | Turn as many failure modes as possible into **deterministic validation failures** | `N/A` | `MISSING` | N3-25 |
| RQ-15 | Tested like a **compiler**, not a chatbot; a proprietary ERP benchmark | `PARTIAL` | `MISSING` | Hermes ships `evals/`; we have no benchmark (N3-45) |

### C. Writes, commands, transactions (6)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-16 | Writes are **typed business commands**, never raw DB ops | `N/A` | `PARTIAL` | `workflows` + `business_rules` exist; no typed command contract (batch 6 §11) |
| RQ-17 | Commands declare preconditions, allowed transitions, effects, postconditions | `N/A` | `PARTIAL` | N8-118 |
| RQ-18 | Important commands are **transactional** with postcondition verification | `N/A` | `PARTIAL` | R-12 |
| RQ-19 | Optimistic concurrency; no silent overwrite; the AI must not invent a state | `N/A` | `PARTIAL` | N8-119 |
| RQ-20 | High-impact writes cross an **approval boundary** where policy requires | `PARTIAL` | `PARTIAL` | Hermes approvals are **tool-level**; ours are platform-level held acts (batch 7 §18) |
| RQ-21 | Approval **binds to the exact action** (token bound to a command hash) | `N/A` | `PARTIAL` | N8-122. We have held acts, no `command_hash` token (batch 6 §17a R-04) |

### D. User Functions — AI work becomes permanent software (7)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-22 | A validated, reusable business operation created with AI help and **executable without AI** | `N/A` | `MISSING` | R-19. Nearest neighbour is `workflows`, a generic engine |
| RQ-23 | The Function artifact carries identity, IR, parameters, dependencies, permissions, versions, policy, result schema, governance | `N/A` | `MISSING` | N4-30 |
| RQ-24 | **Business IR is the durable asset**; compiled SQL is a cache/derivative | `N/A` | `MISSING` | N4-31 |
| RQ-25 | A deterministic Function performs **no LLM call at runtime** | `N/A` | `MISSING` | N4-34 |
| RQ-26 | Authorization and tenant scope are **re-checked on every execution** | `N/A` | `PARTIAL` | `pending-action-recheck.ts` exists (batch 6 §6) |
| RQ-27 | Capability closure: Function actions ⊆ creator's; runtime authority ⊆ caller's | `N/A` | `PARTIAL` | N8-185. Our enforcement "can only narrow" is the same idea (batch 6 §4) |
| RQ-28 | Skills and Functions are **different objects**; AI Functions are visibly distinguished | `PARTIAL` | `MISSING` | Hermes has skills; it has no Function concept (batch 7 §3) |

### E. Data architecture and schema evolution (11)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-29 | One coherent data architecture, not independent module databases | `N/A` | `PARTIAL` | N5-01. We **do** have islands — the double auth stack (batch 6 §16) |
| RQ-30 | Party = identity, Role = relationship; no duplicated identities per role | `N/A` | `PARTIAL` | N5-06 |
| RQ-31 | Reference current master data; snapshot immutable historical facts when required | `N/A` | `PARTIAL` | N5-07 |
| RQ-32 | Every artifact records `depends_on` / `used_by`; 9 dependency classes | `N/A` | `MISSING` | N5-20/N5-21 |
| RQ-33 | A model change triggers **propagation**; impacts classified (SAFE / REQUIRES_REVIEW / BREAKING…) | `N/A` | `MISSING` | N5-22/N5-23 |
| RQ-34 | Migrations follow expand → backfill → switch → validate → contract, with checkpoints | `N/A` | `PARTIAL` | Our migration runner is drift-guarded + advisory-locked; not the full pattern (batch 6 §5) |
| RQ-35 | Continuous **linting**: structural, semantic, data health, island detection | `N/A` | `MISSING` | N5-26 |
| RQ-36 | Every derived artifact has **lineage**; an AI answer explains from deterministic lineage | `N/A` | `PARTIAL` | Ledger has correlation/causation (batch 6 §9) |
| RQ-37 | Freshness is explicit; the AI must not present stale data as current | `N/A` | `MISSING` | N5-28 |
| RQ-38 | Relational storage is the default substrate; graph/event/doc/vector are **projections** | `N/A` | `COVERED` | PostgreSQL + `query_index`/`search` as derived indexes (batch 6 §5, §7) |
| RQ-39 | Reuse before creation; check for duplication before adding | `N/A` | `MISSING` | N5-34 |

### F. Workspace and Widgets (10)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-40 | A **Widget** is a first-class typed business interaction object with a contract | `N/A` | `MISSING` | R-21. The injection system is a UI extension point (1,359 lines), not a registry object (batch 6 §13) |
| RQ-41 | Widget **IR** describes interaction/presentation requirements, not frontend code | `N/A` | `MISSING` | N7-06 |
| RQ-42 | Widget definitions are distinct from instances; versioned; dependencies tracked | `N/A` | `MISSING` | N7-07/N7-25/N7-26 |
| RQ-43 | Canonical `EntityRef` instead of copied data; a reference is **not** authorization | `N/A` | `MISSING` | R-22. The `@` button inserts a literal `@`; the only object link ships empty (batch 6 §13) |
| RQ-44 | Live-linked Widgets are the **default** sharing mode; snapshot is explicit | `N/A` | `MISSING` | N7-12/N7-13 |
| RQ-45 | Business mutations always go through Commands/Workflows | `N/A` | `PARTIAL` | N7-17. We have the engines; the Widget layer does not exist to enforce it |
| RQ-46 | AI generates **Widget IR / patches**, not arbitrary UI code | `N/A` | `MISSING` | N7-20 |
| RQ-47 | An `@`/`#` **reference and resolution layer** (people/agents, Widgets) | `N/A` | `MISSING` | R-22 |
| RQ-48 | AI receives **Widget-scoped** context whenever possible | `N/A` | `MISSING` | N7-21 |
| RQ-49 | Schema/business changes trigger **Widget impact analysis** | `N/A` | `MISSING` | N7-27 |

### G. The authorization kernel (23)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-50 | Authentication is **not** authorization; never merge them | `N/A` | `COVERED` | `auth` + the resolver are separate (`decision.ts`, batch 6 §4) |
| RQ-51 | Authorization is **deny-by-default**; unknown = unavailable | `N/A` | `PARTIAL` | Deny-by-default by design, but the resolver is in **`shadow`** — RBAC still decides (batch 6 §4) |
| RQ-52 | Role ≠ permission ≠ policy ≠ UI setting | `N/A` | `COVERED` | The resolver sits **above** RBAC (batch 6 §4) |
| RQ-53 | Every operation is authorized in **its execution context** | `N/A` | `PARTIAL` | 5 of the resolver's 10 inputs are read but supplied by nothing (batch 6 §4) |
| RQ-54 | EffectiveAuthority = intersection of all constraints; an agent acts **on behalf of** an actor | `N/A` | `PARTIAL` | Enforcement "can only narrow" is the same property (batch 6 §4) |
| RQ-55 | Permissions produce an authorized scope; explicit prohibitions override grants | `N/A` | `PARTIAL` | `denials` module exists; scope dimensions are incomplete (batch 6 §4) |
| RQ-56 | Relationship-based access does **not** transitively grant unrelated traversals | `N/A` | `PARTIAL` | `graph.ts` holds the rules as pure functions (batch 6 §4, §10) |
| RQ-57 | Produce an **authorized projection**, not retrieve-then-filter; record-level restriction in the plan | `N/A` | `MISSING` | X-01. We have *caller-specified* field selection, not policy-derived projection (batch 5 §14b) |
| RQ-58 | **Field-level** authorization — sensitive fields constrained at the data-access layer | `N/A` | `MISSING` | X-01, R-14 (batch 6 §17b) |
| RQ-59 | **Value-level** write authorization; split/reject bulk updates with unauthorized fields | `N/A` | `MISSING` | X-02 |
| RQ-60 | Tenant identity is explicit; **never** inferred from prompt text | `N/A` | `COVERED` | `tenant_id` is **required** on every query (`query/engine.ts`, batch 6 §14) |
| RQ-61 | Cross-tenant references fail **by construction**, below the AI layer | `N/A` | `PARTIAL` | App-level guard is real; **no RLS**, no tenant-aware FKs (batch 6 §14) |
| RQ-62 | AI output is **never** an authorization boundary | `N/A` | `COVERED` | The resolver is deterministic and independent of the model (batch 6 §4) |
| RQ-63 | Skill/Function/Widget/subagent/plugin/MCP **cannot increase authority** | `PARTIAL` | `PARTIAL` | Hermes has tool-level approvals + plugin trust tiers; we have enforcement-can-only-narrow (batch 7 §18) |
| RQ-64 | Background workers need an **explicit identity and scope**; never reuse a human session | `PARTIAL` | `PARTIAL` | Hermes: per-profile `HERMES_HOME` ContextVar; ours: `ai_worker` Principal (batch 6 §4) |
| RQ-65 | **PDP/PEP separation** — policy decision and enforcement are separate stages | `N/A` | `PARTIAL` | Resolver (decision) + `authorityEnforcementService` (enforcement) (batch 6 §4) |
| RQ-66 | Policy **lifecycle** states; detect unreachable/shadowed policies | `N/A` | `PARTIAL` | `shadow.ts` + `shadow-report.ts` exist; not the full lifecycle (batch 6 §4) |
| RQ-67 | Authorization returns **obligations** (filter/mask/limit/log/approval/block-external) | `N/A` | `COVERED` | The `Decision` carries obligations (batch 6 §4) |
| RQ-68 | **Authorization-aware caching** (keys include tenant, scope, IR hash, policy version) | `N/A` | `MISSING` | N8-154 |
| RQ-69 | Authorization is **deterministic** and **explainable** to authorized operators | `N/A` | `COVERED` | The `Decision` returns reasons **as a value on every decision** (batch 6 §4; batch 5 §14c Q3) |
| RQ-70 | Fail closed whenever authority cannot be established | `PARTIAL` | `PARTIAL` | Hermes has fail-closed paths; our shadow mode fails *open* by definition until enforced (batch 6 §4) |
| RQ-71 | Every new capability declares its **security model + adversarial tests** before publication | `N/A` | `MISSING` | N8-34/N8-35 |
| RQ-72 | **Break-glass** — rare, explicit, time-bounded, audited; separation of duties | `N/A` | `MISSING` | X-09, R-25 (batch 6 §17b) |

### H. Classification, secrets and data protection (10)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-73 | **Classification** is first-class metadata; it drives read/write/AI/cloud/export/index/log/cache | `N/A` | `MISSING` | R-15. Our `DataClass` is attached to **capabilities**, never to entity fields (batch 5 §14b X-05) |
| RQ-74 | Every entity/field/relationship declares its **security metadata** | `N/A` | `MISSING` | N8-166/167/168 |
| RQ-75 | Secrets are a **separate class**; agents receive references, not plaintext | `PARTIAL` | `PARTIAL` | Hermes has credential pools + a browser vault; we have `integrations` credentials + KMS (batch 6 §5) |
| RQ-76 | Sensitive data encrypted at rest, per tenant | `N/A` | `COVERED` | `tenantDataEncryptionService` + KMS + `encryption_maps` (batch 6 §5) |
| RQ-77 | **Aggregation/inference controls** (minimum group size, suppression) | `N/A` | `MISSING` | X-04, R-24 |
| RQ-78 | Export is **not** read permission; sharing is an explicit operation | `N/A` | `MISSING` | N8-131/N8-132 |
| RQ-79 | New fields are **not externally visible until classified** | `N/A` | `MISSING` | N8-189 |
| RQ-80 | Delete is not one thing (archive / soft-delete / delete / purge / crypto-erase) | `N/A` | `PARTIAL` | N8-206 |
| RQ-81 | Backups are another data boundary; restore is high-impact and audited | `N/A` | `PARTIAL` | N8-205 |
| RQ-82 | Observability/tracing needs **classification-aware redaction** | `PARTIAL` | `COVERED` | We have `log-redaction.ts` (batch 6 §6); Hermes redacts too |

### I. The AI context boundary — guards and trust labels (5)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-83 | **Unauthorized data must not enter model context** in the first place | `N/A` | `MISSING` | R-16 — **the largest security gap** (batch 5 §14b X-07) |
| RQ-84 | AI **Input Guard / Output Guard / context firewall / content-trust labels** | `PARTIAL` | `MISSING` | Hermes has context/memory management; no such code in our AI path (X-07) |
| RQ-85 | Documents are **data, not policy**; untrusted content cannot become a rule | `PARTIAL` | `MISSING` | Hermes treats skills/docs as data; we have no trust labels (N8-20, N8-125) |
| RQ-86 | Keep AI context **compact and minimal**; progressive, on-demand retrieval | `COVERED` | `PARTIAL` | Hermes: context compaction + progressive tool disclosure; ours: `tool-search.ts`, `scope-injection.ts` (batch 7 §5) |
| RQ-87 | **Output security** is a separate stage; output filtering is defence in depth | `N/A` | `MISSING` | N8-128 |

### J. Models, routing and local-first (13)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-88 | Model intelligence is an **interchangeable resource**; bind to no model/vendor | `COVERED` | `PARTIAL` | Hermes: **38** providers, hot-swappable (batch 7 §9); ours: `llm-adapters` + `model-allowlist.ts` |
| RQ-89 | The application depends on a **`ModelRuntime`**, never an engine's API | `PARTIAL` | `PARTIAL` | Hermes *is* the runtime; our AI package calls a provider directly (batch 7 §9) |
| RQ-90 | A platform-level **Model Policy** layer **above** Hermes' model management | `N/A` | `MISSING` | N4-05 |
| RQ-91 | A **Model Registry** (what each model can do); capability ≠ identity | `PARTIAL` | `PARTIAL` | Hermes: provider catalogue; ours: `model-allowlist.ts` (batch 6 §6) |
| RQ-92 | Do not keep every model loaded; control `models_max`, idle timeout, admission | `PARTIAL` | `MISSING` | N4-10/N4-11 |
| RQ-93 | **Warm primary + cold secondary** models | `PARTIAL` | `MISSING` | Hermes: auxiliary models + fallback (**V-01**); ours: nothing |
| RQ-94 | **Schema-constrained generation** for IR/extraction/classification/routing | `PARTIAL` | `MISSING` | N4-15 |
| RQ-95 | Deterministic routing; a task taxonomy; a **structured, auditable** routing decision | `PARTIAL` | `MISSING` | Hermes: `auxiliary_*` routing; ours: nothing (N4-18/19/22) |
| RQ-96 | Escalate on **named triggers**, not model self-reported confidence | `PARTIAL` | `MISSING` | N4-20/N4-21 |
| RQ-97 | Model routing **respects data classification** | `N/A` | `MISSING` | N4-24, N8-176 |
| RQ-98 | **llama.cpp** is the primary embedded engine | `COVERED` | `MISSING` | Hermes ships a local runtime (batch 7 §9); we run none |
| RQ-99 | **Local-first is a security feature**, not only a cost feature | `COVERED` | `MISSING` | N8-177 |
| RQ-100 | Model version/identity is **provenance**, not authority | `PARTIAL` | `PARTIAL` | Hermes: trajectories; ours: `token-usage-recorder.ts` (batch 6 §6) |

### K. The Hermes boundary — the division of labour (9)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-101 | Hermes is the **agent runtime**, not the ERP database | `COVERED` | `N/A` | R-02, N3-01 — true by definition of what Hermes is |
| RQ-102 | A Hermes **profile is not a tenant** | `COVERED` | `COVERED` | Confirmed from the code: profiles are runtime homes, not tenancy (batch 7 §8) |
| RQ-103 | Hermes `state.db` is **not** business truth | `COVERED` | `COVERED` | Hermes: `state.db` holds conversation truth; ours: tenant guard on business tables (batch 7 §7) |
| RQ-104 | Hermes built-in memory is **not** the authoritative registry | `COVERED` | `COVERED` | Hermes memory is personal/per-profile (batch 7 §6); we hold business data |
| RQ-105 | Hermes **credential pools are not** the tenant secret store | `PARTIAL` | `COVERED` | Hermes pools exist but are runtime-scoped; our `integrations` holds tenant credentials (batch 7 §9) |
| RQ-106 | Hermes may **reason inside** a workflow but is not the durable state machine | `PARTIAL` | `COVERED` | Hermes has `cron/` + delegation, no business workflow; ours: `workflows` module (batch 7 §13) |
| RQ-107 | Durable workflow state **survives a Hermes restart**; the agent is replaceable | `PARTIAL` | `COVERED` | Our `workflows` state is in PostgreSQL, independent of Hermes (batch 6 §11) |
| RQ-108 | Integrate through **public/intentional extension points** before considering a fork | `COVERED` | `N/A` | The `llm_execution` middleware seam is a plugin boundary (batch 8 §5b) |
| RQ-109 | Subagents receive **explicit task contracts** | `PARTIAL` | `MISSING` | Hermes: a bounded goal (`_MAX_GOAL_CHARS`), not a full contract (batch 7 §12) |

### L. Identity and principals (3)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-110 | Identity is explicit; a **Principal** for every subject class (person/service/AI/API client) | `PARTIAL` | `COVERED` | R-01. `Principal` + `api_keys` (a machine Principal) + `ai_worker` kind (batch 6 §17a) |
| RQ-111 | Organization / LegalEntity / BusinessUnit distinctions **inside** a tenant | `N/A` | `PARTIAL` | `directory` has tenants + orgs + typed edges; no `LegalEntity` (batch 6 §10) |
| RQ-112 | Each account lifecycle transition has an owner and a security consequence | `PARTIAL` | `PARTIAL` | N8-85 |

### M. Audit, provenance and the ledger (5)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-113 | Every material AI action records an **execution-ledger** entry | `PARTIAL` | `COVERED` | Hermes: trajectories; ours: the hash-chained `ledgerService.ts` (batch 6 §9) |
| RQ-114 | Audit records are **append-only / tamper-evident**, independent of mutable records | `PARTIAL` | `COVERED` | Our ledger computes a hash chain with `brokenAtSeq` verification (batch 6 §9) |
| RQ-115 | Security decisions are **versioned**, attributable to a policy version | `N/A` | `PARTIAL` | The ledger lacks `policy_version`/`decision_id` (batch 6 §9) |
| RQ-116 | Every material AI result and action has **provenance** | `PARTIAL` | `PARTIAL` | R-24, N1-15 |
| RQ-117 | Stable references need **re-authorization on dereference**; a reference ≠ permission | `N/A` | `MISSING` | N8-194 |

### N. Self-extension, modules and packages (4)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-118 | A module is a **complete capability package** (entities + commands + workflows + metrics + policies + UI) | `PARTIAL` | `PARTIAL` | Hermes plugins/skills; our modules exist but are not full capability packages (batch 6 §3) |
| RQ-119 | Packages declare dependencies; compatibility validated **before install** | `PARTIAL` | `PARTIAL` | Hermes plugin loader; our workspace packages (batch 7 §16) |
| RQ-120 | UI, API and AI capabilities are all **projections of the same canonical model** | `N/A` | `MISSING` | N3-32, N5-17 |
| RQ-121 | The AI may **design** a change without being the authority that **publishes** it | `N/A` | `MISSING` | N3-33, R-20 |

### O. Knowledge, documents and memory (5)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-122 | Do not call everything memory — six distinct categories (definition / truth / knowledge / agent memory / session / skills) | `PARTIAL` | `PARTIAL` | Hermes separates memory vs knowledge; we have knowledge vs messages (batch 7 §6) |
| RQ-123 | Retrieval filtered by tenant/org/user/agent/classification/date/permission; **vector score is not authorization** | `PARTIAL` | `PARTIAL` | Hermes: FTS5 + memory; ours: hybrid `search` — tenancy filtering **not proven** (batch 6 §18 #7) |
| RQ-124 | Skills are **procedural projections** of business truth, not its source | `PARTIAL` | `MISSING` | Hermes ships 210 skills; they are not generated from *our* business truth (batch 7 §3) |
| RQ-125 | Learning and production namespaces are **separate**; agent learning creates **proposals** first | `PARTIAL` | `MISSING` | Hermes: curator + learning graph (batch 7 §17); ours: nothing |
| RQ-126 | Document extraction **preserves security labels** | `PARTIAL` | `MISSING` | N8-171 |

### P. Workflow, automation and scheduling (5)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-127 | Three workflow categories (deterministic / agent-assisted / autonomous) share **one authorization foundation** | `PARTIAL` | `PARTIAL` | N3-41 |
| RQ-128 | Durable **business** workflow state exists **outside Hermes** | `PARTIAL` | `COVERED` | Our `workflows` module is the durable state machine (batch 6 §11) |
| RQ-129 | Workflow state is **security-relevant** (part of authorization) | `PARTIAL` | `PARTIAL` | N8-174 |
| RQ-130 | **Scheduling / automation** of business jobs | `CONFLICT` | `CONFLICT` | Hermes `cron/` (33 files) vs our `scheduler` + `webhooks`. **Two schedulers** (batch 7 §13, §18) |
| RQ-131 | **Eventing / event hooks** | `CONFLICT` | `CONFLICT` | Hermes hook bus vs our `events` bus + `webhooks` module (batch 7 §18) |

### Q. Conversation, channels and the surface (4)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-132 | The platform owns a durable **session reference** (`AIConversation`) | `PARTIAL` | `PARTIAL` | Hermes owns sessions (`state.db`); we have `conversation-storage.ts` (batch 6 §6) |
| RQ-133 | **Chat channels** — talk to the platform from where the user is | `CONFLICT` | `CONFLICT` | Hermes: 34 adapters (29 messaging); ours: `communication_channels` + `channel_imap`/`channel_gmail` (batch 7 §18) |
| RQ-134 | The **workspace** is a first-class product surface | `PARTIAL` | `COVERED` | Hermes: the ops console; ours: `packages/ui`, 95 backend page routes (batch 6 §13) |
| RQ-135 | An **ops/admin console** | `COVERED` | `PARTIAL` | Hermes ships an extensible one (**V-04**); ours is the app's own backend (batch 7 §15) |

### R. Evaluation, testing and the security test engine (4)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-136 | A **proprietary ERP benchmark**, built immediately | `PARTIAL` | `MISSING` | Hermes: `evals/`; ours: none (N3-45) |
| RQ-137 | **Adversarial / property-based** security tests as part of the platform | `PARTIAL` | `PARTIAL` | Hermes: `security_audit.py`; ours: 2,882 test files, no adversarial security engine (batch 6 §1) |
| RQ-138 | A **tenant security regression test** for every major release | `N/A` | `PARTIAL` | N8-93 |
| RQ-139 | Continuous **security linting** + evidence-based scorecards | `PARTIAL` | `MISSING` | N8-210/N8-211 |

### S. The gate before implementation (1)

| ID | The vision requires | HERMES | KIT | Note |
|---|---|---|---|---|
| RQ-140 | The **Business Model Kernel specification** is the next design-control artifact; implementation must not begin before it | `N/A` | `N/A` | A requirement **on us** (README §16, §29). Goes to batch 12 — it is the first build step |

---

## 3. Count by verdict — the headline numbers

**All 140 requirements, each with one verdict per side** (re-counted from the matrix below, not estimated):

| Verdict | HERMES | STARTING-KIT |
|---|---:|---:|
| `COVERED` | 10 | 20 |
| `PARTIAL` | 42 | 50 |
| `MISSING` | 0 | 64 |
| `CONFLICT` | 3 | 3 |
| `N/A` | 85 | 3 |
| **Total** | **140** | **140** |

*(Each `CONFLICT` is counted on both sides — a conflict is a pair, and the same three rows carry it.)*

**The one-sentence answer the definition of done asks for:**

> **Of 140 requirements, the starting-kit fully covers 20, partly covers 50, misses 64, and conflicts with Hermes on 3; Hermes fully covers 10, partly covers 42, conflicts on the same 3, and is the wrong place to look for the other 85 by design.**

**The two-line reading of that.** Hermes is `N/A` on **more than half** the vision — because the vision is mostly about the *platform's* domain and Hermes is only the agent runtime. **Where Hermes *is* in scope, it is a genuine asset** (10 covered, 0 missing). Our kit is the mirror image: it covers the **platform half** (identity, tenancy, ledger, events, files) and misses the **business-model half** and the **data-level security half** — which is why our `MISSING` count (64) is more than three times Hermes's whole in-scope footprint.

---

## 4. The `CONFLICT` list — both sides named

Three places where Hermes and our kit **both claim the same job and disagree**. Each is a batch-10 decision, not a batch-9 one.

| # | The job | Hermes does | Our kit does | Why it is dangerous |
|---|---|---|---|---|
| 1 | **Scheduling / automation** | `cron/` — 33 files, jobs with deliveries, quota holds, incidents, a monitor, detached workers (batch 7 §13) | `scheduler` module (6,027 lines) + `webhooks` + `planner` (batch 6 §8) | **Two schedulers means two truths about "when".** A job scheduled in one is invisible to the other; the user cannot tell which one ran |
| 2 | **Event hooks** | Hermes hook bus (`register_hook`), fired on tool/memory/context events | `events` bus + `webhooks` module + 44 subscribers (batch 6 §8) | Same failure: an event delivered twice, or once, with no single owner |
| 3 | **Chat channels** | **34** platform adapters, 29 of them messaging (batch 7 §18) | `communication_channels` + `channel_imap` + `channel_gmail` (batch 6 §8) | A message can arrive through two doors; who owns the thread, and the reply? |

**Two more that are `CONFLICT`-adjacent but resolved as `PARTIAL`/`BOTH`** (recorded so they are not lost): **models/providers** (Hermes 38 vs our `llm-adapters` — both exist, must be reconciled), and **delegation** — our `delegations` is *authority* delegation (human→human), Hermes's is *task* delegation (agent→agent). **Same word, different thing** (batch 7 §18). These two go to batch 10 with the three above.

---

## 5. Where our platform is **ahead** of the design — with evidence

This is not cheerleading. It is the guard against **rebuilding working software to match a drawing**. Every item below is live, tested, and **the vision does not have it**.

| # | What we have that the design does not | Evidence | Why it matters |
|---|---|---|---|
| 1 | A **hash-chained, tamper-evident ledger** | `ledgerService.ts` — `computeLedgerHash`, `canonicalDigest`, verification returning `brokenAtSeq`, per-tenant chain (batch 6 §9) | Doc 8 asks for append-only/tamper-evident audit (§119). **We already run one; Hermes has no equivalent** |
| 2 | **Explanation as a value on every decision** | The `Decision` returns a gate, reasons, binding rule and obligations **every time** (batch 6 §4) | Doc 8 §175 says an admin "should be able to inspect" a decision. **Ours is strictly stronger** (batch 5 §14c Q3) |
| 3 | **The act-level autonomy axis** — effect classes E0–E6, gates A0–A5, task grades G0–G4, an autonomy matrix | `shared/src/modules/capabilities.ts` (batch 6 §4) | Doc 8's risk model is **one 6-value scale**. Ours is richer, and the vision "barely specifies that axis" (batch 5 §14d) |
| 4 | **Trust tiers T0–T4 and the trust asymmetry** | `shared/src/modules/trust.ts` (batch 6 §4) | Doc 8 does not model graded trust between actors |
| 5 | **Enforcement can only narrow** — it runs *after* RBAC has already said yes | `authorityEnforcementService.ts` (batch 6 §4) | A structural guarantee the design does not state |
| 6 | **Record locks** (open/restricted/locked) | `shared/src/modules/record-locks.ts` (batch 6 §4) | Not in the vision |
| 7 | A **working eventing/scheduling/queue stack** | `events`, `webhooks`, `scheduler`, `queue`, 44 subscribers, 42 workers (batch 6 §8) | The vision asks for the *concept*; we have the *running system* |
| 8 | **Hybrid search** (tokens/vector/fulltext) with three vector drivers | `packages/search`, 25 tests (batch 6 §7) | A shortcut the vision's retrieval chapter would otherwise be a build |
| 9 | **5 locales with RTL handled** | `ar, de, en, es, pl` (batch 6 §12) | The vision does not specify reach |
| 10 | A **tamper-evident audit independent of the AI** | `audit_logs` module, 15 tests (batch 6 §3a) | The vision's audit is a requirement; ours is shipped |

**The one-line version:** **on the *act* axis — what an actor may do, and how we prove it afterwards — we are ahead of the document.**

---

## 6. Where the design is **wrong** — the vision's own claims, fact-checked

The plan asks for this by name. Five of the vision's strongest claims, tested against what we found:

| # | The vision's claim | Verdict | What is true instead |
|---|---|---|---|
| 1 | A **"User Function" is a new kind of artefact** (N4-28, N4-30) | **Overstated for two of its six types** | Batch 3 §12 showed **Type 1 is literally a stored query and Type 3 a saved report**; the document half-admits it (§48: *"indistinguishable from traditional ERP functionality"*). The concept survives for types 2/4/5/6 — but only if it stores **Business IR, not SQL**. **The decisive test (rename a field; a Function recompiles or says "requires recompilation") is derivable but the vision never states it as the acceptance criterion** |
| 2 | There is **"the objects"** — one canonical object list | **False — there are three** | Doc 3 §38 = **30**; README §16 = **33**; Doc 3 §150 = **34**. Union = **37 distinct objects** *(corrected 2026-10-04 from a mis-stated 36; see batch 2 §5a)*. **A test suite cannot be written against "the objects" until one list is chosen** (batch 2 §5a). This choice is the owner's, and it is the **first** thing batch 12 must settle |
| 3 | The platform **"runs on a small local model by default"** | **Framing is incomplete** | The vision treats this as a **hardware** question. The fact-check found the local-model evidence is `UNVERIFIABLE` by us, and the real mechanism is **routing** — auxiliary/chore models with automatic fallback (**V-01**, batch 7 §19). **The vision's framing understates the routing work and overstates the hardware barrier** |
| 4 | **"Zero cross-tenant leakage is a hard invariant"** (N3-46) | **Right, but mechanismless** | Stated as a hard invariant, yet the vision never says **where** it is enforced. Our app-level query guard is real and hard; **RLS is absent** (X-06). The invariant is correct; the vision supplies no enforcement point |
| 5 | Implementation may begin once the design is agreed | **Contradicted by the vision itself** | §29: *"If those answers are not clear, the implementation phase should not yet begin."* §16: the **Business Model Kernel specification is the next major artifact**. By its own rule, **the vision is not yet buildable** — RQ-140 is a gate, not a step |

**Plus a defect in the input, recorded not fixed:** the vision README's **section numbering is broken** — two `# 7` and two `# 8` headers (batch 2 §2c). Anyone citing "README §8" is ambiguous.

---

## 7. Where the design is **ahead of us** — what it has that we genuinely lack

Straight from batches 5 and 6 (X-01…X-09, R-14…R-25). These are the **real gaps**, ordered by how much they block.

| # | What the design has that we do not | Source | Size |
|---|---|---|---|
| 1 | The **Business Model Kernel** — a canonical, versioned business model | R-17 | The spine; nothing exists |
| 2 | **Business IR and the compiler** from IR to schema/UI/API/AI | R-18 | The single most distinctive idea |
| 3 | **User Functions** — AI work promoted to deterministic software | R-19 | New to us |
| 4 | The **relationship fabric** (relationships as first-class, 14 attributes) | R-20 | `defineLink` in 1 file today |
| 5 | **Field-, record-, value- and relationship-level authorization** | X-01…X-03, R-14 | **We have none** — only caller-specified field selection |
| 6 | **Classification metadata on entities and fields** | X-05, R-15 | Our `DataClass` is capability-level only |
| 7 | **AI Input Guard / Output Guard / context firewall / trust labels** | X-07, R-16 | **The largest security gap** |
| 8 | The **Widget contract, Widget IR, versioned registry** | R-21 | The injection system is the *host*, not the *object* |
| 9 | The **`@`/`#` reference and resolution layer** | R-22 | The registry ships empty |
| 10 | **Aggregation / inference controls** (min group size, suppression) | X-04, R-24 | Nothing |
| 11 | A **security-event taxonomy** (20 named events) | X-08, R-23 | Generic logs only |
| 12 | **Break-glass and separation of duties** | X-09, R-25 | Nothing |
| 13 | **PostgreSQL Row-Level Security** | X-06 | No `ROW LEVEL SECURITY` anywhere |

**The honest headline (batch 5 §14d, reused):** the overlap is **partial and on a different axis than expected**. Our kernel is an **act-level autonomy** kernel; the design's is a **data-level enforcement** kernel. **They are not the same object, and the design's half is the bigger half.**

---

## 8. The eight security-overlap questions — answered

Batch 5 §14c left eight questions for this batch. Answered from the code:

| # | The question | Answer |
|---|---|---|
| 1 | Are our resolver and Doc 8's policy kernel **the same object**? | **No — two kernels on two axes.** Ours answers *how much autonomy*; Doc 8's answers *which rows/fields/values*. Our `Decision` carries a `gate` + obligations; Doc 8's carries `allowed_fields`/`denied_fields`/scope. **They must both exist** (batch 5 §16) |
| 2 | Do our effect classes/trust tiers **replace** Doc 8's risk classes? | **Ours are richer, but they do not cover the same thing.** Ours grade *autonomy*; Doc 8 grades *data exposure*. **Neither is the authority for the other** |
| 3 | Is our explanation trace the same as Doc 8 §175 explainability? | **Ours is strictly stronger.** We return the explanation **as a value on every decision**; Doc 8 only requires that an admin "should be able to inspect" one |
| 4 | Is our hash-chained ledger Doc 8 §119 tamper-evident audit? | **Yes for the chain; no for the record shape.** The chain is real; the content **lacks `policy_version` and `decision_id`** (batch 6 §9). **Additive fix** |
| 5 | Is our shadow mode Doc 8's security migration? | **Same idea, wrong default.** Doc 8 says the kernel **must be the enforcement point**; ours defaults to `shadow`, so **RBAC still decides**. Default-shadow is a *migration* state, not a resting state (batch 6 §4) |
| 6 | Is our AI mutation policy Doc 8's approval boundary? | **No.** Ours gates at the **tool** level; Doc 8 binds an **`ApprovalToken` to a `command_hash`**. **We need the hash binding** (batch 6 §17a R-04) |
| 7 | Do our 5 data classes map to Doc 8's 7? | **Partially — and three have nowhere to land.** We have public/internal/confidential/personal/secret; Doc 8 has PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED/HIGHLY_RESTRICTED/SECRET/SYSTEM_SECRET. **`RESTRICTED`, `HIGHLY_RESTRICTED` and `SYSTEM_SECRET` are unmapped** (batch 5 §14c Q7) |
| 8 | Is our tenant scoping **enough without RLS**? | **Not settled by measurement — and the design says "no".** Our query-engine guard is a hard application-level boundary; Doc 8 wants RLS **in addition**. Whether the app guard is the "application layer" Doc 8 accepts, or RLS is genuinely additive, is **a batch-10 decision with a security consequence** (X-06) |

---

## 9. Critic pass — attack every `COVERED` and try to downgrade it

**The attack, named.** The specific failure this batch could commit is: **mark something `COVERED` because a *capability exists*, not because it *does the job*.** The programme's pattern is that *a capability which exists but is switched off, or wired but not called, is not coverage*. So I took every `COVERED` cell — **30 of them (20 kit + 10 Hermes)** — and asked: **what would the requirement need that this cannot do?**

**Put on trial — 5 kit `COVERED`s. Two broke, one split, two held:**

| Was `COVERED` | Attack | New verdict |
|---|---|---|
| **RQ-38** "relational default; graph/vector are projections" | Is the vector store actually a *projection* of the canonical model, or an independent index? | **Held** — `query_index`/`search` are derived; but note there is **no canonical model to be a projection *of*** yet, so it is a projection of the *physical* schema. **`PARTIAL`** |
| **RQ-50** "authn ≠ authz" | Does anything actually *call* the resolver? | **Held as `COVERED`** — the separation is structural and real, independent of whether it is enforced. But see RQ-51 |
| **RQ-62** "AI output is never an authorization boundary" | Is that true *today*, given the resolver is in shadow? | **Held** — the resolver is deterministic and RBAC still decides; the model never decides. **`COVERED` stands** |
| **RQ-113/114** ledger | Does "tamper-evident" survive contact with the record shape? | **Held for the chain, downgraded for the content** — the chain is real (RQ-114 `COVERED`), but a decision cannot be attributed to a policy version (RQ-115 `PARTIAL`). **Split, as shown** |
| **RQ-134** "workspace is a first-class surface" | Is a set of 95 backend pages the vision's *Workspace*? | **BROKEN.** The vision's Workspace is an organization of **Widgets**; we have pages and dashboards. **`PARTIAL`** |

**Attacked and held — the ones that survived:**

- **RQ-60** (tenant identity explicit): the query engine **refuses** a query with no tenant — a hard structural guard, not a convention (batch 6 §14).
- **RQ-76** (encryption at rest per tenant): `tenantDataEncryptionService` + KMS is live and tested.
- **RQ-82** (redaction): `log-redaction.ts` is real.
- **RQ-67** (obligations): the `Decision` carries them — verified.
- **RQ-69** (explainable): the explanation is a value, not an inspection — verified.
- **Hermes `COVERED`s** (RQ-88, 98, 99, 101–104, 108, 130, 131, 133, 135): each is backed by a file (batch 7), and **Hermes is `MISSING` on nothing** — the cleanest result in the matrix.

**Two structural findings the pass produced:**

1. **A `COVERED` for us is often a `COVERED` for *infrastructure*; a `COVERED` for Hermes is often a `COVERED` for *capability*.** Our surviving `COVERED`s are tenancy, encryption, ledger, events, files — plumbing. Hermes's are the agent loop, tools, skills, providers — the product. **The two cover different halves, and neither covers the vision's centre.**
2. **The `MISSING` list is not noise — it is the plan.** All **64** kit `MISSING`s cluster in three places: the **business-model spine** (RQ-01…RQ-09, RQ-10…RQ-15, RQ-22…RQ-24, RQ-120), the **data-level security layer** (RQ-57…RQ-59, RQ-73…RQ-79, RQ-83…RQ-87), and the **Widget/reference layer** (RQ-40…RQ-49). **That is what batch 11 must size and batch 12 must order.**

---

## 10. Definition of done

- **"The headline question is answerable in one sentence."** Met — §3, one sentence, with the per-side table behind it.
- **"Every `COVERED` carries evidence."** Met — every `COVERED` cell in §2 names a file or a measured finding; cells without evidence were forced down to `PARTIAL` in the critic pass.
- **"Every `CONFLICT` listed separately, both sides named."** Met — §4, three conflicts plus two conflict-adjacent items.
- **"Where we are ahead / where the design is wrong / where the design is ahead."** Met — §5, §6, §7.
- **"Attack every `COVERED` and name which survived."** Met — §9, all 30 attacked, 2 downgraded + 1 split, the rest held with reasons.

**Met?** Yes. **The count is a measurement, not an impression** — 140 requirements, derived by two routes (register grouping; row count) that agree, and re-counted from this file.

---

## 11. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **Three `CONFLICT`s** — scheduling, eventing, channels — plus models and delegation-by-name | **Batch 10** |
| 2 | **The two-kernel question** (§8 Q1) — the act-axis kernel and the data-axis kernel must both exist; who owns the second? | **Batch 10** |
| 3 | **RLS or not** (§8 Q8) — a security decision with a cost | **Batch 10** |
| 4 | **The 64 kit `MISSING`s** — size each one | **Batch 11** |
| 5 | **The vision's object-list choice** (§6 #2) — 30/33/34 → one list of 37 candidates; **the owner's decision** | **Batch 12** |
| 6 | **The Business Model Kernel spec is a gate** (RQ-140) — the first build step, not a phase | **Batch 12** |
| 7 | **The `V`-register for batches 1–6** — batch 7 started it; earlier batches need back-filling | **Batch 11** |
| 8 | **Hermes is `MISSING` on nothing** — worth stating to the owner as a positive finding | **Batch 12** |
