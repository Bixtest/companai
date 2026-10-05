# PLAN — the Paperclip + Hermes study

**The batch plan. This file is the tracker.** A batch is done when its box is ticked, its
findings file exists, and its line is in [`LOG.md`](LOG.md).

**Started 2026-10-05.** Owner's commission is quoted in [`README.md`](README.md).

**Status: 11 of 11 batches done** (batches 00–10). **The programme is complete.**

---

## The rules for every batch

1. **Read the source, cite the file.** A claim about Paperclip names the Paperclip file. A claim
   about Hermes names the Hermes file. No claim without an observation.
2. **Separate the three voices.** *Source code* = what the tool does. *Sibling documents* = what
   their product does and what went wrong. *Our inference* = what we might do. Never blend them
   in one paragraph without labelling.
3. **One findings file per batch**, in [`findings/`](findings/), named `NN-slug.md`.
4. **Tick, add a result, log it** — in the same session as the work.
5. **Carry lessons, never decisions.**

---

## Batch list

### [x] 00 — Inventory and scope
**Deliverable:** [`findings/00-inventory.md`](findings/00-inventory.md)
Pin all four inputs (Paperclip, Hermes, `aissistant-package`, existing docs) with measured sizes
and paths. Mark what is already covered by the existing Hermes forensic study so later batches do
not repeat it. Define the three questions the study must answer.

**Result:** Done 2026-10-05, **and corrected the same day.** All inputs pinned and measured. Found
that **Hermes is already forensically analysed twice** (the 4,254-line study and
`reboot/13-HERMES-CAPABILITY-MATRIX.md`) and that **Paperclip upstream has no analysis anywhere** —
so upstream Paperclip is the gap. Also found that **Paperclip ships its own Hermes gateway**
(`doc/HERMES_GATEWAY_ONBOARDING.md`), which reframes the integration question.
**⚠️ The first pass missed `hermes-docs/reboot/` — a 23,842-line prior analysis programme including
ADR-001, the capability matrix and the proven room mechanism. Batches 07, 08 and 09 were re-scoped
from "produce" to "audit" as a result.** See §2d and §3 of the findings file.

---

### [x] 01 — Paperclip: what it is and how it is built
**Deliverable:** [`findings/01-paperclip-architecture.md`](findings/01-paperclip-architecture.md) (335 lines)
**Result:** Done 2026-10-05. **Paperclip is a control plane, not a runtime** — the whole design
rests on one seam: adapters expose only `invoke/status/cancel` (`doc/SPEC.md:240-248`) and "agents
run wherever they run and phone home" (`doc/GOAL.md:54`). The data model is **company-scoped,
single-assignee and audit-first**; real tables confirmed in `packages/db/src/schema/`: `companies`,
`agents`, `goals`, `projects`, `issues`, `heartbeat_runs`, `budget_policies`, `approvals`,
`cost_events`, `activity_log`. **A doc contradicts the code:** `doc/DOCKER.md:99` calls the
database "embedded SQLite"; it is PostgreSQL (`doc/DATABASE.md:3`). Verified by hand.
⚠️ **Every manifest reports version `0.3.1`** — so this "newest" upstream copy and the sibling's
0.3.1 fork are the same major version. The version-comparison gap in §3 of batch 00 is therefore
**smaller than assumed**; noted, not resolved.
**Read:** `README.md`, `PRODUCT.md`, `GOAL.md`, `SPEC.md`, `ROADMAP.md`, `DESIGN.md`,
`doc/architecture/`, `packages/`, `server/src/`, `ui/`, `cli/`, `pnpm-workspace.yaml`.
**Answer:** What is the product model? What are the moving parts (server, UI, runner, db,
adapters)? What is the data model? What runs where? What is the tech stack? What is the deployment
model? **What is the smallest mental model a newcomer needs?**

---

### [x] 02 — Paperclip: agents
**Deliverable:** [`findings/02-paperclip-agents.md`](findings/02-paperclip-agents.md) (566 lines)
**Result:** Done 2026-10-05. **An agent is one flat, company-scoped row** —
`packages/db/src/schema/agents.ts` carries identity, `role`, the self-referencing `reportsTo` org
edge, budget, status, permissions, and the runtime binding (`adapterType` + `adapterConfig`).
**There is no "type", no human/AI flag, and no owner column.** **"Harness" is marketing vocabulary
for "adapter"**, with no schema backing — `packages/shared/src/types/adapter-registry.ts` says
*"One declarative agent-harness ("adapter") entry."* **"Assistant" is per-work, not ownership** —
each person gets a persistent conversation per agent, but *"these are separate conversations, not
private messages"*. **A doc contradicts the code:** `docs/built-in-agents.md` says two built-in
agents; the code defines four (`briefs`, `learning`, `reflection-coach`, `summarizer`). Verified by
hand.
**Read:** `doc/agent-personas.md`, `doc/agent-files.md`, `doc/agent-instruction-revisions.md`,
`doc/built-in-agents.md`, `docs/agents-runtime.md`, `packages/adapters/`, `packages/skills-catalog/`,
`packages/teams-catalog/`, `doc/execution-github-identity.md`, `doc/adapter-model-audit-2026-09-22.md`.
**Answer:** How is an agent defined? What is a "harness"/adapter? How is a model chosen per agent?
What are personas vs files vs instructions? How are agents versioned? What is a team? How does an
agent get its tools and skills? **What would we copy, and what would we do differently?**

---

### [x] 03 — Paperclip: tasks and delegation
**Deliverable:** [`findings/03-paperclip-tasks-and-delegation.md`](findings/03-paperclip-tasks-and-delegation.md) (259 lines)
**Result:** Done 2026-10-05. **`doc/TASKS.md` is aspirational and diverges from the shipped
schema.** The real model is a flat status enum (`backlog/todo/in_progress/in_review/done/blocked/
cancelled`), a text priority, and **two** assignee columns — `assigneeAgentId` **and**
`assigneeUserId` (`packages/db/src/schema/issues.ts:51-52`), not one `assigneeId`. **Assignment is
manual; only the *wake* is automatic** — a DB-backed queue (`agent_wakeup_requests`) with
idempotency keys and coalescing, and a `backlog` assignee is never woken. A **"heartbeat run" is a
`heartbeat_runs` row**, not a fixed clock: a 30-second scheduler tick plus opt-in per-agent
`intervalSec` (default off). **Delegation is a bounded, auditable set of channels** — parent/child,
blockers, explicit tools, and a "courier pattern" rather than open lateral write access. Recovery
is conservative: one retry, then a board-owned action; **it never auto-reassigns**. Verified by hand.
**Read:** `doc/TASKS.md`, `doc/TASKS-mcp.md`, `doc/TASK-WATCHDOG.md`, `doc/execution-semantics.md`,
`doc/run-log-events.md`, `doc/AGENT-ARTIFACTS.md`, `doc/DATABASE.md`, `server/src/`.
**Answer:** What is a task? How is work assigned to an agent? How does delegation work? What is a
"heartbeat run"? How are priorities, queueing, budgets and approvals modelled? How does the system
record what an agent did? **This is the batch the owner cares about most.**

---

### [x] 04 — Paperclip: meetings, channels and multi-agent collaboration
**Deliverable:** [`findings/04-paperclip-collaboration.md`](findings/04-paperclip-collaboration.md) (380 lines)
**Result:** Done 2026-10-05. **Paperclip has no meeting, room or channel entity at all.** Every
"conversation" is either 1:1 (person↔agent) or one external thread ↔ one issue; the internal Agent
Chat is literally an *issue* (`issues.ts:32-36`). Agents are called in by **assignment or by
commenting on an assigned task — never by `@mention`**. Hand-off is task delegation with a durable
completion callback (`chat_task_handoffs` + `chat_completion_deliveries`,
`chat_completion_deliveries.ts:8-34`), fenced by a session generation. Two overlapping conversation
systems with different vocabularies, and `doc/CHANNELS.md` is about *release* channels — both cost
reader trust. **This gap is our opportunity: a first-class shared space.**
**Read:** `doc/CHANNELS.md`, `doc/AGENT-ARTIFACTS.md`, `doc/agent-files.md`, `doc/connections/`,
`doc/connection-intents.md`, `packages/plugins/`.
**Answer:** How are meetings created? How is an agent called into one? How do agents hand work to
each other? What is a channel? How is a shared thread stored and replayed?

---

### [x] 05 — Paperclip: triggers — heartbeats, events, schedules, watchdogs
**Deliverable:** [`findings/05-paperclip-triggers.md`](findings/05-paperclip-triggers.md) (213 lines)
**Result:** Done 2026-10-05. **A wake is a database row** (`agent_wakeup_requests`), and every trigger
funnels through **one typed call** — `source` / `triggerDetail` / `reason` (`heartbeat.ts:3768-3769`)
— which is what keeps 14 trigger paths observable and retryable. **Recurrence is cron → issue →
wake** (`routines.ts:1974-1982`): the schedule produces *work items*, not invisible invocations.
Catch-up replays missed ticks but is **capped at 25** and sub-hourly schedules never backfill
(`routines.ts:88,3218-3230`); a job can be gated to fire only on external activity. The **DOT-2
incident is documented** — an unbounded self-healing loop re-queued every ~30 s because status
arbitration would not accept the model's completion evidence. **Mentions are deliberately not
assignments.**
**Read:** `doc/TASK-WATCHDOG.md`, `doc/connection-intents.md`, `doc/execution-semantics.md`,
`doc/observability.md`, `packages/paperclip-runner/`, `server/src/`.
**Answer:** How is an agent woken — on a heartbeat, on an event, on a schedule, on a webhook? How is
recurrence (a cron-like process) expressed? How does the system guarantee a woken agent gets its
context? **The owner named cron and event-triggered work explicitly.**

---

### [x] 06 — Paperclip ↔ Hermes: the native gateway and the runner contract
**Deliverable:** [`findings/06-paperclip-hermes-gateway.md`](findings/06-paperclip-hermes-gateway.md) (279 lines)
**Result:** Done 2026-10-05. **Paperclip ships adapters that call a Hermes gateway** — `hermes_gateway`
is a thin HTTP/SSE client over **four endpoints**, and the adapter never imports Hermes code
(`packages/adapters/hermes/src/gateway/server/execute.ts:861-967`). The generic seam is
`execute(AdapterExecutionContext) → AdapterExecutionResult`, a **single result envelope** with
`exitCode`, `errorFamily`, `retryNotBefore`, `usage`, `sessionParams`, `resultJson`
(`packages/adapter-utils/src/types.ts:79-143`) — including `usageBasis: per_run | session_cumulative`,
the detail that stops resumed sessions double-counting tokens. Tool delivery is a **declared adapter
property** (`runtimeToolDelivery`). **MCP governance is the strongest part of the whole system**:
binding precedence, changed-tool quarantine, argument-bound approvals, append-only audit.
**Read:** `doc/HERMES_GATEWAY_ONBOARDING.md`, `doc/HERMES_GATEWAY_SMOKE.md`,
`doc/MCP-ACCESS-GOVERNANCE.md`, `doc/MCP-RUNTIME-OPERATIONS.md`, `packages/mcp-server/`,
`packages/paperclip-runner/`, `doc/runner-api-tools.md`, `doc/runner-created-skills.md`.
**Answer:** Paperclip integrates Hermes *natively* — how? What is the boundary? What is the runner
API? How does Paperclip call Hermes, and Hermes call back? **This is the contract our own
architecture would need.** Cross-check against the SSOT §15.

---

### [x] 07 — Hermes: capabilities we must capitalise on — **audit, do not repeat**
**Deliverable:** [`findings/07-hermes-capabilities-verified.md`](findings/07-hermes-capabilities-verified.md) (214 lines)
**Result:** Done 2026-10-05. A **45-row verification table: ~40 claims verified, 1 contradicted, 2
not checked.** **The contradiction matters:** "session resume is broken" is **our adapter's defect,
not Hermes'** — the capability exists (`gateway/platforms/api_server.py:3613-3614,3699`). Also
verified: **ESTOP** is one sentinel file that fails safe and already gates cron, kanban and new turns
(`agent/estop.py:1-5`); the memory caps **2200/1375 are hard**, not a soft budget; **Hermes ships
hosted rooms** with a 128-member limit, scoped cross-gateway grants and replica takeover
(`gateway/hosted_rooms.py`) — **the most under-used asset in the whole study**; OTLP and LSP ship for
free.
⚠️ **Re-scoped 2026-10-05: this is already covered twice.** Read `hermes-docs/reboot/13-HERMES-CAPABILITY-MATRIX.md`
(the safe product disposition for every inventoried Hermes surface, in six categories) **and** the
4,254-line forensic study, **then verify their claims against the source** —
`library/ai/hermes-agent-main/` — `agent/`, `cron/`, `skills/`, `plugins/`, `tools/`, `providers/`,
`web/`, `acp_adapter/`, `tui_gateway/`.
**Answer:** For each of MCP, model management, agent profiles, skills, memory, sessions, saved
session threads — *does the source actually do what the documents say?* Mark each claim
**verified / contradicted / not-checked**. State plainly what the two existing documents already
settle, so nobody repeats them.

---

### [x] 08 — Bringing a new agent into a thread that already has messages
**Deliverable:** [`findings/08-new-agent-into-existing-thread.md`](findings/08-new-agent-into-existing-thread.md) (459 lines)
**Result:** Done 2026-10-05. The mechanism is **confirmed in the code**: `append_messages_batch` at
`hermes_state.py:8199`, `append_message` at `:8061`, `get_messages_as_conversation` at `:9080`, and a
**no-limit restore** at `acp_adapter/session.py:544`. The two items the dossier called unproven were
attacked, with two results that change the design: **(1) the warm-process hazard is stronger than
"may not be seen" — it will not be seen.** History is loaded only in `_restore`, reached only on a
cold `get_session`, and warm sessions are not evicted on a timer, so a write underneath a warm
session is invisible until eviction or restart. **(2) "Compression drops unknown messages" is
refuted** (`context_compressor.py:6433-6442`). **And a new defect was found:** the sibling's proof
script calls `SessionDB.list_sessions`, which **does not exist on either Hermes tree** — only
`list_sessions_rich` does (`hermes_state.py:7520`).
⚠️ **Re-scoped 2026-10-05: the rule is already written and proven** in
`hermes-docs/reboot/24-HOW-A-ROOM-WORKS.md` — write each room message into each member agent's
Hermes session with `SessionDB.append_messages_batch`, label every message with its speaker, seed a
newcomer with `chunk_rows`, and let Hermes own the transcript while the control plane owns the
canonical room. **The proof script is `ops/verify-room-into-session.py`.**
**Read:** `24-HOW-A-ROOM-WORKS.md`, `22-AGENT-SESSION-ROOM-MODEL.md`, `23-ROOM-MEMORY-ANALYSIS.md`,
`18-WHAT-AN-AISSISTANT-IS.md`, then **verify in the Hermes source**: `hermes_state.py`
(`append_message`, `append_messages_batch`, `get_messages_as_conversation`) and
`acp_adapter/session.py` (the no-limit restore at line ~544).
**Answer:** Confirm the mechanism from the code. Then attack **the two things the dossier says are
NOT proven** — the *warm process* (a write underneath a session Hermes already holds in memory) and
*long rooms / compression* — and the open design item (the room session key must survive an agent
edit). **This is the owner's own question; do not restate the dossier as if it were new.**

---

### [x] 09 — The `aissistant-package` integration
**Deliverable:** [`findings/09-aissistant-integration.md`](findings/09-aissistant-integration.md) (447 lines)
**Result:** Done 2026-10-05. **Four generations of Hermes wiring coexist in one tree** — that is the
single best explanation for why their documentation describes the behaviour several ways. The
**adopted-container incident is a naming collision**, not a mystery: two systems derived the same
container name independently and one adopted the other's process with no error
(`reboot/AUDIT-2026-08-14.md:119-143`). The **knowledge side-car trusts a claimed `actor` string when
its key is empty** (`plugins/knowledge-spaces/src/http-server.ts:50-65`) — their own P0 against the
"AI drafts; humans approve" promise. **Hire is a mandatory shell script** (`ops/hermes/hire-employee.sh:3`),
which is exactly why hire/fire is unreachable from the product UI. The container-per-employee roster
cost **~85 MiB idle each** (`reboot/work/B10-SHARED-RUNTIME.md:11-38`).
⚠️ **Re-scoped 2026-10-05: the whole `hermes-docs/reboot/` dossier is about this.** Read it first
(`12` ADR-001, `14` Projects/Rooms, `work/INV-03` surfacing Hermes in the UI, `work/REC-01/02` the
incidents). **Then add only what the dossier does not cover.**
**Read:** `aissistant-package/` — the **three** compose files, `plugins/` (33), `connectors/` (5),
`ops/` (114), `documentation/` (109), `docs/` (135), `reboot/` (88), `templates/` (40) — **not**
`host/` (76,216 files, almost all `node_modules`).
**Answer:** How did the sibling actually wire the two together at code level — what is **vendored**
vs **written**? What did they add to the front end? What are the known incidents (a Hermes container
adopted because compose named it identically; a 403 from a run record inserted without source-task
info)? **What worked, what failed, and why** — and what does the newest upstream Paperclip already
solve that their 0.3.1 fork had to work around?

---

### [x] 10 — Lessons and target design
**Deliverable:** [`findings/10-lessons-and-target-design.md`](findings/10-lessons-and-target-design.md) (408 lines)
**Result:** Done 2026-10-05. **The synthesis.** Every lesson carries its evidence and its consequence;
each of the owner's **twelve named concerns** is answered in four voices — what Paperclip does, what
Hermes does, what the integration did, what **we** should do. The register resolves to **23 TAKE /
14 REJECT / 12 DO-DIFFERENTLY / 4 NOT-AN-ISSUE**, and **exactly one item is left open for the owner**:
whether an assistant agent is *identity* (it belongs to Alice) or *context* (it acts as Alice) —
Paperclip chose context. The target design names the one structural advantage our base has over
theirs: **because Hermes is in-process and not a network service, we can write through the runtime's
own session path and close the warm-session gap that a pure HTTP control plane cannot.**
**Read:** every findings file `00`–`09`.
**Answer:** The synthesis. Every lesson, each with its evidence and its consequence for us. What we
take from Paperclip, what we take from Hermes, what we take from the integration, what we reject —
and **how our architecture does the agent half better than either or both.** This is the file the
whole programme exists to produce.

---

## Definition of done

**Met 2026-10-05.** The programme is done when:

- [x] all eleven boxes are ticked and all eleven findings files exist — **verified**: `findings/` holds
  `00`–`10`, 3,931 lines;
- [x] every finding cites its source file;
- [x] the synthesis (`10`) states, for each of the owner's named concerns — **assistant agents, solo
  agents, roles, on-the-fly delegation, event triggers, recurring/cron work, meetings, bringing an
  agent into an existing thread, skills, memory, models, MCP** — what Paperclip does, what Hermes
  does, what the integration did, and what **we** should do — **verified**: §3 of `10`, twelve
  subsections;
- [x] the study is referenced from [`../INDEX.md`](../INDEX.md) and
  [`../development/ARCHITECTURE.md`](../development/ARCHITECTURE.md).

**One thing this programme does *not* do, by design.** It produces **lessons, not decisions**. The
only decision it hands back is §3.1 of `10` — whether an assistant agent is *identity* or *context* —
because that is a product promise, not a technical one.
