# Development — the management hub

**Start here if you are working on this project, or if it has just been handed to you.**

This folder is the **development management hub**: where the work is tracked, where a newcomer
learns the order to read things in, and where the handover lives. It does not replace the
existing documents — it **points at them and orders them**, so you do not have to guess which
of a hundred files to open first.

**Written 2026-10-04. Last refreshed 2026-10-08** — the handover and the start prompt were updated for
a new agent taking over as though it had been here since day one (see
[`HANDOVER.md`](HANDOVER.md) revision 11 and [`START-PROMPT.md`](START-PROMPT.md)), and a hostile-critic
pass corrected real defects in them (chiefly: `SD-3` was being called "next" while already built). Both
now also name three documents they had omitted — [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md),
[`RESUME-POINT.md`](RESUME-POINT.md) and [`STATE-OF-PLAY-2026-10-07.md`](STATE-OF-PLAY-2026-10-07.md) —
as first-tier reads. **The one live fact — what is being worked on now — is never in this folder's
prose; it is the `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md).**

---

## If you have just been handed this project — read in this order

**About two and a half hours for tier A + B, and you will understand what is built, what is left, and
why.** There are three tiers. **Read tier A, then tier B. Open tier C only when the work in front of
you touches it** — the library holds roughly twenty times more imported material than our own writing,
and reading it "for context" is how the direction gets buried.

**In a hurry? [`BOOKMARKS.md`](BOOKMARKS.md) is the short list** — the handful of documents that
matter, the end-game documents, and which folders are in git, on one page.

**If you are an agent starting a fresh session, the message to send is
[`START-PROMPT.md`](START-PROMPT.md).** It tells you to read the list below and states the rules you
may not break — and then sends you to **the one place that says what to do now: the `★ ACTIVE TASK`
box at the top of [`../../JOURNAL.md`](../../JOURNAL.md)**. Handover documents deliberately carry no
task, because a task changes every session (owner's instruction, 2026-10-06).

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
| B2a | [`ARCHITECTURE-hermes-service-map.md`](ARCHITECTURE-hermes-service-map.md) | **The Hermes/Llama service map, per development item** — how Hermes serves or is served at every AI joint (agent vs setting wiring), where Llama sits, and the status. **The no-learning-curve wiring map** |
| B3 | [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) | How models attach, and the **model-default** decision (§9) |
| B4 | [`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md) | The product specification — the vision's own 40-item gate |
| B5 | [`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md) | **The plan** — phases, order, why |
| B6 | [`../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) | **How the work is done** — read before touching code |
| B7 | [`../LESSONS.md`](../../LESSONS.md) | The mistakes already made, so you do not repeat them |
| B7a | [`JOURNEY.md`](JOURNEY.md) | **The journey, start to today, told forward** — the product idea, what has been built phase by phase, and the through-lines that shaped every decision. [`JOURNAL.md`](../../JOURNAL.md) is the same story newest-first, with dates and measurements; this is the readable version |
| B8 | [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) | **The standard every architectural change is checked against** — S1–S12, plus §C.2b (tiers are a superadmin *setting*, not hardcoded) |
| B9 | [`BUILD-ORDER.md`](BUILD-ORDER.md) | **The order — foundation before stack.** Phase −1 (architecture contracts) → Phase 0 (D0–D3 + metadata registry) → the stack on top |
| B10 | [`CORE-BOUNDARY.md`](CORE-BOUNDARY.md) | **What may never be customised** — the three rings, and the C1–C11 core the architecture depends on |
| B11 | [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) | **Every core module, measured** — industry baseline mapped to our modules, verdicts, counts, and the five genuine absences (M1–M5) |
| B12 | [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) | **What the Universal Platform Blueprint exposes we had not planned** — the four gaps A–D, and what we adopt vs adapt |

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
6. **Get your task from the `★ ACTIVE TASK` box** at the top of [`../../JOURNAL.md`](../../JOURNAL.md).
   **That box is the one place that says what is being worked on now** — not this file, not the
   handover, not the start prompt (owner's instruction, 2026-10-06). Verify the item is still true
   against the code before starting — the roadmap has been wrong about what is already done
   **four times**.

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

> **Current process (2026-10-08): the standing rule 10 in [`WORKING-RULES.md`](WORKING-RULES.md) is the
> task-package workflow and supersedes this four-step narrative where they differ** — study the
> references → pick the relevant `platform_points` → write the combined requirement → **prove the
> prerequisites flawless in code first** → trace the impact and update the plans → execute under the
> TOTAL quality protocol (hostile critic as a separate agent, RED-then-GREEN mutation proof with
> md5-verified restores, a two-route re-measure, a green gate, then the docs). **The four steps below
> remain the right shape for a fresh feature and are kept because they explain *why* the work happens
> in that order.**

**Owner's instruction, 2026-10-04:** *before working on any sprint, research it and validate
its plan; check whether Hermes or the Starting Kit already adds value on top of it; then write
the cookbook steps in detail a junior developer can follow.*

So every sprint runs in **four steps, and no code is written before step 3:**

| Step | What | Output |
|---|---|---|
| **0. Contract check** | **The architecture phase that must precede the build (Phase −1, from the blueprint study).** Before a sprint starts, confirm the interfaces it depends on are *frozen contracts* — the resource envelope, the metadata registry, the actor/context model, the naming grammar. **A sprint that would invent one of these stops and fixes the contract first.** | a note: which contracts this sprint consumes, and confirmation they exist |
| **1. Research** | What already exists for this task — in Hermes, in the Starting Kit, in the `V`-register? Is there a shortcut? | a short note: what we can reuse, and what we must build |
| **2. Validate** | Is this the best approach? What would break it? Is there a cheaper way to the same outcome? | a decision, with the alternative it beat |
| **3. Write the cookbook steps** | The full step-by-step for **this sprint only** — enough for a junior developer to follow without asking | a new section in [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) |
| **4. Build** | Do the work against the running stack, test it, record it | the change, tested and committed |

**Sprint 0 (`S0`) is done** — the stack was coming up degraded and was fixed (redis exited, no `restart:` policy); all eight containers are now healthy. The four items on the **critical path** — `spec → G-01 → G-02 → G-03` — are complete, and `G-07` (the Widget contract), `G-17` (the AI emits the Business IR) and `G-21` (the request-outcome taxonomy) are built and proven. **Since then the foundation closed:** the `D2-gap` sweep reached **0 unguarded across the 35 enabled modules**, and **phase 0 is COMPLETE (2026-10-07)** — `D0`, `D1`, `D3` and the **Metadata Registry** are built and proven. **The build has started on top of it:** `SD-1` Phase 1 (the S2 structure-change gate) is built and mutation-proven. **`SD-3` is already BUILT (2026-10-06)** — so the next *undone* slice in BUILD-ORDER order is **`SD-2`** (mark core functions and guard their deletion), then `SD-4`/`SD-5`. **Which sprint runs next is not decided here** — it is in the `★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md), which always names the item in hand and why it is next.

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
| [`START-PROMPT.md`](START-PROMPT.md) | **The message that starts a new session** — paste it to the agent taking over: what to read first and the rules it may not break. It carries **no task**; it sends the agent to the `★ ACTIVE TASK` box in [`../../JOURNAL.md`](../../JOURNAL.md) |
| [`JOURNEY.md`](JOURNEY.md) | **The journey, told forward** — Act 0 to today: the product idea, what has been built and proven phase by phase, and the through-lines. Written so a newcomer who was not here can still understand *why* each thing was done. The complement to `JOURNAL.md` (which is newest-first) |
| [`WORKING-RULES.md`](WORKING-RULES.md) | **The owner's standing rules, in one page** — the five that outrank everything (including "two routes or it is not a finding" and the front-end rule), how to report, and how to ask. Read once, at the start |
| [`README.md`](README.md) | **This file** — the front door, the reading order, the handover, the sprint process |
| [`BACKLOG.md`](BACKLOG.md) | **The one roadmap** — everything left, in order, with the "do not lose this" list and the deferrals |
| [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) | **The standard every architectural change is checked against** — S1–S12, the B-protocol, §C.2b (tiers as a superadmin setting), and the structure-permission grammar |
| [`BUILD-ORDER.md`](BUILD-ORDER.md) | **The order — foundation before stack** — Phase −1 contracts, Phase 0 (the four guard-engine gaps D0–D3 + metadata registry), then the stack |
| [`CORE-BOUNDARY.md`](CORE-BOUNDARY.md) | **What may never be customised** — the three rings, C1–C11, the enforcement mechanisms, and the 20 adopted blueprint rules |
| [`CORE-MODULES-REGISTER.md`](CORE-MODULES-REGISTER.md) | **The core-module audit** — industry baseline, our modules measured with two-route verdicts, the five genuine absences, and the honesty log |
| [`BLUEPRINT-GAP-ANALYSIS.md`](BLUEPRINT-GAP-ANALYSIS.md) | **The blueprint gap study** — four gaps (resource envelope + metadata registry, core/pack boundary, i18n/RTL/a11y contract, architecture-contracts phase), with adapt-vs-adopt |
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
| [`RUNBOOK-companai-platform.md`](RUNBOOK-companai-platform.md) | **The Companai platform app itself** (`companai.corprorate.com`) — where the deployment lives, how init seeds the three accounts, and the one superadmin credential fault found and fixed on 2026-10-07. Companion to the two above |
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
| How did we get here, and why? | [`JOURNEY.md`](JOURNEY.md) — the same story told forward, so a newcomer understands the decisions, not just the dates |
| What mistakes were made? | [`../LESSONS.md`](../../LESSONS.md) |
| What did the analysis find? | [`../analysis/`](../analysis/) — 12 batches |
| What should the agent half look like? | [`../paperclip-hermes-study/findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md) — the completed 11-batch study of Paperclip + Hermes, and the lessons for our own agent architecture |
| Is any of upstream Paperclip worth taking? | [`../paperclip-value-study/findings/07-synthesis.md`](../paperclip-value-study/findings/07-synthesis.md) — the second, wider pass: six things worth acting on, four items confirmed, eight rejected with reasons, and the trap list |
| What is actually deployed? | [`RUNBOOK-hosting-server-manual.md`](RUNBOOK-hosting-server-manual.md) — ⚠️ `workspace/references/deployment.md` is the **old Plesk** guide and is superseded |
