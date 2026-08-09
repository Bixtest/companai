# 01 — Core Architecture

**Status:** provisional
**Addresses:** the scope tension — four products' worth of ambition, one team.

---

## 1. The narrow waist

The strategy is a **small kernel with a stable contract**, and everything else as
a module above it or a provider below it. If the kernel is right, breadth is
additive; if the kernel is wrong, breadth is structural rework.

Five services form the kernel. Nothing else belongs in it.

```text
┌──────────────────────────────────────────────────────────────────────┐
│  MODULES  (work, knowledge, apps, dashboards, CRM/ERP views, chat)   │
│  Each registers: objects · capabilities · events · views · actions   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  kernel contract
┌───────────────────────────────▼──────────────────────────────────────┐
│                            THE KERNEL                                │
│                                                                      │
│  1. PRINCIPAL & CHARTER    who exists, what they are, what they may  │
│  2. CAPABILITY & AUTONOMY  what acts exist, and under what gate      │
│  3. CONTEXT GRAPH          canonical entities, tags, lenses, scopes  │
│  4. ADDRESSING             handles, resolution, mentions, routing    │
│  5. LEDGER                 events, attribution, correlation, audit   │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  provider interfaces
┌───────────────────────────────▼──────────────────────────────────────┐
│  PROVIDERS  (replaceable)                                            │
│  AgentRuntime · Workflow · Search · Vector · Storage · Secrets       │
│  Identity · Analytics · ERP · CRM · Office · AppBuilder · Infra      │
└──────────────────────────────────────────────────────────────────────┘
```

### Why these five

They are the things that **every** module needs and that **no** external project
will model the way we need it. Each corresponds to a question that must have
exactly one answer platform-wide:

| Service | The question it owns |
|---|---|
| Principal & Charter | *Who is acting, and what are they allowed to be?* |
| Capability & Autonomy | *May this act proceed, and under what gate?* |
| Context Graph | *What is this about, and what else is it connected to?* |
| Addressing | *Who should this reach, and how?* |
| Ledger | *What happened, who caused it, and under whose authority?* |

If two modules answer any of those differently, the product is incoherent. That
is the whole test for kernel membership.

### What is deliberately *not* in the kernel

Tasks, projects, goals, documents, knowledge bases, dashboards, apps, chat,
CRM, ERP, workflows. All of these are modules or providers. They are large and
important, but they are replaceable and they can differ per deployment. Tasks
being outside the kernel is the surprising one — it is correct, because a task
is just an object that carries a grade, references entities, addresses
principals and emits events. All four of those come from the kernel.

## 2. The kernel services

### 2.1 Principal & Charter

Owns the identity graph and the declarative definition of every actor.

```text
Principal
├── kind: human | ai_worker | service | system
├── identity (id, handle, display, keypair ref, employment number)
├── positions[] (role, department, team, effective dates, manager)
└── charter_ref → Charter (versioned)

Charter  →  compiled  →  Grant Set
   declarative source           runtime enforcement artefact
```

Detail in [03 — Worker Charter](03-worker-charter.md).

The compile step is the important part. Nothing at runtime reads the Charter
document; it reads the compiled Grant Set. That makes Charter changes reviewable
and diffable, and makes runtime enforcement fast and auditable.

#### The org topology is a typed graph, not a tree

*Adopted from `Platform/` — see [P1 forensic §2](platforms/01-graph-portal-platform/01-forensic-analysis.md). This
replaces the flat department/team model these documents previously assumed, and
it is a genuine improvement we did not arrive at ourselves.*

Real customers are not one company with departments. They are consultancies
operating client companies, groups with subsidiaries, companies with client
portals, and temporary structures for a single engagement. A tree cannot express
"our consultancy *advises* that client company, and may see these things but
never those".

```text
Node (portal)     hub · consultant · company · subsidiary
                  · department · project · sandbox

Edge              parent → child, carrying:
                    relationship_type   owns · manages · advises · serves
                                        · licenses · templates · supervises
                    inheritance_mode    strict · flexible · reference-only · none
                    authority_ceiling   the maximum authority that can flow down
                    module_grants       which capabilities exist at all downstream
```

Three properties matter and all three are load-bearing:

- **`authority_ceiling` on the edge** means authority is bounded by *position in
  the graph* before any per-principal grant is considered. A worker in a
  subsidiary cannot be granted more than the parent's edge permits, regardless of
  what its Charter says. This is invariant **I4** enforced structurally rather
  than by convention, and it feeds the resolver as a hard floor
  ([02 §6.1](02-authority-and-autonomy.md)).
- **`inheritance_mode`** lets a client engagement be `reference-only` (see the
  structure, inherit nothing) while a subsidiary is `strict`.
- **`relationship_type`** carries meaning the permission system can reason about:
  *advises* and *owns* imply different default ceilings.

This subsumes departments and teams — a department is a portal node of type
`department` — while also expressing the multi-company topologies our target
customers actually have. It is the single most valuable structural idea recovered
from the existing codebase.

### 2.2 Capability & Autonomy

Owns the registry of every act the platform can perform, and the resolver that
decides how each act may be performed.

```text
Capability Registry     every act, with risk class and reversibility
Autonomy Resolver       (actor, capability, resource, context) → Decision
Grade Service           derives and enforces task/resource sensitivity
Trust Service           computes trust tier from evaluation + incident evidence
Approval Service        queues, standing approvals, preflight, escalation
```

Detail in [02 — Authority & Autonomy](02-authority-and-autonomy.md).

**Invariant I5** applies here with force: modules never implement their own
permission checks. They declare capabilities and call the resolver. A module
that contains the string `if (user.isAdmin)` has failed review.

### 2.3 Context Graph

Owns canonical entities, the tag vocabulary, taggings, and lenses.

```text
Canonical Entity     one real-world thing, N system-specific ids
Tag                  namespaced, typed, governed; entity tags → canonical entity
Tagging              (tag, target, provenance, confidence) edge
Lens                 saved tag expression → grantable, reportable scope
```

Detail in [04 — Context Graph & Tags](04-context-graph-and-tags.md).

This is what makes subsystem replacement survivable. When the CRM is swapped,
the canonical entity for a customer persists and its external mapping changes.
Tags, lenses, knowledge scopes, reports and charters keep working.

### 2.4 Addressing

Owns handles and resolution for everything that can be spoken to or routed to.

```text
Addressable          principal | role | team | department | duty | lens | skill
Resolution Strategy  direct | any_of | all_of | rotation | escalation | balanced
Mention              a typed, stateful act of addressing with authority context
Routing              notification, assignment, invocation, escalation
```

Detail in [05 — Addressing & Mentions](05-addressing-and-mentions.md).

### 2.5 Ledger

Owns the append-only record and its correlation structure.

```text
Event                append-only, hash-chained per tenant
Act                  a consequential event, optionally signed by its principal
Attribution Chain    executor · on_behalf_of · authority_source · invoker
Correlation          trace id spanning modules, providers and subsystems
Checkpoint           periodic anchor enabling offline verification
```

Detail in [06 — Attribution & Audit](06-attribution-and-audit.md).

## 3. The module contract

A module registers itself declaratively. This is how the platform stays one
product while being built in pieces, and it is what makes SRS FR-660 real.

```yaml
module: field-service
version: 2.1.0

objects:
  - id: inspection
    fields: [...]
    classification_default: internal
    entity_binding: canonical.asset        # participates in the context graph

capabilities:
  - id: inspection.read
    effect: read
    data_classes: [internal]
  - id: inspection.approve
    effect: write_irreversible
    reversibility: irreversible
    default_grade_floor: G2
    amount_binding: null
  - id: inspection.dispatch_technician
    effect: external_communication
    reversibility: compensatable
    compensation: inspection.cancel_dispatch

events:
  - inspection.created
  - inspection.approved

addressables:
  - handle: duty:field-supervisor
    resolution: rotation

hooks:                                   # typed extension points, see below
  - point: beforeContextAssembly
    id: field-service.scope-inspections
    required_capabilities: [inspection.read]
    allowed_mutations: [context.filters]
    timeout_ms: 500
    risk: low

views: [...]
actions: [...]
search_providers: [...]
dashboard_elements: [...]
implementation_status: implemented       # implemented | contract_only | planned
```

Registration is what earns a module its place in the kernel's answers. A module
that does not declare capabilities cannot be governed, and therefore cannot be
used by an AI worker. That is intentional pressure in the right direction.

### 3.1 Three rules earned from the `Platform/` analysis

**Boot-time verification (invariant I11).** Registration is validated at startup,
and the process refuses to start on violation:

- a declared route whose capability is not in the registry → fail;
- a declared object type with no implementation → fail;
- a capability declared but never reachable → warn;
- `implementation_status: contract_only` → the module registers but its
  capabilities are marked unusable and the admin surface says so.

That last one is the important one. The existing codebase shipped manifests for a
`knowledge` module and an `ai-governance` module that **do not exist**, and
nothing objected. Status belongs in the manifest and must be enforced, not
described.

**No closed enums in the shared contract.** The existing codebase defines
`DomainEventObjectType` as a closed union in its shared domain package, so no
module can introduce an object type without editing core — which silently
undermines an otherwise good module contract. Object types, event types,
capability ids and addressable kinds are **registry-backed strings**, validated
against what modules registered, never hardcoded unions.

**Typed hook points with governance metadata.** Hooks are how modules extend
behaviour without the kernel knowing about them. Each declares
`allowed_mutations`, `required_capabilities`, `timeout_ms`, `risk` and its audit
event type — so a hook is itself governed by the resolver rather than being a
trusted callback. The existing codebase's hook registry has exactly this shape
and it is worth taking wholesale. Its useful points, adapted:

```text
beforeCreate · afterCreate · beforeUpdate · afterUpdate · beforeDelete
afterAutonomyResolve            observe/annotate every gate decision
beforeContextAssembly           narrow what a worker is about to be given
afterWorkerOutput               inspect or annotate before delivery
beforePublish · afterImport
registerCapability · registerFieldType · registerReportBlock · renderWidget
```

`beforeContextAssembly` and `afterAutonomyResolve` are the two that make the AI
governance model extensible without special-casing, and both already exist in
that codebase as `beforeAiContextBuild` and `afterPermissionResolve`.

**Capability grants are bound to module lifecycle.** A module's capabilities are
registered on activation and **withdrawn on deactivation** — at which point every
Charter granting them is recompiled and the affected workers lose those grants
atomically. A disabled module must not leave orphan grants in effective Grant
Sets. (Adopted from `ModuleAiBridgeService` in the existing documentation, which
had exactly this register-on-activate / remove-on-deactivate discipline.)

### 3.2 The Garage — where composable things live

*Adopted from `platform-foundation-brainstorm.md`.*

Our SRS specifies an internal app builder (FR-270…283) built "from safe platform
components rather than arbitrary code" (FR-272) — without ever saying what those
components are or where they come from. The Garage is that answer:

> One place where every reusable ingredient is built, versioned and catalogued.
> Build it once here; use it everywhere. Improve it here; every dependent surface
> improves.

```text
Garage
├── Field types          text · currency · relation · formula · ai_value · …
├── View components      table · board · timeline · calendar · chart · form · card
├── Layout containers    how views are composed into a surface
├── Beam renderers       how relationships are drawn and traversed
├── Actions              approve · assign · escalate · generate · run_analysis
├── Triggers             event · schedule · condition · mention
├── Transitions          state machines reusable across object types
└── Cell views           summary · timeline · graph · brief · chat
```

Every ingredient declares its capability requirements, its data contract, and its
locale/direction behaviour — so an app assembled from Garage ingredients is
governed by construction rather than by review. This is what makes FR-272's
"declarative applications" safe: **the app builder cannot express anything the
Garage does not offer**, and everything the Garage offers is already governed.

Three disciplines the source document itself identified, and it is right about
all three:

- **A living catalogue.** "Build once, reuse everywhere" fails silently once
  nobody can find what exists. The catalogue is part of the Garage, not a wiki.
- **Semantic versioning with a deprecation path.** Because improving an ingredient
  changes every surface using it, an ingredient change is a platform change and
  needs the same impact analysis as a lens or charter edit.
- **Visual regression testing per ingredient.** This has the widest blast radius
  in the system — everything depends on it.

The Garage also gives the Company Compiler something concrete to emit. A generated
internal app is a composition of catalogued ingredients, which is reviewable,
diffable and reversible — unlike generated code.

**Ingredients reach the catalogue through a pipeline, not a commit:**

```text
author → registry (manifest validation) → QA gate → catalogue shelf → deploy
```

**Extension is by slot registration, never by conditional.** The platform owns a
registry of stable semantic slot IDs; ingredients *contribute to* registered
slots and never invent ad hoc keys. The anti-pattern the source document names is
worth quoting because it is the same disease as `if (principal.type === 'ai')`
in our invariant **I2**:

```text
❌  if (skin === "glassy") { ... } else if (skin === "neumorphism") { ... }
❌  Theme.tsx imports every skin package directly
```

Adding a new ingredient must be *a registration*, never an edit to the thing that
consumes it. This rule is what makes "build once, reuse everywhere" survive
contact with the tenth variant.

### 3.3 Module lifecycle and installation

*Adopted from `architecture/module-loader-contract.md` and
`module-integration-and-ai.md` — the most rigorous documents in that set, and
worth taking close to wholesale.*

**Four states, with precise runtime meaning:**

| State | What is live |
|---|---|
| `installed` | Migrations applied. **No** routes, views, hooks, capabilities or tools active |
| `enabled` | All declared surfaces registered; capabilities enter effective Grant Sets |
| `disabled` | Surfaces withdrawn; **data retained**; Charters recompiled without those grants |
| `uninstalled` | Surfaces gone; **installation ledger and audit history retained** |

`installed ≠ enabled` is the important distinction, and enabling is a separate,
separately-validated action. It mirrors our AI worker lifecycle exactly — created
but not active until onboarding passes ([03 §7](03-worker-charter.md)) — and
offboarding follows the same rule as uninstall: revoke access, preserve history.

**Installation is a staged, fail-fast pipeline:**

```text
0  offline preflight   filesystem + manifest + static source checks, no DB
1  authority gate      resolver decision on module.manage
2  state gate          reject if already registered and not uninstalled
3  schema validation   manifest semantics, semver, dependencies
4  file validation     every declared path exists; checksums match
5  dependency gate     every dependency resolves to an *enabled* module
6  transaction         insert → migrate → register → audit → mark installed
                       all-or-nothing; audit append and mutation share one txn
7  enable              separate action, separate validation
```

Two details worth keeping:

- **Stage 0 statically checks source patterns** — that the audit boundary is
  respected and that database access is repository-only. Architectural rules
  enforced by tooling rather than by review. This is how **I11** stops being a
  slogan.
- **Post-commit work is explicitly best-effort**, with the database as the source
  of truth on restart. In-memory registries are caches, never authority.

The same pipeline shape applies to **Pack installation** and to **Charter
compilation** ([03 §6](03-worker-charter.md)): validate offline, gate on
authority, verify dependencies, apply atomically, activate separately.

### 3.4 Kernel-as-intermediary, enforced

Modules never integrate with each other directly. What is allowed is a short,
explicit list:

| Integration | Allowed | Why |
|---|---|---|
| Import another module's service or repository | **No** | Bypasses everything |
| Call another module's HTTP routes | **No** | Bypasses authority and audit |
| Emit an event another module subscribes to | **Yes** | Async, audited, typed |
| Register a hook the kernel invokes | **Yes** | Governed execution policy |
| Declare a dependency | **Yes** | Enable-order only, not a runtime import |
| Expose a capability an AI worker invokes | **Yes** | Resolver-gated |

**And the rule is enforced by a test that fails the build**, not by review — the
existing codebase's `module-boundaries.test.ts`. An architectural rule without an
enforcing test is a preference.

One further rule with disproportionate value: **foreign keys point to kernel
tables, never to another module's private tables.** Two modules referencing the
same customer both reference the canonical entity, never each other's rows. This
is what makes a module genuinely removable.

### 3.5 Modules versus thin extensions

Not everything that plugs in owns a business domain. A second, lighter contract
exists for connectors:

> Use a **module** when the platform owns records, workflows, permissions, views,
> reports or capabilities. Use a **thin extension** when it connects to an
> external provider and owns no new business model.
> Default to modules until an integration proves the thinner shape is enough.

The connector manifest is more complete than the sketch in our deep-research
report, and is adopted:

```yaml
integration_id: provider.slug
direction: inbound | outbound | bidirectional
auth_type: api_key | oauth2 | basic | signed_webhook | none
required_secrets: [NAMES_ONLY]          # never values, anywhere
capabilities: [...]                      # governed, like any other
webhook_events:
  - path, signature_header, replay_window_seconds
sync_jobs:
  - queue, idempotency_key_required: true
rate_limit: {...}
retry_policy: {...}
health_check: {...}                      # non-destructive probe
audit_events: [connect, webhook, sync, failure, disconnect]   # required
```

`rate_limit`, `retry_policy`, `health_check`, `replay_window` and **required**
audit events are the fields our earlier sketch lacked, and each of them is the
difference between a connector that works and one that works in production.

Webhook handling rules worth stating once: verify the signature against the
**raw** body; reject timestamps outside the replay window; persist the provider's
idempotency key **before** any side effect; emit the declared audit event inside
the transaction boundary.

**Secrets appear as names only** — in manifests, documentation, fixtures, tests,
logs and screenshots. This applies equally to Charters
([03 §4](03-worker-charter.md)), which reference credential entitlements, never
credentials.

## 4. Where AI execution actually happens

Keeping the runtime replaceable requires being precise about who owns what.

```text
Kernel decides            WHO may act, on WHAT, under WHICH gate
Work module decides       WHAT needs doing and WHY it exists
Agent runtime decides     HOW to do it — reasoning, tool sequencing, drafting
Workflow provider decides WHEN — durability, waits, retries, long processes
```

Every tool an agent runtime can invoke is a **kernel capability**, wrapped so the
resolver is consulted before execution and the ledger is written after. The agent
runtime never holds a raw credential, never calls a subsystem directly, and never
has a tool the Charter did not grant.

```text
Agent runtime
    │  requests capability invocation
    ▼
Capability Gateway  ── resolver ──► Decision (gate + reasons)
    │                                   │
    │  A5/A4 → execute                  │  A2 → queue for approval
    │  A3    → execute into hold        │  A1 → return as proposal
    ▼                                   ▼  A0 → deny with explanation
Provider / module / subsystem      Approval queue
    │
    ▼
Ledger
```

This one chokepoint is what makes the whole governance model true rather than
aspirational. It is also the single most important thing to look for when
evaluating a candidate base platform ([Rubric](method/platform-evaluation-rubric.md)).

## 5. Data architecture

Following the deep-research report: **one logical company data plane, many
physical stores.**

```text
Kernel store (authoritative for kernel objects)
├── principals, charters, grant sets
├── portal graph (nodes, edges, ceilings, inheritance modes)
├── capabilities, policies, decisions log
├── canonical entities, external mappings
├── tags, taggings, lenses
├── addressables, mentions
├── locales, direction policies, translation scopes
└── events, acts, checkpoints

Module stores            tasks, knowledge, apps, documents
Provider stores          ERP, CRM, agent runtime state, workflow history
Derived                  search indexes, vector indexes, analytics models
```

### 5.1 Locale is a kernel concern (invariant I12)

Locale and text direction sit in the kernel because every plane touches them:

- **Principals** carry a preferred locale; AI workers carry *certified* languages,
  and the resolver denies output in an uncertified language.
- **Portal nodes** carry a default language, a supported set, and a direction
  policy (`LTR` / `RTL` / `mixed`) that the UI treats as a layout contract.
- **Knowledge and tags** carry locale, with tag aliases resolvable per locale
  ([04 §9](04-context-graph-and-tags.md)).
- **Generated output** — reports, dashboards, AI-authored documents — records the
  locale it was produced in, because a Swedish report and its English translation
  are two artefacts with one provenance, not one artefact.

The existing codebase seeds English, Swedish and Arabic with direction metadata
from its first migration. That was the right call and we keep it.

### 5.2 Rules

- **No cross-store writes.** All mutation goes through the owning system's API so
  its validation, hooks and business logic stay active.
- **Every projection is labelled** with its source and freshness. An AI worker
  reading a projection is told it is reading a projection.
- **The canonical entity service is the only place** that knows a customer is the
  same customer in four systems.

## 6. Scope-control strategy

### 6.1 Build order

```text
Phase 0   Kernel
          principals · capabilities · autonomy resolver · ledger
          minimal context graph (canonical entities + tags)
          addressing with direct resolution only
          → nothing user-visible; everything downstream depends on it

Phase 1   One vertical slice, end to end
          lead → qualification → proposal → human approval → customer
               → project onboarding → AI research + plan → invoice → report
          exercises: charters, grades, gates, approvals, escalation,
          knowledge promotion, mentions, durable workflow, audit trail

Phase 2   The compiler
          discovery interview · research engine with provenance
          · blueprint generation · review · provisioning · evaluation

Phase 3   Surface breadth
          declarative apps · dashboards · reports · company intelligence
          · additional modules and providers

Phase 4   Industry Packs
          the compiler's actual knowledge; where the product becomes sellable
          in a second vertical without bespoke work

          A Pack is a deployable bundle, not a document — the delivery
          mechanism adopted from the Assets Store idea in
          platform-foundation-brainstorm.md:

            Pack {
              portal topology (nodes, edges, ceilings)
              role templates + charters + mindflows
              skill definitions + evaluation suites
              tag vocabulary + lenses + knowledge cells
              process definitions + approval policies
              grade and capability matrix overrides
              data objects + Garage compositions (apps, dashboards, reports)
              seed knowledge + industry terminology
            }

          Packs install, version, diff and uninstall. The compiler adapts a
          Pack to a company rather than generating from nothing — which is
          what makes its output good rather than merely plausible.
```

Phase 1 before Phase 2 is deliberate and slightly counter-intuitive. The
compiler is the demo, but a compiler that emits structures we have never
operated will emit plausible garbage. Operating one real slice first tells us
what a good blueprint even looks like.

### 6.2 Rules that keep scope from exploding

- **Nothing enters the kernel after Phase 0** without an explicit decision that
  it fails the "two modules would answer it differently" test.
- **No second implementation of a kernel concern**, ever, including "just for
  now" and "only in this module".
- **Every provider sits behind an interface from day one**, even when there is
  only one implementation. The cost is small; the cost of retrofitting is not.
- **Breadth is added as modules**, which means a feature that cannot be expressed
  as objects + capabilities + events + views is a signal that the kernel is
  wrong, not that the module needs an exception.

## 7. Reconciling with the existing `Platform/` codebase

The repository already contains a TypeScript monorepo ("Graph Portal Platform")
with a Next.js shell, a NestJS kernel, a BullMQ worker, Postgres/pgvector, and
shared contracts for events, hooks, modules, permissions, portals and AI
governance. That is not incidental — it is roughly the shape described above.

Three possible relationships, to be decided:

| Option | Meaning | When it is right |
|---|---|---|
| **Evolve** | The existing kernel *is* Phase 0; we extend its permission model into the autonomy resolver and add charter/context-graph/addressing | Its principal and permission model can admit non-human actors without violence |
| **Extract** | Keep its module/event/hook contracts and UI shell; rebuild the kernel services beneath | The contracts are good but the permission model is human-shaped |
| **Reference** | Treat it as a prior art and design study | Neither the contracts nor the model survive contact with I1–I10 |

This is the same question the two forthcoming base platforms will pose. The
rubric in [Rubric](method/platform-evaluation-rubric.md) is written to answer it for all
three candidates on the same criteria.
