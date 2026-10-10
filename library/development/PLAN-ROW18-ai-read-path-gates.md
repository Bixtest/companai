# PLAN — Row 18: the AI read path goes through the same column- and row-level gates as a human

**Row 18** (`BUILD-ORDER.md` item 19; `platform_points.md` THE LIST row 18) — *Phase 5: Query / Command
enforcement.* Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

The AI **read** tools live in `packages/search/src/modules/search/ai-tools.ts` (discovered by the
`ai-assistant` module and registered as MCP tools). Three of the six tools return **records**:
`search_query` (via `searchService.search`), `search_get` and `search_aggregate` (both via
`queryEngine.query(entityId, opts)` — the shared engine at `packages/shared/src/lib/query/engine.ts`,
whose options are typed in `packages/shared/src/lib/query/types.ts:92` `QueryOptions`).

**What the AI read path applies TODAY (measured):**

1. **Entity gate — YES, and fail-closed.** `authorizeEntityAccess(entityType, ctx)`
   (`ai-tools.ts:80`) resolves the entity's declared **`aclFeatures`** and **denies** when the entity is not
   configured, declares none, or the caller lacks them (`:84-103`). A super-admin (`ctx.isSuperAdmin`)
   bypasses. This is the `CC-46` coverage, enforced on the AI door. *(`search_query` does not call it — it
   returns only presenter title/subtitle/url for a **hybrid relevance hit**, and its `searchService.search`
   is itself tenant/org-scoped.)*
2. **Tenant / org row SCOPE — YES.** Both `queryEngine.query` sites pass `tenantId` + `organizationId`
   (`ai-tools.ts:274-280`, `:446-450`), and `QueryOptions` (`types.ts:100-103`) enforces
   `tenant_id = X AND organization_id = Y` (or the `organizationIds` allowlist). This is the same
   `buildScopedWhere` **scope** the human path gets — the *"which rows are in my tenant?"* question.
3. **A field strip — YES, but it is the SEARCH field policy, NOT the platform classification.**
   `stripSensitiveFields(record, config)` (`ai-tools.ts:114`) drops fields named in the entity's
   **`config.fieldPolicy.hashOnly` / `.excluded`**, and `isGroupByAllowed` (`:136`) blocks grouping on them.
   That `fieldPolicy` is the **search-index** field policy (`SearchEntityConfig`), **not** the platform
   **data-classification map** (`ModuleEncryptionMap`, `shared/src/modules/encryption.ts`; the map `CC-45`
   consults via `resolveExportEncryptedFields`). Measured: **no reference to `defaultEncryptionMaps`,
   `encryptionMaps`, `resolveExportEncryptedFields` or `applyEncryptedFieldMask` exists anywhere under
   `packages/search/src` except the search module's OWN `encryption.ts` map declaration.**

**What the AI read path does NOT apply (measured):**

- **(a) The owner row-scope.** `grep` for `ownerField|rowScope|buildScopedWhere` across
  `packages/search/src` → **no matches.** Row 16 (`CC-50`) added an opt-in owner dimension
  (`OrmEntityConfig.ownerField`/`ownerFeature`, resolved in `withCtx()`) that the **human** list/update/delete
  paths apply via `buildScopedWhere`. `QueryOptions` has **no** owner/row-scope field (`types.ts:92-148`), so
  the AI path cannot and does not apply it — an own-scoped human and an AI acting for the same user see
  **different** rows through the same entity. *(Row-scope semantics for an AI actor is a policy question —
  §4.)*
- **(b) The column-level classification mask.** The AI path masks only the **search** field policy; the
  platform **classification** map (the thing row 14 / `CC-45` protects on the human export path) is **not**
  consulted — so a field the platform marks sensitive via `defaultEncryptionMaps` but which is **not** in the
  search `fieldPolicy` would be returned by `search_get` unmasked.

**So the honest state:** the AI read path has the **entity** gate (fail-closed) and the **scope** gate
(tenant/org), but is missing two of the three protections the human path has — the **owner row-scope** and the
**classification column-mask**. Row 18's literal words — *"the same column- and row-level gates as a human"* —
are therefore **not met**.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (row 18 / `BUILD-ORDER` item 19):** *"Wire the AI IR path to the new column- and row-level gates."* —
i.e. the AI read tools must apply the **same** column-level (classification mask) and row-level (scope,
including own) gates a human read gets, so an AI can never return a row or a column a human with the same
rights could not.

**Points taken from `platform_points.md` that define it:**

- **Row 15 (`P10`)** — "every read is filtered by permission at the data layer" — the AI door is *a read
  path*; row 15's guarantee must hold for it too (rule 13: the row's own text says "every read").
- **Row 14 (`P4`)** — "sensitive fields … never logged, never exported **by accident**" — a field returned to
  an AI is an **egress**; the classification map must govern it, exactly as it governs the human export
  (`CC-45`).
- **Row 16 (`CC-50`)** — the **own** row-scope dimension the human path now applies.
- **Row 17 (`CC-52`)** — the coverage discipline: a new entity reaching the AI path cannot escape the gates.

**Contract (acceptance):**

- **A1 — column mask.** `search_get` (and any record-returning AI tool) masks every field named by the
  platform **classification map** for the entity, using the **same** helper the human export uses
  (`resolveExportEncryptedFields` + `isEncryptedExportField` / `applyEncryptedFieldMask` from
  `shared/src/lib/crud/export-encryption.ts`), **in addition to** the existing search `fieldPolicy` strip.
  **Fail-closed:** a map read that throws masks everything. **No map / map disabled ⇒ byte-identical** to
  today.
- **A2 — row scope.** The AI-path `queryEngine.query` calls apply the same row-level scope the human path
  applies. The **own** dimension applies **only** when the entity opts in (`ownerField`) — and, since the AI
  actor's own-vs-full semantics is a policy call (§4), the **safe default** is to apply the owner clause when
  the acting user (not the AI's super-admin flag) is own-scoped, so the AI can never see **more** rows than
  the human it acts for.
- **A3 — no regression.** With no classification map and no owner opt-in, every tool's output is
  **byte-identical** to today; the existing `ai-tools.get.test.ts` / `ai-tools.aggregate.test.ts` stay green.
- **A4 — coverage discipline.** A test proves the record-returning AI tools go through the mask (the row-17
  shape: a new tool cannot be added un-masked).

---

## 3. Where it lives (rule-13/L105-aware placement)

- **The mask** is applied **inside the record-returning handlers**, reusing the shared helper — **not** a new
  bespoke mask. The helper is the same one `CC-45` wired into the human export, so the two paths cannot
  drift.
- **The engine stays generic.** The owner/row-scope is resolved **before** the `queryEngine.query` call and
  passed as an explicit `filters`/scope — **not** by teaching `QueryOptions` a new owner field unless
  measurement shows that is the smaller change (§5 impact).
- **The gate, not the tool**, is what a coverage test pins: every tool whose handler calls
  `queryEngine.query` or returns a record must be listed as *masked* or *knowingly exempt* (by name + reason).

---

## 4. Non-goals (explicit) — and the ONE owner question

- **Not** building a new permission for internal tables (row 17 settled that).
- **Not** changing the human path.
- **Not** changing `search_query`'s relevance-only hit shape (presenter title/subtitle/url) unless the mask
  measurement shows a classified field leaks there (measure in step 4).
- **The owner question (rule 11, §2.2 — at most ONE):** *when an AI acts for a user who is own-scoped, should
  the AI see (a) only that user's own rows — the safe default, so the AI can never exceed the human — or
  (b) the whole tenant because the AI is a service principal?* **Recommendation: (a)**, and the build takes it
  as the default (a super-admin principal keeps its carve-out). Recorded as `NY-22`; if the owner rules (b) it
  is a one-line change at the resolution site.

---

## 5. Impact trace (rule 10e)

- `packages/search/src/modules/search/ai-tools.ts` — the handlers (mask + scope).
- `packages/shared/src/lib/crud/export-encryption.ts` — **reused, unchanged** (no API change).
- `packages/shared/src/lib/query/types.ts` — **only if** measurement shows the owner clause must travel via
  `QueryOptions` (prefer `filters`).
- `packages/shared/src/lib/api/crud.ts` `buildScopedWhere` — **reused**.
- Tests: the two existing `ai-tools.*.test.ts` (must stay green) + the new coverage assertion.
- No parked-module impact (the AI tools are in `packages/search`, an enabled module).

---

## 6. Red-then-GREEN plan (rule 10f)

For each load-bearing change: a mutation that turns RED, restored **md5-verified** byte-identical:
(a) disable the classification mask → a `search_get` classified-field test RED; (b) drop the owner clause →
an own-scoped read test RED; (c) make the mask resolve a wrong entityId → RED; (d) break the exempt-list
discovery → RED.

---

## 7. OUTCOME

**BUILT 2026-10-11 (`CC-53`; code `packages/search/src/modules/search/ai-tools.ts` + the new test
`packages/search/src/modules/search/__tests__/ai-tools.classification-mask.test.ts`, 12 tests).**

**Measured first (rule 0b) — and the premise shrank twice.** The literal row is *"the AI IR path goes through
the same column- and row-level gates as a human"*. Measured, the AI record-returning tools already had the
**entity** gate (fail-closed) + tenant/org **scope** + a **search** `fieldPolicy` strip. The two things missing
were the **classification column-mask** and the **owner row-scope**. Then the owner-row-scope leg **evaporated
on measurement**: **no entity is both searchable and own-scoped** (only `api_keys` declares `ownerField`, and it
has **no** `search.ts`) ⇒ the owner clause has **no reader** on the AI path ⇒ **not built**, scheduled as the
owner question **`NY-22`** (rules 8/10d/11). So the build is **the column-mask leg**, which is real and has a
reader.

**Built (A1–A4 of §2).**
- **A1 — column mask.** `search_get` resolves the platform classification map for the entity via
  `resolveExportEncryptedFields` and masks every named field with `MASKED_EXPORT_VALUE`, using the **same**
  helper the human export uses (`CC-45`). **Nested** objects/arrays are recursed (`maskValueDeep`, added after
  critic round 2). **Fail-closed:** a map read that throws ⇒ `maskAll` ⇒ mask everything. **Disabled/absent
  service ⇒ byte-identical** (asserted by a no-service test).
- **A2 — the other two reachable routes.** `search_query` **drops the index-time presenter** for a classified
  entity (so the fallback presenter cannot promote a classified string field into `title`); `search_aggregate`
  **refuses** a `groupBy` naming a classified field.
- **A3 — no regression.** With no map, output is byte-identical; the pre-existing `ai-tools.*` suites stay
  green (281/281 in `packages/search`).
- **A4 — coverage.** The new suite proves each record-returning tool goes through the mask.

**Hardening (TOTAL quality protocol).** **Two separate-agent hostile-critic rounds** (each demanded a
command+output per claim):
- **Round 1 — two REAL holes:** the `search_query` presenter-promotion leak (`fallback-presenter.ts`
  `findAnyStringValue`) and the raw `search_aggregate` bucket leak → **fixed** (drop presenter; refuse a
  classified `groupBy`). **Lesson L112.**
- **Round 2 — one REAL hole:** the first mask checked **top-level keys only**, so a classified key nested in an
  object value (`meta.secret`) leaked → **fixed** with `maskValueDeep` recursion. **Lesson L113.**
- **A self-inflicted near-miss (L103/L114):** my own wrong-entity `mutation` stayed GREEN because the test's
  mock `getEncryptedFieldNames` ignored its `entityId` argument; the mock was made **entity-aware** and an
  explicit "resolves the map for the **requested** entity" assertion added.

**RED-then-GREEN (rule 10f).** **6 mutations**, each restore **md5-verified** byte-identical to the baseline
`8b9238b006ec1ea6eab76199d6365bc6`: (1) disable the classification mask → RED; (2) resolve a **wrong entityId**
→ 2 RED; (3) break the aggregate refusal → RED; (4) break the presenter drop → RED; (5) disable the recursion →
the nested-value test RED. Final **GREEN 12/12** (new suite) / **281/281** (`packages/search`, 27 suites);
`tsc --noEmit` **clean** on `packages/search`.

**THE ONE NUMBER.** **72 / 321 = 22% — UNCHANGED** (row 18's new LIST box has **no** fresh appendix marker in
§A–§K). **8th consecutive re-run.** The two routes disagreed at first (72/321 vs a blind verifier's 74/331) —
the cause was the verifier's `[A-K]` regex never matching `## L.`, so it counted the **ledger §L** as points;
with §L excluded both routes return **72 / 321** (**lesson L115**).

**Not built (named, scheduled).** The **own row-scope** leg (§2 A2's own-clause) — no reader on the AI path
today ⇒ `NY-22`. Everything else in §2's contract is **met**.

---

## 8. What was measured vs what was quoted

**Measured this session (commands run in `packages/search`):** the six tools and their handlers; the two
`queryEngine.query` call sites and the scope they pass; `QueryOptions`' fields (`types.ts:92-148`);
`authorizeEntityAccess` / `stripSensitiveFields` / `isGroupByAllowed`; the **absence** of any
`ownerField`/`rowScope`/`buildScopedWhere` reference in `packages/search/src`; the **absence** of any
classification-map reference in `packages/search/src` outside the module's own `encryption.ts`. **Quoted (not
re-measured here):** the human path's `CC-45` mask wiring (proven in `CC-45`'s own plan/register), and
`CC-50`'s `ownerField` mechanism (proven in `PLAN-ROW16-…`).
