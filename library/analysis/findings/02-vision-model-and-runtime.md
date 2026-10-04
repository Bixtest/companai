# Batch 2 — The vision: why, the model, and Hermes's role

**Batch:** 2 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** vision Documents 1, 2, 3 and 6 (see §1)
**Question this batch answers:** Why does this design exist, what is the Business Model
Kernel, and what exactly is Hermes supposed to do — and not do?

**Definition of done (from `PLAN.md`):** *the Business Model Kernel and Business IR are
stated in terms someone could build a test against, and every claim the vision makes about
Hermes is listed for verification rather than accepted.*

---

## 0. How to read this report

- **`N1-nn` / `N2-nn` / `N3-nn` / `N6-nn`** — a normative statement, numbered, sourced to
  the document it came from. A *normative statement* is anything the document says the
  system **must**, **should**, **must not** or **is** — as opposed to describing the world.
  Rules of thumb that produce one: "X is the source of truth", "never Y", "the platform
  owns Z", "must be validated". They are numbered so later batches can cite them
  individually instead of re-arguing them.
- **`R-01` … `R-30`** — the vision's own declared invariants, quoted verbatim from
  Document 3 §145. These are the highest authority in the set (level 1 of the precedence
  rule in §4f), so they get their own block.
- **`H-nn`** — a **claim about Hermes** made by Document 3. These are *not* accepted. Each
  one is listed in §7 with what would verify it and what breaks if it is wrong. Verifying
  them is batch 7.
- Every count in this report was measured from the files, not estimated. Where two
  measurements disagreed, both are shown.

---

## 1. What was read, and how big it is

The vision set uses its own numbering (README §3–§8, §7, §8). This report uses that
numbering, because the plan's "Doc N" labels collide with it — see §2c.

| Doc | File | Lines | What it is |
|---|---|---|---|
| 1 | `ai_first_erp_research_analysis.md` | 1,623 | The problem statement, and the compiler idea |
| 2 | `ai_first_erp_semantic_database_architecture.md` | 904 | The first statement of the model |
| 3 | `AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md` | 4,254 | **The design-control document** — Hermes forensics + target architecture |
| 6 | `deep-research-report.md` | 115 | The open-source survey |
| | **total read this batch** | **6,896** | |

*(Doc 2 measures 904 lines by `wc -l` — 904 newlines with a trailing newline. The Read
tool numbers a trailing blank as line 905. Both are correct; the difference is what is
being counted, and the plan's "(904)" is the `wc` figure.)*

**Document 3 is 62% of this batch on its own** (4,254 of 6,896 lines). That is proportionate:
it is the only one of the four that draws the Hermes/platform boundary, which is the
boundary batch 7 will measure the real code against.

**A structural measurement worth recording.** The word "Hermes" appears:

| Doc 1 | Doc 2 | Doc 3 | Doc 6 | README | Doc 4 | Doc 5 | Doc 7 | Doc 8 |
|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 166 | 0 | 41 | 37 | 9 | 5 | 26 |

Hermes is **absent from the problem statement, the model statement and the OSS survey**,
and appears for the first time in Document 3. So Hermes is not a premise of the vision —
it is a *decision* the vision makes at Document 3, and then reasons about for the remaining
five documents. That is why Document 3 is the design-control document and not a side note.

---

## 2. What the four documents are for

### 2a. The chain

The four documents are not four drafts of one thing. They form a chain, and each has one job:

1. **Doc 1 answers "why not just let the model write SQL?"** — and replaces it with a
   compiler mental model. It is the *motivation*.
2. **Doc 2 answers "then what is the machine-readable thing instead?"** — and names the
   business model above the database, plus Business IR. It is the *first statement of the
   model*.
3. **Doc 3 answers "where does the agent runtime stop and the platform start?"** — and
   answers it with three kernels, an ownership matrix, and 30 declared invariants. It is
   the *design-control document*.
4. **Doc 6 answers "what already exists that we could use?"** — and surveys 18 open-source
   projects. It is the *reference layer*.

### 2b. One attribution to correct

A working note carried into this batch stated that the OSS research report "explicitly
calls itself reference material rather than the primary architectural authority".
Measured: the phrase **"This is reference material rather than the primary architectural
authority"** occurs at **`README.md` line 446**, inside `# 8. Document 6 — deep-research-report`,
under the heading *"Role"*. It is the **README** saying it *about* Document 6 — not
Document 6 saying it about itself.

Two things to be exact about:

- **The misattribution is not in `01-vision-frame.md`.** I searched that file for
  "reference material", "authority", "OSS reference" and "survey": it contains none of
  them, and its treatment of Document 6 is a count only (1 `must`, 0 `should`, 1
  `required`, 0 `never` — "almost nothing"). The wrong attribution lived in working notes,
  not in the batch-1 report, so **there is nothing in batch 1's file to repair.**
- **The substance holds.** Document 6 asserts no architecture, and batch 1's count already
  showed it. *(Document 6 itself contains no such disclaimer. Document 3 does make the
  equivalent ruling — §111 "should not become a second canonical business-semantic
  system"; §112 "catalog metadata != business semantic authority" — and that is a stronger,
  more specific statement than the README's.)*

### 2c. A defect in the vision README (recorded, not fixed — we do not own this file)

The README's section numbering is broken: two sections are numbered `# 7` and two are
numbered `# 8`.

| README header | Line | Points at |
|---|---|---|
| `# 7. Document 5 — 04_Core_Data_Architecture…` | 361 | Document 5 |
| `# 8. Document 6 — deep-research-report` | 440 | Document 6 |
| `# 7. Document 7 — 05_Widgetized_Collaborative_Workspace…` | 1635 | Document 7 |
| `# 8. Document 8 — 06_Platform_Foundation_and_Security_Kernel…` | 1688 | Document 8 |

The *Document* numbers are correct and in order (1–8). The *section* numbers restart.
Anyone citing "README §8" is ambiguous. **This is why this report cites vision documents by
Document number, and never by README section number.** Recorded as a defect in an input
file; not repaired, because the vision set is not ours to edit.

---

## 3. The problem the vision is actually solving (Document 1)

The whole design exists to fix one specific failure. Document 1 names it precisely, and the
precision is the point:

- **Answer hallucination** — the model invents the number. Doc 1 §1–§3.
- **Query hallucination** — the model writes *syntactically valid SQL that answers the wrong
  business question*. The database executes it perfectly and returns a mathematically
  correct, business-wrong answer. Doc 1 §4: *"Successful SQL execution does not imply correct
  business semantics."*

The second is *worse* than the first, because it is silent and looks authoritative. Every
architectural decision in the remaining eight documents is a defence against it.

**Why schema + documentation is not enough** (Doc 1 §5). A table listing is not a business
model. The document gives the worked example: `REVENUE` must carry a definition, a formula
(gross − discounts − refunds − credit notes), a time basis, and an explicit prohibition
(*"Do not calculate from: invoice_total"*). The prohibition is the interesting part — the
model is being told which *plausible-looking* shortcut is wrong.

**The reframe** (Doc 1 §9, §30). Not "AI that writes SQL", but *"a compiler from human
business intent into governed executable database operations."* The compiler analogy is
load-bearing: a compiler has an IR, a type checker, and a back end — and it *rejects*
programs rather than executing its best guess.

**Five precedents already exist** (Doc 1 §6): Snowflake Cortex Analyst, Databricks Genie,
Microsoft Fabric, Google BigQuery (Gemini), and Microsoft Dynamics 365 ERP Analytics MCP.
Doc 1 §31 draws the honest conclusion from them: **the pattern is not novel**, so the moat
cannot be "we invented NL-to-SQL". The moat must be the ERP-specific semantic, rule,
permission, transaction and workspace layers.

---

## 4. The normative register

### 4a. Method

Read each document end to end; extract every statement that constrains what the system
*must be* or *must do*; number it; attribute it. I did **not** de-duplicate across documents
— where two documents say the same thing, both IDs exist, because the *agreement* is itself
evidence (§4g).

### 4b. Document 1 — the problem statement and the compiler idea (28)

| ID | Statement |
|---|---|
| N1-01 | The AI must not be the calculator or the source of truth; the database computes against real data. (§1) |
| N1-02 | The AI must not ingest raw records into context; it receives structured metadata. (§1) |
| N1-03 | Intent is converted via an intermediate representation, not directly into arbitrary SQL. (§1) |
| N1-04 | MVC is a lower-level application pattern, not the architecture of the product. (§2) |
| N1-05 | The system needs explicit layers for semantic understanding, validation, permissions, deterministic business rules, transaction handling, auditability and query compilation. (§2) |
| N1-06 | Retrieve only relevant semantic context; never send the whole schema per request. (§10) |
| N1-07 | A semantic model must define business definition, grain, synonyms, restrictions and stored value format. (§5) |
| N1-08 | A metric must carry definition, formula, time basis, and explicit "do not calculate from" exclusions. (§5) |
| N1-09 | Read and write are different security domains. (§12) |
| N1-10 | On write, the AI proposes a business operation; deterministic application code owns authorization and execution. (§12) |
| N1-11 | The semantic layer must encode approved join paths, cardinality, grain, aggregation rules, safe metrics and known dangerous joins. (§15) |
| N1-12 | Do not expose every raw table; prefer canonical / analytical views. (§16) |
| N1-13 | Separate transactional from analytical read models; do not run large analytics on the live transactional model. (§17) |
| N1-14 | The workspace is a first-class product surface: tables, charts, forms, reports, filters, drill-downs, workflows, action controls. (§18) |
| N1-15 | Every result carries structured provenance: query, semantic model version, data timestamp, filters, metrics, execution id. (§19) |
| N1-16 | The semantic model is versioned, and every result records the version used. (§20) |
| N1-17 | The AI is never the authority for permissions. (§21) |
| N1-18 | Least privilege is a foundational design principle. (§21) |
| N1-19 | The read pipeline is ordered: semantic validation → query IR → SQL compiler → SQL parse/validate → permission check → EXPLAIN/dry run → cost/row guard → execute → result validation. (§22) |
| N1-20 | The system is tested like a compiler and a business system, not as a chatbot. (§23) |
| N1-21 | The success metric is not "did the SQL compile" but "was the business interpretation and result correct under this user's authorization". (§23) |
| N1-22 | The LLM is a replaceable reasoning engine; durable value is the business semantic and execution layer. (§24) |
| N1-23 | Responsibility split: LLM understands intent; semantic layer understands the business; IR represents intent safely; compiler translates; database computes truth; policy engine controls permission; transaction engine changes state; workspace presents result. (§30) |
| N1-24 | The product is a compiler from human business intent into governed database operations. (§9, §30) |
| N1-25 | The pattern is not novel; differentiation must come from the ERP-specific layers. (§31) |
| N1-26 | Evolution is staged: AI SQL assistant → semantic SQL assistant → query compiler → AI ERP workspace → agentic ERP. (§26) |
| N1-27 | Entity/value resolution is a controlled mechanism (`resolve_entity`), not dataset exposure. (§11) |
| N1-28 | Ten risks are named to design against: wrong query semantics, ambiguity, schema complexity, join errors, value mismatch, security, dangerous writes, query cost, database coupling, semantic maintenance. (§28) |

### 4c. Document 2 — the model statement (21)

| ID | Statement |
|---|---|
| N2-01 | The business model itself must be explicit, typed, validated, self-describing and machine-readable. (§1) |
| N2-02 | The AI understands business intent; deterministic systems determine what is valid and how to execute. (§1) |
| N2-03 | SQL is an implementation detail, not the conceptual language of the ERP. (§1) |
| N2-04 | A canonical business/domain model sits above the physical database. (§2) |
| N2-05 | The physical database may evolve without changing the business concepts the AI understands. (§2) |
| N2-06 | Business IR pipeline: user → LLM → business intent/IR → validator → deterministic planner → database. (§3) |
| N2-07 | Encode business truth structurally: closed value sets and legal transitions. (§4) |
| N2-08 | Business rules are enforced deterministically, not only in a prompt; the AI is not trusted to remember rules. (§4) |
| N2-09 | Relationships are first-class metadata: cardinality, ownership, optionality, meaning, allowed traversal, deletion behaviour, lifecycle dependencies. (§5) |
| N2-10 | Do not make the whole ERP EAV. (§6) |
| N2-11 | A metadata-driven schema compiler turns a logical definition into a typed physical representation. (§6) |
| N2-12 | The ERP front end edits the logical schema, not arbitrary SQL. (§6) |
| N2-13 | ERP customisation is a database/application compilation problem. (§7) |
| N2-14 | Modules are self-describing, machine-readable definitions. (§8) |
| N2-15 | Multiple storage models are allowed, but all conform to one canonical business model. (§9) |
| N2-16 | SQL need not be the AI's native language; IR compiles to SQL, graph, OLAP, API calls, precomputed view or materialised aggregation. (§10) |
| N2-17 | Writes are typed business commands, not raw database operations. (§11) |
| N2-18 | The domain model — not the raw physical schema — is the source of truth. (§15) |
| N2-19 | Anti-hallucination = progressively reduce what the LLM may invent (entities, fields, relationships, enum values, commands); it cannot bypass permissions or rules. (§14) |
| N2-20 | The real question is the canonical representation of business reality; SQL is one compiler target. (§17) |
| N2-21 | The product is an AI-native ERP built around a versioned machine-readable business model from which storage, UI, workflows, permissions, analytics, APIs and AI capabilities are generated. (§18) |

### 4d. Document 3 — the design-control document (67)

Grouped by subject. Section numbers are Document 3's own.

**The boundary and the kernels**

| ID | Statement |
|---|---|
| N3-01 | Hermes is the agent runtime/control plane; a separate Business Platform Kernel is authoritative for tenancy, identity, data semantics, permissions, workflows, commands, schema, migrations, events, audit and business truth. (§0) |
| N3-02 | Hermes learns how to *use* the business system; the platform defines what it *means*. (§0) |
| N3-03 | Three kernels — A Hermes Agent Kernel, B Business Model Kernel, C Data/Workflow Kernel — with the Business Agent Gateway as the contract between A and B/C. (§37) |
| N3-04 | The Business Model Kernel is the canonical source of business meaning. (§38) |
| N3-62 | Never make `tenant_id == hermes_profile` an architectural assumption. (§4) |
| N3-63 | Do not use `hermes_session_id` as a business identifier. (§5) |
| N3-64 | Hermes built-in memory is not the authoritative platform registry. (§7) |
| N3-36 | No cross-tenant business state may become visible merely because two conversations share a Hermes runtime profile. (§91) |
| N3-66 | Hermes credential pools are not the universal tenant secret store. (§35) |
| N3-67 | Training traces are never the authority for business definitions. (§36) |
| N3-54 | Fork Hermes only after a missing extension point is demonstrated and tested. (§20) |
| N3-55 | Declarative capability definitions are the default extensibility mechanism; arbitrary tenant-authored host Python is not normal customisation. (§21) |

**The Business Model Kernel**

| ID | Statement |
|---|---|
| N3-05 | All canonical objects have stable opaque IDs; display names are localised metadata. (§39) |
| N3-06 | Entity, field, relationship, metric, rule, constraint, command, workflow, event and projection each have declared contracts. (§40–48) |
| N3-07 | Metrics are governed semantic definitions, not LLM-created formulas. (§43) |
| N3-08 | Never rely on a prompt to enforce invariants. (§44) |
| N3-09 | Commands are the only normal mutation interface from AI. (§45) |
| N3-10 | Hermes may reason inside a workflow but is not the durable workflow state machine. (§46) |
| N3-11 | Projections are a major anti-hallucination feature. (§48) |
| N3-23 | Version all important semantics; every material AI operation records the relevant versions. (§64) |
| N3-24 | Historical questions are answered with the definition effective at the time. (§65) |
| N3-52 | The platform must not rely on undocumented conventions. (Appendix D) |

**Business IR and execution**

| ID | Statement |
|---|---|
| N3-12 | Business IR replaces direct AI-to-SQL; the AI never needs to write raw SQL. (§49, §51) |
| N3-13 | SQL is not rejected — it is demoted to an implementation target. (§52) |
| N3-14 | The user approves the business command, not an opaque SQL mutation. (§54) |
| N3-25 | Turn as many failure modes as possible into deterministic validation failures rather than language-level mistakes. (§67) |
| N3-26 | Closed-world semantic resolution: the AI proposes, the resolver confirms. (§68) |
| N3-27 | Every analytical request has an explicit grain. (§69) |
| N3-28 | Relationship paths are explicit; the metric definition determines which path is correct. (§70) |
| N3-29 | The platform computes revenue, balance, VAT, margin and inventory value; the model receives result plus provenance. (§71) |
| N3-38 | The Business Agent Gateway returns structured contracts, not ambiguous prose. (§94) |
| N3-39 | Business tools return typed outcomes, not arbitrary exception strings. (§95) |

**Physical data**

| ID | Statement |
|---|---|
| N3-15 | PostgreSQL is the primary transactional store. (§55) |
| N3-16 | Tenant-owned rows carry `tenant_id`, `id`, created/updated audit columns and `version`. (§56) |
| N3-17 | Money = decimal + currency; quantity = decimal + unit; no floating point for money. (§57) |
| N3-18 | Time semantics remain distinct (created / issued / posted / due / paid / effective / fiscal period / business date / UTC). (§58) |
| N3-19 | Status is a governed value with legal transitions; the AI does not decide legality. (§59) |
| N3-20 | Avoid universal EAV; prefer typed generated schema + controlled extension + limited JSONB. (§60) |
| N3-21 | Schema changes are model changes first; no direct arbitrary DDL through chat. (§62) |
| N3-22 | Schema evolution is classified additive / transformative / destructive. (§63) |
| N3-47 | Do not replace PostgreSQL with an exotic store merely because the project is AI-first. (§108) |
| N3-48 | The Business Model Kernel remains the authority over any semantic, analytics or catalog tool. (§109, §111, §112) |

**Self-extension**

| ID | Statement |
|---|---|
| N3-30 | A module is a complete capability package, not tables + pages. (§73) |
| N3-31 | Packages declare dependencies; the package manager validates compatibility before installation. (§75) |
| N3-32 | UI, API and AI capabilities are all projections of the same canonical model. (§76–78) |
| N3-33 | The AI may design a change without being the authority that publishes it. (§80) |

**Memory, knowledge, skills**

| ID | Statement |
|---|---|
| N3-34 | Do not call everything memory: Platform Definition / Business Truth / Tenant Knowledge / Agent Memory / Session History / Procedural Skills. (§82) |
| N3-35 | Retrieval is filtered by tenant, organisation, user, agent, module, classification, effective date and permission; vector score is not an authorization mechanism. (§89) |
| N3-58 | Memory writes are classified; business and security rules are never inferred as authoritative. (§9) |
| N3-59 | Skills are procedures generated from business truth, not the source of business truth. (§10) |
| N3-60 | Production agents cannot silently redefine canonical business procedures; learning and production namespaces are separate. (§12) |
| N3-61 | Business state must not depend on lossy LLM summaries. (§14) |
| N3-57 | Document content is not policy. (§33) |

**Multi-tenancy, gateway, workflow**

| ID | Statement |
|---|---|
| N3-37 | The platform owns a durable session reference (`AIConversation`). (§92) |
| N3-40 | Domain MCP servers expose domain boundaries and least privilege. (§96) |
| N3-41 | Three workflow categories — deterministic, agent-assisted, autonomous research — share one authorization foundation. (§97) |
| N3-42 | Durable workflow state survives a Hermes restart; the agent is replaceable. (§98) |
| N3-56 | Agent-to-agent messaging is not permission transfer. (§29) |
| N3-65 | Subagent requests carry explicit task contracts. (§27) |

**Audit, evaluation, position**

| ID | Statement |
|---|---|
| N3-43 | Every material AI action records an execution-ledger entry. (§99) |
| N3-44 | Platform audit is authoritative; Hermes hooks are integration/observability points. (§101) |
| N3-45 | Build a proprietary ERP benchmark immediately. (§102) |
| N3-46 | Zero cross-tenant leakage is a hard invariant, not a probabilistic metric. (§107) |
| N3-49 | The platform owns its authorization interface (RBAC, ABAC, relationship-aware, object-level, field sensitivity, approval policies). (§114) |
| N3-50 | Hermes itself is not the moat. (§119) |
| N3-51 | The long-term platform is a compiler/runtime for machine-readable business systems. (§120) |
| N3-53 | Pin a release; architecture is a stable contract, Hermes APIs a versioned integration contract, and moving `main` is not a production baseline. (Appendix B) |

### 4e. Document 6 — the reference layer (4)

Document 6 asserts **no architecture**. It surveys 18 open-source projects (Cube, Superset,
LangChain, LlamaIndex, Haystack, SQLGlot, ClickHouse, DuckDB, Milvus, FAISS, Qdrant,
DataHub, Amundsen, OpenMetadata, Dedupe, Airflow, Dagster, Temporal) and its role is set by
the README (§2b above). Its only normative content is advisory:

| ID | Statement |
|---|---|
| N6-01 | Candidates must be permissively licensed (MIT / Apache-2.0 / BSD / PostgreSQL). |
| N6-02 | Prototype before adopting (a 3–6 week pilot). |
| N6-03 | Evaluate on: licence & community, language & stack, feature fit, integration, security, scalability, documentation. |
| N6-04 | Seven recommendations: unify metadata & semantics; caching & pre-aggregation; controlled prompting/validation; vector indexing for unstructured data; incremental deployment; security hardening; performance tuning. |

**What Document 6 is for, and what it is explicitly not for** (the batch-2 tickbox):
it is for *candidate discovery* — a shortlist of mature, permissively-licensed components per
layer, with pros/cons, and an evaluation checklist. It is **not** the architectural authority
(README §8), and Document 3 §111–112 reinforces this in stronger terms: none of these
projects may become a second canonical semantic system, and catalog metadata is not business
semantic authority. **So Document 6 may populate slots; it may not define them.**

### 4f. The vision's own 30 declared invariants (Document 3 §145)

Quoted verbatim. These are the vision's level-1 authority — the list against which later
documents are to be judged under the precedence rule.

> 1. The Business Model Kernel is the canonical source of business meaning.
> 2. Hermes is the agent runtime, not the ERP database.
> 3. A Hermes profile is not a tenant.
> 4. Hermes `state.db` is not the authoritative ERP transaction store.
> 5. Hermes built-in memory is contextual; it is not the business ontology.
> 6. Skills describe procedures; policies and business rules remain governed platform objects.
> 7. The LLM produces Business Intent / Business IR rather than arbitrary write-SQL.
> 8. The data layer enforces tenant boundaries independently of the LLM.
> 9. Every read is subject to semantic validation, relationship validation and authorization.
> 10. Every write is a typed business command.
> 11. High-impact writes use an explicit approval boundary where policy requires it.
> 12. Important commands execute transactionally and are followed by postcondition verification.
> 13. Important business transactions produce immutable audit/event records.
> 14. Schema changes are model changes first and physical migrations second.
> 15. Business modules are versioned capability packages.
> 16. The ERP frontend edits logical business models rather than arbitrary SQL.
> 17. The entire ERP schema is never injected into every AI prompt.
> 18. Semantic retrieval and tool discovery are progressive/on-demand.
> 19. Documents are untrusted content, not policy.
> 20. Agent learning creates proposals before changing production knowledge/procedures.
> 21. Subagents receive explicit task contracts.
> 22. Durable business workflow state exists outside Hermes.
> 23. Hermes should be integrated through public/intentional extension points before considering a fork.
> 24. Every material AI result and action has provenance.
> 25. Every semantic definition is versioned.
> 26. The physical storage engine is hidden behind the logical Business Model.
> 27. The system must be able to compile the same business concept to different execution engines.
> 28. SQL is an implementation target, not the business language of the AI.
> 29. Business calculations are performed deterministically by the platform.
> 30. Authorization is never delegated to prompt wording, skill text, memory, or persona.

### 4g. The precedence rule (README §14) and what it makes us drop

The rule, verbatim:

```text
1. Explicit architectural invariants
2. Latest design-control architecture
3. Later refined subsystem architecture
4. Earlier architecture
5. Brainstorming / examples
6. Vendor-specific implementation details
```

**What it drops, concretely.** The README works the rule through two examples, and both are
live in this batch's material:

1. **"save generated SQL as a Function"** (earlier) vs **"save validated Business IR +
   dependencies, and treat compiled SQL as a derivative artifact"** (refined). → Doc 1 §7's
   suggestion that the IR could be persisted *as SQL* is dropped in favour of Doc 2 §3 and
   Doc 3 §49: the artefact to persist is the **IR**, and SQL is derived. So **N1-03 survives;
   any reading of Doc 1 that treats SQL as the stored artefact does not.**
2. **"Hermes profile as tenant"** (earlier) vs **"profile = runtime environment, tenant =
   business/security boundary"** (refined). → Any early phrasing that equates them is
   dropped. This is exactly what Document 3 §4 and invariant R-03 say.

**Two further drops this batch's reading produces**, by the same rule:

3. **Doc 1 §26's five-stage evolution path** (AI SQL assistant → … → agentic ERP) is a
   *maturity narrative*, not an architecture. Under level 5 ("brainstorming / examples") it
   cannot be cited as a requirement. It is recorded as N1-26 for orientation only, and must
   not appear in the plan as a milestone set without re-derivation.
4. **Document 6's star counts and maturity claims** are level-6 material (vendor/ecosystem
   detail). They cannot constrain architecture. They are also unverifiable from this machine
   and one pair is internally inconsistent (Doc 6 gives LangChain "~49k stars" in prose and
   "~50k★" in its table). Carried to the shortcut register (batch 11) as *claims to
   re-measure*, not as facts.

---

## 5. The Business Model Kernel, stated so it can be tested

### 5a. The object list — and why three different counts are all correct

Three lists of "the objects" exist. Measured:

| Source | Count | What it is |
|---|---|---|
| Document 3 §38 | **30** | The kernel's canonical objects ("at minimum") |
| README §16 | **33** | The same list, plus three |
| Document 3 §150 | **34** | §38 plus the four interface contracts |

The three are **compatible**, and the differences are exactly three and four items:

- **README §16 (33) = Doc 3 §38 (30) + `LegalEntity`, `Function`, `Dependency`.**
  `Function` is the README's own Concept E ("User Functions"), which is batch 4's subject.
- **Doc 3 §150 (34) = Doc 3 §38 (30) + `BusinessQueryIR`, `BusinessCommandIR`,
  `TaskContract`, `ResultContract`.** These four are *interfaces*, not kernel objects, so
  §150 is listing "what the next specification must define", which is a superset by design.

So there is no contradiction here — but there *is* a real finding: **the vision has no single
frozen object list.** Three documents give three lists, and the union of all three is
**37 distinct objects** (30 ∪ 33 ∪ 34 = 30 + `LegalEntity` + `Function` + `Dependency` + the four
contracts). A test suite cannot be written against "the objects" until one list is chosen.
**That choice is batch 12's, and it is a decision for the owner — not one this report may
close.**

> **Corrected 2026-10-04 — the union is 37, not 36.** This paragraph originally read
> "**36 distinct objects**". The number was wrong, and the sentence contained its own proof:
> `30 + LegalEntity + Function + Dependency + the four contracts` is **30 + 3 + 4 = 37**.
> Re-measured twice, both routes agreeing — (a) counting the new items per list, and (b)
> extracting the three lists programmatically from the source files
> (`library/ai/ai-first/`: Doc 3 §38 = 30, README §16 = 33, Doc 3 §150 = 34) and taking the
> union by two different de-duplication methods. The **37** are listed in
> [`12-development-plan.md`](12-development-plan.md) §5 item 1. The same slip had been copied
> into nine other places; all are corrected. **The owner's decision is unaffected** — he decided
> to *start from the union and prune in the specification*; only the size of that union was
> mis-stated.

### 5b. The per-object contract — two lists, and neither contains the other

Document 3 §150 and README §16 both say what each object must declare. They are **different
lists**, measured:

- **README §16 (12):** identity, ownership, version, lifecycle, dependencies, permissions,
  serialization, runtime representation, database representation, AI representation,
  UI representation, migration behavior.
- **Doc 3 §150 (13):** identity, fields, types, relationships, versioning, validation,
  authorization, serialization, AI exposure, UI generation, database generation, migration
  behavior, provenance.

Shared (4): identity, version, serialization, migration behavior.
README-only (8): ownership, lifecycle, dependencies, permissions, runtime representation,
database representation, AI representation, UI representation.
Doc 3-only (9): fields, types, relationships, validation, authorization, AI exposure,
UI generation, database generation, provenance.

**The union is 21 items**, and it is the union that a complete specification needs — neither
document alone is sufficient. Note the near-collisions that are *not* the same thing:
"permissions" vs "authorization"; "AI representation" vs "AI exposure"; "UI representation"
vs "UI generation"; "database representation" vs "database generation". Whether those are
synonyms or genuinely different requirements is a specification question, and it is open.

### 5c. What makes the kernel testable

The vision supplies the things a test needs, and they are specific:

1. **Stable opaque IDs** (N3-05). The examples are given: `entity_id: invoice`,
   `field_id: invoice.outstanding_amount`, `metric_id: finance.overdue_balance`,
   `command_id: invoice.cancel`. → *Test: rename a label; every reference still resolves.*
2. **Explicit grain** (N3-27). → *Test: an aggregation whose grain would multiply rows is
   rejected or requires an explicit plan.*
3. **Explicit relationship paths** (N3-28). → *Test: a join whose columns look compatible
   but whose path is not declared is rejected.*
4. **A closed-world resolver** (N3-26). → *Test: "Germany" / "Deutschland" / "DE" all resolve
   to one canonical value, and an unknown value is refused rather than guessed.*
5. **Versioned semantics with effective dating** (N3-23, N3-24). → *Test: ask the same
   question across a definition change; the answer uses the definition effective then.*
6. **Deterministic computation** (N3-29). → *Test: the model is never in the path of a
   monetary total.*
7. **A 10-item reject list** (N3-25 / §67) — see §6d. These are ready-made negative tests.
8. **A 20-item failure taxonomy** (§66) — see §6e. These are ready-made test *categories*.
9. **A 40-item pre-implementation checklist** (Appendix D, measured: 40 boxes) ending with
   the rule *"The project should not rely on undocumented conventions for any item above."*
   → *Test: every item has an executable specification, or the build does not start.*

That last one is the strongest statement in the whole batch. **The vision sets its own
gate: no undocumented conventions.** A specification that leaves any of those 40 items to
convention fails the vision's own test.

### 5d. The kernel's two rules that are easy to get wrong

- **Not everything is an object.** Doc 3 §82 (N3-34) forbids collapsing Platform Definition,
  Business Truth, Tenant Knowledge, Agent Memory, Session History and Procedural Skills into
  one word. The trap is that all six are colloquially "memory". They have different
  authority levels, and mixing them is how a learned preference becomes a business rule.
- **The kernel is not the whole product.** Doc 3 §120 (N3-51) says the platform is a
  *compiler/runtime for machine-readable business systems*, and an ERP is "one family of
  packages built on top of it". So the kernel must be defined without assuming ERP.

---

## 6. The Business IR, stated so it can be tested

### 6a. Business Query IR — 12 declared fields (§50)

`operation`, `subject entity`, `grain`, `dimensions`, `measures`, `filters`, `relationships`,
`time range`, `time basis`, `currency basis`, `sort`, `limit`.

A concrete instance is given (§50) with a currency-qualified threshold
(`{"amount": 10000, "currency": "EUR"}`) — i.e. **a bare number is not a valid filter**.
→ *Test: a numeric filter without a currency is rejected.*

### 6b. Business Command IR (§53)

A command carries `command`, `inputs`, `requested_by` and `idempotency_key`. The command
engine then determines **9 things**: actor, permission, preconditions, policy, approval,
transaction, side effects, postconditions, audit. The §45 worked example
(`ApprovePurchaseOrder`) shows the shape: preconditions, authorization policy, effects,
required audit, postconditions, **required idempotency**.
→ *Test: replay the same `idempotency_key`; exactly one effect occurs.*

### 6c. The query compiler pipeline (§51) — 12 ordered gates

User request → Hermes reasoning → Business Query IR → **schema resolution** →
**type checking** → **entity/value resolution** → **relationship/path validation** →
**metric expansion** → **time/currency normalization** → **authorization injection** →
**tenant filter injection** → physical planner → SQL/engine compilation →
**SQL safety validation** → execution → structured result + provenance.

The three "injection" steps are the important ones for testability: **authorization and
tenant filters are injected by the compiler, not supplied by the model.** That is the
mechanical form of N1-17 ("the AI is never the authority for permissions") and R-08.

### 6d. The 10 structural rejects (§67) — ready-made negative tests

`unknown entity` → reject · `unknown field` → reject · `invalid relationship path` → reject ·
`invalid enum value` → reject · `wrong grain` → reject or require explicit plan ·
`unauthorized command` → reject · `invalid state transition` → reject ·
`cross-tenant reference` → reject · `missing currency` → reject ·
`stale policy version` → resolve explicit current/effective version.

*(Note the asymmetry: nine are hard rejects, one is a resolve. That asymmetry is deliberate
and should survive into the specification.)*

### 6e. The 20 failure modes (§66) — ready-made test categories

Semantic, structural, join/path, aggregation, value, temporal, currency/unit,
authorization, state, action, cross-tenant leakage, document injection, skill poisoning,
memory poisoning, schema drift, session confusion, multi-agent context loss, provider/model
variability, staleness, tool overreach.

Every one of the 20 has a defence named somewhere in the documents, and the defence is
structural rather than prompt-based. **A benchmark that covers these 20 is the "proprietary
ERP benchmark" of N3-45.**

### 6f. How the IR is evaluated (§103, §104)

- **Read:** entity resolution, metric resolution, filter resolution, path correctness, grain
  correctness, time correctness, currency correctness, authorization correctness, result
  correctness, provenance completeness. (10 measures)
- **Write:** command selection, input correctness, permission enforcement, preconditions,
  policy enforcement, confirmation behaviour, transaction success, idempotency,
  postcondition. (9 measures)

### 6g. The provenance contract

§72 and §99 require: `execution_id`, metric definitions used, business model version, data
freshness, filters, grain, currency basis, source entities, authorization context — plus, in
the ledger, tenant/user/agent/session ids, model/provider, skill version, knowledge
references, the IR itself, the authorization result, the result, business event IDs and
timestamps. Doc 1 §19 (N1-15) independently requires the same family of fields. **Two
documents written without knowledge of each other require the same provenance fields** —
that is a convergence, and it means provenance is not optional.

---

## 7. Hermes: every claim, listed as a claim to verify

### 7a. Why this section exists

Document 3 is the only one of the four that describes Hermes. It describes **upstream
Hermes**, pinned by it at `github.com/NousResearch/hermes-agent`. Everything the later
documents build on Hermes rests on these claims being true of the Hermes **we actually
hold**. So none of them are accepted here. Batch 7 verifies them against the code, and
against our own earlier Hermes analysis.

### 7b. One claim is already contradicted — measured now

Document 3 states a version three ways and our extract disagrees with all three:

| Claim | Source |
|---|---|
| "Current stable Hermes baseline … **v0.21.3** (`v2026.9.14`, commit `345cd2b`)" | Doc 3 header, Appendix B.2 |
| "The repository's current `main` branch has a placeholder package version of **`0.0.0`**" | Doc 3 §2 |
| **`1.0.0`** | Measured: `library/ai/hermes-agent-main/package.json` → `{"name":"hermes-agent","version":"1.0.0","license":"MIT","engines":{"node":"^22.22.0 || ^24.11.0 || >=26.0.0"}}` |

Further measurements on the extract:

- `LICENSE` file present; `package.json` declares **MIT** — consistent with Doc 3's licence claim.
- **109** top-level entries.
- **No `.git`** and **no `install-stamp.json`** — so the code's own version resolver
  (`hermes_cli/version_info.py`, resolution order: install stamp → live git → unknown) would
  report **"unknown"** for this tree.
- The string `0.21.3` **does** occur in the extract — but in *updater/handoff* code
  (`hermes_cli/update_handoff.py`, `tests/hermes_cli/test_old_updater_takeover.py`,
  `apps/desktop/.../session-create-request.ts`), i.e. as a version being migrated *from*.
- `skills/` holds **14** top-level entries — so the "193 / 197 / 210 skills" question carried
  from batch 0 cannot be answered from `skills/` alone; `optional-skills/`, `plugin-catalog/`
  and `plugins/` must be counted too.

**Conclusion for this batch, stated carefully:** I have *not* shown Doc 3's version claims
to be false. I have shown that **our extract does not self-identify as the version Doc 3
names**, and that three different version numbers are in play. Resolving this is the *first*
task of batch 7, because every other Hermes claim is version-relative.

> **Owner answer, recorded 2026-10-04 (after this report was written).**
> `library/ai/hermes-agent-main/` is the **most current Hermes we hold**, and documents
> describing Hermes are to be treated as potentially outdated and mined for what still
> fits. This resolves the question in the practical direction: **the extract is the
> authority, and Document 3's version pin (v0.21.3 / `v2026.9.14` / commit `345cd2b`) is
> the outdated part.** It does **not** explain why the extract says `1.0.0` — identifying
> which upstream release it corresponds to remains batch 7's task zero. §7c's 45 claims
> are unchanged and still need verifying; what changes is that they are now verified
> **against the extract as the authority**, not against the document.

### 7c. The claims register

`H-nn` = a claim about Hermes. "How batch 7 verifies" names the artefact and the check.

**A. Identity and provenance**

| ID | Claim (Doc 3) | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-01 | Hermes is MIT-licensed | App B.3 | Compare `LICENSE` + `package.json` | Licensing position for a commercial core |
| H-02 | Stable release is v0.21.3 / `v2026.9.14` / commit `345cd2b` | header, App B.2 | Extract self-identifies as `1.0.0`; no `.git`, no stamp | The whole doc may describe a different tree than ours |
| H-03 | `main` carries placeholder version `0.0.0` | §2 | `package.json` says `1.0.0` | Provenance of the extract is unknown |
| H-04 | Docs are dynamically generated; pages disagree on counts | App B.1 | Cross-check the 20 doc URLs against `hermes-docs/` | Counts cannot be trusted at all |
| H-05 | Primary repo is `github.com/NousResearch/hermes-agent` | header | Extract name is `hermes-agent`; confirm lineage | We may be reasoning about the wrong project |
| H-06 | It changes fast; pin a release and keep a harness | §2, App B | Repo activity evidence | The pin-and-harness discipline is justified or not |

**B. Runtime structure**

| ID | Claim | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-07 | `AIAgent` is a platform-agnostic core shared by CLI, gateway, ACP, batch, API server and Python integration | §2 | Locate `agent/`, `run_agent.py`, `batch_runner.py`, `acp_adapter/` | The "reuse, don't rebuild" case weakens |
| H-08 | The loop is split into `conversation_loop.py` and `turn_*` phases | §3 | Find those files | Interface assumptions break |
| H-09 | Prompt construction, tool dispatch, provider resolution, context mgmt, persistence are separate modules | §3 | Map the modules | Our plugin boundaries may not exist |
| H-10 | A central tool registry with 70+ tools across ~28 toolsets | §2 | Count `tools/`, `toolsets.py`, `toolset_distributions.py` | Tool-surface planning is wrong |
| H-11 | SQLite + FTS5 session persistence in `state.db` | §2, §5 | `hermes_state_*.py` family + schema | The state.db boundary claim is wrong |
| H-12 | `state.db` holds session metadata, full message history, usage, FTS5 indexes, lineage, gateway routing | §5 | Read the state schema | We may wrongly assume what is/isn't in there |
| H-13 | 25+ messaging adapters | §2 | Count adapter modules | Channel planning wrong |
| H-14 | A profile is a durable home: config, credentials, persona, memories, sessions, skills, cron, database | §4 | Inspect profile handling | R-03 ("profile is not a tenant") rests on this |
| H-15 | Hermes warns against two processes on one profile (memory write mixing) | §4 | Find the warning in source/docs | A real operational hazard, or not |
| H-16 | Plugin registries, cron, ACP, trajectories, profile isolation all exist | §2 | Find each | The extension story changes |

**C. Memory, skills, context**

| ID | Claim | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-17 | Built-in memory is bounded, curated, injected at session start via `MEMORY.md` and `USER.md` | §7 | Find those files/loader | N3-64 rests on this |
| H-18 | A Memory Provider interface exists with external providers | §8 | Find the provider API | The whole recommended integration point may not exist |
| H-19 | Memory write approval exists | §9 | Find the approval path | N3-58's gate has no backstop |
| H-20 | Skills are on-demand documents with progressive disclosure, on an open standard | §10 | Read the skills loader | The "skills = procedures" mapping weakens |
| H-21 | Skills support discovery, loading, reference files, scripts/assets, conditional activation, `/learn`, agent-created skills, improvement, write approval, external dirs, bundles (11 capabilities) | §10 | Verify each of the 11 | The procedural layer must be partly built |
| H-22 | Hermes can create/update skills, with a write-approval gate | §12 | Find the gate | N3-60 has no backstop |
| H-23 | Layered context files (`AGENTS.md`, `.hermes.md`, compatible) are scanned for prompt injection | §13 | Find the scanner | We would have to build injection scanning |
| H-24 | A pluggable `ContextEngine` abstraction exists | §14 | Find the interface | N3-61's mechanism may not exist |
| H-25 | Prompt assembly separates stable from ephemeral state to protect prompt caching | §15 | Read prompt assembly | The caching strategy is unfounded |

**D. Tools, MCP, plugins, hooks**

| ID | Claim | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-26 | Tool Search exists because large tool catalogs consume context | §16 | Find tool search | R-18 / N3-18 lose their mechanism |
| H-27 | The generic tool registry is intentionally broad | §17 | Inspect the registry | N3-17 (narrow by role) is a change we must make, not a config |
| H-28 | MCP is supported as an external capability interface | §18 | Find MCP client code | The domain-MCP plan (N3-40) has no host |
| H-29 | Plugin system supports tools, hooks, commands, platforms, memory providers, context engines, model providers | §20 | Find each plugin type | "Fork only if needed" (R-23) may fail immediately |
| H-30 | Hooks can intercept tools, run guardrails, emit events, transform content, block execution | §22 | Find the hook points | N3-44's observability plan changes |
| H-31 | Programmatic routes: HTTP/API server, Python integration, ACP | §26 | Find each entry point | The gateway design changes |

**E. Security**

| ID | Claim | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-32 | Hermes provides command approvals, file safety, container isolation, MCP credential filtering, context-file injection scanning, cross-session isolation, input sanitization (7 controls) | §23 | Verify each of the 7 | We must build more of the security model ourselves |
| H-33 | Credential pools exist for model/provider rotation | §35 | Find credential pools | Model-capacity planning changes |
| H-34 | Terminal backends exist and can be restricted | §17, App A | Find backends | Sandbox planning changes |

**F. Channels, scheduling, agents**

| ID | Claim | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-35 | A gateway provides multi-channel connectivity and routing | §25 | Find the gateway | Platform-identity wrapping changes |
| H-36 | Subagents start fresh and receive only the parent's goal/context | §27 | Verify subagent construction | N3-65 (task contracts) is a fix, not a config |
| H-37 | Bot Mode maps profiles to persistent named Bots with role/model/memory/skills/routines | §28 | Find Bot Mode | Agent projection changes |
| H-38 | Bots can collaborate | §29 | Find collaboration | N3-56 changes |
| H-39 | Cron supports scheduled jobs, attached skills, deliveries, fresh sessions, no-agent jobs | §30 | Find cron | Automation projection changes |
| H-40 | Event-triggered automation exists | §31 | Find triggers | Reactive design changes |
| H-41 | Document extraction supports common formats | §32 | Find extractors | Ingestion changes |
| H-42 | The dashboard can be extended (themes, UI plugins, backend plugins, tabs, slots) without touching core | §34 | Find dashboard plugin API | Ops console plan changes |
| H-43 | Trajectory support exists | §36 | Find trajectories | Learning pipeline changes |

**G. Cross-cutting**

| ID | Claim | § | How batch 7 verifies | If wrong |
|---|---|---|---|---|
| H-44 | The subsystem map in Appendix A (30 rows) is accurate | App A | Check all 30 rows | The reuse plan's inventory is wrong |
| H-45 | 193/197/210 skills (carried from batch 0, not from Doc 3) | — | Count `skills/` (14), `optional-skills/`, `plugin-catalog/`, `plugins/` | The capability inventory is wrong |

**Count:** 45 claims (H-01 … H-45), of which 44 come from Document 3 and one (H-45) is
carried forward from batch 0.

### 7d. The single most important thing batch 7 must settle first

**Is our Hermes the Hermes Document 3 describes?** The extract does not self-identify as
v0.21.3; it says 1.0.0; it has no git metadata and no install stamp. Until that is settled,
*every other claim is version-relative and cannot be relied on.* Batch 7 must answer H-02,
H-03 and H-05 before H-07 onward.

### 7e. Evidence batch 7 already has, and does not have

- **Has:** `library/ai/hermes-agent-main/` (the extract; `LICENSE`, `package.json`,
  `hermes_state_*.py`, `toolsets.py`, `skills/`, `plugins/`, `acp_adapter/`, `web/`,
  `ui-tui/`, `website/`); `library/ai/hermes-docs/` — **238 `.md` files** across `docs/`
  (19 files), `docs-more/` (135), `documentation/` (109) and `reboot/` (88) = **351 files**
  total.
- **Has, and it matters — but it is not ours.** `reboot/` contains **the sibling project's
  earlier Hermes analysis**, dated **2026-08-15** — about seven weeks *before* Document 3
  (2026-10-03): `MAP-HERMES-2026-08-15.md`, `13-HERMES-CAPABILITY-MATRIX.md`,
  `CONTESTED-HERMES-VS-COMPANAI.md`, `HERMES-SORTED-INTO-FOUR.md`, `09-GLOSSARY.md`,
  `12-ARCHITECTURE-DECISION-COMPANAI.md`. **The boundary is the plan's (line 38): this
  material is usable for exactly one thing — understanding Hermes better — and we inherit
  no decision from it; its verdicts about its own product are not evidence about ours.**
  So batch 7 has three sources to reconcile — Document 3's claims, the code, and the
  sibling's prior analysis — with the third admitted only as corroboration about Hermes
  itself, never as a conclusion we adopt.
- **Does not have:** any confirmation that the extract is the release Document 3 names.

### 7f. A naming hazard to check in batch 7

"Hermes" is used in this library for at least two things. `library/ai/` also holds
`qwen-hermes-tool-calling-report.md` (68 KB) and `PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md`
(43 KB), and Document 4 mentions "Hermes" 37 times. **If "Hermes" denotes both an agent
framework and a model family, every claim in §7c needs its referent confirmed before it is
verified.** Recorded as a hazard, not a conclusion — I have not yet read those two files.

---

## 8. What this batch changes in the plan

1. **Batch 7 is now explicitly three-way, with a boundary.** It must reconcile Document 3's
   claims, the extract's code, **and** the sibling's `hermes-docs/reboot/` analysis from
   2026-08-15 — the third admitted **only** as corroboration about Hermes, never as a
   decision (plan line 38). Added to batch 7's method.
2. **Batch 7's first task is now named:** settle H-02 / H-03 / H-05 — *which Hermes is this?*
   No other Hermes claim can be verified until that is answered.
3. **Batch 12 inherits a concrete decision:** choose **one** object list. Three exist (30,
   33, 34; union 37), and the per-object contract is the union of two 12- and 13-item lists
   (21 items). This is flagged as an owner decision, not one this programme may close.
4. **Batch 11 inherits a concrete list:** Document 6's candidate components and its
   star-count claims — level-6 material, to be re-measured rather than repeated.
5. **Batch 2's own labels were ambiguous and are corrected** (see §2c and the plan edit).

---

## 9. Critic pass

A second pass whose only job was to find what I missed. What I did, and what it found:

**What I searched for, and where.** (a) Every `must` / `should` / `never` / `required` in
all four documents — grep, counted. (b) Every heading in Documents 1, 2, 3 and 6, and in
the README — to catch a section I skipped. (c) Every fenced block in Document 3, extracted
programmatically, to catch a rule living inside an example. (d) Every occurrence of
"Hermes" — 166 in Doc 3 — to catch a boundary claim I had not listed. (e) The README's
precedence rule and its worked examples. (f) Cross-checked every count I cite against a
second measurement.

**What the pass found — four corrections, all applied:**

1. **A working note attributed a quote to the wrong file.** The claim that the research
   report calls itself reference material is the **README's** (§2b). Checked: batch 1's
   report never made that claim, so nothing there needed repairing — the error was in the
   working notes, and it is corrected here rather than carried forward.
2. **I nearly reported "33 objects" as Document 3's figure.** It is the **README's** (§16);
   Document 3 says 30 (§38) and 34 (§150). All three are now reported with their sources and
   the exact set differences (§5a). This is the same class of error my method exists to
   catch — measuring a different thing than the claim names.
3. **I nearly asserted a Hermes version contradiction.** The honest statement is weaker:
   our extract does not self-identify as the version Document 3 names (§7b). "Contradicted"
   would have been an over-claim, because the extract might be a different snapshot.
4. **I nearly called the sibling's material ours.** I wrote that `reboot/` is "our own
   earlier Hermes analysis". It is the **sibling's** (Paperclip-based, not our Open Mercato
   fork) — the plan's line 38 boundary and the LOG's 2026-10-03 correction both say so, and
   we inherit no decision from it. Caught before publication and fixed in §7e, §8 and §11.
   This is the exact failure the boundary exists to prevent, and it is the second time in
   this programme that `hermes-docs/` has been mistaken for ours.

**What the pass could not break, and why that is not a tick.** The three object lists
reconcile exactly (30 + 3 = 33; 30 + 4 = 34); the two contract lists share exactly four
items and the union is exactly 21. Those are arithmetic, re-derived twice. The claim that
Hermes is absent from Documents 1, 2 and 6 is a count (0, 0, 0). The claim that Document 3
is 62% of the batch is 4,254 / 6,896. These are the only claims in this report I would put
a number on without further work — and each was measured twice, by different means
(`wc -l` and a Python line count; `grep -c` and a Python `str.count`).

**What remains open, honestly.** §7c's 45 Hermes claims are *listed, not verified*. The
object-list choice is *open*. The "Hermes" naming hazard is *recorded, not resolved*. None
of these are ticked.

---

## 10. Definition of done

| Requirement | Status |
|---|---|
| The Business Model Kernel is stated so a test could be built against it | **Met** — §5, with 9 testable properties and the 40-item "no undocumented conventions" gate |
| The Business IR is stated so a test could be built against it | **Met** — §6, with 12 Query-IR fields, the 12-gate compiler pipeline, 10 ready-made negative tests, 20 test categories, and the read/write evaluation measures |
| Every claim the vision makes about Hermes is listed for verification, not accepted | **Met** — §7c, 45 claims, each with a verification method and a failure consequence |

**Batch 2 is complete.** Per the plan: the report is written, the boxes in `PLAN.md` are
ticked, one line is added to `LOG.md`, and then I stop.

---

## 11. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **Which Hermes is this?** Extract says `1.0.0`; Doc 3 says `v0.21.3` and `0.0.0`; no `.git`, no install stamp | Batch 7 — **first task** |
| 2 | The 45 Hermes claims (H-01…H-45) | Batch 7 |
| 3 | Reconcile three sources: Doc 3's claims, the code, and the **sibling's** `hermes-docs/reboot/` (2026-08-15) — third source admitted as corroboration only | Batch 7 |
| 4 | Skill count: 193 claimed / 197 sibling / 210 extract; `skills/` alone holds 14 | Batch 7 |
| 5 | The "Hermes" naming hazard (agent framework vs model family) | Batch 7 |
| 6 | **Choose one object list** (30 / 33 / 34; union 37) and one per-object contract (union 21) | Batch 12 — **owner decision** |
| 7 | Document 6's candidate components and star counts — level-6, to be re-measured | Batch 11 |
| 8 | The vision README's duplicate section numbers `# 7` and `# 8` | Recorded; not ours to fix |
| 9 | `Capability` means a business area here and a permissioned action in `compai/planning/` | Batch 6 / owner (unchanged) |
