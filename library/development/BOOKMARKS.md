# Bookmarks — the pages to open first

**What this page is.** One page that names the handful of documents that actually matter, in the
order that makes sense, so nobody has to guess which of several hundred files to open first. It
**points at** documents; it does not copy them. If a document here is stale, fix the document.

**Who it is for.** Two readers. A **new agent** taking over the build, who needs what we are
doing, what is done and what is left. And **the owner**, coming back after time
away, who needs the end game and the current state in a few minutes.

**One thing this page does not carry, on purpose: what is next.** A task changes every session, so
the single place that says what is being worked on **now** is the **`★ ACTIVE TASK` box at the top of
[`../../JOURNAL.md`](../../JOURNAL.md)** (owner's instruction, 2026-10-06).

**Written 2026-10-05. Refreshed 2026-10-08** — the handover and start prompt were updated for an agent
taking over as though it had been here since day one (see [`HANDOVER.md`](HANDOVER.md) revision 11).
Owner: Ramzi.

---

## 1. If you have five minutes

Read these ten, in this order. They tell you what the product is, how the work is done, and
where it stands — and how we got here.

| # | Read | Why |
|---|---|---|
| 1 | [`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) | **The product in plain English** — the idea, the decisive loop, what it is *not*, and which library documents are ours vs imported. **Start here** |
| 2 | [`../../INDEX.md`](../../INDEX.md) | The map of every folder, in one page |
| 3 | [`HANDOVER.md`](HANDOVER.md) | The handover: what exists, where, the traps nobody can discover, and what is proven vs not |
| 4 | [`JOURNEY.md`](JOURNEY.md) | **The journey told forward** — Act 0 to today: the idea, what has been built and proven phase by phase, and the through-lines. Read this to understand the *why* behind the decisions, as if you had been here since day one |
| 5 | [`BACKLOG.md`](BACKLOG.md) | **What is left**, in order, one line each. The one roadmap |
| 6 | [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) | **How the work is done** — read before touching code |
| 7 | [`WORKING-RULES.md`](WORKING-RULES.md) | **The owner's standing rules in one page** — including **rule 10**, the task-package workflow every task now follows |
| 8 | [`STATE-OF-PLAY-2026-10-07.md`](STATE-OF-PLAY-2026-10-07.md) | **Where the project really is, and what is next** — a whole-project snapshot, every figure measured two ways. **Dated (2026-10-07), so re-measure** |
| 9 | [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) | **Every partial build** — its gap, the prerequisite that must land, and the callback to run when it does (**rule 8**). Read before assuming "done" means done |
| 10 | [`RESUME-POINT.md`](RESUME-POINT.md) | **Where the last session stopped**, and the honest open list — a parking space, not a roadmap |

**Handing the work to an agent?** Paste [`START-PROMPT.md`](START-PROMPT.md). It is the first
message for a fresh session: what to read and the rules it may not break. For **what to do now**,
it sends the agent to the `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md).

---

## 2. The end game — what this project is meant to become

These are the vision and direction documents. Read them to understand *why* the build is shaped
the way it is.

| Document | What it gives you |
|---|---|
| [`../ai/ai-first/`](../ai/ai-first/) | **THE DIRECTION.** Nine documents, the fullest statement of what we will actually build. **Read its [`README.md`](../ai/ai-first/README.md) first** — the filename numbers and the README's document numbers are offset by one, which is a real citation hazard |
| [`../../compai/planning/00-product-thesis.md`](../../compai/planning/00-product-thesis.md) | **What we are building**, in plain English, and the **15 rules that must never be broken** |
| [`../analysis/findings/01-vision-frame.md`](../analysis/findings/01-vision-frame.md) | The vision framed against our own design: where they agree, where they differ, and what is deliberately left undecided |
| [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md) | **The three things a prompt can become** — the owner's core features_pack: a **one-time answer**, a **model proposal** (new structure — a field, an entity, a whole new service like LMS/CRM), or a **saved Function**. The **triage** that decides which, the **gate** that stops the AI reshaping the database on its own (G-21), and the §46 bar for "flawless". **Nothing in it is open** |
| [`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md) | **THE DEVELOPMENT PLAN.** The deliverable the whole analysis exists for: four phases, the critical path, the first three things to build, and every decision that is the owner's |
| [`../paperclip-hermes-study/findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md) | **THE SYNTHESIS** for the agent half: what we take from Paperclip and Hermes, what we reject, and how we do it better |
| [`../../workspace/knowledge/authority-overview.md`](../../workspace/knowledge/authority-overview.md) | **The governance layer, end to end** — the floor the product stands on. The product itself is the business model being compiled into working software (see [`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md)) |

**One warning before you read any AI document:** **two different products are called Companai.**
Read [`../ai/README.md`](../ai/README.md) first, or you will mix them up.

---

## 3. The design of the two integrations

The product is three pieces: the **Starting Kit** (bought), **Hermes** (borrowed), and the
**model server** (llama.cpp). These two documents settle how the two borrowed pieces attach.

| Document | What it decides |
|---|---|
| [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) | **How Hermes attaches** — platform to platform, function to function, and multi-tenant. **The owner decided the runtime boundary (B-05) on 2026-10-05:** one product, one repository, one deployment, one interface (ours), with Hermes as a supervised private runtime process behind the internal port; Hermes is headless. §11 has the reasoning and the two hostile passes |
| [`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md) | **The map, per development item** — for every AI-touching piece, how Hermes *serves* or is *served* (as an agent, or as a setting), where **Llama** sits, and the measured status. **Written so a new developer can execute without a learning curve** — the multi-tenant challenge, multi-agents, integrations and MCP, each answered |
| [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) | **How models attach.** llama.cpp is one preset entry, not a project, because the platform already owns a model control plane. It root-causes two defects (the missing `--jinja`, and B-16) and records the **owner's decision on the long-term default** (§9): per-tenant policy as the destination, cloud-first as the interim |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How all three pieces run together, and the dockerisation decision (Sprint 0) |
| [`AGENT-HALF.md`](AGENT-HALF.md) | **The agent half** — the five kinds of agent, the rule that decides who is answerable when one acts, and where every lesson of the study lands |
| [`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md) | **The product specification** (Draft 2). It passes the vision's own 40-item gate; only the owner's ratification remains |

---

## 4. The evidence the design rests on

| Folder | What is in it |
|---|---|
| [`../analysis/`](../analysis/) | **The analysis programme** — 12 batches plus batch 0, checking AI-FIRST against Hermes and the Starting Kit. Batch 12 is the development plan |
| [`../paperclip-hermes-study/`](../paperclip-hermes-study/) | **The agent study** — 11 batches on how AI workers get roles, tasks, delegation, triggers and conversations. Batch 10 is the synthesis |
| [`../paperclip-value-study/`](../paperclip-value-study/) | **The value scan** — a second, wider pass over the same upstream product, asking a different question: *is any of it worth taking, learning from, or deliberately rejecting?* Batch 12 is the answer. **Read [`findings/07-synthesis.md`](../paperclip-value-study/findings/07-synthesis.md) and nothing else** unless you want the evidence |
| [`../../workspace/knowledge/`](../../workspace/knowledge/) | **How the platform actually works** — the governance layer, authority, approvals, delegations, denials, record locks, the ledger, the test gate |
| [`../../workspace/references/`](../../workspace/references/) | The detail behind the cookbook: environment, parked modules, deployment, how to test |

---

## 5. Folders on disk that matter, and whether they are in git

**This is the honest bit.** Some folders the design depends on live on disk but are **not
tracked in git**, so a fresh clone would not have them. They are listed here so a new agent
knows they exist and knows which ones travel with the repository.

| Folder | What it is | In git? |
|---|---|---|
| `library/` | Everything documented, in one place. The 16 numbered shelves are copies of material held elsewhere | **Partly** — the shelves are ignored by design (rebuildable or external); `library/analysis/`, `library/development/`, `library/ai/ai-first/` and the index files are versioned |
| [`../../llama/`](../../llama/) | **The eight documents the model-layer design was built from** — the llama-server integration analysis | **Now tracked** (2026-10-05). It was authored here and is not rebuildable |
| [`../../analysis/`](../../analysis/) | **The earlier Hermes / Starting Kit study** — five findings plus a forensic baseline. Superseded in part by `library/analysis/`, kept as the record | **Now tracked** (2026-10-05). Same reason |
| [`../../workspace/starting-kit/`](../../workspace/starting-kit/) | **Every line of code we own** — a separate git repository | Its **own** repo (repo 2) |
| [`../../hermes-agent-main/`](../../hermes-agent-main/) | The Hermes runtime source, at the repository root. Somebody else's code | **Ignored** — it is vendored source, and its twin in the library is ignored too |
| [`../ai/hermes-agent-main/`](../ai/hermes-agent-main/) | The same runtime source, inside the library, kept for reading | **Ignored** by design |
| [`../../vms/`](../../vms/) | The hosting VM's credentials, ISO and scripts | **Ignored** — holds secrets and a 4 GB ISO. Durable copies of the scripts live in `workspace/scripts/vm-platform/` |

**Two products are called Companai.** If you are about to read a "Companai" document, check its
path first: `aissistant-package/`, `companai.md` and `library/ai/hermes-docs/` are **not ours**.

**The two index files.** [`../../INDEX.md`](../../INDEX.md) is the folder map for the whole project;
[`../INDEX.md`](../INDEX.md) is the library's own index, shelf by shelf. Between them, every folder
is accounted for.

---

## 6. Where the project's memory lives — not in the repository

The repository holds the *project*. The accumulated **memory and technique** live outside it, and
an agent that does not know they exist will re-learn them the hard way.

| What | Where |
|---|---|
| **Project memory (curated)** | `C:\.workbuddy-ai\memory\MEMORY.md` — how to work with this owner, the project in one screen, the hard rules |
| **Daily session logs** | `C:\.workbuddy-ai\memory\YYYY-MM-DD.md` — what each session did, measured, and left open |
| **Standing preferences (all projects)** | `~/.workbuddy-ai/MEMORY.md` — the two techniques, how to ask questions, reply language |
| **Reusable techniques** | `~/.workbuddy-ai/skills/` — each a hard-won method from this project. **Load the matching one before starting a task it covers** |

**This thread's own record** is [`THREAD-2026-10-05.md`](THREAD-2026-10-05.md) — a faithful
account of what this session decided and did, so the reasoning survives the session.

---

## 7. The rules that matter most

Full text in [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md). The ones that have
already cost this project time:

- **Every claim comes with an observation attached, not an argument.** Measure from the artefact,
  never from a description of it.
- **Reach every important answer by two genuinely different routes**, and make them agree.
  Re-running your own check is not a second route.
- **Bounce every conclusion off a critic whose only job is to prove it wrong.**
- **Never `git add -A`.** Stage by explicit path. Every batch commits in **both** repositories,
  and only when code changed does the code repository get a commit.
- **Update the documentation in the same change as the work.** A batch that leaves the docs stale
  is not finished (COOKBOOK rule zero).
- **A decision that is the owner's is not yours to close.** Ask, or leave it explicitly open.

---

## 8. Maintaining this page

**This page is part of the work.** Whoever adds an important document, opens or closes a design
decision, or changes what is tracked in git updates it in the same change.

If a newcomer cannot find the five things that matter from this page, this page is broken. Fix
the page, not the newcomer.

*Last updated: 2026-10-06 — the request-outcome taxonomy added to §2 (the owner's core features_pack,
`ARCHITECTURE-request-outcomes.md`), and the library split stated in §1. The reading order is now three
tiers in [`HANDOVER.md`](HANDOVER.md) §2 step 1: tier A (direction + live decisions), tier B (the spine),
tier C (supporting, opened only where the work needs it). Previously 2026-10-06: the Paperclip value scan
added to §4, with its synthesis named as the one page to read. Previously 2026-10-05: created, with the
model-layer decision (per-tenant policy as the destination, cloud-first as the interim) recorded, the
end-game documents gathered in one place, and the untracked folders named honestly.*
