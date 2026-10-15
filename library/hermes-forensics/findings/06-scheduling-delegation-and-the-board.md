# Batch 06 — Scheduling, delegation and the board

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (in plain words)

The first five batches covered how *one* agent thinks, remembers and acts. This batch covers how Hermes
runs **many** agents and **recurring** work. Five mechanisms, deliberately kept separate — because they are
easy to confuse and the docs themselves draw the boundaries sharply:

| Mechanism | One line | Lives where |
|---|---|---|
| **cron** | a schedule, outside any conversation | its own fresh session per run |
| **`/heartbeat`** | one recurring prompt, *inside this* conversation | the current session |
| **`/loop`** | re-run a prompt on a timer *inside this* conversation | the current session |
| **`/goal`** | keep working until a judge says the objective is met | the current session |
| **`delegate_task`** | spawn child agents that return a summary | children of this session |
| **kanban** | a durable, shared task board many profiles work from | a database + a dispatcher |

The single most important distinction the docs draw: **`delegate_task` is a function call; kanban is a
work queue** (`kanban.md:97`) — and they **cannot be mixed inside one run** (a kanban worker is not offered
`delegate_task`).

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/user-guide/features/`) | Bytes / lines |
|---|---:|
| `cron.md` | 1,398 lines |
| `delegation.md` | 699 lines |
| `kanban.md` | 1,469 lines |
| `kanban-worker-lanes.md` | 143 lines |
| `kanban-multi-gateway.md` | 52 lines |
| `kanban-tutorial.md` | 310 lines |
| `loops.md` | 125 lines |
| `goals.md` | 299 lines |
| `heartbeat.md` | 70 lines |

| Code verified against | Evidence |
|---|---|
| `hermes_cli/config_defaults.py` | `delegation` block (~1330), `goals` (1418), `loops` (1420), `cron` (1800), `kanban` (1886) |
| `cron/constants.py` | fire-claim TTL bounds (lines 9–17) |
| `cron/scheduler.py` | 217,304 bytes — the tick, preflight, parking |
| `cron/jobs.py` | 160,485 bytes — job storage, `quota_hold_until` interplay |
| `cron/quota_hold.py` | `STATE_KEY = "quota_hold_until"` (line 28) |
| `tools/delegate_tool.py` | `DEFAULT_MAX_ITERATIONS = 250` (line 105); config authoritative (530–536) |
| `tools/delegate_tool_config.py` | `_DEFAULT_MAX_CONCURRENT_CHILDREN = 10`, `MAX_DEPTH = 1` |
| `tools/kanban_tools_schemas.py` | the 14 `kanban_*` tool schemas |
| `toolsets.py` | `kanban` toolset (157), `delegation` (156), `cronjob_manage` in core (28) |
| `hermes_cli/loops.py` | loop config readers (158–171) |
| `agent/iteration_budget.py` | the parent cap (default 500) |

---

## 2. Cron — scheduled, unattended work

### 2.1 The single tool

All cron management is **one tool**: `cronjob_manage`, action-style (`create`/`list`/`update`/`pause`/
`resume`/`run`/`remove`) — **VERIFIED** (`tools/cronjob_tools.py:1057, 1193`; registered in the core tool list
at `toolsets.py:28`). There is no separate `schedule`/`list`/`remove` tool family.

Jobs are **plain JSON on disk** (`~/.hermes/cron/jobs.json`), output under `~/.hermes/cron/output/<id>/`
(`cron.md:1369`). Written with atomic file writes so an interrupted write cannot leave a half-file
(`cron.md:1383`).

### 2.2 How a tick works

The **gateway daemon** ticks the scheduler **every 60 seconds** (`cron.md:356`). **VERIFIED**:
`gateway/run.py:4615` `_start_cron_ticker(… interval: int = 60)`. Each tick loads jobs, compares
`next_run_at` to now, starts a fresh `AIAgent` session per due job, optionally injects attached skills, runs
the prompt, delivers the result, and updates metadata (`cron.md:384–392`). A file lock at
`~/.hermes/cron/.tick.lock` prevents overlapping ticks from double-running a batch.

**Model resolution at fire time** is a three-step ladder (`cron.md:26`): *per-job pin → `cron.model` → the
main agent model*. The notable design choice: **the agent cannot re-point a job at a different model** —
inference pins are *user-owned* (`cron.md:28`). The same for `reasoning_effort`: exposed on the CLI but
**deliberately not** on the agent's tool (`cron.md:38`).

### 2.3 The features that make it production-grade

The cron doc is unusually deep — 1,398 lines for a scheduler. The load-bearing mechanisms:

- **Pre-dispatch validation (preflight).** Before building *any* agent machinery, the scheduler checks the
  provider key resolves, attached skills are ready, delivery targets have gateway credentials, and every
  named MCP server resolved to at least one tool (`cron.md:90–115`). On failure: `last_status:
  blocked_config`, **ONE** alert (not one per tick), and **no LLM call** — *"a misconfigured job never
  spends tokens."* **VERIFIED**: `cron/scheduler.py:1705, 1730, 1733` (`blocked_config` record; alert-once
  via a persisted `preflight_alerted` bit).
- **No-agent mode.** `no_agent=True` runs a script on schedule and delivers its **stdout verbatim** with
  zero LLM involvement — the classic watchdog (`cron.md:912`). Empty stdout → a **silent tick**. Non-zero
  exit → an error alert (a broken watchdog can't fail silently). Scripts must resolve inside
  `$HERMES_HOME/scripts/`; the subprocess environment is **sanitized** so provider credentials are not
  inherited (`cron.md:932`).
- **`wakeAgent` gate.** A pre-run script can emit `{"wakeAgent": false}` on its last line and skip the agent
  entirely for that tick — a **$0** way to decide whether a poll deserves tokens at all (`cron.md:1250`).
  The doc gives three worked recipes (file-change, external-flag, SQL-count) and credits a community PR
  whose proposed parallel trigger mechanism it deliberately did **not** build because this gate already
  covers it (`cron.md:1352`).
- **Recovery ladders.** Two mirror cases, both bounded: a run that failed **before any model call** with a
  transient network error re-runs automatically after **5, 15 and 30 minutes** (spend-neutral —
  zero API calls were made), and a job whose subscription provider reports an exhausted usage window with a
  `retry after <N>s` hint is **parked** (`quota_hold_until`) rather than re-fired into a guaranteed
  failure (`cron.md:461–503`). **VERIFIED**: `cron/quota_hold.py:28` `STATE_KEY = "quota_hold_until"`.
- **Failure incidents.** A recurring job failing with the *same* error alerts **once**, keyed by a
  normalized signature of the error text (case, whitespace and measured durations ignored), with a
  `failure_repeat_alert_hours: 6` reminder cooldown, a success re-arming the signature, and an explicit
  `ack` that silences that signature for good (`cron.md:505–549`). **VERIFIED**:
  `config_defaults.py:1881` `"failure_repeat_alert_hours": 6`.
- **Execution ledger.** Each claimed attempt is written to `~/.hermes/cron/executions.db` with immutable
  terminal states (`completed`/`failed`/`unknown`). An abandoned attempt is marked `unknown` only when the
  original **PID and process-start fingerprint** prove its owner is gone, or a live owner has been silent
  past a derived stale bound (`max(3 × HERMES_CRON_TIMEOUT, script timeout, 2 h)`) — so a healthy
  multi-hour job is never reclaimed mid-run (`cron.md:411–425`). **The doc states its own limit honestly**:
  this is *not* an exactly-once guarantee (`cron.md:438`).
- **Restart-safe workers.** Under systemd each due job is handed to a transient user scope
  (`systemd-run --user --scope`) so a gateway restart mid-job doesn't kill it; on hosts without a user
  systemd session it **degrades** (runs as an external process without cgroup isolation) unless
  `cron.require_restart_safe_scope: true` fails closed (`cron.md:396–409`).
- **Health surfaces.** `hermes cron doctor` (read-only, exits 1 while findings stand), `hermes cron
  incidents`, `hermes cron runs`, `hermes cron status` (overdue detection: a `next_run_at` >15 min in the
  past is labelled `Overdue:` everywhere), plus monitoring metrics `hermes.cron.store.writable` /
  `skipped_runs` (`cron.md:367–380, 551–576`).
- **`context_from` chaining + `continuity`.** Job B can consume Job A's most recent completed output;
  `continuity=true` makes a job inject *its own* previous output so a recurring scout stops re-reporting
  (`cron.md:966–1038`).

### 2.4 Delivery — and the honesty about it

The `deliver:` target table is long (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, SMS, email,
DingTalk, Feishu, WeCom, Weixin, BlueBubbles, QQ Bot, Home Assistant, `bot-chat`, `all`). Three design
points stand out because they are about *correctness*, not features:

1. **Execution and delivery are tracked separately** — a successful run whose output never reached the
   target records `delivery_failed`, **never** a plain `ok`, and it does **not** count toward the job's
   failure streak (`cron.md:622`).
2. **`UNVERIFIED` is a distinct state** — a live-adapter send with `success` but no `message_id` /
   `raw_response` is accepted but flagged, because it is not proof of failure either (`cron.md:705`).
3. **Delivered output is secret-redacted on every lane**, and this applies **even when
   `security.redact_secrets: false`** — *"that setting governs your own logs, not what leaves the
   machine"* (`cron.md:613–620`). A redactor failure **replaces the payload** rather than sending it
   unscanned.

---

## 3. Delegation — child agents (`delegate_task`)

### 3.1 The shape

`delegate_task` spawns child `AIAgent` instances with **isolated context** and inherited tool access; only
the child's **final summary** enters the parent's context (`delegation.md:9`). Top-level calls run in the
background automatically (return a handle, post the result later as a new message); an **orchestrator**
subagent waits for its own workers so it can synthesise.

**Subagents know nothing** — a completely fresh conversation, zero knowledge of the parent's history. The
parent must pass everything in `goal` + `context` (`delegation.md:82`). One exception: when the parent has a
resolved workspace, the child's system prompt embeds that workspace's **project context files** (AGENTS.md
chain), so a child works under the repo's own conventions.

### 3.2 Verified constants (the divergence check)

| Claim (doc) | Code | Verdict |
|---|---|---|
| concurrent children **10** default, floor 1, no ceiling | `delegate_tool_config.py:17` `_DEFAULT_MAX_CONCURRENT_CHILDREN = 10`; `max(1, int(v))` | **TRUE** |
| `delegation.max_iterations` default **250** | `delegate_tool.py:105` `DEFAULT_MAX_ITERATIONS = 250`; config default `250` (`config_defaults.py` delegation block) | **TRUE** |
| `max_spawn_depth` default **1** (flat) | `delegate_tool_config.py:21` `MAX_DEPTH = 1`; config `"max_spawn_depth": 1` | **TRUE** |
| `oneshot_max_children` default **2** | config `"oneshot_max_children": 2`; `_get_oneshot_max_children()` default 2 | **TRUE** |
| no wall-clock child timeout by default | `delegate_tool_config.py:25` `DEFAULT_CHILD_TIMEOUT: Optional[float] = None`; config `"child_timeout_seconds": 0` | **TRUE** |
| parent cap **500** | `agent/iteration_budget.py:4` docstring *"the cap is `max_iterations` (default 500)"*; `hermes_cli/cli_config_load.py:201` `"max_turns": 500` | **TRUE** |

**No divergence this batch on delegation constants.** One **correction to my own earlier note**, recorded
here under rule 13: batch 01's summary carried "subagent 50" as the delegation cap. The code is
unambiguous — `DEFAULT_MAX_ITERATIONS = 250`, and the config field is 250. The **500/250** pair (parent /
child) is the correct one; the "50" was wrong and is corrected here and forward.

### 3.3 The mechanisms worth naming

- **Structured output (`output_schema`).** A child's answer can be validated against a JSON Schema. On a
  contract miss the parent sends **exactly one** bounded correction turn; a *second* miss does **not**
  discard the work — the result keeps `status: completed`, the raw text in `summary`, and `schema_valid:
  false` with the errors, so the parent can salvage an hour of work (`delegation.md:55–59`).
- **Steering, not just killing.** A running child can be **steered** (`subagent.steer`) — text queued and
  appended at the next iteration boundary without cutting the in-flight tool call. The honesty detail:
  `"queued"` is not delivery; if the child finishes first the text is returned as `missed_steer` with a
  note appended to the summary, so the parent can tell a steered child from one that ran on old
  instructions (`delegation.md:500–514`).
- **Stall detection is progress-based, not wall-clock.** A background child frozen past the stale
  threshold (**450 s idle, 1200 s while inside a tool**) is interrupted and given a 120 s grace window, then
  force-finalised with a `stalled` event — so a wedged child never leaves its session looking dead
  (`delegation.md:397–430`).
- **Worktree isolation.** Opt-in `delegation.worktree_isolation: true` gives each child its own git
  worktree off `HEAD` so parallel editors can't collide; a worktree with **no commits and a clean tree is
  pruned**, anything holding work is kept (`delegation.md:607–641`). Note the care: if the git inspection
  probe fails, the entry carries `inspection_failed: true` and the parent is told `commits`/`dirty` are
  *defaults, not measurements*.
- **Live transcripts.** Every dispatch writes an append-only readable log per task at
  `<hermes_home>/cache/delegation/live/<id>/task-<n>.log`; directories older than 7 days are pruned
  (`delegation.md:516–530`).
- **`/review`.** An independent, full-privilege background subagent whose only job is to review the work
  the conversation produced; it inherits the primary's loaded skills and the repo's context files, and
  re-enters the session as a normal background completion (`delegation.md:294–327`). `/review` reviews the
  *work*; `/refine` reviews the conversation to update memory and skills.

---

## 4. Kanban — the durable board

### 4.1 The one-sentence distinction (doc's own)

> `delegate_task` is a function call; Kanban is a work queue where every handoff is a row any profile (or
> human) can see and edit. — `kanban.md:97`

Each task is a row in `~/.hermes/kanban.db` (or a per-board DB); each worker is a **full OS process with its
own identity**; each handoff is a row (`kanban.md:13`). Task status is a real state machine:
`triage | todo | ready | running | blocked | review | done | archived` (`kanban.md:132`).

### 4.2 Two front doors, one database

- **Agents drive the board through a `kanban_*` toolset** — **VERIFIED 14 tools** in
  `tools/kanban_tools_schemas.py`: `kanban_show`, `kanban_list`, `kanban_complete`, `kanban_block`,
  `kanban_request_review`, `kanban_request_changes`, `kanban_heartbeat`, `kanban_comment`, `kanban_create`,
  `kanban_link`, `kanban_unblock`, `kanban_attach`, `kanban_attach_url`, `kanban_attachments` (the
  doc lists 14; the schema file also holds `kanban_schedule` and `kanban_workflow` helpers). **VERIFIED**
  the toolset registration at `toolsets.py:157–165`.
- **Humans/scripts/cron** drive it through `hermes kanban …` / `/kanban …` / the dashboard.

Both route through the same `kanban_db` layer (`kanban.md:25`). The doc records the **boundary hazard**
explicitly: a naive `kanban_link` can deadlock the board — linking a support card to the card it is meant
to unblock makes the support card a *child* of the blocked parent, so neither runs. The fix is to reference
the parent id in prose; a demoted `ready` child records a `dependency_wait` event so the deadlock is
**visible on the board** (`kanban.md:112`).

### 4.3 The dispatcher and the worker lifecycle

**Dispatcher** — a long-lived loop that every N seconds (**default 60**) reclaims stale claims, reclaims
crashed workers (PID gone), reaps workers that outlived their run, promotes ready tasks, atomically claims
and spawns. Runs **inside the gateway** by default. One dispatcher sweeps **all boards** per tick; workers
are spawned with `HERMES_KANBAN_BOARD` pinned so they can't see other boards. After
`kanban.failure_limit` consecutive spawn failures (**default 2**) it auto-blocks the task to stop thrashing
(`kanban.md:135`). **VERIFIED**: `config_defaults.py:1896` `"dispatch_in_gateway": True`, `:1904`
`"failure_limit": 2`, `:1947` `"dispatch_stale_timeout_seconds": 14400` (= 4 h).

**Worker lifecycle** — injected into every worker's system prompt at spawn as a `KANBAN_GUIDANCE` block, so
there is **nothing to install**: `kanban_show()` → `cd $HERMES_KANBAN_WORKSPACE` → `kanban_heartbeat(...)`
during long work → `kanban_complete` / `kanban_request_review` / `kanban_block` (`kanban.md:561`).

Three failure **bookings** are distinguished by exit code, and the design is unusually careful:

| Exit | Meaning | Booking |
|---|---|---|
| `0` with task still `running` | **protocol violation** — worker never made its terminal board call | `protocol_violation` event; bounded retry (default 3) before auto-block |
| `75` (`EX_TEMPFAIL`) | rate-limited / 5xx / timeout / quota wall | `rate_limited`; **requeued without counting a failure** |
| `78` (`EX_CONFIG`) | credential / model / TLS rejected — a retry can't fix it | terminal: circuit breaker on **first** occurrence, parked `blocked` (sticky) |

The design point: the rate-limit lane **is not booked as a failure**, and the terminal provider lane **is
not re-spawned into the same wall** (`kanban.md:600–610`). Before the worker exits, Hermes injects up to
**two synthetic nudges** if the model is about to stop without a terminal board call — and the nudge
**never** asks a worker that already handed its card off for review to `kanban_complete`.

### 4.4 Boards vs tenants — the isolation ladder

| Layer | Strength | Mechanism |
|---|---|---|
| **Board** | **hard** isolation | separate SQLite DB + `workspaces/` + `logs/` per board; cross-board linking disallowed |
| **Tenant** | **soft** filter | a string namespace *within* a board; data isolated by workspace path + memory key prefix |

`kanban.md:124–140, 141–260`. The doc is candid that tenants are *"a soft filter; boards are the hard
isolation boundary."* Workspace kinds are three, with different lifetimes: `scratch` (fresh tmp dir,
**deleted on completion** unless artifacts are declared), `dir:<path>` (existing shared dir, must be
absolute — relative paths rejected as a *confused-deputy escape vector*, **preserved**), and `worktree`
(git worktree, **preserved**).

### 4.5 PR completion contracts — the strongest governance artifact in this batch

A card can declare `--completion-contract OWNER/REPO`. Completion then reads **branch protection and active
ruleset required contexts**, paginates exact-head check runs, re-reads the PR head/base, and **refuses to
complete** on missing, pending, failed, cancelled, timed-out, stale, skipped or neutral **required**
evidence — as well as on zero-run acceptance, unreadable policy or GitHub API failures (`kanban.md:48–96`).

Two details mark this as seriously built:

1. **Acceptance runs as the *assignee profile's* `gh` login**, from that profile's own `.env` — never the
   ambient login of whichever process completes the card. On multi-profile hosts this is the difference
   between two GitHub identities not leaking into each other.
2. The doc **states what it is not**: *"a single-user lifecycle guard, not OS isolation against arbitrary
   direct database writes. GitHub Enterprise is not covered."*

---

## 5. The session-scoped trio: `/heartbeat`, `/loop`, `/goal`

These three are easy to confuse, and the docs each carry an explicit comparison table. All three inject a
**plain user-role turn** at an idle boundary — **no system-prompt mutation, no toolset swap**, so the
prompt cache survives (`heartbeat.md:48`, `goals.md:221`, `loops.md:98`). That single property is what makes
them cheap.

### 5.1 The comparison (as the docs themselves draw it)

| | `/heartbeat` | `/loop` | `/goal` | cron |
|---|---|---|---|---|
| **Trigger** | timer | timer (or self-paced) | **judge verdict after each turn** | schedule, outside session |
| **Lives in** | this session | this session | this session | its own session per run |
| **Ends when** | you clear it | stop condition / caps / you | goal achieved / budget / you | you remove it |
| **Survives restart** | state survives; gateway resumes | state persists | state persists (`/resume`) | fully durable |

### 5.2 `/goal` — the judge-driven loop

After every turn a **lightweight judge model** rules `done` / `blocked` / `continue` / `wait` on the
assistant's last response (~4 KB of it), and a `continue` feeds a continuation prompt back into the session
(`goals.md:183`). A goal judged **unachievable** gets `blocked` — never `done` — and the loop **pauses**,
so an impossible task is not waved through as complete (`goals.md:189`). Judge failures **fail open**
(→ `continue`); the **turn budget** is the real backstop (default **20**, `goals.max_turns`).
**VERIFIED**: `config_defaults.py` goals block `"max_turns": 20`.

Three layers of rigour beyond a bare judgement:

- **Completion contracts** — five optional fields (`outcome`, `verification`, `constraints`, `boundaries`,
  `stop_when`), where the judge marks `done` **only when the verification criterion is met with concrete
  evidence** (a command result, file excerpt, test output), not a "looks done" claim (`goals.md:85–95`).
  `/goal draft <text>` expands a one-liner into a full contract.
- **Quality gates** — a deterministic **shell command that must exit 0** before the goal can complete at
  all. **Gates run before the judge**; if a gate fails the judge is *not called* — a red gate is
  deterministic evidence. Each gate defaults to **3 retries and a 5-minute timeout**; exhausting them
  auto-pauses the goal (`goals.md:136–154`). This is the strongest available answer to "the judge is still
  an LLM reading prose."
- **`/subgoal`** — append acceptance criteria mid-loop without resetting it; the judge verdict must
  consider every subgoal.

**Automatic parking** is the cleverest part: the judge is shown the session's own live background processes
each turn, and when progress is genuinely gated on one it returns `wait` and the loop **parks** — no judge
call, no continuation, no turn consumed. A pid/session wait is capped at **30 minutes**, so a forgotten
poller can't park a goal forever (`goals.md:156–177`).

### 5.3 `/loop` — the timer-driven loop

Fixed interval (you set the clock) or **self-paced** (Hermes sets it): start at the floor (**1 min**),
back off exponentially while replies stop changing (2m, 4m, 8m …) up to a ceiling (**15 min**), snap back
to the floor the moment a reply differs. Change detection is a **local digest comparison** (timestamps
ignored) — *"idle waits cost nothing extra"* (`loops.md:48`). Stop conditions: the agent emits
`LOOP_COMPLETE`, a `--times N` cap, a judge-checked `--until` condition, you, or the backstop budget
`loops.max_ticks` (**default 100**).

**VERIFIED** (`hermes_cli/config_defaults.py` loops block, and `hermes_cli/loops.py:158–171`):
`min_interval_seconds: 30`, `max_ticks: 100`, `self_paced_floor_seconds: 60`,
`self_paced_ceiling_seconds: 900`. **Doc claim: TRUE** (the doc quotes the floor as "1 minute" — the config
value `60` seconds matches).

### 5.4 `/heartbeat` — one recurring prompt

Simplest of the three: one recurring instruction per session, fired only when the session is idle.
**Missed ticks coalesce** — a busy session gets **one** heartbeat turn, not a backlog (`heartbeat.md:45`).
State lives in `SessionDB.state_meta` keyed `heartbeat:<session_id>`; the gateway restores active
heartbeats on startup, and a heartbeat whose conversation was reset/cleared is **not** resurrected.

**Interaction rule between all three** (`loops.md:90`, `goals.md:205`): **an active goal owns the session** —
loop wakeups defer while a goal is driving; the loop resumes in the goal's idle time. **A real user message
always wins over both.**

---

## 6. The capability table — the owner's two questions

`Verdict` empty (that is Batch 12's job).

### 6.1 Scheduling (cron)

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **`cronjob_manage` (one tool)** | the AI schedules work by talking | "every morning, brief me" with no UI | the AI is a **planner**, not just a responder | `now` |
| **Model pin is user-owned** | the agent can't re-point a job's model | cost/quality stays the user's choice | **governance** over inference spend | `now` |
| **Preflight (blocked_config, no LLM call)** | a misconfigured job never spends tokens | no silent token burn from a bad job | **cost control by construction** | `now` |
| **No-agent mode + `wakeAgent` gate** | script-only jobs; $0 pre-run gate | cheap watchdogs that only speak when wrong | **an economy of scale** for monitoring | `now` |
| **Recovery ladders (unreachable / quota-park)** | transient failures self-heal; quota windows are held | briefs arrive despite a flaky link | **resilience without busywork** | `now` |
| **Failure incidents (alert once, ack)** | same error alerts once, then on cooldown | the inbox isn't flooded by a stuck job | **signal hygiene** | `now` |
| **Execution ledger + `cron doctor`** | every attempt is recorded; a read-only health check | "is my automation actually running?" | **auditability** of autonomous work | `now` |
| **`context_from` + `continuity`** | chain jobs; a job remembers its own last output | pipelines (collect→filter→ship) | **multi-stage autonomy** as data | `soon` |
| **Secret-redaction on every delivery lane** | credentials masked on the way out | scheduled output can't leak a key | **a safety floor for autonomy** | `now` |

### 6.2 Delegation and the board

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **`delegate_task`** | spawn child agents that return a summary | big jobs done in parallel | the **worker layer** of an AI company | `now` |
| **Cost strategy (frontier planner, cheap workers)** | pin children to a cheaper model | the same work for less money | **economic design** of a company of agents | `now` |
| **`output_schema` + salvage** | a child's answer validated against a contract | structured, dependable results | **machine-checkable** delegation | `now` |
| **Steering + stall detection** | redirect a child; a frozen one is caught | long jobs don't silently die | **reliability** at fleet scale | `now` |
| **Worktree isolation** | each child gets its own git worktree | parallel edits don't collide | safe **parallel engineering** | `soon` |
| **`/review`** | an independent reviewer of the work | a second pair of eyes on demand | **quality control** as a primitive | `now` |
| **Kanban board (durable, shared)** | a task queue many profiles work from | work survives restarts; humans can step in | **the operating system of an AI company** | `soon` |
| **Assignees = named profiles with memory** | each card goes to a persistent agent | specialists with a memory of their work | **roles and org structure** | `soon` |
| **PR completion contracts** | a card can't complete without proof of green | "done" means verified | **governed autonomy** — the strongest artifact here | `soon` |
| **Boards (hard) vs tenants (soft)** | isolation ladder for work streams | separate projects cleanly | **multi-tenant plumbing**, honestly scoped | `soon` |

### 6.3 The session-scoped trio

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **`/heartbeat`** | one recurring prompt in this chat | "keep an eye on X while we work" | in-conversation liveness | `now` |
| **`/loop` (self-paced)** | re-run a prompt, auto-slowing when idle | polling without token waste | **cheap liveness** at scale | `soon` |
| **`/goal` (judge loop)** | keep working until an objective is met | "don't make me say keep going" | **persistence** as a first-class primitive | `soon` |
| **Completion contracts** | names what *done* means + how to prove it | the AI stops at the right moment | **definition-of-done as data** | `soon` |
| **Quality gates (exit-0 command)** | a deterministic gate before the judge | "green" is mechanically checked | **verification beats vibes** | `soon` |
| **Auto-parking on a live process** | the loop waits for CI instead of polling | no busywork while you wait | **patience** as a designed behaviour | `soon` |

---

## 7. Divergence and boundary notes

- **One divergence, and it was mine, not the docs'.** The delegation constants all match the code
  (10 / 250 / 1 / 2 / no-timeout / parent-500). My **own** earlier batch note of "subagent 50" was wrong;
  corrected here under rule 13. The docs' `250` is right.
- **The doc's own boundaries, stated honestly and worth repeating:** cron's ledger is *not* an
  exactly-once guarantee; kanban's PR contract is *not* OS isolation and does **not** cover GitHub
  Enterprise; kanban's `dir:` workspace **trusts the path** — it is a *trusted-local-user* threat model,
  single-host by design; tenants are a **soft** filter while **boards** are the hard boundary.
- **`/goal` and kanban never flow into each other** (`goals.md:26–39`): setting a goal never creates a
  card; pausing a goal never moves a card. The overlap is exactly one thing — a kanban card created with
  `--goal` runs the *same continuation engine* **inside that card's worker session**.
- **`delegate_task` and kanban cannot mix inside one run** (`kanban.md:121`): a kanban worker is not
  offered `delegate_task`; split fan-out into child cards instead.

---

## 8. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C6-1 | A durable, shared board with **named-profile assignees** is the closest existing match to the platform's org-chart vision — study it as the board's foundation (rule 17) | batch 12 |
| C6-2 | PR completion contracts = "definition-of-done as data"; the platform's board approval gate (M3-AGT-02) is a sibling idea | batch 08 / synthesis |
| C6-3 | The **preflight** pattern (validate, then don't call the model) is a reusable cost-control idiom | synthesis |
| C6-4 | Exit-code **booking** (rate-limit ≠ failure; terminal ≠ retry) is a reliability idiom to copy | batch 08 |
| C6-5 | The **session-scoped** trio is Hermes' answer to in-flight liveness; the platform's `heartbeat.ts` engine is the counterpart | batch 12 |
| C6-6 | Boards (hard) vs tenants (soft) — the exact isolation ladder to compare against the platform's per-company/per-employee model | batch 12 |
| C6-7 | `no_agent` + `wakeAgent` = a $0 gate before any token spend; a pattern for cheap always-on monitoring | synthesis |
| C6-8 | `context_from` / `continuity` = pipelines as data; compare against the platform's run-chaining | batch 12 |

---

## 9. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High, and broader than any earlier batch. The user gets three *paces* of autonomy —
**inside** a chat (`/heartbeat`, `/loop`, `/goal`), **beside** it (delegated children, `/review`), and
**outside** it (cron) — plus a **board** where work survives restarts and a human can step in. The
capabilities are all *usable by description*: the user says "every morning at 9am…" and the AI builds the
job; there is no scheduler UI to learn. The honesty in the delivery/verification model (`delivery_failed`,
`UNVERIFIED`, PR contracts) means the user is told the truth about whether the work actually landed.

**Q2 — VISION VALUE.** This is the **operations half** of the platform vision, and it is the densest batch
so far for it. Three things map almost directly onto an "AI-first business and resource planner":
(1) **kanban** is a durable, shared, multi-agent board whose cards are assigned to **named persistent
agents** — the nearest thing in Hermes to an org chart with work flowing through it; (2) **`/goal` +
completion contracts + quality gates** are a working model of *"done" defined, proven and enforced* — the
platform's board-approval gate is the same family of idea; (3) **cron's cost and governance design**
(preflight, user-owned model pins, secret redaction, execution ledger) is a template for running autonomy
without losing control of either spend or truth. The boundary the docs draw — *tenants are soft, boards are
hard* — is exactly the kind of honest scoping the platform's per-company isolation model should mirror.

**Learning lens (explicit).** Batch 03 = procedures; batch 04 = facts; **batch 06 = execution** — how the
AI *does many things over time*. Where batches 03/04 asked "what does it know?", this batch asks "what does
it *run*, and how do we know it ran correctly?"

---

*Batch 06 of 12 complete. Divergences found this batch: 0 in the docs (one correction to my own earlier
note: delegation's child cap is 250, not 50). Next: `07-sessions-dashboard-and-settings.md`.*
