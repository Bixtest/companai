# RESUME POINT — where we are, and the plan to get back here

> **Last written 2026-10-08**, at the owner's explicit instruction: *"save exactly where you are and what
> the plan is to do next and the context so you can easily get back to that point."*
>
> This file is a **parking space**, not a roadmap. It is meant to be read *first* by a new session that has
> to resume. **It was written for CC-24, and CC-24 is now DONE** — so §2 below is a record, not a
> to-do. **The honest next slice is named in §3, and the one place that says "what we are doing now" is the
> `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md).** Treat this file as stale the
> moment the box and this file disagree — the box wins.

---

## 1. What was just completed (do not redo)

**CC-24 — the custom *entity*'s HTTP reactivation is now gated.**
- **Code:** Repo 2 (`workspace/starting-kit`), branch `main` — `entities/api/entities.ts`,
  `entities/lib/register.ts` (the export), and two test files.
- **Docs:** Repo 1, branch `master` — the registers and the plan (§9.11/§9.12/§9.13 of `PLAN-SD-1.md`).
- **Proven:** both packages `tsc --noEmit` exit **0**; **`core` 627 suites / 5438 tests, 0 failures**;
  `entities` module **42 suites / 335 tests**; `auth` **80/699**; `shared` permissions **3/59**.
  **6 mutations RED-then-GREEN**, every restore **md5-verified**. **Ninth hostile-critic pass** (separate
  agent) run — it found **nothing falsifiable** across all nine claims.

**What CC-24 added, in one line.** `entities/api/entities.ts` now detects a **reactivation** from the
before-state it already holds (`!isActiveEntity(ent) && (input.isActive ?? true)`), reads the CC-17
decision carrier (a **malformed** header is a **400** before anything is touched), runs the same
`evaluateStructureChange` on the same `entityDefinitionSurface`, **refuses fail-closed (422, nothing
written)**, and writes the records **after the flush** through the same `writeFieldPermissionGrant` every
create path uses. `isActiveEntity` is exported now (it was module-private).

**And it closed the honest limit it was written against.** The `★ ACTIVE TASK` box said *"the ungated
entity reactivation"* — that phrase is now struck through in the box, the plan (§10 item 9), `BACKLOG.md`,
`platform_points.md` and `BUILD-ORDER.md`.

---

## 2. The two defects CC-24's *own* run found (read this — it is the lesson)

The mutation pass did not merely confirm the change; it found **two real defects in the harness**, and both
were mine:

1. **The `deletedAt` clause of `isActiveEntity` was unpinned — in *both* consumers.** A mutation dropping
   `ent.deletedAt == null` left CC-24's suite **10/10 GREEN** and CC-21's primitive suite **8/8 GREEN** —
   **0 RED**. The clause is the only reader of a row with `deletedAt` set but `isActive` still true, and
   that row is reachable without a caller doing anything odd (the install primitive sets `isActive` and
   clears `deletedAt` as **two statements**). **FIXED:** one test in each consumer; re-measured, the
   mutation now gives **1 RED in each suite**.
2. **The suite leaked into the `globalThis`-backed mutation-guard store and broke an unrelated suite,
   flakily.** `registerMutationGuards` **replaces the store wholesale** and writes it to `globalThis`, and
   no jest config sets `resetModules` — so the registration outlived the file, and the guard it registered
   **re-armed another file's shared grant mock**. Observed: the first full-suite run failed **exactly one**
   test (the refusal case); the next two runs passed. **FIXED here** (capture the prior store, restore it in
   `afterEach`) — re-applying the leak reproduces the `1 failed`, and the restore removes it.
   **WIDENED into `CC-29`:** the *class* is not mine — **any** suite that registers a guard can break
   **any** other, and I could **not** reproduce the failure on demand (the whole `entities` module
   **in-band** is 335/335 even with the leak re-applied). That is stated as an open item with a callback,
   **not** ticked green.

**The lesson to carry forward** (it is the standing rule, twice paid for): **a mutation that produces no
RED is a finding, not a pass.** And **a green suite is not evidence until you have asked what would make it
red.**

---

## 3. What is open (the honest remaining list)

| | gap | status right now |
|---|---|---|
| **CC-20** | a custom *field*'s records have no enforcement consumer | blocked on **`G-04`** (the data axis) |
| **CC-23** | create-branch double-insert | needs a **migration** (deferred; unreachable in normal operation) |
| **CC-25** | a structure-permission decision is not authorised against the actor | **CONFIRMED by the owner — a ROLE PERMISSION** (a build, not open policy) |
| **CC-29** | the `globalThis`-backed test store has **no reset**; one full-run failure unexplained | **startable now** — export `resetMutationGuards()`, call it in `packages/core/jest.setup.ts`, run the full suite ≥5× |
| **CC-26** | the "AI user" tick has no UI | **approved — startable now** (a front-end change against an existing server contract) |
| **CC-27** | an AI user cannot be *bound* to an agent | **approved — needs `AH-1` first** |
| **CC-28** | cross-tenant `updated_at` read-back (`records.ts:336-338` omits `tenant_id`) | **startable now** (MEDIUM; a two-line fix) |
| **SD-4 / G-04** | the per-verb structural grammar / the data-axis row | blocked on **`G-04`** |

**The next slice is CC-29 or CC-26 — both startable now, and the choice is a scheduling call, not a
policy call.** CC-29 is the one with a *name attached to a suspicion*: it is the only open item that can
invalidate a green gate, so if the next session wants the foundation certain before adding to it, do CC-29
first. `BUILD-ORDER.md` §order and the `★ ACTIVE TASK` box are the arbiters.

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
  **lines**. Both traps are written up in `analysis/git-diff-blob-vs-worktree-2026-10-08/FINDINGS.md`, and
  both produced a **false finding** before they were caught.
