# BLUEPRINT GAP ANALYSIS — what the Universal Platform Blueprint exposes in our plan

**Written:** 2026-10-06
**Source analysed:** [`universal_application_platform_framework_blueprint.md`](../universal_application_platform_framework_blueprint.md)
(127 sections + 2 appendices; "a generic standards" document, to be adapted to our needs, not adopted wholesale)
**Compared against:** our existing plan — the [dictionary](SPECIFICATIONS-DICTIONARY.md),
[BUILD-ORDER](BUILD-ORDER.md), [CORE-MODULES-REGISTER](CORE-MODULES-REGISTER.md),
[ARCHITECTURE-structure-permissions](ARCHITECTURE-structure-permissions.md), and the code.
**Method:** every claim about our side was measured (two routes where it mattered); every gap is named,
sized, and assigned a place in the order.

---

## 0. The verdict in one paragraph

The blueprint **agrees with our direction and sharpens it in three places**. It confirms the plan we
already chose — metadata-first, security under the UI, AI as a first-class actor, one action many
interfaces, modular monolith first. But it exposes **four real gaps**: (1) we have **no explicit universal
`Resource` envelope / metadata registry** — the blueprint calls this the most important layer, and we have
the *kernel* but not the *envelope*; (2) we have **no numbered "true core vs domain pack" boundary** and no
rule that makes certain things **uncustomisable** — which is the owner's explicit new question; (3) our
**i18n/RTL and accessibility are not yet contractual** (present, but not enforced as contracts); (4) our
**build order lacks the "architecture contracts" phase** the blueprint puts *before* all code
(Phase 0). None of these invalidate the plan; all four are additions, and all four belong **before or
inside** the phases we already set.

---

## 1. What the blueprint confirms (no change needed — do not re-litigate)

| Blueprint rule | Where we already stand | Status |
|---|---|---|
| Everything describable should be declarative (§0) | the Business IR + kernel (G-01/G-02); Functions saved from prompts | **ALIGNED** |
| Security is enforced below the UI (§7, App. B1) | `aclFeatures`, `fieldPolicy`, fail-closed scope injection, route-feature coverage | **ALIGNED** |
| AI inherits the same authorization as humans (§7.3, §108) | the sandbox strips scope; AI route-calls double-gated | **ALIGNED** |
| One action / many interfaces (§13, §100 P3) | the decisive loop: Function executes with zero AI | **ALIGNED** |
| Modular monolith first, not microservices (§105) | we are one Next.js app + packages | **ALIGNED** |
| Metadata is the canonical application description (§100 P1) | the kernel builds a model descriptor from declarations | **ALIGNED** |
| Don't make everything JSON; strong relational for identity/perms/audit/finance (§80) | our core tables are relational (`users`, `role_acls`, `audit`) | **ALIGNED** |
| The system of record stays authoritative; AI memory is not the source of truth (§40, §100 P11) | the AI never writes round it; scope injected from ctx | **ALIGNED** |
| Cross-cutting: audit, observability, localization, security, versioning, governance (§122) | audit exists; the *others* are the gaps below | **PARTIAL** |

**Conclusion:** the blueprint does **not** contradict our architecture. It is a longer, more formal
statement of the same thesis, plus a handful of primitives we have not yet named.

---

## 2. THE FOUR GAPS — what the blueprint exposes that our plan does not yet hold

Each gap: **what the blueprint says · what we have (measured) · what we must add · where it goes in the
order.**

### GAP A — No universal `Resource` envelope and no Metadata Registry (blueprint §3, §54, §86, §103, §107)

**Blueprint:** *"The meta-model is the vocabulary by which applications describe themselves… Every
important platform object should be modelled as a resource"* with a **consistent envelope** (`id, type,
tenant_id, namespace, version, status, owner, created/updated by, labels, metadata, data`) and a
**registry** that can answer *"What exists? Who owns it? What depends on it? Who can access it?"*

**What we have (measured).** The **kernel** (`packages/shared/src/lib/kernel/`: `canonical-id.ts`,
`model.ts`, `from-modules.ts`, `round-trip.ts`, `rename.ts`) already builds a canonical, versioned model
descriptor **above** the physical DB, from the modules' own declarations — that is the *beginning* of the
meta-model. **But there is no `Resource` envelope type and no metadata-registry service**: a code search
for `ResourceEnvelope`/`MetadataRegistry`/`ResourceModel` returns **nothing**. Our resources each have
`tenant_id`, timestamps and an id — but **not through a shared, declared envelope**, and there is no
single service that answers the registry questions.

**Why it matters.** Without the envelope, every new resource re-decides what "ownership, version,
lifecycle, labels, provenance" mean — the exact drift the blueprint warns of (§122: *"the most critical
architectural mistake would be allowing these concerns to develop independently"*). Without the registry,
the platform cannot **answer** "what exists / who can access it / what depends on it" — which is also
what the owner's **S2 permissions gate** and the **structural grammar** need to enumerate objects.

**What to add.**
1. A **`Resource` envelope** — a declared, shared shape (conceptually the blueprint's JSON above),
   implemented as a shared type + a base convention, **not** as one giant table. Modules that model a
   resource declare it; the envelope's fields are then **guaranteed present**.
2. A **Metadata Registry** service — reads the kernel's model + module declarations and answers the
   §54 questions. Start read-only (an *inventory*), grow it into the control-plane service the blueprint
   describes.

**Where in the order:** **Phase 0 (new), before Phase 1.** It is a contract, and §121 puts contracts
first. Practically it sits with D0–D3 and the permissions catalogue: the registry **is** how the
permissions gate knows which objects exist.

---

### GAP B — No "true core vs domain pack" boundary, and no UNCUSTOMISABLE layer (blueprint §106, §123, App. B, and the owner's question)

**Blueprint §106** draws a hard line between the **true core** (runtime, identity, tenancy, authorization,
metadata, schema, resources, relationships, commands, actions, events, workflow, query, UI runtime,
localization, search/files/integration *abstractions*, config, flags, observability, audit, plugins, ALM,
AI foundation) and **domain packs** (accounting, payroll, manufacturing, inventory, CRM *processes*,
HR *workflows*, CMS, commerce…).

**Blueprint §123** names the **minimal core to preserve at all costs**: Actor · Tenant · Context ·
Resource · Schema · Relationship · Policy · State · Action · Command · Transaction · Event · Workflow ·
Query · View · Metadata · Audit · Localization.

**Blueprint Appendix B** lists **20 non-negotiable design rules** (security below UI; every action has a
contract; every mutation auditable; AI uses the same policy system; localization in core; RTL first-class;
metadata canonical; etc.).

**What we have.** We have the *dictionary's* twelve standards S1–S12 and the structural grammar — but **we
have never drawn the core/pack line**, and **we have never said which things must be uncustomisable**.
The owner has now asked for exactly that: *"What should be core functionality … that no one should be able
to customize architecturally because it collapses the system."*

**Why it matters — this is the owner's central concern.** Versatility without an uncustomisable core is
how a platform becomes *"a buggy, uncontrollable, unmanageable, unreliable, unsecure mess."* If a tenant
can change the permission engine, the tenancy model, the audit contract or the resource envelope, the
platform's guarantees evaporate.

**What to add — the CORE / PACK BOUNDARY and the UNCUSTOMISABLE LIST.** Done in
[`CORE-BOUNDARY.md`](CORE-BOUNDARY.md) (new): the true core (which nobody may architecturally change),
the configurable ring (which tenants may tailor), and the domain packs (built on top). Every core item
is paired with **why the system collapses without it**.

**Where in the order:** **Phase 0.** It is a contract and it constrains everything built after it — you
cannot retrofit "this was core all along" once a tenant has changed it.

---

### GAP C — Localization and Accessibility are present but not contractual (blueprint §28, §27, §26, §88, §89)

**Blueprint:** *"This must be a core platform module from day one. It must not be added after the UI
framework exists"* (§28). Accessibility targets **WCAG 2.2 AA** (§27). RTL/LTR is a **core layout
concern**, implemented at design-system level with **CSS logical properties** and a **testing matrix**
(§26, §28.6, §88, §89). Time zones are **IANA tzdb**, not offsets (§28.8).

**What we have (measured earlier).** i18n **exists**: `shared/src/lib/i18n`, per-module `i18n` folders,
and `translations` + `dictionaries` modules. **But it is BUILT-UNEVEN** (single-route API, one UI page —
see the register), and — crucially — we have **no RTL/LTR contract, no accessibility baseline, no
localization testing matrix, and no timezone-aware scheduling rule** declared anywhere.

**Why it matters.** The owner named languages as a foundation. Retrofitting RTL, accessibility and
locale-correct formatting **after** the UI exists is exactly the expensive mistake the blueprint warns
against — and our UI already exists.

**What to add.**
1. **RTL/LTR contract**: logical CSS properties, direction at the root, a per-component direction rule.
2. **Accessibility baseline**: WCAG 2.2 AA, declared and tested.
3. **A localization completeness contract**: no concatenated strings, plural/interpolation, CLDR.
4. **TZ rule**: recurring schedules store the **IANA zone**, not an offset.
5. **The 11-dimension component matrix** (§88) as an automated check.

**Where in the order:** **Phase 1** (it conditions the UI phase) — but the *contract* is written in
Phase 0. Add to the register as a Tier-1 completion of an existing BUILT-UNEVEN module.

---

### GAP D — Our build order has no "architecture contracts" phase BEFORE the kernel (blueprint §121 Phase 0)

**Blueprint §121** puts **"Phase 0 — Architecture contracts"** *before* the true kernel: vocabulary,
resource envelope, actor/context model, tenant model, IDs, schema conventions, action/command contract,
event envelope, API conventions, error model, audit model, versioning rules, localization contract — *"Define
before coding heavily."*

**What we have.** [`BUILD-ORDER.md`](BUILD-ORDER.md) starts at "Phase 0 — Foundation completion" (D0–D3,
the guard engine + permissions gate). That is **good**, but it is the *enforcement* foundation, not the
*contract* foundation. We have **no written set of the contracts above** — some exist implicitly in code,
some not at all (error model, event envelope, API conventions, versioning rules).

**Why it matters.** The blueprint's Phase 0 is the antidote to the project's actual failure mode — the
owner's *"critical requirements slipping out of our view."* Contracts written down are what stop each new
piece from re-deciding them.

**What to add.** A **"Phase −1: Architecture Contracts"** in BUILD-ORDER — short, definitive documents
(or one document with sections) covering the twelve contracts, each with an owner and a link. Most are
one page; some already exist and just need naming.

**Where in the order:** **before everything**, exactly as the blueprint says.

---

## 3. Gaps the blueprint reveals that are ALREADY in our plan (confirmations, not new work)

These are in the blueprint **and** already in our backlog — the blueprint raises their priority rather
than adding them:

| Blueprint section | Already in our plan as | Effect of the blueprint |
|---|---|---|
| §7 authorization dimensions incl. ABAC/ReBAC, field/record-level | S4 data-is-the-gate; dictionary C.1 | **confirms**; raises field/record auth to named requirements |
| §10 lifecycle / state machines | not yet built as a *generic* engine | **promotes to a core primitive** (we have pipelines in `customers`, not a general engine) |
| §11 rule engine UI-independent | `business_rules` module (BUILT) | **confirms**; check it is UI-independent |
| §12 command model with risk/approval | the decisive loop + `authority_pending_acts` | **confirms** |
| §14/§15 event fabric, CloudEvents | `packages/events` exists; **no CloudEvents envelope** | **adds** a small concrete item: adopt the envelope shape |
| §16 transactions/outbox/idempotency | idempotency keys exist in places (`carrier_shipment_idempotency_keys`) | **promotes** to a platform primitive |
| §43 human-in-the-loop approval object | `authority_pending_acts` + AI pending-actions | **confirms**; unify on one approval object |
| §44/§45 observability, trace context | partial (correlation ids in command-bus) | **adds** trace/context envelope as a contract |
| §50 feature flags / entitlements **separated** | `feature_toggles` exists | **adds**: entitlements ≠ permissions — a distinct concept we lack |
| §51 billing / metering | **absent** | **new** — but a *SaaS* concern; decide if in scope |
| §89 content-expansion testing | not present | **adds** to the localization contract |
| §114 backward-compatibility rules | cookbook has rules; not a compatibility contract | **adds** |
| §119 application completeness checklist | similar in spirit to our workthrough | **adopt as a checklist artifact** |

---

## 4. The UNCUSTOMISABLE CORE — direct answer to the owner's question

> *"What should be core functionality … that no one should be able to customize architecturally because it
> collapses the system and because it provides the standard backbone to build and change anything around
> it."*

**The full answer is [`CORE-BOUNDARY.md`](CORE-BOUNDARY.md).** The principle in one line:

> **A tenant may customise the *model* (data, rules, views, workflows, packs). A tenant may never
> customise the *substrate* (identity, tenancy, the resource envelope, the policy engine, audit,
> localization resolution, the contract shapes).**

The uncustomisable core (nobody, not even a superadmin, may architecturally change these — they may only
be changed by a **platform release**, under the dictionary's protocol):

1. **The resource envelope** — the shape every object shares.
2. **The actor / context model** — who is acting and in what context.
3. **Tenancy and isolation** — the boundary itself.
4. **The authorization evaluation engine** (the *engine*, not the *grants*) — the grammar of who-can-do-what.
5. **The metadata registry & schema conventions** — what exists and how it is described.
6. **The command/action contract** — the shape every action must satisfy.
7. **The event envelope** — the shape every fact must satisfy.
8. **The audit contract** — every mutation records who/what/when/before/after.
9. **The migration & versioning contract** — how change itself happens.
10. **Localization resolution** — the fallback chain and formatting contracts.
11. **The error model** — the canonical error shape.

Everything else is **configurable** (settings, feature flags, entitlements, packs, custom fields, views,
rules, workflows) or **a domain pack** (finance, procurement, HR modules…). Notably: the **tier mapping /
defaults / fallbacks the owner just asked to be settings** live in the **configurable ring**, not the
core — that is exactly consistent: the *policy values* are configurable; the *engine that reads them* is
core.

---

## 5. The build order, revised to include the blueprint's contributions

Merging the blueprint's §121 with our [BUILD-ORDER](BUILD-ORDER.md):

**PHASE −1 — Architecture contracts (NEW, before all code).** Blueprint §121 Phase 0. Twelve one-page
contracts: vocabulary, **resource envelope (GAP A)**, actor/context, tenancy, IDs, schema conventions,
action/command, event envelope, API conventions, **error model**, audit, versioning, **localization
contract (GAP C)**. Plus the **CORE/PACK BOUNDARY (GAP B)**.

**PHASE 0 — Foundation completion (already set).** D0 guard registry · D1 permissions catalogue + gate ·
D2/D3 structural grammar · the tiers-as-settings (item 1). **Now also:** the **Metadata Registry** service
(GAP A) — it is what makes the gate able to enumerate objects.

**PHASE 1 — The standards become enforcement.** S2 gate · tier mapping as setting · core-function delete
guard · the manage screen. **Now also:** the **state-machine engine** promoted to a core primitive.

**PHASE 2 — Experience contracts completed.** **Localization + RTL + accessibility hardened to contract
(GAP C)** · dashboard/perspective screens · notification templates decision.

**PHASE 3 — Data-access depth.** Coverage 6→all tables · own/team row scope · IR wiring.

**PHASE 4 — Horizontal services.** files · search · collaboration · **entitlements separate from
permissions** · billing/metering *(scope decision)* · integrations · developer tooling.

**PHASE 5 — AI foundation.** model gateway · retrieval · tool registry · agent runtime · memory ·
guardrails · human approval · AI observability · evaluation · MCP adapter.

**PHASE 6 — Enterprise scale.** ALM/environments · plugins marketplace · residency · governance ·
lineage · advanced analytics · DR.

**PHASE 7 — Domain packs.** finance · procurement · HR · manufacturing · commerce · service management ·
project management · verticals.

**Rule that governs the whole order** (blueprint §122, our rule zero-zero-one): the dependency graph is
**IDENTITY → TENANCY → CONTEXT → AUTHORIZATION → RESOURCE → SCHEMA → RELATIONSHIP → STATE → COMMAND →
TRANSACTION → EVENT → WORKFLOW → QUERY → VIEW → ANALYTICS → INTEGRATIONS → AI**, with **audit,
observability, localization, security, versioning, governance** crossing every layer. **Do not build a
lower layer before the one above it is stable.**

---

## 6. What to adapt vs adopt (the owner's "generic standards" note)

The owner said the blueprint is generic and must be **adapted**. Concretely:

**ADOPT (it is a real standard and we lack it):** the resource envelope · the metadata registry idea ·
the core/pack boundary · the contract-before-code phase · RTL/accessibility/localization contracts ·
CloudEvents envelope shape · trace/context envelope · the component test matrix · the compatibility rules.

**ADAPT (too heavy for us now; take the idea, size it):**
- **GraphQL/gRPC/AsyncAPI/Kafka** (§35, §15, §79) — we use REST + Postgres + our own bus. **Adapt:** keep
  the *contract discipline* (OpenAPI), do not add brokers yet; the blueprint itself says modular monolith
  first (§105).
- **Full ABAC/ReBAC/OPA/OpenFGA** (§7, §101) — **adapt:** we have RBAC + a structural grammar; adopt the
  *shape* (record/field-level) without importing a policy engine.
- **Billing/metering** (§51) — **adapt:** only if we sell the platform as SaaS; otherwise domain pack.
- **Domain packs** (§66) — **adapt:** our `customers`/`sales`/`catalog`/`wms` are already packs; keep them
  packs, do not move them into core.
- **Multi-region residency/DR** (§72, §79) — **adapt:** design the boundary now, implement at scale.

**REJECT for now (not needed, would be premature):** microservices (§105 explicitly warns against),
multiple physical engines (§79 says specialize by workload — but only when a workload justifies it), the
25 chart types and full page-builder (§21, §24) — build the composition engine, not every chart.

---

## 7. Honesty log

- GAP A was established by a **negative** search (`ResourceEnvelope`/`MetadataRegistry` → nothing) **plus**
  reading the kernel — two routes: the absence is real, and the kernel is the partial beginning, not the
  envelope.
- GAP C rests on the register's measured BUILT-UNEVEN verdict for i18n, plus the **absence** of any
  RTL/a11y/TZ contract in the docs — two routes (code structure + doc search).
- GAP B and GAP D are **planning** gaps (we never wrote them), not code gaps; they were confirmed by
  searching our own docs for a core/pack line and an error/event/versioning contract and finding none.
- **No test suite was run** in this analysis. Everything here is structural/doc-based, consistent with the
  register's own caveat.
- The blueprint's own §126 dates (OpenAPI 3.2.1 = 2026-09-10, CLDR 48.2, tzdb 2026e, etc.) were **taken
  from the document as given** and not independently re-verified; they matter only when we pin versions.
