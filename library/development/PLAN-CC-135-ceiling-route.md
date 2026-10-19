# PLAN — `CC-135`: the ceiling gets a door, and the platform gets an administrator

**Status: REQUIREMENT WRITTEN 2026-10-19. No code yet** (standing rule: no code before a written
requirement). The row was opened by `CC-128`'s own plan (§5: *"it does not add a UI"*) so that
"API-only" would be a recorded choice rather than an omission.

---

## 1. What the row asks for, measured

`replaceCapabilityCeiling` has **exactly one caller**: `mercato auth ceiling` in the auth CLI
(`cli.ts:1234-1306`). That was deliberate — a control nothing calls is `CC-101`'s class — but it has
two consequences the row names:

1. **A platform admin managing tenants through a CLI is not a product surface.**
2. **The actor it records is `system`.** A CLI has no authenticated principal, so
   `replaceCapabilityCeiling` is handed `{ principalId: null, kind: 'system', tenantId: null }`
   (`cli.ts:1285`). The audit half of `CC-128` is built and correct; it is being handed a placeholder.

`CC-128` §8 made the actor a **required argument** precisely so this day would come: *"the actor and
the record are required arguments"*, so the moment a route supplies a real principal the record is
real for free. This row is that route.

## 2. What already exists, and it decides the size of the build

Everything the write needs is built and tested:

| Piece | Where | State |
|---|---|---|
| the read, with inheritance from the platform | `loadCapabilityCeiling` (`lib/capabilityCeiling.ts:107`) | built, cached, tagged |
| the write, refusing empty and refusing a superset | `replaceCapabilityCeiling` (`:172`) | built, 5 refusals |
| the actor shape, with a stated `kind` and acting tenant | `CeilingActor` (`:46`) | built |
| the audit writer port | `CeilingAuditWriter` (`:69`) | built, satisfied by `ActionLogService` |
| cross-tenant recorded **as such** | `crossTenant` / `actedFromTenantId` in the record (`:250-260`) | built |
| the invalidation that makes a lowered ceiling take effect | `cache.deleteByTags([CAPABILITY_CEILING_CACHE_TAG])` (`:267`) | built |
| a route that already does exactly this shape | `api/structural-permissions/route.ts` | precedent |

So the route is **transport plus two decisions**: *who may move which ceiling*, and *what the record
says*. Everything else is already there.

## 3. ★ The two findings that change the scope of the row

Both were measured while writing this requirement. Either one alone would make a literal reading of
the row's `FIX` line ship a door that is either unusable or an escalation.

### 3.1 The foundation has no producer — so today there is no platform admin at all

`CC-134` rewrote `isGlobalSuperAdmin` to ask *"is this person an administrator of the **foundational**
tenant?"*, and to answer **false** when no such tenant exists (R3, fail closed). Measured now, from
source:

```
$ grep -rn "isFoundational" packages apps | grep -v dist | grep -v __tests__
directory/data/entities.ts:50      isFoundational: boolean = false
auth/services/rbacService.ts:274   em.findOne(Tenant, { isFoundational: true })
```

**Nothing writes `true`.** The column defaults to `false` and only one reader exists. So the
fail-closed branch is not a safety net — it is the **only branch that can ever run**, and the
platform-administrator concept is a documented role with no way to be filled. This is the same shape
as `CC-136`'s *"a principal kind with no producer"*, one layer up.

**Consequence for this row:** the platform scope of the route would be unreachable for everybody,
forever. A door nobody can open is not a door.

**Consequence beyond this row:** `CC-134`'s debt §6 (*"moving the foundation does not invalidate
`globalSuperAdminCache`"*) has a hidden second half — **setting** the foundation does not invalidate
it either, and nothing sets it. Both halves are the same lever.

### 3.2 `directory.tenants.manage` is not confined to one tenant, so the row's gate is too wide

The row's `FIX` line says the route sits *"behind `directory.tenants.manage` (E5, `delegable: false`)"*.
That is the right **capability** and it is not sufficient as the **reach** rule:

- `CC-134` made the per-tenant read return `['*']` for a superadmin, because the wildcard belongs to
  the position. So **every tenant's superadmin holds `directory.tenants.manage`** through the
  wildcard — in their own tenant, legitimately.
- A tenant with no ceiling rows of its own **inherits the platform ceiling** (`loadCapabilityCeiling`,
  R5), and the platform ceiling is not empty by default. So `*` reaches
  `directory.tenants.manage` for a tenant superadmin in an ordinary deployment.
- The route as written in the row has **one** gate and **two** targets: the platform ceiling, and any
  tenant's ceiling.

Put together: the literal fix hands **every tenant's superadmin the platform ceiling** — the thing
that bounds what every other tenant may ever hold. That is strictly worse than today, because today
there is no HTTP door at all.

**The distinction the gate is missing** is the one `CC-128` already draws in its own record:
*"a cross-tenant admin act that is recorded as such"*. Recording a cross-tenant act implies the code
knows it is cross-tenant, and knowing it is the same computation as refusing it when it should be
refused. So:

> The capability says **may you manage tenants**. It does not say **whose ceiling may you move**.
> Both are required, and the second is not a list filter — it is a position.

## 4. The requirement

**R1 — two doors, one implementation.** `GET`/`PUT /api/auth/capability-ceiling` is the **platform**
scope; `GET`/`PUT /api/auth/capability-ceiling/tenant/:id` is **tenant `:id`**'s. Both declare
`requireFeatures: ['directory.tenants.manage']` in `metadata`, so the dispatcher's gate — and therefore
`CC-123`'s invoker check, `CC-128`'s ceiling and `CC-125`'s floor — applies before either handler runs.
One shared implementation in `lib/`, so the two files cannot drift.

**R2 — the recorded actor is the caller.** `derivePrincipal(auth)` supplies `principalId`, `kind` and
the acting `tenantId`; `derivePrincipal` returning `null` is a `401`, not a record with a hole. After
this row, **no HTTP ceiling change records `system`** — `system` remains correct only for the CLI,
which genuinely has no principal.

**R3 — the reach rule, and it is two questions.** Before reading or writing, the route answers:

- **platform scope** → the caller must be a **platform administrator**, i.e. an administrator of the
  foundational tenant. One public method on `RbacService` (`isPlatformAdmin`) delegates to
  `isGlobalSuperAdmin`, so `CC-134`'s question keeps **one home** and the route does not re-derive
  "which tenant is the foundation" in a second place.
- **tenant scope, target `T`** → the caller's own tenant is `T` (**self-narrowing**), **or** the caller
  is a platform administrator.

Refused is `403` and **the write does not happen** — asserted by the service double never being
called, not by the status alone.

**Why self-narrowing is allowed:** narrowing your own ceiling is the one ceiling act that cannot
escalate, because R3 of `CC-128` already refuses a tenant ceiling that is not a subset of the
platform's. A tenant administrator who wants their tenant to hold less is the person who should be
able to say so without a support ticket.

**R4 — a tenant scope must name a tenant that exists.** `tenant_capability_ceilings.tenant_id` is a
plain `uuid` column with **no foreign key** (`data/entities.ts:1084-1086`), so a write aimed at a
mistyped id would persist rows that nothing will ever read — a record that lies, and one that would
make a later "why does tenant X have a ceiling" question unanswerable. Both scopes therefore look the
tenant up first and answer **`404`** when it is absent, before the reach rule is even reached (an
unknown target is not a reach question).

**R5 — the read is gated by the same rule as the write.** One rule, not two: the platform ceiling is
the deployment's whole capability surface, and a caller who may not move it may not enumerate it
either. A tenant administrator reads their own ceiling and the platform ceiling they inherit through
it — which is what `loadCapabilityCeiling` already returns, with `source` naming which one applied.

**R6 — the two refusals the library makes are the route's refusals.** `CapabilityCeilingError` maps to
**`400`** with the library's own message, and `capabilities` (the offending names) when it has them:
an empty ceiling, and a tenant ceiling naming something outside the platform ceiling. A `400` and not
a `500`, because both are the caller's request being wrong, not the server failing.

**R7 — the write passes the module's mutation guard.** `beginAuthMutationGuard` with
`resourceKind: 'auth.tenant_capability_ceiling'` and `resourceId: tenantId ?? 'platform'` — the same
strings the audit record uses, so the guard and the journal name the same thing. This is the D2-gap
rule: a write that changes a security control passes the seam every other write in the module shares.

**R8 — the response is the diff, and `source` is part of it.** `PUT` answers
`{ scope, source, capabilities, added, removed }`; `GET` answers `{ scope, source, capabilities }`.
`source` is `tenant` or `platform`, so an operator can tell *"this tenant narrowed itself"* from
*"this tenant is bounded by the deployment"* without a second request.

**R9 — the foundation gains a producer, and it is the operator's.** Two changes, both required by
§3.1:

- **`mercato auth set-foundation --tenant <id>`** — designates the foundational tenant, clearing any
  previous one in the same transaction (the one-row partial unique index from
  `Migration20261019070000` is the backstop, not the mechanism), refusing an unknown tenant id, and
  **calling `rbacService.invalidateAllCache()` afterwards** — which is `CC-134` §6's named debt and
  its only caller.
- **`mercato setup` designates the tenant it creates**, when the deployment has no foundation yet — so
  a fresh install is born with a platform administrator instead of needing a second command. Guarded
  by that condition, because a second `setup` must not try to create a second foundation.

**R10 — a machine cannot reach either door.** `directory.tenants.manage` is on the machine floor
(`machineFloor.ts:112`), so the route gate refuses a machine holding it. The route itself needs no
second check; it must simply **declare the capability**, which is why the metadata assertion in §5 is
not a formality — a route with no `requireFeatures` is ungated, which is `CC-138`'s class.

## 5. The proof

Route tests drive the **real** handlers with service doubles, and the decisive assertion in every
refusal is that the write service was **never called**.

1. **Platform scope, platform administrator** → 200, and the recorded actor is that principal
   (`principalId`, `kind: 'human'`, acting tenant = the foundational tenant), with `crossTenant: false`.
2. **Platform scope, tenant administrator** → 403, write never called. *(This is §3.2, and it is the
   case that makes the row's literal gate insufficient.)*
3. **Tenant scope, own tenant** → 200, `crossTenant: false`.
4. **Tenant scope, another tenant, not a platform administrator** → 403, write never called.
5. **Tenant scope, another tenant, platform administrator** → 200, `crossTenant: true`, and
   `actedFromTenantId` is the foundational tenant — the record says *from where*.
6. **Empty ceiling** → 400 carrying the library's message; **superset** → 400 naming the offending
   capabilities. Neither is a 500, and neither writes.
7. **`derivePrincipal` returns null** → 401.
8. **Both routes declare `directory.tenants.manage`** — asserted from the exported `metadata`, because
   an undeclared route is ungated and that is invisible in every other test.
9. **`set-foundation` clears the previous one, refuses an unknown id, and invalidates the ACL cache.**
10. **`setup` marks its tenant foundational only when none exists.**

**Mutations, each RED then restored byte-identical** (checksum captured first — `L187`; restore by
copy, never `git checkout --`):

| # | Mutation | What must go red |
|---|---|---|
| M1 | drop the reach rule entirely | (2) and (4) |
| M2 | allow the platform scope for any `directory.tenants.manage` holder | (2) |
| M3 | record the CLI's actor (`{ null, 'system', null }`) instead of the caller | (1), (3), (5) |
| M4 | let `CapabilityCeilingError` fall through as 500 | (6) |
| M5 | remove `requireFeatures` from one route's `metadata` | (8) |
| M6 | make `set-foundation` skip `invalidateAllCache` | (9) |

## 6. What this does not do, and the debts it creates

- **It does not add a screen.** The row's `FIX` line ends *"then a screen"*, and a screen is a product
  decision this row is not allowed to invent: 157 enabled features across 34 modules is a picker
  design, not a form. **Scheduled as `CC-139`** in the same change (`Rule 8`), so the half is not
  left inside a closed row — which is exactly how `CC-138` had to be opened.
- **It does not change the CLI's actor.** `mercato auth ceiling` still records `system` with no
  principal, because that is what a CLI is. The route and the command now record two honestly
  different things instead of one wrong one.
- **It does not fix `CC-136`.** A `system:` subject still parses as `human`, so a `system:` act still
  arrives as the widest kind at every gate. This row makes `system` *recordable* through the CLI; it
  does not make a `system:` **subject** parse correctly.
- **It does not fix `CC-137`.** A machine holding `auth.users.edit` can still pass on role tokens.
- **Debt, named:** the `set-foundation` command is an operator act with no principal, so it records
  `system` too. That is correct for a CLI and wrong for a future admin screen; whichever row builds
  that screen inherits it.

## 7. Progress

- 2026-10-19 — requirement written. Measuring the row's own `FIX` line produced §3.1 and §3.2, both of
  which change the scope: the platform administrator had no producer, and the row's single gate would
  have handed every tenant administrator the platform ceiling.
- 2026-10-19 — **built and closed.** §8.

## 8. The build record — 2026-10-19

**What changed.**

| File | What it now does |
|---|---|
| `auth/lib/capabilityCeilingRoute.ts` | **new** — the reach rule, the tenant-existence rule, the actor, and the two handlers. Both routes call it, so the platform scope and the tenant scope cannot answer differently. |
| `auth/api/capability-ceiling/route.ts` | **new** — the platform scope. `GET`/`PUT`, `requireFeatures: ['directory.tenants.manage']`, mutation guard, OpenAPI. |
| `auth/api/capability-ceiling/tenant/[id]/route.ts` | **new** — the tenant scope. Same gate, same guard, `resourceId` = the target tenant. |
| `auth/services/rbacService.ts` | `isPlatformAdmin(userId)` — **a public name for `CC-134`'s question**, not a second implementation. |
| `auth/lib/foundation.ts` | **new** — `designateFoundationalTenant`: clear, set, record, and then invalidate the ACL cache. `CC-134` §6's lever, and its only caller. |
| `auth/cli.ts` | **new** `mercato auth set-foundation [--tenant <id> \| --clear]` — the producer `is_foundational` never had. |
| `auth/lib/setup-app.ts` | a fresh install designates the tenant it creates, guarded so a re-run does not try to make a second foundation. |
| `auth/lib/capabilityCeiling.ts` | ★ **`crossTenant` now means between two tenants** — see the finding below. |

**★ The finding the route produced, and it is the one worth keeping.** `crossTenant` was computed as
`actor.tenantId !== null && actor.tenantId !== tenantId`. For the **platform** scope (`tenantId ===
null`) that is `true` whenever the actor stands in any tenant — so a platform administrator changing
the platform ceiling would have been recorded as a **cross-tenant act**, which it is not: the platform
ceiling belongs to no tenant, and that act *is* the platform act. **Nothing could have caught it
before this row**, because the only caller was a CLI that always acted from `null`; the route is what
put a tenant on both sides of the comparison. The record loses no information by being precise about
the word — `actedFromTenantId` and `ceilingScope` still say where the act came from and what it
touched.

**A second, smaller correction.** The new route test imported `Tenant` from `auth/data/entities`, which
does not export it. The import compiled to `undefined`, `entity === Tenant` never matched, every tenant
lookup answered "not found", and **the `404` test passed for the wrong reason** while four others
failed. It now imports from `directory/data/entities` — where the code under test reads it — and the
comment in the test says why.

**Proof.**
- `api/__tests__/capability-ceiling.route.test.ts`: **14/14**, driving the **real** handlers and the
  **real** `loadCapabilityCeiling` / `replaceCapabilityCeiling` against an in-memory store. The store
  **applies the filters it is handed** (`L23`), so a removed tenant filter changes an answer instead of
  changing nothing; the decisive refusal assertion is that the store is **empty afterwards** and no
  audit record exists.
- `lib/__tests__/foundation.test.ts`: **5/5**.
- `__tests__/cli-setup-demo-users.test.ts`: **+2** — the tenant `setup` creates is foundational, and a
  second run does not try to make another.
- **Six mutations, all RED**, every file restored and **checksum-verified byte-identical** (backup by
  copy, never `git checkout` — `L187`):

  | # | Mutation | Result |
  |---|---|---|
  | M1 | drop the reach rule entirely | **3 failed** — both cross-tenant refusals and the platform read |
  | M2 | allow the platform scope for any capability holder | **2 failed** — the platform write and the platform read |
  | M3 | record the CLI's actor (`{ null, 'system', null }`) | **3 failed** — every actor assertion |
  | M4 | let `CapabilityCeilingError` escape as a throw | **3 failed** — all three `400` cases |
  | M5 | remove `requireFeatures` from one route's `metadata` | **1 failed** — the metadata assertion |
  | M6 | skip `invalidateAclCache` in `set-foundation` | **2 failed** — the two cases that assert the cache clear |

- The whole `auth` module: **105 suites / 931 tests green** (`CC-134`'s close stood at 103 / 910 — the
  delta is exactly this work: +14 route, +5 foundation, +2 setup).
- The whole `core` package: **659 suites / 5,800 tests, 0 failures** (was 657 / 5,779).
- `tsc --noEmit -p packages/core/tsconfig.json`: **exit 0**.

**Still open, named rather than implied:** the **screen** (`CC-139`, opened by this row), `CC-136`
(a `system:` *subject* still parses as `human` — this row makes `system` recordable through the CLI, it
does not make the subject parse), and `CC-137` (a machine holding `auth.users.edit` can still pass on
role tokens).

