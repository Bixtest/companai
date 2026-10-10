# PLAN — `CC-49`: the customer **tasks** table leaks marked fields through **aliases**

**Written:** 2026-10-10. **Status:** requirement recorded; **build blocked on the owner's `NY-18` ruling**
(rule 11 — the fix *shape* is the owner's call; my recommendation is **B**, and it is recorded below).
**Parent:** row 14 (data classification — see `platform_points.md`). **Sibling:** `CC-48`
(`PLAN-CC-48-client-view-export-leak.md`) and `CC-45` (the server-side export mask).

---

## 1. What the owner asked for (the requirement, quoted)

Row 14 (`platform_points.md`, "the platform must classify data: a marked field must never leave the
platform in clear, including through an export"). `CC-45` closed the **server** export leg; `CC-48` closed
the custom-entity **records page** browser leg. The `CC-48` hostile critic then found a **second,
differently-caused** hole:

> the **customer tasks** table ("Work plan → Tasks → Export") builds its file **in the browser**, and its
> rows carry `todoTitle` / `todoDescription` / the customer's `displayName` — which **alias** the marked
> fields `customer_interaction.title` / `.body` and `customer_entity.display_name`.

This is **`CC-49`** and it is a **real, still-open leak** — recorded in `NEEDS-YOU.md` as `NY-18`.

## 2. Measured fact-check (rule 0b — re-proved in code, 2026-10-10, before writing any fix)

Every row below was read from the file named, at the line named. Re-measured this session; it reproduces
the critic's finding.

| # | Claim | Where I looked | What it says | Verdict |
|---|---|---|---|---|
| 1 | The tasks table builds its export **in the browser** | `packages/core/src/modules/customers/components/CustomerTodosTable.tsx:159-213` | `buildPreparedExport(...)` + `prepare: async () => ({ prepared, filename })` for both `view` and `full` — the file is assembled client-side | ✔ leaks |
| 2 | The exported columns are the **aliases** | same file `:105-157` (`viewExportColumns` is built from `columns`) | columns are `customer.displayName`, `todoTitle`, `todoIsDone` → the projection carries `todoTitle` and `customer.displayName` | ✔ aliases |
| 3 | Those aliases are set at the **read site** from the marked fields | `packages/core/src/modules/customers/lib/todoCompatibility.ts:603,610` (`mapInteractionRecordToTodoRow`) | `todoTitle: interaction.title ?? null` · `todoDescription: interaction.body ?? null` | ✔ aliased |
| 4 | The **true** fields are marked | `packages/core/src/modules/customers/encryption.ts:31-56` | `customer_interaction` marks `title`, `body`; `customer_entity` (line 22) marks `display_name` | ✔ marked |
| 5 | The mask keys on the **canonical true name**, never the alias | `packages/shared/src/lib/crud/export-encryption.ts:52-58,130-137` | `canonicalExportFieldName('todoTitle')→'todotitle'`, but the marked set holds `'title'`/`'body'` → **no match** → the value is emitted in clear | ✔ no match |
| 6 | The tasks route has **no** server export mode | `packages/core/src/modules/customers/api/interactions/tasks/route.ts` | GET returns `NextResponse.json(...)` only; no format / download branch | ✔ absent |

**Conclusion (two routes).** The leak is real: route 1 = the five code links above, read end-to-end;
route 2 = the `CC-48` hostile critic **and** a separate verifier agent both reproduced it independently.
The mechanism is **aliasing**, not the browser per se — which is exactly why it survived `CC-45` (server)
and `CC-48` (records page).

## 3. The chosen fix — **Option B: give the tasks route a server export mode** (owner's `NY-18` pick)

**What B changes.** The tasks page stops assembling the file in the browser. Its "Export" buttons open a
**server URL** (like the records page now does after `CC-48`), and `route.ts` gains an export mode: when the
request carries `format=…`, it resolves the same rows it already resolves, projects them to the requested
columns, runs them through the **same** `applyEncryptedFieldMask` funnel `records.ts` uses, and returns a
download `Response`. The mask then sees the **aliased** column names (`todoTitle`, …) and must be told what
those alias to — so the fix passes an **alias→true-name** mapping into the mask, or (simpler and safer)
masks by the **canonical alias** directly.

**Why B and not A.** A (blank in the browser) would tell the browser **which columns are secret** — names,
never values, but still a disclosure the records page no longer makes; B reveals nothing new and reuses the
pattern the owner already approved in `NY-17`. **C** (hide the column) was rejected already for `NY-16`.

**Cost.** A small amount of new server code: the tasks route has no file-download branch today (link 6).

## 4. Combined requirement (what "done" must satisfy — the acceptance test)

- **R1** — The tasks page's **view** and **full** exports are served by the server (`getUrl`, not `prepare`);
  the page contains **no** browser-side `serializeExport` / `prepare:` export path.
- **R2** — A task row's `todoTitle` (← `customer_interaction.title`) is **masked** (`***`) in any exported
  format; never the clear value. Same for `todoDescription` (← `.body`) **if it is an exported column**.
- **R3** — The customer `displayName` column (← `customer_entity.display_name`) is **masked** likewise.
- **R4** — When encryption is **off**, or the entity is **unmarked**, the export is byte-unchanged
  (fail-open to no-change — mirrors `CC-45` check 3).
- **R5** — A **map read error** fails **closed** (mask everything) — mirrors `CC-45`.
- **R6** — The projection (`exportColumns`) is honoured: an unlisted column is not emitted at all.

## 5. Impact trace (who else touches this path)

- **`CustomerTodosTable.tsx`** — the only caller of the tasks export. **Measured (step 1):** the component
  is mounted exactly once, at `packages/core/src/modules/customers/backend/customer-tasks/page.tsx:2,8`.
  The dashboard `customer-todos` widget
  (`widgets/dashboard/customer-todos/widget.client.tsx`) renders its own rows and has **no** `exporter`,
  `prepare` or `getUrl` (grep: zero hits) — so it is **not** a second leak surface. One surface, one fix.
- **`route.ts`** — gains the export branch; its JSON branch must stay byte-identical for the list call.
- **`todoCompatibility.ts`** — read only; the aliases are set here and are the thing being masked.
- **`export-encryption.ts`** — shared; the alias handling must be **additive** (an unmarked/aliased export
  unchanged), so `CC-45`/`CC-48` behaviour cannot regress.

## 6. Evidence plan (rule 10 step 4 quality protocol, run at build time)

1. **Prerequisites proven in code FIRST** — re-read links 1–6 above at build time (they are recorded here;
   re-confirm before editing).
2. **Tests** — a new route test (`tasks.export.cc49.test.ts`): masked alias never in clear (R2/R3), mask
   off ⇒ unchanged (R4), map read throws ⇒ fail-closed (R5), projection honoured (R6); plus a static guard
   on the page (no `prepare:`, uses `getUrl`, sends `exportColumns`).
3. **RED-then-GREEN mutations** (md5-verified restores): disable the alias mask → RED; drop the projection
   → RED; revert the page to `prepare` → RED.
4. **Hostile critic (separate agent)** — its only job is to break R1–R6.
5. **Two-route re-measure** — the leak is gone by two independent instruments.
6. **Green gate + `tsc --noEmit`** on the touched packages.

## 7. Rule-13 corrections carried from `CC-48`

When this leak was first mis-scoped, the false claim "the tasks table cannot leak" (I had checked a
nonexistent `customer_todo` entity instead of the `customers:customer_interaction` the code reads) was
corrected in `platform_points.md`, `BACKLOG.md`, `HANDOVER.md`, `COMPLETION-CALLBACKS.md` and `NEEDS-YOU.md`
(`NY-18`). Banked as **`LESSONS.md` L102**. Row 14 was deliberately left **🟡** rather than falsely ✅ while
this hole survives.

## 8. Hostile-critic findings (2026-10-10) — 3 REAL, all fixed before commit

The mandatory separate critic found three real defects in the **first draft** of this fix; all three were
reproduced by me from the code before fixing (rule 0).

- **`H1` — CRITICAL: the mask ran with the wrong entity id, so it was a no-op in production.** The draft
  passed `CUSTOMER_INTERACTION_TODO_ADAPTER_SOURCE` (`'adapter:todo'`, a row **source tag**) as the
  entityId to `resolveExportEncryptedFields`. The encryption map is seeded under
  `'customers:customer_interaction'` (`ce.ts:43`, `encryption.ts:48`), and `getEncryptedFieldNames`
  queries `where entity_id = ?` (`tenantDataEncryptionService.ts:224`). So the marked set came back
  **empty** and **nothing was masked**. The draft's own route test passed only because its mock ignored
  `entityId` — a test that could not fail (L1/L101). **Fix:** pass `CUSTOMER_INTERACTION_ENTITY_ID`
  (already exported from `interactionCompatibility.ts:3`).
- **`H2` — REAL: the customer `displayName` column was blank, and the un-projected `customer` object
  leaked the name.** `serializeCsv` reads `row[col.field]` — a **flat** key
  (`exporters.ts:88`). The row nests the name under `customer.displayName`
  (`todoCompatibility.ts:620`), so the projected `customer.displayName` column resolved to `undefined`
  (blank, not the secret); and with no projection, `ensureColumns` derived a `customer` **object**
  column whose value serialized the whole nested object — `Secret Customer Name` **in clear** (the alias
  map covers `displayName`, not the `customer` object). **Fix:** shape the exported rows to the exact
  column fields (the old browser path used `readValueAtPath`; the server now does the equivalent), so each
  column is a flat key holding the true value, which the mask then blanks by alias.
- **`H3` — REAL (test quality): the static guard was bypassable.** It tested for the literal tokens
  `serializeExport` / `prepare:`; a hand-rolled client export using `['pre'+'pare']` and a manual `Blob`
  contained neither and shipped the leak past the guard. **Fix:** strengthen the guard.

Two further attacks were measured **NOT AN ISSUE**: the JSON list branch is behaviour-identical (pagination
parity proved), and a misspelled projection column yields an empty cell, never a clear value. The
fail-open-on-`resolve`-throw path matches the pre-existing `CC-45`/`CC-48` design and the service is
registered in `bootstrap.ts:193`.

