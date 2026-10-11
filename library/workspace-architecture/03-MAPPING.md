# 03 — The Mapping: every workspace requirement → what we have, or the plan item that builds it

**Status:** **first draft — begun in B8, completed in B10.** Every row is filled from a measurement
(B1–B7) or a named plan item; **no row is filled from imagination.**
**Date begun:** 2026-10-11.
**The owner's instruction this file answers** (Message 6, verbatim): *"Once fully featured detailed
srs is created, then we match that to what we have and map it all within our development plan so we
proceed on solid bases."*

**How to read it.** Each requirement — drawn from the five SRS drafts (`02-SRS-01`…`02-SRS-05`) and
the owner's seven questions — lands in exactly one of **three columns**, the same three-column
discipline the development plan's §3 uses:

- **HAVE IT (here)** — the code already exists; the path and symbol are named.
- **BUILD IT (item)** — it does not exist; a **named plan item** builds it (`G-*` vision-phase item,
  `CC-*` supplementary-core-queue item), each with its **prerequisite** and **trigger**.
- **BORROW IT (kit / Hermes)** — it exists in the starting-kit or Hermes; we consume it, we do not
  rebuild it.

**The plan vocabulary used here, and why two.** The **vision phases** (`G-01`…`G-20`) live in
`library/analysis/findings/12-development-plan.md`; the **live build queue** (`CC-*`) lives in
`library/development/PLAN-SUPPLEMENTARY-CORE-QUEUE.md` + `COMPLETION-CALLBACKS.md`. Both are named so a
reader can find the item without translating.

---

## §1 — The owner's questions, mapped

*(The owner asked **eleven** questions — `00-RESEARCH-PLAN.md:44`. **Q10** — *"forensically analyse
the three systems and decide what fits best"* — is answered by **B8**, in
`02-REFERENCE-SYSTEMS.md` §5 + §9; it has no SRS row because its product is a **decision**, not a
build. The ten rows below are Q1–Q9 and Q11.)*

| # | The owner's question | Answered in | The decision | Mapped at |
|---|---|---|---|---|
| **Q1** | How does the user–AI interaction happen? | `02-SRS-01` | prompt → triage (**three endings**: one-time answer · model proposal · saved Function) → the user decides | §2 R1, R2 |
| **Q2** | How does the Business IR show the user what is happening? | `02-SRS-01` | Buzz's activity feed (verb·object·outcome) over our IR; 12 render classes; never-go-dark | §2 R3 |
| **Q3** | How do we convert what is shown into a **standard function**? | `02-SRS-02` | the saved `UserFunction`; `canOfferSaveAsFunction` gates it; `runFunction` runs it with **no LLM** | §2 R4, R5 |
| **Q4** | How do we save it, name it, show it in the menu, group it (module-like categories)? | `02-SRS-03` | `UserFunction.placement` → an `InjectionMenuItem` whose `groupId` is the path minus its last segment | §2 R6, R7 |
| **Q5** | Is the wiring **organic and core**, not dependent on a business use case? | `02-SRS-03`; also raised in `02-SRS-05` *(corrected in B8: the first draft said "and every SRS" — only two of the five mention Q5)* | the join is **type-level** (`placement`) on the core `UserFunction`, not per-module code | §2 R6; §3 |
| **Q6** | How do we **save different threads** of the workspace? | `02-SRS-04` | the kit's `AiChatConversation` + participants + messages (persisted) | §2 R8 |
| **Q7** | How do we **collaborate** — human users, and human+AI? | `02-SRS-04` | participants table (owner/viewer/commenter) exists; **AI-as-participant is the gap** | §2 R9, R10 |
| **Q8** | How do we **add tools** to the workspace as we go? | `02-SRS-05` | three extension routes (platform-shipped / tenant-authored / AI-proposed) | §2 R11 |
| **Q9** | Same for the **widgets** architecture? | `02-SRS-05`, and **B9** (`02-SRS-06`) | the widget = the rendering object; three routes; preview + sandbox + trust levels | §2 R12; §4 |
| **Q10** | **Forensically analyse the three systems; decide what fits best, or propose alternatives** | **B8** — `02-REFERENCE-SYSTEMS.md` §5 + §9 | one choice (build ours; borrow ideas per layer) + reasons + alternatives, each reconciled to a plan item | §4 (no SRS row — a decision, not a build) |
| **Q11** | The **widgetized structure** for the **dashboard** and the **workspaces** | **B9** — `02-SRS-06` | *(filled by B9)* | §4 |

---

## §2 — The requirement inventory (first draft)

**R-rows** are drawn from the five SRS drafts. Each names its **SRS source**, its **plan item** (if
any), the **prerequisite**, and the **trigger**. `✅` in the "HAVE / BUILD / BORROW" cell means the
supporting evidence is a measurement in that SRS file.

### R1 — Interaction: prompt → triage → one of three endings

| | |
|---|---|
| **What** | A user's plain-language request is triaged into exactly one of **three endings**: a one-time answer, a model proposal, or a **save-as-Function** offer. *"The user decides, the platform proposes."* |
| **HAVE IT** | ✅ **`request-outcome/triage.ts`** (`triageRequest` `:82`), **`request-outcome/gate.ts`** (`canOfferSaveAsFunction` `:80`), **`request-outcome/types.ts`** (`RequestOutcome` `:51`, `REQUEST_OUTCOMES` `:57`). Measured in B4. |
| **BUILD IT** | ⬜ the **screen** that runs the triage for a person — **`CC-58` Stage B** (trigger: *business work resumes*). **Stage C merged with `CC-59`** (both were the one core caller) and is **DONE 2026-10-11**; its in-chat consumer is **`CC-60`**. |
| **Prerequisite / trigger** | Stage C: none (`CC-57` landed the binding). Stage B: the owner's ruling lifting (business half un-paused). |
| **Source** | `02-SRS-01`; `PLAN-SUPPLEMENTARY-CORE-QUEUE.md` §S1 |

### R2 — Interaction: the AI authors the Business IR (binding-gated)

| | |
|---|---|
| **What** | The model turns a plain-language request into the platform's structured **Business IR**; before the model is asked, the actor's **agent binding** is resolved (fail-closed). |
| **HAVE IT** | ✅ **`business-ir-author.ts`** `authorBusinessQueryIr` — binding-gated (`agent_not_bound`) + scope-threaded, per **`CC-57`** (code `1bb61557`). |
| **BUILD IT** | ✅ **`CC-59` DONE 2026-10-11** (code `83f88bd3`) — the caller exists: `runBusinessQueryPrompt` (`lib/business-ir-run.ts`) + the registered tool **`business_ir.run_query`** (`ai-tools/business-ir-pack.ts`). What remains is the tool's **in-chat consumer** — **`CC-60`**. *(This row read "⬜ `CC-59` — startable now" until 2026-10-11; corrected the same day `CC-59` landed — rule 13.)* |
| **Prerequisite / trigger** | none — **built**; **`CC-60`** fires when the AI tool surface is next touched |
| **Source** | `02-SRS-01`, `02-SRS-02`; §S1.2 rows L2/L4/L5 |

### R3 — Display: the Business-IR nugget shows its progress and result in business terms

| | |
|---|---|
| **What** | While an IR executes, the user sees *what is happening* as a sentence (verb·object·outcome), expandable; silence/idle are rendered states, never a void. |
| **HAVE IT** | ⬜ design only (B3 specified the model on Buzz's feed) — no code yet |
| **BUILD IT** | ⬜ **part of `CC-58` Stage B** (the screen) — the feed is its display layer |
| **BORROW IT** | ✅ **Buzz's activity-feed model** — verb·object·outcome, 12 render classes, never-go-dark (B2 §1b B-1/B-2) |
| **Prerequisite / trigger** | Stage B (business work resumes) |
| **Source** | `02-SRS-01`; B2 §1b; B8 §9d |

### R4 — Function lifecycle: the save step

| | |
|---|---|
| **What** | A prompt whose product is commonly needed is **saved as a tenant Function** — named, so next time the user runs it without the AI. |
| **HAVE IT** | ✅ **`request-outcome/gate.ts`** `canOfferSaveAsFunction`; **`FunctionCandidate`** (`types.ts:246` = `{businessIr, name, placement}`, deliberately *not* a `UserFunction`) |
| **BUILD IT** | ⬜ **persistence** — `CC-32` (a `UserFunction` has **no table/entity/repo** today), gated on **`G-09`** |
| **Prerequisite / trigger** | `G-09` gives a saved Function a durable row + delete path |
| **Source** | `02-SRS-02`; §S2 |

### R5 — Function lifecycle: running it with no LLM

| | |
|---|---|
| **What** | A saved Function runs **deterministically** — bind → freshness → compile → resolve → execute — with **no model call**. |
| **HAVE IT** | ✅ **`user-function/run.ts:112`** `runFunction` — the **complete chain** (measured 2026-10-11, B1/B4; 211 passing across the five IR layers) |
| **BUILD IT** | ✅ **`CC-59` DONE 2026-10-11** — the caller (the same item as R2); the whole chain now runs from a prompt. |
| **Prerequisite / trigger** | none — **built** |
| **Source** | `02-SRS-02`; §S1.2 row L5 |

### R6 — Naming / menus: a saved Function appears in the interface (the JOIN)

| | |
|---|---|
| **What** | A saved Function with a canonical `placement.path` is projected into an `InjectionMenuItem`; `groupId` = the path minus its last segment (module-like categories). |
| **HAVE IT** | ✅ the *ingredients* are built: `FunctionPlacement` (`request-outcome/types.ts:203`), `functionPlacement(path,label)` (`:217`, refuses non-canonical paths), `placeFunction` (`business-widget/placement.ts:66`), `InjectionMenuItem` (`modules/widgets/injection.ts:400`), `mergeSidebarGroupsWithInjected` (`AppShell.tsx:234-284` — **creates a NEW group** from an injected item's `groupId`/`groupLabel`) |
| **BUILD IT** | ⬜ **THE GAP** (B5 §2e): `UserFunction` has **no `placement` field**, and `placeFunction` sets **no** path/`groupId`/menu. The join = (a) add `placement?: FunctionPlacement` to `UserFunction`; (b) `placeFunction` copies it; (c) a pure projector `menuItemForFunction` turns the path into an `InjectionMenuItem`. **The projector is specified in `02-SRS-03` §5.3 (`:310`), not in `PLAN-SUPPLEMENTARY-CORE-QUEUE.md` §S1** *(corrected in B8 — see §5: the first draft's "Named in §S1" pointer did not resolve).* The **persistence** it rides is `CC-32`/`G-09`. |
| **Prerequisite / trigger** | the `UserFunction` durable row (`G-09`/`CC-32`) — the placement field rides the same row |
| **Source** | `02-SRS-03` §5; B5 §2e/§5 |

### R7 — Grouping: membership confers no authority (B-5)

| | |
|---|---|
| **What** | A menu group is a **grouping object**, not a grant: being in a group gives **no** authority. |
| **HAVE IT** | ⬜ design principle (B5/B8) — enforced by **not** deriving permission from `groupId` |
| **BUILD IT** | ⬜ a **constraint on R6's join** (one line in the projector: never read permission from the group) |
| **BORROW IT** | ✅ **Buzz's one-signer grouping object** (B2 §1b B-5) |
| **Prerequisite / trigger** | R6 (the join) |
| **Source** | `02-SRS-03`; B2 §1b; B8 §9d |

### R8 — Threads: save a thread of the workspace

| | |
|---|---|
| **What** | A conversation/thread is a **persisted object** with a lifecycle (open → live → archived-as-record). |
| **HAVE IT** | ✅ **`AiChatConversation`** (`entities.ts:736`), **`AiChatConversationParticipant`** (`:826`), **`AiChatMessage`** (`:899`, `uiParts` jsonb `:934`); repo `AiChatConversationRepository.ts` (`createOrGet` `:135` … `findOneAccessibleConversation` `:805`); **36 + 2 tests pass** (measured B6). *(Line numbers corrected in B8 — see §5: the first draft copied `717/806/880` from SRS-04, which point at the `@Entity` decorators; the classes are at `736/826/899`.)* |
| **BUILD IT** | ⬜ the **lifecycle** (open→live→archived) is not modelled; B6's three gaps below |
| **BORROW IT** | ✅ **Buzz's branch-as-channel lifecycle** (B2 §1b B-6) |
| **Prerequisite / trigger** | — |
| **Source** | `02-SRS-04`; B6 |

### R9 — Collaboration: human users in a thread

| | |
|---|---|
| **What** | Multiple humans share a thread with roles (owner/viewer/commenter). |
| **HAVE IT** | ✅ the **participants table + repository** exist (B6): `addParticipant` `:606`, `revokeParticipant` `:668`, `listParticipants` `:575` |
| **BUILD IT** | ⬜ **anchoring / presence / feed** (B6 gap 3) — a comment anchors to *what*, and who-is-here |
| **Prerequisite / trigger** | — |
| **Source** | `02-SRS-04`; B6 |

### R10 — Collaboration: AI users in a thread (the gap)

| | |
|---|---|
| **What** | The AI is a **participant**, not merely the thread's `agent_id`. |
| **HAVE IT** | ⬜ **NOT built** — B6 gap 1: today the AI is the thread's `agent_id`, not a participant row. |
| **BUILD IT** | ⬜ **the AI-as-participant build** — a participant row for the agent, so the same collaboration model covers humans and AI (B6 gap 1) |
| **BORROW IT** | ✅ **Buzz's "humans and agents are the same kind of colleague"** (B2 §1a) |
| **Prerequisite / trigger** | **DP-09** (the owner's open decision: *is the AI a participant or the thread's agent?*) — **this row is blocked on the owner.** |
| **Source** | `02-SRS-04`; B6; `owner_answers.md` DP-09 |

### R11 — Extension: adding a **tool** over time

| | |
|---|---|
| **What** | A new tool/functionality is added **without rebuilding the product**, by one of three authors. |
| **HAVE IT** | ✅ **Route 1** (platform-shipped): the kit's **UMES** (`cli/src/lib/umes/collector.ts:8` — four types), the **injection-widget** mechanism (two files), the runtime loader (`injection-loader.ts`), the generator (`generators/extensions/injection-widgets.ts:186` — `createInjectionWidgetsExtension`; `outputFiles` at `:192`) — all measured B7 |
| **BUILD IT** | ⬜ **Route 2** (tenant-authored) — declarative-only, NEW; safe because `WidgetIR` has no code slot. ⬜ **Route 3** (AI-proposed) — propose-half built (`FunctionCandidate`), apply-half = validator + sandbox, NEW |
| **BORROW IT** | ✅ **Paperclip's self-modification gate** (`N-16`) for route 3's process (B2 §3b) |
| **Prerequisite / trigger** | Route 2: the **B-perms engine (WS-1)** — the per-view audience intersection. Route 3: `CC-59` (a live caller to exercise it). |
| **Source** | `02-SRS-05`; B7 §5 |

### R12 — Extension: adding a **widget** over time

| | |
|---|---|
| **What** | A new panel/analytic/button is added the same way, through the widget architecture. |
| **HAVE IT** | ✅ the **widget = two files** (`widgets/injection/<name>/widget.ts` + `widgets/injection-table.ts`), component widgets (`injection.ts:243`) and declarative data widgets (`:450`); **64 `widgets/` dirs** (31 under `dist/`) — measured B7 |
| **BUILD IT** | ⬜ Routes 2 and 3 for widgets (same as R11); the **frontend workspace surface** itself — **B9** (`02-SRS-06`) |
| **BORROW IT** | ✅ the kit's **build-time discovery + runtime loader** shape (matches OpenRig's "thin clients over one daemon", B2 §2b O-2) |
| **Prerequisite / trigger** | **B9** (the SRS), then WS-1 (B-perms) |
| **Source** | `02-SRS-05`; **B9 to complete** |

---

## §3 — The "organic and core" claim (Q5): what is measured, and what is designed

*(Corrected in B8 — see §5: the first draft headed this "stated as a measurement", but part of it is a
**synthesis about a field that does not exist yet**. The two are separated here so the distinction is
not blurred.)*

The owner's Q5 is *"the wiring is organic and core, not dependent on a certain business functionality
or a use case."* Split into what is **measured today** and what is **designed**:

**Measured (the ingredients exist, at the named lines):**
- `UserFunction` is a **core** type in `packages/shared/src/lib/user-function/` — **not** in any
  module (measured, B4/B5).
- The menu it would land in is the kit's **generic** `InjectionMenuItem` (`modules/widgets/injection.ts:400`)
  plus `mergeSidebarGroupsWithInjected` (`AppShell.tsx:234-284`), which **creates a group from a path**
  with no per-module code (measured, B5).
- **Buzz's rule** (B-5: grouping confers no authority) means the menu **cannot** smuggle a permission in
  through the group (borrowed, B2).
- The **Business IR is re-classified CORE** (owner, 2026-10-11; `PLAN-SUPPLEMENTARY-CORE-QUEUE.md`
  §S1.1) by the project's own test (`CORE-BOUNDARY.md` §0): *"would the platform stop being able to
  describe itself?"* — the IR is **how the platform describes a business request.**

**Designed (does not exist yet — this is the claim, not a measurement):** the join that makes the
wiring organic is a **`placement` field on `UserFunction`** — and, as R6 states plainly, **that field
does not exist yet** (`UserFunction` has no `placement`; see §2 R6, "THE GAP"). So the honest form of
the Q5 claim is:

> **The wiring will be organic *because* the join is a single field on a core type** — that is the
> **design**, and it is what makes per-module wiring unnecessary. **It is measured that the anchor
> (the core `UserFunction` type) and the sink (the generic `InjectionMenuItem`) both exist; it is not
> yet measured that the field between them exists.**

The measurable sense in which Q5 is answered **yes** today: **nothing in the design requires a
per-module hook** — every ingredient is core or generic. The field itself is build work (R6).

---

## §4 — What B9 and B10 fill in

| Column | Owner | When |
|---|---|---|
| §1 row **Q11** (the widgetized structure) | **B9** — `02-SRS-06-widget-architecture.md` | next batch |
| R12's "BUILD IT" detail (the frontend workspace surface) | **B9** | next batch |
| The **owner's decisions list** (every open `DP-*`, stated in the reporting standard) | **B10** | after B9 |
| The final **have/build/borrow** audit (every row re-verified against code) | **B10** | after B9 |

**Cross-refs:** [`00-RESEARCH-PLAN.md`](00-RESEARCH-PLAN.md) §B8–B10; [`02-REFERENCE-SYSTEMS.md`](02-REFERENCE-SYSTEMS.md)
§9 (the verdict this maps from); [`discussion_points.md`](discussion_points.md) (the owner's open
decisions); `library/development/PLAN-SUPPLEMENTARY-CORE-QUEUE.md` (the `CC-*` items).

---

## §5 — Corrected in this file (rule 13 — corrected where it was copied)

A **separate hostile-critic agent** (B8) attacked every citation in this file with a command per claim.
It found **nine real defects, all in this file** — none in the underlying code or plan. Each is fixed
in place above:

| # | Was | Now | Finding |
|---|---|---|---|
| 1 | R8: `AiChatConversation` at `entities.ts:717`, participant `:806`, message `:880` | **`736` / `826` / `899`** (the first numbers pointed at the `@Entity` decorators) — and **SRS-04 carries the same wrong numbers**, which is where this file copied them | A1 |
| 2 | R11: `injection-widgets.ts:192` for the extension function | the **symbol is at `:186`**; `outputFiles` at `:192` — and **SRS-05 cites the same symbol at `:214`**, so two docs disagreed | A5 |
| 3 | R6: the projector `menuItemForFunction` is "**Named in §S1**" | it is specified in **`02-SRS-03` §5.3 (`:310`)** — `PLAN-SUPPLEMENTARY-CORE-QUEUE.md` §S1 contains no such symbol | A6 |
| 4 | §1 Q5 "answered in `02-SRS-03` (**and every SRS**)" | only **two** of the five SRS files mention Q5 (`SRS-03`, `SRS-05`) | B1 |
| 5 | §3 headed "**stated as a measurement**" while R6 calls the same join "THE GAP" | §3 now **separates measured ingredients from the designed field**, and states the Q5 claim as *"will be organic because…"*, not *"is organic"* | C2 |
| 6 | §1 header "the owner's **seven** questions", table of ten, **Q10 missing** | header corrected; **Q10 added** (answered by B8; the owner asked **eleven** questions, `00-RESEARCH-PLAN.md:44`) | D5 |
| 7 | §1 Q4's `groupId` description vs SRS-03's two wordings | uses **"the path minus its last segment"** — the wording SRS-03 §5.3 itself settles on (SRS-03:57's "penultimate segment" is its own internal inconsistency; flagged, not copied) | D4 (note) |
| 8 | (D1) §9d of the reference file attributed the menu join to a "`G-09`-era" | corrected **there** (§8b) — SRS-03 §5.3 measures the projector is **pure** and needs no `G-09` | D1 |
| 9 | (A7) the `run.ts` execute-line citation | corrected **in `01-RECON.md`**: the range `216–241` is right; the *earlier* "call 218 / try 217–228" was also wrong — `try` is **219**, the call **220** | A7/D3 |

**The lesson this batch adds, banked:** *a wrong line number is copied as fast as a right one — and
this file copied three of them from the SRS drafts rather than re-measuring.* The mapping's whole
value is that its citations are checkable; **B10's final audit must re-measure every line, not trust
the SRS drafts it inherited.**

### §5b — Carry-forward: the `run.ts` citation is wrong in four more files

The `run.ts` execute-region citation (`216-241`, with the earlier "218 / 217–228" correction) is
**copied into four other documents** that B8 did **not** edit, because they are the owner's live
queue and changing them deserves its own careful pass:

- `library/development/NEEDS-YOU.md:582`
- `library/development/BACKLOG.md:508`
- `library/development/COMPLETION-CALLBACKS.md:167`
- `library/development/PLAN-SUPPLEMENTARY-CORE-QUEUE.md:86`
- (and `02-SRS-02-function-lifecycle.md:500` already flags it as "the *region*, not the call")

**The measured truth:** `runFunction` entry at **`run.ts:112`**; the execute block **216–241**; the
`try` at **219**; the `engine.query` call at **220**. **Action for the next docs pass:** correct all
five in one change (rule 13), or leave `216-241` as the accepted **region** reference and fix only
where a *precise* line is claimed.

*End of the B8 first draft of the mapping. Completed in B10.*
