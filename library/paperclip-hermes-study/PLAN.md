# PLAN — the Paperclip + Hermes study

**The batch plan. This file is the tracker.** A batch is done when its box is ticked, its
findings file exists, and its line is in [`LOG.md`](LOG.md).

**Started 2026-10-05.** Owner's commission is quoted in [`README.md`](README.md).

**Status: 4 of 11 batches done** (batches 00, 01, 02, 03).

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

### [ ] 04 — Paperclip: meetings, channels and multi-agent collaboration
**Deliverable:** `findings/04-paperclip-collaboration.md`
**Read:** `doc/CHANNELS.md`, `doc/AGENT-ARTIFACTS.md`, `doc/agent-files.md`, `doc/connections/`,
`doc/connection-intents.md`, `packages/plugins/`.
**Answer:** How are meetings created? How is an agent called into one? How do agents hand work to
each other? What is a channel? How is a shared thread stored and replayed?

---

### [ ] 05 — Paperclip: triggers — heartbeats, events, schedules, watchdogs
**Deliverable:** `findings/05-paperclip-triggers.md`
**Read:** `doc/TASK-WATCHDOG.md`, `doc/connection-intents.md`, `doc/execution-semantics.md`,
`doc/observability.md`, `packages/paperclip-runner/`, `server/src/`.
**Answer:** How is an agent woken — on a heartbeat, on an event, on a schedule, on a webhook? How is
recurrence (a cron-like process) expressed? How does the system guarantee a woken agent gets its
context? **The owner named cron and event-triggered work explicitly.**

---

### [ ] 06 — Paperclip ↔ Hermes: the native gateway and the runner contract
**Deliverable:** `findings/06-paperclip-hermes-gateway.md`
**Read:** `doc/HERMES_GATEWAY_ONBOARDING.md`, `doc/HERMES_GATEWAY_SMOKE.md`,
`doc/MCP-ACCESS-GOVERNANCE.md`, `doc/MCP-RUNTIME-OPERATIONS.md`, `packages/mcp-server/`,
`packages/paperclip-runner/`, `doc/runner-api-tools.md`, `doc/runner-created-skills.md`.
**Answer:** Paperclip integrates Hermes *natively* — how? What is the boundary? What is the runner
API? How does Paperclip call Hermes, and Hermes call back? **This is the contract our own
architecture would need.** Cross-check against the SSOT §15.

---

### [ ] 07 — Hermes: capabilities we must capitalise on — **audit, do not repeat**
**Deliverable:** `findings/07-hermes-capabilities-verified.md`
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

### [ ] 08 — Bringing a new agent into a thread that already has messages
**Deliverable:** `findings/08-new-agent-into-existing-thread.md`
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

### [ ] 09 — The `aissistant-package` integration
**Deliverable:** `findings/09-aissistant-integration.md`
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

### [ ] 10 — Lessons and target design
**Deliverable:** `findings/10-lessons-and-target-design.md`
**Read:** every findings file `00`–`09`.
**Answer:** The synthesis. Every lesson, each with its evidence and its consequence for us. What we
take from Paperclip, what we take from Hermes, what we take from the integration, what we reject —
and **how our architecture does the agent half better than either or both.** This is the file the
whole programme exists to produce.

---

## Definition of done

The programme is done when:

- all eleven boxes are ticked and all eleven findings files exist;
- every finding cites its source file;
- the synthesis (`10`) states, for each of the owner's named concerns — **assistant agents, solo
  agents, roles, on-the-fly delegation, event triggers, recurring/cron work, meetings, bringing an
  agent into an existing thread, skills, memory, models, MCP** — what Paperclip does, what Hermes
  does, what the integration did, and what **we** should do;
- the study is referenced from [`../INDEX.md`](../INDEX.md) and
  [`../development/ARCHITECTURE.md`](../development/ARCHITECTURE.md).
