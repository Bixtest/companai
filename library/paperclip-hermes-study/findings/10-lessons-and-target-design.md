# 10 — Lessons and target design

**The synthesis. This is the file the whole programme exists to produce.**

It reads every findings file `00`–`09` and answers the third of the three questions this study set
itself: *what do we take, what do we reject, and how do we do it better on our own base?*

**Governing rule, from [`../PLAN.md`](../PLAN.md): carry lessons, never decisions.** Almost everything
below is a lesson. The one item that was genuinely the owner's to decide (§3.1) was **answered on
2026-10-05** — so **nothing in this file is now waiting on anyone.** Where a lesson implies a change to
our architecture, it is stated as a consequence, not as a plan.

**Where these lessons are carried forward.** Into
[`../../development/AGENT-HALF.md`](../../development/AGENT-HALF.md), which maps every item below to the
development phase where it lands. **This file is the evidence; that one is the plan.**

**Status vocabulary used throughout.** Every point carries one, so nothing is left hanging:

| Status | Means |
|---|---|
| **TAKE** | Adopt it. Evidence is cited. |
| **REJECT** | Do not adopt it. The reason is given. |
| **DO DIFFERENTLY** | Adopt the *problem*, not their answer. Our answer is named. |
| **OPEN — needs you** | A real decision that is the owner's, not a technical one. |
| **NOT AN ISSUE** | Raised, then measured false. Recorded so nobody raises it again. |

**Our base is not theirs.** The sibling's base is Paperclip 0.3.1 + Hermes. **Our base is Open
Mercato + Hermes**, and the owner's stated intent is that **Hermes is an organic core inside our
codebase, not an external integration bolted onto it**. That difference is load-bearing and it drives
the most important lesson in this file (§5, L-01).

---

## 1. What the eleven batches established

One line each, with the file that proves it.

| Batch | Established | File |
|---|---|---|
| 00 | The four inputs pinned and measured; a **23,842-line prior analysis** (`hermes-docs/reboot/`) found and folded in; the three questions defined. | [`00-inventory.md`](00-inventory.md) |
| 01 | **Paperclip is a control plane, not a runtime.** One seam: adapters expose only `invoke/status/cancel`; "agents run wherever they run and phone home." | [`01-paperclip-architecture.md`](01-paperclip-architecture.md) |
| 02 | **An agent is one flat, company-scoped row.** No type, no human/AI flag, no owner column. "Harness" is marketing for "adapter". "Assistant" is per-work, not ownership. | [`02-paperclip-agents.md`](02-paperclip-agents.md) |
| 03 | **Assignment is manual; only the wake is automatic** (a DB-backed queue with idempotency keys). Recovery never auto-reassigns. | [`03-paperclip-tasks-and-delegation.md`](03-paperclip-tasks-and-delegation.md) |
| 04 | **There is no meeting, room or channel entity.** Agent Chat is an *issue*; agents are called by assignment or comment, **never `@mention`**. | [`04-paperclip-collaboration.md`](04-paperclip-collaboration.md) |
| 05 | **A wake is a database row.** Recurrence is cron → issue → wake. Every trigger funnels through one typed call. | [`05-paperclip-triggers.md`](05-paperclip-triggers.md) |
| 06 | Paperclip **ships** a Hermes gateway — a thin HTTP/SSE client over four endpoints. The generic seam is `execute(context) → result`. | [`06-paperclip-hermes-gateway.md`](06-paperclip-hermes-gateway.md) |
| 07 | **~40 Hermes claims verified, 1 contradicted.** "Resume transcript is broken" is *our adapter's* defect, not Hermes'. | [`07-hermes-capabilities-verified.md`](07-hermes-capabilities-verified.md) |
| 08 | The room mechanism confirmed in code — **and the warm-session hazard is stronger than the dossier said: a write underneath a warm session *will not* be seen.** | [`08-new-agent-into-existing-thread.md`](08-new-agent-into-existing-thread.md) |
| 09 | The sibling's integration at code level: **four generations of Hermes wiring still in one tree**, and the incidents explained in plain English. | [`09-aissistant-integration.md`](09-aissistant-integration.md) |
| 10 | **This file.** The synthesis. | — |

---

## 2. The three questions, answered

**Q1 — How does a system give an AI worker a role, a task, and a way to be woken?**

Paperclip's answer is deliberately minimal and it works: an agent is a **row** with a role and a
`reports_to` edge (`packages/db/src/schema/agents.ts:27`); a task is a **row** with an explicit
assignee, and **at most one of `assigneeAgentId` / `assigneeUserId`**
(`packages/db/src/schema/issues.ts:51-52`); and the *only* automatic thing is the **wake** — a durable
row in `agent_wakeup_requests` with an idempotency key, so a restart does not lose queued work
(`agent_wakeup_requests.ts:15-92`). Everything else — who is assigned, what it means, whether it is
done — is recorded, not inferred.

**Q2 — How do the two halves talk, and how does an agent join a conversation already in progress?**

The two halves talk over an **HTTP contract**, not an import: Paperclip's Hermes gateway is a thin
client over four endpoints and the adapter never imports Hermes code
(`packages/adapters/hermes/src/gateway/server/execute.ts:861-967`). Joining a conversation is **not**
solved by either system. Hermes can append messages to a session
(`hermes_state.py:8199`) but **a stored message has a `role` and no author** — so Hermes cannot record
*who* spoke. The working answer, proven on the sibling's side, is: **the control plane owns the
canonical room, and writes every message into every member agent's own Hermes session, each message
labelled with its speaker.** One session per agent — a shared Hermes session is impossible.

**Q3 — What do we take, what do we reject, and how do we do it better?**

Sections 3, 4 and 5 below. In one sentence: **take Paperclip's discipline (durable wakes, schema-level
concurrency rules, an auditable org tree, a bounded runtime contract) and Hermes' runtime (sessions,
cron, ESTOP, hosted rooms); reject Paperclip's task-only world, its lost instruction history and its
missing shared space; and do the one thing neither does — make a *room* a first-class object that
carries its own speaker identity, its own participants, and its own durable log.**

---

## 3. The twelve concerns, each in four voices

The owner named twelve things the platform must do. For each: what Paperclip does, what Hermes does,
what the integration did, and what we should do. **This section is the mandatory core of the
synthesis** — it is what [`../PLAN.md`](../PLAN.md) §"Definition of done" requires.

### 1. Assistant agents — "some will be connected as specific users' assistants"

| Voice | Finding |
|---|---|
| **Paperclip** | **"Assistant" is a relationship to *work*, not ownership of an agent.** A person gets a persistent conversation per agent, and the agent stays company-owned. Its own doc is explicit: *"these are separate conversations, not private messages"* (`doc/plans/2026-09-10-agent-chat.md`). The agent is never *Alice's*; it acts for Alice on Alice's work. |
| **Hermes** | No concept of an assistant at all. A "profile" is a runtime identity with its own home, memory, skills and credentials — not a person's property. |
| **The integration** | Did not add ownership either. The sibling wired a per-person surface in the UI, but the underlying agent remained a shared runtime identity addressed by `HERMES_HOME` per turn (`aissistant-package/docker-compose.yml:348-389`). |
| **Us** | **Decided 2026-10-05 — neither of the two options I offered.** The owner gave **five kinds**: *personal assistant* (one user, invisible to others) · *role assistant* (a role; all its holders see it) · *context agent* (shared, acts as a user) · *independent agent* (a worker in its own right) · *system agent* (admin-created; cron, backup, cleanup). **Plus the part I had not asked for and which matters more: an approval rule.** For each action the agent either acts automatically or needs the relevant user's approval — *and that choice is what identifies who is responsible.* The human verifies and approves; the agent is never the accountable party. |

**Status: ANSWERED 2026-10-05 — and my question was the wrong shape.** It forced a choice between two
of the owner's five kinds and missed the accountability rule, which is the load-bearing half. Two of
the five (independent, system) are not assistants at all. **The full model, and where each piece lands
in the development plan, is [`../../development/AGENT-HALF.md`](../../development/AGENT-HALF.md).**
The lesson for this file: *a question with two options can hide the real answer.* The owner also
confirmed the answer reaches further than "which kind" — it settles the **agent model** and the
**human-approval gate** among the vision's own 40 items (kernel spec §8, items 4 and 31).

### 2. Solo agents — "some will work on their own"

| Voice | Finding |
|---|---|
| **Paperclip** | Fully supported and unremarkable: an agent with no human `responsibleUserId` simply works its assigned tasks. Nothing special is needed — there is no "solo mode". |
| **Hermes** | Fully supported: a profile is autonomous by default. ESTOP (`agent/estop.py:1-5`) is the global stop, and it gates cron, kanban and new turns. |
| **The integration** | The sibling ran agents both ways; their provisioning script binds a human to a home at hire time (`ops/hermes/hire-employee.sh`), which quietly makes the human a prerequisite. |
| **Us** | Solo agents should be the **default shape**, not a variant. An agent row with no owner is a complete agent. This is the cheapest possible design and it is what makes "hire an AI employee" a single insert. |

**Status: TAKE** — the flat, ownerless agent row. Evidence: `packages/db/src/schema/agents.ts`.

### 3. Roles

| Voice | Finding |
|---|---|
| **Paperclip** | `role` is a text field on the agent row, and the **org chart is the real grouping**: `reports_to` is a self-referencing FK (`agents.ts:27`) and V1 is a strict tree with no multi-manager reporting (`doc/SPEC-implementation.md:39`). Teams exist only as **seed data** (`packages/teams-catalog/src/types.ts`). |
| **Hermes** | No org concept. "Profile" is a runtime identity; the closest thing to a role is which skills and tools are enabled. |
| **The integration** | The sibling modelled roles in the UI and in the docs (departments), and had to keep them in step with Hermes profiles by hand — one of the sources of their "two owners of one fact" register. |
| **Us** | Model the **org as a first-class, queryable tree** and treat teams as seed data, exactly as Paperclip does. Invest in the org graph and its health checks (cycles, terminated/paused ancestors) rather than a separate "team membership" table. |

**Status: TAKE** — `reports_to` as a real FK plus cycle/ancestor health checks.
Evidence: `agents.ts:27`, `doc/SPEC-implementation.md:39`, `packages/shared/src/agent-eligibility.ts`.

### 4. On-the-fly delegation

| Voice | Finding |
|---|---|
| **Paperclip** | Delegation is a **bounded, auditable set of channels**, not open lateral write access: parent/child, blockers, explicit tools, and a **"courier pattern"** where one agent passes work to another without gaining authority over it (`doc/execution-semantics.md:251-265`). Hand-off is durable and reports back (`chat_task_handoffs` + `chat_completion_deliveries`, `chat_completion_deliveries.ts:8-34`), fenced by a session generation so a `/new` cannot resurrect a stale reply. |
| **Hermes** | No delegation model. An agent can call a tool; it cannot hand a *task* to another agent. |
| **The integration** | Delegation ran through Paperclip's task model, which is why the sibling's "agents talking to each other" was really "tasks moving between agents". |
| **Us** | Copy the **bounded channel + completion callback** shape. Do **not** copy the heavyweight machinery (generations, boundaries, durable outboxes, cancellation fences — `agent-conversations.ts:118-576`) before we have the load that justifies it. |

**Status: TAKE (the shape) / DO DIFFERENTLY (the size).** Evidence:
`doc/execution-semantics.md:251-265`, `chat_completion_deliveries.ts:8-34`.

### 5. Event triggers

| Voice | Finding |
|---|---|
| **Paperclip** | Every trigger funnels through **one typed call** — `source` / `triggerDetail` / `reason` on a single `wakeup` (`heartbeat.ts:3768-3769`) — which is what makes **14 trigger paths** uniformly observable and retryable. There is **no generic event→agent rule engine**; each event is mapped explicitly. |
| **Hermes** | Ships `cron/` and an event surface, plus webhooks, but no rule engine either. |
| **The integration** | Used Paperclip's wake path; the sibling never built a rule engine. |
| **Us** | Funnel every trigger through one typed API, and be **skeptical of a generic rule engine** — it would need its own authorization model, which is real design work, not a config file. |

**Status: TAKE (one funnel) / REJECT (a generic rule engine).**
Evidence: `heartbeat.ts:3768-3769`, `doc/TASK-WATCHDOG.md:132`.

### 6. Recurring / cron work — "an AI agent performs a process at a certain time periodically"

| Voice | Finding |
|---|---|
| **Paperclip** | A routine **creates an issue and then wakes its assignee** (`routines.ts:1974-1982`). So every scheduled execution has a visible task, a thread and an origin fingerprint — the schedule produces **work items, not invisible invocations**. Two details worth copying: missed ticks replay but are **capped at 25** and sub-hourly schedules never backfill (`routines.ts:88,3218-3230`); and a job can be gated to fire **only if external activity occurred** since the last dispatch (`activityGatePolicy: "require_external_activity"`, `routines.ts:1286-1394`). |
| **Hermes** | `cron/` is **first-class**, and ESTOP gates it (`agent/estop.py:1-5`). The owner's "recurring work like a cron job" does not have to be invented. |
| **The integration** | Used both — Paperclip routines for scheduled work, Hermes cron underneath. |
| **Us** | **Adopt the "schedule produces a work item" pattern**, not "schedule fires an invisible agent". Copy the capped catch-up and the activity gate. **The lesson is to pick *one* mental model for frequency and write it down** — Paperclip ships three and it confuses readers. *(Which one is a design task, not a decision for the owner; the safe default is Paperclip's own — an immediate wake on assignment, plus a per-agent interval that is **off** unless enabled.)* |

**Status: TAKE.** Evidence: `routines.ts:1974-1982, 88, 3218-3230, 1286-1394`; `agent/estop.py:1-5`.

### 7. Meetings

| Voice | Finding |
|---|---|
| **Paperclip** | **There is no meeting, room or channel entity.** Every "conversation" is either 1:1 (person↔agent) or one external thread↔one issue. `doc/CHANNELS.md` is about *release* channels, not chat (`doc/CHANNELS.md:1-12`). The internal Agent Chat is literally an issue with `conversationAgentId` / `conversationUserId` (`issues.ts:32-36`). |
| **Hermes** | Ships **hosted rooms** — an event log, a **128-member limit**, scoped cross-gateway grants and replica takeover (`gateway/hosted_rooms.py`, `hosted_room_replicas.py`). This is the single most under-used asset in the whole study. |
| **The integration** | The sibling's **"room"** is the concept the owner asked about; their founder's own note says five documents described it five ways before it was pinned down. |
| **Us** | **This is our opportunity.** Model a **shared space as a first-class entity** — its own id, participants, agenda, lifecycle and durable log — that can *contain* tasks. Paperclip has no such object. And **look hard at Hermes hosted rooms before designing our own** — if we build a parallel room model we will duplicate it and then diverge. |

**Status: DO DIFFERENTLY** — a first-class meeting object, built on Hermes hosted rooms where they fit.
Evidence: `doc/CHANNELS.md:1-12`, `issues.ts:32-36`, `gateway/hosted_rooms.py`.

### 8. Bringing an agent into a thread that already has messages

| Voice | Finding |
|---|---|
| **Paperclip** | To bring a *specific* agent into a thread you must **assign it a task**. You cannot simply mention it: Paperclip deliberately refuses to wake on `@mention` (`heartbeat.ts:26885`; `doc/execution-semantics.md:425`). |
| **Hermes** | `SessionDB.append_messages_batch(session_id, messages, …, chunk_rows=None)` at `hermes_state.py:8199` writes a whole history into a session in one transaction; restore is **unlimited** (`library/ai/hermes-agent-main/acp_adapter/session.py:474` — the sibling's vendored copy of the same call is at `:544`; the two trees differ by line). But **Hermes merges consecutive same-role messages into one block** (`agent/agent_runtime_helpers.py:730-759`), so the speaker boundary is erased unless it is written into the text. |
| **The integration** | Proven the mechanism end to end: append the room into each agent's session; the agent answers **only when addressed**; seed a newcomer with `chunk_rows` (10k rows ≈ 2.4 s in one `BEGIN IMMEDIATE`). **But** the proof only covered the *cold* path, and the room session key folded in a fingerprint of the model/tools/profile — so **changing an agent's model silently ended its room conversations**. |
| **Us** | Own the room and the speaker identity; let Hermes own the transcript. Key the room session on **`(agent, room)` and never on configuration**. **Close the warm-session gap** — batch 08 measured that a write underneath a session Hermes already holds in memory **will not be seen** until eviction or restart (history is loaded only in `_restore`, reached only on a cold `get_session`, and warm sessions are not evicted on a timer). Label every message, because the merge is not optional. |

**Status: TAKE (the mechanism) / DO DIFFERENTLY (the key and the warm path).**
Evidence: `hermes_state.py:8199`,
`library/ai/hermes-agent-main/acp_adapter/session.py:474` (sibling's copy: `:544`),
`agent/agent_runtime_helpers.py:730-759`, [`08-new-agent-into-existing-thread.md`](08-new-agent-into-existing-thread.md) §4.1.

### 9. Skills

| Voice | Finding |
|---|---|
| **Paperclip** | Skills are **description-indexed markdown loaded on demand** — the agent sees only `name` + `description` and loads the body when relevant (`docs/guides/agent-developer/writing-a-skill.md`). Each skill carries a **derived** trust level: `markdown_only` / `assets` / `scripts_executables` (`packages/skills-catalog/src/types.ts`). Teams ship as portable markdown bundles through the same import path as a company (`packages/teams-catalog/src/types.ts`). |
| **Hermes** | Has `skills/`, `optional-skills/` and a skills hub (`tools/skills_hub.py`, `skills_hub_install.py`, `skills_guard.py`) with install/update/audit/uninstall. |
| **The integration** | The sibling surfaced Hermes skills in the UI; `INV-03` found only ~19 of 122 capabilities reach the end user. |
| **Us** | Adopt the **description-indexed, load-on-demand** pattern — it keeps the base prompt small. Adopt the **derived trust level**: it is a cheap, honest safety signal we would otherwise have to invent. Model our starting teams as **data, not code**, and reuse the import path. |

**Status: TAKE.** Evidence: `packages/skills-catalog/src/types.ts`,
`docs/guides/agent-developer/writing-a-skill.md`.

### 10. Memory

| Voice | Finding |
|---|---|
| **Paperclip** | No memory model of its own — memory belongs to the runtime. |
| **Hermes** | Memory is a **2,200-character container that rejects on overflow** (`tools/memory_tool_store.py:157-161`), and **only one external memory provider may be assigned to a profile** (`agent/memory_manager.py:3-5`). The cap does **not** constrain external writers. |
| **The integration** | The sibling's room design correctly kept room transcripts **out** of memory — memory is the wrong container for a conversation. |
| **Us** | Treat the caps as **hard**, not as a soft budget. Respect the **one-external-memory-provider** rule when we ship our own provider. **Keep rooms in sessions, not memory.** |

**Status: TAKE.** Evidence: `tools/memory_tool_store.py:157-161`, `agent/memory_manager.py:3-5`.

### 11. Models

| Voice | Finding |
|---|---|
| **Paperclip** | **Weak point.** The model lives in a free-form `adapterConfig` jsonb (`heartbeat.ts:6909`) and every adapter re-declares its own model list (`doc/adapter-model-audit-2026-09-22.md`) — the source of the doc/code drift we measured. |
| **Hermes** | Owns providers and model management properly; the session API even supports a **model lock** (`gateway/platforms/api_server.py:83-98`). |
| **The integration** | The SSOT pins one contract: `Base URL: http://hermes:8642/v1`, `Model ID: paperclip-hermes` — **many logical agents, one generation** at a time (`library/ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` §15). |
| **Us** | **One model registry, referenced by agents** — do not bury the model in an opaque jsonb and do not let each adapter re-declare the list. And keep the **model out of the session key** (§3.8): if the model changes, change the model the turn runs on; do not silently start a new session. |

**Status: DO DIFFERENTLY.** Evidence: `heartbeat.ts:6909`,
`doc/adapter-model-audit-2026-09-22.md`, `api_server.py:83-98`.

### 12. MCP

| Voice | Finding |
|---|---|
| **Paperclip** | The **strongest part of the whole system.** Governance is a chain — Application → Connection → Catalog → Profile → Binding → Policy → Gateway — with bindings at `company/agent/project/routine/issue/gateway` and **precedence narrowest-first** (`doc/MCP-ACCESS-GOVERNANCE.md`). Newly discovered write/destructive tools are **auto-quarantined until a human reviews them** (`:208`). Approvals are bound to **exact arguments** (`signed_arguments_mismatch`) and trust expires on a **schema change** (`:326-357`). Audit is **append-only**, and a failed audit write is a **paging incident** (`:399,428`). |
| **Hermes** | Ships MCP support and `optional-mcps/`; tool delivery differs by runtime. |
| **The integration** | The sibling exposed a curated MCP surface to the UI; their knowledge side-car had a **P0**: it trusts an `actor` string when its key is empty (`plugins/knowledge-spaces/src/http-server.ts:50-65`). |
| **Us** | Copy the **binding precedence** idea (one policy governs a whole project), the **changed-tool quarantine** as a *default*, and **argument-bound approvals**. Make audit append-only and make audit-write failure a stop-the-line event. **Never** copy the claimed-actor bug: our approval store's actor must be **authenticated, not claimed**. |

**Status: TAKE** (governance chain, quarantine, argument-bound approval) **/ REJECT** (claimed actor).
Evidence: `doc/MCP-ACCESS-GOVERNANCE.md:208,326-357,399,428`;
`aissistant-package/plugins/knowledge-spaces/src/http-server.ts:50-65`.

---

## 4. The lessons register

Consolidated, deduplicated, each with its evidence and its status. This is the list to work from.

### 4a. Take — adopt it

| # | Lesson | Evidence | Consequence for us |
|---|---|---|---|
| L-01 | **The control-plane / runtime seam is the load-bearing decision.** A control plane defines `invoke/status/cancel` and never owns the runtime. | `doc/SPEC.md:240-248`; `doc/GOAL.md:54` | Our governance layer can govern human *and* AI workers without owning either runtime. |
| L-02 | **Make the wake a durable database row, not an in-memory timer.** | `agent_wakeup_requests.ts:15-92`; `doc/architecture/durable-continuation-scheduler.md:40-54` | A cron whose only state is a running process loses work on deploy. Ours survives restart. |
| L-03 | **Put concurrency rules in the schema.** One-open-routine, one-active-watchdog, one-active-recovery are partial unique indexes, not application hope. | `issues.ts:140-196`; `doc/SPEC.md:438-446` | "No optimistic locking or CRDTs needed" — a whole class of bugs removed at the schema. |
| L-04 | **Separate structure, dependency, ownership and execution.** `parentId` ≠ blockers ≠ assignee ≠ run locks. | `doc/execution-semantics.md:11-20,216-247` | Four distinct fields, not one overloaded "parent/blocked/assigned" notion. |
| L-05 | **The liveness contract is the strongest idea in Paperclip.** "What moves this forward next?" is a *testable predicate* with an enumerated list of valid paths; local background processes explicitly do not count. | `doc/execution-semantics.md:337-385` | For a platform premised on autonomous workers, this is the difference between a demo and an operating system. |
| L-06 | **Funnel every trigger through one typed API.** | `heartbeat.ts:3768-3769` | Makes 14 trigger paths observable and uniformly retryable; duplicates become reason-able. |
| L-07 | **A schedule produces work items, not invisible invocations.** Routine → issue → wake. | `routines.ts:1974-1982` | Every scheduled AI action has a visible task, a thread and an origin fingerprint. |
| L-08 | **The audit log is a first-class table and audit-write failure is an incident.** | `activity_log.ts:6`; `doc/MCP-ACCESS-GOVERNANCE.md:399,428` | "Who changed what" is a queryable invariant, and an un-auditable tool call stops the line. |
| L-09 | **Company scoping as a repeated invariant, enforced in routes and services.** | `AGENTS.md:74-76` | Our multi-tenant story, stated as a rule and tested on every change. |
| L-10 | **Govern tools by scope-bound profiles with narrowest-first precedence.** | `doc/MCP-ACCESS-GOVERNANCE.md` | One policy governs a whole project instead of enumerating tools per agent. |
| L-11 | **Quarantine newly discovered write/destructive tools until a human reviews them.** | `doc/MCP-ACCESS-GOVERNANCE.md:208` | A cheap, high-value defence against a compromised or upgraded upstream. Make it a default. |
| L-12 | **Bind approvals to exact arguments; expire trust on a schema change.** | `doc/MCP-ACCESS-GOVERNANCE.md:326-357` | An approval authorizes one reviewed call *shape*, not a tool forever. |
| L-13 | **Skills as description-indexed, on-demand markdown, with a derived trust level.** | `packages/skills-catalog/src/types.ts` | Small base prompt; composable skills; an honest safety signal for free. |
| L-14 | **Teams as portable data bundles sharing the import path.** | `packages/teams-catalog/src/types.ts` | "Hire a team" reuses "import a company". |
| L-15 | **One durable work object under every conversation.** Chat is presentation over the issue, so billing, permissions, approvals, runs and audit come free. | `doc/plans/2026-03-11-….md:94-110` | A conversation that matters *is* a durable, auditable object. |
| L-16 | **Single-result envelope with `usageBasis`.** `exitCode`, `errorFamily`, `retryNotBefore`, `usage`, `sessionParams`, `resultJson`. | `packages/adapter-utils/src/types.ts:79-143`, `:96-102` | `usageBasis: per_run \| session_cumulative` stops resumed sessions double-counting tokens. |
| L-17 | **Declare how each runtime receives tools.** `runtimeToolDelivery: native_mcp \| environment \| invocation_context`. | `packages/adapter-utils/src/types.ts:174` | One control plane serves runtimes with different injection mechanisms, without special-casing names. |
| L-18 | **ESTOP as a global kill switch.** One sentinel file, fails safe on corruption, gates cron, kanban and new turns. | `agent/estop.py:1-5` | Mapping our pause to it is nearly free. |
| L-19 | **Treat the Hermes memory caps as hard, and respect the one-provider rule.** | `tools/memory_tool_store.py:157-161`; `agent/memory_manager.py:3-5` | Rooms live in sessions, not memory. |
| L-20 | **Take OTLP and LSP for free.** Both ship in Hermes. | [`07`](07-hermes-capabilities-verified.md) §9 | Neither needs to be built. |
| L-21 | **Never run two processes against one profile.** Exclusivity is lock-enforced and fails closed. | `hermes_cli/profiles.py:814` | Plan profile packing accordingly. |
| L-22 | **A room is one session *per agent*, and every message must carry its speaker.** | `hermes_state.py:8199`; `agent/agent_runtime_helpers.py:730-759` | The merge is not optional; the label is the only thing that survives it. |
| L-23 | **Seed a newcomer with `chunk_rows`, in bounded transactions.** | `hermes_state.py:8224-8244` | 10k rows ≈ 2.4 s in one `BEGIN IMMEDIATE`; a per-row loop starves concurrent writers. |

### 4b. Reject — do not adopt it

| # | What we reject | Why | Evidence |
|---|---|---|---|
| R-01 | **Tasks-as-the-only-communication** | It keeps context attached to work, but the cost is visible: Agent Chat had to be bolted on as an "experimental" task presentation. A conversational UX will fight a task-only model. | `doc/SPEC.md:300`; `README.md:333` |
| R-02 | **Last-write-wins instructions with no history** | *"no text merge or historical copy"* — a serious auditability gap for a governance product. We version instructions by default. | `doc/agent-files.md` |
| R-03 | **A "personal" conversation that is company-visible** | Inheriting a task container gives the wrong visibility by accident. We decide visibility explicitly. | `doc/plans/2026-09-10-agent-chat.md` |
| R-04 | **Model choice buried in an opaque jsonb, re-declared per adapter** | It is the root of the doc/code drift we measured three times in one batch. | `heartbeat.ts:6909`; `doc/adapter-model-audit-2026-09-22.md` |
| R-05 | **A generic event→agent rule engine** | Upstream has none, deliberately. A rule engine needs its own authorization model — real design work, not a config file. | `doc/TASK-WATCHDOG.md:132` |
| R-06 | **Waking an agent on `@mention`** | Paperclip refuses to, deliberately. It would spawn work nobody authorized. | `heartbeat.ts:26885`; `doc/execution-semantics.md:425` |
| R-07 | **The heavyweight conversation machinery wholesale** | Generations, boundaries, durable outboxes, idempotency keys and cancellation fences are earned at scale. A large surface we should not copy before we have the load. | `agent-conversations.ts:118-576` |
| R-08 | **The native runner as a whole** | A Rust process, a cross-language protocol with parity gates, a default-off flag — and its own ADR still lists "required proof before general availability" as outstanding. Take the *pattern*, not the machinery. | `doc/architecture/paperclip-runner.md:20-21,275-287` |
| R-09 | **A work log with a spec's name** | `adapter-plugin.md` is a branch changelog. Future readers — including agents — will trust the wrong document. | `adapter-plugin.md:1-3` |
| R-10 | **A shell script as the hire path** | Their hire path logs into an API, binds secrets and writes `config.yaml` from bash — which is why hire/fire is unreachable from the product UI. Ours is a server transaction. | `ops/hermes/hire-employee.sh:3,161-277` |
| R-11 | **A per-employee container roster** | The ten fixed `hermes-<slug>` services caused the adopted-container incident and are now dead weight. Container identity should be irrelevant; the agent's *home* is the boundary. | `reboot/AUDIT-2026-08-14.md:119-143`; `reboot/work/B10-SHARED-RUNTIME.md:11-38` |
| R-12 | **A callback token in model-visible instructions** | Their own ADR calls it a recovery patch, not the target boundary. | `reboot/work/REC-01.md:98-100`; `reboot/12-ARCHITECTURE-DECISION-COMPANAI.md:144` |
| R-13 | **A hard-coded credential-donor profile** | Copying `auth.json` from a named profile "breaks on fresh instances". | `ops/hermes/hire-employee.sh:109-120`; `docs/ARCHITECTURE-DIAGNOSIS.md:188-191` |
| R-14 | **A claimed actor identity** | The side-car trusts an `actor` string when its key is empty — their own P0 against the "AI drafts; humans approve" promise. Copying the shape would import the bug. | `plugins/knowledge-spaces/src/http-server.ts:50-65`; `reboot/00-CURRENT-STATE.md:78-83` |

### 4c. Do differently — adopt the problem, not their answer

| # | The problem | Their answer | Our answer |
|---|---|---|---|
| D-01 | How do many humans and many agents share one space? | There is no such object; "use one task and comment on it". | A **first-class meeting/room** with its own id, participants, agenda, lifecycle and durable log, which can *contain* tasks. |
| D-02 | How is an agent pulled into a thread without a full assignment? | You cannot — assign it a task. | A **real mention/participant concept**, gated by the same permissions Paperclip applies to assignment. |
| D-03 | Two overlapping conversation systems with different vocabularies | Ship both; let the names confuse. | **One mental model**, visibly the same for internal and external conversations. |
| D-04 | The room session key breaks on a model change | Fold a model/tools/profile fingerprint into the key. | Key the room session on **`(agent, room)`** only. A model change changes the model, not the session. |
| D-05 | A write underneath a warm session is invisible | The dossier said "may not be seen". | Measured: **it will not be seen.** Route the append through the runtime's own session path so `state.history` and the DB stay in step; eviction is the fallback. |
| D-06 | Two owners of one fact | Two systems each believed they were in charge of approvals, skills, sessions, secrets, models and channels. | **One canonical owner per fact, and the boundary written down.** Their own register calls this the most expensive kind of bug "because it produces no error — only a system that quietly disagrees with itself". |
| D-07 | Provisioning an employee | A mandatory ops script outside the product. | **Provisioning is a first-class product operation** — hire is a server transaction from the start. |
| D-08 | Exposing 122 runtime capabilities | ~19 reach the user, and ~46 admin settings are hand-built screens. | **Declarative `FieldDef` with a `secret` flag**, and expose a chosen subset as declarations rather than screens. |
| D-09 | Reading a system of record | One token that was write-capable when it looked read-only. | **Separate reader and writer credentials, and prove denial with a real `403`.** |
| D-10 | Documenting the model | A "target model" doc that diverges from the shipped schema. | **Generate schema docs from the schema**, and keep ephemeral branch notes out of spec-named files. |
| D-11 | Prioritising work | A text field with no scheduler effect. | If priority is meant to matter, **make it order the queue** — or do not ship it. |
| D-12 | Frequency | Three mental models (30 s tick, opt-in `intervalSec`, immediate wake). | **Pick one and write it down** — a design task, not an owner decision; the safe default is Paperclip's own. |

### 4d. Not an issue — raised, then measured false

| # | The claim | What measurement showed |
|---|---|---|
| N-01 | "Hermes session resume is broken." | **False.** The capability exists — `POST /api/sessions/{id}/chat` continues a transcript and `/v1/runs` loads history (`gateway/platforms/api_server.py:3613-3614,3699`). The break was in **our adapter**. |
| N-02 | "Compression drops messages it does not recognise." | **Refuted.** The compressor preserves unknown message shapes (`context_compressor.py:6433-6442`). |
| N-03 | "A shared Hermes session holds a whole room." | **Impossible.** A stored message has a `role` and no author field. A room is one session *per agent*. |
| N-04 | "An agent does not pay context for room messages until it needs them." | **True of `session_search`, false of the current session.** Restore loads every active message with no limit (`library/ai/hermes-agent-main/acp_adapter/session.py:474`). Once appended, it is in context every turn. |

---

## 5. Our target design for the agent half

Not a plan — a **shape**, drawn from the lessons. It is what "better than each and both combined"
means concretely.

### 5.1 The one structural difference: Hermes is our core, not a plug-in

Paperclip's seam — a thin HTTP contract, adapters that never import the runtime — is **right for a
control plane that must stay runtime-agnostic** (L-01). But the owner's intent is that **Hermes is an
organic core inside our codebase**. Those two are not in conflict, and the resolution matters:

- **Keep the port boundary** (`AiRuntimePort` and its six ports, per
  [`../reboot/12-ARCHITECTURE-DECISION-COMPANAI.md`](../../ai/hermes-docs/reboot/12-ARCHITECTURE-DECISION-COMPANAI.md))
  so the runtime stays **testable with a mock** and replaceable in principle. Paperclip's own E2E
  smoke proves this is worth having.
- **Do not treat Hermes as a third-party service we call over the network.** It is in-process. That
  is precisely what lets us **fix the warm-session gap** (D-05) — we can write through the runtime's
  own session path instead of writing underneath it. A pure HTTP control plane *cannot* do this; it
  has only the DB. **This is the concrete architectural advantage of our base over theirs.**

### 5.2 The objects

| Object | Owned by | Carries | Why |
|---|---|---|---|
| **Agent** | us | identity, role, `reportsTo`, model ref, runtime binding, status, budget | One flat, legible row (L-02 pattern; `agents.ts`). No "type" column; the human/AI distinction is the same shape. |
| **Task** | us | assignee (agent *or* human), parent, blockers, run lock, origin | Four separate fields (L-04); schema-enforced concurrency (L-03). |
| **Wake** | us | source, reason, idempotency key, coalescing state | The durable row (L-02, L-06). |
| **Room / Meeting** | **us — canonical** | id, participants, agenda, lifecycle, **`(speaker, sequence, body)` log** | The object Paperclip does not have (D-01). It *contains* tasks. |
| **Session (per agent, per room)** | Hermes | the transcript that goes into context | One per `(agent, room)` — never keyed on config (D-04). |
| **Model** | us | one registry, referenced by agents | Not a jsonb, not re-declared per adapter (R-04). |
| **Approval** | us | canonical argument hash, actor **authenticated** | Bound to a call shape, not a tool (L-12); no claimed actor (R-14). |
| **Audit** | us | append-only | Failed write = incident (L-08). |

### 5.3 The three flows that matter

**A wake happens.** Something — a schedule, an event, a comment, a delegation — calls **one** typed
`wake(source, reason, idempotencyKey)`. It writes a row. The row is coalesced if a run is in flight.
A run starts, and the *only* thing that counts as liveness is an enumerated, testable path (L-05).

**A scheduled job runs.** The routine creates a **task**, then wakes its assignee (L-07). It fires
only if external activity occurred since the last dispatch (activity gate), and missed ticks replay
capped at 25 (never sub-hourly).

**An agent joins a room already in progress.** The control plane appends the newcomer's whole history
through **`chunk_rows`** in bounded transactions (L-23), **routed through the runtime's own session
path so a warm session sees it** (D-05). Every message is labelled with its speaker, because Hermes
merges consecutive same-role messages (L-22). The agent is **written to, not asked** — it answers only
when addressed. The room's canonical log stays ours; Hermes holds a private per-agent view.

### 5.4 What we build first, and what we defer

**First:** agent row, task row, durable wake, one typed trigger, room with a speaker-labelled log,
model registry, append-only audit. That is a working AI-staff platform.

**Defer until measured:** liveness watchdogs (L-05), the courier delegation channel, MCP binding
precedence beyond a single level, the native-runner-style settlement discipline, hosted-room replica
takeover. Each is a real pattern; none is needed to have a working first version, and Paperclip's own
surface is a cautionary tale about building recovery subsystems before the load exists.

---

## 6. What is open, and what is not verified

**Open — needs you: nothing.** §3.1 was the one exception, and the owner answered it on 2026-10-05.
Every point in this file is now a *lesson* — a problem, its evidence, and a consequence — and the
whole register is carried forward into the development plan by
[`../../development/AGENT-HALF.md`](../../development/AGENT-HALF.md). (Two points that read like
decisions were deliberately **not** the owner's: §3.6 and D-12, *which* frequency model to adopt — a
design task with an obvious safe default — and §3.11, the model registry — the same.)

- **§3.1 — are assistant agents *identity* (the agent belongs to Alice) or *context* (the agent acts
  as Alice for Alice's work)?** Paperclip chose context. If we want identity we add an owner column
  and a visibility rule. Everything else in this file is a lesson and does not need you.

**Not verified — stated so nobody mistakes them for findings:**

| Item | Status |
|---|---|
| Paperclip and Hermes were **read, not run**. | Every finding is static analysis. A capability present in code may still be gated by config or a broken dependency at run time. |
| The Hermes **runtime capability probe** (the matrix's own "feature admission checklist") | Still the right gate before we rely on any Hermes capability. |
| The **warm-path** room test | Not written yet — it is the test the sibling never wrote (D-05). The cold-path script exists but calls a `SessionDB.list_sessions` method that **does not exist** on either Hermes tree; only `list_sessions_rich` does (`hermes_state.py:7520`). |
| The **vendored-vs-library** Hermes difference | `aissistant-package/hermes/` (0.20.1, monolithic) and `library/ai/hermes-agent-main/` (modularised) are different revisions. Behaviour matches on the restore path; not diffed in full. |
| **`aissistant-package`'s `host/` fork delta** | All fork figures (version 0.3.1, 177 files, ~+19,703/−245 lines) are **quoted** from `reboot/00-CURRENT-STATE.md:16-24`, not re-measured — `host/` is 76,216 files of `node_modules`. |
| The sibling's **front-end line counts and behaviour** | The dossier's figures, not independently confirmed (they live under `host/`). |

---

## 7. How to use this file

- **Reading order for a newcomer:** [`../README.md`](../README.md) → [`00-inventory.md`](00-inventory.md)
  → this file → then the batch that interests you.
- **If you are designing the agent half:** §5 is the shape, §4 is the evidence.
- **If you are looking for a decision:** §6 has the only one that is open.
- **If you are about to rebuild something:** check §4d first — four things in this space are already
  known to be false, and one of them ("resume is broken") was ours to fix, not Hermes'.

---

## 8. Measured correction, 2026-10-14 — §5.1's premise does not hold on our base *as built*

Written after the full study was re-read against the Phase-2 build (rule 0b: the repo is the truth;
this study is a hypothesis about it). §5.1 claims our one structural advantage over Paperclip is that
**"Hermes is in-process and not a network service"**, so we can "write through the runtime's own
session path" while "a pure HTTP control plane *cannot* do this; it has only the DB". **Both halves
of that claim are wrong for the platform as it now stands**, and the correction changes one
consequence in the target design:

**What was measured (all 2026-10-14, in `workspace/starting-kit` against the pinned Hermes source):**

1. **Our Hermes is not in-process.** It is a **separate, digest-pinned worker container**
   (`docker-compose.hermes.yml`, service `hermes-gateway`, image `hermes-gateway:p2-9a`, pin digest
   `ca760e97…` — **re-pinned 2026-10-16 to `07ee857b…`, 19,728 files; see `HERMES-PIN.md` §1.1.2**), and the app cannot run it: the app container has no Python and no Docker socket, so
   it **connects** the worker by URL. The door is the pin's own ws transport (`tui_gateway/ws.py`)
   mounted beside stdio by this platform's own bootstrap (`docker/hermes/ws_host.py` +
   `ws_entry.py`, P2-8). Architecturally we are the network-door case §5.1 says "cannot".
2. **§5.1's premise is also wrong about HTTP control planes in general.** "It has only the DB" is
   true of *Paperclip's* four-endpoint client (batch 06 §1.2: create-run, events, status, stop — no
   message surface). It is **not** true of Hermes: the pinned source ships its own session REST
   surface on the other door — `POST /api/sessions/{id}/chat` loads the stored transcript and runs a
   turn (`gateway/platforms/api_server.py:3613-3614`), plus `/api/sessions/{id}/messages`, fork,
   model-lock (batch 07 §7). **The runtime's own session path is itself an HTTP surface.** Paperclip
   chose a client too narrow to reach it; that is their limitation, not HTTP's.
3. **The append primitive exists in the pin, on both write paths.** `append_message` and
   `append_messages_batch` are in the pinned tree (`hermes_state_messages.py:380`, `:449`) — the
   batch-08 room mechanism is present in the exact source this platform runs.
4. **Our door does not expose it — yet.** The measured RPC surface of the ws door is session
   *lifecycle* (`session.create/list/resume/close/compress/interrupt/delete/archive/title/branch_stored/
   active_list/events`), `prompt.submit` (+attachments), `approval.*`, `subagent.steer`,
   `delegation.*`, `spawn_tree.*`, `session.foreign.*` (import *another backend's* session), and the
   config/tools/toolsets/profiles/mcp/skills families (`tui_gateway/methods_session.py`,
   `methods_session_control.py`, `methods_prompt.py`, `methods_session_foreign.py`). **No method
   appends an arbitrary message into a live session.** So batch 08's option (a) — write through the
   runtime's own session path — is not reachable today, on either door we actually serve.

**The corrected conclusion.** The *conclusion* (close the warm-session gap, D-05) stands; the
*premise* (only in-process gets there) does not. On our base the write-through is reachable three
ways, none requiring Hermes to move into the app:

- **(i) An in-worker RPC on our existing seam — recommended.** This platform already runs its own
  Python inside the worker (`ws_host.py`, `ws_entry.py`, `mcp_bootstrap.py` — the P2-8/P2-9a
  pattern). Adding one method (e.g. `session.append_messages`) served by that same bootstrap and
  calling the pin's own `append_messages_batch` **is** writing through the runtime's session path —
  over the network door, with the port boundary intact and the worker still replaceable and
  mock-testable (which §5.1 correctly requires).
- **(ii) The api_server door.** `POST /api/sessions/{id}/chat` on the `gateway run` service
  (port 8642) already persists a message and runs a turn with history loaded. ⚠️ **That service is
  the `hermes-local` service `P2-9b` plans to retire (`CC-74`)** — retiring it without (i) in place
  removes the only currently reachable session-write surface. Registered as **`CC-83`**.
- **(iii) The fallbacks** — evict-and-reload (`session.close` exists on the door; blunt, discards
  the warm agent) and prompt compensation (bounded, duplicated content), batch 08's options (b)/(c).

**What this does *not* change.** The port stays (L-01 is untouched and, if anything, better
confirmed: Paperclip's invoke/status/cancel and the sibling's ADR-001 `AiRuntimePort`-of-six-ports
reached the same shape this platform's `lib/ai-runtime-port.ts` implements). The control-plane /
runtime ownership boundary stands. What falls is only the sentence claiming in-process as our
structural advantage — our hybrid (external pinned worker + in-worker seam) gets the same
write-through benefit *without* giving up the network boundary, which is a better position than
either predecessor had. **A study that hides its own correction is not trustworthy (batch 00's
rule); that is why this section exists.**
