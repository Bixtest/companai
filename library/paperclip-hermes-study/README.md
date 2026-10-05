# The Paperclip + Hermes study — agent management, forensically

**What this is.** A batch programme that reads three codebases forensically and turns them into
lessons we can build on: **Paperclip** (upstream, the newest version), **Hermes** (the agent
runtime we intend to use), and **`aissistant-package`** (the sibling project's integration of the
two). The deliverable is documentation — findings we can act on, and a set of lessons for our own
architecture.

**Commissioned by the owner, 2026-10-05**, in these words:

> "analyze paperclip codebase forensically and fully to learn all the lessons about agents
> management, architecture, etc... and document lessons that we can add to our own architecture...
> If hermes will be the ai engine of our platform, then we need to capitalize on all its features...
> We may do it better, it may not be the best there. but it is critical to study paperclip, hermes,
> documentations relevant to their integrations, then inspired by that we develop that part in our
> own architecture that does it even better than each and both combined."

**Written 2026-10-05. Completed 2026-10-05 — all eleven batches.**

> **Status: complete (11 of 11).** Every batch has its findings file; the trackers are
> [`PLAN.md`](PLAN.md) (tickboxes and results) and [`LOG.md`](LOG.md) (one dated line each). **The
> deliverable to read is [`findings/10-lessons-and-target-design.md`](findings/10-lessons-and-target-design.md)**
> — the synthesis. It hands back **exactly one decision** to the owner; everything else is a lesson.

---

## Why this study exists

Our platform is *"an operating system for companies where human and AI employees work side by
side"*. That has two halves. The **governance half** is ours and is built. The **agent half** —
where AI employees get roles, tasks, delegation, triggers and conversations — is not.

Two existing products have already built a large part of that agent half:

| | What it is | Relationship to us |
|---|---|---|
| **Paperclip** | *"The app people use to manage AI agents for work."* An open-source orchestration for **teams of AI agents** — org charts, tasks, heartbeat runs, budgets, approvals, audit logs. *"If OpenClaw is an employee, Paperclip is the company."* | **The closest thing in existence to what we are building.** Read it to learn, not to copy |
| **Hermes** | The **agent runtime** — the execution kernel: the agent loop, tools, memory, skills, sessions, MCP, subagents, cron | **The engine we intend to run inside our platform.** Capitalise on it |
| **`aissistant-package`** | The sibling project's codebase: an older Paperclip **already integrated** with an older Hermes, with Hermes features wired into Paperclip's front end | **A working integration to learn from.** It is not ours and not a precedent |

---

## The rule that governs everything here

> **A document about the sibling project can tell us *what Hermes and Paperclip do* and *what went
> wrong*. It cannot tell us *what our platform should be*.**

Everything carried over is carried as a **lesson with a reason**, never as a **decision already
taken**. This is the rule from [`../ai/README.md`](../ai/README.md), and it exists because the
sibling project is *also called Companai* — its documents are confident, detailed, and about a
different product.

Where a document and the source code disagree, **the code wins.** Every finding here cites the
file it came from.

---

## The three inputs, pinned

| Input | Where it is | Status |
|---|---|---|
| **Paperclip (newest)** | `library/ai/paperclip-master/` — extracted from `paperclip-master.zip`, 9,056 files, 132 MB | ⚠️ gitignored — reference tree, not ours |
| **Hermes (source)** | `library/ai/hermes-agent-main/` | ⚠️ gitignored — the artefact; where it disagrees with docs, it wins |
| **The integration** | `aissistant-package/` — 92,729 files (incl. vendored deps) | ⚠️ NOT OURS — the sibling's codebase |
| **Existing docs** | `library/ai/PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md` (1,474 lines), `library/ai/hermes-docs/` (351 files incl. the **23,842-line `reboot/` dossier**), `library/ai/ai-first/AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md` (4,254 lines) | ⚠️ sibling material — lessons only |
| **The scattered copies** | `library/ai/source-docs/` — the one place the source documents were gathered (Paperclip's 317-file doc set), with a register of where every other set lives | See [`../ai/source-docs/README.md`](../ai/source-docs/README.md) |

**What is already covered, and must not be redone:**

- **Hermes is already forensically analysed** — the 4,254-line study above covers the agent
  kernel, profiles, `state.db`, sessions, memory, skills, context, prompts, tool search, MCP,
  plugins, hooks, security, tenancy, gateway, subagents, bot mode, cross-agent collaboration,
  cron and event triggers. **Batch 07 verifies it; it does not repeat it.**
- **The deployment contract exists** — the SSOT pins the llama-server and Hermes configuration.
- ⚠️ **`library/ai/hermes-docs/reboot/` is a 23,842-line prior analysis programme** — the sibling's
  recovery dossier. It contains **ADR-001** (Paperclip as control plane, Hermes as runtime, with the
  full ownership boundary and an `AiRuntimePort` facade), **`13-HERMES-CAPABILITY-MATRIX.md`**, the
  **Projects/Rooms reconstruction**, three cookbooks, and **`24-HOW-A-ROOM-WORKS.md`** — which
  answers the owner's "new agent into an existing thread" question **with a proven mechanism and a
  re-runnable proof script.** **Batches 07, 08 and 09 read and audit this; they do not reproduce
  it.** It was found late and corrected the same day — see [`findings/00-inventory.md`](findings/00-inventory.md) §2d.

**What is genuinely new, and is the point of this programme:**

- **Upstream Paperclip has no forensic analysis anywhere** — the dossier analyses the sibling's
  **0.3.1 fork delta**, not the newest upstream. This is the gap, and batches 01–06 are the core.
- **The version comparison** — what upstream solves now that the sibling's fork worked around.
- **The synthesis for our own base** — the dossier concludes about **Paperclip + Hermes**; we are
  **Open Mercato + Hermes**.

---

## How the programme runs

Every batch runs the same way — the project's own loop
([`../development/README.md`](../development/README.md)):

1. **Read the source**, not the description of it. Cite file and line.
2. **Write one findings file** per batch into [`findings/`](findings/).
3. **Tick the box in [`PLAN.md`](PLAN.md)**, add a result line, and append one dated line to
   [`LOG.md`](LOG.md).
4. **Separate what we measured from what a document claims.** A document is evidence about the
   *sibling's* product; the code is evidence about *the tool*.
5. **Carry lessons, never decisions.**

**The one rule that matters most**, from the project: *every claim comes with an observation
attached, not an argument.* A finding that says "Paperclip does X" must name the file that shows
it.

---

## The batches

Eleven batches, `00`–`10`. The full list with tickboxes is in [`PLAN.md`](PLAN.md).

| Batch | Subject |
|---|---|
| **00** | Inventory and scope — pin every input, measure what exists, mark what is already covered |
| **01** | Paperclip: what it is and how it is built |
| **02** | Paperclip: agents — definition, personas, harnesses, model choice |
| **03** | Paperclip: tasks and delegation |
| **04** | Paperclip: meetings, channels and multi-agent collaboration |
| **05** | Paperclip: triggers — heartbeats, events, schedules, watchdogs |
| **06** | Paperclip ↔ Hermes: the native gateway and the runner contract |
| **07** | Hermes: capabilities we must capitalise on — **verified against the source** |
| **08** | Bringing a new agent into a thread that already has messages |
| **09** | The `aissistant-package` integration — how it was actually wired |
| **10** | Lessons and target design — what we take, what we reject, what we do better |

---

## What this programme does **not** do

- It does not modify Paperclip, Hermes or `aissistant-package`. All three are read-only reference.
- It does not decide our architecture. It produces the **evidence and the options**; the decisions
  are the owner's and are recorded in [`../development/BACKLOG.md`](../development/BACKLOG.md).
- It does not re-do the Hermes forensic analysis. It verifies and extends it.
