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

Adopted from [`skills-main`](skills-main): *"A red signal does not short-circuit
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
