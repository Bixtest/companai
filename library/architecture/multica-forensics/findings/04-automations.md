# Batch 04 — Automations (P3)

**Study:** Multica `0.2.0` · **Batch:** 04 of 07 · **Status:** COMPLETE
**Source:** `github.com/multica-ai/multica` → `platforms/_extracted/multica-main`
**Zip md5:** `30ddc64af536212e25a6c00db5672b82` · **License:** Apache-2.0 + Multica conditions
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; code is the authority. Nothing in this file was inferred from a README.

---

## 0. What this batch had to answer

P3 is **automations** — where agents work on assigned tasks. Batch 01 named this *"the layer CrewAI
was measured to lack"*: a real queue, a claim, a scheduler and a failure taxonomy. This batch opens the
delivery layer up.

Short answer, measured:

| Question | Multica's answer | Where |
|---|---|---|
| How is work queued and claimed? | A literal `agent_task_queue` table claimed by `FOR UPDATE SKIP LOCKED`, ordered `priority DESC, created_at ASC, id ASC` | F04-01 |
| How is a claim kept honest? | A **prepare lease** + attempt counters + a per-task heartbeat; four named sweepers clean up the dead | F04-02/03 |
| How does a periodic job run once across many app instances? | `sys_cron_executions` — the row **is** the lease **and** the audit entry | F04-04 |
| What is an "autopilot"? | A stored automation: a trigger (schedule/webhook/api) → a run → an issue and/or a task | F04-05 |
| How are failures classified? | A canonical 27-value taxonomy, 13 platform-side + 14 `agent_error.*` | F04-06 |
| How do deferred events (wakeups) work? | `issue_wakeup` — a durable rule with a revision fence and a receipt dedup table | F04-07 |

---

## 1. The queue — a literal table

`agent_task_queue` (`001_init`) is not a broker; it is a table:

```
agent_task_queue (id, agent_id, issue_id, status, priority, dispatched_at, started_at,
                  completed_at, result, error, created_at)              -- 001_init
  status ∈ {queued, dispatched, running, completed, failed, cancelled, waiting_local_directory}
```

Later migrations added the columns that make it a *durable* queue rather than a list:

| Column(s) | Migration | Why |
|---|---|---|
| `runtime_id` (NOT NULL) | `004` | the claim is per **runtime**, not per agent (§3) |
| `attempt`, `max_attempts` (default 2), `parent_task_id`, `failure_reason`, `last_heartbeat_at` | `055` | retry/lease bookkeeping — *"so the runtime sweeper and the daemon startup recovery path can distinguish 'fresh attempt' from 'auto-rerun after orphan'"* |
| `initiator_user_id` | `117` | who physically sent the trigger |
| `originator_user_id` | `129` | the **top-of-chain human** (§ batch 02, F02-10) |
| `prepare_lease_expires_at` | `124` | the prepare lease (§3) |

The distinction between `initiator` and `originator` is stated in `129`'s header and matters: for an
agent fan-out the *initiator* is another agent, so attribution needs the human at the top of the chain —
the same value batch 02 found the invocation gate reading.

---

## 2. The claim — one SQL statement

The whole claim is a single statement, `pkg/db/queries/agent.sql:749-810` (`ClaimAgentTask`). Its shape
is the finding:

```sql
UPDATE agent_task_queue
SET status = 'dispatched', dispatched_at = now(),
    prepare_lease_expires_at = now() + make_interval(secs => @prepare_lease_secs)
WHERE id = (
    SELECT atq.id FROM agent_task_queue atq
    WHERE atq.agent_id = @agent_id AND atq.runtime_id = @runtime_id
      AND atq.status = 'queued'
      AND ( … the wakeup revision fence … )
      AND EXISTS ( … the runtime is online and recently seen … )
      AND NOT EXISTS ( … no active sibling for this issue / chat / quick-create … )
    ORDER BY atq.priority DESC, atq.created_at ASC, atq.id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

Four things are worth naming:

1. **`FOR UPDATE SKIP LOCKED`** (`:808`) — replicas never fight over the same row; the loser moves on.
2. **The order is total** — `priority DESC, created_at ASC, id ASC`. The `id` tiebreak means two rows
   created in the same microsecond still have a stable order, so the queue is deterministic.
3. **Serialization is per work-item, not per agent.** The `NOT EXISTS` block (`:789-805`) forbids a
   second active task for the same `(issue, agent)` — *"This allows different agents to work on the same
   issue in parallel while preventing a single agent from running duplicate tasks."* Chat tasks serialize
   on `chat_session_id`; quick-create tasks (all four FKs NULL) serialize against each other, *"otherwise
   a user mashing the create button could fire concurrent quick-creates."*
4. **The runtime health gate is inside the claim.** The `EXISTS` block (`:770-788`) requires the bound
   runtime to be `online` and seen within `runtime_stale_secs` — so a task is never handed to a machine
   the platform already believes is gone. And the persisted `runtime_id` is *not* authority: the query
   re-checks `a.runtime_id = atq.runtime_id` after a rebind (`:775-776`).

---

## 3. Leases and retries

Three mechanisms keep a claim honest:

- **The prepare lease** (`124`). The claim sets `prepare_lease_expires_at = now() + prepare_lease_secs`
  (`agent.sql:763`). A dispatched-but-never-started task therefore expires on its own, and a sweeper can
  reclaim it — the gap between "handed out" and "actually running" is bounded.
- **Attempts** (`055`). `attempt` starts at 1, `max_attempts` defaults to 2 (1 disables retry), and
  `parent_task_id` points back to the task a retry re-attempts. The `failure_reason` decides *whether* to
  retry: `055`'s comment lists the coarse classifiers the auto-retry path reads.
- **A per-task heartbeat** (`055`, `last_heartbeat_at`). *"the runtime heartbeat already drives runtime
  liveness, but per-task timestamps let us tell stale tasks apart from long-running ones."*

**The distinction that makes this a delivery layer and not a queue:** a task is not just "running" — it
carries *how many times it has run*, *what it is retrying*, and *when it last proved it was alive*.

---

## 4. The sweepers — four named janitors

`internal/service/task.go` carries the recovery functions, each named for the condition it repairs:

| Function | Line | Repairs |
|---|---|---|
| `ExpireStaleQueuedTasks` | `:5979` | a task that sat `queued` past its TTL without a claim (autopilot backlog while the runtime is offline) |
| `FailStaleTasks` | `:5972` | a task that went silent past its heartbeat budget |
| `FailTasksForOfflineRuntimes` | `:5957` | tasks bound to a runtime that went offline |
| `FailExpiredRuntimeReconnectRetries` | `:5965` | reconnect attempts that ran out of time |
| `RecoverOrphanedTasksForRuntime` | `:5986` | tasks orphaned by a runtime restart |

**Plainly:** the platform assumes machines die. Every way a task can get stuck has a named, separate
repair — and the repairs are idempotent by construction (they act on a status predicate, so a second run
matches nothing).

---

## 5. The failure taxonomy — 27 values, and why

`pkg/taskfailure/failure.go` is the canonical list, and its header is the study-worthy part. Until
MUL-1949, failures were a handful of coarse strings, and *"'agent_error' grew to ~30% of all failures and
hid the real cause (provider 401, quota exceeded, context overflow, runner crash, etc.) inside the
free-form `error` text column."* The fix lifted the classifier into the **write path** so a row is
refined when first stored, and split the values into two groups by prefix:

- **13 platform-side** values, no prefix — emitted by the sweepers and the daemon when the fault is the
  platform's (`queued_expired`, `runtime_offline`, `runtime_reconnect_timeout`, `runtime_recovery`,
  `timeout`, `iteration_limit`, `agent_blocked`, `api_invalid_request`, `skill_bundle_unavailable`,
  `runtime_cli_timeout`, `environment_prepare_failed`, `invalid_task_identity`, `runtime_access_denied`).
- **14 agent-side** values, all prefixed **`agent_error.`** — produced by `Classify(rawError)` when the
  agent process surfaced an error.

`IsAgentError` is then a **string-prefix check**, not a list. The header also records the two rules that
keep it stable: *"the string forms … are persisted into the database and surfaced as Prometheus labels.
Renaming a value is a breaking change."* And a new classifier-derived value *requires a matching SQL
backfill rule*, while a new platform-side value may be added directly because no historical rows need
re-classifying.

**The transferable idea:** a prefix turns "whose fault is this?" from a judgement into a string operation.

---

## 6. The scheduler — the row is the lease and the audit log

`113_sys_cron_executions.up.sql` adds `sys_cron_executions`, and its header states the design:

> *"One row represents a single planned execution of a registered system job for a single scope at a
> single canonical UTC `plan_time` bucket — the row is both the distributed lease and the audit log
> entry."*

Invariants, each stated in the migration and enforced in the schema:

- **The unique key `(job_name, scope_kind, scope_id, plan_time)` is *"the only thing standing between two
  app instances and a double-run."*** Scope defaults to `'global'` for both kind and id so a global job
  lands on the same uniqueness slot **without NULL semantics**.
- **No `STALE` state.** Stale is computed — `status='RUNNING' AND stale_after < now()` — *"which keeps
  lease theft a single UPDATE."*
- **Lease ownership via `lease_token`,** rotated on every claim/steal. Every mutation that touches a live
  lease must match `id = $id AND lease_token = $token AND status = 'RUNNING'`; a runner that lost its
  lease sees `RowsAffected = 0` and stops, *"so it cannot rewrite a newer attempt's state."*
- **`attempt`/`max_attempts` are bounded by CHECK** so *"a buggy handler cannot 'escape' the retry
  envelope."*

Above the table, `internal/scheduler/spec.go` declares each job as a `JobSpec`: `Cadence`,
`ScheduleDelay`, `CatchUpMode`, `CatchUpWindow`, `MaxPlansPerTick`, `RunTimeout`, `StaleTimeout`,
`HeartbeatInterval`, `AllowStaleReentry`, `MaxAttempts`, `RetryBackoff`, `Scopes`. Two design choices
stand out:

- **Catch-up is a declared per-job decision.** `CatchUpMode` (`spec.go:24-38`) is either
  `CatchUpLatestOnly` (the handler has its own watermark) or `CatchUpEveryPlan` (each bucket has
  independent meaning). *"The cron was down for six hours"* becomes a decision the job author makes once,
  not a runtime guess.
- **`AllowStaleReentry` is opt-in.** A non-idempotent job sets it false; a stale lease then goes to
  `FAILED` with `error_code='stale_timeout'` and needs manual repair, rather than being silently re-run.

The registered jobs are declared in Go and inserted on demand — the migration explicitly *"does NOT
register any jobs."* Today's set includes `autopilot_schedule_dispatch`
(`jobs_autopilot.go:22`), `issue_wakeup_dispatch`, `issue_child_event_sweep`,
`rollup_task_usage_hourly` and `prune_search_index_changes`. Each has a **stable name** because it is the
audit key: *"renaming it would orphan historic rows."*

---

## 7. Autopilots — automation as data

`042_autopilot.up.sql` models an automation as three tables, and the shape is the point:

- **`autopilot`** — the definition: `assignee_id` (an agent), `status ∈ {active, paused, archived}`,
  `execution_mode ∈ {create_issue, run_only}`, `issue_title_template`, and **`concurrency_policy ∈ {skip,
  queue, replace}`** — what to do when a run is already in flight.
- **`autopilot_trigger`** — *how* it fires: `kind ∈ {schedule, webhook, api}`, `cron_expression`,
  `timezone`, `next_run_at`, `webhook_token`, `last_fired_at`. A **partial index** on `next_run_at` where
  `enabled = true AND kind = 'schedule'` is exactly the scheduler's due-work scan.
- **`autopilot_run`** — one execution: `source ∈ {schedule, manual, webhook, api}`, `status ∈ {pending,
  issue_created, running, skipped, completed, failed}`, and links to the `issue_id` and `task_id` it
  produced.

Later migrations add the hardening: `091` webhook triggers, `124` `planned_at`, `186`/`187`
`autopilot_rule_version` (a versioned rule so a firing can name the configuration it ran under), and
`189` the **responsible publisher** — *"an autopilot … run is accountable to the human RESPONSIBLE for
the firing trigger's current effective configuration — initially whoever created the trigger, then
TRANSFERRED to whoever later makes a substantive edit."* It is stored **on the trigger row, not derived
from the autopilot-scoped `rule_version`,** *"precisely so per-trigger granularity holds."* And the
migration is explicit about the boundary: this is *"consumed only for attribution … never
authorization."*

**The finding:** the automation is a stored, versioned, attributed object — not a cron entry. `042`'s own
one-liner is *"scheduled/triggered automations that assign recurring work to AI Agents."*

---

## 8. Wakeups — deferred, revision-fenced events

`509_issue_wakeup.up.sql` (19 lines) adds two tables that together are a small durable event system:

- **`issue_wakeup`** — a rule: `kind ∈ {event, at, every, cron}`, `mode ∈ {once, continuous}`,
  `event_types text[]`, optional `filter_agent_id`/`filter_task_id`, `interval_seconds`,
  `cron_expression`, `timezone`, `next_fire_at`, `enabled`, `disabled_at`, and a **`revision`** counter.
- **`issue_wakeup_receipt`** — a dedup record: one row per `(wakeup_id, revision, event_key)`, with
  `task_id` and `processed_at`.

The revision fence is what makes the design safe: the claim query (`agent.sql:769`) only claims a task
whose wakeup still exists, is **not disabled**, and whose **`revision` matches** the revision the task
was created under — so editing a wakeup invalidates tasks queued under the old rule instead of letting a
stale trigger fire. The receipt table makes "did this event already fire?" a uniqueness check, so a
replayed event does not double-run.

**Plainly:** a wakeup is a rule with a version, and a receipt log with a unique key — a deferred event
that cannot fire twice and cannot fire under a rule that no longer exists.

---

## 9. Recovery as a bounded, resumable walk

`internal/delegatedrecoverybackfill/backfill.go` is a backfill, and its header documents the measured
design: it retires recovery comments already settled by a terminal receipt, walking in batches. Its own
comment records a **measurement** — *"Measured on a synthetic table of 500k comments / 200k tasks / 50k
unsettled recoveries, total walk time is flat across batch size — 50×228ms at 1000, 10×1016ms at 5000,
5×2199ms at 10000, all ~11s"* — and states when it is safe to run (*"after every backend in a rolling
deployment carries the writing code"*).

**Why it is a P3 finding:** the delivery layer's history is repaired by a **bounded, resumable,
measured** job rather than a one-shot script — the same posture as the sweepers.

---

## 10. The retirement ledger (rule 10)

| Migration | What was removed | Why |
|---|---|---|
| `043_fix_orphaned_autopilot_runs` | orphaned autopilot runs | repaired an early model's orphans |
| `058_drop_autopilot_priority_and_project_id` | autopilot `priority` + `project_id` | the autopilot scheduling model was simplified (batch 03 recorded this too) |
| `144_drop_agent_task_queue_chat_pending_v1` | the v1 chat-pending marker | superseded by v2 (`143`), itself superseded by v3 (`255`) — **the queue's chat-pending concept went through three versions** |
| `256_drop_agent_task_queue_chat_pending_v2` | the v2 chat-pending marker | superseded by v3 (`255`) |
| `262_drop_agent_task_queue_terminal_completed_at_v1` | the v1 terminal-completed index | replaced by v2 (`261`) |

**The lesson here is sharper than in earlier batches:** the *same* concept (a "chat is waiting on a
task" marker, a "terminal completed_at" index) was built, dropped and rebuilt **twice**. A reader of the
current schema sees one index and one marker; the migrations show the two that came before. This is the
strongest evidence yet that the migration chain — not the schema — is the durable truth.

---

## 11. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F04-01** | **A literal queue table** with a single-statement claim (`FOR UPDATE SKIP LOCKED`, total order, per-work-item serialization, runtime health gate inside the claim). | P3 | Work is picked up fairly and never double-run. | The delivery primitive — a real queue without a broker. |
| **F04-02** | **Leases** — a prepare lease for the dispatch gap, attempt counters, and a per-task heartbeat. | P3 | A stuck hand-off self-heals instead of hanging forever. | Bounded, self-repairing delivery. |
| **F04-03** | **Four named sweepers**, one per way a task can die. | P3 | A dead machine does not strand a user's task. | Recovery is explicit and idempotent, not hoped-for. |
| **F04-04** | **`sys_cron_executions`** — the row is both the distributed lease and the audit log; lease tokens; no materialised stale state; declared catch-up. | P3 | Periodic work runs once, not twice. | A scheduler a single process cannot corrupt, with a per-job catch-up decision. |
| **F04-05** | **Autopilot as data** — definition + triggers + runs, with `concurrency_policy`, versioned rules and a per-trigger responsible publisher. | P3 | Recurring work is a thing you configure, not a script. | Automation is stored, versioned and attributed. |
| **F04-06** | **A 27-value failure taxonomy**, 13 platform + 14 `agent_error.*`, with the prefix as the classifier. | P3 | Failures are diagnosable ("the platform's fault or the agent's?"). | Failures become a metric label, not free text. |
| **F04-07** | **Wakeups** — a revision-fenced rule plus a receipt dedup table. | P3 | A deferred action fires exactly once, under the rule you last set. | Durable, versioned eventing. |
| **F04-08** | **The prepare lease** closes the gap between "dispatched" and "running". | P3 | A task handed to a machine that never starts does not vanish. | The dispatch hand-off is bounded. |
| **F04-09** | **`awakeclock`** — a clock that advances only while the host is awake, so a liveness budget is not confused by a laptop sleeping. | P3 | A suspended machine does not look like a hung one. | Correct liveness measurement across hosts. |
| **F04-10** | **Recovery as a bounded, measured, resumable walk** (`delegatedrecoverybackfill`), with its own performance measurement in the header. | P3 | (indirect) — history is repaired without a stall. | Repair that is safe to run and re-run in production. |
| **F04-11** | **The retirement ledger** — chat-pending and terminal-index concepts each built, dropped and rebuilt twice. | PZ | (indirect) — the queue you get is the third design. | Rule 10 pays hardest here: the schema hides two prior designs. |

---

## 12. Divergences and honest bounds

- **No doc-vs-code divergence was needed**; the migration headers and Go comments carry the design record
  and agree with the code, as in batches 02 and 03.
- **Bound:** this batch read the delivery *mechanisms* (queue, claim, lease, sweepers, scheduler,
  autopilot, wakeups). It did **not** read the daemon's execution loop itself (`internal/daemon/`), which
  is where a claimed task is actually run — that is a P1/P3 boundary and is named here rather than
  half-covered.
- **Bound:** `AutopilotScheduleDispatchJob` *"replaces the legacy `cmd/server/autopilot_scheduler.go`
  goroutine (MUL-3551)"* — the old in-process scheduler is gone; this batch records the replacement, not
  the removed code (which is not in the tree).
- **Bound:** the `sys_cron_executions` retention/prune path exists as an index in `113`; this batch did
  not open the prune handler.

---

## 13. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The single-statement claim (F04-01)** — a total order, per-work-item serialization, and a runtime
   health gate all inside one `UPDATE … FOR UPDATE SKIP LOCKED`. It is the most complete "claim" seen in
   the study.
2. **The row-as-lease scheduler (F04-04)** — `sys_cron_executions` unifies the distributed lock and the
   audit log in one row, with lease tokens and declared catch-up.
3. **The failure taxonomy (F04-06)** — 27 values split by a prefix, so "whose fault" is a string
   operation, with the renaming rule written down.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 04 of 07. Read from source on 2026-10-15. Next: `findings/05-widgets-and-frontend.md`.*
