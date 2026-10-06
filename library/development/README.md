# Development — the management hub

**Start here if you are working on this project, or if it has just been handed to you.**

This folder is the **development management hub**: where the work is tracked, where a newcomer
learns the order to read things in, and where the handover lives. It does not replace the
existing documents — it **points at them and orders them**, so you do not have to guess which
of a hundred files to open first.

**Written 2026-10-04.**

---

## If you have just been handed this project — read in this order

**About two and a half hours for tier A + B, and you will understand what is built, what is left, and
why.** There are three tiers. **Read tier A, then tier B. Open tier C only when the work in front of
you touches it** — the library holds roughly twenty times more imported material than our own writing,
and reading it "for context" is how the direction gets buried.

**In a hurry? [`BOOKMARKS.md`](BOOKMARKS.md) is the short list** — the handful of documents that
matter, the end-game documents, and which folders are in git, on one page.

**If you are an agent starting a fresh session, the message to send is
[`START-PROMPT.md`](START-PROMPT.md).** It tells you to read the list below, states the rules you
may not break, and names the first task — so the reading happens first, not after you have already
formed a picture.

**Tier A — the six that fix the direction and the live decisions.**

| # | Read | Why |
|---|---|---|
| A1 | [`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) | **The product in plain English** — the idea, the decisive loop, **the three things a prompt can become**, what it is *not*, and which documents are ours versus imported. **Read this first.** |
| A2 | [`../INDEX.md`](../../INDEX.md) | The map of every folder. What this project is, in one paragraph |
| A3 | [`HANDOVER.md`](HANDOVER.md) | **The handover** — what exists, where, and the traps nobody can discover (two repos, two products called Companai, gitignored `vms/`, the host VM) |
| A4 | [`BACKLOG.md`](BACKLOG.md) | **What is left**, in order, one line each — the single plan |
| A5 | [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md) | **The owner's core features_pack (G-21)** — a prompt ends as a **one-time answer**, a **model proposal**, or a **saved Function**; the triage, and the gate on the one that can change the database |
| A6 | [`../compai/planning/00-product-thesis.md`](../../compai/planning/00-product-thesis.md) | The product thesis and the 15 rules that must never be broken |

**Tier B — the spine: how it runs, how the work is done, and the plan.**

| # | Read | Why |
|---|---|---|
| B1 | [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the three big pieces run together |
| B2 | [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) | How Hermes attaches, and the **B-05** runtime boundary (§11) |
| B3 | [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) | How models attach, and the **model-default** decision (§9) |
| B4 | [`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md) | The product specification — the vision's own 40-item gate |
| B5 | [`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md) | **The plan** — phases, order, why |
| B6 | [`../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) | **How the work is done** — read before touching code |
| B7 | [`../LESSONS.md`](../../LESSONS.md) | The mistakes already made, so you do not repeat them |

**Tier C — supporting, opened only where the work needs it.** [`AGENT-HALF.md`](AGENT-HALF.md) (before any
agent-half work); [`THREAD-2026-10-05.md`](THREAD-2026-10-05.md) (why the session decided what it did);
[`NEEDS-YOU.md`](NEEDS-YOU.md) and [`BLOCKERS.md`](BLOCKERS.md); the `RUNBOOK-*.md` files (hosting,
deployment, domains, Sprint 0); **the direction** — the nine documents in [`../ai/ai-first/`](../ai/ai-first/),
read [`../ai/ai-first/README.md`](../ai/ai-first/README.md) for the order; and the study syntheses under
`../paperclip-value-study/` and `../paperclip-hermes-study/`.

**Then, before you write any code:** [`../workspace/knowledge/authority-overview.md`](../../workspace/knowledge/authority-overview.md)
— the governance layer, end to end. **Governance is the floor the product stands on; the product
itself is the business model being compiled into working software.** Everything in the library that
is *not* ours (`../ai/` except `ai-first/`, `../ai/source-docs/`) is imported study material —
evidence only, opened when a specific feature can learn from it.

### What to study first, by role

| If your job is… | Study first |
|---|---|
| **Understanding the product** | `00-product-thesis.md` → `findings/01-vision-frame.md` → `findings/12-development-plan.md` |
| **Writing code** | `COOKBOOK.md` → `workspace/knowledge/` (20 concept files) → `workspace/references/environment.md` |
| **Running it** | `ARCHITECTURE.md` → `workspace/references/local-instance.md` → [`RUNBOOK-hosting-server-manual.md`](RUNBOOK-hosting-server-manual.md) ⚠️ `workspace/references/deployment.md` is the **old Plesk** guide and is superseded |
| **Putting a domain on a site** | `RUNBOOK-adding-a-domain-step-by-step.md` → `RUNBOOK-hosting-server-manual.md` §4 |
| **Testing it** | `workspace/references/how-to-test.md` → `workspace/knowledge/test-gate.md` |
| **Picking up the analysis** | `library/analysis/PLAN.md` → `library/analysis/LOG.md` → the `findings/` reports |
| **Designing the agent half** (AI staff, roles, tasks, delegation, triggers, meetings) | [`AGENT-HALF.md`](AGENT-HALF.md) — **the model and the plan** — then [`../paperclip-hermes-study/findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md) for the evidence behind each lesson |
| **Deciding whether to take an idea from upstream Paperclip** | [`../paperclip-value-study/findings/07-synthesis.md`](../paperclip-value-study/findings/07-synthesis.md) — **the answer**, not the evidence. What is worth taking, what we already have, and what is rejected with a reason |

---

## The handover — what to do on day one

**A handover is not a document, it is a sequence.** Follow it in order.

1. **Read the eight files above.** Do not skip the lessons; they are the cheapest education you
   will get.
2. **Set up the shell.** Node 24 is project-local and mandatory — every terminal needs it, or
   you get confusing failures:
   ```bash
   export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
   ```
3. **Check the two repositories are clean.** The project root (thinking, docs) and
   `workspace/starting-kit/` (code) are **separate git repositories**. Nothing should be
   half-finished on disk.
4. **Bring up the stack.** See [`ARCHITECTURE.md`](ARCHITECTURE.md) §5 — one command starts the
   platform, the agent runtime and the model server together.
5. **Run the gate, and read the `Cached:` line.** A green result from cache is not a green
   result. `--force` for anything you are about to make a claim about.
6. **Take the first item from [`BACKLOG.md`](BACKLOG.md).** Verify it is still true against the
   code before starting — the roadmap has been wrong about what is already done **three times**.

**The one rule that matters most:** *every claim comes with an observation attached, not an
argument.* The work that held up was verified by watching it happen. The work that had to be
retracted was reasoned from reading code.

### The development machine (measured, not assumed)

**Confirmed by the owner, 2026-10-04: this is his machine — `BIXMASERVER`, a Dell Precision 7510.**
The figures below are the installed parts, taken from `Win32_PhysicalMemory` (the DIMMs) and
`Win32_Processor` (`NumberOfCores` vs `NumberOfLogicalProcessors`) — **not** the OS's derived totals:

| | |
|---|---|
| Model | **Dell Precision 7510** (mobile workstation, hostname `BIXMASERVER`) |
| CPU | Intel **Core i7-6820HQ** — **4 cores / 8 threads**, 2.70 GHz base, 8 MB L3 |
| RAM | **32 GB** installed (2 × 16 GB DDR4-2133, SK Hynix) — a **32 GB class** machine in the model-catalog sense |
| Disk | **476 GB** on `C:`, **126 GB free** |
| OS | Windows 10 Pro |

Windows *reports* 31.89 GB usable — the integrated graphics reserve the rest. **The specification
is 32 GB, and the CPU is 4 cores (8 threads), not "8 cores".** Getting this wrong is [[L50]];
measure the parts, not the OS's summary of them.

---

## The sprint process — every sprint, in order

**Owner's instruction, 2026-10-04:** *before working on any sprint, research it and validate
its plan; check whether Hermes or the Starting Kit already adds value on top of it; then write
the cookbook steps in detail a junior developer can follow.*

So every sprint runs in **four steps, and no code is written before step 3:**

| Step | What | Output |
|---|---|---|
| **1. Research** | What already exists for this task — in Hermes, in the Starting Kit, in the `V`-register? Is there a shortcut? | a short note: what we can reuse, and what we must build |
| **2. Validate** | Is this the best approach? What would break it? Is there a cheaper way to the same outcome? | a decision, with the alternative it beat |
| **3. Write the cookbook steps** | The full step-by-step for **this sprint only** — enough for a junior developer to follow without asking | a new section in [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) |
| **4. Build** | Do the work against the running stack, test it, record it | the change, tested and committed |

**The first sprint's steps are already written** — see *Sprint 0 — the running trio* in the
cookbook. That is the pattern every later sprint follows.

**Why the cookbook is written per sprint, not all up front** — the owner's question, answered:
detailed steps for code that does not exist yet are **guesses**, because the steps depend on
the interfaces the build reveals. A skeleton for every sprint (in `BACKLOG.md`) gives the
handover visibility; the full detail is written just before each sprint, when it can be right.
See COOKBOOK rule zero-ten.

---

## What is in this folder

| File | What it is |
|---|---|
| [`HANDOVER.md`](HANDOVER.md) | **The handover** — the front door for a newcomer who knows nothing: what exists, where it is, the two-repository layout, the traps, the host VM, the standing rules, and what is proven vs not. §0 is written for an agent taking over |
| [`BOOKMARKS.md`](BOOKMARKS.md) | **The pages to open first** — the handful of documents that matter, the **end-game / vision** documents, the two integration designs, and an honest list of which folders are in git and which are not |
| [`START-PROMPT.md`](START-PROMPT.md) | **The message that starts a new session** — paste it to the agent taking over: what to read first, the rules it may not break, and the first task |
| [`README.md`](README.md) | **This file** — the front door, the reading order, the handover, the sprint process |
| [`BACKLOG.md`](BACKLOG.md) | **The one roadmap** — everything left, in order, with the "do not lose this" list and the deferrals |
| [`AGENT-HALF.md`](AGENT-HALF.md) | **The agent half** — the five kinds of agent, the rule that decides who is answerable when one acts, and **where every one of the study's 53 lessons lands in the phases** |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the Starting Kit + Hermes + the model server run together, and the dockerisation decision (Sprint 0) |
| [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) | **The Hermes integration design** — platform to platform, function to function, and multi-tenant, with the owner's **B-05** runtime-boundary decision (§11) |
| [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) | **The model layer** — llama.cpp as one preset entry, the embedding lane, the two defects root-caused, and the owner's **model-default** decision (§9) |
| [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md) | **The three things a prompt can become** — the owner's core features_pack: a one-time answer, a model proposal (new structure), or a saved Function — and the triage (`G-21`) that decides which, with the gate that stops the AI reshaping the database on its own |
| [`PLAN-G17-ir-generation.md`](PLAN-G17-ir-generation.md) | **G-17's step 1–2 record** — the AI that emits the Business IR. Corrects an earlier claim: constrained generation **does** exist (`generateObject` + `runAiAgentObject`), it is simply never pointed at our IR. The first artifact is the IR's zod schema, wired to an agent |
| [`BLOCKERS.md`](BLOCKERS.md) | **Anything stopping progress**, with what clears it. **Read this before wondering why something is not moving** |
| [`NEEDS-YOU.md`](NEEDS-YOU.md) | **The owner-only action list** — numbered, with literal steps and a way to answer all of it at once |
| [`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md) | **The product specification** (Draft 2) — passes the vision's own 40-item gate; only the owner's ratification remains |
| [`RUNBOOK-adding-a-domain-step-by-step.md`](RUNBOOK-adding-a-domain-step-by-step.md) | **The practical walkthrough** — GoDaddy → Cloudflare → tunnel → SSL → a live site, with all three site types (Docker platform, WordPress container, your own codebase in a directory) and databases + phpMyAdmin. **Start here for "get my domain working"** |
| [`RUNBOOK-hosting-server-manual.md`](RUNBOOK-hosting-server-manual.md) | **Operating the hosting server** — connecting from the laptop, domains and DNS, directories, databases, phpMyAdmin, SSL, WordPress, deploying another Docker platform. **The entry point for that work, for a person or an agent** |
| [`RUNBOOK-platform-server.md`](RUNBOOK-platform-server.md) | the hosting VM itself — how it was built, the owner's tasks, rollback, rebuild from scratch |
| [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md) | the proxy and the deployment proof in depth, and what is and is not proven |
| [`RUNBOOK-sprint0.md`](RUNBOOK-sprint0.md) | Sprint 0 — running the kit on the laptop |

**Why there is no questions file.** There was one (`QUESTIONS.md`); the owner answered it on
2026-10-04 and it was deleted, as promised. Its answers are now in [`ARCHITECTURE.md`](ARCHITECTURE.md)
§6 and [`BACKLOG.md`](BACKLOG.md). **New questions go in the thread, or in a fresh temporary file
that is deleted once answered — never left buried in a report.**

**Where everything else lives** — the hub does not duplicate these, it uses them:

| Question | File |
|---|---|
| What is this project? | [`../INDEX.md`](../../INDEX.md) |
| What are we building, and the rules? | [`../compai/planning/00-product-thesis.md`](../../compai/planning/00-product-thesis.md) |
| How is the work done? | [`../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) |
| How does the platform work? | [`../workspace/knowledge/`](../../workspace/knowledge/) — 20 concept files |
| What happened, and when? | [`../JOURNAL.md`](../../JOURNAL.md) (newest first) |
| What mistakes were made? | [`../LESSONS.md`](../../LESSONS.md) |
| What did the analysis find? | [`../analysis/`](../analysis/) — 12 batches |
| What should the agent half look like? | [`../paperclip-hermes-study/findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md) — the completed 11-batch study of Paperclip + Hermes, and the lessons for our own agent architecture |
| Is any of upstream Paperclip worth taking? | [`../paperclip-value-study/findings/07-synthesis.md`](../paperclip-value-study/findings/07-synthesis.md) — the second, wider pass: six things worth acting on, four items confirmed, eight rejected with reasons, and the trap list |
| What is actually deployed? | [`RUNBOOK-hosting-server-manual.md`](RUNBOOK-hosting-server-manual.md) — ⚠️ `workspace/references/deployment.md` is the **old Plesk** guide and is superseded |
