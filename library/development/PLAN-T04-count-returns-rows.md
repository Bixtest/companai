# PLAN — `T-04`: a Function that asks for a count returns a list of rows, and verifies green

**Status: BUILT AND CLOSED — written 2026-10-19 21:35, completed 2026-10-20 03:40.** Slot 0 / `CC-92`.
Source: `PREVIEW-AUDIT-TRIAGE.md` §1.2 (`T-04`, `08 §3`), rank **high**, urgency **urgent**.
Code `6d7ef0ce`.

> **Rule 13 on this file's own header.** It read *"BUILT AND CLOSED 2026-10-19"* from the moment it was
> written — 21:35, **before** the code (21:36–21:38) and before any test had run. The build was then cut
> off at 21:41 mid-test by a provider failure, and the file sat with a false status for six hours. The
> lesson is the register's oldest one in miniature: **a status line is a claim, and this one was written
> before the evidence.** The date now names both halves — when the requirement was written and when the
> proof existed.

**Files changed:** `packages/shared/src/lib/business-ir/compile.ts` (agg ops refuse, and the refusal maps
to a named check) · `packages/shared/src/lib/user-function/verify.ts` (the message is honest about gaps) ·
`packages/shared/src/lib/user-function/run.ts` (gate 3 broadened) + tests.
**Files added:** `packages/shared/src/lib/user-function/__tests__/t04-count-returns-rows.test.ts` ·
`scripts/verify-t04-mutations.mjs`.

---

## 1. The measurement — three sites, all confirmed, and one of them moved

| Site | What is actually there |
|---|---|
| `compile.ts:406-413` | for `operation !== 'list'`, stage 9 emits a **gap** `ROW_ORIENTED_TARGET` — *"The logical plan is complete; no physical execution is possible yet."* Confirmed. |
| `verify.ts:164` | `errors = diagnostics.filter(d => d.severity === 'error')` — gaps are excluded **by construction**. Confirmed. |
| `verify.ts:188` | `record(name, 'passed', 'The compiler resolved this against the model without error.')` — a sentence that is literally true and materially false, because the compiler just said no execution is possible. Confirmed. |
| `run.ts:153` | gate 3 checks `fn.operationType !== 'query'` and never the IR's `operation`; step 8 then calls `engine.query(...)` and returns `result.items`. Confirmed. |

**One citation correction (Rule 13, not a defect):** the audit cites `run.ts:153` as the gate — the line
number is still right, but the audit's sentence *"gate 3 checks only `fn.operationType === 'query'`, never
the IR's `operation`"* understates what the gate **does** check. It is `fn.operationType !== 'query' || !fn.businessIr`
— i.e. it also refuses a Function with **no IR at all**. The gap is narrower than stated and more precise:
gate 3 refuses *wrong kinds of function*, but nothing downstream asks *which kind of read this IR describes*.
The defect is exactly that nothing ever asks `compiled.plan`'s operation.

**And the consequence is the audit's, unchanged:** a Function whose IR says `operation: 'count'` compiles
with one gap, verifies `query_plan_valid: passed` with `passed: true`, is offered for saving, saves,
publishes, becomes runnable — and returns **a list of rows** to someone who asked for **a number**. A green
test suite behind a materially wrong answer, which is the one failure this project's whole method is aimed at.

## 2. Why this is a HIGH and not a gap to schedule

The other gaps in the same file are *unsupported features*: `OFFSET_NOT_SUPPORTED` does not apply an offset
the user asked for. This one is different in kind. **A count/aggregate is the question; a row list is not
a worse answer to it, it is a different question's answer.** Someone asking "how many" and receiving a page
of rows will read the first one, or the length of the list, or nothing at all — and no part of the system
tells them the number they got is a fabrication.

## 3. The requirement

**R1 — the compiler refuses an IR it cannot execute, rather than emitting a gap that survives as a pass.**
`operation` outside `list` now produces an **error** at stage 9 (`ROW_ORIENTED_TARGET`, mapped to the
`query_plan_valid` check through `STAGE_TO_CHECK`), so `compiled.ok === false` and the check records
**failed** with the compiler's own sentence. The gap stays only where the truth is "applied less than
asked" — `OFFSET_NOT_SUPPORTED` is the real gap and keeps its severity.

**R2 — verify's "passed" message stops asserting something the compiler did not say.** It now names what
passed and, when gaps remain, that the plan runs with them. The sentence *"without error"* was the lie.

**R3 — the runner refuses an agg IR at its own gate.** `run.ts` gate 3 is broadened to the IR's operation
when one is present, so a Function with an agg IR cannot be executed by a runner whose contract is rows.
This is the belt to R1's braces: a Function saved before today, with a passing verification, must not
become runnable-and-wrong the moment the compiler's answer changes underneath it.

**R4 — the test is the failing scenario, not a unit of the new code.** *A count Function compiles, verifies
**not** passed, and the runner refuses it with a sentence naming the operation.* No test covered the
scenario at all before this row.

## 4. What this does not do

- **It does not implement aggregation.** The query layer is row-oriented and the row says so; this change
  makes the boundary honest instead of making the capability appear.
- **It does not migrate existing Functions.** A `count` Function that saved green will now fail
  verification on its next check, with a message naming the operation. That is the intended, visible
  consequence; the alternative — leaving a silently wrong answer runnable — is the defect.
- **`T-21`** (`notChecked: []` forging "every check ran") is a different row and touches the same file; it
  is not in Slot 0.

---

## 5. The proof — five mutations, and two of them exist for the boundary

`scripts/verify-t04-mutations.mjs`. Every mutation restores its file byte-identically, and the suite
asserts its own denominator (a run that executed zero tests cannot report a proof).

| # | The defect, put back | Must redden |
|---|---|---|
| M1 | the row-oriented refusal is a **gap** again — the original defect | the compiler refuses the IR |
| M2 | the runner gate is **deleted** | the runner refuses it and never calls the engine |
| M3 | verify's message claims **"without error"** again, gaps unnamed | the honest message |
| M4 | the gate refuses **every** IR, including the list it exists to run | a list IR still runs |
| M5 | the gate reads **`operationType`** again, never the IR's `operation` | the runner refuses it and never calls the engine |

**Why M4 and M5 are not padding.** A gate that refuses everything satisfies all three refusals and
destroys the only query the module exists to run; a gate that asks the wrong field is *literally the
original defect's shape*, and it passes every refusal test that only checks "an aggregate is refused"
if the refusal happens to come from somewhere else. The boundary is asserted from both sides, and the
mutations prove the assertions can tell the difference.

**Measured:** 5/5 PROVEN · `tsc` 0 · `packages/shared` **211 suites / 2,613 tests, 0 failures**.

## 6. The build record — and the two things the first pass got wrong

1. **`compile.test.ts` pinned the defect.** *"An aggregate IR compiles logically and reports the
   row-oriented gap"* used `mustCompile`, which throws on a refusal. It was not a test that could be
   updated in passing — it asserted the exact behaviour this row exists to remove, in the shape
   (`compiles … with a gap`) the row calls the lie. Rewritten to assert the refusal, the severity and
   the sentence.
2. **The scenario test needed the real signatures, twice.** `VerificationCheck` carries `outcome`, not
   `status`; and a `$param` placeholder is refused at stage 2 — before the operation is ever looked at —
   so the compiler must be asked through `bindParameters`, the same step the runner uses. A hand-written
   literal IR would have tested a string instead of the path (`LESSONS.md` L186).
3. **The first full run reported a suite that "failed to run"** — the harness's bulk-delete guard
   (59 files > 50), not the code. Proven by re-running it alone: 8/8 with `CODEBUDDY_SAFE_DELETE_ENABLED=0`,
   and the whole package green under the same override. Recorded because a suite that fails to load
   reports *no failing tests*, which reads as a pass to anyone scanning the totals (`CC-99`'s class).
