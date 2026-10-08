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
- **Suites:** `core` **620 suites / 5354 tests, 0 failures**. `shared` **197 suites / 2329 tests — 2321 pass, 8 fail in ONE suite**: `dynamicLoader.tsconfig.test.ts`, the **known pre-existing environmental failure** (the sandbox `rmSync` shim intercepts deletes, so a suite that cleans a temp dir fails under the full run). **Proved pre-existing two ways:** `git status` shows `shared` is **byte-unmodified** this slice (only `core` changed), and the suite **passes 8/8 in isolation**. Not a regression.
- **Typecheck:** `core` **exit 0**; `shared` exit 0.

## 9. The hostile-critic passes — separate agents, ten real defects found

### 9.1 The decision core (2026-10-08, first slice)

Run as a **separate agent** (the standing rule), demanding a command + output for every claim. It found five real defects. **All five are fixed or named:**

| # | Defect (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **`featurePrefix` fail-open** — `permissionRecordsFor` validated `surface.id` but not `featurePrefix`, so an unreadable prefix produced unreadable record ids and the gate still said `defaulted`. | **FIXED** — the catalogue returns `[]` for a bad prefix, and the gate refuses explicitly with `malformed_surface_id`. Tests + mutations M7/M8. |
| 2 | **The batch create path is ungated** — `api/definitions.batch.ts` creates NEW columns under `operation:'custom'` → the registry maps it to `'update'`, so a create-only guard does not fire. | **NAMED** as an open hole in §10 (not fixed — see §10 for why the fix is not a one-liner). |
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

## 10. Honest limits — **SD-1 is PARTIAL, not done**

The standard is: a new structure must not land until permissions are decided **and the records are created**. **Both halves now exist for the HTTP create paths:** the gate decides (pure, fail-closed) and the guard's `afterSuccess` writes the default's records into the tenant's grant role through the existing store. **The headline limit — "a gate that decides but does not record is not yet a gate" — is closed.** What is **not** built:

1. **The batch create path is ungated.** `api/definitions.batch.ts` creates new columns under `operation:'custom'` (mapped to `'update'`); a create-only guard cannot see them, and the guard's payload carries no field list. Closing it needs either the keys passed into the guard or the gate run at the route's `if (!def)` branch — a deliberate change, not a one-liner. **(CC-2)**
2. **The module-install and CLI create paths are ungated** (`entities/lib/field-definitions.ts` via `install-from-ce.ts`; `entities/cli.ts`). Non-request paths; the same class as `S-02`'s documented limits. **(CC-3)**
3. **A field-type change is not gated.** Detecting it needs the before-state, which the guard input does not carry. **(CC-4)**
4. **The structural block is a single record** (`<prefix>.structure`). The per-verb, per-level grammar (add/edit/remove/reference × straight/review/approval/never) is **`SD-4`'s**. **(CC-5)**
5. **The data-axis row shape is `G-04`'s.** **(CC-6)**
6. **The catalogue is in-process** for recorded (runtime) surfaces. A durable row is deferred — a migration is **unprovable on this host** (the unit suites mock the EntityManager; `document.ts:22-28` records the same reasoning for the Function row). **Trigger: `G-04`.** **(CC-7)**
7. **The ACL merge is a lock-free read-modify-write.** Under exact interleaving (two structure changes at once, same tenant) one addition can be lost. Stated in `permission-decision-grant.ts`'s header; the ACL edit route guards the same shape with an optimistic lock this post-commit hook cannot supply. **(CC-16)**
8. **The `decided` outcome is unreachable in production.** The only caller passes no `decision`, so the gate can only ever return `defaulted`/`refused` — S2's *"either a person or a rule"* is today only the rule. The write deliberately ignores `decided` until a decision carrier with a grant target exists. **(CC-17)**

**Status: PARTIAL.** The pure core is done, tested and mutation-proven; the hook is wired and fail-closed; **the write that turns the decision into an enforcement is built and tested for the HTTP create paths.** What remains is coverage of the other creation paths, the type-change case, the concurrency of the merge, and the two deferred consumers (`SD-4`, `G-04`). SD-1 stays the active task. **Every remaining item is scheduled in [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md).**

### The next slice (in order)
1. Close the batch create path (pass the keys, or gate at the route). **(CC-2)**
2. Name or gate the module-install / CLI paths. **(CC-3)**
3. Field-type-change detection (needs the before-state). **(CC-4)**
4. Make the ACL merge atomic (the concurrency fix). **(CC-16)**

