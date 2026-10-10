# PLAN — **CC-45: a marked (encrypted) field never leaves in an export in clear**

**Written:** 2026-10-10 · **Task:** `COMPLETION-CALLBACKS.md` **CC-45** (the export leg of
`platform_points.md` **row 14**, `P4` classification leg) · **Status:** IN PROGRESS
**Protocol:** the owner's 6-step work protocol — (1) study refs → (2) pick points → (3) write the combined
requirement → (4) prove prerequisites flawless **in code** → (5) trace impact + update plans → (6) execute
under the TOTAL quality protocol (separate-agent hostile critic, RED-then-GREEN mutation with md5-verified
restores, two-route re-measure, green gate, then docs).

**Owner standing rules in force:** rule 0 (the code is the only evidence) · rule 9b (challenge the task
before executing) · rule 11 (a decision that is the owner's is not the assistant's to close) · rule 13
(when a measurement falsifies a premise, correct it **everywhere it was copied**) · rule 8 (schedule the
partial build in `COMPLETION-CALLBACKS.md` in the same change).

---

## 1. The task, and where it comes from

**`COMPLETION-CALLBACKS.md` CC-45 (verbatim, the requirement):**

> **Row 14 (`P4` classification leg) — the `never exported by accident` leg is OPEN.** … sensitive
> fields/secrets ARE marked (a `ModuleEncryptionMap`, `shared/src/modules/encryption.ts`; **15 modules**
> declare `defaultEncryptionMaps` …) and the platform DOES treat them specially (a MikroORM subscriber
> encrypts at rest / decrypts on read under a per-tenant DEK — `TenantDataEncryptionService` …).
> **What is NOT enforced:** no **export** path consults the map. `shared/src/lib/crud/exporters.ts` is
> classification-agnostic … and its callers (`audit_logs/api/audit-logs/actions/export/route.ts`,
> `entities/api/records.ts`, `entities/lib/entitiesCsvExport.ts`) do not filter encrypted fields.
> So a marked field exports **in clear**.
>
> **Check on completion:** (1) every export serializer/caller consults `getEncryptedFieldNames` for the
> entity it is exporting; (2) a marked field is either omitted or written as a **masked/redacted** token
> (the design choice is the owner's: omit vs mask); (3) an export of an unmarked field is **byte-unchanged**;
> (4) the audit-log export path is included (its own payload columns are marked).

**`platform_points.md` row 14** (`P4` classification) carries the same leg: *"marked fields never exported
by accident."* The other two legs (marked-at-rest, never-logged) are already ✅/PARTIAL and are **not** in scope.

---

## 2. Fact-check — step 4: what the code ACTUALLY contains (re-measured 2026-10-10)

Per rule 0b the row's premise is re-measured from the source, not trusted. **Two of the row's three named
call sites are wrong** (they cannot leak a marked field); the real leak surface is one shared funnel.

### 2a. Every production `serializeExport` caller, and whether it can leak

```
$ grep -rn "serializeExport\|from '.*exporters'" --include=*.ts --include=*.tsx packages/ | grep -v __tests__
```

| # | Site | What it serializes | Can it leak a marked field? |
|---|------|--------------------|------------------------------|
| 1 | `shared/src/lib/crud/factory.ts:1842` (query-engine branch) | real tenant rows — `prepareExportData(exportItems, opts.list)` | **YES** |
| 2 | `shared/src/lib/crud/factory.ts:2044` (ORM-fallback branch) | real tenant rows — same `prepareExportData` | **YES** |
| 3 | `core/.../entities/api/records.ts:409` | custom-entity records (`viewItems`/`fullItems`) | **YES** |
| 4 | `core/.../audit_logs/api/audit-logs/actions/export/route.ts:239` | audit **metadata** (`when/user/action/field/oldValue/newValue/source`) | **NO** — no entity data row, no `entityId` to resolve a map against; `field` is a field *name*, `old/new` are already-formatted change values |
| 5 | `core/.../entities/lib/entitiesCsvExport.ts:30` | the entity **metadata listing** (`entityId/label/source/count/showInSidebar`) | **NO** — never serializes a data row |
| 6 | `ui/src/backend/DataTable.tsx:768` | client-side rows already in the browser | **out of scope** (client) |

→ **Row 14's sentence "its callers … do not filter encrypted fields" is true but misleading**: sites 4 and 5
have no data field to filter. The real surface is **1, 2, 3**. *(Rule 13: the row is corrected in the
same change — §7.)*

### 2b. The single funnel, and the fix point (rule 9b — challenged, then chosen)

`prepareExportData(items, list)` (`factory.ts:368`) is called from **exactly** sites 1 and 2 and nowhere else:

```
$ grep -n "prepareExportData(" factory.ts
368:function prepareExportData(...)        ← definition
1839:   : prepareExportData(exportItems, opts.list)
2041:   : prepareExportData(exportItems, opts.list)
```

It **already receives `opts.list`** — which carries `entityId` — and **already returns a `PreparedExport`**.

**Chosen fix point: `prepareExportData`.** One edit covers sites 1+2, needs **no type change**, and leaves
`serializeExport` a pure function. This is *cleaner* than either option the row names (per-site filtering, or
threading a new field through `PreparedExport`) — the row itself says "decide at build time (rule 9b)".
Site 3 (`records.ts`) builds its rows inline and gets its own call.

### 2c. The service and the reusable precedent — copy it, do not invent

- **Contract (measured live):** `TenantDataEncryptionService.getEncryptedFieldNames(entityId, tenantId,
  organizationId)` → `Promise<string[]>` (`shared/src/lib/encryption/tenantDataEncryptionService.ts:339`);
  returns `[]` when disabled (line 344). **This is exactly the "which fields are marked" answer.**
- **Container key (measured):** `tenantEncryptionService` — the exact key the query engine already resolves
  (`core/src/modules/query_index/di.ts:25` and `:50`), via a `try { container.resolve('tenantEncryptionService') }
  catch { return null }` resolver.
- **Reusable precedent:** `shared/src/lib/query/encrypted-sort.ts` already solves "read the map at runtime":
  - `QueryEncryptionService` is a **structural** interface (`getEncryptedFieldNames?`, `isEnabled?`) — not a
    hard class dependency;
  - `resolveEncryptedSortFields()` returns an **empty set** when the service is absent **or** `isEnabled()`
    is false;
  - `fieldNameCandidates(field)` handles **snake_case / camelCase / `cf:`** variants — the map may name a field
    differently from the export column.
- **`ctx.container.resolve(...)`** is the established convention in `factory.ts` (20+ uses: `accessLogService`
  @706, `rbacService` @1146, `queryEngine` @1679, `em`, `cache`, …). No new pattern is introduced.

**Key consequence:** encryption **disabled ⇒ empty set ⇒ export byte-unchanged**. That *is* CC-45 check (3).

---

## 3. The combined requirement (step 3 — what will be true when this is done)

1. **The funnel filters.** `prepareExportData` resolves the marked-field set for `opts.list.entityId` and, for
   each export column whose field is marked, writes a **mask token** instead of the value.
2. **Mask, not omit** (the owner's call, rule 11). Default **mask** (`'***'`); the owner may override to omit.
   *Why mask is the sensible default:* the column and its header stay in place, so a downstream spreadsheet
   consumer does not silently get shifted columns; it is trivially reversible to omit.
3. **Disabled ⇒ no change.** When `tenantEncryptionService` is absent or `isEnabled()` is false, the set is
   empty and the export is **byte-identical** to today.
4. **Custom entities are covered.** `records.ts:409` masks its own marked fields the same way.
5. **Site 3 is the exception that proves the rule.** `audit_logs` export and `entitiesCsvExport` are left
   **unchanged on purpose** — they carry no entity data fields (measured §2a). Corrected in the row text.
6. **Nothing else moves.** `serializeExport` stays pure and signature-unchanged; no `PreparedExport` shape change.
7. **Pinned by a test** that fails if a marked field ever appears raw, plus a **RED-then-GREEN mutation**.

### Out of scope (measured, recorded, NOT fixed here — rule 9a)
- **`data_sync/workers/sync-export.ts`** does **not** go through `serializeExport` — it delegates to
  `dataSyncEngine.runExport(...)`, a separate writer. Whether *that* masks marked fields is **not measured**
  and is **not** part of CC-45's row. → recorded as a new open item (§7), not silently folded in.
- The `never-logged` leg (logger redaction) — a *different* row-14 leg, already PARTIAL. Not in scope.

---

## 4. Impact trace (step 5)

- **`shared/src/lib/crud/factory.ts`** — `prepareExportData` becomes `async`, gains an optional service
  resolver param; the two call sites `await` it. **Behavioural blast radius:** every module list route's
  `?format=` export. Mitigated by `enabled=false ⇒ empty set`.
- **`shared/src/lib/crud/exporters.ts`** — **unchanged** (pure).
- **`core/.../entities/api/records.ts`** — the export branch gains the same mask step.
- **Tests:** a new `factory` export test + a `records` export test; existing exporter tests must stay green.
- **Docs (same change):** `COMPLETION-CALLBACKS.md` (CC-45 row deleted, row-14 note), `platform_points.md`
  (row 14 leg), `JOURNAL.md` (CC-45 block), `BACKLOG.md`, `HANDOVER.md`, `LESSONS.md` if a new trap is hit,
  and **THE ONE NUMBER re-derived** (rule 8 / §L `derive-counts`).

---

## 5. The one owner decision (rule 11 — flagged, NOT closed by me)

**Omit the marked column, or mask its value?** The row says this is the owner's call. **Default taken: MASK**
(keeps the export usable; headers stay aligned). If the owner prefers omission, the change is one line in the
mask helper → drop the column instead. **Left open in `NEEDS-YOU.md`; not recorded as settled.**
