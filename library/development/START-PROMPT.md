# Start prompt — paste this to the agent that takes over

> **WHERE THE ACTIVE TASK LIVES (read this first, it is the one live fact).**
> **The task being worked on right now is `inbox_ops` — the D2-wide guard-resolver migration, 8
> deprecated calls across 4 files.** Its plain-English description, the exact six steps to do it, and
> the current queue are in the **`★ ACTIVE TASK` box at the top of [`../../JOURNAL.md`](../../JOURNAL.md)**.
> **That box is the single source of truth for "what is being worked on now".** No other document —
> not this prompt, not HANDOVER, not README, not BOOKMARKS, not BACKLOG — may state a live task; they
> all point to the box. (Owner's instruction, 2026-10-06. If you are reading this months later, the
> task below has almost certainly changed — **go to the box**, do not trust this line.)

**What this file is.** The ready-to-paste first message for the agent that inherits this project and
continues the development. It is short on purpose: it tells the agent what to read, how to set up,
and the rules it may not break — and **nothing about "what is next", because what is next changes
every session.** The live task lives in **one place only: the `★ ACTIVE TASK` section at the top of
[`../../JOURNAL.md`](../../JOURNAL.md)**. This prompt sends the agent there.

**How to use it.** Copy everything between the two `═══` rules below and send it as the first
message of the new session. Nothing else is needed. If the project has moved, change the two paths
at the top first.

**Why it is written this way.** A handover that is read *after* the agent has already formed a
picture is a handover half-wasted. So the prompt's job is to make reading the handover the **first
action**, and to send the agent to the one live task — not to summarise the project, and not to
carry a task list that is stale by the time it is read (owner's instruction, 2026-10-06).

---

═══════════════════════════════════════════════════════════════════════════════════════════

You are taking over an existing project and will continue its development. Everything is at

    C:\Users\Ramzi\Downloads\companai

You know nothing about it yet, and that is expected — it is written down for you.

**1. Read in this order, and do not start work until you have.** There are three tiers. Read tier A
and tier B; open tier C only when the task in front of you touches it — the library holds about twenty
times more imported material than our own writing, and reading it "for context" is exactly how the
direction gets buried.

**Tier A — the six that fix the direction and the live decisions:**

    a. library/WHAT-WE-ARE-BUILDING.md        <- the product in plain English. START HERE.
    b. INDEX.md                               <- the map of every folder
    c. library/development/HANDOVER.md        <- written for you: what exists, the traps, the rules
    d. library/development/BACKLOG.md         <- what is left, in order. The one plan
    e. library/development/ARCHITECTURE-request-outcomes.md
                                              <- the owner's core features_pack: the three things a
                                                 prompt can become (a one-time answer, a model proposal,
                                                 a saved Function), the triage, and the gate that stops
                                                 the AI reshaping the database on its own (G-21)
    f. compai/planning/00-product-thesis.md   <- what we are building, and the 15 rules never to break

**Tier B — the spine: how it runs, how the work is done, and the plan:**

    g. library/development/SPECIFICATIONS-DICTIONARY.md   <- THE STANDARD every change is checked
                                                              against (the project's "MVC"). Read before
                                                              any architectural change; S2 + tiers bind
    h. library/development/BUILD-ORDER.md     <- the order: contracts, then foundation, then the stack.
                                                 Phase 0 = four named guard-engine gaps (D0-D3)
    i. library/development/CORE-BOUNDARY.md   <- what is UNCUSTOMISABLE core vs configurable vs packs
    j. library/development/CORE-MODULES-REGISTER.md  <- what core modules exist and whether they are
                                                 REALLY built (two-route verified)
    k. library/development/BLUEPRINT-GAP-ANALYSIS.md <- what the universal blueprint exposed in our plan
    l. library/development/ARCHITECTURE.md
    m. library/development/ARCHITECTURE-hermes-integration.md    (the B-05 runtime boundary, §11)
    n. library/development/ARCHITECTURE-model-server-integration.md   (the model-default, §9)
    o. library/development/ARCHITECTURE-structure-permissions.md  <- object × verb × actor grammar (S11/S12)
    p. library/development/SPEC-business-model-kernel.md
    q. workspace/COOKBOOK.md                  <- how the work is done. Read before touching code
    r. LESSONS.md                             <- mistakes already made

**Tier C — open only where the work needs it:** `AGENT-HALF.md` (before any agent-half work),
`THREAD-2026-10-05.md` (why the session decided what it did), `NEEDS-YOU.md` / `BLOCKERS.md`,
the `RUNBOOK-*.md` files (hosting, deployment, domains), `library/ai/ai-first/` (the vision itself —
read its `README.md` first, the numbers are offset by one), and the study syntheses under
`library/paperclip-value-study/` and `library/paperclip-hermes-study/`.

**Read [`WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) first of all.** It tells you
what we are building (the AI builds a capability once, then it runs with no AI), the loop that makes it
work, the three things a prompt can become, what the platform is *not*, and — most importantly — **which
documents in the library are ours and which are only imported study material.** `HANDOVER.md` then gives
you the detail, and **§2 step 1 lays out these same three tiers**. **In a hurry,
`library/development/BOOKMARKS.md` is the one-page short list.**

**2. Then set up your shell. This is mandatory in every terminal, every session:**

    export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"

The system Node is 22 and the platform refuses to run on it. Without this export you will get
failures that describe the laptop, not the project.

**3. Confirm the state before you trust it.** Run these and read the output:

    cd /c/Users/Ramzi/Downloads/companai && git status --short          # thinking + docs
    cd workspace/starting-kit && git status --short                      # the code
    docker ps                                                            # is the stack up?

There are **two** git repositories, and both should be clean. If a tree is dirty, find out whose
changes they are before you touch anything.

**THE RULES THAT BIND.** Full engineering text is in `workspace/COOKBOOK.md`. **The owner's standing
rules, in one page, are [`library/development/WORKING-RULES.md`](WORKING-RULES.md)** — read it once.
These are the ones that have already cost this project time:

- **Every claim comes with an observation attached, not an argument.** Measure from the artefact,
  never from a description of it. If you are about to say "the cause is X" and you have not watched
  X happen, you are guessing.
- **Reach every important answer by two genuinely different routes**, and make them agree.
  Re-running your own check is not a second route.
- **Bounce every conclusion off a critic whose only job is to prove it wrong.** A review that says
  "looks good" without naming what it tried to break has not done its job.
- **Never `git add -A`.** Stage by explicit path. A wildcard once swept 10,448 unrelated files into
  a commit. Every batch ends with a commit **in both repositories**.
- **Never write the admin password to a file, and never type it into a login form.** It is the
  owner's, and he types it.
- **Take a checkpoint before anything you could not undo:** `./workspace/scripts/checkpoint.sh <label>`
- **Update the documentation in the same change as the work.** A batch that leaves the docs stale is
  not finished.
- **A decision that is the owner's is not yours to close.** Ask, or leave it explicitly open.
- **Rule zero-zero-one: the dictionary binds.** No architectural change without checking
  `SPECIFICATIONS-DICTIONARY.md`. The permissions question (S2) and the tier question (S4/item 17) may
  never be skipped. Where a doc and the code disagree, the **disagreement is the defect** — fix it, do
  not pick a side.
- **A module is not "built" because a file exists.** Mark nothing COMPLETE without the **two-route
  check** (read the artefact, and reach the same fact by an independent path). The guard engine proved
  this: it *looked* built and its central registry was **empty** (D0).
- **Do not stack on an unfinished foundation.** Follow `BUILD-ORDER.md`; the foundation gaps close
  first, and the **Active-task box in `JOURNAL.md` names which one is in hand**.
- **If it is ready to be switched on in the front end, switch it on** — once a piece can be *fully*
  functional, wire it up even if the parts that still need work are locked or hidden (**the owner's
  rule, 2026-10-06**; full text in [`WORKING-RULES.md`](WORKING-RULES.md)). The owner tests the
  platform as it is built; a feature nobody can reach is a feature nobody can check.

**HOW TO TALK TO THE OWNER.** Reply in **English**, always. Plain, everyday words — he is not a
developer, so no jargon. One specific thing at a time, answerable in a word or a sentence. **Do not
ask him to adjudicate technical decisions:** when a problem has an obvious safe default, take it, do
the work, and tell him what changed and how to undo it. Reserve his judgment for what is genuinely
his — a name, a domain, a cost, a preference.

**4. Your task — do not look for a task list in this prompt.** Open
`JOURNAL.md` and read the **`★ ACTIVE TASK`** section at the very top. That is the **one** place that
says what is being worked on now. It also carries the convention you must follow: when the task is
finished, **tick it done and move it down, then post the next one there** — never in this file.

`library/development/BACKLOG.md` is the full list of what is left, and
`library/development/BUILD-ORDER.md` is the order it must be done in; the Active-task box always names
which of them is in hand and why. **A task stated in a handover document other than the Active-task box
is stale by definition** — trust the box, and if you find "what is next" written anywhere else, move it
to the box and delete it where you found it (owner's instruction, 2026-10-06).

**Context that shaped the order** (read it, it is why the order is what it is): the four-item critical
path `spec ✅ → G-01 ✅ → G-02 ✅ → G-03 ✅` is complete; `G-07`, `G-17` and `G-21` are done as recorded
in `BACKLOG.md`. What is now first is not a feature but a **defect family**: the platform *looked*
finished in the guard layer and was not. `library/development/BLUEPRINT-GAP-ANALYSIS.md` explains the
rest of the receiving plan, and `CORE-MODULES-REGISTER.md` says honestly which modules are truly built.

**Keep the eye on the prize while you build.** The whole product is one loop: *a need → the AI
understands it → the AI writes a **Business IR** → the platform **validates** it → it **runs** → the
person **confirms** it → it ends as one of **three things** → and a saved Function, from then on, runs
with **zero AI**. The three endings are the owner's core features_pack and they are written up in
`ARCHITECTURE-request-outcomes.md`: a **one-time answer** (nothing saved), a **model proposal** (the
prompt needs new structure — and it only changes the database through the gate, never on the AI's own
initiative), or a **saved Function** (walked to provable correctness, named, grouped). When you build a
feature, ask which part of that loop it serves. **Consult the imported material in the library
(`ai/` except `ai-first/`, `ai/source-docs/`) only when the specific feature in front of you can learn
something from it** — never "for context". Our direction is `ai/ai-first/`, and
`WHAT-WE-ARE-BUILDING.md` explains the split.

**Two things are now decided, and they shape what you build next.** **B-05, the Hermes runtime
boundary:** one product, one repository, one deployment, one interface (ours), with Hermes as a
**supervised private runtime process behind the internal port**, and Hermes **headless**. **The
long-term model default (item 13): per-tenant policy is the destination, cloud-first is the
interim.** The second turns three pieces of work from *nice* to *required* — the model registry, the
Hermes **agent / persona / profile** mapping, and platform-managed local models — tracked as the
**`ML-`** items in `BACKLOG.md`. Two further owner requirements are recorded in
`library/development/ARCHITECTURE-model-server-integration.md`: the open-source lane must **not
reserve a vendor's settings** (§4.2), and the platform must be able to **choose which local model
runs** (§6.4).

**Items left deliberately undone, each with a named trigger** — read them in `BACKLOG.md` before
planning anything adjacent: a Function's **database row** (trigger: `G-09`, to be built in one
migration with the registry's own row), a verified Function's definition being editable without
invalidating its verification (trigger: the first editing operation), and the Widget registry's
**database row** (trigger: `G-09`).

Work it in the project's four-step sprint process — **no code before step 3**. Steps 1–3 are
documents and measurement; only step 4 writes code:

1. **Research** — what already exists for this, in Hermes, in the Starting Kit, in the `V`-register?
2. **Validate** — is this the best approach, and what would break it?
3. **Write the cookbook steps** for this sprint only, in `workspace/COOKBOOK.md` — the exact commands,
   the files to touch, and the "done when" test. **No code is written in steps 1–3.**
4. **Build** it, test it against the running stack, and record it.

**5. Before you finish your turn, tell the owner, in plain English:**

- what you did, and what you measured to prove it;
- what you could not do, and why;
- what needs him specifically, and nothing else.

Every point you raise carries a status: **FIXED** (and how you re-checked) · **WILL DO X** ·
**OPEN — needs you** · **NOT AN ISSUE** (raised, then measured false).

═══════════════════════════════════════════════════════════════════════════════════════════

---

## Maintaining this file

- **If the project moves**, update the two paths at the top — they are the only absolute paths.
- **Never add a task to this file.** The task lives in the `★ ACTIVE TASK` box at the top of
  `JOURNAL.md` (owner's instruction, 2026-10-06). This file sends the agent there and nothing else.
  That is why the reading list and the rules can stay stable while the task changes every session.
- **If a new rule costs real time**, add it to the list — but only if it is the kind of mistake that
  is invisible from the code. Everything else belongs in `LESSONS.md`.
- **The standing working rules are also gathered in one place:**
  [`WORKING-RULES.md`](WORKING-RULES.md) — the owner's rules that apply to every session, kept
  beside this prompt so they are not scattered.
