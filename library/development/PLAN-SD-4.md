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

### Slice B — the **actor axis** (additive contract change)

- Add an **optional** `actorKind?: PrincipalKind` to `MutationGuardInput` and `MutationGuardAfterInput`,
  and thread it from `RouteMutationGuardAuth` (populated from the request's principal where available).
- **Never required** — every existing guard keeps compiling and behaving identically (the optional-field
  rule); a guard that consults it opts in.

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

---

## 8. Verification protocol (step 5 — done, the observations)

- **RED-then-GREEN mutations (three, each restore md5-identical):**
  - **M1** disable the refusal → **5 tests RED** (every refusal case).
  - **M2** fire on every non-empty `entityId` (wall-to-wall) → **8 tests RED** (refusal *and* allowance).
  - **M3** remove the `resourceKind` narrowing (the critic's HIGH fix) → **2 tests RED** (the record-write cases).
- **Suites:** `guards.sd4` **17/17**; the `entities` slice **45 suites / 357 tests** (up from 44/343);
  the affected `definitions.mutation-guard` suite **8/8**; both `tsc --noEmit` **exit 0**.
- **A hostile-critic pass** (separate agent, six probes, each with a command + output) — found the HIGH
  wildcard over-fire, a LOW namespace-pin gap, and a MEDIUM convention risk (all recorded in §5).

---

## 9. Documented limits (to fill at close of the slice)

- **DDL DROP / FK change** — not seen by a row-level guard; scheduled.
- **re-type labelled `'create'`** — convention risk; scheduled.
- **Slices B (actor axis) and C (per-verb grammar)** — not built in this change (the plan's §5).
