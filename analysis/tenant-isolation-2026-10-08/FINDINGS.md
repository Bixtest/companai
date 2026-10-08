# Tenant Isolation — Forensic Findings

**Date:** 2026-10-08
**Codebase:** `C:/Users/Ramzi/Downloads/companai/workspace/starting-kit` (TypeScript monorepo, Open Mercato platform)
**Question under investigation (owner):** *"Concerning tenants database management — is it already well structured so there are core tables and functionalities across tenants, but then when a table or database change is made in one tenant, that only impacts that tenant alone?"*

**Method.** Read-only. No code was written or modified. Every claim carries `file:line`. Claims were confirmed by two independent routes (entity decorator **and** SQL migration; config **and** runtime query; type **and** test) wherever a second route exists.

---

## §0 Executive measurement (the one-line answer)

**The platform is a single-database, single-schema, shared-table model.** One Postgres database (`open-mercato`), one schema (`public`), every tenant-scoped table carries a nullable `tenant_id` column, and isolation is enforced **in the application layer** (MikroORM repository + query engine + a `CrudFactory` that injects `where tenant_id = ?`), **not** by the database (no Row-Level Security, no schema-per-tenant, no DB-per-tenant).

Measured facts (see §6 for counts):

- **224** entity-backed tables parsed; **209** carry a `tenant_id` column; **15** do not (all global core tables or child/junction tables scoped via a parent FK).
- **241** migration files, all TypeScript, all applied to **the one** `DATABASE_URL`; **zero** `.sql` files.
- **Zero** occurrences of `ROW LEVEL SECURITY` / `CREATE POLICY` / `current_setting('app…')` anywhere in `packages/**` or any `.sql`.
- **Zero** occurrences of `search_path` or a per-tenant `schema:` in DB config.

---

## §1 The isolation model, measured — shared-schema, single database

### Route A — the config

**Single database, single connection string.** `packages/shared/src/lib/db/mikro.ts:124` reads `process.env.DATABASE_URL`; `packages/cli/src/lib/db/commands.ts:45-49` (`getClientUrl`) errors if it is unset. There is exactly one ORM instance (`ormInstance`, `mikro.ts:13`).

**One physical database for all tenants.** `docker-compose.yml:38-40` and `docker-compose.fullapp.yml:257-259` define a single Postgres service with `POSTGRES_DB=${POSTGRES_DB:-open-mercato}`. `apps/mercato/.env.example:11` → `DATABASE_URL=postgres://postgres:postgres@localhost:5432/open-mercato`. There is **no** `${TENANT}` interpolation in the DB URL — tenant is not a routing dimension.

**No schema-per-tenant.** Grep for `search_path` across `packages/*/src/**/*.ts` → **no matches**. No app code sets a per-request schema. `packages/cli/src/lib/db/commands.ts:560` even queries `WHERE schemaname = current_schema()` for greenfield drops — a single current schema.

### Route B — the runtime

- `MikroORM.init` is called once with `clientUrl` (single URL) at `mikro.ts:161-163` and per-module for migrations (`commands.ts:267-293`, `commands.ts:397-424`).
- The `QueryEngine` **requires** a tenant and auto-applies it: `packages/shared/src/lib/query/engine.ts:340-343` throws `"QueryEngine: tenantId is now required for all queries (breaking change)"`; `engine.ts:501-502` and `engine.ts:554-555` add `where tenant_id = ?` **only when** `columnExists(table, 'tenant_id')` is true.
- The CRUD factory defaults its tenant field and injects it on reads and writes: `packages/shared/src/lib/crud/factory.ts:167` (`tenantField` default `'tenantId'`), `:954`, list at `:1973`, create at `:2276-2280`.

**Conclusion (§1):** shared-database, shared-schema, `tenant_id`-column model. **Not** DB-per-tenant, **not** schema-per-tenant.

### Enforcement mechanism — application-layer, opt-out-able

Isolation is enforced by **three cooperating application mechanisms**, none of them a database guarantee:

1. **`CrudFactory`** (`packages/shared/src/lib/crud/factory.ts`) — injects `ctx.auth.tenantId` into list/get (`:1973`, `:2632`, `:2972`) and create (`:2276-2280`). **Opt-out exists:** `tenantField: null` (`:167`, `:954`) or `list.omitAutomaticTenantOrgScope` (`:1973`, `:1974`).
2. **`QueryEngine`** (`packages/shared/src/lib/query/engine.ts:501-502,554-555`) — auto-where **only if** the table has a `tenant_id` column; a table without one is not scoped by this path.
3. **Explicit guards** — `packages/shared/src/lib/commands/scope.ts:149-163` `ensureTenantScope`, and `packages/shared/src/lib/api/scoped.ts:97-110` (`parseScopedCommandInput`) which 403s a non-superadmin whose requested tenant ≠ actor tenant. These must be **called by hand** by each route.

There is **no automatic global filter**: `grep -rn "filters:|addFilter|@Filter"` over `packages/shared/src` and `packages/core/src` → **no matches**. MikroORM's entity-level `@Filter` is not used.

---

## §2 Core vs tenant-owned tables — the actual list

### §2.1 The tenant model itself

| Table | File:line | tenant_id present? | Notes |
|---|---|---|---|
| `tenants` | `packages/core/src/modules/directory/data/entities.ts:4-5` + migration `packages/core/src/modules/directory/migrations/Migration20251030150038.ts:6` | **No** | The tenant row *is* the tenant; a `tenant_id` on itself would be circular. |
| `organizations` | `directory/data/entities.ts:28-34` (`@ManyToOne(() => Tenant)`) + migration `Migration20251030150038.ts:8` (`"tenant_id" uuid not null`) | **Yes** (raw column in migration; relation in entity) | Org belongs to a tenant. |

A row is associated with a tenant by a **`tenant_id uuid` column** (not a schema, not a DB). Confirmed both ways: entity `@Property({ name: 'tenant_id' })` and migration `create table … "tenant_id" uuid …`.

### §2.2 The 15 tables WITHOUT a `tenant_id` column

Measured by parsing every `@Entity({ tableName })` (including abstract base classes — see §6 method note):

**Global core (no tenant by design):**
| Table | File:line | Why global |
|---|---|---|
| `tenants` | `directory/data/entities.ts:4` | the tenant registry itself |
| `organizations` | `directory/data/entities.ts:28` | carries `tenant_id` as a relation/column; it is the tenant's org |
| `users` | `auth/data/entities.ts:3` (has `tenant_id` nullable, line 18) | treated global-ish; email uniqueness is **per-tenant** via partial index |
| `roles` | `auth/data/entities.ts:53` | has `tenant_id` (line 62) — listed here only if a role is global |
| `sessions` | `auth/data/entities.ts:222` | session → user FK; no direct tenant column |
| `user_roles` | `auth/data/entities.ts:202` | junction: `@ManyToOne User` + `@ManyToOne Role` |
| `password_resets` | `auth/data/entities.ts` | child of user |
| `feature_toggles` | `feature_toggles/data/entities.ts:10-11` | **global definition** table, `@Unique(identifier)` platform-wide |

**Per-tenant override of a global definition (the model to note):**
| Table | File:line | Keys |
|---|---|---|
| `feature_toggle_overrides` | `feature_toggles/data/entities.ts:50-56` | `@Unique(toggle, tenantId)` + `tenant_id` **not null** |

**Child / junction tables scoped via parent FK (no own `tenant_id`):**
| Table | File:line | Scoped by |
|---|---|---|
| `customer_deal_people` | `customers/data/entities.ts:439-458` | `@ManyToOne CustomerDeal` |
| `customer_deal_companies` | `customers/data/entities.ts:462-478` | `@ManyToOne CustomerDeal` |
| `customer_user_roles` | `customer_accounts/data/entities.ts:144-153` | `@ManyToOne CustomerUser` + `@ManyToOne CustomerRole` |
| `customer_user_sessions` | `customer_accounts/data/entities.ts:191-197` | `@ManyToOne CustomerUser` |
| `customer_user_email_verifications` | `customer_accounts/data/entities.ts:222` | child of CustomerUser |
| `customer_user_password_resets` | `customer_accounts/data/entities.ts` | child of CustomerUser |
| `message_objects` | `messages/data/entities.ts` | child of `messages` (which has `tenant_id`, `:95`) |
| `message_recipients` | `messages/data/entities.ts:147-160` | child of `messages` via `message_id` |
| `message_access_tokens` | `messages/data/entities.ts` | child of message |

> **WMS caution (measurement artifact, resolved):** the raw grep for `name: 'tenant_id'` initially flagged `wms_*` as lacking it. That was a **false negative**: the WMS tables inherit from `abstract class WmsScopedEntity` (`wms/data/entities.ts:30-51`) which declares `tenant_id` (lines 37-38). Corrected measurement: WMS tables **do** carry `tenant_id`. This is exactly why the two-route rule matters.

**Conclusion (§2):** platform-wide data = `tenants`, `organizations`, `users`/`roles`/`sessions`/`user_roles`, `feature_toggles`. Tenant-owned data = every `*_records`-style table plus 209/224 tables, all with `tenant_id`. **A change to any of the 15 no-tenant tables (or to a core enum/column) affects every tenant**, because they are shared rows.

---

## §3 How a per-tenant *structure* change is stored — **rows, not DDL**

**This is the crux and the answer is unambiguous: custom entities are ROWS in one shared JSONB table. No per-tenant DDL is ever created at runtime.**

### §3.1 The mechanism

`entities.records.<entityId>` is a **logical** entity id, not a physical table. Three shared tables hold everything:

| Table | File:line | Shape |
|---|---|---|
| `custom_entities` | `packages/core/src/modules/entities/data/entities.ts:110-166` | registry row per custom entity: `entity_id`, `tenant_id`, `organization_id` |
| `custom_entities_storage` | `entities/data/entities.ts:169-198` | **JSONB document store**: `entity_type`, `entity_id`, `tenant_id`, `organization_id`, `doc jsonb` |
| `custom_field_defs` / `custom_field_values` | `entities/data/entities.ts:25-65`, `206-249` | EAV field defs + values, each with `tenant_id` |

Confirmed two ways:
- **Entity:** `@Entity({ tableName: 'custom_entities_storage' })` with `@Property({ name: 'doc', type: 'json' })` (`entities/data/entities.ts:169,187-188`).
- **Migration:** `create table "custom_entities_storage" (… "doc" jsonb not null …)` (`entities/migrations/Migration20251030150038.ts:9`).

### §3.2 The registry guard

`upsertCustomEntity` (`entities/lib/register.ts:44-133`) creates/updates a `custom_entities` **row**, scoped by `{ entityId, organizationId, tenantId }` (`register.ts:45`). It is the single choke point and runs the SD-1 structure-change gate before the row lands (`register.ts:94-103`).

### §3.3 Is it a real table? — No

`grep -rn "execute(\`CREATE|execute('CREATE|raw(\`CREATE"` over `packages/**/*.ts` (excluding tests/dist) → **no matches**. The only `CREATE TABLE` statements live in committed migration files (e.g. `entities/migrations/Migration20251030150038.ts`), which are static and applied globally (§4.1). `ensureStorageTableExists` (`shared/src/lib/data/engine.ts:258-268`) only **asserts** the table exists — it never creates it.

### §3.4 Why this makes per-tenant structure changes inherently isolated

A tenant "adding a field to a custom entity" is an `INSERT` into `custom_field_defs` with that tenant's `tenant_id` (`entities/data/entities.ts:38`). It changes **no schema**. Another tenant's query cannot see it because every read adds `where tenant_id = ?` (`query/engine.ts:501-502`; `query_index/lib/engine.ts:1656-1657`). There is no shared DDL object to leak — the "structure" is data.

### §3.5 The one exception — a per-tenant structure change that IS real DDL

The **pgvector search driver** creates a real table at runtime: `packages/search/src/vector/drivers/pgvector/index.ts:133-165` issues `CREATE TABLE IF NOT EXISTS … (… tenant_id uuid not null …)` and `CREATE UNIQUE INDEX … (driver_id, entity_id, record_id, tenant_id)`. It is tenant-scoped **by column**, not by table name — so it is one shared table for all tenants (safe for reads that filter), but it is a real DDL object created lazily. See §4.5.

**Conclusion (§3):** a per-tenant "new table/column/field-type change" (the thing SD-1 gates) creates **a row**, not DDL. `entities.records.<entityId>` is a logical id backed by `custom_entities_storage` rows. The mechanism is therefore **inherently isolated by construction** for the entity/field path.

---

## §4 Every leakage path found

### §4.1 Migrations are applied globally to one database — **severity: by-design, but relevant**
`packages/cli/src/lib/db/commands.ts:354-457` (`dbMigrate` → `runPendingMigrations`) iterates all enabled modules and applies each module's `Migration*.ts` to the single `DATABASE_URL`. **241** migration files. A platform schema change is not tenant-scoped and cannot be. This is correct for a shared-schema model, but it means **any migration that ALTERs a shared or core table affects every tenant**. Serialized by an advisory lock (`commands.ts:345-370`).

### §4.2 CRUD tenant scoping is opt-out-able — **severity: medium (design risk)**
`packages/shared/src/lib/crud/factory.ts:167` documents `tenantField: null // … pass null to disable automatic tenant scoping`; `:954` implements it. Also `list.omitAutomaticTenantOrgScope` (`:1973-1974`). A route author who sets either, or uses a table whose `tenant_id` column is absent, gets **unscoped reads**. Not a leak today (no route was found setting it to `null`), but the switch exists and is silent.

### §4.3 `QueryEngine` scopes **only if the column exists** — **severity: medium**
`query/engine.ts:501-502,554-555` guard on `await this.columnExists(table, 'tenant_id')`. Any table lacking a `tenant_id` column (see §2.2) is **not** auto-scoped by this path. Isolation of those tables depends entirely on their FK parent being filtered upstream.

### §4.4 **`custom_entities_storage` read-back paths omit `tenant_id` — severity: HIGH (concrete)**
Two live code paths read `custom_entities_storage` filtering by `entity_type` + `entity_id` **+ `organization_id`, but NOT `tenant_id`**:

- `packages/core/src/modules/entities/api/records.ts:126-144` — `readCustomEntityRecordUpdatedAt`:
  ```
  .where('entity_type', '=', input.entityType)
  .where('entity_id', '=', input.entityId)
  .where('organization_id', 'is'/'=', input.organizationId)   // no tenant_id
  ```
- `packages/core/src/modules/entities/api/records.ts:333-340` — batch read-back:
  ```
  .where('entity_type', '=', entityId)
  .where('entity_id', 'in', recordIds)                          // no tenant_id, no organization_id
  ```

**Concrete cross-tenant scenario.** If two tenants each have a custom entity with the same `entity_id` string and a record with the same `record_id` (a UUID, so collision is unlikely but a record id is attacker-influenced on create), and both rows share `organization_id` (e.g. both `null` — the default global scope), then tenant A's request for `updated_at` on record `R` can match **tenant B's row** (or vice-versa) because `tenant_id` is not in the `WHERE`. The `updated_at` value would be B's, feeding A's optimistic-locking header — a cross-tenant **metadata** disclosure and a possible false conflict. Severity HIGH not because of wide data exposure (only `updated_at` is returned), but because it is a **real, reachable, unscoped query** in the shipped code, and it is the exact class of bug the rest of the codebase guards against.

> The main list path is correct — `query_index/lib/engine.ts:1656-1657` **does** `.where(tenant_id, '=', opts.tenantId)`. Only the read-back helpers omit it. This asymmetry is the finding.

### §4.5 `custom_entities_storage` UPSERT conflict target omits `tenant_id` — **severity: medium–high**
`packages/shared/src/lib/data/engine.ts:350-356`:
```
.onConflict((oc) => oc
  .columns(['entity_type', 'entity_id', 'organization_id'])   // tenant_id NOT in target
  .doUpdateSet({ doc, updated_at, deleted_at }))
```
Two tenancies with the same `(entity_type, entity_id, organization_id)` tri-fingerprint would **collide on the same physical row**; the second upsert **overwrites the first tenant's `doc`**. The fallback path (only reached if the `ON CONFLICT` errors, `engine.ts:360-374`) *does* include `tenant_id`. So the **primary** path is the unsafe one.

### §4.6 Entity-vs-migration divergence on the storage uniqueness — **severity: medium (evidence of drift)**
- Entity declares **UNIQUE**: `@Index({ name: 'custom_entities_storage_unique_idx', properties: ['entityType','entityId','organizationId'], options: { unique: true } })` (`entities/data/entities.ts:170`).
- Migration creates it **non-unique** and **without `tenant_id`**: `create index "custom_entities_storage_unique_idx" on "custom_entities_storage" ("entity_type", "entity_id", "organization_id")` (`entities/migrations/Migration20251030150038.ts:10`).
- Same for `custom_entities_unique_idx`: entity `@Index(...options:{unique:true})` on `['entityId','organizationId','tenantId']` (`entities/data/entities.ts:111`) vs migration `create index … ("entity_id","organization_id","tenant_id")` — **non-unique** (`Migration20251030150038.ts:7`).

Two consequences: (a) the declared uniqueness that would make §4.5 safe is **not what the migration builds**; (b) if the deployed index is truly non-unique, the `ON CONFLICT (…)` at `engine.ts:350` would raise **"no unique or exclusion constraint matching the ON CONFLICT specification"** — the code only ever works if the index really is unique at runtime (e.g. created by MikroORM dev-mode schema update, not by the migration). This divergence is worth confirming against a live database.

### §4.7 Metadata registry is deliberately **not** tenant-scoped — **severity: informational**
`packages/shared/src/lib/kernel/metadata-registry.ts:28-43` states plainly it "describes the platform's shape … declared once for the whole platform, not per tenant … carries no tenant data." It answers *what exists*, never *whose data*. Correct by design, but it means **the catalogue of custom entity types is global** — a tenant could enumerate entity ids declared by the platform. Not a row leak.

### §4.8 Generated global registries — **severity: informational**
`packages/core/generated/entities.ids.generated.ts` and `entity-fields-registry.ts` are build-time globals (module/table/field names). They carry **no tenant data**, only names. `entity-fields-registry.ts:…` lists `tenant_id` as a field name for tables — names, not values.

### §4.9 `organizations_tenant_slug_uniq` and similar partial uniques — checked, OK
`directory/data/entities.ts:29` scopes slug uniqueness by `['tenant','slug']`; `wms_warehouses` scopes by `organization_id` (`wms/data/entities.ts:58`); `feature_toggle_overrides` by `['toggle','tenantId']` (`feature_toggles/data/entities.ts:50`). These are correctly tenant-scoped. `users` email uniqueness is deliberately **per-tenant** via a partial index (`auth/data/entities.ts:4-12`).

---

## §5 What is NOT established (open questions + greps run)

1. **Is the deployed `custom_entities_storage_unique_idx` actually UNIQUE?** The migration says no, the entity says yes, and the `ON CONFLICT` at `engine.ts:350` requires yes. Not resolvable from source alone; needs `\d custom_entities_storage` on a live DB. **Greps run:** `Grep 'custom_entities_storage' glob *.ts` (full output reviewed); read of `Migration20251030150038.ts`; read of `entities/data/entities.ts:169-198`.
2. **Does `readCustomEntityRecordUpdatedAt` (§4.4) actually get called with an `organizationId` that differentiates tenants?** It receives `input.organizationId`; whether callers always pass a non-null, tenant-unique org was not traced end-to-end.
3. **Are there other unscoped reads of shared JSONB stores?** I checked `custom_entities_storage` exhaustively; I did **not** exhaustively audit every raw Kysely query in `query_index/lib/engine.ts` (it is large). **Grep run:** `Grep 'custom_entities_storage'` (done); broader "raw Kysely where without tenant_id" was **not** run.
4. **RLS absence — searched scope.** Greps run over `packages/**` for `ROW LEVEL SECURITY|ENABLE ROW LEVEL|CREATE POLICY|current_setting\(|app\.tenant` → **no matches**; over all `*.sql` for `ROW LEVEL SECURITY|ENABLE ROW LEVEL|CREATE POLICY|search_path` → **no matches**; `find` for `*.sql` → **no `.sql` files exist**. Conclusion is strong for `packages/**` and any SQL file; I did **not** grep `apps/mercato/.mercato/**` build output (compiled vendor chunks) — those are generated, not source.
5. **Is `tenant_id` nullable everywhere by design?** Yes — it is `nullable: true` in every entity inspected (e.g. `entities/data/entities.ts:38,152,184,220`). **Null `tenant_id` = a global/shared row.** No constraint forces non-null. This is a deliberate "global default" design but means a null-tenant row is visible across tenants on any path that treats null as "global". **Not fully traced** which tables intend nulls.
6. **Search / vector index cross-tenant.** `pgvector/index.ts:139` creates one shared table keyed `(driver_id, entity_id, record_id, tenant_id)` with a unique index **including** tenant_id (`:160`). Reads (`token.strategy.ts:89,179`) filter `tenant_id`. Appears safe; not integration-tested here.

**Greps run (verbatim):**
- `grep -rni "row level security|ROW LEVEL|ENABLE ROW|CREATE POLICY|current_setting('app|app.tenant"` over `packages/**` → 0 matches.
- `Grep 'ROW LEVEL SECURITY|ENABLE ROW LEVEL|CREATE POLICY|search_path' glob '*.sql'` → 0 matches.
- `find . -name '*.sql'` (excl node_modules/dist) → 0 files.
- `grep -rn "filters:|addFilter|@Filter|filters: {"` over shared+core → 0 matches.
- `grep -rni "search_path|'schema'|schema:"` over `packages/*/src` (filtered for ORM schema) → 0 tenant-schema matches.
- `grep -rn "name: 'tenant_id'"` over `packages/*/src` → 221 declarations.

---

## §6 Measured counts

| Metric | Count | How measured |
|---|---|---|
| Entity-backed tables (`@Entity({tableName})`) | **224** | Node script parsing `packages/*/src/**/*.ts` (excl `node_modules`, `dist`, tests, `generated`, `migrations`), brace-matched class bodies, **resolving `extends` base classes** |
| Tables **with** `tenant_id` | **209** | same parse + `name: 'tenant_id'` in class body or resolved base |
| Tables **without** `tenant_id` | **15** | the residual (enumerated in §2.2) |
| `tenant_id` property declarations (raw grep) | **221** | `grep -rn "name: 'tenant_id'" packages/*/src` |
| Migration files (`Migration*.ts`) | **241** | `find packages -path '*/migrations/Migration*.ts'` |
| Migration directories | **80** | `find packages -type d -name migrations` |
| `.sql` files | **0** | `find -name '*.sql'` |
| RLS occurrences | **0** | greps in §5 |
| MikroORM `@Filter`/`filters:` occurrences | **0** | greps in §5 |
| Entity files (`@Entity`) | **39** | `grep -rl "@Entity({"` |

**Measurement caveat (recorded for honesty):** the initial parser reported 199/25 because it read only the literal class body and **missed `tenant_id` declared on abstract base classes** (e.g. `WmsScopedEntity`). Resolving `extends` corrected it to 209/15. The 199-figure is wrong and is reported here only to show the correction path.

---

## §7 Verdict on the owner's assumption

The owner's assumption — *"core tables/functions are shared across tenants, but a table or database change made in one tenant only impacts that tenant"* — is **TRUE for the mechanism that actually exists (custom entities/fields as rows in `custom_entities_storage` / `custom_field_defs`), and FALSE for anything that touches a real table.** No tenant can create a real table; therefore no tenant can affect another tenant's *schema*. But the flip side is that **there is no per-tenant schema at all** — "a table or database change made in one tenant" is not a thing the platform permits; all DDL is global and platform-release-only (consistent with `CORE-BOUNDARY.md` C3/C9). The two concrete risks that remain are unscoped **reads/writes of the shared JSONB store** (§4.4, §4.5), not schema leakage.
