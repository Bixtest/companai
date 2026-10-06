# Handover — start here if you have just inherited this project

**You know nothing about this project, this codebase, or these documents. This page is
written for exactly that person — and this revision is written for an agent that will
continue the development work.** Read it top to bottom once (about 20 minutes), then
follow §2 to actually get working. Everything else in the project is reachable from here.

**Written 2026-10-05, revision 9 (2026-10-06). Owner: Ramzi. Development machine: `BIXMASERVER` (Windows 10 Pro).**

> This is the **handover**. It is not a status page and not a roadmap — it is the one
> document that tells you what exists, where it is, and in what order to open it.
> For *what is left*, read [`BACKLOG.md`](BACKLOG.md). For *what happened*, read
> [`../../JOURNAL.md`](../../JOURNAL.md). For *what to avoid*, read [`../../LESSONS.md`](../../LESSONS.md).
> **The message that starts a new session is [`START-PROMPT.md`](START-PROMPT.md).**

---

## 0. If you are an agent taking over

**What you are inheriting.** A project that has finished *thinking* and is ready to *build*. The
analysis is complete, the agent study is complete, the specification has a first draft, and the
plan is settled. **Nothing is blocked.** What is left is the build, and the first item is named in
§2 step 7.

**Five things to do before you touch anything:**

1. **Read this page, then the eight files in §2 step 1.** Do not skip the lessons.
2. **Set the environment export** (§2 step 2). Every terminal, every session.
3. **Confirm both repositories are clean** (§2 step 3), and that the stack is up (§2 step 4).
4. **Read the project's memory** (§6c) — it holds the rules that were learned the hard way, and
   **50 reusable techniques** the previous sessions wrote from this very project.
5. **Take the first backlog item** (§2 step 7) and work it in the four-step sprint process
   (README §"The sprint process") — **no code before step 3.**

**What you may not do.** The admin password is the owner's and he types it; you never write it to a
file or type it into a form. You never `git add -A`. You never take an irreversible action without
a checkpoint. You never close a decision that is his — see §6b.

---

## 1. The 60-second version

**What we are building.** An **operating system for companies** where human employees and AI
employees work side by side — one org chart, one task model, one set of rules about who may do
what. A business describes itself in plain language; the platform proposes a complete structure
(departments, roles, workflows, knowledge, AI workers); a human approves it; then the platform
*runs* that company day to day.

**The thing that makes it different is not the AI.** It is the **governance layer** — one place
that decides whether any actor, human or machine, may take any action, and can always explain
why. Every act is checked against every ceiling that applies, and the answer is always the
*minimum* of them: **nothing anywhere can raise a gate.** That property is the product. It is
built, and it works.

**What already exists, in three pieces** (see [`ARCHITECTURE.md`](ARCHITECTURE.md)):

| Piece | What it is | Where |
|---|---|---|
| **The Starting Kit** | The platform/product. A permanent fork of **Open Mercato 0.6.7**, rebranded to Companai. The governance layer (authority, approvals, delegations, denials, trust, projects, record locks, the ledger) is **ours** and does not exist upstream | [`../../workspace/starting-kit/`](../../workspace/starting-kit/) |
| **Hermes** | The **agent runtime** — the thing that will hold the AI-employee half. It is *borrowed* (a sibling project's code), not ours | [`../ai/hermes-agent-main/`](../ai/hermes-agent-main/) |
| **The model server** | Local inference (llama.cpp) serving a quantised Qwen2.5-7B model on `:8080`. No cloud dependency. **The full model-layer design is [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md)** (2026-10-05): the platform already owns a model control plane, llama.cpp needs one preset entry, and **the owner decided the long-term default on 2026-10-05 — per-tenant policy as the destination, cloud-first as the interim** (§9), which requires a platform-managed local model (§6.4) | [`ARCHITECTURE.md`](ARCHITECTURE.md) §5, and the integration document |

Two arrows connect them: **(1)** the agent reaches the platform's tools over MCP, authorised by
our own gate; **(2)** the agent asks the model server for inference. Both were proven working on
2026-10-04.

**One-line summary of where we are:** *the platform half is **bought**, the agent half is
**borrowed**, and the product half — the model spine and the data-level security — is **neither**,
and must be built.*

---

## 2. Day one — the exact sequence

**Do these in order. Do not skip the lessons.**

**1. Read these eight files** (about two hours total). They are ordered so each one assumes the last:

> **In a hurry?** [`BOOKMARKS.md`](BOOKMARKS.md) is the one-page short list: the handful of
> documents that matter, the **end-game / vision** documents, and which folders are in git.

| # | Read | Why |
|---|---|---|
| 1 | [`../../INDEX.md`](../../INDEX.md) | The map of every folder, and the rules that matter most |
| 2 | **This file** | What exists, where, and the traps |
| 3 | [`BACKLOG.md`](BACKLOG.md) | **What is left**, in order, one line each — the single plan |
| 4 | [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the three pieces run together |
| 5 | [`../../compai/planning/00-product-thesis.md`](../../compai/planning/00-product-thesis.md) | **What we are building**, and the 15 rules that must never be broken |
| 6 | [`../analysis/findings/12-development-plan.md`](../analysis/findings/12-development-plan.md) | **The plan** — phases, order, why |
| 7 | [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) | **How the work is done** — read before touching code |
| 8 | [`../../LESSONS.md`](../../LESSONS.md) | 82 mistakes already made, so you do not repeat them |

**Then, before you write any code:** [`../../workspace/knowledge/authority-overview.md`](../../workspace/knowledge/authority-overview.md)
— the governance layer end to end. **That layer is the product.** Everything else is plumbing.
For the agent half, read [`AGENT-HALF.md`](AGENT-HALF.md) — the model and the plan.

**2. Set up your shell — every terminal, every session.** Node 24 is project-local and mandatory:

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
```

Wrong Node produces results that describe *the laptop*, not *the platform*. See
[`../../workspace/references/environment.md`](../../workspace/references/environment.md).

**3. Check both repositories are clean.** There are **two** git repositories (see §3a). Nothing
should be half-finished on disk:

```bash
cd /c/Users/Ramzi/Downloads/companai               && git status --short   # thinking + docs
cd /c/Users/Ramzi/Downloads/companai/workspace/starting-kit && git status --short   # the code
```

**4. Confirm the stack is up.** It was running when this page was written — eight containers,
the app on `http://localhost:3000`, loopback only:

```bash
docker ps --format '{{.Names}}\t{{.Status}}'   # expect 8 containers, every one "(healthy)" — a COUNT is not enough
curl -s --noproxy '*' -o /dev/null -w '%{http_code}\n' http://localhost:3000/login   # expect 200
```

**Do not trust the count.** On 2026-10-06 eight rows were present while `redis` had exited and
`mcp` was unhealthy — `docker ps` counted rows, not health. Read the **Status** column.

If nothing is running, **Docker Desktop must be started first, and only the owner can start it**
(see §5). Then bring the stack up per [`ARCHITECTURE.md`](ARCHITECTURE.md) §5.

**5. Run the gate, and read the `Cached:` line.** A green result *from cache* is not a green
result. `--force` for anything you are about to make a claim about:

```bash
cd workspace/starting-kit
corepack yarn generate && corepack yarn build:packages && corepack yarn typecheck && corepack yarn lint && corepack yarn test
```

Never pipe these through `head` or `tail` — you throw away the exit code.

**6. Check what needs the owner before you plan around it.** [`NEEDS-YOU.md`](NEEDS-YOU.md) is a
numbered action list. As of 2026-10-05 only **three** items are open, and none of them blocks the
build: change the Coolify password (item 5), turn on Docker Desktop auto-start (item 6), and
optionally delete the 3.8 GB ISO (item 7).

**7. Take the first item from [`BACKLOG.md`](BACKLOG.md).** **`P0-spec` is done:** draft 2 of the
Business Model Kernel specification ([`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md))
was written **2026-10-05** and passes the vision's own 40-item gate — **36 SETTLED · 1 DERIVED · 3
DEFERRED-with-trigger · 0 OPEN — owner**, tallied by parsing the 40 rows (the last open row, **B-05**,
was approved by the owner on 2026-10-05). **What is left is ratification**
(item 4 of [`NEEDS-YOU.md`](NEEDS-YOU.md)).

**`G-01` (the Business Model Kernel + `G-08`) is now built** — **2026-10-05**, committed in the code repo
as `ee406e8`. The canonical model is a **view** over the declarations the platform already keeps, so
there is one source of truth; the plan's test (**the export/reimport round-trip is empty**) passes, with
a non-empty-export guard so the empty diff is not vacuous.

**`G-02` (the Business IR + the compiler) is now built** — **2026-10-05**. The typed **read** and
**write** shapes the AI produces instead of SQL (spec §6), and the compiler that turns a read into the
physical query the platform already runs — **§51's ten stages, named one-for-one**. **The plan's test —
the rename test — passes both directions and at two levels:** the old IR compiled against a renamed
model **fails** (never a silent compile), and the rename-aware entry says **requires recompilation** and
names the destination, using **G-01's own** rename planner. **The IR has no scope field**, so it cannot
widen its own reach.

**`G-03` (User Functions) is now built** — **2026-10-05. This completes the four-item critical path:**
`spec ✅ → G-01 ✅ → G-02 ✅ → G-03 ✅`. A User Function is *"a validated, reusable business operation
created by the user with AI assistance and executable without AI once published"* — the product's
distinctive feature. It is **compiled IR made durable** (RQ-24): the artifact, an **enforced** lifecycle
(only `published`/`active` run), **objective verification** that calls G-02's compiler rather than
re-implementing it, a fingerprint, a **document** whose round-trip is empty, and **zero-AI execution**.
**The plan's decisive test — "switch the model off and run a Function" — is met by two routes:** the
runner **has no AI argument at all**, and an **import-graph test** proves nothing it reaches imports the
AI side. That structural route was **falsified, not asserted** (an AI import was planted outside the
module and the check failed, naming the file). **Four defects were found by three critic passes and all
four are fixed** — including one in the compiler (`modelVersionOf` could not see a field being
**retyped**, so a stale Function reported itself *fresh*) and one that let a **sort** be silently
dropped. **One hole is OPEN with a named trigger** (see BACKLOG). **Deliberately not built:** a database
row (trigger: **G-07** — **now fired**; the row is startable, and our call is to write it at **G-09** in
one migration with the registry's own row) and placement in the interface (that **is** G-07).

**`G-07` (the Widget contract, the Widget IR and the registry) is now built** — **2026-10-05**. A
published Function, placed in a Widget, **runs from the Widget's own inputs with no AI** — the vision's
own reusable chain, made real. **The next build item is the first unbuilt item in
[`BACKLOG.md`](BACKLOG.md) §"The list"** — at the time of writing, **`S0`** (a re-run of the local
dockerised trio, which needs the owner to start Docker Desktop first) and then **`G-12`** (business
backup and restore). `G-03` also unblocked `G-17` and `G-19` further.

**Verify an item's status is still true before starting it** — the roadmap has been
wrong about what is already done **four times**.

### What to study first, by role

| If your job is… | Study first |
|---|---|
| **Understanding the product** | `00-product-thesis.md` → `findings/01-vision-frame.md` → `findings/12-development-plan.md` |
| **Writing code** | `COOKBOOK.md` → `workspace/knowledge/` (20 concept files) → `workspace/references/environment.md` |
| **Running it** | `ARCHITECTURE.md` → `workspace/references/local-instance.md` |
| **Hosting / domains** | [`RUNBOOK-adding-a-domain-step-by-step.md`](RUNBOOK-adding-a-domain-step-by-step.md) → [`RUNBOOK-hosting-server-manual.md`](RUNBOOK-hosting-server-manual.md) |
| **Testing it** | `workspace/references/how-to-test.md` → `workspace/knowledge/test-gate.md` |
| **Picking up the analysis** | [`../analysis/PLAN.md`](../analysis/PLAN.md) → [`../analysis/LOG.md`](../analysis/LOG.md) → the `findings/` reports |
| **Designing the agent half** (AI staff, roles, tasks, delegation, triggers, meetings) | [`AGENT-HALF.md`](AGENT-HALF.md) — **the model and the plan** — then [`../paperclip-hermes-study/findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md) — **the synthesis** — for the evidence behind each lesson, and its [`PLAN.md`](../paperclip-hermes-study/PLAN.md) for how it was derived |
| **Deciding whether to take an idea from upstream Paperclip** | [`../paperclip-value-study/findings/07-synthesis.md`](../paperclip-value-study/findings/07-synthesis.md) — **the answer of the second, wider pass.** Six things worth acting on, four of our items confirmed correct, eight rejections with a reason each, and the trap list |

---

## 3. The traps a newcomer cannot discover

**These are the things that will waste your first day if nobody tells you. Nobody can find them
by reading the code — they are facts about the layout and the history.**

### 3a. There are **two** git repositories, not one

| Repo | Path | Branch | Holds |
|---|---|---|---|
| **Repo 1 — thinking & docs** | `C:\Users\Ramzi\Downloads\companai` | `master` | `INDEX.md`, `JOURNAL.md`, `LESSONS.md`, `library/`, `compai/`, `workspace/` (the non-code parts) |
| **Repo 2 — the code** | `...\companai\workspace\starting-kit` | `main` | **every line of code we own** — 21 packages, 1 app |

**Every batch ends with a commit in *both* repositories, and files are staged explicitly by
path.** `git add -A` once swept **10,448 of the owner's unrelated files** into a commit. Never
use it here.

### 3b. **Two different products are called "Companai"**

One is ours. One is a **sibling project** that happens to share the name. If you are about to
read a "Companai" document, **check its path first**:

- `aissistant-package/` at the root — ⚠️ **NOT OURS.** The sibling's codebase (a Paperclip fork). Do not edit, do not deploy from it.
- `companai.md` at the root — ⚠️ **NOT OURS.** A sibling document. It *reads* as a vision statement for our product. It is not one. It is the most misleading file in the folder.
- `library/ai/hermes-docs/` — a sibling's docs. **Lessons only, never decisions.**

Full evidence and the glossary: [`../analysis/findings/00-inventory.md`](../analysis/findings/00-inventory.md)
and [`../ai/README.md`](../ai/README.md). **Read the AI README before using any AI document.**

### 3c. **Naming traps — do not "fix" these**

- The outer folder is **`companai`**, the inner one is **`compai`**. Different spellings, both
  real. Paths depend on both.
- The owner's domain is **`corprorate.com`** — the misspelling is **deliberate and
  owner-confirmed.** Do not correct it.
- Item numbers (`15b`, `21c`, `24b`) are **not a sequence** — they grew by insertion. A gap does
  not mean something is missing.

### 3d. `vms/` is **gitignored** — and that matters

`.gitignore` line 105 excludes `vms/`, because it holds the VM credentials, a 4 GB ISO and a seed
ISO. **Consequence:** anything written there is **untracked** and dies with the laptop's disk.

**This was already fixed for the deployment scripts.** Their durable copy lives at
[`../../workspace/scripts/vm-platform/`](../../workspace/scripts/vm-platform/), and
`check-in-step.sh` proves the tracked copy still matches the working copy:

```bash
sh workspace/scripts/vm-platform/check-in-step.sh   # prints "in step", exit 0
```

**If you add a script to `vms/`, copy it into `workspace/scripts/vm-platform/` in the same
batch** — and check it for secrets *before* copying, not after.

### 3e. Node 24 is project-local, and the export is mandatory

`workspace/.toolchain/node24` is a private Node 24 install. **The system Node is 22 and the
platform refuses to run on it.** Every command in every terminal begins with the export in §2.
This is not optional and not a preference.

### 3f. `where_we_left.md` and `PROGRESS.md` are stale — by their own admission

- [`../../where_we_left.md`](../../where_we_left.md) is a **2026-08-13 snapshot**, self-labelled
  out of date. Keep it only for its *traps*, *"things that look broken and are not"* and *"how to
  work here"* sections — those are still accurate.
- `workspace/PROGRESS.md` has **three overlapping checklists that disagree with each other.**
  Trust [`BACKLOG.md`](BACKLOG.md) for status; use `PROGRESS.md` only for the *reasoning* behind
  an item.
- [`BLOCKERS.md`](BLOCKERS.md) **is** current and re-checked each session.

### 3g. Things that look broken and are **not**

- **The admin dashboard is empty.** Deliberate — upstream's widgets all read parked modules, so
  they are disabled rather than render ten red panels. Fixing it properly is backlog item **27**.
- **Fourteen modules are parked, not deleted.** Switched off in `apps/mercato/src/modules.ts`;
  they create no tables and serve no routes, but stay readable and restorable in seconds. See
  `workspace/references/parked-modules.md`.
- **Only `packages/enterprise` was ever actually deleted** — its licence forbids redistribution.
- **The MCP logs `Failed to index 21 tools … Invalid OpenAI API key`.** **Root-caused 2026-10-05, and
  the old description was half the story** (**B-16**). That error text is OpenAI's own code, so the
  call never reached our server: the **`mcp` service is missing `OPENAI_BASE_URL`** (it is set for
  `app` and `opencode` and not for `mcp`). The second, also-real defect is that the `model` service
  has no embedding model. All 21 tools register and are callable; only semantic search over tools is
  degraded. See [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) §6.2.

### 3h. The one rule that matters most

**Every claim comes with an observation attached, not an argument.** The work that held up was
verified by *watching it happen* — loading the page, breaking the test to see it fail, reading
the database, reading the `Cached:` line. **The work that had to be retracted was reasoned from
reading code.** If you are about to say "the cause is X" and have not observed X, you are
guessing. See `COOKBOOK.md` rule zero-nine.

### 3i. Folders on disk that are **not** in git

**The repository versions our thinking, not everything on disk.** A few folders the design depends
on were sitting in the working tree **untracked**, so a fresh clone would not have had them. Named
here so nobody assumes a folder travels with the repository when it only exists on this laptop:

- `llama/` (the eight documents the model-layer design was built from) and `analysis/` (the earlier
  Hermes / Starting Kit study) are **ours and are now tracked** (2026-10-05). Before that they were
  untracked, and both are cited by the development documents, so the citations pointed at files a
  clone would not have.
- `hermes-agent-main/` at the repository root is the **Hermes runtime source** (somebody else's
  code, ~17,000 files). It is **ignored** (2026-10-05), matching its twin `library/ai/hermes-agent-main/`.
- `library/ai/hermes-agent-main/`, `library/ai/hermes-docs/`, `library/ai/paperclip-master/`,
  `library/kit-docs/` and the 16 numbered shelves are **ignored by design** — rebuildable or
  external. The rule and the reasons are commented in `.gitignore`.
- `vms/` and `keys/` are ignored because they hold **secrets** (§3d).

**The full, honest list is [`BOOKMARKS.md`](BOOKMARKS.md) §5.**

---

## 4. Where everything lives — the folder map

```text
companai/                       ← repo 1 root (thinking + docs).  You are here.
├── INDEX.md                    the map of every folder — start here after this file
├── JOURNAL.md                  what happened, in order, with dates (3,242 lines)
├── LESSONS.md                  mistakes made, how they were caught (2,746 lines, L1–L82)
├── where_we_left.md            ⚠️ stale (2026-08-13) — traps only
│                               (THIS FILE is not at the root — it lives at
│                                library/development/HANDOVER.md, below)
│
├── library/                    EVERYTHING DOCUMENTED, IN ONE PLACE (3,441 markdown files, measured 2026-10-05)
│   ├── INDEX.md                what each shelf is, and the reading order
│   ├── PROVENANCE.md           where every shelf came from, how to rebuild it
│   ├── development/            ← DEVELOPMENT MANAGEMENT — the hub
│   │   ├── HANDOVER.md         **THIS FILE**
│   │   ├── BOOKMARKS.md        the pages to open first — the short list, and what is in git
│   │   ├── START-PROMPT.md     **the message that starts a new session**
│   │   ├── README.md           the front door: reading order, the sprint process
│   │   ├── BACKLOG.md          **THE ONE ROADMAP** — everything left, in order
│   │   ├── ARCHITECTURE.md     how Starting Kit + Hermes + model server run together
│   │   ├── ARCHITECTURE-hermes-integration.md      the Hermes boundary design (B-05, decided 2026-10-05)
│   │   ├── ARCHITECTURE-model-server-integration.md  the model layer: llama.cpp, providers, embeddings (2026-10-05)
│   │   ├── BLOCKERS.md         anything stopping progress, with what clears it
│   │   ├── NEEDS-YOU.md        **numbered list of owner-only actions** (see §8)
│   │   ├── AGENT-HALF.md       **THE AGENT HALF** — five agent kinds, the responsibility rule, and where every lesson lands
│   │   ├── RUNBOOK-*.md        hosting: the manual, the domain walkthrough, Sprint 0
│   │   └── SPEC-business-model-kernel.md   the product spec (Draft 2; 40-item gate passed, ratification pending)
│   ├── ai/                     READ ITS README FIRST — two products are called Companai
│   │   ├── ai-first/           THE DIRECTION — what we will actually build
│   │   ├── hermes-docs/        a sibling's docs. Lessons only, never decisions
│   │   ├── hermes-agent-main/  the Hermes runtime source — where it disagrees with docs, it wins
│   │   ├── paperclip-master/   upstream Paperclip — the subject of **both** studies below
│   │   └── source-docs/        ONE PLACE for the scattered source docs (register inside)
│   ├── analysis/               THE ANALYSIS PROGRAMME — complete, batches 0–12 (13 batch reports)
│   │   ├── PLAN.md             the batch plan with tickboxes — all DONE
│   │   ├── LOG.md              one dated line per batch
│   │   └── findings/           one report per batch — **batch 12 is THE DEVELOPMENT PLAN**
│   ├── paperclip-hermes-study/ THE AGENT STUDY — complete, all 11 batches, 3,940 lines
│   │   ├── PLAN.md             the batch plan with tickboxes — all DONE, each with its result
│   │   ├── LOG.md              one dated line per batch
│   │   └── findings/           one report per batch — **batch 10 is THE SYNTHESIS** (see §2)
│   ├── paperclip-value-study/  THE VALUE SCAN — complete, all 12 batches
│   │   ├── PLAN.md             the batches, the rule ("document only where there is value"), the five baselines
│   │   ├── LOG.md              one dated line per batch, including the extraction verification
│   │   └── findings/           01–06 evidence, **07 is THE ANSWER** (see §2)
│   └── canonical-architecture-v2-hybrid-ai-coolify.md   the hosting architecture
│
├── compai/                     THINKING — no code
│   ├── brainstorming/          where the idea came from
│   └── planning/               the design (12 documents) — see its own README
│
├── workspace/                  BUILDING — where work happens
│   ├── COOKBOOK.md             **the development cookbook — read before touching code** (1,187 lines)
│   ├── PROGRESS.md             ⚠️ superseded by BACKLOG.md; keeps the reasoning
│   ├── knowledge/              HOW THE PLATFORM WORKS — 20 concept files
│   ├── references/             the detail behind the cookbook (environment, deployment, testing…)
│   ├── scripts/                checkpoint.sh, and vm-platform/ (the tracked VM scripts)
│   ├── .toolchain/node24       our own Node 24 — **use this, not the system Node**
│   └── starting-kit/           ← repo 2: THE CODEBASE (21 packages, 1 app)
│
├── vms/                        ⚠️ GITIGNORED — the hosting VM's credentials, ISO, scripts
├── keys/                       ⚠️ server credentials — not documentation, keep private
├── llama/                      OUR model-layer analysis — the 8 documents the design was built from (tracked 2026-10-05)
├── analysis/                   OUR earlier Hermes / Starting Kit study — 5 findings + a forensic baseline (tracked 2026-10-05)
├── hermes-agent-main/          the Hermes runtime source at the root (⚠️ IGNORED — vendored code; its twin is in library/ai/)
├── aissistant-package/         ⚠️ NOT OURS — the sibling's codebase
└── companai.md                 ⚠️ NOT OURS — a sibling document
```

---

## 5. The two machines, and how work flows between them

**This is the part that confuses everyone, because there are two computers and only one of them
is where you work.**

| | **The laptop** (`BIXMASERVER`) | **The hosting VM** (`Platform-Server`) |
|---|---|---|
| What | Dell Precision 7510, Windows 10 Pro, i7-6820HQ (4c/8t), 32 GB RAM | Ubuntu 24.04.5, a Hyper-V virtual machine |
| Reachable at | where you are | **`172.28.50.2` — and only from this laptop** |
| Holds | the code, the docs, Docker Desktop (Sprint 0 stack) | Coolify 4.3.23, Traefik v3.6.25, the hosted sites |
| Who can reach it | you | **only the laptop.** Hyper-V Internal switch `AI-Private`, no physical adapter |

**The VM is invisible to the LAN and to any cloud agent.** That is deliberate. **Deploying happens
from the laptop; visiting happens through a tunnel.** Keep those two paths visibly separate so
nobody confuses them.

**The network *does* have a real public IP — `151.177.174.17`** (Tele2 Sweden, confirmed by three
independent services from inside the VM). But **a public address is not an open door:** port 80
on that IP was probed from **three independent outside hosts** and all three failed to connect.
So nothing reaches the VM inbound today. **The working path to the outside is a Cloudflare
Tunnel**, which needs only *outbound* port 7844 — no inbound port, no router change.

**The hosting stack, in one line each:**

- **Coolify** — the control panel. You add a *resource* (a Git app, a Docker image, or a Compose
  file) and give it a **Domains** field. Coolify then writes Traefik labels for you.
- **Traefik** — the proxy. It reads the `Host:` header on each request and sends it to the right
  container. Entrypoints `http` (80) and `https` (443) are **separate sockets**.
- **The tunnel** — `cloudflared`, installed. It makes outbound connections to Cloudflare, which
  publishes your domain and forwards to the tunnel. The public SSL certificate is **Cloudflare's**.

**Two jobs, two places — do not mix them up:**

1. **Make the name resolve** → at the registrar / Cloudflare (the owner's job).
2. **Tell Traefik which container answers** → in Coolify (our job).

**There is no DNS server on the VM**, and none is needed. Nothing listens on port 53. Plesk
shipped one; this stack deliberately does not.

**The scheme trap.** In Coolify's Domains field, **`http://` and `https://` are not cosmetic** —
they pick which listener the router binds to. Behind the tunnel, use **`http://`**. Typing
`https://` binds the router to port 443 and adds a redirect, while the tunnel arrives on port 80
→ a redirect loop and a certificate job that cannot succeed. (This was measured; recorded as L79.)

**The hosting runbooks — read these if your task is domains or hosting:**

| File | What it covers |
|---|---|
| [`RUNBOOK-hosting-server-manual.md`](RUNBOOK-hosting-server-manual.md) | **The operator manual** — connecting from the laptop, DNS, directories, databases, phpMyAdmin, SSL, WordPress, deploying another Docker platform |
| [`RUNBOOK-adding-a-domain-step-by-step.md`](RUNBOOK-adding-a-domain-step-by-step.md) | **The practical walkthrough** — GoDaddy → Cloudflare → tunnel → SSL → a live site, with all three site types |
| [`RUNBOOK-platform-server.md`](RUNBOOK-platform-server.md) | The VM itself — how it was built, owner tasks, rollback, rebuild from scratch |
| [`RUNBOOK-deploying-a-site.md`](RUNBOOK-deploying-a-site.md) | The proxy and the deployment proof in depth — what is and is not proven |
| [`RUNBOOK-sprint0.md`](RUNBOOK-sprint0.md) | Sprint 0 — running the kit on the laptop |

### The owner's two hard rules about the machine

1. **"So we don't ruin the laptop."** Prefer reversible actions; take a checkpoint before anything
   that touches the database (`./workspace/scripts/checkpoint.sh <label>`).
2. **The admin password is the owner's, and he types it.** It is **never written to a file and
   never typed into a login form by an agent.** This was committed to and honoured throughout —
   do not quietly relax it. Anything needing a click-through of the running platform needs him at
   the keyboard. Where a proof is needed, take it from container logs, the MCP's own tool list, or
   the database instead.

**Docker Desktop must be running for the Sprint 0 stack, and only the owner can start it.**
Docker Desktop's startup runs `wsl.exe`, which this machine's security policy blocks for anything
an agent launches — the block is **not approvable and must not be worked around.** `AutoStart` is
off, so this recurs on every restart. It is a **permanent owner step** ([`NEEDS-YOU.md`](NEEDS-YOU.md) item 6).
*It is running as this page is written.*

---

## 6. The rules that bind

**Full text in [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md)** — eleven rules,
`zero-zero` to `zero-ten`. These are the ones you must not break:

### 6a. The nine standing rules

1. **Never assume a decision the owner did not make.** A direction counts only when he was asked
   plainly and answered. If a better way exists, come back with a labelled **COUNTER-OPINION**.
   **But when the right answer is clear, just do it** — consulting too much is its own failure.
2. **One roadmap.** Never a second view that competes with it.
3. **No bandages.** Production and security standards, or it goes on the list.
4. **Fix small risk-free things immediately** — but establish the size *before* deciding, not after.
5. **Checkpoint before risky work.**
6. **Capture know-how in `workspace/knowledge/`** every batch. It becomes the agent's brain.
7. **Found issues go on the roadmap**, in the same edit that discovers them.
8. **Use the waiting time.** While builds run, use the platform. Never derail the main task.
9. **Testing instructions are click-by-click**, with verified URLs and expected results. Say
   plainly when a change is invisible.

### 6b. The project's own hard rules

- **Every claim comes with an observation attached, not an argument** (§3h). Measure from the
  artefact, not the description of it.
- **Reach every important answer by two genuinely different routes**, and make them agree.
  **Re-running your own check is not a second route.** If they disagree, say so — never average.
- **Bounce every conclusion off a critic whose only job is to prove it wrong.**
- **Documentation is updated in the same change as the work**, not afterwards. A batch that
  leaves the docs stale is not finished. This is COOKBOOK Rule zero.
- **Switch things off; do not delete them.** If something must be deleted, it gets a written
  analysis first — we already nearly lost the custom-domains feature because a module was
  labelled "CRM".
- **Reports are written for someone who was not there.** Full sentences, and the *why*, not just
  the *what*.
- **We never take updates from the original project again.** It is our code now.
- **`present_files` / commit in both repos, staged by path** — never `git add -A`.

### 6c. Where the project's memory lives — read this, it is not in the repo

The repository holds the *project*. The accumulated **memory and technique** live outside it, and
a new agent that does not know they exist will re-learn them the hard way:

| What | Where | What is in it |
|---|---|---|
| **Project memory (curated)** | `C:\.workbuddy-ai\memory\MEMORY.md` | How to work with this owner, the project in one screen, and the hard rules — learned the hard way |
| **Daily session logs** | `C:\.workbuddy-ai\memory\2026-10-03.md`, `…-04.md`, `…-05.md` | What each session did, what it measured, and what it left open |
| **Standing preferences (all projects)** | `~/.workbuddy-ai/MEMORY.md` | The two techniques, how to ask questions, reply language. Archived to `~/.workbuddy-ai/archive/MEMORY-to-2026-09-21.md` |
| **Reusable techniques — 50 of them** | `~/.workbuddy-ai\skills\` | Each is a hard-won method from *this* project: proving a deploy reached the running process, catching a file that is imported but never committed, measuring before a blanket fix, and so on. **Load the matching one before starting a task it covers** |

### 6d. How to talk to the owner

He has said this more than once, so it is worth repeating:

- **Reply in English.** Always.
- **Plain, everyday words.** He is not a developer — no jargon, no "word salad". One short
  sentence of background at most.
- **Do not ask him to adjudicate technical decisions.** *"You are asking me highly technical
  questions that I have no clue what they are … and demanding me to have the call about it."*
  When a problem has an obvious safe default, **apply it, commit it, and tell him what changed
  and how to undo it** (`git revert <sha>`). Reserve his judgment for what is genuinely his: a
  **name, a domain, a cost, a preference.**
- **One specific thing at a time**, answerable in a word or a sentence. Give the answer, then at
  most one question.
- **A question he is holding is not yours to close.** If a decision is his, ask him or leave it
  explicitly open — never resolve it yourself and write it down as settled.
- **Every point you raise carries a status**: **FIXED** (and how you re-checked) · **WILL DO X** ·
  **OPEN — needs you** · **NOT AN ISSUE** (raised, then measured false). A point without a status
  is not a finding.

---

## 7. Current state — measured, not assumed

**Two groups below. Group A was measured on 2026-10-05. Group B is quoted from older documents
and was *not* re-measured — treat it as a starting point, not a fact.**

**Group A — measured 2026-10-05 (revision 6):**

| | |
|---|---|
| **Repo 1** (thinking/docs) | `master`, HEAD **`a72fdfe`** — the commit that carries the G-03 docs, **clean** |
| **Repo 2** (code) | `main`, HEAD **`cafe7d6`** — the commit that carries the G-03 code, **clean** |
| **Codebase shape** | **21 packages, 1 app** (`apps/mercato`) — a monorepo (Yarn 4.17.1 + Turbo) |
| **Documentation** | `library/` holds **3,441 markdown files**; `LESSONS.md` 2,746 lines (L1–L82); `JOURNAL.md` 3,242 lines; `COOKBOOK.md` 1,187 lines |
| **The studies** | analysis programme **complete** (batches 0–12, 13 reports); Paperclip + Hermes study **complete** (11 batches, 3,940 lines, 53 lessons) |
| **The specification** | **Draft 2** — of its 40 rows, **36 SETTLED · 1 DERIVED · 3 DEFERRED-with-trigger · 0 OPEN — owner**. The gate is passed; only ratification remains |
| **The runtime boundary (B-05)** | **DECIDED 2026-10-05 by the owner.** One product, one repository, one deployment, one interface (ours), with Hermes as a **supervised private runtime process behind the internal port**; Hermes is **headless**. Reasoning in [`ARCHITECTURE-hermes-integration.md`](ARCHITECTURE-hermes-integration.md) §11. The Hermes **profile** topology is deferred with the trigger **the agent gateway** |
| **The model default (item 13)** | **DECIDED 2026-10-05 by the owner: per-tenant policy is the destination, cloud-first is the interim.** It turns three pieces of work from *nice* to *required* — the model registry, the Hermes **agent / persona / profile** mapping, and platform-managed local models. Reasoning in [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) §9 |
| **The running stack** | **8 containers up, all healthy** (app, mcp, hermes, model, opencode, postgres, redis, meilisearch); `/login` answers **200**. **Re-measured 2026-10-06** — the earlier "8 containers up" was a **count that hid a dead container**: `redis` had exited (255) and `mcp` was unhealthy behind it, yet `docker ps` still showed eight rows. Fixed and proven 2026-10-06 (see [`../../workspace/COOKBOOK.md`](../../workspace/COOKBOOK.md) §"Sprint 0 — the re-run") |
| **The local database** | **Clean and complete** — 3 users, 1 tenant, 1 organisation, 5 feature toggles, 5 `action_logs` rows. Rebuilt from scratch on the fixed image 2026-10-05, init ran green |
| **Open blockers** | **3** — B-05 (OpenCode is load-bearing), B-16 (no embeddings endpoint), B-17 (no audit trail of agent tool calls). **None stops the build** (see [`BLOCKERS.md`](BLOCKERS.md)). **B-05's design face is now closed** (the boundary is decided); what stays open is *when* OpenCode goes, tracked as **N-8**. **B-16 was root-caused 2026-10-05** — it is two defects, the first being a missing `OPENAI_BASE_URL` on the `mcp` service |
| **Waiting on the owner** | **3** — Coolify password (item 5), Docker Desktop auto-start (item 6), the ISO (item 7, optional). **Item 13, the model layer's long-term default, was decided by the owner on 2026-10-05** (per-tenant policy as the destination, cloud-first as the interim), so it is no longer waiting |

**Group B — quoted from older documents, not re-measured:**

| | |
|---|---|
| **Starting Kit milestone** | *~80% done; the governance layer is complete and has screens.* **Source:** [`../../where_we_left.md`](../../where_we_left.md) — **a 2026-08-13 snapshot, self-labelled out of date** |
| **Last gate run** | *Green, `Cached: 0`.* **But the two status documents disagree on the test count** (`where_we_left.md` says 12,924; `INDEX.md` says 12,898, both dated 2026-08-13). **Do not quote either — re-run the gate and read the number yourself.** |
| **Hosting VM** | *Built and proven; directory-based hosting works, proven over public HTTPS.* **Source:** the hosting runbooks |

### What is **proven** vs **not proven**

**Proven** (by observation, on the dates shown):

- The governance layer decides, every autonomy gate binds, and a person can work the queue
  (Settings → Authority → Approvals).
- Hermes connects to the platform's MCP and discovers all 21 tools; the local model answers with
  a 65,536-token context.
- The local stack runs: **8 containers, all healthy** (re-verified 2026-10-06 after the redis
  restart-policy fix), the app serving on `http://localhost:3000`, loopback only, on a database
  that initialised cleanly.
- Directory-based hosting on the VM: each hostname serves its own directory; a file in one
  returns **404** on the other; a host-side edit appears live with no rebuild; the whole chain
  fetched from the laptop over public HTTPS (`200`, certificate valid).

**Not proven** (do not claim these):

- A **named tunnel on the owner's own domain** — only the temporary `trycloudflare` tunnels have
  been exercised.
- **Let's Encrypt at the origin** — the public certificate so far is Cloudflare's.
- A **real reboot** of the VM, and the **visitor's IP reaching the app**.
- The **GoDaddy → Cloudflare nameserver move** — the only thing still blocking the real domain,
  and it is the owner's action.

---

## 8. What is left, and whose move it is

- **What is left, in order** → [`BACKLOG.md`](BACKLOG.md). One roadmap. Read §"The list" and
  nothing else for *"what is left"*. **The four-item critical path is complete:** `P0-spec` (draft 2),
  `G-01`, `G-02` and `G-03` are all built as of 2026-10-05, and **`G-07` (the Widget contract) is built
  too**. **The next build item is the first unbuilt item in `BACKLOG.md` §"The list"** — at the time of
  writing, `S0` (a re-run of the local trio, which needs the owner to start Docker Desktop first) and
  then `G-12` (business backup and restore).
- **What needs the owner** → [`NEEDS-YOU.md`](NEEDS-YOU.md) — a numbered action list. **Three
  items open**, and none blocks the build. The most urgent is changing the Coolify admin password
  (item 5); it is the only thing standing between an agent and the 2FA wall on the hosting panel.
- **What is stopping work** → [`BLOCKERS.md`](BLOCKERS.md) — re-checked each session, because a
  blocker is a claim about *now*. **Three open, none blocking.**
- **The product specification** → [`SPEC-business-model-kernel.md`](SPEC-business-model-kernel.md)
  — **Draft 2 written 2026-10-05, and the vision's own 40-item gate is passed**: **36 SETTLED · 1
  DERIVED · 3 DEFERRED-with-trigger · 0 OPEN — owner** (the tally is parsed from the 40 rows, not
  written by hand — `LESSONS.md` **L49**; the last open row, **B-05**, was approved on 2026-10-05). One
  code gap surfaced: the ledger carries no
  `policy_version`/`decision_id` (assigned to **G-16**). **Only ratification remains** (item 4 of
  [`NEEDS-YOU.md`](NEEDS-YOU.md)). **§10a records that `G-01` has now run the specification's central
  claims as measurements** — the ID grammar, the contract, the versions and the round-trip are tested,
  not merely stated.
- **How the agent half is designed** → [`AGENT-HALF.md`](AGENT-HALF.md) — the five kinds of agent,
  the rule that decides who is answerable when an agent acts, and where every lesson from the
  Paperclip + Hermes study lands in the four phases.
- **The model layer** → [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md)
  — **the owner decided the long-term default on 2026-10-05**: per-tenant policy is the destination,
  cloud-first is the interim (§9). Three pieces of work follow from it and are now marked **required**:
  the model registry, the Hermes **agent / persona / profile** mapping, and **platform-managed local
  models** (§6.4). It also records two stated requirements: the open-source lane must not reserve a
  vendor's settings (§4.2), and the platform must be able to choose which local model runs (§6.4).

---

## 9. Maintaining this page

**This page is part of the work, not documentation about the work.** Whoever changes the
repository layout, the machine arrangement, or the front-door documents updates it in the same
change.

A newcomer who cannot orient themselves from this page plus [`../../INDEX.md`](../../INDEX.md)
alone means this page is broken — **fix the page, not the newcomer.**

**When you update it, keep §7's two-group split.** A figure you just measured and a figure copied
from an older document are not equally current, and mixing them in one table is how this page
goes wrong. If two older documents disagree on a number, say so — never average them.

*Last updated: 2026-10-06, revision 9 — **the second Paperclip pass is done, and it changed four
documents without changing any code.** A new study, [`../paperclip-value-study/`](../paperclip-value-study/),
read upstream Paperclip through a **wider lens** than the agent study: not *"how do AI workers get
work"* but *"is any of this worth taking, learning from, or deliberately rejecting?"* Its
[`findings/07-synthesis.md`](../paperclip-value-study/findings/07-synthesis.md) is the answer. It
found **six things worth acting on** and **confirmed four of our items were right** (`AH-3`, `AH-8`,
`AH-9`, `ML-4`). Two of the six **changed words we had already written**: **`ML-4` promised a mid-run
stop we have not built**, and **we had never drawn the orchestration boundary** Paperclip drew
explicitly and refused to cross. §2's reading table and §4's folder map gained the new study.
**Also: the owner answered the three open items** — Docker Desktop auto-start is **on** and the 3.8 GB
installer is **deleted** (both measured), so **`S0` is unblocked**; the Coolify password stays open by
his choice. Docs updated in the same change as the work (COOKBOOK rule zero).*

*Earlier, 2026-10-05, revision 8 — **the navigation layer a new agent needs now exists, and two
analysis folders the design cites are now tracked.** [`BOOKMARKS.md`](BOOKMARKS.md) is the new
one-page short list: the handful of documents that matter, the **end-game / vision** documents, the
two integration designs, and an honest list of which folders are in git. New **§3i** names the
folders that were sitting untracked — `llama/` and `analysis/` are now tracked, and the Hermes
source at the root is now ignored. §2 step 1 points at the short list, and §4's folder map gained
the new file and the root folders. Docs updated in the same change as the work (COOKBOOK rule zero).*

*Earlier, 2026-10-05, revision 7 — **the model layer's one owner decision is taken: per-tenant
policy is the destination, cloud-first is the interim** (item 13,
[`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) §9). It turns
three pieces of work from *nice* to *required*: the model registry, the Hermes **agent / persona /
profile** mapping, and platform-managed local models (§6.4). Two further owner requirements were
recorded: the open-source lane must not reserve a vendor's settings (§4.2), and the platform must be
able to choose which local model runs (§6.4). §1's model row, §7's decided and waiting rows, and §8
were updated in the same change as the design (COOKBOOK rule zero).*

*Earlier, 2026-10-05, revision 6 — **`G-03` is built: User Functions exist, and the four-item
critical path (`spec → G-01 → G-02 → G-03`) is complete. The next build item is `G-07` (the Widget
contract), which now also owns a Function's placement.** §2 step 7 and §8 were updated in the same
change as the code (COOKBOOK rule zero). A Function is compiled IR made durable: an enforced lifecycle
in which only `published`/`active` run, objective verification that calls G-02's compiler instead of
re-implementing it, a byte-stable document whose round-trip is empty, and **execution with no AI
argument at all**. **Three critic passes found four defects, all fixed** — one in the compiler (the
model version could not see a field being retyped) and one that let a sort be silently dropped. **One
hole is OPEN with a named trigger**, and a database row and the interface placement are deliberately
left to **G-07**.*

*Earlier, 2026-10-05, revision 5 — **`G-02` is built: the Business IR and the compiler exist, and
the next build item is `G-03` (User Functions).** §2 step 7, §7's spec row and §8 were updated in the
same change as the code (COOKBOOK rule zero). The compiler runs §51's ten stages as named steps, compiles
a `list` read into the `QueryOptions` the engine already runs, and the plan's test — **the rename test —
passes both directions**: the old IR against a renamed model **fails**, and the rename-aware entry says
**requires recompilation** and names the destination. The IR has **no scope field**, so it cannot widen
its own reach.*

*Earlier, 2026-10-05, revision 4 — **`G-01` is built: the Business Model Kernel exists in the
code repo (`ee406e8`), and the next build item is `G-02`.** §2 step 7, §7's spec row and §8 were
updated in the same change as the code (COOKBOOK rule zero). The kernel is a view over the platform's
own declarations, its round-trip test passes, and a drift guard proves the kernel's view equals the
installer's view.*

*Earlier, 2026-10-05, revision 3 — **`P0-spec` done: draft 2 of the specification passes the
vision's 40-item gate, and the first build item is now `G-01`.** §2 step 7, §4's folder map, §7's spec
row and §8 were updated in the same change as the specification itself (COOKBOOK rule zero). The spec's
tally is parsed from the 40 rows — `35 SETTLED · 1 DERIVED · 3 DEFERRED-with-trigger · 1 OPEN — owner` —
not written by hand.*

*Earlier, 2026-10-05, revision 2 — **rewritten for an agent taking over the development.**
Added §0 (the agent's first moves), §6c (where the project's memory and the 50 reusable techniques
live), and the `START-PROMPT.md` pointer. §7 re-measured: both repos clean at `30bde42` /
`962ae2a`, the library at 3,441 files, the study at 3,940 lines, the stack up with 8 containers and
a cleanly-initialised database, and **the open-items list re-measured rather than repeated — four
rows that read as open were already done** (the database reset, `apps/docs`, the CI wiring, and
the init proof), which is why `NEEDS-YOU.md` now shows three owner items, not seven.*
*(Correction, 2026-10-06: "8 containers" was a row count, not health — `redis` had in fact exited.
See §7 Group A, "The running stack", and COOKBOOK §"Sprint 0 — the re-run".)*

*Earlier, 2026-10-05, revision 1 — first version. Recorded the two-repository layout, the
two-products trap, the gitignored `vms/` and its fix, the host VM, the standing rules, and the
honest split between what is proven and what is not.*
