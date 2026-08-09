# Starting Kit — Development Cookbook

**Read this before touching anything.** It is the main algorithm; the detail
lives in `references/` and is loaded only when a step points there.

**Goal:** turn Open Mercato into the Starting Kit — ERP removed, six repairs
landed, eight pieces grafted from Graph Portal Platform — without losing anything
we needed.

**Method:** adapted from `skills-main`, the agent methodology Open Mercato was
itself built with. The rules we adopted and why: [references/working-rules.md](references/working-rules.md).

---

## Rule zero — keep the project findable

**Every batch ends by updating the three orientation files at the project root.**
A batch that changes something and leaves them stale is not finished.

| File | Update when |
|---|---|
| [`../INDEX.md`](../INDEX.md) | A folder appears, a phase completes, a decision is made |
| [`../JOURNAL.md`](../JOURNAL.md) | A decision, a completed phase, or a surprising finding |
| [`../LESSONS.md`](../LESSONS.md) | **Immediately** when a mistake or near-miss is caught |
| [`PROGRESS.md`](PROGRESS.md) | Every batch — which one we are on, out of how many |
| [`references/how-to-test.md`](references/how-to-test.md) | Every batch — the owner's click-by-click steps |
| [`knowledge/`](knowledge/) | Every batch — what you learned about **how the platform works** |

**Never ask the owner to "click around and check".** They are new to this
platform and cannot tell which behaviour changed. Every request to verify gets
verified URLs, numbered actions, the expected result, and the failure signature —
and says plainly when a change is invisible by design, which most foundation work
is. Format and rules: [`references/how-to-test.md`](references/how-to-test.md).

Assume the project is handed tomorrow to someone who knows nothing about it. They
should need to be told one thing: *"read INDEX.md"*.

## Rule zero-five — capture the know-how, not just the history

**Owner standing decision, 2026-08-09:**

> *"Document whatever points and concepts and workflows you discover… so we
> increasingly create a knowledge base and know-how that is solid enough to make
> us avoid future mistakes. Part of my plan is to later have agents within the
> system that help users build their own functions, forms, all the way to
> modules — and with such a mine of knowledge and skills we can end up with a
> powerful brain for the agents tailored for the platform evolution."*

Three files already record *what happened* (`JOURNAL.md`), *what went wrong*
(`LESSONS.md`) and *what the plan is* (`references/`). None of them answers the
question a newcomer — or an agent — actually asks: **"how do I do X on this
platform?"** That is [`knowledge/`](knowledge/).

**Every batch adds what it discovered**, in the same commit. A mechanism you had
to reverse-engineer, a convention you had to infer, a constraint that surprised
you — that is an entry, or an edit to one.

### Write for a reader who cannot ask a follow-up question

The intended third reader is **an agent inside the platform**, helping a user
build a field, a form, eventually a module. It will have this text and nothing
else. So:

- **Every claim carries a file path.** A reader who cannot verify has to believe,
  and belief is how stale documentation survives.
- **Show the real code**, not a paraphrase.
- **Name the failure mode.** "What goes wrong" is the most valuable section,
  because it is the part nobody can infer from the source.
- **Nothing speculative.** Entries are earned by work actually done, so the
  reader can trust they describe the platform rather than someone's model of it.

**Why this compounds.** The knowledge is being discovered right now, one batch at
a time, at considerable cost. Captured while fresh it is nearly free;
reconstructed later it costs ten times as much and is half wrong.

## Rule zero-six — sweep as you go; the backlog is the memory

**Owner standing decision, 2026-08-09:**

> *"Good that you are spotting errors and lackings and also find any enhancements
> and optimization opportunities in the code pieces you work on, and always check
> the prerequisites of it and any pieces that can impact it or impacted by it as
> you go. Then whatever you find that needs working on, don't keep it in your
> memory, document it in the cookbook where it fits to work on in the right order
> within your overall work."*

Rule zero-three says the backlog remembers the work. This says **what has to
reach it**, and it is broader than "tasks I decided to defer".

**Every batch, before it is reported, sweeps four questions.**

1. **What did I find that is wrong?** Defects, gaps, dead code, stale docs,
   anything that would surprise the next reader. Even when it is somebody else's
   module and even when it is not blocking.
2. **What did I find that could be better?** An enhancement or an optimisation
   noticed while reading the code is the cheapest one anybody will ever find —
   the context is already loaded. It costs a line to record and a re-read to
   rediscover.
3. **What does this piece depend on?** Prerequisites that are missing, assumed,
   or only half true. A batch that needs something not yet built has found a
   backlog item, not an obstacle.
4. **What else does this touch, and what touches it?** Both directions. Code that
   this change impacts, and code that could break this change later.

**Then each finding goes on the ordered backlog in the same edit that found it,
positioned by when it should be worked on** — not appended, not "noted below",
not left in a report paragraph. A finding recorded in prose is a finding nobody
will action.

**Nothing lives in my head between batches.** Working memory is not durable and
is not shared: a finding I remember is a finding the project does not have. If it
is worth mentioning to the owner, it is worth a backlog line first.

**Size it when you record it.** S / M / L, and one clause on what makes it that
size. An unsized item cannot be ordered against anything, so it drifts to the
bottom regardless of how much it matters.

## Rule zero-one — no bandages

**Owner standing decision, 2026-08-08:**

> *"The outcomes need to meet the highest production and security standards, so
> we can't put bandages just so things move forward. We need to progress with
> perfection."*

This outranks schedule. A step is not done because it stopped complaining; it is
done because it is **correct**.

### What counts as a bandage

| Bandage | What to do instead |
|---|---|
| Deleting or weakening an assertion to make a test pass | Fix the code or the fixture so the **original assertion** holds |
| Skipping a test, suppressing a warning, or widening a type to `any` | Resolve the cause. If it genuinely cannot be resolved now, it is a **recorded decision with an owner**, not a quiet edit |
| "It works, the error is probably harmless" | Establish *why* it is harmless, in writing — or fix it (**L6**) |
| Catching an error and carrying on silently | Fail loudly, or handle it deliberately and say so in a comment |
| Leaving a dependency broken because the module is going away later | The build must be green at **every** commit, not only at the end |
| Reporting "no errors in the log" | Report the **pass count**. Absence of complaint is not evidence of correctness |

### The test that catches most of them

> **Would I be comfortable if this exact change shipped to a customer, permanently,
> and someone read it in a year without me there to explain it?**

If the honest answer is "it will do for now", it is a bandage. Either fix it
properly or write it down as a decision with a named consequence.

### Where deferring is still legitimate

Deferring is not a bandage **when it is explicit**: written into the plan as a
required step of a named future batch, with what is lost until then stated
plainly, and the owner informed. The C++ build tools were deferred correctly
(**L6**); the same omission left as a silent "probably fine" would have been a
bandage.

## Rule zero-two — fix it now if it is small; check before believing it is

**Owner standing decision, 2026-08-09:**

> *"If it is a small risk-free fix, then better fixing it and directly move on.
> Better not postpone what is easier to fix. But if it can get us into a separate
> long path then stick with your original plan."*

Deferring a five-minute fix creates a backlog nobody reads. Starting an
open-ended one mid-batch wrecks the batch. The rule sits between them.

**The order matters: establish the size before deciding, never after.** "It looks
like two lines" is a guess, and acting on it is how a small fix becomes a long
path halfway through.

| Test | Fix now | Defer |
|---|---|---|
| Scope | One file, or a handful of identical edits | Touches a contract, a schema, or a design decision |
| Reversibility | Obvious to undo | Migration, data change, or a semantic choice |
| Verification | Existing gate proves it | Needs a new test, or manual verification of something else |
| Understanding | You already know why it is right | You would be choosing between plausible options |

**Any "defer" answer is written down where it will be found** — for inherited
defects, [references/upstream-issues.md](references/upstream-issues.md); for our
own work, [PROGRESS.md](PROGRESS.md). A deferral that lives only in a chat
message is a decision to forget.

**The worked example (U2, 2026-08-09).** A sidebar screen was one click from
silently deleting role presets. The fix looked like two lines: pre-tick the roles
that already have a preset. Checking the schema first showed
`role_sidebar_preferences` has **no variant reference** — so `hasPreference`
cannot tell you *which* layout a role has. The "obvious" fix would have
pre-ticked roles configured from a different variant and silently overwritten
them: a worse bug, wearing a correct-looking UI.

Five minutes of checking turned "quick win" into "needs a schema or UX decision",
which is exactly the outcome this rule exists to produce.

## Rule zero-three — you order the work; the list remembers it

**Owner standing decision, 2026-08-09:**

> *"Do it in the order that makes most sense, just make sure you have it all in
> your cookbook-like document so you do not forget any task that you should do.
> It is for you to order it first to do to last."*

Sequencing is delegated. **Tracking is not.** The owner should never be the
mechanism that remembers a task.

**What this requires.**

1. **One ordered backlog**, in [PROGRESS.md](PROGRESS.md) → *The backlog*. Every
   outstanding item, first to last, with why it sits where it does. Not a set of
   notes scattered through prose.
2. **Nothing leaves a batch undone without landing there.** A deferral, a
   discovered defect, a "we should also…" — it goes on the list in the same edit
   that discovers it, or it does not exist.
3. **Order is argued, not assumed.** Each reordering says what changed. "Next"
   without a reason is a guess wearing a schedule.
4. **Say the order out loud when reporting**, so the owner can overrule cheaply.
   Delegated does not mean invisible.

**The ordering heuristic that keeps earning its place:** *change the mechanism
before multiplying the call sites.* Landing a behaviour change on a small,
well-understood surface is safer than landing it on a large one — and every call
site added afterwards is born correct instead of needing revisiting.

## Rule zero-four — checkpoint before anything you could not undo

**Owner standing decision, 2026-08-09:**

> *"Back up before heading to a critical task… It is important to be able to
> reverse changes at all times so we don't do a change, crash the system, and
> fail to recover it. Also manage backups so you delete old irrelevant ones
> instead of filling the hard disk and inflaming the codebase with useless files."*

```bash
./workspace/scripts/checkpoint.sh <label>
```

**Take one before:** a database migration · any mass data change · editing the
command bus, the CRUD factory, or auth · a dependency reinstall · anything whose
failure mode is "the platform no longer starts".

### What it backs up — and what it deliberately does not

**Source files are not copied.** They are in git, and a tag is a strictly better
restore point than a file copy: atomic, diffable, self-describing, and free.
Copying them would add clutter without adding recoverability — the second half of
the owner's instruction forbids exactly that, and the two halves are only in
tension if you back up the wrong things.

**Two things git genuinely cannot restore**, and those are what the script saves:

| | Why git cannot help |
|---|---|
| **The database** | Not in git at all. `db:migrate` is one-way; no checkout undoes a migration or a mass update |
| **`apps/mercato/.env`** | Gitignored by design — it holds real secrets — so invisible to every git operation including `git checkout .` |

It tags the code as well, so **one label ties schema, config and source to the
same instant**. Restoring one without the others is how a "recovered" system
stays subtly broken.

### Retention — the second half of the instruction

Newest **5** checkpoints, plus anything under 24 hours old. Everything older is
deleted on every run, automatically. Backups live in `workspace/.backups/`,
**outside the git repository**, so they can never be committed or bloat the
codebase. A database dump is ~2 MB, so the cap is ~10 MB.

```bash
./workspace/scripts/checkpoint.sh --list    # what exists, and disk used
./workspace/scripts/checkpoint.sh --prune   # force a cleanup
```

**A backup nobody can restore is theatre.** The script prints the exact restore
commands for all three artefacts every time it runs, so recovery never depends on
someone remembering the procedure under pressure.

## Rule one — doubt means keep

**Owner standing decision, 2026-08-08:**

> *"Any module or function that we have to choose whether to keep means there is a
> reason to keep it, so we keep it. Better to have more than to end up losing what
> we will develop later, or causing issues in future by having deleted it."*

**How to apply it.** A salvage analysis ends in one of three states, not two:

| State | Meaning | Cost of being wrong |
|---|---|---|
| **KEEP** | Enabled in `modules.ts`, part of the platform | Some surface area |
| **PARK** | Code stays, **module disabled** in `modules.ts` | **Frozen** — not type-checked, tests do not run. Readable and restorable in one line, but unverified until then. See [parked-modules.md](references/parked-modules.md) |
| **ATTIC** | Moved out of the build, catalogued | We must restore and re-adapt it later |

**A verdict of "borderline" resolves to KEEP or PARK — never ATTIC.** Only remove
what the analysis shows is *clearly* domain-specific and *clearly* unused by
anything we keep.

**Why PARK exists.** Disabling costs one line and removes a module from the
running system entirely, while leaving the code where we can read, repair and
re-enable it. It is the honest middle for anything uncertain, and this platform's
architecture gives it to us for free.

**The one real cost of keeping** — and the reason PARK is not free either: kept
code still sits in the repository, still appears in dependency audits, and
**still has to be updated when the six repairs change the platform contract**.
So keeping is cheap, not costless. Prefer PARK over KEEP for anything we do not
actively need, so the repair burden stays on code we use.

**Correction, 2026-08-09:** parked code was claimed to be "still type-checked
and repaired with everything else". It is neither. The generated entity-id
registry deliberately covers enabled modules only — a compile-time guard against
enabled code depending on parked entities — so parked source cannot compile
against it. Both its type-checking and its tests are now excluded: **3,472 tests,
42% of core's suite.** PARK means *frozen*, not *maintained*. Full reasoning and
the restore-time consequence: [references/parked-modules.md](references/parked-modules.md).

## The three rules that override everything

1. **Nothing is deleted before it is analysed.** Every module, package or file
   scheduled for removal gets a read-only salvage analysis first, and the report
   is committed. Protocol: [references/salvage-analysis.md](references/salvage-analysis.md).
   This is blocking. We already lost `domain_mappings` once to a confident guess.

2. **Analysis is read-only; execution is a separate step.** The agent that
   decides what to keep never deletes. The agent that deletes acts on a written
   report and does not re-decide. Borrowed from `om-root-cause` → `om-fix`.

3. **The gate is green before the next batch starts.** Install, typecheck, lint,
   test, build — all pass, or the batch is not done. No batch begins on a red tree.

---

## Phases

Run in order. Each phase has an exit gate that must be met before the next.

| Phase | What | Detail | Exit gate |
|---|---|---|---|
| **P** | Prepare — fork, workspace, baseline green | below | Baseline build green, recorded |
| **S** | ~~Strip~~ **Park** — switch ERP off, keep the code | [parked-modules.md](references/parked-modules.md) | **Done 2026-08-08** — 136 tables, boots, gate green |
| **R** | Repair — the six foundation fixes | [repair-batches.md](references/repair-batches.md) | Kernel-ready base, gate green |
| **G** | Graft — eight pieces from P1 | [graft-batches.md](references/graft-batches.md) | Best-of-both authority model |
| **K** | Kernel — our own product | `planning/01 §6.1` | Out of scope for this cookbook |

**The spike comes first.** Before committing to the whole plan, run R1 and R5
timeboxed to three weeks ([08 §9a](../compai/planning/08-host-selection-and-migration-plan.md)).
If they sprawl, greenfield is correct and we stop here having spent three weeks,
not a year.

---

## Phase P — Prepare

| Step | Action | Done when |
|---|---|---|
| **P1** | Confirm the upstream-ownership decision ([08 §3](../compai/planning/08-host-selection-and-migration-plan.md)). Copying the code here commits us. | Decision recorded in `workspace/README.md` |
| **P2** | Copy Open Mercato to `workspace/starting-kit/`. Initialise git; first commit is **untouched upstream**, tagged `upstream-baseline`. | Tag exists |
| **P3** | Run the full gate on the untouched copy: install, typecheck, lint, test, build. **Record the result verbatim**, including failures. | `salvage/P3-baseline.md` written |
| **P4** | If the baseline is not green, fix *only* what blocks the gate, and record each fix. Do not tidy. | Gate green, or a written decision to proceed with named known-failures |

**P3 matters more than it looks.** I never ran Open Mercato's build during the
assessment — the verdict carries that as an open risk. P3 closes it. If the
baseline is badly broken, that is a finding that reopens the host decision.

---

## Phase S — Park · **complete, 2026-08-08**

**This phase was redesigned mid-flight and is now done.** Fourteen ERP modules
are switched off in `modules.ts` rather than deleted. Rationale, the parked list,
restore order and the two deferred costs:
[references/parked-modules.md](references/parked-modules.md).

Result on a clean database: 263 → **136 tables**, 428 → **244 API paths**,
67 → **44 backend pages**, and initialisation is warning-free.

**Why the change.** Deleting buys exactly one thing over disabling — compile
time — because every registry and the migration runner read
`loadEnabledModules()`. It costs days of per-module analysis and a permanent risk
of losing something. `domain_mappings` nearly went that way once.

**The salvage analyses were not wasted.** They are the record of what each module
contains, and they are what a restore decision reads.

### The removal loop — kept for the rare genuine deletion

Deletion is now the exception, not the routine. When something truly must go —
a licence obligation, or code a repair proves unfixable — this still applies,
and the old batch notes remain in
[references/strip-batches.md](references/strip-batches.md).

```text
1. ANALYSE   read-only salvage analysis → salvage/<name>.md
             (references/salvage-analysis.md)
2. EXTRACT   move anything the report marks KEEP into a kept module
3. REMOVE    delete from modules.ts → run generator → move to attic/
4. GATE      install · typecheck · lint · test · build
5. BOOT      migrate · initialize · load pages — on a clean database
             (references/local-instance.md)
6. COMMIT    one module per commit, report path in the message
```

**Step 5 is not optional, and step 4 does not replace it.** Four commits passed
the whole gate while the platform could not start: a deleted seed file was
referenced by name at runtime, which no compiler, linter or generator can see
(**L14**). Booting is the only check that covers strings.

Boot at least every third removal, and always after removing anything that owns
data files, migrations or setup hooks.

**Deleting files from inside a module we keep has no protocol of its own** — the
salvage analysis is written for whole modules. When it happens, run at least Q2
(who references it) and Q6 (string references) by hand, and grep for the bare
filename of any data asset.

**The generator is the safety net.** It refuses to emit a registry when an
enabled module's `requires` is unmet, so a removal that breaks a kept module
fails the build rather than shipping. Trust it, but do not rely on it alone —
it catches declared dependencies, not the soft coupling that hid
`domain_mappings`.

---

## Phase R — Repair

Full detail: [references/repair-batches.md](references/repair-batches.md).

Six repairs, in this order, because each makes the next cheaper:

| | Repair | Why this order |
|---|---|---|
| **R1** | Principal abstraction — first-class `kind`, migrate the 30 string-prefix sites | Everything else references a principal |
| **R2** | Audit atomicity — thread the transaction, fail **closed** | Must be right before we add more writes |
| **R3** | Append-only ledger alongside the mutable journal | Needs R2's transaction discipline |
| **R4** | Capability descriptor — effect class, reversibility, data classes | The resolver in R5 reads these |
| **R5** | Decision with reasons (**I6**) | Consumes R4; replaces the boolean check |
| **R6** | Typed org edges + authority ceilings | Consumes R5's resolver |

**R1 and R5 are the spike.** They are the most invasive and touch where Open
Mercato's design differs most from ours. If they land inside three weeks, the
foundation is malleable and the rest follows.

---

## Phase G — Graft from P1

Full detail: [references/graft-batches.md](references/graft-batches.md).

Eight pieces, all schema-and-logic, none framework-coupled. G1 and G2 depend on
R5 and R6 respectively; the rest are independent and can run in any order.

| | From P1 | Depends on |
|---|---|---|
| G1 | Layered resolver **with explanation trace** | R5 |
| G2 | Typed org edges + permission ceilings + inheritance modes | R6 |
| G3 | Temporary delegations | R1 |
| G4 | Project-level permission overlays with terminal deny | R5 |
| G5 | Record lock states | R5 |
| G6 | Event visibility scope | — |
| G7 | Locale direction policy + RTL inference | — |
| G8 | Migration advisory lock | — |

**Graft rule:** a grafted piece is rewritten to the host's idioms — MikroORM
entities, Awilix registration, module conventions, the host's migration format.
We are not porting P1's code; we are re-implementing P1's *design* here. Copying
Drizzle schemas or NestJS services into this codebase is a defect.

---

## The validation gate

Run in this order. Any non-zero exit fails the gate and blocks the batch.

```bash
yarn install --immutable
yarn typecheck
yarn lint
yarn test
yarn build
```

**Reading `yarn test` correctly.** Turbo runs 22 package tasks. The root script
carries `--continue` so a failure no longer aborts the rest — before that was
added, every run stopped at the first failing package and `core` was never
reached (**L15**).

A result is only a gate if it reports **coverage as well as counts**:

```text
Tasks:  20 successful, 22 total      ← if N < M, tasks failed; read which
Tests:  15,723 passed, 10 failed     ← the number that gets quoted
```

Quote both. "Tests pass" without a task count has hidden a red tree here before.
And never capture the status with `cmd > log; echo $?  >> log` inside a
compound statement — that reports the *last* command's code. Use
`{ cmd > log 2>&1; echo $? > log.rc; }`.

Record the command list here and in the repo's own config together — if they
drift, the gate means nothing. Adopted from `skills-main` → SDLC "Validation gate".

---

## How work is reported

Every batch ends with a written report, committed alongside the change. **A
report is a deliverable, not a log** — full sentences, the reasoning behind every
verdict, understandable by someone who did not watch the run. Templates and the
severity scale: [references/working-rules.md](references/working-rules.md).

Never improvise a shorter report to save effort. Effort is saved by not writing
detail nobody needs, not by thinning the thing that gets read.

**Every item handed to the owner says whose it is.** Ending a report with things
"worth your attention" that are actually mine is a way of transferring worry
without transferring a decision — the owner is left holding an item with no idea
what they are supposed to do with it.

So each one is labelled:

| Label | Meaning |
|---|---|
| **Your call** | A decision only the owner can make. Options and a recommendation given |
| **Optional check** | The owner may verify it; automated tests already cover it. Skipping costs nothing |
| **Mine, on the backlog** | Recorded, ordered, and being handled. Mentioned so the owner can overrule the order, not so they can act on it |

If an item does not fit one of those three, it does not belong in the report.

---

## When to stop and ask

Adapted from the `om-auto-*` contract: make the recommended, most-reversible call
yourself and write it down. Stop only for:

- **The baseline is badly broken (P4)** — reopens the host decision.
- **A salvage analysis returns `LOW_CONFIDENCE`** on something scheduled for
  deletion — a human decides.
- **A repair sprawls past its timebox** — R1/R5 especially; that is the signal
  the whole plan rests on.
- **A graft cannot be expressed in the host's idioms** without distorting either
  side — say so rather than forcing it.
