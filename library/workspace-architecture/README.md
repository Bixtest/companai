# The Workspace Architecture Workstream

**What this folder is.** The working documents for the owner's **Message 6** of 2026-10-11: the
architecture of the **user–AI interaction, the Business-IR nugget lifecycle, the widgetized
dashboard and workspaces, threads, collaboration and extensibility** — the layer the owner calls
*"the actual product"*, because *"the quality of the product is judged based on it."*

**Why it is a separate folder.** At the owner's explicit instruction:

> *"For now, lets keep the documentation in a seperate folder so it is easy to reach seperatey
> from other documents, then we untegate and index in another stage."*

So this folder was created **self-contained and standalone**, and it stayed that way until the owner's
2026-10-11 instruction to **bridge** it. **It is now bridged** (see below and
[`04-BRIDGE.md`](04-BRIDGE.md)): it is **indexed into `library/INDEX.md` + `INDEX.md`**, and it **does**
touch `library/development/`'s registers — through the bridge, not by editing them freely. The bridge,
not this folder, decides what is written where.

**Where the truth of "what we are doing now" lives.** Unchanged from the rest of the project:
the `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md). This folder holds
the **analysis and the plan for one workstream** — the **batch scoreboard** — and it does **not** carry
a competing "what is next" (bridge rule **BR-1**); it points **into** the box.

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

| # | Step                                        | Status                                                             |
| - | ------------------------------------------- | ------------------------------------------------------------------ |
| 1 | Bookmark the position (this file)           | ✅ **DONE** — this file                                             |
| 2 | Recon the reference systems + docs          | ✅ **DONE (B2)** — `02-REFERENCE-SYSTEMS.md`; plus B1 `01-RECON.md` |
| 3 | The batched research plan                   | ✅ **DONE** — `00-RESEARCH-PLAN.md`                                 |
| 4 | The detailed SRS                            | 🔄 **B1–B8 done; B9 to go**                                        |
| 5 | Map SRS → current state → development plan  | 🔄 **first draft done (B8)** — `03-MAPPING.md`; finalised in B10    |
| 6 | Bridge to the spine + integrate + index     | 🔄 **BRIDGED (B8)** — `04-BRIDGE.md` + `WORKING-RULES.md` rule 16 + the pointer rows; **indexing done** |

**Batch progress:** **B1 ✅** (recon, measured) · **B2 ✅** (reference systems, verdict) · **B3 ✅** (the
user–AI interaction + the Business-IR display) · **B4 ✅** (the prompt→function lifecycle) · **B5 ✅** (naming,
menus, grouping, and the organic non-business wiring) · **B6 ✅** (threads and collaboration) · **B7 ✅**
(extensibility: adding tools and widgets) · **B8 ✅** (the reference-system decision, reconciled to our
plan + the `03-MAPPING.md` first draft + the bridge). **The next batch in the bookkeeping sense is B9**
(the widget architecture, end to end) — **but the live task is whatever the `★ ACTIVE TASK` box says
(rule BR-1); this line is a scoreboard fact, not a competing "what is next."**
Commits: `2064046` (bookmark + plan), `82f72e8` (B1), `250f6c1` (B2),
`7131195` (B3), `bd4de50` (B4 + the B1 Q3 correction), `7634dcb` (README + memory), `72c20e2` (B5,
critic-corrected), `c8c0fdf` (B6, critic-corrected), `6c19925` (owner DP-08), `59afc53` (B7),
`43173e3` (DP-12/13/14 + DP-15), `96e962c` (the two new workstreams), `9b5af4d` (B8), **the bridge =
this change**.

**Owner decisions recorded so far (all in `discussion_points.md`):** DP-01 **wiring first, storage second** ·
DP-02 **show "permissions not checked"** · DP-03 **a schema-change request is a permissions question first** ·
**DP-04 APPROVED — a dedicated permissions-architecture batch**, with the owner's **two-gate rule**: check
permission **on the way in** (may this user *request* this?) **and on the way back** (may this user *see* the
outcome?), engineered to **protect without destroying optimization**. DP-05 (the schema-change "explain and
route" branch ships early; the build pool waits on DP-04) · DP-06 (a recipe may sit in several menu homes but
carries **one** permission set everywhere) · DP-07 (a recipe may open as a page, a panel, or both — chosen per
recipe) · **DP-08 (menu categories are FLAT for now; nesting is a later switch with no recipe re-saved)** ·
**DP-12 (follow the recommendation — tenant authoring behind DP-04 — but SEQUENCE every affected build so it
is built only when its prerequisite exists)** · **DP-13 (it is a permissions question → belongs in "The
Studio"; "allow you to use it" ≠ "post it into your interface")** · **DP-14 (follow the recommendation;
ownership · sharing · review · placement are ONE subject)** · **DP-15 ("The Studio" — one hub for functions,
widgets, widget pages, menu items + a database editor, on the DP-04 engine — raised for approval).**
**DP-09/10/11 (B6's) remain ⏳ open — they live in `owner_answers.md`.**
**The SRS batches B8–B10 are NOT blocked** — they proceed; only permissions-*dependent builds* queue behind
B-perms → B-studio.

**B6's finding B7 must carry:** the kit **already persists threads** (`ai_chat_conversations`,
`ai_chat_conversation_participants`, `ai_chat_messages` — 36 + 2 tests passing) and **already models human
sharing** (roles owner/viewer/commenter; share dialog). The gaps: the **AI is the thread's `agent_id`, not a
participant**; a thread **holds messages, not widgets/objects**; no anchoring/presence/CRDT layer (correct for
now — the vision assigns CRDT only to document-like state). **A thread is a host a Widget can be placed into**
— that is the join B7 and B9 use.

**B7's finding B8 must carry:** the kit **already has a real extension system** — **UMES**, whose taxonomy
enumerates four extension types including `injection-widget` (`packages/cli/src/lib/umes/collector.ts:8`). A
module declares widgets under `widgets/injection/<name>/widget.ts` + a `widgets/injection-table.ts` mapping a
**named spot** to widget ids; a **build-time generator** discovers them and a **runtime loader** resolves,
gates and renders them (11 `spotId` mounts in `AppShell.tsx`, **five** sidebar-scoped). Extension therefore
splits into **three routes**: **Route 1 platform-shipped** (BUILT); **Route 2 tenant-authored** (NEW —
**declarative-only**, because `WidgetIR` has no slot for code, `business-widget/ir.ts:171`); **Route 3
AI-proposed** (the *propose* half built as `FunctionCandidate`; the *apply* half — patch validator + sandbox —
NEW). The one law that makes Route 2 safe: **a widget's audience is an intersection computed per view, not a
grant stored once** — DP-04's two gates are the load-bearing safety property, not a policy.

**⚠️ THE PLAN GAINED TWO WORKSTREAMS (2026-10-11, from the owner's DP-04 and DP-13/14 answers).** They are
**not** batches of this SRS; they are **separate analysis programmes** this plan hands to, with a binding
order (full detail in `00-RESEARCH-PLAN.md` §2b):

- **WS-1 · B-perms — the permissions engine.** The two-gate rule (check in *and* back; protect without
  harming optimization). **APPROVED by the owner.** Cross-cutting; the engine of WS-2. **Opening measured
  items:** the write-path feature gate is **OPT-IN, not default-deny** (`CC-44`); the human CRUD **read**
  path has **no** per-entity permission filter (`CC-47`).
- **WS-2 · B-studio — "The Studio"** (the owner's name). **One hub** where **functions, widgets, widget
  pages, menu items** are listed and managed the same way, **plus a database editor**, with per-user
  permissions. It **owns** the four subjects the owner says are one — **ownership · sharing · review ·
  placement** — with his key distinction: **"allow you to use it" ≠ "post it into your interface"**.
- **The binding sequence:** `B1…B10 (runs now)` → `B-perms` → `B-studio` → the permissions-**dependent**
  builds (DP-12 route 2 · DP-05's build pool). The builds needing **no** permissions layer proceed
  independently: the wiring (DP-01), the join (B5), route 1 & the AI-propose half (B7).

**⚠️ File-collision hazard (learned 2026-10-11).** The owner and the agent both edit files in this folder. An
editor holding an older copy silently overwrote a committed edit once (`discussion_points.md`). **Both
editors must re-read the file from disk before writing, and the agent commits immediately after every edit**
so any loss is recoverable via `git show <commit>:<path>`. **The owner's answers live in `owner_answers.md`
(his file; the agent reads it, never writes it) as well as in `discussion_points.md`.**

**B8's finding B9 must carry:** **the decision is made, and it is additive.** Build our own workspace
layer on our own stack; **borrow ideas per layer, adopt no protocol/runtime/datastore** — Buzz → the
**experience model** (activity feed, grouping, thread lifecycle); Paperclip → the **governance model**
(the self-modification gate, systematic status, consumed-once consent); OpenRig → **two mechanisms**
(SSE, thin-clients-over-one-daemon). **No core item is delayed by the choice** (`02-REFERENCE-SYSTEMS.md`
§9d) — because nothing of theirs is adopted as a runtime. The two items the choice *unblocks* are
**`CC-59`** (a live caller exercises route 3) and **`CC-58` Stage B** (the screen shows a nugget).
**B8 also produced `03-MAPPING.md`** (first draft) — every workspace requirement mapped to
*have-it (path) / build-it (`G-*`/`CC-*` + prerequisite + trigger) / borrow-it (kit/Hermes)*.

### ★ RESUME — but the LIVE task lives in the spine (rule BR-1)

**Per the project's standing rule, this folder carries NO competing "what is next". The live task is the
`★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md)** — which now names **both**
live tracks (the build track `CC-59`, and this design track `B-WS`). **Start there.**

**When the spine's box next calls this workstream, the batch to run is B9** (the widget architecture,
end to end — `02-SRS-06-widget-architecture.md`). Its carry-forwards:

1. **From B8** — the three borrowed layers (Buzz's feed, Paperclip's gate, OpenRig's SSE) are B9's
   **inputs**, not its subject; the widgetized structure itself is **ours to build**.
2. **From B7** — the three extension routes (platform-shipped / tenant-authored / AI-proposed) and the
   **two files a widget is** (`widgets/injection/<name>/widget.ts` + `widgets/injection-table.ts`).
3. **From B6** — a thread is a **host a Widget can be placed into** (`AiChatConversation` + participants).
4. **From B5** — the join: `UserFunction.placement` → `InjectionMenuItem`; `groupId` = path minus its last
   segment; membership confers **no** authority.
5. **The B9 exit gate** (`00-RESEARCH-PLAN.md:206`): a reader can name **every part of the workspace**
   (widget definition, instance, runtime, IR, renderer, registry, reference layer, threads, collaboration,
   extension) and say **"we have it (here) / we build it (item) / we borrow it (Hermes, the kit)"**.
6. **`03-MAPPING.md` §4** names exactly what B9 must fill: the **Q11 row** and **R12's BUILD-IT** detail
   (the frontend workspace surface).

**The bridge (read this before touching either path):** [`04-BRIDGE.md`](04-BRIDGE.md) — the contract
that binds this workstream to `BACKLOG` / `BUILD-ORDER` / `JOURNEY` / `COMPLETION-CALLBACKS` /
`platform_points` / `JOURNAL`, and §4 of which answers the owner's *"which document do I trace?"*.

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

| File                      | What it is                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`               | This file — the workstream batch scoreboard; the **live task** is in [`JOURNAL.md`](../../JOURNAL.md)'s `★ ACTIVE TASK` box (rule BR-1).       |
| `00-RESEARCH-PLAN.md`     | The **batches-based research plan** — what each batch reads, produces, and its exit gate; §2b = the two workstreams the owner's answers created. |
| `01-RECON.md`             | **B1** — the **recon dossier**: the measured inventory of every code surface this workstream rests on, and a verdict row per owner question. |
| `02-REFERENCE-SYSTEMS.md` | **B2** — the **three reference systems** (Buzz / OpenRig / Paperclip) analysed from their own source, plus the verdict; **§9 = B8's final decision**. |
| `02-SRS-01…05-*.md`       | The detailed SRS, **B3–B7** (interaction/IR display · function lifecycle · naming/menus/grouping · threads/collaboration · extensibility). **B9 to go** — `02-SRS-06-widget-architecture.md`. |
| `03-MAPPING.md`           | The SRS → current state → development plan map — **first draft in B8**; finalised in **B10**.                                                  |
| `04-BRIDGE.md`            | **THE BRIDGE** — the binding contract that syncs this workstream with the spine; **§4 answers *"which document do I trace for progress?"***. Read before touching either path. |
| `discussion_points.md`    | The live list of open questions/decisions in plain language — **the document of record**.                                                    |
| `owner_answers.md`        | **The owner's own file** — a safe place to write answers; the agent reads it and never writes it.                                            |

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
- **Rule 16 — the bridge rule** *(added 2026-10-11, at the owner's instruction)* — a parallel design
  workstream is bound to the spine by a **written contract**. Here that contract is [`04-BRIDGE.md`](04-BRIDGE.md):
  **one live task** (BR-1) · **one numbering** `B-WS/Bn`, never a bare `Bn` (BR-2) · **every touched plan
  item registered** in `COMPLETION-CALLBACKS.md` (BR-3) · **a design is never a build** (BR-4). The full
  rule lives in [`../development/WORKING-RULES.md`](../development/WORKING-RULES.md) §16.
- **Rule 6/7** — update **all** relevant docs in the **same** change.
- **Hostile-critic as a SEPARATE agent, with a command + output per claim.**
- **RED-then-GREEN mutation proof, restores verified by md5.**
- **Never `git add -A`** — stage by explicit path. Commit in **both** repos when both changed.
- **Reply in English, plain words.**

*Created 2026-10-11. Owner: Ramzi.*
