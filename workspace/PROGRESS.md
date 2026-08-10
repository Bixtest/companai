# Progress — where we are, out of how much

**One line: 8 of 16 batches done, plus R2c. All six repairs (R1–R6) are in, and
the resolver now decides rather than observes. Every inherited defect we found is
fixed. Next is backlog item 1, then the eight grafts G1–G8 — the remaining
batches.**

**Two views of the same work.** *The backlog* below is the ordered list of
everything outstanding, first to last, and it is the authority on what happens
next. *The 16 batches* further down is the milestone view — how much of the
Starting Kit is finished. Work off the backlog; read the batches to know how far
along we are.

Updated at the end of every batch. If this disagrees with the code, the code wins
and this file is broken — fix it.

---

## The backlog — everything outstanding, first to last

**This is the list.** If a task is not here, it is not tracked, and the owner
should not be the one who remembers it (Rule zero-three). Order is mine to set
and is argued below; anything can be pulled forward on request.

| # | Task | Why here | Size |
|---|---|---|---|
| **1** | **A3 does not bind — hold-and-commit needs a scheduler** | The act executes into a hold window and **commits** when the window passes unless somebody objects. That is the opposite of expiry, so the approval queue's machinery does not cover it: something has to wake up and run the act. `@open-mercato/scheduler` is enabled, so the pieces exist | M |
| **2** | **Build the approvals page** | Decided with the owner 2026-08-10 — see *The approvals page* below for the shape, the defaults and what is tunable. **Scheduled after item 2**, and the reason is in that section: a screen for a tray that is almost always empty teaches nobody anything | L |
| **3** | **The gate is not reliably green on a loaded machine** | Two problems, same family. *Repo-walking guards*: `packages/shared` creates `.tmp-dynamic-loader-*` inside its own package tree while its tests run, and any guard walking `packages/` reads a file from it a moment after it is deleted — two hardened, eleven more walk-and-read unguarded. *Contention*: `cli/src/lib/testing/__tests__/integration.test.ts` passes in 17s alone and exceeds its 60s budget inside the 22-package gate. Neither is ever related to the change under test, which is how a gate stops being read | M |
| **4** | **G1–G8 — the eight grafts from Platform 1** | G1/G2/G4 need R5/R6, which now exist; the rest are independent. G2 is largely subsumed by R6 and should be re-scoped before it is started | L |
| **5** | **Ledger correlation and causation are carried but never propagated** | `correlation_id` / `causation_id` are recorded when a caller supplies them in `context`, and nothing supplies them. Until something threads a correlation id through a request, the chain records events that cannot be assembled into a trace — which is the feature the ledger exists to enable | M |
| **6** | **Verify `messages.manage` and `messages.actions` against real routes** | R4b classified both from their titles because no route enforces them today — the only two of 113 descriptors not decided by reading code. Recheck when the messages module is next touched; conservative for now, which is the safe direction but not the accurate one | S |
| **7** | **Ledger Tier 2 — periodic signed checkpoints** | R3's chain is verifiable only by us. A signed root published to append-only storage is what lets a customer's auditor verify a range without our cooperation, and it is a stated commercial property of the design. Needs key management, so it follows the principal keypair work | L |
| **8** | **`domain_mappings` extraction from parked `customer_accounts` into `directory`** | Per-tenant custom domains — we want it, but not until something needs it | M |
| **9** | **Dependency pruning for parked modules** | Security scanners will flag CVEs in packages nothing routes to. Pre-production, not now | M |
| **10** | **Orphaned-table decision — ~127 tables from modules that later got parked** | Currently: leave them, they are inert. Revisit only as a deliberate backed-up migration | S |
| **11** | **Phase K checkpoint — revisit parking with evidence** | The scheduled date that stops 'we'll clean up later' being a lie | S |

### The approvals page — decided 2026-08-10

When the platform decides an act needs a second pair of eyes, the act stops and
waits. That works today, and you can look in the tray and answer yes or no —
through an API, which means through a terminal. Nobody in a real company will do
that.

**Owner's decisions.** Its own page in the menu. Choose sensible defaults rather
than asking, and expose settings where people genuinely differ instead of baking
one person's taste into the product.

**Read that as a rule, not a licence.** Every setting is something to explain,
test, document and get wrong. A knob exists where organisations legitimately
disagree; where there is a right answer, there is a default and no knob.

| Feature | Default | Tunable? |
|---|---|---|
| **Ordering** | Riskiest first, then closest to its deadline | **Yes, per person.** Some want fairness (oldest first), some want risk. A real disagreement |
| **Approve several at once** | On, and it always shows how the grouped items *differ* | **On/off per tenant.** Some will forbid it outright for high-risk acts. The diff itself is never optional — a blind "approve all" is worse than no button |
| **Cover for someone away** | Off until a deputy is named | **Yes** — it cannot work without naming somebody, so it is inherently a setting |
| **Standing approvals** | Off | **Yes, per grantor**, with a mandatory expiry and a visible count of what it let through. The most useful and the most dangerous; planning 02 §7.1 |
| **Expiry** | 24 hours | **Yes, per tenant.** A day suits some businesses and is absurd for others |
| **Who may approve** | Holders of `auth.authority.approve` | **No.** That is authority, not preference |

**Why after item 2, and not now.** The page is a tool for working through a tray.
Three commands are gated today, so the tray is nearly always empty — and a screen
designed against an empty tray is designed against a guess. Item 2 widens what is
gated; once real traffic accumulates, the design question stops being "what might
people need" and becomes "what is actually in here". That is the same discipline
shadow mode used before enforcement, and it has already caught two of my design
errors.

**Not a reason to wait**: polish, or wanting the product to feel finished. If the
tray fills up sooner than expected, this moves up.

**Why this order.** Every inherited defect we have found is now closed, so the
list leads with the honest remainder of enforcement: what it does *not* yet bind,
written down so nobody reads "the resolver decides" as a bigger claim than it is.
Both are prerequisites for enforcing more than refusals. The grafts follow: they
are additive, and G2 needs re-scoping against R6 before anyone starts it.

**Closed 2026-08-10 (A4 binds):** an act gated at *execute and review* now runs
and is **filed for review** — what ran, who ran it, why it was reviewable, and
the action-log id so a reviewer reads the change itself rather than a description
of it.

A separate table from held acts, deliberately: one whose rows mean "already did"
does not belong beside rows meaning "not yet", and a `kind` column joining them is
how a schema starts lying to its next reader. No deadline either — an approval
nobody answers blocks work and must expire, while an unreviewed act is exactly
what somebody should still find next quarter.

Filing never throws at the caller. The write has committed; failing the request
would report a change that did land as one that did not.

One endpoint now returns both lists — planning 02 §9 wants one inbox — while
keeping them distinguishable, because confusing "stop this" with "check this" in
either direction empties a queue of meaning.

**Closed 2026-08-10 (which commands are gated):** 21 commands across the enabled
modules now declare the capability they perform, up from 3. Every mapping was
read off the route that invokes the command — `actions.*.commandId` against
`metadata.*.requireFeatures` — rather than derived from the command id. The audit
found 117 such commands across all modules and **no ambiguous cases**, so this is
a reading task, not a judgement one.

Parked modules are deliberately not mapped: their commands never run, and the
step is recorded in
[parked-modules.md](references/parked-modules.md) so un-parking one does not
quietly restore an ungated write path. A guard test checks every declared
capability is a real feature id — a typo would not throw, it would silently stop
gating the command.

**Closed 2026-08-10 (data classification):** an act is now graded by what it
touches. A machine reading credentials no longer resolves like one reading a
dictionary — `secret` data raises the work to G3, and `E0 / G3` permits at most
A4, so the read happens and is reviewed.

**It needed no new policy table**, which is why it had been stuck. Planning 02
§6.1 lists `matrix_by_classification` among the floors and I had assumed a
classification-to-gate table I would have had to invent the numbers for. §8's
worked example settles it — *"reading confidential contracts for a G3 legal
matter, `E0 / G3 → floor A4`"* — the classification does its work by raising the
**task grade**, which the existing effect-class matrix already reads. The class
to grade mapping comes from the grade table in §3, matched on the words it uses.

Grades take the maximum, so a caller may raise one and cannot talk the resolver
below what it is reading. The explanation says which classes did it.

**Closed 2026-08-10 (obligations bind):** an act the resolver gates at `A1` or
`A2` no longer runs. It is held in `authority_pending_acts` with the decision
that held it, and executes only when somebody holding `auth.authority.approve`
says so — as the approver, in the proposer's organization, audited both times.
Rejecting means it never runs; every held act carries a 24-hour deadline and an
expired one has to be proposed again.

The seam is the **command bus**, because an act that can be undone is an act that
can be replayed and the platform already models that. Commands opt in by
declaring the `acl.ts` capability they perform — the resolver is keyed by
capability and the bus by command, and deriving 153 mappings from the naming
convention would be 153 guesses.

**What still does not bind is stated rather than implied:** `A3` needs a
scheduler that commits when nobody objects, `A4` needs a review record on an
already-executed act, and the queue is an API with a deadline rather than the
inbox planning 02 §7.2 describes. Both are now items 2 and 3.
[knowledge/authority-decisions.md](knowledge/authority-decisions.md).

**Closed 2026-08-10 (API keys and their creator):** a regular key's scope was
resolved through its creator's user record on every request, so moving that
person to another organization silently killed every key they had made. The rule
is now the narrower one that actually matters — **a key may not be broader than
its creator** — and a key scoped to an organization its creator has since left
keeps working, because it is a service credential and not a borrowed identity.
Session keys keep exact equality, which was always right for them.

The useful half of the old behaviour is now explicit: `api_keys` revokes a
deleted user's keys on `auth.user.deleted`, so offboarding is a visible, audited
act. Authentication still refuses a key whose user has gone, as a fail-closed
backstop. Fifteen tests.

**Also closed (U8):** `communication_channels` has a cascade that disconnects a
departed user's email and calendar channels. It read `payload.userId`; the
platform emits `payload.id`. **It had never run once** — seven green tests, every
one of them constructing a payload the platform does not produce.
[upstream-issues.md → U8](references/upstream-issues.md).

**Closed 2026-08-10 (U2):** a routine save on *Sidebar customization* could
delete every role's sidebar configuration. A preset stored a copy of the settings
and no reference to the layout that produced it, so the switches could not tell
the truth and reset to "no roles" on every load — making the second save a
request to clear everything.

`role_sidebar_preferences.variant_id` records where a preset came from, the
switches now arrive showing stored state, and — the part that actually closes it
— **the server only lets a layout delete the presets it produced**. A role
configured from another layout, or from before the column existed, is not this
screen's to remove no matter what the client sends. Twelve tests.
[upstream-issues.md → U2](references/upstream-issues.md).

**Also closed on the way:** the `audit_logs` and `directory` migration snapshots
had been stale since R3 and R6, so `yarn db:generate` emitted migrations trying
to re-create tables that already existed. Both now match the schema that shipped.

**Closed 2026-08-10 (enforcement):** the resolver decides. Three modes per
tenant (`off` / `shadow` / `enforce`, default shadow), the organization graph in
the request path behind a cache that edge writes drop, and every refusal logged
with the rule that produced it. Verified end to end: an organization behind an
`inheritance: none` edge returns **403** where its parent returns **200**.

Enforcement can only ever *narrow* — it runs after RBAC has already said yes, and
that ordering is the guarantee rather than a convention. **Refusals bind;
obligations do not**, because nothing can yet hold an arbitrary act and resume it
after approval, and the CLI says so when you switch a tenant on.

Shadow mode paid for itself twice more: it found that an API key acquired an
approval obligation for *listing organizations*, which corrected the
untrusted-machine rule from a flat ceiling into the per-effect-class vector
planning 02 §5.1 always specified.
[knowledge/authority-decisions.md](knowledge/authority-decisions.md).

**Closed 2026-08-10 (U3, for real this time):** an API key created through the
ordinary UI flow came out unscoped while its creator had an organization, and was
rejected on every request — 401 always, from the default path, not a corner case.
Creation now takes the creator's own organization and refuses an explicit
mismatch with a message. Verified end to end; five tests. I had closed this twice
before on bad evidence — see [L30 and L32](../LESSONS.md) and
[upstream-issues.md → U3](references/upstream-issues.md).

**Closed 2026-08-10 (authority graph bridge):** thirteen tests for
`AuthorityGraphService` and the ancestor-index ordering contract it depends on.
Both of its silent failure modes now fail closed and explain themselves: an
organization that cannot be found, and an ancestor index that has inverted,
return `A0` with a stated basis instead of `A5` — which reads as 'nothing
constrains this'. Unmapped hops on the path are reported rather than absorbed.

**Closed 2026-08-10 (U4 sweep):** 53 call sites classified into three shapes;
only one — using the actor's organization as a *stored value* — is the bug, and
the rule is now written down where people will look for it. **U3 was not closed
with it**: I claimed it was an instance of U4, and both the reproduction and the
fix were wrong — see [upstream-issues.md → U4](references/upstream-issues.md) and
[L30](../LESSONS.md).

**Closed 2026-08-10 (authority-graph UI):** organization edges are now editable
by a person — a guarded, audited, optimistically-locked API and a settings page
that says what each value means. R6's mechanism is no longer reachable only
through SQL. [knowledge/org-authority-graph.md](knowledge/org-authority-graph.md).

**Closed 2026-08-10 (U7):** `action_logs.actor_kind` — the journal can finally
tell a machine from a person, written from the same raw subject the ledger reads,
with a dry-run-first backfill that recovers what is recoverable and leaves the
rest null. [upstream-issues.md → U7](references/upstream-issues.md).

**Closed 2026-08-09 (three small ones):** the audit journal now refuses to write
an entry whose scope was silently discarded; shadow mode has a heartbeat, so an
empty findings list is a result rather than an ambiguity; and `OM_LOG_LEVEL` now
reaches the app — Turbo runs tasks in a filtered environment and was dropping it,
which is why debug logging appeared to do nothing.

**Corrected 2026-08-09 (the autonomy matrix):** shadow mode's first real traffic
showed 45 of 45 human actions acquiring an obligation — a review queue for
changing one's own sidebar, an approval to edit a dictionary. The matrix bounds
*worker* autonomy (`A1` is literally "the worker proposes; a human performs the
act"), and applying it to direct human action was a category error. Now scoped to
machines and delegated authority. Same traffic afterwards: 0.

**Closed 2026-08-09 (shadow report):** `auth authority:shadow-report` turns the
shadow's log lines into the two numbers the enforcement decision rests on — what
would change, and what would start needing a person.

**Closed 2026-08-09 (shadow mode):** the resolver now runs beside every
permission check and records where it would differ, hooked at the single method
all 102 call sites reach. 526 ns per call, measured. Nothing enforced yet.
[knowledge/authority-decisions.md](knowledge/authority-decisions.md).

**Closed 2026-08-09 (U5):** the gate's random failures — two were my own
invocation error ([L25](../LESSONS.md)), one was a real defect (an I/O-bound
suite on a 5s unit-test timeout), one has never been reproduced and the test now
asserts its own precondition so the next occurrence explains itself. Three
consecutive clean gate runs afterwards, 22/22 and 12,466 tests each.
[upstream-issues.md → U5](references/upstream-issues.md).

**Closed in R6 (2026-08-09):** typed organization edges — relationship types,
inheritance modes, per-edge authority ceilings and capability allowlists, feeding
the resolver as a ceiling. Seeded so nothing changed on landing.
[knowledge/org-authority-graph.md](knowledge/org-authority-graph.md).

**Closed in R5 (2026-08-09):** the resolver — authority as a decision with
reasons (I6), with I4 and I8 enforced, preflight for plans, and a CLI that
explains any act. Not yet wired into enforcement, deliberately.
[knowledge/authority-decisions.md](knowledge/authority-decisions.md).

**Closed in R4 + R4b (2026-08-09):** capability descriptors — effect classes
E0–E6, reversibility, the autonomy floor matrix, a registry, and a guard that
now demands 100% coverage and validates the descriptors as they ship.
[knowledge/capabilities.md](knowledge/capabilities.md).

**Closed in R3 (2026-08-09):** the hash-chained ledger — every audited write
extends a per-tenant chain, append-only enforced by a database trigger,
verifiable with `mercato audit_logs ledger:verify`.
[knowledge/ledger.md](knowledge/ledger.md).

**Closed in R2c (2026-08-09):** auditing `inbox_ops` — 14 write points, the
decision recorded in the same transaction as the status change it describes.
[audit-triage.md](references/audit-triage.md).

**Closed and not to be re-raised:** **R2 in full** — audit coverage across all
four custom-route modules, both write paths failing closed, and a build-time
coverage guard, **R2b** and **R2b-factory** (both audit
write paths now fail closed inside the business transaction), the C++ build tools (`cpu-features` builds),
the leftover `packages/enterprise` build output (removed, 671 files), the R1.4
`principals` table and legacy-field deletion (deferred with reasons — see the R1
section), R1.3 (dropped).

## The 16 batches to a finished Starting Kit

*Was 15. Batch **T** was added on 2026-08-08 — see the note under it.*

| # | Batch | What it delivers | State |
|---|---|---|---|
| **1** | **S — Park** | ERP switched off; 136 tables not 263 | ✅ **done** 2026-08-08 |
| **2** | **R1 — Principal abstraction** | An actor's *kind* is data, not a string prefix | ✅ **done** 2026-08-09 |
| **3** | **T — Test debt** | Green gate: 22/22 tasks, 12,265 tests | ✅ **done** 2026-08-09 |
| **4** | **R2 — Audit coverage and atomicity** | Every write recorded; audit failure rolls the write back; coverage guarded by a test | ✅ **done** 2026-08-09 |
| **4b** | **R2c — Decisions about machine output** | `inbox_ops`: who approved what the AI proposed, recorded with the transition | ✅ **done** 2026-08-09 |
| **5** | **R3 — Append-only ledger** | Per-tenant hash chain; append-only enforced by the database; `ledger:verify` | ✅ **done** 2026-08-09 |
| **6** | **R4 — Capability descriptor** | Effect class, reversibility, data classes, autonomy ceiling; **113/113 described**, guarded | ✅ **done** 2026-08-09 |
| **7** | **R5 — Decision with reasons** | Gates A0–A5, every rule recorded, binding rule, obligations, alternatives, preflight, `authority:explain` | ✅ **done** 2026-08-09 |
| **8** | **R6 — Typed org edges** | Typed edges, inheritance modes, per-edge ceilings, module allowlists; feeds the resolver | ✅ **done** 2026-08-09 |
| 9 | G1 — Layered resolver + explanation trace | from Platform 1 · needs R5 | ⬜ |
| 10 | G2 — Org edges, ceilings, inheritance modes | from Platform 1 · needs R6 | ⬜ |
| 11 | G3 — Temporary delegations | from Platform 1 · needs R1 | ⬜ |
| 12 | G4 — Project permission overlays | from Platform 1 · needs R5 | ⬜ |
| 13 | G5 — Record lock states | from Platform 1 · **replaces** the removed enterprise locking | ⬜ |
| 14 | G6 — Event visibility scope | from Platform 1 | ⬜ |
| 15 | G7 — Locale direction + RTL inference | from Platform 1 | ⬜ |
| 16 | G8 — Migration advisory lock | from Platform 1 | ⬜ |

After batch 16 the Starting Kit is done, and **Phase K** — our own kernel, the
actual product — begins. That is a separate plan, not counted here.

**Batches 2 and 7 (R1 and R5) are the spike.** Three weeks, timeboxed. If they
sprawl, the foundation is not reshapeable and
[`08 §9a`](../compai/planning/08-host-selection-and-migration-plan.md) applies —
we would have learned it in three weeks rather than a year.

## Batch 3 — T, the test debt, and why the count grew

**The full test suite had never completed in this repo.** Turbo stops at the
first failing task, and two Windows-only failures in the Railway deploy tool
aborted every run after 7–8 of 22 packages. `core` — the largest package — was
never reached. Every "gate green" before today covered less than it implied
(**L15**).

Fixed in `14acfdc`: the two Railway tests, plus `--continue` so one failing
package can never again hide the other 21. **First complete run: 20/22 tasks,
15,723 tests passed.**

It exposed 10 failures across 15 suites, none of them regressions from R1:

| Cause | Suites | What is wrong |
|---|---|---|
| Parking (batch 1) | 10 | `catalog`/`sales`/`customers` tests need generated entity modules the generator no longer emits |
| Enterprise removal | 2 | licence-metadata check and a package-root enumeration still expect the deleted package |
| The CRM upgrade-action removal in `a423050` | 1 | test still expects the registration |
| Pre-existing Windows | 1 suite, 4 tests | attachments local driver asserts `\storage\…` and gets `C:\storage\…` |

The two still-failing tasks are `@open-mercato/core#test` and
`create-mercato-app#test`.

### And the bigger one: parked code did not type-check

**579 TypeScript errors across the eight parked modules**, 560 of them
`Property 'catalog' does not exist on type …`, missed because Turbo served a
**cached green** (`typecheck EXIT: 0 — 19 cached, 20 total`) from before the
generated files changed.

```text
sales 144 · catalog 136 · customers 125 · staff 64 · wms 60
resources 44 · sync_excel 5 · customer_accounts 1
```

**The planned fix was wrong.** It was to emit entity ids for every module on
disk. Inspection showed the registry's exclusion of parked modules is a
*deliberate compile-time guard*: it stops enabled code hard-depending on entities
whose tables no longer exist. `attachments` proves the sanctioned alternative
works — `getEntityIds() as any` plus `E.catalog?.…` — and type-checks fine.
Emitting the ids would have destroyed a real safety property to silence an
artifact.

**What was done instead:** parked source is excluded from `tsconfig.json`, and
parked tests from core's jest run, derived from `modules.ts` so they cannot
drift. Once the source is not compiled, running its tests is signal without a
foundation.

**Cost, measured:** 3,472 tests across 520 suites — 42% of core's suite. **PARK
now means frozen, not maintained.** See
[`references/parked-modules.md`](references/parked-modules.md) for what that
implies at restore time.

### And a licence gap the new test caught immediately

`packages/enterprise` source was deleted in `7f9fa5d`, but **671 files and 6 MB
of build output survived** — `dist/`, `.turbo/`, `tsconfig.tsbuildinfo`.
Untracked, so never committed, but sitting in the working tree where a container
build or an archive would pick it up. The `.js.map` files carry `sourcesContent`,
so the **original commercial TypeScript was still on disk** — precisely what
removing the package was meant to prevent.

Found by the licence-metadata test rewritten in this batch, on its first run.
Removed.

### Result

```text
typecheck  20/20      lint  1/1      build  20/20
test       22/22 tasks · 12,265 passed · 0 failed
```

The first fully green gate in this project.

## Scheduled — inherited defects awaiting a decision

Tracked so they cannot be lost. Full detail:
[`references/upstream-issues.md`](references/upstream-issues.md).

| | Defect | Severity | Blocked on |
|---|---|---|---|
| **U1** | 16 of 25 enabled modules write nothing to the audit trail | **high** | Folded into **R2** — it is now step 1 |
| **U2** | Sidebar role-apply is one click from silently deleting role presets | medium | A schema or UX decision — see below |
| **U3** | API key with a mismatched organization fails at use time, not creation | low | Unscheduled; low cost, low urgency |

**U2 was assessed for immediate fix and rejected on evidence.** The obvious
two-line version — pre-tick roles that already have a preset — is wrong:
`role_sidebar_preferences` carries no variant reference, so it would pre-tick
roles configured from a *different* variant and silently overwrite them. Doing it
properly needs a schema change (a variant reference), a UI redesign (explicit
Apply/Remove per role), or a decision to drop the clear-by-omission path
entirely. That is a batch, not a fix.

## Finding — audit coverage is the real R2 problem (2026-08-09)

Found while the owner was testing R1: **creating and deleting an API key produces
no audit record at all.** The Action Log page is empty; the only five rows in the
table come from initialisation.

**Why.** Action-log entries are written by the **command bus**. A module only
goes through it if it defines `commands/`. Counting enabled core modules:

```text
AUDITED     (9):  auth directory dictionaries feature_toggles currencies
                  planner messages communication_channels translations

NOT AUDITED (16): dashboards perspectives entities configs query_index
                  audit_logs attachments api_keys api_docs business_rules
                  workflows notifications progress integrations data_sync
                  inbox_ops
```

Some of those legitimately have nothing to audit — `query_index`, `progress`,
`api_docs`. Others are exactly what an audit trail is for:

- **`api_keys`** — creating one grants access, deleting one revokes it
- **`entities`** — schema changes
- **`business_rules`, `workflows`** — the automation that acts on the business
- **`configs`, `integrations`, `data_sync`** — system settings and external
  credentials

**This reframes R2.** R2 was scoped as *"the audit write is not in the business
transaction and fails open"* — a correctness problem with the writes that happen.
The bigger problem is that **for most modules the write never happens.** Our
entire differentiator is a governance layer that can always explain who did what;
a trail covering nine modules of twenty-five does not do that.

**R2's scope therefore becomes two things**, in this order:

1. **Coverage** — route the modules that need auditing through the command bus.
2. **Correctness** — make that write transactional and fail-closed, as originally
   planned.

Coverage first: making an unreliable write reliable matters less than making a
missing write exist.

## Finding — parking does not disable other modules' widgets (2026-08-09)

The owner's dashboard showed a red *"Failed to load new customers data"*. The
`dashboards` module is enabled and ships **ten** analytics widgets that read
`sales` and `customers` data — both parked.

Parking a module does not disable widgets that *another enabled module* ships
about it: the widget lives in `dashboards`, and only its feature requirements
point at the parked module.

Fixed with the sanctioned override in `modules.ts` — ten one-line entries,
reversed by deleting them. **Two attempts:** the first used the widget's `id`
(`dashboards.analytics.aovKpi`) when the override registry matches on `entry.key`
(`dashboards:aov-kpi:widget`). The platform said so plainly in the log —
*"Override did not match any registered entry — override skipped"* — which is why
the fix was verified against the running server rather than assumed.

**The general lesson for parking:** ask what *other* enabled modules ship
**about** the parked one — widgets, enrichers, menu entries, subscribers. The
module system disables what a module *provides*, not what others provide about it.

## Batch 2 — R1, in detail

Four steps, ordered so the risky part comes first and the tree stays green at
every one.

| Step | What | State |
|---|---|---|
| **R1.1** | `Principal` type; `AuthContext.principal` populated at every auth entry point. Additive — legacy fields untouched | ✅ **done** |
| **R1.2** | Migrate the **16 live** branch sites to read the principal | ✅ **done** — 16 files → 3, all three the abstraction itself |
| R1.3 | ~~Migrate the 18 parked branch sites~~ — **dropped, see below** | ⚪ |
| R1.4 | ~~`principals` table; delete the legacy fields~~ — **deferred, see below** | ⚪ |

**R1 is complete for its purpose.** Its defect was *"the kind is a string prefix
re-parsed at each site — 30 files branch on it."* In enabled code, zero do. The
kind is data, and adding `ai_worker` as a third kind now costs nothing, which was
the entire point.

### Why R1.4 is deferred, not skipped

**The `principals` table has no consumer.** Principals are currently derived from
users and API keys, and everything that needs one has it. A table nothing reads
is speculative, and our own kernel design — Charters, positions, Grant Sets
(`planning/01 §2.1`) — will shape its columns. Build it with its first real
consumer: an AI worker that is not a user, or **G3** (temporary delegations),
which needs stable principal ids.

**The deprecated fields are the compatibility bridge for parked code.**
`isApiKey` has no reader left in enabled code — but `customers`, `sales`, `staff`
and `resources` read it in roughly twenty places. Deleting it from `AuthContext`
would not break the gate, because parked source is no longer type-checked. It
would break those modules **on restore**, adding cost to precisely the recovery
path parking exists to protect.

So the fields stay, marked `@deprecated`, until parked modules are either
restored and migrated or dropped for good. That is a decision with a named
consequence, not an oversight: **the deprecation is load-bearing.**

`auth.userId` additionally needs a per-site semantic decision — it is set only
for API keys, so several call sites read `undefined` for a human today. Untangling
that is worth doing deliberately, not as a rename.

**R1.3 was dropped in batch T.** Parked source is no longer compiled or tested,
so edits to it cannot be verified — changing 18 branch sites we cannot type-check
would be unreviewable work on code that does not run. Those sites stay as they
are; restoring a parked module means bringing it up to the current contract
anyway, and that is where the work belongs.

**R1.4's exit gate changes accordingly:** the grep must return zero **in enabled
code**, not repo-wide. Stated explicitly so a future reader does not mistake the
remaining parked matches for unfinished work:

```bash
grep -rl "api_key:\|isApiKey" packages/*/src apps/mercato/src \
  | grep -vE "__tests__|\.test\.|modules/(catalog|customers|customer_accounts|portal|payment_gateways|resources|sales|shipping_carriers|staff|sync_excel|wms)/"
```

### Why R1 got cheaper

The forensic counted **34 files** branching on `startsWith('api_key:')` or
`isApiKey`. Parking moved 18 of them into code that still compiles but no longer
runs, leaving **16 live sites**. Parking halved this batch before it started.

### What R1.1 delivered

- `packages/shared/src/lib/auth/principal.ts` — `PrincipalKind`
  (`human | ai_worker | service | system`), the `Principal` shape, and the
  **only** code that knows the `api_key:` string encoding.
- `AuthContext.principal`, attached after scope resolution so a superadmin's
  tenant override cannot leave it stale.
- `effectiveUserId()` — replaces the `auth.isApiKey ? auth.userId : auth.sub`
  idiom that appeared identically at **nine** call sites.
- 16 unit tests; legacy fields marked `@deprecated`, removed in R1.4.

`ai_worker` is declared but unpopulated — no auth path creates one yet. It exists
so consumers switch over a complete set now instead of being rewritten later.
That is the whole point of R1: **the third kind must cost nothing to add.**
