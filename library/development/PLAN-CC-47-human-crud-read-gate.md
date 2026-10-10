# PLAN — `CC-47`: the human CRUD **list** path — and a measured **premise correction**

**Written:** 2026-10-10. **Status:** ✅ **DONE 2026-10-10** — the owner chose **Option A** (`NY-19`: build the
coverage test), and it is built. Step 4 **FALSIFIED the register's premise**: the human CRUD list path **does**
have a per-entity permission filter (route-metadata `requireFeatures`, enforced **403** by the dispatcher). The
delivered artefact is `packages/cli/src/lib/generators/__tests__/crud-read-gate-coverage.test.ts` (9 tests GREEN,
`tsc --noEmit` clean) — a **fail-closed** coverage gate with pinned exception lists. **Row 15 flipped 🟡 → ✅.**
**Parent:** row 15 (`P10`) — "every read is filtered by permission at the data layer". **Sibling:** `CC-46`
(the ACL-coverage half, closed).

---

## 1. What the register says the task is (the requirement, quoted)

`COMPLETION-CALLBACKS.md` row `CC-47`:

> **Row 15 (`P10`) — the LAST leg: the ordinary human CRUD `GET`/list path has NO per-entity permission
> filter.** … `factory.ts` reads `requireFeatures` only as **route metadata** (the dispatcher checks it for
> the route, not per row/entity), so a CRUD `GET`/list returns every row the **tenant/org scope** admits
> regardless of the caller's per-entity view feature. … **the human read** … has no per-entity permission
> filter.

And `BACKLOG.md`/`platform_points.md` row 15:

> row 15 is an accurate 🟡 (reads are tenant/org-**scoped** universally and there are two real permission
> read gates, but the **human CRUD *list* path** has no per-entity permission filter — that last leg is open
> as `CC-47`).

## 2. Measured fact-check (rule 0b — re-proved in code, 2026-10-10, before writing any code)

Every row was read from the file named, at the line named. `aclFeatures` is **not** the mechanism on this
path — the mechanism is the route's own `metadata.<METHOD>.requireFeatures`, enforced at the HTTP layer.

| # | Claim | Where I looked | What it says | Verdict |
|---|---|---|---|---|
| 1 | The **route-level** gate exists and is **enforced** | `apps/mercato/src/app/api/[...slug]/route.ts:150-254` (`checkAuthorization`) | lines 161, 207-251: reads `methodMetadata.requireFeatures`; when non-empty resolves `rbac.userHasAllFeatures(auth.sub, requiredFeatures, …)`; **403 Forbidden** if not satisfied. Called from `handleRequest` for every method | ✔ **enforced** |
| 2 | `makeCrudRoute` **declares** that gate for the list method | `packages/shared/src/lib/crud/factory.ts:173-186` (`CrudMethodMetadata.requireFeatures`), returned at `:3148` (`return { metadata, GET, POST, PUT, DELETE }`) | the factory **passes the route's own `metadata`** through; it does **not** read `aclFeatures` itself (0 occurrences in the file) | ✔ route-level |
| 3 | Real CRUD **list** routes **do** declare a GET gate | `catalog/api/products/route.ts:91-96` | `GET: { requireAuth: true, requireFeatures: ["catalog.products.view"] }` | ✔ gated |
| 4 | The **document** routes (orders/quotes) gate via a builder | `sales/api/orders/route.ts:15-16` → `sales/api/documents/factory.ts:284-289` | `viewFeature: 'sales.orders.view'` → `GET: { requireAuth: true, requireFeatures: [binding.viewFeature] }` | ✔ gated |
| 5 | Two routes gate **inside the handler** instead | `sales/api/notes/route.ts:136-141` (`hooks.beforeList → ensureNotePermission('view', …)`) and `sales/api/document-addresses/route.ts:31-47,53+` | both call `rbac.userHasAllFeatures` and throw **403** on failure | ✔ gated |
| 6 | Coverage across all real CRUD `route.ts` | 66 `packages/…/api/**/route.ts` files using `makeCrudRoute` | **61 declare a GET `requireFeatures`** (or gate in-handler via a builder); the **5** exceptions are all **custom POST action routes** (`deals/bulk-update-stage`, `quotes/convert`, `quotes/send`) and the two handler-gated list routes above — **no un-gated list endpoint found** | ✔ **covered** |
| 7 | There is **no structural test** that keeps it that way | `packages/cli/…/search-acl-coverage.test.ts` exists for the **search** path only; `core/src/__tests__/audit-coverage.test.ts` is the pattern for *writes* | no test enumerates CRUD route files and asserts a **read** gate | ✖ **the real gap** |

**Measurement note (a tooling artifact, recorded for honesty).** My first two passes disagreed (bash `grep`
said **59/66** gated; a Node script said **2/66**) because the Node brokered-fs shim returned `NaN` from
`RegExp.test()`. I re-measured with shim-safe string scanning (`indexOf` + brace matching) and by **reading
the files by hand** — both agree on **61/66**, and the exceptions are the 5 named above. The disagreement is
the reason this table exists (rule 2: two routes).

**Conclusion.** The register's premise — *"the human CRUD list path has NO per-entity permission filter"* —
is **FALSE**. The filter exists (route metadata `requireFeatures`, enforced by `checkAuthorization`), and it
is present on **essentially every real list endpoint**. What is genuinely missing is **not the gate** but a
**structural guarantee that a NEW list route cannot be added without one** — the exact analogue of what
`CC-46` built for the search path (`search-acl-coverage.test.ts`).

## 3. The decision (rule 11 — the owner's)

This is a **premise falsification**, so per rule 13 the wrong claim must be corrected everywhere it was
copied — and per rule 11, the *choice* is the owner's, not mine.

### Option A — build the structural coverage gate (my recommendation)
Add one test (reusing the `audit-coverage.test.ts` / `search-acl-coverage.test.ts` shape) that:
1. enumerates every real CRUD list route (`packages/**/api/**/route.ts` using `makeCrudRoute` with a `list`
   config);
2. asserts each declares `metadata.GET.requireFeatures` **or** is on an explicit, commented exemption list
   (the handler-gated routes and the custom action routes, each with a one-line reason);
3. fails the build when a new list route is added un-gated.

**Effect if chosen:** row 15 flips 🟡 → ✅ (the gate exists *and* its absence is now structurally impossible);
`BUILD-ORDER.md` item 17 ("so a new table cannot be added un-gated") is satisfied on the human path too. It
is a **small, additive** change (one test file, no production code touched) — because the thing the register
believed was missing already exists.

### Option B — narrow row 15's wording, build nothing
Correct row 15 to say the read gate is the route's `requireFeatures` (per-entity, enforced), and close it.
**Effect if chosen:** row 15 closes on the wording fix alone; no test is added, so a future un-gated list
route would still be possible (silently), which is the gap `BUILD-ORDER.md` item 17 names.

**My recommendation: A.** It is additive, it closes the row *honestly* (the mechanism is proven present and
its absence made structurally impossible), and it matches the pattern the project already trusts (`CC-46`).

## 4. What I will do once the owner picks

**If A:** (step 5) trace impact — the test touches only `packages/cli/.../__tests__/` or
`packages/shared/src/lib/crud/__tests__/`; (step 6) build it RED-first against the 5 known exemptions to prove
it can fail, then GREEN; a hostile critic as a separate agent; two-route re-measure; then correct **every**
copy of the falsified premise (`COMPLETION-CALLBACKS.md`, `BACKLOG.md`, `platform_points.md` row 15, the row-15
JOURNAL block) and flip row 15.
**If B:** (step 5-6) correct the same four documents to the measured truth and close row 15, noting the test as
a deliberately-unbuilt follow-up with its trigger.

## 5. Where this correction must land (rule 13 — a falsified premise is corrected everywhere it was copied)

- `COMPLETION-CALLBACKS.md` — the `CC-47` row (premise + claim).
- `BACKLOG.md` — FRONTIER row + the row-15 description.
- `platform_points.md` — row 15 🟡 description + the `P10` bullet.
- `JOURNAL.md` — the row-15 re-measure block.
- `START-PROMPT.md` — the FRONTIER line ("the human CRUD *list* path has no per-entity permission filter").
- `PLAN-CC-47-*.md` — this file (the record).

## 6. WHAT WAS BUILT (record — Option A, chosen by the owner 2026-10-10)

**Artefact:** `packages/cli/src/lib/generators/__tests__/crud-read-gate-coverage.test.ts` — **9 tests GREEN**,
`tsc --noEmit` exit 0. Two independent AST assertions:
- **A** — every `makeCrudRoute` route (60 files) declares a GET read gate (`metadata.GET.requireFeatures`), or
  delegates to a listed `GATED_BUILDERS` builder, or is on the pinned `HANDLER_GATED_ROUTES` list (2).
- **B** — every GET-exporting route (296 files) has an exported `metadata` that is **demonstrably** gated (a
  non-empty `requireFeatures`, or `requireAuth: true`), or is a knowing public opt-out on `PUBLIC_ROUTES` (9),
  **else it is FLAGGED** unless a human pinned it on `DELEGATED_GATED_ROUTES` (31).

**Fail-closed by design.** Ten-plus earlier versions of B tried to *prove a negative* by pattern-matching
TypeScript; a hostile critic (separate agent) defeated each shape in turn — a comment/string token;
`requireAuth: false`; a computed `['GET']`; a stray `resource:`; `as const`; a spread; `requireFeatures: []`;
`['']`; an unresolved identifier; a non-literal `GET:` decoy with a flat `requireFeatures`; `let` + reassign;
duplicate keys; `Object.assign`; an in-place array mutation. B was then **inverted**: it accepts only what it
can *see* is a statically-read, non-vacuous gate, and forces a human to vouch for the rest by name. **Each hole
is now a RED-then-GREEN self-check fixture with an md5-verified restore.**

**Pass 12 — a DISCOVERY gap (the durable lesson, `L104`).** `exportsGet` recognised only identifier-named `GET`
bindings, so the **canonical destructured** form `export const { metadata, GET, … } = builder(…)` was invisible;
**9 route files fell out of B's universe** (2 of them — the `makeSalesLineRoute` line lists — in **neither** A
nor B). **Fixed**; the 6 newly-surfaced non-demonstrable routes pinned with verified evidence; the pinned count
corrected **287 → 296**; a discovery self-check fixture added. **Pass 13 found NO LIVE HOLE.**

**Two-route re-measure (rule 2) agrees:** 457 route files (bash `find` = walker); 60 `makeCrudRoute` (bash
grep's 66 includes 6 comment-only mentions); 296 GET-exporting; tally **216 gated / 40 gated-auth-true / 9
public-explicit (== `PUBLIC_ROUTES`) / 31 not-demonstrable (== `DELEGATED_GATED_ROUTES`)**.

**Honest bound (written into the test header).** A's family is the 60 `makeCrudRoute` routes; B's is the 296
GET-exporting routes; their union is **not** the tree — **163 of 457** route files are in neither, and they are
overwhelmingly action/mutation endpoints (POST/PUT: `/cancel`, `/retry`, `/assign`, …), not human list reads.
CC-47 is scoped to the human CRUD **list** path, so this is intended — but the guarantee is *the human CRUD
list family*, not *every route that exports a `GET`*.

**Pre-existing, unrelated failure (not folded in):** `openapi.test.ts` fails **3 tests** ("does not cache a
static fallback after a bundle failure"), reproduced with the CC-47 test file removed and in isolation.

## 7. Where the correction landed (rule 13) — COMPLETE

- ✅ `COMPLETION-CALLBACKS.md` — the `CC-47` row → ✅ DONE (row kept, not deleted, so the closure is auditable).
- ✅ `BACKLOG.md` — FRONTIER row + the row-15 description + the `P10` backlog line.
- ✅ `platform_points.md` — row 15 🟡 → ✅ + the `P10` / §B bullets + PHASE-3/5 headers + a new §L re-derivation.
- ✅ `JOURNAL.md` — a new ✅ DONE block at the top + the row-15 sub-claim table + the "why ✅" paragraph.
- ✅ `START-PROMPT.md` — the FRONTIER line + the revision-log line (revision 18).
- ✅ `HANDOVER.md` — revision 18 header + §5/§7/§8 mentions + the "Not proven" bullet.
- ✅ `NEEDS-YOU.md` — `NY-19` decided; Part 1 → 0 open.
- ✅ `LESSONS.md` — **L104** (a coverage test's discovery predicate is part of its guarantee).
