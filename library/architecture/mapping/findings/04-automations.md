# 04 — AUTOMATIONS (P3)

**The pole:** what runs without a human watching, and how does it survive a crash.

---

## 1. What the nine platforms do

### Multica — the claim and the taxonomy (★)
The most precise P3 mechanism in the study:

> **The one-statement claim.** `FOR UPDATE SKIP LOCKED` + a total order + a **health gate
> INSIDE the claim**. One statement decides who owns a task and whether the claimer is
> healthy to run it.

Plus a **27-value failure taxonomy** — a closed enumeration of failure reasons, recorded per
attempt, so "it failed" becomes "it failed *for reason 14*".

Workflows (`P8`) and business rules (`P9`) are both complete in mercato's module register —
Multica is the closest architectural neighbour in the whole study.

### zulip — plumbing done right
**14 queues.** `delivery_mode=2` = **at-least-once**. `failed_tries` rides **inside the event
payload**, so retry counts survive a crash. A **10-minute `LATE_CUTOFF`** bounds how late a
message may arrive before it is dropped.

The verdict: *"P3 = plumbing, not product"* — and the plumbing is the lesson.

### Gas Town — the Hook
> **Hook = the durability primitive.** A durable hook for side effects, so that a crashed
> run resumes rather than restarts.

And **ZFC = transport, don't decide**: the transport layer never decides policy. The watchdog
chain is made of *agents*, but the wire stays dumb.

### n8n — the engine
Workflow execution *is* n8n's product. What we take is not the engine (mercato has a command
bus) but the shape: a canvas of composable nodes with typed inputs.

### Paperclip — strength
P3 is the second of Paperclip's two strengths. Foundation shape, no tenancy.

### buzz — the warning
buzz has an automation approval gate that is **dead code**, and 2 of 7 automation actions are
**stubs**. This is in the honest ledger, not hidden. The lesson is not "don't build an
approval gate" — it is "an approval gate that no test can fire is a gate that does not
exist, and you must be able to say so."

### Hermes, CrewAI, openrig
Hermes has scheduling/delegation/the board. CrewAI is an executor with no delivery. openrig's
one composition system (Context Packs) composes **prompts**, not tasks.

---

## 2. What mercato has

| HAVE IT | Where | Notes |
|---|---|---|
| Workflows | `P8` | complete |
| Business rules | `P9` | complete |
| Command bus | ~122 files | |
| Agent binding | `CC-27` / `CC-55` / `CC-56` / `CC-57` | complete |
| **No durable wake / task queue** | — | **absent entirely** |
| **0 of ~93 commands declare risk or approval** | `CC-63` | |

## 3. The gap

Mercato can *run* workflows. It cannot *wake* them durably, it cannot survive a crash
mid-execution, and — the sharper gap — **not one of ~93 commands says what it risks or who
must approve it**. A platform with a guard engine and zero risk declarations is a guard with
nothing to guard.

## 4. The target — RE-ENGINEER IT

**Automations as a durable execution layer with declared risk.**

1. **A durable wake queue.** At-least-once delivery, a bounded late-cutoff, and retry
   counters carried **inside the payload** so a crash cannot reset them.
2. **The one-statement claim.** `FOR UPDATE SKIP LOCKED` + total order + health gate inside
   the claim. One statement, one decision, no race window.
3. **A closed failure taxonomy.** Every attempt records a reason from an enumerated set.
   "It failed" is not an acceptable terminal state.
4. **Every command declares risk and approval.** Risk level + approver + expiry, declared
   before the command may run. This is `CC-63` and it is the pole's highest-value item.
5. **Transport does not decide.** The delivery layer carries; it never adjudicates. Policy
   lives above it.
6. **Hooks as durability.** Durable hooks for side effects, so a resumed run continues
   rather than replays.
7. **Kinds over endpoints.** Prefer a new event kind to a new HTTP endpoint — kinds live in a
   closed registry with a conformance test.
8. **The approval gate must be testable.** A gate no test can fire is dead code. buzz's is;
   ours must ship with a test that fires it.

## 5. Requirements

| ID | Requirement | Source | HAVE / BUILD / BORROW / RE-ENGINEER |
|---|---|---|---|
| **SR-19** | Durable wake queue: at-least-once, retry counters in the payload, late cutoff | zulip (14 queues, `delivery_mode=2`, `failed_tries`, `LATE_CUTOFF`) | **BUILD** — absent today |
| **SR-20** | One-statement claim: `FOR UPDATE SKIP LOCKED` + total order + health gate inside | Multica | **BORROW** |
| **SR-21** | Closed failure taxonomy (enumerated reasons per attempt) | Multica (27 values) | **BORROW** |
| **SR-22** | Every command declares risk + approval + expiry before it may run | mercato `CC-63` + buzz's dead gate as the warning | **BUILD** — `CC-63` |
| **SR-23** | Transport does not decide — delivery never adjudicates policy | Gas Town (ZFC) | **BORROW** — architectural rule |
| **SR-24** | Durable hooks for side effects | Gas Town (Hook) | **BORROW** |
| **SR-25** | Event-kind registry; a new kind beats a new endpoint; conformance-tested | buzz (`ALL_KINDS`, 136) | **BORROW** |
| **SR-26** | Every approval gate ships a test that fires it | buzz honest ledger | **BUILD** — guard-test requirement |

**Prerequisites:** SR-19 is the foundation — SR-20's claim needs a queue to claim *from*.
SR-22 must land before any automation is user-facing, not after.
**Triggers:** SR-19 and SR-22 are both blocking for the first automation release.

---

*Next: `05-widgets-and-frontend.md`.*
