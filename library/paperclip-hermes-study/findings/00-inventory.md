# 00 — Inventory and scope

**Batch 00 of the Paperclip + Hermes study. Written 2026-10-05.**
**Deliverable of this batch:** pin every input, measure what exists, and mark what is already
covered so later batches do not repeat it.

Every number below was measured this session, not recalled.

> ⚠️ **Corrected 2026-10-05, same day, after a first pass missed it.** The first version of this
> file said the study's only gap was Paperclip. **That was wrong.** It missed
> **`library/ai/hermes-docs/reboot/` — a 23,842-line prior analysis programme** that already covers
> the sibling's Paperclip↔Hermes integration, the Hermes capability matrix, the architecture
> decision, and the room/thread mechanism the owner asked about. Sections **2d**, **3** and **4f**
> were added or rewritten to fix it. The correction is recorded rather than silently applied,
> because a study that hides its own first-pass error is not trustworthy.

---

## 1. The four inputs, pinned

| # | Input | Path | Measured | Tracked in git? |
|---|---|---|---|---|
| 1 | **Paperclip — newest** | `library/ai/paperclip-master/` | **8,299 files, 667 of them markdown**; 132 MB extracted | ❌ **gitignored** (added this session) — reference tree, not ours |
| 2 | **Paperclip — the zip** | `paperclip-master.zip` | 45,058,177 bytes (45 MB); the zip lists 9,056 entries | ❌ gitignored |
| 3 | **Hermes — the runtime source** | `library/ai/hermes-agent-main/` | git tracks **0** files in it | ❌ gitignored — the artefact |
| 4 | **The integration** | `aissistant-package/` | **92,729 files** total, of which **1,510 are `node_modules` directories** | ❌ **NOT OURS** — the sibling's codebase |

**Note on the two file counts for Paperclip.** The zip lists 9,056 entries; 8,299 files landed on
disk. The difference is directory entries and the symlinks that failed to extract (`unzip` reported
`symlink error: File exists`). **The count to use is 8,299.** Anyone quoting 9,056 is quoting the
archive, not the tree.

---

## 2. What is already covered — and must **not** be redone

This is the most important finding of the batch. **A large part of what the owner asked for already
exists**, and re-doing it would waste the programme.

### 2a. Hermes is already forensically analysed

`library/ai/ai-first/AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md` —
**4,254 lines**, 60+ numbered sections. Its own table of contents shows it already covers, section
by section:

| Already analysed | Sections |
|---|---|
| The agent execution kernel | §3 `AIAgent` |
| Runtime identity / profiles | §4 |
| State, sessions, search | §5, §6 |
| Memory — built-in and external, and write governance | §7, §8, §9 |
| Skills — definition, generation, agent-created | §10, §11, §12 |
| Context files, context engine, prompt assembly and caching | §13–§15 |
| Tool search and the tool surface | §16, §17 |
| **MCP — the interface, and the authorization rule** | §18, §19 |
| Plugins, plugin trust, hooks | §20, §21, §22 |
| Security, tenancy below the LLM, gateway | §23, §24, §25 |
| Programmatic integration | §26 |
| **Subagents** and Task Contracts | §27 |
| **Bot mode**, cross-agent collaboration | §28, §29 |
| **Cron** and event-triggered automation | §30, §31 |
| Documents, credentials, trajectories | §32–§36 |
| The three-kernel architecture, the Business Model Kernel | §37 onward |

**Therefore batch 07 does not write this study again.** It **audits** it: for each named capability
it checks the source and marks the claim *verified / contradicted / not-checked*. That is a
different and more useful deliverable than a second summary.

### 2b. The deployment contract already exists

`library/ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` — **1,474 lines**. It pins the model
(`Qwen3.5-9B Q4_K_M`), the llama-server flags, the Docker network model, the Hermes profile
architecture, and — at §15 — the **"Paperclip integration contract"**:

```text
Base URL:   http://hermes:8642/v1
Auth:       Authorization: Bearer <HERMES_API_SERVER_KEY>
Model ID:   paperclip-hermes
```

with the note that *"Paperclip integrates with Hermes, not llama-server"* and the concurrency
distinction: many logical agents, **one** local generation at a time.

### 2c. The sibling's own documentation set exists

`library/ai/hermes-docs/` — **351 files** in four trees (`docs/`, `docs-more/`, `documentation/`,
`reboot/`). This is the sibling project's documentation of *their* product. Per the governing rule
it is evidence about *Hermes* and about *what went wrong*, never about what we should build.

### 2d. ⚠️ **`reboot/` is a complete prior analysis programme — 23,842 lines. Do not redo it.**

**This was missed in the first pass of this batch and corrected the same day.** It is the single
most important entry in this inventory.

`library/ai/hermes-docs/reboot/` is a **recovery dossier for the sibling product** — "the recovery
control room for Companai, the product being rebuilt from the Aissistant proof of concept". It is
**23,842 lines** across a numbered series, a `work/` task tree, and three cookbooks:

| File | Lines | What it is |
|---|---|---|
| `reboot.md` | 4,952 | the master narrative |
| `15-ENGINEERING-COOKBOOK.md` | 1,941 | the dependency-ordered execution authority |
| `cookbook_light.md` | 1,638 | the single tickbox list, 54 tasks in 10 stages |
| `hermes_integration_cookbook.md` | 666 | the integration cookbook |
| `14-PROJECTS-AND-ROOMS-RECONSTRUCTION.md` | 640 | Projects/Rooms domain, UX, migration, acceptance |
| `11-DEVELOPMENT-RULES.md` | 493 | the binding rules |
| `HERMES-SORTED-INTO-FOUR.md` | 446 | Hermes sorted into four piles |
| `12-ARCHITECTURE-DECISION-COMPANAI.md` | 320 | **ADR-001** |
| `13-HERMES-CAPABILITY-MATRIX.md` | 291 | **the capability matrix** |
| `10-VALIDATION.md` | 273 | tests actually executed |
| `CONTESTED-HERMES-VS-COMPANAI.md` | 247 | the contested decisions |
| `MAP-HERMES-2026-08-15.md` | 236 | the Hermes map |
| `RESEARCH-WHAT-MAKES-AN-AGENT-POWERFUL.md` | 229 | agent power research |
| `24-HOW-A-ROOM-WORKS.md` | 227 | **the room rule — proven** |
| `22-AGENT-SESSION-ROOM-MODEL.md` | 186 | what an agent and a session are, measured |
| `work/` | ~4,000 | ADR-002/003/004, batches B1–B10, INV/KON/REC/X task records |

**It already answers several of the owner's questions.** Specifically:

- **`12-ARCHITECTURE-DECISION-COMPANAI.md` (ADR-001, accepted by the founder 2026-08-12)** — the
  whole ownership boundary: what the control plane owns, what the runtime owns, an `AiRuntimePort`
  facade of six narrow versioned ports, a signed `ExecutionEnvelope` with **`runId` / `transcriptId`
  / `memoryScopeId` / `roomId` kept deliberately distinct**, the skills pipeline, the plugins
  architecture, and the schedules rule (*"Companai Automations is the schedule authority. Hermes cron
  may be an execution backend, never a second authority"*).
- **`13-HERMES-CAPABILITY-MATRIX.md`** — "the safe product disposition for every inventoried Hermes
  surface", in six categories (execution/conversation; tools/execution environments; skills/learning;
  plugins, MCP, runtime extensions; automation, hooks, channels; models, identity, memory,
  administration), plus a required user-facing navigation list and a feature-admission checklist.
- **`24-HOW-A-ROOM-WORKS.md`** — **the owner's "new agent into a thread" question, answered and
  proven.** See §4f below.
- **`22-AGENT-SESSION-ROOM-MODEL.md`** — what Hermes actually knows across sessions, including
  *"Can two agents share one Hermes session?"* (answer: no).
- **`23-ROOM-MEMORY-ANALYSIS.md`** — why memory was the wrong container.
- **`work/INV-03-SURFACING-HERMES-IN-THE-UI.md`** — the owner's *"wires Hermes functionalities and
  full front end settings and features into Paperclip frontend"* question.
- **`work/ADR-002-AGENT-RUNTIME.md`** (307 lines) — the accepted Hermes-runtime architecture.

**Consequence — the programme is re-scoped, not merely re-ordered.** Batches 07, 08 and 09 become
**read-and-audit** batches: state what the dossier already establishes, mark what it proved against
what it only claims, and only then look for the gap. **Re-doing this work would be the exact waste
the project's rules forbid.**

---

## 3. What is genuinely new — the point of this programme

**Corrected the same day: the new surface is much smaller than the first pass of this batch
assumed.** Three of the eleven batches were planned as original work and are in fact already done,
by the sibling, at depth.

**Genuinely new — no equivalent exists:**

1. **Upstream Paperclip, forensically.** The dossier analyses the sibling's **host fork delta** of
   Paperclip **0.3.1** (`reboot.md` §scope; ADR-001 evidence list cites `host/packages/adapters/...`).
   **Nobody has analysed upstream Paperclip itself**, and the copy here is the **newest** version,
   not 0.3.1. Batches 01–06 close this gap, and they are the core of the programme.
2. **The comparison across versions.** What upstream Paperclip does now, versus what the sibling's
   0.3.1 fork did — and therefore which of the sibling's workarounds upstream has since solved.
3. **The synthesis for *our* base.** The dossier's conclusions are about **Paperclip + Hermes**. Our
   platform is **Open Mercato + Hermes**. What carries over, and what does not, is unexamined.

**Not new — audit only:**

| Was planned as | Is actually |
|---|---|
| Batch 07 — Hermes capabilities | Already: `13-HERMES-CAPABILITY-MATRIX.md` **and** the 4,254-line forensic study. **Audit both.** |
| Batch 08 — new agent into an existing thread | Already: `24-HOW-A-ROOM-WORKS.md`, proven, with a re-runnable script. **Audit, and check the two unproven items.** |
| Batch 09 — the `aissistant-package` integration | Already: the whole `reboot/` dossier. **Audit, and add only what the dossier does not cover.** |

Three secondary gaps remain, unchanged:

1. **The integration mechanics at code level** — the dossier states the contract and cites the
   files; nothing yet reads those files end to end.
2. **Bringing a new agent into a thread that already has messages** — *the rule is proven; the two
   things it says are unproven are not.* (See §4f.)
3. **The synthesis.** What we take, what we reject, and how we do it better on our own base.

---

## 4. What the reconnaissance already told us

Five findings from the sweep, each with its evidence. These frame every later batch.

### 4a. Paperclip is *"the company"* to Hermes's *"employee"*

From `paperclip-master/README.md`:

> *"Paperclip is the app people use to manage AI agents for work."*
> *"Open-source orchestration for teams of AI agents."*
> *"**If OpenClaw is an _employee_, Paperclip is the _company_.**"*
> *"a Node.js server and React UI that orchestrates a team of AI agents to run a business. Bring
> your own agents, assign goals, and track work and costs from one dashboard."*

From `paperclip-master/DESIGN.md`:

> *"Paperclip is an operational control plane: **org charts, tasks, heartbeat runs, budgets,
> approvals, audit logs.**"*

**This is the closest product in existence to the agent half of what we are building.** It is a
control plane for AI staff. Our platform is a governance layer for human *and* AI staff. The overlap
is large, and the difference — the governance layer, and the human/AI parity — is ours.

### 4b. Paperclip integrates Hermes **natively** — upstream, not the sibling's invention

`paperclip-master/doc/` contains:

- `HERMES_GATEWAY_ONBOARDING.md`
- `HERMES_GATEWAY_SMOKE.md`

**Consequence for the study:** the sibling project did not invent Paperclip↔Hermes integration.
Upstream Paperclip already has a Hermes gateway. So batch 06 must read **upstream's** gateway first,
and batch 09 then asks what the sibling *changed*.

### 4c. The sibling's concept for a shared thread is a **"room"**

`aissistant-package/documentation/00-start-here/` contains `04-agent-session-and-room.md` and
`05-how-a-room-works.md`, and `06-hermes-integration-cookbook.md`.

So the sibling's model has **agents, sessions and rooms** — and "room" appears to be the shared
conversation an agent is brought into. **This is the vocabulary of the owner's "meeting" question**
and of batch 08. Batch 08 reads these three files first.

### 4d. `aissistant-package` is a vendored copy plus a thin integration layer

The file counts are dominated by vendored code, not by the integration:

| Part | Files | What it is |
|---|---|---|
| `host/` | **76,216** | almost all `node_modules` — the built application |
| `hermes/` | 8,965 | a **vendored copy of Hermes** (same tree as `hermes-agent-main`: `agent/`, `cron/`, `acp_adapter/`, …) |
| `data/` | 6,376 | runtime data |
| `docs/` + `documentation/` | 244 | **the sibling's own documentation** |
| `ops/` | 114 | operations scripts |
| `reboot/` | 88 | a planning/work tree |
| `templates/` | 40 | templates |
| `plugins/` + `connectors/` | 38 | the integration's own extension points |

And exactly **three** compose files: `docker-compose.yml`, plus `docker-compose.companai-override.yml`
and `docker-compose.corporate-override.yml`.

**Consequence:** the integration is **small and findable** — the overrides, the plugins, the
connectors, and the 244 documentation files. That is where batch 09 should read, not the 76,216
files under `host/`.

### 4e. Hermes ships a `cron/` directory and a `plugins/` tree

`hermes-agent-main/` has `cron/`, `plugins/`, `providers/`, `tools/`, `skills/`, `web/`,
`acp_adapter/`, `tui_gateway/`, `optional-mcps/`, `optional-skills/`.

**Consequence:** the owner's "recurring work, like a cron job" and "triggered by events" are
**first-class in Hermes**, not something we must invent. Batch 07 verifies the mechanism; batch 05
checks how Paperclip drives it.

### 4f. The owner's "new agent into a thread" question is **already answered and proven**

`library/ai/hermes-docs/reboot/24-HOW-A-ROOM-WORKS.md` — the sibling's *single source* for how a
shared room works, written after the founder caught five documents describing the behaviour five
ways. It is short, and it is the most directly useful document in the whole dossier.

**The rule, in the founder's words (2026-08-15):**

> *"We write in the paperclip rooms different messages by different members, human and ai, and even
> if it is not related to an ai agent there, it still post into its folder in hermes and store. Only
> when the agent is addressed directly that he responds, based on the context of the full messaging
> posted from the room, his and others."*

**The mechanism, and it is a supported Hermes API, not a hack:**

| Step | Call |
|---|---|
| Write room messages into an agent's session | `SessionDB.append_messages_batch(session_id, messages)` |
| Read back the way Hermes restores for live replay | `SessionDB.get_messages_as_conversation(session_id, repair_alternation=True)` |

Both live in `hermes/hermes_state.py`; the store is `state.db` in the agent's home; the re-runnable
proof is `ops/verify-room-into-session.py`. **Proven 2026-08-15**: 5 messages appended, four of them
never addressed to that agent, and **all four arrived in its working conversation.**

**Three findings that change how we would build it:**

1. **A room is *not* one shared Hermes session — it is impossible.** A stored message has a `role`
   and **no author field**. So a room is *one session per agent*, each holding the whole room, with
   **Companai owning the canonical shared record** and Hermes holding private per-agent views.
2. **Seeding a new agent uses `chunk_rows`, never a per-row loop.** Hermes calls it a *"branch
   seed"*, notes seeds *"can be thousands of rows"*, and measures *"10k rows ≈ 2.4s inside one BEGIN
   IMMEDIATE … which would monopolize the write lock and starve concurrent writers."*
3. **Every room message must carry its own speaker label.** Hermes **merges consecutive same-role
   messages into one block** (measured: with `repair_alternation=True`, 6 messages → 1 turn of 18,694
   chars). The merge erases the boundaries; **the label is what survives it.** Without a label the
   agent reads five statements and cannot tell who said what.

**And the cost, stated honestly:** the founder believed an agent "doesn't pay context for messages
until it needs them". That is true of `session_search` but **not of the current session** — restoring
a session loads *every* active message with no limit (`acp_adapter/session.py:544`). So once a room
message is appended to an agent's live session it is **in context on every turn**. Ten agents in a
room means ten copies of every message. It is self-limiting (Hermes compresses automatically) but not
free.

**Two things the dossier explicitly says are NOT proven** — these are exactly where batch 08's new
work lies:

1. **The warm process.** The proof wrote to the database and read it back through the restore path.
   *"If Hermes is already holding that session in memory, a write underneath it may not be seen until
   it reloads."* The dossier calls this *"the single most important thing left to test."*
2. **Long rooms and compression.** *"Which parts it drops first, and whether an appended block is
   treated differently from a normally-grown one, is unknown."*

**Plus one open design item:** the room session key currently includes a fingerprint of the model,
container, tools and profile version — so **changing an agent's model silently ends its room
conversations.** The key must be on the room, not on the configuration.

**Consequence for this study:** batch 08 does not discover the mechanism. It **audits** the proof,
reads `hermes_state.py` and `acp_adapter/session.py` to confirm the two calls and the no-limit
restore, and states clearly that the two unproven items remain unproven.

---

## 5. The three questions this study must answer

Every batch serves one of these. If a batch is not serving one of them, it is out of scope.

**Q1 — How does a system give an AI worker a role, a task, and a way to be woken?**
Paperclip's model of agents, tasks, delegation, heartbeats and triggers. *(Batches 01–05.)*

**Q2 — How do the two halves talk to each other, and how does an agent join a conversation
already in progress?**
The Paperclip↔Hermes gateway, the runner contract, the "room", and joining an existing thread.
*(Batches 06, 08, 09.)*

**Q3 — What do we take, what do we reject, and how do we do it better?**
The verified Hermes capabilities and the synthesis. *(Batches 07, 10.)*

---

## 6. Method, and its limits — stated plainly

**Method.** Read the source; cite the file. Separate the three voices (source code / sibling
documents / our inference). Measure rather than recall. Where a document and the code disagree, the
code wins.

**Limits, honestly:**

- **Paperclip here is a snapshot, not a running system.** The analysis is of the code and its own
  docs. Nothing in this study was *executed*. Where a finding depends on runtime behaviour, the
  finding says so and is marked **not verified by execution**.
- **`aissistant-package` is read as the sibling's artefact.** It is not ours, it is not a precedent,
  and its decisions are not our decisions.
- **The Hermes forensic study is a document, not the code.** Batch 07 exists precisely because a
  document is not proof. Until it is audited, its claims are claims.
- **Versions differ.** Paperclip here is the *newest*; the sibling's Paperclip is *older*. Where
  they differ, both are noted rather than averaged.

---

## 7. What this batch establishes

1. **The inputs are pinned and measured** — 8,299 Paperclip files, 92,729 sibling files (1,510
   `node_modules`), 351 sibling doc files, two existing long-form studies.
2. **A third body of prior work exists and is large** — `hermes-docs/reboot/`, **23,842 lines**,
   including ADR-001, the Hermes capability matrix, the Projects/Rooms reconstruction and three
   cookbooks. **It already covers much of what this programme was going to produce.**
3. **Hermes is already analysed twice** — batch 07 audits, it does not repeat.
4. **Paperclip *upstream* is the real gap** — the dossier analyses the sibling's 0.3.1 fork delta;
   nobody has analysed the newest upstream Paperclip. Batches 01–06 are therefore the core.
5. **The integration is upstream-supported** — Paperclip ships its own Hermes gateway.
6. **The room mechanism is already solved and proven** — `append_messages_batch` + speaker labels +
   `chunk_rows`, with a re-runnable proof. Batch 08 audits it and tests the two unproven items.
7. **The three questions are fixed** — Q1 role/task/waking, Q2 the contract and joining a thread,
   Q3 the synthesis.

**Next:** batch 01 — Paperclip: what it is and how it is built.
