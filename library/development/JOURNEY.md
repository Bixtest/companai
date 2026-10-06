# The journey — how this project got here, in order

**Why this file exists.** `JOURNAL.md` is the full log, but it is written **newest-first** — a
newcomer reading it has to reconstruct the story by reading backwards through two months. This file
is the **forward** version: the arc, the turning points, the reversals, and *why* each decision was
made. Read it once and you can follow a conversation about this project as if you had been here since
day one.

**It is not a replacement for the JOURNAL.** This is the story; the JOURNAL is the evidence — dates,
measurements, commits, and the corrections. Where this file says "turned out to be wrong", the
JOURNAL entry has the exact numbers and who caught it. Every claim here is drawn from the JOURNAL,
`LESSONS.md`, `BUILD-ORDER.md` and `BACKLOG.md`; the file paths are given so you can check, not trust.

**Owner: Ramzi. Written 2026-10-06. The story spans from `compai/brainstorming/` (early August 2026)
to the guard migration in hand today.**

---

## Act 0 — The idea (early August 2026)

It started as three brainstorming documents: a comparison of two AI-agent workplace systems, a survey
of permissively-licensed building blocks, and a functional specification of the product written as if
we would build all of it ourselves. Source: [`../compai/brainstorming/`](../compai/brainstorming/).

Then the idea was turned into four concepts and **fifteen invariants that everything else must
respect** (`compai/planning/00-product-thesis.md` §3, July–August 2026) — numbered `I1`–`I15`, plus one
inserted sub-rule `I1a` (so sixteen headings in the file, fifteen numbered invariants — the count the
rest of the documentation uses):

- **task grades and the autonomy ladder** — how much an AI worker may do on its own;
- the **Worker Charter** — an AI worker's "CV", compiled into runtime permissions;
- **knowledge hashtags** as the human syntax of a machine-readable context graph;
- **@mentions** as universal addressing that carries authority but never amplifies it.

**The thing that makes this product different was decided here, before any code:** it is not the AI.
It is the **governance layer** — one place that decides whether any actor, human or machine, may take
any action, and can always explain why. Everything since is that idea being built and defended.

## Act 1 — Two platform assessments, and a method (early August 2026)

Two candidate platforms were assessed to decide whether to adopt one. This act produced the
project's **assessment method** — because the first attempt was wrong in instructive ways.

- **Assessment 2** examined a very large codebase (**1.32 million lines, 43× the first candidate**)
  and forced a new discipline: separate the **framework** (read in full) from the **product**
  (sampled against a keep/skip list written *before* reading). It found a genuine AI governance layer
  — approve-first gates, ordered narrow-only mutation policy, model allowlists, per-task budgets,
  working undo/redo across 70 commands.
- **Assessment 1** was our own earlier codebase. Verdict **EVOLVE**: a good permission kernel with an
  explanation trace and working delegations — but **zero AI**, despite being called an AI-first
  framework. A repo-wide search for `agent`, `charter` or `ai_worker` returned nothing.

**Three of the assessor's own findings were corrected during the assessment** — every one a case of
declaring something *absent* by searching for our vocabulary instead of theirs. That mistake became
`LESSONS.md` **L7** (*judge a concept absent only in the target's vocabulary*). A second forensic pass
overturned three things the first pass had credited, which became **L8** (*a schema is not a
behaviour*).

**Why this act matters to you:** the project's central disciplines — *measure the artefact, not the
description of it*; *a schema is not a behaviour*; *two routes or it is not a finding* — were all
**earned here**, from real mistakes, not adopted as ideals.

## Act 2 — The decision to build, and the platform gets a name (mid-August 2026)

The assessments were closed and the decision taken to **build on the Starting Kit** rather than adopt
a platform wholesale. The product was named, and the codebase was rebranded (`Open Mercato` →
`Companai`) with the `@open-mercato/*` package namespace deliberately **guarded** so imports could
not break. (That guard worked; a *different* thing it did not occur to guard — an identifier change
that invented a legal entity — became `LESSONS.md` **L41**.)

The platform came up. Four governance screens were built, and — the recurring shape of this project —
**one of them exposed a capability that did not exist**. This is the pattern you will meet again and
again: building the surface reveals the floor is missing.

## Act 3 — The infrastructure answer (4 October 2026, eight parts in one day)

A single long day answered *where does this run?* and proved it end to end. In order:

1. an infrastructure answer, and a defect **whose recorded cause was wrong** (the first of many
   "the written cause was not the real cause" moments);
2. the deployment path proven — **domains, directories, databases, phpMyAdmin**;
3. 2FA verified, the exposed password tested, a WSL cap applied;
4. the hosting environment built, and shown to be real;
5. **a verified backup**, and a model 46% faster;
6. the running trio came up, and **five defects fell out of it**;
7. a specification corrected;
8. the analysis programme closed and a **development hub** opened.

The size of this act is the point: the project does not do "set up later". The foundation was proven
before anything was stacked on it — a rule that later became **L5** (*run the steps in the project's
own order*) and the COOKBOOK's *foundation before stack*.

## Act 4 — The agent study, and the documents get one home (5 October 2026)

A study was completed of the agent system the product must integrate with, and the scattered project
documents were consolidated so a new person has **one place to start**. In the same period the
**model default** was decided: per-tenant policy is the destination, cloud-first is the interim.

This act is where the handover discipline you are using now was born.

## Act 5 — The AI half actually runs (6 October 2026)

The core loop of the product was built and shown working, live:

- **G-17** — the AI that emits the **Business IR** from a plain-language request. Building it
  **falsified three tests** its own declaration had implied, and two of the author's own errors were
  caught by falsifying them.
- **G-21** — **the three endings a prompt can have**: a one-time answer (nothing saved), a model
  proposal (the prompt needs new structure — and it only changes the database through a gate, never on
  the AI's own initiative), or a saved Function (walked to provable correctness, named, grouped).
  This is the owner's core `features_pack` and the product's spine.
- The **live app-level run went green**: request in, Business IR out.

Three times in this act a **wrong reading was corrected** — one of them the author's own misreading of
what "the three endings" meant. The corrections are in the JOURNAL; the habit of recording them is the
point.

## Act 6 — The foundation stops being assumed (6 October 2026)

This is the most important turning point for reading today's work, so it is spelled out.

The platform **looked** finished in the guard layer. It was not. The claim "the mutation-guard engine
is live and auto-wired for every module" rested on the fact that the app imports a generated registry
(`guardEntries`) and a CLI step scans each module's `data/guards.ts` to populate it. **Every part of
that sentence was true, and the mechanism was dead** — the registry file contained
`export const guardEntries: GuardEntry[] = []`. **Zero entries.** This became `LESSONS.md` **L83**
(*a file that exists is not a mechanism that runs*) and the gap **D0**.

Fixing D0 exposed that the real defect was **bigger than the registry**: most routes did not consume
it at all. They called a `@deprecated` resolver that silently bypassed the registry. That is the
**`D2-wide` migration you are standing in the middle of today** — and it is why this project has a
**BUILD-ORDER** with a **Phase 0**, and a rule that the foundation gaps close **before** anything is
stacked on them.

In the same act, the performance of *how* the work is done was examined: the owner set **how** `D2-wide`
is to be done (a module-to-core-need mapping, not a blind sweep), and two test-suite defects were
found and fixed.

## Act 7 — The layer beneath D2-wide: the grammar (6 October 2026)

With the guard engine understood, the next thing was the **structural permission grammar** — object ×
verb × actor × level (S11/S12), the owner's `premium_permissions` idea. Per object (table, column,
relation, function, widget, agent) × verb (read, add, edit, remove, **reference**) × actor
(human/AI) × level (straight/review/approval/never).

**The actor = AI axis is what makes an integration call a first-class citizen** rather than a special
case: one grammar decides a human edit and an agent edit. Alongside it, the **specifications
dictionary** was written — "the standard that stops the platform decaying as it grows" — and `D1`
closed: the tier mapping stopped being code and became a setting.

## Act 8 — The Hermes service map, and the plan documents wired (6 October 2026)

Directive: **document how the integration serves, or is served by, every development item**, written
for a new developer with no learning curve. Built as
[`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md).

Then the owner caught that this map was **not wired into the plan**: the map named 43 items and the
BACKLOG named the map **zero** times, and the core-module register/blueprint items had **no per-item
backlog rows**. Both were measured true and fixed — a `★ Hermes:` marker on every AI-touching item, a
new "core-module gaps" backlog section, and a re-measurable check. **The lesson: a register of real
absences that no roadmap item points at is a document, not a plan.**

## Act 9 — Today: the guard migration, one module at a time (6 October 2026 → now)

`D2-wide` is being retired module by module, each with its own **two-mutation proof**. Done and proven,
in order, with the count each one retired: `entities` (the worked example) → `data_sync` (−19, the
largest enabled cluster) → `dictionaries` (−16) → `dashboards` (−10) → `workflows` (−9) →
`inbox_ops` (−8) → `perspectives` (−8, the first module with **no** `D2-gap`). Baseline **198** real
call sites → **126** today. **20 of the remaining 126 are in ENABLED modules** (`translations` 6,
`planner` 4, `query_index` 4, `auth` 2, `directory` 2, `feature_toggles` 2); **106 are parked** (8
modules, no code change needed — just the record).
The live module is named, and only named, in the **`★ ACTIVE TASK` box at the top of
[`../../JOURNAL.md`](../../JOURNAL.md)**.

> **A trap worth learning from, because it is the project's central discipline in miniature:** the
> per-module *count* and the *decrement* are not always the same number. `entities` measured **3**
> calls, but only **2** were retired inside this chain — the third had been migrated earlier, as the
> worked example. So a chain that subtracts each module's own count gets 198 − 73 = **125**, and the
> measured answer is **126**. The fix is the rule this project runs on: the before-count is
> **re-derived on the stashed tree** for every step, never carried forward from the last write-up.

**What you are walking into, in one line:** a project whose floor is being finished before the walls go
up, where every claim in the plan is expected to be re-measurable, and where the most confident
sentences have historically been the ones most worth checking.

---

## The through-lines (what a newcomer needs to *feel*, not just read)

1. **Measure the artefact, never the description of it.** Every major defect here was a document, a
   label, or an import that described a thing that was not there. `LESSONS.md` **L1, L2, L8, L48,
   L83** are all this one mistake in different clothes.
2. **A second route, or it is not a finding.** Two independent measurements, and if they disagree the
   *disagreement* is the finding. This is the single most repeated rule in the project.
3. **The foundation before the stack.** The build order exists because stacking on an unfinished
   foundation is how the guard layer *looked* finished for weeks.
4. **Record the correction, not just the conclusion.** The JOURNAL's value is not the successes; it is
   the places where a confident claim was checked and found wrong, and *who* found it.
5. **Know-how is captured in the same commit as the work** (COOKBOOK Rule zero-five) — that is why
   [`../../workspace/knowledge/`](../../workspace/knowledge/) exists, and why a batch that leaves it
   stale is not finished.

**Where to go next:** the **`★ ACTIVE TASK` box** (what is being built now) →
[`BUILD-ORDER.md`](BUILD-ORDER.md) (the order and why) → [`BACKLOG.md`](BACKLOG.md) (what is left) →
[`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) (the product in plain English).
