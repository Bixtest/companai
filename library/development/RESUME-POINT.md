# RESUME POINT — where we are, and the plan to get back here

> **Written 2026-10-08, at the owner's explicit instruction: "save exactly where you are and what the
> plan is to do next and the context so you can easily get back to that point."**
>
> This file is a **parking space**, not a roadmap. It is meant to be read *first* by a new session that
> has to resume. **Delete it (or mark it CLOSED) the moment CC-24 is done.** If you are reading it and
> CC-24 is already built, this file is stale — delete it.

---

## 1. What was just completed (do not redo)

**CC-17 — the `decided` outcome of the structure-change gate is now reachable and writable.**
- **Code:** Repo 2 (`workspace/starting-kit`) commit **`f0c171d`** — 14 files (12 modified, 2 new).
- **Docs:** Repo 1 (`C:/Users/Ramzi/Downloads/companai`) commit **`3afebd3`** — 7 files.
- **Both trees verified clean** (`git status --porcelain` = 0 lines each).
- **Proven:** both packages `tsc --noEmit` exit 0; `core` 626 suites / 5427 tests, 0 failures; `shared`
  permissions green; entities api subtree 17 suites / 148 tests. **4 mutations RED-then-GREEN**, every
  restore **md5-verified**. **Eighth hostile-critic pass** (separate agent) run; both findings handled.

**What CC-17 added, in one line.** A caller may now *state* the permissions decision via the request
header `x-om-ext-permissions-decision` (three-way read: `absent`/`malformed`/`decision`; **malformed is a
400, never a silent default-grant**); a stated decision grants its records to the role it names
(`grantTo`, default `superadmin`). Read at the three HTTP request paths and in the entity guards.

---

## 2. The next slice — **CC-24** (start here when you resume)

**What it is.** A custom **entity**'s **HTTP reactivation** is ungated.
`entities/api/entities.ts` POST sets `operation: ent ? 'update' : 'create'` and, for an existing row,
flips `ent.isActive = input.isActive ?? true` then flushes — but the only entity gate,
`entityPermissionDecisionGuard` (`entities/data/guards.ts`), is `operations: ['create']`, so it **never
fires on a reactivation**. An entity that re-appears via HTTP therefore lands with neither the header
read nor the default applied — S2 skips it entirely.

**Why it is the next slice.** It is the **entity twin** of CC-22 (which closed the *field* reactivation
paths). The shape is already known and proven; it is **startable now** — the before-state (`ent`) is
already loaded at the route, so **no new query and no guard-contract change** is needed.

**The shape to build (CC-22's three-line pattern, applied to entities).**
1. Detect a reactivation from the before-state **at the route**: `!isActiveEntity(ent) && (input.isActive ?? true)`.
2. Read the CC-17 carrier: `readStructureDecisionFromHeaders(req.headers)`; **malformed → 400** before any write.
3. Run `evaluateStructureChange([entityDefinitionSurface(entityId)], …, decision)` at the route; **refuse
   fail-closed** (422, nothing written) when the gate refuses.
4. Write the records **after the flush** through `writeFieldPermissionGrant` (or its entity-side
   equivalent) — deciding *before* the row, granting *after* the flush.
5. Add route tests (reactivation gated; already-active **not** gated; refusal rolls back) and
   **mutation-prove** each guard RED.

**Definition of done.** Same bar as every other SD-1 slice: both packages typecheck clean; the new tests
green; **≥4 mutations RED-then-GREEN with md5-verified restores**; a **fresh hostile-critic pass as a
separate agent** that tries to break the claim and finds nothing; then update all registers and commit
**both** repos by explicit path.

**Cross-ref:** `PLAN-SD-1.md` §10, `COMPLETION-CALLBACKS.md` CC-24.

---

## 3. What is open behind CC-24 (the honest remaining list)

| | gap | status when you resume |
|---|---|---|
| **CC-24** | the custom entity's HTTP reactivation is ungated | **← do this next** |
| **CC-20** | a custom *field*'s records have no enforcement consumer | blocked on `G-04` (the data axis) |
| **CC-25** | a structure-permission decision is not authorised against the actor | **model answered by the owner (role permission); awaiting his confirm before build** |
| **CC-23** | create-branch double-insert | needs a migration (deferred, unreachable in normal operation) |
| **CC-26** | the "AI user" tick has no UI | **startable now** (owner's idea; server contract exists) |
| **CC-27** | an AI user cannot be *bound* to an agent | **needs the owner's go-ahead to schedule** |
| **CC-28** | cross-tenant `updated_at` read-back (`records.ts:336-338`) | **startable now** (MEDIUM; 2-line fix) |
| **SD-4 / G-04 / G-04** | the per-verb structural grammar / the data-axis row / the durable catalogue row | blocked on `G-04` |

---

## 4. The two organisational questions in flight (do NOT resolve these alone)

The owner raised **two critical organisational points on 2026-10-08** that **taxonomy the platform**, not
just SD-1. Their answers **change how CC-25 is answered**, so CC-25 is **PAUSED** until they land.

1. **AI users as first-class users.** Why not treat creating a new AI agent exactly like creating a new
   normal user — one form, an "AI user" tick, extra fields — so AI roles are created like normal roles and
   a normal user's functionality (create user, add customer, …) can be scripted as AI functionality with
   its own permissions? *Requires forensic research + quality control before answering.*
2. **Tenant database isolation.** Are core tables/functions shared across tenants while a change made in
   one tenant affects **only** that tenant?

**The owner's own answer to CC-25 (record it, do not over-read it):** *"Shouldn't all the relevant
functionalities relevant to that get broken down to specific permissions that we give or block from roles
we create? Then depending on the user's role, the user gets or doesn't get this or that. If that doesn't
work, get back to me so we discuss."* — This is a **direction, to be confirmed by the research**, then
enforced. It is **not yet a closed decision**, and it must be answered *after* points 1 and 2.

**Research artefacts:** `analysis/ai-users-vs-normal-users-2026-10-08/` (point 1) and
`analysis/tenant-isolation-2026-10-08/` (point 2). Both carry a FINDINGS file with measured evidence and
a hostile-critic result. **The consolidated answer is `analysis/ANSWER-2026-10-08-organisational-questions.md`**
— it is the decided-position file; read it before resuming. **Both questions are now ANSWERED; three new
items fell out of them: CC-26 (the AI-user tick UI), CC-27 (the agent↔AI-user binding), CC-28 (a cross-tenant
read-back fix).**

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
- **Rule 11 (new, this session):** when a question is the **owner's to decide**, do not resolve it alone —
  either ask, or leave it explicitly open. (The owner re-stated this: *"A question I am holding is not
  yours to close."*)
