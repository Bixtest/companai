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
| **Health** | **Green.** Boots clean, zero server errors. **Gate: 22/22 tasks, 12,845 tests, ~7 min** (2026-08-11). The two causes of intermittent false reds are fixed and measured — see [`knowledge/test-gate.md`](workspace/knowledge/test-gate.md) for what they were and how to diagnose the next one |
| **Current work** | **The governance layer decides, every autonomy gate binds, and a person can work the queue.** All six repairs in; the resolver enforces per tenant; A1/A2 hold an act until somebody approves it, A3 holds it until its window passes unless vetoed, A4 runs it and files it for review; acts are graded by the data they touch; 117 commands mapped to capabilities; the queue is a screen at **Settings → Authority → Approvals**. Next: gate stability, then the eight grafts |
| **Understand the product in 10 minutes** | [`workspace/knowledge/authority-overview.md`](workspace/knowledge/authority-overview.md) — the governance layer end to end. **This is the thing we are building** |
| **Progress tracker** | [`workspace/PROGRESS.md`](workspace/PROGRESS.md) — every batch, what is done, what is next |
| **The ERP is off** | 14 modules **parked**, not deleted — 136 tables instead of 263. One line each to restore: [`workspace/references/parked-modules.md`](workspace/references/parked-modules.md) |
| **Actually deleted** | Only `packages/enterprise`, because its licence forbids redistribution |
| **Run it yourself** | [`workspace/references/local-instance.md`](workspace/references/local-instance.md) — laptop only, no cloud |
| **Deploy it to a server** | [`workspace/references/deployment.md`](workspace/references/deployment.md) — VPS, domain or subdomain, Plesk. Build order, database, env, workers, nginx, and what it deliberately does not cover |

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
├── compai/                    THINKING — no code
│   ├── brainstorming/         where the idea came from (3 documents)
│   └── planning/              the design (12 documents) — see its own README
│       ├── method/            how we assess a candidate platform
│       └── platforms/         one folder per platform we assessed
│
├── workspace/                 BUILDING — this is where work happens
│   ├── COOKBOOK.md            the development cookbook — read before touching code
│   ├── PROGRESS.md            THE ROADMAP — everything left, in order. The only plan
│   ├── knowledge/             HOW THE PLATFORM WORKS — reusable know-how
│   ├── references/            the detail behind the cookbook
│   ├── salvage/               one report per module analysed — what each contains
│   ├── attic/                 rescued code patterns + CATALOG.md (little here: we park, not delete)
│   ├── scripts/               checkpoint.sh — restore points before risky work
│   ├── .backups/              database + env snapshots (newest 5 kept, auto-pruned)
│   ├── .toolchain/            our own Node 24 — do not use the system Node
│   └── starting-kit/          THE CODEBASE
│
├── Platform/                  Candidate 1 — assessed, not chosen. Source of the G1–G8 grafts
├── open-mercato-main/         Candidate 2 — the original, unmodified. Diff against it
└── skills-main/               The agent methodology our process is based on
```

**The three folders at the bottom are gitignored on purpose.** They are read-only
reference trees, not our code — `Platform/` is where the authority ideas came
from, and `open-mercato-main/` is the pristine upstream to diff against when you
need to know whether we changed something or inherited it. **Every line of code we
own lives in `workspace/starting-kit/` and nowhere else.**

⚠️ **Naming trap:** the outer folder is `companai`, the inner one is `compai`.
Different spellings, not a typo you should "fix" — paths depend on both.

## 4b. How to pick up the work — the loop

Every batch runs the same way. Nothing here is optional.

**1. Find out what is next.**
[`workspace/PROGRESS.md`](workspace/PROGRESS.md) is the roadmap and the only plan.
It is ordered; take item 1 unless you have a reason not to. If you have a reason,
say it and re-order the list — the list is the memory, not you. Never work on
something that is not on it; add it first.

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
| **Put it on a server** | [`workspace/references/deployment.md`](workspace/references/deployment.md) |
| **See everything left to do, in order** | [`workspace/PROGRESS.md`](workspace/PROGRESS.md) — the roadmap, and the only plan |
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

*Last updated: 2026-08-10 — the approvals queue is a screen at `/backend/authority/approvals`, and the test gate no longer depends on machine load. Every autonomy gate binds: refuse, hold-for-approval, hold-and-commit, execute-and-review. Gate green: 22/22 tasks, 12,845 tests, ~7 min.*
