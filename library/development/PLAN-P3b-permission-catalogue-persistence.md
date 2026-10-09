# PLAN — `P3b` / `M3e`: the permission rules are **stored**, not just in memory

**Written:** 2026-10-09. **Author:** the agent. **Status:** 🟡 **WRITE HALF BUILT** (this plan is the
record); the **READ half is scheduled** as `CC-43`.
**Parent:** `SD-1` / `S2` (dictionary §C.1), [`PLAN-SD-1.md`](PLAN-SD-1.md) §5.4 + §10.1,
`platform_points.md` row 9 (`P3b` / `M3e`) + §B `P3b` + §D `M3e`.

---

## 1. The task, in the sources' own words

> **`platform_points.md` row 9:** *"The permission rules are **stored** (not just in memory) and read
> back by the running app."* — IDs `P3b` / `M3e`, status `☐`.

> **The `M3e` note that this plan corrects (rule 13):** *"Persisted for runtime surfaces *(LEFT —
> in-process; a durable row waits on `G-04`, since a migration is unprovable on this host)*."*

---

## 2. The relevant `platform_points` (step 2 — picked, not guessed)

- **Row 9 (`P3b`/`M3e`)** — the row itself: *stored, and read back by the running app.*
- **§B `P3b`** — the same fact in the `P1`–`P18` register: *persisted for runtime surfaces + consumed
  by a write.*
- **§D `M3e`** — the catalogue item: *persisted for **runtime** surfaces.*
- **S2 / §C.1** — the structure-change gate: a new table/column forces the permission question; the
  catalogue is the declaration of *what can be permitted*.
- **S5** — *one engine, never a rival.* Grants stay in `role_acls.features_json`; this is a **registry**,
  not a second permission engine.
- **Rule 0** — every claim carries an observation; docs are not evidence, only the code is.
- **Rule 8** — a partial build is **scheduled** (gap + prerequisite + callback), not merely noted.
- **Rule 9b** — challenge the task before executing it.
- **Rule 13 / 14b** — a falsified premise is corrected **everywhere** in the same change.

---

## 3. The requirement (task definition + points, combined — step 3)

Make the permission catalogue's runtime surfaces **durable**: a surface that appears at runtime (a
custom entity, a custom field) must survive a restart and be readable by the running app — *"stored, not
just in memory"*, with the grants themselves untouched (S5).

Concretely, two halves:
- **WRITE half** — a durable table + the code that **judges a structure change** records the surface it
  judged (so the table is populated by real work, not by tests).
- **READ half** — the running app hydrates the catalogue from **declarations + the DB** and reads it back
  through a live consumer.

---

## 4. Fact-check (step 4) — and the challenge to the task (rule 9b)

**What was actually there (measured in code first):**

- The catalogue (`packages/shared/src/lib/permissions/catalogue.ts`) keeps its registry in a
  **process-local `Map`** (`const registry = new Map(...)`), populated through `declareSurfaces` /
  `recordSurface`, read through `listPermissionSurfaces` / `getPermissionSurface` / `hasPermissionSurface`,
  cleared by `clearPermissionCatalogue`.
- **The runtime registry has zero live consumers** — `grep` finds only its *constants* (`STRUCTURAL_VERBS`,
  the `PermissionSurface` type) used elsewhere. The `Map` is populated by **tests only**.
- The **live runtime permissions already work**: `rbacService` reads `role_acls.features_json` from the
  **database at request time** (`rbacService.ts:338, 404, 444`). So *"permissions are read back by the
  running app"* is **already true for the enforced ACLs**.
- The app bootstrap (`apps/mercato/src/bootstrap.ts`; `instrumentation.ts:register()` is a no-op) is
  **synchronous and has no tenant.**

**The challenge (rule 9b) — the correction the plan had to absorb before writing:**

1. **The literal target was wrong.** *"Persist the catalogue `Map`"* on its own would be **storage with
   no reader** — a "build it because it is on the list" move. The honest reading of row 9 is to give the
   catalogue a durable table **and the one live consumer that needs it** (the boot hydration that reads
   it back). This is why the task is split into a write half and a read half.
2. **The `M3e` premise was false on both counts** (rule 13 / 14b): (i) `G-04` is *"the data-axis
   authorization layer (may this actor read this row, for this purpose?)"* — it has **nothing to do with
   storing surfaces**; (ii) a migration **is** provable — `Migration20261009090000` was written, applied
   and read back on 2026-10-09, and `mercato-postgres-local` runs Postgres 17. **Both halves of that note
   are false and are corrected in this change.**

**The re-shaped requirement:** build the **durable write half** first (it has real callers today), then
build the **read half** where a tenant is known — and if that hook does not exist yet, **schedule it**
(rule 8) rather than hydrate a registry nothing reads.

---

## 5. What was built

### 5.1 The table (migration `Migration20261009205000.ts`)

`permission_surfaces`: `id` uuid pk (default `gen_random_uuid()`), `tenant_id` uuid not null,
`surface_id` text not null, `kind` text not null, `owner` text not null, `source` text default
`'recorded'`, `feature_prefix` text null, `created_at` / `updated_at` / `deleted_at` timestamptz, plus a
**partial unique index** `permission_surfaces_tenant_surface_uidx on (tenant_id, surface_id) where
deleted_at is null`. `up()` / `down()` are symmetric. `up()` creates the table **and** the index; the
index predicate (`deleted_at is null`) is the upsert target *and* matches the service's live-row
predicate exactly.

### 5.2 The entity (`auth/data/entities.ts`)

`PermissionSurfaceRecord` (`@Entity({ tableName: 'permission_surfaces' })`) — the ORM mirror of the
table, with the same field names.

### 5.3 The service (`auth/services/permissionSurfacesService.ts`)

- `SURFACE_PERSIST_FAILURES = ['invalid_surface', 'no_tenant']` + `SurfacePersistOutcome`.
- `persistRecordedSurface(em, { tenantId, surface })` — **upsert** on `(tenant_id, surface_id)` for live
  rows; a `declared` surface is not written (code is its source of truth).
- `loadPersistedSurfaces(em, tenantId)` — the tenant's live rows, `[]` on any failure.
- `hydratePermissionCatalogue(em, tenantId)` — `recordSurface` each row into the live catalogue;
  **additive, idempotent, non-destructive**, swallowing a read failure to `0`.
- **Fail soft, on purpose:** a persistence failure never throws into the caller's write path — a registry
  row must not take the business operation down with it (contrast the *decision* path, which fails closed).

### 5.4 The wiring — all 7 real callers

| # | Caller | File |
|---|---|---|
| 1 | entities field create | `entities/lib/field-definitions.ts` |
| 2 | the **batch** definitions route | `entities/api/definitions.batch.ts` |
| 3 | HTTP reactivation (definitions) | `entities/api/definitions.ts` |
| 4 | HTTP reactivation (restore) | `entities/api/definitions.restore.ts` |
| 5 | `ensureCustomFieldDefinitions` / `upsertCustomEntity` | `entities/lib/register.ts` |
| 6 | the `add-field` CLI | `entities/cli.ts` |
| 7 | the structure-change gate (metadata → after-write recorder) | `entities/data/guards.ts` |

`runStructureChangeGate` now returns `metadata: { permissionDecision, surfaces }`; `writeGateDecisionGrant`
persists `readGateSurfaces(input.metadata)` fail-soft before the grant.

### 5.5 What is NOT built — the read half (scheduled, `CC-43`)

`hydratePermissionCatalogue` / `listPermissionSurfaces()` have **no live consumer**; the bootstrap is
synchronous with no tenant. Item (b) *"the app hydrates the catalogue at boot"* and the second clause
*"read back by the running app"* are therefore **not met** — the remainder is **scheduled** (`CC-43`:
gap = the read side; prerequisite = a tenant-aware boot/request hook; callback = hydrate declarations +
DB there and give `listPermissionSurfaces()` a live reader, proven end to end).

---

## 6. Verification

- **Affected suites:** entities + the service — **48 suites / 419 tests** green.
- **Full `core` suite:** **638 suites / 5600 tests** green.
- **`tsc --noEmit`:** `core` exit 0.
- **Mutations (6, RED-then-GREEN, every restore md5-identical):** M1 drop the surfaces arg; M2/M3 drop
  the tombstone predicate; M4 drop surfaces from guard metadata; M5 batch stops persisting; M6 batch uses
  the stale tenant.
- **Hostile-critic pass (separate agent)** found three real defects + a scope gap, **all fixed**:
  - **D1 (HIGH)** — `{ filters: { softDelete: false } }` is **inert** (no such filter is registered
    anywhere → a soft-deleted tombstone matched the upsert lookup while the partial index permitted a
    second live row). **Fixed** by writing `deletedAt: null` explicitly in both the upsert lookup and the
    boot read, plus a defensive clear; pinned by a 3-test tombstone block.
  - **D2 (MEDIUM)** — the batch route's persistence had **zero coverage**. **Fixed** with a new describe
    block.
  - **D3 (MEDIUM)** — the "never downgrades a declared surface" test was **tautological**. **Fixed** so
    it fails if hydration is inert.
  - **scope gap** — the batch persisted under the **stale `auth.tenantId`** while rows land under
    `scope.tenantId`. **Fixed** to `scope.tenantId ?? auth.tenantId`, with a mismatch test.
- **Live-DB round-trip** (`mercato-postgres-local`): table + index measured back; record → boot read sees
  it → duplicate refused by the index → upsert-on-conflict works → soft-delete leaves the live read →
  re-appearance inserts a fresh live row → cleanup 0 rows.

---

## 7. Corrections made in the same change (rule 13)

The false `M3e` premise was corrected **everywhere it was copied**: `platform_points.md` (§B `P3b`,
§D `M3e`, row 9), `permission-decision-grant.ts`, `Migration20261009205000.ts`'s header, and four sibling
files that had copied the same claim (`core-boundary/core-objects.ts`, `user-function/document.ts`,
`business-widget/document.ts`, `business-widget/registry.ts`) plus the `permission-decision-grant.test.ts`
header. **The deferral recorded in those files is real; the *reason* they gave (unprovability) was not.**
A migration here is provable; the deferrals are **shape/timing** decisions.

---

## 8. The remainder — scheduled, not claimed (rule 8)

- **`CC-43`** — the catalogue's **read side**: hydrate at a tenant-aware hook + a live consumer of
  `listPermissionSurfaces()`. Row 9 stays **🟡** until it lands.
- **`CC-20`** — a **field** surface's records have an enforcement consumer (unchanged; a sibling of this
  row, not part of it).
- **`CC-7`** (in [`PLAN-SD-1.md`](PLAN-SD-1.md) §10) — the older *in-process* note; superseded on the
  **write** side by this plan, still open on the **read** side (now `CC-43`).
