# 03 — The Mapping: every workspace requirement → what we have, or the plan item that builds it

**Status:** **COMPLETED in `B-WS/B10` (2026-10-15).** Every row is filled from a measurement
(B1–B7, re-verified 2026-10-15) or a named plan item; **no row is filled from imagination.**
**Date begun:** 2026-10-11. **Date completed:** 2026-10-15 (§6 = the decisions list; §7 = the final audit).
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
| **Q11** | The **widgetized structure** for the **dashboard** and the **workspaces** | **B9** — `02-SRS-06` | **§1 of `02-SRS-06` — the scoreboard:** the definition, IR, registry and threads are ours already; the **runtime, renderer, screen, `@` resolver and the two remaining extension routes are the build**. The **workspace screen is specified** (`02-SRS-06` §7) and **does not exist yet** | §2 R12; §4 |

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
| **BUILD IT** | ⬜ the **screen** that runs the triage for a person — **`CC-58` Stage B** (trigger: *business work resumes*). **Stage C merged with `CC-59`** (both were the one core caller) and is **DONE 2026-10-11**; its in-chat consumer is **`CC-60`** — ✅ **`CC-60` is DONE 2026-10-13 (`P2-4`)**: `ai-agents.ts:181-213` declares `business_ir.query_runner` with the tool whitelisted (corrected 2026-10-15; the row had gone stale — see `COMPLETION-CALLBACKS.md` CC-60). |
| **Prerequisite / trigger** | Stage C: none (`CC-57` landed the binding). Stage B: the owner's ruling lifting (business half un-paused). |
| **Source** | `02-SRS-01`; `PLAN-SUPPLEMENTARY-CORE-QUEUE.md` §S1 |

### R2 — Interaction: the AI authors the Business IR (binding-gated)

| | |
|---|---|
| **What** | The model turns a plain-language request into the platform's structured **Business IR**; before the model is asked, the actor's **agent binding** is resolved (fail-closed). |
| **HAVE IT** | ✅ **`business-ir-author.ts`** `authorBusinessQueryIr` — binding-gated (`agent_not_bound`) + scope-threaded, per **`CC-57`** (code `1bb61557`). |
| **BUILD IT** | ✅ **`CC-59` DONE 2026-10-11** (code `83f88bd3`) — the caller exists: `runBusinessQueryPrompt` (`lib/business-ir-run.ts`) + the registered tool **`business_ir.run_query`** (`ai-tools/business-ir-pack.ts`). ~~What remains is the tool's **in-chat consumer** — **`CC-60`**~~ ✅ **`CC-60` DONE 2026-10-13 (`P2-4`)** and the row corrected 2026-10-15: `ai-agents.ts:181-213` declares `business_ir.query_runner` (chat-mode, `allowedTools: [business_ir.run_query]`, read-only, `requiredFeatures: ['ai_assistant.view']`). *(This row read "⬜ `CC-59` — startable now" until 2026-10-11, corrected the day `CC-59` landed — rule 13.)* |
| **Prerequisite / trigger** | none — **built** |
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
| **What** | The AI is a **participant**, not merely the thread's `agent_id`. *(B10 update: the owner's DP-09 ruling (2026-10-15) makes this **phase-two** — read the two rows below before treating this as a phase-one requirement.)* |
| **HAVE IT** | ⬜ **NOT built** — B6 gap 1: today the AI is the thread's `agent_id`, not a participant row. **Measured 2026-10-15:** `AiChatConversationParticipant` (`data/entities.ts:826`) has `userId: uuid` NOT NULL and `role: owner\|viewer\|commenter` — **no principal kind**. |
| **BUILD IT** | ⬜ **the AI-as-participant build** — a participant row for the agent (an additive `kind` column), so the same collaboration model covers humans and AI (B6 gap 1). **Not phase one** — see the trigger. |
| **BORROW IT** | ✅ **Buzz's "humans and agents are the same kind of colleague"** (B2 §1a) |
| **Prerequisite / trigger** | ✅ **DP-09 ANSWERED 2026-10-15 — DEFERRED, not blocked.** The owner's ruling: a **human calls an agent** (phase one, by `@`); an agent **recommends** adding another and **a human decides**; direct agent-to-agent comes **later** ("we can add that later if complicated now"). **Consequence:** phase one needs **no** participant-row change, because "recommend" is a **message carrying an action**, not a membership. **Measured reason the deferral is cheap:** the runtime **already** turns a mutating tool call into a **pending action a human confirms** (`lib/agent-tools.ts:413-419`) and the authority layer **already** caps every machine actor at **approve-first** (`shared/src/lib/authority/decision.ts:205`). **Trigger: when direct agent participation is wanted.** |
| **Source** | `02-SRS-04`; B6; `discussion_points.md` **Part 3** (DP-09); `02-SRS-06` §5 |

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
| **BUILD IT** | ⬜ Routes 2 and 3 for widgets (same as R11); **the workspace runtime + semantic renderer** (`02-SRS-06` §4) — ⬜ **THE FRONTEND WORKSPACE SURFACE — now SPECIFIED in `02-SRS-06` §7** (measured 2026-10-15: it **does not exist**; `apps/mercato` has no workspace page and the backend is a `[...slug]` catch-all). What exists is the AI chat surface (`ui/src/ai/AiChat.tsx`, `AiDock.tsx`, `conversation-store.ts`). **The rule B9 adopts:** *the workspace is the surface, the thread is the container, the dock is the same thread seen small, page-anchoring is a property the thread carries.* |
| **BORROW IT** | ✅ the kit's **build-time discovery + runtime loader** shape (matches OpenRig's "thin clients over one daemon", B2 §2b O-2) |
| **Prerequisite / trigger** | **B9 ✅ DONE (this file's Q11 row), then WS-1 (B-perms)** for the permission-dependent half; the screen itself needs the **join** (`R6`/`CC-62`) and **`R4` persistence** (`CC-32`/`G-09`) to show a *saved* Function — but **a live query nugget** (no save) needs only the `CC-59` caller, which is **built**. |
| **Source** | `02-SRS-05`; **B9 ✅ — `02-SRS-06`** |

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

## §4 — What B9 and B10 filled in *(completed 2026-10-15)*

| Column | Owner | State |
|---|---|---|
| §1 row **Q11** (the widgetized structure) | **B9** — `02-SRS-06-widget-architecture.md` | ✅ **DONE 2026-10-15** — the Q11 row above now carries B9's verdict; the workspace screen is specified (`02-SRS-06` §7) |
| R12's "BUILD IT" detail (the frontend workspace surface) | **B9** | ✅ **DONE** — the row above records the measured absence and B9's adopted rule |
| The **owner's decisions list** (every open `DP-*`, stated in the reporting standard) | **B10** | ✅ **DONE — §6 below** |
| The final **have/build/borrow** audit (every row re-verified against code) | **B10** | ✅ **DONE — §7 below** |

**Cross-refs:** [`00-RESEARCH-PLAN.md`](00-RESEARCH-PLAN.md) §B8–B10; [`02-REFERENCE-SYSTEMS.md`](02-REFERENCE-SYSTEMS.md)
§9 (the verdict this maps from); [`discussion_points.md`](discussion_points.md) (the owner's decisions);
`library/development/PLAN-SUPPLEMENTARY-CORE-QUEUE.md` (the `CC-*` items).

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

---

## §6 — THE DECISIONS LIST (`B-WS/B10` — the owner's, stated in the reporting standard)

**What this is.** Every decision that is the **owner's**, in one place, each with **the decision · what it
means in plain words · why it matters · the risk · a recommendation · whether he must decide at all.**
*(Rule 11: a decision that is the owner's is not ours to close.)*

**Status: 15 of 15 answered.** The table is the **record**; **Part 3 of [`discussion_points.md`](discussion_points.md)
is the source** for DP-09/10/11/15 (answered in conversation 2026-10-15 and written out in full there).

### §6.1 — Answered, and what each settles

| # | The decision | In plain words | Settles (code term) |
|---|---|---|---|
| **DP-01** | Chain live first, storage second | *make a question produce a real result before building the filing cabinet that saves it* | unblocked `CC-59`; `R4`/`CC-32` stays gated on `G-09` |
| **DP-02** | Say "permissions were not checked" | *never let an unchecked thing look checked* | honesty line on the save path |
| **DP-03** | A schema-change request is a permissions question first | *ask who may do this, then route it — don't just refuse* | spawned `DP-04`/`DP-05` |
| **DP-04** | A dedicated permissions workstream, with the **two-gate rule** | *check permission going in **and** coming back — without wrecking speed* | **WS-1 / B-perms** APPROVED; its opening items are `CC-44` (write gate is opt-in) and `CC-47` (no per-row read filter) |
| **DP-05** | "Explain and route" ships early; the build-pool waits | *the dead end becomes a routed request now; carrying it out waits on the permissions engine* | sequenced behind WS-1 |
| **DP-06** | A recipe may sit in several menu homes, **one** permission set everywhere | *put it in two menus if useful — but it can never mean two different permissions* | one permission set, many placements |
| **DP-07** | A recipe opens as a page, a panel, or both — **chosen per recipe** | *the author decides how it opens* | `R6`'s placement carries the choice |
| **DP-08** | Menu categories are **FLAT** for now | *one flat list; nesting is a later switch with nothing re-saved* | the group is a pure function of the path |
| **DP-09** | Agents are **AI persons**; a **human calls** them by `@`; an agent may **recommend** adding another and a **human decides**; agent-to-agent **later** | *start with people calling agents; the smart suggestion is still a suggestion* | **participant row stays human-only in phase one** (§2 R10); the recommend-path **reuses** the existing "human confirms a pending action" machinery (`agent-tools.ts:413-419`, `authority/decision.ts:205`) |
| **DP-10** | The workspace is the **one place threads are managed** | *one screen for conversations* | **the workspace is the surface, the thread is the container** — no new store (`02-SRS-06` §7); one small leftover: one thread per page or many |
| **DP-11** | Nuggets have captions (`%name%`), can be copied to a new thread, carry a growing toolbar; **comment the thread for now**; the add-data path must be **clear and ready** | *name a panel, jump to it, spin it into its own chat; adding data goes to the **existing** schema only* | three nugget kinds (output/analysis/form); the form's **face** now, its **write** after the two gates; the advanced per-datum step **parked** → `N-22` |
| **DP-12** | Follow the recommendation, but **sequence every build behind its prerequisite** | *build each piece only when the thing it needs exists* | binding order: `B1…B10` → `B-perms` → `B-studio` → dependent builds |
| **DP-13** | Review-by-change-class; it belongs in **The Studio**; **"allow you to use it" ≠ "post it into your interface"** | *showing someone a thing is not the same as pushing it into their screen — that would be spam* | WS-2 owns the "available to" vs "placed into" distinction |
| **DP-14** | A departed author's widgets have a **defined fate**; it belongs in The Studio | *ownership, sharing, review and placement are **one** subject* | WS-2 |
| **DP-15** | The Studio as a **place** waits; **some of its functions** are needed now (permissions management); the visual data editor waits | *we don't need the whole hub — only the security the platform needs to be testable and safe in phase one* | **measured:** catalogue + matcher + assign screens ARE built; **default-deny (`CC-44`) and the per-row read filter (`CC-47`) are NOT**; the Studio becomes the surface of WS-1's engine |

### §6.2 — What is still **open**, and its classification

| # | Open item | Whose | Must he decide **now**? |
|---|---|---|---|
| 1 | **One thread per page per person, or many?** (`DP-10`'s leftover) | **owner** | **No** — best decided by *seeing* the workspace screen. Recommendation: build the "many" default (it is a superset — a single-thread-per-page rule can be added later without data loss). |
| 2 | **The `%caption%` escape rule** — a caption counts only when the token names a nugget that exists in that thread | **owner may overrule** | **No** — B9 adopts it as a design default; the alternative (*any* `%word%` is a caption) breaks on ordinary percentages. |
| 3 | **Modal vs scroll** for a caption click | **owner may overrule** | **No** — B9 adopts **modal-first** (the owner's own lean); scroll is the fallback. |
| 4 | **`#` references** (the vision's `@`/`#` system) — `@` is settled, `#` is unresolved | design (`G-09`) | **No** — it is `G-09`'s subject, not a blocker. |
| 5 | **AI-as-participant** (the participant `kind`) | **owner already ruled** (DP-09) | **No** — deferred with a named trigger. |
| 6 | **The advanced data-anchoring** (per-datum comments) | **owner already ruled** (DP-11) | **No** — parked as `N-22`. |
| 7 | **The Studio's scope** (WS-2) | **owner already ruled** (DP-15) | **No** — the engine (WS-1) comes first. |

**None of the seven blocks `B9`/`B10`.** Six are already ruled or scheduled; one (item 1) is better decided
by looking at the screen than by reasoning about it.

---

## §7 — THE FINAL AUDIT (`B-WS/B10`): every requirement's destination, no row left floating

**The rule this section applies** (`00-RESEARCH-PLAN.md`, B10's exit gate, verbatim): *"every SRS requirement
has a **destination** (built / planned item / owner decision); no requirement is left floating."*

**Measured 2026-10-15.** Eleven of the twelve R-rows were re-checked against the code; the changes since the
B8 draft are named, not silently absorbed.

| Row | Destination | State measured 2026-10-15 |
|---|---|---|
| **R1** triage → three endings | ✅ **BUILT** (`triage.ts`, `gate.ts`, `types.ts`) + `CC-58` Stage B (the screen) | unchanged; the `CC-60` pointer corrected (§2 R1) |
| **R2** the AI authors the IR | ✅ **BUILT** (`business-ir-author.ts`; `CC-57` gate) | unchanged |
| **R3** the nugget's progress feed | ⬜ **BUILD** — part of `CC-58` Stage B | unchanged (design only) |
| **R4** save a Function | ⬜ **BUILD** — `CC-32`, gated on **`G-09`** | unchanged |
| **R5** run it with no LLM | ✅ **BUILT** (`user-function/run.ts:112`) | unchanged |
| **R6** the menu **join** | ⬜ **BUILD** — **`CC-62`** (the `placement` field) | unchanged; confirmed still absent |
| **R7** grouping confers no authority | ⬜ **BUILD** — a constraint on R6's projector | unchanged |
| **R8** threads persisted | ✅ **BUILT** (`entities.ts:736/826/899`); ⬜ the lifecycle | unchanged |
| **R9** humans in a thread | ✅ **BUILT** (participants + repo); ⬜ anchoring/presence | unchanged |
| **R10** AI in a thread | ⏸ **DEFERRED by the owner's DP-09 ruling** — was "blocked" | **CHANGED** — §2 R10 rewritten; the deferral is cheap (no migration) |
| **R11** adding a tool | ✅ Route 1 built; ⬜ Routes 2/3 | unchanged |
| **R12** adding a widget + **the screen** | ✅ Route 1 built; ⬜ Routes 2/3; ⬜ **the screen — now specified** | **CHANGED** — `02-SRS-06` §7; the absence measured |

**Result: 12 of 12 rows carry a destination. Zero floating.** Three rows changed since B8 (R10, R12, and the
`CC-60` pointer inside R1/R2); eight are unchanged; one (R3) remains design-only by design.

**What is NOT claimed.** This audit re-verified the rows **this workstream owns** (R1–R12 and the Q-rows). It
did **not** re-measure the whole spine's `CC-*` register — that is not B10's subject, and `§5b` records the
one citation defect still carried in four other files, deliberately left for its own pass.

### §7b — The build set this audit confirms (so no row is forgotten)

| Item | What it builds | Prerequisite / trigger |
|---|---|---|
| **`CC-62`** | the join (`R6`/`R7`), the thread lifecycle (`R8`), anchoring/presence (`R9`), routes 2/3 (`R11`/`R12`) | `B9`/`B10` **now done**; then per item (`G-09`, WS-1) |
| **the workspace screen** | `02-SRS-06` §7 — the surface | the join + `CC-32` for a *saved* Function; a **live query nugget** needs only `CC-59` (built) |
| **`CC-32`** | Function persistence (`R4`) | **`G-09`** |
| **`CC-44` / `CC-47`** | the two gates phase-one "secure" means (DP-15) | startable; they are WS-1's opening items |
| **`N-22`** | the parked advanced anchoring (DP-11) | owner asks, or `CC-47` completes |

---

*Completed in `B-WS/B10`, 2026-10-15. Owner: Ramzi. The design workstream's batches B1–B10 are now DONE;
what follows is the build (no build is started by this document — bridge rule BR-4).*
