# PLAN — `CC-44`: make the write-path feature gate DEFAULT-DENY (row 7's mechanical guarantee)

**Row:** `platform_points.md` LIST row **7** — *"roles & grants enforced on every write"* (✅ in substance) and
its appendix `§B P3`. **Register:** [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) `CC-44`.
**Owner ruling:** **2026-10-11 — Option A** ("we do Option A (your recommendation)"), recorded as
[`NEEDS-YOU.md`](NEEDS-YOU.md) `NY-23`. The ruling is: a write endpoint that declares no permission and no
explicit by-design exemption **fails the build**; the deliberately-open endpoints get a machine-readable
by-design tag on the route itself.

Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

- **The gate is OPT-IN.** `apps/mercato/src/app/api/[...slug]/route.ts` enforces `requireFeatures` only when
  `requiredFeatures.length > 0` (`:161`); `extractMethodMetadata` (`:104`) copies **only** `requireAuth` and
  `requireFeatures` — so any other metadata key is **inert** at runtime.
- **A measuring tool exists, in the DOCS repo.** `analysis/permission-gate/measure.js` walks every write route
  in every **enabled** module and classifies it `FEATURE_GATED` / `CRUD_FEATURE` / `GUARD_ONLY` / `NEITHER`; its
  `--check` mode exits 1 when a `NEITHER` route is not on its `BY_DESIGN_NO_FEATURE` list. **Measured now:**
  35 enabled modules, **170** write route files, **159** feature-gated, **0** factory, **5** guard-only (the
  notifications routes), **6** NEITHER (the by-design set). *(169 → 170 since the register's 2026-10-09 figure:
  `CC-27` added the `ai_agent_bindings` manage route, which is feature-gated.)*
- **The check is not part of any build.** It lives in the docs repo, is run by hand, and nothing makes a new
  un-gated route fail. The exemptions live in a **list inside the tool**, not on the routes.
- **The exemptions (the 6 `NEITHER` routes, all measured 2026-10-09, re-confirmed now):**
  `auth/api/locale` (self-service locale cookie), `auth/api/profile` (self-service profile),
  `communication_channels/.../post/webhook/[provider]` (signature webhook),
  `communication_channels/.../post/webhooks/gmail` (JWT webhook),
  `webhooks/.../inbound/[endpointId]` (signature webhook),
  `apps/mercato/.../ratelimit_probe/api/ping` (rate-limit probe).

**So the honest state:** row 7's *substance* is true (no genuine resource write is unprotected today), but the
**mechanism is opt-in** — nothing forces the **next** route to declare a permission. This is the gap `CC-44`
closes, per the owner's ruling.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (register `CC-44`, owner Option A):** make it a **build failure** when a write route declares neither a
feature gate nor an explicit, machine-readable **by-design** exemption; and move the exemption from the tool's
list onto the **route itself**.

**Points taken from `platform_points.md` that define it:**
- **Row 7** — *"roles & grants enforced on every write"*: the enforcement is the central **feature gate**; the
  guarantee must be **structural** (a new route cannot ship without one), not a habit.
- **Row 15 (`CC-47`) / Row 17 (`CC-52`)** — the project's established shape for such a guarantee: a
  **coverage test** in `packages/cli` that walks the tree and fails the build, with **named, review-visible
  exceptions** pinned so a new occurrence fails *and* a stale entry fails.
- **`CC-46`/`search-acl-coverage`** — same pattern on the search path.

**The contract (`C44`):**

- **`C44a` — default-deny, at the build.** A new coverage test fails when any write route (POST/PUT/PATCH/
  DELETE) in an **enabled** module is neither **feature-gated** (declares `requireFeatures`, or builds through
  a feature-carrying factory) nor **by-design-marked**.
- **`C44b` — the exemption lives on the route.** The marker is a `byDesign: '<reason>'` key in the route's
  method `metadata`. It is **inert** at runtime (the dispatcher reads only `requireAuth`/`requireFeatures`), so
  adding it is a **documentation** change, never a behaviour change.
- **`C44c` — comment-proof.** The classifier strips comments **and** string literals before matching, so
  `// requireFeatures:` or `// byDesign:` cannot grant a pass (`L109`/`L119`).
- **`C44d` — the exemption set is pinned and cannot go stale.** The test asserts the set of by-design routes
  **equals** a named map; a new marker with no entry fails, and a stale entry fails.
- **`C44e` — scope = enabled modules.** Only mounted routes count (a parked module's route is not a live
  surface), matching the measuring tool and the register.
- **`C44f` — no behaviour change.** No route gains or loses a real feature; the only route edits are the inert
  `byDesign` keys.

---

## 3. Placement

- **NEW** `packages/cli/src/lib/generators/__tests__/write-gate-coverage.test.ts` — ports the classifier from
  `analysis/permission-gate/measure.js` (the fixed form — `L119`: reuse it, do not re-derive), adds
  `byDesign` detection, and asserts `C44a`/`C44d`/`C44e`.
- **The non-feature-gated routes** gain a `byDesign` key in their method `metadata` (inert): the **6** NEITHER
  routes *and* the **5** guard-only notification routes — see §4 for why the strict gate covers the guard-only
  set too.
- No change to the dispatcher, to any route's `requireFeatures`, or to `analysis/permission-gate/measure.js`
  (which stays the docs-repo evidence tool).

---

## 4. The strict reading — why the guard-only set is tagged too (rule 9b)

The owner's approved option says *"a write endpoint that declares no permission and no by-design exemption
fails the build"*, and names *"the 6"*. The **gate condition** it states catches **11** routes, because the 5
guard-only notification routes also declare **no permission**: they are protected by a **structural** guard
(`createSingleNotificationActionRoute`, own-record), which is **not a role/grant check** — row 7 is about
permissions. So the strict gate tags all **11**, each with a precise reason. This is a **strictly stronger**
guarantee than tagging only the 6, and it is written down here rather than discovered later. *(If the owner
prefers the looser "a guard counts as covered" definition, it is a one-line change to the test — noted, not
assumed.)*

---

## 5. Impact (what the change can touch)

- **`packages/cli`'s suite** gains one test file; nothing imports it.
- **11 route files** gain an inert `metadata` key. `extractMethodMetadata` ignores it; the OpenAPI `openApi`
  export is untouched; no handler changes.
- **No schema change, no migration.**
- The docs-repo `measure.js` is unchanged (it remains the independent evidence route).

---

## 6. RED-then-GREEN plan (the mutation proofs this build must pass)

1. **Un-gated new route:** add a scratch write route with neither a feature nor a marker → the gate goes RED.
2. **Marker removed:** delete the `byDesign` key from one tagged route → RED.
3. **Comment-only marker:** add a `// byDesign:` comment (no real key) → still RED (comment-proof, `C44c`).
4. **Comment-only feature:** add a `// requireFeatures:` comment to an un-gated route → still RED.
5. **Stale entry:** add a `byDesign` marker with no entry in the pinned map → RED.

Every mutation restores the file **md5-verified**.

---

## 7. OUTCOME

**Built 2026-10-11. Green.** The gate is `packages/cli/src/lib/generators/__tests__/write-gate-coverage.test.ts`
(4 tests); the **11** non-feature-gated routes carry the inert `byDesign` tag. Measured: **35** enabled modules ·
**170** write route files · **159** feature-gated · **11** by-design. **The contract `C44a`–`C44f` all hold**;
`C44b` (inert) is proven by reading `extractMethodMetadata` (`route.ts:104–133`) **and** by a `git stash` A/B on
the app typecheck (byte-identical with and without the tags).

**The hostile critic found 3 REAL defects in the FIRST draft's classifier** (a separate agent, command+output per
claim) — **all fixed, and the fixes proved FREE:**

1. **Empty-array false pass.** The ported predicate `/requireFeatures\s*:/` matched `requireFeatures: []`, but the
   runtime fires only `if (requiredFeatures.length)`. **Fixed:** the predicate is now a **non-empty array literal**
   whose first element is a string literal or an identifier.
2. **Regex / type-annotation false pass.** A bare `requireFeatures:` token inside a regex literal
   (`/requireFeatures:/`) or a TS type (`{ requireFeatures: string[] }`) counted as a gate. **Fixed** by the same
   non-empty-array requirement (the token has no `[` after `:`).
3. **The factory clause was unsound.** `makeCrudRoute(`/`make*Route(` counted as a feature carrier, but
   `makeCrudRoute` only **relays** `opts.metadata.requireFeatures` (`shared/src/lib/crud/factory.ts:1036`) and
   supplies nothing. **Fixed:** the clause is **removed** (measured: no route relied on it — 0 reclassified).

**The tightening is FREE (measured):** old and new predicates classify **159 / 11 / 170** — **0** routes change.

**A second critic pass** confirmed fixes 1 & 3 closed and found the honest residual: a regex **character class**
(`/requireFeatures: [abc]/`) or a **tuple type** (`[string]`) is indistinguishable from a real declaration by a
tokeniser. Recorded as the tool's **HONEST LIMIT** in the header (0 routes affected). `byDesign` now also requires
a **quoted reason**, so a bare token in a type does not count.

**RED-then-GREEN: 6 mutations, each restore md5-verified** (un-gated new route; marker removed; marker commented;
commented-feature-only; **empty array**; stale pinned entry). `tsc --noEmit` clean (cli prod + test-file, core,
webhooks). Green gates: cli `write-gate-coverage` 4/4 + `crud-read-gate-coverage` 9/9, core-targeted 25/25,
webhooks 127/127.

**SCOPE NOTE (measured, honest).** The gate is a **build** gate; the runtime dispatcher is unchanged. The docs-repo
`measure.js` is unchanged — it stays the independent evidence route, and it retains the looser predicate (a
*measurement* tool may be looser; a *gate* may not — lesson `L120`).

**A discovered, pre-existing defect — fixed in the same change (rule 13).** Running the sibling gates showed
`crud-read-gate-coverage.test.ts` (`CC-47`) **RED at HEAD** (`routeFiles` 457 vs 458, `getRoutes` 296 vs 297) and
`table-coverage.test.ts` (`CC-52`) **RED at HEAD** (`EXPECTED_TABLES` 233 vs 234) — both drifted by `CC-27`'s new
bindings **route** and **table**, neither re-pinned. Proven pre-existing by `git stash`. Pins corrected; both gates
GREEN. **Banked `L121`.**

**ONE NUMBER, two routes: 72 / 321 = 22% — unchanged.** Lessons: **`L120`**, **`L121`**.
