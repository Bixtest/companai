# Progress — where we are, out of how much

**One line: 8 of 16 batches done, plus R2c. All six repairs (R1–R6) are in, and
the resolver now decides rather than observes. Next is backlog item 1, U2 — after
which the eight grafts, G1–G8, are the remaining batches.**

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
| **1** | **U2 — sidebar role-apply data loss** | Needs a schema-or-UX decision. Not urgent, but it can delete a customer's config | M |
| **2** | **A regular API key's scope is still a live comparison against a person** | U3 is fixed at creation, so the key and its creator now agree by construction. The comparison itself remains: soft-delete the creator, or move them to another organization, and every key they made returns 401 with no explanation. The durable fix is a scope stored on the key and validated against the creator's visibility at creation, with `createdBy` dropped from the authentication path — `sessionUserId` keeps its comparison, because there the borrowed identity is the point | M |
| **3** | **Obligations do not bind — there is no machinery to hold an act** | Enforcement refuses `A0` and records `A1`-`A4`. Approve-first, hold-and-commit and review-afterwards are the resolver's actual output for most constrained acts, and nothing can yet hold an arbitrary act and resume it once somebody approves. `inbox_ops` does this for AI proposals only. Until this exists, 'enforced' means refusals and the CLI says so out loud | L |
| **4** | **No data-classification floor, so an untrusted machine reads confidential data unattended** | Planning 02 §6.1 names `matrix_by_classification[resource.classification]` as a floor input; it does not exist. Reads are now exempt from the untrusted-machine ceiling — correct, because a read has no effect to approve — which leaves RBAC as the only bound on a machine reading `confidential` or `secret` data. Needs per-resource classification and a policy table with a source, not values I invent | M |
| **5** | **G1–G8 — the eight grafts from Platform 1** | G1/G2/G4 need R5/R6, which now exist; the rest are independent. G2 is largely subsumed by R6 and should be re-scoped before it is started | L |
| **6** | **Ledger correlation and causation are carried but never propagated** | `correlation_id` / `causation_id` are recorded when a caller supplies them in `context`, and nothing supplies them. Until something threads a correlation id through a request, the chain records events that cannot be assembled into a trace — which is the feature the ledger exists to enable | M |
| **7** | **Verify `messages.manage` and `messages.actions` against real routes** | R4b classified both from their titles because no route enforces them today — the only two of 113 descriptors not decided by reading code. Recheck when the messages module is next touched; conservative for now, which is the safe direction but not the accurate one | S |
| **8** | **Ledger Tier 2 — periodic signed checkpoints** | R3's chain is verifiable only by us. A signed root published to append-only storage is what lets a customer's auditor verify a range without our cooperation, and it is a stated commercial property of the design. Needs key management, so it follows the principal keypair work | L |
| **9** | **`domain_mappings` extraction from parked `customer_accounts` into `directory`** | Per-tenant custom domains — we want it, but not until something needs it | M |
| **10** | **Dependency pruning for parked modules** | Security scanners will flag CVEs in packages nothing routes to. Pre-production, not now | M |
| **11** | **Orphaned-table decision — ~127 tables from modules that later got parked** | Currently: leave them, they are inert. Revisit only as a deliberate backed-up migration | S |
| **12** | **Phase K checkpoint — revisit parking with evidence** | The scheduled date that stops 'we'll clean up later' being a lie | S |

**Why this order.** Enforcement has landed, so the list now leads with the two
defects that can lose a customer's data or silently kill their integrations —
both small, both undermining work already shipped. Items 3 and 4 are the honest
remainder of enforcement: what it does *not* yet bind, written down so nobody
reads "the resolver decides" as a bigger claim than it is. The grafts sit
mid-list deliberately: they are additive, and G2 needs re-scoping against R6
before anyone starts it.

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
