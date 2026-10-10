# PLAN — Row 16 / BUILD-ORDER item 18 — own / team row scope

**Status:** 🟡 MEASURED (rule 0b) — awaiting one owner decision (NY-20). No product code written yet.
**Register:** `platform_points.md` row 16 — *"You can restrict a person to their own rows / their team's rows,
not just their whole tenant."* (`P10` successor; BUILD-ORDER item 18: *"Per-user / own / team row scope (today
scope is tenant + organization only)."*)

---

## 1. What exists today (measured, 2026-10-10)

The read/write **scope** applied to every CRUD operation has exactly **three dimensions**, all resolved in
`packages/shared/src/lib/api/crud.ts` `buildScopedWhere()` and applied in `packages/shared/src/lib/crud/factory.ts`:

| Dimension | Source | Where set |
|---|---|---|
| `tenantId` | `auth.tenantId` | `factory.ts` `withCtx()` (`:1359`) |
| `organizationId` (single) | selected-org cookie / `auth.orgId` | `withCtx()` (`:1381-1412`) |
| `organizationIds` (allowlist) | `resolveOrganizationScopeForRequest` → `scope.filterIds` | `withCtx()` (`:1391-1410`) |

The resolver lives at `packages/core/src/modules/directory/utils/organizationScope.ts` (556 lines) and returns
`OrganizationScope = { selectedId, filterIds, allowedIds, tenantId, selectionRejected? }`.

**There is NO `ownerId` / `createdByUserId` / `userId` row dimension anywhere on the read path.** `ctx.auth.sub`
(user id) **is** read all over `factory.ts` — but only to **stamp audit/event records**, never to filter rows.
Measured: `grep -n "ctx.auth.sub" factory.ts` → 20+ hits, all in `userId:` event fields; **zero** in a `where`.

**There is NO `team` concept.** Measured: `grep -rni "team" packages/core/src/modules/auth --include=*.ts`
→ only incidental matches (a test file, an index re-export); no team entity, no team membership, no team id on
`auth`. `AuthContext` carries `{ sub, tenantId, orgId }` only.

## 2. The obstacle that decides the design — there is no owner column

`own rows` needs a **column that says whose row it is.** Measured across `packages/*/src/modules/*/data/entities.ts`:

- **No shared base entity** carries an owner. (`find … -name '*base*'` under data/entities → none.)
- Only a **scattered minority** of entities carry one, under **inconsistent names AND types**:
  - `api_keys`: `createdBy` (`created_by`, **uuid**)
  - `auth`: `createdByUserId` (`created_by_user_id`, **uuid**)
  - `customers` (CustomerInteraction): `createdByUserId` (`created_by_user_id`, **uuid**)
  - `business_rules`, `workflows`: `createdBy` (`created_by`, **varchar** — a *label*, not a FK to a user)
  - `workflows` UserTask: `assignedTo` (`assigned_to`, varchar) **and** `assignedToRoles` (`assigned_to_roles`, `text[]`)

Consequence: a blanket "filter every table by owner" is **impossible / meaningless** — most tables have no owner
column, and the ones that do disagree on name and type. So row 16 **must be an opt-in, per-entity declaration**
of which column (if any) is the owner and which is the "team".

## 3. Where such a declaration belongs (the single-source pattern)

The codebase already has exactly one per-entity declaration surface, built for row 15's sibling concern and
enforced by a coverage test (`search-acl-coverage.test.ts`, CC-46): **the search-entity registry**,
`packages/shared/src/modules/search.ts` — each module's `search.ts` declares entities with
`aclFeatures: [...]`. Row 15's CC-47 gate covers the CRUD routes. The natural home for a **row-scope rule** is
the same registry, extended with an optional `rowScope: { ownerField, teamField? }` per entity — so a new entity
declares its scope once, in the same place it declares its ACL features, and the same coverage-test pattern
(CC-46/CC-47) can enforce that a *new* entity does not silently drift.

## 4. Why this is not a 10-minute change (honest size)

A correct implementation touches:
1. the registry type (`shared/src/modules/search.ts`) + a `rowScope` declaration,
2. `buildScopedWhere()` / the `factory.ts` read+write paths, to AND in `ownerField = auth.sub` (or
   `ownerField ∈ teamMemberIds`) **only when the entity declares it and the caller's role says "own/team only"**,
3. a **role-level** switch (does this role see *all* rows in scope, or *own-only*, or *team-only*?) — this needs a
   place on the role/permission model,
4. a `team` concept (entity + membership) if "team" is to mean anything beyond "same organization",
5. the two-route + hostile-critic + RED-then-GREEN protocol, and a coverage test so a new table cannot drift.

## 5. The owner decision (NY-20) — one question, one recommendation

Because of §2 and §4, "own/team row scope" has a fork that changes what gets built and cannot be safely
defaulted by me:

- **Option A — OWN-only, opt-in per entity (RECOMMENDED).** Build the per-entity `rowScope` declaration +
  a role-level "own-only" switch, so an entity that declares an owner column can be restricted to
  `ownerField = caller`. **No new `team` entity.** Deliverable is real and bounded; "team" is explicitly
  deferred and named (a partial scheduled in `COMPLETION-CALLBACKS.md`), not silently claimed.
  If chosen: users of an entity whose role is own-only see only their own rows; a role with the normal
  (tenant/org) scope is unchanged. Nothing existing changes unless a role is switched to own-only.
- **Option B — OWN + TEAM.** As A, plus a real `team` entity + membership + `teamField` filter. Much larger:
  new entity, new membership management UI, new schema + migrations. Full row 16, but weeks not days.
- **Option C — correct the row's wording only.** Change row 16 to say the platform is **tenant+org scoped by
  design** and that per-row scope is a *plugin* concern, closing the row as accurately-scoped rather than built.
  (The honest-minimal option, mirroring what row 15 nearly turned out to be — but here the gap is real, not a
  falsified premise.)

**Recommendation: A.** It delivers the row's substance (a person CAN be restricted to their own rows) with a
bounded, testable change, and defers "team" with a scheduled callback rather than a vague promise. B is the
"full" reading of the row but should be its own decision once A exists.

## 6. What I will do next, once decided

Record the ruling in `NEEDS-YOU.md` (NY-20), then execute the chosen option under the full protocol
(hostile critic as a separate agent, RED-then-GREEN with md5-verified restores, two-route re-measure, green
gate, docs + commit — committing as I go, per the owner's batch instruction).

## 7. THE OWNER'S RULING (2026-10-11) — Option A, and **Option B is a FUTURE ADDITION, not dropped**

**Decision (owner, 2026-10-11): "We will currently do A but after you document B as a future addition."**

### 7.1 What is being built now — **Option A (own-only, opt-in per entity)**

The per-entity `rowScope` declaration + a role-level "own-only" switch, so an entity that declares an owner
column can be restricted to `ownerField = caller`. **No new `team` entity.** Delivers row 16's substance: a
person *can* be restricted to their own rows, and a role with the normal scope is unchanged.

### 7.2 What is deferred — **Option B (own + team) — the FUTURE ADDITION**

Recorded here so it is never lost (rule 8 / the owner's explicit instruction). **B = A plus a real `team`
concept**, which does not exist today in any form (measured 2026-10-11: no team entity, no membership, nothing
on `auth`). B needs, as its own project:

1. **A `team` entity + membership** — a table plus a many-to-many (user ↔ team), tenant/org-scoped, with its
   own CRUD and a manage screen. *(This is the item that makes B "large" — the rest of B is a filter.)*
2. **A `teamField` on the per-entity `rowScope` declaration** (B's only change to the row-scope mechanism A
   builds): where A filters `ownerField = caller`, B additionally allows `ownerField ∈ teamMemberIds(caller)`.
3. **A resolution step** in `buildScopedWhere()` / the scope resolver
   (`packages/core/src/modules/directory/utils/organizationScope.ts`) to expand "my teams" → the set of member
   ids, cached like the org scope (the file already has a short-TTL cache + tag invalidation to copy).
4. **A role-level third mode** — currently A's switch is all-or-own; B adds "team", so the role-level
   enumeration becomes `all | own | team`.
5. **Its own hostile-critic + two-route + RED-then-GREEN pass and a coverage test**, per A.

**Why it is genuinely deferred, not lazy:** §2 — the blocker is that there is **no team concept and no shared
owner column**. A can be built against the columns that exist; B must first invent a concept the platform has
never had, with a schema + migrations + UI, which is a project in its own right. **Trigger to bring B back:**
whenever the owner asks for team-based visibility, or when the first real caller needs it — whichever comes
first. Scheduled in `COMPLETION-CALLBACKS.md` (**`CC-51`**) with that trigger named.

### 7.3 Status of A

Recorded as the partial **`CC-50`**. Build proceeds under the full protocol; this section is updated with the
measured outcome when A lands (and `CC-50` closes).

**BUILT 2026-10-11 (Option A).** The mechanism is complete and proven end-to-end. Summary:
- **`buildScopedWhere()`** gained the optional owner dimension (no-op unless both `ownerField`+`ownerUserId`).
- **`featureMatch.ts`** gained the additive `.own` parser; `matchFeature` byte-unchanged.
- **`factory.ts`** gained `OrmEntityConfig.ownerField`/`ownerFeature`, `CrudCtx.rowScope`, resolution in
  `withCtx()` (fail-safe `null`; **dual** super-admin carve-out: `auth.isSuperAdmin` OR `acl.isSuperAdmin`), and
  threaded `rowScope` into all three verbs (list / update / delete).
- **`api_keys`** is the first real opt-in (`ownerField: 'createdBy'`, `ownerFeature: 'api_keys.view'`), including
  a fix to its custom **`beforeList`** hook, which builds its own query and would otherwise have leaked the list.
- **Coverage gate** `row-scope-coverage.test.ts`: enforces the `ownerField`/`ownerFeature` pair and rejects
  un-analysable `orm` shapes.
- **Tests:** shared `crud.test.ts` (owner dimension, no-op proven), shared `featureMatch.test.ts` (`.own` additivity),
  and `api_keys/keys.route.test.ts` (GET list own-restrict / plain-no-restrict / super-admin-no-restrict).
- **Hostile critic (separate agent, TWO rounds)** found and forced the fix of: (1) the `beforeList` list leak —
  a real defect the first draft missed; (2) the super-admin carve-out ignoring `auth.isSuperAdmin`; (3) the
  coverage walker's blind spot for shorthand/reference `orm`. All fixed; each fix has a RED-then-GREEN
  md5-verified mutation proof.
- **Two-route re-measure:** ONE NUMBER **unchanged at 72 / 321 = 22%** (my faithful script + a blind verifier's
  own script, section-for-section identical) — correct, because row 16 does **not** close: "team" is deferred
  (`CC-51`), so the row stays 🟡 and no unit flips.

**What remains open on row 16 (honest bound):** the row's text is *"own rows / their **team's** rows"*. A
delivers **own**; **team** is `CC-51`. So row 16 is **not ✅** — it is 🟡 with the own-leg built and the team-leg
scheduled. `CC-50` is closed as *"Option A built"*; the row itself stays open until either the owner rules the
team leg out of scope or `CC-51` is built.

---

## 8. THE REQUIREMENT (rule 10c) — written 2026-10-11, before code

**Task definition (BUILD-ORDER item 18 / `platform_points.md` row 16):** *"You can restrict a person to their
own rows / their team's rows, not just their whole tenant."* — reduced by the owner's ruling (§7) to **Option
A: own-only, opt-in per entity**.

**Relevant platform_points (chosen, with status):**
- **`P10` (the scope layer)** — *the read/write SCOPE is three dimensions, resolved in one builder.* **Status:
  FIXED** (measured: `buildScopedWhere()` §1). A adds a 4th, **opt-in** dimension to the same builder.
- **`P10b` (the ACL-feature gate on search tools)** — *a per-entity declaration is the single-source pattern
  for "who may read this entity".* **Status: FIXED** (`CC-46`, 53 entities declare `aclFeatures`). A reuses
  the **same declaration surface and the same coverage-test pattern**, extending it with `rowScope`.
- **`P11` (the permission engine)** — *one permission engine, grants in `role_acls.features_json`, never a
  second one* (S5). **Status: FIXED.** A's "own-only" switch must live **inside that same engine**, not as a
  parallel table.
- **Row 16 itself** — **Status: 🟡 IN PROGRESS.** A delivers its substance; B (own+team) is `CC-51`.
- **Rule 9(a)** (own the whole codebase you touch) and **rule 14** (a schema change during development is never
  "blocked") — both apply: A is not a fresh table, but it does touch the role model, and every prerequisite is
  re-measured here (rule 0b).

**What A builds (the contract):**

1. **A per-route opt-in declaration `ownerField` / `ownerFeature`** on the CRUD route's `orm` config
   (`OrmEntityConfig`, `packages/shared/src/lib/crud/factory.ts:188`), beside the existing `orgField` /
   `tenantField`:
   ```ts
   orm: {
     entity: ApiKey,
     orgField: null,
     ownerField: 'createdBy',        // the column that holds the owning user id (uuid)
     ownerFeature: 'api_keys.view',  // the view feature whose `.own` modifier turns restriction on
   }
   ```
   **Opt-in:** a route that declares neither is **unchanged** — the existing tenant+org scope applies exactly as
   today. `ownerField` and `ownerFeature` are declared **together** (the coverage test enforces the pair).

   > **RULE-13 CORRECTION (2026-10-11, during the build).** §3 and an earlier draft of this section said the
   > declaration belonged on the **search-entity registry** (`SearchEntityConfig.rowScope`). That was **WRONG**
   > and the error is corrected everywhere it was copied. Measured reason: the search registry exists only for
   > **11 searchable modules**; row scope must be declarable for **every CRUD entity**, and the first entity A
   > wires — **`api_keys`** — has **no `search.ts` at all** (measured: `find … api_keys -name search.ts` → none).
   > A declaration on the search registry would therefore be **unusable for the very entity that proves the
   > mechanism**. The correct single home is `OrmEntityConfig` — the same place `orgField`/`tenantField` live,
   > i.e. the actual per-entity CRUD declaration surface. `SearchEntityConfig` carries a **note** pointing here,
   > not a duplicate field (a second home would drift).

2. **A role-level "own-only" switch, inside the one permission engine.** The switch is a **feature-string
   modifier** — no new table, no second engine (S5 / `P11`). Grammar: a grant of `<feature>.own` (e.g.
   `api_keys.view.own`) means *"this role may only see rows it owns"* for that entity's read; the plain
   `<feature>` grant means *all rows in scope*. `matchFeature()` (`featureMatch.ts:25`) is **left byte-identical**
   — the `.own` parse is a small **additive** helper (`isOwnScoped` / `stripOwnScope` / `hasOwnScopeGrant`), so
   existing grants and every existing permission check are untouched (proven by the negative test: `.own` and the
   plain feature do **not** match each other). `is_super_admin` bypasses `rowScope` (unchanged).
   **Bootstrap note:** because `assertActorCanGrantAclSnapshot` requires the granting actor to already hold the
   feature, a `.own` grant can be issued by a holder of the module wildcard (`api_keys.*`, verified to match
   `api_keys.view.own`) or a super-admin — so there is no delegation deadlock.

3. **The scope builder gains an optional owner dimension.** `buildScopedWhere()` (`crud.ts:5`) takes
   `ownerField?: string | null` and `ownerUserId?: string | null` on its scope object; when **both** are present
   it ANDs `where[ownerField] = ownerUserId`. When `ownerField` is absent (the default for every existing
   caller) it is a **no-op** — byte-identical where-clause, so no existing caller changes.

4. **The single resolution point is `withCtx()`** (`factory.ts:1358`) — it already resolves the org scope and
   sets `ctx.organizationIds`. A adds `ctx.rowScope: { ownerField: string; ownerUserId: string } | null`,
   populated **only when** (a) the route declares `ownerField`+`ownerFeature` in its `orm` config, **and** (b) the
   caller's effective feature grants carry the `.own` modifier for that feature. The three existing
   `buildScopedWhere` call sites (`:2029` list, `:2701` update, `:3044` delete) then pass `ctx.rowScope` through.
   The **write paths** (update `:2701`, delete `:3044`) honour it too: an own-only role cannot update/delete a row
   it does not own. **Fail-safe:** any resolution error yields `rowScope: null` = today's scope (owner-scoping
   only ever *narrows*; it never fails closed into a lockout).

5. **A coverage test**, same shape as `search-acl-coverage.test.ts` (CC-46): a static walker over every route's
   `orm: { … }` config asserts `ownerField` and `ownerFeature` are declared **together** and are both non-empty
   string literals. Because A is opt-in, the test does **not** demand 100% coverage — it enforces
   **well-formedness** of whatever *is* declared, which is the correct invariant for an opt-in surface.

**What A explicitly does NOT build (so it cannot drift into B):** no `team` entity, no membership, no
`teamField` resolution, no third role mode. Those are `CC-51` (§7.2) with the trigger named.

**Acceptance criteria (all must hold, each with an observation):**
- A1 Unit ✅: `buildScopedWhere(base, { …, ownerField: 'createdBy', ownerUserId: 'u1' })` ANDs `createdBy: 'u1'`;
  and with `ownerField` absent the result is byte-identical to today's.
- A2 Unit ✅: `.own` parsing — a grant `x.y.own` is recognised for `x.y`; a plain `x.y` is **not**; and
  `matchFeature` is unchanged (`.own` ≠ plain, both directions).
- A3 Integration (two routes): an own-only role listing a declared entity sees **only its own rows**; the same
  role on an entity it does **not** own-scope sees all in-scope rows (proves opt-in, proves no regression).
- A4 Write: an own-only role **cannot** update/delete a row it does not own (404/403), and **can** update its own.
- A5 Coverage test: a route declaring `ownerField` without `ownerFeature` (or an empty string) fails the walker.
- A6 Coverage test: no existing entity is forced to change (opt-in) — the full existing suite stays green.

**Prerequisite proof (rule 0b — re-measured 2026-10-11, before writing the requirement):** recorded in §9.

---

## 9. PREREQUISITE PROOF (rule 10d / rule 0b) — every prerequisite measured in code, 2026-10-11

Every row below is an **observation from the code**, not prose. Path:line is the observation.

| # | Prerequisite | Observation | Verdict |
|---|---|---|---|
| 1 | The scope builder is single and extensible | `packages/shared/src/lib/api/crud.ts:5` `buildScopedWhere(base, scope)` — one function, `Scope` = `{ organizationId?, organizationIds?, tenantId? }` + `orgField/tenantField/softDeleteField` overrides | **READY** — extend `Scope` with `ownerField?`/`ownerUserId?` |
| 2 | Its call sites are finite and known | `grep -rn buildScopedWhere` → **3 live call sites in `factory.ts`** (`:2029` list, `:2701` update, `:3044` delete) + 2 direct callers (`catalog/products/route.ts:418`, `currencies/commands/scope.ts:19`) + unit tests | **READY** — 5 call sites to thread through |
| 3 | The read/write ctx already carries a resolved scope | `factory.ts:501` `CrudCtx = { container, auth, organizationScope, selectedOrganizationId, organizationIds, request }`; built in `withCtx()` `:1358`–`:1412` | **READY** — add one field `rowScope` |
| 4 | `withCtx()` is the single resolution point | `factory.ts:1377-1412` computes `scopedTenantId`/`scopedOrgId`/`organizationIds` once and returns the ctx | **READY** — resolve `rowScope` here, once |
| 5 | The per-entity CRUD declaration surface exists | `factory.ts:188` `OrmEntityConfig = { entity, idField?, orgField?, tenantField?, softDeleteField? }` — the `orm:{}` block each route passes to `makeCrudRoute` | **READY** — add `ownerField?`/`ownerFeature?` beside `orgField` (corrected from the search registry — see §8 rule-13 note) |
| 6 | A coverage-test pattern to copy exists | `packages/cli/src/lib/generators/__tests__/search-acl-coverage.test.ts` — static `typescript-js` AST walker over every `search.ts`, asserts each entity's `aclFeatures` (CC-46) | **READY** — copy the shape; walk `orm:{}` blocks for `ownerField`/`ownerFeature` pairing |
| 7 | The permission engine is ONE engine; grants are `role_acls.features_json` | `packages/core/src/modules/auth/data/entities.ts:350` `RoleAcl.featuresJson` (json, `string[]`); `rbacService.ts:627` `hasAllFeatures(required, filterGrantsByEnabledModules(acl.features))` | **READY** — the `.own` modifier is a new **feature-string suffix**, no new table (S5) |
| 8 | Feature matching is a single primitive that can take a suffix | `packages/shared/src/lib/auth/featureMatch.ts:25` `matchFeature(required, granted)` — handles `*`, `prefix.*`, exact; `shared/src/security/features.ts:4` `hasFeature` wraps it | **READY** — add an additive `.own` parse; existing grants unchanged |
| 9 | Super-admin bypass exists and is separate | `rbacService.ts:620` `if (acl.isSuperAdmin) …`; `role_acls.is_super_admin` (`entities.ts:354`) | **READY** — own-only must not weaken the super-admin bypass |
| 10 | An owner column exists on *some* entities, under inconsistent names | `api_keys.createdBy` (uuid), `auth.createdByUserId` (uuid), `customers.CustomerTodoLink.createdByUserId` (uuid); (varchar labels: `business_rules`/`workflows.createdBy`) | **READY for A (opt-in)** — declare `ownerField` only where a uuid owner column exists |
| 11 | No `team` concept exists | `grep -rni team packages/core/src/modules/auth` → incidental only; `AuthContext = { sub, tenantId, orgId }` | **CONFIRMS B is a separate project** (`CC-51`), not a prerequisite of A |
| 12 | The enabled-module filter must be respected | `packages/shared/src/security/enabledModulesRegistry.ts:105` `filterGrantsByEnabledModules` | **READY** — the `.own` capability is filtered like any feature |
| 13 | Node 24 toolchain present (tsc/jest) | `node --version` → **v24.19.0**; `node_modules/typescript/bin/tsc`, `node_modules/jest/bin/jest.js` present | **READY** — gate runnable |
| 14 | Migration convention exists (needed only if a column is added) | `packages/core/src/modules/auth/migrations/Migration20261009220000.ts` (latest); raw-SQL pattern used for partial indexes | **READY** — A needs **no** migration (feature-string only); recorded so B is unblocked |

**Conclusion (rule 10d):** every prerequisite for **Option A is present and flawless today** — the builder, its
five call sites, the ctx resolution point, the per-entity declaration surface, the coverage-test pattern, the
single permission engine and its matcher. **No prerequisite is missing and none must be built first.** A is
therefore buildable now, under the full protocol. **Option B's blocker (no team concept, row 11) is confirmed
and correctly deferred as `CC-51`.**

**One risk noted up front (rule 9b — challenge the task):** the `.own` switch is only meaningful on entities
that actually carry a uuid owner column **and** are wired through the CRUD factory. At the time of writing, the
declared opt-in set is **small** (§8.1). A therefore delivers the *mechanism*, proven end-to-end on at least one
real entity, and the coverage test keeps the surface well-formed as more entities opt in. The report of "row 16
done" must state this honestly: **the mechanism is complete; the per-entity opt-in set is deliberately small
and grows by declaration** — that is the correct end-state for an opt-in design, not a shortfall.

---

## 10. IMPACT TRACE (rule 10e) — what A touches, and why nothing else can break

Measured 2026-10-11, before writing code.

| Surface | Change | Blast radius | Safety argument |
|---|---|---|---|
| `shared/src/lib/api/crud.ts` `buildScopedWhere()` + `Scope` type | add **optional** `ownerField?`/`ownerUserId?`; AND the owner clause only when both set | 5 call sites + unit tests | **Additive & opt-in.** With `ownerField` absent the function's output is byte-identical (verified by the existing `crud.test.ts` staying green). |
| `shared/src/modules/search.ts` `SearchEntityConfig` | add **optional** `rowScope?` | the registry type only; no runtime reader today | **Additive.** No entity declares it → nothing changes. |
| `shared/src/lib/crud/factory.ts` `CrudCtx` | add `rowScope: RowScope \| null` | every reader of `CrudCtx` (216 `organizationIds` matches, but none reads `rowScope` — new field) | **Additive.** New field; existing readers unaffected. |
| `factory.ts` `withCtx()` (`:1364`) | resolve `rowScope` once, from `ormCfg.ownerField` + the actor's ACL `.own` grant | the 3 factory call sites | **Single resolution point** — mirrors how `organizationIds` is resolved here today. Wrapped in try/catch so a resolver failure yields `rowScope: null` (**fail-safe = today's behaviour**, not a lockout). |
| `factory.ts` `OrmEntityConfig` | add `ownerField?: string \| null` (mirrors `orgField`) | routes that build `orm:` config | **Additive.** Default `null` → no owner scoping, unchanged. |
| `factory.ts` `:2029` / `:2701` / `:3044` | pass `ctx.rowScope` into `buildScopedWhere` | the 3 CRUD verbs | Each passes the field through; absent → no-op. |
| `shared/src/lib/auth/featureMatch.ts` (+ a small helper) | recognise a `.own` **suffix** | every `hasFeature` caller (102 permission checks) | **The suffix must NOT change existing matching.** A grant of `x.y` must NOT match a required `x.y.own` and vice-versa, except through the *new* helper. Existing exact/`prefix.*`/`*` behaviour is untouched — proven by the existing feature-match tests staying green. |
| `packages/cli/…/__tests__/` | new `row-scope-coverage.test.ts` | new file only | **Additive.** |

**Nothing in `apps/mercato/.../[...slug]/route.ts` changes** — the feature gate there (`checkAuthorization`) stays exactly as-is (`CC-44` remains the separate, owner-held finding). A's `.own` resolution is a **factory-side** concern, deliberately kept off the route dispatcher so the two never entangle.

**Rule 13 sweep (does A falsify any premise?):** No. A is additive; the wording "today scope is tenant +
organization only" (row 16 / BUILD-ORDER 18) stays true for every entity that does not opt in, and the plan's
§1/§2 measurements (no owner dim, no team concept) are re-confirmed in §9 and remain accurate.

**Plan updates required by A (rule 10e):** `PLAN-ROW16` §7.3 (status → built), `COMPLETION-CALLBACKS.md`
(`CC-50` close + `CC-51` unchanged), `BACKLOG.md` (`▶ FRONTIER` row 16 → ✅; `N-20`/`N-21` untouched),
`platform_points.md` (row 16 tick + ONE NUMBER re-derived per §L), `JOURNAL.md` (`★ ACTIVE TASK` → row 17),
`HANDOVER.md` (revision bump), `NEEDS-YOU.md` (NY-20 already decided), `LESSONS.md` (rule 7 — add this build's
lessons in the same change).
