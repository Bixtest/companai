# PLAN — `SD-4`: the structural permission grammar (S11/S12) + the structural guard

**Written:** 2026-10-09. **Author:** the agent. **Status:** 🚧 **IN PROGRESS** (this plan is the record).
**Parent:** `S11`/`S12` (dictionary Part E), `ARCHITECTURE-structure-permissions.md` (the design),
`SD-1`/`S2` (the gate), `SD-2`/`SD-2b` (the core-object rule + its setting), `SD-3`/`D1` (the tier setting),
`S5` (one engine), `CORE-BOUNDARY.md` §2/§5.

---

## 1. The task, in the sources' own words

> **`platform_points.md` S11 (= SD-4):** *Structural permissions **explicit, per object and per verb,
> inherited by default**.*
>
> **`platform_points.md` S12:** *The **actor type** is part of every structural decision.*
>
> **`ARCHITECTURE-structure-permissions.md` §2:** the full grammar is
> **(actor type, actor role, verb, object, level)** — *"Example: (AI, 'data-modeller', add, column, review).
> That is one settings row."*
>
> **`BUILD-ORDER.md` §8 (the handoff from `SD-2b`):** SD-4 **consumes** the `SD-3`/`SD-2b` settings and
> **also owns the STRUCTURAL GUARD** — *a `core`/`platform_release` object must not be **DROPped, re-typed,
> or have its FK changed*** (S5: one engine, never a rival).

---

## 2. The relevant `platform_points` (step 2 — picked, not guessed)

- **S11 (= SD-4)** — structural permissions explicit, per object and per verb, inherited by default. *(OPEN)*
- **S12** — the actor type is part of every structural decision. *(OPEN)*
- **C4** — the authorization engine's **grammar half is not built** — *"that is `SD-4`"*. *(PARTIAL)*
- **C5** — the metadata registry answers *what exists · what type · provenance · what depends on it*, and
  returns a **typed absence** for *"who can access it"* — because *"the authority engine is shadow-mode;
  SD-4 unbuilt"*.
- **S2 / SD-1** — the gate that installs the permission blocks when a surface appears; SD-4 **fills the
  structural block it already yields** (CC-5).
- **S5** — one engine, never a rival: build on the existing `MutationGuard` + escalation outcome, do not
  invent a second engine.
- **S9 / §C.3 + `SD-2`/`SD-2b`** — the core-object rule the structural guard reads.
- **Rule 0** — every claim carries an observation; docs are not evidence, only the code is.
- **Rule 9b** — challenge the task before executing it.

---

## 3. The requirement (task definition + points, combined — step 3)

Make the **structural decision** explicit and per-(object, verb, actor), with the tier as the fallback:

- **The grammar (S11/S12):** a row is `{ object, verb, actorType, role, level }`, where
  `object ∈ {table, column, relation, function, widget, agent}`, `verb ∈ {read, add, edit, remove, reference}`,
  `actorType ∈ {human, ai, any}`, `level ∈ {straight, review, approval, never}`.
- **Inheritance (S11):** an **unset** entry falls back to item-17's **tier** (the `SD-3` setting) — a
  placement, never an exemption.
- **The actor axis (S12):** the guard input must carry the actor's **kind**; the decision may differ for
  `human` vs `ai`.
- **The structural guard (from `SD-2b`):** a `core`/`platform_release` object may not be **DROPped,
  re-typed, or have its FK changed** — reading the same `core-objects.ts`/`core-settings.ts` the delete
  guard reads (S5).
- **Storage:** `module_configs` via `ModuleConfigService` — **no new table, no migration** (the `SD-3`/
  `SD-2b` pattern, dictionary §C.2b).
- **The manage screen stays `SD-5`** (one grid, two settings) — not a second UI.

---

## 4. Fact-check (step 4) — and the challenge to the task (rule 9b)

**What is actually there (measured in code first, 2026-10-09):**

| # | Claim | Evidence (file:line) | Verdict |
|---|---|---|---|
| 1 | Table + column are already resource kinds | `entities/api/definitions.mutation-guard.ts:6-7` (`entities.entity`, `entities.field_definition`) | **EXISTS** |
| 2 | A column is already a row with settings | `custom_field_defs` (`entities/data/entities.ts`) | **EXISTS** |
| 3 | A generic per-resource guard that can block exists | `mutation-guard-registry.ts:9-30` (`MutationGuard`) | **EXISTS** |
| 4 | The **escalate** outcome (review vs approval) exists | `mutation-guard-registry.ts:67-82` (`MutationGuardEscalation`) + `:104`,`:136`; runner short-circuits at `:183-190`; route wrapper materialises `status:'pending_review'`, `errorStatus = escalation.status ?? 202` (`route-mutation-guard.ts:200-218`) | **EXISTS (D3)** |
| 5 | The actor-type axis exists **platform-wide** | `shared/src/lib/auth/principal.ts:28` (`PrincipalKind = 'human'\|'ai_worker'\|'service'\|'system'`), `isHumanPrincipal` `:182`, `isMachinePrincipal` `:212` | **EXISTS** |
| 6 | The actor axis reaches the **guard input** | `MutationGuardInput` (`mutation-guard-registry.ts:32-42`) carries only `userId`; `RouteMutationGuardAuth` (`route-mutation-guard.ts:29-40`) carries no kind; `beginEntitiesMutationGuard` resolves `userId` only | **ABSENT** — the gap |
| 7 | The structured result has a status union | `MutationGuardResult` uses `ok: boolean` + numeric `status?`, **no** string-literal union (`mutation-guard-registry.ts:84-105`) | **no union** (shape-derived) |
| 8 | The structural block's verbs are the grammar | `catalogue.ts:99-102` — `PERMISSION_BLOCK_VERBS.structural = ['structure']` (one verb) | **OPPOSITE** — this is the CC-5 gap |

**The two challenges (rule 9b) — the task corrected before code:**

1. **`SD-4` is not one task; it is three, and only the first is unblocked.**
   - **(i) The structural GUARD** (from `SD-2b`): a `core`/`platform_release` object cannot be DROPped /
     re-typed / have its FK changed. This is **small, unblocked, and closes a real hole** — today the gate
     (`SD-1`) decides *whose permission* a new surface yields, but **nothing refuses a structural change to
     a protected object**. It slots straight onto the existing `MutationGuard` (claim 3) + the
     `core-objects`/`core-settings` decision from `SD-2b`.
   - **(ii) The per-verb grammar** (S11): `PERMISSION_BLOCK_VERBS.structural` is a single `'structure'` verb
     (claim 8), but the architecture's grammar is five verbs (read/add/edit/remove/reference) × 6 objects ×
     actor × level. **This is the CC-5 gap** and it is genuinely larger — it changes the *shape* of the
     records the catalogue yields, which the `SD-1` gate and the enforcement consumers read. CC-5 already
     records it as "expand `<prefix>.structure` into the per-verb records it defines; the catalogue already
     yields the block — `SD-4` fills it."
   - **(iii) The actor axis** (S12): `PrincipalKind` exists platform-wide (claim 5) but **does not reach the
     guard input** (claim 6). Threading it through is a **contract change** to `MutationGuardInput` +
     `RouteMutationGuardAuth` + `beginEntitiesMutationGuard` — touching every guard's input shape. That is
     **additive** (an optional field) but must be done once, in one place, so no call site breaks.

   **So the honest order is (i) → (iii) → (ii):** the guard first (unblocked, closes a measured hole, reads
   code `SD-2b` just shipped); the actor axis second (one additive contract change, armed by the guard that
   consults it); the full per-verb grammar third (the CC-5 expansion, which the manage screen `SD-5` then
   renders).

2. **The read-side verbs are not guard operations.** The architecture's grammar includes **`read`** and
   **`reference`** as verbs. But the mutation guard only fires on **writes** (`'create'|'update'|'delete'`,
   claim 7) — and `SD-6` already ruled that read **side-effect** GETs are set aside, not wired. So
   `read`/`reference` **levels** are a *posture* the grammar declares, not something the write-path guard
   can enforce today. **They are scheduled, not silently dropped** (a callback below), and the first slice
   enforces only the write verbs it can actually see.

---

## 5. The build plan

### Slice A — the **structural guard** (unblocked; this session's build)

A `MutationGuard` that refuses a structural change to a protected object, on the same engine:

- **New guard:** `entities.structural.core-object-guard` (in `entities/data/guards.ts`, beside the others).
- **What it refuses:** a `delete` or `update` (re-type) of a write whose `entityId` is a **reserved system
  surface** — reading the **`SD-2b` predicate** `isReservedSystemEntityType(entityId)` (the entity-id
  namespace), with the **existing** `ok:false` + `status` + `message` refusal shape (claim 7 in §4 + §9.x).
- **Why that predicate and not the tier map** — measured, then corrected mid-build:
  the entities definition route passes `entityId` in the platform's **entity-id** form (`auth:user`,
  `customers:customer_person`) — verified at `api/definitions.ts:670` (`mutationPayload: { entityId, key }`)
  and in the integration specs (`customers:customer_deal`). The `SD-2b` seed's **tier map** uses *table names*
  (`users` → `core`), so a first draft that looked the tier up by **table name** would have resolved
  `auth:user` → `tenant_structural` and **never fired** — dead code that looked correct. The `SD-2b` seed's
  **reserved-entity-type set** is the entity-id form of exactly the `core`/`platform_release` tables, so
  `isReservedSystemEntityType` is the already-built, already-tested bridge. The guard uses it, and a test
  pins the namespace (a bare table name `users` is **not** refused; `auth:user` **is**).
- **Why it is honest:** it does not claim to cover DROP/FK (which are DDL the ORM never issues from a route)
  — it covers the **row-level structural writes the platform actually performs** (deleting/altering a
  `custom_field_defs` or entity definition row), and it names the DDL cases as a **scheduled limit** with a
  callback (§6). *A guard that pretends to stop a DROP it cannot see would be the exact dishonesty the rules
  forbid.*

**A hostile-critic pass (separate agent, six probes) found three things, two fixed:**
- **HIGH — the wildcard over-fired on record writes.** `targetEntity:'*'` also matches
  `entities.custom_entity_record` (`records.ts:498/585/697`), whose payloads also carry an `entityId`; the
  critic proved a *record* delete against `auth:user` returned 422. It was saved from being live only by the
  record route rejecting system entities **first** — correctness by another route's *ordering*, not design.
  **Fixed:** the guard narrows by `resourceKind` (`STRUCTURAL_RESOURCE_KINDS = {entities.entity,
  entities.field_definition}`), proven by mutation **M3** and two new tests.
- **LOW — the namespace was not falsified by a test.** **Fixed:** added the negative test (`users` not refused)
  so a regression to a table-name lookup goes RED.
- **MEDIUM — a re-type labelled `'create'` would escape.** Left as a **named convention risk** (the route
  labels by row existence, so it cannot happen on this route today) and scheduled in §6; the guard's own
  header already warns against name-keyed conventions.

### Slice B — the **actor axis** (additive contract change) — **BUILT** (code `8f7c9a2`…, see §8)

- Added an **optional** `actorKind?: PrincipalKind` to `MutationGuardInput` and `MutationGuardAfterInput`
  (`mutation-guard-registry.ts`), and to `RouteMutationGuardAuth` (`route-mutation-guard.ts`), threaded into
  **both** the `validate` input and the `afterSuccess` input of `runRouteMutationGuards`.
- Threaded it into the guard-input builders that construct a `MutationGuardInput` directly: the seven sites in
  `factory.ts` and the one in `beginEntitiesMutationGuard` (`definitions.mutation-guard.ts`).
- **Never required** — every existing guard keeps compiling and behaving identically (the optional-field
  rule); a guard that consults it opts in.
- **Made a real reader:** `structuralGuardRefusal` (`guards.ts`) now takes `actorKind` and its refusal *names*
  the machine actor when one is refused — so the field is load-bearing (a guard that never read it would be the
  decoration the rules forbid), not decorative.
- **The derivation, and why it is not a direct field read.** The kind is resolved as
  `auth.principal?.kind ?? derivePrincipal(auth)?.kind`, with `derivePrincipal` imported from **`auth/principal`**
  — the pure module that owns the subject encoding, mocked **nowhere** in the repo — not from `auth/server`,
  which the tests of every route sharing the builder mock wholesale. This is deliberate: (a) it keeps every such
  mock complete as written (no mock must grow an export it does not use); (b) it is *correct* where a direct
  read is not — see the critic's HIGH #2 below.

**A hostile-critic pass (separate agent, six probes) on Slice B found two HIGH issues and three lower ones:**

- **HIGH — the direct `auth.principal` read was a real regression (fixed before commit).** The first draft read
  `ctx.auth.principal?.kind` directly, reasoned safe because "every real path populates `principal`". That is
  **false**: the in-process AI runner hands routes a *trusted envelope*
  (`ai-api-operation-runner.ts` `buildAuthEnvelope`) whose `AuthContext` carries `sub:'ai_worker:<id>'` and **no
  `principal` field**, and `resolveAuthFromRequestDetailed` returns it **verbatim** (no `withResolvedPrincipal`).
  So the one path S12 exists to bound — a machine — was labelled *unknown*. **Fixed:** derive via
  `derivePrincipal` from the un-mocked pure module; pinned by **three** new tests (the trusted-envelope
  `ai_worker` case, a `service` api-key subject, and a bare-`human` subject) that go **RED** on the direct read
  (mutation **M6**). *The critic earned its keep: this was a live defect where the exact target case was lost.*
- **HIGH — the claim was overstated (corrected in the docs, not the code).** Today the axis changes only the
  refusal **message**, never the decision (`ok`/`status`/allow-vs-refuse are actor-invariant). That is
  **correct for Slice B's scope** — its job is to make the axis *reach* the guard so the per-actor **grammar**
  can use it (Slice C) — but it must not be sold as "a structural decision already differs for a person and a
  machine". The headline is corrected here and in the JOURNAL/BACKLOG/platform_points.
- **MEDIUM — silent drop elsewhere.** `messages`, `configs.cache`, `communication_channels`, `staff`,
  `payment_gateways`, `integrations`, `sales/quotes/*` build guard inputs without `actorKind`. Harmless today
  (none is a structural resourceKind), but a future *global* reader of the axis would see "unknown" on all of
  them. Recorded as a **scheduled limit** (new CC-36) rather than silently ignored.
- **LOW — a decorative test.** `guards.sd4.test.ts` proved the record-write narrowing with
  `resourceKind:'entities.custom_entity_record'`, a string **no production route emits** (real value is
  `'entities.record'`); it passed for the wrong reason. **Fixed:** the test now uses the real
  `'entities.record'`.
- **LOW — the seven `factory.ts` sites are inert for *this* guard.** Entities routes don't use the factory, so
  those writes never reach `STRUCTURAL_RESOURCE_KINDS`. They prove transport only, not effect. Noted so the
  field's reach is not overclaimed.

### Slice C — the **per-verb grammar** (S11, the CC-5 expansion)

- Expand `PERMISSION_BLOCK_VERBS.structural` from `['structure']` to the grammar's write verbs
  (`add`/`edit`/`remove`/`reference`), with `reference`/`read` **declared** but enforcement-scheduled (the
  challenge 2 above).
- The settings block: `module_configs` (`core_boundary` or a new name), the `SD-3`/`SD-2b` pattern
  (seed + strict parser + pure decision + fail-closed read).
- **`SD-5` renders it** — not built here.

---

## 6. What this plan does NOT build (honest limits)

- **The manage screen** — `SD-5`.
- **`read`/`reference` enforcement on the write-path guard** — scheduled (challenge 2).
- **DDL-level DROP / FK changes** — the guard sees row-level structural writes, not raw DDL; DDL is named
  and scheduled (a `COMPLETION-CALLBACKS` row at the close of this slice).
- **A re-type of an existing object labelled `'create'` escapes the guard** — the route labels by row
  existence (`def ? 'update' : 'create'`), so it cannot happen on this route today; it is a name-keyed
  convention risk, named here and scheduled.
- **The core marker as a column** — still `CC-31(a)`, waits on a migration.

---

## 7. The file table (Slice A)

| File | Change |
|---|---|
| `packages/core/src/modules/entities/data/guards.ts` | add `entities.structural.core-object-guard` + `structuralGuardRefusal` + `STRUCTURAL_RESOURCE_KINDS` |
| `packages/core/src/modules/entities/data/__tests__/guards.sd4.test.ts` | NEW — 17 tests (refusal, allowance, record-write scoping, namespace pin, create-exclusion) |
| `packages/core/src/modules/entities/api/__tests__/definitions.mutation-guard.test.ts` | add `isReservedSystemEntityType: () => false` to the `system-entities` mock |

## 7b. The file table (Slice B)

| File | Change |
|---|---|
| `packages/shared/src/lib/crud/mutation-guard-registry.ts` | add optional `actorKind?: PrincipalKind` to `MutationGuardInput` + `MutationGuardAfterInput` |
| `packages/shared/src/lib/crud/route-mutation-guard.ts` | add optional `actorKind?` to `RouteMutationGuardAuth`; thread it into the validate input **and** the `afterSuccess` input |
| `packages/shared/src/lib/crud/factory.ts` | add `resolveCrudActorKind()` (derives via `derivePrincipal` from `auth/principal`); use it at the 7 guard-input builders |
| `packages/core/src/modules/entities/api/definitions.mutation-guard.ts` | add `resolveActorKind()` (same derivation); pass it as `auth.actorKind` |
| `packages/core/src/modules/entities/data/guards.ts` | `structuralGuardRefusal` reads `actorKind` — a machine refusal names the actor; `structuralCoreGuard.validate` passes `input.actorKind` |
| `packages/core/src/modules/entities/data/__tests__/guards.sd4.test.ts` | +5 actor-axis tests; record-write test now uses the **real** `entities.record` kind + a drift guard |
| `packages/core/src/modules/entities/api/__tests__/definitions.mutation-guard.test.ts` | +4 derivation tests (trusted-envelope `ai_worker`, `service`, `human`, explicit-principal-wins) |
| `packages/shared/src/lib/crud/__tests__/route-mutation-guard.test.ts` | +3 transport tests (validate input, afterSuccess input, legacy-undefined) |

---

## 8. Verification protocol (step 5 — done, the observations)

### Slice A

- **RED-then-GREEN mutations (three, each restore md5-identical):**
  - **M1** disable the refusal → **5 tests RED** (every refusal case).
  - **M2** fire on every non-empty `entityId` (wall-to-wall) → **8 tests RED** (refusal *and* allowance).
  - **M3** remove the `resourceKind` narrowing (the critic's HIGH fix) → **2 tests RED** (the record-write cases).
- **Suites:** `guards.sd4` **17/17**; the `entities` slice **45 suites / 357 tests** (up from 44/343);
  the affected `definitions.mutation-guard` suite **8/8**; both `tsc --noEmit` **exit 0**.
- **A hostile-critic pass** (separate agent, six probes, each with a command + output) — found the HIGH
  wildcard over-fire, a LOW namespace-pin gap, and a MEDIUM convention risk (all recorded in §5).

### Slice B

- **RED-then-GREEN mutations (three, each restore md5-identical):**
  - **M4** stop threading `actorKind` into the validate input → **1 test RED** (`route-mutation-guard`:
    "carries auth.actorKind into the validate input").
  - **M5** make `structuralGuardRefusal` ignore the actor (`byMachine = false && …`) → **2 tests RED**
    (the actor-axis naming + the registry-runner transport case).
  - **M6** revert the derivation to a direct `auth.principal` read → **3 tests RED** (the trusted-envelope
    `ai_worker` case, the `service` case, the `human` case) — the critic's HIGH #2, now caught by a test.
- **Suites:** `guards.sd4` **23/23**; `definitions.mutation-guard` **16/16**; `route-mutation-guard` **18/18**;
  the `entities` slice **45 suites / 370 tests**; the `shared` `crud` slice **23 suites / 294 tests**;
  **full `core` 632 suites / 5510 tests, 0 failures**; **full `shared` 203 suites / 2435 tests, 0 failures**;
  both `tsc --noEmit` **exit 0**.
- **A hostile-critic pass** (separate agent, six probes, each with a command + output) — found the HIGH
  direct-read regression (fixed pre-commit), the HIGH over-stated claim (docs corrected), a MEDIUM silent-drop
  set, and two LOW test defects (both fixed). All recorded in §5.
- **Note on the `shared` flake (CC-19):** the pre-existing `dynamicLoader.tsconfig.test.ts` failure did **not**
  appear in this run — confirming it is flaky-environmental, not a code defect.

---

## 9. Documented limits (to fill at close of the slice)

- **DDL DROP / FK change** — not seen by a row-level guard; scheduled (CC-33).
- **re-type labelled `'create'`** — convention risk; scheduled (CC-35).
- **`read`/`reference` enforcement** — declared but not enforced; scheduled (CC-34).
- **The actor axis changes only the refusal *reason* today, not the decision** — the per-actor *grammar*
  is Slice C (S11). Slice B makes the axis *reach* the guard and be a real reader; it does **not** yet make a
  machine's outcome differ from a person's. Stated plainly so it is not overclaimed.
- **Foreign guard-input builders omit `actorKind`** (`messages`, `configs.cache`, `communication_channels`,
  `staff`, `payment_gateways`, `integrations`, `sales/quotes/*`) — harmless today (none is a structural
  resourceKind), scheduled (CC-36) for when a global reader of the axis exists.
- **Slice C (per-verb grammar)** — not built in this change (the plan's §5).
