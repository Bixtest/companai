# Findings 03 — Money and operations

**Covers batches 5 and 10:** budget and cost control; and audit, observability, telemetry and
deployment.

**The one-line result.** This batch matters because **we have a budget item of our own** — `ML-4`:
*"Budgets and per-tenant quotas — required before any tenant is placed on C, because a policy that can
spend must be able to stop."* Paperclip has built exactly that, and its design contains **one honest
lesson and one real trap** that our own wording would walk straight into.

---

## 1. A budget stop does not stop work that is already running — **WARN** (the most important finding here)

**What it is.** Spend is recorded **first**, then evaluated. When a budget is crossed, the scope is
**paused** and its future runs are blocked at admission — but the code that **cancels work already in
flight** is an **optional hook**, and most call sites do not pass it.

**Evidence, in order.**
1. `server/src/services/costs.ts:68` **inserts** the cost event; `:80` recomputes spend totals; `:101`
   **then** calls `budgets.evaluateCostEvent(event)`. The money is spent before it is judged.
2. `server/src/services/budgets.ts:252-258`:

```ts
async function pauseAndCancelScopeForBudget(policy: PolicyRow) {
  await pauseScopeForBudget(policy);
  await hooks.cancelWorkForScope?.({ … });   // ← optional
}
```
3. Only the heartbeat service supplies that hook (`heartbeat.ts:9645`). The study measured **five other
   services** that build `budgetService` with **no hook** (approvals, dashboard, plugin-host-services,
   recovery, attention) — so a hard stop raised there pauses the scope and leaves running work running.

**What we have.** `ML-4`, worded as *"a policy that can spend must be able to stop"*.

**Why this matters.** Our own sentence promises something Paperclip's design does **not** deliver.
Their honest position is: *pause the scope, gate future admission, and try to cancel in-flight work.*
The lesson is not "they did it wrong" — it is that **the cancel path must not be optional**, or the
promise is false.

**Verdict: WARN, and change our wording.** `ML-4` should say what is actually enforceable: a budget
**blocks admission** and **pauses the scope**; cancelling a run that is already mid-flight is a
separate, best-effort action that must be named. Do not promise a mid-run kill we have not built.

---

## 2. Enforcement is post-hoc and best-effort against concurrency — **WARN**

**What it is.** The admission gate re-sums recorded spend **outside any lock shared with the insert
path**, so two runs starting together can both pass before either's spend lands.

**Evidence.** `server/src/services/budgets.ts:718` (`getInvocationBlock`) is the gate; the spend it reads
is written by `costs.ts:68-101` with no shared lock. The product's own README says the same thing in
plain words: *"Enforcement uses recorded spend; usage reporting and in-flight work can delay a stop"*
(`README.md:292`).

**Verdict: WARN.** Our budgets must state the same limit, or reserve before spending. There is no third
option — you cannot both spend first and stop first.

---

## 3. The cost ledger and its attribution — **LEARN** (directly usable by ML-4)

**What it is.** Every run's provider usage is an **append-only ledger row**, attributed along many
dimensions, with an explicit status for "we could not price this".

**Evidence.** `packages/db/src/schema/cost_events.ts:9`; attribution is resolved in
`server/src/services/heartbeat.ts:5382` (scope from run + issue), `:5307` (billing type), `:5327`
(biller), `:5339` (**`subscription_included` cost forced to 0**), `:5344` (`reported` vs `unpriced`).
Totals are recomputed onto the agent and company rows (`costs.ts:80-96`).

**The attribution is richer than the enforcement.** Budget scopes are only company / agent / project
(`packages/shared/src/constants.ts:875`) and the only metric is `billed_cents` (`:878`) — even though the
ledger carries goal, issue, run, provider, biller and model.

**Verdict: LEARN.** Take the ledger shape and the `reported`/`unpriced` distinction. It is the honest
way to record spend you cannot price, and it fits our per-tenant policy directly.

---

## 4. Small budget mechanics worth copying — **LEARN**

| Mechanic | Evidence | Why |
|---|---|---|
| **Incident dedupe by partial unique index** | `packages/db/src/schema/budget_incidents.ts:36` — unique on `(policyId, windowStart, thresholdType) WHERE status <> 'dismissed'` | Idempotent alerts without application logic |
| **Resume clears only the budget reason** | `budgets.ts:272` — `where(and(eq(agents.id,…), eq(agents.pauseReason,"budget")))` | A manual pause **survives** a budget resume. Correct, and easy to get wrong |
| **Raising a budget must beat observed spend** | `budgets.ts:884` — `if (nextAmount <= currentObserved) throw unprocessable(…)` | Prevents an approval that changes nothing |
| **Attribution fallback through the audit log** | `costs.ts:499` — `byProject` coalesces the cost row's project with one resolved via `activity_log.runId → issue.projectId` | Two routes to the same fact |

---

## 5. Three separated telemetry planes, with privacy by construction — **LEARN**

**What it is.** Three planes that do not overlap: first-party product telemetry (schema-led from a
generated contract), opt-in OpenTelemetry **traces only**, and a **local** run-log. The privacy settings
are defaults, not options.

**Evidence.** `packages/shared/src/telemetry/README.md:9` (generated contract);
`doc/observability.md:9, 24` (OTel is a no-op until `OTEL_EXPORTER_OTLP_ENDPOINT` is set);
`doc/observability.md:252` (spans use closed `paperclip.*` allowlists, **hashed** ids, no commands or
paths); `:388, :408` (Sentry `sendDefaultPii:false`, `tracesSampleRate:0`, `skipOpenTelemetrySetup:true`).
The run-log persists to `heartbeat_run_events` with a per-run `(runId, seq)` unique index
(`packages/db/src/schema/heartbeat_run_events.ts:40`), and its events are **allowlisted**
(`doc/run-log-events.md:176-178`) to keep cardinality low and prevent leaks.

**What we have.** Our vision says "data privacy" and "internal trace collection" as goals; nothing
concrete.

**Verdict: LEARN.** The allowlist-plus-hash discipline is cheap and is exactly what a platform handling
many tenants' data needs. It also protects against a token or a path leaking into a trace.

---

## 6. The audit feed — **LEARN**

**What it is.** Every mutating action is a durable row with actor, action, entity, and **a responsible
user resolved by precedence**.

**Evidence.** `packages/db/src/schema/activity_log.ts:9`; `server/src/services/activity-log.ts:93`
resolves `responsibleUserId` by precedence **run → issue → API key → company default**, and redacts
details before persisting; `:217` publishes live and to plugins. Reading uses **keyset cursor
pagination** with a fallback responsible user joined from the runs table
(`server/src/services/agent-action-audit.ts:51`).

**What we have.** Our platform has an audit ledger, and our specification flags a real gap: the ledger
carries **no `policy_version`/`decision_id`** (assigned to `G-16`).

**Verdict: LEARN.** The **responsible-user precedence chain** is the part we lack, and it is the same
idea as finding 01 §1 — attribution that survives delegation.
