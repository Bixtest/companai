# 03 — Paperclip: tasks and delegation
**Batch 03 of the Paperclip + Hermes study. Written 2026-10-05.**

Subject: **upstream** Paperclip at `library/ai/paperclip-master/` (the newest version). This is not our code and not the 0.3.1 fork. Everything below cites the upstream file it came from. Where a document and the code disagree, I say so and trust the code.

A note that governs this whole batch: `doc/TASKS.md:4-5` says of itself that it is "Written as a target model -- some of this is already implemented, some is aspirational." Several of its headline claims (teams, workflow states, a 0–4 priority scale, a single `assigneeId`) do **not** exist in the shipped schema. I treat the schema and shared constants as ground truth.

---

## 1. What is a task?

A task is a row in the `issues` table (`packages/db/src/schema/issues.ts:26`). The word "task" is the product name; the code and the API call it an "issue" throughout (`DESIGN.md:35` says the canonical term is *task* and that the rename is a UI concern). There is no separate "task" table.

### Fields that exist in the schema

Taken directly from `packages/db/src/schema/issues.ts`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `issues.ts:29` |
| `companyId` | uuid FK | every task is company-scoped; `issues.ts:30` |
| `title` / `description` | text | `issues.ts:41,43` |
| `status` | text, default `"backlog"` | `issues.ts:44` |
| `statusVersion` | bigint, default 0 | monotonic, advances only on status change (`issues.ts:45`; `doc/DATABASE.md:309`) |
| `priority` | text, default `"medium"` | `issues.ts:49` |
| `workMode` | text, default `"standard"` | `issues.ts:47` |
| `assigneeAgentId` | uuid FK → agents | `issues.ts:51` |
| `assigneeUserId` | text | `issues.ts:52` |
| `checkoutRunId` | uuid FK → heartbeat_runs | ownership lock for the current run (`issues.ts:53`) |
| `executionRunId` | uuid FK → heartbeat_runs | the run actually live now (`issues.ts:54`) |
| `executionLockedAt` | timestamp | `issues.ts:56` |
| `parentId` | uuid FK (self) | sub-task nesting (`issues.ts:40`) |
| `projectId`, `goalId`, `projectWorkspaceId` | uuid FK | `issues.ts:37,39,38` |
| `createdByAgentId` / `createdByUserId` | uuid / text | who created it (`issues.ts:57-58`) |
| `issueNumber`, `identifier` | int, text | `issues.ts:60-61` |
| `originKind` | text, default `"manual"` | how the task came to exist (`issues.ts:62`) |
| `originId`, `originRunId`, `originFingerprint` | text | provenance (`issues.ts:63-64,67`) |
| `requestDepth` | int, default 0 | delegation depth (`issues.ts:68`) |
| `executionPolicy`, `executionState` | jsonb | approvals/review/monitor state (`issues.ts:71-72`) |
| `monitorNextCheckAt`, `monitorAttemptCount`, `monitorNotes` | timestamp/int/text | one-shot deferred checks (`issues.ts:73-77`) |
| `unblockDescriptor` | jsonb | structured "who unblocks this" (`issues.ts:84`) |
| `startedAt`, `completedAt`, `cancelledAt`, `hiddenAt` | timestamp | `issues.ts:87-90` |

There is also a rich set of **partial unique indexes** that encode product rules, e.g. one open routine execution per `(company, originKind, originId, originFingerprint)` (`issues.ts:140-148`), one active task watchdog per watched issue (`issues.ts:173-180`), and one active stranded-recovery issue per source (`issues.ts:189-196`). These indexes are how the code makes "at most one of X" true under concurrency.

### Lifecycle and states

The shipped status set is a **flat enum**, not the team-scoped workflow model in `doc/TASKS.md`. `packages/shared/src/constants.ts:189-198`:

```
ISSUE_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"]
```

`doc/execution-semantics.md:32-136` gives the meaning of each:

- `backlog` — "not ready for active work", no execution or pickup expectation (`execution-semantics.md:36-42`).
- `todo` — actionable but unclaimed; for agent-assigned work Paperclip may need a wake path so the assignee sees it (`execution-semantics.md:44-50`).
- `in_progress` — actively owned; for agent-owned tasks this is a strict execution-backed state that must not become a "silent dead state" (`execution-semantics.md:52-60`).
- `blocked` — waiting; entering it requires a routable waiting path (blockers, a pending interaction/approval, or a structured `{owner, action}` descriptor) (`execution-semantics.md:62-79`).
- `in_review` — execution paused because the next move belongs to a reviewer/approver (`execution-semantics.md:85-89`).
- `done` and `cancelled` — terminal (`execution-semantics.md:130-136`).

**Disagreement with the doc.** `doc/TASKS.md:61-96` describes status as team-specific `WorkflowState` rows with fixed categories (Triage/Backlog/Unstarted/Started/Completed/Cancelled). No `workflow_states` table and no `teams` table exist in `packages/db/src/schema/` (directory listing). The code has one flat enum. Trust the code.

**Priority disagreement.** `doc/TASKS.md:99-112` describes a numeric 0–4 scale defaulting to 0. The code has `ISSUE_PRIORITIES = ["critical", "high", "medium", "low"]` (`constants.ts:210`) and the DB default is the string `"medium"` (`issues.ts:49`). Trust the code.

**Work modes** are real: `["standard", "ask", "planning", "skill_test"]` (`constants.ts:214-215`).

**Origin kinds** are real and matter for delegation: `["manual", "routine_execution", "stale_active_run_evaluation", "harness_liveness_escalation", "issue_productivity_review", "stranded_issue_recovery", "task_watchdog", "task_watchdog_product_bug", "onboarding_first_task", "chat_channel"]` (`constants.ts:356-368`), plus plugin origins (`constants.ts:370`).

### Identifiers

`identifier` is built as `${company.issuePrefix}-${issueNumber}` using a per-company counter (`server/src/services/issues.ts:10157-10161`, `10317-10409`). It is **not** `{TEAM_KEY}-{NUMBER}` as `doc/TASKS.md:335-341` claims; there is no team key. There is no `previousIdentifiers` field on the schema either.

### Assignment invariant

An issue has **at most one assignee**, and an agent assignee and a user assignee cannot both be set (`doc/execution-semantics.md:22-30`). This is enforced partly by the conversation check constraint (`issues.ts:96-104`) and by service logic. `doc/TASKS.md:250-262` frames the same single-assignee rule.

---

## 2. How is work assigned to an agent?

**Assignment is manual or explicit; there is no automatic routing.** I found no code path that picks an agent for an unassigned task. The board (or a creating agent) sets `assigneeAgentId`; a routine names its own `assigneeAgentId`; a delegating agent creates a child assigned to a named agent. What the system *does* automatically is **wake** a named assignee.

Mechanics:

- On create/update with an assignee, the service calls `queueIssueAssignmentWakeup` (`server/src/services/issue-assignment-wakeup.ts:25-77`). It is a no-op unless `assigneeAgentId` is set and status is not `backlog` (`issue-assignment-wakeup.ts:43`). The wake is `source: "assignment"`, `triggerDetail: "system"`, carrying `issueId`, `mutation`, and an optional `wakeCommentId` (`issue-assignment-wakeup.ts:46-77`).
- The reason string used on ordinary assignment is `"issue_assigned"` (`server/src/services/routines.ts:1977`; the same helper is used across assignment paths).
- An explicit assigned `backlog` task does **not** wake anyone: assigning normally implies executable intent, but parking in backlog is respected (`execution-semantics.md:536-544`).

**Who may be an assignee** is validated, not free-form. `assertAssignableAgent` (`server/src/services/agent-assignability.ts:104-171`) rejects an agent that is not in the same company, is pending approval, terminated, has an unknown lifecycle status, or whose org chain (via `reportsTo`) is broken/cyclic/cross-company (`agent-assignability.ts:11-44,97-171`). The org chart itself is `agents.reportsTo` (self-FK), plus `role`, `title`, `status` (`packages/db/src/schema/agents.ts:22,23,26,27`).

**What decides which agent gets a task:** a human or an agent chooses. The system contributes only (a) the eligibility check above and (b) the org-chain health used in that check.

### Recurring work (the "cron" case)

Routines are the recurrence primitive. A routine has an `assigneeAgentId`, `priority`, `concurrencyPolicy`, and `catchUpPolicy` (`packages/db/src/schema/routines.ts:34,35,37,38`). Triggers are `["schedule", "webhook", "api"]` (`constants.ts:648`), and a schedule trigger stores a `cronExpression`, `timezone`, and `nextRunAt` (`routines.ts:118-120`). When a routine fires, it **creates an issue** and then wakes the assignee with reason `"issue_assigned"` (`server/src/services/routines.ts:1973-1985`). A partial unique index enforces one open execution issue per routine/fingerprint (`issues.ts:140-148`); on collision the run is recorded as `coalesced` or `skipped` per `concurrencyPolicy` (`routines.ts:1938-1961`).

---

## 3. How does delegation work?

Yes — one agent can delegate to another, and a task can be handed on. The mechanism is deliberately narrow and is spelled out in `doc/execution-semantics.md` §6.

### Structure vs dependency vs ownership vs execution

The model keeps four things separate: `parentId` is **structure** only, blockers are **dependency**, assignee fields are **ownership**, and run/checkout columns are **execution** (`execution-semantics.md:11-20`). A parent is not automatically waiting on a child; to make a parent wait you add a blocker (`execution-semantics.md:247`).

### Delegating downward: `create_task`

A `standard` run can call the `create_task` capability, categorised under the `delegation` tool namespace (`packages/paperclip-runner/src/semantic-tools/discovery.ts:36-37,47`). It creates a standard child under the active issue, with idempotency scoped by source issue and caller key; a blocker-free child starts `todo`, a child with unresolved blockers starts `blocked`, and only dependency-ready assigned children wake (`execution-semantics.md:273`). A backlog child is persisted with its plan document but **no wake** (`server/src/services/native-runtime/task-creation-backlog.test.ts:31-50`). Unsupported initial statuses are rejected before any mutation (`task-creation-backlog.test.ts:62-67`). `set_dependencies` changes the active source issue's first-class blockers (`execution-semantics.md:273`).

### The write boundary and the three report channels

A run's write authority is **subtree-scoped**: it may mutate its checked-out issue and that issue's descendants, and only three channels cross upward (`execution-semantics.md:251-265`):

1. **Completion signal (always on).** When a child that blocks its parent reaches `done`, the `issue_blockers_resolved` wake engages the parent's assignee; the child's own thread is the deliverable record (`execution-semantics.md:253`).
2. **Direct-parent report comment (trust-gated).** A run on a child may post comments on the child's *direct parent* only — comments only, one hop, gated on the trust preset (on for `standard`, off for `low_trust_review`) (`execution-semantics.md:254`).
3. **Stop-only relay (fallback).** Where the report comment is off, the platform posts a system relay to the direct parent when the child becomes `blocked` or `cancelled` — never on `done`/`in_review` (`execution-semantics.md:255`).

### Lateral coordination: the courier pattern

The sanctioned way to hand work to a peer is the **courier pattern**: create a new issue assigned to the target agent whose description carries the complete instructions (issue-CREATE is company-scoped and allowed from any run). The description must be self-contained because the target run may not be able to read the source subtree (`execution-semantics.md:263-265`).

### Review delegation

Review tasks must instruct the delegate to post findings on **their own** review issue and mark it `done`; a completed review with adverse findings is `done`, not `blocked` (`execution-semantics.md:257-261`). For a native completion review addressed to an agent, the server saves the review card and a durable reviewer wake in the same transaction; accepting the last required review marks the child Done and releases dependents, while rejection returns changes to the worker (`execution-semantics.md:91-109`).

### Handing a task on (ownership change)

An ownership change is a comment-plus-assignment update: setting `assigneeAgentId` makes that agent owner, clearing it or setting `assigneeUserId` makes it human-owned/unassigned (`execution-semantics.md:415-423`). If the update also assigns a non-terminal, non-backlog issue to an agent, Paperclip enqueues exactly one wake for the new assignee and includes the interrupting comment (`execution-semantics.md:421`). A `reassign_task` capability also exists (`packages/paperclip-runner/src/semantic-tools/types.ts:47`). An @-mention is explicitly **not** assignment or a wake request (`execution-semantics.md:425`).

### Dependencies between tasks

Blockers are first-class (`issues.ts` relation table `issue_relations`; `packages/db/src/schema/issue_relations.ts`). The only relation type in code is `"blocks"` (`constants.ts:426-427`), where `doc/TASKS.md:220-247` lists four (`related`, `blocks`, `blocked_by`, `duplicate`). Trust the code: `blocked_by` is the inverse view of a `blocks` edge, not a stored type. When all blockers resolve, the `issue_blockers_resolved` wake fires; its idempotency is level-triggered and cycle-aware (`server/src/services/issue-dependency-wakeups.ts:6,112-129,189-239`). `cancelled` is terminal for the blocker itself but does **not** satisfy the dependency (`execution-semantics.md:245`).

---

## 4. What is a "heartbeat run"?

`DESIGN.md:13` names "heartbeat runs" as one of the control plane's core objects. A **heartbeat run** is one execution of one agent, stored as a row in `heartbeat_runs` (`packages/db/src/schema/heartbeat_runs.ts:20`). It is not a fixed-clock pulse; it is the materialisation of a queued wake.

### The wakeup queue

Agents do not poll a task list. The control plane maintains a DB-backed wakeup queue in `agent_wakeup_requests` (`packages/db/src/schema/agent_wakeup_requests.ts:15`). A wake has a `source`, `triggerDetail`, `reason`, `payload`, `status`, and a `coalescedCount` (`agent_wakeup_requests.ts:25-30`). Sources are `["timer", "assignment", "on_demand", "automation"]` (`constants.ts:896-901`); statuses include `queued`, `deferred_issue_execution`, `claimed`, `coalesced`, `skipped`, `completed`, `failed` (`constants.ts:907-914`). README summarises this as a "DB-backed wakeup queue with coalescing, budget checks, workspace resolution, secret injection, skill loading, and adapter invocation" (`README.md:273`).

### How often

Two different cadences:

- **The control-plane scheduler tick** runs every `heartbeatSchedulerIntervalMs`, default **30 000 ms**, floored at 10 000 ms (`server/src/config.ts:360`; wired at `server/src/index.ts:1182-1185,1640`). Each tick calls `heartbeat.tickTimers(now)` (`index.ts:1660-1671`) and `routines.tickScheduledTriggers(now)` (`index.ts:1686-1695`), then runs the recovery passes (below).
- **Per-agent timer heartbeats** are opt-in and off by default: `parseHeartbeatPolicy` reads `runtimeConfig.heartbeat.enabled` (default false) and `intervalSec` (default 0) (`server/src/services/heartbeat.ts:16783-16790`). `tickTimers` only enqueues a run for an agent whose `intervalSec` has elapsed since `lastHeartbeatAt` (`heartbeat.ts:30340-30377`).

So the honest answer: **there is no single heartbeat frequency.** Assignment, on-demand, automation and routine triggers wake an agent immediately; an optional per-agent timer can add periodic wakeups on the agent's own interval; the scheduler itself beats every ~30 s.

### What a run does and how it is recorded

A run row carries `agentId`, `invocationSource`, `status`, `startedAt`/`finishedAt`, `usageJson`, `resultJson`, retry lineage (`retryOfRunId`, `processLossRetryCount`, `scheduledRetryAt/Attempt/Reason`), liveness fields (`livenessState`, `livenessReason`, `continuationAttempt`), a `contextSnapshot`, and native-runner columns (`heartbeat_runs.ts:24-98`). Run statuses are `["queued", "scheduled_retry", "running", "succeeded", "interrupted", "failed", "cancelled", "timed_out"]` (`constants.ts:919-929`). Checkout columns on the issue tie the run to ownership and execution (`issues.ts:53-54`; `execution-semantics.md:160-184`). A run keeps a durable per-run event sequence `nextEventSeq` (`heartbeat_runs.ts:56`).

### Failure handling inside a run

Runs have bounded automatic retry: two automatic retries, 30 s apart, sharing one budget that controller restarts do not reset (`execution-semantics.md:464-466,980`; `heartbeat.ts:818-827`). There is also a max-turn continuation (`MAX_TURN_CONTINUATION_WAKE_REASON`, `heartbeat.ts:901-905`). Retries surface as `scheduled_retry` runs.

---

## 5. Priorities, queueing, budgets and approvals

### Priority

A single text field on the task, one of `critical|high|medium|low`, default `medium` (`constants.ts:210`; `issues.ts:49`). There is no numeric scale and no queue ordered by priority in the scheduler; priority is metadata used by views. `doc/TASKS.md`'s 0–4 model is aspirational (see §1).

### Queueing

The queue is the wakeup table, not a task queue. Two properties matter: **coalescing** (a wake can merge into an existing one, recorded via `coalescedCount` and the `coalesced` status; `agent_wakeup_requests.ts:30`; `constants.ts:911`) and **idempotency keys** with partial unique indexes so retries cannot stack duplicate wakes (`agent_wakeup_requests.ts:59-90`). Blocker resolution specifically uses a level-triggered, cycle-aware state key so one wake covers one ready-state and an earlier blocked cycle does not suppress a later one (`issue-dependency-wakeups.ts:112-172`).

### Budgets

Budgets are scoped policies in `budget_policies`: `scopeType`, `scopeId`, `metric` (default `billed_cents`), `windowKind`, `amount`, `warnPercent` (default 80), `hardStopEnabled` (default true) (`packages/db/src/schema/budget_policies.ts:9-16`). Enforcement compares recorded spend to the amount; at or above the limit with `hardStopEnabled` it is a `hard_stop` (`server/src/services/budgets.ts:72,601,693`) and the scope is paused with `pauseReason: "budget"` (`budgets.ts:221-245,770-804`). `PAUSE_REASONS = ["manual", "budget", "system", "company_archived", "import"]` (`constants.ts:673`). README is candid that enforcement "uses recorded spend; usage reporting and in-flight work can delay a stop" (`README.md:292`).

### Approvals and review stages

Three layers:

1. **Board approvals** — the `approvals` table: `type`, `requestedByAgentId`/`requestedByUserId`, `status` (default `pending`), `payload`, `decisionNote`, `decidedBy*` (`packages/db/src/schema/approvals.ts:5-27`).
2. **Execution policy on the task** — `issues.executionPolicy` holds `mode`, `stages`, an optional `monitor`, and `maxReviewRounds`; `executionState` tracks the current stage/participant and monitor state (`packages/shared/src/types/issue.ts:673-723`). A stage has participants and `approvalsNeeded: 1` (`issue.ts:654-659`).
3. **Issue-thread interactions** — durable in-band requests: `suggest_tasks`, `ask_user_questions`, `request_confirmation`, `request_checkbox_confirmation`, `request_item_verdicts`, `connection_intent` (`constants.ts:259-266`; `packages/db/src/schema/issue_thread_interactions.ts:16-59`). Resolver policy defaults to `anyone`; `not_creator` and `human_only` are opt-ins, and resolution is exact-once and company-scoped (`execution-semantics.md:717-737`).

Agent-facing approval tools exist: `request_approval`, `decide_approval`, `comment_on_approval` (`packages/paperclip-runner/src/semantic-tools/types.ts:55-57`).

---

## 6. How does the system record what an agent did?

Several independent, durable ledgers — none of them is "the" log.

- **Activity log.** `activity_log` records `actorType`, `actorId`, `action`, `entityType`, `entityId`, optional `agentId`, `runId`, `responsibleUserId`, and `details` jsonb (`packages/db/src/schema/activity_log.ts:6-20`). README: "Mutating actions, heartbeat state changes, cost events, approvals, comments, and work products are recorded as durable activity" (`README.md:316`).
- **Run-log events.** `heartbeat_run_events` is the per-run event stream: a per-run `seq`, `eventType`, `stream`, `level`, `message`, a JSONB `payload`, and native source coordinates (`packages/db/src/schema/heartbeat_run_events.ts:18-49`). `doc/run-log-events.md:3-5` states these write to that table and are explicitly **not** Paperclip Telemetry or OpenTelemetry. The doc enumerates the event families: native PRP events with SHA-256 digests and a lossless NUL-safe payload codec (`run-log-events.md:8-35`), settlement diagnostics (`run-log-events.md:37-76`), restart recovery transitions (`run-log-events.md:87-104`), sandbox startup steps (`run-log-events.md:134-158`), and run-phase timings from a closed twelve-name allowlist (`run-log-events.md:160-197`).
- **Work products and artifacts.** `issue_work_products` records `type`, `provider`, `title`, `url`, `status`, `reviewState`, `isPrimary`, `healthStatus`, `metadata`, and `createdByRunId` (`packages/db/src/schema/issue_work_products.ts:18-44`). `doc/AGENT-ARTIFACTS.md` explains the rule that a generated file a reviewer should inspect must be **uploaded** (not left as a local path), via `register_deliverable` on the native runner (`AGENT-ARTIFACTS.md:8-22`) or the upload helper + `POST .../attachments` and `POST .../work-products` on legacy adapters (`AGENT-ARTIFACTS.md:24-46`). It distinguishes `artifact` work products from `workspace_file` references (`AGENT-ARTIFACTS.md:59-98`) and gives the completion pattern: generate, upload, keep the work product, link it, then set status (`AGENT-ARTIFACTS.md:100-121`).
- **Observability.** OpenTelemetry tracing is **opt-in** and traces-only; with `OTEL_EXPORTER_OTLP_ENDPOINT` unset no SDK is imported (`doc/observability.md:9-27`). Task-detail reads emit `Server-Timing` and `issue.read.<phase>` spans with no custom attributes, identifiers or content (`observability.md:38-54`). Sentry is a separate opt-in path (`observability.md:3-5`).
- **Attribution.** Comments carry `createdByRunId` and derived author attribution from lossless signals only (`packages/shared/src/types/issue.ts:935-978`); attachments carry immutable `originatingRunId` set at upload (`issue.ts:1601`; `doc/DATABASE.md:351-360`).

---

## 7. What happens when a task fails, stalls, or an agent goes quiet?

Paperclip separates three mechanisms that share the word "watchdog" (`doc/TASK-WATCHDOG.md:38-46`; `execution-semantics.md:743-747`):

1. **Task watchdog** — opt-in, configured on one issue, fires when the whole watched subtree has come to rest.
2. **Silent active-run watchdog** — automatic, fires when a still-running process produces no output.
3. **Liveness recovery** — automatic, repairs a non-terminal agent-owned task with no live path.

### The liveness contract

For agent-owned non-terminal tasks, the system "should never leave work in a state where nobody is responsible for the next move and nothing will wake or surface it" (`execution-semantics.md:337-343`). A task is *stalled* when it is non-terminal with no live execution path, no explicit waiting path, and no recovery path (`execution-semantics.md:343`). The valid action-path primitives are enumerated at `execution-semantics.md:345-354` (active run, queued wake, typed participant, pending interaction/approval, one-shot monitor, human owner, healthy blocker chain, open recovery action). A key rule: an **unmanaged local/background watcher does not count** — a PID, log file or promise to check later is evidence only (`execution-semantics.md:362-385`).

### Failure and stall recovery

- **Stranded assigned `todo`**: if the latest issue-linked run failed/timed out/was cancelled and no live path remains, Paperclip queues one automatic assignment-recovery wake; if that also ends stranded, the task moves to `blocked` with a board-owned recovery action, preserving the assignee (`execution-semantics.md:626-645`).
- **Stranded assigned `in_progress`**: one automatic continuation wake, then the same escalation (`execution-semantics.md:647-665`).
- **Recovery actions** are durable rows: `issue_recovery_actions` stores `kind`, `status`, `ownerType/ownerAgentId/ownerUserId`, `cause`, `fingerprint`, `evidence`, `nextAction`, `wakePolicy`, `monitorPolicy`, `attemptCount`, `maxAttempts`, `timeoutAt`, `outcome`, `resolutionNote` (`packages/db/src/schema/issue_recovery_actions.ts:16-44`), with a partial unique index allowing at most one active/escalated action per source (`issue_recovery_actions.ts:61-66`). Recovery kinds are `missing_disposition`, `deliberate_wait_without_target`, `stranded_assigned_issue`, `workspace_validation`, `configuration_validation`, `active_run_watchdog`, `issue_graph_liveness` (`constants.ts:377-385`).
- **Three outcomes**: auto-recover (ownership clear, only continuity lost), explicit recovery action (problem identified but not safely completable), human escalation (needs board judgment/budget/approval) (`execution-semantics.md:893-1109`). The model deliberately does **not** auto-reassign: "Paperclip still does not automatically reassign work to a different agent" (`execution-semantics.md:1111-1119`).

### Task watchdog

Configuration is one watched issue + one invokable watchdog agent + optional instructions; at most one active watchdog per issue (`TASK-WATCHDOG.md:50-60`). The scan walks the subtree via `parent_id`, excluding anything whose `originKind = 'task_watchdog'` so it cannot trigger itself (`TASK-WATCHDOG.md:85-92`). It fires only when no included issue has a live run/queued wake/scheduled retry (`TASK-WATCHDOG.md:88`). It computes a **SHA-256 stop fingerprint** over stopped leaves, blockers, pending interactions and the watchdog configuration; a match against `lastReviewedFingerprint` suppresses, a new fingerprint wakes (`TASK-WATCHDOG.md:89-92`). Code confirms this: `stableStopFingerprint` hashes `task_watchdog_stop:` + SHA-256 (`server/src/services/task-watchdogs.ts:304-317`), and the table stores `lastObservedFingerprint`/`lastReviewedFingerprint` (`packages/db/src/schema/issue_watchdogs.ts:18-19`). The watchdog's authority is enforced server-side by a scope check derived from `contextSnapshot.taskWatchdog`, not by prompt text (`TASK-WATCHDOG.md:130-140`). A "live path restored" disposition arms a bounded verification with attempt lineage and human escalation after N=2–3 attempts (`execution-semantics.md:826-838`). The watchdog ticks at startup, at the end of each heartbeat cycle, and on demand after relevant mutations (`TASK-WATCHDOG.md:83`); in code it is `heartbeat.reconcileTaskWatchdogs()` on startup and each scheduler tick (`index.ts:1563,1805`).

### Silent active-run watchdog

Classifies output silence as `ok`, `suspicious` after five minutes, `critical` after fifteen, `snoozed`, or `not_applicable` (`execution-semantics.md:848`). Suspicious/critical silence are **informational board UI signals**: they do not create an issue, block the source, wake an agent, or cancel the run (`execution-semantics.md:854`). Operator decisions are stored against the run: `snooze`, `continue` (30-minute re-arm), `dismissed_false_positive` (permanent) (`execution-semantics.md:856-864`).

### Pause and Stop

Composer **Stop** creates a manual pause hold (same as **Pause work**), and cancelling is a separate action (`doc/composer-stop.md:1-6`). Pause dispatches without a preview dialog, and a saved hold with unconfirmed termination produces an error rather than a success claim (`composer-stop.md:13-17`). Resume releases a hold and optionally wakes agents only for `todo`/`in_progress`/`in_review` tasks (`composer-stop.md:19-28`).

### Periodic reconciliation passes

On startup and on each scheduler tick, Paperclip reaps orphaned runs, promotes due scheduled retries, resumes queued runs, reconciles stranded assigned issues, reconciles dependency wakes, reconciles task watchdogs, scans silent active runs, and sweeps stale issue locks (`execution-semantics.md:694-705`; `index.ts:1500-1579` startup, `index.ts:1774-1824` periodic). The orphaned-run reaper uses a 5-minute staleness threshold (`index.ts:1778`).

---

## Lessons for our platform

- **A task is a first-class row with explicit ownership, execution and provenance columns, and "at most one of X" is enforced by partial unique indexes, not application hope.** Paperclip encodes one-open-routine-execution, one-active-watchdog and one-active-recovery as DB indexes (`issues.ts:140-196`). We should copy that: concurrency rules belong in the schema.
- **Separate structure (`parentId`), dependency (blockers), ownership (assignee) and execution (run locks).** Paperclip repeatedly warns that blurring them breaks the model (`execution-semantics.md:11-20,216-247`). Our platform should adopt four distinct fields rather than one overloaded "parent/blocked/assigned" notion.
- **A task is not "running" just because an agent was told about it; there must be a durable wake record.** The wakeup table with idempotency keys and coalescing (`agent_wakeup_requests.ts:25-30,59-90`) is the mechanism that makes assignment actually start work. We should build the same durable wake queue rather than relying on in-memory triggers.
- **The liveness contract is the strongest idea here.** "What moves this forward next?" is a testable predicate with an enumerated list of valid paths, and local background processes explicitly do not count (`execution-semantics.md:337-385`). For a platform whose premise is autonomous workers, this is the difference between a demo and an operating system.
- **Recovery is conservative and ownership-preserving: retry once, then surface, never silently reassign.** (`execution-semantics.md:637-645,1111-1126`). We should adopt the same discipline: automatic recovery must not quietly change who owns the work.
- **Verification-shaped watchdogs with fingerprints are a reusable pattern.** The stop-fingerprint + reviewed-fingerprint + attempt-lineage design (`TASK-WATCHDOG.md:89-92`; `task-watchdogs.ts:304-317`) is a clean way to avoid both silent failure and infinite loops. We can lift the shape even if we change the policy.
- **Delegation needs an explicit, auditable channel, not open access.** The courier pattern plus the one-hop direct-parent comment and the stop-only relay (`execution-semantics.md:251-265`) give delegation without widening write authority. Our platform will need an equivalent bounded handoff.
- **Recording is multi-ledger by design (activity, run events, work products) and every ledger is separately bounded and redacted.** Run-log events carry no credentials and use allowlisted phase names (`run-log-events.md:160-197,320-321`); work products require real uploads (`AGENT-ARTIFACTS.md:8-22`). We should decide our own minimal set but keep the "no secrets in logs, allowlisted fields only" rule.
- **What looks weak / what we would do differently.** (a) The **documentation drift is severe**: `doc/TASKS.md` describes teams, workflow states, a 0–4 priority and four relation types that the code does not have (`TASKS.md:4-5` vs `constants.ts:189-215,426`). We must not let a "target model" doc masquerade as a spec; generate schema docs from the schema. (b) The **task model is huge** — dozens of columns, jsonb `executionPolicy`/`executionState`, many origin kinds, and several recovery subsystems. This is a lot of surface for a first version; we should start with a smaller core and add recovery primitives only when measured. (c) **Priority is decorative** — a text field with no scheduler effect (`issues.ts:49`); if priority is meant to matter, we should make it order the queue, or not ship it. (d) **Heartbeat frequency is genuinely ambiguous** — a 30 s scheduler tick, an opt-in per-agent `intervalSec` defaulting to off, and immediate assignment wakes (`config.ts:360`; `heartbeat.ts:16783-16790`). We should pick and document one mental model rather than three.

## What I could not verify

- **Whether `doc/TASKS-mcp.md` is implemented.** It specifies 35 MCP operations (`list_issues`, `create_issue`, `update_issue`, …). I did not find and read the MCP server implementation (`packages/mcp-server/`) to confirm those exact tools ship with those signatures. The *agent-facing* tool surface I did verify is the runner's capability semantic tools (`create_task`, `set_dependencies`, `reassign_task`, `request_approval`, …; `packages/paperclip-runner/src/semantic-tools/types.ts:40-59`), which is a different catalogue.
- **The exact task-watchdog "heartbeat cycle" phrase.** `TASK-WATCHDOG.md:83` says the watchdog runs "at the end of each heartbeat cycle". I confirmed the reconciler runs on the 30 s scheduler tick (`index.ts:1805`) but did not find a distinct object literally named "heartbeat cycle"; the phrase may be informal for the scheduler tick.
- **Whether `activity_log` actions cover every mutation.** I read the table and the README claim (`activity_log.ts:6-20`; `README.md:316`) but did not enumerate every `action` value.
- **Runtime behaviour I could only read, not run.** Retry budgets, coalescing counts, budget hard-stop timing and watchdog firing are described in docs and visible in code, but I did not execute the system, so I cannot confirm the observed latencies or that every path is reached in practice.
- **`doc/TASKS.md`'s implementation-priority list.** It is explicitly a recommendation (`TASKS.md:375-408`), not a record of what was built; I did not map each item to shipped code beyond the specific disagreements noted in §1.
