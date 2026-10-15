# CrewAI forensics — Batch 07: the synthesis

**Scope of this batch.** Batches 00–06 measured CrewAI from code. This batch does what a synthesis
must: state the platform's verdict in plain words, name the mechanisms worth carrying into the
mapping pass, state plainly what CrewAI does **not** give us, and answer the two value questions
the method requires. It is a *reading* of the six batches — no new claims about the source are
introduced here, and every claim restates a `file:line` already established and verified in its
originating batch.

**Method rules in force.** Read from `lib/**/*.py` only; `docs/**/*.mdx` never used as authority
(rule 1). No platform comparison (rule 5) — this batch compares **batches to each other**, never
CrewAI to our platform; that is the mapping pass's job. Pole-tag everything (rule 9). Name every
capability (rule 6). Answer the two value questions (rule 4). Report the negatives (rule 6).
Correct earlier batches where later evidence demands it (rule 13).

Version `1.15.28`. Tree: `library/architecture/platforms/_extracted/crewAI-main/`.

---

## 7.1 The measured page

Everything below was counted or read, not estimated.

| Quantity | Measured | Source batch |
|---|---|---|
| Zip md5 | `cd93b15634e2c83ed371553b89533324` | 00 |
| Archive | 41,081 entries / 35,755 files / 430 MB; **no `.git`** | 00 |
| Version | `__version__ = "1.15.28"` | 00 |
| Workspace members | **6** (`crewai`, `crewai-core`, `crewai-tools`, `cli`, `crewai-files`, `devtools`) | 00 |
| `lib/**` Python | **1,411 `.py` / 492,582 lines** | 00 |
| `docs/` | **33,251 `.mdx` / 292 MB = 93% of every file**; 45 version-trees × 4 languages | 00 |
| `crewai-core` | 138,480 lines, of which **134,056 = one generated catalog file** | 00 |
| Hand-written `crewai-core` | **4,424 lines** | 00 |
| Flow engine | `flow/runtime/__init__.py` = **4,051 lines** | 04 |
| A2A | **13,955 lines** | 04 |
| A2UI | **3,669 lines** (18 components, 2 protocol generations) | 05 |
| MCP client | **2,716 lines** | 06 |
| Textual TUI | **3,278 lines** (plus 871 + 393 + 565 in three more) | 05 |
| Security layer | **274 lines** (and 3 of 4 purposes are `TODO`) | 06 |
| CLI | 19,543 lines | 03 |
| Typed events | **163 classes** | 01 |
| Findings written | **67** (14 + 12 + 12 + 12 + 10 + 8 across batches 01–06, plus 00's pin) | all |
| Divergences recorded | **23** (4 + 4 + 4 + 4 + 3 + 4) | all |

**➜ F7-1 [foundational] — The archive is 93 % documentation and 7 % code, the docs are 180
near-copies, and one file is 27 % of the "core" package.** **Plain meaning:** any study that read
the docs would have read the same claim 180 times; any study that judged by line count would think
`crewai-core` is huge when 97 % of it is a generated catalog. **Why it matters:** the method's first
rule was load-bearing, not stylistic, and the two hazards were measured before any finding was
written.

---

## 7.2 The three poles, headlined

### Pole 1 — The aissistant

**CrewAI has a genuinely good *agent* and a genuinely absent *member*.**

What is strong: an agent is a small, honest object — persona is three fields (`role`/`goal`/
`backstory`, `agents/agent_builder/base_agent.py:256-258`), identity is a frozen uuid (`:255`), and
the whole extension surface is exactly **six abstract methods** (`:668-701`): `execute_task`,
`aexecute_task`, `create_agent_executor`, `get_delegation_tools`, `get_platform_tools`,
`get_mcp_tools`. That is a complete and readable definition of "what an agent must be able to do".
The executor branches on capability — native tool-calling (`crew_agent_executor.py:505`) sits on top
of a ReAct text loop (`:352`), so tool-calling is an *optimisation*, not the loop, and the framework
stays model-agnostic. Memory is top-5 recall (`agent/core.py:787-795`). Planning is explicit and
tiered (`agent/planning_config.py:11`, three effort levels `:79`, its own `llm` `:143`). Tool
failure is typed all the way down, with a **precedent chain** `tool → task → agent → crew → WARN`
(`tools/tool_failure.py:35-71`, `:185-208`) — a real answer to "what happens when a tool breaks".

What is absent: an agent is **not a record**. There is no registry, no table, no directory of
agents; a fingerprint is generated and then held in memory or passed explicitly. Identity itself is
excellent as a *primitive* — dual id (human-readable name + uuid, `security/fingerprint.py:41-50`),
random by default, **deterministic from a seed** via `uuid5` (`:88`), carrying one level of
validated metadata (`:17-36`) — but nothing files it. There is no org chart, no reporting line, no
lifecycle beyond construction and execution.

**Pole 1 verdict, plainly:** CrewAI teaches us what an *agent* is and gives us an identity primitive
we can compute without a database. It does not give us an *employee* — nothing that is hired,
recorded, placed in an organisation, or retired. That half is ours.

### Pole 2 — The workspace

**CrewAI's workspace is a folder, and the interesting part is how the folder binds to code.**

A project is real and opinionated: a scaffolder with five *named* name-rejections
(`cli/create_crew.py:59-95`) and a fixed layout (`:148-155`); a runnable template whose `main.py`
exposes the verbs `run`/`train`/`replay`/`test`/`run_with_trigger`; and a YAML↔Python binding that
resolves **string references** (`project/crew_base.py:621-671` — YAML says `"researcher"`, Python
holds the object) with a single `CrewDefinition` (`project/crew_definition.py:297`) materialised from
three different syntaxes. Files are a first-class subsystem (`crewai-files`: four
`FileMode` values `core/types.py:67`, a coercion layer `:28`, an uploader with an `expires_at`
`uploaders/base.py:13/:31`, an upload cache). Knowledge is one class (`knowledge/knowledge.py:88`)
with ten source types and a per-agent collection name of `self.role` (`agent/core.py:587`).

**Pole 2 verdict, plainly:** the *folder contract* — how a directory of YAML describes a team, and
how those strings resolve into objects — is the reusable idea. But again there is **no tenancy**: a
workspace is one folder owned by one person running one process. No sharing, no membership, no
permissions on the folder.

### Pole 3 — Automations

**This is the sharpest finding in the study, and it is a clean split.**

What CrewAI does *not* have, measured by search: **no scheduler, no queue, no worker, no clock,
no cron, no retry, no backoff, no expiry, no ownership record.** "Trigger" is a naming convention —
`crewai_trigger_payload` is an ordinary `kickoff(inputs=…)` key the runtime injects into a start
method that *declares* the parameter (`flow/runtime/__init__.py:2868-2903`), silently dropped
with a log line if it doesn't (`:2883-2886`); and the only definitions of `run_with_trigger` in the
tree are in two scaffolding templates, parsing `sys.argv[1]` as JSON by hand. Delegation — "assign a
task to a teammate" — is an **inline, synchronous, unrecorded function call**: it builds a throwaway
`Task` and calls `execute_task` on the calling thread
(`tools/agent_tools/base_agent_tools.py:112-120`).

What CrewAI does have, and it is good: a **declared workflow graph** (`Flow`) with first-wins racing
on `or_` — including the subtle and *correct* rule that only exclusively-fed alternatives race,
because cancelling a member of an `and_` would make it unsatisfiable forever
(`flow/runtime/__init__.py:1132-1178`, enforced at `:1205-1254`); progress represented as **a set of
completed method names** (`:184`, `:243`, `:3306`), which is exactly the durable-friendly shape;
**two** durability systems — append-only per-method rows (`flow/persistence/sqlite.py:44`, schema at
`:113-138`) and whole-run checkpoints (`state/checkpoint_config.py`) — which the engine **forbids
combining** with a `ValueError` (`:2128-2133`); and one genuine "wait for an outside event"
primitive: a `pending_feedback` row plus `from_pending(flow_id).resume(text)`
(`:1256`, `:1345`), whose own docstring names a webhook handler as the thing that calls it
(`:1372-1375`) — because **nothing in CrewAI does.**

**Pole 3 verdict, plainly:** CrewAI supplies an excellent *executor* and a credible *durability
store*, and **no delivery layer at all**. Work does not arrive; it is started. Nothing is responsible
for a paused run.

### PX-W / PX-F — Widgets and frontend

**An empty frontend and a real widget protocol.**

Measured: no `package.json`, no HTML/Vue/Svelte outside `docs/`, no JS or TS anywhere — CrewAI ships
**no frontend of any kind** (F5-1). What exists is four unrelated surfaces: a 3,278-line Textual
TUI that is essentially a live subscriber to the event bus (F5-10), a Jinja2 renderer that draws the
flow from the same `FlowDefinition` the engine executes (`flow/runtime/__init__.py:4002`,
`visualization/`), a Mintlify docs site it does not build (D5-2), and — the real find — **A2UI**
(`a2a/extensions/a2ui/`, 3,669 lines): a *declarative widget protocol* with four message kinds
(`models.py:106/123/134/148`), an 18-component typed catalogue with bindings, composition and
actions (`catalog.py`), two protocol generations side by side whose deltas are the design decisions
(`prompt.py:118-141`), produced by **prompt augmentation rather than tool calls** (`inject_tools` is
an explicit no-op, `client_extension.py:212-213`), with `allowed_components` **enforced on the
response** (`:397`, `:426`).

**PX verdict, plainly:** the frontend layer is entirely ours to build; the *vocabulary* and the
*subsetting rule* are worth taking.

---

## 7.3 The ranked mechanisms — what to carry forward

Ranked by how much they would cost us to derive ourselves, i.e. value-first, not novelty-first.

1. **The widget catalogue + `allowed_components` enforcement** [PX-W] — a closed, typed set of 18
   components (`a2ui/catalog.py`) and, crucially, a subset **checked on the way out**
   (`client_extension.py:397`), not merely advertised in the prompt. *The only real enforcement
   mechanism found anywhere in the study.* (§5.3.2, §5.3.5)
2. **Progress as a set of completed names** [P3] — the representation that makes a workflow
   resumable in a fresh process without a scheduler (`flow/runtime/__init__.py:184`, `:3306`).
   (§4.4.2)
3. **First-wins `or_` racing, with the unsatisfiable-`and_` rule** [P3] — a non-obvious semantic,
   already correct, with the pitfall documented in the source's own comment (`:1132-1178`). (§4.4.1)
4. **Deterministic identity from a seed** [P1] — `uuid5(NAMESPACE, seed)`
   (`security/fingerprint.py:88`): stable identity across processes with **no database**. (§6.1)
5. **The tool-failure precedent chain** [P1] — typed failure with escalation
   `tool → task → agent → crew → WARN` (`tools/tool_failure.py:35-71`): a complete answer to
   "what happens when a tool breaks", which most systems leave undefined. (§6.5)
6. **The two-layer observability stack** [foundational] — 163 typed events on a singleton bus with
   dependency-ordered handlers and replay (`events/event_bus.py:95`, `:673`), plus a coarser hook
   layer of 10 interception points that can **abort** (`hooks/dispatch.py:40`, `HookAborted:75`).
   (§7.5)
7. **The `FlowDefinition`: one declaration, executed and drawn** [P3/PX] — the same data drives the
   engine and the diagram (`flow/flow_definition.py`, `flow/visualization/builder.py`), so the
   picture cannot drift from the code. (§4.4.4, §5.4)
8. **Checkpoint / resume / fork** [P3] — `from_checkpoint`, `fork(branch=…)`, `restore_from_state_id`
   (`state/checkpoint_config.py`, `flow/runtime/__init__.py:2164-2189`), with the deliberate detail
   that a restored run gets a **fresh id** so history is preserved rather than overwritten. (§4.2.2)
9. **An explicit data-minimisation claim in the source** [PZ] — the telemetry docstring names the
   categories it does *not* send (`crewai_core/telemetry.py:1-9`): a privacy claim that is checkable
   in code rather than promised in a policy. (§6.4)
10. **The six-method agent contract** [P1] — `base_agent.py:668-701` is a compact, complete
    statement of what an agent must be able to do; useful as a checklist for our own aissistant.
    (§7.2)
11. **Intra-run declarative parallelism** [P3] — `Task.async_execution` + a `Future` list
    (`crew.py:1592`, `:1610-1619`): cheap, useful, and clearly *not* scheduling. (§4.3.2)
12. **Hook-based extension without forking** [PZ] — the hook layer lets a host observe and veto
    without touching framework internals; the pattern we would want for our own integration points.
    (§7.5)

**➜ F7-2 [synthesis] — Twelve mechanisms worth carrying; the top three are all about *bounded
vocabulary and honest state*, not about scale.** **Plain meaning:** what CrewAI got most right is
small: a fixed menu of things you may say, a way to write down where a run got to, and a rule for
what happens when two paths race. **Why it matters:** these are cheap to adopt and expensive to
invent, and none of them requires adopting CrewAI itself.

---

## 7.4 What CrewAI does NOT give us

Stated as plainly as the positives, because a study that only lists features is useless.

| Absent capability | Measured how | Batch |
|---|---|---|
| **Tenancy of any kind** | no tenant type/column/param anywhere; `SecurityConfig` marks auth, scoping and impersonation `*TODO*` (`security/security_config.py:25,27,28`) | 06 |
| **Authorization / roles** | five OAuth providers exist to *log you in* (`auth/providers/base_provider.py:10-46`); nothing decides what you may do | 06 |
| **Agent as a stored record** | fingerprints are computed and passed, never filed; no registry | 02, 06 |
| **Organisation / reporting structure** | no org model in the framework; organisations are a hosted-SaaS feature (`organization/main.py:19,55`) | 06 |
| **Hire / provision / retire lifecycle** | agents are constructed and executed; there is no lifecycle | 02 |
| **A queue, worker, scheduler or clock** | searched in both packages — none | 04 |
| **Trigger *delivery*** | a dict key plus a naming convention; hosted API does the rest | 04, 05 |
| **Retry / backoff / expiry / ownership of pending work** | a pending run that nobody resumes stays pending, silently | 04 |
| **Task assignment as a handoff** | delegation is an inline call that blocks the assigner | 04 |
| **A web frontend** | no JS/TS/HTML app anywhere | 05 |
| **A renderer for the widget protocol** | A2UI describes UI; nothing here draws it | 05 |
| **Docs usable as reference** | 180 near-copies across 45 versions × 4 languages, rendered by a third party | 00, 06 |
| **A populated tool-permission seam** | `ToolFilterContext` is well-shaped and unused (`mcp/filters.py:17-26`) | 02, 06 |

**➜ F7-3 [synthesis] — The absences cluster into one sentence: CrewAI has no model of *who owns
what*, and no model of *work that arrives*.** **Plain meaning:** it is a tool for running and
watching a workflow that you start, as a person who is already logged in. Everything about
ownership (tenants, roles, employees, records) and everything about delivery (queues, schedules,
handoffs, responsibility) is outside it. **Why it matters:** these two clusters are, by construction,
the parts of an "AI-company OS" that must exist — so they are the parts we cannot source from this
platform at all. The mapping pass should treat them as **build**, not **adapt**, before it looks at
any table row.

---

## 7.5 The consistency check across batches

A synthesis must look for contradictions between its own inputs. Four were found and are recorded
rather than smoothed:

1. **Triggers.** Batch 04 said "trigger exists only in user templates". Batch 05 found a
   `TriggersCommand` (`cli/triggers/main.py:14`) and corrected this (D5-1): triggers are a **hosted
   API feature** driven *through* the template convention. Both statements are true of different
   layers; the correction stands.
2. **Durability.** Batch 01 recorded checkpoint/resume/fork as *the* reusability find; Batch 04
   found it is **one of two** state systems, mutually exclusive with `@persist` (D4-3), and that
   neither has an owner. Same mechanism, more complete picture.
3. **Permissions.** Batch 02 found the MCP tool-filter seam **empty**. Batch 05 found
   `allowed_components` **enforced**. These are not contradictory — they are two different seams,
   one of which happens to have a supplier — but the pattern (a well-shaped empty slot) is a warning
   worth carrying: *a seam nobody populates is indistinguishable from a feature nobody shipped.*
4. **Security.** Batch 02 saw a `UserWarning` naming a single enterprise token and read it as a
   boundary. Batch 06 read `SecurityConfig` and found three of four purposes are `TODO` (D6-1),
   which **explains** the earlier observation rather than contradicting it: the boundary is a token
   check against a remote service.

**➜ F7-4 [synthesis] — No batch was falsified by a later batch; four were completed by one.**
**Plain meaning:** the study held together, and each correction made the picture larger rather than
replacing it. **Why it matters:** it means the 67 findings can be used as one body of evidence in
the mapping pass, with the four corrections applied, rather than needing a re-read.

---

## 7.6 The two value questions (rule 4)

The method requires each platform to be judged against two questions, kept separate. Both are
answered from the measured material above.

### Q1 — What does this platform do for *its own users*?

**For a Python developer building an agent workflow today: a lot, and honestly.** You get a
scaffolded project with a working template, a team abstraction and a state-machine abstraction that
each fit different problems, a model-agnostic agent loop with a real planning tier, typed tool
failures with escalation, durable run state with resume and fork, 163 events and a hook layer for
observation and veto, an MCP client with four transports, a skills system, a terminal UI that shows
you what is happening, and a diagram of your own workflow generated from your own declaration. The
divergences are documentation drift, not broken behaviour: the four per batch are mostly the docs
selling features that the code deprecates or under-sells.

**Verdict on Q1:** as a *framework for building and running agent workflows on one machine for one
owner*, this is mature, coherent and its abstractions are well-chosen. The gaps we care about
(tenancy, ownership, delivery) are **not gaps for its users** — a solo developer does not need a
tenant model, and starting the process themselves is normal.

### Q2 — What does it do for *our vision*?

**Much less than its quality suggests, and for a structural reason.** Our vision needs three things
CrewAI does not attempt: (a) many independent companies whose data must never mix, (b) employees
that are *records* with identity, placement and lifecycle, and (c) work that *arrives* — assigned,
queued, owned, retried. On all three, measured: absent. What it *does* offer our vision is a set of
**mechanisms** (§7.3) that are individually valuable and largely orthogonal to those three: a
component catalogue with enforcement, a durable progress representation, racing semantics, seed-based
identity, typed tool failure, and a one-declaration-executed-and-drawn workflow model.

**Verdict on Q2:** CrewAI is a **rich mechanism source and a poor architecture template**. We should
take mechanisms from it — especially the three ranked first — and we should **not** look to it for
how to structure ownership, organisation or delivery, because it has deliberately decided not to
have those. Its own architecture's most instructive feature is where it *stops*: at the edge of a
hosted service, with a `TODO` in the docstring of the class that would have gone further.

**➜ F7-5 [synthesis] — The two questions give opposite-looking answers, and both are correct: an
excellent framework for its users, a limited guide for our vision — because its scope ends exactly
where our hard problems begin.** **Plain meaning:** this platform is good at the part that is not
our problem, and silent on the part that is. **Why it matters:** it tells the mapping pass what to
expect before it opens the table — **adapt** the mechanisms, **build** the ownership and delivery
layers, and stop looking for a tenancy model here.

---

## 7.7 The finding index

Consolidated for the mapping pass. Format: `id · pole · one line · batch §`.

**Foundations** — F1-1 identity is per-run contextvar minted on kickoff [P3] 01 §1.4 · F1-2 process
is ten lines / two values [P1] 01 §1.2 (hierarchical = same loop + a manager agent with two tools) ·
F1-3 `kickoff()` is the one door [PZ] 01 §1.1 · F1-4 event bus: 163 typed events, replay, flush
[PZ] 01 §1.3 · F1-5 hooks: 10 interception points, aborts allowed [PZ] 01 §1.3 · F1-6
checkpoint/resume/fork [P3] 01 §1.7 · F1-7 declarative `CrewDefinition` + `FlowDefinition` [P2] 01
§1.1 · F1-8 Flow as second paradigm [P3] 01 §1.1 · F1-9 Skills with 3-level disclosure + versioned
registry [P1/P2] 01 §1.8.

**Pole 1 — the aissistant** — F2-1 persona is three fields + frozen uuid [P1] 02 §2.1 · F2-2 six
abstract methods = the complete agent contract [P1] 02 §2.2 · F2-3 ordered prompt assembly [P1] 02
§2.3 · F2-4 memory as top-5 recall [P1] 02 §2.4 · F2-5 `PlanningConfig` with three effort levels and
its own llm [P1] 02 §2.5 · F2-6 four tool doors [P1] 02 §2.6 · F2-7 MCP `ToolFilterContext(agent,
server_name, run_context)` ships but is unpopulated [P1/PZ] 02 §2.7 · F2-8 typed tool failure with
the precedent chain [P1] 02 §2.8 · F2-9 the enterprise boundary is one token [PZ] 02 §2.9 · F2-10
dual identity + `Fingerprint` [P1] 02 §2.10 · F2-11 tool-calling is an optimisation on a ReAct loop
[P1] 02 §2.2 · F2-12 delegation tools are the manager's only tools [P3] 02 §2.6.

**Pole 2 — the workspace** — F3-1 scaffolder with five named rejections + fixed layout [P2] 03 §3.1 ·
F3-2 runnable template with five verbs [P2] 03 §3.2 · F3-3 `@CrewBase` YAML↔Python binding [P2] 03
§3.3 · F3-4 string-reference resolution [P2] 03 §3.3 · F3-5 one `CrewDefinition` from three syntaxes
[P2] 03 §3.4 · F3-6 file subsystem with four modes [P2] 03 §3.5 · F3-7 uploader with `expires_at` +
cache [P2] 03 §3.5 · F3-8 `run_with_trigger` as the payload door [P3] 03 §3.6 · F3-9 `Knowledge` with
ten source types [P2] 03 §3.7 · F3-10 collection name = `self.role` [P1/P2] 03 §3.7 · F3-11 MCP
transports: stdio/http/sse [P2] 03 §3.8 · F3-12 deploy requires a lockfile [P2] 03 §3.9.

**Pole 3 — automations** — F4-1 no scheduling substrate exists [P3] 04 §4.0 · F4-2 trigger is a
naming convention [P3] 04 §4.1 · F4-3 two mutually-exclusive durability systems [P3] 04 §4.2 ·
F4-4 the one wait-for-event primitive is a pause you resume by hand [P3] 04 §4.2.3 · F4-5 `ask()`
blocks a thread [P3] 04 §4.2.4 · F4-6 delegation is an inline unrecorded call [P3] 04 §4.3.1 ·
F4-7 concurrency is a per-task boolean + Future list [P3] 04 §4.3.2 · F4-8 A2A is federation, not
scheduling [PZ→P3] 04 §4.3.3 · F4-9 `or_` first-wins with loser cancellation [P3] 04 §4.4.1 · F4-10
progress = a set of completed names [P3] 04 §4.4.2 · F4-11 replay is hydration, not deterministic
re-execution [P3] 04 §4.4.3 · F4-12 the graph renders to standalone HTML [PX] 04 §4.4.4.

**Widgets / frontend** — F5-1 no frontend of any kind [PX-F] 05 §5.1 · F5-2 four unrelated interface
surfaces [PX-F] 05 §5.2 · F5-3 the four-message surface protocol [PX-W] 05 §5.3.1 · F5-4 18 typed
components with bindings/composition/actions [PX-W] 05 §5.3.2 · F5-5 two protocol generations side by
side [PX-W] 05 §5.3.3 · F5-6 widgets via prompt augmentation, not tool calls [PX-W] 05 §5.3.4 ·
**F5-7 `allowed_components` enforced on the response [PX-W] 05 §5.3.5** · F5-8 A2UI is an A2A
extension, not a platform feature [PX-W] 05 §5.3.6 · F5-9 the only generated frontend is built from
the executed definition [PX-F] 05 §5.4 · F5-10 the UI is a subscriber, not a caller [PX-F] 05 §5.5.

**Out-of-pole** — **F6-1 no tenancy model [PZ] 06 §6.0** · F6-2 dual identity, seed-deterministic
[P1] 06 §6.1 · F6-3 authentication without authorization [PZ] 06 §6.2 · F6-4 "enterprise" is a
config command [PZ] 06 §6.3 · F6-5 OTLP with a hard-coded endpoint and a checkable privacy claim
[PZ] 06 §6.4 · F6-6 the well-shaped unused tool seam [P1/PZ] 06 §6.5 · F6-7 docs cannot be an
authority [PZ] 06 §6.6 · F6-8 the cross-cutting ledger [PZ] 06 §6.7.

**Synthesis** — F7-1 the measured page [—] §7.1 · F7-2 twelve mechanisms ranked [—] §7.3 · F7-3 the
absences cluster [—] §7.4 · F7-4 four completions, no falsifications [—] §7.5 · F7-5 the two
questions answered [—] §7.6.

**➜ F7-6 [synthesis] — 67 findings, five of them load-bearing: F6-1 (no tenancy), F5-7 (the one real
enforcement), F4-10 (durable progress), F4-1 (no delivery), F6-2 (seed identity).** **Plain meaning:**
if the mapping pass reads only five lines, these are the five. **Why it matters:** it gives the next
stage a prioritised entry point instead of 67 flat rows.

---

## 7.8 The platform verdict, in one paragraph

**CrewAI 1.15.28 is a mature, well-abstracted Python framework for declaring and executing agent
workflows on one machine for one owner.** Its code is honest — the interesting behaviours are
findable and readable, its agent contract is six methods, its agent loop is model-agnostic, its tool
failures are typed and escalate, its workflows are declarable and both executed and drawn from the
same definition, and its widget protocol has a bounded typed catalogue with real enforcement. Its
scope ends precisely where our hard problems begin: it has **no tenancy, no authorization, no agent
records, no organisation, no queue, no scheduler, and no delivery layer**, and the class that would
have carried the first of those marks three of its four purposes `*TODO*` in its own docstring. The
correct posture toward it is therefore **mechanism donor, not architecture template** — take the
catalogue-with-enforcement, the completed-names progress representation, the racing semantics, the
seed-derived identity, and the typed failure chain; and build the ownership and delivery layers
ourselves, without looking for a model of them here.

---

## 7.9 Batch 07 — checklist

- [x] Read from `lib/**/*.py` only; no new source claims introduced (all restate verified findings).
- [x] Every finding carries its originating batch and section.
- [x] No platform comparison (rule 5) — internal batch-to-batch consistency only (§7.5).
- [x] Both value questions answered separately (rule 4, §7.6).
- [x] Absences reported as findings, not omitted (rule 6, §7.4).
- [x] Four cross-batch consistencies recorded, none smoothed (rule 13, §7.5).
- [x] Retirement rule honoured: no earlier finding deleted to fit the synthesis (C13-14).
- [x] 6 synthesis findings: F7-1…F7-6, plus a complete finding index (§7.7).

The CrewAI study is complete: **pin (00) + 67 findings across six pole batches (01–06) + this
synthesis (07).** The reader is built from this markdown, at the end, with the platform-agnostic
generator — and no study markdown is edited to fit it.
