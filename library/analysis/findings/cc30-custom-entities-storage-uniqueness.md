# CC-30 — `custom_entities_storage` uniqueness: what the upsert actually needs

**Status:** SHIPPED (repo 2 commit `—`, see `JOURNAL.md` for the hash). One migration is
**unapplied on live databases** and must be run before the new uniqueness exists.
**Date:** 2026-10-08
**Trigger:** the §4.5 write-side sibling of CC-28 — recorded in `RESUME-POINT.md` §3 as
"the upsert conflict target omits `tenant_id`".

---

## 1. What the entry said, and what measurement found

The backlog entry described a *missing column*. The measurement found something worse, and then
found that the obvious fix for it is wrong.

The upsert in `packages/shared/src/lib/data/engine.ts` (`createCustomEntityRecord`) issues:

```sql
insert into custom_entities_storage (...) values (...)
on conflict (entity_type, entity_id, organization_id, tenant_id) do update set doc = ..., updated_at = now(), deleted_at = null
```

For that target to be valid, Postgres needs a **unique index on exactly those four columns**.
Measured against the running database (`mercato-postgres-local`, PG 17) — the index set was:

```
custom_entities_storage_pkey       UNIQUE (id)
custom_entities_storage_unique_idx         (entity_type, entity_id, organization_id)   -- NOT unique
```

So **two** faults, not one:

1. The only index omitted `tenant_id`.
2. It was created **non-unique** (`Migration20251030150038.ts:10` uses `create index`, not
   `create unique index`), so it never enforced anything at all.

**Consequence:** the `ON CONFLICT` matched **no constraint**. The engine wraps the statement in a
`try { … } catch { … }` and falls back to a manual UPDATE-then-INSERT, so the failure was invisible —
the fallback made it *look* like it worked. The intended single-statement upsert has never once run
on a real deployment.

## 2. The premise that was FALSIFIED (rule 13)

My first fix was: one **partial** unique index on the four columns, with predicate
`where tenant_id is not null and organization_id is not null`. The reasoning was that
`organization_id`/`tenant_id` are nullable, Postgres treats NULLs as distinct in a unique index, and
a partial index restores one-row-per-scope for the null shapes.

**A hostile-critic pass disputed it. It was right.** Measured directly, in a scratch schema on the
live PG 17:

| index form | `ON CONFLICT (4 cols)` (the shipped statement) | two NULL-scope rows collide? |
|---|---|---|
| **plain** unique, 4 cols | **resolves** — 1 row, updated in place | **no** (2 rows survive) |
| **partial** unique, 4 cols + predicate | **ERROR**: `there is no unique or exclusion constraint matching the ON CONFLICT specification` | yes (rejected) |

The rule, measured and not assumed: **a bare `ON CONFLICT (cols)` is never matched against a partial
index.** Postgres infers the index from *statement* predicates only; it does not look at the values in
`VALUES`. Supplying the predicate (`… on conflict (cols) where <same predicate>`) does work, but that
restructures the engine's SQL and still leaves the null shapes unreachable by one statement.

So the two properties are **mutually exclusive on a single statement**: a plain index satisfies the
upsert but cannot enforce the null shapes; a partial index enforces the null shapes but cannot satisfy
the upsert.

**The correction, applied everywhere it had been copied:** the primary index is **plain** (so the
upsert resolves), and the three null-scope shapes get **partial** indexes of their own (so duplicate
`INSERT`s are still rejected). Four indexes, each covering exactly one scope shape. No row matches two.

## 3. The shipped shape

`Migration20261009090000.ts`:

```sql
drop index if exists "custom_entities_storage_unique_idx";                                    -- legacy: non-unique, no tenant_id
create unique index "custom_entities_storage_scope_uq"  on custom_entities_storage (entity_type, entity_id, organization_id, tenant_id);                                                            -- PLAIN: the upsert target
create unique index "custom_entities_storage_tenant_uq" on custom_entities_storage (entity_type, entity_id, tenant_id)              where tenant_id is not null and organization_id is null;       -- PARTIAL
create unique index "custom_entities_storage_org_uq"    on custom_entities_storage (entity_type, entity_id, organization_id)        where tenant_id is null     and organization_id is not null;   -- PARTIAL
create unique index "custom_entities_storage_global_uq" on custom_entities_storage (entity_type, entity_id)                          where tenant_id is null     and organization_id is null;       -- PARTIAL
```

Declared on `CustomEntityStorage` in `packages/core/src/modules/entities/data/entities.ts` — the
primary via `properties` (plain), the other three via `expression` (the codebase's idiom; see
`perspectives/data/entities.ts`). Recorded in `.snapshot-open-mercato.json`.

### This respects the owner's confirmed isolation decision

`RESUME-POINT.md` §4.2 records, owner-confirmed: single DB, single schema, nullable `tenant_id`,
isolation in the **app layer**, **no per-tenant DDL**. These are four global indexes on one shared
table. No per-tenant DDL, no schema-per-tenant, no RLS.

## 4. Proof on the live database

Executed against PG 17 in a throwaway schema, using the migration's exact statements:

- **Shipped upsert, both scope columns non-null** → `INSERT 0 1`, twice → **1 row, doc updated in
  place**. (Before: `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT
  specification`.)
- **Two tenants sharing one `organization_id`, same `entity_id`** → **2 rows**, one per tenant. This
  is the overwrite the plain 4-column index prevents; with the legacy index neither row would have
  been constrained and the second write would have replaced the first tenant's document.
- **Global scope (`null`,`null`) duplicate INSERT** → **rejected**:
  `duplicate key value violates unique constraint "custom_entities_storage_global_uq"`. The partial
  index does its job for the shape the plain index cannot reach.

The probe schema was dropped afterwards; `custom_entities_storage` on the real database was verified
untouched (0 rows, original two indexes still present).

## 5. The second defect fixed in the same slice

A reviewer pass over the *read* side surfaced a real, separate defect that the §4.5 entry had not
named. In `query_index/lib/engine.ts`, `isCustomEntity` probes two **shared** tables
(`custom_entities`, `custom_entities_storage`) with **no tenant filter**:

```
where entity_id = ? and is_active = true          -- custom_entities
where entity_type = ? limit 1                     -- custom_entities_storage
```

Classification decides whether a query routes to doc storage. If tenant **A** has a storage row and
tenant **B** has none, B's query still routes to doc storage; the scoped list query inside
(`queryCustomEntity`, which *does* filter `tenant_id = B`) then returns **zero rows** — even when B
has records on the ORM/index path. Tenant A's data decides tenant B's reads.

Fixed by threading `opts.tenantId` into both probes and into the classification cache key
(previously keyed by entity alone, so whichever tenant classified first poisoned the cache for all).
Closed. Explicitly noted: `forceCustomEntityStorage` short-circuits the classifier, so the records
API (which sets it) was never exposed to this — the fix protects the other callers.

## 6. Hostile-critic rounds and what each one cost

| round | subject | outcome |
|---|---|---|
| 1 | the first fix (one partial index) | **FOUND**: the conflict target could not match a partial index; the snapshot entry shape was wrong. Both were real. |
| 2 | the redesign | **FOUND**: two follow-ons (§7). The conflict-target reasoning itself now measured, not argued. |
| 3 | final shape | see `JOURNAL.md` for the register |

Both round-1 findings were reproduced by hand against the live database before being accepted — a
critic's claim is not a finding either.

## 7. Open — the owner's call, not mine

1. **The upsert's `try/catch` fallback is now reachable-but-redundant.** On a migrated database the
   primary statement resolves, so the fallback only runs for the null-scope shapes. It performs a
   manual UPDATE-then-INSERT with no conflict target; if two writers race on a null-scope row the
   plain INSERT now raises a duplicate-key error (the partial index enforces it) and surfaces a
   **500** instead of an upsert. No shipped caller reaches a null scope — every API path rejects a
   missing org (`if (!targetOrgId) return 400`) — so this is not a live leak. **OPEN — needs you**:
   either delete the fallback (the primary index now covers the shipped path) or leave it as a
   safety net for unreachable shapes.
2. **`updateCustomEntityRecord` inserts with no conflict target** on its not-found branch
   (`engine.ts`, after the scoped UPDATE returns 0). Unchanged by this slice. **OPEN — needs you**:
   whether that branch should also target the new index.
3. **The migration is unapplied on live databases.** The new uniqueness does not exist until
   `yarn db:migrate` runs. Until then, behaviour is exactly as before (fallback path).

## 8. What I could NOT verify on this host

- Whether any **live** database already holds duplicate rows that would make `create unique index`
  fail. The local database holds **0** rows in `custom_entities_storage`; nothing in the repo
  pre-checks or de-duplicates. A production database with historical duplicates would need a
  de-dup step first — **nothing handles it**.
- Whether `yarn db:generate` emits an empty diff. The snapshot shape was corrected to what
  `DatabaseTable.addIndex` provably builds (`columnNames: []`, `composite: false`, `unique: false`
  for an `expression` index — the `unique` field is literally `type !== 'index'`), checked against
  the `perspectives` reference entries. The generator itself was not run.
