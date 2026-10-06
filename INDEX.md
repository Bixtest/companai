# START HERE

**You have just been handed this project and know nothing about it. This page is
the map.** Everything else is reachable from here.

> **Wondering what we are actually building? Read
> [`library/WHAT-WE-ARE-BUILDING.md`](library/WHAT-WE-ARE-BUILDING.md) first.** It is the product in
> plain English — the idea, the loop that makes it work, what it is *not*, and which documents in
> the library are ours versus imported study material.
>
> **New to the project? Read the handover next:
> [`library/development/HANDOVER.md`](library/development/HANDOVER.md).** It is written
> for someone who knows nothing about the project, codebase or documents, and it tells
> you what exists, where it is, and the traps nobody can find by reading the code
> (two repositories, two products called Companai, the gitignored `vms/` folder, the
> host VM, the mandatory Node-24 export). Then come back here for the folder map.
>
> **Handing the work to an agent? Paste
> [`library/development/START-PROMPT.md`](library/development/START-PROMPT.md)** — it is the
> first message for a fresh session: what to read, the rules it may not break, and the first task.
>
> **Just want the short list of what to open?**
> [`library/development/BOOKMARKS.md`](library/development/BOOKMARKS.md) — the handful of documents
> that matter, the end-game documents, and which folders are in git and which are not.

---

## 1. What we are building, in one paragraph

**A platform where a business describes what it needs, and the platform turns that description into
real working software — then runs that software with no AI.**

An AI helps **build** a capability (a screen, an operation over real data, a report) from a
plain-language request. The platform **checks** it against a single canonical **business model**,
the person **confirms** it is what they meant, and it is **saved as a Function** that runs from then
on — fast, free, deterministic, and with **no AI in the loop**. That is how the platform grows real
functionality that replaces the classical idea of fixed ERP modules.

The thing that makes it different is not a chatbot. It is that **the business model is the source of
truth, and the platform continuously compiles it into working software**. Governance — one place
that decides whether any actor, human or machine, may take any action, and can always explain why —
is the **floor** the product stands on, not the product itself.

> **The full version of this, in plain English, is
> [`library/WHAT-WE-ARE-BUILDING.md`](library/WHAT-WE-ARE-BUILDING.md). Read it before any long
> stretch of work** — it is the page that keeps the eye on the prize, and the one that tells you
> which documents in the library are *ours* and which are only imported study material.

## 2. Where the project stands today

> **Returning to this project after time away? Read
> [`library/development/HANDOVER.md`](library/development/HANDOVER.md) first, then
> [`library/development/BACKLOG.md`](library/development/BACKLOG.md)** for what is left.
>
> ⚠️ **`where_we_left.md` is no longer kept current.** It is a **2026-08-13 snapshot**, stale by
> its own admission. It is still worth reading for its *traps*, *"things that look broken and are
> not"* and *"how to work here"* sections — and for nothing else. **Do not trust it for status.**

| | |
|---|---|
| **Start here on return** | [`library/development/HANDOVER.md`](library/development/HANDOVER.md) — the front door; then [`library/development/BACKLOG.md`](library/development/BACKLOG.md) for what is left. ⚠️ `where_we_left.md` is **stale (2026-08-13)** — traps only |
| **Phase** | Building the Starting Kit |
| **Decision made** | We are building on **Open Mercato**, a working platform we have forked permanently |
| **Decisions taken by the owner** | **B-05 (the Hermes boundary):** one product, one repository, one deployment, one interface (ours), with Hermes as a **supervised private runtime process behind the internal port**; Hermes is **headless**. **The model default (item 13):** per-tenant policy is the destination, cloud-first is the interim. Both decided **2026-10-05**. See [`ARCHITECTURE-hermes-integration.md`](library/development/ARCHITECTURE-hermes-integration.md) §11 and [`ARCHITECTURE-model-server-integration.md`](library/development/ARCHITECTURE-model-server-integration.md) §9 |
| **Where the code is** | [`workspace/starting-kit/`](workspace/starting-kit/) |
| **Health** | **Green when last measured** (2026-08-13). ⚠️ **Not re-measured since** — and the two status documents **disagree** on the test count (12,924 vs 12,898). **Re-run the gate and read the `Cached:` line yourself**; `--force` is mandatory, it is Turbo-cached (L45). See [`knowledge/test-gate.md`](workspace/knowledge/test-gate.md) |
| **Current work** | **The four-item critical path is complete** — `spec ✅ → G-01 ✅ → G-02 ✅ → G-03 ✅` — and **`G-07` (the Widget contract) is built**: a published Function, placed in a Widget, runs from the Widget's own inputs with **no AI**. The governance layer decides, every autonomy gate binds, and a person can work the queue at **Settings → Authority → Approvals**. **`S0` (the local trio re-run) is DONE 2026-10-06** — it found the stack was coming up degraded (redis exited, no `restart:` policy), fixed it, and all eight containers are now healthy. **Vision check (owner, 2026-10-06):** everything **downstream of the Business IR** is built and proven; the AI that should **emit** the IR is not wired — that is **`G-17`** (schema-constrained generation), measured and startable. **Default next: `G-12`** (business backup and restore); **`G-17` competes for that slot — the owner's call** |
| **Understand the product in 10 minutes** | [`workspace/knowledge/authority-overview.md`](workspace/knowledge/authority-overview.md) — the governance layer end to end. **This is the thing we are building** |
| **Progress tracker** | [`library/development/BACKLOG.md`](library/development/BACKLOG.md) — **the one roadmap.** ⚠️ [`workspace/PROGRESS.md`](workspace/PROGRESS.md) is **superseded** and its status views disagree with each other; use it only for the *reasoning* behind an item |
| **The ERP is off** | 14 modules **parked**, not deleted — 136 tables instead of 263. One line each to restore: [`workspace/references/parked-modules.md`](workspace/references/parked-modules.md) |
| **Actually deleted** | Only `packages/enterprise`, because its licence forbids redistribution |
| **Run it yourself** | [`workspace/references/local-instance.md`](workspace/references/local-instance.md) — on this laptop. **The hosted path is separate: see the hosting runbooks below** |
| **Deploy it to a server** | [`library/development/RUNBOOK-hosting-server-manual.md`](library/development/RUNBOOK-hosting-server-manual.md) — **the hosting VM (`Platform-Server`), domains, directories, databases, SSL**. ⚠️ [`workspace/references/deployment.md`](workspace/references/deployment.md) describes the **old Plesk** approach and is superseded |

## 3. The five things to read, in order

Read these and you will understand the project. About an hour.

| # | Read | Why |
|---|---|---|
| 1 | [`compai/planning/00-product-thesis.md`](compai/planning/00-product-thesis.md) | What we are building and the 15 rules that must never be broken |
| 2 | [`compai/planning/09-starting-kit.md`](compai/planning/09-starting-kit.md) | **In plain English** — what the platform gives us and what we still have to build |
| 3 | [`compai/planning/08-host-selection-and-migration-plan.md`](compai/planning/08-host-selection-and-migration-plan.md) | Why we chose this platform and what happens next |
| 4 | [`workspace/COOKBOOK.md`](workspace/COOKBOOK.md) | How the work is actually done |
| 5 | [`workspace/knowledge/authority-overview.md`](workspace/knowledge/authority-overview.md) | **The governance layer, end to end** — the part that does not exist anywhere else |

Then, before touching anything: [`LESSONS.md`](LESSONS.md) — the mistakes already
made and how they were caught. It will save you from repeating them.

## 4. The map — every folder explained

```text
companai/                      ← you are here
├── INDEX.md                   this page — always start here
├── JOURNAL.md                 what happened, in order, with dates
├── LESSONS.md                 mistakes made, how they were caught, how to avoid them
│
├── library/                   EVERYTHING IN ONE PLACE — the documentation, the AI material, the analysis
│   ├── INDEX.md               what each shelf is, and the reading order. See §6
│   ├── PROVENANCE.md          where every shelf came from, and how to rebuild it
│   ├── ai/                    READ ITS README FIRST — two different products are called Companai
│   │   ├── ai-first/          THE DIRECTION — what we will actually build. Mentions Companai 0 times
│   │   ├── hermes-docs/       a SIBLING project's docs (Paperclip-based). Lessons only, never decisions
│   │   ├── hermes-agent-main/ the Hermes runtime source itself — where it disagrees with docs, it wins
│   │   ├── paperclip-master/  upstream Paperclip — the subject of **both** studies below
│   │   └── source-docs/       THE ONE PLACE the scattered source documents were gathered (register inside)
│   ├── analysis/              THE ANALYSIS BEFORE DEVELOPMENT — **COMPLETE, all 12 batches**
│   │   ├── PLAN.md            the batch plan with tickboxes — all 12 DONE
│   │   ├── README.md          how the programme runs, and the rules
│   │   ├── LOG.md             one dated line per batch completed
│   │   └── findings/          one report per batch — **batch 12 is THE DEVELOPMENT PLAN**
│   ├── paperclip-hermes-study/ THE AGENT STUDY — **COMPLETE, all 11 batches**
│   │   ├── PLAN.md            the batch plan with tickboxes — all 11 DONE
│   │   ├── LOG.md             one dated line per batch completed
│   │   └── findings/          one report per batch — **batch 10 is THE SYNTHESIS: lessons + target design**
│   ├── paperclip-value-study/ THE VALUE SCAN — **COMPLETE, all 12 batches**
│   │   ├── PLAN.md            the batches, the rule ("document only where there is value"), the five baselines
│   │   ├── LOG.md             one dated line per batch, including the extraction verification
│   │   └── findings/          01–06 evidence, **07 is THE ANSWER: what to take, what we already have, what to reject**
│   └── development/           DEVELOPMENT MANAGEMENT — where the work is tracked
│       ├── HANDOVER.md        **the front door for a newcomer — read this first** (§0 is for an agent taking over)
│       ├── START-PROMPT.md    **the message that starts a new session** — paste it to the agent
│       ├── README.md          the reading order, the sprint process
│       ├── BACKLOG.md         **THE ONE ROADMAP** — everything left, in order
│       ├── AGENT-HALF.md      **the agent half** — five agent kinds, the responsibility rule, and where every lesson lands
│       ├── ARCHITECTURE.md    how the Starting Kit + Hermes + the model server run together
│       ├── ARCHITECTURE-hermes-integration.md  **the full Hermes integration design** — platform to
│       │                      platform, function to function, and multi-tenant. The deliverable that
│       │                      supersedes the process recommendation in `analysis/`
│       ├── ARCHITECTURE-model-server-integration.md  **the model layer** — llama.cpp, the provider
│       │                      presets, the embedding lane, and the two defects found (2026-10-05)
│       ├── BLOCKERS.md        anything stopping progress, with what clears it
│       ├── NEEDS-YOU.md       owner-only actions, numbered
│       └── RUNBOOK-*.md       hosting: the server manual, the domain walkthrough, Sprint 0
│
├── compai/                    THINKING — no code
│   ├── brainstorming/         where the idea came from (3 documents)
│   └── planning/              the design (12 documents) — see its own README
│       ├── method/            how we assess a candidate platform
│       └── platforms/         one folder per platform we assessed
│
├── workspace/                 BUILDING — this is where work happens
│   ├── COOKBOOK.md            the development cookbook — read before touching code
│   ├── PROGRESS.md            ⚠️ SUPERSEDED by library/development/BACKLOG.md — keeps the reasoning only
│   ├── knowledge/             HOW THE PLATFORM WORKS — reusable know-how
│   ├── references/            the detail behind the cookbook
│   ├── salvage/               one report per module analysed — what each contains
│   ├── attic/                 rescued code patterns + CATALOG.md (little here: we park, not delete)
│   ├── scripts/               checkpoint.sh, and vm-platform/ (the tracked VM scripts)
│   ├── .backups/              database + env snapshots (newest 5 kept, auto-pruned)
│   ├── .toolchain/            our own Node 24 — do not use the system Node
│   └── starting-kit/          THE CODEBASE (repo 2)
│
├── aissistant-package/        ⚠️ NOT OURS — the SIBLING project's codebase: a fork of Paperclip
│                              0.3.1 with Hermes wired in (host/packages/adapters/hermes/).
│                              A legacy copy, merged into konsult/ on 2026-08-17. DO NOT EDIT,
│                              do not deploy from it. **The authoritative copy moved to the E:
│                              drive with the other archived codebases (2026-10-04):**
│                              E:\sep-26-2026\major-importand-codebases\konsult\aissistant-package
├── companai.md                ⚠️ NOT OURS — a sibling document, copied in. Byte-identical to
│                              <that moved copy>\documentation\cursor\companai.md.
│                              It reads as a vision statement for OUR product. It is not one
├── companai-logo/             Brand assets
├── keys/                      Server credentials — NOT documentation, keep private. Now gitignored
├── host-sync.tgz              30 MB host archive containing a .env — large, and a secret. Gitignored
├── paperclip-master.zip       ⚠️ NOT OURS — upstream Paperclip (the newest version), 8,300 files.
│                              (The zip lists 9,056 *entries*; 756 of them are folders, and one
│                              file is a symlink Windows will not create, so 8,299 land on disk.
│                              Anyone quoting 9,056 is quoting the entry count — see
│                              library/paperclip-hermes-study/findings/00-inventory.md.)
│                              Reference material for the agent/task study. Not our code
├── vms/                       ⚠️ GITIGNORED — the hosting VM's credentials, ISO and scripts
│
├── Platform/                  ⚠️ NOT PRESENT today — see the note below
├── open-mercato-main/         ⚠️ NOT PRESENT today — see the note below
└── skills-main/               ⚠️ NOT PRESENT today — see the note below
```

⚠️ **Checked 2026-10-03 (batch 0 of the analysis programme).** Three corrections to
what this map said before:

- `aissistant-package/` was described as "a legacy mirror of the codebase", which
  reads as a mirror of *ours*. It is the **sibling's** codebase — the other product
  also called Companai. See [`library/ai/README.md`](library/ai/README.md).
- `companai.md` was not on the map at all. It is a sibling document, and it is the
  most misleading file in this folder. Labelled above.
- `integration_research/` and `tiny_models/` moved into `library/ai/` when everything
  was consolidated. They are no longer at the root.

**Two products are called Companai.** If you are about to read a "Companai" document,
check its path first. Full evidence and the glossary: [`library/analysis/findings/00-inventory.md`](library/analysis/findings/00-inventory.md).

⚠️ **Checked 2026-10-03:** `Platform/`, `open-mercato-main/` and `skills-main/`
are not in this folder, and were not found on the external drive either. The
other folders above have been checked against the folder as it is now.

**The three folders at the bottom were gitignored on purpose, when they were
here.** They are read-only reference trees, not our code — `Platform/` is where
the authority ideas came from, and `open-mercato-main/` is the pristine upstream
to diff against when you need to know whether we changed something or inherited
it. **Every line of code we own lives in `workspace/starting-kit/` and nowhere
else.**

⚠️ **Naming trap:** the outer folder is `companai`, the inner one is `compai`.
Different spellings, not a typo you should "fix" — paths depend on both.

## 4b. How to pick up the work — the loop

Every batch runs the same way. Nothing here is optional.

**1. Find out what is next.**
[`library/development/BACKLOG.md`](library/development/BACKLOG.md) is the roadmap and the only
plan. It is ordered; take item 1 unless you have a reason not to. If you have a reason,
say it and re-order the list — the list is the memory, not you. Never work on
something that is not on it; add it first.
*(`workspace/PROGRESS.md` is superseded by it and kept only for the reasoning behind an item.)*

**2. Set up your shell.** Every session, every terminal:

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
```

Wrong Node produces results that describe the laptop, not the platform. See
[`workspace/references/environment.md`](workspace/references/environment.md).

**3. Take a restore point if the work could not be undone** — a migration, a
bulk update, anything touching the database:

```bash
./workspace/scripts/checkpoint.sh <short-label>
```

It says plainly if it could not back the database up. Believe it when it does.

**4. Do the work.** Read the knowledge entry for the area first
([`workspace/knowledge/`](workspace/knowledge/) has a reading order). Write the
tests that would have caught the bug, not the tests that pass.

**5. Run the gate. All of it, with the local server stopped:**

```bash
cd workspace/starting-kit
corepack yarn generate && corepack yarn build:packages && corepack yarn typecheck && corepack yarn lint && corepack yarn test
```

A running instance makes the suite flaky — that cost a day to work out. Never
pipe these through `head` or `tail`; you throw away the exit code.

**6. If you changed anything the app serves, rebuild it.** The app serves
`packages/*/dist`, not your source. Source edits are invisible until:

```bash
corepack yarn build:packages && corepack yarn build:app --force
```

then restart the server. This one has caught us more than once.

**7. Commit in both repositories.** They are separate:

- `workspace/starting-kit/` — the code
- the project root — the thinking: journal, lessons, backlog, knowledge

**8. Update the documentation in the same change.** Not afterwards. A batch that
leaves `PROGRESS.md`, the knowledge base or `how-to-test.md` stale is not
finished — that is COOKBOOK Rule zero, and it is the rule this project is most
serious about.

**9. Write the owner's test instructions.**
[`workspace/references/how-to-test.md`](workspace/references/how-to-test.md) —
click by click, with the expected result and the failure signature. Say plainly
when a change is invisible.

## 5. The rules that matter most

Break these and you will damage the project.

1. **Switch things off; do not delete them.** A module we do not want is *parked*
   — one commented line in `apps/mercato/src/modules.ts`. It then creates no
   tables, serves no routes and loads no code, while staying readable and
   restorable in seconds. See
   [`workspace/references/parked-modules.md`](workspace/references/parked-modules.md).
   If something genuinely must be deleted, it gets a written analysis first
   ([`salvage-analysis.md`](workspace/references/salvage-analysis.md)) — we
   already nearly lost the custom-domains feature because a module was labelled
   "CRM".

2. **Use our Node, not the system one.** Every command must begin with the path
   export in [`workspace/references/environment.md`](workspace/references/environment.md).
   Wrong Node = results that describe our laptop, not the platform.

3. **Never pipe build commands through `tail` or `head`.** It throws away whether
   the command succeeded. This already reported a failure as a success once.

4. **We never take updates from the original project again.** It is our code now.
   Nobody will tell us when they patch a security hole — see
   [`workspace/README.md`](workspace/README.md).

5. **Reports are written for someone who was not there.** Full sentences, and the
   *why*, not just the *what*.

## 6. If you only need one specific thing

| I want to… | Go to |
|---|---|
| **Understand the whole project from zero (just inherited it)** | [`library/development/HANDOVER.md`](library/development/HANDOVER.md) — **the handover**: what exists, where, and the traps nobody can discover. **Starting a fresh agent session? Paste [`library/development/START-PROMPT.md`](library/development/START-PROMPT.md)** |
| **See the short list of what to open first** | [`library/development/BOOKMARKS.md`](library/development/BOOKMARKS.md) — the handful of documents that matter, the end-game documents, and which folders are in git and which are not |
| **Start working on this project (or pick it up after a handover)** | [`library/development/README.md`](library/development/README.md) — **the development hub**: the reading order, what to study first, and the handover sequence |
| **See everything left to do, in one place** | [`library/development/BACKLOG.md`](library/development/BACKLOG.md) — **the one roadmap.** The old lists in `workspace/PROGRESS.md` are superseded by it |
| **Understand how the three pieces run together** | [`library/development/ARCHITECTURE.md`](library/development/ARCHITECTURE.md) — Starting Kit + Hermes + the model server, and the dockerisation decision |
| **Understand how Hermes attaches (the runtime boundary)** | [`library/development/ARCHITECTURE-hermes-integration.md`](library/development/ARCHITECTURE-hermes-integration.md) — **the full Hermes integration design**, and the owner's **B-05** decision (§11) |
| **Understand how models attach, and the model default** | [`library/development/ARCHITECTURE-model-server-integration.md`](library/development/ARCHITECTURE-model-server-integration.md) — llama.cpp as one preset entry, the two defects, and the owner's **model-default** decision (§9) |
| **Know what we are building, in what order, and why** | [`library/analysis/findings/12-development-plan.md`](library/analysis/findings/12-development-plan.md) — **THE DEVELOPMENT PLAN.** The deliverable the whole analysis exists for: four phases, the critical path (G-01 → G-02 → G-03), the first three things to build, and every decision that is the owner's |
| **See the analysis plan, and what is being checked** | [`library/analysis/PLAN.md`](library/analysis/PLAN.md) — 12 batches with tickboxes, **all DONE**. Start here if you want the programme itself |
| **Know what has been analysed so far** | [`library/analysis/LOG.md`](library/analysis/LOG.md) — one dated line per batch, and [`library/analysis/findings/`](library/analysis/findings/) for the reports |
| **Understand the agent half (AI staff, roles, tasks, delegation, triggers, meetings)** | [`library/development/AGENT-HALF.md`](library/development/AGENT-HALF.md) — **the model and the plan**: the five kinds of agent, the rule that decides who is answerable when one acts, and where every lesson lands. Then [`library/paperclip-hermes-study/findings/10-lessons-and-target-design.md`](library/paperclip-hermes-study/findings/10-lessons-and-target-design.md) — **THE SYNTHESIS** — for the evidence: what we take from Paperclip and Hermes, what we reject, and how we do it better |
| **See the agent study's batch plan and progress** | [`library/paperclip-hermes-study/PLAN.md`](library/paperclip-hermes-study/PLAN.md) — 11 batches with tickboxes, **all DONE**, each with its result |
| **Know what of upstream Paperclip is worth taking, and what to avoid** | [`library/paperclip-value-study/findings/07-synthesis.md`](library/paperclip-value-study/findings/07-synthesis.md) — **THE ANSWER** of the second, wider pass: six things worth acting on, four backlog items confirmed correct, eight rejections with reasons, and the trap list |
| **Find a source document the study cites** | [`library/ai/source-docs/README.md`](library/ai/source-docs/README.md) — the register of where every scattered source document set lives, and what is copied where |
| **Understand the vision we are aiming at** | [`library/analysis/findings/01-vision-frame.md`](library/analysis/findings/01-vision-frame.md) — what the platform is meant to be, its rules, and what it deliberately has not decided |
| **Understand the two-Companai trap** | [`library/ai/README.md`](library/ai/README.md) — two different products share the name. Read before using any AI document |
| **Find any documentation at all** | [`library/INDEX.md`](library/INDEX.md) — every design, vision, audit and product document in one place, with a reading order |
| **Know where the documentation came from** | [`library/PROVENANCE.md`](library/PROVENANCE.md) — the source of every shelf, what was left out, how to rebuild it |
| Understand the product idea | [`compai/planning/00-product-thesis.md`](compai/planning/00-product-thesis.md) |
| See the design in detail | [`compai/planning/README.md`](compai/planning/README.md) |
| Know what the platform already does | [`compai/planning/09-starting-kit.md`](compai/planning/09-starting-kit.md) |
| Know why we picked this platform | [`compai/planning/08-host-selection-and-migration-plan.md`](compai/planning/08-host-selection-and-migration-plan.md) |
| Read the assessment of either candidate | [`compai/planning/platforms/README.md`](compai/planning/platforms/README.md) |
| Start writing code | [`workspace/COOKBOOK.md`](workspace/COOKBOOK.md) |
| Set up my machine | [`workspace/references/environment.md`](workspace/references/environment.md) |
| **Run the platform and look at it** | [`workspace/references/local-instance.md`](workspace/references/local-instance.md) |
| **Test a batch by hand (plain English)** | [`workspace/references/how-to-test.md`](workspace/references/how-to-test.md) |
| **History of the thinking** | This directory is a git repository — `git log` here covers the cookbook, journal, lessons and knowledge base |
| **Running it locally (needs project-local Node 24)** | [`workspace/references/local-instance.md`](workspace/references/local-instance.md) |
| **Which modules audit, and which deliberately do not** | [`workspace/references/audit-triage.md`](workspace/references/audit-triage.md) |
| **Known defects we inherited** | [`workspace/references/upstream-issues.md`](workspace/references/upstream-issues.md) |
| **Take a restore point before risky work** | `./workspace/scripts/checkpoint.sh <label>` — see COOKBOOK Rule zero-four |
| Know the codebase's true health | [`workspace/salvage/P3-baseline.md`](workspace/salvage/P3-baseline.md) |
| **Learn how the platform works** | [`workspace/knowledge/`](workspace/knowledge/) |
| **Put it on a server (hosting, domains, SSL)** | [`library/development/RUNBOOK-hosting-server-manual.md`](library/development/RUNBOOK-hosting-server-manual.md) — the hosting VM. For a domain end to end: [`RUNBOOK-adding-a-domain-step-by-step.md`](library/development/RUNBOOK-adding-a-domain-step-by-step.md). ⚠️ `workspace/references/deployment.md` is the **old Plesk** guide and is superseded |
| **See what is already done, and why** | [`workspace/references/completed-work.md`](workspace/references/completed-work.md) |
| See what happened and when | [`JOURNAL.md`](JOURNAL.md) |
| Avoid a known trap | [`LESSONS.md`](LESSONS.md) |
| **Check if we already built something** | [`workspace/attic/CATALOG.md`](workspace/attic/CATALOG.md) |
| Turn a parked module back on | [`workspace/references/parked-modules.md`](workspace/references/parked-modules.md) |
| **Understand the governance layer** | [`workspace/knowledge/authority-overview.md`](workspace/knowledge/authority-overview.md) |
| **See what the rules would say about an act** | `corepack yarn mercato auth authority:explain --capability <id> --actor ai_worker` |
| **Check or change a tenant's enforcement mode** | `corepack yarn mercato auth authority:mode --tenant <id> [--set off\|shadow\|enforce]` |
| Assess a new platform | [`compai/planning/method/platform-assessment-methodology.md`](compai/planning/method/platform-assessment-methodology.md) |

## 7. Maintaining this page

**This page is part of the work, not documentation about the work.** Whoever adds
a folder, finishes a phase, or makes a decision updates it in the same change.

A newcomer who cannot orient themselves from this page alone means it is broken —
fix the page, not the newcomer.

*Last updated: 2026-10-06 — **the second Paperclip pass is done, and it found six things worth
acting on.** A new study, [`library/paperclip-value-study/`](library/paperclip-value-study/), read
upstream Paperclip again through a **wider lens** than the agent study: not *"how do AI workers get
work"* but *"is any of this worth taking, learning from, or deliberately rejecting?"* Its
[`findings/07-synthesis.md`](library/paperclip-value-study/findings/07-synthesis.md) is the answer:
the **responsible-user intersection** (the strongest idea), **two warnings that change words we had
already written** (`ML-4` promised a mid-run stop we have not built; and the orchestration boundary
before `AH-3`), the **concurrency rules to write down**, the **self-modification gate**, the
**memory control plane**, and a **trap list** we would have walked into twice. Four of our backlog
items were **confirmed correct**, and eight things were **rejected with a reason** so nobody
re-opens them. The study also found and fixed a defect in its own evidence base: the extraction had
lost one file (`packages/db/src/migrations/0118_pipeline_case_agent_fanout.sql`, 346 bytes), now
restored from the archive, so the tree matches the archive **exactly** at **8,300 files /
132,839,980 bytes** by two independent routes. Docs updated in the same change:
[`library/development/BACKLOG.md`](library/development/BACKLOG.md) (`ML-4`'s wording corrected, **four
new items on the "do not lose this" list, `N-15` to `N-18`**, and `S0` unblocked), `NEEDS-YOU.md` (items 6
and 7 closed by the owner), `BOOKMARKS.md`, `library/INDEX.md`, `library/development/README.md`,
`HANDOVER.md`, and this page.*

*Earlier, 2026-10-05 — **the model layer's one owner decision is taken, and the navigation
layer a new agent needs now exists.** The owner **decided the long-term default** (item 13):
**per-tenant policy is the destination, cloud-first is the interim** — see
[`library/development/ARCHITECTURE-model-server-integration.md`](library/development/ARCHITECTURE-model-server-integration.md)
§9. It turns three pieces of work from *nice* to *required*: the model registry, the Hermes
**agent / persona / profile** mapping, and platform-managed local models (§6.4). Two further owner
requirements were recorded: the open-source lane must **not reserve a vendor's settings** (§4.2),
and the platform must be able to **choose which local model runs** (§6.4). A new
[`library/development/BOOKMARKS.md`](library/development/BOOKMARKS.md) gathers the end-game
documents and the handful of pages to open first, and names which folders are in git and which are
not. The two analysis folders the design rests on (`llama/`, `analysis/`) are now **tracked**; the
Hermes source at the root is now **ignored**, matching its library twin. Docs updated in the same
change: the model-layer document (§3.4, §9, §4.2, new §6.4, §10, §0, §11), `BACKLOG.md` (a new
`ML-` track), `NEEDS-YOU.md` (item 13 decided), `HANDOVER.md` (rev 7), `AGENT-HALF.md`,
`compai/planning/CHANGELOG.md`, `library/INDEX.md`, `library/development/README.md`, and this page.*

*Earlier, 2026-10-05 — **the model layer is designed, and the work turned out to be four small
changes.** [`library/development/ARCHITECTURE-model-server-integration.md`](library/development/ARCHITECTURE-model-server-integration.md)
settles how Companai calls hosted models and how it runs open-weight ones, and it corrects the
premise of the prior `llama/` analysis: that analysis assumed the model control plane would have to be
built, and **it already exists in the code** — a 7-tier resolution chain (`model-factory.ts`), a
provider registry, **11** OpenAI-compatible presets, a tenant model allowlist, per-agent overrides and
token metering. So **llama.cpp is one preset entry, not a project.** Two defects were found and
measured, both of which the prior analysis missed: the `model` service command has **no `--jinja`**
(Hermes' own docs say llama.cpp then ignores the `tools` parameter, and the COOKBOOK's Step 4 table
records exactly that symptom — an agent turn where the model picked a tool and **nothing reached the
platform**), and **B-16 was root-caused** to a missing `OPENAI_BASE_URL` on the `mcp` service, which
is why its error text is OpenAI's own `invalid_api_key` rather than anything from our server. Two
hostile passes ran and falsified **seven** of the document's own claims, all corrected rather than
defended. **One decision is the owner's** and is recommended, not closed: the long-term default
(**item 13** in `NEEDS-YOU.md`). Docs updated in the same change: the new integration document,
`BLOCKERS.md` (B-16), `BACKLOG.md` (seven new deferred rows, each with its trigger), `NEEDS-YOU.md`
(item 13), `ARCHITECTURE.md`, `HANDOVER.md`, `RUNBOOK-sprint0.md`, `workspace/COOKBOOK.md` (steps 3.2
and 3.3) and this page.*

*Earlier, 2026-10-05 — **`B-05` is DECIDED: the owner approved the runtime boundary.** One
product, one repository, one deployment, one interface (ours), with Hermes as a **supervised private
runtime process behind the internal port**; Hermes is **headless**. The owner challenged the
recommendation with three questions first, and all three were answered from the source rather than
argued; two hostile passes then broke four of the document's own claims, which were corrected rather
than defended. Four independent readings of the source agree on the shape: Hermes' own integration
guide, Hermes' own front-end shape (its Desktop client spawns its backend as a child process), Hermes'
own live-session hand-off lane, and our own `ARCHITECTURE.md` §5, `B-01` and Sprint 0. **The spec's
40-row register is now `36 settled · 1 derived · 3 deferred · 0 open`.** What the decision does *not*
cover: *when* OpenCode goes (**N-8**), and the Hermes **profile** topology (deferred, trigger: the
agent gateway). Docs updated in the same change: `ARCHITECTURE-hermes-integration.md` §11,
`AGENT-HALF.md`, `BLOCKERS.md`, `SPEC-business-model-kernel.md`, `BACKLOG.md`, `ARCHITECTURE.md`,
`HANDOVER.md`, `NEEDS-YOU.md`, `RUNBOOK-sprint0.md`, `workspace/COOKBOOK.md` and this page.*

*Earlier, 2026-10-05 — **`G-01` is built: the Business Model Kernel exists in the code.** The
canonical, versioned model now sits above the physical database as a **view over the declarations the
platform already keeps** — it holds no copy, so there is one source of truth. New code in
`packages/shared/src/lib/kernel/` (canonical IDs, the model and its contract, the export/import
round-trip, rename planning, and the live wiring that reads the registered modules), plus one drift
guard in `core` that proves the kernel's view equals the installer's view. Committed in the code repo
as **`ee406e8`**. **The plan's test — the export/reimport round-trip is empty — passes**, with a guard
that the export is non-empty first so the empty diff is not vacuous. Measured: kernel 5 suites / 51
tests; shared 170 suites / 1909 tests; drift guard 4/4; `tsc` clean in shared, cli and core. **The next
build item is `G-02` — the Business IR + the compiler.** Docs updated in the same change: `BACKLOG.md`
(the `G-01` line, and every "needs G-01" marker), `HANDOVER.md` (rev 4), `START-PROMPT.md`,
`SPEC-business-model-kernel.md` (new §10a), and `workspace/COOKBOOK.md` (Sprint G-01).*

*Earlier, 2026-10-05 — **the Business Model Kernel specification is finished, and it passes the
vision's own gate.** [`library/development/SPEC-business-model-kernel.md`](library/development/SPEC-business-model-kernel.md)
is now **Draft 2**: it closes all 18 items Draft 1 left partly or wholly open and adds five normative
sections (§12–§16: ID grammar, tool policy, approval token, outbox, capability manifest). Parsed from
the 40 rows of the vision's Appendix-D test: **35 settled · 1 derived · 3 deferred with named triggers ·
1 open — the owner's Hermes boundary**. *(That last row was **approved by the owner on 2026-10-05**,
so the register now reads **36 settled · 1 derived · 3 deferred · 0 open**.)* The gate is passed;
**only the owner's ratification remains**
([`NEEDS-YOU.md`](library/development/NEEDS-YOU.md) item 4). The first build item is now **`G-01` — the
Business Model Kernel itself**. Docs updated in the same change: `BACKLOG.md`, `HANDOVER.md` (rev 3),
`NEEDS-YOU.md`, `START-PROMPT.md`, `workspace/COOKBOOK.md` (Sprint P0-spec), `AGENT-HALF.md`, and
`library/INDEX.md`. Two **code gaps** found while writing it are logged for later: `PrincipalKind` has
4 values against the vision's 5, and the audit ledger carries no `policy_version`/`decision_id`
(assigned to **G-16**).*

*Earlier, 2026-10-05 — **the handover is rewritten for an agent taking over, and there is now a
start prompt.** [`library/development/HANDOVER.md`](library/development/HANDOVER.md) gained **§0** (the
agent's first moves, and what it may not do), **§6c** (where the project's memory lives — the curated
project memory, the daily session logs, and **50 reusable techniques** in `~/.workbuddy-ai/skills/`),
and a re-measured §7. The new
[`library/development/START-PROMPT.md`](library/development/START-PROMPT.md) is the ready-to-paste
first message for a fresh session. Three documents that contradicted the running system were corrected
in the same change: the Sprint-0 runbook said the stack was down (**it is up — 8 containers**), and
`ARCHITECTURE.md` §7 still listed the agent-model decision as open (**it was answered 2026-10-05**).*

*Earlier, 2026-10-05 — **the agent half is designed and wired into the plan.** The owner answered
the one open decision: agents are **five kinds** (*personal · role · context · independent · system*),
and every action an agent takes is answerable to a **person**. It needs no new authorization model —
the platform already has `ai_worker` for identity and the `A0`–`A5` gates for autonomy. The write-up
is the new [`library/development/AGENT-HALF.md`](library/development/AGENT-HALF.md), which also maps
every lesson of the study to the phase it lands in; the folder map and the §6 table point at it, and
`library/development/BACKLOG.md` gained the `AH-` items (two tracks, one list).*

*Earlier, 2026-10-05 — **the agent study is complete, and the scattered source documents now have one home.** The Paperclip + Hermes study finished all eleven batches; its synthesis
([`library/paperclip-hermes-study/findings/10-lessons-and-target-design.md`](library/paperclip-hermes-study/findings/10-lessons-and-target-design.md))
is now the reference for the agent half of the platform — what we take, what we reject, and how we
do it better — and the map and the §6 lookup table point at it. A new folder,
[`library/ai/source-docs/`](library/ai/source-docs/README.md), gathers the source documents the study
cites: **its register is tracked, the copies are not** (the project's standing rule). `library/INDEX.md`
gained a section for the study and was renumbered 1–9; and its "deliberately not copied" table no
longer calls `where_we_left.md` "the one status document kept current" — the same stale-info fix
applied to this page earlier the same day.*

*Earlier, 2026-10-05 — **outdated information swept out of this page.** The owner's rule:
"outdated info is wrong info". Fixed: the page no longer sends a returning reader to
`where_we_left.md` as "the one status document kept current" (it is a 2026-08-13 snapshot, stale by
its own admission); the Health row no longer quotes a stale test count as current (the two status
documents disagree — re-run the gate); the **Plesk** deployment reference is now marked superseded
and points at the hosting runbooks instead; and the map, the work loop and the §6 table no longer
call `workspace/PROGRESS.md` "the only plan" — **`library/development/BACKLOG.md` is the one
roadmap.** The map also now lists `library/development/HANDOVER.md`, the `vms/` folder and
`paperclip-master.zip`.*

*Earlier, 2026-10-05 — **there is now a handover document**, at
[`library/development/HANDOVER.md`](library/development/HANDOVER.md). It is the front door for a
newcomer: what exists, where it is, the two-repository layout, the two-products-called-Companai
trap, the gitignored `vms/` folder, the host VM (`Platform-Server`, `172.28.50.2`, reachable only
from the laptop), the mandatory Node-24 export, the standing rules, and the honest split between
what is proven and what is not. This page remains the folder map.*

*Earlier, 2026-10-04 — **a development management hub now exists**, at
[`library/development/`](library/development/README.md): one roadmap ([`BACKLOG.md`](library/development/BACKLOG.md)),
the architecture of the three pieces ([`ARCHITECTURE.md`](library/development/ARCHITECTURE.md)), and
the handover order. The old roadmaps (`workspace/PROGRESS.md`, `where_we_left.md`) are
superseded by the backlog and kept only for their reasoning. Also: **the analysis programme is
complete, all 12 batches done, and the development plan exists.** Twelve batches mapped the vision against Hermes and the
starting-kit and turned the result into a plan:
[`library/analysis/findings/12-development-plan.md`](library/analysis/findings/12-development-plan.md).
The headline: **of 140 requirements, the starting-kit covers 20, partly covers 50, misses 64,
and conflicts with Hermes on 3; Hermes is the wrong place to look for 85 by design.** The
one-line answer: **the platform half is bought, the agent half is borrowed, and the product
half — the model spine and the data-level security — is neither, and must be built.** The
first move is not code: it is the **Business Model Kernel specification**, the vision's own
gate. See [`library/analysis/LOG.md`](library/analysis/LOG.md) for the batch-by-batch record.*

*Earlier, 2026-10-03 — **the analysis programme was re-scoped, and its first vision
batch is done.** The focus is now three things only: understand the vision
([`library/ai/ai-first/`](library/ai/ai-first/)), measure Hermes and the starting-kit from
their code, and use the rest of the library only to understand Hermes — fact-checked.
Everything else is out of scope for now. See
[`library/analysis/PLAN.md`](library/analysis/PLAN.md) and
[`library/analysis/findings/01-vision-frame.md`](library/analysis/findings/01-vision-frame.md).
The headline finding: our own design and the vision were written without knowledge of each
other and **agree on eight core rules** — but they differ on what sits at the centre, so
they are compared, not merged.*

*Earlier, 2026-10-03 — **analysis batch 0 done.** The names are settled and every input is
pinned: see [`library/analysis/findings/00-inventory.md`](library/analysis/findings/00-inventory.md).
It confirms that **two different products are called Companai**, and it found a sibling
document sitting in this root (`companai.md`) plus two folders that could have leaked
secrets into git — both now gitignored. Also fixed: the library's rebuild command would
have deleted `library/ai/` and `library/analysis/`; it no longer can. The documentation
library itself was added earlier: 521 documents in `library/`, nothing stored twice.*

*Earlier, 2026-08-10 — the approvals queue is a screen at `/backend/authority/approvals`, and the test gate no longer depends on machine load. Every autonomy gate binds: refuse, hold-for-approval, hold-and-commit, execute-and-review. Gate green: 22/22 tasks, 12,845 tests, ~7 min.*
