# Lessons

**Mistakes made on this project, how they were caught, and what to do instead.**

Read before starting work. Every one of these was made by someone competent who
had a reason at the time — that is precisely why they are worth writing down.

Add to this file whenever something is caught. A near-miss counts.

---

## L1 — A confident label is not an inspection

**What happened.** `customer_accounts` was on the delete list, described as
"customer-facing identity, part of the CRM chain". It contains `domain_mappings`
— unique hostname per tenant with a database constraint. **That is per-company
custom domains, a platform feature we want.**

**How it was caught.** The owner asked a question about it. Not by any method.

**Cost if missed.** A working feature silently deleted, rediscovered months later
as "we need to build custom domains".

**What to do instead.** The
[salvage protocol](workspace/references/salvage-analysis.md) is now mandatory and
blocking before any deletion. Its first question is the one that catches this:
*for each table a module owns, is this a business record, or is it configuration,
infrastructure, identity, routing or policy?*

**The general form:** *"this module is obviously about X, so it contains only X"*
is false in any mature codebase. Modules accumulate infrastructure that happened
to be needed there.

---

## L2 — A grep count is not a finding

**What happened.** Counting references from kept modules into `customers` gave
alarming numbers: `ai_assistant` 362, `auth` 86, `inbox_ops` 52. It looked like
deep entanglement that would block removal.

**Reality.** Almost all were **test fixtures and documentation examples** —
`customers.people.view` is the example feature id used throughout the codebase to
explain how permissions work. Real count excluding tests: 23, 1, 4.

**What to do instead.** A count tells you where to look. Then **go and read the
actual lines** before recording anything. Exclude `__tests__`, `.test.`, `.spec.`
and comments before quoting a number.

---

## L3 — Verify the tool before trusting the measurement

**What happened.** The script written to correct L2 returned exactly `21` for all
nine modules. A path-resolution bug meant it measured the same directory nine
times.

**How it was caught.** The uniformity looked wrong. Nine different modules do not
have identical counts.

**Cost if missed.** Nine false findings in a permanent document.

**What to do instead.** When a measurement looks too uniform, too round, or too
convenient, **test the tool on a case where you already know the answer**.

---

## L4 — Never pipe build commands through a pager

**What happened.** `corepack yarn typecheck 2>&1 | tail -50` reported **exit code
0**. That was `tail`'s exit code. The type-check had actually **failed**.

**Cost if missed.** A green baseline recorded for a red build — the exact
opposite of the truth, in the document everything else is measured against.

**What to do instead.** Never pipe a command whose success matters. Capture full
output and read it. If output must be trimmed, capture the exit code separately
first.

---

## L5 — Run the steps in the project's own order

**What happened.** Type-check was run on a fresh checkout and failed with
`Cannot find module '#generated/entities.ids.generated'`. It looked like the
platform was broken.

**Reality.** The project's build script is
`build:packages → generate → build:packages → build:app`. **`generate` creates
those files.** Type-checking before it cannot succeed.

**Cost if missed.** Reporting "this platform fails to type-check on a clean
checkout" — a false finding that would have counted against a platform we had
just chosen.

**What to do instead.** Read the project's own `build` script and follow its
order. Its authors already solved this.

---

## L6 — Do not accept a degraded state on your own authority

**What happened.** A native component (`cpu-features`) failed to build for want
of a C++ compiler. It was reported as "almost certainly harmless — I'll only
chase it if something breaks", and work continued.

**Why that was wrong.** It was a quality decision taken without asking. The owner
could simply install the compiler — and did.

**What to do instead.** When something fails: report **what it is, what is lost,
what the fix costs, and a recommendation** — then let the owner decide. Deferring
is often right; deferring *silently* is not.

**How to defer safely:** write it into the plan as a **required** step of a
future batch, never as a note that might be forgotten.

---

## L7 — Judge a concept absent only in the target's vocabulary

**What happened.** During assessment, three capabilities were recorded as absent
that were in fact present:

| Recorded absent | Reality |
|---|---|
| AI cost budgets | Present — they call it **token usage**, tracked per agent, module, session and step |
| Scoped model policy | Present — a two-level allowlist in the database; env vars only set defaults |
| Capability metadata | Richer than recorded — features also carry `dependsOn` |

**Root cause.** Each was inferred from *our* word for the thing, or from a single
file, without checking the data model.

**What to do instead.** Before declaring anything absent: search **two or three
words the target might use**, and check **entity/table names** — the most reliable
vocabulary index a codebase has. A false absence is worse than a false presence:
it silently removes a candidate's best feature from the comparison.

---

## L8 — A schema is not a behaviour

**What happened.** A codebase was credited with transactional audit and
correlated event tracing because the *types and columns* were there. Neither was
real: audit ran in a separate transaction, and every correlation id was a fresh
random value never reused.

**What to do instead.** A field's existence proves intent, not behaviour. **Grep
where it is assigned**, not where it is declared. Trace one complete path before
crediting a property.

---

## L9 — Trustworthiness is per document, not per folder

**What happened.** One platform's README was accurate and admirably honest about
its own gaps. A document **in the same folder, of the same vintage** listed
Garage, Assets Store, AI Studio and several routes as "Shipped" — none of which
existed anywhere in the source.

**What to do instead.** Verify claims from several documents before trusting any
of them. Never generalise from one good document to a folder, a project, or a
date.

---

## L10 — Report the whole picture, not the first red flag

Adopted from the sibling project's **`skills-main`** skills tree — an external folder
(`konsult/aikonsult/suplimentery/skills-main`), not a path inside this repository: *"A red signal does not short-circuit
the review… one review cycle gives the author the failing check, the conflict,
and every code finding at once, rather than the cheapest red flag first and
another cycle to discover the rest."*

**In practice:** when a batch hits a blocker, finish analysing the batch and
report everything together. A partial picture costs another whole cycle.

---

## L11 — `import type` is a dependency that breaks the build, not the app

**What happened.** `query_index` imports `ProgressService` from the `progress`
module using `import type`. TypeScript **erases** those at compile time, so the
code runs perfectly with `progress` deleted — the runtime resolve is guarded and
simply disables the feature.

**But `yarn typecheck` fails**, because the type no longer resolves.

**Why this is a trap.** A type-only dependency:

- is invisible to any runtime probe — nothing imports it when the code executes;
- **breaks the build**, so it surfaces late and looks unrelated to the deletion;
- is easy to dismiss as "just a type" when you see it in a grep.

**What to do instead.** When analysing a module for removal, grep specifically
for `^import type.*modules/<name>` in the modules you are keeping — separately
from ordinary imports. Checked across the whole delete list on this project:
only one exists today. The next codebase may have many.

---

## L12 — Do not describe a thing before you have read it

**What happened.** The attic catalogue was written *ahead* of the salvage
analyses, so it could not fall behind the removals. Sound reasoning — but entries
were written from module **names and sizes**, and two were simply wrong:

| Catalogued as | Actually |
|---|---|
| `onboarding` — "onboarding request flows" | **Self-service sign-up and tenant provisioning** — the platform's front door |
| `content` — "a small content-management module" | The **privacy and terms pages**. No CMS, no entities, no editor |

Both were then reclassified from *remove* to *keep*.

**Why it matters.** The catalogue's whole purpose is to let someone months from
now ask *"did we already build this?"* A wrong entry answers **no** to a question
whose true answer is **yes** — the most expensive failure that document can have.

**What to do instead.** Write the catalogue entry **after** the analysis, from the
code. If an entry must exist earlier, mark it **UNVERIFIED** so nobody trusts it.

This is L1 in a new costume: a confident label doing the work of an inspection.
The first time it nearly deleted custom domains; this time it nearly deleted
tenant provisioning.

---

## L13 — A module-shaped analysis misses packaging-shaped dependencies

**What happened.** The plan for removing `packages/enterprise` listed three steps:
unregister it in `modules.ts`, unregister it in the create-app template, delete
the directory. All three were done. **The install then failed immediately:**

```
Error: @open-mercato/enterprise@workspace:*: Workspace not found
```

`apps/mercato/package.json` still declared it as a workspace dependency — a
fourth step nobody had written down.

**Why it was missed.** The salvage protocol looks at *module-system* surfaces:
registrations, imports, generated registries, ACL features, events, migrations.
A Yarn workspace dependency is none of those. It lives in a `package.json` the
module analysis never opens.

**What to do instead.** When removing anything that is its own **package**
(not just a module inside one), check the consuming app's `package.json` too.
The corrected four-step checklist is in
[`workspace/references/strip-batches.md`](workspace/references/strip-batches.md).

**The general form:** an analysis framed around one system (modules) will not see
dependencies expressed in another system (packaging, build config, CI, container
images, infrastructure). Ask explicitly: *what other systems know this thing's
name?*

---

## L14 — A green build is not a working platform

**What happened.** Four commits of removals all passed the full gate — install,
typecheck, lint, test, build. The first time we actually *started* the platform,
tenant initialisation died:

```
❌ Initialization failed: Missing workflow seed file: sales-pipeline-definition.json
```

Commit `a423050` deleted two seed JSON files along with the CLI commands that
used them. But `workflows/lib/seeds.ts` also loaded them — by **filename, at
runtime**, inside `seedExampleWorkflows()`, which `setup.ts` calls during every
tenant init.

**Why every check missed it.** The reference is a string passed to
`fs.existsSync`. There is no import to resolve, no type to check, no registry
entry to regenerate. TypeScript cannot see it; the generator cannot see it; lint
cannot see it. Only executing the code finds it.

**The second gap: nothing governed this deletion at all.** The salvage protocol
is written for removing a **whole module** — it asks who imports it, what
declares it in `requires`, what it contributes to shared surfaces. Here we
deleted *files from inside a module we are keeping*. No protocol covered that, so
none ran.

**What to do instead.**

1. **Run the platform, not just the build.** Boot and click through after every
   few removals — not at the end of the phase. Runbook:
   [`workspace/references/local-instance.md`](workspace/references/local-instance.md).
2. **Deleting a data file is deleting an interface.** Before removing a JSON,
   SQL, template or fixture asset, grep for its **bare filename** across the
   repo, not for imports of it.
3. **Removing files from inside a kept module needs its own check** — at minimum
   Q2 (who references it) and Q6 (string references) from the salvage protocol.

**The general form:** *static analysis proves the code is consistent with itself;
it says nothing about the code's agreement with data on disk.* Anything referenced
by name at runtime — files, env vars, queue names, table names, feature ids — is
invisible to the compiler and must be checked by running the thing.

---

## L15 — "The gate is green" can mean "the gate never got there"

**What happened.** Three commits were reported with a green gate. Running the
full suite properly afterwards found three real failures — in `core` and
`content` — that had been sitting there the whole time.

They were never *seen* because **Turbo stops at the first failing task.** The
two known Windows-only `cli` failures aborted every run after 7 or 8 of 22
packages. Everything downstream — including `core`, the largest package — was
never executed. The P3 baseline's "1,773 passed, 2 failed" was a partial run
described as if it were complete.

**The compounding error.** A wrapper written as

```bash
corepack yarn test > log 2>&1; echo "EXIT=$?" >> log
```

reports the exit code of `echo`, not of `yarn`. The harness duly announced
"completed (exit code 0)" for a run that had failed. This is **L4 wearing a
different hat** — the failure is not piping through `tail` specifically, it is
*reading a status that belongs to a different command.* Capture it as

```bash
{ corepack yarn test > log 2>&1; echo $? > log.rc; }
```

**What to do instead.**

1. **Report coverage with the result.** Not "tests pass" but *"14 of 22 packages
   ran; 3,538 tests passed."* A pass count without a denominator hides an
   aborted run.
2. **Check `Tasks: N successful, M total`.** If `N < M`, the run is incomplete
   and the result is not a gate.
3. **Never infer success from the absence of visible errors** — that is the
   original sin behind half of these lessons.

**The same trap, third form: a cached green.** The gate after parking reported
`typecheck EXIT: 0 — 19 cached, 20 total`. Turbo had served a cached result from
before the generated files changed. The true state was **579 type errors**. When
a result decides whether work may proceed, read the cache line: `Cached: N` on
the task you just changed the inputs of means the tool did not look.

**The general form:** *a status is only evidence if it came from the run you
think it did.* A short-circuiting runner, a cached task and `$?` after the wrong
command all fail the same way — they hand you a true statement about something
else.

---

## L16 — Parking has a cost the build does not show: generated artifacts

**What happened.** Parked modules still compile, so typecheck and build stayed
green. But the generator only emits entity modules for **enabled** modules, so
two `catalog` tests could not resolve `#generated/entities/catalog_product_variant`
and the suite failed to run.

**Why this was not predicted.** The parking analysis reasoned about what a
disabled module *stops doing* — no routes, no tables, no workers. It did not ask
what other things stop being *produced for it*. Generated output is a second
system that also keys off the enabled list.

**The fix was not to skip the tests.** Both files already replaced the module
with `jest.mock(..., () => ({}))` — they never used the real one. Adding
`{ virtual: true }` states exactly that: this module may not exist on disk, here
is the stub. No assertion weakened, no test skipped.

**What to check when parking anything:** does any retained code import a
*generated* artifact of the parked module? `grep "#generated/entities/<name>"`.
Source files resolve through TypeScript path mapping and stay green; only the
test runner's resolver notices.

**The general form:** this is **L13** again — *ask what other systems know this
thing's name.* There, packaging. Here, code generation. The list of systems is
longer than it looks: modules, packaging, build config, codegen, CI, containers.

---

## L17 — Before removing an obstacle, ask whether it is a guard

**What happened.** Parked code produced 579 type errors because the generated
entity-id registry covers **enabled** modules only. The recorded fix — written
into the plan, and reported to the owner as a recommendation — was to make the
generator emit ids for every module on disk. It would have worked, and it would
have been wrong.

**What inspection found.** That exclusion is deliberate. It is a **compile-time
guard**: with `catalog` parked, `E.catalog.catalog_product` fails to compile, so
enabled code cannot take a hard dependency on entities whose tables no longer
exist. Code that must work either way already has a sanctioned form —
`getEntityIds() as any` plus `E.catalog?.…` — which `attachments` uses and which
type-checks fine.

Emitting the ids would have silenced an artifact by **deleting a safety
property**, and nothing would have failed until a runtime query hit a missing
table in production.

**How it was caught.** By reading the enabled code that referenced parked entity
ids, to check whether the guard was doing anything — rather than treating 579
errors as noise to be suppressed. The question that did it: *does anything depend
on this restriction existing?*

**What to do instead.** When something blocks you and the obvious fix is to
relax it, establish first **why it is there**:

- Does any code rely on the restriction holding?
- Is there already a sanctioned way to opt out? Its existence is strong evidence
  the restriction is deliberate.
- What fails, and how loudly, if the restriction goes?

Then choose. Here the answer was to narrow the *scope of checking* (exclude code
that does not run) rather than weaken the *rule* (emit ids that should not exist).

**The general form:** *an error is not always a problem to be removed; sometimes
it is a mechanism working.* The volume of an error says nothing about whether it
should be silenced — 579 identical errors were one guard firing 579 times.

---

## L18 — Disabling a thing does not disable what others say about it

**What happened.** Fourteen ERP modules were parked, and the platform was
verified: 44/44 pages, no server errors. The owner then opened the dashboard and
saw a red *"Failed to load new customers data"*.

The `dashboards` module is **enabled** and ships **ten** analytics widgets that
read `sales` and `customers` data. Parking those modules removed their routes,
tables and workers — but not the widgets a *different* module ships **about**
them. The widget lives in kept code; only its feature requirements point at the
parked module.

**Why the verification missed it.** The page sweep asked *"does this URL return
200?"* The dashboard did. The failure was inside a widget panel, rendered
client-side after load. **An HTTP status is not a rendered page.**

**What to check when disabling anything:** not only what it provides, but what
*other* enabled things provide about it — widgets, response enrichers, menu
entries, subscribers, dashboard tiles, saved layouts.

**A second lesson inside the fix.** The first override attempt used the widget's
`id` where the registry matches on `entry.key` — different strings. It silently
did nothing, and the page HTML still contained both "Customer Growth" and "Failed
to load", which I nearly read as "the fix did not work" without knowing why. The
server log said exactly what was wrong:

```text
label=widgets.dashboard key=dashboards.analytics.aovKpi
msg="Override did not match any registered entry — override skipped"
```

**Read the application's own diagnostics before theorising.** A well-built
platform usually tells you; this one did, on the first run.

**The general form:** *scope boundaries are asymmetric.* Turning something off
removes what it pushes outward, never what others have already pulled inward.

---

## L19 — A module's name describes its subject, not its behaviour

**What happened.** Twice in two batches I classified a module from its name.
`configs` "obviously" wrote configuration — its write routes touch no database at
all. `inbox_ops` sounded like mail plumbing — it is the human-in-the-loop
approval of LLM-generated proposals, the single most product-relevant module in
the codebase, and it recorded none of its decisions.

The second one nearly cost more: I was one sentence away from writing down that
the remaining modules needed no auditing. The inspection that overturned it took
about ten minutes.

**Why it happens.** A name is a summary written by someone else for a different
purpose. It compresses. What it drops is exactly what you need when the question
is "does this write anything, and does anyone need to know."

**The rule.** *Before recording that something needs nothing, enumerate what it
actually does.* Grep for write handlers and mutation signals; read what survives.
A negative finding is a claim like any other, and costs the same to verify as a
positive one.

**The general form:** the effort saved by not looking is borrowed, not saved.

---

## L20 — The running app serves `dist`, so source edits are invisible until you build

**What happened.** R2c passed its tests, typechecked, and committed. I then asked
for a UI check. The change did not appear — because the app loads
`packages/core/**dist**`, the compiled output, and the running server was a
**production build** started eighteen hours earlier. My source edits had never
reached the process serving the page.

The settings row's `updated_at` moved, which made it look like the route had run
the new code. It had run the *old* code, which updates the same row.

**Why it fooled me.** Every check I ran was against source: `tsc` reads source,
`jest` reads source, the coverage guard greps source. Not one of them touches
what the server executes. A green gate says the source is right; it says nothing
about what is running.

**The rule.** *Before asking anyone to look at a running system, rebuild it and
restart it.* `yarn build:packages && yarn build:app`, then restart. And when the
answer is "no change visible", check what the process is serving **before**
debugging the code.

**The general form:** verifying an artifact tells you nothing about a different
artifact, however closely related. Source is not `dist`; `dist` is not the
running process.

---

## L21 — A control that holds the mistake fixed proves nothing

**What happened.** Two test suites failed to load. I stashed the entire working
tree, reproduced the failure at the previous commit, and concluded it was not
mine — recording it as an upstream issue (U6).

The reproduction was sound and the conclusion was wrong. The repo requires **Node
24**; my shell had **Node 22**. The "missing" native binary was `abi137`, which
*is* Node 24. Both runs — before and after the stash — used the same wrong
runtime, so the control varied the code and held the actual cause constant.

**Why it happens.** A control answers exactly one question: *does the thing I
changed cause this?* It is silent about everything it holds fixed. The
environment is the easiest thing to hold fixed without noticing, because it is
not in the diff.

**The rule.** *When a failure looks environmental, check the environment against
what the project declares* — `engines`, `.nvmrc`, the lockfile's platform — before
building a case that it is somebody else's problem. One line of `package.json`
would have ended it.

**And a second-order one:** every gate result recorded before this was measured
on an unsupported runtime. When you find the environment was wrong, the past
results are not merely suspect — they measured a different system.

---

## L22 — I did not read my own runbook, and asked the user to authorise a fix I already had

**What happened.** Having found that the repo needs Node 24 and the machine's
default is Node 22, I checked for `nvm`, `fnm`, Volta and `Program Files`, found
nothing, stopped the user to authorise a download, fetched 36 MB from nodejs.org,
verified the checksum, and extracted it.

`workspace/.toolchain/node24/` had held the identical build — v24.19.0, ABI 137 —
since 3 August. **`local-instance.md` lists it in the "What you need once"
table**, three lines into the file I wrote to prevent exactly this.

**Why it happened.** The runbook is written for *setup*. This did not present as
setup — it presented as a mid-batch failure, and I searched the machine the way
you would search an unknown machine. I looked outward for something I had already
written down.

**The rule.** *When the environment surprises you, read the runbook before you
search the system.* The whole point of rule zero — every batch updates
`INDEX.md`, `JOURNAL.md`, `LESSONS.md` — is that the answer is written down; it
is worthless if I only consult it when I think to.

Concretely, before any "how do I get X on this machine" question:
`grep -i X workspace/references/local-instance.md`.

**The cost this time was small** — a redundant download, since removed, and a
question the user should never have been asked. The cost of the habit is not
small: I interrupted the user to decide something my own documentation had
already decided, which spends their attention and their trust in the docs.

**The general form:** documentation you do not read is indistinguishable from
documentation you never wrote.

---

## L23 — Do not test an irreversible guarantee by triggering it on real infrastructure

**What happened.** To prove the ledger's append-only trigger was real, I inserted
a probe row and tried to `UPDATE`, `DELETE` and `TRUNCATE` it. All three were
correctly refused — including the delete of my own probe.

The probe row was now permanent, at sequence 999, in a live tenant's chain. The
first real verification would have reported a sequence gap forever. The table
happened to hold no real events, so resetting it cost nothing. A day later it
would have been unrecoverable by design.

**Why it happens.** Testing a guarantee usually means creating the condition it
protects against. When the guarantee is *irreversibility*, creating that condition
is itself irreversible — the test cannot be cleaned up, because cleanup is the
thing being prevented.

**The rule.** *Before exercising an irreversible mechanism, ask what state the
test leaves behind and whether you can live with it.* Use a scratch tenant, a
scratch database, or a transaction you roll back — the probe only needs to prove
the trigger fires, and `begin; insert; update; rollback;` proves exactly that
while leaving nothing.

**The general form:** a test that cannot be undone is not a test, it is a change.

---

## L24 — Never re-parse what you only need to append to

**What happened.** Adding a `capability` block to 76 permission declarations, I
wrote a rewriter that took each entry apart — split the body on commas, trimmed
the parts, reassembled them with the new field. It split inside
`title: 'Create, edit, and delete business rules'` and corrupted five files.

The typecheck caught it immediately and `git checkout` undid it, so the cost was
ten minutes. The cost if those files had been generated rather than tracked, or
if the corruption had been subtler than a syntax error, would not have been ten
minutes.

**Why it happens.** "Insert a field into this object literal" *feels* like a
parsing problem, so you reach for a parser you can write in one line. Splitting on
commas is a parser — a wrong one, which is fine right up until a value contains
the delimiter.

**The rule.** *Match the smallest edit to the smallest operation.* Appending a
field needs the position of the closing brace, nothing more. It does not need to
know what the other fields are, so it should not look. Use a real parser when you
genuinely need structure; use an anchor when you only need a place.

**The general form:** every piece of a file you take apart is a piece you can put
back wrong.

---

## L25 — Running a package's tests from the repo root is not running them

**What happened.** Two tests failed, deterministically, in a suite I had not
touched. The error was `ENOENT: no such file or directory,
open '<repo root>/src/modules/workflows/components/EdgeEditDialog.tsx'` — a path
that has never existed.

The tests resolve files from `process.cwd()`. Turbo runs each package's suite
**in that package's directory**, so `src/modules/...` means
`packages/core/src/modules/...`. I had been running
`npx jest --config packages/core/jest.config.cjs` from the repo root, where the
same relative path means something else entirely.

Nothing was broken. My runner was standing in the wrong place.

**Why it happens.** Pointing jest at a package's config *looks* like running that
package's tests, and for most tests it is — every assertion that touches only
imported modules behaves identically. Only the ones that read the filesystem
notice, which is a small enough minority to look like a real regression rather
than a setup difference.

**The rule.** *Run the suite the way the project runs it.* `corepack yarn test`
for the gate; a direct `npx jest` invocation is a convenience for one file, and
its results are only comparable when nothing in that file touches `cwd`.

Corollary: when a test fails with a path that does not exist, suspect the working
directory before suspecting the code.

**The general form:** a tool invoked differently is a different tool. This is L20
again — source is not `dist`, the running process is not the source — wearing the
runner's clothes.

---

## L26 — A killed command's children keep writing to the log you are about to read

**What happened.** A loop of three gate runs hit the ten-minute tool timeout and
was killed part-way through the second. I relaunched the remaining runs, and they
wrote to the same log filenames.

The orphaned run had not stopped. It kept writing, so one log ended up holding
**two** turbo summaries — one clean 22/22, one 19/22 with three tasks "failed".
Those three had not failed; they had been killed with the shell that started
them. Read quickly, that log says the gate is flaky. It says nothing of the kind.

**Why it happens.** Killing a shell does not reliably kill its grandchildren, and
a redirect target is not owned by the process that opened it. The log looks like
one run's output because logs usually are.

**The rule.** *After a timeout, treat every artifact that run was writing as
contaminated.* Use a fresh filename for the retry, and when a result looks
anomalous, count the summaries in the file before believing any of them — two
summaries means two runs.

**The tell worth remembering:** tasks reported as failed with **zero** failing
assertions underneath. A real failure names something; a killed one just stops.

---

## L27 — A rule written for one kind of actor will be applied to all of them unless you say otherwise

**What happened.** The autonomy matrix answers *how much may this be done
unattended*, and every one of its gates is phrased about a worker: "the worker
produces a proposal", "the worker prepares the act". I implemented it as a
property of the **act**, applying to whoever performed it.

The result passed 27 tests and read perfectly. On its first hour of real traffic
it demanded a review queue for a person changing their own sidebar layout, and a
second person's approval to edit a dictionary — 45 of 45 observed human actions
acquired an obligation.

**Why it happens.** A table indexed by *act* and *situation* looks complete. The
actor is not one of its axes, so nothing in the table prompts the question "who
is this for?" — the omission is invisible precisely because the table looks
total.

**The rule.** *When a rule comes from a document about one kind of actor, write
down which actors it binds — in the code, at the point it applies.* If the answer
is "all of them", that is a decision worth one sentence. If it is not, the
sentence is what stops the next reader re-broadening it.

**What saved it** was measuring before enforcing. The design error was invisible
to unit tests, because every test I wrote encoded the same misreading. Only real
traffic disagreed.

**The general form:** tests written from a misunderstanding confirm the
misunderstanding. A measurement against reality is the only thing that does not.

---

## L28 — A tool that filters the environment will filter yours without saying so

**What happened.** `OM_LOG_LEVEL=debug corepack yarn start` produced no debug
output. The logger read the variable correctly, the shell exported it correctly,
and the app never saw it: Turbo runs each task in a **filtered environment**, and
anything not declared in `globalEnv` / `globalPassThroughEnv` / the task's `env`
is dropped with no warning.

It cost a diagnostic at the moment I needed one — I was trying to prove the
shadow resolver was still running, could not, and had to fall back to inspecting
the build.

**Why it happens.** Every layer between the shell and the process looks like a
passthrough. `yarn` passes the environment, `node` passes the environment, so the
mental model is that environment variables simply arrive. A tool that *filters*
by default breaks that model silently, because a missing variable is
indistinguishable from a variable set to nothing.

**The rule.** *When a flag appears to do nothing, prove it arrived before
debugging what it does.* One log line, one `process.env` dump, one grep of the
output at the level you asked for. And when adding a runtime flag to a repo with
a task runner, declare it in the runner's config in the same commit — otherwise
it works for whoever wrote it and for nobody else.

**The general form:** this is L20 and L25 again — the source is not the running
process, the runner is not the shell. Each layer between what you typed and what
executed is a place the thing you typed can disappear.

---


> **It bit again, 2026-08-10.** Diagnosing why a gate never fired, I ran
> `OM_LOG_LEVEL=debug corepack yarn start` and got no debug output — and read the
> silence as "the interceptor never ran". It had run; the level had not reached
> the app. Putting `OM_LOG_LEVEL=debug` in `apps/mercato/.env`, which dotenv
> loads directly, produced the lines immediately and named the real defect in one
> read.
>
> The rule earned a second half: **when a diagnostic produces nothing, prove the
> diagnostic works before believing the nothing.** An empty log is evidence of an
> empty log. ([[L3]] says the same about tools; this is the environment-shaped
> version of it, and I have now paid for it twice.)
## L29 — A dry run is a claim you can check; read its numbers against what you know

**What happened.** The `actor_kind` backfill printed its plan before writing:
5 rows inferrable as `system`, 0 as `service`, **15 that "cannot be determined"**.

Fifteen undeterminable actors on an instance with exactly one admin user is not a
plausible number, and the implausibility was the finding. The query was correct;
the *limitation I had asserted in a comment* was wrong. Matching the `users`
table identifies a human exactly as soundly as matching `api_keys` identifies a
key — the same inference in the opposite direction, which I had talked myself out
of while writing the doc comment.

With it, all twenty rows resolved and none were guessed.

**What it would have cost.** Applied without the dry run, it would have succeeded,
reported nothing wrong, and left every historical human action permanently
unattributed — in the audit trail, the one place whose whole purpose is being
recoverable after the fact.

**The rule.** *Make data migrations dry-run by default, print a breakdown, and
check the numbers against something you independently know about the data.* One
admin means roughly one distinct human actor. A count that disagrees with a fact
you already hold is the cheapest bug report you will ever get.

**And the second-order one:** a limitation written confidently in a comment is
still an unverified claim. I had documented the constraint before testing whether
it existed, and the documentation then made it feel settled.

---

## L30 — A reproduction you built yourself is a hypothesis, not evidence

**What happened.** I set out to confirm that U3 — "an API key is rejected at use
time" — was an instance of the U4 scoping pattern. I reproduced it twice, traced
it to a comparison in the authentication path, wrote a fix, wrote tests, and
wrote three documents explaining it.

Every 401 was my own request. `extractApiKey` accepts `X-Api-Key` or
`Authorization: ApiKey`. I sent `Authorization: Bearer` — the reflex — and read
the resulting 401 as the defect I was expecting to find. Sent correctly, the key
returns 200.

Then, testing the mechanism I had "found", I nulled a never-used key's
organization so the comparison I had blamed would have to reject it. It returned
200 as well. The branch I built a fix around does not fire, and I still do not
know why.

**Why it happens.** I went looking for a specific bug. A 401 is consistent with
that bug, so the first 401 confirmed it — and once confirmed, everything after
was elaboration rather than investigation. A reproduction built to demonstrate a
hypothesis will demonstrate it.

**The rule.** *Before treating a reproduction as evidence, establish the
negative case.* One request that should **succeed** — a known-good credential, a
known-good header — costs seconds and would have ended this in the first minute.
I never made a single API-key request I expected to work.

**And the second half:** I reverted the fix. It changed which organization a new
key belongs to, on the strength of a defect I could not demonstrate. Keeping a
behaviour change that no evidence supports is the same mistake as keeping a
bandage, pointed the other way — and it is harder to notice, because it looks
like diligence.

**The general form:** confirmation is cheap and disconfirmation is what costs.
Spend the seconds.

> **Correction, 2026-08-10.** The header mistake was real and the rule above
> stands. The conclusion I drew from it did not: **U3 is a real defect and it
> reproduces.** A key created through the ordinary UI flow came out with a null
> organization while its creator had one, returned 401 on first use, and
> returned 200 after changing that single column. The fix I reverted was the
> right fix; it is restored, with tests and an end-to-end verification.
>
> Why the second experiment misled me: I nulled a key's organization and expected
> a rejection, but the comparison is against *the creator's* organization, and at
> that moment the fix I had just written was in the build — so the key and its
> creator agreed and the request correctly returned 200. I read a passing check
> as an absent one.
>
> This is [[L32]]: a bad reproduction disproves nothing. Discovering that my
> evidence was worthless told me only that I had no evidence — and I converted
> that into "there is no bug", which is a different and much stronger claim that
> nothing supported.

---

## L31 — An alias that shadows a column changes what `ORDER BY` means

**What happened.** The ledger's head query was

```sql
select seq::text as seq, hash from ledger_events where tenant_id = ? order by seq desc limit 1
```

PostgreSQL resolves `ORDER BY seq` to the **output column** when one shares the
name — so this ordered by *text*, and `'9'` beat `'10'`. The head came back one
behind the real one, the next append claimed a sequence number that already
existed, and the unique constraint rejected it.

The user-visible symptom was a **500 on creating an API key**. The cause was
four characters of alias.

The same alias in the verifier made it read the chain as 1, 10, 2, 3 and report a
**perfectly intact chain as broken at position 2** — a false alarm from the one
tool whose value is that people believe it.

**Why it happens.** `as seq` looks like a no-op: the column is already called
`seq`, and the cast is the only visible change. Nothing in the query says that
naming an output column after an input column changes the meaning of a different
clause.

**The rule.** *When casting a column in a select list, never alias it back to the
column's own name.* `seq::text as seq_text`. And when a query has both an
`ORDER BY` and a cast, check which one the sort actually binds to — the two look
independent and are not.

**What made this expensive:** I spent an hour on a concurrency theory first. The
duplicate-key error named a race, so I diagnosed a race, and the advisory-lock
defect I found on the way was real — but it was not this. **A plausible cause
found while looking for a cause is not the cause.** Ten seconds of `select … order
by seq desc limit 1` in psql would have shown `9` sitting on top of a table whose
maximum is 10.

---

## The pattern behind most of these

Twenty of the thirty-one are the same mistake wearing different clothes: **a conclusion
drawn from a proxy instead of from the thing itself.** A label instead of the
tables. A count instead of the lines. A type instead of the runtime. A word
instead of the schema. One document instead of several. A build instead of a
running system. A partial run instead of a whole one. An HTTP status
instead of a rendered page. A name instead of the routes. **The source
instead of the running process. The diff instead of the environment.**

The habit that prevents all of them: **before recording a finding, ask what
exactly you looked at, and whether it is the thing you are claiming about.**

---

## L32 — Finding your evidence was worthless is not evidence of the opposite

**What happened.** I built a reproduction of U3, discovered the reproduction was
my own header mistake ([[L30]]), and concluded the defect did not exist. I
reverted a correct fix and reopened the issue as "does not reproduce".

It reproduces. A key created through the UI by the admin came out with
`organization_id = null` while its creator had an organization; the first
request with it returned **401**; setting that one column to the creator's
organization turned the identical request into **200**. Ten minutes of work,
which I did not do, because I thought the question was closed.

**Why it happens.** Disproving my own reasoning felt like the rigorous move, and
it was — right up to the point where I let it carry a conclusion of its own.
"My evidence is bad" and "the claim is false" are different findings. The first
returns you to not knowing. The second is a new claim, and it needs its own
evidence, which I never gathered.

The retraction even felt *safer* than the fix, because reverting looks like
restraint. It was not restraint: it was shipping a known-broken code path back
into the product on the strength of an argument about my own competence.

**The rule.** *When you invalidate your own reproduction, the issue returns to
**unknown**, not to **resolved**.* Write down what would settle it, then go and
settle it. For U3 that was one sentence: create a key the normal way and use it
with the correct header. Neither of my two experiments was that.

**The tell:** a conclusion that arrives at the same moment as an apology. The
apology is about the process; the conclusion is about the world; and one does not
supply the other.

**The cost:** a real 401-on-every-request defect stayed in the build for a day,
and the fix had to be written twice.

---

## L33 — `clearAllMocks` does not clear a queued `mockResolvedValueOnce`

**What happened.** Five new tests passed alone and two failed inside their own
file. The route under test had gained one extra `em.findOne` call — and that call
consumed a value queued by an earlier test with `mockResolvedValueOnce` and never
used, because that test's code path never made the query it was primed for.

**Why it happens.** `jest.clearAllMocks()` empties the call log. It leaves the
once-queue and the implementation intact; only `mockReset()` clears those. So an
unconsumed `Once` is not discarded at the end of a test — it waits, and is
delivered to whichever test next calls that mock. Adding a query to production
code then silently redirects another test's leftovers into it.

**The rule.** *A mock that any test primes with `Once` gets `mockReset()` in
`beforeEach`, then its default again.* The alternative — every test consuming
exactly what it queues — is a property no one can maintain.

**The tell:** a test that passes with `-t` and fails in the suite. That is never
the new test being wrong; it is state crossing a boundary, and the boundary is
worth finding rather than working around. Here it was latent before my change and
would have surfaced on whoever added the next query.

---

## L34 — A query your tests never ran is a query you have not written yet

**What happened.** `AuthorityGraphService` had seventeen tests, including six on
the edge query, and every one of them passed against SQL Postgres refuses:

```sql
where parent_id = any(?) and child_id = any(?)
```

The query builder expands an array binding into a comma-separated list, so this
reaches the database as `any('a','b')` — a syntax error. The correct form is
`in (?)`, which is *built* to receive that expansion.

It surfaced the first time an organization in the real instance actually had
ancestors, which was the first time the query ran at all.

**Why the tests missed it.** The fake connection matched on
`sql.includes('from organization_edges')` and did the filtering itself in
JavaScript. It never parsed the SQL, so every property the tests asserted — the
tenant filter, the soft-delete filter, the chain membership — was a property of
*the fake*, not of the query. The tests were correct and told me nothing about
whether the statement was valid.

**Why it is the second time.** [[L31]] was the same shape: a column alias that
changed what `ORDER BY` meant, invisible to a mock that did its own ordering. The
pattern is now clear enough to state as a rule.

**The rule.** *A hand-written SQL string needs one of two things: an assertion
about its **text**, or an execution against a real database.* A mock that
implements the query's intent tests your understanding of the query, which is
exactly the thing in doubt.

Both fixes now carry a text assertion — the ledger asserts no query aliases to
`seq`, the graph asserts `in (?)` and never `any(`. They look crude. They are the
only kind of test that can see the defect.

**The other half:** notice when a code path has never executed. This one shipped
with tests, a review, and no organization anywhere with a parent — so nothing had
ever reached line two of the function. "Covered by tests" and "has run" are
different claims, and only one of them was true.


---

## L35 — A file that exists in two places has one owner; find out which before writing

**What happened.** The approvals page needed thirty-four new user-facing strings.
The platform has locale files at `apps/mercato/src/i18n/*.json`, so I seeded them
there — and, for good measure, into the create-app template's copy.

Both are real files. Neither is where auth strings live. The auth module owns
`packages/core/src/modules/auth/i18n/{en,de,es,pl}.json`, and every key the page
sits beside — `auth.nav.roles`, `settings.sections.auth` — was already there.

**Why it nearly stuck.** The app-level files *worked*. Nothing would have failed:
`t(key, fallback)` renders the fallback when a key is missing, so a string in the
wrong file and a string in no file look identical at runtime. The mistake would
only have surfaced when somebody deleted the app-level entries as orphans, or
when a module was extracted and left its own strings behind.

**The tell I had and ignored.** `grep` for the neighbouring key found it in the
module file. I had run something close to that and read the answer as *"this key
exists"* rather than *"this is where this kind of key lives"*.

**The rule.** *Before adding an entry to a shared file, find an existing entry of
the same kind and add yours where that one is.* Not where a plausible file is —
where its neighbours already are. The question is never "does this file work"; a
duplicate always works, right up until one copy is edited.

**A second thing it bought.** Looking at the right files showed all four locales
fully translated, 252 keys each, with no English placeholders. Seeding English
into `de.json` would have been the first — and once one is there, the file stops
being a coverage signal for every key after it. The strings shipped translated.

---

## L36 — A diagnosis you wrote down is a hypothesis with a date on it

**What happened.** The backlog carried a precise-sounding account of why the gate
flaked: a test creates `.tmp-dynamic-loader-*` inside `packages/shared`, guards
walking `packages/` read from it after it is deleted, *"two hardened, eleven more
walk-and-read unguarded."*

Eleven files to harden. Clear scope, obvious next move.

So I planted a fixture-shaped directory in `packages/shared` and ran the three
suites that walk it. **All 6,905 tests passed.** Nothing breaks while the
directory is there. The failure needs the *deletion*, which means the readers were
never the thing to fix — the two writers were. Two edits, not eleven.

**Why the note was wrong.** Nothing in it was invented. It was written while
chasing a different problem, from a real failure, and every clause was individually
plausible. What it lacked was the one experiment that separates *"a directory
appears and disappears here"* from *"eleven readers cannot cope with that"* — and
by the time I read it back, it had hardened from an observation into a work plan.

**The same shape, twice in one batch.** The second cause was a slow test, and my
first theory was its source fingerprint. Measuring it first: ~1 second on an idle
machine, against a 60-second budget. Too small to explain the symptom. Had I
skipped the measurement I would have optimised it, watched the flake continue, and
had one fewer suspect and no idea why.

**The rule.** *Before acting on a diagnosis you recorded earlier, re-derive its
key claim.* Especially your own, especially when it is specific, and above all
when it names a number — a count like "eleven" reads as though somebody counted,
and the note cannot tell you whether anybody did.

**The cheap test is usually available.** Planting a directory took ten minutes.
Timing a walk took two. Both were faster than the work they redirected, and both
turned a plan into a measurement. Related: [[L30]] — a reproduction you built
yourself is a hypothesis, not evidence; this is its mirror, where the hypothesis
arrived pre-built and carrying your own handwriting.

---

## L37 — The gate does not boot the application

**What happened.** G3 added a dependency to `RbacService`. Typecheck passed, lint
passed, **12,768 tests passed**, `build:packages` and `build:app` both succeeded.
The server then refused to start:

```text
Failed to start local scheduler: Could not resolve 'delegations'.
Resolution path: localSchedulerService -> rbacService -> delegations
```

The container runs in Awilix **CLASSIC** mode, and the default registration is
`asClass(RbacService)`. CLASSIC reads the constructor's parameter *names* and
resolves each one by name. I named the parameter `delegations`; the registration
is `delegationService`. **In CLASSIC mode a parameter name is a dependency name**,
so renaming a parameter renames a dependency — and nothing in the gate looks at
that, because no test constructs a real container.

**This is the second time this trap has bitten.** The first was a destructuring
factory needing `.proxy()`, which produced `di-classic-proxy.test.ts`. The lesson
was recorded and the guard was written — and it guarded the *other* half of the
same trap, so this half went straight through it.

**The wider point, which is the one worth keeping.** The gate proves the code
agrees with itself. It does not prove the application starts. Type checking,
linting and unit tests all operate on code in isolation; dependency injection,
migrations against a real schema, and route registration only happen at boot. A
green gate is evidence about the code, not about the system.

**The rule.** *After any change to DI wiring, a service constructor, or module
registration, start the server before saying it works.* It takes ninety seconds
and it is the only thing that tests the wiring.

**And the guard has to be watched failing.** I wrote
`di-classic-constructor-names.test.ts`, ran it, and it passed — with the bug still
in the tree. It passed again after a fix. It took **three** rounds of
instrumenting before it caught anything: a doc comment inside the parameter list
contained brackets, which threw off the bracket matcher, so the parser silently
dropped every parameter after the third. A guard that has never been seen to fail
is not a guard; it is a decoration that makes people confident. Related: [[L34]],
where a mock made six tests assert nothing.

---

## L47 — when a diagnosis has more than one candidate, instrument before asserting

**What happened.** The owner reported that an empty dashboard said *Use "Add a
widget"* with no such control. I read the condition:

```tsx
{editing && availableWidgets.length > 0 && (
```

saw the first clause, decided the panel only appears in edit mode, and shipped a
string change telling people to press **Customize** first. The owner replied that
pressing Customize does nothing — their screenshot showed the button already
reading **Done**, so `editing` was true all along and the clause that mattered was
the second one. My fix would have pointed at a button that does nothing.

Then I guessed twice more, confidently, and was wrong both times: first that the
module registry was being replaced by an i18n-only re-registration, then that a
module-level `widgetEntriesPromise` cache had resolved empty. Neither was true.

**What actually settled it** was a temporary diagnostic route reporting each
stage on the running server:

| Stage | Count |
|---|---|
| Raw entries in the registry | 10 |
| After `applyDashboardWidgetOverridesToEntries` | **0** |
| Override error | `null` |
| Loading one entry directly | works |

Which named the cause in one request: our own `enabledModules` override in
`apps/mercato/src/modules.ts` disables all ten widgets, because they read parked
ERP modules. Working as designed — plus a real upstream defect, that client
bootstrap registers the raw entries and never sees those overrides, so the
browser believed widgets existed and picked the wrong empty-state message.

**The rule.** Reading code tells you what it *would* do. It cannot tell you which
of several possible states the running system is in. When a symptom has more
than one candidate explanation, the cost of instrumenting — here about four
minutes of rebuild — is smaller than the cost of one confident wrong answer, and
far smaller than three of them.

**The tell:** if I am about to say "the cause is X" and I have not observed X, I
am guessing. That is the moment to add a probe, not to write a sentence.

**What it cost.** More than the time. Being wrong twice in one session made the
owner doubt the rest of the work, and they were right to — accuracy is not a
per-answer property, it is a reputation, and the second wrong answer devalues
every correct one before it. The related failure is L46's sibling: I quoted a
security finding of "seven" from a scan without opening a single hit, and it was
three.

---

## L46 — a wildcard grant makes a made-up permission work

**What happened.** Building the trust screen I wrote
`requireFeatures: ['auth.trust.manage']`. There is no such feature. The real one
is `auth.trust.promote`.

The page worked. It loaded, it rendered, it was correctly gated in the sense
that a signed-out visitor was refused. Nothing failed — not the typecheck, not
the gate, not the browser. I only caught it because I opened `acl.ts` for an
unrelated reason and the name I remembered writing was not in it.

**Why it worked.** Wildcard grants are part of the ACL contract: `admin` holds
`auth.*`, and `auth.*` matches `auth.trust.manage` exactly as happily as it
matches a real feature. The matcher has no idea which strings are declared. So
**every typo in a `requireFeatures` string is invisible to the one account most
likely to be testing it.**

**What it costs when it ships.** The page is then gated on a permission that
exists nowhere: it cannot be granted to a narrower role, cannot be revoked, does
not appear in the permission editor, and carries no effect class — so the
resolver treats acts behind it as ordinary. It works for administrators and for
nobody else, forever, silently.

**The general shape.** *A permissive fallback that matches by pattern will
validate a name that means nothing.* Testing as the most privileged account is
what hides it — the wildcard is doing the matching, so the specific string is
never exercised. This is the same family as L38 and L45: the thing that made it
convenient (a cache, a wildcard) is the thing that made the check meaningless.

**What to do.** When writing any `requireFeatures`, read the feature back out of
the module's `acl.ts` — do not trust that the page loading means the name is
real. And test a gate as a **narrow** role at least once, never only as admin.

Sweeping for it found three more, all inherited — U19, now fixed, along with a
guard test asserting every `requireFeatures` string resolves to a declared
feature. `capability-coverage.test.ts` cannot see this: it checks the
descriptors that exist, not the guards that reference ones that do not.

**My first sweep said seven, and I reported that number before checking one.**
Four were false — the regex harvesting declared ids excluded hyphens, so real
features like `customers.widgets.next-interactions` looked missing. The
correction is in U19, and the guard test now uses one shared id pattern for
both declarations and usages, so a gap in the pattern hides a finding rather
than inventing one. Overstating a security finding by more than double is its
own failure, and it was avoidable by opening two files.

---

## L45 — `yarn typecheck` is Turbo-cached, so a green one can be stale

**What happened.** After pinning `nanoid`, a typecheck surfaced an error in
`packages/checkout` that had nothing to do with my change:

```text
PayPage.tsx(1367,70): Property 'ar' is missing in type
  '{ en: string; pl: string; es: string; de: string; }'
  but required in type 'Record<Locale, string>'
```

The file was untouched by me. The error was real, it had been there since `ar`
was added in G7 — and **every typecheck I had run that day reported zero
errors.**

The reason:

```text
Tasks:    17 successful, 20 total
Cached:   16 cached, 20 total
```

**Sixteen of twenty packages were served from cache.** Installing a dependency
invalidated them, and the first package to actually re-run failed. My repeated
"0 type errors" were mostly a cache reporting yesterday's answer.

**This is [[L38]] again in a different tool.** There it was `build:app` serving a
stale bundle; here it is `typecheck` serving a stale verdict. The pattern is the
same: **a Turbo-cached task reports the last result, not the current one**, and
the output says so in a line that is easy to skim past.

**The rule.**

- Read the `Cached:` line, every time. `Cached: 16 cached, 20 total` is not a
  pass — it is one pass and sixteen memories.
- Before claiming a clean typecheck in a commit message or to the owner, run
  **`yarn typecheck --force`** at least once and quote `Cached: 0`.
- `yarn test` has been reporting `Cached: 0 cached, 22 total` throughout, so the
  gate numbers stand. It was only typecheck that was quietly cached.

**Worth noting the parked-module angle.** The error was in `checkout`, which does
not run. So nothing was broken in the product — but the same cache was hiding
whatever else might be in the other fifteen, and I would not have known.

## L44 — a test can assert a field that does not exist, and look fine

**What happened.** Writing the Phase G exit-gate test I assumed the resolver took
a `projectCeiling` in its context, alongside `resourceCeiling`. It does not — a
project overlay and a record's lock state are both statements about *this
record*, so `AuthorityEnforcementService` merges them with `lowerOf` into a
single `resourceCeiling` **before** the resolver sees either.

So `context: { projectCeiling: 'A2' }` set nothing at all.

**The dangerous part is why it did not error.** Jest strips types rather than
checking them, so an excess property on a typed object compiles and runs. The
test failed only because the gate came back `A5` and I had asserted `A0`. **Had
the expected value happened to match the unconstrained answer, it would have
passed while testing nothing** — a green assertion about a field that does not
exist.

**The rule.** When a test asserts on a field you have not personally read in the
type, check the type first:

```bash
grep -n "resourceCeiling\|policyCeiling" packages/shared/src/lib/authority/decision.ts
```

And prefer assertions that would fail if the input were ignored — a baseline
comparison (`toBeLessThan(baseline)`) rather than an absolute value. An absolute
value can coincide with the un-constrained answer; a narrowing cannot.

**The unexpected benefit.** Getting it wrong is how I learned the architecture:
that two of the three exit criteria are one input by the time they reach the
resolver, and the distinction lives one layer up. The test now says so, which
is more useful than the version I set out to write.

## L43 — adding an enum value makes old conditionals silently partial

**What happened.** Giving `ai_worker` a producer meant a new principal kind could
finally appear at runtime. Every existing `kind === 'service'` check then became
wrong — not syntactically, semantically. They all meant *"resolve this actor's
permissions from its API key row"*, and there were suddenly **two** kinds that
needed it.

`RbacService` tested only for `service`, so an AI worker fell through to the
**human** branch and put a prefixed subject into a uuid column:

```text
DriverException: invalid input syntax for type uuid:
  "ai_worker:28c2b7f3-529e-4591-812c-c16bfcc1f738"
```

**Nothing caught it.** Every unit test passed. Typecheck passed — the comparison
is valid TypeScript, it is just no longer complete. The bug existed only at the
seam between a new enum value and old conditionals, and only surfaced when a real
request hit a real database.

**The rule.** When adding a value to a union that is switched on across a
codebase, **grep for every comparison against its siblings before writing the
producer**, and ask of each: *does this mean "is exactly X", or does it mean "is
one of the kinds that behaves like X"?* The second is the common case and the
dangerous one.

```bash
grep -rn "=== 'service'" --include=*.ts packages apps | grep -v node_modules
```

Three sites, one of which was a 500. Two minutes of grep against an hour of
debugging.

**Then replace the comparison with a named predicate**, so the next value added
is a question somebody has to answer rather than a runtime surprise:

```ts
export function isApiKeyBackedKind(kind: PrincipalKind | null | undefined): boolean {
  return kind === 'service' || kind === 'ai_worker'
}
```

**And do not reach for the nearest existing predicate.** `isMachinePrincipal()`
already existed and looked right — but it also covers `system`, the platform
acting from a CLI with no key row at all. Using it would have compiled, passed,
and failed differently later. The predicate has to answer the question the call
site is actually asking.

## L42 — a roadmap entry is a claim about the past, not the present

**What happened.** The roadmap listed **U7** — *"the journal cannot tell a machine
from a human"* — as the single most important thing left before Hermes. I said so
to the owner in strong terms: *"the only one on the list that can't be fixed
later."*

It had been fixed. Commit `ce7fb61`, *"U7: the journal records what kind of
principal acted"*, in an earlier session. Every row in `action_logs` was already
classified — 67 `human`, 6 `system` — and a live test with a real API key
confirmed a machine write records `actor_kind = service`.

**What the entry actually contained** was the *original finding*, copied forward
unchanged while the fix landed elsewhere. It read as a present-tense description
of a defect and was a past-tense description of a discovery.

**The check that would have caught it** costs one command:

```bash
git log --oneline -- <the file the finding names>
```

**The rule.** Before acting on any recorded finding — especially one being used
to justify priority — verify it against the code, not the note. This is [[L36]]
(*a recorded diagnosis is a hypothesis*) in its second form: L36 was about a
diagnosis that was wrong when written; this is about one that was right when
written and has since been fixed.

**And the tell was there.** The entity file already carried a doc comment
mentioning U7 by name and describing a backfill command. I read past it because I
had arrived expecting to build something.

**What was genuinely missing** was smaller and different: the audit *screen* never
displayed the kind it had been recording for weeks. The record existed and nobody
could see it — worth finding, and not what the entry said.

## L41 — a global rename invented a legal entity

**What happened.** Re-branding the platform, I ran a protected find-and-replace:
`Open Mercato` → `Companai`, guarding the `@open-mercato/*` package namespace so
imports could not break. That guard worked. What it did not occur to me to guard
was **prose that names the old company as a legal person**.

The onboarding consent strings came out like this, in four locales:

```text
onboarding.form.legalEntity
  Companai sp. z o.o., registered office ul. Wyspa Słodowa 7, Wrocław,
  KRS No. 0001253104, NIP PL8982336029, REGON 545230330,
  share capital PLN 80,000.00, fully paid.
```

**A limited company that does not exist, wearing a real third party's
registration numbers, inside a GDPR consent statement.** Worse than what it
replaced: the original at least named a company that is real and accountable.

It also rewrote **my own doc comments** — the ones explaining that these pages
belonged to *another* company — so they asserted the opposite of their point.

**Why the guard was not enough.** I protected the *identifier* namespace, which
is the mechanical risk, and missed the *semantic* one: text that is **about** the
old name looks identical to text that merely **uses** it.

**The rule.** Before a global rename, grep the old name for the shapes that make
it a legal or factual claim, and handle those by hand:

| Grep for | Because |
|---|---|
| `sp. z o.o.`, `Ltd`, `GmbH`, `Inc`, `LLC` | a legal form makes it an entity claim |
| registration ids — `KRS`, `NIP`, `VAT`, `REGON` | these identify a real company |
| a street address, a registry court | same |
| `consent`, `controller`, `terms`, `privacy` | renaming changes who is liable |
| `previously`, `upstream`, `originally`, `fork` | prose *about* the old name |

**And rename tests last, deliberately.** Three suites failed because they
asserted our own renamed strings — trivial. A fourth, `consent-controller-locales`,
was upstream's guard **on their own registration identifiers**, and it failing was
the only reason I looked. A guard inherited from upstream can be the thing that
catches a fork impersonating them; read those failures before updating them.

## L40 — widening a type in a parameter position breaks every implementor

**What happened.** `CommandHandler.capability` was `string`. To let one command
classify itself per call I widened it to
`string | ((input: TInput) => string | null)` — additive, backwards compatible,
and it compiled in `shared`.

Then the workspace typecheck produced **eight errors across four modules**, all
the same shape:

```text
Argument of type 'CommandHandler<Record<string, unknown>, Role>' is not
assignable to parameter of type 'CommandHandler<unknown, unknown>'.
```

**Why.** Adding a function whose parameter is the class's own generic makes the
whole type **contravariant** in that generic. `CommandHandler<TInput>` stopped
being assignable to `CommandHandler<unknown>`, and `registerCommand` takes
exactly that — so **every command handler in the platform** stopped compiling.
Nothing was wrong with any of them.

**The fix is one word:** type the parameter `never`.

```ts
readonly capability?: string | ((input: never) => string | null)
```

`never` is assignable to any parameter type, so the variance disappears and a
classifier written against `unknown` or a concrete shape both still fit. The cost
is that authors annotate their own parameter instead of having it inferred.

**The rule.** Before adding a **function-valued** field to a widely-implemented
interface, ask what it does to variance. A field that only *returns* the generic
is safe; one that *accepts* it flips the whole type and the blast radius is every
implementor, not the one you were editing.

**And run the workspace typecheck, not the package one.** `yarn workspace
@open-mercato/shared build` passed cleanly — the breakage was entirely in the
consumers, and only `yarn typecheck` across all packages saw it.

## L39 — a 404 on a route you just wrote is usually a stale server, not a bug

**What happened.** I finished the denials API, saw it built into
`packages/core/dist/modules/auth/api/authority/denials/`, saw it registered twice
in `modules.generated.ts`, and curled it. **404.** The delegations route beside it
answered `401` — the correct answer for "exists, needs auth".

Nothing was wrong with the route. The server was running `next start`, which
serves a build made before the route existed and never re-reads anything.

**The diagnostic that settles it in one command.** Curl a *sibling* route in the
same directory:

```text
api/auth/authority/delegations GET: 401   <- server is fine, auth is fine
api/auth/authority/denials     GET: 404   <- this route is not in the build
```

A `404` on the new one and a `401` on the old one is conclusive: the routing
works, the new route simply is not there. If both had returned 404 the problem
would have been auth or the path.

**The rule.** Before believing a new route is broken, establish which of three
things you are looking at:

| Symptom | Meaning |
|---|---|
| New route 404, sibling 401 | Stale build. Rebuild and **restart** |
| Both 404 | Wrong path, or the whole module is not registered |
| New route 401 | It works — you are just not logged in |

**And check how the server runs before assuming a rebuild is enough.** `yarn dev`
picks up rebuilt packages; **`next start` does not** — it must be stopped and
started again. Check with `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`
rather than guessing.

This is L38's sibling. L38 is *the build did not happen*; this is *the build
happened and the process is still serving the old one*. Both present as "my
change had no effect", and both waste an hour if you start by doubting the code.

## L38 — `yarn build:app` can be a cache hit that serves last week's code

**What happened.** Fixing U11 took four attempts, and three of them failed for the
same invisible reason.

I changed `packages/core`, ran `yarn build:packages && yarn build:app`, restarted
the server, and tested. Nothing happened. I added `em.persist()` — nothing. I
added `console.log` instrumentation and rebuilt — and **the log lines never
appeared**, which is what finally gave it away: the code could not be running,
because it was never bundled.

```text
Tasks:    1 successful, 1 total
Cached:   1 cached, 1 total          ← the app was NOT rebuilt
```

Turbo had cached `build:app`. The new code was demonstrably in
`packages/core/dist` — four occurrences of the debug string — and absent from
`apps/mercato/.mercato/next/server/chunks/`. With `--force`:

```text
Cached:   0 cached, 1 total          ← 5m32s, and the code shipped
```

**Why the cache is wrong here.** `build:app` compiles the Next application against
the *built packages*. Turbo's hash for that task did not pick up the change to
`packages/core/dist`, so it replayed a stale bundle while reporting success.

**The rule.** *After changing any package, rebuild the app with `--force`:*

```bash
corepack yarn build:packages && corepack yarn build:app --force
```

**What this costs beyond the four attempts.** Every boot check in this project
that used a plain `build:app` may have booted a stale bundle — so "the server
starts and the route resolves" proved less than it appeared to. The **gate is
unaffected**: Jest runs from source, so test results were always honest. It is the
*runtime* verification that was weaker than claimed, which is recorded rather than
quietly re-run.

**The tell to remember**: instrumentation that produces *no output at all* is
rarely a subtle bug. It usually means the code is not running. [[L28]] says prove
the diagnostic works before believing its silence; this is the same lesson from
the other side — the silence was real, and it was about deployment, not logic.

---

## L48 — a capability that exists is not coverage

**What happened.** The analysis programme mapped 140 requirements against our
platform and Hermes, and marked each `COVERED` / `PARTIAL` / `MISSING`. The
critic pass attacked every `COVERED` cell — **30 of them** — and the attack kept
landing:

| Marked `COVERED` | What was actually true |
|---|---|
| The authorization resolver | It exists, but it is in **`shadow`** — RBAC still decides. A resolver that decides nothing covers nothing |
| Hybrid search | It runs, but it is **not tenancy-filtered** — an unfiltered vector search is a security hole, not a feature |
| The UI shell | The shell is real; the **Widget it is supposed to host** does not exist |

Three of the strongest "shortcuts" in the register were **half-built**: the kernel
is free, the *enforcement* is the work; the shell is free, the *object* is not.

**Why it happens.** A capability that exists *looks* like coverage, and the file
behind it makes the claim feel measured. But **existing, being enabled, and doing
the job are three different things**, and only the third is coverage. The trap is
that the first two are checkable with a grep, and the third is not.

**The rule.** *For every "we already have this", ask what the requirement needs
that this cannot do.* A thing that is off, unwired, or only half the job is
`PARTIAL` at best. This is [[L8]] (*a schema is not a behaviour*) and [[L17]]
(*before removing an obstacle, ask whether it is a guard*) in the shape of an
assessment: the artifact is not the behaviour.

**The general form:** an inventory is not a capability. What you *have* is what
runs and does the job; everything else is a build wearing a green tick.

---

## L49 — a number written without measuring it

**What happened.** The analysis programme's batch 9 produced a 140-row matrix and
a headline count. I wrote the tally **by hand**, from memory, as I summarised:
`COVERED 15 · PARTIAL 55 · MISSING 38`. Then I parsed the file I had just
written. The real numbers were **`COVERED 20 · PARTIAL 50 · MISSING 64`**.

Four domain-header counts were wrong too, and three rows labelled `CONFLICT` had
`COVERED` sitting in their verdict cells. The *rows* were right; the *summary of
the rows* was invented.

**Why it happens.** A summary count feels like arithmetic, and arithmetic feels
safe. But the number was never derived — it was estimated from the shape of the
document, and estimation is invisible when it is written in the same font as the
count. A count that nobody derived is a guess with a number's authority.

**The rule.** *Never write a summary count by hand. Parse the artefact you just
wrote.* If the artefact is a file, the count is a `grep -c`, not a memory. And
check the parts add up to the whole — the domain headers and the row count and
the verdict columns must reconcile, or one of them is wrong.

**The general form:** this is [[L2]] (*a grep count is not a finding*) turned on
your own output, and [[L36]] (*a diagnosis you wrote down is a hypothesis*) in
numerical clothing. **A number is evidence only if it came from the thing it
describes.** The fix is one command; the cost of skipping it is a wrong figure in
a permanent document — the same failure this programme found in someone else's
documentation and criticised.

---

## L50 — quote the specification, not a derived reading

**What happened.** Sprint 0's research table recorded the laptop as
"**31.9 GB RAM**, 8 logical cores". Both numbers were measured — but both are the
operating system's *derived* readings, not the machine's specification. The
installed parts are **32 GB RAM** (2 × 16 GB DDR4-2133) and a **4-core /
8-thread** Intel i7-6820HQ. The owner caught it: *"'RAM: 31.9 GB, 8 cores' is not
my laptop specifications."*

**Why it happens.** The OS reports what it can *use*, not what is *installed*: it
deducts the memory the integrated graphics reserve (32 GB installed → 31.89 GB
"total physical"), and it reports *logical processors* (threads) under a heading
that reads like cores. A derived reading is a real number, which is exactly what
lets it pass a casual check — but it is not the answer to "what are the machine's
specifications?".

**The rule.** *When you state a machine's specification, name the installed
part.* Memory = the installed capacity, from the DIMMs — not the OS's usable
total. CPU = cores **and** threads, never threads alone labelled "cores". The
evidence is `Win32_PhysicalMemory` (sum of DIMM capacities) and
`Win32_Processor` (`NumberOfCores` vs `NumberOfLogicalProcessors`) — **not**
`Win32_ComputerSystem.TotalPhysicalMemory`.

**The general form:** this is rule zero-nine (*measure from the artefact, not the
description of it*) applied to the machine itself, and [[L49]] (*a number written
without measuring it*) with the twist that this number **was** measured — it was
just the wrong quantity for the noun. **A true number attached to the wrong word
is still a false claim.**

---

## L51 — an absence is a claim too

**What happened.** Writing Sprint 0's model-server step, I asserted the machine
had **"no NVIDIA GPU"** and told the reader to use the CPU image. I had not
enumerated the GPUs. I then measured: the machine has **two** adapters — Intel HD
530 **and an NVIDIA Quadro M2000M**. The absence I wrote down was simply false.

**Why it happens.** Stating what a thing *lacks* feels like a weaker, safer claim
than stating what it *has* — so it gets less scrutiny. But "there is no X" is a
claim about the whole system, and it is falsified by a single X. It is, if
anything, *harder* to prove than a presence. It is also invisible: a wrong
presence is a wrong fact, but a wrong absence quietly closes a door the reader
never knew was open (here: GPU acceleration).

**The rule.** *Do not write an absence you have not enumerated.* Before "there is
no X", run the check that would find X if it existed — and say where you looked.
This is [[L1]] (*a confident label is not an inspection*) aimed at the empty set:
"nothing there" is a finding, and a finding needs an inspection behind it.

**The general form:** [[L50]] was a true number on the wrong noun; this is a
**negative** on no evidence at all. Both are the same defect — a claim that
outran its measurement — and both were caught by the owner, not by me.

---

## L52 — `${VAR:-default}` is not a default, it is a pass-through

**What happened.** The app container crash-looped on
`Cannot find module 'C:/Program Files/WorkBuddyAI/…/node-language-shim.cjs'`. The
compose read `NODE_OPTIONS: ${NODE_OPTIONS:---max-old-space-size=3072}`, which
*looks* like "use the sensible default". It is not: when the **host shell** has
`NODE_OPTIONS` set — and this machine exports a Windows-only preload path —
compose interpolates the host's value straight into the container, where the path
does not exist and `node` aborts before running a single line of the entrypoint.
The neighbouring `mcp` service was immune only because it read a **differently
named** variable (`MCP_NODE_OPTIONS`).

**Why it happens.** The construct reads as "fallback", so the eye sees a safe
default and stops. But `${VAR:-x}` means *"the ambient value if there is one,
otherwise x"* — the ambient value is the **primary**, and `x` is the leftover. Any
name that a build host, a developer's shell, or a CI runner might set turns a
"default" into an uncontrolled input.

**The rule.** *Never default a compose value from a variable the host might own.*
Use a project-specific name (`APP_NODE_OPTIONS`, `MCP_NODE_OPTIONS`) so the
ambient environment cannot reach the container at all. If you must read a
generic name, read it and **print what you resolved** before trusting it.

**The general form:** a default that can be overridden by the environment is not a
default — it is an unvalidated input wearing a default's clothes. Measured three
ways before believing it: the host shell, `docker compose config`, and
`docker inspect` of the live container.

---

## L53 — a marker written on *reported* success is a lie the next run believes

**What happened.** The database had **zero users**, yet
`/tmp/init-marker/.seeded` existed, so `init-or-migrate.sh` took its "Subsequent
run: migrations only" branch forever and never seeded anything. `mercato init` had
**printed** `❌ Initialization failed`, and the marker was written anyway.

**CORRECTION, 2026-10-04.** This lesson first said the CLI "still **exited 0**".
**That was wrong, and it aimed the fix at the wrong file.** Two routes agree that
the CLI was always honest:

- the catch block logs the message and `return 1` (`packages/cli/src/mercato.ts:1322-1324`),
  and `bin.ts` ends with `process.exit(code ?? 0)`;
- the CLI's own tests assert it — `expect(exitCode).toBe(1)` at
  `packages/cli/src/__tests__/mercato.test.ts:373` and `:419`.

**The script that read it was the dishonest one:**

```sh
if sh -lc "${COMMAND}" >"${LOG_FILE}" 2>&1; then
  return 0
fi
STATUS=$?          # always 0
```

The exit status of an `if` with no `else` whose condition failed is **0**, so
`run_command_with_cli_recovery` reported **every** failure to its caller as
success. The script read `$?` in **four** places and **two** of them were broken; all four now use
one explicit shape. The trap itself is written up as [[L63]].

**Why it happens.** A sentinel file is a promise made to a future run, and it is
written at the moment the writer is least able to judge. "The command returned 0"
is treated as "the work is done", but the two are different claims: one is about a
process, the other about the world. The world here was an empty `users` table.

**The rule.** *A marker must be written only after the effect is verified, not
after the command returns.* And before trusting any status, **verify that you
actually read the one you think you read** — a status captured in the wrong place
is worse than no status at all, because it arrives looking like evidence. Any
"already done" sentinel must also be re-checkable against the thing it claims.

**The general form:** this is [[L48]] (*a capability that exists is not coverage*)
turned inward — a *reported* success is not a *measured* one. The marker is now a
known defect (**B-15**), not a curiosity. *The follow-on lesson is the harder one:
the first diagnosis of this defect was itself unmeasured, and it was believed for a
day.*

---

## L54 — never hand-write a file the program owns

**What happened.** To point Hermes at our model and our MCP, I wrote its
`config.yaml` by hand. Hermes **overwrote it on startup** — the file is its own
state, carrying a `_config_version` it migrates, and it rewrites it from its
internal model. My `model:` and `mcp_servers:` blocks simply vanished, which is
why Hermes never contacted the MCP and its log contained not one MCP line.

**Why it happens.** Editing a config file is the obvious move and it *looks* like
it worked — the file on disk contains your text right up until the program starts.
The failure is silent and delayed: you find out only by noticing an **absence**
(no MCP lines) rather than an error.

**The rule.** *If a program ships a CLI for its configuration, that CLI is the
only writer.* `hermes config set`, `hermes mcp add` — then verify with
`hermes config get`. Do not infer that a hand edit took effect because the file
still reads the way you left it; **re-read it after the program has started.**

**The general form:** [[L51]] (*an absence is a claim too*) — the damage here was
not a wrong value, it was a **missing** one, and a missing thing has no error
message.

---

## L55 — the accepted form of a credential lives in the code, not in the client's prompt

**What happened.** Hermes' `mcp add --auth header` flow asks for an
"API key / Bearer token" and stores `Authorization: Bearer <key>`. The platform's
MCP accepts exactly **two** forms (`lib/auth.ts:157-192`): `x-api-key: <secret>`,
or `Authorization: ApiKey <secret>` — note **`ApiKey `**, not `Bearer `.
`Bearer` is neither, so every call returned
`401 {"error":"API key required (x-api-key header)"}`. The fix was one header.

**Why it happens.** "Bearer token" is so standard that both sides assume it. But
the *label on the client's prompt* is a guess about the server; only the server's
own header-parsing code is a fact. The 401 message was the server telling us
precisely which header it wanted, and it was easy to read past it as a generic
auth error.

**The rule.** *Read the server's header parser before wiring a client.* And treat
an error body that **names the required header** as an instruction, not a symptom.

**The general form:** [[L50]] (*quote the specification, not a derived reading*) —
a prompt string is a derived reading; the parser is the specification.

---

## L56 — a flag that looks like it sets capacity may be silently capped

**What happened.** Hermes refuses any model whose served context is below 64,000
tokens. Adding `-c 65536` to llama.cpp looked like the fix — and the server
started happily. It was **not** the fix: llama.cpp logged
`the slot context (65536) exceeds the training context of the model (32768) -
capping` and served `n_ctx_slot = 32768`. The server accepted the flag, discarded
the part it did not like, and reported success. Only the **startup log** revealed
it. YaRN RoPE scaling was what actually admitted 64K.

**Why it happens.** "It started" is read as "it is configured". A capped value
produces no error, no warning dialog and no non-zero exit — just a quieter,
smaller system than the one you think you built. The evidence sits in one log line
that scrolls past during a 60-second model load.

**The rule.** *After setting a capacity, read back the capacity the component
reports — from its own log, not from your config.* The config states an intention;
the log states a fact.

**The general form:** [[L49]] (*a number written without measuring it*) with a
mask: the number was written **and accepted**, which feels like measurement. It
was not — nothing had confirmed the value took.

---

## L57 — a failure that falls through still looks healthy

**What happened.** The compose `command` for the app runs
`init-or-migrate.sh` and then `yarn start` — with **no `set -e`**. When
initialisation failed, the shell simply carried on to `yarn start`. The container
reported `Up`, served HTTP, started all its queue workers and its scheduler, and
answered `/` with a `307 → /login`. Every outward signal said "healthy". It had
never been initialised.

**Why it happens.** We read health from the *liveness* of the process, and a
process that fell through a failure is perfectly alive. The defect is invisible
from outside because the fall-through is what makes it look well.

**The rule.** *When a startup sequence has a must-succeed step, make it fail the
startup.* `set -e`, or an explicit exit — otherwise "it came up" says nothing about
whether the step ran.

**The general form:** this is the same defect as [[L53]] seen from the other side.
There, a marker claimed work that had not happened; here, a **running process**
does. Both substitute a signal about the program for a fact about the world.

---

## L58 — a default tuned for a different machine than the one you gave it

**What happened.** The model server ran at **~13 tokens/s** ingesting its prompt,
which made every agent turn take ~20 minutes. The container had **8** CPUs. But
llama.cpp's `-t` default is the number of **physical** cores — and this laptop is
**4 physical / 8 logical** — so the server quietly used **4 threads** and left
half the machine idle. `docker exec … nproc` said 8; the server's own log said
`n_threads = 4`. Nothing was broken; the default was simply sized for a machine
we were not running on.

**Why it happens.** The default is a *reasonable guess about the host*, made by
the tool, for a host it cannot see. We hand it a container and assume the guess
still holds. It does not — the container is not the laptop.

**The measurement, and why one number would have misled.** Both phases had to be
measured separately, because they answer to opposite resources:

| `-t` / `-tb` | prompt ingest | generation |
|---|---|---|
| 4 / 4 (default) | 13.2 tok/s | 3.9 tok/s |
| 8 / 8 | 17.7 tok/s | **3.0** tok/s |
| **4 / 8** | **19.3** tok/s | **4.6** tok/s |

Ingest is compute-bound, so more threads help. Generation is memory-bandwidth-
bound, so more threads *hurt* (sync overhead beats the extra parallelism). Had we
only measured "tokens per second" on a generation test, we would have concluded
8 threads was a regression and reverted the real fix.

**The rule.** *Read the tool's default, and check it against the resource you
actually gave it — not the resource of the machine you are sitting at.* And when
one setting governs two phases, **measure both**, because they need not move
together.

**The general form:** [[L49]] again — a number (here, a default) accepted without
being measured against the situation it was going to run in.


## L59 — a zero return value means "request accepted", not "effect happened"

**What happened.** The unattended Ubuntu install on the Hyper-V VM stopped at

```
An autoinstall file was found … add 'autoinstall' to your kernel command line to avoid this
Continue with autoinstall? (yes/no)
```

and sat there for **eight minutes** with the CPU at 0 % and the virtual disk still
at 4 MB. To answer it we called the Hyper-V keyboard API:

```powershell
$kb.TypeText("yes")     # → ReturnValue = 0   (success)
$kb.PressKey(13); $kb.ReleaseKey(13)
```

Both calls returned `0`. The VM did nothing. We had already tried this once, so we
assumed the *approach* was wrong. It was not — **`TypeText` is the part that does
nothing.** Replacing it with per-character virtual-key presses fixed it instantly:

```powershell
$kb.PressKey(89); $kb.ReleaseKey(89)   # Y
$kb.PressKey(69); $kb.ReleaseKey(69)   # E
$kb.PressKey(83); $kb.ReleaseKey(83)   # S
$kb.PressKey(13); $kb.ReleaseKey(13)   # Enter
```

The screen then read `Continue with autoinstall? (yes/no)` / `yes` /
`start: subiquity/Install/install/configure_apt`, and the disk began to fill.

**Why it happens.** `ReturnValue = 0` on a WMI method means *the management
service accepted the request*. It says nothing about whether the guest received,
understood, or acted on it. `TypeText` crosses a boundary — host → VMBus → guest
keyboard driver → tty — and reports success at the **first** hop.

**How we caught it, which is the reusable part.** Two probes, in order:

1. **A single harmless character** (`TypeText("y")`), then re-capture the screen.
   Byte-identical → the call had no observable effect. (It had also reported `0`.)
2. **A control that must change the screen if input works at all** — press
   **Enter** and nothing else. A *third* `Continue with autoinstall? (yes/no)`
   line appeared. An empty answer re-prompts, so the extra line is proof that
   input reaches the guest. That isolated the fault to `TypeText` and cleared the
   whole delivery path in one step.

Without probe 2 we would have concluded "keyboard input does not work on this VM"
and gone off to remaster the ISO — a much larger, riskier change to fix a problem
that did not exist.

**The readback, since it is not obvious.** Hyper-V has **no `Get-VMScreenshot`
cmdlet**. The console image comes from a WMI call —
`Msvm_VirtualSystemManagementService.GetVirtualSystemThumbnailImage` — which
returns a raw **RGB565** framebuffer (here 640×480×2 = 614 400 bytes, plus a
4-byte header). Render it to PNG and *read the screen*. Note the trap: the
header's width/height describe the **guest's** display mode (2304×1120), not the
thumbnail you asked for, so size the buffer from the byte count, not the header.

**The rule.** *A success return is a claim about the API, not about the world.*
Before you drive anything with an input path, prove it moves something you can
**see** — and use a control that has no other explanation. Then trust it.

**The general form:** [[L3]] and [[L49]] again — a returned number accepted as a
measurement of something it never measured.


## L60 — `select user` asks the database who *you* are, not what the column says

**What happened.** To find out which SSH account Coolify would use to reach its own server, I queried
its `servers` table:

```sql
select id, name, ip, user, (private_key_id is not null) as has_key from servers;
--  0 | localhost | host.docker.internal | coolify | t
```

I read `user = coolify`, checked whether a `coolify` account existed on the machine, found it did
**not**, tried the connection as that user, got `Permission denied`, and concluded that Coolify's
localhost server was misconfigured and would fail the moment it was used.

All of that was wrong. **`user` is a reserved keyword in PostgreSQL** — bare `user` is an alias for
`current_user`. The query returned the *database session role* (`coolify`, the Postgres user created
by the install), not the column. The real column value is **`root`**, and `root@host.docker.internal`
connects fine. The corrected query quotes the identifier:

```sql
select id, name, ip, "user" from servers;   -- 0 | localhost | host.docker.internal | root
```

**Why it is worth a lesson.** The wrong value was *plausible*. `coolify` is exactly the kind of answer
you expect from a Coolify database, and every neighbouring column was correct, so nothing looked
wrong. It was only caught because the next step — actually *trying* the SSH connection — did not fit
the story: `coolify@` failed but `root@` succeeded, and both could not be true of a correctly-read
column.

**The tell.** The suspicious value was **identical to something else I already knew** (the database
username). A column whose value happens to equal the name of the thing you are querying is worth a
second look.

**The rule.** *When a value looks like it might be about the tool rather than the subject, confirm you
selected what you meant.* Quote identifiers that are also SQL keywords — `user`, `order`, `table`,
`end`, `limit`, `default`, `group`. And when a "finding" would send someone off to fix something,
settle it with a **second, independent route** before reporting it: here, performing the connection
rather than describing it.

**The general form:** [[L1]] and [[L2]] again — a value read as a fact about the subject when it was
a fact about the reader. In a build that must not break the machine, the cost of this one was a
false alarm; had it been acted on, it would have meant "fixing" a connection that was already working.



---

## L61 — When a widely-repeated number justifies an action, read the vendor's current doc

**What happened.** WSL2 runs as a small VM and is given a share of the host's RAM by default. I wrote,
into a config file, a runbook and the plan, that the default is **"80% of RAM on Windows 10"** — and
used it to justify capping WSL at 12 GB on a 32 GB laptop that also runs a 6 GB Hyper-V VM.

**It is wrong.** Microsoft's current `.wslconfig` reference states a single default of **50% of total
memory**, with no Windows 10 / Windows 11 split. The 80% figure is an older value that is still
repeated in blog posts, Stack Overflow answers and AI-generated summaries — and a web search returns
those first, which is how it got in.

**Why it is worth a lesson.** The *action* was still correct: 16 GB of WSL plus a 6 GB VM is 22 GB of
32, and lowering the ceiling to 12 GB is a reasonable margin either way. So nothing broke, and the
error was invisible — a wrong number inside a right decision. That is exactly the kind that survives
review.

**The tell.** The number was **load-bearing** (it was the reason to act) and it came from a **secondary
source** (a search result) rather than the vendor's own reference page.

**The rule.** *If a number is the justification for changing something, fetch it from the vendor's
current documentation and quote the sentence.* A figure that is merely descriptive can come from
anywhere; a figure you are about to act on cannot. Corollary: when a claim is widely repeated, that is
evidence it is **old**, not evidence it is right.

**The general form:** [[L1]] again — a confident label is not an inspection. Here the confident label
was a percentage, and the inspection was one fetch of the page that defines it.

---

## L62 — A failing probe is not a finding until you know the probe works

**What happened.** I needed to show that the phpMyAdmin container could reach the MariaDB container by
name. I ran a TCP test inside the phpMyAdmin container and got:

```
TCP-3306-CLOSED
```

That looked like a real result: the database was unreachable and phpMyAdmin would never work. I was one
keystroke from writing it up.

**It was false.** The test was `(echo > /dev/tcp/mariadb/3306)`. **`/dev/tcp` is a bash feature, and the
container's `sh` is `dash`, which does not implement it.** The command could never have succeeded,
whatever the network did. The same container also resolved `mariadb` to `10.0.1.8` and answered a real
`mysqli` connection, listing both databases.

**Why it is worth a lesson.** A probe that fails looks exactly like a subject that is broken. The failure
was in the instrument, and the instrument was silently incapable of success. This is the same shape as
[[L3]] — verify the tool before trusting the measurement — but with a nastier property: the broken tool
did not error, it returned a clean negative.

**The rule.** *Before believing a negative result, make the probe succeed on a case you know is positive.*
If you cannot get the instrument to say "yes" anywhere, it has not told you "no" about anything.

**Practical corollaries from the same hour:**
- **Use the subject's own runtime as the probe.** The definitive test was `php -r 'new mysqli(...)'` —
  the same PHP that phpMyAdmin itself uses. It cannot disagree with the thing it is measuring.
- **Two client names, one tool.** MariaDB 11 has no `mysql` binary; the client is `mariadb`. An
  `executable file not found` is a naming fact, not a database fault.
- **`getent hosts` may show only IPv6** while `getent ahostsv4` shows the working IPv4 address. Check
  both families before concluding a name resolves badly.

**The general form:** a measurement has two parts — the subject and the instrument — and a bad reading
implicates both equally. [[L1]] says a confident label is not an inspection; this says an inspection is
not an inspection either, until the instrument is proven.

---

## L63 — `$?` after `fi` is always 0, so a failure read there is a success

**What happened.** `init-or-migrate.sh` reported every failed database initialisation to its caller
as a success, so it wrote its "already seeded" marker anyway and the app came up looking healthy on a
half-seeded database ([[L53]], **B-15**). The whole defect is two lines:

```sh
if sh -lc "${COMMAND}" >"${LOG_FILE}" 2>&1; then
  return 0
fi
STATUS=$?          # <-- 0, always
```

**Why it happens.** The exit status of an `if` compound command with **no `else`**, whose condition
was false, is **0** — because no command in either branch ran, and the shell has nothing to report.
The condition's own failure is *not* propagated. So `STATUS=$?` reads the status of the `if`, not of
the command that failed. It looks completely natural, it is the obvious place to put the line, and it
is silently wrong every single time. Measured directly, in both `sh` and `bash`:

```sh
f() { if sh -c "exit 7"; then return 0; fi; STATUS=$?; echo "$STATUS"; }   # prints 0
```

**The rule.** *Never read `$?` after `fi`. Capture the status where the command is.* The safe shapes
are `cmd || STATUS=$?` (with `STATUS=0` set first), or `$?` as the first thing inside an `else`
branch. Prefer the `||` form: it says what it means, and it is also exempt from `set -e` — see
[[L64]].

**The general form:** a status is only evidence if you know *which command's* status you read. This is
[[L62]] applied to shell plumbing rather than to a probe: the instrument was never measuring the
subject. When one instance of a pattern is found, **grep the file for the others** — this script read
`$?` in **four** places and **two** of them were broken (the two read after an `fi`); the other two
sat in an `else` branch and were correct only by accident of where they were written. Fixing the
first alone left the bug half-alive.

---

## L64 — `set -e` is ignored inside a function called as a condition

**What happened.** `dev-entrypoint.sh` guarded its expensive setup with a function whose first line
was `set -e`, and called it as `if ! (run_setup); then`. The intent — and the comment in the file —
was that any failing step would abort the setup and print a "SETUP FAILED" banner. It did not. A
failing `yarn install`, `build`, `generate` or `init` fell through to the next line, the function
ended on a successful `cd`, returned 0, and the banner never printed. The guard was dead code that
read as protection.

**Why it happens.** POSIX exempts the condition of an `if` from errexit — that is deliberate, so that
`if grep -q x file` is not fatal. The exemption applies to the whole command in the condition
position, *including a function called there*: the `set -e` inside the function does not re-arm it.
Measured, in both `sh` and `bash`:

```sh
f() { set -e; false; echo "NOT ABORTED"; }
if ! (f); then echo "guard fired"; else echo "guard did NOT fire"; fi   # guard did NOT fire
```

**The rule.** *Do not rely on `set -e` for a function that is invoked as a condition.* Check each
step explicitly (`cmd || return 1`), or restructure so the function is called as a plain command.
And when a guard is meant to protect something, **make it prove it fires** — a guard that cannot fail
is a comment.

**The general form:** `set -e` is not a safety net, it is a mode with exceptions — conditions,
`&&`/`||` lists, and `!` all switch it off. Treat "the script would have stopped" as a claim to be
tested, exactly like any other. Same family as [[L63]]: the mechanism looked right and was inert.

---

## L65 — a test that cannot tell pass from fail proves nothing

**What happened.** Writing the regression test for **B-15**, the first run reported the *happy path*
failing and the *bug* passing — the exact inverse of the truth. The harness was broken: `mktemp -d`
on Git Bash returns a Windows path (`C:\Users\...`), `sh -lc "C:\Users\..."` eats the backslashes and
reports "No such file or directory", so **every** stub failed to run, and "failed" happened to look
like the expected result in one case. Separately, a second run appeared to hang and was killed at
120 s — it was not hung, it was slow, and the timeout was mine.

**Why it happens.** A test that fails looks like a test doing its job. Nothing in the output says
*which* of the two things went wrong — the product, or the instrument — and the reader is strongly
motivated to accept the convenient reading. [[L62]] in a different costume.

**The rule.** *A harness must first prove it can distinguish the two outcomes, before its verdict on
anything is worth reading.* Concretely, every test here now opens with a self-check: run a stub that
exits 0 and one that exits 1, and abort if they are not seen as 0 and 1. And **a regression test must
be run against the unfixed code first** — if it passes there, it is not testing the fix.

**The general form:** mutation-prove the instrument before believing its reading of the subject.
Applied here, both tests were run against the pre-fix code and failed there (3 and 3 cases
respectively) before being trusted on the fixed code (0 and 0).

---

## L66 — when a sentence states a total *and* its components, the components are the second route

**What happened.** The vision's object lists are Doc 3 §38 = 30, README §16 = 33, Doc 3 §150 = 34.
The union was recorded — in the analysis reports, the development plan, the backlog and the owner's
own decision record — as **36**. It is **37**. The sentence that carried the figure had the proof of
its own error inside it:

> "the union of all three is **36 distinct objects** (30 ∪ 33 ∪ 34 = 30 + LegalEntity + Function +
> Dependency + the four contracts)"

`30 + 3 + 4` is 37. The stated total and the stated components disagreed, and the total was the
wrong one. Re-measured twice — counting the added items per list, and extracting the three lists
programmatically from the source files and de-duplicating two ways — both routes gave 37. The slip
had been copied into **14 places across 8 files** and had reached a decision record.

**Why it happens.** A total is the part people read and copy; the components are skimmed as
decoration. So the wrong total travels and the right components stay put. This is why the error
survived: nobody had a reason to add up a sum that was already answered.

**The rule.** *A stated total is not evidence — the components are.* Whenever a document gives a
count **and** the things it counts, add them up; if they disagree, the arithmetic is the finding.
And a figure that has been copied into several documents is **more** suspect, not less: copying is
not checking, and each copy is a chance to lose the context that would have caught it.

**The general form:** read the derivation, not the result. This is [[L61]] (check the source, not
the repeated number) applied to our own writing rather than a vendor's.

**And its inverse, found the same day.** The first draft of the Business Model Kernel specification
tallied its own status register as `22 settled · 11 partly · 7 open`. The measured figures are
`22 · 10 · 8`. **The sum was right — 40 either way — and the split was wrong.** So "it adds up" is
not a check: a wrong split hides behind a correct total just as easily as a wrong total hides behind
correct components. Both halves of a figure need deriving, and the half nobody re-derives is the one
that is wrong. This is also why the critic pass that caught it is written into the document itself
rather than mentioned in a message.

---

## L67 — catching an error does not un-abort a database transaction

**What happened.** `mercato init` died with `current transaction is aborted, commands ignored until
end of transaction block`. The statement that actually failed was nowhere in the app log, because the
code that runs it wraps it in `try { ... } catch {}`. The Postgres server had it: a scope lookup
`select "organization_id", "tenant_id" from "feature_toggles" where "id" = $1` against a **global**
table that has neither column.

**Why it happens.** In Postgres a failed statement puts the whole transaction into the aborted state,
and every later statement in that transaction is then rejected whatever it is. A `catch {}` is a
JavaScript construct; it has no power over the server's transaction state. So the pattern *"fire a
speculative query, swallow the failure, carry on"* is safe only when the query is **not** inside a
transaction — and a query inside a command handler almost always is.

**The rule.** *When a caught error and a later, unrelated-looking error share a connection, the first
is the cause and the second is the symptom.* To diagnose: read the failing statement from the
**database**, not from the app — `log_min_error_statement` is already `error` by default, so the
server logs it; grep the server log for `STATEMENT:`, which the app log will never contain. To
prevent: do not run a query that can fail inside a transaction without knowing it can succeed — here,
ask the schema which columns exist (the codebase's own `columnExists` does exactly that) instead of
selecting them blind.

**Proven, not guessed:** both errors were logged on the **same backend PID**, so it was demonstrably
one connection and one transaction.

**The general form:** a swallowed exception is not a neutral act — it hides the first link of a causal
chain, and every later failure in that chain then reads as a separate bug.

---

## L68 — a fix that is not built into the artefact you are running is not a fix

**What happened.** B-15 half 1 was diagnosed and fixed in source on 2026-10-04 16:51, and the fix was
verified with two test suites. On 2026-10-05 the reset still produced a half-seeded database with an
"already seeded" marker — because the running image had been built at **03:08 the same day**, ~11.7
hours *before* the fix, and was still executing the old script. Diffing the script out of the
container against the repo copy is what showed it.

**Why it happens.** The repo is the thing being edited; the container is the thing being run. Every
tool that reports — tests, lint, a diff, a commit — reports on the edited thing. Nothing in the normal
workflow reports on the run thing, so "fixed and tested" and "fixed and running" drift apart silently,
and the drift is invisible exactly when the fix matters most.

**The rule.** *Before concluding a fix is in effect, read the artefact that is actually running.*
Concretely: `docker inspect <image> --format '{{.Created}}'` against the commit dates of the fixes;
and when the running code is what matters, diff the file **out of the container** against the repo
copy. A build that has not been run is a hypothesis.

**The general form:** [[L61]] says read the source, not the repeated number. This is its counterpart
for anything deployed — read the artefact, not the repository.

---

## L69 — fixing one copy of a duplicated pattern is not fixing the pattern

**What happened.** The **B-15 half-2** bug was a blind scope lookup — `select "organization_id",
"tenant_id" from "<table>"` against a global table that has neither column. It was found in
`query_index/di.ts`, fixed there, rebuilt, and **verified present in the running container**. The
reset then failed in exactly the same way: same statement, same abort, same place in the log.

That identical failure is what exposed the real shape of the problem: the lookup had been
copy-pasted into **five** places across two packages, and the copies carried comments pointing at
each other (*"same pattern as vector_upsert.ts"*). The three in the search subscribers were the ones
actually firing, because they register at startup.

**Why it happens.** A fix is naturally scoped to the file you were reading. Verifying the fix
*reached the artefact* feels like the end of the job — and it is, for that file. Nothing in the
process asks "where else is this written?", so a pattern that exists N times gets fixed once, and the
one remaining copy produces a failure indistinguishable from "the fix did not work".

**The rule.** *Before fixing a defect, search for the shape of the defect, not the site of the
symptom* — grep the distinctive line, count the copies, and fix them at one shared place if you can.
And: **a fix that is confirmed deployed and still fails identically is evidence that you fixed the
wrong copy.** That is a signal to widen the search, not to doubt the fix.

**The general form:** the identical-failure-after-a-verified-fix is a *measurement*, and it points at
duplication. [[L62]] says a failing probe proves nothing until you know the probe works; this is its
counterpart — a fix that provably deployed and changed nothing tells you where to look next.

## L70 — running a test against each copy of a duplicated file does not make the copies agree

**What happened.** `init-or-migrate.sh` — the script that decides whether a database needs initialising
— exists twice in the repo: `docker/scripts/` and `packages/create-app/template/docker/scripts/`. Both
copies had to be fixed by hand for B-15. While wiring the tests into CI, the obvious improvement was to
run the test against *both* copies rather than just one, and that is now done.

It is not enough, and the reason is worth stating precisely. The test asserts **behaviour** — exit codes,
and whether the marker is written. So:

- a copy that has been **broken** fails its run → caught;
- a copy left behind at **older-but-still-correct behaviour** passes its run → **not caught**.

So if someone improves one copy and forgets the other, CI stays green and the stale copy ships into every
app scaffolded by `create-app`. The two copies are byte-identical today (`sha256 838969fe…`) **only
because both were edited by hand**.

**Why it happens.** "Test both copies" *feels* like it closes a duplication hole. It closes the half
where a copy is broken; it does nothing about the half where the copies have diverged. Two files can each
be self-consistently correct and still disagree with each other — and a behaviour test is structurally
unable to see that, because each run only ever looks at one file.

**The rule.** *Duplication needs a comparison, not more test runs.* A parity check is a different kind of
assertion from a behaviour check: it compares the artefacts **to each other** — a `diff`, a hash, or a
sync tool that owns the mirror. If two files are supposed to be identical, something must assert that
they *are*; running the same test twice is not that thing.

**The general form:** before claiming a duplicated pattern is covered, ask what the assertion actually
*compares*. If every check looks at one copy at a time, nothing is comparing them. [[L69]] says fix the
pattern rather than the copy; this is the same defect one layer up — **the guard was also written per
copy.** Tracked as **N-14**.

## L71 — Yarn 4 will not run a script before an install has happened

**What happened.** Adding a CI job for the Docker-free shell tests, the natural step was
`yarn test:docker-scripts`, because that alias in `package.json` is the single source of truth for what
the tests are. The job deliberately needs no dependencies — the tests are pure `sh` — so it was written
without a `yarn install`.

**Measured, in a clean `node:24` container with the repo's real `package.json`, `.yarnrc.yml` and
`yarn.lock`, and no `node_modules`:**

```
Usage Error: Couldn't find the node_modules state file - running an install might help (findPackageLocation)
```

So `yarn run` needs the install state to be present even for a script that touches no dependency. The job
would have dragged a full `yarn install` (minutes, on a large monorepo) into a job that needs none of it.
Fixed by invoking the same files directly with `sh`, and keeping that list in step with the alias.

(A smaller surprise on the same errand: with *no* lockfile at all, Yarn fails even earlier with
`This package doesn't seem to be present in your lockfile`.)

**Why it happens.** "Running a script" sounds dependency-free — it is just a shell command out of
`package.json`. But Yarn Berry resolves the workspace and needs its install state present before it will
dispatch a script, so the install is a precondition regardless of what the script itself does.

**The rule.** *In a Yarn Berry repo, a CI job that runs a yarn script must install first — so if the job
needs no dependencies, call the underlying command directly instead of the alias.* Pick one deliberately
and say so in a comment: the alias is more maintainable, the direct call is far cheaper. You cannot have
both, and this was found by measuring rather than by assuming — the assumption was that `yarn run` is
dependency-free.

## L72 — before adding a gate, find the gate that already exists

**What happened.** The two copies of `init-or-migrate.sh` needed a parity guard ([[L70]]). The obvious
move was to invent one — a new CI step, or a bespoke shell test beside the other docker-script tests.
Neither was needed. `ci.yml` already had a step called **"Check create-app template parity (always,
unfiltered)"** running `yarn workspace create-mercato-app test`, and
`packages/create-app/src/lib/` already held a whole family of `template-*.test.ts` parity guards — one
of which asserts byte-identity between a template file and its monorepo source, in exactly the shape
required.

It surfaced only because a grep for the *concept* ("template-sync") hit the file — after two earlier
greps for the *names I expected* (`"template:sync"`, `"scripts/__tests__"`, `"node --test"`) had missed
it and left me believing no such gate existed. The near-miss was a duplicated CI gate that would have
looked perfectly reasonable and run forever.

**Why it happens.** You decide what the guard should be *before* looking for whether it exists, then
search for the thing you decided on. Searches are built from your own vocabulary, so they tend to
confirm the plan instead of testing it. The existing mechanism is usually named after the **concept** it
serves, not after the words you would have chosen.

**The rule.** *Before building a gate, enumerate the gates that already run.* Read the CI workflow's
step **names** end to end, and list the test files in the directory where a guard of that kind would
live. Only then decide whether to add one. A step literally named "…parity (always, unfiltered)" is not
something to rediscover — it is something to extend.

**The general form:** the same discipline as [[L51]] — *"nothing enforces this"* is a claim about the
repo and needs the same evidence as any other. The honest finding here was narrower and more useful
than the first guess: nothing enforced **this file**, while the mechanism to enforce it already existed.

---

## L73 — the filter decides what you can see, and it answers "nothing" just as confidently as "here it is"

Twice in one deployment session I concluded something was wrong with a file when the file was fine.
Both times the fault was in how I looked, and both times the raw output would have shown it in one line.

**First instance.** A Traefik routing rule in a compose override read
``Host(`a`) || Host(`b`)``. I checked it with `grep "companai.rule"` and saw only
``Host(`a`)``, and spent several minutes building a theory about how Compose's interpolation was eating
the `||`. Dumping the full labels block showed the value was simply **folded across two lines** by the
YAML writer. `grep` prints matching *lines*; the value's second line did not match. The rule had been
correct the whole time.

**Second instance.** Measuring what a request from the public internet carries, I grepped for
`Cf-Connecting:` — with a colon, because I was thinking of the header as "the connecting header". The
real header is `Cf-Connecting-Ip:`. No match. I concluded the visitor's IP never reaches the app, and
started designing a fix for a problem that did not exist. The IP *was* there; I had written a pattern
that could not match it. (The related finding — that `X-Forwarded-For` really is unusable — was true,
and survived.)

**The rule.** *When a search comes back empty, or a value looks truncated, dump the raw thing before
theorising.* Specifically: `cat -A`, or the whole block, or the whole response — unfiltered. A filter
you wrote is a hypothesis about the shape of the data, and if the hypothesis is wrong the filter returns
"nothing" rather than "your hypothesis is wrong". Absence of a match is not evidence of absence; it is
evidence that your pattern did not match.

**Why it keeps happening.** The filter is chosen from the *same mental model* that produced the wrong
belief in the first place, so it confirms the belief instead of testing it. This is [[L46]] wearing
different clothes: the search is built from your own vocabulary, so it cannot surprise you. The fix is
to look at something you did not construct — the raw file, the raw response, the actual bytes.

**The general form:** *never let a filtered view be the evidence for a claim about absence or
truncation.* Both of these were cheap to check and expensive to get wrong — one sent me chasing a
non-existent bug, the other nearly sent me changing a correct configuration.

---

## L74 — `docker compose config` prints every secret in plaintext

Running `docker compose config` to check that interpolation had worked did what it says on the tin: it
rendered the fully resolved configuration. Which means it printed the database password inside
`DATABASE_URL`, plus `JWT_SECRET`, `NEXTAUTH_SECRET`, `MEILISEARCH_API_KEY` and the superadmin password,
into the terminal and from there into the session transcript.

**The rule.** *Treat `docker compose config` as a command that discloses secrets.* It is the right tool
for checking that variables resolve — but resolve them against a throwaway `.env`, or pipe the output
through a filter that keeps only the keys you are actually checking. Never run it against a live
deployment's `.env` and dump the output.

**What made it recoverable.** The database had not been seeded yet, so rotating cost one `rm` and one
re-run of the generator — no data to lose. Had this happened a week later it would have meant either
accepting exposed credentials or rebuilding the database. The lesson is not "be careful"; it is
**check the deployment's secrets against the kit's public defaults before first boot, and do the risky
inspection then** — the moment before seeding is the only moment when a mistake here is free.

**A related measurement from the same session:** `docker compose -f base.yml -f override.yml config`
proved that Compose **replaces** a service's `networks` list rather than merging it. Listing only the
new network in an override silently drops the service off its original bridge, and it then cannot
resolve its own database by name. The override must repeat the base's networks. (This is the opposite
of `environment` and `labels`, which do merge — the difference is worth knowing rather than guessing.)

---

## L75 — a header that arrives at the proxy is not a header the application reads

The platform behind Cloudflare could not tell its visitors apart: the login rate limiter bucketed
everyone together. The instinct was to tune the proxy. Before doing that I traced the value to the code
that consumes it, and the answer changed completely.

Three facts, each measured rather than assumed:

1. **What arrives** — a probe container behind the same Traefik showed `Cf-Connecting-Ip: 151.177.174.17`
   (the real visitor), `X-Forwarded-For: 10.0.1.1` (Traefik had *replaced* it with the docker bridge
   gateway), and `RemoteAddr: 10.0.1.2` (Traefik itself).
2. **What the app reads** — `packages/shared/src/lib/ratelimit/helpers.ts`, `getClientIp`, reads
   `x-forwarded-for` only. It never looks at `CF-Connecting-IP`.
3. **What the app does with the result** — `null` falls back to a single shared key
   (`RATE_LIMIT_FALLBACK_KEY`), so limiting still applies, but globally.

So the real client address **is** present at the application, in a header it does not read. Every
setting of the knob I had intended to tune — `0`, `1`, `2` — yields either no address or the same
internal one for everybody. Tuning the proxy would have been work in the wrong layer, and my first
draft of the override carried a confident comment asserting that depth 2 recovered the visitor's
address. It did not; depth 2 indexes off the end of a one-entry list and returns nothing.

**The rule.** *Follow a value from where it appears to the line of code that consumes it before changing
any configuration.* "The proxy can see it" and "the app can use it" are different claims, and only the
second one decides whether a setting matters. Corollary: a knob that is accepted without complaint, and
plausibly named, may still do nothing at all — `parseTrustProxyDepth` happily accepted `2` and the
behaviour was identical to the default.

**The general form:** the same discipline as [[L31]] and [[L69]] — read the consumer, not the
transport. And when the honest answer turns out to be "this knob is a no-op here", the right move is to
**remove it and say so**, not to leave it set at a value that looks deliberate. A setting that does
nothing is worse than an absent one, because it tells the next reader a story that is not true.

---

## L76 — a public address is not an open door, and DNS lives where the name is owned

Two questions arrived together, both of the form "can we just add a thing to make this work?":
*does a DNS server on the VM help?* and *can many domains share one address?* The second is a plain
yes. The first is a no, and answering it well required correcting an assumption that earlier documents
in this repo had already written down.

**What was assumed.** "This VM has no public address" — repeated in the manual, in the architecture
diagram, and in the deployment runbook's not-proven list. It reads as a fact about the network. It is
really a fact about the *VM*, and it hid a second, different fact underneath it.

**What was measured.** The VM's own address is `172.28.50.2` — private, and it exists only inside the
laptop's Hyper-V Internal switch. But the *network* the laptop sits on has a real public address,
`151.177.174.17`, confirmed by three independent services asked from inside the VM (`api.ipify.org`,
`ifconfig.me`, `ipinfo.io` — all agree), with reverse DNS `c151-177-174-17.bredband.tele2.se` and
`ipinfo.io` placing it in Malmö, Sweden, AS1257 Tele2. It is **not** CGNAT: CGNAT would live in
`100.64.0.0/10`, and this address does not.

That measurement alone would have flipped the conclusion from "DNS cannot point at us" to "DNS *could*
point straight at us". It would have been wrong to stop there, because it answers a different question
than the one that matters. **Having a public address and being reachable from the internet are two
different facts**, and only the second one decides whether a DNS record pointing at that address does
anything useful.

**The measurement that decides it.** Port 80 on `151.177.174.17`, probed from three independent vantage
points *outside* this network: `api.hackertarget.com`, `api.allorigins.win`, `r.jina.ai`. All three failed
to connect. The laptop's own attempt failed too, but that one proves little by itself — the laptop sits
behind the *same* router, and hairpin routing commonly fails even when a forward does exist. The outside
hosts are what decide it; the local test only corroborates. The router owns the address and forwards
nothing inbound. So a record pointing at it yields a name that resolves and a site that does not load —
the half-finished domain, produced by measuring the wrong layer and believing it.

**Why the DNS-server idea cannot work here, stated once.** DNS is the internet's phone book. To be the
phone book for a name you must tell the registrar "look this name up *here*", and *here* must be
reachable by everyone. The VM's only address is `172.28.50.2`, which exists inside one laptop. Listing
it at the registrar would direct the whole internet at an address it cannot reach. Plesk shipped a DNS
server because Plesk was often the authoritative server for its own zones, on a host with a real public
address; neither condition holds here. Installing one is possible and buys nothing but a thing to keep
alive.

**And the ownership fact that decides the Cloudflare path.** Cloudflare's own docs, not a blog: a
*primary (full) setup is the most common and the only one available for Free or Pro plans*, which means
the domain's nameservers must move to Cloudflare. The setup that keeps the registrar's nameservers
("partial / CNAME") is Business and Enterprise only. So "I have many domains on GoDaddy" is a yes for
sharing one address, and simultaneously a *two-step, two-place* job per domain — add to Cloudflare, then
move nameservers — because the phone book and the site are not in the same place.

**The rule.** *Reachability is measured from outside, never inferred from an address.* An address that
looks public says nothing about whether a packet gets in; the router in between is the thing that
decides, and it is not visible from the machine. Ask an outside host to connect, from more than one
outside host.

**The general form:** the same discipline as [[L73]] and [[L75]] — *the thing you can see is not
necessarily the thing that acts.* Here it was an address that existed without admitting anything, in
front of a name that resolved without reaching anything. Two layers, two truths, and the convenient one
was the one already written down. Corollary: when a document says "X has no public address", check
whether it means X, or the network X sits on — the two support opposite conclusions, and only one of
them is the question anyone actually asked.

---

## L77 — an empty variable is a value, and it will be sent

Building the "site in a directory" proof, I wanted to check that the platform's own hostname still
routed through Traefik. I extracted the hostname like this:

```bash
TUNHOST=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-site.log | head -1 | sed 's|https://||')
curl -H "Host: $TUNHOST" http://127.0.0.1/
```

The log had moved — `grep` printed `No such file or directory` to stderr, returned nothing on stdout, and
`TUNHOST` became the empty string. The curl then sent **`Host: `** with nothing after it, Traefik found
no router, and returned `404` with a 19-byte body. Which is exactly what a genuine routing regression
looks like.

I was one step from writing down "the platform's public hostname no longer routes" — a false alarm about
a working system, produced entirely by my own broken lookup. Re-run with the hostname spelled out by
hand, the same request returned `307` with 474,333 bytes.

**The rule.** *An empty string is not the absence of an answer — it is an answer, and it flows into
whatever you feed it.* When a shell variable is built from a command substitution, a failure in that
command produces `""`, and `""` is silently valid as a header, a path segment, a filename or a filter.
The downstream tool cannot tell "the lookup found nothing" from "the lookup never ran", so it reports on
the empty value as though it were real data.

**Guards that cost nothing:**

- `set -u` in any script, so an unset variable is an error rather than `""`.
- Check the source exists and the substitution is non-empty before using it:
  `[ -n "$TUNHOST" ] || { echo "hostname lookup failed"; exit 1; }`
- Prefer reading the value from a place you know exists. Here the authoritative source was the running
  container's own label (`docker inspect … .Config.Labels`), not a log file in `/tmp`.
- When a result surprises you, **re-run it with the input written out literally** before believing it.
  A hard-coded value and a computed one are different experiments.

**The general form:** the same family as [[L73]] — a filter that answers "nothing" as confidently as
"here it is". L73 was about a search pattern that could not match; this is about its output being used
as an input. Both produce a confident, specific, wrong reading. The tell is the same: the answer arrived
too easily, and nothing in it referenced the thing you were actually asking about.

---

## L78 — `pkill -f` matches its own command line, and will kill you

Cleaning up a proof tunnel, I ran this over SSH:

```bash
ssh ramzi@172.28.50.2 "sudo pkill -f 'http-host-header demo.test'; sleep 2; pgrep -af cloudflared"
```

The command returned **no output at all** — not even the parts that ran before the `pkill`. The reason:
`pkill -f` matches against the **full command line of every process**, and the shell running my script
had a command line that *contained the literal string* `http-host-header demo.test`. So `pkill` matched
its own parent shell and killed the session that was executing it. The tunnel did die — and so did the
output, the exit code, and any chance of seeing what happened next.

**The rule.** *A pattern used to find processes is also matched against the process doing the finding.*
Any `-f` (full-command-line) match on a string that appears in the command you are currently running is
self-referential, and the self-match is usually fatal because it is the parent.

**Fixes, cheapest first:**

- Break the literal with a character class so the pattern no longer matches its own text:
  `pkill -f 'http-host-header demo[.]test'` — the regex still matches the target, but the string in the
  command line no longer matches the pattern.
- Match something narrower than the whole line — a PID from `pgrep`, or an exact process name.
- Or avoid the shell entirely: `systemctl stop <unit>` for anything service-managed.

**The general form:** this is the same trap as a `grep` whose pattern appears in its own output file, or
a build that scans a directory it is writing into. Whenever a search and its subject share a namespace,
the search will find itself. Ask "could this pattern match the thing running it?" before running it —
and when a command returns *nothing at all*, including output you expected to appear before the
suspicious line, suspect the process was killed rather than that it silently succeeded.

---

## L79 — the scheme in a domain field is not cosmetic; it picks which listener the router binds to

Writing the step-by-step guide for putting a domain on a site, I told the owner to type
`https://shop.yourdomain.com` into Coolify's **Domains** field, on the reasoning that `https://` is what
asks for a real certificate. That advice was wrong, and reading the running source showed why.

**What the field actually does.** `fqdnLabelsForTraefik` in `bootstrap/helpers/docker.php`, read from the
running Coolify 4.3.23, branches on the parsed scheme:

| You type | Labels produced |
|---|---|
| `https://host` | router on **`entryPoints=https`**, `tls=true`, `tls.certresolver=letsencrypt` — **plus** an http router whose middleware is `redirect-to-https` when Force HTTPS is on |
| `http://host` | one router on **`entryPoints=http`**. No TLS, no redirect. |

The scheme is not decoration. It selects the **listener** the router is attached to, and Traefik's
entrypoints are separate sockets. A router on `entryPoints=https` is bound to port 443 and will never
match a request that arrives on port 80.

**Why it mattered here.** Every site on this VM is reached through a Cloudflare tunnel that connects to
`http://localhost:80`. So only the **http** router is reachable. Typing `https://` produced two failures
at once:

1. **A redirect loop** (with Force HTTPS on): tunnel → port 80 → `301` to `https://…` → Cloudflare →
   browser → back through the tunnel → port 80 → `301` again, until the browser reports *too many
   redirects*.
2. **A doomed certificate job**: `tls.certresolver=letsencrypt` makes Traefik attempt issuance, which
   cannot succeed because the HTTP-01 challenge needs the name reachable from the internet — and nothing
   reaches this VM inbound. The certificate was never needed: **Cloudflare terminates the TLS the visitor
   sees.**

The correct value is `http://`, which reads as a downgrade and is in fact the only configuration that
works: the public padlock comes from Cloudflare, and the origin hop is plain HTTP on port 80.

**The rule.** *When a value looks like a cosmetic prefix, find the code that parses it before choosing
one.* A scheme, a trailing slash, a leading `www`, an `@` — these read as presentation and are frequently
used as **branch selectors** in the layer that consumes them. Here `https` vs `http` decided which
socket the route lived on, which decided whether the request could ever arrive.

**How to check it, rather than reason about it.** Read the function from the **running** container, not
from documentation or memory:

```bash
docker exec coolify sh -lc \
  'grep -n "function fqdnLabelsForTraefik" -A 60 /var/www/html/bootstrap/helpers/docker.php'
```

**The general form:** the same discipline as [[L75]] — follow the value to the line that consumes it.
The specific trap here is that the two settings differ by one character, are both accepted without
complaint, and the wrong one *fails at request time in a different component* (a redirect loop in the
browser, an error in Traefik's ACME log) rather than at the moment you type it. Corollary: when a
control panel offers a free-text field with a scheme in it, assume the scheme is load-bearing until the
parser proves otherwise.

---

## L80 — A line-number citation means nothing without the tree it came from

**Caught 2026-10-05, by a separate hostile audit pass — not by re-reading my own note.**

The Paperclip + Hermes study's synthesis cited `acp_adapter/session.py:544` for the claim *"restore
loads every message with no limit"*. The citation was taken from the sibling project's dossier, where it
is correct. But that same file exists in **two** Hermes trees on this machine:

| Tree | The file | Line 544 |
|---|---|---|
| `library/ai/hermes-agent-main/` (581 lines) — **the tree the study names as its source** | `acp_adapter/session.py` | `"credential_pool": runtime.get("credential_pool"),` — **unrelated**. The restore is at **line 474** |
| `aissistant-package/hermes/` — the sibling's vendored copy | `acp_adapter/session.py` | `history = db.get_messages_as_conversation(` — **correct** |

So the citation was right in one tree and wrong in the other, and the study pointed at the wrong one.

**The rule.** *A `file:line` citation is only complete when it names which checkout the line number
belongs to.* The moment the same file exists twice — a vendored copy, a fork, a zip extract, an older
revision, a `node_modules` copy — the line number is a **different claim in each**. A bare path reads as
"the obvious one", and the obvious one is not always the one you measured.

**How to check it.** Resolve the path from the document's own base directory and read the line:

```bash
sed -n '544p' library/ai/hermes-agent-main/acp_adapter/session.py
```

If the line does not say what the sentence claims, the citation is broken — even though it was copied
from a document where it worked.

**The general form:** the same family as [[L3]] — *the measurement is only valid against the artefact
you actually named.* When a number is inherited from somebody else's document, you have measured
nothing until you re-take it in your own tree.

---

## L81 — A count can silently exclude the very thing it sits above

**Caught 2026-10-05, same audit.**

I wrote, in the handover document: *"`library/` holds **3,121 markdown files**."* That was a real
measurement, correctly taken. It was also wrong. On the same day I had created
`library/ai/source-docs/` — 318 markdown files — **inside `library/`**. The 3,121 was
`find library -name '*.md'` *minus* that folder. The true total was **3,439**. The number measured a
different thing than the sentence named.

Worse, the same figure appeared in **three** places in that file (2,440 twice, 3,121 once), and the
sweep updated only the ones I was looking at — so the document then disagreed with itself.

**The rule.** *Measure with the exact command that matches the words you are about to write, and
re-measure every copy of the figure, not just the one in front of you.* If the sentence says "library
holds", the command must say `library` and nothing else. A `-not -path` filter, a `-maxdepth`, or an
exclusion is a **different claim** and needs different words.

**How to check it.**

```bash
find library -name '*.md' | wc -l          # the words say "library", so measure "library"
grep -rn '2,440\|3,121' --include=*.md .   # find the copies you forgot
```

**The general form:** this is the project's oldest recurring defect — *seven wrong figures in two days,
every one from measuring a different thing than the claim named.* It keeps happening because the
measurement *succeeds*: you get a number, it looks authoritative, and the only thing wrong is that it
answers a slightly different question.

---

## L82 — "Exactly one" is an enumeration, not a feeling

**Caught 2026-10-05, same audit.**

The synthesis said *"**exactly one item is open for the owner**"* and repeated it three times, because it
read well and felt true. It had checked the obvious place. A hostile pass then walked every section and
found a second candidate — a section instructing *"decide one mental model for frequency and document
it"*, stamped as a lesson rather than as a question.

The claim was over-stated. What was actually meant was *"only one item is **genuinely** yours"* — and
proving that means walking the whole set and classifying each member, not sampling it.

**The rule.** *"Only one", "never", "always", "none" and "the only one" are enumerations. Either walk
the entire set and say how many you examined, or soften the claim.* A universal statement is the easiest
kind to write and the easiest to falsify.

**How to check it.** Count it, and put the count in the document:

```bash
grep -c 'OPEN — needs you' the-file.md    # if the claim is "one", the count must be 1
```

**The general form:** the same discipline as [[L1]] — *a confident label is not an inspection.* "Exactly
one" is a label. The inspection is the walk.

**And the fix is worth copying.** When the audit found the second candidate, the honest repair was not to
promote it to a second question but to state the classification rule and name the items that were
**deliberately not** the owner's. A claim of "one" is defensible only when it comes with the list of
things it is a claim *about*.

---

## L83 — a file that exists is not a mechanism that runs

**Caught 2026-10-06, during the core-module audit.**

The claim was that the mutation-guard engine was *live and auto-wired for every module*. It rested on
the fact that the app imports a generated registry: `apps/mercato/src/bootstrap.ts:44` imports
`guardEntries` from `.mercato/generated/guards.generated.ts`, and the CLI generator has a step that
scans each module's `data/guards.ts` and populates it. Every part of that sentence is true — and the
mechanism was dead. The running file said:

```ts
export const guardEntries: GuardEntry[] = [];
```

**Zero entries.** The generator scans `data/guards.ts`; only **three** modules ship one, and none of
them were in the registry. The guards that actually ran did so through hand-written per-route calls on
roughly four to six routes. So "the registry exists and is wired" was true, and "guards run for every
module automatically" was false. This is **D0** — it now leads Phase 0 of the build order.

**Why the first instrument missed it.** The evidence offered was the *import* — the wiring diagram. That
proves the door is installed, not that anything walks through it.

**What to do instead.** Measure the **behaviour**, not the structure. Two counts that share no failure
mode:

1. Read the generated artefact and count what it actually contains.
2. Find something that would only agree if the claim were true — here, the generator's **own test**,
   which asserts that a module shipping `data/guards.ts` *must* appear in the output. When the registry
   is empty and a module ships a guards file, the test's premise is violated. That second route is what
   turned a suspicion into a finding.

**The general form:** *"it exists" is not "it is built."* The same sentence is the owner's whole reason
for asking: *"we can't compromise core architecture just because something already exists."* When you
report something as built, say **what you ran** and **what it produced** — not what file imports what.

---

## L84 — counting empty folders is not counting tests

**Caught 2026-10-06, the same audit, by a second pass.**

A sub-agent was asked to inventory 34 modules and report, per module, the number of tests. It reported
**"0 unit tests"** for every module it named. The second pass counted the actual files and got
**15, 21, 5, 12, 11, 13, 7, 9, 14** for the same modules — a completely different answer.

**What went wrong.** The agent looked at a directory tree, saw that the test sub-directories it checked
were empty, and generalised. The tests were not in the sub-directories it looked at; they were one level
up. It measured **the wrong place** and reported it as **the wrong quantity** — exactly the failure the
owner has now caught seven times in two days: *measuring a different thing than the claim names.*

**What to do instead.** Count **files that match the thing you are counting**:

```bash
# the count is files whose name says "test", not folders that might contain tests
find packages/core/src/modules/<mod> -name '*.test.ts' -o -name '*.spec.ts' | wc -l
```

Then spot-check one module by hand and confirm the number is real before trusting the sweep.

**The general form:** [[L82]] said *"exactly one" is an enumeration, not a feeling.* This is its twin:
**a count is an enumeration too.** State the predicate you counted, and prove it on one member, or the
number is a guess wearing a number's clothes.

**The good news, worth recording.** Both defects in this audit were caught by the **same discipline** —
a second pass whose only job was to break the first. Neither survived contact with an independent
instrument. That is the loop working as designed.

---

## L85 — a test that mocks the layer you are changing proves nothing

**Caught 2026-10-06, while migrating `workflows` off the deprecated guard resolver (D2-wide).**

The work was: replace a deprecated resolver call inside a per-module wrapper
(`beginWorkflowsMutationGuard`) with a registry call, then prove the change by **mutation** — disable
the block path and the tests must go red; neuter the after-success and they must go red too.

**Both mutations left the suite green.** The tests mocked the **module wrapper** — the exact file being
changed — so the mutated line never executed. A green suite was read as "the guard works"; it proved the
mutation was invisible, which is the opposite.

**Why it happens.** When you inherit tests for a piece you are about to change, the instinct is to keep
the existing mock and re-point the assertions. But the mock target *is* the subject. If the test's
`jest.mock` names the file you are editing, the test can never fail for the reason you care about.

**What to do instead.** Stub **only the layer underneath**, and let the layer you are changing run for
real:

```ts
// WRONG — the wrapper is the thing under test; mocking it makes your mutation a no-op
jest.mock('../mutation-guard', () => ({ beginWorkflowsMutationGuard: jest.fn(...) }))

// RIGHT — stub the registry call; the module wrapper runs for real
jest.mock('@open-mercato/shared/lib/crud/route-mutation-guard', () => ({
  runRouteMutationGuards: (...args: unknown[]) => runRouteMutationGuardsMock(...args),
}))
```

**The rule.** *Before you trust a mutation proof, name the file the mutation edits and confirm the test
actually executes it.* A mock that severs the path between the test and the mutated line turns every
"RED" into a guaranteed green — and a guaranteed green is the most convincing lie in the toolkit. This is
[[L21]] (*a control that holds the mistake fixed proves nothing*) one layer down: a test that skips the
changed code holds nothing at all.

**The general form:** a proof must exercise the thing that changed. If it exercises a stand-in for that
thing, it is a proof of the stand-in.

---

## L86 — a tracked count is a claim about the artefact, not a running total you trust

**Caught 2026-10-06, across the seven-module `D2-wide` guard-resolver migration.**

A platform-wide migration tracked a count that had to tick down — `198 → 177 → 161 → 151 → 142 → 134
→ 126` deprecated call sites. Each tick was quoted in the plan, the tracker item, the handover and the
journal. Two failures recurred, both in the number itself:

1. **The "before" was carried forward, not re-derived.** The "before" on module N is the "after" of
   module N−1; a wrong figure propagates silently. Fixed by re-running the **same** classifier against
   the clean tree (`git stash push -u`; classify; `git stash pop`) and requiring the delta to equal
   **exactly this module's** call count.
2. **The two counting tools disagreed by one (`126` vs `127`).** The script stripped only *trailing*
   `//` comments, so it still counted lines whose content *begins* with `//`, `*` or `/*` (JSDoc
   continuations). Both tools must drop leading-comment lines.

There was also the twin of [[L84]] in the **same** migration, one level up: a *file* count of `55` came
from an ad-hoc command that used a **different comment rule** than the two agreed methods, so it was not
comparable to them. Re-running the **agreed** classifier gave `52`, and the delta then matched the three
repointed files.

**Why it happens.** Once a number is written it reads as measured, and the next tick is tempting to
compute rather than measure. A number that is only ever *incremented* is a summary, not an observation —
the same defect as [[L49]], in slow motion over seven commits.

**What to do instead.** For every tick: re-derive the "before" from the tree with the **agreed** tool,
measure the "after" the same way, and check `before − after == this module's count`. If the arithmetic
does not match the artefact, the artefact is right and the number is wrong. Two tools, one of them a
different program, must agree.

**The companion fact — a count can be right and still mislead.** A module reaching **0** on this count
is *not* "the module is guarded". The count only sees routes that *used to call* the deprecated
resolver; a route that calls **no guard at all** is invisible to it. Measured at the first module
(`workflows`, 2026-10-06): `workflows` **10 of 19** (the first count said 13, which was wrong; it
counted files), `inbox_ops` **10 of 14**, `perspectives` **0 of 3** — all since closed (the sweep is
now **0** across all 35 enabled modules). So the scope sentence goes
**either way** and must be measured, not assumed — *"0"* is a claim about the resolver, never about
coverage ([[L48]]).

**The general form:** a number is an observation with a date, a tool and a predicate. Re-take the
observation every time you quote it, and never let a count stand in for the property you actually care
about.


---

## L87 — a migration plan's per-item arithmetic is a guess until the source is read

**Caught 2026-10-06, migrating `translations` in `D2-wide` — the eighth module.**

The queued task said the module had **"6 deprecated guard calls in 2 files"** and, in the plan's
mapping table, implied **4 guard objects** — the same shape as the seven modules before it, where
"calls → objects" had usually been roughly half. Reading the source showed the routes collect **one
guard object each**, and that the two "halves" were **two different routes**, not one route with two
verbs: it is **2 objects**, and the repo-wide count drops **6**, not 4.

The plan's number was not random. It was derived from a **pattern** — earlier modules' ratios — rather
than from this module's code. That is exactly the failure mode a plan is most likely to have: the
earlier rows were right *because they were measured*, and the later row *looked* consistent with them
without being measured at all.

**The companion finding, which is worse.** The plan's step said to "repoint the route files", and the
sweep had been described as walking `route.ts` files. **`put/locales.ts` is not a `route.ts`** — it
exports its handler as the module **default** with a `metadata.path`. A sweep globbing only for
`route.ts` would have skipped it, reported the module clean, and left a live write route on the
deprecated resolver — a false green in the *safe-looking* direction, which is the direction nobody
re-checks. Found only by walking **every `.ts` file under `api/`**.

**Why it happens.** A plan written from a count is cheaper to produce than a plan written from the
source, and it is indistinguishable from one at a glance. Both failure modes above produce a plan that
*reads* as measured.

**What to do instead.** Before executing a planned item, re-derive **that item's** numbers from its own
files — not from the plan's table, and not by scaling an earlier module. For this class of work the
enumeration must be **by file content** (does this file export a write verb?), never by file **name**.
Then check the tick: `before − after == this module's real count`.

**The general form:** an inherited estimate is a hypothesis. The plan tells you *what* to do; only the
source tells you *how much*. Read the thing you are about to change, count it yourself, and let the plan
be wrong out loud rather than silently.

## L88 — an empty test run exits 0, so a path that matches nothing looks like a pass

**Caught 2026-10-06, while critic-passing the `translations` `D2-wide` migration.**

The suite's own directory is named `[entityType]/[entityId]`. Passing that path to Jest **unescaped**
gives:

```
npx jest --config jest.config.cjs 'src/.../[entityType]/[entityId]/__tests__/mutation-guard.test.ts'
→ No tests found, exiting with code 0
```

Jest reads `[entityType]` as a **glob character class**, matches nothing, and — this is the trap —
**exits 0**. Read quickly, "no failures, exit 0" is a pass. It is the opposite: **nothing ran.**

Instead of finding this, I nearly recorded a *false green* against a mutation I had deliberately planted
to be caught. Two mutations in a row "passed" and that should itself have been the alarm: a mutation
that changes behaviour **cannot** leave a biting suite green. The signal was there and I read it as
success.

**The general form — a runner that reports "nothing to do" as success is indistinguishable from a
runner that reports success.** Any tool whose empty-input behaviour is exit 0 must be checked for
**work done**, not just exit status. The safest habit for a path containing `[ ]`: use
`--runTestsByPath`, which takes the literal path. Failing that, escape the brackets, or assert the
runner reported a non-zero test count.

**What to do instead.** When a mutation leaves a suite green, **do not record the proof** — first
re-run the exact same invocation and read the **test count**. A bite that fails to bite is evidence
about the *invocation* before it is evidence about the *test*. And when a result is surprising in the
reassuring direction, that is the moment to look hardest, not the moment to tick the box.

**Check it with a count, always:** `Tests: N passed` where N is the number you expected. Zero tests
passing is not a passing suite.

## L89 — a plan that inherits a count is right by luck, not by method; a `route.ts` glob is not a route audit

**Caught 2026-10-06, migrating `planner` in `D2-wide` — the ninth module, one after L87.**

Two findings, and the second is the important one.

**1. The plan's number can be right — and that changes nothing about L87.** The queued task said
`planner` was **4 calls / 2 files → 2 guard objects**, and walking every `.ts` file under `api/`
confirmed exactly that. This is the **first module in the sweep whose figure survived re-measurement
unchanged** — and it is recorded *because* it is the exception, not because it validates the method. The
rule from L87 is "re-derive the figure", not "the figure is wrong". A plan that happens to be right is
right by luck; the re-derivation is what makes it knowledge. Had this module been the first one measured,
the earlier modules' errors would have looked like anomalies instead of the pattern.

**2. The named-export trap recurred, and it is now confirmed as a class, not a one-off.** `planner`'s
two write routes are **`availability-weekly.ts`** and **`availability-date-specific.ts`** — neither is a
`route.ts`. Both export a **named** `POST` with `metadata = { POST: { requireAuth: true } }`. A sweep
that globs only for files named `route.ts` finds **neither file**, and reports the module clean while
leaving **both** live write routes on the deprecated resolver.

That makes two modules out of nine with a write route a name-based scan cannot see:
`translations/put/locales.ts` (L87) and `planner`'s two files. **Two independent confirmations make it a
class.** The general rule, stated once and to be applied every time: **enumerate a module's write routes
by what the file *contains* — does it export `POST`/`PUT`/`PATCH`/`DELETE`, by name or as default? —
never by what the file is *called*.** In this codebase both conventions are in live use (`route.ts` and
named exports with a `metadata` object), so the name is not a signal at all.

**What it would have cost.** The failure is silent and reads as success: the deprecated-call count for
the module would show 0 (the routes are not scanned), the module would be marked done, and two live
writes would still bypass every registry guard. Nothing in the test suite or the count would catch it,
because both would be measuring the files that were found.

**How to check it, concretely.** After migrating a module, confirm the migration's arithmetic against
the **files**, not the plan: `before − after == this module's real count`, and the file count must fall
by the number of files actually repointed. Here: 120 → 116 calls (−4) and 47 → 45 files (−2), matching
the two routes changed.

## L90 — a small `D2-wide` number can sit on top of a large `D2-gap`; a claim written into code must be measured, not remembered

**Caught 2026-10-06, migrating `auth` in `D2-wide` — the eleventh module.**

Three findings, and the first two are the ones that would have cost something.

**1. The plan said "1 file" and that was true — and it was the single most misleading true number in the
sweep.** `auth` had **2 deprecated calls in 1 file**, exactly as the plan said. But the module has **18
files exporting a write verb**. "One file" invites the reader to conclude the module is nearly clean. The
opposite is true: **only 3 of the 18 are guarded at all** — `users/resend-invite` (the migrated route),
and `users/route.ts` + `roles/route.ts` (guarded via `makeCrudRoute` → `collectAndRunGuards()`). The
other **12 resource-write verbs across 10 files call no guard whatsoever**: `users/acl` (PUT),
`roles/acl` (PUT), `sidebar/preferences` (PUT, DELETE), `sidebar/variants` (POST),
`sidebar/variants/[id]` (PUT, DELETE), and five `authority/*` routes (POST each).

That is **`D2-gap`**, not `D2-wide`, and `auth` carries the **worst ratio measured** — worse than
`workflows` (10/19 — first counted as 13, wrong) and `inbox_ops` (10/14), which previously looked like the bad cases. **The general
rule:** a module's `D2-wide` count measures only the calls that *used the deprecated resolver*. It says
**nothing** about the writes that never called any guard. **Measure both, every module, or the small
number hides the big hole.** The `D2-wide` sweep is a tidy-up; `D2-gap` is where writes are actually
unprotected, and a module can be "done" on the first while being worst-in-class on the second.

**2. A wrong claim written from memory was caught only because it was checked against the walk.** The
wrapper header's **first draft** documented the `D2-gap` inventory — and named a **different, wrong**
set of files. It listed `users/route.ts` as unguarded (it is guarded, via `makeCrudRoute`); it counted
`authority/projects` as a write route (**it exports GET only**); and it miscounted the `sidebar/variants`
verbs. Every one of those was plausible and none was measured. The correction came from walking the
files and reading each export — the same walk that produced the right answer, run *after* the wrong one
had already been written into the source.

**Why this is a lesson and not just a typo:** the claim lived in a **JSDoc block in production code**,
where a future reader treats it as documentation. A wrong note in a comment is not caught by the
compiler, the tests, or the count — it is caught by nothing, and it is read by the person who came to
that file precisely because they do not know the answer. **The rule:** a factual claim about the
codebase written into a comment, a doc, or a commit message is a **measurement**, and it must be taken
from the artefact before it is written — never recalled. If it cannot be measured at the time, say
"unverified" rather than a number.

**3. On the migrated route itself, the guard is not the protection.** `resend-invite`'s real defence
against touching a foreign user is `assertActorCanAccessUserTarget()` (`lib/grantChecks.ts:130`), called
**before** the guard. The migration is still correct — it removes the **bypass** and means the module's
next guard is enforced — but a reader who assumed the mutation guard was the security control would
over-read the change. **Name the control that actually holds, or the change is credited for work it is
not doing.**

**How to check it, concretely.** After migrating any module, run two counts, not one: (a) the deprecated
call sites, and (b) a walk of every write verb (does the file export `POST`/`PUT`/`PATCH`/`DELETE`?) with
its guard mechanism — `makeCrudRoute`/`collectAndRunGuards`, the module wrapper, or **nothing**. Report
(b) beside (a) in the progress note. If a header or note names a file as unguarded, that name must have
come from step (b) on the same day.

---

## L91 — a **comment** can fail a code guard: scanners that regex raw file text do not strip comments

**What happened (2026-10-06, the `directory` migration).** The new wrapper
`directory/api/mutation-guard.ts` carried a header JSDoc that *explained*, in prose, that
`organization-edges` PATCH calls `enforceCommandOptimisticLockWithGuards()` and that the wrapper's own
route uses the synchronous `enforceCommandOptimisticLock()`. Both are true statements **about other
files**. But `src/__tests__/optimistic-lock-command-coverage.test.ts` scans every source file with
`readFileSync(...)` and tests the raw text against `/enforceCommandOptimisticLock\s*\(/` — **it never
strips comments**. So the wrapper was reported as a *direct call site that bypasses the record_locks
seam*, and the full suite went **1 suite / 1 test RED** — caused entirely by a comment, in a file that
calls neither helper.

**The trap underneath the trap.** The first fix attempt made it worse: the explanatory comment was
rewritten to *quote the regex*, and the quote itself contained `enforceCommandOptimisticLock(` — so the
"fix" reproduced the failure. A comment that documents a scanner is subject to that scanner.

**The rule.** Before writing a symbol's **call syntax** (`name(`) into a comment, a doc, or a test
fixture, check whether any code guard regexes raw file text for it. If one does, **name the symbol
without the parentheses** and say why in the comment (this is what the `directory` wrapper now does).
**A green full-suite run is the only proof a code guard is satisfied** — a targeted test run of the
changed module would have missed this entirely, because the guard lives in `src/__tests__/`, not in the
module. **Always run the whole suite after adding a file whose comments name other helpers**, and prefer
`grep -rn "<symbol>("`-style checks to confirm the name does not appear in a scanned position.

**Corollary for counts (same family as L90).** Several of this repo's guards measure by **text**, not by
AST: the optimistic-lock coverage guard, and the D2-wide count's `grep -vE ":[0-9]+:\s*(//|\*|/\*)"`
filter which drops comment lines. Text-based measurement is cheap and auditable but it reads **prose as
code**. When a count or a guard looks wrong, the first question is not "is the code wrong?" but "is the
instrument reading a different thing than the claim names?" — which is the same failure mode as L90, one
layer down.

## L92 — `git grep <rev>` prefixes the output with the revision, and a `split(':',2)` classifier then reads every match as one file

**What happened (2026-10-06, proving the `feature_toggles` count).** To re-derive the "before" figure I ran
`git grep -n -e "validateCrudMutationGuard(" -e "runCrudMutationGuardAfterSuccess(" d682c09 -- packages apps`
and piped it through the *same* classifier used for the working tree. The working tree's `git grep` output is
`<path>:<ln>:<content>` — **3 fields**. But when a **revision** is given, git prints `<rev>:<path>:<ln>:<content>`
— **4 fields**. The classifier did `parts = line.split(':', 2)`, so `parts[0]` became the **revision** and the
whole run collapsed to a single pseudo-file: it reported **`sites: 139 files: 1`** for a tree that actually held
**108 sites in 41 files**. I nearly wrote "the docs' before-count is wrong by 31" — when the error was in my
probe.

**Why it is dangerous.** It fails *toward a plausible number*. `139` is not absurd, `files: 1` is odd but
easy to explain away ("maybe it's the concatenation"), and the wrong number is the one that would have
**rewritten six documents**. This is the exact shape recorded in L90 and in the skill's "suspect your own
probe" note: a probe written as a shell one-liner is a suspect; the agreed classifier is the reference — but
the classifier must be **fed the same field layout** in both runs.

**The rule.** When a classifier is reused against **different output shapes** (working tree vs `git grep <rev>`,
single-file vs recursive, `grep` vs `git grep`), **assert the field count first** and print the raw values
behind the result before believing the total. For revisions, split with `maxsplit=3` (`<rev>:<path>:<ln>:<content>`),
or strip the revision with `sed 's/^[^:]*://'` first. **A classifier that runs clean is not a classifier that
ran on the right thing** — the same "measured a different thing than the claim names" failure that has now
produced wrong numbers in this project more than once. The corrected probe (prefix-aware) gave
**108 / 41 before, 106 / 40 after — delta exactly the module**, which is what the docs already said.

## L93 — a defence you added but never tested is a defence a refactor may delete; the mutation proof is what tells the two apart

**What happened.** Building `SD-2` I protected a core role on **three** layers: the route, the command,
and a new `refuse?` predicate on the shared `DataEngine.deleteOrmEntity` (the store choke point). The
route and command checks were each covered by their own suite. The store predicate was **not** — every
test that reached the store also passed through the command's own check first, so silencing the predicate
changed **no test result**. The 6-mutation proof caught it: **M4 (`if (false && opts.refuse)`) went GREEN**
(16/16 core, 12/12 shared) while the other five went RED. The hook was **decorative** — a future refactor
could have deleted the option argument and the whole suite would still have reported green.

**Why it is dangerous.** A layer added "for safety" reads as *more* protection, so it raises confidence
in proportion to how much it does **not** do. The failure is silent, and it is exactly the shape a human
review misses: the code *is* there, it *is* called from real call sites, and it *is* plausible. Only a
mutation that **removes** it shows whether anything notices.

**The rule.** For every layer you add to a defence-in-depth stack, the proof must include a mutation that
**disables that specific layer** and shows a test goes RED. Layers that share a test are one layer for
proof purposes. When a layer's mutation stays GREEN, do **not** rationalise it ("the earlier layer catches
it anyway") — either **add the test that makes it bite**, or **delete the layer on purpose** and say so.
A defence with no test is not a defence; it is a comment that compiles. (Here: closed by
`shared/src/lib/data/__tests__/deleteOrmEntity.refuse.sd2.test.ts`, 5 tests; M4 then failed 3.)

*Cross-ref: L21 (a control that holds the mistake fixed proves nothing), L85 (a test that mocks the layer
you are changing proves nothing).*

## L94 — a suite that passed for you and failed for the critic is not "green"; it is "green on your run", and the claim must say which

**What happened.** I ran the full `packages/shared` suite, saw the tail, and wrote into the work record
that it was **201 suites / 2385 tests, 0 failures**. A separate hostile-critic agent then ran the **same**
suite and got **1 failed / 8 failed** — the `dynamicLoader.tsconfig.test.ts` suite (a Windows
`spawnSync … EBUSY` host failure, already catalogued as **CC-19**). It reproduced the 8 failures on a
**stashed clean tree**, so the failure was pre-existing and unrelated to my change — but my claim as
written was false.

**Why it is dangerous.** "Green" is a claim about a *run*, not about *code*. A flaky-or-environmental
suite makes the same tree produce different verdicts on different runs, so a claim stated as a bare fact
("the suite passes") silently asserts more than the measurement supports — and the next reader trusts it
and does not re-run. The trap is worse when the failure is **pre-existing**: the temptation is to wave it
away ("not mine"), which is right about *causation* and wrong about *the claim*. The claim still said
"0 failures".

**The rule.** When a suite is known to be flaky or host-failing, the claim must read **"green on this run
(N suites / M tests, 0 failures); it fails X on other runs for the known reason, catalogued as CC-n"** —
never a bare pass. State the measured figure **with its condition**, and name the pre-existing failure
rather than folding it into silence. **A verdict is a measurement; report it as one.** (Owner's rule 0:
every claim carries an observation — and the observation here includes the run it came from.)

*Cross-ref: L1 (a confident label is not an inspection), L10 (report the whole picture, not the first red
flag), L14 (a green build is not a working platform).*

## L95 — a blocker repeated for weeks can be a **false premise**, and it will have been copied into every document before anyone re-measures it

**What happened.** Two register rows (`CC-7`, `CC-31`) and two plan documents (`PLAN-SD-1`, `PLAN-SD-2`)
all deferred real work because *"a migration is unprovable on this host — the unit suites mock the
EntityManager"*. The owner pushed back and asked for the schema change to be made. Re-measuring found the
premise **false**: a **live Postgres 17** had been running in `mercato-postgres-local` the whole time;
`Migration20261009090000` was written, applied with `mercato db migrate`, and read back on the live DB
(`is_core boolean not null default false`, backfill `superadmin=t`), then rebuilt into the container's
runtime artefacts and proven through the restarted app. Nothing had ever forbidden the change.

**Why it is dangerous.** A premise that is *convenient* (it defers hard work) gets copied — into the
register row, into both plans, into code comments — and each copy makes it look more measured than it is.
No single copy was ever re-derived from an observation; they all cited each other. A **blocker** is the
most dangerous place for this, because a blocker is exactly what nobody tries to falsify — its job is to
stop you looking.

**The rule.** **A blocker is a claim, and every claim carries an observation (rule 0) — including the
claim that something *cannot* be done.** When a blocker is more than one session old, re-measure it before
trusting it: run the command it says is impossible, and look at the output. And when a measurement
falsifies a premise, **correct it everywhere it was copied** (rule 13) — here five documents. Stated in
the owner's own standing instruction (now `WORKING-RULES.md` §1 rule 14): *"ANYTHING that blocks the work
you HAVE TO clearly state it repeatedly till it is resolved."* A blocker you repeat but never re-test is a
blocker you have stopped thinking about.

*Cross-ref: rule 13 (correct a falsified premise everywhere it was copied), rule 0-zero-two ("it exists" is
not "it is built"), L1 (a confident label is not an inspection).*

## L96 — a guard on the SEED path is not a guard on the CREATE path, and the two are found in different files

**What happened.** The durable `is_core` marker was stamped in the seed (`setup-app.ts`, for the built-in
`superadmin`/`admin`/`employee` roles) and the guard was wired on the delete and rename paths. Then the
hostile critic found a **HIGH** hole: the **API create path** (`auth/roles/commands/roles.ts`) inserted a
role with `{ name, tenantId }` and **no `isCore`**, so a role the setting marks core — created at runtime —
was born `is_core = false`. One rename would move its name out of the setting and leave it fully
unguarded: the exact hole the work existed to close, re-opened for every non-seed core role.

**Why it is dangerous.** "I stamped the marker" is true of *a* path (the seed), and the seed is the path a
reader naturally checks first — it is where the built-in roles visibly come from. The create path is in a
different file, a command, not a setup script. A property that must hold **for every row** was enforced on
one of the two ways a row is born, and the one it missed is the one that runs in production.

**The rule.** When an invariant is "every X is stamped/has/gets Y", enumerate **every place an X is
created** and check each — not just the one that is easiest to find. Seed and runtime-create are different
paths *by construction* (one is bootstrapping data, one is user action), so a check on one says nothing
about the other. Ask "how many ways can this row come into existence?" before declaring the invariant held.

*Cross-ref: rule 9a (own the code you touch — the create path was mine the moment I stamped the seed),
L85 (a test that mocks the layer you are changing proves nothing).*

---

## L97 — a **declared** grammar with no reader is not an enforced one; the honest boundary must be measured, not implied

**What happened.** `SD-4` Slice C was asked to build *"the per-verb grammar (S11/CC-5)"*. It built two
things: the **records** the catalogue yields (the structural block widened from one `'structure'` verb to
the five S11 verbs), and a **settings home** for the grammar's *level* (`structural-settings.ts` — seed +
strict parser + pure `resolveStructuralLevel` + the `actorTypeForPrincipal` bridge + fail-closed read). The
module's own JSDoc said a guard "calls it". Then the hostile critic ran `grep -rn "structural-settings"
packages` (excluding `dist`/`node_modules`) and got back **only the test file**. Nothing in production
imports it. The grammar is *declared and readable*; it is *not enforced* — and the comment claiming a
caller existed was **false in the tree**.

**Why it is dangerous.** "The grammar is built" reads as "the rule is in force". It is not: no guard reads a
level, no route escalates on one, and nothing changes for any actor. A reader who trusts the comment ships a
platform where the AI's structural reach is *described* but not *bounded*. The gap is invisible to every
test in the module — they all pass, because they test the functions that were built, not the wiring that was
not.

**The rule.** When a change adds a **mechanism** (a parser, a decision, a settings home) but not its
**enforcement** (the caller that acts on it), say so with an *observation*, not a promise: run the grep for
the module's importers and report the count. If the count is zero, that is the finding — record it in the
module's own header **and** schedule the wiring in `COMPLETION-CALLBACKS.md` with the trigger that brings it
back (here, **CC-37**: the guard gaining the escalate outcome). A mechanism with no caller is a legitimate,
honest partial build; a mechanism *claimed* to be enforced when it has no caller is the decoration the
working rules forbid. The distinction is one grep wide.

*Cross-ref: rule 9a (own the code you touch — fix it or schedule it, never leave it implied), L83 (a file
that exists is not a mechanism that runs), L94 (a suite green on your run, not the critic's, is a claim
about a run, not the artefact).*

## L98 — a mutation that does **not** flip a test may be **unreachable**, not redundant; and a mutation `git checkout` restore can silently destroy uncommitted work

**What happened (two failures in one session, both in the CC-37 mutation proof).** (1) I mutated a function's
final `return null` to `return settings.defaultLevel` and re-ran its suite: **all tests still passed**. My
first read was "the tests are weak". The truth was subtler: for every input the tests used
(`actorType='human'`), an earlier branch (`return findLevel('any')`) returned *first*, so the mutated line was
**dead for those inputs** — the mutation never executed. The tests were fine; my *mutation* was unreachable.
Crafting the mutation to bite the reachable path (`actorType='any'`) then required the test that reached it,
which did not exist — so the real gap was a **missing input**, found only by asking *"does my mutation even
run?"* (2) My restore helper used `git checkout -- <file>`. On a file with **uncommitted edits** that reverts
to *HEAD*, not to the pre-mutation working tree — it deleted the entire change (the new function and all doc
edits) and the md5 "proved" a file that was now *wrong*. The mismatch (`RESTORE-MISMATCH`) was the only thing
that caught it.

**Why it is dangerous.** (1) A mutation that silently does not run is worse than no mutation: it *looks* like
proof and manufactures false confidence in tests that may genuinely be thin. "Red-then-green" is only evidence
if the **red** is real — i.e. if the mutated line is on the path the test drives. (2) A restore that reverts to
HEAD on an uncommitted file is **data loss dressed as verification** — the md5 check passes against the wrong
baseline, and an uncommitted-but-correct change is gone.

**The rule.** (1) When a mutation fails to flip a test, ask **"did the mutation actually execute?"** before
concluding the test is weak — trace the branch. A mutation must be **reachable** for the inputs the test uses;
if the only reaching input is not tested, the gap is a **missing input**, and the fix is a test that reaches
it (here: `actorType='any'` on an unreached triple — the sole path to the final `return`). (2) Restore from a
**byte copy you took**, never `git checkout`, for any file with uncommitted changes; and check the md5 of the
*restored* file against the *pre-mutation* value, not against HEAD. (Both were fixed this session: a
`snapshot`/`restore` helper that copies the file and verifies md5, and the `any`-actor test.)

*Cross-ref: L93 (a defence you never tested is one a refactor may delete — the mutation proof tells the two
apart), L94 (green on your run is a claim about a run), the encoding-trap note (a byte-identical restore must
be proven, not assumed), rule 13 (a falsified premise is corrected everywhere it was copied — here CC-37's own
callback named a `resolveStructuralLevel` design that would have weakened S9).*

## L99 — a test whose two inputs are both produced by the function under test is **tautological**: it passes even when that function is replaced by a naive one

**What happened.** `SD-5` added `structuralSettingsEqual(a, b)` (compares two settings cell-by-cell over the
grammar's closed sets) and a test named *"ignores raw-shape differences (key presence/order) between
equivalent settings"*. Both inputs were built with `parseStructuralSettings(...)`, which **normalises** both
to the identical full shape. The hostile critic mutated the function itself to `return JSON.stringify(a) ===
JSON.stringify(b)` — a naive deep-equality — and the suite stayed **green** (`49 passed`). The test could not
tell the real function from the naive one, because after normalisation the two inputs *were* byte-identical:
the whole point of the test — that raw shape must not matter — was never exercised.

**Why it is dangerous.** A test that passes for *any* implementation of the function it names is **not a
test of that function** — it is a coincidence that happens to run, and it manufactures confidence in exactly
the property it claims to pin. Worse, it is invisible: the assertion (`toBe(true)`) is correct, the inputs
look reasonable, and the suite is green. The defect is in the **relationship** between the inputs and the
function under test — the inputs were pre-processed by the very thing being tested, so the test could only
ever see already-equal values.

**The rule.** For an equality/hashing/normalisation function, at least one input must be a **hand-built,
deliberately differently-shaped** value that the function under test did **not** produce — a raw literal the
other path (a parser, a serialiser) would emit. And **prove the test bites**: mutate the function to the
naive wrong implementation (`JSON.stringify(a) === JSON.stringify(b)`) and confirm the test goes **RED**. If
it stays green, the inputs were too well-normalised to distinguish the implementations — the test is
tautological, and the fix is a raw-shape-*differing* pair (here: a hand-built object with only one object
kind, a different key order and extra empty buckets; re-proven RED under M26). This is the sibling of **L98**:
L98 is a mutation that never *runs* (unreachable); this is a mutation that runs but whose *test inputs*
cannot tell the two implementations apart.

*Cross-ref: L98 (a mutation that does not flip a test may be unreachable — check it ran; this is the other
half — check the inputs can distinguish), L93 (a defence you never tested is one a refactor may delete), rule 9a
(own the code you touch — the critic found it; I fixed it and re-proved it), the `check-the-premise-before-the-
blanket-fix` discipline (re-measure the premise of a claim before trusting it).*

---

## L100 — a **headline number that is incremented by hand** drifts away from the boxes it claims to be derived from; the *sections nobody re-opens* go stale first

**What happened.** `platform_points.md` opens with a single headline number — *"72 of 321 units"* (it read
*"73 of 330"*). The file's own §L states the number is **derived from the ticked boxes, never typed**, and
gives the exact counting rule. Over several sessions the headline was **bumped by hand** as rows closed
(`68/329 → 70/329 → 71/330 → 72/330 → 73/330`) instead of the check being re-run. When the owner asked for a
forensic sweep and the count was actually **re-derived**, the boxes summed to **72 / 321**, not 73 / 330.
Two *section* figures had been stale the entire time — §H was kept at `0 done` even after its `P10` line was
ticked, and §K was kept at `3/23` even though §K has **13 lines and 1 tick** (the "23" had counted *ids named
inside one bullet* — `N-16/17/18/19`, `V-09…V-13/S-04` — as if each were its own line). §B's unit count was
one short.

**How it was caught.** The owner refused to accept the number on faith and asked for a forensic re-check;
the count was then derived **twice by two independent routes** (a local script, and a separate blind
hostile-critic agent) and **both returned 72 / 321**.

**Why it is dangerous.** A derived number is only as trustworthy as the last time it was *actually derived*.
Bumping a total by hand looks harmless — it is one and the same as the real delta **only if every section is
still current**, and the sections that no one re-opens (the ones whose work is *done* and therefore
"finished") are exactly the ones that go stale unnoticed. The headline then becomes a **typed** number
wearing the badge of a derived one — and a reader who trusts the badge propagates the error into handovers,
starter prompts and status pages.

**The rule.** A number that claims to be derived must be **re-derived, in full, in the same change that
changes any box** — never incremented. If a file says "computed, never typed", the derivation must be
**reproducible from the raw file** (state the rule, then show the per-section sum), and any session that
edits a tick re-runs it. When a derived figure is found wrong, **fix it everywhere it was copied** (rule 13)
— and record *why* it drifted, so the reason is not rediscovered. This is the standing-instruction version of
`N-20`: one fact, one canonical copy — and the copy must be *computed*, not remembered.

*Cross-ref: `N-20` (one fact, one canonical copy; two stale copies of one count is a defect), rule 13
(re-measure premises; correct a falsified premise everywhere it was copied), §L `derive-counts` in
`platform_points.md` (the rule this lesson protects), L1 (a confident label is not an inspection — the
headline's "%" badge is a label; the boxes are the inspection).*

---

## L101 — when you **re-derive a number from a text file**, the *parser* is the thing under test: a near-miss on `319` vs `321` was **my measurement being wrong**, not the file

**The trap.** Asked to re-derive `platform_points.md`'s headline from its boxes, I wrote a small parser
and it returned **`72 / 319`** — two units short of the file's `72 / 321`. The honest first response is
*"the file is wrong"*. It was not. The file was right and **my parser was wrong**.

**What actually happened.** The file's rule says a line starting `- ` is a whole point, marked `☐` or `☑`.
My regex matched exactly those two markers. But the appendix contains **two** whole-point lines marked
`- ✅` instead (`S11` and `S12` in section G) — and my pattern silently skipped both. `319 + 2 = 321`: the
file's number was correct all along, and the "discrepancy" was an artifact of my instrument. **A second,
independent verifier then reproduced the *same class* of error from the other direction** — its first pass
returned `364` because it counted the `-     *(was PARTIAL…)*` **annotation** lines (which are prose under a
point, not points) as units. Two different parsers, two different wrong answers, one correct file.

**Why it is dangerous.** A re-derivation is supposed to be the *check* on a typed number. When the parser is
wrong, the check **manufactures a defect that does not exist** — and the natural next move (edit the file to
"fix" it) would have written the *parser's* bug into the source of truth, i.e. exactly the L100 failure in
reverse. The instrument failing is indistinguishable, on first reading, from the patient failing.

**The rule.** When a re-derivation disagrees with the file, treat **both** as suspects: before touching the
file, (a) enumerate the **actual distinct line-markers / line-classes** in the raw text and prove your
parser covers *every* class (here: `☐`/`☑`/**`✅`** for whole points, `-   - ` for sub-points, and the
indent-only `-     *(was …)*` lines are **annotations, never units**); (b) get a **second route** that is
genuinely different — and when the two routes disagree, assume the *instruments* disagree until the raw
lines are printed and counted by eye. A re-derivation that reports a defect must be able to **show the
offending lines**, not just a total. **The number that survives two independent correct parsers is the
number; a total from one parser is a hypothesis.**

*Cross-ref: L100 (a derived number must be re-derived, never incremented — this is the failure mode *of the
check itself*), L1 (a confident label is not an inspection — a parser's total is a label until the lines are
read), rule 0 (the code/text is the evidence, and here the *reader* of that evidence was the defect),
rule 13 (a falsified premise must be corrected everywhere — but *first* be sure it is falsified).*

## L102 — before you call a file **"not a leak surface"**, name the **entity the code actually reads** — not the entity its *name* suggests; I dismissed a real leak by checking the wrong table

**The trap.** Closing the *client-side export* leak (`CC-48`), I had to say which other exporters were and
were not leak surfaces. I looked at `customers/components/CustomerTodosTable.tsx`, saw it exports "todo"
rows, then checked the encryption map for a **`customer_todo`** entity, found none, and wrote the table off
as **"not a leak surface"**. That claim was **false**, and it was false for a reason worth banking: the
table does not read a `customer_todo` entity at all — it reads **`customers:customer_interaction`**
(`listCanonicalTodoRows` → `em.find(CustomerInteraction, …)`), and **`customer_interaction` IS marked**
(`title`, `body`). Even worse, the rows **alias** the marked fields — `todoTitle: interaction.title`,
`todoDescription: interaction.body` — so the mask (which keys on the true field name) would **never match**
the alias, meaning the value is decrypted server-side, aliased, sent to the browser, and exported **in
clear**. **Only the mandatory hostile critic caught it**; I had already written the false "not a surface"
claim into a planning document.

**The rule.** A **negative** claim ("X is not a leak surface" / "Y cannot happen") is the most dangerous kind,
because it *closes* an investigation. So a negative claim must (a) name the **concrete object the code
reads** — the *entity id at the read call* (`em.find(CustomerInteraction, …)`), the *column actually
serialized* — not the object the file's **name** or purpose suggests; (b) be derived by **following the data
path to its read site**, not by matching a plausible-looking identifier; and (c) be **stated with the search
that would falsify it** ("I looked for a marked entity among the ones this table reads"). If you cannot name
the read site, you have not measured — you have guessed, and a guess in the negative voice is worse than no
claim at all.

**The second half.** When the critic *did* find it, the right response was **not** to fold it silently into
the change in hand: it is a **different defect with a different root cause** (aliasing, not the browser), so
it became its own callback row (`CC-49`) with its own reproduction, and the parent row-14 status was left
**🟡** rather than falsely ✅. **Splitting a newly-found defect out is not "leaving work incomplete" — it is
keeping the record honest**; the sin would be to mark row 14 done while a leak of the same requirement
survives.

*Cross-ref: L101 (the *reader* of the evidence was the defect — here the *scope* of the claim was), L1 (a
confident label is not an inspection), rule 0 (the code is the evidence — so read *which* code), rule 2 (two
routes or it is not a finding — the leak was confirmed by the critic **and** reproduced by me **and** a
verifier), rule 13 (a falsified premise corrected everywhere it was copied), rule 11 (an owner's decision is
not the assistant's to close — the new defect's fix choice was registered, not silently taken).*

---

## L103 — a mock that is **the same regardless of what you pass it** makes the test **unable to fail** on the one bug you are testing; and the **first** draft of a security fix is where the critic earns its keep

**The trap (two, in one change).** Building `CC-49` — the customer-tasks export leak — my first route test
mocked the encryption service **entity-agnostically**: `getEncryptedFieldNames: jest.fn(async () =>
encryptedFields.value)`. It returned the same marked-field set no matter **which entity id** the route asked
about. But the *entire* bug under test is "did the route ask the **right entity** for its marked fields?" —
and with that mock, a route that asked for **any** id (or none) still passed. The test **could not fail** on
the exact defect it existed to catch. **The same first draft then passed the wrong id in production too:**
`CUSTOMER_INTERACTION_TODO_ADAPTER_SOURCE` = `'adapter:todo'` (a row **source tag**) instead of
`CUSTOMER_INTERACTION_ENTITY_ID` = `'customers:customer_interaction'` (the entity id), so
`getEncryptedFieldNames` matched **zero** rows and the mask was a **silent no-op** — the leak the fix was
supposed to close would have shipped, with a green test beside it.

**How it was caught.** Only by the **mandatory hostile critic, a separate agent**. It ran the fix's *own*
premise through the code and noticed the mock's output never depended on its argument, then traced the id
back to its definition and found it was a source tag, not an entity id. I had already written a "tests
prove it" line into the plan. **I reproduced both from the code** (rule 2) before fixing.

**The rule.** (1) A mock **must depend on the argument the code under test varies**; if the thing you are
testing is *which* value was passed, the mock must return **different** results for different values and the
test must **assert the value was asked for** (here: assert the route queried **both**
`customers:customer_interaction` **and** `customers:customer_entity`, and never `adapter:todo`). A mock that
returns a constant is a **tautology** (see L99) wearing a service stub. (2) **Interrogate a constant that
looks like an identifier**: before using an exported `*_ID`/`*_SOURCE` constant as an id, **read where it is
defined** and confirm its *value* is the id the callee matches on — `..._SOURCE` and `..._ENTITY_ID` are
different kinds of thing even when both are strings. (3) A fix that spans **two** entities must resolve the
marked fields of **both** and treat a field as marked if **either** says so (`some`, not `every`), or half
the leak survives.

**The second half — the fix's first draft is where the critic earns its keep.** All three of this change's
real defects (the wrong id above; a **flat** `format` export that left a nested `customer.displayName`
column `undefined` and, with no projection, serialized the **whole object** in clear; and a static guard
that a `['pre'+'pare']` + hand-built `Blob` download could slip past) were **in the first draft** and were
found **only** by the separate-agent critic. A correctness pass by the author is not a substitute: the
author reads for *intent*, the critic reads for *falsification*. Budget it as part of the change, not as an
optional extra.

*Cross-ref: L99 (a tautological test — here the tautology was a *constant mock*), L102 (the sibling
false-negative in the same feature: the wrong *entity* dismissed a leak), L101 (a measurement was the
defect), rule 2 (two routes — both the wrong id and the flat-export leak were reproduced independently), rule
10 step 6 (the hostile critic as a **separate** agent is mandatory, and here it found every real defect).*

## L104 — a coverage test's **discovery** predicate is part of its guarantee: if it recognises only *one* spelling of the thing it audits, the routes written the *other* spelling are silently outside the claim — and the header must not claim more than the discovery enumerates

**The trap.** `CC-47`'s coverage test asserts that every human CRUD `GET`/list route is permission-gated. Its
"which routes exist" walker (`exportsGet`) recognised `export const GET = …`, `export function GET`, and
`export { GET } from …` — but **not** the **destructured** form
`export const { metadata, GET, POST, PUT, DELETE } = makeCrudRoute({…})`, which is the **canonical** shape the
CRUD factory prints. A destructured binding name is an `ObjectBindingPattern`, **not** an `Identifier`, so the
`ts.isIdentifier(decl.name) && decl.name.text === 'GET'` check returned false for it. **Nine real route files
fell out of the audited set entirely** — B never saw them — while the sanity test happily pinned a count
(`287`) that *encoded* the omission. The detector was fine; the **discovery** was narrow, and a narrow
discovery is a silent hole in a *coverage* claim, the same way a wide detector is a silent hole in a *gating*
claim.

**How it was caught.** Only by the **hostile critic as a separate agent**, on the **twelfth** pass — eleven
earlier passes had attacked the detector's *predicates* (comment tokens, `as const`, spreads, `['']`, `let`,
duplicate keys, `Object.assign`, in-place array mutation) and all had been closed. It was the pass that asked
the *other* question — "is the set of routes you claim to cover the same set you actually enumerate?" — that
found it. I reproduced it from the code before fixing: `exportsGet` returned **false** for every one of the
destructured files, including the two `makeSalesLineRoute` line lists that were in **neither** assertion.

**The rule.** (1) In a coverage test, **test the discovery against every spelling** the language and the
project's own factories permit — the shape you happened to write first is not the only shape the codebase
uses. Add a **discovery self-check fixture** for each form (I did: all four export forms asserted
`exportsGet === true`, and a POST-only file asserted `false`), so a future narrowing fails loudly. (2) A
**sanity count that pins the discovered set** does not protect against a *discovery* gap — it *bakes it in*.
Where a count is pinned, pair it with a check that the excluded files are **named**, not absent (here: the
newly-surfaced routes went onto the pinned `DELEGATED_GATED_ROUTES` list with verified evidence). (3) A
header must **not claim more than its code proves**: when I widened discovery, the honest fix was to also
write the test's **bound** into the header — A covers the `makeCrudRoute` family, B covers routes that export
a `GET`, their union is **not** the whole tree (161 of 457 route files are in neither — every one a
mutation endpoint, zero exporting a `GET`; the earlier "163" was the pre-fix value), so *"every read is
permission-filtered"* is guaranteed for the **human CRUD list
family**, not for *every route that exports a `GET`*. (4) **Never let a promise of "all" rest on a walker
whose exclusions you have not enumerated** — enumerate them. (5) **When you widen a discovery predicate, the
counts it fed do not update themselves**: fixing the destructured-export gap lifted B from 287 to 296 and
dropped "in neither" from 163 to 161, but the *derived* number 163 had been copied into five documents and
survived until a reader (the owner) asked what it meant. A correction must be **grepped for**, not remembered.

*Cross-ref: L93 (a defence never tested is one a refactor may delete — here the "defence" was a discovery
predicate), L99 (a tautological test — a narrow discovery makes a coverage test tautologically true over a
smaller set), L101 (a measurement was the defect — here a *discovery* was), L95 (a false premise copied into
every document), rule 0 (only the code is evidence — the fix began by reading the walker, not the doc),
rule 2 (two routes — the pre-fix `287` and the destructured family were each re-measured independently),
rule 10 step 6 (the hostile critic as a **separate** agent; the twelfth pass found what eleven predicate
passes could not), rule 13 (the falsified "no per-entity permission filter" premise corrected in all six
documents).*

---

## L105 — a declaration put where *you* assumed it lives can be unreachable by the very entity that proves it; the place a mechanism must live is decided by the **scope of the guarantee**, not by the file you read first

**The trap (row 16, Option A).** The mission was *"restrict a person to their own rows"* for **every** CRUD
entity. I placed the new opt-in declaration (`rowScope` / owner-marker) in the **search registry**
(`SearchEntityConfig.aclFeatures`'s neighbour, `shared/src/modules/search.ts`), because that is where the
analogous **per-entity permission declaration** (`aclFeatures`, `CC-46`) already lived, and copying the
pattern that works is a good instinct. **But the search registry exists only for the 11 modules that define a
`search.ts`** — and the **first entity I wired to prove the mechanism, `api_keys`, has no `search.ts` at all.**
The declaration was therefore **unusable for the very entity that demonstrated it** — I could have written a
green test proving a mechanism no real entity could use.

**How it was caught.** By reading the code the declaration would have to serve (rule 0b — *"what is there;
which prerequisites must be done"*) **before** building on it: grepping the entities that actually have a
`search.ts`, then grepping the first target entity, and finding it absent. No test would have caught this —
the test would have passed, over the wrong home.

**The rule.** (1) Before you put a declaration in a file, **name the set of callers the guarantee must cover**
and **prove the file is present for every one of them**. A declaration belongs at the **lowest layer every
covered caller shares**, not at the layer of the nearest existing example. (2) An example is a **hint about
style**, not **evidence about scope**: the existing example (`aclFeatures`) was correct *for its own promise*
("every **searchable** entity declares its ACL") and wrong for this promise ("every **CRUD** entity can opt
in"). (3) The correction is a **rule-13 sweep** — the wrong home was already copied into the plan's §3 and the
requirement draft; fixing the code without grepping for the claim leaves the documents lying. I reverted the
`search.ts` edit (kept only a NOTE pointing at the true home), moved the declaration to **`OrmEntityConfig`**
(the layer every `makeCrudRoute` caller shares), and rewrote the coverage walker to walk `orm: {}` blocks.

*Cross-ref: L89 (a plan that inherits a count/a shape is right by luck), rule 0b (measure the prerequisites
before building), rule 13 (correct a falsified premise **everywhere it was copied**), rule 2 (two routes — the
"searchable entities" set and the "CRUD entities" set were each measured, and they are not the same set).*

---

## L106 — a hook that short-circuits the shared builder is a place the shared builder's new clause never reaches; wiring a clause at the **one** place you know is not the same as wiring it at **every** place the query is built

**The trap (row 16 hostile-critic round 1 — a REAL leak, caught before commit).** The scoping mechanism's
design claim was *"`buildScopedWhere` is the single scope builder; wire the owner clause there and every read
is scoped."* I wired it there and a test went green. The critic asked a different question — *"is
`buildScopedWhere` actually on the path of **every** list?"* — and found that the `api_keys` `GET` route's
custom **`beforeList` hook builds its own query builder and short-circuits** via `throw json(...)`: it
**returns the response itself and never calls `buildScopedWhere`**. So an own-only role would still list
**every key in its organization**. My wired owner clause was **dead code for that route** — I had scoped the
thing I *knew about* (the shared builder) and missed the route that bypasses it.

**How it was caught.** The **hostile critic as a separate agent**, asking "where else is a query built for
this entity?" — not "does the clause you added fire?" The fix was to add the owner clause inside the
`beforeList` hook too, plus a GET test (the earlier tests only exercised the shared path).

**The rule.** (1) When you add enforcement at a **shared** choke point, **enumerate the paths that bypass
it** — a hook, a raw `createQueryBuilder`, a hand-written query, a second route — **before** claiming the
guarantee. "Single choke point" is a **claim to verify**, not an assumption to build on. (2) A green test over
the choke point proves the **choke point**, not the **route family**: the critic's question ("does this route
reach it?") is a different question from yours ("does my clause do what I intend?"), and you need both. (3)
This is the **same defect class as L104** (a *discovery* gap in a coverage claim) applied to **enforcement**:
a claim of "every read is scoped" rests on a **discovery** of "every read path", and the discovery is exactly
where a hand-rolled bypass hides.

*Cross-ref: L104 (a discovery predicate is part of a coverage guarantee), L96 (a guard on one path is not a
guard on another, found in a different file), rule 2 (two routes), rule 10 step 6 (the separate-agent critic
earned its keep on the first pass).*

---

## L107 — a security carve-out must be checked against **every** notion of the privileged principal the platform actually has, not the one on the object you happen to hold

**The trap (row 16 hostile-critic round 2 — a REAL defect).** The design was *"a super-admin is never
own-restricted."* I implemented it as `if (!acl.isSuperAdmin && hasOwnScopeGrant(...)) rowScope = …`, reading
the flag from the **ACL** object (`rbacService.loadAcl()` → `{ isSuperAdmin, … }`) — the object I already had
in hand. The critic found that the platform has **a second, independent** super-admin notion:
**`auth.isSuperAdmin`**, set on the request (`applySuperAdminScope` in `shared/src/lib/auth/server.ts`, and
for API-key principals). **When the two disagree** — a super-admin whose `auth` flag is set but whose ACL flag
is not (or vice versa) — the user was **own-restricted on `GET`** while being treated as super-admin
everywhere else. The carve-out was checked against one notion and the platform honoured two.

**How it was caught.** The separate-agent critic, by grepping for **every** place the concept
*"super admin"* is expressed — not by testing my one flag.

**The rule.** (1) For a **security exception**, first **enumerate every expression of the privileged
concept** (`grep -ri "superadmin\|super_admin"`), then design the check against **all** of them; a carve-out
that misses one notion is a hole, not a partial defence. (2) When the two notions live on **different objects
the code already holds** (here `acl` and the request `auth`), the check must **consult both** — `a || b`, not
whichever is closer. (3) The fix's shape can itself mislead: the correct read of `auth.isSuperAdmin` required a
cast (`(auth as Record<string, unknown>).isSuperAdmin === true`) because `AuthContext` does not **declare** the
field — the type system did not surface the second notion, which is *why* it was easy to miss. **A runtime flag
the type does not declare is a flag that hides from the compiler and the reader alike.**

*Cross-ref: L97 (a declared thing with no reader is not enforced — here, an *undeclared* thing with a real
reader was not noticed), rule 10 step 6 (two critic rounds, two real defects — the critic's value is asking
the question you did not), rule 2 (two routes / two notions), L103 (the first draft of a security fix is where
the critic earns its keep).*

---

## L108 — the "obvious" implementation of a suffix helper is wrong in the direction the tests must catch: `strip(x) === feature` returns **true for a plain grant**, which would own-restrict a role that was merely granted the feature

**The trap (row 16, caught by my own new test — before the critic).** To implement *"does this role hold the
own-scoped form of the feature?"* the natural code is
`granted.some(g => stripOwnScope(g) === feature)`, where `stripOwnScope` removes a trailing `.own`. It reads
well and it is **wrong**: for a **plain** grant (`api_keys.view`, no suffix), `stripOwnScope` is a **no-op**,
so `strip('api_keys.view') === 'api_keys.view'` → **true**. The helper then reports *"holds the own-scoped
grant"* for a role holding the **unscoped** grant — and the factory would **own-restrict a role that was never
scoped**, silently hiding rows from a user who was promised the whole tenant. The fix is to require the
**positive** signal: `isOwnScoped(g) && stripOwnScope(g) === feature`.

**How it was caught.** By the **test I wrote for the helper**, on the first run — the negative case
*"a plain grant does not count as own-scoped"* failed. This is the payoff of writing the **negative** test
first: the bug is a **false positive on the negative input**, and a test suite that only proved the positive
case (`.own` grant → own-restricted) would have passed over it.

**The rule.** (1) When a helper answers a question by **stripping** or **normalising** its input, the
**identity / no-op input** is the dangerous case — write the test where the transformation does **nothing** and
assert the **conservative** answer (here: *not* own-scoped, so the user keeps their rows). (2) In security
code the **safe default is the permissive-to-the-innocent** one: an unrecognised/malformed grant must **not**
narrow a user's access, so the check must require the **affirmative marker**, never infer intent from a
successful strip. (3) The **general form**: any `f(x) === target` predicate is only sound when `f` is
**injective** on the inputs that matter; when `f` is a **projection that fixes** some inputs (a strip that
does nothing), it **confuses them with the target**.

*Cross-ref: L99 (a tautological test — here the *positive* test alone was near-tautological), L103 (the first
draft of a security helper is where the critic earns its keep — here a self-test beat the critic to it),
rule 2 (two routes — the strip direction and the identity direction were each asserted), rule 10 step 4/6
(RED-then-GREEN: this bug's test was the RED).*


## L109 — a **coverage test's predicate** is a security control, and a coarse one ("is the name mentioned *anywhere* in the file") is defeated by a **comment**; strip comments before you trust a textual match

**The trap (row 17, caught by a separate-agent hostile critic).** The new `table-coverage.test.ts` decided a
table was *"a read surface"* by searching the module's `api/**/*.ts` files for the **bare class name**. It
passed — but one of its passes was **false**: `communication_channels.ExternalMessage` was matched from a
**comment** in a neighbouring file that merely *mentioned* the class name, not from any live `GET`. A table
proved "reachable" by a sentence about it is **not** read-gated; the predicate was satisfied by prose, so the
guarantee it claimed (row 17: *"a new table cannot be added un-gated"*) was **one comment away from a hole**.

**How it was caught.** By a **separate blind hostile-critic agent** (rule 10f), whose job was to *break* the
gate, not to re-run it — it inserted a class name into a comment and watched the gate stay green. My own
RED-then-GREEN mutations had all passed, because **each mutated the data, never the predicate**.

**The rule.** (1) A **coverage/enforcement claim is only as strong as the predicate that computes it** — so the
predicate, not the allowlist, is what the critic must attack. (2) When a check is **textual** (grep/AST over
source), **comments and string literals are attacker-controlled text**: strip them (`stripComments()`) before
matching, or the check certifies *"someone wrote this word"*, not *"the code does this"*. (3) The **general
form**: *"X is mentioned in file Y"* is **not** *"Y does X"* — and any security gate built on a text search
inherits that gap. Assert the **structural** fact (a route/handler exists), never a **textual** proximity.

*Cross-ref: L104 (a discovery predicate is part of a coverage guarantee — here the predicate's **input** was
the defect, not its **reach**), L102 (a name suggested a thing that the code did not do), rule 10f (the
hostile critic must attack the **predicate**, and must be a separate agent), rule 4 (two routes).*


## L110 — when a walker reads exactly **one filename**, everything defined in a **sibling file** is invisible — and the invisible thing is marked "not a surface" by default, i.e. the failure is a **false negative that hides a real read path**

**The trap (row 17, second real hole, found by the same hostile critic).** The gate's read-surface walker read
each module's **`route.ts`** and nothing else. Measured: the `entities` module serves a live **`GET`** from
**`api/definitions.ts`**, not from `route.ts` — so `entities.CustomEntity`, a table with a real read path, was
**invisible** to the walker and got filed as *"internal"*. The gate was **green and wrong**: it silently
declared a **readable** table un-readable, so the day that table's real `GET` was removed, no test would
notice — the allowlist entry would keep the gate green.

**The rule.** (1) When you enumerate *"is this thing read anywhere in its module?"*, the unit is **the module's
whole read surface**, not one blessed filename — walk **`api/**/*.ts`** (or the module's declared entry
points), never a single guessed path. (2) **A missed discovery is a false negative in a gate whose whole job is
to force a positive classification** — so the safe direction is to **over-discover** and let the allowlist
carry the deliberate exceptions by **name + reason**, never to under-discover and let silence pass as internal.
(3) The general form: *"I read the file I expected the behaviour to live in"* is **L105's trap** (a
declaration lives where the **scope** says, not where you looked first) applied to a **search** — the search's
**path list** is a premise that must be measured, not assumed.

*Cross-ref: L105 (the mechanism lives at the scope of the guarantee, not the file you read first — here it was
the *search*, not the *declaration*), L104/L109 (a discovery predicate is part of the claim), rule 0b
(measure the premise — including *where* a thing is read), rule 10f (a separate critic found it).*


## L111 — a **sanity threshold with slack** (`> 200`, `> 30`) is a **silent-permission slip**: it lets a whole class of regression pass because the number only has to stay *above* a floor — pin the **exact** figure so any shrink is RED

**The trap (row 17, third real hole, found by the same hostile critic).** The gate opened with loose sanity
checks (`tables > 200`, `surfaceModules > 30`) so it would not be brittle. The critic **deleted 39 tables**
from the discovery (`EXPECTED_TABLES` 233 → 194) and the suite stayed **GREEN** — the floor was 200 only in
spirit; the real numbers it compared against were loose enough that a **17% shrink of the entire audited
universe** slipped through. A gate whose job is *"a new/changed table cannot slip past un-gated"* had a hole
the size of *"any table you like, as long as a few dozen remain"*.

**The rule.** (1) In a **coverage / inventory gate**, the count of audited items is **itself an assertion** —
pin the **exact** number (`EXPECTED_TABLES = 233`), so both a **shrink** (something stopped being discovered)
and a **growth** (a new table appeared — which must be classified deliberately) turn the suite **RED** and force
a human to re-derive. (2) A floor with slack is the *right* tool for a **sanity guard against total collapse**
(a `> 0` guard against "the walker returned nothing"), and the *wrong* tool for the **guarantee itself** — use
both: a low floor to catch a broken walker, an **exact pin** to catch a silent shrink. (3) The general form:
**any threshold expressed as an inequality is a **permission** for everything on the far side of it**; a
security gate must express its spine as an **equality**, and reserve inequalities for the "did it run at all?"
check.

*Cross-ref: L100 (a number must be re-derived, never incremented — here a floor *permitted* a wrong number to
stand), L101 (the parser/measurer is the thing under test), L109/L110 (the same critic, the same session, the
same class — a gate that is green while the thing it claims to protect is gone), rule 10f (the critic is a
**separate agent** that attacks the guarantee, not the data).*

---

## L112 — a record you **mask by field name** still leaks if the value is **re-shaped** on the way out: an *index-time presenter* can promote an arbitrary string field into the displayed `title`, so "I masked the field" is not "the value cannot leave"

**The trap (row 18, first hostile-critic round).** `search_get` was masked correctly — every field the platform
classification map names was replaced with `***`. But the AI's **other** two record-returning tools did not
return the raw record:

- `search_query` returns a **presenter** shape (`title`/`subtitle`/`url`) built at **index time**. The fallback
  presenter (`fallback-presenter.ts` `findAnyStringValue`) will **promote *any* string field** it finds into
  `title`. So an entity with a classified field `api_secret` (not in the search `fieldPolicy`) would have had
  that secret **copied into the displayed title** — the mask on the raw record never saw it, because the record
  that left the tool was not the raw record.
- `search_aggregate` returns **raw bucket values**. `isGroupByAllowed` blocked grouping only on the **search**
  `fieldPolicy`, so a `groupBy` on a classified field returned the secret as a group key.

Both are the same shape: **the field was "masked", but the *value* reached the caller through a second,
re-shaped channel.**

**The rule.** (1) When a read path **transforms** a record before returning it (a presenter, a projection, an
aggregate, a join, a serialiser), masking the **source** field is not sufficient — enumerate every **egress
shape** and ask, for each, *"can this shape carry the value?"*. (2) For a **free-form promotion** (the fallback
presenter), the safe fix is to **suppress the whole shape** for a classified entity, not to try to scrub the
one field you know about — you cannot enumerate what a "find any string" heuristic will pick. (3) For an
**aggregate**, refuse the **dimension** (`groupBy`) that names a classified field, exactly as you refuse to sort
on one. *Cross-ref: L102 (name the entity the code actually reads), rule 10f (the critic found it, not the
author).*

---

## L113 — a mask that checks only **top-level keys** is defeated by one level of nesting; a recursive egress needs a **recursive** mask

**The trap (row 18, second hostile-critic round).** The first mask iterated the record's own keys and replaced
each classified one. A classified key **nested inside an object value** — `record.meta.api_secret` — was
**never visited**, so the secret left in clear. (The same would be true of a classified key inside an **array**
of objects.) This is the classic shallow-vs-deep traversal bug, and it is invisible to a test that only uses
**flat** fixture records.

**The rule.** (1) If the egress can contain **nested structures** (objects, arrays, JSON columns), the mask must
**recurse** into them (`maskValueDeep`), not just rewrite the top level. (2) The test must include a **nested**
fixture — a flat fixture proves nothing about depth. (3) The general form: **a mask's reach must equal the
egress's shape**; anything the serialiser can descend into, the mask must descend into first. *Cross-ref: L112
(the same class — "masked" is not "gone"), rule 10f.*

---

## L114 — a test whose **mock ignores its arguments** cannot catch the bug the arguments encode: the wrong-entity mutation stayed GREEN because the mock was entity-blind

**The trap (row 18, found by re-running the mutations, then hardened).** The mask resolves the classification
map **for a given entity** (`getEncryptedFieldNames(entityId)`). I wrote a mutation that passed the **wrong
`entityId`** expecting the test to go RED — and it stayed **GREEN**, because the mock returned the same set
**regardless of what entity was asked for**. The test was asserting behaviour that its own fixture had made
unobservable: **the very parameter under test was ignored by the double.**

**The rule.** (1) A mock/stub must be **sensitive to every argument the real code depends on** — if the code
branches on `entityId`, the double must branch on it too (make it **entity-aware**, keyed by the argument).
(2) After writing a mutation that *should* fail, if it stays **GREEN**, suspect the **fixture** before you
suspect the mutation — a mutation that cannot fail is a test that cannot fail. (3) Add an **explicit assertion**
that the correct argument was used (here: *"resolves the map for the **requested** entity"*), so the contract
is pinned even when the happy-path output would look identical. *Cross-ref: L103 (the same lesson from the other
direction — a double that is the same regardless of input), rule 10f (the mutation is the second critic).*

---

## L115 — two routes can **agree on every section and still disagree on the total** if one of them **counts a section the rule excludes**: §L is the ledger, not a unit — bound the walk to `A…K`, never `A…L`

**The trap (row 18, the eighth §L re-run).** The ONE-NUMBER is re-derived by two independent routes. Mine
returned `72 / 321`; a blind verifier returned `74 / 331`. Per-section they differed only on §K (`3/23` vs
`1/13`). The verifier's section regex was `^##\s+([A-K])\.\s` — which **never matches `## L.`** (the letter
`L` is outside `[A-K]`), so its parser left `sec = 'K'` open and **kept counting every `- ` bullet in the
verification ledger §L** (lines 634–862) as if they were §K points — inflating §K to 23 (the exact "23" the
file's own §L note had already warned about). Fixing the bound to `[A-L]` corrected §K to `1/13`, **but the
total then read `72 / 331`** — the extra 10 units were §L itself being summed **as a point section**.

**The rule.** (1) The derivation walks **§A–§K only**; **§L is the ledger** (it names evidence for the ticks,
it holds no points) and must be **excluded from the count** — bound the walk's **end** at `## L.` and **do not
sum L**. (2) A section-header regex must include the very letter that **ends** the walk, or the last counted
section silently absorbs the ledger. (3) When two routes disagree on the **total** while agreeing on most
sections, the disagreement is almost always **one mis-bounded region** — diff per section, then inspect the
**boundary** between the last real section and the excluded one. *Cross-ref: L100/L101 (the number is derived,
the measurer is under test), rule 4 (two routes or it is not a finding — never average, never pick the nicer
number).*

## L116 — a test-runner **path pattern** that contains glob metacharacters (`[agentId]`) **silently matches nothing**: the suite never runs, the mutation proof reads GREEN, and a broken build is certified as proven

**The trap (CC-27, the mutation proof).** I proved the RED-then-GREEN property by mutating a production file
and asserting the suite turns RED. Two mutations against the manage-surface route — *remove the 403 feature
gate*, *remove the missing-`principalId` 400* — came back **GREEN**, i.e. "the mutation did not break any
test." That reads as *"the test does not cover this line."* It was the opposite: the tests **did** cover it,
but the suite **was not running**. The path I passed was
`src/modules/ai_assistant/api/ai/agents/[agentId]/bindings/__tests__/bindings.route.test.ts`, and to jest's
**positional** test-path matcher `[agentId]` is a **glob character class** — so the pattern matched **zero**
files, jest exited 0 with *"No tests found"*, and the harness saw "no failures" and printed GREEN.

**The rule.** (1) A test runner's path argument may be a **glob**, not a literal. Any path containing `[`,`]`,
`*`, `?`, `{`,`}` can silently match nothing — and *"no tests found" is not "all tests passed."* (2) A
mutation proof must assert the **test COUNT**, not merely the absence of failures: for each mutation, confirm
the baseline suite count is the number you expect **before** trusting a RED/GREEN verdict. A GREEN that means
"0 tests ran" is the most dangerous kind of false proof — it certifies a broken build. (3) Prefer matching a
bracket-free **substring/regex** (`--testPathPatterns "bindings\\.route"`) over a literal path when the path
contains brackets. (4) The tell: the total test count for the run is **smaller than the sum of the suites you
asked for** — here the combined run reported **8** (the coverage suite alone) instead of **15** (8 + 7).
*Cross-ref: L114 (a test that cannot catch the bug), the hostile-critic protocol (a SEPARATE agent re-ran and
found the hole), rule 10 (RED-then-GREEN must be a **real** proof).*

## L117 — a test can pass for the **wrong reason**: if a property is enforced in **two** places, a test that does not isolate the **new** one stays GREEN when the new one is deleted

**Seen in `CC-55` (2026-10-11).** The build added a **binding-feature union** check inside
`resolveAiAgentTools` (`agent.requiredFeatures ∪ binding.requiredFeatures`). A test named *"the binding's
features are UNIONED with the agent's own"* seeded an agent that **already declared** a required feature, gave
the actor **no** features, and asserted the run was denied. That assertion passed — **but for the wrong
reason**: `checkAgentPolicy` (which runs *first*, and is untouched) independently denies when the agent's own
feature is missing. So when a mutation **deleted the new union check**, the test stayed **GREEN** — it was
testing `checkAgentPolicy`, not the union. **The hostile critic caught it** (mutation: only the *deny* test went
red, the "union" test did not).

**The rule.** (1) When a property ends up enforced at **two** layers, a test for the **new** layer must
exercise the case that **only** the new layer handles — otherwise it proves nothing about the new code. For a
union, that case is: the actor **holds the first set's members** but **lacks the second set's** — the old layer
passes it, so only the new layer can deny. (2) A **mutation proof** is the detector: delete the new enforcement
and confirm the named test goes **RED**. If it stays green, the test is mis-targeted (or, worse, is an L116
false-green). (3) Name the test after the case it actually isolates, not the property in the abstract.
*Cross-ref: L114 (a mock that ignores its arguments), L116 (a suite that never ran), rule 10 (RED-then-GREEN
must be a **real** proof — a mutation that does not flip the test proves the test is wrong, not the code).*

## L118 — a **structural coverage gate** that scans only **part** of the tree is blind to the rest: name the known exceptions explicitly, or a real hole hides just outside the scan

**Seen in `CC-55` (2026-10-11).** The `CC-27` binding-coverage gate asserted *"every agent dispatch site
consults the binding"* — but it walked only `api/ai/**`. A **production** dispatch site in `lib/`
(`business-ir-author.ts`, which calls `runAiAgentObject` with no binding) sat **outside the scan** and was
invisible: the gate passed while a real un-gated path existed. **The hostile critic found it** by a repo-wide
grep of the runtime's call sites.

**The rule.** (1) A coverage gate must scan the **whole** surface where the pattern can occur — not the
convenient sub-directory. If the pattern is "calls the agent runtime", the scan is the **whole package**, not
`api/`. (2) Known exceptions are **named in an allowlist with a reason and a scheduled callback**, and the test
asserts the offender set **equals** that allowlist — so a **new** occurrence fails the build *and* a **stale**
entry fails it too. (3) Prefer detecting the **call** (name + `(`, comments stripped) over a bare textual
mention, so a name in a comment is not a false hit. (4) The test that would have caught it is the one you did
not write: ask *"where else could this pattern appear?"* before scoping the scan.
*Cross-ref: L111 (a sanity floor is a silent-permission slip), the hostile-critic protocol (a SEPARATE agent
found the blind spot), rule 9(a) (own the full codebase, not just your diff).*

## L119 — a documented lesson is not an applied one: when you write a guard of a class the file already covers, **reuse its fixed form** instead of re-deriving it

**Seen in `CC-56` (2026-10-11).** Adding a coverage assertion to `binding-coverage.test.ts` — the *same file*
that already defines `stripComments()` and whose own L118 clause (3) reads *"detect the call (name + `(`,
comments stripped)"* — I matched the confirm route's source for `resolveAgentBinding(` against **raw** source.
A `// resolveAgentBinding(...)` comment satisfied it. **Two documented lessons were re-broken in one line:**
**L109** ("strip comments before trusting a textual match") and **L118 clause 3**. In the same change the
"human passthrough" test was green whether or not the production call existed — **L93**'s shape ("a defence
with no test is not a defence"), also a recurrence. A **separate-agent hostile critic** found both by attacking
the *predicate* (inserting a comment) rather than the data.

**Why it happens.** Each lesson was written in a *different* session and file, and the new guard was written
*fresh* rather than by copying the neighbouring, already-fixed pattern. The failure is not ignorance of the
rule — it is that the rule lives in **prose** while the fix lives in a **helper** (`stripComments`) two
functions away.

**The rule.** (1) Before writing a guard, ask *"has this module already solved this class?"* — here it had, and
the solution was a **named helper in the same file**; **call it**, do not re-derive the predicate. (2)
`LESSONS.md` is a **critic's checklist, not a memory**: point the hostile critic at the *classes already
documented* (comments, one-file walkers, sanity floors, non-discriminating tests) so a recurrence is caught in
the same session. (3) Every test added for a change must be **shown to fail when the change is reverted** (the
mutation proof) — a test green in **both** trees documents behaviour, it does not verify the change. (4) A
lesson is only "learned" when the **shared artefact** (a helper, a pattern) carries it, not the sentence.

*Cross-ref: L109, L118, L93, L91, L65, L104; rule 7 (LESSONS.md binds **both** ways — read **and** apply).*

## L120 — a **gate** must be at least as strict as the **runtime it guards**; porting a *measurement* tool verbatim is not porting a *gate*

**Seen in `CC-44` (2026-10-11).** The new build-time write-gate was built by "faithfully porting" the classifier
from `analysis/permission-gate/measure.js` — the right instinct per **L119** (reuse the fixed form, do not
re-derive it). That was **half** right. `measure.js` is a **measurement** tool: its predicate is
`requireFeatures\s*:` — deliberately loose, because its output is read by a **human** who classifies the
residue by hand. The **runtime** it now guards is stricter: the dispatcher fires the feature check only
`if (requiredFeatures.length)` (`apps/mercato/src/app/api/[...slug]/route.ts:207`). So the ported predicate
certified three shapes the runtime leaves **open**: (1) `requireFeatures: []` — an empty array; (2) a bare
`requireFeatures:` token inside a **regex literal** or a **TS type annotation**; (3) the
`makeCrudRoute(`/`make*Route(` **factory clause** — but `makeCrudRoute` only *relays*
`opts.metadata.requireFeatures` (`shared/src/lib/crud/factory.ts:1036`) and supplies **nothing**, so a factory
route with no `requireFeatures` is genuinely ungated. A **separate-agent hostile critic** found all three by
attacking the *predicate* (inserting an empty array, a regex, a coincidental helper), not the data.

**Why it happens.** "Faithful port" is the right instinct for a *measurer* (L119) and the wrong one for a
*gate*: the two artefacts share a classifier but have **opposite** error tolerances. A measurer prefers **no
false positives** (a human reads the output); a gate must prefer **no false negatives** (the build is the
reader, and a false PASS ships silently).

**The rule.** (1) When you turn a measuring script into a build gate, re-derive the predicate from the
**runtime condition**, not from the script — the gate's predicate must be a **subset** of "the runtime actually
enforces this". (2) A "feature carrier" is only a carrier if it **supplies** the feature — verify in the
factory's own code (`opts.metadata || {}` is **not** "supplies"), never by the factory's **name**. (3) Prove the
tightening is **free** before adopting it: measure old-vs-new classification over the real tree and show **0**
routes change (here 159 gated / 11 by-design / 170 total either way). (4) State the tool's **honest limit** — the
shapes a tokeniser cannot tell from a real declaration (a regex character class, a tuple type) — in the header,
so the gate never claims more than it proves.

*Cross-ref: L109/L119 (a coverage predicate is a security control; reuse the fixed form), L111 (a sanity floor is
a permission slip), L114 (a test that cannot catch the bug), L104 (the discovery predicate bounds the claim);
rule 0b (measure the premise in code first), rule 10 (the TOTAL quality protocol).*

## L121 — a change that **adds an enumerable object** (a route, a table, a module) drifts **every pinned count** in **every sibling coverage gate**; re-run them ALL, and expect the first failure to hide the rest

**Seen in `CC-44` (2026-10-11).** While building the write-gate, the sibling gate `crud-read-gate-coverage.test.ts`
(`CC-47`) was found **RED at HEAD** — `routeFiles.length` expected **457**, got **458** — a failure **not** caused
by `CC-44`. It was caused by **`CC-27`** (an earlier session) adding one route file
(`packages/ai-assistant/.../api/ai/agents/[agentId]/bindings/route.ts`, GET/POST/DELETE) **without re-pinning** the
count. Proven pre-existing by a `git stash` A/B (identical failure at HEAD with the working tree clean). The first
mismatch (`routeFiles`) **hid a second** (`getRoutes` 296→297 — the new route exports GET); only fixing the first
revealed the second. `crudRoutes` stayed **60** (the new route is hand-written, not `makeCrudRoute`).

**Why it happens.** The gates pin **exact** counts on purpose (**L111**: a floor is a silent-permission slip). But a
pin is only correct for the tree it was measured on. A change in **one** package (here `ai-assistant`) moves a count
in a **different** package's gate (here `cli`), which that change's author never ran. And because the assertions run
in order, the run **stops at the first** mismatch — so one failing `expect` masks the next.

**The rule.** (1) When a change adds an **enumerable** object (a route, a table, an entity, a module), treat **every**
repo-wide coverage gate as affected: run them (at least the sibling gates in the same suite dir) in the **same**
change. (2) When a pinned count fails, **do not stop at the first** — fix it, re-run, repeat until GREEN; a single
run reports only the first mismatch. (3) A pin failing is the pin **working** — the fix is to **re-measure every
count that moved**, never to loosen the pin to a floor (**L111**). (4) Record the correction where the pin lives,
with the date and the cause.

*Cross-ref: L111 (pin the exact figure), L104/L110 (a walker's discovery predicate bounds its claim), L120 (a gate
vs the runtime it guards); rule 0b (measure the premise first), rule 9(a) (own the full codebase).*

## L122 — a coverage gate that matches a call **by name** is evadable by an **alias**; a gate you just delivered is still your gate — harden it in the same change the critic names it

**Seen in `CC-57` (2026-10-11).** `binding-coverage.test.ts` scans the module for files that **dispatch an agent**
and treats a file that **also calls `resolveAgentBinding`** as GATED. Its dispatch detection was a regex on the
literal name: `/\brunAiAgent(?:Text|Object)\s*\(/`. A **separate-agent hostile critic** — one command + output per
claim — confirmed all six of my claims, then raised **one LOW**: `import { runAiAgentObject as dispatch } from
'./agent-runtime'` followed by `dispatch(...)` dispatches an agent while matching **neither** the marker list nor
the call regex, so the file would be **invisible** to the gate. The evasion was **latent** — `grep` for
`runAiAgent(Text|Object) as` and for a barrel `export … runAiAgent*` both returned **nothing** today — but it is
the very gate `CC-57` delivered, and a gate with a known walk-around is a gate that will be walked around
(**L120**: a gate must be at least as strict as the thing it guards; **L119**: a coverage predicate is a security
control).

**Why it happens.** A text scanner is the cheap, dependency-free way to enforce a structural rule across a module
(the alternative — an AST — is heavier and version-fragile). But a text scanner sees **tokens**, and a token can be
**renamed on import**. The name-matching predicate is therefore only as broad as the *spelling* it anticipates.

**The rule.** (1) When you write a name-matching enforcement predicate, resolve the **local binding name** from the
file's own **import statements** — match `X as Y` and treat `Y` as an alias of `X` — on **both** sides of the
predicate (the call you are hunting **and** the call that clears it). (2) **Pin the alias case with its own
RED-then-GREEN test** (import the entry `as` an alias, assert the scan catches it; and, symmetrically, an aliased
binder still counts as gated) so the detection cannot silently regress. (3) A critic finding on a gate you **just
delivered** is not "pre-existing, not mine" — the item exists to make that gate correct; fix it in the same
change. (4) But do **not** over-claim: state plainly whether the hole is **live** (an alias exists) or **latent**
(none does) — here it was latent, and the honest record says so.

*Cross-ref: L119/L109 (a coverage predicate is a security control; reuse the fixed form), L120 (a gate vs the
runtime it guards), L121 (a change that adds an enumerable object drifts sibling pins); rule 9(a) (own the code
you touch — including the gate you delivered), rule 13 (state the measured truth, live vs latent).*

## L123 — a `python3 - <<'PY'` heredoc through Git Bash **mangles `\n`** in string literals — write the script to a FILE instead

**Seen in the `CC-58` docs change (2026-10-11).** I added a register-hygiene note by building it in a Python heredoc and writing it with `open(p,'wb')`. The note needed literal newlines inside its string (`"…CC-58 change:" + "\n\n" + "1. A duplicate…"`). On disk the result contained a **literal `/n`** — two characters, forward-slash and `n` — where a newline was intended, so the paragraph and the numbered list collapsed onto one physical line. A **separate-agent hostile critic** caught it (`od -c` showed `: / n \n`).

**Why it happens.** Git Bash (MSYS2) rewrites an **unquoted-ish** argument/heredoc body before Python sees it: a backslash followed by `n` inside the heredoc can be transliterated to `/n` by the MSYS path-conversion layer (it treats `\something` as a path-like token). It is **intermittent and silent** — the script runs, the file is written, and only a **byte-level inspection** of the output reveals the corruption. Prose is unaffected because natural text rarely contains a lone `\n`; the damage lands precisely in the strings that *build structure*.

**The rule.** (1) **Never build content with `\n`/`\r`/`\t` escapes inside a `python3 - <<'PY'` heredoc** run through Git Bash. Write the generator to a **script file** (`Write` tool) and run `python3 script.py` — the shell never sees the escapes. (2) If a heredoc is unavoidable, build the newline from a **non-escape** — `chr(10)` — never the two-character literal. (3) **Always assert the result byte-wise** after writing structured text: `repr()` the tail, — a `\n` count, or `od -c` — so a `/n` cannot survive unnoticed. (4) This is the same family as the standing rule *"prefer script files over `python -c` heredocs"* — that rule is about **backticks / `[]` / em-dashes**; this adds **`\n` in string literals** to the mutation set. (5) Delete the helper script afterwards (do not leave scratch files in the tree).

*Cross-ref: the standing hazard note (prefer script files over heredocs); L122 (the critic found it — a separate agent verifying byte-level output is what caught it); rule 0 (only the code — here the *bytes* — is evidence).*

## L124 — a **contiguity check that compares ids in FILE order** reports a perfectly contiguous register as broken

**Seen in the 2026-10-11 docs change (the `CC-58`/`CC-59` re-classification).** After editing a register row I re-ran the register's own checks. My quick check did this: collect the `CC-n` ids **in the order they appear in the file**, then test `nums == list(range(1, len(nums)+1))`. It printed **`contiguous 1..N: False`**. The register was, in fact, **perfectly contiguous (1..59, no gaps, no duplicates)** — proven by the correct check (`set(nums)` covers `1..59`, and a `Counter` shows no id appears twice).

**Why it happens.** The register file lists its rows in **narrative / thematic order**, not numeric order (a `CC-58` row can sit above a `CC-40` row, a DONE block can cite an earlier id again, etc.). Comparing the *file-ordered* id list to a monotone `range()` therefore fails **whenever the file is not sorted by id**, which it never is. The failure is **in the instrument, not the artefact** — exactly the standing lesson *"a `0` (or a `never read`) is a claim about the instrument, not the data"*, met in its positive twin: **a `False` from a mismatched check is a claim about the check, not the file.**

**The rule.** (1) To prove **contiguity**, compare the **set** of ids to the expected set (`set(nums) == set(range(1, N+1))`), never the **sequence**. (2) To prove **no duplicates**, use a `Counter` (or `len(set(nums)) == len(nums)`) — never a positional scan. (3) To prove **order** (if order ever matters), sort first, or assert the specific ordering you actually require — and say **which** ordering you mean. (4) **When a check reports a defect, first confirm the check measures what its name claims** before "fixing" the artefact — a false `False` invites a repair that damages a healthy file. (5) Two routes: state the result from **two different checks** (set-based contiguity + set-size vs total) and require them to agree, the same standard as any number the owner will act on (rule 4).

*Cross-ref: the standing "a 0 is a claim about the instrument" lesson; rule 4 (two routes, disagreeing instruments never averaged); L121 (a change that adds an enumerable object drifts sibling pins — pins need the right *shape* of check).*

## L125 — a **fail-closed** check that keys on a **value** must **trim** it — a blank value that derives to "nobody" must not fall into the permissive branch

**What happened (2026-10-11, `CC-59`).** `resolveAgentBinding` decides whether an actor may run an agent: **fail-closed** for an `ai_worker`, **passthrough** for a human. It derived the principal via `requirePrincipal(auth)`, and `derivePrincipal` **trims** `auth.sub` — an empty/whitespace subject returns **`null`**. The binding then read `if (!principal || principal.kind !== 'ai_worker') return { bound: true, … }` — so a **blank subject** (no principal at all) fell into the **human passthrough** and **skipped the check**. A separate-agent hostile critic found it; it is a genuine **fail-open** (the branch written for "a person" also caught "nobody").

**Why it is easy to miss.** The guard *looked* fail-closed — it named `!principal` explicitly. But `!principal` was OR-ed into the **permissive** arm, not the refusing one. And the value it keyed on was **not** what the caller passed (`' '`) but what the trimmer produced (`''` → `null`) — a **second transformation between the input and the check**.

**The rule.** (1) When a check decides *permission* from a **value**, normalise the value **the same way the downstream code does** before testing it — here, trim. The tool's own guard had the identical bug (`if (!ctx.userId)` missed `'   '`), so the fix landed in **both** places. (2) Read every `if` that mixes a **refusing** condition with a **permissive** one: `!x || y` is not fail-closed; `!x` alone must route to **refuse**. (3) An **unidentifiable** actor is **nobody**, never "a person by default" — defaulting to the permissive branch is how a fail-closed design silently becomes fail-open. (4) Prove it with a **test that passes the blank value** (`'   '`), and **mutate the guard away** to confirm the test goes RED.

*Cross-ref: L103 (the test that cannot fail — a check that cannot see the defect it exists for); the standing "fail-closed" design note; rule 9(a) (own the code you touch — the second site, in `agent-binding.ts`, was found by fixing the first).*

## L126 — a **source-scanning** structural guard must **strip comments** first — a doc comment may legitimately NAME the very symbol the guard forbids

**What happened (2026-10-11, `CC-59`).** A structural test asserted the new tool pack "builds no second chain": `expect(source).not.toMatch(/\bcompileQuery\b/)`. It went **RED on a correct file** — because the pack's **doc comment** explains what it *reuses* ("`compileQuery` validates it against the canonical model"). The guard fired on **prose**, not code.

**The rule.** (1) A structural guard reads **code**, so **strip comments before matching** (`.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')`) and assert on the stripped text. (2) Prefer an **import/call** shape over a bare-name match where you can (e.g. match `business-ir/compile` inside an import), so a mention can never satisfy it. (3) When the guard fires, **read the match before "fixing" the file**: a guard that fails on prose is the defect, not the comment (L124's twin — confirm the check measures what its name claims). (4) Re-run the **mutation** after changing the guard: it must still go RED on a **real** import (it did — M6 re-proved against the final test).

*Cross-ref: L124 (a check that mis-measures reports a healthy file as broken); L122 (the guard's predicate is part of its guarantee); rule 4 (two routes).*

## L127 — an "attach it on the way out" hook placed in a method that **early-returns** attaches it to **nothing** for exactly the cases that skip that method

**What happened (2026-10-11, `CC-61`).** The command bus was to record a handler's declared contract (`risk` / `approval` / `idempotency`) on the action log. The first draft put the merge **inside `buildLog`** — the method that assembles the handler's own log metadata. But `buildLog` opens with `if (!handler.buildLog) return null`: a handler with **no `buildLog`** never reaches the merge, so a declaring handler recorded **nothing** — even though a log **is** still written from **caller-supplied `metadata`**. The suite was green, because every test command happened to have a `buildLog`. **A separate-agent hostile critic found it** by asking the question the tests did not: *what about the handler that skips this path?*

**Why it is easy to miss.** The hook was in a *plausible* place — "where the log metadata is built" — and it worked for every case the author tried. The defect lived in the **gap between two mechanisms** (the handler's `buildLog` vs the caller's `metadata`), which is exactly where a single-path test cannot look.

**The rule.** (1) When attaching data to an output, attach it at the point the output is **finalised** (here: immediately before `persistLog`, where every path converges) — not inside a **producer** that may not run. (2) Ask *"which paths reach this line, and which skip it?"* and write a test for a **skipping** path, not only the happy one. (3) A green suite over one code path is evidence about that path, not about the feature: if the claim is "**every** X is recorded", the test must include an X that takes a **different** route. (4) The `null`-means-no-key discipline is worth keeping: an undeclaring input must add **nothing** (proved byte-identical), so the feature is invisible until it is used.

*Cross-ref: L103 (the test that cannot fail); L125 (a blank value falling into the permissive branch — the same "the gap between two mechanisms" shape); rule 4 (two routes).*

## L128 — "not verified this round" is **not** "not built" — a stale `0/N` makes you build what already exists

**What happened (2026-10-11, rows 21/21b).** The appendix recorded the audit phase as `P4 ▸ 0/2 — *"no sub-part verified in code this round"*`, and the LIST showed both rows 🟡. The honest reading of that phrase is **"nobody looked"**, not **"it is absent"** — and the difference is a whole phase of work. Measured (rule 0b): `packages/core/src/modules/audit_logs/` carries a **read API**, a **viewer page**, an **export API**, a **hash-chained ledger** with a verify CLI, **retention** for the access log — the phase is **built**. Two `☐→☑` corrections, and the ONE NUMBER moved **73/321 → 75/321**.

**Why it is easy to miss.** A `0/N` with the words *"not verified"* reads like a finding. It is a **gap in the ledger**, and it is indistinguishable at a glance from a real zero. The whole register's value is that a `☑` names its evidence; the corresponding discipline is that a **`☐` must name whether it was *measured absent* or merely *unmeasured*** — and the two demand opposite next actions (build vs. measure).

**The rule.** (1) When a `☐` carries *"not verified / carried / claimed by docs"*, **the next action is a measurement, not a build** — write it as *"UNVERIFIED — go measure"* in your head, and measure before planning anything. (2) Before building any row, grep the code for the **feature's own vocabulary** (here: `audit_logs`, `ledger`, `rotate`, `export`) — a built phase leaves many traces. (3) When the measurement finds it built, the fix is a **rule-13 correction with evidence**, not a build; and the ONE NUMBER moves on a **correction** exactly as it does on a build. (4) Then ask the **critic** to falsify the "it is built" claim — the stakes are inverted here (a false "built" is worse than a false "missing"), and it is the one claim you must not self-certify.

*Cross-ref: L124 (a check that mis-measures reports a healthy file as broken — the mirror image); the standing "a `0` is a claim about the instrument" lesson; rule 0b (measure before you build); rule 13 (correct it everywhere it was copied).*

## L129 — a test that asserts on a value's **runtime keys** does **not** defend a type's **shape** — an added *optional* field is absent from every instance, so it passes silently

**What happened (2026-10-11, row 28 / R28-1).** The port declares `AiRuntimeSecretRef = { scope; name }` — a secret **reference**, never a value. The test "proved" it by `expect(Object.keys(ref).sort()).toEqual(['name','scope'])`. A separate-agent hostile critic added a field — `value?: string` — to the interface and re-ran: **the suite stayed GREEN.** The assertion reads an **instance**, and an *optional* field is simply **absent** from any instance you construct, so the check cannot see it. The critic did the same with `authorityOverride?` on the envelope: green. **Two tests that looked like guards were decorative.**

**Why it is easy to miss.** `Object.keys(x)` *feels* like "the shape of x". It is the shape of **one value**, and an optional field is invisible in it. The assertion also reads as a strong, specific check — the danger is that it looks **stronger** than it is, so nobody re-examines it. The real defect class is worse than a missing test: a **false sense of coverage** on a security-adjacent rule ("no field can hold a secret").

**The rule.** (1) To pin a **type's** key set, assert at the **type** level, not on a value: a key-exactness guard —
```ts
type IsExactKeys<T, K extends string> = [keyof T] extends [K] ? ([K] extends [keyof T] ? true : false) : false
const ok: IsExactKeys<AiRuntimeSecretRef, 'scope' | 'name' | 'purpose'> = true
ok satisfies true   // `tsc` fails if a field is added, removed, or made optional
```
— because `keyof T` changes the moment **any** field is added, optional or not. (2) The proof of a type-level guard is a **mutation run**: add the forbidden field, run `tsc`, confirm it goes **RED**, restore (md5). A type guard is only real once a mutation has proved it. (3) Prefer the guard **in the type's own file or a type-test**, and note that `tsc` must **include the test file** in the same invocation — compiling the source alone does not run the guard. (4) When a critic shows an assertion was vacuous, do not merely strengthen that one test: **re-derive the guard for the whole class** (here: the envelope key set too got an `IsExactKeys` guard), then re-run **the critic's own mutation** and show it now goes RED.

*Cross-ref: L124 (a check that mis-measures reports a healthy file as broken); L127 (the test that cannot fail); L103; rule 10f (the hostile critic; a mutation must go RED); rule 4 (two routes).*

## L130 — a **flaky** test is a defect in the test, and a **heisenbug fixed by logging** is proof the test depends on timing — remove the timing, do not tune it

**What happened (2026-10-11, `CC-68`, during the row-28 tracker work).** `mcp-dev-key-resolution.test.ts` failed ~1 full-suite run in 2–3 (always the `fails closed when the config path is replaced after open/validation` case) while passing every time in isolation. The first diagnosis named the wrong suspect (a `llm-bootstrap` import-time throw) — see the *second* half of this lesson — and the wrong **framing** ("not my change, not a hole"), which the owner struck down under rule 9a: *everything in the codebase is mine to fix or schedule, and a flag without a full report is not a report.* The real defect, measured: the test drove a **real file swap** (`rename` the path, put a different file in its place) from inside mocked `stat`/`open`, and that swap **raced** the function's own `Promise.all([fileHandle.stat(), lstat(path)])`. Whether `lstat` observed the pre- or post-swap inode depended on **microtask order** — so the outcome was a coin toss. **The production code was correct throughout**; the test was non-deterministic by construction.

**The trap inside the trap.** The rewrite that swapped the file *inside the mocked `lstat`* (so it "always" ran before returning) **still flaked** in the full suite, and — decisively — it **passed 4/4 with `console.log` added**, failing again once the logging was removed. **A heisenbug that logging hides is not fixed; it is timing-sensitive.** Tuning a race by moving the swap earlier, or by adding a `await` until it "usually" wins, is not a fix — the next scheduler can reorder it. The only fix is to **remove the timing dependency**: state the mismatch **directly** rather than racing real filesystem operations to produce it (mock the descriptor to report one `{dev, ino}` and the path another — no rename, no race, no host-inode assumption).

**A second trap: the "deterministic" rewrite was still vacuous.** The first no-race version spread a real `Stats` object (`{ ...(await realStat()), dev, ino }`) — which **drops the prototype**, so `isFile()` became `undefined`, the function refused for the *wrong reason*, and the test **stayed green even with the identity check mutated away**. It only became a real guard after (1) keeping the real `Stats` object and overriding `dev`/`ino` via `Object.defineProperty`, and (2) **running the mutation** (delete `isSameFile(...)`) and seeing it go **RED on both platform variants**. *A test you have not mutated is a test you have not tested* (L129).

**Why it is easy to miss.** (1) A flake "passing in isolation" reads like an environment problem, so it gets filed as environmental and left — which is exactly how a real test defect survives for months. (2) An intermittent failure is the *hardest* thing to attribute, so the instinct is to find a plausible cause and move on; here the first plausible cause was wrong, and only running the full suite **five times** and reading the *failing test name* settled it. (3) A test that refuses for the wrong reason, and a test that refuses for the right reason, both print GREEN — the difference is invisible until a mutation.

**The rule.** (1) When a test fails intermittently **only under the full suite**, treat it as a **test defect first**: read the failing *test name* (not the first error in the log), reproduce it, and drive the failing condition **deterministically**. (2) If adding a `console.log` makes it pass, you have proved it is a **race** — delete the race (assert the condition directly), never the log. (3) A test that produces a condition by **racing real I/O** against the code's own async chain is non-deterministic by construction; prefer to **state the condition in the mock** (an inode mismatch, a flag) over producing it with the filesystem. (4) **Mutate every test you write**: remove the exact line it claims to defend and require RED. (5) Do not reason from a **log line to a cause** without a stack: a `WARN`-logged `TypeError` inside a `try/catch` is *not* a crash — I mis-attributed the flake to a caught warning (`llm-bootstrap.ts:40`) before finding the real, uncaught path. (6) Rule 9a framing, restated because it was broken here: "pre-existing / not my change / not a hole" is **not** a disposition; the item is **fixed now** or **scheduled with its trigger named** (rule 8 / rule 15).

*Cross-ref: L129 (a test you have not mutated is not a test); L127 (the test that cannot fail); L103; `CC-68` (this item); `CC-19` (the "passes alone, flaky in the suite" environmental class — this item is the *non*-environmental case, which is why it had to be fixed); rule 9a (own everything); rule 15 (solve the straightforward now).*

## L131 — moving a dispatch **behind a door** keeps the security **gate at the door's callers**, and an adapter that **starts a run must also close it**

**What happened (2026-10-11, `CC-67`, the last three callers moved onto the runtime port).** Row 28 builds **one typed door** for the AI engine; `CC-67` moved the **last three direct callers** (the chat route's AI-SDK text path, `api/ai/run-object/route.ts`, and the in-process `lib/business-ir-author.ts`) onto a **new** adapter that fronts the platform's **own in-process runtime**. Two distinct traps surfaced, both **created by the move itself**, and both were caught only because the critic was a **separate agent** told to attack every claim.

**Trap 1 — the move silently **deleted a security gate and created an un-gated dispatcher**. The binding gate (`CC-27`/`CC-55`/`CC-57`) is enforced by a **static scan** (`binding-coverage.test.ts`) that fails any **new** agent-dispatch site which does not `resolveAgentBinding`. Moving the dispatch *out* of `business-ir-author.ts` and *into* the adapter did two things at once: (a) the old in-process dispatch site disappeared (so the test's `IN_PROCESS_DISPATCH_SITES` pin, and the caller-side gate, went stale), and (b) the **adapter itself** became a new dispatcher that named the engine directly — exactly the shape the gate exists to catch. **The fix was not to weaken the gate but to re-site the pin:** the two adapters are now declared **the door** (excluded from the scan, like the port's own definition), and two new pins require that **every caller of the door still consults the binding** and that the **adapters never grow a competing gate of their own**. *A dispatch moved behind an abstraction does not move the security requirement with it — the requirement stays at the **caller**, and the coverage check must be re-pointed at the new shape, never loosened to make the build pass.*

**Trap 2 — a run that is **started** but never **closed** is a state bug that reports WRONG.** The first cut called `startRun` and **never `completeRun`**: the run stayed open forever, so a later `cancelRun` on a finished run would falsely report it `cancelled`. (R28-4 had just taught the *opposite* half — that a run must be closed at the door — and `CC-67` introduced a new `startRun` site that forgot it.) The second critic then found a **latent twin**: an engine call that returns a **bodyless** `Response` skipped the close too. Both fixed (close in the `finally` **before** `writer.close()`; `failed` on engine error; close even with no body), each pinned by a test whose mutation (remove the close) goes **RED**.

**The nuance that made this row hard to score honestly.** After `CC-67`, **every production caller walks through the door** — yet the row's box stays `☐`. The row's sentence is *"**no other** code talks to it directly"*: a claim about the **whole codebase**, and a whole-codebase claim is true only when it is **proven** (R28-5), not when the last *known* caller is moved. *"All the callers I found are behind the door"* and *"nothing bypasses the door"* are different statements; only the second completes the row, and it needs a **mechanical** check.

**Portability traps inside the work.** (1) The engine returns a **single-use `Response`** whose body the browser consumes — an adapter that emits stream events by **reading `response.body`** leaves the client with nothing; the fix is to **stash the original `Response`** and hand it back (`responseForRun`), never draining it (a `getReader` spy asserts `readCount()===0`). (2) A **pure** helper (here `resolveLoopBudgetPreset`, a switch over a literal) may be re-exported from the adapter so the route names no engine module — but only after **checking it is pure**; re-exporting a symbol that drags the engine in would defeat the whole point. (3) When an original caller passed an optional dependency **only when defined**, an edit that passes it **always** is a silent behaviour change — guard the spread.

**The rule.** (1) Moving a dispatch behind a door: **re-site** the coverage/gate pin to the new shape (door = the excluded implementation; callers = the gated sites), never delete or loosen it; and add the **inverse** pin (the door must not gate itself). (2) **Every `startRun` needs a `completeRun`**: a run is closed on *every* exit path — success, engine error, and no-body — with the honest status, and the close happens **before** the consumer is closed (no race). (3) A whole-codebase claim (*"nothing else does X"*) is completed by a **proof**, not by moving the known callers; name the honest exceptions (`src/index.ts` = a re-export; the registered bypass) rather than pretending they are absent. (4) Never drain a single-use stream to inspect it. (5) Ask the critic as a **separate agent** with *"attack all five claims"* — both defects here were invisible to the author and obvious to the adversary.

*Cross-ref: L127 (an "attach on the way out" hook in an early-returning method — the same "a path skips the one place that fixes it" shape); L125 (a value that derives to "nobody" falls into the permissive branch — re-siting a gate must not open a hole); L121 (a change that adds an enumerable object drifts sibling pins — here the *coverage* pin, not a key set); rule 10f (the hostile critic; a mutation must go RED); rule 4 (two routes); rule 8 (schedule the remainder with its trigger — R28-5); rule 9b (challenge the task: the honest verdict was *no box moved*, because the row needs the proof, not just the moves); rule 13 (a falsified premise is corrected everywhere it was copied — §D's `B-05`/`Port`/`N-8` wording).*

## L132 — a structural scan is only as strong as its **file filter and its detector**: a `.ts`-only walk misses every `.tsx`, a single-line matcher misses half the import forms, and a **mutation that does not apply** proves nothing

**What happened (2026-10-12, `R28-5`, the "nothing bypasses the door" check for row 28).** The check is a whole-package structural scan: walk every production file, strip comments, find every module edge to an AI engine, and assert the only engine-reaching files are the door, the engines, the barrel and two named exceptions. It was green, 11 mutations "passed", and the author believed it. **A separate-agent hostile critic found three real defects, all confirmed by command:**
- **(a) `.tsx` was invisible.** `walk()` filtered `entry.endsWith('.ts')` — so **36 production `.tsx` files** (React components, real production code) were **never scanned**. The suite's *central* claim — *"nothing outside the door reaches an engine"* — was **unproven** for a whole file class. A component could `import { createOpenCodeClient } from '../lib/opencode-client'` and the check would stay green.
- **(b) the detector was half-blind.** It matched only single-line `import X from '<spec>'`. **Multi-line** imports, **side-effect** `import '<spec>'`, **`require('…')`** and **dynamic `import('…')`** were all missed — five of six real module-edge forms.
- **(c) a header claim was false.** The comment said the engine set was *"derived, not typed"* — it was a **hard-coded three-element array**. A genuinely new third engine file would not have been caught by the claim's own promise.

**The subtlest finding — a fix that can be silently reverted is not a fix.** After adding `.tsx` to `walk`, the mutation *"revert the `.tsx` filter"* still read **GREEN** — because, with no `.tsx` importer present in the tree, reverting the filter changed nothing observable. **Nothing in the suite noticed the `.tsx` support was gone.** The fix was a **self-check test** (`the scan really visits .tsx production files`: assert the walk yields at least one `.tsx`, and that a non-`__tests__` one exists so the assertion is not vacuous). Only then did the revert go **RED**. *A capability that no test observes is a capability that will be deleted by the next tidy-up.*

**The mutation-script trap — a mutation that does not APPLY is not a mutation.** Round 1 of the proof reported **4 "STILL GREEN"** results that were **the script's fault, not the test's**: T1 added a file that was **already** in the exception set (a no-op); T3 used `expect(x.length).toBeGreaterThanOrEqual(0)` (vacuously true) and did not pair it with the condition that would bite; T4 stripped comments on a file whose engine mention was a **bare backticked name** the regex never matched anyway; T7 **deleted the test's own assertion** (which no test can defend against). Three fixes made each mutation **load-bearing**: pair a wide exception with a file that then hides a second import; pair "stop stripping comments" with a **commented-out real import**; pair "neutered derivation" with a real new engine file and **keep the assertion** (the mutation is the *code*, never the *test*). After that, **12/12 mutations were RED.**

**Why a critic only half-helps if it is not told the right things.** The critic was told to attack every claim and to **produce a command + output per claim** — that is the only reason the `.tsx` gap surfaced (a claim *"we scan the whole package"* is falsified by one `ls` showing `.tsx` files). A critic that accepts prose cannot find a filter someone forgot.

**The rule.** (1) A structural scan must **enumerate the file classes it claims to cover** and **assert it visits each** — the default filter (`.ts` only, or ignoring `.tsx`/`.mts`/`.cts`) is an unguarded assumption, and a scan that silently narrows its own input is worse than no scan (it certifies a hole as proven). (2) A source-edge **detector** must handle **every** syntactic form of the edge it looks for (static, re-export, side-effect, `require`, dynamic import), not the first one that occurs to you. (3) Any **claim written in the header must be true of the code** — *"derived, not typed"* is a claim, and if it is typed, either make it derived or say "declared, then checked"; do not leave an overclaim where the next reader trusts it. (4) **Every mutation must be verified to actually change the artefact**, and every mutation must be paired with the **tree condition** that lets it bite — an unapplied mutation reads GREEN and looks like a weak test. (5) The mutation is the **code under test**, never the test's own assertion — replacing `expect(A).toEqual(B)` with `expect(true).toBe(true)` proves nothing about the code. (6) A **fix that closes a blindness needs its own self-check test**, or it can be silently reverted by a later edit that never sees it.

*Cross-ref: L118 (a structural coverage gate that scans only part of the tree is blind to the rest — this is that lesson applied to a scan that scanned the wrong **file classes**); L126 (a source-scanning guard must strip comments — the sister blind spot, here also paired with the case it really guards); L122 (a gate matched by name is evadable by an alias — same "the detector must be complete" family); rule 4 (two routes — the `.tsx`-evasion and the `.ts`-only mutation were two independent routes to the same defect); rule 7 (a lesson binds both ways — written the same change it was learned); rule 10f (the hostile critic, with a command per claim); rule 13 (a falsified premise — the plan's `CC-69` file location — corrected everywhere); rule 15 (solve the straightforward now: the `.tsx` self-check was added immediately, not scheduled).*

## L133 — **"delete X" is not a task until its replacement exists**: measure whether X is the *only* thing that works before you delete it — and a **"blocked" verdict must be attacked too** (it is convenient to declare work blocked)

**What happened (2026-10-12, `R28-6` "delete OpenCode" for row 28).** The stored task read: *"Remove OpenCode (its client, its handlers, its `OPENCODE_URL`) once the chat route is proven on the door."* The prerequisite it named ("R28-3 + `CC-67`") was **met** — so the task looked queued and startable. **I measured first (rule 0b) and challenged the task before executing it (rule 9b), and the task fails its own premise:**
- **The replacement does not exist.** `git ls-files | grep -i hermes` → **empty**; `find . -iname '*hermes*'` → **empty**. The engine the architecture doc says will *displace* OpenCode (**Hermes**) has **no code in this repository at all**.
- **X is the only thing that works.** The live chat route is wired to OpenCode (through the door, `createOpenCodePortAdapter`), and OpenCode runs as a **Docker service the platform points at** (`OPENCODE_URL`, default `http://localhost:4096`). Deleting it removes the **only** engine that can answer a chat.
- **The document states the gate verbatim** (`ARCHITECTURE-hermes-integration.md` §11): *"It is still load-bearing … so it stays until **N-8** rewires the platform chat. The decision settles **what replaces it**, not **when**."* Its §9 puts Hermes at **Phase 2+** — a **different workstream** from this row.

So `R28-6` was **not a buildable task**, and the honest verdict was **"trigger-blocked — do not build."** The prerequisite it named was **not sufficient** ("prove the door" ≠ "have a replacement"); that premise was corrected wherever it was copied (rule 13).

**The name collision — a deletion must scope itself by ROLE, not by STRING.** "OpenCode" named **two unrelated things**: **the engine** (`opencode-client`/`handler`/`port-adapter` + `docker/opencode`) — what the task deletes — and a **naming vestige** (`shared/.../opencode-provider.ts`, the `OPENCODE_*` env names, `api_keys.opencodeSessionId`) which is the platform's **own model-provider config** and chat-session binding. **The vestige is load-bearing** — `api/route/route.ts` and `settings/route.ts` import it, `model-factory.ts` reads `OPENCODE_PROVIDER` — so a naive *"delete everything matching `opencode`"* would **break the platform's own model selection.** A deletion by string is a deletion of things you did not read.

**A "blocked" verdict must itself be attacked — it is the most convenient claim there is.** Declaring work blocked is *self-serving*: it costs nothing, ships nothing, and excuses the session. So the verdict was handed to a **separate-agent hostile critic** asked to **falsify** it. It attacked five sub-claims and **upheld every one** (each with a command + output), and its verdict was *"SOUND — no safe path to build `R28-6` now."* **Crucially, it also named the one alternative the author had understated** — the chat path *could* be repointed at the platform's in-process runtime — and correctly classified it as a **behavioural rewrite** (SSE-events vs an AI-SDK `Response`) that is exactly **`N-8`'s** charter, not `R28-6`'s. That alternative was **recorded in the register, not buried**: a finding that omits the path the critic found is not a complete report.

**The rule.** (1) Before any **deletion** task, measure whether the thing to be deleted is **the only thing that performs its function** — a deletion is a task only once a **replacement exists and is wired**; *"its prerequisite is met"* is not the same as *"there is something to delete **to**."* (2) A task whose text is a **string match** ("remove X") must be **scoped by role** first: enumerate every file that matches the string, classify each as **the thing** vs a **namesake**, and never bulk-delete a namesake that is load-bearing. (3) A **"blocked / do not build"** conclusion is a claim like any other — give it the **same hostile-critic treatment** as a build, because it is the claim most easily made in bad faith (by yourself); and a criticism that **upheld** the verdict but **found an alternative** is a *better* result than one that simply agreed — **record the alternative**, ranked, with why it is not the move now. (4) The **honest reading of the scoreboard** when blocked is **no box moved** — `N-8`'s delete half stays `☐`; ticking it because the *rewire* half is done would be a lie of the "one caller out of three" class (L131).

*Cross-ref: L131 (a door's claim is completed by a proof, and the honest verdict can be *no box moved* — the sister lesson, same row); L128 (`"delete second"` — the order is rewire-then-delete, and here the rewire target itself does not exist yet); L125 (a value that derives to "nobody" must not fall into the permissive branch — reading a task's *name* instead of its *role* is the same class of shortcut); rule 0b (measure before building — the deletion was measured, not assumed); rule 9b (challenge the task — the challenge *was* the deliverable this turn); rule 11 (the owner decides *what* — do not pre-empt the Hermes decision by picking the engine early); rule 13 (correct a falsified premise everywhere it was copied — the plan's insufficient prerequisite); rule 15 (solve the straightforward now — the honest disposition of a blocked task is to register it with its trigger, this change); rule 8 (schedule the remainder in `COMPLETION-CALLBACKS.md` — `CC-72`); rule 10f (the hostile critic, a command per claim).*

## L134 — a **promised correction is not a correction**: a "fix it in the same change" note in an impact table is **work**, and work written in a plan is not done until a commit names the file — audit the plan's own promises

**What happened (2026-10-12, the row-28 completeness audit).** The owner asked: *"verify that all row 28 steps are done and completed properly — because some of the steps you did not report back to me that you worked on."* The **code** was sound: all six sub-rows (`R28-1`…`R28-5` + `CC-67`) verified against the live files, and the whole `ai-assistant` suite re-ran **118 suites / 1607 tests green** on the committed tree. But checking the plan's **own promises** — not just its status column — found one that was **silently dropped**:

`PLAN-ROW28-agent-runtime-port.md` **§5 (Impact)** carried a row: *"`ce.ts`'s comment-only `AiRuntimePort` — Low — a false 'it exists' statement — **Correct it in the same change (rule 13)**."* **No row-28 commit touched `ce.ts`.** Measured: `git log -- ce.ts` showed its last change was an earlier AH-1 slice (`b5a33c76`), and `git show --stat` for each row-28 commit (`513bad41`, `743156dd`, `61776eae`, `5ec1c83f`, `6c3db27c`, `ab2f835a`) named `ce.ts` **zero times**. So the comment still said the port *"(`invoke`/`status`/`cancel`) is `L-01`/`AH-5`"* — **unbuilt, owned elsewhere** — while the port had existed since `R28-1`. A reader trusting that comment would believe there is no runtime port. **Fixed** (code `b8f53cb0`), comment-only, suite re-run green.

**Why it survived six clean sub-rows.** Each sub-row's *own* record was accurate — the port was built, the adapters were built, the callers moved, the proof shipped. The dropped item was a **side-task**, named in an **impact table**, not in a status column. Status columns are audited; side-promises in an impact table are **read once when written and never re-read**. The "done" checks looked at the sub-rows; nobody re-opened §5.

**The rule.** (1) A plan's **"do X in the same change"** line is **work**, committed as such — it belongs in the same checklist the sub-rows are in, or it will be dropped exactly as this one was. (2) A **completeness audit greps the plan's own promises** (`"in the same change"`, `"correct it"`, `"must be updated"`, `TODO`) and verifies each against `git log <file>` / `git show --stat` — *"the status says done"* is not the same as *"every promised edit landed."* (3) When a plan promises a correction because a comment/claim is **false**, the false claim is a **defect** (rule 13), not a nicety: left standing, the next reader trusts it. (4) The audit's honest result is permitted to be *"all sound"* — but only after **measuring**, not after reading the status column.

*Cross-ref: rule 13 (a falsified premise is corrected everywhere it was copied — here the correction was promised and not made); rule 9a (own the FULL codebase — the side-task was mine and was dropped); rule 10e (name what a change can touch — the row was named, then ignored); rule 15 (solve the straightforward now — the stale comment was fixed on discovery, not scheduled); L131/L133 (the sister "the honest verdict is no box moved / the task is blocked" lessons — an audit that finds one real gap and fixes it is the point of the audit).*

---

## L135 — **a snapshot with no `.git` still has a provenance**: a downloaded source archive can carry its own upstream revision, so *"we cannot know which revision this is"* must be measured, not assumed

**What happened (2026-10-12, Hermes §9 Phase 0 "pin & map").** The architecture said the Hermes source revision *"cannot be recovered; it must be created."* Measured: the Hermes source sits in the tree as a **zip extract with no `.git`** and `version = "0.0.0"` — so on the surface, no revision. But `library/ai/hermes-agent-main.zip` carries a **commit hash in its own archive comment**: `unzip -z <zip>` → `eb044063235fbf7a4e68dd2970ade05dbe637ff3`. So the pin could carry **real provenance** (a revision) *and* **proof** (a content digest), rather than a made-up identifier. The pinned directory was also verified **byte-identical to the zip** (`unzip -p <zip> <member> | md5sum` matched the on-disk file; 17,201 files each).

**Why it matters.** *"Cannot be recovered"* is an **assumption about the packaging**, not a fact about the content. A `git archive`/release zip is exactly the case where the revision travels **inside the archive** (comment, `.gitattributes` `export-subst`, a version file). Declaring the revision unrecoverable **without opening the archive's metadata** would have produced a pin with no provenance — a digest that proves *"this file is unchanged"* but cannot say *"this is Hermes at commit X."*

**The rule.** (1) Before accepting *"the revision cannot be recovered"*, **open the archive's own metadata** — `unzip -z`/`unzip -l` (comment), a `VERSION`/`SOURCE_DATE_EPOCH`/`.gitattributes` `export-subst` marker, or a build-stamp file. (2) A pin should carry **both** provenance (a revision, if any) and proof (a content digest); if only the digest is recoverable, say so explicitly. (3) Verify the extracted directory against the archive **by hash**, not by eyeball — a "pinned" copy that silently differs from its own zip is worse than no pin.

*Cross-ref: L128 ("not verified this round" is not "not built" — the same error shape: an unmeasured *"cannot"*); rule 0b (measure first); rule 13 (the architecture's *"cannot be recovered"* was corrected where copied); `HERMES-PIN.md` §1.2.*

---

## L136 — **two copies of one thing in the tree is a defect even when each is "the same software"**: a pin must pick ONE and say why, because "which one did we read?" has a single answer or none — **and when a THIRD arrives, the pin must re-measure, not defend its first choice**

**What happened (2026-10-12, the same Phase 0).** The Hermes source exists in the tree three times.
**First measured:** `library/ai/hermes-agent-main/` (17,201 files, mtime 2026-10-03, `pyproject.toml` md5
`a4ce871d…`) and `hermes-agent-main/` (17,367 files, mtime 2026-10-05, md5 `594dea19…`) — **not** byte-identical:
a **later, different** extract of the same product. Both gitignored; nothing said which was authoritative. This
is exactly the architecture's own **§10 "source-versus-image divergence"** risk — but sitting in **our** tree,
not the product's. The pin picked the first, `library/ai/hermes-agent-main/`.
**Then, the same day:** the owner supplied a **third** copy at the root (18,248 files, revision `3569e846…`) and
renamed the old root copy `hermes-agent-main-older/`. Measured against upstream, the *first* pin was **3,290
commits behind** the new one (2026-10-03 → 2026-10-12). The pin **moved** to the newest.

**Why it matters.** A digest over "the Hermes source" is meaningless while there are two — or three. Worse, a
reader who opens *any* of the other copies would find different code and different docs, and all would look
correct, because none was labelled. And the *first* fix ("pick the one in the library") was itself a trap: it
was a good reason only while there was **one** candidate; once a second arrived, the real question became
**"which is newest?"**, and the answer moved. **A pin defends a choice by re-measuring its premise, not by
restating it.**

**The rule.** (1) When the same third-party source appears in more than one place, **the measure is a diff, not a
glance** — compare file counts, mtimes, a few file hashes, and the whole-tree digest; "same product" is not "same
snapshot." (2) A pin **names exactly ONE copy** and states why; the others are left in place but explicitly marked
**not the pinned one**. (3) Answer *"which revision are we reading?"* in **one** place a newcomer can find. (4)
**When the inputs to the choice change** — a newer copy arrives, upstream moves — **re-measure the choice**
(which copy is newest? how far behind is the pin?) and, if it has moved, re-pin *and update the harness and the
doc in the same change*, so the recorded digest and the ticked box still point at the same thing.

*Cross-ref: rule 12 (judge the committed/invariant copy, not the rendered one); L135 (a snapshot carries its own
provenance — the copies differ *by revision*, which is how the divergence was caught *and* how the new one's
"newest" was proven); rule 13 (a falsified premise corrected everywhere it was copied — the "two copies" doctrine
became "three", and the pin's own premise was re-measured); rule 0b (measure first; the 3,290-commit gap was
measured, not assumed); `HERMES-PIN.md` §1.1 / §1.1.1.*



---

## L137 — **a measured "the concept does not exist" that greps ONE module is a claim about that module, not the platform**: over-generalising a true narrow scan is how a false blocker survives for a day and gets deferred as "large"

**What happened (2026-10-12, measuring `CC-51` before building it — rule 0b).** `CC-51` is row 16's team-leg of
own/team row scope. It had been deferred on a documented measurement: *"B additionally needs a real `team` concept
the platform has never had — no team entity, no membership, nothing on `auth` (measured 2026-10-11)."* The scan
behind it was real and *true*: `grep -rni "team" packages/core/src/modules/auth --include=*.ts` → only incidental
matches, and `AuthContext` carries `{ sub, tenantId, orgId }`. But the **conclusion drawn from it** — "so the
platform has no team concept, and B must invent one" — was false. Re-measured 2026-10-12 across the whole
codebase: `packages/core/src/modules/staff/data/entities.ts` declares `StaffTeam` (`staff_teams`),
`StaffTeamRole` and `StaffTeamMember` (`staff_team_members`, carrying **`team_id` and `user_id`**), with API
routes, commands, backend pages and seeds — **236 files**, and the *only* team concept in the tree. The team-leg's
"large" half (entity + membership + schema + UI) was already built; what remained was the row-scope plumbing. The
false premise had been copied into **four** documents and had gated the task for a day.

**Why it matters.** A negative search scoped to one module reads as a platform fact once the module name drops out
of the sentence. *"No team concept in `auth`"* became *"the platform has never had a team concept"* — and that
phrasing is what a later session reads as the blocker. The cost is not the wrong words: it is that a task is
sized **"large — invents a concept"** instead of **"small — wires a declared dimension onto an existing one"**,
so it never gets picked, and the module that would have answered the question sits one grep away.

**The rule.** (1) **A negative measurement must record its scope** — write the path you searched (*"in
`modules/auth`"*), not just the result, and never let the scope drop out of the sentence it is reused in. (2)
**Before deferring a task as "invents a concept", search the whole codebase for that concept's nouns**
(`grep -rn "tableName: '[^']*<noun"` over `packages/*/src`, plus the entity/API/command/UI surfaces) — one grep,
minutes. (3) **A "never had" claim is a falsifiable premise under rule 13**: when it is falsified, correct it in
*every* document that copied it, in the same change — here, four places. (4) When a premise flips from "must
invent" to "must wire", **re-size the task out loud** — that is the difference between a deferred item and a
pickable one.

*Cross-ref: L135/L136 (the same day's other two falsified premises: a snapshot's provenance assumed absent, and a
pin defending its first choice); rule 0b (measure first — the re-measure is what caught it); rule 13 (corrected
everywhere it was copied); rule 15 (solve the straightforward now — the correction was made immediately, the
*decision* it exposed was handed to the owner, which is rule 11); `COMPLETION-CALLBACKS.md` `CC-51`;
`PLAN-ROW16-own-team-row-scope.md` §7.2.*

---

## L138 — **a type gate that has never run is not a gate**: `tsc -p .` returning TS18003 for a package means nobody has type-checked it in living memory, and the moment you make it run, expect the errors that were always there — **measure a gate's existence before you trust its silence**

Measured 2026-10-12 while discharging `P2-2`'s *"`tsc` clean"* exit gate (`PLAN-HERMES-PHASE2-one-tenant-one-tool.md`).

**What happened.** `node node_modules/typescript/bin/tsc -p packages/ai-assistant/tsconfig.json --noEmit` returned **one** error: TS18003, *"No inputs were found in config file"* — not a type error, a **config** error. The package's only `tsconfig.json` extended the **root** `tsconfig.json`, whose `exclude: ["node_modules","apps","packages"]` is resolved **from the extending config's directory**, so from `packages/ai-assistant/` the pattern `packages` matched **the package's own `src/**`**. Twenty of the twenty-one package/app configs in the repo extend `tsconfig.base.json`; this one was the sole anomaly, and it had been harmless-looking for as long as nobody ran the command.

**Why the silence lasted.** Three commands could each have shown it, and none did: the **build** is esbuild (`node build.mjs`; no type-check, 238 entry points, "built successfully"), there was **no `typecheck` script** (unlike `packages/shared`), and **jest does not type-check in this repo** — `agent-runtime-loop-phase0.test.ts` carries 17 `tsc` errors and jest runs it 34/34 green. So the gate did not degrade; it never existed, and every "tests pass, build passes" was true while saying nothing about types.

**Fixing it exposed 92 pre-existing type errors in 27 other `__tests__` files** — zero in production code, and both files the change added were clean. That is the shape to expect: **errors accumulate behind a gate that never ran, and they are never evenly distributed.**

**The rules.** (1) **Before trusting a gate's silence, run the gate and look at what it actually checked** — a TS18003/TS6053/"no inputs" result is a *missing* gate, not a green one, and it must be fixed before the green means anything. (2) **When a package's tsconfig extends a config that excludes it, the exclusion still applies** — `exclude`/`include` survive `extends` and resolve relative to the config they came *from*; check the 20 siblings before assuming one is right. (3) **Assert a gate is real by pointing a known-bad file at it** — here, one file with 17 errors running green under jest while failing under `tsc` is the proof that jest was never the type gate. (4) **A newly-working gate is a finding, not a nuisance**: schedule what it exposes (`CC-73`) and resist the two-line escape hatch (`exclude __tests__`, which is what `packages/shared` already does) that would hide exactly the class of defect a hostile critic had just found.

*Cross-ref: L139 (the same measurement's second lesson: a stale incremental cache lied three ways); `CC-73` (the 92 errors, scheduled); `PLAN-HERMES-PHASE2-one-tenant-one-tool.md` §4 `P2-2`; rule 0b (measure the gate, do not assume it); rule 15 (the tsconfig half was straightforward and was fixed in the same change).*

---

## L139 — **`--incremental` lied three times about the same file set**: a stale `*.tsbuildinfo` produced 6,551 → 36 → 95 errors for one unchanged config, so a type measurement is only a measurement when the cache is off

Measured 2026-10-12, immediately after L138, in the same package.

**What happened.** The same `tsc -p packages/ai-assistant/tsconfig.json --noEmit`, run three times against one unchanged tsconfig, reported **three different totals**: **6,551** errors (the first run after the config fix), then **36** (a re-run), then **95** (a run with `--incremental false`). No file changed between them. The package directory held **seven stale `*.tsbuildinfo` files** (`tsconfig.tsbuildinfo`, `tsconfig.cc5*.tsbuildinfo`, `tsconfig.typecheck-tmp.tsbuildinfo`, …), and `incremental: true` is set in `tsconfig.base.json`.

**Why it matters.** A gate whose output is not reproducible cannot discharge anything. Had the 36-error run been taken at face value, `P2-2`'s gate would have been declared green on a **false** reading — and the false reading was the *quietest* one, which is the direction cache errors drift in.

**The rules.** (1) **Any `tsc`-based measurement must disable the incremental cache** (`--incremental false`, plus a `--tsBuildInfoFile` outside the repo) or it is not a measurement — and record that in the gate's own text, so the next run does not have to rediscover it. (2) **Two runs disagreeing is a measurement environment defect, not a code fact**: stop, find the cache, then re-measure. (3) **`git check-ignore` the artifacts a probe creates and delete them** — the probe configs used here left `tsconfig.probe*.tsbuildinfo` files behind, and a leftover cache is the next run's lie.

*Cross-ref: L138 (the same measurement's first lesson — the gate that never ran); `CC-73`; rule 0b (a measurement that cannot be reproduced is not one).*

---

## L140 — **A compose service's network is an ownership claim, not a string**: I copied a network name from a *different* compose file and put my worker alone on it while the live stack ran on the next one — and my file could have deleted a network it did not own

Measured 2026-10-12, discharging `P2-1` (`PLAN-HERMES-PHASE2-one-tenant-one-tool.md` §2.7).

**What happened.** `docker-compose.hermes.yml` declared `mercato-network: {name: mercato-network, driver: bridge}`
— a name copied from `docker-compose.yml`, which hardcodes it. The measurement falsified the copy:
`docker network ls` returned **two** mercato networks, and `docker network inspect` showed my
`mercato-hermes-gateway` **alone** on `mercato-network`, while all eight of the operator's running
`*-local` containers (postgres, redis, mcp, meilisearch, model, opencode, app, plus its own Hermes) sat on
`mercato-network-local`. The stack's compose files (`docker-compose.fullapp.yml`, `.fullapp.dev.yml`)
declare `name: mercato-network-${DEPLOY_ENV:-local}`; the one I copied is used by the *other* stack, which
was not running. The row had therefore shipped a service that could not reach anything it names, on a
network this file itself created — and a plain `docker compose … down` on my file could have removed that
network while another stack's definition still pointed at it.

**Why it happened.** A compose file is read as a *text* ("the platform already uses `mercato-network`") when
it is a *claim about a live node*. Two compose files can name the same thing and mean different things; only
`docker ps` / `docker network inspect` / `docker compose ls` say which is true right now.

**The rules.** (1) **Before wiring a network, measure the node**: `docker ps`, then
`docker network inspect <name>` — which containers are on it, and which compose file actually created it
(`docker inspect <container> --format '{{json .Config.Labels}}'` names the config file and project). A
declared name with no running members is a warning, not a confirmation. (2) **`external: true` for a network
you do not own**: the file can neither create nor remove it, so the failure mode (a `down` taking a
neighbour's network) is structurally impossible — and make it overridable
(`${HERMES_DOCKER_NETWORK:-mercato-network-local}`) because a different `DEPLOY_ENV` means a different
name. (3) **Clean up the strays your wrong choice created**: the empty `mercato-network` my first version
created stayed behind after the fix; `docker network rm` on a zero-endpoint network is safe and reversible
(the declaring compose file recreates it). (4) **Prove the fix both ways**: `up` attaches where intended,
`down` removes only your own container and leaves every neighbour, the network and the volumes — a
before/after `docker ps` diff is the evidence.

*Cross-ref: L141 (the same `docker ps` measurement's other finding: the stack already ran a Hermes);
rule 0b (the measurement came before the fix); rule 13 (the falsified sentence — *"the same explicit name …
so compose attaches this worker to the network the platform already uses"* — corrected in the compose file,
in §2.6 decision 3 and in §2.7, and re-proved); `docker-compose.hermes.yml`'s `networks:` comment.*

---

## L141 — **`docker ps` before you design a service**: the product you are containerising was already running on that node, by someone else's door — and your docblock has to say why yours is a second door rather than a duplicate

Measured 2026-10-12, the same command run that produced L140.

**What happened.** `P2-1` was scoped and built as "the Hermes worker boots". After the fix, `docker ps` and
`docker network inspect` showed the platform's own stack had been running a **`hermes-local`** container for
days — image `nousresearch/hermes-agent:latest`, `command: ["gateway","run"]`, published on
`127.0.0.1:8642`, state on the `mercato-hermes-data-local` volume — the **upstream HTTP gateway**, added in
the operator's Sprint 0 step 3.5. Nothing about `P2-1` was wrong, but the plan had been written without ever
asking what was already there, and a reader of `P2-1` alone could conclude "we now have Hermes" — twice.

**Why it matters.** Two doors into the same product is a legitimate architecture choice (upstream HTTP over
a floating `:latest` tag for humans; the pinned source over stdio for the platform's own typed port), but it
is only legitimate when it is *stated*. Unstated, it reads as duplicate authority — exactly the risk the
architecture's §10 table names. And the same measurement showed **zero** `HERMES*` references in
`apps/mercato/src`: neither door is wired into the app yet, so "running" must never be written as
"integrated".

**The rules.** (1) **`docker ps` on the target node before writing a Dockerfile for a product that already
exists there** — one command, and it either confirms "new" or hands you the difference. (2) **When a second
door is intentional, write the distinction into the artifact itself** (the compose file's header now carries
the comparison, the digest-verified pin vs the `:latest` image, and which door `P2-3` fronts) so no later
reader has to reconstruct it. (3) **Never upgrade "running" to "wired"**: grep the app for the service's
env vars and record the count — here, zero — so the status is measured, not implied.

*Cross-ref: L140 (the same measurement); rule 13 (corrected everywhere); `PLAN-HERMES-PHASE2…` §2.7 (the
record); `CC-72` (deleting OpenCode has the same "two doors" shape, and the same need to say which door is
authoritative).*

---

## L142 — **A worker's stdout is the protocol channel, so every line of yours on it is data to the peer**: the fix is not care, it is an assertion that the channel carries nothing but parseable frames

Measured 2026-10-12, building `docker/hermes/` for `P2-1`.

**What happened.** Two ways to corrupt a channel you do not own, both hit in one build:

1. **My own diagnostics on stdout.** The entrypoint and the digests verifier logged
   *"verifying the pinned Hermes source…"* to **stdout** — the same fd the gateway speaks newline-delimited
   JSON-RPC on. A peer reading frames would have parsed my English as data. Fixed by moving every log line
   to **stderr** before the first boot.
2. **A gateway quirk that read as a broken wire.** The gate driver sent its requests **without a JSON-RPC
   `id`** — which makes them *notifications* — and the gateway **answered each one anyway** with `"id": null`.
   The driver's ordered reader reported "responses shifted by one"; the wire had never moved. Fixed by
   sending (and correlating by) explicit ids, and the trap is now a comment on the code that does it.

**Why the fix is an assertion, not care.** Both failures are invisible in the logs of the thing that is
failing, and both are one inattentive edit away from returning. So the gate asserts the invariant instead of
trusting it: **every line the worker writes to stdout must parse as JSON**, and a violation is recorded as a
channel-discipline failure with the offending bytes quoted. A rule that lives in a comment is a rule that
dies at the next edit; a rule that lives in a failing assertion survives it.

**The rules.** (1) **When a process's stdout is a wire, every diagnostic goes to stderr** — log to stderr by
default and treat any stdout write as a protocol event. (2) **Correlate by id, never by arrival order**; and
when a peer answers a *notification*, that is the peer's quirk, not a shift in the wire — reproduce it before
concluding the protocol changed. (3) **Assert the channel, not the intent**: a driver that checks every frame
parses catches your own pollution and the peer's mutiny in the same place.

*Cross-ref: `PLAN-HERMES-PHASE2…` §2.7 (the gate that now asserts it); `docker/hermes/handshake_gate.py`
(the assertion and the id-correlation); L139 (the same distrust of quiet output, one layer up).*

---

## L143 — **A disclaimer only its author can decode is not an honest limit — it is an unfinished report, and to the reader it reads as a hedge**: every "what this does NOT claim" line owes a plain-English twin before it leaves my hands

Measured 2026-10-12, in the closing summary of `P2-1`. The owner's reply, verbatim: *"you are making random
remarks like this that I dont get enough info about to give a feedback. Again breaching the rule of explaining
in a way that I can understand. Putting it like you did seems like a trap you set for me to ignore so you skip
some work."*

**What I wrote.** *"Honest limits: `P2-1` does not put Hermes behind the door (`P2-3`), does not serve a chat
(`P2-5`), and is not `hermes-local`'s replacement."* Three sub-row IDs, a "door", and a container name — in a
message whose only job was to let a non-developer decide what happens next.

**What it actually meant, and what should have been written.** (1) *"does not put Hermes behind the door"* =
the platform's AI chat still runs on OpenCode; nothing a user clicks reaches the new worker. (2) *"does not
serve a chat"* = no real conversation goes to it; it answers a scripted test handshake. (3) *"is not
`hermes-local`'s replacement"* = two Hermes services now run in Docker and the old one has not been removed.
Each is one sentence a non-developer can act on. I sent the register's shorthand instead of the translation —
the exact thing §2.3 and the reporting rules exist to prevent.

**Why it reads as a trap, and why that is the real defect.** A limitation the reader cannot decode gives him
two losing options: nod through work he cannot judge, or challenge text he cannot read. Either way the writer
looks covered. It was not intended as a hedge — but intent does not repair the effect: the owner must decide
from these sentences, so an undecodable one costs him the decision. And *"Again"* means the mechanism, not the
sentence, is at fault: I keep producing accurate-in-the-register, opaque-in-the-message claims.

**The rules.** (1) **Every limitation ships with its plain-English twin in the same reply** — the IDs may stay
in brackets, the meaning may never depend on them. (2) **One test before sending: could the owner act on this
sentence without asking me a single question?** If not, it is unfinished — rewrite it in this turn, not in the
reply to his follow-up. (3) **A limitation that is not actionable belongs in the worklog, not the message** —
if he cannot do anything with it, saying it is noise that hides the next real decision. (4) **When he says he
cannot decode a line, treat it as a defect in the report, not a gap in his knowledge** — the sentence gets
rewritten and the fix gets banked, in the same change, exactly as a falsified premise would be.

**CORRECTED THE SAME NIGHT — the plain-English twin is still only half a report (the owner, second reply).** I
fixed L143's rule (1) and his reply was *"This is better explained, yet still missing the most important part:
Actions done or recommended. Just like your rules dictate. Stating an issue is good. But only when you state the
action taken."* So the full shape of a limitation is **five parts, and the first version shipped two**: (a) the
name, (b) **what it means in plain words**, (c) **why it exists / the risk if it is left**, (d) **the action
already taken or the ranked lines with a recommendation**, and (e) **whether the owner must decide anything**.
A clean translation of the problem is the invitation to the decision — it is not the decision. **Rule (2)'s
test now reads: "can he act on this without asking me a question *and does the reply say what to do*?"** — a
sentence that explains a gap but names no action still fails, because knowing the gap is not knowing the move.
This is not a new rule; it is the standing reporting rule (*no flag without a full report — named · what it is ·
why · risk · **ranked actions + trade-offs + a recommendation***) applied to limitations, which I had been
treating as mere disclaimers attached at the end of a message.

*Cross-ref: WORKING-RULES §2.3 (plain English — the owner is not a developer) and the reporting rules (no
flag without a full report; never make the owner ask "what does that mean?"); `JOURNAL.md`'s P2-1 block (whose
closing "Honest limits" line is the instance); L137/L138 (the same month's other two "accurate internally,
misleading outside" findings).*
