# 08 — Host Selection and Migration Plan

**Status:** decision proposed, one input required from you (§3)
**Inputs:** [P1 verdict](platforms/01-graph-portal-platform/02-verdict.md) ·
[P2 verdict](platforms/02-open-mercato/02-verdict.md) · both salvage maps
**Method:** host/donor model in [Method §0](method/platform-assessment-methodology.md)

---

## 1. The decision

> **Host: Open Mercato.** **Donor: Graph Portal Platform (P1).**
> Hard-fork Open Mercato, delete the ERP domain, build our kernel on its
> framework, and graft P1's governance pieces into it.

## 2. Why — scored on the criterion that actually decides it

Platform 1 was assessed before the host-fitness criteria existed. Scored
retroactively against the same eight criteria, from findings already in its
forensic record:

| # | Criterion | P1 | Evidence | P2 | Evidence |
|---|---|---:|---|---:|---|
| H-1 | Module contract | **2** | 11 surfaces, but `coreManifests` is a hardcoded array; no install lifecycle | **5** | 21 surfaces, convention-discovered, boot-validated |
| H-2 | Dependency injection | **2** | NestJS static module imports; no container registration for new modules | **5** | Awilix; per-module `di.ts`; generated registrars; `di` overridable |
| H-3 | ORM neutrality | **3** | Drizzle — schema is *data*, not decorated classes; more portable | **2** | MikroORM decorators throughout |
| H-4 | Migration ownership | **1** | **Central** `packages/db/migrations`; a module cannot bring schema | **5** | Per-module migrations **+ snapshot drift detection** |
| H-5 | Boundary enforcement | **1** | None — no boundary test; 11 manual `assertAllowed` sites | **4** | `requires` blocks the build; `defineLink` is the sanctioned cross-module path |
| H-6 | Codegen / registry | **1** | None — hardcoded manifests | **5** | 4,127-line generator, checksum-incremental |
| H-7 | Test scaffolding | **4** | 234 tests, **executed, green** | **3** | Extensive suites — **not run by me** |
| H-8 | Strip cost | **4** | ~19,900 LOC of wrong-model admin UI to delete | **5** | Config override + path override + eject |
| | **Average** | **2.25** | | **4.25** | |

**The gap is not close, and it is in exactly the properties that make grafting
cheap.** P1 fails the four criteria that matter most for a host — no codegen, no
DI container, no per-module migrations, no boundary enforcement. Those are the
mechanisms by which foreign code becomes organic. Adding them to P1 means
building Open Mercato's framework from scratch.

The two places P1 wins are real but narrower: **Drizzle is more portable than
MikroORM decorators** (H-3), and **its build is verified green** while P2's is
not (H-7). Neither outweighs a 2-point gap on composition.

### The asymmetry, stated plainly

| | Add a kernel to P2 | Add a platform to P1 |
|---|---|---|
| What is missing | Governance kernel — ~6 repairs + our new services | Module system, codegen, DI, migrations, entities, retrieval, workflows, rules, AI layer, UI |
| Roughly | Months | Years |

We were always going to build the kernel ourselves — it is the differentiator
([00 §2](00-product-thesis.md)). We were never going to enjoy building a module
loader.

## 3. RESOLVED — hard fork (2026-08-08)

> **"Our platform will have a life of its own. We will change it too much to be
> able to update from theirs."** — owner decision, 2026-08-08.

**Option A confirmed.** The codebase is extracted to
`workspace/starting-kit/` and is ours from this point.

Consequences accepted:

- We may change anything, including the identity and permission core — which is
  what the six repairs require.
- **No upstream merges, ever.** No rebase cost.
- **No inherited security fixes.** Mitigation: check Open Mercato releases
  periodically for the first year and port anything serious by hand. After that
  the fork will have diverged past the point where their patches apply.
- `packages/enterprise` remains excluded — its commercial licence is unaffected
  by our fork of the MIT parts.

The original analysis of the three options is kept below for the record.

### Original options (superseded by the decision above)

**Upstream ownership.** Open Mercato is MIT, third-party, actively developed at
1.3M LOC. Three options:

| Option | Meaning | Cost |
|---|---|---|
| **A. Hard fork** | Take it, delete what we don't want, never merge upstream again | We own 1.3M LOC we didn't write. No upstream security fixes. **Clean, and permanent.** |
| **B. Track upstream** | Keep the fork rebaseable | Rebase cost forever; constrains how deeply we can change the framework — which is exactly what our kernel requires |
| **C. Fork + cherry-pick** | Hard fork, but monitor upstream advisories and port security fixes manually | Middle path; needs a named owner and a review cadence |

**Recommendation was A, with C's discipline for the first year** — and that is
what was chosen. Option B was the trap: the six Change items rewrite the
principal model, the audit path and the authorisation decision, and those are not
rebaseable changes.

## 4. What the kick-start package is

> **A working multi-tenant modular platform with our governance kernel in it, one
> vertical slice proven end to end, and no ERP.**

Concretely, when the kick-start is done:

- the app boots, migrates, authenticates, and serves a backend UI;
- modules install, enable, disable and eject through the generator;
- **a non-human principal is first-class** and can hold capabilities;
- every act resolves through **one autonomy decision** that returns reasons;
- audit is **atomic with the mutation** and append-only;
- an AI worker can be given a task, propose a mutation, be gated, and be approved;
- undo works;
- one business slice runs end to end with human approval in it.

Nothing about ERP, catalogues, orders or warehouses remains.

## 5. Phase 0 — Strip

Open Mercato's architecture makes this unusually clean: modules are
self-contained, and the enable list plus the generator mean a removed module
simply stops existing.

| Batch | Action | Notes |
|---|---|---|
| **S1** | Fork, rename scope `@open-mercato/*` → ours, delete `.ai/`, `docs/wms`, `HIRING.md`, `SCREENSHOTS.md` | Mechanical |
| **S2** | Remove `packages/enterprise` **entirely** | Commercial licence. Also remove the `optimistic-lock-command` fail-closed delegation to it, or reimplement locking in our half |
| **S3** | Delete ERP modules: `customers`, `sales`, `catalog`, `wms`, `shipping_carriers`, `payment_gateways`, `currencies`, `portal`, `sync_excel`, `progress` | ~435k LOC. Remove from `modules.ts`, run generator, delete directories |
| **S3a** | ⚠ **`customer_accounts` must be split, not deleted.** It contains `domain_mappings` (`entities.ts:320-347`) — unique `hostname` per tenant with a lowercase/format check constraint. **That is per-company custom domains, which we want.** Extract that entity into a kept module before removing the rest (~25k LOC) | Found only because the strip list was challenged. See [triage §5 revision rule](platforms/02-open-mercato/00-reading-triage.md) |
| **S3b** | **Archive, do not delete.** Move stripped modules to `attic/` (excluded from the build) or tag the pre-strip commit. Costs nothing and keeps every module diff-able if we want it back | See §9b |
| **S4** | Delete ERP packages: `checkout`, `gateway-stripe`, `sync-akeneo`, `content`, `onboarding` | ~38k LOC |
| **S5** | Decide on `staff`, `planner`, `resources` | **Read their data model first** — they touch our workforce domain. Deferred item from triage |
| **S6** | Keep and re-baseline: `auth`, `directory`, `entities`, `query_index`, `audit_logs`, `business_rules`, `workflows`, `feature_toggles`, `translations`, `dictionaries`, `attachments`, `configs`, `notifications`, `messages`, `communication_channels`, `inbox_ops`, `integrations`, `data_sync`, `dashboards`, `perspectives`, `api_docs`, `api_keys`, `ai_assistant`, plus `events`/`queue`/`cache`/`scheduler`/`search`/`webhooks`/`storage-s3`/`ui`/`cli`/`shared`/`create-app` | The platform we keep |
| **S7** | Green the build: install, typecheck, test, build | **This is also the P-13 verification I never ran.** If it fails badly, that is a material finding and this plan pauses |

**Exit:** a booting, tested platform of roughly 700–800k LOC with no ERP.

## 6. Phase 1 — Repair the six

From [P2 verdict §5](platforms/02-open-mercato/02-verdict.md). Ordered so each
makes the next cheaper. **No feature work before these land** — every module
built on top inherits the shape.

| # | Repair | Gate |
|---|---|---|
| **R1** | **Principal abstraction** — a first-class principal with `kind` (human / ai_worker / service / system); migrate the 30 string-prefix sites | An AI worker holds capabilities with no `api_key:` prefix parsing |
| **R2** | **Audit atomicity** — thread `transactionalEm` into `ActionLogService`; make `persistLog` fail **closed** | A failed audit rolls back the mutation |
| **R3** | **Append-only ledger** — add a hash-chained ledger alongside the mutable journal; keep the journal for undo | Two records: journal for undo, ledger for proof |
| **R4** | **Capability descriptor** — add effect class, reversibility, data classes, amount binding to `features` | A capability declares its risk, not just its name |
| **R5** | **Decision with reasons** — `checkAuthorization` returns a Decision object carrying contributing rules (**I6**) | Any denial renders as one plain sentence |
| **R6** | **Typed org edges + ceilings** — add typed relationships and `authority_ceiling` to the org tree; **keep** `ancestor_ids`/`descendant_ids` as the resolution index | A subsidiary cannot be granted more than its parent edge permits |

## 7. Phase 2 — Graft from P1

Only six items, all small. P1's value is concentrated, not broad.

**P1's remaining edge is entirely in the authority model.** Everything else it has
is superseded by a better P2 equivalent. Verified absences in P2 marked ✗.

| # | From P1 | In P2? | Graft cost | Why it matters |
|---|---|---|---|---|
| **G1** | **Layered resolver with explanation trace** — 8 ordered sources, deny-wins, accumulated reasons | Boolean feature check | Medium — rewrite the logic, keep the *shape* | P1's single best asset, and our **I6**. Pairs with P2's `mutationPolicy` ordering |
| **G2** | **Typed org edges + `permission_ceiling_id` + `inheritance_mode`** | Untyped tree | Low — schema only | The authority half of the org model; keep P2's closure columns as the index |
| **G3** | **`temporary_delegations`** — scope, expiry, revocation, mandatory reason | ✗ **none** | Low — one table + one resolver branch | P2 has no delegation of authority whatsoever |
| **G4** | **Project-level permission overlays** — `project_memberships.permission_overlay` with **terminal deny** | ✗ **none** — verified | Low | P2 scopes by tenant and organisation only. Project/case/engagement scoping is central to our SRS (FR-550, FR-560) |
| **G5** | **`record_policies.lock_state`** (open/restricted/locked) | ✗ — locking is in the **commercial** package | Low | Now *more* important than first credited: excluding `enterprise` leaves the MIT half with no record locking at all |
| **G6** | **Event `visibility_scope`** (platform/tenant/portal/project/private) | ✗ **none** — verified | Trivial — one column + filter | Decides an event's audience at write time instead of reconstructing it per query |
| **G7** | **Locale direction policy** — `inferTextDirection`, RTL prefix set, per-portal `text_direction_policy` | Partial — Radix components accept `dir="rtl"`, but **only 4 LTR locales ship** and there is no direction *policy* layer | Trivial — 111 dependency-free lines | P2 has the *capability*, P1 has the *policy*. We need both, and Arabic is in scope |
| **G8** | **Migration advisory lock** (`pg_advisory_lock`) | Unverified in MikroORM's runner | Trivial | Concurrency safety on boot |

Total: roughly 1,500–2,000 lines of schema and logic. **All eight are portable
because none is framework-coupled** — they are tables and decision logic, not
NestJS or Drizzle machinery.

**Not grafted from P1:** module manifest, DI, hook registry, admin UI, event bus,
audit repository, `LOCAL_NO_DB`, binary permission effect, Drizzle schema. All
superseded.

## 8. Phase 3 — Build the kernel

Our own work, unchanged from [01 §6.1](01-core-architecture.md), now with a
platform underneath it:

Charters and mindflow · trust tiers · task grades · the full autonomy ladder ·
canonical entities · tags, lenses and Knowledge Cells · beams (extending
`defineLink`) · addressing and mentions · the Garage · Industry Packs · the
Company Compiler · attribution chain.

## 9. Do we need more general platforms?

**No — not as host candidates.** Open Mercato at 4.25 host-fitness, with a
codegen registry, a universal override surface, per-module migrations and a
working AI governance layer, is a strong host. Another general platform would
cost days to assess and is unlikely to beat it.

**Yes — as targeted donors**, which is exactly what you proposed. Our gaps are
now precisely defined, so donors can be evaluated against a short list rather
than a full assessment:

| Gap | What a donor would supply |
|---|---|
| **Knowledge / RAG** | Document ingestion, chunking, citation-bearing retrieval, knowledge governance |
| **Canonical entity / identity resolution** | Matching, merge/split, confidence, manual override |
| **Tags, lenses, semantic layer** | Controlled vocabulary, taxonomy governance, saved-scope semantics |
| **Addressing / mentions / collaboration** | Handles, rotations, escalation chains, threaded work discussion |
| **Trust / evaluation** | Scenario suites, regression scoring, shadow-mode comparison |
| **Attribution / tamper-evidence** | Hash-chained ledger, signing, offline verification |
| **Company modelling** | Org design, role templates, process libraries |

A donor assessment against a single gap is a half-day using the same probes, not
a six-batch programme. Send them whenever you like.

## 9a. "Fork P2, or greenfield and migrate pieces in?"

The question worth asking, and it is not obviously settled by §2. Host-fitness
says *if you adopt something, adopt this one*. It does not say *adopt something*.

### The honest case for greenfield

1. **We keep far less than we carry.** After stripping we hold ~700–800k LOC and
   would *actively use* maybe half. The rest is inherited surface area.
2. **The six repairs are not extensions — they are foundation changes.** A
   principal abstraction across 30 files, audit atomicity, a decision object with
   reasons, a capability risk descriptor. We are not building on their
   architecture; we are altering its base.
3. **Their answers differ from ours where it matters.** Boolean feature check vs
   a six-level ladder with reasons. A three-level mutation policy vs an autonomy
   ladder over all capabilities. A mutable journal vs journal + ledger. A string
   prefix vs first-class principal kinds. These are not gaps to fill; they are
   different answers to the same questions.
4. **Nobody on the team holds a model of 1.3M lines they did not write.** Every
   defect becomes archaeology. That is a permanent tax, not a one-off cost.
5. **H-3 = 2.** MikroORM decorators everywhere; every graft is rewritten onto it.

### The case for adopting, which I find stronger

1. **It runs.** Hosted, working, bugs and all. That is the single most expensive
   property a platform can have and the one greenfield takes 12–18 months to
   reach. It also retires the largest open risk in §10.
2. **The undifferentiated 80% is done and correct**: module loader, codegen, DI,
   per-module migrations with drift snapshots, i18n enforcement, CRUD factory,
   admin UI, search, queue, cache, scheduler, webhooks, storage, email, design
   system, test scaffolding, Docker, CI. None of it is our differentiator and all
   of it takes longer than anyone budgets.
3. **The engines are individually hard.** `query_index` (doc + vector + tokens +
   coverage), `workflows` (fork/join, human tasks, escalation), `entities`
   (typed EAV + jsonb + encryption), `business_rules`. Each is months. Rebuilding
   all four is most of a year, to arrive somewhere similar.
4. **The AI governance layer is already close to our design** — and we would
   likely reinvent it in nearly the same shape.
5. **The six repairs are bounded and mechanical.** 30 findable call sites;
   threading a transaction parameter; widening a return type. Days to weeks each,
   not months.

### Decision

> **Adopt P2 as host — with three disciplines that give us most of greenfield's
> benefits without paying its bill.**

**D1 — Strip to the bone before writing a line of our own.** Phase 0 completes
first. Default is *exclusion*: a module earns its place by being justified, not
by being hard to remove. The goal is the smallest thing that boots.

**D2 — The kernel is new code in our own packages, never edits to theirs.** Our
five services live in `packages/kernel-*`. Their `auth` module becomes an
*adapter* that answers to our principal service — we do not rewrite it into ours.
This keeps the differentiator clean, separately testable, and portable if we ever
abandon the host.

**D3 — Their modules sit behind our provider interfaces from day one**, even
where there is only one implementation. `workflows`, `query_index`, `entities`,
`ai_assistant` are *providers*, not our implementation. If one proves wrong we
replace a provider instead of rewriting the platform.

Together these mean we are not really "forking an ERP". We are taking a working
runtime and composition system, and building our product in our own packages on
top of it — which is the greenfield architecture with a working substrate
underneath.

### The test that makes this falsifiable

The greenfield case rests entirely on whether the six repairs are **bounded** or
**structural**. That is testable cheaply, and it should be tested before
committing:

> **Spike: do R1 (principal abstraction) and R5 (decision with reasons) first,
> timeboxed to three weeks, on the stripped fork.**

These two are deliberately chosen: they are the most invasive of the six and they
touch the parts of P2's design that differ most from ours.

| Outcome | Read |
|---|---|
| Both land inside the box | The foundation is malleable. Adopt with confidence; proceed to Phase 0–3. |
| They sprawl beyond it | The base is not reshapeable. **Greenfield becomes correct**, and we have learned it for three weeks instead of a year. |

This converts an unfalsifiable strategic argument into a two-week experiment. I
would not commit either way without running it.

## 9b. Bringing stripped modules back later

**Yes — and it is genuinely easy, because of how the platform is built.** A
module owns its own database migrations, permissions, dependency wiring,
translations, screens, APIs and tests. Restoring one is three steps:

```text
1. restore the module directory
2. add its entry to modules.ts
3. run the generator
```

The generator then validates its dependencies and refuses to build if anything
it needs is missing — so a restored module cannot come back half-connected.

**Two caveats that grow with time.**

- **Contract drift.** After the six repairs (§6), a restored module is written
  against the *old* contract: boolean authorisation, string-prefix principals, no
  capability risk descriptors. It will run, but it will not be governed the way
  our own modules are. It needs updating, and the gap widens each month.
- **ERP semantics.** These modules assume shop concepts. A returning module is a
  starting point to rewrite, not a finished feature.

**Therefore: archive, do not delete (S3b).** Keep stripped modules in an
`attic/` folder outside the build, or tag the pre-strip commit. Costs nothing,
and preserves the ability to diff a module against the version we removed —
which is exactly what makes "fix it and bring it back" cheap rather than
archaeological.

## 10. What could still overturn this

Recorded so the decision is falsifiable:

- **S7 fails badly.** If Open Mercato does not build, test and boot cleanly after
  stripping, the host choice is not proven — I have not verified its build.
  This is the one open technical risk and it is checked first, deliberately.
- **You choose upstream option B.** Tracking upstream makes the six repairs
  impractical, and the calculus changes.
- **The ERP is more entangled than the module boundaries suggest.** Measured
  coupling was high (`customers` 36 inbound, `sales` 62). If deleting them breaks
  kept modules, S3 gets expensive. Mitigation: S3 is done module by module with
  the generator as the check — it refuses to emit a registry with unmet `requires`.
