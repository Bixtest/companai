# PLAN — `SD-2` / `S9`: core functions ship by default and cannot be deleted

**Status:** DONE for the startable slice (2026-10-09) — three limits open and **scheduled** (see §10).
**Task source:** the `★ ACTIVE TASK` box in `JOURNAL.md` (the next *undone* slice in `BUILD-ORDER` order).
**Predecessor:** `PLAN-SD-1.md` (same discipline: study → pick points → requirement → fact-check → plan →
execute → verify → document).

---

## 1. The task, in the sources' own words

> **`BACKLOG.md` §143:** *"Mark core functions and guard their deletion — functions the platform needs to be
> controllable by its controllers (the **roles-and-permissions manager** is the named example) ship by
> default and **cannot be deleted**. Rule: dictionary §C.3 / S9. Small: a flag on the function record + a
> guard on the delete path."* · **★ Hermes:** the map §4.4 (a) — *it bounds what a Hermes run may delete; an
> agent cannot remove a core function.*

> **`SPECIFICATIONS-DICTIONARY.md` §C.3 / S9:** *"A core function is one the platform needs to be controlled
> by the people who control it: managing roles and permissions is the named example. Core functions: ship
> with the platform, present by default; **cannot be deleted** by a user; are marked as core on the function
> record; have their own mandatory permissions, themselves created by the S2 default. **The list of core
> functions starts with: the roles-and-permissions manager.** The rest is to be filled in as the platform
> grows, and every addition to the list is itself a dictionary change."*

> **`BUILD-ORDER.md` §7 (Phase 1):** *"`S9` / `SD-2` — mark core functions (roles & permissions manager
> first) and guard their deletion."*

## 2. The relevant `platform_points` (step 2 — picked, not guessed)

| Point | What it says | Bearing on `SD-2` |
|---|---|---|
| **S9 (= SD-2)** | Core functions ship by default and cannot be deleted *(OPEN — startable)* | **the task itself** |
| **S1** | Every architectural change is gated and inspected before it is applied | the delete path is one such change; the guard is its shape |
| **S5** | One permission engine, never a second one | the rule must live in the **existing** guard/RBAC engine, not a rival list |
| **C4** | Authorization engine: the evaluator and grammar | "undeletable" is a **rule of the engine**, applied regardless of actor |
| **S12** | The actor type is part of every structural decision | the rule binds **every** actor (human and AI) equally — *nobody* may delete a core object |
| **C2** | Actor & context model | the AI is bounded by the same rule (the AI is a principal, not an exception) |
| **CORE-BOUNDARY §2/§5** | Ring 1 core is uncustomisable; a Ring-2 setting may not remove it | a core **function** is present by default and its deletion is refused — a superadmin included |

## 3. The requirement (task definition + points, combined — step 3)

**Build the core-function protection: the platform's own control surfaces — the roles-and-permissions
manager being the first, named by the owner — ship present by default and cannot be deleted by anyone; the
rule is enforced on the delete path that actually exists, through the platform's existing guard engine (S5),
binding every actor equally (S12). The mechanism is a typed, testable `shared` service that answers *"is this
object core?"* and *"may it be deleted?"*, plus the enforcement at the delete path; the *list* of core
functions starts with the one the owner named, and later additions are dictionary changes.**

## 4. Fact-check (step 4 — what is actually there; and the challenge to the task — rule 9b)

**Measured in the code repo, this session (HEAD `35d9257`):**

| Claim | Observation |
|---|---|
| **The `UserFunction` record has no delete path and no persistence** | `packages/shared/src/lib/user-function/document.ts:22-28` — the DB row is *deliberately deferred* to `G-09` ("a migration written now would be unprovable on this host"). `lifecycle.ts` has **no delete**; the only terminal state is `archived` (a transition, `canTransition`). |
| **No `isCore` / `coreFunction` / `undeletable` / `isSystem` concept exists** | `grep -rn "isCore\|is_core\|coreFunction\|core_function"` across `shared` + `core` → **no files**. `grep` for `undeletable\|isSystem\|systemRole` → only `shared/src/lib/entities/system-entities.ts` (UI *selectability of entity types* — unrelated) and two OpenAPI description strings. |
| **The named example IS a live surface with a delete path** | `packages/core/src/modules/auth/api/roles/route.ts` — `DELETE` (line 333) → `crud.DELETE(req)` (a `makeCrudRoute` soft-delete of a `Role`, `commandId 'auth.roles.delete'`, `softDeleteField: 'deletedAt'`). |
| **The existing delete-path checks answer a *different* question** | `assertCanModifySuperAdminRole` (`route.ts:348`) → `assertActorCanModifySuperAdminRoleTarget` (`lib/grantChecks.ts:121`) refuses *a non-superadmin modifying the **superadmin** role*. `enforceRoleTenantAccess` scopes by tenant. **Both are about the actor.** S9 is about the **object**: *this object is undeletable by anyone.* |

### 4.1 The challenge (rule 9b) — and the corrected premise (rule 13 applies when I ship)

**`SD-2` read literally — "a flag on the function record + a guard on the delete path" — has no home.**
The `UserFunction` artifact has no delete path and no row; building a flag on it would be **stacking on an
unbuilt foundation**, which rule 10d forbids. The task's *intent* is nevertheless live and startable: the
dictionary names the surface (**the roles-and-permissions manager**) and it is a real endpoint today.

**Therefore the corrected requirement (above) is what I build.** Two consequences follow, and both are
honest boundaries, not omissions:
- **The `UserFunction` "core" flag is deferred, not skipped.** A `UserFunction` gets an `isCore` marker only
  when it has a record to mark and a delete route to guard — **trigger: `G-09`** (the Function's database
  row; the same trigger `document.ts` already names). Recorded in `COMPLETION-CALLBACKS.md`.
- **The core-function *list* is the owner's to grow** (dictionary: *"every addition to the list is itself a
  dictionary change"*). I build the **mechanism** and the **first entry the owner named**; later entries are
  dictionary changes with their own build rows. This is not a question I close (rule 11).

## 5. The design

### 5.1 The core-object registry — `packages/shared/src/lib/core-boundary/core-objects.ts`

A typed, testable registry of **core objects** — the platform surfaces that ship by default and cannot be
deleted. Mirrors the shape of the metadata registry / permission catalogue (a `shared` service, **holds no
policy of its own** — S5: the *decision* is the dictionary's, this is its home in code).

- A `CoreObject` is `{ kind, id, since, because }` where `kind ∈ {role, ...}` (a closed set, extended as the
  dictionary grows).
- `isCoreObject(kind, id) → boolean`, `coreObjectFor(kind, id) → CoreObject | null`,
  `assertNotCoreObject(kind, id)` (throws a typed refusal), and `coreObjects()` (the list).
- **The first entry** is the roles-and-permissions manager. What identifies it in code: the **superadmin
  role** is the platform's control role — but S9 is stronger than "don't delete the superadmin role"
  (that already exists). **The core object here is the *role-management surface* itself** — which in this
  codebase is the `superadmin` role name per tenant (the role `ensureDefaultRoleAcls` creates), because
  deleting it removes the ability to manage roles. So `kind:'role', id:'superadmin'` is the first entry,
  **matched by name+tenant**, exactly as the dictionary names the *manager*.

> **Why by name and not a column, for this entry.** The `Role` entity has no `isCore` column and adding one
> needs a migration (unprovable on this host — the same boundary `document.ts` and CC-23 already record).
> The `superadmin` role is created by name at setup (`ensureDefaultRoleAcls` → `ensureRoleAclFor`, already
> cited in CC-23's row), so matching it by the platform's own convention is the honest, migration-free shape
> — and it is testable today. A future migration may add a column; that is scheduled, not skipped.

### 5.2 The enforcement — `packages/core/src/modules/auth/lib/core-object-guard.ts` (new) + the delete path

A single helper `assertCoreRoleNotDeletable(em, { tenantId, roleId })` that:
1. loads the role (tenant-scoped, `deletedAt: null`);
2. asks the shared registry `isCoreObject('role', role.name)`;
3. on a core role → **throws a typed `CrudHttpError` (409, not 400)** with a plain reason (dictionary S3:
   *tell the user why*).

Wired into the delete on **every layer a delete can enter** — corrected after a hostile round (see §9 #1):
1. `auth/api/roles/route.ts` — **both** the exported `DELETE` and the `makeCrudRoute` `delete.mapInput`;
2. `auth/commands/roles.ts` — `deleteRoleCommand.execute`, so the **audit redo** path (which re-runs a command through the command bus without the originating route) is covered;
3. `DataEngine.deleteOrmEntity` — the new `refuse` predicate, so **every** hard-delete call site funnels through the rule (including the create-**undo**).

**Why all three, and not just the route.** The first cut was route-only, and a hostile-critic round proved it **bypassable**: `redo/route.ts:155` calls `commandBus.execute(log.commandId, …)`, which never enters the route's `mapInput`. "One rule, one choke point" is only true if the choke point is the **last** layer every path shares — the store — with the earlier layers as fast refusals, not as the only defence.

**Why 409 and not 400.** The request is well-formed; it conflicts with a platform invariant. `409` says
"understood, refused, nothing changed" — the honest status. (400 is reserved for a malformed request.)

**Why the guard engine connection is stated and bounded.** S9's rule is *object-level and actor-independent*,
so it is a **precondition at the route**, not a `MutationGuard` (a mutation guard is actor-scoped by design
— route-mutation-guard.ts:28-39 carries a bare `userId`). The rule is *not* an actor rule; it applies to
every actor, so it sits **above** the actor layer. This is stated so a later reader does not "fix" it into a
guard and weaken it. **★ Hermes:** this is where a Hermes-proposed delete is refused — the route refuses
before any actor check matters, so an agent cannot remove a core role.

### 5.3 The honest boundary (stated now, not discovered later)

- **The `UserFunction` core flag waits on `G-09`.** No record, no delete route — **trigger: `G-09`**.
  Scheduled in `COMPLETION-CALLBACKS.md` (rule 8).
- **The `Role` core marker is by name, not by column.** A column waits on a migration (CC-23's class).
- **Adding to the core-function list is a dictionary change** — the mechanism accepts new entries; the
  *decision* to add one is the owner's.

## 6. Verification protocol (step 5)

- Unit tests for the registry; route tests for the enforcement (the delete is refused; a non-core role still
  deletes; the guard bites on both entry points).
- **RED-then-GREEN mutation proof** across ≥4 disjoint mutations, each reverted and **md5-verified
  byte-identical** (bytes I/O — the LF→CRLF trap).
- The `shared` and `core` suites + typecheck.
- A **separate hostile-critic pass** demanding a command+output for every claim (rule 4).

---

## 7. What was built

**In the code repo (`workspace/starting-kit`):**

| File | New/changed | What it is |
|---|---|---|
| `packages/shared/src/lib/core-boundary/core-objects.ts` | **NEW** | The core-object registry: `CORE_OBJECT_KINDS = ['role']`, `CORE_OBJECTS` (first entry `{ kind:'role', id:'superadmin', since, because }`), `coreObjects()` (returns **copies** — a JS caller cannot mutate the source), `isCoreObject`, `coreObjectFor`, `coreObjectRefusal`, `isCoreObjectKind`. Folding is `trim().toLowerCase()`, in the registry — so no caller can bypass by case. |
| `packages/shared/src/lib/core-boundary/__tests__/core-objects.test.ts` | **NEW** | 12 tests: the named surface is core; case/whitespace folding; near-misses (`superadmins`, `superadmin2`, ``, `admin`) are not core; non-string ids never crash; the refusal names `reason`+`because`; `coreObjects()` is a copy. |
| `packages/core/src/modules/auth/lib/core-object-guard.ts` | **NEW** | `CORE_OBJECT_DELETE_STATUS = 409`; **`refuseCoreRoleDelete(role)`** — the pure, row-level definition of the rule (the single source both enforcement sites delegate to); **`assertCoreRoleNotDeletable(em, auth, roleId)`** — the route-level loader that throws the 409. |
| `packages/core/src/modules/auth/api/roles/route.ts` | **MOD** | Wired `assertCoreRoleNotDeletable` into **both** entry points: the `makeCrudRoute` `delete.mapInput` and the exported `DELETE`. |
| `packages/core/src/modules/auth/api/roles/__tests__/core-object-delete.sd2.test.ts` | **NEW** | 8 tests: the helper throws 409 for `superadmin`, not for an ordinary role, not for a missing role; the refusal body names reason+because; the route returns 409 and **never calls `crud.DELETE`**; **actor-independence** (the actor IS a superadmin, so the 409 can only be the core rule); a normal role falls through to CRUD. |
| `packages/shared/src/lib/data/engine.ts` | **MOD** | `deleteOrmEntity` gained an optional **`refuse?: (current) => CrudHttpError \| null \| void`** predicate, run against the loaded row **before any write** — the choke point every delete funnels through (interface declaration **and** implementation updated). |
| `packages/core/src/modules/auth/commands/roles.ts` | **MOD** | `deleteRoleCommand.execute` now calls `refuseCoreRoleDelete(role)` and throws before any write; **both** hard-delete `deleteOrmEntity` calls (the delete at ~519 and the create-**undo** at ~245) pass `refuse: refuseCoreRoleDelete`. |
| `packages/core/src/modules/auth/commands/__tests__/core-object-command.sd2.test.ts` | **NEW** | 8 tests on the **command** path: `execute` throws 409 for a core role and never reaches the hard delete; the row decides, not the actor; **the `refuse` predicate is passed to `deleteOrmEntity`** and refuses a core row even on a non-core call site; an ordinary role still deletes. |
| `packages/shared/src/lib/data/__tests__/deleteOrmEntity.refuse.sd2.test.ts` | **NEW** | 5 tests that make the store hook **load-bearing**: the predicate is consulted before any write (soft and hard); a returned error is thrown and **nothing is written**; `null`/void proceeds; a missing row short-circuits before the predicate; the predicate sees the **actual loaded row**. |

## 8. Verification results (measured, not assumed)

**Two independent routes to every important answer** (rule 2):

- **The rule bites, and nothing is written.** Route test: 409 returned and `crud.DELETE` **never called**. Command test: 409 thrown and `deleteOrmEntity` **never called**. Store test: the predicate throws and `em.remove`/`em.persist` are **never called**.
- **It is object-level, not actor-level.** The test actor **is** a superadmin; the pre-existing `assertCanModifySuperAdminRole` returns early for a superadmin (no throw), and the other check emits only 401/404 — so the **409 can only be the core rule**. Both hostile rounds confirmed this by reading the pre-checks.
- **No over-blocking.** An ordinary role (`admin`) deletes on all three paths; a missing role is not a core refusal (the caller's own 404 owns that).

**The gate (rule 3):**

| Check | Result |
|---|---|
| `packages/shared` full suite | **201 suites / 2385 tests — 0 failures** (this run; see the flake note below) |
| `packages/core` full suite | **630 suites / 5479 tests — 0 failures** |
| `tsc --noEmit -p packages/shared/tsconfig.json` | **exit 0** |
| `tsc --noEmit -p packages/core/tsconfig.json` | **exit 0** |

**The RED-then-GREEN mutation proof — 6 disjoint mutations, each restored md5-identical** (`core-objects.ts` `3fde682f…`, `core-object-guard.ts` `2e77707f…`, `commands/roles.ts` `b7d2eaf3…`, `engine.ts` `42f8c71a…`):

| M | Mutation | Shared | Core |
|---|---|---|---|
| M1 | registry id `superadmin` → `superadminXX` | 6 failed | 9 failed |
| M2 | registry folding removed (`id` not `trim().toLowerCase()`) | 2 failed | 1 failed |
| M3 | guard's row-level refusal always allows | 12 pass | 9 failed |
| M4 | engine `refuse` predicate never runs (`if (false && …)`) | **3 failed** | 12 pass |
| M5 | command `execute` guard silenced (store hook must still catch it) | 12 pass | 2 failed |
| M6 | command guard **and** the store predicate both silenced | 12 pass | 3 failed |

**All six go RED.** M4 initially **passed** — that is the proof the first cut's store hook was **decorative** (the command's own check caught everything first, so the hook could have been deleted by any refactor with no test noticing). Closed by the engine suite (`deleteOrmEntity.refuse.sd2.test.ts`); re-measured, M4 now fails 3. *This is the mutation proof doing the job a review alone would have missed.*

**Two separate hostile-critic agents** (rule 4), each a command + output per claim:

- **Round 1** found the **critical hole**: the rule lived only in the route; the **command** handler and the audit **redo** path bypassed it (rode `commandBus.execute` without the route's `mapInput`) — plus the create-undo hard-delete. "Undeletable by anyone" was **false**. It also correctly falsified my "full shared suite passes" claim (the pre-existing `dynamicLoader` flake — see §10).
- **Round 2**, after the fix, **CONFIRMED** every claim: every role-row removal funnels through a guarded path; `refuseCoreRoleDelete` reaches the single registry (no second hardcoded name); redo traced **by observation** (it has no `redo` method, so `commandBus` falls to `execute` → refuses); it re-ran the M4 mutation itself (3 RED) and restored md5-identical; core suite 630/5479 green, both typechecks exit 0. **No code hole found.**

## 9. The critics' defects

| # | Found by | Defect | Resolution |
|---|---|---|---|
| 1 | Round 1 | **The rule was bypassable on the command path and the audit redo path** | Fixed: rule moved to the command `execute` **and** armed on `deleteOrmEntity` via the `refuse` hook — the one path every delete funnels through. Re-verified by Round 2. |
| 2 | Round 1 | **The create-undo hard-delete was unguarded** | Fixed: `refuse: refuseCoreRoleDelete` on the undo's `deleteOrmEntity`. |
| 3 | own mutation run | **The store hook was decorative** (M4 green) | Fixed: dedicated engine suite added; M4 now RED. |
| 4 | own test run | `coreObjects()` returned the same array reference (a JS caller could `push`) | Fixed: returns `.map(o => ({...o}))`; test pins it. |
| 5 | own typecheck | `TS18047` (`ctx.auth` possibly null) in `mapInput`; `refuse` missing from the `DataEngine` **interface** declaration | Fixed: `ctx.auth?.tenantId ?? null`; interface signature updated. |
| 6 | Round 1 & 2 | **A falsified claim of mine** — "the full shared suite passes" | Corrected in this plan and in memory: the suite is **green on some runs and fails 8 on others** (the CC-19 environmental flake). Rightly called out; recorded honestly rather than papered over. |

## 10. The honest limits

**Every limit below is scheduled in `COMPLETION-CALLBACKS.md` (rule 8) — not merely noted here.**

1. **The core set is one role deep, marked by NAME not a column — CC-31.** `core-objects.ts` recognises `superadmin` by its folded `name`. A durable `is_core` column removes the rename exposure but needs a migration (CC-23's class, unprovable on this host). *Trigger: any `roles` DDL / the owner's ruling.* A **renamed** `superadmin` would stop being core — and the rename path is **not** itself guarded. That is named, not hidden.
2. **The `UserFunction` core flag the item's sketch named is deferred to `G-09` — CC-32.** Measured: `UserFunction` has no persistence and no delete path (`document.ts:22-28`, `lifecycle.ts`), so the flag had no home. When `G-09` gives a saved Function a durable row **and a delete path**, the rule must extend to it.
3. **Growing the core-function *list* is a dictionary change** (dictionary §C.3: *"every addition to the list is itself a dictionary change"*). The mechanism accepts new entries; the *decision* is the owner's (rule 11, CC-31 (b)).
4. **The `dynamicLoader.tsconfig.test.ts` flake is pre-existing and environmental, NOT this slice.** Measured: it **passes 8/8 in isolation** but fails 8 under the full run on some runs (both for me and for the critic on a stashed clean tree); it is CC-19, documented with full evidence (`PLAN-SD-1.md` §8.2). It does not indict SD-2 — but the `shared` full-suite figure above must be read as *"green on this run"*, not a guarantee. Re-run trigger: CI on Linux (CC-19's callback).

*This plan is complete for the startable slice. The three open items are all scheduled with named triggers; nothing here is a silent omission.*
