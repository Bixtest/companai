# What this platform is

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**Purpose:** prove I understand what we are building, in my own words, without copying the project's own
documents. Where I quote or cite, it is because the exact wording is load-bearing.

> **How to read this.** This is my understanding, not a status report. For status, the project keeps
> `library/development/platform_points.md` (the scoreboard) and `library/development/BACKLOG.md`. For the
> project's own canonical statement of the idea, read `library/WHAT-WE-ARE-BUILDING.md` — this document
> sits *beside* it, not instead of it.

---

## 1. The one sentence

**We are building a platform that turns a business's ordinary-language description of what it needs into
real working software — and then runs that software without the AI.**

That second clause is the whole product. Not a chatbot attached to an ERP. Not a governance tool with an
AI feature bolted on. The AI is the **builder**; the thing it produces is an ordinary, fast, reusable
capability — a screen, an operation over real data, a report — that behaves from then on like any other
feature of the product, with **no AI anywhere in the running path**.

Everything else the project does is in service of making that safe, fast, cheap, and honest.

---

## 2. Why that is not the normal way to build business software

There are three familiar ways to get a new capability into business software, and this is a fourth.

| | Who builds the capability | What runs afterwards | What it costs forever |
|---|---|---|---|
| **A vendor's ERP** | The vendor. | A fixed feature everybody gets. | You wait for the vendor, and you use what everyone else uses. |
| **An AI assistant** | Nobody — the user asks the same thing again every time. | An AI answer, generated fresh each time. | You pay for a model call **every single time**, forever. |
| **A no-code / low-code builder** | A power user, by hand, skill and patience. | A built artefact. | Only expert users can build, and the AI is not involved. |
| **This platform** | **The user, with the AI helping.** | **A real, reusable capability — no AI.** | **The model call happens once. After that it is ordinary software.** |

The fourth row is the point, and it is why the business model matters. When someone needs something the
platform cannot do yet, the AI helps them build it **once**. The platform checks it. The person confirms
it is what they meant. It is **saved as a permanent capability**. From that moment it is part of the
product — quick, free to run, available to everyone who is allowed to use it — and the AI has left the
loop.

**This is how the platform grows without getting more expensive as it grows.** It also replaces the
classical idea of "modules". Instead of a vendor shipping folders of features, the platform **compiles
a business's actual needs into features**.

My one-line read of the north star: **the business model is the source of truth, and the platform
continuously turns it into working software.**

---

## 3. The loop — the single most important mechanism

If I had to draw the whole product, I would draw this. Everything built so far is either part of this
loop or protection around it.

```
   a person has a need
            │
            ▼
   the AI understands it
            │
            ▼
   the AI writes a BUSINESS IR          ← a typed, business-level request.
            │                             Deliberately NOT SQL. Deliberately NOT code.
            ▼
   the platform VALIDATES it            ← deterministically, against the real business
            │                             model and the real rules. No guessing.
            ▼
   it RUNS, safely
            │
            ▼
   the person looks at the result
            │
   ┌────────┼─────────────────────┐
   ▼        ▼                     ▼
 ONE-TIME  A MODEL PROPOSAL    SAVED AS A FUNCTION
 ANSWER    "I need new         "yes, that's right"
 "just     structure"                │
 answer"        │                    ▼
   │            ▼            durable, versioned, reusable —
   │     goes through the      and from now on it runs with
   │     SAME gate as any      ZERO AI (fast, free,
   │     other change:         ordinary software)
   │     validate → impact
   │     → approve → migrate
   ▼            │
 nothing   a person approves
 is saved  it, or it does not
           happen at all
```

**The two rules the picture is really drawing:**

1. A one-time answer **saves nothing**. The answer *is* the deliverable.
2. A model proposal **never changes the database on the AI's own initiative**. It goes through exactly
   the same validate → impact → approve → migrate gate as any other structural change, and without a
   person's approval it does not happen. Ever.

**Not every prompt becomes a permanent Function.** This is the owner's own refinement and it matters:
a saved Function is the *rarest* of the three endings, not the default. A question that only needs an
answer is answered and forgotten. A need that requires new structure (a new field, a new entity, a whole
new service such as an LMS or a CRM) goes down the careful change path. Only a need that has been walked
to *provably correct* is offered as a Function to save.

### The two words that carry all the weight

- **Business IR** — a *typed business request*. It says "list these orders, for this customer, over this
  period, sorted this way" in a fixed, checkable shape. It is deliberately **not SQL and not code**. The
  AI is allowed to produce *this* and nothing lower-level. **This is the wall between "the AI guessed
  something" and "the database changed."**
- **Function** — a *saved, reusable business operation*. It is what a need becomes once it has been
  validated and confirmed. A published Function runs **without any AI**, and it carries what it needs to
  keep working: its IR, its parameters, and the version of the business model it was built against.

### Why the IR is the hinge

If you let an AI write SQL (or JavaScript) straight at your database, then a hallucination **is** data
corruption — and you can never cache it, version it, or reason about what it did. By making the AI
produce a **typed business request** instead, the platform gets three things at once:

- the request can be **checked before it runs**;
- it can be **saved and reused**;
- it can **survive a change to the database** — because the *business meaning* is stored, not the SQL.

A consequence I find elegant: there is **no SQL to show** at the layer where a person inspects what the
AI did, because the compiler deliberately emits none. What a person can inspect is the semantic plan and
the physical binding — which tables and columns will be read. The compiler even records *"no SQL was
emitted"* as a declared gap rather than pretending SQL safety was validated. That honesty is the house
style.

---

## 4. The five pieces of the finished platform

Four of these already exist in some form. The fifth — the AI as the builder, wired into the running
product — is what is being finished now.

### 4.1 The business model — the authority

A single, versioned, typed description of what the business *means*: its entities, fields, relationships,
rules. It is the source of truth.

The clever part, and the part I would have got wrong without reading the code: **it is a view, not a
store.** It reads what the platform already declares (custom entities, custom field sets, extensions)
and holds **no second copy**. That is what keeps there being exactly one source of truth. There is even
a drift guard that proves the kernel's view equals the installer's view, driven from the same module
set.

Every object in it has a canonical ID built from a strict grammar (`lowercase.segments_like_this`), a
content version, and a declared classification slot. Renames produce a *new version*; an ID is never
rewritten in place.

### 4.2 The Business IR and the compiler

The typed request the AI produces, and the thing that turns it into a real database operation — checking
it against the business model as it goes, stage by stage, with a diagnostic vocabulary that distinguishes
a hard **error** (the compile fails) from a **gap** (the IR is valid but the platform cannot yet serve it,
so the compiler doubles as a measurement of what the platform can do).

Two safety properties worth naming:
- **The IR carries no scope.** There is nowhere in the type to put a `tenantId`. Scope is injected by
  the compiler from the authenticated request, so a request cannot widen its own reach.
- **A saved Function carries its own tenant** and re-checks it at run time, refusing a mismatch. So
  scope is enforced on two independent channels, and both fail closed.

### 4.3 Functions

Saved, validated, reusable operations that run with **no AI**. This is the product's distinctive feature
and it is genuinely built: an eight-state lifecycle (draft → generated → validated → verified →
published → active → deprecated → archived) enforced one step at a time, an objective verification gate
that calls the compiler rather than re-implementing it, content fingerprints that mean renaming a
Function does not invalidate its verification, and a freshness check so a Function survives a change to
the business model underneath it.

The zero-AI claim is structural, not a runtime branch: the function that runs a Function **has no AI
argument, no model client, and nowhere to put one**. There is a test that asserts this at the type level
too.

### 4.4 Widgets and workspaces

The surfaces a person actually sees and uses — general-purpose building blocks that can be placed,
connected and reused, rather than fixed screens. Two objects matter and they are not the same thing:

- a **Function** is *behaviour* — it does something;
- a **Widget** is *interaction* — a typed description of what is shown and how a person interacts with
  it. It holds no data of its own; it points at a Function or an entity.

The placement chain is the vision's own: **AI request → Business IR → result → Save as Function →
Function → Widget → Workspace**.

A subtlety that took me a while: "widget" is a **collision**. The base platform already uses "widget"
for a dashboard tile (a React component). The new object is called **Business Widget** to keep the two
apart, and the kit's rendering object is called an **injection widget**. Anyone who reads a document
using the bare word should stop and check which one is meant.

### 4.5 The AI, as the builder

The agent that understands a need and produces the IR that becomes a Function.

Two things matter here and they are different questions:

- **What engine does the thinking?** Today it is OpenCode. The design says it should become **Hermes**,
  a Python agent runtime, reached through **one typed door** so nothing in the platform talks to an
  engine directly. That door's *shape* has been written; fitting the engine behind it and moving the
  chat onto it is the current work.
- **What does it think on?** A **model server** — llama.cpp running a quantised Qwen2.5-7B locally on
  the owner's machine, reached the same way any other provider is reached. Cloud models are an interim
  option, not the architecture.

**Both are covered in full in [`07-THE-AI-ENGINE-HERMES-AND-LLAMA.md`](07-THE-AI-ENGINE-HERMES-AND-LLAMA.md).**
The short version: Hermes is **not yet the engine** — it is connected, discovering the platform's tools,
and not wired into the product's request path. That gap is the single biggest scheduling fact in the
project.

### 4.6 Around all five: governance and security

This is not the product — it is the **floor the product stands on**, and it is largely built already.
One place decides whether any actor, human or machine, may take any action, and can always explain why.
Every act is checked against every ceiling that applies, and the answer is always the **minimum** of them:
**nothing anywhere can raise a gate.** That one property is what makes the platform safe to hand to an AI.

**And sitting beside all five is the engine that builds them** — Hermes, the reasoning runtime, and
llama.cpp, the local model server it reasons on. That is the sixth piece, it is the one that turns the
loop from a description into something that runs, and it has its own document:
[`07-THE-AI-ENGINE-HERMES-AND-LLAMA.md`](07-THE-AI-ENGINE-HERMES-AND-LLAMA.md).

---

## 5. What I would tell someone this is *not*

Said plainly, because these mistakes are easy to make and this project has been careful to fence them off:

- **It is not a governance platform with AI attached.** Governance is required, but it is not the point.
  The point is *building working software from a business description*.
- **It is not our own copy of Paperclip.** Paperclip is a *study subject*. It was read to learn from, and
  most of it was deliberately rejected. Reading it is never a reason to change what we are building.
- **It is not the sibling project that is also called "Companai."** That is a different product, on a
  different base, with the same name, and its documents sit in the library only as lessons. This trap has
  a named folder (`library/ai/`) precisely because it has bitten.
- **It is not a fixed set of modules.** Modules are the thing being replaced.
- **The AI does not run the business.** The AI **builds, once**. The business runs on deterministic
  software. A published Function must never call a model at runtime.
- **It is not a blank-sheet build.** The platform half is a permanent fork of **Open Mercato 0.6.7**,
  rebranded. The governance layer on top is ours and does not exist upstream.

---

## 6. Where it actually stands (as I found it, 2026-10-11)

This is the part I want to be honest about, because the percentages could easily mislead.

**The AI-first loop — the hard, interesting part — is largely built and proven:**

- the Business Model Kernel, the Business IR, the compiler and Functions exist and pass tests;
- the decisive test — *"switch the AI off and run a saved Function"* — passes, by two independent routes;
- a published Function placed into a Widget runs from that Widget's own inputs with no AI;
- the AI that emits the IR exists (an agent whose only output is a typed IR), and the chain now has its
  first real caller: a prompt goes in, a typed IR is authored, compiled and executed, and rows come out.

**The AI engine is connected but not yet integrated.** Hermes is running as a workbench — it discovers all
21 of the platform's tools, and the local model server answers with a 64K context — but **nothing in the
product's request path reaches it yet**. The chat still talks to the previous engine. Closing that is the
work in hand, and it is documented in full in
[`07-THE-AI-ENGINE-HERMES-AND-LLAMA.md`](07-THE-AI-ENGINE-HERMES-AND-LLAMA.md). Measured on that path:
a CPU-only 7B model ingests the ~15,700-token agent prompt at ~13 tokens per second, so one agent turn
spends about twenty minutes before it generates a token. **"Local-first" is an architecture, not a speed
claim.**

**The platform skeleton underneath is only starting.** The project's own scoreboard reads
**75 of 321 units ≈ 23%**, and its honest headline says the percentage is real but the *order* is the
real story: the work that is done is skewed high in the stack, so the next work must go **down** into the
foundation, not sideways into business modules. The owner ruled on 2026-10-09 that the build order is the
vision's own order — finish the architectural skeleton (identity → tenancy → the policy kernel →
classification → enforcement → audit → the agent gateway) **before** any business capability.

**What is running:** eight containers on the owner's laptop (app, MCP server, the agent runtime, the
model server, OpenCode, Postgres 17, Redis, Meilisearch), and a hosted instance at
`companai.corprorate.com`.

**What is not built yet** (each a real, named gap rather than a vague TODO): a saved Function has no
database row yet (so no delete path and no loading by ID); the data axis — the rule that decides whether
a particular person may read a particular *row* — does not exist; the workspace screen a person would
actually place widgets into does not exist; the one-front-door to the agent engine is only a shape.
Fourteen of the base platform's business modules are **parked** — switched off, not deleted, restorable
by uncommenting one line — which is why the admin dashboard is deliberately empty.

---

## 7. The five things I would want a newcomer to hold onto

1. **The AI builds, once. Then ordinary software runs, forever, with no AI.**
2. **The AI speaks Business IR — a typed business request — never SQL and never code.**
3. **The business model is the source of truth; the platform compiles it into working software.**
4. **Governance is the floor, not the product** — and it works by taking the *minimum* of every ceiling
   that applies, so nothing can raise a gate.
5. **The loop is mostly built; the foundation underneath is not.** Build down, not sideways.

---

## 8. What I read to get here, and what I deliberately did not

**Read:** the vision set in `library/ai/ai-first/` (starting with its README, which is the
design-control document, not an introduction); `library/WHAT-WE-ARE-BUILDING.md`;
`library/development/HANDOVER.md`, `START-PROMPT.md`, `BUILD-ORDER.md`, `platform_points.md`,
`ARCHITECTURE-request-outcomes.md`; `compai/planning/00-product-thesis.md`; the whole
`library/workspace-architecture/` design track including its five SRS batches and the bridge that binds
it to the spine; the project memory under `.workbuddy-ai/memory/`; and the code itself — the kernel, the
Business IR, user functions, business widgets, the guard engine, the authority resolver, and the module
list.

**Not read, on purpose:** the imported study material (`library/ai/hermes-docs/`, `paperclip-master/`,
`source-docs/`) and the two Paperclip study syntheses. The project's own rule is that imported material
is *evidence*, opened only when a specific feature needs it — never "for context". I followed that rule
rather than the temptation to read twenty times more material than our own writing.
