# Parked modules — why we disable instead of delete

**Owner decision, 2026-08-08.** This replaces the delete-driven Phase S.

---

## The decision

**We switch ERP modules off. We do not delete them.**

The original plan removed twelve modules one at a time, each with a written
salvage analysis, an extraction step, a full gate and a commit — several hours of
careful work per module, and every one irreversible in practice.

The owner challenged whether that was worth it:

> *"I am questioning whether it is riskier and takes more time to strip the
> platform from existing modules or just keep it and proceed with building. As
> long as our architectural building is in progress, what is the problem in
> keeping the rest?"*

The challenge was correct, and the evidence settled it.

## What disabling actually buys

Every generated registry and the migration runner read
`resolver.loadEnabledModules()`. A module absent from `enabledModules` in
`apps/mercato/src/modules.ts` is invisible to the running system.

| | Delete | **Disable** | Keep enabled |
|---|---|---|---|
| Creates database tables | no | **no** | yes |
| Serves API routes and pages | no | **no** | yes |
| Registers workers, subscribers, DI | no | **no** | yes |
| Appears in menus and ACL | no | **no** | yes |
| Still compiled and type-checked | no | yes | yes |
| Reversible | hours, if ever | **seconds** | — |

**Deleting buys exactly one thing over disabling: compile time.** The full build
is about four minutes. That is not worth weeks of analysis and the standing risk
of losing something we needed.

## The evidence that the risk is real

`customer_accounts` was on the delete list, labelled "customer-facing identity,
part of the CRM chain". It contains `domain_mappings` — per-tenant custom
domains, which we want. It survived because someone asked a question, not
because the method caught it.

Under this policy that class of mistake cannot cost us anything: the code is
still there, and re-enabling is one line.

## What was parked

Fourteen modules, on 2026-08-08:

| Module | Why |
|---|---|
| `customers` | CRM. Also upstream's CRUD reference module — kept readable on purpose |
| `catalog` | Product catalogue |
| `sales` | Orders, quotes, invoices |
| `wms` | Warehouse management |
| `shipping_carriers` | Carrier integrations |
| `payment_gateways` | Payment provider registry |
| `checkout` | Checkout links and transactions |
| `gateway_stripe` | Stripe provider |
| `sync_akeneo` | Akeneo PIM sync |
| `sync_excel` | Excel import/export adapter |
| `customer_accounts` | Customer portal identity — **owns `domain_mappings`** |
| `portal` | Customer-facing portal (requires `customer_accounts`) |
| `staff` | HR staffing model — parked pending our own org model |
| `resources` | Resource booking (requires `planner`) |

`planner`, `currencies` and `progress` stay **enabled** — generic infrastructure
that kept modules use.

## Restoring one

Uncomment its line in `apps/mercato/src/modules.ts`, then `yarn generate` and
`yarn db:migrate`. **Respect the declared dependencies:**

```
sales        → catalog, customers, dictionaries
wms          → catalog, sales, feature_toggles
sync_akeneo  → integrations, data_sync, catalog, sales
portal       → customer_accounts
staff        → planner, resources
resources    → planner
```

The generator refuses to emit a registry when an enabled module's `requires` is
unmet, so a wrong restore order fails the build rather than shipping.

## What PARK actually means — read this before relying on it

**PARK means frozen, not maintained.** The cookbook originally described a parked
module as "still type-checked and repaired with everything else". After working
through it, that is not what we have, and pretending otherwise would mislead
whoever restores one.

| | Enabled | **Parked** | Deleted |
|---|---|---|---|
| Runs — routes, tables, workers | yes | **no** | no |
| Source on disk, readable | yes | **yes** | no |
| Type-checked | yes | **no** | — |
| Tests run | yes | **no** | — |
| Cost to restore | — | **one line** | rebuild from scratch |

**Why type-checking and tests both had to go.** The generated entity-id registry
covers enabled modules only, and that is deliberate — it is a compile-time guard
stopping enabled code from taking a hard dependency on entities whose tables no
longer exist. Code that must work either way uses the sanctioned optional form
(`getEntityIds() as any` + `E.catalog?.…`) and is unaffected. But parked source
references its own ids directly, so checking it against that registry produced
**579 errors that said nothing about the code**. Once the source is not compiled,
running its tests is signal without a foundation, so those go too.

**The measured cost:** 3,472 tests across 520 suites stop running — 42% of
`packages/core`'s tests. Core goes from 8,234 tests to 4,762.

**What this means at restore time.** A module re-enabled after months will not
have been compiled or tested in the interim, so expect it to need work if the
Phase R repairs changed a contract it uses. That is the honest cost of parking,
and it is why the [salvage reports](../salvage/) matter — they, not the test
suite, are the record of what each module contains.

**Both exclusions are drift-guarded.** `parked-modules-typecheck-scope.test.ts`
fails if the `tsconfig.json` list and the enabled-module list disagree — in
particular if a re-enabled module is left excluded, which would otherwise stop
being checked silently. The jest exclusion is derived from `modules.ts` at config
time and cannot drift at all.

## Correction — parked code does **not** type-check (found 2026-08-08)

**This page originally claimed parked code "stays on disk, still compiled and
still type-checked". That was wrong, and it was wrong when written.**

`yarn typecheck` on `@open-mercato/core` produces **579 errors across the eight
parked modules** — 560 of them `TS2339`, `Property 'catalog' does not exist on
type …`. The generator emits `entities.ids.generated` for **enabled modules
only**, so parked source referencing `E.catalog.*` or `E.sales.*` no longer
resolves.

**Why it was missed.** The gate after parking reported `typecheck EXIT: 0` with
`19 cached, 20 total`. Turbo served a **cached result from before the generated
files changed**. A cached green is not a green (**L15** again — a status that
belongs to a different run).

**What this does and does not affect:**

| | Status |
|---|---|
| The running platform | **Unaffected.** Boots clean, 44/44 pages, zero server errors |
| `yarn build` | **Green.** Next never compiles parked files — no route imports them |
| `yarn typecheck` | **Red.** `tsc` checks everything under `src/`, including unused parked source |

So this is a gate and developer-experience problem, not a product defect. It is
still blocking, because no batch may begin on a red tree.

**Recommended fix — emit entity ids for every module on disk, not only enabled
ones.** `entities.ids.generated` is a registry of string constants; entries for a
parked module cost nothing at runtime (nothing imports them, no tables exist) and
restore the property this strategy assumed. It keeps everything parking actually
buys — no routes, no tables, no workers — while making the claim above true.

Scheduled as part of **batch T**. Two alternatives were considered and rejected:
excluding parked modules from typecheck (lets the code rot silently, which
defeats the purpose of keeping it) and deleting the modules after all (the
decision this page exists to record).

Error distribution, for whoever picks this up:

```text
sales 144 · catalog 136 · customers 125 · staff 64 · wms 60
resources 44 · sync_excel 5 · customer_accounts 1
```

## What we still owe

Two costs are deferred, not eliminated. Both are real and both are written down
so they are not forgotten.

1. **Dormant code stays in the repository.** Roughly a million lines. If a Phase R
   repair changes a platform contract and parked code cannot be made to compile
   against it, that is the moment to delete *that* module — with evidence, not a
   guess.

2. **Dormant dependencies are still installed.** Security scanners will report
   CVEs in packages only parked modules use. Nothing routes to them, so it is not
   an exploit path, but it is an audit finding. Pruning dependencies is a
   pre-production task.

**Hard checkpoint:** before Phase K (our own kernel), revisit this decision with
evidence. "We will clean it up later" is exactly the promise projects fail to
keep, so it gets a scheduled date rather than good intentions.

## What this changed in the plan

- Phase S is no longer a deletion phase. It is one commit that parks modules.
- The per-module salvage analyses are **not wasted** — they remain the record of
  what each module contains, and they are what a restore decision reads.
- `workspace/attic/CATALOG.md` still matters, for the same reason.
- The work moves straight to **Phase R**, and the R1/R5 spike, which is what
  actually tests whether this platform can become our product.

---

## When you un-park a module: declare its commands' capabilities

Since 2026-08-10 the authority resolver gates **commands that declare which
capability they perform** (`CommandHandler.capability`). A command that declares
nothing is not gated — deliberately, so the gap is visible rather than guessed
at.

Only enabled modules have been mapped. A parked module's commands carry no
declaration, so **restoring a module also restores an ungated write path.**

**Do this as part of un-parking**, not afterwards:

1. Open the module's CRUD route and read `actions.{create,update,delete}.commandId`
   alongside `metadata.{POST,PUT,DELETE}.requireFeatures`.
2. The feature guarding the route **is** the command's capability. Take it from
   there — never from the command id. `module.entity.action` and `module.action`
   look close enough to map with a regular expression, and a wrong mapping either
   blocks work that should proceed or waves an act through that should have
   waited.
3. Add `capability: '<feature id>'` to the handler.
4. `command-capability-declarations.test.ts` checks the id is real; nothing
   checks that it is the *right* one, which is why step 2 is a reading task.

The mapping for every parked module was derived once and is reproducible — the
script is in the 2026-08-10 journal entry. There were 117 commands with exactly
one guarding feature and no ambiguous cases, so this is mechanical, not a
judgement call, once you are looking at the route.
