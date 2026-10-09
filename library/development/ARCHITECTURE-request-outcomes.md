# The three things a prompt can become — the request-outcome taxonomy and its gate

**Status:** analysis + design decision (owner's request, 2026-10-06). **This is the home for the
"core features_pack" the owner described**, and it defines **G-21** on the backlog.

**Why this file exists.** The owner described, in his own words, that **not every prompt becomes a
permanent Function**. He named three endings a prompt can have, and the **triage** that decides which:

1. **A one-time result** — "analyse something from the database and report back an output in a UI
   element like a datagrid, an input form, a report." Nothing is saved. The answer is the deliverable.
2. **A step of architecture** — "some prompts may end up adding new database architecture because we
   are expanding the portal/tenant to provide other services, for example LMS service, CRM, etc."
3. **A permanent Function** — the output is validated, refined until flawless, then *saved with a name*
   and placed in a grouping/sub-grouping, so it runs like "a standard item menu in the traditional
   platforms" — with no AI in the loop.

Then he asked the right question: *"Discuss if there is anything unclear there… Then verify that this
is well established in the development plans."*

**The answer, measured:** **two of the three are named in the vision; the third is named nowhere; and
the triage that binds them exists as a single sentence in one document and as a plan item nowhere.**
Below is the evidence, the grilling, and what we are doing about it.

---

## 1. What the vision already says — with the quotes

I read the vision documents (`library/ai/ai-first/`) directly rather than trusting a summary. Each
claim below is a quote with a file and a line.

### 1a. Outcome 3 (save as Function) — **covered, and well**

| What the owner described | Where the vision says it | Quote |
|---|---|---|
| Produces output, user validates | Doc 03 §45 (line 1395) | `User verifies.` |
| Then chooses to save | Doc 03 §45 (line 1400) | `Save as Function` |
| Give it a **name** | Doc 03 §45 (line 1406) | `Function name` |
| With **parameters** | Doc 03 §45 (line 1407) | `parameters` |
| Put it in a **grouping/sub-grouping** | Doc 03 §61 (line 1811) | `Destination:` / `Finance → Accounts Receivable` |
| With **permissions** | Doc 03 §45/§61 (1409/1814) | `permissions` / `Finance Viewer` |
| Runs **without AI** afterwards | Doc 03 §47 (line 1467) | `There is no LLM call.` |
| Now "just a normal ERP button" | Doc 03 §48 (line 1491) | `is just a normal ERP button.` |
| Lives in a **library of Functions** | Doc 03 §62 (line 1830) | `My Functions / Team Functions / Organization Functions / System Functions / AI Functions` |
| One day may become a product module | Doc 03 §63 (line 1873) | `user function → repeated pattern → validated canonical capability → vendor module` |

**Verdict: complete.** Every element the owner named is in the vision, including the grouping — §61's
`Destination: Finance → Accounts Receivable` *is* the "grouping/sub-grouping" in the owner's words.
And §40 (line 1224) even guards the subtlety: `Save the validated logical operation` — not the raw SQL,
not the prompt, not the returned data.

### 1b. Outcome 2 (a prompt causes new database architecture) — **covered, but not where you would look for it**

This one **corrects an earlier reading of mine** (recorded 2026-10-06) that said the vision never names a
prompt-caused schema change. That was **wrong** — I had measured the wrong document. The truth, quoted:

| Claim | Where | Quote |
|---|---|---|
| A **user prompt** drives a schema change | Doc 04 §33 (line 997) | `When the user says:` / `Add Vehicle.` |
| And it is *not* raw SQL | Doc 04 §33 (line 1010) | `not: ALTER TABLE` |
| It has a full, gated pipeline | Doc 04 §34 (line 1018) | `User / AI request → Model Proposal → Semantic Validation → Dependency Analysis → Impact Analysis → Migration Planning → … → Publish Model Version` |
| It can spawn a whole new service (LMS/CRM) | `AI_Native…` §122 (line 3285) | `User requirement → AI-assisted design → Capability draft → Business Model draft → Validation → Impact analysis → Generated UI/API/AI/migration preview → … → Activate capability` |
| **Data change and schema change are different paths** | `AI_Native…` §123 (line 3335) | `Both can originate from natural language, but they go through different command paths.` |

**Verdict: covered.** The vision has both the doctrine (§33 — *"schema changes are model changes"*) and
the LMS/CRM case (§122). **The gap is placement, not existence** — none of this is on the backlog, so a
builder reading the plan would not know outcome 2 is a first-class path with its own gate.

### 1c. Outcome 1 (a one-time result, never saved) — **named nowhere**

This is the real hole. Measured three independent ways:

- **Route 1 — the vision folder.** Search for `ephemeral|one-time|one time|ad-hoc|ad hoc|throwaway|disposable` across all 9 vision documents: **5 hits, and every one is about *system* state** — Doc 04 line 300 `Ephemeral processing state`, Doc 06 line 5068 `It is ephemeral and reconstructed from trusted sources`, `AI_Native…` lines 608/2667 about prompt-cache and worker state. **Not one is a prompt outcome.**
- **Route 2 — the whole library** (~26,000 files). Search for the phrase forms a person would write (`one-time result`, `just show me`, `without saving`, `don't save`, `ad-hoc query`…): **every substantive hit belongs to an imported project** (Hermes session persistence, Paperclip agent drafts, ComfyUI previews) or to *Cancel buttons* in the blueprint flows. **Ours has none.**
- **Route 3 — the nearest counter-example, tested on purpose.** The closest thing in our own vision is Doc 03 §40 (line 1206): `Do NOT save only: raw SQL / the natural-language prompt / the returned data`. I read it in full. It says *when you save, save the operation not the result*. It does **not** say *sometimes you do not save at all* — it never treats "answer once and discard" as a legitimate, expected ending.

**Verdict: absent.** Outcome 1 — the most common ending for a real user, by far — has **no name and no
home** in the vision or the plans.

### 1d. The triage — **one sentence in the vision, no plan item anywhere**

`AI_Native…` §123 (line 3335) states the principle: *"Both can originate from natural language, but they
go through different command paths."* That is the triage, and it is correct — but it exists **once, in
passing**, inside a document about the forensic analysis, and it is **on the backlog nowhere**. Search of
`library/development/*.md` for `prompt outcome | three outcomes | request type | triage | read-only
request` returns **nothing**. Search for `save as function` returns exactly **two** hits — the loop written
in `BACKLOG.md` line 70 and `HANDOVER.md` line 616 — and **neither mentions outcome 1 or outcome 2**.

---

## 2. The grilling — what is genuinely unclear, and what I am deciding

The owner asked for grilling, not agreement. Here are the six things that are actually underspecified,
each with the decision I am taking (or the question only he can answer, flagged as such).

### Q1. Who decides which ending a prompt gets — the user, or the platform?

**This is the sharpest gap, and the vision is silent.** §45 shows the happy path as a straight line:
`ask → result → verify → Save as Function`. It never shows the branch. Read literally, it would save
every prompt, which contradicts the owner's own account.

**Options, and what each means in plain terms:**

- **(a) The user decides, explicitly.** After a result, the platform shows a choice: *Answer once* · *Save
  as a Function* · *(if it needs new structure) Propose a model change*. The user picks. If they pick
  "answer once", nothing is stored and the platform says so plainly.
- **(b) The platform decides automatically.** The AI classifies the request (read / save-worthy / needs
  new structure) and routes it. Faster, but it can silently save things nobody wanted and — worse — can
  decide *on its own* that the schema should change.
- **(c) Both: a default, overridable.** The platform proposes the ending it thinks fits; the user
  confirms or overrides in one click. This is how the rest of the platform already behaves (the AI
  proposes, the human confirms the consequential step).

**Decision — (c), with a hard rule: the platform may *propose* a schema change, and it may *perform*
one only through the gate in §1b (validation → impact analysis → approval → migration).** The user is
never asked to adjudicate a menu, and the platform is never allowed to reshape the database on its own
initiative. This matches the owner's own memory rule (*"answers, not menus"*) **and** the vision's
`AI-assisted design → … → Approval` pipeline. *(This is my call; it is reversible — it is one branch in
the request path — and it is written here so it can be argued with.)*

### Q2. Is "answer once" really *nothing* saved — or is the *query* kept for a second run?

There are two defensible readings, and they differ in what the user sees:

- **(a) Nothing at all.** The result is displayed and gone. Most literal reading of the owner's words.
- **(b) Keep the *history*, not a Function.** The answer is not a named capability, but the conversation
  (and the IR it produced) stays in the thread, so the user can re-run *this session's* question without
  the AI re-reasoning it — but there is no button, no name, no menu entry.

**(b) is the better default and I am taking it**, because the vision already keeps a conversation and
because it costs nothing: the IR was produced anyway (§45's `Business IR generation` step). It also gives
outcome 1 a natural bridge to outcome 3 — the thing you re-ran twice is exactly the thing worth saving.
**But it must be visibly *not* a Function**: no name, no permissions row, no library entry. If it looked
like a Function, outcome 1 would collapse into outcome 3 and the owner's distinction would be lost.

### Q3. Outcome 2 has different *sizes*, and the vision already tiers them — I nearly invented my own scheme

"Add Vehicle" (a new entity in an existing module, Doc 04 §33) and "add an LMS service" (`AI_Native…`
§122) both appear under *schema change*, but they are not the same act. **I first wrote this section
with a hand-drawn small/large split. A critic pass found that the vision already has a precise
three-tier rule, and my version was weaker than the one sitting next to it.** Doc 04 §130/§131/§132:

| Tier | The vision's own examples (Doc 04 §130–§132) | What it means for the triage |
|---|---|---|
| **Safe** — may auto-publish after testing | `new optional field` · `new read-only view` · `new alias` · `new non-breaking metric dimension` · `new UI view` | the platform may proceed on its own once tests pass |
| **Review-required** | `new relationship` · `metric formula change` · `permission change` · `workflow change` · `command behavior change` · `field type change` | a person must review before it takes effect |
| **Explicit-approval** | `deleting data` · `removing field` · `breaking relationship` · `changing financial metric semantics` · `changing authorization boundaries` · `changing payroll/accounting behavior` | a specific approval is required, and the class of change is the dangerous one |

**Decision — use the vision's three tiers as the taxonomy's risk axis, and do not invent a
parallel one.** The gate is the same *shape* for all three (proposal → validation → impact → approval →
migrate), but the **tier decides who must look**: a `new optional field` can proceed once tests pass; a
`removing field` or an `authorization boundary` change cannot. The LMS/CRM case (`AI_Native…` §122) is
the *largest* of these — it adds UI, API, migrations and tests — so it is review-or-explicit by
construction, never "safe". **The vision gives the *tiers* but does not say which tier an LMS-sized
capability lands in. The owner decided on 2026-10-06: a whole new service is *explicit-approval*, the
strictest tier — so "add me LMS" always stops and names a person, every time.** *(This was the one
question in this document that needed him; it is closed — `NEEDS-YOU.md` row `NY-14`.)*

### Q4. What exactly is "flawless output" — the bar that lets a prompt become a Function?

The owner said "once the output for that prompt is refined and provides stable flawless output". The
vision has the answer already and it is **not** "the user looked at it and was happy" — Doc 03 §46
(line 1419) says so explicitly, then lists objective checks: `IR valid · entities valid · fields valid ·
metrics valid · relationships valid · authorization valid · tenant scope valid · query plan valid ·
sample result valid`, and for writes adds `preconditions · policy · dry run · impact · postconditions`.

**So the bar for "Save as Function" is G-02's compiler returning clean (or returning only *gaps*), plus
§46's checks — a machine-checked gate, not a feeling.** This is the single most important refinement,
because it turns the owner's phrase into a test the platform can run. The refinement *loop* he described
(validate → tell the AI what is wrong → AI fixes the IR → repeat) is exactly this gate refusing to pass
until it is clean. **Recommendation: the Save button is *disabled* — visibly, with the failing check
named — until §46 passes.** Otherwise "flawless" degrades into "it looked right once".

### Q5. Where does a saved Function *go* — and is the grouping a real structure or a label?

§61 shows `Destination: Finance → Accounts Receivable` and §62 shows five libraries
(My/Team/Organization/System/AI). But the vision never says whether the grouping is:
- a **free-text path** typed at save time (flexible, but two users can make `Finance/AR` and
  `Finance > Accounts Receivable` and get two different menus), or
- a **declared structure** the platform owns, so Functions land in a real, navigable menu.

**Decision: the grouping is a declared path with a canonical id, and the save UI *picks* from it rather
than accepting free text** — because a menu that two people can spell two ways is not a menu, and because
the platform already has canonical-id discipline for entities and fields (Doc 8 §12.1). Free text at the
edge, canonical id underneath — the same pattern as everywhere else. This is also what makes §63
(*"user function → repeated pattern → vendor module"*) possible: you cannot detect a repeated pattern if
the same pattern can be named five ways.

### Q6. The vision says a Function is *executed without AI* — but what *creates* the IR in the first place?

This is the join between this file and **G-17**. Outcomes 1 and 3 both begin with the AI producing a
Business IR (§45's `Business IR generation`). Today **nothing can do that** — measured 2026-10-06: the
model writes arbitrary JavaScript against the REST API, never the IR, and the IR has no runtime parser.
**So the taxonomy is correct but not yet *runnable*.** My decision stands that **G-17 comes next, ahead
of G-12**, because every outcome in this document, including the simplest one-time answer, waits on it.
The taxonomy does not block G-17 — it *scopes* it: G-17 must emit all **three** code paths' IR, not just
the read path.

---

## 3. What we are doing about it

Three changes, all reversible, all recorded here so the plan and the reality cannot drift apart.

### G-21 — the request-outcome taxonomy and its gate *(new backlog item)*

**What it is:** the triage that decides, for any prompt, which of the three endings it gets — and the
gate on the one ending that can change the database.

**It contains:**
1. **The name of each outcome**, as a first-class thing the platform models: `ephemeral answer` (1),
   `model proposal` (2), `function candidate` (3).
2. **The triage rule** (§2 Q1): the platform proposes an ending; the user confirms or overrides; a
   schema change can only proceed through the §1b gate.
3. **The risk tier of outcome 2** (§2 Q3), using the vision's own three tiers (Doc 04 §130–§132) as the axis that decides who must approve.
4. **The §46 bar** (§2 Q4) as the machine-checked precondition for offering "Save as Function".
5. **The declared, canonical grouping path** (§2 Q5) for where a saved Function lands.

**Depends on:** G-02 ✅ (the compiler is what enforces §46) and **G-17** (nothing can *reach* an outcome
until the AI can emit the IR). **Startable after G-17's first artifact exists.**

### The documentation changes, made in this same pass

| File | Change |
|---|---|
| `library/development/BACKLOG.md` | **G-21** added, with its dependencies and a pointer to this file; the `G-17` row cross-referenced to G-21; header updated |
| `library/WHAT-WE-ARE-BUILDING.md` | added the **three outcomes** to the loop section, so the front door states them |
| `library/development/HANDOVER.md` | the "decisive loop" line now shows the **branch**, not a straight line |
| `library/analysis/findings/11-shortcut-and-gap-register.md` | the earlier **wrong** reading (outcome 2 "absent") corrected in place, and the real gap (outcome 1 + triage) recorded |

### What this does **not** change

No code. This is a scoping-and-documentation pass. **The next build item remains G-17** — this file
narrows what G-17 must produce (three paths, not one) but does not delay it.

---

## 4. If you read only this — the five lines to remember

1. **Two of the three prompt endings are already in the vision** — Save-as-Function (Doc 03 §45/§61/§62/§63) and prompt-caused schema change (Doc 04 §33/§34; `AI_Native…` §122).
2. **The one-time answer is named nowhere** — measured three ways, and the nearest counter-example (§40) is about *what to save*, not *whether to save*.
3. **The triage is one sentence in one document and on the backlog nowhere.** It is now **G-21**.
4. **The bar for "flawless" already exists** — Doc 03 §46's objective checks, enforced by G-02's compiler. The Save button should be disabled until they pass.
5. **None of it runs until G-17** — the AI cannot yet emit the IR, so every outcome waits on it. **G-17 stays next.**

---

## 5. Register — every point, its status, and where the detail lives

| # | Point | Status | Detail |
|---|---|---|---|
| 1 | Outcome 3 (save as Function) is covered by the vision | **NOT AN ISSUE** — verified, quoted | §1a |
| 2 | Outcome 2 (prompt-caused schema change) is covered | **NOT AN ISSUE** — verified, quoted; **my earlier "absent" claim retracted** | §1b, register §7b |
| 3 | Outcome 1 (one-time answer) is named nowhere | **FIXED 2026-10-06** — now `ephemeral_answer`, a first-class outcome in `packages/shared/src/lib/request-outcome/types.ts` | §1c, §3; built under `PLAN-G21-request-outcomes.md` |
| 4 | The triage has no home | **FIXED 2026-10-06** — `triageRequest()` in `request-outcome/triage.ts`, pure and mutation-proven | §1d, §3 |
| 5 | The triage rule (who decides the ending) — undecided in the vision | **FIXED 2026-10-06** — default taken and **built**: the platform proposes, the user confirms the consequential ones, a structure change is never performed by the triage | §2 Q1 |
| 6 | "Answer once" may keep the *thread*, not a Function | **FIXED 2026-10-06** — made **structural**: `ephemeral_answer` carries no `FunctionCandidate`, so a menu entry is a type error, not a convention | §2 Q2 |
| 7 | Outcome 2's risk tiers | **FIXED** — a critic pass replaced my invented small/large split with the vision's own three tiers (Doc 04 §130–§132), now the `ChangeRiskTier` type | §2 Q3 |
| 8 | The "flawless" bar | **FIXED 2026-10-06** — measured: it **already exists and already enforces** (`verifyFunction`, `transition`). G-21's gate **consumes** that report rather than re-implementing it | §2 Q4 |
| 9 | Where a saved Function goes (grouping) | **FIXED 2026-10-06** — `functionPlacement()` builds on the existing canonical-id grammar, so free text is refused **at construction** | §2 Q5 |
| 10 | **Which tier an LMS/CRM-sized capability lands in** | **DECIDED by the owner 2026-10-06 — explicit-approval** (the strictest tier) | §2 Q3 |
| 11 | G-17 must emit the IR for all three paths | **PARTIAL** — G-17 ships the **read + command** IR (done, measured live 2026-10-06). The **schema-mutation kind does not exist** (`IrOperation` is still `list|count|aggregate`), so outcome 2 is **recognised and gated but not yet emittable**. Deliberate: the fence comes before the thing it fences | §2 Q6, `PLAN-G21-request-outcomes.md` §1e |

**Nothing is open.** The one question that needed the owner — the approval tier for a whole new service
— was answered on 2026-10-06: **explicit-approval**.

---

## 6. Built 2026-10-06 — what exists now, and what does not

**Built** (`packages/shared/src/lib/request-outcome/`, committed `916069a`; 32 new tests, shared suite
**2234/2234 across 193 suites**, typecheck exit 0):

- `types.ts` — the three outcomes, the vision's risk tiers, `functionPlacement()`, `FunctionCandidate`.
- `triage.ts` — `triageRequest()`, pure; structure decided **first**; fails closed on an unrecognised
  change (strictest tier, never `safe`).
- `gate.ts` — `canOfferSaveAsFunction()`, which **consumes** `verifyFunction`'s report and surfaces
  `notChecked`.

**Three things this deliberately does not do**, so the register is not over-read:

1. **No schema-mutation IR kind** (register §11). Outcome 2 is triaged but cannot be emitted.
2. **No UI.** The gate is the function a Save button will call; wiring the button is separate.
3. **No database row**, and no new execution path. `authorization_valid` stays `not_checked` until G-04.

