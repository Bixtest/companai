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
**17 `@assign_queue` sites, of which 14 are real.** `delivery_mode=2` = **persistent**, and
**combined with the ack-after-consume model** (`:400-402`) *"the guarantee is at-least-once"* —
the ack-after-consume half is the part that makes it so. `failed_tries` rides **inside the
event payload** (*"The counter rides *in the event itself*, so retries survive a worker
crash"*). A **`SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES = 10`** bound. And the budget that makes
it operational: **`MAX_CONSUME_SECONDS = 30`** via SIGALRM — *"A single event gets 30 s; a batch
of 100 gets 3,000 s."*

The verdict, verbatim: *"Zulip's automations are **plumbing, not a product**"* (§4.8) — and the
plumbing is the lesson. **Correction [C]:** the first version paraphrased this as "P3 =
plumbing, not product" and wrote `LATE_CUTOFF` where the constant is
`SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES`.

### Gas Town — the Hook
> **The Hook is the durability primitive** (`03-the-workspace §3`, **F03-03**): *"work on your
> hook survives session restarts, context compaction or handoff"* — a `hook_bead` pointer on
> the agent bead. The session is ephemeral; the work is not. **Durability by re-reading a
> pointer, not by persisting a session.**

**Correction [C] on the citation:** the Hook is filed in Gas Town's **P2** file, not its P3
file — recorded rather than silently moved. (A verification pass initially read this as "no
support"; the grep below confirms F03-03 is real and exactly as described.)

And **ZFC — "Zero Framework Cognition"** (`03-the-workspace §6`, F03-06): *"the framework
transports, the agent decides."* The watchdog chain is made of *agents*, but the wire stays
dumb. **Correction [C]:** "transport, don't decide" was a fair gloss of a real principle, but
the name is what should be quoted.

### n8n — the engine, and it is not the interesting part
Workflow execution is n8n's product, but its own batch is blunt: *"it is a mature, ordinary
workflow engine — **not the interesting part of n8n**"* (F04-01). What we take is the shape:
a canvas of composable nodes with typed inputs, `MAX_IN_PROCESS_WAIT_MS = 65_000`, and the
three expression failure classes classified as `timeout` / `memory_limit` / `security` /
`syntax` / `unknown`. **Correction [C]:** the first version's confident *"workflow execution
**is** n8n's product"* contradicted the tone of n8n's own synthesis.

### Paperclip — the richest pole for us
**Correction [C]:** the first version said "P3 is the second of Paperclip's two strengths.
Foundation shape, no tenancy." Paperclip's own header says P3 is *"the **deepest part of
Paperclip and the richest pole for us**"*, and it never discusses tenancy here at all. What it
actually contributes: **finite runs + durable intent** with a three-way invariant (§1); **five
continuation kinds + idempotency keys** (§3); the **stranded-issue reconciler** including
*"honour human cancellation"* (§4); the **DOT-2 lesson** — *"increasing the polling interval
only hides the bug"* (§5); the task watchdog (§6); the runner ADR with deterministic replay
(§7); and fail-awake idle sleep with *"ambiguous ⇒ stay awake"* (§8).

### buzz — the warning, stated precisely
buzz's approval gate: *"~330 lines of approval plumbing — are reachable only from a run state
that nothing can produce"*; *"`WaitingApproval` is **never written** by production code;
`create_approval` has **zero production callers**."* And *"**Two of seven actions are stubs**
(`send_dm`, `set_channel_topic`)."*

**Correction [C]:** the first version wrote "dead code" without the numbers. Also corrected
elsewhere: buzz **has no queue at all** — a 100-permit semaphore with `try_acquire()` and
`CapacityExceeded` (§1) — and its claim is deliberately **at-most-once**: *"No distributed
lock is involved"* (§4.3, F4-8). Its authority gate sits at four doors, deliberately **before**
the claim (§4.4). The lesson is not "don't build an approval gate" — it is "an approval gate
that no test can fire is a gate that does not exist, and you must be able to say so."

### Hermes, CrewAI, openrig
Hermes has scheduling/delegation/the board, and **Cron's preflight and rate-limit path** —
*"a misconfigured job never spends tokens"*, with `no_agent`/`wakeAgent` gates, exit-code
booking (75/78), PR completion contracts and `/goal` quality gates (`06-scheduling... §2.3,
§3.4, §5.2`). **Correction [C]:** the first version marked Hermes P3 as "—" and dropped all of
this.

CrewAI is an executor with no delivery: *"no queue/broker/worker/cron"* (§4.0), two
incompatible durability systems (§4.2), and delegation as *"a synchronous function call on an
in-memory, unrecorded `Task`"* (§4.3.1).

openrig's one composition system is **Context Packs**, which live in its **PX-W** file
(*"composes **prompts**, not UI"*, `05-widgets-and-frontend §8.4`, F5-2) — not P3. openrig's
actual P3 mechanism is a **queue of obligations**: the hot-potato closure contract with seven
reasons (three requiring `closure_target`, §3), and the line that names the whole pole —

> **"THE ROW CARRIES THE OBLIGATION EXACTLY-ONCE; THE WAKE IS AT-LEAST-ONCE"** (§5)

— with the baton and the wake committed in the same transaction (§4).

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
| **SR-22** | Every command declares risk + approval + expiry before it may run | mercato `CC-63` + buzz's dead gate as the warning (~330 lines reachable only from a run state nothing produces) | **BUILD** — `CC-63` |
| **SR-23** | **ZFC — "Zero Framework Cognition":** transport never adjudicates policy | Gas Town (`03-the-workspace §6`, F03-06) | **BORROW** — architectural rule |
| **SR-24** | Durable hooks for side effects — an ephemeral session over a durable pointer | Gas Town (`03-the-workspace §3`, **F03-03** — filed in its P2 file) | **BORROW** |
| **SR-25** | Event-kind registry; a new kind beats a new endpoint; conformance-tested | buzz (`ALL_KINDS` = **136 entries**, 0 duplicates, `no_duplicate_kind_values` test — `01-platform-overview`; the count reconciles in `07-synthesis` F7-1 as 135 `KIND_*` consts / 136 array entries / 157 total `pub const`) | **BORROW** |
| **SR-26** | Every approval gate ships a test that fires it | buzz honest ledger | **BUILD** — guard-test requirement |
| **SR-19a** | **Budget per event, not just per queue** — a single event gets  bounded time; a batch gets n × that, enforced by the worker | zulip (`04-automations §4.2`, `MAX_CONSUME_SECONDS = 30` SIGALRM) | **BORROW** |
| **SR-19b** | **The row carries the obligation exactly-once; the wake is at-least-once** — baton and wake committed in one transaction | openrig (`04-automations §4`, §5) | **BORROW** — the pole's cleanest statement of the whole problem |
| **SR-21a** | **Recovery is a named set of sweepers, one per way a task can die** — not a generic retry | Multica (`04-automations §4`, F04-03) | **BORROW** |
| **SR-22a** | **Increasing the polling interval only hides the bug** — a reconciler that honours human cancellation beats a slower poller | Paperclip (`04-automations §5`, the DOT-2 lesson) | **BORROW** — design principle, pinned as a test case |

**Prerequisites:** SR-19 is the foundation — SR-20's claim needs a queue to claim *from*.
SR-22 must land before any automation is user-facing, not after.
**Triggers:** SR-19 and SR-22 are both blocking for the first automation release.

**Corrections [C] applied 2026-10-16 against the markdown:** `delivery_mode=2` is **persistent**,
and at-least-once comes from **ack-after-consume** (the first version dropped the second half);
the constant is `SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES`; "plumbing, not a product" is zulip's
own verbatim words; Gas Town's Hook is F03-03 and lives in its P2 file; ZFC is **"Zero
Framework Cognition"**; n8n's own batch says workflow execution is *"not the interesting part
of n8n"*; Paperclip's P3 is *"the deepest part of Paperclip and the richest pole for us"*
(not "one of two strengths"); buzz's gate numbers are ~330 lines, `WaitingApproval` never
written, `create_approval` with zero callers; and openrig's Context Packs belong to PX-W,
while its real P3 is the **queue of obligations**.

**Added from the same pass:** Multica's `sys_cron_executions` — *"the row is both the
distributed lease and the audit log entry"* — with lease tokens and `CatchUpMode` (§6); the
prepare lease with attempts and a per-task heartbeat (§3); autopilot-as-data with
`concurrency_policy ∈ {skip, queue, replace}` (§7); Gas Town's 47 embedded TOML formulas and
two delivery modes (queue vs interrupt, §2.2); buzz's at-most-once claim with no distributed
lock; and Hermes's Cron preflight.

---

*Next: `05-widgets-and-frontend.md`.*
