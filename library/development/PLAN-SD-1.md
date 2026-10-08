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

### 9.3 The batch create path (2026-10-08, third slice — CC-2)

A **third** separate hostile-critic agent, again demanding a command + output for every claim. It found **two real defects and two unstated limits**. All four are addressed:

| # | Defect (as the critic proved it) | Resolution |
|---|---|---|
| 1 | **A reactivation slipped through ungated.** `defByKey` holds rows regardless of `isActive`/`deletedAt`, so a key whose row is an **inactive tombstone** was not "new" — yet the loop flips it active. Re-adding a deleted field landed ungated. | **FIXED** — the test is now "no row **or** an inactive row" (`isActiveColumn`); mutation **M6** proves it RED. |
| 2 | **A missing tenant skipped the grant silently.** `if (… && auth.tenantId)` returned 200 with the columns committed and nothing written and nothing said — contradicting the file's own "an ungated surface must be visible". | **FIXED** — an explicit `else` logs at `error` with the ungranted surfaces; mutation **M7** proves it RED. |
| 3 | **The 422 refusal is unreachable through HTTP.** `entityId` and `key` are both validated, so a field surface is always readable and the gate can only return `defaulted`. The refusal test reaches the branch only by substituting a surface. | **NAMED** — the branch is a guard against a malformed surface, and it becomes reachable when the **non-request** paths (CC-3: CLI / module-install) are gated. Stated in §10. |
| 4 | **The granted records have no enforcement consumer.** Nothing reads `<entityId>.<key>.view\|manage\|structure`; the platform's real per-record features are `entities.records.<entityId>.{view,manage}` (`recordFeatures.ts`). So SD-1 writes ACL rows nothing checks. **Pre-existing** (the guard does the same) and not a regression. | **NAMED** — scheduled as **CC-20**; it is a real caveat on the word "gated" and must not be left implicit. |

The critic confirmed, with commands, that it could **not** falsify: the write-after-commit ordering, the "a failing write does not fail the save" behaviour, the "one mapping" claim, the tenant identity between the two paths, and the absence of weakened assertions in the updated test files (`git diff` shows only added `jest.mock` blocks).

## 9. The hostile-critic passes — separate agents, twelve real defects found

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

## 10. Honest limits — **SD-1 is PARTIAL, not done**

The standard is: a new structure must not land until permissions are decided **and the records are created**. **Both halves now exist for every HTTP create path:** the gate decides (pure, fail-closed) and the default's records are written into the tenant's grant role through the existing store — from the guard's `afterSuccess` on the single-definition path, and from the route itself on the batch path (§7.2). **The two headline limits — "a gate that decides but does not record is not yet a gate", and "the path the field-management UI mostly uses was ungated" — are both closed.** What is **not** built:

1. **The module-install and CLI create paths are ungated** (`entities/lib/field-definitions.ts` via `install-from-ce.ts`; `entities/cli.ts`). Non-request paths; the same class as `S-02`'s documented limits. **They are also where the gate's refusal branch becomes reachable:** on the HTTP paths `entityId` and `key` are both schema-validated, so a field surface is always readable and `evaluateStructureChange` can only return `defaulted` — the `refused` branch is a guard against a malformed surface, not a live HTTP outcome. A non-request caller that builds surfaces from unvalidated input is exactly the case it protects. **(CC-3)**
2. **A field-type change is not gated.** Detecting it needs the before-state, which the guard input does not carry. **(CC-4)**
3. **The structural block is a single record** (`<prefix>.structure`). The per-verb, per-level grammar (add/edit/remove/reference × straight/review/approval/never) is **`SD-4`'s**. **(CC-5)**
4. **The data-axis row shape is `G-04`'s.** **(CC-6)**
5. **The catalogue is in-process** for recorded (runtime) surfaces. A durable row is deferred — a migration is **unprovable on this host** (the unit suites mock the EntityManager; `document.ts:22-28` records the same reasoning for the Function row). **Trigger: `G-04`.** **(CC-7)**
6. **The ACL merge is a lock-free read-modify-write.** Under exact interleaving (two structure changes at once, same tenant) one addition can be lost. Stated in `permission-decision-grant.ts`'s header; the ACL edit route guards the same shape with an optimistic lock this post-commit hook cannot supply. **(CC-16)**
7. **The `decided` outcome is unreachable in production.** The only caller passes no `decision`, so the gate can only ever return `defaulted`/`refused` — S2's *"either a person or a rule"* is today only the rule. The write deliberately ignores `decided` until a decision carrier with a grant target exists. **(CC-17)**
8. **The batch path's key validation is thinner than the single path's.** The batch route never carried a `key` in the guard payload, so `entities.field_definition.no-reserved-key` has never run on it: a batch can define a field whose key is a system column (`id`, `created_at`, …), which the single POST refuses. Pre-existing, found while fact-checking this slice, and **not** a permissions-gate concern — recorded as **CC-18** rather than folded into SD-1.
9. **A custom *field*'s permission records have no enforcement consumer.** SD-1 grants `<entityId>.<key>.view|manage|structure` for a new column, but nothing reads them: the platform's live per-record features are `entities.records.<entityId>.{view,manage}` (`recordFeatures.ts`). So for a **field** the write is a real ACL change with no reader yet — *"permissions were decided and recorded"* is true, *"and now enforced"* is **not**. (For a custom **entity** the records *are* the live ones, because the entity surface supplies `featurePrefix`.) Named rather than glossed: it is a genuine caveat on the word "gated". **(CC-20)**

**Status: PARTIAL.** The pure core is done, tested and mutation-proven; the hook is wired and fail-closed; **the write that turns the decision into an enforcement is built and tested for both HTTP create paths** (single and batch). What remains is coverage of the non-request creation paths, the type-change case, the concurrency of the merge, the batch key-validation gap, an enforcement consumer for the field records, and the two deferred consumers (`SD-4`, `G-04`). SD-1 stays the active task. **Every remaining item is scheduled in [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md).**

### The next slice (in order)
1. Name or gate the module-install / CLI paths. **(CC-3)**
2. Field-type-change detection (needs the before-state). **(CC-4)**
3. Make the ACL merge atomic (the concurrency fix). **(CC-16)**
4. Restore the reserved-key / key-shape checks on the batch path. **(CC-18)**

