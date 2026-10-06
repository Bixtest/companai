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
check failed; see step 3.6 and blocker **B-05**). **B-05's design face was decided 2026-10-05:** what
replaces OpenCode is a **supervised private Hermes runtime behind the internal port**, with Hermes
**headless** (the Starting Kit owns every surface a user sees). *When* OpenCode goes is a separate,
still-open item (**N-8**). See
[`../library/development/ARCHITECTURE-hermes-integration.md`](../library/development/ARCHITECTURE-hermes-integration.md) §11.

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
      # Tool calling. Hermes' own docs (integrations/providers.md) carry a caution: without
      # --jinja, llama-server IGNORES the `tools` parameter, and Hermes then sees the model's
      # tool call as plain text instead of a call. NOTE: our own prior study
      # (library/ai/qwen-hermes-tool-calling-report.md) reads it the other way and says newer
      # builds enable it by DEFAULT. Settle it by reading the running server, not the flag:
      #   curl -s http://model:8080/props | jq '.chat_template'   # a template, not null
      # It is free and it removes a dependency on a build default, so we set it explicitly.
      - --jinja
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

> **This server does chat. It does not do embeddings.** The tool-search index needs a second
> endpoint, and B-16 records the failure. **The full trace is in
> [`../library/development/ARCHITECTURE-model-server-integration.md`](../library/development/ARCHITECTURE-model-server-integration.md)
> §6.2**, and it is two defects, not one: the `mcp` service was never given `OPENAI_BASE_URL`
> (so the embedding call went to `api.openai.com` with the placeholder key), **and** this server
> has no embedding model. Fixing it means a second `llama-server` with an embedding GGUF, plus a
> way for the embedding lane to be pointed at it. **Neither is part of Sprint 0** — the four
> changes, with their triggers, are in §4 of that document.

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

> **This works, and it is a workaround — the recommended fix is deferred.**
> `OM_AI_PROVIDER=openai` relabels a local llama.cpp server as "OpenAI". The endpoint is right, but
> the model dropdown then shows OpenAI's catalog (GPT-5 Mini, GPT-5, GPT-4o-mini, GPT-4o) while the
> server actually serves Qwen2.5, and an operator sees "OpenAI" for a machine in their own rack.
> The clean answer is **one entry** in `openai-compatible-presets.ts`, exactly the shape of the
> `ollama` and `lm-studio` presets already there:
>
> ```ts
> { id: 'llamacpp', name: 'llama.cpp (local)', baseURL: 'http://model:8080/v1',
>   baseURLEnvKeys: ['LLAMACPP_BASE_URL'], envKeys: ['LLAMACPP_API_KEY'],
>   defaultModel: '', defaultModels: [] }
> ```
>
> **Sharp edge, recorded not hidden:** a preset activates only when its key env var is non-empty
> (`isConfigured()` → `resolveApiKey() !== null`). A keyless llama.cpp server therefore still needs
> a placeholder, the same convention as `OPENAI_API_KEY=local` above.
> **Trigger: the next `model`-service change.** See
> [`../library/development/ARCHITECTURE-model-server-integration.md`](../library/development/ARCHITECTURE-model-server-integration.md) §4.2.

> **And the `mcp` service needs the base URL too.** `OPENAI_BASE_URL` is currently set for
> `opencode` and `app` and **not** for `mcp` — which is where the tool-search index runs, and why
> B-16's error says `Invalid OpenAI API key`. **One line:**
> `OPENAI_BASE_URL: ${OPENAI_BASE_URL:-}` in the `mcp` service's `environment:` block.

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

**B-05 is now decided, and it does not change this step.** On 2026-10-05 the owner approved the runtime
boundary: one product, one repository, one deployment, one interface (ours), with Hermes as a
**supervised private runtime process behind the internal port**. Hermes is **headless**. That settles
**what replaces OpenCode**, not **when** — so the instruction above still stands exactly as written:
**do not remove `opencode` in Sprint 0.** The reasoning, the owner's three challenges and the two
hostile passes that corrected them are in
[`../library/development/ARCHITECTURE-hermes-integration.md`](../library/development/ARCHITECTURE-hermes-integration.md) §11.

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

## Sprint 0 — the re-run (2026-10-06): the stack comes up whole, and why it did not

**Why the re-run.** `S0` in [`../library/development/BACKLOG.md`](../library/development/BACKLOG.md)
is "**a re-run to confirm it still comes up**" — the workbench was built and proven on 2026-10-04, and
a workbench nobody re-checks is a claim, not a fact. It was blocked only because Docker Desktop had to
be started by hand; the owner turned auto-start on (2026-10-06), so it became runnable.

**What the re-run found — a real defect in the running stack, and it was already live.**

When the re-run started, the stack was **not** whole. `docker ps -a` showed **eight** defined
containers but only **seven** running, and `mercato-mcp-local` reported **`unhealthy`**:

```
mercato-redis-local      Exited (255) 12 hours ago
mercato-mcp-local        Up 12 hours (unhealthy)     ← FailingStreak 1446
```

**The cause, measured three ways.** `mercato-redis-local` is the **only** service in
`docker-compose.fullapp.yml` with **no `restart:` policy** — every other service carries
`restart: unless-stopped` (`docker inspect .HostConfig.RestartPolicy` → redis `no`, all others
`unless-stopped`). Its log shows a plain `SIGTERM` shutdown, no crash — consistent with a host/Docker
restart while redis had nothing telling it to come back. The `mcp` service declares
`depends_on: redis: condition: service_healthy`, so its server never finishes starting: its log shows
`getaddrinfo ENOTFOUND mercato-redis-local` then `API key provisioning FAILED … Retrying in 300s`,
and its healthcheck (`wget http://127.0.0.1:3001/health`) fails with `connection refused`.

**So `mercato-mcp-local` unhealthy was a symptom of the dead redis, not a fault in the MCP.** That is
what `S0`'s re-run existed to explain, and it is now answered.

**The fix (mine, small, reversible).** Add the missing restart policy to the redis service in
`docker-compose.fullapp.yml`:

```yaml
  redis:
    image: redis:7-alpine
    container_name: mercato-redis-${DEPLOY_ENV:-local}
    restart: unless-stopped      # ← added; every other service already had it
```

Then `docker compose -f docker-compose.fullapp.yml up -d redis` (recreates redis) and
`docker restart mercato-mcp-local` (so it stops retrying the dead redis and re-provisions its key).
**To undo:** delete the one `restart:` line and `docker restart` the two services.

**Done when — measured 2026-10-06, two independent routes:**

| Route | Observation |
|---|---|
| **Container states** | All **eight** services **healthy**: `mercato-redis-local` (healthy), `mercato-mcp-local` (**healthy**, `failing=0`, was 1446), app/meilisearch/model/opencode/postgres all healthy, hermes up. |
| **The MCP's own log** | `[ai_assistant:mcp-http] Tools registered toolCount=21`, `Endpoint ready …http://localhost:3001/mcp`, `Health endpoint ready …/health`, `Server listening port=3001`. |
| **The app itself** | `http://localhost:3000/login` → **200**; no `redis` / `ECONNREFUSED` lines in the app log since the restart. |
| **The model server** | `http://localhost:8080/v1/models` → **200**. |

**One caveat, stated plainly.** The MCP log still carries
`Failed to index 21 tools: … vector ([vector.embedding] Invalid OpenAI API key)` — that is
**B-16** (the embeddings lane), a **pre-existing known blocker**, not a regression: the vector
strategy is degraded while the fulltext strategy indexes, and all 21 tools register and are callable.

**What the re-run did *not* do.** It did not re-prove arrow (1)'s *live tool call* from a Hermes
agent, which remains where 2026-10-04 left it (the wire is sound; the CPU-only 7B's tool choice is
the open question). Re-proving that needs an agent turn at ~40 minutes of ingest, and it is not what
`S0`'s re-run asked for.

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
| **Hermes version harness** (row 38) | The vision §230: the Hermes adapter comes **only after the gateway exists**. **The boundary itself (row 26) was approved by the owner on 2026-10-05** — a supervised private runtime process behind the internal port, Hermes headless — so this is now **DEFERRED with a real trigger: the adapter exists**, rather than waiting on a decision. | Vision Doc 8 §230; [`../library/development/ARCHITECTURE-hermes-integration.md`](../library/development/ARCHITECTURE-hermes-integration.md) §11 |
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
*(Since then the owner has **approved the boundary, on 2026-10-05**, so row 26 is settled by his
answer rather than invented. The rejection above still stands for the other items, whose triggers
have still not fired.)*

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

# Sprint G-02 — the Business IR and the compiler

**Written 2026-10-05. Second item of the four-item critical path (`G-01 → G-02 → G-03`).**

**Why it is now safe to start:** `G-01` is built and measured — the canonical model, its §12.1
stable-ID grammar, its round-trip and its drift guard all pass (Sprint G-01, Step 4). Item: `G-02` in
[`../library/development/BACKLOG.md`](../library/development/BACKLOG.md).

**What it is** (plan §2 phase 1, verbatim): *the **IR** exists and the compiler turns IR into schema;
SQL is a target, never the source.*
**Done when:** the IR exists and the compiler turns IR into schema; **SQL is a target, never the source.**
**Test** (plan §2 phase 1, verbatim): **the rename test (batch 9 §6 #1)** — *rename a field; the IR
either recompiles cleanly or says "requires recompilation". If it silently produces wrong SQL, the IR
is not real.*

## Step 1 — Research: what already exists

**Measured 2026-10-05 by reading the real code — not from a report about it** (rule zero-nine). The
point of this step is the same as G-01's: most of the plumbing is built, and G-02's job is to put a
*typed request shape* in front of it rather than to rebuild it.

| Layer | File (all under `workspace/starting-kit/`) | What it already gives us |
|---|---|---|
| **The IR itself** | — | **Nothing.** `BusinessQueryIR` / `BusinessCommandIR` / `TaskContract` / `ResultContract` are *named* in the spec §6 with the source "Doc 3 §50/§53" — **specified, not built.** A search over `packages/` for all four → **0 files.** |
| Read compile target | `packages/shared/src/lib/query/types.ts` (181 lines) | `QueryOptions` — `fields`, `filters` (`Filter[]` **or** a Mongo-style `Where`), `sort`, `page`, `tenantId`, `organizationId`, `joins`, `customFieldSources`. **Row-oriented: there is no `groupBy` and no aggregate.** This is what a `list` IR must compile *to*. |
| Read engine | `packages/shared/src/lib/query/engine.ts` (1,515 lines) | `BasicQueryEngine.query(entity, opts)`. `resolveEntityTableName(em, entity)`; its fail-closed sibling `resolveRegisteredEntityTableName` returns **`null` rather than guessing** a table — the posture the compiler copies. |
| Join / path layer | `packages/shared/src/lib/query/join-utils.ts` (373 lines) | `resolveJoins`, `buildJoinChain` (**detects a circular join**), `partitionFilters`, `applyJoinFilters`, `normalizeFilters` (DNF expansion with a **complexity cap**). The physical join the IR must compile to. |
| Write compile target | `packages/shared/src/lib/crud/mutation-guard.ts` | `CrudMutationGuardValidateInput` — `operation: 'create'\|'update'\|'delete'\|'custom'`, `resourceKind`, `resourceId`, `mutationPayload`. `factory.ts` (3,036 lines) is the CRUD engine behind it. |
| **The AI's write path today** | `packages/ai-assistant/.../prepare-mutation.ts` (460 lines) | **The vision's §53 Command IR is already ~80% present.** `AiPendingAction` carries a **`computeMutationIdempotencyKey`** (SHA-256 over tenant/org/agent/conversation/tool/input), a **field diff** (= §54's *impact analysis*), and a **pending-action preview card** (= §54's *human confirmation*). What it does **not** have: a **business command** with typed `inputs` — it is keyed by `toolName` + free-form `normalizedInput`. |
| **The AI's read path today** | `packages/ai-assistant/.../codemode-tools.ts` (1,044 lines) | The AI calls **`api.request({method, path, query?, body?})`** — **not raw SQL.** So "the AI never writes raw SQL" (§49/§52) is *already true in code*; the IR's job is to give that call a **typed, validated shape**. |
| Scope enforcement | `packages/ai-assistant/.../scope-injection.ts` (48 lines) | `applyContextScopeToQuery` / `applyContextScopeToBody` **delete any AI-supplied `tenantId`/`organizationId`** and re-apply them **from context only**, fail-closed when the context has none. Also drops `__proto__`/`constructor`/`prototype`. **The compiler must reuse this rule, not reinvent it.** |
| Entity resolution | `packages/shared/src/lib/entities/naming.ts`; `engine.ts` | Entities are addressed by `EntityId` = `'<module>:<entity>'`. `tableNameFromEntityId` / `resolveEntityTableName` map id → table. **There is no name→id resolver** in the query layer. |
| Field kinds | `packages/shared/src/modules/entities/kinds.ts` (23 lines) | **13** kinds: `text multiline integer float boolean select currency relation attachment dictionary phone date datetime`. The vocabulary the IR's **type checking** must use. |
| The model to compile against | `packages/shared/src/lib/kernel/` (G-01) | `ModelDescriptor` — entities keyed by canonical id, each with `fields[]` and `relationships[]`; `planFieldRename(before, after) → RenamePlan` with `status: 'clean' \| 'requires_recompilation'`. **The rename test's engine is already built.** |

**Three measured gaps — and they scope this sprint.**

1. **No metric or measure concept exists.** Search `packages/shared/src` + `packages/core/src` for
   `Metric`/`Measure` type declarations → **0 files**; `dsl.ts` exports no `defineMetric`. The vision's
   IR carries `measures`, and its filters and sorts may reference a `metric` — so §51's **"metric
   expansion" stage has nothing to expand from today.**
2. **The query layer is row-oriented.** `QueryOptions` has no `groupBy` and no aggregate. The vision's
   IR carries `grain`, `dimensions` and `measures` — **analytical**. So an aggregate IR cannot compile
   to today's `QueryOptions`. This is a **capability gap, not an error**: the IR is right; the physical
   target cannot yet run it.
3. **The model is deliberately not physical.** G-01's canonical id is *not* the platform `EntityId`
   (`auth:user` → `user`), and `KernelRelationship` carries no join columns. Both are **physical
   bindings**, and G-01's whole point is to sit **above** the physical database. So the compiler must
   be handed a **binding** (canonical → platform entity, canonical relationship → join columns) rather
   than reading one out of the model — and it must **never guess** one (the model's own rule: *the kind
   of an id is declared, never guessed*).

**Two routes, both agreeing, that no IR exists:** (a) a search over `packages/` for the four contract
names → **0 files**; (b) the spec §6 names all four with the source "Doc 3 §50/§53" — i.e. they are
**specified, not built**. Both agree.

**Two routes, both agreeing, that the AI does not write SQL:** (a) `codemode-tools.ts` exposes
`api.request` and **no SQL tool**; (b) the generated tool surface is API-backed (`api-backed-tool.ts`,
`api-endpoint-index.ts`). Both agree.

**What we reuse:** the G-01 model and its rename planner; `QueryOptions` as the compile target; the join
utilities' path and cycle rules; the scope-injection rule; the field-kind vocabulary. **What G-02
genuinely builds:** the **IR types** (§50/§53), the **compiler** with §51's stages as named,
individually-testable steps, the **bindings** that join canonical to physical, and the **rename test at
the IR level**.

## Step 2 — Validate: is this the best approach?

**Alternative considered — a textual DSL the AI writes, then a parser.** **Rejected, for now.** §49 is
explicit: the *initial* implementation is *"JSON Schema + typed runtime models + canonical IDs +
structured model/tool calling"*, and a textual DSL *"can be added later for debugging and power
users"*. JSON IR first.

**Alternative considered — compile the IR straight to SQL.** **Rejected.** §52 *demotes* SQL; and the
platform **already** has a query engine that turns `QueryOptions` into SQL with tenant scoping, joins
and custom fields. Compiling to SQL would duplicate that engine and make the compiler untestable
without a database. Compiling to `QueryOptions` **reuses** it.

**Alternative considered — put the IR in a new persisted module.** **Rejected.** Spec rule **R2** says a
*contract* is not an *object*: the IR describes the shape of a request, it does not persist. (A User
Function *is* compiled IR made durable — but that is **G-03**.)

**Approach chosen — a pure IR plus a stage-by-stage compiler that compiles to the existing
`QueryOptions`, validated against the G-01 model, with the rename test as the proof.**

- **Pure, so it tests without a database** — the same choice G-01 made, and the reason both run on this
  host.
- **The stages are the vision's, named one-for-one** (§51), each returning either a value or a typed
  diagnostic. A stage that is not implemented reports a **gap** rather than silently passing.
- **Two severities, because "wrong" and "not yet possible" are different things.** `error` = the IR is
  invalid, **reject**. `gap` = the IR is valid but the platform cannot execute it yet; the compile
  **succeeds** and the gap is reported. This is what turns the compiler into a **measurement
  instrument** for what the platform can and cannot do — the project's own habit (rule zero-nine).
- **The IR carries no scope.** There is no `tenantId`/`organizationId` field in the IR type at all, and
  the compiler injects scope from the operating context — the fail-closed rule `scope-injection.ts`
  already applies. An IR that *tried* to carry scope could not, because the type has nowhere to put it.

**What would break it, and the defence:**

1. **A renamed or removed field silently compiles.** This is the plan's exact test. **Defence:** the
   compiler resolves **every** reference against the model and **fails closed** on any it cannot
   resolve; and the rename-aware entry (`recompileQuery`) consumes G-01's `RenamePlan`, so a moved
   field is reported as **"requires recompilation"** with the rename's own plain-language reason — not
   as a bare "not found".
2. **The IR could widen scope.** **Defence:** no scope field exists in the type; scope is injected from
   context only.
3. **A negative-only test suite proves nothing.** **Defence:** assert the **positive** path first — a
   real IR compiles to a real `QueryOptions` — before the negative ones, and assert the plan's
   **provenance** names the model version it compiled against.
4. **A gap hidden as a pass.** **Defence:** every unimplemented stage reports a `gap` diagnostic, and a
   test asserts the gaps are *present* for an aggregate IR rather than the compile silently "passing".

**The ordering rule:** the IR types first, then the model index (resolution), then the compiler, then
the rename-aware recompile, then the bindings. The rename test is the last thing built and the first
thing that proves the whole.

**Deferred, with its trigger (rule zero-one).** `TaskContract` — the declared shape of a task handed to
a subagent (Doc 3 §27) — is **one of the spec's four contracts but is neither a read nor a write**, so
it is not G-02's. It belongs to the **delegation boundary**, and C-15's rename (*authority* delegation
vs *task* delegation) is still settling. **Trigger: AH-2 (the responsibility rule) is built.** Named
here so it is not silently dropped.

## Step 3 — The steps

**Every command runs from `workspace/starting-kit/`. Nothing in `packages/shared/src/lib/kernel/` is
modified — G-02 *consumes* the model, it does not extend it.** New code lands in
`packages/shared/src/lib/business-ir/` (pure, no DB) with its tests beside it.

**3.1 — Preconditions.**
- Confirm the baseline is green: `cd packages/shared && npx jest src/lib/kernel` → 5 suites / 51 tests.
- Confirm the two git repos are clean and stage **by explicit path** (never `git add -A`).
- Take a checkpoint before touching anything: `./workspace/scripts/checkpoint.sh g02-start`.

**3.2 — The IR types** — `packages/shared/src/lib/business-ir/types.ts`.
- `BusinessQueryIR` with the §50 fields, **verbatim**: `operation`, `entity`, `grain`, `dimensions`,
  `measures`, `filters`, `relationships`, `timeRange`, `timeBasis`, `currencyBasis`, `sort`, `limit`.
- `BusinessCommandIR` with the §53 fields, **verbatim**: `command`, `inputs`, `requested_by`,
  `idempotency_key`.
- `ResultContract` — the declared shape of a result, **including provenance** (§51's last line).
- **Every reference is a canonical id** (§12.1), so the IR is stable across renames and unambiguous
  across modules. A **single-segment** reference (the vision's own example writes `"country"`) resolves
  **relative to the subject entity** — a declared rule, tested, not a guess.
- **There is no scope field.** `tenantId`/`organizationId` do not exist in the type (see Step 2).
- `IrDiagnostic` — `{ stage, severity: 'error' | 'gap', code, message, path? }`.

**3.3 — The model index** — `packages/shared/src/lib/business-ir/model-index.ts`.
- `createModelIndex(model: ModelDescriptor)` — the **schema-resolution** stage's lookup: entity by
  canonical id, field by canonical id, relationship by canonical id, and a metric lookup (empty today —
  the gap is real and the index must say so rather than pretend).
- Resolution helpers that implement the **relative-leaf rule** and report **ambiguity as an error**,
  never a silent pick.
- Pure and stateless: two indexes over the same model are independent.

**3.4 — The bindings** — `packages/shared/src/lib/business-ir/bindings.ts`.
- `PhysicalBindings` — canonical entity id → `{ platformEntityId, table? }`; canonical relationship id
  → `{ fromField, toField }` (the join columns, which the model deliberately does not carry).
- `createBindingsFromDeclarations(input)` — builds them from the **same declarations** G-01 reads, using
  the **same** `canonicalEntityId` / `relationshipIdOf` functions, so the mapping is **declared, not
  guessed**. Two module-qualified ids that collapse to one canonical id are **reported as a collision**,
  not silently merged (the G-01 posture).

**3.5 — The compiler** — `packages/shared/src/lib/business-ir/compile.ts`.
- `compileQuery(ir, model, ctx, bindings)` → `{ ok: true, plan } | { ok: false, diagnostics }`.
- The §51 stages as **named functions**, in the vision's order: `resolveSchema`, `checkTypes`,
  `resolveValues`, `validatePaths`, `expandMeasures`, `normaliseTimeCurrency`, `injectAuthorization`,
  `injectScope`, `planPhysical`, `validateSqlSafety`. Each returns a value **or** a diagnostic; a stage
  not implemented returns a `gap`, never a silent pass.
- **`planPhysical` compiles a `list` IR to a real `QueryOptions`** (`fields`, `filters`, `sort`, `page`,
  `joins`) — the same shape the engine already runs. An `aggregate` IR compiles to a logical plan and
  reports the **row-oriented gap** (finding 2 above).
- **Scope injection reuses the existing rule**: the IR has no scope; the compiler adds `tenantId` /
  `organizationId` **from `ctx` only**, and reports an `error` when the context has none (fail closed).
- **Provenance** — the plan records the **model version it compiled against** (a content version over
  the model, reusing G-01's `contentVersion`) and the list of stages it passed. Deterministic: **no
  timestamps**, or the plan stops being reproducible.

**3.6 — The rename test** — `packages/shared/src/lib/business-ir/recompile.ts` + test.
- `recompileQuery(ir, before, after, ctx, bindings)` — the plan's test, implemented.
- Compile an IR that references `customer.country` against model **A** → **clean**.
- Rename the field in model **B** → `planFieldRename(A, B)` says `requires_recompilation`; compiling the
  **same** IR against **B** must return **`requires_recompilation`** with the rename's reason — it must
  **not** silently compile to the old (or a wrong) column.
- Update the IR to the new id → compiles **cleanly** against **B**.
- **Both directions asserted.** A silent pass on the second is a **failure**, which is the whole point
  of the test.

**3.7 — Critic pass.** A separate pass whose only job is to break the above, and it must **name what it
attacked**: (a) does a renamed field silently compile? (b) can the IR carry or widen scope? (c) is the
"requires recompilation" answer produced by the rename engine, or by a lucky string comparison? (d) does
a `gap` hide a failure — is the compile really `ok: true` only when no `error` exists? (e) is every
claimed number (13 field kinds, 0 metric files, 0 IR files) re-measured from the artefact, not recalled?
**If it says "looks good" without listing attacks, it has not run.** Loop until a fresh pass finds
nothing.

**3.8 — Update the dependent documents in the same change** (rule zero): `BACKLOG.md` (the `G-02` line,
and every item that reads "needs G-02"), the spec's §10 (record what G-02 proved), and this cookbook's
Step 4 table. Docs stale in the same change is a defect.

**3.9 — Commit in both repositories, staged by explicit path.** Repo 2 (`starting-kit`, branch `main`)
gets the new IR and compiler and tests. Repo 1 (root, branch `master`) gets the docs. **Never `git add -A`.**

## Step 4 — Done when

*Filled from measurement after the build.*

| | Criterion | Status |
|---|---|---|
| ✅ | The IR types exist with §50/§53's fields verbatim | **PASS** — `types.ts`: `BusinessQueryIR` carries all twelve §50 fields; `BusinessCommandIR` all four §53 fields. Every reference is a canonical id; a bare leaf resolves **relative to the subject**, a declared rule. |
| ✅ | The compiler turns a `list` IR into a real `QueryOptions` | **PASS** — dimensions → `fields`, filters → `filters` (with the operator vocabulary mapped), sort → `sort`, limit → `page.pageSize`, relationships → `joins`. Asserted field-by-field. |
| ✅ | **The rename test: a field rename either recompiles cleanly or says "requires recompilation"** | **PASS, both directions and two levels.** *Floor:* the old IR against the renamed model **fails** (`UNKNOWN_FIELD`) — it can never silently compile. *Ceiling:* `recompileQuery` returns `requires_recompilation`, names the field and its destination, and takes its reasons from **G-01's `planFieldRename`**. An IR updated to the new id recompiles **cleanly**; a label-only change is **clean**; a change that misses the IR is **clean**. |
| ✅ | The IR cannot carry scope; scope is injected from context only (fail closed) | **PASS, two routes.** *Runtime:* scope smuggled onto the IR is ignored, the context wins; a missing tenant **fails the compile**. *Type-level:* `tsconfig.business-ir-tests.json` + a **falsification probe** prove the `@ts-expect-error` on the scope line is genuinely used — i.e. the type really forbids it. |
| ✅ | Every unimplemented stage reports a `gap`, never a silent pass | **PASS** — four stages report gaps, each naming its owner: `inject_authorization` (G-04), `plan_physical` (row-oriented target), `normalise_time_currency` (no currency basis), `validate_sql_safety` (no SQL emitted). A test asserts an IR with **both** an error and a gap fails **and still reports the gap**. |
| ✅ | The plan carries provenance naming the model version it compiled against | **PASS** — `provenance.modelVersion` (G-01's `contentVersion` over the model), `stages` (all ten on a clean compile), `gaps`. Deterministic: no timestamps. A test proves the version **changes** when the model changes and is **stable** when it does not. |
| ✅ | The critic pass names what it attacked and finds nothing | **PASS** — six attacks, all executable, in `__tests__/critic.test.ts`; listed below. |

**The measured evidence (rule zero-nine — from the artefacts, not the description):**

| Check | Result |
|---|---|
| business-ir suite | **4 suites / 47 tests pass** (`npx jest src/lib/business-ir`) |
| kernel suite (G-01, untouched) | **5 suites / 51 tests pass** |
| Shared package | **174 suites / 1952 tests** — **173 suites / 1944 tests pass** |
| Drift guard (`core`) | **4/4 pass** |
| `packages/shared` typecheck | `tsc --noEmit` → **exit 0** |
| `packages/cli` typecheck | `tsc --noEmit` → **exit 0** |
| `packages/core` typecheck | `tsc --noEmit` → **exit 0** |
| Type check **including the tests** | `tsc -p tsconfig.business-ir-tests.json` → **exit 0**, and a planted unused `@ts-expect-error` makes it **fail** (so the check is real) |

**The eight failures, and why they are not ours.** `src/lib/bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`
fails 8 tests with `spawnSync <node.exe> EBUSY`. **Two routes agree it is environmental:** (a) the suite
imports only `node:fs`, `node:path`, `node:child_process`, `node:url` — **nothing of ours** — and spawns a
node subprocess; (b) it fails at **process spawn**, before any of our code runs. G-01 reached the same
conclusion with a third route (a stashed clean tree).

**Critic pass — what it attacked (a pass that says "looks good" has not run):**

1. *Does a renamed field compile silently?* — **No.** The old IR against the new model returns `ok: false`
   with `UNKNOWN_FIELD`; it never yields a plan. Tested as "the floor".
2. *Can the IR carry or widen scope?* — **No, three ways.** The type has no scope field (proven by a
   falsification-checked `@ts-expect-error`); a smuggled `tenantId`/`organizationId` is ignored; a filter
   on a tenant-like field fails because no such field is declared.
3. *Is "requires recompilation" the model's answer, or a lucky string compare?* — **The model's.** The
   reasons come from `planFieldRename` and are asserted to contain its wording (`disappeared`). And the
   answer is not "always stale": an IR that references nothing that moved is `clean`.
4. *Does a `gap` hide a failure?* — **No.** `ok: true` **iff** no diagnostic has severity `error`; an IR
   with both an error and a gap fails **and still reports the gap**. On a clean compile all **ten** §51
   stages are accounted for.
5. *Does the compiler mutate what it is given?* — **No.** The IR and the model are byte-identical after a
   compile, asserted on a snapshot.
6. *Are the numbers re-measured from the artefact?* — **Yes, by two routes.** *0 IR files* and *0 metric
   declarations* were each measured twice: a source search **and** `git grep` against `HEAD` (the tree
   before this sprint). *13 field kinds* counted from `kinds.ts`. Both routes agree.

**What this sprint is not:** not execution, not authorization, and not the Widget IR. The compiler
**plans**; the query engine runs; G-04 will inject the authorized projection. Its output is the **IR, the
compiler and the rename proof** — the durable asset G-03 makes into User Functions (RQ-24: *the IR is the
durable asset; SQL is a derivative*).

---

# Sprint G-03 — User Functions

**Written 2026-10-05. Third item of the four-item critical path (`spec → G-01 → G-02 → G-03`). This is
the product's distinctive feature.**

**Why it is now safe to start:** `G-02` is built and measured — the Business IR exists, the compiler runs
§51's ten stages, and the rename test passes both directions (Sprint G-02, Step 4). Item: `G-03` in
[`../library/development/BACKLOG.md`](../library/development/BACKLOG.md).

**What it is** (vision, Doc 3 Part VIII §39, verbatim):

> **A validated, reusable business operation created by the user with AI assistance and executable
> without AI once published.**

**Done when** (plan §2 phase 3, verbatim): *a User Function — validated AI-authored work — **runs with no
LLM call*** (RQ-22, RQ-25).
**Test** (plan §2 phase 3, verbatim): **"Switch the model off and run a Function. If it still runs, it is
deterministic software"** — *the vision's own decisive property.*

## Step 1 — Research: what already exists

**Measured 2026-10-05 by reading the real code — not from a report about it** (rule zero-nine).

| Layer | File (all under `workspace/starting-kit/`) | What it already gives us |
|---|---|---|
| **The Function itself** | — | **Nothing.** `git grep -iE 'userFunction\|user_function\|UserFunction' HEAD -- packages` → **0 files.** The concept exists in the vision (Doc 3 Part VIII §39–§51) and in the spec (its object list names `Function`), i.e. **specified, not built.** |
| **The durable asset** | `packages/shared/src/lib/business-ir/` (G-02) | The **IR and its compiler**. `compileQuery` turns a read into the `QueryOptions` the engine runs; `recompileQuery` answers **requires recompilation** using G-01's rename planner. A Function *is* this, made durable (RQ-24). |
| The model and its version | `packages/shared/src/lib/kernel/` (G-01) | `ModelDescriptor`; **`contentVersion`** — the pure content hash, reusable for a Function's **fingerprint**; `planFieldRename`. |
| Where execution ends | `packages/shared/src/lib/query/types.ts` | `QueryEngine.query(entity, opts) → QueryResult`. A Function's execution terminates here, and nowhere else. |
| **The nearest neighbour** | `packages/core/src/modules/workflows/` (**41,568 lines**) | A generic engine with a **definition + user-customisation** pattern that is *exactly* the shape a Function needs: `workflow_definitions` carries a **`code_workflow_id`** (its code-declared origin), an integer **`version`**, a **jsonb `definition`**, `tenant_id` / `organization_id`, `enabled`, `effective_from/to`, and soft delete. Plus `api/definitions/[id]/customize` and `reset-to-code` routes. **The platform already knows how to store a user-customised, versioned artifact.** |
| The UI host | `packages/core/src/modules/widgets/lib/injection.ts` → `@open-mercato/shared/modules/widgets/injection-loader` | The **injection framework (V-23)** the plan names as the host for a Function's *placement*. That is **G-07's** territory, not G-03's. |
| **The test convention** | `packages/core/jest.config.cjs`, `jest.setup.ts`, `business_rules/api/__tests__/*` | **DB-backed code is tested with a mocked `EntityManager`** (`createMockEntityManager`), **not a live database.** So a migration cannot be *proven* on this host — and this project does not ship unproven claims. |

**The measured gap.** Nothing in code implements a User Function. The vision's Part VIII supplies the
whole shape: §41 the **artifact**, §44 the **lifecycle** (`DRAFT → GENERATED → VALIDATED → VERIFIED →
PUBLISHED → ACTIVE → DEPRECATED → ARCHIVED`), §46 the **objective verification** (*"not: the user saw
something that looked right"*), §43 the **execution fingerprint**, §47 the **zero-AI execution**, and
§50/§51 the two **Function types** (deterministic query, deterministic command).

**A real conflict between two documents, and how it resolves.** The BACKLOG says `G-03` needs **only**
`G-02`; the plan §5.2 says User Functions *"need the IR (G-02) **and** the Widget/reference layer **to be
usable by a person**"*. The plan's **own** critical-path diagram (§4) shows `G-02 → G-03` and
`G-01 → G-07` as **separate branches**, and the plan's **own** done-when for the phase is *"a User
Function ... runs with no LLM call"* — no interface. **The two agree once "the core" and "usable by a
person" are separated:** the core needs G-02; being *placed in the interface* needs G-07. **This sprint
builds the core and records the placement as G-07's.** Reported as our call so it can be overruled
cheaply (COOKBOOK rule zero-zero, case 3).

**Two routes, both agreeing, that no Function exists:** (a) the `git grep` above, at `HEAD` → **0 files**;
(b) the spec's object list names `Function` and the vision devotes a whole Part to it — **specified, not
built**. Both agree.

**What we reuse:** G-02's IR, compiler and recompile entry; G-01's model, `contentVersion` and rename
planner; `QueryEngine` as the single execution terminus; and the workflows module's **storage pattern**
(copy the shape when persistence lands, do not import the engine). **What G-03 genuinely builds:** the
**Function artifact**, its **enforced lifecycle**, its **objective verification**, its **fingerprint**,
**parameter binding**, and **zero-AI execution**.

## Step 2 — Validate: is this the best approach?

**Alternative considered — build on the `workflows` engine.** **Rejected.** The shortcut register itself
calls `workflows` *"a generic engine"* and the nearest neighbour only. The vision is explicit that a User
Function *"is not a code function"* and is closer to a **saved business capability**. A workflow engine
models steps, instances and tasks; a Function models **one validated operation**. Importing 41,568 lines
and a different mental model to express "show me overdue German customers" would be the tail wagging the
dog. Its **storage pattern** is worth copying later; its **engine** is not.

**Alternative considered — persist a row now (entity + migration + repository).** **Deferred, with two
reasons and a trigger.** (i) This project tests DB code against a **mocked** EntityManager, so a migration
here would be **unprovable** — and an unprovable migration is exactly the kind of claim this project
refuses. (ii) The Function's shape (`presentation_definition`, `parameter_schema`, placement) is driven by
**G-07**, so a schema written today would likely be rewritten. **Trigger: G-07 lands.**

**Alternative considered — make durability a *document* rather than a row.** **Chosen.** RQ-24 says *the
IR is the durable asset*, and a durable asset is something that can be **written down and read back**.
G-01 already proved the pattern: a versioned envelope, byte-stable on a round-trip. So a Function is a
**document** (`companai.user-function`), exportable and re-importable, and a database table is merely
**one place to keep it**. This satisfies RQ-24 **without** a database and **without** pre-empting G-07.

**Approach chosen — the Function artifact as a typed, verified, executable document.**

- **The artifact** (§41), typed: id, tenant, name, description, UI metadata, `operation_type`,
  `business_ir`, `parameter_schema`, the referenced entities/fields/metrics/commands/workflows, required
  permissions, `business_model_version`, `dependency_versions`, `compiler_version`, execution and
  confirmation policy, `result_schema`, presentation, audit policy, who created and verified it, timestamps,
  version and status.
- **The lifecycle** (§44) as an **enforced** state machine — an illegal transition is refused with a value,
  not a log line.
- **Objective verification** (§46) — *"not: the user saw something that looked right"*. The checks are
  **executed**: IR valid, entities valid, fields valid, relationships valid, tenant scope valid, plan
  valid — reusing G-02's compiler, which already fails closed on each of them.
- **The fingerprint** (§43) — a content hash over the IR, the compiled plan and the dependency versions,
  so a Function that has drifted is **detectable** rather than merely suspected.
- **Parameter binding** (§47's *"platform resolves parameters"*) — the IR may carry placeholders; binding
  them is validated against the parameter schema, and the compiler then sees a **concrete** IR, so G-02
  needs no change.
- **Zero-AI execution** (§47) — resolve parameters → check the lifecycle → compile → execute against the
  `QueryEngine`. **No model, no prompt, no interpretation.**

**What would break it, and the defence:**

1. **A Function executes while its references are unresolved.** **Defence:** it must pass verification and
   the compiler, both of which fail closed.
2. **An unverified or unpublished Function runs.** **Defence:** the lifecycle gate — only `PUBLISHED` and
   `ACTIVE` execute.
3. **A stale Function silently runs against a changed model.** **Defence:** the fingerprint plus G-02's
   `recompileQuery`: a model that moved either recompiles cleanly (allowed, and the plan is refreshed) or
   says **requires recompilation** (refused, with the reason).
4. **"No LLM call" is asserted rather than shown.** **Defence: two routes.** (a) The run entry point takes
   **no AI dependency at all** — there is nowhere to pass a model. (b) An **import-graph test** asserts the
   module imports nothing from the AI side, so the property is checked structurally and cannot rot.

**The ordering rule:** the artifact type first, then the lifecycle, then verification, then the
fingerprint, then parameter binding, then execution — because each depends on the one before.

## Step 3 — The steps

**Every command runs from `workspace/starting-kit/`. Nothing in `packages/shared/src/lib/kernel/` or
`business-ir/` is modified — G-03 *consumes* both.** New code lands in
`packages/shared/src/lib/user-function/` (pure, no DB) with its tests beside it.

**3.1 — Preconditions.**
- Confirm the baseline is green: `cd packages/shared && npx jest src/lib/business-ir src/lib/kernel` → 9 suites / 98 tests.
- Confirm the two git repos are clean and stage **by explicit path** (never `git add -A`).
- Take a checkpoint before touching anything: `./workspace/scripts/checkpoint.sh g03-start`.

**3.2 — The Function artifact** — `packages/shared/src/lib/user-function/types.ts`.
- `UserFunction` with §41's fields. The two the vision stresses: **`business_ir`** (the durable asset) and
  **`business_model_version`** (what it was compiled against). `presentation_definition` and the UI
  metadata are typed as opaque now — they are **G-07's** shape, and inventing them here would pre-empt it.
- `FunctionStatus` — §44's eight states.
- `ParameterSchema` — `{ name, kind, required, default? }[]`, using the platform's own **13 field kinds**
  so a parameter's type check uses the same vocabulary as a field's.
- `FunctionOperationType` — §50/§51's two: a deterministic **query**, a deterministic **command**.
- `VerificationCheck` / `VerificationReport` — the §46 checks, each `pass` or `fail` **with its reason**.

**3.3 — The lifecycle** — `packages/shared/src/lib/user-function/lifecycle.ts`.
- `canTransition(from, to)` and `transition(fn, to)` → `{ ok, function } | { ok: false, reason }`.
- §44's order is **forward-only** except for the two documented moves the vision implies: `DEPRECATED` and
  `ARCHIVED`. An illegal transition is **refused with a value**.
- `isRunnable(status)` — only `PUBLISHED` and `ACTIVE`. This is what makes "an unverified Function cannot
  run" true by construction rather than by a caller remembering.

**3.4 — Objective verification** — `packages/shared/src/lib/user-function/verify.ts`.
- `verifyFunction(fn, model, bindings, ctx)` → `VerificationReport`, running §46's checks by **calling
  G-02's compiler** and reading its diagnostics, rather than re-implementing the checks. One rule, one
  implementation.
- A failed check names **which** check and **why**, in plain language.
- **The positive case first:** a well-formed Function reports every check as passed — so the report is not
  vacuously green or vacuously red.

**3.5 — The fingerprint** — `packages/shared/src/lib/user-function/fingerprint.ts`.
- `functionFingerprint(fn)` — a content hash over the IR, the compiled plan and the dependency versions,
  using G-01's `contentVersion` so "did this change?" is answered by the same function everywhere.
- `checkFreshness(fn, model)` → `fresh` · `recompiled` (the model moved but the IR still compiles) ·
  `requires_recompilation` (with G-02's reasons). Deterministic: **no timestamps in the hash**, or it stops
  being reproducible.

**3.6 — Parameter binding** — `packages/shared/src/lib/business-ir/bind.ts` *(lives beside the IR it
binds, because it rewrites IR values)*.
- The marker is `{ '$param': '<name>' }` in a **filter value**, a **time-range bound**, or **limit**.
- `bindParameters(ir, values, schema)` → `{ ok: true, ir } | { ok: false, errors }`. Validates presence,
  type (against the parameter's kind) and rejects unknown parameters — **an unbound placeholder is an
  error, never passed through**, because passing it through would let a placeholder reach the compiler as a
  literal value.
- The output is a **concrete** IR, so G-02's compiler is unchanged.

**3.6b — The durable document** — `packages/shared/src/lib/user-function/document.ts`.
- `exportFunction(fn)` / `importFunction(doc)` — a **versioned envelope** (`companai.user-function`,
  version 1), byte-stable, exactly as G-01 did for the model. This is what makes the Function durable
  **without** a database (Step 2), and it is the artefact RQ-24 means by *"the IR is the durable asset"*.
- **Assert non-empty first**, then assert the round-trip is empty — the same discipline G-01 used, so an
  empty diff on an empty export cannot pass for a proof.
- `importFunction` validates the envelope **and** every canonical id inside the IR, so a document that
  cannot be referenced by the rest of the platform is refused loudly.

**3.7 — Zero-AI execution** — `packages/shared/src/lib/user-function/run.ts`.
- `runFunction(fn, params, ctx, model, bindings, engine)` → `{ ok, rows, plan, provenance }` or
  `{ ok: false, reason }`. Steps, in order: **lifecycle gate → bind parameters → freshness check → compile
  → execute**. There is **no AI argument**, so "switch the model off" is not a runtime condition to test
  for: there is nothing to switch off.
- The only outward call is `engine.query(entity, plan.physical)` — the platform's existing read path.

**3.8 — The no-LLM proof** — `packages/shared/src/lib/user-function/__tests__/no-llm.test.ts`.
- **Route 1 (behavioural):** run a Function end to end with a **fake engine** and no AI infrastructure in
  scope; assert the exact `QueryOptions` that reached the engine.
- **Route 2 (structural):** read every source file in `user-function/` and assert **none** imports from the
  AI side (`ai-assistant`, `ai-sdk`, `openai`, `llm-*`, `model-*`). This is the checkable form of "switch
  the model off", and it fails if someone later adds an AI import.
- Both must pass. One alone is a story.

**3.9 — Critic pass.** A separate pass whose only job is to break the above, and it must **name what it
attacked**: (a) can an unverified Function run? (b) can a stale Function run silently? (c) can an unbound
placeholder reach the compiler as a literal? (d) does the freshness check use G-02's answer, or its own?
(e) does the no-LLM test actually fail if an AI import is added — **plant one and watch it fail**?
(f) is every number re-measured from the artefact? **If it says "looks good" without listing attacks, it
has not run.** Loop until a fresh pass finds nothing.

**3.10 — Update the dependent documents in the same change** (rule zero): `BACKLOG.md` (the `G-03` line,
the G-07/G-09 relationship, and the "needs G-03" items), the spec's §10c (record what G-03 proved), and
this cookbook's Step 4 table. Docs stale in the same change is a defect.

**3.11 — Commit in both repositories, staged by explicit path.** Repo 2 (`starting-kit`, branch `main`)
gets the new code and tests. Repo 1 (root, branch `master`) gets the docs. **Never `git add -A`.**

## Step 4 — Done when

*Filled after the build, from measurement — not in advance. Measured 2026-10-05.*

| | Criterion | Status |
|---|---|---|
| ✅ | The Function artifact exists with §41's fields | **Done.** `user-function/types.ts` — every §41 field, plus `verification` (below). `presentation`, `resultSchema`, the policies and `ui` are carried as **opaque** values, because their shape is **G-07's** and inventing it here would pre-empt that decision. |
| ✅ | The lifecycle is enforced: only PUBLISHED/ACTIVE run | **Done.** `lifecycle.ts` — §44's eight states, forward one step, `archived` from any. `isRunnable` is the single answer. **Strengthened:** `transition` to `verified` **requires a passing verification report**, so `verified` cannot be a label somebody typed; and `importFunction` refuses a document claiming a post-verification status with no record, so the guarantee holds across the document boundary too. |
| ✅ | Verification is objective and reuses G-02's compiler | **Done.** `verify.ts` runs §46's checks by **calling the compiler** and reading its diagnostics — no second implementation. `authorization_valid` is reported **`not_checked`**, not `passed`, because **G-04 does not exist**; the third outcome exists precisely so "could not check" is not a lie in either direction. |
| ✅ | A stale Function is detected, and a moved model recompiles or is refused | **Done.** `checkFreshness` returns `fresh` · `recompiled` · `requires_recompilation`, and the refusal comes from **G-02's `recompileQuery`** (which uses G-01's `planFieldRename`) — not a string comparison written here. Given the previous model it names the destination. |
| ✅ | An unbound parameter is an error, never passed through | **Done, and enforced twice.** `bind.ts` returns `{ok:false}` with no `ir` at all on failure; and `compile.ts` now carries a guard that **refuses a placeholder outright**, so a marker cannot reach the database as a literal even when the compiler is called directly, bypassing the runner. |
| ✅ | **A Function runs with no LLM call — by two routes** | **Done.** Route 1 (behavioural): a real Function runs end to end through a fake engine, asserting the **exact `QueryOptions`** that arrived. Route 2 (structural): the **transitive import graph** of `run.ts` contains no AI import. **Route 2 was falsified, not asserted** — an AI import was planted in `business-ir/compile.ts` (deliberately *outside* `user-function/`), and the graph check failed naming `compile.ts -> ai` while the directory check stayed green. |
| ✅ | The critic pass names what it attacked and finds nothing | **Done, after three passes.** Pass 1 found 2 defects, pass 2 found 2 more, pass 3 (blast radius) found none. All four are fixed and now permanently covered. Named below. |

**Measured 2026-10-05, from the artefacts:**

- `user-function` **7 suites / 133 tests pass**; `business-ir` **4 suites / 60 tests** (G-02 grew from 47 by the compiler tests these fixes required); `kernel` **5 suites / 51 tests** (G-01 untouched).
- The **shared package: 182 suites / 2110 tests, all passing.**
- **`tsc --noEmit` clean** in `shared`, `cli` **and** `core`; and clean for **both** test-including configs (`tsconfig.business-ir-tests.json`, `tsconfig.user-function-tests.json`).
- Core's **kernel drift guard passes** (12 suites / 61 tests in `core/src/modules/entities/lib/__tests__`).
- The type-level probe **"there is nowhere to pass a model"** was falsified: a planted *valid* call makes `tsc` report `TS2578 Unused '@ts-expect-error' directive` (exit 1), and removing it returns exit 0. So the claim is checked, not asserted.

## Step 5 — The critic pass: what it attacked, and what it found

**Pass 1 — the claims as stated.** Attacks: (a) can an unverified Function run? (b) can a stale Function run silently? (c) can an unbound placeholder reach the compiler as a literal? (d) does freshness use G-02's answer or its own? (e) does the no-LLM test actually fail if an AI import is added? (f) is every number re-measured from the artefact? **Two defects found.**

**Pass 2 — shapes pass 1 did not try.** Attacks: markers in *reference* positions; a marker nested inside a money value; a forged document; a retyped field; a removed relationship; a removed entity; whether `tenantId` on the artifact is load-bearing. **Two more defects found.**

**Pass 3 — the blast radius.** The fixes reached into G-02's compiler, so the whole `shared` suite and `cli`/`core` were re-run. **Nothing found.**

### The four defects, each fixed and permanently covered

1. **A placeholder nested inside a money value reached the engine as a literal.** `{amount: {$param: 'threshold'}, currency: 'GBP'}` is the vision's own §50 example, and the compiler **unwraps a money value to its `amount`** before comparing it. The walk that finds placeholders only looked at the top of a filter value, so it missed this one — and the guard could not fire. **Fixed:** the walk is now **deep**, and the binder substitutes at **any depth**. *Covered by:* `bind.test.ts` and `compile.test.ts`.

2. **The model version could not see a field being retyped.** `modelVersionOf` hashed only **ids and semantic versions**, and a field's *kind* is not part of its *id*. Measured: two models whose `unread_count` was `integer` and `text` respectively both hashed to **`f462abf0`**. So a stored Function reported itself **fresh** against a model on which its `>` filter had just become illegal. **Fixed:** the version now covers every attribute the compiler reads (kind, `required`, `multi`, `filterable`, grain, a relationship's endpoints/cardinality/optionality), **sorted** so declaration order cannot change it, and **excluding labels** so fixing a typo does not invalidate every saved operation. *Covered by:* `compile.test.ts` (four cases) and `fingerprint.test.ts` (retype, removed relationship, removed entity).

3. **An unresolvable sort was silently dropped.** `compileSort` did `if (!fieldId) continue`, so a sort naming a field that does not exist produced a **successful compile with no sort at all** — rows in an arbitrary order, and no indication why. That is precisely the "silently produces a wrong plan" failure the compiler exists to prevent. **Fixed:** it now fails closed (`UNKNOWN_FIELD` with the path), and a metric sort reports a **gap** rather than vanishing. *Covered by:* `compile.test.ts`.

4. **A forged document could claim to have been verified.** `transition` refuses to *mark* a Function verified on a failing report — but a **document** is read, not walked, so a doctored one claiming `active` with no record imported cleanly and then ran. **Fixed:** `importFunction` requires a verification record for any status only reachable *through* `verified` (`verified`, `published`, `active`, `deprecated` — **not** `archived`, which is reachable from anywhere), and requires the record to actually list what was not checked. *Covered by:* `document.test.ts`.

### One further finding, and one hole closed by a test I wrote

- **`tenantId` on the artifact was decorative.** Nothing read it, so tenant A's Function ran happily in tenant B's context. **Fixed:** `runFunction` refuses a mismatched tenant (`WRONG_TENANT`) before it touches anything. *Covered by:* `run.test.ts`.
- **The sample value initially hid a real mismatch.** `sampleValuesFor` first chose its sample to satisfy the *operator* — so an integer parameter feeding an `exists` filter was sampled as `true`, the compile passed, and verification reported a Function that could not actually run. Caught by a test, not by reading. **Fixed:** the sample is **always a real value of the declared kind**; only the *list-ness* follows the operator, so a genuine kind/operator conflict now **fails** and is reported. *Covered by:* `verify.test.ts` and `bind.test.ts`.

### OPEN — and it needs the owner's eye, not mine

**A verified Function's definition can be edited without invalidating its verification.** `transition` records what was verified, but nothing ties that record to *which* definition was verified, so object surgery that swaps the IR leaves the Function `active` with a stale verification.

**Status: OPEN — trigger named.** **Not fixed, deliberately:** there is **no editing operation in G-03** at all (a Function is created and stored; nothing mutates one), so the hole is **not reachable through any API we have built** — only by a caller mutating an object directly. **Trigger: the first editing operation** (G-07's placement work, or whichever item adds "change a saved Function"). The fix is small when it is needed: record the definition's fingerprint in the verification record and refuse to run when it no longer matches.

### Our calls, reported so they can be overruled cheaply (rule zero-zero)

1. **We modified G-02's `compile.ts` three times**, against this sprint's own "consume both, modify neither". Each was **forced by a measured defect**, not a preference: the placeholder guard (defect 1's defence), the `pageSize` type guard (`limit` can now be a placeholder), and `modelVersionOf` (defect 2). The cookbook's instruction was written before the measurement; the measurement won.
2. **`limit` and a time-range bound now accept a placeholder** in the IR *type*. The binder already handled both; the type denied it, so those code paths were unreachable from typed code and unchecked. Widening them is what made defect 1 findable.
3. **`transition` to `verified` requires a passing report**, and the artifact gained a `verification` field. A strengthening beyond this cookbook's Step 3.3.
4. **`ARCHIVED` is reachable from any state** — restated from Step 3.2, because §44's chain has no exit.
5. **`tenantId` on the artifact is now enforced**, and `WRONG_TENANT` is a new refusal code.
6. **Verification compiles the IR bound to sample values.** This is a design decision with a stated limit: it proves the IR compiles *for a value of each declared kind*, not for every value. That limit is the same one the binder enforces at run time, so the two cannot disagree.

---

# Sprint G-07 — the Widget contract, the Widget IR, and the registry

**Written 2026-10-05. The next item after the four-item critical path, which is complete (`spec ✅ → G-01 ✅ → G-02 ✅ → G-03 ✅`).** Item: `G-07` in [`../library/development/BACKLOG.md`](../library/development/BACKLOG.md).

**Why it is now safe to start:** `G-01` is built (the canonical model and its ids) and `G-02` is built (the IR and the compiler). The plan's own dependency line is `G-01 → G-07`. **And G-03 has handed G-07 a second, concrete job:** a User Function is *"created by the user … and executable without AI once published"*, and **being usable by a person** — placed in the interface, given a form from its `parameterSchema` — is a **placement** concern, which G-03 deliberately did not build. G-03 carried `presentation` and `ui` as **opaque** values for exactly this reason.

**What it is** (plan §2 phase 3, verbatim): **a Widget is a first-class typed object with a contract and an IR** (RQ-40/41/42).

**Done when** (plan §2 phase 3, verbatim): *a Widget is a first-class typed object with a contract and an IR.*

**Test.** The plan names **one** test for the whole phase — *"switch the model off and run a Function"* — and **G-03 already met it**. So G-07 must name its **own**, and Step 2 does: **a published Function, placed in a Widget, runs from the Widget's own inputs with no AI** — the vision's own *"most important reusable chain"* (§160), made real.

## Step 1 — Research: what already exists

**Measured 2026-10-05 by reading the real code and the real vision text** (rule zero-nine), not from a report about either.

| Layer | File (under `workspace/starting-kit/`) | What it already gives us |
|---|---|---|
| **The vision's Widget** | — | **Nothing.** `find packages/shared/src/lib -iname "*widget*"` → **0 files**. The contract, the IR and the registry exist in the vision (Doc 5 §10–15, §33–35, §112–114, §195, and the 40 rules of Part LXXIII) — **specified, not built.** |
| **The host (V-23)** | `packages/shared/src/modules/widgets/` + `packages/ui/src` | The **UI injection framework** the plan names as the host. **Measured 2026-10-05, definitions named so they reproduce:** the `shared` side is **1,359 lines** (the **five source files** `injection.ts`, `injection-loader.ts`, `injection-position.ts`, `component-registry.ts`, `injection-progress.ts`; the 4 test files are **excluded**, and including them makes it 1,821); the `ui` side is **2,563 lines across 20 files** whose **path** matches `widget` or `injection` (`find packages/ui/src \( -iname "*widget*" -o -iname "*injection*" \) -type f`). It gives `InjectionWidgetMetadata` (`id`, `title?`, `description?`, `features?`, `priority?`, `enabled?`, `requiredModules?`, `requiredFields?`), injection positions and placements, and a component registry. **This is a React component-injection system** — the renderer, not the object. *(Correction: the shortcut register attributes the "1,359-line" figure to `packages/ui`; measured, 1,359 is the `shared` directory and `packages/ui` is 2,563. The code wins — recorded here.)* |
| **The name clash — already known** | `packages/core/src/modules/*/widgets/injection/*/widget.ts(x)`; `compai/planning/CHANGELOG.md` §"the four vocabulary collisions" | The kit **already calls its dashboard tiles "widgets"** — a TSX component with a metadata id and slots. That is a **different object** from the vision's Widget. **Recorded, never resolved.** The analysis's recommendation (batch 4 §15b, carried to batch 9): keep "widget" for the kit's tile, call the vision object a **"Business Widget"**. |
| The canonical model | `packages/shared/src/lib/kernel/` (G-01) | Canonical ids (`canonical-id.ts`), `ModelDescriptor`, and `contentVersion` — the pure content hash a Widget's version reuses. |
| The IR and the compiler | `packages/shared/src/lib/business-ir/` (G-02) | `BusinessQueryIR`/`BusinessCommandIR` and `compileQuery`. A Widget's `source` names a **Function**, and a Function already carries compiled IR. |
| **The Function** | `packages/shared/src/lib/user-function/` (G-03) | The artifact with **`parameterSchema`** (`FunctionParameter = { name, kind: CustomFieldKind, required, default?, label?, description? }`), `references`, and `runFunction` (zero-AI). **`presentation?` and `ui?` are carried as `unknown` — declared opaque, for this sprint to define.** |
| The parameter kinds | `packages/shared/src/modules/entities/kinds.ts` | `CUSTOM_FIELD_KINDS` — the platform's **13 field kinds**. A Function parameter is already one of these, so a Widget's input control maps from a **declared** kind, never a guess. |
| The registry's nearest neighbour | `packages/core/src/modules/dashboards/`; `packages/core/generated/entities/dashboard_*_widgets` | A **dashboard-widget** registry exists — which tile sits on whose dashboard. It is the kit's registry of *tiles*, **not** the vision's Object Registry, so it is not reusable as the vision's; it is the pattern to read for how the kit stores a placement. |

**The measured gap.** Nothing in code implements the vision's Widget, its IR, or its registry. The vision supplies the whole shape: §10 the contract, §11–15 its parts (inputs, outputs, actions, events, dependencies), §33–35 the **semantic** IR (*"do not encode React props, CSS classes, DOM structure"*), §112–114 the registry (a canonical `widget_id`, a separate `widget_instance_id`, and an object graph that answers *where is this used / what does it depend on*), §195 the minimum manifest, and §160 the chain **Function → Widget**.

**Two routes, both agreeing, that no Widget exists:** (a) the `find` above, over `shared/src/lib` → **0 files**; (b) the plan lists G-07 in the **"must be built"** column while naming V-23 in the **"needs from our platform"** column. Both agree: **the host exists, the object does not.**

**What we reuse:** the **host** (V-23's injection metadata, so a Widget can be *rendered* without G-07 touching React); G-01's canonical ids and `contentVersion`; G-03's `parameterSchema` and `runFunction`; the 13 declared field kinds. **What G-07 genuinely builds:** the **Widget contract**, the **Widget IR** (semantic), the **registry**, and the **placement** that turns a Function into a Widget.

## Step 2 — Validate: is this the best approach?

**Alternative considered — make the vision's Widget *be* the kit's injection widget.** **Rejected.** The kit's widget is a **TSX component**; the vision's rule 6 forbids the Widget IR from being frontend source, and rule 20 forbids AI from emitting UI code. If the Widget *were* a component, "AI proposes a Widget" would mean "AI writes TSX" — the one thing the vision rules out. **The host renders; the Widget is data.** They meet at the metadata boundary, not by identity.

**Alternative considered — build a new renderer.** **Rejected, and the plan already decided it.** V-23 is a **KEEP** in the shortcut register, described as *"the host a vision Widget can render into"*. Building a second renderer duplicates something bought and working.

**Alternative considered — resolve the naming collision by renaming the kit's tile.** **Rejected in favour of the analysis's own recommendation.** The kit's word is in **363 files** (the `.ts`/`.tsx` files under `packages/core/src` and `packages/ui/src` alone whose **content** contains the case-sensitive word `widget`; measured 2026-10-05, and the definition matters — case-insensitive over all extensions gives 458) and in its public module API; the vision's object is **new and has no callers**. Renaming the cheap side is the cheap move. **Our call (reported):** the vision object is a **`BusinessWidget`**; the kit's tile stays `widget`. **Recorded as *our* call so the owner can overrule it in one line** (rule zero-zero case 3, rule zero-seven).

**Alternative considered — persist the registry to the database now.** **Deferred, with the same two reasons as G-03 and a named trigger.** (i) This project tests DB code against a **mocked** EntityManager, so a migration here would be **unprovable**. (ii) The registry's shape is driven by the **`@`/`#` reference layer (G-09)**, which will query it. **Trigger: G-09.** Until then the registry is a **value** — built, tested and serialisable — exactly as G-01 and G-03 built their objects before persisting them.

**Alternative considered — make the Widget a *document*, like the Function.** **Chosen.** Same discipline that worked twice: a versioned envelope, byte-stable on a round-trip, no database. It satisfies *"Widgets are versioned"* (rule 25) and *"definitions are distinct from instances"* (rule 7) **without** a migration.

**Approach chosen — the Widget as a typed contract, a semantic IR, and a registry, with a Function's placement as the first concrete producer.**

- **The contract** (§10, §195): id, version, name, description, purpose, typed inputs, typed outputs, actions, events, dependencies (entities / fields / relationships / metrics / Functions / Commands / Workflows / Policies / Knowledge / Skills / other widgets), permissions (read / interact / execute / share), collaboration, persistence, rendering, `ai`, and **presentation** — the field G-03 left opaque.
- **The IR** (§33–35): a **semantic** description of what to present and how the user interacts — `type`, `title`, `source`, `inputs` (`id`, `type`, `control`), `actions`. **No React props, no CSS, no DOM.** Enforced by a **type-level** test, not a comment.
- **The registry** (§112–114): first-class entries (`object_type`, `object_id`, `version`, `owner`, `scope`, `status`, `dependencies`, `permissions`), a **canonical identity** distinct from an instance, and the object-graph questions answered as **values**.
- **The placement** (§160): given a **published** Function, produce a Widget whose **inputs are derived from the Function's `parameterSchema`** and whose `source` names that Function — so **running the Widget runs the Function with no AI**. This is where G-03's opaque `presentation`/`ui` become **defined**.

**What would break it, and the defence:**

1. **A Widget IR that carries frontend code.** **Defence:** the IR is **semantic by construction** (no `className`, `style`, `props`, `children`), and a **type-level probe** proves those fields cannot exist — the same falsifiable technique G-02 and G-03 used.
2. **A Widget that becomes a second source of business truth.** **Defence:** the Widget holds **no data** — its `source` names a **Function** (compiled IR) or a canonical entity id; rule 2 (*"not an independent data silo"*) and rule 11 (*"canonical EntityRef, not copied data"*).
3. **A Widget whose inputs drift from its Function.** **Defence:** the placement **derives** the inputs from `parameterSchema` in one direction only; a Function whose parameters change produces a **different** Widget contract, caught by the version.
4. **A Widget permission treated as authorization.** **Defence:** the contract carries permissions as **declared metadata only**; rule 16 is explicit that widget permissions **never replace** business authorization, and **G-04** is where that is enforced. G-07 records the requirement; it does not fake the enforcement.
5. **A placement that runs an unpublishable Function.** **Defence:** placement accepts only a Function that is **`published`/`active`** (G-03's own gate) and **runs it through `runFunction`** — the zero-AI path — never a second execution route.

**The ordering rule:** the contract type first, then the IR, then the placement (Function → contract + IR), then the registry, then the document round-trip — because each depends on the one before.

## Step 3 — The steps

**Every command runs from `workspace/starting-kit/`.** Nothing in `packages/shared/src/lib/kernel/`, `business-ir/` or `user-function/` is modified — **G-07 consumes all three.** New code lands in `packages/shared/src/lib/business-widget/` (pure, no DB) with its tests beside it.

1. **`types.ts` — the contract.** `BusinessWidget` carrying §10's parts and §195's manifest: `WidgetStatus`, `WidgetPermissions` (`read`/`interact`/`execute`/`share`), `WidgetDependencies`, `WidgetReference`, and **`presentation`** as a *defined* shape (no longer `unknown`). Every id that names a model object is a **canonical id** (G-01).
2. **`ir.ts` — the semantic IR.** `WidgetIR` with `type`, `title`, `source`, `inputs`, `actions`; `WidgetInput` (`id`, `type: CustomFieldKind`, `control`, `required`, `label?`); `WidgetControl` as a **closed union** of semantic controls (`text_input`, `number_input`, `money_input`, `boolean_toggle`, `entity_picker`, `date_range`, …). **No frontend vocabulary** — asserted by a type-level test.
3. **`placement.ts` — the Function → Widget chain (§160).** `placeFunction(fn, options)` → `{ widget, ir }`; the inputs are **derived from `fn.parameterSchema`**; the `control` is chosen from the parameter's **declared kind**; a Function that is not runnable (G-03's `isRunnable`) is **refused**.
4. **`registry.ts` — the registry (§112–114).** `WidgetRegistry`: `register`, `get` (by canonical id **and version**), `instances` (canonical id vs instance id), and the object-graph answers — `whereUsed`, `dependsOn`, `dependents`. Collisions are **reported, never silently merged** — the rule G-01 and G-02 both follow.
5. **`document.ts` — the round-trip.** `WidgetDocument` (`companai.business-widget`, version 1), export/import, **byte-stable**, empty round-trip — the pattern G-01 and G-03 both proved.
6. **Tests, beside the code.** The decisive one: **a published Function placed in a Widget runs from the Widget's own inputs with no AI** (through `runFunction`, asserting the exact `QueryOptions`). Plus: the IR is semantic (type-level probe, **falsified first**); the placement derives inputs from `parameterSchema`; the registry answers the graph questions and reports collisions; the document round-trips.
7. **Measure and record.** Run the `shared` suite, `tsc --noEmit` for `shared`/`cli`/`core`, and both test-including configs; record the counts in Step 4. Then the **critic pass** (Step 5).

## Step 4 — Done when

*Filled after the build, from measurement, not in advance. Measured 2026-10-05.*

| | Criterion | Status |
|---|---|---|
| ✅ | The Widget is a first-class typed object with a contract and an IR | **Done.** `types.ts` carries §10's parts and §195's manifest (id, version, name, purpose, typed inputs and outputs, actions, events, dependencies, permissions, collaboration, persistence, rendering, `ai`, and `presentation` now a defined shape, no longer opaque). `ir.ts` carries the semantic IR. The document carries both, so a Widget cannot be stored as one half. |
| ✅ | The IR is semantic: no frontend vocabulary | **Done, and falsified first.** `WidgetIR` is `type`, `title`, `source`, `inputs`, `actions`, and has nowhere to put `className`, `style`, `props` or `children`. A type-level probe with four `@ts-expect-error` directives proves it: planting `className` on the IR makes `tsc` report `TS2578 Unused '@ts-expect-error' directive` (exit 1), and removing it returns exit 0. |
| ✅ | The placement chain Function → Widget is real (§160) | **Done.** `placeFunction(fn, options)` derives the Widget's inputs from the Function's `parameterSchema`, names the Function in `source`, and **refuses** anything G-03's `isRunnable` rejects. |
| ✅ | The registry answers the object-graph questions | **Done.** `registry.ts`: canonical id against instance id, `whereUsed`, `dependenciesOf`, `dependentsOf`, and collisions **reported, never merged**. |
| ✅ | The round-trip is byte-stable | **Done.** `document.ts` (`companai.business-widget`, version 1), export/import, and an empty round-trip, the pattern G-01 and G-03 both proved. |
| ✅ | **A published Function placed in a Widget runs from the Widget's own inputs with no AI** | **Done.** `placement-run.test.ts`: a real Function is placed, then run through the Widget's own inputs, asserting the **exact `QueryOptions`** that arrived. |
| ✅ | The no-LLM guarantee holds by two routes | **Done.** Route 1 behavioural (the run above); route 2 structural (the transitive import graph of the module holds no AI import). **Route 2 was falsified, not asserted:** an AI import planted in `user-function/lifecycle.ts`, deliberately *outside* this folder, made the graph check fail naming `lifecycle.ts -> ai` while the directory scan stayed green. |
| ✅ | The critic pass names what it attacked and finds nothing | **Done, after one build round and one critic pass.** Four findings, all fixed: three defects in the code, and one in the documents (two published numbers whose definitions had not been written down). Named below. |

**Measured 2026-10-05, from the artefacts:**

- `business-widget` **6 suites / 68 tests pass.**
- The **shared package: 188 suites / 2178 tests**, of which **187 suites / 2170 tests pass.** The one failing suite is the **known environmental** `bootstrap/dynamicLoader.tsconfig.test.ts` (8 tests), unchanged by this work.
- **`tsc --noEmit` clean** in `shared`, `cli` **and** `core`; and clean for the new test-including config `tsconfig.business-widget-tests.json`.
- **Falsified, not asserted:** planting `className` on `WidgetIR` made `tsc -p tsconfig.business-widget-tests.json` report `TS2578` (exit 1); restoring returned exit 0 (md5 back to `a5a79809ed9803e5d7b853c9c42aba97`). Planting `import { generateText } from 'ai'` in `user-function/lifecycle.ts` made the graph check fail naming `lifecycle.ts -> ai` while the directory scan stayed green, 1 suite failed / 6 passed; restoring returned all green (md5 back to `5953850a131434c023891c39ec91ef32`). **Both were re-run at HEAD, not carried from the build round** (the critic pass had since edited `ir.ts`, so its earlier md5 no longer applied).

**That environmental failure, re-proven for this change by two fresh routes (the third is on record from G-01):**

1. **Nothing outside the new folder references it.** A search for `business-widget` across `packages/` returns only G-07's own files. The change is additive: one new directory and one new tsconfig.
2. **Excluding the new folder changes nothing but our own counts.** The full suite with `business-widget` ignored is **182 suites / 2110 tests**, with the **same** 1 suite / 8 tests failing. So G-07 adds exactly 6 suites and 68 tests and leaves the failure untouched. The suite imports only `node:fs`, `path`, `child_process` and `url`, and it fails at process spawn, before any project code runs.

## Step 5 — The critic pass: what it attacked, and what it found

**Pass 1 — the claims as stated.** Attacks: (a) can the IR carry frontend vocabulary? (b) can a Widget become a second source of truth (does it hold data)? (c) can a Widget's inputs drift from its Function? (d) does the registry's "same content" agree with the document's? (e) does the no-LLM check actually fail if an AI import is added? (f) is every number re-measured from the artefact? **Three defects found.**

### The three defects, each fixed and permanently covered

1. **A user-supplied input with no matching IR input could be imported.** The contract can declare an input with `source: 'user'` (a form field), and if the IR had no matching input the importer accepted it, producing a field that can never be drawn. Same class as G-03's silently-dropped sort. **Fixed:** `CONTROL_REQUIRING_SOURCES` names the sources that must have a control (`user`, `function_parameter`), and `document.ts` now checks **both directions**: every control-requiring contract input must have an IR input, and every IR input must be declared in the contract. *Covered by:* a new suite in `document.test.ts`, "the two halves must agree about the inputs".

2. **The registry and the document disagreed about "the same content".** The registry compared **raw** widget content; the document compared **canonicalised** content. So two Widgets that round-trip to the same bytes could be reported as a collision, or two that differ only in the order of a set-like field could be reported as different. **Fixed:** one notion, `contentOf(widget) = stableStringify(canonicaliseWidget(widget))`, shared by both. *Covered by:* `registry.test.ts`, "treats reordered set-like fields as the same content, not a collision".

3. **Two over-broad declarations.** `FRONTEND_VOCABULARY` contained `ts`, which would flag a legitimate value (a filename, a currency, a set of initials); and the placement set `scope: 'organization'` on a Widget that is owned by a Function, a contradiction. **Fixed:** `ts` removed from the vocabulary, and the contradictory `scope` removed. *Covered by:* the semantic scan in `ir.test.ts` and the placement tests.

### Also found during the build, before the critic pass

- **The document validated `control` on the wrong half.** `control` lives on the IR's inputs, not the contract's; the importer looked for it on the contract, so a placed Widget threw "unknown control undefined" on import. **Fixed:** the document carries **both** halves, so `exportWidget(widget, ir)` and `importWidget` returns `{ widget, ir }`. This is what the plan's own done-when means by "a contract **and** an IR".
- **A test asserted the wrong thing.** One IR test checked membership against a two-element array instead of the full control list. **Fixed** to assert against `WIDGET_CONTROLS`.

### A fourth finding: two published numbers were right, but their definitions were not written down

**Attack: take every number this sprint published and re-measure it from the artefact.** Three of the four reproduce exactly once the definition is named, and the definitions had been left implicit, so a reader re-measuring would get a different figure and conclude the document lied.

- **`1,359` (the `shared` injection framework)** is the **five non-test** `.ts` files. Including the tests gives **1,821**. The Step 1 cell listed the test files in the same breath, implying they were counted. **Fixed:** the cell now says the tests are excluded.
- **`2,563 across 20` (the `ui` side)** is the union of files whose **path** matches `widget` or `injection`. Matching the word in **content** instead gives 103 files / 32,461 lines. **Fixed:** the definition is now in the cell.
- **`363` (the kit's use of the word `widget`)** is the `.ts`/`.tsx` files under `core/src` + `ui/src` whose **content** contains the **case-sensitive** word. Case-insensitive over all extensions gives **458**, and a word-boundary match gives **290**. **Fixed:** the definition is now written beside the number, in both the COOKBOOK and the CHANGELOG.
- **The two falsification md5s** were the one genuine error: `ir.ts` was edited by this very critic pass (dropping `'ts'`), so the hash recorded at the build round no longer described the file. **Fixed:** both falsifications were **re-run at HEAD** and the true hashes written back (`ir.ts` `a5a79809…`, `lifecycle.ts` `5953850a…`).

**The lesson, and it is the owner's own rule:** a number is only as good as the definition printed next to it. "Measured from the artefact" is not enough if the artefact's boundary is unstated.

### OPEN — and it needs the owner's eye, not mine

**A verified Function's definition can still be edited without invalidating its verification.** Carried from G-03. **Status: OPEN, trigger named.** **Not fixed here, deliberately:** G-07's placement **creates** a Widget from a Function; it does not **mutate** the Function, so no new editing operation is reachable through this work. **Trigger: the first editing operation** (whichever item adds "change a saved Function"). The fix is the one G-03 named: record the definition's fingerprint in the verification record and refuse to run when it no longer matches.

### Our calls, reported so they can be overruled cheaply (rule zero-zero)

1. **The name.** The vision's object is a **`BusinessWidget`**; the kit's existing dashboard tile keeps the word `widget`. The kit's word is in 363 files and in its public module API; the vision's object is new and has no callers, so renaming the cheap side is the cheap move. **Reported so the owner can overrule it in one line.**
2. **The document carries both halves.** A Widget document is a contract **and** an IR, not one or the other, because the contract's inputs and the IR's inputs must agree and only the document can hold both to check that.
3. **The registry is a value, not a database row.** Deferred with the same two reasons as G-03 (DB code is tested against a mock here, so a migration would be unprovable; and the registry's shape is driven by the `@`/`#` reference layer). **Trigger: G-09.**
4. **Widget permissions are declared metadata only.** Rule 16 says a widget permission never replaces business authorization. G-07 records the requirement and does not fake the enforcement; **G-04** is where it lands.

---

# Sprint G-17 — the AI that emits the Business IR

**Written 2026-10-06. Steps 1–2 (research, validate) done; step 3 is this section; step 4 not started.**
The first build item after the four-item critical path, chosen by the owner's "keep the eye on the goal".

**Why it is now safe to start:** it depends only on **G-02 ✅** (the IR and its compiler, built) and
**G-03 ✅** (`runFunction`, for the end-to-end test). Item: `G-17` in
[`../library/development/BACKLOG.md`](../library/development/BACKLOG.md); the full step 1–2 record is
[`../library/development/PLAN-G17-ir-generation.md`](../library/development/PLAN-G17-ir-generation.md).

**What it is** (plan §2 phase 3; `BACKLOG` G-17): *schema-constrained generation — **the AI that
produces the Business IR**.* The vision's decisive loop (*need → **AI writes the IR** → validate → run
→ confirm → save as Function → zero-AI*) has everything **downstream of the IR** built; this is the
missing join.

**Done when:** a natural-language request produces a **Business IR** that (a) validates against a
runtime schema, and (b) **compiles** through the existing `compileQuery`, with **no JavaScript written
by the model** — i.e. the model's output is a typed IR, not code.
**Test:** the prompt from the vision (§45) — *"show me customers in Germany whose invoices are over 30
days overdue and whose outstanding balance is above €10,000"* — yields an IR whose shape is checked and
whose compile step succeeds (or reports only *gaps*), with the model never emitting executable code.

## Step 1 — Research: what already exists (measured 2026-10-06, from the code)

**The headline, and it corrects an earlier claim in `BACKLOG`.** The earlier row said *"no
constrained-generation exists; the first artifact is a parser from scratch."* That was measured against
the **wrong vocabulary** — it grepped for the OpenAI wire fields (`response_format`, `json_schema`). The
platform calls models through the **AI SDK**, where the constraint is `generateObject({ schema: <zod> })`,
and **that is already built and in use.** *(Deep-dive: `PLAN-G17-ir-generation.md` §1.)*

| Layer | File (all under `workspace/starting-kit/`) | What it already gives us |
|---|---|---|
| **Constrained generation** | `packages/ai-assistant/.../lib/ai-sdk.ts` | Re-exports **`generateObject`** from `ai` (installed **v7.0.4**, `generateObject` present with `FlexibleSchema`). This is the schema-constrained call |
| **It is used today** | `packages/ai-assistant/.../api/route/route.ts:138,178` | `generateObject({ model, schema: RouteResultSchema, prompt })` — a live route (`export async function POST`) |
| **The zod pattern** | `api/route/route.ts:32` | `RouteResultSchema = z.object({ intent: z.enum([...]), toolName: z.string().optional(), confidence: z.number().min(0).max(1), reasoning: z.string() })` |
| **A first-class object endpoint** | `api/ai/run-object/route.ts` | *"Run an AI agent in structured-output (object) mode"* → **`runAiAgentObject`**, with policy, tool-whitelist and attachment checks |
| **The schema override (the join)** | `.../lib/agent-runtime.ts:1831,1866` | Resolution order: **`override.schemaName`/`override.schema`** → `agent.output` → throw. **An agent can be handed our IR zod schema as its structured output** |
| **`zod` is available** | `packages/ai-assistant/package.json:117` | `"zod": "^4.4.3"` |
| **The IR type** | `packages/shared/src/lib/business-ir/types.ts` | `BusinessQueryIR` (§50 verbatim), `BusinessCommandIR` (§53), `IR_STAGES` (the §51 ten stages) — **types only, no runtime schema** |
| **The compiler** | `packages/shared/src/lib/business-ir/compile.ts` | `compileQuery` — §51 stages, returns a value or a diagnostic. **The test target** |

**Three measured gaps — and they scope this sprint.**

1. **No zod schema for the IR.** Zero zod imports in `business-ir/`, `kernel/`, `user-function/`. The
   IR is a TS type; **nothing checks the *shape* of an incoming IR at runtime.** This is what the sprint
   adds.
2. **No agent emits an IR.** `packages/ai-assistant` names `BusinessQueryIR`/`BusinessCommandIR`/
   `compileQuery`/`runFunction` **nowhere** (zero hits). The model's paths to data are the code-mode
   tools and the CRUD tools — **never the IR**.
3. **No schema-mutation IR kind.** The IR is `list | count | aggregate` + `BusinessCommandIR`. There is
   no "add entity/field/capability" kind — that is **G-21**'s dependency (outcome 2), scoped there.

**Two routes, both agreeing, that the join is missing:** (a) `ai-assistant` imports nothing from
`business-ir` (**zero hits**, re-checked 2026-10-06); (b) the model's only data paths are code-mode JS
and CRUD tools — neither produces an IR.

**Two routes, both agreeing, that the mechanism exists:** (a) `generateObject` with a zod `schema` is
called in `route.ts` (a live `POST`); (b) `runAiAgentObject` takes an explicit output-schema override
(`agent-runtime.ts:1831`). Both agree: **the tool is there; our IR is simply not plugged into it.**

## Step 2 — Validate: the approach, and what would break it

**Approach.** Write the IR's zod schema to **mirror `business-ir/types.ts`**, prove the two agree with a
conformance test, then give the schema to **one agent** through the existing `runAiAgentObject({ output })`
override. Three deeds:

1. **`business-ir/schema.ts`** — zod mirroring `BusinessQueryIR` (+ `BusinessCommandIR`): the §50 field
   set, `IrOperation`, the operator vocabulary, `IrMoney`, `IrParameterReference`.
2. **A conformance test** — every field in the type is in the schema, and the schema **rejects** what
   the type forbids. It must **fail** when the two diverge, or it is a print, not a guard.
3. **One IR-emitting agent**, wired via the override, plus an end-to-end test: NL prompt → IR →
   `compileQuery` succeeds (or reports only gaps).

**What would break it (checked against the code, and what is honestly unproven):**

| Risk | Answer |
|---|---|
| Does `generateObject` constrain the model, or only parse? | The AI SDK treats the schema as the **expected output shape** and surfaces `NoObjectGeneratedError` when the model does not conform. **Proven to exist; not yet proven against our local llama.cpp in this project** |
| **Can our local quantised model emit a valid IR?** | **UNKNOWN — this is step 4's measurement, and the one claim this sprint does not make.** A small model may fail; a larger one may be required (the model family / routing is the `ML-` track) |
| Streaming vs object mode | `runAiAgentObject` supports `mode: 'generate' \| 'stream'`. **Start with `generate`** (smaller surface) |
| Does the mirrored schema drift from the type? | The conformance test is the guard; it must fail on drift |
| All three G-21 paths | Read + command IR ship **now**; the **schema-mutation** kind is **G-21**'s, not this sprint's |

## Step 3 — the exact steps for this sprint (no code before this is written)

**The sprint writes three files and touches the BACKLOG.** Run in this order.

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
cd /c/Users/Ramzi/Downloads/companai/workspace/starting-kit
```

**S1 — write the IR schema.** New file `packages/shared/src/lib/business-ir/schema.ts`.
- Mirror `types.ts` field-for-field: `BusinessQueryIR` (operation/subjectEntity/grain/dimensions/
  measures/filters/relationships/timeRange/timeBasis/currencyBasis/sort/limit/offset), `BusinessCommandIR`
  (command/inputs/requested_by/idempotency_key), the sub-shapes (`IrFilter`, `IrMeasure`, `IrSort`,
  `IrTimeRange`, `IrMoney`, `IrParameterReference`), and `IrOperation`.
- **Export `z.infer` types and assert they equal the `types.ts` types** — so a drift is a **type error**,
  not a silent gap.
- **Done when:** `tsc --noEmit` is clean and the inferred types match.

**S2 — write the conformance test.** New file
`packages/shared/src/lib/business-ir/__tests__/schema.conformance.test.ts`.
- Prove: (a) a valid IR parses; (b) an IR missing a required field is **rejected**; (c) an IR with a
  wrong-typed field is **rejected**; (d) an unknown extra key does not silently pass into a compiled
  query (decide `.strict()` vs `.passthrough()` and **state why** — default to strict, matching the
  model's "neither guess nor widen" posture).
- **Falsify the test:** temporarily remove one field from the schema and **watch the conformance test
  fail** — a test that cannot fail is not a guard.
- **Done when:** the suite passes clean, and the falsification probe proves it can fail.

**S3 — wire one IR-emitting agent.** Where agents are declared (the ai-assistant agent registry), add
one whose `output` is `{ schemaName: 'BusinessQueryIR', schema: <the zod schema> }`. Use the existing
`runAiAgentObject` path (`api/ai/run-object`).
- **Done when:** the endpoint returns an object that validates against the schema.

**S4 — the end-to-end test.** A test that calls the IR-emitting agent with a fixed prompt (use a
**stubbed model** returning a canned IR for the unit test, so it does not depend on the live model), then
feeds the result to **`compileQuery`** and asserts it compiles (or reports only *gaps*, per G-02's
two-severity diagnostics).
- Separately, a **live smoke test** against the running stack to answer the one unproven question: *can
  our local model emit a valid IR?* Record the answer either way — a "no" is a measurement, not a
  failure, and it feeds the `ML-` model-routing track.

**S5 — record and update docs, in the same change.**
- `BACKLOG.md`: tick `G-17` (or record what step 4 measured, including the local-model answer).
- `PLAN-G17-ir-generation.md`: append the step 4 result.
- This section: add the outcome.
- `JOURNAL.md`: an entry; `library/development/README.md` if a new doc is added.
- `.workbuddy-ai/memory/2026-10-06.md`: a one-paragraph note.

**Two repositories, two commits.** Docs (this file, BACKLOG, PLAN, JOURNAL) in the project repo; the
code (`schema.ts`, tests, agent) in `workspace/starting-kit`. **Never `git add -A`.**

## Step 4 — the build (done; the live-model question is still open)

**Built and tested 2026-10-06.** Three artifacts, on the two sides the layering allows:

| Artifact | Repo path | What it is |
|---|---|---|
| The IR's runtime schema | `packages/shared/src/lib/business-ir/schema.ts` | `types.ts` as a zod schema, `.strict()` throughout, with a **forced** type-equality proof |
| The conformance test | `packages/shared/src/lib/business-ir/__tests__/schema.conformance.test.ts` | 18 cases: the positive path, the refusals, the falsification probe |
| The wire | `packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-author.ts` | `authorBusinessQueryIr()` — the single call that points a model at the IR |
| The wire's test | `packages/ai-assistant/src/modules/ai_assistant/lib/__tests__/business-ir-author.test.ts` | 6 cases, incl. **model answer → `compileQuery` → a real plan** |

**Where the wire lives, and why not beside the IR.** The first attempt put
`authorBusinessQueryIr` in `shared`, next to the schema. That **broke the layering**: importing
`ai-assistant` from `shared` pulls that package's whole type graph into `shared`, and `tsc` for
`shared` began reporting `@/.mercato/generated/ai-agents.generated` — a path that only exists at
build time in the app. Measured both ways: with the file present, `shared` fails to type-check; move
it out, and `shared` is clean again. The rule is already written down in
`shared/src/modules/overrides.ts` — *"`@open-mercato/shared` must NOT take a runtime dependency on
`@open-mercato/ai-assistant` (the dependency direction is the other way around)"*. So the IR and its
schema stay in `shared`, dependency-free; the act of calling a model lives in `ai-assistant`. **Do
not move it back to save an import.**

**A real defect found and fixed in this step — the guard that was a print.**
`schema.ts` first asserted the mirror as bare type aliases
(`type _Check = Expect<AssertEqual<A, B>>`). The mandatory falsification — delete a field from the
schema, re-run `tsc` — **passed when it should have failed** (exit 0). Cause: TypeScript resolves an
**unused type alias lazily**, so the assertion was never evaluated. Isolated probes in `/tmp/tsguard/`
nailed the rule: the alias form passes, `declare const c: AssertEqual<A,B>` passes,
`f<AssertEqual<A,B>>()` passes — **only `const d: AssertEqual<A, B> = true` fails**, with
`error TS2322: Type 'true' is not assignable to type 'never'`. Fix: one exported const,
`IR_SCHEMA_TYPE_CHECKS`, whose values are annotated by the assertions. Re-measured: delete `grain` →
`tsc` now fails at the `queryIr` entry, exit 1.

**The measurements (each with what it tried to break):**

- `schema.ts` — `tsc --noEmit -p packages/shared/tsconfig.json`: **clean**. Falsified by removing
  `grain` from `businessQueryIrSchema`: **fails**, `TS2322`, exit 1. Guard bites.
- `schema.conformance.test.ts` — **18/18**. Falsified by swapping the query schema's `.strict()` for
  `.strip()`: the scope-creep test **fails**. Guard bites.
- `business-ir-author.test.ts` — **6/6**, including the item's whole claim: a model's answer is parsed
  and then accepted by the **existing** `compileQuery`. Falsified in two places: weakening the wire's
  re-parse to `.passthrough()` fails the scope test; also relaxing the *nested* `irSortSchema` fails
  the guessed-field test — which is itself evidence that `.strict()` is applied at every level, not
  only the top.
- The full `business-ir` suite: **78/78**, 5 suites.

**What is NOT done, stated plainly.** ~~The **live smoke test has not been run**~~ — **IT WAS RUN
2026-10-06, and the answer is yes.** See the boxed measurement below; the paragraph is kept because it
was true when written, and because the *stub-vs-live* distinction it draws is the one that mattered.

### The live smoke test — measured 2026-10-06

**The question step 4 carried in: can our local quantised model actually emit a valid IR?** The stack
was up (all eight containers healthy), the model server answered on `:8080`, and the app was pointed at
`Qwen2.5-7B-Instruct-Q4_K_M` through the OpenAI-compatible endpoint. So it was asked for real.

**Result: 6 of 6 requests produced an object the platform's own schema accepts.** Run as
`packages/shared/src/lib/business-ir/__tests__/live.smoke.test.ts`, which validates each reply against
`businessQueryIrSchema` — the schema is the judge, not a human eyeballing JSON. The six were chosen to
exercise *different IR shapes*, not six ways of asking one thing:

| Request | What it exercised | Time | Verdict |
|---|---|---|---|
| *"list invoices over 10,000 EUR for each customer, newest first, at most 50"* | the vision's own §50 example: filter + dimension + sort + limit | 23 s | ✅ |
| *"how many open support tickets are there"* | `count`, not `list` | 16 s | ✅ |
| *"total revenue per month this year"* | `aggregate`, bucketed over time | 26 s | ✅ |
| *"customers whose name contains "acme""* | a text operator (`like` with wildcards) | 17 s | ✅ |
| *"the 10 newest orders"* | sort + limit, no filters | 15 s | ✅ |
| *"average invoice value by country"* | `aggregate`, grouped | 12 s | ✅ |

**The model chose sensible *semantics*, not just valid syntax** — `count` for "how many", `aggregate`
for "total per month", `like` + `%acme%` for "contains". That is worth noting because it is the part a
schema cannot check.

**The negative control, without which "6 of 6" would mean nothing.** Asked with a *loose* prompt and no
field list, the same model produced **complete nonsense** — invented nested `income`/`savings`/`debt`
objects and a `tenant_id` key, nothing like an IR. Fed to the schema, it was **rejected**, with the
exact reasons named:

> `Invalid option: expected one of "list"|"count"|"aggregate"` ·
> `Invalid input: expected string, received undefined` ·
> `Unrecognized keys: "finances", "tenant_id"`

So the model **can** go off-script, and the schema **catches it** — including the attempted `tenant_id`,
which is exactly the widening the `.strict()` design exists to refuse. **The 6/6 is a real pass, not a
schema that accepts everything.**

**Two honest limits on this measurement.**
1. **It is not a reliability rate.** Six requests, one run each, at `temperature: 0`. It shows the model
   *can* do it, not how often it fails. A real rate needs many runs per shape, and that is a bigger
   measurement than G-17 needed.
2. **It went straight to the model server**, not through `generateObject` and the app's agent path. What
   is proven is *the model can produce this shape*; the wire that feeds it through the platform is
   proven separately, by the stubbed tests. Both halves are proven — they were just proven apart, which
   is why the stubbed tests did not become redundant.

**A second real defect, found by the critic pass on the smoke test itself.** The first version returned
early from each test when no server was present — which Jest reports as **passed**. Pointed at a dead
port it printed **"6 passed"**: a green tick over a run that contacted no model. That is the single
worst outcome a measurement file can produce, and it was caught only because the test was deliberately
run with no server to see what it did. **Fixed** by deciding reachability at file-load time and
`describe.skip`ping the whole suite: the same dead port now reports **"6 skipped"**. (`IR_SMOKE_REQUIRE=1`
turns a missing server into a failure, for a CI job whose purpose is this measurement.) *A test that
cannot tell "passed" from "did not run" is worse than no test.*

**A third, smaller defect the same probe surfaced:** the reachability probe used `curl -o /dev/null`,
which is a *shell* path — `curl.exe` on Windows cannot write to it, so the probe failed **even when the
server was up**, and the suite skipped while the model was running. Fixed with `curl -f` and no output
redirection (exit code is the signal). Measured both ways: dead port → skipped; live server → 6 passed.

**The one thing still not done:** the same request driven through the *live app* end to end (HTTP in,
IR out). Everything needed for it exists; it needs an authenticated session against the running app.
Recorded as NEEDS-YOU Part 4 item 15.

**A pre-existing failure — and it is now GREEN, but the cause is NOT what it looks like.**
`agent-runtime-object.test.ts` was recorded as failing 4 of 8 on an unmodified tree (its mock of
`llm-provider-registry` no longer matching the path `model-factory` takes). It now passes **8/8**.

The tempting conclusion — *"declaring the IR agent fixed it"* — was **tested and disproved**: swapping
the generated registry back to its empty form left the suite at 8/8. The environment changed in the same
window (the generated registry sidecar was regenerated for the first time). **So the cause is
unattributed, and the item stays open** rather than being claimed as fixed. Recorded in `NEEDS-YOU.md`
Part 4 item 14 with that wording. *(A fix you cannot attribute is a coincidence; do not bank it.)*

---

## G-17 continued — the agent declared, and three tests its declaration falsified

**Measured 2026-10-06 (later the same day).**

**The gap, stated plainly.** G-17's wire existed but the agent was **never declared anywhere**:
`grep business_ir` found no non-test hits, and `ai-agents.generated.ts` was an empty stub
(`const aiAgentConfigEntriesRaw: AiAgentConfigEntry[] = []`). A wire with nothing registered cannot
run in the app, so the live run above could not have succeeded. Declaring it closed a real gap in
G-17 — it is not new scope.

**What was added.** `packages/ai-assistant/src/modules/ai_assistant/ai-agents.ts`, declaring
`business_ir.query_author` with `executionMode: 'object'`, `allowedTools: []`, `readOnly: true`,
`mutationPolicy: 'read-only'`, and `output.schema` pinned to the **shared** `businessQueryIrSchema`.
It imports `BUSINESS_IR_AGENT_ID` from the wire rather than re-typing the string, so caller and
registry cannot drift.

**Getting it picked up took three tries, and the first two failed SILENTLY.** This is the part worth
remembering:

1. **The generator never ran.** I invoked `node .../@open-mercato/cli/dist/index.js generate`; it
   exited `0` and printed **nothing**. `dist/index.js` only *exports* the entry function — the real
   entrypoint is `packages/cli/bin/mercato`. **`exit 0` with no output is not success.**
2. **Resolution looked right and still produced nothing.** Importing the scanner's own
   `resolveModuleFile` showed it *did* resolve `ai-agents.ts` correctly. So my first hypothesis
   (wrong directory) was wrong — worth measuring rather than "fixing".
3. **The trace settled it.** A temporary `console.error` patched into the *built* extension showed the
   scan callback firing for `ai_assistant` with the file resolved — and the registry then carried
   `moduleId: "ai_assistant"`, importing
   `@open-mercato/ai-assistant/modules/ai_assistant/ai-agents`. Patch removed and restored byte-for-byte
   (`md5sum -c`).

**Two independent routes agree the agent is registered**, which is the point:
- **text:** the generated file's import statement and config entry;
- **runtime:** a probe through the real `loadAgentRegistry()` — `found = YES`, `moduleId =
  ai_assistant`, `executionMode = object`, `schemaName = BusinessQueryIR`, `allowedTools = []`,
  `readOnly = true`, `mutationPolicy = read-only`.

(The probe is a temporary file; it caught a real drift risk in itself — it first asserted the literal
`'business_query_ir'` when the constant is `'BusinessQueryIR'`. Fixed to compare against the shared
constant, then deleted.)

**Three tests were falsified by the declaration, all the same way.** Each asserted the agent registry
was **empty** as a stand-in for "nothing is declared":

| Test | Was | Now |
|---|---|---|
| `business-ir-author.test.ts` | "No agent seeded: the runtime throws" | seeds the id as chat-mode with no output schema → object mode refused with `execution_mode_not_supported` |
| `meta-pack.test.ts` | `reset()`, then expect `[]` | `seedAgentRegistryForTests([])` |
| `ws-c-tool-pack-coverage.test.ts` | `reset()`, then expect `{agents:[],total:0}` | `seedAgentRegistryForTests([])` |

**The trap that made this subtle:** `resetAgentRegistryForTests()` only clears an in-memory map and
sets `loaded = false`; the next read **lazily imports the real generated registry**. So the "empty"
premise died *one call later*, silently. `reset` did not mean "empty".

**Every repaired assertion was seen RED, by two different mutations:**
- reverting the wire's `catch` to a rethrow → the agent-error test fails with the intended
  `AgentPolicyError: does not support execution mode "object"`;
- making `meta.list_agents` ignore the registry → the two empty-registry tests fail, and the RBAC
  cases alongside them.

Restored by byte copy, verified `md5sum -c`.

**Measured green:** ai-assistant **1385/1385 across 100 suites**; app typecheck **exit 0**.

**The live app-level run — DONE, and GREEN (2026-10-06).**

The owner said **yes** to the rebuild, and the run was made. In the owner's order, and the order is the
point:

**Step 0 — probe the model from OUTSIDE the platform first.** `POST http://127.0.0.1:8080/v1/chat/completions`
(model server directly; nothing of ours in the path) → **http=200, 32s**, correct IR for the test prompt.
**So a platform-side failure would have been the platform's fault, not the model's.** That is the whole
reason to run it first; it turns a later red into an attributable one. Record:
`analysis/g17-app-run/outside-probe-2026-10-06.md`.

**Step 1 — rebuild.** `docker compose -f docker-compose.fullapp.yml build app` → **12m22s**, new image
`open-mercato/app:local` id `cd8c4242dcc0`; container recreated on it. The Dockerfile regenerates
registries in-build, which is why the new convention file is picked up with no extra step. **Measured
both sides of the switch, same file** `/app/apps/mercato/.mercato/generated/ai-agents.generated.ts`:

| | before rebuild | after rebuild |
|---|---|---|
| `ai_assistant` occurrences | **0** | **5** (line 2 imports the module, line 10 `moduleId: "ai_assistant"`) |
| container image | 25 h old | `cd8c4242dcc0` |

**Step 2 — the run.** `analysis/g17-app-run/run-app-e2e.sh`:

```
1. SESSION      POST /api/auth/login                -> http=200  {"ok":true,"token":"eyJ..."}
2. REGISTRY     GET  /api/ai_assistant/ai/agents    -> http=200  business_ir.query_author present
3. END TO END   POST /api/ai_assistant/ai/run-object -> http=200  elapsed=69s
```

```json
{"object": {"operation": "list", "entity": "invoice", "grain": "customer",
            "filters": [{"field": "amount", "operator": "gt", "value": 10000}],
            "currencyBasis": "EUR",
            "sort": [{"field": "created_at", "direction": "desc"}], "limit": 50},
 "finishReason": "stop", "usage": {"inputTokens": 530, "outputTokens": 92, "totalTokens": 622}}
```

Correct on every axis: `list`, `invoice`, grouped by `customer`, `amount > 10000`, newest first, cap 50.
Full record: `analysis/g17-app-run/RESULTS-2026-10-06.md`.

**The first attempt failed with 401, and it was my input — not the platform.** The script had guessed
`secret` for superadmin; the container seeds superadmin with **`OM_INIT_SUPERADMIN_PASSWORD=password`**
(measured from the container's own env; `secret` is for `admin@` and `employee@`). Re-run with
`password` → **200**. **Without the outside probe first, this 401 would have looked like a platform
fault.**

**A second input error, caught before it could cost a cycle.** The route's real body is
**`{agent, messages: [{role, content}]}`** — read from `runObjectRequestSchema` in
`api/ai/run-object/route.ts`. The script had guessed `{agentId, input}`: both field names wrong, which
would have returned **`400 validation_error`** and sent me debugging a phantom. Both paths were then
confirmed against the generated table (`api-routes.generated.ts` **line 32** `/auth/login`, **line 239**
`/ai_assistant/ai/run-object`) rather than guessed. **Read the contract; do not guess the shape.**

**Also worth knowing for anyone driving this route:** login is rate limited at **5 attempts / 60s** per
email+IP (`readEndpointRateLimitConfig('LOGIN', {points: 5, …})`), so a **429** is the limiter, not a
defect — wait a minute and re-run.

**Two notes recorded but not acted on, neither a defect.** (a) **69s** in-platform vs **32s** straight to
the model — the delta is the **530-token** injected system prompt plus platform overhead; a latency
budget data point. (b) Field names differ between surfaces (`grain`/`created_at` in-platform vs
`dimensions`/`date` raw) — that is the platform's schema doing its job, not a discrepancy to chase.

**What this run asserts, and what it does not.** It asserts the **platform path works end to end** and
the request-shape is right. It says **nothing about answer quality** — the owner deferred that
explicitly ("what matters now is to get the right response, not the quality of it"); model comparison
and commercial OpenAI/Claude APIs are later work.

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
