# PLAN — `SD-1`: the S2 permissions gate (Phase 1)

**Status:** IN PROGRESS — the startable slice (catalogue + gate + hook) is being built this session.
**Task source:** the `★ ACTIVE TASK` box in `JOURNAL.md` (posted 2026-10-08, after `S-02`).
**Predecessor:** `PLAN-S-02.md` (same discipline: fact-check → plan → execute → verify → document).

---

## 1. The task, in the box's own words

> When a **new data structure lands** — a table, a column, a field-type change — the platform **must not
> apply it until the permissions for the new surface are decided**. Either a person decides, or the
> default applies (full grant to the superadmin role **+ the permission records created**). It is the gate
> that makes the *structural grammar* (SD-4) real: a permission surface cannot appear un-gated, and it is
> the gate a **Hermes-proposed schema change** must pass — the AI proposes, the gate decides, and there is
> no way around it.

## 2. The relevant `platform_points` (step 2 — picked, not guessed)

| Point | What it says | Bearing on SD-1 |
|---|---|---|
| **S2 (= SD-1)** | Every architectural change answers the permissions question: catalogue + fail-closed gate | **the task itself** — the owner's "critical" standard |
| **S11 (= SD-4)** | Structural permissions explicit, per object and per verb, inherited by default | the **second block** (amended S2); SD-4 builds the grammar, SD-1 installs the block |
| **C5** | Metadata Registry & schema conventions | the **enumerator** the gate needs to *list what it is gating* (registry landed 2026-10-07, `59ab859`) |
| **P3** | Roles & permissions (RBAC/ACL) — *two-table ACL real; no permissions catalogue = SD-1* | the store the records go into (S5: one engine) |
| **S5** | One permission engine, never a second one | the records go into the **existing** ACL store, not a parallel scheme |
| **M3** | The permissions catalogue (= SD-1) | the cross-reference; same item |
| **S1** | Every architectural change is gated and inspected before it is applied | the gate's shape |
| **S12** | The actor type is part of every structural decision | a later axis (SD-4); SD-1 does not infer it |

## 3. The requirement (task definition + points, combined — step 3)

**Build the permissions-on-change gate: when a new data structure lands, the platform must not apply it
until the permissions for the new surface are decided — either by a person, or by the default (full grant
to the superadmin role + the permission records created). It is a build, not a check: a catalogue + a hook
on the change path + the fail-closed gate. The catalogue is startable now; the full data-axis shape waits
on `G-04`, and the structural-permission grammar (per object × verb × level) is `SD-4`.**

## 4. Fact-check (step 4 — what is actually there)

Measured in the code repo, this session:

| Claim | Observation |
|---|---|
| **No permission catalogue exists** | `grep -rln "permissionCatalogue\|permission_catalogue\|permission_record\|PermissionCatalogue" packages --include=*.ts` → **no files**. The measured gap stands. |
| Permissions are string arrays, not records | `packages/core/src/modules/auth/data/entities.ts:272` `RoleAcl` / `:307` `UserAcl` — both carry `features_json` (`type:'json'`), `isSuperAdmin`, tenant-scoped. `role_acls` + `user_acls`. |
| The feature check is a pure string match | `packages/shared/src/security/features.ts` — `hasFeature` / `hasAllFeatures`, wildcard-aware, over `string[]`. |
| A **capability registry** already exists (Point 7's home) | `packages/shared/src/lib/capabilities/registry.ts` — indexes `CapabilityDescriptor`s declared in each module's `acl.ts`. "It deliberately holds no policy." Descriptor shape: `packages/shared/src/modules/capabilities.ts`. |
| The **tier vocabulary** already exists (D1/SD-3) | `packages/shared/src/lib/request-outcome/types.ts` — `ChangeRiskTier = 'safe'\|'review_required'\|'explicit_approval'`; `tier-source.ts` — `StructurePermissionLevel = 'straight'\|'review'\|'approval'\|'never'`, `TIER_TO_LEVEL`, `resolveTier`, fail-closed to `explicit_approval`. |
| The **change path is a MutationGuard socket** | `packages/shared/src/lib/crud/mutation-guard-registry.ts` — `MutationGuard { id, targetEntity, operations, priority, features?, validate, afterSuccess? }`, result `{ ok, status?, message?, escalation? }` (D3 added `escalate`). Registered in a global store (`mutation-guard-store.ts`); run by `runRouteMutationGuards()`. |
| The entities module already ships structural guards | `packages/core/src/modules/entities/data/guards.ts` — `entities.field_definition.no-reserved-key`, `entities.field_definition.key-shape`, both `operations:['create','update']`. The socket is real and in use. |
| The entities change path calls the guard wrapper | `packages/core/src/modules/entities/api/definitions.ts:518` (`POST` → `beginEntitiesMutationGuard` with `resourceKind: FIELD_DEFINITION_RESOURCE_KIND`, `operation: create\|update`), and `entities.ts:154/224` for entities. |
| **DB-backed code is unprovable on this host** | `packages/shared/src/lib/user-function/document.ts:22-28` — *"this project tests DB-backed code against a **mocked** EntityManager, so a migration written now would be **unprovable**"*. The unit suites (`packages/{shared,core}/jest.config.cjs`) mock the EM. A testcontainers harness exists in the CLI (`packages/cli/src/lib/testing/integration.ts`) but is not the unit-suite path. **A new DB table + migration is therefore not shippable this session.** |

**Consequence for the design.** The catalogue must be a **typed, testable `shared` service** — the same
shape as the metadata registry, the capability registry and the request-outcome module — not a new DB
table. The **hook** is a `MutationGuard`, the socket the change path already runs through. The **record
write** into the ACL store is a caller step (DB, mocked), so SD-1 produces the *records to write* and the
*decision*, and states the write as an honest boundary rather than faking it.

## 5. The design

### 5.1 The permission catalogue — `packages/shared/src/lib/permissions/catalogue.ts`

A typed registry of **permission surfaces** — the governable things a structure change creates.

- A `PermissionSurface` is `{ id, kind, owner, source }` where `kind ∈ {object, field, function, widget, agent}`
  (the objects `ARCHITECTURE-structure-permissions.md` §2 enumerates) and `source ∈ {declared, recorded}`.
- `permissionRecordsFor(surface)` returns the **two blocks** the amended S2 requires:
  - the **data block** — who may read/write the *values* (`<id>.view`, `<id>.manage`); and
  - the **structural block** — who may add/edit/remove/reference the *object* (`<id>.structure`), whose
    per-verb levels are **SD-4's** to expand.
- The catalogue can be **populated from the declared features** (`fromAclFeatures`) and **extended by a
  recorded surface** (`record()`), so a runtime surface (a custom field, a saved Function) has a home.
- It **holds no policy** — the same rule the capability registry follows.

### 5.2 The gate — `packages/shared/src/lib/permissions/structure-change-gate.ts`

A **pure** decision over an already-loaded input (no await, no container, no clock — the `triage.ts`
contract), returning a typed outcome:

- `decided` — a person made the decision; the records are the decision's.
- `defaulted` — no decision; the default applies: **full grant to the superadmin role + the records**.
- `refused` — the gate cannot establish the permissions; **the change must not land** (fail closed).

**Fail-closed rules** (each reachable, each tested):
1. **no surfaces** → `refused` — a structure change that creates nothing is a defect, not a pass.
2. **an unrecognised surface kind** → `refused` — "we did not recognise this" is never evidence it is safe.
3. **an unreachable catalogue** → `refused` — the source study's warning, applied to the change path.
4. otherwise → `defaulted` (or `decided` when a decision is present).

### 5.3 The hook — a `MutationGuard` on the change path

A structural guard on `entities.field_definition` (and `entities.entity`), `operations:['create']`, that
runs the gate for the surface the payload creates and **blocks** (`ok:false`, HTTP 422, with a reason —
dictionary S3: *tell the user why*) when the gate refuses. Registered in
`packages/core/src/modules/entities/data/guards.ts`, so it reaches the global store by the same path as
the existing guards — not a per-route hand-wired call.

### 5.4 The honest boundary (stated now, not discovered later)

- **Persistence of recorded surfaces is not built.** A recorded runtime surface lives in the catalogue for
  the process; the durable row is deferred, exactly as `document.ts` deferred the Function row, because a
  migration is unprovable on this host. **Trigger: `G-04` (the data-axis layer) — the row lands with it.**
- **The structural grammar (per object × verb × level) is `SD-4`.** SD-1 installs the block; SD-4 fills it.
- **The data-axis row shape is `G-04`.** SD-1 produces the data-block records; the row-level rule is G-04's.
- **The ACL write is a caller step.** SD-1 returns the records to grant; writing them to
  `role_acls.features_json` is the route's, through the existing store (S5).

## 6. Verification protocol (step 5)

- Unit tests for the catalogue and the gate, and a guard test through the registry runner.
- **RED-then-GREEN mutation proof** across ≥4 disjoint mutations, each reverted and **md5-verified
  byte-identical** (the encoding trap: write bytes / `newline='\n'`).
- The `shared` and `core` suites + typecheck.
- A **separate hostile-critic pass** demanding a command+output for every claim.

---

## 7. What was built

| File | What it is |
|---|---|
| `packages/shared/src/lib/permissions/catalogue.ts` **(new)** | The permission catalogue: a typed registry of **permission surfaces** and the records each yields (a **data block** + a **structural block**). `permissionRecordsFor`, `declareSurfaces`, `recordSurface`, `hydrateCatalogueFromFeatures`, `isPermissionSurfaceId`, `isPermissionSurfaceKind`, `objectSurfaceIdFromFeatureId`. Holds no policy (S5). |
| `packages/shared/src/lib/permissions/structure-change-gate.ts` **(new)** | `evaluateStructureChange(input)` → `decided \| defaulted \| refused`. Pure (no await/container/clock). Fail-closed refusals: `no_surface`, `malformed_surface_id`, `unrecognised_surface_kind`, `empty_decision`. `DEFAULT_GRANT_ROLE = 'superadmin'`. |
| `packages/core/src/modules/entities/data/guards.ts` **(modified)** | The **hook**: two `MutationGuard`s (`entities.field_definition.requires-permission-decision`, `entities.entity.requires-permission-decision`, both `operations:['create']`) that run the gate for the surface a create lands and **block (422)** when the gate refuses. Registered in the exported `guards` array, so they reach the global store by the same path as the existing guards. Exported helpers `fieldDefinitionSurface` / `entityDefinitionSurface`. |
| `packages/shared/src/lib/permissions/__tests__/catalogue.test.ts` **(new)** | 13 tests. |
| `packages/shared/src/lib/permissions/__tests__/structure-change-gate.test.ts` **(new)** | 13 tests. |
| `packages/core/src/modules/entities/data/__tests__/guards.sd1.test.ts` **(new)** | 11 tests. |

### 7.1 The enforcement half — step 1 of §10, built 2026-10-08

| File | What it is |
|---|---|
| `packages/core/src/modules/auth/lib/permission-decision-grant.ts` **(new)** | **The write.** `applyPermissionDecisionGrant(em, { tenantId, grantTo, records })` applies the gate's `defaulted` outcome to the tenant's grant role through the **existing** roles-and-permissions store (`role_acls.features_json`, S5). Finds the role by name+tenant (`resolveGrantRole`), finds/creates its `RoleAcl`, and merges the records as a **set-union** (idempotent). Never sets `isSuperAdmin` to `true`, never changes an existing flag, never touches `organizationsJson`. Returns `{applied:true,…}` or `{applied:false, reason:'role_not_found'|'no_records', because}`. |
| `packages/core/src/modules/entities/data/guards.ts` **(modified)** | The two SD-1 guards gained `afterSuccess`. `runStructureChangeGate` now returns `shouldRunAfterSuccess:true` + `metadata.permissionDecision`; `writeGateDecisionGrant` resolves the request EM (`createRequestContainer`, the `customers/data/guards.ts` pattern), calls `applyGateDecisionToGrantRole`, and logs at `error` when it cannot apply. **The decision is now carried from `validate` to `afterSuccess` and written.** |
| `packages/core/src/modules/auth/lib/__tests__/permission-decision-grant.test.ts` **(new)** | 13 tests — the write, with a mocked EM. |
| `packages/core/src/modules/entities/data/__tests__/guards.sd1-write.test.ts` **(new)** | 12 tests — the wiring, **including a test through the real `runMutationGuards` runner** (the metadata wire a hostile critic proved was untested). |

### 7.2 The batch create path — step 1 of §10, built 2026-10-08

**The shape chosen, and why.** The register (CC-2) allowed either *"the created keys are passed into the guard"* or *"the gate is run at the route's `if (!def)` branch"*. **The route was chosen**, after fact-checking both:

- The batch route knows which keys are **new** only *inside* its transaction, after its prefetch. Passing them into the guard would mean either a **pre-query outside the transaction** — a real miss window (a key deleted between the pre-query and the transaction is then *created* ungated) — or moving the guard call inside the transaction and changing its `operation` to `'create'`, which would silently **drop the bridged legacy guard** (`operations: ['update','delete']`) from this path. Both are worse than the churn they save.
- Gating at the route is **precise and TOCTOU-free**: the new-key set comes from the same prefetch the writes use.
- **The policy does not move.** The surfaces still come from `fieldDefinitionSurface`, the decision from the shared pure gate, and the write from the shared `applyStructureChangeGrant` — the same three the guard uses. Only the *trigger* moved, to the one place that knows the fact.

| File | What it is |
|---|---|
| `packages/core/src/modules/entities/api/definitions.batch.ts` **(modified)** | Runs `evaluateStructureChange` inside the transaction for the keys it finds **no existing definition row** for (and that will be written **active** — a tombstone is not a column). A refusal **rolls the whole batch back and returns 422** before anything lands. A `defaulted` outcome is written **after the commit** through `applyStructureChangeGrant`; a write failure is **logged at `error`, never turned into a 500** for a save that already landed. The guard call is left **exactly as it was** (`operation: 'custom'`), so no other guard's behaviour changes. |
| `packages/core/src/modules/auth/lib/permission-decision-grant.ts` **(modified)** | New `applyStructureChangeGrant(em, { tenantId, decision })` — the **one** mapping from a gate outcome to the write (only `defaulted` is written). The guard's `applyGateDecisionToGrantRole` now delegates to it, so the guard and the batch route cannot drift. |
| `packages/core/src/modules/entities/data/guards.ts` **(modified)** | `applyGateDecisionToGrantRole` delegates to `applyStructureChangeGrant`; the scope comment that named the batch path as an open hole is corrected. |
| `packages/core/src/modules/entities/api/__tests__/definitions.batch.sd1.test.ts` **(new)** | 7 tests — the create path is gated: a new column runs the gate and grants its records; every new column in one decision; **no gate** for an update or a tombstone; a refusal rolls back with 422 and persists nothing; the write happens **after** the commit; a failing write still returns 200. |
| `packages/core/src/modules/auth/lib/__tests__/permission-decision-grant.test.ts` **(+3 tests)** | The shared mapping's contract: `defaulted` is written; `decided` and `refused` are not. |
| `packages/core/src/modules/entities/data/__tests__/guards.sd1-write.test.ts` **(modified)** | Its mock follows the refactor: it now stands in for `applyStructureChangeGrant`, and the suite proves the **wire** (the decision is carried out of `metadata` and handed over) — the mapping's own contract is proved in the module's test, where it now lives. |

### 7.3 The non-request create paths (module install / CLI) — step 2 of §10, built 2026-10-08 (CC-3)

**The premise was wrong, and the fact-check found it.** CC-3 called these "non-request paths, the same class as `S-02`'s non-request limits" — which would have allowed *naming* them instead of gating them. **They are not purely non-request:** `install-from-ce.ts` is reached from the definitions **GET** route (`api/definitions.ts:264`, `createOnly: true`, behind `entities.definitions.manage`). So a request *can* materialise module-declared columns. The decision is therefore **gate, not name**.

**The shape chosen, and why.** The two sites CC-3 named (`field-definitions.ts` via `install-from-ce.ts`, and `cli.ts`) are not the whole surface: `ensureCustomFieldDefinitions` is the **shared primitive** behind the install/sync, the `resources`/`staff`/`catalog`/`checkout`/`sync_akeneo` seeds and the `customers` CLI — **seven** callers. Gating the primitive is what makes the S2 invariant uniform, and it is the direct lesson of CC-2: a gate at the wrong layer leaves a path open. The `add-field` CLI creates a row **directly**, so it is gated separately with the same helpers.

**Two phases, deliberately split.** The gate is decided **before** anything is created (a refusal must stop the landing, not follow it — so `decideNewFieldPermissions` throws, and the creates never run), and the default's records are written **after** the flush (the surface must exist first). The "new surface" set is computed to match **exactly what the loop lands**: a key with no row, or a tombstone the sync reactivates — but **not** a tombstone under `createOnly`, where the loop never reactivates (it skips updates). Getting that wrong would grant records for a column that never appears.

| File | What it is |
|---|---|
| `packages/core/src/modules/entities/lib/field-definitions.ts` **(modified)** | The gate, wired into the shared primitive. Exports `isActiveColumn`, `decideNewFieldPermissions(surfaces)` (evaluate; throw on refusal) and `writeFieldPermissionGrant(em, tenantId, decision)` (log at `error` on failure; skip a global surface at `debug`). `ensureCustomFieldDefinitions` computes the new-surface set from the prefetch, decides before the loop, and writes after the flush. |
| `packages/core/src/modules/entities/cli.ts` **(modified)** | `add-field` runs the same two helpers around its create **or reactivation** (it flips `isActive`), and now clears `deletedAt` on an update, matching the primitive. |
| `packages/core/src/modules/entities/lib/__tests__/field-definitions.sd1.test.ts` **(new)** | 9 tests — a new field is gated and granted after the flush; every new field in one decision; no gate for an update-only call; **gates a reactivation**; **no gate for a tombstone under `createOnly`**; no gate on a dry run; a malformed key refuses (throws, creates nothing); a global surface is not granted; a failed grant still returns the counts. |
| `packages/core/src/modules/entities/__tests__/cli-add-field.sd1.test.ts` **(new)** | 5 tests — the CLI gates a create and grants after it lands; **gates a reactivation**; no gate for an update that keeps the field active; a malformed key refuses and creates nothing; a global field is not granted. |
| `packages/core/src/modules/entities/lib/__tests__/field-definitions.test.ts` **(modified)** | Its grant module is stubbed so the sync assertions stay focused (its own contract is proved in the new suite). |

### 7.4 The HTTP reactivation paths — step 1 of §10, built 2026-10-08 (CC-22)

**What it is.** A field brought back from a tombstone is a permission surface **re-appearing**, so it must not land until the gate has decided — exactly as a create must not. Two routes bring a field back: the single-definition POST (`definitions.ts`, an existing **inactive** row saved active) and the restore POST (`definitions.restore.ts`). Both reach the registry as `'update'` (`operation: def ? 'update' : 'create'` and `operation: 'custom'` both map to `'update'`), so the create-only gate guard never sees them.

**The shape chosen, and why — gate at the route, not relabel the operation.** The CC-22 row offered two options: relabel the operation `'create'` when the row is a tombstone, or gate at the route. **Relabelling was rejected for the same reason CC-2 rejected it for the batch:** it would fire the create-only gate guard, but it would also **drop the bridged legacy guard** (`operations: ['update','delete']`) that the route needs on its update path. So the gate runs **at the route**, on the before-state the route has already loaded, against the same `fieldDefinitionSurface` and the same `writeFieldPermissionGrant` every other create path uses — **one gate, one write, whichever path a column lands by**.

**Fail-closed.** A refusal returns **422 and writes nothing** (the row is left as it was). Granting happens **after the flush**, so the surface exists first.

| File | What it is |
|---|---|
| `packages/core/src/modules/entities/api/definitions.ts` **(modified)** | The single-definition POST. `reactivatesField = !!def && !isActiveColumn(def) && (input.isActive ?? true)`; if so, `evaluateStructureChange([fieldDefinitionSurface(entityId, key)])`; `refused` → 422; after the flush, `writeFieldPermissionGrant(…, 'the re-activated custom field')`. On a **create** the decision is `null`, so the grant early-returns and the route never competes with the create-only guard. |
| `packages/core/src/modules/entities/api/definitions.restore.ts` **(modified)** | The restore POST — same shape, `reactivatesField = !isActiveColumn(def)`, label `'the restored custom field'`. The `def` lookup 404s before the gate is reached. |
| `packages/core/src/modules/entities/lib/field-definitions.ts` **(modified)** | `writeFieldPermissionGrant` gained a 4th, **log-only** parameter `what = 'the new custom fields'`, so a create and a reactivation log distinctly. The default preserves every existing caller's wording exactly (proved inert — it appears only inside `logger.*` templates). |
| `packages/core/src/modules/entities/api/__tests__/definitions.reactivation.sd1.test.ts` **(new)** | 9 tests across both routes: a reactivation is gated and granted after the flush; **a create is not gated by the route** (and, with a real guard registered, the route contributes zero grants — it never competes with the create-only guard); an active update is not gated; a deactivation is not gated; re-saving a tombstone as still inactive is not gated; a restore is gated and granted; restoring an already-active row is not gated; a malformed surface id refuses and restores nothing (fail-closed); a missing row 404s. |

### 7.5 The custom-entity install path — step 1 of §10, built 2026-10-08 (CC-21)

**What it is.** A custom **entity** appearing is a permission surface appearing (S2) — and for an entity the records **are** the live ones (`entities.records.<id>`, the same ids `recordFeatures.ts` derives). The **HTTP** create path is already gated: the registry guard `entities.entity.requires-permission-decision` fires on `operation: 'create'` under `ENTITY_DEFINITION_RESOURCE_KIND = 'entities.entity'` (proved in `entities/data/__tests__/guards.sd1.test.ts`). But the **module install** path — `install-from-ce.ts` → `upsertCustomEntity` (`entities/lib/register.ts`) — creates the `CustomEntity` row with **no gate**. CC-21 closes it.

**Where the gate runs, and why — the primitive, not the caller.** The same choice CC-3 made for fields: gate at the **single choke point**, so no second call site can be forgotten. `upsertCustomEntity` is that choke point for module-created custom entities (the only production caller is the install; the HTTP route has its own inline create and is already gated). It knows the before-state itself (the row it finds inside its transaction), so it needs nothing from the caller. **One gate, one write, whichever path an entity lands by** — the same `evaluateStructureChange` + `entityDefinitionSurface` + `writeFieldPermissionGrant` the field paths use.

**The predicate.** `lands = !dryRun && (!ent || (!createOnly && !isActiveEntity(ent)))` — a **create** (no row), or a **reactivation** (an inactive / tombstoned row saved active) under a non-`createOnly` sync. A `createOnly` sync never reactivates (it skips updates) and a dry run lands nothing, so neither is gated — mirroring `ensureCustomFieldDefinitions` exactly. Decided **before** the create; granted **after** the flush.

**Fail-closed.** A malformed surface id (an entity id the permission matcher cannot read) makes the gate refuse → the primitive **throws, creating nothing** and granting nothing. Same contract as the field primitive's `decideNewFieldPermissions`.

| File | What it is |
|---|---|
| `packages/core/src/modules/entities/lib/register.ts` **(modified)** | `upsertCustomEntity` gained the before-state gate: `lands` computed from `ent`/`createOnly`/`dryRun` before any write; `evaluateStructureChange([entityDefinitionSurface(entityId)])`; `refused` → **throw**; `writeFieldPermissionGrant(tem, tenantId, decision, 'the new custom entity' \| 'the re-activated custom entity')` after each `flush` (both the create branch and the update branch). Imports `entityDefinitionSurface` (`../data/guards`) and `writeFieldPermissionGrant` (`./field-definitions`) — no import cycle (`guards.ts` and `field-definitions.ts` do not import `register.ts`). |
| `packages/core/src/modules/entities/lib/__tests__/register.sd1.test.ts` **(new)** | 7 tests: a create is gated and granted after the flush (records use the live `entities.records.<id>` prefix); a reactivation is gated and granted; an update that stays active is not gated; a `createOnly` sync is not gated; **a `createOnly` sync of a malformed surface does not even evaluate the gate** (the non-vacuous form — see §9.6); a dry run is not gated; a malformed surface id refuses and creates nothing (fail-closed). |

### 7.6 The field-type-change case — step 2 of §10, built 2026-10-08 (CC-4)

**What it is.** A **re-typed** field (`text` → `integer`, `text` → `reference`, …) is a permission surface **changing shape**: what it can hold, and therefore what a permission decision about it can mean, becomes different. It is neither a create nor a reactivation, so neither the create-only guard nor the reactivation clause sees it. CC-4 closes it on every path a re-type can travel.

**The stated blocker was measured, and it was only half true.** CC-4's row read *"detecting it needs the before-state, which the guard input does not carry."* The second half is correct — `MutationGuardInput` carries only `mutationPayload`, so a **guard** cannot see the old `kind`. But the first half is **false**: the before-state **exists at every write site that can re-type a field** — the single-route `def` (loaded before the write), the batch route's `defByKey` (prefetched), and the primitive's `existingByKey` (found inside the transaction). So CC-4 is **startable at the route/primitive layer**, exactly like CC-21 and CC-22, **without touching the shared guard contract** — and it needed no new input type. (This is rule 10d doing its job: proving the premise before building on it.)

**The predicate, one clause at each site.** A re-type is `existing && active && existing.kind !== incoming.kind`. The clause is added **beside** the reactivation clause (never replacing it), under the **same** `createOnly`/active guards, so the two cannot drift:

| Site | Predicate |
|---|---|
| `field-definitions.ts` (the shared primitive) | `retypes = !!existing && !scope.createOnly && isActiveColumn(existing) && existing.kind !== field.kind` — folded into `lands = !existing \|\| reactivates \|\| retypes` |
| `definitions.ts` (single POST) | `retypesField = !!def && isActiveColumn(def) && def.kind !== input.kind`; `changesSurface = reactivatesField \|\| retypesField` |
| `definitions.batch.ts` (batch POST) | the `newKeys` predicate gains `if (!isActiveColumn(existing)) return true; return existing.kind !== d.kind;` |

**The refusal message and the grant label name the real event.** Where a single predicate now covers two cases, the message and the log label pick the right word (`'re-typed'` vs `'re-activated'`; `'the re-typed custom field'` vs `'the re-activated custom field'`), so an operator reading the log sees which change was gated — a re-type is not reported as a reactivation.

**Fail-closed, and two-phase, unchanged.** Decided **before** the write (a refusal stops the landing — 422 at the routes, a throw in the primitive), the default's records written **after** the flush (the surface must exist first). Same `evaluateStructureChange` + `writeFieldPermissionGrant` as every other path.

| File | What it is |
|---|---|
| `packages/core/src/modules/entities/lib/field-definitions.ts` **(modified)** | The shared primitive's `newSurfaces` predicate gains the `retypes` clause; `lands = !existing \|\| reactivates \|\| retypes`. A re-typed key is now a surface the gate must decide, so the primitive refuses (throws) before the loop and grants after the flush. |
| `packages/core/src/modules/entities/api/definitions.ts` **(modified)** | The single POST's `changesSurface = reactivatesField \|\| retypesField`; the refusal branch and the grant label branch on `retypesField ? 're-typed' : 're-activated'`. |
| `packages/core/src/modules/entities/api/definitions.batch.ts` **(modified)** | The batch route's `newKeys` predicate adds `existing.kind !== d.kind` for an active existing row, so a re-typed key is gated and granted exactly like a new one. |
| `packages/core/src/modules/entities/api/__tests__/definitions.reactivation.sd1.test.ts` **(modified)** | +2 tests: a field-type change on an active row **is** gated and granted after the flush; an active row whose `kind` is **unchanged** is **not** gated. |
| `packages/core/src/modules/entities/lib/__tests__/field-definitions.sd1.test.ts` **(modified)** | +2 tests: a field-type change on an active row is gated (primitive); a field-type change under `createOnly` is **not** gated (the sync skips updates, so it never re-types). |
| `packages/core/src/modules/entities/api/__tests__/definitions.batch.sd1.test.ts` **(modified)** | The stale test *"does not gate a save that creates no column (an existing key is an update)"* sent a **type change** (`key:'alpha'`, `kind:'integer'` against an active `text` row) — which CC-4 now correctly gates. Renamed and corrected to a **same-kind** update, and +2 CC-4 tests (a type change is gated; a same-kind update of an active row is not). This was a **real, correct behaviour change** the old test was encoding wrongly. |

## 8. Verification results (measured, not assumed)

### 8.1 The decision core (2026-10-08, first slice)

- **New tests:** 37 (13 + 13 + 11).
- **RED-then-GREEN mutation proof: 8 disjoint mutations, 8/8 RED**, each restored and **md5-verified byte-identical** (bytes I/O, `open(p,'wb')`, so the LF→CRLF trap cannot hide a bad restore):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | delete the gate's `no_surface` refusal | RED — 2 failed |
  | M2 | default grants to `'admin'` not the superadmin role | RED — 1 failed |
  | M3 | catalogue drops the structural block | RED — 4 failed |
  | M4 | catalogue ignores `featurePrefix` | RED — 3 failed |
  | M5 | guard fires on updates too (would break the batch save) | RED — 1 failed |
  | M6 | guard returns `ok:true` on a refusal (fail open) | RED — 3 failed |
  | M7 | catalogue drops the `featurePrefix` validation | RED — 1 failed |
  | M8 | gate drops the explicit prefix refusal | RED — 1 failed |
- **Suites (GREEN):** `shared` **197 suites / 2327 tests, 0 failures**; `core` **618 suites / 5332 tests, 0 failures**.
- **Typecheck:** `shared` **exit 0**; `core` exit 0.

### 8.2 The enforcement half (2026-10-08, second slice)

- **New tests:** 22 (`permission-decision-grant.test.ts` 11, `guards.sd1-write.test.ts` 11). **SD-1's tests now total 33.**
- **RED-then-GREEN mutation proof: 9 disjoint mutations across 3 files, 9/9 RED**, each restored and **md5-verified byte-identical** (bytes I/O, so the LF→CRLF trap cannot hide a bad restore):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | grant: drop the no-records refusal | RED — 2 failed |
  | M2 | grant: replace the merge instead of union | RED — 1 failed |
  | M3 | grant: confer superadmin on a fresh ACL | RED — 1 failed |
  | M4 | grant: pretend a missing role exists | RED — 1 failed |
  | M5 | guards: never ask for `afterSuccess` | RED — 2 failed |
  | M6 | guards: remove the field guard's `afterSuccess` | RED — 5 failed |
  | M7 | guards: auto-apply a `decided` outcome too | RED — 1 failed |
  | M8 | grant: drop the `added.length` guard (always flush) | RED — 1 failed |
  | M9 | **runner: drop the metadata carried to `afterSuccess`** (the wire) | RED — 1 failed |
- **Suites:** `core` **620 suites / 5354 tests, 0 failures**. `shared` **197 suites / 2329 tests — 2321 pass, 8 fail in ONE suite**: `dynamicLoader.tsconfig.test.ts`. **This is a host-level process-creation failure, not a defect in the code under test — and the earlier note here (a "sandbox `rmSync` shim") was WRONG; it was re-diagnosed on 2026-10-08.** The measured facts:
  | Observation | What it shows |
  |---|---|
  | `spawnSync …\.toolchain\node24\node.exe EBUSY`, `errno=-4082` | libuv maps Windows `ERROR_SHARING_VIOLATION` to `UV_EBUSY` — `CreateProcessW` **refused to create the process**. No project code runs. |
  | The suite **passes 8/8 in isolation**; fails **8/8** under the full run | The code under test is fine; the *harness* (it spawns `node`) is what fails. |
  | **12 retries over 6.7 s all fail**, at every attempt | The busy state is **continuous, not transient** — so a retry cannot fix it. An earlier retry-based "fix" was written, disproved by this measurement, and **reverted**. |
  | Fails identically with the **sandbox disabled** | Not the sandbox. |
  | It is the **only** suite in the package that spawns `node`; `maxWorkers: 2` | Not spawn-rate contention. |
  | At **HEAD, byte-unmodified**, the full run gives the **same 8 failures** | Pre-existing, and not caused by this slice. |

  **Owned, not excused** (`WORKING-RULES.md` §1 rule 9). What is still open is the *OS-level* question — which file handle holds `node.exe` during the full run — and that is a host/CI matter, not a code change: recorded as a known environmental failure in [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) with the trigger that closes it.
- **Typecheck:** `core` **exit 0**; `shared` exit 0.

### 8.3 The batch create path (2026-10-08, third slice — CC-2)

- **New tests:** 12 (`definitions.batch.sd1.test.ts` 9, `permission-decision-grant.test.ts` +3). **SD-1's tests now total 45.**
- **RED-then-GREEN mutation proof: 7 disjoint mutations across 2 files, 7/7 RED**, each restored and **md5-verified byte-identical** (`cp` byte-for-byte + `md5sum -c`):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | route: drop the "no existing row" condition (gate every key) | RED — 1 failed (over-gating an update) |
  | M2 | route: disable the refusal branch (fail open) | RED — 1 failed (the batch lands instead of 422) |
  | M3 | mapping: write a `decided` outcome too | RED — 1 failed |
  | M4 | route: let a grant-write failure fail the save | RED — 1 failed (200 became 500) |
  | M5 | route: always evaluate the gate (`>= 0`) | RED — **4 failed**, incl. the pre-existing "fieldset-only save" and "tombstone" regression tests |
  | M6 | route: test only for "no row" (a reactivation slips through ungated) | RED — 1 failed |
  | M7 | route: make the missing-tenant skip silent again | RED — 1 failed |
- **Suites:** `core` **621 suites / 5366 tests, 0 failures** (re-run after the third hostile-critic pass; see §9.3). `shared` **197 suites / 2329 tests — 8 fail in the one suite of CC-19** (unchanged; not touched this slice).
- **Typecheck:** `core` **exit 0**; `shared` exit 0.
- **A second, independent finding, measured not assumed:** the batch path never carried a `key` in the guard payload, so `entities.field_definition.no-reserved-key` has **never** run on it. Observed: a batch POST with `definitions:[{key:'id',kind:'text'}]` returns **200** and calls `em.create(CustomFieldDef, { key: 'id', … })`, where the single POST refuses with 422. **Not** folded into SD-1 (a different concern, and a behaviour change to the batch API) — scheduled as **CC-18**.

### 8.4 The non-request create paths (2026-10-08, fourth slice — CC-3)

- **New tests:** 14 (`field-definitions.sd1.test.ts` 9, `cli-add-field.sd1.test.ts` 5). **SD-1's tests now total 59.**
- **RED-then-GREEN mutation proof: 8 disjoint mutations across 2 files, 8/8 RED**, each restored and **md5-verified byte-identical** (`cp` byte-for-byte + `md5sum -c`):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | primitive: stop running the gate | RED — 5 failed |
  | M2 | primitive: gate even a dry run | RED — 1 failed |
  | M3 | primitive: drop the reactivation condition (only "no row" is new) | RED — 1 failed |
  | M4 | primitive: write the grant **before** the flush | RED — 1 failed (the ordering assertion) |
  | M5 | CLI: stop running the gate | RED — 3 failed |
  | M6 | `decideNewFieldPermissions`: do not throw on a refusal (fail open) | RED — 1 failed (primitive) **+** 1 failed (CLI) |
  | M7 | `writeFieldPermissionGrant`: stop skipping the global (null-tenant) case | RED — 1 failed (primitive) **+** 1 failed (CLI) |
  | M8 | CLI: drop the reactivation condition | RED — 1 failed |
- **Suites:** `core` **623 suites / 5380 tests, 0 failures** (the two new suites). `shared` **197 suites / 2329 tests — 8 fail in the one suite of CC-19** (unchanged; not touched this slice).
- **Typecheck:** `core` **exit 0**; `shared` exit 0.
- **A defect found by self-review, before the critic — and fixed.** The first cut counted a tombstone as a "new surface" even under `createOnly` — but the loop **never reactivates under `createOnly`** (it skips updates), so the gate would have granted records for a column that never appeared. Reachable (the definitions GET uses `createOnly: true`). Fixed: `lands = !existing || (!createOnly && !isActiveColumn(existing))`; the test "does not gate a tombstone under createOnly" pins it.

### 8.5 The HTTP reactivation paths (2026-10-08, fifth slice — CC-22)

- **New tests:** 9 (one file, `definitions.reactivation.sd1.test.ts` — both routes). **SD-1's tests now total 68.**
- **RED-then-GREEN mutation proof: 4 disjoint mutations across the two route files, 4/4 RED**, each restored and **md5-verified byte-identical** (`md5sum -c`, bytes I/O so the LF→CRLF trap cannot hide a bad restore):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | single route: drop the reactivation gate (never evaluate) | RED — 1 failed (the reactivation is no longer refused/granted) |
  | M2 | restore route: drop the reactivation gate (never evaluate) | RED — 2 failed (the restore gate + its grant) |
  | M3 | single route: fail open (do not refuse on `refused`) | RED — 1 failed (the fail-closed test) |
  | M4 | single route: gate every key (`>= 0`, not only `reactivatesField`) | RED — **4 failed**, incl. the create / active-update / deactivation "not gated" tests |
- **Suites:** `core` `tsc --noEmit` **exit 0**. `entities` module **39 suites / 289 tests, 0 failures**; the **6 direct consumers** (the two route files, `field-definitions`, `cli-add-field`, `definitions.batch.sd1`, `guards.sd1` + `guards.sd1-write`) **49 tests, 0 failures**.
- **No CRLF, no trailing hard-breaks** introduced in the four touched code files (checked on each).
- **Files, md5 at the verified revision:** `definitions.ts` `779741671d8fd491cca4e86860359ca4` · `definitions.restore.ts` `d5863c7edf897b76e2f9b2a10ea7cfa2` · `field-definitions.ts` `ac5ae4f887c7b786c27a5984138d3eb3` · `definitions.reactivation.sd1.test.ts` (new).

### 8.6 The custom-entity install path (2026-10-08, sixth slice — CC-21)

- **New tests:** 7 (one file, `register.sd1.test.ts`). **SD-1's tests now total 75.**
- **RED-then-GREEN mutation proof: 5 disjoint mutations in `register.ts`, 5/5 RED**, each restored and **md5-verified byte-identical** (`md5sum -c`, bytes I/O so the LF→CRLF trap cannot hide a bad restore):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | stop gating a create (`lands = false`) | RED — 3 failed (create gate + reactivation gate + fail-closed refusal) |
  | M2 | fail open (drop the refusal throw) | RED — 1 failed (the fail-closed test) |
  | M3 | gate every upsert (drop the "new or reactivated" condition) | RED — 1 failed (the active-update "not gated" test) |
  | M4 | reactivate under `createOnly` too (drop the `!createOnly` clause) | RED — 1 failed (the **strengthened** createOnly test — it evaluates the gate for a sync that lands nothing) |
  | M5 | write the grant **before** the flush on the create branch | RED — 1 failed (the ordering assertion) |
- **Suites:** `core` `tsc --noEmit` **exit 0**. `entities` module **40 suites / 296 tests, 0 failures**; the whole `core` package **625 suites / 5396 tests, 0 failures**.
- **No CRLF, no trailing hard-breaks** introduced in the two touched code files (checked on each).
- **Files, md5 at the verified revision:** `register.ts` `f5584dc257ad0cb4a3e4ca4415538c41` · `register.sd1.test.ts` (new).

### 8.7 The field-type-change case (2026-10-08, seventh slice — CC-4)

- **New tests:** 6 (2 in `definitions.reactivation.sd1.test.ts`, 2 in `field-definitions.sd1.test.ts`, 2 in `definitions.batch.sd1.test.ts`). **SD-1's tests now total 81.**
- **RED-then-GREEN mutation proof: 3 disjoint mutations, one per write site, 3/3 RED**, each restored and **md5-verified byte-identical** (`md5sum -c`, bytes I/O so the LF→CRLF trap cannot hide a bad restore):
  | # | Mutation | Result |
  |---|---|---|
  | M1 | primitive: drop the `retypes` clause (only "no row" / reactivation are new) | RED — 1 failed (a re-typed active column lands ungated) |
  | M2 | single route: drop the `retypesField` clause | RED — 1 failed (a re-typed active column lands ungated) |
  | M3 | batch route: drop the `existing.kind !== d.kind` test | RED — 1 failed (a re-typed active key lands ungated) |
- **Suites:** `core` `tsc --noEmit` **exit 0**. The three targeted suites (the two route files + `field-definitions` + `definitions.batch.sd1`) **33/33**. `entities` module **40 suites / 302 tests, 0 failures**. Whole `core` package **625 suites / 5402 tests, 0 failures** (net +6 over CC-21's 5396 = exactly the six new CC-4 tests; no regression, no suite count change).
- **No CRLF, no trailing hard-breaks** introduced in the three touched code files (checked on each).
- **Files, md5 at the verified revision:** `field-definitions.ts` `f321c2954152ab4bc9220e1e4ad7fc53` · `definitions.ts` `4adecf33ea98e0b13c7e70023d205c9f` · `definitions.batch.ts` `850292cf7e42d31105e5d2a22fa18170`.

## 9. The hostile-critic passes and mutation-found defects — twenty-two real defects found

Each slice got its **own separate hostile-critic agent** (the standing rule), demanding a command + output for every claim — **except CC-21 and CC-4**, where the mutation pass / premise-measurement itself found the weakness (§9.6, §9.7). The tally: **§9.1** 5 · **§9.2** 5 · **§9.3** 4 · **§9.4** 4 · **§9.5** 1 · **§9.6** 1 · **§9.7** 2 = **22**, each **fixed** or **named** (never left silent).

### 9.1 The decision core (2026-10-08, first slice)

Run as a **separate agent** (the standing rule), demanding a command + output for every claim. It found five real defects. **All five are fixed or named:**

| # | Defect (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **`featurePrefix` fail-open** — `permissionRecordsFor` validated `surface.id` but not `featurePrefix`, so an unreadable prefix produced unreadable record ids and the gate still said `defaulted`. | **FIXED** — the catalogue returns `[]` for a bad prefix, and the gate refuses explicitly with `malformed_surface_id`. Tests + mutations M7/M8. |
| 2 | **The batch create path is ungated** — `api/definitions.batch.ts` creates NEW columns under `operation:'custom'` → the registry maps it to `'update'`, so a create-only guard does not fire. | **FIXED (2026-10-08, CC-2)** — the gate now runs **at that route**, on the keys it finds no definition row for, and writes the default through the shared `applyStructureChangeGrant`. See §7.2 for the shape chosen and why the guard was not the right place for it. |
| 3 | **Module-install and CLI create definitions with no guard** (`lib/field-definitions.ts`, `cli.ts`). | **NAMED** in §10 (non-request paths, the same class as `S-02`'s). |
| 4 | **The hook blocks nothing on its routes** — the routes' zod schemas guarantee `entityId`/`key`, so the gate always returns `defaulted`, and nothing writes the records. In production the gate is a pass-through. | **NAMED, and it is the honest headline in §10** — the item is **PARTIAL**. |
| 5 | **Dangling reference** — `guards.ts` cited `PLAN-SD-1.md §10`, which did not exist. | **FIXED** — this section exists now. |

The critic also found the gate's records-empty check was **dead code** (kind + id valid ⇒ records non-empty). It is now **reachable** via defect 1's fix.

### 9.2 The enforcement half (2026-10-08, second slice)

A **second** separate hostile-critic agent, again demanding a command + output for every claim. It confirmed the chain end-to-end by reading (route → wrapper → runner → `afterSuccess`), confirmed the guards are registered in the running app (`apps/mercato/.mercato/generated/guards.generated.ts`), and found **five real issues**. **All five are addressed:**

| # | Defect (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **The metadata wire was untested.** `guards.sd1-write.test.ts` called `afterSuccess` directly and `guards.sd1.test.ts` asserted only `result.ok` — so if `mutation-guard-registry.ts:193` passed `metadata: null`, all 31 tests would still pass and the write would never fire. | **FIXED** — a new test goes through the **real `runMutationGuards` runner**, asserts the decision is carried into `afterSuccessCallbacks.metadata`, and runs it the way `runRouteMutationGuards` does. Mutation **M9** (drop the metadata) now proves it RED. |
| 2 | **The `decided` outcome is unreachable in production** — the only caller passes `{ surfaces }` with no `decision`. | **NAMED** — scheduled as **CC-17** in `COMPLETION-CALLBACKS.md`; the write deliberately ignores `decided` until a decision carrier exists. |
| 3 | **"Never touches `isSuperAdmin`" was literally false** — the create branch writes `isSuperAdmin: false`. | **FIXED** — the claim is now precise: it never sets the flag **to `true`** and never **changes an existing** value; a fresh row keeps the entity default. |
| 4 | **The merge is not concurrency-safe** — a lock-free read-modify-write can lose an addition under exact interleaving. | **NAMED** — scheduled as **CC-16**; stated honestly in the file header (the ACL edit route guards the same shape with an optimistic lock the post-commit hook cannot supply). |
| 5 | **A non-array `featuresJson` is silently replaced**; case/whitespace variants are not deduped against existing entries. | **NOTED** — the entity type is `string[] \| null`, so a non-array cannot occur through the typed path; the `Array.isArray` guard already handles `null`. Cosmetic; left as-is. |

The critic also confirmed the two claims it could not reproduce (`8 mutations`, and the runtime DB write) are **unprovable on this host** for the same reason the whole item is: the unit suites mock the EntityManager.

### 9.3 The batch create path (2026-10-08, third slice — CC-2)

A **third** separate hostile-critic agent, again demanding a command + output for every claim. It found **two real defects and two unstated limits**. All four are addressed:

| # | Defect (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **A reactivation slipped through ungated.** `defByKey` holds rows regardless of `isActive`/`deletedAt`, so a key whose row is an **inactive tombstone** was not "new" — yet the loop flips it active. Re-adding a deleted field landed ungated. | **FIXED** — the test is now "no row **or** an inactive row" (`isActiveColumn`); mutation **M6** proves it RED. |
| 2 | **A missing tenant skipped the grant silently.** `if (… && auth.tenantId)` returned 200 with the columns committed and nothing written and nothing said — contradicting the file's own "an ungated surface must be visible". | **FIXED** — an explicit `else` logs at `error` with the ungranted surfaces; mutation **M7** proves it RED. |
| 3 | **The 422 refusal is unreachable through HTTP.** `entityId` and `key` are both validated, so a field surface is always readable and the gate can only return `defaulted`. The refusal test reaches the branch only by substituting a surface. | **NAMED** — the branch is a guard against a malformed surface, and it becomes reachable when the **non-request** paths (CC-3: CLI / module-install) are gated. Stated in §10. |
| 4 | **The granted records have no enforcement consumer.** Nothing reads `<entityId>.<key>.view\|manage\|structure`; the platform's real per-record features are `entities.records.<entityId>.{view,manage}` (`recordFeatures.ts`). So SD-1 writes ACL rows nothing checks. **Pre-existing** (the guard does the same) and not a regression. | **NAMED** — scheduled as **CC-20**; it is a real caveat on the word "gated" and must not be left implicit. |

The critic confirmed, with commands, that it could **not** falsify: the write-after-commit ordering, the "a failing write does not fail the save" behaviour, the "one mapping" claim, the tenant identity between the two paths, and the absence of weakened assertions in the updated test files (`git diff` shows only added `jest.mock` blocks).

### 9.4 The non-request create paths (2026-10-08, fourth slice — CC-3)

A **fourth** separate hostile-critic agent, again demanding a command + output for every claim. It found **four real issues** — one fixed, three named — and could **not** falsify the core claims.

| # | Finding (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **The HTTP reactivation paths are ungated.** The single-definition route passes `operation: def ? 'update' : 'create'` and the restore route passes `operation: 'custom'`; both map to `'update'`, which the create-only SD-1 guard does not see — so a tombstoned field is reactivated with no gate. (The batch route *does* gate this, CC-2.) **Pre-existing** (neither route is a CC-3 file), and the field records are inert (CC-20), so the impact is completeness, not a live bypass. | **NAMED** — scheduled as **CC-22** (built 2026-10-08 — see §9.5). |
| 2 | **A custom *entity* created by the module install is ungated.** `install-from-ce.ts` calls `upsertCustomEntity` before the field sync, and that lands a `CustomEntity` row with no gate. Its records **are** the live ones (`entities.records.<id>`). | **NAMED** — scheduled as **CC-21**. |
| 3 | **The caller-list comment was incomplete.** It named five callers of the primitive; there are **seven** (it also reaches `checkout/seed/customFields.ts` and `sync-akeneo/lib/catalog-importer.ts`). | **FIXED** — the comment now names all of them and points at CC-22. |
| 4 | **A global surface lands with no records.** `writeFieldPermissionGrant` skips when `tenantId` is null. | **NAMED** — a limit in §10. It is the honest consequence of "a global surface has no tenant to grant in" — reported at `debug` and stated, not a silent skip. |

The critic re-ran two of the mutations independently and confirmed both RED, and could **not** falsify the claim that the gated set equals the set the loop lands across a matrix of edge cases (duplicate keys, `createOnly` × {missing, tombstone}, soft-deleted, dry-run). It also confirmed `upsertCustomEntity` is genuinely ungated.

**One further limit, from the throw itself.** `install-from-ce` commits the `CustomEntity` (`upsertCustomEntity`) *before* it calls the field sync, so if a **malformed declared key** ever existed the throw would leave an entity with no fields. **Unreachable today** — every declared key in the tree is snake_case (measured: 0 non-conforming keys across `packages/*` and `apps/*`) — and a throw is the correct fail-closed response to a defective declaration. Named, not hidden.

### 9.5 The HTTP reactivation paths (2026-10-08, fifth slice — CC-22)

A **fifth** separate hostile-critic agent, again demanding a command + output for every claim. It **could not falsify any of the four claims** (exit 0; the 9 tests; the exact mutation counts; the byte-identical restores) and it proved independently that the **double-grant logic is correct** (a reactivation through the single route totals **one** grant, not two — the create-only guard contributes zero because the route's own path already granted) and that the **new `what` parameter is inert** (it appears only inside `logger.*` templates; changing its value changes no assertion). It found **one real weakness** — and it was a weakness in my *proof*, not the code:

| # | Finding (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **The "route contributes zero grants" create test was vacuous.** It asserted `expect(grantMock).not.toHaveBeenCalled()`, but **registered no guard** — so nothing could have called the grant regardless, and the assertion would have passed even if the route double-granted. The claim it was meant to pin ("the route never competes with the create-only guard") was **not actually tested**. | **FIXED** — the test now registers a **real create guard** and keeps the `not.toHaveBeenCalled()` assertion, so the route's own contribution is proved **zero against a live guard**. Mutation **M4** (gate every key) then proves the strengthened test is **non-vacuous**: it goes RED with 4 failures. |

The critic's own note, kept as the lesson: *a negative assertion is only as strong as the mechanism that could have made it positive* — `not.toHaveBeenCalled()` proves nothing unless the thing that would have called it is present.

### 9.6 The custom-entity install path (2026-10-08, sixth slice — CC-21)

The mutation proof found this one **before** any critic did — which is the point of running it. On the first cut, the `createOnly` test was **vacuous in exactly the CC-22 way**: it asserted `expect(grantMock).not.toHaveBeenCalled()`, but a `createOnly` sync returns `'unchanged'` at an early return that precedes **any** grant call — so the assertion could never fail regardless of whether the gate ran. Mutation **M4** (reactivate under `createOnly`) **stayed green**, which exposed it.

| # | Finding (as the mutation proved it) | Resolution |
|---|---|---|
| 1 | **The `createOnly` test could not see the gate.** Its only assertion (`grantMock` not called) is satisfied by the early return, so it did not prove the gate was skipped — only that no grant was written. The real invariant is stronger: a `createOnly` sync lands nothing, so the gate must **not even be evaluated** (if it were, a malformed id would throw for a sync that writes nothing). | **FIXED** — a second test now runs a `createOnly` sync of a **malformed** surface and asserts it returns `'unchanged'` without throwing. Mutation **M4** then proves it non-vacuous: it goes RED. |

**No separate hostile-critic agent was run for this slice's *code*** — the change is 20 lines mirroring an already-criticised primitive (`ensureCustomFieldDefinitions`), and the mutation pass caught the one test-weakness. The next full hostile-critic pass is scheduled for a slice with new logic (CC-4's before-state).

### 9.7 The field-type-change case (2026-10-08, seventh slice — CC-4)

The finding here is a **scope correction made before any code was written** (rule 10d), not a critic finding. CC-4's row asserted the slice was **blocked** — *"detecting it needs the before-state, which the guard input does not carry."* The second clause is true; the first — the implication that the slice cannot start — is **false**, and measuring it changed the plan:

| # | Finding (as the measurement proved it) | Resolution |
|---|---|---|
| 1 | **CC-4 was not blocked.** The before-state the guard lacks is already present at **every write site that can re-type a field**: `def` (single route, loaded pre-write), `defByKey` (batch route, prefetched), `existingByKey` (the primitive, found in-transaction). So the re-type is detectable at the **route/primitive layer**, the same layer CC-21/CC-22 gated — and CC-4 needed **no** new guard input type and **no** change to the shared guard contract. | **FIXED by building it that way** — the clause runs at all three sites (§7.6). The stale "blocked" wording in §10 item 2 was **corrected**, not inherited. |

**A second finding, from the build itself — a test that was encoding the wrong behaviour.** The batch test *"does not gate a save that creates no column (an existing key is an update)"* sent `key:'alpha'`, `kind:'integer'` against an active `kind:'text'` row. That is a **type change**, which CC-4 now correctly gates — so the old test failed. Diagnosed by a **second route** (the request genuinely is a re-type, per the row's own `kind`), the test was **corrected** to a same-kind update and two explicit CC-4 tests added. The lesson is the ordinary one: a regression test that pins a *wrong* behaviour is not a regression — it is a mis-statement the change corrects.

**No separate hostile-critic agent was run for this slice's *code*** — the change is three one-clause predicates, each with a mutation that goes RED. The next full hostile-critic pass is scheduled for **CC-16** (the atomic merge), which carries new concurrency logic.

## 10. Honest limits — **SD-1 is PARTIAL, not done**

The standard is: a new structure must not land until permissions are decided **and the records are created**. **Both halves now exist on every create path — HTTP *and* non-request — and on every *change* to an existing structure that can re-shape a surface (reactivation, re-type):** the gate decides (pure, fail-closed) and the default's records are written into the tenant's grant role through the existing store — from the guard's `afterSuccess` on the single-definition path, from the route itself on the batch path (§7.2), from the shared primitive `ensureCustomFieldDefinitions` + the `add-field` CLI on the non-request paths (§7.3), the two HTTP reactivation routes (§7.4), the shared primitive `upsertCustomEntity` on the custom-entity install (§7.5), and all three field write sites on a re-type (§7.6). **The headline limits are closed:** *"a gate that decides but does not record is not yet a gate"*, *"the path the field-management UI mostly uses was ungated"*, *"the module-install / CLI paths are ungated"*, *"the HTTP reactivation paths are ungated"*, *"a custom entity created by the module install is ungated"*, and *"a field-type change is not gated"*. What is **not** built:

1. ✅ **The HTTP *reactivation* paths — GATED 2026-10-08 (CC-22).** Was: a tombstoned field is brought back by the single-definition route (`operation: def ? 'update' : 'create'`) and the restore route (`operation: 'custom'`) — both `'update'`, which the create-only guard does not see. **Now:** both routes detect the reactivation from the before-state (`!isActiveColumn(def) && (input.isActive ?? true)`), run the same `evaluateStructureChange` on the same `fieldDefinitionSurface`, refuse fail-closed (422, nothing written), and write the default's records after the flush through `writeFieldPermissionGrant`. **Shape chosen: gate at the route, not relabel `'create'`** — that would drop the bridged legacy guard, the same reason CC-2 rejected it. 9 tests; 4 mutations RED-then-GREEN. *(Section §7.4 below.)*
1b. ✅ **The custom *entity* install path — GATED 2026-10-08 (CC-21).** Was: `install-from-ce.ts` → `upsertCustomEntity` created a `CustomEntity` row with no gate; its records *are* the live ones (`entities.records.<id>`). **Now:** the primitive detects the new-or-reactivated surface from its own before-state, runs `evaluateStructureChange([entityDefinitionSurface(entityId)])`, throws fail-closed on a refusal (nothing created), and writes the default's records after the flush through the same `writeFieldPermissionGrant`. **Shape chosen: gate at the primitive** — the single choke point, so no call site is forgotten (the same reason CC-3 gated `ensureCustomFieldDefinitions`). 7 tests; 5 mutations RED-then-GREEN. *(Section §7.5.)*
2. ✅ **A field-type change — GATED 2026-10-08 (CC-4).** Was: a re-typed field (`text`→`integer`, `text`→`reference`, …) landed with no gate, because a re-type is neither a create nor a reactivation and the guard input carries no before-state. **Now:** all three write sites that can re-type a field detect it from the before-state they already hold (`existing.kind !== incoming.kind`, under the same active/`createOnly` guards as CC-3/CC-22), run the same `evaluateStructureChange`, refuse fail-closed (422 at the routes / throw in the primitive, nothing written), and write the default's records after the flush. **The stated blocker was measured and was only half true** — the before-state the *guard* lacks already exists at every *write site*, so the clause lives at the route/primitive layer and the shared guard contract was **not** changed. 6 tests; 3 mutations RED-then-GREEN. *(Section §7.6.)*
3. **The structural block is a single record** (`<prefix>.structure`). The per-verb, per-level grammar (add/edit/remove/reference × straight/review/approval/never) is **`SD-4`'s**. **(CC-5)**
4. **The data-axis row shape is `G-04`'s.** **(CC-6)**
5. **The catalogue is in-process** for recorded (runtime) surfaces. A durable row is deferred — a migration is **unprovable on this host** (the unit suites mock the EntityManager; `document.ts:22-28` records the same reasoning for the Function row). **Trigger: `G-04`.** **(CC-7)**
6. **The ACL merge is a lock-free read-modify-write.** Under exact interleaving (two structure changes at once, same tenant) one addition can be lost. Stated in `permission-decision-grant.ts`'s header; the ACL edit route guards the same shape with an optimistic lock this post-commit hook cannot supply. **(CC-16)**
7. **The `decided` outcome is unreachable in production.** The only caller passes no `decision`, so the gate can only ever return `defaulted`/`refused` — S2's *"either a person or a rule"* is today only the rule. The write deliberately ignores `decided` until a decision carrier with a grant target exists. **(CC-17)**
8. **The batch path's key validation is thinner than the single path's.** The batch route never carried a `key` in the guard payload, so `entities.field_definition.no-reserved-key` has never run on it: a batch can define a field whose key is a system column (`id`, `created_at`, …), which the single POST refuses. Pre-existing, found while fact-checking CC-2, and **not** a permissions-gate concern — recorded as **CC-18** rather than folded into SD-1.
9. **A custom *field*'s permission records have no enforcement consumer.** SD-1 grants `<entityId>.<key>.view|manage|structure` for a new column, but nothing reads them: the platform's live per-record features are `entities.records.<entityId>.{view,manage}` (`recordFeatures.ts`). So for a **field** the write is a real ACL change with no reader yet — *"permissions were decided and recorded"* is true, *"and now enforced"* is **not**. (For a custom **entity** the records *are* the live ones, because the entity surface supplies `featurePrefix` — which is what makes CC-21's gate consequential.) Named rather than glossed: it is a genuine caveat on the word "gated". **(CC-20)**
10. **A global surface lands with no records.** `writeFieldPermissionGrant` skips when `tenantId` is null: a global custom field/entity has no single tenant to grant in. Reported at `debug` and stated here — not a silent skip, but a real gap on the literal reading of *"nothing is ever invisible"*. Closing it needs a per-tenant fan-out, which is a design of its own.
11. **A refusal on the install path can leave a partial install.** `install-from-ce` commits the `CustomEntity` before the field sync, so a malformed declared key would throw after the entity had committed. **Unreachable today** (every declared key in the tree is snake_case — measured); a throw is the correct fail-closed response to a defective declaration. Named, not hidden. (CC-21 adds a *second* such throw point: the entity gate itself throws before the row — but that throw is **before** any commit, so it leaves nothing.)

**Status: PARTIAL.** The pure core is done, tested and mutation-proven; the hook is wired and fail-closed; **the write that turns the decision into an enforcement is built and tested on every path a field or entity surface can land or re-shape by — both HTTP create paths (single and batch), the HTTP reactivation paths (single + restore), the custom-entity install primitive, the non-request field paths (module install / seeds / CLI), and the field re-type case on all three write sites**. What remains is the concurrency of the merge, the batch key-validation gap, an enforcement consumer for the field records, and the two deferred consumers (`SD-4`, `G-04`). SD-1 stays the active task. **Every remaining item is scheduled in [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md).**

### The next slice (in order)
1. Make the ACL merge atomic (the concurrency fix). **(CC-16)**
2. Restore the reserved-key / key-shape checks on the batch path. **(CC-18)**

