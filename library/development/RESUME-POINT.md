# RESUME POINT — where we are, and the plan to get back here

> **Last written 2026-10-08 (CC-26)**, at the owner's explicit instruction: *"save exactly where you are and
> what the plan is to do next and the context so you can easily get back to that point."*
>
> This file is a **parking space**, not a roadmap. It is meant to be read *first* by a new session that has
> to resume. **It was written for CC-26, and CC-26 is now DONE** — so §1–§2 below are a record, not a
> to-do. **The honest next slice is named in §3, and the one place that says "what we are doing now" is the
> `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md).** Treat this file as stale the
> moment the box and this file disagree — the box wins.

---

## 1. What was just completed (do not redo)

**CC-26 — the "AI user" tick now exists in the API-key create form.**
- **Code:** Repo 2 (`workspace/starting-kit`), branch `main` — `api_keys/backend/api-keys/create/page.tsx`
  (the `isAiWorker` checkbox, the `aiWorkerNotice` custom field gated by `visibleWhen`, the group listing
  both, and the `onSubmit` conversion), the extended test file (now **7/7 green**), and 3 keys added
  **in place** to all four i18n files (`{en,de,es,pl}.json`, `3 0` each).
- **Docs:** Repo 1, branch `master` — the registers (`COMPLETION-CALLBACKS.md`, `BACKLOG.md`,
  `platform_points.md`, `RESUME-POINT.md`, `JOURNAL.md`).
- **Proven:** `tsc --noEmit` exit **0** on `core`; the `api_keys` module **6 suites / 51 tests green**; the
  full `core` suite **green six consecutive times** — **627 suites / 5443 tests / 0 failures** each (the +5
  over CC-29's 5438 is exactly this slice's new tests). **3 mutations RED-then-GREEN**, restores verified by
  `md5sum` against `651d4a34f09ff97ae4017cb5bd58aa28`.
- **The eleventh hostile-critic pass** (separate agent, a command per claim) **held all seven claims**,
  naming what it tried to break and how each survived.

**What CC-26 added, in one line.** A `checkbox` field `isAiWorker` on the create form, a `custom` notice
revealed **only when it is ticked** (`visibleWhen: { field: 'isAiWorker', equals: true }`), and an `onSubmit`
conversion `if (values.isAiWorker === true) { payload.principalKind = 'ai_worker' }` — so an **unticked**
form sends **no `principalKind` key at all**, and the form-only fields (`isAiWorker`, `aiWorkerNotice`) never
reach the wire.

**A premise corrected by measuring, not assumed.** The server schema (`api_keys/data/validators.ts`) has
**no `.strict()`**, so zod would **strip** an unknown key rather than refuse it — the page therefore
converts deliberately instead of relying on a rejection. (My first comment claimed the schema was "strict
about unknown fields"; the measurement disproved it, and the comment was corrected — rule 13.)

---

## 2. The premise CC-29's own measurement *disproved* (read this — it is the lesson)

The `CC-29` row — and `CC-24`'s own code comments — said the store **"outlives a test file into the next
one"** via `globalThis`. **That is false in this jest config (`testEnvironment: 'node'`).** Measured with a
two-file probe: file A registers a guard and sets the key (`true`); file B reads it as **`undefined`**,
count **0** — **even with the reset switched off**. Jest gives each test *file* its own realm.

**The real leak is within a file:** a guard registered in one test is still returned at the start of the
**next test in the same file** (measured **1**; **0** with the reset wired). The fix was right; the *story*
was wrong — and I had already measured it false before writing it into three comments across two repos.

**The three defects the tenth critic found (all in my words, none in the code):**
1. the disproved cross-file mechanism, shipped in three comments — **all corrected**;
2. a wrong count ("22 of the 23") — measured **18** test files under `packages/core/src` (25 repo-wide);
3. a self-contradiction ("before each test" vs "before each test file") — the wiring is per **test**.

**The lesson, now a working rule:** *when a measurement falsifies a premise, correct it **everywhere it was
copied**, not only in the file being edited.* Combined with the standing rule this project keeps re-paying
for: **a mutation (or a measurement) that produces no RED/difference is a finding, not a pass.**

---

## 3. What is open (the honest remaining list)

| | gap | status right now |
|---|---|---|
| **CC-28** | cross-tenant `updated_at` read-back (`entities/api/records.ts:336-338` omits `tenant_id`) | **startable now** (MEDIUM; a two-line fix + tests) |
| **CC-20** | a custom *field*'s records have no enforcement consumer | blocked on **`G-04`** (the data axis) |
| **CC-23** | create-branch double-insert | needs a **migration** (deferred; unreachable in normal operation) |
| **CC-25** | a structure-permission decision is not authorised against the actor | **CONFIRMED by the owner — a ROLE PERMISSION** (a build, not open policy) |
| **CC-27** | an AI user cannot be *bound* to an agent | **approved — needs `AH-1` first** |
| **SD-4 / G-04** | the per-verb structural grammar / the data-axis row | blocked on **`G-04`** |

**The next slice is CC-28 — startable now.** CC-26 is done. The `★ ACTIVE TASK` box posts the next item;
`BUILD-ORDER.md` and the box are the arbiters.

---

## 4. The two organisational questions — ANSWERED, and no longer in flight

Both were raised by the owner on **2026-10-08** and are now **answered and confirmed**; **do not re-open
them**:

1. **AI users as first-class users.** The platform's AI **actor** is already a first-class principal — one
   vocabulary (`human`/`ai_worker`/`service`/`system`), persisted as a real DB row
   (`api_keys.principal_kind`). What was missing is the **UI** (CC-26) and the **agent ↔ AI-user binding**
   (CC-27). *The agent itself must stay code-declared* — a DB-only agent is invisible to `runAiAgent*`
   (measured).
2. **Tenant database isolation.** Single DB, single schema, a nullable `tenant_id` column, isolation in the
   **app layer** — no RLS, no schema-per-tenant, **no per-tenant DDL**. A per-tenant structure change is a
   **row** (JSONB `doc`), so it cannot leak into another tenant's schema. One real cross-tenant read-back
   existed and is scheduled as **CC-28**.

**Read `analysis/ANSWER-2026-10-08-organisational-questions.md` before touching CC-25/CC-26/CC-27/CC-28** —
it is the decided-position file, with the evidence, the hostile-critic results, and §3 on why CC-25 is a
role permission rather than a new mechanism.

---

## 5. The standing rules in force (they do not change)

- Reply in **English**; every claim carries an observation; **two routes or it is not a finding**.
- **Never `git add -A`** — stage by explicit path.
- **Commit in BOTH repos**, but only if that repo's files changed.
- A partial build is **scheduled** in `COMPLETION-CALLBACKS.md` (rule 8) — never merely noted.
- **Own the code you touch fully, and challenge the task before executing it** (rule 9).
- **Rule 0:** `platform_points.md`'s ticks come **ONLY from the code** — never from prose.
- **Rule 10 (the task-package workflow):** (a) study references; (b) pick platform_points; (c) write the
  combined requirement; (d) **prove prerequisites flawless FIRST — in code, not docs**; (e) trace impact
  and update the plans; (f) execute under the TOTAL quality protocol (hostile-critic as a **separate
  agent**, RED-then-GREEN mutation proof with **md5-verified restores**, two-route re-measure, green gate,
  then docs).
- **Two sources of truth:** `BACKLOG.md` + `BUILD-ORDER.md`.
- **Rule 11:** when a question is the **owner's to decide**, do not resolve it alone — either ask, or leave
  it explicitly open. (*"A question I am holding is not yours to close."*)
- **Rule 12 (paid for twice, 2026-10-08):** **never grep a rendered diff, and never compare bytes across
  the worktree/git boundary.** Ask the object store for the file (`git show <rev>:<path>`) or the path's
  history (`git log -1 -- <path>`); `git diff --stat` answers only *"what differs from HEAD"*. On this host
  `core.autocrlf=true`, so worktree **CRLF** vs blob **LF** makes a raw byte count meaningless — compare
  **lines**. Both traps are written up in `analysis/git-diff-blob-vs-worktree-2026-10-08/FINDINGS.md`.
- **Rule 13 (paid for 2026-10-08, CC-29):** **when a measurement falsifies a premise, correct it
  everywhere it was copied** — not only in the file you are editing. A disproved claim that stays in a
  comment is a defect even when the code is right.
