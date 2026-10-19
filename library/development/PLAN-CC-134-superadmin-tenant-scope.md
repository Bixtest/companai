# PLAN — `CC-134`: a superadmin is a superadmin of one tenant

**Status: REQUIREMENT WRITTEN 2026-10-19. No code yet** (standing rule: no code before a written
requirement). The row was opened by `CC-128`'s build, which bounded the consequence of this read and
deliberately did not change it.

---

## 1. What the defect is, measured

`loadAcl(userId, scope)` begins by asking `isGlobalSuperAdmin(userId)` **before `scope` is consulted**.
When it answers true, `loadAcl` returns `{ isSuperAdmin: true, features: ['*'], organizations: null }`
and caches it under a key that *does* include the scope — but the question it answered did not.

The read (`rbacService.ts:247-279`):

```ts
const userSuper = await em.findOne(UserAcl, { user: userId as any, isSuperAdmin: true })
```

`UserAcl.tenant_id` is `uuid NOT NULL` and its own comment says *"Tenant scope is mandatory for ACL
evaluation"*. The query has **no tenant filter**. So a user who is a superadmin in **tenant B** is
treated as a superadmin **everywhere**, and `loadAcl` acts on that answer before it ever looks at the
requested scope (`:317-323`).

**Why `CC-128` did not fix it.** The ceiling now bounds what a `['*']` can *reach* — a capability
outside the tenant's ceiling is not held — so the blast radius is contained. That is the difference
between *"a tenant superadmin cannot exceed its ceiling"* and *"a tenant superadmin is not a superadmin
anywhere else"*. `CC-128` bought the first; this row is the second.

## 2. What the code already does correctly — and it decides the fix

**The per-tenant path is already right.** `loadAcl`'s human branch reads
`UserAcl` **with** `tenantId` (`:383`), so a superadmin of tenant B already receives
`isSuperAdmin: true` **inside B** — from their own row, with no help from this function.

So `isGlobalSuperAdmin` is **only** the cross-tenant shortcut. It is not "does this user hold a
superadmin row"; it is "does this user act above every tenant". That distinction is the whole fix:
**the function's name is right and its question is wrong.**

## 3. The ruling it must obey

`CC-128` was decided as **option A** (owner, 2026-10-19): *the platform's admins live inside the
foundational tenant, and other tenants inherit — or are limited by — what it allows.* Under A,
**"platform admin" and "admin of the foundational tenant" are the same thing.**

Therefore the correct question is: **does this user hold a superadmin ACL in the foundational tenant?**
`tenants.is_foundational` already exists (`directory/data/entities.ts:49-50`), with a one-row partial
unique index from `CC-128`'s migration.

## 4. The requirement

**R1 — the read is scoped to the foundational tenant.** `isGlobalSuperAdmin`'s `UserAcl` lookup gains
`tenantId: <foundational tenant id>`. A superadmin row in any other tenant no longer answers this
question.

**R2 — the role path asks the same question.** The function's second half currently looks for `UserRole`
links with a **tenant-less** scope (`{ tenantId: null, organizationId: null }`, `:255-261`) and then
reads `RoleAcl` with **no tenant filter** (`:275`). Under A that is the wrong shape twice: a global role
lives *in the foundational tenant*, not in no tenant. Both halves must point at the same tenant, or the
function answers two different questions and the union of them is what a caller gets.

**R3 — no foundational tenant means no global superadmin.** If the deployment has no row with
`is_foundational = true`, the answer is **false** (fail closed). This is the "caller with no tenant"
decision the row asked for: a deployment that has not designated a foundation does not silently promote
every tenant superadmin to global.

**R4 — the answer stays cacheable per user.** Because the question is now a property of the user and
not of the requested scope, the existing `Map<string, boolean>` keyed by user id is **correct** — and
that is a property worth asserting, because it was accidentally correct before (a scope-dependent
answer cached under a user-only key would have been a second defect).

**R5 — the answer must be re-derivable when the foundation moves.** If `tenants.is_foundational` is
changed, the cached answers are stale. `invalidateAllCache()` exists; nothing calls it for that change.
**Named as a debt in §6, not silently ignored.**

## 5. The proof

1. **A superadmin of tenant B, asking in tenant B, still gets `['*']`** — from their own row, via the
   per-tenant path. This is the regression that matters most: a fix that breaks the legitimate case
   would be reverted by hand at 3 a.m.
2. **The same user, asking in tenant C, gets no `*`.** The cross-tenant case the row names.
3. **A superadmin of the foundational tenant, asking in any tenant, gets `['*']`** — option A's
   intended behaviour, asserted so the fix is not read as "remove the shortcut".
4. **No foundational tenant → false**, with the reason recorded.
5. **The role path agrees with the ACL path**: a global role in the foundational tenant answers true;
   a global role anywhere else answers false.
6. **The cache does not leak across tenants** — ask in B, then in C, and assert the two answers differ
   for a non-foundational superadmin (this is R4's assertion, and it fails today).

**Mutations, each RED then restored byte-identical** (checksum captured first — `L187`):

| # | Mutation | What must go red |
|---|---|---|
| M1 | remove the tenant filter from the `UserAcl` read | the cross-tenant test (2) |
| M2 | scope the read to the *requested* tenant instead of the foundational one | the option-A test (3) |
| M3 | return true when no foundational tenant exists | the fail-closed test (4) |
| M4 | leave the role path tenant-less | the role-agreement test (5) |

## 6. What this does not do, and the debts it creates

- **It does not add a tenant filter to `loadAcl`'s own read** — that read is already filtered (`:383`).
- **It does not change `CC-128`'s ceiling.** The ceiling still bounds what any `*` reaches; this row
  fixes who is allowed to hold one.
- **Debt, named:** moving the foundation does not invalidate `globalSuperAdminCache`. The fix is one
  call in the tenant-update path, and it belongs to whichever row owns tenant administration
  (`CC-135` is the nearest surface). Recorded here so it is not discovered by a support ticket.
- **Debt, named:** `CC-136` is adjacent and **not** fixed by this. A `system:` subject is parsed as
  `human`, so a platform act still arrives as the widest kind. These are two different holes in the
  same function's neighbourhood; fixing one does not fix the other.

## 7. Progress

- 2026-10-19 — requirement written; the measurement (§1–§2) re-confirmed the row and found that the
  per-tenant path already works, which is what makes the fix small and the regression test obvious.
