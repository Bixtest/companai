# CORE BOUNDARY — the uncustomisable backbone, the configurable ring, and the domain packs

**Written:** 2026-10-06
**Asked by:** the owner —
> *"What should be core functionality in what we are developing that no one should be able to customize
> architecturally because it collapses the system and because it provides the standard backbone to build
> and change anything around it."*
**Sources:** [`universal_application_platform_framework_blueprint.md`](../universal_application_platform_framework_blueprint.md)
§106 (true core vs domain packs), §123 (minimal core to preserve), Appendix B (non-negotiable rules);
blended with our own dictionary S1–S12 and the [architecture](ARCHITECTURE.md).

---

## 0. The one sentence that governs everything else

> **A tenant may customise the *model* — its data, rules, views, workflows and packs. A tenant may never
> customise the *substrate* — identity, tenancy, the resource envelope, the policy engine, audit,
> localization resolution, and the shape of the contracts themselves.**

When in doubt, ask: *"if a tenant changed this, would another tenant's guarantees break, or would the
platform stop being able to describe itself?"* If yes → **core**. If no → configurable or pack.

---

## 1. THE THREE RINGS

```
┌──────────────────────────────────────────────────────────────────────────┐
│ RING 3 — DOMAIN PACKS            (built ON the substrate; replaceable)    │
│   finance · procurement · HR/payroll · manufacturing · CRM processes ·    │
│   commerce · service management · CMS · project management · verticals    │
├──────────────────────────────────────────────────────────────────────────┤
│ RING 2 — CONFIGURABLE            (settings a superadmin/tenant may change)│
│   tiers/defaults/fallbacks · feature flags · entitlements · branding ·    │
│   custom fields · views/dashboards · business rules · workflows ·         │
│   notification preferences · domain dictionaries · per-object permissions  │
├──────────────────────────────────────────────────────────────────────────┤
│ RING 1 — THE TRUE CORE           (UNCUSTOMISABLE — platform release only) │
│   the envelope · actor/context · tenancy · authz ENGINE · metadata        │
│   registry · schema conventions · command/action contract · event         │
│   envelope · audit contract · migration/versioning · localization         │
│   resolution · error model                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

**The asymmetry that makes it safe:** Ring 1 *defines the grammar*; Ring 2 *fills it in per tenant*; Ring 3
*uses it*. A tenant can add a thousand packs and set a million settings without ever being able to change
what "resource", "permission", "event" or "audit" **mean**.

---

## 2. RING 1 — THE TRUE CORE (uncustomisable)

Each item: **what it is · why the system collapses without it · how change is allowed (platform release
only).**

| # | Core item | What it is | Why it collapses the system if customised | Change allowed by |
|---|---|---|---|---|
| C1 | **Resource envelope** | the shape every object shares: id · type · tenant · namespace · version · status · owner · created/updated by · labels · metadata · data | if each resource redefines "who owns me / what version am I / what status can I hold", nothing can be reasoned about uniformly — no generic permissions, no generic audit, no generic AI access | platform release |
| C2 | **Actor & context model** | who is acting (human/service/AI/device) and in what context (tenant, org, locale, tz, trace) | every gate reads it; if it is customisable, every gate can be fed a different story — the exact "AI through Business IR accesses everything" hole the owner fears | platform release |
| C3 | **Tenancy & isolation boundary** | the rule that every row belongs to a tenant and cannot escape it | this **is** multi-tenancy; a tenant that can edit it can read another tenant's data | platform release |
| C4 | **Authorization *engine*** *(not the grants)* | the evaluator and grammar: (who, does what, on which object, under which conditions) — RBAC + the structural grammar | hiding a button is not security; if the evaluator is replaceable, every guarantee in Ring 2 is theatre. **The grants are Ring 2 — the engine is Ring 1.** | platform release |
| C5 | **Metadata registry & schema conventions** | the service that answers *what exists / who owns it / what depends on it / who can access it*; the rules for declaring a resource | without one description of "what exists", the permissions gate cannot enumerate objects and the AI cannot be bounded — the drift the blueprint §122 warns of | platform release |
| C6 | **Command / action contract** | the shape every action must satisfy: input/output schema, permissions, side effects, risk, approval, idempotency | one action feeds UI, API, workflow and AI; if the contract varies, the same action behaves differently per caller — business logic forks | platform release |
| C7 | **Event envelope** | the shape every fact must satisfy (id, type, version, time, actor, tenant, resource, correlation/causation, payload) | with no fixed envelope, automations and AI cannot subscribe reliably; CloudEvents is the reference (§101) | platform release |
| C8 | **Audit contract** | every meaningful mutation records who · what · when · before · after · actor_type · request/trace id (§73) | audit is the safety net and often a legal duty; a customisable audit is no audit | platform release |
| C9 | **Migration & versioning contract** | how change itself happens: inspectable plan → validate → migrate → verify; independent versions for schema/API/prompt/agent | if migrations are ad-hoc, data is lost silently and nothing is reproducible | platform release |
| C10 | **Localization resolution** | the fallback chain (requested → lang+region → lang → app default → platform) and the formatting contracts (numbers, dates, currency) | one resolution rule means labels, money and dates mean the same thing everywhere; per-module re-invention produces different answers to the same question | platform release |
| C11 | **Error model** | the canonical error shape: code · message · details · field_errors · retryable · request/trace id (§74) | machine-readable, localizable, safe errors are what make automation and AI recovery possible | platform release |

**What "uncustomisable" means precisely.** Not "the code is hidden" — but:
- there is **no setting** that alters it, and **no plugin** may replace it;
- a tenant cannot change it, **and neither can a superadmin** — it moves only by a **platform release**,
  under the dictionary's change protocol (S1/S2, doc-first);
- changing it is **itself** a core change: it is proposed in the dictionary **first**, then built.

**And the crucial subtlety, stated for the owner:** the things he just asked to be *settings* — the tiers,
the defaults, the fallbacks — are **Ring 2, not Ring 1**. The *values* are configurable; the *engine that
reads them* and the *rule that it fails closed* are Ring 1. That is not a contradiction; it is the
boundary working exactly as intended.

---

## 3. RING 2 — CONFIGURABLE (a superadmin or tenant may change it, safely)

These may have **settings, admin screens, and per-tenant overrides** — because changing them changes a
tenant's *behaviour*, never the platform's *guarantees*.

- **Permission grants** — roles, per-object grants, the structural grammar's levels (the *engine* is C4).
- **The tier mapping / defaults / fallbacks** (owner, 2026-10-06) — seeded from the dictionary, edited in
  `module_configs`.
- **Feature flags & entitlements** — including the distinction the blueprint draws (§50): *permission =
  "may I?"*, *entitlement = "does the plan include it?"*.
- **Custom fields & custom entities** — the expandable-platform promise (`entities` module).
- **Business rules** — conditions → actions (`business_rules`).
- **Workflows & their definitions** — (`workflows`).
- **Views, dashboards, perspectives, widgets** — how data is presented.
- **Notification preferences & (if built) templates**.
- **Dictionaries** — tenant vocabularies (statuses, categories).
- **Branding, locale defaults, timezone defaults**.
- **Core-function list additions** — but the *rule* that core functions cannot be deleted is Ring 1.

---

## 4. RING 3 — DOMAIN PACKS (built on the substrate, replaceable)

Packs add **business vocabulary**, never new infrastructure. Blueprint §66 and our own modules:

**Already ours (they are packs — keep them packs):** `customers` (CRM) · `sales` · `catalog` · `wms`
(inventory) · `staff` (people) · `planner` · `currencies` · `payment_gateways` · `shipping_carriers`.

**Absent packs (build later, per the register):** finance/accounting · procurement · payroll ·
manufacturing · service management · CMS · commerce.

**The discipline that keeps this honest** (blueprint §106): *"This boundary must remain disciplined."*
A pack that needs a new primitive is a warning sign — either the primitive belongs in core (a dictionary
change), or the pack is reaching outside its ring.

---

## 5. How the boundary is ENFORCED (not just declared)

A boundary that is only written down drifts. So each ring gets a mechanism:

| Ring | Enforcement mechanism (exists / to build) |
|---|---|
| Ring 1 core | **no config key exists for it**; the migration/versioning contract is the only door; the **guard engine (D0)** refuses structural changes to core objects; a test asserts the core contracts hold |
| Ring 2 configurable | **gated by the S2 permissions gate** — changing a Ring-2 setting is audited, and where structural (new table/column), forced through the permissions question |
| Ring 3 packs | **declared as packs** in the metadata registry; a pack may depend on core, never replace it; the CLI's `detectConflicts` blocks a pack that overrides core |

---

## 6. The twenty non-negotiable rules (adopted from the blueprint, Appendix B, adapted)

We adopt all twenty — with our reading in brackets where we adapt:

1. Security is enforced below the UI. *(asserted as a test, not a hope)*
2. Every business action has an explicit contract. *(C6)*
3. Every meaningful mutation is auditable. *(C8)*
4. Significant state changes can emit events. *(C7)*
5. Long-running business processes use durable workflows. *(Ring 3 uses our `workflows`)*
6. AI uses the same policy/action system as humans. *(already true — sandbox strips scope)*
7. Tenant isolation is foundational. *(C3)*
8. Localization exists in the core design system. *(C10 + GAP C)*
9. RTL/LTR is a first-class layout concern. *(GAP C)*
10. Responsive behaviour is part of component contracts. *(GAP C)*
11. Accessibility is the default, not a project phase. *(GAP C — WCAG 2.2 AA)*
12. The system of record remains authoritative. *(AI memory is never the source of truth)*
13. Domain modules use the shared primitives. *(Ring 3 uses Ring 1)*
14. APIs and event contracts are versioned. *(C9)*
15. Physical infrastructure is replaceable through adapters. *(we are Postgres-first by choice)*
16. Metadata is the canonical description of the application. *(C5)*
17. Code-first, declarative and AI-first creation converge on one runtime. *(the decisive loop)*
18. Observability crosses every major execution boundary. *(contracts phase)*
19. Failure paths are designed at the same time as happy paths. *(adopt — this is our S8 neighbour)*
20. Anything declared reusable is a platform primitive, not copied per app. *(S5 — one engine)*

---

## 7. What this changes in the plan

- **New document:** this one. It is the answer to the owner's question and a Ring-1/2/3 register.
- **New contract:** **C1 (resource envelope)** and **C5 (metadata registry)** are the two genuinely new
  primitives (blueprint GAPs A). They belong in **Phase −1 / Phase 0**.
- **Every future item in the backlog is now tagged by ring** — core, configurable, or pack — so
  "customisable vs uncustomisable" is decided **at design time**, not argued later.
- Nothing already planned is invalidated; the core items we already built (identity, tenancy, ACL, audit)
  simply get named as **Ring 1** and protected by the enforcement mechanisms in §5.
