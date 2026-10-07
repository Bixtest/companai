# What we are building

**Read this first. It is the shortest honest description of the product, and it exists so that
nobody — a new person, a new agent, or the owner after a month away — has to reconstruct it from
twenty other documents.**

Everything else in `library/` is either **our own detail** or **someone else's material we studied**.
This page is the one thing that is never out of date, because it is about the *idea*, not the
progress. If any document in this library contradicts this page about *what the product is*, this
page is right and the document needs fixing.

---

## ★ This is source of truth #1 of two

**The project has exactly two sources of truth. Every other document is reached *from* one of them,
inside the section where it matters — never from a list at the bottom.**

| # | The document | It answers | Read it when |
|---|---|---|---|
| **1 — this page** | [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | **What are we building, and why** (the vision and the architecture) | you need the *big picture* before doing anything |
| **2 — the plan** | [`development/BUILD-ORDER.md`](development/BUILD-ORDER.md) (the order) + [`development/BACKLOG.md`](development/BACKLOG.md) (the live status) | **Where are we, what is next, what is incomplete, what needs fixing** | you are about to do a piece of work |

**The rule, and it is the one the owner asked for (2026-10-06):** *a document that is not referenced
from the section of a source of truth where it is relevant is a loose document — and a loose document
is a liability, not an asset.* So throughout this page, each section ends with a **`In depth →`**
line naming the documents that govern **that section**. Those lines are the binding, not decoration.

**Two facts about scope, so this page is not mistaken for a status report:** it is about the *idea*
(this page is stable); it is **not** the status (that moves — go to source of truth #2). §6 below is
a deliberately short snapshot and always defers to the plan.

---

## 1. The product, in one paragraph

**We are building a platform where a business describes what it needs, in ordinary words, and the
platform turns that description into real working software — and then runs that software without
the AI.**

Not a chatbot bolted onto an ERP. Not a governance tool with an AI feature. The AI is the
**builder**. The thing it produces is a **real, deterministic, reusable capability inside the
platform** — a screen, an operation over real data, a report — that behaves like a normal feature of
the product from then on, with **no AI involved in running it**.

That is the whole idea. Everything else is how we make it safe, fast, and honest.

> **In depth →** the product thesis and its 15 unbreakable rules:
> [`../compai/planning/00-product-thesis.md`](../compai/planning/00-product-thesis.md).
> The direction we are building toward (nine documents, read its README first):
> [`ai/ai-first/`](ai/ai-first/). What the platform already does:
> [`../compai/planning/09-starting-kit.md`](../compai/planning/09-starting-kit.md).
> Why this base was chosen:
> [`../compai/planning/08-host-selection-and-migration-plan.md`](../compai/planning/08-host-selection-and-migration-plan.md).
> **The whole planning set, self-indexing** — the thesis, the architecture, the method, and the
> platform evaluations it rests on: [`../compai/planning/README.md`](../compai/planning/README.md).
> **Our own read of that direction** — what the vision says, checked against what we have:
> the vision's frame [`analysis/findings/01-vision-frame.md`](analysis/findings/01-vision-frame.md),
> its model and runtime [`analysis/findings/02-vision-model-and-runtime.md`](analysis/findings/02-vision-model-and-runtime.md),
> and the plan the whole analysis programme produced
> [`analysis/findings/12-development-plan.md`](analysis/findings/12-development-plan.md).

---

## 2. Why this is not just "an ERP with AI"

There are three well-known ways to build business software. Ours is a fourth.

| | Who builds the feature | What runs later | Cost of the feature |
|---|---|---|---|
| **Classic modular ERP** | The vendor. | A fixed feature. | You wait for the vendor, and you use what everyone else uses. |
| **A normal AI assistant** | Nobody — the user asks every time. | An AI answer. | You pay for an AI call **every single time**, forever. |
| **No-code / low-code builder** | A power user, by hand. | A built artifact. | Only expert users can use it, and the AI is not involved. |
| **This platform (ours)** | **The user, with AI help.** | **A real, reusable capability — no AI.** | **The AI call happens once. Then it is ordinary software.** |

The last row is the point. When someone needs something the platform does not do yet, the AI helps
them build it **once**. The platform checks it, the person confirms it is what they meant, and it is
**saved as a permanent capability**. From that moment on it is part of the product — fast, free to
run, available to everyone allowed to use it — and the AI is no longer in the loop.

**This is how the platform grows without getting more expensive as it grows.** It is also how it
replaces the classical idea of "modules": instead of a vendor shipping folders of features, the
platform **compiles** the businesses' actual needs into features.

> **The north star, in one line:** the business model is the source of truth, and the platform
> continuously turns it into working software.

> **In depth →** why the classical module model is being replaced, and how the platform's core is
> **kept uncustomisable so it cannot collapse**:
> [`development/CORE-BOUNDARY.md`](development/CORE-BOUNDARY.md) (the three rings).
> The industry module baseline mapped to ours, measured honestly:
> [`development/CORE-MODULES-REGISTER.md`](development/CORE-MODULES-REGISTER.md).
> What we scanned in upstream Paperclip before rejecting it — governance and the human boundary
> [`paperclip-value-study/findings/01-governance-and-the-human-boundary.md`](paperclip-value-study/findings/01-governance-and-the-human-boundary.md),
> the work system [`paperclip-value-study/findings/02-the-work-system-and-execution.md`](paperclip-value-study/findings/02-the-work-system-and-execution.md),
> money and operations [`paperclip-value-study/findings/03-money-and-operations.md`](paperclip-value-study/findings/03-money-and-operations.md),
> org agents and training [`paperclip-value-study/findings/04-org-agents-and-training.md`](paperclip-value-study/findings/04-org-agents-and-training.md),
> extensibility and isolation [`paperclip-value-study/findings/05-extensibility-and-isolation.md`](paperclip-value-study/findings/05-extensibility-and-isolation.md),
> the ideas left unbuilt [`paperclip-value-study/findings/06-the-unbuilt-ideas.md`](paperclip-value-study/findings/06-the-unbuilt-ideas.md),
> and the six things worth acting on [`paperclip-value-study/findings/07-synthesis.md`](paperclip-value-study/findings/07-synthesis.md).

---

## 3. The loop that makes it work

This is the single most important mechanism in the whole product. Everything we build is either
part of this loop, or protection around it.

```
   a person has a need
          |
          v
     the AI understands it
          |
          v
   the AI writes a BUSINESS IR          <- a typed, business-level request
          |                                (not SQL, not code)
          v
   the platform VALIDATES it             <- deterministically, against the real
          |                                business model and the real rules
          v
     it RUNS, safely
          |
          v
   the person looks at the result
          |
          +---------------------+---------------------+
          |                     |                     |
          v                     v                     v
    ONE-TIME ANSWER      A MODEL PROPOSAL      SAVED AS A FUNCTION
    "just answer me"     "I need new           "yes, that is right"
          |              structure"                   |
          |                     |                     v
          |                     v              durable, versioned,
          |              goes through the      reusable - and from
          |              SAME gate as any      now on it runs with
          |              other change:         ZERO AI (fast, free,
          |              validate -> impact    ordinary software)
          |              -> approve -> migrate
          |                     |
          v                     v
     nothing is saved     a person approves
     (the answer was      it, or it does not
     the deliverable)     happen at all
```

**The two rules the picture is really drawing:** a one-time answer **saves nothing**; a model proposal
**never changes the database on the AI's own initiative** — it goes through the same validate → impact →
approve → migrate gate as any other change, and without a person's approval it does not happen.

**Not every prompt becomes a permanent Function — there are three endings, and the platform
chooses which with the person.** That distinction is the owner's, and it matters: a saved Function
is the *rarest* of the three, not the default. A question that only needs an answer is answered and
forgotten; a need that asks for new structure (a new field, a new entity, a whole new service like
LMS or CRM) goes down the same careful change path as anything else and **never happens on the AI's
own initiative**; only a need that has been walked to *provably correct* is offered as a Function to
save. See [`development/ARCHITECTURE-request-outcomes.md`](development/ARCHITECTURE-request-outcomes.md)
for how the three are told apart and what gates each one.

**Two words you will see constantly, and what they mean in plain English:**

- **Business IR** — a *typed business request*. It says "list these orders, for this customer, over
  this period, sorted this way" in a fixed, checked shape. It is deliberately **not** SQL and **not**
  code. The AI is allowed to produce *this* and nothing lower-level. This is the wall between "the
  AI guessed something" and "the database changed".
- **Function** — a *saved, reusable business operation*. It is what a need becomes once it has been
  validated and confirmed. A published Function runs **without any AI**, and it carries what it
  needs to keep working (its IR, its parameters, the version of the business model it was built
  against).

**Why the IR matters so much.** If you let an AI write SQL (or JavaScript) straight at your
database, then a hallucination *is* a data corruption, and you can never cache, version, or reason
about what it did. By making the AI produce a **typed business request** instead, we get three
things at once: the request can be **checked** before it runs, it can be **saved and reused**, and
it can **survive a change to the database** — because the business meaning is stored, not the
SQL.

> **In depth →** the three endings and the gate on the dangerous one, in full:
> [`development/ARCHITECTURE-request-outcomes.md`](development/ARCHITECTURE-request-outcomes.md)
> (this is `G-21`, the owner's core features_pack). The plan that built it:
> [`development/PLAN-G21-request-outcomes.md`](development/PLAN-G21-request-outcomes.md).
> The product specification the loop is gated
> against: [`development/SPEC-business-model-kernel.md`](development/SPEC-business-model-kernel.md).
> The plan for the missing front half (the AI that emits the IR):
> [`development/PLAN-G17-ir-generation.md`](development/PLAN-G17-ir-generation.md).
> The standard every change to this loop is checked against:
> [`development/SPECIFICATIONS-DICTIONARY.md`](development/SPECIFICATIONS-DICTIONARY.md).
> **Our own read of the vision this loop comes from** — what exists, inventoried
> [`analysis/findings/00-inventory.md`](analysis/findings/00-inventory.md);
> the runtime and data the loop rests on
> [`analysis/findings/03-vision-runtime-and-data.md`](analysis/findings/03-vision-runtime-and-data.md);
> the security kernel that guards the gate
> [`analysis/findings/05-vision-security-kernel.md`](analysis/findings/05-vision-security-kernel.md);
> where the parts overlap and who owns what
> [`analysis/findings/09-overlap-matrix.md`](analysis/findings/09-overlap-matrix.md) and
> [`analysis/findings/10-contested-ownership.md`](analysis/findings/10-contested-ownership.md).

---

## 4. What the platform actually is, once it is built

Five pieces. Four of them already exist in some form; the fifth is the one we are working toward.

1. **The business model (the authority).** A single, versioned, typed description of what the
   business *means* — its entities, fields, relationships, rules. It is the source of truth. It is
   a **view over** what the platform already declares, so there is never a second, competing copy.
2. **The Business IR and the compiler.** The typed request the AI produces, and the thing that turns
   it into a real database operation — validating it against the business model as it goes.
3. **Functions.** Saved, validated, reusable operations that run with **no AI**. This is the
   product's distinctive feature.
4. **Widgets and workspaces.** The surfaces a person actually sees and uses — general-purpose
   building blocks you can place, connect and reuse, rather than fixed screens.
5. **The AI, as the builder.** The agent that understands a need and produces the IR that becomes a
   Function. *(This is the part still being wired in — see §6.)*

Around all five sits **governance and security**: who may see what, what an AI is allowed to do on
whose behalf, and a record of everything that happened. That part is not the product — it is the
floor the product stands on. It is already largely built.

> **In depth →** how the three big pieces (platform, Hermes agent runtime, model server) run
> together: [`development/ARCHITECTURE.md`](development/ARCHITECTURE.md). How agents attach and the
> runtime boundary: [`development/ARCHITECTURE-hermes-integration.md`](development/ARCHITECTURE-hermes-integration.md).
> How models attach: [`development/ARCHITECTURE-model-server-integration.md`](development/ARCHITECTURE-model-server-integration.md).
> The agent half (AI staff, roles, delegation, answerability):
> [`development/AGENT-HALF.md`](development/AGENT-HALF.md). What the AI may do to the platform's own
> structure: [`development/ARCHITECTURE-structure-permissions.md`](development/ARCHITECTURE-structure-permissions.md).
> Governance end to end: [`../workspace/knowledge/authority-overview.md`](../workspace/knowledge/authority-overview.md).
> **How the platform actually works, as a self-indexing set** — the governance layer and every
> mechanism under it: [`../workspace/knowledge/README.md`](../workspace/knowledge/README.md).
> **What we learned from the agent study** — how Paperclip is built
> [`paperclip-hermes-study/findings/01-paperclip-architecture.md`](paperclip-hermes-study/findings/01-paperclip-architecture.md),
> its agents [`paperclip-hermes-study/findings/02-paperclip-agents.md`](paperclip-hermes-study/findings/02-paperclip-agents.md),
> tasks and delegation [`paperclip-hermes-study/findings/03-paperclip-tasks-and-delegation.md`](paperclip-hermes-study/findings/03-paperclip-tasks-and-delegation.md),
> collaboration [`paperclip-hermes-study/findings/04-paperclip-collaboration.md`](paperclip-hermes-study/findings/04-paperclip-collaboration.md),
> triggers [`paperclip-hermes-study/findings/05-paperclip-triggers.md`](paperclip-hermes-study/findings/05-paperclip-triggers.md),
> the Paperclip–Hermes gateway [`paperclip-hermes-study/findings/06-paperclip-hermes-gateway.md`](paperclip-hermes-study/findings/06-paperclip-hermes-gateway.md),
> Hermes capabilities verified [`paperclip-hermes-study/findings/07-hermes-capabilities-verified.md`](paperclip-hermes-study/findings/07-hermes-capabilities-verified.md),
> adding an agent to a live thread [`paperclip-hermes-study/findings/08-new-agent-into-existing-thread.md`](paperclip-hermes-study/findings/08-new-agent-into-existing-thread.md),
> how the sibling project did it [`paperclip-hermes-study/findings/09-aissistant-integration.md`](paperclip-hermes-study/findings/09-aissistant-integration.md).
> **Our own read of the vision's model/runtime and workspace** —
> [`analysis/findings/04-vision-workspace.md`](analysis/findings/04-vision-workspace.md),
> and what Hermes already does [`analysis/findings/07-hermes-capability-map.md`](analysis/findings/07-hermes-capability-map.md)
> and [`analysis/findings/08-hermes-fact-check.md`](analysis/findings/08-hermes-fact-check.md).

---

## 5. What this platform is *not*

Said plainly, because the mistakes are easy to make:

- **It is not a governance platform with AI attached.** Governance is required, but it is not the
  point. The point is *building working software from a business description*.
- **It is not our own copy of Paperclip.** Paperclip is a *study subject*. We read it to learn, and
  we deliberately reject most of it. Reading it is never a reason to change what we are building.
- **It is not the sibling project that is also called "Companai".** That is a different product, on a
  different base, with the same name. Its documents live in `library/ai/` **only** for lessons. Never
  inherit its decisions.
- **It is not a fixed set of modules.** Modules are the thing we are replacing. The platform should
  be able to grow a new capability from a conversation, not wait for a release.
- **The AI does not run the business.** The AI **builds**, once. The business runs on deterministic
  software. A published Function must never call a model at runtime.

> **In depth →** the two traps this section guards against are written up in full: the **two-products-
> called-Companai** trap — [`ai/README.md`](ai/README.md); and *what of upstream Paperclip is worth
> taking, and what is deliberately rejected* —
> [`paperclip-value-study/findings/07-synthesis.md`](paperclip-value-study/findings/07-synthesis.md).
> The lessons from the agent study:
> [`paperclip-hermes-study/findings/10-lessons-and-target-design.md`](paperclip-hermes-study/findings/10-lessons-and-target-design.md).

---

## 6. Where we actually are (as of 2026-10-06)

Kept short, and kept honest — the authoritative, always-current version is
[`development/BACKLOG.md`](development/BACKLOG.md).

- **The business model, the Business IR, the compiler, and Functions are built and proven.** The
  decisive test — *"switch the AI off and run a saved Function"* — passes by two independent routes.
- **The Widget chain is built.** A published Function, placed into a Widget, runs from that Widget's
  own inputs with **no AI**.
- **The one missing join is the AI that produces the IR.** Today the AI's only path to data is
  writing JavaScript against the API. Wiring it to produce the Business IR instead is a **named,
  startable item** — `G-17`, "schema-constrained generation".
- **The stack runs.** Eight containers, healthy, on the owner's machine.

> **What the base already does, measured:** the starting-kit's capabilities, mapped —
> [`analysis/findings/06-starting-kit-capability-map.md`](analysis/findings/06-starting-kit-capability-map.md).
> **What is free and what must be built:** the shortcut and gap register —
> [`analysis/findings/11-shortcut-and-gap-register.md`](analysis/findings/11-shortcut-and-gap-register.md).

So: the *whole back half* of the loop is real and tested. The *front half* — the AI feeding it — is
the next thing to build.

> **In depth → this section is a snapshot; the live version is source of truth #2.** The order in
> which the remaining foundation is finished: [`development/BUILD-ORDER.md`](development/BUILD-ORDER.md).
> Every item left, in order, with counts: [`development/BACKLOG.md`](development/BACKLOG.md).
> What the Universal Platform Blueprint exposed we had not planned:
> [`development/BLUEPRINT-GAP-ANALYSIS.md`](development/BLUEPRINT-GAP-ANALYSIS.md).
> What is measured and true vs merely present — the module audit:
> [`development/CORE-MODULES-REGISTER.md`](development/CORE-MODULES-REGISTER.md).
> **Every point the platform must have, as one-liners, ticked only when verified in code — the master
> checklist:** [`development/platform_points.md`](development/platform_points.md).
> What happened and when: [`../JOURNAL.md`](../JOURNAL.md). What is blocked:
> [`development/BLOCKERS.md`](development/BLOCKERS.md). What needs the owner:
> [`development/NEEDS-YOU.md`](development/NEEDS-YOU.md).
> **How to actually run and deploy this** — standing the platform up
> [`development/RUNBOOK-platform-server.md`](development/RUNBOOK-platform-server.md) and
> [`development/RUNBOOK-hosting-server-manual.md`](development/RUNBOOK-hosting-server-manual.md);
> the first sprint [`development/RUNBOOK-sprint0.md`](development/RUNBOOK-sprint0.md);
> deploying a site [`development/RUNBOOK-deploying-a-site.md`](development/RUNBOOK-deploying-a-site.md);
> adding a domain [`development/RUNBOOK-adding-a-domain-step-by-step.md`](development/RUNBOOK-adding-a-domain-step-by-step.md).
> The Coolify stand-up, planned and then critiqued:
> [`development/PLAN-coolify-laptop-implementation.md`](development/PLAN-coolify-laptop-implementation.md)
> and [`development/REVIEW-coolify-laptop-architecture.md`](development/REVIEW-coolify-laptop-architecture.md).
> The trail of how we got here: [`development/THREAD-2026-10-05.md`](development/THREAD-2026-10-05.md),
> [`development/BOOKMARKS.md`](development/BOOKMARKS.md), and [`../where_we_left.md`](../where_we_left.md).

---

## 7. How to use this library — and how **not** to

The library holds two very different kinds of thing, and mixing them up has already caused real
errors. Read them differently.

### (a) Our own material — read this to know *what we are building*

These are the documents that **are** the project. Read them first, and treat them as binding.

| Where | What it is |
|---|---|
| [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | **This page.** The product in plain English. |
| [`REFERENCE-REGISTER.md`](REFERENCE-REGISTER.md) | **The map.** Every hand-written document, and the section of a source of truth that reaches it. This is where you check that nothing is loose. |
| [`ai/ai-first/`](ai/ai-first/) | **THE DIRECTION.** The architecture we are actually building toward. Read `README.md` in that folder first. |
| [`development/`](development/) | **The live hub** — the roadmap, the architecture of the running system, the handover, the rules. Start here to *work*. |
| [`analysis/`](analysis/) | Our own 12-batch check of the direction against what we already have. Its own `README.md`, `PLAN.md` and `LOG.md`, with one report per batch under `findings/`. |
| [`paperclip-hermes-study/`](paperclip-hermes-study/) · [`paperclip-value-study/`](paperclip-value-study/) | **Our own two studies** *of* the imported products. Each has its own `README.md`, `PLAN.md`, `LOG.md` and a `findings/` series; each ends in a synthesis. |
| [`../llama/`](../llama/) | Our own analysis of the **model layer** — how we call hosted models, how we run open-weight ones locally, and what the constraints are. Feeds the model-layer items in the plan. |
| [`universal_application_platform_framework_blueprint.md`](universal_application_platform_framework_blueprint.md) | The **Universal Platform Blueprint** — an external standards document we adapt (not adopt). Its four exposed gaps are tracked in [`development/BLUEPRINT-GAP-ANALYSIS.md`](development/BLUEPRINT-GAP-ANALYSIS.md). |
| [`canonical-architecture-v2-hybrid-ai-coolify.md`](canonical-architecture-v2-hybrid-ai-coolify.md) · [`canonical-optimized-windows10-coolify-web-ai-architecture.md`](canonical-optimized-windows10-coolify-web-ai-architecture.md) | Two **canonical architecture candidates** for the deployed shape. |
| [`kit-docs/`](kit-docs/) ([`README.md`](kit-docs/README.md), [`cla.md`](kit-docs/cla.md), [`docs/framework/widget-injection.md`](kit-docs/docs/framework/widget-injection.md)) | The **starting-kit's own documentation** — what the base we build on offers. |
| [`INDEX.md`](INDEX.md) · [`PROVENANCE.md`](PROVENANCE.md) | The library's own index, and where every copied shelf came from. |
| [`development/START-PROMPT.md`](development/START-PROMPT.md) | The prompt that boots a fresh session with the right context. |
| `01-policy-and-plan/` … `16-konsult-product-docs/` | Our product documentation shelves: the policy, the specification, the audits, the product vision. Copied, not hand-written — see [`PROVENANCE.md`](PROVENANCE.md). |

### (b) Someone else's material — consult it **only** when a specific task needs it

This is other projects' documentation and code. It is **evidence and lessons only**. It is never a
decision we inherit, and it is never "ours".

| Where | What it is | The rule |
|---|---|---|
| [`ai/hermes-docs/`](ai/hermes-docs/) | A sibling project's docs (a *different* product, also called Companai) | Lessons and failure modes only. Never decisions. |
| [`ai/hermes-agent-main/`](ai/hermes-agent-main/) | The Hermes agent runtime **source code** | The artefact. Where a document disagrees with it, the code wins. |
| [`ai/paperclip-master/`](ai/paperclip-master/) | Upstream **Paperclip** source | A study subject. We take lessons and reject the rest. |
| [`ai/source-docs/`](ai/source-docs/) | Upstream Paperclip's documentation set | Reference. |
| [`paperclip-hermes-study/`](paperclip-hermes-study/) · [`paperclip-value-study/`](paperclip-value-study/) | **Our own** studies *of* those products | Ours to read — they are the distilled lessons. |

### The rule, in one sentence

> **Read our vision to know what to build. Open the imported material only when a specific feature
> you are building can learn something from it — and then only for that feature, and only as
> evidence.**

Our first impressions of the direction, written before any deep analysis and marked as such:
[`analysis/findings/first-reading-notes.md`](analysis/findings/first-reading-notes.md).

Do not read the imported material "to get context". It is how the actual direction got buried
before. The vision is nine documents; the imported pile is tens of thousands of files. **Ours first,
always.**

---

## 8. If you remember only five things

1. **The AI builds, once. Then normal software runs, forever, with no AI.**
2. **The AI speaks Business IR — a typed business request — never SQL and never code.**
3. **The business model is the source of truth; the platform compiles it into working software.**
4. **Governance is the floor, not the product.**
5. **Our vision is the direction. Imported material is evidence. Never confuse the two.**
