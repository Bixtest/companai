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

## 8. Verification results (measured, not assumed)

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

## 9. The hostile-critic pass — a separate agent, five real defects found

Run as a **separate agent** (the standing rule), demanding a command + output for every claim. It found five real defects. **All five are fixed or named:**

| # | Defect (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **`featurePrefix` fail-open** — `permissionRecordsFor` validated `surface.id` but not `featurePrefix`, so an unreadable prefix produced unreadable record ids and the gate still said `defaulted`. | **FIXED** — the catalogue returns `[]` for a bad prefix, and the gate refuses explicitly with `malformed_surface_id`. Tests + mutations M7/M8. |
| 2 | **The batch create path is ungated** — `api/definitions.batch.ts` creates NEW columns under `operation:'custom'` → the registry maps it to `'update'`, so a create-only guard does not fire. | **NAMED** as an open hole in §10 (not fixed — see §10 for why the fix is not a one-liner). |
| 3 | **Module-install and CLI create definitions with no guard** (`lib/field-definitions.ts`, `cli.ts`). | **NAMED** in §10 (non-request paths, the same class as `S-02`'s). |
| 4 | **The hook blocks nothing on its routes** — the routes' zod schemas guarantee `entityId`/`key`, so the gate always returns `defaulted`, and nothing writes the records. In production the gate is a pass-through. | **NAMED, and it is the honest headline in §10** — the item is **PARTIAL**. |
| 5 | **Dangling reference** — `guards.ts` cited `PLAN-SD-1.md §10`, which did not exist. | **FIXED** — this section exists now. |

The critic also found the gate's records-empty check was **dead code** (kind + id valid ⇒ records non-empty). It is now **reachable** via defect 1's fix.

## 10. Honest limits — **SD-1 is PARTIAL, not done**

The standard is: a new structure must not land until permissions are decided **and the records are created**. What is built is the **decision machinery** and a **fail-closed hook**. What is **not** built:

1. **The records are not written.** The gate produces the records (`entities.records.<entityId>.view|manage`, `<surface>.structure`); **no call site persists them** into `role_acls.features_json`. So on the HTTP routes the hook enumerates and fails closed, but does not itself change the ACL. **This is the headline limit: the gate is a decision, not yet an enforcement.** The write is the caller's step through the existing store (S5), and it is the next slice.
2. **The batch create path is ungated.** `api/definitions.batch.ts` creates new columns under `operation:'custom'` (mapped to `'update'`); a create-only guard cannot see them, and the guard's payload carries no field list. Closing it needs either the keys passed into the guard or the gate run at the route's `if (!def)` branch — a deliberate change, not a one-liner.
3. **The module-install and CLI create paths are ungated** (`entities/lib/field-definitions.ts` via `install-from-ce.ts`; `entities/cli.ts`). Non-request paths; the same class as `S-02`'s documented limits.
4. **A field-type change is not gated.** Detecting it needs the before-state, which the guard input does not carry.
5. **The structural block is a single record** (`<prefix>.structure`). The per-verb, per-level grammar (add/edit/remove/reference × straight/review/approval/never) is **`SD-4`'s**.
6. **The data-axis row shape is `G-04`'s.**
7. **The catalogue is in-process** for recorded (runtime) surfaces. A durable row is deferred — a migration is **unprovable on this host** (the unit suites mock the EntityManager; `document.ts:22-28` records the same reasoning for the Function row). **Trigger: `G-04`.**

**Status: PARTIAL.** The pure core is done, tested and mutation-proven; the hook is wired and fail-closed; **the write that would make it a gate is not built.** SD-1 stays the active task.

### The next slice (in order)
1. Write the records: apply the gate's `defaulted` outcome to the tenant's superadmin role ACL through the existing store — the step that turns the decision into an enforcement.
2. Close the batch create path (pass the keys, or gate at the route).
3. Name or gate the module-install / CLI paths.
4. Field-type-change detection (needs the before-state).

