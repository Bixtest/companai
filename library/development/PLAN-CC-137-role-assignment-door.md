# PLAN — `CC-137`: one capability means one door

**Status: BUILT AND CLOSED 2026-10-19.** Requirement written 2026-10-19; owner ruling the same day — the
recommendation, verbatim: *"(b) move role assignment in the users route behind `auth.roles.manage` … then
(a) add `auth.users.create` + `auth.users.edit` to `MACHINE_FLOOR` as belt-and-braces."* The row was
opened by `CC-125`'s hostile pass over the closed floor, which measured the gap from source and recorded
it rather than patching past the owner's ruling.

**Files changed:** `packages/core/src/modules/auth/api/users/route.ts` (the gate) ·
`packages/core/src/modules/auth/lib/machineFloor.ts` (the two ids, the arithmetic, and the paragraph that
recorded this as an open gap) · `packages/core/src/modules/auth/lib/__tests__/machineFloor.test.ts` (size
guard 7 → 9, +1 test) · `packages/core/src/modules/auth/api/__tests__/users.route.test.ts` (+5 tests, and
the `rbacService` mock gained the method the route now calls).

---

## 1. What the defect is, measured

The machine floor lists **`auth.roles.manage`** — *"a role is a grant; a machine that can write one can
grant itself anything"*. The direct ACL writer (`PUT /api/auth/users/acl`) is behind `auth.acl.manage`,
which is also on the floor. Both of those doors are shut.

**`POST` / `PUT /api/auth/users` is a third door, and it is open.**

| Fact | Where |
|---|---|
| The route is gated by `auth.users.create` / `auth.users.edit` | `api/users/route.ts:107-112` |
| Neither id is on the floor | `lib/machineFloor.ts:96-119` (seven entries, neither present) |
| Both handlers accept a `roles` array | `api/users/route.ts:64,76` → `assertCanAssignRoles` at `:133` and `:152` |
| The only check on it is a **subset** check | `assertActorCanGrantRoleTokens` → `assertActorCanGrantRoles` (`lib/grantChecks.ts:48-90`) |
| …which **returns early for a superadmin** | `lib/grantChecks.ts:63` — `if (actorAcl.isSuperAdmin) return` |

So a machine holding `auth.users.edit` can hand out any role **it already holds**; a machine holding
`auth.users.edit` **and** a wildcard role (configuration's doing) can hand out **any role to anybody**,
and the subset check never runs because the first line that matters is the early return.

## 2. ★ The sharpest measurement: the floor was not wrong — nothing asked it

`RbacService.userHasAllFeatures` already routes through the authority resolver, and the resolver already
applies the floor (`refusedByAuthority` → `parseSubject(userId)` → `refusalFor` → `decideFor` →
`floorRefusalFor`). **The floor's `auth.roles.manage` entry has been live since `CC-125` and this route
has never consulted it**, because the route only ever asks *"do you hold `auth.users.edit`?"* and then
performs its own subset check.

That is `CC-101`'s class in a new place: **a control that is correct and that no caller calls.** It is
also why (b) is not redundant with the floor — (b) is what makes the floor's existing answer *reachable*
on this path. (a) then refuses the machine at the route's own gate, so the handler is never entered at
all.

## 3. The requirement

**R1 — role assignment needs the capability that means role assignment.** When a create or update
request carries a **non-empty** `roles` array, the actor must hold **`auth.roles.manage`**, checked
through `rbacService.userHasAllFeatures(actor, ['auth.roles.manage'], { tenantId, organizationId })` —
the same helper `api/sidebar/preferences/route.ts:190` uses for its second gate.

**R2 — fail closed when the answer cannot be obtained.** `?? false`. A service object without the
method, a resolver that throws, a missing scope: all refuse. The one thing that must never happen is a
missing check reading as permission.

**R3 — an empty array is not an assignment.** `roles: []` hands nobody a role and the grant check
already returns early for it (`grantChecks.ts:50`), so the capability is required exactly when the
request asks to give somebody a role. This matches the floor's own doctrine that **narrowing is not
widening** (`api_keys.delete` is deliberately off the floor for the same reason).

**R4 — the subset check stays.** `assertActorCanGrantRoleTokens` is not replaced. Holding
`auth.roles.manage` says *may you assign roles*; it does not say *may you assign a role wider than your
own*. Both questions are asked, in that order.

**R5 — the two user capabilities join the floor.** `auth.users.create` and `auth.users.edit` are how a
person is created and how their access is written, so a machine holding either is granting by another
name. **`MACHINE_FLOOR` grows 7 → 9**, and every place that states the size moves with it — the docblock's
arithmetic, the size guard in `lib/__tests__/machineFloor.test.ts`, and the comment that recorded this
gap as open.

**R6 — nothing else moves.** `auth.users.list` and `auth.users.delete` stay off the floor: reading is not
granting, and deleting narrows. `api_keys.delete` stays off for the same reason it was put there.

## 4. The proof

1. **The gate is on the path.** A create request with `roles` and **without** `auth.roles.manage` is
   **403**, names the capability in `requiredFeatures`, and **the role lookup never runs** — asserted as
   `expect(mockFindOneWithDecryption).not.toHaveBeenCalledWith(… Role …)`, because a refusal that has
   already looked the role up is a refusal in the wrong place.
2. **The capability is the one the floor names.** The request carries `['auth.roles.manage']` — asserted
   on the mock's arguments, not inferred from the status code. A gate that asks for a misspelt capability
   refuses everybody and looks correct.
3. **A machine holding `auth.users.edit` cannot assign a role.** The actor is a `service:` subject, the
   answer comes from the **real floor** (`floorRefusalFor`), and the route answers 403.
4. **With the capability, the old behaviour is unchanged** — the existing "covered by actor wildcard ACL"
   test still gets 201 once its actor holds `auth.roles.manage` (that edit is itself the proof the gate
   is live on the happy path).
5. **The floor covers both ids** — `MACHINE_FLOOR.has('auth.users.create' | 'auth.users.edit')`, with a
   reason for each, and the size guard at **9**.
6. **The narrowing capability is still off the floor** — `auth.users.delete` and `auth.users.list` are
   not on it.

**Mutations, each RED then restored byte-identical** (checksum first — `L187`; restore by copy):

| # | Mutation | What must go red |
|---|---|---|
| M1 | drop the capability check from `assertCanAssignRoles` | (1) |
| M2 | ask for a different capability id | (1), (2) |
| M3 | `?? false` → `?? true` | (1) — the missing-method case |
| M4 | remove `auth.users.create` + `auth.users.edit` from the floor | (3), (5) |
| M5 | drop the `roles.length === 0` early return | (R3's test) |

## 5. The run

**5/5 RED, every file restored checksum-verified** (`L187`: checksums captured before the first edit,
restored **by copy**, never `git checkout --`).

| # | Result |
|---|---|
| M1 | **RED** — 4 failed: the refusal, the capability-id assertion, the machine case, and the fail-closed case |
| M2 | **RED** — 3 failed: the refusal's `requiredFeatures`, the id assertion, and the machine case |
| M3 | **RED** — **exactly 1**: the fail-closed test. Nothing else moved, which is what `?? false` is for |
| M4 | **RED** — 3 failed across 2 suites: the size guard, the floor's own `CC-137` test, and the machine case's belt-and-braces assertion |
| M5 | **RED** — 1 failed: the empty-array test, proving R3 is pinned and not incidental |

**Runs:** auth **105 suites / 937 tests** (+6) · core **659 suites / 5,806 tests, 0 failures** ·
`tsc --noEmit` exit **0** for `packages/core` · targeted re-run green after every restore (3 suites / 53).

## 6. What this does not do

- **It does not stop a *person* with `auth.users.edit` and a wildcard from granting any role.** They hold
  `auth.roles.manage` through the wildcard, and a person is bounded by their grant and the tenant ceiling,
  not by the floor. That is the design (`machineFloor.ts`'s `human` exclusion) and not a defect.
- **It does not re-open the question of what a machine may hold.** `CC-128`'s ceiling bounds the *grants*
  a tenant's machine can receive; the floor bounds the *capabilities* it may ever receive. Two different
  questions, both already ruled.
- **It does not touch `CC-120`** — whether a machine may hold access in its own right at all.
