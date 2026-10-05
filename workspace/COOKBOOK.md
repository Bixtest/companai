# Starting Kit — Development Cookbook

**Read this before touching anything.** It is the main algorithm; the detail
lives in `references/` and is loaded only when a step points there.

**Goal:** turn Open Mercato into the Starting Kit — ERP removed, six repairs
landed, eight pieces grafted from Graph Portal Platform — without losing anything
we needed.

**Method:** adapted from `skills-main`, the agent methodology Open Mercato was
itself built with. The rules we adopted and why: [references/working-rules.md](references/working-rules.md).

---

## Rule zero-zero — is this actually the right thing to do?

**This rule comes before every other rule, including the owner's instructions.**

Before doing a thing, not doing a thing, or handing a decision back, ask
honestly: **is this the right and the best thing to do?** The answer decides
which of three things happens, and they are not interchangeable.

### 1. Never assume a decision the owner did not make

**A direction is only a direction when they were asked plainly and answered.**
Not when they said something adjacent. Not when a rule from somewhere else
implies it. Not when an earlier approval seems to cover it. Not when it would be
convenient if they had.

If a direction is needed and does not exist, **ask a clear question and wait for
the answer** — do not proceed on an assumed one, and above all do not describe
the result as though they chose it. Attributing a decision to somebody makes
them responsible for an outcome they never agreed to, and it hides the fact that
nobody actually decided.

### 2. Even when they *have* given a direction, say so if it is not the best one

A given instruction is not the end of the discussion. If I know there is a
better way, **come back and discuss it** before building the worse one. Then we
reach the right answer together, and if they reaffirm it after hearing the
argument, that settles it and I build it in full.

Do this by writing a **COUNTER-OPINION** — a labelled section that says plainly:

1. **What was asked, or what the rule says.**
2. **Why I think it is wrong**, in one paragraph, with the concrete consequence.
3. **What I recommend instead.**
4. **What it would take to change my mind.**

Disagreeing is the job. Agreeing when I think the owner is wrong is a failure,
not politeness.

### 3. When the right answer is clear, just do it

This is the ordinary case and it needs **no consultation at all**. A decision
comes up, I know what it should be — I make it, do the work, and report it
afterwards.

**The condition is that it really is the right answer**, not merely the
convenient or the fast one. If I am reaching for the owner because I am unsure
whether something is *correct*, that is my job and I should go and find out.
Their input is for what they *want* — priorities, taste, appetite for risk —
never for what is technically correct.

**Consulting too much is its own failure.** It buries the decisions that
genuinely need them, and it turns "I checked with you" into cover for work I
should have owned.

### What this rule was written to stop

I left a database migration unapplied, wrote *"your call"*, and quoted a rule
from the upstream project as though it were the owner's rule. Three failures in
one move:

- **I invented a blocker.** Nothing was actually blocked. The right answer was
  obvious to me and I did not act on it.
- **I dressed my hesitation as the owner's decision.** The owner had no basis to
  judge it, and the framing implied they had set a rule they had never seen.
- **I left the system broken.** Code shipped that could not run — trouble now,
  bought with a sentence that sounded careful.

It was case **3** — I knew the right answer — and I handled it as case **1**
while inventing a direction the owner had never given.

**Three things follow from that:**

- **Never hand back a decision the owner has no basis to make.** If the answer
  needs knowledge only I have, the decision is mine. Report it, do not delegate
  it.
- **Never leave a system in a state that cannot run.** Half-landing a change is
  not caution, it is a bug with an excuse attached.
- **A rule from another project is not the owner's rule.** Upstream conventions
  are written for upstream's situation. Say whose rule it is, and say whether it
  fits ours.

### The test, when it is not obvious which case you are in

Ask: **would I be able to defend this decision on the technical merits alone?**

- **Yes** → case 3. Decide it, do it, report it.
- **Yes, but the owner may want it differently for reasons of cost, priority or
  taste** → ask a plain question, and wait.
- **No, because I think what was asked is wrong** → case 2. COUNTER-OPINION.

### On plain English

If the owner cannot tell what a paragraph is asking of them, the paragraph
failed — not the reader. Write what happened, what it means for them, and what
(if anything) they need to do. Terms of art get explained the first time or not
used.

---

## Rule zero — keep the project findable

**Every batch ends by updating the three orientation files at the project root.**
A batch that changes something and leaves them stale is not finished.

| File | Update when |
|---|---|
| [`../INDEX.md`](../INDEX.md) | A folder appears, a phase completes, a decision is made |
| [`../JOURNAL.md`](../JOURNAL.md) | A decision, a completed phase, or a surprising finding |
| [`../LESSONS.md`](../LESSONS.md) | **Immediately** when a mistake or near-miss is caught |
| [`PROGRESS.md`](PROGRESS.md) | **The roadmap** — everything left, in order. The only plan |
| [`references/ux-findings.md`](references/ux-findings.md) | Things that work but look or read badly — collected, not scheduled |
| [`references/whitelabel.md`](references/whitelabel.md) | Everywhere the original still shows through — for one deliberate batch later |
| [`references/how-to-test.md`](references/how-to-test.md) | Every batch — the owner's click-by-click steps |
| [`knowledge/`](knowledge/) | Every batch — what you learned about **how the platform works** |

**Never ask the owner to "click around and check".** They are new to this
platform and cannot tell which behaviour changed. Every request to verify gets
verified URLs, numbered actions, the expected result, and the failure signature —
and says plainly when a change is invisible by design, which most foundation work
is. Format and rules: [`references/how-to-test.md`](references/how-to-test.md).

Assume the project is handed tomorrow to someone who knows nothing about it. They
should need to be told one thing: *"read INDEX.md"*.

**And commit them.** Since 2026-08-10 the project root is a git repository
covering the cookbook, the journal, the lessons, the knowledge base, the backlog
and the planning documents — everything except the Starting Kit (its own repo),
the backups (they hold secrets) and the downloaded toolchain.

It was unversioned for the first three days, which meant the most valuable thing
here after the code had no history and no backup, while the code had both from
the first hour. Every batch now ends with a commit in **both** repositories.

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

**Relatedness is not a test — only size is.** Reaffirmed by the owner 2026-08-11:

> *"Always fix whatever mistakes, bugs, or enhancements you find as you work even
> if unrelated to the specific task you are working on. Unless it is a complex fix,
> then you add it to your cookbook to fix in future instead of counting on memory."*

So "that is not what this batch is about" is **not** a reason to leave something
broken. A stale comment noticed in passing, a redundant index, a test asserting a
hardcoded list — all fixed in the batch that found them. What defers a finding is
that it is *large*, never that it is off-topic. Several of the best fixes in this
project arrived that way: the stale "only A0 is enforced" comment, the redundant
`record_locks` index, the locale list hardcoded into a markup test.

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

1. **One roadmap, and only one**: [PROGRESS.md](PROGRESS.md). Every outstanding
   item, first to last, with why it sits where it does. Not a set of notes
   scattered through prose, and **not a second view that competes with it** —
   a plan plus five waves plus a backlog is three plans, which is none.
   Completed work moves out to
   [references/completed-work.md](references/completed-work.md) so the roadmap
   stays short enough that somebody actually reads it.
2. **Nothing leaves a batch undone without landing there.** A deferral, a
   discovered defect, a "we should also…" — it goes on the list in the same edit
   that discovers it, or it does not exist.
3. **Order is argued, not assumed.** Each reordering says what changed. "Next"
   without a reason is a guess wearing a schedule.
4. **Say the order out loud when reporting**, so the owner can overrule cheaply.
   Delegated does not mean invisible.
5. **The list must be scannable in ten seconds.** PROGRESS.md opens with
   *"The list"* — one line per task, a checkbox each, in working order, ticked as
   they finish. Everything below it is the same items with the reasoning
   attached.

   **Why this became a rule (owner, 2026-08-13):** *"I am still not able to chase
   you around with the tasks you pick and work on."* The roadmap was complete and
   unreadable — each row had grown a paragraph explaining itself, which is right
   for the record and useless for answering *what is left?* at a glance. Detail is
   not a substitute for an index; a plan the owner cannot scan is a plan only I
   can see, which defeats the point of rule zero-three.

   The one-liner and the detailed row are the **same item in one file**, never a
   second list — a summary that can drift from its source is the competing view
   this rule already forbids. Tick the box in the same edit that ticks the row.

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
- **A screen somebody will live in** — its shape is a product decision, not an
  engineering one. Build the mechanism, then ask before designing the surface.

## Rule zero-eight — use the waiting time, and keep the side-lists

A gate run is six minutes. `build:app --force` is another five. Across a session
that is a large fraction of the elapsed time, and sitting idle through it is
waste.

**When a process is running, go and use the platform.** The owner logs the
in-app browser in, so this is available whenever the session is live. Test what
was just written, and test things nobody wrote recently — **treat the platform as
a whole**, not only the parts this batch touched. Debugging is always worth
doing; the `DEMO_MODE` fail-open default was found in a screenshot taken while a
build ran, and was on nobody's list.

### The balance, which is the hard part

**The Starting Kit roadmap is the priority.** Everything below is what to do with
time that would otherwise be spent watching a progress bar — not a reason to
detour mid-task.

So: **find, record, keep going.** Do not stop the main task to fix a UI
annoyance. Write it down and carry on. The two exceptions are the ones already in
rule zero-two — genuinely small and risk-free fixes go in at once — and anything
that makes the current task's result wrong.

### The three side-lists

Findings go to whichever file fits, never into memory and never into the roadmap
unless they earn a place there:

| What | Where |
|---|---|
| Something is broken or wrong | [references/upstream-issues.md](references/upstream-issues.md), and the roadmap if it blocks us |
| It looks or reads badly | [references/ux-findings.md](references/ux-findings.md) |
| It says *Open Mercato* and one day must not | [references/whitelabel.md](references/whitelabel.md) |

**On white-labelling.** The platform is MIT licensed, so re-branding it entirely
is permitted. The work is not urgent and must not be started piecemeal — a
half-rebranded product is worse than an honest fork. What *is* useful now is
noticing, in passing, every place the original shows through: names, logos, URLs,
email templates, page titles, `package.json` names, CLI banners, seeded data.
Collect them so that when the time comes it is one deliberate batch rather than
an archaeology project.

**On UI and UX.** There is a lot wrong. Recording it costs seconds; fixing it
mid-batch costs the batch. The list becomes its own phase once the Starting Kit
is finished.

---

## Rule zero-seven — defaults are yours; tastes are theirs

Set 2026-08-10, when the approvals page came up and the answer was *"pick the
best default, and give people a setting where it suits them differently."*

**Choose. Do not ask which sort order somebody prefers.** A question that returns
a shrug has cost two people time and bought nothing. Pick the answer that is
right for most, and say why in the same place the code lives.

**Then ask which half you are in:**

| | |
|---|---|
| There is a **right answer** | Default, no setting. A knob here is an invitation to break it |
| Organisations **legitimately differ** | Default plus a setting, and the default still has to be defensible on its own |
| It is **authority** | No setting, ever. "Who may approve this" is not a preference |

**Every setting has a price** — a thing to explain, translate, test, migrate and
get wrong — so "make it configurable" is not the safe choice, it is a choice with
a bill. The instruction *"give people a setting"* means **do not bake your taste
into their product**; it does not mean *make everything adjustable*.

**Write the decision down where the work is**, with the reasoning and the date.
A default nobody can find the argument for gets reversed by the next person who
disagrees with it, and reversed back by the one after that.

**And schedule it honestly.** If a surface needs real usage to design well, say
so and name what has to exist first — the way shadow mode had to run before
enforcement could be switched on. "Later" with a stated precondition is a plan;
"later" on its own is how things get forgotten.

---

## Rule zero-nine — measure from the artefact, not the description of it

**Added 2026-10-04, out of the analysis programme** (`library/analysis/`). It is
the rule that programme kept re-learning, and it earned its place.

**When a document and the thing it describes disagree, the thing wins.** A
document is a claim to check, never a fact to cite. The owner's own directive for
Hermes states it exactly: *"the extract is the authority; the documents are the
claims."* Applied across the programme, it caught **8 wrong claims in a sibling
project's Hermes documentation** (batch 8) and **5 overstated claims in the
vision itself** (batch 9).

### The two habits that make it work

**1. Read the code, not the folder's reputation.** A folder that holds one
accurate document is not thereby accurate — trustworthiness is per document, not
per folder ([[L9]]). When a claim matters, find the file behind it. A cell with no
file is `PARTIAL` at best.

**2. Reach every number by two routes.** A single derivation repeats its own
mistake. The programme's requirement count (**140**) was confirmed two ways —
grouping the source registers, and counting the matrix rows — and the two agreed.
**When two routes disagree, find out why. Never average them, and never quietly
pick the nicer one.** If you cannot reconcile them, that is the finding, and it
goes in the report.

### The test

> **Ask what you actually looked at, and whether it is the thing you are claiming
> about.** A label instead of the tables. A count instead of the lines. A type
> instead of the runtime. A document instead of the code. A build instead of a
> running system.

This is [[L48]] and [[L49]] made into a standing rule. It costs a minute and it is
the difference between a finding and a guess.

---

## Rule zero-ten — research, validate, write the steps, *then* build

**Owner standing decision, 2026-10-04:**

> *"Before working on any sprint of tasks, heavily research it and validate its
> development plan. Is there anything in Hermes or the Starting Kit that can
> provide added value on top of that task? Is this the best approach to it? Then
> fully write the cookbook steps for that sprint in detail that a junior developer
> can follow and execute."*

**Every sprint runs in four steps, and no code is written before step 3.**

| Step | What | Output |
|---|---|---|
| **1. Research** | What already exists for this task — in Hermes, in the Starting Kit, in the `V`-register? Is there a shortcut? | a short note: what we reuse, what we build |
| **2. Validate** | Is this the best approach? What would break it? Is there a cheaper way to the same outcome? | a decision, with the alternative it beat |
| **3. Write the cookbook steps** | The full step-by-step for **this sprint only** | a new section in this cookbook |
| **4. Build** | Do the work against the running stack, test it, record it | the change, tested and committed |

**Why this is not optional.** The analysis programme (batches 0–12) found the same
thing every time: **the cheapest win was almost always something already built.**
Of 140 requirements, the platform half was bought and the agent half borrowed —
only the product half had to be built. A sprint that skips step 1 rebuilds
something that exists.

**And for the agent half, step 1 now has a written source.** The completed study at
[`../library/paperclip-hermes-study/`](../library/paperclip-hermes-study/) read Paperclip, Hermes and the
sibling's integration forensically across eleven batches and turned them into lessons — what to take,
what to reject, and the target shape. **Start any sprint that touches AI staff, roles, tasks,
delegation, triggers or shared conversations at its synthesis**
([`findings/10-lessons-and-target-design.md`](../library/paperclip-hermes-study/findings/10-lessons-and-target-design.md)).
It carries **lessons, not decisions**: it shortens step 1, it does not replace step 2.

**Why the steps are written per sprint, not all at once.** A detailed step for
code that does not exist yet is a **guess**, because the step depends on the
interfaces the build will reveal. So:

- **The skeleton is written for every sprint up front** — one line each, in
  [`../library/development/BACKLOG.md`](../library/development/BACKLOG.md). This is what makes a
  handover at any moment possible.
- **The full detail is written just before each sprint** — when it can be right.

**The handover test.** Ask: *could a developer who was not here pick up the next
sprint and follow it without asking a question?* If not, the steps are not written
yet — and the skeleton is what tells them which sprint is next.

---

# Sprint 0 — the running trio (the workbench)

**Written 2026-10-04. This is the first sprint.** It is not a feature — it is the **workbench**:
the platform, Hermes and the model server running together on the laptop, so that every later
sprint is built against a real system instead of a description of one.

**Why it comes first, and why it is cheap:** [`../library/development/ARCHITECTURE.md`](../library/development/ARCHITECTURE.md) §5.
In short — the stack is **already dockerised** and already targets both the laptop and the cloud
from **one file**, so this is *finishing* something that exists.

## Step 1 — Research: what already exists

**Measured 2026-10-04, on the owner's machine — not assumed.** It is a **Dell Precision 7510**
(hostname `BIXMASERVER`), confirmed by the owner as the machine Sprint 0 runs on.

| What | State | Evidence |
|---|---|---|
| The machine | ✅ measured | **Dell Precision 7510** — Intel **i7-6820HQ** (**4 cores / 8 threads**), **32 GB RAM** (2 × 16 GB DDR4-2133, SK Hynix), Windows 10 Pro |
| Headroom | ✅ ample | **126 GB free** of 476 GB on `C:` |
| Docker + Compose | ✅ present | Docker **29.8.0**, Compose **v5.5.1** |
| The platform stack | ✅ dockerised, parses | `docker compose config` → services `app`, `mcp`, `opencode`, `postgres`, `redis`, `meilisearch` |
| Hermes | ✅ has its own compose | `../library/ai/hermes-agent-main/docker-compose.yml` → `gateway` + `dashboard`, `network_mode: host`, volume `~/.hermes:/opt/data` |
| The model server | ❌ not present | no llama.cpp service anywhere in the stack |
| The model file | ❌ not present | no GGUF on the machine |

**What we reuse:** the whole `fullapp.yml` stack and Hermes's image. **What we add:** a `model`
service and a `hermes` service. **What we remove:** *nothing* — `opencode` **stays** (the removal
check failed; see step 3.6 and blocker **B-05**).

**From the `V`-register:** **V-01** (auxiliary models with automatic fallback) is what makes the
local-first claim practical — the model server slots underneath it. Nothing else in the register
is needed for this sprint.

**Measure the target machine before step 3.** The specification above belongs to the machine this
documentation was written from. Confirm the machine you will actually run on, from its installed
parts (Windows PowerShell):

```powershell
Get-CimInstance Win32_PhysicalMemory | Measure-Object Capacity -Sum    # installed RAM (bytes)
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
Get-PSDrive C | Select-Object Used, Free
```

## Step 2 — Validate: is this the best approach?

**Alternative considered — three separate compose files**, joined by hand (host ports, a shared
network). **Rejected:** three commands, three sets of env, and the cloud story becomes three
deploys. **One file, one command** is the entire point.

**Alternative considered — do not dockerise**, run all three natively. **Rejected:** the owner's
condition is that the cloud deploy is **guaranteed** once local works, and only a single
containerised file gives that.

**Approach chosen:** **extend `docker-compose.fullapp.yml`** with a `model` and a `hermes`
service, bridge networking throughout, `DEPLOY_ENV` kept so local and cloud stay one file.

**What would break it:** Hermes's `network_mode: host`
([`../library/development/BLOCKERS.md`](../library/development/BLOCKERS.md) **B-01**). The fix is step 3.4.

## Step 3 — The steps

**Every command runs from `workspace/starting-kit/`.**

**3.1 — Preconditions.** Docker Desktop **running** — not merely installed (blocker **B-04**:
the client is present, the engine was not running on 2026-10-04). Node 24 on the path for any host
command:
```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
```

**3.2 — The model server.** Add a `model` service to `docker-compose.fullapp.yml`. **Verified
2026-10-04:**

- **Image:** `ghcr.io/ggml-org/llama.cpp:server` — the official `server` variant ships only
  `llama-server`. **Use the plain (CPU) image for Sprint 0** — it is the simplest thing that proves
  the pipes connect. *(Measured 2026-10-04: the machine **also has an NVIDIA Quadro M2000M**, besides
  Intel HD 530. A `-cuda` image could be faster, but it needs WSL2 GPU passthrough and a compatible
  driver — revisit only if answers are too slow. **They are too slow — see the timing note below.**)*
- **Port:** `8080`, published on the host so you can test it directly.
- **Volume:** a host folder holding the `.gguf`, mounted read-only at `/models`.
- **Context window: `-c 65536` *and* YaRN RoPE scaling — both are required.** Hermes refuses any
  model whose served window is below **64,000 tokens** ("needs at least 64K tokens for reliable tool
  use"; `agent/agent_init.py::_enforce_minimum_context`, `MINIMUM_CONTEXT_LENGTH = 64000`).
  Qwen2.5's GGUF declares `n_ctx_train = 32768`, and **llama.cpp caps the slot context at that
  value** — so `-c 65536` **on its own silently yields `n_ctx_slot = 32768`**:
  `the slot context (65536) exceeds the training context of the model (32768) - capping`. The RoPE
  flags are what actually admit 64K. **Read the server's own startup log to confirm
  `n_ctx_slot = 65536`; do not trust the flag.**

```yaml
  model:
    image: ghcr.io/ggml-org/llama.cpp:server
    container_name: mercato-model-${DEPLOY_ENV:-local}
    restart: unless-stopped
    ports:
      # loopback by default — in-network callers use http://model:8080/v1
      - "${MODEL_BIND:-127.0.0.1}:${MODEL_PORT:-8080}:8080"
    volumes:
      - ./models:/models:ro
    command:
      - -m
      - /models/${MODEL_FILE}
      - --port
      - "8080"
      - --host
      - 0.0.0.0
      - -c
      - "65536"          # required by Hermes' 64K floor — see above
      - --rope-scaling
      - yarn             # without this, llama.cpp caps the slot at n_ctx_train (32768)
      - --rope-scale
      - "2"
      - --yarn-orig-ctx
      - "32768"
      - -n
      - "512"
      # Threads. llama.cpp defaults -t to PHYSICAL cores (4 here) and -tb to -t,
      # ignoring the 8 logical CPUs the container is given. Measured 2026-10-04
      # (see the speed note below): -t 4 -tb 8 is the best split.
      - -t
      - "4"
      - -tb
      - "8"
    networks:
      - mercato-network-fullapp
```

It serves an **OpenAI-compatible** endpoint at `http://model:8080/v1`. The GGUF itself is decision
**A2** (a small instruct model, ~7–8B, `Q4_K_M` quantisation) and is a multi-GB download — blocker
**B-03**. **Confirm the image tag resolves when you pull it — do not assume it.**

> **Measured speed — a real Sprint 0 finding (2026-10-04).** On this laptop, CPU-only, the agent loop
> is **slow enough to matter**: Hermes' prompt is **~15,700 tokens** (its system prompt plus the 21 MCP
> tool schemas), and llama.cpp reads it at only **~13 tokens/s** — so a single agent turn spends
> **~20 minutes just ingesting its prompt** before generating a token. The 64K KV cache also takes the
> model container to **~10 GiB of the Docker VM's 15.56 GiB**. This is the price of Hermes' 64K floor,
> not a misconfiguration.
>
> **Measured with a direct `/completion` call (1207-token prompt, 64-token generation):**
>
> | `-t` / `-tb` | prompt ingest | generation |
> |---|---|---|
> | 4 / 4 (llama.cpp default) | 13.2 tok/s | 3.9 tok/s |
> | 8 / 8 | 17.7 tok/s | 3.0 tok/s |
> | **4 / 8 (what we ship)** | **19.3 tok/s** | **4.6 tok/s** |
>
> Prompt ingest is compute-bound and wants all 8 logical CPUs (`-tb 8`); generation is
> memory-bandwidth-bound, where extra threads cost more than they save (`-t 4`). The default wastes
> half the machine.
>
> **Ranked fixes for "make testing fast":** (1) the thread split above — free, +46% ingest, **done**;
> (2) **test the two arrows separately** — the 15,700-token prompt is mostly tool schemas, so a
> "think"-only test is ~200 tokens and takes seconds; (3) **a smaller model** for day-to-day iteration
> (Qwen2.5-3B ≈2.3× faster, 1.5B ≈4.6× faster), keeping the 7B for final checks. **GPU offload is not
> the fix:** the Quadro M2000M has only **4 GiB**, which cannot hold the model (~4.4 GB) *plus* the
> 64K KV cache (~3.7 GB), so offload would be partial at best on a 2015 Maxwell chip.

**3.3 — Point the platform at it.** **Verified in the code 2026-10-04:** the OpenAI-compatible
preset reads its endpoint from **`OPENAI_BASE_URL`** (`openai-compatible-presets.ts` → `OPENAI_PRESET`),
and the provider is chosen by **`OM_AI_PROVIDER`** (`model-factory.ts`). So set, in `.env`:

```bash
OM_AI_PROVIDER=openai
OPENAI_BASE_URL=http://model:8080/v1
OPENAI_API_KEY=local          # any non-empty value; llama.cpp ignores it
OM_AI_MODEL=<the model id you loaded>
```

The `OPENCODE_*` variables are **legacy aliases** (see `model-factory.ts`) and are not needed here.
Nothing else in the platform changes.

**3.4 — The Hermes service.** **Verified 2026-10-04:** Hermes ships a **prebuilt image** —
`nousresearch/hermes-agent:latest` — so there is **nothing to build**. Add a `hermes` service with
**bridge networking and an explicit published port — not `network_mode: host`** (this is the fix for
**B-01**; the official Docker guide's compose uses bridge + `ports: 8642:8642`).

**Give Hermes its own named volume — do not bind-mount a host folder.** Hermes keeps its state in
SQLite in **WAL mode**. A host bind mount on Docker Desktop for Windows is a **cross-VM filesystem**
(virtiofs/9p), where SQLite's WAL shared-memory is not coherent across the VM boundary; Hermes
**errors on it** and warns that concurrent writers can *silently corrupt the database*. A named
volume is a native filesystem, so WAL is safe — this is the remedy Hermes' own message names.

```yaml
  hermes:
    image: nousresearch/hermes-agent:latest
    container_name: hermes-${DEPLOY_ENV:-local}
    restart: unless-stopped
    command: ["gateway", "run"]
    ports:
      - "${HERMES_PORT:-8642}:8642"
    volumes:
      - hermes_data:/opt/data        # named volume, NOT a host path — see above
    environment:
      MCP_SERVER_API_KEY: ${MCP_SERVER_API_KEY:-}
    networks:
      - mercato-network-fullapp
```

…and declare it under `volumes:` as `hermes_data: name: mercato-hermes-data-${DEPLOY_ENV:-local}`.

**Configure Hermes through its own CLI — never by hand-editing `config.yaml`.** Hermes **owns** that
file (it carries a `_config_version` and is rewritten on startup), so a hand-written `model:` or
`mcp_servers:` block is **silently discarded** — the file still *reads* the way you left it until the
process starts, then your edits are gone and the log contains no error. The binary is
`/opt/hermes/bin/hermes` (it is **not** on `PATH` for `sh -lc`). Point its model at the container
name — *not* `localhost`, which would be the Hermes container itself:

```bash
H=/opt/hermes/bin/hermes
$H config set providers.mercato-local.base_url http://model:8080/v1 --force
$H config set providers.mercato-local.api_key local --force
$H config set model.provider mercato-local      # a named `providers:` entry — see the note below
$H config set model.default Qwen2.5-7B-Instruct-Q4_K_M
$H config set model.context_length 65536        # only true because the server really serves 64K
$H config get model                             # read it back — do not assume it took
```

> **Two traps here, both measured 2026-10-04.**
> **(a)** `model.provider: llamacpp` looks like the right answer — the docs list `llamacpp` as an
> alias for `custom`. It is not: `llamacpp` routes to Hermes' **managed** local runtime, which
> expects a server *Hermes* supervises, and fails with *"The local model server is turned off."*
> Use an explicit **named `providers:` entry** (the code's own "Rung 3: a configured named custom
> provider") and set `model.provider` to that name.
> **(b)** `model.context_length` is a **claim about the server**. Set it only to a value the server
> actually serves — confirmed from llama.cpp's startup log (`n_ctx_slot`), not from the flag you
> passed. Declaring a window the server does not have is the defect [[L49]] names.

**3.5 — Connect Hermes to the platform (arrow 1).** Use Hermes' **MCP command** — again, not a hand
edit:

```bash
$H mcp add mercato --url http://mcp:3001/mcp --auth header
# then correct the header — see below — and enable it:
$H config set mcp_servers.mercato.headers.x-api-key <the key>
$H config set mcp_servers.mercato.enabled true
$H mcp test mercato
```

**The header is `x-api-key`, NOT `Authorization: Bearer`.** Verified in the platform's own code
(`packages/ai-assistant/…/lib/auth.ts:157-192`): it accepts **exactly two** forms —
**`x-api-key: <secret>`** or **`Authorization: ApiKey <secret>`** (note `ApiKey `, *not* `Bearer `).
Hermes' `mcp add --auth header` flow asks for an *"API key / Bearer token"* and stores
`Authorization: Bearer …`, which is **neither** form, so every call fails with
`401 {"error":"API key required (x-api-key header)"}`. Adding the `x-api-key` header fixes it.

**The key is generated by the platform — read it, do not set it.** The `mcp` service always
provisions its own key (`mercato ai_assistant mcp:ensure-api-key --file
/run/mcp-shared/mcp-api-key`, in `docker/scripts/mcp-entrypoint.sh`). **Do NOT set
`MCP_SERVER_API_KEY` in `.env`** — that command has no env-key option, so the value would be a
*different* string from the real key; and because the `opencode` service prefers the env var over the
file, a value there makes opencode authenticate with the wrong key and get 401. Read the real one:

```bash
docker exec mercato-mcp-local cat /run/mcp-shared/mcp-api-key
```

This is the wire the agent uses to **do** things in the business.

**A successful test looks like this** (measured 2026-10-04):
`✓ Connected (2567ms)` and `✓ Tools discovered: 21`.

**3.6 — OpenCode: the check was run, and it FAILED — do NOT remove it (2026-10-04).** The check
(grep the compose and env for `OPENCODE_*`, confirm nothing else reads them) found that the
platform's **own chat route is wired to the OpenCode service**: `api/chat/route.ts` imports
`createOpenCodeClient` / `opencode-handlers`, and `opencode-handlers.ts` calls `OPENCODE_URL`
(`http://localhost:4096`). **So OpenCode stays** — deleting it breaks the platform's AI chat.
Removal needs a prerequisite (rewire the chat to the app's LLM registry) and is tracked as **N-8**
in [`../library/development/BACKLOG.md`](../library/development/BACKLOG.md); see blockers **B-05**
and **B-04** in [`../library/development/BLOCKERS.md`](../library/development/BLOCKERS.md).

**3.7 — Bring it up.**
```bash
docker compose -f docker-compose.fullapp.yml up -d
```
The first run **builds the app image — several minutes**. Run it in the background; do not watch it.

**3.8 — Prove arrow (2) — the model.** Ask the model server directly for a completion. It must
answer **with no cloud key set**.

**3.9 — Prove arrow (1) — the platform tools.** Have a Hermes agent **list a platform tool and
call it**, then read the **ledger** and confirm the call was recorded and authorized. **This is
the proof that the two halves are joined.**

## Step 4 — Done when

**Status, measured 2026-10-04:**

| | Criterion | Status |
|---|---|---|
| ✅ | One command brings up **platform + Hermes + model** together | **Met.** `up -d` brings up 8 services; all healthy. |
| 🟡 | Arrow **(1)** works, and the call is **visible in the ledger** | **"List" proven; "call" proven at the platform, not yet through the agent.** Hermes connects and discovers **21 platform tools** (`hermes mcp test mercato` → `✓ Connected`, `✓ Tools discovered: 21`), and an agent turn **enumerated all 21 by name**. In that turn the 7B model picked the wrong tool (`meta_describe_agent`, which needs an `agentId`) and never called `context_whoami` — **three checks agree nothing reached the platform** (`api_keys.last_used_at` NULL, `action_logs` unchanged, no MCP log line). A **direct authenticated `tools/call` to `context_whoami` returns HTTP 200** with real data, so the wire is sound and the failure is the model's tool choice. **Ledger caveat:** a *read-only* tool writes nothing to `action_logs`, and the platform does **not** record API-key usage (`last_used_at` stays NULL) — the only record is the MCP's own log. |
| 🟡 | Arrow **(2)** works **with no cloud key** | **Proven for the model server** (it answers with no cloud key set). The platform is *configured* at it (`OPENAI_BASE_URL=http://model:8080/v1`, read back from the container env), but no platform-side AI call has been observed — exercising the platform's AI chat needs the owner's login (**B-02**). |
| ✅ | The dashboard is reachable on **localhost only** — nothing on the LAN | **Met.** All three published ports bind `127.0.0.1` (`APP_BIND` / `MODEL_BIND` / `HERMES_BIND` override it for a cloud deploy). Verified with `docker compose config` → `host_ip: 127.0.0.1`. |
| ✅ | **The same file, unchanged, is what deploys to the cloud** — only env values differ | **Met by design.** One compose file; every environment-specific value is a `${VAR}`. `DEPLOY_ENV` names the environment. |
| ✅ | A one-page runbook exists | **Met:** [`../../library/development/RUNBOOK-sprint0.md`](../library/development/RUNBOOK-sprint0.md). |

**The one thing left to prove:** a Hermes agent *calling* a platform tool. The wire is sound end to
end (proven directly), so what remains is **tool-choice reliability from a CPU-only 7B at 64K
context** — measured at **~0.8 tokens/s generation and ~41 minutes per turn**, which is also why it
is expensive to iterate on. The honest next step is **GPU offload** (the machine has a Quadro
M2000M) or a **smaller tool surface**, not another prompt tweak.

**What this sprint is not:** not a feature, and not the kernel. Its output is a **working
environment** and a runbook.

---

# Sprint P0-spec — draft 2 of the Business Model Kernel specification

**Written 2026-10-05. This is the vision's own implementation gate (RQ-140): no product code may be
written before this document exists.** It is a **document sprint**, not a code sprint — the work is
writing and measuring, and the tests it must pass are the vision's 40 Appendix-D items.

**Why it is next, and why nothing else can precede it:** the plan says so
([`../library/analysis/findings/12-development-plan.md`](../library/analysis/findings/12-development-plan.md) §4) and the
vision says so in its own words (§29: *"If those answers are not clear, the implementation phase
should not yet begin."*). Draft 1 settled the object list, the contract and the taxonomy. **18 of the
40 items are still partly or wholly open, and closing them is this sprint.** Item: `P0-spec` in
[`../library/development/BACKLOG.md`](../library/development/BACKLOG.md).

## Step 1 — Research: what already exists

**The whole point of step 1 is that most of these 18 answers already exist — in the vision, in our own
governance layer, or in both — and the specification's job is to *name* the answer and cite where it
lives, not to invent one.** Measured 2026-10-05, reading the artefacts.

| The 18 open items (§8) | What already answers them | Where |
|---|---|---|
| **ID grammar** (row 7) | The vision gives the shape in its **build order phase 0**: *"immutable primitives: IDs, TenantRef, EntityRef, ActorRef, Version, Timestamp, Provenance, Correlation ID, Lifecycle state"* — and Doc 3 §39 gives the examples (`invoice`, `invoice.outstanding_amount`). **What is missing is the grammar, not the concept.** | Vision Doc 8 §222 (batch 5 §13a); Doc 3 §39 |
| **Policy decision language** (row 14) | **Two sources agreeing.** The vision gives the nine decision classes (`DENY · ALLOW · ALLOW_WITH_FILTER · ALLOW_WITH_REDACTION · ALLOW_WITH_LIMITS · REQUIRE_APPROVAL · REQUIRE_STEP_UP_AUTH · REQUIRE_HUMAN · ESCALATE`). **Our resolver already returns a `Decision`** with `gate`, `allowed`, `reasons[]`, `bindingRule`, `obligations[]`, `alternatives[]` — the same axis, already tested. | Vision Doc 8 §24; `packages/shared/src/lib/authority/decision.ts` (batch 5 §14a G-01) |
| **Principal resolution** (row 2) | The vision's **build order phase 1** names the five principal kinds and the `actor.type` enum (`HumanUser · Agent · Service · Integration · System`); our code already has **`PrincipalKind`** and the five agent kinds the owner decided on 2026-10-05. | Vision Doc 8 §38, §223; `packages/shared/src/lib/auth/principal.ts`; [`../library/development/AGENT-HALF.md`](../library/development/AGENT-HALF.md) §1.4 |
| **Tenant-enforcement point** (row 1) | The vision's **SecurityContext** carries `tenant_id` and the rule *"tenant context must be explicit"*; our query engine already enforces tenant scope and **fails closed** when the principal has no resolvable tenant. | Vision Doc 8 §14, §38; `packages/shared/src/lib/query/types.ts` (batch 5 §14a G-18) |
| **Hermes session bridge** (row 28) | **Two sources.** The vision says *"Hermes profile is not tenant identity"* (§84) and *"do not reuse a human session for a background worker"* (§150); the owner's 2026-10-05 decision names the concrete case — a **context agent that acts as a user**. | Vision Doc 8 §84, §150; [`AGENT-HALF.md`](../library/development/AGENT-HALF.md) §1.4 |
| **MCP domain API** (row 29) | **Both agree, verbatim in spirit.** The vision (§89) prefers `finance.mcp`, `sales.mcp` … over one `execute_sql`; the platform **already exposes 21 named tools** over MCP, all discovered by Hermes. | Vision Doc 8 §88–89; Sprint 0 measurement (COOKBOOK above) |
| **Tool policy shape** (row 30) | The vision's tool envelope: *which server · tool · tenant · actor · agent · data class · actions · destination*, plus plugin trust tiers (`PLATFORM_FIRST_PARTY → UNTRUSTED`); we already have an **agent mutation policy** (read-only / confirm-required / destructive-confirm-required) + tool allow-lists. | Vision Doc 8 §88, §90, §156; `ai-assistant/…/lib/agent-policy.ts` (batch 5 §14a G-20) |
| **Human-approval gate** (row 31) | **Answered 2026-10-05.** The approval rule is our existing **`A0`–`A5` gates assigned per action class**, plus *the accountable party is always a person*. Draft 1 already recorded it; only the gate *binding* shape is left, and the vision gives it: `ApprovalToken` bound to a `command_hash` (§59, §156). | [`AGENT-HALF.md`](../library/development/AGENT-HALF.md) §1.2; Vision Doc 8 §59 |
| **Document ingestion pipeline** (row 32) | The vision §145–146: a Document carries *tenant · owner · classification · source · content trust · version · checksum · created_by · effective dates · retention · AI processing policy*, and **extraction must not downgrade classification**. Nothing in the code. | Vision Doc 8 §145–146 |
| **Analytics projection strategy** (row 33) | The vision §110 (projection security) + Doc 4 §54 (*search is a projection, not a second database*); the platform already has `query_index` as a projection target. | Vision Doc 8 §110; Doc 4 §54 |
| **Event/outbox strategy** (row 34) | The vision is exact: Doc 4 §52 — *"database transaction { current state · audit · outbox event } all commit atomically."* **Measured: no outbox exists in the code** (searched by name and by the related dedup mechanisms — nothing). | Doc 4 §52; measured 2026-10-05 (below) |
| **Observability model** (row 36) | The vision §166 lists what to monitor (denial rate, cross-tenant attempts, sensitive-field access…) and §167 says anomaly detection is **supplementary, never a replacement**; we already have access/action logs + the hash-chained ledger. | Vision Doc 8 §166–167; `audit_logs/services/` (batch 5 §14a G-16/G-17) |
| **Evaluation benchmark** (row 37) | The vision §160–165: the adversarial matrix, the prompt-attack matrix, property-based tests, the **capability closure test**, security differential testing. Named but not written. | Vision Doc 8 §160–165 |
| **Hermes version harness** (row 38) | The vision §230: the Hermes adapter comes **only after the gateway exists**; the boundary items (26/27/35) are the `B-05` boundary. Draft 1 already marks these **OPEN — owner**. | Vision Doc 8 §230; [`../library/development/BLOCKERS.md`](../library/development/BLOCKERS.md) **B-05** |
| **Capability package format** (row 39) | The vision §141 gives the **`CapabilityManifest`** in full (entities · fields · relationships · actions · commands · queries · workflows · metrics · permissions · policies · data_classifications · audit_events · external_integrations · MCP_tools · security_tests). We have `Module`/`Capability` objects and per-module `acl.ts`, but no manifest. | Vision Doc 8 §141 |
| **Frontend model-builder lifecycle** (row 40) | The vision §229 (Functions/Widgets/Workspace as **clients of the policy kernel**) + Doc 3's User-Function lifecycle. Deferred by the plan until G-02. | Vision Doc 8 §229; Doc 3 |
| **Skill lifecycle** (row 25) | The vision §186 (skill lifecycle) + §87 (*skills are not the canonical source of authority*); our `Skill` object is defined in §5.4, states are the gap. | Vision Doc 8 §87, §186 |
| **Organization hierarchy** (row 3) | **Two sources.** Doc 5 §7 proposes the party model (**avoid separate identity silos**); our code already has `resolveGraphCeiling` over typed org edges and `LegalEntity` in the vision's own build order. | Doc 5 §7; `packages/shared/src/lib/authority/graph.ts` (batch 5 §14a G-11) |

**Two facts measured for this sprint, by two routes each:**

1. **No transactional outbox exists.** Route (a): search the codebase for `outbox` — no file.
   Route (b): search for the mechanisms an outbox is usually built from (`processed_events`,
   `event_deliveries`, dedup tables) — none. **Both routes agree: row 34 is genuinely open, not
   merely unspecified.**
2. **The resolver already returns the vision's decision shape.** Route (a): read `decision.ts` —
   `Decision` carries `gate`, `allowed`, `reasons[]`, `bindingRule`, `obligations[]`, `alternatives[]`.
   Route (b): batch 5 §14a G-01 records the same from the file, independently. **Both agree.**

**What we reuse:** the vision's own answers (cited above) for ~15 of the 18; our resolver, principal
model, tenant guard and ledger for the rest. **What we genuinely build new in this sprint:** *nothing
in code* — the output is the written specification. **What must be *written down* for the first time:**
the ID grammar, the tool-policy shape, the approval-token binding, the outbox contract, the capability
manifest — each of which the vision sketches and this document fixes.

**From the `V`-register:** **V-14** (explanation-as-a-value), **V-15** (trust tiers), **V-16** (the
autonomy matrix) and **V-20** (shadow mode) are all *already-implemented answers* to items in this
sprint — the specification should cite them as the platform's mechanism rather than inventing a new one.

## Step 2 — Validate: is this the best approach?

**Alternative considered — close all 18 items to `SETTLED`.** Rejected: it would mean inventing answers
the vision has not decided (the Hermes boundary is **B-05**, the owner's) and pretending to settle
things whose triggers have not fired. **That is exactly the error draft 1 caught and refused.**

**Alternative considered — leave the 18 as they are and start G-01.** Rejected: the vision forbids
implementation before the gate is met (RQ-140), and the plan's critic pass (§12 #5) names this as the
one way to violate the gate — *"if a reader skips the spec and starts G-01, the plan violates RQ-140."*

**Approach chosen — settle by *kind*, with the vision's own build order as the ordering rule.** Each
of the 18 gets exactly one of four statuses, and the status is chosen by a stated rule, not by mood:

| Status | Rule |
|---|---|
| **SETTLED** | The vision or our own code already answers it, and citing which is enough. |
| **DERIVED** | The vision answers it in words; this document turns those words into a normative rule. |
| **DEFERRED** | It cannot be decided before something else exists — **and the trigger that brings it back is named.** |
| **OPEN — owner** | It is genuinely the owner's call (the Hermes boundary), and is left open rather than closed. |

**The ordering rule is the vision's own build order (Doc 8 §222–232), which separates two kinds of
item.** Items in **phases 0–3** (the immutable primitives, identity, multi-tenancy, the policy kernel)
**must be settled now**, because phase 1 of the product (G-01) sits on them. Items in **phases 7–9**
(the agent gateway, the Hermes adapter, Functions/Widgets) **are deferred with a trigger**, because the
vision itself says they come *after* the gateway exists — settling them now would be exactly the
"guess written as a decision" the cookbook forbids.

**What would break it:** if an item marked DEFERRED turns out to be a *dependency* of G-01, the
specification would let implementation start on an unstated assumption. The defence is to check each
DEFERRED item against G-01's own definition of done — and to say, in the document, which DEFERRED items
G-01 needs and which it does not. **That check is step 3.2 below.**

**The second thing that would break it:** writing a *count* by hand again. Draft 1's own tally was
wrong once (22/11/7 → 22/10/8); the fix is **L49** — *never write a summary count by hand, parse the
artefact you just wrote.* Draft 2's tally is parsed, not typed.

## Step 3 — The steps

**Every step is a document edit, not a command — this is a specification sprint. But every claim about
the *code* is measured, not asserted (rule zero-nine).**

**3.1 — Re-read the source, not the summary.** Draft 2's answers must quote the vision, not the batch
report about the vision. For each of the 18 items, open the cited section in
`library/ai/ai-first/` (Doc 3, Doc 4, Doc 5, Doc 6 = Doc 8) and take the answer from there.

**3.2 — Sort the 18 by the vision's build order, and check each DEFERRED item against G-01.** Produce
the four-column table: *item · build-order phase · status · why*. Any DEFERRED item that G-01 actually
needs is a **finding** — it means either the deferral or G-01's scope is wrong, and both are fixable.

**3.3 — Write §8's replacement table: all 40 rows, each with a final status and a citation.** No row
may say only "OPEN — spec" any more; every row must say *where* its answer is (a section, a file, or
the trigger that brings it back). Count the result by **parsing the table**, never by hand (L49).

**3.4 — Add the five new normative sections** the 18 items need, each short and testable:
- **the ID grammar** (phase 0) — one BNF-style rule + examples, derived from Doc 3 §39 and §222;
- **the tool policy** — the envelope + the trust tiers (Doc 8 §88, §90);
- **the approval token** — bound to a `command_hash`, re-checked on confirm (Doc 8 §59; our
  `pendingActService` already re-runs every check — cite it);
- **the outbox** — the atomic `{ state · audit · outbox }` commit (Doc 4 §52), with the *measured*
  fact that none exists today;
- **the capability manifest** — the `CapabilityManifest` shape (Doc 8 §141).

**3.5 — Verify every code claim against the running stack.** Anything draft 2 says about the code
(the resolver's shape, the tenant guard, the ledger, the MCP tools) must be **re-read from the file or
the container**, not quoted from a batch report. Where possible, read it from the running system
(`docker exec`), because the artefact beats the description of it.

**3.6 — Critic pass.** Read the document as a stranger whose job is to prove it wrong, and **name what
was attacked** — a pass that says "looks good" without listing the attacks has not run. The attacks to
run at minimum: (a) *does any row still say only "OPEN"?* (b) *is any status chosen by mood rather than
the rule in step 2?* (c) *does any DEFERRED item block G-01?* (d) *does the tally parse to 40?*
(e) *is any answer an invention rather than a citation?*

**3.7 — Update the dependent documents in the same change** (COOKBOOK rule zero): `BACKLOG.md`
(the `P0-spec` line and **N-12**), `NEEDS-YOU.md` (item 9), `INDEX.md` and `HANDOVER.md` §7/§8 (the
spec's tally), and the spec's own header (DRAFT 1 → DRAFT 2). **A batch that leaves the docs stale is
not finished.**

**3.8 — Commit in both repositories, staged by explicit path.** Repo 1 (root) gets the spec and the
documentation; repo 2 (`starting-kit`) gets nothing this sprint unless 3.5 changes a file — because
**this sprint writes no product code.** Never `git add -A`.

## Step 4 — Done when

**Status, measured 2026-10-05** — every row below was read from `library/development/SPEC-business-model-kernel.md`
by parsing it, not asserted. The commands used are shown under the table.

| | Criterion | Status |
|---|---|---|
| ✅ | Every one of the 40 rows has a final status **and a citation** — no row says only "OPEN — spec" | **PASS** — parsing §8 finds 40 numbered rows and **0** whose only content is `OPEN — spec`; all 40 carry a citation (§, Doc, file, or a named trigger) |
| ✅ | The 18 formerly-open items are each SETTLED, DERIVED, DEFERRED-with-trigger, or OPEN — owner | **PASS** — §9 states all 18 are closed in §8; what remains is 7 rows, each DEFERRED-with-trigger or OPEN — owner |
| ✅ | No DEFERRED item is a dependency of G-01 | **PASS** — the 3 DEFERRED rows are **37** (evaluation benchmark), **38** (Hermes version harness), **40** (frontend model-builder). Their triggers are G-05, the Hermes adapter, and G-02 — all *after* G-01; BACKLOG line 43 shows G-01 needs only P0-spec |
| ✅ | The tally is **parsed from the table**, and comes to 40 | **PASS** — parsed: **35 SETTLED · 1 DERIVED · 3 DEFERRED · 1 OPEN** = 40. Two routes agree (see below) |
| ✅ | Every claim about the code is re-read from the file or container, not quoted from a report | **PASS** — the two code gaps (`PrincipalKind` = 4 values; ledger has no `policy_version`/`decision_id`) were read from `principal.ts` and `ledgerService.ts` and re-checked against the live DB |
| ✅ | The critic pass names what it attacked, and what it could not break | **PASS** — §11 has **9** named attacks, each with an outcome |
| ✅ | The dependent documents are updated in the same change | **PASS** — BACKLOG (`P0-spec` + `N-12`), HANDOVER (§7 row, folder map, summary, closing block), NEEDS-YOU (item 9), START-PROMPT (step 4), `library/INDEX.md`, AGENT-HALF (superseded note) |

**The two routes used for the tally (rule zero-two):**

- **Route 1 — read the spec's own tally line** (§8): `35 SETTLED · 1 DERIVED · 3 DEFERRED · 1 OPEN — owner`.
- **Route 2 — re-parse the 40 rows from the raw table** and count each row's first status token:
  `33 SETTLED** + 2 SETTLED = 35`, `1 DERIVED** = 1`, `3 DEFERRED`, `1 OPEN` → **40 rows, same split.**
  Both routes agree, so the number is recorded rather than rounded.

**What this sprint is not:** not code, and not the kernel. Its output is a **ratifiable specification** —
and the honest statement of which items are settled, which are deferred, and which are the owner's.

---

# Sprint G-01 — the Business Model Kernel (+ G-08 relationship fabric)

**Written 2026-10-05. This is the first code sprint, and the first item of the four-item critical path
(`G-01 → G-02 → G-03`, with G-08 folded into G-01).**

**Why it is now safe to start:** `P0-spec` is done — the vision's own 40-item gate is passed and no
DEFERRED item is a G-01 dependency (Sprint P0-spec, Step 4). Item: `G-01` in
[`../library/development/BACKLOG.md`](../library/development/BACKLOG.md).

**What it is** (plan §5.2, verbatim): *the canonical, versioned, typed business model **above** the
physical database — the single source of truth (RQ-01). Relationships become first-class metadata with
declared attributes (RQ-05).*

**Done when:** a business described in plain language produces a canonical object graph with stable
IDs, declared contracts and versions; relationships carry their attributes.
**Test:** the export/reimport round-trip is empty; the rename test (batch 9 §6 #1).

## Step 1 — Research: what already exists

**Measured 2026-10-05 by reading the real code — not from a report about it** (rule zero-nine). The
whole point of this step is that the plumbing is largely built, and G-01's job is to put a *model* on
top of it rather than to rebuild it.

| Layer | File (all under `workspace/starting-kit/`) | What it already gives us |
|---|---|---|
| Authoring DSL | `packages/shared/src/modules/dsl.ts` (36 lines) | `entityId()`, `linkable()`, **`defineLink(base, extension, {join, cardinality, required, description})`**, `defineFields()`, `cf.*`. Relationships already take a join, cardinality, optionality, a description. |
| Type model | `packages/shared/src/modules/entities.ts` (107 lines) | `EntityId` = `'<module>:<entity>'`. `EntityExtension`, `CustomFieldDefinition` (28+ fields), `CustomFieldSet`, `CustomEntitySpec`. |
| Registry | `packages/shared/src/modules/registry.ts:230–272` | `Module` already carries `entityExtensions[]`, `customFieldSets[]`, `customEntities[]`. |
| Generator | `packages/cli/src/lib/generators/module-registry.ts` (4,127 lines) | Discovers each module's `data/extensions.ts` + `ce.ts` and emits them into `modules.runtime.generated.ts`. |
| **Sync installer** | `packages/core/src/modules/entities/lib/install-from-ce.ts` (328 lines) | **The declared→runtime bridge, already built.** Aggregates declared specs per entity, computes an **md5 checksum** of the declared shape, idempotently upserts entity + field definitions per tenant. Supports `dryRun` / `createOnly` / `force`. |
| Version token | `packages/core/src/modules/entities/lib/definitions-version.ts` (103 lines) | Already computes an **aggregate optimistic-lock version** for an entity's definition schema. |
| Runtime store | `packages/core/src/modules/entities/` | Tables `custom_field_defs` (definitions), `custom_field_values` (EAV values), `custom_entity`, `custom_field_entity_config`; admin APIs `definitions`, `definitions.batch`, `entities`, `relations/options`. |
| Projection target | `packages/shared/src/lib/query/engine.ts` (1,515 lines) + `query_index` module | Entity-extension joins (`resolveJoins`, `buildFilterableCustomFieldJoins`) and `cf:<key>` projection/filtering already work. |
| Security primitives | `packages/shared/src/lib/authority/decision.ts` (582), `auth/principal.ts` (215), `authority/graph.ts` (182) | `Decision` (gate·allowed·reasons·bindingRule·obligations·alternatives), `PrincipalKind`, `resolveGraphCeiling`. |

**The measured gap — and it is the finding that scopes this sprint.** Of **34 enabled modules**, only
**4** declare `entityExtensions` at all. Read from the generated artefact
(`apps/mercato/.mercato/generated/modules.runtime.generated.ts` → 4 matches) and confirmed by reading
all four source files:

- `business_rules/data/extensions.ts` → `const entityExtensions: any[] = []` — **empty**
- `workflows/data/extensions.ts` → empty
- `inbox_ops/data/extensions.ts` → empty
- `communication_channels/data/extensions.ts` → **the only real one: 4 relationships**

So the plan's *"`defineLink` appears in one file"* is **confirmed and sharper than stated: one module
out of 34, and the other three are empty stubs.** Relationships exist as a *mechanism* but carry
almost no *business model*. **G-08 is therefore not a rebuild** — the plumbing is there; what is
missing is the model expressed on top of it, and the guarantees (stable IDs, contracts, round-trip,
security inheritance).

**Two routes, both agreeing, for a claim the spec makes:** no transactional **outbox** exists.
(a) `rg -i outbox` over `packages/` + `apps/` → 0 files; (b) same search scoped to migrations → 0.
That gap is **G-16's**, not G-01's — recorded here so it is not re-measured.

**Nothing named "canonical ID" exists.** Searching `packages/` for `canonicalId|canonical_id|businessId`
→ 0 files. The spec's §12.1 ID grammar has no collision with anything present.

**From the `V`-register:** nothing new is needed for G-01 — the security primitives above are the
`V`-register items (V-14/V-16) already implemented, and G-01 consumes them rather than duplicating.

**What we reuse:** the DSL, the type model, the registry, the generator, the checksummed installer and
its dry-run, the definitions version token, the query engine's join resolution, the `Decision`
primitive. **What G-01 genuinely builds:** the **model-expression layer** on top — the canonical
objects of spec §5.4, the §12.1 stable-ID grammar, the §4.1 21-item contract, the round-trip and rename
tests, and G-08's declared relationship attributes.

**Baseline test run (host, no Docker needed):** `packages/shared` jest runs green —
`npx jest --config jest.config.cjs src/modules/__tests__/dsl.test.ts` → **6 passed, 5.9 s.** A code
sprint can therefore be tested on the host; the Docker stack (blocker **B-04**, needs Docker Desktop
running) is not required for the unit-level tests this sprint adds.

## Step 2 — Validate: is this the best approach?

**Alternative considered — build a new `kernel` module with its own tables.** **Rejected.** It would
create a *second* source of truth beside `custom_field_defs`, which is precisely what the vision
forbids (Doc 4 §54: search is a projection, never a second database; Doc 8 §110: a projection declares
its source). The spec's own §12.3 names `query_index` as the projection target and the existing
definitions store as the runtime store. A new module would also re-open the "whole-ERP EAV" failure
Doc 2 warns against.

**Alternative considered — express the kernel purely as TypeScript types, no runtime.** **Rejected.**
The plan's test is the **export/reimport round-trip is empty**, which is a *runtime* property. Types
alone cannot satisfy it.

**Approach chosen — a thin model layer over the existing store, with the round-trip as the proof.**
Concretely: (1) a **canonical ID** module implementing the §12.1 grammar (`segment ('.' segment)*`,
`[a-z][a-z0-9_]*`) with parse/format/validate and the four ID kinds (entity, field, relationship,
metric); (2) a **model descriptor** built by *reading* what the installer already aggregates
(`getAggregatedCustomEntityConfigs()`) plus declared extensions, so there is one source and no
duplication; (3) an **export → import round-trip** that must be a no-op; (4) a **rename test** proving
a rename recompiles cleanly or says "requires recompilation" (§7).

**What would break it:** if the canonical layer *holds* its own copy of definitions rather than
*reading* the existing ones, the two copies drift and we have built the very second source of truth we
rejected. **The defence is a test that compares the canonical view against the installer's aggregated
view and fails if they disagree** — the round-trip is not enough on its own. This is the same
"mirrored file drifts" hazard the project has already paid for, and it is written into step 3.4.

**The second thing that would break it:** the round-trip being *trivially* empty because it exports
nothing. **The defence is to assert the export is non-empty** — it must contain the 4 real relationships
in `communication_channels` and the declared fields — before asserting the reimport is a no-op. An
"empty diff" on an empty export proves nothing.

**The ordering rule:** build the ID grammar first, then the model descriptor, then the round-trip.
Everything later (G-02's compiler, G-04's authorization) keys off canonical IDs, so the grammar is the
foundation and must be tested before anything consumes it.

## Step 3 — The steps

**Every command runs from `workspace/starting-kit/`. Nothing in `packages/core/src/modules/entities/`
is modified — the kernel reads from it.** New code lands in `packages/shared/src/lib/kernel/` (pure,
no DB) with its tests beside it, so it is testable without a database.

**3.1 — Preconditions.**
- Confirm the baseline is green: `cd packages/shared && npx jest --config jest.config.cjs src/modules/__tests__/dsl.test.ts` → 6 passed.
- Confirm the two git repos are clean and stage **by explicit path** (never `git add -A`).
- Take a checkpoint before touching anything: `./workspace/scripts/checkpoint.sh g01-start`.

**3.2 — The canonical ID grammar** — `packages/shared/src/lib/kernel/canonical-id.ts`.
- Implement `segment ::= [a-z][a-z0-9_]*` and `id ::= segment ('.' segment)*`, per spec §12.1.
- Four constructors: `entityIdOf(name)`, `fieldIdOf(entity, field)`, `relationshipIdOf(entity, rel)`, `metricIdOf(entity, metric)` — each validating its segments.
- Three readers: `parseCanonicalId(id)` → `{ kind, segments }`, `isCanonicalId(id)` → boolean, `assertCanonicalId(id)`.
- **Boundary to respect:** this is a *naming* rule, not a foreign-key scheme. Physical PKs stay UUIDs; the canonical ID is the *semantic* identity. Do not couple them.
- Tests: valid/invalid segments; the §12.1 examples (`invoice`, `invoice.outstanding_amount`, `invoice.customer`); `invoice.customer` ≠ `customer.invoice`; a rename never rewrites the ID.

**3.3 — The model descriptor** — `packages/shared/src/lib/kernel/model.ts`.
- Define the kernel object types the spec's §5.4 names, at minimum: `Entity`, `Field`, `Relationship`, `ValueObject`, `Enum`, `Metric`, `Rule`, `Constraint`. Each carries the §4.1 **21-item contract** fields (id, version, lifecycle, provenance, classification, etc.) — declare them once in a shared `KernelObjectContract` type and intersect.
- `Relationship` must carry the **declared attributes** RQ-05 asks for: `cardinality`, `optionality`, `ownership`, `allowedTraversal`, `deleteBehaviour`, `securityInheritance`, `multiplicityRisk`. Map the four already-declared `EntityExtension` fields onto the first two and the description; the rest start explicit (`undefined` is a *declared* absence, never an implicit default).
- **`buildModelDescriptor(input)` reads** from (a) the installer's `getAggregatedCustomEntityConfigs()` for declared entity/field sets and (b) the merged `entityExtensions` from the generated module registry. It **holds no copy** — it returns a view.
- **Versions are real, not an empty field** *(added during the build)*. Give every object a **content-derived version** (a pure FNV-1a over the object's own declaration, excluding the version itself) so a changed declaration changes the version and an unchanged one does not. Deterministic, so the round-trip stays empty. Without this, "declared contracts and versions" would be satisfied by a field that is always empty.
- **Report relationship-id collisions, never merge them** *(added during the build)*. Two declared edges from one entity to the same extension collapse to one id; collect them into `relationshipIdCollisions` rather than letting one overwrite the other — that is the "two things share one id" case §12.1 forbids.

**3.3b — The live wiring** — `packages/shared/src/lib/kernel/from-modules.ts` *(added during the build)*.
- A kernel that takes declarations as an argument but is never given the real ones is a library with no caller. `collectDeclarations()` reads each registered module's `entityExtensions` / `customFieldSets` / `customEntities`; `buildModelFromModules()` is the single entry point from "what the modules declare" to the canonical model.
- **It reads the same registry the installer reads** — `getModules()` — so the kernel is a *view* of one source, not a second source. No database, no side effects, testable in a unit test.
- `tryBuildModelFromModules()` returns `null` when the registry is not ready (registration has not happened) — distinct from an **empty model**, which is a tenant with no entities. The two must not be conflated.

**3.4 — The drift guard (the thing that stops the second source of truth).**
- A test that drives **both readers from one registered module set** and compares them object by object: the installer's `getAggregatedCustomEntityConfigs()` against the kernel's `buildModelFromModules()`. They read the same registry, so they must agree; any entity or field in one and not the other fails the test with both sides printed.
- **It lives in `core`, not `shared`** *(decided during the build)*, because it needs the installer, and `shared` must not depend on `core`. Location: `packages/core/src/modules/entities/lib/__tests__/kernel-drift-guard.test.ts`.
- This is the project's "mirrored file stays in step" discipline applied to the model layer. The companion check in `shared` — that `buildModelDescriptor` **holds no copy** (two builds are equal and independent, and mutating one cannot affect the next) — is the other half.

**3.5 — The export/import round-trip** — `packages/shared/src/lib/kernel/round-trip.ts` + test.
- `exportModel(descriptor)` → a stable, sorted JSON document (sorted keys, sorted arrays, canonical IDs as the keys) so the bytes are reproducible.
- `importModel(document)` → a descriptor.
- **Assert non-empty first:** the export must contain the **4** relationships from `communication_channels` and the declared field sets — otherwise the test is proving nothing.
- **Then assert the round-trip is empty:** `exportModel(importModel(exportModel(d))) === exportModel(d)`, byte for byte.
- Second route for the same property: import twice and confirm the second import is also a no-op (`importModel` is idempotent) — two genuinely different checks, not the same check twice.

**3.6 — The rename test.**
- Rename a field's *label*: the canonical ID is unchanged and the round-trip stays empty.
- Attempt to rename a field's *key* (the ID segment): the model **reports "requires recompilation"** rather than silently rewriting the ID (spec §12.1 property 3; I14 — authority objects are superseded, never edited).
- Both outcomes are asserted; a silent pass on the second is a failure.

**3.7 — The relationship attributes** (G-08's half).
- Extend the existing DSL **additively**: `defineLink` gains an optional attributes block. **Do not change existing call sites** — the 4 live relationships in `communication_channels` and the 3 empty stubs must still type-check unchanged. This is the "widen a shared matcher without capturing what it must not" hazard: measure the blast radius (all 4 files) before and after.
- Re-run `npx jest` for `packages/shared` and for the CLI generator's `module-entities` / `structural-contracts` suites to prove nothing else moved.

**3.8 — Critic pass.** A separate pass whose only job is to break the above, and it must **name what it attacked**: (a) does the descriptor secretly hold a copy? (b) is the round-trip empty only because the export is empty? (c) does a rename silently rewrite an ID? (d) do the 4 existing `defineLink` call sites still type-check? (e) is any claimed number (4 relationships, 34 modules) re-measured from the artefact rather than recalled? **If it says "looks good" without listing attacks, it has not run.** Loop until a fresh pass finds nothing.

**3.9 — Update the dependent documents in the same change** (rule zero): `BACKLOG.md` (the `G-01` line), the spec's §10 (definition of done — record what G-01 proved), and this cookbook's Step 4 table. Docs stale in the same change is a defect.

**3.10 — Commit in both repositories, staged by explicit path.** Repo 2 (`starting-kit`, branch `main`) gets the new kernel code and tests. Repo 1 (root, branch `master`) gets the docs. **Never `git add -A`.**

## Step 4 — Done when

*Fill this table only after the build, from measurement — not in advance.*

| | Criterion | Status |
|---|---|---|
| ✅ | The canonical ID grammar is implemented and matches spec §12.1 | **PASS** — `canonical-id.ts`; 14 tests incl. the §12.1 examples and the `invoice.customer` ≠ `customer.invoice` property |
| ✅ | The model descriptor reads from the existing store and holds no copy (drift guard passes) | **PASS** — two checks. (a) `model.ts` holds no module-level state; a mutation-isolation test builds twice and proves one result cannot affect the next. (b) **The real drift guard**: a `core` test drives the installer's `getAggregatedCustomEntityConfigs()` and the kernel's `buildModelFromModules()` from **one registered module set** and asserts they see the same entities, fields and relationships — **4/4 pass** |
| ✅ | The export is **non-empty** (contains the 4 `communication_channels` relationships + declared fields) | **PASS** — asserted *before* the emptiness check; the fixture is the real 4 declarations read from `communication_channels/data/extensions.ts` |
| ✅ | The export/import round-trip is **empty**, by two routes | **PASS** — route 1: `export(import(export(m))) === export(m)` byte for byte; route 2: `import` is idempotent (a second import is also a no-op) |
| ✅ | The rename test: a label rename is clean; a key rename reports "requires recompilation" | **PASS** — both outcomes asserted; the silent pass on a key rename is treated as a failure |
| ✅ | `Relationship` carries its declared attributes (G-08) | **PASS** — optional `attributes` block; absent attributes stay absent, never defaulted |
| ✅ | The 4 existing `defineLink` call sites still type-check unchanged | **PASS** — the original `dsl.test.ts` passes unmodified; `tsc --noEmit` clean in `shared` **and** `cli`; the generator only casts and passes `EntityExtension[]` through (`module-registry.ts:3163`) |
| ✅ | The critic pass names what it attacked and finds nothing | **PASS** — attacks run and named in the section below |
| ✅ | Versions are real, not an empty field | **PASS** *(added during the build)* — every object carries a content-derived version; changing the declaration changes it, leaving it alone does not |

**The measured evidence (rule zero-nine — from the artefacts, not the description):**

| Check | Result |
|---|---|
| Kernel suite | **5 suites / 51 tests pass** (`npx jest src/lib/kernel`) |
| Shared package | **170 suites / 1909 tests pass** (`npx jest`) |
| Drift guard (`core`) | **4/4 pass** (`kernel-drift-guard.test.ts`) |
| `packages/shared` typecheck | `tsc --noEmit` → **exit 0** |
| `packages/cli` typecheck | `tsc --noEmit` → **exit 0** |
| CLI generator (`module-entities`) | **4/4 pass** |

**The one failure, and why it is not ours.** `packages/shared` also contains
`src/lib/bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`, whose 8 tests fail with
`spawnSync … EBUSY` — the test spawns a node subprocess and this environment refuses. **Proven
environmental, not caused by G-01:** with G-01's changes **stashed** (a clean tree), the same test fails
identically. That is the second route; the first is that the failure is at process spawn, before any
kernel code runs.

**Critic pass — what it attacked (a pass that says "looks good" has not run):**

1. *Does the descriptor secretly hold a copy?* — No. No module-level mutable state in `kernel/*.ts`; a mutation-isolation test proves it.
2. *Is the round-trip empty only because the export is empty?* — No. The export is asserted non-empty first (4 relationships + fields).
3. *Does a rename silently rewrite an id?* — No. A key rename is detected as `requires_recompilation`; the old id is never mutated.
4. *Do the 4 existing `defineLink` call sites still type-check?* — Yes. Original `dsl.test.ts` unchanged and passing; both package typechecks clean.
5. *Is every number re-measured from the artefact?* — Yes. The "4 of 34 modules" figure was read from `modules.runtime.generated.ts` (4 matches) **and** by reading all four source files.

**What this sprint is not:** not the IR, not the compiler (that is G-02), and not the authorization
layer (G-04). Its output is the **canonical model and its proof** — the thing every later item keys off.

---

# The hosting environment — `Platform-Server` (Coolify)

**Built 2026-10-04.** A separate environment from Sprint 0: an Ubuntu Server 24.04 VM on Hyper-V
running Docker + Coolify, so a site can be *cloud-checked* on this laptop and shared with testers.
**Operate it from [`../../library/development/RUNBOOK-platform-server.md`](../library/development/RUNBOOK-platform-server.md)** —
that is the one page to read. Built per
[`../../library/development/PLAN-coolify-laptop-implementation.md`](../library/development/PLAN-coolify-laptop-implementation.md).

Two things to know before touching it:

- **`eth1` is the stable address (`172.28.50.2`).** `eth0` is DHCP on the Hyper-V Default Switch and
  **its address changes across reboots** — never hard-code it. `Get-VMNetworkAdapter -VMName
  "Platform-Server"` reports the current one from the host.
- **One step needs Administrator** (Phase 6: host IP `172.28.50.1` + a firewall rule allowing 8080
  from the VM only). `vms/phase6-ai-network-build.ps1` and its undo script are written and reviewed;
  they are idempotent and remove only what they created.

**Three rules this build added, worth carrying to any VM or console work:**

1. **A success return is a claim about the API, not about the world.** `Msvm_Keyboard.TypeText`
   returns `0` and types nothing; the working path is `PressKey`/`ReleaseKey` with virtual-key codes.
   Prove an input path with a control that must change something you can *see* — pressing Enter alone
   produced a third prompt line, which is what isolated the fault. ([[L59]])
2. **"Drive" is not "hard disk".** `BootType -eq "Drive"` matches a DVD too; a first attempt at
   "hard disk first" moved the empty DVD to the front. Discriminate on the device type.
3. **Re-read after a pause.** A read taken immediately after a write reported a detach that had
   already happened; and a guest reboot silently moved the VM's IP. Neither was a fault — both were
   stale or changed state believed on a single reading.
