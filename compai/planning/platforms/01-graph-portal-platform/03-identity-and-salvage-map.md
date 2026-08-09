# 11 — Platform 1: Identity, Database, and Salvage Mapping

**Subject:** `companai/Platform` — "Graph Portal Platform" (`@gpp`)
**Purpose:** a development reference. What this codebase *is* precisely enough to
reuse it, and a line-by-line map from what our platform needs to what already
exists here.
**Method:** second forensic pass over every source file, plus package manifests,
compose files, migrations and the migration runner.
**Companion documents:** [P1 forensic](../../platforms/01-graph-portal-platform/01-forensic-analysis.md) (what it is) ·
[P1 verdict](../../platforms/01-graph-portal-platform/02-verdict.md) (EVOLVE verdict)

---

# Part 1 — Identity

## 1.1 Technology stack (exact versions)

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 5.7.2 |
| Runtime | Node | ≥ 22 |
| Package manager | pnpm | 9.15.0 |
| Monorepo | Turborepo | 2.3.3 |
| Module system | ESM throughout (`"type": "module"`) | — |
| Test runner | Vitest | 2.1.8 |
| E2E (declared) | Playwright | 1.61.1 |
| Formatter | Prettier | 3.4.2 |

**API — `apps/api`**

| Dependency | Version | Role |
|---|---|---|
| `@nestjs/core`, `common` | 11.1.28 | Framework (**Nest 11**, not 10 as the dictionary states) |
| `@nestjs/platform-fastify` | 11.1.28 | HTTP adapter |
| `@fastify/helmet` | 13.1.0 | Security headers |
| `@nestjs/swagger` | 11.4.6 | OpenAPI at `/api/docs` — **live** |
| `@nestjs/event-emitter` | 3.1.0 | In-process event bus (wildcard, `.` delimiter) |
| `@nestjs/config` | 4.0.4 | Env loading |
| `drizzle-orm` | 0.45.2 | Query builder |
| `postgres` | 3.4.5 | Driver (postgres.js) |
| `bullmq` / `ioredis` | 5.34.2 / 5.4.2 | Queues |
| `zod` | 3.24.1 | Schema validation |
| `class-validator` / `class-transformer` | 0.14.4 / 0.5.1 | **Declared but inert** — DTOs are plain interfaces, so `ValidationPipe` has nothing to validate |

**Web — `apps/web`**

| Dependency | Version |
|---|---|
| `next` | 15.5.21 (App Router, standalone output) |
| `react` / `react-dom` | 19.0.0 |
| `tailwindcss` | 3.4.17 |
| `@tanstack/react-table` | 8.20.6 |
| `@tanstack/react-virtual` | 3.11.2 |
| `react-hook-form` + `@hookform/resolvers` | 7.54.2 / 3.10.0 |
| `recharts` | 2.15.0 |
| `lucide-react` | 0.468.0 |
| `zod` | 3.24.1 |

**Worker — `apps/worker`:** NestJS 11 + BullMQ 5.34.2 + ioredis. No database
dependency.

**Packages**

| Package | Purpose | Notable deps |
|---|---|---|
| `@gpp/domain` | Shared contracts | **Zero runtime dependencies** |
| `@gpp/db` | Drizzle schema, client, migrations | drizzle-orm, postgres |
| `@gpp/config` | Zod env schema | zod |
| `@gpp/ui` | 3 components + tokens | Radix Slot, CVA, clsx, tailwind-merge |
| `@gpp/visualization` | 3D portal graph | three 0.171, @react-three/fiber 9, drei 10.7.7 |

## 1.2 Runtime topology

```text
Browser
   │  cookies/session: none — no login exists
   ▼
apps/web  (Next.js :3000)
   │  BFF proxy /api/kernel/[...path]
   │  signs HMAC-SHA256 identity headers:
   │    x-actor-id · x-tenant-id · x-portal-id
   │    x-identity-timestamp · x-request-id · x-identity-signature
   ▼
apps/api  (NestJS/Fastify :4000, global prefix /api)
   ├─ helmet · CORS from WEB_ORIGIN · ValidationPipe (inert) · ApiExceptionFilter
   ├─ Swagger at /api/docs
   ├─ 18 feature modules
   ▼
PostgreSQL 17 + pgvector   Redis 7   MinIO (S3)
                             ▲
                             │
                        apps/worker (BullMQ, 8 queues, all processors deferred)
```

**Ports:** web 3000, api 4000, postgres 5432, redis 6379, minio 9000/9001.

## 1.3 Environment contract

```bash
NODE_ENV, WEB_PORT=3000, API_PORT=4000
DATABASE_URL=postgres://gpp:gpp@postgres:5432/gpp
TEST_DATABASE_URL, ALLOW_REMOTE_TEST_DATABASE
REDIS_URL=redis://redis:6379
S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET
NEXT_PUBLIC_API_URL, WEB_ORIGIN
IDENTITY_PROXY_SECRET        # ≥32 chars; HMAC key for the identity bridge
ALLOW_UNSIGNED_IDENTITY=1    # non-production bypass
ENABLE_BOOTSTRAP=1           # gates the bootstrap escape hatch
LOCAL_NO_DB=1                # returns a Proxy stub instead of a DB client — dangerous
WORKER_START_ALL_QUEUES
```

`@gpp/config` defines a Zod schema for these but **is never called at startup** —
services read `process.env` and `ConfigService` directly.

## 1.4 Infrastructure images

| Service | Image | Notes |
|---|---|---|
| PostgreSQL | `pgvector/pgvector:pg17` | Extensions `uuid-ossp` + `vector` enabled in migration 001 |
| Redis | `redis:7-alpine` | Healthcheck `redis-cli ping` |
| MinIO | `minio/minio:latest` | Console on 9001 |

Production compose adds a separate migration service ordered before the API; the
local compose does not.

---

# Part 2 — Database

## 2.1 Physical tables (20)

All created by migrations `001`–`005`. Every table carries `tenant_id` except
the two noted.

| # | Table | Key columns | Notes |
|---|---|---|---|
| 1 | `tenants` | `id`, `name`, `slug` UNIQUE, `default_locale` | Root |
| 2 | `language_packs` | `locale` **PK**, `label`, `native_label`, `direction`, `default_currency`, `is_core`, `is_enabled` | Global (no tenant) · seeded en/sv/ar |
| 3 | `tenant_languages` | `tenant_id`, `locale`→packs, `is_default`, `is_enabled` | UNIQUE(tenant_id, locale) |
| 4 | `portals` | `portal_type` ENUM, `owner_entity_id`, `default_language`, `supported_languages` jsonb, `text_direction_policy`, `theme_policy`, `enabled_modules` jsonb | Org graph node |
| 5 | `portal_edges` | `parent_portal_id`, `child_portal_id`, `relationship_type`, `inheritance_mode` ENUM, **`permission_ceiling_id`**, `module_grants` jsonb | UNIQUE(parent, child, relationship_type) |
| 6 | `users` | `email` NOT NULL, `display_name`, `preferred_locale`, `is_active` | **UNIQUE(tenant_id, email)** — the AI-principal blocker |
| 7 | `roles` | `key`, `name`, `is_active` | UNIQUE(portal_id, key) |
| 8 | `groups` | `name`, `is_active` | UNIQUE(portal_id, name) |
| 9 | `teams` | `group_id`→groups, `name`, `is_active` | UNIQUE(portal_id, name) |
| 10 | `user_memberships` | `user_id`, `role_id`, `group_id`, `team_id` | Nullable triple; one row per assignment |
| 11 | `permission_policies` | `name`, `description` | Referenced as ceilings by edges |
| 12 | `permission_rules` | `policy_id`, `effect` ENUM, `permission`, `principal_type` ENUM, `principal_id`, `object_type`, `object_id` | **`principal_id` has no FK** — key flexibility |
| 13 | `modules` | `id` **text PK**, `manifest` jsonb, `enabled` | **No `tenant_id`** — global registry |
| 14 | `audit_events` | `event_id` PK, `event_type`, `version`, `occurred_at`, `actor_id`, `object_type`, `object_id`, `correlation_id`, `causation_id`, `payload` jsonb, `visibility_scope` | **`actor_id` has no FK** — key flexibility |
| 15 | `project_workspaces` | `name`, `description`, `status` | UNIQUE(portal_id, name) |
| 16 | `project_memberships` | `project_id`, `user_id`, `team_id`, `project_role`, `permission_overlay` jsonb | Overlay is a string array with a `deny:`/`!` prefix mini-DSL |
| 17 | `record_policies` | `object_type`, `object_id`, `lock_state`, `metadata` jsonb | Two **partial** unique indexes (project-scoped / portal-scoped) |
| 18 | `record_policy_rules` | `policy_id`, `effect`, `permission`, `principal_type`, `principal_id` | |
| 19 | `temporary_delegations` | `permission`, **`delegator_user_id`→users**, **`delegate_user_id`→users**, `reason`, `starts_at`, `expires_at`, `revoked_at`, `revoked_by`→users | Hard FKs to `users` — the second AI-principal blocker |
| 20 | `schema_migrations` | `version` PK, `applied_at` | No checksum |

**Orphans — declared in Drizzle, no migration, no physical table, unreferenced:**
`knowledge_spaces`, `ai_sessions`.

## 2.2 Enums, extensions, indexes

```sql
portal_type       ('hub','consultant','company','subsidiary','department','project','sandbox')
inheritance_mode  ('strict','flexible','reference-only','none')
permission_effect ('allow','deny')
principal_type    ('user','role','group','team')          -- the blocker
```

Extensions: `uuid-ossp`, `vector`. ~25 indexes, all sensible
(tenant, portal, principal, object, validity-window, actor, event type).

**No row-level security.** Tenant isolation is entirely application-enforced.
**No constraint, rule or trigger** makes `audit_events` append-only.

## 2.3 Migration runner — `packages/db/scripts/migrate.mjs`

Small and genuinely good:

- `pg_advisory_lock(733702121)` around the whole run — safe under concurrent boots;
- creates the ledger if missing;
- filename pattern enforced: `^\d{3}-[a-z0-9-]+\.sql$`;
- **each migration runs inside its own transaction** with the ledger insert;
- already-applied migrations skipped; `ON CONFLICT DO NOTHING`;
- advisory lock released in `finally`, connection closed with timeout.

Missing: checksums, and no `DOWN` path.

---

# Part 3 — Corrections to earlier analysis

Three findings from this second pass that [P1 forensic](../../platforms/01-graph-portal-platform/01-forensic-analysis.md)
did not have. All three matter.

### 3.1 Audit is **not** transactional

`DatabaseUnitOfWork` **does not exist** — zero matches for `UnitOfWork`,
`.transaction(`, or `appendWithinTransaction` in the entire API source.

The real path (`users.service.ts:37-53`) is:

```text
assertAllowed()  →  repository.createUser()   [commits]
                 →  events.publish()          [separate INSERT]
```

If the audit insert fails, the business row already exists with no record.

The architecture documents claim audit persists through
`DatabaseUnitOfWork.transaction` + `appendWithinTransaction` + post-commit
fanout, and the README lists "Transactional audit (most services) — INTEGRATED".
**Both are false.** The README's §18 gap list even mentions non-transactional
*bootstrap* writes while implying the rest are transactional; they are not.

**Correction to [P1 forensic §2](../../platforms/01-graph-portal-platform/01-forensic-analysis.md):** audit exists, but the
atomicity property does not.

### 3.2 Correlation and causation are structurally present but semantically dead

Every `correlation_id` in the codebase is a fresh `randomUUID()` at the point of
event construction, and `causation_id` is **always `null`**. Verified across all
12 emission sites.

So every event is its own correlation group. **Nothing can be traced.** In
[P1 forensic](../../platforms/01-graph-portal-platform/01-forensic-analysis.md) I praised correlation + causation as a
strength; it is a strength of the *envelope and schema*, not of the runtime.

The plumbing to fix it exists and is unconnected: `common/observability.ts`
resolves and propagates an `x-request-id` per request, and Fastify's `genReqId`
is wired to it. Threading that into the event envelope is a small change — but it
is a change, not a feature.

### 3.3 The resolver loads all rules and filters in memory

`permission.repository.ts:84-88` selects **every** `permission_rules` row for the
tenant and filters `permission`, `portal`, `object_type` and `object_id` in
JavaScript. Same pattern in `isPermissionAllowedByPolicy` and
`resolveTemporaryDelegation`.

This is the exact anti-pattern their own `AI-FIRST-PLATFORM-POLICY.md` §4
forbids, on the hottest path in the system. It is trivially fixable (move the
predicates into the `where`) and must be fixed before the resolver is extended,
because our version adds more inputs to the same path.

---

# Part 4 — The salvage mapping

Legend:

| Verdict | Meaning |
|---|---|
| **LIFT** | Copy nearly as-is; small renames |
| **ADAPT** | Copy and modify; the shape is right |
| **PATTERN** | Take the design; rewrite the code |
| **REPLACE** | Exists, but wrong for us — do not carry it forward |
| **BUILD** | Nothing here; build from our documents |

## 4.1 Kernel service 1 — Principal & Charter

| Our need | What exists | Where | Verdict | Effort saved |
|---|---|---|---|---|
| Principal model admitting AI workers | `users` + `principal_type` enum, human-only | `001:23,91-100` | **REPLACE** | — |
| Org membership graph | `roles`/`groups`/`teams`/`user_memberships` + repositories | `identity-admin.repository.ts` (519 L) | **ADAPT** — retarget `user_id` → `principal_id` | High |
| **Portal graph with ceilings** | `portals`, `portal_edges`, portal repository/service | `001:63-89`, `portal.repository.ts` (179 L), `portals.service.ts` (138 L) | **LIFT** | **Very high** |
| Charter → Grant Set compilation | Nothing | — | **BUILD** | — |
| Mindflow | Nothing | — | **BUILD** | — |
| Trust tiers, evaluation, budgets | Nothing | — | **BUILD** | — |
| Worker lifecycle states | Module lifecycle is the same shape | `module-integration-and-ai.md` | **PATTERN** | Medium |

## 4.2 Kernel service 2 — Capability & Autonomy

| Our need | What exists | Where | Verdict | Effort saved |
|---|---|---|---|---|
| **Layered resolution with precedence** | 8-source ordered resolver | `permission.service.ts:54-261` | **ADAPT** — the single most valuable file | **Very high** |
| **Decision explanation trace** | `PermissionDecisionExplanation[]` accumulated through evaluation | `permissions.ts:36-41`, threaded throughout | **LIFT** | **Very high** |
| Six-level autonomy ladder | Binary `allow`/`deny` | `permissions.ts:1` | **REPLACE** | — |
| Graph-inherited ceilings | `listIncomingCeilingPolicyIds` + `isPermissionAllowedByPolicy` | `permission.repository.ts:113-130` | **ADAPT** | High |
| **Record lock states** | `open`/`restricted`/`locked` fully resolved | `permission.repository.ts:204-262` | **LIFT** | High |
| **Terminal vs recoverable denial** | `terminal` flag on project overlay | `permission.repository.ts:132-203` | **LIFT** — generalise to all sources | Medium |
| **Delegation with scope + expiry + revocation** | Complete: time window, project/object scope, revocation, latest-expiry preference | `permission.repository.ts:270-310`, `005-*.sql` | **ADAPT** — re-point FKs to principals | **Very high** |
| Project overlay with `deny:`/`!` DSL | Implemented | `permission.repository.ts:174-203` | **PATTERN** — replace DSL with typed grants | Low |
| Capability registry with effect class | `PermissionDeclaration` (permission/label/risk) + `AiToolContract` in a separate world | `module-manifest.ts:21-25`, `ai.ts:14-26` | **ADAPT** — merge the two into one descriptor | Medium |
| Task grades | Nothing | — | **BUILD** | — |
| Trust tiers | Nothing | — | **BUILD** | — |
| Approval queue, preflight, standing approvals | Nothing (specified in `BATCH-05` §3.5, never built) | — | **BUILD** | — |
| Enforcement chokepoint | 11 manual call sites, no guard | across services | **REPLACE** | — |

## 4.3 Kernel service 3 — Context Graph

| Our need | What exists | Where | Verdict |
|---|---|---|---|
| Canonical entities + external mappings | Nothing | — | **BUILD** |
| Tags, namespaces, taggings | Nothing | — | **BUILD** |
| Beams | Nothing (concept only in UXAIOS docs) | — | **BUILD** |
| Lenses | Nothing | — | **BUILD** |
| Knowledge Cells | Contract sketch only | `knowledge-cell-contract.md` | **PATTERN** |
| Vector retrieval | `pgvector` extension enabled, unused | `001:2` | **LIFT** (infrastructure) |

**This entire service is greenfield.** Which is fine — it was always going to be.

## 4.4 Kernel service 4 — Addressing

Nothing exists. Handles, resolution strategies, mentions, duty rotations, routing:
all **BUILD**.

## 4.5 Kernel service 5 — Ledger

| Our need | What exists | Where | Verdict |
|---|---|---|---|
| Event envelope with actor/object/scope | `DomainEventEnvelope` — well-shaped | `events.ts:35-49` | **LIFT** |
| Append-only store | `audit_events` + repository | `001:180-194`, `audit-event.repository.ts` | **ADAPT** — add hash chain, revoke UPDATE/DELETE |
| **Event `visibility_scope`** | 5 levels, stored | `events.ts:1-6` | **LIFT** |
| Correlation / causation | Fields exist; **runtime dead** (§3.2) | 12 emission sites | **ADAPT** — thread the request id through |
| Request-id propagation | `resolveRequestId` + Fastify `genReqId` + error body | `common/observability.ts` (41 L) | **LIFT** |
| Transactional audit | **Does not exist** (§3.1) | — | **BUILD** |
| Attribution chain | Single `actor_id` | — | **BUILD** |
| Signed acts, checkpoints, `as_of` | Nothing | — | **BUILD** |

## 4.6 Module system, Garage, providers

| Our need | What exists | Where | Verdict |
|---|---|---|---|
| Module manifest contract | `ModuleManifest` — 11 surfaces | `module-manifest.ts` (76 L) | **ADAPT** — add capabilities-with-risk, `implementation_status`, drop closed enums |
| Hook registry with governance metadata | `HookRegistration` (allowed_mutations, permissions, timeout, risk, audit type) + registry | `hooks.ts` (38 L), `hook-registry.service.ts` (31 L) | **LIFT** — add resolver check on execute |
| Module install pipeline | **Documented in detail, not implemented** — `coreManifests` is a hardcoded array | `module-loader-contract.md`, `system-manifests.ts:3` | **PATTERN** — the contract is excellent, the code isn't there |
| Connector/integration manifest | Documented, one mock provider | `integration-extension-contract.md` | **PATTERN** |
| Garage | Nothing | — | **BUILD** |
| Provider interfaces | None — direct DB/service coupling | — | **BUILD** |

## 4.7 Cross-cutting — the quiet wins

| Our need | What exists | Where | Verdict | Note |
|---|---|---|---|---|
| **Locale + RTL foundation** | `LocalizedText`, `readLocalizedText`, `inferTextDirection` with a 10-language RTL prefix set, locale pattern, graceful fallback | `localization.ts` (111 L) | **LIFT** | Zero dependencies. Copy the file. |
| Locale seeding + tenant languages | Migration + repository + service | `001:214-226`, `language.repository.ts` (153 L) | **LIFT** | |
| **Migration runner** | Advisory lock, per-file transaction, ledger, filename discipline | `migrate.mjs` (~70 L) | **LIFT** | Add checksums |
| Validation helpers | `requireUuid`, `optionalLocale`, bounded pagination, etc. | `common/validation.ts` (90 L) | **LIFT** | |
| Error envelope | `{statusCode, message, error, request_id, timestamp, path}` + global filter | `observability.ts`, `api-exception.filter.ts` (110 L) | **LIFT** | |
| DB client factory | postgres.js pool, `prepare: false` | `client.ts` (14 L) | **LIFT** | Add shutdown hook |
| Env schema | Zod, unused | `config/src/env.ts` (20 L) | **ADAPT** | Actually call it at boot |
| HMAC identity bridge | Signed headers, freshness window, timing-safe compare | `request-identity.ts` (251 L) | **PATTERN** | Good *service-to-service* pattern; never a user auth system |
| Queue registry | 8 named queues, Redis URL parsing, lifecycle | `queue-registry.service.ts` | **ADAPT** | Processors are stubs |
| Docker/compose topology | pg17+pgvector, redis 7, minio, healthchecks, migrate-before-API | compose files | **LIFT** | |
| Design tokens + `cn` | Minimal but clean | `packages/ui` | **ADAPT** | Only 3 components |
| Admin workbench UI | ~19,900 LOC of operator screens | `apps/web` | **REPLACE** | Wrong product model (I1a) — but harvest table/form patterns |
| 3D portal graph scene | three.js + react-three-fiber | `packages/visualization` | **PARK** | Keep; do not prioritise |

## 4.8 Salvage inventory, ranked

What to copy first, in order of value per hour:

| Rank | Artefact | Files | Why |
|---|---|---|---|
| 1 | **Layered resolver + explanation trace** | `permission.service.ts`, `permission.repository.ts` | Our hardest component already exists in the right shape. Convert binary → ladder, generalise principals, push filters into SQL. |
| 2 | **Portal graph + ceilings** | `001` migration, `portal.repository.ts`, `portals.service.ts`, `portal.ts` | The org topology we adopted in Batch A, already built and tested. |
| 3 | **Temporary delegations** | `005` migration, resolver method | Complete and correct; only the FKs need re-pointing. |
| 4 | **Localization module** | `localization.ts` + language migration/repo/service | Dependency-free, immediately useful, expensive to retrofit later. |
| 5 | **Migration runner** | `migrate.mjs` | ~70 lines that solve concurrency and ordering correctly. |
| 6 | **Record policies + lock states** | `004` migration, resolver method | Directly implements our floor input. |
| 7 | **Event envelope + visibility scope** | `events.ts`, `audit-event.repository.ts` | Right shape; needs chain, atomicity, real correlation. |
| 8 | **Hook registry** | `hooks.ts`, `hook-registry.service.ts` | 69 lines total; add a resolver check on execute. |
| 9 | **Module manifest** | `module-manifest.ts` | Close to our contract; needs enrichment. |
| 10 | **Common utilities** | `validation.ts`, `observability.ts`, `api-exception.filter.ts`, `client.ts` | Small, boring, correct — the things nobody budgets for. |

**Roughly 3,000–3,500 lines of the ~30,700 are worth carrying forward**, plus the
compose/migration/test scaffolding. That is a low ratio in volume and a high one
in value: it is concentrated almost entirely in the resolver, the org graph, and
the plumbing that is tedious to rebuild.

## 4.9 Things to explicitly not carry

| Artefact | Reason |
|---|---|
| `users`-as-principal and the `principal_type` enum | The AI-principal blocker |
| Binary `PermissionEffect` | Replaced by the ladder |
| `AiToolContract` as a separate governance world | Merged into the capability registry; the *fields* survive, the separation does not |
| `AiGovernanceService` | Hardcoded stub, no value |
| `LOCAL_NO_DB` Proxy stub | Silently returns a chainable no-op for every DB call; can make a broken system look healthy |
| Manual `assertAllowed` call sites | Replaced by the chokepoint |
| `class-validator` / `class-transformer` | Inert; standardise on Zod |
| Admin workbench screens | Wrong product model per **I1a** |
| Hardcoded `coreManifests` | Replaced by real registration |
| `knowledge_spaces`, `ai_sessions` Drizzle orphans | Delete |

---

# Part 5 — What this means for sequencing

The five repairs in [P1 verdict §7](../../platforms/01-graph-portal-platform/02-verdict.md) are unchanged, with two
additions from this pass, both belonging to **Step 4 (ledger integrity)**:

- **Make audit transactional** — a unit-of-work wrapping mutation + audit append
  in one transaction. It was never built, despite documentation claiming
  otherwise (§3.1).
- **Connect correlation to reality** — thread the request id into the envelope
  and set `causation_id` from the triggering event (§3.2).

And one addition to **Step 3 (autonomy ladder)**, as a prerequisite rather than
an optimisation:

- **Push resolver filtering into SQL** before adding inputs to the hot path
  (§3.3). Our resolver adds grade, trust, budget and graph-ceiling lookups to
  this same call; starting from a load-all-then-filter baseline would make it
  much worse.

The verdict remains **EVOLVE**. This pass strengthens rather than weakens it: the
parts worth keeping are more clearly identified, and the parts that were only
claimed have now all been located.
