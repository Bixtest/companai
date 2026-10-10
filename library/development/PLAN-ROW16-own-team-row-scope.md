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
