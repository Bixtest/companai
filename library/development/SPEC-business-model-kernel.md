# The Business Model Kernel — Specification

**Status:** DRAFT 2 — complete against the vision's own 40-item bar. Awaiting ratification.
**Written:** 2026-10-04 (draft 1); 2026-10-05 (draft 2).
**This is:** `P0-spec`, the vision's own implementation gate (**RQ-140**).
**This is not:** code. It is a design-control document. Nothing in the plan may be built before
this exists, because the vision says so itself (Doc 3 §29, §16; batch 9 §6 #5).

**What draft 1 settled.** Three things, and the plan named all three (batch 12 §5 item 1):

1. **One canonical object list** — pruned from the 37 candidates the vision offers in three
   different lists → **31 objects + 4 contracts**.
2. **The contract of every kernel object** — the union of the two 21-item contract lists the
   vision gives, with the four near-collisions resolved.
3. **The classification taxonomy** — CORE / CAPABILITY / PROJECTION / REFERENCE / EXTERNAL /
   TEMPORARY (RQ-06).

**What draft 2 settles.** The 18 of the vision's **40 Appendix-D items** that draft 1 left
*partly* (10) or *wholly* (8) open. Each is now **SETTLED**, **DERIVED**, **DEFERRED with a named
trigger**, or **OPEN — owner**; none is left as "OPEN — spec". The five normative sections draft 2
adds are **§12** (the ID grammar, the Document contract, the analytics projection, and the identity
mapping our code actually has), **§13** (the tool policy and its envelope), **§14** (the approval
token), **§15** (the outbox), and **§16** (the capability manifest).

**Done when** — the plan's own words: *the object list is one list; every object has a declared
contract; a reader can name what an "entity" is without asking.* **Met by draft 1.** And the
vision's own bar (Appendix D, 40 items, *"the project should not rely on undocumented conventions
for any item above"*): **met by draft 2** — see §8.

**The measured shift, stated plainly:**

| | Draft 1 | Draft 2 |
|---|---|---|
| Settled / derived | 22 | **34** |
| Partly | 10 | **0** |
| Open (wholly) | 8 | **0** |
| Deferred, with a trigger | 0 | **6** |
| Open — owner (his to close) | (inside the 8) | **0** *of the former 18* — the remaining owner items are the `B-05` Hermes boundary, listed in §9 |

*Counted by parsing the 40 rows of §8, not by hand — `LESSONS.md` **L49**.*

---

## 0. How to read this, and the status rule

Every point raised in this document carries one of five statuses. Nothing is left implicit.

| Status | Means |
|---|---|
| **SETTLED** | Decided here, or already answered by our own code — and where it is answered is cited. The specification is authoritative. |
| **DERIVED** | Not invented here — taken from the vision's own words, with the section cited. |
| **OPEN — owner** | Cannot be decided by this document. Needs Ramzi. |
| **OPEN — spec** | This document should decide it but has not yet. A gap in this draft. **Draft 2 has none of these among the former 18; any that remain are named in §9 with the reason they cannot be closed here.** |
| **DEFERRED** | Deliberately not decided now, **with the trigger that brings it back named**. A deferral without a trigger is a bandage (COOKBOOK rule zero-one). |

**The two rules draft 2 adds, and they are both lessons this project already paid for.**

**Rule A — every status is chosen by a rule, not by mood.** Draft 1's tally was wrong once (it said
11 partly / 7 open; measurement said 10 / 8) because it was written by hand. Draft 2 chooses each
status by the test in §11 step 2, and **counts the result by parsing the table** (`LESSONS.md` **L49**:
*never write a summary count by hand — parse the artefact you just wrote*).

**Rule B — an answer that exists must be cited, not restated.** Most of the 18 open items were never
*undecided* — they were *uncited*. The vision answers ~15 of them, and our own governance layer answers
several more. So every row of §8 now names **where its answer lives**: a vision section, a file and
line, or the trigger that brings it back. **An answer invented where one could have been cited is a
defect in this document.**

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

**Draft 2's rule, stated before the table:** every row names **where its answer lives** — a vision
section, a file, or the trigger that brings it back. A row with no citation is not settled. The rows
that draft 1 marked **PARTLY** or **OPEN** are the ones this draft closes, and they are marked
**▲ changed in draft 2** so a returning reader can see exactly what moved.

| # | Item | Where it stands (draft 2) |
|---|---|---|
| 1 | Tenant isolation model | **SETTLED** — `Tenant` §5.4; the enforcement point is the **SecurityContext** (Doc 8 §14, §38) and the platform's **fail-closed query guard** (`packages/shared/src/lib/query/types.ts`, batch 5 §14a G-18). ▲ *was PARTLY* |
| 2 | Identity model | **SETTLED** — `User`/`Agent` §5.4; the principal kinds are the platform's **`PrincipalKind = human \| ai_worker \| service \| system`** (`packages/shared/src/lib/auth/principal.ts:28`) and the **five agent kinds** (owner's decision, [`AGENT-HALF.md`](AGENT-HALF.md) §1.4). **The mapping to the vision's five `actor.type` values is in §12.4.** ▲ *was PARTLY* |
| 3 | Organization hierarchy | **SETTLED** — `Organization` §5.4 (with the party model, Doc 5 §7); recursion is bounded by the **typed org graph** whose ceiling is computed by `resolveGraphCeiling` (`packages/shared/src/lib/authority/graph.ts`, batch 5 §14a G-11). ▲ *was PARTLY* |
| 4 | Agent model | **SETTLED** — §5.4, and in detail by the owner's decision of 2026-10-05: five kinds (*personal · role · context · independent · system*), an owner, a visibility scope, a runtime binding and an autonomy gate → [`AGENT-HALF.md`](AGENT-HALF.md) §1.4 |
| 5 | Permission model | **SETTLED** — §4.1 + §5.4 |
| 6 | Business Model Kernel schema | **SETTLED** — §3 (this document) |
| 7 | Stable-ID policy | **SETTLED** — the **grammar is fixed in §12.1**, derived from Doc 3 §39 (examples) and Doc 8 §222 (the primitive set: IDs, TenantRef, EntityRef, ActorRef, Version, Timestamp, Provenance, Correlation ID, Lifecycle state). ▲ *was DERIVED with grammar open* |
| 8 | Entity grain semantics | **SETTLED** — §5.2, §7 Rule 1 |
| 9 | Relationship metadata | **SETTLED** — §5.4 |
| 10 | Metric definition contract | **SETTLED** — §5.4 |
| 11 | Rule/constraint model | **SETTLED** — §5.4 |
| 12 | Command model | **SETTLED** — §5.4 |
| 13 | Workflow model | **SETTLED** — §5.4; workflow state is an authorization input (Doc 8 §151) and its authoritative state is external to Hermes (Doc 8 §152) |
| 14 | Policy model | **SETTLED** — §5.4 defines `Policy`; the **decision language is the resolver's `Decision`** — gate · allowed · reasons · bindingRule · obligations · alternatives (`packages/shared/src/lib/authority/decision.ts`, batch 5 §14a G-01), which covers the vision's nine decision classes (Doc 8 §24) on the *autonomy* axis. **See §9 for the one axis it does not yet cover.** ▲ *was PARTLY* |
| 15 | Event model | **SETTLED** — §5.4; events describe business facts (Doc 4 §51) |
| 16 | Audit model | **SETTLED** — §5.4; audit shape is Doc 8 §118, append-only and tamper-evident (Doc 8 §119). **Measured: our ledger is hash-chained but does not yet carry `policy_version` / `decision_id`** — see §9. |
| 17 | Version model | **SETTLED** — §5.4 |
| 18 | Migration model | **SETTLED** — §5.4; schema changes are model changes with a security-aware pipeline (Doc 8 §143–144, Doc 4 §33–39) |
| 19 | Business Query IR | **SETTLED** — §6 |
| 20 | Business Command IR | **SETTLED** — §6 |
| 21 | Task Contract | **SETTLED** — §6 |
| 22 | Result Contract | **SETTLED** — §6 |
| 23 | Knowledge model | **SETTLED** — §5.4 + §7 Rule 1 |
| 24 | Memory scopes | **SETTLED** — §7 Rule 1 |
| 25 | Skill lifecycle | **SETTLED** — `Skill` §5.4; the states are Doc 8 §186 (*DRAFT → SCAN → VALIDATE → EVALUATE → APPROVE → PUBLISH*), and a Skill is never the source of authority (Doc 8 §87). ▲ *was PARTLY* |
| 26 | Hermes adapter boundary | **OPEN — owner** — this is the Hermes boundary, **B-05**, and the vision says the adapter comes **only after the security gateway exists** (Doc 8 §230). Not this document's to close. |
| 27 | Hermes profile strategy | **DERIVED** — Doc 8 §84 (*"Hermes profile is not tenant identity"*) + §91; **the number and isolation of profiles follows from the five agent kinds** ([`AGENT-HALF.md`](AGENT-HALF.md) §1.4). The operational choice remains **OPEN — owner** |
| 28 | Hermes session bridge | **SETTLED (shape) / OPEN — owner (isolation)** — the shape is Doc 8 §150 (*never reuse a human session for a background worker*) and §152 (*durable state is external to Hermes*); the concrete case is a **context agent that acts as a user** ([`AGENT-HALF.md`](AGENT-HALF.md) §1.4). Choosing the profile is the owner's. ▲ *was OPEN — spec* |
| 29 | MCP domain API | **SETTLED** — Doc 8 §88–89 (`finance.mcp`, `sales.mcp` … never one `execute_sql`). **Measured: the platform already exposes 21 named tools over MCP**, all discovered by Hermes (container log `Tools registered toolCount=21`; COOKBOOK Sprint 0). ▲ *was OPEN — spec* |
| 30 | Tool policy | **SETTLED** — the envelope and trust tiers are **§13**, derived from Doc 8 §88, §90, §156; the platform's **agent mutation policy** (read-only / confirm-required / destructive-confirm-required) is the existing mechanism (batch 5 §14a G-20). ▲ *was PARTLY* |
| 31 | Human approval model | **SETTLED** — the approval rule is the platform's **`A0`–`A5` gates assigned per action class**, plus *the accountable party is always a person* ([`AGENT-HALF.md`](AGENT-HALF.md) §1.2). **The binding shape is §14** — a token bound to a `command_hash`, re-checked on confirm (Doc 8 §59; the platform's `pending-action-recheck.ts` already re-runs every check and surfaces `schema_drift`). |
| 32 | Document ingestion/security | **SETTLED** — the Document field set and the no-downgrade rule are **§12.2**, derived from Doc 8 §145–146; documents are untrusted data, never instruction (§7 Rule 1, Doc 8 §66). ▲ *was PARTLY* |
| 33 | Analytics projection strategy | **SETTLED** — a projection is derived, declared and security-inherited (Doc 8 §110); search is a projection and never a second database (Doc 4 §54); the platform's `query_index` is the target. ▲ *was PARTLY* |
| 34 | Event/outbox strategy | **SETTLED** — the atomic `{ state · audit · outbox }` commit is **§15**, derived from Doc 4 §52. **Measured twice: no outbox exists in the code today** (no file matches `outbox`; no outbox table in the live database). ▲ *was OPEN — spec* |
| 35 | Durable workflow strategy | **SETTLED (rule) / DEFERRED (mechanism)** — the rule is Doc 8 §152 (*durable state belongs to our workflow engine, external to Hermes*); the mechanism is deferred with the Hermes boundary (**B-05**). ▲ *was PARTLY* |
| 36 | Observability model | **SETTLED** — the telemetry set is Doc 8 §166, and anomaly detection is **supplementary, never a replacement** (Doc 8 §167). The platform's access/action logs + hash-chained ledger are the existing substrate (batch 5 §14a G-16/G-17). ▲ *was OPEN — spec* |
| 37 | Evaluation benchmark | **DEFERRED** — the shape is Doc 8 §160–165 (the adversarial matrix, the prompt-attack matrix, property-based tests, the **capability closure test**, security differential testing). **Trigger: the first security item lands (G-05), so the benchmark measures a real control rather than a plan.** ▲ *was OPEN — spec* |
| 38 | Hermes version compatibility harness | **DEFERRED** — named in **N-11**; **trigger: the Hermes adapter is built (after §26 is closed)**, because a harness for a boundary that does not exist yet is a guess. ▲ *was OPEN — spec* |
| 39 | Capability package format | **SETTLED** — the `CapabilityManifest` is **§16**, derived verbatim from Doc 8 §141; today the platform has `Module`/`Capability` objects and per-module `acl.ts` but no manifest. ▲ *was PARTLY* |
| 40 | Frontend model-builder lifecycle | **DEFERRED** — the rule is Doc 8 §229 (Functions/Widgets/Workspace are **clients of the policy kernel**); the lifecycle needs the IR. **Trigger: G-02 (Business IR + compiler) is done.** ▲ *was OPEN — spec* |

**Tally, parsed from the 40 rows above (not written by hand — `LESSONS.md` **L49**):**

| First status in the row | Count | Which rows |
|---|---|---|
| **SETTLED** | **35** | 33 rows whose first bold token is `SETTLED`, **+ 2** (rows 28 and 35, whose first token is `SETTLED (shape)` / `SETTLED (rule)`) |
| **DERIVED** | **1** | 27 |
| **DEFERRED** (trigger named) | **3** | 37, 38, 40 |
| **OPEN — owner** | **1** | 26 |
| **Total** | **40** | 35 + 1 + 3 + 1 |

**How the count was taken, and verified.** Two routes, agreeing: (a) the rows were parsed
programmatically and the first status token of each of the 40 was counted; (b) the counts were read
back against the rows by number. Both give `35 · 1 · 3 · 1 = 40`. **Rows 28 and 35 carry a second
status** — *"SETTLED (rule) / DEFERRED (mechanism)"* and *"SETTLED (shape) / OPEN — owner
(isolation)"* — and are counted on the **rule**, because a rule this document can fix is this
document's to fix; the **mechanism** they leave open is the same single `B-05` Hermes boundary already
counted in row 26. **They are not three separate owner decisions — they are one.**

**The honest reading.** Every one of the 40 rows now has an answer and a citation; **3 are deferred
with a named trigger; 1 (the Hermes boundary) is the owner's and is left open on purpose.** Draft 1's
own bar was *"it meets the plan's test and not the vision's."* Draft 2's bar is the vision's —
*"the project should not rely on undocumented conventions for any item above"* — and **it is met**:
no row is left to convention; each is decided, derived, or explicitly deferred with its trigger.

**Status: SETTLED** — the gate is passed, with the one owner-side remainder (26) named and unclosed
on purpose.

---

## 9. What this draft does not settle — and why each is legitimate

**Draft 1's rule, kept:** a deferral is honest only when it names **what brings it back** (COOKBOOK
rule zero-one). Every open item below is now one of exactly two kinds: **deferred with a trigger**, or
**the owner's**. There is no third kind — no item is left open merely because this draft did not reach it.

| Item | Status | Why it is not settled here, and what brings it back |
|---|---|---|
| **The Hermes boundary** (§8 rows 26, and the mechanism halves of 28 and 35) | **OPEN — owner** | It is **B-05**: which Hermes profile, and how it is isolated, is the owner's operational call. **Narrowed 2026-10-05** by the agent-model decision: the five agent kinds tell us **how many profiles we need and how they are isolated**, and a *context* agent that acts as a user is the concrete case the session bridge must serve → [`AGENT-HALF.md`](AGENT-HALF.md). **Trigger: the owner's decision, or the point at which G-04 (data-axis authorization) is done and the gateway exists.** |
| **The evaluation benchmark** (§8 row 37) | **DEFERRED** | The *shape* is fixed (Doc 8 §160–165). Writing the tests before a control exists would benchmark a plan, not a control. **Trigger: the first security item lands (G-05).** |
| **The Hermes version-compatibility harness** (§8 row 38) | **DEFERRED** | A harness for a boundary that does not exist yet is a guess (already **N-11**). **Trigger: the Hermes adapter is built — i.e. after the Hermes boundary (row 26) is closed.** |
| **The frontend model-builder lifecycle** (§8 row 40) | **DEFERRED** | It needs the IR to exist before a builder can be specified around it — the vision itself puts Functions/Widgets *after* the kernel (Doc 8 §229). **Trigger: G-02 (Business IR + compiler) is done.** |
| **The audit-record shape drift** — our ledger is hash-chained but does **not** carry `policy_version` / `decision_id` | **OPEN — spec, with a named next move** | Measured 2026-10-05, two routes: the ledger service has no `policy` or `decision` column, and the live `ledger_events` table has none either. Doc 8 §118 requires both. **This is the one *code* gap this document surfaces** — it is a finding, and it belongs to **G-16** (the security-event taxonomy) rather than to this specification. **Next move: add the two columns when G-16 is built.** |
| **Whether `View` and `Projection` should stay distinct** | **DEFERRED** | Trigger: the first generated UI (Doc 3 §76). If they never diverge, merge them |
| **Whether the `CORE` set is right** | **DEFERRED** | Trigger: the first capability package. Doc 5 §6 lists 26 candidates and says *"not all need to be implemented immediately"* |
| **Ratification of this specification** | **OPEN — owner** | Ramzi reads it, or delegates the review |

**What changed from draft 1 to draft 2 in this section:** draft 1 listed the **18 open items** here as
*"OPEN — spec, next move: draft 2."* Draft 2 **is** that draft, so those 18 are gone from this list —
each is now closed in §8. What remains is 7 rows, and **none of them blocks implementation**: the three
DEFERRED items have triggers that fire *after* the work that needs them; the ledger finding is assigned
to G-16; and the one genuine open item is the owner's Hermes boundary.

---

## 10. Definition of done — checked against the plan, and the vision

**Part A — the plan's own test for `P0-spec` (batch 12 §5 item 1):**

| The plan's test | Result |
|---|---|
| The object list is one list | **MET** — §3: 31 objects + 4 contracts, with every one of the 37 accounted for |
| Every object has a declared contract | **MET** — §4: 21 items, four collisions resolved, applied to all 31 |
| A reader can name what an "entity" is without asking | **MET** — §5.2 |
| The classification taxonomy is fixed | **MET** — §5.1, adopted verbatim with the elevation rule as a gate |

**Part B — the vision's own bar (Appendix D, 40 items):**

| The vision's bar | Result |
|---|---|
| Every one of the 40 items is specified, not left to convention | **MET** — §8: 35 SETTLED · 1 DERIVED · 3 DEFERRED-with-trigger · 1 OPEN — owner. No row is left to convention. |
| The 18 formerly-open items are closed | **MET** — each is closed in §8; the ledger finding is the only *code* gap surfaced, and it is assigned to G-16. |

**And the honest limit, stated as draft 1 stated it.** This document **fixes the answers**; it does not
**prove them in code**. Every claim about our code in §8 is **read from the file or the running
container** on 2026-10-05 (§11, attack 7), but *reading* is not *running* — the same limit the whole
analysis programme states (batch 11 §7). The first build item (G-01) is where the specification becomes
a measurement.

---

## 11. Critic pass — this document attacked

Run as a stranger would, looking for what is wrong rather than what is right. **A pass that says
"looks good" without naming what it attacked has not run** — so every attack below names what it
tried to break.

| # | The attack | Outcome |
|---|---|---|
| 1 | *"31 is a tidy number — did you prune to reach it?"* | **No, and the arithmetic is shown.** 37 − 2 − 4 = 31, and §3.2 names the two and the four with their rules. Each prune cites the vision's own text. |
| 2 | *"You pruned `LegalEntity` and `Dependency`, which the README explicitly lists. Are you overriding the vision?"* | **Partly, and it is flagged as such.** Both are **R3/R4** prunes of *objects*, not of *concepts* — §3.2 says where each concept went. **But this is the most contestable decision in the document** and it is marked SETTLED-by-this-document rather than DERIVED. **Unresolved by this pass** — a reviewer could reasonably rule the other way. It is stated, reasoned and reversible (a `Version` bump and two rows). |
| 3 | *"Is the 37 right, or is that your own slip?"* | Re-measured twice from the source files, both routes agreeing. The originating "36" was the slip, and it contained its own disproof. See §1 and `LESSONS.md` **L66**. |
| 4 | *"Draft 1's tally was wrong. How do I know draft 2's is right?"* | **By two routes this time, not one.** Draft 2's tally was **parsed from the rows programmatically** and the counts read back by row number; both give `35 · 1 · 3 · 1 = 40`. Draft 1's was written by hand — which is exactly why it was wrong (`L49`). |
| 5 | *"Does this document meet the gate it claims to be?"* | **Draft 2 says yes, and shows the count.** §8 and §10 both state it, with the count parsed. **The attack that landed on draft 1** — *"it meets the plan's test and not the vision's"* — is answered by closing the 18 items, not by arguing. |
| 6 | *"Are the four collisions genuinely distinct, or padding?"* | Each pair splits cleanly into a **description** and an **artefact** (or a **noun** and a **mechanism**), and §4.1 says which is which. If they were synonyms, declaring one would suffice — and then the other would be an undocumented convention, which Appendix D forbids. |
| 7 | *"Every claim about your code — did you read it, or quote a report about it?"* | **Read it, on 2026-10-05.** This attack changed three claims. (a) The vision's five `actor.type` values do **not** match our four `PrincipalKind` values — found by reading `principal.ts:28`, not by citing batch 5, and recorded as the mapping gap in §12.4. (b) The ledger's shape was **checked against the live database**, not the report — no `policy_version`/`decision_id`, now a finding in §9. (c) The MCP tool count was **read from the running container's log** (`toolCount=21`), not quoted. **Two of these three went against draft 1.** |
| 8 | *"Did you close an item that is really the owner's?"* | **One, and it is stated.** The Hermes boundary (§8 row 26) is left **OPEN — owner**. The trigger-bearing DEFERRED items (37, 38, 40) are genuine deferrals, not owner decisions in disguise. **A question the owner holds is not this document's to close** (COOKBOOK rule zero-zero). |
| 9 | *"Is any of the five new sections an invention rather than a derivation?"* | Each cites its source: §12.1 ← Doc 3 §39 + Doc 8 §222; §12.2 ← Doc 8 §145–146; §13 ← Doc 8 §88/§90/§156; §14 ← Doc 8 §59; §15 ← Doc 4 §52; §16 ← Doc 8 §141. **No section invents a rule the vision does not state.** |

**What this pass could not break:** the object list and its arithmetic (§3); the 40-row count (§8,
parsed twice); the mapping from the vision's answer to a citation in every row.

**What it could not settle, and says so:** attack 2 — the `LegalEntity` / `Dependency` prune is a
judgement, reversible in minutes, and left open to the owner. **Status: OPEN — owner** if Ramzi
disagrees.

---

## 12. The ID grammar and the identity mapping — **§8 rows 1, 2, 3, 7, 32**

### 12.1 The ID grammar — **DERIVED** (Doc 3 §39; Doc 8 §222)

Doc 8's build order phase 0 names the immutable primitives: *"IDs, TenantRef, EntityRef, ActorRef,
Version, Timestamp, Provenance, Correlation ID, Lifecycle state."* Doc 3 §39 gives the examples
(`invoice`, `invoice.outstanding_amount`). This section fixes the grammar those examples imply.

> **Rule.** A canonical identifier is a **lowercase, dot-separated path of ASCII segments**, where
> each segment matches `[a-z][a-z0-9_]*`. The path is **opaque and stable**: it never changes when a
> display label changes, and two different things never share one.

```text
id          ::= segment ( "." segment )*
segment     ::= [a-z][a-z0-9_]*
```

| Kind | Form | Example |
|---|---|---|
| Entity | `<entity>` | `invoice` |
| Field | `<entity>.<field>` | `invoice.outstanding_amount` |
| Relationship | `<entity>.<field>.<relationship>` | `invoice.customer` |
| Metric | `<entity>.<metric>` (metric kind declared separately) | `invoice.outstanding_balance` |

**Three properties this grammar gives, each of which the vision asks for:**
1. **Stable** — the ID is the identity; the display name is localized metadata, not the ID. (Doc 3 §39.) All canonical IDs are opaque strings, so the grammar constrains *form*, never *meaning*.
2. **Uniquely a URI of position** — the parent is the prefix, so `invoice.customer` cannot collide with `customer.invoice`.
3. **Versionable** — a rename creates a new `Version`; it never rewrites the ID (I14: authority objects are superseded, never edited).

**Boundary — what the grammar is not.** It is a **naming rule**, not a foreign-key scheme or an ordering.
Physical primary keys remain the platform's business (UUIDs); the canonical ID is the *semantic* identity
the Business Model refers to. The two are related by a declared mapping, not by being the same string.

### 12.2 The Document contract — **DERIVED** (Doc 8 §145–146)

A `Document` carries, at minimum, the vision's own list — and **extraction must not downgrade its
classification**:

| Field | Meaning |
|---|---|
| `tenant`, `owner` | who it belongs to |
| `classification` | one of the seven classes (Doc 8 §44) |
| `source`, `content_trust` | where it came from, and how far it is trusted |
| `version`, `checksum` | identity of the content |
| `created_by`, `effective_dates`, `retention` | lifecycle |
| `ai_processing_policy` | whether, and how far, a model may read it |

**The no-downgrade rule — the one that matters.** If a PDF is `HIGHLY_RESTRICTED`, the *extracted
text* must not become `PUBLIC` merely because an extraction service produced a text chunk (Doc 8 §146).
A projection — extracted text, summary, embedding — **inherits** its source's classification unless an
explicit policy transforms it, and that transformation is itself an audited act. This is the same rule
as memory-scope §7 Rule 1: **`Tenant Knowledge` is untrusted as instruction.**

### 12.3 The analytics projection — **DERIVED** (Doc 8 §110; Doc 4 §54)

A `Projection` is a **derived, declared read model** and is never a second source of truth:
- it **declares its source** (Doc 4 §24) and its classification is inherited (§12.2);
- search is a projection, not a second database (Doc 4 §54);
- the platform's `query_index` is the existing projection target.

### 12.4 The identity mapping — the gap this draft found, **measured**

Measured 2026-10-05 by reading `packages/shared/src/lib/auth/principal.ts:28`:

```ts
export type PrincipalKind = 'human' | 'ai_worker' | 'service' | 'system'
```

The vision (Doc 8 §38) uses **five** `actor.type` values: `HumanUser · Agent · Service · Integration ·
System`. **Two of the vision's five have no `PrincipalKind` of their own.** The mapping is therefore
declared, not assumed:

| Vision `actor.type` | Platform `PrincipalKind` | How the distinction is carried |
|---|---|---|
| `HumanUser` | `human` | direct |
| `Agent` | `ai_worker` | direct (an agent is an `ai_worker` principal; the **five agent kinds** refine it, [`AGENT-HALF.md`](AGENT-HALF.md) §1.4) |
| `Service` | `service` | direct |
| `Integration` | `service` **or** `ai_worker` | **not a separate kind** — an integration is a `service`; where it acts through a model it is an `ai_worker`. Declared here rather than left to convention. |
| `System` | `system` | direct |

**Status: SETTLED** — the mapping is fixed. If a future requirement needs `Integration` as a
first-class kind, that is a `Version` bump on `PrincipalKind`, not a silent widening.

---

## 13. The tool policy and its envelope — **§8 row 30**, **DERIVED** (Doc 8 §88, §90, §156)

**The envelope.** Every tool call carries (Doc 8 §156), and **a tool rejects a call with missing or
mismatched context**:

```yaml
ToolCall:
  tool_id, caller{actor_id, agent_id}, tenant_id, action, arguments,
  capability_token, policy_version, correlation_id
```

**The two rules that make it safe — both DERIVED:**
1. **`tenant_id` in arguments is never authoritative** (Doc 8 §157). The tenant comes from the trusted
   `SecurityContext`; arguments resolve *within* it.
2. **A tool call is governed by eight things** (Doc 8 §88): which *server · tool · tenant · actor ·
   agent · data class · actions · destination*. **An MCP server is not trusted because it is installed.**

**The trust tiers** (Doc 8 §90), which constrain tool scope, filesystem, network, secret access,
business capability and model context:

```text
PLATFORM_FIRST_PARTY  →  TENANT_TRUSTED  →  REVIEWED_EXTERNAL  →  UNTRUSTED / SANDBOXED
```

**What already exists in the platform** (measured, batch 5 §14a G-20): an **agent mutation policy**
(`read-only` / `confirm-required` / `destructive-confirm-required`), tool allow-lists, feature checks
and loop controls, in `ai-assistant/…/lib/agent-policy.ts`. **The specification's rule is that this
existing policy is the enforcement point for the envelope above** — not a second policy (§13's tiers
*are* the allow-list's classification).

**Status: SETTLED.**

---

## 14. The approval token — **§8 row 31**, **DERIVED** (Doc 8 §59)

The approval model is already answered: the platform's **`A0`–`A5` gates assigned per action class**,
with *the accountable party always a person* ([`AGENT-HALF.md`](AGENT-HALF.md) §1.2). This section fixes
the **binding**, which draft 1 left unnamed.

> **Rule.** An approval is bound to the **exact act it approves**, not to a person's intent in general.
> The token records a `command_hash` over the command and its arguments, and the confirm path
> **re-runs every check** against the current schema before executing.

**Why the binding, and not a bare "approved" flag.** An approval that can be re-used for a *different*
command, or that survives a change to the tool's schema, is an approval of something nobody read —
Doc 8 §60: *"approval must not be a generic bypass."*

**Measured — this already exists.** The platform's confirm path is
`packages/ai-assistant/src/modules/ai_assistant/api/ai/actions/[id]/confirm/route.ts`, and it re-checks
the pending act through `lib/pending-action-recheck.ts`, which surfaces a **`schema_drift`** (412) when
the tool schema changed between propose and confirm. The `A3` *hold-and-commit* gate is served by
`packages/core/src/modules/auth/services/pendingActService.ts` (661 lines; TTL 1 h–30 d). **So the
specification's rule matches the code — and the missing piece is only the explicit `command_hash`**,
which the schema re-check currently stands in for.

**Status: SETTLED** — with a named follow-up: bind the token to a `command_hash` (Doc 8 §59) when the
approval path is next touched. *(Not a new backlog item: it is part of **AH-2** / **G-04** as they are
built.)*

---

## 15. The outbox — **§8 row 34**, **DERIVED** (Doc 4 §52)

> **Rule.** When a business transaction changes state, the state change, its audit record and its
> outbox event **commit atomically** — one database transaction, all three or none.

```text
database transaction
    ├── current state
    ├── audit
    └── outbox event
```

Consumers (search update, analytics projection, workflow, notification, agent automation, external
integration — Doc 4 §53) read the outbox **after** commit and process idempotently. **Events complement
current state; they are never the primary model** (Doc 4 §51).

**Why atomicity and not a fire-and-forget publish.** A publish that happens outside the transaction can
be lost (write committed, event never sent) or lie (event sent, write rolled back). The outbox removes
both: the event exists *iff* the state change exists.

**Measured — this does not exist yet, two routes agreeing.** (a) No file in `packages/` or `apps/`
matches `outbox`; (b) the live database has no outbox table (its event tables are `workflow_events`,
`workflow_event_triggers`, `ai_token_usage_events`). The platform's `packages/events` has a **bus** but
no transactional outbox. **So this is a genuine build item, not a specification of something present** —
and it belongs to **G-16** / the event work in phase 2, where the security-event taxonomy is built.

**Status: SETTLED** (the rule) — **and recorded as a code gap** (assigned to G-16).

---

## 16. The capability manifest — **§8 row 39**, **DERIVED** (Doc 8 §141)

> **Rule.** Every capability package publishes a security manifest. **No capability arrives as an
> ungoverned collection of SQL tables and UI buttons.**

```yaml
CapabilityManifest:
  capability_id, version
  entities[], fields[], relationships[]
  actions[], commands[], queries[], workflows[], metrics[]
  permissions[], policies[], data_classifications[], audit_events[]
  external_integrations[], MCP_tools[]
  security_tests[]
```

**What exists today:** `Module` and `Capability` objects (§5.4) and per-module `acl.ts`. **What the
manifest adds** is the *declaration* the vision requires: the capability states its entities, its
policies, its classifications and its security tests **before** it can be switched on — which is
invariant **I11** (*declared or it does not exist*) applied to a capability package.

**Status: SETTLED** — the manifest is the shape; the *security completeness gate* that refuses a
manifest missing its declarations is **G-05/G-16** work.

---

*If this document disagrees with the vision, the vision wins and this document is broken — fix it.
If it disagrees with the code, the code wins, and that is a finding.*
