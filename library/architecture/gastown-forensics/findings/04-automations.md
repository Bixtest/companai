# Batch 04 — Automations (P3)

**Study:** Gas Town `1.2.1` · **Batch:** 04 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **Method:** rules 1-10 of `00-PIN-AND-METHOD.md`.
Every claim carries `file:line`. Docs are claims; the code is the authority.

---

## 0. What this batch had to answer

P3 is **automations** — where agents work on assigned tasks. Batch 01 found the shape (a daemon of named
dogs, a watchdog chain made of agents). This batch opens the delivery layer up.

Short answer, measured:

| Question | Gas Town's answer | Where |
|---|---|---|
| What *is* a workflow? | **A TOML formula** — 47 of them embedded in the binary, in four types | F04-01 |
| How do agents talk? | **Mail** — a beads-backed bus with addresses, lists, queues, announce channels, and two delivery modes | F04-02 |
| How is the system kept alive? | **Patrol formulas** that are themselves design documents — with an *Idle Town Principle* and an answer to *"who watches the watchers"* | F04-03 |
| How is code merged? | The **Refinery**: a batch-then-bisect merge queue with an operator **safety stop** | F04-04 |
| What happens when work fails? | **Re-dispatch with a cap**, then escalate to the Mayor; plus stale-hook detection and a reaper | F04-05 |
| How do batches of work progress? | **Convoys** that feed the next ready issue *reactively* | F04-06 |

---

## 1. The formula library — behaviour as data

### 1.1 47 formulas, embedded in the binary

`internal/formula/formulas/` holds **47 `.formula.toml` files**, compiled in (the same `go:embed`
pattern as the roles, batch 01 §4). The library is not decoration — it is the product's whole workflow
catalogue, and the names show the domain:

| Group | Formulas |
|---|---|
| **Patrols** | `mol-deacon-patrol`, `mol-refinery-patrol`, `mol-witness-patrol`, `mol-pr-feedback-patrol` |
| **Dogs** (maintenance) | `mol-dog-backup`, `mol-dog-checkpoint`, `mol-dog-compactor`, `mol-dog-doctor`, `mol-dog-jsonl`, `mol-dog-phantom-db`, `mol-dog-reaper`, `mol-dog-stale-db` |
| **Polecat work** | `mol-polecat-work`, `…-monorepo`, `…-monorepo-tdd`, `mol-polecat-lease`, `mol-polecat-code-review`, `mol-polecat-conflict-resolve`, `mol-polecat-review-pr` |
| **Convoy** | `mol-convoy-feed`, `mol-convoy-cleanup` |
| **Boot / shutdown** | `mol-boot-triage`, `mol-gastown-boot`, `mol-shutdown-dance`, `mol-town-shutdown` |
| **Generic workflows** | `code-review`, `design`, `security-audit`, `tdd-cycle`, `rule-of-five`, `shiny`, `shiny-secure`, `shiny-enterprise`, `towers-of-hanoi{,-7,-9,-10}` |

*(The `towers-of-hanoi` set is a test fixture — a canonical algorithm shipped as a formula. Named here
because rule 6 says name everything, including what we would not use.)*

### 1.2 Four formula types

`formula/types.go:10-24` declares them, with a one-line definition each:

| Type | What it is |
|---|---|
| **`convoy`** | *"Parallel execution of legs with synthesis"* |
| **`workflow`** | *"Sequential steps with dependencies"* |
| **`expansion`** | *"Template-based step generation"* |
| **`aspect`** | *"Multi-aspect parallel analysis (like convoy but for analysis)"* |

The `Formula` struct (`types.go:32-45`) carries `Name`, `Description`, `Type`, `Version`, and three
fields worth naming:

- **`Pour`** — *"If true, steps are materialized as sub-wisps with checkpoint recovery. Default false
  (inline/root-only)."* A formula can be **run inline or poured into the ledger** as durable sub-steps.
- **`Agent`** — *"Default agent for all legs (GH#2118)"* — the whole formula runs on one agent unless
  overridden.
- **`ReviewOnly`** — *"If true, all legs are analysis-only — no code commits expected (gt-kvf)."* A
  workflow can be declared incapable of writing code.

### 1.3 The formula's *content* is tested

`formula/boot_triage_test.go:9-31` asserts that `mol-boot-triage.formula.toml` **contains**
`gt nudge --mode=immediate deacon "Boot wake: please check your inbox and pending work"` and **forbids**
three strings, including `tmux send-keys -t hq-deacon` and `"sleep 1"` — with the failure message
*"boot triage formula still contains forbidden raw tmux wake guidance"*.

**The finding:** the platform does not merely ship prose instructions; it **writes tests against the
prose**, so a documented rule ("Raw tmux send-keys is blocked for Boot") cannot silently regress. That is
the strongest form of "behaviour as data" seen in the study.

---

## 2. Mail — a real message bus

`internal/mail/` (`mailbox.go`, `router.go`, `delivery.go`, `resolve.go`, `store.go`, `dog_address.go`,
`types.go`) is **beads-backed messaging**: *"Mailbox manages messages for an identity via beads. When
`store` is non-nil, beads-mode methods use the in-process `beadsdk.Storage` directly instead of shelling
out to the `bd` CLI"* (`mailbox.go:32-34`).

### 2.1 The addressing model

- **Addresses are mail-style** (batch 02 §2): `gastown/Toast`, `mayor/`, `gastown/polecats/Toast`.
- **`router.go` routes to three kinds of target**, each with its own error: mailing **lists**
  (`ErrUnknownList`), **queues** (`ErrUnknownQueue`), and **announce channels** (`ErrUnknownAnnounce`)
  (`router.go:25-31`).

### 2.2 Priorities, types, and two delivery modes

Priorities are `low` / `normal` / `high` / **`urgent`**; types are `task`, `escalation`,
**`scavenge`** (*"optional first-come-first-served work"*), `notification`, `reply` (`types.go:10-46`).

The **delivery mode** is the important part (`types.go:52-59`):

| Mode | Behaviour |
|---|---|
| **`DeliveryQueue`** *(default)* | the message waits in the mailbox; *"Agent checks with `gt mail check`"* |
| **`DeliveryInterrupt`** | *"injects a system-reminder **directly into the agent's session**. Use for lifecycle events, URGENT priority, or stuck detection."* |

**So a message can either wait or interrupt the agent mid-turn** — and the code names when interruption
is appropriate.

### 2.3 The delivery fallback

`router.go:33-34` declares `DefaultIdleNotifyTimeout = 3 * time.Second` — *"how long the router waits for
a recipient's session to become idle before falling back to a queued nudge."*

**That is batch 03's ZFC/graceful-degradation principle in the messaging layer:** try to deliver live; if
the recipient is busy, queue it instead of forcing it.

---

## 3. The patrol loops — and their prose is the design

### 3.1 The Deacon's heartbeat is a file

`deacon/heartbeat.go:11-40`: the Deacon **writes a heartbeat file** each wake cycle
(`Heartbeat{Timestamp, Cycle, LastAction, HealthyAgents, …}`), and the **Go daemon reads it** to decide
whether to poke. Two compiled-in thresholds, **configurable via `operational.deacon.*`**:

- **stale = 5 minutes**
- **very stale = 20 minutes** — and the reason is given: *"Must be greater than patrol backoff-max (15m)
  to avoid false positives during legitimate await-signal sleep."*

**Plainly:** the watchdog's liveness is a file the watchdog writes, with a threshold tuned against another
component's sleep window — and both numbers are documented.

### 3.2 The patrol formula is a design document

`mol-deacon-patrol.formula.toml` is the richest single document found in this study. Its sections:

**"Idle Town Principle"** (`:6`) — *"The Deacon should be **silent/invisible when the town is healthy and
idle**."* Concretely: skip health nudges when no active work exists; sleep 60+ seconds between cycles;
*"Let the feed subscription wake agents on actual events"*; *"the daemon (10-minute heartbeat) is the
safety net for dead sessions."*

**"Mayor Nudge Policy"** (`:17`) — *"**NEVER nudge the Mayor for health checks, pings, or routine
status.** … Health pings to the Mayor are a **ZFC violation** — they burn Mayor context on ceremony
instead of work. **The Mayor is your boss, not a subordinate to be monitored.**"*

**"Second-Order Monitoring"** (`:28-36`) — the answer to the recursion:

> *"Witnesses **passively** monitor Deacon health by checking the Deacon's agent bead `last_activity`
> timestamp. This prevents the **'who watches the watchers'** problem — if the Deacon dies, Witnesses
> detect it and escalate to the Mayor. No WITNESS_PING mail is sent … This avoids heartbeat mail spam."*

**"Abbreviated Patrol Mode"** (`:38`) — when `await-signal` reports `EFFORT: reduced`, most steps are
**skipped** and only the heartbeat always runs.

**The finding, stated plainly:** the supervision design is not in a design doc — it is in the **patrol
formula the agent executes**, with a stated idle policy, a stated escalation policy (with the reason:
*don't burn the boss's context*), and an explicit resolution of the watchdog recursion (monitor the
**timestamp**, don't send mail).

### 3.3 The rest of the chain

- **Boot** (`boot/boot.go:1-5`) — *"a dog that runs fresh on each daemon tick, deciding whether to
  wake/nudge/interrupt the Deacon or let it continue."* Its formula (`mol-boot-triage`) is the one whose
  content is tested (§1.3), and the test forbids **raw tmux wakes** — the wake must go through
  `gt nudge`.
- **Dogs** (`dog/manager.go`) — *"Manager handles dog lifecycle in the kennel"*, with errors
  `ErrDogExists`, `ErrDogNotFound`, **`ErrDogWorking`** (*"dog is currently working"*), `ErrNoRigs`,
  `ErrInvalidName`. Dogs are **addressable** (`mail/dog_address.go`) and have their own session manager.
- **Witness** — per-rig, over the polecats (batch 01 §4.3), with its own patrol formula.
- **Stuck detection** (`deacon/stuck.go:18-22`): ping timeout **30s**, **3** consecutive failures before a
  force-kill, **5m** cooldown between force-kills — all overridable via `operational.deacon.*`.

---

## 4. The Refinery — the merge queue

`internal/refinery/` (`batch.go`, `engineer.go`, `manager.go`, `pr_provider*.go`, `safety_stop.go`,
`score.go`, `terminal_mr.go`, `work_bead_close.go`) is the merge queue, and its **batch config is the
design** (`batch.go:11-26`):

| Setting | Default | The comment's reasoning |
|---|---|---|
| `MaxBatchSize` | **5** | *"Larger batches increase throughput but increase bisection cost **O(log N)**."* |
| `BatchWaitTime` | **30s** | how long to wait for the batch to fill; 0 = process immediately |
| `RetryBatchOnFlaky` | **true** | *"Retry the full batch once before bisecting when tests fail. This avoids blaming an innocent MR for a flaky test."* |

**So the merge queue is a *batch-then-bisect* design**, and it explicitly anticipates **flaky tests** as a
first-class concern rather than an anomaly.

**The operator guard:** `refinery/safety_stop.go:14-16` — *"`ErrSafetyStopped` is returned when the
refinery agent bead carries an active **safety-stop label**. The label is the **durable
operator-cleared guard**."* A human stops the merge queue by **labelling a bead**; it stays stopped until
a human removes the label. (A `SafetyStop` carries `AgentID`, `Label`, `StopID`, and `Reason()`.)

The Refinery also has **pluggable PR providers** (`pr_provider_github.go`, `pr_provider_bitbucket.go`) —
so the merge target is not hard-coded to one host.

---

## 5. Recovery

| Mechanism | Shape | Evidence |
|---|---|---|
| **Re-dispatch** | A bead can be re-dispatched up to **3** times, with a **5m** cooldown *"to prevent thrashing when a bead keeps killing polecats"*; beyond that it **escalates to the Mayor** instead of re-slinging | `deacon/redispatch.go:20-28` |
| **Stale hooks** | a bead hooked longer than `MaxAge` is considered stale (with a `DryRun` mode) | `deacon/stale_hooks.go:20-27` |
| **The reaper** | SQL cleanup for wisps and issues — and **it makes no decisions** | `reaper/reaper.go:1-6` |
| **Health / keepalive** | `health/health.go`, `keepalive/keepalive.go` | — |

**The reaper's header is the clearest statement of ZFC in code** (`reaper.go:1-6`):

> *"These functions are the 'callable helper functions' for the Dog-driven `mol-dog-reaper` formula. They
> **execute SQL operations but do not make eligibility decisions** — the Dog (or daemon orchestrator)
> **decides** what to reap, purge, and auto-close based on the formula."*

**And it carries a retirement** (`reaper.go:28-31`): *"GH#2385: Removed legacy `gt` and `bd` names —
modern towns use `hq` … their presence in the fallback caused **phantom DB errors**."*

---

## 6. Convoys — reactive feeding

`convoy/operations.go:1-2` — *"Package convoy provides convoy tracking operations: finding tracking
convoys, checking completion, feeding ready issues, and dispatching via `gt sling`."* And the mechanism
is stated at `:20-24`:

> *"`CheckConvoysForIssue` finds any convoys tracking the given issue and triggers convoy completion
> checks. If the convoy is not complete, it **reactively feeds the next ready issue** to keep the convoy
> progressing **without waiting for polling-based patrol cycles**. The check is **idempotent**."*

**The finding:** the next unit of work is released **by the completion event**, not by a poll — and the
operation is explicitly idempotent so it can be called from anywhere.

---

## 7. The retirement ledger (rule 10)

| Where | What was retired | Why |
|---|---|---|
| `reaper/reaper.go:28-31` | the legacy `gt` and `bd` database names in the fallback list | *"modern towns use `hq` … their presence in the fallback caused **phantom DB errors**"* (GH#2385) |
| `formula/boot_triage_test.go` | **raw tmux wake guidance** in the boot formula | forbidden by test: *"Raw tmux send-keys is blocked for Boot"* |
| *(batch 01/02/03)* | roles → TOML; provider switches → a struct; per-agent hook packages → one installer; decision engines removed for ZFC | — |

**The first is the most concrete yet:** a **stale database name in a fallback list** produced *phantom
errors*, and the fix is recorded with its issue number. A fallback that is never exercised is exactly
where a stale name survives — the same class of hazard as an unpopulated seam.

---

## 8. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F04-01** | **47 workflows as embedded TOML formulas**, in four types (convoy/workflow/expansion/aspect), with `Pour` (durable sub-steps), a default agent, and a review-only mode. | P3 | Every routine the product knows is inspectable and editable. | The workflow catalogue is data that ships with the binary. |
| **F04-02** | **The formula's *content* is tested** — a test forbids raw tmux wakes in the boot formula. | P3/PZ | A documented rule cannot silently regress. | Prose and tests held together. |
| **F04-03** | **Mail is a real bus**: beads-backed, mail-style addresses, lists/queues/announce, priorities, and **two delivery modes** (queue vs interrupt). | P3 | Urgent things reach a busy agent; the rest wait. | Message urgency maps to a delivery strategy. |
| **F04-04** | **The 3-second idle-or-queue fallback** in the router. | P3 | Nothing is lost when the recipient is mid-task. | Graceful degradation in the messaging layer. |
| **F04-05** | **The Deacon's heartbeat is a file**, read by the daemon, with thresholds (5m/20m) tuned against another component's sleep window and overridable by config. | P3 | A dead supervisor is detected and poked. | Liveness with a documented, tunable budget. |
| **F04-06** | **The patrol formula is a design document** — an *Idle Town Principle*, a *Mayor Nudge Policy* (nudging the Mayor for health is a *"ZFC violation"*), and an **explicit answer to "who watches the watchers"** (monitor a timestamp, don't send mail). | P3 | The system is quiet when healthy and escalates only real problems. | The supervision policy is executable, and the recursion is resolved on purpose. |
| **F04-07** | **The watchdog chain has a named base case** — Boot is *"a dog that runs fresh on each daemon tick"* and must wake the Deacon through `gt nudge`, never raw tmux. | P3 | The supervisor restarts itself without a human. | The recursion is closed by a component that is re-created every tick. |
| **F04-08** | **A batch-then-bisect merge queue** with `MaxBatchSize`/`BatchWaitTime`/`RetryBatchOnFlaky`, and an explicit note that bisection is `O(log N)` and flaky tests get one retry before anyone is blamed. | P3 | Merges are fast, and a flaky test does not fail an innocent change. | Throughput traded against cost, with flakiness designed for. |
| **F04-09** | **An operator safety stop as a bead label** — *"the durable operator-cleared guard"*. | P3 | A human can halt merging and it stays halted. | The stop is in the same durable store as the work. |
| **F04-10** | **Re-dispatch with a cap and a cooldown, then escalation to the Mayor** — *"prevents thrashing when a bead keeps killing polecats"*. | P3 | A poisonous task stops cycling and reaches a human. | Bounded retries with an escalation path. |
| **F04-11** | **The reaper executes SQL but makes no decisions** — the Dog decides, from a formula. | P3/PZ | Cleanup is predictable and attributable. | ZFC stated at the exact point where a helper could have been tempted to decide. |
| **F04-12** | **Convoys feed the next issue reactively**, not on a poll, and the operation is idempotent. | P3 | Work flows as soon as it is unblocked. | Event-driven progression with safe re-entry. |
| **F04-13** | **The retirement ledger**: a legacy DB name in a *fallback* produced phantom errors; raw tmux wakes are forbidden by test. | PZ | (indirect) — fewer phantom failures. | A fallback list is where a stale name hides. |

---

## 9. Divergences and honest bounds

- **No doc-vs-code divergence was needed**; the formula prose, the code comments and the tests agree, and
  where a rule exists it is enforced (F04-02).
- **Bound:** this batch read the **delivery layer** — the formula library, mail, the patrols, the merge
  queue, recovery, and convoys. It did **not** read the daemon's own scheduling loop in full
  (`daemon/daemon.go` is large) nor every formula's body; the four patrol formulas are the ones read.
- **Bound:** `refinery/score.go`, `engineer.go` and `terminal_mr.go` are **named** but not analysed; the
  merge *decision* logic beyond batching/bisection is not claimed here.
- **Bound:** the `mol-dog-*` formulas are **listed** (8 of them) and the reaper's contract is read; the
  other seven dogs' bodies are not, and are named rather than half-covered.
- **Bound (stated plainly):** the Deacon patrol's prose is quoted for **what it demands**, which is the
  finding; it is a long document and a later batch could read more of it.

---

## 10. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **Workflows as embedded TOML with tested prose (F04-01 / F04-02)** — 47 formulas, four types, and a
   test that forbids a specific instruction from reappearing.
2. **The patrol formula as an executable design document (F04-06)** — an idle policy, an escalation policy
   with its reason, and a named resolution of the watchdog recursion.
3. **The batch-then-bisect merge queue with a flaky-test retry and a bead-label safety stop
   (F04-08 / F04-09)** — throughput, cost and operator control in one small config.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 04 of 07. Read from source on 2026-10-15. Next: `findings/05-widgets-and-frontend.md`.*
