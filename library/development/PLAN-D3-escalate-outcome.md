# PLAN — `D3`: the `escalate` outcome on the guard result

**Written:** 2026-10-07 · **Task:** `D3` (BUILD-ORDER Phase 0, item 3) · **Status:** IN PROGRESS
**Protocol:** the owner's 6-step work protocol (build from docs, tick from code; fact-check first).

---

## 1. The task, and where it comes from

**BUILD-ORDER.md §2 line 102 (verbatim):**

> **D3 — the guard result is binary; there is no "escalate".** `MutationGuardResult.ok` is a boolean. A
> guard can **allow** or **block** — it cannot say *"allowed, but a person must review"*. The owner's
> whole grammar needs a third outcome. Without it, every `review_required` decision has nowhere to go but
> "block", which turns the dictionary's quiet tier back into a hard stop.

**BUILD-ORDER.md Phase 0 item 3 (verbatim):**

> **D3** — add the `escalate` outcome to `MutationGuardResult` and route it into the existing
> pending-approval machinery (`authority_pending_acts`).

## 2. The relevant points from `platform_points.md` (owner's step 2)

| Point | Line | Why it is in scope for D3 |
|---|---|---|
| `D3` — the `escalate` outcome on the guard result | §G | the task itself |
| `S11 (= SD-4)` — structural permissions explicit, per object and per verb | §G | the grammar whose `review`/`approval` levels need a non-binary guard outcome |
| `S12` — the actor type is part of every structural decision | §G | the outcome must carry *who* asked (human vs AI) for the pending act |
| `C4` — Authorization engine (PARTIAL) | §A | the resolver that will eventually produce the decision the guard routes |
| `C6` — Command / action contract (risk · approval · idempotency) | §A | approval is named in the contract; D3 is its guard-level half |
| `Never 3` — no business mutation outside the typed command path and its approval | §D | the invariant D3 makes reachable for guarded writes |
| `G-16` — a security-event taxonomy (where denials/**escalations** land) | §G | escalate is a security event; D3 creates the first producer |
| `22` — bulk approval with a diff | §G | consumes what D3 lands |
| `23` — deputy cover and standing approvals | §G | consumes what D3 lands |
| `24b` — a screen for the two per-tenant authority settings | §G | the surface decision the escalate route reads |

**Task requirement = §1 + §2 combined:** *Add a third, non-blocking `escalate` outcome to the guard
result that a guard can return instead of `ok:false`, carrying enough for a pending act
(`authority_pending_acts`) to be created; route it through the existing guard runner and the
pending-approval machinery; keep every existing caller working unchanged; and honour the actor type
(`S12`) and the structural levels (`S11`).*

## 3. Fact-check of the code (owner's step 4)

**What exists (read, not assumed):**

- **`MutationGuardResult`** — `packages/shared/src/lib/crud/mutation-guard-registry.ts:44`.
  Fields: `ok: boolean`, `status?`, `message?`, `body?`, `modifiedPayload?`, `shouldRunAfterSuccess?`,
  `metadata?`. **Binary.** No `escalate`.
- **`runMutationGuards()`** — same file, `:90`. Returns `{ ok, errorBody?, errorStatus?,
  modifiedPayload?, afterSuccessCallbacks }`. On `!result.ok` it returns early with the body. **Binary.**
- **`runRouteMutationGuards()`** — `packages/shared/src/lib/crud/route-mutation-guard.ts:119`.
  Returns `RouteMutationGuardResult = Blocked | Passed` (`:73`). Blocked carries
  `{ ok:false, errorStatus, errorBody, response }`; Passed carries `{ ok:true, modifiedPayload?,
  runAfterSuccess }`.
- **The level vocabulary already exists** — `packages/shared/src/lib/request-outcome/tier-source.ts:72`:
  `StructurePermissionLevel = 'straight' | 'review' | 'approval' | 'never'`, plus `TIER_TO_LEVEL`
  (`:75`) and `DEFAULT_TIER_SETTINGS` (`:115`, fallback `approval`, failing closed). **So "review" is
  already a first-class word in the codebase — it just has no path through the guard.**
- **The pending-approval machinery exists** — `authority_pending_acts` is a real table
  (`packages/core/src/modules/auth/data/entities.ts` + three migrations), and the queue UI is documented
  and implemented (`workspace/knowledge/approvals-queue.md`; gates A1–A4).

**Prerequisite that must be functional first (checked):**

- **`D0`** (registry delivers guards) — ✅ done, mutation-proven.
- **`D1`/`SD-3`** (tier mapping is a setting, failing closed) — ✅ done; `tier-source.ts` reads it.
- **`D2-wide` / `D2-gap`** (routes actually run guards) — ✅ done (0 unguarded; re-measured §5).

**Impact surface (what the change can touch) — measured:**

- **28 non-test call sites** of `runRouteMutationGuards` across modules (ai_assistant, attachments,
  audit_logs, auth, business_rules, communication_channels, configs, currencies, dashboards, data_sync,
  dictionaries, directory, entities, feature_toggles, inbox_ops, notifications, perspectives, planner,
  progress, …). **Every one must keep working.** A change to `RouteMutationGuardResult` must be
  **additive**, never a re-shape.
- The CRUD factory path (`packages/shared/src/lib/crud/factory.ts` → `collectAndRunGuards`).
- One UI test consumes the exact blocked/passed shape:
  `packages/core/src/modules/resources/backend/resources/__tests__/guarded-mutations.test.tsx`.
- The guard-runner test: `packages/shared/src/lib/crud/__tests__/route-mutation-guard.test.ts`.

## 3b. Decisive fact-check finding (read this before designing)

**The pending-approval routing ALREADY EXISTS — but on the command path, not the guard path.**

`packages/core/src/modules/auth/commands/interceptors.ts` (the `auth.authority-command-gate`) already:

- resolves a `Decision` from `authorityEnforcement.decideFor(subject, capability, scope, ctx)` (`:167`);
- if the decision is `!ok` → `pendingActs.hold({ commandId, capabilityId, commandInput, actorId,
  actorKind, decision })` then **throws `ActHeldForApprovalError`** → the act is queued, not run (`:212`);
- gate `A3` (`COMMIT_GATE`) → `holdUntilCommit(...)` + throws (`:182`);
- gate `A4` (`REVIEWED_GATE`) → runs, then files for review in `afterExecute` (`:201`);
- and it only runs when `await enforcement.modeFor(tenantId) === 'enforce'` (`:146`).

The gates exist in `shared/src/lib/authority/decision.ts` as `AutonomyGate` (`A0`–`A5`) with
`GATE_MEANING` and `GATE_RANK`; `HELD_GATES = {'A1','A2'}`.

**The consequence for D3 — stated honestly:** the BUILD-ORDER line *"add the `escalate` outcome to
`MutationGuardResult` and route it into `authority_pending_acts`"* cannot mean "make the *guard* create a
pending act", because a mutation guard has **no `commandId` and no `capabilityId`** — and `hold()` needs
both (it replays `commandId` with `commandInput` on approval). The pending-act machinery is fed by the
**command path**, which is where `Decision`s are produced.

So D3's real, honest content is two things:

1. **The guard result gains a non-binary third outcome, and the runner/wrapper carry it faithfully.**
   Today `runMutationGuards()` returns early on `!result.ok` with a body+status; a guard that wants
   *"needs review"* has nowhere to say it and must abuse `ok:false` (a hard stop). D3 adds an
   **`escalate`** result so the guard can say *"do not run this yet; a person must decide"* **without**
   destroying the distinction between *blocked* and *held*.
2. **The route wrapper surfaces the escalate (non-blocking, non-committing)**, and points the caller at
   the existing approval route — **it does not silently mutate and it does not create a pending act
   itself** (the guard lacks the command identity to do that honestly).

Everything the command path already does (A1–A4 → pending act) is **not re-implemented** — D3 must not
duplicate it. The command path keeps owning the pending-act creation; the guard path gains the vocabulary
to *defer to* it.

**Non-negotiable safety rule:** escalate must **never** mean "allowed". It means *"not performed yet —
a person decides."* A write must **not** commit on an escalate. That is the fail-closed direction.

## 4. The honest scope decision (stop-and-think, not scope creep)

**In scope for D3:**

1. an **`escalate`** variant in `MutationGuardResult` (the guard's own return shape) — additive;
2. a matching **`Escalated`** variant in `RouteMutationGuardResult` (the route's shape) — additive;
3. the **runner** (`runMutationGuards`) carrying an escalate through instead of coercing it to a block;
4. the **wrapper** (`runRouteMutationGuards`) returning the escalate as a non-committing result, and
   **not** calling `runAfterSuccess` (nothing committed, so nothing to run after);
5. tests: RED-then-GREEN, proving escalate ≠ block ≠ pass.

**Out of scope (named, so it is not smuggled in):**

- the full `(object · verb · actorType · level)` grammar — **S11 / SD-4**;
- the manage screen — **SD-5**;
- wiring the resolver as *the* enforcement point — **S-02**;
- changing the command-path pending-act routing — it already works; D3 does not touch it;
- making guards create pending acts — **not honest** (the guard has no command identity).

**Design constraint from the impact surface:** `RouteMutationGuardResult` is consumed at **28 non-test
call sites** and one UI test. The change must be **additive** — existing `ok:true`/`ok:false` branches
must keep compiling and behaving identically. An escalate is a **new** discriminant, never a re-shape of
`ok`.

## 5. Prerequisites — confirmed by measurement (2026-10-07)

- `node analysis/d2-gap/measure.js` → **256 write verbs, 0 unguarded** (D2-gap complete).
- `guards.generated.ts` non-empty (D0).
- `tier-source.ts` present with the four levels and fail-closed default (D1/SD-3).

## 6. The plan

*(to be filled once the design above is confirmed and the code change is drafted)*

## 7. Verification protocol

*(the standard: RED-then-GREEN mutation proof; full-suite re-run; hostile-critic pass; re-measure)*
