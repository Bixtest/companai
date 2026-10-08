# CRITIC — hostile pass against `FINDINGS.md`

**Date:** 2026-10-08
**Role:** adversary of my own findings. Goal: prove every **safety** claim WRONG, and every **risk** claim overstated, by re-measuring from the files. Where I could not break a claim I say exactly what I tried.

I re-read the same files and re-ran the same greps. Where I disagree with `FINDINGS.md`, I say so and the finding is corrected here.

---

## C1. Safety claim: "custom structures are rows, not DDL, so a per-tenant structure change is inherently isolated."

**Attempt to break it.** I looked for any code path that turns a tenant-supplied custom-entity/field definition into a real `CREATE TABLE` / `ALTER TABLE` / `CREATE INDEX` at runtime.

- `grep -rn "execute(\`CREATE|execute('CREATE|raw(\`CREATE|\.execute(.*CREATE TABLE"` over `packages/**/*.ts` (excl tests/dist) → **0 matches**. ✅ claim survives.
- `ensureStorageTableExists` (`shared/src/lib/data/engine.ts:258-268`) only `SELECT … information_schema.tables` and **throws** if missing. It does not create. ✅
- **BUT I found one real runtime DDL path** the finding already names: `search/src/vector/drivers/pgvector/index.ts:133-165` issues `CREATE TABLE IF NOT EXISTS` and `CREATE UNIQUE INDEX` when the vector driver initialises. **This is not tenant-triggered** — it is driver init, once, global. Table name is a fixed `driver_id`-derived name, not tenant-derived. So it is shared, tenant-scoped by `tenant_id` column. **Claim survives, with the named exception.**

**Verdict:** cannot break "custom structure change = row". The isolation is real for the entity/field path.

---

## C2. Attack on the CRUX: "no per-tenant DDL" — can a tenant force a schema change through the `entities.records.<entityId>` route?

**Attempt.** `upsertCustomEntity` (`entities/lib/register.ts:44-133`) writes a `CustomEntity` row only (`:107` `tem.create(CustomEntity…)`). It never touches DDL. Custom *fields* write `custom_field_defs` rows. **No path from a tenant request to DDL.** ✅

**But** I tried the inverse: can two tenants' custom-entity definitions **collide** in the shared registry? `upsertCustomEntity` scopes by `{ entityId, organizationId, tenantId }` (`register.ts:45`). If `organizationId` and `tenantId` are both `null` (the "global" default), two tenants could each try to define the same `entityId` and land on the **same registry row** (or race, handled at `:120-129`). This is a **shared-global-entity** risk, not a per-tenant DDL leak — but it means "global" custom entities are genuinely shared. **The finding does not over-claim here, but §3.4's "inherently isolated" is only true for `tenant_id`-bearing rows.** A tenant that creates an entity with `tenantId: null` is creating a **platform-global** entity. Corrected wording for `FINDINGS §3.4`: *isolated when `tenant_id` is set; a null-tenant definition is intentionally global and visible to all.* I add this correction.

---

## C3. Attack on §4.4 (HIGH severity, unscoped `custom_entities_storage` read). **I partially break my own finding.**

**Claim in FINDINGS:** `readCustomEntityRecordUpdatedAt` omits `tenant_id`, so tenant A can read tenant B's `updated_at`.

**Re-measure.** Both call sites pass `organizationId: targetOrgId`:
- `records.ts:591-595` (update path) → `organizationId: targetOrgId`
- `records.ts:659-663` (delete path) → `organizationId: targetOrgId`, guarded by `if (!targetOrgId) return … 400` at `records.ts:653`.

And **organization ids are globally unique UUIDs, each belonging to exactly one tenant** (`directory/data/entities.ts:28-34`: `@PrimaryKey uuid` + `@ManyToOne Tenant`). Therefore **an org id already determines the tenant** — the missing `tenant_id` predicate is redundant for these two paths. **My HIGH rating for the single-read path is OVERSTATED.** Corrected severity: **LOW** for `records.ts:126-144` (defence-in-depth gap, no reachable leak given the org guard).

**However** the **batch path** survives the attack and is worse:
- `records.ts:333-340`:
  ```
  .where('entity_type', '=', entityId)
  .where('entity_id', 'in', recordIds)
  ```
  It drops **both** `organization_id` **and** `tenant_id`.
- **Reachability:** the list endpoint (`records.ts:296` `qe.query(...)`) scopes via the query engine (`query_index/lib/engine.ts:1656-1657` filters `tenant_id`), so the **record set** returned to A is A's. But the **`recordIds`** fed to the batch read are A's ids; the batch read then looks them up **without org/tenant**. If tenant B happens to hold a row with the **same `entity_type` + `record_id`**, B's `updated_at` is merged into A's map (keyed by `entity_id`) and returned to A.
- **Can the ids collide?** Record ids are **client-suppliable**: `createCustomEntityRecord` (`engine.ts:317-325`) uses the caller's `rawId` **as-is if it matches the UUID regex**; only non-UUID/blank ids are regenerated. So a malicious tenant can **choose** a record id equal to a victim tenant's record id. Requirement: both tenants must use the **same `entity_id` string** (custom entity ids include a module prefix like `entities:records:foo`, which may be shared/guessable) — plausible.
- **Exposure:** only `updated_at` (a timestamp) leaks, and only if the victim holds a row with that id on a shared entity type. This is a **cross-tenant metadata disclosure + optimistic-lock confusion**, not a data dump.

**Corrected finding (§4.4):** split into two:
- **§4.4a (LOW, defence-in-depth):** `records.ts:126-144` omits `tenant_id`; safe only because org id ⇒ tenant. Should still add `tenant_id`.
- **§4.4b (MEDIUM, reachable):** `records.ts:333-340` omits org **and** tenant; client-chosen UUIDs make a targeted collision possible; leaks `updated_at`. **This is the real one.**

I could NOT fully break §4.4b: I tried to show the record set is tenant-filtered (it is, at query time), but the batch read re-queries the raw store and undoes that filter. Verified by reading the exact lines. **§4.4b stands.**

---

## C4. Attack on §4.5 (UPSERT conflict target omits `tenant_id`).

**Claim:** `engine.ts:350-356` `onConflict(columns: ['entity_type','entity_id','organization_id'])` lets tenant B overwrite tenant A's `doc` when both share the tri-fingerprint.

**Re-measure / break attempt 1 — does the fallback save it?** The fallback (`engine.ts:360-374`) is only reached when the primary throws, and it **does** include `tenant_id`. So the *primary* path is what runs normally. Claim direction correct.

**Break attempt 2 — is the conflict reachable?** For `ON CONFLICT (a,b,c)` Postgres needs a **unique** index on exactly `(a,b,c)`. The **migration** creates that index **non-unique** (`migrations/Migration20251030150038.ts:10`). If the deployed index is non-unique, **the statement errors** and the fallback (tenant-aware) runs — i.e. the leak path would be **dead** and replaced by the safe path. If MikroORM dev-sync created the index **unique**, the leak path is live.

**So §4.5's reachability hinges on a fact I cannot settle from source**: is the deployed index unique? This is exactly open-question #1 in FINDINGS §5. **I must downgrade §4.5 from "medium–high" to "UNPROVEN — conditional on the deployed index."** Two sub-cases:
- If index is **unique**: the tri-fingerprint collision can happen and B overwrites A's `doc`. **Leak real.**
- If index is **non-unique**: the `ON CONFLICT` errors → fallback (tenant-safe) runs → **no leak**, but the entity/migration divergence (§4.6) is confirmed.

**Neither sub-case is verifyable offline. §4.5 stands as a conditional risk with a decisive DB check.**

---

## C5. Attack on "no RLS".

**Attempt to find RLS I might have missed.** I re-ran:
- `Grep 'ROW LEVEL SECURITY|ENABLE ROW LEVEL|CREATE POLICY|current_setting\(|app\.tenant'` over `packages/**` → **0**.
- `Grep 'ROW LEVEL SECURITY|ENABLE ROW LEVEL|CREATE POLICY|search_path'` over `**/*.sql` → **0**.
- `find . -name '*.sql'` → **0 files**.
- Tried synonyms a sneaky implementation might use: I read `shared/src/lib/db/mikro.ts` fully — `driverOptions` sets only `connectionTimeoutMillis`, `idle_in_transaction_session_timeout`, `statement_timeout`, `lock_timeout`, `ssl`. **No `options: -c search_path`, no `SET app.tenant_id`, no `SET ROLE`.** No `set_config(...)` anywhere in `mikro.ts`.
- I could not construct a live RLS policy: there is no `CREATE POLICY` and no `.sql` to hide it in.

**Verdict:** claim "no RLS" **survives**. Residual uncertainty: I did not grep `apps/mercato/.mercato/**` (compiled Next.js vendor chunks). Those are build output of the same sources; a hand-edited RLS in a build artifact is not a plausible product mechanism. **Noted, not material.**

---

## C6. Attack on "tenant filtering is manual, not automatic".

**Attempt to find an automatic filter I missed.** I searched for MikroORM entity filters: `grep -rn "filters:|addFilter|@Filter|filters: {"` over shared+core → **0**. I also checked the ORM init (`mikro.ts:161-202`) — no `filters` key passed. ✅ manual confirmed.

**Attempt to find a repository base class that always scopes.** The scoping is in `CrudFactory` (`factory.ts:1973,2276`) and `QueryEngine` (`engine.ts:501-502`). Both are **opt-out-able** (`tenantField: null`, `omitAutomaticTenantOrgScope`, `columnExists` guard). So "automatic" is conditional. **Claim survives and is precise.**

**One thing I under-stated:** `QueryEngine` **throws** if `tenantId` is missing (`engine.ts:340-343`) — that is a *fail-closed* property for the query path. It strengthens the case that the architecture intends fail-closed. I add it as a mitigating fact.

---

## C7. Attack on the measurement counts (209/15).

**Attempt to break the count by finding more inheritance or decorators my parser missed.**
- Parser resolves one level of `extends` in the **same file** only. Cross-file base classes (e.g. a shared `BaseEntity` imported from another module) would be **missed**. I checked: entity files import from `@mikro-orm/decorators/legacy` and `@open-mercato/shared/lib/json`, not from a shared entity base. The one base I found, `WmsScopedEntity`, is **same-file** (`wms/data/entities.ts:30`). So one-level same-file resolution is adequate **for the files I actually have**.
- **False-negative check:** the raw `grep -rn "name: 'tenant_id'"` gives **221** declarations vs my parser's **209** tables. The 12-difference is expected (some entity files declare `tenant_id` on entities whose `tableName` I attribute once, or duplicate declarations in the same file). I did **not** reconcile the 221↔209 delta line-by-line — **acknowledged gap.** A hand-audit of 12 lines would close it; I did not do it.
- **Could the real "with tenant_id" count be higher than 209?** Yes if some tables get `tenant_id` via a **migration-only** column not reflected in any entity (e.g. added by `ALTER TABLE` later). I did **not** grep migrations for `add column "tenant_id"`. **Acknowledged gap; would only raise 209, not lower it.**

**Verdict:** the **15** list is the load-bearing number, and I verified each of the 15 by reading the file region (junction/global). The 15 stands. The exact 209 is soft (± up to ~12) but direction is: **the vast majority of tables carry `tenant_id`.** Claim survives.

---

## C8. Attack on §4.1 "migrations are global". Can a migration be tenant-scoped?

**Attempt.** Read `commands.ts:372-457`: `runPendingMigrations` loops `resolver.loadEnabledModules()` and applies each module's migrations to `getClientUrl()` (the one URL). No tenant loop, no per-tenant `schema`. ✅ **Cannot break.** A migration is inherently global. This is correct for the model and is the honest reason "a DB change in one tenant" is not a supported operation.

---

## C9. Did I try to construct the concrete tenant-A→tenant-B leak the brief demanded?

**Yes. Three constructions:**

1. **Custom entity definition collision (C2):** A and B both create `entities:records:foo` with `tenantId: null` → same `custom_entities` row. **This is not a leak of A to B** — both asked for a global entity. **Rejected as a leak; accepted as a design footgun.**

2. **`updated_at` collision via list read-back (§4.4b):** A and B share `entity_type`; A crafts a record id equal to a B record id; A lists its records; the batch read (`records.ts:333-340`) matches B's row on `(entity_type, record_id)` and returns B's `updated_at` to A. **Constructed and reachable from source.** This is the **one concrete, source-supported leak** I found. Severity MEDIUM (metadata only; needs same entity type + colliding id).

3. **`doc` overwrite via upsert (§4.5/C4):** A and B share the tri-fingerprint; A upserts; if the index is unique, A's write updates B's row's `doc`. **Constructed, but conditional** on the deployed index being unique — unverifiable offline. Severity **UNPROVEN**.

I could **NOT** construct any leak that crosses tenants via **DDL / schema** — because no per-tenant DDL exists. The schema-isolation claim is the one I could not break.

---

## C10. Corrections this critic pass forces on `FINDINGS.md`

| # | Original claim | Correction after hostile pass |
|---|---|---|
| §3.4 | "inherently isolated by construction" | True only for `tenant_id`-bearing rows; a `tenantId: null` definition is **intentionally global**. |
| §4.4 | "HIGH — unscoped read" | Split: **4.4a LOW** (`records.ts:126-144`, org id ⇒ tenant, safe); **4.4b MEDIUM** (`records.ts:333-340`, drops org+tenant, client-chosen ids → real `updated_at` leak). |
| §4.5 | "medium–high" | **UNPROVEN / conditional** on the deployed `custom_entities_storage_unique_idx` being UNIQUE. Decisive check: `\d custom_entities_storage` on a live DB. If non-unique, the leak path is dead and instead the SQL errors. |
| §6 counts | 209 with tenant_id | ±12 soft (221 raw declarations vs 209 parsed tables); the **15** without is hand-verified and stands. |
| §4.x | unlisted mitigating fact | `QueryEngine` **throws** when `tenantId` missing (`engine.ts:340-343`) — the query path is **fail-closed** by design. |

## C11. What I could not break (and what I tried)

- **"No per-tenant DDL."** Tried: grep for runtime `CREATE/ALTER`; read `ensureStorageTableExists`; read `upsertCustomEntity`. Could not break — only the global pgvector driver creates DDL, and it is tenant-column-scoped.
- **"No RLS."** Tried: grep `packages/**`, all `.sql`, synonyms, read `mikro.ts` driver options. Could not break — nothing exists.
- **"Migrations are global."** Tried: read `runPendingMigrations`; looked for a tenant loop / schema switch. Could not break.
- **"Filtering is manual/opt-out-able."** Tried: grep for `@Filter`/`filters:`; read ORM init. Could not break.

**The structural safety claim of the FINDINGS — a per-tenant structure change is a row and cannot alter another tenant's schema — survived every attack. The only confirmed cross-tenant leak is metadata (`updated_at`), and it lives in a read-back helper, not in the schema model.**
