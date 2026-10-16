# The story so far — how this project got here

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**Why I wrote it:** so that I can show I did not just read the documents — I can follow the reasoning. This
is my telling of the arc, forward from the beginning. The project's own forward-telling is
`library/development/JOURNEY.md`; the dated evidence is `JOURNAL.md`.

---

## Act 0 — The idea, and the thing that makes it different (early August 2026)

It began as three brainstorming documents: a comparison of two AI-agent workplace systems, a survey of
freely-available building blocks, and a functional specification written as though the whole product would
be built from scratch.

Then the idea was fixed into **fifteen invariants that everything else must respect** — and, before any
code existed, the decision that has shaped the whole project since:

> **The thing that makes this product different is not the AI. It is the governance layer** — one place
> that decides whether any actor, human or machine, may take any action, and can always explain why.

Four concepts came out of this act and they are still the spine: how much an AI worker may do on its own;
an AI worker's "CV" compiled into runtime permissions; knowledge hashtags as the human syntax of a
machine-readable context graph; and @mentions as universal addressing that carries authority but never
amplifies it.

## Act 1 — Two assessments, and a method earned the hard way

Two candidate platforms were assessed to decide whether to adopt one.

- One assessment examined a very large codebase (1.32 million lines) and forced a new discipline: read the
  **framework** in full, but **sample the product** against a keep/skip list written *before* reading. It
  found a genuine governance layer — approve-first gates, narrow-only mutation policy, model allowlists,
  per-task budgets, working undo and redo across seventy commands.
- The other was the project's own earlier codebase. Verdict: **a good permission kernel with zero AI**,
  despite being called an AI-first framework. A search for `agent`, `charter` or `ai_worker` returned
  nothing.

**Three of the assessor's own findings were corrected during the assessment** — every one a case of
declaring something *absent* by searching for **our** vocabulary instead of **theirs**. That mistake became
a numbered lesson: *judge a concept absent only in the target's vocabulary*. A second forensic pass then
overturned three things the first pass had credited: *a schema is not a behaviour*.

**Why this act matters:** the project's central disciplines were **earned here, from real mistakes**, not
adopted as ideals. That is the difference between a rule you follow and a rule you quote.

## Act 2 — The decision to build, and the platform gets a name (mid-August 2026)

The assessments closed and the decision was taken to build on the Starting Kit rather than adopt a platform
wholesale. The product was named and the codebase rebranded — with the package namespace deliberately
guarded so imports could not break. **The guard worked.** A different thing nobody thought to guard — an
identifier change that invented a legal entity — became a lesson of its own.

The platform came up. Four governance screens were built, and — the recurring shape of this project —
**one of them exposed a capability that did not exist**. Building the surface revealed the floor was
missing. You will meet this pattern again.

## Act 3 — The infrastructure answer (4 October 2026, eight parts in one day)

A single long day answered *where does this run?* and proved it end to end: the deployment path (domains,
directories, databases), two-factor authentication, a backup that was actually verified, the hosting
environment built, and a running trio brought up — from which **five defects fell out**.

The size of this act is the point. The project does not do "set up later". The foundation was proven
before anything was stacked on it — a rule that later became a numbered lesson and the cookbook's
*foundation before stack*.

## Act 4 — The agent study, and the documents get one home (5 October 2026)

A study was completed of the agent system the product must integrate with, and the scattered project
documents were consolidated so a new person has **one place to start**. In the same period the **model
default** was decided: per-tenant policy is the destination, cloud-first is the interim.

**This act is where the handover discipline a newcomer uses today was born.**

## Act 5 — The AI half actually runs (6 October 2026)

The core loop of the product was built and shown working live:

- the AI that emits a **Business IR** from a plain-language request — building it **falsified three of its
  own tests**, and two of the author's errors were caught by that falsification;
- **the three endings a prompt can have** — the owner's core feature set and the product's spine: a
  one-time answer, a model proposal that can only change the database through a gate, or a saved Function;
- the live app-level run went green: a request in, a typed business request out.

Three times in this act a wrong reading was corrected — including the author's own misreading of what "the
three endings" meant. **The corrections are recorded; the habit of recording them is the point.**

## Act 6 — The foundation stops being assumed (6 October 2026) — the turning point

This is the most important act for understanding today's work.

The platform **looked** finished in the guard layer. It was not. The claim "the mutation-guard engine is
live and auto-wired for every module" rested on a chain of facts that were **every one true and the
mechanism dead**: the app imports a generated registry, a build step scans each module for guards to
populate it, and the generated file contained **zero entries**.

The cause was not a wiring failure. It was an **empty-supply** failure — the only modules that shipped
guards were the ones that had been switched off. Which is worse than a wiring failure, because **it looks
identical to a healthy system**.

Fixing it exposed that the real defect was bigger: most routes did not consume the registry at all. They
called a deprecated resolver that silently bypassed it.

**That is why this project has a build order with a "phase 0", and a rule that the foundation gaps close
before anything is stacked on them.** The lesson was numbered: *a file that exists is not a mechanism that
runs*.

In the same act the owner set **how** the migration is to be done: a module-to-core-need mapping with one
explicit decision per module — customise and integrate now, or switch off and park until later — rather
than a blind sweep.

## Act 7 — The grammar underneath (6 October 2026)

With the guard engine understood, the next thing was the **structural permission grammar**: object × verb ×
actor × level. Table, column, relationship, function, widget, agent × read, add, edit, remove, **reference**
× human or AI × straight, review, approval, never.

**The "actor = AI" axis is what makes an integration a first-class citizen rather than a special case** —
one grammar decides a human edit and an agent edit.

Alongside it, a **specifications dictionary** was written: the standard that stops the platform decaying as
it grows. And the tier mapping stopped being hard-coded and became a setting.

## Act 8 — The service map, and the plan documents wired (6 October 2026)

The directive was to document how the integration serves, or is served by, **every** development item,
written for a new developer with no learning curve. Then the owner caught that this map was **not wired
into the plan**: the map named 43 items and the roadmap named the map **zero** times.

Both were measured true and fixed. **The lesson: a register of real absences that no roadmap item points
at is a document, not a plan.**

## Act 9 — The guard migration, one module at a time (October 2026)

Retiring the deprecated resolver, module by module, each with its own proof that the fix is real.

Baseline **198** real call sites across 78 files. Thirteen **enabled** modules were migrated one at a time,
largest cluster first, each proven by deliberately breaking it and watching the right test fail, then
restoring byte-for-byte. **Every enabled module is now retired.** The remaining **106** call sites are all
in **parked** modules — recorded, not migrated, because a parked module's code never runs.

In parallel, the *other* half of the guard story was measured and closed: the write routes that called
**no guard at all**. That sweep ended at **zero unguarded** across all thirty-five enabled modules — and a
hostile critic then found a class the method-based scan could not see: **a GET that writes**. Three were
found; one fixed, two set aside by name as read side-effects.

**A trap from this act worth keeping:** the per-module count and the decrement are not always the same
number. The rule that came out of it is that the before-count is **re-derived on the stashed tree for every
step**, never carried forward from the last write-up.

## Act 10 — The permissions kernel, the classification layer, and the skeleton (late October 2026)

The work moved from "fix the guards" to "finish the architecture skeleton", in the vision's own order:

- the **structure-change gate** — creating a new table or column now *forces* the permissions question,
  applied across every create path, with the decision written into the role's grants atomically;
- the **escalate outcome** — a guard can now say *"allowed, but a person must decide"*, which is treated
  as **not performed**;
- the **metadata registry** — the service that lets the gate *enumerate* what it is gating;
- **data classification** — sensitive fields marked, encrypted at rest, and **masked on every export
  path** (server, client view, and the customer-facing task list);
- **the read layer** — every read permission-filtered at the data layer, on both the AI path and the human
  path;
- **row-level ownership** — you can restrict a person to their own rows;
- **table coverage** — a new table cannot be created un-gated;
- **the AI read path** — masked exactly like a human's export;
- **the AI-user ↔ agent binding** — an AI user can run only the agents bound to it, and only within the
  scope that binding allows;
- **the command contract** — every state-changing action carries its risk, its approval need and its
  idempotency key, recorded on the action log.

**The audit phase was then almost missed entirely**, and the way it was missed is instructive. The
register recorded it as *"never verified in code this round"*. That phrase means *"nobody looked"* — not
*"it is absent"*. Measuring it first (which is the standing rule) found the **whole phase already built**:
a read API, a viewer page, an export, a **hash-chained ledger**, and retention. Two boxes moved because
somebody measured instead of built.

## Act 11 — The workspace gets designed, and the two paths get bound (11 October 2026)

**The owner turned to the thing the product *is*.** He asked the questions behind the product's surface:
how does the user↔AI interaction happen; how does the Business IR show you what is happening; how do we
turn a prompt we commonly need into a saved Function, name it, show it in the menu, and group the
functions; how do we save threads and collaborate in them, human and AI; how do we add tools and widgets as
we go. He was explicit that this is *"the actual product, and the quality of the product is judged based
on it."*

**The decisive recon finding: this was not a blank page.** The governing vision already existed and had
already been analysed. Two of its layers were already in code. The kit already persists threads and
already has an extension system. What was missing was **the wiring between them and the interface**.

**The one structural decision:** build our own workspace layer; **borrow ideas per layer; adopt none of
their protocols, runtimes or datastores**. No core item is delayed by the choice — because nothing of
theirs was adopted as a runtime.

**And the discipline this act added.** Measured on the day: the design workstream was **completely
disconnected** from the build spine — nothing in the spine pointed at it, and nothing in it obeyed the
spine's rules. A design workstream running beside the build spine without a contract is exactly how a dual
path grows a gap. The fix was a written contract with four rules: one live task, one numbering, every plan
item registered, and **no design mistaken for a build**.

## Act 12 — Where it is now (11 October 2026)

Two live tracks, and a spine that owns both:

- **The build track** — the supplementary core queue. Most recently: the Business-IR chain got its first
  real caller (a prompt in, typed request authored, compiled, executed, rows out), the repeat-detection
  signal, and the **shape** of the single typed door to the agent engine.
- **The design track** — the workspace architecture. Eight of ten batches done; the widget architecture
  end-to-end is next.
- **The scoreboard** — 75 of 321 units ≈ 23%, with the honest caveat printed next to it: the percentage
  is real, but the *order* is the real story. The work that is done sits high in the stack; the next work
  must go **down** into the foundation.

The owner's ruling of 2026-10-09 governs the direction: **build order = the vision's order**. Finish the
architectural skeleton before any business capability, and no business-module work until then.

---

## The through-lines — what a newcomer needs to *feel*, not just read

1. **Measure the artefact, never the description of it.** Every major defect in this project's history was
   a document, a label or an import that described a thing that was not there. This one mistake appears in
   at least five different numbered lessons, in different clothes.
2. **A second route, or it is not a finding.** Two genuinely independent measurements, and if they
   disagree, the *disagreement* is the finding. This is the most repeated rule in the project.
3. **The foundation before the stack.** The build order exists because stacking on an unfinished
   foundation is how the guard layer *looked* finished for weeks.
4. **Record the correction, not just the conclusion.** The value of the journal is not the successes; it is
   the places where a confident claim was checked and found wrong — and who found it.
5. **Know-how is captured in the same commit as the work.** A batch that leaves the knowledge base stale
   is not finished.
6. **Nothing that is the owner's is closed by an agent.** A direction counts only when he was asked plainly
   and answered. But when the right answer is clear, take it — consulting too much is its own failure.

**And the single sentence I would leave with anyone joining:**

> The floor is being finished before the walls go up. Every claim in the plan is expected to be
> re-measurable. And historically, **the most confident sentences in the documents have been the ones most
> worth checking.**
