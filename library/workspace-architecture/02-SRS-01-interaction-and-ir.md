# 02-SRS-01 — The User–AI Interaction and the Business-IR Display (Batch B3)

**Batch:** B3 of the research plan.
**Status:** first SRS draft for this area — for the owner's review.
**Date:** 2026-10-11.
**Answers:** the owner's **Q1** (*how does the user–AI interaction happen?*) and **Q2** (*how does the
Business IR interact with the user and show what is happening?*).

**Builds on (must not contradict):**
- `library/development/ARCHITECTURE-request-outcomes.md` — the **settled** triage: **three prompt
  endings** (one-time answer · model proposal · saved Function) and the decision **"the user
  decides, the platform proposes"**.
- `01-RECON.md` — the measured code, especially that `runFunction` is the complete chain with **no
  caller** (`CC-59`) and that the IR has **no screen** (`CC-58`).
- `02-REFERENCE-SYSTEMS.md` — the borrowable display principles (Buzz's activity feed; the
  three-way "what needs me now"; Paperclip's status vocabulary).

**Naming.** Throughout this file, **"nugget"** is the owner's word for *one prompt's business-IR
product* (the compiled, executed business operation). The code calls the artefact a
**`BusinessQueryIR`** and its saved form a **`UserFunction`**. I use the owner's word for the
*screen* concept and the code's words for the *objects*.

---

## 1. The problem, stated plainly

*(**Corrected after the hostile-critic pass — finding 1.** The first cut claimed "a person cannot
talk to this platform's AI at all." **That is false**, and the correction changes the premise for
the better: there **is** a working chat surface to build on.)*

### 1a. What exists today (measured)

A live person→AI chat surface **is mounted in the running app**. The chain, measured:

- `apps/mercato/src/components/BackendHeaderChrome.tsx:168` renders `<AiAssistantShellIntegration>`.
- `apps/mercato/src/components/AiAssistantShellIntegration.tsx` (19) wraps
  `packages/ai-assistant/src/frontend/components/AiAssistantIntegration.tsx`.
- which renders **`DockableChat`** (`packages/ai-assistant/src/frontend/components/DockableChat/DockableChat.tsx`),
  backed by a full **`CommandPalette`** — `ToolCallDisplay`, `ToolCallConfirmation`, `MessageBubble`,
  `AgentStatusIndicator`, `CommandInput`, `CommandFooter`, … (**34 files** under
  `packages/ai-assistant/src/frontend/`).

So the platform **already has**: a dockable chat, a command palette, tool-call display and
confirmation, and a message surface. **The honest gap is narrower than "cannot talk to the AI"** —
it is: **the chat is not a workspace.** It has no threads, no persisted business objects, no place
for a saved Function to live, and — most importantly — **it is not wired to the Business-IR
pipeline**: the prompt that would become a `BusinessQueryIR` is not authored, compiled, or executed
by any caller (`CC-58`, `CC-59`).

### 1b. The machinery that exists but no running product reaches

The pipeline that would answer a business question exists and is tested — `authorBusinessQueryIr` →
`compileQuery` → `runFunction` → `engine.query` (`01-RECON.md` §2–§3) — but **nothing in production
calls it**: `CC-58` (no authoring caller) and `CC-59` (no execution caller). The existing chat talks
to the agent runtime; it does **not** yet turn a prompt into a **compiled business operation**.

### 1c. The question this document answers

Not *"how do we make the AI answer?"* — a chat can answer. But: **"what does the person see, and in
what order, from the moment they type a *business* request to the moment they have an answer they
can trust, save, or discard — and how does that differ from an ordinary chat reply?"** That
distinction is the whole point: a chat reply is prose; a **nugget** is a compiled, executed,
**saveable business operation**. This document specifies the second, and it is written **against the
code we have** (including the existing chat) so building it does not require a second pipeline.

---

## 2. The interaction, as a sequence

### 2a. The six moments (the spine of the whole experience)

Every user–AI interaction in the workspace passes through these six **moments**. They are the
screen-states; each names **the code path that produces it** and, where none exists, says
**"to build."**

| # | Moment | What the person sees | Produced by | Status |
|---|---|---|---|---|
| **M1** | **The prompt** | A single input, in the workspace, where they say what they want in plain words. Context chips show *what the workspace is about* (the active thread, the selected record). | to build (the input) | **to build** |
| **M2** | **The authoring** | The nugget **taking shape** — the platform is turning words into a **business operation**, not a chat reply. Shown as a live, resolved-in-business-terms step list: *"Which customers → in the North region → with overdue invoices → total by month."* | `authorBusinessQueryIr` (`business-ir-author.ts:136`) | **built, no caller** (`CC-58`) |
| **M3** | **The gate** | If the request needs a shape the model cannot express: a plain statement — *"This needs a new field / entity; here is the proposal"* — and the request becomes a **model proposal**, not an answer. | the request-outcome triage (`ARCHITECTURE-request-outcomes.md`) | **design settled; not built** |
| **M4** | **The execution** | The operation **running against the database** — verb-object-outcome lines, live. Not a spinner; the actual steps. | `runFunction` → `engine.query` | **built, no caller** (`CC-59`) |
| **M5** | **The result** | The answer, in the right **rendering** — a data grid, a metric, a chart, a form — **in business terms**, with the operation that produced it stated in words. | the Widget layer (`business-widget`); rendering to build | **object model built (G-07); renderer to build** |
| **M6** | **The ending** | The three-way choice the triage already settled: **Answer once** · **Save as a Function** · (if M3 fired) **Review the proposal**. Nothing is saved unless the person says so. | to build (the choice **and the save itself**) | **to build** |

**Design rule D1.** *The six moments are always in this order, and the person can always tell which
one they are in.* The platform never jumps from M1 to M5 with no visible work — the vision's rule
applied to the screen: **"if you didn't show it, it didn't happen."**

### 2b. Where the person actually *is* (the surfaces)

The owner's questions are about the **workspace** and the **dashboard**. Two surfaces, one
interaction:

```
DASHBOARD (the landing surface)
  ├── saved stuff: the Widgets / Functions the person (or their team) saved
  ├── "what needs me": the attention surface (from all three reference systems)
  └── the entry point into a workspace (or a quick prompt box)

WORKSPACE (the doing surface)
  ├── THREADS            — a thread is one conversation-with-work (Q6, B6)
  ├── WIDGETS            — the placed business objects (Q9, B7/B9)
  └── the AI             — the prompt box, the six moments, the nugget display
```

**This document covers the WORKSPACE's AI interaction; the dashboard composition is B5/B9; threads
are B6.** The boundary is stated so the three files do not overlap.

---

## 3. Showing what is happening — the display model (Q2)

### 3a. Borrowed principle, our content

The strongest display answer among the reference systems is **Buzz's agent activity feed**
(`02-REFERENCE-SYSTEMS.md` §1b B-1/B-2). *(**Corrected after the hostile-critic pass — findings 4
and 7.** The first cut said Buzz "reduces **every** event" to one sentence, which is **not** what the
source says. Measured: `VISION_ACTIVITY.md:19–25` presents **verb-object-outcome as the *governing
frame*** — "Every meaningful item is a sentence: **the agent did [verb] to [object] → [outcome]**" —
and `:29` says **"every event the agent can emit lands in exactly one of twelve presentation
classes."** The frame and the taxonomy are **two different things**; the feed does not collapse
everything to one line. The earlier "two altitudes" gloss in §4a also mis-cited Buzz — see §4a.)*

We adopt **two** things from Buzz, kept separate as Buzz keeps them:

- **the governing frame** — a meaningful item reads as *verb → object → outcome*; and
- **the closed taxonomy** — every item belongs to **one** of a small, fixed set of render classes.

Filled with **our** content — not what an *agent* did, but what a **business operation** is doing
**in business terms** — a nugget's execution renders as:

```
✓  Read the requested data — customers in North, overdue invoices        (12 ms)
✓  Grouped by month, summed the outstanding amount                       (3 ms)
✓  Returned 47 rows                                                      (1 ms)
   [ Show the operation ]   [ Show raw rows ]   [ Save as a Function ]
```

**Design rule D2 (the four render classes of a nugget).** Every line a nugget shows belongs to
exactly **one** class — a **closed** set, the same discipline as our `WidgetControl` union:

| Class | What it shows | Example |
|---|---|---|
| **Step** | a stage of the operation, in business words | *"Filtered to the North region"* |
| **Outcome** | the result of a step, leading | *"Returned 47 rows"* |
| **Attention** | something needs the person (a gate, an ambiguity, an error) | *"Which 'North' — sales region or shipping zone?"* |
| **Record** | a reference resolved for the eye | *"ACME Ltd"*, not `cust_8f3…` |

**Design rule D3 (resolve references).** The display **never** shows a raw id, a hash, or SQL. It
shows business names — Buzz's "resolve references, never ids" (§1b B-3), which is also the vision's
Widget rule 5 (*"inputs and outputs are semantic"*).

### 3b. "Never go dark" — the silence rule

From Buzz (§1b B-2), adopted as a rule: **the absence of an event is itself information.** Every
moment has a visible state — *authoring*, *waiting for you*, *running*, *done*, *failed*. There is
no blank panel and no unexplained pause. If the platform is waiting on the model, it says so; if a
step is slow, the step shows as in-progress; if nothing is happening, it says *"waiting for you."*

### 3c. Attention rises; routine recedes

From Paperclip (`02-REFERENCE-SYSTEMS.md` §3a: *"what is happening, does it need me, what do I do
about it"*) and Buzz (§1b B-2: *"failures rise; reads recede"*), adopted as a rule: **salience
tracks consequence.** A read is quiet; a **gate** (M3), an **ambiguity**, a **failure**, or a
**permission refusal** is loud. The one thing a person must never miss is the thing that needs them.

---

## 4. The IR, made visible without exposing internals

### 4a. Two views of the same nugget — the zoom rule

The vision's Widget IR is **semantic** (`ir.ts`: names a *control*, a *source* — never a component,
a query, or SQL). The same applies to what the person sees. A nugget has **two altitudes**:
*(**Corrected — hostile-critic finding 7.** The first cut attributed "two altitudes of the same
truth" to Buzz as its "own framing." It **is** Buzz's phrase (`VISION_ACTIVITY.md:65`), but in the
source it means **polished-vs-raw debugging**, *not* our business-view-vs-compiled-plan split. The
phrase is **borrowed by analogy, not quoted as support**; our two-altitude split is **our** rule,
justified by the vision's own IR-is-semantic rule, not by Buzz.)*

| Altitude | What it shows | For |
|---|---|---|
| **Business view** (default) | The operation in the person's words: *"customers in North with overdue invoices, total by month."* | Everyone. |
| **Inspect view** (on demand) | The compiled operation — the entities, the filters, the group-bys, the **physical binding** it will read. **Still business-shaped**: shows *which table and columns*, **never SQL text**. | The person who wants to be sure; the admin. |

**Design rule D4.** *The business view is always the default; the inspect view is always one click
away and always available before the person commits (saves or runs a write).* This is the
"provenance visible" requirement the vision makes (research analysis §19) answered at the screen.

**Design rule D5 (why no SQL is shown).** The compiled plan's `physical` is a `QueryOptions`, and
the platform's `compileQuery` **emits no SQL** (`01-RECON.md` §3). So showing SQL is not merely
undesirable — **there is no SQL to show** at that layer. The inspect view shows the **semantic
plan** and the **binding**, which is the honest representation of what will run.

**Design rule D5a (the gap D5 must not hide — corrected, hostile-critic finding 2).** "No SQL"
sounds like a safety property; the code is more careful than that. `compile.ts` records
**`NO_SQL_EMITTED` as a declared *gap*** — its own words at the relevant stage: *"there is no SQL to
validate"* — i.e. **SQL safety is unvalidated because no SQL is produced**. That is fine *today*, but
the SRS must state it as a **limit**, not a guarantee: if a future layer ever does emit SQL, the
safety stage that now records a gap must be filled. Do not read D5 as "SQL is safe"; read it as
"SQL does not exist yet, and the compiler says so."

### 4b. Scope is never the user's to set

**Corrected after the hostile-critic pass — finding 3.** The first cut said `CompileContext` was
"the **only** place scope enters." That is **false and it is the dangerous kind of wrong for a
security claim.** Measured, scope enters from **two** places:

1. **`CompileContext = { tenantId, organizationId, userId }`** — passed by the caller from the
   authenticated request; the **IR itself carries no scope** (`business-ir/types.ts:22-23`). This is
   what makes a *request* scoped.
2. **The stored artefact carries its own `tenantId`** — `user-function/types.ts:112` has
   `tenantId: string` on the `UserFunction` itself, and `run.ts:140-148` **enforces it**, refusing
   with `WRONG_TENANT` when the artefact's tenant does not match the caller's. The same is true of
   the Widget placement (`placement.ts:104-105` copies tenant/org onto the placed Widget).

**So the accurate statement is:** *the scope of a **query** comes from the authenticated request
(via `CompileContext`), and the scope of a **saved artefact** is carried on the artefact and
re-checked at run time — and the IR can set neither.* Both channels **fail closed.**

**Design rule D6.** *The person can narrow a query (a filter they choose), but can never widen it
past their own authorization.* The scope is applied by the platform from the authenticated request
**and** the artefact's own `tenantId` is re-checked at execution; if the person asks for data they
may not read, the result is **absence, not a masked value** — the same posture as the security
kernel.

**Design rule D6a (new, from the correction).** *A saved Function is tenant-bound by construction.*
Because the artefact stores its own `tenantId` and `runFunction` refuses a mismatch, moving a saved
Function between tenants is **impossible by design**, not by policy — and the SRS must not treat
"which tenant does this Function belong to?" as an open question.

---

## 5. The three endings, as the person experiences them

The triage is **already settled** (`ARCHITECTURE-request-outcomes.md` Q1: the user decides, the
platform proposes). This section states how each ending **looks**, so the SRS is buildable:

| Ending | What the person sees at M6 | What is stored | Where it then lives |
|---|---|---|---|
| **One-time answer** | *"Answered. Nothing saved."* — with a quiet *"Save as a Function"* still offered. | **nothing** | nowhere; the thread may keep a record of the answer (B6 decides) |
| **Saved Function** | The prompt→save flow: **name it**, give it **parameters**, choose a **destination group** (the menu), set **permissions** — then *"Saved. It now runs without AI."* *(**Citation note — hostile-critic finding 8:** the vision's §45/§61/§40 section numbers are cited **via** `analysis/findings/04-vision-workspace.md` and `ARCHITECTURE-request-outcomes.md`, which quote them directly at the cited lines; this document has **not** opened the 4,826-line Doc 05 itself. The content is sourced; the section numbers are secondary citations.)* | the **validated operation** (the IR) — *not* the prompt, *not* the returned data, *not* SQL | in the **function library**, under its group (B5) |
| **Model proposal** | A **diffable proposal** (`+1 field`, `+1 entity`, `-0`), the impact stated, and a **Review** action. | a **proposal** until approved | `G-21` recognises and gates outcome 2 — **but §7 correction: `G-21` ships no queue and no row yet**; the proposal's *home* is to build |

**Design rule D7 (nothing silently saved).** *No prompt's outcome is persisted without an explicit
person action.* This is the vision's own doctrine (§40) and the owner's memory rule *"answers, not
menus"* turned into a storage rule.

---

## 6. What this document does **not** decide (the owner's calls)

Per rule 11, these are **not ours to close**. Each is stated with a recommendation, for the owner.

| # | Question | Recommendation | Why it is the owner's |
|---|---|---|---|
| **OQ-B3-1** | **Is the AI in the workspace the same AI as the existing `DockableChat`, or a scoped "workspace agent"?** The vision (§75–77, batch 4 §13) describes **three agent scopes** — Global Workspace, Widget, Specialist. *(Note: the existing chat exists; the question is whether the workspace's AI is the same instance scoped differently, or a separate agent.)* | **Reuse the existing chat as the M1 surface; add workspace scoping as a layer.** | It changes the interaction's mental model, which is the product's feel. |
| **OQ-B3-2** | **Does the person see the six moments live, or a summary line?** Buzz shows live; Paperclip summarises. | **Live by default, collapsible to a summary.** | It trades "trust through transparency" against "calm". |
| **OQ-B3-3** | **May a person run a *write* from the workspace** (a business command), or is the workspace read-first for now? | **Read-first for the first build**; writes go through the existing gate, and the vision's Command path, later. | It is a scope-and-safety call, and it touches the write-path gate (`CC-44`). |

---

## 7. How this connects to the code and the plan (preliminary — the full map is B10)

| SRS element | Existing code | Plan item / gap |
|---|---|---|
| M1 the chat surface | **`DockableChat` + `CommandPalette`** (`packages/ai-assistant/src/frontend/`, 34 files; mounted at `BackendHeaderChrome.tsx:168`) | **exists** — extend, don't rebuild |
| M2 authoring | `authorBusinessQueryIr` (`business-ir-author.ts:136`) | **`CC-58`** — no production caller |
| M4 execution | `runFunction` (`run.ts:112`) → `engine.query` | **`CC-59`** — no production caller |
| M5 rendering objects | `business-widget` (`G-07`, ✅ built) | renderer to build (B9) |
| M6 the **choice** + the **save** | **`placeFunction` is NOT the save** *(corrected — hostile-critic finding 2): `placement.ts:64` is explicitly "Pure … no database"; it **transforms** a Function into a Widget and saves nothing* | the **save itself is to build**; persistence is **`CC-32`/`G-09`** *(note: `CC-32` is the **deferred core-flag/delete-guard** row for `UserFunction`; "no persistence" is a **premise it cites**, not its subject — hostile-critic finding 5)* |
| The three endings | `ARCHITECTURE-request-outcomes.md` | **`G-21`** — the taxonomy is recognised and gated; **it ships no queue and no row yet** |
| The workspace screen | — | **no workspace frontend** (B9) |

**The honest headline:** the two things this SRS calls "no production caller" (`CC-58`, `CC-59`) are
**already the first startable items of the supplementary core queue** — so **the nugget pipeline is
buildable before the workspace screen exists**, as a core route, and the screen is a later layer on
top of it. And the **existing `DockableChat`/`CommandPalette` is the surface to extend**, not a
thing to replace. Both points are recorded here so B9 does not re-plan them.

---

## 8. What was read, and what was skipped

**Read:** `01-RECON.md` (full); `02-REFERENCE-SYSTEMS.md` (full);
`ARCHITECTURE-request-outcomes.md` (§1–§3); `business-widget/{types.ts,ir.ts,placement.ts}`
(headers + key exports, from B1); the vision Doc 05 §§ cited via `analysis/findings/04-vision-workspace.md`.

**Skipped, with reason:**
- The **full 4,826-line** vision Doc 05 — its normative statements are already registered as
  `N7-01…N7-60`; B3 cites the registered ones rather than re-reading.
- The **security kernel** (Doc 06) — enters only where the workspace touches it (D6), read in B5/B7.
- **Threads and collaboration** — B6's subject; only the boundary is stated here (§2b).
- The **Widget families and rendering** — B9's subject; only the object model is referenced here.

---

*End of batch B3. This is a first SRS draft for the interaction/display area; it is written to be
corrected. The next batch is B4 (the prompt→function lifecycle).*

---

## 9. Corrected in this file (rule 13)

A **separate hostile-critic agent** verified this document with a command per claim and returned
**eight real findings — all in this document's words, none code defects**. Each corrected in place
above and listed here:

| # | Was | Now | Finding |
|---|---|---|---|
| 1 | §1 "a person **cannot talk to this platform's AI at all**" | **FALSE** — a live `DockableChat` + `CommandPalette` (34 files) is mounted at `BackendHeaderChrome.tsx:168`; the real gap is *"the chat is not a workspace"* | critic 1 |
| 2 | §5/§7 "`placeFunction` supports the save leg" | **FALSE** — `placement.ts:64` is "Pure … no database"; it transforms, it does not save | critic 2 |
| 3 | §4b "the **ONLY** place scope enters is `CompileContext`" | **FALSE** — `UserFunction.tenantId` (`types.ts:112`) is a second channel, enforced at `run.ts:140`; D6a added | critic 3 |
| 4 | §3 Buzz "reduces **every** event" to verb-object-outcome | Buzz has **a governing frame *and* a 12-class taxonomy** (`VISION_ACTIVITY.md:19, 29`); both adopted, kept separate | critic 4 |
| 5 | §7 "M6 save → **`CC-32` — no persistence**" | `CC-32` is the **core-flag/delete-guard** row; "no persistence" is a premise it cites | critic 5 |
| 6 | §5 "the proposal queue (G-21)" | **`G-21` ships no queue and no row yet** — corrected to "to build" | critic 6 |
| 7 | §4a Buzz's "two altitudes" as its own framing | the phrase means **polished-vs-raw debugging**; ours is a **borrowed analogy**, not a quote | critic 7 |
| 8 | §5/§8 vision §§ cited while Doc 05 was **not opened** | labelled as **secondary citations** via the analysis finding | critic 8 |

**Two lessons banked.** (i) *A scoped negative ("no **workspace** surface") must not be escalated
into an absolute one ("cannot talk to the AI **at all**")* — the first is a measurement, the second
is false. (ii) *An "only"/"never" in a security claim must be checked against **every** channel, not
the one the author was looking at.*
