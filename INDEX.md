# START HERE

**You have just been handed this project and know nothing about it. This page is
the only thing you need to read first.** Everything else is reachable from here.

---

## 1. What we are building, in one paragraph

An **operating system for companies** where human employees and AI employees work
side by side — same org chart, same tasks, same rules about who may do what. A
business describes itself in plain language; the platform researches it, proposes
a complete structure (departments, roles, workflows, knowledge, AI workers), a
human approves it, and then the platform *runs* that company day to day.

The thing that makes it different is not the AI. It is the **governance layer** —
one place that decides whether any actor, human or machine, may take any action,
and can always explain why.

## 2. Where the project stands today

| | |
|---|---|
| **Phase** | Building the Starting Kit |
| **Decision made** | We are building on **Open Mercato**, a working platform we have forked permanently |
| **Where the code is** | [`workspace/starting-kit/`](workspace/starting-kit/) |
| **Health** | **Green.** Boots clean, 44/44 admin pages, zero server errors. typecheck 20/20 · lint 1/1 · build 20/20 · **test 22/22 tasks, 12,283 passed, 0 failed** |
| **Current work** | **All six repairs in**, resolver running in shadow mode, and the audit trail can now tell a machine from a person. Next: enforcement, once the shadow has seen enough traffic |
| **Progress tracker** | [`workspace/PROGRESS.md`](workspace/PROGRESS.md) — every batch, what is done, what is next |
| **The ERP is off** | 14 modules **parked**, not deleted — 136 tables instead of 263. One line each to restore: [`workspace/references/parked-modules.md`](workspace/references/parked-modules.md) |
| **Actually deleted** | Only `packages/enterprise`, because its licence forbids redistribution |
| **Run it yourself** | [`workspace/references/local-instance.md`](workspace/references/local-instance.md) — laptop only, no cloud |

## 3. The four things to read, in order

Read these and you will understand the project. About an hour.

| # | Read | Why |
|---|---|---|
| 1 | [`compai/planning/00-product-thesis.md`](compai/planning/00-product-thesis.md) | What we are building and the 15 rules that must never be broken |
| 2 | [`compai/planning/09-starting-kit.md`](compai/planning/09-starting-kit.md) | **In plain English** — what the platform gives us and what we still have to build |
| 3 | [`compai/planning/08-host-selection-and-migration-plan.md`](compai/planning/08-host-selection-and-migration-plan.md) | Why we chose this platform and what happens next |
| 4 | [`workspace/COOKBOOK.md`](workspace/COOKBOOK.md) | How the work is actually done |

Then, before touching anything: [`LESSONS.md`](LESSONS.md) — the mistakes already
made and how they were caught. It will save you from repeating them.

## 4. The map — every folder explained

```text
companai/                      ← you are here
├── INDEX.md                   this page — always start here
├── JOURNAL.md                 what happened, in order, with dates
├── LESSONS.md                 mistakes made, how they were caught, how to avoid them
│
├── compai/                    THINKING — no code
│   ├── brainstorming/         where the idea came from (3 documents)
│   └── planning/              the design (12 documents) — see its own README
│       ├── method/            how we assess a candidate platform
│       └── platforms/         one folder per platform we assessed
│
├── workspace/                 BUILDING — this is where work happens
│   ├── COOKBOOK.md            the development cookbook — read before touching code
│   ├── PROGRESS.md            which batch we are on, out of 16
│   ├── knowledge/             HOW THE PLATFORM WORKS — reusable know-how
│   ├── references/            the detail behind the cookbook
│   ├── salvage/               one report per module analysed — what each contains
│   ├── attic/                 rescued code patterns + CATALOG.md (little here: we park, not delete)
│   ├── scripts/               checkpoint.sh — restore points before risky work
│   ├── .backups/              database + env snapshots (newest 5 kept, auto-pruned)
│   ├── .toolchain/            our own Node 24 — do not use the system Node
│   └── starting-kit/          THE CODEBASE
│
├── Platform/                  Candidate 1 — assessed, not chosen. Reference only.
├── open-mercato-main/         Candidate 2 — the original, unmodified. Reference only.
└── skills-main/               The agent methodology our process is based on
```

⚠️ **Naming trap:** the outer folder is `companai`, the inner one is `compai`.
Different spellings, not a typo you should "fix" — paths depend on both.

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
| **Know how far along we are** | [`workspace/PROGRESS.md`](workspace/PROGRESS.md) |
| **See every outstanding task, in order** | [`workspace/PROGRESS.md`](workspace/PROGRESS.md) → *The backlog* |
| See what happened and when | [`JOURNAL.md`](JOURNAL.md) |
| Avoid a known trap | [`LESSONS.md`](LESSONS.md) |
| **Check if we already built something** | [`workspace/attic/CATALOG.md`](workspace/attic/CATALOG.md) |
| Turn a parked module back on | [`workspace/references/parked-modules.md`](workspace/references/parked-modules.md) |
| Assess a new platform | [`compai/planning/method/platform-assessment-methodology.md`](compai/planning/method/platform-assessment-methodology.md) |

## 7. Maintaining this page

**This page is part of the work, not documentation about the work.** Whoever adds
a folder, finishes a phase, or makes a decision updates it in the same change.

A newcomer who cannot orient themselves from this page alone means it is broken —
fix the page, not the newcomer.

*Last updated: 2026-08-09 — R2 complete. Gate green: 22/22 tasks, 12,283 tests.*
