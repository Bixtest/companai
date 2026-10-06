# G-21 — the request-outcome taxonomy and its gate

**Status:** plan (2026-10-06). **Nothing is built yet. No code before this document exists**
(COOKBOOK rule zero-zero — a build starts from a written plan).

**What G-21 is.** For any prompt a user types, the platform must decide **which of three endings it
gets**, and it must gate the one ending that can change the database. The design and the decisions live
in [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md); **this file is how we build
it.** That document says *what* and *why*; this one says *which files, in what order, and how we will
know it works*.

**It is now unblocked.** G-21 depended on G-17 (nothing can reach an outcome until the AI can emit the
IR). G-17 is **done and measured live 2026-10-06** — the app-level run is green. So this is the next
build item, and it starts here.

---

## 1. Research — what already exists (measured, not assumed)

> The point of this section: **most of G-21 is already built, and I could easily have written a second
> copy of it.** Three of the five pieces the architecture document names already exist as tested code.
> What is genuinely missing is the **taxonomy itself** and the **triage**. Everything below was read
> from the artefacts, with the file and line given.

### 1a. The §46 bar — **already built, and already enforcing** ✅

The architecture document (§2 Q4) says the bar for "Save as Function" must be **objective checks, not
"the user looked at it and was happy"**. That gate **exists**:

| What | Where | What it does |
|---|---|---|
| The §46 checks, named | `packages/shared/src/lib/user-function/types.ts:192` | `VerificationCheckName` — `ir_valid`, `entities_valid`, `fields_valid`, `relationships_valid`, `parameter_schema_valid`, `tenant_scope_valid`, `query_plan_valid`, `authorization_valid` |
| The checks, executed | `.../user-function/verify.ts:71` | `verifyFunction()` — calls **G-02's compiler** and maps its diagnostics to named checks |
| The three outcomes | `.../user-function/types.ts:213` | `'passed' \| 'failed' \| 'not_checked'` |
| The lifecycle | `.../user-function/lifecycle.ts:128` | `transition()` — **refuses** to mark a Function `verified` without a **passing** report |

**This is the single most important finding, and it changes what G-21 does.** The architecture document
says *"the Save button should be disabled until those checks pass."* That rule is already true at the
**API** layer — `transition()` will not let a Function reach `verified` on a failing report — and at the
**document** layer — `document.ts:112` refuses to import a `verified`-or-later Function with no
verification record. **So G-21 does not need to build the gate. It needs to *ask* the gate before
offering the button, and say which check failed.** Re-implementing it would give the project two answers
to one question, which is how the two drift apart.

### 1b. The risk tiers for outcome 2 — **the vision's, not ours** (Doc 04 §130–§132)

`ARCHITECTURE-request-outcomes.md` §2 Q3 already replaced a hand-drawn small/large split with the
vision's own three tiers: **safe** (auto-publish after tests) · **review-required** · **explicit-approval**
(destructive / authorization-boundary changes). **G-21 carries those tiers; it does not invent a
scheme.** The owner decided 2026-10-06 that a whole new service (LMS/CRM) is **explicit-approval** — so
"add me LMS" always stops and names a person.

### 1c. The canonical grouping — **the grammar exists, the type does not** ✅/❌

§2 Q5 decides the grouping is a **declared path with a canonical id**, not free text, *"because a menu
that two people can spell two ways is not a menu."* The grammar for that already exists and is tested:
`packages/shared/src/lib/kernel/canonical-id.ts` — `isCanonicalId`, `assertCanonicalId`,
`parseCanonicalId(id, kind)`. **What does not exist is a `function` placement type built on it.** So the
grouping is a small, additive type — not a new grammar.

### 1d. The intent classifier in the request path — **exists, but speaks the wrong vocabulary** ⚠️

This is the seam, and it is easy to mistake for the answer. `api/route/route.ts:32` already classifies
every request:

```ts
const RouteResultSchema = z.object({
  intent: z.enum(['tool', 'general_chat']),
  toolName: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})
```

**That is a *dispatcher* question — "which tool runs this?" — not the *outcome* question G-21 asks —
"what does this prompt become?"** The two are different axes: a `tool` intent can end as an ephemeral
answer *or* as a saved Function, and both are `tool`. **G-21 must not overload this enum**: widening
`tool | general_chat` would make a dispatcher answer a product question, and the next reader could not
tell which meaning was intended. **The taxonomy is a separate, additive concept.**

### 1e. Outcome 2's IR kind — **does not exist** (G-21's real dependency)

Measured: `packages/shared/src/lib/business-ir/types.ts:38` — `export type IrOperation = 'list' |
'count' | 'aggregate'`, plus `BusinessCommandIR` (writes to **existing** structure). There is **no
"add entity / add field / create capability" IR kind.** So outcome 2 (a model proposal) can be
**triaged** today but cannot be **emitted** today.

**This is a scoping decision, and I am taking the narrow one: G-21 ships the taxonomy, the triage and
the gate. The schema-mutation IR kind is a *separate* item, and outcome 2 stays a *recognised, gated,
not-yet-emittable* outcome.** Reason: emitting a schema change is the single most dangerous thing in the
product, and building it in the same pass as the taxonomy that is supposed to *contain* it would ship the
danger before the fence. **The fence comes first** — which is the whole point of G-21.

---

## 2. The approach

**Add the taxonomy as pure, typed shared code; make the triage a pure function over it; make the Save
gate *ask* the existing verifier.** Three files, no new execution path, no AI dependency in `shared`.

### 2a. What is built

| # | Artifact | Where | What it is |
|---|---|---|---|
| 1 | **The outcomes** | `packages/shared/src/lib/request-outcome/types.ts` | The three endings as a first-class union: `ephemeral_answer` · `model_proposal` · `function_candidate`. Plus the risk tiers (the vision's three), the triage input, the triage result, and the canonical `FunctionPlacement` |
| 2 | **The triage** | `.../request-outcome/triage.ts` | A **pure** function: given what the request needs (does it read only, does it write, does it need new structure) it returns a **proposed** outcome — never a performed one |
| 3 | **The gate** | `.../request-outcome/gate.ts` | `canOfferSaveAsFunction(fn, report)` — returns **allowed, or refused with the failing check named**. Consults `verifyFunction`'s report; **never re-derives the checks** |

**Why `shared` and not `ai-assistant`.** The law in this repo is **`ai-assistant → shared`, never the
reverse** (`shared/src/modules/overrides.ts`). The taxonomy is about what the *platform* offers a user,
not about how the model is called — so it belongs in `shared`, and the AI side may consume it. Putting it
in `ai-assistant` would make the non-AI layers (the Save UI, the lifecycle) depend on the AI package.
**Measured precedent:** this exact mistake was made and corrected for G-17's wire.

### 2b. The three rules the triage encodes

1. **The platform proposes; the user disposes.** The triage returns a *proposal* with a reason, never an
   action. This is the owner's own rule (*"answers, not menus"* — the platform takes the sensible
   default and states it) combined with the vision's (`AI-assisted design → … → Approval`).
2. **A schema change is never *performed* by the triage — only *classified*.** The triage may propose
   `model_proposal`; it may not apply one. Applying one is the §1b gate's job, and that gate is not this
   item (see §1e). **This is the fence.**
3. **"Answer once" is visibly not a Function.** §2 Q2 decides outcome 1 keeps the *thread* but has no
   name, no permission row and no library entry. The type must make that structural — a `ephemeral_answer`
   carries no `FunctionPlacement`, so it *cannot* be given a menu entry by mistake.

### 2c. The `not_checked` trap — and why it gets its own test

`VerificationReport.passed` is `true` when **no check failed**, and `not_checked` checks **never fail** a
report (`verify.ts:214`). That is correct — but it means **a report can be green while
`authorization_valid` was never run** (G-04 does not exist). If the Save gate only asked
`report.passed`, it would offer to save a Function whose permissions were **never established**.

**So the gate must report `not_checked` alongside the verdict, and the save path must record it** —
which is exactly what `UserFunction.verification.notChecked` and `lifecycle.ts:159` already do.
**This is the subtlest thing in G-21 and it gets a dedicated test: a green report with an unchecked
authorization must not read as "fully verified".**

---

## 3. What would break it — checked against the artefacts

| Risk | Measured answer |
|---|---|
| **A second copy of the §46 checks** | The gate **calls** `verifyFunction` and reads its report. It does not contain a check name it did not get from the report. A test asserts the gate's refusal message carries the **failing check's own detail**, so a re-implementation would be visible. |
| **Overloading the existing `intent` enum** | §1d: `intent: 'tool' \| 'general_chat'` is a dispatcher axis and is **left untouched**. The taxonomy is a separate concept. A grep-based test asserts the triage does not import or widen `RouteResultSchema`. |
| **The triage performing a schema change** | Rule 2. The triage's return type has **no channel** for an applied change — it returns a proposal and a tier. A schema change can only proceed through the §1b gate, which G-21 does not build. Mutation-tested: give the triage a "performed" path → the type test fails. |
| **"Answer once" drifting into "a Function"** | Rule 3 — `ephemeral_answer` carries no placement, so a menu entry is a **type error**, not a convention. |
| **`not_checked` reading as a pass** | §2c — the gate surfaces `notChecked` and the save path records it. Dedicated test. |
| **Free-text grouping** | The placement type is built on `isCanonicalId` (`canonical-id.ts:50`), so a grouping that two people spell two ways is **refused at construction**, not at render. |
| **Layering** | The new module imports only from `shared` (`user-function`, `kernel`). It imports **nothing** from `ai-assistant`. Verified by grep in the test pass. |

## 4. The honest limits of this document

- **No schema-mutation IR kind is built** (§1e). Outcome 2 is **recognised and gated but not
  emittable**. Saying "G-21 completes the three outcomes" would be an overclaim; it completes the
  **taxonomy and the fence**, which is what unblocks the rest safely.
- **No UI is built.** The gate is a function the Save button will call; wiring a real button is
  separate work, and the architecture document's "disabled with the failing check named" is a UI
  statement this item makes **possible**, not **done**.
- **No database row.** `document.ts:28` already names the trigger: *"the Function's remaining shape …
  is G-07's"*. G-07 is done, so the row is **startable** — but it is not G-21's, and building it here
  would widen the blast radius of a taxonomy change into a migration.
- **`authorization_valid` stays `not_checked`** until G-04 exists. That is honest, recorded, and
  deliberately not papered over.

---

## 5. Done when

1. The three outcomes are **typed and distinguishable**, and `ephemeral_answer` **structurally cannot**
   carry a placement.
2. The triage returns a **proposal + reason + tier**, has **no path that performs** a schema change, and
   leaves the existing `intent` enum untouched.
3. The Save gate **refuses** on a failing `verifyFunction` report (naming the failing check) and
   **permits** on a passing one — and **surfaces `notChecked`** so a green-but-unchecked report is not
   read as fully verified.
4. **Every guard is mutation-proven** — each one seen red when the guard is removed, restored by byte
   copy with `md5sum -c`.
5. Green on the real check (`yarn test` in `shared`, and the app typecheck), **committed**, with the
   record written into `JOURNAL.md`, `BACKLOG.md`, `NEEDS-YOU.md` and `workspace/COOKBOOK.md`.

---

## 6. What changes in the docs, and when

| File | Change | When |
|---|---|---|
| This document | the step-1 research record; corrected as the build proceeds | now |
| `BACKLOG.md` G-21 row | points here for the plan; status moves from *startable* to *in progress* | at build |
| `workspace/COOKBOOK.md` | the build steps and the "done when" test, in the sprint's own section | at build |
| `JOURNAL.md` | what was built and what it falsified | at build |
| `ARCHITECTURE-request-outcomes.md` §5 register | the three "WILL DO" rows get their outcome | at build |
| `NEEDS-YOU.md` | only if something needs the owner — **currently nothing does** | at build |

**Next:** the build (§2a's three files), tests (§3's mutation proofs), then the record.
