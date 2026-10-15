# Paperclip Study — Batch 01: the platform overview

**Status:** DONE — 2026-10-15 · **Pole tag:** foundational (feeds all poles)
**Source:** the pin in `00-PIN-AND-METHOD.md` (10,447 files; `package.json` md5 `e912c83c715dba5c7c55469d4de899cb`).
**Method:** docs are claims, code is the authority (rule 1); every number measured (rule 2); claims cite
`file:line` (rule 3); poles tagged (rule 9); no comparison to our platform inside batches (rule 5).

---

## §0 — Plain words: what Paperclip is

**Paperclip is the app you use to run a company whose entire staff are AI agents.** You describe a goal,
it hires agents (a CEO first, then a team under them), and each agent wakes on a schedule — a "heartbeat" —
to look at its assigned work and do it. You watch from a dashboard, set budgets, and approve the big
decisions. The company's work is a **tree of tasks**, and every task exists to serve the task above it,
all the way up to the company goal.

The tagline says the whole design stance in one line: **"If OpenClaw is an *employee*, Paperclip is the
*company*."** (`README.md`). OpenClaw-class tools run one agent; Paperclip is the org chart, the budget
book, the task board, and the governance layer around many of them.

**Why it matters to us:** our `aissistant-package` is a **fork of this project** (baseline commit
`4feef987`, rebranded). So this is not a stranger's design — it is the design our own product grew out of.
This batch maps what that design *is*, before the pole batches judge how well each part serves our three
poles.

---

## §1 — What was read (measured)

| Item | Size | Why read |
|---|---:|---|
| `README.md` | 35,791 B | the product stance |
| `doc/PRODUCT.md` | 22,645 B | the canonical core-concept definitions |
| `doc/SPEC.md` | 46,878 B | the draft control-plane specification (13 numbered sections) |
| `DESIGN.md` | 16,155 B | the design-language and UI-system statement |
| `docs/guides/agent-developer/heartbeat-protocol.md` | 128 lines | the agent's own step-by-step contract |
| `doc/SPEC.md` §1–§8 | lines 7–440 | company, agent, org, heartbeat, comms, cost, bootstrap, deployment |

**Two doc roots exist** (batch 00 §2.1): `doc/` (375 files / 7.56 MB, engineering-facing) and `docs/`
(78 files / 532 KB, public site). The core model lives in `doc/PRODUCT.md` + `doc/SPEC.md`.

---

## §2 — The core model, verified

### 2.1 The four first-class objects

| Object | What it is | Evidence |
|---|---|---|
| **Company** | The top container. One Paperclip instance runs **multiple companies**. A company has **no standalone goal field** — its direction is its set of **Initiatives**. | `doc/SPEC.md:7–12` |
| **Agent** | Every employee is an agent. Has identity, org position, an **adapter type + adapter-specific config blob**, status, and cost data. | `doc/SPEC.md:92–100`, `doc/PRODUCT.md:19–23` |
| **Task (issue)** | Hierarchical work. `Initiative → Projects → Milestones → Issues → Sub-issues`. Every task traces to a parent up to the company goal. | `doc/SPEC.md:352–355`, `doc/PRODUCT.md:53–59` |
| **Board** | The human oversight layer. V1 is a **single human operator** with unrestricted access. | `doc/SPEC.md:22–34` |

**Doc-vs-code note (measured):** `doc/SPEC.md` is explicitly a **living DRAFT** ("Living document — updated
incrementally during spec interviews", `doc/SPEC.md:3`) with many `[DRAFT]` and `TBD` markers and open
questions. **So the SPEC is a design intent, not a description of the shipped code.** Where later batches
need ground truth, they read the code — exactly the Hermes discipline. This is the single most important
caveat in the whole study: **Paperclip's own spec is ahead of, and looser than, its implementation.**

### 2.2 The task tree and the "why" chain

The defining property (`doc/PRODUCT.md:53–59`): *"At any moment, every piece of work must trace back to the
company's top-level goal through a chain of parent tasks… This is what keeps autonomous agents aligned —
they can always answer 'why am I doing this?'"*

**Plain gloss:** work is not a flat to-do list; it is a **justification tree**. An agent can always walk up
from "I am writing ad copy" to "…because we need 100 more signups … because we need $2k this week … because
the goal is $1M MRR." This is the mechanism that keeps many autonomous agents pulling in one direction.

### 2.3 The heartbeat — the thing that makes agents *run*

**The heartbeat is a protocol, not a runtime** (`doc/SPEC.md:234–237`). Paperclip decides **when** to wake
an agent, **how** to invoke it (which adapter), and **what context** to hand it (thin ping vs fat payload).
It deliberately does **not** control how long the agent runs or what it does — *"that is entirely up to the
agent"*. The full contract is three adapter methods (`doc/SPEC.md:262–268`):

```
invoke(agentConfig, context?) → void     // start the agent's cycle
status(agentConfig) → AgentStatus        // running? finished? errored?
cancel(agentConfig) → void               // graceful stop (for pause/resume)
```

**The agent's own side of the contract** is a 9-step procedure (`docs/guides/agent-developer/
heartbeat-protocol.md`): identity → approval follow-up → get assignments → pick work → **checkout** →
understand context → do the work → update status → delegate. The load-bearing rules: *"Always checkout
before working"*, *"Never retry a 409"* (the task belongs to someone else), *"Never cancel cross-team
tasks — reassign to your manager"*, and *"Use child issues instead of polling"*.

**Plain gloss:** the heartbeat is a **wake-up slip**. Paperclip knocks; the agent reads its inbox, *claims*
a task so two agents never fight over it (the checkout/409 rule is a locking protocol), does the work,
writes down what it did, and hands back a clear next action before going quiet again.

### 2.4 Three ways an agent can run, and the adapter boundary

`doc/PRODUCT.md:42–51` names four execution styles, and the shipped adapters match (`packages/adapters/`
measured):

| Adapter dir | What it runs |
|---|---|
| `claude-local`, `codex-local`, `gemini-local`, `grok-local`, `kimi-local`, `opencode-local`, `pi-local`, `cursor-local`, `cursor-cloud` | local/cloud **coding-agent** runtimes |
| `openclaw-gateway` | an OpenClaw agent via its gateway |
| **`hermes`**, **`hermes-gateway`** | **a Hermes agent** — directly relevant to us, since Hermes is our chosen engine |
| generic `process` / `http` | `server/src/adapters/process`, `server/src/adapters/http` |

**The adapter boundary is the platform's central design commitment** (`doc/PRODUCT.md:51`): *"the adapter is
still the boundary: if a runtime can be invoked, observed, and authorized, Paperclip can coordinate it."*
And critically (`doc/SPEC.md:110–112`): **"Concepts like SOUL.md and HEARTBEAT.md are *not part of the
Paperclip protocol*. They are adapter-specific configurations."**

**Cross-study note (Hermes b13 §3.1):** Hermes *does* ship `SOUL.md` as a first-class base persona. Paperclip
deliberately pushes that concept down into the adapter. So the two platforms drew the "who is this agent"
line in **opposite places** — Hermes centralises persona, Paperclip externalises it. This is a real
architectural fork in the road and belongs in the mapping step, not here.

### 2.5 Minimum contract and integration levels

A useful, unusually honest piece of design (`doc/SPEC.md:150–172`): the **minimum** to be a Paperclip agent
is **"be callable"** — no requirement to report back at all. Above that, three levels:

1. **Callable** (minimum) — Paperclip can start you.
2. **Status reporting** — you report success/failure/in-progress.
3. **Fully instrumented** — status + cost + task updates + logs, bidirectional.

**Plain gloss:** Paperclip will coordinate a "dumb" agent that just runs a command and says nothing — it
infers liveness from whether the process is alive. Richer agents get richer integration. **This is a
deliberately low floor**, which is what lets it sit in front of a dozen different runtimes.

### 2.6 Communication happens *through the task system* — there is no chat bus

`doc/SPEC.md:307–330`: *"All agent communication flows through the task system… There is no separate
messaging or chat system. Tasks are the communication channel."* Delegation = create + assign a task;
coordination = comment on a task; status = update task fields. An agent's "inbox" is *tasks assigned to me +
comments on tasks I'm in*.

**Important nuance (same section, measured):** there **is** an **experimental** Agent Chat, flagged
`enableAgentChat` **disabled by default** — and it too is secretly a task ("one persistent task per person
and agent"). So the rule "tasks are the only channel" is *true at the protocol level* and *softened by an
experimental UI layer that is still tasks underneath*. This is the kind of claim that needs the caveat
attached, and the caveat is in the source on the same page.

### 2.7 Cost and budgets are first-class

`doc/SPEC.md:356–390`: costs tracked **per agent / per task / per project / per company**, in **tokens and
dollars**, with **billing codes** on tasks so that when Agent A asks Agent B to do work, **B's cost rolls up
to A's request**. Three budget tiers: **visibility → soft alerts → hard ceiling** (hit the ceiling, the
agent auto-pauses, board is notified and can override).

**Plain gloss:** the money is modelled the way a real company models it — every unit of work has a price,
and the price travels up the org chart to whoever asked for the work.

### 2.8 Bootstrap: how a company goes from empty to running

`doc/SPEC.md:391–410` — a 6-step sequence: create company + initiatives → define top-level tasks → create
the **CEO agent** (from a default template) → CEO's **first heartbeat proposes a strategic breakdown** →
**the Board approves that plan** → the CEO executes (creates tasks, proposes hires, delegates). Hires are
**Board-gated** (`doc/SPEC.md:26–34`).

**Plain gloss:** you don't hand-build the org. You state the goal, create one CEO, and the company **grows
itself under human approval** — the human approves the hiring plan and the strategy, not every task.

---

## §3 — Deployment model (measured, and directly relevant to us)

`doc/SPEC.md:433–437`: **"Single-tenant, self-hostable. Not a SaaS. One instance = one operator's
companies."** This is the same shape as Hermes (single-operator), and it is exactly the constraint our
product must break — we are building multi-tenant. **It is recorded here as a fact about Paperclip, not as
a comparison**; the mapping step handles the implication.

`packages/db/src/migrations/` is a large numbered SQL migration set (measured: migrations numbered into the
`0200s`+, e.g. `0235_heartbeat_run_event_sequence_uniqueness.sql`) — so the platform carries its data model
forward through **numbered migrations**, the same mechanism as Hermes. **The retirement rule (batch 00
rule 10) applies to Paperclip too** and will be run before any later batch reuses a setting from an older
Paperclip doc.

---

## §4 — Divergences found in this batch

| # | Claim (where) | Reality (measured) | Verdict |
|---|---|---|---|
| **D1** | `doc/SPEC.md` reads as a specification | It is a **living DRAFT** with `[DRAFT]`/`TBD`/open-questions throughout (`SPEC.md:3`) and describes V1 as MVP in places the tree has clearly moved past | **NOT a divergence of fact — a divergence of *genre*.** The SPEC is intent, not description. Recorded so no later batch treats it as ground truth. |
| **D2** | "There is no separate messaging or chat system" (`SPEC.md:329`) | An experimental **Agent Chat** exists, disabled by default, built on a hidden per-agent task | **TRUE at protocol level, softened by an experimental layer.** The source itself carries the caveat on the same page — no deception, but the headline claim alone would mislead. |

**No hard factual divergences found yet** (this batch read mostly intent documents). The first code-authority
divergence checks begin in the pole batches, where specific numbers are claimed.

---

## §5 — Carried forward

| ID | Carry | To |
|---|---|---|
| **C1-1** | The task **justification tree** (every task → parent → … → initiative) is the alignment mechanism. | P2, P3 |
| **C1-2** | The **heartbeat is a protocol** (invoke/status/cancel) with a deliberately **low floor** ("be callable"). | P1, P3 |
| **C1-3** | The **adapter boundary**: persona/SOUL/HEARTBEAT is *adapter-specific, not protocol* — the opposite split to Hermes. | P1 |
| **C1-4** | **Checkout / 409** is a task-locking protocol preventing two agents fighting over one task. | P3 |
| **C1-5** | **No chat bus**; tasks + comments are the only protocol channel (with an experimental chat that is still a task). | P2, P3 |
| **C1-6** | **Cost per agent/task/project/company + billing codes** that roll child cost up to the requestor. | P3 |
| **C1-7** | **Board = single human operator, unrestricted**, V1; hires and strategy are Board-gated. | P2, P3 |
| **C1-8** | **Bootstrap**: goal → CEO → first heartbeat proposes the org → human approves → company grows itself. | P1, P3 |
| **C1-9** | **Exportable org config** (template vs snapshot) — a company is a portable artefact. | P2, PZ |
| **C1-10** | **Single-tenant self-host** is the shipped model; **numbered DB migrations** carry the schema (retirement rule applies). | all |

---

## §6 — Value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a real user use case?**
It gives a person a **control room for a team of AI workers**: one goal in, an org that builds itself under
approval, a task board where all work is visible and justified, a wallet with per-worker spend, and a big
red button (the Board) that can pause anyone. The user's job shifts from *doing the work* to *setting
direction and approving plan*s.

**Q2 — how does this serve an AI-first business & resources planner?**
Three of its mechanisms are load-bearing for that vision and recur across the poles: (1) the **justification
tree**, because a planner must always be able to answer "why is the company spending on this?"; (2) **cost
with billing-code roll-up**, because a resources planner *is* a cost-attribution engine; and (3) the
**heartbeat-with-a-low-floor**, because versatility ("coordinate any runtime that can be invoked") is exactly
what a platform that must integrate many engines needs. The single-tenant model (§3) is the one part that
does **not** fit the vision as-is — and that is precisely why the owner's plan ends with *"later we fix the
hermes-per-tenant issue."*

---

*Batch 01 of 07 complete. Divergences: 2 (both genre/caveat, not fact). Carried: C1-1…C1-10.
Next: `02-the-aissistant.md` (P1).*
