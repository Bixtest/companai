# Batch plan — the vision, Hermes, and our platform

**Created:** 2026-10-03 · **Re-scoped by the owner:** 2026-10-03
**Owner:** Ramzi · **Runner:** the agent, one batch at a time

> **How to use this file.** Pick the first batch whose status is `TODO`. Read its
> question, inputs, method and definition of done. Do the whole batch. Write its
> report into `findings/`. Tick its boxes here. Add one line to `LOG.md`. Then stop
> and show the result. **Do not start the next batch in the same pass.**

---

## The focus

The owner restated the purpose of this programme on 2026-10-03, in his words:

> 1) understanding the vision of the product we want to create, and you can find that
> here: `library/ai/ai-first`
> 2) Analyzing hermes codebase, our starting kit that we agreed on using and evolving
> from there to identify where is it, combined with hermes, from the final product
> 3) From the other documentations in the library, you can benefit of what is relevant
> to understand hermes more (after fact-check the information) because only when you
> understand the starting kit, hermes, the vision properly that we can connect the dots
> and map it all then create a solid development plan to reach the goal.
>
> Proceed accordingly, anything that is not relevant to that ignore for now.

**Everything in this plan serves one of those three. Anything else is out of scope
for now** — including work that looks interesting, and including the earlier draft
batches that this revision replaced.

### What that means in practice

| Focus | What we do | What we do **not** do |
|---|---|---|
| **1 — The vision** | Read `library/ai/ai-first/` completely, in six passes. Every normative statement becomes a numbered, testable requirement with its source line | We do not treat our own earlier design (`compai/planning/`) as the target. It is a second design set and is compared against the vision, not merged into it unexamined |
| **2 — Hermes and the starting-kit** | Measure both from their **code**. What they actually do, not what anything says they do | We do not plan integration from documentation. The code wins |
| **3 — The other documentation** | Use it for exactly one thing: **understanding Hermes better**. Every fact taken from it is checked against the Hermes code before it is believed | We do not inherit any decision from the sibling project. Its verdicts about its own product are not evidence about ours |

**The goal at the end is a development plan** — batch 12. Everything before it exists
to make that plan true rather than plausible.

---

## The owner's answer, recorded 2026-10-04

Batch 1 put two questions to the owner. Both are now answered.

> **"ai-first is the target. You need to study it well. Then study the actual starting kit
> codebase to see where we are from there — if we customize that or what. We want to avoid
> developing from zero if we can, considering that the starting kit codebase and hermes
> codebase cover a lot of the requirements."**

Three things follow, and they change how the rest of the programme runs.

**1. `ai-first` is the target. There is one vision.** Our own design
(`compai/planning/`, 15 invariants, 16 decisions) is **the route, not a second target**.
Batch 1 recorded four real differences between them; those differences do not disappear,
they change kind:

| Difference | Before | Now |
|---|---|---|
| What sits at the centre | an open question for the owner | **The business model.** The vision says so, and the vision is the target |
| Generated code vs composed components | a fork in the road | a **route** question. The target wants generated artefacts; how we produce them is ours to choose — and must be tested against the target in batch 9 |
| Kernel contents | two overlapping kernels | the vision's list is the target; ours is what we already have |
| Status | design set vs partly built | unchanged — and it is the reason the route is worth taking |

**The route is not automatically wrong.** Where our design differs from the vision, the
difference is now a question of *how to get there*, not *where we are going*. But it is
still a question, and it still gets tested in batch 9 rather than assumed.

**2. The reuse question is now a first-class objective.** *"We want to avoid developing
from zero if we can."* Every requirement in the register gets a second question attached,
not just "is it covered?" but **"how much of it is already paid for?"** That is what
batches 6, 7 and 11 exist for, and it is why batch 11 is a *shortcut* register rather than
only a gap register.

**3. The starting-kit is studied before Hermes.** The owner's order is the vision, then
the starting-kit. The reason is sound: *"if we customize that or what"* is a question about
our own code, and knowing what we already have makes the Hermes study sharper — it tells us
which Hermes capabilities fill a real gap rather than duplicating something already
running. **Batches 6 and 7 are therefore swapped** — starting-kit is now 6, Hermes is now 7.

---

## Status

| Batch | Title | Status | Report |
|---|---|---|---|
| 0 | Inventory, names and ground rules | **DONE** | `findings/00-inventory.md` |
| 1 | **The vision — the frame** | **DONE** | `findings/01-vision-frame.md` |
| 2 | The vision — why, the model, and Hermes's role | **DONE** | `findings/02-vision-model-and-runtime.md` |
| 3 | The vision — the runtime, Functions, and the data fabric | **DONE** | `findings/03-vision-runtime-and-data.md` |
| 4 | The vision — the workspace | **DONE** | `findings/04-vision-workspace.md` |
| 5 | The vision — the security kernel | **DONE** | `findings/05-vision-security-kernel.md` |
| 6 | **STARTING-KIT — what it already provides** | **DONE** | `findings/06-starting-kit-capability-map.md` |
| 7 | HERMES — what it actually provides | **DONE** | `findings/07-hermes-capability-map.md` |
| 8 | HERMES as the other documentation reports it — fact-checked | **DONE** | `findings/08-hermes-fact-check.md` |
| 9 | The map — every requirement against Hermes and the starting-kit | **DONE** | `findings/09-overlap-matrix.md` |
| 10 | Contested ownership — who owns what | **DONE** | `findings/10-contested-ownership.md` |
| 11 | Shortcut register and gap register | **DONE** | `findings/11-shortcut-and-gap-register.md` |
| 12 | **The development plan** | **DONE** | `findings/12-development-plan.md` |

Status values: `TODO` · `RUNNING` · `DONE` · `BLOCKED (reason)`

**Dependencies.** 1 → 2 → 3 → 4 → 5, in that order — each vision pass builds on the
frame. 6, 7 and 8 can run any time after batch 1, in any order; **the owner asked for 6
(the starting-kit) before 7 (Hermes)**. 9 needs 1–8. 10 and 11 need 9. 12 needs 10 and 11.

---

## Why the order is what it is

**The vision comes first, and gets six passes.** Everything else is measured against
it. Without it, "where are we?" has no reference point — we would be describing the
starting-kit and Hermes in a vacuum, with no way to say whether what we have is the
right thing.

Six passes, not one, because the vision is **28,549 lines** and the owner's own method
is one batch at a time with full attention. The earlier plan read the whole set in a
single batch. That is not a pass; it is a skim. Each pass below is one coherent theme:

| Pass | Theme | Lines |
|---|---|---|
| 1 | The frame — the guide, the rules, the vocabulary, the object list | 1,756 |
| 2 | Why it exists, the semantic model, and what Hermes is for | ~6,900 |
| 3 | The runtime economics, User Functions, and the data fabric | ~8,050 |
| 4 | The workspace | 4,826 |
| 5 | The security kernel | 7,017 |
| 6 | *(this is batch 6 in the table — our own platform)* | — |

**Hermes and the starting-kit are measured from code.** The vision names Hermes
throughout but describes it as it was understood at the time of writing. We now hold
the repository. Where the two disagree, the code wins.

**The other documentation comes last of the three inputs.** Its only job is to fill in
the picture of Hermes, and it cannot do that job honestly until we already know Hermes
well enough to tell a fact from a confident claim. Doing it last is not a demotion —
it is what makes it useful instead of dangerous.

**Batch 9 is the "connect the dots" step the owner described.** It cannot be done
before the three inputs are understood, and the whole point of this re-scope is that it
must not be done on top of a half-read vision.

---

## The three things being compared

| Short name | What it is | Where |
|---|---|---|
| **VISION** | **The target.** A self-extending, local-first business operating platform whose canonical business model is the single source of truth, with Hermes as the agent runtime. 9 documents, 28,549 lines. A clean-sheet design that mentions Open Mercato, Companai, Paperclip and Aissistant **zero** times | `library/ai/ai-first/` |
| **HERMES** | The agent runtime itself (Nous Research). A real, large codebase. Where a document disagrees with it, **the code wins** | `library/ai/hermes-agent-main/` |
| **STARTING-KIT** | **Our platform today.** Open Mercato 0.6.7 forked, trimmed, plus our own governance layer. This is the base we agreed to evolve from | `workspace/starting-kit/` |

**One source, used carefully.** `library/ai/hermes-docs/` and the sibling project's
codebase (`konsult/aissistant-package/`) are **not** a fourth thing being compared. They
describe a different, already-built product that is also called Companai. They are used
for one purpose — understanding Hermes — and every fact taken from them is fact-checked
against the Hermes code. Read `library/ai/README.md` first.

---

# Batch 0 — Inventory, names and ground rules — **DONE**

**Report:** `findings/00-inventory.md`

**What it established.** Two different products are called Companai: ours forks **Open
Mercato 0.6.7**, the sibling forks **Paperclip 0.3.1**. Every input is pinned: our code
(`workspace/starting-kit/`, branch `main` @ `cf2d820`, 76 commits), our docs repo
(branch `master` @ `d6c92b69`, 73 commits, **no remote**), the Hermes extract (no
`.git`; `package.json` 1.0.0, node 26, python 3.14, 109 top-level entries), the vision
set (9 documents, 28,549 lines).

**Also found and fixed:** `companai.md` at our project root is a byte-identical copy of
a **sibling** document; the library's documented rebuild command would have deleted
`library/ai/` and `library/analysis/`; `workspace/ai/` held 360 documents a second
time; `keys/` and `host-sync.tgz` were untracked but not gitignored.

**Carried forward:** the Hermes skill count is three different numbers — **193** as a
claim in `hermes-docs`, **197** measured in the sibling's vendored copy (82 + 115), and
**210** measured in the extracted repo (58 + 152). Resolving it is **batch 7's** job.

---

# Batch 1 — The vision: the frame

**Question.** What is this platform meant to be, in plain English — and what are the
rules that everything else has to obey?

**Why first.** `README.md` in the vision set is not an introduction. It is the
**design-control document**: it carries the precedence rule, the architecture
hierarchy, the five concepts, the vocabulary, the list of what is deliberately *not*
decided, and the list of objects that must be formalised before implementation starts.
Every later pass needs it, and so does every later batch.

**Inputs**
- `library/ai/ai-first/README.md` (1,756 lines) — read in full
- `compai/planning/00-product-thesis.md` and `01-core-architecture.md` — **our own**
  design, read only to answer: is this the same design as the vision, or a different one?

**Method**
- Read the README in full and restate the vision in plain English, without quoting it.
- Extract the rules that bind everything else: the precedence rule (§14), the
  architecture hierarchy (§13), the two security invariants (§8 of doc 8), the
  deliberately-not-decided list (§15), the object list (§16), the terminology (§21).
- **Run the mechanical sweep as the second route.** `grep` every `must` / `should` /
  `required` / `never` across all nine documents and record the count per document.
  This is what makes the later passes provably complete rather than hopefully complete.
- Compare the vision against our own `compai/planning/`. Where they agree, say so.
  Where they differ, say how — and **do not merge them**.

**Output.** `findings/01-vision-frame.md`

**Tickboxes**
- [x] The vision in plain English — one page, no jargon
- [x] The five concepts: Business Model Kernel · Core Data vs Capability Data ·
      Business IR · Hermes as Agent Runtime · User Functions
- [x] The precedence rule, and what it means when two documents disagree
- [x] The architecture hierarchy (6 levels) and the "a lower level must not redefine a
      higher level" rule
- [x] The division of responsibility: what Hermes owns vs what the platform owns
- [x] The §15 not-decided list — and what it means for us
- [x] The §16 object list (33 objects) — the "next major design-control artifact"
- [x] The §21 terminology (15 terms), including the ones that collide with ours
- [x] The §11 failure classes the design exists to prevent
- [x] **Mechanical sweep** — normative-statement counts for all nine documents, so the
      later passes can be checked for completeness
- [x] **Our design vs the vision** — agreements, differences, and the vocabulary
      collisions, stated without merging them
- [x] **Critic pass** — try to show that "the vision" is actually two visions in one
      folder. Name what was attacked

**Result.** The frame is established. **The headline finding:** our own design
(`compai/planning/`) and the vision were written without knowledge of each other — the
vision mentions our platform zero times — and they nonetheless **agree on eight core
rules**. They also differ in four real ways, the deepest being what sits at the centre
(the business model vs the governance kernel). **They are compared, not merged.**

**Corrections made during this batch:** the plan had the README **last** in the reading
order (the vision's own order puts it first); the object count was 36 (measured 33); the
terminology count was 17 (measured 15); and I had described the ten open decisions as
"free" when the vision attaches a condition to them.

**Handed to batch 2:** every claim the vision makes about Hermes must be extracted as a
claim to verify, not accepted. The `Capability` word collision is now confirmed from the
vision's own glossary and is a naming problem for the owner, not an architectural one.

**Two questions were put to the owner** (see the end of the report): are there two
visions or one; and which is the centre.

**Definition of done.** Someone who has not read the vision can read this file and
correctly say what the platform is, what its rules are, and what it deliberately has not
decided — and the later passes have a completeness check they can be held to.

---

# Batch 2 — The vision: why, the model, and Hermes's role

**Question.** Why does this design exist, what is the Business Model Kernel, and what
exactly is Hermes supposed to do — and not do?

**Inputs** — named by the vision set's own document numbers. *(The labels "Doc 1–Doc 4"
that stood here collided with the README's own numbering, which is different; corrected
2026-10-04. There is also a defect in the vision README — two sections numbered `# 7` and
two numbered `# 8` — so cite vision documents by number, never by README section.)*

- Vision **Document 1** `ai_first_erp_research_analysis.md` (1,623) — the problem statement
- Vision **Document 2** `ai_first_erp_semantic_database_architecture.md` (904) — the model
- Vision **Document 3** `AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md`
  (4,254) — **the design-control document for Hermes**
- Vision **Document 6** `deep-research-report.md` (115) — the OSS reference layer

**Why.** Document 3 is the bridge between this batch and batch 7. It is the vision's own
statement of where Hermes ends and the platform begins — including the traps it names
(a Hermes profile is not a tenant; `state.db` is not business truth). Everything we
later measure in the Hermes code is measured against this.

**Method.** Same method as batch 1: read, extract every normative statement, apply
the §14 precedence rule, number and source each one. Where document 3 makes a claim
about Hermes itself, **mark it as a claim to be verified in batch 7** — do not accept it.

**Output.** `findings/02-vision-model-and-runtime.md`

**Tickboxes**
- [x] Doc 1 — the problem: why raw rows to an LLM fails, why SQL generation alone fails,
      why a semantic layer is required *(2026-10-04 — §3; answer hallucination vs **query
      hallucination**; five precedents already exist, so the pattern is not novel)*
- [x] Doc 2 — Business IR; business meaning separated from physical storage; why
      deterministic commands beat direct database mutation *(2026-10-04 — §4c, §6)*
- [x] Doc 3 — what Hermes owns; what the platform owns; the boundary stated as a rule
      *(2026-10-04 — §4f, the vision's own 30 invariants, quoted verbatim)*
- [x] Doc 3 — every claim it makes about Hermes, listed **as a claim to verify**
      *(2026-10-04 — §7c: **45 claims**, H-01…H-45, each with a verification method and a
      failure consequence)*
- [x] Doc 6 — what the OSS reference layer is for, and what it is explicitly not for
      *(2026-10-04 — §4e. Correction: the "reference material rather than the primary
      architectural authority" line is the **README's** §8, not Document 6's own. Doc 6
      may populate slots; it may not define them.)*
- [x] Extract and number the normative statements from all four
      *(2026-10-04 — 28 + 21 + 67 + 4 = **120** statements, §4b–§4e)*
- [x] Record anything the §14 precedence rule makes us drop
      *(2026-10-04 — §4g: Doc 1's persisted-SQL reading; profile-equals-tenant phrasing;
      Doc 1's five-stage maturity narrative; Doc 6's star counts)*
- [x] **Critic pass** — a second pass whose only job is to find requirements I missed.
      It must name what it searched for, and where *(2026-10-04 — §9: searched all
      `must`/`should`/`never`, every heading, every fenced block, all 166 "Hermes"
      mentions, and the README precedence rule; found **four** of my own errors, all fixed)*

**Definition of done.** The Business Model Kernel and Business IR are stated in terms
someone could build a test against, and every claim the vision makes about Hermes is
listed for verification rather than accepted.

---

# Batch 3 — The vision: the runtime, Functions, and the data fabric

**Question.** How is the platform supposed to run on a small local model, how does AI
work become permanent application functionality, and how does the business model stay
coherent as it grows?

**Inputs**
- `03_Local_First_AI_Runtime_and_User_Function_Architecture.md` (3,646)
- `04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution.md` (4,408)

**Why.** These two carry the two ideas with no equivalent in our platform today:
**local-first inference as the normal case**, and **User Functions** — a validated AI
operation saved so future runs need no model at all. They also carry the core-data /
capability-data split and the rule that the design exists to prevent *database islands*.

**Output.** `findings/03-vision-runtime-and-data.md`

**Tickboxes**
- [x] The Model Runtime abstraction; the model registry; why the design reduces the
      intelligence burden on the model *(2026-10-04 — §3b: `ModelRuntime` with 8
      capabilities; capability separated from model identity; "AI for uncertainty,
      software for certainty")*
- [x] Local-first: llama.cpp, Ollama, cloud as escalation. What hardware it assumes
      *(2026-10-04 — §3e: three tiers — minimal VPS / 8–16 GB GPU / 24–80+ GB. **The
      hidden cost is context, not parameters.** Doc 4 §20 claims a 64K-token minimum —
      carried to batch 7, it decides whether the minimal tier is viable)*
- [x] User Functions — the full lifecycle, and **what a Function actually stores**
      (validated Business IR + parameters + dependencies + permissions + versions —
      not SQL, not returned data) *(2026-10-04 — §4b: **28 declared fields**; §4d: 8
      lifecycle states, 6 types, 5 risk classes)*
- [x] Core data vs capability data, defined precisely *(2026-10-04 — §5b: the four-part
      elevation test; §5c: 6 entity classes, 26 candidate core entities)*
- [x] The relationship fabric; why relationships are first-class *(2026-10-04 — §6:
      14 declared attributes; the three connectivity types; the fan-out arithmetic)*
- [x] Schema evolution: dependency graph, impact analysis, propagation, drift detection
      *(2026-10-04 — §8: 13-stage pipeline, 9 dependency classes, 12 propagation targets,
      6 impact classes, expand→backfill→contract)*
- [x] The rule: *maximise semantic connectivity; minimise unnecessary physical coupling*
      *(2026-10-04 — §9, with **both halves defined**: maximise reuse/clarity/lineage;
      minimise duplicate facts/identities/vocabulary; do NOT maximise foreign keys)*
- [x] **A concrete question to carry into batch 9:** this design exists to prevent
      database islands. We run 136 tables across 39 modules. **Do we actually have them?**
      *(2026-10-04 — carried to batch 9, and the vision supplies the test: §89's island
      detector — entity with no meaningful relationships · capability with duplicated
      master data · parallel identity systems · isolated reporting tables · manual
      synchronisation dependencies)*
- [x] Extract and number the normative statements *(2026-10-04 — 38 (N4) + 36 (N5) =
      **74** statements, §11)*
- [x] **Critic pass** — try to show that "User Functions" is just stored queries with a
      better name. Name the attempt *(2026-10-04 — §12: **the criticism partly succeeds**
      for Types 1 and 3, and Doc 4 §48 half-admits it. Refuted on four grounds — what is
      stored, dependency metadata, four non-query types, and governance. The document
      supplies the refutation but **never states the gate**; §12 supplies it: rename a
      field — if the artefact does not survive without human rewriting, it is a stored
      query, whatever it is called.)*

**Definition of done.** Local-first and User Functions are understood well enough to
say what would have to exist in our platform for either to work.

---

# Batch 4 — The vision: the workspace

**Question.** What replaces "a chat screen with some UI controls bolted on" — and what
does that demand of our front end?

**Inputs.** `05_Widgetized_Collaborative_Workspace_Architecture.md` (4,826)

**Why.** This is the only part of the vision that describes what a **user sees**. Our
starting-kit has an Open Mercato front end with its own page and widget model. Either
those two line up, or one of them has to change. This batch finds out which.

**Output.** `findings/04-vision-workspace.md`

**Tickboxes**
- [x] Widget Definition vs Widget Instance; the Widget IR; typed inputs/outputs/events *(2026-10-04 — §4 five contract parts (inputs/outputs/actions/events/dependencies); §8 Widget IR (semantic-only, the workspace counterpart of Business IR); §10 Definition vs Instance; §14 three reference modes LINK/INSTANCE/SNAPSHOT)*
- [x] "Widgets are interaction islands, not data islands" — what that forbids *(2026-10-04 — §3b: a Widget owns filters/selection/draft/layout, never an authoritative copy of Customer/Invoice/Product/Employee/Payment/Organization; §6b draft ≠ business state until a Command executes)*
- [x] Composition and typed ports; live links, instances, snapshots *(2026-10-04 — §9: tree (visual) vs graph (behavioural), INPUT/OUTPUT/EVENT/ACTION ports, canonical refs not raw JSON; §10 live-by-default with three modes)*
- [x] `@` for people and agents, `#` for platform objects — compared against our own addressing design (mentions, handles, resolution strategies) *(2026-10-04 — §11: vision §48–52/§164–166 (syntax, permission-filtered picker, resolution order user→team→org→tenant→system, ambiguity surfaced). **Our kit has no such layer** — the rich-editor `@` button just inserts the literal `@` (rich-editor.tsx:1270); the only structured object link is the messages module's `{entityModule, entityType, entityId}` + snapshot, and its registry ships **empty**. New build.)*
- [x] Collaborative UI state vs transactional business state — the separation and why *(2026-10-04 — §6, §12: three state levels; CRDT/OT for documents/layout/comments vs transactional concurrency (version, optimistic lock, command, postcondition) for invoices/inventory/payments; no last-write-wins for business data)*
- [x] AI-generated Widget IR and workspace patches *(2026-10-04 — §13: AI emits IR/patches, never UI code; 13-operation Workspace Patch language (§79); patch proposals validated/published by the platform; diffable proposals (§191); sandbox preview (§121–122))*
- [x] Widget versioning and dependency propagation *(2026-10-04 — §14: lifecycle DRAFT→…→ARCHIVED (6 states); dependency graph (§106–108); 5 dependency states VALID/RECOMPILE/REVIEW/BROKEN/DEPRECATED; schema change → widget impact analysis; no silent semantic change (§163); version pinning (§102))*
- [x] The hierarchy: Business Model → Function → Widget → Workspace *(2026-10-04 — §7, §15: Function = behaviour, Widget = interaction; §210 final hierarchy Platform→Tenant→Workspace→Widget Instance→Widget Definition→Functions→Business Model→Data; §160 the reusable chain AI→Business IR→Function→Widget→Workspace)*
- [x] Extract and number the normative statements *(2026-10-04 — §16: **60 statements** = the 40 non-negotiable rules (N7-01…N7-40, quoted verbatim from Part LXXIII) + 20 body statements (N7-41…N7-60). Counts measured by script.)*
- [x] **Critic pass** — try to show this is a UI design wearing architecture clothes, and that nothing in it constrains the platform. Name the attempt *(2026-10-04 — §17: attempt named. **Partly succeeds** on volume (much of the doc is presentation: mockups, layout primitives, renderers, chart catalogues; and the pattern is cited as existing in Loop/Figma/Notion, not novel). **Fails on substance** on four grounds: (1) it forces a versioned registry object with a dependency graph; (2) it extends schema-evolution impact analysis to widgets; (3) it imposes authorization rules (reference ≠ authorization; sharing ≠ sharing data; trust levels); (4) it constrains AI (emit IR/patches, widget-scoped context). Verdict: adopt the 40 rules; treat the visual catalogues as illustrative.)*

**Definition of done.** A reader can say what the workspace is made of, and what a
front end must support to be part of this platform rather than beside it.

---

# Batch 5 — The vision: the security kernel

**Question.** What are the security rules the whole platform must conform to — and how
much of them do we already enforce?

**Inputs.** `06_Platform_Foundation_and_Security_Kernel_Specification.md` (**7,017 lines
— the largest document in the set**)

**Why.** This is the vision's governing specification: identity, policy, authorisation
down to field and value level, tenant enforcement, AI context boundaries, prompt
injection, approvals, audit, and a foundation build order with acceptance criteria.

**And this is where the biggest shortcut and the biggest risk both live.** We already
have a working, tested governance layer: a layered resolver with an explanation trace, a
capability registry, effect classes, approvals, delegations, denials, trust, record
locks and a hash-chained ledger. The vision specifies a large part of the same thing from
a clean sheet. **Either that is a large amount of free work, or it is a large amount of
work done twice.** This batch is where we find out which — and it must not flatter our
own code while doing it.

**Output.** `findings/05-vision-security-kernel.md`

**Tickboxes**
- [x] The two invariants, stated exactly and tested for meaning *(2026-10-04 — §3: §3a the
      central invariant (§0, line 45) split into its five separately-testable clauses, each
      with what it forbids and where it bites; §3b **"No matching allow → DENY"** (§25, line
      871) — deny-by-default, meaning is directional: the danger is not "explicit deny wins"
      but **absence of a rule becoming permission**. The two are different in kind: §3a is
      *who decides*, §3b is *what an empty decision means*)*
- [x] Identity and subject types; authentication vs authorisation *(2026-10-04 — §4: the
      canonical `Subject` has **7 classes** (HumanUser, ServiceIdentity, AgentIdentity,
      IntegrationIdentity, ApiClientIdentity, SystemIdentity, WorkerIdentity); identity
      hierarchy Party→{Person,Organization}, UserAccount authenticates a Person. **Doc 8's
      own object model §192 lists 6** — omits `WorkerIdentity` — recorded as a minor internal
      inconsistency)*
- [x] Multi-tenancy and the organisational security boundary *(2026-10-04 — §5: the
      tenant/org boundary; tenant identity is explicit and cannot be inferred from prompt
      text (constitution rule 11); cross-tenant references rejected below the AI layer
      (rule 12); Hermes profile is **not** SaaS tenancy (rule 30))*
- [x] Record-, field-, relationship- and value-level authorisation — what it demands
      *(2026-10-04 — §6: authorization extends below record level to **fields, values,
      relationships and state transitions**; every entity/field/relationship must declare
      security metadata (N8-166/167/168); the more restrictive rule wins (N8-192))*
- [x] Data classification and secret isolation *(2026-10-04 — §7: **7-value** classification
      vocabulary (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED/HIGHLY_RESTRICTED/SECRET/
      SYSTEM_SECRET, §44); secrets are not ordinary business data (rule 24); SecretReference
      + Secret Manager; new fields invisible until classified (N8-189))*
- [x] AI input, execution and output boundaries; **"unauthorized data should not enter
      an AI context in the first place"** *(2026-10-04 — §8: the §0 rule is "materially
      stronger than asking the model not to reveal data after it has already received it";
      restated as constitution rule 17 and §70. Output controls must constrain disclosure
      (§69–71). Context minimised to the smallest useful semantic slice (N8-178))*
- [x] Prompt injection and indirect prompt injection — what the design actually requires
      *(2026-10-04 — §9: 8 input trust labels (§67); a 14-entry prompt-attack matrix (§162);
      document extraction preserves security labels (N8-171); entity resolution is
      security-sensitive and multiple matches resolve to **ambiguous, not a guess**
      (N8-165))*
- [x] Approval and high-impact action controls *(2026-10-04 — §10: high-impact operations can
      require approval or stronger authentication (rule 26); Doc 8 §60 wants an
      **`ApprovalToken` bound to a `command_hash`** so the executing command must match the
      approved one; 6 risk classes R0–R5 (§206))*
- [x] Audit, provenance and security events *(2026-10-04 — §11: audit records independent of
      mutable business records (rule 27); security decisions versioned and attributable to
      policy versions (rule 28); **20-event security taxonomy** (§121); the audit record
      shape §118 requires `policy_version`, `business_model_version`, `decision_id`)*
- [x] Adversarial test architecture and the security invariants *(2026-10-04 — §12: a
      **24-entry adversarial test matrix** (§161) + property-based tests for the stated
      invariants (N8-184) + security differential testing (N8-186); a capability cannot be
      published without adversarial security tests (rule 35))*
- [x] **The foundation build order and acceptance criteria** — this is close to a
      development plan already; extract it carefully *(2026-10-04 — §13: **11-phase build
      order** (§222–232), phase 3 = policy kernel is "the first major kernel milestone",
      **phase 8 = Hermes adapter only after the security gateway exists**; §233–235 what must
      NOT be built first (not ERP screens, not the copilot, not raw SQL agent access); **6
      acceptance groups** (§236–241); release definitions F0/F1/F2 (§276–278))*
- [x] Extract and number the normative statements (this document has by far the most)
      *(2026-10-04 — §15: **214 statements** = 38 architectural constitution (N8-01…N8-38,
      quoted verbatim) + 43 security constitution (N8-39…N8-81, quoted verbatim) + 133 body
      statements (N8-82…N8-214). **By far the largest register in the programme.** Doc 8 is
      the sixth document to converge on the same small rule-set, and the first to state each
      rule's security consequence)*
- [x] **Critic pass** — for every place our layer looks equivalent, try to show it is
      not. Name which comparisons were attacked and which survived *(2026-10-04 — §16: the
      seven comparisons from §14c were each attacked. **3 survived** (effect classes as a
      superset-in-kind; explanation-as-return-value strictly stronger than §175; tenant
      scoping real but application-level). **4 broke** (#1 our `Decision` carries a `gate`,
      not allowed/denied *field lists* or a scope predicate; #4 our ledger has
      correlation/causation but **no `policy_version`/`decision_id`**; #5 **default shadow —
      the resolver does not yet decide anything**; #7 our 5 data classes vs Doc 8's 7).
      **The most important break is #5** — "we already have the policy kernel" is false
      today)*

**Result.** Read vision **Document 8** in full (7,017 lines, 95 parts, 283 sections) and
measured our own governance layer from its files. **214 normative statements** numbered and
sourced — by far the largest register in the programme. **The batch's core question is
answered, and the answer is neither of the two the plan offered:** our layer is **not** "a
large amount of free work", and it is **not** "a large amount of work done twice". Our
governance layer is a real, tested **act-level autonomy** kernel — an axis Doc 8 barely
specifies — and on that axis we are **ahead of the document**. But Doc 8's **data-level**
enforcement (field/record/relationship/value), its **classification metadata**, its **AI
guards** and its **RLS** we do not have at all. The overlap is partial and sits on a
**different axis than the plan assumed**, and the gap is large and real. 20 measured facts
(G-01…G-20) and 12 measured gaps (X-01…X-12), each with where it was looked for.

**The critic pass broke four of seven apparent equivalences**, including the one that
matters most: **we have built a resolver that does not yet decide anything** — it defaults
to `shadow` and the existing RBAC checks still decide, so "we already have the policy
kernel" is false today. The four places our layer looked strongest (explanation-as-value,
trust asymmetry, required compensation, tenant scoping) **survived attack**.

**Definition of done.** Every security requirement has an ID and a source line, and the
overlap with our existing layer is stated as a question to answer in batch 9 — not as a
conclusion.

---

# Batch 6 — STARTING-KIT: what it already provides

**Question.** What does our fork of Open Mercato actually give us today, module by
module — **and how much of the target does it already pay for?**

**Why.** This is the owner's question: *"study the actual starting kit codebase to see
where we are from there, if we customize that or what. We want to avoid developing from
zero if we can."* We know the headline — "the ERP is off, 14 modules parked, the
governance layer works, the gate is green" — but we do not have a module-by-module
inventory. Without it, every comparison in batch 9 is guesswork and every estimate in
batch 11 is invented.

**This batch has a second job, and it is the one that matters commercially.** For each
part of the platform, not just "what is it?" but **"is it already built, already tested,
and already running?"** That is what turns a requirement into a shortcut instead of a
task.

**Inputs.** `workspace/starting-kit/` · `workspace/knowledge/` ·
`workspace/references/{parked-modules,salvage-analysis}.md` · `workspace/PROGRESS.md` ·
`compai/planning/09-starting-kit.md` · `compai/planning/01-core-architecture.md`

**Method.** Work from the code. Modules live under `packages/*/src/modules/`, not in one
place — `packages/core/src/modules` holds 39, `packages/shared/src/modules` holds 35,
plus per-package modules. For each: what it does, on or parked, what it owns in the
database, and which requirement it might already satisfy.

**Output.** `findings/06-starting-kit-capability-map.md`

**Tickboxes**
- [x] Enumerate every module and package with its on/parked state *(2026-10-04 — §3: **25
      enabled core modules, 11 parked core modules, 13 package modules (9 on / 3 parked / 1
      optional)**, plus the non-module packages. Measured from `modules.ts` and the tree.
      **35 enabled**, **14 parked**; three more gated (`example`, `example_customers_sync`,
      `storage_s3`). No directory silently omitted — the three non-feature holders are named
      as such.)*
- [x] **For every entry, record its maturity:** running and tested · built but untested ·
      present but parked · absent *(2026-10-04 — §3, every row carries a level and a test-file
      count. 23 of 25 enabled core modules are **running and tested**; `progress` and
      `api_docs` are **running, lightly tested**; the 14 parked are **present but parked**.
      **The key measured fact: parked means frozen — 553 test files (520 core + 33 package)
      are on disk but do not run.**)*
- [x] The governance layer — authority, approvals, delegations, denials, trust, record
      locks, ledger, authority graph. **This is the part the vision overlaps most**
      *(2026-10-04 — §4: measured file by file. The resolver (`decision.ts`), the org graph
      (`graph.ts`), preflight, shadow; capabilities/trust/record-locks/authority-policy/
      delegations/denials/project-overlays/visibility; `auth` services
      (authorityEnforcement/delegation/denial/pendingAct/project/recordLock/trust/rbac);
      **six governance API route groups served**; `audit_logs` access+action+ledger. Gates
      A0–A5 **all bind**. **Honest caveats re-measured: default `shadow` — the kernel is not
      yet the enforcement point; 5 of 10 resolver inputs read but unsupplied; command→capability
      98%.** Maturity: running and tested (78 test files in `auth` alone).)*
- [x] The data layer — entities, schema, migrations, `query_index` *(2026-10-04 — §5:
      **MikroORM**, 225 `@Entity` classes, 262 explicit table names, 136 tables on a clean DB
      (recorded 2026-08-08; 133 measured in enabled modules today — the 3-table gap explained
      by authority-kernel tables added after that date, confirmed in git log). Per-module
      migrations + **session-level Postgres advisory lock** (key `8147290361`). `query_index`
      = 15 tables. Custom fields via `entities`. **The relationship layer is thin: `defineLink`
      in 1 file, 6 `extensions.ts` total. No RLS anywhere.**)*
- [x] `packages/ai-assistant` — what it does today, and its `ai-tools/` *(2026-10-04 — §6:
      43,213 lines, 99 tests. Real runtime: agent runtime/registry/policy, LLM adapters +
      model allow-list, **MCP client AND server**, tool registry/executor/loader, sandbox,
      pending-action executor/recheck, entity graph + index, session memory, token metering,
      conversation storage. `ai-tools/` ships **three packs**: attachments, meta, search.
      **Critical gap: the platform-specific `ai-agents.ts`/`ai-tools/` live in `catalog` and
      `customers` — both PARKED.** Enabled is the generic runtime, not the domain agents.)*
- [x] Search and retrieval — `packages/search`, fulltext, vector, indexer *(2026-10-04 —
      §7: 18,032 lines, 25 tests. Three strategies (tokens/vector/fulltext, weighted and
      combinable), **three vector drivers (pgvector, qdrant, chromadb)**, an indexer and a
      queue. `query_index` supplies the tables. Maturity: running and tested. **Open: is
      retrieval tenancy-filtered?** → batch 9.)*
- [x] Events, webhooks, scheduler, queue *(2026-10-04 — §8: `events` (bus/bridge/single-
      delivery), `webhooks` (full module), `scheduler` (services/commands/workers/CLI),
      `queue` (async + local, worker registry/runner). **44 subscriber dirs, 42 worker dirs.**
      All enabled and tested — **a clean shortcut.**)*
- [x] Audit and ledger — `audit_logs` and the hash chain *(2026-10-04 — §9: accessLog (418
      lines) + actionLog (937) + `ledgerService` (hash chain, per-tenant, `brokenAtSeq`
      verification). **Measured content: `LedgerAppendInput` has correlation/causation/
      visibility but NO `policy_version`/`business_model_version`/`decision_id`** that Doc 8
      §118 requires. The chain is real; the content is short.)*
- [x] Directory and organisation graph *(2026-10-04 — §10: `tenants` (hard boundary),
      `organizations` (often null, legitimately), **`organization_edges`** (typed edges).
      `authorityGraphService` reads it; `graph.ts` holds the rules. **The superadmin trap is
      documented: the most privileged actor has no organization — 4 bugs in one day.**)*
- [x] Workflows, business rules, feature toggles, dictionaries *(2026-10-04 — §11: all four
      enabled and tested (`workflows` 44 tests, `business_rules` 18, `feature_toggles` 14,
      `dictionaries` 15). Generic engines — **whether `workflows` can be the substrate for
      User Functions is a batch-9 question, not settled here.**)*
- [x] Content, attachments, i18n *(2026-10-04 — §12: `attachments` full module + `storage_s3`
      backend (25 tests); `content` 371 lines, lightly tested; **5 locales** — ar/de/en/es/pl,
      RTL handled. Arabic review dropped by owner decision.)*
- [x] UI — perspectives, dashboards, widget injection *(2026-10-04 — §13: `packages/ui`
      78,661 lines. **The injection system is substantial — 1,359 lines across 5 files** —
      with columns, row actions, bulk actions, filters, field-visibility rules, custom fields,
      wizard steps, status badges, **before-save/before-delete hooks and navigate guards**.
      Richer than batch 4 credited, but **still a UI extension framework, not the vision's
      Widget** (no contract/IR/typed ports/versioned registry). **95 backend page routes in
      enabled core + 15 in the app.**)*
- [x] Multi-tenancy — how a tenant boundary is actually enforced *(2026-10-04 — §14:
      `tenant_id` **required** on every query (`query/engine.ts` — "tenantId is now required
      for all queries"); `organization_id` nullable with null-admitting filters; per-tenant
      encryption. **No RLS.** So the boundary is **application-level, in one place, and hard** —
      Doc 8 wants RLS *in addition*; whether it is additive is batch 9.)*
- [x] Test gate — its **measured** state now, not the last recorded one *(2026-10-04 — §15.
      **Record: 22/22 tasks, 12,851 tests, 6m09s, zero cached (2026-08-12).** Re-measured here:
      **no database reachable on this machine**, so the full gate cannot run. Ran `shared`
      (the authority kernel): **1,853 passed, 8 failed, 1,861 total, 92.5 s.** **The 8 failures
      are this sandbox's own file-deletion guard** (`SAFE_DELETE_BULK_CONFIRM_REQUIRED`,
      count 51 > threshold 50), not a product defect — measured, not assumed. **The other 21
      packages were not re-run.**)*
- [x] **The data question:** the vision exists to prevent database islands. We run 136
      tables across 39 modules. **Do we actually have them?** Answer with evidence
      *(2026-10-04 — §16: **YES.** Detector applied test by test. **Parallel identity systems:
      `auth` and `customer_accounts` are two complete auth+RBAC stacks.** Duplicated master
      data: `customers` carries its own people/companies/vocabularies/entity-defs alongside
      `directory`, `dictionaries` and `entities`. Isolated index tables: `query_index`. Manual
      sync: `data_sync`/`sync_excel`/`sync_akeneo`. **The mitigation is that
      `customer_accounts` is parked — parking hides the island, it does not remove it.** Also
      **127 orphaned tables** (263−136), inert but not free.)*
- [x] **The reuse question, answered honestly:** which parts of the target would we
      **customise** what we have for, and which parts genuinely need building? *(2026-10-04 —
      §17: **13 shortcuts** (R-01…R-13), each with evidence and what is still needed, and
      **12 gaps** (R-14…R-25). The headline: **the platform half is bought; the product half
      is not.** Shortcuts that survive are infrastructure (events, queue, search, i18n, files);
      the business-model spine (Business Model Kernel, Business IR, the compiler, User
      Functions, the relationship fabric) and the data-level security layer are not paid for
      at all. §17c names the three things that look like shortcuts but are not — the parked
      modules, the frozen tests, the parked packages' dependencies.)*
- [x] **Critic pass** — challenge every "it already does this"; name the attempt *(2026-10-04
      — §18: ten `COVERED`-looking claims attacked. **4 survived** (eventing/scheduling/queue;
      the application-level tenant guard, with the no-RLS caveat). **6 broke or partly broke**,
      including the most important: **#1 "we already have the policy kernel" is FALSE today —
      default shadow, nothing calls the resolver, RBAC still decides.** Also broken: the ledger
      content; the domain AI agents (parked); the widget system (not a registry object); search
      tenancy/classification. **Two routes, same answer as batch 5.** Second-order finding: the
      shortcuts that break are almost all *the ones the vision is actually about*.)*

**Result.** Measured our platform from the code: **21 packages, 847,808 source lines, 225
entity classes, 262 tables, 2,882 test files, 5 locales.** **35 modules enabled, 14 parked.**
**The headline answer to the reuse question: the platform half is bought; the product half is
not.** Thirteen real shortcuts exist — the largest being the working authority kernel and the
hash-chained ledger — and they are almost all **infrastructure** (events, queue, search, i18n,
files, tenancy). Twelve gaps exist, and they are almost all **the things the vision is actually
about**: the Business Model Kernel, Business IR, the compiler, User Functions, the relationship
fabric, the Widget contract, and the data-level security layer.

**Two findings that change the picture from the plan's assumptions.** First, **"we already have
the policy kernel" is false today** — the resolver defaults to `shadow`, nothing calls it in
the request path, and RBAC still decides; we have a resolver, not an enforcement point (the
same answer batch 5 reached from the security side). Second, **parked is not free**: 553 test
files are frozen and a restored module brings back an ungated write path until its commands are
mapped to capabilities.

**And the database-island question is answered: yes, we have them** — most clearly two complete
auth+RBAC stacks (`auth` and `customer_accounts`), which is exactly what the vision exists to
prevent. Parking hides the island; it does not remove it.

**Definition of done.** Every module has a one-line purpose, a state and a maturity
level, or is explicitly listed as unknown. No module silently omitted — and the reuse
question has an evidenced answer rather than an impression.

---

# Batch 7 — HERMES: what it actually provides

**Question.** What can Hermes do — measured from the code we hold, not from the
documents describing it?

**Why.** The vision names Hermes throughout, and so does every other document. All of
them describe it as it was understood at the time. We now hold the repository. Where
they disagree, the repository wins.

**Three sources must be reconciled, not two** *(added 2026-10-04, from batch 2 §7e)*.
Document 3's claims (45 of them, listed in `findings/02-vision-model-and-runtime.md`
§7c) · the code in `library/ai/hermes-agent-main/` · **and the sibling project's earlier
Hermes analysis in `library/ai/hermes-docs/reboot/`, dated 2026-08-15** — about seven
weeks *before* Document 3 (2026-10-03). `MAP-HERMES-2026-08-15.md`,
`13-HERMES-CAPABILITY-MATRIX.md`, `CONTESTED-HERMES-VS-COMPANAI.md`,
`HERMES-SORTED-INTO-FOUR.md` and `09-GLOSSARY.md` are all prior work on this exact
question. **Boundary (this plan's own rule, line 38): the third source is admitted for
one purpose only — understanding Hermes better. It is the sibling's material on a
different base, and we inherit no decision from it; its verdicts about its own product
are not evidence about ours.** Read them, and say where the three agree and where not.

**Task zero — which Hermes is this? PARTLY ANSWERED BY THE OWNER (2026-10-04).**
The owner has confirmed that **`library/ai/hermes-agent-main/` is the most current Hermes
we hold**, and instructed that documents describing Hermes be treated as potentially
outdated and mined for what still fits. Consequences:

- **The extract is the authority. Documents are the claim.** So Document 3's pin
  (**v0.21.3** / `v2026.9.14` / commit `345cd2b`) and its statement that `main` is
  **`0.0.0`** are the *outdated* part — the extract's `package.json` says **`1.0.0`**, and
  with **no `.git`** and **no `install-stamp.json`** the code's own resolver
  (`hermes_cli/version_info.py`: install stamp → live git → unknown) reports *unknown*.
  Record the mismatch; do **not** treat the document's version as a target.
- **Still to do:** identify which upstream release/commit our extract corresponds to, so
  that "current" is a pin and not an impression. Then confirm the referent of the word
  "Hermes" — `library/ai/` also holds `qwen-hermes-tool-calling-report.md` and
  `PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md`, so "Hermes" may name both an agent framework
  and a model family.

**A discrepancy to resolve first.** The skill count is three different numbers: **193**
as a claim in `hermes-docs` (81 default + 112 optional), **197** measured in the
sibling's vendored copy (82 + 115), **210** measured in the extracted repo (58 + 152).
Two measurement routes agree with each other; only the claim disagrees. **Find out
which is right, and why they differ.** This is precisely the failure mode where a
document quietly becomes wrong. *(Batch 2 adds one measured fact: `skills/` alone holds
only **14** top-level entries, so `optional-skills/`, `plugin-catalog/` and `plugins/`
must be counted too — whatever the right number is, it is not `ls skills`.)*

**Inputs.** `library/ai/hermes-agent-main/` (the code) · `library/ai/hermes-docs/` (the
reports) · `aissistant-package/hermes/` (the second, older copy)

**Output.** `findings/07-hermes-capability-map.md`

**Tickboxes**
- [x] Version and shape: what the repo is, how it builds, what it needs to run *(2026-10-04 — §2,
      §4: **a `main`-branch source snapshot from on/after 2026-09-28**, newer than release
      **v2026.9.24 (0.21.5)**; Document 3's pin (`v0.21.3`/`v2026.9.14`/`345cd2b`) is ~2 weeks
      older. The extract cannot self-identify — **no `.git`, no `install-stamp.json`** — so its
      own resolver (`hermes_cli/version_info.py`) reports *unknown*, correctly. `package.json`
      =1.0.0 vs `pyproject.toml`=0.0.0 are **two different version fields**, not a
      contradiction. MIT; Python `>=3.11,<3.15`; Node `^22.22 || ^24.11 || >=26`; **153 exact
      dependency pins** (a deliberate post-PyPI-worm supply-chain rule — V-03); Docker/Compose/
      Nix/desktop/Termux packaging; entry points `cli.py`, `run_agent.py`, `batch_runner.py`.)*
- [x] **Skills** — count by category in all three copies; resolve the 193/197/210 question
      *(2026-10-04 — §3: **all three numbers are real; they are three snapshots and the split
      moved.** hermes-docs *claimed* 81+112=**193**; the sibling vendored copy *measured*
      82+115=**197**; our extract *measured* **58+152=210**. Counted by **`SKILL.md` files**, not
      `ls skills` (which shows only 14 top-level entries). **The default set shrank 81→82→58
      while the optional set grew 112→115→152** — upstream is moving skills into opt-in. Rule
      that comes out of it: **cite the snapshot, not the number.**)*
- [x] **Tools** — how many tool sets, what they are, how an agent receives them *(2026-10-04 —
      §5: **59** always-on tools in `_HERMES_CORE_TOOLS`; the `TOOLSETS` dict has **61** keys —
      **37 general + 24 platform-scoped** (`hermes-<platform>`); **275** files under `tools/`,
      **38** `*_tool.py`; README says "40+ tools". A session's tools are the resolved union of
      its enabled toolsets, minus disabled; `tools/registry.py` can alias toolsets, apply plugin
      override policy, and gate a tool by `check_fn`. **The toolset is the surface gate**
      (`AGENTS.md`). **Corrected in the critic pass: the first draft said "37 toolsets" — that is
      the general count only.**)*
- [x] **Memory** — the layers, the caps, external providers, where it is stored *(2026-10-04 —
      §6: built-in `MEMORY.md`+`USER.md` injected at session start; a **`MemoryProvider`** ABC
      with lifecycle `initialize → system_prompt_block/prefetch/sync_turn → tool dispatch →
      shutdown`; a **`MemoryManager`** fanning hooks; **5** external providers in
      `plugins/memory/` (byterover, holographic, mem0, openviking, retaindb). **Rule: only ONE
      external provider may be registered at a time.** Profile isolation is a ContextVar
      `HERMES_HOME` override — and the code warns a worker with an empty context silently lands
      on the default profile. **Personal/per-profile, not tenant business data — confirms the
      vision's boundary.**)*
- [x] **Sessions and state** — `state.db`, what is in it, what survives a restart *(2026-10-04 —
      §7: **SQLite `state.db`, WAL mode**, **FTS5 with a CJK bigram tokenizer** (`cjk_unicode61`,
      no deps). 13 tables incl. `sessions`, `messages`, `session_model_usage`,
      `gateway_routing`, `async_delegations`, `compression_locks`. **30 recorded `sessions`-table
      schema migrations** to 2026-09-28 (`hermes_cli/session_schema_history.py`). Compression
      splits a session into a `parent_session_id` chain. **Holds conversation truth, not business
      truth — the vision's exact boundary, verified.**)*
- [x] **Identity** — `SOUL.md`, `profile.yaml`, profiles, homes *(2026-10-04 — §8: `SOUL.md` at
      repo root is the agent's system prompt/persona. A **profile** is a durable home (config,
      credentials, persona, memories, sessions, skills, cron, its own DB); `HERMES_HOME` is
      overridable per profile via a **ContextVar**; identity modules `profile_identity.py`,
      `profile_routing.py`, `profiles.py`. `shared_profile_warning.py` warns against two
      processes on one profile. **Evidence for trap R-03: a profile is not a tenant — confirmed
      from the code.**)*
- [x] **Models** — providers, the auxiliary/chore model roles, fallback behaviour *(2026-10-04 —
      §9: **38** model providers in `plugins/model-providers/` (anthropic, openai-codex,
      openrouter, bedrock, vertex, gemini, deepseek, alibaba, minimax, xai, meta-ai, nvidia, nous,
      ollama-cloud, huggingface, custom, …); **11** `agent/auxiliary_*.py` modules covering
      client, async rebuild, call outcome, **fallback recovery**, health, hooks, **local
      runtime**, **reasoning floor**, structured output, unavailable-handling. **A main model +
      auxiliary chores with fallback — the vision's local-first "split the intelligence burden",
      already implemented (V-01).**)*
- [x] **MCP** — how an agent reaches outside systems *(2026-10-04 — §10: MCP is first-class and
      catalogued — config/catalog/picker/security/startup modules (`hermes_cli/mcp_*.py`), app
      detection, tool config, web routes, and **65** definitions in `optional-mcps/` (15 named in
      an 829-line catalog). **Verified.**)*
- [x] **Sandbox** — what it is, what it can reach, how it is switched on *(2026-10-04 — §11: a
      **containerised execution image** the terminal/computer-use tools run inside — image
      selection (`sandbox_image_switch.py`), a Dockerfile + workflow, a Nix sandbox, dev
      sandboxes, and **terminal backends that can be restricted** with guards
      (`terminal_tool_backends.py`, `terminal_scope.py`, `terminal_tool_guards.py`). **A shortcut
      for the vision's "deterministic services execute" boundary — but Hermes-side isolation,
      not platform authorization.** **Caveat (critic attack 1): present, behaviour not exercised
      here.**)*
- [x] **Subagents / delegation** — the mechanism and its limits *(2026-10-04 — §12:
      `tools/delegate_tool.py` + 8 modules, async delegation (persisted in `async_delegations`),
      `agent/subagent_lifecycle.py`, `agent/delegation_context.py`. Subagents are **immutable
      contracts, not `AIAgent` objects**; the goal is bounded (**`_MAX_GOAL_CHARS = 16_000`**)
      and persisted/recoverable. **Evidence for H-36 — a subagent receives a bounded goal, not
      the parent's conversation.** **Naming collision: our `delegations` is authority delegation
      (human→human); this is task delegation (agent→agent) — batch 10.**)*
- [x] **Scheduling** — the cron surface *(2026-10-04 — §13: **33** Python files under `cron/` —
      `scheduler.py`, `scheduler_tick.py`, `scheduler_detached_worker.py`, `job_definition.py`,
      `occurrences.py`, `quota_hold.py`, **`delivery_queue.py`**, **`scheduler_delivery.py`**,
      `incidents.py`, `monitor.py`, `blueprint_catalog.py`, `suggestions.py`. Jobs with
      **deliveries, quota holds, incidents, a monitor, detached workers** — a production
      scheduler, not a timer. **Two schedulers (ours + this) is exactly the failure the plan
      names — batch 10.**)*
- [x] **ACP adapter** — what it is, what it exposes *(2026-10-04 — §14: **14** files under
      `acp_adapter/` — `entry.py`, `auth.py`, `commands.py`, `content.py`, `edit_approval.py`,
      `events.py`, `model_catalog.py`, `permissions.py`, `session.py`. Exposes Hermes as an
      **Agent Client Protocol** endpoint (editor/IDE integration) **with its own auth,
      permissions, edit-approval and model catalogue.**)*
- [x] **Web dashboard** — what `web/` is and what it can do *(2026-10-04 — §15: a **Vite + React
      + TypeScript** app — `pages/`, `components/`, `contexts/`, `hooks/`, `i18n/`, `lib/`,
      `plugins/`, plus a plugins management page. Plugins register **pages, tabs and slots**
      without touching core. **An extensible ops console — the vision never describes one and a
      governance product needs one (V-04).**)*
- [x] **Config surface** — how many keys, grouped by area *(2026-10-04 — §16:
      `cli-config.yaml.example` is **2,323 lines** with **28** top-level keys; areas =
      models/providers, tools/toolsets, memory, profiles, gateway/platforms, cron, sandbox,
      browser, terminal, observability; precedence = file + env (`config_env.py`) + per-profile
      overrides.)*
- [x] **For each area, say whether it is a gap we have or a duplicate of something we
      already run** — the owner's reuse objective applies here too *(2026-10-04 — §18: a verdict
      per area. **The overlap is narrower than expected.** GAP: agent runtime/tool loop, tool
      registry+toolsets, skills, personal memory, sandbox, web ops console, document extraction.
      DUPLICATE (partial): session store/FTS5, identity/profiles, MCP, messaging channels.
      **BOTH (must reconcile): models, approvals, subagents/delegation. DUPLICATE (conflict):
      scheduling — two schedulers.** Audit/ledger: **ours is stronger** (hash chain). **The two
      dangerous collisions are scheduling and "delegation"-by-name.**)*
- [x] **Every claim from batch 2 about Hermes** — all **45** (H-01…H-45 in
      `findings/02-vision-model-and-runtime.md` §7c) — verified or contradicted, with the file
      *(2026-10-04 — §17: **40 VERIFIED · 4 PARTIAL (H-04, H-10, H-40, H-44) · 1 CONTRADICTED
      (H-02) · 0 UNVERIFIABLE.** The one contradiction is **H-02 only as a description of *our*
      tree** (our extract is post-`v2026.9.24`, on/after 2026-09-28), not a fact about the release
      it names. **Document 3's description of Hermes is structurally right; its weakness is
      staleness in the numbers, not error in the structure.**)*
- [x] **Critic pass** — try to prove the map wrong; name the attempt *(2026-10-04 — §20: **four
      attacks.** 1) "counts, not behaviour" — three areas (sandbox, document extraction,
      event-triggers) rest on file presence alone and are downgraded to "present, behaviour not
      exercised here". 2) "window, not a pin" — the two version routes share no failure mode; the
      window stands, a commit hash does not. 3) "the V-list is a wish list" — V-02/V-05 restated
      as concrete benefits; V-09 demoted to HOLD. **4) "re-derive every count" — two figures were
      wrong: platform adapters 32→34 (a file count mislabelled a platform count) and toolsets
      37→61 (general-only labelled the whole dict); both corrected in place, with the command now
      beside every number. The failure mode was the programme's recurring one: measuring a
      different thing than the claim named.**)*

**Result.** Measured Hermes from the code we hold — **the extract the owner confirmed is
current** — not from the documents describing it. **2,387 Python files, 897,681 lines (excluding
tests), 211 `SKILL.md` files, 59 core tools, 61 toolset keys, 34 platform adapters, 38 model
providers, 65 optional MCPs, 30 session-schema migrations.**

**Task zero is answered.** Our Hermes is a **`main`-branch source snapshot from on/after
2026-09-28, newer than release v2026.9.24 (0.21.5)** — about **two weeks newer than Document 3's
pin**. Reached by **two independent routes** (a release-tag mapping in a test fixture; the
timestamped schema-migration log). **The consequence: every claim Document 3 makes about Hermes
is a claim about a tree two weeks behind ours — the "documents quietly become wrong" failure,
now dated rather than suspected.**

**The 193/197/210 skill question is resolved — not a contradiction but a reorganisation.** All
three numbers are real: 81/112, 82/115, **58/152**. The default set shrank while the optional set
grew; upstream is moving skills into opt-in. **The rule: cite the snapshot, not the number.**

**Of Document 3's 45 Hermes claims: 40 VERIFIED · 4 PARTIAL · 1 CONTRADICTED — and the
contradiction is only as a description of *our* tree.** The description is **structurally right;
its weakness is stale numbers, not wrong structure.**

**The reuse answer for Hermes: the overlap is narrower than expected.** Hermes is an **agent
runtime**; our platform is a **governance + business-data platform**. The genuine gaps are the
agent loop, the tool/skill systems, the sandbox and an ops console; the duplicates are partial
(sessions, identity, MCP, channels); and **two collisions are dangerous — two schedulers, and
"delegation" meaning two different things.**

**Thirteen `V`-entries** (value beyond the vision, per the owner's new standing rule) — **8 KEEP,
5 HOLD, none dropped.** The most valuable is **V-01: auxiliary models with automatic fallback**,
which turns the vision's "run on a small local model" from a hardware problem into a routing
problem.

**And the critic pass found real defects in this report and fixed them** — two wrong counts
(platform adapters 32→34; toolsets 37→61) and two figures stated without their counting rule.
Every number in §1 now names the command that produced it.

**Definition of done.** An integration plan can be written from this file without
opening the Hermes repo. Every count has a command behind it.

---

# Batch 8 — HERMES as the other documentation reports it — fact-checked

**Question.** What does the rest of the library tell us about **Hermes** — and which of
it survives being checked against the Hermes code?

**Boundary — read `library/ai/README.md` first.** The sibling project is a different
product on a different base (Paperclip, not Open Mercato). Nothing here is a decision we
inherit. This batch has exactly one job: **more understanding of Hermes.**

**The rule for every item in this batch:**

| Tag | Meaning | What we do |
|---|---|---|
| `VERIFIED` | A claim about Hermes that the Hermes code confirms | Keep, with the file and line |
| `CONTRADICTED` | A claim the Hermes code disproves | Record the truth, and the claim as wrong |
| `UNVERIFIABLE` | A claim we cannot check from the code we hold | Keep only if marked as unverified, and say what would settle it |
| `NOT ABOUT HERMES` | A verdict about their product, or their architecture choice | **Drop it.** Not relevant to this programme |
| `INTEGRATION WARNING` | Something that broke when they connected a product to Hermes | Keep — it is a failure mode, not an opinion |

**Inputs.** `library/ai/hermes-docs/` · `library/ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` ·
`library/ai/qwen-hermes-tool-calling-report.md` · `library/ai/tiny_models/` ·
`konsult/aissistant-package/` (for the integration, not the product)

**Output.** `findings/08-hermes-fact-check.md`

**Tickboxes**
- [x] The Hermes capability matrix (`13-HERMES-CAPABILITY-MATRIX.md`) — every row checked
      *(2026-10-04 — §2: it is a **target specification** (every target *planned* unless labelled
      current), 2026-08-13, corrected 08-15. Its **disposition/access/gate/"do not" columns are
      `NOT ABOUT HERMES`** (the sibling's product design). Its **"Current state" column makes Hermes
      claims and all survive** — `/v1/runs` + SSE + stop (`api_server.py:83-88`), `/v1/skills`
      (`:88`, `:2953`), the 2,200-char memory cap that **rejects on overflow**
      (`agent_init.py:1355-1356`, `memory_tool.py:345`), **no `author` field** on a message
      (`hermes_state_common.py:449`), MoA, curator, `/steer`, checkpoints, the platform toolsets, ACP,
      the dashboard git routes. **Verdict: its Hermes facts are accurate** — its weakness is the same
      as Document 3's: it describes **0.20.1, two releases behind our extract**.)*
- [x] `02-hermes-in-four-piles.md` — the sorting, and the skill count in it *(2026-10-04 — §3: the
      fullest feature inventory in the library (**51 items**), and **the most errors of any document
      in this batch — all the same kind: a stale count.** **Skills `CONTRADICTED`** (claims 81/112/193;
      the copy it names measures **82/115/197** — the *category* counts 15/21 are right). **Toolsets
      `CONTRADICTED`** ("25 sets" → **59** in the sibling / **61** in ours). **Providers
      `CONTRADICTED`** (39 → **34/38**). **Memory systems `CONTRADICTED`** (seven → **8/5**).
      `auxiliary.session_search` **`CONTRADICTED`** (**removed**, PR #27590). `prefer_fast_model`
      **`CONTRADICTED`** (`title_generation` sets it **`False`**; **no chore opts in**). The **22
      auxiliary chores** are `VERIFIED` (22 keys, of which **18 are model roles** + 4 settings). The
      **⚔️ CONTESTED pile is `NOT ABOUT HERMES`** (ownership decisions). **The one line to keep is the
      document's own: "We currently use a small corner of what we already ship." Use it as a map;
      do not quote its numbers.**)*
- [x] The Hermes settings map — checked against the real config surface *(2026-10-04 — §4: **the most
      accurate document in the batch.** Its Hermes claims all survive: the **`model` dict form**
      (`cli-config.yaml.example:72`), the auxiliary tasks, `memory.write_approval` /
      `skills.write_approval` / `skills.guard_agent_created` (all default **`False`**,
      `config_defaults.py:1320/:1476/:1485`), transcripts+FTS in `state.db`, `MEMORIES.md` sticky
      memory, `X-Hermes-Session-Id` (`api_server.py:76`) and `X-Hermes-Session-Key`,
      `POST /v1/chat/completions` (`:82`), `session_search` over FTS. **One claim caught my own
      near-miss — see §10.**)*
- [x] The local-model work — what actually ran, at what quality, on what hardware *(2026-10-04 — §5:
      **`C6b-3`** ran **Qwen3.5-9B** on **7 CPU cores**: tool calls **10/10** with reasoning **ON**,
      median **34 s**, prompt **~95 ms/token**, ~**130** reasoning tokens before a 2-token answer,
      RAM **~7.5 GB**, healthy in ~4 min. **`C6b-6`** ran **Qwen3.5-0.8B-Q8_0**: **10/10**, median
      **6 s**, RAM **1.2 GB**, healthy in **50 s**. **Both tagged `UNVERIFIABLE` by us** — measured on
      their VPS; we cannot re-run them. **`C6b-2b` is `VERIFIED`** (the `providers:` block + `model`
      dict shape exist in the code). **The SSOT's "disable reasoning" (`--reasoning off`) is
      `CONTRADICTED` by a later document — `ADR-004` supersedes it: reasoning stays ON on a pinned
      llama.cpp (PR #26252).** `ADR-004`'s Hermes claims are **exact**: vendored **0.20.1**,
      `middleware.py:23`, `:187`, called from `conversation_loop.py:2790`.)*
- [x] The tool-calling report — checked against Hermes's real tool interface *(2026-10-04 — §6:
      **its Hermes claims are accurate.** The **four middleware stages** — `llm_request`,
      `llm_execution`, `tool_request`, `tool_execution` — exist exactly as named
      (`hermes_cli/middleware.py:20-23`), and **`run_llm_execution_middleware(request, next_call,
      **context)`** matches the report's description of the seam (`:135-140`). The report's external
      references (llama.cpp #20837 / PR #26252, vLLM #45413, Hermes PR #35129) are `UNVERIFIABLE` —
      not in the code we hold. **Its architecture recommendation (a rescue shim at `llm_execution`)
      is `NOT ABOUT HERMES`** — and `ADR-004` answers whether it is *needed*: **not until
      qualification says so.**)*
- [x] Every integration failure recorded anywhere — extracted with its cause *(2026-10-04 — §7: the
      **most valuable thing in the library** — a real Hermes integration, in production, written down.
      **`LESSONS.md` L-001…L-022** (note: **L-006 is absent**). Hermes-touching ones, each
      corroborated by code: **L-001** shared home corrupts memory (per-profile `HERMES_HOME`); **L-007**
      `API_SERVER_ENABLED` alone exposes nothing — default host is **loopback**
      (`security_audit_startup.py:133`); **L-008** non-reasoning models reject `reasoning.effort`;
      **L-009** Tirith raised `plain_http_to_sink` and **hung** a headless worker
      (`config_defaults.py:1792`); **L-014** Codex OAuth vs Anthropic; **L-022** a `0700` home blocks
      a cross-uid watcher (`hermes_constants.py:465/:602/:606` names **UID 10000**). **Named
      incidents:** the **container silently adopted** (compose named containers exactly as provisioning
      would — *"nothing errored"*); the **`403`** was **not a Hermes defect** (`REC-02` — inserted run
      records bypassed the wake path); the **runaway wakes** were the **host's** recovery paths
      (Hermes only amplified); the **callback URL** resolved to the container's own front door; the
      **SSL CA corruption** after `hermes update` — **fixed** by `agent/ssl_guard.py`.)*
- [x] Tag every item `VERIFIED` / `CONTRADICTED` / `UNVERIFIABLE` / `NOT ABOUT HERMES` /
      `INTEGRATION WARNING` *(2026-10-04 — §0 legend, §9 totals: **~45 `VERIFIED` · 8 `CONTRADICTED` ·
      ~15 `UNVERIFIABLE` · ~30 `NOT ABOUT HERMES` · ~14 `INTEGRATION WARNING`.** Every §2–§7 table
      carries the tag and the file it was checked against. **Two copies of Hermes are in scope and
      they are different versions** — the sibling's vendored copy is **0.20.1**
      (`aissistant-package/hermes/pyproject.toml`), ours is **post-0.21.5**; **a claim is checked
      against the copy it was written about.**)*
- [x] List every claim we found to be **wrong**, with what is true instead *(2026-10-04 — §8: **8
      wrong claims** — skills 81/112/193→**82/115/197**; 25→**59/61** toolsets; 39→**34/38**
      providers; seven→**8/5** memory systems; `auxiliary.session_search`→**removed**;
      `prefer_fast_model`→**`False`, no chore opts in**; Qwen-0.8B context **256K vs 262K** (internally
      inconsistent); "disable reasoning"→**superseded**. **Plus one artefact defect in the Hermes repo
      itself:** `cli-config.yaml.example` (lines 925, 946) still documents the **removed**
      `auxiliary.session_search` / `web_extract` blocks. **The pattern: not one is structural — every
      one is a count that stopped being true.**)*
- [x] **Critic pass** — try to show that an item I tagged `VERIFIED` was confirmed by a
      document rather than by the code. Name which ones were attacked *(2026-10-04 — §10: the attack
      is **"a document confirming a document is not verification."** Every `VERIFIED` was re-checked
      for whether its evidence is a **`file:line` I opened** or **prose agreement**. **Survived on code
      alone:** the memory limits, the `messages` schema, the four middleware stages + the
      `llm_execution` signature, the loopback default, `tirith_enabled`, the 0700/UID-10000 note, the
      SSL fix's presence in the sibling, the `model` dict shape, the `0.20.1` version. **Broke — three
      honest limits:** (1) I nearly marked the `model` dict claim `CONTRADICTED` by measuring
      `config_defaults.py` (where `model` is a *string*) instead of the YAML — **the document was
      right, my instrument was wrong**; (2) the local-model **performance** numbers rest on
      document+code and are `UNVERIFIABLE`, not `VERIFIED`; (3) the **88,000-skills** figure was left
      tagged, **not laundered**. **Second-order finding: the four-piles errors cluster in exactly the
      counts a reader would quote; its qualitative statements are sound.**)*

**Definition of done.** Nothing in this programme rests on an unchecked claim, and every
surviving item names the file it was checked against.

**Result.** Fact-checked the rest of the library's Hermes claims against the Hermes code —
**the sibling's vendored copy is Hermes 0.20.1; ours is post-0.21.5**, and **a claim is checked
against the copy it was written about.** Corpus: **238 markdown files, 32 MB** under
`hermes-docs/`.

**The one-line verdict: the library is a reliable map of Hermes and a reliable record of how it
breaks — and an unreliable source of numbers.** Every Hermes capability it names is real; every
count it quotes should be re-measured before use.

**The most accurate document is the settings map** (`docs-more/hermes-settings-map.md`) — short,
real keys, all survive. **The capability matrix is faithful as a specification** (its Hermes facts
are accurate; it just describes 0.20.1, two releases behind us). **The four-piles inventory is the
best map of the surface and carries the most errors** — all of them **stale counts** (skills
81/112/193 → **82/115/197**; 25 toolsets → **59/61**; 39 providers → **34/38**; seven memory
systems → **8/5**; `auxiliary.session_search` removed by PR #27590; `prefer_fast_model` set
`False`, no chore opts in).

**The most valuable thing in the batch is the failure register.** The sibling ran a real Hermes
integration in production and wrote down what broke — `LESSONS.md` L-001…L-022 (**L-006 absent**)
plus five named incidents. The highest-value one: **a container was silently adopted** because
compose named containers exactly as provisioning would — **two systems owning one name, and
nothing errored.** Two suspected Hermes defects were **disproved by investigation**: the `403`
(`REC-02` — inserted run records bypassed the wake path) and the runaway wakes (the **host's**
recovery paths; Hermes only amplified the cost). The SSL CA corruption's fix **is** in the sibling
(`agent/ssl_guard.py`) but is **reworked in ours** (`agent/ssl_verify.py`, `install_truststore()`)
— a document naming an artefact a newer tree no longer has.

**8 wrong claims recorded, plus one defect in the Hermes artefact itself** — `cli-config.yaml.example`
still documents the removed `auxiliary.session_search` / `web_extract` blocks. **Not one wrong claim
is structural; every one is a count that stopped being true.**

**Critic pass — the attack named: "a document confirming a document is not verification."** Every
`VERIFIED` was re-checked for a `file:line` rather than prose agreement. Three honest limits came
out: my own near-miss (I nearly "disproved" the true `model` dict claim by measuring the wrong
file), the local-model **performance** numbers (document+code → `UNVERIFIABLE`, not `VERIFIED`),
and the **88,000-skills** figure (left tagged, not laundered). **The batch's own limit, stated
plainly: we cannot run Hermes here, so behaviour under load is `UNVERIFIABLE` — the dockerised
instance is what would settle it.**

**Tag totals: ~45 `VERIFIED` · 8 `CONTRADICTED` · ~15 `UNVERIFIABLE` · ~30 `NOT ABOUT HERMES` ·
~14 `INTEGRATION WARNING`.**

---

# Batch 9 — The map

**Question.** For every requirement from the vision, who already covers it — Hermes, our
platform, both, or neither?

**Inputs.** Batches 1–8.

**Method.** One row per requirement. Two columns that matter — **HERMES** and
**STARTING-KIT** — plus the vision's own intent restated. One verdict per cell:
`COVERED` · `PARTIAL` · `MISSING` · `CONFLICT` · `N/A`.
Every `COVERED` cell carries an evidence pointer — file and line. A cell without
evidence is `PARTIAL` at best.

**Output.** `findings/09-overlap-matrix.md`

**Tickboxes**
- [x] Build the matrix *(2026-10-04 — §1–§2: the vision's four registers hold **468 numbered
      statements** (N1 28 · N2 21 · N3 67 · N6 4 · N4 38 · N5 36 · N7 60 · N8 214) plus the
      declared invariant lists. Consolidated **without de-duplication** (batch 2 §4a) into
      **140 distinct requirements** in **19 domains**, each row carrying the vision's intent and
      its source IDs. The consolidation is the point of this batch — six documents converge on
      the same small rule-set, so the repeats collapse.)*
- [x] Assign every cell a verdict *(2026-10-04 — §2: **two verdicts per row** — HERMES and
      STARTING-KIT — from `COVERED` / `PARTIAL` / `MISSING` / `CONFLICT` / `N/A`. **`N/A` is not
      a failure**: it means the requirement is the other side's domain by design, and most of the
      vision is the platform's own domain, so Hermes is `N/A` on 85 of 140. Every row has both
      cells filled.)*
- [x] Attach evidence to every `COVERED` *(2026-10-04 — every `COVERED` cell names a file or a
      measured finding: e.g. RQ-60 `query/engine.ts`, RQ-76 `tenantDataEncryptionService`, RQ-114
      `ledgerService.ts`, RQ-88 Hermes's 38 providers. The rule "a cell without evidence is
      `PARTIAL` at best" was applied — see the critic pass, where RQ-38 and RQ-134 were forced
      down.)*
- [x] Count by verdict — the headline numbers *(2026-10-04 — §3, **re-counted from the file, not
      estimated**. HERMES: **10 `COVERED` · 42 `PARTIAL` · 0 `MISSING` · 3 `CONFLICT` · 85 `N/A`**.
      STARTING-KIT: **20 `COVERED` · 50 `PARTIAL` · 64 `MISSING` · 3 `CONFLICT` · 3 `N/A`**. Both
      columns sum to 140. **This is the batch where my first hand-written tally was wrong and the
      re-count caught it** — see the critic pass.)*
- [x] List every `CONFLICT` separately, with both sides named *(2026-10-04 — §4: **three** —
      **scheduling** (Hermes `cron/` 33 files vs our `scheduler`+`webhooks`), **eventing**
      (Hermes hook bus vs our `events`+`webhooks`), **chat channels** (Hermes 34 adapters vs our
      `communication_channels`). Plus two conflict-adjacent: **models/providers** (38 vs our
      `llm-adapters`) and **delegation** (authority human→human vs task agent→agent). All to
      batch 10.)*
- [x] **Where our platform is ahead of the design** — with evidence. This is not
      cheerleading; it is the guard against rebuilding working software to match a drawing
      *(2026-10-04 — §5: **ten items**, each with a file. The strongest: the **hash-chained
      ledger** (Hermes has no equivalent), **explanation-as-a-value** (Doc 8 only requires an
      admin "should be able to inspect" — ours returns the reason on every decision), the
      **act-level autonomy axis** (E0–E6 × A0–A5 × G0–G4, richer than Doc 8's one 6-value scale),
      **trust tiers T0–T4**, **enforcement-can-only-narrow**, **record locks**. **On the *act*
      axis — what an actor may do, and how we prove it — we are ahead of the document.**)*
- [x] **Where the design is wrong** — fact-check the vision's own strongest claims and
      record the verdict *(2026-10-04 — §6: **five claims tested.** (1) "User Function is a new
      artefact" — **overstated for 2 of its 6 types** (Type 1 is a stored query, Type 3 a saved
      report; §48 half-admits it) and it never states the rename-a-field acceptance test. (2)
      "There is *the* object list" — **false: three lists, 30/33/34, union 37**. (3) "Runs on a
      small local model" — **framing incomplete**: it is a routing problem, not hardware (V-01).
      (4) "Zero cross-tenant leakage is a hard invariant" — **right but mechanismless**. (5)
      Implementation may begin — **contradicted by the vision's own §29 gate**. Plus the README's
      broken section numbering.)*
- [x] **Where the design is ahead of us** — what it has that we genuinely lack *(2026-10-04 —
      §7: **thirteen real gaps**, from batches 5–6 (X-01…X-09, R-14…R-25), ordered by how much
      they block: the **Business Model Kernel**, **Business IR + compiler**, **User Functions**,
      the **relationship fabric**, **field/record/value/relationship authorization**, **field
      classification metadata**, the **AI Input/Output Guards** (the largest security gap), the
      **Widget contract**, the **@/# reference layer**, aggregation controls, a security-event
      taxonomy, break-glass, and **RLS**.)*
- [x] **Critic pass** — attack every `COVERED` and try to downgrade it. Name which ones
      were attacked and why they survived *(2026-10-04 — §9: **all 30 `COVERED` cells put on
      trial** (20 kit + 10 Hermes). **Two broke** — RQ-38 (there is no canonical model for the
      projection to be *of* yet) and RQ-134 (95 backend pages are not the vision's Widget-based
      Workspace) → both `PARTIAL`. **One split** — the ledger holds as a chain but not as a record
      shape. **Two held** — RQ-50 and RQ-62. **Hermes's 10 `COVERED`s all survived** — the
      cleanest result. **Two structural findings: our `COVERED`s are *infrastructure*, Hermes's
      are *capability*, and the `MISSING` list is the plan.** **The pass also caught my own wrong
      count** — the hand-written tally (15/55/38) was replaced by the measured one (20/50/64).)*

**Definition of done.** The headline question is answerable in one sentence: *of N
requirements, X covered, Y partial, Z missing, W conflict.*

**Result.** Mapped every vision requirement against both sides. The vision's four registers hold
**468 numbered statements**; consolidated **without de-duplication** into **140 distinct
requirements** in **19 domains**, each with a verdict for **Hermes** and for the **starting-kit**.

**Of 140 requirements, the starting-kit fully covers 20, partly covers 50, misses 64, and
conflicts with Hermes on 3; Hermes fully covers 10, partly covers 42, conflicts on the same 3,
and is the wrong place to look for the other 85 by design.**

**The shape of it.** Hermes is `N/A` on **more than half** the vision — because the vision is
mostly the *platform's* own domain (the model, the compiler, the ledger, the kernel) and Hermes is
only the agent runtime. **Where Hermes *is* in scope it is a genuine asset — 10 covered, 0
missing.** Our kit is the mirror image: it covers the **platform half** (identity, tenancy, ledger,
events, files) and misses the **business-model half** and the **data-level security half** — which
is why our `MISSING` count (64) dwarfs Hermes's whole in-scope footprint.

**Three `CONFLICT`s** — **scheduling** (two schedulers), **eventing** (two hook buses), **chat
channels** (two channel stacks) — plus two conflict-adjacent (**models**, **delegation-by-name**).
All five go to batch 10.

**Ten places we are ahead of the design** — the hash-chained ledger, explanation-as-a-value, the
act-level autonomy axis, trust tiers, enforcement-can-only-narrow, record locks, the event/queue
stack, hybrid search, RTL locales, and an AI-independent audit. **On the *act* axis we are ahead
of the document.**

**Five vision claims fact-checked and found wanting** — the "User Function" novelty is overstated
for two of its six types; there is **no single object list** (30/33/34, union 37); local-first is a
**routing** problem not a hardware one; "zero cross-tenant leakage" is right but mechanismless; and
by the vision's own §29 gate **implementation must not begin yet**.

**Thirteen real gaps** the design has and we do not — the business-model spine, the relationship
fabric, field/record/value authorization, field classification, the AI guards, the Widget contract,
the `@`/`#` layer, and RLS.

**The eight security-overlap questions batch 5 left are answered** (§8) — the act-axis kernel and
the data-axis kernel are **two kernels, both needed**; the ledger chain is real but its record
shape is short; shadow mode is a migration state, not a resting state; and three of Doc 8's seven
data classes have nowhere to land in our five.

**Critic pass — all 30 `COVERED` cells attacked; two broke, one split, the rest held.** And it
caught a defect in this report: my **first hand-written tally was wrong** (15/55/38 against the
measured 20/50/64); the file now carries the re-counted numbers, and the row count, the domain
headers and both verdict columns all reconcile at **140**.

---

# Batch 10 — Contested ownership: who owns what

**Question.** For every point where Hermes and our platform claim the same job, who
wins?

**Why.** These are the expensive mistakes. Two schedulers, two memories, two sets of
credentials, two task systems — each is a place where the platform can end up telling
the user two different truths. The vision names several of them directly ("a Hermes
profile is not a tenant"; `state.db` is not business truth). This batch settles the rest.

**Inputs.** Batch 9's `CONFLICT` list · batch 7's Hermes map · batch 6's platform map ·
`library/ai/hermes-docs/reboot/CONTESTED-HERMES-VS-COMPANAI.md` (**as a list of
questions, not as answers** — it is the sibling's list, for a different base)

**Method.** One entry per item: what each side does, what the user experiences under
each choice, a recommendation, and what breaks if the recommendation is wrong.

**Output.** `findings/10-contested-ownership.md`

**Tickboxes**
- [x] Approvals · [x] Skills · [x] Scheduling · [x] Task board · [x] Memory vs knowledge
- [x] Projects and workspaces · [x] Secrets and credentials · [x] Choosing models
- [x] Conversation history · [x] Usage and cost reporting · [x] Chat channels
- [x] Event hooks · [x] Backup and restore · [x] Search and retrieval
      *(2026-10-04 — all 14 named items written up in `findings/10` §3 as **C-1…C-14**, each with
      what each side does, whether they collide, the user experience, a recommendation, how the
      loser is disabled, what breaks if wrong, and whose decision. Three are genuine `CONFLICT`s
      (C-3 scheduling, C-11 channels, C-12 event hooks — batch 9's list). Verified from our own
      code: `user_task` (a workflow task, not a kanban board), `integrations` credentials,
      authority `projectService`, `ai_token_usage`, `packages/search`, no backup module.)*
- [x] Add any new contested item found in batches 1–9 *(2026-10-04 — **four added**: **C-15
      delegation-by-name** (our authority delegation human→human vs Hermes task delegation
      agent→agent — language only), **C-16 MCP** (our client+server vs Hermes client+catalogue —
      two directions), and two **internal** contests (not Hermes-vs-us): **C-17 the two-kernel
      question** (act-axis vs data-axis) and **C-18 Row-Level Security**. **18 items total.**)*
- [x] For each: recommendation, consequence, and what would change our mind *(2026-10-04 — every
      entry carries a one-sentence recommendation naming the authority, "how the loser is
      disabled" **concretely**, and "what breaks if this is wrong". The "what would change our
      mind" is the §5 critic table — the counter-argument that would overturn each one.)*
- [x] Mark which are **Ramzi's decisions** and which are ours to take *(2026-10-04 — the
      register's last column. **Ramzi's: C-1 approvals, C-3 scheduling, C-6 memory vs knowledge,
      C-11 chat channels, C-15 the delegation naming** — plus a security confirmation on C-7/C-18
      and the tenant model-policy default on C-8. **Ours: the other twelve.**)*
- [x] **Critic pass** — argue the other side of the recommendation I made. Name the argument
      *(2026-10-04 — §5: **all 18 argued against.** Three counter-arguments won and changed the
      report: **C-13 is a gap, not a decision**; **C-15 and C-5 are naming fixes, not ownership
      decisions**; **C-18's RLS must be *derived* from the same policy** or it is a second decision
      point (I5). **Two are left deliberately open for Ramzi** — C-3 ("if the boundary cannot be
      enforced, the honest answer is one scheduler") and C-6 ("we may be about to build a knowledge
      base we do not need").)*

**Definition of done.** Every contested item has an owner, a recommendation and a stated
consequence.

**Result.** Settled every point where Hermes and our platform claim the same job. **18 items** —
the plan's 14 plus four found in batches 1–9 (delegation-by-name, MCP, and two internal contests:
the two-kernel question and RLS). Each has a recommendation naming the authority, a concrete way
to disable the loser, and a stated consequence.

**The outcomes: three `CONFLICT`s, and the rest split by scope.** **Scheduling, chat channels and
event hooks** are the genuine collisions (batch 9's list) — in each, **our platform owns the
*business* side and Hermes owns the *runtime* side**. **Two are naming-only** (projects, delegation).
**Two are internal** to our own design (the act-axis vs data-axis kernel; RLS). **One is a gap, not
a contest** — business backup/restore does not exist (C-13). **One is nothing to contest** —
we have no skill system, so Hermes owns skills and we own publication (C-2).

**Five decisions are Ramzi's:** approvals (C-1), scheduling (C-3), memory vs knowledge (C-6),
chat channels (C-11), and the delegation naming (C-15) — plus a security confirmation on secrets
and RLS. **Twelve are ours to take.**

**The two deepest findings.** (1) **C-6, memory vs knowledge** — Hermes owns *agent memory* (and
the founder is right that it is better in the brain), our platform owns *authorized knowledge*,
because **Hermes has no tenant and no authorization**; the only thing worth building is the
authorization boundary, not a parallel memory. (2) **C-3, scheduling** — a split by scope does
**not remove the second scheduler, it only labels it**; if the boundary cannot be *enforced* by a
gate on job creation, the honest answer is **one scheduler**, and that is a real fork for Ramzi.

**Critic pass — all 18 argued against.** Three counter-arguments won and changed the report:
C-13 is a gap not a decision; C-15 and C-5 are naming fixes not ownership decisions; and C-18's
RLS must be *derived* from the same policy or it becomes a second decision point. **Two items are
deliberately left open for Ramzi** (C-3, C-6) — a decision that is his may not be closed here.

**Owner's decisions, recorded 2026-10-04.** The owner's instruction: *"for the 5 open questions,
we follow your recommendations."* **All five Ramzi decisions are now closed, in favour of the
recommendations.** Recorded in full in `findings/10` §8.

| # | Item | Decided | Consequence |
|---|---|---|---|
| C-1 | Approvals | **Split by scope — our gate owns business actions** | Hermes mode `manual`, never `smart`; transport → our plugin. **Risk-graded** (only above a risk class waits for a human) |
| C-3 | Scheduling | **Split by scope — our scheduler owns business jobs** | `allow_agent_scheduling` off; **valid only if the boundary is enforced by a gate on job creation** — the gate is a build requirement, not optional |
| C-6 | Memory vs knowledge | **Split by the six categories — build only the authorization boundary** | Hermes owns agent memory; we own authorized knowledge. **No parallel memory, no second knowledge base** — now on the "do not build" list |
| C-11 | Chat channels | **Split by scope — ours is the business inbox** | Hermes adapters for agent-facing chat only; **we do not build our own adapters for agent chat** |
| C-15 | Delegation (by name) | **Split + rename ours** | Ours = authority delegation; Hermes's = task delegation. Not interchangeable — added to the vocabulary register |

**Still open, not closed by this instruction:** the security confirmation on **C-7** (secrets) and
**C-18** (RLS), and the tenant model-policy default on **C-8**.

---

# Batch 11 — Shortcut register and gap register

**Question.** What do we get for free by combining what we have with Hermes — and what
must genuinely be built?

**Inputs.** Batches 9 and 10.

**Output.** `findings/11-shortcut-and-gap-register.md`

**Tickboxes**
- [x] **Shortcut register** — requirement → what already ticks it → the evidence → what
      is still needed to finish it. Ordered by how much work it saves *(2026-10-04 — §2:
      **20 shortcuts**, ordered by work saved. Biggest: **S-01 the agent runtime** (Hermes ships
      the whole loop), **S-02 our resolver + hash-chained ledger**, **S-03 38 providers + auxiliary
      fallback + llama.cpp**. Each names the file and what is still needed. **The shape: the
      infrastructure half is ours and live; the agent half is Hermes's and running.**)*
- [x] **Gap register** — requirement → why nothing covers it → rough size → what it
      depends on. Ordered by what unblocks the most *(2026-10-04 — §3: **20 gaps**, ordered by what
      they unblock. **G-01 the Business Model Kernel** first (depends on nothing), then **G-02
      Business IR + compiler**, **G-03 User Functions**. Sizes XL/L/M/S. **Sixteen of twenty cluster
      in the business-model spine and the data-level security layer. G-15 (RLS) is the only gap that
      depends on nothing.**)*
- [x] Build order — what must exist before what *(2026-10-04 — §4: **Phase 0** the decisions (done)
      → **Phase 1 the spine** (G-01 → G-08 → G-02) → **Phase 2 the security floor** (G-05 → G-04 →
      G-06 → …; RLS parallel) → **Phase 3 the product surface** (G-07 → G-09 → G-03 → G-17) →
      **Phase 4 the hygiene** (G-12, G-18 can start today). **The critical path is four items:
      G-01 → G-02 → G-03.**)*
- [x] The **"do not build"** list — things the vision asks for that we should
      deliberately not build, with the reason *(2026-10-04 — §5: **12 entries**, each carrying the
      decision behind it. DB-01/DB-02 a parallel memory (C-6) · DB-03 a second scheduler (C-3) ·
      DB-04 a skill runtime (C-2) · DB-05 a second MCP client (C-16) · DB-06 a session-search engine
      (C-14) · DB-07 agent-chat adapters (C-11) · DB-08 a second policy kernel (C-17) · DB-09 a
      provider layer (C-8) · DB-10 an agent loop · DB-11 a second auth stack · DB-12 a second event
      bus. **Every one is the *runtime* half of something Hermes runs, or the *second* copy of
      something we run.**)*
- [x] **Critic pass** — challenge the shortcut count. A shortcut that needs a week of
      work is not a shortcut. Name the ones downgraded *(2026-10-04 — §7: **all 20 attacked.**
      **Five downgraded to half-built**: S-02 (the resolver is in `shadow` — the *enforcement* is
      the work), S-09 (the shell is free, the Widget is not), S-08 (the runtime is free, the guards
      are not), S-07 (search is not tenancy-filtered — a hole, not a shortcut), S-04 (skills are
      HOLD). **Two more held for review** (S-13 MCPs, S-20 locales). **13 genuine.** **The batch's own
      limit: every shortcut rests on code we can read, not behaviour we ran** — the dockerised
      instance is what would upgrade them.)*

**Definition of done.** Two honest lists and a build order, with no item resting on an
unverified claim.

**Result.** Two lists, a build order, an exclusion list and a consolidated `V`-register.

**20 shortcuts.** The biggest: **S-01 the agent runtime** (Hermes ships the whole loop), **S-02 our
resolver + hash-chained ledger**, **S-03 38 providers with auxiliary fallback and a local runtime**.
**The shape: the infrastructure half is ours and live; the agent half is Hermes's and running.**

**20 gaps.** **G-01 the Business Model Kernel** (depends on nothing), **G-02 Business IR + the
compiler**, **G-03 User Functions**, then the data-level security layer (G-04…G-06) and the Widget
surface (G-07…G-09). **Sixteen of twenty cluster in the business-model spine and the data-level
security layer. G-15 (RLS) is the only gap that depends on nothing.**

**The build order — four phases, critical path four items long: G-01 → G-02 → G-03.** Phase 0 the
decisions (done) → Phase 1 the spine → Phase 2 the security floor → Phase 3 the product surface →
Phase 4 the hygiene. **G-12 (backup) and G-18 (the scheduler gate) can start today.**

**12 "do not build" entries**, each carrying the decision behind it — **every one is the *runtime*
half of something Hermes runs, or the *second* copy of something we run.**

**The consolidated `V`-register: 23 entries — 16 KEEP, 7 HOLD, 0 DROP** (batch 7's V-01…V-13 plus
ten back-filled from batches 1–6, including explanation-as-a-value, the autonomy matrix, the trust
tiers and the UI injection framework).

**Critic pass — all 20 shortcuts attacked; five downgraded to half-built.** **S-02** (the resolver is
in `shadow` — the *enforcement* is the work, not a tidy-up), **S-09** (the shell is free, the Widget
is not), **S-08** (the runtime is free, the guards are not), **S-07** (search is not tenancy-filtered
— a hole, not a shortcut), **S-04** (skills are HOLD). **13 genuine shortcuts survive.** And the
batch's own limit: **every shortcut rests on code we can read, not behaviour we ran** — the
dockerised instance is what would upgrade them.

**The one-line answer: the platform half is bought, the agent half is borrowed, and the *product*
half — the model spine and the data-level security — is neither, and must be built.**

---

# Batch 12 — The development plan

**Question.** What do we build, in what order, to get from where we are to the vision?

**This is the deliverable the whole programme exists for.**

**Inputs.** Everything, especially batches 11 and 10.

**Output.** `findings/12-development-plan.md`, plus updates to the project's own documents.

**Tickboxes**
- [x] **The plan** — phases, each with a definition of done and a way to test it
      *(2026-10-04 — §2: **four phases** (0 done). Phase 1 the spine · Phase 2 the
      security floor · Phase 3 the product surface · Phase 4 the hygiene. Each carries a
      **definition of done** and a **way to test it** — the decisive two being the **rename
      test** (phase 1) and the **switch-the-model-off test** (phase 3).)*
- [x] For each phase: what it needs from Hermes, what it needs from our platform, and
      what it needs built *(2026-10-04 — §3: a **three-column table**. Phase 1 needs
      **nothing from Hermes** and everything from us to build; phase 2 needs Hermes only at
      the tool boundary; phase 3 is where Hermes's agent runtime earns its keep; phase 4 is
      ours alone.)*
- [x] The critical path — what must happen before what, and why *(2026-10-04 — §4: **four
      items — the kernel specification → G-01 → G-02 → G-03**, G-08 folded into G-01. The
      spec comes first because the vision says so (§29, RQ-140). **Four independent items
      run in parallel**: G-12, G-15, G-18 and the S-02 enforcement wiring.)*
- [x] The first three things to build, stated concretely enough to start *(2026-10-04 —
      §5: **(1) the Business Model Kernel specification** (the gate — a document, not code);
      **(2) G-01 the kernel + G-08**; **(3) G-12 business backup/restore** — the one safety
      item that depends on nothing and must not wait. G-18 and G-15 also start today.)*
- [x] Every decision that is **Ramzi's** to make, listed separately from ours *(2026-10-04
      — §6: split three ways. **6a** the five decided 2026-10-04 (C-1, C-3, C-6, C-11,
      C-15); **6b** seven still open and his (the object list · C-7 secrets confirm · C-18
      RLS confirm · C-8 model default · V-04 ops console · the 7 `V`-HOLDs · the dockerised
      instance); **6c** ours, decided and reported not asked.)*
- [x] What is deliberately deferred, and the trigger that would bring it back *(2026-10-04
      — §7: ten items, each with its **trigger**. The big one: the **dockerised instance**,
      brought back when a claim's truth matters more than the cost of running it.)*
- [x] Update `companai/INDEX.md` — the folder map and the "if you only need one thing" table
      *(2026-10-04 — done: the map now reads **analysis COMPLETE**; the "if you only need one
      thing" table's first row now points at the development plan; the status note is
      current.)*
- [x] Fold the decisions into `compai/planning/` *(2026-10-04 — done: **Q6 closed** (agent
      runtime = Hermes) and a new decisions section in `07-open-questions.md`; a dated entry
      in `CHANGELOG.md` recording the five decisions and the four vocabulary collisions.)*
- [x] Promote any reusable rule into `workspace/COOKBOOK.md` and `LESSONS.md` *(2026-10-04
      — done: **COOKBOOK rule zero-nine** ("measure from the artefact, not the description
      of it", with the two-route rule); **LESSONS L48** ("a capability that exists is not
      coverage") and **L49** ("a number written without measuring it").)*
- [x] Update this plan's status table, and write the closing entry in `LOG.md` *(2026-10-04
      — done: the status table now reads **all 12 DONE**; the closing entry is in `LOG.md`.)*
- [x] **Critic pass** — read the plan as a stranger and name anything asserted without
      evidence *(2026-10-04 — §12: **six claims attacked**; three changes (the spec named as
      the first build item · G-12 stated as parallel not sequential · the "tests not yet
      written" limit stated) and **one limit kept**: every "live and tested" claim is about
      code read, not behaviour run.)*

**Definition of done.** Someone who was not part of any of this can read the plan and
know what we are building, in what order, and why — and can start the first item without
asking a question.

**Result.** The plan, and the documents it changes.

**The plan — four phases, one critical path.** Phase 0 the decisions (done) → **Phase 1 the
spine** (the kernel specification → G-01 → G-08 → G-02) → **Phase 2 the security floor**
(G-05 → G-04 → G-06 → …; RLS parallel) → **Phase 3 the product surface** (G-07 → G-09 →
G-03 → G-17) → **Phase 4 the hygiene** (G-12, G-18, G-19, G-20). **The critical path is four
items long: the kernel specification → G-01 → G-02 → G-03.**

**The first three things to build:** (1) **the Business Model Kernel specification** — the
gate, a document not code (RQ-140); (2) **G-01 the kernel + G-08**; (3) **G-12 business
backup/restore** — the one safety item that depends on nothing. **G-18 and G-15 also start
today.**

**The one-line answer: the platform half is bought, the agent half is borrowed, and the
product half — the model spine and the data-level security — is neither, and must be
built.**

**The documents this batch changed:** `companai/INDEX.md` (analysis complete; the plan
linked from the "one thing" table) · `compai/planning/07-open-questions.md` (**Q6 closed**;
the decisions recorded) · `compai/planning/CHANGELOG.md` (a dated decisions entry) ·
`workspace/COOKBOOK.md` (**rule zero-nine**) · `LESSONS.md` (**L48, L49**) · this plan's
status table (all 12 DONE) · `LOG.md` (the closing entry).

**The reusable rules promoted:** **measure from the artefact, not the description of it**
(COOKBOOK zero-nine, with the two-route rule) · **a capability that exists is not coverage**
(L48) · **a number written without measuring it** (L49).

**The critic pass — six claims attacked, three changes, one limit kept.** The plan's own
honest limits: (1) every "live and tested" claim is about **code read, not behaviour run**;
(2) the phase tests are **named, not yet written**. **And it does not close a decision that
is Ramzi's** — §6b lists seven, open, with recommendations.

**Programme status: COMPLETE — all 12 batches done.** The next work is the specification in
§5 item 1.

---

## Standing questions for every batch

Carried from the project's own rules. Ask them before closing any batch.

- What is the source of truth here?
- Who owns this — us or Hermes?
- What did I assume rather than measure?
- Where did I look, and what did I **not** look at?
- If this conclusion is wrong, what is the most likely reason?
- **Is this serving one of the three focuses?** If not, it does not belong in this batch.
- **What did we find that the vision does not ask for but is worth keeping?** See below.

---

## Standing rule, added by the owner 2026-10-04 — value beyond the vision

> *"If you come across anything in the starting kit, Hermes, or anywhere that provides added
> value to our vision and end product direction you should identify and report that. Just
> because something we have elsewhere is not covered in the vision does not mean we can't
> capitalize on it."*

**What this changes.** The register so far has only asked *"does the target ask for this?"* —
which silently discards anything the target does not mention. That is a real loss: the vision
is a design, not an inventory, and **a capability we already run is cheaper than one we must
build even when the vision is silent about it.**

**The rule, from batch 7 onward.** In every batch, keep a second list alongside the register:
**`V-nn` — value we hold or find that the vision does not ask for.** Each entry states:

| Field | What |
|---|---|
| What it is | One line, in plain English |
| Where it is | File, module, or package |
| Why it is worth keeping | The end-product benefit, stated concretely |
| Status | running and tested · running, untested · present but parked · idea only |
| Risk if adopted | What it would cost, or what it might conflict with |
| Verdict | **KEEP** (use it) · **HOLD** (worth keeping, not yet) · **DROP** (with the reason) |

**Where it goes.** A short `V`-list at the end of each batch report. Consolidated into the
shortcut register (batch 11) as a third list, beside shortcuts and gaps — **so the development
plan can spend it rather than rediscover it.**

**The discipline that keeps it honest.** "Adds value" is a claim, not a feeling. Every `KEEP`
names the end-product benefit in one concrete sentence, and every `KEEP` gets attacked in the
batch's critic pass like everything else. A `V`-entry that cannot survive the critic pass
becomes a `HOLD` or a `DROP` — not a wish list.

**Back-fill.** Batches 1–6 are re-read once, at batch 11, for `V`-entries that were found but
not recorded under this rule. Batch 6's §17c already named three near-misses (the parked
modules, the frozen tests, the parked packages' dependencies); they are re-examined there.

---

## Standing note, added by the owner 2026-10-04 — a local, running instance

> *"We will plan to have a dockerized version that we can test locally on the laptop so you can
> have it fully running with its database. But that you can schedule when the time is right."*

**What this is.** A **future capability**, not a task: a containerised copy of the platform
(and, separately, whatever Hermes needs) so this programme can run the full stack **with a real
database**, on this machine.

**Why it matters to this programme.** It closes the single honest gap in batch 6: **the full
test gate could not be re-run** because no database is reachable here (batch 6 §15, open item
#7). Several batch-6 findings are marked "not proven here" for the same reason — search
tenancy filtering, and the whole integration surface. **A running instance turns those from
"could not measure" into "measured".**

**Status: not scheduled.** The owner holds the timing ("when the time is right"). It is
recorded here so it is not lost and so no batch quietly assumes it already exists. **When it
exists**, the first thing it buys is a re-run of the full gate (22 packages, 12,851 tests), and
after that the integration-level measurements listed above.

**What it is not.** It is not a precondition for batches 7–12. Every batch so far has been
measured from source, and that remains sufficient for the maps; the container upgrades the
*proof*, not the *plan*.
