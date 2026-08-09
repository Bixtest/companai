# P2/01 — Forensic Analysis: Open Mercato

**Subject:** `companai/open-mercato-main/open-mercato-main` — Open Mercato 0.6.7
**Upstream:** [github.com/open-mercato/open-mercato](https://github.com/open-mercato/open-mercato)
**Method:** [Assessment methodology](../../method/platform-assessment-methodology.md).
Source first; documentation read in Batch 5 and used only to check claims.
**Status:** Batch 0 complete. Batches 1–6 pending.

---

## 1. Verified facts (Batch 0)

| Property | Value | How verified |
|---|---|---|
| Version | 0.6.7 | `package.json` |
| Licence | MIT — `LICENSE`, "Open Mercato contributors", 2025–2026 | file read |
| | ⚠ root `package.json` has **no `license` field**, and `packages/enterprise` exists | to audit in Batch 3 |
| Size | **7,833 `.ts`/`.tsx` files · 1,321,919 LOC** (excl. node_modules, dist, .next) | `find` + `wc -l` |
| Workspaces | `apps/*`, `packages/*`, `external/official-modules/packages/*` | `package.json` |
| Package manager | Yarn 4.17.1 (Berry) | `packageManager` |
| Build orchestration | Turborepo | `turbo.json`, scripts |
| Test runner | **Jest** (`jest.config.cjs`, `jest.config.base.cjs`) | root config |
| Git history | **absent** — no `.git` | — |

## 2. Stack (Batch 0 — to be confirmed per package in Batch 1)

| Layer | Technology | Version |
|---|---|---|
| Framework | **Next.js** | **16.2.11** |
| UI runtime | React / React DOM | 19.2.7 |
| ORM | **MikroORM** (core, decorators, migrations, postgresql) | 7.1.5 |
| Database driver | `pg` | 8.22.0 |
| **DI container** | **Awilix** | 13.0.5 |
| Validation | **Zod** | **4.4.3** |
| AI | **Vercel AI SDK** (`ai`) + `@ai-sdk/openai` | 7.0.4 / 4.0.2 |
| Data fetching | TanStack Query 5 · TanStack Table 8 | |
| Flow/graph UI | `@xyflow/react` | 12.11.2 |
| Components | Radix UI primitives · CVA · tailwind-merge | |
| Email | `react-email` + `@react-email/components` | 6.7 / 1.0.12 |
| Observability | New Relic (`newrelic.js` present) | |

Notable contrasts with Platform 1: **MikroORM not Drizzle**, **Awilix DI not
NestJS modules**, **Jest not Vitest**, **Zod 4 not 3**, **Next 16 not 15**, and a
**real AI SDK integration** where Platform 1 had a hardcoded stub.

## 3. Shape — where the code lives

```text
 825,046 LOC  4,757 files  packages/core          ← 62% of the codebase
 111,287 LOC    603 files  packages/ui
  73,738 LOC    320 files  packages/ai-assistant  ← real, not a stub
  60,038 LOC    382 files  packages/shared
  49,446 LOC    383 files  packages/enterprise    ← open-core boundary
  42,636 LOC    163 files  packages/cli
  27,646 LOC    250 files  packages/create-app
  24,514 LOC    120 files  packages/search
  24,460 LOC    234 files  apps/mercato
  19,261 LOC    173 files  packages/checkout
  12,078 LOC     70 files  packages/scheduler
  10,988 LOC     38 files  packages/sync-akeneo
   8,968 LOC     82 files  packages/webhooks
   … plus onboarding, channel-imap, channel-gmail, storage-s3, cache,
     queue, events, gateway-stripe, content, apps/docs
```

`packages/core/src` is almost entirely `modules/` — **39 domain modules**:

| Module | LOC | Module | LOC | Module | LOC |
|---|---:|---|---:|---|---:|
| customers | 173,786 | dictionaries | 9,980 | translations | 6,217 |
| sales | 86,777 | planner | 9,655 | configs | 5,725 |
| **workflows** | 59,292 | integrations | 9,282 | perspectives | 4,278 |
| catalog | 58,717 | dashboards | 8,776 | api_keys | 3,293 |
| wms | 46,627 | feature_toggles | 8,597 | progress | 3,177 |
| staff | 36,128 | sync_excel | 7,851 | portal | 1,869 |
| **auth** | 34,206 | shipping_carriers | 7,676 | api_docs | 1,834 |
| communication_channels | 29,722 | payment_gateways | 7,203 | core | 1,250 |
| messages | 26,544 | **audit_logs** | 6,570 | widgets | 18 |
| customer_accounts | 25,738 | notifications | 6,234 | | |
| inbox_ops | 22,316 | currencies | 13,500 | | |
| **business_rules** | 18,105 | resources | 12,829 | | |
| **entities** | 15,143 | attachments | 12,607 | | |
| **query_index** | 13,766 | directory | 11,771 | | |
| | | data_sync | 10,047 | | |

Non-module core code is small: `helpers` 5,161 LOC, `bootstrap.ts` 244 LOC,
`index.ts` 2 LOC. **The framework layer is thin; the product is enormous.**

## 4. Module anatomy (observed, not yet read)

Every module follows the same layout — this is the most immediately notable
structural fact about the codebase:

```text
modules/<name>/
├── index.ts              module manifest / registration
├── acl.ts                access-control declarations
├── di.ts                 dependency-injection registrations
├── events.ts             event declarations
├── setup.ts              install/bootstrap
├── cli.ts, commands/     CLI surface
├── api/                  HTTP endpoints (+ __tests__)
├── backend/              admin UI
├── frontend/             storefront UI
├── components/           React components
├── data/entities.ts      ORM entities
├── data/validators.ts    Zod validators
├── lib/                  domain logic
├── services/             services
├── migrations/           module-owned migrations
├── i18n/{de,en,es,pl}.json   translations, per module
├── emails/, notifications.ts, encryption.ts   (where relevant)
├── __tests__/, __integration__/
└── AGENTS.md · CLAUDE.md · README.md    per-module agent documentation
```

Four things worth flagging now and verifying in Batch 1: **per-module ACL**,
**per-module DI**, **per-module migrations**, and **per-module i18n across four
locales**. If those hold up, the module contract is stronger than Platform 1's —
and Platform 1's was already close to what we specified.

## 5. Documentation inventory (not yet read — Batch 5)

There are **four distinct documentation trees**, with no overlap between them.
They are easy to confuse and serve different purposes.

### 5.1 `apps/docs/docs/` — the published site (254 pages)

**This is the source of docs.openmercato.com**, a Docusaurus site whose
`sidebars.ts` is the literal navigation tree.

| Section | Pages | | Section | Pages |
|---|---:|---|---|---:|
| framework | 89 | | installation | 10 |
| user-guide | 66 | | architecture | 8 |
| cli | 31 | | customization | 8 |
| api | 20 | | tutorials | 6 |
| enterprise | 12 | | introduction / deployment / appendix | 4 |

**Acquisition method: read from the repository, not crawled.** A verification
fetch of `https://docs.openmercato.com/architecture/system-overview` returned the
**site homepage**, not the requested page — the crawler receives the SPA shell.
The in-repo source is complete, enumerable, and version-matched to this checkout,
which the live site would not be.

### 5.2 `docs/` — internal working material (37 files)

**Disjoint from `apps/docs/`** — no shared sections, no shared filenames.

| Path | Files | Content |
|---|---:|---|
| `docs/design-system/` | 30 | Component APIs and specs, token values, **lint rules**, **enforcement**, contributor guardrails, decision log, coverage report, migration tables, metrics, champions, risk analysis |
| `docs/manuals/windows/` | 5 | Setup manuals (PDF/HTML, EN + PL) |
| `docs/wms/` | 1 | WMS roadmap and estimates |
| `docs/superpowers/plans/` | 1 | `spec-053c-partner-portal-module-slimming` |

**`design-system/` is high-priority for us.** It is the operating discipline
behind [our Garage](../../01-core-architecture.md) — component contracts,
versioned tokens, a decision log, coverage measurement, and *enforcement*. The
repo also ships `packages/eslint-plugin-ds`, which suggests the design system was
enforced in CI rather than merely documented. If so, it is a working instance of
"an architectural rule without an enforcing test is a preference".

`module-slimming` is also directly relevant — it is a worked example of the
**strip** phase in our host/donor programme.

### 5.3 `.ai/` — agent workflow scaffolding

**155 specs · 160 runs · 34 skills · 9 analyses · 7 reports · plans, QA,
trackers.** The platform was built using AI agents; this is the machinery. Of
interest both as evidence about how the code was produced and as a reference for
our own agent-operated development.

### 5.4 Root markdown and per-module docs

`README.md` 27 KB · `AGENTS.md` 31 KB · `CHANGELOG.md` **203 KB** ·
`UPGRADE_NOTES.md` 61 KB · `BACKWARD_COMPATIBILITY.md` 25 KB ·
`report-high.md` 67 KB · `SCREENSHOTS.md`, `CONTRIBUTING.md`, `SECURITY.md`,
`HIRING.md`. Plus `AGENTS.md` + `CLAUDE.md` + `README.md` **inside each of the 39
core modules**.

A 203 KB changelog, a 61 KB upgrade-notes file and a dedicated
`BACKWARD_COMPATIBILITY.md` suggest real release discipline — a hypothesis to
test (**H7**), not a conclusion.

## 6. Hypotheses for Batches 1–4

Recorded so they can be falsified rather than confirmed by selective reading.

| # | Hypothesis | Test |
|---|---|---|
| H1 | The AI package is real and substantive, unlike Platform 1's stub | P-1 absence grep; read `packages/ai-assistant` in Batch 4 |
| H2 | There is no org-topology equivalent to Platform 1's portal graph with inheritance ceilings | Read `portal`, `directory`, `staff` modules |
| H3 | Authorisation is per-module `acl.ts` rather than one central resolver — which would fail our **I5** | P-3 chokepoint count; trace 3 write paths |
| H4 | The module contract is strong enough to be worth adopting wholesale | Read `index.ts` manifests + the loader |
| H5 | `packages/enterprise` contains capabilities we would need, under non-MIT terms | File-level licence audit |
| H6 | The custom-entity engine (`entities`, 15k LOC) implements much of our SRS FR-260…263 | Read in Batch 4 |
| H7 | Documentation reliability is high (release discipline) — the opposite of Platform 1 | P-12 claim verification |

## 7. Batch 1 — The framework layer

Read in full: `shared/modules/registry.ts` · `core/bootstrap.ts` ·
`cli/lib/generators/{module-registry,module-di,scanner}.ts` ·
`apps/mercato/src/modules.ts` · `core/modules/auth/{index,acl}.ts`.

### 7.1 The module contract

`Module` (`shared/modules/registry.ts:230-263`) declares **twenty-one surfaces** —
roughly double Platform 1's eleven:

```text
id · info                          identity + ModuleInfo (requires, ejectable, licence)
backendRoutes · frontendRoutes     separate admin and storefront route trees
apis                               route-file (per-method handlers) or legacy
cli · translations
features                           capability declarations, from acl.ts
subscribers · workers              auto-discovered event and queue handlers
entityExtensions · customFieldSets extend ANOTHER module's entities
customEntities                     virtual/logical entities
dashboardWidgets · injectionWidgets · injectionTable
vector                             per-module vector/semantic search config
setup                              tenant seed configuration
defaultEncryptionMaps              per-module field-level encryption declarations
integrations · bundles             integration marketplace declarations
```

Three of these have no equivalent anywhere in Platform 1 and map directly onto
things we specified: **`entityExtensions`/`customFieldSets`** (a module extends
another module's entities without touching them), **`injectionWidgets`/
`injectionTable`** (UI injection points — our slot registry), and
**`defaultEncryptionMaps`** (declarative field-level encryption, with duplicate
detection that throws at registry build, `registry.ts:501-526`).

### 7.2 Discovery is convention-based, composition is build-time

The generator scans each module for well-known files and emits a registry:

```text
scanned:   index.ts · acl.ts · ce.ts · di.ts · events.ts · encryption.ts
           integration.ts · setup.ts · vector.ts · cli.ts · generators.ts
           + api/ backend/ frontend/ data/ migrations/ i18n/

emitted:   modules.generated.ts (+ .app/.bootstrap/.cli/.runtime)
           api-routes · backend-routes · frontend-routes .generated.ts
           di.generated.ts · subscribers.generated.ts
           bootstrap-registrations · cli-modules · command-loaders
           enabled-module-ids .generated.ts
```

`module-registry.ts` is **4,127 lines** — the largest single artefact in the
framework and the real composition engine. Generation is checksum-incremental
and uses `ts-morph` AST construction rather than string templating.

**Dependency enforcement** lives at `module-registry.ts:3340-3356` (and again at
3757): a module whose `requires` names a module that is not enabled causes the
generator to **refuse to write the registry**, with a copy-pasteable fix in the
error. Since the Next.js dispatcher imports that registry, the app cannot boot.
This is **invariant I11 ("declared or it does not exist") enforced at build
time** — independently arrived at, and stronger than anything Platform 1 had.

### 7.3 Capabilities are "features" — flat, and that matters

`acl.ts` exports a feature list; `auth/acl.ts` in full is eight entries of:

```ts
{ id: 'auth.users.list', title: 'List users', module: 'auth' }
```

Naming is `module.object.verb`. Routes declare `requireFeatures`. Notably,
`requireRoles` is **deprecated in the type itself** with the reason *"role names
are mutable and can be spoofed"* — good security instinct, explicitly recorded.

But a feature carries **only `id`, `title`, `module`**. There is no risk level,
no effect class, no reversibility, no data classification, no amount binding.
Platform 1's `PermissionDeclaration` at least carried `risk_level`; our
descriptor ([02 §4](../../02-authority-and-autonomy.md)) carries eleven fields.
**The capability model here is broad but flat** — excellent coverage, no risk
semantics. That is a gap we would have to add, not a shape we would have to undo.

### 7.4 Two authorisation realms, both human

Routes distinguish `requireAuth`/`requireFeatures` (staff) from
`requireCustomerAuth`/`requireCustomerFeatures` (portal customers, checked
against `CustomerRbacService`). So the platform already accepts that **more than
one kind of principal exists** — which is structurally promising for **P-2**,
though neither realm is non-human. To be traced in Batch 2.

### 7.5 Dependency injection

Awilix. Each module may export `di.ts` with a `register(container)` function;
`module-di.ts` collects them into a generated `diRegistrars` array.
`bootstrap.ts` is the composition root and registers `cache`, `eventBus`,
`kmsService`, `tenantEncryptionService`, `rateLimiterService`,
`searchModuleConfigs`, then auto-registers every module's discovered subscribers.

**Container-based DI is a significant host-fitness advantage** (H-2): a grafted
service is *registered*, not wired.

### 7.6 The override surface — the strip mechanism

`apps/mercato/src/modules.ts` is the enable list, and each entry may carry
`overrides` that **disable (`null`) or replace any contract a module presents**:

```text
ai.agents · ai.tools            ← AI agents and tools are overridable contracts
routes.api · routes.pages
events.subscribers · workers
widgets.injection/components/dashboard
notifications.types/handlers
interceptors · commandInterceptors · enrichers · guards
cli · setup.seedExamples
acl.features                    ← capabilities can be disabled per app
di                              ← services can be replaced per app
encryption
```

Combined with `ModuleInfo.ejectable` (a module can be ejected into the app's own
`src/modules/` for editing), this is the strongest **H-8 strip-cost** signal
possible: **stripping is a configuration change, not a fork.** Grafting is
registration into the same surfaces.

That `ai.agents` and `ai.tools` appear in this list is also the first hard
evidence for **H1** — the AI layer is architectural here, not a side feature.

### 7.7 Per-module migrations — confirmed

`auth` 11 · `workflows` 11 · `query_index` 6 · `audit_logs` 5 ·
`business_rules` 5 · `entities` 4 · `directory` 3. A grafted module brings its
own schema (**H-4**).

### 7.8 Concern — silent degradation on failure

`bootstrap.ts` wraps nearly every registration in try/catch with a fallback. Two
are worth flagging:

- event bus creation failure falls back to a **no-op bus**
  (`bootstrap.ts:138-145`) — `emit` becomes an empty async function;
- cache creation failure falls back to an in-memory strategy silently.

A no-op event bus means every subscriber, and anything that audits *via*
subscribers, stops without error. This is the same class of risk as Platform 1's
`LOCAL_NO_DB` proxy stub. **Whether audit depends on the bus is the first
question of Batch 2.**

Also noted: `globalThis`-keyed singletons (`__openMercatoCacheService__`,
`__openMercatoRateLimiterService__`) to survive module duplication under
tsx/webpack — pragmatic, and a smell worth remembering if we ever graft this.

### 7.9 Provisional host-fitness (to be confirmed)

| Criterion | Signal | Provisional |
|---|---|---|
| H-1 Module contract | 21 surfaces, convention-discovered | **Strong** |
| H-2 Dependency injection | Awilix, per-module `di.ts`, generated registrars | **Strong** |
| H-4 Migration ownership | Per-module, confirmed | **Strong** |
| H-6 Codegen / registry | 4,127-line generator, checksum-incremental, boot-blocking validation | **Very strong** |
| H-8 Strip cost | Enable list + universal override surface + ejectable | **Very strong** |
| H-3 ORM neutrality | MikroORM everywhere, entities are decorated classes | **To assess** |
| H-5 Boundary enforcement | `requires` enforced; but cross-module imports measured high | **To assess (Batch 2)** |
| H-7 Test scaffolding | Jest, per-module `__tests__`/`__integration__` | **To assess (Batch 3)** |

## 8. Batch 2 — Enforcement tracing

Traced: the API dispatcher, `checkAuthorization`, the CRUD factory, the command
bus, `runCrudCommandWrite`, `ActionLogService`, and the auth resolution path.

### 8.1 There is a real chokepoint (P-3) — **I5 satisfied**

**All** module API routes are served by one Next.js catch-all,
`apps/mercato/src/app/api/[...slug]/route.ts`, which resolves auth, checks
features, enforces tenant selection, rate-limits, and dispatches. Only three
routes bypass it: `api/auth/login`, `api/docs/markdown`, `api/docs/openapi`.

This is materially stronger than Platform 1's 11 hand-written `assertAllowed`
call sites. **Authorisation cannot be forgotten by omitting a call** — only by
omitting a *declaration*.

### 8.2 Authentication is default-deny; authorisation is opt-in

```ts
const requiresAuthentication = methodMetadata?.requireAuth !== false   // default ON
const requiredFeatures = methodMetadata?.requireFeatures ?? []          // default NONE
```

A route that declares no features is **authenticated-only** — any logged-in user
may call it. Measured: of ~500 API files, 354 declare `requireFeatures`
directly; of the mutating routes, only **12** lack it.

**My first count of those 12 would have been a false finding.** Checking them
showed most use `makeCrudRoute`, which generates `metadata.requireFeatures` from
`manageFeature`/`viewFeature` config — e.g. `sales/api/orders/route.ts` declares
`manageFeature: 'sales.orders.manage'`. The genuine remainder are
ownership-scoped self-service actions (`notifications/[id]/read`). Authorisation
coverage is high.

The architectural difference from our design remains: here an undeclared
capability means *authenticated-only*; in ours it means *unreachable* (**I11**).

### 8.3 Two security decisions worth taking wholesale

- **`requireRoles` is deprecated and actively not enforced at runtime**, with a
  console warning. The stated reason: *"role names are tenant-mutable and
  spoofable, so honoring them would let a tenant admin create or rename a role to
  satisfy the guard."* They removed a working-but-unsafe auth path rather than
  leaving it in place.
- **HTTP parameter-pollution hardening** (issue #2665): `tenantId` can arrive
  multiple times — repeated query params, and body plus query. The dispatcher and
  the handler historically disagreed about which occurrence wins, so the gate now
  validates **every distinct candidate** and rejects if any targets a tenant the
  actor may not select. Subtle, real, and well-reasoned.

### 8.4 The command bus — undo and redo are first class

Mutations run as **commands** (`commandId`), through a bus that records:

```text
snapshotBefore · snapshotAfter · changes (auto-derived by diff)
undoToken · actorUserId · tenantId · organizationId
resourceKind/Id · parentResourceKind/Id · actionLabel · context
```

`undo()` and `redo()` are implemented, with undo claims to prevent double-undo,
and are exposed as API routes under `audit_logs/actions/{undo,redo}`.

**This is our I8 (reversibility as a first-class property) and the compensation
half of gates A3/A4 — actually built.** Neither Platform 1 nor our own documents
had a working model of it. High-value finding.

Also present: `CommandRuntimeContext.transactionalEm` lets a caller compose a
command into its own transaction "as a single atomic, single-locked operation",
and `systemActor` marks trusted server-side invocation with the explicit rule
*"HTTP request paths MUST NOT set this"* — a well-guarded escape hatch.

### 8.5 Business writes are transactional — audit is not (P-5)

```text
runCrudCommandWrite → withAtomicFlush(em, phases, { transaction: true })   ✅ atomic
      ↓
emitCrudSideEffects  → events + query_index reindex                        after commit
      ↓
persistLog → ActionLogService.log() → this.em.fork() → own flush           ❌ SEPARATE TRANSACTION
```

`ActionLogService.log()` opens `this.em.fork()` — a fresh EntityManager with its
own transaction — and `command-bus.ts` contains **zero** references to
`transactionalEm`, so the caller's transaction is never threaded into the log.

Worse, `persistLog` **fails open silently**: it resolves `actionLogService`
inside a `try/catch`, sets `service = null` on failure, and `return null`. It
also returns early on `metadata.skipLog` and on a `SKIPPED_ACTION_LOG_RESOURCE_KINDS`
membership test.

**So a committed business change can exist with no action-log row, and nothing
reports it.** This is the same defect class as Platform 1 — but with an important
asymmetry: here the *business write itself* is properly atomic, and the *record*
is far richer. Only the coupling between them is missing.

### 8.6 Audit does not ride the event bus — the Batch 1 concern is narrower

`ActionLogService` is called directly, not via events. So the no-op event bus
fallback (§7.8) would **not** silence the action log. It would silence domain
events, subscribers, and `query_index` reindexing — leaving search and
projections stale while the audit trail survives. Still a real risk, but a
different and smaller one than I flagged.

### 8.7 P-2 — non-human principals already exist

`AuthContext` supports an API-key principal:

```ts
{ sub: `api_key:${record.id}`, isApiKey: true, keyId, keyName,
  tenantId, orgId, roles, isSuperAdmin, ...(actualUserId ? { userId } : {}) }
```

`rbacService.ts:262-271` branches on `userId.startsWith('api_key:')` and resolves
grants from the `ApiKey` entity. So a non-human actor **holds its own features,
scope and super-admin flag, with no fake user row and no impersonation.** That is
ahead of Platform 1, where an AI worker could not act at all.

**But the shape is the one our I2 forbids.** The principal kind is a *string
prefix on `sub`*, re-parsed at each site rather than modelled as a principal with
a `kind`. Blast radius (**P-11**): **30 files** branch on `api_key:` or
`isApiKey`, spread across `auth`, `audit_logs`, `customers`, `messages`,
`resources` and `ai-assistant`.

**Diffused, not concentrated** — the inverse of Platform 1's blocker. Platform 1
could not represent a non-human principal but the fix was three places; Open
Mercato *can* represent one, and adding a third kind (`ai_worker`) means either
touching 30 branch sites or introducing a proper principal abstraction and
migrating them to it.

That `ai-assistant` is already one of the 30 is notable: the AI layer already
reasons about principal kinds.

### 8.8 Batch 2 scorecard

| Property | State |
|---|---|
| Single decision point (I5) | **Enforced** — one dispatcher, 3 documented exceptions |
| Authentication | **Default-deny** |
| Authorisation | **Opt-in per route**; coverage high in practice |
| Business write atomicity | **Enforced** |
| Audit atomicity with the write | **Not enforced** — separate forked transaction |
| Audit failure behaviour | **Fails open, silently** |
| Reversibility (I8) | **Implemented** — undo/redo with snapshots |
| Non-human principal | **Exists**, as a string-prefix discriminator across 30 files |
| Attribution chain | **Partial** — actor, tenant, org, resource, before/after. No `on_behalf_of`, no authority source, no invoker |

## 9. Batch 3 — Verification and probes

### 9.1 Licence — `packages/enterprise` is commercial and is excluded

Root `LICENSE` is MIT. Every package declares `"license": "MIT"` **except**:

| Package | Licence field |
|---|---|
| `packages/enterprise` | `SEE LICENSE IN LICENSE.md` |
| `packages/eslint-plugin-ds`, `apps/mercato`, `apps/docs` | *(no field — inherit root MIT by context)* |

`packages/enterprise/LICENSE.md` states it is **commercial software**: permitted
only for "non-production, developer-only evaluation", and explicitly forbids

> "modify, refactor, reverse engineer, **derive from, or generate new features
> based on** this package."

**Decision: `packages/enterprise` (49,446 LOC) is excluded from this assessment
entirely.** Its source is not read, and it produces no salvage entries. Reading
it for design inspiration we then implement is precisely what the derivation
clause prohibits.

Its module list — `record_locks`, `security`, `sso`, `system_status_overlays` —
is recorded only because it is already published in their own documentation.

Practical consequence for a host decision: the MIT core has **no record locking,
no SSO, and no advanced security module**. `optimistic-lock-command.ts` in the
MIT core contains a *fail-closed delegation* to the enterprise record-lock —
meaning the open core is aware of, and degrades without, the commercial package.
That boundary must be re-checked before relying on any locking behaviour.

### 9.2 P-1 absence — with the false positives removed

The first pass produced a serious false positive that a careless reading would
have published. Method: case-insensitive substring, then **re-run word-bounded**,
then **inspect actual matches**. Control terms (`commandId` 199, `requireFeatures`
611, `undoToken` 95) confirm the search method works.

| Concept | Substring | Word-bounded | Verified verdict |
|---|---|---|---|
| Task grades | 114 files | **1** | **Absent** — the 114 were `upgrade`/`downgrade`; the 1 is `'Industrial Grade Part'` in seed data |
| Beams | 1 | **0** | **Absent** |
| @mentions | 10 | 4 | **Absent** — all prose ("message mentions", "operator mentions") in comments and AI prompts |
| Canonical entity | 8 | — | **Absent** — matches are the phrase "canonical `EntityExtension` shape", a doc comment about entity extensions |
| Charter | 0 | — | **Absent** |
| Autonomy ladder | 0 | — | **Absent** |
| Trust tiers | 0 | — | **Absent** |
| Lens | 0 | — | **Absent** |
| Principal abstraction | 30 | 28 | **Absent as a model** — matches are prose ("authenticated principal"); consistent with the string-prefix discriminator in §8.7 |
| Authority delegation | 7 | 6 | **Absent** — matches are test names and "fail-closed delegation" to the enterprise lock |
| AI cost budgets | 56 | — | **Absent** — all matches are test timeouts and a "dialog-stability budget" |
| **Approval** | 83 | — | **Present, two kinds** — see below |

**Approval is real and in two distinct forms:**

1. **Workflow approval steps** — `workflows/workflows.ts` and a signal named
   `approval`; the workflow engine models human approval as a signal/step.
2. **AI pending-action approval cards** — from `catalog/ai-agents.ts`:
   *"Authoring helpers … produce proposals only. Mutations … always route through
   the approval card — call them when you are ready to propose a write, then wait
   for the mutation-result-card."*

That second one is a genuine human-in-the-loop gate on AI mutations, separating
**proposal-only tools** from **mutating tools** — our A1 (propose) and A2
(approve-first) distinction, built. Strong evidence for **H1**, to be read
properly in Batch 4.

Incidental discovery: `ai-agents.ts` and `ai-tools/` are **per-module
conventions** — modules declare their own AI agents and tools. Not in the
scanner list I read in Batch 1; to be confirmed in Batch 4.

### 9.3 P-8 tenancy — pervasive, application-enforced, no RLS

195 `@Entity` declarations across 34 modules' `data/entities.ts`; 418 `tenantId`
occurrences in the same files. **No row-level security** — zero matches for
`ROW LEVEL SECURITY` across all module migrations (glob verified against
`audit_logs`, which has 5 migration files, so the search path is sound).

**I did not verify per-entity tenant coverage.** The 195:418 ratio is consistent
with broad coverage but does not prove every entity is tenant-scoped, and some
entities (currencies, dictionaries) are legitimately global. Stated as measured,
not as a guarantee.

### 9.4 P-9 audit immutability — neither log is a ledger

Two logs, both mutable by design:

| | `action_logs` | access log |
|---|---|---|
| Purpose | Command journal | Read/access trail |
| Enforcement | none — no `REVOKE`, `RULE` or `TRIGGER` in any audit migration | buffered + rotated, raw SQL |
| Mutability | **By design** — `execution_state` transitions `done` → `undoing` via `nativeUpdate` | rotation |
| Deletion | soft delete via `deletedAt` | rotation |

The `action_logs` schema is genuinely rich: `command_id`, `action_label`,
`action_type`, `resource_kind/id`, `parent_resource_kind/id`, `execution_state`,
`undo_token`, `command_payload`, `snapshot_before`, `snapshot_after`,
`changes_json`, **`changed_fields`**, **`primary_changed_field`**,
`actor_user_id`, `tenant_id`, `organization_id`.

**Accurate characterisation: this is a command journal supporting undo, not a
tamper-evident audit ledger.** Rows are *designed* to be updated. Our design
needs both halves ([06](../../06-attribution-and-audit.md)); this supplies the
journal, and hash chaining, signing and append-only enforcement are absent — as
they were in Platform 1.

### 9.5 P-15 escape hatches

Configuration flags, not the dangerous no-op stubs found in Platform 1. Most
frequent: `OM_OPTIMISTIC_LOCK` (86), `OM_AI_PROVIDER` (68),
`OM_EVENTS_SINGLE_DELIVERY` (53), `OM_AI_MODEL` (50),
`OM_AI_AVAILABLE_PROVIDERS` (42).

Security-relevant, all defaulting to the safe state:
`OM_WORKFLOWS_ALLOW_PRIVATE_URLS` and `OM_WEBHOOKS_ALLOW_PRIVATE_URLS` (SSRF
guards that can be disabled), `OM_SECURITY_SUDO_SECRET`,
`OM_ENABLE_ENTERPRISE_MODULES`.

Note: AI provider and model are selected by **environment variable**, not per
principal or per agent. Model policy is global, not scoped — relevant to our
Charter model policy section.

The one genuinely dangerous fallback remains the **no-op event bus** in
`bootstrap.ts` (§7.8), narrowed by §8.6.

### 9.6 What I did *not* verify in Batch 3

Stated explicitly so no reader infers coverage that does not exist:

| Probe | Status | Why |
|---|---|---|
| **P-13 build / typecheck / test** | **Not run** | Requires a full Yarn 4 install of a 1.3M-LOC monorepo; not attempted offline. **No claim is made about this codebase's build health.** Contrast Platform 1, where these were executed. |
| **P-7 schema/migration drift** | **Not done** | MikroORM decorated entities vs per-module TS migrations needs a generated-diff run, not a grep |
| **P-10 query shape on hot paths** | **Not done** | Deferred to Batch 4 alongside `query_index` |
| **P-12 documentation claim verification** | **Deferred** | Batch 5, where the four doc trees are read |
| **P-14 test integrity** | **Not done** | Requires reading representative tests, deferred to Batch 4 |
| **P-16 churn** | **Impossible** | No `.git` in the download |
| Per-entity tenant coverage | **Aggregate only** | See §9.3 |

## 10. Batch 4 (in progress) — the AI layer

`packages/ai-assistant` — 73,738 LOC / 320 files. Read so far: package structure,
`data/entities.ts`, `acl.ts`, `ai-tools/`. **Not yet read:** `lib/agent-runtime.ts`
(2,044 LOC), `lib/model-factory.ts` (920), `lib/codemode-tools.ts` (1,044),
`lib/opencode-*`, the 41 API files, and every other Batch 4 target module.

### 10.1 The AI governance data model — ten entities

| Entity | Purpose |
|---|---|
| `ai_agent_prompt_overrides` | **Versioned prompt sections** per agent, tenant/org-scoped, with `version`, `sections` (jsonb), `notes`, `created_by_user_id` |
| `ai_pending_actions` | **The approval gate** — see §10.2 |
| `ai_agent_runtime_overrides` | Per agent/tenant/org: `provider_id`, `model_id`, `base_url`, `allowed_override_providers`, `allowed_override_models_by_provider`, `loop_disabled`, `loop_max_steps`, `loop_max_tool_calls` |
| `ai_tenant_model_allowlists` | Tenant/org: `allowed_providers`, `allowed_models_by_provider` |
| `ai_agent_mutation_policy_overrides` | Per agent: `mutation_policy`, `notes`, `created_by_user_id` |
| `ai_token_usage_events` | Per call: tenant, org, **user, agent_id, module_id**, session, turn, **step_index**, provider, model, input/output/cached/**reasoning** tokens, `finish_reason`, **`loop_abort_reason`** |
| `ai_token_usage_daily` | Rollup by day/agent/model/provider with step, turn and session counts |
| `ai_chat_conversations` · `..._participants` · `ai_chat_messages` | Conversations with **participants** |

This is a genuine AI governance layer, and several pieces map onto our Charter
almost field for field:

| Our Charter section | Their equivalent |
|---|---|
| §12 Model policy (`allowed`, `default`, `fallback`) | `ai_tenant_model_allowlists` + `ai_agent_runtime_overrides` — **two-level allowlist**, tenant ceiling and per-agent selection |
| §13 Runtime envelope (`max_plan_steps`, `max_subagent_depth`) | `loop_max_steps`, `loop_max_tool_calls`, `loop_disabled` |
| §13 Budget / cost attribution | `ai_token_usage_events` — attributed to **agent, module, user, session, turn and step** |
| §5 Mindflow (versioned, reviewable) | `ai_agent_prompt_overrides` — versioned prompt sections with author and notes |

### 10.2 `ai_pending_actions` — the approve-first gate, built

```text
agent_id · tool_name · conversation_id
target_entity_type · target_record_id
normalized_input · field_diff · records · failed_records
side_effects_summary · record_version        ← optimistic-lock check at approval
attachment_ids · idempotency_key
created_by_user_id · status · queue_mode (inline|queued)
execution_result · expires_at                ← approvals expire
resolved_at · resolved_by_user_id
```

Combined with the agent instruction quoted in §9.2 — *"Authoring helpers produce
proposals only. Mutations always route through the approval card"* — this is our
**A1 (propose) / A2 (approve-first)** distinction implemented end to end, with
field-level diffs, expiry, idempotency and a concurrency check at approval time.

Our [02 §7.2](../../02-authority-and-autonomy.md) argues approval requests must
carry the proposed act, its diff and its expected result. This does exactly that.
**Highest-value AI finding so far.**

### 10.3 MCP is first class

`acl.ts` declares `ai_assistant.mcp.serve` ("Start MCP Server"),
`ai_assistant.mcp_servers.view/manage`, and `ai_assistant.tools.list`. The
platform both **consumes and serves** MCP, and MCP server configuration is a
governed, feature-gated capability.

Relevant to Charter §9 (MCP grants) — though here MCP access is a *feature* held
by a user, not a per-agent tool allowlist.

---

### 10.4 Corrections to my earlier batches

Three statements in §7 and §9 were wrong. Recorded as corrections rather than
edited away.

**C-1 — "Features carry only `id`, `title`, `module`" (§7.3) is incomplete.**
`ai_assistant/acl.ts` shows features also carry **`dependsOn`**:

```ts
{ id: 'ai_assistant.settings.manage', title: '…', module: 'ai_assistant',
  dependsOn: ['ai_assistant.view'] }
```

So the capability model has a **dependency graph**, not a flat list. The
substantive point stands — no risk class, effect class, reversibility or data
classification — but "only three fields" was wrong. I generalised from `auth/acl.ts`,
which happens not to use `dependsOn`.

**C-2 — "AI cost budgets: absent" (§9.2) is wrong.**
I searched for the word *budget*. They call it **token usage**, and it is
comprehensive: per-call events attributed to agent, module, user, session, turn
and step, with cached and reasoning tokens broken out, plus a daily rollup.

Corrected finding: **cost *tracking* is present and more granular than our own
Charter describes. Monetary budget *enforcement* was not found** — the enforced
limits are `loop_max_steps` and `loop_max_tool_calls`, i.e. step ceilings rather
than spend ceilings. The absence of spend enforcement is stated with lower
confidence than the presence of tracking, since I searched for it only narrowly.

**C-3 — "Model policy is global, not scoped" (§9.5) is wrong.**
I inferred that from `OM_AI_PROVIDER` / `OM_AI_MODEL` environment-variable counts.
Those set *defaults*. The database model scopes policy at two levels:
`ai_tenant_model_allowlists` (tenant/org ceiling) and `ai_agent_runtime_overrides`
(per-agent selection, bounded by `allowed_override_providers` /
`allowed_override_models_by_provider`).

That is a **ceiling-and-selection** structure — the same shape as our
floors-and-ceilings resolver, applied to model choice.

**Common cause of all three:** each was inferred from a partial signal — one
module's `acl.ts`, one English word, one env-var count — without checking the
data model. This is Trap 2 ("crediting a property from its type") in its inverse
form: *dis*crediting a property from an absent keyword. Worth adding to the
methodology.

### 10.5 `mutationPolicy` — our autonomy resolver, in miniature

`lib/ai-agent-definition.ts:244` defines a **three-level ordered policy**:

```ts
type AiAgentMutationPolicy = 'read-only' | 'confirm-required' | 'destructive-confirm-required'
```

and `lib/agent-policy.ts` resolves it with a `POLICY_RESTRICTIVENESS` ranking:

```ts
// override may only NARROW, never widen
return overrideRank < baseRank ? override : base
```

Four properties, all of which we specified independently:

| Their implementation | Our design |
|---|---|
| Ordered enum with an explicit restrictiveness rank | The six-level autonomy ladder ([02 §2](../../02-authority-and-autonomy.md)) |
| `overrideRank < baseRank ? override : base` | **Most-restrictive-wins** resolution |
| `isMutationPolicyEscalation()` — the override API **rejects widening with 400** | **D-05**: overlays may only narrow ([03 §3.1](../../03-worker-charter.md)) |
| Corrupt or unknown value → fall back to code-declared; missing → `read-only` | Fail-closed compilation ([03 §6](../../03-worker-charter.md)) |

Their comment states it explicitly: *"the system fails SAFE when a schema drift
leaks through."*

**This is the closest architectural convergence found in either platform.** It is
narrower than ours — three levels, scoped to mutation surface rather than to
every capability, with no task grade, trust tier or data classification feeding
it — but the *mechanism* is the same one we designed, already built and tested.

### 10.6 The system prompt is composed from governed parts

`agent-runtime.ts` builds the prompt through `composeSystemPrompt`,
`resolveBaseSystemPromptWithOverride` (from `ai_agent_prompt_overrides`),
`buildRuntimeMutationPolicySection` / `appendRuntimeMutationPolicy`, and
`appendRuntimeTaskPlanPrompt`.

So the effective prompt = versioned base sections + the resolved mutation policy
rendered into the prompt + task-plan scaffolding. **The governance decision is
injected into the prompt rather than only enforced around it** — belt and braces,
and it means the agent is *told* what it may do, not merely blocked.

That is a genuine idea for our Charter → Grant Set compilation: the compiled
grants should also produce the prompt section describing them.

### 10.7 Correction to C-2 — budget enforcement **does** exist

My §10.4 correction said cost *tracking* exists but enforcement was not found.
That was still wrong. `agent-runtime.ts:520` defines:

```ts
export class BudgetEnforcer     // per-turn
  budget.maxToolCalls · budget.maxWallClockMs · budget.maxTokens
  → abortController.abort() with a typed LoopBudgetAbortReason:
      'budget-tool-calls' | 'budget-wall-clock' | 'budget-tokens'
```

with presets `'tight' | 'default' | 'loose'`, and the abort reason persisted to
`ai_token_usage_events.loop_abort_reason`.

**Accurate final statement:** per-turn budget enforcement exists for **tokens,
tool calls and wall-clock time**, with typed aborts and telemetry. What remains
unverified is *cumulative* enforcement — whether anything acts on the daily
rollup — and there is no **monetary** budget (currency amounts), which our
Charter §13 specifies.

This claim has now been revised three times (absent → tracking-only →
enforced-per-turn). Each pass was closer, and each earlier version would have
misrepresented the platform. Recorded in full rather than tidied, because the
pattern is the lesson: **the first answer about a capability is usually the
shallowest one.**

### 10.8 AI layer scorecard (Batch 4, partial)

| Capability | State |
|---|---|
| Agent definitions, per module (`ai-agents.ts`) | **Present** |
| Tool packs, per module (`ai-tools/`) | **Present** |
| Proposal vs mutation separation | **Present** — enforced + prompted |
| Approve-first gate with field diff, expiry, idempotency | **Present** (`ai_pending_actions`) |
| Ordered, narrow-only mutation policy with escalation rejection | **Present** |
| Model allowlist — tenant ceiling + agent selection | **Present** |
| Per-turn budget enforcement (tokens / calls / time) | **Present** |
| Cost attribution to agent, module, user, session, turn, step | **Present** |
| Versioned prompt overrides | **Present** |
| MCP consume **and serve**, feature-gated | **Present** |
| Conversations with participants | **Present** |
| Monetary budget, cumulative enforcement | **Not found** |
| Trust tiers / earned autonomy | **Absent** |
| Task grades, data classification feeding the gate | **Absent** |
| Non-human principal as a first-class identity | **Absent** — agents act under a user's auth |

### 10.9 `directory` — an org **tree**, not an authority graph (H2 resolved)

```text
tenants         → OneToMany Organization
organizations   parent_id · root_id · tree_path · ancestor_ids
                · child_ids · descendant_ids
```

**H2 confirmed.** This is a materialised-path hierarchy with denormalised
closure arrays — excellent for *traversal*, but it carries **no typed
relationships, no inheritance modes and no per-edge authority ceilings**.
Authority is scoped by org-tree membership (`resolveFeatureCheckContext`
supplies `organizationId` to the feature check), not by edges that bound it.

The comparison is complementary rather than competitive:

| | Platform 1 portal graph | Open Mercato org tree |
|---|---|---|
| Edge semantics | Typed (`owns`/`advises`/`serves`…) | Untyped parent/child |
| Authority | **`permission_ceiling_id` per edge** | None on the edge |
| Inheritance control | `inheritance_mode` | None |
| Traversal performance | Recursive lookup | **`tree_path` + `ancestor_ids` + `descendant_ids`** |

**Synthesis for our design:** keep Platform 1's typed edges with ceilings
(**D-13/D-14**), and adopt Open Mercato's denormalised closure columns as the
*implementation* of fast ceiling resolution. That directly addresses the
performance worry in [07 Q16](../../07-open-questions.md) — a graph ceiling
lookup becomes an array containment test rather than a recursive walk.

### 10.10 `entities` — the custom-object engine (SRS FR-260…263)

Two storage strategies, both tenant/org-scoped, soft-deletable, encryptable:

| Table | Role |
|---|---|
| `custom_field_defs`, `custom_field_entity_configs` | Field definitions per `entity_id` (`config_json`) |
| `custom_field_values` | **Typed EAV** — `value_text`, `value_multiline`, `value_int`, `value_float`, `value_bool` |
| `custom_entities` | Virtual entity definitions — `label_field`, `default_editor`, `show_in_sidebar`, **`access_restricted`** |
| `custom_entities_storage` | Document storage (`doc` jsonb) for wholly-custom entity records |
| `encryption_maps` | Per entity/tenant/org field encryption |

**Custom fields extend existing module entities; custom entities are new objects
entirely.** Typed value columns (rather than one stringly-typed column) make
sorting and filtering work without casting.

This is the substrate our **Garage field types** ([01 §3.2](../../01-core-architecture.md))
would sit on, and it implements FR-260…263 more completely than anything we or
Platform 1 had.

### 10.11 `query_index` — hybrid retrieval with coverage observability

| Table | Role |
|---|---|
| `entity_indexes` | Projection: `doc` (jsonb) **+ `embedding` (vector)** + `index_version`, org-coalesced |
| `search_tokens` | Tokenised search — `field`, `token`, **`token_hash`** (searchable encrypted fields) |
| `entity_index_jobs` | Partitioned rebuild jobs with `heartbeat_at`, progress counts |
| `entity_index_coverage` | **`base_count` vs `indexed_count` vs `vector_indexed_count`** |
| `indexer_error_logs`, `indexer_status_logs` | Indexer observability |

`entity_index_coverage` is the standout idea: **the platform measures how
complete its own index is.** Our [04 §6](../../04-context-graph-and-tags.md)
retrieval design assumes the index is current and has no way to know. A coverage
table makes "the answer may be stale" a measurable fact rather than a hope —
worth adopting.

### 10.12 `workflows` — a real process engine (SRS FR-190…203)

```text
workflow_definitions   versioned · enabled · effective_from/effective_to · tenant/org
workflow_instances     status · current_step_id · context · correlation_key
                       · pending_transition · active_fork_step_id
workflow_branch_instances   fork_step_id · join_step_id · branch_key
                            · parent_branch_id · context_namespace   ← parallel branches
step_instances         input_data · output_data · error_data · retry_count · execution_time_ms
user_tasks             form_schema · form_data · assigned_to · assigned_to_roles
                       · claimed_by · claimed_at · due_date
                       · escalated_at · escalated_to · completed_by   ← human tasks
workflow_events        · workflow_event_triggers (event_pattern · priority)
```

Fork/join parallelism, human tasks with claim/escalation/forms, retry counts,
correlation keys, and **temporally-versioned definitions**. This covers our
long-running process requirements, including the human-approval waits our
[02](../../02-authority-and-autonomy.md) depends on.

### 10.13 `business_rules` — a declarative policy engine

`business_rules`: `rule_type`, `rule_category`, `entity_type`, `event_type`,
**`condition_expression`**, **`success_actions`**, **`failure_actions`**,
`priority`, `version`, `effective_from`/`effective_to`.
Plus `rule_sets` + sequenced `rule_set_members`, and `rule_execution_logs`
capturing `input_context`, `output_context`, result, timing and `executed_by`.

**`rule_execution_logs` is a decision log** — the same instinct as our resolver's
explanation trace ([00 I6](../../00-product-thesis.md)), applied to rules.

### 10.14 A pattern worth naming: temporal validity is pervasive

`effective_from` / `effective_to` appears on **workflow definitions** and
**business rules**; `index_version` on projections; `version` on prompt
overrides, workflow definitions and rules.

That is our **`as_of`** requirement ([06 §3.2](../../06-attribution-and-audit.md))
already treated as normal practice for policy-like objects — though not, as far
as I have checked, for the *authorisation* rules themselves (features and roles).

## 11. Batch 5 — Documentation

Read: `architecture/` (system-overview, module-dependencies), `framework/` index,
root `AGENTS.md` (Architecture, Data & Security, UI & HTTP rule sets).
Documentation is read from the repository; the live site was tested and returns
the homepage for a deep link (§5.1).

### 11.1 P-12 — documentation accuracy

**Largely accurate, with one security-relevant staleness.**

`architecture/system-overview.mdx` §Request lifecycle states:

> "**Auth & RBAC** – `requireAuth`, `requireRoles`, and `requireFeatures`
> metadata are enforced before handler logic executes."

**`requireRoles` is not enforced.** The dispatcher explicitly ignores it and logs
a deprecation warning (§8.3). The same repository's `AGENTS.md` gets it right
("avoid `requireRoles` — role names are mutable and can be spoofed").

So the documentation is **internally inconsistent on an authorisation
guarantee** — the architecture page claims a guard that the code deliberately
removed. A reader trusting that page would believe role-based guards protect
their routes. This is a narrower and more excusable failure than Platform 1's
(a stale sentence, not a table of fictitious "Shipped" features), but it lands on
exactly the kind of claim that must not be stale.

Everything else checked matched the code: module dependency enforcement, the
generator pipeline, DI construction, the override surface, and the extension
points.

### 11.2 `AGENTS.md` — the densest architectural statement in the repository

Written for AI coding agents, and consequently more explicit than most human
documentation. The rules that matter to us:

**Architecture**
- **"NO direct ORM relationships between modules — use foreign key IDs, fetch
  separately"** — stronger than Platform 1's rule; not merely "FKs point at the
  kernel" but *no cross-module ORM relations at all*.
- **`defineLink()` in `data/extensions.ts`** — to relate another module's
  entities you declare an *extension entity plus a link*, never a foreign key.
  This is what actually makes a module removable, and it is the nearest thing in
  either platform to our **beams** ([04 §2.5](../../04-context-graph-and-tags.md)):
  typed, declared, first-class relationships that do not couple the endpoints.
- "Modules must remain isomorphic and independent."

**Data & Security**
- **`findWithDecryption` / `findOneWithDecryption` instead of `em.find`** —
  encryption enforced at the query layer by convention.
- **Migration workflow with a per-module snapshot**
  (`migrations/.snapshot-open-mercato.json`) — so schema drift *is* detectable.
  This partially answers **P-7**, which I recorded as not done: the mechanism
  exists; I did not run it.
- RBAC guidance matches the code (feature IDs, not role names).

**i18n is enforced, not encouraged**
- `yarn i18n:check-hardcoded` and `yarn i18n:check-values` (non-English coverage),
  with a per-module `.hardcoded-allowlist.json` for legitimate exceptions, and an
  `[internal]` prefix convention to opt out genuinely internal strings.

That last one is the strongest single validation of our **I12** ("locale and
direction are structural"): here it is a build-time check with an allowlist, not
a principle in a document. Combined with `packages/eslint-plugin-ds` for the
design system, this codebase repeatedly turns architectural rules into commands —
our *"a rule without an enforcing test is a preference"* principle, applied
broadly and independently.

### 11.3 The request lifecycle confirms an inline guard point

> "Writes first run **sync subscribers and mutation guards inline** in the
> request pipeline, then emit events that persistent subscribers process
> asynchronously."

So there are two subscriber classes — inline/synchronous (able to block a write)
and asynchronous (index rebuilds, notifications). The inline class is where our
resolver would hook for module-contributed policy, and it already exists.

### 11.4 Override precedence is path-based

`apps/mercato/src/modules/<module>/…` files **take precedence over package files
with the same relative path**. Combined with the `overrides` surface (§7.6) and
`ejectable`, there are three graded customisation mechanisms:

```text
config override   modules.ts entry.overrides.*      disable/replace a contract
path override     apps/…/src/modules/<m>/<same path>  replace one file
eject             copy the module into the app        own it outright
```

For our **strip → develop → graft** programme this is close to ideal: three
levels of intervention, none requiring a fork of the upstream package.

### 11.5 Not read

`framework/` (89 pages) beyond the index, `user-guide` (66), `cli` (31),
`api` (20), `docs/design-system/` (30), `.ai/specs` (155) and `.ai/skills` (34),
`BACKWARD_COMPATIBILITY.md`, `UPGRADE_NOTES.md`, `CHANGELOG.md`.

The design-system set and `.ai/` remain the two highest-value unread groups —
the first for our Garage discipline, the second as a reference for
agent-operated development. Neither changes the verdict; both are worth a
dedicated pass if this platform is selected.

## 12. Not yet assessed

Everything else. No verdict, no scoring, no salvage judgement until Batches 1–6
are complete. Batch 0 establishes shape only.
