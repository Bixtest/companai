# The Workspace Architecture Workstream

**What this folder is.** The working documents for the owner's **Message 6** of 2026-10-11: the
architecture of the **user–AI interaction, the Business-IR nugget lifecycle, the widgetized
dashboard and workspaces, threads, collaboration and extensibility** — the layer the owner calls
*"the actual product"*, because *"the quality of the product is judged based on it."*

**Why it is a separate folder.** At the owner's explicit instruction:

> *"For now, lets keep the documentation in a seperate folder so it is easy to reach seperatey
> from other documents, then we untegate and index in another stage."*

So this folder is **self-contained and standalone**. It is *not* yet indexed into
`library/INDEX.md` or `BOOKMARKS.md`; that integration is a deliberate **later stage**. Nothing
here touches `library/development/`'s registers until the owner says so.

**Where the truth of "what we are doing now" lives.** Unchanged from the rest of the project:
the `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md). This folder holds
the **analysis and the plan for one workstream**; it does not compete with the live task box.

---

## 1. RESUME POINT — read this block first when returning

**Written 2026-10-11.** This is a **parking space**, not a roadmap. It says exactly where this
workstream stands so a session can resume without re-deriving anything.

### The exact command to paste to resume

> **Resume the workspace-architecture workstream. Read
> `C:\Users\Ramzi\Downloads\companai\library\workspace-architecture\README.md` §1 (RESUME POINT)
> and `00-RESEARCH-PLAN.md`, then continue at the earliest incomplete batch. Follow the project's
> standing rules: measure before designing (rule 0b), write the combined requirement before code
> (rule 10c), hostile-critic as a separate agent with a command per claim, RED–GREEN mutation
> proof with md5-verified restores, and commit in both repos by explicit path (never `git add -A`).**

### What this workstream is, in one line

Produce a **fully-featured, detailed SRS** for the widgetized user–AI workspace, then **map it
onto what we already have and onto the development plan** — so the build proceeds on solid bases.

### Status at the moment this bookmark was written

| # | Step | Status |
|---|---|---|
| 1 | Bookmark the position (this file) | ✅ **DONE** — this file |
| 2 | Recon the reference systems + docs | ✅ **DONE (B2)** — `02-REFERENCE-SYSTEMS.md`; plus B1 `01-RECON.md` |
| 3 | The batched research plan | ✅ **DONE** — `00-RESEARCH-PLAN.md` |
| 4 | The detailed SRS | 🔄 **B1–B4 done; B5–B9 to go** |
| 5 | Map SRS → current state → development plan | ⬜ not started (B10) |
| 6 | Integrate + index into the rest of the docs | ⬜ **deliberately deferred** (later stage) |

**Batch progress:** **B1 ✅** (recon, measured) · **B2 ✅** (reference systems, verdict) · **B3 ✅** (the
user–AI interaction + the Business-IR display) · **B4 ✅** (the prompt→function lifecycle). **Next: B5**
(naming, menus, grouping, and the organic non-business wiring). Commits: `2064046` (bookmark + plan),
`82f72e8` (B1), `250f6c1` (B2), `7131195` (B3), **`bd4de50` (B4 + the B1 Q3 correction)**.

**RESUME HERE — B5.** The B4 measurement that B5 must build on: the `request-outcome` layer (805 lines,
62 tests, G-21 ✅) already holds `FunctionPlacement` (`types.ts:203`) and `FunctionCandidate` (`:246`) —
*"the built home of Q4's placement"* — and B4 corrected the B1 recon to include it.

### What the recon already established (so the next session does not redo it)

These are **measured facts**, each with its evidence path. They reshape the task from "design a
workspace architecture" into "**turn an already-analysed architecture into a concrete SRS and map
it**":

1. **The vision is already written and enormous.** `library/ai/ai-first/` holds nine documents;
   the one that governs this workstream is
   [`05_Widgetized_Collaborative_Workspace_Architecture.md`](../ai/ai-first/05_Widgetized_Collaborative_Workspace_Architecture.md)
   — **4,826 lines, 74 parts, 224 numbered sections, 40 non-negotiable rules, 8 widget-type
   families, 7 anti-patterns.**
2. **That vision document has already been forensically analysed.** Batch 4 of the analysis
   programme — [`library/analysis/findings/04-vision-workspace.md`](../analysis/findings/04-vision-workspace.md)
   — has already: registered **60 normative statements (N7-01…N7-60)**, mapped the 8 widget
   families, the state model, the `@`/`#` reference system, the collaboration model, and reached
   the verdict on our frontend. **Do not redo this; build on it.**
3. **The verdict it reached, in one sentence:** *our Next.js/React frontend can be the rendering
   layer; the Widget Runtime, Widget IR, Object Registry and `@`/`#` resolver are **new builds**
   that sit above it; and the word "widget" collides with the kit's existing dashboard tile and
   must be disambiguated.*
4. **The `business-widget` layer is already PARTLY BUILT in code.** `packages/shared/src/lib/business-widget/`
   contains `types.ts` (the §10 contract), `ir.ts` (the §33–35 semantic IR), `placement.ts`
   (§160 — **the exact chain the owner described**: Function → Widget), `registry.ts` (§112–114),
   and `document.ts`. Sprint **G-07** built this and it is ticked ✅ in `BACKLOG.md`.
   **Crucially, `placement.ts` names the vision's §160 chain verbatim as "the most important
   reusable chain": `AI request → Business IR → result → Save as Function → Function → Widget →
   Workspace`** — which is precisely the machinery the owner is asking for.
5. **The User Function ("save the prompt as a reusable function") machinery is also partly built.**
   `packages/shared/src/lib/user-function/` holds `run.ts` (`runFunction` — the complete
   bind→compile→execute chain), plus `verify.ts`, `fingerprint.ts`, `lifecycle.ts`, `document.ts`.
   What is missing is not the machinery but **persistence** (no table — `CC-32`, gated on
   **`G-09`**) and **callers** (`CC-59`, the supplementary core queue).
6. **The layer is named in our own development plan.** `library/analysis/findings/12-development-plan.md`
   defines **Phase 3 — the product surface**, whose items are exactly this workstream:
   `G-07` Widget contract/IR/registry (**✅ built**) → `G-09` `@`/`#` reference layer (⬜) →
   `G-03` User Functions (⬜/partial) → `G-17` schema-constrained generation (⬜).
7. **A naming hazard, recorded for a different product.** `compai/brainstorming/Software
   Requirements Specification.md` is an SRS for **"AI Company Operating Platform"** — a *different
   framing* (org structure, AI employees, departments). It is **not** this workstream's SRS. The
   project's own `BOOKMARKS.md` warns that **two different products are called Companai**. Do not
   paste that SRS in here; this workstream needs its **own**, scoped to the workspace layer.
8. **The shared chat the owner linked is narrower than it looks.** `https://share.google/aimode/lRhjjpf2wUBpo0vyr`
   is a Google AI-Mode conversation whose *question* is: *"what do you call the UI
   elements/containers used in frontend to carry and show data pulled from a database or forms
   that insert to the database … Google has a library called material …"* — i.e. a question about
   **UI component libraries** (Material UI and permissive open-source alternatives), not about the
   full workspace architecture. **Measured limitation:** the share page renders only the question
   client-side; the *answer* body did not load for the fetching tool, so its content cannot be
   quoted. It is recorded honestly as **"question known, answer unreachable"** rather than
   guessed at.

### What is genuinely NEW work (the gap this workstream closes)

Distilled from the above: **the vision, the forensic analysis, and half the code already exist.**
What does **not** exist is the artefact the owner asked for:

- **A single, concrete, fully-featured SRS** for the workspace layer — the questions the owner
  asked, answered **in our terms, tied to our code**, not in vision vocabulary. (The vision
  answers them at 4,826-line altitude; the analysis answers *"does it line up"*; neither yet
  answers *"here is the spec we will build, item by item."*)
- **The mapping** from that SRS onto (a) what we already have and (b) the development plan's
  named items — with prerequisites and triggers.
- **The extemporaneous dimensions the owner added that the vision treats thinly:** *threads*
  (saving different workspace threads), *collaboration* (human + AI in one thread), and
  *extensibility* (adding tools/widgets over time) — plus a decision on **which of the three
  reference systems (Buzz / OpenRig / Paperclip) fits best**, and **alternatives**.

---

## 2. The files in this folder

| File | What it is |
|---|---|
| `README.md` | This file — the workstream bookmark and the resume point. |
| `00-RESEARCH-PLAN.md` | The **batches-based research plan** — what each batch reads, produces, and its exit gate. |
| `01-RECON.md` | **B1** — the **recon dossier**: the measured inventory of every code surface this workstream rests on, and a verdict row per owner question. |
| `02-REFERENCE-SYSTEMS.md` | **B2** — the **three reference systems** (Buzz / OpenRig / Paperclip) analysed from their own source, plus the **verdict and alternatives**. |
| `02-SRS-*.md` | The detailed SRS (to be written: B3–B9). |
| `03-MAPPING.md` | The SRS → current state → development plan map (B10). |

---

## 3. The standing rules that bind this workstream

Unchanged from the project. Restated here because this workstream is large and easy to drift:

- **Rule 0** — every claim carries an observation; only the code is evidence.
- **Rule 0b** — **fact-check the code FIRST**; never design before measuring.
- **Rule 10** — build as a **package**: study references → pick points → prove prerequisites
  flawless **in code** → write the combined requirement → execute under the TOTAL quality protocol.
- **Rule 10c** — write the requirement **before** any code.
- **Rule 11** — a decision that is the **owner's** is not ours to close.
- **Rule 13** — when a measurement falsifies a premise, correct it **everywhere it was copied**.
- **Rule 6/7** — update **all** relevant docs in the **same** change.
- **Hostile-critic as a SEPARATE agent, with a command + output per claim.**
- **RED-then-GREEN mutation proof, restores verified by md5.**
- **Never `git add -A`** — stage by explicit path. Commit in **both** repos when both changed.
- **Reply in English, plain words.**

*Created 2026-10-11. Owner: Ramzi.*
