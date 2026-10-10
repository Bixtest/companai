# `PLAN-CC-48` — a client-side (`view`) export must never leave a marked field in clear

**Written:** 2026-10-10. **Code repo:** `workspace/starting-kit` (branch `main`). **Docs repo:** `companai`.
**Predecessor:** `CC-45` (the **server**-side export mask, committed `03163b2b`) — closed the server funnel;
this row closes the one export path `CC-45` could not reach.
**Owner decisions taken 2026-10-10:** `NY-16` → **blank the value** (already the `CC-45` behaviour; no code);
`NY-17` → **Option B** (the browser export is sent back through the server). Recorded in `NEEDS-YOU.md`.

---

## 1. The requirement (quoted, exactly)

From `COMPLETION-CALLBACKS.md` row **`CC-48`**, opened by the `CC-45` hostile critic:

> **Row 14 (`P4`) — the CLIENT-SIDE `view` export leaks a marked field.** `ui/src/backend/DataTable.tsx:768`
> calls `serializeExport(prepared, format)` with no mask … Its callers build the rows from data **already in
> the browser** … nothing hides encrypted columns from the grid … so a marked field is an ordinary visible
> column. Clicking **View → Export** downloads the clear value.

And the parent row 14 claim: *"Sensitive fields and secrets are marked as such, and the platform treats them
specially (never logged, **never exported by accident**)."*

**What that means in one sentence:** a table's "View" export takes the rows already on the screen and writes
them to a file in the browser — our server never sees it, so the `CC-45` mask cannot reach it — and a marked
(secret) field therefore downloads **in clear**.

---

## 2. Measured fact-check (rule 0b — re-measure before building; rule 0 — only code is evidence)

| # | Claim | Where I looked | Measured |
|---|---|---|---|
| 1 | The server view export **already exists** (rows only, filename without `_full`) | `packages/core/src/modules/entities/api/records.ts:391` (`exportItems = exportFullRequested ? fullPageItems : viewPageItems`), `:428-429` | **TRUE** |
| 2 | The server view export **already applies the mask** | `records.ts:408-419` — `applyEncryptedFieldMask` runs *after* the `exportFullRequested` branch, so it covers **both** shapes | **TRUE** |
| 3 | `records/page.tsx` view export is **browser-built** | `.../entities/user/[entityId]/records/page.tsx:203-215` (`prepare` maps `data` in-browser) → `ui/src/backend/DataTable.tsx:764-781` (serialize + `Blob` download, **no mask**) | **TRUE — the leak** |
| 4 | `CustomerTodosTable.tsx` can leak | `packages/core/src/modules/customers/encryption.ts:48,22` + `lib/todoCompatibility.ts:603,610,154` | **TRUE — but for a DIFFERENT reason; → `CC-49`** |
| 5 | `create-app` `TodosTable.tsx` can leak | example module; **no** encryption map declares it | **FALSE — not a leak surface** |
| 6 | `ensureColumns` accepts a column hint (so a projection is possible) | `packages/shared/src/lib/crud/exporters.ts:190` (`ensureColumns(rows, hint?)`) | **TRUE** |

**Rule 13 correction #1 (the row's own scope).** The `CC-48` row named the leak "same shape in
`CustomerTodosTable.tsx` and `create-app/…/TodosTable.tsx`". Measured **by the hostile critic, then
reproduced by me**: the create-app example table is **not** a surface (no `encryption.ts`); but
`CustomerTodosTable` **is** — and **not** in the same shape. Its task rows alias the underlying
`customers:customer_interaction.title`/`.body` (marked) to `todoTitle`/`todoDescription`
(`todoCompatibility.ts:603,610`) and `customer_entity.display_name` (marked) to `customer.displayName`
(`:154`), and `listCanonicalTodoRows` reads them **decrypted** (`em.find(CustomerInteraction, …)`,
subscriber decrypts on read). Because the `CC-45` mask keys on the **column field name**
(`row[column.field]`, canonical `todotitle`), the alias **never matches** `title` ⇒ the mask would not
save it even server-side. **Split out as `CC-49`** — a distinct defect with a distinct fix.

**Rule 13 correction #2 (my own first draft of this doc).** I first wrote here that
"`CustomerTodosTable` … measured not to leak" after checking only that *no entity literally named
`customer_todo`* is marked. That measured the wrong entity — the tasks table reads
`customer_interaction`, which **is** marked. Corrected above; the lesson is that a "not a surface"
claim must name the **actual entity the code reads**, not a plausible-sounding one.

**Sibling callers measured (to prove #4/#5 are not guesses):** the production `serializeExport` callers and
the four `prepare:` exporters were enumerated — `records/page.tsx` (entity data — **real**),
`CustomerTodosTable.tsx` (customer tasks — no map), `create-app/…/TodosTable.tsx` (example app — no map),
`wms/*/commands/*` (commands, not exports). Only one leaks.

---

## 3. The chosen fix point (rule 9b — challenge the task, then choose)

**Owner's ruling: Option B.** The DataTable already supports a **`getUrl`** section, whose branch
(`DataTable.tsx:785`) simply navigates the browser to a server URL — no client-side serialization at all.

**Chosen shape (minimal, reuses `CC-45`):**
1. **`records/page.tsx`** — the `view` section changes from `prepare` (browser) to **`getUrl`** (server),
   pointing at the **same** `/api/entities/records` endpoint with `format`, the current `search` /
   `searchFields` / `sortField` / `sortDir`, and the **visible columns** (new `columns` param). The server
   then returns the view-shaped rows **already masked** — one mask, one path.
2. **`records.ts`** — accept an optional **`exportColumns`** param (comma-separated field names) and pass
   it to `ensureColumns(rows, hint)` so the export honours the browser's visible-column choice. Absent ⇒
   unchanged behaviour (auto-derived columns), so existing callers are byte-identical. **Named
   `exportColumns`, not `columns`** (hostile-critic fix: a bare `columns` would enter the reserved-key skip
   list and silently drop a custom entity's own `columns` field used as a record filter).

**Alternatives rejected:**
- **(A) mask in the browser** (owner rejected) — would send the secret **field names** to the client, i.e. a
  new (small) information leak, to fix an information leak.
- **(C) hide marked columns from every grid** (owner rejected) — removes a feature operators use, and hides
  the field even from people entitled to see it.
- **Masking inside `DataTable.serializeExport`** — `DataTable` is a generic UI primitive with no knowledge of
  the entity's encryption map; the map must be read server-side. Rejected.

**Why this is clean:** `CC-45` already proved the server funnel masks; Option B makes the client export
*use* that funnel instead of a parallel, unmasked one. No new masking logic — only a reroute plus a column
projection.

---

## 4. The combined requirement

- **R1.** The `view` export on the custom-entity records table is served **by the server**, and a marked
  field appears as `***` in it — never in clear. *(The `CC-45` mask is the single masking path.)*
- **R2.** The `view` export still honours the current **filters** (`search` / `searchFields`), **sort**, and
  **visible columns** — i.e. it exports what the operator sees.
- **R3.** An export of an entity with **no marked field** is **byte-identical** to the pre-change output
  (regression guard).
- **R4.** The other export sections (`full`) are unchanged; the two todos tables are unchanged (measured not
  to leak).
- **R5.** The columns projection is **optional** — absent ⇒ the server behaves exactly as today.

---

## 5. Impact trace

| File | Change | Risk |
|---|---|---|
| `…/entities/user/[entityId]/records/page.tsx` | `view` section: `prepare` → `getUrl` | Low — the Leak stops; export becomes a server request |
| `packages/core/src/modules/entities/api/records.ts` | accept optional `exportColumns` → `ensureColumns(rows, hint)` | Low — absent ⇒ unchanged; masked either way |
| `…/customers/components/CustomerTodosTable.tsx` | **none here** — it leaks, but with a different root cause (aliasing) ⇒ **`CC-49`**, not this change | leaks until `CC-49` closes |
| `create-app/…/TodosTable.tsx` | **none** (measured: exports no marked entity) | none |
| `ui/src/backend/DataTable.tsx` | **none** (generic primitive; already supports `getUrl`) | none |

**Scoreboard:** row 14 stays 🟡 — the **server** leg closed by `CC-45`, the records-page client leg closed
by **`CC-48`**, but `CC-49` (the tasks table) is a still-open leak of the same row-14 requirement. Row 14
flips ✅ only when `CC-49` closes too.

---

## 6. Evidence to produce (rule 10 step 6)

- A test proving a marked field is `***` (or absent) in a **server** view export — and **not** the raw value;
- a **RED-then-GREEN mutation** (revert the reroute / the mask) with an **md5-verified** restore;
- a regression test that an unmarked entity's export is **byte-identical**;
- **two independent routes** for THE ONE NUMBER (unchanged — `CC-48` closes a callback, ticks no box);
- a **separate hostile-critic** agent pass;
- `tsc --noEmit` clean on both packages + the green gate.
