# The agent half — the model, the decision, and where every lesson lands

**What this is.** The study ([`../paperclip-hermes-study/`](../paperclip-hermes-study/)) produced **53
lessons**. A lesson that is not attached to a phase is a lesson nobody applies — it reads well and
changes nothing. **This file attaches every one of them to the phase where it lands**, and records the
owner's agent-model decision that they hang on.

**Why the agent half needs its own plan.** The four-phase plan
([`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md)) is the
**product half**: the kernel, the security floor, the product surface, the hygiene. The **agent half** —
how AI workers get roles, tasks, delegation, triggers and conversations — was *"borrowed"* from Hermes
and was never planned. It is planned here.

**The two files, and which to read.** The study's synthesis
([`findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md))
is the **evidence** — each lesson with its source. **This file is the plan** — each lesson with its
phase. Where this file and the study disagree about a fact, the study wins and this file is broken.

---

## 1. The decision — 2026-10-05

### 1.1 Five kinds of agent

The owner answered the one open question. The answer was **not** the two options I offered.

| Kind | Who it belongs to | Who can see it | Acts as |
|---|---|---|---|
| **Personal assistant** | one user | **that user only** | an assistant to that person |
| **Role assistant** | a role | **every user holding that role** | an assistant to that function |
| **Context agent** | the company | shared | **a named user**, for that user's work |
| **Independent agent** | the company | a worker in its own right | itself — its role, its permissions, its own queue |
| **System agent** | an admin | whoever the admin scopes it to | a system function — cron, backup, cleanup |

**Two of the five are not assistants at all.** *Independent* and *system* agents have no person they
serve. That is why my two-option question was the wrong shape: it assumed every agent is somebody's
assistant, and asked only *whose*.

### 1.2 The rule that carries responsibility

For **each action**, an agent either **acts automatically** or **needs the relevant user's approval** —
and **that choice is what identifies who is responsible.**

The owner's own example, and it is the whole rule in one case:

> An assistant may **filter** spam in my platform inbox. It may **not clean** it. I approve, or I
> perform the cleaning.

And the chain that follows from it:

> A supervisor hands an employee a task. The employee may use the assistants allocated to them. **But if
> it goes wrong, the employee cannot blame the assistant** — it is the user's job to fact-check, verify
> and approve the final action.

**The principle, stated once: the accountable party is always a person. An agent is never the party who
is answerable.** Everything else in this section is machinery for making that true.

### 1.3 Why this is cheap — the platform already has both halves

This is the part that makes the decision *organic* rather than a new subsystem. Both halves exist:

**(a) An agent already has a machine identity.** [`../workspace/knowledge/ai-workers.md`](../../workspace/knowledge/ai-workers.md):
an AI worker is an API key marked `principal_kind = 'ai_worker'`, which issues an `ai_worker:<keyId>`
subject. The journal, the ledger and the authority resolver all key off that. That file already says
what it is for:

> *"**Hermes** — its agents authenticate as `ai_worker` credentials, so everything they do is bounded
> and attributed as machine work from the first act."*

So **"who is this agent, and can it be told apart from a person?" is already answered and already
built.** The five kinds are a *scoping* layer on top of a principal that exists.

**(b) The approval rule is already built — it is the `A0`–`A5` ladder.** From
[`../workspace/knowledge/authority-decisions.md`](../../workspace/knowledge/authority-decisions.md),
which records that **every gate now binds**:

| Gate | Meaning | What it is in the owner's terms |
|---|---|---|
| `A0` | Blocked | the agent may not do this at all |
| `A1` | **Propose; a human performs** | *"filter it, but do not clean it — I do the cleaning"* |
| `A2` | Approve first | the agent asks, then acts |
| `A3` | Hold and commit unless vetoed | the agent acts, a person has a window to stop it |
| `A4` | Execute, then review | the agent acts; a person reviews afterwards |
| `A5` | Execute and log | the agent acts; it is recorded |

**So the owner's "approval rule" is not new machinery. It is assigning a gate to each agent action.**
`A1` is the spam example exactly. This is the single most important sentence in this document:

> **The agent half needs no new authorization model. It needs agents wired into the one that is already
> running — `ai_worker` for identity, `A0`–`A5` for autonomy, and an owner for scope.**

### 1.4 What the agent record must therefore carry

| Field | Values | Why |
|---|---|---|
| `kind` | `personal` · `role` · `context` · `independent` · `system` | decides visibility and who owns it |
| `owner` | a `User` · a `Role` · the `Organization` · an admin | the visibility scope, and the person answerable |
| `actsAs` | a `User`, or null | set for `context` agents only — *"acts as Alice"* |
| `role` | a `Role` | the permissions, exactly as a human has them |
| `runtime` | the `AiRuntimePort` binding | which runtime runs its turns (§1.5) |
| `autonomy` | an `A0`–`A5` gate, per action class | **the responsibility rule** (§1.2) |

**`autonomy` is per action class, not per agent.** One agent can be `A5` for reading and `A1` for
deleting — which is precisely the spam example: `A5` to *filter*, `A1` to *clean*.

### 1.5 The runtime boundary

The agent record carries a **binding**, not an embedded runtime. The study's L-01 says why: a control
plane defines `invoke/status/cancel` and never owns the runtime. **Our version keeps the port
boundary** so the runtime stays testable with a mock — but **Hermes is in-process, not a network
service**, which is the one structural advantage our base has over Paperclip's (study §5.1).

---

## 2. What the decision settles in the vision's own 40-item gate

The kernel specification ([`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md) §8) keeps the
honest ledger of the vision's 40-item bar. The decision changes two rows:

| # | Item | Was | Is now |
|---|---|---|---|
| 4 | Agent model | `SETTLED` — §5.4, one line | **`SETTLED` in detail** — five kinds, ownership, visibility, runtime binding, autonomy gate (§1.4) |
| 31 | Human approval model | `DERIVED`, with **the gate itself `OPEN — spec`** | **`SETTLED`** — the `A0`–`A5` ladder, plus the rule that the accountable party is always a person (§1.2) |

**The published tally does not move: still 22 settled/derived · 10 partly · 8 open.** That was measured,
not assumed — and it is worth stating why, because it is a defect in the gate's own ledger:

> **The tally counts a row by its FIRST status token.** Row 31 began `**DERIVED** — Doc 3 §54; the gate
> itself **OPEN — spec**`. Its first token was `DERIVED`, so it was **already counted as settled** —
> even though its own text said the gate was open. Closing that gap is real progress that the count
> could not see.

**Measured, and it is worse than one row: 11 of the 40 rows contain `OPEN — spec` somewhere while being
counted as settled or partly.** So **"8 open" is a count of rows whose *first* token is `OPEN`** — not a
count of everything still open. Anyone reading the tally as "only 8 things are unresolved" is reading
it wrong. *(That sentence is the reason this section exists: it is a measurement about the spec, and it
belongs in the plan rather than in a note.)*

**Superseded 2026-10-05 — draft 2 was written and the numbers above no longer apply.** The new
register in the spec's §8 was parsed: **35 settled · 1 derived · 3 deferred with named triggers · 1 open
— owner**. The three deferred rows are the vision's phase 7–9 items (Hermes version-compat, the
evaluation benchmark, the capability-package format) and each names the trigger that unblocks it; the
one open row is the Hermes boundary (**B-05**), which is the owner's decision, not the spec's. **The
vision's 40-item gate is therefore passed.** This section is kept, unchanged below, as the record of
*why draft 2 was needed* — the "22/10/8" figures above are draft 1's, and the counting defect it names
was fixed in draft 2 by the status rule at the spec's §0.

---

## 3. Where every lesson lands

The study's register is **23 TAKE · 14 REJECT · 12 DO DIFFERENTLY · 4 NOT AN ISSUE = 53**. Every one is
placed below — **counted, not asserted: 23 `L-` · 12 `D-` · 14 `R-` · 4 `N-` = 53.** **A lesson with
no phase is a defect in this file.**

**How to read the phase column.** The phase is where the item **can first be built**, which is set by
its dependency — not by how important it is. Several agent-half items land in phase 4 because that is
where the scheduler lives, not because they are minor.

### 3.1 Phase 1 — the spine · *the agent becomes a kernel object*

**Why here.** Phase 1 defines what an entity, a field and a relationship **are**. An agent is an
entity. Its kind, owner and role are fields. Build these anywhere else and they get rebuilt.

| Item | The lesson | Lands as |
|---|---|---|
| **AH-1** | An agent is **one flat, legible row** with a role and a real `reportsTo` edge — no "type" flag, no separate human/AI shape | the `Agent` object in the kernel, extended with `kind`/`owner`/`actsAs`/`autonomy` (§1.4) |
| **L-01** | The control-plane / runtime seam is the load-bearing decision: define `invoke/status/cancel`, never own the runtime | the `AiRuntimePort` boundary and the agent's `runtime` binding |
| **L-03** | **Concurrency rules belong in the schema** — "at most one open routine, one active watchdog" as partial unique indexes, not application hope | schema-level constraints on the task and run objects |
| **L-04** | Separate **structure, dependency, ownership and execution** — four fields, never one overloaded "parent/blocked/assigned" | the task object's four fields |
| **D-11** | Priority that does not order the queue is decorative — **either make it order the queue, or do not ship it** | the task object's priority field, or its removal |
| **D-06** | **One canonical owner per fact**, and the boundary written down. Their own register calls two owners of one fact *"the most expensive kind of bug… it produces no error — only a system that quietly disagrees with itself"* | a design rule for the kernel: every field has one writer |
| **D-10** | **Generate schema docs from the schema**; keep ephemeral notes out of spec-named files | a rule for the kernel's own documentation |

### 3.2 Phase 2 — the security floor · *the responsibility rule is enforced here*

**Why here.** Phase 2 is where classification, authorization and the AI guards live. The owner's
approval rule **is** an authorization concern, and `ai_worker` is already a principal the resolver
understands. Wiring it anywhere else means enforcing it twice.

| Item | The lesson | Lands as |
|---|---|---|
| **AH-2** | **The responsibility rule** (§1.2) — per-action-class autonomy, and the accountable party is always a person | `autonomy` resolved through the existing `A0`–`A5` gates at the command bus |
| **AH-11** · **L-18** | **ESTOP as a global kill switch** — one sentinel file, fails safe on corruption, already gates cron, kanban and new turns (`agent/estop.py:1-5`) | our pause mapped onto it |
| **L-08** | The **audit log is a first-class table**, and **a failed audit write is a stop-the-line incident** | already present; extend to agent acts and make the failure loud |
| **L-09** | Company scoping as a repeated invariant, enforced in routes and services | already present; extend to agent-owned rows |
| **L-10** | Govern tools by **scope-bound profiles with narrowest-first precedence** — one policy governs a whole project | MCP/tool binding precedence |
| **L-11** | **Quarantine newly discovered write/destructive tools** until a human reviews them — make it a default, not an option | tool-catalogue refresh |
| **L-12** | **Bind approvals to exact arguments**; expire trust on a schema change — an approval authorizes one reviewed *shape* | the approval record's canonical argument hash |
| **L-16** | One result envelope with **`usageBasis`** (`per_run` / `session_cumulative`) — it is what stops resumed sessions double-counting tokens | the runtime result contract and the budget |
| **L-17** | **Declare how each runtime receives tools** rather than special-casing runtime names | the runtime binding's `runtimeToolDelivery` |
| **L-19** | Treat the Hermes memory caps as **hard**, and respect the **one-external-memory-provider** rule | the memory-scope boundary |
| **L-21** | **Never run two processes against one profile** — exclusivity is lock-enforced and fails closed | the deployment rule for agent homes |
| **D-09** | Keep **reader and writer credentials** for any external system of record, and **prove denial with a real `403`** | the credential model for agent connectors |

### 3.3 Phase 3 — the product surface · *the shared space, and the agents a person can see*

**Why here.** Phase 3 is where a person can actually use the thing: Widgets, references, User
Functions. **Every kind of agent except *system* becomes visible to a human in this phase.** This is
also where the study's single biggest gap is filled — the shared space neither product has.

| Item | The lesson | Lands as |
|---|---|---|
| **AH-5** | **Model a shared space as a first-class entity** — a meeting/room with its own id, participants, agenda, lifecycle and durable log, that can *contain* tasks. **Paperclip has no such object** | the room object and its canonical log |
| **AH-6** | Give agents a **real mention/participant concept** so one can be pulled into a thread **without a full assignment** | participants on the room, gated by the same permissions as assignment |
| **AH-7** | **Provisioning is a first-class product operation, not an ops script** — their hire path is a mandatory shell script, which is why hire/fire is unreachable from their UI | hire/fire as a server transaction |
| **AH-12** | **The warm-session test** — prove the *next turn* sees a write made while the runtime holds the session. **The sibling never wrote this test** | the acceptance test for AH-5 |
| **L-13** | **Skills as description-indexed, on-demand markdown**, with a **derived** trust level (`markdown_only` / `assets` / `scripts_executables`) | the skill surface |
| **L-14** | **Teams as portable data bundles** sharing the import path with a company | "hire a team" |
| **L-15** | **One durable work object under every conversation** — a conversation that matters *is* a durable, auditable object | rooms and chats both sit on tasks |
| **L-22** | **A room is one session *per agent***, and **every message must carry its speaker** — Hermes merges consecutive same-role messages, so the label is the only thing that survives | the room writer |
| **L-23** | Seed a newcomer with **`chunk_rows`**, in bounded transactions — never a per-row loop | joining a room in progress |
| **D-01** | Adopt the *problem* (many humans and agents in one space), not their answer ("use one task and comment on it") | the room object, above |
| **D-02** | Adopt the problem (pull an agent in without assigning it), not their answer ("you cannot") | mentions/participants, above |
| **D-03** | **One mental model** for internal and external conversations — Paperclip shipped two overlapping systems with different vocabularies | one conversation vocabulary |
| **D-04** | **Key the room session on `(agent, room)`, never on configuration** — their key folded in the model/tools/profile, so **changing an agent's model silently ended its room conversations** | the room session key |
| **D-05** | **Close the warm-session gap.** The dossier said a write underneath a warm session *"may not be seen"*; measured, **it will not be seen.** Write *through* the runtime's session path so `state.history` and the store stay in step | the room writer's write path |
| **D-07** | Provisioning as a product operation, not a script | hire/fire, above |
| **D-08** | Expose a chosen subset of runtime settings **as declarations, not screens** (`FieldDef` with a `secret` flag) — their end-user surface is ~19 of 122 capabilities | the agent-settings surface |

**The five kinds land here, three of them:** *personal* and *role* assistants become visible
(§1.1), *context* agents act as their user, and *independent* agents work their own queue in the open.
*System* agents land in phase 4, because that is where the scheduler and the backup live.

### 3.4 Phase 4 — the hygiene · *triggers, routines, and the system agents*

**Why here.** Phase 4 already owns the **scheduler enforcement gate (G-18)** and **business backup and
restore (G-12)**. The owner's *system agents* — cron replacement, backup, cleanup — are the same
machinery. Putting them anywhere else splits one scheduler into two, which is the fork `G-18` exists to
resolve.

| Item | The lesson | Lands as |
|---|---|---|
| **AH-3** | **Make a wake a durable database row, not an in-memory timer** — a cron whose only state is a running process loses work on deploy | the wake queue |
| **AH-4** | **A schedule produces work items, not invisible invocations** — routine → task → wake, so every scheduled run has a visible task and a thread | routines |
| **AH-10** | **System agents** — admin-created agents that replace or augment a system function (cron, backup, cleanup) | built on G-12 and G-18 |
| **L-02** | The durable wake row, above | the wake queue |
| **L-05** | **The liveness contract** — *"what moves this forward next?"* is a **testable predicate** with an enumerated list of valid paths; local background processes explicitly do not count | the watchdog's definition of progress |
| **L-06** | **Funnel every trigger through one typed API** — one `wake(source, reason, key)` call is what keeps 14 trigger paths observable and retryable | the trigger API |
| **L-07** | A schedule produces work items, above | routines |
| **L-20** | **Take OTLP and LSP for free** — both ship in Hermes | observability |
| **D-12** | **Pick one mental model for frequency and write it down** — Paperclip ships three and it confuses readers. The safe default is theirs: immediate wake on assignment, plus a per-agent interval that is **off** unless enabled | the trigger documentation |

### 3.5 Permanent exclusions — do not build these

The study's **14 REJECT** items. These are not deferred; they are **decided against**, and they belong
beside the plan's existing "do not build" list rather than in a phase.

| # | Not building | Why |
|---|---|---|
| R-01 | Tasks as the *only* communication | Agent Chat had to be bolted on as an "experimental" task presentation; a conversational UX fights a task-only model |
| R-02 | Last-write-wins instructions with no history | *"no text merge or historical copy"* — an auditability gap we will not inherit |
| R-03 | A "personal" conversation that is company-visible | visibility must be decided, not inherited from a task container |
| R-04 | Model choice buried in an opaque jsonb, re-declared per adapter | the root of three doc/code drifts we measured |
| R-05 | A generic event→agent rule engine | it needs its own authorization model — real design work, not a config file |
| R-06 | Waking an agent on `@mention` | it would spawn work nobody authorized. (Note: **mentions as *participants* are different — see AH-6**) |
| R-07 | The heavyweight conversation machinery wholesale | generations, outboxes, cancellation fences — earned at scale we do not have |
| R-08 | The native runner as a whole | a Rust process and a cross-language protocol; its own ADR still lists GA proof as outstanding |
| R-09 | A work log with a spec's name | future readers, including agents, trust the wrong document |
| R-10 | A shell script as the hire path | it is why hire/fire is unreachable from the product UI |
| R-11 | A per-employee container roster | it caused the adopted-container incident; container identity should be irrelevant, the agent's *home* is the boundary |
| R-12 | A callback token in model-visible instructions | their own ADR calls it a recovery patch, not the target boundary |
| R-13 | A hard-coded credential-donor profile | "breaks on fresh instances" |
| R-14 | A **claimed** actor identity | their own P0 against "AI drafts; humans approve". Ours is authenticated |

### 3.6 Closed — do not re-raise these

The study's **4 NOT-AN-ISSUE** items. Each was raised, then measured false.

| # | The claim | Measured |
|---|---|---|
| N-01 | "Hermes session resume is broken" | **False** — the capability exists (`POST /api/sessions/{id}/chat`). The break was in **our adapter** |
| N-02 | "Compression drops messages it does not recognise" | **Refuted** — unknown message shapes are preserved |
| N-03 | "A shared Hermes session holds a whole room" | **Impossible** — a stored message has a `role` and no author. One session *per agent* |
| N-04 | "An agent does not pay context for room messages until it needs them" | **True of `session_search`, false of the current session** — once appended, it is in context every turn |

---

## 4. What this adds to the backlog

Twelve items, `AH-1`–`AH-12`, each with the phase it can start in and what it waits for. They are in
[`BACKLOG.md`](BACKLOG.md) as the **agent-half track**.

| Item | Phase | Waits for |
|---|---|---|
| `AH-1` — the agent object (kind, owner, `actsAs`, role, runtime, autonomy) | 1 | `G-01` ✅ done |
| `AH-2` — the responsibility rule on the `A0`–`A5` gates | 2 | `G-04` |
| `AH-8` — MCP governance (precedence, quarantine, argument-bound approval) | 2 | `G-04` |
| `AH-11` — ESTOP wired to our pause | 2 | nothing |
| `AH-5` — the room: a first-class shared space with a speaker-labelled log | 3 | `G-01` ✅ done |
| `AH-6` — mentions/participants | 3 | `AH-5` |
| `AH-12` — the warm-session acceptance test | 3 | `AH-5` |
| `AH-7` — hire/fire as a product operation | 3 | `AH-1` |
| `AH-9` — skills: on-demand loading + derived trust level | 3 | `AH-1` |
| `AH-3` — the durable wake queue | 4 | `S-05` |
| `AH-4` — routines produce work items | 4 | `AH-3` |
| `AH-10` — system agents (backup, cleanup, cron) | 4 | `G-12`, `G-18` |

**The reading of that table.** The agent half is **not** a phase of its own and **not** a parallel
project. It is a track that starts in phase 1 (the agent is a kernel object), gets its enforcement in
phase 2, becomes visible to people in phase 3, and gets its automation in phase 4. **`AH-1` is the
only agent item on the critical path**, because everything else needs to know what an agent *is*.

---

## 5. What is still open

| Item | Status | Note |
|---|---|---|
| Kernel-spec items 2, 26, 27, 28 (identity resolution · Hermes boundary · profile strategy · session bridge) | **OPEN — spec** | This decision **narrows** them; it does not close them. Item 27 in particular now has a shape: the five kinds tell us how many profiles we need and how they are isolated |
| The `B-05` Hermes boundary | **OPEN — owner** | Unchanged by this decision |
| Which gate each action class gets by default | **OPEN — design** | `A1` for anything destructive, `A5` for anything read-only, is the obvious default; the full matrix is design work, not an owner question |
| Whether a *context* agent may hold its own permissions **in addition to** the user it acts as | **OPEN — design** | The owner's answer implies "no, it borrows" — but it should be stated, not assumed |

**Nothing here needs the owner.** Everything above is design work with a sensible default.

---

## 6. Maintaining this file

- **A new lesson from the study goes in §3, with its phase.** If a lesson has no phase, the phase it
  belongs to has not been thought about yet — say so rather than leaving it out.
- **A new agent kind changes §1.1 and §1.4**, and almost certainly adds a row to §4.
- **If this file and the code disagree, the code wins and this file is broken — fix it.**
