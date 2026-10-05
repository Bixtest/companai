# Findings 02 — The work system and the execution engine

**Covers batches 2 and 3:** tasks, checkout, locks, blockers, documents, artifacts, comments, search;
and heartbeats, the wake queue, routines, schedules and recovery.

**The one-line result.** Paperclip's *task* model is not our model — we do not have tickets, and our
vision is not built around them. But the **concurrency mechanics** underneath are the best-executed
thing in the whole product, and **two of them land exactly on backlog items we already have** (`AH-3`
the durable wake queue, and the agent gateway's run lifecycle). This is the batch with the most
directly reusable engineering.

---

## 1. One live run per subject, as a database fact — **LEARN** (highest value in this batch)

**What it is.** "Who owns this work right now" is not a convention; it is a single conditional database
update that either wins or loses.

**Evidence.** `server/src/services/issues.ts:11494-11518` is the whole mechanism:

```ts
const updated = await db.update(issues).set({ … checkoutRunId, executionRunId: checkoutRunId, … })
  .where(and(
    eq(issues.id, id),
    inArray(issues.status, expectedStatuses),
    or(isNull(issues.assigneeAgentId), sameRunAssigneeCondition),
    executionLockCondition,
  ))
  .returning().then((rows) => rows[0] ?? null);
```

If it returns nothing, the loser re-reads and throws `409 "Issue checkout conflict"`
(`issues.ts:11659-11665`). **The compare-and-swap is the row update itself** — no advisory lock on the
happy path.

**Two locks, not one.** The row carries `checkoutRunId` ("claimed") **and** `executionRunId`
("executing"), with symmetric cleanup when either run reaches a terminal state
(`issues.ts:7644-7761`). A stale lock held by a dead run is adopted under `FOR UPDATE` on the row **and
both runs**, re-checked for liveness before re-pointing (`issues.ts:7496-7591`), and a background sweep
audits every stale-lock clear (`issues.ts` `stale_lock_cleared`).

**What we have.** Nothing named. Our agent half is planned (`AH-1` agent as a kernel object, `AH-3` the
durable wake queue), but the concurrency rule — *one live run per subject* — is not written anywhere.

**Verdict: LEARN, and write the rule down.** This is the mechanism that makes "a deploy does not lose
queued work" (`AH-3`) actually true. Take the CAS, the two-lock split, and the terminal cleanup.

---

## 2. Wake coalescing, deferral, and claim-before-side-effect — **LEARN** (lands on AH-3)

**What it is.** A wake request is a **database row**, not a timer. When a wake arrives for an agent that
is already running, it is **coalesced** into the running one, or **deferred** behind it, rather than
starting a second run.

**Evidence.** `server/src/modules/wake-queue/domain/policy.ts:44-61` decides `coalesce | defer |
proceed` as a pure function. The Postgres adapter merges a coalesced wake into the running run's
`contextSnapshot` (`adapters/postgres.ts:917-954`). On release, deferred wakes are drained in
`requestedAt` order and **at most one** is promoted (`application/use-cases.ts:961-985`), guarded by a
compare-and-set that moves the row off `deferred_issue_execution` **before any side effect**
(`adapters/postgres.ts:426-446`) — a lost race returns `null` and the drain moves on.

**The guard worth copying.** The drain tracks `processedWakeIds` and **throws**
`deferred_wake_not_advanced` if it reads the same row twice (`use-cases.ts:153, 162-168`). It fails
loudly instead of spinning the transaction forever.

**What we have.** `AH-3` is exactly this: *"every trigger is a database row, not an in-memory timer, so a
deploy does not lose queued work"* (`BACKLOG.md`). `AH-4` is *"routines produce work items"*.

**Verdict: LEARN.** Our backlog says *what*; Paperclip shows *how*. Take the three-way decision, the
claim-before-side-effect ordering, and the loop-invariant throw.

---

## 3. Bounding a run honestly — **LEARN**

**What it is.** Retry accounting **separates** failure retries from resource waits and productive
continuations, so a busy workspace does not burn the failure budget. Turn continuation is bounded:
default **2**, hard cap **10**.

**Evidence.** `server/src/services/execution-recovery-attempt.ts:9-13, 43-57`; `server/src/services/
heartbeat.ts:902-903` (continuation bounds) and `:827` (transient retries).

**What we have.** Nothing. Our agent half does not yet describe how many times a run may continue.

**Verdict: LEARN.** A small, cheap rule that prevents a whole class of runaway.

---

## 4. Document revisioning and anchored comments — **LEARN / IDEA**

**What it is.** A document is append-only revisions with an optimistic-concurrency guard, and comments
are **anchored to character offsets** in a specific revision.

**Evidence.** `server/src/services/documents.ts:350-359` refuses an edit whose `baseRevisionId` is not
the stored `latestRevisionId` (`409 "Document was updated by someone else"`), then appends an immutable
revision. Anchors store quote + char offsets + a selector (`document_annotation_threads.ts:33-44`); on
edit, open threads are **re-anchored** by scoring exact matches, then a fuzzy window at Jaccard ≥ 0.58,
flagging ambiguity (`packages/shared/src/document-anchors.ts:215-244`).

**What we have.** Our vision has **Annotation** (`library/ai/ai-first/05_Widgetized_Collaborative_
Workspace_Architecture.md:701, 1493, 1534`) and the specification has a **Document** with a projection
(§12). So the *concept* is ours; the *mechanism* is not.

**Verdict: LEARN** the revision guard (it is the same shape as our spec's document round-trip), and
**IDEA** the anchor-remap algorithm if we ever put comments on documents.

---

## 5. Warnings worth keeping

| Warning | Evidence | Why it matters to us |
|---|---|---|
| **Their own task doc is partly aspirational** | `doc/TASKS.md:4-5` says so; measured: no `teams` or `workflow_states` table exists, `issue_relations.type` is only `"blocks"`, `issue_comments` has no `parentId`/`resolvedAt` | Do not read a product's design doc as its behaviour. We nearly did |
| **A revision race left untranslated** | `documents.ts:350-359` reads then inserts with no row lock; a concurrent editor collides on `document_revisions_document_revision_uq` (`document_revisions.ts:24`), and the catch does **not** map it to a clean 409 (`documents.ts:501-509`) | Optimistic concurrency needs the unique-index collision handled, not only the read-check |
| **Liveness decided by regex over transcript text** | `server/src/services/run-liveness.ts:65-78` | A heuristic that decides "planning only" vs real progress will be wrong sometimes. If we need it, measure it, do not regex it |
| **Idempotency by string prefix** | `packages/db/src/schema/agent_wakeup_requests.ts:59-86` — uniqueness on literal prefixes like `question-response:%` | Correctness depending on every caller using an exact prefix is a trap |
| **A 30,460-line file** | `server/src/services/heartbeat.ts` | The cost of not extracting the policy modules in §2 of finding 01 |
