# What we are building

**Read this first. It is the shortest honest description of the product, and it exists so that
nobody — a new person, a new agent, or the owner after a month away — has to reconstruct it from
twenty other documents.**

Everything else in `library/` is either **our own detail** or **someone else's material we studied**.
This page is the one thing that is never out of date, because it is about the *idea*, not the
progress. If any document in this library contradicts this page about *what the product is*, this
page is right and the document needs fixing.

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
          v
   the person says "yes, that is right"
          |
          v
     SAVED AS A FUNCTION                 <- durable, versioned, reusable
          |
          v
   from now on it runs with ZERO AI      <- fast, free, ordinary software
```

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

So: the *whole back half* of the loop is real and tested. The *front half* — the AI feeding it — is
the next thing to build.

---

## 7. How to use this library — and how **not** to

The library holds two very different kinds of thing, and mixing them up has already caused real
errors. Read them differently.

### (a) Our own material — read this to know *what we are building*

These are the documents that **are** the project. Read them first, and treat them as binding.

| Where | What it is |
|---|---|
| [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | **This page.** The product in plain English. |
| [`ai/ai-first/`](ai/ai-first/) | **THE DIRECTION.** The architecture we are actually building toward. Read `README.md` in that folder first. |
| [`development/`](development/) | **The live hub** — the roadmap, the architecture of the running system, the handover, the rules. Start here to *work*. |
| [`analysis/`](analysis/) | Our own 12-batch check of the direction against what we already have. |
| `01-policy-and-plan/` … `16-konsult-product-docs/` | Our product documentation shelves: the policy, the specification, the audits, the product vision. |

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
