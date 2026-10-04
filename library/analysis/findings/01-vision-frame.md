# 01 — The vision: the frame

**Batch:** 1 of 12 · **Date:** 2026-10-03 · **Status:** DONE

**The question this batch answers.** What is this platform meant to be, in plain
English — and what are the rules that everything else has to obey?

**Why it came first.** `README.md` in the vision set is not an introduction. It is the
**design-control document**: it carries the precedence rule, the architecture hierarchy,
the five concepts, the vocabulary, the list of what is deliberately *not* decided, and
the list of objects that must be defined before implementation starts. Every later pass
needs it, and so does every later batch.

**What was read.** `library/ai/ai-first/README.md`, all 1,756 lines. Plus our own
`compai/planning/00-product-thesis.md` and `01-core-architecture.md`, read only to
answer one question: is our design the same design as the vision, or a different one?

---

## 1. The vision, in plain English

Today, business software is a fixed product. You buy it, you use the features it
happens to have, and when you need something it does not do you ask the vendor and wait
— sometimes for years.

This vision says something different. **The description of the business is the
product.** A company describes itself; that description is kept as a precise,
machine-readable thing called the **canonical business model**. Everything else is
produced *from* it: the database tables, the screens, the programming interface, the
AI's understanding of the business, the tools the AI is allowed to use, the
documentation, and the tests.

Four consequences follow, and they are the whole design:

1. **The AI never touches the database.** It says what the user *means*, in a typed and
   checkable form — **Business IR**. Ordinary deterministic software then decides
   whether that is valid and carries it out. The AI proposes; it does not execute.
2. **Hermes is the thinking part, not the truth.** Hermes reasons, uses tools, remembers,
   and holds conversations. It does **not** hold business records, and it is not where
   the company's real data lives. The platform is the authority; Hermes is the brain.
3. **Repeated AI work becomes permanent software.** The first time someone needs
   something new, the AI helps build it, a person checks the result, and the platform
   saves it as a **Function**. From then on it runs with no AI at all. So AI is not a
   permanent bill — it is the mechanism by which new features get built.
4. **It runs on a small local model by default.** That is possible precisely because the
   AI is not asked to know the business: the business model supplies the meaning, the
   Business IR constrains the shape, and deterministic software does the computation. A
   cloud model is an optional upgrade, not a requirement.

And the thing it is all for: as the platform grows, it must not fall apart into
disconnected pieces. One business model, one set of relationships, no "database
islands", no two places holding the same authoritative fact.

The set's own one-line summary, from §30, is worth having in front of us:

> A self-extending, local-first business operating platform whose canonical business
> model remains the single source of truth, while Hermes provides adaptive intelligence
> and the platform continuously compiles business definitions into coherent data,
> application, AI and workflow capabilities.

**Five systems converge in it:** the business model (what the business means), the data
platform (what it stores and how it stays coherent), the application compiler (how the
model becomes screens and interfaces), the Hermes agent runtime (how the AI reasons),
and user-created Functions (how AI work becomes permanent features).

---

## 2. The five concepts everything else depends on

These are the set's own five (§10). A reader who does not have these clear will misread
every later document.

| Concept | What it is | Why it matters to us |
|---|---|---|
| **Business Model Kernel** | The canonical machine-readable definition of the business: entities, fields, relationships, metrics, rules, constraints, commands, workflows, policies, events, views, permissions, versions. *"The platform's semantic authority."* | This is the thing we do not have in any form. It is the vision's centre |
| **Core Data vs Capability Data** | Core data is shared infrastructure. Capability data is business-specific functionality. The architecture exists to stop capability modules duplicating shared identities | This is the direct answer to the "database islands" question we will ask of our own platform in batch 7 |
| **Business IR** | The AI produces *business intent*, not database operations. The boundary between probabilistic interpretation and deterministic execution | Nothing in our platform does this today. Our AI tooling calls actions directly |
| **Hermes as Agent Runtime** | Hermes provides agents, sessions, skills, memory, MCP, tool orchestration, subagents, automation. The platform provides truth, tenancy, authorization, data, business rules, commands, transactions, schema | This is the division of labour the whole integration rests on. **It is the subject of batch 6** |
| **User Functions** | Repeated successful AI work is promoted into deterministic functionality: AI-created → validated → saved → deterministic | Nothing in our platform does this. It is the single most distinctive product idea in the set |

---

## 3. The rules that bind everything

### 3a. When two documents disagree — the precedence rule (§14)

The set was written over time, so it contains ideas that were later replaced. The rule
is explicit and ordered:

```text
1. Explicit architectural invariants
2. Latest design-control architecture
3. Later refined subsystem architecture
4. Earlier architecture
5. Brainstorming / examples
6. Vendor-specific implementation details
```

The README gives two worked examples, and both matter to us:

| Earlier idea | Replaced by | Which we must use |
|---|---|---|
| Save generated SQL as a Function | Save validated Business IR + dependencies; treat compiled SQL as a derivative | **The refined one** |
| Hermes profile as tenant | Hermes profile = agent runtime environment; Tenant = business/security boundary | **The refined one** |

The second one is a direct instruction about the Hermes integration, and it will be
tested against the Hermes code in batch 6.

**Consequence for this programme.** A careless reader who starts at document 1 will
build the wrong thing. That is why this batch read the README first, and why batches
2–5 must record what the precedence rule makes us drop rather than quietly keeping both.

### 3b. A lower level may not redefine a higher level (§13)

Six levels, in order:

```text
LEVEL 1  Business meaning
LEVEL 2  Canonical Business Model
LEVEL 3  Business IR / Commands / Workflows
LEVEL 4  Compilers / Domain Engines / Policy Engines
LEVEL 5  Physical databases / event stores / analytics engines
LEVEL 6  Hermes / local models / cloud models / infrastructure
```

The README's own examples of what this forbids:

- a **database column name** must not secretly become the definition of a **business concept**;
- an **LLM interpretation** must not silently become a **business rule**.

This is the same idea as our own invariant I11 ("declared or it does not exist") —
arrived at independently, and phrased as a direction of authority rather than a
declaration requirement.

### 3c. The two invariants the whole security model rests on

From the security kernel document, quoted in the README:

> **AI may propose; deterministic platform policy must authorize; deterministic business
> services must execute; authorized result layers must control disclosure.**

> **Unauthorized data should not enter an AI context in the first place.**

The second one is not a goal we would have to adopt. It is the property our authority
layer was built to guarantee. **Two designs arriving independently at the same invariant
is a good sign for both** — and it is the strongest evidence so far that the vision and
our platform are aiming at the same thing. Confirming it against our actual code is
batch 5's and batch 9's job, not this one's.

### 3d. There is an explicit gate before implementation

§29 ends with:

> If those answers are not clear, the implementation phase should not yet begin.

and §16 says the **Business Model Kernel specification is the next major design-control
artifact** — the vision itself says the next document to write is the machine-readable
object model, before substantial implementation. That is a requirement on *us*, and it
belongs in the development plan (batch 12).

---

## 4. Who owns what — Hermes versus the platform

This is stated twice in the README, in two different ways, and both are precise enough
to build against.

**The division (§10, Concept D):**

```text
HERMES provides          the PLATFORM provides
  agents                   truth
  sessions                 tenancy
  skills                   authorization
  memory                   data
  MCP                      business rules
  tool orchestration       commands
  subagents                transactions
  automation               schema
```

**The one-line rule (§5):**

> Hermes can learn how to use the business system; the Business Platform must define
> what the business system means.

**And three traps named directly in §5**, as questions the Hermes document exists to
answer:

- Hermes is **not** the ERP database;
- a Hermes **profile is not a tenant**;
- Hermes `state.db` is **runtime/session state, not business truth**.

Those three are the first entries in the contested-ownership register (batch 10), and
each one must be checked against the Hermes code in batch 6 rather than taken on trust.

---

## 5. What the vision deliberately does **not** decide

Ten items, verbatim from §15:

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

with the condition: *"These should be evaluated against the architecture rather than
allowed to define it."*

**Why this is the most useful paragraph in the set for us.** Our platform already has an
answer to most of those ten: Open Mercato gives us a database schema and migrations, a
front end, a workflow and rules layer, a search and indexing layer, and a running
system. The vision did not pick any of them.

**So filling those slots with what we already have does not contradict the vision.**

**But be careful about how far that goes.** The condition attached is a requirement on
the choice, not a licence. Filling the slot is free; *showing that what fills it
satisfies the architecture* is the work. This is an opportunity **with a condition**, and
this batch records it that way rather than as something for nothing. Proving each one is
batch 9's job.

---

## 6. The 33 objects that must be defined before implementation

§16 lists the objects that the next design-control artifact must formalise. Counted two
ways — by eye and by grep — **33 objects**, in eight groups:

| Group | Objects |
|---|---|
| Tenancy and identity (7) | Tenant · Organization · LegalEntity · User · Agent · Role · Permission |
| Structure (2) | Module · Capability |
| Model (5) | Entity · Field · ValueObject · Enum · Relationship |
| Semantics (3) | Metric · Rule · Constraint |
| Behaviour (3) | Command · Workflow · Policy |
| Derivation (3) | Event · Projection · View |
| Knowledge and tooling (5) | Document · Knowledge · Skill · Tool · Integration |
| Lifecycle (5) | Function · Migration · Version · AuditRecord · Dependency |

For each object the specification must define: identity · ownership · version ·
lifecycle · dependencies · permissions · serialization · runtime representation ·
database representation · AI representation · UI representation · migration behaviour.

**This list is the closest thing the vision has to a build order**, and it is the
skeleton the development plan will hang on. Note how much of it is *governance*:
Role, Permission, Policy, AuditRecord, Version, Migration, Dependency, Constraint.
That is a large part of what our platform already has.

---

## 7. The vocabulary — and the words that collide with ours

Fifteen terms are defined in §21. Most are new to us. Four collide, and the collisions
are dangerous because both sides use the same word confidently.

| Term | The vision means | Ours means | Verdict |
|---|---|---|---|
| **Capability** | A cohesive **business area** that adds entities, commands, workflows, metrics, policies and UI — Finance, Sales, HR | A **permissioned action** in a registry, with an effect class and reversibility (`authority:explain --capability`) | **Direct collision.** Unrelated meanings, same word. Must be renamed on one side before the map is built |
| **Skill** | Procedural **knowledge** for an agent | A definition that **compiles** into an executable procedure plus its tests | **Close, not identical.** Ours is executable and tested; theirs is what an agent knows |
| **Knowledge** | Documents and reference information | A module with sources, collections, bindings, provenance, rights, freshness and a review lifecycle | **Ours is far richer.** Theirs is the raw material; ours is the governed system |
| **Function** | A saved deterministic operation — validated Business IR + parameters + dependencies + permissions + versions | Not used for this. We have no equivalent concept | **New to us.** The most distinctive idea in the vision |
| **Memory** | Contextual knowledge or observations for an agent or user | No equivalent. We have knowledge, not memory | **New to us** |
| **Command** | A typed business mutation | We have capabilities with effect classes — permission-shaped rather than operation-shaped | **Related, different centre** |
| **Projection** | A derived representation optimised for a particular use | Same meaning — our invariant I10 says everything else is "a declared projection" | **Agreement** |
| **Tenant** | Business, security and data boundary | Same | **Agreement** |
| **Module** | Listed as an object; not defined in §21 | A registered unit declaring objects, capabilities, events, views and actions | **Compatible** |
| **Model Runtime** | The interface between the platform and the inference engine | No equivalent — our AI package calls a provider directly | **New to us** |
| **Dependency Graph** | A registry of what depends on what | No equivalent | **New to us.** Central to the vision's coherence story |
| **Schema Compiler** | Converts the canonical model into physical and application artefacts | Migrations, written by hand | **New to us** |
| **Business Model Kernel** · **Core Data** · **Business IR** · **Hermes Profile** | — | No equivalent | **New to us** |

**The Capability collision is the one to fix first.** It is a naming problem, not an
architectural one, and it will poison every later document if it is not settled. It is
Ramzi's decision and it is raised at the end of this report.

---

## 8. The failures the design exists to prevent

Worth recording because they are the acceptance criteria in disguise — a design that
prevents them is working, whatever it looks like.

| Class | Failures named in §11 |
|---|---|
| **Data** | duplicate entities · database islands · duplicate customer records · inconsistent master data · ambiguous ownership · broken relationships · schema drift · stale projections |
| **AI** | semantic hallucination · wrong entity · wrong field · wrong metric · wrong relationship · wrong time period · wrong currency · wrong aggregation · wrong command |
| **Security** | cross-tenant access · privilege escalation · document prompt injection · skill poisoning · memory poisoning · unauthorized commands · untrusted MCP capabilities |
| **Platform** | schema drift · documentation drift · AI semantic drift · Function breakage · workflow breakage · hidden migration dependencies · model/provider lock-in |

Note how many of these our governance layer already addresses, and how many it does not
touch at all: every one of the *data* and *platform* failures is about the model staying
coherent as it changes — which is the part of the vision we have nothing for.

---

## 9. The completeness check

The mechanical route. Every occurrence of the words that carry an obligation, counted
per document. This is what lets batches 2–5 be checked for completeness instead of
trusted.

| Document | must | should | required | never |
|---|---:|---:|---:|---:|
| `06_Platform_Foundation_and_Security_Kernel_Specification.md` | **103** | 186 | 14 | **37** |
| `04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution.md` | 23 | 100 | 6 | 4 |
| `05_Widgetized_Collaborative_Workspace_Architecture.md` | 17 | 80 | 7 | 6 |
| `03_Local_First_AI_Runtime_and_User_Function_Architecture.md` | 15 | 74 | 13 | 7 |
| `AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md` | 12 | 93 | 10 | 11 |
| `README.md` | 12 | 43 | 2 | 4 |
| `ai_first_erp_semantic_database_architecture.md` | 4 | 20 | 3 | 0 |
| `ai_first_erp_research_analysis.md` | 3 | 18 | 0 | 2 |
| `deep-research-report.md` | 1 | 0 | 1 | 0 |
| **total** | **190** | **614** | **56** | **71** |

Three things this tells us before we read another word:

1. **The security kernel is a different order of document.** 103 `must` and 37 `never`
   against 12 and 4 in the README. Whatever the platform's rules are, most of them are
   in that one file — which is why it gets a whole pass to itself (batch 5).
2. **"Should" outnumbers "must" three to one.** The set is a design argument, not a
   specification. A register that treats every "should" as a requirement would be three
   times too large and mostly noise. Batches 2–5 will treat `must` / `must not` /
   `required` / `never` as the requirement set and keep `should` as lower-priority
   candidates, recorded separately.
3. **Two documents carry almost nothing** — the research analysis and the OSS report.
   They explain why the design exists; they are not where the requirements are.

**Honest limit of this check.** It counts *occurrences of words*, not requirements. It
cannot tell a real obligation from a sentence like "you should have seen the earlier
version". It is a completeness check on the reading, not a register. That is exactly why
batches 2–5 still read the documents.

---

## 10. Our design versus the vision

This is the comparison the owner asked for — "challenge, verify, fact-check, suggest" —
and the most consequential part of this batch. **Our own design is
`compai/planning/`: 15 invariants (I1–I15) and 16 provisional decisions (D-01–D-16).**

### 10a. Where the two agree — and they arrived there independently

The vision set mentions Open Mercato, Companai, Paperclip and Aissistant **zero** times.
It has never seen our design. So every agreement below is a genuine convergence, not an
inheritance:

| Idea | The vision | Ours |
|---|---|---|
| One authoritative copy | "no duplicate authoritative fact"; everything else is a declared projection | **I10** — every business record has exactly one owning system |
| One decision point | "deterministic platform policy must authorize" | **I5** — exactly one component decides; a second policy implementation is a bug |
| Discovery must not widen access | "unauthorized data should not enter an AI context in the first place" | **I7** — tags, search, mentions, embeddings may only narrow what an actor can already see |
| Declarative source → compiled artefact | model → database + API + UI + AI + MCP + skills + docs | **Charter → compiled Grant Set**; the running system reads the Grant Set, never the Charter |
| Provenance and audit as first-class | audit, provenance and security-event architecture | **I3** — nothing acts without an attributable principal; the hash-chained ledger |
| Reversibility matters | effect classes and reversibility on capabilities | **I8** — every capability declares reversible / compensatable / irreversible |
| A lower level must not redefine a higher one | §13, six levels | **I11** — declared or it does not exist; status expressed in the type system, not prose |
| Don't let a module enforce its own rules | policy decision / enforcement architecture | **I5** — "a module containing `if (user.isAdmin)` has failed review" |

That is a long list, and it is the strongest single result of this batch. **Two designs,
written without knowledge of each other, agree on the platform's core rules.** It also
means the vision is not a threat to our governance layer — it is largely a restatement of
why that layer exists.

### 10b. Where the two genuinely differ

Four differences, and they are real rather than cosmetic.

**1. What sits at the centre.**

| | VISION | OURS |
|---|---|---|
| Source of truth | the **canonical business model** | the **governance kernel** — principals, charters, capabilities, context graph, ledger |
| The durable asset is | the model and the compiler that turns it into software | the governance layer — "not the agents" |
| First artefact to build | the Business Model Kernel specification (§16) | the kernel — "Phase 0: principals, capabilities, resolver, ledger" |

These are not incompatible — a model needs authority to enforce it, and authority needs
something to govern — but they imply a different **first thing to build**. That is a real
decision, and it is the owner's.

**2. Generated code versus composed components.**

Our design is explicit that it prefers composition and is wary of generation. The Garage
exists so that a generated app "is a composition of catalogued ingredients, which is
reviewable, diffable and reversible — **unlike generated code**."

The vision's compiler emits database, API, UI, MCP, skills, documentation and tests from
the model. Generation *is* the mechanism.

This is a genuine fork in the road, not a wording difference. It does not have to be
resolved now, but it must not be papered over.

**3. The kernel's contents.**

| VISION (build order, §8) | OURS (five kernel services) |
|---|---|
| Platform primitives | Principal & Charter |
| Identity | Capability & Autonomy |
| Tenant / organization | Context Graph |
| Policy / authorization | Addressing |
| Data classification / secrets | Ledger |
| **Business Model Kernel** | — |
| **Query / Command Engine** | — |
| Audit / provenance | *(the Ledger)* |
| Business Agent Gateway | *(the integration chokepoint)* |
| Hermes / Model Runtime | *(a provider interface)* |

Ours has **Addressing** and the **Context Graph** as first-class kernel concerns; the
vision has the **Business Model Kernel** and the **Query / Command Engine** in that
position. Everything else lines up. So the two kernels overlap heavily and each has two
things the other does not.

**4. Status.**

| | VISION | OURS |
|---|---|---|
| How far along | a design set. Nothing has been built from it | partly built. The governance layer works, is tested, and has screens |
| The base | deliberately unspecified — no host, no framework, no engine chosen | **Open Mercato**, decided, with a migration plan |
| A non-human worker is called | an **Agent** | an **AI Worker** |

### 10c. What this means — and what it does not

**It means the vision is largely compatible with what we have built.** Eight
convergent rules, an overlapping kernel, and a list of ten deliberately-open decisions
that our platform can fill.

**It does not mean the two should be merged.** They are two designs with different
centres of gravity, and merging them on the strength of a first read would be exactly the
mistake this programme exists to prevent. This batch records the comparison. Batch 12
decides what to do about it.

**Two questions this raises for the owner** (both at the end of this report):

1. Is the vision the **target** and our `compai/planning/` the **route** — or are both
   live designs that must be reconciled first?
2. Which is the centre: the business model, or the governance kernel?

---

## 11. Critic pass

A separate pass whose only job was to break this report. What it tried, and what happened.

| Attack | Result |
|---|---|
| **"Is 'the vision' actually two visions in one folder?"** The set was written over time and the README admits earlier documents are superseded | **Partly true, and it matters.** The README names two supersessions itself, and both are recorded in §3a. But it is one vision with a recorded history, not two — the later documents refine rather than reverse. The real risk is a reader starting at document 1, which is why the README is read first |
| **"Is the not-decided list really an opportunity, or is it a gap the design has not faced?"** Tried to break my own claim in §5 | **Broke the first version of it.** I had written that the ten open slots were "free". They are not: the vision attaches a condition — *"evaluated against the architecture rather than allowed to define it"* — which is a requirement on whatever fills the slot. Rewritten as an opportunity **with a condition**, and the condition is the work |
| **"Is our design really different, or the same design in different words?"** Tried hard to collapse them | **Held as different.** Four real differences, the deepest being what sits at the centre. But the eight convergences are real too. Recorded as *same goal, different centre of gravity* |
| **"Are the 33 objects right?"** Counted by eye, then by `grep` on the block | **Held.** 33 both ways. The earlier draft of the plan said 36 — corrected |
| **"Does the mechanical sweep actually find the requirements?"** | **No, and the report says so.** It counts words, not obligations. It is a completeness check on the reading, and its limits are stated in §9 rather than glossed |
| **"Did I verify the terminology count?"** The plan said 17 terms | **Corrected.** The block defines 15. Recounted and fixed in both this report and the plan |
| **"Is the claim 'the vision never mentions our platform' still true?"** | **Held.** Measured in batch 0: Companai 0, Paperclip 0, Aissistant 0, Open Mercato 0 |
| **"Have I asserted anything the owner will act on that I did not measure?"** | **One thing is soft and is marked as soft:** the claim that our platform can fill the ten open slots. It is recorded as *to be tested in batch 9*, not as a conclusion |

**One further finding, about our own documents.** `compai/planning/00-product-thesis.md`
numbers its invariants out of order: `I12` appears **after** `I15`. The content is fine;
the sequence is not. Minor, but it will confuse anyone who cites an invariant by number,
and it is worth fixing when that file is next touched. **Not fixed here** — this
programme does not edit our design documents until the vision work is done.

---

## 12. Definition of done — checked

> *Someone who has not read the vision can read this file and correctly say what the
> platform is, what its rules are, and what it deliberately has not decided — and the
> later passes have a completeness check they can be held to.*

- **What the platform is** — §1, plain English, no jargon.
- **Its rules** — §3: the precedence rule, the hierarchy, the two invariants, the
  implementation gate.
- **What it has not decided** — §5, ten items, with the condition attached.
- **A completeness check for the later passes** — §9, per-document normative counts, with
  the limits of the check stated.
- **The comparison the owner asked for** — §10, agreements, differences and vocabulary
  collisions, with the instruction not to merge them yet.

**Batch 1 is complete. Batch 2 — why it exists, the model, and Hermes's role — is next.**

---

## 13. Questions for the owner

Both are in simple English, and both are about direction rather than detail. The second
one blocks nothing yet; the first shapes batches 2–5.

**1. Are there two visions, or one?** The vision set (`library/ai/ai-first/`) and our own
design (`compai/planning/`) are both live. They agree on eight core rules and differ on
what sits at the centre. Is the vision the target we are aiming at, with `compai/planning/`
as the route we take to get there — or do both stand, and need reconciling before we
carry on?

**2. Which is the centre — the business model, or the governance kernel?** The vision
says the canonical business model is the single source of truth and everything is
compiled from it. Our design says the governance layer is the durable asset and
everything plugs into that. Both can be true. Which one do we build first?
