# 00 — The Batched Research Plan

**The owner's instruction that creates this file:**

> *"If needed, create a batches based implimentation plan for your research and use the work rules
> as aplicable in this task."*

**What it is.** A **plan for producing the SRS**, not a plan for producing code. It defines the
batches of *research and authoring* that end in the owner's deliverable — a fully-featured,
detailed SRS for the workspace layer, mapped onto what we have and onto the development plan.

**How it relates to the other two plans.** The project already has a **development plan**
(`library/analysis/findings/12-development-plan.md`, four phases, `G`-items) and a **supplementary
core queue** (`library/development/PLAN-SUPPLEMENTARY-CORE-QUEUE.md`). **This plan produces the
input the owner will feed into those** — it does not replace them, and it builds nothing until the
owner maps it in. So the three nest:

```
THIS PLAN            produces the SRS  ─┐
                                       ├─→ 03-MAPPING.md  ─→  the owner re-sequences
the DEV PLAN         names the items  ─┘                       the development plan
the SUPPLEMENTARY    executes the core
QUEUE                items now
```

---

## 0. The shape, and why batches

The task is large and easy to drift, so it is cut into **batches**, each with a **definition of
done** and an **exit gate** — the same discipline the project's existing analysis programmes use
(`library/analysis/PLAN.md`, `library/paperclip-hermes-study/PLAN.md`). A batch is finished only
when its gate is met, and a batch does **not** begin before the one it depends on has met its gate.

**One property every batch shares, from the work rules: a batch MEASURES before it DESIGNS.**
Rule 0b. The recurring failure mode this plan guards against is writing an elegant spec for
something we already have, or already decided — so **every batch that touches our code or our docs
opens its gate by measuring what exists**, and its output records the measurement.

---

## 1. What the owner asked for, decomposed

The owner's Message 6 contains **eleven distinct questions**. Listing them explicitly is the first
act of the plan, because an SRS that silently drops one is not "fully featured". Each maps to a
batch below.

| # | The owner's question (paraphrased faithfully) | Batch |
|---|---|---|
| Q1 | **How does the user–AI interaction happen?** | B3 |
| Q2 | **How does the Business IR interact with the user and show what is happening?** | B3 |
| Q3 | **How do we convert what is shown into a standard function** — a commonly-needed prompt saved as a *tenant function*, so next time the user runs the saved function instead of re-prompting? | B4 |
| Q4 | **How do we save it, name it, place it in the interface (like a menu), and group functions** (modules-like menu categories and items)? | B5 |
| Q5 | So the wiring is **organic and core, not dependent on a business functionality or a use case**. | B5, B8 |
| Q6 | **How do we save different threads of the workspace?** | B6 |
| Q7 | **How do we collaborate in one thread** — human users, and human + AI users? | B6 |
| Q8 | **How do we add tools and functionalities as we go** to the workspace? | B7 |
| Q9 | **Same for the widgets architecture** (extensibility). | B7 |
| Q10 | **Forensically analyse the three systems** (Buzz / OpenRig / Paperclip) + the shared chat; **decide what fits best, or propose alternatives.** | B2, and B8 (alternatives) |
| Q11 | **Create the best architecture for the widgetized structure** in the dashboard and the workspaces (creating the frontend if it does not exist). | B5, B7, B9 |

Plus the three cross-cutting instructions: **document as you go** (every batch's output is a file in
this folder); **don't gloss over relevant content** (every batch lists what it read and what it
skipped); **keep it in a separate folder** (this folder, integrated later).

---

## 2. The batches

Ordered by dependency. **B1 and B2 have no prerequisites and can run first.**

### B1 — Measure what the platform already has *(no prerequisites)*

**Reads:** the code, not documents. At minimum: `packages/shared/src/lib/business-widget/*`
(`types.ts`, `ir.ts`, `placement.ts`, `registry.ts`, `document.ts`); `packages/shared/src/lib/user-function/*`
(`run.ts`, `lifecycle.ts`, `verify.ts`, `fingerprint.ts`, `document.ts`); `packages/shared/src/lib/business-ir/*`;
`packages/shared/src/modules/dashboard/widgets.ts` and the per-module `widgets/` convention; the
`packages/ui/src/{backend,frontend,primitives}` tree; the `messages` object-link
(`{entityModule, entityType, entityId}` + snapshot) and its empty registry; the UMES spot-injection
system. **Also measure what our 78 `business-ir` + 133 `user-function` + 68 `business-widget` tests
actually prove.**

**Produces:** `01-RECON.md` — the measured inventory, one row per surface, with file path + line +
what it really is.

**Exit gate:** for every one of the owner's eleven questions, the dossier can say **either** "we
already have this, here is the file and the line" **or** "we do not have this — here is how I know
(the search that returned nothing)". No question left unmeasured.

**Why this is first:** rule 0b. The recon already found that `placement.ts` contains the owner's
Q3 chain verbatim — so measuring first is what stops the SRS from specifying machinery that exists.

### B2 — Forensically analyse the three reference systems *(no prerequisites)*

**Reads:** `workspace/platforms/buzz-main.zip` (block/buzz — *"a workspace where humans and agents
build together, on a relay you own"*, Apache-2.0), `openrig-main.zip` (mvschwarz/openrig — *"a
harness wraps a model, a rig wraps your harnesses"*, agent-team YAML, Apache-2.0),
`paperclip-master.zip` (paperclipai/paperclip — *"the app people use to manage AI agents for
work"*, MIT). **Also read what is already written about them:** `library/paperclip-hermes-study/`
(11 batches) and `library/paperclip-value-study/` (7 findings) are **already** a forensic study of
Paperclip — **do not redo them; determine what they leave unasked.** And the shared chat
(`https://share.google/aimode/lRhjjpf2wUBpo0vyr`) — measured to be a question about **UI component
libraries**, whose answer body would not render; record that honestly.

**Produces:** `02-REFERENCE-SYSTEMS.md` — one section per system: what it is, the architectural
principles relevant to **our** workspace layer, what is worth taking, what to reject, and a
**comparison verdict** answering the owner's *"what fits us best"* — plus **alternatives** the
owner invited (*"or suggest different alternatives as you should know the project best"*).

**Exit gate:** each system is described from **its own source**, not from its marketing; the
verdict names **one recommendation** with reasons and at least **two alternatives** with reasons;
and it states plainly which parts of the answer are **already settled** by the two existing
Paperclip studies.

### B3 — The user–AI interaction and the Business-IR display *(needs B1)*

**Answers Q1, Q2.** How a user talks to the platform's AI; what the Business IR *is* from the
person's side; how the platform **shows** what the AI is doing (the nugget's progress, the
execution, the result) without exposing SQL or internals; how a **one-time answer**, a **proposed
model change**, and a **saved Function** are visually distinguished (the "three things a prompt can
become" — already settled in `ARCHITECTURE-request-outcomes.md`, so **read it first**).

**Produces:** `02-SRS-01-interaction-and-ir.md`.

**Exit gate:** every screen state traces to a **real code path** (from B1) — the SRS says which
existing function produces what is displayed; and every state that no code path produces is
labelled **"to build"**.

### B4 — The prompt→function lifecycle *(needs B1, B3)*

**Answers Q3.** The full chain the owner described and the vision's §160 names: **prompt → Business
IR → result → "Save as Function" → a tenant Function that runs again with no AI.** What exactly is
saved (the **IR**, not the data, not the SQL — the vision's own rule); how it is **named**; how it
is **versioned**; how it is **verified** before it may run; what happens when the underlying model
changes (the dependency/impact machinery).

**Produces:** `02-SRS-02-function-lifecycle.md`.

**Exit gate:** the SRS distinguishes **what is built** (`runFunction`, `compileQuery`, the
lifecycle states) from **what is not** (persistence — `CC-32`/`G-09`; a caller — `CC-59`), and the
"save" step is specified against **the machinery that exists**, not imagined machinery.

### B5 — Naming, menus, grouping, and the organic (non-business) wiring *(needs B1, B4)*

**Answers Q4, Q5, and the dashboard half of Q11.** How a saved Function/Widget is **named**; how it
appears in the **interface as a menu item**; how functions are **grouped into module-like
categories**; and — the owner's emphasis — **how the wiring is organic and core, not tied to a
business functionality or a use case.** This is where the **Object Registry** (the vision's
§112–114, already partly built in `registry.ts`) and the **`@`/`#` reference layer** (`G-09`) do
their work, so this batch **must** read the registry code and the `G-09` item.

**Produces:** `02-SRS-03-naming-menus-grouping.md`.

**Exit gate:** the SRS can demonstrate the wiring with a **business-agnostic example** — i.e. it
shows a function created, named, placed in a menu and grouped **without naming any ERP module** —
which is the owner's own test for "core, not use-case."

### B6 — Threads and collaboration *(needs B1, B3)*

**Answers Q6, Q7.** How a workspace **saves different threads**; how **several humans**, and
**humans + AI**, collaborate in one thread. This is where the vision's Parts XI–XIII (three
collaboration levels, human+AI participants, collaborative state vs business state, the two
synchronisation classes) meet our code — so **read `04-vision-workspace.md` §12 first**, then
measure what the kit has (it has a `messages` module, live presence in places, but **no** the
vision's collaboration model).

**Produces:** `02-SRS-04-threads-and-collaboration.md`.

**Exit gate:** the SRS states the **storage and concurrency** decision for each kind of thread
state (collaborative vs business), traces each to code that exists or names it **"to build"**, and
names the **owner decisions** this raises rather than closing them (rule 11).

### B7 — Extensibility: adding tools and widgets over time *(needs B1, B5)*

**Answers Q8, Q9.** How new **tools** and new **widgets** are added to the workspace **as we go**,
by us and (where intended) by a tenant user or the AI. Covers the vision's widget families, the
trust levels, the patch language (§79–81: `ADD_WIDGET` … `PROPOSE_FUNCTION`), the sandbox, and the
**UMES extension system** we already have.

**Produces:** `02-SRS-05-extensibility.md`.

**Exit gate:** the SRS separates **three extension routes** — platform-shipped, tenant-authored,
AI-proposed — and states for each what is allowed, what must be gated, and which existing mechanism
carries it.

### B8 — The decision: reference system + alternatives, reconciled to our plan *(needs B2, B3–B7)*

**Answers the second half of Q10 and closes on Q5.** Reconciles everything into **one
recommendation**: which reference system (or blend) fits, what we borrow, and what it costs — set
against the development plan's named items so the owner can see what a choice *implies*.

**Produces:** `02-REFERENCE-SYSTEMS.md` §verdict (final) + the first draft of `03-MAPPING.md`.

**Exit gate:** the recommendation is **one choice + reasons + alternatives**, never a menu; and it
names, per choice, the **development-plan items it accelerates or delays**.

### B9 — The widget architecture, end to end *(needs B3–B8)*

**Answers the whole of Q11** at final altitude: the **widgetized structure** for the **dashboard**
and the **workspaces**, including *creating the frontend surface if it does not exist*. This is the
**synthesis** batch — the one that turns B3–B8 into the single coherent architecture the owner
called *"the actual product."*

**Produces:** `02-SRS-06-widget-architecture.md`.

**Exit gate:** a reader can name **every part of the workspace** (widget definition, instance,
runtime, IR, renderer, registry, reference layer, threads, collaboration, extension) and for each
say **"we have it (here)" / "we build it (item)" / "we borrow it (Hermes, the kit)"** — the same
three-column discipline the development plan's §3 uses.

### B10 — The mapping and the owner's decisions *(needs all)*

**Answers the owner's closing instruction:** *"Once fully featured detailed srs is created, then we
match that to what we have and map it all within our development plan so we proceed on solid
bases."*

**Produces:** `03-MAPPING.md` — every SRS requirement mapped to (a) the existing code that satisfies
it or (b) a named development-plan item (`G-*`, `CC-*`) with prerequisite and trigger — plus a
**decisions list** for the owner, each stated in the project's reporting standard.

**Exit gate:** every SRS requirement has a **destination** (built / planned item / owner decision);
no requirement is left floating; and the decisions list is complete and each carries a
recommendation and one specific question.

---

## 2b. The two WORKSTREAMS the owner's answers created *(added 2026-10-11)*

The batches above produce **the SRS for the workspace layer**. Two of the owner's answers (DP-02/03 and
DP-13/14) created **two workstreams of their own**, which are **not batches of this SRS** but **separate
analysis programmes** that this plan hands to. They are recorded here, with the sequencing, because the owner
asked for it explicitly: *"make sure all is documented in the right sequence so it gets developed when the
prerequisite is developed"* (DP-12).

### WS-1 — B-perms: the permissions engine *(from DP-04)*

**What it is.** The **two-gate permission engine**: check on the way **in** (*may this user request this?*)
and on the way **back** (*may this user see this outcome?*), engineered to protect without destroying
optimization. Owner-APPROVED as a dedicated workstream.

**Produces:** its own SRS. Its **first requirement is the two-gate rule**; its first measured question is the
*kind* of gate — the fact-check already established that the write path has a feature gate (`metadata.
requireFeatures`) that is **OPT-IN, not default-deny** (`CC-44`), and that the human CRUD **read** path has
**no** per-entity permission filter (`CC-47`). Those two are its opening items.

**Why it must come first:** it is **cross-cutting** — every function, widget, thread and prompt touches it.
It is the **engine** of The Studio (WS-2) and the **prerequisite** of DP-12's tenant-authoring build.

### WS-2 — B-studio: "The Studio" *(from DP-13 + DP-14)*

**What it is.** The owner's named hub: **one place** where **functions, widgets, widget pages and menu items**
are listed and managed the same way, plus a **database editor**, with per-user permissions. It **owns** four
subjects the owner says are one: **ownership · sharing · review · placement** — and the owner's key
distinction: **"allow you to use it" ≠ "post it into your interface"** (auto-posting is a spam risk).

**Produces:** its own SRS. It is the **surface** of WS-1's engine. Its measured starting point is that three
of its four registries **already exist** (`user-function/`, `business-widget/registry.ts`, the B5 menu
projector) — so the Studio is mostly **one view over what exists + the permission model + the database editor**.

### The sequencing (binding — the owner's DP-12 instruction)

```
B1…B10  (this SRS)            ── runs NOW, unaffected
   │
   ├─→ WS-1  B-perms   (the engine: the two gates)
   │        │
   │        └─→ WS-2  B-studio   (the surface: one hub; takes the engine + the 3 registries + the DB editor)
   │                 │
   │                 └─→ the permissions-DEPENDENT builds:
   │                       · DP-12 route 2  (tenant-authored widgets — needs the gates)
   │                       · DP-05 route "yes" (the schema-change build pool — needs the engine)
   │                       · any Studio-native management of the registries
   │
   └─→ (no sequencing dependency) the builds that need NO permissions layer:
         · the wiring (DP-01, first)   · the join (B5)   · route 1 & the AI-propose half (B7)
```

**One rule this fixes:** nothing that depends on *"who may run / save / share / see what"* is built before
**B-perms**. Everything else proceeds. This is the owner's DP-12 answer made concrete.

---

## 3. The dependency graph

```
B1 (measure our code) ─┬─→ B3 ─→ B4 ─→ B5 ─┐
                       │        │        │
B2 (reference systems)─┼────────┼────────┼─→ B8 ─→ B9 ─→ B10
                       │        └─→ B6 ──┤
                       └─────────→ B7 ───┘
```

**Can start immediately:** **B1** and **B2**, in parallel — they share no input.
**Critical path to the SRS:** B1 → B3 → B4 → B5 → B9.

---

## 4. How each batch is run (the work rules, applied to research)

- **Measure, then write** (rule 0b). A batch's first action is a measurement; its output records it.
- **Two routes to every important claim** (rule 4). For a claim about our code, the second route is
  a **different search or a run**, not a re-read.
- **A hostile critic per batch, as a separate agent, demanding a command per claim.** For a research
  batch the critic attacks the **evidence**, not the code: *is this statement supported by the file
  it cites?*
- **A rejected claim is a finding.** If the critic disproves a statement, it is corrected
  **everywhere it was copied** (rule 13) — including this plan, if the plan itself was wrong.
- **Document as you go** (owner's instruction). Each batch writes its file before the next begins;
  nothing is held in a session's head.
- **Never gloss over relevant content.** Each batch file lists **what it read and what it skipped,
  with the reason.**
- **The owner's decisions are not ours to close** (rule 11). Anything a batch cannot settle from
  evidence becomes a line in `03-MAPPING.md`'s decisions list.
- **Commit by explicit path, in both repos when both changed.** Documentation only, so normally the
  docs repo alone — but if a batch measures code and the *code repo* is where the evidence lives,
  that is where the citation points.

---

## 5. The exit gate for the whole workstream

The workstream is done when **all** of these hold:

1. Every one of the owner's **eleven questions** is answered in **our terms**, tied to code or to a
   named plan item — not in vision vocabulary.
2. The **SRS** is complete enough to build from, and a reader can name every part of the workspace
   and its status.
3. The **reference-system verdict** is one recommendation with alternatives.
4. The **mapping** leaves no requirement without a destination.
5. The **owner's decisions** are listed, each with a recommendation and one specific question — **including
   the two workstreams the decisions created (§2b), with their sequence recorded** (the owner's DP-12
   instruction: *"developed when the prerequisite is developed"*).
6. The folder is ready to be **integrated and indexed** — the deferred later stage.

---

*Created 2026-10-11. Owner: Ramzi. Batch statuses live in the session's task list and in each
batch's own file; the resume point is `README.md` §1.*
