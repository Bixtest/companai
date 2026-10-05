# 01 — Paperclip: what it is and how it is built

**Batch 01 of the Paperclip + Hermes study. Written 2026-10-05.**

Subject: upstream Paperclip at `library/ai/paperclip-master/` (8,299 files per `00-inventory.md`).
Read-only. This batch reads the source and its own docs and writes down what the code actually
contains. Where a doc and the code disagree I say so and trust the code. All package manifests in
this tree report version `0.3.1` (`cli/package.json`, `server/package.json`, `ui/package.json`,
`packages/db/package.json`); I make no claim about how that differs from the sibling fork, which I
did not read.

---

## 1. The product model

### What Paperclip believes it is

Paperclip describes itself as a control plane, not an agent framework. `README.md:33` says
"Paperclip is the app people use to manage AI agents for work", and `README.md:37` gives the
positioning line: "If OpenClaw is an _employee_, Paperclip is the _company_." It is a "Node.js
server and React UI that orchestrates a team of AI agents to run a business" (`README.md:39`).

The identity is repeated and made explicit in `doc/GOAL.md:9`: Paperclip is "the control plane, the
nervous system, the operating layer" for autonomous companies. `doc/PRODUCT.md:5` states the same
in one line: "Paperclip is the control plane for autonomous AI companies." The product's own
self-description is careful about what it is *not*: `README.md:334` says "Not an agent framework.
We don't tell you how to build agents. We tell you how to run a company made of them."

### Who the user is

The user is the human "board" operator — one person per deployment in V1. `doc/SPEC-implementation.md:38`
records the V1 decision "Single human board operator per deployment", and `doc/SPEC.md:22` says
"The Board is the human oversight layer." The design doc is blunt about the interaction model:
`DESIGN.md:13` — "The user is an operator scanning state and making decisions. Every screen should
answer, in order: *what is happening, does it need me, what do I do about it.*"

A second class of actor exists: the agents themselves, which authenticate with API keys and act as
API clients (`AGENTS.md:186`; `packages/db/src/schema/agent_api_keys.ts:6`). So the product has two
audiences on the same REST API — humans (board) and agents — distinguished only by authorization
level (`doc/SPEC.md:465`).

### The core loop (goal → work → result)

The product loop is stated as three steps in `README.md:45-49`: **Define the goal** ("Build the #1
AI note-taking app to $1M MRR"), **Hire the team** ("CEO, CTO, engineers, designers, marketers"),
**Approve and run** ("Review strategy. Set budgets. Hit go. Monitor from the dashboard").

Under that sits a stricter model, recorded in `doc/SPEC-implementation.md:16-28` as the "full
control-plane loop":

1. A human board creates a company and defines goals.
2. The board creates and manages agents in an org tree.
3. Agents receive and execute tasks via heartbeat invocations.
4. All work is tracked through tasks/comments with audit visibility.
5. Token/cost usage is reported and budget limits can stop work.
6. The board can intervene anywhere (pause agents/tasks, override decisions).

The work model is hierarchical and goal-anchored. `doc/PRODUCT.md:46-57` gives the "because"
chain: every task traces up through parent tasks to the company goal, so an agent can always answer
"why am I doing this?". `doc/SPEC.md:323` names the intended full hierarchy: Initiative (company
goal) → Projects → Milestones → Issues → Sub-issues. The core data object for a unit of work is the
**issue**, not the "task" — `packages/db/src/schema/issues.ts:26` defines the `issues` table, and
`doc/PRODUCT.md:127` confirms work is anchored to "issues/comments/projects/goals". Note the design
system insists UI copy should say "task" even though the entity is an issue (`DESIGN.md:35`).

The heartbeat is how work turns into a result. `doc/SPEC.md:212` calls the heartbeat "a protocol,
not a runtime": Paperclip decides *when* to fire it, *how* (adapter selection) and *what context*
to include, but the agent decides what it does during the cycle (`doc/SPEC.md:250-260`). The
runtime pipeline is summarised in `README.md:272`: a "DB-backed wakeup queue with coalescing,
budget checks, workspace resolution, secret injection, skill loading, and adapter invocation".

---

## 2. The moving parts

`AGENTS.md:29-43` gives the canonical repo map. The table below expands it with what each part
actually is, cited to its manifest or docs.

| Part | Path | What it is |
|---|---|---|
| **Server** | `server/` | "Express REST API and orchestration services" (`AGENTS.md:31`). Entry point `server/src/index.ts`; app built by `createApp()` in `server/src/app.ts:461`. |
| **UI** | `ui/` | "React + Vite board UI" (`AGENTS.md:32`). 135 page components under `ui/src/pages/`. |
| **Database** | `packages/db/` | Drizzle schema, migrations, clients (`AGENTS.md:33`). 143 schema files and 293 SQL migrations (measured this session). |
| **Shared** | `packages/shared/` | Shared types, validators, constants, API path constants (`AGENTS.md:34`). |
| **Adapters** | `packages/adapters/` | Agent adapter implementations: `claude-local`, `codex-local`, `cursor-local`, `cursor-cloud`, `gemini-local`, `grok-local`, `kimi-local`, `opencode-local`, `pi-local`, `hermes`, `hermes-gateway`, `openclaw-gateway` (directory listing of `packages/adapters/`). |
| **Adapter utils** | `packages/adapter-utils/` | Shared adapter utilities (`AGENTS.md:36`); holds cross-run workspace transport helpers (`packages/adapters/AUTHORING.md:28-33`). |
| **Plugins** | `packages/plugins/` | Plugin system packages and SDK (`AGENTS.md:37`). |
| **MCP server** | `packages/mcp-server/` | A "thin MCP wrapper over the existing Paperclip REST API" that "does not talk to the database directly" (`packages/mcp-server/README.md:5-6`). Ships a stdio binary `paperclip-mcp-server` (`packages/mcp-server/package.json`). |
| **Runner** | `packages/paperclip-runner/` | Standalone runner package: "the language-neutral Paperclip Runner Protocol (PRP), the Rust runner process, provider drivers" (`doc/architecture/paperclip-runner.md:26`). |
| **CLI** | `cli/` | "`paperclipai` CLI package (published bin, agent-facing commands)" (`AGENTS.md:40`). |
| **Skills catalog** | `packages/skills-catalog/` | "app-shipped skills catalog" (`AGENTS.md:38`). |
| **Teams catalog** | `packages/teams-catalog/` | "app-shipped teams catalog" (`AGENTS.md:39`). |
| **Eval kernel** | `packages/paperclip-eval-kernel/` | "Provider-neutral evaluation matrix kernel without Paperclip scenario content" (`packages/paperclip-eval-kernel/package.json`). |
| **Tailscale broker** | `packages/tailscale-https-broker/` | "Least-privilege host broker that manages only Paperclip-owned … Tailscale HTTPS-to-loopback listeners" (`packages/tailscale-https-broker/package.json`). |
| **Demo MCP servers** | `packages/google-sheets-mcp-server/`, `packages/kv-demo-mcp-server/` | Small standalone MCP servers used as fixtures/examples. |

The workspace glob that ties these together is `pnpm-workspace.yaml:1-14`: `packages/*`,
`packages/adapters/*`, `packages/plugins/*`, plus `server`, `ui`, `cli`.

### What talks to what

- **Server is the hub.** `server/src/app.ts:962` mounts the API under `/api`. The UI and the MCP
  server both call this REST surface; the MCP server explicitly "does not reimplement business
  logic" (`packages/mcp-server/README.md:5-6`).
- **Agents are external.** The control plane "doesn't run agents. It orchestrates them. Agents run
  wherever they run and phone home" (`doc/GOAL.md:54`). The minimum contract is "be callable"
  (`doc/PRODUCT.md:84`).
- **Adapters are the boundary.** An adapter defines how a heartbeat is invoked, observed, and
  cancelled. `doc/SPEC.md:240-248` gives the full adapter interface as three methods:
  `invoke()`, `status()`, `cancel()`. `doc/SPEC.md:218-229` lists the mechanisms: `process`
  (child process), `http` (webhook/API), `claude_local`, `codex_local`, `opencode_local`,
  `pi_local`, `cursor`, `openclaw_gateway`, `hermes_local`.
- **Runner is a separate process, behind a flag.** `doc/architecture/paperclip-runner.md:61-71`
  shows the topology: Paperclip server → authenticated PRP v1 WebSocket → `paperclip-runnerd`
  (Rust) → provider. It is gated by "one explicit experimental adapter" (`paperclip_runner`) and
  "one default-off instance flag" (`doc/architecture/paperclip-runner.md:20-21`). The protocol path
  is `/api/runner/v1/connect/:runId` (`doc/architecture/paperclip-runner.md:118`).
- **MCP server exposes tools, not tables.** `packages/mcp-server/README.md:33-89` lists read tools
  (`paperclipListIssues`, `paperclipGetIssue`, …), write tools (`paperclipCreateIssue`,
  `paperclipCheckoutIssue`, `paperclipAskUserQuestions`, …) and an escape hatch
  `paperclipApiRequest` limited to `/api` paths.
- **CLI is an API client plus installer.** `cli/src/index.ts` registers client command groups
  (company, issue, agent, project, goal, approval, activity, dashboard, secrets, skills, teams,
  cost, run) alongside install/onboard/doctor/service commands (`cli/src/commands/`).
- **Plugin runtime runs out-of-process.** `README.md:304` describes "Instance-wide plugin system
  with out-of-process workers, capability-gated host services, job scheduling, tool exposure, and
  UI contributions". The SDK has separate worker and UI entry points
  (`packages/plugins/sdk/README.md:5-8`).

---

## 3. The data model

The schema is Drizzle on PostgreSQL. The real table names below are the first string argument to
`pgTable(...)` in `packages/db/src/schema/`. There are 143 schema files; `packages/db/src/schema/index.ts`
exports all of them. The central entities the brief asks about:

| Entity | Table name | Evidence | Notable fields |
|---|---|---|---|
| **Company** | `companies` | `packages/db/src/schema/companies.ts:5` | `issue_prefix`, `budget_monthly_cents`, `spent_monthly_cents`, `require_board_approval_for_new_agents` (`companies.ts:13-20`) |
| **Agent** | `agents` | `packages/db/src/schema/agents.ts:17` | `role`, `title`, `reports_to` (self-FK), `adapter_type`, `adapter_config`, `budget_monthly_cents`, `status` (`agents.ts:22-34`) |
| **Goal** | `goals` | `packages/db/src/schema/goals.ts:13` | `level`, `status`, `parent_id` (self-FK), `owner_agent_id` (`goals.ts:19-22`) |
| **Project** | `projects` | `packages/db/src/schema/projects.ts:8` | `goal_id`, `lead_agent_id`, `status`, `env` (`projects.ts:12-20`) |
| **Issue (task)** | `issues` | `packages/db/src/schema/issues.ts:27` | `parent_id` (self-FK), `goal_id`, `project_id`, `status`, single `assignee_agent_id`/`assignee_user_id`, `checkout_run_id`, `execution_run_id` (`issues.ts:39-54`) |
| **Run** | `heartbeat_runs` | `packages/db/src/schema/heartbeat_runs.ts:21` | `agent_id`, `status`, `invocation_source`, `wakeup_request_id`, `runtime_mode`, `usage_json`, `result_json` (`heartbeat_runs.ts:25-44`) |
| **Budget** | `budget_policies` | `packages/db/src/schema/budget_policies.ts:5` | `scope_type`, `scope_id`, `metric`, `window_kind`, `warn_percent`, `hard_stop_enabled` (`budget_policies.ts:9-15`) |
| **Approval** | `approvals` | `packages/db/src/schema/approvals.ts:6` | `type`, `status`, `requested_by_agent_id`, `payload`, `decided_by_user_id` (`approvals.ts:10-16`) |

Supporting tables that make the loop work, all confirmed in `packages/db/src/schema/`:

- `cost_events` (`cost_events.ts:9`) — the token/cost ledger behind budget enforcement.
- `activity_log` (`activity_log.ts:6`) — the durable audit record of mutating actions.
- `agent_api_keys` (`agent_api_keys.ts:6`) — bearer keys, hashed at rest (`AGENTS.md:186`).
- `agent_task_sessions` (`agent_task_sessions.ts:16`) — provider session state so adapters can
  resume across runs.
- `agent_wakeup_requests` (`agent_wakeup_requests.ts:15`) — the wake queue that `heartbeat_runs`
  references.
- `company_memberships` (`company_memberships.ts:4`) — ties human users to companies.
- `issue_comments` (`issue_comments.ts:15`) — the only inter-agent communication channel
  (`doc/SPEC.md:300`: "There is no separate messaging or chat system. Tasks are the communication
  channel.").
- `issue_work_products` (`issue_work_products.ts:18`) — outputs/deliverables attached to work.

**Invariants the schema enforces.** Single-assignee work is structural, not convention:
`issues` carries one `assignee_agent_id` and one `assignee_user_id` (`issues.ts:51-52`), and
`doc/SPEC-implementation.md:42` states "Single assignee; atomic checkout required for `in_progress`
transition". Company scoping is a stated engineering rule — "Every domain entity should be scoped to
a company" (`AGENTS.md:74-76`) — and the schema reflects it: `agents`, `issues`, `heartbeat_runs`,
`budget_policies` and `approvals` all carry `company_id`.

**State machines.** Issue status is a fixed set, not a free string. `doc/SPEC-implementation.md:516-523`
lists the transitions: `backlog → todo|cancelled`, `todo → in_progress|blocked|cancelled`,
`in_progress → in_review|blocked|done|cancelled`, `in_review → in_progress|done|cancelled`,
`blocked → todo|in_progress|cancelled`; terminal states are `done` and `cancelled`. Agent status is
`idle/running/error/paused/terminated` (`doc/SPEC-implementation.md:505-512`). Approval status is
`pending → approved|rejected|cancelled` (`doc/SPEC-implementation.md:564`).

Note: `doc/TASKS.md:61-95` describes a *target* model where workflow states are team-customisable
and sit in fixed categories. The code in `issues.ts:44` stores `status` as a plain `text` column
with a `status_version` counter (`issues.ts:45`), and the enforced transitions live in the server
and the implementation spec. The doc says of itself that it is "aspirational" in places
(`doc/TASKS.md:5`), so the implementation spec is the safer description of what runs.

---

## 4. Tech stack and deployment

**Stack**, per `doc/SPEC.md:431-436`:

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | TypeScript + Express (REST, deliberately not tRPC "need non-TS clients") |
| Database | PostgreSQL (embedded PGlite for dev; Docker or hosted for production) |
| Auth | Better Auth |

Runtime requirements: Node.js `>=24.11.0` and pnpm `9.15.4` (`package.json:104-107`). The codebase
uses Drizzle ORM (`packages/db/package.json`) and ships a Rust toolchain for the native runner
(`packages/paperclip-runner/rust-toolchain.toml`).

**Three database modes** (`doc/DATABASE.md:3-7`, `:196-206`):

1. **Embedded PostgreSQL** — if `DATABASE_URL` is unset, the server starts an embedded Postgres and
   stores data at `~/.paperclip/instances/default/db/` (`doc/DATABASE.md:15-20`).
2. **Local PostgreSQL in Docker** — `docker compose up -d` starts PostgreSQL 17 on
   `localhost:5432` (`doc/DATABASE.md:48-53`).
3. **Hosted PostgreSQL (Supabase)** — production option; the doc notes `DATABASE_MIGRATION_URL` for
   split runtime/migration connections (`doc/DATABASE.md:75-116`).

> **Doc/code disagreement.** `doc/DOCKER.md:99` labels the quickstart compose as "embedded SQLite".
> That is wrong. The embedded database is PostgreSQL: `README.md:416` says "An embedded PostgreSQL
> database is created automatically", `doc/DATABASE.md:5-7` says the same, and `packages/db/package.json`
> depends on `embedded-postgres`. `docker/docker-compose.quickstart.yml` itself only says "embedded
> database". Trust the code: it is PostgreSQL. (Same page, `doc/DOCKER.md:44`, also correctly refers
> to "embedded PostgreSQL".)

**Deployment modes** (`doc/DEPLOYMENT-MODES.md:31-45`). Two auth models — `local_trusted` (no login,
single-operator local) and `authenticated` (login required, with `private` or `public` exposure) —
kept separate from reachability, which is a `bind` of `loopback | lan | tailnet | custom`. The
quickstart defaults to trusted local loopback for the fastest first run (`README.md:397`).

**Docker.** `doc/DOCKER.md` documents a single image that installs common agent tools (`git`, `gh`,
`curl`, `wget`, `ripgrep`, `python3`) plus the Claude, Codex and OpenCode CLIs (`doc/DOCKER.md:13`).
It supports a single-container quickstart with a bind-mounted data dir, a full stack with
PostgreSQL 17, an isolated untrusted-PR-review container, and Podman Quadlet units
(`doc/DOCKER.md:97-147`, `:234-299`). Published images go to `ghcr.io/paperclipai/paperclip`
(`doc/DOCKER.md:39`).

**File storage** is local disk by default at `~/.paperclip/instances/default/data/storage` or
S3-compatible object storage in cloud (`doc/SPEC-implementation.md:111-113`).

---

## 5. The smallest mental model a newcomer needs

Ten lines:

1. Paperclip is a **control plane** for a company whose workforce is AI agents; it is not the agents
   and not an agent framework (`doc/GOAL.md:54`, `README.md:334`).
2. One instance runs **many companies**; a company is the first-order object and everything is
   company-scoped (`doc/PRODUCT.md:5`, `AGENTS.md:74`).
3. The human **board** is the operator and retains unrestricted control: pause, override, budget,
   reassign (`doc/SPEC.md:49-58`).
4. The unit of work is the **issue** (shown to users as "task"); issues form a parent/child tree
   that must trace up to a company goal (`packages/db/src/schema/issues.ts:40`, `doc/PRODUCT.md:46-57`).
5. Each issue has **one assignee**, claimed by **atomic checkout**; two runs cannot own the same
   task (`doc/SPEC-implementation.md:42`, `issues.ts:51-53`).
6. Agents are woken by **heartbeats**; a wake goes through a DB-backed queue and is dispatched to
   the agent's **adapter** (`README.md:272`, `doc/SPEC.md:212`).
7. The adapter defines how to **invoke / check / cancel** an external agent; the agent itself runs
   wherever it lives and calls back into the REST API (`doc/SPEC.md:240-248`, `doc/GOAL.md:54`).
8. Every run is recorded as a **heartbeat_run** with usage, logs and status, so work is auditable
   (`packages/db/src/schema/heartbeat_runs.ts:21`).
9. **Budgets** are scoped policies with warning thresholds and hard stops; hitting a hard stop
   pauses work (`packages/db/src/schema/budget_policies.ts:5`, `README.md:292`).
10. **Governance** is enforced by approvals, execution policies and an activity log; config changes
    are revisioned and bad changes can be rolled back (`README.md:212`, `approvals.ts:6`,
    `activity_log.ts:6`).

---

## Lessons for our platform

- **"Control plane, not execution plane" is the load-bearing decision.** Paperclip refuses to own
  the agent runtime and defines only `invoke/status/cancel` (`doc/SPEC.md:240-248`). For our
  governance layer this is the right seam: we can govern human *and* AI workers without owning
  either runtime. Evidence: `doc/PRODUCT.md:88`, `doc/GOAL.md:54`.

- **Model the org as a first-class, queryable tree, not metadata.** `agents.reports_to` is a real
  self-referencing FK (`agents.ts:27`) and the V1 decision is a strict tree with no multi-manager
  reporting (`doc/SPEC-implementation.md:39`). If we want delegation and escalation to be
  auditable, this is cheaper than inventing a separate reporting model later.

- **Single-assignee + atomic checkout removes a whole class of concurrency bugs.** `doc/SPEC.md:438-446`
  explains the choice: "No optimistic locking or CRDTs needed." The schema enforces one assignee
  (`issues.ts:51`). This is a concrete, low-cost pattern we can copy directly for shared human/AI
  task ownership.

- **Tasks-as-communication is a strong constraint, but it is also the product's biggest bet.**
  `doc/SPEC.md:300` states there is no separate messaging system. That keeps context attached to
  work and gives a natural audit trail — but `README.md:333` shows the cost: Agent Chat had to be
  bolted on as an "experimental" task presentation. For us, expect conversational UX to fight a
  task-only data model.

- **Budget enforcement is deliberately conservative and honest about its limits.** Policies carry
  `warn_percent` and `hard_stop_enabled` (`budget_policies.ts:14-15`), and `README.md:292` admits
  enforcement "uses recorded spend; usage reporting and in-flight work can delay a stop". If we
  enforce cost limits, we must document the same gap rather than imply instant hard stops.

- **The audit log is a first-class table, not logging.** `activity_log` (`activity_log.ts:6`) plus
  `AGENTS.md:93` ("Activity logging for mutating actions") makes "who changed what" a queryable
  invariant. Governance products live or die on this; we should make it a schema-level rule, not an
  afterthought.

- **Company scoping is stated as a rule and repeated as a test of every change.**
  `AGENTS.md:74-76` says every entity must be company-scoped and boundaries enforced in
  routes/services. This is the single most repeated invariant in the repo and a good model for our
  multi-tenant story.

- **Beware the documentation sprawl.** This tree has 667 markdown files including a 118 KB
  `SPEC-implementation.md` and a 132 KB `execution-semantics.md`. Even the docs disagree with each
  other (`DOCKER.md:99` vs `README.md:416` on the embedded database). The lesson is not "write less"
  but "keep one authoritative contract and cite it" — `doc/SPEC-implementation.md:12` does this
  correctly by declaring itself the controlling document for V1.

- **The native runner is ambitious and unfinished — do not copy it wholesale.** It adds a Rust
  process, a cross-language protocol with parity gates, and a default-off flag
  (`doc/architecture/paperclip-runner.md:20-21`, `:275-287`). Its own ADR lists "Required proof
  before general availability" as still outstanding. It is a good *pattern* (durable delivery,
  fail-closed trust boundary, server keeps authority over status) but a large amount of machinery
  for a system at our stage.

---

## What I could not verify

- **Runtime behaviour of anything.** I read source and docs only. I did not install or run
  Paperclip, so I cannot confirm that the heartbeat loop, budget hard-stop, atomic checkout, or the
  runner protocol actually work as described. Those need a running instance to prove.
- **Whether the native runner is reachable in a stock install.** `doc/architecture/paperclip-runner.md:20-21`
  says it sits behind a default-off instance flag and an experimental adapter, and the ADR status is
  "Proposed" (`:3`). I could not confirm from the code alone whether any packaged release enables it.
- **Real adapter coverage.** `packages/adapters/` contains the packages, but I did not verify each
  adapter's runtime dependencies or that every listed provider works end-to-end. `README.md:68`
  lists more brands (Cursor, Gemini, Grok, Kimi) than `doc/SPEC.md:218-229` names, and I did not
  reconcile the two lists against the registry in `server/src/adapters/registry.ts`.
- **The exact "newest" claim.** `00-inventory.md` treats this tree as the newest Paperclip, and the
  file dates are 2026-10-04, but every package manifest reports `0.3.1`. I could not find a
  changelog that pins this tree to a distinct release, so I have not asserted any specific
  difference from the older fork.
- **Production database sizing and migration health.** There are 293 migrations and a documented
  O(n²) migration failure mode (`doc/DATABASE.md:208-219`); I did not run the migration-safety gate
  or inspect any live database.
- **Deployment claims.** I did not build the Docker image, so the Docker/Quadlet/Compose paths in
  `doc/DOCKER.md` are unverified as instructions.
