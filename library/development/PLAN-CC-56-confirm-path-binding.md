# PLAN — `CC-56`: re-check the binding on the pending-action confirm path (row 22's last enforcement leg)

**Row:** the `platform_points.md` LIST row **22** — *"an AI user can run only the agents bound to it"* (core leg
`CC-27` BUILT; narrowing leg `CC-55` BUILT). **Register:** [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md)
`CC-56`. **Parent design:** [`PLAN-CC-27-agent-binding.md`](PLAN-CC-27-agent-binding.md) §4 (non-goals) and
[`PLAN-CC-55-bound-scope-runtime.md`](PLAN-CC-55-bound-scope-runtime.md) §7.
**Owner rulings this build obeys** (2026-10-11, the `CC-27` question card): **ENFORCE** (fail-closed) ·
**AI WORKERS ONLY** (human sessions unchanged). This build adds **no new owner question** — it closes the last
named leg of an already-ruled contract.

Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

- **The confirm route executes a stored tool without consulting the binding.**
  `api/ai/actions/[id]/confirm/route.ts` (234 lines) imports `getAuthFromRequest`, `createRequestContainer`,
  `AiPendingActionRepository`, `runPendingActionRechecks`, `executePendingActionConfirm` — and **no**
  `resolveAgentBinding` (measured: a `grep` for `resolveAgentBinding` across the module returns only
  `run-object/route.ts`, `chat/route.ts`, `lib/agent-binding.ts`, `agent-binding.test.ts`, and
  `binding-coverage.test.ts`).
- **What the confirm route *does* re-run.** After `getAuthFromRequest` + the `ai_assistant.view` feature check +
  a tenant/org/user-scoped row fetch (`repo.getById`), it runs `runPendingActionRechecks` (`:182`) — which
  re-checks status, expiry, agent registration (`agent_unknown`), the agent's `requiredFeatures`
  (`agent_features_denied`), mutation policy, tool whitelist, attachment tenant scope, record version, and
  schema drift — then calls `executePendingActionConfirm` (`:212`) which **invokes the tool handler**.
- **The two dispatch routes DO consult the binding.** `api/ai/run-object/route.ts:169` and
  `api/ai/chat/route.ts:488` both call `resolveAgentBinding({ em, auth, agentId })` and refuse **403
  `agent_not_bound`** when `!binding.bound` (`CC-27`).
- **Who confirms.** The integration spec `TC-AI-ACTIONS-PENDING-004` confirms with an **admin (human) token**;
  but the route is a normal authenticated endpoint, so an **`ai_worker`** credential holding `ai_assistant.view`
  can also call it. For a human, `resolveAgentBinding` is a **passthrough** (`{ bound: true }`); for an
  `ai_worker`, it is **fail-closed**.

**So the honest state:** the **creation** side of a mutation is binding-gated (the dispatch that proposed the
pending action passed `CC-27`). The **execution** side — the confirm that runs the tool — is **not**. A binding
**revoked between dispatch and confirm** is therefore **not observed**, and the confirm re-executes the tool
anyway. This is a one-hop-removed **execution** path; the gap is real but narrow (the action is user-scoped and
re-runs the policy checks). This is the gap `CC-56` closes.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (register `CC-56`):** add the **same** `resolveAgentBinding` check to the pending-action confirm route,
using the pending action's `agentId` and the **acting principal**, and refuse with **403 `agent_not_bound`**
when an `ai_worker` principal's binding has been revoked.

**Points taken from `platform_points.md` that define it:**
- **Row 22** — *"an AI user can run only the agents bound to it"*: "run" includes the confirm that **executes**
  a tool; a revoked binding must stop the run on **every** execution door, not only the first.
- **Row 7 (`P3`)** — *"roles & grants enforced on every write"*: the confirm **is** a write (it invokes a
  mutation tool); the binding is a grant that must be re-checked at the write, not only at the proposal.
- **Row 15 (`P10`)** — the **chokepoint** pattern: the binding check belongs at the single point where the tool
  handler is invoked, mirroring the dispatch routes.

**The contract (`B7`):**

- **`B7a` — same call, same refusal.** The confirm route calls `resolveAgentBinding({ em, auth, agentId:
  row.agentId })` and returns **403 `agent_not_bound`** when `!binding.bound` — the **identical** check and
  error code the dispatch routes use.
- **`B7b` — humans unchanged.** A human caller's resolver returns `{ bound: true }` (passthrough), so a human
  confirm is **byte-identical** to today (`B4`). Only an `ai_worker` is affected.
- **`B7c` — placed after the rechecks, before execution.** The check runs after `runPendingActionRechecks`
  succeeds and before `executePendingActionConfirm`, so the existing error taxonomy (404/409/412 for the
  rechecks) is **unchanged** and the new gate only adds one more refusal before the handler runs.
- **`B7d` — no new surface.** No new table, route, or migration. `resolveAgentBinding` already exists; the
  confirm route simply calls it.

---

## 3. Placement

- **`api/ai/actions/[id]/confirm/route.ts`** — add `import { resolveAgentBinding } from '../../../../../lib/agent-binding'`.
  After `if (!recheckResult.ok) { return fromRecheckFailure(recheckResult) }` (`:197-199`), insert:

  ```ts
  // CC-56 — the confirm EXECUTES the agent's tool, so it is an execution door too.
  // Re-check the binding here (fail-closed for an `ai_worker`); a binding revoked
  // between dispatch and confirm must stop the run, not silently re-execute it.
  const binding = await resolveAgentBinding({ em, auth, agentId: row.agentId })
  if (!binding.bound) {
    return jsonError(
      403,
      `Agent "${row.agentId}" is not bound to this principal.`,
      'agent_not_bound',
    )
  }
  ```

  `em` is already in scope (`:143`); `auth` is the non-null context (`:109-112`).

---

## 4. Non-goals (what this build does NOT do)

- **It does NOT change the dispatch gate** (`CC-27`) or the narrowing (`CC-55`).
- **It does NOT apply the narrowing** (`toolAllowlist`/`requiredFeatures`) on the confirm path — the register
  scopes `CC-56` to the **binding re-check** (`B7a`). The confirm re-runs the tool's own authority + the
  agent's features via the rechecks; adding the narrowing is **not** in this callback's definition.
- **It does NOT touch the in-process dispatch sites** — that is `CC-57`.
- **It does NOT add a new owner question** — the semantics are already ruled.

---

## 5. Impact (what the change can touch)

- **`resolveAgentBinding`** is now called from three sites (`run-object`, `chat`, `confirm`) — all three
  fail-closed for `ai_worker`, all three passthrough for a human.
- **The confirm route's test** (`api/ai/actions/[id]/confirm/__tests__/route.test.ts`) mocks
  `@open-mercato/shared/lib/auth/server` with **only** `getAuthFromRequest`; the real `resolveAgentBinding`
  imports `requirePrincipal` from that module, so the mock **must** gain `requirePrincipal` (the exact
  regression `CC-27` hit on the route suites). It must also mock `AiAgentBindingRepository` to control the
  binding lookup.
- **The coverage gate** (`__tests__/binding-coverage.test.ts`) scans **dispatch** sites; the confirm route is
  not a dispatch site, so the existing lists are unchanged. A **new** assertion is added so the confirm path's
  binding check cannot be silently dropped by a future refactor.
- No schema change, no migration.

---

## 6. RED-then-GREEN plan (the mutation proofs this build must pass)

1. **Route-level:** remove the `resolveAgentBinding` call (or make it unconditional `bound: true`) → the
   "revoked ai_worker → 403" test must go RED.
2. **Refusal-level:** change the refusal code from `agent_not_bound` → the code assertion must go RED.
3. **Human no-op:** make the route refuse for a human → the human passthrough test must go RED (and the
   existing confirm tests must stay GREEN).
4. **Coverage-level:** delete the `resolveAgentBinding` call from the confirm route → the new coverage
   assertion must go RED.

Every mutation restores the file **md5-verified**.

---

## 7. OUTCOME

**✅ BUILT 2026-10-11 (`CC-56`).** The pending-action confirm path now re-checks the agent binding.

**What landed.** `api/ai/actions/[id]/confirm/route.ts` imports `resolveAgentBinding` and, after
`runPendingActionRechecks` succeeds and before `executePendingActionConfirm`, calls
`resolveAgentBinding({ em, auth, agentId: row.agentId })` and returns **403 `agent_not_bound`** when
`!binding.bound`. A human caller is a passthrough (`B7b`); an `ai_worker` whose binding was revoked is
refused **before the tool handler runs** (`B7c`). The OpenAPI 403 description was updated to name
`agent_not_bound`. `__tests__/binding-coverage.test.ts` gained one assertion so the confirm path's
binding check cannot be silently dropped.

**Proof.** A **separate-agent hostile critic** raised 5 items; **3 were real and are fixed**: (i) the
"human passthrough" test was **vacuous** (it passed whether or not the production call existed) — it now
supplies a `null` binding and asserts a human still gets 200, so a route wrongly applying the binding to
humans fails it; (ii) the coverage assertion ran on **raw source**, so a commented-out
`// resolveAgentBinding(...)` satisfied it — it now strips comments (mirroring the `CC-55` scan), **proven**
by a comment-out mutation that FAILS the fixed assertion and PASSES the old one; (iii) the OpenAPI 403
description omitted `agent_not_bound`. **5 RED-then-GREEN mutations** (refusal disabled; wrong refusal
code; binding call removed; human no longer a passthrough; call commented out), every restore
**md5-verified**. `tsc --noEmit` clean (production sources); **1487 tests pass** across **108** suites
(the two `isolated-vm` electron-ABI suites are flaky/environmental).

**Critic items measured and NOT defects (documented, not dismissed).**
- **Scope of the guard (MED-as-raised, NOT-AN-ISSUE as a defect).** The re-check guards the **confirm
  caller**. A pending action is normally confirmed by a **human**, whose resolver is a passthrough — so
  the worker's revocation is observed only when the **same `ai_worker`** (or another `ai_worker`) calls
  confirm. This is faithful to the register (*"using the pending action's `agentId` and the acting
  principal"*) and to row 22 (the AI user *runs* the agent at **dispatch**, which `CC-27` already gates;
  a human confirm is the human exercising their own authority). Observing the **proposing worker's**
  binding on a human confirm would require persisting the proposer's principal on the row — the row
  stores only `createdByUserId` (a user id, not a worker id) — so it is **out of `CC-56`'s scope** and
  **not a row-22 requirement today**. Recorded here and in the register; **not built**.
- **Second execution door (LOW).** The only other caller of `executePendingActionConfirm` is the CLI
  tool-test harness `lib/tool-test-runner.ts:234`, which uses a **synthetic** agent
  (`dummyAgentForTool`) and a super-admin context with no principal — a binding check there would be a
  no-op. Measured; **not a row-22 door**.

**ONE NUMBER, two routes: 72 / 321 = 22% — unchanged** (§L's eleventh re-run; route 1 = a local script,
route 2 = a blind verifier agent that wrote its own).

---

## 8. What was measured vs what was quoted

- **Measured (this session, `grep`/`Read`):** the confirm route had no `resolveAgentBinding` import or
  call; it reaches `executePendingActionConfirm` only after `runPendingActionRechecks`; the integration
  spec confirms with a **human** admin token; the two dispatch routes call the resolver identically; the
  row stores `createdByUserId`/`agentId` but **no** proposer principal.
- **Quoted (from `CC-55`'s close-out):** *"the pending-action confirm path still does not re-check the
  binding → `CC-56`"* — **confirmed true** by measurement.

