# PLAN — Row 17 / BUILD-ORDER item 17 — permission coverage reaches every table

**Status:** 🟢 BUILT 2026-10-11 (owner chose Option A via `NY-21`). See §7 for the outcome.
**Register:** `platform_points.md` row 17 (LIST row 17, appendix §B `P10`'s coverage complement) —
*"Permission coverage reaches **every** table — a new table cannot be created un-gated."*
(`BUILD-ORDER.md` item 17: *"Coverage: extend `aclFeatures` from 6 of 53 tables to all tables, with an aggregate
rule so a new table cannot be added un-gated. (Enforced by SD-1, which is why SD-1 is Phase 1.)"*)

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

The row's own wording — *"extend `aclFeatures` from 6 of 53 tables to all tables"* — was written when coverage
was 6 of 53. Both halves of that sentence have since moved, so the row was **re-measured before building**.

| Universe | Count | How measured | Gate today |
|---|---|---|---|
| **Tables** (exported entity classes) | **239** | `export class\|const` across every module's `data/entities.ts` | — |
| Searchable entities | **53** | the AST walker in `search-acl-coverage.test.ts` | **all 53 declare `aclFeatures`** (`CC-46`, 2026-10-10) |
| `makeCrudRoute` CRUD routes | **60** | AST `CallExpression` on the identifier `makeCrudRoute` | **all 60 declare a GET read gate** (`CC-47`, 2026-10-10) |
| GET-exporting routes | **296** | `exportsGet` discovery | 216 `gated` / 40 `gated-auth-true` / 9 public / 31 pinned |
| **Tables with NEITHER** an `aclFeatures` NOR a CRUD route | **~186** | the two sets subtracted from 239 | tenant/org **scope** + the **write** guards only |

Two mechanical guards already exist, both added 2026-10-10:
- `packages/cli/src/lib/generators/__tests__/search-acl-coverage.test.ts` (`CC-46`) — a **new searchable
  entity** cannot be added without `aclFeatures`.
- `packages/cli/src/lib/generators/__tests__/crud-read-gate-coverage.test.ts` (`CC-47`) — a **new CRUD list
  route** cannot be added un-gated.

**The honest state.** The row's *substance* ("a new table cannot be added un-gated") is **guarded for the two
families that are read surfaces** — but the row's *literal words* ("**every** table") are **not met**: ~186 of
239 tables carry no read-ACL declaration. Many of those ~186 are **not read surfaces at all** (join tables,
`auth.Session`, `auth.PasswordReset`, sidebar preferences, `PermissionSurfaceRecord`, audit/mechanism tables,
`query_index`, `translations`, `progress`); they are protected by **row scope** and the **write** guards, but
nothing *forces* a human to say so — which is exactly the class of defect the owner has repeatedly objected to
("we do not end up having permissions for some tables, then forgetting to add to other tables created later").

## 2. The requirement (rule 10c)

**The defect.** Coverage is **implicit**. A table is "covered" by being on one of two paths
(searchable-with-`aclFeatures`, or CRUD-route-with-`requireFeatures`). A table on **neither** path is covered
only by *accident* — nothing enumerates it and nothing forces a decision. A brand-new table can therefore ship
with **no one having asked** "may an actor read this, and under which feature?" — the owner's stated fear.

**The contract (Option A, chosen by the owner).** A **new coverage gate** enumerates **every table** the
platform declares and requires each to fall into **exactly one** of three classes:

1. **`aclFeatures`-declared** — a *searchable* entity that declares who may read it (the `CC-46` class).
2. **Route-gated** — a table behind a `makeCrudRoute` read surface whose route declares a read gate
   (the `CC-47` class). *(The gate verifies the route family exists and is gated; the route-level proof is
   `CC-47`'s job.)*
3. **`INTERNAL_TABLES`** — an explicit, **named, reviewable allowlist** of tables that are deliberately
   *not read surfaces* (join tables, sessions, mechanism tables, per-user preferences with no list API, etc.),
   each with a written reason.

A table in **none** of the three classes **FAILS the gate** — so a new table cannot be added un-classified.
This is the aggregate rule the row asks for, applied to **every** table, with the exclusions forced to be
**named** rather than silent.

**Acceptance criteria (A1–A6):**
- **A1** — the gate enumerates ≥ 239 tables (discovery self-check; a shrinking scan fails loudly).
- **A2** — every table is in exactly one class; **no table is unclassified** (the core assertion).
- **A3** — the `INTERNAL_TABLES` allowlist names **only tables that actually exist** (a stale entry fails).
- **A4** — a table may **not** be on `INTERNAL_TABLES` **and** declare `aclFeatures` (no contradiction).
- **A5** — the discovery is **fail-loud**: if the walker finds no tables, the suite fails (not a vacuous pass).
- **A6** — the gate is a **coverage** gate like `CC-46`/`CC-47`: it is the mechanical half of `BUILD-ORDER`
  item 17 ("a new table cannot be added un-gated").

## 3. Where it lives (rule-13-aware placement — the L105 lesson)

The declaration home must be a layer **every** covered table shares. Tables come from **two** sources that do
not overlap (entity classes in `data/entities.ts`; searchable entities in `search.ts`), so the gate must
**union** them — *not* be placed in either one (the row-16 `L105` mistake was placing a declaration where the
first example lived rather than where the guarantee's scope required).

The gate therefore lives **beside the existing two coverage tests** in
`packages/cli/src/lib/generators/__tests__/` and reads **both** universes, so it is the *aggregate* view the
row asks for.

## 4. Non-goals (explicit)

- **Not** inventing read-ACLs for internal tables (that is Option C, rejected: plumbing with no reader).
- **Not** changing any runtime gate — this is a **coverage/classification** gate, like `CC-46`/`CC-47`.
- **Not** re-implementing the route-level proof — `CC-47` owns "is this route gated?"; this gate owns
  "is every table *classified*?".

## 5. Impact trace

- **New file only** — no production code changes. The gate is additive.
- No route, service, or entity is touched; the two existing coverage tests are unchanged.
- The `INSTALl`/build is unaffected (a test-only addition).

## 6. Red-then-GREEN plan

For each load-bearing assertion, a mutation that must turn the gate RED, restored with an **md5-verified**
restore: (a) add a fake table with no class → A2 RED; (b) a stale `INTERNAL_TABLES` entry → C RED;
(c) name a table both internal and searchable → B RED; (d) break the discovery → sanity/A RED.

**RESULTS (final, on the hardened gate; baseline md5 `60c40f29c5f1bff438b29f564ea99460`):**
MUT1 (remove `auth.Session` from the union) → **1 failed**; MUT2 (a stale internal name) → **2 failed**;
MUT3 (a searchable entity added to internal) → **1 failed**; MUT4 (break discovery) → **2 failed**. Each
restore verified **byte-identical** to the baseline md5. Final state **GREEN 5/5**; `tsc --noEmit` clean on
`packages/cli`.

---

## 7. OUTCOME — BUILT 2026-10-11 (`CC-52`)

See `COMPLETION-CALLBACKS.md` `CC-52` for the closed row, and §7.1 for the measured classification.

**Hardening after the separate-agent hostile critic (all fixed):** (1) the read-surface predicate matched a
bare class name inside a **comment** → added `stripComments()` (**L109**); (2) the walker read only `route.ts`,
so a live `GET` in a sibling `api/*.ts` was invisible and a real read path was wrongly filed internal →
broadened to `api/**/*.ts` (**L110**); (3) the sanity thresholds were loose floors (`>200`), so a 39-table
shrink passed → **pinned exact counts** (**L111**). My own first `INTERNAL_TABLES` draft was also wrong (18
route-backed tables listed internal; 3 stale names — `sales.SalesOrderWarehouseAssignment`→`wms`,
`message.MessageAccessToken`→`messages`, `customer_accounts.CustomerDictionaryKindSetting` nonexistent; 4
joins missing) — the gate's own assertions A/B/C caught every one, fixed by re-deriving from measurement.

### 7.1 The measured classification (the gate's own output)

- **233 tables** enumerated (the gate **pins** this exact count — a shrink or growth fails).
- **`aclFeatures` class:** all **53** searchable entities (unchanged; owned by `CC-46`) — **12** search modules.
- **Read-surface class:** referenced by a comment-stripped `api/**/*.ts` file in its module — **47** surface modules.
- **`INTERNAL_TABLES` class:** the explicit, named allowlist (~63 entries), each with a reason.

*(Rule-13 correction: the rule-0b scan's rough `239` is superseded by the gate's pinned exact `233` — the
authoritative figure is wherever the gate enforces it.)*

### 7.2 The team/other future additions

None. Row 17 has no deferred leg beyond the honest **classification** of tables: every table is now in one of
the three named classes, and a new one cannot ship un-classified.
