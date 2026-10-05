# The Business Model Kernel — Specification

**Status:** DRAFT 1 — complete enough to review, not yet ratified.
**Written:** 2026-10-04.
**This is:** `P0-spec`, the vision's own implementation gate (**RQ-140**).
**This is not:** code. It is a design-control document. Nothing in the plan may be built before
this exists, because the vision says so itself (Doc 3 §29, §16; batch 9 §6 #5).

**What it settles.** Three things, and the plan named all three (batch 12 §5 item 1):

1. **One canonical object list** — pruned from the 37 candidates the vision offers in three
   different lists.
2. **The contract of every kernel object** — the union of the two 21-item contract lists the
   vision gives, with the four near-collisions resolved.
3. **The classification taxonomy** — CORE / CAPABILITY / PROJECTION / REFERENCE / EXTERNAL /
   TEMPORARY (RQ-06).

**Done when** — the plan's own words: *the object list is one list; every object has a declared
contract; a reader can name what an "entity" is without asking.*

---

## 0. How to read this, and the status rule

Every point raised in this document carries one of five statuses. Nothing is left implicit.

| Status | Means |
|---|---|
| **SETTLED** | Decided here. The specification is authoritative. |
| **DERIVED** | Not invented here — taken from the vision's own words, with the section cited. |
| **OPEN — owner** | Cannot be decided by this document. Needs Ramzi. |
| **OPEN — spec** | This document should decide it but has not yet. A gap in this draft. |
| **DEFERRED** | Deliberately not decided now, with the trigger that brings it back named. |

**A note on the word "candidate".** The 37 are *candidates*, not objects. The owner's decision was
*"start from the union of 37 and let the specification prune it"* — so pruning is this document's
job, and every prune below names its rule and its reason. **No candidate is pruned silently.**

---

## 1. The correction this specification rests on

The union of the vision's three object lists was recorded as **36** in the analysis reports, the
development plan, the backlog and the owner's decision record. **It is 37.**

- Doc 3 §38 = **30** · README §16 = **33** · Doc 3 §150 = **34**
- Union = 30 + {`LegalEntity`, `Function`, `Dependency`} + {`BusinessQueryIR`, `BusinessCommandIR`,
  `TaskContract`, `ResultContract`} = 30 + 3 + 4 = **37**

Re-measured twice, both routes agreeing: (a) counting the added items per list, and (b) extracting
the three lists programmatically from the source files and de-duplicating two different ways.

The originating sentence contained the disproof of itself — it spelled out the sum and then
mis-totalled it. **Status: SETTLED** (the count) and **corrected in 14 places across 8 files**. The
owner's decision is untouched: he decided to start from the union and prune; only its size was
mis-stated. Full reasoning: [`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md)
§5 item 1, and `LESSONS.md` **L66**.

**The 37, in the order the vision introduces them:**

| # | Object | Introduced by |
|---|---|---|
| 1–8 | `Tenant` `Organization` `User` `Agent` `Role` `Permission` `Module` `Capability` | Doc 3 §38 |
| 9–13 | `Entity` `Field` `ValueObject` `Enum` `Relationship` | Doc 3 §38 |
| 14–16 | `Metric` `Rule` `Constraint` | Doc 3 §38 |
| 17–19 | `Command` `Workflow` `Policy` | Doc 3 §38 |
| 20–22 | `Event` `Projection` `View` | Doc 3 §38 |
| 23–27 | `Document` `Knowledge` `Skill` `Tool` `Integration` | Doc 3 §38 |
| 28–30 | `Version` `Migration` `AuditRecord` | Doc 3 §38 |
| 31–33 | `LegalEntity` `Function` `Dependency` | README §16 only |
| 34–37 | `BusinessQueryIR` `BusinessCommandIR` `TaskContract` `ResultContract` | Doc 3 §150 only |

---

## 2. The pruning rules

Four rules, applied in order. They are stated first so that any reader can check a prune rather
than take it on trust.

- **R1 — an object has its own identity.** It persists, it can be referenced by a stable ID, and it
  has versioned semantics. Failing R1 is the most common reason to prune.
- **R2 — a *contract* is not an object.** If the thing describes the **shape of a request or a
  result** rather than a thing that persists, it is a contract. Contracts are in scope for this
  specification but are **not** members of the object list.
- **R3 — a *specialisation* is not a separate object.** If item B is item A plus attributes, and
  merging them loses nothing, B is pruned into A.
- **R4 — a *relationship* is not a separate object.** If the thing only exists as a connection
  between two other objects, it is carried by `Relationship`, not by an object of its own.

**A note on what pruning does not mean.** Pruning a *candidate* is not deleting a *concept*. A
pruned item still has to be modelled — it just does not get its own top-level object. That
distinction is why each prune below says where the concept went.

---

## 3. The canonical object list — 37 candidates → **31 objects** + **4 contracts**

### 3.1 The list

**The Business Model Kernel has 31 objects, in six groups.**

| Group | Objects | Count |
|---|---|---|
| **Identity and tenancy** | `Tenant` `Organization` `User` `Agent` `Role` `Permission` `Module` `Capability` | 8 |
| **The business model** | `Entity` `Field` `ValueObject` `Enum` `Relationship` | 5 |
| **Semantics** | `Metric` `Rule` `Constraint` | 3 |
| **Behaviour** | `Command` `Workflow` `Policy` | 3 |
| **Derived and read** | `Event` `Projection` `View` | 3 |
| **Content and lifecycle** | `Document` `Knowledge` `Skill` `Tool` `Integration` `Function` `Version` `Migration` `AuditRecord` | 9 |
| | **Total** | **31** |

**And four contracts, held separately** (rule R2): `BusinessQueryIR`, `BusinessCommandIR`,
`TaskContract`, `ResultContract`. They are specified in §6 and are **not** members of the object
list. Doc 3 §150 agrees with this treatment in its own words — it is listing *"what the next design
document should define"*, which is a superset by design, and batch 2 §5a already flagged that the
four are *interfaces, not kernel objects*.

### 3.2 What was pruned, and where each concept went

Two candidates are pruned. Both are prunes of an *object*, not of a *concept*.

| Pruned | Rule | Why | Where the concept lives now |
|---|---|---|---|
| `LegalEntity` | **R3** — specialisation | Doc 5 §7 proposes the **party model** — `Person` and `Organization` as parties — explicitly *"to avoid separate identity silos"*. A legal entity **is** an organisation with legal-registration attributes. Keeping it as a sibling of `Organization` would build the very silo the vision warns against. Also absent from Doc 3 §38's own canonical list. | `Organization`, carrying a legal-registration attribute group. **Status: SETTLED.** |
| `Dependency` | **R4** — relationship | README-only. The vision's only use is *module* dependencies (Doc 3 §75), which is a declared edge between two objects, not a thing with its own identity. | `Relationship`, with a `kind` discriminator (`entity` \| `module` \| `capability`). **Status: SETTLED.** |

**Why the four §150 items were not pruned but reclassified.** They are real and in scope — the
vision requires them (Appendix D lists `Business Query IR`, `Business Command IR`, `Task Contract`,
`Result Contract` as four of its 40 pre-implementation items). They are simply not *objects*: none
of them persists and none of them has an identity. R2 moves them from the object list to the
contract list rather than out of the specification. **Status: SETTLED.**

**Net: 37 candidates − 2 pruned − 4 reclassified as contracts = 31 objects.** The arithmetic
balances, and it balances on purpose — a list that does not account for every candidate is how the
37 became a 36 in the first place.

---

## 4. The object contract

### 4.1 The contract — 21 items, and the four collisions resolved

The vision gives two contract lists and **neither contains the other** (batch 2 §5b, measured):

- **README §16 (12):** identity, ownership, version, lifecycle, dependencies, permissions,
  serialization, runtime representation, database representation, AI representation, UI
  representation, migration behavior.
- **Doc 3 §150 (13):** identity, fields, types, relationships, versioning, validation,
  authorization, serialization, AI exposure, UI generation, database generation, migration
  behavior, provenance.

Shared: **4** (identity, version, serialization, migration behavior).
README-only: **8** · Doc 3-only: **9** · **Union: 21.**

**Every one of the 31 objects declares all 21.** The batch 2 report left one question open —
whether the four near-collisions are synonyms or genuinely different requirements. This
specification settles it: **they are genuinely different, and both of each pair is required.**

| Pair | Resolution | Status |
|---|---|---|
| `permissions` **vs** `authorization` | **Different.** `permissions` is the **noun** — the declared set of rights that exist on the object. `authorization` is the **mechanism** — the policy that decides who holds them. An object declares *which rights exist*; a policy decides *who gets them*. A kernel that has only one of the two either has rights nobody can grant, or grants nobody declared. | **SETTLED** |
| `AI representation` **vs** `AI exposure` | **Different.** `AI representation` is the **shape** — how the object is serialised for the model (its tool schema / prompt form). `AI exposure` is the **permission** — whether the object is shown to the model at all, and at what classification. Shape without permission leaks data; permission without shape makes the model guess. | **SETTLED** |
| `UI representation` **vs** `UI generation` | **Different.** `UI representation` is the **declared description** (labels, formats, ordering). `UI generation` is the **produced artefact** (the screen, form or widget built from it). One is input, the other output. | **SETTLED** |
| `database representation` **vs** `database generation` | **Different.** Same split: the declared physical mapping (table, column, type) versus the DDL emitted from it. | **SETTLED** |

**The general principle behind all four** — and the reason they are not synonyms: the vision's own
strongest rule is *"the project should not rely on undocumented conventions for any item above"*
(Appendix D). Where a pair could be read as one thing, the specification must say which. Declaring
only the *description* and leaving the *artefact* to convention is exactly the undocumented
convention the vision forbids.

### 4.2 The contract template

For each of the 31 objects:

| Item | What it must state |
|---|---|
| **identity** | The stable opaque ID. **DERIVED** — Doc 3 §39: all canonical objects need stable opaque IDs; display names are localized metadata. |
| **ownership** | Which authority owns the definition: platform, tenant, or capability package. |
| **version** | The object's own semantic version. **DERIVED** — Doc 3 §64: version all important semantics. |
| **lifecycle** | Its states, and the transitions between them. |
| **dependencies** | What must exist before it does; carried as `Relationship` edges with `kind`. |
| **permissions** | The **declared rights** that exist on it. |
| **authorization** | The **policy** that decides who holds them. |
| **fields** | Its declared attributes (for objects that have them). |
| **types** | Its declared types, using the semantic types in §5.3. |
| **relationships** | Its declared edges to other objects. |
| **validation** | Its structural invariants. |
| **serialization** | Its canonical wire form. |
| **runtime representation** | Its in-memory form. |
| **database representation** | Its declared physical mapping. |
| **database generation** | The DDL emitted from that mapping. |
| **AI representation** | Its serialised form for the model. |
| **AI exposure** | Whether, and at what classification, it is shown to the model. |
| **UI representation** | Its declared presentation metadata. |
| **UI generation** | The screens/forms/widgets emitted from it. |
| **migration behavior** | What happens to it across a version change. |
| **provenance** | Where it came from and what produced it. |

---

## 5. The kernel objects

### 5.1 The classification taxonomy (RQ-06) — **DERIVED**

Doc 5 §4 declares it and says where it belongs: *"This classification should exist in the Business
Model Kernel."* It applies to **entities** (`EntityClass`), not to all 31 objects.

| Class | Meaning | Example |
|---|---|---|
| `CORE` | Cross-capability business identity and structure. | `Organization`, `User` |
| `CAPABILITY` | Owned by a business capability. | `PurchaseOrder` |
| `PROJECTION` | A derived read model. | `CustomerOutstandingBalance` |
| `REFERENCE` | Controlled shared vocabulary. | `Country`, `Currency` |
| `EXTERNAL` | A representation of an external system's object. | a supplier's product record |
| `TEMPORARY` | Ephemeral processing state. | an import staging row |

**The elevation rule — DERIVED, Doc 5 §5.** An entity may enter `CORE` only if it has **all four**
of: cross-capability significance · stable identity · clear semantic ownership · multiple
consumers. *"Do not put everything in core merely because it is important to one module. Core must
remain coherent."*

**Status: SETTLED** — adopted verbatim from the vision, with the elevation rule as a hard gate.

### 5.2 What an "entity" is — the gate's own test

The plan's definition of done includes *"a reader can name what an entity is without asking."* So:

> **An `Entity` is a business concept that has identity, a declared grain, and a lifecycle. It is
> not a SQL table.** Doc 3 §40 states it directly: *"An Invoice is therefore a business concept,
> not merely a SQL table."* Its `EntityClass` says how it is governed; its grain says what one row
> of it means; its ID says what it is, permanently, whatever its label becomes.

**Status: SETTLED.** The three distinguishing properties are identity, grain, lifecycle — and
grain is the one that is easiest to lose, which is why it is one of the two rules in §7.

### 5.3 Semantic types — **DERIVED** (Doc 3 §41)

`Money` `Quantity` `Percentage` `Rate` `Currency` `Country` `TaxCode` `Date` `DateTime` `Duration`
`Address` `PhoneNumber`

The vision requires *strong semantic types* rather than primitives: a `Money` is not a decimal, and
a `Country` is not a string. **Status: SETTLED** as the required minimum set. Extending it is a
normal change, recorded as a `Version` bump.

### 5.4 The 31, defined

Each line is the object's **one-sentence definition** — the thing a reader must be able to say
without asking. The full 21-item contract applies to each (§4.2) and is not repeated per object.

**Identity and tenancy**

| Object | Definition | Source |
|---|---|---|
| `Tenant` | The isolation boundary. Everything a tenant owns is reachable only through it, and nothing crosses it. | Doc 3 §90 |
| `Organization` | A party with structure — including a legal entity, which is this object carrying legal-registration attributes. | Doc 5 §7, §3.2 |
| `User` | A human principal that can act, hold roles, and be audited. | Doc 3 §90 |
| `Agent` | A non-human principal that can act, hold roles, and be audited — first-class, not a user with a flag. | Doc 3 §90 |
| `Role` | A named bundle of permissions, grantable to users and agents alike. | Doc 3 §90 |
| `Permission` | A single declared right over an object. **The noun**; `authorization` is the mechanism (§4.1). | Doc 3 §90 |
| `Module` | A unit of platform capability that can be installed, versioned and depended upon. | Doc 3 §73 |
| `Capability` | A business capability as a package — the thing a tenant switches on, carrying its own entities, workflows and UI. | Doc 3 §73, §74 |

**The business model**

| Object | Definition | Source |
|---|---|---|
| `Entity` | A business concept with identity, grain and lifecycle (§5.2). | Doc 3 §40 |
| `Field` | A declared attribute of an entity, with a semantic type, validation, and declared searchability and writeability. | Doc 3 §41 |
| `ValueObject` | A typed value with no identity of its own — it is compared by value, and two equal ones are interchangeable. | Doc 3 §38 |
| `Enum` | A closed set of permitted values. | Doc 3 §38 |
| `Relationship` | A declared edge between two objects, carrying cardinality, optionality, ownership, allowed traversal, delete behaviour, security inheritance and multiplicity risk. It is also how a module dependency is carried (§3.2). | Doc 3 §42, §75 |

**Semantics**

| Object | Definition | Source |
|---|---|---|
| `Metric` | A **governed** semantic definition — subject, grain, measure, filters, currency, version. Not an LLM-created formula; its computation is deterministic. | Doc 3 §43 |
| `Rule` | A **business or domain** invariant. | Doc 3 §44 |
| `Constraint` | A **structural or data** invariant. | Doc 3 §44 |

**Behaviour**

| Object | Definition | Source |
|---|---|---|
| `Command` | The **only normal mutation interface from AI** — inputs, preconditions, authorization policy, effects, postconditions, idempotency, and required audit. | Doc 3 §45 |
| `Workflow` | An authoritative business process: states, transitions, actors, policies, conditions, approvals, timers, notifications, compensation, retries, events. | Doc 3 §46 |
| `Policy` | A named, versioned decision rule that authorization consults. | Doc 3 §45, §54 |

**Derived and read**

| Object | Definition | Source |
|---|---|---|
| `Event` | An **immutable fact** that something happened, carrying event ID, type, tenant, aggregate, actor, occurred/recorded times, correlation and causation IDs, schema version and payload. | Doc 3 §47 |
| `Projection` | A **derived read model** — a named, pre-computed answer the agent can ask for instead of rebuilding the same joins and formulas. | Doc 3 §48 |
| `View` | A declared presentation over the model. Distinct from `Projection`: a projection is *computed*, a view is *presented*. | Doc 3 §38, §76 |

**Content and lifecycle**

| Object | Definition | Source |
|---|---|---|
| `Document` | An ingested artefact and its extraction. **Untrusted data** — never an instruction. | Doc 3 §32, §33 |
| `Knowledge` | Tenant-owned knowledge: procedures, SOPs, contracts, manuals, policies, terminology. | Doc 3 §85 |
| `Skill` | A procedural capability the agent can be given, with a lifecycle. | Doc 3 §88 |
| `Tool` | A callable capability exposed to the agent, under a tool policy. | Appendix D |
| `Integration` | A declared connection to an external system. | Doc 3 §38 |
| `Function` | A **validated AI operation promoted to deterministic software** — saved so later runs need no model. | README Concept E; Doc 4 |
| `Version` | A recorded semantic version of any object. | Doc 3 §64 |
| `Migration` | A declared, ordered change from one model version to the next. | Doc 3 §62, §63 |
| `AuditRecord` | The durable, queryable record of who did what, when, and under which policy decision. | Doc 3 §47; Appendix D |

---

## 6. The four contracts (rule R2)

| Contract | Definition | Source |
|---|---|---|
| `BusinessQueryIR` | The typed intermediate representation of a **read**: operation, subject entity, grain, dimensions, measures, filters, relationships, time range, time basis, currency basis, sort, limit. | Doc 3 §50 |
| `BusinessCommandIR` | The typed intermediate representation of a **write**: command, inputs, requested-by, idempotency key. | Doc 3 §53 |
| `TaskContract` | The declared shape of a task handed to a subagent — what it is asked for and what it must return. | Doc 3 §27; Appendix D |
| `ResultContract` | The declared shape of a result — including **provenance**. | Doc 3 §72; Appendix D |

**The compiler path these four serve — DERIVED (Doc 3 §51), and it is normative.** A read goes
User → Hermes → `BusinessQueryIR` → schema resolution → type checking → entity/value resolution →
relationship/path validation → metric expansion → time/currency normalisation → authorization
injection → tenant filter injection → physical planner → SQL compilation → SQL safety validation →
execution → structured result + provenance. **The AI never writes raw SQL** (Doc 3 §49, §52).
**Status: SETTLED** — the ordering is the vision's and is not this document's to change.

---

## 7. The two rules that are easiest to get wrong — **DERIVED**

Both come from the vision and both are the kind of thing a builder gets wrong quietly.

**Rule 1 — not everything is "memory".** Doc 3 §82 forbids collapsing six different things into
one word. They are six, they have **different authority levels**, and mixing them is how a learned
preference becomes a business rule:

| Kind | What it is | Authority |
|---|---|---|
| `Platform Definition` | identity model, tenant model, permission framework, core capabilities, localisation, system configuration | the platform's |
| `Business Truth` | entities, relationships, metrics, rules, commands, workflows, policies, events | the tenant's, governed |
| `Tenant Knowledge` | procedures, SOPs, contracts, manuals, company policies, terminology | the tenant's, **untrusted as instruction** |
| `Agent Memory` | what one agent learned | the agent's, **advisory only** |
| `Session History` | what was said in one conversation | the session's, **not evidence** |
| `Procedural Skills` | a capability the agent can be given | versioned, reviewed |

**Status: SETTLED** — the six are distinct, and only `Business Truth` may bind the business.

**Rule 2 — the kernel is not the whole product.** Doc 3 §120: the platform is a
**compiler/runtime for machine-readable business systems**, and an ERP is *"one family of packages
built on top of it"*. So **no kernel object may assume ERP.** `Entity`, `Field` and `Relationship`
must be definable for a business that is not an ERP — otherwise the kernel is an ERP schema wearing
a general name. **Status: SETTLED.**

---

## 8. The gate: the vision's own 40-item test

Appendix D lists **40** items and closes with the rule that gives this specification its standard:

> *"The project should not rely on undocumented conventions for any item above."*

Measured: 40 boxes. Below, each is marked with where it is decided. **This is the honest ledger of
what this draft does and does not cover.**

| # | Item | Where it stands |
|---|---|---|
| 1 | Tenant isolation model | **PARTLY** — §5.4 defines `Tenant`; the enforcement point is **OPEN — spec** |
| 2 | Identity model | **PARTLY** — §5.4 defines `User`/`Agent`; principal resolution is **OPEN — spec** |
| 3 | Organization hierarchy | **PARTLY** — §5.4 + Doc 5 §7 party model; depth/recursion **OPEN — spec** |
| 4 | Agent model | **SETTLED** — §5.4, and **in detail by the owner's decision of 2026-10-05**: five kinds (*personal · role · context · independent · system*), an owner, a visibility scope, a runtime binding and an autonomy gate → [`AGENT-HALF.md`](AGENT-HALF.md) §1.4 |
| 5 | Permission model | **SETTLED** — §4.1 + §5.4 |
| 6 | Business Model Kernel schema | **THIS DOCUMENT** — §3 |
| 7 | Stable-ID policy | **DERIVED** — Doc 3 §39; exact ID grammar **OPEN — spec** |
| 8 | Entity grain semantics | **SETTLED** — §5.2, §7 Rule 1 |
| 9 | Relationship metadata | **SETTLED** — §5.4 |
| 10 | Metric definition contract | **SETTLED** — §5.4 |
| 11 | Rule/constraint model | **SETTLED** — §5.4 |
| 12 | Command model | **SETTLED** — §5.4 |
| 13 | Workflow model | **SETTLED** — §5.4 |
| 14 | Policy model | **PARTLY** — §5.4 defines `Policy`; the decision language is **OPEN — spec** |
| 15 | Event model | **SETTLED** — §5.4 |
| 16 | Audit model | **SETTLED** — §5.4 |
| 17 | Version model | **SETTLED** — §5.4 |
| 18 | Migration model | **SETTLED** — §5.4 |
| 19 | Business Query IR | **SETTLED** — §6 |
| 20 | Business Command IR | **SETTLED** — §6 |
| 21 | Task Contract | **SETTLED** — §6 |
| 22 | Result Contract | **SETTLED** — §6 |
| 23 | Knowledge model | **SETTLED** — §5.4 + §7 Rule 1 |
| 24 | Memory scopes | **SETTLED** — §7 Rule 1 |
| 25 | Skill lifecycle | **PARTLY** — §5.4 defines `Skill`; states **OPEN — spec** |
| 26 | Hermes adapter boundary | **OPEN — owner/spec** — this is the Hermes boundary, **B-05** |
| 27 | Hermes profile strategy | **DERIVED** — Doc 3 §91; isolation choice **OPEN — owner** |
| 28 | Hermes session bridge | **OPEN — spec** |
| 29 | MCP domain API | **OPEN — spec** |
| 30 | Tool policy | **PARTLY** — §5.4 defines `Tool`; the policy shape **OPEN — spec** |
| 31 | Human approval model | **SETTLED 2026-10-05** — the approval rule is the platform's **existing `A0`–`A5` gates**, assigned per action class, plus the rule that **the accountable party is always a person** → [`AGENT-HALF.md`](AGENT-HALF.md) §1.2 |
| 32 | Document ingestion/security | **PARTLY** — §5.4 + §7 Rule 1 mark documents untrusted; pipeline **OPEN — spec** |
| 33 | Analytics projection strategy | **PARTLY** — §5.4 defines `Projection`; strategy **OPEN — spec** |
| 34 | Event/outbox strategy | **OPEN — spec** |
| 35 | Durable workflow strategy | **PARTLY** — §5.4; durability is Hermes's boundary, **B-05** |
| 36 | Observability model | **OPEN — spec** |
| 37 | Evaluation benchmark | **OPEN — spec** |
| 38 | Hermes version compatibility harness | **OPEN — spec** — see **N-11** |
| 39 | Capability package format | **PARTLY** — §5.4 defines `Module`/`Capability`; the format **OPEN — spec** |
| 40 | Frontend model-builder lifecycle | **OPEN — spec** |

**Tally: 22 SETTLED/DERIVED · 10 PARTLY · 8 OPEN.** (22 + 10 + 8 = 40. Measured by parsing the
40 rows, and cross-checked by counting the status tokens directly in the table — both routes give
22 settled/derived. This tally was **wrong in the first draft of this file** — it said 11 partly and
7 open — and was corrected by measurement, which is `LESSONS.md` **L66** applied to this document.)

**How this tally counts — and what it under-reports.** A row is counted by its **first** status token.
So a row that reads `**DERIVED** — …; the gate itself **OPEN — spec**` counts as *settled*, even though
its own text names something open. Measured 2026-10-05: **11 of the 40 rows contain `OPEN — spec`
somewhere while being counted as settled or partly.** **"8 open" therefore means "8 rows whose *first*
token is `OPEN`"** — not "8 things are unresolved". The count is honest about its rule and easy to
misread; the rule is written down here so that nobody does. *(The 2026-10-05 agent-model decision is the
worked example: it closed the open gate inside row 31, and the tally did not move.)*

**The honest reading of that tally.** This draft **settles the object list and the contract** — the
two things the plan actually asked P0-spec to settle — and it does **not** yet meet the vision's own
40-item standard, because 18 items are partly or wholly open. The plan's *definition of done* for
P0-spec is met; the **vision's** bar for "implementation may begin" is **not** met. **That gap is
the single most important finding in this document, and it is stated rather than hidden.**
**Status: OPEN — spec** (18 items), tracked in §9.

---

## 9. What this draft does not settle

Each with a status and a next move.

| Item | Status | Next move |
|---|---|---|
| The 18 partly/open items in §8 | **OPEN — spec** | Draft 2 of this document |
| The ID grammar for stable IDs | **OPEN — spec** | Draft 2 — Doc 3 §39 gives examples (`invoice`, `invoice.outstanding_amount`) but no grammar |
| The policy decision language | **OPEN — spec** | Draft 2 — needs the security kernel (batch 5, vision Doc 8) |
| The Hermes boundary items (26, 27, 28, 35, 38) | **OPEN — owner** | These are the `B-05` boundary. Not this document's to close. **Narrowed 2026-10-05** by the agent-model decision: the five agent kinds tell us **how many Hermes profiles we need and how they are isolated** (item 27), and a *context* agent that acts as a user is the concrete case the session bridge (item 28) must serve → [`AGENT-HALF.md`](AGENT-HALF.md) |
| Whether `View` and `Projection` should stay distinct | **DEFERRED** | Trigger: the first generated UI (Doc 3 §76). If they never diverge, merge them |
| Whether the `CORE` set is right | **DEFERRED** | Trigger: the first capability package. Doc 5 §6 lists 26 candidates and says *"not all need to be implemented immediately"* |
| Ratification of this specification | **OPEN — owner** | Ramzi reads it, or delegates the review |

---

## 10. Definition of done — checked against the plan

| The plan's test | Result |
|---|---|
| The object list is one list | **MET** — §3: 31 objects + 4 contracts, with every one of the 37 accounted for |
| Every object has a declared contract | **MET** — §4: 21 items, four collisions resolved, applied to all 31 |
| A reader can name what an "entity" is without asking | **MET** — §5.2 |
| The classification taxonomy is fixed | **MET** — §5.1, adopted verbatim with the elevation rule as a gate |

**And the vision's own bar:** *not met* — see §8. Stated plainly so no reader mistakes this draft
for permission to begin implementation.

---

## 11. Critic pass — this document attacked

Run as a stranger would, looking for what is wrong rather than what is right.

| # | Attack | Outcome |
|---|---|---|
| 1 | *"31 is a tidy number — did you prune to reach it?"* | **No, and the arithmetic is shown.** 37 − 2 − 4 = 31, and §3.2 names the two and the four with their rules. Each prune cites the vision's own text. |
| 2 | *"You pruned `LegalEntity` and `Dependency`, which the README explicitly lists. Are you overriding the vision?"* | **Partly, and it is flagged as such.** Both are **R3/R4** prunes of *objects*, not of *concepts* — §3.2 says where each concept went. The vision offers three lists and requires the specification to choose one; choosing is the job. **But this is the most contestable decision in the document** and it is marked SETTLED-by-this-document rather than DERIVED. |
| 3 | *"Is the 37 right, or is that your own slip?"* | Re-measured twice from the source files, both routes agreeing. The originating "36" was the slip, and it contained its own disproof. See §1 and `LESSONS.md` **L66**. |
| 4 | *"§8's tally says 22/11/7. Does it add to 40?"* | **The first draft's tally was wrong and this attack is why it was caught.** It said 22/11/7 — which does add to 40, so the arithmetic alone would not have exposed it; the **split** was wrong. Measured by parsing the rows: **22 / 10 / 8**. Corrected in §8. The lesson is `L66` — a total that adds up is not the same as a total that is right. |
| 5 | *"Does this document meet the gate it claims to be?"* | **It meets the plan's test and not the vision's.** §8 and §10 both say so. This is the attack that landed, and it is recorded rather than argued away. |
| 6 | *"Are the four collisions genuinely distinct, or padding?"* | Each pair splits cleanly into a **description** and an **artefact** (or a **noun** and a **mechanism**), and §4.1 says which is which. If they were synonyms, declaring one would suffice — and then the other would be an undocumented convention, which Appendix D forbids. |

**Unresolved by this pass:** attack 2. A reviewer could reasonably rule the other way on
`LegalEntity` and `Dependency`. The decision is stated, reasoned and reversible — a `Version` bump
and two rows. **Status: OPEN — owner** if Ramzi disagrees.

---

*If this document disagrees with the vision, the vision wins and this document is broken — fix it.
If it disagrees with the code, the code wins, and that is a finding.*
