# 09 — Forensic Analysis: the `Platform/` Codebase

**Subject:** `companai/Platform` — "Graph Portal Platform" (`@gpp`)
**Method:** direct source reading, build/test/typecheck execution, schema-vs-code
diffing. Documentation was read *after* the code and used only to check claims
against findings.
**Date of analysis:** 2026-08-08

This document is deliberately neutral — what the code *is*. The judgement is in
[P1 verdict](../../platforms/01-graph-portal-platform/02-verdict.md).

---

## 1. Verified facts

| Property | Value | How verified |
|---|---|---|
| Size | 219 source files, ~30,700 LOC (TS/TSX/SQL, excl. deps) | file walk |
| Stack | pnpm 9 + Turbo monorepo; NestJS/Fastify API; Next.js App Router web; NestJS/BullMQ worker | `package.json`, app sources |
| Data | PostgreSQL + pgvector via Drizzle + postgres.js; Redis; S3/MinIO | `packages/db`, compose files |
| Typecheck | **12/12 tasks pass** | `turbo typecheck` executed |
| Tests | **234 pass, 0 fail** (86 API, 148 web, plus domain/db/config) | `turbo test` executed |
| Build | **8/8 tasks pass**, incl. Next.js production build | `turbo build` executed |
| Migrations | 5 numbered SQL files with a `schema_migrations` ledger | `packages/db/migrations` |

The repository is healthy. It compiles, it builds, its tests pass, and the code
is consistent in style and discipline. Nothing in this analysis is a report of a
broken codebase.

## 2. What is actually implemented

Verified present and wired end to end:

**Tenancy and the portal graph.** `tenants`, and `portals` typed as one of
hub / consultant / company / subsidiary / department / project / sandbox.
Portals relate through `portal_edges` carrying `relationship_type`,
`inheritance_mode` (strict/flexible/reference-only/none), `permission_ceiling_id`
and `module_grants`. This is a genuine organisational graph, not flat tenancy.

**Org principals.** `users`, `roles`, `groups`, `teams`, `user_memberships`.

**A layered permission resolver.** `permission.service.ts:54-261`. Deny-by-default,
with an ordered evaluation across eight decision sources:

```text
bootstrap_capability      token-gated escape hatch
parent_portal_ceiling     inherited ceiling from the portal graph
explicit_deny             deny always wins
project_overlay           project membership can be terminal-deny
record_policy             per-object rules
temporary_delegation      time-boxed grants
direct_user / portal_role / group / team
platform_hard_rule        final deny
```

Every decision returns a `PermissionDecisionExplanation[]` — source, effect,
reason, rule id — accumulated through the whole evaluation
(`packages/domain/src/permissions.ts:36`).

**Project workspaces and overlays.** `project_workspaces`, `project_memberships`
with a `permission_overlay` array.

**Record-level policies.** `record_policies` (with `lock_state`:
open/restricted/locked) and `record_policy_rules`, scoped by portal and project.

**Temporary delegations.** `temporary_delegations` with grantor, grantee,
permission, optional object scope, `starts_at`, `expires_at`, `revoked_at`,
`revoked_by`, and a mandatory `reason`.

**Audit events.** `audit_events` carrying `event_id`, `event_type`, `version`,
`actor_id`, `tenant_id`, `portal_id`, `object_type`, `object_id`,
**`correlation_id`**, **`causation_id`**, `payload`, `visibility_scope`.

**Module manifest contract.** `ModuleManifest` declares permissions, events,
hooks, routes, widgets, field types, report blocks, AI tools, settings schema and
seed templates (`packages/domain/src/module-manifest.ts`).

**Hook registry.** 14 typed hook points including `afterPermissionResolve`,
`beforeAiContextBuild`, `afterAiAnswer`, `registerAiTool`, each with
`allowed_mutations`, `required_permissions`, `timeout_ms`, `risk_level`.

**Localisation.** Locale packs with direction, seeded en/sv/ar; RTL policy on
portals.

**Admin web surface.** 13 workbench areas under `apps/web/app/admin`, consuming
the API through a proxy — no direct database access from the web tier (verified
by grep: zero `@gpp/db` or driver imports in `apps/web`).

## 3. What is declared but not implemented

This is the heart of the analysis.

**AI — effectively nothing exists.** `ai-governance.service.ts` is a hardcoded
array of two model descriptors and a `planSecondOpinion` method returning a
static object whose own field reads:

> `next_step: "Wire provider adapters after retrieval, evidence, and tenant AI policy are implemented."` — `ai-governance.service.ts:45`

There is no agent runtime, no tool gateway, no model invocation, no session
persistence, no cost tracking, no prompt assembly. A repo-wide search for
`agent`, `charter`, `ai_worker` returns **zero matches in all source**.
`ai.controller.ts` exposes a `POST` route with **no permission check at all**.

**Worker — all processors are stubs.** Eight queues are declared (indexing,
document-parsing, embeddings, ai-calls, notifications, imports, exports,
maintenance). Every processor returns `status: "deferred"`
(`queue-registry.service.ts:40`). The domain type is candid about it:
`processor_status: "contract-only"`, `worker_runtime: "not_observable"`
(`packages/domain/src/operations.ts`).

**Business objects — absent.** `DomainEventObjectType`
(`packages/domain/src/events.ts:8-33`) declares `knowledge_space`,
`knowledge_page`, `document`, `task`, `decision`, `ai_session`. **None of these
have tables, services, or controllers.** There is no work management, no
knowledge base, no documents, no search, no reporting.

**Schema drift.** `knowledge_spaces` and `ai_sessions` are defined in Drizzle
(`packages/db/src/schema.ts`) but **have no migration** — they do not exist as
physical tables. Nothing queries them, so they are dead declarations rather than
runtime faults.

**Module lifecycle.** `coreManifests` is a hardcoded TypeScript array
(`system-manifests.ts:3`) registered at boot. There is no dynamic module
install / enable / disable, and no runtime plugin loading. The manifests for
`knowledge` and `ai-governance` describe modules whose implementations do not
exist.

**Authentication.** There is none in-process. Identity arrives as `x-actor-id` /
`x-tenant-id` / `x-portal-id` headers, HMAC-signed by the web tier with a shared
secret and a 60-second freshness window (`request-identity.ts:174-224`). There is
no login, no session, no token issuance. The README is explicit that this is a
development bridge.

## 4. Structural findings against our kernel

These are the findings that determine fit. Each is cited.

### 4.1 The principal model is human-only

| Finding | Evidence |
|---|---|
| `principal_type` is a Postgres ENUM of `('user','role','group','team')` | `001-platform-kernel.sql:23` |
| Authorisation requires the actor to be a row in `users`; otherwise the principal set is empty and everything denies | `permission.repository.ts:52` |
| `users.email` is `NOT NULL` and `UNIQUE (tenant_id, email)` | `001-platform-kernel.sql:94,99` |
| Delegations hard-FK to `users` on both sides | `005-temporary-delegations.sql:9-10` |
| `ai_sessions.actor_id` FKs to `users` | `schema.ts` |

**An AI worker cannot act in this system today without being given a fake email
address and inserted as a user.** That is precisely the impersonation pattern
fatal-flaw F2 tests for, and invariants I1/I3 forbid.

**But the failure is shallow, not structural.** `PermissionCheck.actor_id` is a
bare string; `permission_rules.principal_id` has **no foreign key**;
`audit_events.actor_id` has **no foreign key**. The human-only assumption is
concentrated in one enum, one lookup function, and one table's FKs — not diffused
through the data model. This distinction decides the verdict.

### 4.2 Authorisation is binary; there is no autonomy concept

`PermissionEffect = "allow" | "deny"` (`permissions.ts:1`). The resolver returns
the first matching decision. There is no gate ladder, no task grade, no
reversibility, no trust tier, no budget, no dual control, no hold window.

The *shape* is nonetheless right: layered sources with precedence, deny-wins, and
an accumulated explanation trace. Converting first-match-wins into
most-restrictive-wins over an ordered enum is a rewrite of one 288-line file, not
a re-architecture.

**One performance defect on this path**, found on the second pass:
`permission.repository.ts:84-88` selects *every* `permission_rules` row for the
tenant and filters permission, portal, object type and object id in JavaScript.
The same pattern appears in `isPermissionAllowedByPolicy` and
`resolveTemporaryDelegation`. This is the exact anti-pattern their own AI-first
policy forbids, on the hottest path in the system, and it must be fixed *before*
the resolver gains our additional inputs.

### 4.3 AI governance is a parallel universe

`AiToolContract` (`packages/domain/src/ai.ts:14-26`) is genuinely well-conceived:
`required_permissions`, `scope_rules`, `allowed_mutations`, `evidence_required`,
`audit_event_type`, `risk_level`, and `confirmation: "none" |
"required_before_mutation" | "admin_approval"` — a three-level proto-autonomy
ladder.

But it is a **separate type in a separate module, unconnected to
`PermissionCheck`**. Two governance worlds, one for humans and one for AI. This is
the exact violation invariants I1, I2 and I5 exist to prevent, and it is the most
important *conceptual* defect found.

### 4.4 There is no enforcement chokepoint

`assertAllowed` is called from **11 hand-written call sites**. There is no NestJS
guard, no interceptor, no decorator-driven enforcement. Adding a route without a
permission check is silent and undetected — as `ai.controller.ts` demonstrates
today. The resolver is centralised; its *invocation* is not.

The same applies to audit: `events.publish(...)` is called manually in each
service. A module author who forgets produces no audit record.

### 4.5 The ledger is a log, not a ledger

*Revised after the second pass — see [P1 map §3](../../platforms/01-graph-portal-platform/03-identity-and-salvage-map.md).
The original text credited this layer with two properties it does not have.*

**Audit is not transactional.** `DatabaseUnitOfWork` does not exist — zero matches
for `UnitOfWork`, `.transaction(` or `appendWithinTransaction` in the entire API
source. The real path is `repository.create()` (commits) → `events.publish()`
(separate insert). A failed audit leaves a committed business row with no record.
The architecture documents and the README both claim otherwise.

**Correlation and causation are runtime-dead.** Every `correlation_id` is a fresh
`randomUUID()` at the point of event construction, and `causation_id` is always
`null`, across all 12 emission sites. Every event is its own correlation group,
so nothing can be traced. The envelope and schema are right; the runtime never
uses them. (The plumbing exists and is unconnected: `common/observability.ts`
already resolves and propagates an `x-request-id` per request.)

With those corrections, `audit_events` has good *structure* but:

- no hash chain, no signature, no checkpoint;
- no `REVOKE`, no rule, no trigger — **append-only by convention only**, verified
  by grep across all migrations;
- no attribution chain: a single `actor_id`, with no `on_behalf_of`, no
  `authority_source`, no `invoker`.

### 4.6 Extensibility has a closed enum

`DomainEventObjectType` is a closed union in the shared domain package. A new
module cannot introduce an object type without editing core. The module manifest
is otherwise well-designed; this one type undermines it.

### 4.7 Wholly absent

Canonical entities · tags/lenses · addressing/mentions · approvals · budgets ·
skills · charters · trust · classification · versioning of policy · RLS.

## 5. Documentation accuracy

The user's caution was warranted historically and is no longer warranted for the
current documents.

`GAP-ANALYSIS-2026.md` (June) documents a severe institutional failure: the
`STABILIZATION-LOG` and `IMPLEMENTATION_PLAN` marked phases complete that were
"contracts and registries, not fully integrated, working features", and describes
a broken production build.

**That has since been corrected.** The build passes, tests pass, and the current
`docs-newer/README.md` §18 "Current Known Gaps" independently and accurately
lists what I found by reading code — including the `knowledge_spaces` /
`ai_sessions` migration drift, placeholder queue processors, AI as
contracts-only, the development-only identity bridge, absent RLS, and the
non-transactional bootstrap writes.

The domain types themselves encode honesty: `processor_status: "contract-only"`,
`worker_runtime: "not_observable"`, `metrics_endpoint: "missing"`.

### 5.1 Correction — trustworthiness is per-document, not per-vintage

*Revised 2026-08-08 after reading the full documentation set. My initial
assessment — "current documentation is trustworthy" — was based on the top-level
README and is too generous.*

`docs-newer/uxaios/PLATFORM-FEATURE-INVENTORY.md` §4.2–4.3 marks a large number
of features **"Shipped"**, with specific route paths. Verified against source:

| Claimed "Shipped" | Reality |
|---|---|
| `/signup`, `/forgot-password`, `/reset-password` | Routes do not exist |
| `/settings/permissions` + `GET /permissions/catalog` | Neither exists; no "catalog" anywhere in the API |
| `/settings/roles/:id` editable permission matrix | Does not exist |
| `/settings/portals`, `/settings/portals/edges` | Do not exist |
| `/install` bootstrap page | Does not exist |
| Garage register/edit + style guide | **Zero matches** for `garage` in all source |
| Assets Store deploy/publish | **Zero matches** |
| AI Studio governed invoke | **Zero matches** |
| `/settings/themes` + portal assign | Does not exist |
| Construction mode toolbar, UXAIOS space admin | **Zero matches** for `uxaios` in all source |
| `e2e/style-guide-visual.spec.ts` visual regression | Does not exist |

Verification: directory checks for each route under `apps/web/app`, and
`grep -rli "garage|assets-store|ai-studio|uxaios"` across `apps` and `packages`
returning nothing.

**So the documentation set is internally contradictory.** Two documents in the
same folder, both recent:

- `docs-newer/README.md` §18 — accurate, and honest to the point of listing its
  own migration drift and non-transactional bootstrap writes.
- `docs-newer/uxaios/PLATFORM-FEATURE-INVENTORY.md` — extensively false.

**Revised assessment: trustworthiness must be judged per document, never per
folder or per date.** The README, the architecture contracts and `auth-session.md`
are careful and verifiable. The uxaios inventory and the stabilisation log are
not. A reader who starts from the inventory would form a completely wrong picture
of the product's maturity — and would be reading a *recent* document to do it.

This does not change the verdict, but it sharpens the institutional risk in
[P1 verdict §8](../../platforms/01-graph-portal-platform/02-verdict.md) considerably: the drift is not historical and
corrected. It is present, current, and sitting next to accurate documents.

## 6. Summary table

| Layer | State |
|---|---|
| Tenancy & portal graph | **Implemented, good** |
| Org principals (human) | **Implemented** |
| Permission resolution | **Implemented, good shape, binary** |
| Delegation | **Implemented, right shape, human-only** |
| Record policies | **Implemented** |
| Audit events | **Implemented, no integrity layer** |
| Module manifest | **Contract good, no lifecycle** |
| Hooks | **Registry only** |
| Localisation / RTL | **Implemented** |
| Admin UI | **Implemented** |
| Auth | **Absent** (dev bridge) |
| AI anything | **Absent** |
| Work / knowledge / docs / search / reporting | **Absent** |
| Canonical entities / tags / addressing | **Absent** |
| Approvals / budgets / trust / charters | **Absent** |
