# Paperclip Study — Batch 04: automations (P3)

**Status:** DONE — 2026-10-15 · **Pole tag: P3 — automations** (where agents work on assigned tasks, assign
tasks, run on their own; the owner: *"Paperclip is a blueprint for that"*).
**Sources read:** `doc/architecture/durable-continuation-scheduler.md` (full), `doc/architecture/paperclip-runner.md`
(ADR), `doc/TASK-WATCHDOG.md`, `doc/idle-sleep-safety.md`, `doc/dependency-wake-recovery.md`,
`doc/native-workspace-finalization-recovery.md`, `server/src/services/heartbeat/` survey, plus code verification.

> **This is the deepest part of Paperclip and the richest pole for us.** The heartbeat service directory
> alone measures **36,251 lines across 46 files**, including single files of 190 KB (`queue.ts`), 146 KB
> (`workspaces.ts`), 119 KB (`run-preparation.ts`), 100 KB (`recovery.ts`). This batch reads the *design*
> docs and verifies the *mechanisms* exist; it does not read 36k lines.

---

## §0 — Plain words: what "automations" are in Paperclip

An automation is **a heartbeat run**: Paperclip wakes an agent, the agent does a bounded piece of work,
records a terminal result, and **exits**. Paperclip *does not keep the agent alive between turns* — if more
work is needed, that intent is written into the database and a **new** run is created later. Around that
simple loop sits a serious engineering apparatus: a scheduler, a recovery unit, a retry unit, a watchdog, a
budget governor, and an approval gate. **Most of this batch is about that apparatus, because that is the part
that is hard to build and the part our platform will need.**

---

## §1 — The core loop and its single design law

**The law (measured, `durable-continuation-scheduler.md:3–5`):** *"Paperclip does not keep an agent process
alive between turns. A heartbeat run is finite: it starts, performs work, records a terminal result, and
exits. If work must continue later, Paperclip represents that intent in database state and creates another
heartbeat run when the continuation becomes eligible."*

**Plain gloss:** an agent is **not** a long-lived daemon. It is a series of **short, recorded jobs**. All the
continuity lives in the database, not in a process. This is why the platform can restart without losing work,
and why "recovery" is a first-class subsystem rather than an afterthought.

**The invariant that governs everything (measured, same doc):** *"an assigned open issue should have either
a **live execution path**, a **durable reason to wait**, or a **visible terminal/blocking disposition**."*

---

## §2 — The scheduler (measured, verified in code)

- Enabled unless `HEARTBEAT_SCHEDULER_ENABLED=false`; interval `HEARTBEAT_SCHEDULER_INTERVAL_MS`,
  **default 30,000 ms, clamped to a minimum of 10,000 ms** (`:19–25`).
- **Code verification:** `server/src/config.ts:385–386`
  (`heartbeatSchedulerEnabled: process.env.HEARTBEAT_SCHEDULER_ENABLED !== "false"`,
  `heartbeatSchedulerIntervalMs: Math.max(10000, Number(process.env.HEARTBEAT_SCHEDULER_INTERVAL_MS) || 30000)`).
  **VERIFIED IN CODE.**
- The tick does, in order: **reap orphaned runs → promote due retries → resume already-queued work → run
  stranded-issue reconciliation** (`:27–35`).
- **The interval is polling cadence, not a latency promise** — stated explicitly (`:33–35`), an unusually
  honest caveat.

---

## §3 — Continuations: the agent can *ask* for another turn (measured, verified)

A native run result may report **`yielded`** with a **continuation** of one of five kinds
(`durable-continuation-scheduler.md`; **code: `server/src/services/native-runtime/evidence-classifier.ts:70`**):

```
kind: "same_agent" | "retry" | "delegated_issue" | "response_wake" | "monitor"
```

plus a summary and an **idempotency key**. The status arbiter keeps the issue `in_progress` and emits an
`enqueue_continuation` effect; the **status-decision committer materializes it as an idempotent
`agent_wakeup_requests` row** (`:52–68`). Monitor continuations use `monitor_due`; others use
`issue_status_changed`.

**Code verification:** `evidence-classifier.ts:70,398` (the union and its validation),
`native-board-response-wait.ts:143,170` (the `response_wake` rule: *"Only an unchanged, directly admitted
Board comment can make response_wake a…"*), and the persisted table
**`packages/db/src/schema/agent_wakeup_requests.ts`**. **VERIFIED IN CODE.**

**Plain gloss:** this is the **"I'm not done, wake me later"** mechanism, and it is **durable** — the request
is a database row, so it survives a restart. **Idempotency keys** mean the same intent cannot be executed
twice, which is the difference between a scheduler and a source of duplicate work.

---

## §4 — The stranded-issue reconciler (the safety net) (measured, verified)

`reconcileStrandedAssignedIssues()` scans agent-owned issues in `todo`/`in_progress`/relevant `in_review`,
and before waking anyone it checks a list of reasons **not** to (`:70–90`):
active/queued execution exists · a pending interaction or durable wait exists · the issue/tree is paused ·
a provider-quota monitor is pending · the run was **explicitly cancelled by an operator** · the agent is not
invokable · budget/retry policy prevents a run · **recovery has failed enough times that the issue should be
escalated instead**.

Eligible `in_progress` issues with no live path get an automated wake tagged
`wakeReason: issue_continuation_needed`, `source: issue.continuation_recovery` (`:92–100`).

**Code verification:** `server/src/services/recovery/service.ts:4397` defines
`reconcileStrandedAssignedIssues`, exported at `:6369`. **VERIFIED IN CODE.**

**Plain gloss:** the reconciler is **the liveness repair unit**. If an agent stopped for no good reason, this
notices and re-wakes it — *but* it has a long list of legitimate reasons to leave things alone, and one of
them is **"a human cancelled this"** (it must not undo a human).

---

## §5 — The DOT-2 loop: a named production failure and its fix (measured)

This is one of the most valuable things in the whole study: Paperclip **documents a real bug it shipped and
fixed**, with the full causal chain (`:102–130`).

**What happened:** DOT-2's runner kept producing a successful `done` result, but the **native evidence
classifier did not accept the model's evidence references**, so status arbitration kept the issue
`in_progress` and created another continuation. Each new run exited with `in_progress` + no live/wait path,
so the reconciler queued `issue_continuation_needed` again on the next ~30-second tick. The new run got the
original task title (the model envelope had omitted the wake-comment text), so it **repeated the same answer,
forever**.

**The fix has two parts** (`:124–130`): (1) native model input now contains the **redacted server-authored
task prompt including the current wake comment**; (2) ordinary low-risk completion can **accept a
schema-valid completion claim**, while tools, governed effects, interactions and approvals keep independent
authorization gates.

**And the diagnostic advice is itself a lesson** (`:132–155`): *"Repeated successful runs with
`wakeReason: issue_continuation_needed`, an authoritative decision of `in_progress`, and no durable wait path
usually mean the result/disposition contract is failing to converge. **Fix the status or continuation
decision; increasing the polling interval only hides the bug.**"*

**Plain gloss:** this is the **classic infinite-loop failure mode of any recovery engine** — a liveness
mechanism that keeps "fixing" a state it never actually changes. Paperclip's answer is the right one and
worth copying wholesale: **make the completion contract converge, don't slow the poller down.**

---

## §6 — The task watchdog — automated verification of stopped work (measured)

`doc/TASK-WATCHDOG.md`: a **watchdog is an agent assigned to verify a stopped issue tree** and put it back
in motion **when stopping was a mistake** (`:17–22`). It watches one issue + its non-watchdog descendants.
When every leaf comes to rest (done/cancelled/blocked/in_review/waiting) **and there is no live continuation
path**, Paperclip wakes the watchdog to **read the evidence and decide whether the stop is legitimate**.

**The failure modes it exists for** (measured, verbatim sense, `:27–32`): agents stop "for the wrong
reasons" — misreading a blocker, accepting a stale plan confirmation, declaring done **without proof**,
leaving an issue `in_review` **with no real reviewer**, or giving up on a recoverable failure. **"None of
those failures wake anyone on their own — the tree just sits."**

It is **verification-shaped, not execution-shaped**: it reads what other agents claimed, checks it against
the thread evidence, and either **accepts the stop or restores a live path**. It is **opt-in per issue**
("no global watch-everything mode").

**Plain gloss:** the watchdog is a **second pair of eyes on "are you sure you're done?"** — a dedicated
reviewer agent for work that quietly stalled. This is a genuinely novel mechanism and maps onto our vision's
need for agents that *check each other's work*, not just do it.

---

## §7 — The runner: separating execution from the control plane (measured, ADR)

`doc/architecture/paperclip-runner.md` is a real **ADR** (Status: Proposed, 2026-08-24): *"Paperclip is a
control plane… Add a standalone package named `@paperclipai/paperclip-runner`. The package owns the
language-neutral **Paperclip Runner Protocol (PRP)**, the **Rust** runner process, provider drivers,
deterministic replay, and semantic action dispatch contracts."* It is **behind one explicit adapter
(`paperclip_runner`) and one default-off instance flag**, qualified for Codex/OpenCode/Claude Managed/AWS
AgentCore + pinned ACPX profiles.

**Its goals are the P3 design goals** (`:32–38`): keep runner ownership **outside the server process**;
**preserve Paperclip as the authority** for identity/policy/workflow; **recover a run after runner/network
interruption without duplicate effects**; **expose only actions the current run is allowed to use**; make
the protocol **deterministic across TypeScript and Rust**; and **change nothing** for existing adapters.

**Non-goals** (`:40–43`): *"Replace existing direct adapters. Move business authorization or issue status
policy into Rust."* — i.e. **the runner never becomes a second control plane.**

**Code verification:** `packages/paperclip-runner/` measured at **221,706 lines** — the second-largest area
in the repo. **VERIFIED IN CODE** (the package is real and large).

**Plain gloss:** Paperclip took the "run the agent somewhere else, keep the brain here" decision and wrote
it down as an ADR, with **deterministic replay** so a network blip can't double-charge or double-act. This is
exactly the "execution seam" our platform will need for Hermes, and the ADR's **non-goals** are as useful as
its goals.

---

## §8 — Budgets, approvals, routines and idle-sleep (measured)

- **Budgets & costs:** `server/src/routes/costs.ts`; batch 01 §2.7's three tiers (visibility → soft alert →
  hard ceiling → auto-pause) are the governing model.
- **Approvals:** `server/src/routes/approvals.ts`; the board gate (batch 01). The `run` layer uses approval
  env like `PAPERCLIP_APPROVAL_ID` (heartbeat-protocol step 2, batch 01 §2.3).
- **Routines:** `server/src/routes/routines.ts` — recurring tasks (portable as recurring `TASK.md`,
  per `AGENTCOMPANIES_SPEC_INVENTORY.md`). **This is P3's "scheduled work" primitive.**
- **Idle-sleep safety** (`doc/idle-sleep-safety.md`): a hosting protocol that lets an instance **sleep when
  truly idle** — a **TTL-bounded drain hold** (5–300 s), polled by the host, where *"`present`, `unknown`,
  missing fields, or errors **must keep the instance awake**"* and *"`quiescent` alone is not
  authorization"*. New tenant requests get **503 + `Retry-After: 1`** during a hold. A **scheduled-routine
  wake** extension requires a **durable host alarm**.
  **Plain gloss:** a **fail-awake** sleep protocol — it sleeps only on a positive, unexpired, owner-matched
  proof, and anything ambiguous keeps it awake. That is the right default for a system that must not drop
  work, and it maps onto our multi-tenant hosting economics.

---

## §9 — Divergences found in this batch

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D1** | The runner ADR is "Status: Proposed" | `packages/paperclip-runner/` is **221,706 lines of real code**, and the ADR itself says "The implementation remains behind one explicit experimental adapter and one default-off instance flag" | **Status label is behind reality, deliberately.** The *system* is built; the *rollout* is gated. Not an error — but a reader must not treat "Proposed" as "not built". |
| **D2** | Batch 01 called the heartbeat "a protocol, not a runtime" (`SPEC.md:234`) | The shipped tree has a **large scheduling/recovery/retry engine** around it | **Both true at different levels:** the *agent-facing* heartbeat is a protocol; the *control-plane* side is a heavy runtime. The SPEC softens this; the code and `durable-continuation-scheduler.md` are the authority. |

---

## §10 — Carried forward

| ID | Carry | To |
|---|---|---|
| **C4-1** | **Runs are finite; continuity lives in the DB, not in a process.** | P3 (core) |
| **C4-2** | **The three-way invariant**: live path · durable wait · visible disposition. | P3 |
| **C4-3** | **Five continuation kinds** (`same_agent/retry/delegated_issue/response_wake/monitor`) + **idempotency keys**. | P3 |
| **C4-4** | **Stranded-issue reconciler** with a long "reasons NOT to wake" guard list, incl. **honour human cancellation**. | P3 |
| **C4-5** | **The DOT-2 lesson**: fix the completion contract to converge; never slow the poller to hide it. | P3, all |
| **C4-6** | **Task watchdog**: an opt-in *verification-shaped* agent that audits stopped work and restores a live path. | P3, PZ |
| **C4-7** | **Runner as a separate process behind a protocol (PRP)**, deterministic replay, **never a second control plane**. | P3, P1 |
| **C4-8** | **Budgets**: visibility → soft alert → hard ceiling → auto-pause → board override. | P3, P2 |
| **C4-9** | **Routines** (recurring tasks), portable as recurring `TASK.md`. | P3 |
| **C4-10** | **Fail-awake idle sleep**: TTL-bounded, owner-matched, ambiguous ⇒ stay awake; 503+Retry-After gate. | P3, PZ |
| **C4-11** | **Scheduler defaults**: 30 s, floor 10 s, tick order (reap → promote → resume → reconcile). | P3 |

---

## §11 — Value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a real user use case?**
It makes a fleet of agents **survivable and self-healing**: work resumes after a crash, an agent that stops
wrongly gets re-woken, a wrongly-stopped tree gets a second opinion from a watchdog, and money stops at a
ceiling. For the user, the difference is *"it keeps working while I sleep"* versus *"I babysit it."*

**Q2 — how does this serve an AI-first business & resources planner?**
This pole is where Paperclip most clearly **is the blueprint**, exactly as the owner said. Four mechanisms
are load-bearing for us: (1) **finite runs + durable intent (C4-1/C4-2)** — the only way to run agents as
reliable business processes rather than long-lived pets; (2) **continuations with idempotency (C4-3)** — an
automation that can *safely* schedule its own next step; (3) **the reconciler + watchdog (C4-4/C4-6)** — a
planner needs automatic detection of stalled work and automatic verification of "done", or it cannot be
trusted with a business; and (4) **the runner seam with deterministic replay (C4-7)** — precisely how we
will run Hermes safely behind our own authority. The DOT-2 lesson (C4-5) is the single most important
engineering warning in the study: **recovery engines fail by looping, and the fix is always the contract,
never the timer.**

---

*Batch 04 of 07 complete. Divergences: 2 (both label/level, not fact). Carried: C4-1…C4-11.
Next: `05-widgets-and-frontend.md` (PX-W / PX-F).*
